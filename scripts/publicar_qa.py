"""Publish a SHA-bound GitHub QA status from an authenticated Multica agent result.

The QA result is read from the canonical parent, where stages are delegated by
mention. --qa-issue keeps the older mode for a QA run in a done child issue.
"""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import uuid

ROOT = Path(__file__).resolve().parent.parent
STATE = Path.home() / '.local' / 'state' / 'aponta-qa'
# Read from GITHUB_REPOSITORY (set automatically in Actions) so a repo/org
# transfer never requires touching this script again.
CANONICAL_REPOSITORY = os.environ.get('GITHUB_REPOSITORY', 'dmrepositorio/aponta')
QA = '3501c5bf-c0eb-497b-9840-32ae3e9d9076'  # dev_qa (Squad Dev Aponta)
RAPIDO_QA = 'a75c9214-2636-4c5d-8dbb-64a8927ff542'  # dev_rapido_qa (Squad Rápido)
ULTRA_QA = '6cea4f83-0bf4-4652-a5fe-db283601ec53'  # dev_ultra_qa (Squad Ultra Rápido)
QA_AGENTS = (QA, RAPIDO_QA, ULTRA_QA)


# A result line starts the line, as the comment gate requires; RESULTADO= cited mid-sentence is prose.
RESULT_LINE = re.compile(r'^[\s>*_`]*RESULTADO\s*=\s*(APROVADO|REJEITADO|BLOQUEADO)\b', re.MULTILINE)
SHA_FIELD = re.compile(r'^[\s>*_`-]*(?:RESULTADO\s*=\s*\S+\s+)?SHA(?:40)?\s*[:=]\s*`?([0-9a-f]{40})', re.MULTILINE | re.IGNORECASE)


def bound_to(content, commit):
    """A declared SHA field binds the result to that SHA only; without one, any mention counts."""
    declared = SHA_FIELD.findall(content)
    return commit in declared if declared else commit in content


def assess(records, commit, current=None):
    matched = [row for row in records if bound_to(row.get('content') or '', commit)]
    if not matched:
        raise ValueError('No SHA-bound QA evidence found.')
    latest = matched[-1]
    author = latest.get('author_id')
    if latest.get('author_type') != 'agent' or author not in QA_AGENTS or latest.get('task_agent') != author:
        raise ValueError('Result is not authored by the independent QA agent.')
    # The Squad Rápido QA publishes from the same run that approved; only that run, as that agent, may.
    own_run = latest.get('task_status') == 'running' and current == (latest.get('source_task_id'), author)
    if not latest.get('source_task_id') or (latest.get('task_status') != 'completed' and not own_run):
        raise ValueError('QA task has not completed with attributable evidence.')
    if RESULT_LINE.findall(latest['content']) != ['APROVADO']:
        raise ValueError('Latest SHA-bound result is not an unambiguous approval.')
    return latest


def build_query(parent, qa_issue=None):
    """SQL for the QA agent's comments that can carry the result for this delivery."""
    parent = str(uuid.UUID(parent))
    fields = f"""SELECT json_build_object('content',c.content,'author_type',c.author_type,'author_id',c.author_id,
      'source_task_id',c.source_task_id,'task_agent',t.agent_id,'task_status',t.status)
      FROM comment c JOIN issue i ON i.id=c.issue_id LEFT JOIN agent_task_queue t ON t.id=c.source_task_id"""
    agents = ','.join(f"'{a}'" for a in QA_AGENTS)
    author = f"c.deleted_at IS NULL AND c.author_type='agent' AND c.author_id IN ({agents})"
    if qa_issue is None:
        # Mention mode: the QA answers in a thread on the parent itself.
        return f"""{fields}
      WHERE c.issue_id='{parent}' AND t.issue_id='{parent}' AND {author} ORDER BY c.created_at"""
    child = str(uuid.UUID(qa_issue))
    return f"""{fields}
      WHERE i.id='{child}' AND i.parent_issue_id='{parent}' AND i.status='done'
      AND i.id=(SELECT newest.id FROM issue newest WHERE newest.parent_issue_id='{parent}' AND newest.assignee_id IN ({agents})
                AND newest.status='done'
                ORDER BY newest.updated_at DESC LIMIT 1)
      AND t.issue_id=i.id AND {author} ORDER BY c.created_at"""


def git(root, *args):
    return subprocess.run(['git', '-C', str(root), *args], capture_output=True, text=True, check=True).stdout.strip()


def parent_of(root, registry, delivery):
    """Multica parent of a delivery: its registry entry or, without one, its own manifest."""
    entry = json.loads(Path(registry).read_text())['deliveries'].get(delivery)
    if not entry:
        entry = json.loads((Path(root) / '.delivery/deliveries' / (delivery + '.json')).read_text())
    return entry['multica_id']


# Paths a delivery may change after the review without changing what was reviewed.
GOVERNANCE = ('.delivery/', 'docs/')


def blob(root, commit, name):
    """Mode and content of a path at a commit, so a permission change also counts as a difference."""
    entry = git(root, 'ls-tree', commit, '--', name)
    return entry.split('\t')[0] if entry else None  # None: deleted by the delivery


def reviewed(root, commit, delivery, main_ref):
    """What the QA judges at a commit: the delivery's own code, its acceptance criteria and its SPEC."""
    base = git(root, 'merge-base', main_ref, commit)
    names = git(root, 'diff', '--no-renames', '--name-only', '-z', base, commit).split('\0')
    code = {name: blob(root, commit, name) for name in names if name and not name.startswith(GOVERNANCE)}
    manifest = json.loads(git(root, 'show', commit + ':.delivery/deliveries/' + delivery + '.json'))
    spec = manifest.get('spec')
    return code, manifest.get('criteria'), blob(root, commit, spec) if isinstance(spec, str) else None


def carry_source(root, records, commit, delivery, main_ref='origin/main'):
    """Approved SHA whose reviewed code is identical to `commit`, or None.

    A commit that only records governance (manifest, evidence, docs) or brings main in without
    touching the delivery's files leaves the reviewed code as it was; the approval then still
    describes what will be merged. Any difference in code, criteria or SPEC needs a new review.
    """
    try:
        target = reviewed(root, commit, delivery, main_ref)
    except (subprocess.CalledProcessError, ValueError):
        return None
    seen = []
    for row in reversed(records):
        content = row.get('content') or ''
        if RESULT_LINE.findall(content) != ['APROVADO']:
            continue
        for candidate in SHA_FIELD.findall(content):
            if candidate == commit or candidate in seen:
                continue
            seen.append(candidate)
            try:
                assess(records, candidate)
                if reviewed(root, candidate, delivery, main_ref) == target:
                    return candidate
            except (subprocess.CalledProcessError, ValueError):
                continue
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--delivery', required=True)
    parser.add_argument('--sha', required=True)
    parser.add_argument('--qa-issue', help='QA child issue, only for deliveries reviewed in a child')
    parser.add_argument('--registry', type=Path, default=ROOT / '.delivery/registry.json')
    args = parser.parse_args()
    if not re.fullmatch(r'DMTE-\d+', args.delivery) or not re.fullmatch('[0-9a-f]{40}', args.sha):
        raise ValueError('Use a canonical delivery and full SHA.')
    parent = str(uuid.UUID(parent_of(ROOT, args.registry, args.delivery)))
    source = str(uuid.UUID(args.qa_issue)) if args.qa_issue else parent
    query = build_query(parent, args.qa_issue)
    p = subprocess.run(['docker','exec','multica-postgres-1','psql','-U','multica','-d','multica','-At','-c',query],capture_output=True,text=True,check=True)
    current = (os.environ.get('MULTICA_TASK_ID'), os.environ.get('MULTICA_AGENT_ID'))
    records = [json.loads(line) for line in p.stdout.splitlines() if line]
    carried = None
    try:
        proof = assess(records, args.sha, current)
    except ValueError:
        # No approval for this exact SHA: reuse one only when the reviewed code is identical.
        subprocess.run(['git', '-C', str(ROOT), 'fetch', '-q', 'origin', 'main'], capture_output=True)
        carried = carry_source(ROOT, records, args.sha, args.delivery)
        if not carried:
            raise
        proof = assess(records, carried)
    description = ('QA aprovou ' + carried[:10] + '; código revisado idêntico neste SHA' if carried
                   else 'QA Multica independente aprovou este SHA')
    payload = {'state':'success','context':'Independent QA','description':description,
        'target_url':'https://multica.dmtecnologia.cloud/dm-tecnologia/issues/'+source}
    subprocess.run(['gh','api','-X','POST','repos/'+CANONICAL_REPOSITORY+'/statuses/'+args.sha,'--input','-'],
        input=json.dumps(payload),capture_output=True,text=True,check=True)
    result = {'delivery':args.delivery,'sha':args.sha,'qa_issue':source,'source_task_id':proof['source_task_id'],'result':'success','carried_from':carried}
    STATE.mkdir(parents=True, exist_ok=True)
    (STATE / ('qa-status-'+args.delivery+'.json')).write_text(json.dumps(result,indent=2))
    print(json.dumps(result))


if __name__ == '__main__':
    main()

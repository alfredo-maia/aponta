"""Publish a SHA-bound GitHub QA status from an authenticated Multica agent result."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import uuid

ROOT = Path(__file__).resolve().parent
QA = '3501c5bf-c0eb-497b-9840-32ae3e9d9076'


def assess(records, commit):
    matched = [row for row in records if commit in (row.get('content') or '')]
    if not matched:
        raise ValueError('No SHA-bound QA evidence found.')
    latest = matched[-1]
    if latest.get('author_type') != 'agent' or latest.get('author_id') != QA or latest.get('task_agent') != QA:
        raise ValueError('Result is not authored by the independent QA agent.')
    if latest.get('task_status') != 'completed' or not latest.get('source_task_id'):
        raise ValueError('QA task has not completed with attributable evidence.')
    verdicts = re.findall(r'RESULTADO\s*=\s*(APROVADO|REJEITADO|BLOQUEADO)', latest['content'])
    if verdicts != ['APROVADO']:
        raise ValueError('Latest SHA-bound result is not an unambiguous approval.')
    return latest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--delivery', required=True)
    parser.add_argument('--sha', required=True)
    parser.add_argument('--qa-issue', required=True)
    parser.add_argument('--registry', type=Path, default=ROOT / 'checkout/.delivery/registry.json')
    args = parser.parse_args()
    if not re.fullmatch(r'DMTE-\d+', args.delivery) or not re.fullmatch('[0-9a-f]{40}', args.sha):
        raise ValueError('Use a canonical delivery and full SHA.')
    child = str(uuid.UUID(args.qa_issue))
    entry = json.loads(args.registry.read_text())['deliveries'][args.delivery]
    parent = str(uuid.UUID(entry['multica_id']))
    query = f"""SELECT json_build_object('content',c.content,'author_type',c.author_type,'author_id',c.author_id,
      'source_task_id',c.source_task_id,'task_agent',t.agent_id,'task_status',t.status)
      FROM comment c JOIN issue i ON i.id=c.issue_id LEFT JOIN agent_task_queue t ON t.id=c.source_task_id
      WHERE i.id='{child}' AND i.parent_issue_id='{parent}' AND i.status='done'
      AND i.id=(SELECT newest.id FROM issue newest WHERE newest.parent_issue_id='{parent}' AND newest.assignee_id='{QA}'
                AND newest.status='done'
                ORDER BY newest.updated_at DESC LIMIT 1)
      AND t.issue_id=i.id AND c.deleted_at IS NULL AND c.author_type='agent'
      AND c.author_id='{QA}' ORDER BY c.created_at"""
    p = subprocess.run(['docker','exec','multica-postgres-1','psql','-U','multica','-d','multica','-At','-c',query],capture_output=True,text=True,check=True)
    proof = assess([json.loads(line) for line in p.stdout.splitlines() if line], args.sha)
    payload = {'state':'success','context':'Independent QA','description':'QA Multica independente aprovou este SHA',
        'target_url':'https://multica.dmtecnologia.cloud/dm-tecnologia/issues/'+child}
    subprocess.run(['gh','api','-X','POST','repos/alfredo-maia/aponta/statuses/'+args.sha,'--input','-'],
        input=json.dumps(payload),capture_output=True,text=True,check=True)
    result = {'delivery':args.delivery,'sha':args.sha,'qa_issue':child,'source_task_id':proof['source_task_id'],'result':'success'}
    (ROOT / ('qa-status-'+args.delivery+'.json')).write_text(json.dumps(result,indent=2))
    print(json.dumps(result))


if __name__ == '__main__':
    main()

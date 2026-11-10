#!/usr/bin/env python3
"""Delivery contracts and evidence capture for Aponta (Python standard library)."""
from __future__ import annotations

import argparse
import contextlib
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import uuid


# The canonical repository identity. Read from GITHUB_REPOSITORY (set
# automatically by every GitHub Actions run) so a future org/repo transfer
# never requires touching this script again; local/offline runs fall back to
# the current real location.
CANONICAL_REPOSITORY = os.environ.get('GITHUB_REPOSITORY', 'dmrepositorio/aponta')


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git(root: Path, *args: str) -> str:
    return subprocess.run(['git', '-C', str(root), *args], capture_output=True, text=True, check=True).stdout.strip()


def redact(text: str) -> str:
    for key, value in os.environ.items():
        if len(value) >= 6 and re.search(r'token|secret|password|passwd|api_key|database_url', key, re.I):
            text = text.replace(value, '[REDACTED]')
    return re.sub(r'(https?://)[^\s/@]+:[^\s/@]+@', r'\1[REDACTED]@', text)


def source_hashes(root: Path, base: str) -> dict[str, str]:
    changed = git(root, 'diff', '--name-only', base).splitlines()
    changed += git(root, 'ls-files', '--others', '--exclude-standard').splitlines()
    return {name: sha((root / name).read_bytes()) for name in sorted(set(changed))
            if is_source_path(name) and (root / name).is_file()}


def changed_paths(root: Path, base: str) -> list[str]:
    """Every path the checkout changes against base, including files not yet committed."""
    changed = git(root, 'diff', '--name-only', base).splitlines()
    changed += git(root, 'ls-files', '--others', '--exclude-standard').splitlines()
    return sorted(set(changed))


def merge_base(root: Path, head: str, candidates: list) -> str:
    """The most recent point where head left the base branch.

    The event's base SHA can be stale (GitHub records it when the PR is synchronized), so the base
    branch itself is tried as well; a ref this checkout cannot resolve is skipped.
    """
    bases = []
    for ref in candidates:
        if isinstance(ref, str) and re.fullmatch(r'[\w./-]+', ref) and not ref.startswith('-'):
            try:
                bases.append(git(root, 'merge-base', ref, head))
            except subprocess.CalledProcessError:
                continue
    if not bases:
        raise ValueError('Cannot resolve the merge base of the delivery.')
    best = bases[0]
    for candidate in bases[1:]:
        try:
            git(root, 'merge-base', '--is-ancestor', best, candidate)
            best = candidate
        except subprocess.CalledProcessError:
            pass
    return best


@contextlib.contextmanager
def tree_at(root: Path, commit: str):
    """A temporary checkout of commit, so a queue run validates the PR's own tree."""
    path = Path(tempfile.mkdtemp(prefix='aponta-delivery-'))
    try:
        git(root, 'worktree', 'add', '--detach', '-q', str(path), commit)
        yield path
    finally:
        subprocess.run(['git', '-C', str(root), 'worktree', 'remove', '--force', str(path)], capture_output=True)
        shutil.rmtree(path, ignore_errors=True)
        subprocess.run(['git', '-C', str(root), 'worktree', 'prune'], capture_output=True)


def blob_sha(root: Path, commit: str, name: str) -> str | None:
    """SHA-256 of a path at a commit, or None when the path does not exist there."""
    shown = subprocess.run(['git', '-C', str(root), 'show', commit + ':' + name], capture_output=True)
    return sha(shown.stdout) if shown.returncode == 0 else None


def stale_sources(root: Path, base: str, head: str, tests, observed) -> list[str]:
    """Sources the delivery committed between base and head that a RED saw at an earlier version.

    `observed(name)` is the SHA-256 the RED ran against, or None for a file that was absent or
    identical to the base. A RED obtained by putting finished code back at a previous version says
    nothing about the code under review, so it is told apart from Git alone: the content matches
    the base or an earlier commit of the branch instead of `head`. A new uncommitted edit, such
    as a neutral stub, matches no earlier version and is not stale.
    """
    try:
        names = git(root, 'diff', '--no-renames', '--name-only', '-z', base, head).split('\0')
    except subprocess.CalledProcessError:
        return []  # commits this checkout cannot resolve are not judged here
    stale = []
    for name in names:
        if not name or name in tests or not is_source_path(name):
            continue
        seen = observed(name)
        if seen == blob_sha(root, head, name):
            continue
        commits = [base] + git(root, 'rev-list', base + '..' + head, '--', name).split()
        if seen is None or seen in {blob_sha(root, commit, name) for commit in commits}:
            stale.append(name)
    return stale


def init_manifest(root: Path, registry: dict, delivery: str, github_issue: int, multica_id: str,
                  tier: int, spec: str, ds_reason: str | None = None) -> Path:
    """Write the manifest of a new delivery from its identity and the SPEC's numbered criteria.

    Each criterion's tests are left empty on purpose: `check` fails until they are named.
    """
    manifest = {'version': 1, 'delivery': delivery, 'repository': CANONICAL_REPOSITORY,
                'github_issue': github_issue, 'multica_id': multica_id,
                'cycle': cycle_for(today_sao_paulo()), 'tier': tier}
    errors = identity_errors(manifest)
    if tier not in [1, 2, 3]:
        errors.append('tier must be 1, 2 or 3.')
    if errors:
        raise ValueError(' '.join(errors))
    criteria = {}
    for key, text in re.findall(r'^\W*(AC-\d+)\b[^:\n]*:[ \t]*(\S.*)$', safe_path(root, spec).read_text(), re.M):
        criteria.setdefault(key, text.strip())
    if not criteria:
        raise ValueError('SPEC has no numbered acceptance criteria (AC-NN: description).')
    path = safe_path(root, '.delivery/deliveries/' + delivery + '.json')
    if path.exists():
        raise ValueError('Manifest already exists: ' + path.relative_to(root.resolve()).as_posix())
    clash = validate_binding(manifest, None, other_identities(root, registry, delivery))
    if clash:
        raise ValueError(' '.join(clash))
    evidence = '.delivery/evidence/' + delivery + '/'
    manifest.update({
        'criteria': [{'id': key, 'description': text, 'tests': []} for key, text in criteria.items()],
        'spec': spec,
        'tdd': {'mode': 'required', 'red': evidence + 'red.json', 'green': evidence + 'green.json'},
        'design_system': {'applicable': False, 'reason': ds_reason} if ds_reason else {'applicable': True, 'reused': []},
    })
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    return path


def is_source_path(name: str) -> bool:
    """Governance, docs and build noise are not delivery sources."""
    return (not name.startswith(('.delivery/', 'docs/', '.github/')) and name != 'AGENTS.md'
            and '__pycache__' not in Path(name).parts and not name.endswith('.pyc'))


def capture(root: Path, destination: Path, phase: str, base: str,
            command: list[str], tests: list[str], criteria: list[str]) -> dict:
    if not test_command(command):
        raise ValueError('Use a supported test runner, not a shell or arbitrary output command.')
    if redact(json.dumps(command)) != json.dumps(command):
        raise ValueError('Pass credentials through the environment, never test arguments.')
    safe_path(root, destination.relative_to(root).as_posix())
    for name in tests:
        if not safe_path(root, name).is_file():
            raise ValueError('Test source is missing: ' + name)
    base = git(root, 'rev-parse', '--verify', '--end-of-options', base)
    if phase == 'red':
        stale = stale_sources(root, base, 'HEAD', tests,
                              lambda name: sha((root / name).read_bytes()) if (root / name).is_file() else None)
        if stale:
            raise ValueError('RED must run against the committed code, but these files are at an earlier version '
                             'or missing: ' + ', '.join(stale) + '. Restore them and write a test that fails '
                             'against the current code.')
    started = dt.datetime.now(dt.timezone.utc).isoformat()
    # No bytecode cache: a source edited within the same second and with the same size would
    # otherwise run its stale .pyc, and a RED or GREEN would describe code that is no longer there.
    completed = subprocess.run(command, cwd=root, capture_output=True, text=True, shell=False,
                               env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'})
    output = redact(completed.stdout + completed.stderr)
    destination.parent.mkdir(parents=True, exist_ok=True)
    log = destination.with_suffix('.log')
    log.write_text(output)
    value = {'version': 1, 'phase': phase, 'started_at': started,
             'finished_at': dt.datetime.now(dt.timezone.utc).isoformat(),
             'command': command, 'base_sha': base, 'head_sha': git(root, 'rev-parse', 'HEAD'),
             'exit_code': completed.returncode,
             'tests': {name: sha((root / name).read_bytes()) for name in tests},
             'criteria': criteria, 'source_hashes': source_hashes(root, base),
             'log': log.relative_to(root).as_posix(), 'log_sha256': sha(output.encode())}
    destination.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    return value


def behavioral_red(output: str, exit_code: int) -> bool:
    setup = r'ModuleNotFoundError|ImportError|SyntaxError|Cannot find module|Failed to (?:load|resolve)|ECONNREFUSED|command not found|TS\d{4}:'
    assertion = r'AssertionError|Expected:|Expected\s+.*\s+Received:|expect\(.+\)\.|assert\s+.+\s*=='
    failure = r'FAILED|\bFAIL\b|\d+\s+failed'
    return exit_code != 0 and not re.search(setup, output, re.I) and bool(re.search(assertion, output, re.I)) and bool(re.search(failure, output, re.I))


def safe_path(root: Path, name: str) -> Path:
    if not isinstance(name, str) or not name or Path(name).is_absolute() or '..' in Path(name).parts:
        raise ValueError('Paths must remain inside the checkout.')
    path = (root / name).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError('Symlink escapes the checkout.')
    return path


def test_command(command: list[str]) -> bool:
    if not command or not all(isinstance(x, str) for x in command):
        return False
    binary = Path(command[0]).name
    if binary.startswith('python'):
        return command[1:3] == ['-m', 'unittest']
    if binary == 'node':
        return '--test' in command
    if binary in ['pnpm', 'npx', 'npm']:
        joined = ' '.join(command[1:])
        if re.search(r'\bnx\b', joined):
            return bool(re.search(r'\b(?:test|e2e|test-ci)\b', joined))
        return bool(re.search(r'\b(?:vitest|jest|playwright)\b', joined) and re.search(r'\b(?:test|run)\b', joined))
    return False


CYCLE_ANCHOR = dt.date(2026, 10, 26)
CYCLE_DAYS = 14


def cycle_for(day: dt.date) -> str:
    """Return the automatic fortnightly cycle id (start/end, inclusive) containing day."""
    start = CYCLE_ANCHOR + dt.timedelta(days=(day - CYCLE_ANCHOR).days // CYCLE_DAYS * CYCLE_DAYS)
    return f'{start.isoformat()}/{(start + dt.timedelta(days=CYCLE_DAYS - 1)).isoformat()}'


def today_sao_paulo() -> dt.date:
    from zoneinfo import ZoneInfo
    return dt.datetime.now(ZoneInfo('America/Sao_Paulo')).date()


def cycle_errors(value) -> list[str]:
    """A cycle is null (not scheduled) or exactly one automatic fortnight id."""
    if value is None:
        return []
    try:
        start = dt.date.fromisoformat(str(value).split('/')[0])
    except ValueError:
        return ['cycle must be null or an automatic cycle id (YYYY-MM-DD/YYYY-MM-DD).']
    if value != cycle_for(start) or start < CYCLE_ANCHOR:
        return ['cycle must be null or an automatic cycle id (YYYY-MM-DD/YYYY-MM-DD).']
    return []


def identity_errors(value: dict) -> list[str]:
    errors = []
    if not re.fullmatch(r'DMTE-\d+', str(value.get('delivery', ''))):
        errors.append('delivery must be a DMTE key.')
    if value.get('repository') != CANONICAL_REPOSITORY:
        errors.append('repository must be ' + CANONICAL_REPOSITORY + '.')
    number = value.get('github_issue')
    if type(number) is not int or number < 1:
        errors.append('github_issue must be a positive issue number.')
    try:
        uuid.UUID(str(value.get('multica_id', '')))
    except ValueError:
        errors.append('multica_id must be a UUID.')
    return errors


def validate_registry(registry: dict) -> list[str]:
    errors = []
    seen_gh, seen_mi = set(), set()
    if registry.get('version') != 1 or not isinstance(registry.get('deliveries'), dict):
        return ['Registry version/deliveries are invalid.']
    for key, entry in registry['deliveries'].items():
        if not isinstance(entry, dict):
            errors.append('Registry entry is not an object: ' + key)
            continue
        errors += [key + ': ' + e for e in identity_errors(entry)]
        errors += [key + ': ' + e for e in cycle_errors(entry.get('cycle'))]
        if key != entry.get('delivery'):
            errors.append('Registry key differs from delivery identity: ' + key)
        gh = (entry.get('repository'), entry.get('github_issue'))
        mi = entry.get('multica_id')
        if gh in seen_gh or mi in seen_mi:
            errors.append('Duplicate canonical GitHub/Multica identity: ' + key)
        seen_gh.add(gh); seen_mi.add(mi)
    return errors


def base_moved_without_touching(root: Path, recorded: str, base: str, touched: set[str]) -> bool:
    """Evidence stays valid when main moved on (strict branch protection) without touching the delivery's files.

    The recorded base must be an ancestor of the manifest base, and no file the delivery
    changes, deletes or tests may differ between the two, so the RED/GREEN still ran against the same code.
    """
    try:
        git(root, 'merge-base', '--is-ancestor', recorded, base)
        # shortcut: touched also takes every path the delivery changes vs base (renames split, deletions kept);
        # a file only imported by the tests but untouched by the delivery is not tracked.
        touched |= set(git(root, 'diff', '--no-renames', '--name-only', '-z', base).split('\0'))
        moved = set(git(root, 'diff', '--no-renames', '--name-only', '-z', recorded, base).split('\0'))
        return not {name for name in touched & moved if name and is_source_path(name)}
    except subprocess.CalledProcessError:
        return False


def validate_evidence(root: Path, tdd: dict, criteria: set[str], base: str,
                      sources: dict[str, str]) -> list[str]:
    errors, records = [], {}
    for phase in ['red', 'green']:
        try:
            value = json.loads(safe_path(root, tdd.get(phase)).read_text())
            output = safe_path(root, value['log']).read_text()
            if value.get('version') != 1 or value.get('phase') != phase:
                errors.append('Evidence phase/version differs: ' + phase)
            if sha(output.encode()) != value.get('log_sha256'):
                errors.append('Evidence log hash differs: ' + phase)
            observed_base = value.get('base_sha')
            if observed_base != base:
                if not isinstance(observed_base, str) or not re.fullmatch(r'[0-9a-f]{7,40}', observed_base) or (
                        git(root, 'rev-parse', '--verify', observed_base) != base
                        and not base_moved_without_touching(root, observed_base, base, set(sources) | set(value.get('tests', {})))):
                    errors.append('Evidence base SHA differs: ' + phase)
            if not test_command(value.get('command', [])):
                errors.append('Unsupported evidence test command: ' + phase)
            if not criteria.issubset(set(value.get('criteria', []))):
                errors.append('Acceptance criteria missing from evidence: ' + phase)
            if not value.get('tests'):
                errors.append('Evidence has no test sources: ' + phase)
            for name, digest in value.get('tests', {}).items():
                if sha(safe_path(root, name).read_bytes()) != digest:
                    errors.append('Test source changed since evidence: ' + name)
            if phase == 'red' and not behavioral_red(output, value.get('exit_code', 0)):
                errors.append('RED is not a behavioral assertion failure.')
            commits = [observed_base, value.get('head_sha')]
            if phase == 'red' and all(isinstance(c, str) and re.fullmatch(r'[0-9a-f]{7,40}', c) for c in commits):
                recorded = value.get('source_hashes') or {}
                errors += ['RED did not run against the committed code: ' + name
                           for name in stale_sources(root, *commits, value.get('tests', {}), recorded.get)]
            if phase == 'green':
                if value.get('exit_code') != 0:
                    errors.append('GREEN did not pass.')
                if value.get('source_hashes') != sources:
                    errors.append('GREEN source hashes differ from the reviewed sources.')
            start, finish = (dt.datetime.fromisoformat(value[x]) for x in ['started_at', 'finished_at'])
            if start.tzinfo is None or finish.tzinfo is None or finish < start:
                errors.append('Invalid evidence timestamps: ' + phase)
            records[phase] = value
        except (ValueError, TypeError, KeyError, OSError) as error:
            errors.append('Invalid ' + phase + ' evidence: ' + str(error))
    if len(records) == 2:
        red, green = records['red'], records['green']
        if red['command'] != green['command'] or red.get('tests') != green.get('tests'):
            errors.append('RED/GREEN must run the same command and unchanged tests.')
        if green['started_at'] < red['finished_at']:
            errors.append('GREEN precedes RED completion.')
    return errors


def validate_legacy_exception(root: Path, manifest: dict, tdd_ids: set[str],
                              check_evidence: bool) -> list[str]:
    """A recorded human decision waives history, never evidence for subsequent work.

    Approval provenance is reviewed by humans, like the existing evidence files;
    an in-repository record is not an authenticated GitHub approval.
    """
    try:
        tdd = manifest['tdd']
        record = json.loads(safe_path(root, tdd.get('exception')).read_text())
        if not isinstance(record, dict) or record.get('version') != 1:
            raise ValueError('Invalid legacy exception record.')
        for field in ['delivery', 'github_issue', 'base_sha']:
            if record.get(field) != manifest.get(field):
                raise ValueError('Legacy exception differs from manifest: ' + field)
        base, legacy = record.get('base_sha'), record.get('legacy_sha')
        if not all(isinstance(value, str) and re.fullmatch(r'[0-9a-f]{40}', value)
                   for value in [base, legacy]) or not record.get('reason'):
            raise ValueError('Legacy exception needs full base/legacy SHAs and reason.')
        approval = record.get('approval') or {}
        if not isinstance(approval, dict):
            raise ValueError('Legacy approval must be an object.')
        source = approval.get('source', '')
        expected = (r'https://github\.com/' + re.escape(CANONICAL_REPOSITORY) + r'/issues/'
                    + str(manifest['github_issue']) + r'#issuecomment-\d+')
        if (approval.get('status') != 'approved' or not approval.get('approved_by')
                or not isinstance(source, str) or not re.fullmatch(expected, source)):
            raise ValueError('Legacy exception requires explicit approval and its canonical issue comment; pending approval blocks delivery.')
        waived = record.get('criteria', [])
        ids = {criterion['id'] for criterion in manifest['criteria']}
        if (not isinstance(waived, list) or not all(isinstance(key, str) for key in waived)
                or len(set(waived)) != len(waived) or set(waived) != ids - tdd_ids):
            raise ValueError('Legacy exception criteria must match exactly the waived criteria.')
        git(root, 'merge-base', '--is-ancestor', base, legacy)
        git(root, 'merge-base', '--is-ancestor', legacy, 'HEAD')
        # New tests and source changes are measured from the approved legacy snapshot.
        # Legacy evidence must never be manufactured by replaying old implementation.
        if check_evidence:
            return validate_evidence(root, tdd, tdd_ids, legacy, source_hashes(root, legacy))
        return []
    except (ValueError, TypeError, KeyError, OSError, subprocess.CalledProcessError) as error:
        return ['Invalid legacy TDD exception: ' + str(error)]


def validate_manifest(root: Path, manifest: dict, *, check_evidence: bool = True,
                      base: str | None = None, changes: list[str] | None = None) -> list[str]:
    """`base` and `changes` come from Git when the caller has them; the manifest's own
    `base_sha`/`changed_files` are only the fallback for a manifest checked without Git context."""
    errors = identity_errors(manifest)
    if manifest.get('version') != 1 or manifest.get('tier') not in [1, 2, 3]:
        errors.append('Manifest version/tier is invalid.')
    criteria = manifest.get('criteria') or []
    if not isinstance(criteria, list) or not criteria:
        errors.append('Acceptance criteria are required.')
        criteria = []
    ids, tdd_ids = set(), set()
    for criterion in criteria:
        key = criterion.get('id', '')
        if not re.fullmatch(r'AC-\d+', key) or key in ids or not criterion.get('description') or not criterion.get('tests'):
            errors.append('Every criterion needs a unique AC id, description and tests.')
        ids.add(key)
        if criterion.get('tdd_required', True):
            tdd_ids.add(key)
        elif not criterion.get('reason'):
            errors.append('Non-TDD criterion needs a justification: ' + key)
    if manifest.get('tier', 0) >= 2:
        try:
            content = safe_path(root, manifest.get('spec')).read_text()
            if any(key not in content for key in ids):
                errors.append('SPEC does not contain all acceptance criterion identifiers.')
        except (ValueError, TypeError, OSError):
            errors.append('Tier 2/3 requires an existing in-checkout SPEC.')
    if changes is None:
        changes = manifest.get('changed_files') or []
    for name in changes:
        try:
            safe_path(root, name)
        except (ValueError, TypeError):
            errors.append('Changed file path escapes checkout.')
    behavior = any(not p.startswith(('docs/', '.github/', '.delivery/')) and p != 'AGENTS.md'
                   and not re.search(r'(?:test_|\.test\.|\.spec\.|\.stories\.)', p)
                   and Path(p).suffix in ['.py', '.ts', '.tsx', '.js', '.mts', '.sql'] for p in changes)
    tdd = manifest.get('tdd') or {}
    if tdd.get('mode') == 'not-applicable':
        if behavior or not tdd.get('reason'):
            errors.append('Behavioral code cannot silently opt out of TDD.')
    elif tdd.get('mode') == 'legacy-exception':
        errors += validate_legacy_exception(root, manifest, tdd_ids, check_evidence)
    elif tdd.get('mode') != 'required':
        errors.append('TDD mode must be required, legacy-exception or justified not-applicable.')
    elif check_evidence:
        base = base or manifest.get('base_sha')
        if not isinstance(base, str) or not re.fullmatch(r'[0-9a-f]{40}', base):
            errors.append('Evidence needs a full base SHA.')
        else:
            errors += validate_evidence(root, tdd, tdd_ids, base, source_hashes(root, base))
    ui = [p for p in changes if p.startswith('apps/web/src/') and p.endswith('.tsx') and not re.search(r'\.(test|spec|stories)\.', p)]
    ds = manifest.get('design_system') or {}
    if ui:
        if ds.get('applicable') is not True:
            errors.append('UI changes require a design system assessment.')
        if not ds.get('reused') and not ds.get('exception'):
            errors.append('UI must declare reused DS components or explain a gap.')
        for component in ds.get('reused', []):
            path = 'apps/web/src/components/ds/' + component + '.tsx'
            if not safe_path(root, path).is_file():
                errors.append('Reused DS component not found: ' + component)
        for path in ui:
            if '/components/ds/' in path:
                stories = ds.get('stories') or []
                if not stories and not ds.get('exception'):
                    errors.append('DS component changes require stories or a justified exception.')
                for story in stories:
                    if '.stories.' not in story or not safe_path(root, story).is_file():
                        errors.append('Declared story is absent or invalid: ' + story)
        for path in ui:
            if safe_path(root, path).is_file():
                content = safe_path(root, path).read_text()
                if re.search(r'from\s+[\'\"](?:@carbon/react|next/)', content):
                    errors.append('UI imports a framework/DS incompatible with Aponta: ' + path)
    elif ds.get('applicable') is not False or not ds.get('reason'):
        errors.append('Non-UI changes must explain why DS is not applicable.')
    return errors


def validate_pr(body: str, manifest: dict) -> list[str]:
    errors = []
    keys = re.findall(r'^Aponta-Delivery:\s*(DMTE-\d+)\s*$', body, re.M)
    if keys != [manifest.get('delivery')]:
        errors.append('PR must identify exactly its canonical delivery.')
    number = manifest.get('github_issue')
    if not re.search(r'\bRefs\s+(?:' + re.escape(CANONICAL_REPOSITORY) + r')?#' + str(number) + r'\b', body, re.I):
        errors.append('PR must reference its primary GitHub issue with Refs.')
    if re.search(r'\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s+(?:[\w.-]+/[\w.-]+)?#\d+', body, re.I):
        errors.append('Do not auto-close product issues before production validation; use Refs.')
    return errors


def other_identities(root: Path, registry: dict, key: str) -> list[tuple]:
    """(delivery, github_issue, multica_id) of every other delivery: registry entries and manifests."""
    found = {name: (name, entry.get('github_issue'), entry.get('multica_id'))
             for name, entry in registry.get('deliveries', {}).items() if isinstance(entry, dict)}
    for path in sorted((root / '.delivery/deliveries').glob('*.json')):
        try:
            # safe_path: a symlink committed here must not make the check read outside the checkout.
            value = json.loads(safe_path(root, path.relative_to(root).as_posix()).read_text())
            found.setdefault(value['delivery'], (value['delivery'], value.get('github_issue'), value.get('multica_id')))
        except (ValueError, TypeError, KeyError, OSError):
            continue
    found.pop(key, None)
    return list(found.values())


def validate_binding(manifest: dict, entry: dict | None, others: list[tuple] | None = None) -> list[str]:
    """A delivery is bound by its registry entry or, without one, by its own manifest.

    `others` lists the remaining deliveries; with it, a manifest absent from the registry is
    accepted as long as no other delivery claims its GitHub issue or Multica parent.
    """
    if not entry:
        if others is None:
            return ['Delivery is absent from canonical registry.']
        clash = sorted(name for name, issue, parent in others
                       if issue == manifest.get('github_issue') or parent == manifest.get('multica_id'))
        return ['Duplicate canonical GitHub/Multica identity: ' + ', '.join(clash)] if clash else []
    errors = []
    if entry.get('kind') != 'delivery':
        errors.append('Epics cannot be used as implementation deliveries.')
    for field in ['delivery', 'repository', 'github_issue', 'multica_id', 'tier', 'cycle']:
        if entry.get(field) != manifest.get(field):
            errors.append('Manifest differs from canonical registry: ' + field)
    return errors


@contextlib.contextmanager
def writer_lock(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a+') as handle:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def resolve_pr_from_event(event: dict | None, fetch_pr) -> tuple[dict, str | None, str | None, dict | None]:
    """Resolve the PR body/base/head SHAs from a GitHub Actions event payload.

    Handles both `pull_request` events (body is right there in the payload)
    and `merge_group` events from the native Merge Queue, which carry NO
    `pull_request` key at all — only a `head_ref` shaped like
    "refs/heads/gh-readonly-queue/<base>/pr-<N>-<sha>". For the latter,
    `fetch_pr(number)` resolves the real PR (inject `lambda n: json.loads(...)`
    wrapping `gh api repos/<repo>/pulls/<n>` in production; a canned dict in
    tests) so the exact same delivery/body contract applies whether this run
    was triggered by the PR itself or by the queue re-testing it against the
    latest main.

    Returns (pr, base_sha, head_sha, merge_group) — pr/base/head are empty/None
    with no errors appended by the caller only when event itself is falsy;
    an unresolvable merge_group head_ref is a caller-visible error, surfaced
    via the returned merge_group being truthy but base/head staying None.
    """
    if not event:
        return {}, None, None, None
    merge_group = event.get('merge_group')
    if merge_group:
        ref_match = re.search(r'/pr-(\d+)-', merge_group.get('head_ref') or '')
        if not ref_match:
            return {}, None, None, merge_group
        pr = fetch_pr(ref_match.group(1))
        return pr, pr['base']['sha'], pr['head']['sha'], merge_group
    pr = event.get('pull_request', {})
    return pr, pr.get('base', {}).get('sha'), pr.get('head', {}).get('sha'), None


def delivery_errors(root: Path, registry: dict, manifest_path: Path, pr: dict | None, base: str | None,
                    head: str | None) -> list[str]:
    """Contract errors of one delivery, read from the tree at `root`."""
    path = root / manifest_path
    if not path.is_file():
        return ['Delivery manifest is missing: ' + str(manifest_path)]
    manifest = json.loads(path.read_text())
    errors = []
    if pr is not None and base and head:
        # Base and changed files are facts of the PR, so they are read from Git on every run:
        # a manifest that records them goes stale whenever main moves, and the commit that
        # refreshes it changes the SHA the Independent QA approved.
        fork = merge_base(root, head, [base, 'origin/' + str(pr.get('base', {}).get('ref')), pr.get('base', {}).get('ref')])
        changes = [name for name in git(root, 'diff', '--name-only', fork, head).splitlines() if name]
        errors += validate_manifest(root, manifest, base=fork, changes=changes)
        errors += validate_pr(pr.get('body') or '', manifest)
    elif 'base_sha' in manifest:
        errors += validate_manifest(root, manifest)
    else:
        fork = merge_base(root, 'HEAD', ['origin/main', 'main'])
        errors += validate_manifest(root, manifest, base=fork, changes=changed_paths(root, fork))
    key = manifest.get('delivery')
    entry = registry.get('deliveries', {}).get(key)
    return errors + validate_binding(manifest, entry, other_identities(root, registry, key))


def check_contract(root: Path, registry_path: Path, event: dict | None, fetch_pr,
                   manifest_path: Path | None = None) -> list[str]:
    """Every contract error for this checkout; `event` is the GitHub Actions payload when run by CI."""
    registry = json.loads((root / registry_path).read_text())
    errors = validate_registry(registry)
    pr, base, head, merge_group = resolve_pr_from_event(event, fetch_pr)
    if event and merge_group and base is None:
        errors.append('Could not resolve the PR number from the merge_group head_ref.')
    if event:
        matches = re.findall(r'^Aponta-Delivery:\s*(DMTE-\d+)\s*$', pr.get('body') or '', re.M)
        if len(matches) != 1:
            errors.append('PR must declare exactly one Aponta-Delivery: DMTE-N line.')
            manifest_path = None
        else:
            manifest_path = Path('.delivery/deliveries') / (matches[0] + '.json')
    if not manifest_path:
        return errors
    if not (event and base and head):
        return errors + delivery_errors(root, registry, manifest_path, None, None, None)
    # In a merge_group run, HEAD is the queue's synthetic commit (main + this PR + anything
    # ahead of it in the queue). The checkout must be that commit, but the contract belongs to
    # the PR: it is validated on the PR head tree, which no other queued change can alter.
    expected_checkout = merge_group['head_sha'] if merge_group else head
    if git(root, 'rev-parse', 'HEAD') != expected_checkout:
        errors.append('Checkout is not the expected head SHA.')
    if merge_group:
        with tree_at(root, head) as view:
            return errors + delivery_errors(view, registry, manifest_path, pr, base, head)
    return errors + delivery_errors(root, registry, manifest_path, pr, base, head)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    sub = parser.add_subparsers(dest='action', required=True)
    record = sub.add_parser('record')
    record.add_argument('--phase', choices=['red', 'green'], required=True)
    record.add_argument('--base', required=True)
    record.add_argument('--out', type=Path, required=True)
    record.add_argument('--test-file', action='append', required=True)
    record.add_argument('--ac', action='append', required=True)
    record.add_argument('command', nargs=argparse.REMAINDER)
    check = sub.add_parser('check')
    check.add_argument('--manifest', type=Path)
    check.add_argument('--event', type=Path)
    check.add_argument('--registry', type=Path, default=Path('.delivery/registry.json'))
    init = sub.add_parser('init', help='write the manifest of a new delivery from its identity and SPEC')
    init.add_argument('--delivery', required=True)
    init.add_argument('--github-issue', type=int, required=True)
    init.add_argument('--multica-id', required=True)
    init.add_argument('--tier', type=int, required=True)
    init.add_argument('--spec', required=True)
    init.add_argument('--ds-reason', help='why the design system does not apply; omit for a delivery with UI')
    init.add_argument('--registry', type=Path, default=Path('.delivery/registry.json'))
    cycle = sub.add_parser('cycle', help='print the automatic cycle id for a date (default: today, America/Sao_Paulo)')
    cycle.add_argument('--date', type=dt.date.fromisoformat)
    locked = sub.add_parser('with-lock')
    locked.add_argument('--path', type=Path, default=Path.home() / '.local/state/aponta/writer.lock')
    locked.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    root = args.root.resolve()
    if args.action == 'record':
        command = args.command[1:] if args.command[:1] == ['--'] else args.command
        value = capture(root, root / args.out, args.phase, args.base, command, args.test_file, args.ac)
        print(json.dumps({'phase': value['phase'], 'exit_code': value['exit_code'], 'evidence': str(args.out)}))
        valid = behavioral_red((root / value['log']).read_text(), value['exit_code']) if args.phase == 'red' else value['exit_code'] == 0
        return 0 if valid else 1
    if args.action == 'init':
        path = init_manifest(root, json.loads((root / args.registry).read_text()), args.delivery,
                             args.github_issue, args.multica_id, args.tier, args.spec, args.ds_reason)
        print('Manifest written: ' + path.relative_to(root).as_posix()
              + '. Name the tests of each criterion, then run check.')
        return 0
    if args.action == 'cycle':
        print(cycle_for(args.date or today_sao_paulo()))
        return 0
    if args.action == 'with-lock':
        command = args.command[1:] if args.command[:1] == ['--'] else args.command
        if not command:
            parser.error('with-lock requires a command')
        try:
            with writer_lock(args.path):
                return subprocess.run(command, cwd=root, shell=False).returncode
        except BlockingIOError:
            print('Another Aponta writer holds the lock.', file=sys.stderr)
            return 2
    event = json.loads(args.event.read_text()) if args.event else None

    def fetch_pr(number: str) -> dict:
        return json.loads(subprocess.run(
            ['gh', 'api', 'repos/' + CANONICAL_REPOSITORY + '/pulls/' + number],
            capture_output=True, text=True, check=True).stdout)

    errors = check_contract(root, args.registry, event, fetch_pr, args.manifest)
    for error in errors:
        print('ERROR: ' + error, file=sys.stderr)
    if not errors:
        print('Aponta delivery contract verified.')
    return 1 if errors else 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError) as error:
        print('Delivery check failed: ' + str(error), file=sys.stderr)
        raise SystemExit(1)

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
import subprocess
import sys
import uuid


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
            if not name.startswith(('.delivery/', 'docs/', '.github/'))
            and name != 'AGENTS.md' and '__pycache__' not in Path(name).parts
            and not name.endswith('.pyc') and (root / name).is_file()}


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
    started = dt.datetime.now(dt.timezone.utc).isoformat()
    completed = subprocess.run(command, cwd=root, capture_output=True, text=True, shell=False)
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


def identity_errors(value: dict) -> list[str]:
    errors = []
    if not re.fullmatch(r'DMTE-\d+', str(value.get('delivery', ''))):
        errors.append('delivery must be a DMTE key.')
    if value.get('repository') != 'alfredo-maia/aponta':
        errors.append('repository must be alfredo-maia/aponta.')
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
        if key != entry.get('delivery'):
            errors.append('Registry key differs from delivery identity: ' + key)
        gh = (entry.get('repository'), entry.get('github_issue'))
        mi = entry.get('multica_id')
        if gh in seen_gh or mi in seen_mi:
            errors.append('Duplicate canonical GitHub/Multica identity: ' + key)
        seen_gh.add(gh); seen_mi.add(mi)
    return errors


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
                if not isinstance(observed_base, str) or not re.fullmatch(r'[0-9a-f]{7,40}', observed_base) or git(root, 'rev-parse', '--verify', observed_base) != base:
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


def validate_manifest(root: Path, manifest: dict, *, check_evidence: bool = True) -> list[str]:
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
    elif tdd.get('mode') != 'required':
        errors.append('TDD mode must be required or justified not-applicable.')
    elif check_evidence:
        base = manifest.get('base_sha')
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
    if not re.search(r'\bRefs\s+(?:alfredo-maia/aponta)?#' + str(number) + r'\b', body, re.I):
        errors.append('PR must reference its primary GitHub issue with Refs.')
    if re.search(r'\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s+(?:[\w.-]+/[\w.-]+)?#\d+', body, re.I):
        errors.append('Do not auto-close product issues before production validation; use Refs.')
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
    registry = json.loads((root / args.registry).read_text())
    errors = validate_registry(registry)
    event = json.loads(args.event.read_text()) if args.event else None
    if event:
        pr = event.get('pull_request', {})
        matches = re.findall(r'^Aponta-Delivery:\s*(DMTE-\d+)\s*$', pr.get('body') or '', re.M)
        if len(matches) != 1:
            errors.append('PR must declare exactly one Aponta-Delivery: DMTE-N line.')
        else:
            args.manifest = Path('.delivery/deliveries') / (matches[0] + '.json')
    if args.manifest:
        path = root / args.manifest
        if not path.is_file():
            errors.append('Delivery manifest is missing: ' + str(args.manifest))
        else:
            manifest = json.loads(path.read_text())
            errors += validate_manifest(root, manifest)
            if event:
                errors += validate_pr(event['pull_request'].get('body') or '', manifest)
                base, head = event['pull_request']['base']['sha'], event['pull_request']['head']['sha']
                if git(root, 'rev-parse', 'HEAD') != head:
                    errors.append('Checkout is not the PR head SHA.')
                changes = git(root, 'diff', '--name-only', base + '...' + head).splitlines()
                declared = set(manifest.get('changed_files', []))
                undeclared = [p for p in changes if p not in declared and not p.startswith('.delivery/')]
                if undeclared:
                    errors.append('Changed files missing from delivery manifest: ' + ', '.join(undeclared))
                if manifest.get('base_sha') != git(root, 'merge-base', base, head):
                    errors.append('Manifest base_sha differs from the PR merge base.')
            entry = registry.get('deliveries', {}).get(manifest.get('delivery'))
            if not entry or entry.get('github_issue') != manifest.get('github_issue') or entry.get('multica_id') != manifest.get('multica_id'):
                errors.append('Manifest identity differs from canonical registry.')
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

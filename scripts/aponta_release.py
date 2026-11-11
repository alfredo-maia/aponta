#!/usr/bin/env python3
"""Staging -> production release tool for Aponta (Python standard library).

One commit is built once into images tagged with its SHA, deployed to staging, tested there
and recorded; production only receives a commit whose record says staging passed with those
same images. See docs/delivery/RELEASE.md.
"""
from __future__ import annotations

import argparse
import contextlib
import datetime as dt
import fcntl
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys
import time
import urllib.error
import urllib.request

SERVICES = ('api', 'web', 'storybook')
ENVIRONMENTS = {
    # project, interpolation env file, service env file, extra compose file, services brought up
    'staging': ('aponta-staging', '.env.staging', '.env.staging', 'docker-compose.staging.yml',
                ['postgres', 'migrate', 'api', 'web']),
    'production': ('aponta-prod', '.env.prod', '.env', None, []),
}
SEED_LOGIN = {'email': 'agent@aponta.com', 'password': 'Password123!'}


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')


def run(*command: str, env: dict | None = None, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(command, capture_output=True, text=True, check=check,
                          env={**os.environ, **(env or {})})


def promotion_errors(record, sha, images) -> list[str]:
    """Why this commit may not go to production; empty when it may."""
    if not record:
        return ['No staging record for this commit.']
    errors = []
    if record.get('sha') != sha:
        errors.append('Staging record belongs to another commit.')
    if (record.get('staging') or {}).get('result') != 'passed':
        errors.append('Staging did not pass for this commit.')
    validated = record.get('images') or {}
    errors += ['Image differs from the one validated in staging: ' + name
               for name in SERVICES if not images.get(name) or images.get(name) != validated.get(name)]
    return errors


def is_ancestor(root: Path, older: str, newer: str) -> bool:
    return run('git', '-C', str(root), 'merge-base', '--is-ancestor', older, newer, check=False).returncode == 0


def ordering_errors(root: Path, deployed, sha, rollback: bool = False) -> list[str]:
    """An older commit never replaces a newer one unless the operator asks for a rollback."""
    if not deployed or deployed == sha:
        return []
    if rollback:
        return [] if is_ancestor(root, sha, deployed) else ['Rollback target is not an ancestor of the deployed commit.']
    if is_ancestor(root, deployed, sha):
        return []
    if is_ancestor(root, sha, deployed):
        return ['Commit is older than the one deployed; use --rollback to go back on purpose.']
    return ['Commit does not contain the one deployed.']


def env_values(text: str) -> dict:
    values = {}
    for line in text.splitlines():
        match = re.fullmatch(r'\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)', line)
        if match:
            values[match.group(1)] = match.group(2).strip().strip('"\'')
    return values


def new_staging_env() -> str:
    """A staging env file with its own random secrets; mail and inbox stay unconfigured."""
    return '\n'.join([
        '# Aponta staging. Gerado por scripts/aponta_release.py init-staging; nunca copie valores de produção.',
        'POSTGRES_USER=aponta_staging',
        'POSTGRES_PASSWORD=' + secrets.token_urlsafe(24),
        'POSTGRES_DB=aponta_staging',
        'JWT_SECRET=' + secrets.token_urlsafe(48),
        'API_PORT=8191',
        'WEB_PORT=8190',
        'WEB_ORIGIN=https://staging.aponta.cloud',
        'VITE_API_URL=/api',
        '',
    ])


def compose_command(environment, sha, home: Path, config: Path) -> list[str]:
    if environment not in ENVIRONMENTS:
        raise ValueError('Unknown environment: ' + str(environment))
    project, env_file, _, extra, _ = ENVIRONMENTS[environment]
    release = home / 'releases' / sha
    command = ['docker', 'compose', '-p', project, '--env-file', str(config / env_file),
               '-f', str(release / 'docker-compose.yml')]
    if extra:
        command += ['-f', str(release / extra)]
    return command


def compose_env(environment: str, sha: str, config: Path) -> dict:
    return {'APONTA_TAG': sha, 'APONTA_COMMIT': sha, 'APONTA_ENV_FILE': str(config / ENVIRONMENTS[environment][2])}


def smoke(sha, fetch) -> list[dict]:
    """Checks that the stack answers and that it answers from this commit. fetch(path) -> (status, body)."""
    def check(name, path, accept):
        try:
            status, body = fetch(path)
            ok = status == 200 and accept(body)
            return {'name': name, 'ok': bool(ok), 'detail': 'HTTP %s' % status}
        except (OSError, ValueError, KeyError, TypeError) as error:
            return {'name': name, 'ok': False, 'detail': str(error)[:200]}

    return [
        check('web page', '/', lambda body: True),
        check('api health', '/api/health', lambda body: json.loads(body).get('status') == 'ok'),
        check('api commit', '/api/version', lambda body: json.loads(body).get('commit') == sha),
        check('web commit', '/version.json', lambda body: json.loads(body).get('commit') == sha),
    ]


def record_path(home: Path, sha: str) -> Path:
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise ValueError('Use a full commit SHA.')
    return home / 'records' / (sha + '.json')


def save_record(home: Path, record: dict) -> None:
    path = record_path(home, record['sha'])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')


def load_record(home: Path, sha: str):
    path = record_path(home, sha)
    return json.loads(path.read_text()) if path.is_file() else None


# ── Side effects below: Git, Docker and HTTP on the deploy host ──────────────────────────────


def http_fetch(base: str, token: str | None = None):
    def fetch(path, data=None):
        request = urllib.request.Request(base + path, data=json.dumps(data).encode() if data else None,
                                         headers={'Content-Type': 'application/json',
                                                  **({'Authorization': 'Bearer ' + token} if token else {})})
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                return response.status, response.read().decode()
        except urllib.error.HTTPError as error:
            return error.code, error.read().decode()
    return fetch


def critical_flows(base: str) -> list[dict]:
    """Staging only: sign in with the synthetic seed user and read protected data."""
    checks = []
    try:
        status, body = http_fetch(base)('/api/auth/login', SEED_LOGIN)
        token = json.loads(body).get('access_token') or json.loads(body).get('accessToken') or json.loads(body).get('token')
        checks.append({'name': 'login (seed user)', 'ok': status in (200, 201) and bool(token), 'detail': 'HTTP %s' % status})
        fetch = http_fetch(base, token)
        for name, path in (('session', '/api/auth/me'), ('tickets list', '/api/tickets')):
            status, _ = fetch(path)
            checks.append({'name': name, 'ok': status == 200, 'detail': 'HTTP %s' % status})
    except (OSError, ValueError) as error:
        checks.append({'name': 'critical flows', 'ok': False, 'detail': str(error)[:200]})
    return checks


@contextlib.contextmanager
def locked(home: Path, name: str):
    """One deploy -> test -> record cycle per environment at a time on this host; waits for its turn."""
    path = home / 'locks' / (name + '.lock')
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a+') as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def image_ids(sha: str) -> dict:
    ids = {}
    for name in SERVICES:
        shown = run('docker', 'image', 'inspect', '--format', '{{.Id}}', 'aponta-%s:%s' % (name, sha), check=False)
        ids[name] = shown.stdout.strip() if shown.returncode == 0 else None
    return ids


def export_release(repo: Path, home: Path, sha: str) -> Path:
    """The tree of the commit, exported once; compose files and build context come from here."""
    release = home / 'releases' / sha
    if not (release / 'docker-compose.yml').is_file():
        release.mkdir(parents=True, exist_ok=True)
        archive = subprocess.Popen(['git', '-C', str(repo), 'archive', sha], stdout=subprocess.PIPE)
        subprocess.run(['tar', '-x', '-C', str(release)], stdin=archive.stdout, check=True)
        if archive.wait() != 0:
            raise ValueError('Cannot export commit ' + sha)
    return release


def deployed(home: Path, environment: str):
    path = home / 'state' / (environment + '.json')
    return json.loads(path.read_text()).get('sha') if path.is_file() else None


def mark_deployed(home: Path, environment: str, sha: str) -> None:
    path = home / 'state' / (environment + '.json')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({'sha': sha, 'at': now()}) + '\n')


def prune(home: Path, keep: int = 5) -> None:
    """Drop exported trees and images of old commits; never the ones deployed in an environment."""
    in_use = {deployed(home, name) for name in ENVIRONMENTS}
    records = sorted((home / 'records').glob('*.json'), key=lambda path: path.stat().st_mtime, reverse=True)
    for path in records[keep:]:
        sha = path.stem
        if sha in in_use:
            continue
        run('docker', 'image', 'rm', *['aponta-%s:%s' % (name, sha) for name in (*SERVICES, 'seed')], check=False)
        run('rm', '-rf', '--', str(home / 'releases' / sha), check=False)


def up(environment: str, sha: str, home: Path, config: Path) -> None:
    compose = compose_command(environment, sha, home, config)
    env = compose_env(environment, sha, config)
    # --no-build: the images are the ones tagged with the commit, never rebuilt at deploy time.
    done = run(*compose, 'up', '-d', '--no-build', '--wait', *ENVIRONMENTS[environment][4], env=env, check=False)
    if done.returncode != 0:
        raise ValueError('docker compose up failed: ' + (done.stderr or done.stdout)[-800:])


def wait_and_smoke(base: str, sha: str) -> list[dict]:
    checks = []
    for _ in range(20):
        checks = smoke(sha, http_fetch(base))
        if all(check['ok'] for check in checks):
            break
        time.sleep(3)
    return checks


def stage(repo: Path, home: Path, config: Path, sha: str) -> int:
    with locked(home, 'staging'):
        export_release(repo, home, sha)
        compose = compose_command('staging', sha, home, config)
        env = compose_env('staging', sha, config)
        if not all(image_ids(sha).values()):
            # Built once, from the exported tree of the commit; production reuses these exact images.
            built = run(*compose, '--profile', 'seed', 'build', env=env, check=False)
            if built.returncode != 0:
                print((built.stderr or built.stdout)[-2000:], file=sys.stderr)
                return 1
            # `storybook` is not part of the staging stack; it is built here so production gets it.
            production = compose_command('production', sha, home, config)
            run(*production, 'build', 'storybook', env=compose_env('production', sha, config))
        record = {'version': 1, 'sha': sha, 'images': image_ids(sha), 'staging': {'result': 'failed', 'checks': []}}
        try:
            up('staging', sha, home, config)
            seeded = run(*compose, '--profile', 'seed', 'run', '--rm', 'seed', env=env, check=False)
            base = 'http://127.0.0.1:' + env_values((config / '.env.staging').read_text())['WEB_PORT']
            checks = [{'name': 'synthetic seed', 'ok': seeded.returncode == 0,
                       'detail': '' if seeded.returncode == 0 else (seeded.stderr or seeded.stdout)[-400:]}]
            checks += wait_and_smoke(base, sha) + critical_flows(base)
        except (ValueError, OSError, KeyError) as error:
            checks = [{'name': 'deploy', 'ok': False, 'detail': str(error)[-800:]}]
        passed = all(check['ok'] for check in checks)
        record['staging'] = {'result': 'passed' if passed else 'failed', 'at': now(), 'checks': checks}
        save_record(home, record)
        if passed:
            mark_deployed(home, 'staging', sha)
        print(json.dumps(record, ensure_ascii=False, indent=2))
        return 0 if passed else 1


def promote(repo: Path, home: Path, config: Path, sha: str, rollback: bool) -> int:
    with locked(home, 'production'):
        record = load_record(home, sha)
        current = deployed(home, 'production')
        errors = promotion_errors(record, sha, image_ids(sha)) + ordering_errors(repo, current, sha, rollback)
        if errors:
            for error in errors:
                print('ERROR: ' + error, file=sys.stderr)
            return 1
        base = 'http://127.0.0.1:' + env_values((config / '.env.prod').read_text())['WEB_PORT']
        if current == sha and all(check['ok'] for check in smoke(sha, http_fetch(base))):
            print(sha + ' já está em produção. Nada a fazer.')
            return 0
        try:
            up('production', sha, home, config)
            checks = wait_and_smoke(base, sha)
        except ValueError as error:
            checks = [{'name': 'deploy', 'ok': False, 'detail': str(error)[-800:]}]
        passed = all(check['ok'] for check in checks)
        record['production'] = {'result': 'passed' if passed else 'failed', 'at': now(), 'checks': checks,
                                'previous': current, 'rollback': rollback}
        save_record(home, record)
        if passed:
            mark_deployed(home, 'production', sha)
            prune(home)
        print(json.dumps(record['production'], ensure_ascii=False, indent=2))
        return 0 if passed else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path('/home/hermes/repos/aponta'), help='Git checkout used to export commits')
    parser.add_argument('--home', type=Path, default=Path.home() / 'deploy/aponta', help='releases, records, state and locks')
    parser.add_argument('--config', type=Path, help='directory holding .env, .env.prod and .env.staging (default: --repo)')
    sub = parser.add_subparsers(dest='action', required=True)
    for name in ('stage', 'promote'):
        command = sub.add_parser(name)
        command.add_argument('--sha', required=True)
    sub.choices['promote'].add_argument('--rollback', action='store_true')
    sub.add_parser('init-staging', help='create .env.staging with its own secrets, if absent')
    sub.add_parser('status')
    args = parser.parse_args()
    config = args.config or args.repo
    if args.action == 'init-staging':
        path = config / '.env.staging'
        if path.exists():
            print('Já existe: ' + str(path))
            return 0
        path.touch(mode=0o600)
        path.write_text(new_staging_env())
        print('Criado: ' + str(path))
        return 0
    if args.action == 'status':
        print(json.dumps({name: deployed(args.home, name) for name in ENVIRONMENTS}, indent=2))
        return 0
    if not re.fullmatch(r'[0-9a-f]{40}', args.sha):
        raise ValueError('Use a full commit SHA.')
    if args.action == 'stage':
        return stage(args.repo, args.home, config, args.sha)
    return promote(args.repo, args.home, config, args.sha, args.rollback)


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError) as error:
        print('Release failed: ' + str(error), file=sys.stderr)
        raise SystemExit(1)

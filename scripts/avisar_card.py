"""Post the result of the CD run on the Multica card of the delivery it shipped.

Runs as the last job of .github/workflows/deploy.yml. Commit -> PR -> `Aponta-Delivery: DMTE-N`
-> Multica parent (same lookup as publicar_qa.py). A failure here is logged and never fails the deploy.
"""
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.request

from publicar_qa import parent_of

ROOT = Path(__file__).resolve().parent.parent
LEADER = '[@dev_ultra_lider](mention://agent/0427564a-c9cc-494e-8ea1-592a98588251)'
SERVER = 'https://multica.aponta.cloud'
WORKSPACE = 'dabf7eb3-4a03-4e26-8eb0-0773f65cfff4'
PRODUCTION = 'https://dm.aponta.cloud'
VERSION_PATHS = ('/api/version', '/version.json')
DELIVERY_LINE = re.compile(r'^Aponta-Delivery:\s*(DMTE-\d+)\s*$', re.MULTILINE)


def outcome(staging, production):
    """(ok, headline) from the `result` of the staging and production jobs."""
    if production == 'success':
        return True, 'CD (Produção) concluído'
    job, result = ('staging', staging) if staging != 'success' else ('produção', production)
    return False, 'CD falhou em ' + job + ('' if result == 'failure' else ' (' + result + ')')


def delivery_of(prs):
    """(delivery, pr) when the PRs of the commit name exactly one delivery; otherwise None."""
    named = [(DELIVERY_LINE.search(pr.get('body') or ''), pr) for pr in prs]
    named = [(m.group(1), pr) for m, pr in named if m]
    return named[0] if len({delivery for delivery, _ in named}) == 1 else None


def build_body(label, sha, pr, run_url, version=None):
    lines = [LEADER + ' **' + label + '**', '', '- Commit: `' + sha + '`',
             '- PR: #' + str(pr['number']) + ' (' + pr['html_url'] + ')', '- Run: ' + run_url]
    if version:
        shown = ', '.join('`' + path + '` → ' + ('`' + commit + '`' if commit else 'indisponível') for path, commit in version.items())
        verdict = ('não verificado contra o' if None in version.values()
                   else 'coincide com o' if set(version.values()) == {sha} else 'diferente do')
        lines.append('- Produção: ' + shown + ' (' + verdict + ' commit implantado)')
    return '\n'.join(lines)


def production_version(base, http):
    version = {}
    for path in VERSION_PATHS:
        try:
            version[path] = json.loads(http(urllib.request.Request(base + path), timeout=10).read())['commit']
        except Exception:
            version[path] = None  # probe failed: reported as unavailable, not as a different commit
    return version


def github_pulls(sha):
    out = subprocess.run(['gh', 'api', 'repos/' + os.environ['GITHUB_REPOSITORY'] + '/commits/' + sha + '/pulls'],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def notify(env, github=github_pulls, http=urllib.request.urlopen, root=ROOT):
    """Always 0: the notice must never change the result of a deploy that already happened."""
    token = env.get('MULTICA_TOKEN', '')
    if not token:
        print('MULTICA_TOKEN ausente: sem aviso ao card.')
        return 0
    try:
        sha = env['SHA']
        prs = github(sha)
        found = delivery_of(prs)
        if not found:
            named = sorted({m.group(1) for pr in prs for m in [DELIVERY_LINE.search(pr.get('body') or '')] if m})
            print('Commit ' + sha + ' sem PR com uma única linha Aponta-Delivery (' + str(len(prs)) + ' PR, entregas: '
                  + (', '.join(named) or 'nenhuma') + '): sem aviso ao card.')
            return 0
        delivery, pr = found
        try:
            parent = parent_of(root, Path(root) / '.delivery/registry.json', delivery)
        except (OSError, KeyError, ValueError):
            print(delivery + ' sem manifest nem registro no commit ' + sha + ': sem aviso ao card.')
            return 0
        ok, label = outcome(env['STAGING_RESULT'], env['PRODUCTION_RESULT'])
        run_url = '/'.join([env['GITHUB_SERVER_URL'], env['GITHUB_REPOSITORY'], 'actions/runs', env['GITHUB_RUN_ID']])
        version = production_version(env.get('PRODUCTION_URL', PRODUCTION), http) if ok else None
        request = urllib.request.Request(
            env.get('MULTICA_SERVER_URL', SERVER) + '/api/issues/' + parent + '/comments',
            data=json.dumps({'content': build_body(label, sha, pr, run_url, version)}).encode(), method='POST',
            headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json',
                     'X-Workspace-ID': env.get('MULTICA_WORKSPACE_ID', WORKSPACE)})
        http(request, timeout=20).read()
        print('Aviso publicado no card de ' + delivery + ' (' + label + ').')
    except Exception as error:
        print('Aviso ao Multica falhou (' + type(error).__name__ + '): ' + str(error).replace(token, '***'))
    return 0


if __name__ == '__main__':
    raise SystemExit(notify(os.environ))

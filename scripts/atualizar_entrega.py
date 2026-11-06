#!/usr/bin/env python3
"""Atualiza a branch de uma entrega com a main: base_sha novo e GREEN regravado.

Uso: python3 scripts/atualizar_entrega.py DMTE-N [--main origin/main]

Com `strict` na main o PR precisa conter a main atual. Este script faz o merge da main,
aponta o base_sha do manifest para a main, regrava o GREEN contra essa base, roda o
verificador e cria um commit. Não faz push. O commit muda o SHA da entrega, então ela
volta ao QA independente.
"""
import argparse
import json
from pathlib import Path
import subprocess
import sys

import aponta_delivery as delivery


class AtualizacaoError(Exception):
    pass


def git(root: Path, *args: str) -> str:
    return delivery.git(root, *args)


def atualizar(root, delivery_id, main_ref='origin/main', verificar=True):
    root = Path(root)
    if git(root, 'status', '--porcelain'):
        raise AtualizacaoError('Working tree has uncommitted changes; commit or discard them first.')
    branch = git(root, 'rev-parse', '--abbrev-ref', 'HEAD')
    if branch in ('main', 'HEAD'):
        raise AtualizacaoError('Run this on the delivery branch, not on main or a detached HEAD.')
    manifest_path = root / '.delivery/deliveries' / (delivery_id + '.json')
    manifest = json.loads(manifest_path.read_text())
    green_path = root / manifest['tdd']['green']
    green = json.loads(green_path.read_text())
    main_sha = git(root, 'rev-parse', main_ref)
    if subprocess.run(['git', '-C', str(root), 'merge-base', '--is-ancestor', main_sha, 'HEAD']).returncode == 0:
        return {'status': 'atual', 'base_sha': manifest.get('base_sha')}
    merged = subprocess.run(['git', '-C', str(root), 'merge', '--no-edit', main_sha], capture_output=True, text=True)
    if merged.returncode != 0:
        subprocess.run(['git', '-C', str(root), 'merge', '--abort'], capture_output=True)
        raise AtualizacaoError('Merge with main has conflicts; resolve them by hand. Merge aborted.')
    manifest['base_sha'] = main_sha
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    delivery.capture(root, green_path, 'green', main_sha, green['command'], list(green['tests']), green['criteria'])
    if json.loads(green_path.read_text())['exit_code'] != 0:
        raise AtualizacaoError('GREEN failed against the new base; fix the code before updating the delivery. '
                               'The merge is applied but not committed as an update: `git reset --hard ORIG_HEAD` undoes it.')
    if verificar:
        checked = subprocess.run([sys.executable, '-B', str(Path(__file__).with_name('aponta_delivery.py')),
                                  '--root', str(root), 'check', '--manifest', str(manifest_path.relative_to(root))],
                                 capture_output=True, text=True)
        if checked.returncode != 0:
            raise AtualizacaoError('Delivery check failed after the update (`git reset --hard ORIG_HEAD` undoes the merge):\n'
                                   + checked.stderr + checked.stdout)
    git(root, 'add', '-A')
    git(root, 'commit', '-q', '-m', f'chore(delivery): atualiza {delivery_id} com a main (base_sha e GREEN)')
    return {'status': 'atualizada', 'base_sha': main_sha, 'head': git(root, 'rev-parse', 'HEAD')}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('delivery')
    parser.add_argument('--main', default='origin/main')
    parser.add_argument('--root', type=Path, default=Path.cwd())
    args = parser.parse_args(argv)
    try:
        result = atualizar(args.root, args.delivery, args.main)
    except (AtualizacaoError, subprocess.CalledProcessError, KeyError, OSError, ValueError) as error:
        print('ERROR: ' + str(error), file=sys.stderr)
        return 1
    print(json.dumps(result))
    if result['status'] == 'atualizada':
        print('SHA novo: peça nova revisão do QA e faça o push da branch.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

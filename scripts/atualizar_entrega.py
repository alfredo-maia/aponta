#!/usr/bin/env python3
"""Atualiza a branch de uma entrega com a main: base_sha novo e GREEN regravado.

Uso: python3 scripts/atualizar_entrega.py DMTE-N [--main origin/main]

Com `strict` na main o PR precisa conter a main atual. Este script faz o merge da main,
aponta o base_sha do manifest para a main, regrava o GREEN contra essa base, roda o
verificador e cria um commit. Se algo falhar depois do merge, volta ao HEAD anterior. Não faz
push. O commit muda o SHA da entrega, então ela volta ao QA independente. Rode-o dentro de
`scripts/aponta_delivery.py with-lock -- python3 scripts/atualizar_entrega.py DMTE-N`.
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


def desfazer(root: Path, head_antes: str, escritos: dict) -> None:
    """Desfaz o que o script fez sem tocar em edições de terceiros.

    Restaura os bytes dos três arquivos que o próprio script escreve e volta o HEAD com
    `reset --keep`, que se recusa a seguir se houver edição local em arquivo que o merge mudou.
    Nunca usa `reset --hard` nem `clean`: a árvore pode ter sido editada durante a execução.
    """
    for caminho, conteudo in escritos.items():
        if conteudo is None:
            caminho.unlink(missing_ok=True)
        else:
            caminho.write_bytes(conteudo)
    subprocess.run(['git', '-C', str(root), 'reset', '-q', '--', *[c.relative_to(root).as_posix() for c in escritos]],
                   capture_output=True)  # unstage only what this script staged
    voltou = subprocess.run(['git', '-C', str(root), 'reset', '--keep', head_antes], capture_output=True, text=True)
    if voltou.returncode != 0:
        raise AtualizacaoError('Could not restore the previous HEAD without overwriting local edits made during the run; '
                               'the merge commit stays in place. Review `git status`, then run '
                               f'`git reset --keep {head_antes}` yourself.\n' + voltou.stderr)


def atualizar(root, delivery_id, main_ref='origin/main', verificar=True):
    root = Path(root)
    if git(root, 'status', '--porcelain'):
        raise AtualizacaoError('Working tree has uncommitted changes; commit or discard them first.')
    branch = git(root, 'rev-parse', '--abbrev-ref', 'HEAD')
    if branch in ('main', 'HEAD', main_ref.split('/')[-1]):
        raise AtualizacaoError('Run this on the delivery branch, not on main or a detached HEAD.')
    if main_ref.startswith('origin/'):
        subprocess.run(['git', '-C', str(root), 'fetch', '-q', 'origin', main_ref.split('/', 1)[1]], capture_output=True)
    main_sha = git(root, 'rev-parse', main_ref)
    if subprocess.run(['git', '-C', str(root), 'merge-base', '--is-ancestor', main_sha, 'HEAD']).returncode == 0:
        return {'status': 'atual', 'base_sha': main_sha}
    manifest_path = root / '.delivery/deliveries' / (delivery_id + '.json')
    manifest = json.loads(manifest_path.read_text())
    green_path = root / manifest['tdd']['green']
    green = json.loads(green_path.read_text())
    head_antes = git(root, 'rev-parse', 'HEAD')
    merged = subprocess.run(['git', '-C', str(root), 'merge', '--no-edit', main_sha], capture_output=True, text=True)
    if merged.returncode != 0:
        subprocess.run(['git', '-C', str(root), 'merge', '--abort'], capture_output=True)
        raise AtualizacaoError('Merge with main has conflicts; resolve them by hand. Merge aborted.')
    log_path = green_path.with_suffix('.log')
    escritos = {p: (p.read_bytes() if p.exists() else None) for p in (manifest_path, green_path, log_path)}
    try:
        manifest['base_sha'] = main_sha
        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
        recorded = delivery.capture(root, green_path, 'green', main_sha, green['command'], list(green['tests']), green['criteria'])
        if recorded['exit_code'] != 0:
            raise AtualizacaoError('GREEN failed against the new base; the branch was restored to its previous HEAD.')
        if verificar:
            checked = subprocess.run([sys.executable, '-B', str(Path(__file__).with_name('aponta_delivery.py')),
                                      '--root', str(root), 'check', '--manifest', str(manifest_path.relative_to(root))],
                                     capture_output=True, text=True)
            if checked.returncode != 0:
                raise AtualizacaoError('Delivery check failed after the update; the branch was restored to its previous HEAD:\n'
                                       + checked.stderr + checked.stdout)
        paths = [manifest_path, green_path, log_path]
        git(root, 'add', '--', *[p.relative_to(root).as_posix() for p in paths])
        git(root, 'commit', '-q', '-m', f'chore(delivery): atualiza {delivery_id} com a main (base_sha e GREEN)')
    except BaseException:
        desfazer(root, head_antes, escritos)
        raise
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
        print('SHA novo: a entrega volta ao QA independente.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

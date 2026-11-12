#!/usr/bin/env python3
"""Reprova `<select>` nativo em TSX de produto fora do EzSelect (DMTE-490).

A lista aberta do `<select>` nativo é desenhada pelo navegador e não é
estilizável; o Aponta usa o EzSelect (apps/web/src/components/ds/EzSelect.tsx),
que mantém um `<select>` escondido como controle de formulário.
"""
import re
import sys
from pathlib import Path

NATIVE_SELECT_RE = re.compile(r'<select\b')
EXCLUDE_SUFFIXES = ('.test.tsx', '.stories.tsx')
# O único lugar onde o `<select>` nativo pode existir: o controle escondido do próprio EzSelect.
ALLOWED = 'EzSelect.tsx'


COMMENT_RE = re.compile(r'/\*.*?\*/|(?<!:)//[^\n]*', re.S)


def find_violations(text: str) -> list[str]:
    # Comentário que cita `<select>` (ex.: no EzPopover) não é uso.
    code = COMMENT_RE.sub('', text)
    return ['<select> nativo: use EzSelect' for _ in NATIVE_SELECT_RE.finditer(code)]


def find_files(root: Path) -> list[Path]:
    return sorted(
        path for path in (root / 'apps/web/src').rglob('*.tsx')
        if path.name != ALLOWED and not path.name.endswith(EXCLUDE_SUFFIXES)
    )


def main(argv: list[str]) -> int:
    root = Path(argv[1]) if len(argv) > 1 else Path.cwd()
    had_violation = False
    for path in find_files(root):
        for violation in find_violations(path.read_text(encoding='utf-8')):
            had_violation = True
            print(f'{path}: {violation}')
    if had_violation:
        print('FALHA: <select> nativo fora do EzSelect (AC-15, DMTE-490).')
        return 1
    print('OK: nenhum <select> nativo fora do EzSelect (AC-15, DMTE-490).')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))

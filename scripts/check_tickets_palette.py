#!/usr/bin/env python3
import re
import sys
from pathlib import Path

from tickets_scope import find_tickets_files

HEX_RE = re.compile(r'#[0-9A-Fa-f]{3,8}\b')
NAMED_OFF_DS_RE = re.compile(r'\b(?:teal|emerald|rose)-[0-9]+\b')
GRAY_RE = re.compile(r'\bgray-([0-9]+)\b')
DS_GRAY_DEGREES = {'70', '80', '90', '100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'}


def find_violations(text: str) -> list[str]:
    violations = []
    for match in HEX_RE.finditer(text):
        violations.append(f'hex literal fora do DS: {match.group(0)}')
    for match in NAMED_OFF_DS_RE.finditer(text):
        violations.append(f'classe de paleta fora do DS: {match.group(0)}')
    for match in GRAY_RE.finditer(text):
        if match.group(1) not in DS_GRAY_DEGREES:
            violations.append(f'grau de gray fora do DS: {match.group(0)}')
    return violations


def main(argv: list[str]) -> int:
    root = Path(argv[1]) if len(argv) > 1 else Path.cwd()
    had_violation = False
    for path in find_tickets_files(root):
        text = path.read_text(encoding='utf-8')
        for violation in find_violations(text):
            had_violation = True
            print(f'{path}: {violation}')
    if had_violation:
        print('FALHA: paleta fora do DS ou hex literal na aba Tickets (AC-01, DMTE-427).')
        return 1
    print('OK: nenhum hex literal ou classe de paleta fora do DS na aba Tickets (AC-01, DMTE-427).')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))

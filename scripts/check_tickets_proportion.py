#!/usr/bin/env python3
import re
import sys
from pathlib import Path

from tickets_scope import find_tickets_files

# D6 (ADR 0001, DMTE-427 fatia 1): única escala de altura de controle.
CONTROL_HEIGHT_RANGE = (24, 48)
ALLOWED_CONTROL_HEIGHTS = {32, 42}
HEIGHT_RE = re.compile(r'\bh-\[(\d+)px\]')


def find_violations(text: str) -> list[str]:
    violations = []
    low, high = CONTROL_HEIGHT_RANGE
    for match in HEIGHT_RE.finditer(text):
        value = int(match.group(1))
        if low <= value <= high and value not in ALLOWED_CONTROL_HEIGHTS:
            violations.append(f'altura de controle fora da escala D6: {match.group(0)}')
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
        print('FALHA: altura de controle ad hoc fora da escala D6 na aba Tickets (AC-02, DMTE-427).')
        return 1
    print('OK: alturas de controle seguem a escala D6 na aba Tickets (AC-02, DMTE-427).')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))

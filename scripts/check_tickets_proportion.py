#!/usr/bin/env python3
import re
import sys
from pathlib import Path

from tickets_scope import find_tickets_files, run_check

# D6 (ADR 0001, DMTE-427 fatia 1): única escala de altura de controle.
CONTROL_HEIGHT_RANGE = (24, 48)
ALLOWED_CONTROL_HEIGHTS = {32, 42}
HEIGHT_RE = re.compile(r'\bh-\[(\d+)px\]')
TOKEN_HEIGHT_RE = re.compile(r'h-\[var\(--control-height-')
RADIUS_RE = re.compile(r'\brounded-\[\d+px\]')


def find_violations(text: str) -> list[str]:
    violations = []
    low, high = CONTROL_HEIGHT_RANGE
    for match in HEIGHT_RE.finditer(text):
        value = int(match.group(1))
        if low <= value <= high and value not in ALLOWED_CONTROL_HEIGHTS:
            violations.append(f'altura de controle fora da escala D6: {match.group(0)}')
    # shortcut: só pega raio arbitrário na mesma linha do token de altura (className quebrado em várias linhas escapa) e não cobre raio fora de controles; ampliar nas fatias seguintes.
    for line in text.splitlines():
        if TOKEN_HEIGHT_RE.search(line):
            for match in RADIUS_RE.finditer(line):
                violations.append(f'raio de controle fora da escala D6 (use rounded-control): {match.group(0)}')
    return violations


def main(argv: list[str]) -> int:
    root = Path(argv[1]) if len(argv) > 1 else Path.cwd()
    return run_check(
        root,
        find_violations,
        ok_message='OK: alturas de controle seguem a escala D6 na aba Tickets (AC-02, DMTE-427).',
        fail_message='FALHA: altura de controle ad hoc fora da escala D6 na aba Tickets (AC-02, DMTE-427).',
    )


if __name__ == '__main__':
    sys.exit(main(sys.argv))

#!/usr/bin/env python3
"""Shared file scope for the aba Tickets static checks (DMTE-427 fatia 1)."""
from pathlib import Path

TICKETS_GLOBS = [
    'apps/web/src/pages/Ticket*.tsx',
    'apps/web/src/pages/CreateTicketPage.tsx',
    'apps/web/src/components/tickets/*.tsx',
]
EXCLUDE_SUFFIXES = ('.test.tsx', '.stories.tsx')


def find_tickets_files(root: Path) -> list[Path]:
    files: set[Path] = set()
    for pattern in TICKETS_GLOBS:
        for path in root.glob(pattern):
            if path.name.endswith(EXCLUDE_SUFFIXES):
                continue
            files.add(path)
    return sorted(files)


def run_check(root: Path, find_violations, *, ok_message: str, fail_message: str) -> int:
    """Runs find_violations(text) over every file in scope and prints/returns
    the pass/fail result. Shared by check_tickets_palette.py and
    check_tickets_proportion.py so their CLI scaffolding doesn't diverge."""
    had_violation = False
    for path in find_tickets_files(root):
        text = path.read_text(encoding='utf-8')
        for violation in find_violations(text):
            had_violation = True
            print(f'{path}: {violation}')
    if had_violation:
        print(fail_message)
        return 1
    print(ok_message)
    return 0

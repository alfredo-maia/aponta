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

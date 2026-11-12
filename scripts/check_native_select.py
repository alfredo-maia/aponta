#!/usr/bin/env python3
"""Stub neutro (DMTE-490 T3): a implementação entra depois do RED."""
import sys
from pathlib import Path


def find_violations(text: str) -> list[str]:
    return []


def find_files(root: Path) -> list[Path]:
    return []


def main(argv: list[str]) -> int:
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))

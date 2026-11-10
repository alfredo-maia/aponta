#!/usr/bin/env python3
"""Staging -> production release tool for Aponta (Python standard library)."""
from __future__ import annotations

from pathlib import Path


def promotion_errors(record, sha, images) -> list[str]:
    return []


def ordering_errors(root: Path, deployed, sha, rollback: bool = False) -> list[str]:
    return []


def env_values(text: str) -> dict:
    return {}


def new_staging_env() -> str:
    return ''


def compose_command(environment, sha, home: Path, config: Path) -> list[str]:
    return ['-p', '']


def smoke(sha, fetch) -> list[dict]:
    return []


def save_record(home: Path, record: dict) -> None:
    return None


def load_record(home: Path, sha: str):
    return {'images': {}}

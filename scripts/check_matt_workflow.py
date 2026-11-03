"""Verify pinned native Matt files and role dependency closure without credentials."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sys


def validate_workflow(root: Path) -> list[str]:
    errors = []
    manifest_path = root / 'docs/agents/matt-workflow.json'
    try:
        manifest = json.loads(manifest_path.read_text())
        skills = manifest['skills']
        roles = manifest['roles']
        dependencies = manifest['dependencies']
        for name, skill in skills.items():
            folder = (root / '.agents/skills' / name).resolve()
            for item in skill['files']:
                path = (folder / item['local_path']).resolve()
                if not path.is_relative_to(folder) or not path.is_file():
                    errors.append(f'{name}: missing/unsafe source {item["local_path"]}')
                elif hashlib.sha256(path.read_bytes()).hexdigest() != item['sha256']:
                    errors.append(f'{name}: upstream hash mismatch: {item["local_path"]}')
        for role, names in roles.items():
            assigned = set(names)
            for name in assigned:
                if name not in skills:
                    errors.append(f'{role}: unknown native skill {name}')
                for dependency in dependencies.get(name, []):
                    if dependency not in assigned:
                        errors.append(f'{role}: {name} requires {dependency}')
            retired = assigned.intersection(manifest['retired_assignments'])
            if retired:
                errors.append(f'{role}: retired method still assigned: {sorted(retired)}')
    except (OSError, ValueError, KeyError, TypeError) as error:
        errors.append(f'Invalid Matt workflow manifest: {error}')
    return errors


if __name__ == '__main__':
    errors = validate_workflow(Path.cwd())
    for error in errors:
        print(error)
    if not errors:
        print('Matt upstream files and per-role dependencies verified.')
    sys.exit(bool(errors))

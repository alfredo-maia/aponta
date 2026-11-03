"""Check self-contained skill references and pinned source integrity."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re


def bundled_path(folder: Path, name: str) -> Path:
    path = (folder / name).resolve()
    if Path(name).is_absolute() or not path.is_relative_to(folder.resolve()):
        raise ValueError('reference escapes bundle: ' + name)
    return path


def validate_bundle(folder):
    folder = Path(folder)
    errors = []
    try:
        content = (folder / 'SKILL.md').read_text()
    except (OSError, UnicodeError) as error:
        return ['Cannot read SKILL.md: ' + str(error)]
    # Examples are illustrations, not necessarily delivered files.
    content = re.sub(r'(?ms)^\s*(```|~~~)[^\n]*\n.*?^\s*\1[^\n]*(?:\n|$)', '', content)
    references = set()
    for target in re.findall(r'\]\(([^)]+)\)', content):
        target = target.split('#', 1)[0].strip('<>')
        if not target or re.match(r'[a-z][a-z0-9+.-]*:', target, re.I):
            continue
        if Path(target).suffix:
            references.add(target)
    for inline in re.findall(r'`([^`\n]+)`', content):
        references.update(re.findall(r'(?:references|scripts|assets)/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+', inline))
    for name in sorted(references):
        try:
            if not bundled_path(folder, name).is_file():
                errors.append('Missing bundled reference: ' + name)
        except ValueError as error:
            errors.append(str(error))
    source = folder / 'SOURCE.json'
    if source.exists():
        try:
            manifest = json.loads(source.read_text())
            for item in manifest['files']:
                name = item['local_path']
                path = bundled_path(folder, name)
                if not path.is_file():
                    errors.append('Missing pinned source: ' + name)
                elif hashlib.sha256(path.read_bytes()).hexdigest() != item['sha256']:
                    errors.append('Pinned source hash mismatch: ' + name)
        except (OSError, UnicodeError, ValueError, KeyError, TypeError) as error:
            errors.append('Invalid source manifest: ' + str(error))
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folders', nargs='*', type=Path)
    args = parser.parse_args()
    # Project profiles can deliberately point at repository tools/docs. This
    # check targets reusable methods, not those repository-scoped contracts.
    folders = args.folders or sorted(
        path for path in Path('.agents/skills').glob('*/SKILL.md')
        if not path.parent.name.startswith('aponta-')
    )
    if not folders:
        print('No reusable skill bundles found; verification requires an existing collection.')
        return True
    errors = []
    for folder in folders:
        if folder.name == 'SKILL.md':
            folder = folder.parent
        errors.extend(str(folder) + ': ' + error for error in validate_bundle(folder))
    if not args.folders and Path('docs/agents/matt-workflow.json').exists():
        from check_matt_workflow import validate_workflow
        errors.extend(validate_workflow(Path.cwd()))
    for error in errors:
        print(error)
    if not errors:
        print(f'{len(folders)} skill bundles: references and pinned sources verified.')
    return bool(errors)


if __name__ == '__main__':
    raise SystemExit(main())

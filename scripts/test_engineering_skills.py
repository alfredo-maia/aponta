import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import subprocess
import sys

from check_engineering_skills import validate_bundle


class SkillBundleTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'skill'
        self.root.mkdir()

    def skill(self, body):
        (self.root / 'SKILL.md').write_text('---\nname: example\ndescription: Example\n---\n' + body)

    def test_missing_reference_is_reported(self):
        self.skill('Read [the contract](references/contract.md).')
        self.assertTrue(any('references/contract.md' in e for e in validate_bundle(self.root)))

    def test_missing_script_in_inline_code_is_reported(self):
        self.skill('Run `scripts/reproduce.sh` when reproducing the failure.')
        self.assertTrue(any('scripts/reproduce.sh' in e for e in validate_bundle(self.root)))

    def test_existing_reference_and_anchor_are_valid(self):
        self.skill('Read [contract](references/contract.md#cases).')
        (self.root / 'references').mkdir()
        (self.root / 'references/contract.md').write_text('# Cases\nReal reference')
        self.assertEqual([], validate_bundle(self.root))

    def test_pinned_reference_cannot_silently_change(self):
        self.skill('Read [source](source.md).')
        (self.root / 'source.md').write_text('changed source')
        (self.root / 'SOURCE.json').write_text(json.dumps({'files': [{
            'local_path': 'source.md', 'sha256': hashlib.sha256(b'original source').hexdigest()
        }]}))
        self.assertTrue(any('hash' in e.lower() for e in validate_bundle(self.root)))

    def test_existing_file_outside_bundle_is_not_a_bundled_reference(self):
        (self.root.parent / 'external.md').write_text('not delivered with the bundle')
        self.skill('Read [contract](../external.md).')
        self.assertTrue(any('escape' in e.lower() for e in validate_bundle(self.root)))

    def test_fenced_examples_do_not_require_illustrative_files(self):
        self.skill('```markdown\nRead [example](references/example.md)\n```\nUse [web](https://example.org/docs).')
        self.assertEqual([], validate_bundle(self.root))

    def test_cli_cannot_report_success_when_no_bundle_was_found(self):
        command = [sys.executable, str(Path(__file__).with_name('check_engineering_skills.py').resolve())]
        result = subprocess.run(command, cwd=self.temp.name, capture_output=True, text=True)
        self.assertNotEqual(0, result.returncode, 'An absent skill collection must not pass verification.')


if __name__ == '__main__':
    unittest.main()

import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from check_matt_workflow import validate_workflow


class MattWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'docs/agents').mkdir(parents=True)
        self.source = self.root / '.agents/skills/implement/SKILL.md'
        self.source.parent.mkdir(parents=True)
        self.source.write_text('original pinned source')
        self.manifest = {
            'skills': {'implement': {'files': [{
                'local_path': 'SKILL.md',
                'sha256': hashlib.sha256(self.source.read_bytes()).hexdigest(),
            }]}, 'tdd': {'files': []}},
            'roles': {'developer': ['implement', 'tdd']},
            'dependencies': {'implement': ['tdd']},
            'retired_assignments': ['engineering-specification'],
        }

    def check(self):
        (self.root / 'docs/agents/matt-workflow.json').write_text(json.dumps(self.manifest))
        return validate_workflow(self.root)

    def test_valid_role_and_sources_pass(self):
        self.assertEqual([], self.check())

    def test_missing_role_dependency_fails(self):
        self.manifest['roles']['developer'].remove('tdd')
        self.assertTrue(any('requires tdd' in e for e in self.check()))

    def test_modified_upstream_reference_fails(self):
        self.source.write_text('silently edited')
        self.assertTrue(any('hash mismatch' in e for e in self.check()))

    def test_source_cannot_escape_bundle(self):
        self.manifest['skills']['implement']['files'][0]['local_path'] = '../../../../outside.md'
        self.assertTrue(any('unsafe source' in e for e in self.check()))


if __name__ == '__main__':
    unittest.main()

"""Behavioral tests for the delivery contract and evidence handling."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import aponta_delivery as delivery


class DeliveryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.manifest = {
            'version': 1, 'delivery': 'DMTE-159', 'repository': 'alfredo-maia/aponta',
            'github_issue': 92, 'multica_id': '01a17485-8de1-7e6d-950a-1e295fef336b',
            'cycle': '2026-10-26/2026-11-08', 'tier': 2,
            'criteria': [{'id': 'AC-01', 'description': 'Reject invalid inputs', 'tests': ['test_gate']}],
            'spec': 'docs/spec.md', 'changed_files': ['scripts/tool.py'],
            'tdd': {'mode': 'required', 'red': '.delivery/red.json', 'green': '.delivery/green.json'},
            'design_system': {'applicable': False, 'reason': 'Python CLI; no UI'},
        }
        (self.root / 'docs').mkdir()
        (self.root / 'docs/spec.md').write_text('AC-01: Reject invalid inputs')

    def check(self, manifest=None):
        return delivery.validate_manifest(self.root, manifest or self.manifest, check_evidence=False)

    def test_valid_identity(self):
        self.assertEqual(self.check(), [])

    def test_invalid_uuid_rejected(self):
        self.manifest['multica_id'] = 'not-a-uuid'
        self.assertTrue(self.check())

    def test_foreign_repository_rejected(self):
        self.manifest['repository'] = 'someone/another-project'
        self.assertTrue(self.check())

    def test_tier_two_requires_spec(self):
        self.manifest['spec'] = None
        self.assertTrue(self.check())

    def test_spec_cannot_escape_checkout(self):
        self.manifest['spec'] = '../outside.md'
        self.assertTrue(self.check())

    def test_criteria_require_tests(self):
        self.manifest['criteria'][0]['tests'] = []
        self.assertTrue(self.check())

    def test_criteria_must_exist_in_spec(self):
        (self.root / 'docs/spec.md').write_text('Unrelated document')
        self.assertTrue(self.check())

    def test_setup_failure_is_not_red(self):
        self.assertFalse(delivery.behavioral_red('FAILED (errors=1)\nModuleNotFoundError: x', 1))

    def test_setup_failure_cannot_hide_behind_assertion(self):
        self.assertFalse(delivery.behavioral_red('AssertionError\nImportError: x\nFAILED', 1))

    def test_behavioral_failure_is_red(self):
        self.assertTrue(delivery.behavioral_red('AssertionError: ola != OLA\nFAILED (failures=1)', 1))

    def test_passing_test_is_not_red(self):
        self.assertFalse(delivery.behavioral_red('AssertionError\nFAILED', 0))

    def test_arbitrary_error_is_not_red(self):
        self.assertFalse(delivery.behavioral_red('Network unavailable', 1))

    def test_duplicate_canonical_github_identity_rejected(self):
        entries = {'DMTE-159': self.manifest, 'DMTE-160': {**self.manifest, 'delivery': 'DMTE-160'}}
        self.assertTrue(delivery.validate_registry({'version': 1, 'deliveries': entries}))

    def test_manifest_cannot_use_epic_as_delivery(self):
        entry = {**self.manifest, 'kind': 'epic'}
        self.assertTrue(delivery.validate_binding(self.manifest, entry))

    def test_manifest_tier_must_match_registry(self):
        entry = {**self.manifest, 'kind': 'delivery', 'tier': 3}
        self.assertTrue(delivery.validate_binding(self.manifest, entry))

    def test_manifest_cycle_must_match_registry(self):
        entry = {**self.manifest, 'kind': 'delivery', 'cycle': None}
        self.assertTrue(delivery.validate_binding(self.manifest, entry))

    def test_manifest_canonical_binding_passes(self):
        self.assertEqual(delivery.validate_binding(self.manifest, {**self.manifest, 'kind': 'delivery'}), [])

    def test_pr_link_contract(self):
        self.assertEqual(delivery.validate_pr('Aponta-Delivery: DMTE-159\nRefs alfredo-maia/aponta#92', self.manifest), [])

    def test_pr_cannot_close_issue_before_delivery(self):
        self.assertTrue(delivery.validate_pr('Aponta-Delivery: DMTE-159\nCloses #92', self.manifest))

    def test_pr_cannot_reference_different_primary(self):
        self.assertTrue(delivery.validate_pr('Aponta-Delivery: DMTE-160\nRefs #93', self.manifest))

    def test_new_ds_component_requires_story(self):
        self.manifest['changed_files'] = ['apps/web/src/components/ds/NewWidget.tsx']
        self.manifest['design_system'] = {'applicable': True, 'reused': [], 'stories': []}
        self.assertTrue(self.check())

    def test_ui_requires_ds_assessment(self):
        self.manifest['changed_files'] = ['apps/web/src/pages/Home.tsx']
        self.assertTrue(self.check())

    def test_irrelevant_ui_exemption_needs_reason(self):
        self.manifest['changed_files'] = ['apps/web/src/pages/Home.tsx']
        self.manifest['design_system'] = {'applicable': True, 'exception': ''}
        self.assertTrue(self.check())

    def test_production_behavior_cannot_silently_skip_tdd(self):
        self.manifest['changed_files'] = ['apps/api/src/example.service.ts']
        self.manifest['tdd'] = {'mode': 'not-applicable', 'reason': 'Convenient'}
        self.assertTrue(self.check())

    def test_secret_redaction(self):
        with patch.dict(os.environ, {'APPOINT_TEST_TOKEN': 'private-test-value-123'}):
            self.assertNotIn('private-test-value-123', delivery.redact('value=private-test-value-123'))

    def evidence_pair(self):
        (self.root / '.delivery').mkdir(exist_ok=True)
        (self.root / 'test.py').write_text('assert True')
        test_hash = hashlib.sha256((self.root / 'test.py').read_bytes()).hexdigest()
        for phase in ['red', 'green']:
            output = 'AssertionError: expected\nFAILED (failures=1)' if phase == 'red' else 'OK'
            (self.root / '.delivery' / (phase + '.log')).write_text(output)
            data = {'version': 1, 'phase': phase, 'base_sha': 'abc', 'command': ['python3', '-m', 'unittest'],
                    'started_at': '2026-10-25T10:00:00+00:00' if phase == 'red' else '2026-10-25T10:01:00+00:00',
                    'finished_at': '2026-10-25T10:00:01+00:00' if phase == 'red' else '2026-10-25T10:01:01+00:00',
                    'exit_code': 1 if phase == 'red' else 0, 'tests': {'test.py': test_hash},
                    'criteria': ['AC-01'], 'source_hashes': {'app.py': 'green' if phase == 'green' else 'red'},
                    'log': '.delivery/' + phase + '.log', 'log_sha256': hashlib.sha256(output.encode()).hexdigest()}
            (self.root / '.delivery' / (phase + '.json')).write_text(json.dumps(data))
        return {'red': '.delivery/red.json', 'green': '.delivery/green.json'}

    def change_evidence(self, phase, **values):
        path = self.root / '.delivery' / (phase + '.json')
        data = json.loads(path.read_text());data.update(values);path.write_text(json.dumps(data))

    def test_valid_evidence_pair(self):
        pair = self.evidence_pair()
        self.assertEqual(delivery.validate_evidence(self.root, pair, {'AC-01'}, 'abc', {'app.py': 'green'}), [])

    def test_tampered_log_rejected(self):
        pair = self.evidence_pair()
        (self.root / '.delivery/red.log').write_text('changed')
        self.assertTrue(delivery.validate_evidence(self.root, pair, {'AC-01'}, 'abc', {'app.py': 'green'}))

    def test_green_for_other_source_rejected(self):
        pair = self.evidence_pair()
        self.assertTrue(delivery.validate_evidence(self.root, pair, {'AC-01'}, 'abc', {'app.py': 'different'}))

    def test_mismatched_command_rejected(self):
        pair = self.evidence_pair();self.change_evidence('green', command=['echo', 'OK'])
        self.assertTrue(delivery.validate_evidence(self.root, pair, {'AC-01'}, 'abc', {'app.py': 'green'}))

    def test_reversed_time_rejected(self):
        pair = self.evidence_pair();self.change_evidence('green', started_at='2026-10-25T09:59:00+00:00')
        self.assertTrue(delivery.validate_evidence(self.root, pair, {'AC-01'}, 'abc', {'app.py': 'green'}))

    def test_missing_acceptance_coverage_rejected(self):
        pair = self.evidence_pair()
        self.assertTrue(delivery.validate_evidence(self.root, pair, {'AC-01', 'AC-02'}, 'abc', {'app.py': 'green'}))

    def test_writer_lock_rejects_competing_process(self):
        path = self.root / 'writer.lock'
        program = ('import sys; from pathlib import Path; sys.path.insert(0,sys.argv[1]); '
                   'from aponta_delivery import writer_lock; '
                   '\nwith writer_lock(Path(sys.argv[2])): pass')
        with delivery.writer_lock(path):
            process = subprocess.run([sys.executable, '-c', program, str(Path(delivery.__file__).parent), str(path)], capture_output=True)
        self.assertNotEqual(process.returncode, 0)
        with delivery.writer_lock(path):
            pass


if __name__ == '__main__':
    unittest.main()

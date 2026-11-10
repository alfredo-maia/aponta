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
            'version': 1, 'delivery': 'DMTE-159', 'repository': delivery.CANONICAL_REPOSITORY,
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

    def test_cycle_is_computed_from_the_fortnight_anchor(self):
        day = delivery.dt.date
        self.assertEqual(delivery.cycle_for(day(2026, 10, 26)), '2026-10-26/2026-11-08')
        self.assertEqual(delivery.cycle_for(day(2026, 11, 3)), '2026-10-26/2026-11-08')
        self.assertEqual(delivery.cycle_for(day(2026, 11, 8)), '2026-10-26/2026-11-08')
        self.assertEqual(delivery.cycle_for(day(2026, 11, 9)), '2026-11-09/2026-11-22')
        self.assertEqual(delivery.cycle_for(day(2027, 1, 4)), '2027-01-04/2027-01-17')

    def test_registry_accepts_aligned_or_absent_cycle(self):
        entries = {'DMTE-159': self.manifest,
                   'DMTE-160': {**self.manifest, 'delivery': 'DMTE-160', 'github_issue': 93,
                                'multica_id': '01a17485-8de1-7e6d-950a-1e295fef3360', 'cycle': None},
                   'DMTE-161': {**self.manifest, 'delivery': 'DMTE-161', 'github_issue': 94,
                                'multica_id': '01a17485-8de1-7e6d-950a-1e295fef3361', 'cycle': '2026-11-09/2026-11-22'}}
        self.assertEqual(delivery.validate_registry({'version': 1, 'deliveries': entries}), [])

    def test_registry_rejects_cycle_outside_the_automatic_cadence(self):
        for bad in ['2026-11-01/2026-11-14', '2026-11-09/2026-11-23', 'ciclo 02', 3]:
            entry = {**self.manifest, 'cycle': bad}
            self.assertTrue(delivery.validate_registry({'version': 1, 'deliveries': {'DMTE-159': entry}}), bad)

    def test_cycle_command_prints_the_cycle_for_a_date(self):
        script = Path(delivery.__file__)
        out = subprocess.run([sys.executable, str(script), 'cycle', '--date', '2026-11-09'],
                             capture_output=True, text=True)
        self.assertEqual((out.returncode, out.stdout.strip()), (0, '2026-11-09/2026-11-22'))

    def test_manifest_canonical_binding_passes(self):
        self.assertEqual(delivery.validate_binding(self.manifest, {**self.manifest, 'kind': 'delivery'}), [])

    def test_pr_link_contract(self):
        self.assertEqual(delivery.validate_pr('Aponta-Delivery: DMTE-159\nRefs ' + delivery.CANONICAL_REPOSITORY + '#92', self.manifest), [])

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

    def legacy_manifest(self):
        self.manifest['tdd'] = {
            'mode': 'legacy-exception', 'exception': '.delivery/exception.json',
            'red': '.delivery/red.json', 'green': '.delivery/green.json',
        }
        record = {
            'version': 1, 'delivery': 'DMTE-159', 'github_issue': 92,
            'base_sha': 'a' * 40, 'legacy_sha': 'b' * 40,
            'reason': 'Implementation predates the evidence collector.',
            'approval': {'status': 'approved', 'approved_by': 'owner',
                         'source': 'https://github.com/' + delivery.CANONICAL_REPOSITORY + '/issues/92#issuecomment-123'},
        }
        self.manifest['base_sha'] = 'a' * 40
        (self.root / '.delivery').mkdir(exist_ok=True)
        (self.root / '.delivery/exception.json').write_text(json.dumps(record))
        return record

    def save_legacy_record(self, record):
        (self.root / '.delivery/exception.json').write_text(json.dumps(record))

    def test_approved_legacy_exception_checks_new_work_evidence(self):
        self.legacy_manifest()
        with patch.object(delivery, 'git', return_value=''), patch.object(delivery, 'source_hashes', return_value={}), patch.object(delivery, 'validate_evidence', return_value=[]) as evidence:
            self.assertEqual(delivery.validate_manifest(self.root, self.manifest), [])
            self.assertEqual(evidence.call_args.args[3], 'b' * 40)
            self.assertEqual(evidence.call_args.args[2], {'AC-01'})

    def test_pending_legacy_exception_is_blocked_even_without_evidence_check(self):
        record = self.legacy_manifest()
        record['approval'] = {'status': 'pending'}
        self.save_legacy_record(record)
        with patch.object(delivery, 'git', return_value=''):
            self.assertTrue(self.check())

    def test_legacy_approval_requires_canonical_issue_comment(self):
        record = self.legacy_manifest()
        record['approval']['source'] = 'https://example.com/approval'
        self.save_legacy_record(record)
        with patch.object(delivery, 'git', return_value=''):
            self.assertTrue(self.check())

    def test_legacy_exception_cannot_be_reused_for_another_delivery(self):
        record = self.legacy_manifest()
        record['delivery'] = 'DMTE-78'
        self.save_legacy_record(record)
        with patch.object(delivery, 'git', return_value=''):
            self.assertTrue(self.check())

    def test_legacy_exception_requires_full_commit_and_matching_base(self):
        for field in ['base_sha', 'legacy_sha']:
            with self.subTest(field=field):
                record = self.legacy_manifest()
                record[field] = 'bad'
                self.save_legacy_record(record)
                with patch.object(delivery, 'git', return_value=''):
                    self.assertTrue(self.check())

    def test_legacy_exception_does_not_skip_evidence_for_new_changes(self):
        self.legacy_manifest()
        with patch.object(delivery, 'git', return_value=''), patch.object(delivery, 'source_hashes', return_value={}), patch.object(delivery, 'validate_evidence', return_value=['Missing new RED/GREEN']):
            self.assertIn('Missing new RED/GREEN', delivery.validate_manifest(self.root, self.manifest))

    def test_legacy_exception_commit_must_be_in_current_history(self):
        self.legacy_manifest()
        with patch.object(delivery, 'git', side_effect=subprocess.CalledProcessError(1, 'git')):
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


class EvidenceBaseMovedTests(unittest.TestCase):
    """RED/GREEN recorded on an older base stay valid after main moves (strict branch protection)."""
    ENV = {'GIT_AUTHOR_NAME': 't', 'GIT_AUTHOR_EMAIL': 't@t', 'GIT_COMMITTER_NAME': 't', 'GIT_COMMITTER_EMAIL': 't@t'}

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.git('init', '-q')
        (self.root / 'app.py').write_text('v1')
        DeliveryTests.evidence_pair(self)  # writes test.py + red/green evidence
        self.old_base = self.commit('old base')
        self.pair = {'red': '.delivery/red.json', 'green': '.delivery/green.json'}
        for phase in ['red', 'green']:
            self.set_base(phase, self.old_base)

    def git(self, *args):
        return subprocess.run(['git', '-C', str(self.root), *args], check=True, capture_output=True, text=True,
                              env={**os.environ, **self.ENV}).stdout.strip()

    def commit(self, message):
        self.git('add', '-A')
        self.git('commit', '-q', '--allow-empty', '-m', message)
        return self.git('rev-parse', 'HEAD')

    def set_base(self, phase, base):
        path = self.root / '.delivery' / (phase + '.json')
        data = json.loads(path.read_text()); data['base_sha'] = base; path.write_text(json.dumps(data))

    def validate(self, base):
        return delivery.validate_evidence(self.root, self.pair, {'AC-01'}, base, {'app.py': 'green'})

    def test_evidence_on_ancestor_base_is_accepted_when_slice_files_did_not_move(self):
        (self.root / 'other.py').write_text('main moved')
        new_base = self.commit('main moved elsewhere')
        self.assertEqual(self.validate(new_base), [])

    def test_evidence_on_ancestor_base_is_rejected_when_a_slice_file_moved(self):
        (self.root / 'app.py').write_text('v2')
        new_base = self.commit('main changed a slice file')
        self.assertTrue(any('Evidence base SHA differs' in e for e in self.validate(new_base)))

    def test_slice_file_renamed_on_main_is_rejected(self):
        self.git('mv', 'app.py', 'renamed.py')
        new_base = self.commit('main renamed a slice file')
        self.assertTrue(any('Evidence base SHA differs' in e for e in self.validate(new_base)))

    def test_slice_file_with_non_ascii_name_changed_on_main_is_rejected(self):
        (self.root / 'ação.py').write_text('v1')
        old = self.commit('add non ascii file')
        for phase in ['red', 'green']:
            self.set_base(phase, old)
        (self.root / 'ação.py').write_text('v2')
        new_base = self.commit('main changed it')
        errors = delivery.validate_evidence(self.root, self.pair, {'AC-01'}, new_base, {'app.py': 'green', 'ação.py': 'x'})
        self.assertTrue(any('Evidence base SHA differs' in e for e in errors))

    def test_file_deleted_by_the_slice_but_changed_on_main_is_rejected(self):
        (self.root / 'gone.py').write_text('v1')
        old = self.commit('add file the slice will delete')
        for phase in ['red', 'green']:
            self.set_base(phase, old)
        (self.root / 'gone.py').write_text('v2')
        new_base = self.commit('main changed it')
        (self.root / 'gone.py').unlink()  # the slice deletes it in the working tree
        self.assertTrue(any('Evidence base SHA differs' in e for e in self.validate(new_base)))

    def test_evidence_on_descendant_of_manifest_base_is_rejected(self):
        (self.root / 'other.py').write_text('later')
        later = self.commit('later commit')
        for phase in ['red', 'green']:
            self.set_base(phase, later)
        self.assertTrue(any('Evidence base SHA differs' in e for e in self.validate(self.old_base)))

    def test_governance_file_changed_on_both_sides_does_not_invalidate_evidence(self):
        (self.root / 'docs').mkdir(exist_ok=True)
        (self.root / 'docs/note.md').write_text('v1')
        old = self.commit('add doc')
        for phase in ['red', 'green']:
            self.set_base(phase, old)
        (self.root / 'docs/note.md').write_text('main edit')
        new_base = self.commit('main edited the doc')
        (self.root / 'docs/note.md').write_text('slice edit')  # the slice edits it too, like registry.json
        self.assertEqual(self.validate(new_base), [])

    def test_evidence_on_unrelated_base_is_rejected(self):
        self.git('checkout', '-q', '--orphan', 'other')
        (self.root / 'x.py').write_text('x')
        other = self.commit('unrelated history')
        self.assertTrue(any('Evidence base SHA differs' in e for e in self.validate(other)))


class DeliveryGateTests(unittest.TestCase):
    """The gate derives base and changed files from Git, binds a delivery by its own manifest and,
    in the merge queue, validates the PR head tree (DMTE-470)."""
    ENV = EvidenceBaseMovedTests.ENV
    ISSUE, PARENT = 5, '01a17485-8de1-7e6d-950a-1e295fef336b'

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.git('init', '-q', '-b', 'main')
        self.write('.gitignore', '__pycache__/\n')
        self.write('tool.py', 'def value():\n    return 1\n')
        self.write('other.py', 'x = 1\n')
        self.write('docs/spec.md', 'AC-01: value is two\n')
        self.write('.delivery/registry.json', json.dumps({'version': 1, 'deliveries': {}}))
        self.base = self.commit('base')
        self.git('checkout', '-q', '-b', 'feat')
        self.write('test_tool.py', 'import unittest\nimport tool\n\n\nclass T(unittest.TestCase):\n'
                                   '    def test_value(self):\n        self.assertEqual(tool.value(), 2)\n')
        self.record('red')
        self.write('tool.py', 'def value():\n    return 2\n')
        self.record('green')
        self.manifest = {
            'version': 1, 'delivery': 'DMTE-900', 'repository': delivery.CANONICAL_REPOSITORY,
            'github_issue': self.ISSUE, 'multica_id': self.PARENT, 'cycle': None, 'tier': 2,
            'criteria': [{'id': 'AC-01', 'description': 'value is two', 'tests': ['T.test_value']}],
            'spec': 'docs/spec.md',
            'tdd': {'mode': 'required', 'red': '.delivery/evidence/red.json', 'green': '.delivery/evidence/green.json'},
            'design_system': {'applicable': False, 'reason': 'Python only; no UI'},
        }
        self.head = self.save_manifest('delivery')

    def git(self, *args):
        return subprocess.run(['git', '-C', str(self.root), *args], check=True, capture_output=True, text=True,
                              env={**os.environ, **self.ENV}).stdout.strip()

    def write(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)

    def commit(self, message):
        self.git('add', '-A')
        self.git('commit', '-q', '--allow-empty', '-m', message)
        return self.git('rev-parse', 'HEAD')

    def record(self, phase):
        delivery.capture(self.root, self.root / '.delivery/evidence' / (phase + '.json'), phase, self.base,
                         [sys.executable, '-m', 'unittest', 'test_tool.py'], ['test_tool.py'], ['AC-01'])

    def save_manifest(self, message, name='DMTE-900', **changes):
        self.write('.delivery/deliveries/' + name + '.json', json.dumps({**self.manifest, **changes}))
        return self.commit(message)

    def main_moves(self, name='other.py', content='x = 2\n'):
        self.git('checkout', '-q', 'main')
        self.write(name, content)
        tip = self.commit('main moves')
        self.git('checkout', '-q', 'feat')
        return tip

    def pr(self, base=None, head=None):
        return {'body': 'Aponta-Delivery: DMTE-900\nRefs #%d' % self.ISSUE,
                'base': {'sha': base or self.base, 'ref': 'main'}, 'head': {'sha': head or self.head}}

    def check(self, event=None):
        return delivery.check_contract(self.root, Path('.delivery/registry.json'),
                                       event or {'pull_request': self.pr()}, fetch_pr=None)

    def test_manifest_needs_neither_base_sha_nor_changed_files(self):
        self.assertEqual(self.check(), [])

    def test_main_moving_does_not_require_a_manifest_commit(self):
        self.save_manifest('old style manifest', base_sha=self.base, changed_files=['tool.py', 'test_tool.py'])
        tip = self.main_moves()
        self.git('merge', '-q', '--no-edit', 'main')
        self.head = self.git('rev-parse', 'HEAD')
        self.assertEqual(self.check({'pull_request': self.pr(base=tip)}), [])

    def test_stale_event_base_does_not_inflate_the_delivery(self):
        self.main_moves()
        self.git('merge', '-q', '--no-edit', 'main')
        self.head = self.git('rev-parse', 'HEAD')
        self.assertEqual(self.check({'pull_request': self.pr(base=self.base)}), [])

    def test_undeclared_changed_file_is_not_an_error(self):
        self.head = self.save_manifest('partial list', base_sha=self.base, changed_files=['tool.py'])
        self.assertEqual(self.check(), [])

    def test_ui_change_is_classified_from_the_diff_not_from_the_manifest(self):
        self.write('apps/web/src/pages/Page.tsx', 'export const Page = () => null\n')
        self.head = self.save_manifest('ui slipped in', base_sha=self.base, changed_files=['tool.py', 'test_tool.py'])
        self.assertIn('UI changes require a design system assessment.', self.check())

    def test_delivery_absent_from_registry_is_bound_by_its_manifest(self):
        self.assertNotIn('Delivery is absent from canonical registry.', self.check())

    def test_two_manifests_cannot_claim_the_same_identity(self):
        self.head = self.save_manifest('clone', name='DMTE-901', delivery='DMTE-901')
        self.assertTrue([e for e in self.check() if 'Duplicate canonical GitHub/Multica identity' in e])

    def test_registry_entry_still_binds_when_present(self):
        entry = {**{k: self.manifest[k] for k in ['delivery', 'repository', 'github_issue', 'multica_id', 'cycle']},
                 'tier': 3, 'kind': 'delivery'}
        self.write('.delivery/registry.json', json.dumps({'version': 1, 'deliveries': {'DMTE-900': entry}}))
        self.head = self.commit('registry entry with another tier')
        self.assertIn('Manifest differs from canonical registry: tier', self.check())

    def test_source_changed_after_green_is_still_rejected(self):
        self.write('tool.py', 'def value():\n    return 2  # changed after GREEN\n')
        self.head = self.commit('late change')
        self.assertIn('GREEN source hashes differ from the reviewed sources.', self.check())

    def test_checkout_must_be_the_reviewed_commit(self):
        self.assertIn('Checkout is not the expected head SHA.', self.check({'pull_request': self.pr(head=self.base)}))

    def test_merge_queue_validates_the_pr_head_tree(self):
        tip = self.main_moves()  # the PR branch is NOT updated: the queue combines them
        self.git('checkout', '-q', '-b', 'queue', tip)
        self.git('merge', '-q', '--squash', 'feat')
        queued = self.commit('queue: main + PR')
        event = {'merge_group': {'head_ref': 'refs/heads/gh-readonly-queue/main/pr-7-abc', 'head_sha': queued}}
        errors = delivery.check_contract(self.root, Path('.delivery/registry.json'), event,
                                         fetch_pr=lambda number: self.pr(base=tip))
        self.assertEqual(errors, [])
        self.assertEqual(self.git('worktree', 'list').count('\n'), 0, 'temporary worktree must be removed')


class HonestRedTests(unittest.TestCase):
    """A RED must run against the delivery's committed code, never an earlier version of it (DMTE-471)."""
    ENV = EvidenceBaseMovedTests.ENV
    FIRST = 'def value():\n    return 2\n'
    git, write, commit = DeliveryGateTests.git, DeliveryGateTests.write, DeliveryGateTests.commit
    save_manifest, pr, check = DeliveryGateTests.save_manifest, DeliveryGateTests.pr, DeliveryGateTests.check
    ISSUE = DeliveryGateTests.ISSUE

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.git('init', '-q', '-b', 'main')
        self.write('.gitignore', '__pycache__/\n')
        self.write('tool.py', 'def value():\n    return 1\n')
        self.write('docs/spec.md', 'AC-01: value grows\n')
        self.write('.delivery/registry.json', json.dumps({'version': 1, 'deliveries': {}}))
        self.base = self.commit('base')
        self.git('checkout', '-q', '-b', 'feat')
        self.write('test_tool.py', 'import unittest\nimport tool\n\n\nclass T(unittest.TestCase):\n'
                                   '    def test_value(self):\n        self.assertGreaterEqual(tool.value(), 2)\n')
        self.record('red')
        self.write('tool.py', self.FIRST)
        self.record('green')
        self.commit('first implementation')
        self.write('tool.py', 'def value():\n    return 3\n')
        self.head = self.commit('second implementation')
        # The next cycle's test: the committed code returns 3 and the criterion now asks for 4.
        self.write('test_more.py', 'import unittest\nimport tool\n\n\nclass M(unittest.TestCase):\n'
                                   '    def test_value(self):\n        self.assertEqual(tool.value(), 4)\n')
        self.manifest = {
            'version': 1, 'delivery': 'DMTE-900', 'repository': delivery.CANONICAL_REPOSITORY,
            'github_issue': self.ISSUE, 'multica_id': DeliveryGateTests.PARENT, 'cycle': None, 'tier': 2,
            'criteria': [{'id': 'AC-01', 'description': 'value grows', 'tests': ['M.test_value']}],
            'spec': 'docs/spec.md',
            'tdd': {'mode': 'required', 'red': '.delivery/evidence/red-r2.json', 'green': '.delivery/evidence/green-r2.json'},
            'design_system': {'applicable': False, 'reason': 'Python only; no UI'},
        }

    def record(self, phase, test='test_tool.py', cycle=''):
        return delivery.capture(self.root, self.root / '.delivery/evidence' / (phase + cycle + '.json'), phase, self.base,
                                [sys.executable, '-m', 'unittest', test], [test], ['AC-01'])

    def assert_red_refused(self):
        with self.assertRaises(ValueError) as refusal:
            self.record('red', 'test_more.py', '-r2')
        self.assertIn('tool.py', str(refusal.exception))
        self.assertFalse((self.root / '.delivery/evidence/red-r2.json').exists())
        self.assertFalse((self.root / '.delivery/evidence/red-r2.log').exists())

    def test_red_is_refused_when_committed_source_is_back_at_the_base_version(self):
        self.write('tool.py', self.git('show', self.base + ':tool.py') + '\n')
        self.assert_red_refused()

    def test_red_is_refused_when_committed_source_is_back_at_an_earlier_branch_commit(self):
        self.write('tool.py', self.FIRST)
        self.assert_red_refused()

    def test_red_is_refused_when_committed_source_is_missing(self):
        (self.root / 'tool.py').unlink()
        self.assert_red_refused()

    def test_red_is_recorded_against_the_current_committed_code(self):
        self.assertEqual(self.record('red', 'test_more.py', '-r2')['exit_code'], 1)
        self.assertTrue((self.root / '.delivery/evidence/red-r2.json').is_file())

    def test_red_is_recorded_with_a_new_uncommitted_edit(self):
        self.write('tool.py', 'def value():\n    return 3\n\n\ndef stub():\n    return None\n')
        self.assertEqual(self.record('red', 'test_more.py', '-r2')['exit_code'], 1)

    def test_contract_rejects_a_red_recorded_on_reverted_code(self):
        # Evidence as the previous collector wrote it: the source put back at the base for the RED,
        # then restored with the fix for the GREEN.
        self.write('tool.py', self.git('show', self.base + ':tool.py') + '\n')
        with patch.object(delivery, 'stale_sources', return_value=[]):
            self.record('red', 'test_more.py', '-r2')
        self.write('tool.py', 'def value():\n    return 4\n')
        self.record('green', 'test_more.py', '-r2')
        self.head = self.save_manifest('fabricated cycle')
        self.assertIn('RED did not run against the committed code: tool.py', self.check())

    def test_contract_accepts_an_honest_correction_cycle(self):
        self.record('red', 'test_more.py', '-r2')
        self.write('tool.py', 'def value():\n    return 4\n')
        self.record('green', 'test_more.py', '-r2')
        self.head = self.save_manifest('honest cycle')
        self.assertEqual(self.check(), [])


class InitManifestTests(unittest.TestCase):
    """`init` writes the delivery manifest from its identity and the SPEC's criteria (DMTE-471)."""
    PARENT = '01a17485-8de1-7e6d-950a-1e295fef336b'

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'docs').mkdir()
        (self.root / '.delivery/deliveries').mkdir(parents=True)
        (self.root / 'docs/spec.md').write_text(
            '# Title\n\n## Acceptance criteria\n\n- AC-01: rejects invalid input.\n'
            '- AC-02 (operational): runs in the queue.\n\nAC-01 is covered by test_gate.\n')
        self.path = self.root / '.delivery/deliveries/DMTE-901.json'

    def init(self, name='DMTE-901', issue=7, parent=PARENT, spec='docs/spec.md', reason='Python CLI; no UI'):
        return delivery.init_manifest(self.root, {'version': 1, 'deliveries': {}}, name, issue, parent, 2, spec, reason)

    def test_manifest_carries_identity_cycle_and_spec_criteria(self):
        self.init()
        self.assertTrue(self.path.is_file())
        manifest = json.loads(self.path.read_text())
        self.assertEqual([manifest[key] for key in ('delivery', 'repository', 'github_issue', 'multica_id', 'tier', 'spec')],
                         ['DMTE-901', delivery.CANONICAL_REPOSITORY, 7, self.PARENT, 2, 'docs/spec.md'])
        self.assertEqual(manifest['cycle'], delivery.cycle_for(delivery.today_sao_paulo()))
        self.assertEqual([(c['id'], c['description']) for c in manifest['criteria']],
                         [('AC-01', 'rejects invalid input.'), ('AC-02', 'runs in the queue.')])
        self.assertEqual(manifest['tdd'], {'mode': 'required', 'red': '.delivery/evidence/DMTE-901/red.json',
                                           'green': '.delivery/evidence/DMTE-901/green.json'})
        self.assertNotIn('base_sha', manifest)
        self.assertNotIn('changed_files', manifest)

    def test_generated_manifest_is_valid_once_the_tests_are_named(self):
        self.init()
        self.assertTrue(self.path.is_file())
        manifest = json.loads(self.path.read_text())
        self.assertIn('Every criterion needs a unique AC id, description and tests.',
                      delivery.validate_manifest(self.root, manifest, check_evidence=False))
        for criterion in manifest['criteria']:
            criterion['tests'] = ['test_gate']
        self.assertEqual(delivery.validate_manifest(self.root, manifest, check_evidence=False), [])

    def test_existing_manifest_is_not_overwritten(self):
        self.path.write_text('{"kept": true}')
        with self.assertRaises(ValueError):
            self.init()
        self.assertEqual(self.path.read_text(), '{"kept": true}')

    def test_spec_without_numbered_criteria_is_refused(self):
        (self.root / 'docs/empty.md').write_text('# No criteria here\n')
        with self.assertRaises(ValueError):
            self.init(spec='docs/empty.md')
        self.assertFalse(self.path.exists())

    def test_identity_used_by_another_delivery_is_refused(self):
        (self.root / '.delivery/deliveries/DMTE-800.json').write_text(json.dumps(
            {'delivery': 'DMTE-800', 'github_issue': 7, 'multica_id': '01a17485-8de1-7e6d-950a-1e295fef3aaa'}))
        with self.assertRaises(ValueError):
            self.init()
        self.assertFalse(self.path.exists())


class ResolvePrFromEventTests(unittest.TestCase):
    """merge_group events (native GitHub Merge Queue) have no `pull_request`
    key — only a head_ref like "refs/heads/gh-readonly-queue/main/pr-7-abc".
    These lock in that resolve_pr_from_event treats a queue run exactly like
    the PR it repackages, by fetching the real PR through the injected
    fetch_pr, and that a malformed/unrecognizable head_ref is reported back
    to the caller instead of silently proceeding with an empty PR."""

    def test_no_event_returns_empty(self):
        self.assertEqual(delivery.resolve_pr_from_event(None, fetch_pr=None), ({}, None, None, None))

    def test_pull_request_event_reads_body_and_shas_directly(self):
        event = {'pull_request': {'body': 'Aponta-Delivery: DMTE-1',
                                   'base': {'sha': 'a' * 40}, 'head': {'sha': 'b' * 40}}}
        pr, base, head, merge_group = delivery.resolve_pr_from_event(event, fetch_pr=None)
        self.assertEqual((pr['body'], base, head, merge_group), ('Aponta-Delivery: DMTE-1', 'a' * 40, 'b' * 40, None))

    def test_merge_group_event_resolves_pr_via_fetch_pr(self):
        event = {'merge_group': {'head_ref': 'refs/heads/gh-readonly-queue/main/pr-7-deadbeef', 'head_sha': 'c' * 40}}
        fetched = {'body': 'Aponta-Delivery: DMTE-7', 'base': {'sha': 'd' * 40}, 'head': {'sha': 'e' * 40}}
        seen_numbers = []

        def fetch_pr(number):
            seen_numbers.append(number)
            return fetched

        pr, base, head, merge_group = delivery.resolve_pr_from_event(event, fetch_pr)
        self.assertEqual(seen_numbers, ['7'])
        self.assertEqual((pr, base, head), (fetched, 'd' * 40, 'e' * 40))
        self.assertEqual(merge_group, event['merge_group'])

    def test_merge_group_with_unparseable_head_ref_reports_unresolved(self):
        event = {'merge_group': {'head_ref': 'refs/heads/some-unexpected-branch', 'head_sha': 'f' * 40}}
        pr, base, head, merge_group = delivery.resolve_pr_from_event(event, fetch_pr=lambda n: self.fail('must not fetch'))
        self.assertEqual((pr, base, head), ({}, None, None))
        self.assertEqual(merge_group, event['merge_group'])


if __name__ == '__main__':
    unittest.main()

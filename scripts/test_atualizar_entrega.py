"""Behavioral tests for atualizar_entrega: branch update with main + new base/GREEN."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

import aponta_delivery as delivery
from atualizar_entrega import AtualizacaoError, atualizar

ENV = {'GIT_AUTHOR_NAME': 't', 'GIT_AUTHOR_EMAIL': 't@t', 'GIT_COMMITTER_NAME': 't', 'GIT_COMMITTER_EMAIL': 't@t'}
COMMAND = ['python3', '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_ok.py']


class AtualizarEntregaTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.git('init', '-q', '-b', 'main')
        (self.root / 'tests').mkdir()
        (self.root / 'tests/test_ok.py').write_text(
            'import unittest\n\nclass T(unittest.TestCase):\n    def test_ok(self):\n        self.assertTrue(True)\n')
        (self.root / 'app.py').write_text('v1\n')
        (self.root / '.delivery/deliveries').mkdir(parents=True)
        self.base0 = self.commit('base')
        self.git('checkout', '-q', '-b', 'feat')
        (self.root / 'app.py').write_text('feature\n')
        manifest = {'delivery': 'DMTE-9', 'base_sha': self.base0, 'criteria': [{'id': 'AC-01'}],
                    'tdd': {'mode': 'required', 'red': '.delivery/ev/red.json', 'green': '.delivery/ev/green.json'}}
        (self.root / '.delivery/deliveries/DMTE-9.json').write_text(json.dumps(manifest))
        delivery.capture(self.root, self.root / '.delivery/ev/green.json', 'green', self.base0, COMMAND,
                         ['tests/test_ok.py'], ['AC-01'])
        self.feature_head = self.commit('feature')

    def git(self, *args):
        return subprocess.run(['git', '-C', str(self.root), *args], check=True, capture_output=True, text=True,
                              env={**os.environ, **ENV}).stdout.strip()

    def commit(self, message):
        self.git('add', '-A')
        self.git('commit', '-q', '-m', message)
        return self.git('rev-parse', 'HEAD')

    def advance_main(self, name='other.py', content='main moved\n'):
        self.git('checkout', '-q', 'main')
        (self.root / name).write_text(content)
        tip = self.commit('main moved')
        self.git('checkout', '-q', 'feat')
        return tip

    def manifest(self):
        return json.loads((self.root / '.delivery/deliveries/DMTE-9.json').read_text())

    def test_updates_base_and_regrava_green_on_the_new_base(self):
        tip = self.advance_main()
        result = atualizar(self.root, 'DMTE-9', main_ref='main', verificar=False)
        self.assertEqual('atualizada', result['status'])
        self.assertEqual(tip, self.manifest()['base_sha'])
        green = json.loads((self.root / '.delivery/ev/green.json').read_text())
        self.assertEqual((tip, 0), (green['base_sha'], green['exit_code']))
        self.git('merge-base', '--is-ancestor', tip, 'HEAD')
        self.assertEqual('', self.git('status', '--porcelain'))
        self.assertTrue(self.git('log', '-1', '--format=%s').startswith('chore(delivery)'))

    def test_already_up_to_date_changes_nothing(self):
        result = atualizar(self.root, 'DMTE-9', main_ref='main', verificar=False)
        self.assertEqual('atual', result['status'])
        self.assertEqual(self.feature_head, self.git('rev-parse', 'HEAD'))

    def test_conflict_aborts_the_merge_and_leaves_the_branch_untouched(self):
        self.advance_main(name='app.py', content='main edit\n')
        with self.assertRaises(AtualizacaoError):
            atualizar(self.root, 'DMTE-9', main_ref='main', verificar=False)
        self.assertEqual(self.feature_head, self.git('rev-parse', 'HEAD'))
        self.assertEqual('', self.git('status', '--porcelain'))

    def test_refuses_a_dirty_working_tree(self):
        self.advance_main()
        (self.root / 'app.py').write_text('uncommitted\n')
        with self.assertRaises(AtualizacaoError):
            atualizar(self.root, 'DMTE-9', main_ref='main', verificar=False)
        self.assertEqual(self.feature_head, self.git('rev-parse', 'HEAD'))

    def test_failing_green_after_the_merge_rolls_the_branch_back(self):
        self.git('checkout', '-q', 'main')
        (self.root / 'tests/test_ok.py').write_text(
            'import unittest\n\nclass T(unittest.TestCase):\n    def test_ok(self):\n        self.assertTrue(False)\n')
        self.commit('main breaks the test')
        self.git('checkout', '-q', 'feat')
        with self.assertRaises(AtualizacaoError):
            atualizar(self.root, 'DMTE-9', main_ref='main', verificar=False)
        self.assertEqual(self.feature_head, self.git('rev-parse', 'HEAD'))
        self.assertEqual('', self.git('status', '--porcelain'))

    def test_failing_delivery_check_after_the_merge_rolls_the_branch_back(self):
        self.advance_main()
        with self.assertRaises(AtualizacaoError):  # the fixture has no registry, so the real check fails
            atualizar(self.root, 'DMTE-9', main_ref='main', verificar=True)
        self.assertEqual(self.feature_head, self.git('rev-parse', 'HEAD'))
        self.assertEqual('', self.git('status', '--porcelain'))

    def test_fetches_origin_before_merging(self):
        remote = self.root.parent / (self.root.name + '-remote.git')
        self.addCleanup(lambda: subprocess.run(['rm', '-rf', str(remote)]))
        subprocess.run(['git', 'init', '-q', '--bare', '-b', 'main', str(remote)], check=True)
        self.git('remote', 'add', 'origin', str(remote))
        self.git('push', '-q', 'origin', 'main')
        self.git('fetch', '-q', 'origin')
        other = self.root.parent / (self.root.name + '-other')
        self.addCleanup(lambda: subprocess.run(['rm', '-rf', str(other)]))
        subprocess.run(['git', 'clone', '-q', str(remote), str(other)], check=True)
        (other / 'other.py').write_text('moved upstream\n')
        subprocess.run(['git', '-C', str(other), 'add', '-A'], check=True)
        subprocess.run(['git', '-C', str(other), 'commit', '-q', '-m', 'upstream'], check=True,
                       env={**os.environ, **ENV})
        subprocess.run(['git', '-C', str(other), 'push', '-q', 'origin', 'main'], check=True)
        upstream = subprocess.run(['git', '-C', str(other), 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
        result = atualizar(self.root, 'DMTE-9', main_ref='origin/main', verificar=False)
        self.assertEqual((('atualizada', upstream)), (result['status'], self.manifest()['base_sha']))

    def test_up_to_date_does_not_need_the_manifest_evidence(self):
        (self.root / '.delivery/ev/green.json').unlink()
        self.git('add', '-A'); self.git('commit', '-q', '-m', 'drop green')
        head = self.git('rev-parse', 'HEAD')
        self.assertEqual('atual', atualizar(self.root, 'DMTE-9', main_ref='main', verificar=False)['status'])
        self.assertEqual(head, self.git('rev-parse', 'HEAD'))

    def test_refuses_to_run_on_main(self):
        self.git('checkout', '-q', 'main')
        with self.assertRaises(AtualizacaoError):
            atualizar(self.root, 'DMTE-9', main_ref='main', verificar=False)


if __name__ == '__main__':
    unittest.main()

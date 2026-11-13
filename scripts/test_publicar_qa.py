import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from publicar_qa import assess, build_query, carry_source, parent_of, status_payload, QA, RAPIDO_QA, ULTRA_QA
from qa_merge_queue import pr_number, queue_verdict


class QaProofTests(unittest.TestCase):
    def setUp(self):
        self.sha = 'a' * 40
        self.valid = {'content':'RESULTADO=APROVADO\nSHA: '+self.sha,'author_type':'agent','author_id':QA,
                      'task_agent':QA,'task_status':'completed','source_task_id':'task'}

    def test_completed_qa_for_exact_sha(self):
        self.assertEqual(assess([self.valid],self.sha),self.valid)

    def test_squad_rapido_qa_can_approve(self):
        rapido = {**self.valid, 'author_id': RAPIDO_QA, 'task_agent': RAPIDO_QA}
        self.assertEqual(assess([rapido], self.sha), rapido)

    def test_qa_publishing_from_its_own_running_task_can_approve(self):
        running = {**self.valid, 'author_id': RAPIDO_QA, 'task_agent': RAPIDO_QA, 'task_status': 'running'}
        self.assertEqual(assess([running], self.sha, current=('task', RAPIDO_QA)), running)

    def test_running_task_of_another_run_cannot_approve(self):
        running = {**self.valid, 'author_id': RAPIDO_QA, 'task_agent': RAPIDO_QA, 'task_status': 'running'}
        with self.assertRaises(ValueError):assess([running], self.sha, current=('other-task', RAPIDO_QA))

    def test_running_task_published_by_another_agent_cannot_approve(self):
        running = {**self.valid, 'author_id': RAPIDO_QA, 'task_agent': RAPIDO_QA, 'task_status': 'running'}
        with self.assertRaises(ValueError):assess([running], self.sha, current=('task', 'some-developer'))

    def test_comment_from_another_agents_task_cannot_approve(self):
        with self.assertRaises(ValueError):assess([{**self.valid, 'author_id': RAPIDO_QA, 'task_agent': QA}], self.sha)

    def test_squad_ultra_qa_can_approve_from_its_own_run(self):
        running = {**self.valid, 'author_id': ULTRA_QA, 'task_agent': ULTRA_QA, 'task_status': 'running'}
        self.assertEqual(assess([running], self.sha, current=('task', ULTRA_QA)), running)

    def test_squad_ultra_leader_cannot_approve(self):
        leader = '0427564a-c9cc-494e-8ea1-592a98588251'
        with self.assertRaises(ValueError):assess([{**self.valid, 'author_id': leader, 'task_agent': leader}], self.sha)

    def test_human_comment_cannot_approve(self):
        with self.assertRaises(ValueError):assess([{**self.valid,'author_type':'member'}],self.sha)

    def test_pending_task_cannot_approve(self):
        with self.assertRaises(ValueError):assess([{**self.valid,'task_status':'running'}],self.sha)

    def test_other_sha_cannot_approve(self):
        with self.assertRaises(ValueError):assess([self.valid],'b'*40)

    def test_new_rejection_invalidates_approval(self):
        with self.assertRaises(ValueError):assess([self.valid,{**self.valid,'content':'RESULTADO=REJEITADO\n'+self.sha}],self.sha)

    def test_result_cited_in_prose_is_not_a_second_result(self):
        cited = {**self.valid, 'content': 'RESULTADO=APROVADO SHA40='+self.sha+'\nO implementador registrou RESULTADO=APROVADO antes.'}
        self.assertEqual(assess([cited], self.sha), cited)

    def test_base_sha_mention_does_not_approve_it(self):
        other = 'b' * 40
        newer = {**self.valid, 'content': 'RESULTADO=APROVADO SHA40='+other+'\nBase: '+self.sha}
        with self.assertRaises(ValueError):assess([newer], self.sha)

    def test_approval_survives_a_later_review_of_another_sha(self):
        other = 'b' * 40
        later = {**self.valid, 'content': 'RESULTADO=APROVADO SHA40='+other+'\nBase: '+self.sha}
        self.assertEqual(assess([self.valid, later], self.sha), self.valid)

    def test_ambiguous_result_cannot_approve(self):
        with self.assertRaises(ValueError):assess([{**self.valid,'content':self.valid['content']+'\nRESULTADO=REJEITADO'}],self.sha)


class QaSourceTests(unittest.TestCase):
    parent = '11111111-1111-1111-1111-111111111111'
    child = '22222222-2222-2222-2222-222222222222'

    def test_mention_mode_reads_qa_comments_on_the_parent(self):
        query = build_query(self.parent)
        self.assertIn(f"c.issue_id='{self.parent}'", query)
        self.assertIn(f"t.issue_id='{self.parent}'", query)
        self.assertIn(QA, query)
        self.assertIn(RAPIDO_QA, query)
        self.assertIn(ULTRA_QA, query)

    def test_mention_mode_does_not_depend_on_issue_status(self):
        self.assertNotIn('status=', build_query(self.parent).replace('t.status', ''))

    def test_child_mode_keeps_the_done_qa_child_rule(self):
        query = build_query(self.parent, self.child)
        self.assertIn(f"i.id='{self.child}'", query)
        self.assertIn(f"i.parent_issue_id='{self.parent}'", query)
        self.assertIn("i.status='done'", query)

    def test_identifiers_must_be_uuids(self):
        with self.assertRaises(ValueError):build_query("x' OR '1'='1")
        with self.assertRaises(ValueError):build_query(self.parent, 'not-a-uuid')


if __name__=='__main__':unittest.main()

class QaCarryTests(unittest.TestCase):
    """An approval follows the reviewed code: it is republished on a new SHA only when that code is identical (DMTE-470)."""
    ENV = {'GIT_AUTHOR_NAME': 't', 'GIT_AUTHOR_EMAIL': 't@t', 'GIT_COMMITTER_NAME': 't', 'GIT_COMMITTER_EMAIL': 't@t'}
    PARENT = '01a17485-8de1-7e6d-950a-1e295fef336b'

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.git('init', '-q', '-b', 'main')
        self.write('app.py', 'first = 1\n\n\n\nlast = 1\n')
        self.write('other.py', 'x = 1\n')
        self.write('docs/spec.md', 'AC-01\n')
        self.write('.delivery/registry.json', json.dumps({'version': 1, 'deliveries': {}}))
        self.manifest = {'delivery': 'DMTE-900', 'multica_id': self.PARENT, 'spec': 'docs/spec.md',
                         'criteria': [{'id': 'AC-01', 'description': 'd', 'tests': ['t']}]}
        self.write('.delivery/deliveries/DMTE-900.json', json.dumps(self.manifest))
        self.commit('base')
        self.git('checkout', '-q', '-b', 'feat')
        self.write('app.py', 'first = 1\n\n\n\nlast = 2\n')
        self.approved = self.commit('reviewed code')
        self.records = [self.review('APROVADO', self.approved)]

    def git(self, *args):
        return subprocess.run(['git', '-C', str(self.root), *args], check=True, capture_output=True, text=True,
                              env={**os.environ, **self.ENV}).stdout.strip()

    def write(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)

    def commit(self, message):
        self.git('add', '-A')
        self.git('commit', '-q', '-m', message)
        return self.git('rev-parse', 'HEAD')

    def review(self, result, sha):
        return {'content': 'RESULTADO=' + result + '\nSHA: ' + sha, 'author_type': 'agent', 'author_id': ULTRA_QA,
                'task_agent': ULTRA_QA, 'task_status': 'completed', 'source_task_id': 'task'}

    def main_changes(self, name, content):
        self.git('checkout', '-q', 'main')
        self.write(name, content)
        self.commit('main moves')
        self.git('checkout', '-q', 'feat')
        self.git('merge', '-q', '--no-edit', 'main')
        return self.git('rev-parse', 'HEAD')

    def carry(self, sha):
        return carry_source(self.root, self.records, sha, 'DMTE-900', main_ref='main')

    def test_governance_only_commit_carries_the_approval(self):
        self.write('.delivery/evidence/note.json', '{}')
        self.write('docs/notes.md', 'registro\n')
        self.assertEqual(self.carry(self.commit('manifest and docs only')), self.approved)

    def test_merging_main_without_touching_reviewed_files_carries(self):
        self.assertEqual(self.carry(self.main_changes('other.py', 'x = 2\n')), self.approved)

    def test_source_change_after_approval_does_not_carry(self):
        self.write('app.py', 'first = 1\n\n\n\nlast = 3\n')
        self.assertIsNone(self.carry(self.commit('late fix')))

    def test_new_source_file_after_approval_does_not_carry(self):
        self.write('extra.py', 'y = 1\n')
        self.assertIsNone(self.carry(self.commit('late file')))

    def test_main_change_to_a_reviewed_file_does_not_carry(self):
        self.assertIsNone(self.carry(self.main_changes('app.py', 'first = 9\n\n\n\nlast = 1\n')))

    def test_workflow_change_does_not_carry(self):
        self.write('.github/workflows/ci.yml', 'name: CI\n')
        self.assertIsNone(self.carry(self.commit('ci change')))

    def test_changed_acceptance_criteria_do_not_carry(self):
        self.write('.delivery/deliveries/DMTE-900.json', json.dumps({**self.manifest, 'criteria': []}))
        self.assertIsNone(self.carry(self.commit('criteria dropped')))

    def test_changed_spec_does_not_carry(self):
        self.write('docs/spec.md', 'AC-01 reescrito\n')
        self.assertIsNone(self.carry(self.commit('spec rewritten')))

    def test_rejected_review_does_not_carry(self):
        self.records = [self.review('APROVADO', self.approved), self.review('REJEITADO', self.approved)]
        self.write('docs/notes.md', 'registro\n')
        self.assertIsNone(self.carry(self.commit('docs only')))

    def test_most_recent_identical_approval_is_used(self):
        self.write('app.py', 'first = 1\n\n\n\nlast = 3\n')
        second = self.commit('second round')
        self.records.append(self.review('APROVADO', second))
        self.write('docs/notes.md', 'registro\n')
        self.assertEqual(self.carry(self.commit('docs only')), second)

    def test_parent_comes_from_the_manifest_when_registry_has_no_entry(self):
        self.assertEqual(parent_of(self.root, self.root / '.delivery/registry.json', 'DMTE-900'), self.PARENT)


class QaMergeQueueTests(unittest.TestCase):
    """The queue commit passes Independent QA only when the PR head carries the attestation (DMTE-470)."""

    def test_reads_the_pr_number_from_the_queue_ref(self):
        self.assertEqual(pr_number('refs/heads/gh-readonly-queue/main/pr-163-d6a50d5aaa9a'), '163')
        self.assertIsNone(pr_number('refs/heads/some-branch'))

    def test_passes_with_a_successful_attestation_on_the_pr_head(self):
        self.assertTrue(queue_verdict([{'context': 'Independent QA', 'state': 'success'}]))

    def test_fails_without_the_attestation(self):
        self.assertFalse(queue_verdict([]))
        self.assertFalse(queue_verdict([{'context': 'Other check', 'state': 'success'}]))

    def test_latest_attestation_wins(self):
        newest_first = [{'context': 'Independent QA', 'state': 'failure'}, {'context': 'Independent QA', 'state': 'success'}]
        self.assertFalse(queue_verdict(newest_first))


class QaStatusLinkTests(unittest.TestCase):
    """The Details link of the Independent QA status opens the live Multica host (DMTE-504)."""

    def test_target_url_points_to_the_active_multica_host(self):
        source = '11111111-1111-1111-1111-111111111111'
        payload = status_payload(source, None)
        self.assertEqual(payload['target_url'], 'https://multica.aponta.cloud/dm-tecnologia/issues/' + source)
        self.assertEqual(payload['context'], 'Independent QA')
        self.assertEqual(payload['state'], 'success')

    def test_decommissioned_host_is_gone_from_the_script(self):
        self.assertNotIn('multica.dmtecnologia.cloud', (Path(__file__).parent / 'publicar_qa.py').read_text())

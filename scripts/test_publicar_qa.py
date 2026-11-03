import unittest
from publicar_qa import assess, build_query, QA


class QaProofTests(unittest.TestCase):
    def setUp(self):
        self.sha = 'a' * 40
        self.valid = {'content':'RESULTADO=APROVADO\nSHA: '+self.sha,'author_type':'agent','author_id':QA,
                      'task_agent':QA,'task_status':'completed','source_task_id':'task'}

    def test_completed_qa_for_exact_sha(self):
        self.assertEqual(assess([self.valid],self.sha),self.valid)

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
        self.assertIn(f"c.author_id='{QA}'", query)

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

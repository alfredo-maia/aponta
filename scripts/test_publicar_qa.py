import unittest
from publicar_qa import assess, QA


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

    def test_ambiguous_result_cannot_approve(self):
        with self.assertRaises(ValueError):assess([{**self.valid,'content':self.valid['content']+'\nRESULTADO=REJEITADO'}],self.sha)


if __name__=='__main__':unittest.main()

import tempfile
import unittest
from pathlib import Path

from tickets_scope import run_check


class RunCheckTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'apps/web/src/pages').mkdir(parents=True)
        (self.root / 'apps/web/src/components/tickets').mkdir(parents=True)

    def write(self, rel_path, content):
        (self.root / rel_path).write_text(content)

    def test_returns_zero_and_prints_ok_when_no_violations(self):
        self.write('apps/web/src/pages/TicketDetailPage.tsx', 'clean')
        exit_code = run_check(self.root, lambda text: [], ok_message='OK', fail_message='FAIL')
        self.assertEqual(0, exit_code)

    def test_returns_one_when_a_file_has_a_violation(self):
        self.write('apps/web/src/pages/TicketDetailPage.tsx', 'dirty')
        exit_code = run_check(self.root, lambda text: ['found it'], ok_message='OK', fail_message='FAIL')
        self.assertEqual(1, exit_code)


if __name__ == '__main__':
    unittest.main()

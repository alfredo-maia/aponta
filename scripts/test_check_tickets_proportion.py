import tempfile
import unittest
from pathlib import Path

from check_tickets_proportion import find_tickets_files, find_violations, main

REPO_ROOT = Path(__file__).resolve().parents[1]


class TicketsProportionCheckTest(unittest.TestCase):
    def test_ad_hoc_control_height_outside_scale_is_a_violation(self):
        text = '<select className="h-[34px] w-full" />'
        self.assertTrue(any('h-[34px]' in v for v in find_violations(text)))

    def test_canonical_control_height_is_not_a_violation(self):
        text = '<input className="h-[42px] w-full" />'
        self.assertEqual([], find_violations(text))

    def test_compact_control_height_is_not_a_violation(self):
        text = '<button className="h-[32px]" />'
        self.assertEqual([], find_violations(text))

    def test_non_control_height_outside_control_range_is_not_a_violation(self):
        text = '<div className="h-[500px]" />'
        self.assertEqual([], find_violations(text))


class TicketsProportionCheckMainTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'apps/web/src/pages').mkdir(parents=True)
        (self.root / 'apps/web/src/components/tickets').mkdir(parents=True)

    def write(self, rel_path, content):
        path = self.root / rel_path
        path.write_text(content)
        return path

    def test_main_fails_when_tickets_file_has_ad_hoc_height(self):
        self.write('apps/web/src/components/tickets/TicketKanban.tsx', 'h-[38px]')
        self.assertEqual(1, main(['check_tickets_proportion.py', str(self.root)]))

    def test_main_passes_when_tickets_files_use_canonical_heights(self):
        self.write('apps/web/src/components/tickets/TicketKanban.tsx', 'h-[42px]')
        self.assertEqual(0, main(['check_tickets_proportion.py', str(self.root)]))


class TicketsProportionRealTreeTest(unittest.TestCase):
    """AC-02 (DMTE-427): sem controles de altura ad hoc fora da escala D6."""

    def test_no_ad_hoc_control_heights_in_real_tickets_tab(self):
        violations = []
        for path in find_tickets_files(REPO_ROOT):
            for violation in find_violations(path.read_text(encoding='utf-8')):
                violations.append(f'{path.relative_to(REPO_ROOT)}: {violation}')
        self.assertEqual([], violations)


if __name__ == '__main__':
    unittest.main()

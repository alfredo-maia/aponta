import tempfile
import unittest
from pathlib import Path

from check_tickets_palette import find_tickets_files, find_violations, main

REPO_ROOT = Path(__file__).resolve().parents[1]


class TicketsPaletteCheckTest(unittest.TestCase):
    def test_hex_literal_is_a_violation(self):
        text = "const COLOR = '#00B5A5';"
        self.assertTrue(any('#00B5A5' in v for v in find_violations(text)))

    def test_off_ds_named_palette_class_is_a_violation(self):
        text = "<div className=\"bg-teal-50 text-emerald-700 border-rose-200\" />"
        violations = find_violations(text)
        self.assertTrue(any('teal-50' in v for v in violations))
        self.assertTrue(any('emerald-700' in v for v in violations))
        self.assertTrue(any('rose-200' in v for v in violations))

    def test_gray_degree_outside_ds_scale_is_a_violation(self):
        text = "<div className=\"bg-gray-50\" />"
        self.assertTrue(any('gray-50' in v for v in find_violations(text)))

    def test_gray_degree_defined_by_ds_is_not_a_violation(self):
        text = "<div className=\"bg-gray-100 border-gray-700\" />"
        self.assertEqual([], find_violations(text))

    def test_amber_is_a_violation_even_though_not_named_in_the_adr(self):
        text = "<p className=\"text-amber-700\">aviso</p>"
        self.assertTrue(any('amber-700' in v for v in find_violations(text)))

    def test_blue_is_a_violation_even_though_not_named_in_the_adr(self):
        text = "<div className=\"bg-blue-50 text-blue-900\" />"
        violations = find_violations(text)
        self.assertTrue(any('blue-50' in v for v in violations))
        self.assertTrue(any('blue-900' in v for v in violations))

    def test_any_other_tailwind_color_family_outside_the_ds_is_a_violation(self):
        text = "<div className=\"bg-indigo-500 text-orange-300\" />"
        violations = find_violations(text)
        self.assertTrue(any('indigo-500' in v for v in violations))
        self.assertTrue(any('orange-300' in v for v in violations))

    def test_brand_degree_outside_ds_scale_is_a_violation(self):
        text = "<div className=\"bg-brand-950\" />"
        self.assertTrue(any('brand-950' in v for v in find_violations(text)))

    def test_brand_degree_defined_by_ds_is_not_a_violation(self):
        text = "<div className=\"bg-brand-600 text-brand-50\" />"
        self.assertEqual([], find_violations(text))

    def test_semantic_degree_outside_ds_scale_is_a_violation(self):
        text = "<div className=\"bg-red-50 text-green-50 border-yellow-950\" />"
        violations = find_violations(text)
        self.assertTrue(any('red-50' in v for v in violations))
        self.assertTrue(any('green-50' in v for v in violations))
        self.assertTrue(any('yellow-950' in v for v in violations))

    def test_semantic_degree_defined_by_ds_is_not_a_violation(self):
        text = "<div className=\"bg-red-600 text-green-700 border-yellow-300\" />"
        self.assertEqual([], find_violations(text))


class TicketsPaletteCheckMainTest(unittest.TestCase):
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

    def test_main_fails_when_tickets_file_has_violation(self):
        self.write('apps/web/src/pages/TicketDetailPage.tsx', "<div className=\"bg-teal-50\" />")
        self.assertEqual(1, main(['check_tickets_palette.py', str(self.root)]))

    def test_main_passes_when_tickets_files_are_clean(self):
        self.write('apps/web/src/pages/TicketDetailPage.tsx', "<div className=\"bg-gray-100\" />")
        self.assertEqual(0, main(['check_tickets_palette.py', str(self.root)]))

    def test_main_ignores_test_and_story_files(self):
        self.write('apps/web/src/components/tickets/TicketKanbanCard.test.tsx', "'#00B5A5'")
        self.write('apps/web/src/components/tickets/TicketKanbanCard.stories.tsx', "'#00B5A5'")
        self.assertEqual(0, main(['check_tickets_palette.py', str(self.root)]))


class TicketsPaletteRealTreeTest(unittest.TestCase):
    """AC-01 (DMTE-427): a aba Tickets não usa hex literal nem paleta fora do DS."""

    def test_no_palette_violations_in_real_tickets_tab(self):
        violations = []
        for path in find_tickets_files(REPO_ROOT):
            for violation in find_violations(path.read_text(encoding='utf-8')):
                violations.append(f'{path.relative_to(REPO_ROOT)}: {violation}')
        self.assertEqual([], violations)


if __name__ == '__main__':
    unittest.main()

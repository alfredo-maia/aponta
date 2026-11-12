import tempfile
import unittest
from pathlib import Path

from check_native_select import find_files, find_violations, main

REPO_ROOT = Path(__file__).resolve().parents[1]


def write(root: Path, name: str, text: str) -> None:
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')


class NativeSelectCheckTest(unittest.TestCase):
    def test_native_select_is_a_violation(self):
        self.assertTrue(find_violations('<select value={v} onChange={f}>'))

    def test_multiline_native_select_is_a_violation(self):
        self.assertTrue(find_violations('return (\n  <select\n    id="x"\n  >'))

    def test_ez_select_and_other_components_are_not_violations(self):
        text = '<EzSelect id="a" /><EzComboBox /><Select /><selected />'
        self.assertEqual([], find_violations(text))

    def test_ez_select_component_itself_is_out_of_scope(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write(root, 'apps/web/src/components/ds/EzSelect.tsx', '<select />')
            write(root, 'apps/web/src/components/ds/EzSelect.test.tsx', '<select />')
            write(root, 'apps/web/src/pages/X.stories.tsx', '<select />')
            write(root, 'apps/web/src/pages/Y.tsx', '<select />')
            self.assertEqual(['Y.tsx'], [p.name for p in find_files(root)])

    def test_main_fails_and_names_the_file_when_a_native_select_exists(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write(root, 'apps/web/src/pages/Y.tsx', 'export const Y = () => <select />;')
            self.assertEqual(1, main(['check_native_select.py', str(root)]))

    def test_main_passes_on_a_clean_tree(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write(root, 'apps/web/src/pages/Y.tsx', 'export const Y = () => <EzSelect />;')
            self.assertEqual(0, main(['check_native_select.py', str(root)]))

    def test_repository_has_no_native_select_outside_ez_select(self):
        self.assertEqual(0, main(['check_native_select.py', str(REPO_ROOT)]))


if __name__ == '__main__':
    unittest.main()

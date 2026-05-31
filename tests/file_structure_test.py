import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class FileStructureTest(unittest.TestCase):
    def test_development_docs_root_only_has_readme(self) -> None:
        root_docs = [
            path.name
            for path in (ROOT / "development-docs").glob("*.md")
            if path.name != "README.md"
        ]
        self.assertEqual(root_docs, [])

    def test_legacy_research_root_has_no_active_markdown_notes(self) -> None:
        active_notes = [
            path.relative_to(ROOT).as_posix()
            for path in (ROOT / "research").rglob("*.md")
            if path.name != "README.md"
        ]
        self.assertEqual(active_notes, [])

    def test_mlb_research_writers_target_sport_scoped_docs(self) -> None:
        pattern = re.compile(r'ROOT / "development-docs" / "(?!mlb|tennis|shared|archive)[^"]+"')
        offenders = []
        for path in (ROOT / "pipeline" / "mlb" / "research").glob("*.py"):
            text = path.read_text(encoding="utf-8")
            if pattern.search(text):
                offenders.append(path.relative_to(ROOT).as_posix())
        self.assertEqual(offenders, [])


if __name__ == "__main__":
    unittest.main()

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PublicExportTest(unittest.TestCase):
    def test_public_export_includes_every_published_slate(self) -> None:
        published_index_path = ROOT / "published-data" / "slates" / "index.json"
        public_meta_path = ROOT / "web" / "public" / "data" / "meta.json"

        published_index = json.loads(published_index_path.read_text(encoding="utf-8"))
        public_meta = json.loads(public_meta_path.read_text(encoding="utf-8"))

        published_ids = [entry["id"] for entry in published_index]
        public_ids = [entry["id"] for entry in public_meta.get("slates", [])]

        self.assertEqual(public_ids, published_ids)

        missing_summaries = [
            slate_id
            for slate_id in published_ids
            if not (ROOT / "web" / "public" / "data" / "slates" / slate_id / "summary.json").exists()
        ]
        self.assertEqual(missing_summaries, [])


if __name__ == "__main__":
    unittest.main()

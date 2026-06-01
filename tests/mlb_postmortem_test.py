import unittest

from pipeline.mlb.research.research_mlb_slate_postmortem import default_postmortem_paths


class MlbPostmortemPathTest(unittest.TestCase):
    def test_default_postmortem_paths_follow_requested_date(self) -> None:
        postmortem, followup = default_postmortem_paths("2026-05-31")

        self.assertTrue(str(postmortem).endswith("development-docs/mlb/postmortems/may31-slate-postmortem-053126.md"))
        self.assertTrue(str(followup).endswith("development-docs/mlb/postmortems/may31-chaos-followups-053126.md"))


if __name__ == "__main__":
    unittest.main()

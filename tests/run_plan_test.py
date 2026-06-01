from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path


class RunPlanTest(unittest.TestCase):
    def test_active_run_plans_are_valid_and_lock_free(self) -> None:
        root = Path(__file__).resolve().parents[1]
        active_path = root / "run-plans" / "active.json"
        active = json.loads(active_path.read_text(encoding="utf-8"))
        self.assertIn("mlb", active["activePlans"])
        self.assertIn("tennis", active["activePlans"])

        for sport, relative_path in active["activePlans"].items():
            plan_path = root / relative_path
            self.assertTrue(plan_path.exists(), f"{sport} active plan is missing")
            plan = json.loads(plan_path.read_text(encoding="utf-8"))
            self.assertEqual(plan["sport"], sport)
            self.assertRegex(plan["date"], r"^\d{4}-\d{2}-\d{2}$")
            self.assertTrue(plan.get("steps"), f"{sport} plan has no steps")
            serialized = json.dumps(plan).lower()
            self.assertNotIn("lock-model-run", serialized)
            self.assertNotIn("data:lock", serialized)

    def test_run_plan_dry_run_resolves_active_tennis_plan(self) -> None:
        root = Path(__file__).resolve().parents[1]
        result = subprocess.run(
            ["node", "scripts/run-plan.mjs", "--sport", "tennis", "--dry-run"],
            cwd=root,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)
        payload = json.loads(result.stdout)
        step_ids = {step["id"] for step in payload["steps"]}
        self.assertIn("snapshot-run", step_ids)
        self.assertIn("check-run", step_ids)
        commands = json.dumps(payload["steps"])
        self.assertIn("data:snapshot:tennis-run", commands)
        self.assertIn("data:check:tennis-run", commands)
        self.assertNotIn("data:lock:tennis-run", commands)


if __name__ == "__main__":
    unittest.main()

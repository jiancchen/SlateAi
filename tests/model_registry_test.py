from __future__ import annotations

import json
import sqlite3
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


class ModelRegistryTest(unittest.TestCase):
    def test_top_level_model_registry_points_to_sport_registries(self) -> None:
        registry_path = ROOT / "models" / "registry.json"
        registry = read_json(registry_path)

        for sport, metadata in registry.get("sports", {}).items():
            with self.subTest(sport=sport):
                path_value = metadata.get("registry")
                self.assertTrue(path_value, f"{sport} registry path is missing")
                sport_registry = (registry_path.parent / path_value).resolve()
                self.assertTrue(sport_registry.exists(), f"{sport} registry does not exist: {sport_registry}")

    def test_sport_cartridge_manifests_and_declared_files_exist(self) -> None:
        for sport_registry_path in sorted((ROOT / "models").glob("*/registry.json")):
            sport_registry = read_json(sport_registry_path)
            for cartridge in sport_registry.get("cartridges", []):
                model_id = cartridge.get("modelId")
                target_path = cartridge.get("targetPath")
                if not target_path:
                    continue
                with self.subTest(sport=sport_registry.get("sport"), model=model_id):
                    cartridge_dir = (sport_registry_path.parent / target_path).resolve()
                    self.assertTrue(cartridge_dir.exists(), f"{model_id} cartridge dir is missing")
                    manifest_path = cartridge_dir / "manifest.json"
                    self.assertTrue(manifest_path.exists(), f"{model_id} manifest is missing")
                    manifest = read_json(manifest_path)
                    self.assertEqual(manifest.get("id"), model_id)

                    for key in (
                        "entrypoint",
                        "outputContract",
                        "featureContract",
                        "metricsContract",
                        "modelDescription",
                        "modelNotes",
                    ):
                        value = manifest.get(key)
                        if value:
                            declared_path = ROOT / value
                            self.assertTrue(declared_path.exists(), f"{model_id} {key} missing: {value}")

                    for source in manifest.get("sourceFiles", []):
                        source_path = source.get("path")
                        if source_path:
                            self.assertTrue((ROOT / source_path).exists(), f"{model_id} source missing: {source_path}")

    def test_m0_may30_snapshot_verifies(self) -> None:
        snapshot_path = ROOT / "data-private" / "model-cartridges" / "mlb" / "M0" / "golden" / "2026-05-30.snapshot.json"
        if not snapshot_path.exists():
            self.skipTest("M0 May 30 snapshot has not been generated")

        result = subprocess.run(
            [
                "node",
                "models/mlb/cartridges/M0/verify_snapshot.mjs",
                "--date",
                "2026-05-30",
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)

    def test_m0_may30_run_verifies_when_locked(self) -> None:
        run_path = ROOT / "data-private" / "model-runs" / "mlb" / "M0" / "2026-05-30" / "run.json"
        if not run_path.exists():
            self.skipTest("M0 May 30 run has not been locked")

        result = subprocess.run(
            [
                "node",
                "models/mlb/cartridges/M0/verify_run.mjs",
                "--date",
                "2026-05-30",
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)

    def test_mlb_followup_closes_side_backtest_lane(self) -> None:
        followup_path = ROOT / "pipeline" / "mlb" / "workflows" / "followup.mjs"
        text = followup_path.read_text(encoding="utf-8")

        self.assertIn("export-side-predictions.mjs", text)
        self.assertIn("mlb_side_backtest.py", text)
        self.assertIn("runPythonSideBacktest('import'", text)
        self.assertIn("runPythonSideBacktest('grade'", text)

    def test_m0_may30_side_predictions_are_training_ready(self) -> None:
        side_board = ROOT / "data-private" / "predictions" / "mlb-sides" / "2026-05-30-board-live.json"
        db_path = ROOT / "data-private" / "warehouse" / "sports.db"
        if not side_board.exists() or not db_path.exists():
            self.skipTest("May 30 MLB side board or warehouse is not present")

        picks = read_json(side_board).get("picks", [])
        conn = sqlite3.connect(db_path)
        try:
            prediction_count = conn.execute(
                """
                select count(*) from mlb_side_predictions
                where prediction_date = '2026-05-30'
                  and model_name = 'board-moneyline-v1.1-sanity'
                """
            ).fetchone()[0]
            backtest_count = conn.execute(
                """
                select count(*) from mlb_side_backtests
                where prediction_date = '2026-05-30'
                  and model_name = 'board-moneyline-v1.1-sanity'
                """
            ).fetchone()[0]
        finally:
            conn.close()

        self.assertEqual(prediction_count, len(picks))
        self.assertEqual(backtest_count, len(picks))


if __name__ == "__main__":
    unittest.main()

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
                        "modelLog",
                        "performanceIndex",
                        "followups",
                        "runLock",
                        "runVerifier",
                    ):
                        value = manifest.get(key)
                        if value:
                            declared_path = ROOT / value
                            self.assertTrue(declared_path.exists(), f"{model_id} {key} missing: {value}")

                    for source in manifest.get("sourceFiles", []):
                        source_path = source.get("path")
                        if source_path:
                            self.assertTrue((ROOT / source_path).exists(), f"{model_id} source missing: {source_path}")

    def test_mlb_m0_may30_snapshot_verifies(self) -> None:
        snapshot_path = ROOT / "data-private" / "model-cartridges" / "mlb" / "MLB-M0" / "golden" / "2026-05-30.snapshot.json"
        if not snapshot_path.exists():
            self.skipTest("MLB-M0 May 30 snapshot has not been generated")

        result = subprocess.run(
            [
                "node",
                "models/mlb/cartridges/MLB-M0/verify_snapshot.mjs",
                "--date",
                "2026-05-30",
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)

    def test_mlb_m0_may30_run_verifies_when_locked(self) -> None:
        run_path = ROOT / "data-private" / "model-runs" / "mlb" / "MLB-M0" / "2026-05-30" / "run.json"
        if not run_path.exists():
            self.skipTest("MLB-M0 May 30 run has not been locked")

        result = subprocess.run(
            [
                "node",
                "models/mlb/cartridges/MLB-M0/verify_run.mjs",
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
        followup_path = ROOT / "models" / "mlb" / "cartridges" / "MLB-M0" / "workflows" / "followup.mjs"
        text = followup_path.read_text(encoding="utf-8")
        pipeline_wrapper_text = (
            ROOT / "pipeline" / "mlb" / "workflows" / "followup.mjs"
        ).read_text(encoding="utf-8")

        self.assertIn("export-side-predictions.mjs", text)
        self.assertIn("mlb_side_backtest.py", text)
        self.assertIn("runPythonSideBacktest('import'", text)
        self.assertIn("runPythonSideBacktest('grade'", text)
        self.assertIn("models', 'mlb', 'cartridges', 'MLB-M0', 'workflows'", pipeline_wrapper_text)

    def test_m0_quiet_start_gate_is_metadata_gated(self) -> None:
        model_text = (
            ROOT / "models" / "mlb" / "cartridges" / "MLB-M0" / "lib" / "analysis-model.js"
        ).read_text(encoding="utf-8")
        entrypoint_text = (
            ROOT / "models" / "mlb" / "cartridges" / "MLB-M0" / "lib" / "sports-model.js"
        ).read_text(encoding="utf-8")
        generator_text = (
            ROOT / "models" / "mlb" / "cartridges" / "MLB-M0" / "lanes" / "generate-day-files.mjs"
        ).read_text(encoding="utf-8")
        loader_text = (ROOT / "pipeline" / "lib" / "load-mlb-day-games.mjs").read_text(encoding="utf-8")

        self.assertIn("enableMay30QuietStartGate", model_text)
        self.assertIn("quietFirst3FullGameRiskFlag", model_text)
        self.assertIn("buildAnalysisModel", entrypoint_text)
        self.assertIn("quietStartFullGameGate: options.date >= '2026-05-31'", generator_text)
        self.assertIn("quietStartFullGameGate", loader_text)

    def test_mlb_publish_compatibility_launchers_point_to_m0_lanes(self) -> None:
        for publish_path in sorted((ROOT / "pipeline" / "mlb" / "publish").glob("*.mjs")):
            with self.subTest(publish_path=publish_path.name):
                text = publish_path.read_text(encoding="utf-8")
                self.assertIn("models', 'mlb', 'cartridges', 'MLB-M0', 'lanes'", text)

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

    def test_m0_hitter_split_snapshots_cover_settled_prop_hitters(self) -> None:
        props_path = ROOT / "data-private" / "predictions" / "mlb-player-props" / "2026-05-30-player-props.json"
        db_path = ROOT / "data-private" / "warehouse" / "sports.db"
        if not props_path.exists() or not db_path.exists():
            self.skipTest("May 30 MLB prop board or warehouse is not present")

        props = [
            pick for pick in read_json(props_path).get("picks", [])
            if pick.get("propType") != "pitcherStrikeouts"
        ]
        conn = sqlite3.connect(db_path)
        try:
            split_count = conn.execute(
                """
                select count(distinct p.game_id || ':' || p.player_id)
                from mlb_prop_predictions p
                join mlb_hitter_split_snapshots s
                  on s.snapshot_date = p.prediction_date
                 and s.game_id = p.game_id
                 and s.player_id = p.player_id
                where p.prediction_date = '2026-05-30'
                  and p.model_name = 'mlb-player-props-v2'
                  and p.prop_type != 'pitcherStrikeouts'
                """
            ).fetchone()[0]
        finally:
            conn.close()

        self.assertEqual(split_count, len(props))

    def test_public_model_history_includes_pending_mlb_runs(self) -> None:
        history_path = ROOT / "published-data" / "model-history" / "index.json"
        if not history_path.exists():
            self.skipTest("Published model-history index is not present")

        model_history = read_json(history_path)
        may31 = next((entry for entry in model_history if entry.get("id") == "2026-05-31"), None)
        self.assertIsNotNone(may31, "May 31 model-history entry is missing")

        models = may31.get("models", [])
        model_ids = {model.get("modelName") for model in models if model.get("sport") == "MLB"}
        self.assertIn("MLB-M0", model_ids)
        self.assertIn("MLB-RP36", model_ids)

        m0 = next(model for model in models if model.get("modelName") == "MLB-M0")
        self.assertEqual(m0.get("settlement", {}).get("status"), "pending")


if __name__ == "__main__":
    unittest.main()

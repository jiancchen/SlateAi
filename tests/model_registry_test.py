from __future__ import annotations

import json
import os
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

    def test_mlb_m0_component_registry_and_source_inventory_are_narrowed(self) -> None:
        manifest_path = ROOT / "models" / "mlb" / "cartridges" / "MLB-M0" / "manifest.json"
        manifest = read_json(manifest_path)
        registry_path = ROOT / manifest.get("componentRegistry", "")
        self.assertTrue(registry_path.exists(), "MLB-M0 component registry is missing")

        registry = read_json(registry_path)
        component_ids = {component.get("id") for component in registry.get("components", [])}
        self.assertTrue(
            {"sides", "first-five", "totals", "props", "home-runs", "market-context", "relief-addendum"}.issubset(component_ids)
        )

        for component in registry.get("components", []):
            with self.subTest(component=component.get("id")):
                for path_value in component.get("coreFiles", []) + component.get("entrypoints", []):
                    self.assertTrue((ROOT / path_value).exists(), f"component file missing: {path_value}")

        for source in manifest.get("sourceFiles", []):
            role = source.get("role", "")
            path_value = source.get("path", "")
            with self.subTest(role=role, path=path_value):
                self.assertFalse(role.startswith("compatibility-"), f"compatibility role in M0 source lock: {role}")
                self.assertNotIn("frontend-side-model-compat-shim", role)
                self.assertFalse(path_value.startswith("pipeline/mlb/workflows/"), f"workflow shim in M0 source lock: {path_value}")
                self.assertFalse(path_value.startswith("pipeline/mlb/publish/"), f"publish shim in M0 source lock: {path_value}")

    def test_mlb_lifecycle_wrappers_and_runbook_exist(self) -> None:
        for path_value in (
            "models/mlb/lib/registry-utils.mjs",
            "models/mlb/run-cartridge.mjs",
            "models/mlb/lock-cartridge.mjs",
            "models/mlb/verify-cartridge.mjs",
            "models/mlb/compare-cartridges.mjs",
            "models/mlb/scaffold-cartridge.mjs",
            "models/mlb/app-model.js",
            "development-docs/mlb/runbooks/model-iteration.md",
        ):
            with self.subTest(path=path_value):
                self.assertTrue((ROOT / path_value).exists(), f"MLB lifecycle file missing: {path_value}")

        package = read_json(ROOT / "package.json")
        scripts = package.get("scripts", {})
        for script_name in (
            "data:run:mlb-pregame",
            "data:lock:mlb-run",
            "data:verify:mlb-run",
            "data:generate:mlb-day",
            "data:export:mlb-props",
            "data:export:mlb-sides",
            "data:export:mlb-reliever-shadow",
            "data:lock:mlb-rp36",
            "data:verify:mlb-rp36",
        ):
            with self.subTest(script=script_name):
                self.assertIn("models/mlb/", scripts.get(script_name, ""))
                self.assertNotIn("models/mlb/cartridges/MLB-M0", scripts.get(script_name, ""))
                self.assertNotIn("models/mlb/cartridges/MLB-RP36", scripts.get(script_name, ""))

    def test_mlb_scaffold_dry_run_does_not_create_target(self) -> None:
        target_dir = ROOT / "models" / "mlb" / "cartridges" / "MLB-M1"
        if target_dir.exists():
            self.skipTest("MLB-M1 already exists; dry-run no-create check is no longer applicable")

        result = subprocess.run(
            [
                "node",
                "models/mlb/scaffold-cartridge.mjs",
                "--from",
                "MLB-M0",
                "--to",
                "MLB-M1",
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload.get("status"), "dry-run")
        self.assertFalse(target_dir.exists(), "MLB-M1 should not be created during scaffold dry-run")

    def test_mlb_registry_wrapper_honors_model_env_for_nested_launchers(self) -> None:
        env = os.environ.copy()
        env["MLB_MODEL_ID"] = "MLB-RP36"
        result = subprocess.run(
            [
                "node",
                "-e",
                "import('./models/mlb/lib/registry-utils.mjs').then(async (m) => console.log((await m.resolveCartridge()).modelId))",
            ],
            cwd=ROOT,
            env=env,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)
        self.assertEqual(result.stdout.strip(), "MLB-RP36")

    def test_active_app_and_future_tennis_import_shared_sports_core_directly(self) -> None:
        app_text = (ROOT / "web" / "src" / "App.tsx").read_text(encoding="utf-8")
        app_model_text = (ROOT / "models" / "mlb" / "app-model.js").read_text(encoding="utf-8")
        shared_app_text = (
            ROOT / "models" / "shared" / "sports-core" / "app-sports-model.js"
        ).read_text(encoding="utf-8")
        loader_text = (ROOT / "pipeline" / "lib" / "load-mlb-day-games.mjs").read_text(encoding="utf-8")
        slate_text = (ROOT / "web" / "src" / "lib" / "slate.js").read_text(encoding="utf-8")
        tennis_generator_text = (
            ROOT / "pipeline" / "tennis" / "publish" / "generate-day-module.mjs"
        ).read_text(encoding="utf-8")

        self.assertIn("../../models/shared/sports-core/app-sports-model.js", app_text)
        self.assertNotIn("./lib/sports-model.js", app_text)
        self.assertIn("../../mlb/app-model.js", shared_app_text)
        self.assertNotIn("cartridges/MLB-M0", shared_app_text)
        self.assertIn("resolveMlbAppAdapter", loader_text)
        self.assertNotIn("cartridges/MLB-M0/lib/sports-model.js", loader_text)
        self.assertIn("No MLB app adapter registered", app_model_text)
        result = subprocess.run(
            [
                "node",
                "-e",
                "import('./models/mlb/app-model.js').then((m) => console.log(Boolean(m.resolveMlbAppAdapter('M0').createSportsMatchModel)))",
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)
        self.assertIn("true", result.stdout)
        self.assertIn("../../../models/shared/sports-core/app-sports-model.js", slate_text)
        self.assertNotIn("from './sports-model.js'", tennis_generator_text)
        self.assertIn("../../../models/shared/sports-core/app-sports-model.js", tennis_generator_text)

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

        self.assertIn("runMlbCartridge('lane:sides'", text)
        self.assertIn("mlb_side_backtest.py", text)
        self.assertIn("runPythonSideBacktest('import'", text)
        self.assertIn("runPythonSideBacktest('grade'", text)
        self.assertIn("models', 'mlb', 'run-cartridge.mjs'", pipeline_wrapper_text)
        self.assertIn("'--entry', 'followup'", pipeline_wrapper_text)

    def test_mlb_m0_refresh_runs_rp36_through_registry_wrapper(self) -> None:
        text = (
            ROOT / "models" / "mlb" / "cartridges" / "MLB-M0" / "workflows" / "refresh-live-board.mjs"
        ).read_text(encoding="utf-8")
        self.assertIn("currentModelId", text)
        self.assertIn("runMlbCartridge('runner', ['--date', options.date], 'MLB-RP36')", text)
        self.assertIn("'models', 'mlb', 'run-cartridge.mjs'", text)
        self.assertNotIn("runPythonFile('models/mlb/cartridges/MLB-RP36/runner.py'", text)
        self.assertNotIn("runNodeScript('mlb/publish/", text)

    def test_mlb_m0_followup_runs_publish_lanes_through_registry_wrapper(self) -> None:
        text = (
            ROOT / "models" / "mlb" / "cartridges" / "MLB-M0" / "workflows" / "followup.mjs"
        ).read_text(encoding="utf-8")
        self.assertIn("currentModelId", text)
        self.assertIn("runMlbCartridge('lane:veto'", text)
        self.assertIn("runMlbCartridge('lane:sides'", text)
        self.assertIn("runMlbCartridge('lane:history-journal'", text)
        self.assertIn("'models', 'mlb', 'run-cartridge.mjs'", text)
        self.assertNotIn("runNodeScript('mlb/publish/", text)

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

    def test_shared_sports_core_owns_generic_match_plumbing(self) -> None:
        shared_dir = ROOT / "models" / "shared" / "sports-core"
        self.assertTrue(shared_dir.exists(), "shared sports core directory is missing")

        for file_name in (
            "core-utils.js",
            "market-utils.js",
            "signal-utils.js",
            "participant-model.js",
            "match-model.js",
            "structured-analysis-context.js",
            "structured-inputs.js",
        ):
            with self.subTest(file_name=file_name):
                self.assertTrue((shared_dir / file_name).exists(), f"shared sports core file missing: {file_name}")

        m0_lib = ROOT / "models" / "mlb" / "cartridges" / "MLB-M0" / "lib"
        for retired_name in ("core-utils.js", "market-utils.js", "signal-utils.js", "participant-model.js"):
            with self.subTest(retired_name=retired_name):
                self.assertFalse((m0_lib / retired_name).exists(), f"generic helper still lives under MLB-M0: {retired_name}")

        structured_adapter = (m0_lib / "structured-analysis-context.js").read_text(encoding="utf-8")
        shared_structured = (shared_dir / "structured-analysis-context.js").read_text(encoding="utf-8")
        web_shim = (ROOT / "web" / "src" / "lib" / "sports-model.js").read_text(encoding="utf-8")

        self.assertIn("createStructuredAnalysisContextBuilder", structured_adapter)
        self.assertNotIn("buildUfcAnalysisContext", structured_adapter)
        self.assertIn("buildUfcAnalysisContext", shared_structured)
        self.assertIn("models/shared/sports-core/app-sports-model.js", web_shim)
        self.assertNotIn("MLB-M0/lib/sports-model.js", web_shim)

    def test_shared_model_run_indexer_writes_mlb_and_rp36_rows(self) -> None:
        db_path = ROOT / "data-private" / "warehouse" / "sports.db"
        m0_run = ROOT / "data-private" / "model-runs" / "mlb" / "MLB-M0" / "2026-05-31" / "run.json"
        rp36_run = ROOT / "data-private" / "model-runs" / "mlb" / "MLB-RP36" / "2026-05-31" / "run.json"
        if not db_path.exists() or not m0_run.exists() or not rp36_run.exists():
            self.skipTest("May 31 MLB-M0/RP36 locked runs or warehouse are not present")

        for model_id in ("MLB-RP36", "MLB-M0"):
            result = subprocess.run(
                [
                    "python3",
                    "models/shared/model-runs/index_runs.py",
                    "index",
                    "--sport",
                    "mlb",
                    "--model-id",
                    model_id,
                    "--date",
                    "2026-05-31",
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)

        conn = sqlite3.connect(db_path)
        try:
            run_rows = conn.execute(
                """
                select model_id, run_id from model_runs
                where sport = 'mlb'
                  and slate_date = '2026-05-31'
                  and model_id in ('MLB-M0', 'MLB-RP36')
                """
            ).fetchall()
            self.assertEqual({row[0] for row in run_rows}, {"MLB-M0", "MLB-RP36"})
            run_ids = {row[0]: row[1] for row in run_rows}

            m0_lanes = {
                row[0]
                for row in conn.execute(
                    "select lane from model_run_lanes where run_id = ?",
                    (run_ids["MLB-M0"],),
                ).fetchall()
            }
            self.assertTrue({"Full-game side", "First-five side", "First inning", "HR board", "Player props"}.issubset(m0_lanes))

            rp36_lanes = {
                row[0]
                for row in conn.execute(
                    "select lane from model_run_lanes where run_id = ?",
                    (run_ids["MLB-RP36"],),
                ).fetchall()
            }
            self.assertTrue(
                {"RP36 exact first reliever", "RP36 top-2 first reliever", "RP36 top-3 first reliever"}.issubset(rp36_lanes)
            )

            component_count = conn.execute(
                """
                select count(*)
                from model_component_runs
                where parent_run_id = ?
                  and component_model_id = 'MLB-RP36'
                  and component_role = 'relief-addendum'
                """,
                (run_ids["MLB-M0"],),
            ).fetchone()[0]
            self.assertEqual(component_count, 1)

            settlement_count = conn.execute(
                """
                select count(*)
                from mlb_rp36_settlements
                where prediction_date = '2026-05-31'
                  and model_id = 'MLB-RP36'
                """
            ).fetchone()[0]
            self.assertEqual(settlement_count, 1)
        finally:
            conn.close()

    def test_mlb_compare_wrapper_reads_indexed_runs(self) -> None:
        db_path = ROOT / "data-private" / "warehouse" / "sports.db"
        run_path = ROOT / "data-private" / "model-runs" / "mlb" / "MLB-M0" / "2026-05-30" / "run.json"
        if not db_path.exists() or not run_path.exists():
            self.skipTest("May 30 MLB-M0 locked run or warehouse is not present")

        result = subprocess.run(
            [
                "node",
                "models/mlb/compare-cartridges.mjs",
                "--left",
                "MLB-M0",
                "--right",
                "MLB-M0",
                "--date",
                "2026-05-30",
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)
        payload = json.loads(result.stdout)
        self.assertTrue(payload.get("runs"), "compare wrapper did not return indexed runs")

    def test_mlb_publish_compatibility_launchers_dispatch_through_registry_wrapper(self) -> None:
        for publish_path in sorted((ROOT / "pipeline" / "mlb" / "publish").glob("*.mjs")):
            with self.subTest(publish_path=publish_path.name):
                text = publish_path.read_text(encoding="utf-8")
                self.assertIn("models', 'mlb', 'run-cartridge.mjs'", text)
                self.assertIn("'--entry'", text)
                self.assertNotIn("cartridges', 'MLB-M0', 'lanes'", text)

    def test_mlb_parent_runner_uses_cartridge_local_workflow(self) -> None:
        runner_text = (ROOT / "models" / "mlb" / "cartridges" / "MLB-M0" / "runner.mjs").read_text(encoding="utf-8")
        self.assertIn("import.meta.dirname", runner_text)
        self.assertIn("'workflows', 'pregame.mjs'", runner_text)
        self.assertNotIn("'cartridges', 'MLB-M0', 'workflows'", runner_text)

    def test_mlb_m0_run_lock_uses_local_cartridge_dir_for_self_inventory(self) -> None:
        text = (ROOT / "models" / "mlb" / "cartridges" / "MLB-M0" / "run-lock.mjs").read_text(encoding="utf-8")
        self.assertIn("localCartridgeDir", text)
        self.assertIn("`${localCartridgeDir}/manifest.json`", text)
        self.assertNotIn("models/mlb/cartridges/MLB-M0/manifest.json", text)
        self.assertNotIn("models/mlb/cartridges/MLB-M0/run-lock.mjs", text)

    def test_mlb_prop_calibration_web_shim_uses_app_adapter_registry(self) -> None:
        web_shim = (ROOT / "web" / "src" / "lib" / "mlb-prop-calibration.generated.js").read_text(encoding="utf-8")
        ensure_generated = (ROOT / "scripts" / "ensure-generated-web-artifacts.mjs").read_text(encoding="utf-8")
        history_journal = (
            ROOT / "models" / "mlb" / "cartridges" / "MLB-M0" / "lanes" / "history-journal.mjs"
        ).read_text(encoding="utf-8")

        self.assertIn("models/mlb/app-model.js", web_shim)
        self.assertIn("models/mlb/app-model.js", ensure_generated)
        self.assertIn("models/mlb/app-model.js", history_journal)
        self.assertNotIn("MLB-M0/generated/mlb-prop-calibration", web_shim)

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

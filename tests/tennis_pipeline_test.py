from __future__ import annotations

import json
import sqlite3
import subprocess
import tempfile
import unittest
from pathlib import Path

from pipeline.tennis_pipeline_health import check_weather, game_value_book_missing
from pipeline.tennis_warehouse import apply_tennis_migrations, import_flashscore, infer_recent_map_slate_date, init_db


class TennisWarehouseImportTest(unittest.TestCase):
    def test_recent_map_date_is_inferred_from_filename(self) -> None:
        self.assertEqual(
            infer_recent_map_slate_date(Path("flashscore-recent-match-map-2026-05-30.json")),
            "2026-05-30",
        )
        self.assertIsNone(infer_recent_map_slate_date(Path("flashscore-recent-match-map-latest.json")))

    def test_import_flashscore_recent_map_persists_actual_slate_date(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            stats_dir = root / "flashscore-match-stats"
            stats_dir.mkdir()
            map_path = root / "flashscore-recent-match-map-2026-05-30.json"
            map_path.write_text(
                json.dumps(
                    {
                        "map": {
                            "match::player::0": {
                                "boardMatchId": "rg-test-player-a-player-b-2026-05-30",
                                "playerName": "Player A",
                                "recentIndex": 0,
                                "flashscoreId": "abc123",
                                "boardTitle": "Player A vs Player B",
                                "opponentName": "Player B",
                                "recentEvent": "Paris",
                                "recentDate": "28 May 26",
                                "recentIsoDate": "2026-05-28",
                                "recentResult": "6-4 6-4",
                                "flashscoreLabel": "Player A - Player B",
                                "flashscoreTournamentUrl": "https://example.test/results",
                            }
                        }
                    }
                ),
                encoding="utf-8",
            )
            conn = sqlite3.connect(":memory:")
            conn.row_factory = sqlite3.Row
            init_db(conn)

            counts = import_flashscore(conn, stats_dir)

            self.assertEqual(counts["recent_links"], 1)
            row = conn.execute(
                "select slate_date, board_match_id, board_player_name from tennis_flashscore_recent_links"
            ).fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row["slate_date"], "2026-05-30")
            self.assertEqual(row["board_match_id"], "rg-test-player-a-player-b-2026-05-30")
            self.assertEqual(row["board_player_name"], "Player A")

    def test_weather_tables_are_required_by_health_gate(self) -> None:
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        init_db(conn)
        missing = check_weather(conn, "2026-05-30", match_count=1, settled=True)
        self.assertFalse(missing["ok"])
        self.assertEqual(missing["hourlyRows"], 0)
        self.assertEqual(missing["matchWeatherRows"], 0)

        conn.execute(
            """
            insert into tennis_weather_hourly(
              venue_key, source_name, weather_date, time_local, time_utc, raw_json
            )
            values ('roland-garros', 'Open-Meteo', '2026-05-30', '2026-05-30T12:00', '2026-05-30T10:00:00Z', '{}')
            """
        )
        conn.execute(
            """
            insert into tennis_match_weather(
              match_id, slate_date, venue_key, source_name, start_ts, end_ts,
              hourly_rows, avg_temperature_c, raw_json
            )
            values ('rg-test-2026-05-30', '2026-05-30', 'roland-garros', 'Open-Meteo',
                    1780142400, 1780151400, 1, 27.5, '{}')
            """
        )
        present = check_weather(conn, "2026-05-30", match_count=1, settled=True)
        self.assertTrue(present["ok"])

    def test_w1_model_run_migration_is_idempotent(self) -> None:
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        init_db(conn)

        first = apply_tennis_migrations(conn, "W1")
        second = apply_tennis_migrations(conn, "W1")

        self.assertEqual(first["migrations"][0]["status"], "applied")
        self.assertEqual(second["migrations"][0]["status"], "already_applied")
        self.assertTrue(all(row["status"] == "applied" for row in first["migrations"]))
        self.assertTrue(all(row["status"] == "already_applied" for row in second["migrations"]))
        required_tables = {
            "tennis_schema_migrations",
            "tennis_model_runs",
            "tennis_model_run_files",
            "tennis_model_run_inputs",
            "tennis_model_run_outputs",
            "tennis_model_run_metrics",
            "tennis_model_run_events",
            "tennis_model_run_training_rows",
            "tennis_model_run_settlements",
            "tennis_model_run_lane_grades",
            "tennis_model_run_calibration_buckets",
        }
        rows = conn.execute("select name from sqlite_master where type = 'table'").fetchall()
        table_names = {row["name"] for row in rows}
        self.assertTrue(required_tables.issubset(table_names))
        migration_count = conn.execute("select count(*) from tennis_schema_migrations").fetchone()[0]
        self.assertEqual(migration_count, len(first["migrations"]))

    def test_value_book_gate_requires_ml_match_total_and_first_set_total(self) -> None:
        complete_game = {
            "league": "Tennis",
            "tennisContext": {
                "bettingMatrix": [
                    {"label": "ML value"},
                    {"label": "O/U games"},
                    {"label": "1st set O/U"},
                ],
                "derivativeMarkets": [
                    {"label": "ML"},
                    {"label": "O/U"},
                    {"label": "1st set O/U"},
                ],
                "valueBoard": {},
            },
        }
        self.assertEqual(game_value_book_missing(complete_game), [])

        missing_game = {
            "league": "Tennis",
            "tennisContext": {
                "bettingMatrix": [{"label": "ML value"}],
                "valueBoard": {},
            },
        }
        self.assertEqual(
            game_value_book_missing(missing_game),
            [
                "match O/U games value book",
                "1st-set O/U games value book",
                "match O/U derivative row",
                "1st-set O/U derivative row",
            ],
        )

    def test_sparse_total_profile_does_not_turn_missing_stats_into_zero_edge(self) -> None:
        summary_path = (
            Path(__file__).resolve().parents[1]
            / "web"
            / "public"
            / "data"
            / "slates"
            / "2026-05-31"
            / "summary.json"
        )
        if not summary_path.exists():
            self.skipTest("generated May 31 tennis summary is not present")
        summary = json.loads(summary_path.read_text(encoding="utf-8"))
        value_summary = summary.get("tennisValueSummary") or {}

        first_set_rows = value_summary.get("firstSetRows") or []
        first_set_row = next(
            (row for row in first_set_rows if row.get("gameTitle") == "Rafael Jodar vs Pablo Carreno Busta"),
            None,
        )
        self.assertIsNotNone(first_set_row)
        self.assertEqual(first_set_row.get("selection"), "Pass / near line")
        self.assertEqual(first_set_row.get("modelPct"), 50)
        self.assertIn("hold avg N/A", first_set_row.get("reason") or "")

        total_rows = value_summary.get("matchTotalRows") or []
        total_row = next(
            (row for row in total_rows if row.get("gameTitle") == "Rafael Jodar vs Pablo Carreno Busta"),
            None,
        )
        self.assertIsNotNone(total_row)
        self.assertEqual(total_row.get("selection"), "No bet")
        self.assertIsNone(total_row.get("modelPct"))

    def test_t0_may31_model_snapshot_stays_locked(self) -> None:
        root = Path(__file__).resolve().parents[1]
        snapshot_path = (
            root
            / "data-private"
            / "model-cartridges"
            / "tennis"
            / "T0"
            / "golden"
            / "2026-05-31.snapshot.json"
        )
        if not snapshot_path.exists():
            self.skipTest("T0 May 31 snapshot has not been generated")
        result = subprocess.run(
            [
                "node",
                "pipeline/verify-tennis-model-snapshot.mjs",
                "--date",
                "2026-05-31",
                "--model",
                "T0",
            ],
            cwd=root,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)

    def test_tennis_model_cartridges_have_required_model_cards(self) -> None:
        root = Path(__file__).resolve().parents[1]
        cartridge_root = root / "models" / "tennis" / "cartridges"
        cartridge_dirs = sorted(path for path in cartridge_root.glob("T*") if path.is_dir())
        self.assertTrue(cartridge_dirs, "expected at least one tennis model cartridge")

        for cartridge_dir in cartridge_dirs:
            manifest_path = cartridge_dir / "manifest.json"
            description_path = cartridge_dir / "model_description.json"
            notes_path = cartridge_dir / "MODEL_NOTES.md"
            self.assertTrue(manifest_path.exists(), f"{cartridge_dir.name} is missing manifest.json")
            self.assertTrue(description_path.exists(), f"{cartridge_dir.name} is missing model_description.json")
            self.assertTrue(notes_path.exists(), f"{cartridge_dir.name} is missing MODEL_NOTES.md")

            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            description = json.loads(description_path.read_text(encoding="utf-8"))
            self.assertEqual(manifest.get("modelDescription"), f"models/tennis/cartridges/{cartridge_dir.name}/model_description.json")
            self.assertEqual(manifest.get("modelNotes"), f"models/tennis/cartridges/{cartridge_dir.name}/MODEL_NOTES.md")
            self.assertEqual(description.get("modelId"), cartridge_dir.name)
            for key in ("keyImprovements", "keyMetrics", "notes"):
                self.assertIn(key, description)
                self.assertTrue(description[key], f"{cartridge_dir.name} has an empty {key} model-card field")

    def test_t0_may31_model_run_verifies(self) -> None:
        root = Path(__file__).resolve().parents[1]
        run_path = root / "data-private" / "model-runs" / "tennis" / "T0" / "2026-05-31" / "run.json"
        if not run_path.exists():
            self.skipTest("T0 May 31 run has not been locked")
        result = subprocess.run(
            [
                "node",
                "pipeline/verify-tennis-model-run.mjs",
                "--date",
                "2026-05-31",
                "--model",
                "T0",
                "--allow-source-drift",
            ],
            cwd=root,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)

    def test_t0_postmatch_settlement_artifact_has_lane_rows(self) -> None:
        root = Path(__file__).resolve().parents[1]
        artifact_path = (
            root
            / "data-private"
            / "model-runs"
            / "tennis"
            / "T0"
            / "2026-05-31"
            / "postmatch-grades.json"
        )
        if not artifact_path.exists():
            self.skipTest("T0 May 31 postmatch settlement artifact has not been generated")
        artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
        lanes = artifact.get("lanes") or {}
        self.assertEqual(artifact.get("sourceRunId"), "tennis-2026-05-31-W1-F0-T0-E0")
        self.assertEqual(artifact.get("status"), "pending")
        self.assertEqual(artifact.get("pendingMatches"), 8)
        self.assertEqual(artifact.get("rowCount"), 48)
        self.assertEqual(lanes.get("ML", {}).get("rows"), 8)
        self.assertEqual(lanes.get("Spread", {}).get("rows"), 8)
        self.assertEqual(lanes.get("Match O/U", {}).get("rows"), 8)
        self.assertEqual(lanes.get("First-set O/U", {}).get("rows"), 8)
        self.assertEqual(lanes.get("Set-win", {}).get("rows"), 8)
        self.assertEqual(lanes.get("Kalshi trade-to-sell", {}).get("rows"), 8)


if __name__ == "__main__":
    unittest.main()

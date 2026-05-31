from __future__ import annotations

import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from pipeline.tennis_pipeline_health import check_weather, game_value_book_missing
from pipeline.tennis_warehouse import import_flashscore, infer_recent_map_slate_date, init_db


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


if __name__ == "__main__":
    unittest.main()

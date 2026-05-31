from __future__ import annotations

import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from pipeline.tennis_pipeline_health import check_weather
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


if __name__ == "__main__":
    unittest.main()

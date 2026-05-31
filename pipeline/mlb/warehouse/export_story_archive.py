#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_OUTPUT = ROOT / "web" / "src" / "lib" / "story-archive.generated.ts"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def fetch_game_timeline(conn: sqlite3.Connection, game_pk: int) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT
          at_bat_index,
          inning,
          half_inning,
          batting_team,
          batter_name,
          pitcher_name,
          event,
          event_type,
          description,
          away_score_after,
          home_score_after,
          run_delta,
          outs_after,
          base_state_end,
          is_scoring_play
        FROM mlb_plate_appearances
        WHERE game_pk = ?
        ORDER BY at_bat_index
        """,
        (game_pk,),
    ).fetchall()

    return [
        {
            "atBatIndex": row["at_bat_index"],
            "inning": row["inning"],
            "half": row["half_inning"],
            "battingTeam": row["batting_team"],
            "batterName": row["batter_name"],
            "pitcherName": row["pitcher_name"],
            "event": row["event"],
            "eventType": row["event_type"],
            "description": row["description"],
            "awayScore": row["away_score_after"],
            "homeScore": row["home_score_after"],
            "runDelta": row["run_delta"],
            "outs": row["outs_after"],
            "baseState": row["base_state_end"] or "Empty",
            "isScoringPlay": bool(row["is_scoring_play"]),
        }
        for row in rows
    ]


def fetch_story_archive(conn: sqlite3.Connection, start_date: str | None, end_date: str | None) -> list[dict[str, Any]]:
    clauses = []
    params: list[Any] = []
    if start_date:
        clauses.append("game_date >= ?")
        params.append(start_date)
    if end_date:
        clauses.append("game_date <= ?")
        params.append(end_date)
    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    days = conn.execute(
        f"""
        SELECT
          game_date,
          COUNT(*) AS total_games,
          SUM(first_inning_jolt_flag) AS first_inning_jolts,
          SUM(quiet_first5_flag) AS quiet_first5_games,
          SUM(late_break_flag) AS late_break_games,
          SUM(bullpen_flip_flag) AS bullpen_flip_games,
          SUM(comeback_win_flag) AS comeback_wins,
          SUM(CASE WHEN hr_off_relievers >= 1 THEN 1 ELSE 0 END) AS relief_hr_games,
          SUM(CASE WHEN away_traffic_no_conversion_flag = 1 OR home_traffic_no_conversion_flag = 1 THEN 1 ELSE 0 END) AS traffic_no_conversion_games,
          SUM(total_runs_final) AS total_runs_final,
          SUM(total_runs_first5) AS total_runs_first5,
          SUM(away_plate_appearances + home_plate_appearances) AS plate_appearances
        FROM mlb_game_story_signals
        {where_sql}
        GROUP BY game_date
        ORDER BY game_date
        """,
        params,
    ).fetchall()

    archive: list[dict[str, Any]] = []
    for day in days:
        pitch_events = conn.execute(
            """
            SELECT COUNT(*)
            FROM mlb_pitch_events
            WHERE game_date = ?
            """,
            (day["game_date"],),
        ).fetchone()[0]
        games = conn.execute(
            """
            SELECT *
            FROM mlb_game_story_signals
            WHERE game_date = ?
            ORDER BY game_pk
            """,
            (day["game_date"],),
        ).fetchall()

        archive.append(
            {
                "id": day["game_date"],
                "date": day["game_date"],
                "headline": (
                    f"{day['total_games']} MLB games, {day['first_inning_jolts']} first-inning jolts, "
                    f"{day['bullpen_flip_games']} bullpen flips, and {day['quiet_first5_games']} low-event first-five scripts."
                ),
                "metrics": {
                    "games": day["total_games"],
                    "firstInningJolts": day["first_inning_jolts"] or 0,
                    "quietFirst5": day["quiet_first5_games"] or 0,
                    "lateBreaks": day["late_break_games"] or 0,
                    "bullpenFlips": day["bullpen_flip_games"] or 0,
                    "comebackWins": day["comeback_wins"] or 0,
                    "reliefHrGames": day["relief_hr_games"] or 0,
                    "trafficNoConversionGames": day["traffic_no_conversion_games"] or 0,
                    "totalRunsFinal": day["total_runs_final"] or 0,
                    "totalRunsFirst5": day["total_runs_first5"] or 0,
                    "plateAppearances": day["plate_appearances"] or 0,
                    "pitchEvents": pitch_events,
                },
                "games": [
                    {
                        "gamePk": row["game_pk"],
                        "title": f"{row['away_team']} @ {row['home_team']}",
                        "awayTeam": row["away_team"],
                        "homeTeam": row["home_team"],
                        "winnerTeam": row["winner_team"],
                        "loserTeam": row["loser_team"],
                        "leadAfter5Team": row["lead_after5_team"],
                        "firstScoringInning": row["first_scoring_inning"],
                        "leadChanges": row["lead_changes"],
                        "maxComebackRuns": row["max_comeback_runs"],
                        "totalRunsFirst5": row["total_runs_first5"],
                        "totalRunsFinal": row["total_runs_final"],
                        "hrOffStarters": row["hr_off_starters"],
                        "hrOffRelievers": row["hr_off_relievers"],
                        "tags": json.loads(row["story_tags_json"] or "[]"),
                        "summary": json.loads(row["summary_json"] or "{}"),
                        "timeline": fetch_game_timeline(conn, row["game_pk"]),
                    }
                    for row in games
                ],
            }
        )
    return archive


def write_ts_module(output_path: Path, archive: list[dict[str, Any]]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(archive, indent=2, ensure_ascii=True)
    output_path.write_text(
        "export type StoryTimelineEvent = {\n"
        "  atBatIndex: number\n"
        "  inning: number\n"
        "  half: string\n"
        "  battingTeam: string\n"
        "  batterName: string\n"
        "  pitcherName: string\n"
        "  event: string\n"
        "  eventType: string\n"
        "  description: string\n"
        "  awayScore: number\n"
        "  homeScore: number\n"
        "  runDelta: number\n"
        "  outs: number\n"
        "  baseState: string\n"
        "  isScoringPlay: boolean\n"
        "}\n\n"
        "export type StoryArchiveGame = {\n"
        "  gamePk: number\n"
        "  title: string\n"
        "  awayTeam: string\n"
        "  homeTeam: string\n"
        "  winnerTeam: string | null\n"
        "  loserTeam: string | null\n"
        "  leadAfter5Team: string | null\n"
        "  firstScoringInning: number | null\n"
        "  leadChanges: number\n"
        "  maxComebackRuns: number\n"
        "  totalRunsFirst5: number\n"
        "  totalRunsFinal: number\n"
        "  hrOffStarters: number\n"
        "  hrOffRelievers: number\n"
        "  tags: string[]\n"
        "  summary: Record<string, any>\n"
        "  timeline: StoryTimelineEvent[]\n"
        "}\n\n"
        "export type StoryArchiveDay = {\n"
        "  id: string\n"
        "  date: string\n"
        "  headline: string\n"
        "  metrics: Record<string, number>\n"
        "  games: StoryArchiveGame[]\n"
        "}\n\n"
        f"export const storyArchive: StoryArchiveDay[] = {body}\n",
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export derived MLB story signals for the web Stories tab.")
    parser.add_argument("--start-date", help="Optional start date in YYYY-MM-DD format.")
    parser.add_argument("--end-date", help="Optional end date in YYYY-MM-DD format.")
    parser.add_argument("--output", help="Output TS path.", default=str(DEFAULT_OUTPUT))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with get_connection() as conn:
        archive = fetch_story_archive(conn, args.start_date, args.end_date)
    output_path = Path(args.output)
    write_ts_module(output_path, archive)
    print(f"Exported {len(archive)} story archive days to {output_path}")


if __name__ == "__main__":
    main()

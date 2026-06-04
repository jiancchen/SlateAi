#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.sources.mlb.normalization.common import compact_json, stable_id, utc_now, write_report  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    parser.add_argument(
        "--source-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "derive_mlb_team_state_from_typed.json",
    )
    return parser.parse_args()


def clamp(value: float, low: float = 0, high: float = 100) -> float:
    return max(low, min(high, value))


def avg(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


def legacy_row_id(source_table: str, source_pk: str) -> str:
    return hashlib.sha256(f"mlb|{source_table}|{source_pk}".encode("utf-8")).hexdigest()[:24]


def insert_legacy_row(con: sqlite3.Connection, *, source_pk: str, source_date: str, entity_ref: str, row_json: dict) -> None:
    row_text = compact_json(row_json)
    content_hash = hashlib.sha256(row_text.encode("utf-8")).hexdigest()
    con.execute(
        """
        insert into legacy_table_rows (
          legacy_row_id, sport, source_table, source_pk, source_date,
          entity_ref, row_json, content_hash, migrated_at
        ) values (?, 'mlb', 'mlb_team_state_snapshots', ?, ?, ?, ?, ?, ?)
        on conflict(legacy_row_id) do update set
          source_pk = excluded.source_pk,
          source_date = excluded.source_date,
          entity_ref = excluded.entity_ref,
          row_json = excluded.row_json,
          content_hash = excluded.content_hash,
          migrated_at = excluded.migrated_at
        """,
        (
            legacy_row_id("mlb_team_state_snapshots", source_pk),
            source_pk,
            source_date,
            entity_ref,
            row_text,
            content_hash,
            utc_now(),
        ),
    )


def scheduled_teams(con: sqlite3.Connection, date_text: str) -> list[sqlite3.Row]:
    return con.execute(
        """
        select
          g.game_id,
          g.series_game_number,
          away.team_id as away_team_id,
          away.name as away_team,
          away.division as away_division,
          home.team_id as home_team_id,
          home.name as home_team,
          home.division as home_division
        from games g
        join teams away on away.team_id = g.away_team_id
        join teams home on home.team_id = g.home_team_id
        where g.game_date = ?
        order by g.start_time_utc, g.mlb_game_pk
        """,
        (date_text,),
    ).fetchall()


def recent_packets(con: sqlite3.Connection, team_id: str, date_text: str) -> list[sqlite3.Row]:
    return con.execute(
        """
        select
          tgs.*,
          opp.name as opponent_name,
          p.comeback_win_flag,
          p.bullpen_flip_game_flag,
          p.scored_first_inning_flag,
          p.scoreless_first3_flag
        from team_game_stats tgs
        left join teams opp on opp.team_id = tgs.opponent_team_id
        left join phase_outcomes p on p.game_id = tgs.game_id and p.team_id = tgs.team_id
        where tgs.team_id = ?
          and tgs.game_date < ?
        order by tgs.game_date desc, tgs.game_id desc
        limit 5
        """,
        (team_id, date_text),
    ).fetchall()


def derive_row(
    *,
    con: sqlite3.Connection,
    date_text: str,
    team_id: str,
    team_name: str,
    opponent_id: str,
    opponent_name: str,
    series_game_number: int | None,
    division_matchup_flag: int,
) -> dict | None:
    packets = recent_packets(con, team_id, date_text)
    if not packets:
        return None
    last3 = packets[:3]
    last5 = packets[:5]
    wins = [1.0 if row["result"] == "win" else 0.0 for row in packets]
    previous_result = "win" if wins[0] else "loss"
    streak_direction = "W" if wins[0] else "L"
    streak_length = 0
    for win in wins:
        if win == wins[0]:
            streak_length += 1
        else:
            break
    run_diffs = [float((row["runs_scored"] or 0) - (row["runs_allowed"] or 0)) for row in packets]
    close_loss_count = sum(1 for row in last5 if row["result"] == "loss" and ((row["runs_scored"] or 0) - (row["runs_allowed"] or 0)) >= -2)
    blowout_win_count = sum(1 for row in last5 if row["result"] == "win" and ((row["runs_scored"] or 0) - (row["runs_allowed"] or 0)) >= 5)
    blowout_loss_count = sum(1 for row in last5 if row["result"] == "loss" and ((row["runs_scored"] or 0) - (row["runs_allowed"] or 0)) <= -5)
    comeback_win_count = sum(int(row["comeback_win_flag"] or 0) for row in last5)
    bullpen_flip_loss_count = sum(int(row["bullpen_flip_game_flag"] or 0) for row in last5 if row["result"] == "loss")
    quiet_first5_count = sum(int(row["scoreless_first3_flag"] or 0) for row in last5)
    first_inning_jolt_count = sum(int(row["scored_first_inning_flag"] or 0) for row in last5)
    win_pct_last5 = avg(wins[:5]) or 0
    run_diff_last5 = avg(run_diffs[:5]) or 0
    form_pressure_index = clamp(50 + run_diff_last5 * 4 + (win_pct_last5 - 0.5) * 34)
    heat_regression_index = clamp(50 + blowout_win_count * 7 - blowout_loss_count * 6 + first_inning_jolt_count * 3)
    snapback_pressure_index = clamp(
        14
        + (streak_length * 10 if streak_direction == "L" else 0)
        + close_loss_count * 4
        + blowout_loss_count * 3
        + (6 if previous_result == "loss" else 0)
        + max(0.0, 0.48 - win_pct_last5) * 48
        + (5 if series_game_number == 2 else 0)
    )
    return {
        "as_of_date": date_text,
        "team_name": team_name,
        "scheduled_opponent": opponent_name,
        "scheduled_series_game_number": series_game_number,
        "division_matchup_flag": division_matchup_flag,
        "games_sample": len(packets),
        "previous_result": previous_result,
        "streak_direction": streak_direction,
        "streak_length": streak_length,
        "win_pct_last3": avg(wins[:3]),
        "win_pct_last5": win_pct_last5,
        "run_diff_last3": avg(run_diffs[:3]),
        "run_diff_last5": run_diff_last5,
        "opponent_win_pct_last5": None,
        "close_loss_count_last5": close_loss_count,
        "blowout_win_count_last5": blowout_win_count,
        "blowout_loss_count_last5": blowout_loss_count,
        "comeback_win_count_last5": comeback_win_count,
        "bullpen_flip_loss_count_last5": bullpen_flip_loss_count,
        "quiet_first5_count_last5": quiet_first5_count,
        "first_inning_jolt_count_last5": first_inning_jolt_count,
        "snapback_pressure_index": round(snapback_pressure_index, 2),
        "heat_regression_index": round(heat_regression_index, 2),
        "form_pressure_index": round(form_pressure_index, 2),
        "_team_id": team_id,
        "_opponent_id": opponent_id,
    }


def write_row(con: sqlite3.Connection, row: dict) -> None:
    source_pk = compact_json({"as_of_date": row["as_of_date"], "team_name": row["team_name"]})
    team_id = row.pop("_team_id")
    opponent_id = row.pop("_opponent_id")
    con.execute(
        """
        insert into team_state_snapshots (
          team_state_snapshot_id, team_id, opponent_team_id, snapshot_date,
          games_sample, scheduled_series_game_number, division_matchup_flag,
          previous_result, streak_direction, streak_length, win_pct_last3,
          win_pct_last5, run_diff_last3, run_diff_last5, opponent_win_pct_last5,
          blowout_loss_count_last5, blowout_win_count_last5,
          bullpen_flip_loss_count_last5, close_loss_count_last5,
          comeback_win_count_last5, first_inning_jolt_count_last5,
          quiet_first5_count_last5, form_pressure_index, heat_regression_index,
          snapback_pressure_index, source_table, source_pk, source_detail_json, created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'typed_team_state_from_results', ?, ?, ?)
        on conflict(team_state_snapshot_id) do update set
          opponent_team_id = excluded.opponent_team_id,
          games_sample = excluded.games_sample,
          scheduled_series_game_number = excluded.scheduled_series_game_number,
          division_matchup_flag = excluded.division_matchup_flag,
          previous_result = excluded.previous_result,
          streak_direction = excluded.streak_direction,
          streak_length = excluded.streak_length,
          win_pct_last3 = excluded.win_pct_last3,
          win_pct_last5 = excluded.win_pct_last5,
          run_diff_last3 = excluded.run_diff_last3,
          run_diff_last5 = excluded.run_diff_last5,
          opponent_win_pct_last5 = excluded.opponent_win_pct_last5,
          blowout_loss_count_last5 = excluded.blowout_loss_count_last5,
          blowout_win_count_last5 = excluded.blowout_win_count_last5,
          bullpen_flip_loss_count_last5 = excluded.bullpen_flip_loss_count_last5,
          close_loss_count_last5 = excluded.close_loss_count_last5,
          comeback_win_count_last5 = excluded.comeback_win_count_last5,
          first_inning_jolt_count_last5 = excluded.first_inning_jolt_count_last5,
          quiet_first5_count_last5 = excluded.quiet_first5_count_last5,
          form_pressure_index = excluded.form_pressure_index,
          heat_regression_index = excluded.heat_regression_index,
          snapback_pressure_index = excluded.snapback_pressure_index,
          source_pk = excluded.source_pk,
          source_detail_json = excluded.source_detail_json,
          created_at = excluded.created_at
        """,
        (
            stable_id("team-state", team_id, row["as_of_date"], source_pk),
            team_id,
            opponent_id,
            row["as_of_date"],
            row["games_sample"],
            row["scheduled_series_game_number"],
            row["division_matchup_flag"],
            row["previous_result"],
            row["streak_direction"],
            row["streak_length"],
            row["win_pct_last3"],
            row["win_pct_last5"],
            row["run_diff_last3"],
            row["run_diff_last5"],
            row["opponent_win_pct_last5"],
            row["blowout_loss_count_last5"],
            row["blowout_win_count_last5"],
            row["bullpen_flip_loss_count_last5"],
            row["close_loss_count_last5"],
            row["comeback_win_count_last5"],
            row["first_inning_jolt_count_last5"],
            row["quiet_first5_count_last5"],
            row["form_pressure_index"],
            row["heat_regression_index"],
            row["snapback_pressure_index"],
            source_pk,
            compact_json(row),
            utc_now(),
        ),
    )
    insert_legacy_row(con, source_pk=source_pk, source_date=row["as_of_date"], entity_ref=row["team_name"], row_json=row)


def main() -> int:
    args = parse_args()
    source_db = args.source_db if args.source_db.is_absolute() else ROOT / args.source_db
    report_path = args.report if args.report.is_absolute() else ROOT / args.report
    inserted = 0
    with sqlite3.connect(source_db) as con:
        con.row_factory = sqlite3.Row
        for game in scheduled_teams(con, args.date):
            for side in ("away", "home"):
                other = "home" if side == "away" else "away"
                row = derive_row(
                    con=con,
                    date_text=args.date,
                    team_id=game[f"{side}_team_id"],
                    team_name=game[f"{side}_team"],
                    opponent_id=game[f"{other}_team_id"],
                    opponent_name=game[f"{other}_team"],
                    series_game_number=game["series_game_number"],
                    division_matchup_flag=1 if game[f"{side}_division"] and game[f"{side}_division"] == game[f"{other}_division"] else 0,
                )
                if row:
                    write_row(con, row)
                    inserted += 1
        con.commit()
    payload = {
        "ok": True,
        "date": args.date,
        "inserted": inserted,
        "generated_at": utc_now(),
        "script": "data-migration/scripts/derive_mlb_team_state_from_typed.py",
        "source_db": str(source_db.relative_to(ROOT)),
    }
    write_report(report_path, payload)
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

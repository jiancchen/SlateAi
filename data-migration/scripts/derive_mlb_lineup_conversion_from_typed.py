#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.sources.mlb.normalization.common import compact_json, stable_id, utc_now, write_report  # noqa: E402


SOURCE_TABLE = "mlb_lineup_conversion_shape_daily"


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
        default=ROOT / "data-migration" / "reports" / "derive_mlb_lineup_conversion_from_typed.json",
    )
    return parser.parse_args()


def clamp(value: float, low: float = 0, high: float = 100) -> float:
    return max(low, min(high, value))


def avg(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


def pstdev(values: list[float]) -> float:
    if not values:
        return 0.0
    mean = avg(values) or 0.0
    return math.sqrt(sum((value - mean) ** 2 for value in values) / len(values))


def legacy_row_id(source_pk: str) -> str:
    return hashlib.sha256(f"mlb|{SOURCE_TABLE}|{source_pk}".encode("utf-8")).hexdigest()[:24]


def insert_legacy_row(con: sqlite3.Connection, *, source_pk: str, source_date: str, entity_ref: str, row_json: dict) -> None:
    row_text = compact_json(row_json)
    content_hash = hashlib.sha256(row_text.encode("utf-8")).hexdigest()
    con.execute(
        """
        insert into legacy_table_rows (
          legacy_row_id, sport, source_table, source_pk, source_date,
          entity_ref, row_json, content_hash, migrated_at
        ) values (?, 'mlb', ?, ?, ?, ?, ?, ?, ?)
        on conflict(legacy_row_id) do update set
          source_pk = excluded.source_pk,
          source_date = excluded.source_date,
          entity_ref = excluded.entity_ref,
          row_json = excluded.row_json,
          content_hash = excluded.content_hash,
          migrated_at = excluded.migrated_at
        """,
        (
            legacy_row_id(source_pk),
            SOURCE_TABLE,
            source_pk,
            source_date,
            entity_ref,
            row_text,
            content_hash,
            utc_now(),
        ),
    )


def scheduled_rows(con: sqlite3.Connection, date_text: str) -> list[sqlite3.Row]:
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


def recent_packets(con: sqlite3.Connection, team_id: str, date_text: str, window: int) -> list[sqlite3.Row]:
    return con.execute(
        """
        select
          tgs.*,
          p.runs_first3,
          p.scoreless_first3_flag,
          p.traffic_no_conversion_flag
        from team_game_stats tgs
        left join phase_outcomes p on p.game_id = tgs.game_id and p.team_id = tgs.team_id
        where tgs.team_id = ?
          and tgs.game_date < ?
        order by tgs.game_date desc, tgs.game_id desc
        limit ?
        """,
        (team_id, date_text, window),
    ).fetchall()


def packet_values(row: sqlite3.Row) -> dict[str, float]:
    hits = float(row["hits"] or 0)
    walks = float(row["walks"] or 0)
    baserunners = hits + walks
    hits_first5 = float(row["hits_first5"] or 0)
    runs_first5 = float(row["runs_scored_first5"] or 0)
    runs_first3 = float(row["runs_first3"] if row["runs_first3"] is not None else min(runs_first5, row["runs_scored"] or 0))
    early_baserunners = hits_first5 + walks * 0.55
    top_order_baserunners = early_baserunners * 0.55
    traffic_no_conversion = int(row["traffic_no_conversion_flag"] or 0)
    if not traffic_no_conversion and baserunners >= 9 and float(row["runs_scored"] or 0) <= 3:
      traffic_no_conversion = 1
    dead_bat_traffic = 1 if baserunners >= 8 and float(row["runs_scored"] or 0) <= 2 else 0
    quiet_first5 = int(row["scoreless_first3_flag"] or 0)
    if not quiet_first5 and runs_first5 <= 1:
      quiet_first5 = 1
    return {
        "baserunners": baserunners,
        "early_baserunners": early_baserunners,
        "top_order_baserunners": top_order_baserunners,
        "runs": float(row["runs_scored"] or 0),
        "runs_first3": runs_first3,
        "left_on_base": float(row["left_on_base"] or 0),
        "runs_per_baserunner": (float(row["runs_scored"] or 0) / baserunners) if baserunners else None,
        "traffic_no_conversion": float(traffic_no_conversion),
        "dead_bat_traffic": float(dead_bat_traffic),
        "quiet_first5": float(quiet_first5),
    }


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
    window: int,
) -> dict | None:
    rows = recent_packets(con, team_id, date_text, window)
    if not rows:
        return None
    packets = [packet_values(row) for row in rows]
    baserunner_total = sum(packet["baserunners"] for packet in packets)
    early_baserunner_total = sum(packet["early_baserunners"] for packet in packets)
    top_order_baserunner_total = sum(packet["top_order_baserunners"] for packet in packets)
    run_total = sum(packet["runs"] for packet in packets)
    first3_run_total = sum(packet["runs_first3"] for packet in packets)
    lob_total = sum(packet["left_on_base"] for packet in packets)
    conversion_values = [packet["runs_per_baserunner"] for packet in packets if packet["runs_per_baserunner"] is not None]
    runs_per_baserunner = (run_total / baserunner_total) if baserunner_total else None
    early_conversion_rate = (first3_run_total / early_baserunner_total) if early_baserunner_total else None
    top_order_conversion_share = (first3_run_total / top_order_baserunner_total) if top_order_baserunner_total else None
    stranded_traffic_rate = (lob_total / baserunner_total) if baserunner_total else None
    traffic_no_conversion_rate = avg([packet["traffic_no_conversion"] for packet in packets]) or 0.0
    dead_bat_traffic_rate = avg([packet["dead_bat_traffic"] for packet in packets]) or 0.0
    quiet_first5_rate = avg([packet["quiet_first5"] for packet in packets]) or 0.0
    conversion_volatility = pstdev(conversion_values)
    lineup_conversion_index = clamp(
        24
        + (runs_per_baserunner or 0.0) * 120
        + (early_conversion_rate or 0.0) * 34
        + (top_order_conversion_share or 0.0) * 18
        - (stranded_traffic_rate or 0.0) * 32
        - dead_bat_traffic_rate * 18
        - traffic_no_conversion_rate * 18
        - quiet_first5_rate * 10
        - conversion_volatility * 26
    )
    return {
        "as_of_date": date_text,
        "team_name": team_name,
        "scheduled_opponent": opponent_name,
        "scheduled_series_game_number": series_game_number,
        "division_matchup_flag": division_matchup_flag,
        "window_games": window,
        "games_sample": len(packets),
        "baserunners_per_game": (baserunner_total / len(packets)) if packets else None,
        "runs_per_baserunner": runs_per_baserunner,
        "stranded_traffic_rate": stranded_traffic_rate,
        "early_baserunners_per_game": (early_baserunner_total / len(packets)) if packets else None,
        "early_conversion_rate": early_conversion_rate,
        "top_order_baserunners_first3_per_game": (top_order_baserunner_total / len(packets)) if packets else None,
        "top_order_conversion_share": top_order_conversion_share,
        "traffic_no_conversion_rate": traffic_no_conversion_rate,
        "dead_bat_traffic_rate": dead_bat_traffic_rate,
        "quiet_first5_rate": quiet_first5_rate,
        "conversion_volatility": conversion_volatility,
        "lineup_conversion_index": lineup_conversion_index,
        "_team_id": team_id,
        "_opponent_id": opponent_id,
    }


def write_row(con: sqlite3.Connection, row: dict) -> None:
    team_id = row.pop("_team_id")
    opponent_id = row.pop("_opponent_id")
    source_pk = compact_json({"as_of_date": row["as_of_date"], "team_name": row["team_name"], "window_games": row["window_games"]})
    con.execute(
        """
        insert into lineup_shape_snapshots (
          lineup_shape_snapshot_id, team_id, opponent_team_id, snapshot_date, shape_type,
          window_games, games_sample, scheduled_series_game_number, division_matchup_flag,
          baserunners_per_game, early_baserunners_per_game, top_order_baserunners_first3_per_game,
          runs_per_baserunner, early_conversion_rate, top_order_conversion_share,
          stranded_traffic_rate, traffic_no_conversion_rate, dead_bat_traffic_rate,
          quiet_first5_rate, conversion_volatility, lineup_conversion_index,
          source_table, source_pk, source_detail_json, created_at
        ) values (?, ?, ?, ?, 'conversion', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(lineup_shape_snapshot_id) do update set
          opponent_team_id = excluded.opponent_team_id,
          games_sample = excluded.games_sample,
          scheduled_series_game_number = excluded.scheduled_series_game_number,
          division_matchup_flag = excluded.division_matchup_flag,
          baserunners_per_game = excluded.baserunners_per_game,
          early_baserunners_per_game = excluded.early_baserunners_per_game,
          top_order_baserunners_first3_per_game = excluded.top_order_baserunners_first3_per_game,
          runs_per_baserunner = excluded.runs_per_baserunner,
          early_conversion_rate = excluded.early_conversion_rate,
          top_order_conversion_share = excluded.top_order_conversion_share,
          stranded_traffic_rate = excluded.stranded_traffic_rate,
          traffic_no_conversion_rate = excluded.traffic_no_conversion_rate,
          dead_bat_traffic_rate = excluded.dead_bat_traffic_rate,
          quiet_first5_rate = excluded.quiet_first5_rate,
          conversion_volatility = excluded.conversion_volatility,
          lineup_conversion_index = excluded.lineup_conversion_index,
          source_table = excluded.source_table,
          source_pk = excluded.source_pk,
          source_detail_json = excluded.source_detail_json,
          created_at = excluded.created_at
        """,
        (
            stable_id("lineup-shape", "conversion", team_id, row["as_of_date"], row["window_games"], source_pk),
            team_id,
            opponent_id,
            row["as_of_date"],
            row["window_games"],
            row["games_sample"],
            row["scheduled_series_game_number"],
            row["division_matchup_flag"],
            row["baserunners_per_game"],
            row["early_baserunners_per_game"],
            row["top_order_baserunners_first3_per_game"],
            row["runs_per_baserunner"],
            row["early_conversion_rate"],
            row["top_order_conversion_share"],
            row["stranded_traffic_rate"],
            row["traffic_no_conversion_rate"],
            row["dead_bat_traffic_rate"],
            row["quiet_first5_rate"],
            row["conversion_volatility"],
            row["lineup_conversion_index"],
            "typed_lineup_conversion_from_results",
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
        for game in scheduled_rows(con, args.date):
            sides = [
                (game["away_team_id"], game["away_team"], game["home_team_id"], game["home_team"]),
                (game["home_team_id"], game["home_team"], game["away_team_id"], game["away_team"]),
            ]
            for team_id, team_name, opponent_id, opponent_name in sides:
                division_flag = int((game["away_division"] or "") == (game["home_division"] or ""))
                for window in (5, 8, 10, 15):
                    row = derive_row(
                        con=con,
                        date_text=args.date,
                        team_id=team_id,
                        team_name=team_name,
                        opponent_id=opponent_id,
                        opponent_name=opponent_name,
                        series_game_number=game["series_game_number"],
                        division_matchup_flag=division_flag,
                        window=window,
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
        "script": "data-migration/scripts/derive_mlb_lineup_conversion_from_typed.py",
        "source_db": str(source_db.relative_to(ROOT)),
    }
    write_report(report_path, payload)
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

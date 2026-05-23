#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
HISTORY_DIR = ROOT / "data-private" / "history"
DEFAULT_OUT = ROOT / "development-docs" / "tier3-overlay-research-052326.md"
RELIEF_WINDOW = 8
STARTER_WINDOW = 5


@dataclass
class TierThreeOverlayRow:
    split: str
    date: str
    matchup: str
    game_pk: int | None
    pick_team: str
    opponent_team: str
    predicted_side: str
    hit: int
    confidence: int
    volatility: int
    point_edge: float
    starter_leverage_index: float
    late_inning_stability_index: float
    pick_reliever_command_risk: float | None
    opp_reliever_command_risk: float | None
    pick_third_time_penalty: float | None
    opp_third_time_penalty: float | None

    @property
    def starter_late_gap(self) -> float:
        return self.starter_leverage_index - self.late_inning_stability_index

    @property
    def reliever_command_gap(self) -> float | None:
        if self.pick_reliever_command_risk is None or self.opp_reliever_command_risk is None:
            return None
        return self.pick_reliever_command_risk - self.opp_reliever_command_risk


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hit_rate(rows: list[TierThreeOverlayRow]) -> float:
    return round(sum(row.hit for row in rows) / len(rows), 3) if rows else 0.0


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def bucket_rate(rows: list[TierThreeOverlayRow], predicate: Callable[[TierThreeOverlayRow], bool]) -> tuple[int, float]:
    subset = [row for row in rows if predicate(row)]
    return len(subset), hit_rate(subset)


def _read_float(payload: dict[str, object] | None, key: str) -> float | None:
    if not payload:
        return None
    value = payload.get(key)
    return float(value) if value is not None else None


def load_table_lookup(
    conn: sqlite3.Connection,
    table_name: str,
    key_columns: list[str],
    value_columns: list[str],
    where_clause: str = "",
    params: tuple[object, ...] = (),
) -> dict[tuple[object, ...], dict[str, object]]:
    where_sql = f"WHERE {where_clause}" if where_clause else ""
    sql = f"SELECT {', '.join(key_columns + value_columns)} FROM {table_name} {where_sql}"
    lookup: dict[tuple[object, ...], dict[str, object]] = {}
    for row in conn.execute(sql, params).fetchall():
        key = tuple(row[column] for column in key_columns)
        lookup[key] = {column: row[column] for column in value_columns}
    return lookup


def load_game_lookup(conn: sqlite3.Connection) -> dict[tuple[str, str, str], dict[str, int | None]]:
    lookup: dict[tuple[str, str, str], dict[str, int | None]] = {}
    rows = conn.execute(
        """
        SELECT
          g.game_date,
          g.away_team,
          g.home_team,
          g.game_pk,
          MAX(CASE WHEN sp.team_role = 'away' THEN sp.pitcher_id END) AS away_pitcher_id,
          MAX(CASE WHEN sp.team_role = 'home' THEN sp.pitcher_id END) AS home_pitcher_id
        FROM mlb_games g
        LEFT JOIN mlb_starting_pitchers sp
          USING (game_pk)
        GROUP BY g.game_date, g.away_team, g.home_team, g.game_pk
        """
    ).fetchall()
    for row in rows:
        lookup[(row["game_date"], row["away_team"], row["home_team"])] = {
            "game_pk": row["game_pk"],
            "away_pitcher_id": row["away_pitcher_id"],
            "home_pitcher_id": row["home_pitcher_id"],
        }
    return lookup


def load_first_reliever_lookup(conn: sqlite3.Connection) -> dict[tuple[str, str], dict[str, object]]:
    lookup: dict[tuple[str, str], dict[str, object]] = {}
    rows = conn.execute(
        """
        WITH ranked AS (
          SELECT
            as_of_date,
            team_name,
            pitcher_id,
            pitcher_name,
            first_reliever_likelihood,
            availability_score,
            bridge_score,
            ROW_NUMBER() OVER (
              PARTITION BY as_of_date, team_name
              ORDER BY first_reliever_likelihood DESC, availability_score DESC, bridge_score DESC, pitcher_name ASC
            ) AS rn
          FROM mlb_bullpen_usage
        )
        SELECT
          as_of_date,
          team_name,
          pitcher_id,
          pitcher_name,
          first_reliever_likelihood
        FROM ranked
        WHERE rn = 1
        """
    ).fetchall()
    for row in rows:
        lookup[(row["as_of_date"], row["team_name"])] = {
            "pitcher_id": row["pitcher_id"],
            "pitcher_name": row["pitcher_name"],
            "first_reliever_likelihood": row["first_reliever_likelihood"],
        }
    return lookup


def load_reserve_rows(
    conn: sqlite3.Connection,
    game_lookup: dict[tuple[str, str, str], dict[str, int | None]],
    reliever_lookup: dict[tuple[str, str], dict[str, object]],
    reliever_profile_lookup: dict[tuple[str, str, int], dict[str, object]],
    starter_profile_lookup: dict[tuple[str, int], dict[str, object]],
) -> list[TierThreeOverlayRow]:
    rows: list[TierThreeOverlayRow] = []
    for record in conn.execute(
        """
        SELECT
          p.prediction_date,
          p.game_title,
          p.away_team,
          p.home_team,
          p.predicted_team,
          p.predicted_side,
          p.confidence,
          p.volatility,
          p.model_edge,
          p.metadata_json,
          b.hit_full_game
        FROM mlb_side_predictions p
        JOIN mlb_side_backtests b
          USING (prediction_date, model_name, game_id)
        WHERE p.prediction_date BETWEEN '2026-05-10' AND '2026-05-15'
          AND p.model_name = 'board-moneyline-v2'
        ORDER BY p.prediction_date, p.game_title
        """
    ):
        metadata = json.loads(record["metadata_json"] or "{}")
        game_info = game_lookup.get((record["prediction_date"], record["away_team"], record["home_team"])) or {}
        game_pk = game_info.get("game_pk")
        predicted_side = record["predicted_side"]
        pick_team = record["predicted_team"]
        opponent_team = record["home_team"] if predicted_side == "away" else record["away_team"]
        pick_pitcher_id = game_info.get("away_pitcher_id") if predicted_side == "away" else game_info.get("home_pitcher_id")
        opp_pitcher_id = game_info.get("home_pitcher_id") if predicted_side == "away" else game_info.get("away_pitcher_id")
        pick_reliever = reliever_lookup.get((record["prediction_date"], pick_team))
        opp_reliever = reliever_lookup.get((record["prediction_date"], opponent_team))

        rows.append(
            TierThreeOverlayRow(
                split="reserve",
                date=record["prediction_date"],
                matchup=record["game_title"],
                game_pk=game_pk if isinstance(game_pk, int) else None,
                pick_team=pick_team,
                opponent_team=opponent_team,
                predicted_side=predicted_side,
                hit=int(record["hit_full_game"]),
                confidence=int(record["confidence"] or 0),
                volatility=int(record["volatility"] or 0),
                point_edge=float(record["model_edge"] or 0.0),
                starter_leverage_index=float(metadata.get("starterLeverageIndex") or 0.0),
                late_inning_stability_index=float(metadata.get("lateInningStabilityIndex") or 0.0),
                pick_reliever_command_risk=_read_float(
                    reliever_profile_lookup.get(
                        (record["prediction_date"], pick_team, pick_reliever.get("pitcher_id")) if pick_reliever else ()
                    ),
                    "command_risk_index",
                ),
                opp_reliever_command_risk=_read_float(
                    reliever_profile_lookup.get(
                        (record["prediction_date"], opponent_team, opp_reliever.get("pitcher_id")) if opp_reliever else ()
                    ),
                    "command_risk_index",
                ),
                pick_third_time_penalty=_read_float(
                    starter_profile_lookup.get((record["prediction_date"], pick_pitcher_id)) if pick_pitcher_id else None,
                    "third_time_penalty_index",
                ),
                opp_third_time_penalty=_read_float(
                    starter_profile_lookup.get((record["prediction_date"], opp_pitcher_id)) if opp_pitcher_id else None,
                    "third_time_penalty_index",
                ),
            )
        )
    return rows


def load_current_rows(
    game_lookup: dict[tuple[str, str, str], dict[str, int | None]],
    reliever_lookup: dict[tuple[str, str], dict[str, object]],
    reliever_profile_lookup: dict[tuple[str, str, int], dict[str, object]],
    starter_profile_lookup: dict[tuple[str, int], dict[str, object]],
) -> list[TierThreeOverlayRow]:
    rows: list[TierThreeOverlayRow] = []
    for date in (
        "2026-05-16",
        "2026-05-17",
        "2026-05-18",
        "2026-05-19",
        "2026-05-20",
        "2026-05-21",
        "2026-05-22",
    ):
        path = HISTORY_DIR / f"mlb-results-{date}.jsonl"
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            record = json.loads(line)
            if record.get("sport") != "MLB" or record.get("marketType") != "moneyline":
                continue
            indicators = record.get("indicators") or {}
            result = record.get("result") or {}
            game_info = game_lookup.get((record["date"], record["awayTeam"], record["homeTeam"])) or {}
            game_pk = game_info.get("game_pk")
            predicted_side = record.get("predictedSide") or "away"
            pick_team = record["predictedPick"]
            opponent_team = record["homeTeam"] if predicted_side == "away" else record["awayTeam"]
            pick_pitcher_id = game_info.get("away_pitcher_id") if predicted_side == "away" else game_info.get("home_pitcher_id")
            opp_pitcher_id = game_info.get("home_pitcher_id") if predicted_side == "away" else game_info.get("away_pitcher_id")
            pick_reliever = reliever_lookup.get((record["date"], pick_team))
            opp_reliever = reliever_lookup.get((record["date"], opponent_team))
            rows.append(
                TierThreeOverlayRow(
                    split="current",
                    date=record["date"],
                    matchup=record.get("matchup") or "Unknown matchup",
                    game_pk=game_pk if isinstance(game_pk, int) else None,
                    pick_team=pick_team,
                    opponent_team=opponent_team,
                    predicted_side=predicted_side,
                    hit=1 if result.get("fullGameHit") else 0,
                    confidence=int(record.get("confidence") or 0),
                    volatility=int(record.get("volatility") or 0),
                    point_edge=float(record.get("pointEdge") or 0.0),
                    starter_leverage_index=float(indicators.get("starterLeverageIndex") or 0.0),
                    late_inning_stability_index=float(indicators.get("lateInningStabilityIndex") or 0.0),
                    pick_reliever_command_risk=_read_float(
                        reliever_profile_lookup.get((record["date"], pick_team, pick_reliever.get("pitcher_id")) if pick_reliever else ()),
                        "command_risk_index",
                    ),
                    opp_reliever_command_risk=_read_float(
                        reliever_profile_lookup.get((record["date"], opponent_team, opp_reliever.get("pitcher_id")) if opp_reliever else ()),
                        "command_risk_index",
                    ),
                    pick_third_time_penalty=_read_float(
                        starter_profile_lookup.get((record["date"], pick_pitcher_id)) if pick_pitcher_id else None,
                        "third_time_penalty_index",
                    ),
                    opp_third_time_penalty=_read_float(
                        starter_profile_lookup.get((record["date"], opp_pitcher_id)) if opp_pitcher_id else None,
                        "third_time_penalty_index",
                    ),
                )
            )
    return rows


def format_dataset_summary(rows: list[TierThreeOverlayRow]) -> str:
    reserve = [row for row in rows if row.split == "reserve"]
    current = [row for row in rows if row.split == "current"]
    covered_reliever = [row for row in rows if row.pick_reliever_command_risk is not None]
    covered_third = [row for row in rows if row.pick_third_time_penalty is not None]
    return markdown_table(
        ["Window", "Games", "Hit rate", "Reliever coverage", "3rd-trip coverage"],
        [
            [
                "Reserve (`05-10` to `05-15`)",
                str(len(reserve)),
                f"{hit_rate(reserve):.3f}",
                str(sum(1 for row in reserve if row.pick_reliever_command_risk is not None)),
                str(sum(1 for row in reserve if row.pick_third_time_penalty is not None)),
            ],
            [
                "Current (`05-16` to `05-22`)",
                str(len(current)),
                f"{hit_rate(current):.3f}",
                str(sum(1 for row in current if row.pick_reliever_command_risk is not None)),
                str(sum(1 for row in current if row.pick_third_time_penalty is not None)),
            ],
            [
                "Combined",
                str(len(rows)),
                f"{hit_rate(rows):.3f}",
                str(len(covered_reliever)),
                str(len(covered_third)),
            ],
        ],
    )


def format_bucket_analysis(rows: list[TierThreeOverlayRow]) -> str:
    reliever_rows = [row for row in rows if row.pick_reliever_command_risk is not None]
    third_rows = [row for row in rows if row.pick_third_time_penalty is not None]
    reliever_table = markdown_table(
        ["Pick reliever command risk", "Games", "Hit rate"],
        [
            ["`<35`", *map(str, bucket_rate(reliever_rows, lambda row: (row.pick_reliever_command_risk or 0.0) < 35))],
            ["`35-44`", *map(str, bucket_rate(reliever_rows, lambda row: 35 <= (row.pick_reliever_command_risk or 0.0) < 45))],
            ["`45-54`", *map(str, bucket_rate(reliever_rows, lambda row: 45 <= (row.pick_reliever_command_risk or 0.0) < 55))],
            ["`55+`", *map(str, bucket_rate(reliever_rows, lambda row: (row.pick_reliever_command_risk or 0.0) >= 55))],
        ],
    )
    third_table = markdown_table(
        ["Pick 3rd-time penalty", "Games", "Hit rate"],
        [
            ["`<30`", *map(str, bucket_rate(third_rows, lambda row: (row.pick_third_time_penalty or 0.0) < 30))],
            ["`30-39`", *map(str, bucket_rate(third_rows, lambda row: 30 <= (row.pick_third_time_penalty or 0.0) < 40))],
            ["`40-49`", *map(str, bucket_rate(third_rows, lambda row: 40 <= (row.pick_third_time_penalty or 0.0) < 50))],
            ["`50+`", *map(str, bucket_rate(third_rows, lambda row: (row.pick_third_time_penalty or 0.0) >= 50))],
        ],
    )
    starter_backed_table = markdown_table(
        ["Starter-backed high edge", "Games", "Hit rate"],
        [
            ["`starter>=75 && edge>=10 && 3rd-time >=40`", *map(str, bucket_rate(rows, lambda row: row.starter_leverage_index >= 75 and row.point_edge >= 10 and (row.pick_third_time_penalty or 0.0) >= 40))],
            ["`late<=50 && pick reliever >=45`", *map(str, bucket_rate(rows, lambda row: row.late_inning_stability_index <= 50 and (row.pick_reliever_command_risk or 0.0) >= 45))],
            ["`late<=55 && reliever gap >=6`", *map(str, bucket_rate(rows, lambda row: row.late_inning_stability_index <= 55 and (row.reliever_command_gap or -999) >= 6))],
        ],
    )
    return "\n\n".join(
        [
            "### Pick Reliever Command Risk\n" + reliever_table,
            "### Pick Starter Third-Time Penalty\n" + third_table,
            "### Starter-Backed Risk Subsets\n" + starter_backed_table,
        ]
    )


def evaluate_rule(rows: list[TierThreeOverlayRow], predicate: Callable[[TierThreeOverlayRow], bool]) -> dict[str, tuple[int, float, int, float]]:
    result: dict[str, tuple[int, float, int, float]] = {}
    for split in ("reserve", "current", "combined"):
        subset = rows if split == "combined" else [row for row in rows if row.split == split]
        kept = [row for row in subset if not predicate(row)]
        passed = [row for row in subset if predicate(row)]
        result[split] = (len(kept), hit_rate(kept), len(passed), hit_rate(passed))
    return result


def format_overlay_rules(rows: list[TierThreeOverlayRow]) -> str:
    rules: list[tuple[str, str, Callable[[TierThreeOverlayRow], bool], str]] = [
        (
            "Pick bullpen first-entry danger",
            "Pass if `pick reliever command risk >= 45 && late stability <= 50`",
            lambda row: (row.pick_reliever_command_risk or -1) >= 45 and row.late_inning_stability_index <= 50,
            "This is the cleanest bullpen-entry danger overlay: a side already flagged as shaky late and likely handing the ball to a wild first reliever.",
        ),
        (
            "Bullpen command mismatch",
            "Pass if `reliever command gap >= 6 && point edge >= 8 && late stability <= 55`",
            lambda row: (row.reliever_command_gap or -999) >= 6 and row.point_edge >= 8 and row.late_inning_stability_index <= 55,
            "This catches paper edges whose late-game path relies on the worse command handoff.",
        ),
        (
            "Starter third-time trap",
            "Pass if `pick 3rd-time penalty >= 40 && starter leverage >= 75 && late stability <= 55`",
            lambda row: (row.pick_third_time_penalty or -1) >= 40 and row.starter_leverage_index >= 75 and row.late_inning_stability_index <= 55,
            "This is the direct “starter edge pretending to be a full-game edge” overlay.",
        ),
        (
            "Starter + bullpen script trap",
            "Pass if `pick 3rd-time penalty >= 38 && pick reliever command risk >= 42 && point edge >= 10`",
            lambda row: (row.pick_third_time_penalty or -1) >= 38 and (row.pick_reliever_command_risk or -1) >= 42 and row.point_edge >= 10,
            "This is the most aggressive script trap: shaky third trip plus shaky first reliever on a supposedly strong paper edge.",
        ),
    ]

    sections: list[str] = []
    for name, description, predicate, note in rules:
        evaluated = evaluate_rule(rows, predicate)
        table_rows: list[list[str]] = []
        for split_key, label in (("reserve", "Reserve"), ("current", "Current"), ("combined", "Combined")):
            kept_count, kept_rate, passed_count, passed_rate = evaluated[split_key]
            table_rows.append([label, str(kept_count), f"{kept_rate:.3f}", str(passed_count), f"{passed_rate:.3f}"])
        sections.append(
            f"### {name}\n\n"
            f"{description}\n\n"
            f"{markdown_table(['Window', 'Kept', 'Kept hit rate', 'Passed', 'Passed hit rate'], table_rows)}\n\n"
            f"Note: {note}"
        )
    return "\n\n".join(sections)


def write_report(out_path: Path) -> None:
    conn = get_connection()
    try:
        game_lookup = load_game_lookup(conn)
        reliever_lookup = load_first_reliever_lookup(conn)
        reliever_profile_lookup = load_table_lookup(
            conn,
            "mlb_reliever_first_batter_command_profiles",
            ["as_of_date", "team_name", "pitcher_id"],
            ["entries_sample", "command_risk_index", "first_pitch_ball_rate", "reached_rate"],
            "appearance_window = ?",
            (RELIEF_WINDOW,),
        )
        starter_profile_lookup = load_table_lookup(
            conn,
            "mlb_starter_third_time_penalty_profiles",
            ["as_of_date", "pitcher_id"],
            ["starts_sample", "third_time_penalty_index", "third_trip_exposure_rate", "third_trip_reached_delta", "third_trip_scoring_delta"],
            "window_starts = ?",
            (STARTER_WINDOW,),
        )
        rows = load_reserve_rows(conn, game_lookup, reliever_lookup, reliever_profile_lookup, starter_profile_lookup)
        rows.extend(load_current_rows(game_lookup, reliever_lookup, reliever_profile_lookup, starter_profile_lookup))
    finally:
        conn.close()

    report = f"""# MLB Tier 3 Overlay Research — May 23, 2026

## Goal
Keep Tier 3 offline and test whether compact pitcher lookup tables improve the model’s ability to flag dangerous full-game side edges.

This pass focuses on:

1. `reliever first-batter command risk`
2. `starter third-time-through penalty`

The model question is simple: do these features isolate the same kinds of fake control spots we keep seeing when a big edge breaks late?

## Dataset Windows

{format_dataset_summary(rows)}

## Lookup Table Shape
- `mlb_reliever_first_batter_command_profiles`
  - one row per pitcher / team / day
  - based on the last `{RELIEF_WINDOW}` relief entries before that date
- `mlb_starter_third_time_penalty_profiles`
  - one row per starter / day
  - based on the last `{STARTER_WINDOW}` starts before that date

## Bucket Read

{format_bucket_analysis(rows)}

## Overlay Backtests

{format_overlay_rules(rows)}

## Early Read
1. `Starter third-time trap` is the most directly aligned with the side-model failure mode we care about: a big starter-backed edge that weakens once the game moves beyond the clean early script.
2. `Bullpen command mismatch` is the better late-game partner feature. It is less about raw bullpen quality and more about which side is more likely to lose the strike zone first when the bridge begins.
3. `Pick bullpen first-entry danger` is useful, but it should probably stay a soft penalty or classifier input unless the passed bucket clearly separates over a larger sample.

## Recommended Next Move
1. Keep these features offline for now.
2. If one overlay separates both reserve and current windows cleanly, promote it first as:
   - confidence haircut
   - edge haircut
   - volatility bump
3. Do **not** turn either into a hard pass rule until we have more dates and a stronger gap between kept and passed buckets.
"""
    out_path.write_text(report, encoding="utf-8")
    print(f"Wrote {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Backtest Tier 3 late-script overlays against reserve and current windows.")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Path to write the markdown report.")
    args = parser.parse_args()
    write_report(args.out)


if __name__ == "__main__":
    main()

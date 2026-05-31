#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
HISTORY_DIR = ROOT / "data-private" / "history"
DEFAULT_OUT = ROOT / "development-docs" / "mlb" / "research" / "feature-roadmap-052226.md"


@dataclass
class SideRow:
    split: str
    date: str
    game_id: str
    matchup: str
    hit: int
    confidence: int
    volatility: int
    point_edge: float
    input_count: int
    starter_leverage_index: float
    late_inning_stability_index: float
    relief_pitching_risk: float
    coinflip_pressure: float
    projected_hit_edge_for_pick: float
    hit_edge_against_pick: int


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def load_reserve_rows(conn: sqlite3.Connection) -> list[SideRow]:
    rows: list[SideRow] = []
    for record in conn.execute(
        """
        SELECT
          p.prediction_date,
          p.game_id,
          p.game_title,
          p.confidence,
          p.volatility,
          p.model_edge,
          p.input_labels_json,
          p.metadata_json,
          b.hit_full_game
        FROM mlb_side_predictions p
        JOIN mlb_side_backtests b
          USING (prediction_date, model_name, game_id)
        WHERE p.prediction_date BETWEEN '2026-05-10' AND '2026-05-15'
          AND p.model_name = 'board-moneyline-v2'
        ORDER BY p.prediction_date, p.game_id
        """
    ):
        metadata = json.loads(record["metadata_json"] or "{}")
        rows.append(
            SideRow(
                split="reserve",
                date=record["prediction_date"],
                game_id=record["game_id"],
                matchup=record["game_title"],
                hit=int(record["hit_full_game"]),
                confidence=int(record["confidence"] or 0),
                volatility=int(record["volatility"] or 0),
                point_edge=float(record["model_edge"] or 0.0),
                input_count=len(json.loads(record["input_labels_json"] or "[]")),
                starter_leverage_index=float(metadata.get("starterLeverageIndex") or 0.0),
                late_inning_stability_index=float(metadata.get("lateInningStabilityIndex") or 0.0),
                relief_pitching_risk=float(metadata.get("reliefPitchingRisk") or 0.0),
                coinflip_pressure=float(metadata.get("coinflipPressure") or 0.0),
                projected_hit_edge_for_pick=float(metadata.get("projectedHitEdgeForPick") or 0.0),
                hit_edge_against_pick=1 if metadata.get("hitEdgeAgainstPick") else 0,
            )
        )
    return rows


def load_current_rows() -> list[SideRow]:
    rows: list[SideRow] = []
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
            rows.append(
                SideRow(
                    split="current",
                    date=record["date"],
                    game_id=record.get("gameId") or record.get("matchup") or "unknown",
                    matchup=record.get("matchup") or "Unknown matchup",
                    hit=1 if result.get("fullGameHit") else 0,
                    confidence=int(record.get("confidence") or 0),
                    volatility=int(record.get("volatility") or 0),
                    point_edge=float(record.get("pointEdge") or 0.0),
                    input_count=len(record.get("inputLabels") or []),
                    starter_leverage_index=float(indicators.get("starterLeverageIndex") or 0.0),
                    late_inning_stability_index=float(indicators.get("lateInningStabilityIndex") or 0.0),
                    relief_pitching_risk=float(indicators.get("reliefPitchingRisk") or 0.0),
                    coinflip_pressure=float(indicators.get("coinflipPressure") or 0.0),
                    projected_hit_edge_for_pick=float(indicators.get("projectedHitEdgeForPick") or 0.0),
                    hit_edge_against_pick=1 if indicators.get("hitEdgeAgainstPick") else 0,
                )
            )
    return rows


def hit_rate(rows: list[SideRow]) -> float:
    return round(sum(row.hit for row in rows) / len(rows), 3) if rows else 0.0


def bucket_rate(rows: list[SideRow], predicate: Callable[[SideRow], bool]) -> tuple[int, float]:
    subset = [row for row in rows if predicate(row)]
    return len(subset), hit_rate(subset)


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def format_dataset_summary(rows: list[SideRow]) -> str:
    reserve = [row for row in rows if row.split == "reserve"]
    current = [row for row in rows if row.split == "current"]
    table = markdown_table(
        ["Window", "Games", "Hit rate", "Avg edge", "Avg volatility"],
        [
            [
                "Reserve (`05-10` to `05-15`)",
                str(len(reserve)),
                f"{hit_rate(reserve):.3f}",
                f"{sum(row.point_edge for row in reserve) / len(reserve):.1f}",
                f"{sum(row.volatility for row in reserve) / len(reserve):.1f}",
            ],
            [
                "Current (`05-16` to `05-22`)",
                str(len(current)),
                f"{hit_rate(current):.3f}",
                f"{sum(row.point_edge for row in current) / len(current):.1f}",
                f"{sum(row.volatility for row in current) / len(current):.1f}",
            ],
            [
                "Combined",
                str(len(rows)),
                f"{hit_rate(rows):.3f}",
                f"{sum(row.point_edge for row in rows) / len(rows):.1f}",
                f"{sum(row.volatility for row in rows) / len(rows):.1f}",
            ],
        ],
    )
    return table


def format_bucket_analysis(rows: list[SideRow]) -> str:
    edge_rows = [
        ["`<5`", *map(str, bucket_rate(rows, lambda row: row.point_edge < 5))],
        ["`5-10`", *map(str, bucket_rate(rows, lambda row: 5 <= row.point_edge < 10))],
        ["`10-15`", *map(str, bucket_rate(rows, lambda row: 10 <= row.point_edge < 15))],
        ["`15-20`", *map(str, bucket_rate(rows, lambda row: 15 <= row.point_edge < 20))],
        ["`20+`", *map(str, bucket_rate(rows, lambda row: row.point_edge >= 20))],
    ]
    volatility_rows = [
        ["`<70`", *map(str, bucket_rate(rows, lambda row: row.volatility < 70))],
        ["`70-79`", *map(str, bucket_rate(rows, lambda row: 70 <= row.volatility < 80))],
        ["`80-85`", *map(str, bucket_rate(rows, lambda row: 80 <= row.volatility < 86))],
        ["`86-89`", *map(str, bucket_rate(rows, lambda row: 86 <= row.volatility < 90))],
        ["`90+`", *map(str, bucket_rate(rows, lambda row: row.volatility >= 90))],
    ]
    divergence_rows = [
        [
            "`starter - late >= 20`",
            *map(
                str,
                bucket_rate(
                    rows,
                    lambda row: (row.starter_leverage_index - row.late_inning_stability_index) >= 20,
                ),
            ),
        ],
        [
            "`starter - late >= 30`",
            *map(
                str,
                bucket_rate(
                    rows,
                    lambda row: (row.starter_leverage_index - row.late_inning_stability_index) >= 30,
                ),
            ),
        ],
        [
            "`starter - late >= 40`",
            *map(
                str,
                bucket_rate(
                    rows,
                    lambda row: (row.starter_leverage_index - row.late_inning_stability_index) >= 40,
                ),
            ),
        ],
    ]
    return "\n\n".join(
        [
            "### Edge Buckets\n" + markdown_table(["Bucket", "Games", "Hit rate"], edge_rows),
            "### Volatility Buckets\n" + markdown_table(["Bucket", "Games", "Hit rate"], volatility_rows),
            "### Starter vs Late Stability Divergence\n"
            + markdown_table(["Bucket", "Games", "Hit rate"], divergence_rows),
        ]
    )


def evaluate_rule(rows: list[SideRow], predicate: Callable[[SideRow], bool]) -> dict[str, tuple[int, float, int, float]]:
    result: dict[str, tuple[int, float, int, float]] = {}
    for split in ("reserve", "current", "combined"):
        subset = rows if split == "combined" else [row for row in rows if row.split == split]
        kept = [row for row in subset if not predicate(row)]
        passed = [row for row in subset if predicate(row)]
        result[split] = (len(kept), hit_rate(kept), len(passed), hit_rate(passed))
    return result


def format_rule_backtests(rows: list[SideRow]) -> str:
    rules: list[tuple[str, str, Callable[[SideRow], bool], str]] = [
        (
            "High-volatility edge control v1",
            "Pass if `volatility >= 86 && pointEdge >= 10 && (late stability <= 48 || starter leverage >= 75)`",
            lambda row: row.volatility >= 86
            and row.point_edge >= 10
            and (
                row.late_inning_stability_index <= 48
                or row.starter_leverage_index >= 75
            ),
            "Best simple pass rule that improved both the reserve window and the current window without collapsing coverage.",
        ),
        (
            "Thin-support high edge",
            "Pass if `pointEdge >= 12 && inputCount <= 3`",
            lambda row: row.point_edge >= 12 and row.input_count <= 3,
            "Useful penalty flag, but too blunt to use as a full pass rule by itself.",
        ),
        (
            "Extreme volatility giant edge",
            "Pass if `volatility >= 90 && pointEdge >= 15`",
            lambda row: row.volatility >= 90 and row.point_edge >= 15,
            "Small sample, but these are exactly the scary false-control spots we keep remembering.",
        ),
        (
            "Risk points `>= 3`",
            "Flag as dangerous if 3+ of: `vol>=88`, `edge>=12`, `late<=45`, `starter>=85`, `coin>=50`, `relief>=65`, `inputs<=3`",
            lambda row: sum(
                (
                    row.volatility >= 88,
                    row.point_edge >= 12,
                    row.late_inning_stability_index <= 45,
                    row.starter_leverage_index >= 85,
                    row.coinflip_pressure >= 50,
                    row.relief_pitching_risk >= 65,
                    row.input_count <= 3,
                )
            )
            >= 3,
            "Much more useful as a confidence classifier than a blanket pass rule. The kept bucket becomes a strong candidate for `Core`/`Lean` only.",
        ),
    ]

    sections: list[str] = []
    for name, description, predicate, note in rules:
        evaluated = evaluate_rule(rows, predicate)
        table_rows: list[list[str]] = []
        for split_label, label in (
            ("reserve", "Reserve"),
            ("current", "Current"),
            ("combined", "Combined"),
        ):
            kept_count, kept_rate, passed_count, passed_rate = evaluated[split_label]
            table_rows.append(
                [
                    label,
                    str(kept_count),
                    f"{kept_rate:.3f}",
                    str(passed_count),
                    f"{passed_rate:.3f}",
                ]
            )
        sections.append(
            f"### {name}\n\n"
            f"{description}\n\n"
            f"{markdown_table(['Window', 'Kept', 'Kept hit rate', 'Passed', 'Passed hit rate'], table_rows)}\n\n"
            f"Note: {note}"
        )
    return "\n\n".join(sections)


def format_warehouse_inventory(conn: sqlite3.Connection) -> str:
    pa_rows = conn.execute("SELECT COUNT(*) FROM mlb_plate_appearances").fetchone()[0]
    pitch_rows = conn.execute("SELECT COUNT(*) FROM mlb_pitch_events").fetchone()[0]
    story_games = conn.execute("SELECT COUNT(*) FROM mlb_game_story_signals").fetchone()[0]
    pa_range = conn.execute("SELECT MIN(game_date), MAX(game_date) FROM mlb_plate_appearances").fetchone()
    pitch_range = conn.execute("SELECT MIN(game_date), MAX(game_date) FROM mlb_pitch_events").fetchone()
    return "\n".join(
        [
            "- `mlb_game_story_signals`: "
            f"{story_games} games from `{conn.execute('SELECT MIN(game_date), MAX(game_date) FROM mlb_game_story_signals').fetchone()[0]}` "
            f"through `{conn.execute('SELECT MIN(game_date), MAX(game_date) FROM mlb_game_story_signals').fetchone()[1]}`",
            f"- `mlb_plate_appearances`: {pa_rows} rows from `{pa_range[0]}` through `{pa_range[1]}`",
            f"- `mlb_pitch_events`: {pitch_rows} rows from `{pitch_range[0]}` through `{pitch_range[1]}`",
            "- The pitch table already includes `balls`, `strikes`, `pitch type`, `call`, `zone`, `velocity`, and `in-play` flags.",
            "- The plate-appearance table already includes `base state`, `score before/after`, `inning`, `starter vs relief context` (via pitcher appearances), and scoring deltas.",
        ]
    )


def format_tier_roadmap() -> str:
    return "\n\n".join(
        [
            """## Tier 1: Highest-Value Features To Add Now

- **High-volatility edge haircut**
  Apply a post-edge control rule before surfacing a side as strong. The best simple rule from this pass was:
  `volatility >= 86 && pointEdge >= 10 && (late stability <= 48 || starter leverage >= 75)`.
- **Starter-vs-full-game split penalty**
  Penalize games where `starterLeverageIndex` is high but `lateInningStabilityIndex` is weak. This is the cleanest immediate way to stop starter edge from pretending to be full-game certainty.
- **Thin-support penalty**
  If a large edge is being built from only 2-3 inputs, shave confidence and edge before ranking it. Big edges need a richer evidence stack than `Starter ERA + Projected hit volume + Market price`.
- **Pass / lean / core classifier**
  Use the risk-points approach as a labeler, not just a pass rule:
  - low risk: eligible for `Core`
  - medium risk: `Lean`
  - high risk: `Pass` or `watchlist`
- **Opponent-adjusted recent form**
  We already have rolling form tables. The next improvement is to stop treating “hot against weak arms” the same as “hot against real rotations”.
""",
            """## Tier 2: Medium-Lift Features From Existing Warehouse Data

- **Rolling story priors by team**
  From `mlb_game_story_signals`, build team-level trailing rates for:
  - quiet through five
  - first-inning jolts
  - comeback wins / blown leads
  - bullpen flips
  - traffic-without-conversion
- **Lineup dependency concentration**
  Use `mlb_player_game_batting` to measure how much production is concentrated in 2-3 bats. Teams that overdepend on a few players should be downgraded when those hitters are in bad pitch-type or leverage spots.
- **Starter leash profile**
  Turn recent starts into a numeric expected-leash feature:
  - pitch count trend
  - innings trend
  - short-start frequency
  - return / rehab / call-up penalty
- **Bullpen chain mismatch**
  We already export likely bridge chains. Next step is to score whether the predicted scoring environment is relying on exactly the bullpen archetype the opponent handles well.
- **Series / divisional familiarity**
  Add simple categorical context for division series, getaway day, and repeat-opponent familiarity. This is not magic, but it is a cheap contextual feature we currently underuse.
""",
            """## Tier 3: Big Warehouse / Play-By-Play Features

- **Reliever first-batter command**
  From `mlb_pitch_events`, track what happens in a reliever’s first 5 pitches and first batter after entry:
  - early balls
  - first-pitch strike rate
  - zone misses
  - chase vs non-chase contact
- **First-inning approach profile**
  By lineup and team:
  - first-pitch take rate
  - first-inning swing-and-miss rate
  - first-inning hard contact vs empty contact
- **Third-time-through trouble**
  Use plate appearances and pitcher appearances to tag when starters truly fall off the second/third time through.
- **Pitch-type trigger features**
  Build specific “when” features:
  - lineup patience vs fastball-heavy starters
  - changeup / slider trouble once bullpens enter
  - where strike-throwing falls apart after a pitcher mix change
- **Base-state conversion**
  Move beyond average offense into event-state offense:
  - runners-on conversion
  - empty-base padding vs leverage hitting
  - traffic-without-conversion as a recurring team trait
""",
        ]
    )


def write_report(out_path: Path) -> None:
    conn = get_connection()
    reserve = load_reserve_rows(conn)
    current = load_current_rows()
    rows = reserve + current

    report = f"""# MLB Feature Roadmap 05-22-26

## Goal

Use the current data more intelligently before we change the live model. The goal of this pass is:

1. improve edge control with the data we already have
2. use the new warehouse to build script-risk features
3. use event-state data to find the `when` triggers
4. make the model better at saying `pass`

## Dataset Windows Used

This pass intentionally uses two windows:

- **Reserve window**: `2026-05-10` through `2026-05-15` from the older `board-moneyline-v2` backtest tables
- **Current window**: `2026-05-16` through `2026-05-22` from the current graded history archive

That split is not perfect, but it is useful:

- the reserve window gives us older held-out games
- the current window tells us how the more recent model behavior is breaking now

{format_dataset_summary(rows)}

## Current Input Map

The side model is already using more than just “starter + weather + recent form.” Current live inputs effectively include:

- starter quality and recent starter form
- short-start / hold / leash shape
- lineup matchup context and platoon pressure
- likely bridge chain and bullpen exhaustion
- market price and totals context
- park and weather
- Statcast contact quality
- projected hit volume through first five, late game, and bridge window
- volatility modifiers and decision indicators

That is enough to create a **probabilistic edge**, but not enough to trust every large edge without stronger script control.

## What The Current Data Already Says

{format_bucket_analysis(rows)}

## Backtest: Candidate Edge-Control Rules

These are not live model changes yet. They are research overlays on top of the existing prediction outputs.

{format_rule_backtests(rows)}

## Warehouse Feature Inventory

{format_warehouse_inventory(conn)}

{format_tier_roadmap()}

## Recommended Order

1. Add the **Tier 1 edge-control overlays** first and backtest them before changing any deeper scoring.
2. Build **rolling story priors** and **lineup dependency concentration** next.
3. Start mining event-state features only after the pass/lean/core classifier is behaving better.

## Best Immediate Experiment

The best first production experiment from this pass is:

1. add a high-volatility edge-control rule
2. turn the risk-point stack into a `Core / Lean / Pass` classifier
3. backtest that classifier against the reserve window before changing the raw side scores

This is the cleanest way to use the new warehouse depth without pretending we are ready for a full play-by-play model rewrite yet.
"""
    out_path.write_text(report, encoding="utf-8")
    print(f"Wrote {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate an MLB side-model feature roadmap from current backtests.")
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUT,
        help="Path to write the markdown report.",
    )
    args = parser.parse_args()
    write_report(args.out)


if __name__ == "__main__":
    main()

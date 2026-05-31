#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
HISTORY_DIR = ROOT / "data-private" / "history"
DEFAULT_OUT = ROOT / "development-docs" / "mlb" / "research" / "market-divergence-research-052326.md"


@dataclass
class MarketRow:
    split: str
    date: str
    matchup: str
    pick_team: str
    opponent_team: str
    hit: int
    confidence: int
    volatility: int
    point_edge: float
    market_probability: float | None
    market_american_odds: int | None
    opponent_market_probability: float | None
    pick_is_market_favorite: bool | None
    market_price_gap: float | None
    starter_leverage_index: float | None
    late_inning_stability_index: float | None
    tier_one_pass_flag: bool
    stateful_opponent_snapback_trap_flag: bool


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def safe_rate(rows: list[MarketRow]) -> float:
    return round(sum(row.hit for row in rows) / len(rows), 3) if rows else 0.0


def american_profit(odds: int) -> float:
    if odds > 0:
        return odds / 100.0
    if odds < 0:
        return 100.0 / abs(odds)
    return 0.0


def flat_unit_roi(rows: list[MarketRow]) -> float | None:
    roi_sum = 0.0
    graded = 0
    for row in rows:
        if row.market_american_odds is None:
            continue
        graded += 1
        roi_sum += american_profit(row.market_american_odds) if row.hit else -1.0
    if graded == 0:
        return None
    return round(roi_sum / graded, 3)


def probability_bucket(probability: float | None) -> str:
    if probability is None:
        return "missing"
    if probability < 0.45:
        return "<45%"
    if probability < 0.50:
        return "45-49.9%"
    if probability < 0.55:
        return "50-54.9%"
    if probability < 0.60:
        return "55-59.9%"
    if probability < 0.65:
        return "60-64.9%"
    return "65%+"


def parse_bool(value) -> bool:
    return bool(value)


def parse_float(value) -> float | None:
    if value is None:
        return None
    return float(value)


def parse_int(value) -> int | None:
    if value is None:
        return None
    return int(value)


def build_row_from_saved(record: sqlite3.Row) -> MarketRow:
    indicators = json.loads(record["metadata_json"] or "{}")
    predicted_side = record["predicted_side"]
    opponent_team = record["home_team"] if predicted_side == "away" else record["away_team"]
    return MarketRow(
        split="reserve",
        date=record["prediction_date"],
        matchup=record["game_title"],
        pick_team=record["predicted_team"],
        opponent_team=opponent_team,
        hit=int(record["hit_full_game"]),
        confidence=int(record["confidence"] or 0),
        volatility=int(record["volatility"] or 0),
        point_edge=float(record["model_edge"] or 0.0),
        market_probability=parse_float(indicators.get("marketProbability")),
        market_american_odds=parse_int(indicators.get("marketAmericanOdds")),
        opponent_market_probability=parse_float(indicators.get("opponentMarketProbability")),
        pick_is_market_favorite=(
            parse_bool(indicators.get("pickIsMarketFavorite"))
            if indicators.get("pickIsMarketFavorite") is not None
            else None
        ),
        market_price_gap=parse_float(indicators.get("marketPriceGap")),
        starter_leverage_index=parse_float(indicators.get("starterLeverageIndex")),
        late_inning_stability_index=parse_float(indicators.get("lateInningStabilityIndex")),
        tier_one_pass_flag=parse_bool(indicators.get("tierOnePassFlag")),
        stateful_opponent_snapback_trap_flag=parse_bool(indicators.get("statefulOpponentSnapbackTrapFlag")),
    )


def load_reserve_rows(conn: sqlite3.Connection) -> list[MarketRow]:
    rows = conn.execute(
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
    ).fetchall()
    return [build_row_from_saved(record) for record in rows]


def build_row_from_history(record: dict[str, object]) -> MarketRow | None:
    if record.get("sport") != "MLB" or record.get("marketType") != "moneyline":
        return None
    return MarketRow(
        split="current",
        date=str(record["date"]),
        matchup=str(record.get("matchup") or ""),
        pick_team=str(record.get("predictedPick") or ""),
        opponent_team=str(record.get("homeTeam") if record.get("predictedSide") == "away" else record.get("awayTeam")),
        hit=1 if record.get("result", {}).get("fullGameHit") else 0,
        confidence=int(record.get("confidence") or 0),
        volatility=int(record.get("volatility") or 0),
        point_edge=float(record.get("pointEdge") or 0.0),
        market_probability=parse_float(record.get("marketProbability")),
        market_american_odds=parse_int(record.get("marketAmericanOdds")),
        opponent_market_probability=parse_float(record.get("opponentMarketProbability")),
        pick_is_market_favorite=(
            parse_bool(record.get("pickIsMarketFavorite"))
            if record.get("pickIsMarketFavorite") is not None
            else None
        ),
        market_price_gap=parse_float(record.get("marketPriceGap")),
        starter_leverage_index=parse_float(record.get("indicators", {}).get("starterLeverageIndex")),
        late_inning_stability_index=parse_float(record.get("indicators", {}).get("lateInningStabilityIndex")),
        tier_one_pass_flag=parse_bool(record.get("indicators", {}).get("tierOnePassFlag")),
        stateful_opponent_snapback_trap_flag=parse_bool(
            record.get("indicators", {}).get("statefulOpponentSnapbackTrapFlag")
        ),
    )


def load_current_rows() -> list[MarketRow]:
    rows: list[MarketRow] = []
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
            row = build_row_from_history(json.loads(line))
            if row:
                rows.append(row)
    return rows


def summarize_rows(rows: list[MarketRow]) -> dict[str, float | int | None]:
    return {
        "count": len(rows),
        "hit_rate": safe_rate(rows),
        "roi": flat_unit_roi(rows),
    }


def format_summary_row(label: str, rows: list[MarketRow]) -> list[str]:
    summary = summarize_rows(rows)
    roi = summary["roi"]
    return [
        label,
        summary["count"],
        summary["hit_rate"],
        "n/a" if roi is None else roi,
    ]


def price_bucket_table(rows: list[MarketRow], split_name: str) -> str:
    buckets = ["<45%", "45-49.9%", "50-54.9%", "55-59.9%", "60-64.9%", "65%+"]
    table_rows = []
    for bucket in buckets:
        bucket_rows = [row for row in rows if probability_bucket(row.market_probability) == bucket]
        if not bucket_rows:
            continue
        table_rows.append(format_summary_row(bucket, bucket_rows))
    return f"### {split_name}\n\n" + markdown_table(
        ["Market price bucket", "Picks", "Hit rate", "Flat-unit ROI"],
        table_rows,
    )


def candidate_lane_table(reserve_rows: list[MarketRow], current_rows: list[MarketRow]) -> str:
    def moderate_favorite_clean(row: MarketRow) -> bool:
        return (
            row.market_probability is not None
            and 0.54 <= row.market_probability < 0.63
            and not row.tier_one_pass_flag
            and not row.stateful_opponent_snapback_trap_flag
            and (row.late_inning_stability_index or 0) >= 45
        )

    def heavy_favorite_risk(row: MarketRow) -> bool:
        return (
            row.market_probability is not None
            and row.market_probability >= 0.63
            and (
                row.tier_one_pass_flag
                or row.stateful_opponent_snapback_trap_flag
                or (row.volatility or 0) >= 84
            )
        )

    def market_underdog_bet(row: MarketRow) -> bool:
        return row.pick_is_market_favorite is False

    lanes = [
        ("Moderate favorite clean", moderate_favorite_clean),
        ("Heavy favorite danger", heavy_favorite_risk),
        ("Market underdog bets", market_underdog_bet),
        ("70+ confidence", lambda row: row.confidence >= 70),
        ("70+ confidence market dogs", lambda row: row.confidence >= 70 and row.pick_is_market_favorite is False),
    ]

    table_rows: list[list[str]] = []
    for label, rule in lanes:
        reserve_bucket = [row for row in reserve_rows if rule(row)]
        current_bucket = [row for row in current_rows if rule(row)]
        combined_bucket = reserve_bucket + current_bucket
        reserve_roi = flat_unit_roi(reserve_bucket)
        current_roi = flat_unit_roi(current_bucket)
        combined_roi = flat_unit_roi(combined_bucket)
        table_rows.append(
            [
                label,
                len(reserve_bucket),
                safe_rate(reserve_bucket),
                "n/a" if reserve_roi is None else reserve_roi,
                len(current_bucket),
                safe_rate(current_bucket),
                "n/a" if current_roi is None else current_roi,
                len(combined_bucket),
                safe_rate(combined_bucket),
                "n/a" if combined_roi is None else combined_roi,
            ]
        )

    return markdown_table(
        [
            "Lane",
            "Reserve n",
            "Reserve hit",
            "Reserve ROI",
            "Current n",
            "Current hit",
            "Current ROI",
            "Combined n",
            "Combined hit",
            "Combined ROI",
        ],
        table_rows,
    )


def write_report(out_path: Path) -> None:
    conn = get_connection()
    reserve_rows = load_reserve_rows(conn)
    current_rows = load_current_rows()
    combined_rows = reserve_rows + current_rows

    overall_table = markdown_table(
        ["Split", "Picks", "Hit rate", "Flat-unit ROI"],
        [
            format_summary_row("Reserve (05-10 to 05-15)", reserve_rows),
            format_summary_row("Current (05-16 to 05-22)", current_rows),
            format_summary_row("Combined", combined_rows),
        ],
    )

    high_confidence_rows = [row for row in combined_rows if row.confidence >= 70]
    high_confidence_summary = summarize_rows(high_confidence_rows)

    report = f"""# MLB Market Divergence Research — May 23, 2026

## Goal

Treat the betting line like the market anchor and figure out **when our deterministic board is allowed to disagree with it**.

This is not asking “who wins more often.” It is asking:

- where does the board beat price instead of just agreeing with expensive favorites?
- which favorite buckets are actually worth paying for?
- where should disagreement with the market require extra evidence?

## Overall Moneyline Snapshot

{overall_table}

## Price Buckets

{price_bucket_table(reserve_rows, "Reserve (05-10 to 05-15)")}

{price_bucket_table(current_rows, "Current (05-16 to 05-22)")}

{price_bucket_table(combined_rows, "Combined")}

## Candidate Market Lanes

{candidate_lane_table(reserve_rows, current_rows)}

## High-Confidence Context

`70+` confidence combined:
- picks: `{high_confidence_summary["count"]}`
- hit rate: `{high_confidence_summary["hit_rate"]}`
- flat-unit ROI: `{"n/a" if high_confidence_summary["roi"] is None else high_confidence_summary["roi"]}`

## Read

- The market should be treated as the baseline, not something we casually overrule.
- Heavy favorites can still produce decent hit rates while being weak or negative in flat-unit ROI terms.
- Moderate favorite ranges are more likely to be playable when the state/risk layer is clean.
- Market underdog picks need stricter promotion rules than simple composite agreement.
- The correct future model is probably a **disagreement budget**, not a raw “bigger edge means better bet” rule.

## Draft Disagreement Budget

1. If the pick is a heavy market favorite (`65%+` implied), require clean state/risk support before allowing a large edge.
2. If the pick is a moderate favorite (`54-63%` implied), allow modest disagreement when Tier 1 / snapback risk are clean.
3. If the pick is a market underdog, require stronger evidence than current broad composite agreement before calling it a core edge.
4. Use hit rate **and** flat-unit ROI together. A high win rate that loses to price is not an edge.
5. This budget should be separate by market type:
   - full game
   - first five
   - first inning later
"""

    out_path.write_text(report, encoding="utf-8")
    print(f"Wrote market-divergence research -> {out_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    write_report(Path(args.out))


if __name__ == "__main__":
    main()

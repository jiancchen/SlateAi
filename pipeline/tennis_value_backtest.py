#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PUBLISHED = ROOT / "published-data" / "slates"
REPORTS = ROOT / "data-private" / "reports"


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def normalize(value: str | None) -> str:
    value = value or ""
    value = re.sub(r"[^a-zA-Z0-9]+", " ", value).strip().lower()
    return re.sub(r"\s+", " ", value)


def american_profit(odds: Any) -> float | None:
    try:
        odds_value = float(odds)
    except (TypeError, ValueError):
        return None
    if not odds_value:
        return None
    return odds_value if odds_value > 0 else 10000 / abs(odds_value)


def ev_per_100(model_pct: Any, odds: Any) -> float | None:
    profit = american_profit(odds)
    try:
        probability = float(model_pct) / 100
    except (TypeError, ValueError):
        return None
    if profit is None or not math.isfinite(probability):
        return None
    return round(probability * profit - (1 - probability) * 100, 1)


def score_totals(score: dict[str, Any] | None) -> tuple[int | None, int | None, int, int]:
    if not score:
        return None, None, 0, 0
    home = score.get("home") or {}
    away = score.get("away") or {}
    home_games = away_games = home_sets = away_sets = 0
    for index in range(1, 6):
      h = home.get(f"period{index}")
      a = away.get(f"period{index}")
      if h is None or a is None:
          continue
      try:
          h_int = int(h)
          a_int = int(a)
      except (TypeError, ValueError):
          continue
      home_games += h_int
      away_games += a_int
      if h_int > a_int:
          home_sets += 1
      elif a_int > h_int:
          away_sets += 1
    if home_sets + away_sets == 0 and home_games + away_games == 0:
        return None, None, 0, 0
    return home_games, away_games, home_sets, away_sets


def value_grade(edge: Any, ev: Any) -> str:
    try:
        edge_value = float(edge)
        ev_value = float(ev)
    except (TypeError, ValueError):
        return "No price"
    if edge_value >= 7 and ev_value >= 8:
        return "Bet-grade value"
    if edge_value >= 3 and ev_value > 0:
        return "Thin value"
    if edge_value <= -4 or ev_value < -4:
        return "Negative EV"
    return "Near fair"


def warehouse_for(game: dict[str, Any], warehouse_context: dict[str, Any]) -> dict[str, Any]:
    embedded = ((game.get("tennisContext") or {}).get("warehouseContext") or {})
    return embedded or (warehouse_context.get("matches") or {}).get(game.get("id"), {}) or {}


def winner_from_game(game: dict[str, Any], warehouse_context: dict[str, Any]) -> str | None:
    warehouse = warehouse_for(game, warehouse_context)
    score = warehouse.get("score")
    h2h = warehouse.get("h2h") or {}
    home_games, away_games, home_sets, away_sets = score_totals(score)
    if home_sets == away_sets:
        return None
    return h2h.get("homeName") if home_sets > away_sets else h2h.get("awayName")


def market_rows(game: dict[str, Any]) -> list[dict[str, Any]]:
    context = game.get("tennisContext") or {}
    rows = []
    for entry in context.get("derivativeMarkets") or []:
        label = entry.get("label")
        if label not in {"ML", "Spread", "O/U"}:
            continue
        value_text = str(entry.get("value") or "")
        lean_text = str(entry.get("lean") or "")
        parsed_selection = entry.get("selection") or (game.get("analysis") or {}).get("participant", {}).get("name")
        parsed_line = entry.get("line")
        parsed_odds = entry.get("americanOdds")
        if label == "ML" and parsed_odds is None:
            odds_match = re.search(r"([+-]\d{3,4})\b", value_text)
            if odds_match:
                parsed_odds = int(odds_match.group(1))
        if label == "Spread":
            spread_match = re.search(r"(.+?)\s+([+-]\d+(?:\.\d+)?)\s+\(([+-]\d{3,4})\)", value_text)
            if spread_match:
                parsed_selection = spread_match.group(1).strip()
                parsed_line = float(spread_match.group(2))
                parsed_odds = int(spread_match.group(3))
        if label == "O/U":
            if re.search(r"\bunder\b", f"{lean_text} {value_text}", re.I):
                parsed_selection = "Under"
            elif re.search(r"\bover\b", f"{lean_text} {value_text}", re.I):
                parsed_selection = "Over"
            total_match = re.search(r"(\d+(?:\.\d+)?)", value_text)
            if total_match:
                parsed_line = float(total_match.group(1))
            odds_match = re.search(rf"{parsed_selection}\s+([+-]\d{{3,4}})", value_text, re.I) if parsed_selection in {"Over", "Under"} else None
            if odds_match:
                parsed_odds = int(odds_match.group(1))
        edge = entry.get("edgePct")
        ev = entry.get("evPer100")
        if ev is None and parsed_odds is not None:
            ev = ev_per_100(entry.get("modelPct") or entry.get("confidence"), parsed_odds)
        rows.append(
            {
                "matchId": game.get("id"),
                "match": game.get("title"),
                "market": label,
                "selection": parsed_selection,
                "line": parsed_line,
                "odds": parsed_odds,
                "modelPct": entry.get("modelPct") or entry.get("confidence"),
                "edgePct": edge,
                "evPer100": ev,
                "valueGrade": entry.get("valueGrade") or value_grade(edge, ev),
                "betGrade": bool(entry.get("betGrade")),
                "raw": entry,
            }
        )
    return rows


def grade_row(game: dict[str, Any], row: dict[str, Any], warehouse_context: dict[str, Any]) -> dict[str, Any]:
    context = game.get("tennisContext") or {}
    warehouse = warehouse_for(game, warehouse_context)
    h2h = warehouse.get("h2h") or {}
    score = warehouse.get("score")
    home_games, away_games, home_sets, away_sets = score_totals(score)
    winner = winner_from_game(game, warehouse_context)
    selection = row.get("selection")
    result = None
    if row["market"] == "ML":
        if winner:
            result = normalize(selection) == normalize(winner)
    elif row["market"] == "Spread":
        if home_games is not None and row.get("line") is not None:
            selection_is_home = normalize(selection) == normalize(h2h.get("homeName"))
            selected_games = home_games if selection_is_home else away_games
            other_games = away_games if selection_is_home else home_games
            result = selected_games + float(row["line"]) > other_games
    elif row["market"] == "O/U":
        if home_games is not None and row.get("line") is not None and row.get("selection") in {"Over", "Under"}:
            total_games = home_games + away_games
            result = total_games > float(row["line"]) if row["selection"] == "Over" else total_games < float(row["line"])
    profit = american_profit(row.get("odds"))
    pnl = None
    if result is True and profit is not None:
        pnl = round(profit, 1)
    elif result is False and profit is not None:
        pnl = -100.0
    return {
        **row,
        "winner": winner,
        "homeGames": home_games,
        "awayGames": away_games,
        "homeSets": home_sets,
        "awaySets": away_sets,
        "graded": result is not None,
        "hit": result,
        "pnlPer100": pnl,
    }


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    buckets: dict[str, Any] = {}
    for key in ["ML", "Spread", "O/U", "Bet-grade value", "Thin value", "Negative EV", "Near fair"]:
        subset = [row for row in rows if row["market"] == key or row.get("valueGrade") == key]
        graded = [row for row in subset if row.get("graded")]
        if not subset:
            continue
        pnl = sum(row.get("pnlPer100") or 0 for row in graded)
        hits = sum(1 for row in graded if row.get("hit"))
        buckets[key] = {
            "rows": len(subset),
            "graded": len(graded),
            "hits": hits,
            "hitRate": round(hits / len(graded), 3) if graded else None,
            "pnlPer100": round(pnl, 1),
            "roi": round(pnl / (100 * len(graded)), 3) if graded else None,
        }
    return buckets


def main() -> None:
    parser = argparse.ArgumentParser(description="Backtest tennis value rows from published slate data.")
    parser.add_argument("--date", required=True)
    parser.add_argument("--output", default="")
    args = parser.parse_args()
    games_dir = PUBLISHED / args.date / "games"
    warehouse_path = ROOT / "web" / "src" / "lib" / f"day-{args.date}-tennis-warehouse-context.generated.json"
    warehouse_context = read_json(warehouse_path) if warehouse_path.exists() else {"matches": {}}
    rows = []
    for path in sorted(games_dir.glob("*.json")):
        game = read_json(path)
        if game.get("league") != "Tennis":
            continue
        for row in market_rows(game):
            rows.append(grade_row(game, row, warehouse_context))
    report = {"date": args.date, "rows": rows, "summary": summarize(rows)}
    output = Path(args.output) if args.output else REPORTS / f"tennis-value-backtest-{args.date}.json"
    if not output.is_absolute():
        output = ROOT / output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], indent=2, sort_keys=True))
    print(f"Wrote {len(rows)} value rows to {output.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

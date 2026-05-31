#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
SLATE_GAMES_DIR = ROOT / "published-data" / "slates"
KALSHI_JSON = ROOT / "web" / "src" / "lib" / "kalshi-mlb-markets.generated.json"
OUT_DIR = ROOT / "development-docs"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze how Kalshi MLB snapshot data changes the shape of a current slate.")
    parser.add_argument("--date", required=True, help="Slate date in YYYY-MM-DD format.")
    return parser.parse_args()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text("utf-8"))


def to_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def load_games(iso_date: str) -> list[dict[str, Any]]:
    game_dir = SLATE_GAMES_DIR / iso_date / "games"
    rows: list[dict[str, Any]] = []
    for path in sorted(game_dir.glob("*.json")):
        payload = load_json(path)
        if payload.get("league") == "MLB":
            rows.append(payload)
    return rows


def get_first_inning_market(kalshi_by_game: dict[str, Any], game_id: str) -> dict[str, Any] | None:
    return (kalshi_by_game.get(game_id) or {}).get("firstInning")


def get_total_market(kalshi_by_game: dict[str, Any], game_id: str) -> dict[str, Any] | None:
    return ((kalshi_by_game.get(game_id) or {}).get("total") or {}).get("selected")


def get_first5_total_market(kalshi_by_game: dict[str, Any], game_id: str) -> dict[str, Any] | None:
    return ((kalshi_by_game.get(game_id) or {}).get("first5Total") or {}).get("selected")


def classify_shape(first_inning: dict[str, Any], totals: dict[str, Any]) -> str:
    yes_pct = to_float(first_inning.get("yesProbabilityPct")) or 0.0
    no_pct = to_float(first_inning.get("noProbabilityPct")) or 0.0
    fg_edge = to_float(((totals.get("fullGame") or {}).get("edge"))) or 0.0
    fg_label = str(((totals.get("fullGame") or {}).get("label")) or "")
    f5_edge = to_float(((totals.get("first5") or {}).get("edge"))) or 0.0
    f5_label = str(((totals.get("first5") or {}).get("label")) or "")

    if yes_pct >= 60 and fg_edge <= -0.8 and "Under" in fg_label:
        return "front-loaded under"
    if no_pct >= 55 and fg_edge <= -0.8 and "Under" in fg_label:
        return "quiet under"
    if yes_pct >= 60 and fg_edge >= 0.8 and "Over" in fg_label:
        return "full-game run ladder"
    if yes_pct >= 70 and f5_edge >= 0.6 and "Over" in f5_label:
        return "fast-start over"
    if yes_pct >= 70 and fg_edge <= -0.8 and "Under" in fg_label:
        return "early jolt / late fade"
    return "mixed"


def analyze_game(game: dict[str, Any], kalshi_by_game: dict[str, Any]) -> dict[str, Any] | None:
    proj = ((game.get("analysis") or {}).get("mlbProjection")) or {}
    first_inning = proj.get("firstInning") or {}
    totals = proj.get("totals") or {}
    fi_market = get_first_inning_market(kalshi_by_game, game["id"]) or {}
    total_market = get_total_market(kalshi_by_game, game["id"]) or {}
    f5_total_market = get_first5_total_market(kalshi_by_game, game["id"]) or {}
    if not first_inning or not fi_market:
        return None

    yes_pct = to_float(first_inning.get("yesProbabilityPct"))
    no_pct = to_float(first_inning.get("noProbabilityPct"))
    away_pct = to_float(first_inning.get("awayRunProbabilityPct"))
    home_pct = to_float(first_inning.get("homeRunProbabilityPct"))
    yrfi_ask = to_float(fi_market.get("yesAskCents"))
    nrfi_ask = to_float(fi_market.get("noAskCents"))
    open_interest = to_float(fi_market.get("openInterest"))
    volume = to_float(fi_market.get("volume"))
    if yes_pct is None or no_pct is None or away_pct is None or home_pct is None:
        return None

    fair_post_top_nrfi = 100.0 - home_pct
    max_entry_for_70 = (100.0 - away_pct) * 0.70

    return {
        "title": game.get("title"),
        "gameId": game.get("id"),
        "shape": classify_shape(first_inning, totals),
        "fiPick": first_inning.get("pick"),
        "fiYesPct": yes_pct,
        "fiNoPct": no_pct,
        "awayPct": away_pct,
        "homePct": home_pct,
        "yrfiAsk": yrfi_ask,
        "nrfiAsk": nrfi_ask,
        "yrfiEdge": None if yrfi_ask is None else yes_pct - yrfi_ask,
        "nrfiEdge": None if nrfi_ask is None else no_pct - nrfi_ask,
        "postTopFairNrfi": fair_post_top_nrfi,
        "maxEntryFor70": max_entry_for_70,
        "scalpEdgeAt70": None if nrfi_ask is None else max_entry_for_70 - nrfi_ask,
        "fgLabel": ((totals.get("fullGame") or {}).get("label")),
        "fgEdge": to_float(((totals.get("fullGame") or {}).get("edge"))),
        "f5Label": ((totals.get("first5") or {}).get("label")),
        "f5Edge": to_float(((totals.get("first5") or {}).get("edge"))),
        "kalshiTotalLabel": total_market.get("label"),
        "kalshiTotalOverAsk": to_float(total_market.get("yesAskCents")),
        "kalshiTotalUnderAsk": to_float(total_market.get("noAskCents")),
        "kalshiF5Label": f5_total_market.get("label"),
        "kalshiF5OverAsk": to_float(f5_total_market.get("yesAskCents")),
        "kalshiF5UnderAsk": to_float(f5_total_market.get("noAskCents")),
        "openInterest": open_interest,
        "volume": volume,
    }


def fmt_pts(value: float | None) -> str:
    if value is None:
        return "n/a"
    return f"{value:+.1f} pts"


def fmt_cents(value: float | None) -> str:
    if value is None:
        return "n/a"
    return f"{value:.0f}c"


def build_markdown(iso_date: str, rows: list[dict[str, Any]]) -> str:
    top_scalps = sorted(
        [row for row in rows if row.get("scalpEdgeAt70") is not None],
        key=lambda row: row["scalpEdgeAt70"],
        reverse=True,
    )[:5]
    top_divergence = sorted(
        [row for row in rows if row.get("yrfiEdge") is not None],
        key=lambda row: abs(row["yrfiEdge"]),
        reverse=True,
    )[:5]
    shapes = {}
    for row in rows:
        shapes.setdefault(row["shape"], []).append(row)

    lines: list[str] = []
    lines.append(f"# MLB Kalshi Market Shape - {iso_date}")
    lines.append("")
    lines.append("This report compares the current MLB board to the live Kalshi snapshot for the same slate. The goal is not to treat Kalshi as the truth; it is to see whether the market adds a new dimension to game shape, first-inning scalp logic, or pricing disagreement.")
    lines.append("")
    lines.append("## What Kalshi adds")
    lines.append("")
    lines.append("- executable first-inning entry prices instead of generic 50/50 assumptions")
    lines.append("- cross-market shape: `1st inning`, `F5 total`, and `full-game total` all at once")
    lines.append("- liquidity context from `open interest` and `volume`")
    lines.append("- a disagreement layer when our model is much hotter or colder than the market")
    lines.append("")
    lines.append("## Best current NRFI scalp lanes")
    lines.append("")
    lines.append("These are sorted by the edge between the current `NO` ask and a simple `70c` exit after a scoreless top assumption.")
    lines.append("")
    for row in top_scalps:
        lines.append(
            f"- `{row['title']}`: `NO ask {fmt_cents(row['nrfiAsk'])}` vs `max entry {fmt_cents(row['maxEntryFor70'])}` for a `70c` exit, edge `{fmt_pts(row['scalpEdgeAt70'])}`. "
            f"Model split: away `{row['awayPct']:.1f}%`, home `{row['homePct']:.1f}%`, post-top fair `NO {row['postTopFairNrfi']:.1f}%`."
        )
    lines.append("")
    lines.append("## Biggest first-inning market disagreements")
    lines.append("")
    lines.append("These are the largest gaps between our current `YRFI/NRFI` probability split and the live Kalshi ask.")
    lines.append("")
    for row in top_divergence:
        lines.append(
            f"- `{row['title']}`: model `{row['fiPick']} {row['fiYesPct']:.1f}% / {row['fiNoPct']:.1f}%`, Kalshi `YRFI {fmt_cents(row['yrfiAsk'])} / NRFI {fmt_cents(row['nrfiAsk'])}`. "
            f"Edges: `YRFI {fmt_pts(row['yrfiEdge'])}`, `NRFI {fmt_pts(row['nrfiEdge'])}`."
        )
    lines.append("")
    lines.append("## Shape archetypes on this slate")
    lines.append("")
    for label in ("front-loaded under", "quiet under", "full-game run ladder", "fast-start over", "early jolt / late fade", "mixed"):
        entries = shapes.get(label) or []
        if not entries:
            continue
        lines.append(f"### {label.title()}")
        lines.append("")
        for row in entries[:6]:
            lines.append(
                f"- `{row['title']}`: `1st {row['fiPick']} {row['fiYesPct']:.1f}/{row['fiNoPct']:.1f}`, "
                f"`FG {row['fgLabel']} ({row['fgEdge']:+.1f})`, `F5 {row['f5Label']} ({(row['f5Edge'] or 0):+.1f})`, "
                f"Kalshi `FG {row['kalshiTotalLabel']} {fmt_cents(row['kalshiTotalOverAsk'])}/{fmt_cents(row['kalshiTotalUnderAsk'])}` and "
                f"`F5 {row['kalshiF5Label']} {fmt_cents(row['kalshiF5OverAsk'])}/{fmt_cents(row['kalshiF5UnderAsk'])}`."
            )
        lines.append("")
    lines.append("## Practical read for today")
    lines.append("")
    lines.append("- The most useful new dimension is **shape**, not raw side value.")
    lines.append("- `YRFI/NRFI` is where Kalshi is most actionable because we now have an actual entry price, scalp math, and half-inning split.")
    lines.append("- The biggest benefit to the slate today is deciding whether a hot `YRFI`/`NRFI` model read is actually worth touching at the current ask.")
    lines.append("- For totals, the Kalshi snapshot is more useful as a confirmation or contradiction layer than as a standalone edge, because our model does not yet convert projected runs into a clean Kalshi fair price.")
    lines.append("- For future work, the best path is to join these snapshots to inning state and learn how `NO`, `F5 under`, and full-game totals actually reprice after `scoreless top 1`, `1-0 after 1`, `starter exit`, and `through 5` states.")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    games = load_games(args.date)
    kalshi = load_json(KALSHI_JSON)
    kalshi_by_game = (((kalshi.get("dates") or {}).get(args.date) or {}).get("byGameId")) or {}
    rows = []
    for game in games:
        analyzed = analyze_game(game, kalshi_by_game)
        if analyzed:
            rows.append(analyzed)

    out_path = OUT_DIR / f"mlb-kalshi-market-shape-{args.date.replace('-', '')}.md"
    out_path.write_text(build_markdown(args.date, rows), encoding="utf-8")
    print(out_path)


if __name__ == "__main__":
    main()

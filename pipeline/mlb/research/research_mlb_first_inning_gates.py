#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
HISTORY_DIR = ROOT / "data-private" / "history"
SLATE_DIR = ROOT / "published-data" / "slates"
DEFAULT_OUT = ROOT / "development-docs" / "mlb" / "research" / "mlb-first-inning-gates-052926.md"


@dataclass
class Row:
    date: str
    game_id: str
    predicted_pick: str
    hit_flag: int
    confidence: float
    away_run_pct: float
    home_run_pct: float
    first_inning_team_away: dict
    first_inning_team_home: dict
    first_inning_pitcher_away: dict
    first_inning_pitcher_home: dict
    first_inning_pitcher_season_away: dict
    first_inning_pitcher_season_home: dict


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit first-inning keep/fade selectors from graded MLB history.")
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    return parser.parse_args()


def _load_game_file(date: str, game_id: str) -> dict | None:
    path = SLATE_DIR / date / "games" / f"{game_id}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text())


def read_rows() -> list[Row]:
    rows: list[Row] = []
    for history_path in sorted(HISTORY_DIR.glob("mlb-results-2026-05-*.jsonl")):
        with history_path.open() as fh:
            for line in fh:
                record = json.loads(line)
                if record.get("marketType") != "firstInning":
                    continue
                date = str(record["date"])
                game_id = str(record["gameId"])
                game = _load_game_file(date, game_id) or {}
                state = game.get("stateContext") or {}
                meta = record.get("meta") or {}
                result = record.get("result") or {}
                rows.append(
                    Row(
                        date=date,
                        game_id=game_id,
                        predicted_pick=str(record.get("predictedPick") or ""),
                        hit_flag=1 if result.get("hit") else 0,
                        confidence=float(record.get("confidence") or 0.0),
                        away_run_pct=float(meta.get("awayRunProbabilityPct") or 0.0),
                        home_run_pct=float(meta.get("homeRunProbabilityPct") or 0.0),
                        first_inning_team_away=(state.get("firstInningTeam") or {}).get("away") or {},
                        first_inning_team_home=(state.get("firstInningTeam") or {}).get("home") or {},
                        first_inning_pitcher_away=(state.get("firstInningPitcher") or {}).get("away") or {},
                        first_inning_pitcher_home=(state.get("firstInningPitcher") or {}).get("home") or {},
                        first_inning_pitcher_season_away=(state.get("firstInningPitcherSeason") or {}).get("away") or {},
                        first_inning_pitcher_season_home=(state.get("firstInningPitcherSeason") or {}).get("home") or {},
                    )
                )
    return rows


def pct(value: float) -> str:
    return f"{value * 100:.1f}%"


def hit_rate(rows: list[Row]) -> float:
    return sum(row.hit_flag for row in rows) / len(rows) if rows else 0.0


def summarize(label: str, rows: list[Row]) -> list[str]:
    return [label, str(len(rows)), pct(hit_rate(rows))]


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def season_run_game_rate(profile: dict) -> float:
    return float(profile.get("firstInningRunGameRate") or 0.0)


def season_runs_per_start(profile: dict) -> float:
    return float(profile.get("firstInningRunsAllowedPerStart") or 0.0)


def scoring_index(profile: dict) -> float:
    return float(profile.get("firstInningScoringIndex") or 0.0)


def main() -> None:
    args = parse_args()
    rows = read_rows()

    yrfi_rows = [row for row in rows if row.predicted_pick == "YRFI"]
    nrfi_rows = [row for row in rows if row.predicted_pick == "NRFI"]

    quiet_nrfi = [
        row
        for row in nrfi_rows
        if max(row.away_run_pct, row.home_run_pct) <= 34
        and season_run_game_rate(row.first_inning_pitcher_season_away) <= 0.22
        and season_run_game_rate(row.first_inning_pitcher_season_home) <= 0.22
    ]
    one_side_yrfi = [
        row
        for row in yrfi_rows
        if max(row.away_run_pct, row.home_run_pct) >= 55
        and min(row.away_run_pct, row.home_run_pct) <= 22
    ]
    double_live_yrfi = [
        row
        for row in yrfi_rows
        if row.away_run_pct >= 35 and row.home_run_pct >= 35
    ]
    pitcher_leak_yrfi = [
        row
        for row in yrfi_rows
        if season_run_game_rate(row.first_inning_pitcher_season_away) >= 0.30
        or season_run_game_rate(row.first_inning_pitcher_season_home) >= 0.30
        or season_runs_per_start(row.first_inning_pitcher_season_away) >= 0.55
        or season_runs_per_start(row.first_inning_pitcher_season_home) >= 0.55
    ]
    quiet_shape_yrfi = [
        row
        for row in yrfi_rows
        if max(scoring_index(row.first_inning_team_away), scoring_index(row.first_inning_team_home)) <= 58
        and max(row.away_run_pct, row.home_run_pct) <= 58
    ]
    leak_and_double_live_yrfi = [
        row
        for row in double_live_yrfi
        if row in pitcher_leak_yrfi
    ]
    leak_and_one_side_yrfi = [
        row
        for row in one_side_yrfi
        if row in pitcher_leak_yrfi
    ]
    high_confidence_yrfi = [row for row in yrfi_rows if row.confidence >= 68]
    high_confidence_nrfi = [row for row in nrfi_rows if row.confidence >= 60]

    lines = [
        "# MLB First-Inning Gate Audit — May 29, 2026",
        "",
        "This pass checks the recent graded first-inning board to see which simple selectors are actually supporting the lane. The point is not to celebrate a hot run; it is to find the parts we can keep and the parts we should demote.",
        "",
        f"- total graded first-inning picks: `{len(rows)}`",
        f"- YRFI baseline: `{pct(hit_rate(yrfi_rows))}` on `{len(yrfi_rows)}` picks",
        f"- NRFI baseline: `{pct(hit_rate(nrfi_rows))}` on `{len(nrfi_rows)}` picks",
        "",
        "## Selector results",
        "",
        markdown_table(
            ["Selector", "Sample", "Hit rate"],
            [
                summarize("High-confidence YRFI (>= 68)", high_confidence_yrfi),
                summarize("One-side carry YRFI", one_side_yrfi),
                summarize("Double-live YRFI", double_live_yrfi),
                summarize("Pitcher-leak YRFI", pitcher_leak_yrfi),
                summarize("Pitcher-leak + double-live YRFI", leak_and_double_live_yrfi),
                summarize("Pitcher-leak + one-side YRFI", leak_and_one_side_yrfi),
                summarize("Quiet-shape YRFI", quiet_shape_yrfi),
                summarize("High-confidence NRFI (>= 60)", high_confidence_nrfi),
                summarize("Quiet + clean NRFI", quiet_nrfi),
            ],
        ),
        "",
        "## Read",
        "",
        "- `Quiet + clean NRFI` is the strongest keep lane when both sides project low early and both starters carry clean season first-inning lines.",
        "- `Double-live YRFI` is clearly better than `one-side carry YRFI`. When both offenses have a live early path, the board behaves much better than when it leans on one side to do all the work.",
        "- `Pitcher-leak + double-live YRFI` is the strongest current keep lane. That is the clean version of a first-inning over: live bats on both sides plus a real early-leak path from at least one starter.",
        "- `One-side carry YRFI` is a demotion lane unless it also has stronger leak support. Those are the fragile overs that feel live because one lineup is hot, but still miss too often.",
        "- `Quiet-shape YRFI` is the danger lane. Those are the exact over-smoothed first-inning overs that have been hurting the board.",
        "- `Pitcher-leak YRFI` is useful, but it works best when it aligns with a real two-sided pressure case instead of replacing lineup pressure by itself.",
        "",
    ]

    Path(args.out).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote report to {args.out}")


if __name__ == "__main__":
    main()

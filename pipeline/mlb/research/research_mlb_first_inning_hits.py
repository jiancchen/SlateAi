#!/usr/bin/env python3
"""Analyze recent MLB first-inning YRFI hits and classify the driver."""

from __future__ import annotations

import argparse
import json
import sqlite3
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
WAREHOUSE_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
HISTORY_DIR = ROOT / "data-private" / "history"
PUBLISHED_SLATES_DIR = ROOT / "published-data" / "slates"
OUTPUT_DIR = ROOT / "development-docs" / "mlb" / "research"


SAFE_EVENT_TYPES = {
    "single",
    "double",
    "triple",
    "home_run",
    "walk",
    "intent_walk",
    "hit_by_pitch",
    "field_error",
    "fielders_choice",
    "catcher_interf",
}

SHORT_TO_FULL_TEAM = {
    "Angels": "Los Angeles Angels",
    "Astros": "Houston Astros",
    "Athletics": "Athletics",
    "Blue Jays": "Toronto Blue Jays",
    "Braves": "Atlanta Braves",
    "Brewers": "Milwaukee Brewers",
    "Cardinals": "St. Louis Cardinals",
    "Cubs": "Chicago Cubs",
    "Diamondbacks": "Arizona Diamondbacks",
    "Dodgers": "Los Angeles Dodgers",
    "Giants": "San Francisco Giants",
    "Guardians": "Cleveland Guardians",
    "Mariners": "Seattle Mariners",
    "Marlins": "Miami Marlins",
    "Mets": "New York Mets",
    "Nationals": "Washington Nationals",
    "Orioles": "Baltimore Orioles",
    "Padres": "San Diego Padres",
    "Phillies": "Philadelphia Phillies",
    "Pirates": "Pittsburgh Pirates",
    "Rangers": "Texas Rangers",
    "Rays": "Tampa Bay Rays",
    "Red Sox": "Boston Red Sox",
    "Reds": "Cincinnati Reds",
    "Rockies": "Colorado Rockies",
    "Royals": "Kansas City Royals",
    "Tigers": "Detroit Tigers",
    "Twins": "Minnesota Twins",
    "White Sox": "Chicago White Sox",
    "Yankees": "New York Yankees",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start-date", default="2026-05-23")
    parser.add_argument("--end-date", default="2026-05-24")
    parser.add_argument(
        "--output",
        default=str(OUTPUT_DIR / "mlb-first-inning-hit-analysis-052526.md"),
    )
    return parser.parse_args()


def load_first_inning_history(start_date: str, end_date: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path in sorted(HISTORY_DIR.glob("mlb-results-*.jsonl")):
        if path.name == "mlb-results-archive.jsonl":
            continue
        date_text = path.stem.replace("mlb-results-", "")
        if date_text < start_date or date_text > end_date:
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            record = json.loads(line)
            if record.get("sport") != "MLB":
                continue
            if record.get("marketType") != "firstInning":
                continue
            if record.get("predictedPick") != "YRFI":
                continue
            if not record.get("result", {}).get("hit"):
                continue
            rows.append(record)
    return rows


def load_published_game(date_text: str, game_id: str) -> dict[str, Any] | None:
    path = PUBLISHED_SLATES_DIR / date_text / "games" / f"{game_id}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def get_team_script(game: dict[str, Any], team_name: str) -> dict[str, Any]:
    scripts = (game.get("analysis") or {}).get("mlbProjection", {}).get("teamScripts") or []
    for script in scripts:
        if script.get("teamName") == team_name:
            return script
    return {}


def get_first_inning_events(conn: sqlite3.Connection, game_pk: int) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT *
        FROM mlb_plate_appearances
        WHERE game_pk = ? AND inning = 1
        ORDER BY at_bat_index
        """,
        (game_pk,),
    ).fetchall()


def summarize_team_events(events: list[sqlite3.Row], team_name: str) -> dict[str, Any]:
    team_events = [row for row in events if row["batting_team"] == team_name]
    if not team_events:
        return {
            "pa": 0,
            "runs": 0,
            "hits": 0,
            "walks": 0,
            "hbps": 0,
            "errors": 0,
            "xbh": 0,
            "hr": 0,
            "batter_reached": 0,
            "first_batter_reached": False,
            "scoring_plays": [],
            "event_types": [],
        }

    hits = sum(1 for row in team_events if row["event_type"] in {"single", "double", "triple", "home_run"})
    walks = sum(1 for row in team_events if row["event_type"] in {"walk", "intent_walk"})
    hbps = sum(1 for row in team_events if row["event_type"] == "hit_by_pitch")
    errors = sum(1 for row in team_events if row["event_type"] == "field_error")
    xbh = sum(1 for row in team_events if row["event_type"] in {"double", "triple", "home_run"})
    hr = sum(1 for row in team_events if row["event_type"] == "home_run")
    batter_reached = sum(1 for row in team_events if row["event_type"] in SAFE_EVENT_TYPES)
    first_batter_reached = bool(team_events and team_events[0]["event_type"] in SAFE_EVENT_TYPES)
    scoring_plays = [
        {
            "event": row["event"],
            "event_type": row["event_type"],
            "batter": row["batter_name"],
            "run_delta": row["run_delta"],
            "outs_before": row["outs_before"],
            "description": row["description"],
        }
        for row in team_events
        if int(row["run_delta"] or 0) > 0
    ]
    return {
        "pa": len(team_events),
        "runs": sum(int(row["run_delta"] or 0) for row in team_events),
        "hits": hits,
        "walks": walks,
        "hbps": hbps,
        "errors": errors,
        "xbh": xbh,
        "hr": hr,
        "batter_reached": batter_reached,
        "first_batter_reached": first_batter_reached,
        "scoring_plays": scoring_plays,
        "event_types": [row["event_type"] for row in team_events],
    }


def canonical_team_name(team_name: str) -> str:
    return SHORT_TO_FULL_TEAM.get(team_name, team_name)


def find_scoring_side(record: dict[str, Any]) -> str:
    result = record.get("result") or {}
    away_runs = int(result.get("awayRuns") or 0)
    home_runs = int(result.get("homeRuns") or 0)
    if away_runs > home_runs:
        return "away"
    if home_runs > away_runs:
        return "home"
    return "both"


def classify_driver(
    team_summary: dict[str, Any],
    first_inning_team_profile: dict[str, Any],
    hitter_state: dict[str, Any],
    team_script: dict[str, Any],
    opposing_pitcher_recent: dict[str, Any],
    opposing_pitcher_season: dict[str, Any],
    model_run_probability_pct: float | None,
) -> tuple[str, list[str]]:
    notes: list[str] = []
    top6_heat = float(hitter_state.get("top6HeatIndex") or 50)
    top6_cold = float(hitter_state.get("top6ColdIndex") or 50)
    top6_pressure = float(hitter_state.get("top6PressureIndex") or 50)
    top_third_score = float(team_script.get("topThirdScore") or 50)
    overperform_count = len(team_script.get("overperformHitters") or [])

    recent_scored_rate = float(first_inning_team_profile.get("scoredFirstInningRate") or 0)
    scoring_index = float(first_inning_team_profile.get("firstInningScoringIndex") or 0)

    recent_allowed_rate = float(opposing_pitcher_recent.get("firstInningRunAllowedRate") or 0)
    recent_pressure = float(opposing_pitcher_recent.get("firstInningPressureIndex") or 0)
    season_run_game_rate = float(opposing_pitcher_season.get("firstInningRunGameRate") or 0)
    season_runs_per_start = float(opposing_pitcher_season.get("firstInningRunsAllowedPerStart") or 0)

    hot_bats = (
        top6_heat >= 55
        or top6_pressure >= 58
        or top_third_score >= 63
        or (overperform_count >= 2 and top_third_score >= 55)
        or (recent_scored_rate >= 0.35 and scoring_index >= 60)
    )
    cold_bats = top6_cold >= 55 and not hot_bats
    pitcher_leak = (
        recent_allowed_rate >= 0.4
        or recent_pressure >= 70
        or season_run_game_rate >= 0.25
        or season_runs_per_start >= 0.5
    )
    traffic_leak = (
        team_summary["batter_reached"] >= 2
        and (team_summary["walks"] > 0 or team_summary["first_batter_reached"])
    )
    solo_blast = team_summary["hr"] >= 1 and team_summary["runs"] == 1 and team_summary["batter_reached"] <= 1
    low_signal_model = (model_run_probability_pct or 0) < 20

    if hot_bats:
        notes.append("scoring team carried real top-order / hot-bat support")
    if cold_bats:
        notes.append("scoring team came in cold, so the cash was less repeatable")
    if pitcher_leak:
        notes.append("opposing starter had a real first-inning leak signal")
    if traffic_leak:
        notes.append("inning started with traffic pressure, not just one swing")
    if team_summary["first_batter_reached"]:
        notes.append("first batter reached safely")
    if solo_blast:
        notes.append("cash came mostly from a one-swing homer")
    if low_signal_model:
        notes.append("model only gave the scoring side a low individual run probability")
    if recent_scored_rate >= 0.35:
        notes.append("team had already been scoring early with some frequency")

    if solo_blast and not pitcher_leak and not hot_bats:
        return "single-swing noise", notes
    if hot_bats and pitcher_leak:
        return "hot bats + pitcher leak", notes
    if traffic_leak and pitcher_leak:
        return "traffic leak", notes
    if hot_bats:
        return "hot-bat carry", notes
    if pitcher_leak:
        return "pitcher leak", notes
    if low_signal_model:
        return "low-signal ambush", notes
    return "mixed early cash", notes


def format_event_chain(team_summary: dict[str, Any]) -> str:
    scoring = team_summary["scoring_plays"]
    if not scoring:
        return "No scoring play captured."
    parts = []
    for play in scoring:
        parts.append(f'{play["batter"]} {play["event_type"]} (+{play["run_delta"]})')
    return "; ".join(parts)


def analyze_records(records: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], Counter]:
    conn = sqlite3.connect(WAREHOUSE_PATH)
    conn.row_factory = sqlite3.Row
    analyses: list[dict[str, Any]] = []
    driver_counts: Counter[str] = Counter()
    for record in records:
        date_text = str(record.get("date"))
        game_id = str(record.get("gameId"))
        game_pk = int(record.get("gamePk"))
        game = load_published_game(date_text, game_id)
        if not game:
            continue
        events = get_first_inning_events(conn, game_pk)
        scoring_side = find_scoring_side(record)
        if scoring_side == "both":
            scoring_sides = ["away", "home"]
        else:
            scoring_sides = [scoring_side]
        side_analyses = []
        for side in scoring_sides:
            opp_side = "home" if side == "away" else "away"
            team_name = game["participants"][0]["name"] if side == "away" else game["participants"][1]["name"]
            full_team_name = canonical_team_name(team_name)
            team_summary = summarize_team_events(events, full_team_name)
            hitter_state = ((game.get("stateContext") or {}).get("hitterState") or {}).get(side) or {}
            first_inning_team_profile = ((game.get("stateContext") or {}).get("firstInningTeam") or {}).get(side) or {}
            opp_pitcher_recent = ((game.get("stateContext") or {}).get("firstInningPitcher") or {}).get(opp_side) or {}
            opp_pitcher_season = ((game.get("stateContext") or {}).get("firstInningPitcherSeason") or {}).get(opp_side) or {}
            team_script = get_team_script(game, team_name)
            first_inning_meta = (record.get("meta") or {})
            run_probability_pct = float(
                first_inning_meta.get("awayRunProbabilityPct" if side == "away" else "homeRunProbabilityPct") or 0
            )
            driver, notes = classify_driver(
                team_summary=team_summary,
                first_inning_team_profile=first_inning_team_profile,
                hitter_state=hitter_state,
                team_script=team_script,
                opposing_pitcher_recent=opp_pitcher_recent,
                opposing_pitcher_season=opp_pitcher_season,
                model_run_probability_pct=run_probability_pct,
            )
            driver_counts[driver] += 1
            side_analyses.append(
                {
                    "team": team_name,
                    "driver": driver,
                    "notes": notes,
                    "event_chain": format_event_chain(team_summary),
                    "run_probability_pct": run_probability_pct,
                    "top_third_score": float(team_script.get("topThirdScore") or 50),
                    "top6_heat": float(hitter_state.get("top6HeatIndex") or 50),
                    "top6_cold": float(hitter_state.get("top6ColdIndex") or 50),
                    "recent_scored_rate_pct": float(first_inning_team_profile.get("scoredFirstInningRate") or 0) * 100,
                    "opp_pitcher_recent_allowed_rate_pct": float(opp_pitcher_recent.get("firstInningRunAllowedRate") or 0) * 100,
                    "opp_pitcher_season_run_game_rate_pct": float(opp_pitcher_season.get("firstInningRunGameRate") or 0) * 100,
                    "opp_pitcher_season_runs_per_start": float(opp_pitcher_season.get("firstInningRunsAllowedPerStart") or 0),
                    "runs_scored": team_summary["runs"],
                    "batter_reached": team_summary["batter_reached"],
                    "hits": team_summary["hits"],
                    "walks": team_summary["walks"],
                    "home_runs": team_summary["hr"],
                    "first_batter_reached": team_summary["first_batter_reached"],
                }
            )
        analyses.append(
            {
                "date": date_text,
                "matchup": record.get("matchup"),
                "game_id": game_id,
                "predicted_confidence": float((record.get("meta") or {}).get("yesProbabilityPct") or 0),
                "predicted_summary": record.get("pickJustification"),
                "result": record.get("result"),
                "sides": side_analyses,
            }
        )
    conn.close()
    return analyses, driver_counts


def build_markdown(
    analyses: list[dict[str, Any]],
    driver_counts: Counter[str],
    start_date: str,
    end_date: str,
) -> str:
    total = len(analyses)
    lines = [
        "# MLB First-Inning YRFI Hit Analysis",
        "",
        f"Window: `{start_date}` through `{end_date}`",
        "",
        f"Reviewed `{total}` graded `YRFI` hits from the tracked first-inning board.",
        "",
        "## What Repeated",
        "",
    ]
    for driver, count in driver_counts.most_common():
        lines.append(f"- `{driver}`: `{count}`")
    lines.extend(
        [
            "",
            "## Game Notes",
            "",
        ]
    )
    for analysis in analyses:
        lines.append(f"### {analysis['date']} — {analysis['matchup']}")
        lines.append("")
        lines.append(f"- Board call: `{analysis['predicted_summary']}`")
        lines.append(f"- Modeled YRFI confidence: `{analysis['predicted_confidence']:.1f}%`")
        result = analysis["result"] or {}
        lines.append(
            f"- Actual 1st inning: `{result.get('awayRuns', 0)}-{result.get('homeRuns', 0)}`"
        )
        for side in analysis["sides"]:
            lines.append(
                f"- {side['team']}: `{side['driver']}`. "
                f"Model side score `{side['run_probability_pct']:.1f}%`, "
                f"recent 1st-inning score rate `{side['recent_scored_rate_pct']:.1f}%`, "
                f"top-third `{side['top_third_score']:.1f}`, "
                f"top6 heat/cold `{side['top6_heat']:.1f}/{side['top6_cold']:.1f}`, "
                f"opp pitcher recent allow `{side['opp_pitcher_recent_allowed_rate_pct']:.1f}%`, "
                f"opp pitcher season run-game `{side['opp_pitcher_season_run_game_rate_pct']:.1f}%`, "
                f"opp season runs/start `{side['opp_pitcher_season_runs_per_start']:.2f}`."
            )
            lines.append(
                f"- Inning path: `{side['event_chain']}` | "
                f"batter reached `{side['batter_reached']}`, hits `{side['hits']}`, walks `{side['walks']}`, "
                f"HR `{side['home_runs']}`, first batter reached `{str(side['first_batter_reached']).lower()}`."
            )
            if side["notes"]:
                lines.append(f"- Read: {'; '.join(side['notes'])}.")
        lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    records = load_first_inning_history(args.start_date, args.end_date)
    analyses, driver_counts = analyze_records(records)
    output = build_markdown(analyses, driver_counts, args.start_date, args.end_date)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(output, encoding="utf-8")
    print(f"Wrote {len(analyses)} first-inning YRFI hit reviews to {output_path}")


if __name__ == "__main__":
    main()

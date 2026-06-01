#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[5]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORT_DIR = ROOT / "models" / "mlb" / "cartridges" / "MLB-M2" / "reports"
PRIVATE_REPORT_DIR = ROOT / "data-private" / "reports"


def read_rows(start: str, end: str) -> list[sqlite3.Row]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        SELECT *
        FROM mlb_state_formula_training_rows
        WHERE snapshot_date BETWEEN ? AND ?
        ORDER BY snapshot_date, game_pk, side, phase
        """,
        (start, end),
    ).fetchall()
    conn.close()
    return rows


def target(row: sqlite3.Row) -> dict[str, Any]:
    try:
        return json.loads(row["target_json"] or "{}")
    except json.JSONDecodeError:
        return {}


def actual_team_story(row: sqlite3.Row) -> str:
    payload = target(row)
    team_runs = int(payload.get("teamRuns") or 0)
    game_f5 = int(payload.get("gameFirst5Total") or 0)
    game_final = int(payload.get("gameFinalTotal") or 0)
    phase = row["phase"]
    if phase in {"firstCycle", "starterWindow"}:
        if team_runs >= 5 or game_f5 >= 5:
            return "crooked"
        if team_runs <= 1 and game_f5 <= 3:
            return "dead"
        return "normal"
    if team_runs >= 4 or game_final >= 10:
        return "crooked"
    if team_runs == 0 and game_final <= 7:
        return "dead"
    return "normal"


def summarize_counts(rows: list[sqlite3.Row]) -> dict[str, Any]:
    by_date: dict[str, dict[str, int]] = defaultdict(lambda: {"rows": 0, "games": 0})
    games_by_date: dict[str, set[int]] = defaultdict(set)
    story = Counter()
    phase_story = Counter()
    market = Counter()
    actual_story_hits = 0
    actual_story_rows = 0

    for row in rows:
        date = row["snapshot_date"]
        by_date[date]["rows"] += 1
        games_by_date[date].add(int(row["game_pk"]))
        story[row["story_bucket"]] += 1
        phase_story[(row["phase"], row["story_bucket"])] += 1
        market[row["market_expression"]] += 1
        actual = actual_team_story(row)
        if row["story_bucket"] in {"dead", "crooked", "normal"}:
            actual_story_rows += 1
            if row["story_bucket"] == actual:
                actual_story_hits += 1

    for date, games in games_by_date.items():
        by_date[date]["games"] = len(games)

    return {
        "byDate": dict(sorted(by_date.items())),
        "storyBuckets": dict(story.most_common()),
        "phaseStoryBuckets": {
            f"{phase}:{bucket}": count for (phase, bucket), count in sorted(phase_story.items())
        },
        "marketExpressions": dict(market.most_common()),
        "rowStoryHitRate": round(actual_story_hits / actual_story_rows, 3) if actual_story_rows else None,
        "rowStoryRows": actual_story_rows,
    }


def game_level_f5_check(rows: list[sqlite3.Row]) -> dict[str, Any]:
    grouped: dict[tuple[str, int], list[sqlite3.Row]] = defaultdict(list)
    for row in rows:
        if row["phase"] == "starterWindow":
            grouped[(row["snapshot_date"], int(row["game_pk"]))].append(row)

    graded = []
    for (date, game_pk), game_rows in grouped.items():
        targets = [target(row) for row in game_rows]
        game_f5 = max(int(payload.get("gameFirst5Total") or 0) for payload in targets) if targets else 0
        expressions = [row["market_expression"] for row in game_rows]
        stories = [row["story_bucket"] for row in game_rows]
        prediction = "pass"
        if "first-five over" in expressions:
            prediction = "over"
        elif stories.count("dead") >= 2:
            prediction = "under"
        actual = "over" if game_f5 >= 5 else "under" if game_f5 <= 3 else "middle"
        if prediction != "pass" and actual != "middle":
            graded.append(
                {
                    "date": date,
                    "gamePk": game_pk,
                    "prediction": prediction,
                    "actual": actual,
                    "hit": prediction == actual,
                    "gameFirst5Total": game_f5,
                    "stories": stories,
                }
            )

    hits = sum(1 for row in graded if row["hit"])
    by_date = []
    for date in sorted({row["date"] for row in graded}):
        items = [row for row in graded if row["date"] == date]
        by_date.append(
            {
                "date": date,
                "rows": len(items),
                "hitRate": round(sum(1 for row in items if row["hit"]) / len(items), 3) if items else None,
            }
        )
    return {
        "rows": len(graded),
        "hitRate": round(hits / len(graded), 3) if graded else None,
        "byDate": by_date,
        "examples": graded[-12:],
    }


def markdown(report: dict[str, Any]) -> str:
    lines = [
        "# MLB-M2 State Formula Rows Report",
        "",
        f"Range: {report['range']['start']} to {report['range']['end']}",
        "",
        "## Coverage",
        "",
        f"- Rows: {report['coverage']['rows']}",
        f"- Games: {report['coverage']['games']}",
        f"- Dates: {', '.join(report['coverage']['dates'])}",
        "",
        "## Story Distribution",
        "",
    ]
    for bucket, count in report["summary"]["storyBuckets"].items():
        lines.append(f"- {bucket}: {count}")
    lines.extend(
        [
            "",
            "## Market Expressions",
            "",
        ]
    )
    for expression, count in report["summary"]["marketExpressions"].items():
        lines.append(f"- {expression}: {count}")
    lines.extend(
        [
            "",
            "## Row Story Check",
            "",
            f"- Hit rate: {report['summary']['rowStoryHitRate']}",
            f"- Rows: {report['summary']['rowStoryRows']}",
            "",
            "## Starter-Window F5 Direction Check",
            "",
            f"- Hit rate: {report['f5Check']['hitRate']}",
            f"- Rows: {report['f5Check']['rows']}",
            "",
            "This report is a research surface. It does not create value-board rows and does not use prices.",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", default="2026-05-23")
    parser.add_argument("--end", default="2026-05-31")
    args = parser.parse_args()

    rows = read_rows(args.start, args.end)
    games = {(row["snapshot_date"], int(row["game_pk"])) for row in rows}
    report = {
        "schemaVersion": 1,
        "modelId": "MLB-M2",
        "experiment": "state_formula_rows_report",
        "range": {"start": args.start, "end": args.end},
        "coverage": {
            "rows": len(rows),
            "games": len(games),
            "dates": sorted({row["snapshot_date"] for row in rows}),
        },
        "summary": summarize_counts(rows),
        "f5Check": game_level_f5_check(rows),
    }

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    PRIVATE_REPORT_DIR.mkdir(parents=True, exist_ok=True)
    safe_range = f"{args.start}-to-{args.end}"
    md_path = REPORT_DIR / f"state-formula-rows-report-{safe_range}.md"
    json_path = PRIVATE_REPORT_DIR / f"mlb-m2-state-formula-rows-report-{safe_range}.json"
    md_path.write_text(markdown(report))
    json_path.write_text(json.dumps(report, indent=2, sort_keys=True))
    print(f"Wrote {md_path}")
    print(f"Wrote {json_path}")
    print(json.dumps(report["coverage"], indent=2))


if __name__ == "__main__":
    main()

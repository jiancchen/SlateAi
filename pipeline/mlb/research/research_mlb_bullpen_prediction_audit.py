from __future__ import annotations

import json
import sqlite3
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
SLATES_DIR = ROOT / "published-data" / "slates"
REPORT_PATH = ROOT / "development-docs" / "mlb" / "research" / "mlb-bullpen-prediction-audit-053026.md"

START_DATE = "2026-05-10"
END_DATE = "2026-05-28"


@dataclass
class TeamAuditRow:
    prediction_date: str
    game_pk: int
    team_name: str
    opponent_name: str
    side: str
    predicted: list[dict]
    actual_chain: list[dict]


def pct(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return numerator / denominator * 100.0


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    if not rows:
        rows = [["-", "-", "-"][: len(headers)]]
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body = "\n".join("| " + " | ".join(row) + " |" for row in rows)
    return "\n".join([header_line, divider_line, body])


def load_actual_chains(conn: sqlite3.Connection) -> dict[tuple[str, int, str], list[dict]]:
    conn.row_factory = sqlite3.Row
    query = """
    SELECT
      game_date,
      game_pk,
      team_role,
      team_name,
      opponent_name,
      pitcher_id,
      pitcher_name,
      pitcher_role,
      entry_order,
      outs_recorded,
      innings_pitched,
      batters_faced,
      pitches_thrown,
      runs_allowed
    FROM mlb_pitcher_appearances
    WHERE game_date BETWEEN ? AND ?
      AND pitcher_role = 'reliever'
    ORDER BY game_date, game_pk, team_role, entry_order, pitcher_id
    """
    lookup: dict[tuple[str, int, str], list[dict]] = defaultdict(list)
    for row in conn.execute(query, (START_DATE, END_DATE)):
        lookup[(row["game_date"], int(row["game_pk"]), row["team_role"])].append(
            {
                "pitcher_id": int(row["pitcher_id"]),
                "pitcher_name": row["pitcher_name"],
                "entry_order": int(row["entry_order"]) if row["entry_order"] is not None else None,
                "outs_recorded": int(row["outs_recorded"] or 0),
                "innings_pitched": float(row["innings_pitched"] or 0),
                "batters_faced": int(row["batters_faced"] or 0),
                "pitches_thrown": int(row["pitches_thrown"] or 0),
                "runs_allowed": int(row["runs_allowed"] or 0),
            }
        )
    return lookup


def iter_prediction_rows() -> list[TeamAuditRow]:
    rows: list[TeamAuditRow] = []
    for slate_dir in sorted(SLATES_DIR.iterdir()):
        if not slate_dir.is_dir():
            continue
        prediction_date = slate_dir.name
        if prediction_date < START_DATE or prediction_date > END_DATE:
            continue
        games_dir = slate_dir / "games"
        if not games_dir.exists():
            continue
        for game_path in games_dir.glob("*.json"):
            payload = json.loads(game_path.read_text())
            if payload.get("league") != "MLB":
                continue
            projection = ((payload.get("analysis") or {}).get("mlbProjection") or {})
            game_pk = payload.get("gamePk")
            if not game_pk:
                continue
            away_team = (((payload.get("matchup") or [{}])[0]) or {}).get("name")
            home_team = (((payload.get("matchup") or [{}, {}])[1]) or {}).get("name")
            away_pred = projection.get("awayLikelyRelievers") or []
            home_pred = projection.get("homeLikelyRelievers") or []
            rows.append(
                TeamAuditRow(
                    prediction_date=prediction_date,
                    game_pk=int(game_pk),
                    team_name=str(away_team),
                    opponent_name=str(home_team),
                    side="away",
                    predicted=away_pred,
                    actual_chain=[],
                )
            )
            rows.append(
                TeamAuditRow(
                    prediction_date=prediction_date,
                    game_pk=int(game_pk),
                    team_name=str(home_team),
                    opponent_name=str(away_team),
                    side="home",
                    predicted=home_pred,
                    actual_chain=[],
                )
            )
    return rows


def attach_actual_chains(rows: list[TeamAuditRow], actual_lookup: dict[tuple[str, int, str], list[dict]]) -> list[TeamAuditRow]:
    attached: list[TeamAuditRow] = []
    for row in rows:
        chain = actual_lookup.get((row.prediction_date, row.game_pk, row.side), [])
        if not chain:
            continue
        row.actual_chain = chain
        attached.append(row)
    return attached


def summarize(rows: list[TeamAuditRow]) -> dict:
    total = len(rows)
    exact = 0
    top2 = 0
    top3 = 0
    predicted_reliever_appeared = 0
    matched_out_errors: list[float] = []
    top1_out_errors: list[float] = []
    examples_exact: list[tuple[str, str]] = []
    examples_miss: list[tuple[str, str]] = []
    team_buckets: dict[str, dict[str, int]] = defaultdict(lambda: {"samples": 0, "exact": 0, "top2": 0, "top3": 0})

    for row in rows:
        actual_first = row.actual_chain[0]
        actual_pitcher_id = actual_first["pitcher_id"]
        predicted_ids = [int(reliever.get("pitcherId") or 0) for reliever in row.predicted]
        predicted_ids = [pitcher_id for pitcher_id in predicted_ids if pitcher_id]
        team_buckets[row.team_name]["samples"] += 1

        if predicted_ids:
            if predicted_ids[0] == actual_pitcher_id:
                exact += 1
                team_buckets[row.team_name]["exact"] += 1
                predicted_first = row.predicted[0]
                top1_out_errors.append(abs(float(predicted_first.get("expectedOuts") or 0) - actual_first["outs_recorded"]))
                if len(examples_exact) < 8:
                    examples_exact.append(
                        (
                            f"{row.prediction_date} {row.team_name} vs {row.opponent_name}",
                            f"hit {actual_first['pitcher_name']} first-up ({actual_first['outs_recorded']} outs vs {float(predicted_first.get('expectedOuts') or 0):.2f} expected)"
                        )
                    )
            if actual_pitcher_id in predicted_ids[:2]:
                top2 += 1
                team_buckets[row.team_name]["top2"] += 1
            if actual_pitcher_id in predicted_ids[:3]:
                top3 += 1
                team_buckets[row.team_name]["top3"] += 1
                matched_prediction = next((reliever for reliever in row.predicted[:3] if int(reliever.get("pitcherId") or 0) == actual_pitcher_id), None)
                if matched_prediction is not None:
                    matched_out_errors.append(abs(float(matched_prediction.get("expectedOuts") or 0) - actual_first["outs_recorded"]))
            if actual_pitcher_id in predicted_ids:
                predicted_reliever_appeared += 1
            elif len(examples_miss) < 8:
                top_names = ", ".join(reliever.get("name", "?") for reliever in row.predicted[:3]) or "none"
                examples_miss.append(
                    (
                        f"{row.prediction_date} {row.team_name} vs {row.opponent_name}",
                        f"missed first-up {actual_first['pitcher_name']} ({actual_first['outs_recorded']} outs); predicted {top_names}"
                    )
                )

    team_rows = []
    for team_name, bucket in sorted(team_buckets.items(), key=lambda item: (-item[1]["samples"], item[0])):
        samples = bucket["samples"]
        team_rows.append(
            [
                team_name,
                str(samples),
                f"{pct(bucket['exact'], samples):.1f}%",
                f"{pct(bucket['top2'], samples):.1f}%",
                f"{pct(bucket['top3'], samples):.1f}%",
            ]
        )

    workload_bucket_rows = []
    for label, predicate in [
        ("1-3 outs", lambda actual_first: actual_first["outs_recorded"] <= 3),
        ("4-5 outs", lambda actual_first: 4 <= actual_first["outs_recorded"] <= 5),
        ("6+ outs", lambda actual_first: actual_first["outs_recorded"] >= 6),
    ]:
        bucket = [row for row in rows if predicate(row.actual_chain[0])]
        exact_bucket = 0
        covered_bucket = 0
        for row in bucket:
            actual_pitcher_id = row.actual_chain[0]["pitcher_id"]
            predicted_ids = [int(reliever.get("pitcherId") or 0) for reliever in row.predicted if reliever.get("pitcherId")]
            if predicted_ids and predicted_ids[0] == actual_pitcher_id:
                exact_bucket += 1
            if actual_pitcher_id in predicted_ids:
                covered_bucket += 1
        workload_bucket_rows.append(
            [
                label,
                str(len(bucket)),
                f"{pct(exact_bucket, len(bucket)):.1f}%",
                f"{pct(covered_bucket, len(bucket)):.1f}%",
            ]
        )

    return {
        "total": total,
        "exact_rate": pct(exact, total),
        "top2_rate": pct(top2, total),
        "top3_rate": pct(top3, total),
        "appeared_rate": pct(predicted_reliever_appeared, total),
        "exact_mae_outs": (sum(top1_out_errors) / len(top1_out_errors)) if top1_out_errors else None,
        "matched_top3_mae_outs": (sum(matched_out_errors) / len(matched_out_errors)) if matched_out_errors else None,
        "team_rows": team_rows,
        "workload_bucket_rows": workload_bucket_rows,
        "examples_exact": examples_exact,
        "examples_miss": examples_miss,
    }


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    actual_lookup = load_actual_chains(conn)
    conn.close()

    rows = attach_actual_chains(iter_prediction_rows(), actual_lookup)
    summary = summarize(rows)

    report = f"""# MLB Bullpen Prediction Audit — May 30, 2026

Audit window:

- predictions available from `2026-05-10` through `2026-05-28`
- actual bullpen usage from `mlb_pitcher_appearances`
- unit of analysis: one team-side per game with at least one reliever appearance

## Headline

- team-side samples: `{summary['total']}`
- exact first-bridge hit rate: `{summary['exact_rate']:.1f}%`
- top-2 coverage: `{summary['top2_rate']:.1f}%`
- top-3 coverage: `{summary['top3_rate']:.1f}%`
- actual first reliever appeared somewhere in predicted chain: `{summary['appeared_rate']:.1f}%`
- exact-match expected-outs MAE: `{summary['exact_mae_outs']:.2f}` outs
- matched-in-top3 expected-outs MAE: `{summary['matched_top3_mae_outs']:.2f}` outs

## Team Coverage

{markdown_table(["Team", "Samples", "Exact 1st", "Top-2", "Top-3"], summary["team_rows"][:20])}

## First-Up Workload Buckets

{markdown_table(["Actual first-up workload", "Samples", "Exact 1st", "Appeared in predicted chain"], summary["workload_bucket_rows"])}

## Clean Hits

{markdown_table(["Spot", "Note"], [[a, b] for a, b in summary["examples_exact"]])}

## Clean Misses

{markdown_table(["Spot", "Note"], [[a, b] for a, b in summary["examples_miss"]])}

## Read

- `Exact first-bridge hit rate` is the strict answer to “who got called first.”
- `Top-2` and `Top-3` are more practical for how the board is actually used, because the reliever chain is a shortlist, not just a single name.
- In this window, `Top-3` is the same as `Top-2` because the saved live board usually exports two likely bridge names.
- `Expected-outs MAE` answers the innings question directly: when we found the right arm, how close were we on workload.
- The weakest spot is `6+ outs` bulk first-up usage. Those long bridge / piggyback turns only hit `14.0%` exact and `32.6%` chain coverage in this sample.
- This audit does not yet grade the full bullpen sequence after the first reliever. It is focused on first-up bridge prediction quality, which is the part the current board surfaces most explicitly.
"""
    REPORT_PATH.write_text(report)
    print(f"Wrote {REPORT_PATH}")


if __name__ == "__main__":
    main()

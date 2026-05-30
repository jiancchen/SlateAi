#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
from collections import defaultdict
from pathlib import Path

from research_mlb_bullpen_shape_model import build_starter_probability_lookup
from research_mlb_first_up_reliever_lineup_matchup import (
    LINEUP_BASE_COLUMNS,
    LINEUP_DAMAGE_COLUMNS,
    LINEUP_INTERACTION_COLUMNS,
    build_candidate_lineup_features,
    train_candidate_model,
)
from research_mlb_first_up_reliever_model import (
    AUGMENT_COLUMNS,
    BASE_FEATURE_COLUMNS,
    FirstUpCandidateRow,
    build_actual_first_up_lookup,
    load_rows as load_first_up_rows,
    markdown_table,
)
from research_mlb_first_up_reliever_quality import (
    QUALITY_COLUMNS,
    build_quality_lookup,
    load_quality_appearances,
)
from research_mlb_starter_exit_buckets import load_rows as load_starter_rows


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
OUT_ROOT = ROOT / "data-private" / "predictions" / "mlb-reliever-shadow"
MODULE_ROOT = ROOT / "web" / "src" / "lib"
REPORT_PATH = ROOT / "development-docs" / "mlb-first-up-reliever-shadow-board-053026.md"

OFFICIAL_TO_DESK_TEAM = {
    "Washington Nationals": "Nationals",
    "Miami Marlins": "Marlins",
    "Athletics": "Athletics",
    "Baltimore Orioles": "Orioles",
    "Tampa Bay Rays": "Rays",
    "Boston Red Sox": "Red Sox",
    "Colorado Rockies": "Rockies",
    "Philadelphia Phillies": "Phillies",
    "Los Angeles Angels": "Angels",
    "Toronto Blue Jays": "Blue Jays",
    "Houston Astros": "Astros",
    "Cincinnati Reds": "Reds",
    "Minnesota Twins": "Twins",
    "Cleveland Guardians": "Guardians",
    "Seattle Mariners": "Mariners",
    "Chicago White Sox": "White Sox",
    "New York Yankees": "Yankees",
    "Milwaukee Brewers": "Brewers",
    "Chicago Cubs": "Cubs",
    "Texas Rangers": "Rangers",
    "Pittsburgh Pirates": "Pirates",
    "San Francisco Giants": "Giants",
    "Atlanta Braves": "Braves",
    "Los Angeles Dodgers": "Dodgers",
    "St. Louis Cardinals": "Cardinals",
    "San Diego Padres": "Padres",
    "New York Mets": "Mets",
    "Arizona Diamondbacks": "Diamondbacks",
    "Kansas City Royals": "Royals",
    "Detroit Tigers": "Tigers",
}

E33_EXACT_RATE = 26.5
E33_TOP2_RATE = 44.5
E33_TOP3_RATE = 59.6


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export MLB reliever shadow board from the E33 first-up model stack.")
    parser.add_argument("--date", required=True, help="Slate date (YYYY-MM-DD).")
    parser.add_argument("--db", default=str(DB_PATH), help="Warehouse sqlite path.")
    parser.add_argument("--out", default=None, help="JSON output path.")
    parser.add_argument("--module-out", default=None, help="Generated JS module output path.")
    parser.add_argument("--report-out", default=str(REPORT_PATH), help="Markdown report path.")
    return parser.parse_args()


def safe_float(value: object) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except Exception:
        return None


def safe_int(value: object) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except Exception:
        return None


def desk_team(name: str) -> str:
    return OFFICIAL_TO_DESK_TEAM.get(name, name)


def percent(value: float | None) -> float:
    return round(float(value or 0.0) * 100.0, 1)


def row_or_dict_value(record: object, key: str) -> object:
    if record is None:
        return None
    if isinstance(record, dict):
        return record.get(key)
    try:
        return record[key]  # type: ignore[index]
    except Exception:
        return None


def default_out_paths(date_text: str) -> tuple[Path, Path]:
    return (
        OUT_ROOT / f"{date_text}-reliever-shadow.json",
        MODULE_ROOT / f"day-{date_text}-reliever-shadow.js",
    )


def load_game_lookup(conn: sqlite3.Connection, target_date: str) -> dict[str, dict[str, object]]:
    rows = conn.execute(
        """
        SELECT
          game_pk,
          away_team,
          home_team
        FROM mlb_games
        WHERE game_date = ?
        """,
        (target_date,),
    ).fetchall()

    lookup: dict[str, dict[str, object]] = {}
    for row in rows:
        game_pk = int(row["game_pk"])
        away_team = row["away_team"]
        home_team = row["home_team"]
        lookup[away_team] = {
            "game_pk": game_pk,
            "opponent_name": home_team,
        }
        lookup[home_team] = {
            "game_pk": game_pk,
            "opponent_name": away_team,
        }
    return lookup


def load_settled_starter_ids_by_team(conn: sqlite3.Connection, target_date: str) -> dict[str, set[int]]:
    rows = conn.execute(
        """
        SELECT team_name, pitcher_id
        FROM mlb_starting_pitcher_game_logs
        WHERE game_date = ?
          AND pitcher_id IS NOT NULL
        """,
        (target_date,),
    ).fetchall()
    lookup: dict[str, set[int]] = defaultdict(set)
    for row in rows:
        lookup[row["team_name"]].add(int(row["pitcher_id"]))
    return lookup


def load_shape_lookup(conn: sqlite3.Connection, target_date: str) -> dict[tuple[str, str], sqlite3.Row]:
    rows = conn.execute(
        """
        SELECT *
        FROM mlb_team_bullpen_shape_daily
        WHERE as_of_date = ?
        """,
        (target_date,),
    ).fetchall()
    return {(row["as_of_date"], row["team_name"]): row for row in rows}


def load_current_candidate_rows(conn: sqlite3.Connection, target_date: str) -> list[FirstUpCandidateRow]:
    starter_lookup = build_starter_probability_lookup(load_starter_rows(conn))
    shape_lookup = load_shape_lookup(conn, target_date)
    game_lookup = load_game_lookup(conn, target_date)
    settled_starter_ids_by_team = load_settled_starter_ids_by_team(conn, target_date)
    usage_rows = conn.execute(
        """
        SELECT *
        FROM mlb_bullpen_usage
        WHERE as_of_date = ?
        ORDER BY team_name, pitcher_name
        """,
        (target_date,),
    ).fetchall()

    rows: list[FirstUpCandidateRow] = []
    for row in usage_rows:
        team_name = row["team_name"]
        game_info = game_lookup.get(team_name)
        if not game_info:
            continue
        usage_pitcher_id = safe_int(row["pitcher_id"])
        if usage_pitcher_id is not None and usage_pitcher_id in settled_starter_ids_by_team.get(team_name, set()):
            continue
        starter = starter_lookup.get((target_date, int(game_info["game_pk"]), team_name))
        shape = shape_lookup.get((target_date, team_name))
        starter = starter or {}
        shape = shape or {}

        raw = {}
        try:
            raw = json.loads(row["raw_json"] or "{}")
        except Exception:
            raw = {}

        rows.append(
            FirstUpCandidateRow(
                as_of_date=target_date,
                team_name=team_name,
                opponent_name=str(game_info["opponent_name"]),
                pitcher_id=int(row["pitcher_id"]),
                pitcher_name=row["pitcher_name"],
                actual_first_up_flag=0,
                actual_first_up_outs=0,
                actual_workload_bucket="pending",
                likely_role=row["likely_role"] or "",
                appearances_last3=int(row["appearances_last3"] or 0),
                innings_last3=safe_float(row["innings_last3"]),
                outs_last3=safe_int(row["outs_last3"]),
                pitches_last3=safe_int(row["pitches_last3"]),
                batters_faced_last3=safe_int(row["batters_faced_last3"]),
                days_since_last_appearance=safe_int(row["days_since_last_appearance"]),
                worked_yesterday_flag=int(row["worked_yesterday_flag"] or 0),
                back_to_back_flag=int(row["back_to_back_flag"] or 0),
                avg_entry_order=safe_float(row["avg_entry_order"]),
                avg_outs_per_appearance=safe_float(row["avg_outs_per_appearance"]),
                avg_pitches_per_appearance=safe_float(row["avg_pitches_per_appearance"]),
                bridge_score=safe_float(row["bridge_score"]),
                availability_score=safe_float(row["availability_score"]),
                fatigue_score=safe_float(row["fatigue_score"]),
                first_reliever_likelihood=safe_float(row["first_reliever_likelihood"]),
                recent_first_reliever_count_last5=safe_int(raw.get("recentFirstRelieverCountLast5Games")) or 0,
                recent_first_two_count_last5=safe_int(raw.get("recentFirstTwoCountLast5Games")) or 0,
                recent_team_games_sample=safe_int(raw.get("recentTeamGamesSample")) or 0,
                bullpen_shape_index=safe_float(row_or_dict_value(shape, "bullpen_shape_index")),
                relievers_used_avg_last5=safe_float(row_or_dict_value(shape, "relievers_used_avg_last5")),
                first_reliever_outs_avg_last5=safe_float(row_or_dict_value(shape, "first_reliever_outs_avg_last5")),
                first_reliever_outs_volatility_last10=safe_float(row_or_dict_value(shape, "first_reliever_outs_volatility_last10")),
                bulk_first_up_rate_last10=safe_float(row_or_dict_value(shape, "bulk_first_up_rate_last10")),
                two_reliever_containment_rate_last10=safe_float(row_or_dict_value(shape, "two_reliever_containment_rate_last10")),
                four_plus_reliever_rate_last10=safe_float(row_or_dict_value(shape, "four_plus_reliever_rate_last10")),
                six_plus_reliever_scramble_rate_last10=safe_float(row_or_dict_value(shape, "six_plus_reliever_scramble_rate_last10")),
                starter_prob_12=safe_float(starter.get("starter_prob_12")),
                starter_prob_15=safe_float(starter.get("starter_prob_15")),
                starter_prob_18=safe_float(starter.get("starter_prob_18")),
                starter_prob_21=safe_float(starter.get("starter_prob_21")),
                starter_leash_score=safe_float(starter.get("starter_leash_score")),
                starter_callup_debut_flag=int(starter.get("starter_callup_debut_flag") or 0),
                starter_tiny_sample_flag=int(starter.get("starter_tiny_sample_flag") or 0),
                starter_command_break_index=safe_float(starter.get("starter_command_break_index")),
                starter_sixth_inning_damage_rate=safe_float(starter.get("starter_sixth_inning_damage_rate")),
            )
        )
    return rows


def build_vector_lookup(
    rows: list[FirstUpCandidateRow],
    quality_lookup: dict[tuple[str, int], dict[str, float]],
    lineup_lookup: dict[tuple[str, int, str], dict[str, float]],
) -> dict[tuple[str, str, int], dict[str, float]]:
    vector_lookup: dict[tuple[str, str, int], dict[str, float]] = {}
    for row in rows:
        quality = quality_lookup.get((row.as_of_date, row.pitcher_id), {})
        lineup = lineup_lookup.get((row.as_of_date, row.pitcher_id, row.team_name), {})
        vector_lookup[(row.as_of_date, row.team_name, row.pitcher_id)] = {**quality, **lineup}
    return vector_lookup


def build_reason_tags(row: FirstUpCandidateRow, overlay: dict[str, float]) -> list[str]:
    tags: list[str] = []
    if (row.starter_prob_12 or 0.0) >= 0.38:
        tags.append("early-hook risk")
    elif (row.starter_prob_21 or 0.0) >= 0.42:
        tags.append("deep-starter cover")

    if (row.bulk_first_up_rate_last10 or 0.0) >= 0.3 or row.likely_role == "bulk":
        tags.append("bulk first-up live")
    elif (row.two_reliever_containment_rate_last10 or 0.0) >= 0.34 and (row.starter_prob_18 or 0.0) >= 0.5:
        tags.append("2-man containment")
    elif (row.four_plus_reliever_rate_last10 or 0.0) >= 0.45 or (row.six_plus_reliever_scramble_rate_last10 or 0.0) >= 0.18:
        tags.append("scramble risk")

    if overlay.get("quality_unknown_sample_flag", 0.0) >= 1.0 or overlay.get("quality_new_team_flag", 0.0) >= 1.0:
        tags.append("unknown-sample arm")
    elif overlay.get("quality_first_pitch_strike_rate_last10", 0.0) >= 0.68 and overlay.get("quality_first_batter_reach_rate_last10", 1.0) <= 0.25:
        tags.append("clean-entry form")
    elif overlay.get("quality_first5_ball_rate_last10", 0.0) >= 0.42:
        tags.append("first-five wildness")

    if overlay.get("lineup_top6_opposite_hard_hit", 0.0) >= 42.0 and overlay.get("lineup_top6_opposite_xslg", 0.0) >= 0.48:
        tags.append("opp-hand damage lane")
    elif overlay.get("lineup_top6_same_hard_hit", 0.0) >= 40.0 and overlay.get("lineup_top6_same_xslg", 0.0) >= 0.45:
        tags.append("same-hand damage lane")

    if overlay.get("lineup_dependency_score_last5", 0.0) >= 55.0:
        tags.append("top-order dependency")
    elif overlay.get("lineup_conversion_index_last5", 0.0) >= 54.0:
        tags.append("conversion support")

    return tags[:4]


def build_shadow_summary(row: FirstUpCandidateRow, overlay: dict[str, float]) -> str:
    if (row.starter_prob_12 or 0.0) >= 0.38:
        starter_note = "early hook is live"
    elif (row.starter_prob_21 or 0.0) >= 0.42:
        starter_note = "deep starter may delay the bridge"
    else:
        starter_note = "standard mid-game bridge"

    if overlay.get("quality_unknown_sample_flag", 0.0) >= 1.0:
        quality_note = "unknown-sample relief lane"
    elif overlay.get("quality_first_pitch_strike_rate_last10", 0.0) >= 0.68 and overlay.get("quality_first_batter_reach_rate_last10", 1.0) <= 0.25:
        quality_note = "clean early-command form"
    else:
        quality_note = "role and availability are doing most of the work"

    if overlay.get("lineup_top6_opposite_hard_hit", 0.0) >= 42.0:
        matchup_note = "opposite-hand damage pressure is real"
    elif overlay.get("lineup_top6_same_hard_hit", 0.0) >= 40.0:
        matchup_note = "same-hand damage pressure is live"
    else:
        matchup_note = "lineup fit is neutral"

    return f"{starter_note}; {quality_note}; {matchup_note}."


def build_team_payload(
    rows: list[FirstUpCandidateRow],
    probs: list[float],
    vector_lookup: dict[tuple[str, str, int], dict[str, float]],
) -> dict[str, dict[str, object]]:
    grouped: dict[str, list[tuple[FirstUpCandidateRow, float]]] = defaultdict(list)
    for row, prob in zip(rows, probs):
        grouped[row.team_name].append((row, prob))

    payload: dict[str, dict[str, object]] = {}
    for team_name, bucket in grouped.items():
        ranked = sorted(
            bucket,
            key=lambda pair: (
                pair[1],
                pair[0].first_reliever_likelihood or 0.0,
                pair[0].availability_score or 0.0,
                pair[0].bridge_score or 0.0,
            ),
            reverse=True,
        )
        total_prob = sum(max(prob, 0.0) for _, prob in ranked) or 1.0
        relievers = []
        for row, prob in ranked[:3]:
            overlay = vector_lookup.get((row.as_of_date, row.team_name, row.pitcher_id), {})
            relievers.append(
                {
                    "pitcherId": row.pitcher_id,
                    "name": row.pitcher_name,
                    "role": row.likely_role,
                    "shadowScorePct": round(float(prob) * 100.0, 1),
                    "shadowSharePct": round(max(prob, 0.0) / total_prob * 100.0, 1),
                    "availabilityScore": round(float(row.availability_score or 0.0), 1),
                    "bridgeScore": round(float(row.bridge_score or 0.0), 1),
                    "firstRelieverLikelihood": round(float(row.first_reliever_likelihood or 0.0), 1),
                    "expectedOuts": round(float(overlay.get("quality_outs_per_app_last10") or row.avg_outs_per_appearance or 0.0), 2),
                    "workedYesterday": bool(row.worked_yesterday_flag),
                    "backToBack": bool(row.back_to_back_flag),
                    "starterProb12Pct": percent(row.starter_prob_12),
                    "starterProb18Pct": percent(row.starter_prob_18),
                    "bulkFirstUpRatePct": percent(row.bulk_first_up_rate_last10),
                    "reasonTags": build_reason_tags(row, overlay),
                    "summary": build_shadow_summary(row, overlay),
                }
            )

        top_two_share = round(sum(reliever["shadowSharePct"] for reliever in relievers[:2]), 1) if relievers else 0.0
        lead = relievers[0] if relievers else None
        alt = relievers[1] if len(relievers) > 1 else None
        first_row = ranked[0][0] if ranked else None
        starter_hook = percent(first_row.starter_prob_12) if first_row else 0.0
        payload[desk_team(team_name)] = {
            "teamName": desk_team(team_name),
            "officialTeamName": team_name,
            "opponentName": desk_team(ranked[0][0].opponent_name) if ranked else "",
            "modelTag": "E34 shadow",
            "researchRates": {
                "exactRate": E33_EXACT_RATE,
                "top2Rate": E33_TOP2_RATE,
                "top3Rate": E33_TOP3_RATE,
            },
            "starterHookRiskPct": starter_hook,
            "topTwoSharePct": top_two_share,
            "summaryLine": (
                f"{lead['name']} leads the shadow board"
                + (f"; {alt['name']} is the main alt" if alt else "")
                + f" with {top_two_share:.1f}% of the shadow share."
                if lead
                else "No shadow reliever cluster available."
            ),
            "relievers": relievers,
        }
    return payload


def summarize_actual_target_date(
    current_rows: list[FirstUpCandidateRow],
    probs: list[float],
    conn: sqlite3.Connection,
) -> dict[str, float] | None:
    actual_lookup = build_actual_first_up_lookup(conn)
    grouped: dict[tuple[str, str], list[tuple[FirstUpCandidateRow, float]]] = defaultdict(list)
    for row, prob in zip(current_rows, probs):
        grouped[(row.as_of_date, row.team_name)].append((row, prob))

    total = 0
    exact = 0
    top2 = 0
    top3 = 0
    for (as_of_date, team_name), bucket in grouped.items():
        actual = actual_lookup.get((as_of_date, team_name))
        if not actual:
            continue
        total += 1
        ranked = sorted(
            bucket,
            key=lambda pair: (
                pair[1],
                pair[0].first_reliever_likelihood or 0.0,
                pair[0].availability_score or 0.0,
                pair[0].bridge_score or 0.0,
            ),
            reverse=True,
        )
        names = [row.pitcher_id for row, _ in ranked]
        actual_id = int(actual["pitcher_id"])
        if names and names[0] == actual_id:
            exact += 1
        if actual_id in names[:2]:
            top2 += 1
        if actual_id in names[:3]:
            top3 += 1

    if total <= 0:
        return None
    return {
        "samples": total,
        "exactRate": round(exact / total * 100.0, 1),
        "top2Rate": round(top2 / total * 100.0, 1),
        "top3Rate": round(top3 / total * 100.0, 1),
    }


def write_outputs(
    meta: dict[str, object],
    payload: dict[str, dict[str, object]],
    out_path: Path,
    module_out_path: Path,
) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    module_out_path.parent.mkdir(parents=True, exist_ok=True)

    out_path.write_text(json.dumps({"meta": meta, "relieverShadowByTeam": payload}, indent=2), encoding="utf8")
    module_source = (
        f"export const relieverShadowMeta = {json.dumps(meta, indent=2)}\n\n"
        f"export const relieverShadowByTeam = {json.dumps(payload, indent=2)}\n"
    )
    module_out_path.write_text(module_source, encoding="utf8")


def build_report(
    target_date: str,
    meta: dict[str, object],
    payload: dict[str, dict[str, object]],
    feature_lines: list[str],
    actual_summary: dict[str, float] | None,
    out_path: Path,
) -> None:
    sample_rows = []
    for entry in sorted(payload.values(), key=lambda item: float(item.get("topTwoSharePct") or 0.0), reverse=True)[:10]:
        relievers = entry.get("relievers") or []
        lead = relievers[0]["name"] if relievers else "-"
        alt = relievers[1]["name"] if len(relievers) > 1 else "-"
        sample_rows.append(
            [
                entry["teamName"],
                entry["opponentName"],
                lead,
                alt,
                f"{float(entry.get('starterHookRiskPct') or 0.0):.1f}%",
                f"{float(entry.get('topTwoSharePct') or 0.0):.1f}%",
            ]
        )

    actual_table_rows = (
        [
            [
                str(int(actual_summary["samples"])),
                f"{actual_summary['exactRate']:.1f}%",
                f"{actual_summary['top2Rate']:.1f}%",
                f"{actual_summary['top3Rate']:.1f}%",
            ]
        ]
        if actual_summary
        else [["0", "N/A", "N/A", "N/A"]]
    )

    report = f"""# MLB First-Up Reliever Shadow Board — May 30, 2026

This is `E34`, the first live-style bullpen artifact built from the `E33` reliever stack.

Goal:

- keep the reliever upgrade research in shadow mode
- surface a `first-up / top-2` bullpen cluster on real game cards
- use the same `E33` feature stack without changing the core live board yet

Target slate:

- date: `{target_date}`
- team-side shadow cards: `{meta['teamCount']}`
- reliever candidates scored: `{meta['candidateCount']}`
- conversion window: `{meta['conversionWindow']}`
- dependency window: `{meta['dependencyWindow']}`

## Research Baseline

{markdown_table(
    ["Reference", "Exact 1st", "Top-2", "Top-3"],
    [[
        "`E33 holdout`",
        f"{E33_EXACT_RATE:.1f}%",
        f"{E33_TOP2_RATE:.1f}%",
        f"{E33_TOP3_RATE:.1f}%"
    ]],
)}

## Target-Date Shadow Check

{markdown_table(
    ["Team-side games", "Exact 1st", "Top-2", "Top-3"],
    actual_table_rows,
)}

## Top Shadow Clusters

{markdown_table(
    ["Team", "Opponent", "Lead", "Alt", "Starter hook", "Top-2 share"],
    sample_rows,
)}

## Top Shadow Features

{chr(10).join(f"- {line}" for line in feature_lines) if feature_lines else "- `sklearn` unavailable, so no feature ranking was produced."}

## Read

- `E34` is not a live-model promotion. It is a board artifact for inspection.
- The shadow card is only meant to show:
  - who the `E33` stack thinks is first up
  - who the main alternate is
  - whether the starter hook and bullpen-shape context make the bridge risky or quiet
- Exact-name performance is still not good enough to call this solved, but the `E33` holdout rates are finally strong enough to inspect on game cards instead of burying the work in markdown only.
"""
    out_path.write_text(report, encoding="utf8")


def main() -> None:
    args = parse_args()
    out_path, module_out_path = default_out_paths(args.date)
    if args.out:
        out_path = Path(args.out)
    if args.module_out:
        module_out_path = Path(args.module_out)
    report_out_path = Path(args.report_out)

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row

    historical_rows = load_first_up_rows(conn)
    current_rows = load_current_candidate_rows(conn, args.date)
    all_rows = historical_rows + current_rows
    quality_appearances = load_quality_appearances(conn)
    quality_lookup = build_quality_lookup(all_rows, quality_appearances)
    lineup_lookup = build_candidate_lineup_features(all_rows, conn, conversion_window=8, dependency_window=5)

    feature_columns = (
        BASE_FEATURE_COLUMNS
        + AUGMENT_COLUMNS
        + QUALITY_COLUMNS
        + LINEUP_BASE_COLUMNS
        + LINEUP_INTERACTION_COLUMNS
        + LINEUP_DAMAGE_COLUMNS
    )

    train_rows = [row for row in historical_rows if row.as_of_date < args.date]
    probs: list[float] = []
    feature_lines: list[str] = []
    if train_rows and current_rows:
        probs, feature_lines = train_candidate_model(train_rows, current_rows, quality_lookup, lineup_lookup, feature_columns)

    vector_lookup = build_vector_lookup(all_rows, quality_lookup, lineup_lookup)
    payload = build_team_payload(current_rows, probs, vector_lookup) if current_rows else {}
    actual_summary = summarize_actual_target_date(current_rows, probs, conn) if current_rows else None
    conn.close()

    meta = {
        "date": args.date,
        "modelTag": "E34 shadow",
        "candidateCount": len(current_rows),
        "teamCount": len(payload),
        "conversionWindow": 8,
        "dependencyWindow": 5,
        "researchRates": {
            "exactRate": E33_EXACT_RATE,
            "top2Rate": E33_TOP2_RATE,
            "top3Rate": E33_TOP3_RATE,
        },
    }

    write_outputs(meta, payload, out_path, module_out_path)
    build_report(args.date, meta, payload, feature_lines, actual_summary, report_out_path)

    print(f"Wrote {out_path}")
    print(f"Wrote {module_out_path}")
    print(f"Wrote {report_out_path}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import math
import sqlite3
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import pandas as pd

try:
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
except Exception:  # pragma: no cover - optional research dependency
    GradientBoostingClassifier = None
    RandomForestClassifier = None


def find_root() -> Path:
    path = Path(__file__).resolve()
    for parent in path.parents:
        if (parent / "package.json").exists() and (parent / "models").exists():
            return parent
    raise RuntimeError("Could not locate project root.")


ROOT = find_root()
DB_PATH = ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db"
REPORT_DIR = ROOT / "models" / "mlb" / "cartridges" / "MLB-RP2" / "reports"
TRAINING_DIR = ROOT / "data-private" / "model-training" / "mlb"


def parse_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def days_between(later: str, earlier: str) -> int:
    return (parse_date(later) - parse_date(earlier)).days


def number(value: Any, fallback: float | None = None) -> float | None:
    if value is None or value == "":
        return fallback
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return fallback
    return parsed if math.isfinite(parsed) else fallback


def bucket_score_margin(value: Any) -> str:
    margin = number(value)
    if margin is None:
        return "unknown"
    if margin >= 4:
        return "lead_4_plus"
    if margin >= 2:
        return "lead_2_3"
    if margin == 1:
        return "lead_1"
    if margin == 0:
        return "tied"
    if margin == -1:
        return "trail_1"
    if margin >= -3:
        return "trail_2_3"
    return "trail_4_plus"


def bucket_starter_outs(value: Any) -> str:
    outs = number(value)
    if outs is None:
        return "unknown"
    if outs <= 9:
        return "very_short"
    if outs <= 14:
        return "short"
    if outs <= 17:
        return "standard"
    return "deep"


def bucket_inning(value: Any) -> str:
    inning = number(value)
    if inning is None:
        return "unknown"
    if inning <= 3:
        return "early"
    if inning <= 5:
        return "middle"
    if inning <= 7:
        return "bridge"
    return "late"


def load_first_relief_rows(conn: sqlite3.Connection, start: str, end: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        with relief as (
          select
            game_date,
            cast(game_pk as integer) as game_pk,
            team_name,
            opponent_name,
            cast(pitcher_id as integer) as pitcher_id,
            pitcher_name,
            cast(entry_order as integer) as entry_order,
            cast(outs_recorded as real) as outs_recorded,
            cast(pitches_thrown as real) as pitches_thrown,
            cast(runs_allowed as real) as runs_allowed,
            row_number() over (
              partition by game_date, cast(game_pk as integer), team_name
              order by cast(entry_order as integer), cast(pitcher_id as integer)
            ) as relief_order
          from mlb_pitcher_appearances
          where pitcher_role = 'reliever'
            and game_date between ? and ?
        ),
        starters as (
          select
            game_date,
            cast(game_pk as integer) as game_pk,
            team_name,
            cast(pitcher_id as integer) as starter_id,
            pitcher_name as starter_name,
            cast(outs_recorded as real) as starter_outs,
            cast(pitches_thrown as real) as starter_pitches,
            cast(runs_allowed as real) as starter_runs
          from mlb_pitcher_appearances
          where pitcher_role = 'starter'
            and game_date between ? and ?
        ),
        entry_pa as (
          select
            *,
            case
              when fielding_team_role = 'away' then cast(away_score_before as real) - cast(home_score_before as real)
              when fielding_team_role = 'home' then cast(home_score_before as real) - cast(away_score_before as real)
              else null
            end as pitching_team_score_margin,
            row_number() over (
              partition by cast(game_pk as integer), fielding_team, cast(pitcher_id as integer)
              order by cast(at_bat_index as integer)
            ) as pitcher_pa_rank
          from mlb_plate_appearances
          where game_date between ? and ?
        )
        select
          relief.game_date,
          relief.game_pk,
          relief.team_name,
          relief.opponent_name,
          relief.pitcher_id as first_reliever_id,
          relief.pitcher_name as first_reliever_name,
          relief.outs_recorded as first_reliever_outs,
          relief.pitches_thrown as first_reliever_pitches,
          starters.starter_id,
          starters.starter_name,
          starters.starter_outs,
          starters.starter_pitches,
          starters.starter_runs,
          entry_pa.inning as entry_inning,
          entry_pa.half_inning as entry_half_inning,
          entry_pa.outs_before as entry_outs_before,
          entry_pa.base_state_start as entry_base_state,
          entry_pa.men_on_base as entry_men_on_base,
          entry_pa.pitching_team_score_margin as entry_score_margin,
          entry_pa.batter_id as entry_batter_id,
          entry_pa.batter_name as entry_batter_name,
          entry_pa.batter_side as entry_batter_side,
          entry_pa.event_type as entry_event_type
        from relief
        left join starters
          on starters.game_date = relief.game_date
         and starters.game_pk = relief.game_pk
         and starters.team_name = relief.team_name
        left join entry_pa
          on entry_pa.game_pk = relief.game_pk
         and entry_pa.fielding_team = relief.team_name
         and cast(entry_pa.pitcher_id as integer) = relief.pitcher_id
         and entry_pa.pitcher_pa_rank = 1
        where relief.relief_order = 1
        order by relief.game_date, relief.game_pk, relief.team_name
        """,
        (start, end, start, end, start, end),
    ).fetchall()
    return [dict(row) for row in rows]


def load_relief_appearances(conn: sqlite3.Connection, start: str, end: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        select
          game_date,
          cast(game_pk as integer) as game_pk,
          team_name,
          cast(pitcher_id as integer) as pitcher_id,
          pitcher_name,
          cast(entry_order as integer) as entry_order,
          cast(outs_recorded as real) as outs_recorded,
          cast(pitches_thrown as real) as pitches_thrown,
          cast(runs_allowed as real) as runs_allowed
        from mlb_pitcher_appearances
        where pitcher_role = 'reliever'
          and game_date between ? and ?
        order by game_date, game_pk, team_name, cast(entry_order as integer), cast(pitcher_id as integer)
        """,
        (start, end),
    ).fetchall()
    return [dict(row) for row in rows]


def avg(values: list[float | None]) -> float | None:
    clean = [float(value) for value in values if value is not None and math.isfinite(float(value))]
    return sum(clean) / len(clean) if clean else None


def sum_pitches(rows: list[dict[str, Any]], current_date: str, max_days: int, exact_day: int | None = None) -> float:
    total = 0.0
    for row in rows:
        back = days_between(current_date, row["game_date"])
        if exact_day is not None and back != exact_day:
            continue
        if exact_day is None and not (1 <= back <= max_days):
            continue
        total += number(row.get("pitches_thrown"), 0) or 0
    return total


def count_rows(rows: list[dict[str, Any]], current_date: str, max_days: int) -> int:
    return sum(1 for row in rows if 1 <= days_between(current_date, row["game_date"]) <= max_days)


def first_up_score(rows: list[dict[str, Any]], current_date: str, max_games: int) -> float:
    score = 0.0
    recent = [row for row in rows if row["game_date"] < current_date]
    recent = sorted(recent, key=lambda row: (row["game_date"], row["game_pk"]), reverse=True)[:max_games]
    for index, _row in enumerate(recent):
        score += (max_games - index) / max_games
    return score


def row_key(row: dict[str, Any]) -> str:
    return f"{row['game_date']}|{row['game_pk']}|{row['team_name']}"


def build_candidate_rows(start: str, end: str) -> tuple[pd.DataFrame, dict[str, Any]]:
    history_start = (parse_date(start) - timedelta(days=60)).isoformat()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    first_rows = load_first_relief_rows(conn, history_start, end)
    appearances = load_relief_appearances(conn, history_start, end)
    conn.close()

    first_by_team: dict[str, list[dict[str, Any]]] = defaultdict(list)
    apps_by_team: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in first_rows:
        first_by_team[row["team_name"]].append(row)
    for row in appearances:
        apps_by_team[row["team_name"]].append(row)

    evaluation_games = [row for row in first_rows if start <= row["game_date"] <= end]
    candidate_rows: list[dict[str, Any]] = []
    actual_in_pool = 0
    forced_actual = 0
    missing_entry_state = 0

    for game in evaluation_games:
        current_date = game["game_date"]
        team = game["team_name"]
        actual_id = int(game["first_reliever_id"])
        prior_apps = [
            row for row in apps_by_team.get(team, [])
            if row["game_date"] < current_date and days_between(current_date, row["game_date"]) <= 45
        ]
        prior_firsts = [
            row for row in first_by_team.get(team, [])
            if row["game_date"] < current_date and days_between(current_date, row["game_date"]) <= 60
        ]
        apps_by_pitcher: dict[int, list[dict[str, Any]]] = defaultdict(list)
        firsts_by_pitcher: dict[int, list[dict[str, Any]]] = defaultdict(list)
        for row in prior_apps:
            if row["pitcher_id"] is not None:
                apps_by_pitcher[int(row["pitcher_id"])].append(row)
        for row in prior_firsts:
            if row["first_reliever_id"] is not None:
                firsts_by_pitcher[int(row["first_reliever_id"])].append(row)

        candidate_ids = sorted(
            apps_by_pitcher,
            key=lambda pitcher_id: (
                count_rows(apps_by_pitcher[pitcher_id], current_date, 14)
                + 3 * len(firsts_by_pitcher.get(pitcher_id, []))
                + first_up_score(firsts_by_pitcher.get(pitcher_id, []), current_date, 10),
                max(row["game_date"] for row in apps_by_pitcher[pitcher_id]),
            ),
            reverse=True,
        )[:8]
        in_pool_before_force = actual_id in candidate_ids
        if in_pool_before_force:
            actual_in_pool += 1
        else:
            candidate_ids.append(actual_id)
            forced_actual += 1

        if game.get("entry_inning") is None or game.get("entry_score_margin") is None:
            missing_entry_state += 1

        entry_score_state = bucket_score_margin(game.get("entry_score_margin"))
        starter_out_bucket = bucket_starter_outs(game.get("starter_outs"))
        entry_inning_bucket = bucket_inning(game.get("entry_inning"))

        for candidate_id in candidate_ids:
            c_apps = sorted(apps_by_pitcher.get(candidate_id, []), key=lambda row: (row["game_date"], row["game_pk"]), reverse=True)
            c_firsts = sorted(firsts_by_pitcher.get(candidate_id, []), key=lambda row: (row["game_date"], row["game_pk"]), reverse=True)
            recent_apps = c_apps[:10]
            recent_firsts = c_firsts[:10]
            candidate_name = (
                recent_apps[0]["pitcher_name"]
                if recent_apps else game["first_reliever_name"]
                if candidate_id == actual_id else None
            )
            same_starter_firsts = [
                row for row in recent_firsts
                if row.get("starter_id") is not None and row.get("starter_id") == game.get("starter_id")
            ]
            same_score_firsts = [
                row for row in recent_firsts
                if bucket_score_margin(row.get("entry_score_margin")) == entry_score_state
            ]
            same_starter_out_firsts = [
                row for row in recent_firsts
                if bucket_starter_outs(row.get("starter_outs")) == starter_out_bucket
            ]
            rest_days = days_between(current_date, c_apps[0]["game_date"]) if c_apps else None
            pitches_yesterday = sum_pitches(c_apps, current_date, 1, exact_day=1)
            rest_penalty_flag = 1 if pitches_yesterday >= 20 else 0
            pool_score = (
                first_up_score(c_firsts, current_date, 10) * 6
                + count_rows(c_apps, current_date, 14) * 1.4
                + len(same_starter_firsts) * 2
                - (8 if pitches_yesterday >= 30 else 4 if pitches_yesterday >= 20 else 0)
            )
            candidate_rows.append({
                "game_key": row_key(game),
                "game_date": current_date,
                "game_pk": game["game_pk"],
                "team_name": team,
                "opponent_name": game.get("opponent_name"),
                "candidate_pitcher_id": candidate_id,
                "candidate_pitcher_name": candidate_name,
                "is_first_reliever": 1 if candidate_id == actual_id else 0,
                "candidate_source": "prior_pool" if candidate_id != actual_id or in_pool_before_force else "forced_actual_missing_from_prior_pool",
                "actual_first_in_prior_pool": 1 if in_pool_before_force else 0,
                "starter_id": game.get("starter_id"),
                "starter_name": game.get("starter_name"),
                "starter_outs": number(game.get("starter_outs")),
                "starter_pitches": number(game.get("starter_pitches")),
                "starter_runs": number(game.get("starter_runs")),
                "starter_out_bucket": starter_out_bucket,
                "entry_inning": number(game.get("entry_inning")),
                "entry_inning_bucket": entry_inning_bucket,
                "entry_outs_before": number(game.get("entry_outs_before")),
                "entry_base_state": game.get("entry_base_state") or "unknown",
                "entry_score_margin": number(game.get("entry_score_margin")),
                "entry_score_state": entry_score_state,
                "entry_abs_score_margin": abs(number(game.get("entry_score_margin"), 0) or 0),
                "entry_batter_side": game.get("entry_batter_side") or "unknown",
                "entry_runners_on": 0 if str(game.get("entry_base_state") or "").lower() == "empty" else 1,
                "candidate_rest_days": rest_days,
                "candidate_pitches_yesterday": pitches_yesterday,
                "candidate_pitches_last2": sum_pitches(c_apps, current_date, 2),
                "candidate_pitches_last3": sum_pitches(c_apps, current_date, 3),
                "candidate_used_days_last3": len({
                    days_between(current_date, row["game_date"])
                    for row in c_apps
                    if 1 <= days_between(current_date, row["game_date"]) <= 3
                    and (number(row.get("pitches_thrown"), 0) or 0) > 0
                }),
                "candidate_rest_penalty_flag": rest_penalty_flag,
                "candidate_appearances_last7": count_rows(c_apps, current_date, 7),
                "candidate_appearances_last14": count_rows(c_apps, current_date, 14),
                "candidate_appearances_last30": count_rows(c_apps, current_date, 30),
                "candidate_first_up_last3_team_games": min(len(c_firsts[:3]), 3),
                "candidate_first_up_last5": len(c_firsts[:5]),
                "candidate_first_up_last10": len(c_firsts[:10]),
                "candidate_first_up_recency_score": first_up_score(c_firsts, current_date, 10),
                "candidate_same_starter_first_up_count": len(same_starter_firsts),
                "candidate_same_score_state_first_up_count": len(same_score_firsts),
                "candidate_same_starter_out_bucket_first_up_count": len(same_starter_out_firsts),
                "candidate_avg_entry_order_last10": avg([number(row.get("entry_order")) for row in recent_apps]),
                "candidate_avg_outs_last10": avg([number(row.get("outs_recorded")) for row in recent_apps]),
                "candidate_avg_pitches_last10": avg([number(row.get("pitches_thrown")) for row in recent_apps]),
                "candidate_avg_runs_allowed_last10": avg([number(row.get("runs_allowed")) for row in recent_apps]),
                "pool_usage_score": pool_score,
            })

    frame = pd.DataFrame(candidate_rows)
    audit = {
        "team_games": len(evaluation_games),
        "candidate_rows": len(candidate_rows),
        "positive_rows": int(frame["is_first_reliever"].sum()) if not frame.empty else 0,
        "avg_candidates_per_team_game": round(len(candidate_rows) / max(len(evaluation_games), 1), 2),
        "actual_first_in_prior_pool": actual_in_pool,
        "actual_first_forced_into_pool": forced_actual,
        "actual_first_prior_pool_pct": round(actual_in_pool / max(len(evaluation_games), 1) * 100, 1),
        "missing_entry_state_games": missing_entry_state,
    }
    return frame, audit


def topk_metrics(frame: pd.DataFrame, score_col: str) -> dict[str, Any]:
    if frame.empty or score_col not in frame:
        return {"games": 0, "top1": None, "top2": None, "top3": None}
    top1 = top2 = top3 = 0
    games = 0
    for _game_key, group in frame.groupby("game_key"):
        ranked = group.sort_values(score_col, ascending=False)
        labels = ranked["is_first_reliever"].tolist()
        if not labels:
            continue
        games += 1
        top1 += 1 if any(labels[:1]) else 0
        top2 += 1 if any(labels[:2]) else 0
        top3 += 1 if any(labels[:3]) else 0
    return {
        "games": games,
        "top1": round(top1 / max(games, 1) * 100, 1),
        "top2": round(top2 / max(games, 1) * 100, 1),
        "top3": round(top3 / max(games, 1) * 100, 1),
    }


def train_models(frame: pd.DataFrame) -> dict[str, Any]:
    if frame.empty:
        return {"available": False, "reason": "No candidate rows."}
    if GradientBoostingClassifier is None or RandomForestClassifier is None:
        return {"available": False, "reason": "sklearn unavailable."}

    dates = sorted(frame["game_date"].unique())
    if len(dates) < 10:
        return {"available": False, "reason": "Not enough dates for chronological train/test split."}
    split_date = dates[int(len(dates) * 0.72)]
    train = frame[frame["game_date"] < split_date].copy()
    test = frame[frame["game_date"] >= split_date].copy()
    numeric_cols = [
        "starter_outs",
        "starter_pitches",
        "starter_runs",
        "entry_inning",
        "entry_outs_before",
        "entry_score_margin",
        "entry_abs_score_margin",
        "entry_runners_on",
        "candidate_rest_days",
        "candidate_pitches_yesterday",
        "candidate_pitches_last2",
        "candidate_pitches_last3",
        "candidate_used_days_last3",
        "candidate_rest_penalty_flag",
        "candidate_appearances_last7",
        "candidate_appearances_last14",
        "candidate_appearances_last30",
        "candidate_first_up_last3_team_games",
        "candidate_first_up_last5",
        "candidate_first_up_last10",
        "candidate_first_up_recency_score",
        "candidate_same_starter_first_up_count",
        "candidate_same_score_state_first_up_count",
        "candidate_same_starter_out_bucket_first_up_count",
        "candidate_avg_entry_order_last10",
        "candidate_avg_outs_last10",
        "candidate_avg_pitches_last10",
        "candidate_avg_runs_allowed_last10",
        "pool_usage_score",
    ]
    categorical_cols = [
        "team_name",
        "starter_out_bucket",
        "entry_inning_bucket",
        "entry_base_state",
        "entry_score_state",
        "entry_batter_side",
    ]
    feature_frame = frame[numeric_cols + categorical_cols].copy()
    for col in numeric_cols:
        feature_frame[col] = pd.to_numeric(feature_frame[col], errors="coerce").fillna(-1)
    encoded = pd.get_dummies(feature_frame, columns=categorical_cols, dummy_na=True)
    train_x = encoded.loc[train.index]
    test_x = encoded.loc[test.index]
    train_y = train["is_first_reliever"].astype(int)

    models = {
        "gradient_boosting": GradientBoostingClassifier(random_state=42, max_depth=3, learning_rate=0.04, n_estimators=180),
        "random_forest": RandomForestClassifier(random_state=42, n_estimators=240, min_samples_leaf=6, class_weight="balanced_subsample", n_jobs=-1),
    }
    results: dict[str, Any] = {
        "available": True,
        "splitDate": split_date,
        "trainRows": int(len(train)),
        "testRows": int(len(test)),
        "trainGames": int(train["game_key"].nunique()),
        "testGames": int(test["game_key"].nunique()),
        "baselines": {
            "pool_usage_score": topk_metrics(test, "pool_usage_score"),
            "first_up_recency": topk_metrics(test.assign(first_up_recency=test["candidate_first_up_recency_score"]), "first_up_recency"),
        },
        "models": {},
    }
    for name, model in models.items():
        model.fit(train_x, train_y)
        scored = test.copy()
        scored[f"{name}_prob"] = model.predict_proba(test_x)[:, 1]
        importances = getattr(model, "feature_importances_", None)
        top_features: list[dict[str, Any]] = []
        if importances is not None:
            top_features = [
                {"feature": feature, "importance": round(float(score), 5)}
                for feature, score in sorted(zip(train_x.columns, importances), key=lambda item: item[1], reverse=True)[:20]
            ]
        results["models"][name] = {
            "topk": topk_metrics(scored, f"{name}_prob"),
            "topFeatures": top_features,
        }
    return results


def write_report(report: dict[str, Any], rows: pd.DataFrame, out_json: Path, out_md: Path, out_csv: Path) -> None:
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_md.parent.mkdir(parents=True, exist_ok=True)
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(report, indent=2) + "\n")
    rows.to_csv(out_csv, index=False)
    model_lines = []
    training = report.get("training", {})
    if training.get("available"):
        for name, result in training.get("models", {}).items():
            topk = result.get("topk", {})
            model_lines.append(f"| {name} | {topk.get('top1')}% | {topk.get('top2')}% | {topk.get('top3')}% |")
    else:
        model_lines.append(f"| unavailable | - | - | - |")
    audit = report["audit"]
    markdown = f"""# First Reliever ML Candidate Exploration

Window: `{report['window']['startDate']}` to `{report['window']['endDate']}`

## Dataset

- Team-games: {audit['team_games']}
- Candidate rows: {audit['candidate_rows']}
- Avg candidates/team-game: {audit['avg_candidates_per_team_game']}
- Actual first reliever in prior pool: {audit['actual_first_prior_pool_pct']}%
- Forced actual rows: {audit['actual_first_forced_into_pool']}
- Missing entry-state games: {audit['missing_entry_state_games']}

## Chronological Test

Split date: `{training.get('splitDate')}`

| Model | Top 1 | Top 2 | Top 3 |
| --- | ---: | ---: | ---: |
{chr(10).join(model_lines)}

## Baselines

```json
{json.dumps(training.get('baselines', {}), indent=2)}
```

## Feature Direction

This is a conditional first-reliever model. It uses actual starter-exit game state for research:
inning, score margin, base state, outs, batter side, starter outs/pitches, candidate rest,
recent first-up usage, same-starter history, and candidate state-affinity counts.

For pregame use, M2 should feed this model simulated or expected starter-exit states rather than
postgame truth.

Training rows CSV: `{out_csv.relative_to(ROOT)}`
"""
    out_md.write_text(markdown)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Explore trainable first-reliever candidate model rows.")
    parser.add_argument("--start-date", default="2026-05-09")
    parser.add_argument("--end-date", default="2026-08-20")
    parser.add_argument("--out", default=None)
    parser.add_argument("--md-out", default=None)
    parser.add_argument("--csv-out", default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    frame, audit = build_candidate_rows(args.start_date, args.end_date)
    training = train_models(frame)
    stem = f"first-reliever-ml-candidate-exploration-{args.start_date}-to-{args.end_date}"
    out_json = Path(args.out) if args.out else REPORT_DIR / f"{stem}.json"
    out_md = Path(args.md_out) if args.md_out else REPORT_DIR / f"{stem}.md"
    out_csv = Path(args.csv_out) if args.csv_out else TRAINING_DIR / f"{stem}.csv"
    report = {
        "schemaVersion": 1,
        "generatedAt": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "window": {"startDate": args.start_date, "endDate": args.end_date},
        "dbPath": str(DB_PATH.relative_to(ROOT)),
        "audit": audit,
        "training": training,
        "featureGroups": {
            "gameState": ["entry_inning", "entry_score_margin", "entry_base_state", "entry_outs_before", "entry_batter_side"],
            "starter": ["starter_outs", "starter_pitches", "starter_runs", "starter_out_bucket"],
            "candidateRest": ["candidate_pitches_yesterday", "candidate_pitches_last2", "candidate_pitches_last3", "candidate_rest_days"],
            "candidateUsage": ["candidate_appearances_last7", "candidate_first_up_last10", "candidate_avg_entry_order_last10"],
            "stateAffinity": ["candidate_same_score_state_first_up_count", "candidate_same_starter_out_bucket_first_up_count"],
        },
    }
    write_report(report, frame, out_json, out_md, out_csv)
    print(json.dumps({
        "status": "ok",
        "outPath": str(out_json.relative_to(ROOT)),
        "mdOutPath": str(out_md.relative_to(ROOT)),
        "csvOutPath": str(out_csv.relative_to(ROOT)),
        "audit": audit,
        "training": training,
    }, indent=2))


if __name__ == "__main__":
    main()

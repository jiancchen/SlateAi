#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.sources.tennis.normalization.common import compact_json, write_report


CORE = "core_model_data"
SECONDARY = "secondary_feature_event"
LEFTOVER = "classified_leftover"


FAMILY_RULES: list[tuple[str, str, str, str, list[str], str]] = [
    ("hitter_pitch_type_response", CORE, "MLB hitter/batter features", "pipeline/sources/mlb/normalization/hitter_features.py", ["player_pitch_type_response_snapshots"], "Pitch-type response is a batter feature used for matchup shape."),
    ("hitter_statcast", CORE, "MLB hitter/batter features", "pipeline/sources/mlb/normalization/hitter_features.py", ["player_statcast_snapshots", "player_statcast_game_logs"], "Statcast hitter trend/game-log features drive batter strength and prop shape."),
    ("hitter_classic", CORE, "MLB hitter/batter features", "pipeline/sources/mlb/normalization/hitter_features.py", ["player_classic_stat_snapshots"], "Classic hitter form is a batter feature."),
    ("hitter_opponent_context", CORE, "MLB hitter/batter features", "pipeline/sources/mlb/normalization/hitter_features.py", ["player_opponent_context_snapshots"], "Opponent context is needed for pitcher-batter matchup shape."),
    ("hitter_state", CORE, "MLB hitter/batter features", "pipeline/sources/mlb/normalization/hitter_features.py", ["player_state_snapshots"], "Hitter state feeds game-flow and prop gates."),
    ("hitter_split", SECONDARY, "MLB player career/splits/context", "pipeline/sources/mlb/normalization/player_context.py", ["player_split_snapshots"], "Splits are useful context and should be typed for DuckDB joins."),
    ("hitter_career", SECONDARY, "MLB player career/splits/context", "pipeline/sources/mlb/normalization/player_context.py", ["player_career_profiles"], "Career profiles are lower-weight player context."),
    ("player_identity", SECONDARY, "MLB player career/splits/context", "pipeline/sources/mlb/normalization/player_context.py", ["player_identity_profiles", "player_identity_curves", "player_identity_backtests"], "Identity/role curves are useful context and model diagnostics."),
    ("player_current_deviation", CORE, "MLB hitter/batter features", "pipeline/sources/mlb/normalization/hitter_features.py", ["player_current_deviation_snapshots"], "Current-vs-career deviation is active batter repeatability signal."),
    ("player_game_distribution", CORE, "MLB hitter/batter features", "pipeline/sources/mlb/normalization/hitter_features.py", ["player_game_distribution_snapshots"], "Player distribution is active prop/model shape input."),
    ("player_game_batting", CORE, "MLB results/outcomes", "pipeline/sources/mlb/normalization/results.py", ["player_game_batting"], "Player batting outcomes are model labels and prop settlement inputs."),
    ("batter_game_outcomes", CORE, "MLB results/outcomes", "pipeline/sources/mlb/normalization/results.py", ["batter_game_outcomes"], "Batter game outcomes are labels for props and batter state."),
    ("pitcher_pitch_mix", CORE, "MLB pitcher/starter features", "pipeline/sources/mlb/normalization/pitcher_features.py", ["pitcher_pitch_mix_snapshots"], "Pitch mix drives pitcher-batter matchup shape."),
    ("pitcher_first_inning", CORE, "MLB pitcher/starter features", "pipeline/sources/mlb/normalization/pitcher_features.py", ["pitcher_first_inning_profiles"], "First-inning pitcher profile is active F5/RFI input."),
    ("pitcher_mistake_shape", CORE, "MLB pitcher/starter features", "pipeline/sources/mlb/normalization/pitcher_features.py", ["pitcher_mistake_shape_snapshots"], "Pitcher mistake shape is active chaos/game-flow input."),
    ("pitcher_appearances", CORE, "MLB results/outcomes", "pipeline/sources/mlb/normalization/results.py", ["pitcher_appearances"], "Pitcher appearances are labels and workload inputs."),
    ("pitcher_war", SECONDARY, "MLB player career/splits/context", "pipeline/sources/mlb/normalization/player_context.py", ["pitcher_season_value_snapshots"], "Season WAR is secondary pitcher context."),
    ("starting_pitcher_game_logs", CORE, "MLB results/outcomes", "pipeline/sources/mlb/normalization/results.py", ["starting_pitcher_game_logs"], "Starter game logs are labels and pitcher form inputs."),
    ("starting_pitcher_rolling_form", CORE, "MLB pitcher/starter features", "pipeline/sources/mlb/normalization/pitcher_features.py", ["starting_pitcher_form_snapshots"], "Starter rolling form is core prediction input."),
    ("starter_leash", CORE, "MLB pitcher/starter features", "pipeline/sources/mlb/normalization/pitcher_features.py", ["starter_leash_profiles"], "Starter leash affects F5/full-game shape."),
    ("starter_third_time", CORE, "MLB pitcher/starter features", "pipeline/sources/mlb/normalization/pitcher_features.py", ["starter_third_time_penalty_profiles"], "Third-time penalty feeds starter-to-bullpen transition."),
    ("bullpen", CORE, "MLB bullpen/relief shape", "pipeline/sources/mlb/normalization/bullpen_features.py", ["bullpen_usage_snapshots", "bullpen_mistake_shape_snapshots", "team_bullpen_shape_snapshots"], "Bullpen shape is core side/total model input."),
    ("reliever", CORE, "MLB bullpen/relief shape", "pipeline/sources/mlb/normalization/bullpen_features.py", ["reliever_command_profiles", "likely_relief_chains"], "Reliever/chain profiles drive starter-to-bullpen game flow."),
    ("likely_relief", CORE, "MLB bullpen/relief shape", "pipeline/sources/mlb/normalization/bullpen_features.py", ["likely_relief_chains"], "Relief chain is active game-flow input."),
    ("lineup", CORE, "MLB lineup/matchup features", "pipeline/sources/mlb/normalization/lineups.py", ["lineups", "lineup_slots", "lineup_matchup_snapshots", "lineup_shape_snapshots"], "Lineup and matchup shape are core model data."),
    ("team_first_inning", CORE, "MLB team/game-shape features", "pipeline/sources/mlb/normalization/team_features.py", ["team_first_inning_profiles"], "Team first-inning profile is active RFI/F5 input."),
    ("team_mistake_shape", CORE, "MLB team/game-shape features", "pipeline/sources/mlb/normalization/team_features.py", ["team_mistake_shape_snapshots"], "Mistake shape is active chaos input."),
    ("team_rolling_form", CORE, "MLB team/game-shape features", "pipeline/sources/mlb/normalization/team_features.py", ["team_rolling_form_snapshots"], "Team rolling form is active prediction input."),
    ("team_state", CORE, "MLB team/game-shape features", "pipeline/sources/mlb/normalization/team_features.py", ["team_state_snapshots"], "Team state is active model input."),
    ("team_opponent_quality", CORE, "MLB team/game-shape features", "pipeline/sources/mlb/normalization/team_features.py", ["team_opponent_quality_snapshots"], "Opponent quality adjusts team form."),
    ("team_market_context", SECONDARY, "MLB market/odds context", "pipeline/sources/mlb/normalization/markets.py", ["team_market_context_snapshots"], "Market context is useful for calibration and mispricing studies."),
    ("team_form_carryover", CORE, "MLB team/game-shape features", "pipeline/sources/mlb/normalization/team_features.py", ["team_form_carryover_profiles"], "Carryover feeds game-shape continuity."),
    ("team_lead_surrender", CORE, "MLB team/game-shape features", "pipeline/sources/mlb/normalization/team_features.py", ["team_lead_surrender_profiles"], "Lead surrender profile affects late-game total/side shape."),
    ("team_whiff_persistence", CORE, "MLB team/game-shape features", "pipeline/sources/mlb/normalization/team_features.py", ["team_whiff_persistence_profiles"], "Whiff persistence affects offensive volatility."),
    ("team_story_priors", SECONDARY, "MLB team trend/context", "pipeline/sources/mlb/normalization/team_context.py", ["team_story_priors"], "Story priors are useful context but lower-trust than direct features."),
    ("phase_outcomes", CORE, "MLB results/outcomes", "pipeline/sources/mlb/normalization/results.py", ["phase_outcomes"], "Phase outcomes label inning/phase model lanes."),
    ("game_outcomes", CORE, "MLB results/outcomes", "pipeline/sources/mlb/normalization/results.py", ["game_outcomes"], "Game outcomes are settlement labels."),
    ("game_team_stats", CORE, "MLB results/outcomes", "pipeline/sources/mlb/normalization/results.py", ["team_game_stats"], "Team box stats label game shape."),
    ("game_story", SECONDARY, "MLB team trend/context", "pipeline/sources/mlb/normalization/team_context.py", ["game_story_labels", "game_story_signals"], "Story labels/signals are useful context and diagnostics."),
    ("series_context", SECONDARY, "MLB team trend/context", "pipeline/sources/mlb/normalization/team_context.py", ["series_context_snapshots"], "Series context is useful but secondary."),
    ("sun_visibility", CORE, "MLB environment/sun/park", "pipeline/sources/mlb/normalization/environment.py", ["game_environment_snapshots", "game_sun_visibility_snapshots"], "Sun visibility feeds error/chaos modeling."),
    ("visibility_outcomes", CORE, "MLB environment/sun/park", "pipeline/sources/mlb/normalization/environment.py", ["game_visibility_outcomes"], "Visibility outcomes label environment factors."),
    ("market_odds", CORE, "MLB markets/odds", "pipeline/sources/mlb/normalization/markets.py", ["market_snapshots"], "Market odds are core EV and value-board inputs."),
    ("kalshi_market", CORE, "MLB markets/odds", "pipeline/sources/mlb/normalization/markets.py", ["market_contracts", "market_price_ticks", "market_snapshots"], "Prediction-market prices are core EV inputs."),
    ("featured_market_odds", CORE, "MLB markets/odds", "pipeline/sources/mlb/normalization/markets.py", ["market_snapshots"], "Featured odds feed active value boards."),
    ("player_prop_odds", CORE, "MLB props/odds", "pipeline/sources/mlb/normalization/props.py", ["prop_market_snapshots"], "Player prop odds are active prop EV inputs."),
    ("prop_predictions", CORE, "MLB predictions/backtests", "pipeline/sources/mlb/normalization/predictions.py", ["prediction_rows"], "Prop predictions are active model outputs."),
    ("prop_backtests", CORE, "MLB predictions/backtests", "pipeline/sources/mlb/normalization/predictions.py", ["settlement_rows", "prop_backtest_rows"], "Prop backtests are model performance labels."),
    ("side_predictions", CORE, "MLB predictions/backtests", "pipeline/sources/mlb/normalization/predictions.py", ["prediction_rows"], "Side predictions are active model outputs."),
    ("side_backtests", CORE, "MLB predictions/backtests", "pipeline/sources/mlb/normalization/predictions.py", ["settlement_rows", "side_backtest_rows"], "Side backtests are model performance labels."),
    ("home_run_predictions", CORE, "MLB predictions/backtests", "pipeline/sources/mlb/normalization/predictions.py", ["prediction_rows"], "Home-run predictions are active model outputs."),
    ("home_run_backtests", CORE, "MLB predictions/backtests", "pipeline/sources/mlb/normalization/predictions.py", ["settlement_rows", "home_run_backtest_rows"], "Home-run backtests are model performance labels."),
    ("home_run_events", CORE, "MLB results/outcomes", "pipeline/sources/mlb/normalization/results.py", ["home_run_events"], "Home-run events label HR prop lanes."),
    ("state_formula_training", CORE, "MLB game-shape/state formula", "pipeline/sources/mlb/normalization/game_shape.py", ["state_formula_training_rows"], "State formula rows are core M2 training data."),
    ("state_formula_backtests", CORE, "MLB game-shape/state formula", "pipeline/sources/mlb/normalization/game_shape.py", ["state_formula_backtests"], "State formula backtests are core M2 validation data."),
    ("market_mispricing", SECONDARY, "MLB market/odds context", "pipeline/sources/mlb/normalization/markets.py", ["market_mispricing_labels"], "Mispricing labels are calibration context."),
    ("statcast_hr_leaderboard", SECONDARY, "MLB player career/splits/context", "pipeline/sources/mlb/normalization/player_context.py", ["statcast_hr_leaderboard_snapshots"], "Leaderboard snapshots are useful HR context."),
    ("rp36", CORE, "MLB predictions/backtests", "pipeline/sources/mlb/normalization/predictions.py", ["settlement_rows", "component_settlement_rows"], "RP36 settlement rows are active component labels."),
    ("model_run", CORE, "MLB model metadata", "pipeline/sources/mlb/normalization/model_metadata.py", ["model_runs", "model_run_lanes", "model_run_artifacts"], "Model metadata is required to track cartridge outputs and performance."),
    ("model_component", CORE, "MLB model metadata", "pipeline/sources/mlb/normalization/model_metadata.py", ["model_component_runs"], "Component metadata is required for composed models."),
]


EXPLICIT: dict[str, tuple[str, str, str, list[str], str]] = {
    "mlb_player_identity_model_backtests": (CORE, "MLB predictions/backtests", "pipeline/sources/mlb/normalization/predictions.py", ["player_identity_backtest_rows"], "Identity model backtests are performance labels."),
    "mlb_player_identity_profiles": (SECONDARY, "MLB player career/splits/context", "pipeline/sources/mlb/normalization/player_context.py", ["player_identity_profiles"], "Identity profiles are player context."),
    "mlb_player_identity_curves_daily": (SECONDARY, "MLB player career/splits/context", "pipeline/sources/mlb/normalization/player_context.py", ["player_identity_curves"], "Identity curves are player context."),
    "model_runs": (CORE, "MLB model metadata", "pipeline/sources/mlb/normalization/model_metadata.py", ["model_runs"], "Model run rows are required for model history."),
    "model_run_lanes": (CORE, "MLB model metadata", "pipeline/sources/mlb/normalization/model_metadata.py", ["model_run_lanes"], "Model lane rows are required for model history."),
    "model_run_artifacts": (CORE, "MLB model metadata", "pipeline/sources/mlb/normalization/model_metadata.py", ["model_run_artifacts"], "Model artifact rows are required for model history."),
    "model_component_runs": (CORE, "MLB model metadata", "pipeline/sources/mlb/normalization/model_metadata.py", ["model_component_runs"], "Component rows are required for cartridge composition."),
}


SEARCH_ROOTS = ["pipeline/mlb", "pipeline/sources/mlb", "models/mlb", "api/src", "scripts", "data-migration/scripts"]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inventory and classify MLB legacy normalization families.")
    parser.add_argument("--source-db", type=Path, default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db")
    parser.add_argument("--json-report", type=Path, default=ROOT / "data-migration" / "reports" / "mlb_normalization_inventory_2026-06-02.json")
    parser.add_argument("--md-report", type=Path, default=ROOT / "data-migration" / "reports" / "mlb_normalization_inventory_2026-06-02.md")
    parser.add_argument("--skip-consumers", action="store_true")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.json_report.is_absolute():
        args.json_report = ROOT / args.json_report
    if not args.md_report.is_absolute():
        args.md_report = ROOT / args.md_report
    return args


def sample_keys(con: sqlite3.Connection, table: str, limit: int = 5) -> list[str]:
    keys: set[str] = set()
    rows = con.execute(
        """
        select row_json from legacy_table_rows
        where sport = 'mlb' and source_table = ?
        limit ?
        """,
        (table, limit),
    ).fetchall()
    for row in rows:
        try:
            payload = json.loads(row["row_json"] or "{}")
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict):
            keys.update(str(key) for key in payload.keys())
    return sorted(keys)


def classify_source_table(source_table: str) -> dict[str, Any]:
    if source_table in EXPLICIT:
        bucket, family, parser_module, targets, notes = EXPLICIT[source_table]
        return {
            "bucket": bucket,
            "family": family,
            "parser_module": parser_module,
            "target_tables": targets,
            "classification_notes": notes,
        }
    normalized = source_table.removeprefix("mlb_")
    for pattern, bucket, family, parser_module, targets, notes in FAMILY_RULES:
        if pattern in normalized:
            return {
                "bucket": bucket,
                "family": family,
                "parser_module": parser_module,
                "target_tables": targets,
                "classification_notes": notes,
            }
    return {
        "bucket": LEFTOVER,
        "family": "MLB classified leftovers",
        "parser_module": "pipeline/sources/mlb/normalization/classified_context.py",
        "target_tables": ["source_context_rows"],
        "classification_notes": "No specific rule matched; classify into source/context rows until a stricter schema is justified.",
    }


def find_consumers(source_table: str) -> list[str]:
    consumers: set[str] = set()
    for root in SEARCH_ROOTS:
        path = ROOT / root
        if not path.exists():
            continue
        result = subprocess.run(
            ["rg", "-l", source_table, str(path)],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        for line in result.stdout.splitlines():
            rel = str(Path(line).resolve().relative_to(ROOT))
            consumers.add(rel)
    return sorted(consumers)


def source_registration_summary(con: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = con.execute(
        """
        select source_name,
               count(*) as snapshot_count,
               min(source_date) as first_source_date,
               max(source_date) as last_source_date,
               min(local_path) as sample_path
        from source_snapshots
        where sport = 'mlb'
        group by source_name
        order by source_name
        """
    ).fetchall()
    return [dict(row) for row in rows]


def build_inventory(con: sqlite3.Connection, source_db: Path, include_consumers: bool) -> dict[str, Any]:
    rows = con.execute(
        """
        select source_table,
               count(*) as row_count,
               min(source_date) as first_source_date,
               max(source_date) as last_source_date,
               count(distinct source_date) as source_date_count,
               count(distinct entity_ref) as entity_ref_count,
               count(distinct source_pk) as source_pk_count
        from legacy_table_rows
        where sport = 'mlb'
        group by source_table
        order by row_count desc, source_table
        """
    ).fetchall()
    table_rows = []
    for row in rows:
        item = dict(row)
        item.update(classify_source_table(row["source_table"]))
        item["sample_keys"] = sample_keys(con, row["source_table"])
        item["consumer_files"] = [
            consumer for consumer in find_consumers(row["source_table"])
            if consumer != "data-migration/scripts/inventory_mlb_normalization.py"
        ] if include_consumers else []
        item["migration_script"] = item["parser_module"].replace("pipeline/sources/mlb/normalization/", "data-migration/scripts/normalize_mlb_").replace(".py", ".py")
        table_rows.append(item)

    bucket_counts = Counter(row["bucket"] for row in table_rows)
    family_counts = defaultdict(lambda: {"source_tables": 0, "rows": 0, "bucket": None, "target_tables": set(), "parser_modules": set()})
    for row in table_rows:
        entry = family_counts[row["family"]]
        entry["source_tables"] += 1
        entry["rows"] += row["row_count"]
        entry["bucket"] = row["bucket"] if entry["bucket"] is None else entry["bucket"]
        entry["target_tables"].update(row["target_tables"])
        entry["parser_modules"].add(row["parser_module"])
    family_rows = [
        {
            "family": family,
            "bucket": values["bucket"],
            "source_tables": values["source_tables"],
            "row_count": values["rows"],
            "target_tables": sorted(values["target_tables"]),
            "parser_modules": sorted(values["parser_modules"]),
        }
        for family, values in sorted(family_counts.items())
    ]
    unclassified = [row["source_table"] for row in table_rows if row["bucket"] == LEFTOVER and row["family"] == "MLB classified leftovers"]
    return {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/inventory_mlb_normalization.py",
        "source_db": str(source_db.relative_to(ROOT)),
        "legacy_source_table_count": len(table_rows),
        "legacy_row_count": sum(row["row_count"] for row in table_rows),
        "bucket_counts": dict(sorted(bucket_counts.items())),
        "family_count": len(family_rows),
        "families": family_rows,
        "source_tables": table_rows,
        "source_registrations": source_registration_summary(con),
        "classified_leftover_tables": unclassified,
        "ok": len(unclassified) == 0,
    }


def write_markdown(path: Path, report: dict[str, Any]) -> None:
    lines: list[str] = []
    lines.append("# MLB Normalization Inventory")
    lines.append("")
    lines.append(f"Generated: `{report['generated_at']}`")
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- Legacy source tables: `{report['legacy_source_table_count']}`")
    lines.append(f"- Legacy rows: `{report['legacy_row_count']:,}`")
    for bucket, count in report["bucket_counts"].items():
        lines.append(f"- `{bucket}` tables: `{count}`")
    lines.append(f"- Unclassified leftovers: `{len(report['classified_leftover_tables'])}`")
    lines.append("")
    lines.append("## Source Registrations")
    lines.append("")
    lines.append("| Source | Snapshots | Date Range | Sample Path |")
    lines.append("|---|---:|---|---|")
    for source in report["source_registrations"]:
        date_range = f"{source.get('first_source_date') or ''} to {source.get('last_source_date') or ''}"
        lines.append(f"| `{source['source_name']}` | {source['snapshot_count']:,} | {date_range} | `{source.get('sample_path') or ''}` |")
    lines.append("")
    lines.append("## Family Classification")
    lines.append("")
    lines.append("| Family | Bucket | Tables | Rows | Parser | Target Tables |")
    lines.append("|---|---|---:|---:|---|---|")
    for family in report["families"]:
        parser = ", ".join(f"`{value}`" for value in family["parser_modules"])
        targets = ", ".join(f"`{value}`" for value in family["target_tables"])
        lines.append(
            f"| {family['family']} | `{family['bucket']}` | {family['source_tables']} | {family['row_count']:,} | {parser} | {targets} |"
        )
    lines.append("")
    lines.append("## Source Table Classification")
    lines.append("")
    lines.append("| Source Table | Rows | Bucket | Family | Target Tables | Consumer Files | Notes |")
    lines.append("|---|---:|---|---|---|---:|---|")
    for table in report["source_tables"]:
        targets = ", ".join(f"`{value}`" for value in table["target_tables"])
        lines.append(
            f"| `{table['source_table']}` | {table['row_count']:,} | `{table['bucket']}` | {table['family']} | {targets} | {len(table['consumer_files'])} | {table['classification_notes']} |"
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        report = build_inventory(con, args.source_db, include_consumers=not args.skip_consumers)
    write_report(args.json_report, report)
    write_markdown(args.md_report, report)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

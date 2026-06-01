#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[5]
BASELINE_PATH = ROOT / "models" / "mlb" / "cartridges" / "MLB-M2" / "benchmarks" / "2026-06-01-current-baseline.json"
PRIVATE_REPORT_DIR = ROOT / "data-private" / "reports"
REPORT_DIR = ROOT / "models" / "mlb" / "cartridges" / "MLB-M2" / "reports"


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text()) if path.exists() else {}


def rate_label(value: float | None) -> str:
    if value is None:
        return "n/a"
    return f"{value * 100:.1f}%"


def find_lane(rows: list[dict[str, Any]], lane: str) -> dict[str, Any]:
    for row in rows:
        if row.get("lane") == lane:
            return row
    return {}


def find_player_metric(rows: list[dict[str, Any]], metric: str) -> dict[str, Any]:
    for row in rows:
        if row.get("metric") == metric:
            return row
    return {}


def build_report(start: str, end: str, holdout: str) -> dict[str, Any]:
    baseline = load_json(BASELINE_PATH)
    backtest_path = PRIVATE_REPORT_DIR / f"mlb-m2-research-backtest-report-{start}-to-{end}.json"
    backtest = load_json(backtest_path)
    holdout_rows = backtest.get("holdout", {})
    holdout_state = holdout_rows.get("state", [])
    holdout_player = holdout_rows.get("player", [])
    state_formula = find_lane(holdout_state, "state_formula")
    pitcher_kernel = find_lane(holdout_state, "pitcher_batter_kernel")

    comparison = {
        "baselineFullGameSide": baseline.get("overallBaseline", {}).get("baselineFullGameSide", {}),
        "baselineM2CategoryLane": baseline.get("overallBaseline", {}).get("m2CategoryLane", {}),
        "baselineMay31CategoryLane": baseline.get("may31HoldoutBenchmark", {}).get("m2CategoryLane", {}),
        "baselineMay31OU": baseline.get("may31HoldoutBenchmark", {}).get("overUnderBenchmark", {}),
        "candidateStateFormulaMay31": state_formula,
        "candidatePitcherKernelMay31": pitcher_kernel,
        "candidatePlayerMay31": {
            "hitsPerPa": find_player_metric(holdout_player, "hits_per_pa"),
            "totalBasesPerPa": find_player_metric(holdout_player, "total_bases_per_pa"),
            "strikeoutRate": find_player_metric(holdout_player, "strikeout_rate"),
            "walkRate": find_player_metric(holdout_player, "walk_rate"),
            "homeRunRate": find_player_metric(holdout_player, "home_run_rate"),
        },
    }

    reads = []
    state_rate = state_formula.get("hit_rate")
    kernel_rate = pitcher_kernel.get("hit_rate")
    baseline_holdout = comparison["baselineMay31CategoryLane"].get("hitRate")
    if state_rate is not None and baseline_holdout is not None and state_rate < baseline_holdout:
        reads.append("State formulas lose badly to the locked May 31 category baseline and stay research-only.")
    if kernel_rate is not None:
        reads.append(
            "Pitcher-batter kernel top-collapse is the only promising new pocket, but it is tiny-sample and not a full-board model."
        )
    reads.append("Player identity rows are prop/triage signals, not comparable to full-game side accuracy.")
    reads.append("The current candidate stack does not replace the locked O/U stress benchmark; it only adds stored diagnostic rows.")

    return {
        "schemaVersion": 1,
        "modelId": "MLB-M2",
        "experiment": "m2_model_comparison_report",
        "range": {"start": start, "end": end, "holdout": holdout},
        "sourceArtifacts": {
            "baseline": str(BASELINE_PATH.relative_to(ROOT)),
            "backtest": str(backtest_path.relative_to(ROOT)),
        },
        "comparison": comparison,
        "reads": reads,
    }


def markdown(report: dict[str, Any]) -> str:
    comp = report["comparison"]
    lines = [
        "# MLB-M2 Model Comparison Report",
        "",
        f"Range: {report['range']['start']} to {report['range']['end']}; holdout {report['range']['holdout']}",
        "",
        "## Locked Baseline",
        "",
        f"- Full-game side: {comp['baselineFullGameSide'].get('label')} on {comp['baselineFullGameSide'].get('rows')} rows.",
        f"- Category lane: {comp['baselineM2CategoryLane'].get('label')} on {comp['baselineM2CategoryLane'].get('gradedRows')} rows.",
        f"- May 31 category lane: {comp['baselineMay31CategoryLane'].get('record')} ({comp['baselineMay31CategoryLane'].get('label')}).",
        f"- May 31 O/U stress set: {comp['baselineMay31OU'].get('record')} ({comp['baselineMay31OU'].get('label')}).",
        "",
        "## Candidate Research Rows",
        "",
        f"- State formula May 31: {comp['candidateStateFormulaMay31'].get('hits')}/{comp['candidateStateFormulaMay31'].get('rows')} ({rate_label(comp['candidateStateFormulaMay31'].get('hit_rate'))}).",
        f"- Pitcher-batter kernel top-collapse May 31: {comp['candidatePitcherKernelMay31'].get('hits')}/{comp['candidatePitcherKernelMay31'].get('rows')} ({rate_label(comp['candidatePitcherKernelMay31'].get('hit_rate'))}).",
        f"- Player hits May 31: {comp['candidatePlayerMay31']['hitsPerPa'].get('hits')}/{comp['candidatePlayerMay31']['hitsPerPa'].get('rows')} ({rate_label(comp['candidatePlayerMay31']['hitsPerPa'].get('hit_rate'))}).",
        f"- Player total bases May 31: {comp['candidatePlayerMay31']['totalBasesPerPa'].get('hits')}/{comp['candidatePlayerMay31']['totalBasesPerPa'].get('rows')} ({rate_label(comp['candidatePlayerMay31']['totalBasesPerPa'].get('hit_rate'))}).",
        "",
        "## Reads",
        "",
    ]
    for read in report["reads"]:
        lines.append(f"- {read}")
    lines.extend(
        [
            "",
            "Decision: no replacement model is promoted. Keep the locked baseline active; use the new rows as diagnostics for the next candidate.",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", default="2026-05-23")
    parser.add_argument("--end", default="2026-05-31")
    parser.add_argument("--holdout", default="2026-05-31")
    args = parser.parse_args()

    report = build_report(args.start, args.end, args.holdout)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    PRIVATE_REPORT_DIR.mkdir(parents=True, exist_ok=True)
    safe_range = f"{args.start}-to-{args.end}"
    md_path = REPORT_DIR / f"m2-model-comparison-report-{safe_range}.md"
    json_path = PRIVATE_REPORT_DIR / f"mlb-m2-model-comparison-report-{safe_range}.json"
    md_path.write_text(markdown(report))
    json_path.write_text(json.dumps(report, indent=2, sort_keys=True))
    print(f"Wrote {md_path}")
    print(f"Wrote {json_path}")
    print(json.dumps(report["reads"], indent=2))


if __name__ == "__main__":
    main()

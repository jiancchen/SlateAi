#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "warehouse" / "sports.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS mlb_side_predictions (
  prediction_date TEXT NOT NULL,
  model_name TEXT NOT NULL,
  game_id TEXT NOT NULL,
  game_title TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_team TEXT NOT NULL,
  predicted_team TEXT NOT NULL,
  predicted_side TEXT NOT NULL,
  confidence INTEGER,
  volatility INTEGER,
  model_edge REAL,
  source_label TEXT,
  input_labels_json TEXT,
  projection_json TEXT,
  starter_leverage_index REAL,
  late_inning_stability_index REAL,
  relief_pitching_risk REAL,
  coinflip_pressure REAL,
  pick_bullpen_score REAL,
  opp_bullpen_score REAL,
  pick_starter_score REAL,
  opp_starter_score REAL,
  projected_hit_edge_for_pick REAL,
  hit_edge_against_pick_flag INTEGER,
  metadata_json TEXT,
  PRIMARY KEY (prediction_date, model_name, game_id)
);

CREATE TABLE IF NOT EXISTS mlb_side_backtests (
  prediction_date TEXT NOT NULL,
  model_name TEXT NOT NULL,
  game_id TEXT NOT NULL,
  game_title TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_team TEXT NOT NULL,
  predicted_team TEXT NOT NULL,
  predicted_side TEXT NOT NULL,
  actual_winner TEXT,
  actual_first5_winner TEXT,
  hit_full_game INTEGER NOT NULL,
  hit_first5 INTEGER NOT NULL,
  bullpen_flip_loss INTEGER NOT NULL,
  starter_rescue_win INTEGER NOT NULL,
  thin_edge_flag INTEGER NOT NULL,
  high_volatility_flag INTEGER NOT NULL,
  hit_edge_against_pick_flag INTEGER NOT NULL,
  predicted_runs_final INTEGER,
  opponent_runs_final INTEGER,
  predicted_runs_first5 INTEGER,
  opponent_runs_first5 INTEGER,
  predicted_bullpen_runs INTEGER,
  opponent_bullpen_runs INTEGER,
  bullpen_net_diff INTEGER,
  relief_pitching_risk REAL,
  coinflip_pressure REAL,
  summary_json TEXT,
  PRIMARY KEY (prediction_date, model_name, game_id)
);
"""


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def import_predictions(conn: sqlite3.Connection, file_path: Path) -> None:
    init_db(conn)
    payload = json.loads(file_path.read_text(encoding="utf-8"))
    for pick in payload["picks"]:
        indicators = pick.get("indicators") or {}
        conn.execute(
            """
            INSERT INTO mlb_side_predictions (
              prediction_date, model_name, game_id, game_title, away_team, home_team,
              predicted_team, predicted_side, confidence, volatility, model_edge, source_label,
              input_labels_json, projection_json, starter_leverage_index, late_inning_stability_index,
              relief_pitching_risk, coinflip_pressure, pick_bullpen_score, opp_bullpen_score,
              pick_starter_score, opp_starter_score, projected_hit_edge_for_pick,
              hit_edge_against_pick_flag, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(prediction_date, model_name, game_id) DO UPDATE SET
              game_title=excluded.game_title,
              away_team=excluded.away_team,
              home_team=excluded.home_team,
              predicted_team=excluded.predicted_team,
              predicted_side=excluded.predicted_side,
              confidence=excluded.confidence,
              volatility=excluded.volatility,
              model_edge=excluded.model_edge,
              source_label=excluded.source_label,
              input_labels_json=excluded.input_labels_json,
              projection_json=excluded.projection_json,
              starter_leverage_index=excluded.starter_leverage_index,
              late_inning_stability_index=excluded.late_inning_stability_index,
              relief_pitching_risk=excluded.relief_pitching_risk,
              coinflip_pressure=excluded.coinflip_pressure,
              pick_bullpen_score=excluded.pick_bullpen_score,
              opp_bullpen_score=excluded.opp_bullpen_score,
              pick_starter_score=excluded.pick_starter_score,
              opp_starter_score=excluded.opp_starter_score,
              projected_hit_edge_for_pick=excluded.projected_hit_edge_for_pick,
              hit_edge_against_pick_flag=excluded.hit_edge_against_pick_flag,
              metadata_json=excluded.metadata_json
            """,
            (
                pick["predictionDate"],
                pick["modelName"],
                pick["gameId"],
                pick["gameTitle"],
                pick["awayTeam"],
                pick["homeTeam"],
                pick["predictedTeam"],
                pick["predictedSide"],
                pick.get("confidence"),
                pick.get("volatility"),
                pick.get("modelEdge"),
                pick.get("sourceLabel"),
                json.dumps(pick.get("inputLabels") or []),
                json.dumps(pick.get("projection")),
                indicators.get("starterLeverageIndex"),
                indicators.get("lateInningStabilityIndex"),
                indicators.get("reliefPitchingRisk"),
                indicators.get("coinflipPressure"),
                indicators.get("pickBullpenScore"),
                indicators.get("oppBullpenScore"),
                indicators.get("pickStarterScore"),
                indicators.get("oppStarterScore"),
                indicators.get("projectedHitEdgeForPick"),
                1 if indicators.get("hitEdgeAgainstPick") else 0,
                json.dumps(indicators, sort_keys=True),
            ),
        )
    conn.commit()


def grade_predictions(conn: sqlite3.Connection, model_name: str) -> None:
    init_db(conn)
    rows = conn.execute(
        "SELECT * FROM mlb_side_predictions WHERE model_name = ? ORDER BY prediction_date, game_title",
        (model_name,),
    ).fetchall()

    for row in rows:
        outcome = conn.execute(
            """
            SELECT * FROM mlb_game_outcomes
            WHERE game_date = ? AND away_team = ? AND home_team = ?
            """,
            (row["prediction_date"], row["away_team"], row["home_team"]),
        ).fetchone()
        if outcome is None:
            continue

        away_stats = conn.execute(
            "SELECT * FROM mlb_game_team_stats WHERE game_pk = ? AND team_role = 'away'",
            (outcome["game_pk"],),
        ).fetchone()
        home_stats = conn.execute(
            "SELECT * FROM mlb_game_team_stats WHERE game_pk = ? AND team_role = 'home'",
            (outcome["game_pk"],),
        ).fetchone()
        predicted_stats = away_stats if row["predicted_side"] == "away" else home_stats
        opponent_stats = home_stats if row["predicted_side"] == "away" else away_stats

        full_game_hit = predicted_stats["full_game_result"] == "win"
        first5_hit = predicted_stats["first5_result"] == "win"
        bullpen_flip_loss = first5_hit and not full_game_hit
        starter_rescue_win = (not first5_hit) and full_game_hit
        actual_winner = home_stats["team_name"] if home_stats["full_game_result"] == "win" else away_stats["team_name"]
        if home_stats["first5_result"] == "win":
            actual_first5_winner = home_stats["team_name"]
        elif away_stats["first5_result"] == "win":
            actual_first5_winner = away_stats["team_name"]
        else:
            actual_first5_winner = "tie"

        summary = {
            "inputLabels": json.loads(row["input_labels_json"] or "[]"),
            "projection": json.loads(row["projection_json"] or "null"),
            "indicators": json.loads(row["metadata_json"] or "{}"),
        }
        conn.execute(
            """
            INSERT INTO mlb_side_backtests (
              prediction_date, model_name, game_id, game_title, away_team, home_team,
              predicted_team, predicted_side, actual_winner, actual_first5_winner,
              hit_full_game, hit_first5, bullpen_flip_loss, starter_rescue_win,
              thin_edge_flag, high_volatility_flag, hit_edge_against_pick_flag,
              predicted_runs_final, opponent_runs_final, predicted_runs_first5, opponent_runs_first5,
              predicted_bullpen_runs, opponent_bullpen_runs, bullpen_net_diff,
              relief_pitching_risk, coinflip_pressure, summary_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(prediction_date, model_name, game_id) DO UPDATE SET
              actual_winner=excluded.actual_winner,
              actual_first5_winner=excluded.actual_first5_winner,
              hit_full_game=excluded.hit_full_game,
              hit_first5=excluded.hit_first5,
              bullpen_flip_loss=excluded.bullpen_flip_loss,
              starter_rescue_win=excluded.starter_rescue_win,
              thin_edge_flag=excluded.thin_edge_flag,
              high_volatility_flag=excluded.high_volatility_flag,
              hit_edge_against_pick_flag=excluded.hit_edge_against_pick_flag,
              predicted_runs_final=excluded.predicted_runs_final,
              opponent_runs_final=excluded.opponent_runs_final,
              predicted_runs_first5=excluded.predicted_runs_first5,
              opponent_runs_first5=excluded.opponent_runs_first5,
              predicted_bullpen_runs=excluded.predicted_bullpen_runs,
              opponent_bullpen_runs=excluded.opponent_bullpen_runs,
              bullpen_net_diff=excluded.bullpen_net_diff,
              relief_pitching_risk=excluded.relief_pitching_risk,
              coinflip_pressure=excluded.coinflip_pressure,
              summary_json=excluded.summary_json
            """,
            (
                row["prediction_date"],
                row["model_name"],
                row["game_id"],
                row["game_title"],
                row["away_team"],
                row["home_team"],
                row["predicted_team"],
                row["predicted_side"],
                actual_winner,
                actual_first5_winner,
                1 if full_game_hit else 0,
                1 if first5_hit else 0,
                1 if bullpen_flip_loss else 0,
                1 if starter_rescue_win else 0,
                1 if (row["model_edge"] or 0) <= 5 else 0,
                1 if (row["volatility"] or 0) >= 85 else 0,
                row["hit_edge_against_pick_flag"],
                predicted_stats["runs_scored"],
                opponent_stats["runs_scored"],
                predicted_stats["runs_scored_first5"],
                opponent_stats["runs_scored_first5"],
                predicted_stats["bullpen_runs_scored"],
                opponent_stats["bullpen_runs_scored"],
                predicted_stats["bullpen_runs_scored"] - opponent_stats["bullpen_runs_scored"],
                row["relief_pitching_risk"],
                row["coinflip_pressure"],
                json.dumps(summary, sort_keys=True),
            ),
        )

    conn.commit()


def summarize_window(conn: sqlite3.Connection, model_name: str, start_date: str, end_date: str) -> dict[str, float | int]:
    row = conn.execute(
        """
        SELECT
          COUNT(*) AS games,
          SUM(hit_full_game) AS fg_hits,
          SUM(hit_first5) AS f5_hits,
          SUM(bullpen_flip_loss) AS bullpen_flip_losses,
          SUM(starter_rescue_win) AS starter_rescue_wins,
          SUM(CASE WHEN hit_full_game = 0 AND thin_edge_flag = 1 THEN 1 ELSE 0 END) AS thin_edge_misses,
          SUM(CASE WHEN hit_full_game = 0 AND high_volatility_flag = 1 THEN 1 ELSE 0 END) AS high_volatility_misses,
          SUM(CASE WHEN hit_full_game = 0 AND hit_edge_against_pick_flag = 1 THEN 1 ELSE 0 END) AS hit_edge_against_pick_misses,
          ROUND(AVG(relief_pitching_risk), 1) AS avg_relief_pitching_risk,
          ROUND(AVG(coinflip_pressure), 1) AS avg_coinflip_pressure
        FROM mlb_side_backtests
        WHERE model_name = ? AND prediction_date BETWEEN ? AND ?
        """,
        (model_name, start_date, end_date),
    ).fetchone()
    games = row["games"] or 0
    fg_hits = row["fg_hits"] or 0
    f5_hits = row["f5_hits"] or 0
    return {
        **dict(row),
        "fg_hit_rate": round(fg_hits / games, 3) if games else 0,
        "f5_hit_rate": round(f5_hits / games, 3) if games else 0,
    }


def compare_edge(away_value: float | int | None, home_value: float | int | None, epsilon: float = 0.0) -> str | None:
    if away_value is None or home_value is None:
        return None
    if abs(away_value - home_value) <= epsilon:
        return "tie"
    return "away" if away_value > home_value else "home"


def safe_pct(numerator: float | int | None, denominator: float | int | None) -> float | None:
    if numerator is None or denominator in (None, 0):
        return None
    return (float(numerator) / float(denominator)) * 100


def summarize_hit_projection_window(
    conn: sqlite3.Connection, model_name: str, start_date: str, end_date: str
) -> dict[str, float | int]:
    rows = conn.execute(
        """
        SELECT
          mlb_side_predictions.projection_json,
          away_stats.hits AS away_hits,
          away_stats.at_bats AS away_at_bats,
          away_stats.hits_first5 AS away_hits_first5,
          home_stats.hits AS home_hits,
          home_stats.at_bats AS home_at_bats,
          home_stats.hits_first5 AS home_hits_first5
        FROM mlb_side_predictions
        JOIN mlb_game_outcomes
          ON mlb_game_outcomes.game_date = mlb_side_predictions.prediction_date
         AND mlb_game_outcomes.away_team = mlb_side_predictions.away_team
         AND mlb_game_outcomes.home_team = mlb_side_predictions.home_team
        JOIN mlb_game_team_stats AS away_stats
          ON away_stats.game_pk = mlb_game_outcomes.game_pk
         AND away_stats.team_role = 'away'
        JOIN mlb_game_team_stats AS home_stats
          ON home_stats.game_pk = mlb_game_outcomes.game_pk
         AND home_stats.team_role = 'home'
        WHERE mlb_side_predictions.model_name = ?
          AND mlb_side_predictions.prediction_date BETWEEN ? AND ?
          AND mlb_side_predictions.projection_json IS NOT NULL
          AND mlb_side_predictions.projection_json != 'null'
        """,
        (model_name, start_date, end_date),
    ).fetchall()

    summary = {
        "games": 0,
        "full_edge_decisions": 0,
        "full_edge_correct": 0,
        "first5_edge_decisions": 0,
        "first5_edge_correct": 0,
        "team_hit_samples": 0,
        "team_hit_abs_error": 0.0,
        "full_edge_abs_error": 0.0,
        "full_efficiency_samples": 0,
        "full_efficiency_abs_error": 0.0,
    }

    for row in rows:
        projection = json.loads(row["projection_json"] or "null")
        if not projection:
            continue

        away_projected_hits = projection.get("awayProjectedHits")
        home_projected_hits = projection.get("homeProjectedHits")
        away_projected_eff = projection.get("awayHitEfficiencyPct")
        home_projected_eff = projection.get("homeHitEfficiencyPct")
        away_first5_projected_hits = projection.get("awayFirst5ProjectedHits")
        home_first5_projected_hits = projection.get("homeFirst5ProjectedHits")

        away_actual_hits = row["away_hits"]
        home_actual_hits = row["home_hits"]
        away_actual_eff = safe_pct(row["away_hits"], row["away_at_bats"])
        home_actual_eff = safe_pct(row["home_hits"], row["home_at_bats"])
        away_actual_first5_hits = row["away_hits_first5"]
        home_actual_first5_hits = row["home_hits_first5"]

        summary["games"] += 1

        if away_projected_hits is not None and home_projected_hits is not None:
            summary["team_hit_samples"] += 2
            summary["team_hit_abs_error"] += abs(float(away_projected_hits) - away_actual_hits)
            summary["team_hit_abs_error"] += abs(float(home_projected_hits) - home_actual_hits)
            summary["full_edge_abs_error"] += abs(
                (float(away_projected_hits) - float(home_projected_hits))
                - (away_actual_hits - home_actual_hits)
            )

            predicted_full_edge = compare_edge(float(away_projected_hits), float(home_projected_hits), 0.15)
            actual_full_edge = compare_edge(away_actual_hits, home_actual_hits, 0.0)
            if predicted_full_edge != "tie" and actual_full_edge != "tie":
                summary["full_edge_decisions"] += 1
                if predicted_full_edge == actual_full_edge:
                    summary["full_edge_correct"] += 1

        if away_projected_eff is not None and home_projected_eff is not None:
            summary["full_efficiency_samples"] += 2
            summary["full_efficiency_abs_error"] += abs(float(away_projected_eff) - away_actual_eff)
            summary["full_efficiency_abs_error"] += abs(float(home_projected_eff) - home_actual_eff)

        if away_first5_projected_hits is not None and home_first5_projected_hits is not None:
            predicted_first5_edge = compare_edge(
                float(away_first5_projected_hits), float(home_first5_projected_hits), 0.15
            )
            actual_first5_edge = compare_edge(away_actual_first5_hits, home_actual_first5_hits, 0.0)
            if predicted_first5_edge != "tie" and actual_first5_edge != "tie":
                summary["first5_edge_decisions"] += 1
                if predicted_first5_edge == actual_first5_edge:
                    summary["first5_edge_correct"] += 1

    games = summary["games"] or 0
    return {
        "games": games,
        "full_edge_accuracy": round(summary["full_edge_correct"] / summary["full_edge_decisions"], 3)
        if summary["full_edge_decisions"]
        else 0,
        "first5_edge_accuracy": round(summary["first5_edge_correct"] / summary["first5_edge_decisions"], 3)
        if summary["first5_edge_decisions"]
        else 0,
        "team_hit_mae": round(summary["team_hit_abs_error"] / summary["team_hit_samples"], 3)
        if summary["team_hit_samples"]
        else 0,
        "full_edge_mae": round(summary["full_edge_abs_error"] / games, 3) if games else 0,
        "full_efficiency_mae": round(
            summary["full_efficiency_abs_error"] / summary["full_efficiency_samples"], 3
        )
        if summary["full_efficiency_samples"]
        else 0,
    }


def top_misses(conn: sqlite3.Connection, model_name: str, start_date: str, end_date: str) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT
          prediction_date, game_title, predicted_team, actual_winner,
          mlb_side_predictions.confidence,
          mlb_side_predictions.volatility,
          mlb_side_predictions.model_edge,
          mlb_side_backtests.bullpen_flip_loss,
          mlb_side_backtests.thin_edge_flag,
          mlb_side_backtests.high_volatility_flag,
          mlb_side_backtests.hit_edge_against_pick_flag,
          mlb_side_predictions.relief_pitching_risk,
          mlb_side_predictions.coinflip_pressure,
          predicted_runs_first5, opponent_runs_first5, predicted_runs_final, opponent_runs_final,
          predicted_bullpen_runs, opponent_bullpen_runs,
          mlb_side_predictions.starter_leverage_index,
          mlb_side_predictions.late_inning_stability_index
        FROM mlb_side_backtests
        JOIN mlb_side_predictions
          USING (prediction_date, model_name, game_id, game_title, away_team, home_team, predicted_team, predicted_side)
        WHERE mlb_side_backtests.model_name = ?
          AND prediction_date BETWEEN ? AND ?
          AND hit_full_game = 0
        ORDER BY
          mlb_side_backtests.bullpen_flip_loss DESC,
          mlb_side_predictions.relief_pitching_risk DESC,
          mlb_side_predictions.coinflip_pressure DESC,
          mlb_side_predictions.confidence DESC
        LIMIT 12
        """,
        (model_name, start_date, end_date),
    ).fetchall()


def write_report(conn: sqlite3.Connection, model_name: str, train_end: str, verify_start: str, verify_end: str, out_path: Path) -> None:
    train = summarize_window(conn, model_name, "2026-05-10", train_end)
    verify = summarize_window(conn, model_name, verify_start, verify_end)
    train_hit_projection = summarize_hit_projection_window(conn, model_name, "2026-05-10", train_end)
    verify_hit_projection = summarize_hit_projection_window(conn, model_name, verify_start, verify_end)
    misses = top_misses(conn, model_name, verify_start, verify_end)
    starter_led_verify = conn.execute(
        """
        SELECT
          COUNT(*) AS games,
          ROUND(AVG(hit_full_game), 3) AS fg_hit_rate,
          ROUND(AVG(hit_first5), 3) AS f5_hit_rate
        FROM mlb_side_backtests
        JOIN mlb_side_predictions USING (prediction_date, model_name, game_id)
        WHERE mlb_side_backtests.model_name = ?
          AND prediction_date BETWEEN ? AND ?
          AND model_edge >= 5
          AND volatility < 80
        """,
        (model_name, verify_start, verify_end),
    ).fetchone()
    verify_f5_split = conn.execute(
        """
        SELECT
          COUNT(*) AS games,
          ROUND(AVG(hit_full_game), 3) AS fg_hit_rate,
          ROUND(AVG(hit_first5), 3) AS f5_hit_rate
        FROM mlb_side_backtests
        JOIN mlb_side_predictions USING (prediction_date, model_name, game_id)
        WHERE mlb_side_backtests.model_name = ?
          AND prediction_date BETWEEN ? AND ?
          AND starter_leverage_index >= 60
          AND late_inning_stability_index <= 52
        """,
        (model_name, verify_start, verify_end),
    ).fetchone()

    lines = [
        f"# MLB Side Backtest Report: {model_name}",
        "",
        f"- Training window: `2026-05-10` to `{train_end}`",
        f"- Verification window: `{verify_start}` to `{verify_end}`",
        "",
        "## Summary",
        "",
        f"- Training full-game hit rate: `{train['fg_hit_rate']}` on `{train['games']}` games",
        f"- Training first-5 hit rate: `{train['f5_hit_rate']}`",
        f"- Training bullpen-flip losses: `{train['bullpen_flip_losses']}`",
        f"- Verification full-game hit rate: `{verify['fg_hit_rate']}` on `{verify['games']}` games",
        f"- Verification first-5 hit rate: `{verify['f5_hit_rate']}`",
        f"- Verification bullpen-flip losses: `{verify['bullpen_flip_losses']}`",
        "",
        "## Failure Signals",
        "",
        f"- Thin-edge misses in training: `{train['thin_edge_misses']}`",
        f"- Thin-edge misses in verification: `{verify['thin_edge_misses']}`",
        f"- High-volatility misses in training: `{train['high_volatility_misses']}`",
        f"- High-volatility misses in verification: `{verify['high_volatility_misses']}`",
        f"- Hit-edge-against-pick misses in training: `{train['hit_edge_against_pick_misses']}`",
        f"- Hit-edge-against-pick misses in verification: `{verify['hit_edge_against_pick_misses']}`",
        f"- Avg relief-pitching risk in training: `{train['avg_relief_pitching_risk']}`",
        f"- Avg relief-pitching risk in verification: `{verify['avg_relief_pitching_risk']}`",
        "",
        "## Hit Projection Accuracy",
        "",
        f"- Training projection-ready games: `{train_hit_projection['games']}`",
        f"- Training full-game hit-edge accuracy: `{train_hit_projection['full_edge_accuracy']}`",
        f"- Training first-5 hit-edge accuracy: `{train_hit_projection['first5_edge_accuracy']}`",
        f"- Training team-hit MAE: `{train_hit_projection['team_hit_mae']}`",
        f"- Training full-game hit-efficiency MAE: `{train_hit_projection['full_efficiency_mae']}`",
        f"- Verification projection-ready games: `{verify_hit_projection['games']}`",
        f"- Verification full-game hit-edge accuracy: `{verify_hit_projection['full_edge_accuracy']}`",
        f"- Verification first-5 hit-edge accuracy: `{verify_hit_projection['first5_edge_accuracy']}`",
        f"- Verification team-hit MAE: `{verify_hit_projection['team_hit_mae']}`",
        f"- Verification full-game hit-efficiency MAE: `{verify_hit_projection['full_efficiency_mae']}`",
        "- First-five hit efficiency is not graded yet because the warehouse does not store first-five at-bats separately.",
        "",
        "## Starter-Led Verification Reads",
        "",
        f"- Verification games with `model edge >= 5` and `volatility < 80`: `{starter_led_verify['games']}`",
        f"- Those games full-game hit rate: `{starter_led_verify['fg_hit_rate']}`",
        f"- Those games first-5 hit rate: `{starter_led_verify['f5_hit_rate']}`",
        "",
        "## F5 Versus Full-Game Split",
        "",
        f"- Verification games flagged as `starter edge > late hold` profiles: `{verify_f5_split['games']}`",
        f"- Those games full-game hit rate: `{verify_f5_split['fg_hit_rate']}`",
        f"- Those games first-5 hit rate: `{verify_f5_split['f5_hit_rate']}`",
        "",
        "## Verification Misses",
        "",
    ]

    for row in misses:
        lines.append(
            f"- `{row['prediction_date']}` {row['game_title']}: picked `{row['predicted_team']}` but got `{row['actual_winner']}`. "
            f"F5 `{row['predicted_runs_first5']}-{row['opponent_runs_first5']}`, final `{row['predicted_runs_final']}-{row['opponent_runs_final']}`, "
            f"bullpen `{row['predicted_bullpen_runs']}-{row['opponent_bullpen_runs']}`, "
            f"starter leverage `{row['starter_leverage_index']}`, late stability `{row['late_inning_stability_index']}`, "
            f"relief risk `{row['relief_pitching_risk']}`, coinflip pressure `{row['coinflip_pressure']}`."
        )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import and backtest MLB side predictions against the warehouse.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    import_parser = subparsers.add_parser("import", help="Import a saved MLB side prediction JSON file.")
    import_parser.add_argument("--file", required=True)

    grade_parser = subparsers.add_parser("grade", help="Grade imported predictions against actual MLB outcomes.")
    grade_parser.add_argument("--model-name", required=True)

    report_parser = subparsers.add_parser("report", help="Write a markdown backtest report.")
    report_parser.add_argument("--model-name", required=True)
    report_parser.add_argument("--train-end", required=True)
    report_parser.add_argument("--verify-start", required=True)
    report_parser.add_argument("--verify-end", required=True)
    report_parser.add_argument("--out", required=True)

    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with get_connection() as conn:
      if args.command == "import":
          import_predictions(conn, Path(args.file))
          print(f"Imported side predictions from {args.file}")
          return

      if args.command == "grade":
          grade_predictions(conn, args.model_name)
          print(f"Graded side predictions for {args.model_name}")
          return

      if args.command == "report":
          write_report(
              conn,
              args.model_name,
              args.train_end,
              args.verify_start,
              args.verify_end,
              Path(args.out),
          )
          print(f"Wrote report to {args.out}")
          return


if __name__ == "__main__":
    main()

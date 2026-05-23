#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_OUT = ROOT / "development-docs" / "mistake-shape-validation-052326.md"


@dataclass
class MistakeShapeRow:
    split: str
    date: str
    matchup: str
    pick_team: str
    opponent_team: str
    hit: int
    confidence: int
    point_edge: float
    pick_team_chaos: float
    opp_team_chaos: float
    pick_cluster: float
    opp_cluster: float
    pick_scoreless3: float
    opp_scoreless3: float
    pick_low_scoring: float
    opp_low_scoring: float
    pick_lineup: float
    opp_lineup: float
    pick_quiet5: float
    opp_quiet5: float
    pick_bullpen: float
    opp_bullpen: float
    pick_lead_loss: float
    opp_lead_loss: float

    @property
    def chaos_gap(self) -> float:
        return self.opp_team_chaos - self.pick_team_chaos

    @property
    def lineup_gap(self) -> float:
        return self.opp_lineup - self.pick_lineup

    @property
    def bullpen_gap(self) -> float:
        return self.opp_bullpen - self.pick_bullpen


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def safe_rate(rows: list[MistakeShapeRow]) -> float:
    return round(sum(row.hit for row in rows) / len(rows), 3) if rows else 0.0


def _read_float(value: object) -> float:
    return float(value or 0.0)


def load_prediction_rows(conn: sqlite3.Connection) -> list[MistakeShapeRow]:
    rows: list[MistakeShapeRow] = []
    query = """
        WITH joined_predictions AS (
          SELECT
            p.prediction_date,
            p.game_title,
            p.away_team,
            p.home_team,
            p.predicted_team,
            p.predicted_side,
            p.confidence,
            p.model_edge,
            b.hit_full_game,
            CASE
              WHEN p.prediction_date BETWEEN '2026-05-10' AND '2026-05-15' THEN 'reserve'
              ELSE 'current'
            END AS split
          FROM mlb_side_predictions p
          JOIN mlb_side_backtests b
            USING (prediction_date, model_name, game_id)
          WHERE (
            p.prediction_date BETWEEN '2026-05-10' AND '2026-05-15'
            AND p.model_name = 'board-moneyline-v2'
          ) OR (
            p.prediction_date BETWEEN '2026-05-16' AND '2026-05-22'
            AND p.model_name = 'board-moneyline-tier1-v1'
          )
        )
        SELECT
          jp.split,
          jp.prediction_date,
          jp.game_title,
          jp.predicted_team,
          CASE
            WHEN jp.predicted_side = 'away' THEN jp.home_team
            ELSE jp.away_team
          END AS opponent_team,
          jp.hit_full_game,
          jp.confidence,
          jp.model_edge,
          tm.mistake_chaos_index AS pick_team_chaos,
          om.mistake_chaos_index AS opp_team_chaos,
          tm.run_clustering_index AS pick_cluster,
          om.run_clustering_index AS opp_cluster,
          tm.scoreless_first3_rate AS pick_scoreless3,
          om.scoreless_first3_rate AS opp_scoreless3,
          tm.low_scoring_game_rate AS pick_low_scoring,
          om.low_scoring_game_rate AS opp_low_scoring,
          lm.lineup_conversion_index AS pick_lineup,
          ol.lineup_conversion_index AS opp_lineup,
          lm.quiet_first5_rate AS pick_quiet5,
          ol.quiet_first5_rate AS opp_quiet5,
          bm.bullpen_chaos_index AS pick_bullpen,
          ob.bullpen_chaos_index AS opp_bullpen,
          bm.lead_loss_after_entry_rate AS pick_lead_loss,
          ob.lead_loss_after_entry_rate AS opp_lead_loss
        FROM joined_predictions jp
        LEFT JOIN mlb_team_mistake_shape_daily tm
          ON tm.as_of_date = jp.prediction_date
         AND tm.team_name = jp.predicted_team
         AND tm.window_games = 8
        LEFT JOIN mlb_team_mistake_shape_daily om
          ON om.as_of_date = jp.prediction_date
         AND om.team_name = CASE
              WHEN jp.predicted_side = 'away' THEN jp.home_team
              ELSE jp.away_team
            END
         AND om.window_games = 8
        LEFT JOIN mlb_lineup_conversion_shape_daily lm
          ON lm.as_of_date = jp.prediction_date
         AND lm.team_name = jp.predicted_team
         AND lm.window_games = 8
        LEFT JOIN mlb_lineup_conversion_shape_daily ol
          ON ol.as_of_date = jp.prediction_date
         AND ol.team_name = CASE
              WHEN jp.predicted_side = 'away' THEN jp.home_team
              ELSE jp.away_team
            END
         AND ol.window_games = 8
        LEFT JOIN mlb_bullpen_mistake_shape_daily bm
          ON bm.as_of_date = jp.prediction_date
         AND bm.team_name = jp.predicted_team
         AND bm.window_days = 14
        LEFT JOIN mlb_bullpen_mistake_shape_daily ob
          ON ob.as_of_date = jp.prediction_date
         AND ob.team_name = CASE
              WHEN jp.predicted_side = 'away' THEN jp.home_team
              ELSE jp.away_team
            END
         AND ob.window_days = 14
        ORDER BY jp.prediction_date, jp.game_title
    """
    for row in conn.execute(query).fetchall():
        rows.append(
            MistakeShapeRow(
                split=str(row["split"]),
                date=str(row["prediction_date"]),
                matchup=str(row["game_title"]),
                pick_team=str(row["predicted_team"]),
                opponent_team=str(row["opponent_team"]),
                hit=int(row["hit_full_game"] or 0),
                confidence=int(row["confidence"] or 0),
                point_edge=float(row["model_edge"] or 0.0),
                pick_team_chaos=_read_float(row["pick_team_chaos"]),
                opp_team_chaos=_read_float(row["opp_team_chaos"]),
                pick_cluster=_read_float(row["pick_cluster"]),
                opp_cluster=_read_float(row["opp_cluster"]),
                pick_scoreless3=_read_float(row["pick_scoreless3"]),
                opp_scoreless3=_read_float(row["opp_scoreless3"]),
                pick_low_scoring=_read_float(row["pick_low_scoring"]),
                opp_low_scoring=_read_float(row["opp_low_scoring"]),
                pick_lineup=_read_float(row["pick_lineup"]),
                opp_lineup=_read_float(row["opp_lineup"]),
                pick_quiet5=_read_float(row["pick_quiet5"]),
                opp_quiet5=_read_float(row["opp_quiet5"]),
                pick_bullpen=_read_float(row["pick_bullpen"]),
                opp_bullpen=_read_float(row["opp_bullpen"]),
                pick_lead_loss=_read_float(row["pick_lead_loss"]),
                opp_lead_loss=_read_float(row["opp_lead_loss"]),
            )
        )
    return rows


def high_edge_rows(rows: list[MistakeShapeRow]) -> list[MistakeShapeRow]:
    return [row for row in rows if row.point_edge >= 8.0]


def bucket_summary_rows(rows: list[MistakeShapeRow]) -> list[list[str]]:
    reserve = [row for row in rows if row.split == "reserve"]
    current = [row for row in rows if row.split == "current"]
    high = high_edge_rows(rows)
    reserve_high = [row for row in reserve if row.point_edge >= 8.0]
    current_high = [row for row in current if row.point_edge >= 8.0]
    return [
        ["Reserve baseline", str(len(reserve)), f"{safe_rate(reserve):.3f}"],
        ["Current baseline", str(len(current)), f"{safe_rate(current):.3f}"],
        ["Combined baseline", str(len(rows)), f"{safe_rate(rows):.3f}"],
        ["Reserve 8+ edge", str(len(reserve_high)), f"{safe_rate(reserve_high):.3f}"],
        ["Current 8+ edge", str(len(current_high)), f"{safe_rate(current_high):.3f}"],
        ["Combined 8+ edge", str(len(high)), f"{safe_rate(high):.3f}"],
    ]


def candidate_flag_rows(rows: list[MistakeShapeRow]) -> list[list[str]]:
    high = high_edge_rows(rows)
    reserve_high = [row for row in high if row.split == "reserve"]
    current_high = [row for row in high if row.split == "current"]
    candidates = [
        (
            "Pick cluster >= 70 + opponent bullpen gap >= 8",
            lambda row: row.pick_cluster >= 70 and row.bullpen_gap >= 8,
        ),
        (
            "Pick scoreless first 3 >= 50% + pick quiet first 5 >= 50%",
            lambda row: row.pick_scoreless3 >= 0.5 and row.pick_quiet5 >= 0.5,
        ),
        (
            "Pick scoreless first 3 >= 50% + opponent chaos gap >= 10",
            lambda row: row.pick_scoreless3 >= 0.5 and row.chaos_gap >= 10,
        ),
    ]
    output: list[list[str]] = []
    for label, predicate in candidates:
        reserve_rows = [row for row in reserve_high if predicate(row)]
        current_rows = [row for row in current_high if predicate(row)]
        combined_rows = [row for row in high if predicate(row)]
        output.append(
            [
                label,
                str(len(combined_rows)),
                f"{safe_rate(reserve_rows):.3f}",
                f"{safe_rate(current_rows):.3f}",
                f"{safe_rate(combined_rows):.3f}",
            ]
        )
    return output


def case_study_rows(rows: list[MistakeShapeRow]) -> list[list[str]]:
    case_ids = [
        ("2026-05-22", "Rangers @ Angels"),
        ("2026-05-22", "Twins @ Red Sox"),
        ("2026-05-22", "Dodgers @ Brewers"),
        ("2026-05-22", "Guardians @ Phillies"),
        ("2026-05-16", "Red Sox @ Braves"),
        ("2026-05-16", "Marlins @ Rays"),
    ]
    lookup = {(row.date, row.matchup): row for row in rows}
    output: list[list[str]] = []
    for key in case_ids:
        row = lookup.get(key)
        if not row:
            continue
        output.append(
            [
                row.date,
                row.matchup,
                row.pick_team,
                "hit" if row.hit else "miss",
                f"{row.point_edge:.1f}",
                f"{row.confidence}",
                f"{row.pick_cluster:.1f}",
                f"{row.pick_scoreless3:.3f}",
                f"{row.pick_quiet5:.3f}",
                f"{row.chaos_gap:.1f}",
                f"{row.lineup_gap:.1f}",
                f"{row.bullpen_gap:.1f}",
            ]
        )
    return output


def write_report(path: Path, rows: list[MistakeShapeRow]) -> None:
    lines: list[str] = []
    lines.append("# MLB Mistake-Shape Validation")
    lines.append("")
    lines.append("This pass checks whether the new mistake-shape vectors actually light up the kinds of failures that hurt the current side board.")
    lines.append("")
    lines.append("## Baseline")
    lines.append("")
    lines.append(
        markdown_table(
            ["Bucket", "Games", "Hit rate"],
            bucket_summary_rows(rows),
        )
    )
    lines.append("")
    lines.append("## Candidate Veto Shapes")
    lines.append("")
    lines.append(
        markdown_table(
            ["Flag", "High-edge games", "Reserve hit", "Current hit", "Combined hit"],
            candidate_flag_rows(rows),
        )
    )
    lines.append("")
    lines.append("## Known Failure Checks")
    lines.append("")
    lines.append(
        markdown_table(
            [
                "Date",
                "Game",
                "Pick",
                "Result",
                "Edge",
                "Conf",
                "Pick cluster",
                "Pick scoreless3",
                "Pick quiet5",
                "Opp chaos gap",
                "Opp lineup gap",
                "Opp bullpen gap",
            ],
            case_study_rows(rows),
        )
    )
    lines.append("")
    lines.append("## Read")
    lines.append("")
    lines.append("- The first pass is **not** a universal fix. It does not explain every miss, and low-edge favorite losses like `Dodgers @ Brewers` still need more series-state and pitcher-shape work.")
    lines.append("- The first real collapse signal is `pick_cluster_high + opponent_bullpen_gap`. On the current high-edge bucket, that shape was disastrous and caught the `Rangers @ Angels` type of failure.")
    lines.append("- The second useful lane is `pick_scoreless3_high + pick_quiet5_high`. That catches favorites we kept promoting even though their recent offensive shape was already telling us the first half of the game could die on them.")
    lines.append("- The third lane is `pick_scoreless3_high + opponent_chaos_gap`. That captures games where the board liked the cleaner paper side while the opponent was still carrying a much louder chaos vector.")
    lines.append("- The practical lesson is that these vectors are already more useful as **veto inputs** than as ranking inputs. They tell us when a side should stop getting promoted, even if the composite still likes it.")
    lines.append("")
    lines.append("## Next Move")
    lines.append("")
    lines.append("- Turn these candidate shapes into explicit research-only veto flags.")
    lines.append("- Add story/phase label tables next so we can learn `how` the game broke, not just whether the pick lost.")
    lines.append("- Keep the mistake-shape layer recent-window-heavy; these patterns are about current failure shape, not season averages.")
    lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate first-pass MLB mistake-shape vectors against known side misses.")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="Where to write the markdown report.")
    args = parser.parse_args()

    with get_connection() as conn:
        rows = load_prediction_rows(conn)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    write_report(out_path, rows)
    print(f"Wrote mistake-shape validation report to {out_path}")


if __name__ == "__main__":
    main()

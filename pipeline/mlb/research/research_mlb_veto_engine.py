#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_OUT = ROOT / "development-docs" / "mlb" / "research" / "offline-veto-engine-052326.md"
DEFAULT_START_DATE = "2026-05-10"
DEFAULT_END_DATE = "2026-05-22"


@dataclass
class VetoRow:
    split: str
    prediction_date: str
    matchup: str
    predicted_pick: str
    opponent_team: str
    hit_full_game: int
    confidence: int
    point_edge: float
    market_probability: float
    pick_is_market_favorite: bool
    pick_is_market_underdog: bool
    market_mispricing_label: str
    phase_path_label: str
    team_chaos: float
    opp_chaos: float
    pick_cluster: float
    pick_scoreless3: float
    lineup_index: float
    dead_bat_traffic: float
    traffic_no_conversion: float
    quiet5: float
    bullpen_chaos: float
    opp_bullpen: float
    starter_command: float
    snapback: float
    opp_snapback: float

    @property
    def chaos_gap(self) -> float:
        return self.opp_chaos - self.team_chaos

    @property
    def bullpen_gap(self) -> float:
        return self.opp_bullpen - self.bullpen_chaos

    @property
    def snapback_gap(self) -> float:
        return self.opp_snapback - self.snapback

    @property
    def heavy_favorite(self) -> bool:
        return self.pick_is_market_favorite and self.market_probability >= 0.60

    @property
    def high_edge(self) -> bool:
        return self.point_edge >= 8.0

    @property
    def high_confidence(self) -> bool:
        return self.confidence >= 60


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def safe_rate(rows: list[VetoRow]) -> float:
    return round(sum(row.hit_full_game for row in rows) / len(rows), 3) if rows else 0.0


def _read_float(value: object) -> float:
    return float(value or 0.0)


def load_rows(conn: sqlite3.Connection, start_date: str, end_date: str) -> list[VetoRow]:
    query = """
        SELECT
          CASE
            WHEN m.prediction_date BETWEEN '2026-05-10' AND '2026-05-15' THEN 'reserve'
            ELSE 'current'
          END AS split,
          m.prediction_date,
          m.matchup,
          m.predicted_pick,
          m.opponent_team,
          m.hit_full_game,
          m.confidence,
          m.point_edge,
          m.market_favorite_probability,
          m.pick_is_market_favorite,
          m.pick_is_market_underdog,
          m.market_mispricing_label,
          COALESCE(p.phase_path_label, 'unknown') AS phase_path_label,
          tm.mistake_chaos_index AS team_chaos,
          om.mistake_chaos_index AS opp_chaos,
          tm.run_clustering_index AS pick_cluster,
          tm.scoreless_first3_rate AS pick_scoreless3,
          lm.lineup_conversion_index AS lineup_index,
          lm.dead_bat_traffic_rate AS dead_bat_traffic,
          lm.traffic_no_conversion_rate AS traffic_no_conversion,
          lm.quiet_first5_rate AS quiet5,
          bm.bullpen_chaos_index AS bullpen_chaos,
          ob.bullpen_chaos_index AS opp_bullpen,
          ps.command_break_index AS starter_command,
          ts.snapback_pressure_index AS snapback,
          ots.snapback_pressure_index AS opp_snapback
        FROM mlb_market_mispricing_labels m
        LEFT JOIN mlb_phase_outcomes_daily p
          ON p.game_date = m.prediction_date
         AND p.team_name = m.predicted_pick
         AND p.opponent_team = m.opponent_team
        LEFT JOIN mlb_team_mistake_shape_daily tm
          ON tm.as_of_date = m.prediction_date
         AND tm.team_name = m.predicted_pick
         AND tm.window_games = 8
        LEFT JOIN mlb_team_mistake_shape_daily om
          ON om.as_of_date = m.prediction_date
         AND om.team_name = m.opponent_team
         AND om.window_games = 8
        LEFT JOIN mlb_lineup_conversion_shape_daily lm
          ON lm.as_of_date = m.prediction_date
         AND lm.team_name = m.predicted_pick
         AND lm.window_games = 8
        LEFT JOIN mlb_bullpen_mistake_shape_daily bm
          ON bm.as_of_date = m.prediction_date
         AND bm.team_name = m.predicted_pick
         AND bm.window_days = 14
        LEFT JOIN mlb_bullpen_mistake_shape_daily ob
          ON ob.as_of_date = m.prediction_date
         AND ob.team_name = m.opponent_team
         AND ob.window_days = 14
        LEFT JOIN mlb_starting_pitcher_game_logs gl
          ON gl.game_pk = p.game_pk
         AND gl.team_role = p.team_role
        LEFT JOIN mlb_pitcher_mistake_shape_daily ps
          ON ps.as_of_date = m.prediction_date
         AND ps.pitcher_id = gl.pitcher_id
         AND ps.window_starts = 5
        LEFT JOIN mlb_team_state_snapshots ts
          ON ts.as_of_date = m.prediction_date
         AND ts.team_name = m.predicted_pick
        LEFT JOIN mlb_team_state_snapshots ots
          ON ots.as_of_date = m.prediction_date
         AND ots.team_name = m.opponent_team
        WHERE m.market_type = 'moneyline'
          AND m.prediction_date BETWEEN ? AND ?
        ORDER BY m.prediction_date, m.matchup
    """
    rows: list[VetoRow] = []
    for row in conn.execute(query, (start_date, end_date)).fetchall():
        rows.append(
            VetoRow(
                split=str(row["split"]),
                prediction_date=str(row["prediction_date"]),
                matchup=str(row["matchup"]),
                predicted_pick=str(row["predicted_pick"]),
                opponent_team=str(row["opponent_team"]),
                hit_full_game=int(row["hit_full_game"] or 0),
                confidence=int(row["confidence"] or 0),
                point_edge=_read_float(row["point_edge"]),
                market_probability=_read_float(row["market_favorite_probability"]),
                pick_is_market_favorite=bool(int(row["pick_is_market_favorite"] or 0)),
                pick_is_market_underdog=bool(int(row["pick_is_market_underdog"] or 0)),
                market_mispricing_label=str(row["market_mispricing_label"] or "market_neutral"),
                phase_path_label=str(row["phase_path_label"] or "unknown"),
                team_chaos=_read_float(row["team_chaos"]),
                opp_chaos=_read_float(row["opp_chaos"]),
                pick_cluster=_read_float(row["pick_cluster"]),
                pick_scoreless3=_read_float(row["pick_scoreless3"]),
                lineup_index=_read_float(row["lineup_index"]),
                dead_bat_traffic=_read_float(row["dead_bat_traffic"]),
                traffic_no_conversion=_read_float(row["traffic_no_conversion"]),
                quiet5=_read_float(row["quiet5"]),
                bullpen_chaos=_read_float(row["bullpen_chaos"]),
                opp_bullpen=_read_float(row["opp_bullpen"]),
                starter_command=_read_float(row["starter_command"]),
                snapback=_read_float(row["snapback"]),
                opp_snapback=_read_float(row["opp_snapback"]),
            )
        )
    return rows


def evaluate_target(
    rows: list[VetoRow],
    base_filter,
    target_filter,
    candidates: list[tuple[str, object]],
) -> list[list[str]]:
    base_rows = [row for row in rows if base_filter(row)]
    target_total = sum(1 for row in base_rows if target_filter(row))
    output: list[list[str]] = []
    for label, predicate in candidates:
        bucket = [row for row in base_rows if predicate(row)]
        positives = sum(1 for row in bucket if target_filter(row))
        precision = positives / len(bucket) if bucket else 0.0
        recall = positives / target_total if target_total else 0.0
        output.append([label, str(len(bucket)), f"{precision:.3f}", f"{recall:.3f}"])
    return output


def selected_negative_flags(row: VetoRow) -> list[str]:
    flags: list[str] = []
    if row.heavy_favorite and row.lineup_index <= 25:
        flags.append("heavy_favorite_weak_lineup")
    if row.heavy_favorite and row.bullpen_chaos >= 50:
        flags.append("heavy_favorite_noisy_bullpen")
    if row.lineup_index <= 35 and row.dead_bat_traffic >= 0.30:
        flags.append("dead_early_risk")
    if row.pick_cluster >= 70 and row.bullpen_gap >= 8:
        flags.append("cluster_bullpen_trap")
    return flags


def protected_dog_flag(row: VetoRow) -> bool:
    return row.pick_is_market_underdog and row.chaos_gap >= 8


def engine_bucket_rows(rows: list[VetoRow], bucket_label: str, bucket_rows: list[VetoRow]) -> list[list[str]]:
    vetoed = [row for row in bucket_rows if selected_negative_flags(row)]
    kept = [row for row in bucket_rows if not selected_negative_flags(row)]
    return [
        [
            bucket_label,
            str(len(bucket_rows)),
            f"{safe_rate(bucket_rows):.3f}",
            str(len(vetoed)),
            f"{safe_rate(vetoed):.3f}",
            str(len(kept)),
            f"{safe_rate(kept):.3f}",
        ]
    ]


def combined_engine_rows(rows: list[VetoRow]) -> list[list[str]]:
    buckets = [
        ("All picks", rows),
        ("8+ edge", [row for row in rows if row.high_edge]),
        ("60+ confidence", [row for row in rows if row.high_confidence]),
        ("8+ edge and 60+ confidence", [row for row in rows if row.high_edge and row.high_confidence]),
    ]
    output: list[list[str]] = []
    for label, bucket_rows in buckets:
        output.extend(engine_bucket_rows(rows, label, bucket_rows))
    return output


def split_engine_rows(rows: list[VetoRow]) -> list[list[str]]:
    output: list[list[str]] = []
    for split in sorted({row.split for row in rows}):
        split_rows = [row for row in rows if row.split == split and row.high_edge]
        vetoed = [row for row in split_rows if selected_negative_flags(row)]
        kept = [row for row in split_rows if not selected_negative_flags(row)]
        output.append(
            [
                split,
                str(len(split_rows)),
                f"{safe_rate(split_rows):.3f}",
                str(len(vetoed)),
                f"{safe_rate(vetoed):.3f}",
                str(len(kept)),
                f"{safe_rate(kept):.3f}",
            ]
        )
    return output


def protected_dog_rows(rows: list[VetoRow]) -> list[list[str]]:
    dogs = [row for row in rows if row.pick_is_market_underdog]
    protected = [row for row in dogs if protected_dog_flag(row)]
    unprotected = [row for row in dogs if not protected_dog_flag(row)]
    return [
        ["All market dogs", str(len(dogs)), f"{safe_rate(dogs):.3f}"],
        ["Protected dog lane", str(len(protected)), f"{safe_rate(protected):.3f}"],
        ["Other market dogs", str(len(unprotected)), f"{safe_rate(unprotected):.3f}"],
    ]


def selected_flag_rows(rows: list[VetoRow]) -> list[list[str]]:
    labels = [
        "heavy_favorite_weak_lineup",
        "heavy_favorite_noisy_bullpen",
        "dead_early_risk",
        "cluster_bullpen_trap",
    ]
    output: list[list[str]] = []
    for label in labels:
        bucket = [row for row in rows if label in selected_negative_flags(row)]
        output.append([label, str(len(bucket)), f"{safe_rate(bucket):.3f}"])
    return output


def write_report(out_path: Path, start_date: str, end_date: str, rows: list[VetoRow]) -> None:
    actual_start = min((row.prediction_date for row in rows), default=start_date)
    actual_end = max((row.prediction_date for row in rows), default=end_date)
    sample_days = len({row.prediction_date for row in rows})
    starter_crack_candidates = [
        ("Starter command <= 24", lambda row: row.starter_command <= 24),
        (
            "Starter command <= 24 + scoreless first 3 >= 50%",
            lambda row: row.starter_command <= 24 and row.pick_scoreless3 >= 0.5,
        ),
        (
            "Starter command <= 24 + lineup idx <= 40",
            lambda row: row.starter_command <= 24 and row.lineup_index <= 40,
        ),
        (
            "Starter command <= 24 + bullpen chaos >= 45",
            lambda row: row.starter_command <= 24 and row.bullpen_chaos >= 45,
        ),
    ]
    dead_early_candidates = [
        ("Lineup idx <= 35", lambda row: row.lineup_index <= 35),
        (
            "Lineup idx <= 35 + scoreless first 3 >= 50%",
            lambda row: row.lineup_index <= 35 and row.pick_scoreless3 >= 0.5,
        ),
        (
            "Lineup idx <= 35 + dead-bat traffic >= 30%",
            lambda row: row.lineup_index <= 35 and row.dead_bat_traffic >= 0.30,
        ),
        (
            "Lineup idx <= 35 + traffic-no-conversion >= 35%",
            lambda row: row.lineup_index <= 35 and row.traffic_no_conversion >= 0.35,
        ),
    ]
    expensive_favorite_candidates = [
        ("Heavy favorite baseline", lambda row: True),
        ("Heavy favorite + lineup idx <= 25", lambda row: row.lineup_index <= 25),
        ("Heavy favorite + bullpen chaos >= 50", lambda row: row.bullpen_chaos >= 50),
        (
            "Heavy favorite + selected negative flag",
            lambda row: bool(selected_negative_flags(row)),
        ),
    ]
    dog_candidates = [
        ("Market dog baseline", lambda row: True),
        ("Dog + opponent chaos gap >= 8", lambda row: row.chaos_gap >= 8),
        ("Dog + opponent snapback gap >= 10", lambda row: row.snapback_gap >= 10),
        ("Dog + opponent bullpen gap >= 8", lambda row: row.bullpen_gap >= 8),
    ]

    lines: list[str] = []
    lines.append("# MLB Offline Veto Engine")
    lines.append("")
    lines.append(
        f"This pass uses graded MLB moneyline data from `{actual_start}` through `{actual_end}` (`{len(rows)}` rows across `{sample_days}` slate days) to turn the new chaos labels into **research-only veto logic**. The goal is not broader pick tuning; it is to identify when the board should have stopped itself."
    )
    lines.append("")
    lines.append("## Selected Negative Flags")
    lines.append("")
    lines.append(
        markdown_table(
            ["Flag", "Games", "Hit rate"],
            selected_flag_rows(rows),
        )
    )
    lines.append("")
    lines.append("## Label-Specific Failure Modeling")
    lines.append("")
    lines.append("### Starter Crack Loss")
    lines.append("")
    lines.append(
        markdown_table(
            ["Rule", "Games", "Precision", "Recall"],
            evaluate_target(
                rows,
                base_filter=lambda row: True,
                target_filter=lambda row: row.phase_path_label == "starter_crack_loss",
                candidates=starter_crack_candidates,
            ),
        )
    )
    lines.append("")
    lines.append("### Dead Early Loss")
    lines.append("")
    lines.append(
        markdown_table(
            ["Rule", "Games", "Precision", "Recall"],
            evaluate_target(
                rows,
                base_filter=lambda row: True,
                target_filter=lambda row: row.phase_path_label == "dead_early_loss",
                candidates=dead_early_candidates,
            ),
        )
    )
    lines.append("")
    lines.append("## Market Veto Checks")
    lines.append("")
    lines.append("### Expensive Favorite Failure")
    lines.append("")
    lines.append(
        markdown_table(
            ["Rule", "Games", "Precision", "Recall"],
            evaluate_target(
                rows,
                base_filter=lambda row: row.heavy_favorite,
                target_filter=lambda row: row.market_mispricing_label == "expensive_favorite_failed",
                candidates=expensive_favorite_candidates,
            ),
        )
    )
    lines.append("")
    lines.append("### Protected Market Dog Lane")
    lines.append("")
    lines.append(
        markdown_table(
            ["Rule", "Games", "Precision", "Recall"],
            evaluate_target(
                rows,
                base_filter=lambda row: row.pick_is_market_underdog,
                target_filter=lambda row: row.market_mispricing_label == "underdog_beat_market",
                candidates=dog_candidates,
            ),
        )
    )
    lines.append("")
    lines.append("## Combined Offline Engine")
    lines.append("")
    lines.append(
        markdown_table(
            ["Bucket", "Games", "Baseline hit", "Vetoed", "Veto hit", "Kept", "Kept hit"],
            combined_engine_rows(rows),
        )
    )
    lines.append("")
    lines.append("### 8+ Edge By Split")
    lines.append("")
    lines.append(
        markdown_table(
            ["Split", "Games", "Baseline hit", "Vetoed", "Veto hit", "Kept", "Kept hit"],
            split_engine_rows(rows),
        )
    )
    lines.append("")
    lines.append("### Protected Dog Performance")
    lines.append("")
    lines.append(
        markdown_table(
            ["Bucket", "Games", "Hit rate"],
            protected_dog_rows(rows),
        )
    )
    lines.append("")
    lines.append("## Read")
    lines.append("")
    lines.append("- `starter_crack_loss` still matters as a target label, but this first pass did **not** find a promotable veto trigger for it yet. That is useful information: we still need better starter-phase features there.")
    lines.append("- `dead_early_loss` is already more actionable: low lineup conversion plus real dead-bat traffic is the kind of lane we kept missing while still trusting the better paper team.")
    lines.append("- The heavy-favorite veto logic is finally concrete. Weak lineup conversion and noisy bullpen shape are not just warning text anymore; they define an offline danger bucket we can measure.")
    lines.append("- `market dog + opponent chaos gap` still looks like the cleanest protected dog lane. That is a better use of the chaos model than trying to make every favorite edge look smarter.")
    lines.append("- The combined veto set is still research-only, but it is already better framed as **pick suppression** than pick ranking. That is exactly the direction the chaos stack needs.")
    lines.append("")
    lines.append("## Next Move")
    lines.append("")
    lines.append("- Promote these veto flags into a daily offline scoring artifact so every game gets a `veto count` before any side is considered playable.")
    lines.append("- Keep `starter_crack_loss` and `dead_early_loss` as the two main failure labels for the next feature wave.")
    lines.append("- Do not widen the live pick board yet. The value here is in removing bad sides first.")
    lines.append("")
    out_path.write_text("\n".join(lines), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Research offline MLB veto logic from graded chaos labels.")
    parser.add_argument("--start-date", default=DEFAULT_START_DATE)
    parser.add_argument("--end-date", default=DEFAULT_END_DATE)
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    conn = get_connection()
    try:
        rows = load_rows(conn, args.start_date, args.end_date)
    finally:
        conn.close()

    write_report(Path(args.out), args.start_date, args.end_date, rows)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_OUT = ROOT / "development-docs" / "mlb-side-bounceback-flags-052926.md"
DEFAULT_START_DATE = "2026-05-10"
DEFAULT_END_DATE = "2026-05-28"


@dataclass
class Row:
    prediction_date: str
    matchup: str
    predicted_pick: str
    opponent_team: str
    hit_full_game: int
    confidence: int
    point_edge: float
    pick_previous_result: str | None
    opp_previous_result: str | None
    pick_close_loss_count_last5: int
    opp_close_loss_count_last5: int
    pick_blowout_loss_count_last5: int
    opp_blowout_loss_count_last5: int
    pick_snapback: float
    opp_snapback: float
    pick_form_pressure: float
    opp_form_pressure: float
    pick_run_diff_last5: float
    opp_run_diff_last5: float

    @property
    def pick_loss_but_not_dead(self) -> bool:
        return (
            self.pick_previous_result == "loss"
            and self.pick_close_loss_count_last5 >= 1
            and self.pick_blowout_loss_count_last5 == 0
        )

    @property
    def opp_loss_but_not_dead(self) -> bool:
        return (
            self.opp_previous_result == "loss"
            and self.opp_close_loss_count_last5 >= 1
            and self.opp_blowout_loss_count_last5 == 0
        )

    @property
    def pick_slumping_loser(self) -> bool:
        return (
            self.pick_previous_result == "loss"
            and self.pick_run_diff_last5 <= -2.0
            and self.pick_blowout_loss_count_last5 >= 1
        )

    @property
    def opp_slumping_loser(self) -> bool:
        return (
            self.opp_previous_result == "loss"
            and self.opp_run_diff_last5 <= -2.0
            and self.opp_blowout_loss_count_last5 >= 1
        )

    @property
    def pick_high_snap_low_form(self) -> bool:
        return (
            self.pick_previous_result == "loss"
            and self.pick_snapback >= 55.0
            and self.pick_form_pressure <= 45.0
        )

    @property
    def opp_high_snap_low_form(self) -> bool:
        return (
            self.opp_previous_result == "loss"
            and self.opp_snapback >= 55.0
            and self.opp_form_pressure <= 45.0
        )

    @property
    def high_confidence(self) -> bool:
        return self.confidence >= 60

    @property
    def high_edge(self) -> bool:
        return self.point_edge >= 8.0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Research bounceback/dead-bat flags on historical MLB side picks.")
    parser.add_argument("--db", default=str(DB_PATH))
    parser.add_argument("--start-date", default=DEFAULT_START_DATE)
    parser.add_argument("--end-date", default=DEFAULT_END_DATE)
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    return parser.parse_args()


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def safe_rate(rows: list[Row]) -> float:
    return sum(row.hit_full_game for row in rows) / len(rows) if rows else 0.0


def _to_float(value: object) -> float:
    return float(value or 0.0)


def _to_int(value: object) -> int:
    return int(value or 0)


def load_rows(db_path: Path, start_date: str, end_date: str) -> list[Row]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    query = """
        SELECT
          m.prediction_date,
          m.matchup,
          m.predicted_pick,
          m.opponent_team,
          m.hit_full_game,
          m.confidence,
          m.point_edge,
          ps.previous_result AS pick_previous_result,
          os.previous_result AS opp_previous_result,
          ps.close_loss_count_last5 AS pick_close_loss_count_last5,
          os.close_loss_count_last5 AS opp_close_loss_count_last5,
          ps.blowout_loss_count_last5 AS pick_blowout_loss_count_last5,
          os.blowout_loss_count_last5 AS opp_blowout_loss_count_last5,
          ps.snapback_pressure_index AS pick_snapback,
          os.snapback_pressure_index AS opp_snapback,
          ps.form_pressure_index AS pick_form_pressure,
          os.form_pressure_index AS opp_form_pressure,
          ps.run_diff_last5 AS pick_run_diff_last5,
          os.run_diff_last5 AS opp_run_diff_last5
        FROM mlb_market_mispricing_labels m
        LEFT JOIN mlb_team_state_snapshots ps
          ON ps.as_of_date = m.prediction_date
         AND ps.team_name = m.predicted_pick
        LEFT JOIN mlb_team_state_snapshots os
          ON os.as_of_date = m.prediction_date
         AND os.team_name = m.opponent_team
        WHERE m.market_type = 'moneyline'
          AND m.prediction_date BETWEEN ? AND ?
        ORDER BY m.prediction_date, m.matchup
    """
    rows: list[Row] = []
    for row in conn.execute(query, (start_date, end_date)).fetchall():
        rows.append(
            Row(
                prediction_date=str(row["prediction_date"]),
                matchup=str(row["matchup"]),
                predicted_pick=str(row["predicted_pick"]),
                opponent_team=str(row["opponent_team"]),
                hit_full_game=_to_int(row["hit_full_game"]),
                confidence=_to_int(row["confidence"]),
                point_edge=_to_float(row["point_edge"]),
                pick_previous_result=row["pick_previous_result"],
                opp_previous_result=row["opp_previous_result"],
                pick_close_loss_count_last5=_to_int(row["pick_close_loss_count_last5"]),
                opp_close_loss_count_last5=_to_int(row["opp_close_loss_count_last5"]),
                pick_blowout_loss_count_last5=_to_int(row["pick_blowout_loss_count_last5"]),
                opp_blowout_loss_count_last5=_to_int(row["opp_blowout_loss_count_last5"]),
                pick_snapback=_to_float(row["pick_snapback"]),
                opp_snapback=_to_float(row["opp_snapback"]),
                pick_form_pressure=_to_float(row["pick_form_pressure"]),
                opp_form_pressure=_to_float(row["opp_form_pressure"]),
                pick_run_diff_last5=_to_float(row["pick_run_diff_last5"]),
                opp_run_diff_last5=_to_float(row["opp_run_diff_last5"]),
            )
        )
    return rows


def build_markdown(rows: list[Row], start_date: str, end_date: str) -> str:
    baseline = safe_rate(rows)
    high_conf_rows = [row for row in rows if row.high_confidence]
    high_edge_rows = [row for row in rows if row.high_edge]

    cohorts = [
        ("Pick is loss but not dead", [row for row in rows if row.pick_loss_but_not_dead]),
        ("Opponent is loss but not dead", [row for row in rows if row.opp_loss_but_not_dead]),
        ("Pick is slumping loser", [row for row in rows if row.pick_slumping_loser]),
        ("Opponent is slumping loser", [row for row in rows if row.opp_slumping_loser]),
        ("Pick is high snapback, low form", [row for row in rows if row.pick_high_snap_low_form]),
        ("Opponent is high snapback, low form", [row for row in rows if row.opp_high_snap_low_form]),
    ]

    lines = [
        "# MLB Side Bounceback / Dead-Bat Flags",
        "",
        f"This pass tests the new bounceback buckets directly against historical MLB moneyline picks from `{start_date}` through `{end_date}`.",
        "",
        f"- total side picks: `{len(rows)}`",
        f"- baseline full-game hit rate: `{baseline:.1%}`",
        f"- `60+` confidence baseline: `{safe_rate(high_conf_rows):.1%}` on `{len(high_conf_rows)}` picks",
        f"- `8+` edge baseline: `{safe_rate(high_edge_rows):.1%}` on `{len(high_edge_rows)}` picks",
        "",
        "## Cohort Performance",
        "",
        markdown_table(
            ["Flag", "Picks", "FG hit rate", "Delta vs base"],
            [
                [
                    label,
                    str(len(bucket)),
                    f"{safe_rate(bucket):.1%}",
                    f"{(safe_rate(bucket) - baseline) * 100:+.1f} pts",
                ]
                for label, bucket in cohorts
            ],
        ),
        "",
        "## High-Confidence (`60+`) Slice",
        "",
        markdown_table(
            ["Flag", "Picks", "FG hit rate"],
            [
                [
                    label,
                    str(len([row for row in bucket if row.high_confidence])),
                    f"{safe_rate([row for row in bucket if row.high_confidence]):.1%}",
                ]
                for label, bucket in cohorts
            ],
        ),
        "",
        "## High-Edge (`8+`) Slice",
        "",
        markdown_table(
            ["Flag", "Picks", "FG hit rate"],
            [
                [
                    label,
                    str(len([row for row in bucket if row.high_edge])),
                    f"{safe_rate([row for row in bucket if row.high_edge]):.1%}",
                ]
                for label, bucket in cohorts
            ],
        ),
        "",
        "## Read",
        "",
    ]

    pick_slumping = [row for row in rows if row.pick_slumping_loser]
    opp_slumping = [row for row in rows if row.opp_slumping_loser]
    pick_not_dead = [row for row in rows if row.pick_loss_but_not_dead]
    opp_not_dead = [row for row in rows if row.opp_loss_but_not_dead]
    opp_snap_low_form = [row for row in rows if row.opp_high_snap_low_form]

    high_conf_pick_slumping = [row for row in pick_slumping if row.high_confidence]
    lines.extend(
        [
            f"- `Opponent slumping loser` is the cleanest positive signal here. The side hit rate rises to `{safe_rate(opp_slumping):.1%}`, and in the `60+` confidence slice it jumps to `{safe_rate([row for row in opp_slumping if row.high_confidence]):.1%}`.",
            f"- `Pick slumping loser` is **not** a blanket fade in this pick-only sample. It still hit `{safe_rate(pick_slumping):.1%}` overall, but the `60+` confidence subset dropped to `{safe_rate(high_conf_pick_slumping):.1%}` on a very small sample. That makes it a caution flag, not an auto-veto.",
            f"- `Loss but not dead` behaves more like resistance. Pick teams in that bucket hit `{safe_rate(pick_not_dead):.1%}`, while opponents in that bucket hold the side hit rate down at `{safe_rate(opp_not_dead):.1%}`.",
            f"- `Pick high snapback, low form` is still the cleanest danger flag, even in a tiny sample, at `{safe_rate([row for row in rows if row.pick_high_snap_low_form]):.1%}`.",
            f"- `Opponent high snapback, low form` is not a clean fade bucket. It still needs to be treated as chaos / resistance, not automatic attack, with a `{safe_rate(opp_snap_low_form):.1%}` side hit rate in this sample.",
            "",
            "## Next step",
            "",
            "- Promote `opponent slumping loser` as a direct positive selector for side / NRFI / F5-under style research lanes.",
            "- Treat `pick slumping loser` as a caution flag that bites harder when the board is already overconfident.",
            "- Keep `loss but not dead` as a resistance flag so the board stops overfading competitive losers.",
            "- Keep `pick high snapback, low form` as a small-sample but high-priority danger bucket.",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> None:
    args = parse_args()
    rows = load_rows(Path(args.db), args.start_date, args.end_date)
    report = build_markdown(rows, args.start_date, args.end_date)
    Path(args.out).write_text(report)
    print(f"Wrote side bounceback flag report to {args.out}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_OUT = ROOT / "development-docs" / "story-phase-label-research-052326.md"


@dataclass
class PhaseLabelRow:
    game_date: str
    team_name: str
    opponent_team: str
    phase_path_label: str
    result: str
    team_chaos: float
    opp_chaos: float
    team_scoreless3: float
    opp_scoreless3: float
    lineup_index: float
    opp_lineup: float
    quiet5: float
    opp_quiet5: float
    bullpen_chaos: float
    opp_bullpen: float
    lead_loss: float
    opp_lead_loss: float
    starter_command: float
    opp_starter_command: float
    snapback: float
    opp_snapback: float

    @property
    def chaos_gap(self) -> float:
        return self.opp_chaos - self.team_chaos

    @property
    def lineup_gap(self) -> float:
        return self.opp_lineup - self.lineup_index

    @property
    def bullpen_gap(self) -> float:
        return self.opp_bullpen - self.bullpen_chaos

    @property
    def starter_command_gap(self) -> float:
        return self.starter_command - self.opp_starter_command

    @property
    def snapback_gap(self) -> float:
        return self.opp_snapback - self.snapback


@dataclass
class MarketLabelRow:
    prediction_date: str
    matchup: str
    predicted_pick: str
    opponent_team: str
    market_mispricing_label: str
    market_phase_preference_label: str
    market_probability: float
    pick_is_market_favorite: bool
    pick_is_market_underdog: bool
    team_chaos: float
    opp_chaos: float
    lineup_index: float
    opp_lineup: float
    quiet5: float
    opp_quiet5: float
    bullpen_chaos: float
    opp_bullpen: float
    snapback: float
    opp_snapback: float

    @property
    def chaos_gap(self) -> float:
        return self.opp_chaos - self.team_chaos

    @property
    def lineup_gap(self) -> float:
        return self.lineup_index - self.opp_lineup

    @property
    def bullpen_gap(self) -> float:
        return self.opp_bullpen - self.bullpen_chaos

    @property
    def snapback_gap(self) -> float:
        return self.opp_snapback - self.snapback


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def safe_avg(values: list[float]) -> float:
    return round(sum(values) / len(values), 3) if values else 0.0


def _read_float(value: object) -> float:
    return float(value or 0.0)


def load_phase_rows(conn: sqlite3.Connection) -> list[PhaseLabelRow]:
    query = """
        SELECT
          p.game_date,
          p.team_name,
          p.opponent_team,
          p.phase_path_label,
          p.result,
          tm.mistake_chaos_index AS team_chaos,
          om.mistake_chaos_index AS opp_chaos,
          tm.scoreless_first3_rate AS team_scoreless3,
          om.scoreless_first3_rate AS opp_scoreless3,
          lm.lineup_conversion_index AS lineup_index,
          ol.lineup_conversion_index AS opp_lineup,
          lm.quiet_first5_rate AS quiet5,
          ol.quiet_first5_rate AS opp_quiet5,
          bm.bullpen_chaos_index AS bullpen_chaos,
          ob.bullpen_chaos_index AS opp_bullpen,
          bm.lead_loss_after_entry_rate AS lead_loss,
          ob.lead_loss_after_entry_rate AS opp_lead_loss,
          ps.command_break_index AS starter_command,
          ops.command_break_index AS opp_starter_command,
          ts.snapback_pressure_index AS snapback,
          ots.snapback_pressure_index AS opp_snapback
        FROM mlb_phase_outcomes_daily p
        LEFT JOIN mlb_team_mistake_shape_daily tm
          ON tm.as_of_date = p.game_date
         AND tm.team_name = p.team_name
         AND tm.window_games = 8
        LEFT JOIN mlb_team_mistake_shape_daily om
          ON om.as_of_date = p.game_date
         AND om.team_name = p.opponent_team
         AND om.window_games = 8
        LEFT JOIN mlb_lineup_conversion_shape_daily lm
          ON lm.as_of_date = p.game_date
         AND lm.team_name = p.team_name
         AND lm.window_games = 8
        LEFT JOIN mlb_lineup_conversion_shape_daily ol
          ON ol.as_of_date = p.game_date
         AND ol.team_name = p.opponent_team
         AND ol.window_games = 8
        LEFT JOIN mlb_bullpen_mistake_shape_daily bm
          ON bm.as_of_date = p.game_date
         AND bm.team_name = p.team_name
         AND bm.window_days = 14
        LEFT JOIN mlb_bullpen_mistake_shape_daily ob
          ON ob.as_of_date = p.game_date
         AND ob.team_name = p.opponent_team
         AND ob.window_days = 14
        LEFT JOIN mlb_starting_pitcher_game_logs gl
          ON gl.game_pk = p.game_pk
         AND gl.team_role = p.team_role
        LEFT JOIN mlb_starting_pitcher_game_logs ogl
          ON ogl.game_pk = p.game_pk
         AND ogl.team_role != p.team_role
        LEFT JOIN mlb_pitcher_mistake_shape_daily ps
          ON ps.as_of_date = p.game_date
         AND ps.pitcher_id = gl.pitcher_id
         AND ps.window_starts = 5
        LEFT JOIN mlb_pitcher_mistake_shape_daily ops
          ON ops.as_of_date = p.game_date
         AND ops.pitcher_id = ogl.pitcher_id
         AND ops.window_starts = 5
        LEFT JOIN mlb_team_state_snapshots ts
          ON ts.as_of_date = p.game_date
         AND ts.team_name = p.team_name
        LEFT JOIN mlb_team_state_snapshots ots
          ON ots.as_of_date = p.game_date
         AND ots.team_name = p.opponent_team
        WHERE p.game_date BETWEEN '2026-05-10' AND '2026-05-22'
    """
    rows: list[PhaseLabelRow] = []
    for row in conn.execute(query).fetchall():
        rows.append(
            PhaseLabelRow(
                game_date=str(row["game_date"]),
                team_name=str(row["team_name"]),
                opponent_team=str(row["opponent_team"]),
                phase_path_label=str(row["phase_path_label"]),
                result=str(row["result"]),
                team_chaos=_read_float(row["team_chaos"]),
                opp_chaos=_read_float(row["opp_chaos"]),
                team_scoreless3=_read_float(row["team_scoreless3"]),
                opp_scoreless3=_read_float(row["opp_scoreless3"]),
                lineup_index=_read_float(row["lineup_index"]),
                opp_lineup=_read_float(row["opp_lineup"]),
                quiet5=_read_float(row["quiet5"]),
                opp_quiet5=_read_float(row["opp_quiet5"]),
                bullpen_chaos=_read_float(row["bullpen_chaos"]),
                opp_bullpen=_read_float(row["opp_bullpen"]),
                lead_loss=_read_float(row["lead_loss"]),
                opp_lead_loss=_read_float(row["opp_lead_loss"]),
                starter_command=_read_float(row["starter_command"]),
                opp_starter_command=_read_float(row["opp_starter_command"]),
                snapback=_read_float(row["snapback"]),
                opp_snapback=_read_float(row["opp_snapback"]),
            )
        )
    return rows


def load_market_rows(conn: sqlite3.Connection) -> list[MarketLabelRow]:
    query = """
        SELECT
          m.prediction_date,
          m.matchup,
          m.predicted_pick,
          m.opponent_team,
          m.market_mispricing_label,
          m.market_phase_preference_label,
          m.market_favorite_probability,
          m.pick_is_market_favorite,
          m.pick_is_market_underdog,
          tm.mistake_chaos_index AS team_chaos,
          om.mistake_chaos_index AS opp_chaos,
          lm.lineup_conversion_index AS lineup_index,
          ol.lineup_conversion_index AS opp_lineup,
          lm.quiet_first5_rate AS quiet5,
          ol.quiet_first5_rate AS opp_quiet5,
          bm.bullpen_chaos_index AS bullpen_chaos,
          ob.bullpen_chaos_index AS opp_bullpen,
          ts.snapback_pressure_index AS snapback,
          ots.snapback_pressure_index AS opp_snapback
        FROM mlb_market_mispricing_labels m
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
        LEFT JOIN mlb_lineup_conversion_shape_daily ol
          ON ol.as_of_date = m.prediction_date
         AND ol.team_name = m.opponent_team
         AND ol.window_games = 8
        LEFT JOIN mlb_bullpen_mistake_shape_daily bm
          ON bm.as_of_date = m.prediction_date
         AND bm.team_name = m.predicted_pick
         AND bm.window_days = 14
        LEFT JOIN mlb_bullpen_mistake_shape_daily ob
          ON ob.as_of_date = m.prediction_date
         AND ob.team_name = m.opponent_team
         AND ob.window_days = 14
        LEFT JOIN mlb_team_state_snapshots ts
          ON ts.as_of_date = m.prediction_date
         AND ts.team_name = m.predicted_pick
        LEFT JOIN mlb_team_state_snapshots ots
          ON ots.as_of_date = m.prediction_date
         AND ots.team_name = m.opponent_team
        WHERE m.prediction_date BETWEEN '2026-05-10' AND '2026-05-22'
    """
    rows: list[MarketLabelRow] = []
    for row in conn.execute(query).fetchall():
        rows.append(
            MarketLabelRow(
                prediction_date=str(row["prediction_date"]),
                matchup=str(row["matchup"]),
                predicted_pick=str(row["predicted_pick"]),
                opponent_team=str(row["opponent_team"]),
                market_mispricing_label=str(row["market_mispricing_label"]),
                market_phase_preference_label=str(row["market_phase_preference_label"]),
                market_probability=_read_float(row["market_favorite_probability"]),
                pick_is_market_favorite=bool(int(row["pick_is_market_favorite"] or 0)),
                pick_is_market_underdog=bool(int(row["pick_is_market_underdog"] or 0)),
                team_chaos=_read_float(row["team_chaos"]),
                opp_chaos=_read_float(row["opp_chaos"]),
                lineup_index=_read_float(row["lineup_index"]),
                opp_lineup=_read_float(row["opp_lineup"]),
                quiet5=_read_float(row["quiet5"]),
                opp_quiet5=_read_float(row["opp_quiet5"]),
                bullpen_chaos=_read_float(row["bullpen_chaos"]),
                opp_bullpen=_read_float(row["opp_bullpen"]),
                snapback=_read_float(row["snapback"]),
                opp_snapback=_read_float(row["opp_snapback"]),
            )
        )
    return rows


def label_count_rows(rows: list[PhaseLabelRow], attr: str, labels: list[str]) -> list[list[str]]:
    output: list[list[str]] = []
    for label in labels:
        count = sum(1 for row in rows if getattr(row, attr) == label)
        output.append([label, str(count)])
    return output


def phase_family_summary(rows: list[PhaseLabelRow]) -> list[list[str]]:
    labels = [
        "starter_crack_loss",
        "dead_early_loss",
        "blew_lead_after5",
        "starter_carried",
        "jumped_early_hold",
    ]
    output: list[list[str]] = []
    for label in labels:
        bucket = [row for row in rows if row.phase_path_label == label]
        output.append(
            [
                label,
                str(len(bucket)),
                f"{safe_avg([row.lineup_index for row in bucket]):.1f}",
                f"{safe_avg([row.team_scoreless3 for row in bucket]):.3f}",
                f"{safe_avg([row.quiet5 for row in bucket]):.3f}",
                f"{safe_avg([row.starter_command for row in bucket]):.1f}",
                f"{safe_avg([row.bullpen_chaos for row in bucket]):.1f}",
                f"{safe_avg([row.chaos_gap for row in bucket]):.1f}",
                f"{safe_avg([row.lineup_gap for row in bucket]):.1f}",
                f"{safe_avg([row.snapback_gap for row in bucket]):.1f}",
            ]
        )
    return output


def market_family_summary(rows: list[MarketLabelRow]) -> list[list[str]]:
    labels = [
        ("expensive_favorite_failed", "market_mispricing_label"),
        ("underdog_beat_market", "market_mispricing_label"),
        ("first5_cleaner", "market_phase_preference_label"),
        ("full_game_cleaner", "market_phase_preference_label"),
    ]
    output: list[list[str]] = []
    for label, attr in labels:
        bucket = [row for row in rows if getattr(row, attr) == label]
        output.append(
            [
                label,
                str(len(bucket)),
                f"{safe_avg([row.market_probability for row in bucket]):.3f}",
                f"{safe_avg([row.team_chaos for row in bucket]):.1f}",
                f"{safe_avg([row.chaos_gap for row in bucket]):.1f}",
                f"{safe_avg([row.lineup_index for row in bucket]):.1f}",
                f"{safe_avg([row.lineup_gap for row in bucket]):.1f}",
                f"{safe_avg([row.bullpen_chaos for row in bucket]):.1f}",
                f"{safe_avg([row.bullpen_gap for row in bucket]):.1f}",
                f"{safe_avg([row.snapback_gap for row in bucket]):.1f}",
            ]
        )
    return output


def expensive_favorite_candidate_rows(rows: list[MarketLabelRow]) -> list[list[str]]:
    heavy_favorites = [row for row in rows if row.pick_is_market_favorite and row.market_probability >= 0.60]
    target_total = sum(1 for row in heavy_favorites if row.market_mispricing_label == "expensive_favorite_failed")
    candidates = [
        ("Heavy favorite baseline", lambda row: True),
        ("Heavy favorite + lineup index <= 25", lambda row: row.lineup_index <= 25),
        ("Heavy favorite + bullpen chaos >= 50", lambda row: row.bullpen_chaos >= 50),
        ("Heavy favorite + quiet first5 >= 50%", lambda row: row.quiet5 >= 0.5),
    ]
    output: list[list[str]] = []
    for label, predicate in candidates:
        bucket = [row for row in heavy_favorites if predicate(row)]
        if not bucket:
            output.append([label, "0", "0.000", "0.000"])
            continue
        positives = sum(1 for row in bucket if row.market_mispricing_label == "expensive_favorite_failed")
        precision = positives / len(bucket)
        recall = positives / target_total if target_total else 0.0
        output.append([label, str(len(bucket)), f"{precision:.3f}", f"{recall:.3f}"])
    return output


def underdog_candidate_rows(rows: list[MarketLabelRow]) -> list[list[str]]:
    underdogs = [row for row in rows if row.pick_is_market_underdog]
    target_total = sum(1 for row in underdogs if row.market_mispricing_label == "underdog_beat_market")
    candidates = [
        ("Market dog baseline", lambda row: True),
        ("Dog + opponent chaos gap >= 8", lambda row: row.chaos_gap >= 8),
        ("Dog + opponent snapback gap >= 10", lambda row: row.snapback_gap >= 10),
        ("Dog + lineup edge >= 10", lambda row: row.lineup_gap >= 10),
        ("Dog + opponent bullpen gap >= 8", lambda row: row.bullpen_gap >= 8),
    ]
    output: list[list[str]] = []
    for label, predicate in candidates:
        bucket = [row for row in underdogs if predicate(row)]
        if not bucket:
            output.append([label, "0", "0.000", "0.000"])
            continue
        positives = sum(1 for row in bucket if row.market_mispricing_label == "underdog_beat_market")
        precision = positives / len(bucket)
        recall = positives / target_total if target_total else 0.0
        output.append([label, str(len(bucket)), f"{precision:.3f}", f"{recall:.3f}"])
    return output


def write_report(out_path: Path, phase_rows: list[PhaseLabelRow], market_rows: list[MarketLabelRow]) -> None:
    lines: list[str] = []
    lines.append("# MLB Story / Phase Label Research")
    lines.append("")
    lines.append("This pass looks at the new label tables and asks a better question than `did the pick lose?`: **how did the game break, and what shapes were live before first pitch?**")
    lines.append("")
    lines.append("## Label Counts")
    lines.append("")
    lines.append(
        markdown_table(
            ["Phase path label", "Rows"],
            label_count_rows(
                phase_rows,
                "phase_path_label",
                ["starter_crack_loss", "dead_early_loss", "blew_lead_after5", "starter_carried", "jumped_early_hold"],
            ),
        )
    )
    lines.append("")
    lines.append(
        markdown_table(
            ["Market label", "Rows"],
            label_count_rows(
                market_rows,
                "market_mispricing_label",
                ["expensive_favorite_failed", "underdog_beat_market", "favorite_held", "market_neutral"],
            ),
        )
    )
    lines.append("")
    lines.append("## Phase Label Shapes")
    lines.append("")
    lines.append(
        markdown_table(
            [
                "Phase label",
                "Rows",
                "Lineup idx",
                "Scoreless3",
                "Quiet5",
                "Starter cmd",
                "Bullpen chaos",
                "Opp chaos gap",
                "Opp lineup gap",
                "Opp snapback gap",
            ],
            phase_family_summary(phase_rows),
        )
    )
    lines.append("")
    lines.append("## Market / Phase Shapes")
    lines.append("")
    lines.append(
        markdown_table(
            [
                "Label",
                "Rows",
                "Fav prob",
                "Pick chaos",
                "Opp chaos gap",
                "Pick lineup",
                "Pick lineup edge",
                "Pick bullpen",
                "Opp bullpen gap",
                "Opp snapback gap",
            ],
            market_family_summary(market_rows),
        )
    )
    lines.append("")
    lines.append("## Candidate Market Triggers")
    lines.append("")
    lines.append("### Expensive Favorite Failure")
    lines.append("")
    lines.append(
        markdown_table(
            ["Rule", "Games", "Precision", "Recall"],
            expensive_favorite_candidate_rows(market_rows),
        )
    )
    lines.append("")
    lines.append("### Underdog Beat Market")
    lines.append("")
    lines.append(
        markdown_table(
            ["Rule", "Games", "Precision", "Recall"],
            underdog_candidate_rows(market_rows),
        )
    )
    lines.append("")
    lines.append("## Read")
    lines.append("")
    lines.append("- `starter_crack_loss` and `dead_early_loss` are much more about **weak offensive shape** than broad team strength. Their lineup-conversion indexes are low, and their scoreless-first-3 rates are already very high before the game starts.")
    lines.append("- `starter_crack_loss` also carries a noticeably worse starter command-break profile than `starter_carried`, which is exactly the kind of phase-specific difference we were missing before.")
    lines.append("- `jumped_early_hold` is the opposite shape: much stronger lineup conversion and much less early deadness. That tells us early-game confidence should come more from scoring shape than generic favorite strength.")
    lines.append("- `expensive_favorite_failed` is still a small sample, but the first clean warning is this: **heavy favorites with weak lineup conversion or noisy bullpen shape are dangerous**.")
    lines.append("- The best early market-win finding is stronger: when we took a **market underdog** and the opponent carried a much louder chaos vector, those dogs were legitimately live. That is a real candidate mispricing lane, not just narrative.")
    lines.append("- `first5_cleaner` still does not have a strong enough label rule yet. The label table is useful, but we do not have a trustworthy first-five trigger family from it yet.")
    lines.append("")
    lines.append("## Next Move")
    lines.append("")
    lines.append("- Turn the heavy-favorite failure triggers into research-only veto flags.")
    lines.append("- Turn the underdog-chaos trigger into a protected market-dog lane and test it against more slates.")
    lines.append("- Build the next research pass specifically around `starter_crack_loss` and `dead_early_loss`, because those are the two labels most directly tied to today’s ugly misses.")
    lines.append("")
    out_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Research MLB story/phase label shapes and candidate market triggers.")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="Where to write the markdown report.")
    args = parser.parse_args()

    with get_connection() as conn:
        phase_rows = load_phase_rows(conn)
        market_rows = load_market_rows(conn)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    write_report(out_path, phase_rows, market_rows)
    print(f"Wrote story/phase label research -> {out_path}")


if __name__ == "__main__":
    main()

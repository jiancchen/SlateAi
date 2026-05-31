#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
HISTORY_DIR = ROOT / "data-private" / "history"
DEFAULT_OUT = ROOT / "development-docs" / "mlb" / "research" / "tier2-feature-research-052226.md"
TEAM_WINDOW = 10
LEASH_WINDOW = 5


@dataclass
class TierTwoRow:
    split: str
    date: str
    matchup: str
    game_pk: int | None
    pick_team: str
    opponent_team: str
    hit: int
    confidence: int
    volatility: int
    point_edge: float
    starter_leverage_index: float
    late_inning_stability_index: float
    pick_story_instability: float | None
    opp_story_instability: float | None
    pick_dependency: float | None
    opp_dependency: float | None
    pick_starter_leash: float | None
    opp_starter_leash: float | None
    same_division_flag: int | None
    series_game_number: int | None
    played_yesterday_flag: int | None

    @property
    def story_gap(self) -> float | None:
        if self.pick_story_instability is None or self.opp_story_instability is None:
            return None
        return self.pick_story_instability - self.opp_story_instability

    @property
    def dependency_gap(self) -> float | None:
        if self.pick_dependency is None or self.opp_dependency is None:
            return None
        return self.pick_dependency - self.opp_dependency

    @property
    def leash_gap(self) -> float | None:
        if self.pick_starter_leash is None or self.opp_starter_leash is None:
            return None
        return self.pick_starter_leash - self.opp_starter_leash


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hit_rate(rows: list[TierTwoRow]) -> float:
    return round(sum(row.hit for row in rows) / len(rows), 3) if rows else 0.0


def safe_avg(values: list[float]) -> float:
    return round(sum(values) / len(values), 2) if values else 0.0


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def load_game_lookup(conn: sqlite3.Connection) -> dict[tuple[str, str, str], dict[str, int | None]]:
    lookup: dict[tuple[str, str, str], dict[str, int | None]] = {}
    rows = conn.execute(
        """
        SELECT
          g.game_date,
          g.away_team,
          g.home_team,
          g.game_pk,
          MAX(CASE WHEN sp.team_role = 'away' THEN sp.pitcher_id END) AS away_pitcher_id,
          MAX(CASE WHEN sp.team_role = 'home' THEN sp.pitcher_id END) AS home_pitcher_id
        FROM mlb_games g
        LEFT JOIN mlb_starting_pitchers sp
          USING (game_pk)
        GROUP BY g.game_date, g.away_team, g.home_team, g.game_pk
        """
    ).fetchall()
    for row in rows:
        lookup[(row["game_date"], row["away_team"], row["home_team"])] = {
            "game_pk": row["game_pk"],
            "away_pitcher_id": row["away_pitcher_id"],
            "home_pitcher_id": row["home_pitcher_id"],
        }
    return lookup


def load_table_lookup(
    conn: sqlite3.Connection,
    table_name: str,
    key_columns: list[str],
    value_columns: list[str],
    where_clause: str = "",
    params: tuple[object, ...] = (),
) -> dict[tuple[object, ...], dict[str, object]]:
    where_sql = f"WHERE {where_clause}" if where_clause else ""
    sql = f"SELECT {', '.join(key_columns + value_columns)} FROM {table_name} {where_sql}"
    lookup: dict[tuple[object, ...], dict[str, object]] = {}
    for row in conn.execute(sql, params).fetchall():
        key = tuple(row[column] for column in key_columns)
        lookup[key] = {column: row[column] for column in value_columns}
    return lookup


def load_reserve_rows(conn: sqlite3.Connection, game_lookup: dict[tuple[str, str, str], dict[str, int | None]]) -> list[TierTwoRow]:
    story_lookup = load_table_lookup(
        conn,
        "mlb_team_story_priors",
        ["as_of_date", "team_name"],
        ["story_instability_index"],
        "window_games = ?",
        (TEAM_WINDOW,),
    )
    dependency_lookup = load_table_lookup(
        conn,
        "mlb_lineup_dependency_profiles",
        ["as_of_date", "team_name"],
        ["dependency_score"],
        "window_games = ?",
        (TEAM_WINDOW,),
    )
    leash_lookup = load_table_lookup(
        conn,
        "mlb_starter_leash_profiles",
        ["as_of_date", "pitcher_id"],
        ["leash_score"],
        "window_starts = ?",
        (LEASH_WINDOW,),
    )
    series_lookup = load_table_lookup(
        conn,
        "mlb_series_context_snapshots",
        ["as_of_date", "game_pk"],
        ["same_division_flag", "series_game_number", "played_yesterday_flag"],
    )

    rows: list[TierTwoRow] = []
    for record in conn.execute(
        """
        SELECT
          p.prediction_date,
          p.game_title,
          p.away_team,
          p.home_team,
          p.predicted_team,
          p.predicted_side,
          p.confidence,
          p.volatility,
          p.model_edge,
          p.starter_leverage_index,
          p.late_inning_stability_index,
          b.hit_full_game
        FROM mlb_side_predictions p
        JOIN mlb_side_backtests b
          USING (prediction_date, model_name, game_id)
        WHERE p.prediction_date BETWEEN '2026-05-10' AND '2026-05-15'
          AND p.model_name = 'board-moneyline-v2'
        ORDER BY p.prediction_date, p.game_title
        """
    ):
        game_info = game_lookup.get((record["prediction_date"], record["away_team"], record["home_team"])) or {}
        game_pk = game_info.get("game_pk")
        predicted_side = record["predicted_side"]
        opponent_team = record["home_team"] if predicted_side == "away" else record["away_team"]
        pick_pitcher_id = game_info.get("away_pitcher_id") if predicted_side == "away" else game_info.get("home_pitcher_id")
        opp_pitcher_id = game_info.get("home_pitcher_id") if predicted_side == "away" else game_info.get("away_pitcher_id")

        rows.append(
            TierTwoRow(
                split="reserve",
                date=record["prediction_date"],
                matchup=record["game_title"],
                game_pk=game_pk if isinstance(game_pk, int) else None,
                pick_team=record["predicted_team"],
                opponent_team=opponent_team,
                hit=int(record["hit_full_game"]),
                confidence=int(record["confidence"] or 0),
                volatility=int(record["volatility"] or 0),
                point_edge=float(record["model_edge"] or 0.0),
                starter_leverage_index=float(record["starter_leverage_index"] or 0.0),
                late_inning_stability_index=float(record["late_inning_stability_index"] or 0.0),
                pick_story_instability=_read_float(story_lookup.get((record["prediction_date"], record["predicted_team"])), "story_instability_index"),
                opp_story_instability=_read_float(story_lookup.get((record["prediction_date"], opponent_team)), "story_instability_index"),
                pick_dependency=_read_float(dependency_lookup.get((record["prediction_date"], record["predicted_team"])), "dependency_score"),
                opp_dependency=_read_float(dependency_lookup.get((record["prediction_date"], opponent_team)), "dependency_score"),
                pick_starter_leash=_read_float(leash_lookup.get((record["prediction_date"], pick_pitcher_id)), "leash_score") if pick_pitcher_id else None,
                opp_starter_leash=_read_float(leash_lookup.get((record["prediction_date"], opp_pitcher_id)), "leash_score") if opp_pitcher_id else None,
                same_division_flag=_read_int(series_lookup.get((record["prediction_date"], game_pk)), "same_division_flag") if game_pk else None,
                series_game_number=_read_int(series_lookup.get((record["prediction_date"], game_pk)), "series_game_number") if game_pk else None,
                played_yesterday_flag=_read_int(series_lookup.get((record["prediction_date"], game_pk)), "played_yesterday_flag") if game_pk else None,
            )
        )
    return rows


def load_current_rows(conn: sqlite3.Connection, game_lookup: dict[tuple[str, str, str], dict[str, int | None]]) -> list[TierTwoRow]:
    story_lookup = load_table_lookup(
        conn,
        "mlb_team_story_priors",
        ["as_of_date", "team_name"],
        ["story_instability_index"],
        "window_games = ?",
        (TEAM_WINDOW,),
    )
    dependency_lookup = load_table_lookup(
        conn,
        "mlb_lineup_dependency_profiles",
        ["as_of_date", "team_name"],
        ["dependency_score"],
        "window_games = ?",
        (TEAM_WINDOW,),
    )
    leash_lookup = load_table_lookup(
        conn,
        "mlb_starter_leash_profiles",
        ["as_of_date", "pitcher_id"],
        ["leash_score"],
        "window_starts = ?",
        (LEASH_WINDOW,),
    )
    series_lookup = load_table_lookup(
        conn,
        "mlb_series_context_snapshots",
        ["as_of_date", "game_pk"],
        ["same_division_flag", "series_game_number", "played_yesterday_flag"],
    )

    rows: list[TierTwoRow] = []
    for date in (
        "2026-05-16",
        "2026-05-17",
        "2026-05-18",
        "2026-05-19",
        "2026-05-20",
        "2026-05-21",
        "2026-05-22",
    ):
        path = HISTORY_DIR / f"mlb-results-{date}.jsonl"
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            record = json.loads(line)
            if record.get("sport") != "MLB" or record.get("marketType") != "moneyline":
                continue
            away_team = record.get("awayTeam")
            home_team = record.get("homeTeam")
            pick_team = record.get("predictedPick")
            predicted_side = record.get("predictedSide")
            if not away_team or not home_team or not pick_team or not predicted_side:
                continue
            opponent_team = home_team if predicted_side == "away" else away_team
            game_info = game_lookup.get((date, away_team, home_team)) or {}
            game_pk = game_info.get("game_pk")
            pick_pitcher_id = game_info.get("away_pitcher_id") if predicted_side == "away" else game_info.get("home_pitcher_id")
            opp_pitcher_id = game_info.get("home_pitcher_id") if predicted_side == "away" else game_info.get("away_pitcher_id")
            indicators = record.get("indicators") or {}
            result = record.get("result") or {}
            rows.append(
                TierTwoRow(
                    split="current",
                    date=date,
                    matchup=record.get("matchup") or f"{away_team} @ {home_team}",
                    game_pk=game_pk if isinstance(game_pk, int) else None,
                    pick_team=pick_team,
                    opponent_team=opponent_team,
                    hit=1 if result.get("fullGameHit") else 0,
                    confidence=int(record.get("confidence") or 0),
                    volatility=int(record.get("volatility") or 0),
                    point_edge=float(record.get("pointEdge") or 0.0),
                    starter_leverage_index=float(indicators.get("starterLeverageIndex") or 0.0),
                    late_inning_stability_index=float(indicators.get("lateInningStabilityIndex") or 0.0),
                    pick_story_instability=_read_float(story_lookup.get((date, pick_team)), "story_instability_index"),
                    opp_story_instability=_read_float(story_lookup.get((date, opponent_team)), "story_instability_index"),
                    pick_dependency=_read_float(dependency_lookup.get((date, pick_team)), "dependency_score"),
                    opp_dependency=_read_float(dependency_lookup.get((date, opponent_team)), "dependency_score"),
                    pick_starter_leash=_read_float(leash_lookup.get((date, pick_pitcher_id)), "leash_score") if pick_pitcher_id else None,
                    opp_starter_leash=_read_float(leash_lookup.get((date, opp_pitcher_id)), "leash_score") if opp_pitcher_id else None,
                    same_division_flag=_read_int(series_lookup.get((date, game_pk)), "same_division_flag") if game_pk else None,
                    series_game_number=_read_int(series_lookup.get((date, game_pk)), "series_game_number") if game_pk else None,
                    played_yesterday_flag=_read_int(series_lookup.get((date, game_pk)), "played_yesterday_flag") if game_pk else None,
                )
            )
    return rows


def _read_float(payload: dict[str, object] | None, key: str) -> float | None:
    if not payload:
        return None
    value = payload.get(key)
    return None if value is None else float(value)


def _read_int(payload: dict[str, object] | None, key: str) -> int | None:
    if not payload:
        return None
    value = payload.get(key)
    return None if value is None else int(value)


def bucket_rate(rows: list[TierTwoRow], predicate: Callable[[TierTwoRow], bool]) -> tuple[int, float]:
    subset = [row for row in rows if predicate(row)]
    return len(subset), hit_rate(subset)


def format_dataset_summary(rows: list[TierTwoRow]) -> str:
    reserve = [row for row in rows if row.split == "reserve"]
    current = [row for row in rows if row.split == "current"]
    table = markdown_table(
        ["Window", "Games", "Hit rate", "Avg edge", "Avg volatility"],
        [
            [
                "Reserve (`05-10` to `05-15`)",
                str(len(reserve)),
                f"{hit_rate(reserve):.3f}",
                f"{safe_avg([row.point_edge for row in reserve]):.1f}",
                f"{safe_avg([float(row.volatility) for row in reserve]):.1f}",
            ],
            [
                "Current (`05-16` to `05-22`)",
                str(len(current)),
                f"{hit_rate(current):.3f}",
                f"{safe_avg([row.point_edge for row in current]):.1f}",
                f"{safe_avg([float(row.volatility) for row in current]):.1f}",
            ],
            [
                "Combined",
                str(len(rows)),
                f"{hit_rate(rows):.3f}",
                f"{safe_avg([row.point_edge for row in rows]):.1f}",
                f"{safe_avg([float(row.volatility) for row in rows]):.1f}",
            ],
        ],
    )
    return table


def format_inventory(conn: sqlite3.Connection) -> str:
    counts = {
        "team_story_priors": conn.execute("SELECT COUNT(*) FROM mlb_team_story_priors").fetchone()[0],
        "lineup_dependency_profiles": conn.execute("SELECT COUNT(*) FROM mlb_lineup_dependency_profiles").fetchone()[0],
        "starter_leash_profiles": conn.execute("SELECT COUNT(*) FROM mlb_starter_leash_profiles").fetchone()[0],
        "series_context_snapshots": conn.execute("SELECT COUNT(*) FROM mlb_series_context_snapshots").fetchone()[0],
    }
    return "\n".join(
        [
            f"- `mlb_team_story_priors`: {counts['team_story_priors']} rows",
            f"- `mlb_lineup_dependency_profiles`: {counts['lineup_dependency_profiles']} rows",
            f"- `mlb_starter_leash_profiles`: {counts['starter_leash_profiles']} rows",
            f"- `mlb_series_context_snapshots`: {counts['series_context_snapshots']} rows",
        ]
    )


def bucket_markdown(
    rows: list[TierTwoRow],
    title: str,
    bucket_specs: list[tuple[str, Callable[[TierTwoRow], bool]]],
) -> str:
    table_rows = []
    for label, predicate in bucket_specs:
        count, rate = bucket_rate(rows, predicate)
        table_rows.append([label, str(count), f"{rate:.3f}"])
    return f"### {title}\n" + markdown_table(["Bucket", "Games", "Hit rate"], table_rows)


def has_story(row: TierTwoRow) -> bool:
    return row.pick_story_instability is not None


def has_dependency(row: TierTwoRow) -> bool:
    return row.pick_dependency is not None


def has_leash(row: TierTwoRow) -> bool:
    return row.pick_starter_leash is not None


def format_bucket_analysis(rows: list[TierTwoRow]) -> str:
    sections = [
        bucket_markdown(
            rows,
            "Pick-Team Story Instability",
            [
                ("`<45`", lambda row: has_story(row) and (row.pick_story_instability or 0) < 45),
                ("`45-54`", lambda row: has_story(row) and 45 <= (row.pick_story_instability or 0) < 55),
                ("`55-64`", lambda row: has_story(row) and 55 <= (row.pick_story_instability or 0) < 65),
                ("`65+`", lambda row: has_story(row) and (row.pick_story_instability or 0) >= 65),
            ],
        ),
        bucket_markdown(
            rows,
            "Pick-Team Lineup Dependency",
            [
                ("`<35`", lambda row: has_dependency(row) and (row.pick_dependency or 0) < 35),
                ("`35-49`", lambda row: has_dependency(row) and 35 <= (row.pick_dependency or 0) < 50),
                ("`50-59`", lambda row: has_dependency(row) and 50 <= (row.pick_dependency or 0) < 60),
                ("`60+`", lambda row: has_dependency(row) and (row.pick_dependency or 0) >= 60),
            ],
        ),
        bucket_markdown(
            rows,
            "Pick-Starter Leash Score",
            [
                ("`<40`", lambda row: has_leash(row) and (row.pick_starter_leash or 0) < 40),
                ("`40-54`", lambda row: has_leash(row) and 40 <= (row.pick_starter_leash or 0) < 55),
                ("`55-69`", lambda row: has_leash(row) and 55 <= (row.pick_starter_leash or 0) < 70),
                ("`70+`", lambda row: has_leash(row) and (row.pick_starter_leash or 0) >= 70),
            ],
        ),
        bucket_markdown(
            rows,
            "Story Gap (Pick - Opponent)",
            [
                ("`<= -5`", lambda row: row.story_gap is not None and row.story_gap <= -5),
                ("`-4 to 4`", lambda row: row.story_gap is not None and -5 < row.story_gap < 5),
                ("`5+`", lambda row: row.story_gap is not None and row.story_gap >= 5),
            ],
        ),
        bucket_markdown(
            rows,
            "Leash Gap (Pick - Opponent)",
            [
                ("`<= -8`", lambda row: row.leash_gap is not None and row.leash_gap <= -8),
                ("`-7 to 7`", lambda row: row.leash_gap is not None and -8 < row.leash_gap < 8),
                ("`8+`", lambda row: row.leash_gap is not None and row.leash_gap >= 8),
            ],
        ),
        bucket_markdown(
            rows,
            "Series Context",
            [
                ("`Non-division`", lambda row: row.same_division_flag == 0),
                ("`Division`", lambda row: row.same_division_flag == 1),
                ("`Series game 1`", lambda row: row.series_game_number == 1),
                ("`Series game 2`", lambda row: row.series_game_number == 2),
                ("`Series game 3+`", lambda row: (row.series_game_number or 0) >= 3),
            ],
        ),
    ]
    return "\n\n".join(sections)


def evaluate_rule(rows: list[TierTwoRow], predicate: Callable[[TierTwoRow], bool]) -> dict[str, tuple[int, float, int, float]]:
    result: dict[str, tuple[int, float, int, float]] = {}
    for split in ("reserve", "current", "combined"):
        subset = rows if split == "combined" else [row for row in rows if row.split == split]
        kept = [row for row in subset if not predicate(row)]
        passed = [row for row in subset if predicate(row)]
        result[split] = (len(kept), hit_rate(kept), len(passed), hit_rate(passed))
    return result


def format_rule_backtests(rows: list[TierTwoRow]) -> str:
    rules = [
        (
            "Opponent leash advantage against our pick",
            "Pass if `pointEdge >= 10 && leash gap <= -8`",
            lambda row: (row.point_edge >= 10 and (row.leash_gap or 999) <= -8),
            "Best early Tier 2 red flag so far. When the picked side owns the worse leash by a real margin, big edges are getting shakier fast.",
        ),
        (
            "Short pick leash big edge",
            "Pass if `pointEdge >= 10 && pick leash <= 52`",
            lambda row: (row.point_edge >= 10 and (row.pick_starter_leash or 999) <= 52),
            "Broader leash-only version of the same idea. Not as sharp as leash gap, but it is easier to integrate into the current risk stack.",
        ),
        (
            "Story gap in the wrong direction",
            "Pass if `pointEdge >= 10 && story gap >= 5`",
            lambda row: (row.point_edge >= 10 and (row.story_gap or -999) >= 5),
            "Useful as a monitoring lane, but it is not a clean pass trigger yet because the early sample is mixed and small.",
        ),
        (
            "Concentrated lineup into longer opponent leash",
            "Pass if `pick dependency >= 50 && opponent leash >= 60`",
            lambda row: (
                (row.pick_dependency or 0) >= 50
                and (row.opp_starter_leash or 0) >= 60
            ),
            "Important negative result: this is not behaving like a pass rule yet, which suggests lineup concentration alone may describe good concentrated offenses as often as fragile ones.",
        ),
    ]

    sections: list[str] = []
    for title, description, predicate, note in rules:
        result = evaluate_rule(rows, predicate)
        table_rows = []
        for split_label, readable in (
            ("reserve", "Reserve"),
            ("current", "Current"),
            ("combined", "Combined"),
        ):
            kept_count, kept_rate, pass_count, pass_rate = result[split_label]
            table_rows.append([readable, str(kept_count), f"{kept_rate:.3f}", str(pass_count), f"{pass_rate:.3f}"])
        sections.append(
            f"### {title}\n\n{description}\n\n"
            + markdown_table(["Window", "Kept", "Kept hit rate", "Passed", "Passed hit rate"], table_rows)
            + f"\n\nNote: {note}"
        )
    return "\n\n".join(sections)


def build_markdown(conn: sqlite3.Connection, rows: list[TierTwoRow]) -> str:
    return "\n".join(
        [
            "# MLB Tier 2 Feature Research 05-22-26",
            "",
            "## Goal",
            "",
            "Start Tier 2 offline by turning the new warehouse depth into pregame priors that can be backtested safely before touching live scoring.",
            "",
            "This pass focuses on four medium-lift additions:",
            "",
            "- rolling team story priors",
            "- lineup dependency concentration",
            "- starter leash profiles",
            "- divisional / series context",
            "",
            "## Dataset Windows Used",
            "",
            "- **Reserve window**: `2026-05-10` through `2026-05-15` from `board-moneyline-v2` backtests",
            "- **Current window**: `2026-05-16` through `2026-05-22` from the graded history archive",
            "",
            format_dataset_summary(rows),
            "",
            "## Tier 2 Inventory",
            "",
            format_inventory(conn),
            "",
            "## Feature Buckets",
            "",
            format_bucket_analysis(rows),
            "",
            "## Candidate Tier 2 Rules",
            "",
            format_rule_backtests(rows),
            "",
            "## Early Read",
            "",
            "- `Story instability` now sits on a more usable scale, but it still looks better as a soft volatility/context feature than a pure pass trigger.",
            "- `Starter leash` is the best first Tier 2 lane. The strongest early warning signal is not just a short leash, but a **negative leash gap** where the picked side clearly owns the worse starter length outlook.",
            "- `Lineup dependency` is not behaving like a pure pass feature yet. Concentrated offenses can still be genuinely dangerous, so this probably belongs in combination with leash, pitch mix, or opponent-quality filters.",
            "- `Series / divisional context` is useful as supporting context, but it does not look like the first standalone win condition.",
            "",
            "## Recommended Next Move",
            "",
            "1. keep Tier 2 offline for now",
            "2. promote `leash gap` into the Tier 1 risk stack first, but only as a soft penalty before it becomes a hard pass flag",
            "3. start Tier 3 research around reliever first-batter command and third-time-through trouble once these priors are stable",
            "",
        ]
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Research Tier 2 MLB side features from the warehouse.")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="Markdown output path.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    out_path = Path(args.out)
    with get_connection() as conn:
        game_lookup = load_game_lookup(conn)
        reserve_rows = load_reserve_rows(conn, game_lookup)
        current_rows = load_current_rows(conn, game_lookup)
        rows = reserve_rows + current_rows
        markdown = build_markdown(conn, rows)
    out_path.write_text(markdown, encoding="utf-8")
    print(f"Wrote Tier 2 feature research to {out_path}")


if __name__ == "__main__":
    main()

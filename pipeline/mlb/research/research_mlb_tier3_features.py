#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_OUT = ROOT / "development-docs" / "tier3-feature-research-052326.md"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def pct(value: float | None) -> str:
    return f"{value * 100:.1f}%" if value is not None else "n/a"


def num(value: float | None, digits: int = 1) -> str:
    return f"{value:.{digits}f}" if value is not None else "n/a"


def fetch_scalar(conn: sqlite3.Connection, sql: str) -> int:
    return int(conn.execute(sql).fetchone()[0])


def load_reliever_first_batter_rows(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute(
        """
        WITH reliever_entries AS (
          SELECT game_pk, game_date, team_name, opponent_name, pitcher_id, pitcher_name, entry_order
          FROM mlb_pitcher_appearances
          WHERE pitcher_role = 'reliever'
            AND pitcher_id IS NOT NULL
        ),
        first_pa AS (
          SELECT
            re.game_pk,
            re.game_date,
            re.team_name,
            re.opponent_name,
            re.pitcher_id,
            re.pitcher_name,
            re.entry_order,
            MIN(pa.at_bat_index) AS at_bat_index
          FROM reliever_entries re
          JOIN mlb_plate_appearances pa
            ON pa.game_pk = re.game_pk
           AND pa.pitcher_id = re.pitcher_id
          GROUP BY
            re.game_pk,
            re.game_date,
            re.team_name,
            re.opponent_name,
            re.pitcher_id,
            re.pitcher_name,
            re.entry_order
        ),
        pitch_rollup AS (
          SELECT
            game_pk,
            at_bat_index,
            AVG(CASE WHEN is_pitch = 1 THEN CASE WHEN is_ball = 1 THEN 1.0 ELSE 0 END END) AS ball_rate,
            MAX(CASE WHEN pitch_number = 1 AND is_ball = 1 THEN 1 ELSE 0 END) AS first_pitch_ball_flag,
            MAX(CASE WHEN pitch_number = 1 AND is_strike = 1 THEN 1 ELSE 0 END) AS first_pitch_strike_flag
          FROM mlb_pitch_events
          GROUP BY game_pk, at_bat_index
        ),
        first_batter AS (
          SELECT
            fp.pitcher_id,
            fp.pitcher_name,
            fp.team_name,
            fp.opponent_name,
            fp.game_date,
            pa.event_type,
            pa.event,
            pa.description,
            pa.is_out,
            pa.is_scoring_play,
            pa.run_delta,
            pr.ball_rate,
            pr.first_pitch_ball_flag,
            pr.first_pitch_strike_flag,
            CASE WHEN pa.is_out = 0 THEN 1 ELSE 0 END AS reached_flag,
            CASE
              WHEN lower(COALESCE(pa.event_type, '')) IN ('walk', 'intent_walk', 'hit_by_pitch') THEN 1
              ELSE 0
            END AS free_pass_flag
          FROM first_pa fp
          JOIN mlb_plate_appearances pa
            ON pa.game_pk = fp.game_pk
           AND pa.at_bat_index = fp.at_bat_index
          LEFT JOIN pitch_rollup pr
            ON pr.game_pk = fp.game_pk
           AND pr.at_bat_index = fp.at_bat_index
        )
        SELECT
          pitcher_id,
          pitcher_name,
          COUNT(*) AS entries,
          AVG(first_pitch_ball_flag) AS first_pitch_ball_rate,
          AVG(first_pitch_strike_flag) AS first_pitch_strike_rate,
          AVG(ball_rate) AS ball_rate,
          AVG(reached_flag) AS reached_rate,
          AVG(free_pass_flag) AS free_pass_rate,
          AVG(is_scoring_play) AS scoring_play_rate,
          AVG(run_delta) AS run_delta_per_entry,
          AVG(CASE WHEN lower(COALESCE(event_type, '')) = 'strikeout' THEN 1.0 ELSE 0.0 END) AS strikeout_rate,
          (
            AVG(first_pitch_ball_flag) * 28
            + AVG(ball_rate) * 32
            + AVG(reached_flag) * 18
            + AVG(free_pass_flag) * 14
            + AVG(is_scoring_play) * 10
            + AVG(run_delta) * 6
          ) AS command_risk_index
        FROM first_batter
        GROUP BY pitcher_id, pitcher_name
        HAVING COUNT(*) >= 3
        ORDER BY command_risk_index DESC, entries DESC, pitcher_name
        """
    ).fetchall()


def load_reliever_first_batter_league_summary(conn: sqlite3.Connection) -> sqlite3.Row:
    return conn.execute(
        """
        WITH reliever_entries AS (
          SELECT game_pk, pitcher_id
          FROM mlb_pitcher_appearances
          WHERE pitcher_role = 'reliever'
            AND pitcher_id IS NOT NULL
        ),
        first_pa AS (
          SELECT re.game_pk, re.pitcher_id, MIN(pa.at_bat_index) AS at_bat_index
          FROM reliever_entries re
          JOIN mlb_plate_appearances pa
            ON pa.game_pk = re.game_pk
           AND pa.pitcher_id = re.pitcher_id
          GROUP BY re.game_pk, re.pitcher_id
        ),
        pitch_rollup AS (
          SELECT
            game_pk,
            at_bat_index,
            AVG(CASE WHEN is_pitch = 1 THEN CASE WHEN is_ball = 1 THEN 1.0 ELSE 0 END END) AS ball_rate,
            MAX(CASE WHEN pitch_number = 1 AND is_ball = 1 THEN 1 ELSE 0 END) AS first_pitch_ball_flag
          FROM mlb_pitch_events
          GROUP BY game_pk, at_bat_index
        ),
        first_batter AS (
          SELECT
            pa.is_out,
            pa.is_scoring_play,
            pa.run_delta,
            pr.ball_rate,
            pr.first_pitch_ball_flag,
            CASE
              WHEN lower(COALESCE(pa.event_type, '')) IN ('walk', 'intent_walk', 'hit_by_pitch') THEN 1
              ELSE 0
            END AS free_pass_flag
          FROM first_pa fp
          JOIN mlb_plate_appearances pa
            ON pa.game_pk = fp.game_pk
           AND pa.at_bat_index = fp.at_bat_index
          LEFT JOIN pitch_rollup pr
            ON pr.game_pk = fp.game_pk
           AND pr.at_bat_index = fp.at_bat_index
        )
        SELECT
          COUNT(*) AS entries,
          AVG(first_pitch_ball_flag) AS first_pitch_ball_rate,
          AVG(ball_rate) AS ball_rate,
          AVG(CASE WHEN is_out = 0 THEN 1.0 ELSE 0.0 END) AS reached_rate,
          AVG(free_pass_flag) AS free_pass_rate,
          AVG(is_scoring_play) AS scoring_play_rate,
          AVG(run_delta) AS run_delta_per_entry
        FROM first_batter
        """
    ).fetchone()


def load_third_time_rows(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute(
        """
        WITH starter_pas AS (
          SELECT
            pa.game_pk,
            pa.game_date,
            app.team_name,
            app.opponent_name,
            app.pitcher_id,
            app.pitcher_name,
            pa.at_bat_index,
            pa.event_type,
            pa.is_out,
            pa.is_scoring_play,
            pa.run_delta,
            ROW_NUMBER() OVER (
              PARTITION BY pa.game_pk, pa.pitcher_id
              ORDER BY pa.at_bat_index
            ) AS batter_seq
          FROM mlb_plate_appearances pa
          JOIN mlb_pitcher_appearances app
            ON app.game_pk = pa.game_pk
           AND app.pitcher_id = pa.pitcher_id
          WHERE app.pitcher_role = 'starter'
            AND pa.pitcher_id IS NOT NULL
        ),
        bucketed AS (
          SELECT
            pitcher_id,
            pitcher_name,
            CASE
              WHEN batter_seq <= 9 THEN 'first'
              WHEN batter_seq <= 18 THEN 'second'
              ELSE 'third'
            END AS trip_bucket,
            CASE WHEN is_out = 0 THEN 1 ELSE 0 END AS reached_flag,
            CASE WHEN lower(COALESCE(event_type, '')) = 'home_run' THEN 1 ELSE 0 END AS hr_flag,
            is_scoring_play,
            run_delta
          FROM starter_pas
        )
        SELECT
          pitcher_id,
          pitcher_name,
          SUM(CASE WHEN trip_bucket = 'first' THEN 1 ELSE 0 END) AS first_pa,
          AVG(CASE WHEN trip_bucket = 'first' THEN reached_flag * 1.0 END) AS first_reached_rate,
          AVG(CASE WHEN trip_bucket = 'first' THEN is_scoring_play * 1.0 END) AS first_scoring_play_rate,
          AVG(CASE WHEN trip_bucket = 'first' THEN run_delta * 1.0 END) AS first_run_delta,
          AVG(CASE WHEN trip_bucket = 'first' THEN hr_flag * 1.0 END) AS first_hr_rate,
          SUM(CASE WHEN trip_bucket = 'second' THEN 1 ELSE 0 END) AS second_pa,
          AVG(CASE WHEN trip_bucket = 'second' THEN reached_flag * 1.0 END) AS second_reached_rate,
          AVG(CASE WHEN trip_bucket = 'second' THEN is_scoring_play * 1.0 END) AS second_scoring_play_rate,
          AVG(CASE WHEN trip_bucket = 'second' THEN run_delta * 1.0 END) AS second_run_delta,
          AVG(CASE WHEN trip_bucket = 'second' THEN hr_flag * 1.0 END) AS second_hr_rate,
          SUM(CASE WHEN trip_bucket = 'third' THEN 1 ELSE 0 END) AS third_pa,
          AVG(CASE WHEN trip_bucket = 'third' THEN reached_flag * 1.0 END) AS third_reached_rate,
          AVG(CASE WHEN trip_bucket = 'third' THEN is_scoring_play * 1.0 END) AS third_scoring_play_rate,
          AVG(CASE WHEN trip_bucket = 'third' THEN run_delta * 1.0 END) AS third_run_delta,
          AVG(CASE WHEN trip_bucket = 'third' THEN hr_flag * 1.0 END) AS third_hr_rate
        FROM bucketed
        GROUP BY pitcher_id, pitcher_name
        HAVING SUM(CASE WHEN trip_bucket = 'third' THEN 1 ELSE 0 END) >= 6
        ORDER BY third_pa DESC, pitcher_name
        """
    ).fetchall()


def load_third_time_league_summary(conn: sqlite3.Connection) -> sqlite3.Row:
    return conn.execute(
        """
        WITH starter_pas AS (
          SELECT
            pa.pitcher_id,
            pa.at_bat_index,
            pa.event_type,
            pa.is_out,
            pa.is_scoring_play,
            pa.run_delta,
            ROW_NUMBER() OVER (
              PARTITION BY pa.game_pk, pa.pitcher_id
              ORDER BY pa.at_bat_index
            ) AS batter_seq
          FROM mlb_plate_appearances pa
          JOIN mlb_pitcher_appearances app
            ON app.game_pk = pa.game_pk
           AND app.pitcher_id = pa.pitcher_id
          WHERE app.pitcher_role = 'starter'
            AND pa.pitcher_id IS NOT NULL
        ),
        bucketed AS (
          SELECT
            CASE
              WHEN batter_seq <= 9 THEN 'first'
              WHEN batter_seq <= 18 THEN 'second'
              ELSE 'third'
            END AS trip_bucket,
            CASE WHEN is_out = 0 THEN 1 ELSE 0 END AS reached_flag,
            CASE WHEN lower(COALESCE(event_type, '')) = 'home_run' THEN 1 ELSE 0 END AS hr_flag,
            is_scoring_play,
            run_delta
          FROM starter_pas
        )
        SELECT
          trip_bucket,
          COUNT(*) AS pa_count,
          AVG(reached_flag * 1.0) AS reached_rate,
          AVG(is_scoring_play * 1.0) AS scoring_play_rate,
          AVG(run_delta * 1.0) AS run_delta,
          AVG(hr_flag * 1.0) AS hr_rate
        FROM bucketed
        GROUP BY trip_bucket
        ORDER BY CASE trip_bucket WHEN 'first' THEN 1 WHEN 'second' THEN 2 ELSE 3 END
        """
    ).fetchall()


def build_report() -> str:
    conn = get_connection()
    try:
        game_count = fetch_scalar(
            conn,
            "SELECT COUNT(*) FROM mlb_game_story_signals WHERE game_date BETWEEN '2026-05-09' AND '2026-05-22'",
        )
        plate_appearance_count = fetch_scalar(
            conn,
            "SELECT COUNT(*) FROM mlb_plate_appearances WHERE game_date BETWEEN '2026-05-09' AND '2026-05-22'",
        )
        pitch_event_count = fetch_scalar(
            conn,
            "SELECT COUNT(*) FROM mlb_pitch_events WHERE game_date BETWEEN '2026-05-09' AND '2026-05-22'",
        )

        reliever_league = load_reliever_first_batter_league_summary(conn)
        reliever_rows = load_reliever_first_batter_rows(conn)
        third_league = load_third_time_league_summary(conn)
        third_rows = load_third_time_rows(conn)
    finally:
        conn.close()

    reliever_table = markdown_table(
        ["Pitcher", "Entries", "1st-pitch ball", "Ball rate", "Reach", "Free pass", "Score play", "Command risk"],
        [
            [
                row["pitcher_name"],
                str(row["entries"]),
                pct(row["first_pitch_ball_rate"]),
                pct(row["ball_rate"]),
                pct(row["reached_rate"]),
                pct(row["free_pass_rate"]),
                pct(row["scoring_play_rate"]),
                num(row["command_risk_index"], 1),
            ]
            for row in reliever_rows[:12]
        ],
    )

    third_league_table = markdown_table(
        ["Trip", "PA", "Reach", "Score play", "Run delta", "HR rate"],
        [
            [
                row["trip_bucket"],
                str(row["pa_count"]),
                pct(row["reached_rate"]),
                pct(row["scoring_play_rate"]),
                num(row["run_delta"], 3),
                pct(row["hr_rate"]),
            ]
            for row in third_league
        ],
    )

    third_pitcher_rows: list[list[str]] = []
    for row in third_rows:
        first_two_reach = None
        first_two_scoring = None
        if row["first_reached_rate"] is not None and row["second_reached_rate"] is not None:
            first_two_reach = (row["first_reached_rate"] + row["second_reached_rate"]) / 2
        if row["first_scoring_play_rate"] is not None and row["second_scoring_play_rate"] is not None:
            first_two_scoring = (row["first_scoring_play_rate"] + row["second_scoring_play_rate"]) / 2

        reach_delta = None
        scoring_delta = None
        if first_two_reach is not None and row["third_reached_rate"] is not None:
            reach_delta = (row["third_reached_rate"] - first_two_reach) * 100
        if first_two_scoring is not None and row["third_scoring_play_rate"] is not None:
            scoring_delta = (row["third_scoring_play_rate"] - first_two_scoring) * 100

        third_pitcher_rows.append(
            [
                row["pitcher_name"],
                str(row["third_pa"]),
                pct(row["third_reached_rate"]),
                f"{reach_delta:+.1f} pts" if reach_delta is not None else "n/a",
                pct(row["third_scoring_play_rate"]),
                f"{scoring_delta:+.1f} pts" if scoring_delta is not None else "n/a",
                pct(row["third_hr_rate"]),
            ]
        )

    third_pitcher_table = markdown_table(
        ["Pitcher", "3rd-trip PA", "3rd-trip reach", "Reach delta", "3rd-trip score play", "Score-play delta", "3rd-trip HR"],
        third_pitcher_rows[:12],
    )

    return f"""# MLB Tier 3 Feature Research — May 23, 2026

## Scope
This pass opens the first Tier 3 warehouse lane without touching the live model yet. The target questions were:

1. What happens on a reliever's first batter after entry?
2. How different do starters look once they hit a third trip through the order?

Dataset coverage across `2026-05-09` through `2026-05-22`:

- Story-signal games: `{game_count}`
- Plate appearances: `{plate_appearance_count:,}`
- Pitch events: `{pitch_event_count:,}`

## Early read
- The reliever-entry lane is already useful because it lets us distinguish between arms who enter with strike-one / clean-command habits and arms who immediately spray balls or allow baserunners.
- The third-time-through lane is also promising because it gives us a cleaner reason to cap full-game sides that are really being carried by an early starter edge.
- Both features are much more about `when the game breaks` than about average talent, which is exactly the next layer we wanted.

## Reliever first-batter command
League baseline on the first batter after a reliever enters:

- First-pitch ball rate: `{pct(reliever_league["first_pitch_ball_rate"])}`
- Overall ball rate in that first plate appearance: `{pct(reliever_league["ball_rate"])}`
- Reach rate: `{pct(reliever_league["reached_rate"])}`
- Free-pass rate: `{pct(reliever_league["free_pass_rate"])}`
- Scoring-play rate: `{pct(reliever_league["scoring_play_rate"])}`

Highest-risk reliever first-batter command profiles so far:

{reliever_table}

## Third-time-through trouble
League shape by trip bucket:

{third_league_table}

Pitchers with the sharpest third-time-through exposure so far:

{third_pitcher_table}

## What this suggests
1. `Reliever first-batter command` is a real candidate for a late-game volatility feature.
   Teams facing high-risk first-entry relievers should get more comeback / over / late-prop live-ness.
2. `Third-time-through trouble` should eventually feed both:
   - full-game side confidence
   - first-five vs full-game split confidence
3. Neither feature should go live as a hard pass rule yet. Both need:
   - more dates
   - opponent-adjustment
   - validation against reserve and current windows

## Recommended next moves
1. Store a compact per-pitcher Tier 3 lookup for:
   - reliever first-batter command risk
   - starter third-time-through penalty
2. Add these only as offline backtest overlays first.
3. Promote to live scoring only if they improve both reserve and current windows without overfiring.
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=str(DEFAULT_OUT))
    args = parser.parse_args()

    report = build_report()
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(report, encoding="utf-8")
    print(f"Wrote Tier 3 research report to {output_path}")


if __name__ == "__main__":
    main()

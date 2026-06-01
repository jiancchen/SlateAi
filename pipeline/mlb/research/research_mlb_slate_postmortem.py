#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_DATE = "2026-05-23"
POSTMORTEM_ROOT = ROOT / "development-docs" / "mlb" / "postmortems"
FULL_NAMES = {
    "Braves": "Atlanta Braves",
    "Orioles": "Baltimore Orioles",
    "Red Sox": "Boston Red Sox",
    "Cubs": "Chicago Cubs",
    "Reds": "Cincinnati Reds",
    "Guardians": "Cleveland Guardians",
    "Rockies": "Colorado Rockies",
    "White Sox": "Chicago White Sox",
    "Tigers": "Detroit Tigers",
    "Astros": "Houston Astros",
    "Royals": "Kansas City Royals",
    "Angels": "Los Angeles Angels",
    "Dodgers": "Los Angeles Dodgers",
    "Marlins": "Miami Marlins",
    "Brewers": "Milwaukee Brewers",
    "Twins": "Minnesota Twins",
    "Mets": "New York Mets",
    "Yankees": "New York Yankees",
    "Athletics": "Athletics",
    "Phillies": "Philadelphia Phillies",
    "Pirates": "Pittsburgh Pirates",
    "Padres": "San Diego Padres",
    "Mariners": "Seattle Mariners",
    "Giants": "San Francisco Giants",
    "Cardinals": "St. Louis Cardinals",
    "Rays": "Tampa Bay Rays",
    "Rangers": "Texas Rangers",
    "Blue Jays": "Toronto Blue Jays",
    "Nationals": "Washington Nationals",
    "D-backs": "Arizona Diamondbacks",
    "Diamondbacks": "Arizona Diamondbacks",
}


@dataclass
class SideRow:
    game_title: str
    occurrence: int
    game_id: str
    away_team: str
    home_team: str
    predicted_team: str
    confidence: int
    model_edge: float
    market_probability: float
    market_is_favorite: bool
    market_is_underdog: bool
    actual_winner: str
    full_hit: bool
    first5_hit: bool
    first5_push: bool
    phase_path_label: str
    primary_story_label: str
    yrfi_pick: str
    yrfi_yes_pct: float
    actual_yrfi: bool
    yrfi_hit: bool
    runs_first1_for_pick: int
    runs_first3_for_pick: int
    runs_first5_for_pick: int
    scored_first1_for_pick: bool
    veto_count: int
    veto_reasons: list[str]
    veto_action: str
    protected_market_dog: bool


@dataclass
class PropRow:
    rank: int
    confidence: int
    player_name: str
    prop_type: str
    market_label: str
    hit_flag: bool
    actual_value: float
    result_label: str


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    body = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *body])


def default_postmortem_paths(date: str) -> tuple[Path, Path]:
    parsed = datetime.strptime(date, "%Y-%m-%d")
    date_slug = f"{parsed.strftime('%b').lower()}{parsed.day}"
    date_suffix = parsed.strftime("%m%d%y")
    return (
        POSTMORTEM_ROOT / f"{date_slug}-slate-postmortem-{date_suffix}.md",
        POSTMORTEM_ROOT / f"{date_slug}-chaos-followups-{date_suffix}.md",
    )


def pct(numerator: int, denominator: int) -> str:
    if denominator == 0:
        return "0.0%"
    return f"{(numerator / denominator) * 100:.1f}%"


def format_prediction_label(prediction_date: str) -> str:
    return datetime.strptime(prediction_date, "%Y-%m-%d").strftime("%B %-d")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def load_board_picks(prediction_date: str) -> list[dict]:
    legacy_board_path = ROOT / "data-private" / "predictions" / "mlb-sides" / f"{prediction_date}-board-v1.1.post-sanity.json"
    if legacy_board_path.exists():
        return load_json(legacy_board_path)["picks"]

    published_summary_path = ROOT / "published-data" / "slates" / prediction_date / "summary.json"
    if not published_summary_path.exists():
        raise FileNotFoundError(f"Missing board source for {prediction_date}: {legacy_board_path} or {published_summary_path}")

    summary_games = load_json(published_summary_path).get("games", [])
    picks: list[dict] = []
    for game in summary_games:
        if game.get("league") != "MLB":
            continue
        analysis = game.get("analysis") or {}
        participant = analysis.get("participant") or {}
        opponent = analysis.get("opponent") or {}
        projection = (analysis.get("mlbProjection") or {})
        first_inning = projection.get("firstInning") or {}
        pick_name = participant.get("name")
        predicted_team = FULL_NAMES.get(str(pick_name), str(pick_name))
        away_team = FULL_NAMES.get(game["title"].split(" @ ")[0], game["title"].split(" @ ")[0])
        home_team = FULL_NAMES.get(game["title"].split(" @ ")[1], game["title"].split(" @ ")[1])
        picks.append(
            {
                "gameId": game.get("id"),
                "gameTitle": game.get("title"),
                "awayTeam": away_team,
                "homeTeam": home_team,
                "pick": predicted_team,
                "predictedTeam": predicted_team,
                "confidence": analysis.get("confidence") or 0,
                "modelEdge": analysis.get("modelEdge") or 0,
                "marketProbability": participant.get("impliedProbability"),
                "marketIsFavorite": bool(
                    participant.get("impliedProbability") is not None
                    and opponent.get("impliedProbability") is not None
                    and participant.get("impliedProbability") > opponent.get("impliedProbability")
                ),
                "marketIsUnderdog": bool(
                    participant.get("impliedProbability") is not None
                    and opponent.get("impliedProbability") is not None
                    and participant.get("impliedProbability") < opponent.get("impliedProbability")
                ),
                "projection": {
                    "firstInning": {
                        "pick": first_inning.get("pick"),
                        "yesProbabilityPct": first_inning.get("yesProbabilityPct")
                    }
                }
            }
        )
    return picks


def load_published_mlb_games(prediction_date: str) -> list[dict]:
    for summary_path in (
        ROOT / "published-data" / "slates" / prediction_date / "summary.json",
        ROOT / "web" / "public" / "data" / "slates" / prediction_date / "summary.json",
    ):
        if summary_path.exists():
            return [
                game
                for game in load_json(summary_path).get("games", [])
                if game.get("league") == "MLB"
            ]
    return []


def number_or_none(value: object) -> float | None:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def total_hit(lean: object, line: object, actual: object) -> bool | None:
    line_value = number_or_none(line)
    actual_value = number_or_none(actual)
    lean_text = str(lean or "").casefold()
    if line_value is None or actual_value is None or lean_text in ("", "pass"):
        return None
    if lean_text.startswith("over"):
        return actual_value > line_value
    if lean_text.startswith("under"):
        return actual_value < line_value
    return None


def build_value_board_audit(prediction_date: str, side_rows: list[SideRow], settled_props: list[PropRow]) -> list[list[str]]:
    games = load_published_mlb_games(prediction_date)
    conn = get_connection()
    side_backtests = {
        str(row["game_id"]): row
        for row in conn.execute(
            """
            SELECT
              game_id,
              hit_full_game,
              hit_first5,
              predicted_runs_final,
              opponent_runs_final,
              predicted_runs_first5,
              opponent_runs_first5
            FROM mlb_side_backtests
            WHERE prediction_date = ?
            """,
            (prediction_date,),
        ).fetchall()
    }

    value_ml_rows: list[bool] = []
    full_total_rows: list[bool] = []
    first5_total_rows: list[bool] = []
    for game in games:
        game_id = str(game.get("id") or "")
        row = side_backtests.get(game_id)
        if not row:
            continue

        analysis = game.get("analysis") or {}
        participant = analysis.get("participant") or {}
        confidence = number_or_none(analysis.get("confidence"))
        market_pct = number_or_none(participant.get("impliedProbability"))
        if market_pct is not None:
            market_pct *= 100
        if confidence is not None and market_pct is not None and confidence - market_pct >= 7:
            value_ml_rows.append(bool(row["hit_full_game"]))

        projection = analysis.get("mlbProjection") or {}
        totals = projection.get("totals") or {}
        actual_full = (number_or_none(row["predicted_runs_final"]) or 0) + (number_or_none(row["opponent_runs_final"]) or 0)
        actual_first5 = (number_or_none(row["predicted_runs_first5"]) or 0) + (number_or_none(row["opponent_runs_first5"]) or 0)

        full_lean = (totals.get("fullGame") or {}).get("lean")
        full_result = total_hit(full_lean, projection.get("postedTotal"), actual_full)
        if full_result is not None:
            full_total_rows.append(full_result)

        first5_lean = (totals.get("first5") or {}).get("lean")
        first5_result = total_hit(first5_lean, (totals.get("derivedFirst5TotalLine")), actual_first5)
        if first5_result is not None:
            first5_total_rows.append(first5_result)

    hr_row = conn.execute(
        """
        SELECT COUNT(*) AS total, SUM(hit_flag) AS hits
        FROM mlb_home_run_backtests
        WHERE prediction_date = ?
        """,
        (prediction_date,),
    ).fetchone()
    hr_total = int(hr_row["total"] or 0) if hr_row else 0
    hr_hits = int(hr_row["hits"] or 0) if hr_row else 0

    batting_impact_rows = [
        row
        for row in settled_props
        if row.prop_type in ("singles", "walks", "rbi", "hits", "runs", "hitRunRbi", "hitsRunsRbis")
    ]
    strikeout_rows = [row for row in settled_props if row.prop_type == "pitcherStrikeouts"]
    total_base_rows = [row for row in settled_props if row.prop_type == "totalBases"]

    def lane(label: str, hits: int, total: int, read: str) -> list[str]:
        return [label, f"{hits}/{total}", pct(hits, total), read]

    return [
        lane("ML value", sum(value_ml_rows), len(value_ml_rows), "Only one true side-price value row; it hit, but the board did not have enough real ML volume."),
        lane("F5 ML", sum(1 for row in side_rows if row.first5_hit), len(side_rows), "Decent directionally, but several misses were dead early."),
        lane("Full-game totals", sum(full_total_rows), len(full_total_rows), "Broken for the slate; should have been hidden or research-only."),
        lane("F5 totals", sum(first5_total_rows), len(first5_total_rows), "Also weak; do not surface as value until recalibrated."),
        lane("First inning", sum(1 for row in side_rows if row.yrfi_hit), len(side_rows), "Timing model lagged the dead-early shape."),
        lane("Total bases", sum(1 for row in total_base_rows if row.hit_flag), len(total_base_rows), "Best prop lane, but too concentrated in the same fragile over market."),
        lane("Strikeout O/U", sum(1 for row in strikeout_rows if row.hit_flag), len(strikeout_rows), "Grading now respects unders; viable, but not a blind core lane."),
        lane("Batting impact", sum(1 for row in batting_impact_rows if row.hit_flag), len(batting_impact_rows), "Singles/RBI/walks were the biggest live-board trap."),
        lane("HR", hr_hits, hr_total, "Still lottery/research-only at this hit rate."),
    ]


def build_side_rows(prediction_date: str) -> tuple[list[SideRow], dict[str, int | list[str] | bool]]:
    veto_path = ROOT / "data-private" / "predictions" / "mlb-sides" / f"{prediction_date}-veto-artifact.json"
    board = load_board_picks(prediction_date)
    veto = load_json(veto_path)["picks"]

    conn = get_connection()
    actual_games: dict[tuple[str, str], list[sqlite3.Row]] = defaultdict(list)
    for row in conn.execute(
        """
        SELECT game_pk, away_team, home_team, away_score, home_score
        FROM mlb_games
        WHERE game_date = ? AND away_score IS NOT NULL AND home_score IS NOT NULL
        ORDER BY game_pk
        """,
        (prediction_date,),
    ).fetchall():
        actual_games[(str(row["away_team"]), str(row["home_team"]))].append(row)

    phase_rows = {
        (int(row["game_pk"]), str(row["team_name"])): row
        for row in conn.execute(
            """
            SELECT
              game_pk,
              team_name,
              runs_first1,
              runs_first3,
              runs_first5,
              scored_first_inning_flag,
              won_first5_flag,
              first5_push_flag,
              phase_path_label
            FROM mlb_phase_outcomes_daily
            WHERE game_date = ?
            """,
            (prediction_date,),
        ).fetchall()
    }
    story_rows = {
        int(row["game_pk"]): str(row["primary_story_label"] or "unknown")
        for row in conn.execute(
            "SELECT game_pk, primary_story_label FROM mlb_game_story_labels WHERE game_date = ?",
            (prediction_date,),
        ).fetchall()
    }

    occurrence_counter: dict[tuple[str, str], int] = defaultdict(int)
    side_rows: list[SideRow] = []
    duplicate_game_ids = [game_id for game_id, count in Counter(pick["gameId"] for pick in board).items() if count > 1]

    for index, pick in enumerate(board):
        matchup_key = (str(pick["awayTeam"]), str(pick["homeTeam"]))
        occurrence_counter[matchup_key] += 1
        occurrence = occurrence_counter[matchup_key]
        game_row = actual_games[matchup_key][occurrence - 1]
        game_pk = int(game_row["game_pk"])
        away_score = int(game_row["away_score"])
        home_score = int(game_row["home_score"])
        actual_winner = str(pick["awayTeam"] if away_score > home_score else pick["homeTeam"])

        predicted_phase = phase_rows[(game_pk, str(pick["predictedTeam"]))]
        away_phase = phase_rows[(game_pk, str(pick["awayTeam"]))]
        home_phase = phase_rows[(game_pk, str(pick["homeTeam"]))]
        actual_yrfi = bool(int(away_phase["scored_first_inning_flag"] or 0) or int(home_phase["scored_first_inning_flag"] or 0))

        veto_pick = veto[index]
        side_rows.append(
            SideRow(
                game_title=str(pick["gameTitle"]),
                occurrence=occurrence,
                game_id=str(pick["gameId"]),
                away_team=str(pick["awayTeam"]),
                home_team=str(pick["homeTeam"]),
                predicted_team=str(pick["predictedTeam"]),
                confidence=int(pick["confidence"] or 0),
                model_edge=float(pick["modelEdge"] or 0.0),
                market_probability=float(pick["marketProbability"] or 0.0),
                market_is_favorite=bool(veto_pick.get("pickIsMarketFavorite")),
                market_is_underdog=bool(veto_pick.get("pickIsMarketUnderdog")),
                actual_winner=actual_winner,
                full_hit=actual_winner == str(pick["predictedTeam"]),
                first5_hit=bool(int(predicted_phase["won_first5_flag"] or 0)),
                first5_push=bool(int(predicted_phase["first5_push_flag"] or 0)),
                phase_path_label=str(predicted_phase["phase_path_label"] or "unknown"),
                primary_story_label=story_rows.get(game_pk, "unknown"),
                yrfi_pick=str(pick["projection"]["firstInning"]["pick"]),
                yrfi_yes_pct=float(pick["projection"]["firstInning"]["yesProbabilityPct"] or 0.0),
                actual_yrfi=actual_yrfi,
                yrfi_hit=(str(pick["projection"]["firstInning"]["pick"]) == "YRFI") == actual_yrfi,
                runs_first1_for_pick=int(predicted_phase["runs_first1"] or 0),
                runs_first3_for_pick=int(predicted_phase["runs_first3"] or 0),
                runs_first5_for_pick=int(predicted_phase["runs_first5"] or 0),
                scored_first1_for_pick=bool(int(predicted_phase["scored_first_inning_flag"] or 0)),
                veto_count=int(veto_pick["vetoCount"] or 0),
                veto_reasons=[str(reason) for reason in veto_pick.get("vetoReasons", [])],
                veto_action=str(veto_pick["recommendedAction"]),
                protected_market_dog=bool(veto_pick.get("protectedMarketDogFlag")),
            )
        )

    imported_prediction_count = conn.execute(
        """
        SELECT COUNT(*)
        FROM mlb_side_predictions
        WHERE prediction_date = ? AND model_name = 'board-moneyline-v1.1-sanity'
        """,
        (prediction_date,),
    ).fetchone()[0]
    graded_backtest_count = conn.execute(
        """
        SELECT COUNT(*)
        FROM mlb_side_backtests
        WHERE prediction_date = ? AND model_name = 'board-moneyline-v1.1-sanity'
        """,
        (prediction_date,),
    ).fetchone()[0]
    history_day_file_exists = (ROOT / "data-private" / "history" / f"mlb-results-{prediction_date}.jsonl").exists()

    infra = {
        "board_pick_count": len(board),
        "duplicate_game_ids": duplicate_game_ids,
        "imported_prediction_count": imported_prediction_count,
        "graded_backtest_count": graded_backtest_count,
        "history_day_file_exists": history_day_file_exists,
    }
    return side_rows, infra


def load_prop_rows(prediction_date: str) -> tuple[list[PropRow], list[PropRow]]:
    journal_path = ROOT / "data-private" / "history" / f"mlb-results-{prediction_date}.jsonl"
    if journal_path.exists():
        settled_rows: list[PropRow] = []
        for line in journal_path.read_text().splitlines():
            if not line.strip():
                continue
            row = json.loads(line)
            if row.get("marketType") != "playerProp":
                continue
            result = row.get("result") or {}
            hit_flag = result.get("hit")
            if hit_flag not in (True, False):
                continue
            settled_rows.append(
                PropRow(
                    rank=int(row.get("confidenceRank") or row.get("rank") or 999),
                    confidence=int(row.get("confidence") or 0),
                    player_name=str(row.get("playerName") or ""),
                    prop_type=str(row.get("propType") or ""),
                    market_label=str(row.get("marketLabel") or row.get("predictedPick") or ""),
                    hit_flag=bool(hit_flag),
                    actual_value=float(result.get("actualValue") or 0.0),
                    result_label=str(row.get("resultJustification") or ""),
                )
            )
        top_eight = sorted(settled_rows, key=lambda row: (-row.confidence, row.rank))[:8]
        return settled_rows, top_eight

    props_path = ROOT / "data-private" / "predictions" / "mlb-player-props" / f"{prediction_date}-player-props.json"
    props = load_json(props_path)["picks"]

    conn = get_connection()
    backtests = {
        (str(row["game_id"]), int(row["player_id"]), str(row["prop_type"])): row
        for row in conn.execute(
            """
            SELECT game_id, player_id, prop_type, hit_flag, actual_value, result_label
            FROM mlb_prop_backtests
            WHERE prediction_date = ?
            """,
            (prediction_date,),
        ).fetchall()
    }

    settled_rows: list[PropRow] = []
    for pick in props:
        key = (str(pick["gameId"]), int(pick["playerId"]), str(pick["propType"]))
        backtest = backtests.get(key)
        if backtest is None:
            continue
        settled_rows.append(
            PropRow(
                rank=int(pick["rank"]),
                confidence=int(pick["confidence"]),
                player_name=str(pick["playerName"]),
                prop_type=str(pick["propType"]),
                market_label=str(pick["marketLabel"]),
                hit_flag=bool(int(backtest["hit_flag"] or 0)),
                actual_value=float(backtest["actual_value"] or 0.0),
                result_label=str(backtest["result_label"]),
            )
        )
    top_eight = sorted(settled_rows, key=lambda row: (-row.confidence, row.rank))[:8]
    return settled_rows, top_eight


def build_postmortem_markdown(prediction_date: str, side_rows: list[SideRow], settled_props: list[PropRow], top_props: list[PropRow], infra: dict) -> str:
    pretty_label = format_prediction_label(prediction_date)
    total_games = len(side_rows)
    full_hits = sum(1 for row in side_rows if row.full_hit)
    first5_hits = sum(1 for row in side_rows if row.first5_hit)
    first5_pushes = sum(1 for row in side_rows if row.first5_push)
    yrfi_hits = sum(1 for row in side_rows if row.yrfi_hit)

    high_conf_rows = [row for row in side_rows if row.confidence >= 60]
    elite_conf_rows = [row for row in side_rows if row.confidence >= 70]
    market_dogs = [row for row in side_rows if row.market_is_underdog]
    market_favorites = [row for row in side_rows if row.market_is_favorite]
    pass_rows = [row for row in side_rows if row.veto_action == "Pass"]
    eligible_rows = [row for row in side_rows if row.veto_action == "Eligible"]
    miss_rows = [row for row in side_rows if not row.full_hit]
    yrfi_miss_rows = [row for row in side_rows if not row.yrfi_hit]

    phase_counter = Counter(row.phase_path_label for row in miss_rows)
    story_counter = Counter(row.primary_story_label for row in side_rows)
    title_counts = Counter(row.game_title for row in side_rows)
    top_prop_market_counter = Counter(row.market_label for row in top_props)
    top_prop_market_label, top_prop_market_count = top_prop_market_counter.most_common(1)[0] if top_prop_market_counter else ("none", 0)

    prop_type_counter: dict[str, tuple[int, int]] = {}
    for prop_type in sorted({row.prop_type for row in settled_props}):
        bucket = [row for row in settled_props if row.prop_type == prop_type]
        prop_type_counter[prop_type] = (sum(1 for row in bucket if row.hit_flag), len(bucket))
    value_board_audit = build_value_board_audit(prediction_date, side_rows, settled_props)

    team_scoreless_first3 = get_connection().execute(
        """
        SELECT COUNT(*)
        FROM mlb_phase_outcomes_daily
        WHERE game_date = ? AND scoreless_first3_flag = 1
        """,
        (prediction_date,),
    ).fetchone()[0]
    team_dead_early = get_connection().execute(
        """
        SELECT COUNT(*)
        FROM mlb_phase_outcomes_daily
        WHERE game_date = ? AND phase_path_label = 'dead_early_loss'
        """,
        (prediction_date,),
    ).fetchone()[0]
    starter_crack_count = get_connection().execute(
        """
        SELECT COUNT(*)
        FROM mlb_phase_outcomes_daily
        WHERE game_date = ? AND phase_path_label = 'starter_crack_loss'
        """,
        (prediction_date,),
    ).fetchone()[0]

    side_table = markdown_table(
        ["Game", "Pick", "FG", "F5", "1st", "Conf", "Edge", "Path"],
        [
            [
                f"{row.game_title} #{row.occurrence}" if title_counts[row.game_title] > 1 else row.game_title,
                row.predicted_team,
                "Hit" if row.full_hit else "Miss",
                "Hit" if row.first5_hit else ("Push" if row.first5_push else "Miss"),
                "Hit" if row.yrfi_hit else "Miss",
                str(row.confidence),
                f"{row.model_edge:.1f}",
                row.phase_path_label,
            ]
            for row in side_rows
        ],
    )

    yrfi_table = markdown_table(
        ["Game", "Model", "Yes%", "Actual", "Pick 1st", "Pick 3rd"],
        [
            [
                f"{row.game_title} #{row.occurrence}" if title_counts[row.game_title] > 1 else row.game_title,
                row.yrfi_pick,
                f"{row.yrfi_yes_pct:.1f}",
                "YRFI" if row.actual_yrfi else "NRFI",
                str(row.runs_first1_for_pick),
                str(row.runs_first3_for_pick),
            ]
            for row in yrfi_miss_rows
        ],
    )

    prop_table = markdown_table(
        ["Rank", "Player", "Market", "Hit", "Actual"],
        [
            [
                str(row.rank),
                row.player_name,
                row.market_label,
                "Hit" if row.hit_flag else "Miss",
                f"{row.actual_value:.1f}",
            ]
            for row in top_props
        ],
    )
    side_import_ok = infra["imported_prediction_count"] == infra["board_pick_count"]
    side_grade_ok = infra["graded_backtest_count"] == infra["board_pick_count"]
    pipeline_footer = (
        "This closeout is training-ready for the side lane; keep the health checks in place so a future miss fails loudly."
        if side_import_ok and side_grade_ok and infra["history_day_file_exists"] and not infra["duplicate_game_ids"]
        else "Any duplicate matchup slug or skipped side-import path still breaks part of the daily audit chain, even if the raw outcomes are present."
    )

    return f"""# {pretty_label} MLB Postmortem

## Slate snapshot
- Side board (`board-moneyline-v1.1.post-sanity`): `{full_hits}/{total_games}` = `{pct(full_hits, total_games)}`
- Raw first-5 lean from the same board: `{first5_hits}/{total_games}` = `{pct(first5_hits, total_games)}` with `{first5_pushes}` pushes
- First-inning lane from the original board file: `{yrfi_hits}/{total_games}` = `{pct(yrfi_hits, total_games)}`
- `60+` confidence sides: `{sum(1 for row in high_conf_rows if row.full_hit)}/{len(high_conf_rows)}` = `{pct(sum(1 for row in high_conf_rows if row.full_hit), len(high_conf_rows))}`
- `70+` confidence sides: `{sum(1 for row in elite_conf_rows if row.full_hit)}/{len(elite_conf_rows)}` = `{pct(sum(1 for row in elite_conf_rows if row.full_hit), len(elite_conf_rows))}`
- Market dogs: `{sum(1 for row in market_dogs if row.full_hit)}/{len(market_dogs)}` = `{pct(sum(1 for row in market_dogs if row.full_hit), len(market_dogs))}`
- Market favorites: `{sum(1 for row in market_favorites if row.full_hit)}/{len(market_favorites)}` = `{pct(sum(1 for row in market_favorites if row.full_hit), len(market_favorites))}`
- Top `8` settled props: `{sum(1 for row in top_props if row.hit_flag)}/{len(top_props)}` = `{pct(sum(1 for row in top_props if row.hit_flag), len(top_props))}`

## What the slate actually was
- `{story_counter['dead_bat_grind']}/{total_games}` games were labeled `dead_bat_grind`
- `{team_scoreless_first3}/28` team rows were scoreless through the first 3 innings
- `{team_dead_early}/28` team rows finished as `dead_early_loss`
- Only `{starter_crack_count}/28` team rows finished as `starter_crack_loss`

This was a dead-early, low-conversion slate. The board still spent too much energy on paper side strength and too little on whether the pick would actually score before the game script got away from it.

## Full value-board audit
{markdown_table(['Lane', 'Hit', 'Rate', 'Read'], value_board_audit)}

The full value board was worse than the headline side record. The side-price lane had one real value row and it hit, but the board also exposed totals, first-inning, HR, and batting-impact rows that were not ready to be bet. The next board needs to promote only lanes with settled bucket support and mark the rest as research/watch.

## Side board by game
{side_table}

## What killed the side board
- The board finished only `{full_hits}/{total_games}` even though the misses were mostly the same failure path repeated.
- `{phase_counter['dead_early_loss']}/{len(miss_rows)}` misses were `dead_early_loss`.
- The other miss paths were: {", ".join(f"`{label}` x{count}" for label, count in phase_counter.items() if label != 'dead_early_loss') or 'none'}.
- The winning paths were cleaner and narrower:
  - `starter_carried`: `{sum(1 for row in side_rows if row.full_hit and row.phase_path_label == 'starter_carried')}`
  - `jumped_early_hold`: `{sum(1 for row in side_rows if row.full_hit and row.phase_path_label == 'jumped_early_hold')}`
  - `late_comeback`: `{sum(1 for row in side_rows if row.full_hit and row.phase_path_label == 'late_comeback')}`

The blunt takeaway is that the slate did **not** punish us because the wrong starters melted late. It punished us because the predicted team simply never got going early enough.

## First-inning lane
Overall the original first-inning board finished `{yrfi_hits}/{total_games}`, but the misses were concentrated in the exact over-smoothed YRFI cases:

{yrfi_table}

What those misses have in common:
- every miss here was a YRFI that should have respected a quieter early shape
- several of them still had runs by the 3rd inning, which means the bug was **timing**, not total offense
- this is why same-series dead-early suppression and smaller pitcher-sample shrinkage had to get added after the slate

## Props
Overall settled tracked props by lane:
{markdown_table(['Prop type', 'Hits', 'Settled', 'Hit rate'], [[prop_type, str(hits), str(total), pct(hits, total)] for prop_type, (hits, total) in prop_type_counter.items()])}

Top `8` settled props:
{prop_table}

The ugly part is the concentration:
- the most common top-`8` market was `{top_prop_market_label}` (`{top_prop_market_count}/8`)
- the top `8` settled props went `{sum(1 for row in top_props if row.hit_flag)}/{len(top_props)}`
- the model was effectively repeating the same fragile market with fake precision

## Research-only veto artifact
- `Pass` calls: `{sum(1 for row in pass_rows if row.full_hit)}/{len(pass_rows)}` = `{pct(sum(1 for row in pass_rows if row.full_hit), len(pass_rows))}`
- `Eligible` calls: `{sum(1 for row in eligible_rows if row.full_hit)}/{len(eligible_rows)}` = `{pct(sum(1 for row in eligible_rows if row.full_hit), len(eligible_rows))}`

What that means:
- the current veto layer is not promotable yet
- it needs to be judged by the actual `Pass` vs `Eligible` buckets above, not by blanket suppression

So the veto idea is right, but the current flags are still too blunt to be used as live gates.

## Pipeline coverage check
- `data-private/history/mlb-results-{prediction_date}.jsonl` was {"" if infra['history_day_file_exists'] else "**not **"}written by closeout
- the board file contains duplicate `gameId` values: `{", ".join(infra['duplicate_game_ids']) if infra['duplicate_game_ids'] else 'none'}`
- importing the {pretty_label} side board created `{infra['imported_prediction_count']}` rows in `mlb_side_predictions` for `{infra['board_pick_count']}` board picks
- the side grading path has `{infra['graded_backtest_count']}` rows in `mlb_side_backtests` for this model/date

{pipeline_footer}

## Bottom line
- This was not a “market was weird” day so much as a **dead-early, low-conversion** day that the board failed to encode tightly enough.
- The side engine finished `{full_hits}/{total_games}` and still needs a better filter on which edges deserve live exposure.
- The first-inning lane finished `{yrfi_hits}/{total_games}` and still over-predicted YRFI in several quiet-first-inning spots.
- Props were the weakest live lane of all, especially the repeated `TB over 1.5` cluster.

The data from this slate is still useful, but as training data for `dead_early_loss`, timing suppression, and bookkeeping fixes, not as evidence that the current prediction engine is ready.
"""


def build_followup_markdown(prediction_date: str, side_rows: list[SideRow], infra: dict) -> str:
    pretty_label = format_prediction_label(prediction_date)
    dead_early_misses = [row for row in side_rows if (not row.full_hit and row.phase_path_label == "dead_early_loss")]
    yrfi_misses = [row for row in side_rows if not row.yrfi_hit]
    side_pipeline_ok = (
        infra["history_day_file_exists"]
        and infra["imported_prediction_count"] == infra["board_pick_count"]
        and infra["graded_backtest_count"] == infra["board_pick_count"]
        and not infra["duplicate_game_ids"]
    )
    bookkeeping_title = "Keep the bookkeeping health gate"
    bookkeeping_bottom = (
        "This path is now trustworthy for this day, but it needs to stay a hard pre-slate gate before any model lesson is applied."
        if side_pipeline_ok
        else "Until this path is trustworthy, every daily side report is partly manual."
    )
    side_prediction_reason = (
        f"side-prediction rows imported: `{infra['imported_prediction_count']}/{infra['board_pick_count']}`"
        if side_pipeline_ok
        else f"only `{infra['imported_prediction_count']}` side-prediction rows imported"
    )
    side_backtest_reason = (
        f"`mlb_side_backtests` rows: `{infra['graded_backtest_count']}/{infra['board_pick_count']}`"
        if side_pipeline_ok
        else f"`mlb_side_backtests` still shows `{infra['graded_backtest_count']}` rows for this day/model path"
    )
    return f"""# {pretty_label} Chaos Follow-ups

## What this slate says to build next

### P0: {bookkeeping_title}
- Give every MLB game a unique `gameId`, including doubleheaders.
- Make sure closeout writes `data-private/history/mlb-results-{prediction_date}.jsonl`.
- Make sure imported side boards actually flow into `mlb_side_backtests`.

Reason:
- today had `{infra['board_pick_count']}` board picks
- {side_prediction_reason}
- {side_backtest_reason}

{bookkeeping_bottom}

### P0: Turn `dead_early_loss` into a positive market lane
This slate produced `{len(dead_early_misses)}` side misses where the predicted team simply never got going:
- {", ".join(f"{row.game_title} #{row.occurrence}" if sum(1 for other in side_rows if other.game_title == row.game_title) > 1 else row.game_title for row in dead_early_misses)}

That should become a modelable lane:
- suppress side confidence
- prefer `NRFI`
- prefer `pass`
- later test `F5 under` / dead-early totals when the market data is clean enough

### P1: Stop pick-first, veto-later
Today showed the flaw again:
- a side gets printed because paper strength says yes
- then we add warnings
- then we end up with “pass” language wrapped around a side anyway

The next selection order should be:
1. find a real positive thesis
2. map it to the best market expression
3. only then allow a side

If no positive thesis exists, the game should stay blank.

### P1: Keep the first-inning lane, but only as a timing model
The original lane finished coin-flip, and every miss was the same kind of miss:
- YRFI on games that stayed scoreless in the first
- several of those games still scored by the third

So the first-inning model should focus on:
- series-local dead-early suppression
- team scores-in-1st vs team allows-in-1st
- tiny pitcher-sample shrinkage
- recent top-order conversion, not just broad first-5 pressure

That lane is still worth keeping because the mistakes are interpretable.

### P1: Kill the generic total-bases prop lane
The model treated `Over 1.5 total bases` like a core edge and repeated it.
That is not a lane; that is spam with confidence labels.

Immediate rule:
- retire generic TB overs from live use
- do not show them as “core” until a much narrower lane proves itself

### P2: Build reason-coded dog lanes
This slate was not just favorites. The board actually took dogs too, but it still did not know **why** a dog was live.

The next dog lanes should be explicit:
- opponent dead-early
- opponent traffic-no-conversion
- opponent chaos gap
- snapback pressure
- same-series suppression

No dog pick should exist without one of those reasons.

## Concrete next coding tasks
1. Fix unique `gameId` generation for doubleheaders.
2. Audit why side backtests are not being written even after import/grade.
3. Create a dedicated `dead_early_loss` research pass from this date's label set.
4. Add `dead_early_loss` and `quiet_first3` as first-class market selectors, not just warnings.
5. Strip hitter props down to research-only while we rebuild the lane by prop type.

## What to keep
- the chaos/state tables
- the mistake-shape layer
- the story/phase labels
- the first-inning profile tables

Those are still the good parts. The failure was not the data collection. The failure was the decision layer sitting on top of it.
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Write an MLB slate postmortem from the finished warehouse data.")
    parser.add_argument("--date", default=DEFAULT_DATE)
    parser.add_argument("--postmortem-out", default=None)
    parser.add_argument("--followup-out", default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    default_postmortem_out, default_followup_out = default_postmortem_paths(args.date)
    postmortem_out = Path(args.postmortem_out) if args.postmortem_out else default_postmortem_out
    followup_out = Path(args.followup_out) if args.followup_out else default_followup_out
    side_rows, infra = build_side_rows(args.date)
    settled_props, top_props = load_prop_rows(args.date)

    postmortem = build_postmortem_markdown(args.date, side_rows, settled_props, top_props, infra)
    followup = build_followup_markdown(args.date, side_rows, infra)

    postmortem_out.write_text(postmortem)
    followup_out.write_text(followup)
    print(f"Wrote {postmortem_out}")
    print(f"Wrote {followup_out}")


if __name__ == "__main__":
    main()

from __future__ import annotations

import hashlib
import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .common import MlbIdentityResolver, compact_json, stable_id, to_float, to_int, utc_now
from .game_feed import cache_valid_until
from .lineups import ensure_lineup_schema


SOURCE_LINEUPS = "mlb_lineups"
SOURCE_PROBABLES = "mlb_probables"
FAMILY_LINEUPS = "lineups"
FAMILY_PROBABLES = "probables"


@dataclass(frozen=True)
class RawLineupBoardDay:
    date: str
    board_path: Path | None
    payload: dict[str, Any]

    @property
    def meta(self) -> dict[str, Any]:
        meta = self.payload.get("meta") or {}
        return meta if isinstance(meta, dict) else {}

    @property
    def boards(self) -> dict[str, dict[str, Any]]:
        boards = self.payload.get("lineupBoardsByGameId") or {}
        return boards if isinstance(boards, dict) else {}


def read_json(path: Path) -> dict[str, Any]:
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def load_lineup_board_day(lineup_root: Path, date: str) -> RawLineupBoardDay:
    board_path = lineup_root / f"{date}-lineup-board.json"
    return RawLineupBoardDay(
        date=date,
        board_path=board_path if board_path.exists() else None,
        payload=read_json(board_path) if board_path.exists() else {},
    )


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sql_path(path: Path, root: Path) -> str:
    return str(path.relative_to(root))


def source_snapshot_id_for(source_name: str, local_path: str, content_hash: str) -> str:
    return f"mlb-{stable_id(source_name, local_path, content_hash, length=32)}"


def ensure_source_snapshot(
    con: sqlite3.Connection,
    *,
    repo_root: Path,
    file_path: Path,
    source_name: str,
    source_family: str,
    date: str,
    notes: dict[str, Any] | None = None,
) -> str:
    local_path = sql_path(file_path, repo_root)
    content_hash = sha256_file(file_path)
    snapshot_id = source_snapshot_id_for(source_name, local_path, content_hash)
    captured_at = utc_now()
    snapshot_notes = {
        "root": "data-private/lineups/mlb",
        "parser_module": "pipeline/sources/mlb/normalization/lineup_board.py",
        "source_family": source_family,
        "active_raw_to_typed_adapter": True,
        "requested_date": date,
        "size_bytes": file_path.stat().st_size,
        **(notes or {}),
    }
    con.execute(
        """
        insert into source_snapshots (
          source_snapshot_id, source_name, sport, source_url, local_path,
          captured_at, source_date, content_hash, content_type, status, notes
        ) values (?, ?, 'mlb', null, ?, ?, ?, ?, 'application/json', 'captured', ?)
        on conflict(source_snapshot_id) do update set
          source_name = excluded.source_name,
          local_path = excluded.local_path,
          captured_at = excluded.captured_at,
          source_date = excluded.source_date,
          content_hash = excluded.content_hash,
          content_type = excluded.content_type,
          status = excluded.status,
          notes = excluded.notes
        """,
        (
            snapshot_id,
            source_name,
            local_path,
            captured_at,
            date,
            content_hash,
            compact_json(snapshot_notes),
        ),
    )
    return snapshot_id


def split_title(title: Any) -> tuple[str | None, str | None]:
    text = str(title or "")
    if " @ " not in text:
        return None, None
    away, home = text.split(" @ ", 1)
    return away.strip() or None, home.strip() or None


def pitcher_payload(side_payload: dict[str, Any]) -> dict[str, Any]:
    pitcher = side_payload.get("opposingStarter") or {}
    return pitcher if isinstance(pitcher, dict) else {}


def player_payloads(side_payload: dict[str, Any]) -> list[dict[str, Any]]:
    lineup = side_payload.get("lineup") or []
    return [row for row in lineup if isinstance(row, dict)]


def lineup_status_for(raw_status: Any, lineup_size: int) -> str:
    if lineup_size >= 9:
        return "complete"
    if lineup_size > 0:
        return "partial"
    return "pending"


def upsert_lineup_player(
    con: sqlite3.Connection,
    resolver: MlbIdentityResolver,
    *,
    source_name: str,
    player: dict[str, Any],
) -> str | None:
    player_id = resolver.player_id_by_mlb_id(source_name, player.get("playerId"), player.get("name"))
    if not player_id:
        return None
    con.execute(
        """
        update players
        set bats = coalesce(?, bats),
            primary_position = coalesce(?, primary_position)
        where player_id = ?
        """,
        (player.get("bats"), player.get("position"), player_id),
    )
    return player_id


def upsert_probable_pitcher(
    con: sqlite3.Connection,
    resolver: MlbIdentityResolver,
    *,
    game_id: str,
    team_id: str,
    pitcher: dict[str, Any],
) -> int:
    pitcher_id = resolver.player_id_by_mlb_id(SOURCE_PROBABLES, pitcher.get("id"), pitcher.get("name"))
    if not pitcher_id:
        resolver.insert_unresolved(
            "mlb_probable_pitcher",
            SOURCE_PROBABLES,
            pitcher.get("id"),
            pitcher.get("name") or "unknown pitcher",
            {"game_id": game_id, "team_id": team_id, "pitcher": pitcher},
            "Could not map lineup-board opposing starter to canonical pitcher.",
        )
        return 0
    con.execute(
        """
        update players
        set throws = coalesce(?, throws)
        where player_id = ?
        """,
        (pitcher.get("hand"), pitcher_id),
    )
    con.execute(
        """
        insert into starting_pitchers (
          game_id, team_id, pitcher_id, confirmation_status, source_name, updated_at
        ) values (?, ?, ?, 'lineup_board_opposing_starter', ?, ?)
        on conflict(game_id, team_id, pitcher_id) do update set
          confirmation_status = excluded.confirmation_status,
          source_name = excluded.source_name,
          updated_at = excluded.updated_at
        """,
        (game_id, team_id, pitcher_id, SOURCE_PROBABLES, utc_now()),
    )
    return 1


def source_detail(
    *,
    date: str,
    raw_game_key: str,
    side: str,
    source_snapshot_id: str,
    payload: dict[str, Any],
) -> str:
    return compact_json(
        {
            "date": date,
            "raw_game_key": raw_game_key,
            "side": side,
            "source_snapshot_id": source_snapshot_id,
            "source_payload": payload,
        }
    )


def clear_existing_lineup_day(con: sqlite3.Connection, date: str) -> None:
    con.execute(
        """
        delete from lineup_slots
        where lineup_id in (
          select lineups.lineup_id
          from lineups
          join games on games.game_id = lineups.game_id
          where games.game_date = ?
        )
        """,
        (date,),
    )
    con.execute(
        """
        delete from lineups
        where game_id in (
          select game_id
          from games
          where game_date = ?
        )
        """,
        (date,),
    )
    con.execute(
        """
        delete from lineup_matchup_snapshots
        where source_table = 'data-private/lineups/mlb/lineup-board'
          and source_pk like ?
        """,
        (f"{date}:%",),
    )
    con.execute(
        """
        delete from starting_pitchers
        where source_name = ?
          and game_id in (
            select game_id
            from games
            where game_date = ?
          )
        """,
        (SOURCE_PROBABLES, date),
    )


def upsert_lineup_board(
    con: sqlite3.Connection,
    *,
    raw_day: RawLineupBoardDay,
    repo_root: Path,
) -> dict[str, Any]:
    ensure_lineup_schema(con)
    if not raw_day.board_path:
        return {
            "source_files": 0,
            "source_snapshot_id": None,
            "probables_source_snapshot_id": None,
            "games": 0,
            "lineups": 0,
            "lineup_slots": 0,
            "lineup_matchup_snapshots": 0,
            "probable_pitchers": 0,
            "players": 0,
            "unresolved_games": 0,
            "unresolved_players": 0,
        }

    source_snapshot_id = ensure_source_snapshot(
        con,
        repo_root=repo_root,
        file_path=raw_day.board_path,
        source_name=SOURCE_LINEUPS,
        source_family=FAMILY_LINEUPS,
        date=raw_day.date,
        notes={"game_count": raw_day.meta.get("gameCount"), "player_count": raw_day.meta.get("playerCount")},
    )
    probables_snapshot_id = ensure_source_snapshot(
        con,
        repo_root=repo_root,
        file_path=raw_day.board_path,
        source_name=SOURCE_PROBABLES,
        source_family=FAMILY_PROBABLES,
        date=raw_day.date,
        notes={
            "game_count": raw_day.meta.get("gameCount"),
            "source_kind": "lineup_board_opposing_starters",
            "lineup_source_snapshot_id": source_snapshot_id,
        },
    )

    resolver = MlbIdentityResolver(con)
    clear_existing_lineup_day(con, raw_day.date)
    counts: dict[str, Any] = {
        "source_files": 1,
        "source_snapshot_id": source_snapshot_id,
        "probables_source_snapshot_id": probables_snapshot_id,
        "games": 0,
        "lineups": 0,
        "lineup_slots": 0,
        "lineup_matchup_snapshots": 0,
        "probable_pitchers": 0,
        "players": 0,
        "unresolved_games": 0,
        "unresolved_players": 0,
    }

    for raw_game_key, board in raw_day.boards.items():
        away_title, home_title = split_title(board.get("title"))
        away_payload = board.get("away") or {}
        home_payload = board.get("home") or {}
        away_name = (away_payload.get("teamName") if isinstance(away_payload, dict) else None) or away_title
        home_name = (home_payload.get("teamName") if isinstance(home_payload, dict) else None) or home_title
        game_id = resolver.game_id_for_teams_date(SOURCE_LINEUPS, raw_day.date, home_name, away_name)
        if not game_id:
            counts["unresolved_games"] += 1
            resolver.insert_unresolved(
                "mlb_lineup_game",
                SOURCE_LINEUPS,
                raw_game_key,
                board.get("title") or raw_game_key,
                {"date": raw_day.date, "raw_game_key": raw_game_key, "board_title": board.get("title")},
                "Could not map lineup-board game to canonical game.",
            )
            continue
        counts["games"] += 1

        game = resolver.games_by_id.get(game_id) or {}
        role_payloads = {"away": away_payload, "home": home_payload}
        for side, side_payload_any in role_payloads.items():
            side_payload = side_payload_any if isinstance(side_payload_any, dict) else {}
            team_id = str(game.get(f"{side}_team_id") or "")
            opponent_side = "home" if side == "away" else "away"
            opponent_team_id = str(game.get(f"{opponent_side}_team_id") or "")
            if not team_id:
                continue

            captured_at = board.get("snapshot") or raw_day.meta.get("snapshot") or utc_now()
            players = player_payloads(side_payload)
            lineup_id = stable_id("lineup-board", game_id, team_id, captured_at, source_snapshot_id)
            con.execute(
                """
                insert into lineups (
                  lineup_id, game_id, team_id, lineup_status, captured_at, source_snapshot_id
                ) values (?, ?, ?, ?, ?, ?)
                on conflict(lineup_id) do update set
                  game_id = excluded.game_id,
                  team_id = excluded.team_id,
                  lineup_status = excluded.lineup_status,
                  captured_at = excluded.captured_at,
                  source_snapshot_id = excluded.source_snapshot_id
                """,
                (
                    lineup_id,
                    game_id,
                    team_id,
                    lineup_status_for(
                        (board.get("status") or {}).get(side) or side_payload.get("lineupSource"),
                        len(players),
                    ),
                    captured_at,
                    source_snapshot_id,
                ),
            )
            counts["lineups"] += 1

            pitcher = pitcher_payload(side_payload)
            if opponent_team_id and pitcher:
                counts["probable_pitchers"] += upsert_probable_pitcher(
                    con,
                    resolver,
                    game_id=game_id,
                    team_id=opponent_team_id,
                    pitcher=pitcher,
                )
            opposing_pitcher_id = resolver.player_id_by_mlb_id(
                SOURCE_PROBABLES,
                pitcher.get("id") if pitcher else None,
                pitcher.get("name") if pitcher else None,
            )

            for player in players:
                player_id = upsert_lineup_player(con, resolver, source_name=SOURCE_LINEUPS, player=player)
                if not player_id:
                    counts["unresolved_players"] += 1
                    resolver.insert_unresolved(
                        "mlb_lineup_player",
                        SOURCE_LINEUPS,
                        player.get("playerId"),
                        player.get("name") or "unknown hitter",
                        {"date": raw_day.date, "game_id": game_id, "side": side, "player": player},
                        "Could not map lineup-board hitter to canonical player.",
                    )
                    continue
                counts["players"] += 1
                batting_order = to_int(player.get("slot"))
                if batting_order is None:
                    continue
                con.execute(
                    """
                    insert into lineup_slots (lineup_id, batting_order, player_id, position)
                    values (?, ?, ?, ?)
                    on conflict(lineup_id, batting_order) do update set
                      player_id = excluded.player_id,
                      position = excluded.position
                    """,
                    (lineup_id, batting_order, player_id, player.get("position")),
                )
                counts["lineup_slots"] += 1

                metrics = player.get("metrics") or {}
                pitch_type = player.get("pitchType") or {}
                detail = {
                    "season": player.get("season"),
                    "recent": player.get("recent"),
                    "split": player.get("split"),
                    "careerProfile": player.get("careerProfile"),
                    "statcastTrend": player.get("statcastTrend"),
                    "metrics": metrics,
                    "pitchType": pitch_type,
                    "summary": player.get("summary"),
                    "matchupNote": player.get("matchupNote"),
                    "tags": player.get("tags"),
                    "savant": player.get("savant"),
                    "opponentContext": player.get("opponentContext"),
                    "opposingStarter": pitcher,
                    "opposingRelievers": side_payload.get("opposingRelievers"),
                    "lineupSource": side_payload.get("lineupSource"),
                }
                source_pk = f"{raw_day.date}:{raw_game_key}:{side}:{batting_order}:{player.get('playerId')}"
                con.execute(
                    """
                    insert into lineup_matchup_snapshots (
                      lineup_matchup_snapshot_id, game_id, team_id, opponent_team_id,
                      hitter_id, opposing_pitcher_id, snapshot_date, batting_order,
                      first_cycle_read, second_cycle_read, collapse_trigger_score,
                      command_stress, damage_fit, pitch_fit_damage, pitch_fit_whiff,
                      traffic_fit, strand_fork_risk, zone_punish, platoon_pressure,
                      details_json, source_table, source_pk, source_detail_json, created_at
                    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    on conflict(lineup_matchup_snapshot_id) do update set
                      game_id = excluded.game_id,
                      team_id = excluded.team_id,
                      opponent_team_id = excluded.opponent_team_id,
                      hitter_id = excluded.hitter_id,
                      opposing_pitcher_id = excluded.opposing_pitcher_id,
                      snapshot_date = excluded.snapshot_date,
                      batting_order = excluded.batting_order,
                      first_cycle_read = excluded.first_cycle_read,
                      second_cycle_read = excluded.second_cycle_read,
                      collapse_trigger_score = excluded.collapse_trigger_score,
                      command_stress = excluded.command_stress,
                      damage_fit = excluded.damage_fit,
                      pitch_fit_damage = excluded.pitch_fit_damage,
                      pitch_fit_whiff = excluded.pitch_fit_whiff,
                      traffic_fit = excluded.traffic_fit,
                      strand_fork_risk = excluded.strand_fork_risk,
                      zone_punish = excluded.zone_punish,
                      platoon_pressure = excluded.platoon_pressure,
                      details_json = excluded.details_json,
                      source_detail_json = excluded.source_detail_json
                    """,
                    (
                        stable_id("lineup-board-matchup", source_pk, source_snapshot_id),
                        game_id,
                        team_id,
                        opponent_team_id or None,
                        player_id,
                        opposing_pitcher_id,
                        raw_day.date,
                        batting_order,
                        to_float(metrics.get("matchupScore")),
                        to_float(metrics.get("formScore")),
                        to_float(metrics.get("varianceScore")),
                        to_float((pitch_type.get("topPitches") or [{}])[0].get("qualityScore") if isinstance(pitch_type.get("topPitches"), list) and pitch_type.get("topPitches") else None),
                        to_float(metrics.get("powerScore")),
                        to_float(metrics.get("pitchTypeGrade")),
                        None,
                        to_float(metrics.get("contactScore")),
                        None,
                        to_float(metrics.get("splitScore")),
                        to_float(metrics.get("splitScore")),
                        compact_json(detail),
                        "data-private/lineups/mlb/lineup-board",
                        source_pk,
                        source_detail(
                            date=raw_day.date,
                            raw_game_key=raw_game_key,
                            side=side,
                            source_snapshot_id=source_snapshot_id,
                            payload=player,
                        ),
                        utc_now(),
                    ),
                )
                counts["lineup_matchup_snapshots"] += 1

    return counts


def upsert_fetch_status(
    con: sqlite3.Connection,
    *,
    source_name: str,
    source_family: str,
    date: str,
    expected: int | None,
    actual: int,
    report_path: Path,
    repo_root: Path,
    ttl_hours: float,
    notes: dict[str, Any],
) -> None:
    now = utc_now()
    missing = max((expected or 0) - actual, 0) if expected is not None else None
    if actual <= 0:
        status = "missing"
        completeness = "missing"
    elif expected is not None and actual < expected:
        status = "partial"
        completeness = "partial"
    else:
        status = "success"
        completeness = "complete"
    run_id = f"source-fetch-{source_name}-{date}-{now.replace(':', '-').replace('.', '-')}"
    details = {
        "adapter": "mlb_lineup_board_raw_to_typed",
        "report_path": sql_path(report_path, repo_root),
        **notes,
    }
    con.execute(
        """
        insert into source_fetch_runs (
          source_fetch_run_id, sport, source_name, source_family, source_date,
          run_reason, requested_url, cache_status, cache_ttl_hours, previous_success_at,
          status, completeness_status, expected_item_count, actual_item_count,
          missing_item_count, source_snapshot_id, started_at, finished_at,
          error_code, error_message, details_json
        ) values (?, 'mlb', ?, ?, ?, 'typed_parse', null, 'not_applicable', ?,
          (select last_success_at from source_fetch_status where sport='mlb' and source_name=? and source_date=?),
          ?, ?, ?, ?, ?, ?, ?, ?, null, null, ?)
        """,
        (
            run_id,
            source_name,
            source_family,
            date,
            ttl_hours,
            source_name,
            date,
            status,
            completeness,
            expected,
            actual,
            missing,
            notes.get("source_snapshot_id"),
            now,
            now,
            compact_json(details),
        ),
    )
    con.execute(
        """
        insert into source_fetch_status (
          source_fetch_status_id, sport, source_name, source_family, source_date,
          last_fetch_run_id, last_attempt_at, last_success_at, last_status,
          last_completeness_status, cache_valid_until, expected_item_count,
          actual_item_count, missing_item_count, unresolved_count, updated_at, notes
        ) values (?, 'mlb', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict (sport, source_name, source_date) do update set
          source_family = excluded.source_family,
          last_fetch_run_id = excluded.last_fetch_run_id,
          last_attempt_at = excluded.last_attempt_at,
          last_success_at = excluded.last_success_at,
          last_status = excluded.last_status,
          last_completeness_status = excluded.last_completeness_status,
          cache_valid_until = excluded.cache_valid_until,
          expected_item_count = excluded.expected_item_count,
          actual_item_count = excluded.actual_item_count,
          missing_item_count = excluded.missing_item_count,
          unresolved_count = excluded.unresolved_count,
          updated_at = excluded.updated_at,
          notes = excluded.notes
        """,
        (
            f"mlb:{source_name}:{date}",
            source_name,
            source_family,
            date,
            run_id,
            now,
            now if status in {"success", "partial"} else None,
            status,
            completeness,
            cache_valid_until(now, ttl_hours),
            expected,
            actual,
            missing,
            int(notes.get("unresolved_count") or 0),
            now,
            compact_json(details),
        ),
    )


def insert_health_check(
    con: sqlite3.Connection,
    *,
    date: str,
    report: dict[str, Any],
    status: str,
) -> None:
    con.execute(
        """
        insert into health_checks (
          health_check_id, model_run_id, check_name, status, expected_count,
          actual_count, details_json, checked_at
        ) values (?, null, ?, ?, ?, ?, ?, ?)
        on conflict(health_check_id) do update set
          status = excluded.status,
          expected_count = excluded.expected_count,
          actual_count = excluded.actual_count,
          details_json = excluded.details_json,
          checked_at = excluded.checked_at
        """,
        (
            f"mlb-lineup-board-raw-to-typed:{date}",
            f"mlb_lineup_board_raw_to_typed:{date}",
            status,
            report.get("expected_game_count"),
            report.get("lineup_board", {}).get("games"),
            compact_json(report),
            utc_now(),
        ),
    )

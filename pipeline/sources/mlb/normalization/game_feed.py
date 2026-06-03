from __future__ import annotations

import gzip
import hashlib
import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .common import compact_json, stable_id, to_float, to_int, utc_now


SOURCE_SCHEDULE = "mlb_schedule"
SOURCE_GAME_FEED = "mlb_game_feed"
FAMILY_SCHEDULE = "schedule"
FAMILY_GAME_FEED = "game-feed"


@dataclass(frozen=True)
class RawMlbDay:
    date: str
    root: Path
    schedule_path: Path | None
    schedule_payload: dict[str, Any]
    feed_files: list[Path]

    @property
    def schedule_games(self) -> list[dict[str, Any]]:
        return [
            game
            for date_entry in self.schedule_payload.get("dates", []) or []
            for game in date_entry.get("games", []) or []
            if isinstance(game, dict)
        ]


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeDecodeError):
        return {}


def read_json_gz(path: Path) -> dict[str, Any]:
    try:
        with gzip.open(path, "rt", encoding="utf-8") as handle:
            parsed = json.load(handle)
    except (OSError, json.JSONDecodeError, UnicodeDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_raw_day(raw_root: Path, date: str) -> RawMlbDay:
    day_root = raw_root / date
    schedule_path = day_root / "schedule.json"
    feed_dir = day_root / "games"
    return RawMlbDay(
        date=date,
        root=day_root,
        schedule_path=schedule_path if schedule_path.exists() else None,
        schedule_payload=read_json(schedule_path) if schedule_path.exists() else {},
        feed_files=sorted(feed_dir.glob("*-feed-live.json.gz")) if feed_dir.exists() else [],
    )


def team_id_from_name(name: Any) -> str | None:
    if not name:
        return None
    return "mlb-team-" + str(name).strip().lower().replace(" ", "-")


def venue_id_from_name(name: Any) -> str | None:
    if not name:
        return None
    return "mlb-venue-" + str(name).strip().lower().replace(" ", "-")


def player_id_from_mlb_id(mlb_player_id: Any) -> str | None:
    numeric_id = to_int(mlb_player_id)
    if numeric_id is None:
        return None
    return f"mlb-player-{numeric_id}"


def game_id_from_pk(game_pk: Any) -> str | None:
    numeric_id = to_int(game_pk)
    if numeric_id is None:
        return None
    return f"mlb-{numeric_id}"


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
    source_url: str | None = None,
    notes: dict[str, Any] | None = None,
) -> str:
    local_path = sql_path(file_path, repo_root)
    content_hash = sha256_file(file_path)
    snapshot_id = source_snapshot_id_for(source_name, local_path, content_hash)
    stat = file_path.stat()
    captured_at = utc_now()
    snapshot_notes = {
        "root": "data-private/raw/mlb",
        "parser_module": "pipeline/sources/mlb/normalization/game_feed.py",
        "source_family": source_family,
        "active_raw_to_typed_adapter": True,
        "requested_date": date,
        "size_bytes": stat.st_size,
        **(notes or {}),
    }
    con.execute(
        """
        insert into source_snapshots (
          source_snapshot_id, source_name, sport, source_url, local_path,
          captured_at, source_date, content_hash, content_type, status, notes
        ) values (?, ?, 'mlb', ?, ?, ?, ?, ?, 'application/json', 'captured', ?)
        on conflict(source_snapshot_id) do update set
          source_name = excluded.source_name,
          source_url = excluded.source_url,
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
            source_url,
            local_path,
            captured_at,
            date,
            content_hash,
            compact_json(snapshot_notes),
        ),
    )
    return snapshot_id


def game_status(game: dict[str, Any], feed: dict[str, Any] | None = None) -> str | None:
    return (
        ((game.get("status") or {}).get("detailedState"))
        or (((feed or {}).get("gameData") or {}).get("status") or {}).get("detailedState")
        or ((game.get("status") or {}).get("abstractGameState"))
    )


def is_final_status(status: Any) -> bool:
    text = str(status or "").strip().lower()
    return text in {"final", "game over", "completed early", "final: tied"}


def upsert_team(con: sqlite3.Connection, team: dict[str, Any]) -> str | None:
    name = team.get("name")
    team_id = team_id_from_name(name)
    if not team_id:
        return None
    league = (team.get("league") or {}).get("name")
    division = (team.get("division") or {}).get("name")
    con.execute(
        """
        insert into teams (team_id, mlb_team_id, name, abbreviation, league, division, active)
        values (?, ?, ?, ?, ?, ?, ?)
        on conflict(team_id) do update set
          mlb_team_id = coalesce(teams.mlb_team_id, excluded.mlb_team_id),
          name = excluded.name,
          abbreviation = coalesce(excluded.abbreviation, teams.abbreviation),
          league = coalesce(excluded.league, teams.league),
          division = coalesce(excluded.division, teams.division),
          active = excluded.active
        """,
        (
            team_id,
            to_int(team.get("id")),
            name,
            team.get("abbreviation") or team.get("fileCode"),
            league,
            division,
            1 if team.get("active", True) else 0,
        ),
    )
    return team_id


def upsert_venue(con: sqlite3.Connection, venue: dict[str, Any]) -> str | None:
    name = venue.get("name")
    venue_id = venue_id_from_name(name)
    if not venue_id:
        return None
    location = venue.get("location") or {}
    coordinates = location.get("defaultCoordinates") or {}
    field_info = venue.get("fieldInfo") or {}
    con.execute(
        """
        insert into venues (
          venue_id, mlb_venue_id, name, city, state, latitude, longitude, roof_type, orientation_degrees
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(venue_id) do update set
          mlb_venue_id = coalesce(venues.mlb_venue_id, excluded.mlb_venue_id),
          name = excluded.name,
          city = coalesce(excluded.city, venues.city),
          state = coalesce(excluded.state, venues.state),
          latitude = coalesce(excluded.latitude, venues.latitude),
          longitude = coalesce(excluded.longitude, venues.longitude),
          roof_type = coalesce(excluded.roof_type, venues.roof_type),
          orientation_degrees = coalesce(excluded.orientation_degrees, venues.orientation_degrees)
        """,
        (
            venue_id,
            to_int(venue.get("id")),
            name,
            location.get("city"),
            location.get("state"),
            to_float(coordinates.get("latitude")),
            to_float(coordinates.get("longitude")),
            field_info.get("roofType"),
            to_float(location.get("azimuthAngle")),
        ),
    )
    return venue_id


def upsert_player(con: sqlite3.Connection, person: dict[str, Any] | None, *, fallback_name: Any = None) -> str | None:
    person = person or {}
    mlb_player_id = to_int(person.get("id"))
    player_name = person.get("fullName") or fallback_name
    player_id = player_id_from_mlb_id(mlb_player_id)
    if not player_id or not player_name:
        return None
    existing = con.execute(
        "select player_id from players where mlb_player_id = ?",
        (mlb_player_id,),
    ).fetchone()
    if existing:
        player_id = existing[0]
    con.execute(
        """
        insert into players (player_id, mlb_player_id, name, bats, throws, primary_position, birth_date, active)
        values (?, ?, ?, ?, ?, ?, ?, 1)
        on conflict(player_id) do update set
          mlb_player_id = coalesce(players.mlb_player_id, excluded.mlb_player_id),
          name = excluded.name,
          bats = coalesce(excluded.bats, players.bats),
          throws = coalesce(excluded.throws, players.throws),
          primary_position = coalesce(excluded.primary_position, players.primary_position),
          birth_date = coalesce(excluded.birth_date, players.birth_date),
          active = 1
        """,
        (
            player_id,
            mlb_player_id,
            player_name,
            (person.get("batSide") or {}).get("code"),
            (person.get("pitchHand") or {}).get("code"),
            (person.get("primaryPosition") or {}).get("abbreviation"),
            person.get("birthDate"),
        ),
    )
    return player_id


def upsert_players_from_feed(con: sqlite3.Connection, feed: dict[str, Any]) -> int:
    count = 0
    for player in ((feed.get("gameData") or {}).get("players") or {}).values():
        if upsert_player(con, player):
            count += 1
    return count


def schedule_games_by_pk(raw_day: RawMlbDay) -> dict[int, dict[str, Any]]:
    games: dict[int, dict[str, Any]] = {}
    for game in raw_day.schedule_games:
        game_pk = to_int(game.get("gamePk"))
        if game_pk is not None:
            games[game_pk] = game
    return games


def schedule_game_from_feed(feed: dict[str, Any]) -> dict[str, Any]:
    game_data = feed.get("gameData") or {}
    return {
        "gamePk": feed.get("gamePk") or game_data.get("game", {}).get("pk"),
        "gameDate": (game_data.get("datetime") or {}).get("dateTime"),
        "officialDate": (game_data.get("datetime") or {}).get("officialDate"),
        "season": (game_data.get("game") or {}).get("season"),
        "status": game_data.get("status") or {},
        "teams": {
            "away": {"team": (game_data.get("teams") or {}).get("away") or {}},
            "home": {"team": (game_data.get("teams") or {}).get("home") or {}},
        },
        "venue": game_data.get("venue") or {},
        "seriesGameNumber": (game_data.get("game") or {}).get("seriesGameNumber"),
    }


def upsert_game_from_schedule(
    con: sqlite3.Connection,
    *,
    game: dict[str, Any],
    source_snapshot_id: str | None,
) -> str | None:
    game_pk = to_int(game.get("gamePk"))
    game_id = game_id_from_pk(game_pk)
    if not game_id:
        return None
    away_team = (((game.get("teams") or {}).get("away") or {}).get("team") or {})
    home_team = (((game.get("teams") or {}).get("home") or {}).get("team") or {})
    away_team_id = upsert_team(con, away_team)
    home_team_id = upsert_team(con, home_team)
    venue_id = upsert_venue(con, game.get("venue") or {})
    if not away_team_id or not home_team_id:
        return None
    con.execute(
        """
        insert into games (
          game_id, mlb_game_pk, game_date, start_time_utc, home_team_id, away_team_id,
          venue_id, status, series_game_number, season, source_snapshot_id
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(game_id) do update set
          mlb_game_pk = excluded.mlb_game_pk,
          game_date = excluded.game_date,
          start_time_utc = excluded.start_time_utc,
          home_team_id = excluded.home_team_id,
          away_team_id = excluded.away_team_id,
          venue_id = coalesce(excluded.venue_id, games.venue_id),
          status = excluded.status,
          series_game_number = coalesce(excluded.series_game_number, games.series_game_number),
          season = coalesce(excluded.season, games.season),
          source_snapshot_id = coalesce(excluded.source_snapshot_id, games.source_snapshot_id)
        """,
        (
            game_id,
            game_pk,
            str(game.get("officialDate") or game.get("gameDate") or "")[:10],
            game.get("gameDate"),
            home_team_id,
            away_team_id,
            venue_id,
            game_status(game),
            to_int(game.get("seriesGameNumber")),
            to_int(game.get("season")),
            source_snapshot_id,
        ),
    )
    return game_id


def probable_pitcher_for(game: dict[str, Any], role: str, feed: dict[str, Any] | None = None) -> dict[str, Any] | None:
    schedule_probable = (((game.get("teams") or {}).get(role) or {}).get("probablePitcher") or {})
    if schedule_probable:
        return schedule_probable
    feed_probable = (((feed or {}).get("gameData") or {}).get("probablePitchers") or {}).get(role) or {}
    return feed_probable or None


def upsert_starting_pitchers(
    con: sqlite3.Connection,
    *,
    game: dict[str, Any],
    feed: dict[str, Any] | None,
    source_name: str,
) -> int:
    game_id = game_id_from_pk(game.get("gamePk"))
    if not game_id:
        return 0
    count = 0
    for role in ("away", "home"):
        probable = probable_pitcher_for(game, role, feed)
        if not probable:
            continue
        player_id = upsert_player(con, probable)
        team_name = ((((game.get("teams") or {}).get(role) or {}).get("team") or {}).get("name"))
        team_id = team_id_from_name(team_name)
        if not player_id or not team_id:
            continue
        con.execute(
            """
            insert into starting_pitchers (
              game_id, team_id, pitcher_id, confirmation_status, source_name, updated_at
            ) values (?, ?, ?, ?, ?, ?)
            on conflict(game_id, team_id, pitcher_id) do update set
              confirmation_status = excluded.confirmation_status,
              source_name = excluded.source_name,
              updated_at = excluded.updated_at
            """,
            (game_id, team_id, player_id, "probable", source_name, utc_now()),
        )
        count += 1
    return count


def inning_totals(feed: dict[str, Any], role: str, max_inning: int | None = None) -> dict[str, int]:
    runs = hits = home_runs = 0
    for inning in (((feed.get("liveData") or {}).get("linescore") or {}).get("innings") or []):
        inning_num = to_int(inning.get("num"))
        if max_inning is not None and inning_num is not None and inning_num > max_inning:
            continue
        side = inning.get(role) or {}
        runs += to_int(side.get("runs")) or 0
        hits += to_int(side.get("hits")) or 0
    for play in (((feed.get("liveData") or {}).get("plays") or {}).get("allPlays") or []):
        about = play.get("about") or {}
        if (about.get("isTopInning") and role != "away") or ((not about.get("isTopInning")) and role != "home"):
            continue
        inning_num = to_int(about.get("inning"))
        if max_inning is not None and inning_num is not None and inning_num > max_inning:
            continue
        if ((play.get("result") or {}).get("eventType") or "").lower() == "home_run":
            home_runs += 1
    return {"runs": runs, "hits": hits, "home_runs": home_runs}


def result_label(runs_for: int | None, runs_against: int | None) -> str | None:
    if runs_for is None or runs_against is None:
        return None
    if runs_for > runs_against:
        return "win"
    if runs_for < runs_against:
        return "loss"
    return "push"


def upsert_game_outcome(con: sqlite3.Connection, *, game: dict[str, Any], feed: dict[str, Any], source_snapshot_id: str) -> int:
    status = game_status(game, feed)
    if not is_final_status(status):
        return 0
    game_id = game_id_from_pk(game.get("gamePk"))
    if not game_id:
        return 0
    home = inning_totals(feed, "home")
    away = inning_totals(feed, "away")
    home_f5 = inning_totals(feed, "home", max_inning=5)
    away_f5 = inning_totals(feed, "away", max_inning=5)
    home_team_name = ((((game.get("teams") or {}).get("home") or {}).get("team") or {}).get("name"))
    away_team_name = ((((game.get("teams") or {}).get("away") or {}).get("team") or {}).get("name"))
    home_team_id = team_id_from_name(home_team_name)
    away_team_id = team_id_from_name(away_team_name)
    winner_team_id = None
    if home["runs"] > away["runs"]:
        winner_team_id = home_team_id
    elif away["runs"] > home["runs"]:
        winner_team_id = away_team_id
    details = {
        "source_snapshot_id": source_snapshot_id,
        "status": status,
        "home_team": home_team_name,
        "away_team": away_team_name,
    }
    con.execute(
        """
        insert into game_outcomes (
          game_id, home_runs, away_runs, total_runs, f5_home_runs, f5_away_runs,
          f5_total_runs, winner_team_id, completed_at, home_hits, away_hits,
          home_hits_first5, away_hits_first5, home_home_runs, away_home_runs,
          home_home_runs_first5, away_home_runs_first5, home_first5_result,
          away_first5_result, home_full_game_result, away_full_game_result,
          home_bullpen_run_diff, source_table, source_pk, source_detail_json, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(game_id) do update set
          home_runs = excluded.home_runs,
          away_runs = excluded.away_runs,
          total_runs = excluded.total_runs,
          f5_home_runs = excluded.f5_home_runs,
          f5_away_runs = excluded.f5_away_runs,
          f5_total_runs = excluded.f5_total_runs,
          winner_team_id = excluded.winner_team_id,
          completed_at = excluded.completed_at,
          home_hits = excluded.home_hits,
          away_hits = excluded.away_hits,
          home_hits_first5 = excluded.home_hits_first5,
          away_hits_first5 = excluded.away_hits_first5,
          home_home_runs = excluded.home_home_runs,
          away_home_runs = excluded.away_home_runs,
          home_home_runs_first5 = excluded.home_home_runs_first5,
          away_home_runs_first5 = excluded.away_home_runs_first5,
          home_first5_result = excluded.home_first5_result,
          away_first5_result = excluded.away_first5_result,
          home_full_game_result = excluded.home_full_game_result,
          away_full_game_result = excluded.away_full_game_result,
          home_bullpen_run_diff = excluded.home_bullpen_run_diff,
          source_table = excluded.source_table,
          source_pk = excluded.source_pk,
          source_detail_json = excluded.source_detail_json,
          updated_at = excluded.updated_at
        """,
        (
            game_id,
            home["runs"],
            away["runs"],
            home["runs"] + away["runs"],
            home_f5["runs"],
            away_f5["runs"],
            home_f5["runs"] + away_f5["runs"],
            winner_team_id,
            str(game.get("officialDate") or "")[:10] or None,
            home["hits"],
            away["hits"],
            home_f5["hits"],
            away_f5["hits"],
            home["home_runs"],
            away["home_runs"],
            home_f5["home_runs"],
            away_f5["home_runs"],
            result_label(home_f5["runs"], away_f5["runs"]),
            result_label(away_f5["runs"], home_f5["runs"]),
            result_label(home["runs"], away["runs"]),
            result_label(away["runs"], home["runs"]),
            (home["runs"] - home_f5["runs"]) - (away["runs"] - away_f5["runs"]),
            SOURCE_GAME_FEED,
            compact_json({"game_pk": game.get("gamePk")}),
            compact_json(details),
            utc_now(),
        ),
    )
    return 1


def outs_on_play(play: dict[str, Any], outs_before: int) -> tuple[int, int]:
    count_outs = to_int((play.get("count") or {}).get("outs"))
    if count_outs is None:
        runner_outs = sum(1 for runner in play.get("runners") or [] if (runner.get("movement") or {}).get("isOut"))
        is_out = 1 if (play.get("result") or {}).get("isOut") else 0
        play_outs = max(runner_outs, is_out)
        return play_outs, outs_before + play_outs
    if count_outs < outs_before:
        outs_before = 0
    return max(count_outs - outs_before, 0), count_outs


BASE_ORDER = {"1B": 1, "2B": 2, "3B": 3, "score": 4}
NON_OFFICIAL_AT_BAT_EVENTS = {
    "hit_by_pitch",
    "intent_walk",
    "sac_bunt",
    "sac_fly",
    "sac_fly_double_play",
    "walk",
}


def format_base_state(bases: set[str]) -> str:
    ordered = sorted((base for base in bases if base in BASE_ORDER), key=lambda base: BASE_ORDER[base])
    return "-".join(ordered) if ordered else "Empty"


def runner_base_states(play: dict[str, Any]) -> tuple[str, str]:
    start_bases: set[str] = set()
    end_bases: set[str] = set()
    for runner in play.get("runners") or []:
        movement = runner.get("movement") or {}
        start = movement.get("start") or movement.get("originBase")
        end = movement.get("end")
        if start:
            start_bases.add(str(start))
        if end and not movement.get("isOut"):
            end_bases.add(str(end))
    return format_base_state(start_bases), format_base_state(end_bases)


def is_official_at_bat(event_type: Any) -> int:
    text = str(event_type or "").strip().lower()
    return 0 if text in NON_OFFICIAL_AT_BAT_EVENTS else 1


def upsert_plate_appearances(con: sqlite3.Connection, *, game: dict[str, Any], feed: dict[str, Any], source_snapshot_id: str) -> int:
    game_id = game_id_from_pk(game.get("gamePk"))
    if not game_id:
        return 0
    away_team_name = ((((game.get("teams") or {}).get("away") or {}).get("team") or {}).get("name"))
    home_team_name = ((((game.get("teams") or {}).get("home") or {}).get("team") or {}).get("name"))
    away_team_id = team_id_from_name(away_team_name)
    home_team_id = team_id_from_name(home_team_name)
    outs_state: dict[tuple[int, str], int] = {}
    away_score_before = 0
    home_score_before = 0
    count = 0
    for play in (((feed.get("liveData") or {}).get("plays") or {}).get("allPlays") or []):
        about = play.get("about") or {}
        at_bat_index = to_int(about.get("atBatIndex"))
        if at_bat_index is None:
            continue
        inning = to_int(about.get("inning"))
        half = about.get("halfInning")
        key = (inning or 0, str(half or ""))
        before = outs_state.get(key, 0)
        outs_delta, after = outs_on_play(play, before)
        outs_state[key] = after
        is_top = bool(about.get("isTopInning"))
        batting_team_id = away_team_id if is_top else home_team_id
        pitching_team_id = home_team_id if is_top else away_team_id
        matchup = play.get("matchup") or {}
        batter = matchup.get("batter") or {}
        pitcher = matchup.get("pitcher") or {}
        batter_id = upsert_player(con, batter)
        pitcher_id = upsert_player(con, pitcher)
        result = play.get("result") or {}
        away_score_after = to_int(result.get("awayScore"))
        home_score_after = to_int(result.get("homeScore"))
        if away_score_after is None:
            away_score_after = away_score_before
        if home_score_after is None:
            home_score_after = home_score_before
        run_delta = max(away_score_after - away_score_before, 0) + max(home_score_after - home_score_before, 0)
        count_state = play.get("count") or {}
        base_state_start, base_state_end = runner_base_states(play)
        pa_id = f"{game_id}-pa-{at_bat_index}"
        con.execute(
            """
            insert into plate_appearances (
              plate_appearance_id, game_id, inning, inning_half, batter_id, pitcher_id,
              batting_team_id, pitching_team_id, at_bat_index, outs_before, outs_after,
              balls_final, strikes_final, base_state_start, base_state_end,
              away_score_before, home_score_before, away_score_after, home_score_after,
              men_on_base, is_scoring_play, is_out, is_at_bat, event_type, rbi,
              runs_scored, outs_on_play, win_expectancy_delta, raw_json, source_snapshot_id
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, ?)
            on conflict(plate_appearance_id) do update set
              game_id = excluded.game_id,
              inning = excluded.inning,
              inning_half = excluded.inning_half,
              batter_id = excluded.batter_id,
              pitcher_id = excluded.pitcher_id,
              batting_team_id = excluded.batting_team_id,
              pitching_team_id = excluded.pitching_team_id,
              at_bat_index = excluded.at_bat_index,
              outs_before = excluded.outs_before,
              outs_after = excluded.outs_after,
              balls_final = excluded.balls_final,
              strikes_final = excluded.strikes_final,
              base_state_start = excluded.base_state_start,
              base_state_end = excluded.base_state_end,
              away_score_before = excluded.away_score_before,
              home_score_before = excluded.home_score_before,
              away_score_after = excluded.away_score_after,
              home_score_after = excluded.home_score_after,
              men_on_base = excluded.men_on_base,
              is_scoring_play = excluded.is_scoring_play,
              is_out = excluded.is_out,
              is_at_bat = excluded.is_at_bat,
              event_type = excluded.event_type,
              rbi = excluded.rbi,
              runs_scored = excluded.runs_scored,
              outs_on_play = excluded.outs_on_play,
              raw_json = excluded.raw_json,
              source_snapshot_id = excluded.source_snapshot_id
            """,
            (
                pa_id,
                game_id,
                inning,
                half,
                batter_id,
                pitcher_id,
                batting_team_id,
                pitching_team_id,
                at_bat_index,
                before,
                after,
                to_int(count_state.get("balls")),
                to_int(count_state.get("strikes")),
                base_state_start,
                base_state_end,
                away_score_before,
                home_score_before,
                away_score_after,
                home_score_after,
                ((matchup.get("splits") or {}).get("menOnBase")),
                1 if about.get("isScoringPlay") else 0,
                1 if result.get("isOut") else 0,
                is_official_at_bat(result.get("eventType")),
                result.get("eventType"),
                to_int(result.get("rbi")) or 0,
                run_delta,
                outs_delta,
                compact_json(play),
                source_snapshot_id,
            ),
        )
        away_score_before = away_score_after
        home_score_before = home_score_after
        count += 1
    return count


def upsert_pitch_events(con: sqlite3.Connection, *, game: dict[str, Any], feed: dict[str, Any], source_snapshot_id: str) -> int:
    game_id = game_id_from_pk(game.get("gamePk"))
    if not game_id:
        return 0
    count = 0
    for play in (((feed.get("liveData") or {}).get("plays") or {}).get("allPlays") or []):
        about = play.get("about") or {}
        at_bat_index = to_int(about.get("atBatIndex"))
        if at_bat_index is None:
            continue
        pa_id = f"{game_id}-pa-{at_bat_index}"
        for event in play.get("playEvents") or []:
            event_index = to_int(event.get("index"))
            if event_index is None:
                continue
            details = event.get("details") or {}
            pitch_data = event.get("pitchData") or {}
            hit_data = event.get("hitData") or {}
            pitch_type = details.get("type") or {}
            call = details.get("call") or {}
            count_state = event.get("count") or {}
            event_id = f"{pa_id}-event-{event_index}"
            con.execute(
                """
                insert into pitch_events (
                  pitch_event_id, plate_appearance_id, game_id, at_bat_index, event_index,
                  pitch_number, balls, strikes, outs, is_pitch, is_strike, is_ball,
                  call_code, call_description, pitch_type_code, pitch_type_description,
                  pitch_type, pitch_result, release_speed, start_speed, end_speed, zone,
                  launch_speed, launch_angle, hit_location, is_in_play, play_id,
                  raw_json, source_snapshot_id
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict(pitch_event_id) do update set
                  plate_appearance_id = excluded.plate_appearance_id,
                  game_id = excluded.game_id,
                  at_bat_index = excluded.at_bat_index,
                  event_index = excluded.event_index,
                  pitch_number = excluded.pitch_number,
                  balls = excluded.balls,
                  strikes = excluded.strikes,
                  outs = excluded.outs,
                  is_pitch = excluded.is_pitch,
                  is_strike = excluded.is_strike,
                  is_ball = excluded.is_ball,
                  call_code = excluded.call_code,
                  call_description = excluded.call_description,
                  pitch_type_code = excluded.pitch_type_code,
                  pitch_type_description = excluded.pitch_type_description,
                  pitch_type = excluded.pitch_type,
                  pitch_result = excluded.pitch_result,
                  release_speed = excluded.release_speed,
                  start_speed = excluded.start_speed,
                  end_speed = excluded.end_speed,
                  zone = excluded.zone,
                  launch_speed = excluded.launch_speed,
                  launch_angle = excluded.launch_angle,
                  hit_location = excluded.hit_location,
                  is_in_play = excluded.is_in_play,
                  play_id = excluded.play_id,
                  raw_json = excluded.raw_json,
                  source_snapshot_id = excluded.source_snapshot_id
                """,
                (
                    event_id,
                    pa_id,
                    game_id,
                    at_bat_index,
                    event_index,
                    to_int(event.get("pitchNumber")),
                    to_int(count_state.get("balls")),
                    to_int(count_state.get("strikes")),
                    to_int(count_state.get("outs")),
                    1 if event.get("isPitch") else 0,
                    1 if details.get("isStrike") else 0,
                    1 if details.get("isBall") else 0,
                    call.get("code") or details.get("code"),
                    call.get("description") or details.get("description") or details.get("event"),
                    pitch_type.get("code"),
                    pitch_type.get("description"),
                    pitch_type.get("code"),
                    call.get("description") or details.get("description") or details.get("eventType"),
                    to_float(pitch_data.get("startSpeed")),
                    to_float(pitch_data.get("startSpeed")),
                    to_float(pitch_data.get("endSpeed")),
                    to_int(pitch_data.get("zone")),
                    to_float(hit_data.get("launchSpeed")),
                    to_float(hit_data.get("launchAngle")),
                    None if hit_data.get("location") is None else str(hit_data.get("location")),
                    1 if details.get("isInPlay") else 0,
                    event.get("playId"),
                    compact_json(event),
                    source_snapshot_id,
                ),
            )
            count += 1
    return count


def upsert_schedule(con: sqlite3.Connection, *, raw_day: RawMlbDay, repo_root: Path, dry_run: bool) -> dict[str, int | str | None]:
    if not raw_day.schedule_path:
        return {"source_files": 0, "games": 0, "teams": 0, "venues": 0, "starting_pitchers": 0, "source_snapshot_id": None}
    source_snapshot_id = ensure_source_snapshot(
        con,
        repo_root=repo_root,
        file_path=raw_day.schedule_path,
        source_name=SOURCE_SCHEDULE,
        source_family=FAMILY_SCHEDULE,
        date=raw_day.date,
        notes={"game_count": len(raw_day.schedule_games)},
    )
    counts = {"source_files": 1, "games": 0, "teams": 0, "venues": 0, "starting_pitchers": 0, "source_snapshot_id": source_snapshot_id}
    for game in raw_day.schedule_games:
        game_id = upsert_game_from_schedule(con, game=game, source_snapshot_id=source_snapshot_id)
        if game_id:
            counts["games"] = int(counts["games"]) + 1
        for role in ("away", "home"):
            team = (((game.get("teams") or {}).get(role) or {}).get("team") or {})
            if upsert_team(con, team):
                counts["teams"] = int(counts["teams"]) + 1
        if upsert_venue(con, game.get("venue") or {}):
            counts["venues"] = int(counts["venues"]) + 1
        counts["starting_pitchers"] = int(counts["starting_pitchers"]) + upsert_starting_pitchers(
            con, game=game, feed=None, source_name=SOURCE_SCHEDULE
        )
    return counts


def upsert_game_feeds(con: sqlite3.Connection, *, raw_day: RawMlbDay, repo_root: Path) -> dict[str, int]:
    schedule_by_pk = schedule_games_by_pk(raw_day)
    counts = {
        "source_files": 0,
        "games": 0,
        "players": 0,
        "starting_pitchers": 0,
        "plate_appearances": 0,
        "pitch_events": 0,
        "game_outcomes": 0,
        "missing_schedule_games": 0,
    }
    for feed_path in raw_day.feed_files:
        feed = read_json_gz(feed_path)
        game_pk = to_int(feed.get("gamePk"))
        if game_pk is None:
            continue
        game = schedule_by_pk.get(game_pk) or schedule_game_from_feed(feed)
        if not schedule_by_pk.get(game_pk):
            counts["missing_schedule_games"] += 1
        source_snapshot_id = ensure_source_snapshot(
            con,
            repo_root=repo_root,
            file_path=feed_path,
            source_name=SOURCE_GAME_FEED,
            source_family=FAMILY_GAME_FEED,
            date=raw_day.date,
            source_url=f"https://statsapi.mlb.com/api/v1.1/game/{game_pk}/feed/live",
            notes={"game_pk": game_pk},
        )
        counts["source_files"] += 1
        game_id = upsert_game_from_schedule(con, game=game, source_snapshot_id=source_snapshot_id)
        if game_id:
            counts["games"] += 1
        counts["players"] += upsert_players_from_feed(con, feed)
        counts["starting_pitchers"] += upsert_starting_pitchers(con, game=game, feed=feed, source_name=SOURCE_GAME_FEED)
        counts["plate_appearances"] += upsert_plate_appearances(con, game=game, feed=feed, source_snapshot_id=source_snapshot_id)
        counts["pitch_events"] += upsert_pitch_events(con, game=game, feed=feed, source_snapshot_id=source_snapshot_id)
        counts["game_outcomes"] += upsert_game_outcome(con, game=game, feed=feed, source_snapshot_id=source_snapshot_id)
    return counts


def cache_valid_until(now_iso: str, ttl_hours: float) -> str:
    # SQLite's datetime parser handles UTC-ish ISO strings inconsistently across builds.
    from datetime import datetime, timedelta, timezone

    try:
        now = datetime.fromisoformat(now_iso.replace("Z", "+00:00"))
    except ValueError:
        now = datetime.now(timezone.utc)
    return (now + timedelta(hours=ttl_hours)).isoformat()


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
    dry_run: bool,
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
        "adapter": "mlb_schedule_game_feed_raw_to_typed",
        "dry_run": dry_run,
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
          ?, ?, ?, ?, ?, null, ?, ?, null, null, ?)
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
        ) values (?, 'mlb', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
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
            f"mlb-schedule-game-feed-raw-to-typed:{date}",
            f"mlb_schedule_game_feed_raw_to_typed:{date}",
            status,
            report.get("expected_game_count"),
            report.get("feed", {}).get("source_files"),
            compact_json(report),
            utc_now(),
        ),
    )

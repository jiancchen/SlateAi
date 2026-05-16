#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
WAREHOUSE_DIR = DATA_DIR / "warehouse"
PREDICTIONS_DIR = DATA_DIR / "predictions" / "mlb-home-runs"
DB_PATH = WAREHOUSE_DIR / "sports.db"
USER_AGENT = "SportsTradingBoardBot/1.0 (+https://baseballsavant.mlb.com)"

MLB_SCHEDULE_URL = "https://statsapi.mlb.com/api/v1/schedule?sportId=1&date={date}&hydrate=probablePitcher,team"
MLB_FEED_URL = "https://statsapi.mlb.com/api/v1.1/game/{game_pk}/feed/live"
STATCAST_HOME_RUNS_CSV_URL = (
    "https://baseballsavant.mlb.com/leaderboard/home-runs"
    "?year={season}&player_type=Batter&cat=xhr&team=&min=0&csv=true"
)


SCHEMA = """
CREATE TABLE IF NOT EXISTS source_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_key TEXT NOT NULL,
  url TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  content_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  meta_json TEXT
);

CREATE TABLE IF NOT EXISTS mlb_games (
  game_pk INTEGER PRIMARY KEY,
  game_date TEXT NOT NULL,
  game_datetime TEXT,
  status TEXT,
  away_team TEXT NOT NULL,
  home_team TEXT NOT NULL,
  venue_name TEXT,
  away_score INTEGER,
  home_score INTEGER,
  raw_path TEXT
);

CREATE TABLE IF NOT EXISTS mlb_starting_pitchers (
  game_pk INTEGER NOT NULL,
  team_role TEXT NOT NULL,
  pitcher_id INTEGER,
  pitcher_name TEXT,
  pitch_hand TEXT,
  wins INTEGER,
  losses INTEGER,
  era REAL,
  strikeouts INTEGER,
  innings_pitched REAL,
  home_runs_allowed INTEGER,
  whip REAL,
  raw_json TEXT,
  PRIMARY KEY (game_pk, team_role)
);

CREATE TABLE IF NOT EXISTS mlb_home_run_events (
  event_key TEXT PRIMARY KEY,
  game_pk INTEGER NOT NULL,
  game_date TEXT NOT NULL,
  game_datetime TEXT,
  inning INTEGER,
  half_inning TEXT,
  batter_id INTEGER,
  batter_name TEXT,
  pitcher_id INTEGER,
  pitcher_name TEXT,
  batting_team TEXT,
  fielding_team TEXT,
  description TEXT,
  rbi INTEGER,
  away_score INTEGER,
  home_score INTEGER,
  statcast_play_id TEXT,
  raw_json TEXT
);

CREATE TABLE IF NOT EXISTS statcast_hr_leaderboard_snapshots (
  snapshot_date TEXT NOT NULL,
  season INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  team_abbrev TEXT NOT NULL,
  hr_total REAL,
  xhr REAL,
  xhr_diff REAL,
  no_doubters REAL,
  mostly_gone REAL,
  doubters REAL,
  no_doubter_per REAL,
  avg_hr_trot REAL,
  source_url TEXT,
  PRIMARY KEY (snapshot_date, season, player_id)
);

CREATE TABLE IF NOT EXISTS mlb_home_run_predictions (
  prediction_date TEXT NOT NULL,
  model_name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  team_abbrev TEXT NOT NULL,
  game_title TEXT,
  opposing_pitcher TEXT,
  score REAL,
  metadata_json TEXT,
  PRIMARY KEY (prediction_date, model_name, player_id)
);

CREATE TABLE IF NOT EXISTS mlb_home_run_backtests (
  prediction_date TEXT NOT NULL,
  model_name TEXT NOT NULL,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  team_abbrev TEXT NOT NULL,
  actual_home_runs INTEGER NOT NULL,
  hit_flag INTEGER NOT NULL,
  matched_event_keys TEXT,
  PRIMARY KEY (prediction_date, model_name, player_id)
);

CREATE TABLE IF NOT EXISTS park_factor_snapshots (
  snapshot_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  venue_name TEXT,
  hr_index REAL,
  runs_index REAL,
  woba_index REAL,
  source_url TEXT,
  PRIMARY KEY (snapshot_date, team_name)
);

CREATE TABLE IF NOT EXISTS weather_observations (
  game_pk INTEGER NOT NULL,
  observed_at TEXT NOT NULL,
  source_url TEXT,
  temperature_f REAL,
  wind_speed_mph REAL,
  wind_direction TEXT,
  roof_status TEXT,
  raw_json TEXT,
  PRIMARY KEY (game_pk, observed_at)
);
"""


def ensure_dirs() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    WAREHOUSE_DIR.mkdir(parents=True, exist_ok=True)
    PREDICTIONS_DIR.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    ensure_dirs()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT, "X-Requested-With": "XMLHttpRequest"})
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", "ignore")


def fetch_json(url: str) -> Any:
    return json.loads(fetch_text(url))


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def file_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def record_snapshot(
    conn: sqlite3.Connection,
    *,
    source_key: str,
    url: str,
    content_path: Path,
    content_text: str,
    meta: dict[str, Any] | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO source_snapshots (source_key, url, fetched_at, content_path, content_hash, meta_json)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            source_key,
            url,
            datetime.utcnow().isoformat(timespec="seconds") + "Z",
            str(content_path.relative_to(ROOT)),
            file_hash(content_text),
            json.dumps(meta or {}, sort_keys=True),
        ),
    )


def to_int(value: Any) -> int | None:
    if value in (None, "", "-", "null"):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def to_float(value: Any) -> float | None:
    if value in (None, "", "-", "null"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def innings_to_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    text = str(value)
    if "." not in text:
        return to_float(text)
    whole, partial = text.split(".", 1)
    if partial == "0":
        return float(whole)
    if partial == "1":
        return float(whole) + 1 / 3
    if partial == "2":
        return float(whole) + 2 / 3
    return to_float(text)


def starter_from_schedule_or_feed(schedule_game: dict[str, Any], feed_game: dict[str, Any], role: str) -> dict[str, Any]:
    schedule_entry = ((schedule_game.get("teams") or {}).get(role) or {}).get("probablePitcher") or {}
    live_players = (((feed_game.get("liveData") or {}).get("boxscore") or {}).get("teams") or {}).get(role, {}).get("players", {})
    live_starter = {}
    for player in live_players.values():
        pitching = ((player.get("stats") or {}).get("pitching") or {})
        if pitching.get("gamesStarted") == 1:
            live_starter = {
                "id": player.get("person", {}).get("id"),
                "fullName": player.get("person", {}).get("fullName"),
                "stats": pitching,
            }
            break

    person_id = schedule_entry.get("id") or live_starter.get("id")
    full_name = schedule_entry.get("fullName") or live_starter.get("fullName")
    pitch_hand = ((schedule_entry.get("pitchHand") or {}).get("code")) if schedule_entry else None
    pitching = live_starter.get("stats") or {}
    return {
        "pitcher_id": person_id,
        "pitcher_name": full_name,
        "pitch_hand": pitch_hand,
        "wins": to_int(pitching.get("wins")),
        "losses": to_int(pitching.get("losses")),
        "era": to_float(pitching.get("era")),
        "strikeouts": to_int(pitching.get("strikeOuts")),
        "innings_pitched": innings_to_float(pitching.get("inningsPitched")),
        "home_runs_allowed": to_int(pitching.get("homeRuns")),
        "whip": to_float(pitching.get("whip")),
        "raw_json": json.dumps({"schedule": schedule_entry, "feed": live_starter}, sort_keys=True),
    }


def ingest_mlb_day(conn: sqlite3.Connection, date_text: str) -> None:
    init_db(conn)
    schedule_url = MLB_SCHEDULE_URL.format(date=date_text)
    schedule_text = fetch_text(schedule_url)
    schedule_payload = json.loads(schedule_text)
    schedule_path = RAW_DIR / "mlb" / date_text / "schedule.json"
    write_text(schedule_path, schedule_text)
    record_snapshot(
        conn,
        source_key="mlb.schedule",
        url=schedule_url,
        content_path=schedule_path,
        content_text=schedule_text,
        meta={"date": date_text, "totalGames": schedule_payload.get("totalGames")},
    )

    games = schedule_payload.get("dates", [{}])[0].get("games", [])
    for game in games:
        game_pk = game["gamePk"]
        live_url = MLB_FEED_URL.format(game_pk=game_pk)
        live_text = fetch_text(live_url)
        live_payload = json.loads(live_text)
        live_path = RAW_DIR / "mlb" / date_text / "games" / f"{game_pk}-feed-live.json"
        write_text(live_path, live_text)
        record_snapshot(
            conn,
            source_key="mlb.feed_live",
            url=live_url,
            content_path=live_path,
            content_text=live_text,
            meta={"date": date_text, "gamePk": game_pk},
        )

        away_team = game["teams"]["away"]["team"]["name"]
        home_team = game["teams"]["home"]["team"]["name"]
        linescore = (live_payload.get("liveData") or {}).get("linescore") or {}
        conn.execute(
            """
            INSERT INTO mlb_games (
              game_pk, game_date, game_datetime, status, away_team, home_team,
              venue_name, away_score, home_score, raw_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(game_pk) DO UPDATE SET
              game_date=excluded.game_date,
              game_datetime=excluded.game_datetime,
              status=excluded.status,
              away_team=excluded.away_team,
              home_team=excluded.home_team,
              venue_name=excluded.venue_name,
              away_score=excluded.away_score,
              home_score=excluded.home_score,
              raw_path=excluded.raw_path
            """,
            (
                game_pk,
                date_text,
                game.get("gameDate"),
                game.get("status", {}).get("detailedState"),
                away_team,
                home_team,
                game.get("venue", {}).get("name"),
                to_int(linescore.get("teams", {}).get("away", {}).get("runs")),
                to_int(linescore.get("teams", {}).get("home", {}).get("runs")),
                str(live_path.relative_to(ROOT)),
            ),
        )

        for role in ("away", "home"):
            starter = starter_from_schedule_or_feed(game, live_payload, role)
            conn.execute(
                """
                INSERT INTO mlb_starting_pitchers (
                  game_pk, team_role, pitcher_id, pitcher_name, pitch_hand, wins, losses,
                  era, strikeouts, innings_pitched, home_runs_allowed, whip, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(game_pk, team_role) DO UPDATE SET
                  pitcher_id=excluded.pitcher_id,
                  pitcher_name=excluded.pitcher_name,
                  pitch_hand=excluded.pitch_hand,
                  wins=excluded.wins,
                  losses=excluded.losses,
                  era=excluded.era,
                  strikeouts=excluded.strikeouts,
                  innings_pitched=excluded.innings_pitched,
                  home_runs_allowed=excluded.home_runs_allowed,
                  whip=excluded.whip,
                  raw_json=excluded.raw_json
                """,
                (
                    game_pk,
                    role,
                    starter["pitcher_id"],
                    starter["pitcher_name"],
                    starter["pitch_hand"],
                    starter["wins"],
                    starter["losses"],
                    starter["era"],
                    starter["strikeouts"],
                    starter["innings_pitched"],
                    starter["home_runs_allowed"],
                    starter["whip"],
                    starter["raw_json"],
                ),
            )

        for play in ((live_payload.get("liveData") or {}).get("plays") or {}).get("allPlays", []):
            if ((play.get("result") or {}).get("event")) != "Home Run":
                continue
            about = play.get("about") or {}
            event_key = f"{game_pk}:{about.get('atBatIndex')}:{about.get('halfInning')}:{about.get('inning')}"
            is_top = about.get("isTopInning")
            batting_team = away_team if is_top else home_team
            fielding_team = home_team if is_top else away_team
            conn.execute(
                """
                INSERT INTO mlb_home_run_events (
                  event_key, game_pk, game_date, game_datetime, inning, half_inning,
                  batter_id, batter_name, pitcher_id, pitcher_name, batting_team,
                  fielding_team, description, rbi, away_score, home_score, statcast_play_id, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(event_key) DO UPDATE SET
                  batter_id=excluded.batter_id,
                  batter_name=excluded.batter_name,
                  pitcher_id=excluded.pitcher_id,
                  pitcher_name=excluded.pitcher_name,
                  batting_team=excluded.batting_team,
                  fielding_team=excluded.fielding_team,
                  description=excluded.description,
                  rbi=excluded.rbi,
                  away_score=excluded.away_score,
                  home_score=excluded.home_score,
                  statcast_play_id=excluded.statcast_play_id,
                  raw_json=excluded.raw_json
                """,
                (
                    event_key,
                    game_pk,
                    date_text,
                    game.get("gameDate"),
                    to_int(about.get("inning")),
                    about.get("halfInning"),
                    to_int(((play.get("matchup") or {}).get("batter") or {}).get("id")),
                    ((play.get("matchup") or {}).get("batter") or {}).get("fullName"),
                    to_int(((play.get("matchup") or {}).get("pitcher") or {}).get("id")),
                    ((play.get("matchup") or {}).get("pitcher") or {}).get("fullName"),
                    batting_team,
                    fielding_team,
                    (play.get("result") or {}).get("description"),
                    to_int((play.get("result") or {}).get("rbi")),
                    to_int((play.get("result") or {}).get("awayScore")),
                    to_int((play.get("result") or {}).get("homeScore")),
                    None,
                    json.dumps(play, sort_keys=True),
                ),
            )

    conn.commit()


def ingest_statcast_hr_leaderboard(conn: sqlite3.Connection, date_text: str, season: int) -> None:
    init_db(conn)
    csv_url = STATCAST_HOME_RUNS_CSV_URL.format(season=season)
    csv_text = fetch_text(csv_url)
    csv_path = RAW_DIR / "statcast" / "home-runs" / f"{date_text}-season-{season}.csv"
    write_text(csv_path, csv_text)
    record_snapshot(
        conn,
        source_key="statcast.home_runs_csv",
        url=csv_url,
        content_path=csv_path,
        content_text=csv_text,
        meta={"date": date_text, "season": season},
    )

    rows = list(csv.DictReader(io.StringIO(csv_text.lstrip("\ufeff"))))
    for row in rows:
        conn.execute(
            """
            INSERT INTO statcast_hr_leaderboard_snapshots (
              snapshot_date, season, player_id, player_name, team_abbrev, hr_total, xhr,
              xhr_diff, no_doubters, mostly_gone, doubters, no_doubter_per, avg_hr_trot, source_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(snapshot_date, season, player_id) DO UPDATE SET
              player_name=excluded.player_name,
              team_abbrev=excluded.team_abbrev,
              hr_total=excluded.hr_total,
              xhr=excluded.xhr,
              xhr_diff=excluded.xhr_diff,
              no_doubters=excluded.no_doubters,
              mostly_gone=excluded.mostly_gone,
              doubters=excluded.doubters,
              no_doubter_per=excluded.no_doubter_per,
              avg_hr_trot=excluded.avg_hr_trot,
              source_url=excluded.source_url
            """,
            (
                date_text,
                season,
                to_int(row.get("player_id")),
                row.get("player"),
                row.get("team_abbrev"),
                to_float(row.get("hr_total")),
                to_float(row.get("xhr")),
                to_float(row.get("xhr_diff")),
                to_float(row.get("no_doubters")),
                to_float(row.get("mostly_gone")),
                to_float(row.get("doubters")),
                to_float(row.get("no_doubter_per")),
                to_float(row.get("avg_hr_trot")),
                csv_url,
            ),
        )

    conn.commit()


def import_predictions(conn: sqlite3.Connection, file_path: Path) -> None:
    init_db(conn)
    payload = json.loads(file_path.read_text(encoding="utf-8"))
    date_text = payload["date"]
    model_name = payload["modelName"]
    picks = payload["picks"]

    for pick in picks:
        metadata = {
            "seasonHr": pick.get("seasonHr"),
            "seasonXHR": pick.get("seasonXHR"),
            "xhrDiff": pick.get("xhrDiff"),
            "recentHrSinceMay1": pick.get("recentHrSinceMay1"),
            "homeRunsLast7Days": pick.get("homeRunsLast7Days"),
            "parkHrIndex": pick.get("parkHrIndex"),
            "rationale": pick.get("rationale"),
        }
        conn.execute(
            """
            INSERT INTO mlb_home_run_predictions (
              prediction_date, model_name, rank, player_id, player_name, team_abbrev,
              game_title, opposing_pitcher, score, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(prediction_date, model_name, player_id) DO UPDATE SET
              rank=excluded.rank,
              player_name=excluded.player_name,
              team_abbrev=excluded.team_abbrev,
              game_title=excluded.game_title,
              opposing_pitcher=excluded.opposing_pitcher,
              score=excluded.score,
              metadata_json=excluded.metadata_json
            """,
            (
                date_text,
                model_name,
                to_int(pick.get("rank")),
                to_int(pick.get("playerId")),
                pick.get("playerName"),
                pick.get("teamAbbrev"),
                pick.get("gameTitle"),
                pick.get("opposingPitcher"),
                to_float(pick.get("score")),
                json.dumps(metadata, sort_keys=True),
            ),
        )

    conn.commit()


def grade_home_run_picks(conn: sqlite3.Connection, date_text: str, model_name: str) -> list[sqlite3.Row]:
    init_db(conn)
    rows = conn.execute(
        """
        SELECT
          p.prediction_date,
          p.model_name,
          p.player_id,
          p.player_name,
          p.team_abbrev,
          COUNT(e.event_key) AS actual_home_runs,
          GROUP_CONCAT(e.event_key, ',') AS matched_event_keys
        FROM mlb_home_run_predictions p
        LEFT JOIN mlb_home_run_events e
          ON e.game_date = p.prediction_date
         AND e.batter_id = p.player_id
        WHERE p.prediction_date = ?
          AND p.model_name = ?
        GROUP BY p.prediction_date, p.model_name, p.player_id, p.player_name, p.team_abbrev
        ORDER BY p.rank ASC
        """,
        (date_text, model_name),
    ).fetchall()

    for row in rows:
        conn.execute(
            """
            INSERT INTO mlb_home_run_backtests (
              prediction_date, model_name, player_id, player_name, team_abbrev,
              actual_home_runs, hit_flag, matched_event_keys
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(prediction_date, model_name, player_id) DO UPDATE SET
              player_name=excluded.player_name,
              team_abbrev=excluded.team_abbrev,
              actual_home_runs=excluded.actual_home_runs,
              hit_flag=excluded.hit_flag,
              matched_event_keys=excluded.matched_event_keys
            """,
            (
                row["prediction_date"],
                row["model_name"],
                row["player_id"],
                row["player_name"],
                row["team_abbrev"],
                row["actual_home_runs"],
                1 if row["actual_home_runs"] else 0,
                row["matched_event_keys"],
            ),
        )

    conn.commit()
    return rows


def list_home_runs(conn: sqlite3.Connection, date_text: str) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT
          e.game_date,
          g.away_team || ' @ ' || g.home_team AS game_title,
          e.inning,
          e.half_inning,
          e.batter_name,
          e.pitcher_name,
          e.description
        FROM mlb_home_run_events e
        JOIN mlb_games g ON g.game_pk = e.game_pk
        WHERE e.game_date = ?
        ORDER BY g.game_datetime, e.inning, e.half_inning
        """,
        (date_text,),
    ).fetchall()


def print_backtest_summary(rows: list[sqlite3.Row]) -> None:
    hits = [row for row in rows if row["actual_home_runs"]]
    print(f"Tracked picks: {len(rows)}")
    print(f"Players who homered: {len(hits)}")
    if hits:
        print("")
        print("Hits:")
        for row in hits:
            print(f"- {row['player_name']} ({row['team_abbrev']}) | {row['actual_home_runs']} HR")
    misses = [row for row in rows if not row["actual_home_runs"]]
    if misses:
        print("")
        print("Misses:")
        for row in misses[:10]:
            print(f"- {row['player_name']} ({row['team_abbrev']})")


def print_home_run_list(rows: list[sqlite3.Row]) -> None:
    print(f"Home runs tracked: {len(rows)}")
    for row in rows:
        print(
            f"- {row['game_title']} | {row['half_inning']} {row['inning']} | "
            f"{row['batter_name']} off {row['pitcher_name']} | {row['description']}"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local MLB home-run warehouse utilities.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("init-db", help="Create or upgrade the local SQLite warehouse schema.")

    ingest_day = subparsers.add_parser("ingest-mlb-day", help="Fetch MLB schedule, feed/live data, and home-run events.")
    ingest_day.add_argument("--date", required=True, help="Date in YYYY-MM-DD format.")

    ingest_hr = subparsers.add_parser(
        "ingest-statcast-hr",
        help="Fetch and store a Statcast home-run leaderboard snapshot for a season.",
    )
    ingest_hr.add_argument("--date", required=True, help="Snapshot date in YYYY-MM-DD format.")
    ingest_hr.add_argument("--season", required=True, type=int, help="Season year.")

    import_picks = subparsers.add_parser("import-predictions", help="Import a saved HR prediction snapshot JSON file.")
    import_picks.add_argument("--file", required=True, help="Path to the JSON prediction file.")

    grade = subparsers.add_parser("grade-home-run-picks", help="Compare stored predictions against actual HR events.")
    grade.add_argument("--date", required=True, help="Prediction date in YYYY-MM-DD format.")
    grade.add_argument("--model-name", required=True, help="Model name stored in the prediction snapshot.")

    list_events = subparsers.add_parser("list-home-runs", help="Print all actual home runs stored for a date.")
    list_events.add_argument("--date", required=True, help="Date in YYYY-MM-DD format.")

    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with get_connection() as conn:
        if args.command == "init-db":
            init_db(conn)
            print(f"Initialized warehouse at {DB_PATH}")
            return

        if args.command == "ingest-mlb-day":
            ingest_mlb_day(conn, args.date)
            print(f"Ingested MLB games and HR events for {args.date}")
            return

        if args.command == "ingest-statcast-hr":
            ingest_statcast_hr_leaderboard(conn, args.date, args.season)
            print(f"Ingested Statcast HR leaderboard for {args.season} using snapshot date {args.date}")
            return

        if args.command == "import-predictions":
            import_predictions(conn, Path(args.file))
            print(f"Imported predictions from {args.file}")
            return

        if args.command == "grade-home-run-picks":
            rows = grade_home_run_picks(conn, args.date, args.model_name)
            print_backtest_summary(rows)
            return

        if args.command == "list-home-runs":
            rows = list_home_runs(conn, args.date)
            print_home_run_list(rows)
            return


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
from __future__ import annotations

import argparse
import gzip
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[3]
RAW_ROOT = ROOT / "data-private" / "raw" / "mlb"
SCHEDULE_URL = "https://statsapi.mlb.com/api/v1/schedule?sportId=1&date={date}&hydrate=probablePitcher,team"
FEED_URL = "https://statsapi.mlb.com/api/v1.1/game/{game_pk}/feed/live"
USER_AGENT = "SportsTradingBoardBot/1.0 typed-mlb-raw-fetcher"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch MLB schedule and feed/live raw snapshots.")
    parser.add_argument("--start-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--end-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--raw-root", type=Path, default=RAW_ROOT)
    parser.add_argument("--skip-existing", action="store_true")
    parser.add_argument("--delay-ms", type=int, default=650, help="Pause between feed requests.")
    parser.add_argument("--max-dates", type=int, help="Maximum number of dates to fetch from the requested range.")
    return parser.parse_args()


def daterange(start_date: str, end_date: str) -> list[str]:
    current = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()
    dates = []
    while current <= end:
        dates.append(current.isoformat())
        current += timedelta(days=1)
    return dates


def fetch_text(url: str) -> str:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=60) as response:
        return response.read().decode("utf-8")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def write_gzip_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(path, "wt", encoding="utf-8") as handle:
        handle.write(text)


def fetch_day(date_text: str, raw_root: Path, skip_existing: bool, delay_ms: int) -> dict:
    day_root = raw_root / date_text
    schedule_path = day_root / "schedule.json"
    schedule_url = SCHEDULE_URL.format(date=date_text)
    if skip_existing and schedule_path.exists():
        schedule_text = schedule_path.read_text(encoding="utf-8")
    else:
        schedule_text = fetch_text(schedule_url)
        write_text(schedule_path, schedule_text)
    schedule = json.loads(schedule_text)
    games = [
        game
        for date_entry in schedule.get("dates", []) or []
        for game in date_entry.get("games", []) or []
        if isinstance(game, dict) and game.get("gamePk") is not None
    ]

    fetched = 0
    skipped = 0
    errors = []
    for index, game in enumerate(games):
        game_pk = int(game["gamePk"])
        feed_path = day_root / "games" / f"{game_pk}-feed-live.json.gz"
        if skip_existing and feed_path.exists():
            skipped += 1
            continue
        try:
            feed_text = fetch_text(FEED_URL.format(game_pk=game_pk))
            write_gzip_text(feed_path, feed_text)
            fetched += 1
        except Exception as exc:  # noqa: BLE001
            errors.append({"gamePk": game_pk, "error": str(exc)})
        if delay_ms > 0 and index < len(games) - 1:
            time.sleep(delay_ms / 1000)

    return {
        "date": date_text,
        "schedulePath": str(schedule_path.relative_to(ROOT)),
        "totalGames": len(games),
        "feedsFetched": fetched,
        "feedsSkipped": skipped,
        "errors": errors,
        "ok": not errors,
    }


def main() -> int:
    args = parse_args()
    raw_root = args.raw_root if args.raw_root.is_absolute() else ROOT / args.raw_root
    dates = daterange(args.start_date, args.end_date)
    if args.max_dates is not None:
        dates = dates[: max(args.max_dates, 0)]
    reports = [fetch_day(date_text, raw_root, args.skip_existing, max(args.delay_ms, 0)) for date_text in dates]
    print(json.dumps({"reports": reports, "ok": all(report["ok"] for report in reports)}, indent=2))
    return 0 if all(report["ok"] for report in reports) else 1


if __name__ == "__main__":
    raise SystemExit(main())

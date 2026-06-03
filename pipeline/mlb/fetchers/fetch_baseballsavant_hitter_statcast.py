#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta
from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[3]
RAW_ROOT = ROOT / "data-private" / "raw" / "baseballsavant" / "hitter-statcast"
USER_AGENT = "SportsTradingBoardBot/1.0 typed-mlb-raw-fetcher"
GROUPED_URL = (
    "https://baseballsavant.mlb.com/statcast_search/csv"
    "?all=true&player_type=batter&group_by=name-date&sort_col=player_name&sort_order=asc"
    "&game_date_gt={start_date}&game_date_lt={end_date}"
)
DETAILS_URL = (
    "https://baseballsavant.mlb.com/statcast_search/csv"
    "?all=true&player_type=batter&type=details&sort_col=player_name&sort_order=asc"
    "&game_date_gt={start_date}&game_date_lt={end_date}"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch Baseball Savant hitter Statcast grouped/details CSV snapshots.")
    parser.add_argument("--start-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--end-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--raw-root", type=Path, default=RAW_ROOT)
    parser.add_argument("--skip-existing", action="store_true")
    return parser.parse_args()


def daterange(start_date: str, end_date: str) -> list[str]:
    current = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()
    if end < current:
        raise ValueError("end-date must be on or after start-date")
    dates = []
    while current <= end:
        dates.append(current.isoformat())
        current += timedelta(days=1)
    return dates


def fetch_text(url: str) -> str:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=120) as response:
        return response.read().decode("utf-8-sig")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def non_header_row_count(text: str) -> int:
    return max(0, sum(1 for line in text.splitlines() if line.strip()) - 1)


def fetch_csv(path: Path, url: str, skip_existing: bool) -> tuple[str, bool]:
    if skip_existing and path.exists():
        return path.read_text(encoding="utf-8-sig"), False
    text = fetch_text(url)
    write_text(path, text)
    return text, True


def fetch_day(date_text: str, raw_root: Path, skip_existing: bool) -> dict:
    game_date = datetime.strptime(date_text, "%Y-%m-%d").date()
    next_date = (game_date + timedelta(days=1)).isoformat()
    day_root = raw_root / date_text
    grouped_path = day_root / "grouped.csv"
    details_path = day_root / "details.csv"
    grouped_url = GROUPED_URL.format(start_date=date_text, end_date=next_date)
    details_url = DETAILS_URL.format(start_date=date_text, end_date=next_date)

    errors = []
    grouped_text = ""
    details_text = ""
    grouped_fetched = False
    details_fetched = False
    try:
        grouped_text, grouped_fetched = fetch_csv(grouped_path, grouped_url, skip_existing)
    except Exception as exc:  # noqa: BLE001
        errors.append({"file": "grouped.csv", "error": str(exc), "url": grouped_url})
    try:
        details_text, details_fetched = fetch_csv(details_path, details_url, skip_existing)
    except Exception as exc:  # noqa: BLE001
        errors.append({"file": "details.csv", "error": str(exc), "url": details_url})

    return {
        "date": date_text,
        "groupedPath": str(grouped_path.relative_to(ROOT)),
        "detailsPath": str(details_path.relative_to(ROOT)),
        "groupedRows": non_header_row_count(grouped_text) if grouped_text else 0,
        "detailsRows": non_header_row_count(details_text) if details_text else 0,
        "groupedFetched": grouped_fetched,
        "detailsFetched": details_fetched,
        "errors": errors,
        "ok": not errors,
    }


def main() -> int:
    args = parse_args()
    raw_root = args.raw_root if args.raw_root.is_absolute() else ROOT / args.raw_root
    reports = [fetch_day(date_text, raw_root, args.skip_existing) for date_text in daterange(args.start_date, args.end_date)]
    print(json.dumps({"reports": reports, "ok": all(report["ok"] for report in reports)}, indent=2))
    return 0 if all(report["ok"] for report in reports) else 1


if __name__ == "__main__":
    raise SystemExit(main())

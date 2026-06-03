#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[3]
RAW_ROOT = ROOT / "data-private" / "raw" / "mlb-stats-api" / "hitter-career-profiles"
REPORT_DIR = ROOT / "data-migration" / "reports"
MLB_HITTER_PROFILE_URL = (
    "https://statsapi.mlb.com/api/v1/people"
    "?personIds={player_ids}&hydrate=stats(group=[hitting],type=[yearByYear,career],sportId=1)"
)
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0 Safari/537.36"
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def batched(values: list[int], size: int) -> list[list[int]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def parse_player_ids(values: list[str] | None) -> list[int]:
    ids: set[int] = set()
    for value in values or []:
        for part in str(value).split(","):
            part = part.strip()
            if not part:
                continue
            ids.add(int(part))
    return sorted(ids)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch MLB Stats API hitter identity/career profile receipts for typed player-context ingestion."
    )
    parser.add_argument("--date", required=True, help="Snapshot date in YYYY-MM-DD format.")
    parser.add_argument("--player-id", action="append", dest="player_ids", help="MLB player id. Repeat or comma-separate.")
    parser.add_argument("--batch-size", type=int, default=24, help="Number of player ids per Stats API request.")
    parser.add_argument("--sleep-seconds", type=float, default=0.0, help="Optional delay between requests.")
    parser.add_argument("--dry-run", action="store_true", help="Report planned batches without fetching or writing raw files.")
    parser.add_argument("--raw-root", type=Path, default=RAW_ROOT, help="Raw receipt root.")
    parser.add_argument("--report", type=Path, help="JSON report path.")
    args = parser.parse_args()
    args.player_ids = parse_player_ids(args.player_ids)
    if args.batch_size <= 0:
        raise ValueError("--batch-size must be positive")
    if not args.raw_root.is_absolute():
        args.raw_root = ROOT / args.raw_root
    if args.report is None:
        args.report = REPORT_DIR / f"fetch_mlb_hitter_career_profiles_{args.date}.json"
    elif not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def request_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT, "X-Requested-With": "XMLHttpRequest"})
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", "ignore")


def write_json_report(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    batches = batched(args.player_ids, args.batch_size)
    day_root = args.raw_root / args.date
    report = {
        "generated_at": utc_now(),
        "script": "pipeline/mlb/fetchers/fetch_mlb_hitter_career_profiles.py",
        "date": args.date,
        "dry_run": args.dry_run,
        "raw_root": str(args.raw_root.relative_to(ROOT)),
        "player_count": len(args.player_ids),
        "batch_size": args.batch_size,
        "batch_count": len(batches),
        "written_files": [],
        "people": 0,
        "ok": True,
        "errors": [],
    }

    if args.dry_run:
        report["planned_batches"] = [batch for batch in batches]
        write_json_report(args.report, report)
        print(json.dumps(report, indent=2, sort_keys=True))
        return 0

    day_root.mkdir(parents=True, exist_ok=True)
    for index, batch in enumerate(batches, start=1):
        url = MLB_HITTER_PROFILE_URL.format(player_ids=",".join(str(player_id) for player_id in batch))
        output_path = day_root / f"profiles-{index}.json"
        try:
            content_text = request_text(url)
            payload = json.loads(content_text)
            people = payload.get("people") or []
            output_path.write_text(content_text, encoding="utf-8")
            report["people"] += len(people)
            report["written_files"].append(
                {
                    "path": str(output_path.relative_to(ROOT)),
                    "player_ids": batch,
                    "people": len(people),
                    "url": url,
                }
            )
            if args.sleep_seconds > 0 and index < len(batches):
                time.sleep(args.sleep_seconds)
        except Exception as exc:
            report["ok"] = False
            report["errors"].append({"batch": index, "player_ids": batch, "error": str(exc)})

    write_json_report(args.report, report)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

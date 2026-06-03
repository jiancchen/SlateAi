#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.sources.mlb.normalization.common import (  # noqa: E402
    MlbIdentityResolver,
    append_normalization_event,
    compact_json,
    insert_value_rows,
    stable_id,
    utc_now,
    write_report,
)
from pipeline.sources.mlb.normalization.market_raw_context import (  # noqa: E402
    ensure_market_raw_schema,
    parse_kalshi_payload,
    parse_robinhood_payload,
    read_json_file,
)


ODDS_SOURCE_NAME = "mlb_odds"
PROPS_SOURCE_NAME = "mlb_props"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    parser.add_argument(
        "--source-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "ingest_mlb_markets_props_raw_to_typed_2026-05-31.json",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def sql_path(path: Path) -> str:
    return str(path.relative_to(ROOT))


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cache_valid_until(now_iso: str, ttl_hours: float) -> str:
    try:
        now = datetime.fromisoformat(now_iso.replace("Z", "+00:00"))
    except ValueError:
        now = datetime.now(timezone.utc)
    return (now + timedelta(hours=ttl_hours)).isoformat()


def candidate_odds_files(date: str) -> list[Path]:
    candidates = [
        ROOT / "data-private" / "odds" / "kalshi" / "mlb" / f"{date}-kalshi-markets.json",
        ROOT / "data-private" / "odds" / "robinhood" / "mlb" / f"{date}-robinhood-baseball-visible-markets.json",
    ]
    return [path for path in candidates if path.exists()]


def source_snapshot_id_for(source_name: str, local_path: str) -> str:
    return f"mlb-{stable_id(source_name, local_path, length=32)}"


def ensure_source_snapshot(con: sqlite3.Connection, source_name: str, file_path: Path, payload: dict[str, Any], date: str) -> str:
    local_path = sql_path(file_path)
    snapshot_id = source_snapshot_id_for(source_name, local_path)
    notes = {
        "root": str(file_path.parent.relative_to(ROOT)),
        "parser_module": "pipeline/sources/mlb/normalization/market_raw_context.py",
        "active_raw_to_typed_adapter": True,
        "requested_date": date,
        "source": payload.get("source"),
        "source_url": payload.get("url"),
        "parse_family": "kalshi_markets" if "kalshi" in file_path.name else "robinhood_visible_markets",
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
            payload.get("url"),
            local_path,
            payload.get("fetchedAt") or utc_now(),
            date,
            sha256_file(file_path),
            compact_json(notes),
        ),
    )
    return snapshot_id


def count_prop_rows(con: sqlite3.Connection, date: str) -> int:
    return int(
        con.execute(
            """
            select count(*)
            from prop_market_snapshots
            where substr(coalesce(market_date, captured_at, ''), 1, 10) = ?
            """,
            (date,),
        ).fetchone()[0]
        or 0
    )


def count_direct_market_rows(con: sqlite3.Connection, date: str) -> int:
    return int(
        con.execute(
            """
            select count(*)
            from market_snapshots
            where source_name = 'fanduel_research'
              and substr(coalesce(captured_at, ''), 1, 10) = ?
              and game_id is not null
            """,
            (date,),
        ).fetchone()[0]
        or 0
    )


def upsert_fetch_status(
    con: sqlite3.Connection,
    *,
    sport: str,
    source_name: str,
    source_family: str,
    source_date: str,
    status: str,
    completeness: str,
    ttl_hours: float,
    expected: int | None,
    actual: int,
    missing: int | None,
    unresolved: int,
    run_reason: str,
    report_path: Path,
    source_snapshot_id: str | None,
    details: dict[str, Any],
) -> None:
    now = utc_now()
    run_id = f"source-fetch-{source_name}-{source_date}-{now.replace(':', '-').replace('.', '-')}"
    detail_json = compact_json({**details, "report_path": sql_path(report_path)})
    con.execute(
        """
        insert into source_fetch_runs (
          source_fetch_run_id, sport, source_name, source_family, source_date,
          run_reason, requested_url, cache_status, cache_ttl_hours, previous_success_at,
          status, completeness_status, expected_item_count, actual_item_count,
          missing_item_count, source_snapshot_id, started_at, finished_at,
          error_code, error_message, details_json
        ) values (?, ?, ?, ?, ?, ?, null, 'not_applicable', ?,
          (select last_success_at from source_fetch_status where sport=? and source_name=? and source_date=?),
          ?, ?, ?, ?, ?, ?, ?, ?, null, null, ?)
        """,
        (
            run_id,
            sport,
            source_name,
            source_family,
            source_date,
            run_reason,
            ttl_hours,
            sport,
            source_name,
            source_date,
            status,
            completeness,
            expected,
            actual,
            missing,
            source_snapshot_id,
            now,
            now,
            detail_json,
        ),
    )
    con.execute(
        """
        insert into source_fetch_status (
          source_fetch_status_id, sport, source_name, source_family, source_date,
          last_fetch_run_id, last_attempt_at, last_success_at, last_status,
          last_completeness_status, cache_valid_until, expected_item_count,
          actual_item_count, missing_item_count, unresolved_count, updated_at, notes
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            f"{sport}:{source_name}:{source_date}",
            sport,
            source_name,
            source_family,
            source_date,
            run_id,
            now,
            now if status == "success" else None,
            status,
            completeness,
            cache_valid_until(now, ttl_hours),
            expected,
            actual,
            missing,
            unresolved,
            now,
            detail_json,
        ),
    )


def upsert_health_check(con: sqlite3.Connection, check_id: str, check_name: str, status: str, expected: int | None, actual: int, details: dict[str, Any]) -> None:
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
        (check_id, check_name, status, expected, actual, compact_json(details), utc_now()),
    )


def ingest(args: argparse.Namespace) -> dict[str, Any]:
    files = candidate_odds_files(args.date)
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        con.execute("pragma foreign_keys = on")
        con.execute("begin")
        ensure_market_raw_schema(con)
        resolver = MlbIdentityResolver(con)
        before = {
            "source_snapshots": con.execute("select count(*) from source_snapshots").fetchone()[0],
            "market_contracts": con.execute("select count(*) from market_contracts").fetchone()[0],
            "market_price_ticks": con.execute("select count(*) from market_price_ticks").fetchone()[0],
            "market_snapshots": con.execute("select count(*) from market_snapshots").fetchone()[0],
            "prop_market_snapshots": con.execute("select count(*) from prop_market_snapshots").fetchone()[0],
            "unresolved_entities": con.execute("select count(*) from unresolved_entities").fetchone()[0],
        }
        all_contracts: list[dict[str, Any]] = []
        all_ticks: list[dict[str, Any]] = []
        all_snapshots: list[dict[str, Any]] = []
        source_snapshot_ids: list[str] = []
        counts: dict[str, Any] = {
            "source_files": len(files),
            "source_games": 0,
            "source_rows": 0,
            "parsed_contracts": 0,
            "parsed_ticks": 0,
            "parsed_snapshots": 0,
            "unmapped_games": 0,
            "by_file": {},
        }
        for file_path in files:
            payload = read_json_file(file_path)
            snapshot_id = ensure_source_snapshot(con, ODDS_SOURCE_NAME, file_path, payload, args.date)
            source_snapshot_ids.append(snapshot_id)
            if "kalshi" in file_path.name:
                parsed = parse_kalshi_payload(payload, resolver, date=args.date, source_snapshot_id=snapshot_id, local_path=sql_path(file_path))
            elif "robinhood" in file_path.name:
                parsed = parse_robinhood_payload(payload, resolver, date=args.date, source_snapshot_id=snapshot_id, local_path=sql_path(file_path))
            else:
                continue
            all_contracts.extend(parsed.contracts)
            all_ticks.extend(parsed.ticks)
            all_snapshots.extend(parsed.snapshots)
            counts["by_file"][sql_path(file_path)] = parsed.counts
            for key in ["source_games", "source_rows", "parsed_contracts", "parsed_ticks", "parsed_snapshots", "unmapped_games"]:
                counts[key] += parsed.counts.get(key, 0)
        inserted = {"market_contracts": 0, "market_price_ticks": 0, "market_snapshots": 0}
        if not args.dry_run:
            inserted.update(insert_value_rows(con, [("market_contracts", row) for row in all_contracts]))
            inserted.update(insert_value_rows(con, [("market_price_ticks", row) for row in all_ticks]))
            inserted.update(insert_value_rows(con, [("market_snapshots", row) for row in all_snapshots]))
        prop_count = count_prop_rows(con, args.date)
        direct_market_count = count_direct_market_rows(con, args.date)
        after = {
            "source_snapshots": con.execute("select count(*) from source_snapshots").fetchone()[0],
            "market_contracts": con.execute("select count(*) from market_contracts").fetchone()[0],
            "market_price_ticks": con.execute("select count(*) from market_price_ticks").fetchone()[0],
            "market_snapshots": con.execute("select count(*) from market_snapshots").fetchone()[0],
            "prop_market_snapshots": con.execute("select count(*) from prop_market_snapshots").fetchone()[0],
            "unresolved_entities": con.execute("select count(*) from unresolved_entities").fetchone()[0],
        }
        odds_status = "success" if (files and all_snapshots) or direct_market_count > 0 else "missing"
        odds_completeness = "complete" if odds_status == "success" and counts["unmapped_games"] == 0 else ("partial" if odds_status == "success" else "missing")
        props_status = "success" if prop_count > 0 else "missing"
        props_completeness = "complete" if prop_count > 0 else "missing"
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/ingest_mlb_markets_props_raw_to_typed.py",
            "parser_module": "pipeline/sources/mlb/normalization/market_raw_context.py",
            "source_db": sql_path(args.source_db),
            "date": args.date,
            "dry_run": args.dry_run,
            **counts,
            "inserted": inserted,
            "source_snapshot_rows": len(source_snapshot_ids),
            "direct_market_snapshots_for_date": direct_market_count,
            "prop_market_snapshots_for_date": prop_count,
            "odds_status": odds_status,
            "odds_completeness": odds_completeness,
            "props_status": props_status,
            "props_completeness": props_completeness,
            "before_counts": before,
            "after_counts": after,
            "row_count_delta": {key: after[key] - before[key] for key in before},
            "sample_source_snapshots": source_snapshot_ids[:8],
            "ok": odds_status == "success" and props_status == "success",
        }
        if args.dry_run:
            con.rollback()
        else:
            upsert_fetch_status(
                con,
                sport="mlb",
                source_name=ODDS_SOURCE_NAME,
                source_family="markets",
                source_date=args.date,
                status=odds_status,
                completeness=odds_completeness,
                ttl_hours=1,
                expected=counts["source_rows"],
                actual=len(all_snapshots) + direct_market_count,
                missing=max(0, counts["source_rows"] - len(all_snapshots) - direct_market_count),
                unresolved=counts["unmapped_games"],
                run_reason="typed_parse",
                report_path=args.report,
                source_snapshot_id=source_snapshot_ids[0] if source_snapshot_ids else None,
                details={"adapter": "mlb_markets_raw_to_typed", **counts},
            )
            upsert_fetch_status(
                con,
                sport="mlb",
                source_name=PROPS_SOURCE_NAME,
                source_family="props",
                source_date=args.date,
                status=props_status,
                completeness=props_completeness,
                ttl_hours=1,
                expected=None,
                actual=prop_count,
                missing=None,
                unresolved=0,
                run_reason="typed_feature_status",
                report_path=args.report,
                source_snapshot_id=None,
                details={"adapter": "mlb_props_typed_status", "prop_market_snapshots_for_date": prop_count},
            )
            upsert_health_check(
                con,
                f"mlb-markets-raw-to-typed:{args.date}",
                f"mlb_markets_raw_to_typed:{args.date}",
                "ok" if odds_status == "success" else "blocked",
                counts["source_rows"],
                len(all_snapshots),
                report,
            )
            upsert_health_check(
                con,
                f"mlb-props-source-status:{args.date}",
                f"mlb_props_source_status:{args.date}",
                "ok" if props_status == "success" else "blocked",
                None,
                prop_count,
                report,
            )
            con.commit()
            append_normalization_event(
                ROOT,
                {
                    "event_id": f"phase9f-mlb-markets-props-raw-to-typed-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
                    "timestamp": utc_now(),
                    "phase": "9F",
                    "area": "mlb_markets_props_raw_to_typed",
                    "source": "data-private/odds/{kalshi,robinhood}/mlb + typed prop_market_snapshots",
                    "target": "sql-mlb.db:market_contracts,market_price_ticks,market_snapshots,source_fetch_status",
                    "parser_module": "pipeline/sources/mlb/normalization/market_raw_context.py",
                    "migration_script": "data-migration/scripts/ingest_mlb_markets_props_raw_to_typed.py",
                    "validation": "pending",
                    "status_from": "started",
                    "status_to": "inserted",
                    "report_path": sql_path(args.report),
                    "checksum": None,
                    "notes": compact_json({"date": args.date, "odds_snapshots": len(all_snapshots), "prop_snapshots": prop_count}),
                },
            )
        write_report(args.report, report)
        return report


def main() -> int:
    args = parse_args()
    report = ingest(args)
    print(compact_json({k: report[k] for k in ["date", "dry_run", "source_files", "parsed_snapshots", "prop_market_snapshots_for_date", "ok"]}))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

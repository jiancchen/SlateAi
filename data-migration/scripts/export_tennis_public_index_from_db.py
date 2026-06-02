#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def default_db(root: Path) -> Path:
    return root / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def compact_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def label_from_date(date: str) -> str:
    parsed = datetime.strptime(date, "%Y-%m-%d")
    return f"{parsed.strftime('%B')} {parsed.day}, {parsed.year}"


def fetch_json_rows(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    con.row_factory = sqlite3.Row
    return [dict(row) for row in con.execute(sql, params).fetchall()]


def split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item for item in value.split("||") if item]


def load_date_rows(con: sqlite3.Connection) -> list[dict[str, Any]]:
    return fetch_json_rows(
        con,
        """
        select
          m.match_date as date,
          count(*) as match_count,
          group_concat(distinct coalesce(m.status, 'unknown')) as statuses,
          group_concat(distinct coalesce(m.tour, 'unknown')) as tours,
          group_concat(distinct coalesce(m.surface, 'unknown')) as surfaces,
          group_concat(distinct coalesce(t.name, 'unknown')) as tournaments
        from matches m
        left join tournaments t on t.tournament_id = m.tournament_id
        where m.match_date is not null
        group by m.match_date
        order by m.match_date desc
        """,
    )


def load_status_counts(con: sqlite3.Connection) -> dict[str, dict[str, int]]:
    rows = fetch_json_rows(
        con,
        """
        select
          match_date as date,
          coalesce(status, 'unknown') as status,
          count(*) as count
        from matches
        where match_date is not null
        group by match_date, coalesce(status, 'unknown')
        """,
    )
    by_date: dict[str, dict[str, int]] = {}
    for row in rows:
        by_date.setdefault(row["date"], {})[row["status"]] = int(row["count"])
    return by_date


def load_model_rows(con: sqlite3.Connection) -> list[dict[str, Any]]:
    return fetch_json_rows(
        con,
        """
        select
          mr.model_run_id,
          mr.model_id,
          mr.model_version,
          mr.run_date,
          mr.run_type,
          mr.status,
          mr.cartridge_path,
          mr.manifest_path,
          mr.input_hash,
          mr.output_hash,
          count(pr.prediction_row_id) as prediction_rows,
          group_concat(distinct coalesce(pr.lane, 'unknown')) as lanes
        from model_runs mr
        left join prediction_rows pr on pr.model_run_id = mr.model_run_id
        group by
          mr.model_run_id,
          mr.model_id,
          mr.model_version,
          mr.run_date,
          mr.run_type,
          mr.status,
          mr.cartridge_path,
          mr.manifest_path,
          mr.input_hash,
          mr.output_hash
        order by mr.run_date desc, prediction_rows desc, mr.model_id
        """,
    )


def load_export_rows(con: sqlite3.Connection) -> list[dict[str, Any]]:
    return fetch_json_rows(
        con,
        """
        select
          export_manifest_id,
          export_type,
          export_date,
          model_id,
          output_path,
          output_hash,
          row_count,
          created_at
        from export_manifests
        where sport = 'tennis'
        order by export_date desc, export_type, created_at desc
        """,
    )


def build_index(root: Path, source_db: Path) -> dict[str, Any]:
    with sqlite3.connect(source_db) as con:
        date_rows = load_date_rows(con)
        status_counts = load_status_counts(con)
        model_rows = load_model_rows(con)
        export_rows = load_export_rows(con)
        totals = {
            "matchCount": int(con.execute("select count(*) from matches").fetchone()[0]),
            "modelRunCount": int(con.execute("select count(*) from model_runs").fetchone()[0]),
            "predictionRowCount": int(con.execute("select count(*) from prediction_rows").fetchone()[0]),
        }

    models_by_date: dict[str, list[dict[str, Any]]] = {}
    for row in model_rows:
        date = row.get("run_date")
        if not date:
            continue
        models_by_date.setdefault(date, []).append(
            {
                "modelRunId": row["model_run_id"],
                "modelId": row["model_id"],
                "modelVersion": row["model_version"],
                "runType": row["run_type"],
                "status": row["status"],
                "cartridgePath": row["cartridge_path"],
                "manifestPath": row["manifest_path"],
                "inputHash": row["input_hash"],
                "outputHash": row["output_hash"],
                "predictionRows": int(row["prediction_rows"]),
                "lanes": sorted(split_csv(row["lanes"])),
            }
        )

    exports_by_date: dict[str, list[dict[str, Any]]] = {}
    for row in export_rows:
        date = row.get("export_date") or "all"
        exports_by_date.setdefault(date, []).append(
            {
                "exportManifestId": row["export_manifest_id"],
                "exportType": row["export_type"],
                "modelId": row["model_id"],
                "outputPath": row["output_path"],
                "outputHash": row["output_hash"],
                "rowCount": row["row_count"],
                "createdAt": row["created_at"],
            }
        )

    dates = []
    for row in date_rows:
        date = row["date"]
        dates.append(
            {
                "date": date,
                "label": label_from_date(date),
                "matchCount": int(row["match_count"]),
                "statusCounts": status_counts.get(date, {}),
                "tours": sorted(split_csv(row["tours"].replace(",", "||") if row.get("tours") else None)),
                "surfaces": sorted(split_csv(row["surfaces"].replace(",", "||") if row.get("surfaces") else None)),
                "tournaments": sorted(split_csv(row["tournaments"].replace(",", "||") if row.get("tournaments") else None)),
                "models": models_by_date.get(date, []),
                "exports": exports_by_date.get(date, []),
            }
        )

    payload = {
        "id": "tennis-public-index-preview",
        "sport": "tennis",
        "generatedAt": utc_now(),
        "sourceDb": str(source_db.relative_to(root)),
        "contract": "data-migration/contracts/tennis_public_index_contract.md",
        "summary": {
            "dateCount": len(dates),
            **totals,
        },
        "dates": dates,
        "models": [
            {
                "modelRunId": row["model_run_id"],
                "modelId": row["model_id"],
                "modelVersion": row["model_version"],
                "runDate": row["run_date"],
                "runType": row["run_type"],
                "status": row["status"],
                "predictionRows": int(row["prediction_rows"]),
                "lanes": sorted(split_csv(row["lanes"])),
            }
            for row in model_rows
        ],
        "exports": exports_by_date.get("all", []),
    }
    return payload


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def insert_export_manifest(root: Path, args: argparse.Namespace, payload: dict[str, Any], index_path: Path) -> str:
    output_hash = sha256_file(index_path)
    manifest_id = sha256_text(f"tennis-public-index-preview|all|all|{output_hash}")[:32]
    query_hash = sha256_text(
        compact_json(
            {
                "tables": ["matches", "model_runs", "prediction_rows", "export_manifests", "tournaments"],
                "rowCountMetric": "distinct match_date",
            }
        )
    )
    with sqlite3.connect(args.source_db) as con:
        con.execute(
            """
            delete from export_manifests
            where sport = 'tennis'
              and export_type = 'tennis_public_index_preview'
              and export_date = 'all'
              and model_id = 'all'
              and output_path = ?
            """,
            (str(index_path.relative_to(root)),),
        )
        con.execute(
            """
            insert or replace into export_manifests (
              export_manifest_id,
              sport,
              export_type,
              export_date,
              model_id,
              source_db_path,
              source_query_hash,
              output_path,
              output_hash,
              row_count,
              created_at,
              notes
            ) values (?, 'tennis', 'tennis_public_index_preview', 'all', 'all', ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                manifest_id,
                str(args.source_db.relative_to(root)),
                query_hash,
                str(index_path.relative_to(root)),
                output_hash,
                payload["summary"]["dateCount"],
                utc_now(),
                "DB-derived tennis date/model index preview. Not promoted to published-data/web mirror.",
            ),
        )
        con.commit()
    return manifest_id


def append_event(root: Path, event: dict[str, Any]) -> None:
    event_path = root / "data-migration" / "migration_events.jsonl"
    with event_path.open("a", encoding="utf-8") as handle:
        handle.write(compact_json(event) + "\n")


def parse_args() -> argparse.Namespace:
    root = repo_root()
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-db", type=Path, default=default_db(root))
    parser.add_argument("--out-dir", type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = root / args.source_db
    if args.out_dir is None:
        args.out_dir = root / "data-migration" / "export-previews" / "tennis" / "index"
    elif not args.out_dir.is_absolute():
        args.out_dir = root / args.out_dir
    if args.report is None:
        args.report = root / "data-migration" / "reports" / "tennis_public_index_preview_2026-06-02.json"
    elif not args.report.is_absolute():
        args.report = root / args.report
    return args


def main() -> int:
    root = repo_root()
    args = parse_args()
    payload = build_index(root, args.source_db)
    index_path = args.out_dir / "index.json"
    report = {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/export_tennis_public_index_from_db.py",
        "contract": "data-migration/contracts/tennis_public_index_contract.md",
        "dry_run": args.dry_run,
        "source_db": str(args.source_db.relative_to(root)),
        "out_dir": str(args.out_dir.relative_to(root)),
        "index_path": str(index_path.relative_to(root)),
        "date_count": payload["summary"]["dateCount"],
        "match_count": payload["summary"]["matchCount"],
        "model_run_count": payload["summary"]["modelRunCount"],
        "prediction_row_count": payload["summary"]["predictionRowCount"],
        "export_manifest_id": None,
        "ok": True,
    }
    if not args.dry_run:
        if args.out_dir.exists():
            if not args.force:
                raise FileExistsError(f"Export target exists; pass --force to replace: {args.out_dir}")
            shutil.rmtree(args.out_dir)
        write_json(index_path, payload)
        report["export_manifest_id"] = insert_export_manifest(root, args, payload, index_path)
        append_event(
            root,
            {
                "event_id": f"tennis-public-index-preview-{utc_now().replace(':', '-').replace('.', '-')}",
                "timestamp": utc_now(),
                "phase": "8",
                "area": "tennis_db_derived_public_index_preview",
                "source": str(args.source_db.relative_to(root)),
                "target": str(args.out_dir.relative_to(root)),
                "parser_module": "none",
                "migration_script": "data-migration/scripts/export_tennis_public_index_from_db.py",
                "validation": "pending tennis public index validation",
                "status_from": "not_started",
                "status_to": "backfilled",
                "report_path": str(args.report.relative_to(root)),
                "checksum": sha256_text(compact_json(report)),
                "notes": "Preview index only; published-data and web mirrors unchanged.",
            },
        )
    args.report.parent.mkdir(parents=True, exist_ok=True)
    write_json(args.report, report)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

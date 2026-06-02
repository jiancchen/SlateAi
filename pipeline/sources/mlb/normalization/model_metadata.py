from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from typing import Any

from .common import (
    detail_json,
    fetch_legacy_rows,
    insert_value_rows,
    parse_legacy_json,
    source_pk_for_row,
    stable_id,
    utc_now,
)


MODEL_METADATA_SOURCE_TABLES = [
    "model_runs",
    "model_component_runs",
    "model_run_lanes",
    "model_run_artifacts",
]


@dataclass(frozen=True)
class ParsedRow:
    target_table: str
    source_table: str
    legacy_row_id: str
    values: dict[str, Any]


def decode_jsonish(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if not value:
        return {}
    try:
        parsed = json.loads(str(value))
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def model_version_from_payload(payload: dict[str, Any], run_json: dict[str, Any]) -> str | None:
    parts = [
        run_json.get("warehouseVersion"),
        run_json.get("featureVersion"),
        payload.get("model_id") or run_json.get("modelId"),
        run_json.get("reliefAddendum"),
        run_json.get("evaluatorVersion"),
    ]
    filtered = [str(part) for part in parts if part]
    return "/".join(filtered) if filtered else None


def ensure_model_metadata_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    existing = {row["name"] for row in con.execute("pragma table_info(model_runs)").fetchall()}
    for column, ddl in [
        ("snapshot_hash", "text"),
        ("source_hash", "text"),
        ("source_files", "integer"),
        ("input_count", "integer"),
        ("output_count", "integer"),
        ("artifact_summary_json", "text"),
        ("source_table", "text"),
        ("source_pk", "text"),
        ("source_detail_json", "text"),
    ]:
        if column not in existing:
            con.execute(f"alter table model_runs add column {column} {ddl}")
    con.executescript(
        """
        create table if not exists model_component_runs (
          model_component_run_id text primary key,
          parent_model_run_id text not null,
          component_run_id text,
          component_model_id text,
          component_role text,
          status text,
          details_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (parent_model_run_id) references model_runs(model_run_id)
        );
        create index if not exists idx_model_component_parent on model_component_runs (parent_model_run_id);

        create table if not exists model_run_lanes (
          model_run_lane_id text primary key,
          model_run_id text not null,
          lane text not null,
          status text,
          row_count integer,
          graded_count integer,
          hit_count integer,
          miss_count integer,
          hit_pct real,
          avg_pnl_per100 real,
          details_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (model_run_id) references model_runs(model_run_id)
        );
        create index if not exists idx_model_run_lanes_run on model_run_lanes (model_run_id, lane);

        create table if not exists model_run_artifacts (
          model_run_artifact_id text primary key,
          model_run_id text not null,
          artifact_role text,
          artifact_path text,
          sha256 text,
          exists_flag integer,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (model_run_id) references model_runs(model_run_id)
        );
        create index if not exists idx_model_run_artifacts_run on model_run_artifacts (model_run_id, artifact_role);
        """
    )


def parse_model_run(row: sqlite3.Row, payload: dict[str, Any]) -> ParsedRow:
    run_json = decode_jsonish(payload.get("run_json"))
    artifact_summary = decode_jsonish(payload.get("artifact_summary_json"))
    run_id = str(payload.get("run_id") or run_json.get("runId") or source_pk_for_row(row))
    slate_date = payload.get("slate_date") or run_json.get("slateDate") or row["source_date"]
    model_id = str(payload.get("model_id") or run_json.get("modelId") or "MLB-M0")
    created_at = payload.get("locked_at") or run_json.get("snapshottedAt") or payload.get("indexed_at") or utc_now()
    return ParsedRow(
        target_table="model_runs",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "model_run_id": run_id,
            "sport": "mlb",
            "model_id": model_id,
            "model_version": model_version_from_payload(payload, run_json),
            "run_date": str(slate_date),
            "run_type": payload.get("mode") or run_json.get("mode") or "pregame",
            "status": payload.get("status") or run_json.get("status") or "snapshotted",
            "cartridge_path": None,
            "manifest_path": None,
            "input_hash": payload.get("input_hash") or run_json.get("inputHash"),
            "output_hash": payload.get("output_hash") or run_json.get("outputHash") or payload.get("snapshot_hash"),
            "created_at": str(created_at),
            "notes": detail_json(payload),
            "snapshot_hash": payload.get("snapshot_hash") or run_json.get("snapshotHash"),
            "source_hash": payload.get("source_hash") or run_json.get("sourceHash"),
            "source_files": payload.get("source_files") or run_json.get("sourceFiles"),
            "input_count": payload.get("input_count") or run_json.get("inputs"),
            "output_count": payload.get("output_count") or run_json.get("outputs"),
            "artifact_summary_json": json.dumps(artifact_summary, sort_keys=True) if artifact_summary else None,
            "source_table": row["source_table"],
            "source_pk": source_pk_for_row(row),
            "source_detail_json": detail_json(payload),
        },
    )


def parse_component(row: sqlite3.Row, payload: dict[str, Any]) -> ParsedRow:
    parent = str(payload.get("parent_run_id") or "")
    component_run = payload.get("component_run_id")
    component_model = payload.get("component_model_id")
    role = payload.get("component_role")
    details = decode_jsonish(payload.get("details_json"))
    return ParsedRow(
        target_table="model_component_runs",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "model_component_run_id": stable_id("model-component", parent, component_run, component_model, role, source_pk_for_row(row)),
            "parent_model_run_id": parent,
            "component_run_id": component_run,
            "component_model_id": component_model,
            "component_role": role,
            "status": details.get("status") or payload.get("status"),
            "details_json": json.dumps(details, sort_keys=True) if details else payload.get("details_json"),
            "source_table": row["source_table"],
            "source_pk": source_pk_for_row(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_lane(row: sqlite3.Row, payload: dict[str, Any]) -> ParsedRow:
    run_id = str(payload.get("run_id") or "")
    lane = str(payload.get("lane") or "unknown")
    return ParsedRow(
        target_table="model_run_lanes",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "model_run_lane_id": stable_id("model-run-lane", run_id, lane, source_pk_for_row(row)),
            "model_run_id": run_id,
            "lane": lane,
            "status": payload.get("status"),
            "row_count": payload.get("row_count"),
            "graded_count": payload.get("graded_count"),
            "hit_count": payload.get("hit_count"),
            "miss_count": payload.get("miss_count"),
            "hit_pct": payload.get("hit_pct"),
            "avg_pnl_per100": payload.get("avg_pnl_per100"),
            "details_json": payload.get("details_json"),
            "source_table": row["source_table"],
            "source_pk": source_pk_for_row(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_artifact(row: sqlite3.Row, payload: dict[str, Any]) -> ParsedRow:
    run_id = str(payload.get("run_id") or "")
    path = payload.get("path")
    role = payload.get("role")
    return ParsedRow(
        target_table="model_run_artifacts",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "model_run_artifact_id": stable_id("model-run-artifact", run_id, role, path, source_pk_for_row(row)),
            "model_run_id": run_id,
            "artifact_role": role,
            "artifact_path": path,
            "sha256": payload.get("sha256"),
            "exists_flag": payload.get("exists_flag"),
            "source_table": row["source_table"],
            "source_pk": source_pk_for_row(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_model_metadata_rows(con: sqlite3.Connection, date: str | None = None) -> tuple[list[ParsedRow], dict[str, Any]]:
    parsed: list[ParsedRow] = []
    counts: dict[str, Any] = {"source_rows": 0, "parsed_rows": 0, "unparsed_rows": 0, "source_tables": {}, "targets": {}}
    for row in fetch_legacy_rows(con, MODEL_METADATA_SOURCE_TABLES, date=date):
        counts["source_rows"] += 1
        counts["source_tables"][row["source_table"]] = counts["source_tables"].get(row["source_table"], 0) + 1
        payload = parse_legacy_json(row)
        parsed_row: ParsedRow | None
        if row["source_table"] == "model_runs":
            parsed_row = parse_model_run(row, payload)
        elif row["source_table"] == "model_component_runs":
            parsed_row = parse_component(row, payload)
        elif row["source_table"] == "model_run_lanes":
            parsed_row = parse_lane(row, payload)
        elif row["source_table"] == "model_run_artifacts":
            parsed_row = parse_artifact(row, payload)
        else:
            parsed_row = None
        if parsed_row is None:
            counts["unparsed_rows"] += 1
            continue
        parsed.append(parsed_row)
        counts["targets"][parsed_row.target_table] = counts["targets"].get(parsed_row.target_table, 0) + 1
    counts["parsed_rows"] = len(parsed)
    return parsed, counts


def normalize_model_metadata(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_model_metadata_schema(con)
    rows, counts = parse_model_metadata_rows(con, date=date)
    report = {
        "family": "mlb_model_metadata",
        "date": date,
        "dry_run": dry_run,
        **counts,
        "inserted": {},
        "unresolved_rows_added": 0,
    }
    if not dry_run:
        report["inserted"] = insert_value_rows(con, [(row.target_table, row.values) for row in rows])
        con.commit()
    if dry_run:
        con.rollback()
    return report

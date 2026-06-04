#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
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


def normalize(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def label_from_date(date: str) -> str:
    parsed = datetime.strptime(date, "%Y-%m-%d")
    return f"{parsed.strftime('%B')} {parsed.day}, {parsed.year}"


def safe_json(value: str | None, fallback: Any = None) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def fetch_json_rows(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    con.row_factory = sqlite3.Row
    return [dict(row) for row in con.execute(sql, params).fetchall()]


def fetch_legacy_rows(con: sqlite3.Connection, source_table: str, date: str) -> list[dict[str, Any]]:
    rows = fetch_json_rows(
        con,
        """
        select row_json
        from legacy_table_rows
        where sport = 'tennis'
          and source_table = ?
          and source_date like ?
        order by legacy_row_id
        """,
        (source_table, f"{date}%"),
    )
    parsed = []
    for row in rows:
        payload = safe_json(row["row_json"], {})
        if isinstance(payload, dict):
            parsed.append(payload)
    return parsed


def resolve_model(con: sqlite3.Connection, date: str, requested_model: str) -> dict[str, Any] | None:
    rows = fetch_json_rows(
        con,
        """
        select
          mr.model_run_id,
          mr.model_id,
          mr.model_version,
          mr.run_date,
          mr.run_type,
          mr.status,
          count(pr.prediction_row_id) as prediction_rows
        from model_runs mr
        left join prediction_rows pr on pr.model_run_id = mr.model_run_id
        where mr.run_date = ?
        group by 1, 2, 3, 4, 5, 6
        order by prediction_rows desc, mr.model_id
        """,
        (date,),
    )
    if not rows:
        return None
    if requested_model == "latest":
        return rows[0]
    for row in rows:
        if row["model_id"] == requested_model or row["model_run_id"] == requested_model:
            return row
    raise ValueError(f"No tennis model run found for {date} and model {requested_model!r}")


def load_matches(con: sqlite3.Connection, date: str) -> list[dict[str, Any]]:
    rows = fetch_json_rows(
        con,
        """
        select
          m.match_id,
          m.match_date,
          m.start_time_utc,
          m.round,
          m.tour,
          m.surface,
          m.best_of,
          m.status,
          t.name as tournament_name,
          t.level as tournament_level,
          t.location as tournament_location
        from matches m
        left join tournaments t on t.tournament_id = m.tournament_id
        where m.match_date = ?
        order by m.match_id
        """,
        (date,),
    )
    players = fetch_json_rows(
        con,
        """
        select
          mp.match_id,
          mp.side,
          mp.pre_match_rank,
          mp.seed,
          mp.market_name,
          p.player_id,
          p.name,
          p.canonical_name,
          p.country,
          p.tour
        from match_players mp
        join players p on p.player_id = mp.player_id
        where mp.match_id in (select match_id from matches where match_date = ?)
        order by mp.match_id, mp.side
        """,
        (date,),
    )
    by_match: dict[str, list[dict[str, Any]]] = {}
    for player in players:
        by_match.setdefault(player["match_id"], []).append(player)
    for row in rows:
        row["players"] = by_match.get(row["match_id"], [])
    return rows


def load_predictions(con: sqlite3.Connection, model_run_id: str) -> list[dict[str, Any]]:
    return fetch_json_rows(
        con,
        """
        select
          prediction_row_id,
          match_id,
          player_id,
          lane,
          market_type,
          selection,
          predicted_probability,
          projected_value,
          confidence,
          ev_cents,
          price_cents,
          odds_american,
          rationale_json,
          created_at
        from prediction_rows
        where model_run_id = ?
        order by match_id, lane, market_type, selection
        """,
        (model_run_id,),
    )


def build_sidecar_maps(con: sqlite3.Connection, date: str) -> dict[str, Any]:
    training_rows = fetch_legacy_rows(con, "tennis_model_training_rows", date)
    market_rows = fetch_legacy_rows(con, "tennis_prediction_market_snapshots", date)
    result_rows = fetch_legacy_rows(con, "tennis_match_results", date)
    weather_rows = fetch_legacy_rows(con, "tennis_match_weather", date)
    context_rows = fetch_legacy_rows(con, "tennis_player_match_context", date)
    service_rows = fetch_legacy_rows(con, "tennis_sofascore_player_page_stats", date)

    training_by_match = {}
    for row in training_rows:
        match_id = row.get("match_id")
        if match_id and match_id not in training_by_match:
            training_by_match[match_id] = row

    markets_by_match: dict[str, list[dict[str, Any]]] = {}
    for row in market_rows:
        match_id = row.get("match_id")
        if match_id:
            markets_by_match.setdefault(match_id, []).append(row)

    results_by_match: dict[str, dict[str, Any]] = {}
    results_by_title: dict[str, dict[str, Any]] = {}
    for row in result_rows:
        match_id = row.get("match_id")
        title = row.get("title")
        if match_id:
            results_by_match[match_id] = row
        if title:
            results_by_title[normalize(title)] = row

    weather_by_match = {row.get("match_id"): row for row in weather_rows if row.get("match_id")}

    context_by_match: dict[str, list[dict[str, Any]]] = {}
    for row in context_rows:
        match_id = row.get("match_id")
        if match_id:
            context_by_match.setdefault(match_id, []).append(row)

    service_by_player = {normalize(row.get("player_name")): row for row in service_rows if row.get("player_name")}

    return {
        "training_by_match": training_by_match,
        "markets_by_match": markets_by_match,
        "results_by_match": results_by_match,
        "results_by_title": results_by_title,
        "weather_by_match": weather_by_match,
        "context_by_match": context_by_match,
        "service_by_player": service_by_player,
    }


def player_label(player: dict[str, Any]) -> str:
    return player.get("market_name") or player.get("name") or player.get("canonical_name") or "Unknown player"


def pick_analysis(predictions: list[dict[str, Any]]) -> dict[str, Any]:
    ml_rows = [row for row in predictions if row.get("lane") == "ml"]
    if not ml_rows:
        return {
            "participant": None,
            "summary": "No DB prediction row for this selected model.",
            "confidence": None,
            "source": "sql-tennis.db",
        }
    pick = max(
        ml_rows,
        key=lambda row: (
            row["predicted_probability"] if row["predicted_probability"] is not None else -1,
            row["confidence"] if row["confidence"] is not None else -1,
        ),
    )
    return {
        "participant": {"name": pick["selection"]},
        "summary": "DB-derived model row.",
        "confidence": pick["confidence"],
        "probability": pick["predicted_probability"],
        "evCents": pick["ev_cents"],
        "priceCents": pick["price_cents"],
        "lane": pick["lane"],
        "source": "sql-tennis.db",
    }


def build_game(match: dict[str, Any], predictions: list[dict[str, Any]], sidecars: dict[str, Any]) -> dict[str, Any]:
    players = match.get("players") or []
    names = [player_label(player) for player in players]
    title = " vs ".join(names) if len(names) >= 2 else match["match_id"]
    training = sidecars["training_by_match"].get(match["match_id"], {})
    result = sidecars["results_by_match"].get(match["match_id"]) or sidecars["results_by_title"].get(normalize(title))
    participants = [
        {
            "id": player["player_id"],
            "name": player_label(player),
            "displayName": player_label(player),
            "rank": player.get("pre_match_rank"),
            "seed": player.get("seed"),
            "country": player.get("country"),
            "side": player.get("side"),
        }
        for player in players
    ]
    markets = sidecars["markets_by_match"].get(match["match_id"], [])
    context_rows = sidecars["context_by_match"].get(match["match_id"], [])
    service_pressure = []
    for player in players:
        service = sidecars["service_by_player"].get(normalize(player_label(player)))
        if service:
            service_pressure.append(
                {
                    "player": player_label(player),
                    "matchesTotal": service.get("matches_total"),
                    "firstServePct": service.get("first_serve_pct"),
                    "firstServeWonPct": service.get("first_serve_won_pct"),
                    "secondServeWonPct": service.get("second_serve_won_pct"),
                    "breakPointsSaved": service.get("break_points_saved"),
                    "breakPointsFaced": service.get("break_points_faced"),
                    "breakPointsSavedPct": service.get("break_points_saved_pct"),
                    "breakPointsConverted": service.get("break_points_converted"),
                    "breakPointsToConvert": service.get("break_points_to_convert"),
                    "breakPointsConvertedPct": service.get("break_points_converted_pct"),
                }
            )
    start_label = training.get("start_label") or "TBD"
    start_minutes = training.get("start_minutes")
    return {
        "id": match["match_id"],
        "eventId": match["match_id"],
        "title": title,
        "league": "Tennis",
        "stage": match.get("round"),
        "start": start_label,
        "startMinutes": start_minutes if isinstance(start_minutes, int) else 0,
        "confidence": pick_analysis(predictions).get("confidence"),
        "participants": participants,
        "analysis": pick_analysis(predictions),
        "tennisContext": {
            "surface": match.get("surface"),
            "bestOf": match.get("best_of"),
            "predictionMarket": markets,
            "warehouseContextRows": context_rows,
            "servicePressure": service_pressure,
            "weather": sidecars["weather_by_match"].get(match["match_id"]),
            "result": result,
            "predictionRows": predictions,
        },
        "migrationExport": {
            "source": "sql-tennis.db",
            "sourceTables": [
                "matches",
                "match_players",
                "players",
                "prediction_rows",
                "model_runs",
                "legacy_table_rows",
            ],
        },
    }


def value_rows(predictions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for row in predictions:
        ev = row.get("ev_cents")
        if ev is None:
            continue
        rows.append(
            {
                "matchId": row.get("match_id"),
                "lane": row.get("lane"),
                "marketType": row.get("market_type"),
                "selection": row.get("selection"),
                "modelPct": None
                if row.get("predicted_probability") is None
                else round(float(row["predicted_probability"]) * 100, 1),
                "confidence": row.get("confidence"),
                "evPer100": ev,
                "priceCents": row.get("price_cents"),
                "oddsAmerican": row.get("odds_american"),
            }
        )
    return sorted(rows, key=lambda row: (-(row["evPer100"] or -9999), row["selection"] or ""))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def build_export(root: Path, args: argparse.Namespace) -> dict[str, Any]:
    source_db = args.source_db
    with sqlite3.connect(source_db) as con:
        model = resolve_model(con, args.date, args.model)
        matches = load_matches(con, args.date)
        predictions = load_predictions(con, model["model_run_id"]) if model else []
        predictions_by_match: dict[str, list[dict[str, Any]]] = {}
        for row in predictions:
            predictions_by_match.setdefault(row["match_id"], []).append(row)
        sidecars = build_sidecar_maps(con, args.date)
        games = [
            build_game(match, predictions_by_match.get(match["match_id"], []), sidecars)
            for match in matches
        ]

    values = value_rows(predictions)
    label = label_from_date(args.date)
    payload = {
        "id": args.date,
        "label": label,
        "status": "ready",
        "slateMeta": {
            "title": f"{label} Tennis DB export",
            "date": label,
            "isoDate": args.date,
            "timeZone": "America/Los_Angeles",
            "modelCartridge": model,
            "source": "sql-tennis.db",
        },
        "summary": {
            "totalGames": len(games),
            "predictionRows": len(predictions),
            "valueRows": len(values),
        },
        "filters": ["All", "Tennis"],
        "sources": [
            {"label": "Tennis SQLite warehouse", "path": str(source_db.relative_to(root))},
            {"label": "DB-derived migration export contract", "path": "data-migration/contracts/tennis_public_export_contract.md"},
        ],
        "modelRuns": [model] if model else [],
        "tennisValueSummary": {
            "modelId": model["model_id"] if model else None,
            "modelRunId": model["model_run_id"] if model else None,
            "rows": values,
            "countByLane": {
                lane: len([row for row in values if row["lane"] == lane])
                for lane in sorted({row["lane"] for row in values})
            },
        },
        "games": sorted(games, key=lambda game: (game.get("startMinutes") or 0, game["title"])),
        "migrationExport": {
            "contract": "data-migration/contracts/tennis_public_export_contract.md",
            "sourceDb": path_label(source_db, root),
            "selectedModel": args.model,
            "resolvedModel": model,
        },
    }
    return payload


def insert_export_manifest(root: Path, args: argparse.Namespace, payload: dict[str, Any], summary_path: Path) -> str:
    model = payload["migrationExport"]["resolvedModel"] or {}
    output_hash = sha256_file(summary_path)
    manifest_id = sha256_text(f"tennis-public-preview|{args.date}|{model.get('model_run_id')}|{output_hash}")[:32]
    query_hash = sha256_text(
        compact_json(
            {
                "date": args.date,
                "model": model.get("model_id"),
                "modelRunId": model.get("model_run_id"),
                "tables": ["matches", "match_players", "players", "prediction_rows", "model_runs", "legacy_table_rows"],
            }
        )
    )
    with sqlite3.connect(args.source_db) as con:
        con.execute(
            """
            delete from export_manifests
            where sport = 'tennis'
              and export_type = 'tennis_public_slate_preview'
              and export_date = ?
              and model_id = ?
              and output_path = ?
            """,
            (args.date, model.get("model_id"), path_label(summary_path, root)),
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
            ) values (?, 'tennis', 'tennis_public_slate_preview', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                manifest_id,
                args.date,
                model.get("model_id"),
                path_label(args.source_db, root),
                query_hash,
                path_label(summary_path, root),
                output_hash,
                len(payload["games"]),
                utc_now(),
                "DB-derived preview export. Not promoted to published-data/web mirror.",
            ),
        )
        con.commit()
    return manifest_id


def append_event(root: Path, event: dict[str, Any]) -> None:
    event_path = root / "data-migration" / "migration_events.jsonl"
    with event_path.open("a", encoding="utf-8") as handle:
        handle.write(compact_json(event) + "\n")


def path_label(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def parse_args() -> argparse.Namespace:
    root = repo_root()
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    parser.add_argument("--model", default="latest")
    parser.add_argument("--source-db", type=Path, default=default_db(root))
    parser.add_argument("--out-dir", type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", args.date):
        raise ValueError("Pass --date YYYY-MM-DD")
    if not args.source_db.is_absolute():
        args.source_db = root / args.source_db
    if args.out_dir is None:
        args.out_dir = root / "data-migration" / "export-previews" / "tennis" / args.date
    elif not args.out_dir.is_absolute():
        args.out_dir = root / args.out_dir
    if args.report is None:
        args.report = root / "data-migration" / "reports" / f"tennis_public_export_preview_{args.date}.json"
    elif not args.report.is_absolute():
        args.report = root / args.report
    return args


def main() -> int:
    root = repo_root()
    args = parse_args()
    payload = build_export(root, args)
    summary_path = args.out_dir / "summary.json"
    game_dir = args.out_dir / "games"
    report = {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/export_tennis_public_from_db.py",
        "contract": "data-migration/contracts/tennis_public_export_contract.md",
        "dry_run": args.dry_run,
        "date": args.date,
        "model": args.model,
        "source_db": path_label(args.source_db, root),
        "out_dir": path_label(args.out_dir, root),
        "summary_path": path_label(summary_path, root),
        "games": len(payload["games"]),
        "prediction_rows": payload["summary"]["predictionRows"],
        "value_rows": payload["summary"]["valueRows"],
        "resolved_model": payload["migrationExport"]["resolvedModel"],
        "export_manifest_id": None,
        "ok": True,
    }
    if not args.dry_run:
        if args.out_dir.exists():
            if not args.force:
                raise FileExistsError(f"Export target exists; pass --force to replace: {args.out_dir}")
            shutil.rmtree(args.out_dir)
        write_json(summary_path, payload)
        for game in payload["games"]:
            write_json(game_dir / f"{game['id']}.json", game)
        report["export_manifest_id"] = insert_export_manifest(root, args, payload, summary_path)
        append_event(
            root,
            {
                "event_id": f"tennis-public-export-preview-{args.date}-{datetime.now(timezone.utc).isoformat().replace(':', '-').replace('.', '-')}",
                "timestamp": utc_now(),
                "phase": "8",
                "area": "tennis_db_derived_public_export_preview",
                "source": path_label(args.source_db, root),
                "target": path_label(args.out_dir, root),
                "parser_module": "none",
                "migration_script": "data-migration/scripts/export_tennis_public_from_db.py",
                "validation": "pending tennis public export validation",
                "status_from": "not_started",
                "status_to": "backfilled",
                "report_path": path_label(args.report, root),
                "checksum": sha256_text(compact_json(report)),
                "notes": "Preview export only; published-data and web mirrors unchanged.",
            },
        )
    args.report.parent.mkdir(parents=True, exist_ok=True)
    write_json(args.report, report)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import sqlite3
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[3]
PIPELINE_ROOT = ROOT / "pipeline"
WAREHOUSE_ROOT = PIPELINE_ROOT / "tennis" / "warehouse"
sys.path.insert(0, str(PIPELINE_ROOT))
sys.path.insert(0, str(WAREHOUSE_ROOT))

from tennis_warehouse import DB_PATH, init_db

REFERENCE_DIR = ROOT / "data-private" / "reference" / "tennis"

ROLAND_GARROS = {
    "venue_key": "roland-garros",
    "label": "Roland Garros, Paris",
    "latitude": 48.847,
    "longitude": 2.249,
    "timezone": "Europe/Paris",
}

HOURLY_FIELDS = [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "precipitation",
    "rain",
    "cloud_cover",
    "wind_speed_10m",
    "wind_gusts_10m",
    "surface_pressure",
    "shortwave_radiation",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch and warehouse tennis match-window weather.")
    parser.add_argument("--date", help="Single slate date YYYY-MM-DD.")
    parser.add_argument("--start-date", help="Start slate date YYYY-MM-DD.")
    parser.add_argument("--end-date", help="End slate date YYYY-MM-DD.")
    parser.add_argument("--db", default=str(DB_PATH))
    parser.add_argument("--venue-key", default=ROLAND_GARROS["venue_key"])
    parser.add_argument("--latitude", type=float, default=ROLAND_GARROS["latitude"])
    parser.add_argument("--longitude", type=float, default=ROLAND_GARROS["longitude"])
    parser.add_argument("--timezone", default=ROLAND_GARROS["timezone"])
    args = parser.parse_args()
    if args.date:
        args.start_date = args.date
        args.end_date = args.date
    if not args.start_date or not args.end_date:
        parser.error("Pass --date YYYY-MM-DD or --start-date/--end-date.")
    return args


def daterange(start_date: str, end_date: str) -> list[str]:
    start = dt.date.fromisoformat(start_date)
    end = dt.date.fromisoformat(end_date)
    if end < start:
        raise ValueError("end-date must be on or after start-date")
    return [(start + dt.timedelta(days=offset)).isoformat() for offset in range((end - start).days + 1)]


def fetch_weather(date: str, latitude: float, longitude: float, timezone: str) -> dict[str, Any]:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": date,
        "end_date": date,
        "hourly": ",".join(HOURLY_FIELDS),
        "timezone": timezone,
    }
    encoded = urllib.parse.urlencode(params)
    urls = [
        f"https://archive-api.open-meteo.com/v1/archive?{encoded}",
        f"https://api.open-meteo.com/v1/forecast?{encoded}",
    ]
    last_error: str | None = None
    for url in urls:
        try:
            with urllib.request.urlopen(url, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if payload.get("hourly", {}).get("time"):
                payload["sourceUrl"] = url
                payload["sourceEndpoint"] = "Open-Meteo Archive" if "archive-api" in url else "Open-Meteo Forecast"
                return payload
            last_error = dumps_compact(payload)
        except Exception as error:  # pragma: no cover - network failure detail is reported to caller
            last_error = str(error)
    raise RuntimeError(f"Open-Meteo returned no hourly weather for {date}: {last_error}")


def dumps_compact(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def iso_utc_from_local(local_time: str, timezone: str) -> str:
    local = dt.datetime.fromisoformat(local_time).replace(tzinfo=ZoneInfo(timezone))
    return local.astimezone(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def unix_from_utc_iso(value: str) -> int:
    return int(dt.datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp())


def safe_number(value: Any) -> float | None:
    try:
        if value is None:
            return None
        number = float(value)
        return number if math.isfinite(number) else None
    except (TypeError, ValueError):
        return None


def weighted_average(rows: list[dict[str, Any]], key: str) -> float | None:
    weighted = [
        (safe_number(row.get(key)), safe_number(row.get("_overlap_seconds")) or 0.0)
        for row in rows
        if safe_number(row.get(key)) is not None and (safe_number(row.get("_overlap_seconds")) or 0) > 0
    ]
    total = sum(weight for _, weight in weighted)
    if not total:
        return None
    return round(sum(float(value) * weight for value, weight in weighted) / total, 2)


def weighted_total_hourly_rate(rows: list[dict[str, Any]], key: str) -> float | None:
    total = 0.0
    seen = False
    for row in rows:
        value = safe_number(row.get(key))
        overlap = safe_number(row.get("_overlap_seconds")) or 0.0
        if value is None or overlap <= 0:
            continue
        # Open-Meteo precipitation/rain values are hourly totals. Prorate by overlap.
        total += value * min(overlap / 3600.0, 1.0)
        seen = True
    return round(total, 3) if seen else None


def max_value(rows: list[dict[str, Any]], key: str) -> float | None:
    values = [safe_number(row.get(key)) for row in rows if safe_number(row.get(key)) is not None]
    return round(max(values), 2) if values else None


def min_value(rows: list[dict[str, Any]], key: str) -> float | None:
    values = [safe_number(row.get(key)) for row in rows if safe_number(row.get(key)) is not None]
    return round(min(values), 2) if values else None


def period_duration_seconds(raw_json: str | None) -> int | None:
    if not raw_json:
        return None
    try:
        payload = json.loads(raw_json)
    except json.JSONDecodeError:
        return None
    event = (((payload.get("payloads") or {}).get("event") or {}).get("body") or {}).get("event") or {}
    time_payload = event.get("time") or {}
    total = 0
    for key, value in time_payload.items():
        if not key.startswith("period"):
            continue
        number = safe_number(value)
        if number and number > 0:
            total += int(number)
    if total > 0:
        return total
    # Pregame fallback: enough to include expected weather window without pretending it is exact.
    category_payload = (event.get("tournament") or {}).get("category") or ""
    category = (category_payload.get("name") if isinstance(category_payload, dict) else category_payload or "").upper()
    return 3 * 3600 if category == "ATP" else 2 * 3600


def is_roland_garros(row: sqlite3.Row) -> bool:
    text = f"{row['tournament_name'] or ''} {row['surface'] or ''}".lower()
    return ("roland garros" in text or "french open" in text) and "clay" in text


def hourly_rows(payload: dict[str, Any], date: str, venue: dict[str, Any]) -> list[dict[str, Any]]:
    hourly = payload.get("hourly") or {}
    times = hourly.get("time") or []
    rows: list[dict[str, Any]] = []
    for index, local_time in enumerate(times):
        row = {
            "venue_key": venue["venue_key"],
            "source_name": "Open-Meteo",
            "weather_date": date,
            "time_local": local_time,
            "time_utc": iso_utc_from_local(local_time, venue["timezone"]),
            "utc_offset_seconds": payload.get("utc_offset_seconds"),
            "latitude": payload.get("latitude"),
            "longitude": payload.get("longitude"),
            "temperature_2m_c": (hourly.get("temperature_2m") or [None] * len(times))[index],
            "apparent_temperature_c": (hourly.get("apparent_temperature") or [None] * len(times))[index],
            "relative_humidity_2m_pct": (hourly.get("relative_humidity_2m") or [None] * len(times))[index],
            "precipitation_mm": (hourly.get("precipitation") or [None] * len(times))[index],
            "rain_mm": (hourly.get("rain") or [None] * len(times))[index],
            "cloud_cover_pct": (hourly.get("cloud_cover") or [None] * len(times))[index],
            "wind_speed_10m_kmh": (hourly.get("wind_speed_10m") or [None] * len(times))[index],
            "wind_gusts_10m_kmh": (hourly.get("wind_gusts_10m") or [None] * len(times))[index],
            "surface_pressure_hpa": (hourly.get("surface_pressure") or [None] * len(times))[index],
            "shortwave_radiation_wm2": (hourly.get("shortwave_radiation") or [None] * len(times))[index],
        }
        row["raw_json"] = dumps_compact({**row, "sourceEndpoint": payload.get("sourceEndpoint")})
        rows.append(row)
    return rows


def upsert_hourly(conn: sqlite3.Connection, rows: list[dict[str, Any]]) -> int:
    for row in rows:
        conn.execute(
            """
            insert into tennis_weather_hourly(
              venue_key, source_name, weather_date, time_local, time_utc, utc_offset_seconds,
              latitude, longitude, temperature_2m_c, apparent_temperature_c,
              relative_humidity_2m_pct, precipitation_mm, rain_mm, cloud_cover_pct,
              wind_speed_10m_kmh, wind_gusts_10m_kmh, surface_pressure_hpa,
              shortwave_radiation_wm2, raw_json
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(venue_key, source_name, time_utc) do update set
              weather_date=excluded.weather_date,
              time_local=excluded.time_local,
              utc_offset_seconds=excluded.utc_offset_seconds,
              latitude=excluded.latitude,
              longitude=excluded.longitude,
              temperature_2m_c=excluded.temperature_2m_c,
              apparent_temperature_c=excluded.apparent_temperature_c,
              relative_humidity_2m_pct=excluded.relative_humidity_2m_pct,
              precipitation_mm=excluded.precipitation_mm,
              rain_mm=excluded.rain_mm,
              cloud_cover_pct=excluded.cloud_cover_pct,
              wind_speed_10m_kmh=excluded.wind_speed_10m_kmh,
              wind_gusts_10m_kmh=excluded.wind_gusts_10m_kmh,
              surface_pressure_hpa=excluded.surface_pressure_hpa,
              shortwave_radiation_wm2=excluded.shortwave_radiation_wm2,
              raw_json=excluded.raw_json,
              updated_at=current_timestamp
            """,
            (
                row["venue_key"],
                row["source_name"],
                row["weather_date"],
                row["time_local"],
                row["time_utc"],
                row["utc_offset_seconds"],
                row["latitude"],
                row["longitude"],
                row["temperature_2m_c"],
                row["apparent_temperature_c"],
                row["relative_humidity_2m_pct"],
                row["precipitation_mm"],
                row["rain_mm"],
                row["cloud_cover_pct"],
                row["wind_speed_10m_kmh"],
                row["wind_gusts_10m_kmh"],
                row["surface_pressure_hpa"],
                row["shortwave_radiation_wm2"],
                row["raw_json"],
            ),
        )
    return len(rows)


def summarize_match_weather(
    conn: sqlite3.Connection,
    slate_date: str,
    venue: dict[str, Any],
) -> int:
    match_rows = conn.execute(
        """
        select *
        from tennis_sofascore_matches
        where slate_date = ?
          and board_match_id is not null
          and start_timestamp is not null
        order by start_timestamp, board_match_id
        """,
        (slate_date,),
    ).fetchall()
    count = 0
    for match in match_rows:
        if not is_roland_garros(match):
            continue
        start_ts = int(match["start_timestamp"])
        duration = period_duration_seconds(match["raw_json"]) or 0
        end_ts = start_ts + duration
        weather_rows = [
            dict(row)
            for row in conn.execute(
                """
                select *
                from tennis_weather_hourly
                where venue_key = ?
                  and source_name = 'Open-Meteo'
                  and unixepoch(time_utc) < ?
                  and unixepoch(time_utc) + 3600 > ?
                order by time_utc
                """,
                (venue["venue_key"], end_ts, start_ts),
            )
        ]
        overlapped: list[dict[str, Any]] = []
        for row in weather_rows:
            hour_start = unix_from_utc_iso(row["time_utc"])
            hour_end = hour_start + 3600
            overlap = max(0, min(end_ts, hour_end) - max(start_ts, hour_start))
            if overlap <= 0:
                continue
            row["_overlap_seconds"] = overlap
            overlapped.append(row)
        summary = {
            "matchId": match["board_match_id"],
            "slateDate": slate_date,
            "eventId": match["sofascore_event_id"],
            "venue": venue,
            "startTs": start_ts,
            "endTs": end_ts,
            "durationMinutes": round(duration / 60, 1) if duration else None,
            "hourlyRows": len(overlapped),
            "hourly": [
                {
                    "timeLocal": row["time_local"],
                    "timeUtc": row["time_utc"],
                    "overlapMinutes": round((row.get("_overlap_seconds") or 0) / 60, 1),
                    "temperatureC": row.get("temperature_2m_c"),
                    "apparentTemperatureC": row.get("apparent_temperature_c"),
                    "humidityPct": row.get("relative_humidity_2m_pct"),
                    "precipitationMm": row.get("precipitation_mm"),
                    "windKmh": row.get("wind_speed_10m_kmh"),
                    "gustKmh": row.get("wind_gusts_10m_kmh"),
                    "shortwaveWm2": row.get("shortwave_radiation_wm2"),
                }
                for row in overlapped
            ],
        }
        avg_temp = weighted_average(overlapped, "temperature_2m_c")
        max_temp = max_value(overlapped, "temperature_2m_c")
        avg_humidity = weighted_average(overlapped, "relative_humidity_2m_pct")
        max_gust = max_value(overlapped, "wind_gusts_10m_kmh")
        precipitation = weighted_total_hourly_rate(overlapped, "precipitation_mm")
        conn.execute(
            """
            insert into tennis_match_weather(
              match_id, slate_date, sofascore_event_id, venue_key, source_name,
              start_ts, end_ts, duration_minutes, hourly_rows,
              avg_temperature_c, max_temperature_c, min_temperature_c,
              avg_apparent_temperature_c, max_apparent_temperature_c,
              avg_humidity_pct, total_precipitation_mm, total_rain_mm,
              avg_cloud_cover_pct, avg_wind_speed_kmh, max_wind_gust_kmh,
              avg_surface_pressure_hpa, avg_shortwave_radiation_wm2,
              max_shortwave_radiation_wm2, hot_match, humid_match, windy_match,
              rain_affected, raw_json
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(match_id) do update set
              slate_date=excluded.slate_date,
              sofascore_event_id=excluded.sofascore_event_id,
              venue_key=excluded.venue_key,
              source_name=excluded.source_name,
              start_ts=excluded.start_ts,
              end_ts=excluded.end_ts,
              duration_minutes=excluded.duration_minutes,
              hourly_rows=excluded.hourly_rows,
              avg_temperature_c=excluded.avg_temperature_c,
              max_temperature_c=excluded.max_temperature_c,
              min_temperature_c=excluded.min_temperature_c,
              avg_apparent_temperature_c=excluded.avg_apparent_temperature_c,
              max_apparent_temperature_c=excluded.max_apparent_temperature_c,
              avg_humidity_pct=excluded.avg_humidity_pct,
              total_precipitation_mm=excluded.total_precipitation_mm,
              total_rain_mm=excluded.total_rain_mm,
              avg_cloud_cover_pct=excluded.avg_cloud_cover_pct,
              avg_wind_speed_kmh=excluded.avg_wind_speed_kmh,
              max_wind_gust_kmh=excluded.max_wind_gust_kmh,
              avg_surface_pressure_hpa=excluded.avg_surface_pressure_hpa,
              avg_shortwave_radiation_wm2=excluded.avg_shortwave_radiation_wm2,
              max_shortwave_radiation_wm2=excluded.max_shortwave_radiation_wm2,
              hot_match=excluded.hot_match,
              humid_match=excluded.humid_match,
              windy_match=excluded.windy_match,
              rain_affected=excluded.rain_affected,
              raw_json=excluded.raw_json,
              updated_at=current_timestamp
            """,
            (
                match["board_match_id"],
                slate_date,
                match["sofascore_event_id"],
                venue["venue_key"],
                "Open-Meteo",
                start_ts,
                end_ts,
                summary["durationMinutes"],
                len(overlapped),
                avg_temp,
                max_temp,
                min_value(overlapped, "temperature_2m_c"),
                weighted_average(overlapped, "apparent_temperature_c"),
                max_value(overlapped, "apparent_temperature_c"),
                avg_humidity,
                precipitation,
                weighted_total_hourly_rate(overlapped, "rain_mm"),
                weighted_average(overlapped, "cloud_cover_pct"),
                weighted_average(overlapped, "wind_speed_10m_kmh"),
                max_gust,
                weighted_average(overlapped, "surface_pressure_hpa"),
                weighted_average(overlapped, "shortwave_radiation_wm2"),
                max_value(overlapped, "shortwave_radiation_wm2"),
                1 if (max_temp or 0) >= 27 else 0,
                1 if (avg_humidity or 0) >= 70 else 0,
                1 if (max_gust or 0) >= 35 else 0,
                1 if (precipitation or 0) > 0.1 else 0,
                dumps_compact(summary),
            ),
        )
        count += 1
    if count:
        return count

    fallback_rows = conn.execute(
        """
        select match_id, slate_date, title, stage, start_minutes, raw_json
        from tennis_matches
        where slate_date = ?
        order by start_minutes, match_id
        """,
        (slate_date,),
    ).fetchall()
    la_tz = ZoneInfo("America/Los_Angeles")
    for match in fallback_rows:
        start_minutes = int(match["start_minutes"] or 0)
        local_date = dt.date.fromisoformat(slate_date)
        local_start = dt.datetime(
            local_date.year,
            local_date.month,
            local_date.day,
            start_minutes // 60,
            start_minutes % 60,
            tzinfo=la_tz,
        )
        start_ts = int(local_start.astimezone(dt.timezone.utc).timestamp())
        is_atp = str(match["match_id"]).startswith("rg-m-")
        duration = 3 * 3600 if is_atp else 2 * 3600
        end_ts = start_ts + duration
        weather_rows = [
            dict(row)
            for row in conn.execute(
                """
                select *
                from tennis_weather_hourly
                where venue_key = ?
                  and source_name = 'Open-Meteo'
                  and unixepoch(time_utc) < ?
                  and unixepoch(time_utc) + 3600 > ?
                order by time_utc
                """,
                (venue["venue_key"], end_ts, start_ts),
            )
        ]
        overlapped: list[dict[str, Any]] = []
        for row in weather_rows:
            hour_start = unix_from_utc_iso(row["time_utc"])
            hour_end = hour_start + 3600
            overlap = max(0, min(end_ts, hour_end) - max(start_ts, hour_start))
            if overlap <= 0:
                continue
            row["_overlap_seconds"] = overlap
            overlapped.append(row)

        avg_temp = weighted_average(overlapped, "temperature_2m_c")
        max_temp = max_value(overlapped, "temperature_2m_c")
        avg_humidity = weighted_average(overlapped, "relative_humidity_2m_pct")
        max_gust = max_value(overlapped, "wind_gusts_10m_kmh")
        precipitation = weighted_total_hourly_rate(overlapped, "precipitation_mm")
        summary = {
            "matchId": match["match_id"],
            "slateDate": slate_date,
            "eventId": None,
            "venue": venue,
            "source": "Open-Meteo + ESPN start-time fallback",
            "startTs": start_ts,
            "endTs": end_ts,
            "durationMinutes": round(duration / 60, 1),
            "hourlyRows": len(overlapped),
            "hourly": [
                {
                    "timeLocal": row["time_local"],
                    "timeUtc": row["time_utc"],
                    "overlapMinutes": round((row.get("_overlap_seconds") or 0) / 60, 1),
                    "temperatureC": row.get("temperature_2m_c"),
                    "apparentTemperatureC": row.get("apparent_temperature_c"),
                    "humidityPct": row.get("relative_humidity_2m_pct"),
                    "precipitationMm": row.get("precipitation_mm"),
                    "windKmh": row.get("wind_speed_10m_kmh"),
                    "gustKmh": row.get("wind_gusts_10m_kmh"),
                    "shortwaveWm2": row.get("shortwave_radiation_wm2"),
                }
                for row in overlapped
            ],
        }
        conn.execute(
            """
            insert into tennis_match_weather(
              match_id, slate_date, sofascore_event_id, venue_key, source_name,
              start_ts, end_ts, duration_minutes, hourly_rows,
              avg_temperature_c, max_temperature_c, min_temperature_c,
              avg_apparent_temperature_c, max_apparent_temperature_c,
              avg_humidity_pct, total_precipitation_mm, total_rain_mm,
              avg_cloud_cover_pct, avg_wind_speed_kmh, max_wind_gust_kmh,
              avg_surface_pressure_hpa, avg_shortwave_radiation_wm2,
              max_shortwave_radiation_wm2, hot_match, humid_match, windy_match,
              rain_affected, raw_json
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(match_id) do update set
              slate_date=excluded.slate_date,
              sofascore_event_id=excluded.sofascore_event_id,
              venue_key=excluded.venue_key,
              source_name=excluded.source_name,
              start_ts=excluded.start_ts,
              end_ts=excluded.end_ts,
              duration_minutes=excluded.duration_minutes,
              hourly_rows=excluded.hourly_rows,
              avg_temperature_c=excluded.avg_temperature_c,
              max_temperature_c=excluded.max_temperature_c,
              min_temperature_c=excluded.min_temperature_c,
              avg_apparent_temperature_c=excluded.avg_apparent_temperature_c,
              max_apparent_temperature_c=excluded.max_apparent_temperature_c,
              avg_humidity_pct=excluded.avg_humidity_pct,
              total_precipitation_mm=excluded.total_precipitation_mm,
              total_rain_mm=excluded.total_rain_mm,
              avg_cloud_cover_pct=excluded.avg_cloud_cover_pct,
              avg_wind_speed_kmh=excluded.avg_wind_speed_kmh,
              max_wind_gust_kmh=excluded.max_wind_gust_kmh,
              avg_surface_pressure_hpa=excluded.avg_surface_pressure_hpa,
              avg_shortwave_radiation_wm2=excluded.avg_shortwave_radiation_wm2,
              max_shortwave_radiation_wm2=excluded.max_shortwave_radiation_wm2,
              hot_match=excluded.hot_match,
              humid_match=excluded.humid_match,
              windy_match=excluded.windy_match,
              rain_affected=excluded.rain_affected,
              raw_json=excluded.raw_json,
              updated_at=current_timestamp
            """,
            (
                match["match_id"],
                slate_date,
                None,
                venue["venue_key"],
                "Open-Meteo",
                start_ts,
                end_ts,
                summary["durationMinutes"],
                len(overlapped),
                avg_temp,
                max_temp,
                min_value(overlapped, "temperature_2m_c"),
                weighted_average(overlapped, "apparent_temperature_c"),
                max_value(overlapped, "apparent_temperature_c"),
                avg_humidity,
                precipitation,
                weighted_total_hourly_rate(overlapped, "rain_mm"),
                weighted_average(overlapped, "cloud_cover_pct"),
                weighted_average(overlapped, "wind_speed_10m_kmh"),
                max_gust,
                weighted_average(overlapped, "surface_pressure_hpa"),
                weighted_average(overlapped, "shortwave_radiation_wm2"),
                max_value(overlapped, "shortwave_radiation_wm2"),
                1 if (max_temp or 0) >= 27 else 0,
                1 if (avg_humidity or 0) >= 70 else 0,
                1 if (max_gust or 0) >= 35 else 0,
                1 if (precipitation or 0) > 0.1 else 0,
                dumps_compact(summary),
            ),
        )
        count += 1
    return count


def main() -> int:
    args = parse_args()
    venue = {
        "venue_key": args.venue_key,
        "label": ROLAND_GARROS["label"] if args.venue_key == ROLAND_GARROS["venue_key"] else args.venue_key,
        "latitude": args.latitude,
        "longitude": args.longitude,
        "timezone": args.timezone,
    }
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    init_db(conn)
    REFERENCE_DIR.mkdir(parents=True, exist_ok=True)
    total_hourly = 0
    total_matches = 0
    outputs: list[str] = []
    try:
        for date in daterange(args.start_date, args.end_date):
            payload = fetch_weather(date, args.latitude, args.longitude, args.timezone)
            output_path = REFERENCE_DIR / f"weather-open-meteo-{date}.json"
            output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
            rows = hourly_rows(payload, date, venue)
            total_hourly += upsert_hourly(conn, rows)
            match_count = summarize_match_weather(conn, date, venue)
            total_matches += match_count
            outputs.append(str(output_path))
        conn.commit()
    finally:
        conn.close()
    print(
        json.dumps(
            {
                "dates": daterange(args.start_date, args.end_date),
                "venue": venue,
                "hourlyRows": total_hourly,
                "matchWeatherRows": total_matches,
                "outputs": outputs,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

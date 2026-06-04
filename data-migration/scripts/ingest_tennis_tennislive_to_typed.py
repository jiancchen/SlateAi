#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sqlite3
import sys
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[2]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db"
REFERENCE_DIR = ROOT / "data-private" / "reference" / "tennis" / "tennislive"
SOURCE_NAME = "tennislive"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def stable_id(*parts: Any, length: int = 40) -> str:
    text = "|".join("" if part is None else str(part) for part in parts)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:length]


def normalize_name(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", " ", text).strip().lower()
    return re.sub(r"\s+", " ", text)


def slug(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "-", normalize_name(value)).strip("-") or "unknown"


def compact_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def visible_text(value: str) -> str:
    text = re.sub(r"<sup>(.*?)</sup>", r"\1", value, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def parse_int(value: Any) -> int | None:
    text = re.sub(r"[^\d-]+", "", str(value or ""))
    if not text or text == "-":
        return None
    try:
        return int(text)
    except ValueError:
        return None


def parse_float(value: Any) -> float | None:
    text = str(value or "").replace(",", ".")
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    if not match:
        return None
    try:
        return float(match.group(0))
    except ValueError:
        return None


def parse_ratio(value: Any) -> tuple[int | None, int | None]:
    match = re.search(r"(\d+)\s*/\s*(\d+)", str(value or ""))
    if not match:
        return (None, None)
    return (int(match.group(1)), int(match.group(2)))


def parse_date(value: Any) -> str | None:
    match = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{2,4})", str(value or ""))
    if not match:
        return None
    day, month, year = match.groups()
    year_int = int(year)
    if year_int < 100:
        year_int += 2000
    return f"{year_int:04d}-{int(month):02d}-{int(day):02d}"


def surface_from_class(class_text: str, fallback: str = "") -> str:
    classes = set((class_text or "").split())
    if "surf_1" in classes:
        return "Hard"
    if "surf_2" in classes:
        return "Clay"
    if "surf_3" in classes:
        return "I. hard"
    if "surf_4" in classes:
        return "Carpet"
    if "surf_5" in classes:
        return "Grass"
    if "surf_6" in classes:
        return "Acrylic"
    return fallback


@dataclass
class Node:
    tag: str
    attrs: dict[str, str] = field(default_factory=dict)
    children: list["Node"] = field(default_factory=list)
    text_chunks: list[str] = field(default_factory=list)
    content: list[Any] = field(default_factory=list)
    parent: "Node | None" = None

    def text(self) -> str:
        parts: list[str] = []
        for entry in self.content:
            parts.append(entry.text() if isinstance(entry, Node) else str(entry))
        return re.sub(r"\s+", " ", html.unescape(" ".join(parts))).strip()

    def attr(self, name: str) -> str:
        return self.attrs.get(name, "")

    def has_class(self, class_name: str) -> bool:
        return class_name in self.attr("class").split()

    def find_all(self, tag: str | None = None, class_name: str | None = None) -> list["Node"]:
        rows: list[Node] = []
        if (tag is None or self.tag == tag) and (class_name is None or self.has_class(class_name)):
            rows.append(self)
        for child in self.children:
            rows.extend(child.find_all(tag, class_name))
        return rows

    def first(self, tag: str | None = None, class_name: str | None = None) -> "Node | None":
        rows = self.find_all(tag, class_name)
        return rows[0] if rows else None


class TreeParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("document")
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Node(tag.lower(), {key.lower(): value or "" for key, value in attrs}, parent=self.stack[-1])
        self.stack[-1].children.append(node)
        self.stack[-1].content.append(node)
        if tag.lower() not in {"br", "img", "input", "meta", "link", "hr"}:
            self.stack.append(node)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                self.stack = self.stack[:index]
                return

    def handle_data(self, data: str) -> None:
        if data.strip():
            self.stack[-1].text_chunks.append(data)
            self.stack[-1].content.append(data)


def parse_tree(html_text: str) -> Node:
    parser = TreeParser()
    parser.feed(html_text)
    return parser.root


def fetch_url(url: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def get_connection(path: Path = DB_PATH) -> sqlite3.Connection:
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    return con


def ensure_tennislive_schema(con: sqlite3.Connection) -> None:
    migration = ROOT / "pipeline" / "tennis" / "warehouse" / "migrations" / "TEN-W2" / "001_tennislive_source_tables.sql"
    con.executescript(migration.read_text(encoding="utf-8"))
    con.commit()


def store_snapshot(con: sqlite3.Connection, *, url: str, html_text: str, source_date: str | None, page_kind: str) -> tuple[str, str, Path, bool]:
    digest = hashlib.sha256(html_text.encode("utf-8")).hexdigest()
    snapshot_id = stable_id("source-snapshot", SOURCE_NAME, url, digest)
    parsed = urlparse(url)
    slug_name = slug(parsed.path.strip("/"))
    local_path = REFERENCE_DIR / page_kind / f"{slug_name}-{digest[:12]}.html"
    already = con.execute("select source_snapshot_id from source_snapshots where source_snapshot_id = ?", (snapshot_id,)).fetchone()
    if not local_path.exists():
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_text(html_text, encoding="utf-8")
    con.execute(
        """
        insert or ignore into source_snapshots(
          source_snapshot_id, source_name, sport, source_url, local_path,
          captured_at, source_date, content_hash, content_type, status, notes
        )
        values (?, ?, 'tennis', ?, ?, ?, ?, ?, 'text/html', 'captured', ?)
        """,
        (snapshot_id, SOURCE_NAME, url, str(local_path.relative_to(ROOT)), utc_now(), source_date, digest, page_kind),
    )
    return snapshot_id, digest, local_path, already is not None


def upsert_player(con: sqlite3.Connection, name: str, tour: str | None = None, country: str | None = None) -> str:
    name_key = normalize_name(name)
    for row in con.execute("select player_id, name, canonical_name from players").fetchall():
        if normalize_name(row["name"]) == name_key or normalize_name(row["canonical_name"]) == name_key:
            player_id = row["player_id"]
            ensure_player_registry(con, player_id, name, tour, country)
            return player_id
    player_id = f"tlp-{stable_id('tennis-player', name_key, length=24)}"
    con.execute(
        """
        insert or ignore into players(player_id, source_player_id, name, canonical_name, tour, country, active)
        values (?, ?, ?, ?, ?, ?, 1)
        """,
        (player_id, f"tennislive:{name_key}", name, name, tour, country),
    )
    ensure_player_registry(con, player_id, name, tour, country)
    return player_id


def ensure_player_registry(con: sqlite3.Connection, player_id: str, name: str, tour: str | None, country: str | None) -> None:
    now = utc_now()
    row = con.execute(
        "select player_id from player_identity_registry where player_id = ?",
        (player_id,),
    ).fetchone()
    if row:
        con.execute(
            """
            update player_identity_registry
            set country = coalesce(country, ?),
                tour = coalesce(tour, ?),
                updated_at = ?
            where player_id = ?
            """,
            (country, tour, now, player_id),
        )
        return
    normalized = normalize_name(name)
    con.execute(
        """
        insert into player_identity_registry(
          player_id, sport, canonical_name, normalized_name, name_slug, country, tour,
          birth_date, handedness, active, trusted_alias_count, quarantined_alias_count,
          needs_review_alias_count, source_ids_json, trusted_display_names_json,
          all_display_names_json, url_slug_candidates_json, pattern_tokens_json,
          source_summary_json, created_at, updated_at
        ) values (?, 'tennis', ?, ?, ?, ?, ?, null, null, 1, 0, 0, 0, '{}', ?, ?, ?, ?, '{}', ?, ?)
        """,
        (
            player_id,
            name,
            normalized,
            slug(name),
            country,
            tour,
            compact_json([name]),
            compact_json([name]),
            compact_json([slug(name)]),
            compact_json(normalized.split()),
            now,
            now,
        ),
    )


def upsert_entity_alias(
    con: sqlite3.Connection,
    *,
    canonical_entity_id: str,
    source_entity_id: str | None,
    source_display_name: str,
    confidence: float,
    notes: str,
) -> None:
    now = utc_now()
    alias_id = stable_id("entity-alias", "player", SOURCE_NAME, source_entity_id, source_display_name)
    con.execute(
        """
        insert into entity_aliases(
          entity_alias_id, entity_type, canonical_entity_id, source_name, source_entity_id,
          source_display_name, confidence, first_seen_at, last_seen_at, notes
        ) values (?, 'player', ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(entity_type, source_name, source_entity_id, source_display_name)
        do update set
          canonical_entity_id = excluded.canonical_entity_id,
          confidence = max(coalesce(entity_aliases.confidence, 0), excluded.confidence),
          last_seen_at = excluded.last_seen_at,
          notes = excluded.notes
        """,
        (alias_id, canonical_entity_id, SOURCE_NAME, source_entity_id, source_display_name, confidence, now, now, notes),
    )
    con.execute(
        """
        insert into entity_alias_governance(
          entity_alias_id, alias_status, mapping_policy, resolver_version, risk_label,
          reviewed_at, review_reason, source_evidence_json, created_at, updated_at
        ) values (?, 'active', 'source_url_exact_player_page', 'tennislive-W2', 'low', ?, ?, ?, ?, ?)
        on conflict(entity_alias_id)
        do update set
          alias_status = excluded.alias_status,
          mapping_policy = excluded.mapping_policy,
          resolver_version = excluded.resolver_version,
          risk_label = excluded.risk_label,
          reviewed_at = excluded.reviewed_at,
          review_reason = excluded.review_reason,
          source_evidence_json = excluded.source_evidence_json,
          updated_at = excluded.updated_at
        """,
        (
            alias_id,
            now,
            "TennisLive player page URL and parsed display name mapped to canonical player.",
            compact_json({"source_player_url": source_entity_id, "source_display_name": source_display_name}),
            now,
            now,
        ),
    )


def parse_profile(html_text: str, root: Node, url: str) -> dict[str, Any]:
    block_match = re.search(r'<div class="player_stats">(.*?)</div>', html_text, flags=re.I | re.S)
    block = block_match.group(1) if block_match else ""
    text = visible_text(block)
    def after(label: str) -> str | None:
        match = re.search(rf"{re.escape(label)}:\s*(.*?)(?=\s+(?:Name|Country|Birthdate|ATP ranking|WTA ranking|TOP ranking's position|Points|Prize money|Matches total|Win|%):|$)", text, flags=re.I)
        return match.group(1).strip() if match else None
    ranking_label = "ATP ranking" if "/atp/" in url else "WTA ranking" if "/wta/" in url else None
    ranking_match = re.search(r"(?:ATP|WTA)\s+ranking\s*:\s*(\d+)", text, flags=re.I)
    top = after("TOP ranking's position") or ""
    top_rank = parse_int(top.split(" ")[0] if top else None)
    top_date = parse_date(top)
    top_points = parse_int(re.search(r"(\d+)\s+points", top or "", flags=re.I).group(1)) if re.search(r"(\d+)\s+points", top or "", flags=re.I) else None
    birth = after("Birthdate") or ""
    return {
        "name": after("Name"),
        "country": after("Country"),
        "birthdate": parse_date(birth),
        "age": parse_int(re.search(r",\s*(\d+)\s+years", birth).group(1)) if re.search(r",\s*(\d+)\s+years", birth) else None,
        "ranking_label": ranking_label,
        "current_ranking": parse_int(ranking_match.group(1) if ranking_match else after(ranking_label) if ranking_label else None),
        "top_ranking": top_rank,
        "top_ranking_date": top_date,
        "top_ranking_points": top_points,
        "points": parse_int(after("Points")),
        "prize_money": after("Prize money"),
        "matches_total": parse_int(after("Matches total")),
        "wins": parse_int(after("Win")),
        "win_pct": parse_float(after("%")),
        "raw_text": text,
    }


def surface_records(root: Node) -> list[dict[str, Any]]:
    table = next((table for table in root.find_all("table", "table_stats") if "year" in table.text().lower() and "summary" in table.text().lower()), None)
    if not table:
        return []
    rows = table.find_all("tr")
    headers = [cell.text() for cell in rows[0].children if cell.tag in {"td", "th"}] if rows else []
    records: list[dict[str, Any]] = []
    for row in rows[1:]:
        cells = [cell for cell in row.children if cell.tag in {"td", "th"}]
        if len(cells) < 2:
            continue
        season = cells[0].text()
        if not season:
            continue
        for index, cell in enumerate(cells[1:], start=1):
            surface = headers[index] if index < len(headers) else f"surface_{index}"
            made, attempts = parse_ratio(cell.text())
            wins = made
            losses = attempts
            pct = None
            title_link = cell.first("a")
            title = title_link.attr("title") if title_link else ""
            pct_match = re.search(r"%:\s*([0-9.]+)", title)
            if pct_match:
                pct = parse_float(pct_match.group(1))
            records.append({"season": season, "surface": surface, "wins": wins, "losses": losses, "win_pct": pct, "raw_text": cell.text()})
    return records


def extract_match_links(root: Node, source_player_name: str, source_player_url: str, limit: int) -> list[dict[str, Any]]:
    if limit <= 0:
        return []
    rows: list[dict[str, Any]] = []
    current_tournament = ""
    current_surface = ""
    for tr in root.find_all("tr"):
        match_link = None
        for link in tr.find_all("a"):
            if "/match/" in link.attr("href"):
                match_link = link
                break
        if not match_link:
            continue
        cells = [cell for cell in tr.children if cell.tag == "td"]
        if len(cells) < 7:
            continue
        for cell in cells:
            if "w200" in cell.attr("class").split():
                current_tournament = cell.text()
            surface = surface_from_class(cell.attr("class"))
            if surface:
                current_surface = surface
        player1 = cells[2].text() if len(cells) > 2 else ""
        player2 = cells[3].text() if len(cells) > 3 else ""
        opponent = player2 if normalize_name(player1) == normalize_name(source_player_name) else player1
        outcome_img = cells[5].first("img") if len(cells) > 5 else None
        rows.append(
            {
                "source_player_url": source_player_url,
                "source_match_url": urljoin(source_player_url, match_link.attr("href")),
                "match_date": parse_date(cells[0].text()),
                "round": cells[1].text(),
                "player1_name": player1,
                "player2_name": player2,
                "opponent_name": opponent,
                "score_text": cells[4].text(),
                "result_text": cells[4].text(),
                "outcome": outcome_img.attr("alt") if outcome_img else None,
                "tournament": current_tournament,
                "surface": current_surface,
            }
        )
        if len(rows) >= limit:
            break
    return rows


def parse_match_summary(root: Node, url: str) -> dict[str, Any]:
    table = next((table for table in root.find_all("table", "table_pmatches") if table.find_all("tr")), None)
    if not table:
        return {}
    tr = table.find_all("tr")[0]
    cells = [cell for cell in tr.children if cell.tag == "td"]
    if len(cells) < 7:
        return {}
    tournament_cell = next((cell for cell in cells if "w200" in cell.attr("class").split()), None)
    surface_cell = next((cell for cell in cells if surface_from_class(cell.attr("class"))), None)
    tournament_link = tournament_cell.first("a") if tournament_cell else None
    player1 = cells[2].text()
    player2 = cells[3].text()
    score = cells[4].text()
    return {
        "match_date": parse_date(cells[0].text()),
        "start_time_local": cells[0].text(),
        "round": cells[1].text(),
        "player1_name": player1,
        "player2_name": player2,
        "score_text": score,
        "winner_name": player1 if score else None,
        "tournament": tournament_cell.text() if tournament_cell else "",
        "tournament_url": urljoin(url, tournament_link.attr("href")) if tournament_link else None,
        "country": None,
        "surface": surface_from_class(surface_cell.attr("class")) if surface_cell else None,
        "status": "completed" if score else "scheduled",
    }


def parse_match_stats(root: Node) -> list[dict[str, Any]]:
    for table in root.find_all("table", "table_stats_match"):
        rows = table.find_all("tr")
        stat_rows = []
        for row in rows:
            cells = [cell for cell in row.children if cell.tag == "td"]
            if len(cells) == 3 and "info_txt" in cells[0].attr("class").split():
                left_made, left_attempts = parse_ratio(cells[1].text())
                right_made, right_attempts = parse_ratio(cells[2].text())
                stat_rows.append(
                    {
                        "stat_name": cells[0].text(),
                        "left_text": cells[1].text(),
                        "left_made": left_made,
                        "left_attempts": left_attempts,
                        "left_value": parse_float(cells[1].text()),
                        "right_text": cells[2].text(),
                        "right_made": right_made,
                        "right_attempts": right_attempts,
                        "right_value": parse_float(cells[2].text()),
                    }
                )
        if stat_rows:
            return stat_rows
    return []


def parse_replay(root: Node) -> list[dict[str, Any]]:
    replay: list[dict[str, Any]] = []
    game_number_by_set: dict[int, int] = {}
    for table in root.find_all("table", "table_stats_match"):
        set_number = None
        pending_game: dict[str, Any] | None = None
        for row in table.find_all("tr"):
            cells = [cell for cell in row.children if cell.tag == "td"]
            if not cells:
                continue
            if "mp_tour_head" in row.attr("class").split():
                set_number = parse_int(cells[0].text())
                if set_number is not None:
                    game_number_by_set.setdefault(set_number, 0)
                continue
            if len(cells) == 3 and any("mp_info_txt" in cell.attr("class").split() for cell in cells):
                if set_number is None:
                    continue
                game_number_by_set[set_number] = game_number_by_set.get(set_number, 0) + 1
                server_cell = next((cell for cell in cells if "mp_serve" in cell.attr("class").split() and cell.text()), None)
                score_cell = next((cell for cell in cells if "mp_info_txt" in cell.attr("class").split()), None)
                pending_game = {
                    "set_number": set_number,
                    "game_number": game_number_by_set[set_number],
                    "server_name": server_cell.text().replace(" serve", "").strip() if server_cell else None,
                    "score_after": score_cell.text() if score_cell else None,
                    "raw_points_text": "",
                }
                replay.append(pending_game)
            elif pending_game and len(cells) == 1 and "mp_15" in cells[0].attr("class").split():
                raw_points = cells[0].text()
                pending_game["raw_points_text"] = raw_points
                pending_game["break_point_count"] = raw_points.count("[BP]")
                pending_game["deuce_count"] = len(re.findall(r"\b40-40\b", raw_points))
                pending_game["is_tiebreak"] = 1 if re.search(r"\b[0-9]+-[0-9]+(?:,|$)", raw_points) and (pending_game.get("score_after") or "").startswith("7-6") else 0
                pending_game["points"] = [
                    {
                        "point_number": index + 1,
                        "point_score": point.replace("[BP]", "").strip(),
                        "is_break_point": 1 if "[BP]" in point else 0,
                        "is_deuce": 1 if point.replace("[BP]", "").strip() == "40-40" else 0,
                        "is_tiebreak": pending_game["is_tiebreak"],
                        "raw_point_text": point.strip(),
                    }
                    for index, point in enumerate([part.strip() for part in raw_points.split(",") if part.strip()])
                ]
    return [game for game in replay if game.get("raw_points_text")]


def canonical_match_id(summary: dict[str, Any], url: str) -> str:
    date = summary.get("match_date") or "unknown-date"
    event_slug = urlparse(url).path.strip("/").split("/")[-1] if url else slug(summary.get("tournament"))
    p1 = slug(summary.get("player1_name"))
    p2 = slug(summary.get("player2_name"))
    return f"tl-{date}-{event_slug}-{p1}-vs-{p2}"


def upsert_match(con: sqlite3.Connection, summary: dict[str, Any], url: str, snapshot_id: str) -> tuple[str, str, str]:
    tour = "ATP" if "/atp/" in url else "WTA" if "/wta/" in url else None
    player1_id = upsert_player(con, summary["player1_name"], tour)
    player2_id = upsert_player(con, summary["player2_name"], tour)
    match_id = canonical_match_id(summary, url)
    con.execute(
        """
        insert or replace into matches(
          match_id, tournament_id, match_date, start_time_utc, round, tour, surface,
          best_of, status, source_event_id, source_snapshot_id
        ) values (?, ?, ?, null, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            match_id,
            slug(summary.get("tournament")),
            summary.get("match_date") or "unknown",
            summary.get("round"),
            tour,
            summary.get("surface"),
            5 if tour == "ATP" and re.search(r"open|slam|garros|wimbledon|australian|u\.s", str(summary.get("tournament")), re.I) else 3,
            summary.get("status") or "completed",
            url,
            snapshot_id,
        ),
    )
    con.execute("insert or replace into match_players(match_id, player_id, side, market_name) values (?, ?, 1, ?)", (match_id, player1_id, summary["player1_name"]))
    con.execute("insert or replace into match_players(match_id, player_id, side, market_name) values (?, ?, 2, ?)", (match_id, player2_id, summary["player2_name"]))
    return match_id, player1_id, player2_id


def ingest_player(con: sqlite3.Connection, url: str, max_links: int, max_matches: int, force: bool) -> dict[str, Any]:
    html_text = fetch_url(url)
    root = parse_tree(html_text)
    profile = parse_profile(html_text, root, url)
    if not profile.get("name"):
        raise ValueError(f"Could not parse TennisLive player profile from {url}")
    snapshot_id, digest, _, already = store_snapshot(con, url=url, html_text=html_text, source_date=None, page_kind="player")
    player_id = upsert_player(con, profile["name"], "ATP" if "/atp/" in url else "WTA" if "/wta/" in url else None, profile.get("country"))
    upsert_entity_alias(
        con,
        canonical_entity_id=player_id,
        source_entity_id=url,
        source_display_name=profile["name"],
        confidence=0.95,
        notes="TennisLive player page URL mapped during player profile ingest.",
    )
    captured_at = utc_now()
    con.execute(
        """
        insert or replace into tennislive_player_sources(
          player_id, source_name, source_player_url, source_player_slug, tour,
          last_ingested_at, last_content_hash, last_source_snapshot_id, active
        ) values (?, ?, ?, ?, ?, ?, ?, ?, 1)
        """,
        (player_id, SOURCE_NAME, url, urlparse(url).path.strip("/"), "ATP" if "/atp/" in url else "WTA", captured_at, digest, snapshot_id),
    )
    losses = None
    if profile.get("matches_total") is not None and profile.get("wins") is not None:
        losses = int(profile["matches_total"]) - int(profile["wins"])
    con.execute(
        """
        insert into tennislive_player_profiles(
          player_id, source_name, source_player_url, name, country, birthdate, age,
          current_ranking, ranking_label, top_ranking, top_ranking_date, top_ranking_points,
          points, prize_money, matches_total, wins, losses, win_pct,
          source_snapshot_id, captured_at, raw_json
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            player_id, SOURCE_NAME, url, profile.get("name"), profile.get("country"), profile.get("birthdate"), profile.get("age"),
            profile.get("current_ranking"), profile.get("ranking_label"), profile.get("top_ranking"), profile.get("top_ranking_date"), profile.get("top_ranking_points"),
            profile.get("points"), profile.get("prize_money"), profile.get("matches_total"), profile.get("wins"), losses, profile.get("win_pct"),
            snapshot_id, captured_at, compact_json(profile),
        ),
    )
    surface_count = 0
    for record in surface_records(root):
        con.execute(
            """
            insert or replace into tennislive_player_surface_records(
              player_id, source_name, source_player_url, season, surface, wins, losses,
              win_pct, source_snapshot_id, captured_at, raw_text
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (player_id, SOURCE_NAME, url, record["season"], record["surface"], record["wins"], record["losses"], record["win_pct"], snapshot_id, captured_at, record["raw_text"]),
        )
        surface_count += 1
    links = extract_match_links(root, profile["name"], url, max_links)
    fetched = 0
    skipped = 0
    failed = 0
    for index, link in enumerate(links):
        link_id = stable_id("tennislive-match-link", player_id, link["source_match_url"])
        con.execute(
            """
            insert into tennislive_player_match_links(
              tennislive_match_link_id, player_id, source_name, source_player_url,
              source_match_url, match_date, round, player1_name, player2_name, opponent_name,
              result_text, score_text, tournament, surface, outcome, source_snapshot_id,
              ingest_status, raw_json
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(tennislive_match_link_id)
            do update set
              player_id = excluded.player_id,
              source_name = excluded.source_name,
              source_player_url = excluded.source_player_url,
              source_match_url = excluded.source_match_url,
              match_date = excluded.match_date,
              round = excluded.round,
              player1_name = excluded.player1_name,
              player2_name = excluded.player2_name,
              opponent_name = excluded.opponent_name,
              result_text = excluded.result_text,
              score_text = excluded.score_text,
              tournament = excluded.tournament,
              surface = excluded.surface,
              outcome = excluded.outcome,
              source_snapshot_id = excluded.source_snapshot_id,
              ingest_status = case
                when tennislive_player_match_links.ingest_status in ('normalized', 'fetch_failed')
                then tennislive_player_match_links.ingest_status
                else excluded.ingest_status
              end,
              raw_json = excluded.raw_json
            """,
            (
                link_id, player_id, SOURCE_NAME, url, link["source_match_url"], link["match_date"], link["round"], link["player1_name"], link["player2_name"],
                link["opponent_name"], link["result_text"], link["score_text"], link["tournament"], link["surface"], link["outcome"], snapshot_id, "discovered", compact_json(link),
            ),
        )
        if index >= max_matches:
            continue
        existing = con.execute("select last_content_hash from tennislive_match_sources where source_match_url = ?", (link["source_match_url"],)).fetchone()
        if existing and not force:
            skipped += 1
            continue
        try:
            result = ingest_match(con, link["source_match_url"], force=force)
            con.execute(
                "update tennislive_player_match_links set match_id = ?, last_ingested_at = ?, ingest_status = ? where tennislive_match_link_id = ?",
                (result["match_id"], utc_now(), "normalized", link_id),
            )
            fetched += 1
        except Exception as error:
            con.execute(
                "update tennislive_player_match_links set last_ingested_at = ?, ingest_status = ?, raw_json = ? where tennislive_match_link_id = ?",
                (utc_now(), "fetch_failed", compact_json({**link, "error": str(error)}), link_id),
            )
            failed += 1
    return {
        "player_id": player_id,
        "player": profile["name"],
        "snapshot_already_seen": already,
        "surface_records": surface_count,
        "match_links": len(links),
        "matches_fetched": fetched,
        "matches_skipped_existing": skipped,
        "matches_failed": failed,
    }


def ingest_match(con: sqlite3.Connection, url: str, force: bool = False) -> dict[str, Any]:
    html_text = fetch_url(url)
    root = parse_tree(html_text)
    summary = parse_match_summary(root, url)
    if not summary.get("player1_name") or not summary.get("player2_name"):
        raise ValueError(f"Could not parse TennisLive match summary from {url}")
    snapshot_id, digest, _, already = store_snapshot(con, url=url, html_text=html_text, source_date=summary.get("match_date"), page_kind="match")
    existing = con.execute("select match_id, last_content_hash from tennislive_match_sources where source_match_url = ?", (url,)).fetchone()
    if existing and existing["last_content_hash"] == digest and not force:
        return {"match_id": existing["match_id"], "skipped_existing": True}
    match_id, player1_id, player2_id = upsert_match(con, summary, url, snapshot_id)
    captured_at = utc_now()
    event_slug = urlparse(url).path.strip("/").split("/")[-1]
    con.execute(
        """
        insert or replace into tennislive_match_sources(
          match_id, source_name, source_match_url, source_match_slug, source_event_slug,
          source_event_label, last_ingested_at, last_content_hash, last_source_snapshot_id, active
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """,
        (match_id, SOURCE_NAME, url, urlparse(url).path.strip("/"), event_slug, summary.get("tournament"), captured_at, digest, snapshot_id),
    )
    con.execute(
        """
        insert or replace into tennislive_match_summaries(
          match_id, source_name, source_match_url, match_date, start_time_local, round,
          player1_name, player2_name, winner_name, score_text, tournament, tournament_url,
          country, surface, status, source_snapshot_id, captured_at, raw_json
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            match_id, SOURCE_NAME, url, summary.get("match_date"), summary.get("start_time_local"), summary.get("round"),
            summary.get("player1_name"), summary.get("player2_name"), summary.get("winner_name"), summary.get("score_text"),
            summary.get("tournament"), summary.get("tournament_url"), summary.get("country"), summary.get("surface"),
            summary.get("status"), snapshot_id, captured_at, compact_json(summary),
        ),
    )
    con.execute("delete from match_stat_rows where match_id = ? and source_name = ?", (match_id, SOURCE_NAME))
    stat_count = 0
    for row in parse_match_stats(root):
        for side, player_id in [("left", player1_id), ("right", player2_id)]:
            stat_row_id = stable_id("tennislive-stat", match_id, player_id, row["stat_name"], snapshot_id)
            con.execute(
                """
                insert or replace into match_stat_rows(
                  stat_row_id, match_id, player_id, source_name, stat_name, stat_value,
                  stat_made, stat_attempts, stat_text, period, source_snapshot_id
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, 'match', ?)
                """,
                (
                    stat_row_id, match_id, player_id, SOURCE_NAME, row["stat_name"], row[f"{side}_value"],
                    row[f"{side}_made"], row[f"{side}_attempts"], row[f"{side}_text"], snapshot_id,
                ),
            )
            stat_count += 1
    old_games = con.execute("select replay_game_id from replay_games where match_id = ? and source_name = ?", (match_id, SOURCE_NAME)).fetchall()
    for old in old_games:
        con.execute("delete from replay_points where replay_game_id = ?", (old["replay_game_id"],))
    con.execute("delete from replay_games where match_id = ? and source_name = ?", (match_id, SOURCE_NAME))
    con.execute("delete from tennislive_match_replay_points where match_id = ?", (match_id,))
    con.execute("delete from tennislive_match_replay_games where match_id = ?", (match_id,))
    replay_game_count = 0
    replay_point_count = 0
    for game in parse_replay(root):
        replay_game_id = stable_id("tennislive-replay-game", match_id, game["set_number"], game["game_number"], snapshot_id)
        server_id = None
        if normalize_name(game.get("server_name")) == normalize_name(summary.get("player1_name")):
            server_id = player1_id
        elif normalize_name(game.get("server_name")) == normalize_name(summary.get("player2_name")):
            server_id = player2_id
        con.execute(
            """
            insert or replace into replay_games(
              replay_game_id, match_id, set_number, game_number, server_player_id,
              winner_player_id, break_point_count, deuce_count, score_before, score_after,
              source_name, source_snapshot_id
            ) values (?, ?, ?, ?, ?, null, ?, ?, null, ?, ?, ?)
            """,
            (replay_game_id, match_id, game["set_number"], game["game_number"], server_id, game.get("break_point_count"), game.get("deuce_count"), game.get("score_after"), SOURCE_NAME, snapshot_id),
        )
        con.execute(
            """
            insert or replace into tennislive_match_replay_games(
              replay_game_id, match_id, set_number, game_number, server_name, score_before,
              score_after, raw_points_text, break_point_count, deuce_count, is_tiebreak,
              source_snapshot_id, captured_at
            ) values (?, ?, ?, ?, ?, null, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                replay_game_id, match_id, game["set_number"], game["game_number"], game.get("server_name"),
                game.get("score_after"), game.get("raw_points_text"), game.get("break_point_count"), game.get("deuce_count"),
                game.get("is_tiebreak"), snapshot_id, captured_at,
            ),
        )
        replay_game_count += 1
        for point in game.get("points") or []:
            replay_point_id = stable_id("tennislive-replay-point", replay_game_id, point["point_number"], point["raw_point_text"], snapshot_id)
            con.execute(
                """
                insert or replace into replay_points(
                  replay_point_id, replay_game_id, point_number, server_player_id,
                  point_winner_player_id, point_score, is_break_point, is_deuce,
                  is_tiebreak, source_name, source_snapshot_id
                ) values (?, ?, ?, ?, null, ?, ?, ?, ?, ?, ?)
                """,
                (replay_point_id, replay_game_id, point["point_number"], server_id, point["point_score"], point["is_break_point"], point["is_deuce"], point["is_tiebreak"], SOURCE_NAME, snapshot_id),
            )
            con.execute(
                """
                insert or replace into tennislive_match_replay_points(
                  replay_point_id, replay_game_id, match_id, set_number, game_number,
                  point_number, point_score, is_break_point, is_deuce, is_tiebreak,
                  raw_point_text, source_snapshot_id
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    replay_point_id, replay_game_id, match_id, game["set_number"], game["game_number"],
                    point["point_number"], point["point_score"], point["is_break_point"], point["is_deuce"],
                    point["is_tiebreak"], point["raw_point_text"], snapshot_id,
                ),
            )
            replay_point_count += 1
    return {
        "match_id": match_id,
        "skipped_existing": False,
        "snapshot_already_seen": already,
        "stats": stat_count,
        "replay_games": replay_game_count,
        "replay_points": replay_point_count,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch and normalize TennisLive player/match pages into sql-tennis.db.")
    parser.add_argument("--source-db", type=Path, default=DB_PATH)
    parser.add_argument("--player-url", action="append", default=[])
    parser.add_argument("--match-url", action="append", default=[])
    parser.add_argument("--max-links", type=int, default=None, help="Maximum lightweight match links to store per player page. Defaults to --max-matches.")
    parser.add_argument("--max-matches", type=int, default=10)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "ingest_tennis_tennislive_to_typed.json")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.player_url and not args.match_url:
        raise SystemExit("Provide at least one --player-url or --match-url.")
    con = get_connection(args.source_db)
    ensure_tennislive_schema(con)
    started = utc_now()
    max_links = args.max_links if args.max_links is not None else args.max_matches
    player_results = []
    match_results = []
    for url in args.player_url:
        try:
            player_results.append({"status": "ok", **ingest_player(con, url, max_links, args.max_matches, args.force)})
            con.commit()
        except Exception as error:
            con.rollback()
            player_results.append({"status": "failed", "source_player_url": url, "error": str(error)})
    for url in args.match_url:
        try:
            match_results.append({"status": "ok", **ingest_match(con, url, force=args.force)})
            con.commit()
        except Exception as error:
            con.rollback()
            match_results.append({"status": "failed", "source_match_url": url, "error": str(error)})
    report = {
        "ok": True,
        "script": "data-migration/scripts/ingest_tennis_tennislive_to_typed.py",
        "source_db": str(args.source_db),
        "started_at": started,
        "finished_at": utc_now(),
        "player_urls": args.player_url,
        "match_urls": args.match_url,
        "max_links": max_links,
        "max_matches": args.max_matches,
        "player_results": player_results,
        "match_results": match_results,
        "failures": [
            *[row for row in player_results if row.get("status") == "failed"],
            *[row for row in match_results if row.get("status") == "failed"],
        ],
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

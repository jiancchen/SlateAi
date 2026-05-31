#!/usr/bin/env python3

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
HISTORY_ROOT = ROOT / "data-private" / "history"
OUT_PATH = ROOT / "development-docs" / "mlb-pitcher-strikeout-gates-052926.md"


@dataclass
class KPropRow:
    date: str
    player: str
    over: bool
    hit: bool
    line: float
    actual: float
    confidence: int
    probability: float
    expected_value: float
    ip_lane: float | None
    k9_base: float | None
    tail: str
    lineup_status: str
    team_script: str
    tags: set[str]


def pct(hits: int, total: int) -> str:
    if total == 0:
        return "0.0%"
    return f"{(hits / total) * 100:.1f}%"


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header = "| " + " | ".join(headers) + " |"
    divider = "| " + " | ".join(["---"] * len(headers)) + " |"
    body = ["| " + " | ".join(row) + " |" for row in rows]
    return "\n".join([header, divider, *body])


def load_rows() -> list[KPropRow]:
    rows: list[KPropRow] = []
    for history_file in sorted(HISTORY_ROOT.glob("mlb-results-2026-05-*.jsonl")):
        for line in history_file.read_text().splitlines():
            if not line.strip():
                continue
            row = json.loads(line)
            if row.get("marketType") != "playerProp" or row.get("propType") != "pitcherStrikeouts":
                continue
            result = row.get("result") or {}
            if result.get("hit") not in (True, False):
                continue
            meta = row.get("meta") or {}
            reason = str(meta.get("reason") or "")
            match = re.search(r"([0-9.]+) IP lane \| ([0-9.]+) K/9 base \| (.+)$", reason)
            ip_lane = float(match.group(1)) if match else None
            k9_base = float(match.group(2)) if match else None
            tail = match.group(3) if match else ""
            rows.append(
                KPropRow(
                    date=str(row.get("date") or ""),
                    player=str(row.get("playerName") or ""),
                    over=" Over " in str(row.get("predictedPick") or ""),
                    hit=bool(result["hit"]),
                    line=float(row.get("lineThreshold") or 0.0),
                    actual=float(result.get("actualValue") or 0.0),
                    confidence=int(row.get("confidence") or 0),
                    probability=float(row.get("probability") or 0.0),
                    expected_value=float(row.get("expectedValue") or 0.0),
                    ip_lane=ip_lane,
                    k9_base=k9_base,
                    tail=tail,
                    lineup_status=str(meta.get("lineupStatus") or ""),
                    team_script=str(meta.get("teamScriptLabel") or ""),
                    tags=set(meta.get("scriptTags") or []),
                )
            )
    return rows


def gate(label: str, rows: list[KPropRow]) -> list[str]:
    hits = sum(1 for row in rows if row.hit)
    return [label, str(hits), str(len(rows)), pct(hits, len(rows))]


def main() -> None:
    rows = load_rows()
    overs = [row for row in rows if row.over]
    unders = [row for row in rows if not row.over]

    table = markdown_table(
        ["Gate", "Hits", "Bets", "Hit rate"],
        [
            gate("Baseline K props", rows),
            gate("Overs only", overs),
            gate("Unders only", unders),
            gate("Overs + opponent-whiff-lane", [row for row in overs if "opponent-whiff-lane" in row.tags]),
            gate("Overs + posted lineup", [row for row in overs if row.lineup_status == "posted"]),
            gate("Overs + posted lineup + opponent-whiff-lane", [row for row in overs if row.lineup_status == "posted" and "opponent-whiff-lane" in row.tags]),
            gate("Unders + short-leash-risk", [row for row in unders if "short-leash-risk" in row.tags]),
            gate("Unders + contact-resistance", [row for row in unders if "contact-resistance" in row.tags]),
            gate("Unders + short-leash-risk/contact-resistance", [row for row in unders if {"short-leash-risk", "contact-resistance"} & row.tags]),
        ],
    )

    report = f"""# MLB Pitcher Strikeout Gates — May 29, 2026

This is a first keeper/fade pass on the pitcher strikeout lane from the settled May journals.

Sample:
- settled `pitcherStrikeouts` rows: `{len(rows)}`
- dates covered: `2026-05-27` through `2026-05-28`

## Gate table

{table}

## What it says so far

- The sample is still small, so this is a **directional** read, not a finished model.
- Even with that caveat, the split is already useful:
  - `Overs` are at least viable: `{pct(sum(1 for row in overs if row.hit), len(overs))}`
  - `Unders` are poor: `{pct(sum(1 for row in unders if row.hit), len(unders))}`
- The cleanest early over lane is:
  - posted lineup
  - opponent whiff-friendly
  - starter volume live / normal leash
- The current under lane is not trustworthy enough yet. `short-leash-risk` and `contact-resistance` are not producing a strong enough keeper edge by themselves.

## Practical live use

For now:

1. Keep `K overs` when the starter has a real volume lane and the opponent is explicitly whiff-friendly.
2. Be more skeptical of `K unders` unless the short leash and contact suppression are both unusually strong.
3. Treat every `K under` as a thinner research lane than `TB`.

## Next upgrade

The next real improvement is to warehouse opponent strikeout-pressure context directly instead of inferring it from the note string:

- lineup rolling K-rate
- team whiff/chase/contact profile by handedness
- ump / called-strike environment if we can source it reliably
- starter first-time-through vs full-outing K shape
"""

    OUT_PATH.write_text(report)
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()

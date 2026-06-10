# Tennis Data Audit Runbook

This runbook freezes tennis model work and turns the next phase into a deterministic warehouse audit. The goal is to separate usable TennisLive-shaped data from legacy, synthetic, stale, or market-only shapes before any new model is designed.

AI assistance is allowed for measurement, report writing, query drafting, and evidence collection. AI assistance is not allowed to invent model rules, select betting decisions, or promote a row into a prediction surface without an explicit human-reviewed contract.

## Current Policy

- Archive `TEN-T0` as historical output and forensic evidence.
- Do not treat `TEN-T0` broad-board rows as production predictions.
- Do not create a replacement model during this audit phase.
- Treat TennisLive as the canonical deep tennis shape for active match, player, stat, replay, H2H, and form context.
- Treat DraftKings, FanDuel, Robinhood, and Kalshi as market coverage surfaces, not prediction surfaces.
- Quarantine questionable rows before deleting anything.
- Require settlement coverage before making performance claims.

## Audit Buckets

Every audited row or table should land in one of these buckets:

| Bucket | Meaning | Allowed use |
| --- | --- | --- |
| `canonical` | Matches the TennisLive/canonical warehouse shape and has usable identity/provenance. | Eligible for future model-input contracts. |
| `needs_review` | Mostly usable, but identity, source freshness, or critical fields need human review. | Review queue only. |
| `quarantine` | Legacy, synthetic, stale, market-only, or incomplete shape that must not feed prediction rows. | Historical/debug only. |
| `delete_candidate` | Duplicate or orphan data that is provably redundant after review. | No delete until separately approved. |

## Workstreams

### 1. Freeze `TEN-T0`

Record that `TEN-T0` is archived before any new tennis model work starts.

Checklist:

- Confirm `TEN-T0` runner and capture paths are not used by the public publish path.
- Mark current `prediction_rows` from `TEN-T0` as historical/forensic in audit output.
- Count `marketOnly` rows separately from true predictions.
- Preserve raw artifacts for diagnosis; do not backfill them into new prediction rows.

### 2. Warehouse Shape Inventory

Inventory every tennis table and classify it.

Required fields per table:

- table name
- row count
- date range where detectable
- primary key columns
- likely source family
- canonical/source-native/derived/market/model/legacy classification
- critical-null counts
- duplicate natural-key groups
- orphan-reference counts
- sample rows for non-canonical findings

### 3. TennisLive Canonical Shape Audit

Use `data-migration/contracts/tennislive_warehouse_mapping.md` as the source-of-truth mapping. A canonical active match shape should resolve:

- `matches.match_id`
- tournament/date/start/status/result
- two `match_players` rows with canonical `players.player_id`
- TennisLive match source URL where available
- source snapshot/provenance
- stat/replay/H2H/form sidecars when available

Rows that cannot attach to this shape should be excluded from model-input candidates.

### 4. Entity Resolution Audit

Build a human review queue for:

- duplicate players and aliases
- unresolved player names
- flipped player order
- match rows with missing participants
- participant rows without canonical players
- market rows with missing `player_id`
- synthetic ID-family collisions across `tl-*`, `dk-*`, `rh-*`, and old `rg-*`

Do not auto-merge identities unless a deterministic prior rule already exists.

### 5. Provenance And Freshness Audit

Every usable row needs source provenance.

Required checks:

- source name
- fetch run or source snapshot link
- captured time
- cache-valid-until time when applicable
- parser/ingestor version when available
- stale status for public/prediction use
- missing source status rows

Rows without provenance may be retained for context but cannot be canonical model input.

### 6. Market Data Audit

Markets must be audited separately from predictions.

Required checks:

- source coverage by date and source
- match/player linkage
- stale price windows
- duplicate snapshots
- missing price fields
- conflicting prices
- market-only inventory rows

Market-watch rows must not be captured into `prediction_rows` unless a separate prediction contract explicitly authorizes it.

### 7. Result And Settlement Audit

Before any future model can be evaluated:

- identify canonical final score/result rows
- handle walkover, retirement, abandoned, and canceled matches
- define settlement rules per future lane
- audit `settlement_rows` coverage by date and model
- backfill gaps only after source/result provenance is clear

No settlement coverage means no performance claim.

### 8. Feature Readiness Audit

Only after canonical matches/entities are clean:

- list candidate feature tables and columns
- measure sparsity by date/tour/surface/source
- flag future-data leakage risk
- separate source-derived, market-derived, and model-derived features
- mark sparse or stale features as research-only

This audit does not select a model feature set.

### 9. Export Contract Audit

Public outputs are data products and must be auditable.

Required checks:

- exported game count equals canonical DB count for the selected export contract
- prediction rows are actually predictions
- value rows are actually value rows
- market-watch rows are labeled as market watch
- preflight failures block or degrade status
- no private/raw paths leak
- `ready` status has enforceable meaning

## Standard Commands

Run the table/shape audit:

```bash
python3 data-migration/scripts/audit_tennis_data_shapes.py \
  --db data-private/warehouse/sports/tennis/sql-tennis.db \
  --out data-migration/reports/tennis_data_shape_audit_YYYY-MM-DD.json \
  --markdown data-migration/reports/tennis_data_shape_audit_YYYY-MM-DD.md
```

Run source preflight for a date before accepting any export:

```bash
node data-migration/scripts/prediction_preflight.mjs \
  --sport tennis \
  --date YYYY-MM-DD \
  --lane value \
  --report data-migration/reports/prediction_preflight_tennis_YYYY-MM-DD_value.json
```

Run DB-derived public export preview only after the audit marks the date usable:

```bash
python3 data-migration/scripts/export_tennis_public_from_db.py \
  --date YYYY-MM-DD \
  --model TEN-T0 \
  --out-dir data-migration/export-previews/tennis/YYYY-MM-DD \
  --force \
  --dry-run
```

## Review Gates

Do not proceed to new model design until these are true:

- canonical/needs-review/quarantine/delete-candidate counts are generated
- TennisLive canonical shape gaps are known by date
- market-only rows are separated from predictions
- `TEN-T0` historical rows are marked as archived or forensic
- source freshness status is attached to the audit
- settlement coverage and result gaps are visible
- public export status cannot say `ready` while preflight is blocked

## Deliverables

Each audit pass should produce:

- JSON report for machine comparison
- Markdown report for human review
- exact SQL/query evidence for blocker counts
- examples for each quarantine category
- a follow-up checklist with owner-reviewed decisions


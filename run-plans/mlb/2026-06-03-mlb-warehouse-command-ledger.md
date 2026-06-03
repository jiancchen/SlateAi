# MLB Warehouse Command Replacement Ledger

Date: 2026-06-03

Ledger version: 1.1.0

Typed CLI version: `pipeline/mlb/warehouse/mlb_typed_warehouse.py` v1.0.0

Scope: first-pass ledger for replacing `pipeline/mlb/warehouse/mlb_warehouse.py` command by command without path-flipping the legacy `sports.db` script into the typed MLB DB.

## Decision Rules

- `mlb_warehouse.py` remains legacy until every active command is replaced, renamed as legacy M2, or retired.
- New typed replacement commands live in `pipeline/mlb/warehouse/mlb_typed_warehouse.py`; do not keep modifying the old monolith for typed DB work.
- New M3 feature materialization lives under `pipeline/mlb/features/`; do not bake feature math into ingestion wrappers.
- Retired M2 warehouse scripts move under `pipeline/mlb/warehouse/archive-m2/` only after package aliases and runtime callers are gone.
- New canonical MLB ingestion writes `data-private/warehouse/sports/mlb/sql-mlb.db`.
- Raw ingestion means source receipts, identifiers, replay state, official facts, and market snapshots only.
- Expected PA, shrinkage, hot/cold labels, pitch kernels, mistake shapes, and story labels belong in a versioned feature layer, not raw ingestion.
- M2 research commands stay available for old runs but must not become M3 contracts.
- Package scripts should move only after a command has a typed replacement plus validation report.

## Non-Replacement Typed Commands

These commands live on the typed CLI but are not counted as legacy warehouse replacements:

| Command | Package Script | Purpose |
|---|---|---|
| `status` | `data:typed:mlb-warehouse -- status` | Read typed DB table counts and source freshness. |
| `audit-command-ledger` | `data:typed:mlb-audit` | Check ledger coverage against legacy command names and implemented typed replacements. |
| `validate-typed-ready` | `data:typed:mlb-validate`, `data:typed:mlb-validate-day` | Run typed daily/raw and M3 contract validators with compact parent reports. |

## Replacement DAG

```mermaid
flowchart TD
  A["mlb_warehouse.py command"] --> B{"Command class"}
  B --> C["Raw typed ingestion"]
  B --> D["Versioned feature-layer job"]
  B --> E["Legacy M2 only"]
  B --> F["Typed read/report utility"]
  B --> G["Retire"]

  C --> H["Typed DB write + source_fetch_status + validator"]
  D --> I["Feature table/version + inputs + backtest/QA report"]
  E --> J["Keep callable until M2 sunset; do not wire to M3"]
  F --> K["Read typed DB only; no writes"]
  G --> L["Remove or replace package script after callers are gone"]
```

## Status Legend

| Status | Meaning |
|---|---|
| `adapter-exists` | A typed adapter/script already exists, but package wiring may still need replacement. |
| `typed-cli-exists` | A command exists in the new typed warehouse CLI, but the legacy package alias has not been fully cut over. |
| `wrapper-needed` | The typed pieces exist, but a CLI/orchestrator replacement is still missing. |
| `feature-rewrite` | Logic should move into a versioned feature-layer job. |
| `legacy-m2` | Keep only for old M2 workflows. Do not use for M3. |
| `typed-read-needed` | Replace with a read-only typed DB report/list command. |
| `retire` | Remove or stop exposing after callers are confirmed gone. |

## Audit Checkpoint: 2026-06-03

`data-migration/reports/mlb_typed_warehouse_command_audit_2026-06-03.json` confirms:

- Ledger commands: 39.
- Legacy commands found in `mlb_warehouse.py`: 39.
- Typed replacement commands implemented in `mlb_typed_warehouse.py`: 16.
- Implemented replacements: `derive-batter-outcomes`, `ingest-hitter-career-profiles`, `ingest-hitter-lineup-splits`, `ingest-hitter-statcast-range`, `ingest-mlb-day`, `ingest-mlb-range`, `init-db`, `list-bullpen-shape`, `list-bullpen-usage`, `list-first5`, `list-home-runs`, `list-likely-relievers`, `list-probable-starters`, `list-story-signals`, `prepare-mlb-day`, `replay-mlb-range-from-raw`.
- Ledger drift: zero missing legacy commands and zero extra typed replacement commands.
- Non-replacement typed utilities: `status`, `audit-command-ledger`, `validate-typed-ready`.

`data-migration/reports/mlb_db_input_cutover_audit_active_2026-06-03.json` confirms:

- Active direct `sports.db` runtime reads: zero.
- Active legacy warehouse CLI callers: zero.
- Active audit targets include `package.json`, so direct package-script legacy calls are covered.
- M2-only feature/import/grade package aliases and workflow calls are quarantined behind `models/mlb/cartridges/MLB-M2/workflows/archive-m2/legacy-warehouse.mjs`.
- Active generated/public/private artifact inputs still remain in snapshot, history, verify, follow-up, and day-file surfaces; those are the next DB-input cutover targets.

## Command Ledger

| Command | Package Script | Class | Priority | Status | Replacement Target | Next Action |
|---|---|---|---:|---|---|---|
| `init-db` | `data:init` | retire/schema migration | P0 | `typed-cli-exists` | `mlb_typed_warehouse.py init-db` wrapping typed sport-DB schema create/verify plus no-write schema validation | Primary package alias points to typed CLI; `--dry-run` is report-only and wrapper does not expose destructive force reset. |
| `ingest-mlb-day` | `data:ingest:mlb-day`, `data:typed:ingest:mlb-day` | raw typed ingestion | P0 | `typed-cli-exists` | `mlb_typed_warehouse.py ingest-mlb-day` wrapping `ingest_mlb_schedule_game_feed_raw_to_typed.py` | Primary package alias points to typed CLI; next gate is write idempotency validation. |
| `ingest-mlb-range` | `data:ingest:mlb-range`, `data:typed:ingest:mlb-range` | raw typed ingestion | P0 | `typed-cli-exists` | `mlb_typed_warehouse.py ingest-mlb-range` looping the schedule/game-feed typed adapter | Primary package alias points to typed CLI; next gate is multi-day idempotency validation. |
| `replay-mlb-range-from-raw` | `data:replay:mlb-raw-range`, `data:typed:replay:mlb-raw-range` | raw typed ingestion | P0 | `typed-cli-exists` | `mlb_typed_warehouse.py replay-mlb-range-from-raw` looping the schedule/game-feed typed adapter | Primary package alias points to typed CLI; next gate is range replay validation. |
| `prepare-mlb-day` | `data:prep:mlb-day`, `data:typed:prep:mlb-day` | orchestration | P1 | `typed-cli-exists` | `mlb_typed_warehouse.py prepare-mlb-day` orchestrating feed lookback, lineups, markets/props, and player context adapters | Primary package alias points to typed CLI; next gate is validator bundle/freshness gate. |
| `list-probable-starters` | `data:list:probables`, `data:list:probables:typed` | typed read/report | P0 | `typed-cli-exists` | `mlb_typed_warehouse.py list-probable-starters` over typed `starting_pitchers`, `games`, `teams`, `players` | Primary package alias points to typed CLI; validate typed output against legacy output if historical parity is still needed. |
| `derive-mlb-features` | `data:derive:mlb` | feature layer | P1 | `feature-rewrite` | rolling team/starter/bullpen feature jobs | Split into typed feature builders with feature-set IDs and validators. |
| `derive-story-signals` | `data:derive:stories` | feature layer | P2 | `feature-rewrite` | game-story signal feature job from typed replay state | Rebuild as M3 story-transition feature job. |
| `derive-tier2-features` | `data:derive:tier2-mlb` | feature layer | P2 | `feature-rewrite` | team story priors, lineup dependency, starter leash, series context | Port only after core feature tables and contracts are named. |
| `derive-tier3-features` | `data:derive:tier3-mlb` | feature layer | P2 | `feature-rewrite` | reliever first-batter command, starter third-time profiles | Port as separate feature jobs with explicit lookback windows. |
| `derive-hidden-edge-features` | `data:derive:hidden-edges` | feature layer | P2 | `feature-rewrite` | whiff persistence, lead surrender, form carryover | Rebuild as experimental M3 feature family, not ingestion. |
| `derive-state-snapshots` | `data:derive:state-snapshots` | feature layer | P1 | `feature-rewrite` | team/hitter state snapshots from typed facts | Define state snapshot feature contract and rebuild from typed tables. |
| `derive-hitter-classic-trends` | none | feature layer | P1 | `feature-rewrite` | hitter recent/rolling classic trends | Rebuild as player form feature job. |
| `derive-hitter-opponent-context` | none | feature layer | P2 | `feature-rewrite` | hitter opponent-strength context | Rebuild after opponent/team context tables are stable. |
| `derive-market-context` | none | feature layer | P2 | `feature-rewrite` | team market-history and opponent-quality context | Rebuild from typed market tables and outcomes. |
| `derive-mistake-shapes` | `data:derive:mistake-shapes` | feature layer | P1 | `feature-rewrite` | team, starter, bullpen, and lineup mistake-shape feature jobs | Promote as M3 feature family because it feeds chaos/game-shape work. |
| `derive-first-inning-profiles` | `data:derive:first-inning-profiles` | feature layer | P2 | `feature-rewrite` | team/starter first-inning profiles | Rebuild as scoped feature job with validation against F1/F5 outcomes. |
| `derive-story-labels` | `data:derive:story-labels` | label layer | P1 | `feature-rewrite` | game-story labels, phase outcomes, market mispricing labels | Rebuild as M3 backtest/label job, not pregame ingestion. |
| `derive-state-formula-rows` | `data:derive:mlb-state-formulas` | legacy M2 | P3 | `legacy-m2` | none for M3; future simulator feature labels if useful | Leave legacy; do not wire into M3. Mine ideas later. |
| `derive-player-identity-rows` | `data:derive:mlb-player-identity` | legacy M2 | P3 | `legacy-m2` | future M3 player identity feature jobs | Leave legacy; reimplement expected PA/shrinkage/deviation ideas in feature layer later. |
| `derive-pitcher-batter-kernel` | `data:derive:mlb-pitcher-batter-kernel` | legacy M2 | P3 | `legacy-m2` | future M3 pitch-mix matchup feature jobs | Leave legacy; reimplement pitch kernel with typed pitch events later. |
| `backtest-m2-research` | `data:backtest:mlb-m2-research` | legacy M2 | P3 | `legacy-m2` | future M3 experiment/backtest runner | Leave legacy; do not use as M3 backtest framework. |
| `ingest-pitcher-war` | `data:ingest:pitcher-war` | supplemental raw ingestion | P2 | `wrapper-needed` | player/pitcher context typed ingestor | Decide whether Baseball-Reference WAR remains an approved M3 source; if yes, add typed raw receipt and table target. |
| `ingest-statcast-hr` | `data:ingest:statcast-hr` | supplemental raw ingestion | P2 | `wrapper-needed` | player context / Statcast typed ingestion | Add typed Statcast leaderboard ingestor or retire if detailed Statcast pitch/batted-ball data supersedes it. |
| `ingest-hitter-statcast-range` | `data:ingest:hitter-statcast-range` | supplemental raw ingestion | P1 | `typed-cli-exists` | `mlb_typed_warehouse.py ingest-hitter-statcast-range` wrapping `ingest_mlb_player_context_raw_to_typed.py --skip-player-context` | Primary package alias points to typed CLI; validate dry-run and then live write on a small date range. |
| `ingest-hitter-career-profiles` | `data:ingest:hitter-career-profiles` | supplemental raw ingestion | P1 | `typed-cli-exists` | `mlb_typed_warehouse.py ingest-hitter-career-profiles` wrapping `fetch_mlb_hitter_career_profiles.py` plus `ingest_mlb_player_context_raw_to_typed.py` | Primary package alias points to typed CLI; next gate is live fetch/write validation on a small player batch. |
| `ingest-hitter-lineup-splits` | `data:ingest:hitter-lineup-splits` | supplemental raw ingestion | P2 | `typed-cli-exists` | `mlb_typed_warehouse.py ingest-hitter-lineup-splits` wrapping `ingest_mlb_lineups_raw_to_typed.py --lineup-file` | Primary package alias points to typed CLI; validate against a generated lineup board before retiring old split writes. |
| `derive-hitter-statcast-trends` | `data:derive:hitter-statcast-trends` | feature layer | P1 | `feature-rewrite` | hitter Statcast rolling trend feature job | Rebuild from typed Statcast/player context tables. |
| `derive-batter-outcomes` | `data:derive:batter-outcomes` | typed normalization/label layer | P1 | `typed-cli-exists` | `mlb_typed_warehouse.py derive-batter-outcomes` wrapping `normalize_mlb_results.py` plus results validation on live writes | Primary package alias points to typed CLI; next gate is live write/validation on a small date. |
| `import-predictions` | `data:import:hr` | prediction write path | P3 | `retire` | typed model run index + `normalize_mlb_predictions.py` where needed | Retire old HR import or replace with typed model-output writer. |
| `import-prop-predictions` | `data:import:mlb-props` | prediction write path | P3 | `retire` | typed model run index + `prediction_rows` | Retire old prop import or replace with typed model-output writer. |
| `grade-home-run-picks` | `data:grade:hr` | settlement/evaluation | P3 | `wrapper-needed` | `settle_mlb_ml_prediction_rows.mjs`, prediction validators | Replace with typed settlement command after prediction writer is canonical. |
| `grade-prop-picks` | `data:grade:mlb-props` | settlement/evaluation | P3 | `wrapper-needed` | typed settlement/backtest validators | Replace with typed settlement command after prop prediction writer is canonical. |
| `list-home-runs` | `data:list:hr` | typed read/report | P3 | `typed-cli-exists` | `mlb_typed_warehouse.py list-home-runs` over typed `home_run_events`, `games`, and `teams` | Primary package alias points to typed CLI; validate output against legacy only if old report parity matters. |
| `list-first5` | `data:list:first5` | typed read/report | P2 | `typed-cli-exists` | `mlb_typed_warehouse.py list-first5` over typed `game_outcomes`, `games`, and `teams` | Primary package alias points to typed CLI; output is canonical typed F5 facts. |
| `list-bullpen-usage` | `data:list:bullpen` | typed read/report | P2 | `typed-cli-exists` | `mlb_typed_warehouse.py list-bullpen-usage` over typed `bullpen_usage_snapshots`, `teams`, and `players` | Primary package alias points to typed CLI; feature math still stays out of ingestion. |
| `list-likely-relievers` | `data:list:relievers` | typed read/report | P2 | `typed-cli-exists` | `mlb_typed_warehouse.py list-likely-relievers` over typed `likely_relief_chains`, `teams`, and `players` | Primary package alias points to typed CLI; later M3 reliever-chain jobs can replace the upstream table logic. |
| `list-bullpen-shape` | `data:list:bullpen-shape` | typed read/report | P2 | `typed-cli-exists` | `mlb_typed_warehouse.py list-bullpen-shape` over typed `team_bullpen_shape_snapshots` and `teams` | Primary package alias points to typed CLI; later M3 bullpen-shape jobs can replace the upstream table logic. |
| `list-story-signals` | none | typed read/report | P3 | `typed-cli-exists` | `mlb_typed_warehouse.py list-story-signals` over typed `game_story_signals`, `phase_outcomes`, `games`, and `teams` | No package alias currently; command exists for typed debugging/report parity. |

## Suggested Cut Order

1. **P0 raw/read blockers**: `list-probable-starters`, `replay-mlb-range-from-raw`, `ingest-mlb-range`, `ingest-mlb-day`.
2. **P1 typed day readiness**: `prepare-mlb-day`, `derive-state-snapshots`, `derive-mistake-shapes`, `derive-story-labels`, hitter/player context adapters.
3. **P1/P2 feature families**: rolling form, hitter trends, market context, first-inning, tier2/tier3/hidden-edge families.
4. **P3 legacy quarantine**: keep M2 feature/backtest commands callable but relabel package scripts or move to a legacy namespace after current users are cut over.
5. **P3 reporting cleanup**: replace or retire import/grade/list utilities after typed model outputs and settlement are stable.

## Open Questions

- Should Baseball-Reference WAR remain an approved M3 source, or should pitcher season context come from MLB/Statcast-only feeds?
- Should historical HR leaderboard snapshots stay as a distinct source, or are typed pitch/batted-ball events enough?
- Where should hitter lineup split rows live: player context, lineup context, or derived feature layer?
- Which old list/report commands are still used by daily workflow versus just historical debugging?

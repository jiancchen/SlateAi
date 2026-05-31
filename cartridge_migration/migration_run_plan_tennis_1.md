# Tennis Cartridge Migration Run Plan 1

## Purpose

Build the first formal tennis cartridge/run framework without changing tennis model math.

This migration exists to make future AI-assisted model iterations safer. The core rule is:

- New logic means a new cartridge version.
- New day with the same logic means a new immutable run snapshot.
- Existing warehouse data stays append-only.
- No existing tennis DB data is deleted or destructively modified.

## Current Baseline

- Current model cartridge: `T0`
- Current feature version: `F0`
- Current warehouse version before this migration: `W0`
- Current evaluator version: `E0`
- Golden lock date: `2026-05-31`

Existing T0 artifacts:

- `pipeline/tennis_model_cartridges/T0/manifest.json`
- `data-private/model-cartridges/tennis/T0/golden/2026-05-31.snapshot.json`
- `data-private/model-cartridges/tennis/T0/calibration/2026-05-31.calibration.json`
- `pipeline/verify-tennis-model-snapshot.mjs`

Current warehouse of record:

- `data-private/warehouse/sports.db`

Important: `data-private/tennis.db` exists locally, but this migration should not assume it is authoritative. Treat it as legacy/stray unless a later audit proves otherwise. All W1 tables should be added to `data-private/warehouse/sports.db`.

## Warehouse Split Decision

Do not split `sports.db` during this migration.

The cleaner future shape is likely:

- `data-private/warehouse/tennis.db`
- `data-private/warehouse/mlb.db`
- optional `data-private/warehouse/shared.db` for source snapshots, deploy records, and cross-sport model history

But that belongs to a later migration. W1 stays inside `sports.db` to avoid mixing model-cartridge work with warehouse relocation.

For this migration, new code should use a warehouse path resolver instead of hard-coding `sports.db`. Existing scripts can keep their current paths until a dedicated DB split migration.

## Target Outcome

After this migration, tennis model runs should be represented as:

```text
Raw data -> Warehouse W1 -> Feature F0 -> Model T0 -> Evaluator E0 -> Daily run snapshot
```

The system should be able to answer:

- Which cartridge stack produced this prediction?
- Which files were part of the run?
- Which input data was read?
- Which output snapshot was locked?
- Which backtest/calibration existed at run time?
- Was this run active, shadow, locked, superseded, or experimental?
- Which public/static export was produced from the run?
- Which deployed site build, if any, included the run?
- Which data-source coverage gates passed or failed before publishing?

## Non-Goals

- Do not improve the tennis model.
- Do not tune O/U, ML, spread, set-win, or Kalshi logic.
- Do not change MLB.
- Do not delete or rename existing DB tables or columns.
- Do not rewrite historical outputs in place.

## Versioning Rules

### Raw Data

Raw data is additive.

Allowed:

- Add new source files.
- Add new source tables.
- Add new rows.
- Add input hashes to run snapshots.

### Warehouse

Warehouse schema is append-only.

Allowed:

- Create new tables.
- Add nullable columns.
- Add indexes.
- Add views.
- Insert new versioned rows.

Not allowed:

- Drop tables.
- Drop columns.
- Rename columns.
- Overwrite historical model runs.
- Rewrite old grades without preserving provenance.

### Feature Cartridge

Feature changes create `F1`, `F2`, etc. if they alter model-ready values.

### Model Cartridge

Prediction logic changes create `T1`, `T2`, etc.

Examples that require a new model cartridge:

- Changing win probability logic.
- Changing EV gates.
- Changing match total or first-set O/U math.
- Changing spread logic.
- Changing Kalshi trade-to-sell rules.
- Changing writeup logic if it changes displayed model rationale or recommendation.

### Evaluator

Backtest/grading changes create `E1`, `E2`, etc.

Examples:

- Changing grading rules.
- Changing ROI calculation.
- Changing bucket definitions.
- Changing calibration metrics.

## Proposed Directory Shape

```text
pipeline/
  tennis_model_registry.json

  tennis_warehouse_migrations/
    W1/
      001_add_model_run_tables.sql
      002_add_model_run_grade_tables.sql

  tennis_model_cartridges/
    T0/
      manifest.json
      model_description.json
      MODEL_NOTES.md
      runner.mjs
      output-contract.json

    F0/
      manifest.json
      feature-contract.json

    E0/
      manifest.json
      metrics-contract.json

data-private/
  model-runs/
    tennis/
      T0/
        2026-05-31/
          run.json
          files.lock.json
          inputs.lock.json
          predictions.snapshot.json
          calibration.json
          backtest.json
          grades.json
          postmatch-grades.json
          health.json
          publish.json
```

`runner.mjs` may begin as a thin wrapper around `pipeline/generate-tennis-day-module.mjs --model T0`. It exists to make the cartridge interface real without duplicating model math yet.

## DB Additions

Migration set: `W1`

Add tables only. Do not modify existing tennis tables destructively.

Minimum tables:

```sql
tennis_schema_migrations
tennis_model_runs
tennis_model_run_files
tennis_model_run_inputs
tennis_model_run_outputs
tennis_model_run_metrics
tennis_model_run_events
tennis_model_run_training_rows
```

### `tennis_schema_migrations`

Tracks append-only schema migrations.

Suggested columns:

```text
migration_id
warehouse_version
file_path
sha256
applied_at
status
notes
```

### `tennis_model_runs`

Required columns:

```text
run_id
slate_date
sport
warehouse_version
feature_version
model_id
evaluator_version
mode
status
created_at
locked_at
input_hash
source_hash
output_hash
git_commit
git_dirty
cartridge_stack_json
notes
```

Expected statuses:

```text
created
active
shadow
locked
superseded
failed
experimental
```

### `tennis_model_run_files`

Tracks source files used in a run.

Suggested columns:

```text
run_id
file_path
file_role
sha256
file_exists
created_at
```

### `tennis_model_run_inputs`

Tracks raw/input data files used in a run.

Suggested columns:

```text
run_id
input_path
input_role
sha256
input_exists
captured_at
created_at
```

### `tennis_model_run_outputs`

Tracks output artifacts.

Suggested columns:

```text
run_id
output_path
output_role
sha256
created_at
```

### `tennis_model_run_metrics`

Stores backtest/calibration summaries.

Suggested columns:

```text
run_id
metric_scope
metric_name
metric_value
sample_size
payload_json
created_at
```

### `tennis_model_run_events`

Append-only audit log.

Suggested columns:

```text
run_id
event_type
event_message
payload_json
created_at
```

### `tennis_model_run_training_rows`

Run-scoped snapshot of the model-ready corpus used for backtests/training.

Suggested columns:

```text
run_id
row_hash
slate_date
match_id
side
payload_json
label_available
created_at
```

Known risk: `pipeline/tennis_multimodel_backtest.py` currently refreshes `tennis_model_training_rows` with `if_exists="replace"`. That table can remain as a legacy/current scratch table, but W1 needs a run-scoped append-only snapshot so historical cartridge runs remain reproducible.

## Registry

Create `pipeline/tennis_model_registry.json`.

Initial shape:

```json
{
  "sport": "tennis",
  "active": {
    "warehouse": "W1",
    "features": "F0",
    "model": "T0",
    "evaluator": "E0"
  },
  "shadow": [],
  "promotionPolicy": {
    "minimumSettledRows": 30,
    "requiredBuckets": ["ML", "spread", "match_total", "first_set_total", "set_win", "kalshi_trade_to_sell"]
  }
}
```

The registry should also become the place to discover the active runner command and publish contract. Do not hard-code `T0` in new scripts if it can be read from the registry.

## Data Source Contracts

Each run should record source coverage, not just final prediction files. At minimum:

- ESPN scoreboard: raw path, source URL, captured timestamp, singles count.
- Ranking snapshot: raw path, as-of date, ATP/WTA counts, missing-rank count.
- Flashscore recent form: raw map path, fetched rows, matched rows, recent rows, missing stat cells.
- SofaScore slate/replays: raw path(s), mapped event count, stat/replay coverage, H2H coverage.
- FanDuel lines: raw path, moneyline/spread/match-total/first-set-total/set-win coverage, unavailable reasons.
- Kalshi/prediction market: snapshot path, market count, candle/history coverage, missing mapping count.
- Weather: hourly raw path, match-window coverage, missing weather-window count.

Data-source coverage should be written into `health.json`, `tennis_model_run_metrics`, and, where useful, `tennis_model_run_events`.

## Component Ownership Map

Use this map to prevent future AI edits from scattering logic across duplicate scripts:

- Raw fetchers: ESPN, rankings, Flashscore, SofaScore, FanDuel, Kalshi, and weather capture scripts. These are source-locked for a run but do not create `Tn` by themselves unless their parsing changes model-ready meaning.
- Warehouse `Wn`: SQLite schema, import commands, identity/mapping tables, and append-only persistence rules.
- Feature cartridge `Fn`: model-ready feature definitions, recent-form transformations, market-derived features, weather features, replay-flow features, and training-row construction.
- Model cartridge `Tn`: win probability, spread/total/set-win/Kalshi trade scoring, gates, confidence, and recommendation/writeup logic.
- Evaluator `En`: grading, ROI, calibration buckets, settled labels, backtest reports, and promotion criteria.
- Export/UI: public data export and React display. These do not become model cartridges, but they must be source-locked because they can misrepresent a model run.

If a script owns more than one layer today, the manifest should say so. Do not split behavior during this migration unless it is required for locking.

## Run Manifest

Create `run.json` for each daily run.

Initial May 31 run:

```json
{
  "runId": "tennis-2026-05-31-W1-F0-T0-E0",
  "sport": "tennis",
  "slateDate": "2026-05-31",
  "warehouseVersion": "W1",
  "featureVersion": "F0",
  "modelId": "T0",
  "evaluatorVersion": "E0",
  "mode": "pregame",
  "status": "locked"
}
```

## Source Lock Rules

Before locking a run, the AI must:

- Run `git diff --name-only`.
- Classify every changed file.
- Record source files in `files.lock.json`.
- Hash source files.
- Record input files in `inputs.lock.json`.
- Hash input files.
- Run the T0 snapshot verifier.
- Store output hashes.
- Mark run `locked`.
- Record current git commit.
- Record whether the worktree is dirty.
- Record changed files and their classifications in the run event log.

Changed file classifications:

- `warehouse_migration`
- `feature_code`
- `model_code`
- `evaluator_code`
- `export_code`
- `ui_code`
- `test_code`
- `generated_artifact`
- `documentation`

Required source-code inventory for T0 should include more than the final day generator. Audit before implementation, but expected files include:

- `pipeline/generate-tennis-day-module.mjs`
- `pipeline/tennis_multimodel_backtest.py`
- `pipeline/tennis_value_backtest.py`
- `pipeline/model_kalshi_tennis_spike.py`
- `pipeline/project_kalshi_tennis_trade_candidates.py`
- `pipeline/analyze_kalshi_tennis_intramatch.py`
- `pipeline/export_tennis_warehouse_context.py`
- `pipeline/tennis_warehouse.py`
- `pipeline/tennis_pipeline_health.py`
- `pipeline/verify-tennis-model-snapshot.mjs`
- `web/src/lib/tennis-source-mapping.js`
- `api/src/scripts/export-published-data.ts`

If a file influences predictions, value-book rows, public exports, health gates, or grading, it belongs in a lock or in a referenced component manifest.

Environment lock should record:

- Node version.
- Python version.
- `package.json` hash.
- `web/package-lock.json` hash.
- Any Python dependency file if one is added later.

## Cartridge Boundary Rules

- Locked cartridges are immutable.
- New prediction behavior creates `T1`, `T2`, etc.
- New model-ready feature behavior creates `F1`, `F2`, etc.
- New grading/backtest behavior creates `E1`, `E2`, etc.
- New warehouse schema creates `W2`, `W3`, etc.
- Experimental work lives outside the active cartridge until promoted.
- A new cartridge starts by copying the previous cartridge and changing only the files required for that version.
- Every cartridge must expose a runner command, output contract, model description, human model notes, and known calibration artifacts.
- Daily run snapshots are not cartridges; they are runs of a cartridge stack.
- Database relocation is not a model cartridge change by itself. It should get a warehouse migration/version and compatibility plan.

## Cartridge Creation Runbook

Use this as the command-shaped checklist for each new tennis cartridge. Replace `T1`, dates, and notes with the actual version.

```bash
MODEL_ID=T1
PREV_MODEL_ID=T0
CARTRIDGE_DIR="pipeline/tennis_model_cartridges/${MODEL_ID}"
PREV_DIR="pipeline/tennis_model_cartridges/${PREV_MODEL_ID}"

mkdir -p "$CARTRIDGE_DIR"
cp "$PREV_DIR/manifest.json" "$CARTRIDGE_DIR/manifest.json"
cp "$PREV_DIR/model_description.json" "$CARTRIDGE_DIR/model_description.json"
cp "$PREV_DIR/MODEL_NOTES.md" "$CARTRIDGE_DIR/MODEL_NOTES.md"
cp "$PREV_DIR/runner.mjs" "$CARTRIDGE_DIR/runner.mjs"
cp "$PREV_DIR/output-contract.json" "$CARTRIDGE_DIR/output-contract.json"
```

Then edit the copied files:

```bash
$EDITOR "$CARTRIDGE_DIR/manifest.json"
$EDITOR "$CARTRIDGE_DIR/model_description.json"
$EDITOR "$CARTRIDGE_DIR/MODEL_NOTES.md"
$EDITOR "$CARTRIDGE_DIR/runner.mjs"
```

Required cartridge files:

- `manifest.json`: model ID, sport, stack versions, entrypoint, contracts, model-note paths, and source inventory.
- `model_description.json`: machine-readable model card with `keyImprovements`, `keyMetrics`, `notes`, and `knownLimitations`.
- `MODEL_NOTES.md`: human-readable model card explaining the model goal, changes, limits, metrics, and promotion rules.
- `runner.mjs`: stable cartridge entrypoint.
- `output-contract.json`: public output shape expected by verification, export, and UI.

After the first slate run for a new cartridge:

```bash
npm run data:verify:tennis-model -- --date YYYY-MM-DD --model "$MODEL_ID"
npm test
npm --prefix api run build
npm --prefix web run build
npm run data:export:published
npm run data:export:public-current -- --date YYYY-MM-DD --include-dates=YYYY-MM-DD
```

Do not lock the cartridge while it is still in active build/debug mode. Once the cartridge is stable, create the golden snapshot, calibration artifact, run manifest, and DB run rows in `data-private/model-runs/tennis/${MODEL_ID}/YYYY-MM-DD/`.

## Leakage Rules

Pregame runs cannot use post-match data.

Every run should distinguish:

- `pregame`
- `live`
- `postmatch`
- `rerun`
- `backtest`

Important examples:

- FanDuel lines are allowed if captured before match.
- Kalshi pre-match price is allowed if captured before match.
- SofaScore replay game flow is not allowed for pregame prediction of the same match.
- Results are not allowed for pregame prediction.
- Later replay/backtest may use settled data, but must be marked as `rerun` or `backtest`.

## Run Lifecycle

Each slate should eventually have these lifecycle records:

- Pregame run: locked before matches start; uses only allowed pregame inputs.
- Live run: optional; records live prices and score state when used, never overwrites pregame.
- Postmatch run: imports results, SofaScore replay/stats, Kalshi candles, and grades.
- Backtest run: reruns model/evaluator on historical rows with explicit leakage mode.

The postmatch run is required before trusting model-training rows for that date. It should run `npm run data:health:tennis -- --date YYYY-MM-DD --settled` and store the result in the run artifacts.

## Model Page UI Implications

Do not touch MLB during this migration except where shared UI types require non-behavioral compatibility.

Tennis model page should eventually show:

- Active tennis stack: `W1 / F0 / T0 / E0`
- Latest run date.
- Run status.
- Source drift status.
- Input drift status.
- Golden snapshot status.
- Bucketed performance:
  - ML
  - spread
  - match O/U
  - first-set O/U
  - set-win
  - Kalshi trade-to-sell
- Artifacts:
  - run manifest
  - source lock
  - input lock
  - prediction snapshot
  - model description
  - model notes
  - calibration
  - backtest
  - grades

It should also split tennis model history from MLB history so tennis can show:

- Model designation (`T0`, `T1`, etc.).
- Feature version and warehouse version.
- Changelog by cartridge.
- Daily run history by slate date.
- Pregame versus settled status.
- Bucketed ROI/hit rate by ML, spread, match O/U, first-set O/U, set-win, and Kalshi trade-to-sell.
- Data coverage warnings that explain whether a run was publishable.

Public/static exports must not expose private raw data from `data-private/`; export only run metadata, summarized metrics, artifact labels, and public slate payloads.

## Implementation Checklist

### Phase 1: Registry And Manifests

- [x] Create `pipeline/tennis_model_registry.json`.
- [x] Create shared warehouse path resolver(s) for new Python/Node tennis cartridge code.
- [x] Create `pipeline/tennis_model_cartridges/F0/manifest.json`.
- [x] Create `pipeline/tennis_model_cartridges/E0/manifest.json`.
- [x] Create `pipeline/tennis_model_cartridges/T0/runner.mjs` as a thin stable entrypoint.
- [x] Create `pipeline/tennis_model_cartridges/T0/output-contract.json`.
- [x] Create `pipeline/tennis_model_cartridges/T0/model_description.json`.
- [x] Create `pipeline/tennis_model_cartridges/T0/MODEL_NOTES.md`.
- [x] Create `pipeline/tennis_model_cartridges/F0/feature-contract.json`.
- [x] Create `pipeline/tennis_model_cartridges/E0/metrics-contract.json`.
- [x] Update `pipeline/tennis_model_cartridges/T0/manifest.json` with `warehouseVersion`, `featureVersion`, and `evaluatorVersion`.
- [ ] Add the full T0 source-code inventory to manifests, not only the final generator.
- [ ] Add source hash expectations for any new framework files after they are stable.

### Phase 2: W1 Migration

- [x] Create `pipeline/tennis_warehouse_migrations/W1/001_add_model_run_tables.sql`.
- [x] Add a migration runner or extend `pipeline/tennis_warehouse.py`.
- [x] Ensure migration runner is append-only.
- [x] Add `tennis_schema_migrations` and mark W1 applied.
- [x] Confirm the migration targets `data-private/warehouse/sports.db`.
- [x] Do not move tennis data into `tennis.db` during W1.
- [x] Add run-scoped training-row snapshot storage so replaced legacy training rows do not erase provenance.
- [x] Add tests that W1 tables exist after migration.
- [x] Add tests that migration can run twice safely.

### Phase 3: Run Creation And Locking

- [x] Create `pipeline/create-tennis-model-run.mjs`.
- [x] Create `pipeline/lock-tennis-model-run.mjs`.
- [x] Add a shared hash/canonical JSON helper so source, input, and output hashes are stable.
- [x] Add locked-run guard so `create-tennis-model-run.mjs` cannot accidentally downgrade an already locked run.
- [ ] Add `--run-id` support to `pipeline/generate-tennis-day-module.mjs`.
- [ ] Emit `runId`, `warehouseVersion`, `featureVersion`, `modelId`, and `evaluatorVersion` in prediction output.
- [x] Write May 31 T0 run files under `data-private/model-runs/tennis/T0/2026-05-31/`.
- [x] Insert May 31 T0 run rows into the DB.
- [x] Write `health.json` from the pregame health gate.
- [x] Store parsed health/data-source check names in `health.json`.
- [ ] Write `publish.json` only if public export/deploy is performed.

Note: `--run-id` generator support was intentionally deferred after the T0 verifier caught it as source drift. Keep T0 frozen; add run IDs to generator output only through a verifier-compatible framework update or a future cartridge.

Note: the expanded source inventory is currently enforced in `files.lock.json` by `lock-tennis-model-run.mjs`. Expanding `T0/manifest.json` itself would alter the golden snapshot metadata, so keep that as a verifier-aware Phase 4 decision.

### Phase 4: Verifier Upgrade

- [x] Keep `pipeline/verify-tennis-model-snapshot.mjs` frozen as the T0 math/golden-snapshot guard.
- [x] Add `pipeline/verify-tennis-model-run.mjs` as the run-level verifier around the frozen snapshot.
- [x] Verify source locks.
- [x] Verify input locks.
- [x] Verify output snapshot and output hash.
- [x] Verify calibration artifact exists.
- [x] Verify DB run row exists.
- [x] Verify the run mode is compatible with the locked run manifest.
- [x] Verify all required value books exist: ML, spread, match O/U, set-win, and first-set O/U.
- [x] Verify no private raw data is referenced by public static exports, including model-history exports.
- [x] Keep current May 31 golden snapshot test passing after re-lock.

Note: the snapshot verifier intentionally does not read the run manifest yet. It remains a narrow proof that T0 output did not silently change. `verify-tennis-model-run.mjs` is the wider cartridge/run proof that source locks, input locks, output locks, DB rows, health gates, and value-book coverage agree.

### Phase 5: Export And UI

- [x] Update `api/src/scripts/export-published-data.ts` to export tennis model run metadata.
- [x] Update public data export so the site can read active tennis stack.
- [x] Update `web/src/views/ModelsView.tsx` to show tennis stack/run status.
- [x] Update model-history export (`published-data/model-history/index.json` and web public copy) to carry tennis cartridge IDs and run IDs.
- [x] Add a tennis-only model-history split/filter while keeping existing MLB rows unchanged.
- [x] Add UI styles only as needed.
- [x] Keep MLB behavior unchanged.

### Phase 6: Test And Build

- [x] Run `npm test`.
- [x] Run tennis T0 snapshot verification.
- [x] Run tennis T0 run verification.
- [x] Run `npm run data:health:tennis -- --date 2026-05-31 --pregame`.
- [ ] Run or simulate `npm run data:health:tennis -- --date 2026-05-31 --settled` when postmatch artifacts exist.
- [x] Run `tsc`.
- [x] Run `npm run build`.

### Phase 7: Postmatch And Backtest Records

- [x] Define how settled runs are created without mutating the pregame prediction snapshot.
- [x] Create `pipeline/tennis_warehouse_migrations/W1/002_add_model_run_grade_tables.sql`.
- [x] Create `pipeline/settle-tennis-model-run.mjs`.
- [x] Add `npm run data:settle:tennis-run`.
- [x] Store result grades by lane in `tennis_model_run_lane_grades`.
- [x] Store Kalshi trade-to-sell outcome rows separately from winner picks.
- [x] Store sportsbook ROI rows by ML, spread, match O/U, first-set O/U, and set-win.
- [x] Store bucketed calibration tables for settled rows.
- [x] Tie settlement rows back to `source_run_id` and the locked run/evaluator stack.
- [x] Do not rely on the legacy replaced `tennis_model_training_rows` table as the sole historical truth.
- [x] Generate `data-private/model-runs/tennis/T0/2026-05-31/postmatch-grades.json`.
- [x] Persist May 31 postmatch settlement as pending until results exist.
- [x] Add test coverage for W1 grade tables and the May 31 pending settlement artifact.
- [ ] Add ATP/WTA and round-specific calibration buckets after the first settled Phase 7 grading pass.
- [ ] Run `npm run data:settle:tennis-run -- --date YYYY-MM-DD --model T0 --require-settled` after results import for each completed slate.

### Phase 8: Deploy Safety

- [x] If deploying, run the existing two-day deploy rule from README: current date as `/data/current/`, next generated slate under `/data/slates/YYYY-MM-DD/`.
- [x] Store deployed URL, timestamp, and static artifact hash in `publish.json`.
- [x] Confirm Vercel deploy comes from `web/`, not repo root.
- [x] Confirm the site can load model history and the target slate after deploy.

Phase 8 deployment note:

- Deployed `2026-05-31` with `npm run publish:site -- --date 2026-05-31`.
- Production alias verified: `https://slate-web-static-1.vercel.app`.
- Deployment URL recorded in `data-private/model-runs/tennis/T0/2026-05-31/publish.json`.
- No `2026-06-01` slate exists yet, so the two-day public window correctly exported only `2026-05-31`.
- The deploy script now supports `--dry-run` for build/preflight without writing `publish.json` or pushing to Vercel.

### Phase 9: Cartridge Model Cards

- [x] Add T0 `model_description.json` with key improvements, key metrics, notes, and limitations.
- [x] Add T0 `MODEL_NOTES.md` for the human-readable cartridge model card.
- [x] Update T0 manifest with model-description and model-notes paths.
- [x] Export cartridge model-card metadata through public model history.
- [x] Show model notes on the Models page.
- [x] Add test coverage so future tennis cartridges cannot skip the required model-card files.
- [ ] Require new T1+ cartridges to update their model card before promotion.

## Estimated Files

Likely source/config files created:

- `pipeline/tennis_model_registry.json`
- `pipeline/warehouse_paths.py`
- `pipeline/lib/warehouse-paths.mjs`
- `pipeline/tennis_warehouse_migrations/W1/001_add_model_run_tables.sql`
- `pipeline/tennis_warehouse_migrations/W1/002_add_model_run_grade_tables.sql`
- `pipeline/create-tennis-model-run.mjs`
- `pipeline/lock-tennis-model-run.mjs`
- `pipeline/verify-tennis-model-run.mjs`
- `pipeline/settle-tennis-model-run.mjs`
- `pipeline/tennis_model_cartridges/T0/runner.mjs`
- `pipeline/tennis_model_cartridges/T0/output-contract.json`
- `pipeline/tennis_model_cartridges/T0/model_description.json`
- `pipeline/tennis_model_cartridges/T0/MODEL_NOTES.md`
- `pipeline/tennis_model_cartridges/F0/manifest.json`
- `pipeline/tennis_model_cartridges/F0/feature-contract.json`
- `pipeline/tennis_model_cartridges/E0/manifest.json`
- `pipeline/tennis_model_cartridges/E0/metrics-contract.json`

Likely existing files edited:

- `pipeline/generate-tennis-day-module.mjs`
- `pipeline/verify-tennis-model-snapshot.mjs`
- `pipeline/tennis_model_cartridges/T0/manifest.json`
- `pipeline/tennis_warehouse.py`
- `pipeline/tennis_pipeline_health.py`
- `pipeline/tennis_multimodel_backtest.py`
- `api/src/scripts/export-published-data.ts`
- `web/src/views/ModelsView.tsx`
- `tests/tennis_pipeline_test.py`
- `package.json`

Likely generated artifacts:

- `data-private/model-runs/tennis/T0/2026-05-31/run.json`
- `data-private/model-runs/tennis/T0/2026-05-31/files.lock.json`
- `data-private/model-runs/tennis/T0/2026-05-31/inputs.lock.json`
- `data-private/model-runs/tennis/T0/2026-05-31/predictions.snapshot.json`
- `data-private/model-runs/tennis/T0/2026-05-31/calibration.json`
- `data-private/model-runs/tennis/T0/2026-05-31/backtest.json`
- `data-private/model-runs/tennis/T0/2026-05-31/grades.json`
- `data-private/model-runs/tennis/T0/2026-05-31/postmatch-grades.json`
- `data-private/model-runs/tennis/T0/2026-05-31/health.json`
- `data-private/model-runs/tennis/T0/2026-05-31/publish.json`

Estimated next-pass source/config touch count: 16-22 files.

## Acceptance Criteria

- [x] T0 May 31 snapshot still verifies.
- [x] W1 migration is append-only and idempotent.
- [x] W1 migration applies to `data-private/warehouse/sports.db`.
- [x] New W1/cartridge code uses a warehouse path resolver instead of introducing new direct `sports.db` hard-codes.
- [x] May 31 T0 run has a run manifest.
- [x] May 31 T0 run has source/input/output locks.
- [x] May 31 T0 run stores health and data-source coverage.
- [x] May 31 T0 run has an append-only training-row snapshot or explicit training-row hash.
- [x] May 31 T0 run is represented in the DB.
- [x] T0 has a required machine-readable model card.
- [x] T0 has required human model notes.
- [x] Model page can show tennis active stack without affecting MLB.
- [x] Model history can show tennis model designation and daily run history.
- [x] Postmatch settlement rows can be stored without overwriting the pregame prediction snapshot.
- [x] Lane-grade tables exist for ML, spread, match O/U, first-set O/U, set-win, and Kalshi trade-to-sell.
- [x] Public/static export does not leak private raw data.
- [x] No tennis model math changes were made.
- [x] No DB data was deleted.

## Stop Conditions

Stop and reassess if:

- A required source file hash changes unexpectedly.
- T0 May 31 snapshot no longer matches.
- A migration requires dropping or renaming existing DB fields.
- A migration attempts to split or relocate the warehouse during W1.
- The Models page change starts affecting MLB rendering.
- A supposed framework change changes any prediction output.
- A public export tries to include private raw reference data.
- Pregame mode attempts to use replay/results/candle data captured after match start.

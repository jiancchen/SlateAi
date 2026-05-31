# Target File Structure: Option A

Date: 2026-05-31

Option A means model code lives inside model cartridges.

This document is the proposed end-state tree before any behavior-changing migration starts.

## Top Level

```text
.
  README.md
  SETUP.md
  package.json
  .gitignore
  .rgignore

  api/
  web/
  models/
  pipeline/
  data-private/
  published-data/
  development-docs/
  scripts/
  tests/
  cartridge_migration/
```

Keep `cartridge_migration/` top-level. It is the planning/audit area for cross-cutting moves.

## Canonical Subfolder Target

This is the high-level target tree to use when deciding where a new file belongs.

```text
models/
  registry.json
  shared/
    python/
    js/
  tennis/
    registry.json
    cartridges/
      T0/
        manifest.json
        model_description.json
        MODEL_NOTES.md
        output-contract.json
        contracts/
        runner.mjs
        features/
        lanes/
        fixtures/
        tests/
  mlb/
    registry.json
    cartridges/
      M0/
        manifest.json
        model_description.json
        MODEL_NOTES.md
        output-contract.json
        contracts/
        runner.mjs
        features/
        lanes/
        fixtures/
        tests/
      RP36/
        manifest.json
        model_description.json
        MODEL_NOTES.md
        output-contract.json
        contracts/
        runner.py
        fixtures/
        tests/

pipeline/
  shared/
    db/
    fetchers/
    publish/
    utils/
  tennis/
    workflows/
    warehouse/
    fetchers/
    publish/
    health/
  mlb/
    workflows/
    warehouse/
    fetchers/
    publish/
    watch/
    health/

development-docs/
  mlb/
    M0/
      runbooks/
      model-research/
      postmortems/
      changelog/
    RP36/
      runbooks/
      model-research/
      relief-pitching/
      postmortems/
      changelog/
  tennis/
    T0/
      runbooks/
      model-research/
      postmortems/
      changelog/
  shared/
  archive/
    legacy-followups/
    legacy-research/

data-private/
  warehouse/
    sports.db
    snapshots/
    hf-sync/
    hf-restore/
  raw/
    mlb/
    tennis/
    kalshi/
    odds/
    baseball-reference/
    baseballsavant/
    statcast/
  model-runs/
    mlb/
      M0/
      RP36/
    tennis/
      T0/
  model-cartridges/
    mlb/
      M0/
      RP36/
    tennis/
      T0/
  predictions/
    legacy/
      mlb/
      tennis/
  reports/
    mlb/
    tennis/
  history/
    mlb/
    tennis/
  reference/
    mlb/
    tennis/

published-data/
  meta.json
  history/
  model-history/
    index.json
    mlb/
      current.json
      M0/
      RP36/
    tennis/
      current.json
      T0/
  slates/
  stories/

web/
  src/
    App.tsx
    main.tsx
    app.css
    assets/
    features/
      mlb/
      tennis/
      models/
      board/
      history/
    views/
    lib/
      api-client.ts
      archive-loaders.ts
      sports-model.js
      model-history-loader.ts
  public/
    data/
      current/
      model-history/
      slates/
      stories/

api/
  src/
    server.ts
    lib/
      day-loader.ts
      model-history-loader.ts
      search.ts
    routes/
      slates.ts
      model-history.ts
      search.ts
    scripts/
      export-published-data.ts

scripts/
  deploy-public-site.mjs
  ensure-generated-web-artifacts.mjs
  export-public-current.mjs
  restore-hf-warehouse.mjs
  run-dev-stack.mjs
  sync-hf-warehouse.mjs

tests/
  model_cartridge_structure_test.py
  tennis_pipeline_test.py
  mlb_pipeline_test.py
  mlb_rp36_snapshot_test.py

cartridge_migration/
  model_folder_architecture_decision.md
  target_file_structure_option_a.md
  migration_run_plan_tennis_1.md
  mlb_reliever_model_audit.md
  migration_run_plan_mlb_1.md
```

The key ownership rule: model output and docs are keyed by sport/model first, then date. Dates live under model runs. Loose date-first prediction files are legacy only.

## Models

`models/` is the source of truth for model cartridges.

```text
models/
  registry.json

  shared/
    README.md
    python/
      __init__.py
      features.py
      metrics.py
      calibration.py
    js/
      manifest-utils.mjs
      run-utils.mjs

  tennis/
    registry.json
    cartridges/
      T0/
        manifest.json
        model_description.json
        MODEL_NOTES.md
        output-contract.json
        contracts/
          sports-board-v1.json
          models-dashboard-v1.json
        runner.mjs
        features/
          build_features.py
        lanes/
          moneyline.py
          spread.py
          match_total.py
          first_set_total.py
          set_win.py
          kalshi_trade.py
        tests/
          test_t0_snapshot.py
        fixtures/
          2026-05-31-input.json
          2026-05-31-output.json

      E0/
        manifest.json
        metrics-contract.json
        runner.mjs

      F0/
        manifest.json
        feature-contract.json
        runner.mjs

  mlb/
    registry.json
    cartridges/
      M0/
        manifest.json
        model_description.json
        MODEL_NOTES.md
        output-contract.json
        contracts/
          sports-board-v1.json
          models-dashboard-v1.json
        runner.mjs
        features/
          side_features.py
          market_features.py
          starter_features.py
        lanes/
          moneyline.py
          first5.py
          totals.py
          first_inning.py
          player_props.py
          home_runs.py
        components/
          README.md
        tests/
          test_m0_snapshot.py
        fixtures/
          2026-05-30-input.json
          2026-05-30-output.json

      RP36/
        manifest.json
        model_description.json
        MODEL_NOTES.md
        output-contract.json
        contracts/
          mlb-relief-addendum-v1.json
          models-dashboard-v1.json
        runner.py
        starter_exit.py
        bullpen_shape.py
        first_up_reliever.py
        reliever_quality.py
        lineup_matchup.py
        adaptive_reset.py
        tests/
          test_rp36_snapshot.py
        fixtures/
          2026-05-30-input.json
          2026-05-30-output.json

      E0/
        manifest.json
        metrics-contract.json
        runner.mjs
```

### Model Ownership Rule

- If a script defines scoring, features, gates, calibration, model lanes, or addendum behavior, it lives in `models/`.
- If a script fetches, warehouses, publishes, verifies generic coverage, or runs a daily workflow, it lives in `pipeline/`.

## Pipeline

`pipeline/` becomes workflow/data plumbing.

```text
pipeline/
  shared/
    db/
    publish/
    fetchers/
    utils/

  tennis/
    workflows/
      create_run.mjs
      settle_run.mjs
      verify_run.mjs
      daily_slate.mjs
    warehouse/
      tennis_warehouse.py
      migrations/
        W1/
          001_add_model_run_tables.sql
          002_add_model_run_grade_tables.sql
    fetchers/
      espn_scoreboard.mjs
      fanduel_cdp.mjs
      flashscore_recent_stats.mjs
      flashscore_slate.mjs
      sofascore_match.mjs
      sofascore_slate.mjs
      rankings_espn.mjs
      weather.py
    publish/
      export_warehouse_context.py
      export_sofascore_replays.py
      generate_day_module.mjs
      generate_clay_context.mjs
    health/
      pipeline_health.py

  mlb/
    workflows/
      pregame.mjs
      followup.mjs
      refresh_live_board.mjs
      close_day.mjs
    warehouse/
      mlb_warehouse.py
    fetchers/
      fanduel_research.py
      historical_odds.py
      kalshi_markets.py
    publish/
      generate_day_files.mjs
      export_history_journal.mjs
      export_side_predictions.mjs
      export_prop_predictions.mjs
      export_home_run_predictions.mjs
      export_lineup_model.mjs
      export_batting_impact.mjs
      export_veto_artifact.mjs
    watch/
      kalshi_mlb_live.py
      probable_changes.py
    health/
      verify_refresh.mjs
```

### Compatibility Wrappers

During migration, keep the current top-level script entrypoints as thin wrappers.

Examples:

```text
pipeline/run-mlb-pregame.mjs -> pipeline/mlb/workflows/pregame.mjs
pipeline/close-mlb-day.mjs -> pipeline/mlb/workflows/followup.mjs
pipeline/export_mlb_reliever_shadow_board.py -> models/mlb/cartridges/RP36/runner.py
pipeline/create-tennis-model-run.mjs -> pipeline/tennis/workflows/create_run.mjs
```

Wrappers are temporary, but package scripts can continue calling them until the migration is complete.

## Data Artifacts

```text
data-private/
  README.md
  warehouse/
    sports.db
    snapshots/
    hf-sync/
    hf-restore/

  raw/
    mlb/
    kalshi/
    odds/
    baseball-reference/
    baseballsavant/
    statcast/
    tennis/

  model-runs/
    tennis/
      T0/
        2026-05-31/
          run.json
          predictions/
            board.json
            lanes.json
            value-books.json
          grades.json
          postmortem.md
    mlb/
      M0/
        2026-05-30/
          run.json
          predictions/
            board.json
            lanes.json
            value-books.json
            components/
              RP36.json
          grades.json
          postmortem.md
      RP36/
        2026-05-30/
          run.json
          predictions/
            reliever-shadow.json
          grades.json
          postmortem.md

  model-cartridges/
    tennis/
      T0/
        golden/
        calibration/
    mlb/
      M0/
        golden/
        calibration/
      RP36/
        golden/
        calibration/

  predictions/
    legacy/
      tennis/
      mlb/
        sides/
        reliever-shadow/
        player-props/
        home-runs/
        market-fitness/

  reports/
    tennis/
    mlb/

  history/
    mlb/
    tennis/

  reference/
    tennis/
    mlb/
```

The future default should not be loose files under `data-private/predictions/`.

Predictions are owned by model runs:

```text
data-private/model-runs/{sport}/{modelId}/{date}/predictions/
```

The current `data-private/predictions/` folder becomes a legacy/staging area until all exporters are moved behind model-run outputs.

If a prediction artifact is intended for UI consumption, it must include:

```json
{
  "schemaVersion": "model-output-v1",
  "uiContractVersion": "sports-board-v1",
  "sport": "mlb",
  "modelId": "M0",
  "runId": "mlb-2026-05-31-M0"
}
```

## API / UI Pointers

The API should not scan random prediction folders to guess the latest model.

Use explicit active-model pointers:

```text
published-data/model-history/
  index.json
  tennis/
    current.json
    T0/
      latest.json
      2026-05-31/
        summary.json
        predictions.json
        grades.json
  mlb/
    current.json
    M0/
      latest.json
      2026-05-30/
        summary.json
        predictions.json
        grades.json
    RP36/
      latest.json
      2026-05-30/
        summary.json
        predictions.json
        grades.json
```

Example `current.json`:

```json
{
  "sport": "mlb",
  "activeModelId": "M0",
  "activeRunId": "mlb-2026-05-31-M0",
  "predictionDate": "2026-05-31",
  "path": "./M0/2026-05-31/summary.json",
  "supportedUiContracts": ["sports-board-v1", "models-dashboard-v1"]
}
```

## Published Data

`published-data/` stays top-level because it is the deployable public artifact root.

```text
published-data/
  README.md
  meta.json
  history/
  model-history/
  slates/
  stories/
```

## Web

Generated runtime payloads should move out of `web/src/lib`.

```text
web/
  src/
    App.tsx
    main.tsx
    app.css
    assets/
    features/
      mlb/
      tennis/
    views/
    lib/
      api-client.ts
      archive-loaders.ts
      sports-model.js
      history-types.ts
      small source helpers only

  public/
    data/
      current/
      model-history/
      slates/
      stories/
    icons.svg
    favicon.svg
```

Large generated files such as these should not remain in `web/src/lib` long-term:

```text
story-archive.generated.ts
day-YYYY-MM-DD-tennis-warehouse-context.generated.json
day-YYYY-MM-DD-lineups.js
day-YYYY-MM-DD-data.js
day-YYYY-MM-DD-home-run-data.js
```

They should move to `web/public/data/` or be loaded from `published-data/`.

## API

`api/` stays as the backend app, but should avoid owning model definitions.

```text
api/
  src/
    server.ts
    lib/
    scripts/
      export-published-data.ts
  package.json
  tsconfig.json
```

The API can read `published-data/`, `models/registry.json`, and `data-private/model-runs/`, but it should not be the source of truth for model logic.

## Development Docs

```text
development-docs/
  mlb/
    M0/
      runbooks/
      model-research/
      postmortems/
      changelog/
    RP36/
      runbooks/
      model-research/
      relief-pitching/
      postmortems/
      changelog/
  tennis/
    T0/
      runbooks/
      model-research/
      postmortems/
      changelog/
  shared/
  archive/
    legacy-followups/
    legacy-research/
```

Follow-up files should not remain a primary doc type. Existing follow-ups should be converted into model/date postmortems when useful, or moved into `development-docs/archive/legacy-followups/`.

The existing top-level `research/` folder should be moved into docs/archive or split by sport/model.

## Scripts

Keep only repo-wide utilities here.

```text
scripts/
  deploy-public-site.mjs
  ensure-generated-web-artifacts.mjs
  export-public-current.mjs
  restore-hf-warehouse.mjs
  run-dev-stack.mjs
  sync-hf-warehouse.mjs
```

Sport-specific scripts move to `pipeline/<sport>/...` or `models/<sport>/cartridges/...`.

## Tests

```text
tests/
  model_cartridge_structure_test.py
  tennis_pipeline_test.py
  mlb_pipeline_test.py
  mlb_rp36_snapshot_test.py
```

Cartridge-local tests can live inside cartridges, while cross-project tests remain here.

## Search Ignore

Add `.rgignore` so normal searches avoid generated/runtime files.

```text
data-private/raw/
data-private/warehouse/
published-data/
web/public/data/
web/src/lib/day-*
web/src/lib/*.generated.*
web/src/lib/story-archive.generated.ts
api/node_modules/
web/node_modules/
```

## Migration Order

1. Add `.rgignore`.
2. Create empty `models/` tree with registries.
3. Copy existing tennis T0 cartridge from `pipeline/tennis_model_cartridges/T0` to `models/tennis/cartridges/T0`.
4. Add compatibility readers so both old and new tennis locations resolve.
5. Create MLB `M0` and `RP36` cartridge shells.
6. Copy RP36 behavior into the cartridge and keep old exporter as wrapper.
7. Golden-test RP36 against the existing 2026-05-30 reliever-shadow output.
8. Move MLB daily workflow wrappers into `pipeline/mlb/workflows`.
9. Move docs into sport folders.
10. Move generated web payloads out of `web/src/lib` behind public-data loaders.

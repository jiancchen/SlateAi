# Model Folder Architecture Decision

Date: 2026-05-31

## Decision

Use a top-level `models/` root as the source of truth for model cartridges.

`pipeline/` remains execution and data plumbing. Model-specific code belongs inside the cartridge that owns it.

This prevents the current flat `pipeline/` script pile from growing forever as tennis and MLB add more model versions.

## Target Shape

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
        runner.mjs
        features/
        lanes/
        tests/
        fixtures/

  mlb/
    registry.json
    cartridges/
      M0/
        manifest.json
        model_description.json
        MODEL_NOTES.md
        output-contract.json
        runner.mjs
        features/
        lanes/
        tests/
        fixtures/

      RP36/
        manifest.json
        model_description.json
        MODEL_NOTES.md
        output-contract.json
        runner.py
        starter_exit.py
        bullpen_shape.py
        first_up_reliever.py
        reliever_quality.py
        lineup_matchup.py
        adaptive_reset.py
        tests/
        fixtures/
```

## Cartridge Rules

1. Every model or addendum has a cartridge directory.
2. Every cartridge has:
   - `manifest.json`
   - `model_description.json`
   - `MODEL_NOTES.md`
   - `output-contract.json`
   - versioned UI/data contracts when the output is consumed by the site
   - a runner
3. Model-owned scripts live inside the cartridge.
4. Shared reusable model primitives live under `models/shared/`.
5. Workflow, fetch, publish, and warehouse plumbing live under `pipeline/`.
6. Daily run artifacts live under `data-private/model-runs/`.
7. Published model UI data lives under `published-data/model-history/`.
8. Predictions are model outputs, not loose global files.
9. Each model output declares the UI/data contract version it supports.

## MLB Composite Model Rule

MLB is not one clean monolith.

Use this stack:

```text
M0 = parent MLB side / market model
RP36 = relief pitcher addendum, legacy alias E36 shadow
SP0 = optional starter-exit component if/when split out
E0 = evaluator / settlement layer
```

`M0` owns final picks. `RP36` produces relief context, warnings, first-up reliever clusters, and bullpen-path adjustments consumed by `M0`.

`RP36` is not a competing parent model.

Example `M0` manifest concept:

```json
{
  "modelId": "M0",
  "sport": "mlb",
  "role": "parent_model",
  "components": ["RP36"],
  "lanes": ["moneyline", "first5", "totals", "first_inning", "props"],
  "runner": "./runner.mjs"
}
```

Example `RP36` manifest concept:

```json
{
  "modelId": "RP36",
  "sport": "mlb",
  "role": "relief_addendum",
  "legacyAlias": ["E36 shadow"],
  "consumedBy": ["M0"],
  "runner": "./runner.py",
  "scripts": [
    "./starter_exit.py",
    "./bullpen_shape.py",
    "./first_up_reliever.py",
    "./reliever_quality.py",
    "./lineup_matchup.py",
    "./adaptive_reset.py"
  ]
}
```

## Pipeline Target Shape

```text
pipeline/
  shared/
    db/
    publish/
    utils/

  tennis/
    workflows/
    warehouse/
    fetchers/
    publish/

  mlb/
    workflows/
    warehouse/
    fetchers/
    publish/
```

Pipeline wrappers may call cartridge runners, but model behavior should not be scattered through `pipeline/`.

## Docs Target Shape

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

Follow-up files should stop being a primary doc type. Existing follow-ups should be either:

- converted into model/date postmortems
- or archived under `development-docs/archive/legacy-followups/`

The existing top-level `research/` folder should be folded into `development-docs/archive/legacy-research/` or split into sport/model-specific docs.

## Prediction Ownership Rule

Predictions must be tied to the model that produced them.

Avoid future loose prediction folders where the API/UI has to guess which model owns which file.

Private model outputs should live under:

```text
data-private/model-runs/{sport}/{modelId}/{date}/
  run.json
  predictions/
    board.json
    lanes.json
    value-books.json
    components/
      RP36.json
  grades.json
  postmortem.md
```

Public model outputs should live under:

```text
published-data/model-history/{sport}/{modelId}/{date}/
  summary.json
  predictions.json
  grades.json
```

Current UI aliases should be explicit pointers, not inferred by scanning date folders:

```text
published-data/model-history/{sport}/current.json
published-data/model-history/{sport}/{modelId}/latest.json
```

Example pointer:

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

## UI Contract Rule

We are not ready for a GraphQL-like schema layer.

Use versioned JSON contracts instead.

Every published prediction artifact should declare:

```json
{
  "schemaVersion": "model-output-v1",
  "uiContractVersion": "sports-board-v1",
  "sport": "mlb",
  "modelId": "M0",
  "runId": "mlb-2026-05-31-M0"
}
```

When the UI changes, add a new contract version and keep a compatibility loader until old runs are no longer needed.

## Generated Data Rule

Generated runtime payloads should not live beside source code.

Move generated data away from `web/src/lib` over time.

Target:

```text
published-data/
web/public/data/
```

Keep `web/src/lib` for loaders, source utilities, and small static helpers only.

## Migration Rule

This must be behavior-preserving.

For each migration step:

1. Freeze a golden output.
2. Move or copy the code behind a compatibility wrapper.
3. Run the old command and the new command.
4. Diff the outputs.
5. Only then retire the old path.

Do not improve model logic during structure migration.

## Compatibility Rule

Existing commands should keep working during migration:

```bash
npm run data:run:mlb-pregame
npm run data:run:mlb-followup
npm run data:export:mlb-reliever-shadow
npm run data:create:tennis-run
npm run data:verify:tennis-run
```

They can become wrappers that call the new locations.

## Why This Decision

This avoids three long-term failures:

1. top-level `pipeline/` keeps growing with every experiment
2. old scripts and active model code become indistinguishable
3. manifests become decorative maps to scattered code instead of true cartridge definitions

The model cartridge should be the unit of ownership, testing, documentation, and reproducibility.

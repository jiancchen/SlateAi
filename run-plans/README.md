# Run Plans

Run plans are the plug-and-play execution layer for daily predictions.

Models are treated like branches. A run plan chooses the sport, date, parent model, component models, warehouse version, feature version, evaluator version, and the steps to execute.

Snapshots are historical output records. They should not lock source files, inputs, outputs, or model registries.

## Commands

Dry-run the active MLB plan:

```bash
npm run run-plan -- --sport mlb --dry-run
```

Run one step from a dated plan:

```bash
npm run run-plan -- --sport tennis --date 2026-05-31 --step check-run
```

Run an explicit plan file:

```bash
npm run run-plan -- --plan run-plans/mlb/2026-05-31.json
```

## Conventions

- `active.json` points each sport to the current daily plan.
- Sport/date plan files live under `run-plans/<sport>/<YYYY-MM-DD>.json`.
- Model promotion is not automatic. Update the sport registry active pointer only after review.
- Old lock artifacts are historical only and should not be regenerated.

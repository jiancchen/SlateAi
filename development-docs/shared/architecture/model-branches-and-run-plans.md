# Model Branches And Run Plans

## Decision

Model iteration should not use blocking file locks.

Models behave like branches. A daily prediction run chooses a branch, or a small composition of branches, through a configurable run plan. The run plan is the source of truth for what gets executed that day.

Run snapshots exist for history and comparison. They are not gates that can make an unrelated model dirty.

## Mental Model

- `main` is the active production model for a sport.
- `MLB-M0`, `MLB-M1`, `TEN-T0`, and future cartridges are model branches.
- Component models such as `MLB-RP36` are branch dependencies, like a submodule or package dependency.
- A daily run plan is the checked-out composition for a date.
- A run snapshot is a commit-like artifact showing what the selected composition produced.
- Activation is a deliberate pointer update, not a side effect of creating or snapshotting a branch.

## What A Run Plan Owns

A daily run plan should declare:

- Date and sport.
- Parent model branch.
- Component branches.
- Warehouse version.
- Feature version.
- Evaluator version.
- Required fetch/warehouse steps.
- Required publish/value-board steps.
- Optional manual review steps.
- Output destinations for public site and private warehouse artifacts.

Example shape:

```json
{
  "sport": "mlb",
  "date": "2026-06-01",
  "status": "draft",
  "models": {
    "parent": "MLB-M0",
    "reliefAddendum": "MLB-RP36",
    "warehouse": "MLB-W1",
    "features": "MLB-F0",
    "evaluator": "MLB-E0"
  },
  "steps": [
    "fetch",
    "warehouse",
    "derive",
    "run-parent",
    "run-components",
    "publish",
    "snapshot",
    "compare"
  ],
  "outputs": {
    "privateWarehouse": true,
    "publishedData": true,
    "modelHistory": true
  }
}
```

## What A Model Branch Owns

A model branch owns:

- Its runner.
- Its feature and scoring logic.
- Its component contract.
- Its model notes and change log.
- Its output contract.
- Its benchmarks and post-run performance history.

A model branch should not own the daily operational decision of which model runs today. That belongs to the run plan.

## What Snapshots Own

Snapshots should preserve:

- Run id.
- Date.
- Selected model composition.
- Prediction output summary.
- Artifact counts.
- Settlement/performance linkages.
- Optional commit metadata.

Snapshots should not preserve:

- Per-file source hashes.
- Per-file input hashes.
- Per-file output hashes.
- Registry/catalog hashes that make other branches drift.

## Activation Rule

Activation should be explicit:

1. Create or update a model branch.
2. Run it through one or more dated run plans.
3. Compare its lane performance against the active branch.
4. Update the sport registry active pointer only when the user decides to promote it.

No snapshot command should activate a model.

## UI Direction

The web UI should eventually expose:

- Active production model by sport.
- Draft model branches.
- Daily run plans.
- A selector for model composition before a prediction run.
- Compare view for branch vs branch by date and lane.
- Promotion action that updates the active pointer.

## Migration Notes

- MLB currently has snapshot/check commands after removing blocking locks.
- Tennis still has older lock terminology and should be migrated to this branch/run-plan model later.
- Existing historical snapshots can remain as history even if they were originally produced by lock-named commands.

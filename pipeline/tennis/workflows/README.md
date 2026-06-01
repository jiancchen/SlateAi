# Tennis Workflows

Daily tennis slate orchestration, postmatch settlement, model-run creation, snapshot, and check workflows live here after migration.

## Files

- `create-model-run.mjs`: Creates tennis model-run records and artifacts.
- `snapshot-model-run.mjs`: Snapshots model output, run metadata, source/input coverage counts, and training rows without source/input/output locks.
- `check-model-run.mjs`: Checks a run manifest, outputs, health, and settlement coverage.
- `verify-model-snapshot.mjs`: TEN-T0 golden-snapshot guard.
- `settle-model-run.mjs`: Postmatch settlement and lane grading.
- `health.py`: Warehouse/source coverage checks.

Legacy lock terminology should not be used for new runs. Historical lock artifacts may remain only as archived context.

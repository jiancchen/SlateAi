# Tennis Workflows

Daily tennis slate orchestration, postmatch settlement, model-run creation, locking, and verification workflows live here after migration.

## Files

- `create-model-run.mjs`: Creates tennis model-run records and artifacts.
- `lock-model-run.mjs`: Locks source/input/output hashes for a run.
- `verify-model-run.mjs`: Verifies a run manifest, outputs, health, and settlement coverage.
- `verify-model-snapshot.mjs`: T0 golden-snapshot guard.
- `settle-model-run.mjs`: Postmatch settlement and lane grading.
- `health.py`: Warehouse/source coverage checks.

Legacy wrappers remain at the old top-level `pipeline/*tennis*` workflow paths while references migrate.

# Pipeline

Pipeline code is workflow and data plumbing.

Model-owned code should live under `models/{sport}/cartridges/{modelId}/`.

## Target Layout

- `mlb/`: MLB workflows, fetchers, warehouse adapters, publishers, and research scripts while they are being migrated.
- `tennis/`: Tennis workflows, fetchers, warehouse adapters, publishers, and research scripts while they are being migrated.
- `lib/`: Shared pipeline helpers that are not model-specific.
- `tennis/warehouse/migrations/`: Tennis SQLite migrations.

Old top-level scripts may remain as compatibility wrappers while callers are migrated.

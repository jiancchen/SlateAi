# Tennis Warehouse

Tennis warehouse commands, migrations, imports, and health helpers live here after migration.

## Files

- `tennis_warehouse.py`: SQLite warehouse CLI for rankings, slates, results, model rows, grading, and summaries.
- `backfill_recent_form_metrics.py`: Recent-form metric backfill from warehouse/source artifacts.

Legacy wrappers remain at `pipeline/tennis_warehouse.py` and `pipeline/backfill_tennis_recent_form_metrics.py` while references migrate.

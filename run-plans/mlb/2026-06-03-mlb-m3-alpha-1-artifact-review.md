# MLB-M3 Alpha-1 Artifact Review

Date: 2026-06-03

Phase ID: `mlb-m3-alpha-1`

Reviewed artifact:

```text
data-private/models/mlb-m3/features/m3_fs_001_game_shape_starter_v1/
  m3_fs_001_game_shape_starter_v1_20260603T091939Z/
```

Report mirror:

```text
data-migration/reports/m3_fs_001_game_shape_starter_v1_2026-03-26_to_2026-05-31.json
```

## Review Decision

Accepted as the first materialized MLB-M3 alpha-1 feature artifact.

This means the matrix is good enough to unblock alpha-2 infrastructure planning for training/backtest orchestration. It does not mean the feature set is strong enough to claim edge, train production models, or price player props.

## Build Summary

| Item | Result |
| --- | --- |
| Date range | 2026-03-26 through 2026-05-31 |
| Matrix rows | 886 completed games |
| Matrix columns | 77 |
| Feature columns | 62 |
| Target columns | 9 |
| Matrix writer | DuckDB Parquet |
| Contract validation | pass |
| Leakage check | pass |
| Data dictionary coverage | zero undocumented columns |
| Typed DB only | yes |
| M2 weights | no |
| Legacy `sports.db` reads | no |

## Validation Commands

```bash
python3 -m pipeline.mlb.features.validators.validate_game_shape_starter_v1 --json
```

```bash
python3 -m py_compile \
  pipeline/mlb/features/builders/build_game_shape_starter_v1.py \
  pipeline/mlb/features/validators/validate_game_shape_starter_v1.py
```

```bash
python3 -m json.tool \
  data-migration/reports/m3_fs_001_game_shape_starter_v1_2026-03-26_to_2026-05-31.json
```

```bash
/Users/jcchen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 - <<'PY'
import duckdb, json
from pathlib import Path
report = json.loads(Path("data-migration/reports/m3_fs_001_game_shape_starter_v1_2026-03-26_to_2026-05-31.json").read_text())
path = report["matrix_uri"]
con = duckdb.connect()
print(con.execute("select count(*) from read_parquet(?)", [path]).fetchall())
print(con.execute("select count(*) from (describe select * from read_parquet(?))", [path]).fetchall())
con.close()
PY
```

## Coverage Findings

| Area | Finding | Interpretation |
| --- | --- | --- |
| Starter identity | home and away starter known rate is 100% | Starter identity coverage is strong for this range. |
| Starter low evidence | home 37.4%, away 38.5% | Opening month and thin starter histories need explicit uncertainty. |
| Low evidence by month | March 100%, April 49.5%, May 14.8% home / 17.2% away | The first month is not comparable to May unless model sees evidence flags. |
| Relief-chain known | home and away 98.3% | Relief-chain candidate coverage is strong. |
| Reliever command profile coverage | home 21.5%, away 22.4% | Individual-arm command/performance surface is still thin. |
| Candidate pool size | 1.97 average per side | Router is present but narrow; future router quality audit required. |
| Top-two first-up mass | 1.0 average | Mostly because candidate pools average about two arms; do not overinterpret as certainty. |
| Lineups | home 89.1%, away 88.6% known | Usable coverage, but missing lineups need flags. |
| Matchup rows | about 10 hitters per side | Hitter-vs-starter phase coverage is high; reliever-chain hitter matchup is not materialized yet. |
| Market snapshots | 94.2% have at least one pregame snapshot | Alpha-1 uses counts only, not market pricing semantics. |

## Missingness Findings

Highest missingness:

- `game_series_game_number`: 98.3% missing
- starter prior average fields: about 14.7% home and 15.1% away missing
- reliever candidate/command fields: 1.7% missing
- prior team baseline fields: 1.7% missing

Interpretation:

- `game_series_game_number` is not reliable enough as a feature yet.
- Starter prior averages are missing for legitimate low-evidence arms and early-season games.
- Relief-chain coverage is mostly available, but individual command coverage is low.

## What The Matrix Actually Contains

Alpha-1 contains:

- game-grain rows and metadata
- postgame run/F5/shape targets
- season-to-date prior team facts
- prior starter path facts and low-evidence flags
- bullpen shape availability
- relief-chain candidate coverage
- first-up router coverage surfaces
- reliever command profile coverage
- lineup known/slot/complete scaffolding
- market snapshot-count scaffolding
- source-table coverage, leakage, missingness, lineage, and dictionary artifacts

Alpha-1 does not contain:

- trained model outputs
- backtest results
- edge claims
- simulator event logs
- player-prop pricing
- reliever-chain hitter event surfaces
- AB/PA simulation
- selection policy

## Caveats Before Training

1. The team state block is still a baseline scaffold. It uses season-to-date prior facts, not the richer state-memory encoders we ultimately want.
2. The starter path block is honest about evidence, but it is not yet a true starter exit distribution model.
3. The reliever chain is represented as coverage and router surfaces, not a trained chain/performance model.
4. Reliever command profile coverage is too low to treat individual-arm performance as stable.
5. Hitter matchup coverage is starter-phase heavy. The single opponent pitching path is preserved in contract language, but reliever-chain hitter event surfaces are not materialized.
6. Market context is snapshot-count only. It does not yet encode market line choice, fair price, or closing movement.
7. The artifact `git_sha` records the pre-commit HEAD because the report was generated before committing the artifact. This is acceptable for this checkpoint, but the future run orchestrator should record working tree dirty state or post-commit artifact IDs.

## Acceptance Gate

| Gate | Status |
| --- | --- |
| Reads typed DB only | pass |
| Writes real matrix artifact | pass |
| Writes JSON reports | pass |
| Every matrix column has dictionary entry | pass |
| Row count explainable | pass |
| Target distributions explainable | pass |
| Leakage report passes | pass |
| Missingness explicit | pass |
| Source coverage explicit | pass |
| Starter coverage explicit | pass |
| Reliever availability/router/chain/arm coverage explicit | pass |
| One opponent pitching path preserved | pass |
| No M2 weights or hand-built conclusion score | pass |

## Follow-Ups

Move to alpha-2 infrastructure planning with these requirements:

- add a run manifest and run dashboard storage shape before long training runs
- define train/backtest artifact contracts before training any component
- add dirty-worktree or artifact-content hash lineage
- build time-split backtest scaffolding before model selection
- add component registry shape for game shape, starter exit, reliever chain, and team run distributions
- decide whether `game_series_game_number` should be removed, backfilled, or left as sparse metadata
- improve reliever command/performance coverage before trusting reliever-chain damage outputs
- keep player props deferred until PA-volume, event, starter-exit, and reliever-chain distributions are coherent


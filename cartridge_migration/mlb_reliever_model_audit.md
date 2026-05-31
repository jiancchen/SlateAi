# MLB Reliever Model Audit

Date: 2026-05-31

## Read

The current MLB relief pitcher work is not one clean model yet. It is a chained research stack that ends in a shadow-board exporter.

`E36 shadow` is the latest artifact label, not the whole model. The active exporter is:

```bash
python3 models/mlb/cartridges/RP36/runner.py --date YYYY-MM-DD
```

The old `pipeline/export_mlb_reliever_shadow_board.py` path remains as a compatibility wrapper.

That script imports several prior model/research layers and combines them into a team-side first-up reliever cluster.

## Current Stack

| Layer | Current name | Role |
| --- | --- | --- |
| Starter exit | `E27` | Predicts starter-out thresholds and hook risk. |
| Bullpen shape | `E28` | Predicts bullpen game shape using team history plus starter-exit outputs. |
| First-up reliever | `E29` | Rebuilds exact first-up reliever ranking with bullpen shape and starter exit. |
| Arsenal overlay | `E30` | Tested pitch-mix concentration; not promoted as a scoring lift. |
| Quality / role drift | `E31` | Adds reliever quality, role drift, new-sample flags. |
| Lineup matchup | `E32` | Adds lineup handedness / pressure / xwOBA interaction. |
| Damage-fit overlay | `E33` | Corrected conversion context and damage-fit features; best exact-call pass. |
| Shadow artifact | `E34` | Writes a date-driven reliever cluster card for UI inspection. |
| Heavy-use reset | `E35` | Removes or downgrades arms after heavy recent pitch loads. |
| Adaptive reset | `E36` | Replaces fixed pitch cutoff with team/pitcher quick-reuse reset score. |

## Inputs

Core warehouse tables used by the relief stack:

- `mlb_bullpen_usage`
- `mlb_likely_relief_chains`
- `mlb_team_bullpen_shape_daily`
- `mlb_pitcher_appearances`
- `mlb_pitch_events`
- `mlb_plate_appearances`
- `mlb_games`
- `mlb_starting_pitcher_game_logs`

Observed warehouse coverage on 2026-05-31:

- `mlb_bullpen_usage`: 16,064 rows, 2026-03-27 through 2026-05-30
- `mlb_likely_relief_chains`: 3,412 rows, 2026-03-27 through 2026-05-30
- `mlb_team_bullpen_shape_daily`: 1,706 rows, 2026-03-27 through 2026-05-30
- `mlb_pitcher_appearances`: 7,336 rows, 2026-03-26 through 2026-05-30
- `mlb_pitch_events`: 297,378 rows, 2026-03-26 through 2026-05-30
- `mlb_plate_appearances`: 65,733 rows, 2026-03-26 through 2026-05-30

## Output

The shadow exporter writes:

```text
data-private/predictions/mlb-reliever-shadow/YYYY-MM-DD-reliever-shadow.json
web/src/lib/day-YYYY-MM-DD-reliever-shadow.js
development-docs/mlb/research/mlb-first-up-reliever-shadow-board-053026.md
```

The generated payload is keyed by team and contains:

- `modelTag`
- research baseline rates
- starter hook risk
- top-two reliever share
- remaining top-three availability / bridge / expected-outs averages
- lead and alternate relievers
- each reliever's score, share, expected outs, availability, bridge score, workload flags, reason tags, and summary

## Current Join Path

1. `pipeline/mlb/workflows/refresh-live-board.mjs` runs the RP36 wrapper during MLB pregame refresh. The old `pipeline/refresh-mlb-live-board.mjs` path remains as a compatibility wrapper.
2. `models/mlb/cartridges/RP36/exporter.py` writes private JSON and a generated web module.
3. `pipeline/lib/load-mlb-day-games.mjs` imports `web/src/lib/day-YYYY-MM-DD-reliever-shadow.js`.
4. `loadMlbDayGames()` joins the shadow cards into `game.relieverShadowContext.away/home` by team name.
5. `web/src/features/mlb/MlbDetail.tsx` renders the shadow context inside each bridge-chain card.

## Current Performance Notes

The important promoted benchmark is the `E33` holdout baseline:

- exact first-up: 26.5%
- top-2: 44.5%
- top-3: 59.6%

Latest saved artifacts:

- 2026-05-29: `E34 shadow`, 284 candidates, 30 teams, average top-2 share 38.2%
- 2026-05-30: `E36 shadow`, 272 candidates, 30 teams, average top-2 share 37.3%

The May 30 target-date shadow check reported:

- 20 team-side games graded
- exact first-up: 20.0%
- top-2: 35.0%
- top-3: 50.0%

That means the layer is useful but not ready to be treated as a standalone betting model. Its current best use is side/total/prop interpretation, especially when the main model depends on starter phase surviving the bridge innings.

## Cartridge Recommendation

Do not make `E36` the parent MLB model.

Use this framing:

```text
M0 = parent MLB side / starter-phase model
RP36 = reliever shadow addendum, legacy alias E36 shadow
E0 = evaluator / settlement layer
```

If the starter-exit layer becomes separate:

```text
W1 / F0 / SP0 / RP36 / M0 / E0
```

If we keep starter and side logic together for the first migration:

```text
W1 / F0 / M0 + RP36 / E0
```

`RP36` should be a component/addendum cartridge consumed by `M0`, not a competing model folder.

## Migration Risks

- The exporter still hardcodes `E36 shadow` and `E33` research rates.
- The UI label still says `E34 shadow` in `MlbDetail.tsx`, even when the payload is `E36 shadow`.
- The shadow layer has no formal settlement table yet.
- The shadow layer has no model-run manifest, source hash, or input hash yet. It does have a May 30 golden snapshot verifier.
- May 29/May 30 generated modules exist, but no May 31 module was present at audit time.
- The current docs are experiment-based, not cartridge-based.

## First Migration Step

Before changing predictions, keep the `RP36` addendum cartridge shape:

```text
models/mlb/cartridges/RP36/
  manifest.json
  model_description.json
  MODEL_NOTES.md
  output-contract.json
  runner.py
  exporter.py
  verify_snapshot.py
```

The first locked behavior test proves that `RP36` reproduces the existing May 30 reliever-shadow artifact exactly, apart from explicit metadata fields we decide to rename.

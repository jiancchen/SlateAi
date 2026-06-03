# MLB-M3 Alpha-4 FS-002 Artifact Review

Date: 2026-06-03

Feature set: `m3_fs_002_game_story_pitching_state_v0`

Run ID: `m3_fs_002_game_story_pitching_state_v0_20260603T155454Z`

Status: accepted as first real M3 feature artifact

## Artifact

```text
data-private/models/mlb-m3/features/m3_fs_002_game_story_pitching_state_v0/m3_fs_002_game_story_pitching_state_v0_20260603T155454Z/
  build_report.json
  coverage.json
  data_dictionary.json
  leakage.json
  lineage.json
  matrix.parquet
  missingness.json
```

Report mirror:

```text
data-migration/reports/m3_fs_002_game_story_pitching_state_v0_2026-03-26_to_2026-05-31.json
```

## Build Summary

| Field | Value |
| --- | ---: |
| Rows | 886 |
| Columns | 295 |
| Features | 280 |
| Targets | 9 |
| Chaos target rows | 214 |
| Final runs target sum | 7826 |

## Validation

| Check | Result |
| --- | --- |
| JSON reports valid | pass |
| Parquet readback | pass |
| Data dictionary unknown columns | 0 |
| Leakage report | pass |
| Expected AB input columns | 0 |
| Fixed raw window truth terms | 0 |
| Uses `sports.db` | false |
| Uses M2 weights | false |
| Uses hand-picked memory lengths | false |

The only warning is that the contract mentions `expected ab` as forbidden vocabulary. No expected-AB feature is materialized.

## Feature Families Present

- replay/story memory
- starter path and exit hazard
- starter pitch-mix coverage/surfaces
- starter mistake-shape coverage/surfaces
- reliever-chain state
- reliever usage/reset coverage
- reliever command profile coverage/surfaces
- hitter-path lineup coverage
- starter-phase hitter matchup surfaces
- hitter pitch-type response coverage
- hitter Statcast/opponent-context coverage
- schedule/context and pregame market coverage

## Known Sparse Areas

| Area | Note |
| --- | --- |
| `game_series_game_number` | 98.3% missing in typed source. |
| pregame market line fields | Very sparse because only a small slice has line values. |
| reliever command profile aggregates | About 75.8% missing for several average command fields because command coverage starts late and candidate profiles are sparse. |

Sparse fields are accepted as coverage/missingness, not filled from legacy DB.

## Caveats

- This is a real feature artifact, but still not proof of model quality.
- Some source snapshot tables contain prior research surfaces. FS-002 records their lineage and coverage but does not promote them as permanent truth.
- Fixed windows are not materialized as FS-002 truth columns. Any source columns with historical window internals must be treated as candidate surfaces for later ablation.
- Player props are still not priced here. Hitter-path features are foundations for downstream distribution contracts.

## Next Step

Create a new alpha-2-style manifest for FS-002, then run the alpha-3 harness against it with metrics-only output.

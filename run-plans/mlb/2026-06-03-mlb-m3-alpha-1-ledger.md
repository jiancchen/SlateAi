# MLB-M3 Alpha-1 Ledger

Date: 2026-06-03

Phase ID: `mlb-m3-alpha-1`

Run plan: `run-plans/mlb/2026-06-03-mlb-m3-alpha-1-run-plan.md`

Status: opened

## Decision Ledger

| ID | Decision | Status | Rationale |
| --- | --- | --- | --- |
| A1-D001 | Use typed MLB DB only: `data-private/warehouse/sports/mlb/sql-mlb.db` | locked | M3 should not depend on legacy `sports.db` once typed migration is the source of truth. |
| A1-D002 | Start with `M3-FS-001: game_shape_starter_v1` | locked | First artifact should support game shape, totals, starter path, and bullpen/reliever coverage before props. |
| A1-D003 | Do not train in alpha-1 | locked | The first deliverable is a trustworthy matrix/report, not model performance. |
| A1-D004 | Do not build player props in alpha-1 | locked | Props must consume shared distributions later; alpha-1 keeps their contract bridge visible only. |
| A1-D005 | Use one opponent pitching path per batting side | locked | Each offense faces starter phase then reliever-chain phase, not independent matchup products. |
| A1-D006 | Treat AB/PA as derived state-path outputs later | locked | AB depends on lineup mechanics, team PA volume, walks, sacs, and game path; do not hand-code expected AB as input truth. |
| A1-D007 | Avoid fixed raw windows as form truth | locked | Ordered state memory, residuals, change candidates, and evidence coverage are the intended abstraction. |
| A1-D008 | Missing source data becomes coverage or tech debt | locked | No silent fallback to legacy sources or invented values. |
| A1-D009 | Keep selection policy out of alpha-1 | locked | Selection can rank/veto later but cannot mutate probabilities or feature facts. |

## Work Ledger

| ID | Work Item | Status | Output / Evidence | Notes |
| --- | --- | --- | --- | --- |
| A1-W001 | Create alpha-1 run plan | complete | `2026-06-03-mlb-m3-alpha-1-run-plan.md` | Phase-specific plan split from broad alpha feature-extraction plan. |
| A1-W002 | Create alpha-1 ledger | complete | this file | Initial decisions and implementation audit trail. |
| A1-W003 | Validate current `M3-FS-001` contract | pending | validator output | Run before editing builder. |
| A1-W004 | Run current skeleton builder | pending | skeleton report JSON | Confirms CLI/report convention before materialization. |
| A1-W005 | Audit typed DB source tables | pending | source table coverage section/report | Include row counts, date ranges, missing tables, freshness concerns. |
| A1-W006 | Confirm artifact writer support | pending | Parquet writer decision | Prefer Parquet; stop if no supported writer exists. |
| A1-W007 | Materialize game base rows | pending | matrix base columns | Completed MLB games only. |
| A1-W008 | Materialize postgame targets | pending | `target_*` columns | Targets isolated from pregame features. |
| A1-W009 | Add data dictionary writer | pending | `data_dictionary.json` | Every feature and target column documented. |
| A1-W010 | Add leakage/missingness/lineage reports | pending | `leakage.json`, `missingness.json`, `lineage.json` | Reports must be dashboard-readable. |
| A1-W011 | Add source coverage report | pending | `coverage.json` | Required contract source tables visible even when deferred. |
| A1-W012 | Add team state-shape block | pending | matrix columns and dictionary | Facts/residuals/coverage only; no composite score. |
| A1-W013 | Add starter path block | pending | starter coverage and matrix columns | Include known flag, workload path coverage, low-evidence flags. |
| A1-W014 | Add opponent matchup coverage | pending | matchup coverage fields | Pitch mix and response availability; no hand-built score. |
| A1-W015 | Add bullpen shape block | pending | bullpen churn coverage | Team bullpen state is not individual reliever performance. |
| A1-W016 | Add reliever path coverage block | pending | availability/router/chain/arm coverage | Keep availability, router, chain, and performance separate. |
| A1-W017 | Add lineup and PA-volume scaffolding | pending | lineup coverage fields | Do not materialize fixed expected AB input. |
| A1-W018 | Add market context or defer explicitly | pending | market coverage fields | Must be pregame timestamp-clean. |
| A1-W019 | Run first full alpha-1 dry build | pending | matrix/report artifacts | Default date range: 2026-03-26 through 2026-05-31. |
| A1-W020 | Review alpha-1 artifacts | pending | accepted/revise/defer notes | Freeze or revise `M3-FS-001` v0.1.0. |

## Source Table Ledger

To be filled during A1-W005.

| Source Table | Required By | Present | Row Count | Date Coverage | Alpha-1 Action | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `games` | base rows, targets | unknown | unknown | unknown | pending |  |
| `game_outcomes` | targets | unknown | unknown | unknown | pending |  |
| `team_game_stats` | targets/team shape | unknown | unknown | unknown | pending |  |
| `phase_outcomes` | F5 targets | unknown | unknown | unknown | pending |  |
| `starting_pitchers` | starter path | unknown | unknown | unknown | pending |  |
| `starting_pitcher_game_logs` | starter path | unknown | unknown | unknown | pending |  |
| `starting_pitcher_form_snapshots` | starter path | unknown | unknown | unknown | pending |  |
| `pitcher_appearances` | starter/reliever path | unknown | unknown | unknown | pending |  |
| `pitcher_pitch_mix_snapshots` | matchup/starter/reliever surfaces | unknown | unknown | unknown | pending |  |
| `player_pitch_type_response_snapshots` | matchup surfaces | unknown | unknown | unknown | pending |  |
| `lineup_matchup_snapshots` | lineup/matchup | unknown | unknown | unknown | pending |  |
| `team_bullpen_shape_snapshots` | bullpen shape | unknown | unknown | unknown | pending |  |
| `bullpen_usage_snapshots` | bullpen shape | unknown | unknown | unknown | pending |  |
| `likely_relief_chains` | reliever router/chain | unknown | unknown | unknown | pending |  |
| `reliever_command_profiles` | reliever performance | unknown | unknown | unknown | pending |  |
| `lineups` | lineup context | unknown | unknown | unknown | pending |  |
| `lineup_slots` | lineup context | unknown | unknown | unknown | pending |  |
| `market_snapshots` | market context | unknown | unknown | unknown | pending |  |
| `market_contracts` | market context | unknown | unknown | unknown | pending |  |
| `market_price_ticks` | market context | unknown | unknown | unknown | pending |  |

## Artifact Ledger

| Artifact | Status | Path |
| --- | --- | --- |
| Contract | exists | `pipeline/mlb/features/contracts/m3_fs_001_game_shape_starter_v1.json` |
| Contract validator | exists | `pipeline/mlb/features/validators/validate_game_shape_starter_v1.py` |
| Feature builder | skeleton | `pipeline/mlb/features/builders/build_game_shape_starter_v1.py` |
| Matrix | pending | `data-private/models/mlb-m3/features/m3_fs_001_game_shape_starter_v1/<run_id>/matrix.parquet` |
| Data dictionary | pending | `data-private/models/mlb-m3/features/m3_fs_001_game_shape_starter_v1/<run_id>/data_dictionary.json` |
| Lineage report | pending | `data-private/models/mlb-m3/features/m3_fs_001_game_shape_starter_v1/<run_id>/lineage.json` |
| Missingness report | pending | `data-private/models/mlb-m3/features/m3_fs_001_game_shape_starter_v1/<run_id>/missingness.json` |
| Leakage report | pending | `data-private/models/mlb-m3/features/m3_fs_001_game_shape_starter_v1/<run_id>/leakage.json` |
| Coverage report | pending | `data-private/models/mlb-m3/features/m3_fs_001_game_shape_starter_v1/<run_id>/coverage.json` |
| Build report | pending | `data-private/models/mlb-m3/features/m3_fs_001_game_shape_starter_v1/<run_id>/build_report.json` |
| Report mirror | pending | `data-migration/reports/m3_fs_001_game_shape_starter_v1_2026-03-26_to_2026-05-31.json` |

## Open Questions

None blocking alpha-1 start.

Items to resolve during implementation:

- exact column mappings for base rows and targets
- Parquet writer support in the local runtime
- market timestamp semantics for pregame-safe market context
- freshness and identity coverage for `likely_relief_chains` and `reliever_command_profiles`

## Stop Log

No stops yet.


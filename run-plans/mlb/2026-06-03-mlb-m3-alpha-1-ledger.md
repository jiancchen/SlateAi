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
| A1-W003 | Validate current `M3-FS-001` contract | complete | `python3 -m pipeline.mlb.features.validators.validate_game_shape_starter_v1 --json` passed | Contract has no errors or warnings. |
| A1-W004 | Run current skeleton builder | complete | `data-migration/reports/m3_fs_001_game_shape_starter_v1_skeleton_2026-03-26_to_2026-05-31.json` | Skeleton report is clean and confirms source DB has 101 typed tables/views. |
| A1-W005 | Audit typed DB source tables | complete | source table ledger below | All contract source tables are present; some date coverage is thin and must be treated as coverage, not hidden fallback. |
| A1-W006 | Confirm artifact writer support | complete | DuckDB writer path | System `python3` has Pandas but no Parquet writer; bundled Codex Python has DuckDB 1.5.3, and `data-migration/requirements.txt` declares DuckDB 1.5.3. Builder must fail loudly if no Parquet writer is available. |
| A1-W007 | Materialize game base rows | complete | 886 matrix rows | Completed games with typed `game_outcomes`; includes one `Completed Early` game with outcome. |
| A1-W008 | Materialize postgame targets | complete | 9 `target_*` columns | Targets are isolated under `target_` and included in leakage report. |
| A1-W009 | Add data dictionary writer | complete | `data_dictionary.json` | Validation found zero undocumented matrix columns. |
| A1-W010 | Add leakage/missingness/lineage reports | complete | `leakage.json`, `missingness.json`, `lineage.json` | Reports are emitted in the run artifact directory. |
| A1-W011 | Add source coverage report | complete | `coverage.json` and report mirror | Required contract source tables are visible in source coverage. |
| A1-W012 | Add team state-shape block | complete | team prior baseline columns | Uses season-to-date prior-game facts only; no composite team score. |
| A1-W013 | Add starter path block | complete | starter prior path and low-evidence columns | Uses prior starts before game date; no fixed last-N memory. |
| A1-W014 | Add opponent matchup coverage | complete | lineup matchup hitter counts | Coverage only in alpha-1; no hand-built matchup score. |
| A1-W015 | Add bullpen shape block | complete | bullpen snapshot availability coverage | Team bullpen state kept separate from individual reliever performance. |
| A1-W016 | Add reliever path coverage block | complete | availability/router/chain/arm coverage | Keeps chain known rate, pool size, entropy, top-two mass, and command profile coverage separate. |
| A1-W017 | Add lineup and PA-volume scaffolding | complete | lineup known/slot/complete fields | No fixed expected AB input was materialized. |
| A1-W018 | Add market context or defer explicitly | complete | pregame market snapshot counts | Counts only snapshots captured before scheduled start time. |
| A1-W019 | Run first full alpha-1 dry build | complete | `m3_fs_001_game_shape_starter_v1_20260603T091939Z` | 886 rows, 77 columns, 62 features, 9 targets; Parquet readback passed. |
| A1-W020 | Review alpha-1 artifacts | pending | accepted/revise/defer notes | Freeze or revise `M3-FS-001` v0.1.0. |

## Source Table Ledger

| Source Table | Required By | Present | Row Count | Date Coverage | Alpha-1 Action | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `games` | base rows, targets | yes | 899 | `game_date`: 2026-03-26 to 2026-06-01; `start_time_utc`: 2026-03-26T17:15:00Z to 2026-06-02T01:40:00Z | use |  |
| `teams` | team names/context | yes | 30 | no date column | use |  |
| `venues` | venue context | yes | 31 | no date column | use |  |
| `game_outcomes` | targets | yes | 886 | `completed_at`: 2026-03-26 to 2026-05-31 | use |  |
| `team_game_stats` | targets/team shape | yes | 1776 | `game_date`: 2026-03-26 to 2026-05-31 | use |  |
| `phase_outcomes` | F5 targets/story shape | yes | 1772 | `game_date`: 2026-03-26 to 2026-05-31 | use |  |
| `starting_pitchers` | starter path | yes | 1776 | `updated_at`: 2026-06-02T22:45:00.875482+00:00 to 2026-06-02T22:45:00.983801+00:00 | use with coverage | Update time is ingestion time, not necessarily pregame as-of. |
| `starting_pitcher_game_logs` | starter path | yes | 1776 | `game_date`: 2026-03-26 to 2026-05-31 | use for targets/coverage, not pregame future features |
| `starting_pitcher_form_snapshots` | starter path | yes | 4533 | `snapshot_date`: 2026-03-31 to 2026-05-31 | use with date coverage | Early-season coverage starts after opening games. |
| `pitcher_appearances` | starter/reliever path | yes | 7498 | `game_date`: 2026-03-26 to 2026-05-31 | use for targets/coverage, not pregame future features |
| `pitcher_pitch_mix_snapshots` | matchup/starter/reliever surfaces | yes | 135153 | `snapshot_date`: 2026-03-27 to 2026-05-31 | use with date coverage |  |
| `pitcher_mistake_shape_snapshots` | starter mistake shape | yes | 3024 | `snapshot_date`: 2026-03-31 to 2026-05-31 | use with date coverage |  |
| `reliever_command_profiles` | reliever performance | yes | 4113 | `snapshot_date`: 2026-05-13 to 2026-06-01 | use with sparse coverage | Thin early-season coverage. |
| `player_pitch_type_response_snapshots` | matchup surfaces | yes | 206697 | `snapshot_date`: 2026-03-27 to 2026-05-31 | use with date coverage |  |
| `lineup_matchup_snapshots` | lineup/matchup | yes | 17924 | `snapshot_date`: 2026-03-31 to 2026-05-31 | use with date coverage | Mostly hitter-vs-starter context; keep as one pitching-path phase. |
| `team_opponent_quality_snapshots` | opponent quality | yes | 1754 | `snapshot_date`: 2026-03-27 to 2026-06-01 | use with date coverage |  |
| `player_career_profiles` | player baseline coverage | yes | 980 | `snapshot_date`: 2026-05-31 to 2026-06-01T22:44:40Z | coverage only in alpha-1 | Later player-prop phases need stricter as-of semantics. |
| `player_statcast_snapshots` | player state coverage | yes | 25797 | `snapshot_date`: 2026-03-27 to 2026-06-01 | coverage only in alpha-1 |  |
| `player_split_snapshots` | player split coverage | yes | 693 | `snapshot_date`: 2026-05-30 to 2026-06-01 | coverage only in alpha-1 | Very thin. |
| `player_opponent_context_snapshots` | player opponent context coverage | yes | 25167 | `snapshot_date`: 2026-03-27 to 2026-06-01 | coverage only in alpha-1 |  |
| `plate_appearances` | replay attribution | yes | 67251 | no date column | coverage only in alpha-1 | Join through `game_id`; not a pregame feature source. |
| `pitch_events` | replay attribution | yes | 304181 | no date column | coverage only in alpha-1 | Join through `game_id`; not a pregame feature source. |
| `game_story_signals` | story labels/targets | yes | 886 | `game_date`: 2026-03-26 to 2026-05-31 | coverage/targets only | Postgame-derived; do not leak into same-game pregame features. |
| `game_story_labels` | story labels/targets | yes | 886 | `game_date`: 2026-03-26 to 2026-05-31 | coverage/targets only | Postgame-derived; prior-game features later need as-of rules. |
| `bullpen_usage_snapshots` | bullpen shape | yes | 16542 | `snapshot_date`: 2026-03-27 to 2026-06-01 | use with date coverage |  |
| `likely_relief_chains` | reliever router/chain | yes | 3508 | `snapshot_date`: 2026-03-27 to 2026-06-01 | use with date coverage |  |
| `team_bullpen_shape_snapshots` | bullpen shape | yes | 1754 | `snapshot_date`: 2026-03-27 to 2026-06-01 | use with date coverage |  |
| `bullpen_mistake_shape_snapshots` | bullpen mistake shape | yes | 3508 | `snapshot_date`: 2026-03-27 to 2026-06-01 | use with date coverage |  |
| `lineups` | lineup context | yes | 1604 | `captured_at`: 2026-05-31T18:17:29.710Z to 2026-06-01T21:35:49Z | coverage only in alpha-1 | Captured-at range is late; use known-slot coverage carefully. |
| `lineup_slots` | lineup context | yes | 14435 | no date column | coverage only in alpha-1 | Join through lineup. |
| `market_snapshots` | market context | yes | 2408 | `captured_at`: 2026-03-26T01:45:09Z to 2026-05-31T17:52:48.365Z | use only with pregame timestamp filter |  |
| `market_contracts` | market context | yes | 798 | `created_at`: 2026-06-02T16:22:40.103686+00:00 to 2026-06-02T22:19:04.492500+00:00 | coverage only or defer | `created_at` is ingestion time; use captured ticks when needed. |
| `market_price_ticks` | market context | yes | 798 | `captured_at`: 2026-05-29T20:42:09Z to 2026-05-31T17:52:48.365Z | use only with pregame timestamp filter | Thin range. |

## Artifact Ledger

| Artifact | Status | Path |
| --- | --- | --- |
| Contract | exists | `pipeline/mlb/features/contracts/m3_fs_001_game_shape_starter_v1.json` |
| Contract validator | exists | `pipeline/mlb/features/validators/validate_game_shape_starter_v1.py` |
| Feature builder | materialized alpha-1 | `pipeline/mlb/features/builders/build_game_shape_starter_v1.py` |
| Matrix | exists | `data-private/models/mlb-m3/features/m3_fs_001_game_shape_starter_v1/m3_fs_001_game_shape_starter_v1_20260603T091939Z/matrix.parquet` |
| Data dictionary | exists | `data-private/models/mlb-m3/features/m3_fs_001_game_shape_starter_v1/m3_fs_001_game_shape_starter_v1_20260603T091939Z/data_dictionary.json` |
| Lineage report | exists | `data-private/models/mlb-m3/features/m3_fs_001_game_shape_starter_v1/m3_fs_001_game_shape_starter_v1_20260603T091939Z/lineage.json` |
| Missingness report | exists | `data-private/models/mlb-m3/features/m3_fs_001_game_shape_starter_v1/m3_fs_001_game_shape_starter_v1_20260603T091939Z/missingness.json` |
| Leakage report | exists | `data-private/models/mlb-m3/features/m3_fs_001_game_shape_starter_v1/m3_fs_001_game_shape_starter_v1_20260603T091939Z/leakage.json` |
| Coverage report | exists | `data-private/models/mlb-m3/features/m3_fs_001_game_shape_starter_v1/m3_fs_001_game_shape_starter_v1_20260603T091939Z/coverage.json` |
| Build report | exists | `data-private/models/mlb-m3/features/m3_fs_001_game_shape_starter_v1/m3_fs_001_game_shape_starter_v1_20260603T091939Z/build_report.json` |
| Report mirror | exists | `data-migration/reports/m3_fs_001_game_shape_starter_v1_2026-03-26_to_2026-05-31.json` |
| Skeleton report | exists | `data-migration/reports/m3_fs_001_game_shape_starter_v1_skeleton_2026-03-26_to_2026-05-31.json` |

## Open Questions

None blocking alpha-1 start.

Items to resolve during implementation:

- exact column mappings for base rows and targets
- market timestamp semantics for pregame-safe market context
- freshness and identity coverage for `likely_relief_chains` and `reliever_command_profiles`
- alpha-1 artifact review and freeze/revise decision

## Stop Log

- 2026-06-03: Initial Parquet write failed because DuckDB parameter binding inside `COPY ... read_csv_auto` treated the output path as the input pattern. Fixed by materializing a temp DuckDB table from CSV, then copying that table to Parquet. No data issue found.

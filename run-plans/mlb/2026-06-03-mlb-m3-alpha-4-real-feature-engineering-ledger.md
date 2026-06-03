# MLB-M3 Alpha-4 Real Feature Engineering Ledger

Date: 2026-06-03

Phase ID: `mlb-m3-alpha-4-real-feature-engineering`

Run plan: `run-plans/mlb/2026-06-03-mlb-m3-alpha-4-real-feature-engineering-run-plan.md`

Status: opened

## Decision Ledger

| ID | Decision | Status | Rationale |
| --- | --- | --- | --- |
| A4-D001 | Build `M3-FS-002: game_story_pitching_state_v0` as the first real feature artifact | proposed | Alpha-1 proved rails; alpha-4 needs actual baseball state features. |
| A4-D002 | Keep first executable lanes at full-game total and F5 total | proposed | These lanes force game-shape, starter path, bullpen chain, and leakage discipline before props. |
| A4-D003 | Preserve hitter-path facts without building player prop prices yet | proposed | Props are downstream distribution contracts, but their feature foundations need to start now. |
| A4-D004 | Treat fixed windows as candidate encoders only, never as truth | locked | The user explicitly rejected arbitrary last-5/last-10 form as a core assumption. |
| A4-D005 | Model one opponent pitching path per batting side | locked | Each offense sees starter phase then reliever-chain phase. |
| A4-D006 | Keep expected AB out of feature inputs | locked | AB/PA should emerge from lineup/state path later, not a hand-authored prior. |
| A4-D007 | Do not make a model claim before alpha-3 harness metrics exist | locked | Feature artifacts and run manifests are not evidence of edge. |

## Work Ledger

| ID | Work Item | Status | Output / Evidence | Notes |
| --- | --- | --- | --- | --- |
| A4-W001 | Capture real feature-engineering plan | complete | `2026-06-03-mlb-m3-alpha-4-real-feature-engineering-run-plan.md` | Documents replay/story, starter, reliever chain, hitter path, and game-shape precursor feature families. |
| A4-W002 | Create alpha-4 ledger | complete | this file | Opens the audit trail for the first real M3 feature build. |
| A4-W003 | Define `M3-FS-002` contract | complete | `pipeline/mlb/features/contracts/m3_fs_002_game_story_pitching_state_v0.json` | Contract locks typed DB, no M2 artifacts, no expected AB input truth, and no fixed raw window truth. |
| A4-W004 | Implement `M3-FS-002` builder | complete | `pipeline/mlb/features/builders/build_game_story_pitching_state_v0.py` | Builds replay/story, starter path, reliever-chain, hitter-path, context, and market coverage features from typed DB. |
| A4-W005 | Generate first `M3-FS-002` artifact | pending |  | Should include matrix, dictionary, lineage, missingness, leakage, coverage, and build report. |
| A4-W006 | Validate `M3-FS-002` artifact | pending |  | Must reject M2 weights, expected AB input, hidden fixed-window truth, and same-game leakage. |
| A4-W007 | Create manifest for `M3-FS-002` | pending |  | Reuse alpha-2 manifest infrastructure after the artifact exists. |
| A4-W008 | Run alpha-3 harness against `M3-FS-002` | pending |  | Metrics-only, no picks or edge claims. |

## Feature Family Ledger

| Family | Status | First Scope |
| --- | --- | --- |
| replay/story memory | planned | days-since events, story run lengths, traffic/conversion memory, collapse attribution |
| starter path | planned | workload path, exit hazard, ordered start state, collapse type, pitch-mix coverage |
| reliever chain | planned | bullpen regime, individual reset, first-up routing, chain depth, reliever performance coverage |
| hitter path | planned | lineup availability, starter-phase fit, reliever-chain fit, outcome-surface coverage |
| game-shape precursors | planned | schedule state, prior-game load, team response state, pregame market coverage |

## Stop Log

No stops yet.

## Verification Log

- 2026-06-03: `python3 -m json.tool pipeline/mlb/features/contracts/m3_fs_002_game_story_pitching_state_v0.json` passed.
- 2026-06-03: `python3 -m py_compile pipeline/mlb/features/builders/build_game_story_pitching_state_v0.py` passed with the bundled workspace Python.
- 2026-06-03: Smoke build for 2026-04-01 through 2026-04-03 wrote 32 rows, 295 columns, 280 features, 9 targets, and zero errors to `/tmp/m3_fs002_smoke`.

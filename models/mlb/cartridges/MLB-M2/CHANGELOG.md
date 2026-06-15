# MLB-M2 Changelog

## MLB-M2.2026-06-15.v0.5 - DB Parity And Morning Gate Cleanup

Status: pipeline hardening. No scoring coefficients were promoted in this entry.

What changed:

- DB slate loading now hydrates hitter matchup rows from `lineup_matchup_snapshots.source_detail_json`, restoring pitch-fit summaries, batter projection metrics, ESPN hitter L/R splits, matchup kernel context, tags, and matchup notes.
- DB starter selection no longer requires `source_name = 'mlb_probables'`. It ranks projection pitchers by source/role so primary-bulk pitcher rows win over MLB-listed openers, while normal MLB feed starters still populate when no primary row exists.
- ESPN pitcher split warehousing now preserves known-good cached raw/artifact/DB split categories when ESPN transiently returns 5xx or empty split payloads.
- StatMuse starter-vs-team fetching now writes `source_fetch_runs` and `source_fetch_status` rows as `statmuse_starter_vs_team`, and the prediction contract checks that receipt plus minimum starter-history row coverage.
- Prediction preflight now checks the modern M2 source stack for the prediction lane: schedule/feed, lineups/probables, odds, FIC weather/BvP/umpire factors, FanGraphs bullpen depth, StatMuse starter history, ESPN pitcher splits, ENV1, and RP2.
- Preflight can derive freshness from `last_success_at + max_stale_hours` when older source receipts do not include `cache_valid_until`.
- Generated-vs-DB parity audit now separates blocking mismatches from warning-level drift. It blocks on missing games, eligibility gaps, lineup counts, starter identity/split status, and addendum coverage; it reports source-label, usage-status, StatMuse-context, and analysis differences as drift.
- Morning runner now refreshes/repairs/ingests final lineup context and refreshes/warehouses final DraftKings lines before strict M2 day-file generation. Final M2 day-file generation then runs through prediction preflight before publish gates.
- Morning runner now captures started-game locks immediately before public MLB publish and audits those locks immediately after publish, preventing already-started game public summary/detail payloads from being rewritten during lineup/odds refreshes.

Verification:

- `npm run data:audit:mlb-prediction-contract -- --date 2026-06-14` passes with 14/14 eligible games.
- `npm run data:audit:mlb-generated-db-parity -- --date 2026-06-14` passes with 14 generated games, 14 DB games, 14/14 eligible in both paths, 0 blocking mismatches, and 14 warning-level drift rows.
- `node data-migration/scripts/fetch-mlb-starter-vs-team-statmuse.mjs --date 2026-06-14` writes 28/28 starter-history rows and source status for the current projection pitchers.
- `node data-migration/scripts/prediction_preflight.mjs --sport mlb --date 2026-06-14 --lane prediction --degraded` checks 13 modern sources; the past-date probe only blocks on stale core schedule/feed/lineup/probable/odds timestamps.
- `npm run data:audit:mlb-started-game-locks -- --date 2026-06-14 --mode capture --source slate` captures 14 started-game locks.
- `npm run data:audit:mlb-started-game-locks -- --date 2026-06-14 --mode audit --source slate` passes against the captured lock snapshot.
- `npm run data:run:mlb-morning -- --date 2026-06-14 --dry-run --skip-prior-close` confirms final lineups/odds now precede strict day-file generation, and strict audits run before publish.

## MLB-M2.2026-06-15.v0.4 - Prediction Contract Cleanup

Status: governance and pipeline cleanup. No scoring coefficients were promoted in this entry.

What changed:

- Added `predictionEligibility` as the shared gate for MLB prediction games.
- Full projected lineups remain valid, but missing or partial lineups, missing projection pitchers, missing required addendums, missing pitch-fit context, missing batter projection context, and missing hitter handedness splits now make a game pending instead of prediction-eligible.
- DB-loaded games now validate the same contract; strict DB mode hard-fails, and normal mode falls back to generated files when DB games are incomplete.
- M2 side, veto, HR, prop, and pick-ranking lanes skip ineligible games.
- ENV1 and RP2 builders now write `source_fetch_runs` and `source_fetch_status` rows as `mlb_env1` and `mlb_rp2`.
- ENV1/RP2 game collection now follows the MLB schedule when schedule rows exist, so FIC/umpire source-only rows cannot create extra model games.
- Prediction contract audit now requires source status for ENV1/RP2, checks current addendum model coverage, and warns on exact-source overcoverage.
- Morning runner now includes the prediction eligibility/addendum contract audit before the hard public/source contract audit.

Verification:

- `npm run data:build:mlb-env1 -- --date 2026-06-14`
- `npm run data:build:mlb-rp2 -- --date 2026-06-14`
- `npm run data:audit:mlb-prediction-contract -- --date 2026-06-14`
- `npm run data:audit:mlb-morning-contracts -- --date 2026-06-14` still fails only on known missing StatMuse public starter histories.
- Temporary side/veto exports and synthetic eligibility checks confirmed ineligible games are filtered.

## MLB-M2.2026-06-14.v0.3 - Side/Tail Coherence Plan

Status: model documentation and addendum scaffold. No production scoring override is promoted by this changelog entry.

Why this version exists:

- The recent YRFI lane is working well enough to preserve and study.
- The failure pattern is side/tail contradiction: some side reads still underweight the same run-carry, starter-fragility, and first-inning pressure signals that correctly promote YRFI or overs.
- The model needs a dedicated starter profile addendum so pitcher shape is not split across isolated notes, cards, and UI explanations.

Version rules:

- YRFI strength is treated as evidence of useful first-inning and run-carry signal, not as proof that every correlated side should be upgraded.
- HRForce >= 1.5 must influence pitcher expected hits/runs/HR and batter expected production when game-window carry persists.
- HRForce >= 1.7 blocks casual unders unless starter, lineup, bullpen, park, and market context all support suppression.
- Full-game ML confidence is capped or demoted when the side needs starter suppression but ENV1/SP1/RP2 point to run-tail risk.
- Full-game side, F5 side, late side, bridge edge, projected runs, and total tail must be reconciled before public confidence can be promoted.
- `Swingy 52` remains valid for true watch/pass games, but separated all-phase edges should not be stuck at 52.

Addendum introduced:

- `MLB-SP1`: starter pitcher profile addendum design scaffold.

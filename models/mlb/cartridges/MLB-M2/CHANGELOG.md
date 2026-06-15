# MLB-M2 Changelog

## MLB-M2.2026-06-15.v0.7 - Player Split Family Warehouse

Status: warehouse scaffold and coverage gate. No scoring coefficients were promoted in this entry.

What changed:

- Added `mlb_player_split_family_snapshots`, a canonical daily table for player split families across hitter and pitcher contexts.
- Hitter rows now warehouse ESPN handedness splits from the final lineup board as `handedness/vs_lhp` and `handedness/vs_rhp`.
- Pitcher rows now warehouse ESPN starter split categories as `handedness/vs_lhb`, `handedness/vs_rhb`, `day_night/day`, `day_night/night`, `home_away/home`, and `home_away/away`.
- Added `data:warehouse:mlb-player-split-families` and `data:audit:mlb-player-split-families`.
- Morning runner now warehouses and audits canonical split-family coverage after final lineup split ingestion and before final odds/preflight.

Verification:

- `node --check scripts/warehouse-mlb-player-split-families.mjs`
- `node --check scripts/audit-mlb-player-split-families.mjs`
- `node --check scripts/run-mlb-morning-predictions.mjs`
- `npm run data:warehouse:mlb-player-split-families -- --date 2026-06-14` inserts 693 rows.
- `npm run data:audit:mlb-player-split-families -- --date 2026-06-14` passes with 0 hard failures.
- June 14 split-family counts: hitters 501 handedness rows; pitchers 64 handedness, 64 day/night, and 64 home/away rows.
- `npm run data:run:mlb-morning -- --date 2026-06-14 --dry-run --skip-prior-close` confirms the warehouse and audit run before final odds/preflight.

## MLB-M2.2026-06-15.v0.6 - Causal Ledger Receipts

Status: read-only observability and pipeline gate. No scoring coefficients were promoted in this entry.

What changed:

- Added `causalLedgerContext` to MLB games after M2 analysis is built, so each game now carries a receipt for lineup, L/R split, pitch fit, BvP/H2H, HRForce, ENV1, RP2, opener/primary, market, ML/F5/totals, and YRFI/NRFI inputs.
- The ledger preserves the old batter-stack policy: handedness split OPS sharpens the existing batter-starter kernel, but does not replace recent form, season baseline, pitch fit, Statcast trend, or BvP/H2H context.
- BvP/H2H is surfaced as a separate lane with `scoreImpact: 0` for undated aggregate rows, keeping old matchup samples visible without letting stale history directly score.
- Generated-file and DB read paths both hydrate the same ledger, and public publish refreshes the ledger after first-five push context is attached.
- Added `data:audit:mlb-causal-ledger` and wired it into the morning runner as a hard pre-publish gate.

Verification:

- `node --check models/mlb/lib/causal-ledger.mjs`
- `node --check pipeline/lib/load-mlb-day-games.mjs`
- `node --check models/mlb/db/day-games.mjs`
- `node --check scripts/audit-mlb-causal-ledger.mjs`
- `node --check scripts/publish-mlb-clean-slate.mjs`
- `node --check scripts/run-mlb-morning-predictions.mjs`
- `npm run data:audit:mlb-causal-ledger -- --date 2026-06-14` passes with 14 games and 0 hard failures.
- `npm run data:run:mlb-morning -- --date 2026-06-14 --dry-run --skip-prior-close` confirms the causal ledger audit runs before publish.

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
- `refresh-live-board` now supports `--prep-only`, letting the morning runner refresh source/features without generating stale board artifacts before ENV1/RP2/lineup finalization.
- Morning runner now refreshes/repairs/ingests final lineup context and refreshes/warehouses final DraftKings lines before strict M2 day-file generation. Final M2 day-file generation then runs through prediction preflight before publish gates.
- Morning runner now regenerates RP36 reliever shadow, veto, HR, and player-prop artifacts only after final strict M2 day-file generation, then imports/grades player props.
- Morning runner now runs the not-started side/F5/late coherence audit as a hard pre-publish gate.
- Morning runner now captures started-game locks immediately before public MLB publish and audits those locks immediately after publish, preventing already-started game public summary/detail payloads from being rewritten during lineup/odds refreshes.
- The default Vercel-safe MLB publish path no longer waives known public-audit failures; the morning runner's final public audit is strict.
- M2 closeout no longer regenerates side/veto prediction lanes during result grading; it imports/grades existing side artifacts when present and runs history journal without prediction preflight.
- MLB pick-ranking, side, veto, home-run, player-prop, clean H+R+RBI, and Mike's BOTD surfaces now require `predictionEligibility.eligible === true`; missing eligibility is no longer treated as acceptable for MLB picks.

Verification:

- `npm run data:audit:mlb-prediction-contract -- --date 2026-06-14` passes with 14/14 eligible games.
- `npm run data:audit:mlb-generated-db-parity -- --date 2026-06-14` passes with 14 generated games, 14 DB games, 14/14 eligible in both paths, 0 blocking mismatches, and 14 warning-level drift rows.
- `node data-migration/scripts/fetch-mlb-starter-vs-team-statmuse.mjs --date 2026-06-14` writes 28/28 starter-history rows and source status for the current projection pitchers.
- `node data-migration/scripts/prediction_preflight.mjs --sport mlb --date 2026-06-14 --lane prediction --degraded` checks 13 modern sources; the past-date probe only blocks on stale core schedule/feed/lineup/probable/odds timestamps.
- `npm run data:audit:mlb-not-started-side-coherence -- --date 2026-06-14` passes with 14 games audited, 0 hard failures, and 0 warnings.
- `npm run data:audit:mlb-started-game-locks -- --date 2026-06-14 --mode capture --source slate` captures 14 started-game locks.
- `npm run data:audit:mlb-started-game-locks -- --date 2026-06-14 --mode audit --source slate` passes against the captured lock snapshot.
- `npm run data:run:mlb-morning -- --date 2026-06-14 --dry-run --skip-prior-close` confirms source/feature prep runs without early board artifact generation; final lineups/odds precede strict day-file generation; RP36/veto/HR/props regenerate after final day files; public audit waivers are absent from the default publish command; and strict audits run before publish.
- `node models/mlb/cartridges/MLB-M2/lanes/sides.mjs --start-date 2026-06-14 --end-date 2026-06-14 --out /tmp/mlb-sides-eligibility-smoke.json` exports 14 side rows after strict eligibility gating.
- `node models/mlb/cartridges/MLB-M2/lanes/veto.mjs --date 2026-06-14 --out /tmp/mlb-veto-eligibility-smoke.json` exports 14 veto rows after strict eligibility gating.
- `node models/mlb/cartridges/MLB-M2/lanes/home-runs.mjs --date 2026-06-14 --top 3 --scan-limit 6 --team-limit 1 --out /tmp/mlb-hr-eligibility-smoke.json --module-out /tmp/mlb-hr-eligibility-smoke.js` exports 3 smoke-test HR rows after strict eligibility gating.
- `node --check models/mlb/cartridges/MLB-M2/workflows/followup.mjs` passes after removing closeout-time side/veto regeneration.
- `npm --prefix web run build` passes.

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

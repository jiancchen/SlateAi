# MLB Prediction Ingestion And Generation Contract Audit - 2026-06-15

Purpose: define everything that must be ingested, generated, validated, and published for an MLB prediction slate so the pipeline fails early instead of requiring manual correction passes.

## Current Audit Result

- The generated-slate path can produce complete prediction artifacts.
- The typed source-status/preflight layer does not yet match the live M2 addendum contract.
- Current audits catch some missing public fields, but they do not yet prove every required source was fresh, complete, and causally applied before picks were published.
- June 14 generated artifacts had 14 games, 14 lineup boards, 0 missing pitchers, 0 missing lineups, and ENV1/RP2/FIC attached to every generated game.
- June 14 source status still did not represent the new contract cleanly: several legacy feature families were missing or absent from the status layer even while newer addendum tables had data.
- Existing June 14 audits:
  - `data:audit:mlb-public` failed only on `missing-rp36-shadow` for all 14 games.
  - `data:audit:mlb-morning-contracts` failed on 4 missing StatMuse public starter histories.
  - `data:audit:mlb-not-started-side-coherence` passed all 14 games.

## Prediction Eligibility Contract

A game is prediction-eligible only when the complete projection skeleton exists.

Required per game:

- 9 away hitters.
- 9 home hitters.
- Away projection pitcher.
- Home projection pitcher.
- Pitcher role context:
  - MLB official/listed starter or opener.
  - Rotowire primary/bulk pitcher when present.
  - Opener context preserved separately for NRFI/YRFI.
- Lineup status and source:
  - `official`, `projected`, `partial`, `missing`, `stale`, or `locked`.
  - Source label.
  - Snapshot timestamp.
- Weather/park context.
- Market context when publishing value or best-pick rows.

Allowed:

- Full projected lineups are valid.
- Official lineups are valid.
- Rotowire projected/supplemental lineups are valid if complete at 9 hitters per side.

Blocking:

- Missing lineup side.
- Partial lineup side with fewer than 9 hitters.
- Missing projection pitcher on either side.
- Missing pitcher role context when MLB and Rotowire differ.
- MLB opener used as projection pitcher when Rotowire primary/bulk pitcher exists.
- Missing lineup timestamp/source.
- Started game being regenerated instead of locked.

Public behavior:

- Ineligible game may appear as a matchup shell only.
- Ineligible game must not have ML, F5 ML, totals, YRFI/NRFI, props, BOTD, best-pick eligibility, confidence, or “why this lean” writeup.

## Required Ingestion Sources

### 1. Schedule And Game Feed

Commands:

- `npm run data:fetch:mlb-schedule-feed -- --start-date YYYY-MM-DD --end-date YYYY-MM-DD`
- `npm run data:ingest:mlb-day -- --date YYYY-MM-DD`

Raw/source targets:

- `data-private/raw/mlb/<date>/schedule*.json`
- `data-private/raw/mlb/<date>/games/*-feed-live.json.gz`

Typed targets:

- `games`
- `teams`
- `venues`
- `players`
- `starting_pitchers`
- `plate_appearances`
- `pitch_events`
- `game_outcomes`
- `team_game_stats`
- `player_game_batting`
- `pitcher_appearances`
- `phase_outcomes`
- `source_fetch_status`

Required status families:

- `mlb_schedule`
- `mlb_game_feed`

Hard gates:

- Expected game count matches schedule.
- No postponed/doubleheader ID confusion.
- Every game has `gamePk`, away team, home team, venue, start time.
- Feed rows are source-snapshot stable and reruns do not inflate final facts.

Known break risk:

- `team_game_stats` can duplicate because final feed snapshots use the source snapshot ID in the stable ID.

### 2. Lineups, Probables, Primary/Bulk, And Openers

Commands:

- `npm run data:refresh:mlb-live -- --date YYYY-MM-DD`
- `npm run data:export:mlb-lineups -- --date YYYY-MM-DD`
- `npm run data:ingest:hitter-lineup-splits -- --date YYYY-MM-DD`

Sources:

- MLB schedule/probables.
- MLB feed/live boxscore batting orders.
- Rotowire daily lineups.
- Rotowire primary/bulk tags.
- Rotowire opener/primary context.

Raw/generated targets:

- `data-private/lineups/mlb/<date>-lineup-board.json`
- `web/src/lib/day-<date>-lineups.js`

Typed targets:

- `lineups`
- `lineup_slots`
- `lineup_matchup_snapshots`
- `lineup_shape_snapshots`
- `starting_pitchers`
- `mlb_lineup_pitcher_matchup_daily`

Required status families:

- `mlb_lineups`
- `mlb_probables`

Hard gates:

- Every prediction game has 18 hitters.
- Every prediction game has 2 projection pitchers.
- Every lineup side has status, source, and timestamp.
- Rotowire primary/bulk pitcher overrides MLB opener for modeling.
- MLB opener remains available for NRFI/YRFI and game-story context.
- Official/projected/partial/missing states are not collapsed into generic “lineup pending.”

Known break risk:

- Generated lineup lane preserves role context, but typed DB currently flattens starter rows and can lose primary/opener semantics.
- DB starter query has historically required `source_name = 'mlb_probables'`, which misses many rows stored as `mlb_game_feed`.

### 3. DraftKings/Odds/Markets

Commands:

- `npm run data:fetch:draftkings-mlb -- --date YYYY-MM-DD`
- `python3 data-migration/scripts/ingest_mlb_markets_props_raw_to_typed.py --date YYYY-MM-DD`
- `python3 data-migration/scripts/validate_mlb_markets_props_raw_to_typed.py --date YYYY-MM-DD`

Raw targets:

- `data-private/odds/draftkings/mlb/<date>-draftkings-mlb-lines.json`

Typed targets:

- `market_contracts`
- `market_price_ticks`
- `market_snapshots`
- `market_mispricing_labels`

Required status family:

- `mlb_odds`

Hard gates:

- Full-game ML present for publishable value rows.
- Full-game total present for totals rows.
- First-five ML present for F5 ML rows.
- First-five total present for F5 total rows.
- `first5TotalLineSource` must be `posted` when DraftKings provides the market.
- Market timestamp and sportsbook lineage are preserved.

Known break risk:

- Current public audit checks DraftKings presence when a DraftKings board exists, but best-pick eligibility does not yet require a complete market lineage ledger.

### 4. Baseball Savant Hitter Statcast And Pitch Arsenal

Commands:

- `npm run data:fetch:mlb-hitter-statcast -- --date YYYY-MM-DD`
- `node models/mlb/cartridges/MLB-M2/workflows/archive-m2/legacy-warehouse.mjs ingest-hitter-statcast-range --start-date YYYY-MM-DD --end-date YYYY-MM-DD`
- `node models/mlb/cartridges/MLB-M2/workflows/archive-m2/legacy-warehouse.mjs derive-hitter-statcast-trends --as-of-date YYYY-MM-DD`

Raw targets:

- `data-private/raw/baseballsavant/hitter-statcast/<date>/{grouped,details}.csv`

Typed targets:

- `mlb_hitter_statcast_game_logs`
- `mlb_hitter_statcast_trend_snapshots`
- `mlb_hitter_pitch_type_response_daily`
- `player_statcast_game_logs`
- `player_pitch_type_response_snapshots`

Required status families:

- `baseballsavant_hitter_statcast`
- `mlb_player_context`

Hard gates:

- Every projected hitter has recent Statcast trend where available.
- Public batter board has 7-game and 30-day xwOBA bubbles for most hitters.
- Pitch-fit rows exist for most hitters.
- Missing Savant data is flagged, not silently treated as neutral.

Known break risk:

- Current `source_fetch_status` can mark `baseballsavant_hitter_statcast` as missing even when generated lineups have pitch-fit/statcast context from another path.

### 5. ESPN Hitter L/R Splits

Commands:

- Currently fetched inside `data:export:mlb-lineups`.

Generated targets:

- `data-private/lineups/mlb/<date>-lineup-board.json`
- `web/src/lib/day-<date>-lineups.js`

Expected game object fields:

- Each lineup hitter should expose vs LHP and vs RHP split context.
- Split sample size should be preserved.
- Batter handedness should be present.

Hard gates:

- Every projected hitter should have batting hand.
- Every projected hitter should have vs LHP/vs RHP split rows when source can resolve player.
- Missing ESPN hitter split should reduce confidence or create a warning.
- Split signal must feed batter matchup score, lineup team summary, pitch fit, and game story.

Known break risk:

- There is no first-class `source_fetch_status` family for ESPN hitter splits.
- Current audits count generic split rows but do not prove the split was used to change matchup scoring.

### 6. ESPN Pitcher L/R Splits

Commands:

- `node scripts/warehouse-mlb-espn-pitcher-splits.mjs --date YYYY-MM-DD`

Raw/generated targets:

- `data-private/predictions/mlb-espn-pitcher-splits/<date>-pitcher-splits.json`

Typed targets:

- `mlb_pitcher_espn_splits`

Expected game object fields:

- `starterContext.away.espnSplits`
- `starterContext.home.espnSplits`

Hard gates:

- Every projection pitcher has fetched or explicitly unresolved ESPN split status.
- Required categories should exist when fetched.
- Pitcher vs LHB/RHB weakness must feed lineup handedness score, ML/F5 totals, YRFI/NRFI, and game story.

Known break risk:

- Public audit checks for starter split status, but no source-family preflight requires ESPN pitcher splits.

### 7. StatMuse Starter Vs Opponent History

Commands:

- `node data-migration/scripts/fetch-mlb-starter-vs-team-statmuse.mjs --date YYYY-MM-DD`

Raw/generated targets:

- `data-private/predictions/mlb-statmuse/<date>-pitcher-history.json`

Typed targets:

- `mlb_starter_vs_team_statmuse`

Expected game object fields:

- `starterContext.away.statmuseVsOpponent`
- `starterContext.home.statmuseVsOpponent`

Hard gates:

- Missing starter history is allowed only with explicit unresolved reason.
- Batter/pitcher history older than 3 years should not be high-weight.
- Repeat opponent tax should be calculated when both starters recently faced the opponent.

Known break risk:

- June 14 morning contract audit failed because 4 starters were missing public StatMuse context.

### 8. FantasyInfoCentral Weather/HRForce

Commands:

- `npm run data:warehouse:mlb-fic-weather -- --date YYYY-MM-DD`

Raw/generated targets:

- `data-private/fantasyinfocentral/mlb/weather/<date>*`

Typed targets:

- `mlb_fic_weather_daily`
- `mlb_fic_weather_hourly_daily`

Expected fields:

- `hr_force`
- `effective_hr_force`
- `forecast_max_hr_force`
- `high_hr_force_flag`
- `low_hr_force_flag`
- `dome_hr_force_na_flag`
- `roof_status`
- `current_temperature_f`
- `wind_speed_mph`
- `wind_degree`

Hard gates:

- Every outdoor game should have weather row or explicit unresolved status.
- Dome/closed-roof games should carry dome/no-weather-impact flags.
- HRForce >= 1.4 should support higher run/HR/YRFI carry.
- HRForce should not support unders by itself.
- HRForce >= 1.7 should force a visible YRFI/over pressure check.

Known break risk:

- FIC weather exists as `fantasyinfocentral_weather`, not as a lane-required source family in prediction preflight.

### 9. FantasyInfoCentral Daily BvP Matchups

Commands:

- `npm run data:warehouse:mlb-fic-daily-matchups -- --date YYYY-MM-DD`

Typed targets:

- `mlb_fic_daily_matchups`

Expected game object fields:

- `ficDailyMatchupContext`

Hard gates:

- BvP rows should be attached by game and by player when available.
- Old BvP data should be down-weighted or ignored if older than 3 years.
- Current hot/cold form should blend with BvP instead of being overwritten by BvP.
- The game story should say when BvP materially changes a side or total.

Known break risk:

- Current audits check FIC attachment weakly or not at all; they do not prove BvP changed hitter scores.

### 10. FantasyInfoCentral And TheCapper Umpires

Commands:

- `npm run data:warehouse:mlb-fic-umpire-factors -- --date YYYY-MM-DD`
- `npm run data:warehouse:mlb-umpires -- --date YYYY-MM-DD`
- `npm run data:audit:mlb-umpires -- --date YYYY-MM-DD`

Typed targets:

- `mlb_fic_umpire_factors_daily`
- `mlb_umpire_assignments_daily`
- `mlb_umpire_profiles_daily`

Expected ENV1 fields:

- `umpire_name`
- `umpire_assignment_status`
- `umpire_favors_code`
- `umpire_zone_factor`
- `umpire_runs_delta`
- `umpire_k_delta`
- `umpire_walk_delta`

Hard gates:

- Exact umpire assignment can adjust K/BB/runs.
- Missing or unresolved umpire must be zero adjustment.
- The game story should label umpire data as exact or unresolved.

Known break risk:

- June 13/14 TheCapper source status showed 0 actual against 15 expected but `success`; that should be `partial` or `missing`, not success.

### 11. MLB-ENV1 Environment Adjustments

Commands:

- `npm run data:build:mlb-env1 -- --date YYYY-MM-DD`

Typed targets:

- `mlb_game_environment_adjustments_daily`

Expected game object fields:

- `environmentAdjustmentContext`
- `parkContext`

Required fields:

- `expected.totalRunsDelta`
- `expected.hitsDelta`
- `expected.hrDelta`
- `expected.strikeoutsDelta`
- `expected.walksDelta`
- `signal`
- `park.runDelta`
- `park.hrDelta`
- `weather.hrForce`
- `weather.effectiveHrForce`
- `weather.runDelta`
- `weather.hrDelta`
- `umpire.runsDelta`
- `umpire.strikeoutsDelta`
- `umpire.walksDelta`
- `visibility.hitsMultiplier`
- `visibility.hrMultiplier`
- `visibility.runsMultiplier`

Hard gates:

- Every prediction game should have ENV1 or explicit neutral/unresolved context.
- Missing ENV1 should block totals, HR, hits, and YRFI confidence.
- High HRForce should create visible over/YRFI pressure.
- Late/night visibility should be explicit and should not silently suppress or boost.

Known break risk:

- ENV1 table has data, but `source_fetch_status` still uses older `mlb_environment` expectations that do not cleanly represent ENV1.

### 12. FanGraphs/RosterResource Bullpen Context

Commands:

- `npm run data:warehouse:mlb-fangraphs-bullpen-depth -- --date YYYY-MM-DD --team all`

Typed targets:

- `mlb_fangraphs_bullpen_depth_daily`
- `mlb_fangraphs_relief_roster_daily`
- `mlb_fangraphs_bullpen_usage_daily`
- `mlb_fangraphs_bullpen_usage_events_daily`
- `mlb_fangraphs_team_rp_rankings_daily`
- `mlb_fangraphs_closer_depth_daily`
- `mlb_fangraphs_closer_usage_daily`

Hard gates:

- Every team should have bullpen depth/availability context or explicit unresolved status.
- This should feed RP2 and bridge stress.

Known break risk:

- Source status exists for FanGraphs bullpen but prediction preflight does not treat it as part of the live RP2 readiness contract.

### 13. MLB-RP2 Relief Projection

Commands:

- `npm run data:build:mlb-rp2 -- --date YYYY-MM-DD`

Typed targets:

- `mlb_relief_pitcher_projection_v1_daily`

Expected game object fields:

- `reliefProjectionContext`
- `awayReliefProjectionContext`
- `homeReliefProjectionContext`

Required fields:

- `projectedReliefRunsAllowed`
- `projectedReliefOuts`
- `projectedRelieversUsed`
- `bridgeStressScore`
- `leverageAvailabilityScore`
- `fatigueScore`
- `qualityScore`
- `runRiskTier`
- `topTwoSharePct`
- `lead.pitcherName`
- `lead.expectedOuts`
- `lead.availabilityScore`

Hard gates:

- Every prediction team side should have RP2.
- RP2 should feed totals, late scoring risk, bridge stress, bullpen warnings, and side/F5/late coherence.
- RP2 should not fully replace RP36 until promoted.
- Exact first-up reliever identity should remain low-confidence unless promoted by backtest.

Known break risk:

- Public audit still hard-fails on RP36 shadow even though RP2 is the newer addendum; the contract must clarify whether RP36 is required, optional, or shadow-only.

### 14. MLB-RP36 Relief/K Shadow Addendums

Commands:

- `npm run data:generate:mlb-shadow-addendums -- --dates YYYY-MM-DD`
- `npm run data:export:mlb-reliever-shadow -- --date YYYY-MM-DD`

Generated targets:

- `web/src/lib/day-<date>-reliever-shadow.js`
- `data-private/predictions/mlb-reliever-shadow/<date>-reliever-shadow.json`

Expected game object fields:

- `relieverShadowContext`

Hard gates:

- If RP36 remains required, every game should have away/home RP36.
- If RP36 is shadow-only, missing RP36 should be a warning, not a hard public audit failure.

Known break risk:

- Current public audit fails all June 14 games on missing RP36 shadow while publish still allows known audit failures.

### 15. Team/Starter/Form/State Features

Commands:

- `data:derive:*` legacy warehouse commands inside refresh-live-board.
- `npm run data:refresh:mlb-live -- --date YYYY-MM-DD`

Typed/generated targets:

- `mlb_team_rolling_form`
- `mlb_team_story_priors`
- `mlb_team_state_snapshots`
- `mlb_team_mistake_shape_daily`
- `mlb_lineup_conversion_shape_daily`
- `mlb_team_first_inning_profiles_daily`
- `mlb_pitcher_first_inning_profiles_daily`
- `mlb_starting_pitcher_rolling_form`
- `mlb_starter_leash_profiles`
- `mlb_starter_third_time_penalty_profiles`
- `mlb_pitcher_pitch_mix_daily`
- `mlb_pitcher_mistake_shape_daily`

Required status families:

- `mlb_pitcher_features`
- `mlb_team_features`
- `mlb_bullpen_features`

Hard gates:

- Missing team/starter/form features should reduce or block confidence.
- Zero-row normalization reports cannot be `ok: true` for required sources.

Known break risk:

- These source families can be missing in source status even while generated addendum data exists.

## Required Generated Prediction Artifacts

### Model/Internal Artifacts

Expected after generation:

- `web/src/lib/day-<date>-data.js`
- `web/src/lib/mlb-context-<date>.js`
- `web/src/lib/day-<date>-lineups.js`
- `web/src/lib/day-<date>-reliever-shadow.js` if RP36 remains required.
- `data-private/lineups/mlb/<date>-lineup-board.json`
- `data-private/predictions/mlb-sides/<date>-board-live.json`
- `data-private/predictions/mlb-sides/<date>-veto-artifact.json`
- `data-private/predictions/mlb-player-props/<date>-player-props.json`
- `data-private/predictions/mlb-player-props-legacy/<date>-player-props-legacy.json` if legacy batter props are still merged.
- `data-private/predictions/mlb-home-runs/<date>-statcast-prototype.json`
- `data-private/predictions/mlb-espn-pitcher-splits/<date>-pitcher-splits.json`
- `data-migration/reports/mlb_morning_predictions_<date>.json`

Hard gates:

- Every generated game has complete `rawGames` identity.
- Every generated game has complete lineup board.
- Every generated game has starter context.
- Every generated game has environment context.
- Every generated game has relief projection context.
- Every generated game has game story and analysis.
- Every generated prop includes source lineage when priced.

### Public Artifacts

Expected after publish/export:

- `web/public/data/slates/<date>/summary.json`
- `web/public/data/slates/<date>/games/<game-id>.json`
- `web/public/data/slates/<date>/props.json`
- `web/public/data/slates/<date>/home-runs.json`
- `web/public/data/slates/<date>/search.json`
- `web/public/data/slates/<date>/mlb-results.json` after settlement.
- `web/public/data/current/summary.json`
- `web/public/data/current/games/<game-id>.json`
- `web/public/data/current/props.json`
- `web/public/data/current/home-runs.json`
- `web/public/data/current/search.json`
- `web/public/data/meta.json`
- `web/public/data/search.json`

Hard gates:

- Current summary and slate summary agree.
- Every summary MLB game has a detail JSON file.
- Every game detail has the required prediction skeleton.
- Started games are preserved when requested.
- Non-MLB games are preserved.
- Public data contains no private absolute paths or hashes.

## Current Validation Gates

Existing gates:

- `prediction_preflight.mjs`
- `audit-public-mlb-slate.mjs`
- `audit-mlb-morning-contracts.mjs`
- `audit-mlb-not-started-side-coherence.mjs`
- `audit-mlb-umpire-warehouse.mjs`
- DraftKings market validation.
- Typed source-fetch contract validation.

What current gates cover reasonably:

- Basic public game schema.
- 9 hitter lineups in public audit/publish.
- Starter context existence.
- ESPN pitcher split status in public artifacts.
- Pitch fit presence.
- DraftKings market families.
- Prop board size and pitcher K lineage.
- Some side/F5/late coherence.

What current gates do not yet cover:

- Full prediction eligibility object per game.
- ENV1 required presence in public audit.
- RP2 required presence in public audit.
- FIC weather/HRForce required presence in public audit.
- FIC daily BvP required presence/usage.
- Lineup freshness/staleness windows.
- Official vs projected lineup semantics.
- Started game lock mutation audit.
- Source-status parity with generated artifact reality.
- Zero-row normalization as failure.
- Causal ledger per game.
- HRForce movement check.
- Handedness split movement check.
- RP2 movement check.
- Rotowire primary/opener movement check.
- StatMuse unresolved reason check.

## Breakpoints To Fix First

1. Add `predictionEligibility` to every game before any picks are generated.
2. Add a hard pre-publish eligibility audit.
3. Align source status with actual live addendums: ENV1, RP2, FIC weather, FIC daily matchups, ESPN hitter splits, ESPN pitcher splits, Rotowire role context, StatMuse.
4. Fail zero-row required normalizations.
5. Make generated-vs-DB parity explicit before DB mode can be trusted.
6. Clarify RP36 vs RP2: either require RP36 or stop making missing RP36 a hard public failure.
7. Add lineup freshness and started-game lock audits.
8. Add causal ledger audits for HRForce, handedness, RP2, pitcher profile, and opener/primary.
9. Split closeout from prediction lanes.
10. Make the morning runner fetch all sources first, preflight once, generate once, audit once, publish once.

## Minimal Non-Breaking Pre-Implementation Test Set

Before changing code, every implementation phase should run:

```bash
npm run data:audit:mlb-public -- --date YYYY-MM-DD
npm run data:audit:mlb-morning-contracts -- --date YYYY-MM-DD
npm run data:audit:mlb-not-started-side-coherence -- --date YYYY-MM-DD
node data-migration/scripts/prediction_preflight.mjs --sport mlb --date YYYY-MM-DD --lane prediction --no-partial
node data-migration/scripts/prediction_preflight.mjs --sport mlb --date YYYY-MM-DD --lane value --no-partial
node data-migration/scripts/prediction_preflight.mjs --sport mlb --date YYYY-MM-DD --lane props --no-partial
```

The next audit additions should produce one report:

```text
data-migration/reports/audit_mlb_prediction_contract_<date>.json
```

Required sections:

- source family readiness
- addendum readiness
- generated artifact readiness
- per-game eligibility
- public artifact parity
- causal ledger coverage
- mutation/lock status
- warnings
- hard failures

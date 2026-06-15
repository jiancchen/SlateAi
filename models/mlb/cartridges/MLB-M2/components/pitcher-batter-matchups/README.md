# Pitcher-Batter Matchup Kernel

M2 totals are failing when the model treats offense, starter form, and bullpen state as mostly separate averages. This component exists to answer a sharper question:

> Can today's lineup punish this specific starter's pitch, zone, command, and damage shape before the market line catches it?

This is not a direct O/U formula. It is a story-bucket input for `components/totals` and `components/game-shape`.

## Current Live Implementation

The deep pitch-event warehouse kernel below remains research-only until calibrated, but M2 now has a lightweight daily lineup kernel in `models/mlb/cartridges/MLB-M2/lanes/lineups.mjs`.

Live inputs:

- posted lineup hitter season/recent stats
- current-season hitter handedness split vs today's starter hand
- ESPN hitter `byBreakdown` split rows for `vs. Left` and `vs. Right`, selected by today's starter throwing hand
- ESPN starter `Right / Left` allowed splits by effective batter side
- Baseball Savant pitch-arsenal rows for hitter xBA, xSLG, xwOBA, hard-hit, whiff, and K profile by pitch type
- league-average Savant pitch-type baselines for the same pitch types
- hitter Statcast recent trend snapshots

Live output fields:

- hitter-level `matchupKernel`
- team-level `starterMatchupKernelIndex`
- team-level `starterMatchupKernelHitters` and `starterMatchupKernelRisks`
- pitch-type `vsLeague` deltas inside hitter `pitchType`

Rules:

- Current form dominates the blend; recent cold form caps old BvP/history lift.
- Keep ESPN right/left semantics separate: hitter rows are batter production versus pitcher hand; starter rows are allowed production versus batter side.
- Pitch-type fit must compare the hitter to league average for the starter's pitch mix, not only raw hitter production.
- BvP is context-only unless the sample is dated within the last 3 seasons and has at least 5 AB.
- `starterMatchupKernelIndex` is allowed to move projected hits, run conversion, first-inning probability, ML/F5 ML shape, totals, and hitter prop confidence.

## MLB-SP1 Integration

The live kernel is the hitter/lineup half of the MLB-SP1 starter profile addendum.

SP1 preserves this kernel and materializes the pitcher-profile half that used to be scattered across cards and writeups:

- projection pitcher role from Rotowire primary/bulk vs MLB opener
- pitcher day/night, home/away, and venue splits when source/sample supports them
- pitcher handedness-allowed split by posted lineup side
- pitcher pitch-mix weather archetype against HRForce, temperature, wind, and roof state
- repeat-opponent tax for same-season and last-three-season starts
- first-inning/opener risk for YRFI/NRFI
- pitcher expected hits, runs, HR, walks, strikeouts, outs, and leash deltas

The key usage rule is side/tail coherence. If the kernel and SP1 say a starter is fragile, M2 should not keep a full-game side promoted just because the side model is barely positive. The cleaner lane may be YRFI, over, team total, F5, live-only, or pass.

## Source Intake

Useful ideas pulled from the review pass:

- Allen and Savala train/test by season instead of random folds and warn that naive betting every model edge can be heavily negative. Their run-line section supports hard no-bet zones and lane-specific cutoffs before a prediction becomes actionable. Source: https://arxiv.org/pdf/2511.02815
- Their feature set also uses team hitting, team fielding, team pitching, starting pitcher variables, rest, prior result, ELO/log5 style context, and year/month controls. The useful M2 takeaway is not the exact variables; it is separating team baseline, starter, and context rather than using one blended confidence score. Source: https://arxiv.org/pdf/2511.02815
- The CMC/TFT pitcher paper treats pitcher ERA as a multivariable time-series problem and reports stronger performance from TFT-style sequence models than recurrent baselines in its experiment. The useful M2 takeaway is sequence-state modeling for pitchers: current form should be a short sequence with attention/feature attribution, not a raw trailing average. Source: https://cdn.techscience.cn/files/cmc/2025/online/CMC0425/TSP_CMC_65413/TSP_CMC_65413.pdf
- The TFT paper's SHAP analysis highlights slugging percentage, pitcher wins, and strikeout percentage as influential for ERA prediction. For M2, this reinforces using damage prevention and K ability as pitcher state axes, while keeping feature attribution visible. Source: https://cdn.techscience.cn/files/cmc/2025/online/CMC0425/TSP_CMC_65413/TSP_CMC_65413.pdf
- The Fast Break Bets writeup is not a scientific source, but its "cluster luck" framing is useful: AVG/OBP can create traffic while SLG/ISO determines whether that traffic becomes runs. M2 should explicitly separate traffic from damage and stranded-run risk. Source: https://www.fastbreakbets.com/mlb-picks/mlb-betting-model-clutchwrap-supreme/
- The same writeup adjusts daily for the exact lineup and starter, using bullpen as a collective projection when individual reliever usage is uncertain. M2 already has richer reliever context, but the daily-lineup/starter unit is the right modeling grain. Source: https://www.fastbreakbets.com/mlb-picks/mlb-betting-model-clutchwrap-supreme/

## Warehouse Tables Needed

Existing useful tables:

- `mlb_pitch_events`: pitch type, zone, speed, call, in-play flag, pitcher, batter, game date.
- `mlb_plate_appearances`: PA result, base state, handedness matchup, scoring, event type, pitcher, batter.
- `mlb_hitter_split_snapshots`: lineup-day splits by pitcher hand and matchup context.
- `mlb_hitter_statcast_game_logs`: hitter xwOBA/xSLG/barrel/hard-hit/swing metrics by game.
- `mlb_hitter_statcast_trend_snapshots`: rolling hitter damage/process state.
- `mlb_pitcher_mistake_shape_daily`: one-bad-inning and run-cluster pitcher/team context.
- `mlb_pitcher_first_inning_profiles_daily`: first-cycle starter crack profile.
- `mlb_team_whiff_persistence_profiles`: whether early whiff dominance tends to persist or rebound.

New derived tables to add:

- `mlb_pitcher_pitch_mix_daily`
  - `as_of_date`, `pitcher_id`, `pitch_hand`, `window_games`
  - pitch type share, zone share, in-zone rate, chase/waste proxy, first-pitch strike proxy
  - whiff rate, called strike rate, hard-contact allowed rate, HR/XBH allowed rate by pitch type
  - sequence-state fields: last 2, 3, 4, 5 appearance deltas with capped tails

- `mlb_hitter_pitch_type_response_daily`
  - `as_of_date`, `player_id`, `batter_side`, `window_games`
  - result quality by pitch type and zone band
  - whiff rate, called-strike vulnerability, hard-hit rate, XBH/HR rate, foul-survival proxy
  - split by pitcher hand where sample supports it

- `mlb_lineup_pitcher_matchup_daily`
  - `as_of_date`, `game_id`, `team_role`, `opposing_pitcher_id`
  - lineup order slots 1-9 matchup scores
  - first-cycle, second-cycle, and F5 aggregate matchup vectors
  - traffic-vs-damage fork: lineup can reach base vs lineup can convert
  - starter-collapse attack score and under-suppression score

## Feature Contract

Per batter vs starter:

- `pitchFitDamage`: hitter damage profile against starter pitch mix.
- `pitchFitWhiff`: starter whiff shape vs hitter miss profile.
- `zonePunish`: hitter damage zones vs starter zone leakage.
- `commandStress`: starter walk/deep-count leakage vs hitter take/walk profile.
- `platoonPressure`: handedness split pressure from `mlb_hitter_split_snapshots`.
- `firstCycleRead`: expected first PA quality for lineup slot.
- `secondCycleRead`: whether the matchup gets louder after first look.

Per lineup vs starter:

- `firstCycleTraffic`
- `firstCycleDamage`
- `starterWindowTraffic`
- `starterWindowDamage`
- `starterWindowWhiffSuppression`
- `trafficNoDamageRisk`
- `damageWithoutTrafficRisk`
- `collapseTriggerScore`

Per game:

- `bothStartersMatchupVolatility`
- `lineupDamageAsymmetry`
- `lineupWhiffAsymmetry`
- `pitchMixMismatchOverTail`
- `pitchMixMatchUnderTail`

## Modeling Rules

- Do not use raw trailing averages.
- Build pitcher state as a short sequence: last 2, 3, and 4 starts/appearances plus season baseline and career-ish stabilizer.
- Build hitter state as a short sequence plus current lineup role, not just last-five box score.
- Treat one explosion game as a tail update, not a baseline shift.
- Keep traffic and damage separate. AVG/OBP-like pressure without SLG/ISO-like pressure is a strand/fork signal.
- Use feature attribution per game. If M2 says over, it should name the pitch-matchup reason: command leak, pitch-type mismatch, zone leak, damage fit, or bullpen bridge mismatch.
- No value-board promotion until this layer is settled by line bucket, story bucket, and date-level ROI.

## O/U Usage

The pitcher-batter matchup kernel should feed totals like this:

1. Classify story path:
   - starter hold under
   - whiff suppression under
   - traffic without damage strand
   - first-cycle traffic over
   - starter-collapse over
   - pitch-mix damage over
   - bridge-over after starter
   - live-only fork
2. Decide market lane:
   - full-game total
   - F5 total
   - first-inning total
   - team total
   - pass/live-only
3. Only then calculate price/EV.

## First Backtest Target

Use May 31 as the stress slate, but do not train on it.

- Train/search through 2026-05-30.
- Replay May 31.
- Required report fields:
  - story-bucket accuracy
  - F5 O/U side accuracy
  - full-game O/U side accuracy
  - which misses were pitcher-batter matchup misses
  - which misses were bullpen/fielding/environment misses
  - absolute error as secondary context only

The goal is not lower MAE. The goal is better side correctness and better "why" classification.

## Current Commands

Derive pitch-event kernel rows:

```bash
npm run data:derive:mlb-pitcher-batter-kernel -- --through-date YYYY-MM-DD
```

Daily rebuild:

```bash
npm run data:derive:mlb-pitcher-batter-kernel -- --as-of-date YYYY-MM-DD
```

Build the current coverage/signal report:

```bash
npm run data:research:mlb-m2-pitcher-batter-kernel -- --start 2026-05-23 --end YYYY-MM-DD
```

Current artifacts:

- `models/mlb/cartridges/MLB-M2/research/pitcher_batter_kernel_report.py`
- `models/mlb/cartridges/MLB-M2/reports/pitcher-batter-kernel-report-2026-05-23-to-2026-05-31.md`
- `data-private/reports/mlb-m2-pitcher-batter-kernel-report-2026-05-23-to-2026-05-31.json`

Current first-pass read:

- Full backfill through May 31: 135,153 pitcher pitch-mix rows, 206,697 hitter response rows, 17,655 matchup rows.
- May 23-May 31 report range: 22,146 pitch-mix rows, 34,679 hitter-response rows, 2,709 matchup rows.
- High collapse-trigger top quartile: 52.5% game F5 over 4 rate.
- High damage-fit top quartile: 42.6% game F5 over 4 rate.
- High command-stress top quartile: 45.9% game F5 over 4 rate.

Interpretation: the substrate is real and pitch-event backed, but the first scores are compressed. Do not promote this layer until the kernel is calibrated by date, line, starter/hitter sample, and actual F5/full total buckets.

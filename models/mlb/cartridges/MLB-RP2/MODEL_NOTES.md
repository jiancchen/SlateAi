# MLB-RP2 Relief Pitcher Projection Addendum

MLB-RP2 is the replacement candidate for MLB-RP36.

RP36 mostly exported a first-up reliever shadow board. RP2 keeps the first-up cluster, but its primary job is team-side relief projection:

- expected relief runs allowed
- expected relief outs
- expected relievers used
- bridge stress
- leverage availability
- first-up lead and top cluster
- first-up trend/rest/leash context

## Inputs

- legacy typed bullpen usage snapshots through `mlb_bullpen_usage`
- legacy bullpen shape snapshots through `mlb_team_bullpen_shape_daily`
- settled reliever appearances through `mlb_pitcher_appearances`
- scheduled starters through `starting_pitchers`
- starter leash and rolling form through `mlb_starter_leash_profiles` and `mlb_starting_pitcher_rolling_form`
- FanGraphs/RosterResource bullpen depth, usage, and team RP rankings
- current lineup handedness from typed `lineups` / `lineup_slots`
- prior pitcher outcomes by batter side from typed `plate_appearances`

## First-Up Scoring

The first-up layer is no longer a role-only freshness sort. Candidate ranking starts from the legacy first-up likelihood or FanGraphs role/freshness score, then applies:

- yesterday relief workload rest penalties: 20+ pitches, 30+ pitches, and 40+ pitches
- recent team first-up trend context over the prior 10 team games
- same-starter first-reliever history when available
- starter leash role context, used mainly when no recent first-up trend exists
- small lineup-handedness fit adjustment: a fresh reliever gets a capped boost when the opponent lineup leans toward the batter side he has suppressed better; he can get a smaller penalty when the pocket leans away from his better split

The pitch-count rest penalty is calibrated from backtest results. It is strong enough to push down a likely reliever after a 20-40+ pitch outing, but it does not hard-zero the pitcher because depleted bullpens still reuse arms.

## Point-In-Time Rule

Every output row stores `feature_snapshot_json`. Backtests and daily materialization use the same builder, so postgame warehouse drift can be detected instead of silently changing the model.

## Backtest

Run:

```bash
npm run data:backtest:mlb-rp2 -- --start-date 2026-03-27 --end-date 2026-06-05
```

The backtest grades:

- relief-runs MAE against a rolling team baseline
- relief-outs MAE
- relievers-used MAE
- first-up exact / top-2 / top-3 coverage

Current `MLB-RP2.2026-06-12.v3` backtest over 2026-03-27 to 2026-06-05:

- relief-runs MAE: 1.713 vs 1.764 baseline
- relief-runs MAE lift: 2.9%
- first-up exact: 19.4%
- first-up top-2: 35.0%
- first-up top-3: 47.5%

## Promotion Rule

RP2 can replace RP36 in M2 production only after:

- at least 300 usable team-side samples
- relief-runs MAE beats the rolling team baseline
- first-up top-3 coverage is at least 50%

Until that happens, RP2 stays a shadow addendum.

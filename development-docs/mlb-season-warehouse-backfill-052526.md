# MLB Season Warehouse Backfill — May 25, 2026

This pass fixed the biggest structural data-depth problem in the MLB warehouse: the raw daily archive already went back to Opening Day, but the event-level warehouse tables were still effectively May-only.

## What Changed

- Added a local raw replay command to [pipeline/mlb/warehouse/mlb_warehouse.py](/Users/jcchen/Documents/New%20project/pipeline/mlb/warehouse/mlb_warehouse.py):
  - `replay-mlb-range-from-raw`
- Added a package shortcut in [package.json](/Users/jcchen/Documents/New%20project/package.json):
  - `npm run data:replay:mlb-raw-range -- --start-date 2026-03-26 --end-date 2026-05-25`
- Refactored MLB game ingestion so the same parsing logic can be used for:
  - live network ingest
  - local raw archive replay
- Added secondary SQLite indexes across the high-volume MLB tables so whole-season rebuilds are not dominated by full-table scans.
- Fixed a doubleheader / duplicate-date issue in `mlb_hitter_state_snapshots` by changing the insert path to an upsert on `(as_of_date, player_id)`.

## Backfill Coverage

### Before

- `mlb_pitch_events`: `2026-05-09` through `2026-05-25`
- `mlb_plate_appearances`: `2026-05-09` through `2026-05-25`
- `mlb_hitter_state_snapshots`: `2026-05-10` through `2026-05-25`
- `mlb_pitcher_first_inning_profiles_daily`: `2026-05-14` through `2026-05-25`

### After

- `mlb_pitch_events`: `2026-03-26` through `2026-05-25` (`272,612` rows)
- `mlb_plate_appearances`: `2026-03-26` through `2026-05-25` (`60,157` rows)
- `mlb_pitcher_appearances`: `2026-03-26` through `2026-05-25` (`6,723` rows)
- `mlb_player_game_batting`: `2026-03-26` through `2026-05-25` (`16,168` rows)
- `mlb_starting_pitcher_game_logs`: `2026-03-26` through `2026-05-25` (`1,590` rows)
- `mlb_team_story_priors`: `2026-03-27` through `2026-05-25` (`3,092` rows)
- `mlb_hitter_state_snapshots`: `2026-03-27` through `2026-05-25` (`21,781` rows)
- `mlb_team_state_snapshots`: `2026-03-27` through `2026-05-25` (`1,574` rows)
- `mlb_team_first_inning_profiles_daily`: `2026-03-27` through `2026-05-25` (`4,722` rows)
- `mlb_pitcher_first_inning_profiles_daily`: `2026-03-31` through `2026-05-25` (`2,670` rows)
- `mlb_team_mistake_shape_daily`: `2026-03-27` through `2026-05-25` (`4,722` rows)
- `mlb_lineup_conversion_shape_daily`: `2026-03-27` through `2026-05-25` (`4,722` rows)
- `mlb_pitcher_mistake_shape_daily`: `2026-03-31` through `2026-05-25` (`2,670` rows)

## What Is Still Not Fully Season-Backfilled

The slow Tier 3 tables were not fully rebuilt in this pass:

- `mlb_reliever_first_batter_command_profiles`: still `2026-05-13` through `2026-05-25`
- `mlb_starter_third_time_penalty_profiles`: still `2026-05-14` through `2026-05-25`

That means:

- the season-wide opponent-quality and hitter-state context is much better now
- the season-wide reliever first-batter / third-time-through layer still needs one more indexed rebuild pass

## Training Impact

After the full-season warehouse backfill and season-table refresh, the forest baseline was rerun in [development-docs/mlb-market-ml-training-052526.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-market-ml-training-052526.md).

Results:

- `Moneyline`
  - `0.6974` log loss
  - `0.2520` Brier
  - `52.73%` walk-forward accuracy
  - threshold `127-123` on `250` plays (`50.8%`)
  - still not promotable
- `First 5`
  - `0.7019` log loss
  - `0.2541` Brier
  - `48.38%` walk-forward accuracy
  - threshold `110-98` on `208` plays (`52.9%`)
  - still not promotable
- `Totals`
  - unchanged healthiest lane
  - threshold `31-14` on `45` plays (`68.9%`)
  - still promotable
- `First inning`
  - `0.7067` log loss
  - `0.2551` Brier
  - `54.47%` walk-forward accuracy
  - threshold `22-15` on `37` plays (`59.5%`)
  - still not promotable

## Honest Read

The backfill was worth doing.

It fixed a real data-depth problem:

- early-season pitch and PA history now exists in the warehouse
- hitter-state and first-inning features are no longer built on a shallow May-only slice
- future feature work on opponent quality and pitch-type resistance now has real season coverage

But it also told us something important:

- more rows alone are not rescuing moneyline
- more rows alone are not rescuing first-five
- first-inning improves only marginally
- totals are still the only clearly healthy lane

So the next edge likely comes from:

- better opponent-strength framing
- better pitch-type matchup framing
- pass-first market gating
- better side targets than plain winner labels

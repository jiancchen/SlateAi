# Action 1: MLB Warehouse And Feature Store Foundation

## Goal

Build the MLB data foundation required to rank, backtest, and eventually train toward:

1. `First 5 innings winner`
2. `Spread / run line`
3. `Moneyline`
4. `Home runs`

The first priority is not UI polish or narrative analysis. It is a deterministic, queryable warehouse that can produce stable labels and rolling form inputs without asking the LLM to repeatedly re-parse raw feeds.

## Why This Comes First

- The current slate files are good for shipping boards, but they are not enough for training or repeatable grading.
- First-5 and full-game markets need inning-aware labels, starter-aware logs, and rolling team/starter state.
- Home-run modeling should come after the game-shape foundation because it is noisier and much more feature-sensitive.

## Scope

### Data we need in the warehouse

- raw MLB schedule snapshots
- raw MLB `feed/live` snapshots
- slim extracted per-game summary artifacts
- normalized per-team game stats
- normalized first-5 and full-game outcomes
- starting pitcher game logs
- rolling team form
- rolling starter form
- Statcast home-run leaderboard snapshots
- prediction snapshots and backtests

### Required labels

- first-5 winner
- first-5 run differential
- full-game winner
- full-game run differential
- total runs through 5
- total runs final
- bullpen run differential

## Acceptance Criteria

- A single command can ingest one MLB date from official feeds.
- The raw feed can stay on disk without being loaded into the LLM context.
- The warehouse stores first-5 and full-game labels for each MLB game.
- The warehouse stores one row per starting pitcher with game-level performance.
- The warehouse stores rolling team/starter form keyed by `as_of_date`.
- We can query historical first-5 outcomes without touching the raw JSON blobs.

## Risks

- MLB feed shape can drift slightly on player objects or boxscore stats.
- Historical starter identification can fail if a game starts with an opener or the feed does not mark `gamesStarted` cleanly.
- Market labels still need market-line ingestion later for true spread-cover grading.

## Current Status

- Raw feeds are now compressed and slim summaries are extracted.
- First-5 and full-game labels are being stored.
- Starter game logs are being stored.
- Rolling team/starter form tables are now part of the warehouse.

## Next Steps

1. Backfill the warehouse for the stored slate dates.
2. Add lineup, bullpen usage, and weather ingestion.
3. Add market snapshot ingestion for run line, moneyline, totals, and later first-5 prices.
4. Export a training-ready table for first-5 and full-game targets.

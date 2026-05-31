# MLB Historical Odds + Pitcher K Props Ingestion — May 26, 2026

If we want real over/under accuracy tracking, we need two separate things:

1. the actual game result
2. the historical market line we would have bet into

For starting-pitcher strikeout O/U, we need the same pattern:

1. the historical strikeout prop line
2. the starter’s actual strikeout total

We already have the result side in the warehouse:

- game totals via `mlb_game_outcomes`
- starter strikeouts via `mlb_starting_pitcher_game_logs`

The missing piece was the historical market line archive.

## Source Choice

The cleanest current source for this project is **The Odds API** because it documents both:

- historical featured markets (`h2h`, `spreads`, `totals`)
- historical event-level additional markets, including MLB player props such as `pitcher_strikeouts`

Useful source docs:

- historical odds snapshots: [The Odds API historical odds docs](https://the-odds-api.com/historical-odds-data/)
- historical event-odds pattern: [The Odds API v4 guide](https://the-odds-api.com/liveapi/guides/v4/)
- MLB prop market keys: [The Odds API betting markets list](https://the-odds-api.com/sports-odds-data/betting-markets.html)

Important notes from the docs:

- historical featured-market snapshots are available from 2020
- additional historical markets such as player props are available from 2023-05-03
- MLB includes `pitcher_strikeouts` as a supported market key
- historical access is only on paid plans

## What Was Added

New fetcher:

- [pipeline/mlb/fetchers/fetch_historical_mlb_odds.py](/Users/jcchen/Documents/New%20project/pipeline/mlb/fetchers/fetch_historical_mlb_odds.py)

New package script:

- `npm run data:fetch:mlb-historical-odds`

New warehouse tables created by that fetcher:

- `mlb_featured_market_odds_snapshots`
- `mlb_player_prop_odds_snapshots`

These tables store raw bookmaker rows keyed by:

- snapshot timestamp
- game / event
- bookmaker
- market
- outcome
- line / point

## Current Fetch Strategy

The script uses the local `mlb_games` warehouse as the schedule backbone.

For each MLB game in a date range:

1. take the scheduled first-pitch time
2. subtract a configurable lead window, default `15` minutes
3. fetch the historical featured-market snapshot nearest to that timestamp
4. map the returned event back to `game_pk`
5. optionally fetch historical event-level props for `pitcher_strikeouts`

That gives us a canonical **pregame snapshot** instead of trying to reconstruct every intraday line tick.

## Why This Matters

This lets us grade:

- full-game totals against actual totals
- first-five totals if we later add those market pulls
- starting-pitcher strikeout props against actual starter Ks

without cheating by using today’s line, a guessed line, or a line scraped after the game started.

## Practical Constraint

This is not a free historical workflow.

The Odds API historical featured-market endpoint is one thing.
The pitcher prop side is heavier because:

- props are event-level, one game at a time
- historical props are an additional market class
- request/credit usage is meaningfully higher than just loading game totals

So the right rollout is:

1. backfill **featured totals** first
2. validate totals accuracy work
3. then backfill **pitcher_strikeouts** for selected windows or dates
4. only then decide if a full-season prop pull is worth the credit bill

## Suggested Rollout

### Phase 1

Backfill MLB featured markets for:

- `totals`
- optionally `h2h` and `spreads` at the same time

Focus:

- build `over/under` accuracy archive
- compare our totals model to real market lines

### Phase 2

Backfill event props for:

- `pitcher_strikeouts`

Focus:

- starter K O/U model
- identify which books and line formats are most stable

### Phase 3

Add canonical grading layers:

- closing-ish pregame line
- bookmaker subset consensus
- best-price and consensus comparisons

## Open Questions

1. Which books do we actually care about most?
   Suggested starter set:
   - `draftkings`
   - `fanduel`
   - `betmgm`
   - `caesars`

2. What is our canonical line?
   Best current answer:
   - snapshot nearest to `15` minutes before first pitch

3. Do we want:
   - single-book grading
   - market-consensus grading
   - best-price grading

We probably want all three eventually, but consensus is the cleanest first warehouse metric.

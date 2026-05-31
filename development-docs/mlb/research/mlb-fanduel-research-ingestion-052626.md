# MLB FanDuel Research Ingestion — May 26, 2026

We now have a second historical betting-line source in the warehouse that does **not** require a paid odds API:

- public FanDuel Research pages

New fetcher:

- [pipeline/mlb/fetchers/fetch_fanduel_research_mlb.py](/Users/jcchen/Documents/New%20project/pipeline/mlb/fetchers/fetch_fanduel_research_mlb.py)

New package script:

- `npm run data:fetch:fanduel-research-mlb`

## What It Pulls

### 1. Daily pitcher strikeout prop pages

URL shape:

- `https://www.fanduel.com/research/mlb-strikeout-prop-odds-5-24-2026`

These pages contain structured bullet rows like:

- pitcher name
- strikeout line
- over price
- under price
- current-season strikeouts per game
- current-season appearances

Those rows are stored in:

- `mlb_player_prop_odds_snapshots`

with:

- `bookmaker_key = "fanduel_research"`
- `market_key = "pitcher_strikeouts"`

### 2. Daily MLB betting odds pages

URL shape:

- `https://www.fanduel.com/research/mlb-betting-odds-05-24-2026`

Important quirk:

- some early-season pages use mixed padding like `mlb-betting-odds-04-1-2026`
- the ingester now tries multiple slug variants automatically

These pages reliably expose:

- away/home matchup
- moneyline for each team

Those rows are stored in:

- `mlb_featured_market_odds_snapshots`

with:

- `bookmaker_key = "fanduel_research"`
- `market_key = "h2h"`

## Why This Source Is Useful

The FanDuel Research pages are public, stable, and easy to replay by date.

That gives us:

- historical pitcher strikeout O/U lines
- historical moneylines
- raw article snapshots saved locally under `data-private/raw/odds/fanduel-research/mlb`

without depending on an external paid plan.

## Important Caveat

The article text sometimes has messy labels:

- duplicate starter bullets
- occasional wrong team labels in the parentheses

Because of that, the ingester does **not** trust the article label blindly.

For strikeout props it resolves rows by:

- `game_date`
- normalized `pitcher_name`
- actual `mlb_starting_pitcher_game_logs`

For moneylines it resolves rows by:

- `game_date`
- parsed `away_team at home_team`
- local `mlb_games`

That keeps `game_pk` mapping stable even when the article copy is noisy.

## Current Scope

This source currently gives us:

- pitcher strikeout props
- moneylines

It does **not yet** give us a clean full-game total line from the daily article family we tested.

If we want:

- full-game totals
- run lines
- first-five lines

we may need either:

- another FanDuel Research page family
- game-specific matchup article pages
- or the paid historical odds API path already added separately

## Suggested Usage

### Test run

```bash
npm run data:fetch:fanduel-research-mlb -- --start-date 2026-05-24 --end-date 2026-05-25
```

### Season backfill

```bash
npm run data:fetch:fanduel-research-mlb -- --start-date 2026-03-26 --end-date 2026-05-25
```

## Why This Matters For Modeling

This finally gives us a real historical warehouse path for:

- starting-pitcher strikeout O/U grading
- moneyline price-vs-result comparisons

That means we can stop guessing or hand-copying those lines and start training on:

- actual posted strikeout lines
- actual market price
- actual result

which is the minimum requirement for a serious K-prop model.

# Sports Trading Board

Local Svelte/Vite dashboard for daily `MLB` and `Tennis` boards, plus archived `NBA`, `WNBA`, and `UFC` slates, with structured matchup analysis and a parlay builder.

## Daily Workflow

- Store each slate in a dated file such as `src/lib/day-2026-05-14.js`.
- Register that slate in `src/lib/slate-days.js`.
- Keep recurring source links in `daily-games-external.md`.
- Add new structured inputs or matchup overrides in `src/lib/structured-inputs.js`.
- Store repeatable raw feeds and backtests in the local warehouse under `data/`.

## Key Files

- `src/App.svelte`
  Main trading dashboard UI.
- `src/lib/sports-model.js`
  Analysis engine, ranking logic, and parlay math.
- `src/lib/structured-inputs.js`
  Local overrides for archived playoff series, tennis match flags, and custom signals.
- `src/lib/day-2026-05-14.js`
  Example current-day slate with MLB and WNBA data.
- `src/lib/day-2026-05-21.js`
  First dedicated tennis slate with WTA Strasbourg, ATP Hamburg, ATP Geneva, and Roland-Garros qualifying.
- `daily-games-external.md`
  Known-good source registry for daily ingest.
- `scripts/mlb_warehouse.py`
  Local SQLite warehouse and ingest/grading CLI for MLB game outcomes, rolling form, bullpen workload, likely relievers, and home-run backtests.
- `scripts/export-home-run-predictions.mjs`
  Statcast-driven HR prediction exporter for a stored day file.
- `scripts/export-mlb-side-predictions.mjs`
  Export stored MLB side picks with starter, bullpen, and hit-edge indicators for retrospective grading.
- `scripts/mlb_side_backtest.py`
  Import, grade, and report MLB side predictions against first-5 and full-game outcomes.
- `data/README.md`
  Local data layout and warehouse workflow.
- `tickets/action_1.md`
  MLB warehouse and first-5/spread/moneyline foundation plan.
- `tickets/action_2.md`
  Modeling roadmap from first-5 through home runs.

## Recurring Data Sources

### MLB

- [MLB probable pitchers](https://www.mlb.com/probable-pitchers)
- [MLB schedule API](https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-14&hydrate=probablePitcher,team)
- [MLB standings API](https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason)
- [TeamRankings hits per game](https://www.teamrankings.com/mlb/stat/hits-per-game)
- [Covers bullpen ERA](https://www.covers.com/sport/baseball/mlb/statistics/team-bullpenera/2026)
- [Statcast park factors](https://baseballsavant.mlb.com/leaderboard/statcast-park-factors)
- [Baseball Savant league hitting](https://baseballsavant.mlb.com/league)
- [MLB starting lineups](https://www.mlb.com/starting-lineups)
- [ScoresAndOdds MLB board](https://www.scoresandodds.com/mlb)

### Tennis

- [Oddschecker tennis lines](https://www.oddschecker.com/us/tennis)
- [TennisStats match board](https://tennisstats.com/)
- [Tennis Abstract player page example](https://www.tennisabstract.com/cgi-bin/player.cgi?p=126205/Tommy-Paul)
- [ATP Hamburg schedule](https://www.bbc.co.uk/sport/tennis/hamburg-european-open/scores-and-schedule/2026-05-21)
- [ATP Geneva schedule](https://www.bbc.co.uk/sport/tennis/atp-geneva-open/mens-singles/scores-and-schedule/2026-05-21)
- [WTA Strasbourg order of play PDF](https://wtafiles.wtatennis.com/pdf/draws/2026/406/OP.pdf)
- [Roland-Garros order of play](https://www.rolandgarros.com/en-us/order-of-play?annexeCourt=all&competition=all&country=all&date=2026-05-21&favoriteFilter=false&principalCourt=all&year=2026)

### NBA

- [NBA playoffs schedule](https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true)
- [ScoresAndOdds NBA board](https://www.scoresandodds.com/nba)

### WNBA

- [WNBA home page](https://www.wnba.com/)
- [ScoresAndOdds WNBA board](https://www.scoresandodds.com/wnba)
- [RotoWire WNBA opponent averages](https://www.rotowire.com/wnba/opp-avg.php)
- [LineStar WNBA fantasy defense](https://www.linestarapp.com/FantasyDefense/Sport/WNBA/Site/DraftKings)

### UFC

- [UFC event cards](https://www.ufc.com/)
- [Covers UFC odds](https://www.covers.com/sport/mma/ufc/odds)

## Development

```bash
npm install
npm run dev
npm run build
```

## Warehouse Workflow

```bash
npm run data:init
npm run data:prep:mlb-day -- --date 2026-05-16 --lookback-days 3
npm run data:list:probables -- --date 2026-05-16
npm run data:export:mlb-lineups -- --date 2026-05-16
npm run data:export:mlb-batting-impact
npm run data:ingest:mlb-range -- --start-date 2026-05-10 --end-date 2026-05-15
npm run data:derive:mlb -- --through-date 2026-05-15
npm run data:list:bullpen -- --date 2026-05-16
npm run data:list:relievers -- --date 2026-05-16
npm run data:export:hr -- --date 2026-05-15
npm run data:ingest:mlb-day -- --date 2026-05-15
npm run data:ingest:statcast-hr -- --date 2026-05-15 --season 2026
npm run data:import:hr -- --file data/predictions/mlb-home-runs/2026-05-15-statcast-prototype.json
npm run data:grade:hr -- --date 2026-05-15 --model-name statcast-hr-prototype-v1
npm run data:list:hr -- --date 2026-05-15
npm run data:list:first5 -- --date 2026-05-15
npm run data:export:mlb-sides -- --start-date 2026-05-10 --end-date 2026-05-15
npm run data:import:mlb-sides -- --file data/predictions/mlb-sides/2026-05-10-to-2026-05-15-board-v2.json
npm run data:grade:mlb-sides -- --model-name board-moneyline-v2
npm run data:report:mlb-sides -- --model-name board-moneyline-v2 --train-end 2026-05-12 --verify-start 2026-05-13 --verify-end 2026-05-15 --out data/reports/mlb-side-backtest-2026-05-10-to-2026-05-15.md
```

This keeps prediction generation, official MLB results, first-5/full-game labels, rolling form, Statcast season context, and both home-run and side-pick backtests in a local store instead of pushing everything through the app or the model layer each day.

## Daily MLB Prep

For a live MLB prediction day, the warehouse now has a concrete preflight:

```bash
npm run data:prep:mlb-day -- --date YYYY-MM-DD --lookback-days 3
npm run data:list:probables -- --date YYYY-MM-DD
npm run data:generate:mlb-day -- --date YYYY-MM-DD
npm run data:export:mlb-lineups -- --date YYYY-MM-DD
npm run data:export:mlb-batting-impact
npm run data:list:relievers -- --date YYYY-MM-DD
```

That pulls the target day plus the trailing workload window, refreshes rolling form, gives us the official probable-starter board for the date, stores bullpen last-3-day usage, estimates the likely first two relievers for each scheduled team, and can export a posted-lineup board with player recent form plus handedness-fit grades once official batting orders land.

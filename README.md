# Sports Trading Board

Local Svelte/Vite dashboard for daily `MLB`, `NBA`, `WNBA`, and `UFC` boards with structured matchup analysis, series context, and a parlay builder.

## Daily Workflow

- Store each slate in a dated file such as `src/lib/day-2026-05-14.js`.
- Register that slate in `src/lib/slate-days.js`.
- Keep recurring source links in `daily-games-external.md`.
- Add new structured inputs or matchup overrides in `src/lib/structured-inputs.js`.

## Key Files

- `src/App.svelte`
  Main trading dashboard UI.
- `src/lib/sports-model.js`
  Analysis engine, ranking logic, and parlay math.
- `src/lib/structured-inputs.js`
  Local overrides for playoff series, WNBA reads, and custom signals.
- `src/lib/day-2026-05-14.js`
  Example current-day slate with MLB and WNBA data.
- `daily-games-external.md`
  Known-good source registry for daily ingest.

## Recurring Data Sources

### MLB

- [MLB probable pitchers](https://www.mlb.com/probable-pitchers)
- [MLB schedule API](https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-14&hydrate=probablePitcher,team)
- [MLB standings API](https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason)
- [TeamRankings hits per game](https://www.teamrankings.com/mlb/stat/hits-per-game)
- [Covers bullpen ERA](https://www.covers.com/sport/baseball/mlb/statistics/team-bullpenera/2026)
- [Statcast park factors](https://baseballsavant.mlb.com/leaderboard/statcast-park-factors)
- [Baseball Savant league hitting](https://baseballsavant.mlb.com/league)
- [ScoresAndOdds MLB board](https://www.scoresandodds.com/mlb)

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

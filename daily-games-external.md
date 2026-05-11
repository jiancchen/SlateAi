# Daily Games External

This file is the known-good starting list for daily web pulls.

The rule:
1. Start here before doing a wide web search.
2. Prefer links that already worked for schedule, pitchers, odds, box scores, and event cards.
3. When a link works well, keep it here.
4. When a link changes layout or stops being useful, note that under the daily log.

## Known Working Links

### MLB
- Schedule by date:
  [https://www.mlb.com/schedule/2026-05-09](https://www.mlb.com/schedule/2026-05-09)
  Working pattern: swap the trailing date to the next slate day as `YYYY-MM-DD`.
- Structured schedule pull:
  [https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-10&hydrate=probablePitcher,team](https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-10&hydrate=probablePitcher,team)
  This was the cleanest structured source for matchup times, teams, and probable pitchers.
- Pitcher season line pattern:
  `https://statsapi.mlb.com/api/v1/people/{player_id}?hydrate=stats(group=[pitching],type=[season],season=2026)`
  Use after the schedule pull when you need handedness, record, ERA, and strikeouts for the listed probable starters.
- Odds board:
  [https://www.covers.com/sport/baseball/mlb/odds](https://www.covers.com/sport/baseball/mlb/odds)
  Use for moneyline, run line, and total snapshots.
  The May 10 test run cleanly exposed opening moneyline rows in the accessible HTML.
## Probable MLB Pitchers
https://www.mlb.com/probable-pitchers

## Probable Pitchers Stats
https://baseballsavant.mlb.com/probable-pitchers

## MLB Park Factors
https://baseballsavant.mlb.com/leaderboard/statcast-park-factors
Use this for field-level run environment context, including how much a park boosts or suppresses offense and certain batted-ball outcomes.

## Daily MLB Matchups, Weather, and Park Context
https://www.ballparkpal.com/Matchups.php
Use this for daily game-level context that static park-factor pages do not fully capture, especially weather-adjusted run environment, park interaction, and matchup framing.
This is one of the best inputs for deciding when a park should matter more or less on a specific day rather than only in the long-run average.
If a direct fetch tool gets blocked, start with this link in a browser session anyway because it is still a strong manual-review source.

## MLB Standings
https://www.espn.com/mlb/standings
Use this as a fast visual standings check.

## MLB Standings API
https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason
Use this for structured division rank, games back, run differential, and streak context when the model needs standings data it can parse directly.

## MLB Team Offense
https://www.teamrankings.com/mlb/stat/hits-per-game
Use this for team-level hit production and recent contact trend, especially as a secondary offense input next to market, starters, and confirmed lineups.

## MLB Bullpen Quality
https://www.covers.com/sport/baseball/mlb/statistics/team-bullpenera/2026
Use this for late-inning stability, bullpen leak risk, and underdog paths that survive once the starters leave.

### NBA
- Daily playoff schedule:
  [https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true](https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true)
  This was the cleanest official source for same-day playoff matchups and series score context.
- Live odds board:
  [https://www.scoresandodds.com/nba](https://www.scoresandodds.com/nba)
  This exposed the current spread, total, and moneyline for the May 10 playoff games in accessible HTML.
- Odds board:
  [https://www.covers.com/sport/basketball/nba/odds](https://www.covers.com/sport/basketball/nba/odds)
- Game summary example:
  [https://www.nba.com/game/okc-vs-lal-0042500223](https://www.nba.com/game/okc-vs-lal-0042500223)
- Box score examples:
  [https://www.nba.com/game/lal-vs-okc-0042500221/box-score](https://www.nba.com/game/lal-vs-okc-0042500221/box-score)
  [https://www.nba.com/game/lal-vs-okc-0042500222/box-score](https://www.nba.com/game/lal-vs-okc-0042500222/box-score)
- Official PDF box score pattern:
  `https://statsdmz.nba.com/pdfs/YYYYMMDD/YYYYMMDD_MATCHUP.pdf`
  Working examples:
  `https://statsdmz.nba.com/pdfs/20260504/20260504_PHINYK.pdf`
  `https://statsdmz.nba.com/pdfs/20260508/20260508_SASMIN.pdf`
  These were the most reliable official box-score sources for extracting series game details and player lines.

## NBA GameLine Odds
https://www.espn.com/nba/odds

### WNBA
- Daily slate hub:
  [https://www.wnba.com/](https://www.wnba.com/)
  The May 10 home-page slate callout clearly confirmed the four-game board.
- Live odds board:
  [https://www.scoresandodds.com/wnba](https://www.scoresandodds.com/wnba)
  This exposed current spread, total, and moneyline rows in accessible HTML.
- Odds board:
  [https://www.covers.com/sport/basketball/wnba/odds](https://www.covers.com/sport/basketball/wnba/odds)
- Game summary example:
  [https://www.wnba.com/game/1022600006/CHI-vs-PDX](https://www.wnba.com/game/1022600006/CHI-vs-PDX)

### UFC
- Event card:
  [https://www.ufc.com/event/ufc-328?page=1](https://www.ufc.com/event/ufc-328?page=1)
- Fight week guide:
  [https://www.ufc.com/ufc-328-fight-week-guide](https://www.ufc.com/ufc-328-fight-week-guide)
- Odds board:
  [https://www.covers.com/sport/mma/ufc/odds](https://www.covers.com/sport/mma/ufc/odds)

## User-Provided Links That Worked

- Add direct links here whenever you send a page that was especially clean or fast to parse.
- Keep the exact page, not just the homepage, when possible.


## Daily Pull Workflow

For each new slate day, gather data in this order:
1. Schedule and start times
2. Probable pitchers or expected starters
3. Odds snapshot
4. Context notes like injuries, travel, or lineup changes
5. Final results after the day closes

## Daily Log Template

### 2026-05-10
- Schedule links used:
  https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-10&hydrate=probablePitcher,team
  https://www.mlb.com/probable-pitchers
  https://baseballsavant.mlb.com/probable-pitchers
- Pitcher or lineup links used:
  `https://statsapi.mlb.com/api/v1/people/{player_id}?hydrate=stats(group=[pitching],type=[season],season=2026)`
- Standings links used:
  https://www.espn.com/mlb/standings
  https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason
- Park factor links used:
  https://baseballsavant.mlb.com/leaderboard/statcast-park-factors
  https://www.ballparkpal.com/Matchups.php
- Odds links used:
  https://www.covers.com/sport/baseball/mlb/odds
  https://www.scoresandodds.com/nba
  https://www.scoresandodds.com/wnba
- Box score or result links used:
  https://statsdmz.nba.com/pdfs/20260504/20260504_PHINYK.pdf
  https://statsdmz.nba.com/pdfs/20260506/20260506_PHINYK.pdf
  https://statsdmz.nba.com/pdfs/20260508/20260508_NYKPHI.pdf
  https://statsdmz.nba.com/pdfs/20260504/20260504_MINSAS.pdf
  https://statsdmz.nba.com/pdfs/20260506/20260506_MINSAS.pdf
  https://statsdmz.nba.com/pdfs/20260508/20260508_SASMIN.pdf
- User links that worked:
- Pages that failed or changed:
- Notes for tomorrow:
  The official MLB schedule API was the cleanest structured pull.
  Covers opening moneylines parsed cleanly.
  Ballpark Pal is a strong daily context source for weather-adjusted matchup environment even when static park-factor data already exists.
  ScoresAndOdds gave the cleanest accessible current board for NBA and WNBA.
  Official NBA scorer PDFs were the cleanest way to pull reliable playoff box-score detail.
  Run line and total still need a second parser pass before they are ready for auto-ingest.

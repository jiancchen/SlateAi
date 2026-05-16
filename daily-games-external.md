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
- Official game feed pattern:
  `https://statsapi.mlb.com/api/v1.1/game/{game_pk}/feed/live`
  Use this for the trailing 3-day bullpen workload pull, all pitcher appearances, inning-by-inning first-five context, and likely first-reliever estimates.
- Pitcher season line pattern:
  `https://statsapi.mlb.com/api/v1/people/{player_id}?hydrate=stats(group=[pitching],type=[season],season=2026)`
  Use after the schedule pull when you need handedness, record, ERA, and strikeouts for the listed probable starters.
- Odds board:
  [https://www.covers.com/sport/baseball/mlb/odds](https://www.covers.com/sport/baseball/mlb/odds)
  Use for moneyline, run line, and total snapshots.
  The May 10 test run cleanly exposed opening moneyline rows in the accessible HTML.
- Live odds board:
  [https://www.scoresandodds.com/mlb](https://www.scoresandodds.com/mlb)
  The May 11 pull exposed current moneyline, total, and run line rows in accessible HTML and was easier to work with for same-day MLB updates than the Covers page.
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

## MLB Team Contact Quality
https://baseballsavant.mlb.com/league
Use this for team-level Statcast hitting quality such as `BA`, `xBA`, `hard-hit %`, `barrel %`, and `xwOBA`.
This is the cleanest source so far for building projected hit edge and hit-efficiency context instead of leaning only on surface hits per game.

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
- Team defense and game-shape board:
  [https://www.linestarapp.com/FantasyDefense/Sport/WNBA/Site/DraftKings](https://www.linestarapp.com/FantasyDefense/Sport/WNBA/Site/DraftKings)
  This page embeds a parseable `vm.data` object with same-day `GameList`, moneylines, totals, and team offense and defense rankings.
- Opponent averages:
  [https://www.rotowire.com/wnba/opp-avg.php](https://www.rotowire.com/wnba/opp-avg.php)
  Use this for extra player-matchup context and defensive allowances.
  The table is more reliable as a browser or manual source than as a shell parser because it renders client-side.
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
3. Trailing 3-day `feed/live` window for bullpen workload and likely bridge relievers
4. Odds snapshot
5. Context notes like injuries, travel, or lineup changes
6. Final results after the day closes

### Daily MLB Prediction Prep

For an MLB prediction day, the minimum reliable pull is now:
1. `schedule + probable pitchers` for the target date from the MLB schedule API
2. `feed/live` for the previous 3 days plus the target date so bullpen usage and likely first 2 relievers can be derived
3. team offense / contact-quality context from TeamRankings + Baseball Savant
4. bullpen quality from Covers
5. current odds from ScoresAndOdds or Covers

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

### 2026-05-11
- Schedule links used:
  https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-11&hydrate=probablePitcher,team
  https://www.mlb.com/probable-pitchers
- Pitcher or lineup links used:
  `https://statsapi.mlb.com/api/v1/people/{player_id}?hydrate=stats(group=[pitching],type=[season],season=2026)`
  https://www.ballparkpal.com/Matchups.php
- Standings links used:
  https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason
- Park factor links used:
  https://baseballsavant.mlb.com/leaderboard/statcast-park-factors
  https://www.ballparkpal.com/Matchups.php
- Odds links used:
  https://www.scoresandodds.com/mlb
  https://www.scoresandodds.com/nba
- Box score or result links used:
  https://statsdmz.nba.com/pdfs/20260505/20260505_LALOKC_book.pdf
  https://statsdmz.nba.com/pdfs/20260507/20260507_LALOKC_book.pdf
  https://statsdmz.nba.com/pdfs/20260509/20260509_OKCLAL_book.pdf
  https://statsdmz.nba.com/pdfs/20260505/20260505_CLEDET_book.pdf
  https://statsdmz.nba.com/pdfs/20260507/20260507_CLEDET_book.pdf
  https://statsdmz.nba.com/pdfs/20260509/20260509_DETCLE_book.pdf
- User links that worked:
- Pages that failed or changed:
  MLB.com still listed the Angels probable starter as TBD on the morning refresh while the live market board was dealing Brent Suter.
- Notes for tomorrow:
  ScoresAndOdds is now a known-good current-board source for same-day MLB, not just NBA and WNBA.
  Official NBA scorer PDFs still gave the cleanest playoff series context and player lines.
  When the official probable-pitchers page and the live market board disagree, keep both and raise variance instead of forcing a fake certainty.

### 2026-05-12
- Schedule links used:
  https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-12&hydrate=probablePitcher,team
  https://www.mlb.com/probable-pitchers
- Pitcher or lineup links used:
  `https://statsapi.mlb.com/api/v1/people/{player_id}?hydrate=stats(group=[pitching],type=[season],season=2026)`
- Standings links used:
  https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason
- Park factor links used:
  https://baseballsavant.mlb.com/leaderboard/statcast-park-factors
- Odds links used:
  https://www.scoresandodds.com/mlb
  https://www.scoresandodds.com/nba
  https://www.scoresandodds.com/wnba
- Box score or result links used:
  https://statsdmz.nba.com/pdfs/20260504/20260504_MINSAS.pdf
  https://statsdmz.nba.com/pdfs/20260506/20260506_MINSAS.pdf
  https://statsdmz.nba.com/pdfs/20260508/20260508_SASMIN.pdf
  https://statsdmz.nba.com/pdfs/20260510/20260510_SASMIN_book.pdf
- User links that worked:
- Pages that failed or changed:
  https://www.ballparkpal.com/Matchups.php
  On the May 12 pull, the page redirected to a secure checkout wall instead of the matchup table, so lineup-vs-starter context could not be parsed cleanly.
- Notes for tomorrow:
  ScoresAndOdds still exposes the cleanest accessible current board across MLB, NBA, and WNBA.
  The MLB board parser should keep handling `even` prices as `+100`, because Yankees-Orioles exposed that on the total.
  When BallparkPal fails, degrade to standings, offense, bullpen, park, market, and starter context instead of inventing a lineup-fit signal.

### 2026-05-13
- Schedule links used:
  https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-13&hydrate=probablePitcher,team
  https://www.mlb.com/probable-pitchers
  https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true
- Pitcher or lineup links used:
  `https://statsapi.mlb.com/api/v1/people/{player_id}?hydrate=stats(group=[pitching],type=[season],season=2026)`
- Standings links used:
  https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason
- Park factor links used:
  https://baseballsavant.mlb.com/leaderboard/statcast-park-factors
- Odds links used:
  https://www.scoresandodds.com/mlb
  https://www.scoresandodds.com/nba
  https://www.scoresandodds.com/wnba
- Box score or result links used:
  https://statsdmz.nba.com/pdfs/20260505/20260505_CLEDET_book.pdf
  https://statsdmz.nba.com/pdfs/20260507/20260507_CLEDET_book.pdf
  https://statsdmz.nba.com/pdfs/20260509/20260509_DETCLE_book.pdf
  https://statsdmz.nba.com/pdfs/20260511/20260511_DETCLE_book.pdf
- User links that worked:
- Pages that failed or changed:
  https://www.ballparkpal.com/Matchups.php
  On the May 13 pull, the page still redirected to `/Checkout.php`, so the daily lineup-vs-starter layer stayed unavailable for a second straight slate.
- Notes for tomorrow:
  The official MLB schedule API exposed `In Progress` cleanly, which made it easy to store only the remaining actionable games instead of the whole day.
  ScoresAndOdds still gave the quickest accessible live board across MLB, NBA, and WNBA.
  If BallparkPal stays blocked, the next clean MLB upgrade should come from another lineup-context source rather than forcing stale inputs.

### 2026-05-14
- Schedule links used:
  https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-14&hydrate=probablePitcher,team
  https://www.mlb.com/probable-pitchers
- Pitcher or lineup links used:
  `https://statsapi.mlb.com/api/v1/people/{player_id}?hydrate=stats(group=[pitching],type=[season],season=2026)`
- Standings links used:
  https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason
- Offense and contact-quality links used:
  https://www.teamrankings.com/mlb/stat/hits-per-game
  https://baseballsavant.mlb.com/league
- Bullpen links used:
  https://www.covers.com/sport/baseball/mlb/statistics/team-bullpenera/2026
- Park factor links used:
  https://baseballsavant.mlb.com/leaderboard/statcast-park-factors
- Odds links used:
  https://www.scoresandodds.com/mlb
  https://www.scoresandodds.com/wnba
- WNBA matchup links used:
  https://www.linestarapp.com/FantasyDefense/Sport/WNBA/Site/DraftKings
  https://www.rotowire.com/wnba/opp-avg.php
- Box score or result links used:
  https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-13&hydrate=probablePitcher,team
  https://www.scoresandodds.com/nba?date=2026-05-13
  https://www.scoresandodds.com/wnba?date=2026-05-13
- User links that worked:
  https://baseballsavant.mlb.com/league
  https://www.linestarapp.com/FantasyDefense/Sport/WNBA/Site/DraftKings
  https://www.rotowire.com/wnba/opp-avg.php
- Pages that failed or changed:
- Notes for tomorrow:
  The Baseball Savant league page is now a known-good contact-quality source and should be part of the standard MLB ingest.
  TeamRankings exposed `2026`, `Last 3`, `Home`, and `Away` in the same table, which makes it much more efficient than using separate offense pages.
  Covers bullpen stats parsed cleanly enough to keep bullpen context in the same daily pass as offense and odds.
  LineStar is now a strong WNBA ingest source because it exposes the live moneyline, total, and team offense and defense ranks in a single embedded data object.
  RotoWire opponent averages is worth keeping in the stack for player-level matchup review, but it should be treated as a browser-first source because the table is rendered client-side.

### 2026-05-15
- Schedule links used:
  https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-15&hydrate=probablePitcher,team
  https://www.mlb.com/probable-pitchers
  https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true
- Pitcher or lineup links used:
  `https://statsapi.mlb.com/api/v1/people/{player_id}?hydrate=stats(group=[pitching],type=[season],season=2026)`
  `https://statsapi.mlb.com/api/v1/people/search?names=Chad%20Patrick`
- Standings links used:
  https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason
- Offense and contact-quality links used:
  https://www.teamrankings.com/mlb/stat/hits-per-game
  https://baseballsavant.mlb.com/league
- Bullpen links used:
  https://www.covers.com/sport/baseball/mlb/statistics/team-bullpenera/2026
- Park factor links used:
  https://baseballsavant.mlb.com/leaderboard/statcast-park-factors
- Odds links used:
  https://www.scoresandodds.com/mlb
  https://www.scoresandodds.com/nba
  https://www.scoresandodds.com/wnba
- WNBA matchup links used:
  https://www.linestarapp.com/FantasyDefense/Sport/WNBA/Site/DraftKings
  https://aces.wnba.com/roster
  https://sun.wnba.com/roster
  https://mystics.wnba.com/roster
  https://fever.wnba.com/roster
  https://tempo.wnba.com/roster
  https://sparks.wnba.com/roster
  https://sky.wnba.com/roster
  https://mercury.wnba.com/roster
- Box score or result links used:
  https://statsdmz.nba.com/pdfs/20260513/20260513_CLEDET_book.pdf
  https://statsdmz.nba.com/pdfs/20260512/20260512_MINSAS_book.pdf
- User links that worked:
  https://www.teamrankings.com/mlb/stat/hits-per-game
  https://www.covers.com/sport/baseball/mlb/statistics/team-bullpenera/2026
  https://baseballsavant.mlb.com/league
- Pages that failed or changed:
  The official Brewers probable starter was still `TBD` on the MLB feed while the live board had `Chad Patrick (R)`, so keep the discrepancy and raise variance instead of forcing false confidence.
- Notes for tomorrow:
  ScoresAndOdds still parses cleanly with a desktop browser user-agent and remains the fastest accessible same-day board across MLB, NBA, and WNBA.
  Official WNBA roster pages still expose current player production inside the rendered page payload, which makes them useful for same-day player-note refreshes.
  The official probable-pitchers feed can carry surprising or late-set starter names, so it is worth keeping both the official feed and the live board in view before hardening any MLB read.

# MLB Starter Profile Addendum Runbook

Use this when building or auditing the planned MLB-SP1 starter pitcher profile addendum.

SP1 is the starter or bulk-primary pitcher layer for M2. It should explain how today's pitcher profile changes ML, F5 ML, totals, team totals, YRFI/NRFI, pitcher expected lines, batter production, HR lanes, and game-story copy.

## Build Order

Run the starter profile addendum after lineups, pitcher sources, weather, and daily matchups are available:

```bash
npm run data:refresh:mlb-live -- --date YYYY-MM-DD
npm run data:warehouse:mlb-fic-weather -- --date YYYY-MM-DD
npm run data:warehouse:mlb-fic-daily-matchups -- --date YYYY-MM-DD
npm run data:warehouse:mlb-umpires -- --date YYYY-MM-DD
npm run data:audit:mlb-umpires -- --date YYYY-MM-DD
npm run data:build:mlb-env1 -- --date YYYY-MM-DD
npm run data:build:mlb-rp2 -- --date YYYY-MM-DD
# planned
npm run data:build:mlb-sp1 -- --date YYYY-MM-DD
npm run data:generate:mlb-day -- --date YYYY-MM-DD
```

Until `data:build:mlb-sp1` exists, use this runbook as the contract for implementation and audit.

## Required Sources

- MLB official schedule, probable pitchers, game feeds, and opener identity.
- Rotowire daily lineups for posted lineups and primary/bulk pitcher handling.
- ESPN pitcher splits for right/left allowed, day/night, home/away, month, opponent, stadium, and inning splits.
- ESPN hitter splits for posted batters against today's pitcher throwing hand.
- Baseball Savant pitcher pitch mix and hitter pitch-type response.
- FantasyInfoCentral Weather/HRForce, including hourly game-window persistence.
- FantasyInfoCentral Daily Matchups for same-day BvP context.
- StatMuse starter-vs-opponent year-by-year history.
- Existing M2 lineup kernel, ENV1, and RP2 outputs.

## Projection Pitcher Rule

Use Rotowire as the primary role source when it identifies a primary or bulk pitcher behind an opener.

- Projection pitcher: Rotowire primary/bulk arm.
- First-inning pitcher: MLB official opener when it differs.
- YRFI/NRFI: include opener first-inning stats plus the top-order matchup.
- Full-game, F5, totals, pitcher expected lines, and batter production: use the primary/bulk pitcher unless the role evidence says the opener is the true starter.

Always surface the disagreement on the game sheet.

## Pitcher Profile Checks

For each projection pitcher:

- Flag fewer than four starts.
- Flag relief/opening/bulk-primary role.
- Pull season ERA, WHIP, K, BB, HR, IP, starts, and outs/leash.
- Pull recent last 3/5 starts, with command and hard-contact trend.
- Pull pitcher allowed vs left/right batters.
- Pull day/night split when the game time bucket matters.
- Pull home/away and venue/stadium split when available.
- Pull pitch mix and classify the pitcher as fastball-heavy, spin-heavy, changeup/splitter-heavy, mixed, or unknown.
- Pull same-season and last-three-season opponent history.
- Keep older BvP context visible but context-only.

## Batter Matchup Checks

For each posted hitter:

- Use hitter split versus the projection pitcher's throwing hand.
- Use the pitcher's allowed split versus that hitter's effective side.
- Use Savant pitch-type response versus the pitcher's actual pitch mix.
- Blend with current hot/cold form before applying BvP.
- Apply BvP only when the sample is recent enough and at least 5 AB.
- Do not promote old BvP if the hitter is currently cold or if the source row is stale.

## Weather And HRForce Checks

HRForce must affect pitcher and batter expectations, not only HR props.

- HRForce < 1.4 or N/A: lower carry, but not automatic under.
- HRForce >= 1.4: HR/run environment support.
- HRForce >= 1.5: material carry. Tax fragile pitchers and lift supported batter production.
- HRForce >= 1.7: extreme carry. Strong YRFI/over tail warning; casual unders are blocked.
- Night/evening games: require game-window hourly persistence before using a high daily/current HRForce for promotion.
- If hourly carry fades, keep most of the boost in YRFI/F5 and haircut full-game/late totals.

## Side/Tail Audit

Before publishing, reconcile SP1 with the rest of the game:

- Does the full-game side also own projected runs, F5, late, and bridge?
- If not, is the better lane F5, live, YRFI, team total, or over?
- Does the side require its starter to suppress a lineup that has split, pitch-fit, repeat-opponent, and HRForce support?
- Does the total tail conflict with the side confidence?
- Is `52` a true watch score, or did a separated edge get incorrectly capped?

If side and tail disagree, demote the side or move the game to the cleaner lane.

## Shadow Backtest

Grade SP1 before promotion:

- YRFI/NRFI direction.
- F5 O/U and F5 side/tie direction.
- Full-game ML misses caused by starter profile.
- Pitcher hits, earned runs, walks, strikeouts, and outs.
- Batter hits, total bases, HR, and H+R+RBI movement.
- Repeat-opponent starts.
- Day/night split games.
- High-HRForce games, especially failed unders.

Do not promote SP1 until it improves at least one named lane without hurting the low-carry starter-duel bucket.

# MLB Daily Run Checklist

Use this every MLB slate day from the repository root.

The goal is not just to generate a board. The goal is to confirm:
- active games match the official schedule
- postponed games are removed
- probable pitchers are current
- lineups are as current as MLB has posted
- weather and park context are attached
- bridge-chain, HR, and non-HR prop layers were produced
- the prior settled MLB day is warehoused and graded before new model lessons are applied

## 0. Prior-Day Model Gate

Before starting a new MLB slate, close and grade the most recent finished slate.

```bash
npm run data:close:mlb-day -- --date PRIOR-YYYY-MM-DD
npm test
```

Required prior-day checks:
- `data-private/history/mlb-results-PRIOR-YYYY-MM-DD.jsonl` exists.
- `mlb_side_predictions` has one row per prior-day board pick for `board-moneyline-v1.1-sanity`.
- `mlb_side_backtests` has one graded row per prior-day board pick for `board-moneyline-v1.1-sanity`.
- the postmortem names the actual failure shape before any next-day model change is trusted.

If the side rows are missing, do not start the new slate. Fix closeout first.

## 1. Preflight

- Set the slate date.
- Open the source registry first:
  - [development-docs/mlb/runbooks/daily-games-external.md](/Users/jcchen/Documents/New%20project/development-docs/mlb/runbooks/daily-games-external.md:1)
- Check official probable pitchers:
  - [MLB probable pitchers](https://www.mlb.com/probable-pitchers)
- Check official starting lineups:
  - [MLB starting lineups](https://www.mlb.com/starting-lineups)

Commands:

```bash
npm run data:list:probables -- --date YYYY-MM-DD
```

Questions to answer before refresh:
- Did MLB change any probable starters?
- Are any clubs still `TBD` or blank on the official board?
- Are there obvious schedule issues like postponements or reschedules?

## 2. Full Refresh

Run the full live refresh, not only a one-off exporter.

```bash
npm run data:refresh:mlb-live -- --date YYYY-MM-DD
```

This should rebuild:
- day data
- lineup boards
- HR board
- non-HR prop board
- prop import/grading hooks

## 3. Verification Pass

Run the automated verifier immediately after refresh:

```bash
npm run data:verify:mlb-refresh -- --date YYYY-MM-DD
```

Expected checks:
- active game count matches official schedule
- postponed games removed from active slate
- lineup boards generated for each active game
- weather attached to every lineup board
- park context attached to every MLB game
- weather profile attached to every MLB projection
- bridge reliever coverage attached to every MLB game
- HR board generated
- non-HR prop board generated

Hard-stop failures:
- game count mismatch
- postponed game still present
- lineup board missing for an active game
- HR board empty
- prop board empty

Warnings to review manually:
- partial lineups remain
- bridge coverage missing on some games
- weather or park context missing

## 4. Manual Spot Checks

Even if the verifier passes, manually inspect these:

### Schedule state
- Make sure any `Postponed` or `PPD` MLB game is not still treated as an active pick.

### Probables
- Spot-check any game where the official probable page changed after the prior run.
- Pay extra attention to:
  - rehab returns
  - fresh IL activations
  - opener / bulk arms
  - call-ups
  - fallback-source starters

### Lineups
- Look at all games still marked `partial`.
- Confirm MLB itself still has them as `TBD` or not fully posted.
- If MLB now has the full order, rerun the refresh.

### Bridge chains
- Make sure games are not showing `0.0 score / unknown workload` unless the warehouse truly has no current usage context.

### Weather / park
- Check that the displayed venue and weather make sense for outdoor games.
- Weather is usually a secondary factor, but missing weather or missing park context is still a pipeline miss.

### HR board
- Make sure the board is populated and not blank.
- Sanity-check obvious false carries or stale projected-lineup contamination.

### Props
- Make sure the saved prop file exists.
- Make sure props are not empty even if grading is still `0/x` because games have not finished.

## 5. Publish / Trust Gate

Only treat the day as ready when:
- full refresh completed
- verifier passed without hard failures
- no postponed games remain in the slate
- partial lineups are understood, not accidental
- bridge, weather, park, HR, and props are visibly present

If any of those fail, rerun or patch before trusting the board.

## 6. End-of-Day Archive Loop

After games finish:

```bash
npm run data:close:mlb-day -- --date YYYY-MM-DD
```

This now handles:
- MLB final ingest
- story-signal refresh
- hidden-edge profile refresh
- rolling state-snapshot refresh
- HR grading
- tracked prop grading
- importable side-board export
- side prediction import into `mlb_side_predictions`
- side grading into `mlb_side_backtests`
- history export
- published history refresh
- hidden-edge haircut-grid rerun
- stateful edge haircut-grid rerun
- first-five state-model rerun
- market-divergence / price-aware research rerun

Then update:
- follow-up notes
- graded history
- model trend review

Closeout must not be considered complete unless the side board is both imported and graded. The May 30 gate exists specifically because a veto artifact can look useful while the formal side backtest lane stays empty.

## Short Version

Daily MLB rhythm:

```bash
npm run data:list:probables -- --date YYYY-MM-DD
npm run data:refresh:mlb-live -- --date YYYY-MM-DD
npm run data:verify:mlb-refresh -- --date YYYY-MM-DD
npm run build
```

If the verifier warns about partial lineups, use the official MLB lineup page and rerun when more orders post.

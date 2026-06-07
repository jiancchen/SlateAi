# Clean MLB Public Slate Runbook

Use this when publishing an MLB slate to the public board.

The public board must be generated as one guarded run. Do not manually write `published-data/slates/YYYY-MM-DD/summary.json`, do not delete a slate directory to "clean it up", and do not deploy until the public audit passes.

## What Broke On June 4

The June 4 MLB board had rich M2 batter cards in the generated day files, then a later public publish step loaded MLB through the typed DB compatibility path. That DB path had enough schedule and lineup shape to render players, but it did not have public-page parity for the batter detail payload.

The result was a board that looked present but was hollow:

- batter summaries vanished
- Savant links and matchup grades vanished
- split rows and pitch-fit context vanished
- some starter supplemental context was missing or unreadable
- value board prop coverage lost pitcher strikeout O/U
- tennis stayed at risk because the publish step was being done by hand

The rule until typed DB parity is proven:

```bash
MLB_DAY_GAMES_DISABLE_DB=1
```

Public MLB publishing must force the rich generated M2 source from `web/src/lib/day-YYYY-MM-DD-data.js` and `web/src/lib/day-YYYY-MM-DD-lineups.js`.

## One Command

Morning production run for today in Pacific time:

```bash
npm run data:run:mlb-morning -- --deploy
```

Morning production run for a specific slate:

```bash
npm run data:run:mlb-morning -- --date YYYY-MM-DD --deploy
```

This runner is the default way to make MLB predictions. It closes the prior day, refreshes live MLB data, pulls/warehouses supplemental pitcher context, regenerates predictions and props, publishes only the rich MLB slate while preserving non-MLB games, audits local data, deploys when requested, then audits live data.

Cron example for a 6:30 AM Pacific run:

```cron
30 6 * * * cd "/Users/jcchen/Documents/New project" && npm run data:run:mlb-morning -- --deploy >> data-migration/reports/mlb_morning_cron.log 2>&1
```

Research or recovery run that records gaps instead of blocking on them:

```bash
npm run data:run:mlb-morning -- --date YYYY-MM-DD --allow-source-gaps
```

Do not treat `--allow-source-gaps` as production-green. It exists so a partial slate can be inspected while source ingestion is being fixed.

Full refresh, rich publish, public export, audit, build, deploy:

```bash
npm run data:publish:mlb-clean -- --date YYYY-MM-DD --refresh --deploy --live-base https://slate-web-static-1.vercel.app
```

If the model/data artifacts are already refreshed and you only need to republish safely:

```bash
npm run data:publish:mlb-clean -- --date YYYY-MM-DD
```

Local audit only:

```bash
npm run data:audit:mlb-public -- --date YYYY-MM-DD
```

Hard source-contract audit only:

```bash
npm run data:audit:mlb-morning-contracts -- --date YYYY-MM-DD
```

Live audit after deploy:

```bash
npm run data:audit:mlb-public -- --date YYYY-MM-DD --base https://slate-web-static-1.vercel.app
```

## Clean Run Order

1. Close and grade the prior MLB day.
2. Refresh official schedule, probables, game feeds, weather, park, typed market snapshots, and model lanes.
3. Pull and warehouse the line sources before predictions:
   - MLB official lineups first.
   - Rotowire daily lineups as the fallback for missing posted players.
   - DraftKings pitcher strikeouts from `data-private/raw/odds/draftkings/mlb/pitcher-strikeouts/YYYY-MM-DD/`.
   - Typed `prop_market_snapshots` must contain `source_name=draftkings` rows for pitcher strikeouts before K O/U rows are trusted.
4. Warehouse supplemental model context:
   - ESPN pitcher splits.
   - StatMuse starter-vs-team year-by-year history.
   - RP36 reliever shadow and bridge-chain context.
   - hitter lineup split snapshots after the generated lineup board exists.
5. Generate the M2 day files and prop artifacts.
6. Publish MLB from the rich generated source with `MLB_DAY_GAMES_DISABLE_DB=1`.
7. Preserve existing non-MLB slate entries, especially tennis.
8. Export `/web/public/data/current`.
9. Run `data:audit:mlb-public`.
10. Build/deploy only after the audit passes.
11. Run the same audit against the live URL.

`--refresh` on the clean publisher now runs the full M2 live-refresh workflow, ingests the generated hitter lineup splits, warehouses ESPN pitcher splits, publishes from the rich M2 files, exports public data, and audits.

Important source-status caveat:
- If strict preflight says `mlb_props` or `mlb_odds` is missing while `prop_market_snapshots` has fresh DraftKings rows, fix the source-fetch status adapter before a fresh slate. Do not treat raw table rows and source status as interchangeable for a new production run.

## Audit Hard Stops

The audit fails the run if any MLB game is missing core public-page fields:

- 9 batters per side
- batter summaries
- Savant links
- matchup grades
- batter split context
- pitch-fit summaries
- bridge-chain context
- RP36 reliever shadow context
- park context
- first-five context and push probability
- moneyline shape
- first-inning context
- ESPN pitcher splits status
- public props file with total bases, singles, walks, and pitcher strikeout props
- pitcher strikeout props without DraftKings lineage
- missing feed data for value-board sections: ML, first 5 ML, first 5 O/U, first inning, total bases, and pitcher K O/U
- first-five O/U value-board rows that invent presentation lines instead of using stored line fields. Display line source order is `postedFirst5TotalLine`, then `derivedFirst5TotalLine`, then `runShareFirst5TotalLine`; null, blank, zero, or negative F5 total lines are hard failures.
- first-five O/U rows whose displayed edge is stale after a tail-overlay adjustment. The public edge must equal displayed projection minus the actual stored line; raw/base edge may appear only as diagnostic metadata.
- Batter Board presentation with HR, xOPS / LA, and Barrel / EV columns intact
- HR likely and Hot Hitters feature lanes that respect team scoring context: market underdogs, low projected team totals, or weak implied scoring environments must be suppressed from top promotion unless the artifact carries an explicit exception note

The stricter morning source-contract audit also fails the run if any of these are missing:

- DraftKings full-game moneyline, full-game total, first-five moneyline, or first-five total rows in typed `market_snapshots`
- Rotowire fallback sides without a substitution audit trail
- StatMuse starter-vs-team public rows without structured year-by-year game rows
- ESPN pitcher split categories for inning pitches, times faced, month/day, opponent, stadium/arena, and batting order
- priced batter or pitcher prop rows without sportsbook, source name, source path, and market capture timestamp
- source status rows that disagree with actual typed market/prop rows

Audit reports are written to:

```text
data-migration/reports/audit_public_mlb_slate_YYYY-MM-DD_local.json
data-migration/reports/audit_public_mlb_slate_YYYY-MM-DD_live.json
data-migration/reports/audit_mlb_morning_contracts_YYYY-MM-DD.json
data-migration/reports/mlb_morning_predictions_YYYY-MM-DD.json
```

## Source Checklist

Keep these sources attached or named in the public slate metadata:

- Official MLB schedule, probable pitchers, lineups, and game feeds
- Rotowire daily lineups fallback
- DraftKings MLB props, including pitcher strikeouts
- Baseball Savant hitter and pitcher pages
- ESPN pitcher splits pages
- StatMuse starter-vs-opponent history
- RP36 reliever shadow model artifacts
- latest hitter Statcast trend snapshot used for each lineup batter. Same-day Statcast can lag pregame, so a snapshot with `as_of_date <= slate date` is valid only when the public trend payload exposes the chosen `sourceAsOfDate`.

## Value-Board Presentation Audit

Run this audit whenever the value board changes, when line-source plumbing changes, or when republishing a slate after a model refresh:

- First-five O/U rows must show the actual posted or derived F5 total line from the artifact. Do not derive the visible line from projection and edge.
- A tail-overlay adjusted projection must also adjust the displayed edge. If the UI shows `Proj X | edge Y`, then `X - line = Y` within rounding tolerance.
- Null or blank candidates must be rejected before number conversion. A displayed `0`, negative, or implausibly tiny F5 total line should stop the deploy.
- The public audit should sample both posted-line rows and fallback-line rows, because those are different failure modes.
- If a slate is already generated and only the public board needs repair, republish scoped dates instead of exporting every historical slate:

```bash
npm run publish:site -- --date YYYY-MM-DD --only-dates=YYYY-MM-DD,PRIOR-YYYY-MM-DD
```

## Current Production Blockers

The morning runner now guards the June 4 complaint classes at data/source level. If the hard audit fails, fix the source ingestion or public packaging code first; do not work around the failure by hand-editing public JSON.

Current blockers observed on the June 4 local slate:

- DraftKings full-game and first-five market rows are absent from typed `market_snapshots`.
- Rotowire fallback lineups are present but do not yet carry side-level substitution audit proof.
- StatMuse starter-vs-team rows are absent from the typed table and public starter cards.
- Andrew Morris is missing ESPN split data because the ESPN athlete mapping was not resolved.
- Legacy batter props are still model-derived without sportsbook/source lineage.
- `source_fetch_status` reports `mlb_props` as missing while typed DraftKings pitcher K rows exist.
- The Batter Board promotion audit still needs a hard source-level check for team-total/implied-runs suppression. Until that is automated, browser/audit review must confirm that underdog or weak-scoring bats are not being featured as likely HR or hot-hitter top calls.

Remaining guardrail to add:

- UI-only presentation complaints, such as StatMuse list readability and top-card descriptive bubbles, still need a browser/screenshot audit or component-level check.

## Manual Emergency Fix

If a slate is already refreshed but the public board is sparse, do not rerun ad hoc publish code. Run:

```bash
npm run data:publish:mlb-clean -- --date YYYY-MM-DD
npm run data:audit:mlb-public -- --date YYYY-MM-DD
```

Then build/deploy only if the audit passes.

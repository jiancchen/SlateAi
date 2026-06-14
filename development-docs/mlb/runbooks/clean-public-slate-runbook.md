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

This runner is the default way to make MLB predictions. It closes the prior day, pre-seeds the prediction day with raw MLB schedule/feed data and the DraftKings game-line board, refreshes live MLB data, pulls/warehouses supplemental pitcher context, regenerates predictions and props, publishes only the rich MLB slate while preserving non-MLB games, audits local data, deploys when requested, then audits live data.

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
2. Fetch raw official MLB schedule/game-feed files for the prediction date.
3. Fetch the DraftKings MLB game-line board before `data:refresh:mlb-live`; typed prepare consumes the local raw market file during refresh.
4. Refresh official schedule, probables, game feeds, weather, park, typed market snapshots, and model lanes.
5. Pull and warehouse the line sources before predictions:
   - MLB official lineups first.
   - Rotowire daily lineups as the fallback for missing posted players.
   - DraftKings pitcher strikeouts from `data-private/raw/odds/draftkings/mlb/pitcher-strikeouts/YYYY-MM-DD/`.
   - Typed `prop_market_snapshots` must contain `source_name=draftkings` rows for pitcher strikeouts before K O/U rows are trusted.
6. Warehouse supplemental model context:
   - ESPN pitcher splits.
   - StatMuse starter-vs-team year-by-year history.
   - ESPN hitter `vs. Left` / `vs. Right` split rows, ESPN pitcher `Right / Left` starter split rows, and Savant pitch-arsenal hitter-vs-pitch-type league-average context through the lineup lane. Hitter ESPN rows are batter production versus pitcher throwing hand; starter ESPN rows are allowed production versus batter side faced. The public lineup payload should expose `espnHitterSplit`, `starterMatchupKernelIndex`, hitter-level `matchupKernel`, and pitch-type `vsLeague` deltas before trusting ML, F5 ML, YRFI/NRFI, totals, or batter prop changes.
   - FantasyInfoCentral Weather/HRForce with `npm run data:warehouse:mlb-fic-weather -- --date YYYY-MM-DD` so HR, O/U, and team-total reads have same-day park/weather carry context. The source is `https://www.fantasyinfocentral.com/mlb/weather/`; store it before model generation. Treat HRForce >= 1.4 as support/warning, not a standalone promotion reason. For evening/night starts, require game-time or early-game hourly HRForce persistence before using HRForce to promote ML, F5 ML, YRFI/NRFI, pitcher expected lines, batter expected production, HRs, or totals. If carry fades after first pitch, constrain the boost to YRFI/first-five and haircut full-game/late-game totals. Cross HRForce with starter pitch-mix/weather archetype before changing those lanes.
   - FantasyInfoCentral Daily Matchups with `npm run data:warehouse:mlb-fic-daily-matchups -- --date YYYY-MM-DD` so H+R+RBI clean-board promotions have same-day BvP AB/AVG/OPS context. The fetch URL must include the date parameter, `https://www.fantasyinfocentral.com/mlb/daily-matchups?date=YYYY-MM-DD`; do not warehouse today's page under a prior slate date.
     - The FIC matchup warehouse also stores same-row HRF, qAB%, HH%, hits, 2B/3B, HR, BB, AVG, OBP, and OPS. Only apply BvP adjustment pressure when the hitter has at least 5 AB against the listed pitcher and the sample can be treated as recent enough for the last-3-seasons BvP rule. Undated/career aggregate BvP stays context-only.
   - FantasyInfoCentral Umpire Factors with `npm run data:warehouse:mlb-fic-umpire-factors -- --date YYYY-MM-DD`. This stores historical umpire favors, games, Hits/G, BB/G, SO/G, score environment, home advantage, BA, OBP, and OPS. It is profile context only until joined to an exact home-plate assignment.
   - TheCapper MLB home-plate umpire context with `npm run data:warehouse:mlb-umpires -- --date YYYY-MM-DD`, then audit it with `npm run data:audit:mlb-umpires -- --date YYYY-MM-DD`. This writes a raw page snapshot, daily umpire profiles, and game-level assignment rows. Only rows with `date_match_status='exact'` may be used for game/pitcher-K adjustments; if TheCapper serves stale matchups, keep the fetch as `partial` and treat it as a source coverage gap.
   - FanGraphs/RosterResource reliever context with `npm run data:warehouse:mlb-fangraphs-bullpen-depth -- --date YYYY-MM-DD --team all`. This stores the daily bullpen role ladder, structured recent usage, enriched RP roster rows, team RP rankings, recent transactions, closer-depth hierarchy, and closer-page leverage usage. Use it as bullpen availability/role context first; do not promote it into RP36 scoring until it has been backtested against actual reliever usage. See [mlb-reliever-daily-warehouse-runbook.md](/Users/jcchen/Documents/New%20project/development-docs/mlb/runbooks/mlb-reliever-daily-warehouse-runbook.md:1).
   - MLB-SP1 starter profile addendum is planned as the next build-chain step. Once `npm run data:build:mlb-sp1 -- --date YYYY-MM-DD` exists, run it after ENV1/RP2 and before day-file generation. Until then, manually audit the same contract from [mlb-starter-profile-addendum-runbook.md](/Users/jcchen/Documents/New%20project/development-docs/mlb/runbooks/mlb-starter-profile-addendum-runbook.md:1).
   - Generate the additive relief/K shadow addendum after bullpen and umpire warehousing with `npm run data:generate:mlb-shadow-addendums -- --dates YYYY-MM-DD`. The addendum may annotate, rank, and explain ML shape and pitcher K rows, but it must not remove picks from the value board. Umpire adjustments require exact date/game matches; bullpen context may be used when all teams are covered.
   - RP36 reliever shadow and bridge-chain context.
   - hitter lineup split snapshots after the generated lineup board exists.
7. Generate the M2 day files and prop artifacts.
   - Audit `stateContext.recentInningHistory` and `stateContext.matchupInningHistory` before publish: for every row, the sum of inning cells must equal `runsFor`, and no single inning cell can exceed `runsFor`. If this fails, fix the M2 history builder before exporting public JSON.
8. Publish MLB from the rich generated source with `MLB_DAY_GAMES_DISABLE_DB=1`.
9. Preserve existing non-MLB slate entries, especially tennis.
10. Export `/web/public/data/current`.
11. Run `data:audit:mlb-public`.
12. Build/deploy only after the audit passes or only known allowed failures remain.
13. Run the same audit against the live URL.

Known allowed audit failures while the reliever model remains shadow/broken:
- `missing-bridge-chain`
- `missing-rp36-shadow`
- `pitcher-strikeout-props-missing-draftkings-lineage`

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
- ESPN hitter split context for the opposing starter hand
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
- first-five O/U rows whose displayed projection is sourced from `tailOverlay.adjustedProjectedRuns`. Public projection, edge, probability, confidence, and ranking must use `awayFirst5ProjectedRuns + homeFirst5ProjectedRuns`; tail overlay fields may appear only as diagnostic/gating metadata.
- first-five O/U rows with a final `Pass`, `Hold`, or `Unsupported over` lean appearing as bet-grade value rows, POTD candidates, or top-value promoted rows. They may appear only in research-only buckets.
- first-five O/U rows whose displayed confidence ignores edge quality. Thin edges, volatile unders, weather/park carry, and chaos tags should reduce confidence or add a warning.
- first-five ML rows whose displayed confidence ignores tie/push risk. Low-scoring games with elevated modeled F5 tie probability need a haircut or tie-risk warning before promotion.
- first-five ML rows that rise in ranking only because of projected run gap. Confirm the board explains the move as side-gap strength, and do not treat it as safer than a lower-risk row without confidence support.
- not-started side-confidence coherence. Run `npm run data:audit:mlb-not-started-side-coherence -- --date YYYY-MM-DD` before a late-day deploy. A separated ML shape with positive run differential, real hit edge, and full/F5/late/bridge phase ownership must not be hard-capped as `Pass` or `52`; a thin side projecting behind on runs must be demoted to a side pass when its best expression is first-five/live/timing.
- starter-profile side/tail coherence. A side pick must not be promoted when it needs starter suppression but the pitcher profile shows high HRForce fragility, poor handedness fit against the posted lineup, bad day/night split for the time bucket, recent command/hard-contact trouble, or same-season repeat-opponent tax. Move that game to YRFI, over, team total, F5, live, or pass unless the profile has explicit counterweights.
- per-inning history rows whose inning cells do not reconcile to the displayed `R` total. Historical inning rows must be built from de-duplicated game records before joining plate appearances, and extra-inning games must not be truncated before the final scoring inning.
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
- FantasyInfoCentral MLB Weather/HRForce for same-day weather-adjusted HR/run-environment context: `https://www.fantasyinfocentral.com/mlb/weather/`
  - warehouse command: `npm run data:warehouse:mlb-fic-weather -- --date YYYY-MM-DD`
  - use current and hourly HRForce. HRForce >= 1.4 should downgrade fragile unders and support HR/over lanes only when other baseball evidence agrees.
  - for games starting at/after 6:00 PM local, current HRForce must be checked against hourly first-pitch/early-game HRForce. If the game-window value is below 1.4, classify the daily high value as weak carry persistence rather than a top-pick promotion input.
  - HRForce below 1.4 is lower HR/run-environment pressure. HRForce N/A is normally dome/no-weather-impact context and should be treated as lower weather carry, not as a hidden high-run signal.
- FantasyInfoCentral MLB Daily Matchups for same-day batter-vs-pitcher checks: `https://www.fantasyinfocentral.com/mlb/daily-matchups`
  - warehouse command: `npm run data:warehouse:mlb-fic-daily-matchups -- --date YYYY-MM-DD`
  - use BvP only at 5+ AB. Store hits, 2B/3B, HR, BB, AVG, OBP, OPS, qAB%, HH%, and same-row HRF for hitter props and pitcher hits/earned-run risk context.
  - historical backfill uses the same command one date at a time. Do not run multiple FIC warehouse jobs in parallel against `sql-mlb.db`; SQLite locks can leave raw/artifact writes ahead of database/web-module writes.
- TheCapper MLB Umpires for home-plate zone/K/walk/NRFI context: `https://thecapper.io/mlb/umpires/`
  - warehouse command: `npm run data:warehouse:mlb-umpires -- --date YYYY-MM-DD`
  - audit command: `npm run data:audit:mlb-umpires -- --date YYYY-MM-DD`
  - impact report command: `npm run data:research:mlb-umpire-impact -- --start-date YYYY-MM-DD --end-date YYYY-MM-DD`
  - use only exact date/game matches for model features. Store stale or mismatched fetches, but do not attach them to today's games.
  - audit warnings `no-exact-umpire-game-matches`, `capture-date-differs-from-source-date`, or `unresolved-or-stale-assignment-rows` mean the source is captured but unavailable for model features on that slate.
- FantasyInfoCentral MLB Umpire Factors for historical profile/cross-check context: `https://www.fantasyinfocentral.com/mlb/umpires`
  - warehouse command: `npm run data:warehouse:mlb-fic-umpire-factors -- --date YYYY-MM-DD`
  - table: `mlb_fic_umpire_factors_daily`
  - not an assignment source. Join to games only through an exact TheCapper or equivalent home-plate assignment by normalized umpire name.
- FanGraphs/RosterResource reliever context for role, workload, roster, transaction, closer, and team RP ranking context:
  - example source: `https://www.fangraphs.com/roster-resource/depth-charts/reds`
  - closer source: `https://www.fangraphs.com/roster-resource/closer-depth-chart`
  - warehouse command: `npm run data:warehouse:mlb-fangraphs-bullpen-depth -- --date YYYY-MM-DD --team all`
  - dedicated runbook: [mlb-reliever-daily-warehouse-runbook.md](/Users/jcchen/Documents/New%20project/development-docs/mlb/runbooks/mlb-reliever-daily-warehouse-runbook.md:1)
  - generated board addendum: `npm run data:generate:mlb-shadow-addendums -- --dates YYYY-MM-DD`
  - stores typed daily tables for visible bullpen depth/usage, enriched RP roster rows, structured usage events, team-page transactions, team RP rankings, closer depth, and closer usage with leverage index.
  - the shadow addendum is additive: it can tag ML shape rows with relief support/risk and tag pitcher K rows with bullpen-leash/umpire context, but it cannot delete rows or override the base model.
- ESPN pitcher splits pages
- ESPN hitter splits pages for current lineup batters
- StatMuse starter-vs-opponent history
- MLB-SP1 starter profile addendum contract: [models/mlb/cartridges/MLB-SP1/output-contract.json](/Users/jcchen/Documents/New%20project/models/mlb/cartridges/MLB-SP1/output-contract.json:1)
- RP36 reliever shadow model artifacts
- latest hitter Statcast trend snapshot used for each lineup batter. Same-day Statcast can lag pregame, so a snapshot with `as_of_date <= slate date` is valid only when the public trend payload exposes the chosen `sourceAsOfDate`.

## Value-Board Presentation Audit

Run this audit whenever the value board changes, when line-source plumbing changes, or when republishing a slate after a model refresh:

- First-five O/U rows must show the actual posted or derived F5 total line from the artifact. Do not derive the visible line from projection and edge.
- First-five O/U rows must show the real M2 F5 game-total projection from `awayFirst5ProjectedRuns + homeFirst5ProjectedRuns`. If the UI shows `Proj X | edge Y`, then `X - line = Y` within rounding tolerance. `tailOverlay.adjustedProjectedRuns` is a gate/diagnostic field, not the public projection.
- POTD and promoted value sections must skip any F5 O/U row whose final lean is not actionable `Over` or `Under`, regardless of raw probability.
- Null or blank candidates must be rejected before number conversion. A displayed `0`, negative, or implausibly tiny F5 total line should stop the deploy.
- First-five O/U rows must expose confidence that is consistent with margin quality. A close miss should not look like a clean-hit profile, and severe-miss patterns from prior grading should trigger caution before promotion.
- F5 team-total rows must use discrete run thresholds for public cushion, sorting, and promotion. `Over 1.5` needs `2+` runs, so a `2.6` projection has only `+0.6` threshold cushion even though raw `projection - line` is `+1.1`. `Under 2.5` needs `2 or fewer`, so cushion is `2 - projection`, not `line - projection`.
- Public F5 team-total copy should label this as `cushion`, not generic `edge`. Raw projection-vs-line gap may stay in diagnostics, but POTD/promoted tiers must not use it as the primary margin.
- F5 team-total promoted rows need at least `0.75` runs of discrete threshold cushion unless the shadow report explicitly records a different active seed window.
- Full-game team-total rows must appear on the team-total value board when either a direct `teamTotalRuns/fullGame` anchor exists or a safe derived line can be built from posted game total plus M2 team-run share. Derived rows must be labeled `Derived FG line`, use discrete hit-threshold cushion, and require at least `1.0` run of threshold cushion before promotion.
- First-five ML rows must expose push/tie risk when the modeled F5 tie probability is elevated. Check both the visible warning and the machine-readable value metadata.
- Ranking checks should compare `promotionTier`, `sortConfidence`, market edge, and margin support. If a row jumps because the run-gap edge/share is largest, confirm that confidence and warnings still tell the correct story. Do not demote a strong F5 ML edge merely because it exceeds a narrow historical seed bucket; confidence is primary, push/tie risk is the control, and run gap is support.
- ML shape rows must not rank primarily by `diff/total`. Public copy should label that number as `margin support`; confidence is the primary ML trust signal, market edge is the value confirmation, and margin support is the tiebreak/context field.
- ML shape row copy must explain disagreements between confidence and margin support: high-confidence/low-margin is a thinner-score win read, while high-margin/low-confidence is watch-only because the model does not trust the win side enough.
- Shadow calibration tiering must be visible for game-line rows when enabled. Public sorting should put `promoted` rows above `watch` and `research`, and POTD sections must only pull from `promoted` rows with a visible reason/evidence window.
- Batter value-board lanes are additive, not interchangeable. The board must keep these lanes separate and visible when rows exist:
  - combined H+R+RBI clean board
  - Hits props
  - Runs props
  - RBI props
  - Mike's BOTD as a separate screen, not a replacement for any of the above
- Combined H+R+RBI clean-board promotion must include current team/game context: projected full-game ML win, 70%+ model confidence, and 30+ recent AB/PA. Rows that fail the clean filter should not be deleted from model artifacts; they should be demoted or omitted only from the clean promoted lane.
- Mike's BOTD is a separate H+R+RBI screen. For normal same-day operation, it uses projected full-game ML win, 60%+ confidence, 30+ recent AB/PA, same-day FantasyInfoCentral batter-vs-probable-pitcher support, and no suppressive starter/batter kernel. The FIC support gate is at least 5 AB against today's listed starter, batter-vs-pitcher AVG over .300, batter-vs-pitcher OPS over .800, and BvP that is recent enough for the last-3-seasons rule. If a manual Mike screen exists for the date, that manual list is the admission gate and FIC becomes support/context; do not let every strict FIC pass auto-enter the manual BOTD lane.
- H+R+RBI rows sourced from modeled lineup production must carry the same `ficHrrCleanGateRequired`, `ficHrrCleanPass`, `ficDailyMatchup`, and `mikesBotdFiltered` fields as direct posted `hitRunRbi` prop rows. Historical slates often lack direct `hitRunRbi` exports, so the modeled fallback must still be eligible for Mike's BOTD and result grading.
- If a batter has weak current quality, especially low recent xwOBA/xOPS or fading Statcast trend, do not let BvP alone promote the row. Keep the row visible only as watch/research unless the manual screen explicitly includes it and the reason is documented.
- Bad player/team identity rows are hard excludes from value-board promotion. Example failure class: a player attached to the wrong team/game in the prop feed can bypass the ML-win filter because the UI evaluates the wrong team's market line. Add a scoped invalid-identity guard rather than treating the row as a valid market disagreement.
- The public audit should sample both posted-line rows and fallback-line rows, because those are different failure modes.
- If a slate is already generated and only the public board needs repair, republish scoped dates instead of exporting every historical slate:

```bash
npm run publish:site -- --date YYYY-MM-DD --only-dates=YYYY-MM-DD,PRIOR-YYYY-MM-DD
```

For the June 6-8, 2026 value-board/shadow-calibration refresh, use the scoped production publish rather than a raw Vercel deploy:

```bash
npm run publish:site -- --date 2026-06-08 --only-dates=2026-06-06,2026-06-07,2026-06-08
```

After a scoped publish, verify `web/public/data/meta.json` lists only the intended dates and that each `web/public/data/slates/YYYY-MM-DD/summary.json` exists. The current `scripts/audit-public-mlb-slate.mjs` reads `/data/current`, so running it with a historical `--date` can produce a `current-summary-date-mismatch` even when the historical slate file exists. Treat that as an audit-tool limitation until the audit script is made slate-path aware; keep known bridge/RP36 failures separate from scoped-publish correctness.

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

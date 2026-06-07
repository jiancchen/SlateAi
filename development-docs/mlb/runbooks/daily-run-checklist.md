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
- if an MLB-M2-style branch is being evaluated, rerun the category/lane backtest and record whether the prior day was side, F5/timing, total, first-inning, live-only, or no-pregame-ML shape.

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
- hitter identity/career profiles for the actual slate bats
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
- hitter career profiles are joined into lineup batters, especially tiny-current-sample players
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

### Sun position / visibility
- Treat sun position as separate from weather. Weather is temperature, wind, precip, roof/open-air state; sun visibility is game-time geometry.
- For day/late-afternoon outdoor games, check whether first pitch and middle innings create low-sun or shadow-transition risk.
- Required future warehouse inputs: venue latitude/longitude, field orientation, scheduled local first pitch, solar azimuth/elevation, cloud cover, roof/shadow state, and defensive-zone exposure.
- Do not label this as `weather_carry`. If it matters, tag it as `sun_visibility_risk` or `shadow_transition_risk`.

### HR board
- Make sure the board is populated and not blank.
- Sanity-check obvious false carries or stale projected-lineup contamination.
- Do not promote an HR bat as `HR likely` on hitter contact alone. The promoted lane must have recent xwOBA, barrel or hard-hit/EV, usable launch angle, and a real matchup note.
- Apply the team-context promotion gate before trusting the featured lane: if the batter's team is a market underdog, projects for a low team total, or has a weak run environment, the bat can stay visible in the table/watchlist but should not be treated as a top promoted HR read without an explicit exception note.
- Confirm the public Batter Board still exposes the HR, xOPS / LA, and Barrel / EV columns after every publish.

### Props
- Make sure the saved prop file exists.
- Make sure props are not empty even if grading is still `0/x` because games have not finished.
- Savant game logs are mostly redundant with the pitch/game warehouse. Use them as a player-page sanity check, not as the primary stored source, because `mlb_pitch_events`, `mlb_player_game_batting`, and `mlb_hitter_statcast_game_logs` should already preserve the underlying game data.
- Savant hitter splits are not redundant. The lineup export now persists the daily handedness/platoon split rows into `mlb_hitter_split_snapshots`; keep that table fresh before trusting prop or hitter-fit writeups.
- Required split warehouse shape:
  - `snapshot_date`, `game_id`, `player_id`, `season`, `split_type`, `split_key`, `plate_appearances`, slash line, K/BB when present, `source_url`, source hash, and raw payload.
  - opposing pitcher hand and game context so the exact pregame matchup can be replayed.
  - future full Savant HTML rows for month, batting order, runners, game type, outs, and Statcast split fields.
- After exporting lineups, verify split snapshots:

```bash
npm run data:ingest:hitter-lineup-splits -- --date YYYY-MM-DD
sqlite3 data-private/warehouse/sports.db "select snapshot_date, split_key, count(*) from mlb_hitter_split_snapshots where snapshot_date='YYYY-MM-DD' group by 1,2;"
```

- After settlement, rerun prop grading and check split buckets. A split row is context until it proves lift by prop type:

```bash
npm run data:grade:mlb-props -- --date YYYY-MM-DD --model-name mlb-player-props-v2
```

- Use the Savant splits page for current-season batter context when evaluating prop confidence, especially small-sample hitters, platoon bats, role-pressure bats, and total-bases/HR lanes.
- Spot-check any prop driven by fewer than 24 current-season PA. It must show a career repeatability story, not just a hot current box score.
- Treat career stats as a low-weight baseline, not a bet trigger. The useful question is whether current process, role, pitch fit, and recent contact shape make the old profile repeatable today.
- Log material MLB-M0 model/warehouse changes in `models/mlb/cartridges/MLB-M0/MLB-M0_log.md` before treating them as part of the cartridge.
- Check the batter approach proxy on tiny-sample bats:
  - approach/confidence score should be supported by recent Statcast process, not batting average alone.
  - role pressure should be visible when a hitter is fighting for playing time or only getting partial lineup work.
  - volatile career power can stay on the watchlist, but it should not become a core prop without current damage-contact proof.
- Before promoting batter props, likely HR bats, or hot hitters, check the team run context:
  - market underdog or weak implied scoring environment means no featured promotion by default.
  - low team total / low projected runs means the player can remain a table row or secondary watch, but needs a specific role, lineup-slot, pitch-fit, or plus-price exception to be called out.
  - favored or neutral team context does not create a bet by itself; it only allows the hitter process signals to be promoted if the Statcast thresholds also clear.
- Hot hitters lane gate: recent xwOBA must clear `.300`, recent Statcast xOPS must clear `.725`, launch angle or sweet-spot context must be usable, and the team-context gate must not be suppressing the bat.
- For total bases, separate three lanes:
  - `TB backed`: recent Statcast damage plus opponent-strength support.
  - `Career-backed heat`: current spike fits the player’s career power, but opponent-strength support is still thin.
  - `Soft heat`: missing career or opponent-strength proof; do not treat as core.

Mental/process references for the proxy:
- Reddit hitter-mindset thread: https://www.reddit.com/r/Homeplate/comments/mknx3q/what_should_be_the_mindset_of_a_hitter/
- Quality At-Bats Academy mental hitting guide: https://qualityatbatsacademy.com/the-mental-side-of-hitting-the-ultimate-guide/
- Example Savant game logs check: https://baseballsavant.mlb.com/savant-player/nelson-velazquez-676369?stats=gamelogs-r-hitting-mlb&season=2026
- Example Savant splits source to warehouse: https://baseballsavant.mlb.com/savant-player/nelson-velazquez-676369?stats=splits-r-hitting-mlb&season=2026

The model takeaway is process before outcome: huntable pitch zones, confidence/aggression, two-strike adjustment, and recovery after bad at-bats need measurable proxies such as count results, chase/swing decisions, hard-hit/barrel trend, and next-PA response.

## 5. Publish / Trust Gate

Before exporting or deploying the public board, use the clean public slate runbook:

- [Clean MLB Public Slate Runbook](/Users/jcchen/Documents/New%20project/development-docs/mlb/runbooks/clean-public-slate-runbook.md:1)

Required public publish command:

```bash
npm run data:publish:mlb-clean -- --date YYYY-MM-DD --refresh --deploy --live-base https://slate-web-static-1.vercel.app
```

Hard rule for the public board:
- do not publish MLB through the typed DB loader until the public audit proves field parity
- do not delete existing non-MLB slate entries while refreshing MLB
- do not deploy until `npm run data:audit:mlb-public -- --date YYYY-MM-DD` passes
- if only republishing already-generated MLB, run `npm run data:publish:mlb-clean -- --date YYYY-MM-DD`

Only treat the day as ready when:
- full refresh completed
- verifier passed without hard failures
- no postponed games remain in the slate
- partial lineups are understood, not accidental
- tiny-sample player props are explained by career profile or suppressed
- bridge, weather, park, sun-position visibility, HR, and props are visibly present
- value-board rows are separated by trust level: validated rows can be promoted, research-only rows can be displayed, and uncalibrated rows cannot be ranked as value

If any of those fail, rerun or patch before trusting the board.

Current hard rule:
- First-five O/U rows are research-only after the May 31 failure. Do not publish them as bet-grade value until settled bucket calibration exists for line, ask, model probability, projected-run edge, chaos gate, and date-level walk-forward ROI.
- The web value board must filter model-owned rows only. Do not add UI-side value math for F5 ML, F5 O/U, totals, scalp trades, or any new market. If a lane is not in the cartridge output, it is not a value-board lane yet.
- First-five O/U display lines must come from the artifact's actual line fields, in this order: `postedFirst5TotalLine`, `derivedFirst5TotalLine`, then `runShareFirst5TotalLine`. Do not reconstruct a betting line from `projectedFirst5Total - edge`; tail overlays can change the projected runs and make that reconstruction invent fake lines.
- Guard null and blank line candidates before number conversion. `Number(null)` becomes `0`, and a non-positive F5 total line is a hard presentation/data bug, not a fallback.
- If the value board applies a tail-overlay adjusted projection, the displayed edge must be recalculated as adjusted projection minus the actual stored line. Preserve the raw/base edge only as diagnostic context.
- Before deploy, audit value-board F5 O/U rows against the slate payload: displayed line, projected runs, edge, and lean must match stored fields and no row should show a synthetic value such as `F5 2.4` unless a sportsbook/source actually posted that number.
- Pregame batter Statcast bubbles may use the latest `mlb_hitter_statcast_trend_snapshots` row with `as_of_date <= slate date` when same-day Statcast has not landed yet. The exported trend object should carry `sourceAsOfDate` so stale-but-valid context is auditable.

## 6. End-of-Day Archive Loop

After games finish:

```bash
npm run data:close:mlb-day -- --date YYYY-MM-DD
```

This now handles:
- MLB final ingest
- sun-position visibility snapshot and outfield/contact outcome backfill from MLB feed/live
- story-signal refresh
- hidden-edge profile refresh
- rolling state-snapshot refresh
- HR grading
- tracked prop grading
- repeatability bucket backtest for total-bases rows (`TB backed`, `Career-backed heat`, `Soft heat`, approach label)
- importable side-board export
- side prediction import into `mlb_side_predictions`
- side grading into `mlb_side_backtests`
- history export
- published history refresh
- hidden-edge haircut-grid rerun
- stateful edge haircut-grid rerun
- first-five state-model rerun
- market-divergence / price-aware research rerun

For active M2 evaluation days, also run:

```bash
npm run data:research:mlb-m2-game-shape -- --start 2026-05-10 --end YYYY-MM-DD
npm run data:research:mlb-m2-run-total-stories -- --post-date YYYY-MM-DD --today NEXT-YYYY-MM-DD
npm run data:research:mlb-m2-state-formulas -- --start 2026-05-10 --end YYYY-MM-DD
npm run data:research:mlb-starter-split-addendum -- --date YYYY-MM-DD
```

The postmortem should not stop at `risky`, `veto`, projection error, or average miss. It should first answer:

- Why did the game go over?
- Why did the game go under?
- Was that mechanism visible pregame?
- Is that same mechanism live on the next slate?

Then classify each miss and hit by game shape:

- clean phase stack
- early-pressure side
- starter-to-bullpen flip
- late-rescue side
- dead-zone side
- favorite conversion trap
- crooked-inning game
- starter-duel under
- underdog pressure lane
- weather-carry chaos
- sun-visibility risk
- balanced traffic game

For totals, also classify story buckets:

- crooked-inning over
- traffic-conversion over
- power over
- free-pass over
- bridge over
- fielding/outfield-tail over
- starter hold under
- strand under
- power-suppressed under
- bat-missing under
- bridge-clean under
- fork/live-only

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

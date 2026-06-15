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
- if the starter-split addendum is being evaluated, run it as shadow only and record source coverage plus YRFI/NRFI, F5 O/U, F5 side/tie, and F5 ML grading before trusting any confidence change.
- run the shadow calibration addendum over the latest settled window before trusting POTD or top-board promotion. This is a promotion/ranking layer only; it must not delete model rows or change saved projections.

```bash
npm run data:research:mlb-shadow-calibration-addendum -- --dates RECENT-SETTLED-DATES
```

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
npm run data:warehouse:mlb-fic-weather -- --date YYYY-MM-DD
npm run data:warehouse:mlb-fic-daily-matchups -- --date YYYY-MM-DD
npm run data:warehouse:mlb-fic-umpire-factors -- --date YYYY-MM-DD
npm run data:warehouse:mlb-umpires -- --date YYYY-MM-DD
npm run data:audit:mlb-umpires -- --date YYYY-MM-DD
npm run data:warehouse:mlb-fangraphs-bullpen-depth -- --date YYYY-MM-DD --team all
```

This should rebuild:
- day data
- lineup boards
- hitter identity/career profiles for the actual slate bats
- hitter handedness/platoon split snapshots for the actual posted lineup bats
- HR board
- non-HR prop board
- prop import/grading hooks
- FantasyInfoCentral Weather/HRForce warehouse rows for same-day park/weather HR and run-environment context
- FantasyInfoCentral Daily Matchups warehouse rows for the same-day H+R+RBI clean-board gate
- FantasyInfoCentral Umpire Factors warehouse rows for historical umpire run/K/walk profile context
- TheCapper home-plate umpire assignment rows plus an exact-match audit before any K/NRFI/run-environment usage
- FanGraphs/RosterResource reliever context for bullpen role, workload, closer hierarchy, injuries, roster status, and recent transactions; see [mlb-reliever-daily-warehouse-runbook.md](/Users/jcchen/Documents/New%20project/development-docs/mlb/runbooks/mlb-reliever-daily-warehouse-runbook.md:1)
- MLB-ENV1 and MLB-RP2 shadow addendums before the M2 day files:

```bash
npm run data:build:mlb-env1 -- --date YYYY-MM-DD
npm run data:build:mlb-rp2 -- --date YYYY-MM-DD
npm run data:warehouse:mlb-player-split-families -- --date YYYY-MM-DD
npm run data:audit:mlb-player-split-families -- --date YYYY-MM-DD
npm run data:build:mlb-sp1 -- --date YYYY-MM-DD
npm run data:audit:mlb-sp1 -- --date YYYY-MM-DD
npm run data:generate:mlb-day -- --date YYYY-MM-DD
```

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
- hitter handedness split rows are joined into lineup batters and exposed in the detail adjustment checklist
- ESPN hitter `vs. Left` / `vs. Right` split rows are joined into lineup batters as explicit `espnHitterSplit` context
- weather attached to every lineup board
- park context attached to every MLB game
- weather profile attached to every MLB projection
- bridge reliever coverage attached to every MLB game
- RP2 available-bullpen context attached to every MLB game where source coverage exists
- MLB-SP1 starter profile context is attached for both team sides, sourced from canonical hitter/pitcher split families, and present in the causal ledger
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

## 3A. Late Not-Started Refresh And Side-Coherence Audit

When republishing after first pitch on a slate day, preserve already-started games and refresh only games that have not started yet.

```bash
npm run data:refresh:mlb-live -- --date YYYY-MM-DD
npm run data:warehouse:mlb-fic-weather -- --date YYYY-MM-DD
npm run data:build:mlb-env1 -- --date YYYY-MM-DD
npm run data:build:mlb-rp2 -- --date YYYY-MM-DD
npm run data:warehouse:mlb-player-split-families -- --date YYYY-MM-DD
npm run data:audit:mlb-player-split-families -- --date YYYY-MM-DD
npm run data:build:mlb-sp1 -- --date YYYY-MM-DD
npm run data:audit:mlb-sp1 -- --date YYYY-MM-DD
npm run data:generate:mlb-day -- --date YYYY-MM-DD --skip-preflight
npm run data:publish:mlb-clean -- --date YYYY-MM-DD --preserve-started --allow-known-audit-failures
npm run data:audit:mlb-not-started-side-coherence -- --date YYYY-MM-DD
```

Side-confidence hard stops:
- A not-started full-game ML side with separated ML shape, positive run differential, a real hit edge, and ownership of full-game/F5/late/bridge phases must not remain `Pass` or `52`.
- A side that projects behind on runs with a thin full-game edge and a timing/live best expression must be demoted to a side pass.
- A side that requires starter suppression must be demoted when HRForce, handedness, pitch-fit, repeat-opponent, or first-inning risk create an over-tail that SP1 cannot explain away.
- `analysis.confidence` and `analysis.mlbProjection.moneylineShape.confidence` must match after any side-coherence promotion or demotion.
- Public `tierOnePassFlag` must clear when a side is intentionally restored by the side-coherence gate; keep `tierOneRawPassFlag` for audit visibility.

Warnings to review manually:
- `Swingy 52` means the side is playable only as a thin/watchlist lane. It is not the same bug as a separated all-phase edge stuck at `52`.
- Thin ML shapes can own all phases and still stay as passes when the run edge is small, the favorite is taxed, or bullpen/late stability remains ugly.

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
- Spot-check at least one lefty/righty-sensitive hitter in the detail payload. The hitter should expose both the MLB split row and the ESPN `espnHitterSplit` row for today's opposing starter hand; if ESPN is missing, the matchup kernel should show a source-status reason rather than silently pretending the split was neutral.

### Pitcher / batter handedness
- Separate the two right/left meanings:
  - hitter ESPN split: batter production `vs. Left` / `vs. Right` means opposing pitcher throwing hand
  - starter ESPN split: pitcher allowed `vs. Left` / `vs. Right` means batter side faced
- The starter matchup kernel must blend current form, hitter split versus starter hand, starter allowed split versus effective batter side, pitch-type fit versus league average, and recent Statcast trend. Do not let old BvP override a cold current hitter.
- Strong hitter platoon splits should affect projected hits/runs, pitcher expected hits/runs, ML/F5 ML shape, YRFI/NRFI, totals, team totals, HR lanes, hits, total bases, and H+R+RBI confidence.
- MLB-SP1 should show the same pieces in the detail payload and causal ledger: projection pitcher role, ESPN pitcher right/left allowed split, hitter ESPN split, pitch-fit, repeat-opponent context, day/night split when meaningful, HRForce/weather archetype, and first-inning risk.

### Bridge chains
- Make sure games are not showing `0.0 score / unknown workload` unless the warehouse truly has no current usage context.

### Weather / park
- Check that the displayed venue and weather make sense for outdoor games.
- Weather is usually a secondary factor, but missing weather or missing park context is still a pipeline miss.
- HRForce is a run-carry input, not just an HR-prop decoration:
  - HRForce >= 1.4 is higher HR/run-environment pressure.
  - HRForce >= 1.5 is material carry and should affect pitcher expected hits/runs, batter production, YRFI probability, F5/full totals, team totals, and HR lanes.
  - HRForce >= 1.7 is extreme carry and should block casual unders unless the under has strong, explicit counterweights.
  - HRForce below 1.4, N/A, or dome/no-weather-impact is lower weather carry, but it is not by itself a strong under signal.
  - For evening starts at/after 6:00 PM local and night starts at/after 7:00 PM local, use FIC hourly game-window HRForce before promoting a weather-backed YRFI, over, HR, pitcher damage, or batter-production boost. If daily/current HRForce is high but game-time or early-game hourly HRForce is below 1.4, downgrade the weather piece to weak carry persistence/watch. If game-time HRForce starts high but the hourly window fades below 1.4 (`early_carry_fades` / `early_only_carry`), keep credit mostly to YRFI/first-five and haircut full-game/late-game totals.
  - If a game has high HRForce and the model still shows an under, inspect the chaos gate. The final row should usually be `Hold` unless the under is backed by starter suppression, weak split rows, low conversion, and bullpen quality together.

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
- Pregame value boards must use the current separated format:
  - full-game ML / side rows
  - first-five ML rows with tie/push risk visible
  - first-five O/U rows only when the stored line is real and the final lane is actionable `Over` or `Under`; `Pass`, `Hold`, and `Unsupported over` rows belong in research-only, never in POTD or top-value promotion
  - team-total rows from typed specialty market anchors, but show only first-five team totals on the value board
  - pitcher earned-runs rows from typed specialty market anchors
  - combined H+R+RBI rows
  - separate Hits, Runs, and RBI component rows
- Every MLB game should keep its market/model reads visible where data exists: ML shape, F5 ML, F5 O/U, F5 team totals, and YRFI/NRFI. The shadow calibration addendum should add `promoted`, `watch`, or `research` tiering plus reasons; it should not hide unpromoted rows.
- POTD eligibility comes from the shadow calibration tier, not raw model confidence. If a lane has no `promoted` row, show no POTD candidate for that lane rather than reaching into `watch` or `research`.
- ML shape promotion/sorting answers the `%confidence vs %diff/total` question this way: model confidence is the primary trust signal, edge versus market is second, and projected run-gap share is only margin support/tiebreak context. Do not sort ML shape primarily by `diff/total`; a lower-confidence big-margin row is a `watch` row unless the confidence bucket clears promotion.
- ML shape explanation text must interpret metric conflicts, not just list the numbers. If confidence is high but margin support is thin, label it as a closer-score win profile. If margin support is high but confidence is low, explain that confidence is too low to promote. If both agree, say both confidence and margin support back the read.
- Before games start, do not mark any current-day value-board row as `Hit` or `Miss`. Settlement styling belongs only to completed or started-and-finalized games with real result rows from the follow-up flow.
- For completed past slates, value-board rows should show green/red settlement only when a trusted result source exists:
  - full-game ML / side uses `fullGameHit`
  - first-five ML uses `first5Hit`
  - first-five O/U uses the stored first-five total result
  - combined H+R+RBI uses actual player H+R+RBI from the MLB boxscore
  - component Hits, Runs, and RBI must remain separate from the combined H+R+RBI lane
- Combined H+R+RBI rows should retain the clean-board context fields without deleting the underlying prediction: projected full-game team result, recent AB, and actual full-game team result after settlement. The value-board filter is projected full-game ML win, 70%+ confidence, and 30+ AB; do not require F5 ML win/hold for H+R+RBI.
- Combined H+R+RBI clean-board promotion also requires today's FantasyInfoCentral batter-vs-pitcher matchup check:
  - source: `https://www.fantasyinfocentral.com/mlb/daily-matchups`
  - command: `npm run data:warehouse:mlb-fic-daily-matchups -- --date YYYY-MM-DD`
  - warehouse outputs: raw HTML under `data-private/raw/fantasyinfocentral/mlb/daily-matchups/`, normalized JSON under `data-private/warehouse/mlb/fantasyinfocentral-daily-matchups/`, SQLite rows in `mlb_fic_daily_matchups`, and public-safe rows in `web/src/lib/mlb-fic-daily-matchups.generated.js`
  - hitter must be matched to today's listed opposing starter
  - minimum 5 career AB vs that pitcher
  - batter-vs-pitcher AVG over .300
  - batter-vs-pitcher OPS over .800
  - FIC row context now stores same-row HRF, qAB%, HH%, hits, 2B/3B, HR, BB, AVG, OBP, and OPS. Use the 5+ AB threshold before applying BvP to hits, total bases, HR, RBI/H+R+RBI, pitcher hits allowed, or pitcher earned-run risk.
  - if the hitter's recent OPS is low, keep the row as watch/research even if broader model context likes the bat
  - example failure shape: a player like Josh Naylor can clear broad HRR model context, but should not be clean-promoted if recent OPS/BvP strength does not satisfy the FIC gate
- FantasyInfoCentral Weather/HRForce should be present for the slate:
  - source: `https://www.fantasyinfocentral.com/mlb/weather/`
  - command: `npm run data:warehouse:mlb-fic-weather -- --date YYYY-MM-DD`
  - warehouse outputs: raw HTML under `data-private/raw/fantasyinfocentral/mlb/weather/`, normalized JSON under `data-private/warehouse/mlb/fantasyinfocentral-weather/`, SQLite rows in `mlb_fic_weather_daily`, and hourly rows in `mlb_fic_weather_hourly_daily`
  - HRForce >= 1.4 should raise HR/run-environment support and make unders prove more, especially when the hourly forecast also stays >= 1.4
  - HRForce >= 1.5 must be embedded into pitcher expected lines and batter expected production, not only displayed as a chip
  - HRForce >= 1.7 materially raises YRFI and over-tail probability when the lineup/starter/bullpen context is not suppressive
  - HRForce below 1.4 should be treated as lower HR/run-environment pressure
  - HRForce N/A usually means a dome/no-weather-impact ballpark; store it as `lower_runs_dome_na` rather than a missing high-carry signal
  - Evening/night games need game-window persistence: `game_time_hr_force` or `early_game_max_hr_force` should stay >= 1.4 before HRForce can promote YRFI, over, HR, pitcher damage, or batter production. If the persistence signal is `early_carry_fades` or `early_only_carry`, do not let HRForce be the reason to upgrade full-game or late-game overs.
  - HRForce must not be the only reason to promote an HR, over, or team-total over; it needs contact, starter, bullpen, lineup, price, or park support
- TheCapper umpire assignment context should be present and audited:
  - source: `https://thecapper.io/mlb/umpires/`
  - command: `npm run data:warehouse:mlb-umpires -- --date YYYY-MM-DD`
  - audit: `npm run data:audit:mlb-umpires -- --date YYYY-MM-DD`
  - warehouse outputs: raw HTML under `data-private/raw/thecapper/mlb/umpires/`, normalized JSON under `data-private/warehouse/mlb/thecapper-umpires/`, daily profiles in `mlb_umpire_profiles_daily`, game assignments in `mlb_umpire_assignments_daily`, and source status rows under `thecapper_mlb_umpires`
  - only rows with `date_match_status='exact'` may influence pitcher K, walk/run environment, or NRFI/YRFI context
  - if the audit reports `no-exact-umpire-game-matches`, `capture-date-differs-from-source-date`, or `unresolved-or-stale-assignment-rows`, keep the raw capture but treat umpire context as unavailable for that slate
- FantasyInfoCentral Umpire Factors should also be present as the profile/factor source:
  - source: `https://www.fantasyinfocentral.com/mlb/umpires`
  - command: `npm run data:warehouse:mlb-fic-umpire-factors -- --date YYYY-MM-DD`
  - warehouse outputs: raw HTML under `data-private/raw/fantasyinfocentral/mlb/umpires/`, normalized JSON under `data-private/warehouse/mlb/fantasyinfocentral-umpire-factors/`, SQLite rows in `mlb_fic_umpire_factors_daily`, and source status rows under `fantasyinfocentral_umpire_factors`
  - store `favors`, `games`, `Hits/G`, `BB/G`, `SO/G`, visitor/home score, home advantage, BA, OBP, and OPS
  - this is not an assignment source. It should join to a game only through an exact TheCapper or equivalent home-plate assignment by normalized umpire name.
- The HRR board should still show both combined H+R+RBI and separate Hits/Runs/RBI lanes. If the FIC gate removes a combined clean-board promotion, do not remove component prop rows unless their own component-specific filters fail.
- After fetching DraftKings MLB markets, verify the specialty market anchors are normalized into SQL-MLB. These are required context for inning-by-inning improvements and should not live only in public JSON:

```bash
python3 data-migration/scripts/ingest_mlb_markets_props_raw_to_typed.py --date YYYY-MM-DD --report data-migration/reports/ingest_mlb_markets_props_raw_to_typed_YYYY-MM-DD_specialty_anchors.json
sqlite3 data-private/warehouse/sports/mlb/sql-mlb.db "select market_type, count(*) from market_snapshots where captured_at like 'YYYY-MM-DD%' and source_name='draftkings' and market_type like 'teamTotal%' group by 1 order by 1;"
sqlite3 data-private/warehouse/sports/mlb/sql-mlb.db "select market_type, count(*) from prop_market_snapshots where market_date='YYYY-MM-DD' and source_name='draftkings' and market_type in ('pitcher_hits_allowed','pitcher_earned_runs_allowed','pitcher_record_win') group by 1 order by 1;"
```

Expected specialty anchors, when DK offers them:
- team total runs O/U, especially first 3 / first 5 / first 7 inning windows
- team total hits O/U when available
- pitcher hits allowed O/U
- pitcher earned runs allowed O/U
- pitcher to record a win, yes/no

If team total hits are absent from DK, leave that anchor missing rather than backfilling from JSON or inventing a line. The inning model should read typed anchors through `loadMlbSpecialtyMarketAnchorsFromDb`, with raw sportsbook files used only as the ingest source.
- Savant game logs are mostly redundant with the pitch/game warehouse. Use them as a player-page sanity check, not as the primary stored source, because `mlb_pitch_events`, `mlb_player_game_batting`, and `mlb_hitter_statcast_game_logs` should already preserve the underlying game data.
- Savant hitter splits are not redundant. The lineup export now persists the daily handedness/platoon split rows into `mlb_hitter_split_snapshots`; keep that table fresh before trusting prop or hitter-fit writeups.
- M2 uses lineup handedness splits as a game-level prediction adjustment, not just a hitter-card note:
  - count strong and weak split bats against today's listed starter hand
  - treat top-third and top-six split pockets as early-scoring/F5 inputs
  - some hitters cannot hit one side; do not let broad season OPS hide a weak same-day split row
  - strong split pockets should lift projected hits, run conversion, starter damage risk, YRFI pressure, and batter props
  - weak split pockets should lower projected hits/conversion and can support unders only when HRForce, bullpen, and repeat-matchup risk do not conflict
  - OPS values above `1.000` are valid OPS values, not batting-average thousandths; do not rescale them down during ingest or model parsing
- M2 uses the starter/batter matchup kernel as a game-level prediction adjustment:
  - current form comes first; recent cold form caps old BvP/history lift
  - batter split vs today's starter hand is required context for every posted hitter
  - pitcher ESPN `Right / Left` allowed splits must be read by the hitter's effective batting side, including switch hitters
  - Savant pitch-arsenal fit must compare hitter xBA, xSLG, xwOBA, hard-hit, whiff, and K profile against league average for the pitch types in the starter mix
  - keep xBA/xSLG/xwOBA at three decimals; rounding to hundredths hides the actual pitch-type edge
  - aggregate `starterMatchupKernelIndex` affects projected hits, run conversion, starter damage risk, ML/F5 ML shape, totals, YRFI/NRFI, and batter prop confidence
  - BvP is not a scoring input unless it is dated within the last 3 seasons and has at least 5 AB; undated/career aggregate BvP is context-only
- M2 uses starter pitch-mix weather archetype as a game-level prediction adjustment, not just a pitcher-card note:
  - read `pitcher_pitch_mix_snapshots` from the latest snapshot on or before the slate date when no exact-date snapshot exists
  - classify each starter as fastball-heavy, fastball-leaning, spin-heavy, offspeed-heavy, balanced, or unknown
  - cross the archetype with temperature, outdoor/dome status, ENV1 HRForce, and FIC HRForce
  - hot/high-HRForce outdoor games tax spin-heavy arsenals for grip/shape risk and can credit fastball-heavy or fastball-leaning arsenals for warm-up/velocity fit
  - cold weather can trim fastball benefit and modestly support spin-heavy pitch shape
  - apply the adjustment to projected starter-window hits, first-five runs, run conversion, starter hold confidence, ML/F5 ML shape, and YRFI/NRFI probability
  - never use HRForce as a clean under signal; low/N/A HRForce only removes weather carry, while high HRForce creates over-tail and under-fragility unless pitcher fit, split weakness, and bullpen availability explain the suppression
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
- Repeat starter-vs-opponent history is a mandatory pitcher checklist item:
  - check `opponentHistoryThisSeason` first, then recent StatMuse game rows when same-season rows are missing
  - if the starter already faced this opponent and allowed 4+ R/ER, 7+ H, first-inning damage, HR damage, or a short start, tax starter hold, projected hits allowed, first-five runs, and run conversion
  - if both listed starters recently leaked damage to the same opponent, do not trust a clean under without a visible explanation of why today's lineup/weather/bullpen context is different
  - suppression credit is allowed for a clean 6+ IP, <=1 R, <=5 H prior matchup, but it should be smaller than a damage tax because repeat exposure can still reduce novelty
  - the writeup should say whether repeat damage is active, neutral, or suppressive; hiding it behind a generic career-vs-team stat is not enough
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

After publish, normalize the cached MLB board artifacts into SQL-MLB so the board can be audited and graded from database rows later:

```bash
npm run data:backfill:mlb-cached-predictions -- --date YYYY-MM-DD
sqlite3 data-private/warehouse/sports/mlb/sql-mlb.db "select mr.run_date, pr.lane, pr.market_type, count(*) from prediction_rows pr join model_runs mr on mr.model_run_id=pr.model_run_id where mr.model_id='MLB-cached-board' and mr.run_date='YYYY-MM-DD' group by 1,2,3 order by 1,2,3;"
```

For old cached pages, backfill a range instead:

```bash
npm run data:backfill:mlb-cached-predictions -- --start YYYY-MM-DD --end YYYY-MM-DD
```

Expected normalized lanes include moneyline shape, first-inning YRFI/NRFI, F5 ML, F5 totals when present, full-game totals when present, player props, and home-run rows. Treat this as a storage/backfill step: it preserves the cached predictions and artifact lineage in `model_runs`, `model_artifacts`, and `prediction_rows`, but it does not rerun or change the original model picks.

Once an MLB game has started, cached prediction rows for that game must be frozen with `prediction_rows.is_final = 1`. Final rows are immutable audit evidence: refresh, replay, and backfill jobs must not update or delete them. If a later board refresh changes a still-pregame game, it may update only rows where `is_final = 0`; if the game is already underway, preserve the original prediction and write any new observation as a separate run/artifact instead.

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
- bridge, weather, park, starter pitch-mix/weather archetype, sun-position visibility, HR, and props are visibly present
- value-board rows are separated by trust level: validated rows can be promoted, research-only rows can be displayed, and uncalibrated rows cannot be ranked as value

If any of those fail, rerun or patch before trusting the board.

Current hard rule:
- First-five O/U rows are research-only after the May 31 failure. Do not publish them as bet-grade value until settled bucket calibration exists for line, ask, model probability, projected-run edge, chaos gate, and date-level walk-forward ROI.
- The web value board must filter model-owned rows only. Do not add UI-side value math for F5 ML, F5 O/U, totals, scalp trades, or any new market. If a lane is not in the cartridge output, it is not a value-board lane yet.
- First-five O/U display lines must come from the artifact's actual line fields, in this order: `postedFirst5TotalLine`, `derivedFirst5TotalLine`, then `runShareFirst5TotalLine`. Do not reconstruct a betting line from `projectedFirst5Total - edge`; tail overlays can change diagnostic edge fields and make that reconstruction invent fake lines.
- Guard null and blank line candidates before number conversion. `Number(null)` becomes `0`, and a non-positive F5 total line is a hard presentation/data bug, not a fallback.
- First-five O/U displayed projection, edge, probability, confidence, and ranking must use the real M2 starter-window run sum: `awayFirst5ProjectedRuns + homeFirst5ProjectedRuns`. Do not use `tailOverlay.adjustedProjectedRuns` as the public projection; preserve it only as diagnostic/gating context.
- Before deploy, audit value-board F5 O/U rows against the slate payload: displayed line, projected runs, edge, and lean must match stored fields and no row should show a synthetic value such as `F5 2.4` unless a sportsbook/source actually posted that number. Any row whose final lean is `Pass`, `Hold`, or `Unsupported over` must be excluded from POTD/top-value promotion even if its raw model probability is high.
- F5 ML confidence must account for push/tie risk. Games with a high modeled F5 tie probability, especially low projected F5 totals, should carry a confidence haircut or warning instead of ranking purely by side run edge.
- F5 O/U confidence must account for edge quality. Thin projected edges, volatile unders, weather/park carry, and chaos tags should reduce displayed confidence even when the lean remains visible.
- Sort/rank audits should explain why a row moved. For F5 ML, a team can rise because it owns the largest projected F5 run gap; that is a side-gap read, not automatic proof it is the safest value-board bet.
- Shadow calibration sorting should put `promoted` rows first, then `watch`, then `research`. Within each tier, sort by calibrated score, model confidence, model edge, and market edge. The row must expose the reason, caution flags, and evidence window used by the shadow addendum.
- For ML shape specifically, the public label should call run-gap share `margin support`, not `diff/total`, so users understand it explains cushion rather than overriding confidence.
- For UI-only value-board or shadow-calibration refreshes on already generated slates, publish only the affected public dates. Example for the June 6-8, 2026 refresh:

```bash
npm run publish:site -- --date 2026-06-08 --only-dates=2026-06-06,2026-06-07,2026-06-08
```

- Pregame batter Statcast bubbles may use the latest `mlb_hitter_statcast_trend_snapshots` row with `as_of_date <= slate date` when same-day Statcast has not landed yet. The exported trend object should carry `sourceAsOfDate` so stale-but-valid context is auditable.

## 6. End-of-Day Archive Loop

Use the standalone follow-up runbook for the full closeout sequence:

- [MLB Follow-Up Runbook](/Users/jcchen/Documents/New%20project/development-docs/mlb/runbooks/mlb-followup-runbook.md:1)

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
node models/mlb/cartridges/MLB-M2/research/inning_expected_batters_shadow.mjs --start START-YYYY-MM-DD --end END-YYYY-MM-DD
```

Starter-split shadow review must answer:
- Did ESPN/StatMuse split context lower confidence on bad high-confidence YRFI misses without damaging correct NRFI lanes?
- Did F5 O/U quality improve by avoiding severe misses, not merely by changing hit rate?
- Did F5 side/tie and F5 ML grading improve, and were tie-risk flags attached to games where the push path was meaningfully elevated?
- If a source row is missing from SQL-MLB, record the coverage gap. Do not use JSONL as a fallback.

Inning expected-batters shadow review must answer:
- Did the expected-batter inning model beat the simple league inning baseline on Brier score and calibrated hit rate?
- Did confidence thresholds improve quality? Check 52%, 55%, 58%, and 60% thresholds rather than forcing every inning into Run/No Run.
- Was the run better only when Statcast, starter-form, and market-anchor coverage was present? If coverage is partial, leave the model shadow-only and report the missing rows.
- Did the model improve innings 1-5 without inventing a bridge/late-inning read? Innings 6-9 stay blank until reliever/bridge coverage is trustworthy.

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

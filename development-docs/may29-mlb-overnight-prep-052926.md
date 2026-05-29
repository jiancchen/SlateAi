# May 29 MLB Overnight Prep

This note is the overnight handoff after closing `May 28` and refreshing the `May 29` MLB board.

## 1. May 28 closeout is done

- History, Models, Stories, and warehouse outputs are updated through `2026-05-28`.
- Graded `May 28` performance:
  - `MLB full game: 3-3`
  - `MLB first 5: 1-5`
  - `MLB first inning: 3-3`
  - `HR board: 1/12`
  - `Tracked props: 8/26`
- Main artifacts:
  - [/Users/jcchen/Documents/New project/published-data/history/2026-05-28.json](/Users/jcchen/Documents/New%20project/published-data/history/2026-05-28.json)
  - [/Users/jcchen/Documents/New project/development-docs/may28-slate-postmortem-052826.md](/Users/jcchen/Documents/New%20project/development-docs/may28-slate-postmortem-052826.md)
  - [/Users/jcchen/Documents/New project/development-docs/may28-chaos-followups-052826.md](/Users/jcchen/Documents/New%20project/development-docs/may28-chaos-followups-052826.md)

## 2. Fresh ML retrain through May 28

The expanded walk-forward rerun is done:

- [/Users/jcchen/Documents/New project/development-docs/mlb-market-ml-training-052926.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-market-ml-training-052926.md)
- [/Users/jcchen/Documents/New project/data-private/predictions/mlb-market-fitness/2026-05-28-fitness.json](/Users/jcchen/Documents/New%20project/data-private/predictions/mlb-market-fitness/2026-05-28-fitness.json)

Current honest status:

- `Moneyline`: still not promotable
  - `1560` OOF rows
  - threshold record `131-124` on `255` plays
  - utility `-55.0`
- `First 5`: still not promotable
  - `1318` OOF rows
  - threshold record `110-101` on `211` plays
  - utility `-41.5`
- `Totals`: still the only lane the ML layer can even weakly justify
  - `138` OOF rows
  - threshold record `20-12` on `32` plays
  - utility `+2.0`
- `First inning`: still not promotable
  - `171` OOF rows
  - threshold record `25-20` on `45` plays
  - utility `-5.0`

The key lesson did not change: the side engines still need better market framing and better targets more than they need a fancier classifier.

## 3. Statcast trend layer is now live in props

The rolling hitter Statcast warehouse layer is no longer just a research table. It now feeds the live prop scorer:

- rolling `7/14/30` `xwOBA`
- rolling `7/14/30` `hard-hit%`
- rolling `7/14/30` `barrel%`
- rolling `7/14/30` `sweet-spot%`
- trend deltas such as `7d - 30d`

Current live usage:

- `totalBases`: promoted
- `singles`: cautious support
- `homeRun`: filter / tie-break only, still not a primary trigger

Refined read after the follow-up audit:

- `totalBases`: `7d xSLG` is now one of the clearest useful filters, alongside `7d xwOBA`, `hard-hit%`, and `barrel%`
- `singles`: `7d xBA` is only modestly useful by itself, but `7d xBA + sweet-spot%` looks better than the raw singles baseline
- `homeRun`: still too noisy even after adding `xSLG`; keep it in filter-only mode

For the current `May 29` prop export:

- total tracked props: `29`
- by type:
  - `17` total bases
  - `3` singles
  - `9` pitcher strikeouts
- Statcast tags attached:
  - `statcast-power-up`: `19`
  - `statcast-contact-up`: `12`
  - `statcast-hr-carry`: `9`
  - `statcast-fade`: `4`

Reference files:

- [/Users/jcchen/Documents/New project/development-docs/mlb-hitter-statcast-signal-052826.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-hitter-statcast-signal-052826.md)
- [/Users/jcchen/Documents/New project/development-docs/mlb-live-gate-candidates-052926.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-live-gate-candidates-052926.md)
- [/Users/jcchen/Documents/New project/development-docs/mlb-pitcher-strikeout-gates-052926.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-pitcher-strikeout-gates-052926.md)
- [/Users/jcchen/Documents/New project/data-private/predictions/mlb-player-props/2026-05-29-player-props.json](/Users/jcchen/Documents/New%20project/data-private/predictions/mlb-player-props/2026-05-29-player-props.json)
- [/Users/jcchen/Documents/New project/development-docs/mlb-hr-filter-signal-052926.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-hr-filter-signal-052926.md)

HR-specific follow-up:

- `opposing pitcher HR/9` is a better live HR filter than generic park hype in the current prototype sample
- `high park HR index` by itself is actually underperforming the base HR board
- current read: use HR context to **block** bad bomb picks before using it to promote good ones

## 4. New losing-team / bounceback research

New research:

- [/Users/jcchen/Documents/New project/development-docs/mlb-bounceback-cohort-research-052926.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-bounceback-cohort-research-052926.md)
- [/Users/jcchen/Documents/New project/development-docs/mlb-phase1-context-research-052926.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-phase1-context-research-052926.md)
- [/Users/jcchen/Documents/New project/development-docs/mlb-opponent-quality-side-gates-052926.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-opponent-quality-side-gates-052926.md)
- backed by [/Users/jcchen/Documents/New project/pipeline/research_mlb_bounceback_cohorts.py](/Users/jcchen/Documents/New%20project/pipeline/research_mlb_bounceback_cohorts.py)

Most useful takeaway:

- `Loss but not dead` is materially different from `slumping loser`.
- Since `2026-04-15`:
  - `loss but not dead`: `51.1%` next-game win rate, `58.4%` first-five non-loss rate
  - `slumping loser`: `42.5%` next-game win rate, negative average first-five run diff
  - `high snapback, low form`: only `30.4%` next-game win rate even though it avoids a first-five loss `60.9%` of the time

This matters because a losing team with real competitive shape is not the same thing as a dead-bat loser, and the board should stop treating them the same.

The new phase-1 context pass adds an important schedule-quality wrinkle:

- `loss but not dead + hard schedule` is the better resistance / bounceback lane
- `slumping loser + hard schedule` is the really ugly bucket
- `slumping loser + soft schedule` unexpectedly rebounded well in this sample, so a bad recent record against soft teams should not be auto-faded without checking opponent quality first

## 5. May 29 board status right now

The `May 29` site payload is refreshed and published, but lineup maturity is still poor:

- `15` MLB games active
- `0` posted team lineups
- `30` partial team lineups
- `12` HR picks
- `33` tracked props
  - `17` total bases
  - `3` singles
  - `13` pitcher strikeouts

That means the current board is usable as a live pre-lineup desk, but not as a fully locked final board.

Trust hierarchy for this snapshot:

- best live research lane: `TB` props with the new Statcast layer
- secondary research lane: pitcher strikeouts
- cautious lane: singles
- low-trust lane: HR
- still low-trust on model-fitness grounds: moneyline, first 5, first inning as standalone ML recommendations

The newest keeper/fade gates from the overnight pass:

- `TB`: keep hitters with **high 7d xSLG + high 7d hard-hit%**
- `TB`: fade hitters with **low 7d xSLG + high cold-streak**
- `Singles`: keep hitters with **high 7d xBA + high sweet-spot%**
- `Singles`: fade **low xBA + high whiff**
- `F5`: haircut or pass **dead-early-risk + low-conversion** side picks
- `K overs`: best current keep lane is **posted lineup + opponent-whiff-lane + normal starter volume**
- `K unders`: still weaker than the over lane; keep in caution mode until the sample grows

Newest phase-2 hitter findings:

- `Last 10` classic hitter windows did **not** beat the current short-window baseline for `hits` or `TB`
- `xBA` alone was weak for `hits`; it only became mildly interesting when paired with:
  - high sweet-spot contact
  - positive pitch fit
- opponent strength helped more as a **correction layer** than as a raw replacement stat
  - `weighted minus raw hits/PA` was the useful signal, not raw weighted production itself
- the first shadow `hits` bundle:
  - `xBA + sweet-spot + fit + opponent strength`
  - improved rate on a tiny sample only, so it stays research-only for now
- the stronger shadow `TB` bundle did hold up:
  - `xSLG >= Q60 + hard-hit >= Q75 + positive opponent-strength delta`
  - `48.6%` on `35` bets vs `31.0%` baseline
  - this is the best current candidate for a future live `TB` gate

Newest first-inning gate findings:

- `Quiet + clean NRFI` is the best current NRFI keep lane:
  - `63.6%` on `11` picks
- `Pitcher-leak + double-live YRFI` is the best current YRFI keep lane:
  - `87.5%` on `8` picks
- `Double-live YRFI` is materially better than `one-side carry YRFI`:
  - `64.7%` vs `35.7%`
- `Quiet-shape YRFI` is the current danger bucket and should stay on a short leash

## 6. Specific flags for today

From the new bounceback cohort pass, the current `May 29` teams worth special handling are:

- `Loss but not dead`
  - Orioles
  - Padres
  - Giants
  - Nationals
- `Slumping loser`
  - Athletics
  - Rockies
  - Royals
  - Twins
  - Rays
  - Rangers

Interpretation:

- `loss but not dead` should resist automatic fade logic
- `slumping loser` is a better negative side selector / dead-early warning
- `high snapback, low form` should be treated as a chaos warning, not a blind bounceback buy

## 7. Overnight automation

An hourly heartbeat automation is already in place:

- ID: `overnight-mlb-refresh-and-research`

It is set to keep working through the overnight window by:

- refreshing probable pitchers and lineups
- republishing the board if the slate changes
- continuing MLB research/backtesting around:
  - Statcast TB / singles
  - HR contact-quality filters
  - bounceback / dead-bat selectors
- running closeout automatically if the active date settles

## 8. Best next model upgrades

- Use the new bounceback cohort flags directly in the live reason stack.
- Split losing-team handling into:
  - `loss but not dead`
  - `slumping loser`
  - `high snapback, low form`
- Keep expanding the Statcast layer for props, especially:
  - `rolling xSLG`
  - `pulled-air%`
  - pitcher `hard-hit` / `barrel` / `xSLG` allowed
- Do not promote HR off Statcast alone yet; keep using it as a stricter filter.
- Keep ML/F5/1st-inning deployment conservative until a pass-first or hold/collapse framing model beats the current baseline.

## 9. Live side flags now surfaced

- The MLB side analysis layer now surfaces the new state buckets directly in its note stack:
  - `opponent slumping loser`
  - `loss but not dead` resistance
  - `pick high snapback / low form` danger
- This is intentionally a light-touch confidence/volatility haircut, not a full side-model replacement.

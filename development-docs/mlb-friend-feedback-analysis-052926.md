# MLB Friend Feedback Analysis — May 29, 2026

This note converts the external MLB feedback into a real modeling and UI backlog instead of leaving it buried in chat.

The goal is not to treat every idea as correct by default. The goal is to split the feedback into:

- `already partly true`
- `worth testing`
- `good for UI even if not yet model-ready`
- `needs more data before we trust it`

## Executive read

The best parts of the feedback are:

1. **Use different stats for different markets**
   - `xBA` for hits
   - `xwOBA` / `xSLG` for total bases
   - `barrel%` / `hard-hit%` / `xSLG` for HR
   - a separate run-production score for `H+R+RBI` / `RBI`

2. **Move recent windows from 5-game only to 10-game and mixed windows**
   - last `5` is too twitchy
   - last `10` should exist alongside `5`, not replace it entirely

3. **Add opponent-quality and market-context memory**
   - did the recent games go over/under the Vegas total?
   - were those recent games against strong opponents or weak opponents?

4. **Treat “OPS-style production” differently from “quality of contact”**
   - that distinction is correct
   - run-production and contact quality should not be the same score

## Direct feedback verdict table

| Feedback item | Verdict | Current state | What’s missing | Priority |
| --- | --- | --- | --- | --- |
| Switch from `OBP + SLG` to `OBP x SLG` | Worth testing, but do **not** call it OPS | We currently compute standard `OPS = OBP + SLG` in the lineup exporter | Need a separate derived metric and validation against run-production props | `P1` |
| Use recent OPS-style production + pitcher matchup + pitch type for `H+R+RBI` | Strong idea | We already have `RBI`, lineup slot pressure, projected runs/hits, matchup grade, pitch-type fit | We do **not** yet model `H+R+RBI` as a dedicated market or a true batting-production score | `P1` |
| Track last `10` instead of only `5` | Strong | Current hitter-state table is mostly last `5`; Statcast table already has `7/14/30` | Need classic non-Statcast last `10` batter state, streak, and team context windows | `P1` |
| Track whether recent games went over/under Vegas total | Strong | We already warehouse featured market odds and final scores | Need derived team/game over-under history windows and UI surfacing | `P1` |
| See strength of opponents in past games | Strong | Very limited today | Need opponent-quality index for hitter and team history windows | `P0` |
| Use `xBA + pitcher matchup + pitch type` for hits | Strong | Hits props exist in code but are disabled live | Need dedicated hits backtest using `xBA`, fit, and pitcher contact allowed | `P1` |
| Use `xwOBA + pitcher matchup + pitch type` for base suggestions | Strong | TB is already partly using Statcast trends + matchup fit | Need cleaner explicit weighting and validation that `xwOBA` adds value beyond `xSLG` | `P0` |
| Use `barrel% + xSLG + hard-hit% + park + weather + pitcher matchup + pitch type` for HR | Good as a filter stack, not a pure green-light model yet | We already use pieces of this in HR | Need deeper archived HR trend context and pitcher-contact-allowed context to trust it more | `P1` |

## The biggest conceptual correction

The feedback is directionally right, but one piece needs a naming fix:

- `OPS` is the standard baseball stat `OBP + SLG`
- `OBP x SLG` is **not** “more accurate OPS”

That does **not** mean it’s useless.

What it means:

- if we use `OBP x SLG`, it should be treated as a **new derived interaction score**
- not a replacement label for standard `OPS`

Best practice:

- keep standard `OPS`
- add a second derived stat, something like:
  - `OBP-SLG interaction`
  - `production interaction score`
  - `run-pressure interaction`

That keeps the math honest while still letting us test whether the product is more predictive for run-production props.

## Market-by-market assessment

## 1. Hits

Friend feedback:
- use `xBA + pitcher matchup + pitch type`

My read:
- this is one of the best suggestions in the whole list
- hits should be much closer to a **ball-in-play quality** model than a power model

What should drive hits:
- rolling `xBA`
- pitcher-hand split fit
- pitch-type fit
- contact quality / sweet-spot support
- opponent pitcher weak-contact suppression

What should **not** drive hits too much:
- barrel-heavy power metrics
- generic HR context

Current state:
- `hits` exists in the prop engine
- but it is still disabled for live tracking
- current live contact work is stronger for `singles` than for generic `hits`

Verdict:
- build a real `hits` backtest next using:
  - `rolling_7/14/30_xba`
  - sweet-spot%
  - pitch-type fit
  - pitcher contact suppression

## 2. Total Bases

Friend feedback:
- use `xwOBA + pitcher matchup + pitch type`

My read:
- correct, but for TB the strongest current Statcast signal is actually:
  - `xSLG`
  - `hard-hit%`
  - `barrel%`
- `xwOBA` is still useful, but TB is really about **damage**, not just general offensive quality

Current backtest read:
- best current gate is:
  - high `7d xSLG`
  - high `7d hard-hit%`
  - optional barrel confirmation

Verdict:
- use `xwOBA` as a support signal
- but keep `xSLG + hard-hit + barrel` as the main TB lane

## 3. HR

Friend feedback:
- use `barrel%` as biggest factor
- plus `xSLG`, `hard-hit%`, ballpark, weather, pitcher matchup, pitch type

My read:
- this is the right **shape**
- but the backtests still do **not** justify treating barrel alone as a clean HR green light

Current honest state:
- HR remains noisy
- park-only hype is weak
- opposing pitcher `HR/9` is modestly useful
- Statcast-only HR filters are still too immature in the archive

Verdict:
- use this as a **filter stack**
- not as a standalone “top barrel guys are home-run picks” engine

Best current HR hierarchy:
1. pitcher HR damage allowed
2. hitter barrel / hard-hit / xSLG trend
3. pitch-type fit
4. park + weather

## 4. H+R+RBI / run-production scoring

Friend feedback:
- recent OPS-style production + matchup + pitch type should be a true batting score

My read:
- yes, and this is where the feedback is most different from what we currently do

Why this matters:
- `hits`
- `TB`
- `HR`
- `RBI`

should **not** all share the same batting score

What a real run-production score should emphasize:
- lineup slot
- team projected traffic
- OBP-SLG interaction or standard OPS-style production
- recent extra-base / run-creation form
- matchup fit vs today’s starter
- pitch-type fit

What it should downweight:
- pure single-event contact luck

Verdict:
- build a separate `batting production score`
- use it first for:
  - `RBI`
  - future `H+R+RBI`
  - possibly `runs scored`

## 5. Last 10 instead of last 5

Friend feedback:
- track last `10` instead of `5`

My read:
- correct, but the right answer is `5 + 10 + longer context`

Why:
- last `5` catches heat/cold quickly
- last `10` is more stable
- `14/30` Statcast windows are already helping

Best structure:
- keep last `5`
- add last `10`
- keep Statcast rolling `7/14/30`

Verdict:
- do **not** replace last `5`
- add last `10` alongside it

## 6. Track if past games went over/under Vegas line

Friend feedback:
- use over/under history in recent team context

My read:
- this is strong and underused

Why it helps:
- tells us whether a team’s recent games were truly high-event or just happened to finish with certain raw run totals
- gives better context for:
  - sides
  - totals
  - run-production props

Current state:
- we already warehouse:
  - featured market odds snapshots
  - game totals / outcomes

What’s missing:
- derived rolling team history like:
  - last `10` games over rate
  - last `10` games under rate
  - average close vs line
  - opponent-adjusted over/under behavior

Verdict:
- this should become both:
  - a model feature
  - a UI story row

## 7. Strength of opponents in past games

Friend feedback:
- see strength of opponents in past games

My read:
- this is probably the **most important missing context**

Why:
- a hitter can look hot against weak staffs
- or look cold against elite staffs while actually making good contact

This matters for:
- `hits`
- `TB`
- `HR`
- side/bounceback logic
- dead-bat / dead-early interpretation

Needed opponent-quality layers:
- opponent team win form
- opponent starter quality
- opponent bullpen quality
- opponent contact suppression / damage allowed
- opponent handedness/pitch-mix difficulty

Verdict:
- this is `P0`
- many of the other ideas get better once this exists

## What we already have that supports the feedback

Already live or warehoused:

- standard `OPS` via `OBP + SLG`
- rolling `7/14/30` hitter:
  - `xwOBA`
  - `xBA`
  - `xSLG`
  - `barrel%`
  - `hard-hit%`
  - `sweet-spot%`
- pitch-type matchup fit
- pitcher-hand splits
- park factor
- weather
- pitcher strikeout lines
- featured market odds snapshots

Already partly live in the prop system:

- `TB` uses Statcast trend support
- `Singles` uses cautious Statcast support
- `HR` uses filter-only Statcast support
- `RBI` exists, but not yet as a true production-score market
- `Hits` exists in code, but is currently disabled live

## What is missing

1. `last 10` classical hitter state windows
2. opponent-quality scoring for past games
3. team/game `over-under vs Vegas` history windows
4. a separate `batting production score`
5. a tested `OBP x SLG` interaction metric
6. a true `hits` backtest lane
7. a proper `H+R+RBI` market lane

## Recommended build order

## P0

1. Add opponent-quality weighting to recent hitter/team windows
2. Build rolling team `over/under vs Vegas` history
3. Make TB explicitly favor:
   - `xSLG`
   - `hard-hit%`
   - `barrel%`
   - plus matchup fit

## P1

4. Add `last 10` hitter state windows beside `last 5`
5. Backtest `hits` using:
   - `xBA`
   - sweet-spot%
   - pitch-type fit
   - pitcher contact suppression
6. Build and test a derived `OBP x SLG` interaction score

## P2

7. Build a proper `batting production score`
8. Use it for:
   - `RBI`
   - future `H+R+RBI`
   - maybe runs scored
9. Expand HR filters once archived Statcast trend coverage is deeper

## Best next experiments

These should become explicit experiment rows, not just ideas:

- `F16` Opponent-quality weighted hitter history
- `F17` Team over/under vs Vegas rolling history
- `F18` Hits prop backtest with `xBA + pitch fit + pitcher suppression`
- `F19` OBP-SLG interaction score for run production
- `F20` Batting production score for `RBI / H+R+RBI`

## UI opportunities from this feedback

Even before every model is live, this feedback can improve presentation:

- show `Last 10` next to `Last 5`
- show recent `O/U vs line`
- show recent opponent-strength badges
- show `xBA / xwOBA / xSLG` trend blocks by market type
- show a separate `batting production` panel vs `contact quality` panel

## Bottom line

Your friend’s feedback is good.

The strongest parts are:

- use market-specific hitter stats instead of one generic batting score
- add last `10`
- add opponent strength
- add recent `over/under vs line`
- separate run-production scoring from pure contact quality

The one thing I would correct is:

- `OBP x SLG` may be worth testing
- but it should be treated as a new derived score, not called `OPS`

If we build this correctly, the immediate wins are probably:

1. better `TB`
2. better `hits`
3. better `RBI`
4. better UI story context

before it becomes a better `HR` model.

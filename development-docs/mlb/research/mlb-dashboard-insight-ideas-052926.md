# MLB Dashboard Insight Ideas — May 29, 2026

This note translates the newer research signals into **UI modules** that can help decision-making even before every model change is promoted live.

The goal is not to clutter the card. The goal is to show:

- whether recent form was **earned**
- whether recent form was **soft**
- whether a hitter/team faced a **tough slate**
- whether the live prop edge is backed by the right contact shape

## What the new research suggests

### 1. Raw `last 10` is not enough

The phase-2 `last 10` study showed:

- raw last-10 box-score form did **not** beat the short-window baseline for `hits` or `TB`
- so a plain “last 10 was hot” badge is not enough

UI lesson:

- show `last 10`, but do **not** present it as predictive by itself

### 2. Opponent strength matters more as a **correction layer**

The opponent-strength study showed:

- raw weighted last-10 production was often worse than the baseline
- but the **weighted minus raw** delta was useful:
  - `hits`: `+8.3` points
  - `singles`: `+6.0` points
  - `TB`: `+4.8` points

UI lesson:

- the best question is not “was he hot?”
- it is “was that heat **earned against strong opponents**, or was it inflated by a soft run?”

### 3. TB is the best current target for richer contact-quality UI

The best new shadow bundle so far was:

- `xSLG >= Q60`
- `hard-hit >= Q75`
- positive opponent-strength delta
- `48.6%` hit rate on `35` bets vs `31.0%` baseline

UI lesson:

- `TB` cards should show **damage + contact + schedule context**
- not just generic recent form

## Recommended dashboard modules

## A. Earned Heat / Soft Heat bubble

Best use:

- hitter cards
- overperform hitter chips
- prop cards for `hits`, `singles`, `TB`

Definitions:

- `Earned heat`
  - recent form looks good
  - opponent-strength delta is positive
  - the player did it against decent or winning opponents
- `Soft heat`
  - recent form looks good
  - opponent-strength delta is negative or flat
  - the player may have farmed weak opponents
- `Earned slump`
  - recent form looks bad
  - opponent-strength delta is positive
  - the player may be better than the box-score streak suggests
- `Real slump`
  - recent form looks bad
  - opponent-strength delta is also negative

Suggested UI:

- one pill or bubble near the hitter summary
- tones:
  - green: `Earned heat`
  - amber: `Soft heat`
  - blue: `Earned slump`
  - red: `Real slump`

## B. Tough-Slate Tax indicator

Best use:

- hitter cards
- team lineup summary
- prop detail popover

Definition:

- recent games came against above-average opponents
- raw box-score form should be discounted less when the recent slate was tough

Suggested text:

- `Tough slate tax`
- `Soft slate boost`

Useful fields already available:

- `avg_opponent_win_pct_last5_last10`
- `games_vs_winning_last10`
- `games_vs_positive_run_diff_last10`

## C. Form Matrix upgrade

Current board already shows strong story matrices in places. The next upgrade is to add a hitter-level matrix row for:

- `Raw`
- `Weighted`
- `Delta`

For last `5` / last `10` hitter form, the columns can be:

- last 5 games
- last 10 games
- vs winning teams

Rows:

- `Hits`
- `TB`
- `Whiff`
- `xBA`
- `xSLG`
- `Delta`

This would make it very easy to see:

- hot but soft
- cold but earned
- damage rising even if raw hits are not

## D. TB support panel

Best use:

- `TB` prop card
- hitter modal / popover

Show three stacked signals:

1. `Damage`
   - `7d xSLG`
   - `7d hard-hit%`
   - `barrel%`

2. `Contact support`
   - `xwOBA`
   - sweet-spot%

3. `Slate quality`
   - opponent-strength delta
   - games vs winning teams

Suggested summary label:

- `Damage backed`
- `Damage soft`
- `Damage vs weak arms`

## E. Hits / Singles caution panel

Best use:

- `hits` and `singles` props once those lanes mature

The research so far says:

- `xBA` alone is not enough
- `last 10` alone is not enough

So the card should avoid fake certainty and instead explain:

- `xBA live`
- `sweet-spot live`
- `fit live`
- `recent slate soft/tough`

Suggested status labels:

- `Contact backed`
- `Contact soft`
- `Pitch fit only`
- `Too thin`

## F. Team-level story rows

For the existing team story blocks, add:

- `OppQ`
  - opponent quality recent
- `Mkt`
  - once totals history is available, recent over/under vs Vegas line

This would sit naturally beside the existing:

- `Bat`
- `SP`
- `RP`
- `Mkt`

For example:

- `OppQ: Tough`
- `OppQ: Soft`
- `O/U: 7/10 over`

## Recommended first UI additions

If we keep this practical, the best first adds are:

1. `Earned heat / soft heat` bubble on hitter summaries
2. `Tough-slate tax` badge in prop popovers
3. `TB support panel` for total-bases props
4. add an `OppQ` row to the story matrix / context strip

These four would add the most decision value without redesigning the whole card.

## What not to show yet

Do not surface the following as if they are proven edges:

- raw `last 10` as a predictive badge
- high `xBA` alone
- raw weighted last-10 production alone

Those can appear in detail views, but not as strong recommendation signals.

## Bottom line

The new UI should help answer:

- Is the recent form real?
- Was it earned against good opponents?
- Is the hitter’s contact quality backing the prop?
- Is this a strong `TB` shape or just noisy recent production?

That is the most useful way to turn the new warehouse work into better decisions, even before every signal is fully promoted into the live scorer.

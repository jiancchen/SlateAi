# MLB Pitcher Strikeout Gates — May 29, 2026

This is a first keeper/fade pass on the pitcher strikeout lane from the settled May journals.

Sample:
- settled `pitcherStrikeouts` rows: `21`
- dates covered: `2026-05-27` through `2026-05-28`

## Gate table

| Gate | Hits | Bets | Hit rate |
| --- | --- | --- | --- |
| Baseline K props | 8 | 21 | 38.1% |
| Overs only | 5 | 10 | 50.0% |
| Unders only | 3 | 11 | 27.3% |
| Overs + opponent-whiff-lane | 4 | 6 | 66.7% |
| Overs + posted lineup | 5 | 10 | 50.0% |
| Overs + posted lineup + opponent-whiff-lane | 4 | 6 | 66.7% |
| Unders + short-leash-risk | 1 | 3 | 33.3% |
| Unders + contact-resistance | 1 | 4 | 25.0% |
| Unders + short-leash-risk/contact-resistance | 2 | 7 | 28.6% |

## What it says so far

- The sample is still small, so this is a **directional** read, not a finished model.
- Even with that caveat, the split is already useful:
  - `Overs` are at least viable: `50.0%`
  - `Unders` are poor: `27.3%`
- The cleanest early over lane is:
  - posted lineup
  - opponent whiff-friendly
  - starter volume live / normal leash
- The current under lane is not trustworthy enough yet. `short-leash-risk` and `contact-resistance` are not producing a strong enough keeper edge by themselves.

## Practical live use

For now:

1. Keep `K overs` when the starter has a real volume lane and the opponent is explicitly whiff-friendly.
2. Be more skeptical of `K unders` unless the short leash and contact suppression are both unusually strong.
3. Treat every `K under` as a thinner research lane than `TB`.

## Next upgrade

The next real improvement is to warehouse opponent strikeout-pressure context directly instead of inferring it from the note string:

- lineup rolling K-rate
- team whiff/chase/contact profile by handedness
- ump / called-strike environment if we can source it reliably
- starter first-time-through vs full-outing K shape

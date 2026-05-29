# MLB Home Run Filter Audit

This pass audits the HR prototype board using actual saved daily prototype exports, settled home-run backtests, and the warehouse Statcast trend snapshots.

- total graded prototype picks: `132`
- base HR hit rate: `18.9%`

## Quartile Reads

| Feature | Low quartile hit rate | High quartile hit rate | Delta |
| --- | --- | --- | --- |
| `pitcher_hr9` | 17.9% | 23.5% | +5.6 pts |
| `park_hr_index` | 30.0% | 13.3% | -16.7 pts |
| `xwoba7` | 15.2% | 18.2% | +3.0 pts |
| `xslg7` | 21.2% | 15.2% | -6.1 pts |
| `hard_hit7` | 11.1% | 17.6% | +6.5 pts |
| `barrel7` | 20.6% | 17.1% | -3.4 pts |
| `sweet_spot7` | 20.5% | 18.2% | -2.3 pts |
| `hard_hit_trend` | 14.7% | 18.2% | +3.5 pts |
| `barrel_trend` | 14.7% | 15.2% | +0.4 pts |

## Compound Buckets

- `high opposing pitcher HR/9`: 34 picks, 23.5% hit.
- `high park HR index` alone: 75 picks, 13.3% hit.
- `high 7d xSLG + hard-hit + pitcher HR/9`: 2 picks, 0.0% hit.
- `high park index but low opposing HR/9`: 20 picks, 5.0% hit.
- `low opposing HR/9 + no hitter contact carry`: 20 picks, 25.0% hit.

## Early read

- `Opposing pitcher HR/9` helps a little. It is a better filter than generic park hype in this sample.
- `High park HR index` by itself is actually running worse than the base board. That suggests the current HR board may still be overpaying for obvious bomb parks without enough pitcher or hitter quality underneath it.
- `7d xSLG`, `7d hard-hit%`, and `7d barrel%` still make more sense as hitter-side support than `sweet-spot%` by itself for HR.
- The sample is still too small to declare a strong green-light HR lane. The better use is to create a **fade gate** that blocks park-only or low-HR9 matchups from getting promoted too aggressively.

## Next step

- Keep `homeRun` in filter-only mode.
- Add a live fade penalty when the board has `high park index` but the opposing starter's `HR/9` is bottom-quartile.
- Do not let park context outweigh weak pitcher HR-allow shape or weak hitter contact carry.

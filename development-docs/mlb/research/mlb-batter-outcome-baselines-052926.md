# MLB Batter Outcome Baselines — May 29, 2026

This is the first explicit outcome baseline for the batting-production path. The goal is not to crown a live edge yet; it is to make `hits`, `runs`, `RBIs`, and `H+R+RBI` stand on their own historical footing before we let the combined ladder pretend to be `TB`-grade.

- batter-game sample: `17162`
- 7d xBA Q4 threshold: `0.301`
- 7d xwOBA Q4 threshold: `0.379`
- 7d xSLG Q4 threshold: `0.505`
- 7d sweet-spot Q4 threshold: `36.4%`

## Component Baselines

| Component | Sample | Mean | Typical line | Higher line |
| --- | --- | --- | --- | --- |
| Hits | 17162 | 0.79 | >=1: 55.7% | >=2: 18.6% |
| Runs | 17162 | 0.43 | >=1: 34.8% | >=2: 7.0% |
| RBIs | 17162 | 0.41 | >=1: 27.1% | >=2: 9.5% |
| H+R+RBI | 17162 | 1.62 | >=2: 41.2% | >=3: 25.9% |

- Hits typical line `>=1` / higher line `>=2`
- Runs typical line `>=1` / higher line `>=2`
- RBIs typical line `>=1` / higher line `>=2`
- H+R+RBI typical line `>=2` / higher line `>=3`

## H+R+RBI By Lineup Slot

| Slot bucket | Sample | H+R+RBI >= 2 | Mean total |
| --- | --- | --- | --- |
| Slots 1-3 | 5483 | 47.1% | 1.88 |
| Slots 4-5 | 3722 | 44.8% | 1.76 |
| Slots 6-9 | 7957 | 35.6% | 1.38 |

## First Simple Gates

| Component | Prototype gate | Sample | Hit rate |
| --- | --- | --- | --- |
| Hits | xBA Q4 + sweet-spot Q4 + non-negative OppQ delta | 1085 | 58.0% |
| Runs | slot <= 3 + xwOBA Q4 + non-negative OppQ delta | 941 | 44.1% |
| RBIs | slots 3-5 + xSLG Q4 + non-negative TB OppQ delta | 904 | 31.5% |
| H+R+RBI | slot <= 5 + xwOBA Q4 + positive H/TB deltas | 1224 | 48.0% |

## Read

- `Hits` baseline is `>=1: 55.7%`; the first simple pregame gate moved that to `58.0%` on `1085` batter-games.
- `Runs` baseline is `>=1: 34.8%`; the first simple slot + xwOBA gate moved that to `44.1%` on `941` batter-games.
- `RBIs` baseline is `>=1: 27.1%`; the first simple power-slot gate moved that to `31.5%` on `904` batter-games.
- `H+R+RBI` baseline at `>=2` is `>=2: 41.2%`; the first simple combined gate moved that to `48.0%` on `1224` batter-games.
- This is still a baseline report, not a production promotion. The runs lane is especially provisional because explicit `OBP / XOPS` snapshot history is not warehoused yet, so the current run gate leans on slot + xwOBA + opponent-strength delta as a stand-in.
- The immediate value of this report is separation: we can now see which component behaves cleanly enough to tune next instead of treating `H+R+RBI` as one opaque blob.

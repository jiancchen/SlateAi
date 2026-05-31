# MLB Batter Outcome Gate Sweeps — May 29, 2026

This is the first focused sweep after the batter-outcome corpus landed. The goal is to see which simple pregame gate families actually move `runs`, `RBIs`, and `H+R+RBI` enough to deserve the next modeling pass.

- batter-game sample: `17162`
- 7d xwOBA Q4 threshold: `0.379`
- 7d xSLG Q4 threshold: `0.505`
- 7d sweet-spot Q4 threshold: `36.4%`

## Runs Gates

| Gate | Sample | Hit rate |
| --- | --- | --- |
| Baseline runs >= 1 | 17162 | 34.8% |
| slot <= 3 + xwOBA Q4 | 1759 | 42.9% |
| slot <= 3 + xwOBA Q4 + OppQ hits delta >= 0 | 838 | 43.2% |
| slot <= 5 + xwOBA Q4 + sweet-spot Q4 | 1090 | 40.0% |

## RBI Gates

| Gate | Sample | Hit rate |
| --- | --- | --- |
| Baseline RBI >= 1 | 17162 | 27.1% |
| slots 3-5 + xSLG Q4 | 1583 | 32.7% |
| slots 3-5 + xSLG Q4 + TB OppQ delta >= 0 | 844 | 31.4% |
| slots 2-5 + xSLG Q4 + xwOBA Q4 | 1828 | 32.9% |

## H+R+RBI Gates

| Gate | Sample | Hit rate |
| --- | --- | --- |
| Baseline H+R+RBI >= 2 | 17162 | 41.2% |
| slot <= 5 + xwOBA Q4 | 2738 | 48.2% |
| slot <= 5 + xwOBA Q4 + positive H/TB deltas | 1081 | 47.2% |
| slot <= 5 + xwOBA Q4 + xSLG Q4 | 2206 | 48.7% |
| slot <= 3 + xwOBA Q4 + positive H/TB deltas | 686 | 48.7% |

## Read

- Best `runs` gate in this pass: `slot <= 3 + xwOBA Q4 + OppQ hits delta >= 0`.
- Best `RBI` gate in this pass: `slots 2-5 + xSLG Q4 + xwOBA Q4`.
- Best `H+R+RBI` gate in this pass: `slot <= 5 + xwOBA Q4 + xSLG Q4`.
- If one of these lanes wins clearly, it should become the next isolated feature path before we touch the live value board again.

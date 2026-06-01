# MLB-M2 Game-Shape Vector Trends

Range: 2026-05-10 to 2026-05-31

This treats each team-game as a radar vector, not a UI widget. The visible chart is just the human-readable view of the six-dimensional state.

## Coverage

- Games: 123
- Team vectors: 246
- Dates: 2026-05-23, 2026-05-24, 2026-05-25, 2026-05-26, 2026-05-27, 2026-05-28, 2026-05-29, 2026-05-30, 2026-05-31

## Baselines

- Team 3+ F5 runs: 41.9%; explosion 5+ F5 runs: 18.7%; dead 0-1 F5 runs: 44.7%
- Game F5 total 5+: 48.8%; full-game total 9+: 50.4%; 12+: 26.8%

## Team Axis Buckets

| Axis high >=60 | Rows | Avg F5 R | 3+ F5 | 5+ F5 explosion | Dead F5 | Late 3+ | Lift: 5+ F5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| pressure | 40 | 3.2 | 52.5% | 30.0% | 35.0% | 20.0% | 11.3% |
| chaos | 148 | 2.7 | 43.2% | 20.9% | 43.2% | 33.1% | 2.2% |
| freeze | 0 | 0 | N/A | N/A | N/A | N/A | -18.7% |
| air | 37 | 3.9 | 56.8% | 32.4% | 27.0% | 27.0% | 13.7% |
| bridge | 0 | 0 | N/A | N/A | N/A | N/A | -18.7% |
| flow | 115 | 2.8 | 46.1% | 21.7% | 41.7% | 28.7% | 3.0% |

## Game Axis Buckets

| Axis high >=60 | Rows | Avg F5 total | Avg final total | F5 total 5+ | F5 total <=3 | Final 9+ | Final 12+ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| pressure | 40 | 4.7 | 8.5 | 45.0% | 40.0% | 50.0% | 25.0% |
| chaos | 87 | 5.4 | 9.4 | 50.6% | 32.2% | 50.6% | 29.9% |
| freeze | 25 | 5.4 | 10.4 | 52.0% | 32.0% | 68.0% | 40.0% |
| air | 0 | 0 | 0 | N/A | N/A | N/A | N/A |
| bridge | 61 | 5.2 | 9 | 55.7% | 24.6% | 57.4% | 24.6% |
| flow | 94 | 5.4 | 9.2 | 51.1% | 33.0% | 51.1% | 29.8% |

## Team Vector Shapes

| Shape | Rows | Avg F5 R | 3+ F5 | 5+ F5 explosion | Dead F5 | Final win |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| balanced/unclear | 143 | 2.3 | 37.1% | 14.0% | 48.3% | 46.2% |
| air chaos | 51 | 3.1 | 51.0% | 25.5% | 37.3% | 52.9% |
| pressure chaos | 26 | 3.1 | 46.2% | 26.9% | 38.5% | 50.0% |
| clean flow | 13 | 2.2 | 38.5% | 15.4% | 53.8% | 46.2% |
| clean pressure | 10 | 3.6 | 70.0% | 40.0% | 20.0% | 90.0% |
| dead-freeze trap | 3 | 0.3 | 0.0% | 0.0% | 100.0% | 66.7% |

## Game Vector Shapes

| Shape | Rows | Avg F5 total | Avg final total | F5 total 5+ | Final 9+ | Final 12+ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| late chaos bridge | 49 | 4.9 | 8.6 | 49.0% | 46.9% | 18.4% |
| balanced/unclear | 31 | 4.6 | 8.1 | 45.2% | 41.9% | 22.6% |
| under/freezer | 17 | 4.9 | 9.9 | 47.1% | 64.7% | 41.2% |
| aligned but chaotic | 17 | 6.1 | 10 | 47.1% | 47.1% | 41.2% |
| live fork: pressure plus freeze plus chaos | 4 | 6.5 | 13.3 | 50.0% | 100.0% | 50.0% |
| clean phase stack | 4 | 6 | 8.3 | 75.0% | 50.0% | 25.0% |
| over-tail air chaos | 1 | 7 | 9 | 100.0% | 100.0% | 0.0% |

## Movement Trends

| Vector movement | Rows | Avg F5 R | 3+ F5 | 5+ F5 explosion | Dead F5 | Late 3+ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| flow collapse <=-20 | 68 | 2.4 | 38.2% | 17.6% | 48.5% | 32.4% |
| pressure drop <=-12 | 46 | 2 | 28.3% | 13.0% | 56.5% | 34.8% |
| pressure jump >=12 | 41 | 3.2 | 53.7% | 26.8% | 34.1% | 29.3% |
| air jump >=12 | 22 | 2.7 | 45.5% | 18.2% | 36.4% | 50.0% |
| freeze drop <=-12 | 5 | 3.4 | 60.0% | 60.0% | 40.0% | 0.0% |
| freeze jump >=12 | 2 | 3 | 50.0% | 50.0% | 50.0% | 0.0% |
| bridge jump >=12 | 2 | 4 | 50.0% | 50.0% | 0.0% | 50.0% |

## Early Reads

- Pressure plus chaos is an explosion/fork state: 26 team rows, 26.9% reached 5+ F5 runs and 46.2% reached 3+.
- Freeze without pressure behaves like a true dead-offense state: 100.0% ended 0-1 F5 runs.
- Flow does not mean safe. Aligned-but-chaotic games had 45.0% F5 totals of 5+ and 47.5% full-game totals of 9+.
- Largest single-axis team explosion lift came from high air: 13.7% over baseline.
- Largest single-axis game F5-total lift came from high bridge: 7.0% over baseline.

## Next Model Work

- Persist team-game radar vectors into the warehouse as first-class rows, not just generated JSON.
- Train vector transitions by team: current vector, prior vector, delta vector, and next-game outcome.
- Add player-level radar vectors for starters, relievers, and lineup slots, then aggregate them into team vectors instead of only deriving team state from existing summaries.
- Use vector archetypes to choose market lanes. Example: pressure-chaos fork should not be treated like ordinary ML confidence.

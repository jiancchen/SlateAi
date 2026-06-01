# MLB-M2 Invented Vector Search

Range: 2026-05-10 to 2026-05-31

This pass breaks the compressed radar axes into invented sub-vectors. The names are provisional; the test is whether they separate outcomes.

## Coverage

- Games: 123
- Team vectors: 246
- Dates: 2026-05-23, 2026-05-24, 2026-05-25, 2026-05-26, 2026-05-27, 2026-05-28, 2026-05-29, 2026-05-30, 2026-05-31

## Team Dimension Search

Baseline: 3+ F5 41.9%, 5+ F5 18.7%, dead F5 44.7%, final win 50.0%.

High score means more of the condition, not automatically better. These are invention candidates, not promoted model features yet.

| Dimension top quartile | Q75 | Rows | Avg F5 R | 3+ F5 | 5+ F5 | Dead F5 | Final win | 5+ lift | Dead lift |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| defensiveRunLeak | 54.4 | 64 | 3.4 | 50.0% | 31.3% | 40.6% | 54.7% | 12.6% | -4.1% |
| pitcherCollapseRisk | 39 | 63 | 3 | 52.4% | 23.8% | 33.3% | 58.7% | 5.1% | -11.4% |
| deadBatRisk | 41.5 | 64 | 2.6 | 45.3% | 14.1% | 40.6% | 57.8% | -4.6% | -4.1% |
| bridgeLeak | 44.9 | 65 | 2.9 | 44.6% | 23.1% | 44.6% | 49.2% | 4.4% | -0.1% |
| starterEarlyCrack | 44.9 | 63 | 2.7 | 49.2% | 22.2% | 42.9% | 49.2% | 3.5% | -1.9% |
| pitcherCommandLeak | 38 | 63 | 2.8 | 50.8% | 22.2% | 39.7% | 52.4% | 3.5% | -5.0% |
| carryBoost | 53.9 | 69 | 2.6 | 40.6% | 21.7% | 44.9% | 47.8% | 3.0% | 0.2% |
| mentalityPressure | 41.9 | 63 | 2.4 | 33.3% | 15.9% | 52.4% | 46.0% | -2.8% | 7.7% |
| conversionVolatility | 58.5 | 64 | 2.6 | 43.8% | 20.3% | 42.2% | 51.6% | 1.6% | -2.5% |
| batterFireRate | 50.9 | 64 | 2.7 | 42.2% | 17.2% | 42.2% | 45.3% | -1.5% | -2.5% |
| trafficPressure | 56.5 | 63 | 2.6 | 42.9% | 19.0% | 41.3% | 58.7% | 0.3% | -3.4% |
| marketTension | 67.9 | 64 | 2.6 | 48.4% | 18.8% | 43.8% | 50.0% | 0.1% | -1.0% |

## Game Dimension Search

Baseline: F5 total 5+ 48.8%, full 9+ 50.4%, full 12+ 26.8%.

| Dimension top quartile | Q75 | Rows | Avg F5 total | Avg final | F5 5+ | F5 <=3 | Full 9+ | Full 12+ | F5 5+ lift |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| marketRealityGap | 71.2 | 32 | 5.7 | 8.7 | 65.6% | 25.0% | 46.9% | 18.8% | 16.8% |
| starterPairCollapse | 47.7 | 32 | 6 | 9.8 | 62.5% | 15.6% | 56.3% | 21.9% | 13.7% |
| bridgeChaos | 72.7 | 32 | 5.2 | 9.1 | 62.5% | 28.1% | 59.4% | 21.9% | 13.7% |
| earlyJolt | 64.6 | 33 | 5 | 8.9 | 54.5% | 30.3% | 57.6% | 27.3% | 5.8% |
| powerWeatherTail | 62.1 | 32 | 5 | 9.6 | 43.8% | 31.3% | 50.0% | 31.3% | -5.0% |
| deadZone | 44 | 32 | 5.7 | 9.4 | 53.1% | 34.4% | 56.3% | 37.5% | 4.3% |
| trafficFork | 57.9 | 32 | 5.1 | 8.6 | 46.9% | 37.5% | 43.8% | 28.1% | -1.9% |
| asymmetry | 45.7 | 32 | 4.4 | 7.9 | 46.9% | 34.4% | 43.8% | 15.6% | -1.9% |

## Best Team Dimension Pairs

| Pair top quartile overlap | Rows | Avg F5 R | 3+ F5 | 5+ F5 | Dead F5 | Lift: 5+ F5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pitcherCollapseRisk + conversionVolatility | 13 | 4.5 | 69.2% | 46.2% | 7.7% | 27.5% |
| conversionVolatility + marketTension | 12 | 3.5 | 75.0% | 41.7% | 25.0% | 23.0% |
| pitcherCommandLeak + conversionVolatility | 15 | 3.9 | 73.3% | 40.0% | 26.7% | 21.3% |
| batterFireRate + deadBatRisk | 11 | 2.4 | 54.5% | 0.0% | 36.4% | -18.7% |
| pitcherCollapseRisk + carryBoost | 19 | 3.5 | 63.2% | 36.8% | 31.6% | 18.1% |
| pitcherCommandLeak + trafficPressure | 19 | 3.5 | 63.2% | 36.8% | 31.6% | 18.1% |
| defensiveRunLeak + bridgeLeak | 25 | 3.8 | 48.0% | 36.0% | 44.0% | 17.3% |
| batterFireRate + bridgeLeak | 14 | 4.4 | 57.1% | 35.7% | 35.7% | 17.0% |
| defensiveRunLeak + mentalityPressure | 20 | 3.6 | 45.0% | 35.0% | 45.0% | 16.3% |
| starterEarlyCrack + defensiveRunLeak | 23 | 3.3 | 60.9% | 34.8% | 39.1% | 16.1% |
| starterEarlyCrack + carryBoost | 18 | 2.9 | 50.0% | 33.3% | 50.0% | 14.6% |
| pitcherCommandLeak + carryBoost | 18 | 3.2 | 61.1% | 33.3% | 27.8% | 14.6% |
| deadBatRisk + mentalityPressure | 19 | 2.3 | 42.1% | 5.3% | 42.1% | -13.4% |
| batterFireRate + defensiveRunLeak | 16 | 3.9 | 50.0% | 31.3% | 50.0% | 12.6% |
| trafficPressure + bridgeLeak | 16 | 3.3 | 43.8% | 31.3% | 37.5% | 12.6% |
| conversionVolatility + bridgeLeak | 13 | 3.4 | 61.5% | 30.8% | 38.5% | 12.1% |
| batterFireRate + marketTension | 15 | 2.1 | 40.0% | 6.7% | 40.0% | -12.0% |
| starterEarlyCrack + mentalityPressure | 14 | 2 | 42.9% | 7.1% | 57.1% | -11.6% |
| trafficPressure + mentalityPressure | 12 | 2.3 | 33.3% | 8.3% | 58.3% | -10.4% |
| pitcherCommandLeak + mentalityPressure | 23 | 2.3 | 34.8% | 8.7% | 60.9% | -10.0% |

## Best Game Dimension Pairs

| Pair top quartile overlap | Rows | Avg F5 total | Avg final | F5 5+ | Full 9+ | Lift: F5 5+ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| deadZone + marketRealityGap | 9 | 6.7 | 9.1 | 77.8% | 44.4% | 29.0% |
| powerWeatherTail + asymmetry | 8 | 3.9 | 7.5 | 25.0% | 37.5% | -23.8% |
| starterPairCollapse + earlyJolt | 14 | 5.5 | 8.9 | 71.4% | 57.1% | 22.6% |
| starterPairCollapse + marketRealityGap | 10 | 5.9 | 8.9 | 70.0% | 40.0% | 21.2% |
| bridgeChaos + marketRealityGap | 19 | 5.3 | 8.1 | 68.4% | 47.4% | 19.6% |
| trafficFork + deadZone | 6 | 7.5 | 11.7 | 66.7% | 83.3% | 17.9% |
| bridgeChaos + deadZone | 6 | 5.3 | 7.5 | 66.7% | 33.3% | 17.9% |
| trafficFork + asymmetry | 15 | 3.8 | 7.3 | 33.3% | 40.0% | -15.4% |
| powerWeatherTail + bridgeChaos | 6 | 3.5 | 9.8 | 33.3% | 50.0% | -15.4% |
| starterPairCollapse + powerWeatherTail | 8 | 7.3 | 11.8 | 62.5% | 75.0% | 13.7% |
| starterPairCollapse + bridgeChaos | 8 | 4.6 | 7.4 | 62.5% | 37.5% | 13.7% |
| earlyJolt + bridgeChaos | 10 | 4.8 | 9.2 | 60.0% | 60.0% | 11.2% |
| asymmetry + marketRealityGap | 10 | 4.8 | 7 | 60.0% | 20.0% | 11.2% |
| starterPairCollapse + asymmetry | 16 | 5 | 7.8 | 56.3% | 37.5% | 7.5% |
| earlyJolt + asymmetry | 18 | 4.8 | 9.1 | 55.6% | 55.6% | 6.8% |
| deadZone + asymmetry | 9 | 4.7 | 7.9 | 55.6% | 55.6% | 6.8% |
| starterPairCollapse + trafficFork | 7 | 6.1 | 9.1 | 42.9% | 42.9% | -5.9% |
| trafficFork + powerWeatherTail | 14 | 4.4 | 8.1 | 42.9% | 35.7% | -5.9% |
| trafficFork + bridgeChaos | 7 | 3.9 | 9 | 42.9% | 42.9% | -5.9% |
| trafficFork + marketRealityGap | 7 | 5.9 | 9.6 | 42.9% | 42.9% | -5.9% |

## Invented Dimension Meanings

- `pitcherCollapseRisk`: Opponent starter season/recent collapse risk: ERA, WHIP, walks, HRs, recent runs, short starts, leash.
- `starterEarlyCrack`: Opponent starter first-cycle crack risk: first-batter reach, first-inning runs/walks, early baserunners.
- `pitcherCommandLeak`: Opponent starter traffic leak: WHIP, walks, recent walks/hits, first-batter reach, leash.
- `batterFireRate`: Team top-order heat and contact fire: top-six heat, xwOBA trend, hard-hit/sweet-spot trend, barrel/xwOBA context.
- `trafficPressure`: Team baserunner pressure: total/early baserunners, top-order baserunners, walks, conversion, first-inning scoring.
- `conversionVolatility`: Whether traffic can swing wildly: conversion volatility, runs per baserunner, stranded traffic, no-conversion pockets.
- `deadBatRisk`: Dead-offense shape: quiet F5, scoreless first three, dead traffic, no-conversion, cold/whiff/strikeout profile.
- `defensiveRunLeak`: Opponent run-prevention leak: one-bad-inning, early multi-run allowed, mistake chaos, run clustering, stranded traffic.
- `bridgeLeak`: Opponent bullpen/bridge leak: bullpen chaos, meltdowns, first-batter reach, inherited scoring, HR appearances, command risk.
- `carryBoost`: Contact carry help: weather/run boost, park, sun visibility, barrel/hard-hit context.
- `mentalityPressure`: State pressure: snapback, form pressure, heat regression, recent losses, streak context, pressure hitter.
- `marketTension`: Model/market stress: volatility, reality gap, market contradiction, edge/confidence tension, totals vetoes.
- `starterPairCollapse`: Game-level max of either offense seeing a collapse-prone starter.
- `earlyJolt`: Game-level first-cycle jolt risk from starter early crack plus traffic pressure.
- `trafficFork`: Game-level fork where traffic pressure and dead-bat risk coexist.
- `powerWeatherTail`: Game-level power/contact/carry tail from batter fire and carry boost.
- `bridgeChaos`: Game-level bridge and bullpen volatility.
- `deadZone`: Game-level dead-zone risk from the higher team dead-bat vector.
- `asymmetry`: Largest team-vector gap between the two sides.
- `marketRealityGap`: Game-level model-reality tension from market tension and M2 reality gap.

## Reads

- defensiveRunLeak had the strongest single-dimension team F5 explosion separation: top quartile hit 31.3% vs baseline 18.7%.
- marketRealityGap had the strongest single-dimension game F5-total separation: top quartile hit 65.6% vs baseline 48.8%.
- Best team pair so far: pitcherCollapseRisk + conversionVolatility, 13 rows, 46.2% 5+ F5 explosion rate.
- Best game pair so far: deadZone + marketRealityGap, 9 games, 77.8% F5 total 5+ rate.
- deadBatRisk did not isolate true dead offenses in this pooled sample: top quartile dead F5 rate 40.6% vs baseline 44.7%. It may need to be paired with low traffic or low fire instead of used alone.
- batterFireRate alone is not enough unless paired with pitcher/defense leak; top quartile 5+ F5 rate was 17.2%.

## Next

- Promote only dimensions that survive walk-forward checks, not just this pooled bucket report.
- Store these invented dimensions as raw team-game/game-state vector rows so M2 can learn transitions.
- Keep the six-axis radar as display compression; it should be generated from this larger vector set.

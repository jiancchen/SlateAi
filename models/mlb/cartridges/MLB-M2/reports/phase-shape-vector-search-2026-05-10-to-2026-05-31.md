# MLB-M2 Phase Shape Vector Search

Range: 2026-05-10 to 2026-05-31

This pass treats one game as multiple phase radars: first cycle, starter window/F5, bridge, late, and outfield/error tail. It also uses robust recent summaries instead of raw trailing averages so one 15-run game becomes a tail event, not the new baseline.

## Coverage

- Games: 123
- Team phase vectors: 246
- Dates: 2026-05-23, 2026-05-24, 2026-05-25, 2026-05-26, 2026-05-27, 2026-05-28, 2026-05-29, 2026-05-30, 2026-05-31

## Team Phase Dimensions

Baseline: 1st inning scored 30.5%, 3+ F5 41.9%, 5+ F5 18.7%, bridge burst 24.4%, late burst 22.0%.

| Dimension top quartile | Q75 | Rows | 1st scored | 3+ F5 | 5+ F5 | Dead F5 | Bridge burst | Late burst | Best lift |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| starterCollapseAttack | 44.6 | 63 | 28.6% | 52.4% | 28.6% | 38.1% | 23.8% | 20.6% | 9.9% |
| powerFork | 50.5 | 65 | 29.2% | 55.4% | 27.7% | 30.8% | 23.1% | 20.0% | 9.0% |
| outfieldChaosPressure | 54.8 | 64 | 29.7% | 50.0% | 25.0% | 45.3% | 25.0% | 17.2% | 6.3% |
| stateShock | 33.1 | 63 | 36.5% | 39.7% | 17.5% | 50.8% | 31.7% | 20.6% | 7.4% |
| starterWindowTraffic | 48.8 | 63 | 25.4% | 52.4% | 25.4% | 38.1% | 23.8% | 17.5% | 6.7% |
| starterWindowConversion | 52.4 | 64 | 25.0% | 45.3% | 25.0% | 45.3% | 12.5% | 21.9% | 11.9% |
| lateAttack | 48.7 | 65 | 29.2% | 40.0% | 20.0% | 50.8% | 24.6% | 23.1% | 1.3% |
| bridgeAttack | 48.3 | 64 | 28.1% | 42.2% | 23.4% | 45.3% | 18.8% | 23.4% | 5.6% |
| firstCyclePressure | 50.1 | 63 | 27.0% | 47.6% | 23.8% | 41.3% | 19.0% | 23.8% | 5.3% |
| strandFork | 44 | 63 | 23.8% | 42.9% | 11.1% | 49.2% | 31.7% | 28.6% | 7.6% |

## Game Phase Dimensions

Baseline: first-inning run 54.5%, F5 total 5+ 48.8%, bridge total 3+ 31.7%, late total 3+ 27.6%, full 9+ 50.4%.

| Dimension top quartile | Q75 | Rows | 1st run | F5 5+ | F5 <=3 | Bridge 3+ | Late 3+ | Full 9+ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| f5RunState | 52.8 | 32 | 56.3% | 59.4% | 18.8% | 31.3% | 31.3% | 53.1% |
| firstInningRunState | 53.5 | 32 | 46.9% | 43.8% | 46.9% | 40.6% | 34.4% | 46.9% |
| compressedFork | 46.5 | 32 | 53.1% | 43.8% | 46.9% | 43.8% | 31.3% | 56.3% |
| outfieldErrorTail | 56.6 | 32 | 50.0% | 53.1% | 28.1% | 37.5% | 34.4% | 62.5% |
| bridgeRunState | 52.2 | 33 | 48.5% | 45.5% | 36.4% | 30.3% | 18.2% | 45.5% |
| phaseWhiplash | 11.8 | 32 | 62.5% | 46.9% | 31.3% | 15.6% | 31.3% | 43.8% |
| lateRunState | 52.2 | 32 | 59.4% | 50.0% | 28.1% | 34.4% | 18.8% | 50.0% |

## Team Phase Pairs

| Pair top quartile overlap | Rows | 1st scored | 3+ F5 | 5+ F5 | Bridge burst | Late burst | Lift |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| bridgeAttack + stateShock | 14 | 35.7% | 57.1% | 42.9% | 21.4% | 14.3% | 24.2% |
| starterWindowConversion + powerFork | 28 | 17.9% | 64.3% | 35.7% | 14.3% | 17.9% | 17.0% |
| starterWindowConversion + outfieldChaosPressure | 21 | 28.6% | 52.4% | 33.3% | 23.8% | 4.8% | 14.6% |
| starterCollapseAttack + outfieldChaosPressure | 27 | 33.3% | 55.6% | 33.3% | 29.6% | 3.7% | 14.6% |
| lateAttack + stateShock | 18 | 50.0% | 50.0% | 33.3% | 33.3% | 22.2% | 14.6% |
| starterCollapseAttack + powerFork | 38 | 23.7% | 60.5% | 31.6% | 23.7% | 13.2% | 12.9% |
| outfieldChaosPressure + powerFork | 35 | 31.4% | 60.0% | 31.4% | 37.1% | 20.0% | 12.7% |
| starterWindowTraffic + outfieldChaosPressure | 26 | 30.8% | 53.8% | 30.8% | 34.6% | 3.8% | 12.1% |
| starterWindowTraffic + powerFork | 39 | 23.1% | 61.5% | 30.8% | 23.1% | 12.8% | 12.1% |
| firstCyclePressure + strandFork | 10 | 0.0% | 70.0% | 30.0% | 20.0% | 30.0% | 11.3% |
| starterWindowConversion + stateShock | 10 | 20.0% | 50.0% | 30.0% | 10.0% | 20.0% | 11.3% |
| bridgeAttack + strandFork | 10 | 0.0% | 70.0% | 30.0% | 20.0% | 30.0% | 11.3% |
| firstCyclePressure + powerFork | 27 | 22.2% | 63.0% | 29.6% | 25.9% | 18.5% | 10.9% |
| strandFork + stateShock | 25 | 44.0% | 40.0% | 8.0% | 40.0% | 24.0% | -10.7% |
| starterWindowConversion + starterCollapseAttack | 38 | 21.1% | 52.6% | 28.9% | 13.2% | 23.7% | 10.2% |
| firstCyclePressure + outfieldChaosPressure | 21 | 33.3% | 57.1% | 28.6% | 33.3% | 4.8% | 9.9% |
| starterCollapseAttack + strandFork | 14 | 7.1% | 71.4% | 28.6% | 35.7% | 42.9% | 9.9% |
| starterCollapseAttack + stateShock | 14 | 35.7% | 50.0% | 28.6% | 35.7% | 21.4% | 9.9% |
| starterWindowTraffic + starterCollapseAttack | 54 | 25.9% | 53.7% | 27.8% | 22.2% | 18.5% | 9.1% |
| powerFork + stateShock | 18 | 38.9% | 55.6% | 27.8% | 27.8% | 16.7% | 9.1% |

## Game Phase Pairs

| Pair top quartile overlap | Rows | 1st run | F5 5+ | Bridge 3+ | Late 3+ | Full 9+ | Lift |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| firstInningRunState + compressedFork | 12 | 41.7% | 25.0% | 66.7% | 41.7% | 58.3% | -23.8% |
| f5RunState + compressedFork | 8 | 37.5% | 25.0% | 62.5% | 37.5% | 50.0% | -23.8% |
| bridgeRunState + compressedFork | 8 | 50.0% | 25.0% | 62.5% | 25.0% | 50.0% | -23.8% |
| bridgeRunState + phaseWhiplash | 7 | 42.9% | 28.6% | 0.0% | 14.3% | 42.9% | -20.2% |
| bridgeRunState + outfieldErrorTail | 15 | 46.7% | 66.7% | 40.0% | 26.7% | 73.3% | 17.9% |
| outfieldErrorTail + phaseWhiplash | 6 | 50.0% | 66.7% | 16.7% | 33.3% | 83.3% | 17.9% |
| lateRunState + compressedFork | 9 | 55.6% | 33.3% | 55.6% | 22.2% | 55.6% | -15.4% |
| firstInningRunState + outfieldErrorTail | 10 | 40.0% | 60.0% | 60.0% | 40.0% | 70.0% | 11.2% |
| firstInningRunState + f5RunState | 22 | 50.0% | 59.1% | 36.4% | 31.8% | 50.0% | 10.3% |
| f5RunState + lateRunState | 19 | 52.6% | 57.9% | 36.8% | 21.1% | 57.9% | 9.1% |
| f5RunState + bridgeRunState | 21 | 52.4% | 57.1% | 33.3% | 19.0% | 57.1% | 8.4% |
| f5RunState + outfieldErrorTail | 14 | 42.9% | 57.1% | 42.9% | 35.7% | 71.4% | 8.4% |
| lateRunState + outfieldErrorTail | 14 | 50.0% | 57.1% | 42.9% | 28.6% | 64.3% | 8.4% |
| firstInningRunState + lateRunState | 16 | 43.8% | 56.3% | 37.5% | 25.0% | 56.3% | 7.5% |
| firstInningRunState + phaseWhiplash | 7 | 42.9% | 42.9% | 14.3% | 28.6% | 28.6% | -5.9% |
| lateRunState + phaseWhiplash | 7 | 57.1% | 42.9% | 0.0% | 14.3% | 57.1% | -5.9% |
| f5RunState + phaseWhiplash | 9 | 44.4% | 44.4% | 0.0% | 33.3% | 33.3% | -4.3% |
| compressedFork + phaseWhiplash | 9 | 44.4% | 44.4% | 11.1% | 55.6% | 33.3% | -4.3% |
| firstInningRunState + bridgeRunState | 19 | 36.8% | 47.4% | 31.6% | 21.1% | 47.4% | -1.4% |
| outfieldErrorTail + compressedFork | 6 | 50.0% | 50.0% | 66.7% | 16.7% | 66.7% | 1.2% |

## Dimension Meanings

- `firstCyclePressure`: Team first-inning/top-order pressure versus opposing starter early-crack profile.
- `starterWindowTraffic`: Team early baserunner pressure versus opposing starter command/collapse leak.
- `starterWindowConversion`: Whether F5 traffic can become runs, using conversion shape plus starter command leak.
- `starterCollapseAttack`: Offense pressure specifically against a starter-collapse profile.
- `bridgeAttack`: Offense against the first bullpen/bridge phase, using opponent bullpen leak and reliever command.
- `lateAttack`: Offense against late innings, including bullpen leak, team state, and late explosion pressure.
- `outfieldChaosPressure`: Offense hard-contact/carry/sun/park pressure against opponent mistake/outfield leak.
- `strandFork`: Traffic plus dead-bat/no-conversion tension. High means the game can look alive and still strand.
- `powerFork`: Batter fire plus carry plus pitcher HR/collapse leak. High means scoring can come suddenly.
- `stateShock`: Recent-state and mentality pressure that can bend a normal projection.
- `firstInningRunState`: Game-level first-inning scoring pressure from both team first-cycle vectors.
- `f5RunState`: Game-level starter-window scoring pressure from both teams.
- `bridgeRunState`: Game-level innings 6-7 pressure from both team bridge vectors.
- `lateRunState`: Game-level innings 8-9 pressure from both team late vectors.
- `outfieldErrorTail`: Game-level contact/carry/visibility/defensive-leak tail.
- `compressedFork`: Game-level traffic/dead-zone fork where averages lie.
- `phaseWhiplash`: Game-level difference between early pressure and late/bridge pressure.

## Reads

- starterCollapseAttack is the current team F5 explosion boost: top quartile 28.6% vs baseline 18.7% (+9.9 pts).
- strandFork is a suppressor/fork, not an over signal: 5+ F5 11.1% vs baseline 18.7%, dead F5 49.2%, bridge burst 31.7%.
- stateShock is the bridge-burst boost: top quartile 31.7% vs baseline 24.4% (+7.4 pts).
- stateShock is the first-cycle boost: top quartile scored in the first 36.5% vs baseline 30.5% (+6.0 pts).
- f5RunState is the game-level F5 total boost: top quartile F5 5+ 59.4% vs baseline 48.8% (+10.6 pts).
- firstInningRunState suppresses early total shape: F5 5+ 43.8% vs baseline 48.8%, with bridge 3+ 40.6% and full 9+ 46.9%.
- Best positive team interaction: bridgeAttack + stateShock, 14 rows, 42.9% 5+ F5 explosion rate (+24.2 pts).
- Best positive game interaction: bridgeRunState + outfieldErrorTail, 15 games, 66.7% F5 total 5+ rate (+17.9 pts).
- Compressed-fork phase shift: firstInningRunState + compressedFork is not an F5 over signal (25.0% F5 5+), but it moved pressure into the bridge (66.7% bridge 3+).

## Calculation Rule

- Do not use raw trailing averages as the state. Use medians, trimmed means, tail-event rates, capped scales, and interactions.
- A 15-run game should mostly update `highRunRate`, `stateShock`, and tail vectors. It should not turn the next game projection into a naive 9-run baseline.
- Every phase vector is head-to-head: offense state x opposing starter/bullpen/defense/environment state.

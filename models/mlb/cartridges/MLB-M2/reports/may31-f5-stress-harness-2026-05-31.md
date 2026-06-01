# MLB-M2 May 31 First-Five Stress Harness

Date: 2026-05-31

This is a retrospective stress harness, not a clean backtest win. The goal is to force M2 to explain why the May 31 first-five total board broke, then decide which features need to become real cartridge inputs.

## Projection Fit

- Games: 15
- First-five plate appearances in warehouse: 670
- First-five batted-ball events with pitch `hitData`: 449
- Mean absolute error: 3.47 runs
- Median absolute error: 2.90 runs
- Max absolute miss: 10.8 runs
- Absolute-error buckets: <=1 run 3, 1-2 runs 2, 2-4 runs 6, >4 runs 4
- Signed bias, for calibration only: mean +1.6, median +1.4
- Actual/projected ratio: mean 1.38, median 1.30
- Scalar fit: `actual ~= 1.348 * projected`
- OLS fit: `actual ~= 1.194 * projected + 0.744`

## Line Test

- Original F5 projection side: 5/15 (33.3%)
- Scalar-adjusted side: 9/15 (60.0%)
- OLS-adjusted side: 9/15 (60.0%)

Do not use signed average error as a success metric here. It can hide one game that is four runs too low and another that is four runs too high. The scalar correction helps, but it does not solve the slate. That means this is not just one missing multiplier. M2 needs a mixture model: normal run expectation, strand risk, and crooked-inning tail.

## Process Loop

1. **Freeze the stress fixture**: Keep May 31 F5 lines, model projections, actual F5 scores, PA sequences, and pitch hitData together. Purpose: Every M2 totals change must explain this slate without quietly changing the target.
2. **Separate point-error from side-error**: Track projected runs, line side, actual side, absolute error, and actual/projected ratio per game. Purpose: This tells us whether the failure is a scalar calibration problem, a direction problem, or both.
3. **Classify the actual game shape**: Use PA sequencing and pitch hitData to tag strand, traffic-converted, crooked-inning, power-contact, and contact-suppressed outcomes. Purpose: The model should predict the shape bucket, not just one average run number.
4. **Turn postgame tags into pregame features**: Materialize rolling team, starter, bullpen, contact-quality, conversion-volatility, market-prior, park, and sun/fielding features through the prior date. Purpose: No May 31 outcomes can be used for a clean candidate model; they only tell us what pregame proxies are missing.
5. **Publish only model-owned market expressions**: The cartridge emits over/under/pass/live-only with confidence and drivers. The UI only filters those rows. Purpose: Avoid rebuilding the broken value-board path where the website turned a projection into an EV bet.

## Game Diagnostics

| Game | F5 line | M2 proj | Actual | Abs err | Signed err | Actual side | Diagnosis |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| Yankees @ Athletics | Hold 5.7 | 5.2 | 16 | 10.8 | +10.8 | Over | over: power-contact tail |
| Giants @ Rockies | Hold 6.4 | 6.5 | 16 | 9.5 | +9.5 | Over | over: power-contact tail |
| Twins @ Pirates | Hold 4.1 | 4.0 | 9 | 5.0 | +5.0 | Over | over: power-contact tail |
| Diamondbacks @ Mariners | Over 4.4 | 5.3 | 1 | 4.3 | -4.3 | Under | under: conversion/cold-start miss |
| Tigers @ White Sox | Hold 4.4 | 4.6 | 1 | 3.6 | -3.6 | Under | under: contact suppressed |
| Marlins @ Mets | Under 3.9 | 2.6 | 6 | 3.4 | +3.4 | Over | over: power-contact tail |
| Padres @ Nationals | Over 4.4 | 6.0 | 3 | 3.0 | -3.0 | Under | under: conversion/cold-start miss |
| Red Sox @ Guardians | Hold 4.7 | 4.1 | 7 | 2.9 | +2.9 | Over | over: power-contact tail |
| Royals @ Rangers | Hold 4 | 3.3 | 6 | 2.7 | +2.7 | Over | over: power-contact tail |
| Brewers @ Astros | Hold 4.2 | 4.1 | 2 | 2.1 | -2.1 | Under | under: conversion/cold-start miss |
| Phillies @ Dodgers | Under 5.3 | 4.2 | 6 | 1.8 | +1.8 | Over | over: power-contact tail |
| Blue Jays @ Orioles | Under 5.5 | 4.6 | 6 | 1.4 | +1.4 | Over | over: crooked-inning conversion |
| Braves @ Reds | Hold 4.9 | 5.2 | 6 | 0.8 | +0.8 | Over | over: power-contact tail |
| Angels @ Rays | Hold 4.7 | 4.7 | 4 | 0.7 | -0.7 | Under | under: conversion/cold-start miss |
| Cubs @ Cardinals | Hold 4.5 | 5.0 | 5 | 0.0 | +0.0 | Over | over: power-contact tail |

## Feature Process

- **Run-conversion state**: May 31 was less about hits alone and more about whether traffic converted or stranded in the first five. Status: partly available from PA sequencing; needs persisted rolling team/pitcher features.
- **Crooked-inning tail**: The misses came from tails, not median projections. One bad inning can flip an under even when average F5 is reasonable. Status: available from PA/pitch history; not yet modeled as a distribution lane.
- **Contact-quality bridge**: Pitch feed includes launch speed, angle, trajectory, distance, and location. M2 should project loud-contact risk, not only hits. Status: available in raw pitch events; needs materialized daily features.
- **Team x opponent formula fit**: A single team trend is not enough; offense shape has to interact with starter arsenal, handedness, bullpen bridge, park, and opponent fielding. Status: not cleanly materialized as a model input.
- **Environment and fielding tail**: Sun/shadow/weather/park can create extra-base and error paths, but should be a small modifier unless paired with contact and fielding risk. Status: sun snapshots exist; needs cloud/roof/position and outfield-contact join.
- **Market total prior**: The slate projection was low by a scalar. Market lines should anchor run environment unless our data has a specific reason to reject them. Status: line available in published slate; needs explicit prior/blend and calibration audit.

## M2 Rule

For the next M2 totals pass, the value board should only expose F5 O/U when the cartridge publishes all three pieces:

1. `expectedFirst5Runs`: the calibrated point estimate.
2. `first5TailShape`: over-tail, strand-tail, or balanced, with the drivers listed.
3. `marketExpression`: over, under, pass, live-only, or no-market-edge after comparing the line.

The website must keep filtering these rows only. It should not create the F5 total bet from projected runs.

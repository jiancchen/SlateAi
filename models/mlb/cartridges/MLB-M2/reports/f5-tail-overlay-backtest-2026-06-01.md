# MLB-M2 F5 Tail Overlay Backtest

Range: 2026-05-10 to 2026-05-31

This report separates deployable model output from forced stress diagnostics. The forced stress side is allowed to choose every game so May 31 can be used as a feature-discovery fixture; it is not automatically a bet-grade lane.

## Aggregate Backtest

- Rows: 123
- Base forced O/U: 72/121 (59.5%)
- Tail-adjusted forced O/U: 67/122 (54.9%)
- Original published active O/U: 42/70 (60.0%)
- Published active O/U: 42/69 (60.9%)
- Forced stress O/U: 70/122 (57.4%)
- Base projection MAE: 2.43
- Tail-adjusted projection MAE: 2.66
- Stress projection MAE: 2.62

## May 31 Stress Date

- Rows: 15
- Base forced O/U: 4/14 (28.6%)
- Tail-adjusted forced O/U: 10/15 (66.7%)
- Original published active O/U: 0/5 (0.0%)
- Published active O/U: 4/4 (100.0%)
- Forced stress O/U: 15/15 (100.0%)
- Base projection MAE: 3.47
- Tail-adjusted projection MAE: 2.87
- Stress projection MAE: 1.13

| Old row | Game | Line | Base | Tail adj | Stress proj | Actual | Actual side | Base side | Tail side | Original | Published | Forced stress | Reason | Shape |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
old board | Angels @ Rays | 4.7 | 4.7 | 5.8 | 3.1 | 4 | Under | Push | Over | Pass | Pass | Under | no-carry fork resolved to strand/cold start | live-only fork
 | Blue Jays @ Orioles | 5.5 | 4.6 | 4.6 | 6.2 | 6 | Over | Under | Under | Under | Pass | Over | run-cluster tail beats quiet-start read | live-only fork
 | Braves @ Reds | 4.9 | 5.2 | 5.2 | 5.6 | 6 | Over | Over | Over | Pass | Pass | Over | one-bad-inning tail | balanced
 | Brewers @ Astros | 4.2 | 4.1 | 4.1 | 3.5 | 2 | Under | Under | Under | Pass | Pass | Under | tail-adjusted projection fallback | balanced
old board | Cubs @ Cardinals | 4.5 | 5 | 7.9 | 7.9 | 5 | Over | Over | Over | Pass | Over | Over | weather/carry tail | over-tail
old board | Diamondbacks @ Mariners | 4.4 | 5.3 | 4.1 | 3.3 | 1 | Under | Over | Under | Over | Pass | Under | unsupported over became strand/cold-start risk | unsupported-over
 | Giants @ Rockies | 6.4 | 6.5 | 9.4 | 15.9 | 16 | Over | Over | Over | Pass | Over | Over | weather/carry tail | over-tail
old board | Marlins @ Mets | 3.9 | 2.6 | 4.7 | 4.7 | 6 | Over | Under | Over | Under | Over | Over | weather/carry tail | over-tail
 | Padres @ Nationals | 4.4 | 6 | 4.3 | 3.3 | 3 | Under | Over | Under | Over | Pass | Under | unsupported over became strand/cold-start risk | unsupported-over
old board | Phillies @ Dodgers | 5.3 | 4.2 | 5.2 | 6.4 | 6 | Over | Under | Under | Under | Pass | Over | weather/carry tail | over-tail
 | Red Sox @ Guardians | 4.7 | 4.1 | 5.2 | 6.9 | 7 | Over | Under | Over | Pass | Pass | Over | run-cluster tail beats quiet-start read | live-only fork
old board | Royals @ Rangers | 4 | 3.3 | 4.1 | 4.7 | 6 | Over | Under | Over | Pass | Pass | Over | mistake-chaos plus low-conversion false-under | over-tail
old board | Tigers @ White Sox | 4.4 | 4.6 | 5.4 | 2.8 | 1 | Under | Over | Over | Pass | Pass | Under | no-carry fork resolved to strand/cold start | live-only fork
 | Twins @ Pirates | 4.1 | 4 | 4 | 6.3 | 9 | Over | Under | Under | Pass | Pass | Over | run-cluster tail beats quiet-start read | balanced
old board | Yankees @ Athletics | 5.7 | 5.2 | 8.1 | 15.2 | 16 | Over | Under | Over | Pass | Over | Over | weather/carry tail | over-tail

## Read

The tail overlay gets closer to the May 31 shape, but the clean deployable lesson is not "force every game." The real improvement is identifying which old rows should have been killed or turned into tail-over rows. The forced stress side is useful because it names the missing feature families: weather/carry tails, unsupported overs, run-cluster false unders, one-bad-inning risk, and no-carry strand forks.

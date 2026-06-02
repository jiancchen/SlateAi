# Tennis Clutch And Workload Experiment - 2026-06-01

## Question

Can the tennis model improve the June 1 Roland Garros backtest by factoring in:

- Time on court and clustered workload.
- Long late games.
- Clutch pressure: tiebreaks, deuce-like long service games, return pressure in long games, and break-point save/convert profile.

## Implemented Signals

- Prior SofaScore match duration parsed from stored match payloads.
- Prior total minutes, average minutes, recent three-match average, max minutes, long-match rate, and two-day workload.
- Prior replay flow for long service games, long service holds, late service games, late service holds, long return games, long return breaks, late return games, and late return breaks.
- Tiebreak win percentage folded into the existing player-page pressure adjustment when available.
- Risk labels for long-game serve risk and time-on-court load.

## Promotion Decision

The new signals are stored and surfaced, but the long-game/workload adjustment is not promoted into the active win-probability blend yet.

Reason: the first direct test did not improve the June 1 pick result. When the clutch/workload layer was allowed to push probability directly, June 1 stayed 4/8 and the broader backtest dipped. The final version keeps the fields for audit/risk and excludes the experimental time/long-game columns from the classifier feature set until a bucketed calibration test proves they help.

## June 1 Result

Current model-pick result: 4/8.

Previous committed model-pick result: 4/8.

The new layer did not improve the hit count, but it did improve miss explanations:

| Match | Previous Risk | New Risk | Result |
|---|---:|---:|---|
| Frances Tiafoe vs Matteo Arnaldi | clean enough | time-on-court load | Miss |
| Juan Manuel Cerundolo vs Matteo Berrettini | clean enough | time-on-court load | Miss |
| Anastasia Potapova vs Anna Kalinskaya | error-control risk, hold risk, closeout risk | error-control risk, hold risk, closeout risk | Miss |
| Madison Keys vs Diana Shnaider | error-control risk | error-control risk | Miss |
| Maja Chwalinska vs Diane Parry | closeout risk | closeout risk, long-game serve risk | Hit |

## Backtest Snapshot

- Settled rows: 282.
- Active backtest: 166/282, 58.9%.
- Data-only backtest: 157/282, 55.7%.
- Active feature count: 113 after keeping clutch/workload columns out of the classifier.
- Audit/risk columns remain in the training corpus for inspection and future calibration.

## Read

This is useful, but not yet a betting edge.

The time-on-court and clutch-flow signals correctly identify fragility in some June 1 misses, especially Tiafoe and Cerundolo. The model still failed because it treated the risk as a warning, not a hard probability veto. Keys also shows the next problem: one strong service-flow signal can mask a major error-control weakness.

## Next Test

Run a bucketed veto calibration instead of another raw feature add:

- Favorite or model side above 62%.
- Any two of: error-control risk, time-on-court load, long-game serve risk, closeout risk, opponent return pressure.
- Compare normal pick hit rate versus downgraded/pass hit rate.
- Track whether the veto should reduce confidence, flip the side, or only remove the bet.


# MLB-M2 Benchmarks

This folder stores locked benchmark targets for MLB-M2 iterations.

Do not overwrite a benchmark after it has been used as a target. Add a new dated artifact when a model or rule version changes.

## Current Baseline

Artifact:

- `2026-06-01-current-baseline.json`

Overall current baseline:

- Baseline full-game side: 59.0% on 212 rows.
- M2 category lane hit: 62.6% on 195 graded lane rows.
- M2 allowed-side bucket: 67.5% on 40 rows.
- Starter-to-bullpen flip as F5 lane: 68.6% on 35 rows.
- Dead-zone timing/F5 lane: 70.6% on 17 rows.

May 31 holdout benchmark:

- Training data allowed through: 2026-05-30.
- Holdout date: 2026-05-31.
- Full-game side: 11/15, 73.3%.
- First-five side: 9/15, 60.0%.
- M2 category lane: 11/15, 73.3%.
- O/U benchmark set: 5/5, 100.0%.

This May 31 benchmark is the stress-slate test. Future M2 variants should score it without using May 31 outcomes for training or rule selection.

The May 31 O/U benchmark is tracked separately from the older value-board totals audit rows. Do not collapse those into one metric.

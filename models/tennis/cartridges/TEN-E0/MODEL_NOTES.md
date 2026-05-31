# TEN-E0 Tennis Evaluator Baseline

TEN-E0 is the tennis evaluator layer consumed by TEN-T0.

It owns lane settlement and calibration expectations: ML, spread, match O/U, first-set O/U, set-win, and Kalshi trade-to-sell must remain separately graded.

TEN-E0 should never mutate the locked pregame run. Settlement artifacts sit beside the run and explain what happened after results arrive.

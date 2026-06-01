# MLB-M2 Model Comparison Report

Range: 2026-05-23 to 2026-05-31; holdout 2026-05-31

## Locked Baseline

- Full-game side: 59.0% on 212 rows.
- Category lane: 62.6% on 195 rows.
- May 31 category lane: 11/15 (73.3%).
- May 31 O/U stress set: 5/5 (100.0%).

## Candidate Research Rows

- State formula May 31: 24/120 (20.0%).
- Pitcher-batter kernel top-collapse May 31: 4/6 (66.7%).
- Player hits May 31: 182/307 (59.3%).
- Player total bases May 31: 179/307 (58.3%).

## Reads

- State formulas lose badly to the locked May 31 category baseline and stay research-only.
- Pitcher-batter kernel top-collapse is the only promising new pocket, but it is tiny-sample and not a full-board model.
- Player identity rows are prop/triage signals, not comparable to full-game side accuracy.
- The current candidate stack does not replace the locked O/U stress benchmark; it only adds stored diagnostic rows.

Decision: no replacement model is promoted. Keep the locked baseline active; use the new rows as diagnostics for the next candidate.
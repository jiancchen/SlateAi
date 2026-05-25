# MLB Market Model Experiment Tracker — May 25, 2026

This file is the running experiment log for MLB market modeling. The goal is not to produce pretty backtests. The goal is to minimize loss and only promote lanes that survive honest walk-forward testing.

## Promotion Standard

A market is not considered successful just because it clears `50%`.

Current bar:

- must beat naive coin-flip behavior
- must survive walk-forward validation
- must produce positive threshold utility
- must be strong enough to justify real abstention and live deployment

## Baseline

Reference report:

- [/Users/jcchen/Documents/New project/development-docs/mlb-market-ml-training-052526.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-market-ml-training-052526.md)
- [/Users/jcchen/Documents/New project/development-docs/mlb-ml-tech-stack-052526.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-ml-tech-stack-052526.md)

## Experiment Log

|ID|Date|Experiment|Markets|Status|Result|Notes|
|---|---|---|---|---|---|---|
|E00|2026-05-25|Sklearn baseline on small slate-only corpus|ML / F5 / Totals / 1st inning|Completed|Misleading first pass|Fast because sample was tiny; useful only as scaffolding|
|E01|2026-05-25|Symmetric side samples for ML/F5|ML / F5|Completed|Improved design, still weak|Allowed model to choose away/home instead of inheriting board pick|
|E02|2026-05-25|Expand side training to full warehouse season|ML / F5|Completed|Helped sample size, exposed leakage|Moved side sample to full season back to March|
|E03|2026-05-25|Remove same-day profile leakage|ML / F5|Completed|Critical fix|Forced training to use prior-date team/pitcher profiles only|
|E04|2026-05-25|Remove postgame starter-line leakage|ML / F5|Completed|Critical fix|Stopped reading same-game starter performance as features|
|E05|2026-05-25|Honest sklearn baseline after leakage fixes|ML / F5 / Totals / 1st inning|Completed|Only totals survive|Current true baseline|
|E06|2026-05-25|CatBoost tabular pass|ML / F5 / Totals / 1st inning|Queued|TBD|Best next candidate|
|E07|2026-05-25|LightGBM pass|ML / F5 / Totals / 1st inning|Queued|TBD|Compare against CatBoost|
|E08|2026-05-25|XGBoost pass|ML / F5 / Totals / 1st inning|Queued|TBD|Compare against CatBoost / LightGBM|
|E09|2026-05-25|Calibration layer (Platt / isotonic)|All promotable lanes|Queued|TBD|Probability trust matters as much as raw hit rate|
|E10|2026-05-25|Favorite vs dog submodels|ML / F5|Queued|TBD|Separate favorite-hold behavior from dog-live behavior|
|E11|2026-05-25|Pass-first classifier|ML / F5 / 1st inning|Queued|TBD|Decide if a market is playable before picking a side|
|E12|2026-05-25|Collapse / hold framing|ML / F5|Queued|TBD|Model game path, not just who wins|

## Honest Baseline Metrics

After leakage fixes, the current benchmark is:

|Market|Model|OOF accuracy|Threshold record|Promotable|
|---|---|---:|---|---|
|Moneyline|`RandomForestClassifier`|51.63%|146-127 on 273 plays (53.5%)|No|
|First 5|`RandomForestClassifier`|52.58%|113-91 on 204 plays (55.4%)|No|
|Totals|`RandomForestClassifier`|55.66%|31-14 on 45 plays (68.9%)|Yes|
|First inning|`RandomForestClassifier`|54.17%|19-13 on 32 plays (59.4%)|No|

## Current Diagnosis

### Moneyline

- still too close to noise
- current features do not separate real edge from market efficiency
- probably needs better market framing and pass gating, not just another generic classifier

### First 5

- same issue as moneyline
- starter-related features help, but not enough
- may need stronger starter-hold / crack / leash-specific framing

### Totals

- only lane with real current value
- deserves the next serious model family tests first

### First inning

- still sample-starved
- better baseball-specific reasoning than ML/F5, but not enough data yet

## Model Family Notes

### CatBoost

- highest-priority next test
- strongest candidate for mixed tabular data
- likely CPU on this Mac

### LightGBM

- very good boosted-tree benchmark
- likely CPU here for our actual setup

### XGBoost

- another strong tree benchmark
- official GPU support is CUDA-oriented, so likely CPU here

### Calibration

- required once any lane looks promotable
- raw scores are not enough; we need bettable probability quality

## GPU / Metal Note

Do not assume Apple Metal will speed up these experiments.

- CatBoost macOS binaries: no CUDA GPU support on macOS
  - [CatBoost install docs](https://catboost.ai/docs/en/installation/cli-installation-binaries.html)
- XGBoost GPU: CUDA path
  - [XGBoost GPU docs](https://xgboost.readthedocs.io/en/stable/gpu/index.html)
- LightGBM GPU docs: OpenCL / CUDA / ROCm style workflows, no Apple Metal-first guidance
  - [LightGBM GPU docs](https://lightgbm.readthedocs.io/en/v4.4.0/GPU-Tutorial.html)

So the realistic plan is:

- optimize correctness first
- use CPU boosted trees
- only chase acceleration if the experiment count grows enough to matter

## Next Run Order

1. CatBoost
2. LightGBM
3. XGBoost
4. Calibration on the winner
5. Favorite/dog split models
6. Pass-first framing

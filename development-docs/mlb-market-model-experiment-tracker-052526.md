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
|E06|2026-05-25|CatBoost tabular pass|Moneyline|Completed|Worse than forest baseline|`0.7122` log loss, `54.1%` threshold hit rate, negative utility|
|E07|2026-05-25|LightGBM pass|Moneyline|Completed|Best boosted-tree threshold so far, still not promotable|`0.7438` log loss, `59.3%` threshold hit rate, utility still negative|
|E08|2026-05-25|XGBoost pass|Moneyline|Completed|Worse than LightGBM|`0.7327` log loss, `55.5%` threshold hit rate, negative utility|
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

## First Boosted-Tree Moneyline Results

Reference files:

- [/Users/jcchen/Documents/New project/development-docs/mlb-market-moneyline-catboost-052526.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-market-moneyline-catboost-052526.md)
- [/Users/jcchen/Documents/New project/development-docs/mlb-market-moneyline-lightgbm-052526.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-market-moneyline-lightgbm-052526.md)
- [/Users/jcchen/Documents/New project/development-docs/mlb-market-moneyline-xgboost-052526.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-market-moneyline-xgboost-052526.md)

|Model|Log loss|Brier|OOF accuracy|Threshold record|Threshold utility|Promotable|
|---|---:|---:|---:|---|---:|---|
|Forest baseline|0.6984|0.2524|51.63%|146-127 on 273 plays (53.5%)|-44.5|No|
|CatBoost|0.7122|0.2586|52.11%|131-111 on 242 plays (54.1%)|-35.5|No|
|LightGBM|0.7438|0.2700|52.66%|150-103 on 253 plays (59.3%)|-4.5|No|
|XGBoost|0.7327|0.2661|52.32%|122-98 on 220 plays (55.5%)|-25.0|No|

### Early takeaway

- `LightGBM` produced the best threshold hit rate of the boosted-tree group on moneyline.
- None of the three boosted-tree tests actually cleared the profitability / promotion bar.
- `Forest` still has the best calibration-oriented metrics (`log loss`, `Brier`) on moneyline.
- This means better model family alone is not enough yet; we still need better side framing and probably better targets.

## Totals Candidate Compare

Reference file:

- [/Users/jcchen/Documents/New project/development-docs/mlb-market-totals-candidates-052526.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-market-totals-candidates-052526.md)

|Model|Log loss|Brier|OOF accuracy|Promotable winner?|
|---|---:|---:|---:|---|
|Forest|0.6756|0.2414|55.66%|Yes|
|CatBoost|0.7064|0.2540|52.83%|No|
|LightGBM|0.7356|0.2670|53.77%|No|
|XGBoost|0.7264|0.2582|57.55%|No|
|HistGradientBoosting|0.8841|0.2892|57.55%|No|

### Totals takeaway

- `Forest` remains the best totals model so far.
- `XGBoost` and `HistGradientBoosting` tied on raw accuracy, but both lost badly on calibration metrics.
- That means their probabilities were worse for betting decisions even if raw winners looked similar.
- For totals, at least on the current sample, the baseline still wins.

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

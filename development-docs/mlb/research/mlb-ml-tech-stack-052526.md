# MLB ML Tech Stack — May 25, 2026

This is the current honest MLB modeling stack after removing the leakage bugs from the first boosted-tree passes.

## Current Stack

### Data sources

- Warehouse DB: `/Users/jcchen/Documents/New project/data-private/warehouse/sports.db`
- Slate payload export: [/Users/jcchen/Documents/New project/pipeline/mlb/publish/export-training-corpus.mjs](/Users/jcchen/Documents/New%20project/pipeline/mlb/publish/export-training-corpus.mjs)
- Trainer: [/Users/jcchen/Documents/New project/pipeline/mlb/research/train_mlb_market_models.py](/Users/jcchen/Documents/New%20project/pipeline/mlb/research/train_mlb_market_models.py)

### Training data shape

- `Moneyline`
  - full warehouse side samples
  - away/home both become separate samples
  - current sample size: `1468`
- `First 5`
  - full warehouse side samples
  - away/home both become separate samples
  - current sample size: `1238`
- `Totals`
  - still uses slate-export market corpus
  - current sample size: `106`
- `First inning`
  - still uses slate-export market corpus
  - current sample size: `120`

### Feature stack

#### Market inputs

- implied probabilities
- American odds
- totals line

#### Team priors

- `mlb_team_rolling_form`
- `mlb_team_story_priors`
- `mlb_lineup_dependency_profiles`
- `mlb_team_form_carryover_profiles`
- `mlb_team_lead_surrender_profiles`
- `mlb_team_whiff_persistence_profiles`

#### Pitcher priors

- `mlb_starting_pitcher_rolling_form`
- `mlb_pitcher_mistake_shape_daily`
- `mlb_starter_leash_profiles`
- `mlb_starter_third_time_penalty_profiles`

#### Slate-context features

- lineup pressure
- weather
- first-inning team/pitcher shape
- series-early shape
- state/mistake/conversion context

### Modeling layer

Current models are classic tabular ML, not deep learning:

- `RandomForestClassifier`
- `HistGradientBoostingClassifier`

Training pipeline:

- `DictVectorizer`
- `SimpleImputer(strategy="median")`
- walk-forward validation by date
- model selection by:
  - `log_loss`
  - `brier_score_loss`
  - `accuracy`

### Decision layer

Each market then gets:

- threshold search
- abstention logic
- promotable / not promotable gate

The important behavior is:

- a market is allowed to say `Pass`
- if the walk-forward record is weak, the lane gets demoted

## Leakage Fixes Already Applied

These were critical and they changed the story a lot:

1. same-day team/pitcher profile leakage removed
2. postgame starter stat leakage removed from `mlb_starting_pitchers`
3. moneyline/F5 no longer train only on the old board pick

Without those fixes, the backtests looked artificially elite.

## Honest Baseline

Current honest baseline from [/Users/jcchen/Documents/New project/development-docs/mlb/research/mlb-market-ml-training-052526.md](/Users/jcchen/Documents/New%20project/development-docs/mlb/research/mlb-market-ml-training-052526.md):

|Market|Best model|Log loss|Brier|Accuracy|Sample|Threshold record|Promotable|
|---|---|---:|---:|---:|---:|---|---|
|Moneyline|`forest`|0.6984|0.2524|51.63%|1468|146-127 on 273 plays (53.5%)|No|
|First 5|`forest`|0.6982|0.2522|52.58%|1238|113-91 on 204 plays (55.4%)|No|
|Totals|`forest`|0.6756|0.2414|55.66%|106|31-14 on 45 plays (68.9%)|Yes|
|First inning|`forest`|0.7079|0.2557|54.17%|120|19-13 on 32 plays (59.4%)|No|

## What This Means

- `Moneyline` is still not investable
- `First 5` is still not investable
- `First inning` is still not investable
- `Totals` is the only lane with real fitness right now

## GPU / Metal Reality

We should not assume Apple Metal acceleration is available for these tree libraries.

- CatBoost official install docs say released macOS binaries do **not** support CUDA GPU acceleration on macOS, including arm64:
  - [CatBoost download/install docs](https://catboost.ai/docs/en/installation/cli-installation-binaries.html)
- XGBoost official GPU docs say GPU training uses `device="cuda"` and requires CUDA-capable GPUs:
  - [XGBoost GPU support docs](https://xgboost.readthedocs.io/en/stable/gpu/index.html)
- LightGBM official GPU docs target OpenCL / CUDA / ROCm style GPU setups and document AMD / NVIDIA workflows, not Apple Metal:
  - [LightGBM GPU tutorial](https://lightgbm.readthedocs.io/en/v4.4.0/GPU-Tutorial.html)
  - [LightGBM GPU performance docs](https://lightgbm.readthedocs.io/en/v4.4.0/GPU-Performance.html)

### Practical takeaway

On this M5 Mac, these next tree-model experiments should be assumed to be CPU-first unless we prove otherwise.

## Immediate Next Candidates

1. `CatBoost`
   - best next tabular test
   - good with mixed categorical/numeric structure
2. `LightGBM`
   - stronger boosting family than current sklearn forest
3. `XGBoost`
   - good nonlinear interaction learner
4. calibration layer
   - isotonic
   - Platt / sigmoid
5. market-specific submodels
   - favorites
   - underdogs
   - pass-first classifier
6. stronger side framing
   - hold expectation
   - dog-live risk
   - collapse risk

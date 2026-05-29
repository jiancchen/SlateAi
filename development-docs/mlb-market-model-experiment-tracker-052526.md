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
|E09|2026-05-25|Calibration layer (Platt / isotonic)|Totals|Completed|Both calibrators worse than raw forest|On current totals sample, raw forest probabilities were already better|
|E10|2026-05-25|Favorite vs dog submodels|Moneyline|Completed|Neither split rescued the lane|Favorites-only and dogs-only both stayed unpromotable|
|E11|2026-05-25|Full-season raw-event warehouse backfill|ML / F5 / Totals / 1st inning|Completed|Data depth fixed, signal still mostly unchanged|Backfilled pitch events and plate appearances to Opening Day, rebuilt season state tables, and reran the forest baseline|
|E12|2026-05-25|Pass-first classifier|ML / F5 / 1st inning|Queued|TBD|Decide if a market is playable before picking a side|
|E13|2026-05-25|Collapse / hold framing|ML / F5|Queued|TBD|Model game path, not just who wins|
|E14|2026-05-29|Expanded walk-forward rerun through May 28|ML / F5 / Totals / 1st inning|Completed|Totals still only promotable lane|OOF samples grew to `1560` ML, `1318` F5, `138` totals, `171` first inning; totals stayed weakly positive, everything else remained unpromotable|
|E15|2026-05-29|Live hitter Statcast trend integration|TB / singles / HR props|Completed|Promoted for TB, cautious for singles, HR stays filter-only|Rolling `7/14/30` xwOBA, hard-hit, barrel, and sweet-spot trends now feed the live prop scorer|
|E16|2026-05-29|Phase 1 context warehousing: opponent strength + market memory|ML / F5 / Totals / run-production props|Completed|Warehoused, not yet deployed|`mlb_team_opponent_quality_daily` is dense enough to research now; `mlb_team_market_context_daily` moneyline memory is partial and totals memory is blocked until historical totals lines are backfilled|
|E17|2026-05-29|Classic last-10 hitter windows|Hits / Singles / TB props|Completed|Did not beat last-5 baseline|Raw last-10 box-score form was mostly negative for hits and TB; only longer whiff-rate memory helped singles a bit, so last-10 stays research/UI-only for now|
|E18|2026-05-29|xBA + sweet-spot + pitch-fit hits gates|Hits props|Completed|Weak alone, small gated lift only|Pure high-xBA buckets were worse than baseline; the only positive isolated gate was `7d xBA Q4 + sweet-spot Q4 + fit >= +4` at `25.0%` on `12` bets, which is shadow-only at best|
|E19|2026-05-29|Hitter opponent-strength context|Hits / Singles / TB props|Completed|Useful as a delta, weak as raw weighted form|Raw weighted last-10 production was mostly worse than baseline, but `weighted minus raw` deltas were modestly positive: `+8.3` points for hits, `+6.0` for singles, `+4.8` for TB|
|E20|2026-05-29|Hits shadow bundle: `xBA + sweet-spot + fit + opponent strength`|Hits props|Completed|Promising rate, sample too small|Best bundle variants hit `33.3%` but only on `3` bets; keep shadow-only until a larger backtest or looser gate confirms it|
|E21|2026-05-29|Looser hits shadow-threshold sweep|Hits props|Completed|Did not hold up when broadened|Relaxing the `xBA + sweet-spot + fit + strength delta` gate produced worse-than-baseline hit rates, so the narrow early lift was likely too fragile to trust|
|E22|2026-05-29|TB shadow sweep: `xSLG + hard-hit + opponent-strength delta`|TB props|Completed|Strongest new shadow candidate so far|Best usable lane was `xSLG >= Q60 + hard-hit >= Q75 + positive opponent-strength delta`: `48.6%` on `35` bets vs `31.0%` baseline|
|E23|2026-05-29|First-inning keep/fade gate audit|YRFI / NRFI|Completed|Useful selector split found|`Quiet + clean NRFI` hit `63.6%`; `pitcher-leak + double-live YRFI` hit `87.5%` on `8`; `one-side carry YRFI` was a demotion lane at `35.7%`|

## Honest Baseline Metrics

After leakage fixes, the current benchmark is:

|Market|Model|OOF accuracy|Threshold record|Promotable|
|---|---|---:|---|---|
|Moneyline|`RandomForestClassifier`|52.73%|127-123 on 250 plays (50.8%)|No|
|First 5|`RandomForestClassifier`|48.38%|110-98 on 208 plays (52.9%)|No|
|Totals|`RandomForestClassifier`|55.66%|31-14 on 45 plays (68.9%)|Yes|
|First inning|`RandomForestClassifier`|54.47%|22-15 on 37 plays (59.5%)|No|

## Latest Rerun Through May 28

Reference files:

- [/Users/jcchen/Documents/New project/development-docs/mlb-market-ml-training-052926.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-market-ml-training-052926.md)
- [/Users/jcchen/Documents/New project/data-private/predictions/mlb-market-fitness/2026-05-28-fitness.json](/Users/jcchen/Documents/New%20project/data-private/predictions/mlb-market-fitness/2026-05-28-fitness.json)

|Market|Best model|OOF accuracy|Threshold record|Threshold utility|Promotable|
|---|---|---:|---|---:|---|
|Moneyline|`forest`|52.50%|131-124 on 255 plays (51.4%)|-55.0|No|
|First 5|`forest`|48.56%|110-101 on 211 plays (52.1%)|-41.5|No|
|Totals|`forest`|50.72%|20-12 on 32 plays (62.5%)|2.0|Yes|
|First inning|`forest`|52.05%|25-20 on 45 plays (55.6%)|-5.0|No|

### Rerun takeaway

- More rows did not rescue `moneyline`, `first 5`, or `first inning`.
- `Totals` remains the only lane the ML layer can even weakly justify promoting.
- The deployment lesson is still the same: abstention matters more than squeezing extra plays out of weak side probabilities.

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

## Market-Aware Favorite / Dog Split

Reference files:

- [/Users/jcchen/Documents/New project/development-docs/mlb-market-moneyline-corpus-favorites-052526.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-market-moneyline-corpus-favorites-052526.md)
- [/Users/jcchen/Documents/New project/development-docs/mlb-market-moneyline-corpus-dogs-052526.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-market-moneyline-corpus-dogs-052526.md)

These runs use the recent market-aware pregame corpus rather than the full warehouse side sample, so the split is based on real historical favorite/dog prices.

### Favorites only

|Model|Log loss|Brier|OOF accuracy|Threshold record|Promotable|
|---|---:|---:|---:|---|---|
|Forest|0.7135|0.2597|50.33%|21-16 on 37 plays (56.8%)|No|
|CatBoost|0.7325|0.2679|49.67%|No clear edge|No|
|LightGBM|0.8084|0.3008|43.05%|No clear edge|No|
|XGBoost|0.8074|0.2975|45.03%|No clear edge|No|

### Dogs only

|Model|Log loss|Brier|OOF accuracy|Threshold record|Promotable|
|---|---:|---:|---:|---|---|
|Forest|0.7280|0.2666|50.40%|0 qualifying plays at threshold|No|
|CatBoost|0.7451|0.2731|48.00%|No clear edge|No|
|LightGBM|0.8035|0.2971|46.40%|No clear edge|No|
|XGBoost|0.8065|0.2948|49.60%|No clear edge|No|

### Split takeaway

- The side lane is not failing only because favorite and dog behavior are mixed together.
- The split models were still weak even on market-aware samples.
- That points back to target design and side framing, not just segmentation.

## Full-Season Warehouse Backfill

Reference file:

- [/Users/jcchen/Documents/New project/development-docs/mlb-season-warehouse-backfill-052526.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-season-warehouse-backfill-052526.md)

This pass did not introduce a new learner. It fixed the event-history depth problem.

- `mlb_pitch_events` now spans `2026-03-26` through `2026-05-25` with `272,612` rows.
- `mlb_plate_appearances` now spans `2026-03-26` through `2026-05-25` with `60,157` rows.
- `mlb_hitter_state_snapshots`, `mlb_team_first_inning_profiles_daily`, `mlb_team_mistake_shape_daily`, and `mlb_lineup_conversion_shape_daily` now all rebuild from season-start data instead of a May-only slice.
- Added secondary indexes across the warehouse so future season rebuilds do not brute-force the pitch-event and plate-appearance tables.

### Backfill takeaway

- The data problem was real, and now it is materially better.
- Richer season event history did **not** magically rescue moneyline or first-five on the first rerun.
- `Moneyline` calibration improved slightly (`0.6974` log loss vs `0.6984`), but threshold utility actually got worse.
- `First inning` nudged up a bit in sample and accuracy, but still failed the promotion bar.
- `Totals` stayed the only healthy lane.
- This means the next edge likely comes from better target framing and market design, not just more rows.

## Totals Calibration

Reference file:

- [/Users/jcchen/Documents/New project/development-docs/mlb-market-totals-calibration-052526.md](/Users/jcchen/Documents/New%20project/development-docs/mlb-market-totals-calibration-052526.md)

|Model|Log loss|Brier|OOF accuracy|Promotable winner?|
|---|---:|---:|---:|---|
|Forest|0.6756|0.2414|55.66%|Yes|
|Forest + isotonic|0.6940|0.2509|50.94%|No|
|Forest + sigmoid|0.6996|0.2532|47.17%|No|

### Calibration takeaway

- On the current totals sample, calibration made the probabilities worse, not better.
- That usually means the raw model was not overconfident in the simple way isotonic/Platt were trying to fix.
- We should revisit calibration only after we have a larger totals sample or a stronger base model.

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

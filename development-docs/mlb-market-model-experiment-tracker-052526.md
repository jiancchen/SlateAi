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
|E24|2026-05-29|Explicit batter outcome corpus + component baselines|Hits / Runs / RBIs / H+R+RBI|Completed|Infrastructure live; runs/H+R+RBI look more liftable than RBI|Backfilled `17,162` batter-game outcomes from `2026-03-26` through `2026-05-28`, added `runs` and combined `H+R+RBI` grading support, and wrote the first baseline report showing `Hits >=1 55.7%`, `Runs >=1 34.8%`, `RBIs >=1 27.1%`, `H+R+RBI >=2 41.2%`, with simple gates lifting runs to `44.1%` and H+R+RBI to `48.0%`|
|E25|2026-05-30|Batter outcome gate sweeps|Runs / RBIs / H+R+RBI|Completed|Runs and H+R+RBI still look stronger than RBI alone|Best `runs` gate was `slot <= 3 + xwOBA Q4 + OppQ hits delta >= 0` at `43.2%` on `838` vs `34.8%` baseline; best `RBI` gate was `slots 2-5 + xSLG Q4 + xwOBA Q4` at `32.9%` on `1828`; best `H+R+RBI` gate was `slot <= 5 + xwOBA Q4 + xSLG Q4` at `48.7%` on `2206` vs `41.2%` baseline|
|E26|2026-05-30|Rolling XOPS gate check|Runs / H+R+RBI|Completed|Useful secondary context, weaker than current best gates|`rolling 7 XOPS Q4` improved runs from `34.8%` to `38.6%` and H+R+RBI from `41.2%` to `45.5%`, but it did not beat the existing slot + xwOBA / xSLG gates, so it should stay a confirming layer instead of a primary promotion path|
|E27|2026-05-30|Starter exit threshold model|Bullpen / reliever strategy root node|Completed|Real signal found; ready to feed bullpen-shape next|On `1335` starts, the first time-split RF threshold pass improved `15+ outs` from `76.3%` baseline to `79.2%` accuracy and `18+ outs` from `57.2%` to `65.0%`. The strongest practical warning lane was `call-up / debut`: only `11.45` avg outs, `43.8%` reach `15+`, `12.3%` reach `18+`. `Leash score`, current-season WAR/GS, and opponent pressure/form were the top features; bullpen shape behind the starter also mattered enough to keep in the next pass.|
|E28|2026-05-30|Bullpen shape model with starter-exit augmentation|Bullpen / reliever strategy root node|Completed|Starter-exit outputs add real value to bullpen-shape prediction|On `1324` team-side bullpen games, a multiclass bullpen-history-only model scored `36.2%` test accuracy vs a `38.7%` majority baseline, but `history + starter exit` improved to `40.5%`. For `bulk first-up` risk, the same lift moved from `76.3%` to `79.2%` accuracy and improved Brier from `0.182` to `0.171`. The strongest added features were `starter_prob_21`, `starter_prob_18`, `starter_prob_15`, `starter_prob_12`, plus `starter_leash_score` and `starter_command_break_index`, which is enough evidence to make starter-exit risk the root input for the next first-up reliever rebuild.|
|E29|2026-05-30|First-up reliever rebuild with bullpen shape + starter exit + usage|Bullpen / reliever exact-call layer|Completed|Exact first-up stayed mostly flat, but shortlist coverage materially improved|On `272` test team-games, the old likelihood stack hit exact first-up at `18.0%`, `Top-2` at `30.1%`, and `Top-3` at `41.2%`. The rebuilt model only nudged exact first-up to `18.4%`, but improved `Top-2` to `37.5%` and `Top-3` to `52.6%`. The biggest win was on `6+ outs` bulk first-up games, where `Top-2` coverage improved from `19.4%` to `33.9%`. That means the new layer is better at identifying the right bullpen script and candidate cluster, but not yet strong enough as a standalone exact-name board model.|
|E30|2026-05-30|Reliever arsenal concentration overlay|Bullpen / reliever exact-call layer|Completed|Concentration-only pitch mix made the shortlist worse|Using local `mlb_pitch_events` to add last-15/30 relief-outing pitch concentration features (`top-2 share`, pitch-type count, fastball/breaking/offspeed share, concentration HHI) did **not** help the first-up model. In the same test window, `E29` reran at `19.9%` exact, `37.1%` `Top-2`, `52.2%` `Top-3`, while `E30` fell to `17.3%`, `32.4%`, and `48.2%`. The descriptive arsenal profiles were still interesting — bulk first-up arms used broader mixes and lower top-2 concentration than short bridge arms — but concentration alone should stay a context layer until paired with reliever quality or lineup-matchup features.|
|E31|2026-05-30|Reliever quality + role-drift + new-sample overlay|Bullpen / reliever exact-call layer|Completed|First real bullpen exact-call improvement so far|On the same `272` test team-games, `E31` improved the rebuilt reliever model from `19.5%` exact / `37.1%` `Top-2` / `52.9%` `Top-3` to `20.2%` / `41.9%` / `58.8%`. The quality layer was especially useful on the shortlist: `1-3 outs` `Top-2` improved to `43.5%`, `4-5 outs` held at `44.9%`, and the ugly `6+ outs` bulk lane improved exact first-up to `22.6%` even though `Top-2` dipped slightly. The strongest added features were role/availability plus recent reliever quality markers like `quality_entry_order_avg_last10`, `quality_strikeouts_per_bf_last10`, and recent pitch volume, while the profile table showed bulk first-up arms were much more likely to be new-team or unknown-sample arms with weaker first-pitch command.|
|E32|2026-05-30|Lineup-matchup overlay for first-up reliever choice|Bullpen / reliever exact-call layer|Completed|Biggest exact first-up jump so far; shortlist also improved|With the lineup join fixed to carry real opponent names, `E32` moved the reliever model from `19.5%` exact / `41.2%` `Top-2` / `58.1%` `Top-3` to `25.0%` / `44.1%` / `58.5%` on the same `272` test team-games. The gain showed up most in `1-5 outs` first-up usage: `1-3 outs` exact improved to `23.6%`, `4-5 outs` exact improved to `30.6%`, and both workloads improved their `Top-2` coverage. The real lift here came from reliever-hand vs lineup handedness / pressure / xwOBA interaction plus lineup dependency context; the conversion-shape fields were effectively empty in this pass, so they should not get credit yet.|
|E33|2026-05-30|Damage-fit lineup overlay with corrected conversion context|Bullpen / reliever exact-call layer|Completed|Best bullpen exact-call pass so far|Using the real recent conversion window (`8`) plus handedness-specific damage-fit features, `E33` improved the reliever model from `19.5%` exact / `41.2%` `Top-2` / `58.1%` `Top-3` to `26.5%` / `44.5%` / `59.6%` on the same `272` test team-games. It helped across every workload bucket: `1-3 outs` exact improved to `26.7%`, `4-5 outs` to `26.5%`, and even the `6+ outs` bulk lane improved to `25.8%` exact with `40.3%` `Top-2`. The model is still mostly driven by availability, role, and recent reliever quality, but the corrected lineup context is now live and contributing real lift — including a first clear damage-fit feature (`lineup_top6_same_hard_hit`) reaching the top importance tier.|
|E34|2026-05-30|Shadow first-up reliever board artifact|Bullpen / reliever inspection layer|Completed|Shadow-only board artifact is live for inspection|Built a date-driven `E34 shadow` exporter on top of the `E33` stack, writing a reliever cluster artifact and surfacing it on MLB bridge cards without changing the main live model. The shadow card shows lead / alt relievers, top-2 share, starter hook risk, and reason tags while keeping the underlying research baseline explicit (`26.5%` exact, `44.5%` `Top-2`, `59.6%` `Top-3`).|
|E35|2026-05-30|Heavy-work reset + remaining bullpen depth overlay|Bullpen / reliever shadow layer|Completed|35+ prior-pitch flag is real; removal overlay is directionally positive|Relievers coming off `35-39` pitches had only a `1.4%` next-day appearance rate and `0.0%` next-day first-up rate in the stored window; `40+` arms were effectively unavailable the next day. Dropping next-day `35+` arms from the baseline candidate stack improved exact first-up from `19.6%` to `19.8%` and `Top-3` from `40.5%` to `40.9%`, while changing the shortlist on `40.7%` of team-days where a heavy-use arm had already polluted the top-3. This is enough to promote a remaining-bullpen-quality overlay for the next shadow pass rather than treating yesterday’s bulk arm as normally available.|
|E36|2026-05-30|Adaptive relief pitch-window reset score|Bullpen / reliever shadow layer|Completed|Replaced fixed 35-pitch wall with empirical reset score|Audited `1755` relief appearances from `2026-05-10` through `2026-05-30`: next-day reuse was `22.7%` after `<20` pitches, `12.8%` after `20-29`, `6.9%` after `30-34`, `2.7%` after `35-39`, and `0.0%` after `40+`. Pitcher-level quick-reuse samples were sparse, but all `30` teams had team-level quick-reuse examples, so the live bridge chain now uses a reset score based on recent appearance, last pitch load, team/pitcher quick-reuse history, back-to-back status, and last-3 load instead of a hard `35` cutoff.|

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

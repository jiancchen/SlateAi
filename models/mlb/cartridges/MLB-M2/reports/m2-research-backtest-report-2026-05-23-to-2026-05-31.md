# MLB-M2 Research Backtest Report

Range: 2026-05-23 to 2026-05-31

## Coverage

- pitcher_batter_kernel: 61 rows
- state_formula: 1000 rows
- player_identity: 12230 rows

## State / Kernel Rows

- pitcher_batter_kernel starterWindow first-five over: 32/61 hit, rate 0.525
- state_formula bridge pass: 62/211 hit, rate 0.294
- state_formula bridge full-game over: 9/25 hit, rate 0.36
- state_formula bridge live-only: 0/12 hit, rate 0.0
- state_formula bridge live/full under watch: 2/2 hit, rate 1.0
- state_formula firstCycle pass: 28/120 hit, rate 0.233
- state_formula firstCycle first-five under: 41/117 hit, rate 0.35
- state_formula firstCycle first-five over: 7/13 hit, rate 0.538
- state_formula late pass: 69/223 hit, rate 0.309
- state_formula late full-game over: 6/14 hit, rate 0.429
- state_formula late live-only: 0/13 hit, rate 0.0
- state_formula starterWindow pass: 32/139 hit, rate 0.23
- state_formula starterWindow first-five under: 23/57 hit, rate 0.404
- state_formula starterWindow first-five over: 18/50 hit, rate 0.36
- state_formula starterWindow live-only: 0/4 hit, rate 0.0

## Player Identity Rows

- hits_per_pa medium-sample/stable: 617/1040 hit, rate 0.593
- hits_per_pa medium-sample/negative-drift: 284/465 hit, rate 0.611
- hits_per_pa medium-sample/positive-drift: 194/332 hit, rate 0.584
- hits_per_pa small-sample/stable: 80/170 hit, rate 0.471
- hits_per_pa small-sample/negative-drift: 60/107 hit, rate 0.561
- hits_per_pa small-sample/positive-drift: 33/74 hit, rate 0.446
- hits_per_pa medium-sample/cold: 25/47 hit, rate 0.532
- hits_per_pa medium-sample/hot: 23/36 hit, rate 0.639
- hits_per_pa small-sample/cold: 11/30 hit, rate 0.367
- hits_per_pa small-sample/hot: 11/24 hit, rate 0.458
- hits_per_pa medium-sample/hot-volatile: 11/19 hit, rate 0.579
- hits_per_pa tiny-sample/cold: 6/17 hit, rate 0.353
- hits_per_pa medium-sample/cold-volatile: 9/16 hit, rate 0.563
- hits_per_pa small-sample/cold-volatile: 4/13 hit, rate 0.308
- hits_per_pa tiny-sample/stable: 4/13 hit, rate 0.308
- hits_per_pa small-sample/hot-volatile: 5/12 hit, rate 0.417
- hits_per_pa tiny-sample/hot: 5/9 hit, rate 0.556
- hits_per_pa tiny-sample/hot-volatile: 7/9 hit, rate 0.778
- hits_per_pa tiny-sample/positive-drift: 3/5 hit, rate 0.6
- hits_per_pa tiny-sample/cold-volatile: 3/4 hit, rate 0.75
- hits_per_pa tiny-sample/negative-drift: 2/4 hit, rate 0.5
- home_run_rate medium-sample/stable: 1624/1927 hit, rate 0.843
- home_run_rate small-sample/stable: 356/385 hit, rate 0.925
- home_run_rate tiny-sample/stable: 47/50 hit, rate 0.94
- home_run_rate small-sample/positive-drift: 28/38 hit, rate 0.737
- home_run_rate medium-sample/positive-drift: 9/20 hit, rate 0.45
- home_run_rate medium-sample/negative-drift: 5/8 hit, rate 0.625
- home_run_rate small-sample/negative-drift: 4/5 hit, rate 0.8
- home_run_rate tiny-sample/hot: 2/3 hit, rate 0.667
- home_run_rate small-sample/hot-volatile: 0/2 hit, rate 0.0
- home_run_rate tiny-sample/cold: 1/2 hit, rate 0.5
- home_run_rate tiny-sample/hot-volatile: 1/2 hit, rate 0.5
- home_run_rate tiny-sample/negative-drift: 2/2 hit, rate 1.0
- home_run_rate tiny-sample/positive-drift: 2/2 hit, rate 1.0
- strikeout_rate medium-sample/stable: 672/1097 hit, rate 0.613
- strikeout_rate medium-sample/negative-drift: 275/445 hit, rate 0.618
- strikeout_rate medium-sample/positive-drift: 191/296 hit, rate 0.645
- strikeout_rate small-sample/stable: 108/207 hit, rate 0.522
- strikeout_rate small-sample/negative-drift: 57/101 hit, rate 0.564
- strikeout_rate small-sample/positive-drift: 37/67 hit, rate 0.552

## Holdout

Date: 2026-05-31
- pitcher_batter_kernel: 4/6 hit, rate 0.667
- state_formula: 24/120 hit, rate 0.2
- player hits_per_pa: 182/307 hit, rate 0.593
- player home_run_rate: 260/307 hit, rate 0.847
- player strikeout_rate: 184/307 hit, rate 0.599
- player total_bases_per_pa: 179/307 hit, rate 0.583
- player walk_rate: 210/307 hit, rate 0.684

This is a research backtest artifact. It stores bucket correctness, but no lane is promoted until walk-forward and price/ROI gates are added.
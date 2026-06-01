# MLB-M2 Player Identity Rows Report

Range: 2026-05-23 to 2026-05-31

## Coverage

- Identity curves: 27772
- Current deviations: 27772
- Game distributions: 27758

## Freshness

- hitter: 2026-03-27 to 2026-05-31 (173882 rows)
- pitcher: 2026-03-31 to 2026-05-30 (10374 rows)

## Type / Metric Coverage

- hitter hits_per_pa: 3770 rows, avg sample 33.0, avg vol 30.2
- hitter home_run_rate: 3770 rows, avg sample 33.0, avg vol 22.2
- hitter strikeout_rate: 3770 rows, avg sample 33.0, avg vol 29.5
- hitter total_bases_per_pa: 3770 rows, avg sample 33.0, avg vol 39.9
- hitter walk_rate: 3770 rows, avg sample 33.0, avg vol 26.1
- hitter xslg: 3736 rows, avg sample 33.3, avg vol 18.7
- hitter xwoba: 3758 rows, avg sample 33.1, avg vol 18.7
- pitcher collapse_hazard: 204 rows, avg sample 8.0, avg vol 61.2
- pitcher hits_allowed_per_start: 204 rows, avg sample 8.0, avg vol 46.0
- pitcher home_runs_allowed_per_start: 204 rows, avg sample 8.0, avg vol 46.0
- pitcher runs_allowed_per_start: 204 rows, avg sample 8.0, avg vol 46.0
- pitcher strikeouts_per_start: 204 rows, avg sample 8.0, avg vol 46.0
- pitcher walks_allowed_per_start: 204 rows, avg sample 8.0, avg vol 46.0
- pitcher whip_like: 204 rows, avg sample 8.0, avg vol 46.0

## Deviation Labels

- stable: 19907
- negative-drift: 3221
- positive-drift: 2216
- cold: 681
- hot-volatile: 605
- cold-volatile: 573
- hot: 569

## Rough Hitter Signal Checks

- hits_per_pa: direction 0.571 on 2446 rows; signal rate 0.877; actual rate 0.556
- home_run_rate: direction 0.851 on 2446 rows; signal rate 0.067; actual rate 0.111
- strikeout_rate: direction 0.606 on 2446 rows; signal rate 0.803; actual rate 0.57
- total_bases_per_pa: direction 0.57 on 2446 rows; signal rate 0.485; actual rate 0.327
- walk_rate: direction 0.72 on 2446 rows; signal rate 0.046; actual rate 0.274

This report is a research surface. It validates coverage and rough signal behavior only; it does not promote player identity rows to the value board.
# MLB-SP1 Shadow Calibration 2026-06-12_2026-06-14

- Run ID: mlb-sp1-calibration-2026-06-12_2026-06-14-20260615174403
- Generated: 2026-06-15T17:45:06.420Z
- Dates: 2026-06-12, 2026-06-13, 2026-06-14
- Step status counts: passed=8, failed_allowed=5
- Continue on error: yes

## Backtest Readout

- Rows: 104
- Matched actual rows: 94
- Collapse risk: 12/24 (50%)
- Runs delta: 20/39 (51.3%)
- Hits delta: 33/60 (55%)
- HR delta: 46/71 (64.8%)

## Steps

| Step | Status | Duration |
| --- | --- | ---: |
| Warehouse canonical split families 2026-06-12 | passed | 11.1s |
| Audit canonical split families 2026-06-12 | failed_allowed | 0.2s |
| Build MLB-SP1 profiles 2026-06-12 | passed | 2.7s |
| Audit MLB-SP1 profiles 2026-06-12 | failed_allowed | 0.4s |
| Warehouse canonical split families 2026-06-13 | passed | 10.3s |
| Audit canonical split families 2026-06-13 | failed_allowed | 0.2s |
| Build MLB-SP1 profiles 2026-06-13 | passed | 5.5s |
| Audit MLB-SP1 profiles 2026-06-13 | failed_allowed | 0.4s |
| Warehouse canonical split families 2026-06-14 | passed | 17.3s |
| Audit canonical split families 2026-06-14 | failed_allowed | 0.6s |
| Build MLB-SP1 profiles 2026-06-14 | passed | 8.0s |
| Audit MLB-SP1 profiles 2026-06-14 | passed | 1.0s |
| Backtest MLB-SP1 shadow 2026-06-12_2026-06-14 | passed | 5.2s |

## Non-Passing Steps

- Audit canonical split families 2026-06-12: failed_allowed (Command failed: npm run data:audit:mlb-player-split-families -- --date 2026-06-12)
- Audit MLB-SP1 profiles 2026-06-12: failed_allowed (Command failed: npm run data:audit:mlb-sp1 -- --date 2026-06-12)
- Audit canonical split families 2026-06-13: failed_allowed (Command failed: npm run data:audit:mlb-player-split-families -- --date 2026-06-13)
- Audit MLB-SP1 profiles 2026-06-13: failed_allowed (Command failed: npm run data:audit:mlb-sp1 -- --date 2026-06-13)
- Audit canonical split families 2026-06-14: failed_allowed (Command failed: npm run data:audit:mlb-player-split-families -- --date 2026-06-14)

Promotion read: SP1 stays shadow until this report shows durable, lane-specific lift across a settled multi-date sample.


# MLB ENV1/RP2 M2 Shadow Backtest - 2026-06-12

Question: after wiring `MLB-ENV1` and `MLB-RP2` into M2 as passive contexts, do they help actual M2 predictions?

Short answer: RP2 has immediate warning/gating value. ENV1 should remain passive for M2 totals until we have settled HRForce/weather coverage.

## Replay Window

- Window: `2026-05-10` to `2026-06-11`
- Source predictions: saved public M2 slate summaries in `published-data/slates`
- Outcomes: typed MLB warehouse `mlb_game_outcomes`
- Shadow addendums: regenerated on demand with current `MLB-ENV1.2026-06-12.v2` and `MLB-RP2.2026-06-12.v2`
- M2 side rows scored: `424`
- ENV1 attached to M2 rows: `424/424`
- RP2 attached to both team sides: `424/424`
- M2 total projection rows scored: `196`
- M2 actionable full-game total rows: `59`
- Exact umpire rows in replay: `14`

Important caveat: historical FIC weather/HRForce rows are not warehoused for this window. `mlb_fic_weather_daily` currently has June 12 only, so this replay mostly tests park/local-time/limited umpire ENV1, not the richer June 12 weather layer.

## Official Addendum Backtests

ENV1, same M2-public window:

| Metric | Result |
| --- | ---: |
| Matched settled games | `430` |
| FIC weather games | `0` |
| Exact umpire games | `14` |
| Total runs MAE | `3.546` |
| Rolling baseline MAE | `3.543` |
| Directional hit rate | `54.7%` |
| Promotion status | `shadow_only` |

Read: ENV1 did not beat the rolling total baseline in this public M2 window, and the weather/HRForce component cannot be validated without settled FIC weather rows.

RP2, same M2-public window:

| Metric | Result |
| --- | ---: |
| Matched team-sides | `841` |
| Usable team-sides | `737` |
| Relief runs MAE | `1.701` |
| Baseline relief runs MAE | `1.728` |
| Relief-runs MAE lift | `1.6%` |
| First-up exact | `18.0%` |
| First-up top 3 | `45.6%` |
| Promotion status | `shadow_only` |

Read: RP2 is already slightly better at team-side relief run projection, but first-up identity is still below the threshold for replacing RP36.

## M2 Side Replay

Baseline M2 side hit rate in this replay:

| Rows | Hits | Hit Rate |
| ---: | ---: | ---: |
| `424` | `235` | `55.4%` |

RP2 bridge-stress edge:

Definition: `oppBridgeStress - pickBridgeStress`. Positive means the opponent bullpen is more stressed than the picked side. Negative means the picked side has the worse bullpen bridge.

| Bucket | Rows | Hit Rate | Avg Bridge Edge |
| --- | ---: | ---: | ---: |
| RP2 bridge neutral, abs edge `< 12` | `230` | `60.0%` | `+0.7` |
| RP2 supports pick, edge `>= +12` | `113` | `52.2%` | `+22.9` |
| RP2 warns against pick, edge `<= -12` | `81` | `46.9%` | `-23.6` |

Read: RP2 should not promote sides just because it supports them. The stronger immediate use is as a warning: when RP2 says the picked side has the more stressed bridge, M2 side hit rate falls meaningfully below baseline.

ENV1 side buckets:

| Bucket | Rows | Hit Rate | Avg ENV Runs Delta |
| --- | ---: | ---: | ---: |
| Neutral band | `356` | `55.9%` | `+0.042` |
| ENV `<= -0.18` | `53` | `58.5%` | `-0.315` |
| ENV `>= +0.35` | `15` | `33.3%` | `+0.398` |

Read: high-run ENV1 buckets were poor for M2 sides, but the sample is tiny and lacks HRForce history. Use this only as a volatility warning for now.

## M2 Total Replay

Base M2 total projection:

| Rows | MAE | RMSE |
| ---: | ---: | ---: |
| `196` | `3.859` | `5.274` |

ENV1 additive sweep on base M2 total projection:

| ENV1 Weight | MAE | RMSE |
| ---: | ---: | ---: |
| `0.00` | `3.859` | `5.274` |
| `0.25` | `3.857` | `5.273` |
| `0.50` | `3.856` | `5.272` |
| `0.75` | `3.855` | `5.272` |
| `1.00` | `3.854` | `5.272` |

Read: a full ENV1 run-delta add reduced MAE by only `0.005` runs on this sample. That is not enough to justify changing total math, especially because the sample lacks FIC weather/HRForce and M2 already had older weather/park context.

M2 actionable full-game totals:

| Rows | Hits | Hit Rate |
| ---: | ---: | ---: |
| `59` | `24` | `40.7%` |

Read: the existing actionable total lane needs broader repair/calibration before ENV1 should be allowed to move public total picks. ENV1 can annotate why an over/under is fragile, but not rescue the lane by itself.

## Prediction Impact

What helps now:

- Add RP2 as a side confidence warning when `oppBridgeStress - pickBridgeStress <= -12`.
- Use RP2 for late-scoring risk, bullpen-path warnings, totals notes, and postmortem explanation.
- Keep RP2 identity fields visible, but do not trust first-up reliever identity as a pick driver yet.

What does not yet clear:

- Directly adding ENV1 `expected.totalRunsDelta` into M2 totals.
- Promoting sides because RP2 supports the pick.
- Using ENV1 weather/HRForce as a backtested M2 edge before settled weather-covered slates exist.

Recommended next shadow gate:

- If M2 confidence is below `60` and RP2 bridge edge is `<= -12`, cap public confidence or add a visible bullpen-path warning.
- If ENV1 has `HRForce >= 1.4`, use it as support against fragile unders and for HR/over context, but keep it shadow until at least `100` settled FIC-weather games are graded.

## Commands Run

```bash
npm run data:backtest:mlb-env1 -- --start-date 2026-05-10 --end-date 2026-06-11
npm run data:backtest:mlb-rp2 -- --start-date 2026-05-10 --end-date 2026-06-11
```

No publish or Vercel command was run.

# MLB-M3 Alpha-3 Harness Artifact Review

Date: 2026-06-03

Source manifest: `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_20260603T093000Z/manifest.json`

Harness output:

```text
data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_20260603T093000Z/training_harness/
```

Status: accepted as first alpha-3 harness smoke test

## What Ran

The alpha-3 harness loaded the alpha-2 manifest, validated it, read the alpha-1 Parquet matrix with DuckDB, split rows chronologically, and wrote metrics-only outputs for:

- `full_game_total`
- `f5_total`

No candidate model was enabled for this smoke test.

## Split

| Split | Range | Rows |
| --- | --- | ---: |
| Train candidate | 2026-03-26 through 2026-05-15 | 668 |
| Validation candidate | 2026-05-16 through 2026-05-31 | 218 |

The split is still a harness placeholder, not a final walk-forward backtest design.

## Baseline Metrics

These are sanity metrics from train-mean baselines only.

| Lane | Validation Rows | MAE | RMSE | Mean Error |
| --- | ---: | ---: | ---: | ---: |
| `full_game_total` | 218 | 3.5878 | 4.5033 | -0.0938 |
| `f5_total` | 218 | 2.6605 | 3.3686 | -0.1487 |

These are not edge claims.

## Validation

`python3 -m pipeline.mlb.m3.harness.validate_alpha3_harness --harness-dir data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_20260603T093000Z/training_harness --json`

Result:

- 7 checks passed
- 0 errors
- 0 warnings
- 9 JSON files validated
- 0 candidate model files

## Scope Review

The harness output contains:

- `metrics.json`
- `split_summary.json`
- `target_summary.json`
- `calibration_placeholder.json`
- lane reports
- dashboard state
- typed registry preview
- artifact index
- report

The harness output does not contain:

- picks
- selection rows
- player prop pricing
- market fair probability claims
- simulator event logs
- promotion decisions
- a claim that M3 is better

## Caveat

This smoke test still uses the shallow alpha-1 feature artifact. It proves the run harness works. It does not prove the model has useful baseball features yet. The next step is `M3-FS-002`.

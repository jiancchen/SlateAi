# MLB-ENV1 Game Environment Addendum

MLB-ENV1 materializes game-level run-environment adjustments for M2.

It writes `mlb_game_environment_adjustments_daily` and a dated JSON artifact under `data-private/warehouse/mlb/environment-adjustments/`.

## Inputs

- static park context from `web/src/lib/mlb-park-context.js`
- FIC weather / HRForce from `mlb_fic_weather_daily`
- TheCapper home-plate umpire assignments from `mlb_umpire_assignments_daily`
- FIC umpire factor profiles from `mlb_fic_umpire_factors_daily`

## Rules

- HRForce `>= 1.4` is a higher run / HR carry signal.
- HRForce `< 1.4` is lower run carry.
- HRForce N/A in dome/no-weather-impact settings is treated as lower weather carry.
- Umpire adjustments are only applied when the assignment is an exact game/date match. Unresolved or stale assignment rows record zero umpire delta.

## Outputs

- `expected_total_runs_delta`
- `expected_hr_delta`
- `expected_k_delta`
- `expected_walk_delta`
- `run_environment_signal`
- source flags, reasons, and a full feature snapshot

## Backtest

Run:

```bash
npm run data:backtest:mlb-env1 -- --start-date 2026-03-26 --end-date 2026-06-11
```

The local FIC weather warehouse currently starts on 2026-06-12, so historical backtests mostly validate the park component until daily weather captures settle.

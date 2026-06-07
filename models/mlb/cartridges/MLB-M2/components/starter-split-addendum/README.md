# Starter Split Addendum

Status: shadow only.

This component tests whether ESPN pitcher splits and StatMuse starter-vs-opponent history improve M2's existing starter-window reads without replacing them.

## Inputs

Primary warehouse source:

```text
data-private/warehouse/sports/mlb/sql-mlb.db
```

Required tables:

- `mlb_pitcher_espn_splits`
- `mlb_starter_vs_team_statmuse`
- `mlb_phase_outcomes_daily` for shadow grading

Do not use JSONL as a fallback for this component. If the SQL-MLB source rows are missing, the shadow report should show source coverage gaps instead of silently backfilling.

## Scores

Each starter receives three additive scores on a capped `-10` to `+10` scale:

- `earlyLeakageScore`: positive means the starter profile supports more first-inning scoring pressure.
- `f5StabilityScore`: positive means the starter profile supports a cleaner first-five run-suppression path.
- `f5SideScore`: positive means the starter profile helps the starter's team in the first-five side/tie shape.

The exported object shape is:

```js
starterSplitAddendum: {
  away: {
    earlyLeakageScore: 8.2,
    f5StabilityScore: -3.1,
    f5SideScore: 2.4,
    reasons: []
  },
  home: {},
  adjustments: {
    yrfiProbabilityPct: 2.1,
    first5TotalRuns: 0.18,
    awayFirst5LeadProbabilityPct: 1.4
  },
  mode: 'shadow'
}
```

## Impact Caps

The addendum is intentionally small:

- YRFI/NRFI probability: max `+/-4` percentage points per game.
- F5 total projection: max `+/-0.35` runs per game.
- F5 side/tie lead probability: max `+/-3` percentage points per game.

These caps prevent ESPN/StatMuse splits from hijacking M2 or overfitting one slate.

## Shadow Backtest

Run:

```bash
npm run data:research:mlb-starter-split-addendum -- --date YYYY-MM-DD
```

Report outputs:

```text
models/mlb/cartridges/MLB-M2/reports/starter-split-addendum-shadow-YYYY-MM-DD.md
models/mlb/cartridges/MLB-M2/reports/starter-split-addendum-shadow-YYYY-MM-DD.json
```

The report compares:

- baseline YRFI/NRFI hit rate and high-confidence misses
- addendum-adjusted YRFI/NRFI hit rate and high-confidence misses
- baseline F5 total lean results
- addendum-adjusted F5 total lean results
- source coverage for both ESPN and StatMuse starters

## Promotion Rule

Do not wire this into live M2 scoring until the shadow reports show at least one improvement without obvious harm:

- lower confidence on bad YRFI misses
- preserve correct NRFI hits
- improve F5 total/tie classification
- leave already-correct picks mostly unchanged

When promoted, keep `starterSplitAddendum` in `analysis.mlbProjection` with `mode: 'active'` and keep the capped deltas visible for audit.

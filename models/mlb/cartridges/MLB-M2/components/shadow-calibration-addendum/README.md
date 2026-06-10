# Shadow Calibration Addendum

Status: shadow only.

This component scores whether an already-generated MLB-M2 row should be promoted, watched, or treated as research-only. It does not change the baseball projection, the market line, or the saved model pick. It adds a trust layer used for board sorting, POTD eligibility, and explanation.

## Purpose

M2 can be directionally useful while still over-promoting weak lanes. The shadow calibration addendum answers:

- should this row be visually promoted?
- is it eligible for POTD?
- why is the row promoted, downgraded, or research-only?
- which recent bucket result is influencing the trust layer?

The addendum must preserve every underlying market read on the game detail page. It only changes tiering and ranking.

## Output Shape

Attach this object to every value-board candidate row:

```js
shadowCalibration: {
  mode: 'shadow',
  tier: 'promoted', // promoted | watch | research
  potdEligible: true,
  calibratedScore: 78,
  modelConfidence: 72,
  lane: 'ml-shape',
  primarySignal: 'modelConfidence',
  secondarySignal: 'marketEdge',
  tiebreakSignal: 'marginSupport',
  metricConflict: 'high-confidence-thin-margin',
  reasons: [
    'Brewers: Confidence is carrying this ML read; 3.3% margin support is thin, so this is a closer-score win profile. +6.0 pts market edge.',
    'ML shape confidence >=65 is the current promoted seed bucket.'
  ],
  cautions: [
    'Small sample: June 6-8 seed window only.'
  ],
  evidence: {
    seedWindow: '2026-06-06..2026-06-08',
    bucket: 'ml-shape confidence >=65',
    record: '12-3',
    hitRatePct: 80.0
  }
}
```

## Tier Definitions

- `promoted`: sorted first inside its lane, eligible for POTD, shown with a promotion marker.
- `watch`: visible in the same lane, not eligible for POTD by default.
- `research`: visible below promoted/watch rows or in a research section, not eligible for POTD.

Do not hide research rows by default. The point is to keep transparency while preventing weak rows from looking like core bets.

## Current Seed Rules

These rules come from the June 6-8, 2026 shadow pass and must remain marked as small-sample until walk-forward reports confirm them.

Promote:

- ML shape when model confidence is `>=65`.
- NRFI when model confidence is `>=60`.
- F5 ML when projected edge is `0.5` to `1.49` runs and modeled F5 tie probability is `<20%`.
- F5 team totals when the confidence bucket is not the current weak middle bucket. Initial seed: promote confidence `>=65` or `<60`, watch `60-64`.

Watch:

- ML shape below `65`.
- F5 ML outside the promoted edge/tie window.
- F5 team totals in the `60-64` bucket until more data lands.

Research-only:

- YRFI rows.
- F5 O/U rows.
- Any F5 O/U row whose final lane is `Pass`, `Hold`, or `Unsupported over`.
- Any row with missing line/outcome lineage.

## Sorting

Inside each value-board lane:

1. `promoted`
2. `watch`
3. `research`

Within a tier:

1. `calibratedScore`
2. `modelConfidence`
3. model edge or projected margin
4. market edge when available

For ML shape, use a stricter public order because recent review showed `diff/total` can over-rank low-confidence sides:

1. promotion tier
2. model confidence
3. edge versus market
4. projected run-gap share, labeled as `margin support`

Do not label run-gap share as the deciding value metric. It is context and a tiebreaker, not the primary ML trust signal.

ML shape reasons must explain conflicts:

- high confidence + low margin support: promote/watch from confidence, but call it a closer-score win profile.
- high margin support + low confidence: do not promote; call out that the scoreboard cushion is not trusted enough.
- high confidence + high margin support: say both probability and projected cushion back the read.

POTD should select only from `promoted` rows. If a lane has no promoted row, the lane should show `No POTD candidate` rather than reaching into watch/research rows.

## Detail Page Requirements

Every game detail page should still display:

- ML / ML shape
- F5 ML
- F5 O/U
- F5 team totals
- YRFI / NRFI

Each line should show the shadow calibration tier and reason. Example:

```text
Shadow calibration: Research
Reason: YRFI high-confidence buckets have underperformed in the current seed window. Keep visible for tracking, but not POTD eligible.
```

## Shadow Report

Run:

```bash
npm run data:research:mlb-shadow-calibration-addendum -- --dates YYYY-MM-DD,YYYY-MM-DD
```

Report outputs:

```text
models/mlb/cartridges/MLB-M2/reports/shadow-calibration-addendum-YYYY-MM-DD-to-YYYY-MM-DD.md
models/mlb/cartridges/MLB-M2/reports/shadow-calibration-addendum-YYYY-MM-DD-to-YYYY-MM-DD.json
```

The report must include:

- baseline all-lane record
- trusted-lane record after removing YRFI and F5 O/U from promotion
- bucket-filtered core record
- lane bucket tables for ML shape, F5 ML, F5 O/U, NRFI, YRFI, and F5 team totals
- POTD top-by-section comparison for raw sort vs calibrated sort

## Promotion Rule

Do not make this an active hidden filter until it passes a larger walk-forward window. It may be used immediately as a visible shadow tier if:

- rows are not deleted,
- reasons and cautions are visible,
- POTD eligibility is based only on the shadow tier,
- the report date range is shown in the evidence payload.

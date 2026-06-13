# MLB ENV1/RP2 To M2 Integration Plan - 2026-06-12

## Scope

This note maps how the new `MLB-ENV1` game-environment addendum and `MLB-RP2` relief projection addendum should plug into the active `MLB-M2` slate pipeline.

No deploy or Vercel action is part of this plan. Both addendums remain `shadow-candidate` inputs.

## Runbook Fit

The daily morning runner already builds both addendums before M2 day-file generation:

```bash
npm run data:build:mlb-env1 -- --date YYYY-MM-DD
npm run data:build:mlb-rp2 -- --date YYYY-MM-DD
npm run data:generate:mlb-day -- --date YYYY-MM-DD
```

Relevant daily-run boundaries:

- ENV1 weather/HRForce can support totals, HR, and team-total reads, but cannot be the only promotion reason.
- Umpire deltas are usable only when the home-plate assignment is an exact game/date match.
- RP2 is source context for relief runs, bridge stress, and bullpen-path warnings. It does not replace RP36 identity usage yet.
- Shadow calibration and addendum layers may annotate, tier, or warn; they must not delete value rows or rewrite saved predictions without a validated promotion gate.

## Current Wiring

`models/mlb/db/day-games.mjs` already reads both warehouse tables:

- `mlb_game_environment_adjustments_daily`
- `mlb_relief_pitcher_projection_v1_daily`

The DB game object already exposes:

- `environmentAdjustmentContext`
- `parkContext` sourced from `MLB-ENV1`
- `reliefProjectionContext.away`
- `reliefProjectionContext.home`

For `2026-06-12`, the SQL tables have same-day rows and the DB loader attaches them:

- ENV1 table rows: `30`
- RP2 table rows: `60`
- DB games with ENV1 context: `15/15`
- DB games with away/home RP2 context: `15/15`

## Main Gap

The clean public publish path intentionally sets `MLB_DAY_GAMES_DISABLE_DB=1` and reads generated rich M2 files. That protects the public slate from losing rich batter cards, but the generated `web/src/lib/day-YYYY-MM-DD-data.js` payload currently does not serialize ENV1 or RP2 contexts.

Observed `2026-06-12` DB-disabled load:

- games: `15`
- ENV1 contexts: `0`
- RP2 away contexts: `0`
- RP2 home contexts: `0`
- park source falls back to static `2024-2026` or `fallback-neutral`

So the addendums are built and available in SQL, but they are not consistently carried into the rich generated/public path.

## Plug-In Order

### 1. Transport First

Before changing model math, persist the addendum contexts through the generated-day path.

Best first patch:

- Merge `environmentAdjustmentContext`, `parkContext`, and `reliefProjectionContext` into `enrichedRawGames` in `models/mlb/cartridges/MLB-M2/lanes/generate-day-files.mjs`.
- Update `pipeline/lib/load-mlb-day-games.mjs` fallback so `buildGenericMlbGame()` preserves `raw.environmentAdjustmentContext`, `raw.parkContext`, and `raw.reliefProjectionContext` when present.
- Keep static park fallback only when ENV1 park context is absent.

Acceptance check:

```bash
MLB_DAY_GAMES_DISABLE_DB=1 node --input-type=module -e "import { loadMlbDayGames } from './pipeline/lib/load-mlb-day-games.mjs'; const g=await loadMlbDayGames('YYYY-MM-DD'); console.log(g.length, g.filter(x=>x.environmentAdjustmentContext).length, g.filter(x=>x.reliefProjectionContext?.away).length)"
```

Expected: DB-disabled load should show addendum coverage for all active generated games that have source rows.

### 2. Passive Exposure

Add diagnostic summaries before altering predictions:

- Append `ENV1 run environment` to `sourceParts` in `mlb-analysis-context.js` when present.
- Append `RP2 relief projection` when both team-side contexts are present.
- Add `mlbProjection.environmentAdjustment` with expected deltas, HRForce, visibility, and exact-umpire status.
- Add `mlbProjection.reliefProjection` with team-side bridge stress, projected relief runs allowed, run-risk tier, and lead-reliever metadata.

This gives UI, public JSON, and postmortem tools a stable surface without silently changing picks.

### 3. Conservative M2 Consumption

After transport and diagnostics are verified, use shadow-weighted adjustments only.

ENV1:

- Totals: create an ENV1-adjusted diagnostic total from base M2 full-game total plus a capped shadow-weighted `expected.totalRunsDelta`. Start with diagnostics/warnings, then graduate to lean confidence only after replay.
- F5 vs late split: do not dump the full ENV1 total delta into F5. If used numerically, keep F5 weight small and let late/game-total carry most of the adjustment.
- Hits: apply `expected.hitsDelta` and `visibility.hitsMultiplier` as capped team-split context in projected hit profiles.
- HR lane: use `expected.hrDelta`, `park.indexHr`, `weather.effectiveHrForce`, `weather.signal`, and `visibility.hrMultiplier`.
- Pitcher Ks/walks: use ENV1 K/BB deltas only when `environmentAdjustmentContext.umpire.assignmentStatus === 'exact'`; otherwise treat as zero.

RP2:

- Use it team-side. An offense should read the opponent's relief projection.
- Late scoring: add RP2 bridge stress, projected relief runs allowed, fatigue, leverage availability, quality score, and run-risk tier to late run conversion.
- Totals: high bridge stress and high projected relief runs allowed should support overs or reduce under confidence.
- HRs: a high opposing bridge-stress or relief run-risk tier can support late HR paths, especially for hitters with relief-share HR history.
- Do not replace RP36 or the existing likely-reliever identity surface until RP2 first-up top-3 coverage clears the promotion gate.

### 4. Lane-Specific Hooks

Core M2 projection:

- File: `models/mlb/cartridges/MLB-M2/lib/mlb-analysis-context.js`
- Hooks:
  - `buildProjectedHitProfile()`
  - `buildRunConversionRate()`
  - total lean construction
  - `mlbProjection` output object
  - `mlbRiskContext`

Home runs:

- File: `models/mlb/cartridges/MLB-M2/lanes/home-runs.mjs`
- Replace static-only `parkContextByHomeTeam[homeTeam]` with `game.parkContext ?? static`.
- Add matchup fields for ENV1 HR delta, HRForce/effective HRForce, visibility HR multiplier, and opposing RP2 bridge stress.
- Add tags/reasons such as `env-hr-lift`, `late-light-suppression`, and `rp2-bridge-stress` only when thresholds are met.

Hitter props:

- File: `models/mlb/cartridges/MLB-M2/lib/mlb-props.js`
- Most hitter props inherit through `analysis.mlbProjection`. Once projected hits/runs/weather carry ENV1/RP2, hits, singles, total bases, runs, RBI, and H+R+RBI naturally pick up the context.
- Add direct ENV1 tags only for visibility/HRForce explanations so reasons are auditable.

Pitcher strikeouts:

- File: `models/mlb/cartridges/MLB-M2/lanes/props.mjs`
- Add optional `environmentAdjustmentContext`.
- Apply K delta only on exact umpire assignment.
- Add `exact-umpire-k-lift` or `exact-umpire-k-drag` script tags when the delta materially changes expected Ks.

Game shape and simulation:

- Files:
  - `models/mlb/cartridges/MLB-M2/lib/mlb-game-shape.js`
  - `models/mlb/cartridges/MLB-M2/lib/mlb-simulation.js`
- These can mostly inherit the adjusted `mlbProjection`. Add explicit ENV1/RP2 notes only for shape labels and postmortem readability.

## Guardrails

- ENV1/RP2 should not be POTD gates yet.
- Do not promote HR, over, or team-total over from HRForce alone.
- Do not use umpire profile rows without exact assignment.
- Do not trust RP2 first reliever identity as a pick reason yet. Current first-up top-3 is still below promotion threshold.
- Keep RP36 and existing bridge-chain context visible while RP2 remains shadow.
- Store both raw base projection and addendum-adjusted diagnostics so backtests can separate model change from presentation/ranking change.

## Validation Plan

1. Transport audit: generated DB-disabled games retain ENV1/RP2 contexts.
2. No-math snapshot: public/prediction outputs are unchanged except added diagnostics.
3. Replay report: compare base M2 totals and ENV1/RP2-adjusted diagnostics over settled games.
4. Lane slices:
   - full-game totals by ENV1 signal
   - HR candidates by HRForce and visibility bucket
   - pitcher K rows by exact-umpire delta
   - late totals and side collapses by RP2 bridge-stress tier
5. Promote only after the replay shows lift without hiding new failure modes.

## Current Recommendation

Do the transport and passive exposure patch first. That is low-risk, makes the addendums visible everywhere M2 already expects rich game context, and avoids silently changing June 12-style predictions before the addendum replay is measured.

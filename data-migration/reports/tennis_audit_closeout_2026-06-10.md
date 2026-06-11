# Tennis Audit Closeout

Snapshot date: `2026-06-10`

Status: audit phase is ready for model ideation, not model build.

No DB cleanup or mutation has been applied by this audit. `TEN-T0` remains archived/forensic, and no replacement tennis model has been created.

## What We Know

| Area | Finding |
| --- | --- |
| Date readiness | 91 dates audited; 0 usable, 71 usable with warnings, 20 blocked |
| Date sanity | 1 invalid date value and 2 far-future date values |
| Canonical shape | 1,173 canonical TennisLive-shaped matches; 544 non-TennisLive quarantine matches |
| Source freshness | 0 current-publish-ready dates; 438 missing required source slots; 17 stale required source slots |
| Predictions/settlement | 776 prediction rows; 0 settled; 0 settlement-ready |
| Prediction quarantine | 468 quarantined prediction rows; 289 rows missing DB match; 251 TEN-T0 rows; 72 market-only rows |
| Entity resolution | 15 players missing registry rows; 41 duplicate match-player side groups; 507 market rows missing player id |
| Context coverage | 1,173 canonical matches have summaries, but only 224 have both-player form snapshots |
| Jun 7-9 review queues | 154 non-TennisLive matches, 72 orphan prediction rows, 68 TEN-T0 market-only rows, 184 market identity gaps, 56 duplicate market groups |
| Guarded exports | Jun 7, Jun 8, and Jun 9 are all blocked from public publish |

## Closeout Decision

The audit work is sufficient to start discussing model ideas, because the broken surfaces are now visible and named.

The audit work is not sufficient to train, backtest, publish, or evaluate a replacement model. The DB still needs a cleanup phase with copied-DB rehearsals, reversible migrations, and owner approval.

## Hard Gates Before Model Build

1. Define canonical match/player/market/result contracts.
2. Run cleanup on a copied DB before any production DB mutation.
3. Remove or isolate non-TennisLive match shapes from candidate model-input surfaces.
4. Resolve duplicate participant side groups and missing player registry rows.
5. Separate market-watch rows from prediction rows.
6. Backfill or define settlement/result provenance before performance claims.
7. Require source freshness/readiness for any current-publish workflow.
8. Block public exports unless `exportReadiness.publishAllowed` is true.

## Model Ideation Boundary

Allowed now:

- Discuss target markets and lanes.
- Discuss what a future prediction should mean.
- Sketch candidate feature families.
- Identify which current tables might become input candidates.
- Define evaluation and settlement requirements.

Not allowed yet:

- Train or backtest against the current prediction rows as truth.
- Promote TEN-T0 output into a replacement model.
- Treat market-only rows as predictions.
- Claim model performance.
- Mutate the production DB without a copied-DB cleanup rehearsal.

## Source Artifacts

- `development-docs/tennis/runbooks/data_audit_runbook.md`
- `data-migration/reports/tennis_data_shape_audit_2026-06-10.json`
- `data-migration/reports/tennis_date_readiness_2026-06-10.json`
- `data-migration/reports/tennis_source_freshness_2026-06-10.json`
- `data-migration/reports/tennis_entity_resolution_2026-06-10.json`
- `data-migration/reports/tennis_context_coverage_2026-06-10.json`
- `data-migration/reports/tennis_settlement_readiness_2026-06-10.json`
- `data-migration/reports/tennis_quarantine_candidates_2026-06-07_2026-06-09.json`
- `data-migration/reports/tennis_public_export_preview_2026-06-07_guarded.json`
- `data-migration/reports/tennis_public_export_preview_2026-06-08_guarded.json`
- `data-migration/reports/tennis_public_export_preview_2026-06-09_guarded.json`

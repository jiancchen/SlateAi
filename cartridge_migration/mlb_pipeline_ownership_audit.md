# MLB Pipeline Ownership Audit

Date: 2026-05-31

This audit records what still belongs in `pipeline/mlb/` after the MLB-M0 cartridge migration pass. The goal is to keep future AI and human passes from treating every remaining pipeline file as unfinished model migration work.

## Ownership Rule

- Active parent cartridges under `models/mlb/cartridges/{modelId}/` own daily model behavior: prediction lanes, workflow orchestration, model scoring code, model notes, run locks, and golden checks.
- `models/mlb/cartridges/MLB-RP36/` owns the relief-pitcher addendum behavior and should eventually get its own run envelope.
- `pipeline/mlb/` owns sport data plumbing: source fetches, warehouse ingest/derive/grade commands, and offline research scripts until a specific model cartridge promotes them.
- `development-docs/mlb/` owns runbooks, postmortems, research writeups, and historical notes.

## Current Pipeline Classification

| Folder | Current Role | Keep In Pipeline? | Reason | Promotion Rule |
| --- | --- | --- | --- | --- |
| `pipeline/mlb/fetchers/` | Source pulls and watchers | Yes | External data acquisition is additive and should stay model-neutral. | Only move a fetcher if it becomes a model-specific synthetic feature generator rather than a source pull. |
| `pipeline/mlb/warehouse/` | DB ingest, derivation, grading, and list commands | Yes | Shared warehouse state should remain stable across model cartridges. | Move only pure scoring/feature formulas that are version-specific to a cartridge. Keep table creation and raw/derived storage here. |
| `pipeline/mlb/publish/` | Compatibility launchers | Temporarily | These now dispatch through `models/mlb/run-cartridge.mjs`, which resolves the active parent cartridge. | Remove after direct callers are audited or formally keep as stable CLI shims. |
| `pipeline/mlb/research/` | Offline experiments, audits, and postmortem generators | Yes for now | Research scripts are not production model lanes until promoted by a cartridge manifest and golden test. | Promote the smallest reusable feature/gate code into `models/mlb/cartridges/{modelId}/lib/`, then leave the research script as an experiment harness. |
| `pipeline/mlb/workflows/` | Compatibility launchers | Temporarily | These now dispatch through `models/mlb/run-cartridge.mjs`, which resolves the active parent cartridge. | Remove after direct callers are audited or formally keep as stable CLI shims. |

## Research Script Families

| Family | Examples | Likely Destination If Promoted |
| --- | --- | --- |
| Side/model gates | `research_mlb_side_features.py`, `research_mlb_veto_engine.py`, `research_mlb_opponent_quality_side_gates.py` | `models/mlb/cartridges/MLB-M0/lib/` as named gate modules |
| First-five / first-inning | `research_mlb_first5_state_model.py`, `research_mlb_first_inning_gates.py` | Future MLB-F* or MLB-M0 lane module if used in daily board |
| Hitter/prop shape | `research_mlb_hitter_statcast_signal.py`, `research_mlb_batter_xops_gates.py`, `research_mlb_hits_shadow_bundle.py` | MLB-M0 prop feature modules, with prop-lane backtests |
| Relief addendum | `research_mlb_first_up_reliever_model.py`, `research_mlb_bullpen_shape_model.py` | `models/mlb/cartridges/MLB-RP36/` or future relief addendum cartridge |
| Market/Kalshi | `research_mlb_kalshi_market_shape.py`, `train_mlb_market_models.py` | Future MLB-E* / market cartridge once model objective is formalized |
| Postmortem/reporting | `research_mlb_slate_postmortem.py` | Keep in pipeline/research while output goes to `development-docs/mlb/postmortems/` |

## Next Safe Migration Moves

1. Add a run envelope for `MLB-RP36` so relief addendum source/input/output drift is tracked independently.
2. Move only promoted, production-used feature formulas from research scripts into model cartridge modules.
3. Narrow MLB-M0 source locks after compatibility launchers and historical web shims are either removed or accepted as permanent CLI/API surfaces.
4. Keep warehouse schema and raw/derived DB commands model-neutral unless a future cartridge explicitly creates a versioned table.

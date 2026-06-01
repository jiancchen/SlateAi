# MLB-M2 Follow-ups

This file is the cartridge-local doorway into MLB-M2 performance review. It should point to the daily postmortems and summarize the model changes that came out of them, without copying large result artifacts into the cartridge.

## May 30 Baseline

Artifacts:

- Run manifest: `data-private/model-runs/mlb/MLB-M2/2026-05-30/run.json`
- Results journal: `data-private/history/mlb-results-2026-05-30.jsonl`
- Side board: `data-private/predictions/mlb-sides/2026-05-30-board-live.json`
- Postmortem: `development-docs/mlb/postmortems/may30-slate-postmortem-053026.md`
- Follow-up plan: `development-docs/mlb/postmortems/may30-chaos-followups-053026.md`

Performance:

- Full-game sides: 6-9
- First-five sides: 9-6
- First-inning lane: 9-6
- Home-run board: 3/12
- Tracked props: 33/62

May 31 pre-slate rules:

- Do not promote a full-game side if the same read is cleaner as F5, NRFI/YRFI, or a total.
- Any side with high relief risk and no clear early-scoring thesis should be downgraded.
- Any underdog needs a named reason: opponent dead-early, opponent traffic-no-conversion, opponent chaos gap, snapback pressure, or same-series suppression.
- First-inning picks should be treated as timing picks, not broad offense picks.
- Total-bases props need a specific hitter/starter reason, not just a high aggregate confidence score.

## Implemented From May 30

- MLB-M2 now indexes May 30 performance in `performance_index.json`.
- MLB-M2 exposes a quiet-start full-game gate: scoreless-first-three, traffic-without-conversion, and quiet-first-five rates can veto or penalize side promotion.
- The MLB-M2 model card notes that full-game confidence is not enough by itself when early-run conversion is weak.

## May 31 Pregame Run

Artifacts:

- Run manifest: `data-private/model-runs/mlb/MLB-M2/2026-05-31/run.json`
- Side veto artifact: `data-private/predictions/mlb-sides/2026-05-31-veto-artifact.json`
- Player props: `data-private/predictions/mlb-player-props/2026-05-31-player-props.json`
- Home-run board: `data-private/predictions/mlb-home-runs/2026-05-31-statcast-prototype.json`
- Reliever shadow: `data-private/predictions/mlb-reliever-shadow/2026-05-31-reliever-shadow.json`
- Lineup board: `data-private/lineups/mlb/2026-05-31-lineup-board.json`

Pregame read:

- 15 MLB games, 13 posted lineups, 17 partial lineup states, 0 pending lineup states.
- MLB-M2/MLB-RP36 run `mlb-2026-05-31-MLB-W1-MLB-F0-MLB-M2-MLB-RP36-MLB-E0` is snapshotted and checked.
- The May 30 quiet-start gate is active on this slate. Broad full-game sides are downgraded when the pick profile carries scoreless-first-three, traffic-without-conversion, or quiet-first-five risk.
- Today should be evaluated by lane: full-game side, first-five/timing expression, first-inning, totals, tracked props, HR board, and MLB-RP36 bridge read.
- Pitcher strikeout under rows now publish side-specific probability rather than the raw over-side probability, so confidence and probability point in the same direction.
- Tracked total-bases rows now require backed damage-contact support and enough hitter sample. Tiny-sample or soft-heat TB rows should not rank as core plays.
- Hitter props now carry a career repeatability layer from MLB player profile data. A player with a tiny 2026 sample can still show as a watch candidate when the career story supports it, but the model must label it as career-backed heat, apply volatility penalties, and keep unsupported one-game spikes out of tracked props.
- Career profile is a low-weight baseline, not a conviction stat. MLB-M2 now adds a batter approach proxy to tell whether the current player identity is rising, fading, or merely a noisy box-score spike, and prop grading prints repeatability buckets so this layer has to earn its keep in backtests.
- Savant game logs are lower priority because pitch/game rows already exist in the warehouse. Daily handedness/platoon splits are now snapshotted in `mlb_hitter_split_snapshots`; full Savant HTML split tables remain a follow-up for month, batting-order, runners, game-type, outs, and Statcast split fields.

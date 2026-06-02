# MLB Normalization Parsers

This package owns reusable MLB parser/injection modules for promoting `sql-mlb.db` legacy rows into typed tables.

Rules:

- Keep parser logic here, not embedded directly inside migration scripts.
- Migration scripts in `data-migration/scripts/normalize_mlb_*.py` should call these modules.
- Use canonical `game_id`, `team_id`, `player_id`, `venue_id`, `market_id`, and `model_run_id` wherever possible.
- Insert high-confidence aliases into `entity_aliases`.
- Quarantine ambiguous rows in `unresolved_entities`.
- Preserve residual source detail in `source_detail_json`, but keep active model/dashboard fields typed.
- Do not modify public/site/API outputs during normalization.

Planned modules:

| Module | Family |
|---|---|
| `results.py` | Game, team, player, pitcher, HR, and phase outcomes |
| `lineups.py` | Lineups, lineup slots, and lineup/pitcher matchup shape |
| `hitter_features.py` | Batter Statcast/classic/state/pitch-type/current-deviation features |
| `pitcher_features.py` | Starter/pitcher pitch mix, first-inning, mistake, leash, and third-time penalty features |
| `bullpen_features.py` | Bullpen usage, relief chains, and reliever command profiles |
| `team_features.py` | Team game-shape features |
| `environment.py` | Weather, sun, park, and visibility rows |
| `markets.py` | Sportsbook and prediction-market prices, contracts, ticks, and labels |
| `props.py` | Player prop odds |
| `predictions.py` | Prediction, settlement, and backtest rows |
| `model_metadata.py` | Model run/component/lane/artifact rows |
| `player_context.py` | Career, splits, identity, and leaderboard context |
| `team_context.py` | Story priors, story labels, signals, and series context |
| `game_shape.py` | M2 state-formula training and backtest rows |


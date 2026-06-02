# MLB Normalization Inventory

Generated: `2026-06-02T08:18:44.705647+00:00`

## Summary

- Legacy source tables: `70`
- Legacy rows: `1,206,213`
- `core_model_data` tables: `58`
- `secondary_feature_event` tables: `12`
- Unclassified leftovers: `0`

## Source Registrations

| Source | Snapshots | Date Range | Sample Path |
|---|---:|---|---|
| `baseballsavant` | 136 | 2026-03-26 to 2026-06-01 | `data-private/raw/baseballsavant/hitter-statcast/2026-03-26/details.csv` |
| `mlb_odds` | 131 | 2026-03-26 to 2026-06-01 | `data-private/odds/kalshi/mlb/2026-05-29-kalshi-markets.json` |
| `mlb_raw_daily` | 1,888 | 2026-03-26 to 2026-06-01 | `data-private/raw/mlb/2026-03-26/games/823081-feed-live.json.gz` |
| `mlb_stats_api` | 55 | 2026-05-30 to 2026-06-01 | `data-private/raw/mlb-stats-api/hitter-career-profiles/2026-05-30/profiles-1.json` |

## Family Classification

| Family | Bucket | Tables | Rows | Parser | Target Tables |
|---|---|---:|---:|---|---|
| MLB bullpen/relief shape | `core_model_data` | 5 | 29,425 | `pipeline/sources/mlb/normalization/bullpen_features.py` | `bullpen_mistake_shape_snapshots`, `bullpen_usage_snapshots`, `likely_relief_chains`, `reliever_command_profiles`, `team_bullpen_shape_snapshots` |
| MLB environment/sun/park | `core_model_data` | 2 | 601 | `pipeline/sources/mlb/normalization/environment.py` | `game_environment_snapshots`, `game_sun_visibility_snapshots`, `game_visibility_outcomes` |
| MLB game-shape/state formula | `core_model_data` | 2 | 8,181 | `pipeline/sources/mlb/normalization/game_shape.py` | `state_formula_backtests`, `state_formula_training_rows` |
| MLB hitter/batter features | `core_model_data` | 8 | 693,712 | `pipeline/sources/mlb/normalization/hitter_features.py` | `player_classic_stat_snapshots`, `player_current_deviation_snapshots`, `player_game_distribution_snapshots`, `player_opponent_context_snapshots`, `player_pitch_type_response_snapshots`, `player_statcast_game_logs`, `player_statcast_snapshots`, `player_state_snapshots` |
| MLB lineup/matchup features | `core_model_data` | 3 | 26,009 | `pipeline/sources/mlb/normalization/lineups.py` | `lineup_matchup_snapshots`, `lineup_shape_snapshots`, `lineup_slots`, `lineups` |
| MLB market/odds context | `secondary_feature_event` | 2 | 2,044 | `pipeline/sources/mlb/normalization/markets.py` | `market_mispricing_labels`, `team_market_context_snapshots` |
| MLB markets/odds | `core_model_data` | 2 | 2,000 | `pipeline/sources/mlb/normalization/markets.py` | `market_contracts`, `market_price_ticks`, `market_snapshots` |
| MLB model metadata | `core_model_data` | 4 | 68 | `pipeline/sources/mlb/normalization/model_metadata.py` | `model_component_runs`, `model_run_artifacts`, `model_run_lanes`, `model_runs` |
| MLB pitcher/starter features | `core_model_data` | 6 | 149,971 | `pipeline/sources/mlb/normalization/pitcher_features.py` | `pitcher_first_inning_profiles`, `pitcher_mistake_shape_snapshots`, `pitcher_pitch_mix_snapshots`, `starter_leash_profiles`, `starter_third_time_penalty_profiles`, `starting_pitcher_form_snapshots` |
| MLB player career/splits/context | `secondary_feature_event` | 6 | 187,869 | `pipeline/sources/mlb/normalization/player_context.py` | `pitcher_season_value_snapshots`, `player_career_profiles`, `player_identity_curves`, `player_identity_profiles`, `player_split_snapshots`, `statcast_hr_leaderboard_snapshots` |
| MLB predictions/backtests | `core_model_data` | 9 | 16,791 | `pipeline/sources/mlb/normalization/predictions.py` | `component_settlement_rows`, `home_run_backtest_rows`, `player_identity_backtest_rows`, `prediction_rows`, `prop_backtest_rows`, `settlement_rows`, `side_backtest_rows` |
| MLB props/odds | `core_model_data` | 1 | 2,409 | `pipeline/sources/mlb/normalization/props.py` | `prop_market_snapshots` |
| MLB results/outcomes | `core_model_data` | 8 | 51,768 | `pipeline/sources/mlb/normalization/results.py` | `batter_game_outcomes`, `game_outcomes`, `home_run_events`, `phase_outcomes`, `pitcher_appearances`, `player_game_batting`, `starting_pitcher_game_logs`, `team_game_stats` |
| MLB team trend/context | `secondary_feature_event` | 4 | 5,673 | `pipeline/sources/mlb/normalization/team_context.py` | `game_story_labels`, `game_story_signals`, `series_context_snapshots`, `team_story_priors` |
| MLB team/game-shape features | `core_model_data` | 8 | 29,692 | `pipeline/sources/mlb/normalization/team_features.py` | `team_first_inning_profiles`, `team_form_carryover_profiles`, `team_lead_surrender_profiles`, `team_mistake_shape_snapshots`, `team_opponent_quality_snapshots`, `team_rolling_form_snapshots`, `team_state_snapshots`, `team_whiff_persistence_profiles` |

## Source Table Classification

| Source Table | Rows | Bucket | Family | Target Tables | Consumer Files | Notes |
|---|---:|---|---|---|---:|---|
| `mlb_hitter_pitch_type_response_daily` | 206,697 | `core_model_data` | MLB hitter/batter features | `player_pitch_type_response_snapshots` | 5 | Pitch-type response is a batter feature used for matchup shape. |
| `mlb_player_current_deviation_daily` | 184,256 | `core_model_data` | MLB hitter/batter features | `player_current_deviation_snapshots` | 6 | Current-vs-career deviation is active batter repeatability signal. |
| `mlb_player_identity_curves_daily` | 184,256 | `secondary_feature_event` | MLB player career/splits/context | `player_identity_curves` | 6 | Identity curves are player context. |
| `mlb_player_game_distribution_daily` | 184,228 | `core_model_data` | MLB hitter/batter features | `player_game_distribution_snapshots` | 6 | Player distribution is active prop/model shape input. |
| `mlb_pitcher_pitch_mix_daily` | 135,153 | `core_model_data` | MLB pitcher/starter features | `pitcher_pitch_mix_snapshots` | 5 | Pitch mix drives pitcher-batter matchup shape. |
| `mlb_hitter_statcast_trend_snapshots` | 25,797 | `core_model_data` | MLB hitter/batter features | `player_statcast_snapshots`, `player_statcast_game_logs` | 18 | Statcast hitter trend/game-log features drive batter strength and prop shape. |
| `mlb_hitter_classic_trend_snapshots` | 25,167 | `core_model_data` | MLB hitter/batter features | `player_classic_stat_snapshots` | 2 | Classic hitter form is a batter feature. |
| `mlb_hitter_opponent_context_snapshots` | 25,167 | `core_model_data` | MLB hitter/batter features | `player_opponent_context_snapshots` | 9 | Opponent context is needed for pitcher-batter matchup shape. |
| `mlb_hitter_state_snapshots` | 24,396 | `core_model_data` | MLB hitter/batter features | `player_state_snapshots` | 11 | Hitter state feeds game-flow and prop gates. |
| `mlb_batter_game_outcomes` | 18,080 | `core_model_data` | MLB results/outcomes | `batter_game_outcomes` | 5 | Batter game outcomes are labels for props and batter state. |
| `mlb_player_game_batting` | 18,080 | `core_model_data` | MLB results/outcomes | `player_game_batting` | 5 | Player batting outcomes are model labels and prop settlement inputs. |
| `mlb_hitter_statcast_game_logs` | 18,004 | `core_model_data` | MLB hitter/batter features | `player_statcast_snapshots`, `player_statcast_game_logs` | 4 | Statcast hitter trend/game-log features drive batter strength and prop shape. |
| `mlb_lineup_pitcher_matchup_daily` | 17,655 | `core_model_data` | MLB lineup/matchup features | `lineups`, `lineup_slots`, `lineup_matchup_snapshots`, `lineup_shape_snapshots` | 6 | Lineup and matchup shape are core model data. |
| `mlb_bullpen_usage` | 16,542 | `core_model_data` | MLB bullpen/relief shape | `bullpen_usage_snapshots`, `bullpen_mistake_shape_snapshots`, `team_bullpen_shape_snapshots` | 9 | Bullpen shape is core side/total model input. |
| `mlb_player_identity_model_backtests` | 12,230 | `core_model_data` | MLB predictions/backtests | `player_identity_backtest_rows` | 6 | Identity model backtests are performance labels. |
| `mlb_pitcher_appearances` | 7,498 | `core_model_data` | MLB results/outcomes | `pitcher_appearances` | 16 | Pitcher appearances are labels and workload inputs. |
| `mlb_state_formula_training_rows` | 7,120 | `core_model_data` | MLB game-shape/state formula | `state_formula_training_rows` | 6 | State formula rows are core M2 training data. |
| `mlb_lineup_conversion_shape_daily` | 5,262 | `core_model_data` | MLB lineup/matchup features | `lineups`, `lineup_slots`, `lineup_matchup_snapshots`, `lineup_shape_snapshots` | 11 | Lineup and matchup shape are core model data. |
| `mlb_team_first_inning_profiles_daily` | 5,262 | `core_model_data` | MLB team/game-shape features | `team_first_inning_profiles` | 5 | Team first-inning profile is active RFI/F5 input. |
| `mlb_team_mistake_shape_daily` | 5,262 | `core_model_data` | MLB team/game-shape features | `team_mistake_shape_snapshots` | 9 | Mistake shape is active chaos input. |
| `mlb_team_rolling_form` | 5,196 | `core_model_data` | MLB team/game-shape features | `team_rolling_form_snapshots` | 2 | Team rolling form is active prediction input. |
| `mlb_starting_pitcher_rolling_form` | 4,533 | `core_model_data` | MLB pitcher/starter features | `starting_pitcher_form_snapshots` | 6 | Starter rolling form is core prediction input. |
| `mlb_reliever_first_batter_command_profiles` | 4,113 | `core_model_data` | MLB bullpen/relief shape | `reliever_command_profiles`, `likely_relief_chains` | 5 | Reliever/chain profiles drive starter-to-bullpen game flow. |
| `mlb_starter_leash_profiles` | 4,005 | `core_model_data` | MLB pitcher/starter features | `starter_leash_profiles` | 7 | Starter leash affects F5/full-game shape. |
| `mlb_bullpen_mistake_shape_daily` | 3,508 | `core_model_data` | MLB bullpen/relief shape | `bullpen_usage_snapshots`, `bullpen_mistake_shape_snapshots`, `team_bullpen_shape_snapshots` | 8 | Bullpen shape is core side/total model input. |
| `mlb_likely_relief_chains` | 3,508 | `core_model_data` | MLB bullpen/relief shape | `likely_relief_chains` | 1 | Relief chain is active game-flow input. |
| `mlb_team_lead_surrender_profiles` | 3,508 | `core_model_data` | MLB team/game-shape features | `team_lead_surrender_profiles` | 3 | Lead surrender profile affects late-game total/side shape. |
| `mlb_team_whiff_persistence_profiles` | 3,508 | `core_model_data` | MLB team/game-shape features | `team_whiff_persistence_profiles` | 4 | Whiff persistence affects offensive volatility. |
| `mlb_team_form_carryover_profiles` | 3,448 | `core_model_data` | MLB team/game-shape features | `team_form_carryover_profiles` | 3 | Carryover feeds game-shape continuity. |
| `mlb_lineup_dependency_profiles` | 3,092 | `core_model_data` | MLB lineup/matchup features | `lineups`, `lineup_slots`, `lineup_matchup_snapshots`, `lineup_shape_snapshots` | 5 | Lineup and matchup shape are core model data. |
| `mlb_team_story_priors` | 3,092 | `secondary_feature_event` | MLB team trend/context | `team_story_priors` | 6 | Story priors are useful context but lower-trust than direct features. |
| `mlb_pitcher_first_inning_profiles_daily` | 3,024 | `core_model_data` | MLB pitcher/starter features | `pitcher_first_inning_profiles` | 5 | First-inning pitcher profile is active F5/RFI input. |
| `mlb_pitcher_mistake_shape_daily` | 3,024 | `core_model_data` | MLB pitcher/starter features | `pitcher_mistake_shape_snapshots` | 6 | Pitcher mistake shape is active chaos/game-flow input. |
| `mlb_player_prop_odds_snapshots` | 2,409 | `core_model_data` | MLB props/odds | `prop_market_snapshots` | 8 | Player prop odds are active prop EV inputs. |
| `mlb_home_run_events` | 1,900 | `core_model_data` | MLB results/outcomes | `home_run_events` | 1 | Home-run events label HR prop lanes. |
| `mlb_game_team_stats` | 1,776 | `core_model_data` | MLB results/outcomes | `team_game_stats` | 4 | Team box stats label game shape. |
| `mlb_starting_pitcher_game_logs` | 1,776 | `core_model_data` | MLB results/outcomes | `starting_pitcher_game_logs` | 11 | Starter game logs are labels and pitcher form inputs. |
| `mlb_phase_outcomes_daily` | 1,772 | `core_model_data` | MLB results/outcomes | `phase_outcomes` | 8 | Phase outcomes label inning/phase model lanes. |
| `mlb_team_bullpen_shape_daily` | 1,754 | `core_model_data` | MLB bullpen/relief shape | `bullpen_usage_snapshots`, `bullpen_mistake_shape_snapshots`, `team_bullpen_shape_snapshots` | 6 | Bullpen shape is core side/total model input. |
| `mlb_team_market_context_daily` | 1,754 | `secondary_feature_event` | MLB market/odds context | `team_market_context_snapshots` | 2 | Market context is useful for calibration and mispricing studies. |
| `mlb_team_opponent_quality_daily` | 1,754 | `core_model_data` | MLB team/game-shape features | `team_opponent_quality_snapshots` | 3 | Opponent quality adjusts team form. |
| `mlb_team_state_snapshots` | 1,754 | `core_model_data` | MLB team/game-shape features | `team_state_snapshots` | 13 | Team state is active model input. |
| `mlb_prop_backtests` | 1,688 | `core_model_data` | MLB predictions/backtests | `settlement_rows`, `prop_backtest_rows` | 13 | Prop backtests are model performance labels. |
| `mlb_prop_predictions` | 1,688 | `core_model_data` | MLB predictions/backtests | `prediction_rows` | 8 | Prop predictions are active model outputs. |
| `mlb_featured_market_odds_snapshots` | 1,610 | `core_model_data` | MLB markets/odds | `market_snapshots` | 3 | Market odds are core EV and value-board inputs. |
| `mlb_pitcher_war_by_season` | 1,527 | `secondary_feature_event` | MLB player career/splits/context | `pitcher_season_value_snapshots` | 6 | Season WAR is secondary pitcher context. |
| `mlb_state_formula_backtests` | 1,061 | `core_model_data` | MLB game-shape/state formula | `state_formula_backtests` | 5 | State formula backtests are core M2 validation data. |
| `mlb_game_outcomes` | 886 | `core_model_data` | MLB results/outcomes | `game_outcomes` | 25 | Game outcomes are settlement labels. |
| `mlb_game_story_labels` | 886 | `secondary_feature_event` | MLB team trend/context | `game_story_labels`, `game_story_signals` | 3 | Story labels/signals are useful context and diagnostics. |
| `mlb_game_story_signals` | 886 | `secondary_feature_event` | MLB team trend/context | `game_story_labels`, `game_story_signals` | 7 | Story labels/signals are useful context and diagnostics. |
| `mlb_series_context_snapshots` | 809 | `secondary_feature_event` | MLB team trend/context | `series_context_snapshots` | 5 | Series context is useful but secondary. |
| `mlb_hitter_split_snapshots` | 693 | `secondary_feature_event` | MLB player career/splits/context | `player_split_snapshots` | 7 | Splits are useful context and should be typed for DuckDB joins. |
| `mlb_hitter_career_profiles` | 493 | `secondary_feature_event` | MLB player career/splits/context | `player_career_profiles` | 4 | Career profiles are lower-weight player context. |
| `mlb_player_identity_profiles` | 493 | `secondary_feature_event` | MLB player career/splits/context | `player_identity_profiles` | 1 | Identity profiles are player context. |
| `statcast_hr_leaderboard_snapshots` | 407 | `secondary_feature_event` | MLB player career/splits/context | `statcast_hr_leaderboard_snapshots` | 4 | Leaderboard snapshots are useful HR context. |
| `mlb_kalshi_market_snapshots` | 390 | `core_model_data` | MLB markets/odds | `market_contracts`, `market_price_ticks`, `market_snapshots` | 2 | Prediction-market prices are core EV inputs. |
| `mlb_side_backtests` | 389 | `core_model_data` | MLB predictions/backtests | `settlement_rows`, `side_backtest_rows` | 16 | Side backtests are model performance labels. |
| `mlb_side_predictions` | 389 | `core_model_data` | MLB predictions/backtests | `prediction_rows` | 19 | Side predictions are active model outputs. |
| `mlb_game_sun_visibility_snapshots` | 306 | `core_model_data` | MLB environment/sun/park | `game_environment_snapshots`, `game_sun_visibility_snapshots` | 6 | Sun visibility feeds error/chaos modeling. |
| `mlb_game_visibility_outcomes` | 295 | `core_model_data` | MLB environment/sun/park | `game_visibility_outcomes` | 4 | Visibility outcomes label environment factors. |
| `mlb_market_mispricing_labels` | 290 | `secondary_feature_event` | MLB market/odds context | `market_mispricing_labels` | 4 | Mispricing labels are calibration context. |
| `mlb_starter_third_time_penalty_profiles` | 232 | `core_model_data` | MLB pitcher/starter features | `starter_third_time_penalty_profiles` | 6 | Third-time penalty feeds starter-to-bullpen transition. |
| `mlb_home_run_predictions` | 194 | `core_model_data` | MLB predictions/backtests | `prediction_rows` | 4 | Home-run predictions are active model outputs. |
| `mlb_home_run_backtests` | 182 | `core_model_data` | MLB predictions/backtests | `settlement_rows`, `home_run_backtest_rows` | 8 | Home-run backtests are model performance labels. |
| `model_run_lanes` | 38 | `core_model_data` | MLB model metadata | `model_run_lanes` | 7 | Model lane rows are required for model history. |
| `mlb_rp36_team_settlements` | 30 | `core_model_data` | MLB predictions/backtests | `settlement_rows`, `component_settlement_rows` | 2 | RP36 settlement rows are active component labels. |
| `model_run_artifacts` | 19 | `core_model_data` | MLB model metadata | `model_run_artifacts` | 4 | Model artifact rows are required for model history. |
| `model_runs` | 8 | `core_model_data` | MLB model metadata | `model_runs` | 19 | Model run rows are required for model history. |
| `model_component_runs` | 3 | `core_model_data` | MLB model metadata | `model_component_runs` | 4 | Component rows are required for cartridge composition. |
| `mlb_rp36_settlements` | 1 | `core_model_data` | MLB predictions/backtests | `settlement_rows`, `component_settlement_rows` | 3 | RP36 settlement rows are active component labels. |

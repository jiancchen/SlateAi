# MLB M3 Output Contract Inventory

Generated: 2026-06-03T01:21:02.246Z

This is a read-only backfill of the current MLB output surface. It inventories artifact contracts, existing cartridge contract files, and typed DB output tables so M3 can be designed from outputs backward.

## Executive Summary

- Artifact families scanned: 9
- Artifact files scanned: 98
- Observed artifact dates: 2026-05-10 to 2026-06-01 (19 distinct dates)
- Existing contract source files: 5
- DB sources inspected: 2/2
- Typed/legacy DB output tables present: 26/44

## Observed Artifact Families

| Family | Class | Files | Dates | Row Contracts | Notes |
|---|---:|---:|---:|---|---|
| Side board picks | market_prediction + selection_row | 11 | 7 | side_board_pick: 219 rows / 272 fields<br>game_flow_total_context: 204 rows / 29 fields<br>first_inning_context: 72 rows / 28 fields | Moneyline/side board rows with selected team, confidence, edge, and embedded game-shape context. |
| Side veto artifact | selection_policy_result | 10 | 10 | side_veto_pick: 132 rows / 26 fields | Post-model side gating rows with veto reasons and recommended action. |
| Player prop picks | market_prediction + selection_row | 17 | 17 | player_prop_pick: 1322 rows / 67 fields | Current player prop board rows for hits, total bases, walks, home runs, RBI, and related markets. |
| Legacy player prop picks | legacy_market_prediction + selection_row | 11 | 11 | legacy_player_prop_pick: 3648 rows / 67 fields | Legacy player prop rows that should be mapped only for baseline comparison. |
| Home run board | market_candidate + selection_row | 18 | 18 | home_run_pick: 216 rows / 113 fields<br>home_run_game_context: 225 rows / 464 fields | Home-run candidate board. Current artifact is score/rank oriented rather than probability/line oriented. |
| Reliever shadow forecast | latent_forecast | 4 | 4 | reliever_shadow_team: 108 rows / 33 fields<br>reliever_shadow_pitcher: 324 rows / 23 fields | RP36/E36 first-up reliever, availability, bridge, and expected-outs forecast. |
| Lineup board and matchup state | canonical_slate_state + feature_snapshot | 17 | 17 | lineup_game: 226 rows / 563 fields<br>lineup_player: 3817 rows / 169 fields<br>lineup_matchup_context: 226 rows / 772 fields | Lineups, hitter split/statcast/pitch-fit state, starter context, and per-game matchup board. |
| Market fitness research artifacts | research_artifact | 9 | 2 | market_fitness_top_level: 9 rows / 160 fields<br>market_fitness_rows: 0 rows / 0 fields | Training/fitness outputs that should become tracked experiment artifacts, not slate presentation payloads. |
| Model cartridge snapshots | run_snapshot | 1 | 1 | snapshot_top_level: 1 rows / 1690 fields<br>snapshot_game: 15 rows / 455 fields<br>snapshot_side_pick: 15 rows / 21 fields<br>snapshot_prop_pick: 0 rows / 0 fields<br>snapshot_home_run_pick: 0 rows / 0 fields | Golden and snapshotted model-run payloads with compacted games, picks, and source artifact hashes. |

## Contract Seeds For M3

| Contract | Status | Evidence | Purpose |
|---|---|---|---|
| `canonical_slate_state` | observed_as_artifact_needs_db_contract | `lineup_board.lineup_game`<br>`lineup_board.lineup_player` | Input state shared by all prediction heads. |
| `latent_forecast.reliever_shadow` | observed | `reliever_shadow.reliever_shadow_team`<br>`reliever_shadow.reliever_shadow_pitcher` | First-up reliever cluster, availability, bridge quality, expected outs/pitches. |
| `latent_forecast.game_flow` | observed_inside_side_board_needs_promoted_forecast_contract | `side_board.game_flow_total_context`<br>`side_board.first_inning_context` | Full-game, first-five, late-game, and first-inning run-shape context used by market heads. |
| `market_prediction.moneyline` | partial_observed_missing_explicit_model_probability | `side_board.side_board_pick` | Known-game team win probability and edge against moneyline market. |
| `market_prediction.full_game_total` | market_lines_observed_context_only_prediction_rows_missing | `typed_mlb_sqlite.market_contracts market_type=total`<br>`side_board.game_flow_total_context.fullGame` | Over/under probability against known full-game total lines. |
| `market_prediction.first5_total` | market_lines_observed_context_only_prediction_rows_missing | `typed_mlb_sqlite.market_contracts market_type=first5Total`<br>`side_board.game_flow_total_context.first5` | Over/under probability against known first-five total lines. |
| `market_prediction.first_inning` | market_lines_observed_context_only_prediction_rows_missing | `typed_mlb_sqlite.market_contracts market_type=firstInning`<br>`side_board.first_inning_context` | First-inning yes/no or over/under probability against known market lines. |
| `market_prediction.first5_moneyline` | market_lines_observed_prediction_rows_missing | `typed_mlb_sqlite.market_contracts market_type=first5Winner` | First-five side probability against known first-five winner contracts. |
| `market_prediction.player_prop` | observed_needs_normalization | `player_props.player_prop_pick` | Known player prop line probability and expected value. |
| `market_prediction.home_run` | candidate_only_missing_probability_and_market_line | `home_runs.home_run_pick` | Player HR probability/edge against available market. |
| `selection_policy_result` | observed_mixed_into_prediction_payloads | `side_veto.side_veto_pick`<br>`side_board.side_board_pick`<br>`player_props.player_prop_pick` | Board inclusion/pass/veto decision separated from model probability. |
| `experiment_artifact` | observed_unstandardized | `market_fitness.market_fitness_top_level`<br>`model_snapshots.snapshot_top_level` | Training/backtest/model fitness artifact with metrics, feature set, and data lineage. |

## Row Contract Detail

### Side board picks

Class: `market_prediction + selection_row`

Files: 11; dates: 2026-05-10 to 2026-05-31

#### side_board_pick

Path: `picks[]`; rows: 219; fields: 272; always-present fields: 80

Key observed fields:
- `*confidence`
- `*gameId`
- `*gameTitle`
- `*indicators.marketProbability`
- `*marketProbability`
- `*modelEdge`
- `*modelName`
- `projection.teamScripts[].teamName`
- `projection.awayLikelyRelievers[].availabilityScore`
- `projection.awayLikelyRelievers[].bridgeScore`
- `projection.awayLikelyRelievers[].expectedOuts`
- `projection.awayLikelyRelievers[].firstRelieverLikelihood`
- `projection.homeLikelyRelievers[].availabilityScore`
- `projection.homeLikelyRelievers[].bridgeScore`
- `projection.homeLikelyRelievers[].expectedOuts`
- `projection.homeLikelyRelievers[].firstRelieverLikelihood`
- `projection.awayLikelyRelievers[].pitcherId`
- `projection.homeLikelyRelievers[].pitcherId`
- `projection.firstInning.line`
- `gamePk`

Sample values:
- `confidence`: `60`, `52`, `53`
- `gameId`: `nationals-marlins`, `athletics-orioles`, `rays-red-sox`
- `gameTitle`: `Nationals @ Marlins`, `Athletics @ Orioles`, `Rays @ Red Sox`
- `indicators.marketProbability`: `0.5689655172413793`, `0.5073891625615764`, `0.4878048780487805`
- `marketProbability`: `0.5689655172413793`, `0.5073891625615764`, `0.4878048780487805`
- `modelEdge`: `5.4`, `14.7`, `7`
- `modelName`: `board-moneyline-v2`, `board-moneyline-v2-may16`, `board-moneyline-v2-may17`
- `projection.teamScripts[].teamName`: `Angels`, `Guardians`, `Yankees`

Observed domains:
- `modelName`: `board-moneyline-v2`, `board-moneyline-v2-may16`, `board-moneyline-v2-may17`, `board-moneyline-v2-may18`, `board-moneyline-v1.1-may23`, `board-moneyline-v1.1-sanity`

#### game_flow_total_context

Path: `picks[].projection.totals`; rows: 204; fields: 29; always-present fields: 28

Key observed fields:
- `*gameId`
- `*gameTitle`
- `*modelName`
- `gamePk`

Sample values:
- `gameId`: `angels-guardians`, `yankees-orioles`, `rays-blue-jays`
- `gameTitle`: `Angels @ Guardians`, `Yankees @ Orioles`, `Rays @ Blue Jays`
- `modelName`: `board-moneyline-v2`, `board-moneyline-v2-may16`, `board-moneyline-v2-may17`
- `gamePk`: `824518`, `824674`, `822814`

Observed domains:
- `modelName`: `board-moneyline-v2`, `board-moneyline-v2-may16`, `board-moneyline-v2-may17`, `board-moneyline-v2-may18`, `board-moneyline-v1.1-may23`, `board-moneyline-v1.1-sanity`

#### first_inning_context

Path: `picks[].projection.firstInning`; rows: 72; fields: 28; always-present fields: 19

Key observed fields:
- `*gameId`
- `*gameTitle`
- `*line`
- `*modelName`
- `gamePk`

Sample values:
- `gameId`: `cardinals-reds`, `astros-cubs`, `pirates-blue-jays`
- `gameTitle`: `Cardinals @ Reds`, `Astros @ Cubs`, `Pirates @ Blue Jays`
- `line`: `0.5`
- `modelName`: `board-moneyline-v1.1-may23`, `board-moneyline-v1.1-sanity`
- `gamePk`: `824518`, `824674`, `822814`

Observed domains:
- `modelName`: `board-moneyline-v1.1-may23`, `board-moneyline-v1.1-sanity`


### Side veto artifact

Class: `selection_policy_result`

Files: 10; dates: 2026-05-23 to 2026-06-01

#### side_veto_pick

Path: `picks[]`; rows: 132; fields: 26; always-present fields: 25

Key observed fields:
- `*confidence`
- `*gameId`
- `*gameTitle`
- `*marketProbability`
- `*modelEdge`
- `*recommendedAction`
- `*vetoReasons`

Sample values:
- `confidence`: `52`, `60`, `66`
- `gameId`: `cardinals-reds`, `astros-cubs`, `pirates-blue-jays`
- `gameTitle`: `Cardinals @ Reds`, `Astros @ Cubs`, `Pirates @ Blue Jays`
- `marketProbability`: `0.48837209302325585`, `0.3949918020569385`, `0.4139072847682119`
- `modelEdge`: `4`, `8.5`, `8.9`
- `recommendedAction`: `Pass`, `Eligible`, `Hard pass`
- `vetoReasons`: `[array:1]`, `[array:0]`, `[array:2]`

Observed domains:
- `recommendedAction`: `Pass`, `Eligible`, `Hard pass`, `Protected dog`


### Player prop picks

Class: `market_prediction + selection_row`

Files: 17; dates: 2026-05-16 to 2026-06-01

#### player_prop_pick

Path: `picks[]`; rows: 1322; fields: 67; always-present fields: 33

Key observed fields:
- `*confidence`
- `*expectedValue`
- `*gameId`
- `*gameTitle`
- `*lineThreshold`
- `*marketLabel`
- `*playerId`
- `*playerName`
- `*probability`
- `*propType`
- `*rank`
- `*teamName`

Sample values:
- `confidence`: `76`, `75`, `74`
- `expectedValue`: `2.2`, `2.1`, `3.2`
- `gameId`: `royals-cardinals`, `orioles-nationals`, `reds-guardians`
- `gameTitle`: `Royals @ Cardinals`, `Orioles @ Nationals`, `Reds @ Guardians`
- `lineThreshold`: `0.5`, `1.5`, `6.5`
- `marketLabel`: `Over 0.5 RBI`, `Over 1.5 total bases`, `Over 0.5 singles`
- `playerId`: `691023`, `695734`, `695578`
- `playerName`: `Jordan Walker`, `Daylen Lile`, `James Wood`

Observed domains:
- `propType`: `rbi`, `totalBases`, `singles`, `hits`, `walks`, `pitcherStrikeouts`
- `shadowSupportLevel`: `soft`, `backed`, `career-backed`


### Legacy player prop picks

Class: `legacy_market_prediction + selection_row`

Files: 11; dates: 2026-05-22 to 2026-06-01

#### legacy_player_prop_pick

Path: `picks[]`; rows: 3648; fields: 67; always-present fields: 35

Key observed fields:
- `*confidence`
- `*expectedValue`
- `*gameId`
- `*gameTitle`
- `*lineThreshold`
- `*marketLabel`
- `*playerId`
- `*playerName`
- `*probability`
- `*propType`
- `*rank`
- `*teamName`

Sample values:
- `confidence`: `82`, `81`, `80`
- `expectedValue`: `4.5`, `4.2`, `3.9`
- `gameId`: `rockies-diamondbacks`, `mets-marlins`, `tigers-orioles`
- `gameTitle`: `Rockies @ Diamondbacks`, `Mets @ Marlins`, `Tigers @ Orioles`
- `lineThreshold`: `1.5`, `0.5`
- `marketLabel`: `Over 1.5 total bases`, `Over 0.5 singles`, `Over 1.5 hits`
- `playerId`: `682998`, `665742`, `694212`
- `playerName`: `Corbin Carroll`, `Juan Soto`, `Samuel Basallo`

Observed domains:
- `propType`: `totalBases`, `singles`, `hits`, `rbi`, `walks`
- `shadowSupportLevel`: `soft`, `backed`, `career-backed`


### Home run board

Class: `market_candidate + selection_row`

Files: 18; dates: 2026-05-15 to 2026-06-01

#### home_run_pick

Path: `picks[]`; rows: 216; fields: 113; always-present fields: 22

Key observed fields:
- `*gameTitle`
- `*playerId`
- `*playerName`
- `*rank`
- `*score`
- `teamName`
- `lineupContext.gameTitle`
- `lineupContext.teamName`

Sample values:
- `gameTitle`: `Phillies @ Pirates`, `Red Sox @ Braves`, `Rangers @ Astros`
- `playerId`: `656941`, `621566`, `670541`
- `playerName`: `Schwarber, Kyle`, `Olson, Matt`, `Alvarez, Yordan`
- `rank`: `1`, `2`, `3`
- `score`: `102.5`, `89.2`, `88.5`
- `teamName`: `Phillies`, `White Sox`, `Cardinals`
- `lineupContext.gameTitle`: `Phillies @ Pirates`, `Cubs @ White Sox`, `Royals @ Cardinals`
- `lineupContext.teamName`: `Phillies`, `White Sox`, `Cardinals`

Observed domains:
- `scoreBand`: `premium`, `strong`, `live`, `thin`

#### home_run_game_context

Path: `games[]`; rows: 225; fields: 464; always-present fields: 6

Key observed fields:
- `*gameTitle`
- `likely[].gameTitle`
- `likely[].playerId`
- `likely[].playerName`
- `likely[].score`
- `likely[].teamName`
- `possible[].gameTitle`
- `possible[].playerId`
- `possible[].playerName`
- `possible[].score`
- `possible[].teamName`
- `likely[].lane`
- `weightedPool[].gameTitle`
- `weightedPool[].lane`
- `weightedPool[].playerId`
- `weightedPool[].playerName`
- `weightedPool[].score`
- `weightedPool[].teamName`
- `possible[].lane`
- `likely[].lineupContext.gameTitle`
- `likely[].lineupContext.teamName`
- `possible[].lineupContext.gameTitle`
- `possible[].lineupContext.teamName`
- `alternates[].gameTitle`

Sample values:
- `gameTitle`: `Blue Jays @ Tigers`, `Royals @ Cardinals`, `Diamondbacks @ Rockies`
- `likely[].gameTitle`: `Blue Jays @ Tigers`, `Royals @ Cardinals`, `Diamondbacks @ Rockies`
- `likely[].playerId`: `669398`, `691023`, `666160`
- `likely[].playerName`: `Gage Workman`, `Jordan Walker`, `Mickey Moniak`
- `likely[].score`: `77.2`, `138.7`, `87.1`
- `likely[].teamName`: `Tigers`, `Cardinals`, `Rockies`
- `possible[].gameTitle`: `Blue Jays @ Tigers`, `Royals @ Cardinals`, `Diamondbacks @ Rockies`
- `possible[].playerId`: `693307`, `677951`, `521692`

Observed domains:
- `likely[].lane`: `anchor`, `secondary`
- `weightedPool[].lane`: `anchor`, `secondary`, `thin`, `live`
- `possible[].lane`: `secondary`, `live`, `anchor`


### Reliever shadow forecast

Class: `latent_forecast`

Files: 4; dates: 2026-05-29 to 2026-06-01

#### reliever_shadow_team

Path: `relieverShadowByTeam{}`; rows: 108; fields: 33; always-present fields: 29

Key observed fields:
- `*relievers[].availabilityScore`
- `*relievers[].bridgeScore`
- `*relievers[].expectedOuts`
- `*relievers[].firstRelieverLikelihood`
- `*relievers[].pitcherId`
- `*teamName`

Sample values:
- `relievers[].availabilityScore`: `81.2`, `95`, `76.5`
- `relievers[].bridgeScore`: `72.5`, `87.1`, `74.7`
- `relievers[].expectedOuts`: `2.1`, `7`, `2.4`
- `relievers[].firstRelieverLikelihood`: `73.7`, `90.4`, `84.7`
- `relievers[].pitcherId`: `805299`, `694297`, `664199`
- `teamName`: `Diamondbacks`, `Athletics`, `Braves`

#### reliever_shadow_pitcher

Path: `relieverShadowByTeam{}.relievers[]`; rows: 324; fields: 23; always-present fields: 22

Key observed fields:
- `*availabilityScore`
- `*bridgeScore`
- `*expectedOuts`
- `*firstRelieverLikelihood`
- `*pitcherId`
- `*teamName`

Sample values:
- `availabilityScore`: `81.2`, `95`, `76.5`
- `bridgeScore`: `72.5`, `87.1`, `74.7`
- `expectedOuts`: `2.1`, `7`, `2.4`
- `firstRelieverLikelihood`: `73.7`, `90.4`, `84.7`
- `pitcherId`: `805299`, `694297`, `664199`
- `teamName`: `Diamondbacks`, `Athletics`, `Braves`


### Lineup board and matchup state

Class: `canonical_slate_state + feature_snapshot`

Files: 17; dates: 2026-05-16 to 2026-06-01

#### lineup_game

Path: `lineupBoardsByGameId{}`; rows: 226; fields: 563; always-present fields: 33

Key observed fields:
- `*away.teamName`
- `*gameId`
- `*home.teamName`
- `home.lineup[].playerId`
- `away.lineup[].playerId`

Sample values:
- `away.teamName`: `Blue Jays`, `Royals`, `Diamondbacks`
- `gameId`: `blue-jays-tigers`, `royals-cardinals`, `diamondbacks-rockies`
- `home.teamName`: `Tigers`, `Cardinals`, `Rockies`
- `home.lineup[].playerId`: `805808`, `693307`, `669398`
- `away.lineup[].playerId`: `543807`, `682818`, `665489`

#### lineup_player

Path: `lineupBoardsByGameId{}.away/home.lineup[]`; rows: 3817; fields: 169; always-present fields: 25

Key observed fields:
- `*gameId`
- `*gameTitle`
- `*playerId`
- `*side`
- `*teamName`
- `savant.playerId`
- `careerProfile.playerId`

Sample values:
- `gameId`: `blue-jays-tigers`, `royals-cardinals`, `diamondbacks-rockies`
- `gameTitle`: `Blue Jays @ Tigers`, `Royals @ Cardinals`, `Diamondbacks @ Rockies`
- `playerId`: `543807`, `682818`, `665489`
- `side`: `away`, `home`
- `teamName`: `Blue Jays`, `Tigers`, `Royals`
- `savant.playerId`: `802139`, `671056`, `676475`
- `careerProfile.playerId`: `805808`, `693307`, `669398`

#### lineup_matchup_context

Path: `lineupMatchupContextByGameId{}`; rows: 226; fields: 772; always-present fields: 3

Key observed fields:
- `*gameId`

Sample values:
- `gameId`: `blue-jays-tigers`, `royals-cardinals`, `diamondbacks-rockies`


### Market fitness research artifacts

Class: `research_artifact`

Files: 9; dates: 2026-05-25 to 2026-05-28

#### market_fitness_top_level

Path: `$`; rows: 9; fields: 160; always-present fields: 4

Key observed fields:
- `markets.moneyline.today[].probability`
- `markets.totals.today[].probability`
- `markets.first5.today[].probability`
- `markets.firstInning.today[].probability`

Sample values:
- `markets.moneyline.today[].probability`: `0.573`, `0.5351`, `0.5232`
- `markets.totals.today[].probability`: `0.5899`, `0.5568`, `0.4438`
- `markets.first5.today[].probability`: `0.5929`, `0.5438`, `0.5382`
- `markets.firstInning.today[].probability`: `0.5329`, `0.5143`, `0.5039`

#### market_fitness_rows

Path: `detectedArrays[]`; rows: 0; fields: 0; always-present fields: 0


### Model cartridge snapshots

Class: `run_snapshot`

Files: 1; dates: 2026-05-30 to 2026-05-30

#### snapshot_top_level

Path: `$`; rows: 1; fields: 1690; always-present fields: 1690

Key observed fields:
- `*date`
- `*games[].confidence`
- `*games[].gamePk`
- `*games[].marketProbability`
- `*games[].modelEdge`
- `*games[].relieverShadowContext.away.alternate.availabilityScore`
- `*games[].relieverShadowContext.away.alternate.bridgeScore`
- `*games[].relieverShadowContext.away.alternate.expectedOuts`
- `*games[].relieverShadowContext.away.alternate.firstRelieverLikelihood`
- `*games[].relieverShadowContext.away.alternate.pitcherId`
- `*games[].relieverShadowContext.away.lead.availabilityScore`
- `*games[].relieverShadowContext.away.lead.bridgeScore`
- `*games[].relieverShadowContext.away.lead.expectedOuts`
- `*games[].relieverShadowContext.away.lead.firstRelieverLikelihood`
- `*games[].relieverShadowContext.away.lead.pitcherId`
- `*games[].relieverShadowContext.away.teamName`
- `*games[].relieverShadowContext.away.top3[].availabilityScore`
- `*games[].relieverShadowContext.away.top3[].bridgeScore`
- `*games[].relieverShadowContext.away.top3[].expectedOuts`
- `*games[].relieverShadowContext.away.top3[].firstRelieverLikelihood`
- `*games[].relieverShadowContext.away.top3[].pitcherId`
- `*games[].relieverShadowContext.home.alternate.availabilityScore`
- `*games[].relieverShadowContext.home.alternate.bridgeScore`
- `*games[].relieverShadowContext.home.alternate.expectedOuts`
- `*games[].relieverShadowContext.home.alternate.firstRelieverLikelihood`
- `*games[].relieverShadowContext.home.alternate.pitcherId`
- `*games[].relieverShadowContext.home.lead.availabilityScore`
- `*games[].relieverShadowContext.home.lead.bridgeScore`
- `*games[].relieverShadowContext.home.lead.expectedOuts`
- `*games[].relieverShadowContext.home.lead.firstRelieverLikelihood`

Sample values:
- `date`: `2026-05-30`
- `games[].confidence`: `63`, `52`, `54`
- `games[].gamePk`: `822975`, `824833`, `824513`
- `games[].marketProbability`: `0.6354`, `0.4592`, `0.5452`
- `games[].modelEdge`: `11.7`, `4.8`, `7.3`
- `games[].relieverShadowContext.away.alternate.availabilityScore`: `75.3`, `95`, `46.5`
- `games[].relieverShadowContext.away.alternate.bridgeScore`: `78.8`, `74.7`, `81.6`
- `games[].relieverShadowContext.away.alternate.expectedOuts`: `2.7`, `7.4`, `4.83`

#### snapshot_game

Path: `games[]`; rows: 15; fields: 455; always-present fields: 120

Key observed fields:
- `*confidence`
- `*gamePk`
- `*marketProbability`
- `*modelEdge`
- `*relieverShadowContext.away.alternate.availabilityScore`
- `*relieverShadowContext.away.alternate.bridgeScore`
- `*relieverShadowContext.away.alternate.expectedOuts`
- `*relieverShadowContext.away.alternate.firstRelieverLikelihood`
- `*relieverShadowContext.away.alternate.pitcherId`
- `*relieverShadowContext.away.lead.availabilityScore`
- `*relieverShadowContext.away.lead.bridgeScore`
- `*relieverShadowContext.away.lead.expectedOuts`
- `*relieverShadowContext.away.lead.firstRelieverLikelihood`
- `*relieverShadowContext.away.lead.pitcherId`
- `*relieverShadowContext.away.teamName`
- `*relieverShadowContext.away.top3[].availabilityScore`
- `*relieverShadowContext.away.top3[].bridgeScore`
- `*relieverShadowContext.away.top3[].expectedOuts`
- `*relieverShadowContext.away.top3[].firstRelieverLikelihood`
- `*relieverShadowContext.away.top3[].pitcherId`
- `*relieverShadowContext.home.alternate.availabilityScore`
- `*relieverShadowContext.home.alternate.bridgeScore`
- `*relieverShadowContext.home.alternate.expectedOuts`
- `*relieverShadowContext.home.alternate.firstRelieverLikelihood`
- `*relieverShadowContext.home.alternate.pitcherId`
- `*relieverShadowContext.home.lead.availabilityScore`
- `*relieverShadowContext.home.lead.bridgeScore`
- `*relieverShadowContext.home.lead.expectedOuts`
- `*relieverShadowContext.home.lead.firstRelieverLikelihood`
- `*relieverShadowContext.home.lead.pitcherId`

Sample values:
- `confidence`: `63`, `52`, `54`
- `gamePk`: `822975`, `824833`, `824513`
- `marketProbability`: `0.6354`, `0.4592`, `0.5452`
- `modelEdge`: `11.7`, `4.8`, `7.3`
- `relieverShadowContext.away.alternate.availabilityScore`: `75.3`, `95`, `46.5`
- `relieverShadowContext.away.alternate.bridgeScore`: `78.8`, `74.7`, `81.6`
- `relieverShadowContext.away.alternate.expectedOuts`: `2.7`, `7.4`, `4.83`
- `relieverShadowContext.away.alternate.firstRelieverLikelihood`: `75`, `84.7`, `78.8`

#### snapshot_side_pick

Path: `sidePicks[]`; rows: 15; fields: 21; always-present fields: 21

Key observed fields:
- `*confidence`
- `*gameId`
- `*gameTitle`
- `*marketProbability`
- `*modelEdge`
- `*recommendedAction`

Sample values:
- `confidence`: `60`, `52`, `53`
- `gameId`: `tigers-white-sox`, `blue-jays-orioles`, `padres-nationals`
- `gameTitle`: `Tigers @ White Sox`, `Blue Jays @ Orioles`, `Padres @ Nationals`
- `marketProbability`: `0.5427`, `0.4592`, `0.552`
- `modelEdge`: `6.7`, `5`, `0`
- `recommendedAction`: `Eligible`, `Hard pass`, `Pass`

Observed domains:
- `recommendedAction`: `Eligible`, `Hard pass`, `Pass`

#### snapshot_prop_pick

Path: `propPicks[]`; rows: 0; fields: 0; always-present fields: 0

#### snapshot_home_run_pick

Path: `homeRunPicks[]`; rows: 0; fields: 0; always-present fields: 0

## Existing Cartridge Contract Files

- `models/mlb/cartridges/MLB-E0/metrics-contract.json`: model `MLB-E0`, status `migration-shell`
- `models/mlb/cartridges/MLB-M0/output-contract.json`: model `MLB-M0`, status `migration-shell`
- `models/mlb/cartridges/MLB-M1/output-contract.json`: model `MLB-M1`, status `migration-shell`
- `models/mlb/cartridges/MLB-M2/output-contract.json`: model `MLB-M2`, status `draft`
- `models/mlb/cartridges/MLB-RP36/output-contract.json`: model `MLB-RP36`, status `migration-shell`, kind `reliever-shadow`

## Typed DB Output Tables

| Source | Table | Exists | Rows | Date Range | Columns |
|---|---|---:|---:|---|---:|
| `typed_mlb_sqlite` | `prediction_rows` | yes | 8020 | - | 16 |
| `typed_mlb_sqlite` | `settlement_rows` | yes | 554 | - | 8 |
| `typed_mlb_sqlite` | `component_settlement_rows` | yes | 31 | 2026-05-31 to 2026-05-31 (1) | 19 |
| `typed_mlb_sqlite` | `prop_backtest_rows` | yes | 1688 | 2026-05-16 to 2026-06-01 (17) | 17 |
| `typed_mlb_sqlite` | `side_backtest_rows` | yes | 389 | 2026-05-10 to 2026-05-31 (16) | 23 |
| `typed_mlb_sqlite` | `home_run_backtest_rows` | yes | 182 | 2026-05-15 to 2026-05-31 (14) | 14 |
| `typed_mlb_sqlite` | `model_artifacts` | yes | 98 | - | 6 |
| `typed_mlb_sqlite` | `mlb_side_predictions` | no | - | - | 0 |
| `typed_mlb_sqlite` | `mlb_prop_predictions` | no | - | - | 0 |
| `typed_mlb_sqlite` | `mlb_home_run_predictions` | no | - | - | 0 |
| `typed_mlb_sqlite` | `mlb_side_backtests` | no | - | - | 0 |
| `typed_mlb_sqlite` | `mlb_prop_backtests` | no | - | - | 0 |
| `typed_mlb_sqlite` | `mlb_home_run_backtests` | no | - | - | 0 |
| `typed_mlb_sqlite` | `mlb_rp36_settlements` | no | - | - | 0 |
| `typed_mlb_sqlite` | `mlb_rp36_team_settlements` | no | - | - | 0 |
| `typed_mlb_sqlite` | `model_runs` | yes | 224 | 2026-05-10 to 2026-06-01 (23) | 22 |
| `typed_mlb_sqlite` | `model_run_lanes` | yes | 38 | - | 15 |
| `typed_mlb_sqlite` | `model_run_artifacts` | yes | 19 | - | 10 |
| `typed_mlb_sqlite` | `model_component_runs` | yes | 3 | - | 11 |
| `typed_mlb_sqlite` | `market_contracts` | yes | 798 | - | 21 |
| `typed_mlb_sqlite` | `market_snapshots` | yes | 2408 | - | 12 |
| `typed_mlb_sqlite` | `prop_market_snapshots` | yes | 2409 | 2026-03-26 to 2026-06-01 (67) | 24 |
| `legacy_sports_db` | `prediction_rows` | no | - | - | 0 |
| `legacy_sports_db` | `settlement_rows` | no | - | - | 0 |
| `legacy_sports_db` | `component_settlement_rows` | no | - | - | 0 |
| `legacy_sports_db` | `prop_backtest_rows` | no | - | - | 0 |
| `legacy_sports_db` | `side_backtest_rows` | no | - | - | 0 |
| `legacy_sports_db` | `home_run_backtest_rows` | no | - | - | 0 |
| `legacy_sports_db` | `model_artifacts` | no | - | - | 0 |
| `legacy_sports_db` | `mlb_side_predictions` | yes | 389 | 2026-05-10 to 2026-05-31 (16) | 26 |
| `legacy_sports_db` | `mlb_prop_predictions` | yes | 1688 | 2026-05-16 to 2026-06-01 (17) | 26 |
| `legacy_sports_db` | `mlb_home_run_predictions` | yes | 194 | 2026-05-15 to 2026-05-31 (14) | 10 |
| `legacy_sports_db` | `mlb_side_backtests` | yes | 389 | 2026-05-10 to 2026-05-31 (16) | 28 |
| `legacy_sports_db` | `mlb_prop_backtests` | yes | 1688 | 2026-05-16 to 2026-06-01 (17) | 16 |
| `legacy_sports_db` | `mlb_home_run_backtests` | yes | 182 | 2026-05-15 to 2026-05-31 (14) | 8 |
| `legacy_sports_db` | `mlb_rp36_settlements` | yes | 1 | 2026-05-31 to 2026-05-31 (1) | 15 |
| `legacy_sports_db` | `mlb_rp36_team_settlements` | yes | 30 | 2026-05-31 to 2026-05-31 (1) | 18 |
| `legacy_sports_db` | `model_runs` | yes | 9 | 2026-05-30 to 2026-06-01 (3) | 18 |
| `legacy_sports_db` | `model_run_lanes` | yes | 38 | - | 10 |
| `legacy_sports_db` | `model_run_artifacts` | yes | 69 | - | 5 |
| `legacy_sports_db` | `model_component_runs` | yes | 3 | - | 5 |
| `legacy_sports_db` | `market_contracts` | no | - | - | 0 |
| `legacy_sports_db` | `market_snapshots` | no | - | - | 0 |
| `legacy_sports_db` | `prop_market_snapshots` | no | - | - | 0 |

### DB Output Breakdowns

`typed_mlb_sqlite.prediction_rows`
- lane=player_prop, market_type=totalBases: 1138
- lane=player_prop, market_type=rbi: 1112
- lane=player_prop, market_type=singles: 940
- lane=player_prop, market_type=hits: 896
- lane=player_prop, market_type=walks: 813
- lane=ml, market_type=moneyline: 563
- lane=Props, market_type=totalBases: 461
- lane=MLB FG, market_type=moneyline: 389
- lane=Props, market_type=rbi: 353
- lane=Props, market_type=singles: 319
- lane=Props, market_type=hits: 256
- lane=Props, market_type=walks: 225
- lane=home_run, market_type=home_run: 216
- lane=HR, market_type=home_run: 194
- lane=Props, market_type=pitcherStrikeouts: 74
- lane=player_prop, market_type=pitcherStrikeouts: 71

`typed_mlb_sqlite.market_contracts`
- market_type=total: 331
- market_type=first5Total: 203
- market_type=winner: 90
- market_type=first5Winner: 87
- market_type=spread: 60
- market_type=firstInning: 27

`typed_mlb_sqlite.prop_market_snapshots`
- market_type=pitcher_strikeouts: 2409

`legacy_sports_db.mlb_side_predictions`
- model_name=board-moneyline-tier1-v1: 168
- model_name=board-moneyline-v2: 75
- model_name=board-moneyline-retro-current-v1: 44
- model_name=board-moneyline-v1.1-sanity: 44
- model_name=board-moneyline-v2-may16: 15
- model_name=board-moneyline-v2-may17: 15
- model_name=board-moneyline-v1.1-may23: 14
- model_name=board-moneyline-v2-may18: 14

`legacy_sports_db.mlb_prop_predictions`
- prop_type=totalBases: 461
- prop_type=rbi: 353
- prop_type=singles: 319
- prop_type=hits: 256
- prop_type=walks: 225
- prop_type=pitcherStrikeouts: 74

## Immediate Design Implications

- M3 should define separate contracts for latent forecasts, market predictions, selection-policy results, and presentation exports.
- Current side/home-run outputs are not fully priced market-prediction rows; side rows lack explicit model win probability, and HR rows are score/rank candidates rather than probability against a known line.
- Player props are closest to the future market-prediction row shape because they already expose player, market label, line threshold, probability, expected value, and confidence.
- Reliever shadow is already a latent forecast contract and should feed reconciliation/simulation rather than publish standalone picks.
- Lineup board is too large to remain a presentation artifact; M3 should materialize this as canonical slate state plus reusable feature snapshots.


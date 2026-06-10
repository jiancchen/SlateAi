# Tennis Entity Resolution Audit

Generated: `2026-06-10T08:30:20.887328+00:00`

DB: `data-private/warehouse/sports/tennis/sql-tennis.db`

Scope: `2026-06-07` to `2026-06-09`

## Summary

| Metric | Count |
| --- | --- |
| players | 5577 |
| playerIdentityRegistryRows | 5562 |
| activeTennisLivePlayerSources | 279 |
| playerIdentityRedirects | 938 |
| playerIdentityRedirectCandidates | 945 |
| openUnresolvedPlayerEntities | 0 |
| playersMissingRegistry | 15 |
| registryRowsMissingPlayer | 0 |
| duplicateCanonicalNameGroups | 0 |
| duplicateMatchPlayerSideGroups | 8 |
| matchPlayerRowsMissingPlayer | 0 |
| matchPlayerRowsMissingRegistry | 12 |
| matchPlayerRowsWithoutActiveTennisLiveSource | 91 |
| marketRowsMissingPlayerId | 184 |
| marketRowsWithDanglingPlayerId | 0 |
| redirectRowsWithDanglingPlayerId | 0 |
| redirectCandidatesWithDanglingProposedPlayerId | 0 |

## Redirect Status Counts

| Status | Policy | Rows |
| --- | --- | --- |
| active | unique_abbreviation_full_name | 621 |
| active | expected_ascii_player_id_duplicate | 290 |
| active | dominant_context_candidate | 24 |
| active | expanded_given_name_source_url | 1 |
| active | name_order_source_url | 1 |
| active | source_short_name_matches_slug | 1 |

## Redirect Candidate Counts

| Status | Policy | Rows |
| --- | --- | --- |
| redirect_ready | unique_abbreviation_full_name | 621 |
| redirect_ready | expected_ascii_player_id_duplicate | 290 |
| redirect_ready | dominant_context_candidate | 21 |
| needs_deep_dive | no_full_name_candidate | 7 |
| needs_deep_dive | multiple_live_candidates | 6 |

## Match Date Participant Attachment

| Date | Matches | Participant rows | Rows without active TennisLive player source |
| --- | --- | --- | --- |
| 2026-06-07 | 152 | 312 | 65 |
| 2026-06-08 | 106 | 212 | 24 |
| 2026-06-09 | 14 | 28 | 2 |

## Players Missing Registry

| Player | Name | Canonical | Tour | Active |
| --- | --- | --- | --- | --- |
| tennis-player-brooke-anna-black | Brooke Anna Black | Brooke Anna Black | WTA | 1 |
| tennis-player-connor-huertas-del-pino | Connor Huertas Del Pino | Connor Huertas Del Pino | ATP | 1 |
| tennis-player-dan-evans | Dan Evans | Dan Evans | ATP | 1 |
| tennis-player-edie-griffiths | Edie Griffiths | Edie Griffiths | WTA | 1 |
| tennis-player-faris-zakaria | Faris Zakaria | Faris Zakaria | ATP | 1 |
| tennis-player-johan-alexander-rodriguez-rodriguez | Johan Alexander Rodriguez Rodriguez | Johan Alexander Rodriguez Rodriguez | ATP | 1 |
| tennis-player-marcelo-tomas-barrios-vera | Marcelo Tomas Barrios Vera | Marcelo Tomas Barrios Vera | ATP | 1 |
| tennis-player-mark-ceban | Mark Ceban | Mark Ceban | ATP | 1 |
| tennis-player-martin-damm-jr | Martin Damm Jr | Martin Damm Jr | ATP | 1 |
| tennis-player-megan-knight | Megan Knight | Megan Knight | WTA | 1 |
| tennis-player-nicolas-villalon-valdes | Nicolas Villalon Valdes | Nicolas Villalon Valdes | ATP | 1 |
| tennis-player-pyotr-nesterov | Pyotr Nesterov | Pyotr Nesterov | ATP | 1 |

## Match Players Without Active TennisLive Source

| Date | Match | Player | Name | Side |
| --- | --- | --- | --- | --- |
| 2026-06-09 | tl-2026-06-09-san-miguel-de-tucuman-challenger-2026-karim-bennani-vs-santiago-rodriguez-taverna | tlp-e32825c7dce4a8fd44d85390 | Santiago Rodriguez Taverna | 2 |
| 2026-06-09 | tl-2026-06-09-san-miguel-de-tucuman-challenger-2026-nicolas-villalon-vs-ezequiel-monferrer | tennis-player-nicolas-villalon | Nicolás Villalón | 1 |
| 2026-06-08 | dk-atp-challenger-quals-ilkley-dan-evans-vs-charles-broom-2026-06-08 | tennis-player-dan-evans | Dan Evans | 1 |
| 2026-06-08 | dk-atp-challenger-san-miguel-de-tucuman-karim-bennani-vs-santiago-rodriguez-taverna-2026-06-08 | tlp-e32825c7dce4a8fd44d85390 | Santiago Rodriguez Taverna | 2 |
| 2026-06-08 | rh-atp-challenger-bratislava-qualification-santillan-vs-shelbayh-2026-06-08 | tennis-player-abdullah-shelbayh | Abdullah Shelbayh | 1 |
| 2026-06-08 | rh-atp-challenger-bratislava-sachko-vs-watanuki-2026-06-08 | tennis-player-yosuke-watanuki | Yosuke Watanuki | 2 |
| 2026-06-08 | rh-atp-challenger-cattolica-qualification-nesterov-vs-ferrari-2026-06-08 | tennis-player-pyotr-nesterov | Pyotr Nesterov | 1 |
| 2026-06-08 | rh-atp-challenger-ilkley-schoolkate-vs-harris-2026-06-08 | tennis-player-lloyd-harris | Lloyd Harris | 1 |
| 2026-06-08 | rh-atp-challenger-lyon-pavlovic-vs-galan-2026-06-08 | tennis-player-daniel-elahi-galan | Daniel Elahi Galan | 2 |
| 2026-06-08 | rh-atp-challenger-san-miguel-de-tucuman-qualification-del-pino-vs-huertas-del-pino-cordova-2026-06-08 | tennis-player-arklon-huertas-del-pino-cordova | Arklon Huertas Del Pino Cordova | 2 |
| 2026-06-08 | rh-atp-challenger-san-miguel-de-tucuman-qualification-villalon-valdes-vs-monferrer-2026-06-08 | tennis-player-nicolas-villalon-valdes | Nicolas Villalon Valdes | 1 |
| 2026-06-08 | rh-wta-125k-ilkley-podrez-vs-prozorova-2026-06-08 | tennis-player-tatiana-prozorova | Tatiana Prozorova | 2 |

## Market Rows Missing Player Id

| Market row | Match | Source | Market | Selection | Captured |
| --- | --- | --- | --- | --- | --- |
| 261cd7e7077224d3638d34a4bc42bf033e833601 | dk-atp-challenger-san-miguel-de-tucuman-karim-bennani-vs-santiago-rodriguez-taverna-2026-06-08 | draftkings | first_set_total_games | Over | 2026-06-08T07:31:18.345Z |
| 342eb9882285eda40d0c7f90e512ee17e6a8f315 | dk-atp-challenger-san-miguel-de-tucuman-karim-bennani-vs-santiago-rodriguez-taverna-2026-06-08 | draftkings | first_set_total_games | Under | 2026-06-08T07:31:18.345Z |
| c70354987813ae2cd9c7ddf6474e7c5dc216491e | rh-atp-challenger-bratislava-sachko-vs-watanuki-2026-06-08 | draftkings | first_set_total_games | Over | 2026-06-08T07:31:18.345Z |
| d89751d671bf83aff5aaceb3592fd22a41a98401 | rh-atp-challenger-bratislava-sachko-vs-watanuki-2026-06-08 | draftkings | first_set_total_games | Under | 2026-06-08T07:31:18.345Z |
| 0bb17fa370c9a81509f2651a0e6b666bf391599e | rh-atp-challenger-ilkley-schoolkate-vs-harris-2026-06-08 | draftkings | first_set_total_games | Over | 2026-06-08T07:31:18.345Z |
| c9f2132f08f972068beecbf1befb8d382ad72462 | rh-atp-challenger-ilkley-schoolkate-vs-harris-2026-06-08 | draftkings | first_set_total_games | Under | 2026-06-08T07:31:18.345Z |
| 51ece0696894067cbff76011e490d3d092651923 | rh-atp-challenger-lyon-pavlovic-vs-galan-2026-06-08 | draftkings | first_set_total_games | Over | 2026-06-08T07:31:18.345Z |
| b4fe5acaa37db34f1a7d8339e808859fc7828081 | rh-atp-challenger-lyon-pavlovic-vs-galan-2026-06-08 | draftkings | first_set_total_games | Under | 2026-06-08T07:31:18.345Z |
| 6beeceb41be34bf7dfd2299ba37d2191fb8b4f6d | rh-wta-125k-ilkley-dudeney-vs-sakatsume-2026-06-08 | draftkings | first_set_total_games | Over | 2026-06-08T07:31:18.345Z |
| 60936f19d86763f534a9b1c26307cb41a6da7d6e | rh-wta-125k-ilkley-dudeney-vs-sakatsume-2026-06-08 | draftkings | first_set_total_games | Under | 2026-06-08T07:31:18.345Z |
| c745e560a1c2d4e94c3e84b1efe7ec7d6f102df6 | rh-wta-125k-ilkley-golubic-vs-britton-2026-06-08 | draftkings | first_set_total_games | Over | 2026-06-08T07:31:18.345Z |
| ea37feb3625a143fc108ff3b6f9a5237171ab922 | rh-wta-125k-ilkley-golubic-vs-britton-2026-06-08 | draftkings | first_set_total_games | Under | 2026-06-08T07:31:18.345Z |

## Notes

- This report is read-only and does not apply redirects, merges, or deletes.
- Missing active TennisLive player source is a review signal, not automatic proof of a bad player row.
- Redirect and redirect-candidate rows are forensic evidence for human identity review before any model-input contract is designed.

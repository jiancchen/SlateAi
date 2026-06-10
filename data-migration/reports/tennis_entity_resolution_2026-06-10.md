# Tennis Entity Resolution Audit

Generated: `2026-06-10T08:30:20.889487+00:00`

DB: `data-private/warehouse/sports/tennis/sql-tennis.db`

Scope: `beginning` to `end`

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
| duplicateMatchPlayerSideGroups | 41 |
| matchPlayerRowsMissingPlayer | 0 |
| matchPlayerRowsMissingRegistry | 12 |
| matchPlayerRowsWithoutActiveTennisLiveSource | 1493 |
| marketRowsMissingPlayerId | 507 |
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
| 2000-03-06 | 1 | 2 | 1 |
| 2001-01-29 | 2 | 4 | 2 |
| 2025-07-13 | 1 | 2 | 1 |
| 2025-08-11 | 1 | 2 | 1 |
| 2025-08-18 | 1 | 2 | 1 |
| 2025-08-21 | 1 | 2 | 1 |
| 2025-09-07 | 2 | 4 | 2 |
| 2025-09-08 | 1 | 2 | 1 |
| 2025-09-12 | 1 | 2 | 1 |
| 2025-09-19 | 1 | 2 | 0 |
| 2025-09-23 | 1 | 2 | 1 |
| 2025-10-29 | 1 | 2 | 1 |
| 2025-10-31 | 1 | 2 | 1 |
| 2025-11-04 | 1 | 2 | 0 |
| 2025-11-06 | 1 | 2 | 1 |
| 2025-11-12 | 1 | 2 | 1 |
| 2025-11-24 | 2 | 4 | 2 |
| 2025-12-21 | 1 | 2 | 1 |
| 2025-12-22 | 1 | 2 | 1 |
| 2025-12-23 | 1 | 2 | 1 |
| 2026-01-09 | 1 | 2 | 0 |
| 2026-01-12 | 1 | 2 | 1 |
| 2026-01-13 | 1 | 2 | 1 |
| 2026-02-24 | 1 | 2 | 1 |
| 2026-03-03 | 1 | 2 | 1 |
| 2026-03-08 | 1 | 2 | 1 |
| 2026-03-16 | 1 | 2 | 1 |
| 2026-03-17 | 1 | 2 | 1 |
| 2026-03-18 | 1 | 2 | 1 |
| 2026-03-19 | 1 | 2 | 1 |
| 2026-03-24 | 2 | 4 | 1 |
| 2026-04-01 | 1 | 2 | 0 |
| 2026-04-05 | 1 | 2 | 1 |
| 2026-04-07 | 2 | 4 | 1 |
| 2026-04-11 | 1 | 2 | 1 |
| 2026-04-13 | 1 | 2 | 1 |
| 2026-04-14 | 4 | 8 | 3 |
| 2026-04-15 | 2 | 4 | 2 |
| 2026-04-20 | 2 | 4 | 2 |
| 2026-04-21 | 1 | 2 | 1 |
| 2026-04-22 | 3 | 6 | 4 |
| 2026-04-23 | 6 | 12 | 4 |
| 2026-04-24 | 1 | 2 | 1 |
| 2026-04-25 | 1 | 2 | 1 |
| 2026-04-27 | 3 | 6 | 3 |
| 2026-04-28 | 7 | 14 | 6 |
| 2026-04-29 | 4 | 8 | 4 |
| 2026-04-30 | 6 | 12 | 3 |
| 2026-05-01 | 5 | 10 | 4 |
| 2026-05-02 | 4 | 8 | 3 |
| 2026-05-03 | 1 | 2 | 1 |
| 2026-05-04 | 6 | 12 | 4 |
| 2026-05-05 | 18 | 36 | 12 |
| 2026-05-06 | 6 | 12 | 6 |
| 2026-05-07 | 16 | 32 | 16 |
| 2026-05-08 | 14 | 28 | 13 |
| 2026-05-09 | 5 | 11 | 6 |
| 2026-05-10 | 10 | 21 | 10 |
| 2026-05-11 | 24 | 48 | 20 |
| 2026-05-12 | 22 | 44 | 20 |
| 2026-05-13 | 27 | 54 | 25 |
| 2026-05-14 | 25 | 50 | 22 |
| 2026-05-15 | 11 | 22 | 11 |
| 2026-05-16 | 14 | 28 | 13 |
| 2026-05-17 | 18 | 36 | 14 |
| 2026-05-18 | 42 | 86 | 36 |
| 2026-05-19 | 47 | 95 | 36 |
| 2026-05-20 | 51 | 102 | 42 |
| 2026-05-21 | 55 | 110 | 62 |
| 2026-05-22 | 39 | 78 | 47 |
| 2026-05-23 | 11 | 22 | 12 |
| 2026-05-24 | 70 | 141 | 87 |
| 2026-05-25 | 79 | 159 | 101 |
| 2026-05-26 | 83 | 166 | 104 |
| 2026-05-27 | 71 | 143 | 84 |
| 2026-05-28 | 67 | 134 | 82 |
| 2026-05-29 | 47 | 97 | 53 |
| 2026-05-30 | 35 | 70 | 43 |
| 2026-05-31 | 48 | 98 | 51 |
| 2026-06-01 | 53 | 110 | 54 |
| 2026-06-02 | 148 | 300 | 139 |
| 2026-06-03 | 36 | 73 | 30 |
| 2026-06-04 | 96 | 195 | 39 |
| 2026-06-05 | 60 | 124 | 13 |
| 2026-06-06 | 34 | 72 | 15 |
| 2026-06-07 | 152 | 312 | 65 |
| 2026-06-08 | 106 | 212 | 24 |
| 2026-06-09 | 14 | 28 | 2 |
| 2099-02-12 | 1 | 2 | 1 |
| 2099-04-02 | 1 | 2 | 1 |
| unknown | 2 | 4 | 1 |

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
| unknown | tl-unknown-date-ilkley-challenger-2026-lloyd-harris-vs-tristan-schoolkate | tennis-player-lloyd-harris | Lloyd Harris | 1 |
| 2099-04-02 | tl-2099-04-02-davis-cup-group-1-2r-chi-col-5-0-1999-marcelo-rios-vs-miguel-tobon-1968 | tlp-9410096a43af2c09e4aba2a0 | Marcelo Rios | 1 |
| 2099-02-12 | tl-2099-02-12-davis-cup-group-1-1r-col-can-3-2-1999-miguel-tobon-1968-vs-daniel-nestor | tlp-2f0552f349496c55e880db62 | Daniel Nestor | 2 |
| 2026-06-09 | tl-2026-06-09-san-miguel-de-tucuman-challenger-2026-karim-bennani-vs-santiago-rodriguez-taverna | tlp-e32825c7dce4a8fd44d85390 | Santiago Rodriguez Taverna | 2 |
| 2026-06-09 | tl-2026-06-09-san-miguel-de-tucuman-challenger-2026-nicolas-villalon-vs-ezequiel-monferrer | tennis-player-nicolas-villalon | Nicolás Villalón | 1 |
| 2026-06-08 | dk-atp-challenger-quals-ilkley-dan-evans-vs-charles-broom-2026-06-08 | tennis-player-dan-evans | Dan Evans | 1 |
| 2026-06-08 | dk-atp-challenger-san-miguel-de-tucuman-karim-bennani-vs-santiago-rodriguez-taverna-2026-06-08 | tlp-e32825c7dce4a8fd44d85390 | Santiago Rodriguez Taverna | 2 |
| 2026-06-08 | rh-atp-challenger-bratislava-qualification-santillan-vs-shelbayh-2026-06-08 | tennis-player-abdullah-shelbayh | Abdullah Shelbayh | 1 |
| 2026-06-08 | rh-atp-challenger-bratislava-sachko-vs-watanuki-2026-06-08 | tennis-player-yosuke-watanuki | Yosuke Watanuki | 2 |
| 2026-06-08 | rh-atp-challenger-cattolica-qualification-nesterov-vs-ferrari-2026-06-08 | tennis-player-pyotr-nesterov | Pyotr Nesterov | 1 |
| 2026-06-08 | rh-atp-challenger-ilkley-schoolkate-vs-harris-2026-06-08 | tennis-player-lloyd-harris | Lloyd Harris | 1 |
| 2026-06-08 | rh-atp-challenger-lyon-pavlovic-vs-galan-2026-06-08 | tennis-player-daniel-elahi-galan | Daniel Elahi Galan | 2 |

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

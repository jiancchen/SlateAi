# Tennis Quarantine Candidates

Generated: `2026-06-10T08:23:13.731833+00:00`

DB: `data-private/warehouse/sports/tennis/sql-tennis.db`

Scope: `2026-06-07` to `2026-06-09`

## Summary

| Category | Candidate count |
| --- | --- |
| non_tennislive_matches | 154 |
| participant_anomalies | 7 |
| prediction_rows_without_match | 72 |
| ten_t0_market_only_predictions | 68 |
| market_identity_gaps | 184 |
| duplicate_market_groups | 56 |
| duplicate_stat_groups | 0 |

## Non-TennisLive Matches

| Bucket | Reason | Match | Date | Prefix | Participants |
| --- | --- | --- | --- | --- | --- |
| quarantine | match_not_attached_to_active_tennislive_source | dk-atp-challenger-quals-cattolica-petr-nesterov-vs-gianmarco-ferrari-2026-06-08 | 2026-06-08 | dk | 2 |
| quarantine | match_not_attached_to_active_tennislive_source | dk-atp-challenger-quals-ilkley-dan-evans-vs-charles-broom-2026-06-08 | 2026-06-08 | dk | 2 |
| quarantine | match_not_attached_to_active_tennislive_source | dk-atp-challenger-san-miguel-de-tucuman-karim-bennani-vs-santiago-rodriguez-taverna-2026-06-08 | 2026-06-08 | dk | 2 |
| quarantine | match_not_attached_to_active_tennislive_source | rh-atp-challenger-bratislava-qualification-neumayer-vs-daniel-2026-06-08 | 2026-06-08 | rh | 2 |
| quarantine | match_not_attached_to_active_tennislive_source | rh-atp-challenger-bratislava-qualification-santillan-vs-shelbayh-2026-06-08 | 2026-06-08 | rh | 2 |
| quarantine | match_not_attached_to_active_tennislive_source | rh-atp-challenger-bratislava-sachko-vs-watanuki-2026-06-08 | 2026-06-08 | rh | 2 |
| quarantine | match_not_attached_to_active_tennislive_source | rh-atp-challenger-cattolica-qualification-nesterov-vs-ferrari-2026-06-08 | 2026-06-08 | rh | 2 |
| quarantine | match_not_attached_to_active_tennislive_source | rh-atp-challenger-ilkley-schoolkate-vs-harris-2026-06-08 | 2026-06-08 | rh | 2 |
| quarantine | match_not_attached_to_active_tennislive_source | rh-atp-challenger-lyon-pavlovic-vs-galan-2026-06-08 | 2026-06-08 | rh | 2 |
| quarantine | match_not_attached_to_active_tennislive_source | rh-atp-challenger-san-miguel-de-tucuman-qualification-del-pino-vs-huertas-del-pino-cordova-2026-06-08 | 2026-06-08 | rh | 2 |
| quarantine | match_not_attached_to_active_tennislive_source | rh-atp-challenger-san-miguel-de-tucuman-qualification-villalon-valdes-vs-monferrer-2026-06-08 | 2026-06-08 | rh | 2 |
| quarantine | match_not_attached_to_active_tennislive_source | rh-wta-125k-ilkley-day-vs-stoiana-2026-06-08 | 2026-06-08 | rh | 2 |

## Prediction Rows Without DB Match

| Bucket | Run | Prediction row | Match | Selection |
| --- | --- | --- | --- | --- |
| quarantine | tennis-TEN-T0-2026-06-08-db | pred-4804ec641de797e268e24aa353a27cf7 | dk-atp-challenger-bratislava-federico-cina-vs-marko-topo-2026-06-08 | Federico Cina |
| quarantine | tennis-TEN-T0-2026-06-08-db | pred-902c1c6c02b7a53ae8fd79e439c5a77e | dk-atp-challenger-bratislava-norbert-gombos-vs-jan-choinski-2026-06-08 | Jan Choinski |
| quarantine | tennis-TEN-T0-2026-06-08-db | pred-f83d917f8f78b8975f30222bec21969d | dk-atp-challenger-bratislava-thanasi-kokkinakis-vs-marcelo-tomas-barrios-vera-2026-06-08 | Marcelo Tomas Barrios Vera |
| quarantine | tennis-TEN-T0-2026-06-08-db | pred-b472ee1c73a618241a51b9a127ced591 | dk-atp-challenger-bratislava-vitaliy-sachko-vs-yosuke-watanuki-2026-06-08 | Vitaliy Sachko |
| quarantine | tennis-TEN-T0-2026-06-08-db | pred-204bc1d3ebd9d18070fae4d72ea81ebd | dk-atp-challenger-cattolica-andrea-guerrieri-vs-dalibor-svrcina-2026-06-08 | Dalibor Svrcina |
| quarantine | tennis-TEN-T0-2026-06-08-db | pred-fb18d85cbf2795caa6dcc07b4f8ef4b8 | dk-atp-challenger-cattolica-liam-broady-vs-ioannis-xilas-2026-06-08 | Liam Broady |
| quarantine | tennis-TEN-T0-2026-06-08-db | pred-8251be2291f42420f59c1bf599ff574c | dk-atp-challenger-cattolica-michele-ribecai-vs-franco-agamenone-2026-06-08 | Franco Agamenone |
| quarantine | tennis-TEN-T0-2026-06-08-db | pred-45eaec15f6af5c1dc9339936f97da4fd | dk-atp-challenger-cattolica-pierluigi-basile-vs-raul-brancaccio-2026-06-08 | Raul Brancaccio |
| quarantine | tennis-TEN-T0-2026-06-08-db | pred-4271acd1efc72b5a6821307f4ac32492 | dk-atp-challenger-ilkley-august-holmgren-vs-nicolai-budkov-kjaer-2026-06-08 | Nicolai Budkov Kjaer |
| quarantine | tennis-TEN-T0-2026-06-08-db | pred-d49de6e2b75f61ec41977f017ce056ab | dk-atp-challenger-ilkley-harry-wendelken-vs-jack-pinnington-jones-2026-06-08 | Jack Pinnington Jones |
| quarantine | tennis-TEN-T0-2026-06-08-db | pred-bad7e96cca8fd5e374f5888ed6ac3b44 | dk-atp-challenger-ilkley-kyrian-jacquet-vs-toby-samuel-2026-06-08 | Toby Samuel |
| quarantine | tennis-TEN-T0-2026-06-08-db | pred-b344542ff6fa13e62e4a3ec90e5ed456 | dk-atp-challenger-ilkley-tristan-schoolkate-vs-lloyd-harris-2026-06-08 | Lloyd Harris |

## TEN-T0 Market-Only Prediction Rows

| Bucket | Run | Prediction row | Match | Selection |
| --- | --- | --- | --- | --- |
| quarantine | tennis-TEN-T0-2026-06-07-db | pred-f5e6b1def15e9d8ebed8e5a9132cb4ad | dk-atp-challenger-quals-bratislava-max-lorincik-vs-abdullah-shelbayh-2026-06-07 | Abdullah Shelbayh |
| quarantine | tennis-TEN-T0-2026-06-07-db | pred-8a6674d2b47a318bcfd90b1e605cdded | dk-atp-challenger-quals-ilkley-dan-evans-vs-james-watt-2026-06-07 | James Watt |
| quarantine | tennis-TEN-T0-2026-06-07-db | pred-779b0f7724e4fe05f57ccb1fcfb37b59 | dk-atp-challenger-quals-ilkley-edward-winter-vs-alastair-gray-2026-06-07 | Alastair Gray |
| quarantine | tennis-TEN-T0-2026-06-07-db | pred-5843374696c2c466fb17d988c4c672cc | dk-atp-challenger-quals-ilkley-finn-bass-vs-keegan-smith-2026-06-07 | Keegan Smith |
| quarantine | tennis-TEN-T0-2026-06-07-db | pred-0ca1689a6d21b26646a2cd3187c5983d | dk-atp-challenger-quals-ilkley-max-basing-vs-paul-jubb-2026-06-07 | Paul Jubb |
| quarantine | tennis-TEN-T0-2026-06-07-db | pred-fb7aae84f012329ad6f767070a2a1491 | dk-atp-challenger-quals-ilkley-millen-hurrion-vs-hamish-stewart-2026-06-07 | Hamish Stewart |
| quarantine | tennis-TEN-T0-2026-06-07-db | pred-bed0bd17ccb6a5d8ced86b9b1952ae82 | dk-atp-challenger-quals-ilkley-oliver-crawford-vs-mark-ceban-2026-06-07 | Oliver Crawford |
| quarantine | tennis-TEN-T0-2026-06-07-db | pred-c13ba64d3232f3e63b1113312bf5f7cd | dk-atp-challenger-quals-ilkley-oliver-okonkwo-vs-antoine-ghibaudo-2026-06-07 | Antoine Ghibaudo |
| quarantine | tennis-TEN-T0-2026-06-07-db | pred-650e12bb3311642e407d79cd39cb13c0 | dk-atp-challenger-quals-ilkley-quinn-vandecasteele-vs-charles-broom-2026-06-07 | Charles Broom |
| quarantine | tennis-TEN-T0-2026-06-07-db | pred-89080723b17daecd6c759b6b1bde34e1 | dk-atp-challenger-quals-ilkley-rio-noguchi-vs-patrick-brady-2026-06-07 | Rio Noguchi |
| quarantine | tennis-TEN-T0-2026-06-07-db | pred-eafbda08f84ea2a8c7cd605537b3b8cf | dk-atp-challenger-quals-ilkley-yi-zhou-vs-ben-jones-2026-06-07 | Yi Zhou |
| quarantine | tennis-TEN-T0-2026-06-07-db | pred-b287d020886e51c5f0b727ae5d6ac8dd | dk-wta-wta-quals-ilkley-brooke-anna-black-vs-tereza-martincova-2026-06-07 | Tereza Martincova |

## Market Identity Gaps

| Bucket | Source | Market row | Match | Player | Selection |
| --- | --- | --- | --- | --- | --- |
| needs_review | draftkings | 5bdaa0d85864046612a53c375ae83e3a0d37ef0f | dk-atp-challenger-centurion-2-philip-henning-vs-alexander-donski-2026-06-07 | None | Under |
| needs_review | draftkings | 95beb67381c754e99e8187412362cc2774700cba | dk-atp-challenger-centurion-2-philip-henning-vs-alexander-donski-2026-06-07 | None | Over |
| needs_review | draftkings | 90604fc135deed32a581d98cb2dbe3901d3573ee | dk-atp-challenger-heilbronn-luka-mikrut-vs-emilio-nava-2026-06-07 | None | Under |
| needs_review | draftkings | cce726a929f532aa3c9084d166aa63a2ba1fde77 | dk-atp-challenger-heilbronn-luka-mikrut-vs-emilio-nava-2026-06-07 | None | Over |
| needs_review | draftkings | c0d01e11c208546a3a97bc0a47b1dcc041680e95 | dk-atp-challenger-perugia-henrique-rocha-vs-daniel-merida-aguilar-2026-06-07 | None | Under |
| needs_review | draftkings | e9930e7cb5c27945c3bfa5d010653a976eef2d8f | dk-atp-challenger-perugia-henrique-rocha-vs-daniel-merida-aguilar-2026-06-07 | None | Over |
| needs_review | draftkings | 92828e8924a4ef7d23d7f82168f0b52ca6e522b3 | dk-atp-challenger-prostejov-sebastian-baez-vs-alex-molcan-2026-06-07 | None | Over |
| needs_review | draftkings | a37e1274ecf1fca71b977410a5bf34d8e6a14131 | dk-atp-challenger-prostejov-sebastian-baez-vs-alex-molcan-2026-06-07 | None | Under |
| needs_review | draftkings | 261cd7e7077224d3638d34a4bc42bf033e833601 | dk-atp-challenger-san-miguel-de-tucuman-karim-bennani-vs-santiago-rodriguez-taverna-2026-06-08 | None | Over |
| needs_review | draftkings | 342eb9882285eda40d0c7f90e512ee17e6a8f315 | dk-atp-challenger-san-miguel-de-tucuman-karim-bennani-vs-santiago-rodriguez-taverna-2026-06-08 | None | Under |
| needs_review | draftkings | 23a1b6f03ab10e3c1dea8aacd7a2a3603595b65b | dk-atp-challenger-tyler-adam-walton-vs-andre-ilagan-2026-06-07 | None | Under |
| needs_review | draftkings | 7ead615ddca184fb78df651fa00475e69fb87b7f | dk-atp-challenger-tyler-adam-walton-vs-andre-ilagan-2026-06-07 | None | Over |

## Duplicate Market Groups

| Bucket | Source | Match | Player | Market | Selection | Rows |
| --- | --- | --- | --- | --- | --- | --- |
| quarantine | draftkings | dk-atp-french-open-m-flavio-cobolli-vs-alexander-zverev-2026-06-07 | tennis-player-alexander-zverev | first_service_game_total_points | Alexander Zverev Alexander Zverev | 2 |
| quarantine | draftkings | dk-atp-french-open-m-flavio-cobolli-vs-alexander-zverev-2026-06-07 | tennis-player-alexander-zverev | first_service_game_total_points | Alexander Zverev Flavio Cobolli | 2 |
| quarantine | draftkings | dk-atp-french-open-m-flavio-cobolli-vs-alexander-zverev-2026-06-07 | tennis-player-alexander-zverev | first_service_game_total_points | Alexander Zverev No | 2 |
| quarantine | draftkings | dk-atp-french-open-m-flavio-cobolli-vs-alexander-zverev-2026-06-07 | tennis-player-alexander-zverev | first_service_game_total_points | Alexander Zverev Yes | 2 |
| quarantine | draftkings | dk-atp-french-open-m-flavio-cobolli-vs-alexander-zverev-2026-06-07 | tennis-player-alexander-zverev | set_win | Player to Win at Least One Set | 2 |
| quarantine | draftkings | dk-atp-french-open-m-flavio-cobolli-vs-alexander-zverev-2026-06-07 | tennis-player-flavio-cobolli | first_service_game_total_points | Flavio Cobolli Alexander Zverev | 2 |
| quarantine | draftkings | dk-atp-french-open-m-flavio-cobolli-vs-alexander-zverev-2026-06-07 | tennis-player-flavio-cobolli | first_service_game_total_points | Flavio Cobolli Flavio Cobolli | 2 |
| quarantine | draftkings | dk-atp-french-open-m-flavio-cobolli-vs-alexander-zverev-2026-06-07 | tennis-player-flavio-cobolli | first_service_game_total_points | Flavio Cobolli No | 2 |
| quarantine | draftkings | dk-atp-french-open-m-flavio-cobolli-vs-alexander-zverev-2026-06-07 | tennis-player-flavio-cobolli | first_service_game_total_points | Flavio Cobolli Yes | 2 |
| quarantine | draftkings | dk-atp-french-open-m-flavio-cobolli-vs-alexander-zverev-2026-06-07 | tennis-player-flavio-cobolli | set_win | Player to Win at Least One Set | 2 |
| quarantine | draftkings | dk-wta-wta-quals-hertogenbosch-ella-seidel-vs-greet-minnen-2026-06-07 | tennis-player-ella-seidel | set_win | Player to Win at Least One Set | 2 |
| quarantine | draftkings | dk-wta-wta-quals-hertogenbosch-ella-seidel-vs-greet-minnen-2026-06-07 | tennis-player-greet-minnen | set_win | Player to Win at Least One Set | 2 |

## Duplicate Stat Groups

| Bucket | Source | Match | Player | Stat | Period | Rows |
| --- | --- | --- | --- | --- | --- | --- |

## Notes

- This report is read-only. It does not mutate or delete rows.
- Duplicate stat and market sections are natural-key groups; review before deleting any physical rows.
- Candidate limits only affect materialized examples, not summary counts.

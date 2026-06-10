# Tennis Settlement Readiness Audit

Generated: `2026-06-10T08:05:22.375413+00:00`

DB: `data-private/warehouse/sports/tennis/sql-tennis.db`

Scope: `2026-06-07` to `2026-06-09`

## Summary

| Metric | Count |
| --- | --- |
| Prediction rows audited | 162 |
| Already settled | 0 |
| Settlement ready now | 0 |
| Quarantine | 162 |
| Pending result evidence | 0 |
| Needs review | 0 |
| Missing DB match | 72 |
| TEN-T0 rows | 162 |
| Market-only rows | 68 |

## Result Evidence

| Source | Rows |
| --- | --- |
| tennis_match_results rows | 0 |
| tennis_match_results completed | 0 |
| TennisLive summary rows | 1245 |
| TennisLive completed rows | 1125 |
| TennisLive rows with winner | 1125 |
| TennisLive rows with score | 1125 |

## Readiness Buckets

| Readiness | Rows |
| --- | --- |
| forensic_ten_t0_do_not_settle_as_production | 90 |
| impossible_without_match_resolution | 72 |

## By Run

| Run | Date | Rows | Ready | Quarantine | Missing match | Market-only |
| --- | --- | --- | --- | --- | --- | --- |
| tennis-TEN-T0-2026-06-07-db | 2026-06-07 | 81 | 0 | 81 | 0 | 22 |
| tennis-TEN-T0-2026-06-08-db | 2026-06-08 | 81 | 0 | 81 | 72 | 46 |

## Examples

### forensic_ten_t0_do_not_settle_as_production

| Run | Prediction row | Match | Selection | Winner | Bucket |
| --- | --- | --- | --- | --- | --- |
| tennis-TEN-T0-2026-06-07-db | pred-54cb02014c89c4e503ba9e613380cab5 | dk-atp-challenger-cattolica-qualifiers-aleksandr-braynin-vs-sergio-callejon-hernando-2026-06-07 | Sergio Callejon Hernando | None | quarantine |
| tennis-TEN-T0-2026-06-07-db | pred-135682329fa61ae4425226dce2572b7b | dk-atp-challenger-cattolica-qualifiers-carlo-alberto-caniato-vs-giuseppe-la-vela-2026-06-07 | Carlo Alberto Caniato | None | quarantine |
| tennis-TEN-T0-2026-06-07-db | pred-6bf71691900f29f46c4be1db5a0fd309 | dk-atp-challenger-cattolica-qualifiers-carlos-sanchez-jover-vs-gerard-campana-lee-2026-06-07 | Carlos Sanchez Jover | None | quarantine |
| tennis-TEN-T0-2026-06-07-db | pred-f9001d4ebac94e85d0819b6797426d61 | dk-atp-challenger-cattolica-qualifiers-francesco-forti-vs-luca-castagnola-2026-06-07 | Francesco Forti | None | quarantine |
| tennis-TEN-T0-2026-06-07-db | pred-2159a4ac375defdb943c674e371624b4 | dk-atp-challenger-cattolica-qualifiers-gabriele-bosio-vs-gianmarco-ferrari-2026-06-07 | Gianmarco Ferrari | None | quarantine |
| tennis-TEN-T0-2026-06-07-db | pred-9205e93966c1a21fdc49a08a12991bad | dk-atp-challenger-cattolica-qualifiers-giovanni-oradini-vs-samuele-pieri-2026-06-07 | Samuele Pieri | None | quarantine |
| tennis-TEN-T0-2026-06-07-db | pred-67de25c6523dd114687ce293dad12b60 | dk-atp-challenger-cattolica-qualifiers-lorenzo-rottoli-vs-juan-cruz-martin-manzano-2026-06-07 | Juan Cruz Martin Manzano | None | quarantine |
| tennis-TEN-T0-2026-06-07-db | pred-81984f199e34ecf31b3f4a1a9eed0bca | dk-atp-challenger-cattolica-qualifiers-lucio-ratti-vs-filippo-mazzola-2026-06-07 | Filippo Mazzola | None | quarantine |
| tennis-TEN-T0-2026-06-07-db | pred-fee71d8bb8e6c8fba10b5bcee3cf5405 | dk-atp-challenger-cattolica-qualifiers-manuel-mazza-vs-lorenzo-carboni-2026-06-07 | Lorenzo Carboni | None | quarantine |
| tennis-TEN-T0-2026-06-07-db | pred-2fa2bbbe1305c0070a76f60e31ee2f93 | dk-atp-challenger-cattolica-qualifiers-peter-fajta-vs-miguel-tobon-2026-06-07 | Miguel Tobon | None | quarantine |
| tennis-TEN-T0-2026-06-07-db | pred-7bcaa6d9fa27c7011fa77ca1bcd771a5 | dk-atp-challenger-cattolica-qualifiers-petr-nesterov-vs-michele-mecarelli-2026-06-07 | Michele Mecarelli | None | quarantine |
| tennis-TEN-T0-2026-06-07-db | pred-3ce4f095dda873e4da22c3619c25f00a | dk-atp-challenger-centurion-2-philip-henning-vs-alexander-donski-2026-06-07 | Philip Henning | None | quarantine |

### impossible_without_match_resolution

| Run | Prediction row | Match | Selection | Winner | Bucket |
| --- | --- | --- | --- | --- | --- |
| tennis-TEN-T0-2026-06-08-db | pred-4804ec641de797e268e24aa353a27cf7 | dk-atp-challenger-bratislava-federico-cina-vs-marko-topo-2026-06-08 | Federico Cina | None | quarantine |
| tennis-TEN-T0-2026-06-08-db | pred-902c1c6c02b7a53ae8fd79e439c5a77e | dk-atp-challenger-bratislava-norbert-gombos-vs-jan-choinski-2026-06-08 | Jan Choinski | None | quarantine |
| tennis-TEN-T0-2026-06-08-db | pred-f83d917f8f78b8975f30222bec21969d | dk-atp-challenger-bratislava-thanasi-kokkinakis-vs-marcelo-tomas-barrios-vera-2026-06-08 | Marcelo Tomas Barrios Vera | None | quarantine |
| tennis-TEN-T0-2026-06-08-db | pred-b472ee1c73a618241a51b9a127ced591 | dk-atp-challenger-bratislava-vitaliy-sachko-vs-yosuke-watanuki-2026-06-08 | Vitaliy Sachko | None | quarantine |
| tennis-TEN-T0-2026-06-08-db | pred-204bc1d3ebd9d18070fae4d72ea81ebd | dk-atp-challenger-cattolica-andrea-guerrieri-vs-dalibor-svrcina-2026-06-08 | Dalibor Svrcina | None | quarantine |
| tennis-TEN-T0-2026-06-08-db | pred-fb18d85cbf2795caa6dcc07b4f8ef4b8 | dk-atp-challenger-cattolica-liam-broady-vs-ioannis-xilas-2026-06-08 | Liam Broady | None | quarantine |
| tennis-TEN-T0-2026-06-08-db | pred-8251be2291f42420f59c1bf599ff574c | dk-atp-challenger-cattolica-michele-ribecai-vs-franco-agamenone-2026-06-08 | Franco Agamenone | None | quarantine |
| tennis-TEN-T0-2026-06-08-db | pred-45eaec15f6af5c1dc9339936f97da4fd | dk-atp-challenger-cattolica-pierluigi-basile-vs-raul-brancaccio-2026-06-08 | Raul Brancaccio | None | quarantine |
| tennis-TEN-T0-2026-06-08-db | pred-4271acd1efc72b5a6821307f4ac32492 | dk-atp-challenger-ilkley-august-holmgren-vs-nicolai-budkov-kjaer-2026-06-08 | Nicolai Budkov Kjaer | None | quarantine |
| tennis-TEN-T0-2026-06-08-db | pred-d49de6e2b75f61ec41977f017ce056ab | dk-atp-challenger-ilkley-harry-wendelken-vs-jack-pinnington-jones-2026-06-08 | Jack Pinnington Jones | None | quarantine |
| tennis-TEN-T0-2026-06-08-db | pred-bad7e96cca8fd5e374f5888ed6ac3b44 | dk-atp-challenger-ilkley-kyrian-jacquet-vs-toby-samuel-2026-06-08 | Toby Samuel | None | quarantine |
| tennis-TEN-T0-2026-06-08-db | pred-b344542ff6fa13e62e4a3ec90e5ed456 | dk-atp-challenger-ilkley-tristan-schoolkate-vs-lloyd-harris-2026-06-08 | Lloyd Harris | None | quarantine |

## Notes

- This report is read-only and does not write settlement rows.
- TEN-T0 rows are quarantined because the cartridge is archived forensic output.
- Match-winner rows are only marked settlement-ready when a winner name exists and the prediction resolves to a DB match.
- Non-ML lanes with score evidence still need lane-specific settlement rules before writing grades.

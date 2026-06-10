# Tennis Settlement Readiness Audit

Generated: `2026-06-10T08:05:22.381463+00:00`

DB: `data-private/warehouse/sports/tennis/sql-tennis.db`

Scope: `beginning` to `end`

## Summary

| Metric | Count |
| --- | --- |
| Prediction rows audited | 776 |
| Already settled | 0 |
| Settlement ready now | 0 |
| Quarantine | 468 |
| Pending result evidence | 308 |
| Needs review | 0 |
| Missing DB match | 289 |
| TEN-T0 rows | 251 |
| Market-only rows | 72 |

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
| forensic_ten_t0_do_not_settle_as_production | 179 |
| impossible_without_match_resolution | 289 |
| pending_result_evidence | 308 |

## By Run

| Run | Date | Rows | Ready | Quarantine | Missing match | Market-only |
| --- | --- | --- | --- | --- | --- | --- |
| legacy-tennis-tennis-2026-05-26-9a85514281cb | 2026-05-26 | 40 | 0 | 40 | 40 | 0 |
| legacy-tennis-tennis-2026-05-27-cc4061a62809 | 2026-05-27 | 31 | 0 | 31 | 31 | 0 |
| legacy-tennis-tennis-2026-05-28-346ef6a516ff | 2026-05-28 | 64 | 0 | 0 | 0 | 0 |
| legacy-tennis-tennis-2026-05-28-ce4f89bfe03a | 2026-05-28 | 32 | 0 | 32 | 32 | 0 |
| legacy-tennis-tennis-2026-05-29-057162c8deef | 2026-05-29 | 32 | 0 | 0 | 0 | 0 |
| legacy-tennis-tennis-2026-05-29-95bb3b8ce06e | 2026-05-29 | 16 | 0 | 16 | 16 | 0 |
| legacy-tennis-tennis-2026-05-30-569b9003d88a | 2026-05-30 | 16 | 0 | 16 | 16 | 0 |
| legacy-tennis-tennis-2026-05-30-738c0a7ef011 | 2026-05-30 | 48 | 0 | 0 | 0 | 0 |
| legacy-tennis-tennis-2026-05-30-e0e8edc978b2 | 2026-05-30 | 32 | 0 | 0 | 0 | 0 |
| legacy-tennis-tennis-2026-05-31-2bdd8cad5022 | 2026-05-31 | 8 | 0 | 8 | 8 | 0 |
| legacy-tennis-tennis-2026-05-31-65792b44c291 | 2026-05-31 | 16 | 0 | 0 | 0 | 0 |
| legacy-tennis-tennis-2026-06-01-03e4ce66affb | 2026-06-01 | 16 | 0 | 0 | 0 | 0 |
| legacy-tennis-tennis-2026-06-01-65dbddf7bbd9 | 2026-06-01 | 8 | 0 | 8 | 8 | 0 |
| legacy-tennis-tennis-2026-06-02-82291e546d62 | 2026-06-02 | 66 | 0 | 66 | 66 | 1 |
| legacy-tennis-tennis-2026-06-02-d923c04382ac | 2026-06-02 | 100 | 0 | 0 | 0 | 0 |
| tennis-TEN-T0-2026-06-02-db | 2026-06-02 | 66 | 0 | 66 | 0 | 1 |
| tennis-TEN-T0-2026-06-04-db | 2026-06-04 | 23 | 0 | 23 | 0 | 2 |
| tennis-TEN-T0-2026-06-07-db | 2026-06-07 | 81 | 0 | 81 | 0 | 22 |
| tennis-TEN-T0-2026-06-08-db | 2026-06-08 | 81 | 0 | 81 | 72 | 46 |

## Examples

### forensic_ten_t0_do_not_settle_as_production

| Run | Prediction row | Match | Selection | Winner | Bucket |
| --- | --- | --- | --- | --- | --- |
| tennis-TEN-T0-2026-06-02-db | pred-25ea0ad8ba13f603c4414e70149d3041 | rg-m-jakub-mensik-joao-fonseca-2026-06-02 | Joao Fonseca | None | quarantine |
| tennis-TEN-T0-2026-06-02-db | pred-87abe145a3a4fd3f9859b53346b94646 | rg-m-rafael-jodar-alexander-zverev-2026-06-02 | Alexander Zverev | None | quarantine |
| tennis-TEN-T0-2026-06-02-db | pred-f2dcbcbd1be9854290944ddc75437ed6 | rg-w-elina-svitolina-marta-kostyuk-2026-06-02 | Elina Svitolina | None | quarantine |
| tennis-TEN-T0-2026-06-02-db | pred-ee889824c49954dd17a83f576b176a9d | rg-w-mirra-andreeva-sorana-cirstea-2026-06-02 | Mirra Andreeva | None | quarantine |
| tennis-TEN-T0-2026-06-02-db | pred-90cf1496ec883a183259b2e2e4128bd9 | rh-atp-challenger-bad-rappenau-choinski-vs-gentzsch-2026-06-02 | Jan Choinski | None | quarantine |
| tennis-TEN-T0-2026-06-02-db | pred-75e4becddd192cb6b35690d59a86cbab | rh-atp-challenger-bad-rappenau-dellien-vs-schoenhaus-2026-06-02 | Hugo Dellien | None | quarantine |
| tennis-TEN-T0-2026-06-02-db | pred-7f846d5af9877a4c4694a800d1398c9d | rh-atp-challenger-bad-rappenau-galan-vs-rehberg-2026-06-02 | Daniel Elahi Galan | None | quarantine |
| tennis-TEN-T0-2026-06-02-db | pred-97df3e9a128322ba34464e7bc5bab116 | rh-atp-challenger-bad-rappenau-mikrut-vs-marti-pujolras-2026-06-02 | Luka Mikrut | None | quarantine |
| tennis-TEN-T0-2026-06-02-db | pred-a5b146e84c362130f5cfd1a9e78f9005 | rh-atp-challenger-bad-rappenau-moeller-vs-onclin-2026-06-02 | Gauthier Onclin | None | quarantine |
| tennis-TEN-T0-2026-06-02-db | pred-717cddbc469d2212fb79c9585448fb7c | rh-atp-challenger-bad-rappenau-petkovic-vs-moro-canas-2026-06-02 | Alejandro Moro Canas | None | quarantine |
| tennis-TEN-T0-2026-06-02-db | pred-a48112f97e9f3262aa55bc25691ec456 | rh-atp-challenger-bad-rappenau-reis-da-silva-vs-barrena-2026-06-02 | Joao Lucas Reis Da Silva | None | quarantine |
| tennis-TEN-T0-2026-06-02-db | pred-30b0c7066961eba353d216e62092728a | rh-atp-challenger-bad-rappenau-squire-vs-polmans-2026-06-02 | Henri Squire | None | quarantine |

### impossible_without_match_resolution

| Run | Prediction row | Match | Selection | Winner | Bucket |
| --- | --- | --- | --- | --- | --- |
| legacy-tennis-tennis-2026-05-26-9a85514281cb | pred-f3470775aaa77b529f1865db154d2437 | legacy-tennis-match-adam-walton-vs-daniil-medvedev | Daniil Medvedev | None | quarantine |
| legacy-tennis-tennis-2026-05-26-9a85514281cb | pred-064f90751d443f9d23685cfa6616e546 | legacy-tennis-match-alejandro-tabilo-vs-kamil-majchrzak | Alejandro Tabilo | None | quarantine |
| legacy-tennis-tennis-2026-05-26-9a85514281cb | pred-f4424a22d58528f738b0856feffb6fd7 | legacy-tennis-match-alexander-bublik-vs-jan-lennard-struff | Alexander Bublik | None | quarantine |
| legacy-tennis-tennis-2026-05-26-9a85514281cb | pred-808f9160f864e8b43374a2c94946b609 | legacy-tennis-match-alexandre-muller-vs-stefanos-tsitsipas | Stefanos Tsitsipas | None | quarantine |
| legacy-tennis-tennis-2026-05-26-9a85514281cb | pred-aae9e2530306cf9b0511c3c65b96ff96 | legacy-tennis-match-alexei-popyrin-vs-zachary-svajda | Alexei Popyrin | None | quarantine |
| legacy-tennis-tennis-2026-05-26-9a85514281cb | pred-4f731dbcbec8851c7e0a3347a2659e76 | legacy-tennis-match-alina-korneeva-vs-elisabetta-cocciaretto | Elisabetta Cocciaretto | None | quarantine |
| legacy-tennis-tennis-2026-05-26-9a85514281cb | pred-34d08d4352f400cc29c164000cd6e892 | legacy-tennis-match-anhelina-kalinina-vs-diane-parry | Anhelina Kalinina | None | quarantine |
| legacy-tennis-tennis-2026-05-26-9a85514281cb | pred-d72879a0e552d750e8639c5cd50dc6e9 | legacy-tennis-match-ann-li-vs-zhang-shuai | Ann Li | None | quarantine |
| legacy-tennis-tennis-2026-05-26-9a85514281cb | pred-0e018896c53b85d868fb7b2aaba5c8f3 | legacy-tennis-match-anna-kalinskaya-vs-lois-boisson | Anna Kalinskaya | None | quarantine |
| legacy-tennis-tennis-2026-05-26-9a85514281cb | pred-7ee25f7cb2ed3363cfd272708282d3b3 | legacy-tennis-match-antonia-ruzic-vs-ashlyn-krueger | Ashlyn Krueger | None | quarantine |
| legacy-tennis-tennis-2026-05-26-9a85514281cb | pred-e2710d389cb7ec74d11d1f346d44a2d0 | legacy-tennis-match-aryna-sabalenka-vs-jessica-bouzas-maneiro | Aryna Sabalenka | None | quarantine |
| legacy-tennis-tennis-2026-05-26-9a85514281cb | pred-e0f94b045596c14567ef6715ea14557e | legacy-tennis-match-cameron-norrie-vs-adolfo-daniel-vallejo | Adolfo Daniel Vallejo | None | quarantine |

### pending_result_evidence

| Run | Prediction row | Match | Selection | Winner | Bucket |
| --- | --- | --- | --- | --- | --- |
| legacy-tennis-tennis-2026-05-28-346ef6a516ff | pred-79b46523e54a8a5e3c2879dca3785bf3 | rg-m-adolfo-daniel-vallejo-moise-kouame-2026-05-28 | Adolfo Daniel Vallejo | None | pending |
| legacy-tennis-tennis-2026-05-28-346ef6a516ff | pred-e6c717d8c20190cb3577c3aa6f1cbd39 | rg-m-adolfo-daniel-vallejo-moise-kouame-2026-05-28 | Moise Kouame | None | pending |
| legacy-tennis-tennis-2026-05-28-346ef6a516ff | pred-25d76045e187d0b95e7e5af3f00cda27 | rg-m-alejandro-tabilo-valentin-vacherot-2026-05-28 | Alejandro Tabilo | None | pending |
| legacy-tennis-tennis-2026-05-28-346ef6a516ff | pred-c5053aaea73436e05136cb6b51e637ac | rg-m-alejandro-tabilo-valentin-vacherot-2026-05-28 | Valentin Vacherot | None | pending |
| legacy-tennis-tennis-2026-05-28-346ef6a516ff | pred-429c664776511edbc808dc9c769c0c07 | rg-m-arthur-rinderknech-matteo-berrettini-2026-05-28 | Matteo Berrettini | None | pending |
| legacy-tennis-tennis-2026-05-28-346ef6a516ff | pred-9c13e6e098faabd54edc76cb7c0cb21d | rg-m-arthur-rinderknech-matteo-berrettini-2026-05-28 | Arthur Rinderknech | None | pending |
| legacy-tennis-tennis-2026-05-28-346ef6a516ff | pred-0dd0da2dc17fe69c2bc271ef4b3f14c6 | rg-m-facundo-diaz-acosta-learner-tien-2026-05-28 | Facundo Diaz Acosta | None | pending |
| legacy-tennis-tennis-2026-05-28-346ef6a516ff | pred-4f03c247d8cc049b239f82e897576e79 | rg-m-facundo-diaz-acosta-learner-tien-2026-05-28 | Learner Tien | None | pending |
| legacy-tennis-tennis-2026-05-28-346ef6a516ff | pred-2e59b9c04d68bf1d7b9f6618eb1b4bb2 | rg-m-felix-auger-aliassime-roman-andres-burruchaga-2026-05-28 | Felix Auger-Aliassime | None | pending |
| legacy-tennis-tennis-2026-05-28-346ef6a516ff | pred-42d212e46599e97670434fc235d8cc8a | rg-m-felix-auger-aliassime-roman-andres-burruchaga-2026-05-28 | Roman Andres Burruchaga | None | pending |
| legacy-tennis-tennis-2026-05-28-346ef6a516ff | pred-6f3a6b4ce26f1fb5c9c4c31d9a092cf7 | rg-m-flavio-cobolli-wu-yibing-2026-05-28 | Wu Yibing | None | pending |
| legacy-tennis-tennis-2026-05-28-346ef6a516ff | pred-ae9998151a10dbeb0864581b85d72314 | rg-m-flavio-cobolli-wu-yibing-2026-05-28 | Flavio Cobolli | None | pending |

## Notes

- This report is read-only and does not write settlement rows.
- TEN-T0 rows are quarantined because the cartridge is archived forensic output.
- Match-winner rows are only marked settlement-ready when a winner name exists and the prediction resolves to a DB match.
- Non-ML lanes with score evidence still need lane-specific settlement rules before writing grades.

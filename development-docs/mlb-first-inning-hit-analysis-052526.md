# MLB First-Inning YRFI Hit Analysis

Window: `2026-05-23` through `2026-05-24`

Reviewed `10` graded `YRFI` hits from the tracked first-inning board.

## What Repeated

- `hot-bat carry`: `5`
- `hot bats + pitcher leak`: `2`
- `low-signal ambush`: `1`
- `traffic leak`: `1`
- `single-swing noise`: `1`

## Game Notes

### 2026-05-23 — Dodgers @ Brewers

- Board call: `YRFI with a 88% modeled chance of at least one first-inning run. Dodgers score 71.2% of the time and Brewers 57% of the time in this setup.`
- Modeled YRFI confidence: `87.6%`
- Actual 1st inning: `0-3`
- Brewers: `hot-bat carry`. Model side score `57.0%`, recent 1st-inning score rate `50.0%`, top-third `72.3`, top6 heat/cold `38.4/32.8`, opp pitcher recent allow `0.0%`, opp pitcher season run-game `0.0%`, opp season runs/start `0.00`.
- Inning path: `Brice Turang double (+1); Andrew Vaughn field_error (+1); Sal Frelick single (+1)` | batter reached `5`, hits `3`, walks `1`, HR `0`, first batter reached `true`.
- Read: scoring team carried real top-order / hot-bat support; inning started with traffic pressure, not just one swing; first batter reached safely; team had already been scoring early with some frequency.

### 2026-05-23 — Mariners @ Royals

- Board call: `YRFI with a 72% modeled chance of at least one first-inning run. Mariners score 44.9% of the time and Royals 49.5% of the time in this setup.`
- Modeled YRFI confidence: `72.2%`
- Actual 1st inning: `0-3`
- Royals: `hot bats + pitcher leak`. Model side score `49.5%`, recent 1st-inning score rate `50.0%`, top-third `25.1`, top6 heat/cold `22.3/43.0`, opp pitcher recent allow `50.0%`, opp pitcher season run-game `0.0%`, opp season runs/start `0.00`.
- Inning path: `Vinnie Pasquantino fielders_choice (+1); Carter Jensen field_out (+1); Jac Caglianone single (+1)` | batter reached `4`, hits `3`, walks `0`, HR `0`, first batter reached `true`.
- Read: scoring team carried real top-order / hot-bat support; opposing starter had a real first-inning leak signal; inning started with traffic pressure, not just one swing; first batter reached safely; team had already been scoring early with some frequency.

### 2026-05-23 — Pirates @ Blue Jays

- Board call: `YRFI with a 73% modeled chance of at least one first-inning run. Pirates score 66% of the time and Blue Jays 19.3% of the time in this setup.`
- Modeled YRFI confidence: `72.6%`
- Actual 1st inning: `0-1`
- Blue Jays: `low-signal ambush`. Model side score `19.3%`, recent 1st-inning score rate `25.0%`, top-third `54.3`, top6 heat/cold `29.3/48.5`, opp pitcher recent allow `0.0%`, opp pitcher season run-game `0.0%`, opp season runs/start `0.00`.
- Inning path: `George Springer home_run (+1)` | batter reached `3`, hits `2`, walks `1`, HR `1`, first batter reached `true`.
- Read: inning started with traffic pressure, not just one swing; first batter reached safely; model only gave the scoring side a low individual run probability.

### 2026-05-23 — Rangers @ Angels

- Board call: `YRFI with a 57% modeled chance of at least one first-inning run. Rangers score 21.6% of the time and Angels 45.4% of the time in this setup.`
- Modeled YRFI confidence: `57.2%`
- Actual 1st inning: `0-2`
- Angels: `hot-bat carry`. Model side score `45.4%`, recent 1st-inning score rate `38.0%`, top-third `52.5`, top6 heat/cold `33.0/37.1`, opp pitcher recent allow `0.0%`, opp pitcher season run-game `0.0%`, opp season runs/start `0.00`.
- Inning path: `Mike Trout home_run (+2)` | batter reached `2`, hits `1`, walks `1`, HR `1`, first batter reached `true`.
- Read: scoring team carried real top-order / hot-bat support; inning started with traffic pressure, not just one swing; first batter reached safely; team had already been scoring early with some frequency.

### 2026-05-23 — Twins @ Red Sox

- Board call: `YRFI with a 58% modeled chance of at least one first-inning run. Twins score 30.1% of the time and Red Sox 40.1% of the time in this setup.`
- Modeled YRFI confidence: `58.1%`
- Actual 1st inning: `2-0`
- Twins: `traffic leak`. Model side score `30.1%`, recent 1st-inning score rate `13.0%`, top-third `43.1`, top6 heat/cold `37.9/43.1`, opp pitcher recent allow `100.0%`, opp pitcher season run-game `0.0%`, opp season runs/start `0.00`.
- Inning path: `Austin Martin double (+1); Josh Bell sac_fly (+1)` | batter reached `3`, hits `3`, walks `0`, HR `0`, first batter reached `true`.
- Read: opposing starter had a real first-inning leak signal; inning started with traffic pressure, not just one swing; first batter reached safely.

### 2026-05-24 — Athletics @ Padres

- Board call: `YRFI with a 79% modeled chance of at least one first-inning run. Athletics score 36.6% of the time and Padres 66.1% of the time in this setup.`
- Modeled YRFI confidence: `78.5%`
- Actual 1st inning: `1-0`
- Athletics: `hot-bat carry`. Model side score `36.6%`, recent 1st-inning score rate `25.0%`, top-third `59.2`, top6 heat/cold `36.5/35.8`, opp pitcher recent allow `0.0%`, opp pitcher season run-game `0.0%`, opp season runs/start `0.00`.
- Inning path: `Carlos Cortes home_run (+1)` | batter reached `1`, hits `1`, walks `0`, HR `1`, first batter reached `true`.
- Read: scoring team carried real top-order / hot-bat support; first batter reached safely; cash came mostly from a one-swing homer.

### 2026-05-24 — Mariners @ Royals

- Board call: `YRFI with a 53% modeled chance of at least one first-inning run. Mariners score 4% of the time and Royals 51.3% of the time in this setup.`
- Modeled YRFI confidence: `53.2%`
- Actual 1st inning: `1-0`
- Mariners: `single-swing noise`. Model side score `4.0%`, recent 1st-inning score rate `25.0%`, top-third `40.7`, top6 heat/cold `21.3/63.3`, opp pitcher recent allow `0.0%`, opp pitcher season run-game `0.0%`, opp season runs/start `0.00`.
- Inning path: `Julio Rodríguez home_run (+1)` | batter reached `1`, hits `1`, walks `0`, HR `1`, first batter reached `false`.
- Read: scoring team came in cold, so the cash was less repeatable; cash came mostly from a one-swing homer; model only gave the scoring side a low individual run probability.

### 2026-05-24 — Pirates @ Blue Jays

- Board call: `YRFI with a 62% modeled chance of at least one first-inning run. Pirates score 34.4% of the time and Blue Jays 41.6% of the time in this setup.`
- Modeled YRFI confidence: `61.7%`
- Actual 1st inning: `1-0`
- Pirates: `hot-bat carry`. Model side score `34.4%`, recent 1st-inning score rate `25.0%`, top-third `65.4`, top6 heat/cold `22.0/51.6`, opp pitcher recent allow `0.0%`, opp pitcher season run-game `0.0%`, opp season runs/start `0.00`.
- Inning path: `Spencer Horwitz home_run (+1)` | batter reached `1`, hits `1`, walks `0`, HR `1`, first batter reached `true`.
- Read: scoring team carried real top-order / hot-bat support; first batter reached safely; cash came mostly from a one-swing homer.

### 2026-05-24 — Tigers @ Orioles

- Board call: `YRFI with a 73% modeled chance of at least one first-inning run. Tigers score 60.3% of the time and Orioles 31.1% of the time in this setup.`
- Modeled YRFI confidence: `72.6%`
- Actual 1st inning: `2-0`
- Tigers: `hot bats + pitcher leak`. Model side score `60.3%`, recent 1st-inning score rate `25.0%`, top-third `70.0`, top6 heat/cold `24.3/63.8`, opp pitcher recent allow `100.0%`, opp pitcher season run-game `25.0%`, opp season runs/start `0.25`.
- Inning path: `Dillon Dingler home_run (+2)` | batter reached `2`, hits `2`, walks `0`, HR `1`, first batter reached `true`.
- Read: scoring team carried real top-order / hot-bat support; opposing starter had a real first-inning leak signal; inning started with traffic pressure, not just one swing; first batter reached safely.

### 2026-05-24 — Twins @ Red Sox

- Board call: `YRFI with a 66% modeled chance of at least one first-inning run. Twins score 46.3% of the time and Red Sox 36.9% of the time in this setup.`
- Modeled YRFI confidence: `66.1%`
- Actual 1st inning: `1-0`
- Twins: `hot-bat carry`. Model side score `46.3%`, recent 1st-inning score rate `25.0%`, top-third `59.0`, top6 heat/cold `41.1/24.3`, opp pitcher recent allow `0.0%`, opp pitcher season run-game `0.0%`, opp season runs/start `0.00`.
- Inning path: `Kody Clemens single (+1)` | batter reached `3`, hits `1`, walks `1`, HR `0`, first batter reached `false`.
- Read: scoring team carried real top-order / hot-bat support; inning started with traffic pressure, not just one swing.

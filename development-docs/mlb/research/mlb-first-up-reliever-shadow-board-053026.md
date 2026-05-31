# MLB First-Up Reliever Shadow Board — May 30, 2026

This is `E36 shadow`, the live-style bullpen artifact built from the `E33` stack plus the adaptive heavy-use reset overlay.

Goal:

- keep the reliever upgrade research in shadow mode
- surface a `first-up / top-2` bullpen cluster on real game cards
- use the same `E33` feature stack without changing the core live board yet

Target slate:

- date: `2026-05-31`
- team-side shadow cards: `30`
- reliever candidates scored: `276`
- conversion window: `8`
- dependency window: `5`

## Research Baseline

| Reference | Exact 1st | Top-2 | Top-3 |
| --- | --- | --- | --- |
| `E33 holdout` | 26.5% | 44.5% | 59.6% |

## Target-Date Shadow Check

| Team-side games | Exact 1st | Top-2 | Top-3 |
| --- | --- | --- | --- |
| 0 | N/A | N/A | N/A |

## Top Shadow Clusters

| Team | Opponent | Lead | Alt | Starter hook | Top-2 share |
| --- | --- | --- | --- | --- | --- |
| Braves | Reds | Dylan Dodd | Didier Fuentes | 0.0% | 45.6% |
| Pirates | Twins | Justin Lawrence | Brandan Bidois | 0.0% | 40.3% |
| Athletics | Yankees | José Suarez | Luis Medina | 0.0% | 38.1% |
| White Sox | Tigers | Brandon Eisert | Tyler Davis | 0.0% | 36.8% |
| Phillies | Dodgers | Jonathan Bowlan | Tanner Banks | 0.0% | 36.5% |
| Giants | Rockies | Keaton Winn | Matt Gage | 0.0% | 36.5% |
| Guardians | Red Sox | Colin Holderman | Tim Herrin | 0.0% | 36.3% |
| Cubs | Cardinals | Ethan Roberts | Ryan Rolison | 0.0% | 35.0% |
| Astros | Brewers | Nate Pearson | Bryan King | 0.0% | 34.9% |
| Dodgers | Phillies | Edgardo Henriquez | Jonathan Hernández | 0.0% | 34.3% |

## Top Shadow Features

- `days_since_last_appearance` `0.028`
- `quality_entry_order_avg_last10` `0.027`
- `availability_score` `0.027`
- `first_reliever_likelihood` `0.027`
- `fatigue_score` `0.024`
- `bridge_score` `0.017`
- `avg_pitches_per_appearance` `0.017`
- `quality_strikeouts_per_bf_last10` `0.017`
- `quality_traffic_per_bf_last10` `0.016`
- `quality_pitches_per_app_last10` `0.016`
- `pitches_last3` `0.015`
- `starter_prob_15` `0.015`
- `starter_prob_12` `0.015`
- `quality_strike_rate_last10` `0.014`

## Read

- `E36 shadow` is not a live-model promotion. It is a board artifact for inspection.
- The shadow card is only meant to show:
  - who the `E33` stack thinks is first up
  - who the main alternate is
  - whether the starter hook and bullpen-shape context make the bridge risky or quiet
- Exact-name performance is still not good enough to call this solved, but the `E33` holdout rates are finally strong enough to inspect on game cards instead of burying the work in markdown only.

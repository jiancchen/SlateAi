# MLB First-Up Reliever Shadow Board — May 30, 2026

This is `E36 shadow`, the live-style bullpen artifact built from the `E33` stack plus the adaptive heavy-use reset overlay.

Goal:

- keep the reliever upgrade research in shadow mode
- surface a `first-up / top-2` bullpen cluster on real game cards
- use the same `E33` feature stack without changing the core live board yet

Target slate:

- date: `2026-06-05`
- team-side shadow cards: `30`
- reliever candidates scored: `287`
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
| Padres | Mets | Bradgley Rodriguez | Jeremiah Estrada | 0.0% | 57.1% |
| Braves | Pirates | Dylan Lee | Tyler Kinley | 0.0% | 53.3% |
| Yankees | Red Sox | Jake Bird | Camilo Doval | 0.0% | 47.1% |
| Cubs | Giants | Jacob Webb | Ethan Roberts | 0.0% | 46.8% |
| Astros | Athletics | Alimber Santa | Bryan King | 0.0% | 46.3% |
| Brewers | Rockies | Aaron Ashby | Abner Uribe | 0.0% | 46.3% |
| Twins | Royals | Andrew Morris | Kody Funderburk | 0.0% | 45.0% |
| Dodgers | Angels | Edgardo Henriquez | Blake Treinen | 0.0% | 44.0% |
| Mariners | Tigers | Matt Brash | José A. Ferrer | 0.0% | 43.9% |
| Phillies | White Sox | Tanner Banks | Chase Shugart | 0.0% | 42.9% |

## Top Shadow Features

- `quality_entry_order_avg_last10` `0.029`
- `days_since_last_appearance` `0.027`
- `first_reliever_likelihood` `0.027`
- `availability_score` `0.026`
- `fatigue_score` `0.025`
- `bridge_score` `0.018`
- `avg_pitches_per_appearance` `0.017`
- `quality_strikeouts_per_bf_last10` `0.016`
- `quality_traffic_per_bf_last10` `0.016`
- `quality_pitches_per_app_last10` `0.015`
- `starter_prob_15` `0.015`
- `pitches_last3` `0.015`
- `starter_prob_12` `0.015`
- `quality_strike_rate_last10` `0.014`

## Read

- `E36 shadow` is not a live-model promotion. It is a board artifact for inspection.
- The shadow card is only meant to show:
  - who the `E33` stack thinks is first up
  - who the main alternate is
  - whether the starter hook and bullpen-shape context make the bridge risky or quiet
- Exact-name performance is still not good enough to call this solved, but the `E33` holdout rates are finally strong enough to inspect on game cards instead of burying the work in markdown only.

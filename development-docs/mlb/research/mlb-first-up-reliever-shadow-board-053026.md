# MLB First-Up Reliever Shadow Board — May 30, 2026

This is `E36 shadow`, the live-style bullpen artifact built from the `E33` stack plus the adaptive heavy-use reset overlay.

Goal:

- keep the reliever upgrade research in shadow mode
- surface a `first-up / top-2` bullpen cluster on real game cards
- use the same `E33` feature stack without changing the core live board yet

Target slate:

- date: `2026-06-04`
- team-side shadow cards: `18`
- reliever candidates scored: `161`
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
| Diamondbacks | Dodgers | Brandyn Garcia | Kevin Ginkel | 0.0% | 60.3% |
| Pirates | Astros | Evan Sisk | Cam Sanders | 0.0% | 53.0% |
| Astros | Pirates | Enyel De Los Santos | Steven Okert | 0.0% | 52.0% |
| Braves | Blue Jays | Didier Fuentes | Dylan Dodd | 0.0% | 49.6% |
| Padres | Phillies | Bradgley Rodriguez | Yuki Matsui | 0.0% | 49.0% |
| Guardians | Yankees | Matt Festa | Codi Heuer | 0.0% | 48.8% |
| Cubs | Athletics | Trent Thornton | Jacob Webb | 0.0% | 43.3% |
| Yankees | Guardians | Jake Bird | Brent Headrick | 0.0% | 40.3% |
| Dodgers | Diamondbacks | Edgardo Henriquez | Will Klein | 0.0% | 39.9% |
| Phillies | Padres | Tim Mayza | Tanner Banks | 0.0% | 39.2% |

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

# MLB First-Up Reliever Shadow Board — May 30, 2026

This is `E34`, the first live-style bullpen artifact built from the `E33` reliever stack.

Goal:

- keep the reliever upgrade research in shadow mode
- surface a `first-up / top-2` bullpen cluster on real game cards
- use the same `E33` feature stack without changing the core live board yet

Target slate:

- date: `2026-05-30`
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
| 4 | 0.0% | 50.0% | 50.0% |

## Top Shadow Clusters

| Team | Opponent | Lead | Alt | Starter hook | Top-2 share |
| --- | --- | --- | --- | --- | --- |
| Astros | Brewers | Nate Pearson | AJ Blubaugh | 0.0% | 52.1% |
| Padres | Nationals | Wandy Peralta | Bradgley Rodriguez | 0.0% | 49.4% |
| Cubs | Cardinals | Ryan Rolison | Jacob Webb | 0.0% | 39.0% |
| Pirates | Twins | Mason Montgomery | Gregory Soto | 0.0% | 37.2% |
| Twins | Pirates | Simeon Woods Richardson | Andrew Morris | 0.0% | 36.9% |
| Phillies | Dodgers | Jonathan Bowlan | Tanner Banks | 0.0% | 36.7% |
| White Sox | Tigers | Tyler Davis | Grant Taylor | 0.0% | 35.2% |
| Athletics | Yankees | Jacob Lopez | Justin Sterner | 0.0% | 34.8% |
| Mariners | Diamondbacks | Alex Hoppe | José A. Ferrer | 0.0% | 34.4% |
| Diamondbacks | Mariners | Taylor Clarke | Kevin Ginkel | 0.0% | 34.1% |

## Top Shadow Features

- `first_reliever_likelihood` `0.028`
- `quality_entry_order_avg_last10` `0.028`
- `availability_score` `0.028`
- `days_since_last_appearance` `0.027`
- `fatigue_score` `0.025`
- `bridge_score` `0.017`
- `avg_pitches_per_appearance` `0.016`
- `quality_strikeouts_per_bf_last10` `0.016`
- `starter_prob_15` `0.016`
- `quality_traffic_per_bf_last10` `0.016`
- `quality_pitches_per_app_last10` `0.016`
- `pitches_last3` `0.015`
- `quality_strike_rate_last10` `0.014`
- `starter_prob_12` `0.014`

## Read

- `E34` is not a live-model promotion. It is a board artifact for inspection.
- The shadow card is only meant to show:
  - who the `E33` stack thinks is first up
  - who the main alternate is
  - whether the starter hook and bullpen-shape context make the bridge risky or quiet
- Exact-name performance is still not good enough to call this solved, but the `E33` holdout rates are finally strong enough to inspect on game cards instead of burying the work in markdown only.

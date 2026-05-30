# MLB First-Up Reliever Shadow Board — May 30, 2026

This is `E34`, the first live-style bullpen artifact built from the `E33` reliever stack.

Goal:

- keep the reliever upgrade research in shadow mode
- surface a `first-up / top-2` bullpen cluster on real game cards
- use the same `E33` feature stack without changing the core live board yet

Target slate:

- date: `2026-05-29`
- team-side shadow cards: `30`
- reliever candidates scored: `284`
- conversion window: `8`
- dependency window: `5`

## Research Baseline

| Reference | Exact 1st | Top-2 | Top-3 |
| --- | --- | --- | --- |
| `E33 holdout` | 26.5% | 44.5% | 59.6% |

## Target-Date Shadow Check

| Team-side games | Exact 1st | Top-2 | Top-3 |
| --- | --- | --- | --- |
| 30 | 23.3% | 40.0% | 50.0% |

## Top Shadow Clusters

| Team | Opponent | Lead | Alt | Starter hook | Top-2 share |
| --- | --- | --- | --- | --- | --- |
| Pirates | Twins | Evan Sisk | Gregory Soto | 0.0% | 56.1% |
| Astros | Brewers | Bryan King | AJ Blubaugh | 0.0% | 52.9% |
| Braves | Reds | Didier Fuentes | Dylan Lee | 0.0% | 51.0% |
| Cubs | Cardinals | Ethan Roberts | Jacob Webb | 0.0% | 50.7% |
| Blue Jays | Orioles | Mason Fluharty | Yariel Rodríguez | 0.0% | 47.8% |
| Royals | Rangers | Daniel Lynch IV | John Schreiber | 0.0% | 44.3% |
| Nationals | Padres | Brad Lord | Andrew Alvarez | 0.0% | 43.0% |
| Twins | Pirates | Simeon Woods Richardson | Anthony Banda | 0.0% | 41.1% |
| Giants | Rockies | Sam Hentges | Matt Gage | 0.0% | 40.4% |
| Mariners | Diamondbacks | José A. Ferrer | Gabe Speier | 0.0% | 40.0% |

## Top Shadow Features

- `quality_entry_order_avg_last10` `0.028`
- `availability_score` `0.028`
- `days_since_last_appearance` `0.027`
- `first_reliever_likelihood` `0.027`
- `fatigue_score` `0.025`
- `bridge_score` `0.018`
- `avg_pitches_per_appearance` `0.017`
- `quality_pitches_per_app_last10` `0.016`
- `quality_strikeouts_per_bf_last10` `0.016`
- `quality_traffic_per_bf_last10` `0.016`
- `starter_prob_15` `0.016`
- `pitches_last3` `0.015`
- `starter_prob_12` `0.014`
- `quality_strike_rate_last10` `0.014`

## Read

- `E34` is not a live-model promotion. It is a board artifact for inspection.
- The shadow card is only meant to show:
  - who the `E33` stack thinks is first up
  - who the main alternate is
  - whether the starter hook and bullpen-shape context make the bridge risky or quiet
- Exact-name performance is still not good enough to call this solved, but the `E33` holdout rates are finally strong enough to inspect on game cards instead of burying the work in markdown only.

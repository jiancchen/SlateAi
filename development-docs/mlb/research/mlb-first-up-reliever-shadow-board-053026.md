# MLB First-Up Reliever Shadow Board — May 30, 2026

This is `E36 shadow`, the live-style bullpen artifact built from the `E33` stack plus the adaptive heavy-use reset overlay.

Goal:

- keep the reliever upgrade research in shadow mode
- surface a `first-up / top-2` bullpen cluster on real game cards
- use the same `E33` feature stack without changing the core live board yet

Target slate:

- date: `2026-05-30`
- team-side shadow cards: `30`
- reliever candidates scored: `272`
- conversion window: `8`
- dependency window: `5`

## Research Baseline

| Reference | Exact 1st | Top-2 | Top-3 |
| --- | --- | --- | --- |
| `E33 holdout` | 26.5% | 44.5% | 59.6% |

## Target-Date Shadow Check

| Team-side games | Exact 1st | Top-2 | Top-3 |
| --- | --- | --- | --- |
| 20 | 20.0% | 35.0% | 50.0% |

## Top Shadow Clusters

| Team | Opponent | Lead | Alt | Starter hook | Top-2 share |
| --- | --- | --- | --- | --- | --- |
| Astros | Brewers | AJ Blubaugh | Nate Pearson | 0.0% | 55.2% |
| Padres | Nationals | Wandy Peralta | Bradgley Rodriguez | 0.0% | 51.9% |
| Brewers | Astros | Carlos Rodriguez | Shane Drohan | 0.0% | 45.6% |
| Reds | Braves | Sam Moll | Brock Burke | 0.0% | 45.5% |
| Pirates | Twins | Mason Montgomery | Gregory Soto | 0.0% | 44.3% |
| Marlins | Mets | John King | Andrew Nardi | 0.0% | 43.5% |
| Twins | Pirates | Simeon Woods Richardson | Andrew Morris | 0.0% | 43.1% |
| Angels | Rays | Sam Bachman | José Fermin | 0.0% | 41.5% |
| Braves | Reds | Reynaldo López | Dylan Dodd | 0.0% | 41.3% |
| Royals | Rangers | Daniel Lynch IV | John Schreiber | 0.0% | 40.5% |

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

- `E36 shadow` is not a live-model promotion. It is a board artifact for inspection.
- The shadow card is only meant to show:
  - who the `E33` stack thinks is first up
  - who the main alternate is
  - whether the starter hook and bullpen-shape context make the bridge risky or quiet
- Exact-name performance is still not good enough to call this solved, but the `E33` holdout rates are finally strong enough to inspect on game cards instead of burying the work in markdown only.

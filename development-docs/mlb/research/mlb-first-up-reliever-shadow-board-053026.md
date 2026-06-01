# MLB First-Up Reliever Shadow Board — May 30, 2026

This is `E36 shadow`, the live-style bullpen artifact built from the `E33` stack plus the adaptive heavy-use reset overlay.

Goal:

- keep the reliever upgrade research in shadow mode
- surface a `first-up / top-2` bullpen cluster on real game cards
- use the same `E33` feature stack without changing the core live board yet

Target slate:

- date: `2026-06-01`
- team-side shadow cards: `18`
- reliever candidates scored: `178`
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
| Angels | Rockies | José Fermin | Ryan Zeferjahn | 0.0% | 37.5% |
| Rockies | Angels | Jaden Hill | Antonio Senzatela | 0.0% | 37.4% |
| Giants | Brewers | Erik Miller | Matt Gage | 0.0% | 37.1% |
| Marlins | Nationals | Michael Petersen | Andrew Nardi | 0.0% | 34.8% |
| Diamondbacks | Dodgers | Taylor Clarke | Ryan Thompson | 0.0% | 34.5% |
| Brewers | Giants | Shane Drohan | Grant Anderson | 0.0% | 33.8% |
| Dodgers | Diamondbacks | Alex Vesia | Kyle Hurt | 0.0% | 32.6% |
| Rangers | Cardinals | Cal Quantrill | Jakob Junis | 0.0% | 31.0% |
| Mariners | Mets | Matt Brash | José A. Ferrer | 0.0% | 30.4% |
| White Sox | Twins | Tyler Davis | Brandon Eisert | 0.0% | 28.4% |

## Top Shadow Features

- `quality_entry_order_avg_last10` `0.028`
- `first_reliever_likelihood` `0.027`
- `availability_score` `0.027`
- `days_since_last_appearance` `0.027`
- `fatigue_score` `0.026`
- `bridge_score` `0.017`
- `quality_strikeouts_per_bf_last10` `0.016`
- `avg_pitches_per_appearance` `0.016`
- `quality_pitches_per_app_last10` `0.016`
- `quality_traffic_per_bf_last10` `0.016`
- `pitches_last3` `0.015`
- `starter_prob_12` `0.015`
- `starter_prob_15` `0.015`
- `quality_strike_rate_last10` `0.015`

## Read

- `E36 shadow` is not a live-model promotion. It is a board artifact for inspection.
- The shadow card is only meant to show:
  - who the `E33` stack thinks is first up
  - who the main alternate is
  - whether the starter hook and bullpen-shape context make the bridge risky or quiet
- Exact-name performance is still not good enough to call this solved, but the `E33` holdout rates are finally strong enough to inspect on game cards instead of burying the work in markdown only.

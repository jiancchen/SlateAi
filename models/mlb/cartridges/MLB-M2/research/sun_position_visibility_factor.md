# MLB-M2 Sun-Position Visibility Factor

Sun position is not weather.

Weather inputs describe the air and surface environment:

- temperature
- wind speed and direction
- precipitation
- humidity if available
- roof/open-air state

Sun-position visibility is geometry plus time:

- venue latitude and longitude
- field orientation
- scheduled first pitch time in local time
- inning/time progression if available
- solar azimuth and elevation at first pitch and expected middle innings
- cloud cover
- roof/shadow state
- exposure by defensive zone, especially outfield tracking angles

## Why It Matters

The May 31 lesson was not simply that hot or windy games go over. A separate effect can exist when game time and ballpark geometry create visibility problems. That can create:

- misread fly balls
- late jumps by outfielders
- defensive mistakes that do not show up in pitcher/batter priors
- extra bases from balls that would usually be caught
- innings that break open despite a neutral raw run projection

This should not be modeled as `weather_carry`. It is now a separate warehouse feature and M2 modifier; a future `run_environment_tail` table can consume it with the other chaos inputs.

## Warehouse Shape

`mlb_game_sun_visibility_snapshots`

| Column | Purpose |
| --- | --- |
| `game_pk` | MLB game id |
| `game_date` | Slate date |
| `venue_name` | Ballpark name |
| `game_datetime` | Scheduled first pitch |
| `latitude` | Venue latitude |
| `longitude` | Venue longitude |
| `field_azimuth_deg` | Approximate home-plate-to-center-field bearing from MLB venue metadata |
| `timezone_offset_hours` | Game-time venue UTC offset |
| `roof_type` | Venue roof type when supplied |
| `sun_azimuth_first_pitch` | Solar azimuth at first pitch |
| `sun_elevation_first_pitch` | Solar elevation at first pitch |
| `sun_azimuth_midgame` | Solar azimuth around innings 4-6 |
| `sun_elevation_midgame` | Solar elevation around innings 4-6 |
| `outfield_sun_angle_deg` | Angle between the sun and outfielder look path toward home |
| `outfield_glare_risk` | 0-100 derived score |
| `shadow_transition_risk` | 0-100 derived score |
| `visibility_risk_score` | Composite 0-100 score |
| `risk_label` | none, low, medium, high |
| `visibility_notes_json` | Explainable flags |

`mlb_game_visibility_outcomes`

| Column | Purpose |
| --- | --- |
| `game_pk` | MLB game id |
| `game_date` | Slate date |
| `fielding_errors` | All scored fielding-error plays |
| `outfield_errors` | Error plays tied to outfield location/description |
| `outfield_hits` | Singles/doubles/triples hit to outfield zones |
| `outfield_air_hits` | Outfield hits with fly/line/pop or outfield-fielder description |
| `outfield_extra_base_hits` | Outfield doubles/triples |
| `outfield_home_runs` | Home runs, stored separately from fieldable hits |
| `visibility_pressure_events` | Distinct plays that could plausibly intersect visibility pressure |

## First Model Use

Do not let this pick a total alone. Use it as a modifier:

- boost `run_environment_tail` when sun visibility risk is high and the game already has run-cluster or one-bad-inning traits
- veto fragile unders when sun visibility risk is high and the posted total is low/neutral
- tag game stories after settlement when errors, extra-base hits, or late jumps align with the visibility window

Current M2 implementation:

- `pipeline/mlb/warehouse/mlb_warehouse.py` computes and stores the two warehouse tables above from MLB feed/live venue geometry and play hitData.
- `models/mlb/cartridges/MLB-M2/lanes/generate-day-files.mjs` exposes `stateContext.sunVisibility`.
- `models/mlb/cartridges/MLB-M2/lib/mlb-analysis-context.js` adds a small first-five/late hit and run lift when the visibility score is high enough.
- `models/mlb/cartridges/MLB-M2/lib/mlb-game-shape.js` adds a small chaos modifier and model note.
- `models/mlb/cartridges/MLB-M2/lib/mlb-props.js` gives total-bases/hits/singles a small visibility adjustment, capped so it cannot dominate contact quality and matchup inputs.

Backfill after implementation:

- Raw MLB snapshots from 2026-05-10 through 2026-05-31 were replayed into the new tables.
- May 31 now has 15/15 sun-visibility snapshots and 15/15 visibility outcome rows.
- May 31 average visibility risk: 20.6/100, with 2 medium-risk games after adding high-sun sky-tracking risk.
- First backfilled bucket check, 2026-05-10 through 2026-05-31: medium+ risk games averaged 3.50 outfield doubles/triples, low-risk games 3.22, no-risk games 3.21. Error signal was not positive in this first pass, so keep the model impact small.

## Test Requirement

A future M2 variant should run an ablation:

- run-environment tail without sun visibility
- run-environment tail with sun visibility

It only graduates if it improves walk-forward O/U top-3 or top-5 performance without simply overfitting one day.

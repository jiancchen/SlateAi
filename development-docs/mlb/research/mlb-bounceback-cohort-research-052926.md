# MLB Bounceback Cohort Research

This pass asks a simple question: when a team is coming off a loss, can we separate **competitive bounceback spots** from **real slump spots** using the warehouse state snapshots? Sample window: `2026-04-15` through `2026-05-29`.

## Cohort Results

| Cohort | Sample | FG win rate | F5 non-loss rate | Avg F5 run diff |
| --- | --- | --- | --- | --- |
| All teams coming off a loss | 583 | 46.3% | 57.3% | +0.01 |
| Loss but not dead | 178 | 51.1% | 58.4% | +0.16 |
| Close-loss competitive | 80 | 47.5% | 56.2% | +0.07 |
| Slumping loser | 146 | 42.5% | 58.9% | -0.15 |
| High snapback, low form | 23 | 30.4% | 60.9% | -0.09 |

## Read

- `Loss but not dead` is the cleanest rebound bucket here. Those teams still won the next game `51.1%` of the time and avoided a first-five loss `58.4%` of the time.
- `Close-loss competitive` is not a slam dunk, but it behaves materially better than true slump buckets. The average first-five run diff stays just positive.
- `Slumping loser` is a different animal. Those teams only won the next game `42.5%` of the time and still carried a negative average first-five run diff.
- `High snapback, low form` is the trap cohort. They look emotionally live, but the full-game win rate is only `30.4%` even though they avoid a first-five loss `60.9%` of the time. That is a **watch / dog resistance** lane, not a blind ML-buy lane.

## What This Means For The Board

- The losing-team layer should not ask only `coming off a loss?`
- It should ask:
  - `loss but not dead?`
  - `close-loss competitive?`
  - `slumping loser?`
  - `high snapback, low form?`
- `High snapback, low form` looks more like a first-five resistance / chaos warning than a clean side-upgrade.
- `Slumping loser` should probably become a direct negative side selector and a positive lane for opponent NRFI / F5 under / dead-early filters when the rest of the script agrees.

## Today (2026-05-29) Teams Flagged

| Team | Opponent | Bucket | Streak | Len | Snapback | Form | Run diff L5 | Close losses L5 | Blowout losses L5 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Athletics | New York Yankees | Slumping loser | L | 3 | 73.4 | 51.0 | -3.4 | 1 | 2 |
| Baltimore Orioles | Toronto Blue Jays | Loss but not dead | L | 1 | 34.0 | 33.3 | 2.4 | 1 | 0 |
| Colorado Rockies | San Francisco Giants | Slumping loser | L | 5 | 100.0 | 66.0 | -4.6 | 2 | 2 |
| Kansas City Royals | Texas Rangers | Slumping loser | L | 3 | 63.8 | 46.7 | -3.0 | 1 | 2 |
| Minnesota Twins | Pittsburgh Pirates | Slumping loser | L | 2 | 50.8 | 40.9 | -3.2 | 1 | 1 |
| San Diego Padres | Washington Nationals | Loss but not dead | L | 4 | 77.4 | 52.8 | -1.6 | 1 | 0 |
| San Francisco Giants | Colorado Rockies | Loss but not dead, Close-loss competitive | L | 3 | 61.8 | 48.8 | 0.6 | 2 | 0 |
| Tampa Bay Rays | Los Angeles Angels | Slumping loser | L | 4 | 87.4 | 57.3 | -3.2 | 2 | 2 |
| Texas Rangers | Kansas City Royals | Slumping loser | L | 2 | 64.4 | 47.0 | -2.4 | 2 | 1 |
| Washington Nationals | San Diego Padres | Loss but not dead | L | 1 | 34.0 | 33.3 | 2.6 | 1 | 0 |

## Next Step

- Add these cohort flags directly into the live side / first-five reason stack so `loss` stops being a blunt input.
- Treat `loss but not dead` and `slumping loser` as separate selectors in future model experiments.

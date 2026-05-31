# MLB Reliever Pitch Window Patterns - May 30, 2026

Audit window: `2026-05-10` through `2026-05-30` using `mlb_pitcher_appearances`.

## Rest After Pitch Load

| Prior pitches | Samples | Avg rest days | Median rest | Next day | 2 days | 3+ days |
| --- | --- | --- | --- | --- | --- | --- |
| <20 | 918 | 2.61 | 2.0 | 22.7% | 31.8% | 45.5% |
| 20-29 | 337 | 3.00 | 3.0 | 12.8% | 34.7% | 52.5% |
| 30-34 | 58 | 3.57 | 3.0 | 6.9% | 22.4% | 70.7% |
| 35-39 | 37 | 3.43 | 3.0 | 2.7% | 27.0% | 70.3% |
| 40-44 | 16 | 4.19 | 4.0 | 0.0% | 6.2% | 93.8% |
| 45+ | 39 | 5.31 | 5.0 | 0.0% | 2.6% | 97.4% |

## Bullpen Shape By Relievers Used

| Relievers used | Team-games | Relief runs | H+BB allowed | 1st RP pitches | 1st RP outs | Any 35+ arm |
| --- | --- | --- | --- | --- | --- | --- |
| 2 or fewer | 158 | 0.97 | 3.03 | 27.5 | 5.3 | 32.3% |
| 3 | 169 | 1.64 | 4.63 | 22.4 | 4.1 | 25.4% |
| 4 | 132 | 2.11 | 5.45 | 20.1 | 3.5 | 15.9% |
| 5+ | 86 | 3.06 | 7.57 | 21.3 | 3.9 | 22.1% |

## Quick-Reuse Outliers

| Pitcher | Team | Prior pitches before <=1d reuse |
| --- | --- | --- |
| Matt Pushard | St. Louis Cardinals | 35 |
| Ryan Watson | Boston Red Sox | 34 |
| Travis Adams | Minnesota Twins | 33 |
| Lucas Erceg | Kansas City Royals | 32 |
| Josh Ekness | Miami Marlins | 31 |
| Enmanuel De Jesus | Detroit Tigers | 29 |
| Jeff Hoffman | Toronto Blue Jays | 27 |
| Connor Phillips | Cincinnati Reds | 27 |

## Read

- Pitcher-specific quick-reuse samples are sparse: `172` pitchers have any <=1 day reuse in this window, with median sample `1.0`.
- Team-level quick-reuse samples are steadier: `30` teams have <=1 day reuse examples, with median sample `8.0`.
- The right live behavior is a reset score using recent appearance, last pitch load, and team quick-reuse pattern. `35` is a useful global danger zone, not a universal wall.
- Games that reach `5+` relievers are a different bullpen regime. They allow more relief traffic and should trigger a remaining-pool calculation rather than only naming the first arm.

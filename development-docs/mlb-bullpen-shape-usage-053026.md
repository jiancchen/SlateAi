# MLB Bullpen Shape Usage — May 30, 2026

Audit window:

- actual team bullpen usage from `2026-05-09` through `2026-05-28`
- source table: `mlb_pitcher_appearances`
- unit of analysis: one team-side game with at least one reliever appearance

## Relievers Used Per Team Game

| Relievers used | Team-games | Share |
| --- | --- | --- |
| 1 | 44 | 8.4% |
| 2 | 115 | 22.0% |
| 3 | 165 | 31.5% |
| 4 | 125 | 23.9% |
| 5 | 58 | 11.1% |
| 6+ | 16 | 3.1% |

## First Reliever Workload

| First reliever workload | Team-games | Share |
| --- | --- | --- |
| 1-3 outs | 307 | 58.7% |
| 4-5 outs | 93 | 17.8% |
| 6+ outs | 123 | 23.5% |

## Example 2-Reliever Games

| Example |
| --- |
| 2026-05-09 Los Angeles Angels used 2 relievers: Mitch Farris, Adam Frazier |
| 2026-05-09 Chicago Cubs used 2 relievers: Jacob Webb, Ethan Roberts |
| 2026-05-09 Pittsburgh Pirates used 2 relievers: Evan Sisk, Cam Sanders |
| 2026-05-09 St. Louis Cardinals used 2 relievers: Justin Bruihl, Matt Svanson |
| 2026-05-09 Atlanta Braves used 2 relievers: Dylan Lee, Reynaldo López |

## Example 6+ Reliever Games

| Example |
| --- |
| 2026-05-09 San Francisco Giants used 6 relievers: Ryan Borucki, Ryan Walker, Matt Gage, JT Brubaker, Gregory Santos, Christian Koss |
| 2026-05-09 Minnesota Twins used 6 relievers: Andrew Morris, Taylor Rogers, Yoendrys Gómez, Kody Funderburk, Eric Orze, Luis García |
| 2026-05-10 Pittsburgh Pirates used 6 relievers: Isaac Mattson, Mason Montgomery, Dennis Santana, Gregory Soto, Yohan Ramírez, Justin Lawrence |
| 2026-05-10 San Francisco Giants used 6 relievers: Keaton Winn, Sam Hentges, Caleb Kilian, Joel Peguero, Dylan Smith, Ryan Borucki |
| 2026-05-13 Tampa Bay Rays used 6 relievers: Hunter Bigge, Garrett Cleavinger, Kevin Kelly, Bryan Baker, Cole Sulser, Aaron Brooks |

## Read

- The current bridge model mostly tries to answer `who is first up`, but the game-shape question is separate: are we expecting a short bridge, a bulk piggyback, or a full bullpen carousel.
- This report is the evidence for why we need a team-level bullpen shape layer, not just pitcher-level reliever likelihood scores.
- The next warehouse target should explicitly store per-team recent bullpen shape features such as:
  - relievers used per game over last 3/5/10
  - first reliever outs over last 3/5/10
  - bulk-first-up rate (`6+ outs`)
  - two-reliever containment rate
  - six-plus-reliever scramble rate
  - bullpen days / opener-piggyback frequency

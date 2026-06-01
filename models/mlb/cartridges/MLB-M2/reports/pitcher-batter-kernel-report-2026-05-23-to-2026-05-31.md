# MLB-M2 Pitcher-Batter Kernel Report

Range: 2026-05-23 to 2026-05-31

## Coverage

- Pitch mix rows: 22146
- Hitter response rows: 34679
- Matchup rows: 2709

## Pitch-Type Mix

- FF: 4729 rows, avg share 0.344, leak 0.506, damage 0.059
- SI: 3545 rows, avg share 0.239, leak 0.465, damage 0.076
- SL: 3321 rows, avg share 0.239, leak 0.578, damage 0.063
- CH: 3004 rows, avg share 0.179, leak 0.655, damage 0.058
- ST: 2087 rows, avg share 0.21, leak 0.592, damage 0.054
- CU: 2028 rows, avg share 0.152, leak 0.616, damage 0.056
- FC: 2008 rows, avg share 0.199, leak 0.506, damage 0.063
- FS: 770 rows, avg share 0.204, leak 0.671, damage 0.057
- KC: 297 rows, avg share 0.186, leak 0.637, damage 0.052
- SV: 92 rows, avg share 0.197, leak 0.611, damage 0.064
- EP: 89 rows, avg share 0.812, leak 0.694, damage 0.143
- FA: 68 rows, avg share 0.478, leak 0.604, damage 0.158
- UNK: 54 rows, avg share 0.067, leak 0.327, damage 0.052
- KN: 18 rows, avg share 0.318, leak 0.606, damage 0.122
- FO: 18 rows, avg share 0.199, leak 0.615, damage 0.068

## Lineup Matchup Daily Coverage

- 2026-05-23: 28 lineup rows, 277 hitter rows, avg collapse 22.4, avg damage 7.3
- 2026-05-24: 29 lineup rows, 302 hitter rows, avg collapse 22.5, avg damage 7.0
- 2026-05-25: 26 lineup rows, 264 hitter rows, avg collapse 22.5, avg damage 7.4
- 2026-05-26: 28 lineup rows, 297 hitter rows, avg collapse 22.2, avg damage 7.3
- 2026-05-27: 29 lineup rows, 294 hitter rows, avg collapse 22.3, avg damage 7.5
- 2026-05-28: 12 lineup rows, 126 hitter rows, avg collapse 22.0, avg damage 7.6
- 2026-05-29: 29 lineup rows, 292 hitter rows, avg collapse 22.8, avg damage 7.4
- 2026-05-30: 30 lineup rows, 305 hitter rows, avg collapse 22.5, avg damage 7.4
- 2026-05-31: 30 lineup rows, 311 hitter rows, avg collapse 21.8, avg damage 7.2

## Rough Signal Checks

- collapseTopQuartile: threshold 23.14, rows 61, team F5 3+ 0.443, game F5 over 4 0.525
- damageTopQuartile: threshold 7.82, rows 61, team F5 3+ 0.328, game F5 over 4 0.426
- commandTopQuartile: threshold 48.49, rows 61, team F5 3+ 0.426, game F5 over 4 0.459

This report is a research surface. It verifies pitch-event coverage and rough early-scoring association only; it does not promote a matchup lane.
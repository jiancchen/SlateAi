# MLB-SP1 Changelog

## MLB-SP1.2026-06-14.design

Status: design-scaffold.

Added the starter pitcher profile addendum contract for MLB-M2. The model is not active as a scoring override yet.

Primary design decisions:

- Treat Rotowire primary/bulk pitcher as the projection pitcher when MLB lists an opener.
- Keep MLB opener stats for first-inning and YRFI/NRFI context.
- Use pitcher handedness-allowed splits, hitter handedness splits, pitch mix, day/night splits, recent form, repeat-opponent context, and HRForce/weather profile as one pitcher-profile object.
- Feed every lane from the same deltas: ML, F5 ML, totals, team totals, YRFI/NRFI, pitcher expected lines, batter production, HR lanes, and game-story copy.
- Keep stale BvP and old career splits as context only; current form and recent opponent history must control the adjustment.

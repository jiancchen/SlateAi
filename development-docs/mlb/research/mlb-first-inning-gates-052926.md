# MLB First-Inning Gate Audit — May 29, 2026

This pass checks the recent graded first-inning board to see which simple selectors are actually supporting the lane. The point is not to celebrate a hot run; it is to find the parts we can keep and the parts we should demote.

- total graded first-inning picks: `78`
- YRFI baseline: `52.6%` on `57` picks
- NRFI baseline: `57.1%` on `21` picks

## Selector results

| Selector | Sample | Hit rate |
| --- | --- | --- |
| High-confidence YRFI (>= 68) | 34 | 55.9% |
| One-side carry YRFI | 14 | 35.7% |
| Double-live YRFI | 17 | 64.7% |
| Pitcher-leak YRFI | 26 | 65.4% |
| Pitcher-leak + double-live YRFI | 8 | 87.5% |
| Pitcher-leak + one-side YRFI | 6 | 50.0% |
| Quiet-shape YRFI | 1 | 0.0% |
| High-confidence NRFI (>= 60) | 10 | 50.0% |
| Quiet + clean NRFI | 11 | 63.6% |

## Read

- `Quiet + clean NRFI` is the strongest keep lane when both sides project low early and both starters carry clean season first-inning lines.
- `Double-live YRFI` is clearly better than `one-side carry YRFI`. When both offenses have a live early path, the board behaves much better than when it leans on one side to do all the work.
- `Pitcher-leak + double-live YRFI` is the strongest current keep lane. That is the clean version of a first-inning over: live bats on both sides plus a real early-leak path from at least one starter.
- `One-side carry YRFI` is a demotion lane unless it also has stronger leak support. Those are the fragile overs that feel live because one lineup is hot, but still miss too often.
- `Quiet-shape YRFI` is the danger lane. Those are the exact over-smoothed first-inning overs that have been hurting the board.
- `Pitcher-leak YRFI` is useful, but it works best when it aligns with a real two-sided pressure case instead of replacing lineup pressure by itself.


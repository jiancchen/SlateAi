# MLB Hits xBA Gates — May 29, 2026

This is the second isolated phase-2 test. The question is simple: if we take the existing `hits` backtests and add only `xBA`, sweet-spot contact shape, and the saved pitch-fit / matchup-grade context, do we get a cleaner gate before we touch any live scorer logic?

- sample: `256` historical hits bets
- base hit rate: `19.1%`

## Gate Results

| Gate | Sample | Hit rate |
| --- | --- | --- |
| Baseline hits overs | 256 | 19.1% |
| Posted lineup only | 194 | 18.6% |
| 7d xBA Q4 (>= 0.339) | 64 | 15.6% |
| 14d xBA Q4 (>= 0.315) | 64 | 14.1% |
| 7d xBA Q4 + sweet-spot Q4 (>= 41.1%) | 33 | 15.2% |
| 7d xBA Q4 + fit >= +4.0 | 23 | 21.7% |
| 7d xBA Q4 + matchup grade >= +8.0 | 57 | 17.5% |
| 7d xBA Q4 + sweet-spot Q4 + fit >= +4.0 | 12 | 25.0% |

## Read

- Best isolated gate in this pass: `7d xBA Q4 + sweet-spot Q4 + fit >= +4.0` at `25.0%` on `12` bets.
- `7d xBA` threshold in this sample: `0.339`. `14d xBA` threshold: `0.315`.
- `7d sweet-spot` threshold in this sample: `41.1%`.
- This is still intentionally narrow: `xBA`, contact-shape, and saved pitch-fit context only. No opponent-strength or classic last-10 bundling yet.
- If the xBA + fit gate wins cleanly here, it becomes a shadow-mode candidate before any live deployment.


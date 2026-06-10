# TEN-T0 Tennis Archived Forensic Notes

## Archive Status

TEN-T0 is archived as of 2026-06-10. It is retained for forensic reproduction only and must not be used for production prediction publication.

The archive decision is based on the data-shape audit: TEN-T0 mixed slate generation, market-watch inventory, DB fallback inputs, and prediction capture. Future tennis model work must start from canonical audited data shapes instead of patching this cartridge.

## Summary

TEN-T0 was the first cartridge version of the tennis pipeline. It freezes the May 31 Roland Garros prediction shape for historical diagnosis.

This is an archived forensic baseline, not a claim that the tennis model is sharp enough to bet blindly.

## Key Improvements

- Separated the active tennis model into a cartridge/run stack.
- Split ML, spread, match O/U, first-set O/U, set-win, and Kalshi trade-to-sell into separate lanes.
- Added postmatch settlement and backtest surfaces for day-by-day model tracking.
- Kept source-site predictions as context only instead of direct model picks.

## Key Metrics

| Metric | Value | Notes |
| --- | ---: | --- |
| Backtest hit rate | 59.4% | 158/266 settled rows in the exported TEN-T0 backtest artifact |
| Data-only hit rate | 57.5% | 153/266 settled rows without market-derived support |
| May 31 settlement | Pending | 0/48 lane rows graded before postmatch import |
| May 30 validation | ML 56.2% | Same pre-cartridge logic: ML 9-7, spread 5-8, match O/U 3-10; bet-grade value rows went 0-2 |
| Tracked lanes | 6 | ML, spread, match O/U, first-set O/U, set-win, Kalshi trade-to-sell |

## Notes

- TEN-T0 must not publish production prediction rows.
- Future tennis cartridges may compare against the May 31 TEN-T0 golden snapshot for forensic context, but not as an approval gate.
- May 30 is the closest settled TEN-T0-compatible validation slate, but it was produced before formal cartridge run snapshots existed.
- Prediction-market trade-to-sell is a separate objective from picking winners and must stay separately graded.
- Blind ML value remains downgraded until bucketed EV and ROI improve in settled postmatch runs.
- Every future cartridge needs a model description JSON and this human notes file.

## Known Limitations

- May 30 is legacy pre-cartridge history, not a settled TEN-T0 run.
- Derivative lanes depend on captured FanDuel and Kalshi line coverage.
- TEN-T0 still needs better upset-path and in-match price-spike calibration before it should be treated as a betting engine.

## Promotion Rules

Promote a future tennis cartridge only after it documents what changed, runs the golden snapshot check, exports model history, and improves or intentionally preserves the target lane metrics.

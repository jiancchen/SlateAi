# MLB Phase 1 Context Research — May 29, 2026

This pass only audits the new warehouse layers. It does **not** change live MLB picks yet.

## Coverage

- Opponent-quality rows: `1676`
- Opponent-quality rows with a last-10 sample: `1676`
- Market-context rows: `1676`
- Market-context rows with moneyline odds history: `85`
- Market-context rows with totals-line history: `0`

### Immediate read

- Moneyline memory is usable now because the FanDuel Research archive already backfilled `h2h`.
- True team `over/under vs Vegas line` history is still coverage-limited because historical totals lines are not backfilled yet.
- The totals columns are still worth warehousing now so they start filling automatically as soon as that source is added.

## Opponent-Strength Signal

- Rows with next-game outcomes available: `1652`
- Schedule-toughness quartiles: `Q1 20.7` / `Q3 42.8`

|Bucket|Rows|Win rate|Avg run diff|
|---|---:|---:|---:|
|Hard recent schedule (top quartile)|413|49.4%|-0.08|
|Soft recent schedule (bottom quartile)|416|49.8%|0.17|
|2+ close losses vs winning opponents in last 10|478|51.7%|-0.16|

### Opponent-strength takeaway

- The new table is already rich enough to test whether a team is coming off a genuinely hard stretch versus simply playing bad baseball.
- `close_losses_vs_winning_record_last10` is the first bounceback-style flag worth keeping an eye on, because it isolates competitive losses against real opponents instead of flattening every loss into the same bucket.

## Market-Context Signal

- Rows with moneyline history: `85`
- Average favorite hold rate in last-10 market memory: `43.2%`
- Average underdog upset rate in last-10 market memory: `50.3%`

- Totals-line history: `0` historical rows right now. This is a source/coverage blocker, not a warehouse bug.

## Next Experiments

1. Use `schedule_toughness_index_last10` and `close_losses_vs_winning_record_last10` as isolated filters in side/F5 research, not the live model yet.
2. Keep filling `mlb_team_market_context_daily` automatically while we search for a reliable historical totals-line archive.
3. Once totals coverage exists, test whether team over/under memory improves totals and run-production props.


# Daily Tennis Slate Playbook

This playbook turns the Roland Garros May 29 lesson into a repeatable slate workflow.

The main split:
- Winner picks answer: who is likely to win the match?
- Prediction-market trades answer: can the underdog contract re-rate upward before settlement?

Do not mix those jobs. A player can be a good trade and still lose. Bouzkova was this case. A player can look cheap and still be a bad trade if they cannot stabilize early. Golubic/Korpatsch were this miss pattern. A player can be both a trade and a real upset candidate. Teichmann was this case.

## Daily Data Steps

Run these before any slate is promoted:

```bash
npm run data:init:tennis
npm run data:fetch:tennis-rankings -- --date YYYY-MM-DD
npm run data:import:tennis-rankings
npm run data:fetch:tennis-scoreboard -- --date YYYY-MM-DD
npm run data:generate:tennis-clay-context -- --date YYYY-MM-DD
node pipeline/enrich-tennis-opponent-quality.mjs --input web/src/lib/day-YYYY-MM-DD-tennis-clay-context.generated.json --output web/src/lib/day-YYYY-MM-DD-tennis-opponent-quality.generated.json
npm run data:import:tennis-slate -- --date YYYY-MM-DD
npm run data:fetch:tennis-sofascore-slate -- --date YYYY-MM-DD
npm run data:import:tennis-sofascore
npm run data:fetch:tennis-flashscore-slate -- --date YYYY-MM-DD
npm run data:import:tennis-flashscore
python3 pipeline/tennis_multimodel_backtest.py --target-date YYYY-MM-DD
python3 pipeline/analyze_kalshi_tennis_intramatch.py --target-date YYYY-MM-DD
python3 pipeline/project_kalshi_tennis_trade_candidates.py
python3 pipeline/model_kalshi_tennis_spike.py --target-date YYYY-MM-DD
python3 pipeline/model_tennis_upset_wins.py --target-date YYYY-MM-DD
npm --prefix web run build
```

If sportsbook/FanDuel tennis lines are not available from an automated pull, capture the slate manually before generating the value board. Store moneyline, spread, and total with timestamp/source, then regenerate so ML/spread/O-U EV does not run on stale or missing prices.

## Required Warehouse Checks

Each singles match needs:

- Current ranking snapshot from Live Tennis or fallback ranking warehouse.
- Clay record, recent record, recent opponent rank quality, and adjusted form.
- Recent service and return metrics: hold, second serve, error control, return pressure, closeout.
- Roland Garros replay flow where available: service games, holds, breaks lost, return games, breaks won, long-game rate.
- H2H with dates and surfaces, not just total count.
- FanDuel or sportsbook ML/spread/total when relevant.
- Kalshi contract data: entry, orderbook, candles, max bid/trade, same-favorite history, similar-entry history.

If any row is missing the core hold/return/error context, mark it "data incomplete" and do not promote it above watch.

## Prediction-Market Trade Screen

Hard promotion gate:

- A row cannot be labeled `trade-to-sell` unless it has mapped Kalshi price-history context: same-favorite history, similar-entry history, or both.
- If both same-favorite and similar-entry history are missing, label the row `data incomplete` or `pass`, even when raw model EV is positive.
- A generic sportsbook weakness read is not a prediction-market thesis. Do not publish entry/exit targets from text-only analysis.
- The match-detail page must show the exact history evidence used: prior selection, entry, max bid/trade, scoreline, and hit-2x/hit-30c result.

The ideal trade-to-sell candidate:

- Favorite is priced `85c+`.
- Underdog entry is usually `5c-15c`.
- Underdog has a believable first-set stabilization path.
- Contract can plausibly double or hit a 2.5x target without the underdog winning.
- Same-favorite or similar-entry price history shows prior contracts can move.

The underdog must answer at least one of:

- Can hold the first two service games.
- Can push the first set deep.
- Can generate break points against the favorite.
- Can punish a favorite with known slow-start/error/serve issues.
- Has prior RG flow showing stable holds or break generation.

## Stabilization Veto

Veto or downgrade a cheap underdog when all of these are true:

- Favorite is top-20 or otherwise in strong current clay form.
- Favorite has been breaking quickly or winning clean opening sets.
- Underdog hold, second serve, or error control is weak.
- Underdog has no return-pressure edge.
- Same-favorite price history shows prior underdogs did not double.

The failure mode: the underdog gets broken immediately and the contract never creates a spike window.

This veto overrides cheap entry price.

## Kalshi Mini Stock Chart Check

Before a candidate becomes a trade row, inspect:

- Same favorite vs prior underdogs.
- Similar entry bucket against `85c+` favorites.
- Max bid and max trade, not only final result.
- Scoreline context behind the spike.

Required output fields before promotion:

- Current contract ticker and selection.
- Entry ask and bid/ask spread.
- Sell target and target-hit probability.
- Same-favorite comp count.
- Similar-entry comp count and hit rate.
- Explicit downgrade note when same-favorite history is negative or absent.

Interpretation:

- Prior underdog won set 1 and spiked: useful, but requires current dog to have a real first-set path.
- Prior underdog stayed on serve deep and spiked: strong support for the trade lane.
- Prior underdog got crushed and never moved: strong veto unless current dog is materially better.
- Mixed same-favorite history: lower the sell target or reduce size.

## Separate Output Lanes

Every slate should label rows as one of these:

- `winner`: supported by actual win model and price.
- `trade-to-sell`: supported by spike model, not necessarily a winner.
- `watch`: interesting but price, target, or live state is required.
- `pass`: negative EV, bad stabilization profile, or bad same-favorite price history.
- `data incomplete`: missing hold/return/error/replay/price history.

Do not show `watch` rows in the same top list as `trade-to-sell` rows.

## Site Value Section Rules

The left-rail `Value` tab is a publishing surface, not a scratchpad. Before shipping it:

- `PM trades` must count only rows whose effective spike tier is `trade`.
- `PM watch`, `PM pass`, and `No history` must be counted separately.
- The trade list must show entry, sell target, target-hit estimate, and `hist same-favorite/similar-entry` counts.
- No-history rows must appear only as pass/downgrade notes, never in the trade-to-sell list.
- The note at the top of the value card must say which gate/backtest is active for that slate.
- If the detail page has no mapped Kalshi row, the value tab cannot promote that match as a PM trade.

## Position Sizing Rules

For user-facing recommendations, include sizing only after a row passes the trade screen.

- Cap any single cheap-underdog trade unless it has both same-favorite price-history support and a clean stabilization profile.
- Do not allocate meaningful size to rows tagged `watch`, `pass`, or `data incomplete`.
- If multiple trades share the same failure mode, reduce total basket exposure.
- Reserve free-roll/hold pieces only for rows that have a real actual-upset case, not just a spike case.
- Quote expected value both as dollars and as downside if no contract spikes.

## Target Setting

Set sell targets by stability, not greed:

- Clean stabilization plus same-favorite support: 2.5x target.
- Cheap but fragile: simple double only.
- Strong actual upset case: split exits, with a small hold/free-roll piece.
- Vetoed row: no buy; if already filled, salvage target only.

For asleep/no-live-management trades:

- Prefer lower sleep-friendly sell targets.
- Avoid higher-priced watch rows.
- No averaging down on vetoed rows.
- Place sell limits immediately after fills.

## Live Triage

If a position starts badly:

- Do not average down unless the original stabilization thesis is still visibly alive.
- If the dog is broken early and the favorite is holding comfortably, treat it as a failed trade and salvage only if the bid is meaningful.
- If the dog is on serve, creating deuce games, or has break points, keep the original sell target or stage exits.
- If a row was later vetoed by same-favorite history or hold/error weakness, lower the target to a simple double or exit.

## Post-Slate Grading

Grade each row by the correct lane:

- Winner hit or miss.
- Spike target hit or miss.
- Max bid reached.
- Max trade reached.
- Whether the candidate stabilized early.
- Whether same-favorite history predicted the move.
- Whether the stabilization veto would have blocked the loser.

Do not grade Bouzkova-style trades as failures if they hit the sell target and lost the match.
Do grade Golubic-style trades as failures if the contract never stabilized.

Post-slate commands:

```bash
npm run data:fetch:tennis-scoreboard -- --date YYYY-MM-DD
npm run data:import:tennis-results -- --date YYYY-MM-DD
npm run data:grade:tennis -- --date YYYY-MM-DD
python3 pipeline/analyze_kalshi_tennis_intramatch.py --target-date YYYY-MM-DD
python3 pipeline/tennis_multimodel_backtest.py --target-date NEXT-YYYY-MM-DD
```

## May 29 Lessons

- Teichmann: good process. Actual upset case plus trade path. This is a candidate that can justify a small free-roll piece.
- Bouzkova: good trade process. Hit sell price and lost, which is still a successful prediction-market trade.
- Golubic: bad process before the veto. Cheap price and opponent volatility were over-weighted; weak stabilization profile should have blocked it.
- Korpatsch: should have been downgraded after checking Svitolina's form and same-favorite price history.
- Halys: cheap volatility only. Without same-favorite price-history support, target should be a simple double or pass.

## Minimum Daily Report

Each daily slate should produce:

- Top trade-to-sell candidates with buy cap, sell target, and reason.
- Hard veto list with exact veto reason.
- Best actual upset candidates, only if the upset-win model backtests positively.
- Same-favorite Kalshi history for every promoted underdog.
- A mapping miss list: every match with no Kalshi contract, no same-favorite history, or no similar-entry bucket.
- Backtest summary by lane: all candidates, model-selected candidates, stricter threshold candidates.
- Post-slate grade the next day.

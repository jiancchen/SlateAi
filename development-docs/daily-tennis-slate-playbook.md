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
npm run data:fetch:tennis-weather -- --date YYYY-MM-DD
npm run data:fetch:tennis-flashscore-slate -- --date YYYY-MM-DD
npm run data:import:tennis-flashscore
python3 pipeline/tennis_multimodel_backtest.py --target-date YYYY-MM-DD
python3 pipeline/analyze_kalshi_tennis_intramatch.py --target-date YYYY-MM-DD
python3 pipeline/project_kalshi_tennis_trade_candidates.py
python3 pipeline/tennis_multimodel_backtest.py --target-date YYYY-MM-DD
python3 pipeline/model_kalshi_tennis_spike.py --target-date YYYY-MM-DD
python3 pipeline/model_tennis_upset_wins.py --target-date YYYY-MM-DD
# Required before site generation once FanDuel spread/total lines are captured:
# build data-private/predictions/tennis/YYYY-MM-DD-derivative-markets.json
# with expected match games, expected first-set games, spread lean, and O/U lean.
npm --prefix web run build
```

Weather is part of the model input, not a narrative note. The weather step stores Open-Meteo hourly conditions for Roland Garros in `tennis_weather_hourly` and per-match start-to-finish summaries in `tennis_match_weather`. Do not run the model pass without this table populated for the slate: heat, humidity, sun/radiation, wind gusts, and rain risk are explicit features for totals, first-set shape, service comfort, and prediction-market spike behavior.

Kalshi open orderbooks must be mirrored into both the Kalshi tables and `tennis_prediction_market_snapshots`. The first `tennis_multimodel_backtest.py` pass refreshes the current slate training rows for flow/weather context; `project_kalshi_tennis_trade_candidates.py` then stores the current Kalshi side prices; the second model pass is required so ML/EV rows read the actual market snapshot. Do not publish an EV board from the first pass.

Prediction-market trade-to-sell is not the same as an upset pick. The spike model may only promote a pre-match scalp when there is a realistic exit target above entry. High-entry rows where the projected exit is at or below the buy price are pass rows, even if the underdog can win. A 40c-to-95c path is a win bet, not an arbitrage/scalp setup.

Before generating the value board, complete the sportsbook line pass. Open each FanDuel event URL stored in `data-private/reference/tennis/fanduel-lines-YYYY-MM-DD.json` and expand the primary `Moneyline`, `Game Handicap`, and `Total Match Games` sections. Store the page pull with timestamp/source in the same slate file:

```json
{
  "markets": {
    "moneyline": [{ "player": "Naomi Osaka", "odds": -118 }],
    "gameHandicap": [{ "player": "Naomi Osaka", "spread": -0.5, "odds": -118 }],
    "totalGames": [{ "side": "Over", "line": 22.5, "odds": -106 }]
  }
}
```

Do this before match start. FanDuel can remove spread/total sections or mark the event ended once the match is live or settled. If a market is unavailable, record the reason (`ended`, `not offered`, `blocked`, or `not mapped`) instead of leaving the field silently empty. Do not treat ML/spread/O-U EV as analysis-ready until this coverage is checked and the slate is regenerated.

## Derivative Market Prediction Pass

Every singles match needs a stored derivative-market prediction before publishing. Tennis is not ML-first: the winner model is one input, and the published detail page must lead with a betting decision matrix comparing ML value, game spread, O/U games, win-a-set probability, and first-set games. This is separate from prediction-market trade-to-sell. The output file is:

`data-private/predictions/tennis/YYYY-MM-DD-derivative-markets.json`

Each match row must include:

```json
{
  "date": "YYYY-MM-DD",
  "matchId": "rg-w-coco-gauff-anastasia-potapova-YYYY-MM-DD",
  "match": "Coco Gauff vs Anastasia Potapova",
  "expectedMatchGames": 19.8,
  "expectedFirstSetGames": 9.4,
  "totalGames": {
    "postedLine": 20.5,
    "overOdds": -120,
    "underOdds": -110,
    "lean": "Under",
    "edgeGames": -0.7,
    "confidence": 57,
    "grade": "thin",
    "reason": "Favorite control path plus opponent second-serve pressure keeps the median below the posted total."
  },
  "gameHandicap": {
    "selection": "Coco Gauff",
    "postedSpread": -4.5,
    "odds": -118,
    "projectedMarginGames": 5.2,
    "edgeGames": 0.7,
    "confidence": 55,
    "grade": "thin",
    "reason": "Break-pressure gap supports the favorite spread, but WTA volatility caps stake."
  },
  "firstSet": {
    "expectedGames": 9.4,
    "lean": "Under 9.5 if posted; pass at 9.0 or worse",
    "tiebreakRisk": 0.08,
    "earlyBreakRisk": 0.62,
    "confidence": 56
  },
  "writeup": {
    "headline": "Gauff control path, but spread is thin.",
    "betPlan": "Use Under 20.5 only as a small derivative lean; do not chase ML.",
    "whyItWorks": [
      "Potapova's low first-serve rate and error load give Gauff enough break paths to shorten the match.",
      "Gauff's return pressure can create a 6-3 or 6-4 first-set shape."
    ],
    "whyItFails": [
      "Gauff's own second-serve volatility can give breaks back.",
      "The 2-2 H2H history says this is not a clean domination profile."
    ],
    "entryExit": {
      "preMatch": "Under 20.5 only if price is playable; pass if it moves to 19.5.",
      "live": "If both players hold their first two service games comfortably, cancel the under lean."
    }
  },
  "evidence": [
    "Recent hold and second-serve scores",
    "Return-pressure edge",
    "Roland Garros replay hold/break flow",
    "H2H surface context",
    "FanDuel total and game handicap"
  ],
  "dataQuality": {
    "fanDuelTotalCaptured": true,
    "fanDuelSpreadCaptured": true,
    "warehouseRowsUsed": 8,
    "replayRowsUsed": 2,
    "status": "complete"
  }
}
```

## Required Tennis Value Books

Every time tennis predictions are updated, regenerate and publish these value books before deploy:

- **ML value book**: model probability, implied price, edge, EV/100, fee-adjusted note, and `bet/pass/watch` grade.
- **Match O/U games value book**: expected match games, posted total if available, over/under lean, edge in games, confidence, and EV/100 when odds exist.
- **1st-set O/U games value book**: expected first-set games, posted first-set total if available, early-break/tiebreak risk, confidence, and price-required fallback when the book does not post the market.
- **Kalshi trade-to-sell book**: buy cap, sell target, spike confidence, same-favorite/similar-entry history, tier (`trade`, `watch`, `pass`), and veto reason when blocked.

If there are no validated plays, still publish the book. The site should show the best available confidence-ranked rows, capped at the top 5 when there are 5 rows. A blank value section is a pipeline failure; a clear `no play / price required / pass` section is acceptable.

Pregame health treats these as required published artifacts. `npm run data:health:tennis -- --date YYYY-MM-DD --pregame` must pass `valueBooks` before deploy.

Decision rules:
- If model ML is basically fair versus implied price, mark ML as no edge even when the player is likely to win. Example: model 65.8% versus 66% implied is a pass on ML.
- If ML is fair/taxed, look for derivative value first: spread, total games, win-a-set, first-set total, or live set-win after the opponent wins early.
- Spread grading must use projected game margin versus posted handicap. Do not publish generic text like "spread needs the posted number" once the FanDuel event page has been captured.
- O/U grading must use expected match games and expected first-set games, not only winner confidence.
- Win-a-set probability must be visible for both players. It is especially important for best-of-five matches and for live hedge paths where the underdog wins early but the favorite remains likely to take a set.
- Each match detail must show both players' pressure stats near the decision matrix: hold %, break points saved %, and break points converted %. If the warehouse lacks direct hold %, derive it from expected first-serve-in, first-serve-won, and second-serve-won so the UI does not hide serve stability.
- Every match writeup must name the best market, not just the projected winner. "Pass" is acceptable only when all four price lanes fail.

Minimum modeling inputs:

- Current match winner probabilities from the ensemble, but never as the only input.
- Recent hold, second serve, error control, return pressure, and closeout scores for both players.
- Roland Garros replay flow: service games, hold rate, breaks lost, return games, breaks won, long-game rate, first-set shape where available.
- FanDuel `totalGames` and `gameHandicap` lines when offered.
- Men/Women and best-of-five/best-of-three adjustment.
- Clay form, opponent quality, H2H surface context, and current tournament fatigue.

Required health behavior:

- If `markets.totalGames` exists in the FanDuel file, the generated site row must not say `No direction` unless the derivative row explicitly grades it `pass` with a reason.
- If `markets.gameHandicap` exists, the generated site row must not say `No price`.
- If first-set expected games are missing, mark the match `data incomplete` for derivative markets and keep it off the value board.
- Health checks should fail when captured FanDuel totals/spreads are not joined into the generated match payload.

Display requirements:

- Match detail should show `Expected match games`, `Expected first-set games`, O/U lean, spread lean, posted line, projected edge in games, confidence, and the evidence list.
- Match detail should show the stored `writeup` block: headline, bet plan, why it works, why it fails, and entry/exit or pass rules.
- The board/value tab should show only derivative rows with positive edge and usable confidence; passes should stay visible in detail but not promoted as plays.

## Required Warehouse Checks

Each singles match needs:

- Current ranking snapshot from Live Tennis or fallback ranking warehouse.
- Clay record, recent record, recent opponent rank quality, and adjusted form.
- Recent service and return metrics: hold, second serve, error control, return pressure, closeout.
- Roland Garros replay flow where available: service games, holds, breaks lost, return games, breaks won, long-game rate.
- H2H with dates and surfaces, not just total count.
- FanDuel or sportsbook ML/spread/total from event pages, keyed as `moneyline`, `gameHandicap`, and `totalGames`.
- Stored derivative predictions for expected match games, first-set games, O/U, and game handicap.
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
npm run data:fetch:tennis-sofascore-slate -- --date YYYY-MM-DD
npm run data:import:tennis-sofascore
npm run data:fetch:tennis-weather -- --date YYYY-MM-DD
npm run data:import:tennis-results -- --date YYYY-MM-DD
npm run data:grade:tennis -- --date YYYY-MM-DD
npm run data:backtest:tennis-value -- --date YYYY-MM-DD
python3 pipeline/analyze_kalshi_tennis_intramatch.py --target-date YYYY-MM-DD
python3 pipeline/tennis_multimodel_backtest.py --target-date NEXT-YYYY-MM-DD
npm run data:health:tennis -- --date YYYY-MM-DD --settled
```

If a promoted lane loses badly in the settled value backtest, freeze that lane in the next slate until the gate is revised. Example: if `Bet-grade value` goes 0-for-2 or worse, do not publish blind ML value rows from that gate; force them into watch-only or derivative/PM-trade context until the next backtest shows recovery.

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

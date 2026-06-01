# Run Totals

Owns full-game, first-five, and late scoring-total projections after starter, bullpen, lineup, park, and weather context are joined.

Posted total source order:

- sportsbook total market from `game.odds.markets`
- lineup/weather context total from `game.lineupBoard.marketWeatherContext.total`

If both are missing, the lane must stay `No market`.

## Chaos Gate

The raw total is not enough for MLB. After `projected runs - line`, totals must survive a chaos gate before they are allowed onto the value board.

The gate downgrades or vetoes:

- unders exposed to mistake-chaos, one-bad-inning risk, run clustering, warm carry, wind out, or high-traffic offensive shape
- overs exposed to quiet-first-five rates, traffic without conversion, dead-bat traffic, low conversion floors, wind in, or suppressing weather

Each total lean stores a `chaosGate` object with the score, notes, metrics, and veto reason. UI rows should hide vetoed totals and show the warning when a total survives but is still chaos-sensitive.

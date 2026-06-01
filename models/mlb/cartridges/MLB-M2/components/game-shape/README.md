# Game Shape Reality Gap

MLB-M2 adds this component because M0 can produce a confident side while the actual game shape is less stable than the side score implies.

This layer does not replace the winner model. It asks four separate questions:

- Do the full-game, first-five, late, and bridge phase edges point to the same team?
- Is the game exposed to crooked-inning chaos, warm carry, bullpen mistakes, or run clustering?
- Is the game exposed to dead-early traffic, quiet first five innings, or poor conversion?
- Does the random-forest research baseline add a useful nonlinear check, especially for totals?

The output lives at `analysis.gameShape`, `analysis.indicators.gameShape`, and `analysis.mlbProjection.gameShape`.

## Category Contract

M2 now returns a concrete `category` object instead of a vague warning flag.

The current category set is:

- Clean phase stack
- Early-pressure side
- Starter-to-bullpen flip
- Late-rescue side
- Dead-zone side
- Favorite conversion trap
- Crooked-inning game
- Starter-duel under
- Underdog pressure lane
- Weather-carry chaos
- Balanced traffic game

Each category must name:

- `bestExpression`: the preferred market lane, such as full-game side, first five, total, first inning, prediction-market spike, or live-only.
- `laneMap`: side, first-five, total, first-inning, and live interpretation.
- `inningMap`: expected shape for innings 1-2, 3-5, 6-7, and 8-9.
- `diagnostics`: phase ownership, conversion gaps, opponent chaos gap, and projected hit edge.

## Shape Radar Contract

The radar is the visual version of game shape. It is not a confidence chart and it is not a single-team power rating.

Every axis is scored from `0` to `100`. A higher number means there is more of that shape in the game, not that the bet is better.

M2 exports the radar at `analysis.gameShape.radar`.

The six-axis radar is only the compressed display layer. It should be treated like a projection of a larger game-state vector, not the full feature space. Future M2/M3 work can add dozens or hundreds of raw dimensions underneath this display without changing the public chart contract.

Vector layers:

- `game vector`: environment and matchup state for the whole game.
- `team-game vector`: one independent radar/profile row per team per game.
- `player-game vector`: starter, reliever, hitter, and lineup-slot state for that date.
- `inning-state vector`: expected first-cycle, 3-5, bridge, and late-game shape.
- `market vector`: moneyline, F5, total, YRFI/NRFI, prop, and prediction-market state.

The visible radar should summarize the most useful dimensions. The warehouse should keep the fuller vector so future model branches can discover better axes.

## Phase-Specific Vector Contract

A baseball game is not one radar. M2 should treat it as multiple phase vectors:

- `first-cycle vector`: top-order pressure, starter early-crack risk, first-batter reach, first-inning scoring shape.
- `starter-window/F5 vector`: traffic, conversion, command leak, collapse attack, dead-bat fork, power fork.
- `bridge vector`: first bullpen bridge, inherited traffic, reliever command, bullpen meltdown and HR appearance risk.
- `late vector`: late bullpen, comeback/snapback state, leverage pressure, and late-contact tail.
- `outfield/error-tail vector`: hard contact, park/carry, sun-position visibility, outfield mistake exposure, and defensive run leak.

Each phase must be head-to-head: offensive state x opposing starter, opposing bullpen, opposing defense, park/environment, and market state. Do not score an offense in isolation and then paste the same number into every matchup.

Calculation rules:

- Do not use raw trailing averages as the state.
- Use medians, trimmed means, capped decays, and tail-event rates.
- A 15-run game should mostly update tail vectors such as `highRunRate`, `stateShock`, `powerFork`, and `outfieldChaosPressure`; it should not turn the next game into a naive 9-run baseline.
- Store suppressor signals separately from boost signals. A large separation can mean "dead F5 but bridge later," not "bet over."

## Expanded Vector Candidates

`Chaos` must not stay a single opaque number. The current research split is:

- `pitcherCollapseRisk`: opponent starter collapse risk from season line, recent starts, short starts, leash, walks, HRs, and runs allowed.
- `starterEarlyCrack`: opponent starter first-cycle crack risk from first-batter reach, first-inning runs/walks, early baserunners, and recent first-inning damage.
- `pitcherCommandLeak`: opponent starter traffic leak from WHIP, walk rate, recent walks/hits, first-batter reach, and short leash.
- `batterFireRate`: team top-order/contact fire from top-six heat, xwOBA trend, hard-hit/sweet-spot trend, barrel rate, and hot hitter state.
- `trafficPressure`: baserunner pressure from total/early baserunners, top-order baserunners, walks, conversion, and first-inning scoring.
- `conversionVolatility`: whether traffic can swing wildly, using conversion volatility, runs per baserunner, stranded traffic, and no-conversion pockets.
- `deadBatRisk`: dead-offense shape from quiet F5, scoreless first three, dead traffic, no-conversion, cold, whiff, and strikeout profile.
- `defensiveRunLeak`: opponent run-prevention leak from one-bad-inning, early multi-run allowed, mistake chaos, run clustering, and stranded traffic.
- `bridgeLeak`: opponent bullpen/bridge leak from bullpen chaos, meltdowns, first-batter reach, inherited scoring, HR appearances, and command risk.
- `carryBoost`: contact carry help from weather, park, sun visibility, barrel/hard-hit context.
- `mentalityPressure`: state pressure from snapback, form, heat regression, recent losses, streak context, and pressure hitter.
- `marketTension`: volatility, reality gap, market contradiction, edge/confidence tension, and totals vetoes.

Game-level invented dimensions:

- `starterPairCollapse`
- `earlyJolt`
- `trafficFork`
- `powerWeatherTail`
- `bridgeChaos`
- `deadZone`
- `asymmetry`
- `marketRealityGap`

These are research names, not permanent UI labels. Promote only dimensions that survive walk-forward checks and settlement.

Current axes:

- `Pressure`: run creation pressure from lineup conversion, top-order pressure, starter-window support, and hit-edge pressure.
- `Chaos`: crooked-inning volatility from mistake chaos, run clustering, one-bad-inning risk, bullpen mistakes, carry, and visibility.
- `Freeze`: dead-offense risk from quiet first five, scoreless first three, dead traffic, and traffic without conversion.
- `Air`: contact carry / outfield-event risk from weather carry, sun visibility, hard air contact, and extra-base tail.
- `Bridge`: late-inning volatility from bullpen flip, reliever command risk, and middle-relief mistake exposure.
- `Flow`: phase agreement from full game, first five, late, and bridge reads.

The exported shape is:

```json
{
  "version": "MLB-M2-game-shape-radar-v1",
  "scale": {
    "min": 0,
    "max": 100,
    "highMeans": "More of the named shape, not automatically better."
  },
  "axes": [
    {
      "id": "pressure",
      "label": "Pressure",
      "gameScore": 68.4,
      "pickScore": 71.2,
      "opponentScore": 44.8,
      "read": "Run creation pressure: lineup conversion, top-order pressure, starter-window support, and hit-edge pressure."
    }
  ],
  "profiles": [
    {
      "role": "pick",
      "team": "Yankees",
      "scores": {
        "pressure": 71.2,
        "chaos": 67.4,
        "freeze": 58.9,
        "air": 72.1,
        "bridge": 28.4,
        "flow": 100
      },
      "polygon": [71.2, 67.4, 58.9, 72.1, 28.4, 100]
    }
  ],
  "gameProfile": {
    "label": "Weather-carry chaos",
    "bestExpression": "Totals / HR cluster before side",
    "polygon": [71.2, 76.4, 70.2, 78.1, 26.1, 100],
    "dominantAxes": [
      { "id": "air", "label": "Air", "score": 78.1 },
      { "id": "chaos", "label": "Chaos", "score": 76.4 }
    ]
  }
}
```

UI rule:

- Draw `gameProfile.polygon` as the environment layer.
- Draw `profiles[0]` and `profiles[1]` as team overlays.
- Always show the top `dominantAxes` next to the recommended market lane so users know why the chart matters.
- Do not display this as "win confidence." The radar describes shape; the market lane decides how to bet it.

## Current RF Rule

The RF research layer is a lens, not an automatic pick engine.

- Totals RF history is the only lane marked deployable from the research notes.
- Moneyline, first-five, and first-inning RF history can flag disagreement, but cannot promote a bet by themselves.
- M2 must report RF impact separately so we can measure whether the RF view actually improves decisions.

## M2 Gate

If reality-gap score is high, the site should stop treating the moneyline as a complete answer. It should force the model to explain which market expression fits the game shape: full-game ML, first five, total, first inning, prop, prediction-market spike, live-only, or no pregame ML.

## Current Backtest Artifact

Run:

```bash
python3 models/mlb/cartridges/MLB-M2/research/game_shape_backtest.py --start 2026-05-10 --end 2026-05-31
```

Current draft result:

- Baseline full-game side: 59.0% on 212 rows.
- M2 allowed-side bucket: 67.5% on 40 rows.
- M2 category lane hit: 62.6% on 195 graded lane rows.
- Starter-to-bullpen flip: F5 lane hit 68.6% on 35 rows.
- Dead-zone side: F5/timing lane hit 70.6% on 17 rows.

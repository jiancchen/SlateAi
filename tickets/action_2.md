# Action 2: Modeling Roadmap From First-5 To Home Runs

## Objective

Move from a handcrafted analysis board to a trainable tabular modeling system with a clear priority order:

1. `Reliable first 5 winner`
2. `Reliable spread / run-line read`
3. `Reliable moneyline read`
4. `Home-run model`

## Modeling Order

### Phase A: First 5 Winner

This is the cleanest first target because it is the most starter-driven and least contaminated by bullpen chaos.

#### Inputs

- starter rolling form
- team first-5 offense and defense form
- recent hit efficiency
- recent run volatility
- recent home-run burstiness
- handedness / starter profile
- park/day context
- lineup confirmation once available

#### Output

- win probability for away/home through five innings
- expected first-5 run differential

### Phase B: Spread / Run Line

Once first-5 is stable, add full-game shape:

- bullpen runs allowed
- bullpen usage / fatigue
- full-game offense depth
- late-game volatility
- market spread lines

### Phase C: Moneyline

Moneyline comes after spread because spread-cover and total-shape features usually force us to confront full-game variance honestly.

### Phase D: Home Runs

Home runs are last because they are lower-frequency and more feature-sensitive.

#### Additional inputs

- hitter-level Statcast power
- recent HR streak / bunching state
- pitcher HR susceptibility
- confirmed batting order
- park/day carry environment
- HR prop market if available

## Sanitization Work Still Needed

- stable team aliases across sources
- stable player IDs across sources
- missing/TBD starter handling
- late lineup changes
- opener / bulk pitcher edge cases
- inconsistent innings formats
- conflicting source values for the same game

## Immediate Engineering Tasks

1. Backfill more historical MLB dates into the warehouse.
2. Build training-table exports for:
   - team/date/game first-5 features
   - team/date/game full-game features
   - pitcher/date rolling features
3. Add lineup, weather, and bullpen usage tables.
4. Add market snapshot ingestion.
5. Train a baseline tabular model:
   - logistic regression first
   - gradient boosting second
6. Compare model probabilities against market-implied odds and our current heuristic board.

## Definition Of Done For This Phase

- We can score first-5, spread, and moneyline on a historical sample without re-reading raw feeds.
- We can explain misses using stored features instead of ad hoc reasoning.
- We can generate a reproducible training dataset from the local warehouse.

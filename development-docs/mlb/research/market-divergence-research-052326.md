# MLB Market Divergence Research — May 23, 2026

## Goal

Treat the betting line like the market anchor and figure out **when our deterministic board is allowed to disagree with it**.

This is not asking “who wins more often.” It is asking:

- where does the board beat price instead of just agreeing with expensive favorites?
- which favorite buckets are actually worth paying for?
- where should disagreement with the market require extra evidence?

## Overall Moneyline Snapshot

| Split | Picks | Hit rate | Flat-unit ROI |
| --- | --- | --- | --- |
| Reserve (05-10 to 05-15) | 75 | 0.653 | 0.202 |
| Current (05-16 to 05-22) | 93 | 0.581 | 0.062 |
| Combined | 168 | 0.613 | 0.124 |

## Price Buckets

### Reserve (05-10 to 05-15)

| Market price bucket | Picks | Hit rate | Flat-unit ROI |
| --- | --- | --- | --- |
| <45% | 6 | 0.833 | 0.95 |
| 45-49.9% | 13 | 0.615 | 0.286 |
| 50-54.9% | 17 | 0.588 | 0.11 |
| 55-59.9% | 20 | 0.7 | 0.226 |
| 60-64.9% | 14 | 0.571 | -0.083 |
| 65%+ | 5 | 0.8 | 0.095 |

### Current (05-16 to 05-22)

| Market price bucket | Picks | Hit rate | Flat-unit ROI |
| --- | --- | --- | --- |
| <45% | 6 | 1.0 | 1.332 |
| 45-49.9% | 10 | 0.4 | -0.144 |
| 50-54.9% | 30 | 0.6 | 0.077 |
| 55-59.9% | 29 | 0.552 | -0.036 |
| 60-64.9% | 16 | 0.5 | -0.194 |
| 65%+ | 2 | 1.0 | 0.513 |

### Combined

| Market price bucket | Picks | Hit rate | Flat-unit ROI |
| --- | --- | --- | --- |
| <45% | 12 | 0.917 | 1.141 |
| 45-49.9% | 23 | 0.522 | 0.099 |
| 50-54.9% | 47 | 0.596 | 0.089 |
| 55-59.9% | 49 | 0.612 | 0.071 |
| 60-64.9% | 30 | 0.533 | -0.142 |
| 65%+ | 7 | 0.857 | 0.214 |

## Candidate Market Lanes

| Lane | Reserve n | Reserve hit | Reserve ROI | Current n | Current hit | Current ROI | Combined n | Combined hit | Combined ROI |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Moderate favorite clean | 19 | 0.632 | 0.097 | 28 | 0.607 | 0.059 | 47 | 0.617 | 0.075 |
| Heavy favorite danger | 4 | 0.75 | 0.101 | 4 | 0.5 | -0.244 | 8 | 0.625 | -0.071 |
| Market underdog bets | 23 | 0.652 | 0.403 | 22 | 0.591 | 0.297 | 45 | 0.622 | 0.351 |
| 70+ confidence | 8 | 0.625 | -0.036 | 9 | 0.667 | 0.119 | 17 | 0.647 | 0.046 |
| 70+ confidence market dogs | 0 | 0.0 | n/a | 0 | 0.0 | n/a | 0 | 0.0 | n/a |

## High-Confidence Context

`70+` confidence combined:
- picks: `17`
- hit rate: `0.647`
- flat-unit ROI: `0.046`

## Read

- The market should be treated as the baseline, not something we casually overrule.
- Heavy favorites can still produce decent hit rates while being weak or negative in flat-unit ROI terms.
- Moderate favorite ranges are more likely to be playable when the state/risk layer is clean.
- Market underdog picks need stricter promotion rules than simple composite agreement.
- The correct future model is probably a **disagreement budget**, not a raw “bigger edge means better bet” rule.

## Draft Disagreement Budget

1. If the pick is a heavy market favorite (`65%+` implied), require clean state/risk support before allowing a large edge.
2. If the pick is a moderate favorite (`54-63%` implied), allow modest disagreement when Tier 1 / snapback risk are clean.
3. If the pick is a market underdog, require stronger evidence than current broad composite agreement before calling it a core edge.
4. Use hit rate **and** flat-unit ROI together. A high win rate that loses to price is not an edge.
5. This budget should be separate by market type:
   - full game
   - first five
   - first inning later

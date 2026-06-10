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
| Current (05-16 to 05-22) | 93 | 0.613 | 0.148 |
| Combined | 168 | 0.631 | 0.172 |

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
| <45% | 8 | 0.875 | 1.087 |
| 45-49.9% | 10 | 0.5 | 0.066 |
| 50-54.9% | 28 | 0.679 | 0.287 |
| 55-59.9% | 29 | 0.552 | -0.036 |
| 60-64.9% | 15 | 0.533 | -0.14 |
| 65%+ | 1 | 1.0 | 0.515 |

### Combined

| Market price bucket | Picks | Hit rate | Flat-unit ROI |
| --- | --- | --- | --- |
| <45% | 14 | 0.857 | 1.029 |
| 45-49.9% | 23 | 0.565 | 0.19 |
| 50-54.9% | 45 | 0.644 | 0.22 |
| 55-59.9% | 49 | 0.612 | 0.071 |
| 60-64.9% | 29 | 0.552 | -0.113 |
| 65%+ | 6 | 0.833 | 0.165 |

## Candidate Market Lanes

| Lane | Reserve n | Reserve hit | Reserve ROI | Current n | Current hit | Current ROI | Combined n | Combined hit | Combined ROI |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Moderate favorite clean | 19 | 0.632 | 0.097 | 19 | 0.684 | 0.192 | 38 | 0.658 | 0.145 |
| Heavy favorite danger | 4 | 0.75 | 0.101 | 0 | 0.0 | n/a | 4 | 0.75 | 0.101 |
| Market underdog bets | 23 | 0.652 | 0.403 | 24 | 0.667 | 0.473 | 47 | 0.66 | 0.438 |
| 70+ confidence | 8 | 0.625 | -0.036 | 5 | 0.6 | 0.005 | 13 | 0.615 | -0.02 |
| 70+ confidence market dogs | 0 | 0.0 | n/a | 0 | 0.0 | n/a | 0 | 0.0 | n/a |

## High-Confidence Context

`70+` confidence combined:
- picks: `13`
- hit rate: `0.615`
- flat-unit ROI: `-0.02`

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

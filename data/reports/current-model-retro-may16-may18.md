# Current Model Retro Run: May 16-18, 2026

## Scope

This report reruns the **current** MLB side and home-run model stack against the stored slates for:

- May 16, 2026
- May 17, 2026
- May 18, 2026

It is a true retro run in the sense that the historical day files recompute through the current `sports-model.js` logic, not just the originally saved labels.

Important caveats:

- The replay still depends on the historical daily source artifacts we stored for those dates.
- Some May 18 projected-lineup fallback data was noisy, so that day remains the least trustworthy lineup environment in the sample.
- This is MLB-only. WNBA/NBA were not included in this retro report.

## Side Picks

### Overall

- Full game: `22-22` (`0.500`)
- First 5: `20-24` (`0.455`)
- Bullpen-flip losses: `3`
- Starter-rescue wins: `5`
- High-volatility games: `33 of 44`

### By day

| Date | Games | Full game | First 5 | Bullpen flips | Starter rescues | High-vol games |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2026-05-16 | 15 | 6-9 | 8-7 | 3 | 1 | 10 |
| 2026-05-17 | 15 | 9-6 | 7-8 | 0 | 2 | 10 |
| 2026-05-18 | 14 | 7-7 | 5-9 | 0 | 2 | 13 |

### What stands out

- May 16 was poor on cleaner-looking spots, not just chaos.
- May 17 was the best side day of the three.
- May 18 was exactly the kind of board we should have been more selective on: `13 of 14` picks were high-volatility games.

### Most damaging misses

- `Padres @ Mariners` on May 16: model went hard to Seattle in a lower-volatility spot and got beat cleanly.
- `Marlins @ Rays` on May 16: first 5 right, full game wrong, real bullpen-flip loss.
- `Red Sox @ Braves` on May 16: another bullpen-flip loss.
- `Giants @ Diamondbacks` on May 18: model still overstated the Giants case in a very high-volatility game.
- `Dodgers @ Padres` on May 18: classic favorite trap that should not have looked core-worthy.
- `Athletics @ Angels`, `Brewers @ Cubs`, and `Rangers @ Rockies` on May 18: all shaky favorite-style plays that should have been demoted.

## Hit / Traffic Projection Accuracy

These numbers matter because the side model leans heavily on projected traffic and hit-shape logic.

### Overall

- Full-game hit-edge accuracy: `0.590`
- First-5 hit-edge accuracy: `0.472`
- Team hit MAE: `2.737`
- Full-game hit-edge MAE: `3.698`
- Full-game hit-efficiency MAE: `6.384` percentage points
- First-5 hit-efficiency MAE: `8.150` percentage points

### By day

| Date | Full-edge acc. | First-5 edge acc. | Team hit MAE | Full-eff MAE | First-5 eff MAE |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2026-05-16 | 0.500 | 0.545 | 2.360 | 5.861 | 7.164 |
| 2026-05-17 | 0.500 | 0.357 | 2.617 | 6.224 | 6.849 |
| 2026-05-18 | 0.769 | 0.545 | 3.271 | 7.116 | 10.601 |

### Read on those numbers

- The model is better at describing **which team should generate more contact pressure** than it is at converting that into reliable first-5 or full-game sides.
- May 18 is the clearest warning: full-game hit-edge direction looked decent on paper, but the per-team error and first-5 efficiency error were ugly.
- That is another sign that the model can still create a believable traffic story without actually owning the real game script.

## Home Run Board

### Overall

- Hits: `9 of 37` tracked picks (`0.243`)

### By day

| Date | Tracked | Hits | Hit rate |
| --- | ---: | ---: | ---: |
| 2026-05-16 | 12 | 6 | 0.500 |
| 2026-05-17 | 12 | 3 | 0.250 |
| 2026-05-18 | 13 | 0 | 0.000 |

### Home-run hits by date

#### May 16

- Bryce Harper
- Colson Montgomery
- Drake Baldwin
- Gavin Sheets
- Miguel Vargas
- Yordan Alvarez

#### May 17

- Ben Rice
- Bryce Harper
- Junior Caminero

#### May 18

- None

### Read on the HR board

- The current HR board can still have a usable day, as May 16 showed.
- It is nowhere near stable enough to trust as a standalone edge layer.
- May 18 remains the clearest failure case: `0-for-13` even though the slate produced plenty of actual home runs.

## What the current model is still getting wrong

### 1. It overstates playable edges on messy baseball boards

The model still finds too many reasons to lean into games that should be tagged as:

- watchlist only
- flip-risk only
- lineup-pending only

This is especially true when:

- volatility is already high
- lineup quality is still partial/projected
- a favorite has a weak sustain story
- the game is being carried by starter shape more than team shape

### 2. It is better at traffic than conversion

The hit model can tell a believable story about contact pressure, but that is not the same as:

- sustained offense
- run conversion
- late scoring control
- full-game winner control

### 3. The HR model still solves the wrong problem too often

The board is still too focused on:

- star bats
- season power
- recent HR count

It is not yet strong enough on:

- full-lineup scoring distribution
- latent power without recent HR conversion
- secondary bats in team-wave games
- distinguishing `good hitter today` from `good HR bet today`

### 4. The story layer is still too thin

The current model still needs deeper team-shape signals like:

- offense sustain vs one-day spikes
- lineup-wave continuity
- unreliable-favorite tags that are driven by actual team behavior, not just market shape
- article-driven context on call-ups, approach changes, and role shifts

## What improved

- The side model is no longer blindly tied to flat starter ERA and market price.
- The HR model is less naive than the original star-name bomb board.
- The current system does catch some real second-order names now, like `Colson Montgomery`, `Drake Baldwin`, `Miguel Vargas`, and `Ben Rice`.

## What still needs revision immediately

1. Harder demotion of high-volatility MLB sides from core recommendations.
2. Stronger decay on one-day carryover bats.
3. More lineup-wave and secondary-bat logic in the HR/prop builder.
4. Better projected-lineup hygiene when official MLB lineups are sparse.
5. More explicit `do not trust this edge yet` tagging in the UI.

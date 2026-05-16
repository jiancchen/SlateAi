# MLB Side Backtest Report: board-moneyline-v2

- Training window: `2026-05-10` to `2026-05-12`
- Verification window: `2026-05-13` to `2026-05-15`

## Summary

- Training full-game hit rate: `0.639` on `36` games
- Training first-5 hit rate: `0.556`
- Training bullpen-flip losses: `2`
- Verification full-game hit rate: `0.59` on `39` games
- Verification first-5 hit rate: `0.564`
- Verification bullpen-flip losses: `5`

## Failure Signals

- Thin-edge misses in training: `7`
- Thin-edge misses in verification: `9`
- High-volatility misses in training: `7`
- High-volatility misses in verification: `7`
- Hit-edge-against-pick misses in training: `4`
- Hit-edge-against-pick misses in verification: `3`
- Avg relief-pitching risk in training: `53.8`
- Avg relief-pitching risk in verification: `55.8`

## Hit Projection Accuracy

- Training projection-ready games: `21`
- Training full-game hit-edge accuracy: `0.526`
- Training first-5 hit-edge accuracy: `0.625`
- Training team-hit MAE: `2.721`
- Training full-game hit-efficiency MAE: `6.556`
- Verification projection-ready games: `39`
- Verification full-game hit-edge accuracy: `0.364`
- Verification first-5 hit-edge accuracy: `0.419`
- Verification team-hit MAE: `2.862`
- Verification full-game hit-efficiency MAE: `7.602`
- First-five hit efficiency is not graded yet because the warehouse does not store first-five at-bats separately.

## Starter-Led Verification Reads

- Verification games with `model edge >= 5` and `volatility < 80`: `13`
- Those games full-game hit rate: `0.462`
- Those games first-5 hit rate: `0.692`

## F5 Versus Full-Game Split

- Verification games flagged as `starter edge > late hold` profiles: `16`
- Those games full-game hit rate: `0.375`
- Those games first-5 hit rate: `0.375`

## Verification Misses

- `2026-05-13` Tigers @ Mets: picked `Detroit Tigers` but got `New York Mets`. F5 `2-1`, final `2-3`, bullpen `0-2`, starter leverage `61.4`, late stability `37.2`, relief risk `63.0`, coinflip pressure `49.0`.
- `2026-05-15` Phillies @ Pirates: picked `Pittsburgh Pirates` but got `Philadelphia Phillies`. F5 `7-3`, final `9-11`, bullpen `2-8`, starter leverage `92.5`, late stability `44.6`, relief risk `61.1`, coinflip pressure `35.0`.
- `2026-05-15` Blue Jays @ Tigers: picked `Toronto Blue Jays` but got `Detroit Tigers`. F5 `2-1`, final `2-3`, bullpen `0-2`, starter leverage `49.1`, late stability `45.1`, relief risk `57.0`, coinflip pressure `55.0`.
- `2026-05-13` Padres @ Brewers: picked `Milwaukee Brewers` but got `San Diego Padres`. F5 `1-0`, final `1-3`, bullpen `0-3`, starter leverage `67.0`, late stability `47.4`, relief risk `47.4`, coinflip pressure `28.0`.
- `2026-05-13` Mariners @ Astros: picked `Seattle Mariners` but got `Houston Astros`. F5 `1-0`, final `3-4`, bullpen `2-4`, starter leverage `81.3`, late stability `76.6`, relief risk `45.0`, coinflip pressure `18.0`.
- `2026-05-14` Mariners @ Astros: picked `Houston Astros` but got `Seattle Mariners`. F5 `1-5`, final `3-8`, bullpen `2-3`, starter leverage `76.3`, late stability `6.5`, relief risk `95.0`, coinflip pressure `63.0`.
- `2026-05-14` Royals @ White Sox: picked `Kansas City Royals` but got `Chicago White Sox`. F5 `1-5`, final `2-6`, bullpen `1-1`, starter leverage `88.1`, late stability `38.4`, relief risk `63.5`, coinflip pressure `57.0`.
- `2026-05-13` Royals @ White Sox: picked `Kansas City Royals` but got `Chicago White Sox`. F5 `3-5`, final `5-6`, bullpen `2-1`, starter leverage `67.4`, late stability `35.6`, relief risk `62.8`, coinflip pressure `56.0`.
- `2026-05-15` Orioles @ Nationals: picked `Baltimore Orioles` but got `Washington Nationals`. F5 `0-1`, final `2-3`, bullpen `2-2`, starter leverage `52.6`, late stability `50.1`, relief risk `62.0`, coinflip pressure `56.0`.
- `2026-05-14` Nationals @ Reds: picked `Washington Nationals` but got `Cincinnati Reds`. F5 `0-9`, final `1-15`, bullpen `1-6`, starter leverage `68.9`, late stability `38.4`, relief risk `59.0`, coinflip pressure `62.0`.
- `2026-05-13` Rockies @ Pirates: picked `Pittsburgh Pirates` but got `Colorado Rockies`. F5 `3-6`, final `4-10`, bullpen `1-4`, starter leverage `99.0`, late stability `49.7`, relief risk `53.3`, coinflip pressure `28.0`.
- `2026-05-15` Diamondbacks @ Rockies: picked `Colorado Rockies` but got `Arizona Diamondbacks`. F5 `1-7`, final `1-9`, bullpen `0-2`, starter leverage `86.0`, late stability `55.5`, relief risk `48.0`, coinflip pressure `46.0`.

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
- High-volatility misses in training: `4`
- High-volatility misses in verification: `7`
- Hit-edge-against-pick misses in training: `4`
- Hit-edge-against-pick misses in verification: `3`
- Avg relief-pitching risk in training: `46.2`
- Avg relief-pitching risk in verification: `51.6`

## Starter-Led Verification Reads

- Verification games with `model edge >= 5` and `volatility < 80`: `12`
- Those games full-game hit rate: `0.5`
- Those games first-5 hit rate: `0.75`

## F5 Versus Full-Game Split

- Verification games flagged as `starter edge > late hold` profiles: `9`
- Those games full-game hit rate: `0.444`
- Those games first-5 hit rate: `0.333`

## Verification Misses

- `2026-05-15` Blue Jays @ Tigers: picked `Toronto Blue Jays` but got `Detroit Tigers`. F5 `2-1`, final `2-3`, bullpen `0-2`, starter leverage `53.6`, late stability `54.9`, relief risk `52.3`, coinflip pressure `44.5`.
- `2026-05-13` Tigers @ Mets: picked `Detroit Tigers` but got `New York Mets`. F5 `2-1`, final `2-3`, bullpen `0-2`, starter leverage `53.0`, late stability `37.8`, relief risk `51.6`, coinflip pressure `25.0`.
- `2026-05-15` Phillies @ Pirates: picked `Pittsburgh Pirates` but got `Philadelphia Phillies`. F5 `7-3`, final `9-11`, bullpen `2-8`, starter leverage `81.1`, late stability `44.8`, relief risk `42.5`, coinflip pressure `0.0`.
- `2026-05-13` Padres @ Brewers: picked `Milwaukee Brewers` but got `San Diego Padres`. F5 `1-0`, final `1-3`, bullpen `0-3`, starter leverage `55.4`, late stability `47.5`, relief risk `38.6`, coinflip pressure `0.0`.
- `2026-05-13` Mariners @ Astros: picked `Seattle Mariners` but got `Houston Astros`. F5 `1-0`, final `3-4`, bullpen `2-4`, starter leverage `54.8`, late stability `75.6`, relief risk `35.0`, coinflip pressure `5.0`.
- `2026-05-14` Mariners @ Astros: picked `Houston Astros` but got `Seattle Mariners`. F5 `1-5`, final `3-8`, bullpen `2-3`, starter leverage `68.5`, late stability `8.7`, relief risk `96.9`, coinflip pressure `56.5`.
- `2026-05-15` Reds @ Guardians: picked `Cleveland Guardians` but got `Cincinnati Reds`. F5 `0-3`, final `6-7`, bullpen `6-4`, starter leverage `43.4`, late stability `50.7`, relief risk `71.3`, coinflip pressure `83.5`.
- `2026-05-14` Nationals @ Reds: picked `Washington Nationals` but got `Cincinnati Reds`. F5 `0-9`, final `1-15`, bullpen `1-6`, starter leverage `57.0`, late stability `39.4`, relief risk `61.6`, coinflip pressure `69.5`.
- `2026-05-15` Orioles @ Nationals: picked `Baltimore Orioles` but got `Washington Nationals`. F5 `0-1`, final `2-3`, bullpen `2-2`, starter leverage `59.1`, late stability `56.4`, relief risk `55.1`, coinflip pressure `47.5`.
- `2026-05-13` Royals @ White Sox: picked `Kansas City Royals` but got `Chicago White Sox`. F5 `3-5`, final `5-6`, bullpen `2-1`, starter leverage `52.4`, late stability `35.5`, relief risk `53.9`, coinflip pressure `45.5`.
- `2026-05-15` Diamondbacks @ Rockies: picked `Colorado Rockies` but got `Arizona Diamondbacks`. F5 `1-7`, final `1-9`, bullpen `0-2`, starter leverage `70.1`, late stability `55.9`, relief risk `48.4`, coinflip pressure `36.5`.
- `2026-05-14` Royals @ White Sox: picked `Kansas City Royals` but got `Chicago White Sox`. F5 `1-5`, final `2-6`, bullpen `1-1`, starter leverage `75.4`, late stability `38.6`, relief risk `43.2`, coinflip pressure `20.0`.

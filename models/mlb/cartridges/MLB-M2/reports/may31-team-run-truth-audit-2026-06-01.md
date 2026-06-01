# MLB-M2 May 31 Team Run Truth Audit

This audit treats May 31 as a correctness problem, not an error-minimization problem. The questions are: did we identify which teams would score, which teams would die, and which teams had explosion paths?

## Correctness Summary

- Team rows: 30
- 3+ run classifier: 19/30 (63.3%)
- Explosion classifier: 17/30 (56.7%)
- Dead-offense classifier: 20/30 (66.7%)
- Actual explosion teams: 9
- Actual dead teams: 13

Miss classes:

- close enough: 16
- projected runs but contact died: 2
- missed explosion signal: 8
- projected runs but traffic stranded: 1
- under-projected scoring: 2
- over-projected scoring: 1

## Biggest Team-Level Misses

| Game | Team | Proj R | Actual R | Miss | Projection | Outcome | Miss class | Pregame trend flags | Hard-hit | Traffic conv |
| --- | --- | ---: | ---: | ---: | --- | --- | --- | --- | ---: | ---: |
Yankees @ Athletics | Yankees | 2.6 | 13 | 10.4 | expected scored | explosion | missed explosion signal | run cluster 79.1; quiet F5 71%; xwOBA up 0.1; run diff L5 +5.2; game over-tail | 33% | 87%
Giants @ Rockies | Giants | 3.4 | 11 | 7.6 | expected explosion/scoring | explosion | under-projected scoring | mistake chaos 69.2; one-bad 75%; xwOBA up 0.1; game over-tail | 50% | 61%
Twins @ Pirates | Pirates | 2.7 | 9 | 6.3 | expected scored | explosion | missed explosion signal | run cluster 78.6; quiet F5 50%; dead traffic 38% | 33% | 69%
Royals @ Rangers | Rangers | 1.4 | 6 | 4.6 | expected dead | explosion | missed explosion signal | run cluster 75.4; game over-tail | 29% | 50%
Blue Jays @ Orioles | Orioles | 1.7 | 6 | 4.3 | expected dead | explosion | missed explosion signal | run cluster 78.5; quiet F5 50%; game fork | 22% | 67%
Marlins @ Mets | Mets | 1.3 | 5 | 3.7 | expected dead | explosion | missed explosion signal | game over-tail | 60% | 63%
Phillies @ Dodgers | Dodgers | 2.8 | 6 | 3.2 | expected scored | explosion | missed explosion signal | run cluster 80.5; run diff L5 +3; game over-tail | 45% | 50%
Blue Jays @ Orioles | Blue Jays | 2.9 | 0 | -2.9 | expected scored | dead | projected runs but contact died | quiet F5 88%; dead traffic 50%; low conversion 7.3; game fork | 21% | 0%
Red Sox @ Guardians | Guardians | 1.3 | 4 | 2.7 | expected dead | scored | under-projected scoring | quiet F5 50%; dead traffic 38%; no-conv 25%; low conversion 3.1; game fork | 42% | 36%
Diamondbacks @ Mariners | Mariners | 3.5 | 1 | -2.5 | expected explosion/scoring | dead | projected runs but traffic stranded | xwOBA up 0.1; run diff L5 +4.6; unsupported game over | 26% | 10%
Tigers @ White Sox | White Sox | 2.5 | 0 | -2.5 | expected low | dead | projected runs but contact died | run cluster 77.9; run diff L5 +4.4; game fork | 21% | 0%
Padres @ Nationals | Padres | 2.3 | 0 | -2.3 | expected low | dead | over-projected scoring | dead traffic 38%; low conversion 12.5; unsupported game over | 23% | 0%

## All Team Rows

| Game | Team | Proj R | Actual R | Miss | Actual 3+ | Explosion | Dead | Miss class | Pregame trend flags |
| --- | --- | ---: | ---: | ---: | --- | --- | --- | --- | --- |
Angels @ Rays | Angels | 1.5 | 1 | -0.5 | 0-2 |  | dead | close enough | game fork
Angels @ Rays | Rays | 3.2 | 3 | -0.2 | 3+ |  |  | close enough | mistake chaos 77.9; one-bad 71%; quiet F5 57%; dead traffic 43%; no-conv 29%; low conversion 0; game fork
Blue Jays @ Orioles | Blue Jays | 2.9 | 0 | -2.9 | 0-2 |  | dead | projected runs but contact died | quiet F5 88%; dead traffic 50%; low conversion 7.3; game fork
Blue Jays @ Orioles | Orioles | 1.7 | 6 | 4.3 | 3+ | explosion |  | missed explosion signal | run cluster 78.5; quiet F5 50%; game fork
Braves @ Reds | Braves | 2.8 | 2 | -0.8 | 0-2 |  |  | close enough | xwOBA up 0
Braves @ Reds | Reds | 2.4 | 4 | 1.6 | 3+ |  |  | close enough | mistake chaos 66.3
Brewers @ Astros | Brewers | 2.7 | 2 | -0.7 | 0-2 |  |  | close enough | run cluster 76.2
Brewers @ Astros | Astros | 1.4 | 0 | -1.4 | 0-2 |  | dead | close enough | xwOBA up 0.1
Cubs @ Cardinals | Cubs | 1.9 | 0 | -1.9 | 0-2 |  | dead | close enough | run cluster 75.1; quiet F5 50%; game over-tail
Cubs @ Cardinals | Cardinals | 3.1 | 5 | 1.9 | 3+ | explosion |  | missed explosion signal | one-bad 57%; low conversion 21.6; game over-tail
Diamondbacks @ Mariners | Diamondbacks | 1.8 | 0 | -1.8 | 0-2 |  | dead | close enough | unsupported game over
Diamondbacks @ Mariners | Mariners | 3.5 | 1 | -2.5 | 0-2 |  | dead | projected runs but traffic stranded | xwOBA up 0.1; run diff L5 +4.6; unsupported game over
Giants @ Rockies | Giants | 3.4 | 11 | 7.6 | 3+ | explosion |  | under-projected scoring | mistake chaos 69.2; one-bad 75%; xwOBA up 0.1; game over-tail
Giants @ Rockies | Rockies | 3.1 | 5 | 1.9 | 3+ | explosion |  | missed explosion signal | mistake chaos 69.4; low conversion 24.9; game over-tail
Marlins @ Mets | Marlins | 1.3 | 1 | -0.3 | 0-2 |  | dead | close enough | quiet F5 63%; dead traffic 38%; low conversion 20.7; game over-tail
Marlins @ Mets | Mets | 1.3 | 5 | 3.7 | 3+ | explosion |  | missed explosion signal | game over-tail
Padres @ Nationals | Padres | 2.3 | 0 | -2.3 | 0-2 |  | dead | over-projected scoring | dead traffic 38%; low conversion 12.5; unsupported game over
Padres @ Nationals | Nationals | 3.7 | 3 | -0.7 | 3+ |  |  | close enough | dead traffic 38%; unsupported game over
Phillies @ Dodgers | Phillies | 1.4 | 0 | -1.4 | 0-2 |  | dead | close enough | quiet F5 75%; game over-tail
Phillies @ Dodgers | Dodgers | 2.8 | 6 | 3.2 | 3+ | explosion |  | missed explosion signal | run cluster 80.5; run diff L5 +3; game over-tail
Red Sox @ Guardians | Red Sox | 2.8 | 3 | 0.2 | 3+ |  |  | close enough | run cluster 79.7; mistake chaos 73; one-bad 63%; game fork
Red Sox @ Guardians | Guardians | 1.3 | 4 | 2.7 | 3+ |  |  | under-projected scoring | quiet F5 50%; dead traffic 38%; no-conv 25%; low conversion 3.1; game fork
Royals @ Rangers | Royals | 1.9 | 0 | -1.9 | 0-2 |  | dead | close enough | mistake chaos 69.8; one-bad 63%; quiet F5 50%; low conversion 18.4; game over-tail
Royals @ Rangers | Rangers | 1.4 | 6 | 4.6 | 3+ | explosion |  | missed explosion signal | run cluster 75.4; game over-tail
Tigers @ White Sox | Tigers | 2.1 | 1 | -1.1 | 0-2 |  | dead | close enough | one-bad 63%; quiet F5 50%; game fork
Tigers @ White Sox | White Sox | 2.5 | 0 | -2.5 | 0-2 |  | dead | projected runs but contact died | run cluster 77.9; run diff L5 +4.4; game fork
Twins @ Pirates | Twins | 1.3 | 0 | -1.3 | 0-2 |  | dead | close enough | one-bad 63%
Twins @ Pirates | Pirates | 2.7 | 9 | 6.3 | 3+ | explosion |  | missed explosion signal | run cluster 78.6; quiet F5 50%; dead traffic 38%
Yankees @ Athletics | Yankees | 2.6 | 13 | 10.4 | 3+ | explosion |  | missed explosion signal | run cluster 79.1; quiet F5 71%; xwOBA up 0.1; run diff L5 +5.2; game over-tail
Yankees @ Athletics | Athletics | 2.6 | 3 | 0.4 | 3+ |  |  | close enough | mistake chaos 70.2; one-bad 75%; dead traffic 63%; low conversion 7.9; game over-tail

## Read

The model’s problem was not only run-count error. The underlying expectation buckets were wrong. It missed several teams that should have been treated as explosion candidates, and it projected scoring from teams whose contact or conversion path died. For M2, expected runs should be downstream of a game-shape classifier: explosion path, dead path, normal path, or live fork.

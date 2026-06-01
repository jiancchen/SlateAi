# MLB-M2 May 31 F5 Tail Overlay Check

Date: 2026-05-31

This is a replay of May 31 through the current MLB-M2 tail-overlay code. It is retrospective and should be treated as a stress-test artifact, not a clean future backtest.

## Result

- Active F5 total sides: 4/4
- Old exposed F5 O/U rows checked: 8
- Old wrong rows still active: 0

The fix is not that every game gets a forced side. The fix is that the old bad rows no longer get promoted as clean value. The overlay either moves them into the right heavy-tail side or downgrades them to pass/live-only when both explosion and strand paths are live.

| Old row | Game | Line | Base | Tail adj | New side | Actual | Actual side | Result | Shape |
| --- | --- | ---: | ---: | ---: | --- | ---: | --- | --- | --- |
old board | Angels @ Rays | 4.7 | 4.7 | 5.8 | Pass | 4 | Under | pass | live-only fork
 | Blue Jays @ Orioles | 5.5 | 4.6 | 4.6 | Pass | 6 | Over | pass | live-only fork
 | Braves @ Reds | 4.9 | 5.2 | 5.2 | Pass | 6 | Over | pass | balanced
 | Brewers @ Astros | 4.2 | 4.1 | 4.1 | Pass | 2 | Under | pass | balanced
old board | Cubs @ Cardinals | 4.5 | 5 | 7.9 | Over | 5 | Over | hit | over-tail
old board | Diamondbacks @ Mariners | 4.4 | 5.3 | 4.1 | Pass | 1 | Under | pass | unsupported-over
 | Giants @ Rockies | 6.4 | 6.5 | 9.4 | Over | 16 | Over | hit | over-tail
old board | Marlins @ Mets | 3.9 | 2.6 | 4.7 | Over | 6 | Over | hit | over-tail
 | Padres @ Nationals | 4.4 | 6 | 4.3 | Pass | 3 | Under | pass | unsupported-over
old board | Phillies @ Dodgers | 5.3 | 4.2 | 5.2 | Pass | 6 | Over | pass | over-tail
 | Red Sox @ Guardians | 4.7 | 4.1 | 5.2 | Pass | 7 | Over | pass | live-only fork
old board | Royals @ Rangers | 4 | 3.3 | 4.1 | Pass | 6 | Over | pass | over-tail
old board | Tigers @ White Sox | 4.4 | 4.6 | 5.4 | Pass | 1 | Under | pass | live-only fork
 | Twins @ Pirates | 4.1 | 4 | 4 | Pass | 9 | Over | pass | balanced
old board | Yankees @ Athletics | 5.7 | 5.2 | 8.1 | Over | 16 | Over | hit | over-tail

# MLB-M2 Run Total Story Engine

Postgame date: 2026-05-31
Today check: 2026-06-01

This report asks the baseball question first: why did the game go over or under, and is that mechanism visible before the next slate? It is intentionally not a projection-error table.

## Settled Game Stories

### San Diego Padres @ Washington Nationals

- Result: full 6 vs line 7.5 (under); F5 3 vs line 4.4 (under).
- Primary story: traffic stranded: 8 innings with traffic and no runs.
- Why the full-game under happened: traffic stranded: 8 innings with traffic and no runs.
- Why the F5 under happened: traffic stranded: 8 innings with traffic and no runs.
- Counter-story to check next time: loud-contact tail: 15 hard-hit balls, 2 outfield XBH.
- Pregame repeatability checks: pregame did see chaos: chaos warning; mistake 53.9, cluster 65, one-bad 13%; tail overlay said unsupported-over: tail 38.1, strand 23.1, fork 23.1; radar axes: Bridge 100, Pressure 55.6, Flow 52.
- Key innings: 7T San Diego Padres: 2 R / 4 traffic; 5B Washington Nationals: 2 R / 2 traffic; 4B Washington Nationals: 1 R / 3 traffic.

### Kansas City Royals @ Texas Rangers

- Result: full 9 vs line 7.5 (over); F5 6 vs line 4 (over).
- Primary story: power damage: 1 HR, 7 XBH; traffic avalanche without HR dependency: 16 F5 baserunners, 10 hits, 5 free passes; free-pass fuel: 11 BB/HBP/CI, 5 before the 6th.
- Why the full-game over happened: power damage: 1 HR, 7 XBH; traffic avalanche without HR dependency: 16 F5 baserunners, 10 hits, 5 free passes; free-pass fuel: 11 BB/HBP/CI, 5 before the 6th; loud-contact tail: 19 hard-hit balls, 6 outfield XBH; two-out scoring: 6 runs with two outs.
- Why the F5 over happened: power damage: 1 HR, 7 XBH; traffic avalanche without HR dependency: 16 F5 baserunners, 10 hits, 5 free passes; free-pass fuel: 11 BB/HBP/CI, 5 before the 6th; loud-contact tail: 19 hard-hit balls, 6 outfield XBH; two-out scoring: 6 runs with two outs.
- Counter-story to check next time: traffic stranded: 9 innings with traffic and no runs; bat-missing held the run chain down: 20 strikeouts; rally deletion: 4 double-play/force-DP events.
- Pregame repeatability checks: pregame did see chaos: under exposed to mistake-chaos and one-big-inning risk; mistake 69.8, cluster 75.4, one-bad 63%; tail overlay said over-tail: tail 69.8, strand 22.6, fork 22.6; radar axes: Flow 100, Bridge 90.8, Chaos 71.3.
- Key innings: 1B Texas Rangers: 4 R / 5 traffic; 4B Texas Rangers: 2 R / 5 traffic; 8T Kansas City Royals: 2 R / 4 traffic.

### Los Angeles Angels @ Tampa Bay Rays

- Result: full 7 vs line 8.5 (under); F5 4 vs line 4.7 (under).
- Primary story: traffic stranded: 8 innings with traffic and no runs.
- Why the full-game under happened: traffic stranded: 8 innings with traffic and no runs.
- Why the F5 under happened: traffic stranded: 8 innings with traffic and no runs.
- Counter-story to check next time: free-pass fuel: 9 BB/HBP/CI, 6 before the 6th; defensive leak: 2 fielding errors, 0 outfield errors; loud-contact tail: 21 hard-hit balls, 2 outfield XBH; two-out scoring: 4 runs with two outs.
- Pregame repeatability checks: pregame did see chaos: chaos warning; mistake 77.9, cluster 74.2, one-bad 71%; tail overlay said live-only fork: tail 80.9, strand 44, fork 44; radar axes: Bridge 83.8, Chaos 74.3, Freeze 68.9.
- Key innings: 3B Tampa Bay Rays: 2 R / 5 traffic; 7B Tampa Bay Rays: 2 R / 4 traffic; 1B Tampa Bay Rays: 1 R / 2 traffic.

### Chicago Cubs @ St. Louis Cardinals

- Result: full 6 vs line 8.5 (under); F5 5 vs line 4.5 (over).
- Primary story: traffic avalanche without HR dependency: 12 F5 baserunners, 10 hits, 2 free passes; loud-contact tail: 27 hard-hit balls, 1 outfield XBH.
- Why the full-game under happened: power stayed contained: 1 HR, 2 XBH; traffic stranded: 8 innings with traffic and no runs; bridge/late stayed clean: 1 runs after the 5th.
- Why the F5 over happened: traffic avalanche without HR dependency: 12 F5 baserunners, 10 hits, 2 free passes; loud-contact tail: 27 hard-hit balls, 1 outfield XBH.
- Counter-story to check next time: power stayed contained: 1 HR, 2 XBH; traffic stranded: 8 innings with traffic and no runs; bridge/late stayed clean: 1 runs after the 5th.
- Pregame repeatability checks: pregame did see chaos: over exposed to quiet-start and traffic-without-conversion risk; mistake 63.3, cluster 75.1, one-bad 57%; pregame carry was live: 83°F | Wind 6 mph In | 16% precip; tail overlay said over-tail: tail 75.7, strand 30.2, fork 30.2; radar axes: Bridge 100, Chaos 63.1, Flow 60.
- Key innings: 3B St. Louis Cardinals: 3 R / 4 traffic; 1B St. Louis Cardinals: 2 R / 3 traffic; 6T Chicago Cubs: 1 R / 1 traffic.

### Arizona Diamondbacks @ Seattle Mariners

- Result: full 5 vs line 7.5 (under); F5 1 vs line 4.4 (under).
- Primary story: power stayed contained: 2 HR, 3 XBH; traffic stranded: 8 innings with traffic and no runs; bat-missing held the run chain down: 18 strikeouts.
- Why the full-game under happened: power stayed contained: 2 HR, 3 XBH; traffic stranded: 8 innings with traffic and no runs; bat-missing held the run chain down: 18 strikeouts.
- Why the F5 under happened: power stayed contained: 2 HR, 3 XBH; traffic stranded: 8 innings with traffic and no runs; bat-missing held the run chain down: 18 strikeouts.
- Counter-story to check next time: free-pass fuel: 9 BB/HBP/CI, 5 before the 6th; post-starter scoring: 2 bridge runs and 2 late runs; loud-contact tail: 14 hard-hit balls, 1 outfield XBH.
- Pregame repeatability checks: tail overlay said unsupported-over: tail 40.2, strand 0, fork 0; radar axes: Pressure 75.8, Flow 60, Chaos 52.2.
- Key innings: 2B Seattle Mariners: 1 R / 4 traffic; 6T Arizona Diamondbacks: 1 R / 2 traffic; 6B Seattle Mariners: 1 R / 2 traffic.

### Minnesota Twins @ Pittsburgh Pirates

- Result: full 12 vs line 7.5 (over); F5 9 vs line 4.1 (over).
- Primary story: starter-window crooked inning: max F5 inning 5, crooked F5 innings 1; power damage: 4 HR, 5 XBH; free-pass fuel: 7 BB/HBP/CI, 6 before the 6th.
- Why the full-game over happened: starter-window crooked inning: max F5 inning 5, crooked F5 innings 1; power damage: 4 HR, 5 XBH; free-pass fuel: 7 BB/HBP/CI, 6 before the 6th; two-out scoring: 4 runs with two outs.
- Why the F5 over happened: starter-window crooked inning: max F5 inning 5, crooked F5 innings 1; power damage: 4 HR, 5 XBH; free-pass fuel: 7 BB/HBP/CI, 6 before the 6th; two-out scoring: 4 runs with two outs.
- Counter-story to check next time: bat-missing held the run chain down: 24 strikeouts.
- Pregame repeatability checks: pregame did see chaos: chaos warning; mistake 62.3, cluster 78.6, one-bad 63%; pregame carry was live: 70°F | Wind 2 mph In | 0% precip | weather suppresses carry; tail overlay said balanced: tail 64, strand 25.4, fork 25.4; radar axes: Flow 100, Chaos 72.7, Pressure 65.7.
- Key innings: 5B Pittsburgh Pirates: 5 R / 7 traffic; 2B Pittsburgh Pirates: 2 R / 4 traffic; 3B Pittsburgh Pirates: 2 R / 2 traffic.

### Miami Marlins @ New York Mets

- Result: full 11 vs line 7.5 (over); F5 6 vs line 3.9 (over).
- Primary story: power damage: 3 HR, 5 XBH; free-pass fuel: 14 BB/HBP/CI, 8 before the 6th; defensive leak: 2 fielding errors, 1 outfield errors.
- Why the full-game over happened: power damage: 3 HR, 5 XBH; free-pass fuel: 14 BB/HBP/CI, 8 before the 6th; defensive leak: 2 fielding errors, 1 outfield errors; post-starter scoring: 5 bridge runs and 0 late runs; loud-contact tail: 21 hard-hit balls, 2 outfield XBH.
- Why the F5 over happened: power damage: 3 HR, 5 XBH; free-pass fuel: 14 BB/HBP/CI, 8 before the 6th; defensive leak: 2 fielding errors, 1 outfield errors; post-starter scoring: 5 bridge runs and 0 late runs; loud-contact tail: 21 hard-hit balls, 2 outfield XBH.
- Counter-story to check next time: traffic stranded: 6 innings with traffic and no runs.
- Pregame repeatability checks: pregame did see chaos: chaos warning; mistake 63.1, cluster 73.4, one-bad 38%; pregame carry was live: 72°F | Wind 9 mph Out | 0% precip | weather helps carry; pregame also saw under/strand risk: quiet F5 63%, lineup conversion floor 20.7; tail overlay said over-tail: tail 56.3, strand 40, fork 40.
- Key innings: 6B New York Mets: 5 R / 6 traffic; 4B New York Mets: 2 R / 4 traffic; 2B New York Mets: 2 R / 2 traffic.

### Philadelphia Phillies @ Los Angeles Dodgers

- Result: full 10 vs line 9 (over); F5 6 vs line 5.3 (over).
- Primary story: power damage: 4 HR, 8 XBH; free-pass fuel: 9 BB/HBP/CI, 4 before the 6th; post-starter scoring: 2 bridge runs and 2 late runs.
- Why the full-game over happened: power damage: 4 HR, 8 XBH; free-pass fuel: 9 BB/HBP/CI, 4 before the 6th; post-starter scoring: 2 bridge runs and 2 late runs; loud-contact tail: 17 hard-hit balls, 3 outfield XBH; two-out scoring: 4 runs with two outs.
- Why the F5 over happened: power damage: 4 HR, 8 XBH; free-pass fuel: 9 BB/HBP/CI, 4 before the 6th; post-starter scoring: 2 bridge runs and 2 late runs; loud-contact tail: 17 hard-hit balls, 3 outfield XBH; two-out scoring: 4 runs with two outs.
- Counter-story to check next time: traffic stranded: 7 innings with traffic and no runs; bat-missing held the run chain down: 19 strikeouts.
- Pregame repeatability checks: pregame did see chaos: under exposed to mistake-chaos and one-big-inning risk; mistake 59.4, cluster 80.5, one-bad 50%; pregame carry was live: 78°F | Wind 8 mph Out | 0% precip | weather helps carry; pregame also saw under/strand risk: quiet F5 75%, lineup conversion floor 29.4; tail overlay said over-tail: tail 68.2, strand 27.4, fork 27.4.
- Key innings: 5B Los Angeles Dodgers: 2 R / 4 traffic; 4B Los Angeles Dodgers: 2 R / 2 traffic; 8B Los Angeles Dodgers: 1 R / 3 traffic.

### Milwaukee Brewers @ Houston Astros

- Result: full 2 vs line 7.5 (under); F5 2 vs line 4.2 (under).
- Primary story: starter-window traffic stayed low: 2 F5 runs on 9 baserunners; power stayed contained: 1 HR, 3 XBH; traffic stranded: 5 innings with traffic and no runs.
- Why the full-game under happened: starter-window traffic stayed low: 2 F5 runs on 9 baserunners; power stayed contained: 1 HR, 3 XBH; traffic stranded: 5 innings with traffic and no runs; bat-missing held the run chain down: 18 strikeouts; bridge/late stayed clean: 0 runs after the 5th.
- Why the F5 under happened: starter-window traffic stayed low: 2 F5 runs on 9 baserunners; power stayed contained: 1 HR, 3 XBH; traffic stranded: 5 innings with traffic and no runs; bat-missing held the run chain down: 18 strikeouts; bridge/late stayed clean: 0 runs after the 5th.
- Counter-story to check next time: loud-contact tail: 16 hard-hit balls, 2 outfield XBH.
- Pregame repeatability checks: pregame did see chaos: chaos warning; mistake 53.6, cluster 76.2, one-bad 50%; tail overlay said balanced: tail 37.3, strand 0.4, fork 0.4; radar axes: Flow 100, Pressure 65.7, Chaos 56.6.
- Key innings: 4T Milwaukee Brewers: 2 R / 2 traffic; 3B Houston Astros: 0 R / 3 traffic; 3T Milwaukee Brewers: 0 R / 2 traffic.

### San Francisco Giants @ Colorado Rockies

- Result: full 25 vs line 11 (over); F5 16 vs line 6.4 (over).
- Primary story: starter-window crooked inning: max F5 inning 7, crooked F5 innings 1; power damage: 3 HR, 16 XBH; traffic avalanche without HR dependency: 30 F5 baserunners, 22 hits, 7 free passes.
- Why the full-game over happened: starter-window crooked inning: max F5 inning 7, crooked F5 innings 1; power damage: 3 HR, 16 XBH; traffic avalanche without HR dependency: 30 F5 baserunners, 22 hits, 7 free passes; free-pass fuel: 10 BB/HBP/CI, 7 before the 6th; defensive leak: 3 fielding errors, 1 outfield errors.
- Why the F5 over happened: starter-window crooked inning: max F5 inning 7, crooked F5 innings 1; power damage: 3 HR, 16 XBH; traffic avalanche without HR dependency: 30 F5 baserunners, 22 hits, 7 free passes; free-pass fuel: 10 BB/HBP/CI, 7 before the 6th; defensive leak: 3 fielding errors, 1 outfield errors.
- Counter-story to check next time: bat-missing held the run chain down: 19 strikeouts.
- Pregame repeatability checks: pregame did see chaos: chaos warning; mistake 69.4, cluster 75, one-bad 75%; pregame carry was live: 80°F | Wind 7 mph L-R | 3% precip | weather helps carry; tail overlay said over-tail: tail 100, strand 6.6, fork 6.6; radar axes: Flow 92, Chaos 78.4, Bridge 58.3.
- Key innings: 5T San Francisco Giants: 7 R / 8 traffic; 8T San Francisco Giants: 3 R / 5 traffic; 4T San Francisco Giants: 2 R / 4 traffic.

### Boston Red Sox @ Cleveland Guardians

- Result: full 13 vs line 8.5 (over); F5 7 vs line 4.7 (over).
- Primary story: power damage: 1 HR, 7 XBH; traffic avalanche without HR dependency: 18 F5 baserunners, 14 hits, 4 free passes; post-starter scoring: 6 bridge runs and 0 late runs.
- Why the full-game over happened: power damage: 1 HR, 7 XBH; traffic avalanche without HR dependency: 18 F5 baserunners, 14 hits, 4 free passes; post-starter scoring: 6 bridge runs and 0 late runs; loud-contact tail: 23 hard-hit balls, 6 outfield XBH; two-out scoring: 7 runs with two outs.
- Why the F5 over happened: power damage: 1 HR, 7 XBH; traffic avalanche without HR dependency: 18 F5 baserunners, 14 hits, 4 free passes; post-starter scoring: 6 bridge runs and 0 late runs; loud-contact tail: 23 hard-hit balls, 6 outfield XBH; two-out scoring: 7 runs with two outs.
- Counter-story to check next time: traffic stranded: 8 innings with traffic and no runs; bat-missing held the run chain down: 24 strikeouts.
- Pregame repeatability checks: pregame did see chaos: under exposed to mistake-chaos and one-big-inning risk; mistake 73, cluster 79.7, one-bad 63%; tail overlay said live-only fork: tail 80.7, strand 35.8, fork 35.8; radar axes: Chaos 70.6, Freeze 62.1, Flow 60.
- Key innings: 7T Boston Red Sox: 6 R / 7 traffic; 5B Cleveland Guardians: 2 R / 5 traffic; 2B Cleveland Guardians: 2 R / 4 traffic.

### Atlanta Braves @ Cincinnati Reds

- Result: full 10 vs line 8.5 (over); F5 6 vs line 4.9 (over).
- Primary story: power damage: 3 HR, 8 XBH; free-pass fuel: 9 BB/HBP/CI, 4 before the 6th; post-starter scoring: 3 bridge runs and 1 late runs.
- Why the full-game over happened: power damage: 3 HR, 8 XBH; free-pass fuel: 9 BB/HBP/CI, 4 before the 6th; post-starter scoring: 3 bridge runs and 1 late runs; loud-contact tail: 19 hard-hit balls, 5 outfield XBH.
- Why the F5 over happened: power damage: 3 HR, 8 XBH; free-pass fuel: 9 BB/HBP/CI, 4 before the 6th; post-starter scoring: 3 bridge runs and 1 late runs; loud-contact tail: 19 hard-hit balls, 5 outfield XBH.
- Counter-story to check next time: bat-missing held the run chain down: 18 strikeouts.
- Pregame repeatability checks: pregame did see chaos: chaos warning; mistake 66.3, cluster 74.6, one-bad 29%; tail overlay said balanced: tail 72.4, strand 8.8, fork 8.8; radar axes: Flow 100, Bridge 72.7, Chaos 61.
- Key innings: 9T Atlanta Braves: 1 R / 4 traffic; 3B Cincinnati Reds: 1 R / 3 traffic; 6T Atlanta Braves: 1 R / 3 traffic.

### Detroit Tigers @ Chicago White Sox

- Result: full 3 vs line 8 (under); F5 1 vs line 4.4 (under).
- Primary story: starter-window traffic stayed low: 1 F5 runs on 6 baserunners; power stayed contained: 1 HR, 3 XBH; traffic stranded: 7 innings with traffic and no runs.
- Why the full-game under happened: starter-window traffic stayed low: 1 F5 runs on 6 baserunners; power stayed contained: 1 HR, 3 XBH; traffic stranded: 7 innings with traffic and no runs; bridge/late stayed clean: 2 runs after the 5th.
- Why the F5 under happened: starter-window traffic stayed low: 1 F5 runs on 6 baserunners; power stayed contained: 1 HR, 3 XBH; traffic stranded: 7 innings with traffic and no runs; bridge/late stayed clean: 2 runs after the 5th.
- Counter-story to check next time: loud-contact tail: 15 hard-hit balls, 2 outfield XBH.
- Pregame repeatability checks: pregame did see chaos: chaos warning; mistake 59.2, cluster 77.9, one-bad 63%; tail overlay said live-only fork: tail 68.6, strand 11.1, fork 11.1; radar axes: Flow 100, Chaos 66.7, Pressure 65.2.
- Key innings: 7B Chicago White Sox: 2 R / 4 traffic; 1T Detroit Tigers: 1 R / 2 traffic; 6T Detroit Tigers: 0 R / 2 traffic.

### Toronto Blue Jays @ Baltimore Orioles

- Result: full 14 vs line 10 (over); F5 6 vs line 5.5 (over).
- Primary story: starter-window crooked inning: max F5 inning 5, crooked F5 innings 1; power damage: 2 HR, 5 XBH; traffic avalanche without HR dependency: 13 F5 baserunners, 8 hits, 5 free passes.
- Why the full-game over happened: starter-window crooked inning: max F5 inning 5, crooked F5 innings 1; power damage: 2 HR, 5 XBH; traffic avalanche without HR dependency: 13 F5 baserunners, 8 hits, 5 free passes; free-pass fuel: 9 BB/HBP/CI, 5 before the 6th; post-starter scoring: 4 bridge runs and 4 late runs.
- Why the F5 over happened: starter-window crooked inning: max F5 inning 5, crooked F5 innings 1; power damage: 2 HR, 5 XBH; traffic avalanche without HR dependency: 13 F5 baserunners, 8 hits, 5 free passes; free-pass fuel: 9 BB/HBP/CI, 5 before the 6th; post-starter scoring: 4 bridge runs and 4 late runs.
- Counter-story to check next time: traffic stranded: 6 innings with traffic and no runs.
- Pregame repeatability checks: pregame did see chaos: chaos warning; mistake 57.4, cluster 78.5, one-bad 25%; pregame also saw under/strand risk: quiet F5 88%, lineup conversion floor 7.3; tail overlay said live-only fork: tail 45.1, strand 53.4, fork 45.1; radar axes: Bridge 73.2, Freeze 72.6, Flow 60.
- Key innings: 3B Baltimore Orioles: 5 R / 5 traffic; 8T Toronto Blue Jays: 4 R / 5 traffic; 6B Baltimore Orioles: 3 R / 4 traffic.

### New York Yankees @ Athletics

- Result: full 21 vs line 10 (over); F5 16 vs line 5.7 (over).
- Primary story: starter-window crooked inning: max F5 inning 13, crooked F5 innings 2; power damage: 2 HR, 9 XBH; traffic avalanche without HR dependency: 24 F5 baserunners, 16 hits, 7 free passes.
- Why the full-game over happened: starter-window crooked inning: max F5 inning 13, crooked F5 innings 2; power damage: 2 HR, 9 XBH; traffic avalanche without HR dependency: 24 F5 baserunners, 16 hits, 7 free passes; free-pass fuel: 11 BB/HBP/CI, 7 before the 6th; post-starter scoring: 4 bridge runs and 1 late runs.
- Why the F5 over happened: starter-window crooked inning: max F5 inning 13, crooked F5 innings 2; power damage: 2 HR, 9 XBH; traffic avalanche without HR dependency: 24 F5 baserunners, 16 hits, 7 free passes; free-pass fuel: 11 BB/HBP/CI, 7 before the 6th; post-starter scoring: 4 bridge runs and 1 late runs.
- Counter-story to check next time: traffic stranded: 6 innings with traffic and no runs.
- Pregame repeatability checks: pregame did see chaos: under exposed to mistake-chaos and one-big-inning risk; mistake 70.2, cluster 79.1, one-bad 75%; pregame carry was live: 83°F | 0% precip | weather helps carry; pregame also saw under/strand risk: quiet F5 71%, lineup conversion floor 7.9; tail overlay said over-tail: tail 100, strand 56.3, fork 56.3.
- Key innings: 3T New York Yankees: 13 R / 15 traffic; 7B Athletics: 4 R / 5 traffic; 1B Athletics: 3 R / 4 traffic.

## Today Transfer Check

- No MLB published game files were available for the today check.
## Model Rule

- M2 totals must classify the story bucket before pricing the side: crooked-inning over, traffic-conversion over, power over, bridge over, starter hold under, strand under, power-suppressed under, or fork/live-only.
- The value board should filter model-owned story buckets. It should not convert a point projection into EV by itself.
- A story is repeatable only when the pregame file shows the same mechanism: command leak, traffic, power/carry, fielding/outfield tail, bridge leak, or strand suppressor.
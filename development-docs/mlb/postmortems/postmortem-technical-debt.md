# Postmortem Technical Debt

This is the running debt list coming out of the May 23 MLB postmortem.

Source docs:
- [may23-slate-postmortem-052326.md](/Users/jcchen/Documents/New%20project/development-docs/mlb/postmortems/may23-slate-postmortem-052326.md)
- [may23-chaos-followups-052326.md](/Users/jcchen/Documents/New%20project/development-docs/mlb/postmortems/may23-chaos-followups-052326.md)

## P0 Bookkeeping And Data Integrity

### 1. Unique MLB game IDs, including doubleheaders
- The board still produced duplicate `gameId` values like `cardinals-reds`.
- That caused side imports to collapse `14` board picks into `13` `mlb_side_predictions` rows.
- Prop keys are vulnerable to the same problem on doubleheaders.

What to do:
- generate a unique per-game slug using `gamePk` or a date-plus-sequence suffix
- backfill side/prop exporters and published data to use the unique ID everywhere
- verify all downstream joins use the unique ID, not just matchup text

### 2. Daily history file closeout gap
- Closeout did not write [mlb-results-2026-05-23.jsonl](/Users/jcchen/Documents/New%20project/data-private/history/mlb-results-2026-05-23.jsonl).
- The archive and warehouse updated, but the day file did not.

What to do:
- trace the closeout path that writes `data-private/history/mlb-results-YYYY-MM-DD.jsonl`
- make the per-day file required, not best-effort
- add a closeout assertion that the file exists after the run

### 3. Side backtest grading path still broken for May 23
- Importing the May 23 side board created `13` rows in `mlb_side_predictions`.
- Running side grading still left `0` rows in `mlb_side_backtests` for `board-moneyline-v1.1-sanity` on `2026-05-23`.
- `mlb_game_outcomes` and `mlb_game_team_stats` both had May 23 rows, so the grading path should have been able to score them.

What to do:
- audit [mlb_side_backtest.py](/Users/jcchen/Documents/New%20project/pipeline/mlb/warehouse/mlb_side_backtest.py) line by line on the May 23 dataset
- add logging for skipped rows during grading
- add a test fixture with a doubleheader day and assert that graded backtests are written
- fail the script when predictions import but grade count stays `0`

### 4. Prop/backtest duplicate-key ambiguity on doubleheaders
- The prop file had duplicate logical keys on `cardinals-reds` because matchup slug, player, and prop type repeated across the doubleheader.
- That can distort postmortems and future joins even if the raw backtests exist.

What to do:
- make prop IDs/game IDs doubleheader-safe
- include `gamePk` in prop prediction and backtest joins
- rerun the May 23 prop postmortem after that fix

## P0 Model Debt

### 5. Turn `dead_early_loss` into a first-class selector
- `5/7` side misses on May 23 were `dead_early_loss`.
- The board still tried to pick sides in games where the predicted team never got going early.

What to do:
- build a dedicated `dead_early_loss` research pass
- create a market selector that can prefer:
  - `NRFI`
  - `pass`
  - later, `F5 under` if the market data is available and trustworthy
- stop treating this as just another warning chip

### 6. Stop pick-first, veto-later
- The current flow still behaves like:
  - pick a side on paper
  - add warnings
  - then say `Pass`
- That leaves fake side authority in place even when the model has no positive thesis.

What to do:
- change selection order to:
  1. find a positive thesis
  2. map it to the best market expression
  3. only then allow a side
- if there is no positive thesis, emit no side at all

### 7. Veto engine is not promotable yet
- May 23 `Pass` calls were `3/6`.
- `Eligible` calls were `4/8`.
- It correctly suppressed some bad picks, but also suppressed real winners like `Astros @ Cubs`, `Twins @ Red Sox`, and `Cardinals @ Reds` game 2.

What to do:
- keep the veto engine research-only for now
- add per-flag precision tracking by day
- split vetoes into:
  - hard structural vetoes
  - soft caution signals
- stop treating one veto count as enough information

### 8. Efficient favorites filter is still provisional
- The old favorite lane was too broad.
- The new efficient-favorite filter is better, but it has not earned live trust yet.

What to do:
- track efficient-favorite outcomes separately
- compare them to plain market favorite baselines
- only keep the lane if it beats the market favorite benchmark over a real sample

## P1 First-Inning Lane

### 9. First-inning model still needs to become a timing model, not a mini-total model
- The original May 23 first-inning board finished `7/14`.
- Misses were almost entirely over-smoothed YRFI calls that ignored quiet early shapes.

What to do:
- keep and expand:
  - same-series dead-early suppression
  - team scores-in-1st vs team allows-in-1st
  - tiny pitcher-sample shrinkage
- add:
  - recent top-order conversion shape
  - recent first-inning traffic without conversion
  - quality-adjusted first-inning scoring by pitcher class

### 10. Add true first-inning hitter context
- The current first-inning model uses lineup pressure and some recent form, but not enough opponent-quality adjustment.

What to do:
- add hitter recent form vs:
  - good starters
  - leaky starters
  - same-pitch-shape starters
- add recent same-series exposure where available

## P1 Prop Model Debt

### 11. Retire generic `Over 1.5 total bases` from live use
- Top `8` settled props went `3/8`.
- All `8` were `Over 1.5 total bases`.
- That is not a calibrated lane; it is repetition with fake confidence.

What to do:
- demote all hitter props to research-only
- remove `Core` treatment for generic TB overs
- rebuild prop selection lane by lane instead of one blended ranking

### 12. Split prop model evaluation by prop family
- Total bases, singles, and RBI should not share one implied confidence system.

What to do:
- track calibration by prop type
- only promote a prop family if it survives on its own
- stop letting one prop family contaminate the trust of the others

## P1 Story And UI Debt

### 13. Story cards are still too broad in weak-series cases
- Some story cards improved structurally, but still fall back to generic text when same-series context is thin.
- The user needs reads that are directly actionable.

What to do:
- rewrite story generation around:
  - `Series read`
  - `Key matchup`
  - `Break trigger`
  - `Best expression`
- make each card answer:
  - who matters
  - what trigger matters
  - what market expression follows
- remove mushy umbrella labels as primary outputs

### 14. Stop showing side authority when the real thesis is elsewhere
- If the real read is `NRFI`, `pass`, or `F5 only`, the UI should not still feel like a side-pick screen first.

What to do:
- promote best market expression to the top
- demote edge/confidence to secondary detail
- allow blank side state when no side thesis exists

## P2 Chaos-Model Buildout

### 15. Replace more rolling averages with rolling shape vectors
- We still have too much average-based thinking in the pipeline.
- The slate again showed that averages smooth away the useful story.

What to do:
- build and use shape vectors for:
  - scoreless-first-3
  - quiet-first-5
  - traffic-no-conversion
  - run clustering
  - bullpen flip
  - series-local scoring shape

### 16. Build reason-coded dog lanes
- The board took many market dogs, but still could not say clearly why a dog was live.

What to do:
- create explicit dog lanes:
  - opponent dead-early
  - opponent traffic-no-conversion
  - opponent chaos gap
  - snapback pressure
  - same-series suppression
- require one of those reasons before a dog side can be shown

### 17. Keep building the label layer around how games break
- The labels are the best long-term asset from this work.
- The next target labels still need real downstream use.

What to do:
- keep expanding and testing:
  - `dead_early_loss`
  - `starter_crack_loss`
  - `first5_cleaner_than_full`
  - `full_game_cleaner_than_first5`
- use them as training targets, not just descriptive outputs

## P2 Automation And Reporting

### 18. Postmortem generation should become part of closeout
- The new postmortem generator exists, but it is not part of the automatic daily closeout flow yet.

What to do:
- add [research_mlb_slate_postmortem.py](/Users/jcchen/Documents/New%20project/pipeline/mlb/research/research_mlb_slate_postmortem.py) to closeout
- fail closeout if the postmortem cannot be written
- include bookkeeping warnings directly in the generated markdown

### 19. Add daily integrity checks
- Right now bookkeeping bugs are discovered manually after the fact.

What to do:
- add daily assertions for:
  - unique `gameId`
  - expected side prediction count
  - expected prop prediction count
  - history file existence
  - side backtest row count after grading
  - no silent skips on duplicate keys

## Keep

These are not debt; they are the parts worth building on:
- chaos/state tables
- mistake-shape layer
- story/phase labels
- first-inning profile tables
- state snapshot infrastructure
- postmortem generator

The collection and labeling work is still valuable. The biggest debt is the decision layer and the broken daily bookkeeping around it.

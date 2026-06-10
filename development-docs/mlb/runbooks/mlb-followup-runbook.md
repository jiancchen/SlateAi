# MLB Follow-Up Runbook

Use this after an MLB slate is finished. The goal is to pull final results into both MLB warehouses, grade every posted lane, freeze cached predictions that are already final, and publish settled history without letting stale live-feed data masquerade as a completed slate.

## 1. Force-Refresh Final MLB Results

Do this first. Do not rely on an earlier raw game-feed file if the games were still live or pending when it was written.

```bash
python3 pipeline/mlb/fetchers/fetch_mlb_schedule_game_feed.py --start-date YYYY-MM-DD --end-date YYYY-MM-DD
npm run data:ingest:mlb-day -- --date YYYY-MM-DD
python3 pipeline/mlb/warehouse/mlb_warehouse.py ingest-mlb-day --date YYYY-MM-DD
```

Verify both warehouses have final results:

```bash
sqlite3 -header -column data-private/warehouse/sports/mlb/sql-mlb.db "
select count(*) as typed_outcomes
from game_outcomes go
join games g on g.game_id = go.game_id
where g.game_date = 'YYYY-MM-DD';
"

sqlite3 -header -column data-private/warehouse/sports.db "
select count(*) as legacy_outcomes
from mlb_game_outcomes
where game_date = 'YYYY-MM-DD';
"
```

The typed and legacy counts should match the finished MLB game count for the slate.

Hard stop: also verify there are no scheduled MLB games without a typed outcome row.

```bash
sqlite3 -header -column data-private/warehouse/sports/mlb/sql-mlb.db "
select
  g.game_date,
  count(*) as games,
  sum(case when go.game_id is not null then 1 else 0 end) as outcomes,
  group_concat(
    case when go.game_id is null then at.name || ' @ ' || ht.name || ' [' || coalesce(g.status, '') || ']' end,
    '; '
  ) as missing
from games g
join teams at on at.team_id = g.away_team_id
join teams ht on ht.team_id = g.home_team_id
left join game_outcomes go on go.game_id = g.game_id
where g.game_date = 'YYYY-MM-DD'
group by g.game_date;
"
```

If `games != outcomes`, do not publish or deploy. Investigate the missing matchup before any grading/export. A stale MLB feed can carry a complete line score but keep `status` as `In Progress`, `Player challenge`, or another non-final state. The typed normalizer only writes `game_outcomes` when the status is final, so that stale status causes:

- no typed `game_outcomes` row
- missing first-inning/F5/full-game grading fields in `phase_outcomes`
- public `mlb-results.json` rows with null final score fields
- value-board rows staying gray because the UI has no trusted settlement row

For any missing outcome, inspect the raw feed:

```bash
python3 - <<'PY'
import gzip, json, pathlib
date = 'YYYY-MM-DD'
game_pk = 'GAMEPK'
path = pathlib.Path(f'data-private/raw/mlb/{date}/games/{game_pk}-feed-live.json.gz')
with gzip.open(path, 'rt') as handle:
    feed = json.load(handle)
status = feed['gameData']['status']
linescore = feed['liveData']['linescore']
print(status)
print(linescore.get('teams'))
for inning in linescore.get('innings', []):
    print(inning.get('num'), (inning.get('away') or {}).get('runs'), (inning.get('home') or {}).get('runs'))
PY
```

If the external scoreboard and the raw line score both show a final score but the MLB feed status is stale, make a targeted manual repair in `sql-mlb.db` and record `source_table='manual_external_final_repair'` plus the external source in `source_detail_json`. Repair only that game, then rerun the export and public audit. Do not silently accept a partial slate.

After a stale-status repair, regenerate the public batter result cache with the repaired game forced final so HR, H+R+RBI, hits, runs, and RBI rows can settle:

```bash
node scripts/generate-mlb-batting-results-module.mjs --dates YYYY-MM-DD --force-final-game-pks GAMEPK
```

If a historical value-board repair depends on FantasyInfoCentral Daily Matchups, backfill the dated FIC source before rebuilding the public site:

```bash
npm run data:warehouse:mlb-fic-daily-matchups -- --date YYYY-MM-DD
```

Use one date per command. The FIC warehouse writes raw HTML, normalized JSON, SQLite rows, and `web/src/lib/mlb-fic-daily-matchups.generated.js`; running several dates in parallel can lock `sql-mlb.db` and leave the generated module incomplete. Confirm the dated source URL is `https://www.fantasyinfocentral.com/mlb/daily-matchups?date=YYYY-MM-DD`.

## 2. Freeze Cached Prediction Rows

Cached page predictions must become immutable once the game has started or finished.

```bash
npm run data:backfill:mlb-cached-predictions -- --date YYYY-MM-DD
```

Verify final rows through `model_runs`:

```bash
sqlite3 -header -column data-private/warehouse/sports/mlb/sql-mlb.db "
select mr.run_date, count(*) as rows, sum(pr.is_final) as final_rows
from prediction_rows pr
join model_runs mr on mr.model_run_id = pr.model_run_id
where mr.run_date = 'YYYY-MM-DD'
group by mr.run_date;
"
```

Do not update or delete rows where `prediction_rows.is_final = 1`.

## 3. Refresh Derived Profiles

```bash
python3 pipeline/mlb/warehouse/mlb_warehouse.py derive-story-signals --through-date YYYY-MM-DD
python3 pipeline/mlb/warehouse/mlb_warehouse.py derive-hidden-edge-features --through-date YYYY-MM-DD
python3 pipeline/mlb/warehouse/mlb_warehouse.py derive-mistake-shapes --through-date YYYY-MM-DD
python3 pipeline/mlb/warehouse/mlb_warehouse.py derive-first-inning-profiles --through-date YYYY-MM-DD
python3 pipeline/mlb/warehouse/mlb_warehouse.py derive-state-snapshots --through-date YYYY-MM-DD
```

## 4. Grade Prediction Lanes

```bash
npm run data:grade:hr -- --date YYYY-MM-DD --model-name statcast-hr-prototype-v3
npm run data:grade:mlb-props -- --date YYYY-MM-DD --model-name mlb-player-props-v2
```

For side-board grading, rebuild compatibility views before grading so typed `game_outcomes` and `team_game_stats` are visible to legacy side graders:

```bash
python3 data-migration/scripts/create_mlb_legacy_compat_views.py --report data-migration/reports/create_mlb_legacy_compat_views_YYYY-MM-DD_postgame.json
npm run data:import:mlb-sides -- --file data-private/predictions/mlb-sides/YYYY-MM-DD-board-live.json
npm run data:grade:mlb-sides -- --model-name board-moneyline-v1.1-sanity
```

Verify:

```bash
sqlite3 -header -column data-private/warehouse/sports/mlb/sql-mlb.db "
select count(*) as side_predictions
from mlb_side_predictions
where model_name = 'board-moneyline-v1.1-sanity'
  and prediction_date = 'YYYY-MM-DD';

select count(*) as graded, sum(hit_full_game) as full_hits, sum(hit_first5) as f5_hits
from mlb_side_backtests
where model_name = 'board-moneyline-v1.1-sanity'
  and prediction_date = 'YYYY-MM-DD';
"
```

Closeout is not complete until the side board is imported and graded.

After grading, audit the value-board presentation against the settled slate before using any lane-performance numbers in a postmortem:

- F5 O/U public projection must equal `awayFirst5ProjectedRuns + homeFirst5ProjectedRuns`; do not grade or summarize rows that used `tailOverlay.adjustedProjectedRuns` as the displayed projection.
- `Pass`, `Hold`, and `Unsupported over` F5 O/U rows are research-only. They can be analyzed as model diagnostics, but they must not count as POTD, bet-grade value rows, or top-board promoted picks.
- When measuring improvement, separate pick accuracy from presentation/calibration changes. A projection-display fix can leave model hit rate unchanged while materially improving ranking, confidence, and POTD eligibility.
- Batter value boards must preserve lane separation after follow-up:
  - combined H+R+RBI clean board
  - Hits props
  - Runs props
  - RBI props
  - Mike's BOTD as an additive screen only
- Do not remove component Hits/Runs/RBI lanes when adding or repairing combined H+R+RBI or Mike's BOTD. If a lane has zero rows, show zero rows; do not rewrite the board into a combined-only view.
- For combined H+R+RBI, audit whether every promoted clean-board row satisfied projected full-game ML win, 70%+ model confidence, and 30+ recent AB/PA. Misses that fail this source gate should be classified as promotion failures, not as evidence that the entire HRR model row should be deleted.
- For Mike's BOTD, audit the separate 60%+ confidence screen with same-day FIC support: at least 5 career AB against the listed starter, AVG over .300, OPS over 1.000, projected full-game ML win, and 30+ recent AB/PA. If a manual Mike screen exists for the slate, only the manual names should enter BOTD; FIC strict-pass rows that were not manually selected stay out unless the rule is explicitly changed.
- For historical slates without direct exported `hitRunRbi` props, Mike's BOTD and combined HRR can be rebuilt from the modeled lineup-production ladder. Those modeled rows must carry FIC fields and should be graded with `mlb-batting-results.generated.js` using H+R+RBI >= 2 as the displayed hit condition for the 1.5-style modeled ladder.
- When settled games are available, every value-board row that has a trusted result source should show green/red/push status. Gray rows are acceptable only for unresolved games, rows without a defined market/result mapping, or research-only rows that intentionally have no grade.
- Bad player/team identity rows discovered during follow-up should be invalidated at prop-catalog level with a date-scoped guard, then recorded in the postmortem. Do not rely on team market filters to catch an identity row attached to the wrong team.
- Per-inning history must reconcile before publish: for every `stateContext.recentInningHistory` and `stateContext.matchupInningHistory` row, `sum(innings[].runs)` must equal `runsFor`, and `max(innings[].runs)` must be less than or equal to `runsFor`. If this fails, check for duplicate `team_game_stats`/`game_outcomes` rows being joined to plate appearances, and check extra-inning truncation.

Run the shadow calibration addendum over the newly settled window before publishing POTD or lane-promotion claims:

```bash
npm run data:research:mlb-shadow-calibration-addendum -- --dates RECENT-SETTLED-DATES
```

Use the report to assign promotion tiering only:

- `promoted`: sorted first and POTD eligible.
- `watch`: visible below promoted rows, not POTD eligible by default.
- `research`: visible for learning and detail-page context, never POTD eligible.

ML shape follow-up must separate model quality from presentation quality:

- Raw projected runs and model confidence are not rewritten by the shadow tier.
- Public ML shape sorting should be `promotion tier -> model confidence -> market edge -> margin support`.
- The old `diff/total` field is margin support only. If a 52% ML shape row has a bigger run-gap share than a 65% row, the 65% row should still rank higher unless the shadow report says otherwise.
- Postmortems should report whether a change improved pick generation or only improved promotion/POTD surfacing.

F5 ML follow-up must also separate confidence from margin support:

- Public F5 ML sorting should be `promotion tier -> lead confidence -> push/tie risk -> run-gap support`.
- A narrow historical seed window must not demote a stronger F5 ML edge by itself. If the lead confidence is acceptable and push/tie risk is controlled, an edge above the seed window is strong-edge support, not a reason to fall below weaker promoted rows.
- Promotion copy should explain the tradeoff directly: lead confidence is the primary signal, push/tie risk is the control, and projected run gap is supporting evidence.

The addendum must not delete rows or rewrite the original model pick.

## 5. Run Follow-Up Workflow

Once final feed counts are correct, the one-command workflow is:

```bash
npm run data:close:mlb-day -- --date YYYY-MM-DD
```

If strict typed feature source-status rows are missing, do not fake them. Refresh real source status where possible, record the coverage gap, and only use `--skip-preflight` on the specific lane you have manually verified.

## 6. Publish Settled History

```bash
npm run data:export:history-journal -- --skip-preflight
python3 pipeline/mlb/warehouse/mlb_warehouse.py derive-story-labels --through-date YYYY-MM-DD
npm run data:research:mlb-slate-postmortem -- --date YYYY-MM-DD --postmortem-out development-docs/mlb/postmortems/monD-slate-postmortem-MMDDYY.md --followup-out development-docs/mlb/postmortems/monD-chaos-followups-MMDDYY.md
npm run data:export:published
```

Then rerun the daily research reports:

```bash
npm run data:research:mlb-hidden-edges
npm run data:research:mlb-stateful-edges
npm run data:research:mlb-first5-state-model
npm run data:research:mlb-market-divergence
npm run data:research:mlb-story-phase-labels
npm run data:research:mlb-veto-engine -- --end-date YYYY-MM-DD
```

## 7. Final Checklist

- Final MLB feed was fetched after all games ended.
- Typed `sql-mlb.db` and legacy `sports.db` both have the full game-outcome count.
- Cached `prediction_rows` for started or finished games are final.
- HR, props, full-game sides, and F5 sides are graded.
- F5 O/U follow-up separated actionable `Over`/`Under` rows from research-only `Pass`/`Hold` rows before reporting hit rate or POTD performance.
- Shadow calibration report exists for the latest settled window and was used only for promotion tiering, not for mutating saved predictions.
- Mike's BOTD, combined H+R+RBI, Hits, Runs, and RBI lanes were checked separately after grading; adding one did not remove the others.
- Historical FIC backfills, if needed, were run one date at a time and the generated web module contains the repaired dates.
- Daily history JSONL exists for the settled date.
- Postmortem and follow-up markdown exist for the settled date.
- Published data was exported after grading.
- Any missing typed source-status rows are recorded as a coverage gap, not bypassed silently.

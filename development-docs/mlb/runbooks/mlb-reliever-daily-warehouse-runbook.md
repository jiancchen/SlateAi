# MLB Reliever Daily Warehouse Runbook

Use this when warehousing point-in-time relief context for MLB-M2, MLB-RP36, relief addendums, postmortems, or future reliever model training.

The goal is not to decide a bet from FanGraphs directly. The goal is to preserve exactly what the model could know before a slate: bullpen roles, workload, injuries, transactions, closer hierarchy, active/minor status, and reliever quality context.

## Point-In-Time Rule

Every row must keep these timestamps separate:

- `source_date`: the model snapshot date we are storing.
- `game_date`, `transaction_date`, or injury dates: what the source row is about.
- `captured_at`: when our warehouse fetched the page.
- `source_loaded_at`: FanGraphs/RosterResource's own page load timestamp when present.

Do not overwrite old source dates to "fix" history. If FanGraphs changes later, capture a new `source_date` snapshot.

## Current Implemented Daily Fetch

Run one date at a time from the repository root:

```bash
npm run data:warehouse:mlb-fangraphs-bullpen-depth -- --date YYYY-MM-DD --team all
```

Do not run this in parallel with other commands that write `data-private/warehouse/sports/mlb/sql-mlb.db`; SQLite locks can leave raw/artifact files ahead of DB rows.

The command currently fetches:

- FanGraphs/RosterResource team depth charts for all 30 teams, for example `https://www.fangraphs.com/roster-resource/depth-charts/angels`
- FanGraphs/RosterResource closer depth chart: `https://www.fangraphs.com/roster-resource/closer-depth-chart`

It writes raw source snapshots under:

```text
data-private/raw/fangraphs/mlb/depth-charts/YYYY-MM-DD/{team}.html
data-private/raw/fangraphs/mlb/closer-depth-chart/YYYY-MM-DD/closer-depth-chart.html
```

It writes normalized replay artifacts under:

```text
data-private/warehouse/mlb/fangraphs-bullpen-depth/YYYY-MM-DD/{team}.json
data-private/warehouse/mlb/fangraphs-closer-depth/YYYY-MM-DD/closer-depth-chart.json
```

## Current Typed Tables

The current FanGraphs reliever command populates:

- `mlb_fangraphs_bullpen_depth_daily`: visible bullpen role ladder.
- `mlb_fangraphs_bullpen_usage_daily`: visible last-six-day usage strip.
- `mlb_fangraphs_relief_roster_daily`: enriched RP roster rows, IDs, active/40-man, injury notes, projection/current stat fields, and raw row JSON.
- `mlb_fangraphs_bullpen_usage_events_daily`: structured recent usage with IP, TBF, pitches, saves, holds, blown saves, opponent, and home/away.
- `mlb_fangraphs_roster_transactions_daily`: team-page recent transactions.
- `mlb_fangraphs_team_rp_rankings_daily`: team RP ranks from the RosterResource payload.
- `mlb_fangraphs_closer_depth_daily`: closer page role hierarchy, tags, active status, season quality/stuff/contact metrics.
- `mlb_fangraphs_closer_usage_daily`: closer page recent usage with inning and leverage index.

For the pages already fetched, typed rows include `raw_row_json` where useful so future parser upgrades can replay the source without re-fetching.

## Validation

After every daily fetch, verify all source statuses are complete:

```bash
sqlite3 -header -column data-private/warehouse/sports/mlb/sql-mlb.db "
select
  source_name,
  source_family,
  source_date,
  last_status,
  last_completeness_status,
  expected_item_count,
  actual_item_count,
  updated_at
from source_fetch_status
where source_date = 'YYYY-MM-DD'
  and source_name like 'fangraphs_roster_resource_%'
order by source_name;
"
```

Verify all typed tables have rows for the date:

```bash
sqlite3 -header -column data-private/warehouse/sports/mlb/sql-mlb.db "
select 'depth' as table_name, count(*) as rows, count(distinct team_slug) as teams
from mlb_fangraphs_bullpen_depth_daily where source_date='YYYY-MM-DD'
union all
select 'visible_usage', count(*), count(distinct team_slug)
from mlb_fangraphs_bullpen_usage_daily where source_date='YYYY-MM-DD'
union all
select 'relief_roster', count(*), count(distinct team_slug)
from mlb_fangraphs_relief_roster_daily where source_date='YYYY-MM-DD'
union all
select 'structured_usage', count(*), count(distinct team_slug)
from mlb_fangraphs_bullpen_usage_events_daily where source_date='YYYY-MM-DD'
union all
select 'transactions', count(*), count(distinct team_slug)
from mlb_fangraphs_roster_transactions_daily where source_date='YYYY-MM-DD'
union all
select 'team_rp_rankings', count(*), count(distinct team_slug)
from mlb_fangraphs_team_rp_rankings_daily where source_date='YYYY-MM-DD'
union all
select 'closer_depth', count(*), count(distinct team_slug)
from mlb_fangraphs_closer_depth_daily where source_date='YYYY-MM-DD'
union all
select 'closer_usage', count(*), count(distinct team_slug)
from mlb_fangraphs_closer_usage_daily where source_date='YYYY-MM-DD';
"
```

Check that the important modeling fields are not empty:

```bash
sqlite3 -header -column data-private/warehouse/sports/mlb/sql-mlb.db "
select 'structured_usage_with_tbf' as metric, count(*) as rows
from mlb_fangraphs_bullpen_usage_events_daily
where source_date='YYYY-MM-DD' and batters_faced is not null
union all
select 'closer_usage_with_li', count(*)
from mlb_fangraphs_closer_usage_daily
where source_date='YYYY-MM-DD' and leverage_index is not null
union all
select 'relief_roster_with_injury_notes', count(*)
from mlb_fangraphs_relief_roster_daily
where source_date='YYYY-MM-DD' and injury_notes is not null
union all
select 'pitcher_transactions', count(*)
from mlb_fangraphs_roster_transactions_daily
where source_date='YYYY-MM-DD' and position in ('RP','SP','P');
"
```

Reference result from `2026-06-12` after the enriched fetch:

- `244` visible bullpen depth rows.
- `1,464` visible usage rows.
- `1,428` enriched relief roster rows.
- `4,033` structured usage rows.
- `300` team-page transaction rows.
- `30` team RP ranking rows.
- `332` closer-depth rows.
- `556` closer usage rows.

Counts can move by date because rosters, IL rows, and RosterResource page shape change. Treat missing teams or zero rows as the hard stop, not exact historical counts.

## Model Usage Boundary

FanGraphs/RosterResource is source context, not settlement truth.

Use it for:

- bullpen role hierarchy
- closer/setup/middle/long-relief shape
- high-leverage recent workload
- injury and IL context from roster pages
- call-up, option, transaction, and active-status context
- reliever quality priors
- opener/bulk risk once probables are wired

Do not use it as:

- final game outcome truth
- official lineup truth after MLB has posted lineups
- a direct override of M2 value rows
- a direct RP36 scorer until the feature has been backtested

Official MLB game feeds remain the label/outcome source.

Adjacent run-environment sources should stay separate from this reliever module. For example, FantasyInfoCentral Weather/HRForce is warehoused by `npm run data:warehouse:mlb-fic-weather -- --date YYYY-MM-DD` into `mlb_fic_weather_daily` and `mlb_fic_weather_hourly_daily`. M2 can join that to bullpen fatigue/bridge risk later, but the FanGraphs reliever warehouse should not own weather, park, or HR carry calculations.

## Where This Fits In The Daily Run

Run the reliever warehouse after official MLB schedule/probables are refreshed and before shadow addendums or M2/RP36 evaluation that needs relief context:

```bash
npm run data:warehouse:mlb-fangraphs-bullpen-depth -- --date YYYY-MM-DD --team all
npm run data:generate:mlb-shadow-addendums -- --dates YYYY-MM-DD
```

If the slate is already generated and the only need is postmortem context, it is still valid to run the FanGraphs warehouse later for that `source_date`; just label analysis as using that capture time.

## Warehouse/Scripting Backlog

P0 sources to add next:

- `mlb_fangraphs_injury_report_daily` from `https://www.fangraphs.com/roster-resource/injury-report`
  - Needed fields: `status`, `injurySurgery`, `latestUpdate`, `retrodate`, `eligibledate`, `returndate`, team, position, player IDs.
- `mlb_fangraphs_transaction_tracker_daily` from `https://www.fangraphs.com/roster-resource/transaction-tracker`
  - Store the season-to-date transaction log, not only the team-page recent 10.
- `mlb_fangraphs_reliever_leaders_daily`
  - Full reliever quality layer: FIP, xFIP, SIERA, WAR, WPA/LI, K-BB%, GB%, HR/FB, splits, and leverage fields.
- `mlb_fangraphs_reliever_projections_daily`
  - Projection system, season, player, IP, ERA/FIP/xFIP, K/BB, SV/HLD, WAR where available.

P1 sources to add after P0:

- `mlb_fangraphs_roster_grid_daily` from `https://www.fangraphs.com/roster-resource/roster-grid`
- `mlb_fangraphs_probables_grid_daily` from `https://www.fangraphs.com/roster-resource/probables-grid`
- `mlb_fangraphs_schedule_grid_daily` from `https://www.fangraphs.com/roster-resource/schedule-grid`
- `mlb_fangraphs_lineup_tracker_daily` from `https://www.fangraphs.com/roster-resource/lineup-tracker`

Scripting cleanup once the P0/P1 pages exist:

- Add a wrapper/alias command such as `data:warehouse:mlb-reliever-daily` that calls every reliever-context source in order.
- Extract shared FanGraphs helpers for fetch, `__NEXT_DATA__` parsing, source snapshot writes, artifact writes, chunked SQLite inserts, and source status rows.
- Add a validation/audit command for FanGraphs relief coverage so the morning runner can hard-stop on missing source families.
- Replay the `2026-06-10` and `2026-06-11` team depth raw snapshots into the new enriched typed tables if those dates are needed for training. Closer-depth was first captured on `2026-06-12`, so prior closer-page state is not replayable locally.
- Decide whether the morning production runner should call the reliever warehouse automatically or continue relying on the public slate runbook step.

## Failure Handling

If one team page fails:

- Keep raw/error details in `source_fetch_runs` and mark source coverage partial.
- Do not generate a relief addendum as complete for that date.
- Do not fill missing teams from a later `source_date`.

If the closer page fails:

- Team depth/usage rows may still be useful, but closer hierarchy, tags, leverage-index usage, and closer-page quality metrics are incomplete.
- Mark the closer source family partial/missing and keep the model from treating closer context as complete.

If FanGraphs returns stale page data:

- Store it with the current `source_date`, but inspect `source_loaded_at`.
- Use `source_loaded_at` in model features and postmortems so stale source state is visible.

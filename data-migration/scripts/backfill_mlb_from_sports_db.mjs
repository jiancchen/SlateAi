#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRelativeTargetForSport } from './sport_db_schema.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const timestamp = new Date().toISOString();

function parseArgs(argv) {
  const args = {
    sourceDb: path.join(repoRoot, 'data-private/warehouse/sports.db'),
    dryRun: false,
    report: path.join(repoRoot, 'data-migration/reports/phase2_backfill_mlb_core_2026-06-02.json'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--source-db') args.sourceDb = path.resolve(argv[++index]);
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--report') args.report = path.resolve(argv[++index]);
    else if (arg === '--sport') {
      const sport = argv[++index];
      if (sport !== 'mlb') throw new Error('backfill_mlb_from_sports_db.mjs only supports --sport mlb');
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function runSqlite(dbPath, args, input) {
  return execFileSync('sqlite3', args.concat(dbPath), {
    cwd: repoRoot,
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function queryJson(dbPath, sql) {
  const output = runSqlite(dbPath, ['-json'], sql);
  if (!output) return [];
  return JSON.parse(output);
}

function queryScalar(dbPath, sql) {
  return Number(runSqlite(dbPath, [], sql));
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function appendMigrationEvent(event) {
  appendFileSync(path.join(repoRoot, 'data-migration/migration_events.jsonl'), `${JSON.stringify(event)}\n`);
}

function sourceCounts(sourceDb) {
  return {
    teams: queryScalar(
      sourceDb,
      `select count(*) from (
        select away_team as team_name from mlb_games where away_team is not null
        union
        select home_team as team_name from mlb_games where home_team is not null
      );`,
    ),
    venues: queryScalar(sourceDb, `select count(distinct venue_name) from mlb_games where venue_name is not null;`),
    players: queryScalar(
      sourceDb,
      `select count(*) from (
        select pitcher_id as player_id from mlb_starting_pitchers where pitcher_id is not null
        union
        select batter_id as player_id from mlb_plate_appearances where batter_id is not null
        union
        select pitcher_id as player_id from mlb_plate_appearances where pitcher_id is not null
      );`,
    ),
    games: queryScalar(sourceDb, `select count(*) from mlb_games;`),
    starting_pitchers: queryScalar(sourceDb, `select count(*) from mlb_starting_pitchers where pitcher_id is not null;`),
    game_outcomes: queryScalar(sourceDb, `select count(*) from mlb_game_outcomes;`),
    plate_appearances: queryScalar(sourceDb, `select count(*) from mlb_plate_appearances;`),
    pitch_events: queryScalar(sourceDb, `select count(*) from mlb_pitch_events;`),
  };
}

function targetCounts(targetDb) {
  if (!existsSync(targetDb)) return {};
  const tables = ['teams', 'venues', 'players', 'games', 'starting_pitchers', 'game_outcomes', 'plate_appearances', 'pitch_events'];
  return Object.fromEntries(tables.map((table) => [table, queryScalar(targetDb, `select count(*) from ${table};`)]));
}

function backfillSql(sourceDb, reportPath) {
  const sourceRef = sourceDb.replaceAll("'", "''");
  const migrationRunId = `phase2-backfill-mlb-core-${timestamp.replaceAll(/[:.]/g, '-')}`;
  const reportRef = path.relative(repoRoot, reportPath).replaceAll("'", "''");
  return `
    attach database '${sourceRef}' as legacy;
    begin;

    insert or ignore into teams (team_id, mlb_team_id, name, abbreviation, league, division, active)
    select 'mlb-team-' || lower(replace(team_name, ' ', '-')), null, team_name, null, null, null, 1
    from (
      select away_team as team_name from legacy.mlb_games where away_team is not null
      union
      select home_team as team_name from legacy.mlb_games where home_team is not null
    );

    insert or ignore into venues (venue_id, mlb_venue_id, name, city, state, latitude, longitude, roof_type, orientation_degrees)
    select 'mlb-venue-' || lower(replace(venue_name, ' ', '-')), null, venue_name, null, null, null, null, null, null
    from legacy.mlb_games
    where venue_name is not null
    group by venue_name;

    insert or ignore into players (player_id, mlb_player_id, name, bats, throws, primary_position, birth_date, active)
    select 'mlb-player-' || pitcher_id, pitcher_id, pitcher_name, null, pitch_hand, 'P', null, 1
    from legacy.mlb_starting_pitchers
    where pitcher_id is not null and pitcher_name is not null;

    insert or ignore into players (player_id, mlb_player_id, name, bats, throws, primary_position, birth_date, active)
    select 'mlb-player-' || batter_id, batter_id, batter_name, batter_side, null, null, null, 1
    from legacy.mlb_plate_appearances
    where batter_id is not null and batter_name is not null;

    insert or ignore into players (player_id, mlb_player_id, name, bats, throws, primary_position, birth_date, active)
    select 'mlb-player-' || pitcher_id, pitcher_id, pitcher_name, null, pitch_hand, 'P', null, 1
    from legacy.mlb_plate_appearances
    where pitcher_id is not null and pitcher_name is not null;

    insert or ignore into games (
      game_id, mlb_game_pk, game_date, start_time_utc, home_team_id, away_team_id, venue_id,
      status, series_game_number, season, source_snapshot_id
    )
    select
      'mlb-' || game_pk,
      game_pk,
      game_date,
      game_datetime,
      'mlb-team-' || lower(replace(home_team, ' ', '-')),
      'mlb-team-' || lower(replace(away_team, ' ', '-')),
      case when venue_name is not null then 'mlb-venue-' || lower(replace(venue_name, ' ', '-')) end,
      status,
      null,
      cast(substr(game_date, 1, 4) as integer),
      null
    from legacy.mlb_games;

    insert or ignore into starting_pitchers (game_id, team_id, pitcher_id, confirmation_status, source_name, updated_at)
    select
      'mlb-' || sp.game_pk,
      case
        when sp.team_role = 'home' then 'mlb-team-' || lower(replace(g.home_team, ' ', '-'))
        when sp.team_role = 'away' then 'mlb-team-' || lower(replace(g.away_team, ' ', '-'))
      end,
      'mlb-player-' || sp.pitcher_id,
      null,
      'sports.db:mlb_starting_pitchers',
      null
    from legacy.mlb_starting_pitchers sp
    join legacy.mlb_games g on g.game_pk = sp.game_pk
    where sp.pitcher_id is not null;

    insert or ignore into game_outcomes (
      game_id, home_runs, away_runs, total_runs, f5_home_runs, f5_away_runs, f5_total_runs, winner_team_id, completed_at
    )
    select
      'mlb-' || o.game_pk,
      o.home_runs_final,
      o.away_runs_final,
      o.total_runs_final,
      o.home_runs_first5,
      o.away_runs_first5,
      o.total_runs_first5,
      case
        when lower(o.home_full_game_result) = 'win' then 'mlb-team-' || lower(replace(g.home_team, ' ', '-'))
        when lower(o.home_full_game_result) = 'loss' then 'mlb-team-' || lower(replace(g.away_team, ' ', '-'))
        else null
      end,
      null
    from legacy.mlb_game_outcomes o
    left join legacy.mlb_games g on g.game_pk = o.game_pk;

    insert or ignore into plate_appearances (
      plate_appearance_id, game_id, inning, inning_half, batter_id, pitcher_id, batting_team_id, pitching_team_id,
      event_type, rbi, runs_scored, outs_on_play, win_expectancy_delta, source_snapshot_id
    )
    select
      'mlb-' || game_pk || '-pa-' || at_bat_index,
      'mlb-' || game_pk,
      inning,
      half_inning,
      case when batter_id is not null then 'mlb-player-' || batter_id end,
      case when pitcher_id is not null then 'mlb-player-' || pitcher_id end,
      case when batting_team is not null then 'mlb-team-' || lower(replace(batting_team, ' ', '-')) end,
      case when fielding_team is not null then 'mlb-team-' || lower(replace(fielding_team, ' ', '-')) end,
      event_type,
      rbi,
      run_delta,
      case when outs_before is not null and outs_after is not null then outs_after - outs_before end,
      null,
      null
    from legacy.mlb_plate_appearances;

    insert or ignore into pitch_events (
      pitch_event_id, plate_appearance_id, game_id, pitch_number, pitch_type, pitch_result, release_speed,
      zone, launch_speed, launch_angle, hit_location, is_in_play, source_snapshot_id
    )
    select
      'mlb-' || game_pk || '-pa-' || at_bat_index || '-event-' || event_index,
      'mlb-' || game_pk || '-pa-' || at_bat_index,
      'mlb-' || game_pk,
      pitch_number,
      pitch_type_code,
      coalesce(call_description, event_type),
      start_speed,
      zone,
      null,
      null,
      null,
      is_in_play,
      null
    from legacy.mlb_pitch_events;

    insert into migration_runs (
      migration_run_id, sport, phase, script_path, source_ref, target_ref, status, dry_run,
      row_count_source, row_count_inserted, row_count_updated, row_count_skipped, checksum, report_path,
      started_at, finished_at, notes
    ) values (
      '${migrationRunId}',
      'mlb',
      '2',
      'data-migration/scripts/backfill_mlb_from_sports_db.mjs',
      'data-private/warehouse/sports.db:mlb_core',
      'data-private/warehouse/sports/mlb/sql-mlb.db',
      'backfilled',
      0,
      null,
      null,
      0,
      0,
      null,
      '${reportRef}',
      '${timestamp}',
      '${new Date().toISOString()}',
      'Backfilled MLB core/event rows from legacy sports.db. No raw JSON folders parsed.'
    );

    commit;
    detach database legacy;
  `;
}

const options = parseArgs(process.argv.slice(2));
const target = repoRelativeTargetForSport('mlb', repoRoot);

if (!existsSync(options.sourceDb)) throw new Error(`Missing source DB: ${options.sourceDb}`);
if (!existsSync(target.absoluteDbPath)) throw new Error(`Missing target DB: ${target.dbPath}. Run Phase 1 first.`);

mkdirSync(path.dirname(options.report), { recursive: true });

const before = targetCounts(target.absoluteDbPath);
const planned = sourceCounts(options.sourceDb);

if (!options.dryRun) {
  runSqlite(target.absoluteDbPath, [], backfillSql(options.sourceDb, options.report));
}

const after = targetCounts(target.absoluteDbPath);
const report = {
  generated_at: timestamp,
  phase: '2',
  script: 'data-migration/scripts/backfill_mlb_from_sports_db.mjs',
  sport: 'mlb',
  dry_run: options.dryRun,
  source_db: path.relative(repoRoot, options.sourceDb),
  target_db: target.dbPath,
  planned_source_counts: planned,
  target_counts_before: before,
  target_counts_after: after,
  status: options.dryRun ? 'planned' : 'backfilled',
};

writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);

appendMigrationEvent({
  event_id: `phase2-backfill-mlb-core-${timestamp.replaceAll(/[:.]/g, '-')}${options.dryRun ? '-dry-run' : ''}`,
  timestamp,
  phase: '2',
  area: 'mlb_legacy_core_event_backfill',
  source: 'data-private/warehouse/sports.db:mlb_core',
  target: target.dbPath,
  parser_module: 'none',
  migration_script: 'data-migration/scripts/backfill_mlb_from_sports_db.mjs',
  validation: options.dryRun ? 'dry-run only' : 'pending legacy-backfill validation',
  status_from: options.dryRun ? 'not_started' : 'started',
  status_to: options.dryRun ? 'planned' : 'backfilled',
  report_path: path.relative(repoRoot, options.report),
  checksum: null,
  notes: options.dryRun
    ? 'Dry-run MLB core/event backfill. No DB writes.'
    : 'Backfilled MLB core/event rows from legacy sports.db. No raw JSON folders parsed.',
});

console.log(`Wrote ${options.report}`);
console.log(JSON.stringify(report, null, 2));


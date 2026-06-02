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
    report: path.join(repoRoot, 'data-migration/reports/phase2_backfill_tennis_core_2026-06-02.json'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--source-db') args.sourceDb = path.resolve(argv[++index]);
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--report') args.report = path.resolve(argv[++index]);
    else if (arg === '--sport') {
      const sport = argv[++index];
      if (sport !== 'tennis') throw new Error('backfill_tennis_from_sports_db.mjs only supports --sport tennis');
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

function queryScalar(dbPath, sql) {
  return Number(runSqlite(dbPath, [], sql));
}

function appendMigrationEvent(event) {
  appendFileSync(path.join(repoRoot, 'data-migration/migration_events.jsonl'), `${JSON.stringify(event)}\n`);
}

function sourceCounts(sourceDb) {
  return {
    players: queryScalar(
      sourceDb,
      `select count(*) from (
        select normalized_name from tennis_players where normalized_name is not null
        union
        select player1_normalized_name from tennis_matches where player1_normalized_name is not null
        union
        select player2_normalized_name from tennis_matches where player2_normalized_name is not null
        union
        select normalized_name from tennis_rankings where normalized_name is not null
        union
        select normalized_name from tennis_recent_matches where normalized_name is not null
        union
        select opponent_normalized_name from tennis_recent_matches where opponent_normalized_name is not null
      );`,
    ),
    tournaments: queryScalar(
      sourceDb,
      `select count(*) from (
        select distinct coalesce(slate_date, '') || '|' || coalesce(league, '') || '|' || coalesce(stage, '') as key
        from tennis_matches
      );`,
    ),
    matches: queryScalar(sourceDb, `select count(*) from tennis_matches;`),
    match_players: queryScalar(sourceDb, `select count(*) * 2 from tennis_matches;`),
    rankings: queryScalar(sourceDb, `select count(*) from tennis_rankings;`),
    recent_matches: queryScalar(sourceDb, `select count(*) from tennis_recent_matches;`),
    h2h_matches: queryScalar(sourceDb, `select count(*) from tennis_h2h_matches;`),
  };
}

function targetCounts(targetDb) {
  if (!existsSync(targetDb)) return {};
  const tables = ['players', 'tournaments', 'matches', 'match_players', 'rankings', 'recent_matches', 'h2h_matches'];
  return Object.fromEntries(tables.map((table) => [table, queryScalar(targetDb, `select count(*) from ${table};`)]));
}

function backfillSql(sourceDb, reportPath) {
  const sourceRef = sourceDb.replaceAll("'", "''");
  const migrationRunId = `phase2-backfill-tennis-core-${timestamp.replaceAll(/[:.]/g, '-')}`;
  const reportRef = path.relative(repoRoot, reportPath).replaceAll("'", "''");
  return `
    attach database '${sourceRef}' as legacy;
    begin;

    insert or ignore into players (player_id, source_player_id, name, canonical_name, tour, country, birth_date, handedness, active)
    select
      'tennis-player-' || lower(replace(normalized_name, ' ', '-')),
      null,
      name,
      normalized_name,
      null,
      null,
      null,
      null,
      1
    from legacy.tennis_players
    where normalized_name is not null and name is not null;

    insert or ignore into players (player_id, source_player_id, name, canonical_name, tour, country, birth_date, handedness, active)
    select 'tennis-player-' || lower(replace(player1_normalized_name, ' ', '-')), null, player1_name, player1_normalized_name, null, null, null, null, 1
    from legacy.tennis_matches
    where player1_normalized_name is not null and player1_name is not null;

    insert or ignore into players (player_id, source_player_id, name, canonical_name, tour, country, birth_date, handedness, active)
    select 'tennis-player-' || lower(replace(player2_normalized_name, ' ', '-')), null, player2_name, player2_normalized_name, null, null, null, null, 1
    from legacy.tennis_matches
    where player2_normalized_name is not null and player2_name is not null;

    insert or ignore into players (player_id, source_player_id, name, canonical_name, tour, country, birth_date, handedness, active)
    select 'tennis-player-' || lower(replace(normalized_name, ' ', '-')), null, player_name, normalized_name, tour, country, null, null, 1
    from legacy.tennis_rankings
    where normalized_name is not null and player_name is not null;

    insert or ignore into players (player_id, source_player_id, name, canonical_name, tour, country, birth_date, handedness, active)
    select 'tennis-player-' || lower(replace(normalized_name, ' ', '-')), null, player_name, normalized_name, null, null, null, null, 1
    from legacy.tennis_recent_matches
    where normalized_name is not null and player_name is not null;

    insert or ignore into players (player_id, source_player_id, name, canonical_name, tour, country, birth_date, handedness, active)
    select 'tennis-player-' || lower(replace(opponent_normalized_name, ' ', '-')), null, opponent_name, opponent_normalized_name, opponent_tour, null, null, null, 1
    from legacy.tennis_recent_matches
    where opponent_normalized_name is not null and opponent_name is not null;

    insert or ignore into tournaments (tournament_id, name, tour, season, location, surface, level)
    select
      'tennis-tournament-' || lower(replace(replace(coalesce(slate_date, 'unknown') || '-' || coalesce(league, 'tennis') || '-' || coalesce(stage, 'stage'), ' ', '-'), '|', '-')),
      coalesce(stage, league, 'Tennis'),
      league,
      case when slate_date is not null then cast(substr(slate_date, 1, 4) as integer) end,
      null,
      surface,
      stage
    from legacy.tennis_matches
    group by slate_date, league, stage, surface;

    insert or ignore into matches (
      match_id, tournament_id, match_date, start_time_utc, round, tour, surface, best_of, status, source_event_id, source_snapshot_id
    )
    select
      match_id,
      'tennis-tournament-' || lower(replace(replace(coalesce(slate_date, 'unknown') || '-' || coalesce(league, 'tennis') || '-' || coalesce(stage, 'stage'), ' ', '-'), '|', '-')),
      slate_date,
      null,
      stage,
      league,
      surface,
      null,
      null,
      match_id,
      null
    from legacy.tennis_matches
    where match_id is not null;

    insert or ignore into match_players (match_id, player_id, side, seed, pre_match_rank, market_name)
    select match_id, 'tennis-player-' || lower(replace(player1_normalized_name, ' ', '-')), 1, null, null, player1_name
    from legacy.tennis_matches
    where match_id is not null and player1_normalized_name is not null;

    insert or ignore into match_players (match_id, player_id, side, seed, pre_match_rank, market_name)
    select match_id, 'tennis-player-' || lower(replace(player2_normalized_name, ' ', '-')), 2, null, null, player2_name
    from legacy.tennis_matches
    where match_id is not null and player2_normalized_name is not null;

    insert or ignore into rankings (
      ranking_id, player_id, ranking_date, tour, rank, points, age, country, source_name, source_snapshot_id
    )
    select
      'tennis-ranking-' || coalesce(as_of_date, 'unknown') || '-' || coalesce(tour, 'tour') || '-' || lower(replace(normalized_name, ' ', '-')),
      'tennis-player-' || lower(replace(normalized_name, ' ', '-')),
      as_of_date,
      tour,
      rank,
      points,
      age,
      country,
      source,
      null
    from legacy.tennis_rankings
    where normalized_name is not null and as_of_date is not null and tour is not null;

    insert or ignore into recent_matches (
      recent_match_id, player_id, opponent_player_id, match_date, tournament_name, surface, round, result,
      score, opponent_rank, source_name, source_snapshot_id
    )
    select
      'tennis-recent-' || lower(replace(normalized_name, ' ', '-')) || '-' || recent_index || '-' || coalesce(match_id, 'unknown'),
      'tennis-player-' || lower(replace(normalized_name, ' ', '-')),
      case when opponent_normalized_name is not null then 'tennis-player-' || lower(replace(opponent_normalized_name, ' ', '-')) end,
      match_date_label,
      event,
      null,
      event_tier,
      result_text,
      result_text,
      opponent_rank,
      'sports.db:tennis_recent_matches',
      null
    from legacy.tennis_recent_matches
    where normalized_name is not null and recent_index is not null;

    insert or ignore into h2h_matches (
      h2h_match_id, player_a_id, player_b_id, match_date, tournament_name, surface, winner_player_id, score, source_name, source_snapshot_id
    )
    select
      'tennis-h2h-' || coalesce(match_id, 'unknown') || '-' || h2h_index,
      'tennis-player-' || lower(replace(player_name, ' ', '-')),
      'tennis-player-' || lower(replace(opponent_name, ' ', '-')),
      coalesce(iso_date, match_date_label),
      event,
      surface,
      case when winner_name is not null then 'tennis-player-' || lower(replace(winner_name, ' ', '-')) end,
      result_text,
      source_name,
      null
    from legacy.tennis_h2h_matches
    where h2h_index is not null and player_name is not null and opponent_name is not null;

    insert into migration_runs (
      migration_run_id, sport, phase, script_path, source_ref, target_ref, status, dry_run,
      row_count_source, row_count_inserted, row_count_updated, row_count_skipped, checksum, report_path,
      started_at, finished_at, notes
    ) values (
      '${migrationRunId}',
      'tennis',
      '2',
      'data-migration/scripts/backfill_tennis_from_sports_db.mjs',
      'data-private/warehouse/sports.db:tennis_core',
      'data-private/warehouse/sports/tennis/sql-tennis.db',
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
      'Backfilled tennis core/form/H2H rows from legacy sports.db. No raw JSON folders parsed.'
    );

    commit;
    detach database legacy;
  `;
}

const options = parseArgs(process.argv.slice(2));
const target = repoRelativeTargetForSport('tennis', repoRoot);

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
  script: 'data-migration/scripts/backfill_tennis_from_sports_db.mjs',
  sport: 'tennis',
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
  event_id: `phase2-backfill-tennis-core-${timestamp.replaceAll(/[:.]/g, '-')}${options.dryRun ? '-dry-run' : ''}`,
  timestamp,
  phase: '2',
  area: 'tennis_legacy_core_form_h2h_backfill',
  source: 'data-private/warehouse/sports.db:tennis_core',
  target: target.dbPath,
  parser_module: 'none',
  migration_script: 'data-migration/scripts/backfill_tennis_from_sports_db.mjs',
  validation: options.dryRun ? 'dry-run only' : 'pending legacy-backfill validation',
  status_from: options.dryRun ? 'not_started' : 'started',
  status_to: options.dryRun ? 'planned' : 'backfilled',
  report_path: path.relative(repoRoot, options.report),
  checksum: null,
  notes: options.dryRun
    ? 'Dry-run tennis core/form/H2H backfill. No DB writes.'
    : 'Backfilled tennis core/form/H2H rows from legacy sports.db. No raw JSON folders parsed.',
});

console.log(`Wrote ${options.report}`);
console.log(JSON.stringify(report, null, 2));

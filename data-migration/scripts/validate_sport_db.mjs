#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SPORTS,
  expectedIndexesForSport,
  expectedTablesForSport,
  repoRelativeTargetForSport,
  schemaChecksumForSport,
} from './sport_db_schema.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const timestamp = new Date().toISOString();

function parseArgs(argv) {
  const args = {
    sport: 'all',
    schemaOnly: false,
    phase: 'schema-only',
    sourceDb: path.join(repoRoot, 'data-private/warehouse/sports.db'),
    report: path.join(repoRoot, 'data-migration/reports/phase1_validate_sport_db_2026-06-02.json'),
    noWriteHealth: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--sport') args.sport = argv[++index];
    else if (arg === '--schema-only') args.schemaOnly = true;
    else if (arg === '--phase') args.phase = argv[++index];
    else if (arg === '--source-db') args.sourceDb = path.resolve(argv[++index]);
    else if (arg === '--report') args.report = path.resolve(argv[++index]);
    else if (arg === '--no-write-health') args.noWriteHealth = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.sport !== 'all' && !SPORTS.includes(args.sport)) {
    throw new Error(`--sport must be one of ${SPORTS.join(', ')} or all`);
  }
  if (!['schema-only', 'legacy-backfill'].includes(args.phase)) {
    throw new Error('--phase must be schema-only or legacy-backfill');
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
  const output = runSqlite(dbPath, [], sql);
  return output.trim();
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function appendMigrationEvent(event) {
  const eventPath = path.join(repoRoot, 'data-migration/migration_events.jsonl');
  appendFileSync(eventPath, `${JSON.stringify(event)}\n`);
}

function writeHealthCheck(dbPath, sport, result, reportPath, phase) {
  const checkName = phase === 'legacy-backfill' ? 'phase2_legacy_backfill_validation' : 'phase1_schema_validation';
  const healthCheckId = `${checkName.replaceAll('_', '-')}-${sport}-${timestamp.replaceAll(/[:.]/g, '-')}`;
  const details = JSON.stringify({
    expected_tables: result.expected_tables.length,
    present_tables: result.present_tables.length,
    expected_indexes: result.expected_indexes.length,
    present_indexes: result.present_indexes.length,
    missing_tables: result.missing_tables,
    missing_indexes: result.missing_indexes,
    schema_migrations: result.schema_migration_count,
    migration_runs: result.migration_run_count,
    legacy_backfill: result.legacy_backfill ?? null,
    report_path: path.relative(repoRoot, reportPath),
  });
  runSqlite(
    dbPath,
    [],
    `insert into health_checks (
      health_check_id,
      model_run_id,
      check_name,
      status,
      expected_count,
      actual_count,
      details_json,
      checked_at
    ) values (
      ${sqlString(healthCheckId)},
      null,
      ${sqlString(checkName)},
      ${sqlString(result.ok ? 'ok' : 'failed')},
      ${result.expected_tables.length + result.expected_indexes.length},
      ${result.present_tables.length + result.present_indexes.length},
      ${sqlString(details)},
      ${sqlString(timestamp)}
    );`,
  );
  return healthCheckId;
}

function legacySourceCounts(sport, sourceDb) {
  if (sport === 'mlb') {
    return {
      teams: Number(queryScalar(sourceDb, `select count(*) from (
        select away_team as team_name from mlb_games where away_team is not null
        union
        select home_team as team_name from mlb_games where home_team is not null
      );`)),
      venues: Number(queryScalar(sourceDb, `select count(distinct venue_name) from mlb_games where venue_name is not null;`)),
      players: Number(queryScalar(sourceDb, `select count(*) from (
        select pitcher_id as player_id from mlb_starting_pitchers where pitcher_id is not null
        union
        select batter_id as player_id from mlb_plate_appearances where batter_id is not null
        union
        select pitcher_id as player_id from mlb_plate_appearances where pitcher_id is not null
      );`)),
      games: Number(queryScalar(sourceDb, `select count(*) from mlb_games;`)),
      starting_pitchers: Number(queryScalar(sourceDb, `select count(*) from mlb_starting_pitchers where pitcher_id is not null;`)),
      game_outcomes: Number(queryScalar(sourceDb, `select count(*) from mlb_game_outcomes;`)),
      plate_appearances: Number(queryScalar(sourceDb, `select count(*) from mlb_plate_appearances;`)),
      pitch_events: Number(queryScalar(sourceDb, `select count(*) from mlb_pitch_events;`)),
    };
  }
  if (sport === 'tennis') {
    return {
      players: Number(queryScalar(sourceDb, `select count(*) from (
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
      );`)),
      tournaments: Number(queryScalar(sourceDb, `select count(*) from (
        select distinct coalesce(slate_date, '') || '|' || coalesce(league, '') || '|' || coalesce(stage, '') as key
        from tennis_matches
      );`)),
      matches: Number(queryScalar(sourceDb, `select count(*) from tennis_matches;`)),
      match_players: Number(queryScalar(sourceDb, `select count(*) * 2 from tennis_matches;`)),
      rankings: Number(queryScalar(sourceDb, `select count(*) from tennis_rankings;`)),
      recent_matches: Number(queryScalar(sourceDb, `select count(*) from tennis_recent_matches;`)),
      h2h_matches: Number(queryScalar(sourceDb, `select count(*) from tennis_h2h_matches;`)),
    };
  }
  throw new Error(`Unsupported sport for legacy backfill validation: ${sport}`);
}

function targetLegacyCounts(sport, targetDb) {
  const tables =
    sport === 'mlb'
      ? ['teams', 'venues', 'players', 'games', 'starting_pitchers', 'game_outcomes', 'plate_appearances', 'pitch_events']
      : ['players', 'tournaments', 'matches', 'match_players', 'rankings', 'recent_matches', 'h2h_matches'];
  return Object.fromEntries(tables.map((table) => [table, Number(queryScalar(targetDb, `select count(*) from ${table};`))]));
}

function validateLegacyBackfill(sport, targetDb, sourceDb) {
  const source_counts = legacySourceCounts(sport, sourceDb);
  const target_counts = targetLegacyCounts(sport, targetDb);
  const mismatches = [];
  for (const [key, sourceCount] of Object.entries(source_counts)) {
    const targetCount = target_counts[key];
    if (sourceCount !== targetCount) {
      mismatches.push({
        table: key,
        source_count: sourceCount,
        target_count: targetCount,
      });
    }
  }
  const phase2MigrationRuns = Number(
    queryScalar(
      targetDb,
      `select count(*) from migration_runs where sport = ${sqlString(sport)} and phase = '2' and status = 'backfilled';`,
    ),
  );
  if (phase2MigrationRuns < 1) {
    mismatches.push({
      table: 'migration_runs',
      source_count: 1,
      target_count: phase2MigrationRuns,
    });
  }
  return {
    source_counts,
    target_counts,
    phase2_migration_runs: phase2MigrationRuns,
    mismatches,
    ok: mismatches.length === 0,
  };
}

function validateSport(sport, options) {
  const target = repoRelativeTargetForSport(sport, repoRoot);
  const expectedTables = expectedTablesForSport(sport);
  const expectedIndexes = expectedIndexesForSport(sport);
  const checksum = schemaChecksumForSport(sport);

  const result = {
    sport,
    db_path: target.dbPath,
    exists: existsSync(target.absoluteDbPath),
    db_size_bytes: null,
    expected_tables: expectedTables,
    present_tables: [],
    missing_tables: [],
    expected_indexes: expectedIndexes,
    present_indexes: [],
    missing_indexes: [],
    schema_checksum: checksum,
    schema_migration_count: 0,
    migration_run_count: 0,
    ok: false,
    errors: [],
  };

  if (!result.exists) {
    result.errors.push(`Missing DB: ${target.dbPath}`);
    return result;
  }

  result.db_size_bytes = statSync(target.absoluteDbPath).size;
  const tables = queryJson(
    target.absoluteDbPath,
    `select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name;`,
  ).map((row) => row.name);
  const indexes = queryJson(
    target.absoluteDbPath,
    `select name from sqlite_master where type = 'index' and name not like 'sqlite_%' order by name;`,
  ).map((row) => row.name);

  result.present_tables = tables.filter((table) => expectedTables.includes(table));
  result.missing_tables = expectedTables.filter((table) => !tables.includes(table));
  result.present_indexes = indexes.filter((index) => expectedIndexes.includes(index));
  result.missing_indexes = expectedIndexes.filter((index) => !indexes.includes(index));

  if (tables.includes('schema_migrations')) {
    result.schema_migration_count = Number(
      queryScalar(
        target.absoluteDbPath,
        `select count(*) from schema_migrations where checksum = ${sqlString(checksum)};`,
      ),
    );
  }
  if (tables.includes('migration_runs')) {
    result.migration_run_count = Number(
      queryScalar(
        target.absoluteDbPath,
        `select count(*) from migration_runs where sport = ${sqlString(sport)} and phase = '1' and status = 'created_or_verified';`,
      ),
    );
  }

  if (result.missing_tables.length > 0) result.errors.push(`Missing tables: ${result.missing_tables.join(', ')}`);
  if (result.missing_indexes.length > 0) result.errors.push(`Missing indexes: ${result.missing_indexes.join(', ')}`);
  if (result.schema_migration_count < 1) result.errors.push('Missing matching current schema_migrations row');
  if (result.migration_run_count < 1) result.errors.push('Missing phase1 migration_runs row');

  if (options.phase === 'legacy-backfill') {
    result.legacy_backfill = validateLegacyBackfill(sport, target.absoluteDbPath, options.sourceDb);
    if (!result.legacy_backfill.ok) {
      result.errors.push(`Legacy backfill count mismatches: ${JSON.stringify(result.legacy_backfill.mismatches)}`);
    }
  }

  result.ok = result.errors.length === 0;

  if (result.ok && !options.noWriteHealth) {
    result.health_check_id = writeHealthCheck(target.absoluteDbPath, sport, result, options.report, options.phase);
  }

  appendMigrationEvent({
    event_id: `${options.phase === 'legacy-backfill' ? 'phase2-legacy-backfill-validation' : 'phase1-schema-validation'}-${sport}-${timestamp.replaceAll(/[:.]/g, '-')}`,
    timestamp,
    phase: options.phase === 'legacy-backfill' ? '2' : '1',
    area: options.phase === 'legacy-backfill' ? `${sport}_legacy_backfill_validation` : `empty_${sport}_db_schema_validation`,
    source: target.dbPath,
    target: path.relative(repoRoot, options.report),
    parser_module: 'none',
    migration_script: `data-migration/scripts/validate_sport_db.mjs --phase ${options.phase} --sport ${sport}`,
    validation: result.ok
      ? options.phase === 'legacy-backfill'
        ? 'legacy backfill validation passed'
        : 'schema validation passed'
      : result.errors.join('; '),
    status_from: 'backfilled',
    status_to: result.ok ? 'validated' : 'blocked',
    report_path: path.relative(repoRoot, options.report),
    checksum,
    notes: result.ok
      ? options.phase === 'legacy-backfill'
        ? 'Phase 2 legacy backfill validation passed.'
        : 'Phase 1 schema validation passed.'
      : 'Sport DB validation failed; see validation report.',
  });

  return result;
}

function writePerSportCheckReports(report) {
  for (const sportReport of report.sports) {
    const target = repoRelativeTargetForSport(sportReport.sport, repoRoot);
    mkdirSync(target.absoluteChecksDir, { recursive: true });
    const reportFile =
      report.phase === '2'
        ? 'phase2_legacy_backfill_validation_2026-06-02.json'
        : 'phase1_schema_validation_2026-06-02.json';
    const checkPath = path.join(target.absoluteChecksDir, reportFile);
    writeFileSync(
      checkPath,
      `${JSON.stringify(
        {
          generated_at: report.generated_at,
          phase: report.phase,
          script: report.script,
          schema_only: report.schema_only,
          wrote_health_checks: report.wrote_health_checks,
          sport: sportReport,
        },
        null,
        2,
      )}\n`,
    );
    sportReport.sport_check_report_path = path.relative(repoRoot, checkPath);
  }
}

const options = parseArgs(process.argv.slice(2));
const sports = options.sport === 'all' ? SPORTS : [options.sport];

mkdirSync(path.dirname(options.report), { recursive: true });

const report = {
  generated_at: timestamp,
  phase: options.phase === 'legacy-backfill' ? '2' : '1',
  script: 'data-migration/scripts/validate_sport_db.mjs',
  schema_only: options.phase === 'schema-only',
  validation_phase: options.phase,
  wrote_health_checks: !options.noWriteHealth,
  sports: sports.map((sport) => validateSport(sport, options)),
};

report.ok = report.sports.every((sport) => sport.ok);
writePerSportCheckReports(report);

writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${options.report}`);
console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exit(1);

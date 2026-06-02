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
    report: path.join(repoRoot, 'data-migration/reports/phase1_validate_sport_db_2026-06-02.json'),
    noWriteHealth: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--sport') args.sport = argv[++index];
    else if (arg === '--schema-only') args.schemaOnly = true;
    else if (arg === '--phase') args.phase = argv[++index];
    else if (arg === '--report') args.report = path.resolve(argv[++index]);
    else if (arg === '--no-write-health') args.noWriteHealth = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.sport !== 'all' && !SPORTS.includes(args.sport)) {
    throw new Error(`--sport must be one of ${SPORTS.join(', ')} or all`);
  }
  if (!args.schemaOnly && args.phase !== 'schema-only') {
    throw new Error('Only schema-only validation is implemented in Phase 1');
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

function writeHealthCheck(dbPath, sport, result, reportPath) {
  const healthCheckId = `phase1-schema-health-${sport}-${timestamp.replaceAll(/[:.]/g, '-')}`;
  const details = JSON.stringify({
    expected_tables: result.expected_tables.length,
    present_tables: result.present_tables.length,
    expected_indexes: result.expected_indexes.length,
    present_indexes: result.present_indexes.length,
    missing_tables: result.missing_tables,
    missing_indexes: result.missing_indexes,
    schema_migrations: result.schema_migration_count,
    migration_runs: result.migration_run_count,
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
      'phase1_schema_validation',
      ${sqlString(result.ok ? 'ok' : 'failed')},
      ${result.expected_tables.length + result.expected_indexes.length},
      ${result.present_tables.length + result.present_indexes.length},
      ${sqlString(details)},
      ${sqlString(timestamp)}
    );`,
  );
  return healthCheckId;
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
        `select count(*) from schema_migrations where migration_id = 'phase1_base_schema_v1' and checksum = ${sqlString(checksum)};`,
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
  if (result.schema_migration_count < 1) result.errors.push('Missing matching phase1 schema_migrations row');
  if (result.migration_run_count < 1) result.errors.push('Missing phase1 migration_runs row');

  result.ok = result.errors.length === 0;

  if (result.ok && !options.noWriteHealth) {
    result.health_check_id = writeHealthCheck(target.absoluteDbPath, sport, result, options.report);
  }

  appendMigrationEvent({
    event_id: `phase1-schema-validation-${sport}-${timestamp.replaceAll(/[:.]/g, '-')}`,
    timestamp,
    phase: '1',
    area: `empty_${sport}_db_schema_validation`,
    source: target.dbPath,
    target: path.relative(repoRoot, options.report),
    parser_module: 'none',
    migration_script: `data-migration/scripts/validate_sport_db.mjs --schema-only --sport ${sport}`,
    validation: result.ok ? 'schema validation passed' : result.errors.join('; '),
    status_from: 'backfilled',
    status_to: result.ok ? 'validated' : 'blocked',
    report_path: path.relative(repoRoot, options.report),
    checksum,
    notes: result.ok
      ? 'Phase 1 schema validation passed.'
      : 'Phase 1 schema validation failed; see validation report.',
  });

  return result;
}

function writePerSportCheckReports(report) {
  for (const sportReport of report.sports) {
    const target = repoRelativeTargetForSport(sportReport.sport, repoRoot);
    mkdirSync(target.absoluteChecksDir, { recursive: true });
    const checkPath = path.join(target.absoluteChecksDir, 'phase1_schema_validation_2026-06-02.json');
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
  phase: '1',
  script: 'data-migration/scripts/validate_sport_db.mjs',
  schema_only: true,
  wrote_health_checks: !options.noWriteHealth,
  sports: sports.map((sport) => validateSport(sport, options)),
};

report.ok = report.sports.every((sport) => sport.ok);
writePerSportCheckReports(report);

writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${options.report}`);
console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exit(1);

#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, unlinkSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DB_TARGETS,
  SPORTS,
  expectedIndexesForSport,
  expectedTablesForSport,
  repoRelativeTargetForSport,
  schemaChecksumForSport,
  schemaSqlForSport,
} from './sport_db_schema.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const timestamp = new Date().toISOString();

function parseArgs(argv) {
  const args = {
    sport: 'all',
    dryRun: false,
    force: false,
    report: path.join(repoRoot, 'data-migration/reports/phase1_create_sport_dbs_2026-06-02.json'),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--sport') args.sport = argv[++index];
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--report') args.report = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.sport !== 'all' && !SPORTS.includes(args.sport)) {
    throw new Error(`--sport must be one of ${SPORTS.join(', ')} or all`);
  }
  return args;
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function runSqlite(dbPath, sql) {
  execFileSync('sqlite3', ['-batch', dbPath], {
    cwd: repoRoot,
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function safeForceDelete(dbPath) {
  const resolved = path.resolve(dbPath);
  const allowedRoot = path.join(repoRoot, 'data-private/warehouse/sports');
  if (!resolved.startsWith(allowedRoot)) {
    throw new Error(`Refusing to force delete outside sport warehouse: ${resolved}`);
  }
  if (existsSync(resolved)) unlinkSync(resolved);
}

function appendMigrationEvent(event) {
  const eventPath = path.join(repoRoot, 'data-migration/migration_events.jsonl');
  appendFileSync(eventPath, `${JSON.stringify(event)}\n`);
}

function createSportDb(sport, options) {
  const target = repoRelativeTargetForSport(sport, repoRoot);
  const checksum = schemaChecksumForSport(sport);
  const existedBefore = existsSync(target.absoluteDbPath);
  const statements = schemaSqlForSport(sport);
  const migrationRunId = `phase1-create-schema-${sport}-${timestamp.replaceAll(/[:.]/g, '-')}`;
  const reportPath = path.relative(repoRoot, options.report);
  const targetRef = DB_TARGETS[sport].dbPath;

  const result = {
    sport,
    db_path: targetRef,
    migrations_dir: DB_TARGETS[sport].migrationsDir,
    checks_dir: DB_TARGETS[sport].checksDir,
    dry_run: options.dryRun,
    force: options.force,
    existed_before: existedBefore,
    statement_count: statements.length,
    expected_tables: expectedTablesForSport(sport),
    expected_indexes: expectedIndexesForSport(sport),
    schema_checksum: checksum,
    migration_run_id: migrationRunId,
    status: options.dryRun ? 'planned' : 'created_or_verified',
  };

  if (options.dryRun) {
    appendMigrationEvent({
      event_id: `${migrationRunId}-dry-run`,
      timestamp,
      phase: '1',
      area: `empty_${sport}_db_schema`,
      source: 'schema plan',
      target: targetRef,
      parser_module: 'none',
      migration_script: `data-migration/scripts/create_sport_dbs.mjs --sport ${sport}`,
      validation: 'dry-run only',
      status_from: existedBefore ? 'existing' : 'not_started',
      status_to: 'planned',
      report_path: reportPath,
      checksum,
      notes: 'Dry-run schema creation. No DB writes.',
    });
    return result;
  }

  mkdirSync(path.dirname(target.absoluteDbPath), { recursive: true });
  mkdirSync(target.absoluteMigrationsDir, { recursive: true });
  mkdirSync(target.absoluteChecksDir, { recursive: true });

  if (options.force) safeForceDelete(target.absoluteDbPath);

  const metadataSql = [
    `insert or ignore into schema_migrations (migration_id, applied_at, description, checksum)
      values (
        'phase1_base_schema_v1',
        ${sqlString(timestamp)},
        'Phase 1 base schema for ${sport} sport warehouse',
        ${sqlString(checksum)}
      );`,
    `insert into migration_runs (
      migration_run_id,
      sport,
      phase,
      script_path,
      source_ref,
      target_ref,
      status,
      dry_run,
      row_count_source,
      row_count_inserted,
      row_count_updated,
      row_count_skipped,
      checksum,
      report_path,
      started_at,
      finished_at,
      notes
    ) values (
      ${sqlString(migrationRunId)},
      ${sqlString(sport)},
      '1',
      'data-migration/scripts/create_sport_dbs.mjs',
      'schema plan',
      ${sqlString(targetRef)},
      'created_or_verified',
      0,
      0,
      ${expectedTablesForSport(sport).length},
      0,
      0,
      ${sqlString(checksum)},
      ${sqlString(reportPath)},
      ${sqlString(timestamp)},
      ${sqlString(new Date().toISOString())},
      'Created or verified Phase 1 empty sport DB schema.'
    );`,
  ];

  runSqlite(target.absoluteDbPath, [...statements, ...metadataSql].join('\n'));

  result.db_size_bytes = statSync(target.absoluteDbPath).size;

  appendMigrationEvent({
    event_id: migrationRunId,
    timestamp,
    phase: '1',
    area: `empty_${sport}_db_schema`,
    source: 'schema plan',
    target: targetRef,
    parser_module: 'none',
    migration_script: `data-migration/scripts/create_sport_dbs.mjs --sport ${sport}`,
    validation: `pending schema validation for ${sport}`,
    status_from: existedBefore ? 'existing' : 'not_started',
    status_to: 'backfilled',
    report_path: reportPath,
    checksum,
    notes: 'Created or verified empty sport DB schema. No source data copied.',
  });

  return result;
}

const options = parseArgs(process.argv.slice(2));
const sports = options.sport === 'all' ? SPORTS : [options.sport];

mkdirSync(path.dirname(options.report), { recursive: true });

const report = {
  generated_at: timestamp,
  phase: '1',
  script: 'data-migration/scripts/create_sport_dbs.mjs',
  dry_run: options.dryRun,
  force: options.force,
  sports: sports.map((sport) => createSportDb(sport, options)),
};

writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${options.report}`);
console.log(JSON.stringify(report, null, 2));


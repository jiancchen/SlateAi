#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRelativeTargetForSport, schemaChecksumForSport, schemaSqlForSport, SPORTS } from './sport_db_schema.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const timestamp = new Date().toISOString();

const DEFAULT_POLICIES = {
  mlb: [
    { source_name: 'mlb_raw_daily', source_family: 'stats-api', ttl: 6, max_stale: 24, required: 1, notes: 'Schedule/live/result payloads. Force refresh for active game days.' },
    { source_name: 'mlb_stats_api', source_family: 'stats-api', ttl: 6, max_stale: 24, required: 1, notes: 'MLB Stats API player/game source payloads.' },
    { source_name: 'baseballsavant', source_family: 'statcast', ttl: 24, max_stale: 72, required: 1, notes: 'Player splits/profile context; can cache longer than odds.' },
    { source_name: 'mlb_odds', source_family: 'markets', ttl: 1, max_stale: 6, required: 1, notes: 'FanDuel/Kalshi/Robinhood style odds and market snapshots.' },
  ],
  tennis: [
    { source_name: 'tennis_reference', source_family: 'match-reference', ttl: 12, max_stale: 48, required: 0, notes: 'Broad tennis reference receipt registration. Typed source-family health must use the split Flashscore/SofaScore/Livesport/odds policies.' },
    { source_name: 'tennis_flashscore_stats', source_family: 'match-stats', ttl: 12, max_stale: 48, required: 1, notes: 'Flashscore match-stat payloads feeding serve, break pressure, and recent-match stat facts.' },
    { source_name: 'tennis_sofascore_replay', source_family: 'replay', ttl: 12, max_stale: 48, required: 1, notes: 'SofaScore point-by-point replay payloads feeding clutch, break-back, and closeout facts.' },
    { source_name: 'tennis_livesport_replay', source_family: 'replay', ttl: 12, max_stale: 48, required: 0, notes: 'Livesport/Flashscore feed point-by-point fallback for replay coverage when SofaScore misses.' },
    { source_name: 'tennis_odds', source_family: 'markets', ttl: 1, max_stale: 6, required: 1, notes: 'Prediction-market and sportsbook odds snapshots.' },
    { source_name: 'tennis_rankings', source_family: 'rankings', ttl: 24, max_stale: 72, required: 1, notes: 'ATP/WTA ranking snapshots with rank, points, age, country, and source URL joins.' },
  ],
};

function parseArgs(argv) {
  const args = {
    sport: 'all',
    dryRun: false,
    report: path.join(repoRoot, 'data-migration/reports/apply_fetch_contract_schema_2026-06-02.json'),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--sport') args.sport = argv[++index];
    else if (arg === '--dry-run') args.dryRun = true;
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
  return execFileSync('sqlite3', ['-batch', dbPath], {
    cwd: repoRoot,
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function queryJson(dbPath, sql) {
  const output = execFileSync('sqlite3', ['-json', dbPath], {
    cwd: repoRoot,
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
  return output ? JSON.parse(output) : [];
}

function appendMigrationEvent(event) {
  appendFileSync(path.join(repoRoot, 'data-migration/migration_events.jsonl'), `${JSON.stringify(event)}\n`);
}

function upsertPolicySql(sport, policy) {
  const policyId = `${sport}:${policy.source_name}`;
  const envPrefix = `${sport}_${policy.source_name}`.toUpperCase();
  return `insert into source_fetch_policies (
    source_fetch_policy_id,
    sport,
    source_name,
    source_family,
    run_rule,
    default_ttl_hours,
    max_stale_hours,
    required_for_prediction,
    env_ttl_key,
    env_force_key,
    env_disable_key,
    config_path,
    created_at,
    updated_at,
    notes
  ) values (
    ${sqlString(policyId)},
    ${sqlString(sport)},
    ${sqlString(policy.source_name)},
    ${sqlString(policy.source_family)},
    'fetch_if_stale',
    ${policy.ttl},
    ${policy.max_stale},
    ${policy.required},
    ${sqlString(`${envPrefix}_TTL_HOURS`)},
    ${sqlString(`${envPrefix}_FORCE_FETCH`)},
    ${sqlString(`${envPrefix}_DISABLE_FETCH`)},
    'data-migration/post_migration_ingestion_rewrite_run_plan.md',
    ${sqlString(timestamp)},
    ${sqlString(timestamp)},
    ${sqlString(policy.notes)}
  )
  on conflict (sport, source_name) do update set
    source_family = excluded.source_family,
    run_rule = excluded.run_rule,
    default_ttl_hours = excluded.default_ttl_hours,
    max_stale_hours = excluded.max_stale_hours,
    required_for_prediction = excluded.required_for_prediction,
    env_ttl_key = excluded.env_ttl_key,
    env_force_key = excluded.env_force_key,
    env_disable_key = excluded.env_disable_key,
    config_path = excluded.config_path,
    updated_at = excluded.updated_at,
    notes = excluded.notes;`;
}

function applySport(sport, options) {
  const target = repoRelativeTargetForSport(sport, repoRoot);
  const checksum = schemaChecksumForSport(sport);
  const migrationRunId = `phase9-fetch-contract-${sport}-${timestamp.replaceAll(/[:.]/g, '-')}`;
  const reportPath = path.relative(repoRoot, options.report);
  const policies = DEFAULT_POLICIES[sport] || [];
  const statements = [
    ...schemaSqlForSport(sport),
    ...policies.map((policy) => upsertPolicySql(sport, policy)),
    `insert or replace into schema_migrations (migration_id, applied_at, description, checksum)
      values (
        'phase9_fetch_contract_v1',
        ${sqlString(timestamp)},
        'Phase 9 source fetch policy/run/status contract',
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
      '9',
      'data-migration/scripts/apply_fetch_contract_schema.mjs',
      'post-migration ingestion rewrite plan',
      ${sqlString(target.dbPath)},
      ${options.dryRun ? "'planned'" : "'created_or_verified'"},
      ${options.dryRun ? 1 : 0},
      ${policies.length},
      ${options.dryRun ? 0 : policies.length},
      0,
      0,
      ${sqlString(checksum)},
      ${sqlString(reportPath)},
      ${sqlString(timestamp)},
      ${sqlString(new Date().toISOString())},
      'Created fetch policy/run/status contract for DB-first ingestion.'
    );`,
  ];

  if (!options.dryRun) runSqlite(target.absoluteDbPath, statements.join('\n'));

  const tableCounts = options.dryRun
    ? {}
    : Object.fromEntries(
        queryJson(
          target.absoluteDbPath,
          `select 'source_fetch_policies' as table_name, count(*) as row_count from source_fetch_policies
           union all select 'source_fetch_runs', count(*) from source_fetch_runs
           union all select 'source_fetch_status', count(*) from source_fetch_status;`,
        ).map((row) => [row.table_name, row.row_count]),
      );

  appendMigrationEvent({
    event_id: migrationRunId,
    timestamp,
    phase: '9',
    area: `${sport}_fetch_contract_schema`,
    source: 'post-migration ingestion rewrite plan',
    target: target.dbPath,
    parser_module: 'none',
    migration_script: 'data-migration/scripts/apply_fetch_contract_schema.mjs',
    validation: options.dryRun ? 'dry-run only' : `${policies.length} source fetch policies registered`,
    status_from: 'not_started',
    status_to: options.dryRun ? 'planned' : 'validated',
    report_path: reportPath,
    checksum,
    notes: 'Defines per-source TTL/run rules, fetch attempt history, and current source freshness/completeness status.',
  });

  return {
    sport,
    db_path: target.dbPath,
    dry_run: options.dryRun,
    migration_run_id: migrationRunId,
    policy_count: policies.length,
    table_counts: tableCounts,
    status: options.dryRun ? 'planned' : 'created_or_verified',
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const sports = options.sport === 'all' ? SPORTS : [options.sport];
  const results = sports.map((sport) => applySport(sport, options));
  const report = {
    generated_at: timestamp,
    dry_run: options.dryRun,
    results,
  };
  mkdirSync(path.dirname(options.report), { recursive: true });
  writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main();

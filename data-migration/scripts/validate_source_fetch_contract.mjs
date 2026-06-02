#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRelativeTargetForSport, SPORTS } from './sport_db_schema.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const timestamp = new Date().toISOString();

const SOURCE_ALIASES = {
  'mlb-raw-daily': { sport: 'mlb', sourceName: 'mlb_raw_daily' },
  'mlb-stats-api': { sport: 'mlb', sourceName: 'mlb_stats_api' },
  baseballsavant: { sport: 'mlb', sourceName: 'baseballsavant' },
  'mlb-odds': { sport: 'mlb', sourceName: 'mlb_odds' },
  'tennis-reference': { sport: 'tennis', sourceName: 'tennis_reference' },
  'tennis-odds': { sport: 'tennis', sourceName: 'tennis_odds' },
};

const ACCEPTED_FRESH_STATUSES = new Set(['success', 'partial', 'skipped_cache']);
const BLOCKING_STATUSES = new Set(['failed', 'missing']);

function parseArgs(argv) {
  const args = {
    sport: null,
    source: null,
    date: null,
    allowPartial: true,
    report: path.join(repoRoot, 'data-migration/reports/validate_source_fetch_contract_2026-06-02.json'),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--sport') args.sport = argv[++index];
    else if (arg === '--source') args.source = argv[++index];
    else if (arg === '--date') args.date = argv[++index];
    else if (arg === '--no-partial') args.allowPartial = false;
    else if (arg === '--report') args.report = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  const alias = SOURCE_ALIASES[args.source] || null;
  if (!args.sport && alias) args.sport = alias.sport;
  if (alias) args.sourceName = alias.sourceName;
  else args.sourceName = args.source;

  if (!args.sport || !SPORTS.includes(args.sport)) {
    throw new Error(`--sport must be one of ${SPORTS.join(', ')} or source must imply a sport`);
  }
  if (!args.sourceName) throw new Error('--source is required');
  if (!args.date || !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    throw new Error('--date is required in YYYY-MM-DD format');
  }
  return args;
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

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function validate(options) {
  const target = repoRelativeTargetForSport(options.sport, repoRoot);
  const policy = queryJson(
    target.absoluteDbPath,
    `select * from source_fetch_policies
     where sport = ${sqlString(options.sport)} and source_name = ${sqlString(options.sourceName)}
     limit 1;`,
  )[0] || null;
  const status = queryJson(
    target.absoluteDbPath,
    `select * from source_fetch_status
     where sport = ${sqlString(options.sport)}
       and source_name = ${sqlString(options.sourceName)}
       and source_date = ${sqlString(options.date)}
     limit 1;`,
  )[0] || null;
  const runCounts = queryJson(
    target.absoluteDbPath,
    `select status, count(*) as row_count
     from source_fetch_runs
     where sport = ${sqlString(options.sport)}
       and source_name = ${sqlString(options.sourceName)}
       and source_date = ${sqlString(options.date)}
     group by status
     order by status;`,
  );

  const errors = [];
  if (!policy) errors.push(`Missing source_fetch_policies row for ${options.sport}/${options.sourceName}`);
  if (!status) errors.push(`Missing source_fetch_status row for ${options.sport}/${options.sourceName}/${options.date}`);

  let stale = null;
  if (status) {
    stale = status.cache_valid_until ? Date.parse(status.cache_valid_until) <= Date.now() : true;
    if (BLOCKING_STATUSES.has(status.last_status)) errors.push(`Blocking status: ${status.last_status}`);
    if (!ACCEPTED_FRESH_STATUSES.has(status.last_status)) errors.push(`Unexpected status: ${status.last_status}`);
    if (!options.allowPartial && status.last_status === 'partial') errors.push('Partial status is not allowed');
    if (stale) errors.push(`Stale or missing cache_valid_until: ${status.cache_valid_until || 'none'}`);
    if (status.actual_item_count !== null && Number(status.actual_item_count) <= 0) {
      errors.push('No actual source items recorded');
    }
  }

  return {
    sport: options.sport,
    source_name: options.sourceName,
    source_date: options.date,
    db_path: target.dbPath,
    policy,
    status,
    run_counts: runCounts,
    stale,
    ok: errors.length === 0,
    errors,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = validate(options);
  const report = {
    generated_at: timestamp,
    script: 'data-migration/scripts/validate_source_fetch_contract.mjs',
    result,
    ok: result.ok,
  };
  mkdirSync(path.dirname(options.report), { recursive: true });
  writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main();

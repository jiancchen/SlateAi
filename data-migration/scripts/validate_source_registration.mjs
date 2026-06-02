#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRelativeTargetForSport, SPORTS } from './sport_db_schema.mjs';
import { createHash } from 'node:crypto';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const timestamp = new Date().toISOString();

const SOURCE_GROUPS = {
  'mlb-raw-daily': {
    sport: 'mlb',
    sourceName: 'mlb_raw_daily',
    roots: ['data-private/raw/mlb'],
  },
  'mlb-stats-api': {
    sport: 'mlb',
    sourceName: 'mlb_stats_api',
    roots: ['data-private/raw/mlb-stats-api'],
  },
  baseballsavant: {
    sport: 'mlb',
    sourceName: 'baseballsavant',
    roots: ['data-private/raw/baseballsavant'],
  },
  'mlb-odds': {
    sport: 'mlb',
    sourceName: 'mlb_odds',
    roots: ['data-private/raw/odds/fanduel-research', 'data-private/odds/kalshi/mlb', 'data-private/odds/robinhood/mlb'],
  },
  'tennis-reference': {
    sport: 'tennis',
    sourceName: 'tennis_reference',
    roots: ['data-private/reference/tennis'],
  },
  'tennis-odds': {
    sport: 'tennis',
    sourceName: 'tennis_odds',
    roots: ['data-private/odds/robinhood/tennis'],
  },
};

function parseArgs(argv) {
  const args = {
    sport: 'all',
    report: path.join(repoRoot, 'data-migration/reports/phase3_validate_source_registration_2026-06-02.json'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--sport') args.sport = argv[++index];
    else if (arg === '--report') args.report = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.sport !== 'all' && !SPORTS.includes(args.sport)) {
    throw new Error(`--sport must be one of ${SPORTS.join(', ')} or all`);
  }
  return args;
}

function runSqlite(dbPath, sql) {
  return execFileSync('sqlite3', [dbPath], {
    cwd: repoRoot,
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function queryScalar(dbPath, sql) {
  return runSqlite(dbPath, sql).trim();
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function countFiles(root) {
  const absoluteRoot = path.join(repoRoot, root);
  if (!existsSync(absoluteRoot)) return 0;
  let count = 0;
  const stack = [absoluteRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.DS_Store') continue;
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolutePath);
      else if (entry.isFile()) count += 1;
    }
  }
  return count;
}

function appendMigrationEvent(groupReport, options) {
  const eventPath = path.join(repoRoot, 'data-migration/migration_events.jsonl');
  const event = {
    event_id: `phase3-source-registration-validation-${groupReport.source}-${timestamp.replaceAll(/[:.]/g, '-')}`,
    timestamp,
    phase: '3',
    area: `${groupReport.sport}_source_snapshot_validation`,
    source: groupReport.roots.map((root) => root.root).join(','),
    target: `${groupReport.target}:source_snapshots`,
    parser_module: 'none',
    migration_script: 'data-migration/scripts/validate_source_registration.mjs',
    validation: groupReport.ok
      ? `${groupReport.actual_count}/${groupReport.expected_count} source snapshots validated`
      : `source snapshot mismatch expected ${groupReport.expected_count}, got ${groupReport.actual_count}`,
    status_from: 'backfilled',
    status_to: groupReport.ok ? 'validated' : 'blocked',
    report_path: path.relative(repoRoot, options.report),
    checksum: groupReport.content_hash_coverage_checksum,
    notes: groupReport.ok
      ? `Source snapshot registration validated for ${groupReport.source}.`
      : `Source snapshot registration mismatch for ${groupReport.source}.`,
  };
  writeFileSync(eventPath, `${JSON.stringify(event)}\n`, { flag: 'a' });
}

function validateGroup(source, group) {
  const target = repoRelativeTargetForSport(group.sport, repoRoot);
  const expectedCount = group.roots.reduce((sum, root) => sum + countFiles(root), 0);
  const actualCount = Number(
    queryScalar(
      target.absoluteDbPath,
      `select count(*) from source_snapshots where source_name = ${sqlString(group.sourceName)};`,
    ),
  );
  const nonNullHashCount = Number(
    queryScalar(
      target.absoluteDbPath,
      `select count(*) from source_snapshots where source_name = ${sqlString(group.sourceName)} and content_hash is not null and length(content_hash) = 64;`,
    ),
  );
  const datedCount = Number(
    queryScalar(
      target.absoluteDbPath,
      `select count(*) from source_snapshots where source_name = ${sqlString(group.sourceName)} and source_date is not null;`,
    ),
  );
  const checksumInput = `${source}|${expectedCount}|${actualCount}|${nonNullHashCount}|${datedCount}`;
  const contentHashCoverageChecksum = createHash('sha256').update(checksumInput).digest('hex');

  return {
    source,
    source_name: group.sourceName,
    sport: group.sport,
    target: target.dbPath,
    roots: group.roots.map((root) => ({
      root,
      exists: existsSync(path.join(repoRoot, root)),
      file_count: countFiles(root),
    })),
    expected_count: expectedCount,
    actual_count: actualCount,
    content_hash_count: nonNullHashCount,
    dated_count: datedCount,
    content_hash_coverage_checksum: contentHashCoverageChecksum,
    ok: actualCount === expectedCount && nonNullHashCount === actualCount,
  };
}

const options = parseArgs(process.argv.slice(2));
const selectedGroups = Object.entries(SOURCE_GROUPS).filter(
  ([, group]) => options.sport === 'all' || options.sport === group.sport,
);

mkdirSync(path.dirname(options.report), { recursive: true });
const report = {
  generated_at: timestamp,
  phase: '3',
  script: 'data-migration/scripts/validate_source_registration.mjs',
  sport_filter: options.sport,
  groups: selectedGroups.map(([source, group]) => validateGroup(source, group)),
};
report.ok = report.groups.every((group) => group.ok);
report.total_expected_count = report.groups.reduce((sum, group) => sum + group.expected_count, 0);
report.total_actual_count = report.groups.reduce((sum, group) => sum + group.actual_count, 0);

for (const groupReport of report.groups) appendMigrationEvent(groupReport, options);

for (const sport of SPORTS) {
  const sportGroups = report.groups.filter((group) => group.sport === sport);
  if (sportGroups.length === 0) continue;
  const target = repoRelativeTargetForSport(sport, repoRoot);
  mkdirSync(target.absoluteChecksDir, { recursive: true });
  const checkPath = path.join(target.absoluteChecksDir, 'phase3_source_registration_validation_2026-06-02.json');
  writeFileSync(
    checkPath,
    `${JSON.stringify(
      {
        generated_at: report.generated_at,
        phase: report.phase,
        script: report.script,
        sport,
        groups: sportGroups,
        ok: sportGroups.every((group) => group.ok),
      },
      null,
      2,
    )}\n`,
  );
}

writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${options.report}`);
console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exit(1);

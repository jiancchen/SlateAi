#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRelativeTargetForSport, SPORTS } from './sport_db_schema.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const timestamp = new Date().toISOString();

const SOURCE_GROUPS = {
  'mlb-raw-daily': {
    sport: 'mlb',
    sourceName: 'mlb_raw_daily',
    parserModule: 'pipeline/sources/mlb/stats-api/parse.mjs',
    roots: ['data-private/raw/mlb'],
  },
  'mlb-stats-api': {
    sport: 'mlb',
    sourceName: 'mlb_stats_api',
    parserModule: 'pipeline/sources/mlb/stats-api/parse.mjs',
    roots: ['data-private/raw/mlb-stats-api'],
  },
  baseballsavant: {
    sport: 'mlb',
    sourceName: 'baseballsavant',
    parserModule: 'pipeline/sources/mlb/baseballsavant/parse.mjs',
    roots: ['data-private/raw/baseballsavant'],
  },
  'mlb-odds': {
    sport: 'mlb',
    sourceName: 'mlb_odds',
    parserModule: 'pipeline/sources/mlb/{fanduel,kalshi,robinhood}/parse.mjs',
    roots: ['data-private/raw/odds/fanduel-research', 'data-private/odds/kalshi/mlb', 'data-private/odds/robinhood/mlb'],
  },
  'tennis-reference': {
    sport: 'tennis',
    sourceName: 'tennis_reference',
    parserModule: 'pipeline/sources/tennis/{flashscore,sofascore,livesport,rankings}/parse.mjs',
    roots: ['data-private/reference/tennis'],
  },
  'tennis-odds': {
    sport: 'tennis',
    sourceName: 'tennis_odds',
    parserModule: 'pipeline/sources/tennis/{fanduel,robinhood}/parse.mjs',
    roots: ['data-private/odds/robinhood/tennis'],
  },
};

function parseArgs(argv) {
  const args = {
    sport: 'all',
    source: 'all',
    dryRun: false,
    report: path.join(repoRoot, 'data-migration/reports/phase3_source_registration_2026-06-02.json'),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--sport') args.sport = argv[++index];
    else if (arg === '--source') args.source = argv[++index];
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--report') args.report = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.sport !== 'all' && !SPORTS.includes(args.sport)) {
    throw new Error(`--sport must be one of ${SPORTS.join(', ')} or all`);
  }
  if (args.source !== 'all' && !SOURCE_GROUPS[args.source]) {
    throw new Error(`--source must be one of ${Object.keys(SOURCE_GROUPS).join(', ')} or all`);
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

function sha256Text(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function collectFiles(root) {
  const absoluteRoot = path.join(repoRoot, root);
  if (!existsSync(absoluteRoot)) return [];
  const files = [];
  const stack = [absoluteRoot];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.DS_Store') continue;
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolutePath);
      else if (entry.isFile()) files.push(absolutePath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function sourceDateFromPath(localPath) {
  const match = localPath.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  return match ? match[1] : null;
}

function contentTypeFromPath(localPath) {
  const ext = path.extname(localPath).toLowerCase();
  if (ext === '.json' || ext === '.jsonl') return 'application/json';
  if (ext === '.csv') return 'text/csv';
  if (ext === '.html' || ext === '.htm') return 'text/html';
  if (ext === '.txt' || ext === '.md') return 'text/plain';
  if (ext === '.db' || ext === '.sqlite') return 'application/vnd.sqlite3';
  return ext ? `file/${ext.slice(1)}` : 'application/octet-stream';
}

function snapshotForFile(group, absolutePath, root) {
  const localPath = path.relative(repoRoot, absolutePath);
  const stats = statSync(absolutePath);
  const contentHash = sha256File(absolutePath);
  const sourceSnapshotId = sha256Text(`${group.sourceName}|${localPath}`).slice(0, 32);
  return {
    source_snapshot_id: `${group.sport}-${sourceSnapshotId}`,
    source_name: group.sourceName,
    sport: group.sport,
    source_url: null,
    local_path: localPath,
    captured_at: stats.mtime.toISOString(),
    source_date: sourceDateFromPath(localPath),
    content_hash: contentHash,
    content_type: contentTypeFromPath(localPath),
    status: 'captured',
    notes: JSON.stringify({
      root,
      parser_module: group.parserModule,
      size_bytes: stats.size,
      registered_at: timestamp,
    }),
  };
}

function selectGroups(options) {
  return Object.entries(SOURCE_GROUPS)
    .filter(([groupKey, group]) => options.source === 'all' || options.source === groupKey)
    .filter(([, group]) => options.sport === 'all' || options.sport === group.sport)
    .map(([groupKey, group]) => ({ groupKey, ...group }));
}

function registerGroup(group, options) {
  const target = repoRelativeTargetForSport(group.sport, repoRoot);
  const rootReports = [];
  const snapshots = [];

  for (const root of group.roots) {
    const files = collectFiles(root);
    rootReports.push({
      root,
      exists: existsSync(path.join(repoRoot, root)),
      file_count: files.length,
    });
    for (const filePath of files) snapshots.push(snapshotForFile(group, filePath, root));
  }

  const planned = snapshots.length;
  let insertedOrUpdated = 0;
  let existingBefore = 0;

  if (existsSync(target.absoluteDbPath)) {
    existingBefore = Number(
      queryScalar(
        target.absoluteDbPath,
        `select count(*) from source_snapshots where source_name = ${sqlString(group.sourceName)};`,
      ),
    );
  }

  if (!options.dryRun && planned > 0) {
    const sql = [
      'begin;',
      ...snapshots.map(
        (snapshot) => `insert into source_snapshots (
          source_snapshot_id,
          source_name,
          sport,
          source_url,
          local_path,
          captured_at,
          source_date,
          content_hash,
          content_type,
          status,
          notes
        ) values (
          ${sqlString(snapshot.source_snapshot_id)},
          ${sqlString(snapshot.source_name)},
          ${sqlString(snapshot.sport)},
          ${sqlString(snapshot.source_url)},
          ${sqlString(snapshot.local_path)},
          ${sqlString(snapshot.captured_at)},
          ${sqlString(snapshot.source_date)},
          ${sqlString(snapshot.content_hash)},
          ${sqlString(snapshot.content_type)},
          ${sqlString(snapshot.status)},
          ${sqlString(snapshot.notes)}
        ) on conflict(source_snapshot_id) do update set
          captured_at = excluded.captured_at,
          source_date = excluded.source_date,
          content_hash = excluded.content_hash,
          content_type = excluded.content_type,
          status = excluded.status,
          notes = excluded.notes;`,
      ),
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
        ${sqlString(`phase3-source-registration-${group.groupKey}-${timestamp.replaceAll(/[:.]/g, '-')}`)},
        ${sqlString(group.sport)},
        '3',
        'data-migration/scripts/register_source_folder.mjs',
        ${sqlString(group.roots.join(','))},
        ${sqlString(target.dbPath + ':source_snapshots')},
        'registered',
        0,
        ${planned},
        ${planned},
        null,
        0,
        null,
        ${sqlString(path.relative(repoRoot, options.report))},
        ${sqlString(timestamp)},
        ${sqlString(timestamp)},
        ${sqlString(`Registered source snapshots for ${group.groupKey}.`)}
      );`,
      'commit;',
    ].join('\n');
    runSqlite(target.absoluteDbPath, sql);
    insertedOrUpdated = planned;
  }

  const existingAfter =
    !options.dryRun && existsSync(target.absoluteDbPath)
      ? Number(
          queryScalar(
            target.absoluteDbPath,
            `select count(*) from source_snapshots where source_name = ${sqlString(group.sourceName)};`,
          ),
        )
      : existingBefore;

  return {
    source: group.groupKey,
    source_name: group.sourceName,
    sport: group.sport,
    parser_module: group.parserModule,
    target: target.dbPath,
    roots: rootReports,
    dry_run: options.dryRun,
    planned_source_snapshots: planned,
    existing_before: existingBefore,
    written_source_snapshots: insertedOrUpdated,
    existing_after: existingAfter,
    sample_paths: snapshots.slice(0, 5).map((snapshot) => snapshot.local_path),
    ok: rootReports.every((root) => root.exists),
  };
}

function appendMigrationEvent(groupReport, options) {
  const eventPath = path.join(repoRoot, 'data-migration/migration_events.jsonl');
  const event = {
    event_id: `phase3-source-registration-${groupReport.source}-${timestamp.replaceAll(/[:.]/g, '-')}${options.dryRun ? '-dry-run' : ''}`,
    timestamp,
    phase: '3',
    area: `${groupReport.sport}_source_snapshot_registration`,
    source: groupReport.roots.map((root) => root.root).join(','),
    target: `${groupReport.target}:source_snapshots`,
    parser_module: groupReport.parser_module,
    migration_script: 'data-migration/scripts/register_source_folder.mjs',
    validation: options.dryRun
      ? 'dry-run only'
      : `${groupReport.written_source_snapshots} source snapshots registered`,
    status_from: 'not_started',
    status_to: options.dryRun ? 'planned' : 'backfilled',
    report_path: path.relative(repoRoot, options.report),
    checksum: null,
    notes: options.dryRun
      ? `Dry-run source registration for ${groupReport.source}.`
      : `Registered raw/source file receipts for ${groupReport.source}.`,
  };
  writeFileSync(eventPath, `${JSON.stringify(event)}\n`, { flag: 'a' });
}

const options = parseArgs(process.argv.slice(2));
const groups = selectGroups(options);

if (groups.length === 0) {
  throw new Error('No source groups selected.');
}

mkdirSync(path.dirname(options.report), { recursive: true });
const report = {
  generated_at: timestamp,
  phase: '3',
  script: 'data-migration/scripts/register_source_folder.mjs',
  dry_run: options.dryRun,
  source_filter: options.source,
  sport_filter: options.sport,
  groups: groups.map((group) => registerGroup(group, options)),
};
report.ok = report.groups.every((group) => group.ok);
report.total_source_snapshots = report.groups.reduce((sum, group) => sum + group.planned_source_snapshots, 0);

for (const groupReport of report.groups) appendMigrationEvent(groupReport, options);

writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${options.report}`);
console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exit(1);

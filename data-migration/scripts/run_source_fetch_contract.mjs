#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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
    sourceFamily: 'stats-api',
    parserModule: 'pipeline/sources/mlb/stats-api/parse.mjs',
    roots: ['data-private/raw/mlb'],
  },
  'mlb-stats-api': {
    sport: 'mlb',
    sourceName: 'mlb_stats_api',
    sourceFamily: 'stats-api',
    parserModule: 'pipeline/sources/mlb/stats-api/parse.mjs',
    roots: ['data-private/raw/mlb-stats-api'],
  },
  baseballsavant: {
    sport: 'mlb',
    sourceName: 'baseballsavant',
    sourceFamily: 'statcast',
    parserModule: 'pipeline/sources/mlb/baseballsavant/parse.mjs',
    roots: ['data-private/raw/baseballsavant'],
  },
  'mlb-odds': {
    sport: 'mlb',
    sourceName: 'mlb_odds',
    sourceFamily: 'markets',
    parserModule: 'pipeline/sources/mlb/{fanduel,kalshi,robinhood}/parse.mjs',
    roots: ['data-private/raw/odds/fanduel-research', 'data-private/odds/kalshi/mlb', 'data-private/odds/robinhood/mlb'],
  },
  'tennis-reference': {
    sport: 'tennis',
    sourceName: 'tennis_reference',
    sourceFamily: 'match-reference',
    parserModule: 'pipeline/sources/tennis/{flashscore,sofascore,livesport,rankings}/parse.mjs',
    roots: ['data-private/reference/tennis'],
  },
  'tennis-odds': {
    sport: 'tennis',
    sourceName: 'tennis_odds',
    sourceFamily: 'markets',
    parserModule: 'pipeline/sources/tennis/{fanduel,robinhood}/parse.mjs',
    roots: ['data-private/odds/robinhood/tennis'],
  },
};

function parseArgs(argv) {
  const args = {
    source: null,
    date: null,
    dryRun: false,
    force: false,
    expectedCount: null,
    report: path.join(repoRoot, 'data-migration/reports/source_fetch_contract_2026-06-02.json'),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--source') args.source = argv[++index];
    else if (arg === '--date') args.date = argv[++index];
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--expected-count') args.expectedCount = Number(argv[++index]);
    else if (arg === '--report') args.report = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.source || !SOURCE_GROUPS[args.source]) {
    throw new Error(`--source must be one of ${Object.keys(SOURCE_GROUPS).join(', ')}`);
  }
  if (!args.date || !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    throw new Error('--date is required in YYYY-MM-DD format');
  }
  if (args.expectedCount !== null && (!Number.isFinite(args.expectedCount) || args.expectedCount < 0)) {
    throw new Error('--expected-count must be a non-negative number');
  }
  return args;
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

function contentTypeFromPath(localPath) {
  const ext = path.extname(localPath).toLowerCase();
  if (ext === '.json' || ext === '.jsonl') return 'application/json';
  if (ext === '.csv') return 'text/csv';
  if (ext === '.html' || ext === '.htm') return 'text/html';
  if (ext === '.txt' || ext === '.md') return 'text/plain';
  if (ext === '.db' || ext === '.sqlite') return 'application/vnd.sqlite3';
  return ext ? `file/${ext.slice(1)}` : 'application/octet-stream';
}

function sourceDateFromPath(localPath) {
  const match = localPath.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  return match ? match[1] : null;
}

function loadPolicy(dbPath, group) {
  const rows = queryJson(
    dbPath,
    `select * from source_fetch_policies
     where sport = ${sqlString(group.sport)} and source_name = ${sqlString(group.sourceName)}
     limit 1;`,
  );
  if (rows.length === 0) throw new Error(`Missing source_fetch_policies row for ${group.sport}/${group.sourceName}`);
  const policy = rows[0];
  const ttlOverride = process.env[policy.env_ttl_key];
  const forceEnv = process.env[policy.env_force_key];
  const disableEnv = process.env[policy.env_disable_key];
  return {
    ...policy,
    effective_ttl_hours: ttlOverride ? Number(ttlOverride) : Number(policy.default_ttl_hours),
    force_fetch: forceEnv === '1' || forceEnv === 'true',
    disabled: disableEnv === '1' || disableEnv === 'true',
  };
}

function loadCurrentStatus(dbPath, group, date) {
  const rows = queryJson(
    dbPath,
    `select * from source_fetch_status
     where sport = ${sqlString(group.sport)}
       and source_name = ${sqlString(group.sourceName)}
       and source_date = ${sqlString(date)}
     limit 1;`,
  );
  return rows[0] || null;
}

function isFresh(statusRow, policy) {
  if (!statusRow || !statusRow.cache_valid_until || !statusRow.last_success_at) return false;
  if (!['success', 'partial', 'skipped_cache'].includes(statusRow.last_status)) return false;
  return Date.parse(statusRow.cache_valid_until) > Date.now();
}

function snapshotForFile(group, absolutePath, root, date) {
  const localPath = path.relative(repoRoot, absolutePath);
  const stats = statSync(absolutePath);
  const contentHash = sha256File(absolutePath);
  const pathDate = sourceDateFromPath(localPath);
  const sourceSnapshotId = sha256Text(`${group.sourceName}|${localPath}`).slice(0, 32);
  return {
    source_snapshot_id: `${group.sport}-${sourceSnapshotId}`,
    source_name: group.sourceName,
    sport: group.sport,
    source_url: null,
    local_path: localPath,
    captured_at: stats.mtime.toISOString(),
    source_date: pathDate || date,
    content_hash: contentHash,
    content_type: contentTypeFromPath(localPath),
    status: 'captured',
    notes: JSON.stringify({
      root,
      parser_module: group.parserModule,
      size_bytes: stats.size,
      registered_at: timestamp,
      fetch_contract_pilot: true,
      path_date: pathDate,
      requested_date: date,
    }),
  };
}

function filesForSourceDate(group, date) {
  const rootReports = [];
  const datedFiles = [];
  let undatedFileCount = 0;
  let totalFileCount = 0;

  for (const root of group.roots) {
    const absoluteRoot = path.join(repoRoot, root);
    const exists = existsSync(absoluteRoot);
    const files = collectFiles(root);
    totalFileCount += files.length;
    rootReports.push({ root, exists, file_count: files.length });
    for (const filePath of files) {
      const localPath = path.relative(repoRoot, filePath);
      const pathDate = sourceDateFromPath(localPath);
      if (pathDate === date) datedFiles.push({ filePath, root });
      else if (!pathDate) undatedFileCount += 1;
    }
  }

  return {
    rootReports,
    datedFiles,
    totalFileCount,
    undatedFileCount,
  };
}

function completenessFor(actualCount, expectedCount) {
  if (expectedCount === null || expectedCount === undefined) return 'unknown';
  return actualCount >= expectedCount ? 'complete' : actualCount > 0 ? 'incomplete' : 'not_applicable';
}

function statusForActual(actualCount, completenessStatus, disabled) {
  if (disabled) return 'disabled';
  if (actualCount <= 0) return 'missing';
  if (completenessStatus === 'incomplete') return 'partial';
  return 'success';
}

function addHours(dateText, hours) {
  return new Date(Date.parse(dateText) + hours * 60 * 60 * 1000).toISOString();
}

function upsertRunAndStatusSql({ group, policy, date, run, status }) {
  const details = JSON.stringify(run.details, null, 0);
  const statusNotes = JSON.stringify(status.notes, null, 0);
  return [
    `insert into source_fetch_runs (
      source_fetch_run_id,
      sport,
      source_name,
      source_family,
      source_date,
      run_reason,
      requested_url,
      cache_status,
      cache_ttl_hours,
      previous_success_at,
      status,
      completeness_status,
      expected_item_count,
      actual_item_count,
      missing_item_count,
      source_snapshot_id,
      started_at,
      finished_at,
      error_code,
      error_message,
      details_json
    ) values (
      ${sqlString(run.run_id)},
      ${sqlString(group.sport)},
      ${sqlString(group.sourceName)},
      ${sqlString(group.sourceFamily)},
      ${sqlString(date)},
      ${sqlString(run.reason)},
      null,
      ${sqlString(run.cache_status)},
      ${policy.effective_ttl_hours},
      ${sqlString(run.previous_success_at)},
      ${sqlString(run.status)},
      ${sqlString(run.completeness_status)},
      ${run.expected_item_count === null ? 'null' : run.expected_item_count},
      ${run.actual_item_count === null ? 'null' : run.actual_item_count},
      ${run.missing_item_count === null ? 'null' : run.missing_item_count},
      ${sqlString(run.source_snapshot_id)},
      ${sqlString(run.started_at)},
      ${sqlString(run.finished_at)},
      ${sqlString(run.error_code)},
      ${sqlString(run.error_message)},
      ${sqlString(details)}
    );`,
    `insert into source_fetch_status (
      source_fetch_status_id,
      sport,
      source_name,
      source_family,
      source_date,
      last_fetch_run_id,
      last_attempt_at,
      last_success_at,
      last_status,
      last_completeness_status,
      cache_valid_until,
      expected_item_count,
      actual_item_count,
      missing_item_count,
      unresolved_count,
      updated_at,
      notes
    ) values (
      ${sqlString(`${group.sport}:${group.sourceName}:${date}`)},
      ${sqlString(group.sport)},
      ${sqlString(group.sourceName)},
      ${sqlString(group.sourceFamily)},
      ${sqlString(date)},
      ${sqlString(run.run_id)},
      ${sqlString(status.last_attempt_at)},
      ${sqlString(status.last_success_at)},
      ${sqlString(status.last_status)},
      ${sqlString(status.last_completeness_status)},
      ${sqlString(status.cache_valid_until)},
      ${status.expected_item_count === null ? 'null' : status.expected_item_count},
      ${status.actual_item_count === null ? 'null' : status.actual_item_count},
      ${status.missing_item_count === null ? 'null' : status.missing_item_count},
      ${status.unresolved_count === null ? 'null' : status.unresolved_count},
      ${sqlString(status.updated_at)},
      ${sqlString(statusNotes)}
    )
    on conflict (sport, source_name, source_date) do update set
      source_family = excluded.source_family,
      last_fetch_run_id = excluded.last_fetch_run_id,
      last_attempt_at = excluded.last_attempt_at,
      last_success_at = excluded.last_success_at,
      last_status = excluded.last_status,
      last_completeness_status = excluded.last_completeness_status,
      cache_valid_until = excluded.cache_valid_until,
      expected_item_count = excluded.expected_item_count,
      actual_item_count = excluded.actual_item_count,
      missing_item_count = excluded.missing_item_count,
      unresolved_count = excluded.unresolved_count,
      updated_at = excluded.updated_at,
      notes = excluded.notes;`,
  ];
}

function snapshotUpsertSql(snapshot) {
  return `insert into source_snapshots (
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
    notes = excluded.notes;`;
}

function appendMigrationEvent(event) {
  appendFileSync(path.join(repoRoot, 'data-migration/migration_events.jsonl'), `${JSON.stringify(event)}\n`);
}

function runPilot(group, options) {
  if (!SPORTS.includes(group.sport)) throw new Error(`Unknown sport: ${group.sport}`);
  const target = repoRelativeTargetForSport(group.sport, repoRoot);
  const policy = loadPolicy(target.absoluteDbPath, group);
  const currentStatus = loadCurrentStatus(target.absoluteDbPath, group, options.date);
  const disabled = policy.disabled;
  const force = options.force || policy.force_fetch;
  const fresh = !force && !disabled && isFresh(currentStatus, policy);
  const startedAt = timestamp;
  const runId = `source-fetch-${group.sourceName}-${options.date}-${startedAt.replaceAll(/[:.]/g, '-')}`;
  const previousSuccessAt = currentStatus?.last_success_at || null;

  let snapshots = [];
  let sourceScan = { rootReports: [], datedFiles: [], totalFileCount: 0, undatedFileCount: 0 };
  let runStatus = 'skipped_cache';
  let completenessStatus = currentStatus?.last_completeness_status || 'not_applicable';
  let expectedItemCount = options.expectedCount;
  let actualItemCount = currentStatus?.actual_item_count ?? null;
  let missingItemCount = currentStatus?.missing_item_count ?? null;
  let sourceSnapshotId = currentStatus?.last_source_snapshot_id || null;
  let cacheStatus = 'hit';
  let reason = 'fresh_cache';
  let errorCode = null;
  let errorMessage = null;

  if (disabled) {
    runStatus = 'disabled';
    completenessStatus = 'not_applicable';
    cacheStatus = 'disabled';
    reason = 'disabled_by_env';
    actualItemCount = 0;
    missingItemCount = expectedItemCount === null ? null : expectedItemCount;
  } else if (!fresh) {
    sourceScan = filesForSourceDate(group, options.date);
    snapshots = sourceScan.datedFiles.map(({ filePath, root }) => snapshotForFile(group, filePath, root, options.date));
    actualItemCount = snapshots.length;
    completenessStatus = completenessFor(actualItemCount, expectedItemCount);
    runStatus = statusForActual(actualItemCount, completenessStatus, false);
    missingItemCount = expectedItemCount === null ? null : Math.max(expectedItemCount - actualItemCount, 0);
    sourceSnapshotId = snapshots[0]?.source_snapshot_id || null;
    cacheStatus = previousSuccessAt ? 'stale' : 'miss';
    reason = force ? 'force_refresh' : previousSuccessAt ? 'stale_refresh' : 'initial_refresh';
    if (runStatus === 'missing') {
      errorCode = 'source_payload_missing';
      errorMessage = `No ${group.sourceName} files found for ${options.date}`;
    }
  }

  const finishedAt = new Date().toISOString();
  const cacheValidUntil =
    ['success', 'partial', 'skipped_cache'].includes(runStatus)
      ? fresh && currentStatus?.cache_valid_until
        ? currentStatus.cache_valid_until
        : addHours(finishedAt, policy.effective_ttl_hours)
      : null;
  const lastSuccessAt =
    runStatus === 'success' || runStatus === 'partial'
      ? finishedAt
      : runStatus === 'skipped_cache'
        ? previousSuccessAt
        : null;

  const run = {
    run_id: runId,
    reason,
    cache_status: cacheStatus,
    previous_success_at: previousSuccessAt,
    status: runStatus,
    completeness_status: completenessStatus,
    expected_item_count: expectedItemCount,
    actual_item_count: actualItemCount,
    missing_item_count: missingItemCount,
    source_snapshot_id: sourceSnapshotId,
    started_at: startedAt,
    finished_at: finishedAt,
    error_code: errorCode,
    error_message: errorMessage,
    details: {
      parser_module: group.parserModule,
      roots: group.roots,
      root_reports: sourceScan.rootReports,
      total_file_count: sourceScan.totalFileCount,
      dated_file_count: snapshots.length,
      undated_file_count: sourceScan.undatedFileCount,
      sample_paths: snapshots.slice(0, 8).map((snapshot) => snapshot.local_path),
      dry_run: options.dryRun,
      force,
      disabled,
      policy: {
        run_rule: policy.run_rule,
        ttl_hours: policy.effective_ttl_hours,
        max_stale_hours: policy.max_stale_hours,
        env_ttl_key: policy.env_ttl_key,
        env_force_key: policy.env_force_key,
        env_disable_key: policy.env_disable_key,
      },
      note: 'Pilot fetch contract records source/cache status from the local raw archive. Typed parser wiring is the next Phase 9B substep.',
    },
  };

  const status = {
    last_attempt_at: finishedAt,
    last_success_at: lastSuccessAt,
    last_status: runStatus,
    last_completeness_status: completenessStatus,
    cache_valid_until: cacheValidUntil,
    expected_item_count: expectedItemCount,
    actual_item_count: actualItemCount,
    missing_item_count: missingItemCount,
    unresolved_count: null,
    updated_at: finishedAt,
    notes: {
      cache_status: cacheStatus,
      run_reason: reason,
      parser_module: group.parserModule,
      source_family: group.sourceFamily,
      typed_parser_wired: false,
    },
  };

  if (!options.dryRun) {
    const sql = [
      'begin;',
      ...snapshots.map(snapshotUpsertSql),
      ...upsertRunAndStatusSql({ group, policy, date: options.date, run, status }),
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
        ${sqlString(`phase9-source-fetch-${group.sourceName}-${options.date}-${timestamp.replaceAll(/[:.]/g, '-')}`)},
        ${sqlString(group.sport)},
        '9',
        'data-migration/scripts/run_source_fetch_contract.mjs',
        ${sqlString(group.roots.join(','))},
        ${sqlString(`${target.dbPath}:source_fetch_runs,source_fetch_status,source_snapshots`)},
        ${sqlString(runStatus)},
        0,
        ${actualItemCount === null ? 0 : actualItemCount},
        ${snapshots.length + 2},
        0,
        ${fresh ? 1 : 0},
        null,
        ${sqlString(path.relative(repoRoot, options.report))},
        ${sqlString(startedAt)},
        ${sqlString(finishedAt)},
        ${sqlString(`Recorded source fetch status for ${group.sourceName} ${options.date}.`)}
      );`,
      'commit;',
    ].join('\n');
    runSqlite(target.absoluteDbPath, sql);
  }

  return {
    source: options.source,
    source_name: group.sourceName,
    source_family: group.sourceFamily,
    sport: group.sport,
    date: options.date,
    target: target.dbPath,
    dry_run: options.dryRun,
    run,
    status,
    snapshots_planned: snapshots.length,
    ok: !['failed', 'missing'].includes(runStatus),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const group = SOURCE_GROUPS[options.source];
  const result = runPilot(group, options);
  const report = {
    generated_at: timestamp,
    phase: '9B',
    script: 'data-migration/scripts/run_source_fetch_contract.mjs',
    result,
    ok: result.ok,
  };

  mkdirSync(path.dirname(options.report), { recursive: true });
  writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
  appendMigrationEvent({
    event_id: `phase9-source-fetch-${group.sourceName}-${options.date}-${timestamp.replaceAll(/[:.]/g, '-')}${options.dryRun ? '-dry-run' : ''}`,
    timestamp,
    phase: '9B',
    area: `${group.sport}_${group.sourceName}_fetch_contract_pilot`,
    source: group.roots.join(','),
    target: `${result.target}:source_fetch_runs,source_fetch_status`,
    parser_module: group.parserModule,
    migration_script: 'data-migration/scripts/run_source_fetch_contract.mjs',
    validation: options.dryRun ? 'dry-run only' : `${result.run.status}/${result.run.completeness_status}`,
    status_from: 'not_started',
    status_to: options.dryRun ? 'planned' : result.run.status,
    report_path: path.relative(repoRoot, options.report),
    checksum: null,
    notes: 'Fetch contract pilot only. Typed parser wiring remains the next Phase 9B substep.',
  });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main();

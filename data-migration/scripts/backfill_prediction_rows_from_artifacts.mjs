#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRelativeTargetForSport, SPORTS } from './sport_db_schema.mjs';
import { predictionRowsFromArtifact, readJsonArtifact, sha256Text } from '../../pipeline/sources/shared/model-artifacts/parse.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const timestamp = new Date().toISOString();

function parseArgs(argv) {
  const args = {
    sport: 'all',
    dryRun: false,
    report: path.join(repoRoot, 'data-migration/reports/phase4_prediction_rows_2026-06-02.json'),
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
  return output ? JSON.parse(output) : [];
}

function queryScalar(dbPath, sql) {
  return runSqlite(dbPath, [], sql).trim();
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNumber(value) {
  if (value === null || value === undefined || value === '') return 'null';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(numeric) : 'null';
}

function artifactRecordsForSport(sport, dbPath) {
  return queryJson(
    dbPath,
    `select
      ma.model_run_id,
      ma.local_path,
      ma.artifact_type,
      mr.run_date,
      mr.model_id
    from model_artifacts ma
    join model_runs mr on mr.model_run_id = ma.model_run_id
    where mr.sport = ${sqlString(sport)}
      and mr.run_type = 'legacy_prediction_artifact'
      and ma.local_path like 'data-private/predictions/%'
    order by ma.local_path;`,
  );
}

function rowsFromArtifactRecord(sport, record) {
  const absolutePath = path.join(repoRoot, record.local_path);
  if (!existsSync(absolutePath)) {
    return {
      record,
      rows: [],
      error: `Missing artifact path ${record.local_path}`,
    };
  }
  const payload = readJsonArtifact(absolutePath);
  const rows = predictionRowsFromArtifact(payload, record.local_path, record.model_run_id, sport);
  return { record, rows, error: null };
}

function insertSqlForMlb(rows) {
  return rows.map((row) => `insert into prediction_rows (
    prediction_row_id,
    model_run_id,
    game_id,
    player_id,
    lane,
    market_type,
    selection,
    predicted_probability,
    projected_value,
    confidence,
    ev_cents,
    price_cents,
    odds_american,
    feature_snapshot_id,
    rationale_json,
    created_at
  ) values (
    ${sqlString(row.prediction_row_id)},
    ${sqlString(row.model_run_id)},
    ${sqlString(row.game_id)},
    ${sqlString(row.player_id)},
    ${sqlString(row.lane)},
    ${sqlString(row.market_type)},
    ${sqlString(row.selection)},
    ${sqlNumber(row.predicted_probability)},
    ${sqlNumber(row.projected_value)},
    ${sqlNumber(row.confidence)},
    ${sqlNumber(row.ev_cents)},
    ${sqlNumber(row.price_cents)},
    ${sqlNumber(row.odds_american)},
    null,
    ${sqlString(row.rationale_json)},
    ${sqlString(timestamp)}
  ) on conflict(prediction_row_id) do update set
    lane = excluded.lane,
    market_type = excluded.market_type,
    selection = excluded.selection,
    predicted_probability = excluded.predicted_probability,
    projected_value = excluded.projected_value,
    confidence = excluded.confidence,
    ev_cents = excluded.ev_cents,
    price_cents = excluded.price_cents,
    odds_american = excluded.odds_american,
    rationale_json = excluded.rationale_json,
    created_at = excluded.created_at;`);
}

function insertSqlForTennis(rows) {
  return rows.map((row) => `insert into prediction_rows (
    prediction_row_id,
    model_run_id,
    match_id,
    player_id,
    lane,
    market_type,
    selection,
    predicted_probability,
    projected_value,
    confidence,
    ev_cents,
    price_cents,
    odds_american,
    feature_snapshot_id,
    rationale_json,
    created_at
  ) values (
    ${sqlString(row.prediction_row_id)},
    ${sqlString(row.model_run_id)},
    ${sqlString(row.match_id)},
    ${sqlString(row.player_id)},
    ${sqlString(row.lane)},
    ${sqlString(row.market_type)},
    ${sqlString(row.selection)},
    ${sqlNumber(row.predicted_probability)},
    ${sqlNumber(row.projected_value)},
    ${sqlNumber(row.confidence)},
    ${sqlNumber(row.ev_cents)},
    ${sqlNumber(row.price_cents)},
    ${sqlNumber(row.odds_american)},
    null,
    ${sqlString(row.rationale_json)},
    ${sqlString(timestamp)}
  ) on conflict(prediction_row_id) do update set
    lane = excluded.lane,
    market_type = excluded.market_type,
    selection = excluded.selection,
    predicted_probability = excluded.predicted_probability,
    projected_value = excluded.projected_value,
    confidence = excluded.confidence,
    ev_cents = excluded.ev_cents,
    price_cents = excluded.price_cents,
    odds_american = excluded.odds_american,
    rationale_json = excluded.rationale_json,
    created_at = excluded.created_at;`);
}

function backfillSport(sport, options) {
  const target = repoRelativeTargetForSport(sport, repoRoot);
  const records = artifactRecordsForSport(sport, target.absoluteDbPath);
  const parsedArtifacts = records.map((record) => rowsFromArtifactRecord(sport, record));
  const rows = parsedArtifacts.flatMap((artifact) => artifact.rows);
  const zeroRowArtifacts = parsedArtifacts
    .filter((artifact) => artifact.rows.length === 0)
    .map((artifact) => ({ local_path: artifact.record.local_path, error: artifact.error }));
  const before = Number(queryScalar(target.absoluteDbPath, 'select count(*) from prediction_rows;'));

  if (!options.dryRun && rows.length > 0) {
    const inserts = sport === 'mlb' ? insertSqlForMlb(rows) : insertSqlForTennis(rows);
    const sql = [
      'begin;',
      ...inserts,
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
        ${sqlString(`phase4-prediction-rows-${sport}-${timestamp.replaceAll(/[:.]/g, '-')}`)},
        ${sqlString(sport)},
        '4',
        'data-migration/scripts/backfill_prediction_rows_from_artifacts.mjs',
        'model_artifacts:legacy_prediction_artifact',
        ${sqlString(`${target.dbPath}:prediction_rows`)},
        'backfilled',
        0,
        ${records.length},
        ${rows.length},
        null,
        ${zeroRowArtifacts.length},
        ${sqlString(sha256Text(JSON.stringify(rows.map((row) => row.prediction_row_id))))},
        ${sqlString(path.relative(repoRoot, options.report))},
        ${sqlString(timestamp)},
        ${sqlString(timestamp)},
        ${sqlString('Backfilled normalized prediction rows from legacy prediction artifacts.')}
      );`,
      'commit;',
    ].join('\n');
    runSqlite(target.absoluteDbPath, [], sql);
  }

  const after = !options.dryRun ? Number(queryScalar(target.absoluteDbPath, 'select count(*) from prediction_rows;')) : before;
  const laneCounts = rows.reduce((counts, row) => {
    counts[row.lane] = (counts[row.lane] || 0) + 1;
    return counts;
  }, {});

  return {
    sport,
    target: target.dbPath,
    dry_run: options.dryRun,
    artifact_count: records.length,
    planned_prediction_rows: rows.length,
    zero_row_artifacts: zeroRowArtifacts,
    before_prediction_rows: before,
    after_prediction_rows: after,
    lane_counts: laneCounts,
    sample_rows: rows.slice(0, 8).map((row) => ({
      prediction_row_id: row.prediction_row_id,
      model_run_id: row.model_run_id,
      lane: row.lane,
      market_type: row.market_type,
      selection: row.selection,
      confidence: row.confidence,
    })),
    ok: parsedArtifacts.every((artifact) => !artifact.error),
  };
}

function appendMigrationEvent(sportReport, options) {
  const eventPath = path.join(repoRoot, 'data-migration/migration_events.jsonl');
  const event = {
    event_id: `phase4-prediction-row-backfill-${sportReport.sport}-${timestamp.replaceAll(/[:.]/g, '-')}${options.dryRun ? '-dry-run' : ''}`,
    timestamp,
    phase: '4',
    area: `${sportReport.sport}_prediction_row_backfill`,
    source: 'model_artifacts:legacy_prediction_artifact',
    target: `${sportReport.target}:prediction_rows`,
    parser_module: `pipeline/sources/${sportReport.sport}/model-artifacts/parse.mjs`,
    migration_script: 'data-migration/scripts/backfill_prediction_rows_from_artifacts.mjs',
    validation: options.dryRun
      ? 'dry-run only'
      : `${sportReport.planned_prediction_rows} prediction rows backfilled`,
    status_from: 'not_started',
    status_to: options.dryRun ? 'planned' : 'backfilled',
    report_path: path.relative(repoRoot, options.report),
    checksum: sha256Text(JSON.stringify(sportReport.lane_counts)),
    notes: options.dryRun
      ? `Dry-run prediction row backfill for ${sportReport.sport}.`
      : `Backfilled prediction rows for ${sportReport.sport}; ${sportReport.zero_row_artifacts.length} artifacts emitted no rows.`,
  };
  writeFileSync(eventPath, `${JSON.stringify(event)}\n`, { flag: 'a' });
}

const options = parseArgs(process.argv.slice(2));
const sports = options.sport === 'all' ? SPORTS : [options.sport];
mkdirSync(path.dirname(options.report), { recursive: true });

const report = {
  generated_at: timestamp,
  phase: '4',
  script: 'data-migration/scripts/backfill_prediction_rows_from_artifacts.mjs',
  dry_run: options.dryRun,
  sports: sports.map((sport) => backfillSport(sport, options)),
};
report.ok = report.sports.every((sport) => sport.ok);
report.total_prediction_rows = report.sports.reduce((sum, sport) => sum + sport.planned_prediction_rows, 0);

for (const sportReport of report.sports) appendMigrationEvent(sportReport, options);

writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${options.report}`);
console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exit(1);

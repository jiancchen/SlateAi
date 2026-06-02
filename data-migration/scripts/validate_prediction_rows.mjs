#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
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
    report: path.join(repoRoot, 'data-migration/reports/phase4_validate_prediction_rows_2026-06-02.json'),
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

function artifactRecordsForSport(sport, dbPath) {
  return queryJson(
    dbPath,
    `select
      ma.model_run_id,
      ma.local_path
    from model_artifacts ma
    join model_runs mr on mr.model_run_id = ma.model_run_id
    where mr.sport = ${sqlString(sport)}
      and mr.run_type = 'legacy_prediction_artifact'
      and ma.local_path like 'data-private/predictions/%'
    order by ma.local_path;`,
  );
}

function expectedRowsForSport(sport, dbPath) {
  const records = artifactRecordsForSport(sport, dbPath);
  const rows = [];
  const zeroRowArtifacts = [];
  for (const record of records) {
    const absolutePath = path.join(repoRoot, record.local_path);
    if (!existsSync(absolutePath)) {
      zeroRowArtifacts.push({ local_path: record.local_path, error: 'missing file' });
      continue;
    }
    const payload = readJsonArtifact(absolutePath);
    const parsedRows = predictionRowsFromArtifact(payload, record.local_path, record.model_run_id, sport);
    if (parsedRows.length === 0) zeroRowArtifacts.push({ local_path: record.local_path, error: null });
    rows.push(...parsedRows);
  }
  return { records, rows, zeroRowArtifacts };
}

function dbLaneCounts(dbPath) {
  return Object.fromEntries(
    queryJson(dbPath, `select lane, count(*) as count from prediction_rows group by lane order by lane;`).map((row) => [
      row.lane,
      Number(row.count),
    ]),
  );
}

function rowLaneCounts(rows) {
  return rows.reduce((counts, row) => {
    counts[row.lane] = (counts[row.lane] || 0) + 1;
    return counts;
  }, {});
}

function sortedObject(value) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

function validateSport(sport) {
  const target = repoRelativeTargetForSport(sport, repoRoot);
  const expected = expectedRowsForSport(sport, target.absoluteDbPath);
  const expectedLaneCounts = rowLaneCounts(expected.rows);
  const actual = {
    prediction_rows: Number(queryScalar(target.absoluteDbPath, 'select count(*) from prediction_rows;')),
    phase4_prediction_row_runs: Number(
      queryScalar(
        target.absoluteDbPath,
        `select count(*) from migration_runs where sport = ${sqlString(sport)} and phase = '4' and script_path = 'data-migration/scripts/backfill_prediction_rows_from_artifacts.mjs' and status = 'backfilled';`,
      ),
    ),
    lane_counts: dbLaneCounts(target.absoluteDbPath),
  };
  const mismatches = [];
  if (actual.prediction_rows !== expected.rows.length) {
    mismatches.push({ table: 'prediction_rows', expected: expected.rows.length, actual: actual.prediction_rows });
  }
  if (JSON.stringify(sortedObject(actual.lane_counts)) !== JSON.stringify(sortedObject(expectedLaneCounts))) {
    mismatches.push({
      table: 'prediction_rows.lane_counts',
      expected: sortedObject(expectedLaneCounts),
      actual: sortedObject(actual.lane_counts),
    });
  }
  if (actual.phase4_prediction_row_runs < 1) {
    mismatches.push({ table: 'migration_runs.phase4_prediction_rows', expected: 1, actual: actual.phase4_prediction_row_runs });
  }
  return {
    sport,
    target: target.dbPath,
    artifact_count: expected.records.length,
    expected_prediction_rows: expected.rows.length,
    actual,
    expected_lane_counts: expectedLaneCounts,
    zero_row_artifacts: expected.zeroRowArtifacts,
    checksum: sha256Text(JSON.stringify(expected.rows.map((row) => row.prediction_row_id))),
    mismatches,
    ok: mismatches.length === 0,
  };
}

function appendMigrationEvent(sportReport, options) {
  const eventPath = path.join(repoRoot, 'data-migration/migration_events.jsonl');
  const event = {
    event_id: `phase4-prediction-row-validation-${sportReport.sport}-${timestamp.replaceAll(/[:.]/g, '-')}`,
    timestamp,
    phase: '4',
    area: `${sportReport.sport}_prediction_row_validation`,
    source: 'model_artifacts:legacy_prediction_artifact',
    target: `${sportReport.target}:prediction_rows`,
    parser_module: `pipeline/sources/${sportReport.sport}/model-artifacts/parse.mjs`,
    migration_script: 'data-migration/scripts/validate_prediction_rows.mjs',
    validation: sportReport.ok
      ? `${sportReport.actual.prediction_rows}/${sportReport.expected_prediction_rows} prediction rows validated`
      : `prediction row mismatches: ${JSON.stringify(sportReport.mismatches)}`,
    status_from: 'backfilled',
    status_to: sportReport.ok ? 'validated' : 'blocked',
    report_path: path.relative(repoRoot, options.report),
    checksum: sportReport.checksum,
    notes: sportReport.ok
      ? `Prediction row backfill validated for ${sportReport.sport}.`
      : `Prediction row backfill failed validation for ${sportReport.sport}.`,
  };
  writeFileSync(eventPath, `${JSON.stringify(event)}\n`, { flag: 'a' });
}

const options = parseArgs(process.argv.slice(2));
const sports = options.sport === 'all' ? SPORTS : [options.sport];
mkdirSync(path.dirname(options.report), { recursive: true });

const report = {
  generated_at: timestamp,
  phase: '4',
  script: 'data-migration/scripts/validate_prediction_rows.mjs',
  sport_filter: options.sport,
  sports: sports.map(validateSport),
};
report.ok = report.sports.every((sport) => sport.ok);
report.total_prediction_rows = report.sports.reduce((sum, sport) => sum + sport.expected_prediction_rows, 0);

for (const sportReport of report.sports) appendMigrationEvent(sportReport, options);

writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${options.report}`);
console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exit(1);

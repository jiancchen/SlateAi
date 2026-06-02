#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRelativeTargetForSport, SPORTS } from './sport_db_schema.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const timestamp = new Date().toISOString();

const PREDICTION_GROUPS = {
  mlb: [
    'data-private/predictions/mlb-home-runs',
    'data-private/predictions/mlb-market-fitness',
    'data-private/predictions/mlb-player-props',
    'data-private/predictions/mlb-player-props-legacy',
    'data-private/predictions/mlb-reliever-shadow',
    'data-private/predictions/mlb-sides',
  ],
  tennis: ['data-private/predictions/tennis'],
};

function parseArgs(argv) {
  const args = {
    sport: 'all',
    report: path.join(repoRoot, 'data-migration/reports/phase4_validate_model_artifacts_2026-06-02.json'),
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

function collectJsonFiles(root) {
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
      else if (entry.isFile() && entry.name.endsWith('.json')) files.push(absolutePath);
    }
  }
  return files;
}

function countModelRunDirs(sport) {
  const root = path.join(repoRoot, 'data-private/model-runs', sport);
  if (!existsSync(root)) return { runs: 0, artifacts: 0 };
  let runs = 0;
  let artifacts = 0;
  for (const modelEntry of readdirSync(root, { withFileTypes: true })) {
    if (!modelEntry.isDirectory()) continue;
    const modelDir = path.join(root, modelEntry.name);
    for (const dateEntry of readdirSync(modelDir, { withFileTypes: true })) {
      if (!dateEntry.isDirectory()) continue;
      const runDir = path.join(modelDir, dateEntry.name);
      if (!existsSync(path.join(runDir, 'run.json'))) continue;
      runs += 1;
      artifacts += collectJsonFiles(path.relative(repoRoot, runDir)).length;
    }
  }
  return { runs, artifacts };
}

function countPredictionArtifacts(sport) {
  let files = 0;
  for (const root of PREDICTION_GROUPS[sport] || []) files += collectJsonFiles(root).length;
  return { runs: files, artifacts: files };
}

function validateSport(sport) {
  const target = repoRelativeTargetForSport(sport, repoRoot);
  const modelRunDirCounts = countModelRunDirs(sport);
  const predictionCounts = countPredictionArtifacts(sport);
  const expected = {
    model_runs: modelRunDirCounts.runs + predictionCounts.runs,
    model_artifacts: modelRunDirCounts.artifacts + predictionCounts.artifacts,
  };
  const actual = {
    model_runs: Number(queryScalar(target.absoluteDbPath, 'select count(*) from model_runs;')),
    model_artifacts: Number(queryScalar(target.absoluteDbPath, 'select count(*) from model_artifacts;')),
    hashed_artifacts: Number(
      queryScalar(target.absoluteDbPath, 'select count(*) from model_artifacts where content_hash is not null and length(content_hash) = 64;'),
    ),
    phase4_migration_runs: Number(
      queryScalar(
        target.absoluteDbPath,
        `select count(*) from migration_runs where sport = ${sqlString(sport)} and phase = '4' and status = 'backfilled';`,
      ),
    ),
  };
  const mismatches = [];
  if (actual.model_runs !== expected.model_runs) {
    mismatches.push({ table: 'model_runs', expected: expected.model_runs, actual: actual.model_runs });
  }
  if (actual.model_artifacts !== expected.model_artifacts) {
    mismatches.push({ table: 'model_artifacts', expected: expected.model_artifacts, actual: actual.model_artifacts });
  }
  if (actual.hashed_artifacts !== actual.model_artifacts) {
    mismatches.push({ table: 'model_artifacts.content_hash', expected: actual.model_artifacts, actual: actual.hashed_artifacts });
  }
  if (actual.phase4_migration_runs < 1) {
    mismatches.push({ table: 'migration_runs.phase4', expected: 1, actual: actual.phase4_migration_runs });
  }
  return {
    sport,
    target: target.dbPath,
    expected,
    actual,
    model_run_dir_counts: modelRunDirCounts,
    prediction_artifact_counts: predictionCounts,
    mismatches,
    ok: mismatches.length === 0,
  };
}

function appendMigrationEvent(sportReport, options) {
  const eventPath = path.join(repoRoot, 'data-migration/migration_events.jsonl');
  const event = {
    event_id: `phase4-model-artifact-validation-${sportReport.sport}-${timestamp.replaceAll(/[:.]/g, '-')}`,
    timestamp,
    phase: '4',
    area: `${sportReport.sport}_model_artifact_validation`,
    source: 'data-private/model-runs,data-private/predictions',
    target: `${sportReport.target}:model_runs,model_artifacts`,
    parser_module: `pipeline/sources/${sportReport.sport}/model-artifacts/parse.mjs`,
    migration_script: 'data-migration/scripts/validate_model_artifacts.mjs',
    validation: sportReport.ok
      ? `${sportReport.actual.model_runs}/${sportReport.expected.model_runs} model runs and ${sportReport.actual.model_artifacts}/${sportReport.expected.model_artifacts} artifacts validated`
      : `model artifact mismatches: ${JSON.stringify(sportReport.mismatches)}`,
    status_from: 'backfilled',
    status_to: sportReport.ok ? 'validated' : 'blocked',
    report_path: path.relative(repoRoot, options.report),
    checksum: null,
    notes: sportReport.ok
      ? `Model artifact backfill validated for ${sportReport.sport}.`
      : `Model artifact backfill failed validation for ${sportReport.sport}.`,
  };
  writeFileSync(eventPath, `${JSON.stringify(event)}\n`, { flag: 'a' });
}

const options = parseArgs(process.argv.slice(2));
const sports = options.sport === 'all' ? SPORTS : [options.sport];
mkdirSync(path.dirname(options.report), { recursive: true });

const report = {
  generated_at: timestamp,
  phase: '4',
  script: 'data-migration/scripts/validate_model_artifacts.mjs',
  sport_filter: options.sport,
  sports: sports.map(validateSport),
};
report.ok = report.sports.every((sport) => sport.ok);

for (const sportReport of report.sports) appendMigrationEvent(sportReport, options);

writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${options.report}`);
console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exit(1);

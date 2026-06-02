#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRelativeTargetForSport, SPORTS } from './sport_db_schema.mjs';
import {
  artifactRow,
  inferArtifactType,
  modelRunFromManifest,
  modelRunFromPredictionArtifact,
  readJsonArtifact,
  sha256Text,
} from '../../pipeline/sources/shared/model-artifacts/parse.mjs';

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
    type: 'all',
    dryRun: false,
    report: path.join(repoRoot, 'data-migration/reports/phase4_model_artifacts_2026-06-02.json'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--sport') args.sport = argv[++index];
    else if (arg === '--type') args.type = argv[++index];
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--report') args.report = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.sport !== 'all' && !SPORTS.includes(args.sport)) {
    throw new Error(`--sport must be one of ${SPORTS.join(', ')} or all`);
  }
  if (!['all', 'model-runs', 'predictions'].includes(args.type)) {
    throw new Error('--type must be all, model-runs, or predictions');
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
  return files.sort((left, right) => left.localeCompare(right));
}

function collectModelRunDirs(sport) {
  const root = path.join(repoRoot, 'data-private/model-runs', sport);
  if (!existsSync(root)) return [];
  const dirs = [];
  for (const modelEntry of readdirSync(root, { withFileTypes: true })) {
    if (!modelEntry.isDirectory()) continue;
    const modelDir = path.join(root, modelEntry.name);
    for (const dateEntry of readdirSync(modelDir, { withFileTypes: true })) {
      if (!dateEntry.isDirectory()) continue;
      const runDir = path.join(modelDir, dateEntry.name);
      const runPath = path.join(runDir, 'run.json');
      if (existsSync(runPath)) dirs.push(runDir);
    }
  }
  return dirs.sort((left, right) => left.localeCompare(right));
}

function localPath(absolutePath) {
  return path.relative(repoRoot, absolutePath);
}

function modelRunRowsFromModelRuns(sport) {
  const rows = [];
  for (const runDir of collectModelRunDirs(sport)) {
    const runPath = path.join(runDir, 'run.json');
    const runLocalPath = localPath(runPath);
    const manifest = readJsonArtifact(runPath);
    const modelRun = modelRunFromManifest(manifest, runLocalPath);
    modelRun.sport = modelRun.sport || sport;

    const artifacts = collectJsonFiles(localPath(runDir)).map((artifactPath) => {
      const artifactLocalPath = localPath(artifactPath);
      let payload = null;
      try {
        payload = readJsonArtifact(artifactPath);
      } catch {
        payload = null;
      }
      const manifestRole = manifest.artifacts?.find((artifact) => artifact.path === artifactLocalPath)?.role || null;
      return artifactRow(modelRun.model_run_id, artifactLocalPath, payload, manifestRole);
    });

    rows.push({
      source_group: 'model-runs',
      modelRun,
      artifacts,
    });
  }
  return rows;
}

function artifactKindFromPredictionPath(sport, absolutePath) {
  const local = localPath(absolutePath);
  const root = PREDICTION_GROUPS[sport].find((candidate) => local.startsWith(`${candidate}/`));
  return root ? path.basename(root) : 'predictions';
}

function modelRunRowsFromPredictionArtifacts(sport) {
  const rows = [];
  for (const root of PREDICTION_GROUPS[sport] || []) {
    for (const absolutePath of collectJsonFiles(root)) {
      const artifactLocalPath = localPath(absolutePath);
      const payload = readJsonArtifact(absolutePath);
      const artifactKind = artifactKindFromPredictionPath(sport, absolutePath);
      const modelRun = modelRunFromPredictionArtifact(payload, artifactLocalPath, sport, artifactKind);
      rows.push({
        source_group: 'predictions',
        modelRun,
        artifacts: [artifactRow(modelRun.model_run_id, artifactLocalPath, payload, inferArtifactType(artifactLocalPath, payload))],
      });
    }
  }
  return rows;
}

function upsertSqlForRows(rows, reportPath) {
  const statements = ['begin;'];
  for (const row of rows) {
    const run = row.modelRun;
    statements.push(`insert into model_runs (
      model_run_id,
      sport,
      model_id,
      model_version,
      run_date,
      run_type,
      status,
      cartridge_path,
      manifest_path,
      input_hash,
      output_hash,
      created_at,
      notes
    ) values (
      ${sqlString(run.model_run_id)},
      ${sqlString(run.sport)},
      ${sqlString(run.model_id)},
      ${sqlString(run.model_version)},
      ${sqlString(run.run_date)},
      ${sqlString(run.run_type)},
      ${sqlString(run.status)},
      ${sqlString(run.cartridge_path)},
      ${sqlString(run.manifest_path)},
      ${sqlString(run.input_hash)},
      ${sqlString(run.output_hash)},
      ${sqlString(run.created_at)},
      ${sqlString(run.notes)}
    ) on conflict(model_run_id) do update set
      model_id = excluded.model_id,
      model_version = excluded.model_version,
      run_date = excluded.run_date,
      run_type = excluded.run_type,
      status = excluded.status,
      cartridge_path = excluded.cartridge_path,
      manifest_path = excluded.manifest_path,
      input_hash = excluded.input_hash,
      output_hash = excluded.output_hash,
      created_at = excluded.created_at,
      notes = excluded.notes;`);

    for (const artifact of row.artifacts) {
      statements.push(`insert into model_artifacts (
        artifact_id,
        model_run_id,
        artifact_type,
        local_path,
        content_hash,
        created_at
      ) values (
        ${sqlString(artifact.artifact_id)},
        ${sqlString(artifact.model_run_id)},
        ${sqlString(artifact.artifact_type)},
        ${sqlString(artifact.local_path)},
        ${sqlString(artifact.content_hash)},
        ${sqlString(artifact.created_at)}
      ) on conflict(artifact_id) do update set
        artifact_type = excluded.artifact_type,
        local_path = excluded.local_path,
        content_hash = excluded.content_hash,
        created_at = excluded.created_at;`);
    }
  }
  const bySport = rows[0]?.modelRun?.sport || 'unknown';
  statements.push(`insert into migration_runs (
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
    ${sqlString(`phase4-model-artifacts-${bySport}-${timestamp.replaceAll(/[:.]/g, '-')}`)},
    ${sqlString(bySport)},
    '4',
    'data-migration/scripts/backfill_model_artifacts.mjs',
    'data-private/model-runs,data-private/predictions',
    ${sqlString(`sql-${bySport}.db:model_runs,model_artifacts`)},
    'backfilled',
    0,
    ${rows.length},
    ${rows.length},
    null,
    0,
    ${sqlString(sha256Text(JSON.stringify(rows.map((row) => row.modelRun.model_run_id))))},
    ${sqlString(path.relative(repoRoot, reportPath))},
    ${sqlString(timestamp)},
    ${sqlString(timestamp)},
    'Backfilled model run and artifact references.'
  );`);
  statements.push('commit;');
  return statements.join('\n');
}

function backfillSport(sport, options) {
  const target = repoRelativeTargetForSport(sport, repoRoot);
  const rows = [
    ...(options.type === 'all' || options.type === 'model-runs' ? modelRunRowsFromModelRuns(sport) : []),
    ...(options.type === 'all' || options.type === 'predictions' ? modelRunRowsFromPredictionArtifacts(sport) : []),
  ];
  const artifactCount = rows.reduce((sum, row) => sum + row.artifacts.length, 0);

  const before = existsSync(target.absoluteDbPath)
    ? {
        model_runs: Number(queryScalar(target.absoluteDbPath, 'select count(*) from model_runs;')),
        model_artifacts: Number(queryScalar(target.absoluteDbPath, 'select count(*) from model_artifacts;')),
      }
    : { model_runs: 0, model_artifacts: 0 };

  if (!options.dryRun && rows.length > 0) {
    runSqlite(target.absoluteDbPath, upsertSqlForRows(rows, options.report));
  }

  const after =
    !options.dryRun && existsSync(target.absoluteDbPath)
      ? {
          model_runs: Number(queryScalar(target.absoluteDbPath, 'select count(*) from model_runs;')),
          model_artifacts: Number(queryScalar(target.absoluteDbPath, 'select count(*) from model_artifacts;')),
        }
      : before;

  return {
    sport,
    target: target.dbPath,
    dry_run: options.dryRun,
    selected_type: options.type,
    planned_model_runs: rows.length,
    planned_artifacts: artifactCount,
    before,
    after,
    sample_model_runs: rows.slice(0, 8).map((row) => ({
      model_run_id: row.modelRun.model_run_id,
      model_id: row.modelRun.model_id,
      run_date: row.modelRun.run_date,
      run_type: row.modelRun.run_type,
      artifacts: row.artifacts.length,
    })),
    ok: true,
  };
}

function appendMigrationEvent(sportReport, options) {
  const eventPath = path.join(repoRoot, 'data-migration/migration_events.jsonl');
  const event = {
    event_id: `phase4-model-artifact-backfill-${sportReport.sport}-${timestamp.replaceAll(/[:.]/g, '-')}${options.dryRun ? '-dry-run' : ''}`,
    timestamp,
    phase: '4',
    area: `${sportReport.sport}_model_artifact_backfill`,
    source: 'data-private/model-runs,data-private/predictions',
    target: `${sportReport.target}:model_runs,model_artifacts`,
    parser_module: `pipeline/sources/${sportReport.sport}/model-artifacts/parse.mjs`,
    migration_script: 'data-migration/scripts/backfill_model_artifacts.mjs',
    validation: options.dryRun
      ? 'dry-run only'
      : `${sportReport.planned_model_runs} model runs and ${sportReport.planned_artifacts} artifacts backfilled`,
    status_from: 'not_started',
    status_to: options.dryRun ? 'planned' : 'backfilled',
    report_path: path.relative(repoRoot, options.report),
    checksum: sha256Text(JSON.stringify(sportReport.sample_model_runs)),
    notes: options.dryRun
      ? `Dry-run model artifact backfill for ${sportReport.sport}.`
      : `Backfilled model artifact references for ${sportReport.sport}.`,
  };
  writeFileSync(eventPath, `${JSON.stringify(event)}\n`, { flag: 'a' });
}

const options = parseArgs(process.argv.slice(2));
const sports = options.sport === 'all' ? SPORTS : [options.sport];
mkdirSync(path.dirname(options.report), { recursive: true });

const report = {
  generated_at: timestamp,
  phase: '4',
  script: 'data-migration/scripts/backfill_model_artifacts.mjs',
  dry_run: options.dryRun,
  selected_type: options.type,
  sports: sports.map((sport) => backfillSport(sport, options)),
};
report.ok = report.sports.every((sport) => sport.ok);
report.total_model_runs = report.sports.reduce((sum, sport) => sum + sport.planned_model_runs, 0);
report.total_artifacts = report.sports.reduce((sum, sport) => sum + sport.planned_artifacts, 0);

for (const sportReport of report.sports) appendMigrationEvent(sportReport, options);

writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${options.report}`);
console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exit(1);

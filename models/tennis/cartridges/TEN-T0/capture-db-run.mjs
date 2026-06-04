import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  artifactRow,
  predictionRowsFromArtifact,
  readJsonArtifact,
  sha256File,
  sha256Text
} from '../../../../pipeline/sources/shared/model-artifacts/parse.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..', '..')
const DEFAULT_DB = 'data-private/warehouse/sports/tennis/sql-tennis.db'
const MODEL_ID = 'TEN-T0'
const MODEL_VERSION = 'TEN-W1/TEN-F0/TEN-T0/TEN-E0'
const CARTRIDGE_PATH = 'models/tennis/cartridges/TEN-T0/runner.mjs'
const MANIFEST_PATH = 'models/tennis/cartridges/TEN-T0/manifest.json'

const parseArgs = () => {
  const options = {
    date: '',
    dbPath: DEFAULT_DB,
    predictionsPath: '',
    modulePath: '',
    contextPath: '',
    runId: '',
    dryRun: false
  }
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = args[index + 1] || ''
      index += 1
    } else if (arg === '--db-path') {
      options.dbPath = args[index + 1] || options.dbPath
      index += 1
    } else if (arg === '--predictions') {
      options.predictionsPath = args[index + 1] || ''
      index += 1
    } else if (arg === '--module') {
      options.modulePath = args[index + 1] || ''
      index += 1
    } else if (arg === '--context') {
      options.contextPath = args[index + 1] || ''
      index += 1
    } else if (arg === '--run-id') {
      options.runId = args[index + 1] || ''
      index += 1
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('Pass --date YYYY-MM-DD')
  if (!options.predictionsPath) throw new Error('Pass --predictions path/to/predictions.json')
  return options
}

const absolutePath = (filePath) => path.resolve(ROOT, filePath)

const localOrAbsolutePath = (filePath) => {
  if (!filePath) return ''
  const absolute = path.resolve(ROOT, filePath)
  const relative = path.relative(ROOT, absolute)
  return relative.startsWith('..') ? absolute : relative
}

const sqlString = (value) => {
  if (value === null || value === undefined) return 'null'
  return `'${String(value).replaceAll("'", "''")}'`
}

const sqlNumber = (value) => {
  if (value === null || value === undefined || value === '') return 'null'
  const numeric = Number(value)
  return Number.isFinite(numeric) ? String(numeric) : 'null'
}

const runSqlite = (dbPath, sql) =>
  execFileSync('sqlite3', [absolutePath(dbPath)], {
    cwd: ROOT,
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  }).trim()

const queryJson = (dbPath, sql) => {
  const output = execFileSync('sqlite3', ['-json', absolutePath(dbPath), sql], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim()
  return output ? JSON.parse(output) : []
}

const migrationRunSql = ({ options, runId, rows, artifacts, timestamp }) => `
insert into migration_runs (
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
  ${sqlString(`tennis-t0-capture-${options.date}-${timestamp.replaceAll(/[:.]/g, '-')}`)},
  'tennis',
  '4',
  'models/tennis/cartridges/TEN-T0/capture-db-run.mjs',
  ${sqlString(localOrAbsolutePath(options.predictionsPath))},
  ${sqlString(`${options.dbPath}:model_runs,model_artifacts,prediction_rows`)},
  'captured',
  ${options.dryRun ? 1 : 0},
  ${rows.length},
  ${rows.length + artifacts.length + 1},
  null,
  0,
  ${sqlString(sha256Text(JSON.stringify(rows.map((row) => row.prediction_row_id))))},
  null,
  ${sqlString(timestamp)},
  ${sqlString(timestamp)},
  ${sqlString(`Captured ${MODEL_ID} DB-mode run ${runId}.`)}
);`

const insertArtifactSql = (artifact) => `
insert into model_artifacts (
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
  created_at = excluded.created_at;`

const insertPredictionSql = (row, timestamp) => `
insert into prediction_rows (
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
  match_id = excluded.match_id,
  player_id = excluded.player_id,
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
  created_at = excluded.created_at;`

const main = () => {
  const options = parseArgs()
  const predictionsPath = absolutePath(options.predictionsPath)
  if (!fs.existsSync(predictionsPath)) throw new Error(`Missing predictions artifact: ${options.predictionsPath}`)

  const timestamp = new Date().toISOString()
  const payload = readJsonArtifact(predictionsPath)
  const predictionsLocalPath = localOrAbsolutePath(options.predictionsPath)
  const outputHash = sha256File(predictionsPath)
  const runId = options.runId || `tennis-${MODEL_ID}-${options.date}-db`
  const inputParts = [
    options.date,
    options.dbPath,
    options.contextPath ? sha256File(absolutePath(options.contextPath)) : null,
    options.modulePath ? sha256File(absolutePath(options.modulePath)) : null
  ].filter(Boolean)
  const inputHash = sha256Text(inputParts.join('|'))

  const artifacts = [
    { filePath: options.contextPath, role: 'warehouse-context' },
    { filePath: options.modulePath, role: 'site-day-module' },
    { filePath: options.predictionsPath, role: 'prediction-artifact' }
  ]
    .filter((entry) => entry.filePath && fs.existsSync(absolutePath(entry.filePath)))
    .map((entry) => {
      const localPath = localOrAbsolutePath(entry.filePath)
      const artifactPayload = entry.filePath.endsWith('.json') ? readJsonArtifact(absolutePath(entry.filePath)) : null
      return artifactRow(runId, localPath, artifactPayload, entry.role)
    })

  const rows = predictionRowsFromArtifact(payload, predictionsLocalPath, runId, 'tennis')
  const missingMatchIds = rows.filter((row) => String(row.match_id || '').startsWith('legacy-tennis-match-')).length
  const notes = {
    source: 'TEN-T0 db-mode capture',
    predictions_path: predictionsLocalPath,
    total_singles: payload.totalSingles ?? null,
    missing_match_id_rows: missingMatchIds
  }

  if (!options.dryRun) {
    const sql = [
      'begin;',
      `insert into model_runs (
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
        ${sqlString(runId)},
        'tennis',
        ${sqlString(MODEL_ID)},
        ${sqlString(MODEL_VERSION)},
        ${sqlString(options.date)},
        'pregame-db',
        'captured',
        ${sqlString(CARTRIDGE_PATH)},
        ${sqlString(MANIFEST_PATH)},
        ${sqlString(inputHash)},
        ${sqlString(outputHash)},
        ${sqlString(timestamp)},
        ${sqlString(JSON.stringify(notes))}
      ) on conflict(model_run_id) do update set
        model_version = excluded.model_version,
        run_type = excluded.run_type,
        status = excluded.status,
        cartridge_path = excluded.cartridge_path,
        manifest_path = excluded.manifest_path,
        input_hash = excluded.input_hash,
        output_hash = excluded.output_hash,
        created_at = excluded.created_at,
        notes = excluded.notes;`,
      `delete from prediction_rows where model_run_id = ${sqlString(runId)};`,
      ...artifacts.map(insertArtifactSql),
      ...rows.map((row) => insertPredictionSql(row, timestamp)),
      migrationRunSql({ options, runId, rows, artifacts, timestamp }),
      'commit;'
    ].join('\n')
    runSqlite(options.dbPath, sql)
  }

  const storedRows = options.dryRun
    ? []
    : queryJson(
        options.dbPath,
        `select lane, market_type, count(*) as count
         from prediction_rows
         where model_run_id = ${sqlString(runId)}
         group by lane, market_type
         order by lane, market_type;`
      )

  console.log(JSON.stringify({
    date: options.date,
    dbPath: options.dbPath,
    modelRunId: runId,
    dryRun: options.dryRun,
    artifacts: artifacts.length,
    predictionRows: rows.length,
    missingMatchIdRows: missingMatchIds,
    storedRows
  }, null, 2))
}

main()

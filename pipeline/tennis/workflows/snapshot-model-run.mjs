import fs from 'node:fs/promises'
import path from 'node:path'
import {
  activeStack,
  copyJsonArtifact,
  gitInfo,
  inputPathsForDate,
  loadRegistry,
  readJson,
  rootDir,
  runCommand,
  runDirFor,
  runIdFor,
  shellQuote,
  sha256Text,
  sqliteExec,
  sqliteJson,
  stableJson,
  writeJson
} from '../../lib/model-run-utils.mjs'
import { resolveTennisCartridgeFile } from '../../lib/model-cartridge-resolver.mjs'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = { date: '', model: '', mode: 'pregame', skipHealth: false }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = args[index + 1]
      index += 1
    } else if (arg === '--model') {
      options.model = String(args[index + 1] || '').toUpperCase()
      index += 1
    } else if (arg === '--mode') {
      options.mode = args[index + 1]
      index += 1
    } else if (arg === '--skip-health') {
      options.skipHealth = true
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('Pass --date YYYY-MM-DD')
  return options
}

const sourceInventory = ({ manifest, manifestPath, registryPath }) => {
  const manifestFiles = (manifest.sourceFiles || []).map((entry) => ({
    path: entry.path,
    role: entry.role || 'model-source'
  }))
  const frameworkFiles = [
    { path: registryPath || 'models/tennis/registry.json', role: 'model-registry' },
    { path: manifestPath, role: 'model-manifest' },
    { path: manifest.entrypoint || 'models/tennis/cartridges/TEN-T0/runner.mjs', role: 'model-runner-wrapper' },
    { path: manifest.outputContract || 'models/tennis/cartridges/TEN-T0/output-contract.json', role: 'output-contract' },
    { path: manifest.modelDescription || 'models/tennis/cartridges/TEN-T0/model_description.json', role: 'model-description' },
    { path: manifest.modelNotes || 'models/tennis/cartridges/TEN-T0/MODEL_NOTES.md', role: 'model-notes' },
    { path: 'models/tennis/cartridges/TEN-F0/manifest.json', role: 'feature-manifest' },
    { path: manifest.featureContract || 'models/tennis/cartridges/TEN-F0/feature-contract.json', role: 'feature-contract' },
    { path: 'models/tennis/cartridges/TEN-E0/manifest.json', role: 'evaluator-manifest' },
    { path: manifest.metricsContract || 'models/tennis/cartridges/TEN-E0/metrics-contract.json', role: 'metrics-contract' },
    { path: 'pipeline/lib/model-cartridge-resolver.mjs', role: 'cartridge-resolver' },
    { path: 'pipeline/lib/model-run-utils.mjs', role: 'run-snapshot-helper' },
    { path: 'pipeline/lib/warehouse-paths.mjs', role: 'warehouse-path-resolver' },
    { path: 'pipeline/lib/warehouse_paths.py', role: 'warehouse-path-resolver' },
    { path: 'pipeline/tennis/workflows/create-model-run.mjs', role: 'run-create-script' },
    { path: 'pipeline/tennis/workflows/snapshot-model-run.mjs', role: 'run-snapshot-script' },
    { path: 'pipeline/tennis/workflows/check-model-run.mjs', role: 'run-checker' },
    { path: 'pipeline/tennis/research/analyze_kalshi_intramatch.py', role: 'kalshi-intramatch-backtest' },
    { path: 'pipeline/tennis/warehouse/backfill_recent_form_metrics.py', role: 'feature-backfill' },
    { path: 'pipeline/tennis/publish/export_warehouse_context.py', role: 'warehouse-context-export' },
    { path: 'pipeline/tennis/research/model_kalshi_spike.py', role: 'kalshi-spike-model' },
    { path: 'pipeline/tennis/research/model_upset_wins.py', role: 'upset-win-model' },
    { path: 'pipeline/tennis/research/project_kalshi_trade_candidates.py', role: 'kalshi-trade-projection' },
    { path: 'pipeline/tennis/research/multimodel_backtest.py', role: 'multimodel-backtest' },
    { path: 'pipeline/tennis/workflows/health.py', role: 'health-gate' },
    { path: 'pipeline/tennis/workflows/settle-model-run.mjs', role: 'postmatch-settlement' },
    { path: 'pipeline/tennis/research/value_backtest.py', role: 'sportsbook-value-backtest' },
    { path: 'pipeline/tennis/warehouse/tennis_warehouse.py', role: 'warehouse-code' },
    { path: 'pipeline/tennis/warehouse/migrations/TEN-W1/001_add_model_run_tables.sql', role: 'warehouse-migration' },
    { path: 'pipeline/tennis/warehouse/migrations/TEN-W1/002_add_model_run_grade_tables.sql', role: 'warehouse-migration' },
    { path: 'api/src/scripts/export-published-data.ts', role: 'public-exporter' },
    { path: 'scripts/export-public-current.mjs', role: 'public-exporter' },
    { path: 'web/src/lib/archive-loaders.ts', role: 'model-history-loader' },
    { path: 'web/src/views/ModelsView.tsx', role: 'model-page-ui' },
    { path: 'web/src/app.css', role: 'model-page-ui' },
    { path: 'tests/tennis_pipeline_test.py', role: 'test-code' },
    { path: 'package.json', role: 'package-scripts' }
  ]
  const byPath = new Map()
  for (const entry of [...manifestFiles, ...frameworkFiles]) {
    if (entry.path) byPath.set(entry.path, entry)
  }
  return Array.from(byPath.values()).sort((left, right) => left.path.localeCompare(right.path))
}

const fileExists = async (filePath) => {
  try {
    await fs.access(path.resolve(rootDir, filePath))
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

const withExistence = async (rows) => Promise.all(rows.map(async (row) => ({
  ...row,
  exists: await fileExists(row.path)
})))

const insertInventoryRows = async ({ runId, table, rows, pathKey, roleKey, existsKey }) => {
  await sqliteExec(`delete from ${table} where run_id = ${shellQuote(runId)}`)
  for (const row of rows) {
    await sqliteExec(`
      insert into ${table}(
        run_id, ${pathKey}, ${roleKey}, sha256, ${existsKey}
      )
      values (
        ${shellQuote(runId)}, ${shellQuote(row.path)}, ${shellQuote(row.role || '')},
        null, ${row.exists ? 1 : 0}
      )
      on conflict(run_id, ${pathKey}) do update set
        ${roleKey} = excluded.${roleKey},
        sha256 = excluded.sha256,
        ${existsKey} = excluded.${existsKey}
    `)
  }
}

const insertOutputRows = async ({ runId, rows }) => {
  await sqliteExec(`delete from tennis_model_run_outputs where run_id = ${shellQuote(runId)}`)
  for (const row of rows) {
    await sqliteExec(`
      insert into tennis_model_run_outputs(run_id, output_path, output_role, sha256)
      values (${shellQuote(runId)}, ${shellQuote(row.path)}, ${shellQuote(row.role || '')}, null)
      on conflict(run_id, output_path) do update set
        output_role = excluded.output_role,
        sha256 = excluded.sha256
    `)
  }
}

const snapshotTrainingRows = async ({ runId, date }) => {
  await sqliteExec(`delete from tennis_model_run_training_rows where run_id = ${shellQuote(runId)}`)
  const rows = await sqliteJson(`select * from tennis_model_training_rows where slate_date = ${shellQuote(date)}`)
  for (const row of rows) {
    const payload = stableJson(row)
    const rowHash = sha256Text(payload)
    await sqliteExec(`
      insert into tennis_model_run_training_rows(
        run_id, row_hash, slate_date, match_id, side, payload_json, label_available
      )
      values (
        ${shellQuote(runId)}, ${shellQuote(rowHash)}, ${shellQuote(row.slate_date || '')},
        ${shellQuote(row.match_id || '')}, ${shellQuote(row.side || row.selection || '')},
        ${shellQuote(payload)}, ${Number(row.training_label_available || row.label_available || 0) ? 1 : 0}
      )
      on conflict(run_id, row_hash) do update set
        payload_json = excluded.payload_json,
        label_available = excluded.label_available
    `)
  }
  return {
    count: rows.length,
    hash: sha256Text(stableJson(rows))
  }
}

const parseHealthChecks = (stdout = '') =>
  String(stdout)
    .split('\n')
    .map((line) => line.match(/^\s*-\s+([^:]+):\s+(.+?)\s*$/))
    .filter(Boolean)
    .map((match) => ({
      name: match[1].trim(),
      status: match[2].trim()
    }))

const main = async () => {
  const options = parseArgs()
  const stack = await activeStack({ model: options.model || null })
  const runId = runIdFor({ date: options.date, stack })
  const model = stack.modelId
  const runDir = runDirFor({ model, date: options.date })
  const registry = await loadRegistry()
  const manifestFile = await resolveTennisCartridgeFile({ modelId: model, fileName: 'manifest.json' })
  const manifestPath = manifestFile.path
  const manifest = await readJson(manifestPath, {})

  const currentRun = await readJson(`${runDir}/run.json`, {
    schemaVersion: 1,
    runId,
    sport: 'tennis',
    slateDate: options.date,
    warehouseVersion: stack.warehouseVersion,
    featureVersion: stack.featureVersion,
    modelId: model,
    evaluatorVersion: stack.evaluatorVersion,
    mode: options.mode,
    status: 'created',
    createdAt: new Date().toISOString()
  })

  const verifier = await runCommand('node', ['pipeline/tennis/workflows/verify-model-snapshot.mjs', '--date', options.date, '--model', model])
  if (!verifier.ok) throw new Error(`Snapshot verifier failed:\n${verifier.stdout}\n${verifier.stderr}`)

  const health = options.skipHealth
    ? { ok: true, skipped: true, reason: 'Skipped by --skip-health.' }
    : await runCommand('npm', ['run', 'data:health:tennis', '--', '--date', options.date, `--${options.mode === 'postmatch' ? 'settled' : 'pregame'}`])
  await writeJson(`${runDir}/health.json`, {
    schemaVersion: 1,
    runId,
    mode: options.mode,
    ok: Boolean(health.ok),
    command: health.command,
    exitCode: health.exitCode,
    checks: parseHealthChecks(health.stdout),
    stdout: health.stdout ?? '',
    stderr: health.stderr ?? ''
  })
  if (!health.ok) throw new Error(`Health gate failed:\n${health.stdout}\n${health.stderr}`)

  const predictionSnapshot = await readJson(`data-private/model-cartridges/tennis/${model}/golden/${options.date}.snapshot.json`, null)
  if (!predictionSnapshot) {
    throw new Error(`Missing required prediction snapshot for ${model} ${options.date}`)
  }
  await writeJson(`${runDir}/predictions.snapshot.json`, predictionSnapshot)
  await copyJsonArtifact({
    from: `data-private/model-cartridges/tennis/${model}/calibration/${options.date}.calibration.json`,
    to: `${runDir}/calibration.json`,
    fallback: { schemaVersion: 1, runId, status: 'missing' }
  })
  await copyJsonArtifact({
    from: `data-private/reports/tennis-multimodel-backtest-through-${options.date}.json`,
    to: `${runDir}/backtest.json`,
    fallback: { schemaVersion: 1, runId, status: 'missing' }
  })
  await writeJson(`${runDir}/grades.json`, {
    schemaVersion: 1,
    runId,
    slateDate: options.date,
    status: options.mode === 'pregame' ? 'not_settled' : 'pending',
    note: 'Pregame snapshot stores a grades placeholder; settled/postmatch runs write lane results separately.'
  })
  const sourceFiles = await withExistence(sourceInventory({ manifest, manifestPath, registryPath: registry.registryPath }))
  const inputFiles = await withExistence(inputPathsForDate(options.date))
  const training = await snapshotTrainingRows({ runId, date: options.date })
  await sqliteExec(`
    insert into tennis_model_run_metrics(run_id, metric_scope, metric_name, metric_value, sample_size, payload_json)
    values (${shellQuote(runId)}, 'training', 'run_scoped_rows', ${training.count}, ${training.count}, ${shellQuote(JSON.stringify(training))})
    on conflict(run_id, metric_scope, metric_name) do update set
      metric_value = excluded.metric_value,
      sample_size = excluded.sample_size,
      payload_json = excluded.payload_json
  `)

  const outputTargets = [
    { path: `${runDir}/predictions.snapshot.json`, role: 'prediction-snapshot' },
    { path: `${runDir}/calibration.json`, role: 'calibration' },
    { path: `${runDir}/backtest.json`, role: 'backtest' },
    { path: `${runDir}/grades.json`, role: 'grades' },
    { path: `${runDir}/health.json`, role: 'health' }
  ]
  const snapshottedAt = new Date().toISOString()
  const git = await gitInfo()
  const { ['locked' + 'At']: _legacySnapshotField, ...baseRun } = currentRun
  const snapshottedRun = {
    ...baseRun,
    runId,
    sport: 'tennis',
    slateDate: options.date,
    warehouseVersion: stack.warehouseVersion,
    featureVersion: stack.featureVersion,
    modelId: model,
    evaluatorVersion: stack.evaluatorVersion,
    status: 'snapshotted',
    mode: options.mode,
    snapshottedAt,
    sourceHash: null,
    inputHash: null,
    outputHash: null,
    sourceFiles: sourceFiles.length,
    inputs: inputFiles.length,
    outputs: outputTargets.length + 1,
    trainingRows: training,
    verifier: {
      ok: verifier.ok,
      command: verifier.command,
      stdout: verifier.stdout,
      stderr: verifier.stderr
    },
    registry: {
      path: registry.registryPath || 'models/tennis/registry.json',
      active: registry.active || null
    },
    modelManifest: {
      path: manifestPath,
      name: manifest.name || null,
      status: manifest.status || null
    },
    artifacts: [...outputTargets, { path: `${runDir}/run.json`, role: 'run-manifest' }],
    notes: `Snapshotted ${model} pregame run for ${options.date}.`,
    git
  }
  await writeJson(`${runDir}/run.json`, snapshottedRun)
  const finalOutputs = [...outputTargets, { path: `${runDir}/run.json`, role: 'run-manifest' }]

  await sqliteExec(`
    insert into tennis_model_runs(
      run_id, slate_date, sport, warehouse_version, feature_version, model_id,
      evaluator_version, mode, status, locked_at, input_hash, source_hash, output_hash,
      git_commit, git_dirty, cartridge_stack_json, notes
    )
    values (
      ${shellQuote(runId)}, ${shellQuote(options.date)}, 'tennis',
      ${shellQuote(stack.warehouseVersion)}, ${shellQuote(stack.featureVersion)}, ${shellQuote(model)},
      ${shellQuote(stack.evaluatorVersion)}, ${shellQuote(options.mode)}, 'snapshotted', ${shellQuote(snapshottedAt)},
      null, null, null,
      ${shellQuote(git.commit || '')}, ${git.dirty ? 1 : 0}, ${shellQuote(JSON.stringify(stack))},
      ${shellQuote('Snapshotted by snapshot-model-run.mjs.')}
    )
    on conflict(run_id) do update set
      mode = excluded.mode,
      status = excluded.status,
      locked_at = excluded.locked_at,
      input_hash = excluded.input_hash,
      source_hash = excluded.source_hash,
      output_hash = excluded.output_hash,
      git_commit = excluded.git_commit,
      git_dirty = excluded.git_dirty,
      cartridge_stack_json = excluded.cartridge_stack_json,
      notes = excluded.notes
  `)
  await insertInventoryRows({
    runId,
    table: 'tennis_model_run_files',
    rows: sourceFiles,
    pathKey: 'file_path',
    roleKey: 'file_role',
    existsKey: 'file_exists'
  })
  await insertInventoryRows({
    runId,
    table: 'tennis_model_run_inputs',
    rows: inputFiles,
    pathKey: 'input_path',
    roleKey: 'input_role',
    existsKey: 'input_exists'
  })
  await insertOutputRows({ runId, rows: finalOutputs })
  await sqliteExec(`
    insert into tennis_model_run_events(run_id, event_type, event_message, payload_json)
    values (
      ${shellQuote(runId)}, 'snapshotted', 'Tennis model run snapshotted.',
      ${shellQuote(JSON.stringify({ sourceFiles: sourceFiles.length, inputs: inputFiles.length, outputs: finalOutputs.length, trainingRows: training.count }))}
    )
  `)

  console.log(JSON.stringify({
    runId,
    runDir: `${rootDir}/${runDir}`,
    status: 'snapshotted',
    sourceFiles: sourceFiles.length,
    inputs: inputFiles.length,
    outputs: finalOutputs.length,
    trainingRows: training.count
  }, null, 2))
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})

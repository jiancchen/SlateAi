import fs from 'node:fs/promises'
import path from 'node:path'
import {
  activeStack,
  inputPathsForDate,
  readJson,
  rootDir,
  runCommand,
  runDirFor,
  runIdFor,
  shellQuote,
  sqliteJson
} from '../../lib/model-run-utils.mjs'
import { resolveTennisCartridgeFile } from '../../lib/model-cartridge-resolver.mjs'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = { date: '', model: '', runId: '', mode: '' }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = args[index + 1]
      index += 1
    } else if (arg === '--model') {
      options.model = String(args[index + 1] || '').toUpperCase()
      index += 1
    } else if (arg === '--run-id') {
      options.runId = args[index + 1] || ''
      index += 1
    } else if (arg === '--mode') {
      options.mode = args[index + 1] || ''
      index += 1
    } else if (arg === '--allow-source-drift') {
      // Kept as a no-op for old commands; source drift is no longer a gate.
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('Pass --date YYYY-MM-DD')
  return options
}

const assertEqual = (actual, expected, label) => {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected ?? 'null'}, got ${actual ?? 'null'}`)
  }
}

const assertPresent = (value, label) => {
  if (value === null || value === undefined || value === '') throw new Error(`${label} is missing`)
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

const sourceInventory = async ({ manifest, manifestPath, registryPath }) => {
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
    { path: 'pipeline/tennis/workflows/settle-model-run.mjs', role: 'postmatch-settlement' },
    { path: 'pipeline/tennis/workflows/health.py', role: 'health-gate' },
    { path: 'api/src/scripts/export-published-data.ts', role: 'public-exporter' },
    { path: 'web/src/views/ModelsView.tsx', role: 'model-page-ui' },
    { path: 'tests/tennis_pipeline_test.py', role: 'test-code' },
    { path: 'package.json', role: 'package-scripts' }
  ]
  const byPath = new Map()
  for (const entry of [...manifestFiles, ...frameworkFiles]) {
    if (entry.path) byPath.set(entry.path, entry)
  }
  return Array.from(byPath.values()).sort((left, right) => left.path.localeCompare(right.path))
}

const verifyInventoryRows = async ({ runId, expected, table, pathKey, label, exact = true, requireExists = true }) => {
  const rows = await sqliteJson(`select ${pathKey} as path from ${table} where run_id = ${shellQuote(runId)} order by ${pathKey}`)
  const actualPaths = rows.map((row) => row.path).sort()
  const expectedPaths = expected.map((row) => row.path).sort()
  if (exact) {
    assertEqual(JSON.stringify(actualPaths), JSON.stringify(expectedPaths), `${label} path set`)
  } else {
    const actualSet = new Set(actualPaths)
    const missingExpected = expectedPaths.filter((entry) => !actualSet.has(entry))
    if (missingExpected.length) {
      throw new Error(`${label} snapshot is missing expected paths: ${missingExpected.slice(0, 5).join(', ')}`)
    }
  }
  if (requireExists) {
    const missing = []
    for (const row of expected) {
      if (!(await fileExists(row.path))) missing.push(row.path)
    }
    if (missing.length) throw new Error(`${label} missing files: ${missing.slice(0, 5).join(', ')}`)
  }
  return rows.length
}

const verifyOutputRows = async ({ runId, runDir }) => {
  const rows = await sqliteJson(`
    select output_path, output_role
    from tennis_model_run_outputs
    where run_id = ${shellQuote(runId)}
    order by output_path
  `)
  const requiredRoles = new Set([
    'prediction-snapshot',
    'calibration',
    'backtest',
    'grades',
    'health',
    'run-manifest'
  ])
  const seenRoles = new Set(rows.map((row) => row.output_role))
  const missingRoles = Array.from(requiredRoles).filter((role) => !seenRoles.has(role))
  if (missingRoles.length) {
    throw new Error(`Output DB rows missing roles: ${missingRoles.join(', ')}`)
  }

  const missingFiles = []
  for (const row of rows) {
    if (!(await fileExists(row.output_path))) missingFiles.push(row.output_path)
  }
  if (missingFiles.length) throw new Error(`Output files missing: ${missingFiles.slice(0, 5).join(', ')}`)

  const runManifestPath = `${runDir}/run.json`
  if (!rows.some((row) => row.output_path === runManifestPath && row.output_role === 'run-manifest')) {
    throw new Error(`Output DB rows missing run manifest path: ${runManifestPath}`)
  }

  return { rows: rows.length }
}

const verifyRequiredMarkets = (snapshot) => {
  const required = [
    { label: 'ML value', type: 'Moneyline' },
    { label: 'Game spread', type: 'Game spread' },
    { label: 'O/U games', type: 'Total games' },
    { label: 'Win a set %', type: 'Win a set' },
    { label: '1st set O/U', type: 'First-set total games' }
  ]
  const missing = []
  for (const match of snapshot.matches || []) {
    const matrix = match.bettingMatrix || []
    for (const requiredRow of required) {
      const found = matrix.some((row) => row.label === requiredRow.label || row.marketType === requiredRow.type)
      if (!found) missing.push(`${match.match || 'unknown match'}: ${requiredRow.label}`)
    }
  }
  if (missing.length) {
    throw new Error(`Prediction snapshot missing required betting rows (${missing.length}): ${missing.slice(0, 5).join('; ')}`)
  }
  return {
    matches: (snapshot.matches || []).length,
    requiredRowsPerMatch: required.length
  }
}

const walkFiles = async (dir) => {
  const absolute = path.resolve(rootDir, dir)
  try {
    const entries = await fs.readdir(absolute, { withFileTypes: true })
    const files = []
    for (const entry of entries) {
      const relative = `${dir}/${entry.name}`
      if (entry.isDirectory()) {
        files.push(...await walkFiles(relative))
      } else if (entry.isFile()) {
        files.push(relative)
      }
    }
    return files
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

const verifyPublicStaticDoesNotLeakPrivatePaths = async (date) => {
  const roots = [
    `published-data/slates/${date}`,
    `web/public/data/slates/${date}`,
    'published-data/model-history',
    'web/public/data/model-history',
    'published-data/current',
    'web/public/data/current'
  ]
  const files = (await Promise.all(roots.map(walkFiles))).flat()
  const textFiles = files.filter((file) => /\.(json|js|txt|md)$/i.test(file))
  const leaks = []
  for (const file of textFiles) {
    const text = await fs.readFile(path.resolve(rootDir, file), 'utf8')
    if (text.includes('data-private') || text.includes('/Users/') || text.includes('TemporaryItems')) {
      leaks.push(file)
    }
  }
  if (leaks.length) throw new Error(`Public/static export references private paths: ${leaks.slice(0, 5).join(', ')}`)
  return { scannedFiles: textFiles.length }
}

const main = async () => {
  const options = parseArgs()
  const stack = await activeStack({ model: options.model || null })
  const model = stack.modelId
  const runId = options.runId || runIdFor({ date: options.date, stack })
  const runDir = runDirFor({ model, date: options.date })

  const snapshotVerifier = await runCommand('node', [
    'pipeline/tennis/workflows/verify-model-snapshot.mjs',
    '--date',
    options.date,
    '--model',
    model
  ])
  if (!snapshotVerifier.ok) {
    throw new Error(`Golden snapshot verifier failed:\n${snapshotVerifier.stdout}\n${snapshotVerifier.stderr}`)
  }

  const run = await readJson(`${runDir}/run.json`)
  const health = await readJson(`${runDir}/health.json`)
  const snapshot = await readJson(`${runDir}/predictions.snapshot.json`)
  const calibration = await readJson(`${runDir}/calibration.json`)
  const backtest = await readJson(`${runDir}/backtest.json`)
  const grades = await readJson(`${runDir}/grades.json`)

  for (const [payload, label] of [
    [run, 'run.json'],
    [health, 'health.json'],
    [snapshot, 'predictions.snapshot.json'],
    [calibration, 'calibration.json'],
    [backtest, 'backtest.json'],
    [grades, 'grades.json']
  ]) {
    assertPresent(payload, label)
  }

  assertEqual(run.runId, runId, 'runId')
  assertEqual(run.sport, 'tennis', 'sport')
  assertEqual(run.slateDate, options.date, 'slateDate')
  assertEqual(run.warehouseVersion, stack.warehouseVersion, 'warehouseVersion')
  assertEqual(run.featureVersion, stack.featureVersion, 'featureVersion')
  assertEqual(run.modelId, model, 'modelId')
  assertEqual(run.evaluatorVersion, stack.evaluatorVersion, 'evaluatorVersion')
  assertEqual(run.status, 'snapshotted', 'run status')
  if (options.mode) assertEqual(run.mode, options.mode, 'mode')

  const dbRunRows = await sqliteJson(`
    select *
    from tennis_model_runs
    where run_id = ${shellQuote(runId)}
  `)
  if (dbRunRows.length !== 1) throw new Error(`Expected one DB run row for ${runId}, found ${dbRunRows.length}`)
  const dbRun = dbRunRows[0]
  for (const key of ['slate_date', 'sport', 'warehouse_version', 'feature_version', 'model_id', 'evaluator_version', 'mode', 'status']) {
    const runKey = {
      slate_date: 'slateDate',
      warehouse_version: 'warehouseVersion',
      feature_version: 'featureVersion',
      model_id: 'modelId',
      evaluator_version: 'evaluatorVersion'
    }[key] || key
    assertEqual(dbRun[key], run[runKey], `DB run ${key}`)
  }

  const registry = await readJson('models/tennis/registry.json')
  const manifestFile = await resolveTennisCartridgeFile({ modelId: model, fileName: 'manifest.json' })
  const manifest = await readJson(manifestFile.path, {})
  const expectedSources = await sourceInventory({
    manifest,
    manifestPath: manifestFile.path,
    registryPath: 'models/tennis/registry.json'
  })
  const expectedInputs = inputPathsForDate(options.date)
  const sourceRows = await verifyInventoryRows({
    runId,
    expected: expectedSources,
    table: 'tennis_model_run_files',
    pathKey: 'file_path',
    label: 'Source snapshot',
    exact: false
  })
  const inputRows = await verifyInventoryRows({
    runId,
    expected: expectedInputs,
    table: 'tennis_model_run_inputs',
    pathKey: 'input_path',
    label: 'Input snapshot',
    requireExists: false
  })
  const output = await verifyOutputRows({ runId, runDir })

  if (!health.ok) throw new Error('health.json is not ok')
  const requiredChecks = ['sourceFiles', 'rankings', 'warehouse', 'sofascore', 'kalshi', 'weather', 'resultsTraining', 'published', 'valueBooks']
  const checkMap = new Map((health.checks || []).map((check) => [check.name, check.status]))
  const badChecks = requiredChecks.filter((name) => checkMap.get(name) !== 'ok')
  if (badChecks.length) throw new Error(`Health checks not ok: ${badChecks.join(', ')}`)

  if (calibration.status === 'missing') throw new Error('Calibration artifact is marked missing')
  if (backtest.status === 'missing') throw new Error('Backtest artifact is marked missing')
  const marketCoverage = verifyRequiredMarkets(snapshot)

  const trainingRows = await sqliteJson(`
    select count(*) as count
    from tennis_model_run_training_rows
    where run_id = ${shellQuote(runId)}
  `)
  if (Number(trainingRows[0]?.count || 0) !== Number(run.trainingRows?.count || 0)) {
    throw new Error(`Training-row snapshot count mismatch: run has ${run.trainingRows?.count}, DB has ${trainingRows[0]?.count}`)
  }

  const publicScan = await verifyPublicStaticDoesNotLeakPrivatePaths(options.date)

  console.log(JSON.stringify({
    runId,
    status: 'checked',
    mode: run.mode,
    modelRegistryStatus: registry.active?.model === model ? 'active model' : 'non-active branch',
    sourceFiles: sourceRows,
    inputs: inputRows,
    outputs: output.rows,
    trainingRows: Number(trainingRows[0]?.count || 0),
    matches: marketCoverage.matches,
    requiredRowsPerMatch: marketCoverage.requiredRowsPerMatch,
    publicFilesScanned: publicScan.scannedFiles
  }, null, 2))
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})

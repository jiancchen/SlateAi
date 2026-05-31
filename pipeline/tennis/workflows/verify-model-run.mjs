import fs from 'node:fs/promises'
import path from 'node:path'
import {
  activeStack,
  aggregateHash,
  fileHash,
  inputPathsForDate,
  readJson,
  rootDir,
  runCommand,
  runDirFor,
  runIdFor,
  shellQuote,
  sqliteJson
} from '../../lib/model-run-utils.mjs'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = { date: '', model: '', runId: '', mode: '', allowSourceDrift: false }
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
      options.allowSourceDrift = true
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

const hashLockEntries = async (entries, label, { allowDrift = false } = {}) => {
  const current = []
  const mismatches = []
  for (const locked of entries || []) {
    const actual = await fileHash(locked.path)
    current.push({
      path: locked.path,
      role: locked.role,
      exists: actual.exists,
      sha256: actual.sha256
    })
    if (Boolean(locked.exists) !== actual.exists || (locked.sha256 || null) !== (actual.sha256 || null)) {
      mismatches.push({
        path: locked.path,
        expectedExists: Boolean(locked.exists),
        actualExists: actual.exists,
        expectedSha256: locked.sha256 || null,
        actualSha256: actual.sha256 || null
      })
    }
  }
  if (mismatches.length) {
    const first = mismatches[0]
    const message = `${label} lock drift: ${first.path} expected ${first.expectedExists ? first.expectedSha256 : 'missing'}, got ${first.actualExists ? first.actualSha256 : 'missing'}`
    if (!allowDrift) throw new Error(message)
  }
  return current
}

const verifyDbRowsMatchLock = ({ lockedRows, dbRows, dbPathKey, dbRoleKey, dbExistsKey, label }) => {
  const byPath = new Map(dbRows.map((row) => [row[dbPathKey], row]))
  const missing = []
  const mismatches = []
  for (const locked of lockedRows || []) {
    const row = byPath.get(locked.path)
    if (!row) {
      missing.push(locked.path)
      continue
    }
    const expectedRole = locked.role || ''
    const actualRole = row[dbRoleKey] || ''
    const expectedExists = Boolean(locked.exists)
    const actualExists = Boolean(row[dbExistsKey])
    if (actualRole !== expectedRole || (row.sha256 || null) !== (locked.sha256 || null) || actualExists !== expectedExists) {
      mismatches.push(locked.path)
    }
  }
  if (missing.length || mismatches.length) {
    throw new Error(`${label} DB rows do not match lock (${missing.length} missing, ${mismatches.length} mismatched)`)
  }
}

const verifyOutputRows = async ({ run, runDir }) => {
  const rows = await sqliteJson(`
    select output_path, output_role, sha256
    from tennis_model_run_outputs
    where run_id = ${shellQuote(run.runId)}
    order by output_path
  `)
  const requiredRoles = new Set([
    'prediction-snapshot',
    'calibration',
    'backtest',
    'grades',
    'health',
    'source-lock',
    'input-lock',
    'run-manifest'
  ])
  const seenRoles = new Set(rows.map((row) => row.output_role))
  const missingRoles = Array.from(requiredRoles).filter((role) => !seenRoles.has(role))
  if (missingRoles.length) {
    throw new Error(`Output DB rows missing roles: ${missingRoles.join(', ')}`)
  }

  const currentRows = []
  const mismatches = []
  for (const row of rows) {
    const actual = await fileHash(row.output_path)
    currentRows.push({
      path: row.output_path,
      role: row.output_role,
      exists: actual.exists,
      sha256: actual.sha256
    })
    if (!actual.exists || actual.sha256 !== row.sha256) {
      mismatches.push(row.output_path)
    }
  }
  if (mismatches.length) {
    throw new Error(`Output file hash drift: ${mismatches[0]}`)
  }

  const outputHash = aggregateHash(currentRows.filter((row) => row.role !== 'run-manifest'))
  assertEqual(outputHash, run.outputHash, 'outputHash')

  const runManifestPath = `${runDir}/run.json`
  if (!rows.some((row) => row.output_path === runManifestPath && row.output_role === 'run-manifest')) {
    throw new Error(`Output DB rows missing run manifest path: ${runManifestPath}`)
  }

  return {
    rows: rows.length,
    hash: outputHash
  }
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
  return {
    scannedFiles: textFiles.length
  }
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
  const sourceLock = await readJson(`${runDir}/files.lock.json`)
  const inputLock = await readJson(`${runDir}/inputs.lock.json`)
  const health = await readJson(`${runDir}/health.json`)
  const snapshot = await readJson(`${runDir}/predictions.snapshot.json`)
  const calibration = await readJson(`${runDir}/calibration.json`)
  const backtest = await readJson(`${runDir}/backtest.json`)
  const grades = await readJson(`${runDir}/grades.json`)

  for (const [payload, label] of [
    [run, 'run.json'],
    [sourceLock, 'files.lock.json'],
    [inputLock, 'inputs.lock.json'],
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
  assertEqual(run.status, 'locked', 'run status')
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
  assertEqual(dbRun.input_hash, run.inputHash, 'DB input_hash')
  assertEqual(dbRun.source_hash, run.sourceHash, 'DB source_hash')
  assertEqual(dbRun.output_hash, run.outputHash, 'DB output_hash')

  assertEqual(sourceLock.runId, runId, 'source lock runId')
  assertEqual(inputLock.runId, runId, 'input lock runId')
  const currentSourceRows = await hashLockEntries(sourceLock.files || [], 'Source', { allowDrift: options.allowSourceDrift })
  const currentInputRows = await hashLockEntries(inputLock.inputs || [], 'Input')
  const sourceHash = aggregateHash(currentSourceRows)
  const inputHash = aggregateHash(currentInputRows)
  if (!options.allowSourceDrift) {
    assertEqual(sourceLock.sourceHash, sourceHash, 'files.lock sourceHash')
    assertEqual(run.sourceHash, sourceHash, 'run sourceHash')
  }
  assertEqual(inputLock.inputHash, inputHash, 'inputs.lock inputHash')
  assertEqual(run.inputHash, inputHash, 'run inputHash')

  const expectedInputPaths = inputPathsForDate(options.date).map((entry) => entry.path).sort()
  const lockedInputPaths = (inputLock.inputs || []).map((entry) => entry.path).sort()
  assertEqual(JSON.stringify(lockedInputPaths), JSON.stringify(expectedInputPaths), 'input lock path set')

  const dbFileRows = await sqliteJson(`select file_path, file_role, sha256, file_exists from tennis_model_run_files where run_id = ${shellQuote(runId)}`)
  verifyDbRowsMatchLock({
    lockedRows: sourceLock.files || [],
    dbRows: dbFileRows,
    dbPathKey: 'file_path',
    dbRoleKey: 'file_role',
    dbExistsKey: 'file_exists',
    label: 'Source lock'
  })
  const dbInputRows = await sqliteJson(`select input_path, input_role, sha256, input_exists from tennis_model_run_inputs where run_id = ${shellQuote(runId)}`)
  verifyDbRowsMatchLock({
    lockedRows: inputLock.inputs || [],
    dbRows: dbInputRows,
    dbPathKey: 'input_path',
    dbRoleKey: 'input_role',
    dbExistsKey: 'input_exists',
    label: 'Input lock'
  })

  const output = await verifyOutputRows({ run, runDir })

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
    status: 'verified',
    mode: run.mode,
    sourceDriftAllowed: options.allowSourceDrift,
    sourceFiles: currentSourceRows.length,
    inputs: currentInputRows.length,
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

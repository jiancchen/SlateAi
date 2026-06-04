import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..', '..')

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: '',
    compareLegacy: false,
    captureDb: false,
    outputDir: '/tmp',
    dbPath: 'data-private/warehouse/sports/tennis/sql-tennis.db'
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = args[index + 1] || ''
      index += 1
    } else if (arg === '--compare-legacy') {
      options.compareLegacy = true
    } else if (arg === '--capture-db') {
      options.captureDb = true
    } else if (arg === '--output-dir') {
      options.outputDir = args[index + 1] || options.outputDir
      index += 1
    } else if (arg === '--db-path') {
      options.dbPath = args[index + 1] || options.dbPath
      index += 1
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new Error('Pass --date YYYY-MM-DD')
  }
  return options
}

const run = (command, args, env = {}) => {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: 'inherit'
  })
  if (result.signal) process.kill(process.pid, result.signal)
  if (result.status) process.exit(result.status)
}

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'))

const comparePredictions = (legacyPath, dbPath) => {
  const legacy = readJson(legacyPath)
  const db = readJson(dbPath)
  const legacyByMatch = new Map((legacy.picks || []).map((row) => [row.match, row]))
  const dbByMatch = new Map((db.picks || []).map((row) => [row.match, row]))
  const shared = [...legacyByMatch.keys()].filter((match) => dbByMatch.has(match))
  const pickChanges = shared
    .filter((match) => legacyByMatch.get(match).pick !== dbByMatch.get(match).pick)
    .map((match) => ({
      match,
      legacyPick: legacyByMatch.get(match).pick,
      dbPick: dbByMatch.get(match).pick,
      legacyConfidence: legacyByMatch.get(match).confidence,
      dbConfidence: dbByMatch.get(match).confidence
    }))
  const confidenceDeltas = shared
    .map((match) => ({
      match,
      delta: Math.abs(Number(legacyByMatch.get(match).confidence) - Number(dbByMatch.get(match).confidence)),
      legacyConfidence: Number(legacyByMatch.get(match).confidence),
      dbConfidence: Number(dbByMatch.get(match).confidence)
    }))
    .sort((left, right) => right.delta - left.delta)
    .slice(0, 10)
  return {
    legacyTotal: legacy.totalSingles,
    dbTotal: db.totalSingles,
    legacyOnly: [...legacyByMatch.keys()].filter((match) => !dbByMatch.has(match)),
    dbOnly: [...dbByMatch.keys()].filter((match) => !legacyByMatch.has(match)),
    pickChangeCount: pickChanges.length,
    pickChanges,
    confidenceDeltas,
    missingMarkets: {
      legacy: (legacy.picks || []).filter((row) => !row.market).length,
      db: (db.picks || []).filter((row) => !row.market).length
    }
  }
}

const main = () => {
  const options = parseArgs()
  fs.mkdirSync(options.outputDir, { recursive: true })
  const contextPath = path.join(options.outputDir, `day-${options.date}-tennis-warehouse-context.generated.json`)
  const dbModulePath = path.join(options.outputDir, `tennis-db-day-${options.date}.js`)
  const dbPredictionsPath = path.join(options.outputDir, `tennis-db-predictions-${options.date}.json`)
  const legacyModulePath = path.join(options.outputDir, `tennis-legacy-day-${options.date}.js`)
  const legacyPredictionsPath = path.join(options.outputDir, `tennis-legacy-predictions-${options.date}.json`)

  run('python3', [
    'pipeline/tennis/publish/export_warehouse_context.py',
    '--date',
    options.date,
    '--output',
    contextPath
  ], {
    SLATE_TENNIS_WAREHOUSE_DB: options.dbPath
  })

  run(process.execPath, [
    'models/tennis/cartridges/TEN-T0/runner.mjs',
    '--date',
    options.date,
    '--skip-preflight',
    '--input-source',
    'db',
    '--db-path',
    options.dbPath,
    '--output',
    dbModulePath,
    '--predictions-output',
    dbPredictionsPath
  ], {
    TENNIS_T0_USE_DB: '1',
    SLATE_TENNIS_WAREHOUSE_DB: options.dbPath
  })

  const report = {
    date: options.date,
    dbPath: options.dbPath,
    contextPath,
    dbModulePath,
    dbPredictionsPath
  }

  if (options.compareLegacy) {
    run(process.execPath, [
      'models/tennis/cartridges/TEN-T0/runner.mjs',
      '--date',
      options.date,
      '--skip-preflight',
      '--output',
      legacyModulePath,
      '--predictions-output',
      legacyPredictionsPath
    ])
    report.legacyModulePath = legacyModulePath
    report.legacyPredictionsPath = legacyPredictionsPath
    report.comparison = comparePredictions(legacyPredictionsPath, dbPredictionsPath)
  }

  if (options.captureDb) {
    run(process.execPath, [
      'models/tennis/cartridges/TEN-T0/capture-db-run.mjs',
      '--date',
      options.date,
      '--db-path',
      options.dbPath,
      '--predictions',
      dbPredictionsPath,
      '--module',
      dbModulePath,
      '--context',
      contextPath
    ], {
      SLATE_TENNIS_WAREHOUSE_DB: options.dbPath
    })
    report.capturedDb = true
  }

  console.log(JSON.stringify(report, null, 2))
}

main()

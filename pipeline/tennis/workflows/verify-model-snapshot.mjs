import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const SNAPSHOT_SCHEMA = 1

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = { date: '', model: 'T0', update: false }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = args[index + 1]
      index += 1
    } else if (arg === '--model') {
      options.model = String(args[index + 1] || '').toUpperCase()
      index += 1
    } else if (arg === '--update') {
      options.update = true
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('Pass --date YYYY-MM-DD')
  return options
}

const readJson = async (filePath, fallback = null) => {
  try {
    return JSON.parse(await fs.readFile(path.resolve(ROOT, filePath), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

const writeJson = async (filePath, payload) => {
  const absolute = path.resolve(ROOT, filePath)
  await fs.mkdir(path.dirname(absolute), { recursive: true })
  await fs.writeFile(absolute, `${JSON.stringify(payload, null, 2)}\n`)
}

const fileHash = async (filePath) => {
  const absolute = path.resolve(ROOT, filePath)
  try {
    const bytes = await fs.readFile(absolute)
    return {
      path: filePath,
      exists: true,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex')
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return {
      path: filePath,
      exists: false,
      sha256: null
    }
  }
}

const manifestPath = ({ model }) => `pipeline/tennis_model_cartridges/${model}/manifest.json`

const inputPathsForDate = (date) => [
  `data-private/reference/tennis/espn-scoreboard-${date}.json`,
  'data-private/reference/tennis/player-rankings.json',
  `web/src/lib/day-${date}-tennis-opponent-quality.generated.json`,
  `web/src/lib/day-${date}-tennis-clay-context.generated.json`,
  `web/src/lib/day-${date}-tennis-warehouse-context.generated.json`,
  `data-private/reference/tennis/fanduel-lines-${date}.json`,
  `data-private/predictions/tennis/${date}-multimodel-ensemble.json`,
  `data-private/predictions/tennis/${date}-derivative-markets.json`,
  `data-private/reports/kalshi-tennis-spike-model-${date}.json`
]

const buildCartridgeLock = async ({ model, date }) => {
  const manifest = await readJson(manifestPath({ model }), {})
  const sourceFiles = await Promise.all((manifest.sourceFiles || []).map(async (entry) => ({
    role: entry.role ?? null,
    path: entry.path,
    expectedSha256: entry.sha256 ?? null,
    ...(await fileHash(entry.path))
  })))
  const inputFiles = await Promise.all(inputPathsForDate(date).map(fileHash))
  return {
    manifest: manifestPath({ model }),
    sourceFiles,
    inputFiles
  }
}

const assertSourceFilesMatchManifest = (lock) => {
  const mismatches = (lock.sourceFiles || []).filter(
    (entry) => entry.expectedSha256 && entry.sha256 !== entry.expectedSha256
  )
  if (mismatches.length) {
    const first = mismatches[0]
    throw new Error(
      `Tennis cartridge source drift: ${first.path} expected ${first.expectedSha256}, got ${first.sha256 || 'missing'}`
    )
  }
}

const roundNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Number(numeric.toFixed(3)) : null
}

const compactRow = (row = {}) => ({
  marketType: row.marketType ?? null,
  label: row.label ?? null,
  selection: row.selection ?? null,
  line: roundNumber(row.line),
  americanOdds: roundNumber(row.americanOdds),
  modelPct: roundNumber(row.modelPct),
  confidence: roundNumber(row.confidence),
  impliedPct: roundNumber(row.impliedPct),
  edgePct: roundNumber(row.edgePct),
  evPer100: roundNumber(row.evPer100),
  netEvPer100: roundNumber(row.netEvPer100),
  expectedGames: roundNumber(row.expectedGames),
  tiebreakRisk: roundNumber(row.tiebreakRisk),
  earlyBreakRisk: roundNumber(row.earlyBreakRisk),
  grade: row.grade ?? row.valueGrade ?? null,
  reason: row.reason ?? null
})

const compactMarket = (market) => {
  if (!market) return null
  return {
    source: market.source ?? null,
    priceAction: market.priceAction ?? null,
    spread: market.spread ?? null,
    totalGames: market.totalGames ?? null,
    moneyline: (market.moneyline || []).map((row) => ({
      name: row.name,
      americanOdds: roundNumber(row.americanOdds),
      impliedPct: roundNumber(row.impliedPct),
      modelPct: roundNumber(row.modelPct),
      edgePct: roundNumber(row.edgePct),
      grossProfitPct: roundNumber(row.grossProfitPct),
      priceBand: row.priceBand ?? null
    }))
  }
}

const buildSnapshot = (predictionPayload, cartridgeLock) => ({
  schemaVersion: SNAPSHOT_SCHEMA,
  modelId: predictionPayload.modelCartridge?.id ?? 'unknown',
  modelCartridge: predictionPayload.modelCartridge ?? null,
  cartridgeLock,
  date: predictionPayload.date,
  source: predictionPayload.source,
  totalSingles: predictionPayload.totalSingles,
  matches: (predictionPayload.picks || []).map((pick) => ({
    rank: pick.rank,
    match: pick.match,
    format: pick.format,
    court: pick.court,
    start: pick.start,
    pick: pick.pick,
    confidence: roundNumber(pick.confidence),
    volatility: roundNumber(pick.volatility),
    tier: pick.tier,
    rationale: pick.rationale,
    weaknessEdge: pick.weaknessEdge
      ? {
          edgeType: pick.weaknessEdge.edgeType ?? null,
          target: pick.weaknessEdge.target ?? null,
          scoreGap: roundNumber(pick.weaknessEdge.scoreGap),
          attackingSide: pick.weaknessEdge.attackingSide ?? null,
          vulnerableSide: pick.weaknessEdge.vulnerableSide ?? null,
          pickWeaknessScore: roundNumber(pick.weaknessEdge.pick?.weaknessScore),
          opponentWeaknessScore: roundNumber(pick.weaknessEdge.opponent?.weaknessScore),
          liveTrigger: pick.weaknessEdge.liveTrigger ?? null,
          spreadRead: pick.weaknessEdge.spreadRead ?? null,
          totalRead: pick.weaknessEdge.totalRead ?? null
        }
      : null,
    totals: pick.totals ?? null,
    bettingMatrix: (pick.bettingMatrix || []).map(compactRow),
    derivativeMarketCase: pick.derivativeMarketCase
      ? {
          matchId: pick.derivativeMarketCase.matchId ?? null,
          derivativeLane: pick.derivativeMarketCase.derivativeLane ?? null,
          expectedMatchGames: roundNumber(pick.derivativeMarketCase.expectedMatchGames),
          totalGames: pick.derivativeMarketCase.totalGames ? compactRow(pick.derivativeMarketCase.totalGames) : null,
          firstSet: pick.derivativeMarketCase.firstSet ? compactRow(pick.derivativeMarketCase.firstSet) : null
        }
      : null,
    market: compactMarket(pick.market)
  }))
})

const runModel = async ({ date, model }) => {
  const cartridgeLock = await buildCartridgeLock({ date, model })
  assertSourceFilesMatchManifest(cartridgeLock)
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), `tennis-${model}-${date}-`))
  const output = path.join(tmp, `day-${date}.js`)
  const predictionsOutput = path.join(tmp, `${date}.json`)
  await execFileAsync('node', [
    path.resolve(ROOT, 'pipeline/tennis/publish/generate-day-module.mjs'),
    '--date',
    date,
    '--model',
    model,
    '--output',
    output,
    '--predictions-output',
    predictionsOutput
  ], { cwd: ROOT, maxBuffer: 1024 * 1024 * 20 })
  const payload = JSON.parse(await fs.readFile(predictionsOutput, 'utf8'))
  await fs.rm(tmp, { recursive: true, force: true })
  return buildSnapshot(payload, cartridgeLock)
}

const snapshotPath = ({ model, date }) => `data-private/model-cartridges/tennis/${model}/golden/${date}.snapshot.json`
const calibrationPath = ({ model, date }) => `data-private/model-cartridges/tennis/${model}/calibration/${date}.calibration.json`

const buildCalibration = async ({ model, date }) => {
  const multimodel = await readJson(`data-private/reports/tennis-multimodel-backtest-through-${date}.json`, {})
  const kalshi = await readJson(`data-private/reports/kalshi-tennis-spike-model-${date}.json`, {})
  const valueSource = multimodel.valueGate?.source || ''
  const valueBacktest = valueSource ? await readJson(`data-private/reports/${valueSource}`, null) : null
  return {
    schemaVersion: 1,
    modelId: model,
    date,
    cartridgeLock: await buildCartridgeLock({ model, date }),
    sourceReports: {
      multimodel: `data-private/reports/tennis-multimodel-backtest-through-${date}.json`,
      kalshi: `data-private/reports/kalshi-tennis-spike-model-${date}.json`,
      valueBacktest: valueSource ? `data-private/reports/${valueSource}` : null
    },
    winnerModel: {
      generatedFrom: multimodel.generatedFrom ?? null,
      settledRows: multimodel.settledRows ?? null,
      deskBaseline: multimodel.deskBaseline ?? null,
      backtest: multimodel.backtest ?? null,
      dataOnlyBacktest: multimodel.dataOnlyBacktest ?? null,
      valueGate: multimodel.valueGate ?? null,
      trainingCorpus: multimodel.trainingCorpus ?? null
    },
    valueBacktest: valueBacktest
      ? {
          date: valueBacktest.date ?? null,
          summary: valueBacktest.summary ?? null
        }
      : null,
    kalshiTradeToSell: {
      coverage: kalshi.coverage ?? null,
      laneBacktest: kalshi.laneBacktest ?? null,
      modelBacktest: kalshi.modelBacktest ?? null
    },
    notes: [
      'T0 calibration is stored as a baseline for comparison only.',
      'Future cartridges must report bucketed performance by ML, spread, match O-U, first-set O-U, set-win, and Kalshi trade-to-sell.'
    ]
  }
}

const firstDiff = (left, right, prefix = '$') => {
  if (Object.is(left, right)) return null
  if (typeof left !== typeof right) return `${prefix}: type ${typeof left} !== ${typeof right}`
  if (left === null || right === null || typeof left !== 'object') return `${prefix}: ${JSON.stringify(left)} !== ${JSON.stringify(right)}`
  if (Array.isArray(left) !== Array.isArray(right)) return `${prefix}: array mismatch`
  if (Array.isArray(left)) {
    if (left.length !== right.length) return `${prefix}: length ${left.length} !== ${right.length}`
    for (let index = 0; index < left.length; index += 1) {
      const nested = firstDiff(left[index], right[index], `${prefix}[${index}]`)
      if (nested) return nested
    }
    return null
  }
  const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort()
  for (const key of keys) {
    if (!(key in left)) return `${prefix}.${key}: missing on actual`
    if (!(key in right)) return `${prefix}.${key}: missing on expected`
    const nested = firstDiff(left[key], right[key], `${prefix}.${key}`)
    if (nested) return nested
  }
  return null
}

const main = async () => {
  const options = parseArgs()
  const actual = await runModel(options)
  const goldenPath = snapshotPath(options)
  const calibPath = calibrationPath(options)
  if (options.update) {
    await writeJson(goldenPath, actual)
    await writeJson(calibPath, await buildCalibration(options))
    console.log(`Updated ${goldenPath}`)
    console.log(`Updated ${calibPath}`)
    return
  }
  const expected = await readJson(goldenPath)
  if (!expected) throw new Error(`Golden snapshot missing: ${goldenPath}. Run with --update first.`)
  const diff = firstDiff(actual, expected)
  if (diff) {
    const actualPath = `data-private/model-cartridges/tennis/${options.model}/golden/${options.date}.actual.json`
    await writeJson(actualPath, actual)
    throw new Error(`Tennis ${options.model} snapshot mismatch for ${options.date}: ${diff}. Actual written to ${actualPath}`)
  }
  console.log(`Tennis ${options.model} snapshot verified for ${options.date}`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})

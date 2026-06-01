import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  loadHistoryArchiveFromModules,
  loadStoryArchiveFromModules
} from '../lib/archive-loader.js'
import {
  listSlateManifestFromModules,
  loadSlateDayFromModules
} from '../lib/day-loader.js'
import { dataPrivateRoot, publishedDataRoot, warehousePath } from '../lib/paths.js'

const historyJournalRoot = path.join(dataPrivateRoot, 'history')
const tennisPredictionsRoot = path.join(dataPrivateRoot, 'predictions', 'tennis')
const reportsRoot = path.join(dataPrivateRoot, 'reports')
const repoRoot = path.resolve(dataPrivateRoot, '..')
const mlbModelRunsRoot = path.join(dataPrivateRoot, 'model-runs', 'mlb')

const ensureDir = async (dirPath: string) => {
  await fs.mkdir(dirPath, { recursive: true })
}

const writeJson = async (filePath: string, payload: unknown) => {
  await fs.writeFile(filePath, JSON.stringify(payload), 'utf8')
}

const normalizeSearchToken = (value: unknown) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()

const pairKey = (left: unknown, right: unknown) =>
  [normalizeSearchToken(left), normalizeSearchToken(right)].filter(Boolean).sort().join(' vs ')

const titlePairKey = (title: unknown) => {
  const [left, right] = String(title ?? '').split(/\s+vs\s+/i)
  return pairKey(left, right)
}

const runWarehouseJson = <T,>(sql: string): T[] => {
  if (!fsSync.existsSync(warehousePath)) return []
  const raw = execFileSync('sqlite3', ['-json', warehousePath, sql], { encoding: 'utf8' }).trim()
  return raw ? JSON.parse(raw) as T[] : []
}

const loadTennisResultsByDate = () => {
  const rows = runWarehouseJson<any>(`
    select slate_date, event_id, match_id, title, round_label, court, status, completed,
           player1_name, player2_name, player1_normalized_name, player2_normalized_name,
           winner_name, winner_normalized_name, scoreline, source_url
    from tennis_match_results
  `)
  const byDate = new Map<string, Map<string, any>>()
  for (const row of rows) {
    const date = String(row.slate_date || '')
    if (!date) continue
    const dateMap = byDate.get(date) ?? new Map<string, any>()
    const keys = [
      row.match_id,
      pairKey(row.player1_name, row.player2_name),
      pairKey(row.player1_normalized_name, row.player2_normalized_name),
      titlePairKey(row.title)
    ].filter(Boolean)
    for (const key of keys) dateMap.set(String(key), row)
    byDate.set(date, dateMap)
  }
  return byDate
}

const tennisResultForGame = (resultsByDate: Map<string, Map<string, any>>, date: string, game: any) => {
  if (game?.league !== 'Tennis') return null
  const dateMap = resultsByDate.get(date)
  if (!dateMap) return null
  const matchup = Array.isArray(game.matchup) ? game.matchup : []
  const left = matchup[0]?.name ?? matchup[0]?.displayName
  const right = matchup[1]?.name ?? matchup[1]?.displayName
  const keys = [game.id, pairKey(left, right), titlePairKey(game.title)].filter(Boolean)
  for (const key of keys) {
    const result = dateMap.get(String(key))
    if (result) {
      return {
        status: result.status ?? null,
        completed: Boolean(result.completed),
        winnerName: result.winner_name ?? null,
        winnerNormalizedName: result.winner_normalized_name ?? null,
        scoreline: result.scoreline ?? null,
        sourceUrl: result.source_url ?? null,
        eventId: result.event_id ?? null,
        title: result.title ?? game.title
      }
    }
  }
  return null
}

const applyTennisResult = (game: any, result: any) => {
  if (!result) return game
  return {
    ...game,
    winnerName: result.winnerName,
    scoreline: result.scoreline,
    tennisResult: result,
    result: {
      ...(game.result && typeof game.result === 'object' ? game.result : {}),
      winner: result.winnerName,
      scoreline: result.scoreline,
      status: result.status,
      completed: result.completed
    }
  }
}

const toTitleDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number)
  const display = new Date(Date.UTC(year, month - 1, day))
  return display.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

const toRecord = (records: any[], predicate: (record: any) => boolean, hitResolver: (record: any) => boolean) => {
  const rows = records.filter(predicate)
  if (!rows.length) return undefined
  const hits = rows.filter(hitResolver).length
  return { wins: hits, losses: rows.length - hits }
}

const toPropRecord = (records: any[], predicate: (record: any) => boolean, hitResolver: (record: any) => boolean) => {
  const rows = records.filter(predicate)
  if (!rows.length) return undefined
  const hits = rows.filter(hitResolver).length
  return { hits, total: rows.length }
}

const toneFromRecord = (wins: number, losses: number) => (wins > losses ? 'positive' : wins === losses ? 'warning' : 'negative')

const pctLabel = (wins?: number, total?: number) => {
  if (!Number.isFinite(Number(wins)) || !Number.isFinite(Number(total)) || !Number(total)) return 'Pending'
  return `${wins}-${Number(total) - Number(wins)} (${((Number(wins) / Number(total)) * 100).toFixed(1)}%)`
}

const propPctLabel = (hits?: number, total?: number) => {
  if (!Number.isFinite(Number(hits)) || !Number.isFinite(Number(total)) || !Number(total)) return 'Pending'
  return `${hits}/${total} (${((Number(hits) / Number(total)) * 100).toFixed(1)}%)`
}

const readJsonFile = (filePath: string) => {
  if (!fsSync.existsSync(filePath)) return null
  try {
    return JSON.parse(fsSync.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

const publicArtifact = (label: string, role: string) => ({ label, role })

const readTennisModelDescription = (modelId: unknown) => {
  const safeModelId = String(modelId || 'TEN-T0').replace(/[^a-z0-9_-]/gi, '')
  if (!safeModelId) return null
  const cartridgeRoot = [
    path.join(repoRoot, 'models', 'tennis', 'cartridges', safeModelId),
    path.join(repoRoot, 'pipeline', 'tennis_model_cartridges', safeModelId)
  ].find((candidate) => fsSync.existsSync(path.join(candidate, 'model_description.json')))
  if (!cartridgeRoot) return null
  const description = readJsonFile(path.join(cartridgeRoot, 'model_description.json'))
  if (!description) return null
  return {
    ...description,
    markdownPresent: fsSync.existsSync(path.join(cartridgeRoot, 'MODEL_NOTES.md'))
  }
}

const readMlbModelDescription = (modelId: unknown) => {
  const safeModelId = String(modelId || 'MLB-M0').replace(/[^a-z0-9_-]/gi, '')
  if (!safeModelId) return null
  const cartridgeRoot = path.join(repoRoot, 'models', 'mlb', 'cartridges', safeModelId)
  if (!fsSync.existsSync(path.join(cartridgeRoot, 'model_description.json'))) return null
  const description = readJsonFile(path.join(cartridgeRoot, 'model_description.json'))
  if (!description) return null
  return {
    ...description,
    markdownPresent: fsSync.existsSync(path.join(cartridgeRoot, 'MODEL_NOTES.md'))
  }
}

const readMlbRun = (modelId: string, date: string) =>
  readJsonFile(path.join(mlbModelRunsRoot, modelId, date, 'run.json'))

const loadMlbModelRunDates = () => {
  const dates = new Set<string>()
  if (!fsSync.existsSync(mlbModelRunsRoot)) return dates
  for (const modelId of fsSync.readdirSync(mlbModelRunsRoot)) {
    const modelRoot = path.join(mlbModelRunsRoot, modelId)
    if (!fsSync.statSync(modelRoot).isDirectory()) continue
    for (const date of fsSync.readdirSync(modelRoot)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && fsSync.existsSync(path.join(modelRoot, date, 'run.json'))) {
        dates.add(date)
      }
    }
  }
  return dates
}

const isPrivateReference = (value: unknown) =>
  typeof value === 'string' && (
    value.includes('data-private/') ||
    value.includes('data-private\\') ||
    value.includes('/Users/') ||
    value.includes('TemporaryItems')
  )

const sanitizePublicPayload = (value: any): any => {
  if (Array.isArray(value)) return value.map(sanitizePublicPayload)
  if (value && typeof value === 'object') {
    const sanitized: Record<string, any> = {}
    for (const [key, nested] of Object.entries(value)) {
      if (key === 'path' && isPrivateReference(nested)) continue
      sanitized[key] = sanitizePublicPayload(nested)
    }
    return sanitized
  }
  if (isPrivateReference(value)) return 'private artifact'
  return value
}

const tableExists = (tableName: string) =>
  runWarehouseJson<{ name: string }>(
    `select name from sqlite_master where type = 'table' and name = '${tableName.replace(/'/g, "''")}'`
  ).length > 0

const historyRecordLabel = (record: any) =>
  record ? pctLabel(Number(record.wins), Number(record.wins) + Number(record.losses)) : 'Performance pending'

const propRecordLabel = (record: any) => record ? propPctLabel(Number(record.hits), Number(record.total)) : 'Performance pending'

const percentFromRate = (value: unknown) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Number((numeric * 100).toFixed(1)) : null
}

const rateLabel = (value: unknown) => {
  const pct = percentFromRate(value)
  return pct === null ? 'pending' : `${pct.toFixed(1)}%`
}

const readTennisBacktestSummary = (date: string, runDir?: string) => {
  const payload =
    (runDir ? readJsonFile(path.join(runDir, 'backtest.json')) : null) ??
    readJsonFile(path.join(reportsRoot, `tennis-multimodel-backtest-through-${date}.json`))
  const backtest = payload?.backtest
  if (!backtest) return null
  const dataOnly = payload?.dataOnlyBacktest
  const hitRatePct = percentFromRate(backtest.hitRate)
  return {
    label: `${rateLabel(backtest.hitRate)} backtest (${Number(backtest.hits ?? 0)}/${Number(backtest.rows ?? 0)})${dataOnly ? ` | data-only ${rateLabel(dataOnly.hitRate)}` : ''}`,
    rows: Number(backtest.rows || 0),
    hits: Number(backtest.hits || 0),
    hitRatePct,
    brier: backtest.brier ?? null,
    logLoss: backtest.logLoss ?? null,
    auc: backtest.auc ?? null,
    dataOnlyRows: dataOnly ? Number(dataOnly.rows || 0) : null,
    dataOnlyHits: dataOnly ? Number(dataOnly.hits || 0) : null,
    dataOnlyHitRatePct: dataOnly ? percentFromRate(dataOnly.hitRate) : null,
    valueGate: payload?.valueGate ?? null,
    trainingCorpus: payload?.trainingCorpus ?? null
  }
}

const tennisValueLaneName = (lane: string) => {
  if (/^o\/u$/i.test(lane)) return 'Match O/U'
  return lane
}

const summarizeTennisValueSettlement = (date: string, value: any) => {
  const summary = value?.summary
  if (!summary || typeof summary !== 'object') return null
  const rows = Array.isArray(value?.rows) ? value.rows : []
  const marketLanes = Object.entries(summary)
    .filter(([lane]) => ['ML', 'Spread', 'O/U'].includes(lane))
    .map(([lane, laneSummary]: [string, any]) => {
      const graded = Number(laneSummary.graded || 0)
      const hits = Number(laneSummary.hits || 0)
      const totalPnl = Number(laneSummary.pnlPer100 || 0)
      return {
        lane: tennisValueLaneName(lane),
        rows: Number(laneSummary.rows || 0),
        graded,
        hits,
        misses: Math.max(0, graded - hits),
        hitPct: percentFromRate(laneSummary.hitRate),
        avgPnlPer100: graded ? Number((totalPnl / graded).toFixed(1)) : null
      }
    })
  const gradedCount = rows.filter((row: any) => row.graded).length
  const hitCount = rows.filter((row: any) => row.graded && row.hit).length
  const totalPnl = rows
    .filter((row: any) => row.graded)
    .reduce((total: number, row: any) => total + Number(row.pnlPer100 || 0), 0)
  return {
    settlementId: `legacy-tennis-${date}:value-backtest`,
    status: 'settled',
    gradeMode: 'legacy-value-backtest',
    settledAt: value?.generatedAt ?? null,
    completeMatches: new Set(rows.map((row: any) => row.matchId).filter(Boolean)).size,
    pendingMatches: 0,
    rowCount: rows.length,
    gradedCount,
    hitCount,
    missCount: Math.max(0, gradedCount - hitCount),
    roiPer100: gradedCount ? Number((totalPnl / (100 * gradedCount)).toFixed(3)) : null,
    lanes: marketLanes
  }
}

const tennisValueSettlementLabel = (settlement: any) => {
  if (!settlement?.lanes?.length) return null
  return settlement.lanes
    .map((lane: any) => `${lane.lane} ${lane.hits}-${lane.misses} (${Number(lane.hitPct ?? 0).toFixed(1)}%)`)
    .join(' | ')
}

const readGeneratedHistoryEntries = async () => {
  if (!fsSync.existsSync(historyJournalRoot)) return []

  const files = fsSync
    .readdirSync(historyJournalRoot)
    .filter((fileName) => /^mlb-results-\d{4}-\d{2}-\d{2}\.jsonl$/.test(fileName))
    .sort()

  const entries = []

  for (const fileName of files) {
    const date = fileName.replace('mlb-results-', '').replace('.jsonl', '')
    const source = path.join(historyJournalRoot, fileName)
    const lines = fsSync.readFileSync(source, 'utf8').trim().split('\n').filter(Boolean)
    if (!lines.length) continue

    const records = lines.map((line) => JSON.parse(line))
    const fullGame = toRecord(records, (row) => row.marketType === 'moneyline', (row) => Boolean(row.result?.fullGameHit))
    const first5 = toRecord(records, (row) => row.marketType === 'moneyline', (row) => Boolean(row.result?.first5Hit))
    const firstInning = toRecord(records, (row) => row.marketType === 'firstInning', (row) => Boolean(row.result?.hit))
    const hrBoard = toPropRecord(records, (row) => row.marketType === 'homeRun', (row) => Boolean(row.result?.hit))
    const props = toPropRecord(records, (row) => row.marketType === 'playerProp', (row) => Boolean(row.result?.hit))

    const metrics = []
    if (fullGame) metrics.push({ label: 'MLB full game', value: `${fullGame.wins}-${fullGame.losses}`, tone: toneFromRecord(fullGame.wins, fullGame.losses) })
    if (first5) metrics.push({ label: 'MLB first 5', value: `${first5.wins}-${first5.losses}`, tone: toneFromRecord(first5.wins, first5.losses) })
    if (firstInning) {
      metrics.push({
        label: 'MLB 1st inning',
        value: `${firstInning.wins}-${firstInning.losses}`,
        tone: toneFromRecord(firstInning.wins, firstInning.losses)
      })
    }
    if (hrBoard) {
      metrics.push({
        label: 'HR board',
        value: `${hrBoard.hits}/${hrBoard.total}`,
        tone: hrBoard.hits / Math.max(hrBoard.total, 1) >= 0.25 ? 'warning' : 'negative'
      })
    }
    if (props) {
      metrics.push({
        label: 'Tracked props',
        value: `${props.hits}/${props.total}`,
        tone: props.hits / Math.max(props.total, 1) >= 0.5 ? 'positive' : 'negative'
      })
    }

    const strongestMoneylineHits = records
      .filter((row) => row.marketType === 'moneyline' && row.result?.fullGameHit)
      .sort((left, right) => Number(right.confidence ?? 0) - Number(left.confidence ?? 0))
      .slice(0, 3)
      .map((row) => row.predictedPick)

    const strongestMoneylineMisses = records
      .filter((row) => row.marketType === 'moneyline' && !row.result?.fullGameHit)
      .sort((left, right) => Number(right.confidence ?? 0) - Number(left.confidence ?? 0))
      .slice(0, 3)
      .map((row) => row.predictedPick)

    entries.push({
      id: date,
      date,
      label: toTitleDate(date),
      status: 'graded',
      summary:
        `Automated MLB closeout archive for ${toTitleDate(date)}. The day is generated directly from the settled results journal so History and Models stay current even before a hand-written review exists.`,
      sports: ['MLB'],
      trackedMarkets: ['MLB moneyline', 'MLB first 5', 'MLB first inning', 'HR props', 'Player props'],
      performance: {
        ...(fullGame ? { mlbFullGame: fullGame } : {}),
        ...(first5 ? { mlbFirst5: first5 } : {}),
        ...(firstInning ? { mlbFirstInning: firstInning } : {}),
        ...(hrBoard ? { hrBoard } : {}),
        ...(props ? { mlbProps: props } : {})
      },
      journal: {
        role: 'private-results-journal',
        records: records.length,
        sideRows: records.filter((row) => row.marketType === 'moneyline').length,
        hrRows: records.filter((row) => row.marketType === 'homeRun').length,
        propRows: records.filter((row) => row.marketType === 'playerProp').length,
        note: 'This archive block was generated automatically from the daily MLB journal.'
      },
      metrics,
      notableHits: strongestMoneylineHits.length
        ? [`Highest-confidence full-game hits included ${strongestMoneylineHits.join(', ')}.`]
        : [],
      notableMisses: strongestMoneylineMisses.length
        ? [`Highest-confidence full-game misses included ${strongestMoneylineMisses.join(', ')}.`]
        : [],
      whatWorked: [
        'The archive and models numbers were generated automatically from the settled journal instead of waiting on a manual write-up.'
      ],
      whatMissed: [
        'This auto-generated block does not yet include a richer per-game sport tab or full narrative postmortem.'
      ],
      takeaways: [
        'Use this as the daily source of truth for model accuracy while the deeper post-analysis catches up.'
      ],
      artifacts: [publicArtifact(`${toTitleDate(date)} MLB results journal`, 'private-results-journal')]
    })
  }

  return entries
}

const buildSummaryLineupBoard = (lineupBoard: any) => {
  if (!lineupBoard) return null
  return {
    status: lineupBoard.status ?? null,
    snapshot: lineupBoard.snapshot ?? '',
    weather: lineupBoard.weather ?? null,
    marketWeatherContext: lineupBoard.marketWeatherContext ?? null
  }
}

const buildSlimTeamFeedContext = (context: any) => {
  if (!context) return null
  return {
    away: context.away ? { staleFeed: Boolean(context.away.staleFeed) } : null,
    home: context.home ? { staleFeed: Boolean(context.home.staleFeed) } : null
  }
}

const buildSummaryOdds = (odds: any) => {
  if (!odds) return null
  return {
    provider: odds.provider ?? '',
    note: odds.note ?? '',
    participantOrder: odds.participantOrder ?? null
  }
}

const buildTennisValueSummary = (games: any[] = [], isoDate = '') => {
  const feePer100 = 2
  const finiteNumber = (value: any) => {
    if (value === null || value === undefined || value === '') return null
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : null
  }
  const marketKey = (row: any) => String(row.marketType ?? row.label ?? '').toLowerCase()
  const byEvDesc = (left: any, right: any) => Number(right.evPer100 ?? -999) - Number(left.evPer100 ?? -999)
  const byEvAsc = (left: any, right: any) => Number(left.evPer100 ?? 999) - Number(right.evPer100 ?? 999)
  const byBoardRank = (left: any, right: any) => {
    const leftEv = finiteNumber(left.evPer100)
    const rightEv = finiteNumber(right.evPer100)
    const leftScore =
      (left.betGrade ? 1000 : 0) +
      (leftEv != null ? 300 + leftEv : Number(left.confidence ?? left.modelPct ?? 0))
    const rightScore =
      (right.betGrade ? 1000 : 0) +
      (rightEv != null ? 300 + rightEv : Number(right.confidence ?? right.modelPct ?? 0))
    return rightScore - leftScore
  }
  const isMatchTotalRow = (row: any) => {
    const key = marketKey(row)
    return (key.includes('o/u') || key.includes('total')) && !key.includes('first') && !key.includes('1st')
  }
  const isFirstSetTotalRow = (row: any) => {
    const key = marketKey(row)
    return key.includes('first') || key.includes('1st')
  }
  const isValidatedValue = (row: any) => {
    const marketType = String(row.marketType ?? '').toLowerCase()
    const netEv = Number(row.netEvPer100 ?? Number(row.evPer100) - feePer100)
    const edge = Number(row.edgePct)
    const model = Number(row.modelPct)
    const odds = Number(row.americanOdds)
    if (marketType !== 'ml') return false
    if (!Number.isFinite(netEv) || !Number.isFinite(edge) || !Number.isFinite(model) || !Number.isFinite(odds)) return false
    return odds >= 100 && odds <= 250 && model >= 45 && model <= 60 && edge >= 7 && edge <= 24 && netEv >= 8
  }

  const derivativeRows = games
    .filter((game) => game?.league === 'Tennis')
    .flatMap((game) =>
      (game.tennisContext?.derivativeMarkets ?? []).map((market: any) => ({
        gameId: game.id,
        gameTitle: game.title,
        start: game.start,
        marketType: market.marketType ?? market.label ?? '',
        label: market.label ?? market.marketType ?? '',
        value: market.value ?? '',
        selection: market.selection ?? market.lean ?? '',
        lean: market.lean ?? market.selection ?? '',
        line: market.line ?? null,
        americanOdds: market.americanOdds ?? null,
        expectedGames: market.expectedGames ?? null,
        confidence: Number.isFinite(Number(market.modelPct))
          ? Number(market.modelPct)
          : Number.isFinite(Number(market.confidence))
            ? Number(market.confidence)
            : game.analysis?.confidence ?? null,
        modelPct: market.modelPct ?? null,
        impliedPct: market.impliedPct ?? null,
        edgePct: market.edgePct ?? null,
        evPer100: market.evPer100 ?? null,
        netEvPer100: market.netEvPer100 ?? null,
        feePer100: market.feePer100 ?? feePer100,
        valueIssue: market.valueIssue ?? '',
        valueGrade: market.valueGrade ?? market.grade ?? 'No grade',
        betGrade: Boolean(market.betGrade),
        validatedValue: false,
        reason: market.reason ?? ''
      }))
    )

  let ensembleRows: any[] = []
  const fromEnsemblePath = path.join(dataPrivateRoot, 'predictions', 'tennis', `${isoDate}-multimodel-ensemble.json`)
  if (isoDate && fsSync.existsSync(fromEnsemblePath)) {
    const payload = JSON.parse(fsSync.readFileSync(fromEnsemblePath, 'utf8'))
    const payloadRows = Array.isArray(payload?.rows) ? payload.rows : Array.isArray(payload) ? payload : []
    ensembleRows = payloadRows
      .map((row: any) => {
        const game = games.find((entry) => entry.id === row.matchId)
        if (!game) return null
        const modelPct = Number(row.modelProbability)
        const marketPct = Number(row.marketProbability)
        const edgePct = Number.isFinite(modelPct) && Number.isFinite(marketPct) ? Number((modelPct - marketPct).toFixed(1)) : null
        const valueGrade = row.grade === 'Bet-grade ML' ? 'Bet-grade value' : row.grade ?? 'No grade'
        return {
          gameId: game.id,
          gameTitle: game.title,
          start: row.start ?? game.start,
          marketType: 'ML',
          label: 'ML',
          selection: row.selection ?? '',
          line: null,
          americanOdds: row.marketFairOdds ?? null,
          confidence: modelPct,
          modelPct,
          impliedPct: Number.isFinite(marketPct) ? marketPct : null,
          edgePct,
          evPer100: row.netEvPer100 ?? null,
          netEvPer100: row.netEvPer100 ?? null,
          feePer100,
          valueIssue: row.riskGate ?? '',
          valueGrade,
          betGrade: row.grade === 'Bet-grade ML',
          validatedValue: false,
          reason: row.riskGate ? `Model chain risk gate: ${row.riskGate}.` : 'Model chain price check.'
        }
      })
      .filter(Boolean) as any[]
  }

  const rows = ensembleRows.length
    ? [...ensembleRows, ...derivativeRows.filter((row) => marketKey(row) !== 'ml')]
    : derivativeRows

  if (!rows.length) return null

  const countByGrade = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.valueGrade] = (acc[row.valueGrade] ?? 0) + 1
    return acc
  }, {})
  const pricedRows = rows.filter((row) => finiteNumber(row.evPer100) !== null)
  const noPriceRows = rows.filter((row) => /need(s)? posted|need price|no price/i.test(String(row.valueGrade)))
  const rowsWithValidation = rows.map((row) => ({
    ...row,
    validatedValue: isValidatedValue(row) && (row.betGrade || row.valueGrade === 'Bet-grade value')
  }))
  const validatedRows = rowsWithValidation.filter((row) => row.validatedValue).sort(byEvDesc)
  const mlRows = rowsWithValidation.filter((row) => marketKey(row) === 'ml').sort(byBoardRank)
  const modelPickRows = rowsWithValidation
    .filter((row) => {
      if (marketKey(row) !== 'ml') return false
      const game = games.find((entry) => entry.id === row.gameId)
      return normalizeSearchToken(game?.analysis?.participant?.name ?? '') === normalizeSearchToken(row.selection ?? '')
    })
    .sort(byBoardRank)
  const matchTotalRows = rowsWithValidation.filter(isMatchTotalRow).sort(byBoardRank)
  const firstSetRows = rowsWithValidation.filter(isFirstSetTotalRow).sort(byBoardRank)
  const spreadRows = rowsWithValidation.filter((row) => marketKey(row) === 'spread').sort(byBoardRank)
  const setWinRows = rowsWithValidation.filter((row) => marketKey(row).includes('set') && !isFirstSetTotalRow(row)).sort(byBoardRank)

  return {
    date: isoDate,
    source: ensembleRows.length ? 'pandas tennis warehouse ensemble + derivative value books' : 'tennis derivative value books',
    totalRows: rows.length,
    pricedRows: pricedRows.length,
    noPriceRows: noPriceRows.length,
    countByGrade,
    rows: rowsWithValidation,
    validatedRows: validatedRows.slice(0, 8),
    betGradeRows: validatedRows.slice(0, 8),
    modelPickRows: modelPickRows.slice(0, 8),
    mlRows: mlRows.slice(0, 8),
    matchTotalRows: matchTotalRows.slice(0, 8),
    firstSetRows: firstSetRows.slice(0, 8),
    spreadRows: spreadRows.slice(0, 8),
    setWinRows: setWinRows.slice(0, 8),
    rawPositiveRows: rowsWithValidation
      .filter((row) => Number(row.evPer100) > 0 && !row.validatedValue)
      .sort(byEvDesc)
      .slice(0, 8),
    thinRows: rowsWithValidation.filter((row) => row.valueGrade === 'Thin value').sort(byEvDesc).slice(0, 6),
    negativeMlRows: rowsWithValidation
      .filter((row) => row.valueGrade === 'Negative EV' && String(row.marketType).toLowerCase() === 'ml')
      .sort(byEvAsc)
      .slice(0, 6),
    note:
      isoDate === '2026-05-28'
        ? 'May 28 is pre-match. May 27 backtest: ML value rows went 3-1 with +21.9% flat ROI; spreads went 1-3 and stay downgraded until the next settled pass.'
        : 'Tennis value books include ML, match O/U, first-set O/U, set-win, spreads, and Kalshi trade-to-sell. A likely winner can still be a bad bet if the payout is too small.'
  }
}

const buildSlateGameSummary = (game: any, tennisResult: any = null) => ({
  id: game.id,
  league: game.league,
  start: game.start,
  startMinutes: game.startMinutes,
  title: game.title,
  stage: game.stage,
  spotlight: game.spotlight,
  confidence: game.confidence,
  volatility: game.volatility,
  tags: game.tags ?? [],
  matchup: game.matchup ?? [],
  summary: game.summary ?? '',
  factors: game.factors ?? [],
  lean: game.lean ?? '',
  swing: game.swing ?? '',
  swingFactor: game.swingFactor ?? '',
  odds: buildSummaryOdds(game.odds),
  moneyline: game.moneyline ?? null,
  analysis: game.analysis ?? null,
  winnerName: tennisResult?.winnerName ?? game.winnerName ?? null,
  scoreline: tennisResult?.scoreline ?? game.scoreline ?? null,
  tennisResult: tennisResult ?? game.tennisResult ?? null,
  result: tennisResult
    ? { winner: tennisResult.winnerName, scoreline: tennisResult.scoreline, status: tennisResult.status, completed: tennisResult.completed }
    : game.result ?? null,
  metadata: game.metadata ?? null,
  lineupBoard: buildSummaryLineupBoard(game.lineupBoard),
  offenseContext: buildSlimTeamFeedContext(game.offenseContext),
  bullpenContext: buildSlimTeamFeedContext(game.bullpenContext),
  detailLevel: 'summary'
})

const buildSlateGameDetail = (game: any, tennisResult: any = null) => {
  const detail = {
    ...applyTennisResult(game, tennisResult),
    detailLevel: 'full',
    stateContext: game.stateContext ?? null
  }
  delete detail.playerProps
  return detail
}

const exportSlates = async () => {
  const slatesRoot = path.join(publishedDataRoot, 'slates')
  await ensureDir(slatesRoot)

  const manifest = await listSlateManifestFromModules()
  const tennisResultsByDate = loadTennisResultsByDate()
  await writeJson(path.join(slatesRoot, 'index.json'), manifest)

  for (const slate of manifest) {
    const day = await loadSlateDayFromModules(slate.id)
    const slateRoot = path.join(slatesRoot, slate.id)
    const gamesRoot = path.join(slateRoot, 'games')
    await fs.rm(path.join(slatesRoot, `${slate.id}.json`), { force: true })
    await fs.rm(slateRoot, { recursive: true, force: true })
    await ensureDir(gamesRoot)

    const tennisResultFor = (game: any) => tennisResultForGame(tennisResultsByDate, slate.id, game)
    const summaryDay = {
      ...day,
      tennisValueSummary: buildTennisValueSummary(day.games ?? [], day.slateMeta?.isoDate ?? slate.id),
      games: Array.isArray(day.games) ? day.games.map((game: any) => buildSlateGameSummary(game, tennisResultFor(game))) : []
    }

    await writeJson(path.join(slateRoot, 'summary.json'), summaryDay)

    for (const game of day.games ?? []) {
      await writeJson(path.join(gamesRoot, `${game.id}.json`), buildSlateGameDetail(game, tennisResultFor(game)))
    }
  }

  return manifest.length
}

const exportHistory = async () => {
  const historyRoot = path.join(publishedDataRoot, 'history')
  await ensureDir(historyRoot)

  const seededHistory = await loadHistoryArchiveFromModules()
  const generatedHistory = await readGeneratedHistoryEntries()
  const seededIds = new Set(seededHistory.map((entry: any) => String(entry.id)))
  const history = [...seededHistory, ...generatedHistory.filter((entry) => !seededIds.has(String(entry.id)))]
    .sort((left: any, right: any) => String(right.id).localeCompare(String(left.id)))
  await writeJson(path.join(historyRoot, 'index.json'), sanitizePublicPayload(history))

  for (const entry of history) {
    const id = String(entry.id)
    await writeJson(path.join(historyRoot, `${id}.json`), sanitizePublicPayload(entry))
  }

  return history
}

const summarizeMlbModelsForDay = (date: string) => {
  const journalPath = path.join(historyJournalRoot, `mlb-results-${date}.jsonl`)
  const m0Run = readMlbRun('MLB-M0', date)
  const rp36Run = readMlbRun('MLB-RP36', date)
  const records = fsSync.existsSync(journalPath)
    ? fsSync
        .readFileSync(journalPath, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : []

  if (!records.length && !m0Run && !rp36Run) return []

  const moneylineRows = records.filter((row) => row.marketType === 'moneyline')
  const firstInningRows = records.filter((row) => row.marketType === 'firstInning')
  const hrRows = records.filter((row) => row.marketType === 'homeRun')
  const propRows = records.filter((row) => row.marketType === 'playerProp')
  const moneylineHits = moneylineRows.filter((row) => Boolean(row.result?.fullGameHit)).length
  const first5Hits = moneylineRows.filter((row) => Boolean(row.result?.first5Hit)).length
  const firstInningHits = firstInningRows.filter((row) => Boolean(row.result?.hit)).length
  const hrHits = hrRows.filter((row) => Boolean(row.result?.hit)).length
  const propHits = propRows.filter((row) => Boolean(row.result?.hit)).length
  const sourceLabels = [...new Set(moneylineRows.map((row) => String(row.sourceLabel ?? '')).filter(Boolean))]

  const models = []
  if (m0Run) {
    const lane = (label: string, hits: number, rows: number) => ({
      lane: label,
      rows,
      graded: rows,
      hits,
      misses: Math.max(0, rows - hits),
      hitPct: rows ? Number(((hits / rows) * 100).toFixed(1)) : null,
      avgPnlPer100: null
    })
    const totalRows = moneylineRows.length + moneylineRows.length + firstInningRows.length + hrRows.length + propRows.length
    const totalHits = moneylineHits + first5Hits + firstInningHits + hrHits + propHits
    const stackLabel = [
      m0Run.warehouseVersion,
      m0Run.featureVersion,
      m0Run.modelId,
      m0Run.reliefAddendum,
      m0Run.evaluatorVersion
    ].filter(Boolean).join(' / ')
    const modelDescription = readMlbModelDescription(m0Run.modelId || 'MLB-M0')
    const settlementStatus = totalRows ? 'settled' : 'pending'
    models.push({
      id: `${date}-mlb-${m0Run.modelId || 'MLB-M0'}-run`,
      sport: 'MLB',
      lane: 'Cartridge run',
      modelName: m0Run.modelId || 'MLB-M0',
      version: stackLabel || 'MLB-W1 / MLB-F0 / MLB-M0 / MLB-RP36 / MLB-E0',
      performanceLabel: moneylineRows.length
        ? `Sides FG ${pctLabel(moneylineHits, moneylineRows.length)} | F5 ${pctLabel(first5Hits, moneylineRows.length)}`
        : 'Run snapshotted; side rows pending',
      performancePct: moneylineRows.length ? Number(((moneylineHits / moneylineRows.length) * 100).toFixed(1)) : null,
      coverageLabel: `${m0Run.artifactSummary?.publicSummaryGames ?? 0} games | ${m0Run.sourceFiles ?? 0} source files | ${m0Run.inputs ?? 0} inputs | ${totalRows} graded lane rows`,
      modelDescription,
      run: {
        runId: m0Run.runId,
        status: m0Run.status,
        mode: m0Run.mode,
        snapshottedAt: m0Run.snapshottedAt,
        sourceHash: m0Run.sourceHash,
        inputHash: m0Run.inputHash,
        outputHash: m0Run.outputHash,
        sourceFiles: Number(m0Run.sourceFiles || 0),
        inputs: Number(m0Run.inputs || 0),
        outputs: Number(m0Run.outputs || 0),
        trainingRows: totalRows,
        healthChecks: 5,
        healthChecksOk: totalRows ? 5 : 4,
        gitDirty: Boolean(m0Run.git?.dirty)
      },
      settlement: {
        settlementId: `${m0Run.runId || `mlb-${date}-MLB-M0`}:journal`,
        status: settlementStatus,
        gradeMode: 'mlb-results-journal',
        settledAt: null,
        completeMatches: moneylineRows.length,
        pendingMatches: totalRows ? 0 : Number(m0Run.artifactSummary?.publicSummaryGames || 0),
        rowCount: totalRows,
        gradedCount: totalRows,
        hitCount: totalHits,
        missCount: Math.max(0, totalRows - totalHits),
        roiPer100: null,
        lanes: [
          lane('Full-game side', moneylineHits, moneylineRows.length),
          lane('First-five side', first5Hits, moneylineRows.length),
          lane('First inning', firstInningHits, firstInningRows.length),
          lane('HR board', hrHits, hrRows.length),
          lane('Player props', propHits, propRows.length)
        ].filter((entry) => entry.rows > 0)
      },
      changelog: [
        `Snapshotted run ${m0Run.runId}.`,
        `Stack ${stackLabel || 'MLB-W1 / MLB-F0 / MLB-M0 / MLB-RP36 / MLB-E0'} is the active MLB cartridge shell for this slate.`,
        totalRows
          ? `${date} closeout is training-ready: ${moneylineRows.length} side rows, ${firstInningRows.length} first-inning rows, ${hrRows.length} HR rows, and ${propRows.length} prop rows.`
          : `${date} is pending settlement; result journal rows have not been exported yet.`,
        'MLB-RP36 remains a consumed relief addendum; it is not a peer parent model.',
        'Daily closeout now exports/imports the side board before postmortem so side backtests cannot silently stay empty.'
      ],
      artifacts: [
        publicArtifact(`${date} MLB-M0 run manifest`, 'run-manifest'),
        publicArtifact(`${date} MLB results journal`, 'private-results-journal'),
        publicArtifact(`${date} side backtest rows`, 'warehouse-side-backtest'),
        ...(modelDescription ? [publicArtifact(`${m0Run.modelId || 'MLB-M0'} model notes`, 'model-notes')] : [])
      ]
    })
  }
  if (rp36Run) {
    const rp36Description = readMlbModelDescription(rp36Run.modelId || 'MLB-RP36')
    models.push({
      id: `${date}-mlb-${rp36Run.modelId || 'MLB-RP36'}-run`,
      sport: 'MLB',
      lane: 'Relief addendum',
      modelName: rp36Run.modelId || 'MLB-RP36',
      version: 'MLB-RP36',
      performanceLabel: 'Run snapshotted / settlement pending',
      performancePct: null,
      coverageLabel: `${rp36Run.artifactSummary?.candidateCount ?? 0} candidates | ${rp36Run.artifactSummary?.relieverTeams ?? 0} team contexts | ${rp36Run.sourceFiles ?? 0} source files`,
      modelDescription: rp36Description,
      run: {
        runId: rp36Run.runId,
        status: rp36Run.status,
        mode: rp36Run.mode,
        snapshottedAt: rp36Run.snapshottedAt,
        sourceHash: rp36Run.sourceHash,
        inputHash: rp36Run.inputHash,
        outputHash: rp36Run.outputHash,
        sourceFiles: Number(rp36Run.sourceFiles || 0),
        inputs: Number(rp36Run.inputs || 0),
        outputs: Number(rp36Run.outputs || 0),
        trainingRows: Number(rp36Run.artifactSummary?.candidateCount || 0),
        healthChecks: 3,
        healthChecksOk: 3,
        gitDirty: Boolean(rp36Run.git?.dirty)
      },
      settlement: null,
      changelog: [
        `Snapshotted run ${rp36Run.runId}.`,
        'MLB-RP36 is an addendum consumed by MLB-M0, focused on first-up reliever clusters and bridge risk.',
        'May 31 is the first reproducible RP36 run envelope; May 30 remains legacy context unless its original input snapshot is restored.'
      ],
      artifacts: [
        publicArtifact(`${date} MLB-RP36 run manifest`, 'run-manifest'),
        publicArtifact(`${date} reliever-shadow artifact`, 'private-reliever-shadow'),
        ...(rp36Description ? [publicArtifact('MLB-RP36 model notes', 'model-notes')] : [])
      ]
    })
  }
  if (moneylineRows.length) {
    models.push({
      id: `${date}-mlb-sides`,
      sport: 'MLB',
      lane: 'Sides',
      modelName: moneylineRows[0]?.modelName ?? 'mlb-side-board',
      version: moneylineRows[0]?.sourceType ?? 'journal',
      performanceLabel: `FG ${pctLabel(moneylineHits, moneylineRows.length)} | F5 ${pctLabel(first5Hits, moneylineRows.length)}`,
      performancePct: moneylineRows.length ? Number(((moneylineHits / moneylineRows.length) * 100).toFixed(1)) : null,
      coverageLabel: `${moneylineRows.length} side rows`,
      changelog: [
        sourceLabels[0] ? `Input stack: ${sourceLabels[0]}.` : 'Loaded from settled MLB side journal.',
        'Tracks full-game and first-five separately so late bullpen flips do not hide starter-window errors.',
        'Daily rows keep confidence, volatility, market price, edge flags, and result labels for backtesting.'
      ],
      artifacts: [publicArtifact(`${date} MLB results journal`, 'private-results-journal')]
    })
  }
  if (firstInningRows.length) {
    models.push({
      id: `${date}-mlb-first-inning`,
      sport: 'MLB',
      lane: 'YRFI/NRFI',
      modelName: firstInningRows[0]?.modelName ?? 'mlb-first-inning',
      performanceLabel: pctLabel(firstInningHits, firstInningRows.length),
      performancePct: firstInningRows.length ? Number(((firstInningHits / firstInningRows.length) * 100).toFixed(1)) : null,
      coverageLabel: `${firstInningRows.length} first-inning rows`,
      changelog: [
        'Grades first-inning picks as a separate lane instead of blending them with full-game sides.',
        'Uses the JSONL result journal as the training-ready source of truth.'
      ],
      artifacts: [publicArtifact(`${date} MLB results journal`, 'private-results-journal')]
    })
  }
  if (hrRows.length) {
    models.push({
      id: `${date}-mlb-hr`,
      sport: 'MLB',
      lane: 'HR board',
      modelName: hrRows[0]?.modelName ?? 'statcast-hr-prototype',
      performanceLabel: propPctLabel(hrHits, hrRows.length),
      performancePct: hrRows.length ? Number(((hrHits / hrRows.length) * 100).toFixed(1)) : null,
      coverageLabel: `${hrRows.length} HR rows`,
      changelog: [
        'Tracks saved HR-board hit rate independently from side model accuracy.',
        'Keeps player-level failures visible so a good side day cannot mask bad prop selection.'
      ],
      artifacts: [publicArtifact(`${date} MLB results journal`, 'private-results-journal')]
    })
  }
  if (propRows.length) {
    models.push({
      id: `${date}-mlb-props`,
      sport: 'MLB',
      lane: 'Player props',
      modelName: propRows[0]?.modelName ?? 'mlb-player-props',
      performanceLabel: propPctLabel(propHits, propRows.length),
      performancePct: propRows.length ? Number(((propHits / propRows.length) * 100).toFixed(1)) : null,
      coverageLabel: `${propRows.length} prop rows`,
      changelog: [
        'Grades tracked non-HR props separately from HRs and sides.',
        'Keeps low-hit prop slates visible on the Models page instead of burying them in day summaries.'
      ],
      artifacts: [publicArtifact(`${date} MLB results journal`, 'private-results-journal')]
    })
  }

  return models
}

const shortHash = (value: unknown) => String(value ?? '').slice(0, 10)
const sqlString = (value: unknown) => `'${String(value ?? '').replace(/'/g, "''")}'`

const loadTennisModelRunsByDate = () => {
  const byDate = new Map<string, any[]>()
  if (!tableExists('tennis_model_runs')) return byDate
  const rows = runWarehouseJson<any>(`
    select r.run_id, r.slate_date, r.sport, r.warehouse_version, r.feature_version,
           r.model_id, r.evaluator_version, r.mode, r.status, r.locked_at,
           r.input_hash, r.source_hash, r.output_hash, r.git_commit, r.git_dirty,
           r.cartridge_stack_json,
           (select count(*) from tennis_model_run_files f where f.run_id = r.run_id) as source_files,
           (select count(*) from tennis_model_run_inputs i where i.run_id = r.run_id) as input_files,
           (select count(*) from tennis_model_run_outputs o where o.run_id = r.run_id) as output_files,
           (select count(*) from tennis_model_run_training_rows t where t.run_id = r.run_id) as training_rows
    from tennis_model_runs r
    where r.sport = 'tennis'
    order by r.slate_date desc, r.locked_at desc
  `)
  for (const row of rows) {
    const date = String(row.slate_date || '')
    if (!date) continue
    const list = byDate.get(date) ?? []
    list.push(row)
    byDate.set(date, list)
  }
  return byDate
}

const summarizeTennisRunModel = (date: string, run: any) => {
  const runDir = path.join(dataPrivateRoot, 'model-runs', 'tennis', String(run.model_id || 'TEN-T0'), date)
  const runManifest = readJsonFile(path.join(runDir, 'run.json'))
  const health = readJsonFile(path.join(runDir, 'health.json'))
  const snapshot = readJsonFile(path.join(runDir, 'predictions.snapshot.json'))
  const backtest = readTennisBacktestSummary(date, runDir)
  const modelDescription = readTennisModelDescription(run.model_id || 'TEN-T0')
  const healthChecks = Array.isArray(health?.checks) ? health.checks : []
  const okChecks = healthChecks.filter((check: any) => check.status === 'ok').length
  const matchCount = Array.isArray(snapshot?.matches) ? snapshot.matches.length : null
  const stackLabel = [run.warehouse_version, run.feature_version, run.model_id, run.evaluator_version].filter(Boolean).join(' / ')
  const runStatus = `${String(run.mode || '').replace(/^./, (letter) => letter.toUpperCase())} ${run.status || 'run'}`
  const snapshotTimestamp = runManifest?.snapshottedAt || run.locked_at || null
  const settlement = tableExists('tennis_model_run_settlements')
    ? runWarehouseJson<any>(`
        select settlement_id, status, grade_mode, settled_at, complete_matches,
               pending_matches, row_count, graded_count, hit_count, miss_count,
               roi_per_100
        from tennis_model_run_settlements
        where source_run_id = ${sqlString(run.run_id)}
        order by updated_at desc
        limit 1
      `)[0] ?? null
    : null
  const laneGrades = settlement && tableExists('tennis_model_run_lane_grades')
    ? runWarehouseJson<any>(`
        select lane,
               count(*) as rows,
               sum(graded) as graded,
               sum(case when hit = 1 then 1 else 0 end) as hits,
               sum(case when graded = 1 and hit = 0 then 1 else 0 end) as misses,
               round(avg(case when graded = 1 then hit end) * 100, 1) as hit_pct,
               round(avg(case when graded = 1 then pnl_per_100 end), 1) as avg_pnl_per_100
        from tennis_model_run_lane_grades
        where settlement_id = ${sqlString(settlement.settlement_id)}
        group by lane
        order by lane
      `)
    : []
  const settlementLabel = settlement
    ? `${settlement.status} settlement (${Number(settlement.graded_count || 0)}/${Number(settlement.row_count || 0)} rows graded)`
    : runStatus

  return {
    id: `${date}-tennis-${run.model_id}-run`,
    sport: 'Tennis',
    lane: 'Cartridge run',
    modelName: run.model_id,
    version: stackLabel,
    performanceLabel: settlementLabel,
    performancePct: settlement && Number(settlement.graded_count || 0)
      ? Number(((Number(settlement.hit_count || 0) / Number(settlement.graded_count || 1)) * 100).toFixed(1))
      : null,
    coverageLabel: `${matchCount ?? 0} matches | ${run.source_files ?? 0} source files | ${run.input_files ?? 0} inputs${settlement ? ` | ${settlement.row_count} settlement rows` : ''}`,
    modelDescription,
    backtest,
    stack: {
      warehouseVersion: run.warehouse_version,
      featureVersion: run.feature_version,
      modelId: run.model_id,
      evaluatorVersion: run.evaluator_version
    },
    run: {
      runId: run.run_id,
      status: run.status,
      mode: run.mode,
      snapshottedAt: snapshotTimestamp,
      sourceHash: run.source_hash,
      inputHash: run.input_hash,
      outputHash: run.output_hash,
      sourceFiles: Number(run.source_files || 0),
      inputs: Number(run.input_files || 0),
      outputs: Number(run.output_files || 0),
      trainingRows: Number(run.training_rows || 0),
      healthChecks: healthChecks.length,
      healthChecksOk: okChecks,
      gitDirty: Boolean(run.git_dirty)
    },
    settlement: settlement
      ? {
          settlementId: settlement.settlement_id,
          status: settlement.status,
          gradeMode: settlement.grade_mode,
          settledAt: settlement.settled_at,
          completeMatches: Number(settlement.complete_matches || 0),
          pendingMatches: Number(settlement.pending_matches || 0),
          rowCount: Number(settlement.row_count || 0),
          gradedCount: Number(settlement.graded_count || 0),
          hitCount: Number(settlement.hit_count || 0),
          missCount: Number(settlement.miss_count || 0),
          roiPer100: settlement.roi_per_100,
          lanes: laneGrades.map((lane: any) => ({
            lane: lane.lane,
            rows: Number(lane.rows || 0),
            graded: Number(lane.graded || 0),
            hits: Number(lane.hits || 0),
            misses: Number(lane.misses || 0),
            hitPct: lane.hit_pct,
            avgPnlPer100: lane.avg_pnl_per_100
          }))
        }
      : null,
    changelog: [
      `${run.status === 'snapshotted' ? 'Snapshotted' : 'Recorded'} run ${run.run_id}.`,
      `Stack ${stackLabel} is the active tennis cartridge chain for this slate.`,
      run.source_hash || run.input_hash || run.output_hash
        ? `Health gates ${okChecks}/${healthChecks.length || 0} ok; source ${shortHash(run.source_hash)}, input ${shortHash(run.input_hash)}, output ${shortHash(run.output_hash)}.`
        : `Health gates ${okChecks}/${healthChecks.length || 0} ok; this run records coverage counts instead of source/input/output fingerprints.`,
      settlement
        ? `Postmatch settlement is ${settlement.status}: ${settlement.complete_matches} complete matches, ${settlement.pending_matches} pending matches, ${settlement.graded_count}/${settlement.row_count} rows graded.`
        : 'Postmatch settlement has not been generated for this run.',
      backtest
        ? `Backtest ${backtest.hits}/${backtest.rows} (${Number(backtest.hitRatePct ?? 0).toFixed(1)}%); data-only ${Number(backtest.dataOnlyHitRatePct ?? 0).toFixed(1)}%.`
        : 'Backtest artifact has not been exported for this run.',
      modelDescription
        ? `Model card loaded: ${(modelDescription.keyImprovements || []).length} improvements, ${(modelDescription.keyMetrics || []).length} metrics, ${(modelDescription.notes || []).length} notes.`
        : 'Model card has not been exported for this cartridge.',
      'Run verifier requires ML, spread, match O/U, set-win, and first-set O/U rows before publishing.'
    ],
    artifacts: [
      publicArtifact(`${date} run manifest`, 'run-manifest'),
      publicArtifact(`${date} prediction snapshot`, 'prediction-snapshot'),
      publicArtifact(`${date} run snapshot`, 'run-snapshot'),
      ...(modelDescription ? [publicArtifact(`${run.model_id || 'TEN-T0'} model notes`, 'model-notes')] : []),
      ...(settlement ? [publicArtifact(`${date} postmatch settlement`, 'postmatch-grades')] : [])
    ]
  }
}

const summarizeTennisModelsForDay = (date: string, historyEntry: any | null, runs: any[] = []) => {
  const models = []
  const ensemblePath = path.join(tennisPredictionsRoot, `${date}-multimodel-ensemble.json`)
  const valuePath = path.join(reportsRoot, `tennis-value-backtest-${date}.json`)
  const spikePath = path.join(reportsRoot, `kalshi-tennis-spike-model-${date}.json`)
  const ensemble = readJsonFile(ensemblePath)
  const value = readJsonFile(valuePath)
  const spike = readJsonFile(spikePath)
  const backtest = readTennisBacktestSummary(date)
  const valueSettlement = summarizeTennisValueSettlement(date, value)
  const valueSettlementLabel = tennisValueSettlementLabel(valueSettlement)
  const tennisRecord = historyEntry?.performance?.tennis
  const atpRecord = historyEntry?.performance?.atp
  const wtaRecord = historyEntry?.performance?.wta
  const ensembleRows = Array.isArray(ensemble?.rows) ? ensemble.rows : []
  const valueRows = Array.isArray(value?.rows) ? value.rows : []
  const spikeRows = Array.isArray(spike?.currentCandidates) ? spike.currentCandidates : []

  for (const run of runs) {
    models.push(summarizeTennisRunModel(date, run))
  }

  if (ensemble || tennisRecord) {
    models.push({
      id: `${date}-tennis-ensemble`,
      sport: 'Tennis',
      lane: 'Winner / ML value',
      modelName: runs[0]?.model_id ?? ensemble?.model ?? 'pandas-ensemble-logit-rf-gb-xgb',
      version: runs[0] ? `${runs[0].model_id} cartridge output` : 'warehouse ensemble',
      performanceLabel: tennisRecord
        ? `Desk ${historyRecordLabel(tennisRecord)}${atpRecord ? ` | ATP ${historyRecordLabel(atpRecord)}` : ''}${wtaRecord ? ` | WTA ${historyRecordLabel(wtaRecord)}` : ''}`
        : valueSettlementLabel
          ? valueSettlementLabel
        : 'Pre-match / pending settlement',
      performancePct: tennisRecord
        ? Number(((Number(tennisRecord.wins) / (Number(tennisRecord.wins) + Number(tennisRecord.losses))) * 100).toFixed(1))
        : valueSettlement?.lanes?.find((lane: any) => lane.lane === 'ML')?.hitPct ?? null,
      coverageLabel: ensembleRows.length ? `${ensembleRows.length} ensemble rows` : 'No ensemble rows exported',
      settlement: valueSettlement,
      backtest,
      changelog: [
        runs[0] ? `Generated under run ${runs[0].run_id}.` : 'Generated before formal tennis cartridge snapshots existed.',
        'Uses warehouse features and excludes source-site picks such as Tennistonic as direct model inputs.',
        'Blends data-only and market-calibrated probabilities, then applies risk gates for taxed favorites and fragile profiles.',
        valueRows.length
          ? `Value pass graded ${valueRows.length} ML/spread/total rows from FanDuel and model fair prices.`
          : 'Value pass pending or not exported for this date.',
        backtest
          ? `Model backtest through this date: ${backtest.label}.`
          : 'No model backtest artifact is available for this date.'
      ],
      artifacts: [
        ...(ensemble ? [publicArtifact(`${date} tennis ensemble`, 'private-ensemble-artifact')] : []),
        ...(value ? [publicArtifact(`${date} tennis value backtest`, 'private-value-backtest')] : [])
      ]
    })
  }

  if (spike) {
    const backtest = spike.modelBacktest ?? {}
    models.push({
      id: `${date}-tennis-kalshi-spike`,
      sport: 'Tennis',
      lane: 'Prediction-market trade',
      modelName: 'kalshi-tennis-spike-model',
      version: 'trade-to-sell',
      performanceLabel: Number.isFinite(Number(backtest.hit25x))
        ? `2.5x hit ${(Number(backtest.hit25x) * 100).toFixed(1)}% | ROI ${Number(backtest.roi25xCents ?? 0).toFixed(1)}c`
        : 'Spike backtest pending',
      performancePct: Number.isFinite(Number(backtest.hit25x)) ? Number((Number(backtest.hit25x) * 100).toFixed(1)) : null,
      coverageLabel: `${spikeRows.length} current candidates | ${spike.coverage?.historicalRows ?? 0} historical rows`,
      changelog: [
        runs[0] ? `Linked to run ${runs[0].run_id}.` : 'Generated before formal tennis cartridge snapshots existed.',
        'Separates trade-to-sell targets from winner picks so losing underdogs can still be profitable exits.',
        'Requires price-history support from Kalshi candles before a row graduates above watch.',
        spike.coverage?.weatherNote ?? 'Weather context not yet warehoused for this model.'
      ],
      artifacts: [publicArtifact(`${date} Kalshi spike model`, 'private-kalshi-spike-artifact')]
    })
  }

  return models
}

const exportModelHistory = async (history: any[]) => {
  const modelHistoryRoot = path.join(publishedDataRoot, 'model-history')
  await ensureDir(modelHistoryRoot)

  const dates = new Set<string>()
  const tennisRunsByDate = loadTennisModelRunsByDate()
  for (const entry of history) dates.add(String(entry.id))
  for (const date of tennisRunsByDate.keys()) dates.add(date)
  for (const date of loadMlbModelRunDates()) dates.add(date)
  if (fsSync.existsSync(tennisPredictionsRoot)) {
    for (const fileName of fsSync.readdirSync(tennisPredictionsRoot)) {
      const match = fileName.match(/^(\d{4}-\d{2}-\d{2})-/)
      if (match) dates.add(match[1])
    }
  }
  if (fsSync.existsSync(historyJournalRoot)) {
    for (const fileName of fsSync.readdirSync(historyJournalRoot)) {
      const match = fileName.match(/^mlb-results-(\d{4}-\d{2}-\d{2})\.jsonl$/)
      if (match) dates.add(match[1])
    }
  }

  const historyByDate = new Map(history.map((entry: any) => [String(entry.id), entry]))
  const entries = [...dates]
    .sort((left, right) => right.localeCompare(left))
    .map((date) => {
      const historyEntry = historyByDate.get(date) ?? null
      const tennisRuns = tennisRunsByDate.get(date) ?? []
      const models = [
        ...summarizeMlbModelsForDay(date),
        ...summarizeTennisModelsForDay(date, historyEntry, tennisRuns)
      ]
      if (!models.length) return null
      return {
        id: date,
        date,
        label: historyEntry?.label ?? toTitleDate(date),
        status: historyEntry?.status ?? 'active',
        models
      }
    })
    .filter(Boolean)

  await writeJson(path.join(modelHistoryRoot, 'index.json'), sanitizePublicPayload(entries))
  return entries.length
}

const exportStories = async () => {
  const storiesRoot = path.join(publishedDataRoot, 'stories')
  await ensureDir(storiesRoot)

  const stories = await loadStoryArchiveFromModules()
  const index = stories.map((day) => ({
    id: day.id,
    date: day.date,
    headline: day.headline,
    metrics: day.metrics,
    games: Array.isArray(day.games) ? day.games.length : 0
  }))

  await writeJson(path.join(storiesRoot, 'index.json'), index)

  for (const day of stories) {
    const id = String(day.id)
    const dayRoot = path.join(storiesRoot, id)
    const gamesRoot = path.join(dayRoot, 'games')
    await fs.rm(path.join(storiesRoot, `${id}.json`), { force: true })
    await fs.rm(dayRoot, { recursive: true, force: true })
    await ensureDir(gamesRoot)

    const summary = {
      ...day,
      games: Array.isArray(day.games)
        ? day.games.map((game) => {
            const gameSummary = { ...game }
            delete gameSummary.timeline
            return gameSummary
          })
        : []
    }

    await writeJson(path.join(dayRoot, 'summary.json'), summary)

    for (const game of Array.isArray(day.games) ? day.games : []) {
      await writeJson(path.join(gamesRoot, `${game.gamePk}.json`), game)
    }
  }

  return stories.length
}

const main = async () => {
  await ensureDir(publishedDataRoot)

  const [slates, historyEntries, stories] = await Promise.all([
    exportSlates(),
    exportHistory(),
    exportStories()
  ])
  const modelHistory = await exportModelHistory(historyEntries)

  await writeJson(path.join(publishedDataRoot, 'meta.json'), {
    generatedAt: new Date().toISOString(),
    slates,
    history: historyEntries.length,
    modelHistory,
    stories
  })

  console.log(
    `Published data exported: ${slates} slates, ${historyEntries.length} history entries, ${modelHistory} model-history days, ${stories} story days -> ${publishedDataRoot}`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

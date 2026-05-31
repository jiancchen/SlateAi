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

const historyRecordLabel = (record: any) =>
  record ? pctLabel(Number(record.wins), Number(record.wins) + Number(record.losses)) : 'Performance pending'

const propRecordLabel = (record: any) => record ? propPctLabel(Number(record.hits), Number(record.total)) : 'Performance pending'

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
        path: `data-private/history/${fileName}`,
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
      artifacts: [{ label: `${toTitleDate(date)} MLB results journal`, path: `data-private/history/${fileName}` }]
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
        confidence: Number.isFinite(Number(market.confidence)) ? Number(market.confidence) : game.analysis?.confidence ?? null,
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
  await writeJson(path.join(historyRoot, 'index.json'), history)

  for (const entry of history) {
    const id = String(entry.id)
    await writeJson(path.join(historyRoot, `${id}.json`), entry)
  }

  return history
}

const summarizeMlbModelsForDay = (date: string) => {
  const journalPath = path.join(historyJournalRoot, `mlb-results-${date}.jsonl`)
  if (!fsSync.existsSync(journalPath)) return []
  const records = fsSync
    .readFileSync(journalPath, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))

  if (!records.length) return []

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
      artifacts: [{ label: `${date} MLB results journal`, path: `data-private/history/mlb-results-${date}.jsonl` }]
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
      artifacts: [{ label: `${date} MLB results journal`, path: `data-private/history/mlb-results-${date}.jsonl` }]
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
      artifacts: [{ label: `${date} MLB results journal`, path: `data-private/history/mlb-results-${date}.jsonl` }]
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
      artifacts: [{ label: `${date} MLB results journal`, path: `data-private/history/mlb-results-${date}.jsonl` }]
    })
  }

  return models
}

const summarizeTennisModelsForDay = (date: string, historyEntry: any | null) => {
  const models = []
  const ensemblePath = path.join(tennisPredictionsRoot, `${date}-multimodel-ensemble.json`)
  const valuePath = path.join(reportsRoot, `tennis-value-backtest-${date}.json`)
  const spikePath = path.join(reportsRoot, `kalshi-tennis-spike-model-${date}.json`)
  const ensemble = readJsonFile(ensemblePath)
  const value = readJsonFile(valuePath)
  const spike = readJsonFile(spikePath)
  const tennisRecord = historyEntry?.performance?.tennis
  const atpRecord = historyEntry?.performance?.atp
  const wtaRecord = historyEntry?.performance?.wta
  const ensembleRows = Array.isArray(ensemble?.rows) ? ensemble.rows : []
  const valueRows = Array.isArray(value?.rows) ? value.rows : []
  const spikeRows = Array.isArray(spike?.currentCandidates) ? spike.currentCandidates : []

  if (ensemble || tennisRecord) {
    models.push({
      id: `${date}-tennis-ensemble`,
      sport: 'Tennis',
      lane: 'Winner / ML value',
      modelName: ensemble?.model ?? 'pandas-ensemble-logit-rf-gb-xgb',
      version: 'warehouse ensemble',
      performanceLabel: tennisRecord
        ? `Desk ${historyRecordLabel(tennisRecord)}${atpRecord ? ` | ATP ${historyRecordLabel(atpRecord)}` : ''}${wtaRecord ? ` | WTA ${historyRecordLabel(wtaRecord)}` : ''}`
        : 'Pre-match / pending settlement',
      performancePct: tennisRecord
        ? Number(((Number(tennisRecord.wins) / (Number(tennisRecord.wins) + Number(tennisRecord.losses))) * 100).toFixed(1))
        : null,
      coverageLabel: ensembleRows.length ? `${ensembleRows.length} ensemble rows` : 'No ensemble rows exported',
      changelog: [
        'Uses warehouse features and excludes source-site picks such as Tennistonic as direct model inputs.',
        'Blends data-only and market-calibrated probabilities, then applies risk gates for taxed favorites and fragile profiles.',
        valueRows.length
          ? `Value pass graded ${valueRows.length} ML/spread/total rows from FanDuel and model fair prices.`
          : 'Value pass pending or not exported for this date.'
      ],
      artifacts: [
        ...(ensemble ? [{ label: `${date} tennis ensemble`, path: `data-private/predictions/tennis/${date}-multimodel-ensemble.json` }] : []),
        ...(value ? [{ label: `${date} tennis value backtest`, path: `data-private/reports/tennis-value-backtest-${date}.json` }] : [])
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
        'Separates trade-to-sell targets from winner picks so losing underdogs can still be profitable exits.',
        'Requires price-history support from Kalshi candles before a row graduates above watch.',
        spike.coverage?.weatherNote ?? 'Weather context not yet warehoused for this model.'
      ],
      artifacts: [{ label: `${date} Kalshi spike model`, path: `data-private/reports/kalshi-tennis-spike-model-${date}.json` }]
    })
  }

  return models
}

const exportModelHistory = async (history: any[]) => {
  const modelHistoryRoot = path.join(publishedDataRoot, 'model-history')
  await ensureDir(modelHistoryRoot)

  const dates = new Set<string>()
  for (const entry of history) dates.add(String(entry.id))
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
      const models = [
        ...summarizeMlbModelsForDay(date),
        ...summarizeTennisModelsForDay(date, historyEntry)
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

  await writeJson(path.join(modelHistoryRoot, 'index.json'), entries)
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

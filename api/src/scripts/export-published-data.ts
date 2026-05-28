import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import {
  loadHistoryArchiveFromModules,
  loadStoryArchiveFromModules
} from '../lib/archive-loader.js'
import {
  listSlateManifestFromModules,
  loadSlateDayFromModules
} from '../lib/day-loader.js'
import { dataPrivateRoot, publishedDataRoot } from '../lib/paths.js'

const historyJournalRoot = path.join(dataPrivateRoot, 'history')

const ensureDir = async (dirPath: string) => {
  await fs.mkdir(dirPath, { recursive: true })
}

const writeJson = async (filePath: string, payload: unknown) => {
  await fs.writeFile(filePath, JSON.stringify(payload), 'utf8')
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
  const rows = games
    .filter((game) => game?.league === 'Tennis')
    .flatMap((game) =>
      (game.tennisContext?.derivativeMarkets ?? []).map((market: any) => ({
        gameId: game.id,
        gameTitle: game.title,
        start: game.start,
        marketType: market.marketType ?? market.label ?? '',
        label: market.label ?? market.marketType ?? '',
        selection: market.selection ?? market.lean ?? '',
        line: market.line ?? null,
        americanOdds: market.americanOdds ?? null,
        confidence: Number.isFinite(Number(market.confidence)) ? Number(market.confidence) : game.analysis?.confidence ?? null,
        modelPct: market.modelPct ?? null,
        impliedPct: market.impliedPct ?? null,
        edgePct: market.edgePct ?? null,
        evPer100: market.evPer100 ?? null,
        valueGrade: market.valueGrade ?? 'No grade',
        betGrade: Boolean(market.betGrade),
        reason: market.reason ?? ''
      }))
    )

  if (!rows.length) return null

  const countByGrade = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.valueGrade] = (acc[row.valueGrade] ?? 0) + 1
    return acc
  }, {})
  const byEvDesc = (left: any, right: any) => Number(right.evPer100 ?? -999) - Number(left.evPer100 ?? -999)
  const byEvAsc = (left: any, right: any) => Number(left.evPer100 ?? 999) - Number(right.evPer100 ?? 999)
  const pricedRows = rows.filter((row) => Number.isFinite(Number(row.evPer100)))
  const noPriceRows = rows.filter((row) => /needs posted price|no price/i.test(String(row.valueGrade)))

  return {
    date: isoDate,
    totalRows: rows.length,
    pricedRows: pricedRows.length,
    noPriceRows: noPriceRows.length,
    countByGrade,
    betGradeRows: rows.filter((row) => row.valueGrade === 'Bet-grade value').sort(byEvDesc).slice(0, 8),
    thinRows: rows.filter((row) => row.valueGrade === 'Thin value').sort(byEvDesc).slice(0, 6),
    negativeMlRows: rows
      .filter((row) => row.valueGrade === 'Negative EV' && String(row.marketType).toLowerCase() === 'ml')
      .sort(byEvAsc)
      .slice(0, 6),
    note:
      isoDate === '2026-05-28'
        ? 'May 28 is pre-match. May 27 backtest: ML value rows went 3-1 with +21.9% flat ROI; spreads went 1-3 and stay downgraded until the next settled pass.'
        : 'EV is model probability against the posted price. A likely winner can still be a bad bet if the payout is too small.'
  }
}

const buildSlateGameSummary = (game: any) => ({
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
  metadata: game.metadata ?? null,
  lineupBoard: buildSummaryLineupBoard(game.lineupBoard),
  offenseContext: buildSlimTeamFeedContext(game.offenseContext),
  bullpenContext: buildSlimTeamFeedContext(game.bullpenContext),
  detailLevel: 'summary'
})

const buildSlateGameDetail = (game: any) => {
  const detail = {
    ...game,
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
  await writeJson(path.join(slatesRoot, 'index.json'), manifest)

  for (const slate of manifest) {
    const day = await loadSlateDayFromModules(slate.id)
    const slateRoot = path.join(slatesRoot, slate.id)
    const gamesRoot = path.join(slateRoot, 'games')
    await fs.rm(path.join(slatesRoot, `${slate.id}.json`), { force: true })
    await fs.rm(slateRoot, { recursive: true, force: true })
    await ensureDir(gamesRoot)

    const summaryDay = {
      ...day,
      tennisValueSummary: buildTennisValueSummary(day.games ?? [], day.slateMeta?.isoDate ?? slate.id),
      games: Array.isArray(day.games) ? day.games.map(buildSlateGameSummary) : []
    }

    await writeJson(path.join(slateRoot, 'summary.json'), summaryDay)

    for (const game of day.games ?? []) {
      await writeJson(path.join(gamesRoot, `${game.id}.json`), buildSlateGameDetail(game))
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

  return history.length
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

  const [slates, history, stories] = await Promise.all([
    exportSlates(),
    exportHistory(),
    exportStories()
  ])

  await writeJson(path.join(publishedDataRoot, 'meta.json'), {
    generatedAt: new Date().toISOString(),
    slates,
    history,
    stories
  })

  console.log(
    `Published data exported: ${slates} slates, ${history} history entries, ${stories} story days -> ${publishedDataRoot}`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

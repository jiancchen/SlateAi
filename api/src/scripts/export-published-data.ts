import fs from 'node:fs/promises'
import path from 'node:path'
import {
  loadHistoryArchiveFromModules,
  loadStoryArchiveFromModules
} from '../lib/archive-loader.js'
import {
  listSlateManifestFromModules,
  loadSlateDayFromModules
} from '../lib/day-loader.js'
import { publishedDataRoot } from '../lib/paths.js'

const ensureDir = async (dirPath: string) => {
  await fs.mkdir(dirPath, { recursive: true })
}

const writeJson = async (filePath: string, payload: unknown) => {
  await fs.writeFile(filePath, JSON.stringify(payload), 'utf8')
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
  const detail = { ...game, detailLevel: 'full' }
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

  const history = await loadHistoryArchiveFromModules()
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

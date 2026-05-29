import Fastify from 'fastify'
import cors from '@fastify/cors'
import {
  loadHistoryArchive,
  loadHistoryEntry,
  loadStoryDayWithFallback,
  loadStoryGameWithFallback,
  loadStoryDay,
  loadStoryIndex
} from './lib/archive-loader.js'
import { listSlateManifest, loadSlateDay, loadSlateGameDetail } from './lib/day-loader.js'
import { loadMlbHomeRunBoard, loadMlbLineupBoard, loadMlbPlayerProps } from './lib/file-loader.js'
import { warehousePath } from './lib/paths.js'
import { runSqliteJson } from './lib/sqlite.js'

const app = Fastify({
  logger: true
})

await app.register(cors, {
  origin: true
})

app.get('/health', async () => ({
  ok: true,
  service: 'sports-trading-board-api',
  date: new Date().toISOString()
}))

app.get('/api/meta', async () => {
  const slates = await listSlateManifest()

  return {
    service: 'sports-trading-board-api',
    slatesAvailable: slates.length,
    earliestSlate: slates[0]?.id ?? null,
    latestSlate: slates.at(-1)?.id ?? null,
    warehousePath
  }
})

app.get('/api/warehouse/status', async () => {
  const [row] = runSqliteJson<{
    games: number
    plate_appearances: number
    pitch_events: number
    batting_rows: number
    story_rows: number
    earliest_game_date: string | null
    latest_game_date: string | null
  }>(`
    SELECT
      (SELECT COUNT(*) FROM mlb_game_outcomes) AS games,
      (SELECT COUNT(*) FROM mlb_plate_appearances) AS plate_appearances,
      (SELECT COUNT(*) FROM mlb_pitch_events) AS pitch_events,
      (SELECT COUNT(*) FROM mlb_player_game_batting) AS batting_rows,
      (SELECT COUNT(*) FROM mlb_game_story_signals) AS story_rows,
      (SELECT MIN(game_date) FROM mlb_game_outcomes) AS earliest_game_date,
      (SELECT MAX(game_date) FROM mlb_game_outcomes) AS latest_game_date
  `)

  return {
    warehouse: row ?? null
  }
})

app.get('/api/slates', async () => {
  const slates = await listSlateManifest()
  return { slates }
})

const normalizeSearchText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()

const searchScore = (haystack: string, query: string) => {
  if (!query) return 0
  if (haystack.includes(query)) return 100 + query.length
  const terms = query.split(/\s+/).filter(Boolean)
  const hits = terms.filter((term) => haystack.includes(term)).length
  return hits ? hits * 20 + Math.round((hits / terms.length) * 20) : 0
}

app.get('/api/search/slates', async (request) => {
  const { q, limit } = request.query as { q?: string; limit?: string }
  const query = normalizeSearchText(q)
  const maxRows = Math.min(100, Math.max(1, Number(limit) || 40))
  if (!query) return { query, results: [] }

  const slates = await listSlateManifest()
  const results: Array<Record<string, unknown>> = []
  for (const slateShell of slates) {
    const slate = await loadSlateDay(slateShell.id)
    for (const game of slate.games ?? []) {
      const matchup = Array.isArray((game as any).matchup) ? (game as any).matchup : []
      const haystack = normalizeSearchText([
        slate.id,
        slate.label,
        (game as any).title,
        (game as any).stage,
        (game as any).summary,
        (game as any).winnerName,
        (game as any).scoreline,
        (game as any).tennisResult?.winnerName,
        (game as any).tennisResult?.scoreline,
        (game as any).analysis?.participant?.name,
        ...matchup.map((entry: any) => entry?.name || entry?.displayName)
      ].join(' '))
      const score = searchScore(haystack, query)
      if (!score) continue
      results.push({
        score,
        date: slate.id,
        dateLabel: slate.label,
        gameId: (game as any).id,
        league: (game as any).league,
        title: (game as any).title,
        stage: (game as any).stage,
        start: (game as any).start,
        winnerName: (game as any).winnerName ?? (game as any).tennisResult?.winnerName ?? null,
        scoreline: (game as any).scoreline ?? (game as any).tennisResult?.scoreline ?? null,
        resultStatus: (game as any).result?.status ?? (game as any).tennisResult?.status ?? null,
        confidence: (game as any).analysis?.confidence ?? (game as any).confidence ?? null
      })
    }
  }
  results.sort((left, right) => Number(right.score) - Number(left.score) || String(right.date).localeCompare(String(left.date)))
  return { query, results: results.slice(0, maxRows) }
})

app.get('/api/slates/:date', async (request, reply) => {
  const { date } = request.params as { date: string }

  try {
    const slate = await loadSlateDay(date)
    return { slate }
  } catch (error) {
    request.log.warn({ err: error, date }, 'Failed to load slate day')
    return reply.code(404).send({
      error: 'slate_not_found',
      message: `No slate is available for ${date}`
    })
  }
})

app.get('/api/slates/:date/games/:gameId', async (request, reply) => {
  const { date, gameId } = request.params as { date: string; gameId: string }

  try {
    const game = await loadSlateGameDetail(date, gameId)
    return { game }
  } catch (error) {
    request.log.warn({ err: error, date, gameId }, 'Failed to load slate game detail')
    return reply.code(404).send({
      error: 'slate_game_not_found',
      message: `No game detail is available for ${date}/${gameId}`
    })
  }
})

app.get('/api/history', async () => {
  const history = await loadHistoryArchive()
  return { history }
})

app.get('/api/history/:date', async (request, reply) => {
  const { date } = request.params as { date: string }
  const directEntry = await loadHistoryEntry(date)
  const history = directEntry ? null : await loadHistoryArchive()
  const entry = (directEntry as Record<string, unknown> | null) ?? history?.find((item) => item.id === date) ?? null

  if (!entry) {
    return reply.code(404).send({
      error: 'history_not_found',
      message: `No history entry is available for ${date}`
    })
  }

  return { entry }
})

app.get('/api/stories', async () => {
  const stories = await loadStoryIndex()
  return {
    stories
  }
})

app.get('/api/stories/:date', async (request, reply) => {
  const { date } = request.params as { date: string }
  const day = (await loadStoryDayWithFallback(date)) as Record<string, unknown> | null

  if (!day) {
    return reply.code(404).send({
      error: 'story_day_not_found',
      message: `No story archive day is available for ${date}`
    })
  }

  return { day }
})

app.get('/api/stories/:date/games/:gamePk', async (request, reply) => {
  const { date, gamePk } = request.params as { date: string; gamePk: string }
  const game = (await loadStoryGameWithFallback(date, gamePk)) as Record<string, unknown> | null

  if (!game) {
    return reply.code(404).send({
      error: 'story_game_not_found',
      message: `No story archive game is available for ${date}/${gamePk}`
    })
  }

  return { game }
})

app.get('/api/published/status', async () => {
  const slates = await listSlateManifest()
  const stories = await loadStoryIndex()
  const history = await loadHistoryArchive()

  return {
    slates: slates.length,
    stories: stories.length,
    history: history.length
  }
})

app.get('/api/mlb/:date/lineups', async (request, reply) => {
  const { date } = request.params as { date: string }

  try {
    const lineups = await loadMlbLineupBoard(date)
    return { date, lineups }
  } catch (error) {
    request.log.warn({ err: error, date }, 'Failed to load lineup board')
    return reply.code(404).send({
      error: 'lineup_board_not_found',
      message: `No lineup board is available for ${date}`
    })
  }
})

app.get('/api/mlb/:date/home-runs', async (request, reply) => {
  const { date } = request.params as { date: string }

  try {
    const homeRuns = await loadMlbHomeRunBoard(date)
    return { date, homeRuns }
  } catch (error) {
    request.log.warn({ err: error, date }, 'Failed to load home-run board')
    return reply.code(404).send({
      error: 'home_run_board_not_found',
      message: `No home-run board is available for ${date}`
    })
  }
})

app.get('/api/mlb/:date/props', async (request, reply) => {
  const { date } = request.params as { date: string }

  try {
    const props = await loadMlbPlayerProps(date)
    return { date, props }
  } catch (error) {
    request.log.warn({ err: error, date }, 'Failed to load player props board')
    return reply.code(404).send({
      error: 'player_props_not_found',
      message: `No player props board is available for ${date}`
    })
  }
})

const port = Number(process.env.API_PORT || 8787)
const host = process.env.API_HOST || '127.0.0.1'

app.listen({ port, host }).catch((error) => {
  app.log.error(error)
  process.exit(1)
})

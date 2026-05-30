import Fastify from 'fastify'
import cors from '@fastify/cors'
import {
  loadHistoryArchive,
  loadHistoryEntry,
  loadModelHistory,
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
  const terms = query.split(/\s+/).filter(Boolean)
  const haystackTerms = new Set(haystack.split(/\s+/).filter(Boolean))
  if (terms.length === 1 && query.length <= 2) return haystackTerms.has(query) ? 100 + query.length : 0
  if (query.length > 2 && haystack.includes(query)) return 100 + query.length
  const hits = terms.filter((term) => (term.length <= 2 ? haystackTerms.has(term) : haystack.includes(term))).length
  return hits ? hits * 20 + Math.round((hits / terms.length) * 20) : 0
}

type SlateSearchIndexRow = Record<string, unknown> & {
  date: string
  dateLabel: string
  gameId?: string
  searchableText: string
  priority: number
}

let slateSearchIndexPromise: Promise<SlateSearchIndexRow[]> | null = null

const collectSearchText = (value: unknown, depth = 0): string[] => {
  if (value === null || value === undefined || depth > 5) return []
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return [String(value)]
  if (Array.isArray(value)) return value.flatMap((entry) => collectSearchText(entry, depth + 1))
  if (typeof value !== 'object') return []

  return Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !['url', 'urls', 'playerUrl', 'statsUrls', 'sources', 'sourceUrl'].includes(key))
    .flatMap(([, entry]) => collectSearchText(entry, depth + 1))
}

const expandSearchQueries = (query: string) => {
  const normalized = normalizeSearchText(query)
  const aliases = new Set([normalized])
  if (/\b(mlb|baseball)\b/.test(normalized)) {
    aliases.add(normalized.replace(/\bbaseball\b/g, 'mlb'))
    aliases.add(normalized.replace(/\bmlb\b/g, 'baseball'))
  }
  if (/\b(hr|homer|home runs?|long ball)\b/.test(normalized)) {
    aliases.add(normalized.replace(/\bhr\b/g, 'home run'))
    aliases.add(normalized.replace(/\bhomer\b/g, 'home run'))
    aliases.add(normalized.replace(/\blong ball\b/g, 'home run'))
    aliases.add('home run')
    aliases.add('home runs')
    aliases.add('hr')
  }
  if (/\b(tb|total bases?)\b/.test(normalized)) {
    aliases.add(normalized.replace(/\btb\b/g, 'total bases'))
    aliases.add('total bases')
    aliases.add('tb')
  }
  if (/\b(k|ks|strikeouts?|pitcher k)\b/.test(normalized)) {
    aliases.add(normalized.replace(/\bks?\b/g, 'strikeouts'))
    aliases.add(normalized.replace(/\bpitcher k\b/g, 'pitcher strikeouts'))
    aliases.add('pitcher strikeouts')
    aliases.add('strikeouts')
  }
  if (/\b(props?|player props?)\b/.test(normalized)) {
    aliases.add('player props')
    aliases.add('props')
  }
  return [...aliases].filter(Boolean)
}

const scoreSearchResult = (haystack: string, query: string, title: unknown, priority: number) => {
  const titleText = normalizeSearchText(title)
  const queryVariants = expandSearchQueries(query)
  const bestScore = Math.max(...queryVariants.map((variant) => searchScore(haystack, variant)))
  if (!bestScore) return 0
  const titleBoost = queryVariants.some((variant) => titleText.includes(variant)) ? 90 : 0
  return bestScore + titleBoost + priority
}

const publicSearchRow = (row: SlateSearchIndexRow, score: number) => {
  const { searchableText: _searchableText, priority: _priority, ...publicRow } = row
  return { ...publicRow, score }
}

const gameTeamNames = (game: Record<string, unknown>) => {
  const matchup = Array.isArray(game.matchup) ? game.matchup : []
  return matchup
    .map((entry) => String((entry as Record<string, unknown>)?.name || (entry as Record<string, unknown>)?.displayName || ''))
    .filter(Boolean)
}

const gameTitleMatches = (left: unknown, right: unknown) =>
  normalizeSearchText(left) === normalizeSearchText(right)

const findGameIdForTitle = (games: Record<string, unknown>[], title: unknown) => {
  const match = games.find((game) => gameTitleMatches(game.title, title))
  return String(match?.id || '')
}

const addSearchRow = (
  rows: SlateSearchIndexRow[],
  slate: { id: string; label: string },
  row: Omit<SlateSearchIndexRow, 'date' | 'dateLabel' | 'searchableText' | 'priority'> & {
    priority: number
    searchParts: unknown[]
  }
) => {
  const { searchParts, ...publicFields } = row
  rows.push({
    ...publicFields,
    date: slate.id,
    dateLabel: slate.label,
    searchableText: normalizeSearchText(searchParts.flatMap((part) => collectSearchText(part)).join(' ')),
    priority: row.priority
  })
}

const buildSlateSearchIndex = async (): Promise<SlateSearchIndexRow[]> => {
  const slates = await listSlateManifest()
  const rows: SlateSearchIndexRow[] = []

  for (const slateShell of slates) {
    const slate = await loadSlateDay(slateShell.id)
    const games = (slate.games ?? []) as Record<string, unknown>[]
    const hasMlb = games.some((game) => game.league === 'MLB')
    const hasTennis = games.some((game) => game.league === 'Tennis')

    if (hasMlb) {
      addSearchRow(rows, slateShell, {
        id: `${slateShell.id}:mlb-value-center`,
        kind: 'view',
        resultType: 'Value board',
        targetTab: 'board',
        targetFilter: 'Value',
        valueScope: 'mlb-overview',
        league: 'MLB',
        title: 'MLB value center',
        subtitle: `${slateShell.label} | sides, totals, first inning, props`,
        matchContext: 'Overview',
        priority: 15,
        searchParts: [slateShell, 'mlb baseball value board sides totals markets props first inning yrfi nrfi']
      })
      addSearchRow(rows, slateShell, {
        id: `${slateShell.id}:mlb-hr-board`,
        kind: 'view',
        resultType: 'HR board',
        targetTab: 'board',
        targetFilter: 'Value',
        valueScope: 'mlb-hr',
        league: 'MLB',
        title: 'MLB HR value board',
        subtitle: `${slateShell.label} | home-run ladder`,
        matchContext: 'Home runs',
        priority: 20,
        searchParts: [slateShell, 'mlb baseball home runs home run homer hr long ball value ladder statcast']
      })
      addSearchRow(rows, slateShell, {
        id: `${slateShell.id}:mlb-props-board`,
        kind: 'view',
        resultType: 'Props',
        targetTab: 'parlay',
        builderCatalogTab: 'props',
        builderLeagueFilter: 'MLB',
        league: 'MLB',
        title: 'MLB player props',
        subtitle: `${slateShell.label} | TB, pitcher K, hits, RBI, walks`,
        matchContext: 'Parlay builder',
        priority: 15,
        searchParts: [slateShell, 'mlb baseball player props total bases tb pitcher strikeouts hits rbi walks singles']
      })
    }

    if (hasTennis) {
      addSearchRow(rows, slateShell, {
        id: `${slateShell.id}:tennis-value-board`,
        kind: 'view',
        resultType: 'Value board',
        targetTab: 'board',
        targetFilter: 'Value',
        valueScope: 'tennis',
        league: 'Tennis',
        title: 'Tennis value board',
        subtitle: `${slateShell.label} | match, spread, total, Kalshi`,
        matchContext: 'Tennis',
        priority: 15,
        searchParts: [slateShell, 'tennis value board match winner spread total games kalshi trade']
      })
    }

    const detailedGames = await Promise.all(
      games.map(async (game) => {
        const gameId = String(game.id || '')
        if (!gameId) return game
        try {
          return { ...game, ...(await loadSlateGameDetail(slateShell.id, gameId)) }
        } catch {
          return game
        }
      })
    )

    for (const game of detailedGames) {
      const gameId = String(game.id || '')
      const teams = gameTeamNames(game)
      addSearchRow(rows, slateShell, {
        id: `${slateShell.id}:${gameId}:game`,
        kind: 'game',
        resultType: String(game.league || 'Game'),
        targetTab: 'board',
        targetFilter: 'All',
        gameId,
        league: game.league,
        title: game.title,
        subtitle: `${slateShell.label} | ${game.start || 'TBD'} | ${game.stage || game.league || 'Game'}`,
        stage: game.stage,
        start: game.start,
        winnerName: (game as Record<string, unknown>).winnerName ?? (game as any).tennisResult?.winnerName ?? null,
        scoreline: (game as Record<string, unknown>).scoreline ?? (game as any).tennisResult?.scoreline ?? null,
        resultStatus: (game as any).result?.status ?? (game as any).tennisResult?.status ?? null,
        confidence: (game as any).analysis?.confidence ?? (game as Record<string, unknown>).confidence ?? null,
        matchContext: teams.join(' vs '),
        priority: 30,
        searchParts: [slateShell, game, teams, 'game matchup team teams moneyline side total market']
      })

      const starterContext = (game.starterContext || {}) as Record<string, unknown>
      for (const side of ['away', 'home']) {
        const starter = starterContext[side] as Record<string, unknown> | undefined
        if (!starter?.fullName) continue
        addSearchRow(rows, slateShell, {
          id: `${slateShell.id}:${gameId}:starter:${side}`,
          kind: 'player',
          resultType: 'Pitcher',
          targetTab: 'board',
          targetFilter: 'All',
          gameId,
          league: 'MLB',
          title: starter.fullName,
          subtitle: `${side === 'away' ? teams[0] || 'Away' : teams[1] || 'Home'} SP | ${game.title}`,
          stage: game.stage,
          start: game.start,
          matchContext: 'Probable starter',
          priority: 45,
          searchParts: [slateShell, game.title, teams, starter, 'pitcher starter probable sp rhp lhp baseball mlb']
        })
      }

      const lineupBoard = (game.lineupBoard || {}) as Record<string, any>
      for (const side of ['away', 'home']) {
        const teamBlock = lineupBoard[side] as Record<string, unknown> | undefined
        const lineup = Array.isArray(teamBlock?.lineup) ? teamBlock.lineup : []
        for (const player of lineup as Record<string, unknown>[]) {
          if (!player.name) continue
          const teamName = String(teamBlock?.teamName || (side === 'away' ? teams[0] : teams[1]) || '')
          const position = String(player.position || '')
          addSearchRow(rows, slateShell, {
            id: `${slateShell.id}:${gameId}:lineup:${player.playerId || player.name}`,
            kind: 'player',
            resultType: 'Lineup',
            targetTab: 'board',
            targetFilter: 'All',
            gameId,
            league: 'MLB',
            title: player.name,
            subtitle: `${teamName}${position ? ` | ${position}` : ''} | ${game.title}`,
            stage: game.stage,
            start: game.start,
            matchContext: `Slot ${player.slot || '?'}${position ? ` ${position}` : ''}`,
            priority: 40,
            searchParts: [slateShell, game.title, teams, teamName, player, 'lineup batter hitter position baseball mlb']
          })
        }
      }
    }

    const [propPayload, homeRunPayload] = await Promise.all([
      hasMlb ? loadMlbPlayerProps(slateShell.id).catch(() => null) : Promise.resolve(null),
      hasMlb ? loadMlbHomeRunBoard(slateShell.id).catch(() => null) : Promise.resolve(null)
    ])

    const props = Array.isArray((propPayload as any)?.picks) ? ((propPayload as any).picks as Record<string, unknown>[]) : []
    for (const prop of props) {
      const gameId = String(prop.gameId || findGameIdForTitle(games, prop.gameTitle) || '')
      addSearchRow(rows, slateShell, {
        id: `${slateShell.id}:prop:${prop.id || `${prop.playerName}-${prop.propType}`}`,
        kind: 'prop',
        resultType: 'Prop',
        targetTab: 'parlay',
        builderCatalogTab: 'props',
        builderLeagueFilter: 'MLB',
        propType: prop.propType,
        gameId,
        league: 'MLB',
        title: `${prop.playerName || 'Player'} ${prop.marketLabel || prop.propLabel || 'prop'}`,
        subtitle: `${prop.gameTitle || 'MLB'} | ${prop.propLabel || prop.propType || 'Prop'} | ${slateShell.label}`,
        stage: prop.stage,
        start: prop.start,
        confidence: prop.confidence,
        matchContext: prop.recommendationTier || prop.propLabel || 'Player prop',
        priority: 55,
        searchParts: [slateShell, prop, 'mlb baseball player props prop total bases tb pitcher strikeouts hits rbi walks singles']
      })
    }

    const homeRuns = Array.isArray((homeRunPayload as any)?.picks) ? ((homeRunPayload as any).picks as Record<string, unknown>[]) : []
    if (homeRuns.length) {
      const firstGameId = findGameIdForTitle(games, homeRuns[0]?.gameTitle)
      addSearchRow(rows, slateShell, {
        id: `${slateShell.id}:mlb-hr-board-with-picks`,
        kind: 'view',
        resultType: 'HR board',
        targetTab: 'board',
        targetFilter: 'Value',
        valueScope: 'mlb-hr',
        gameId: firstGameId,
        league: 'MLB',
        title: 'MLB HR value board',
        subtitle: `${slateShell.label} | ${homeRuns.length} home-run candidates`,
        matchContext: 'Home runs',
        priority: 22,
        searchParts: [slateShell, homeRuns, 'mlb baseball home runs home run homer hr long ball value ladder statcast']
      })
    }
    for (const pick of homeRuns) {
      const gameId = String(pick.gameId || findGameIdForTitle(games, pick.gameTitle) || '')
      addSearchRow(rows, slateShell, {
        id: `${slateShell.id}:hr:${pick.playerId || pick.playerName}:${gameId}`,
        kind: 'homeRun',
        resultType: 'HR',
        targetTab: 'board',
        targetFilter: 'Value',
        valueScope: 'mlb-hr',
        gameId,
        league: 'MLB',
        title: `${pick.playerName || 'Player'} home-run lane`,
        subtitle: `${pick.teamName || 'MLB'} | ${pick.gameTitle || 'Game'} | ${slateShell.label}`,
        confidence: pick.modelSharePct ?? pick.score ?? pick.baseScore ?? null,
        matchContext: pick.scoreBand || pick.lane || 'HR watch',
        priority: 60,
        searchParts: [slateShell, pick, 'mlb baseball home runs home run homer hr long ball statcast batter hitter']
      })
    }
  }

  return rows
}

const getSlateSearchIndex = async () => {
  if (!slateSearchIndexPromise) {
    slateSearchIndexPromise = buildSlateSearchIndex().catch((error) => {
      slateSearchIndexPromise = null
      throw error
    })
  }
  return slateSearchIndexPromise
}

app.get('/api/search/slates', async (request) => {
  const { q, limit } = request.query as { q?: string; limit?: string }
  const query = normalizeSearchText(q)
  const maxRows = Math.min(100, Math.max(1, Number(limit) || 40))
  if (!query) return { query, results: [] }

  const index = await getSlateSearchIndex()
  const results = index
    .map((row) => ({ row, score: scoreSearchResult(row.searchableText, query, row.title, row.priority) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) =>
      String(right.row.date).localeCompare(String(left.row.date)) ||
      right.score - left.score ||
      Number(right.row.priority) - Number(left.row.priority)
    )
    .slice(0, maxRows)
    .map((entry) => publicSearchRow(entry.row, entry.score))

  return { query, results }
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

app.get('/api/model-history', async () => {
  const modelHistory = await loadModelHistory()
  return { modelHistory }
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
  const modelHistory = await loadModelHistory()

  return {
    slates: slates.length,
    stories: stories.length,
    history: history.length,
    modelHistory: modelHistory.length
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

import {
  defaultSlateDayId,
  fallbackSlateDayManifest,
  type LoadedSlateDay,
  type SlateManifestEntry
} from './slate-fallback'
import { fetchJsonWithTimeout, getApiBaseUrl, isPublicStaticMode } from './api-client'
import type { StoryArchiveDaySummary } from './story-types'

export { defaultSlateDayId }
export type { LoadedSlateDay, SlateManifestEntry }
export { fallbackSlateDayManifest }

type PublicDataMeta = {
  currentSlate: SlateManifestEntry
  slates?: SlateManifestEntry[]
  availabilityByDate?: Record<string, { hasProps?: boolean; hasHomeRuns?: boolean }>
  hasProps?: boolean
  hasHomeRuns?: boolean
}

type PublicSearchRow = Record<string, unknown> & {
  searchableText?: string
  priority?: number
  title?: unknown
}

let publicDataMetaPromise: Promise<PublicDataMeta> | null = null
let publicSearchIndexPromise: Promise<PublicSearchRow[]> | null = null

const loadPublicDataMeta = async () => {
  publicDataMetaPromise ??= fetchJsonWithTimeout<PublicDataMeta>('/data/meta.json')
  return publicDataMetaPromise
}

const tryLoadPublicDataMeta = async () => {
  try {
    return await loadPublicDataMeta()
  } catch {
    return null
  }
}

const mergeManifestEntries = (entries: SlateManifestEntry[]) => {
  const byId = new Map<string, SlateManifestEntry>()
  for (const entry of entries) byId.set(entry.id, entry)
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id))
}

const publicDataMatchesDate = async (date: string) => {
  const meta = await loadPublicDataMeta()
  return meta.currentSlate?.id === date || Boolean(meta.slates?.some((slate) => slate.id === date))
}

const publicDataMatchesDateSafe = async (date: string) => {
  const meta = await tryLoadPublicDataMeta()
  return Boolean(meta?.currentSlate?.id === date || meta?.slates?.some((slate) => slate.id === date))
}

const publicSlateBasePath = (date: string) => `/data/slates/${date}`

const publicSlateAvailability = async (date: string) => {
  const meta = await loadPublicDataMeta()
  return (
    meta.availabilityByDate?.[date] ?? {
      hasProps: meta.currentSlate?.id === date ? meta.hasProps : false,
      hasHomeRuns: meta.currentSlate?.id === date ? meta.hasHomeRuns : false
    }
  )
}

const normalizeNameToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

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

const scoreSearchResult = (haystack: string, query: string, title: unknown, priority: unknown) => {
  const titleText = normalizeSearchText(title)
  const queryVariants = expandSearchQueries(query)
  const bestScore = Math.max(...queryVariants.map((variant) => searchScore(haystack, variant)))
  if (!bestScore) return 0
  const titleBoost = queryVariants.some((variant) => titleText.includes(variant)) ? 90 : 0
  return bestScore + titleBoost + Number(priority ?? 0)
}

const loadPublicSearchIndex = async () => {
  publicSearchIndexPromise ??= fetchJsonWithTimeout<PublicSearchRow[]>('/data/search.json', 5000)
  return publicSearchIndexPromise
}

const loadLocalSlateDay = async (id: string) => {
  if (!import.meta.env.DEV) {
    throw new Error(`Local generated day modules are only available in dev mode: ${id}`)
  }
  const { loadSlateDay } = await import('./slate-manifest')
  return loadSlateDay(id)
}

const namesLikelyMatch = (left: string, right: string) => {
  const normalizedLeft = normalizeNameToken(left)
  const normalizedRight = normalizeNameToken(right)
  if (!normalizedLeft || !normalizedRight) return false
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  )
}

const enrichSlateWithStoryWinners = async (
  apiBase: string,
  id: string,
  slate: LoadedSlateDay
): Promise<LoadedSlateDay> => {
  if (!slate.games?.some((game) => game.league === 'MLB')) return slate

  try {
    const payload = await fetchJsonWithTimeout<{ day: StoryArchiveDaySummary }>(`${apiBase}/api/stories/${id}`)
    const storyDay = payload.day
    if (!storyDay?.games?.length) return slate

    const storyGames = storyDay.games.filter((game) => game.awayTeam && game.homeTeam && game.winnerTeam)
    if (!storyGames.length) return slate

    return {
      ...slate,
      games: slate.games.map((game) => {
        if (game.league !== 'MLB') return game
        if (game.winnerTeam || game.loserTeam) return game

        const awayName = String(game.matchup?.[0]?.name || '')
        const homeName = String(game.matchup?.[1]?.name || '')
        const matchingStoryGame = storyGames.find(
          (storyGame) =>
            namesLikelyMatch(awayName, storyGame.awayTeam) &&
            namesLikelyMatch(homeName, storyGame.homeTeam)
        )
        if (!matchingStoryGame) return game

        return {
          ...game,
          winnerTeam: matchingStoryGame.winnerTeam,
          loserTeam: matchingStoryGame.loserTeam
        }
      })
    }
  } catch (error) {
    if (String(error).includes('404')) return slate
    console.warn(`Story day API unavailable for winner enrichment on ${id}.`, error)
    return slate
  }
}

export const loadSlateManifestData = async (): Promise<SlateManifestEntry[]> => {
  if (isPublicStaticMode()) {
    const meta = await loadPublicDataMeta()
    return meta.slates?.length ? meta.slates : meta.currentSlate ? [meta.currentSlate] : []
  }

  const publicMeta = await tryLoadPublicDataMeta()
  const publicManifest = publicMeta?.slates?.length ? publicMeta.slates : publicMeta?.currentSlate ? [publicMeta.currentSlate] : []

  const apiBase = getApiBaseUrl()

  if (apiBase) {
    try {
      const payload = await fetchJsonWithTimeout<{ slates: SlateManifestEntry[] }>(`${apiBase}/api/slates`)
      if (Array.isArray(payload.slates) && payload.slates.length) {
        return mergeManifestEntries([...fallbackSlateDayManifest, ...payload.slates, ...publicManifest])
      }
    } catch (error) {
      console.warn('Slate API unavailable, falling back to static manifest.', error)
    }
  }

  return mergeManifestEntries([...fallbackSlateDayManifest, ...publicManifest])
}

export const loadSlateDayData = async (id: string): Promise<LoadedSlateDay> => {
  if (isPublicStaticMode()) {
    if (!(await publicDataMatchesDate(id))) {
      throw new Error(`Public slate is not available in static mode: ${id}`)
    }
    return fetchJsonWithTimeout<LoadedSlateDay>(`${publicSlateBasePath(id)}/summary.json`, 5000)
  }

  if (await publicDataMatchesDateSafe(id)) {
    try {
      return await fetchJsonWithTimeout<LoadedSlateDay>(`${publicSlateBasePath(id)}/summary.json`, 5000)
    } catch (error) {
      console.warn(`Public slate unavailable for ${id}; falling back to API/local loader.`, error)
    }
  }

  const apiBase = getApiBaseUrl()

  if (apiBase) {
    try {
      const payload = await fetchJsonWithTimeout<{ slate: LoadedSlateDay }>(`${apiBase}/api/slates/${id}`)
      if (payload.slate) {
        return enrichSlateWithStoryWinners(apiBase, id, payload.slate)
      }
    } catch (error) {
      console.warn(`Slate API unavailable for ${id}.`, error)
    }
  }

  return loadLocalSlateDay(id)
}

export const loadSlateGameDetailData = async (date: string, gameId: string): Promise<Record<string, unknown>> => {
  if (isPublicStaticMode()) {
    if (!(await publicDataMatchesDate(date))) return {}
    try {
      return await fetchJsonWithTimeout<Record<string, unknown>>(`${publicSlateBasePath(date)}/games/${gameId}.json`, 5000)
    } catch (error) {
      console.warn(`Public game detail unavailable for ${date}/${gameId}.`, error)
      return {}
    }
  }

  if (await publicDataMatchesDateSafe(date)) {
    try {
      return await fetchJsonWithTimeout<Record<string, unknown>>(`${publicSlateBasePath(date)}/games/${gameId}.json`, 5000)
    } catch (error) {
      console.warn(`Public game detail unavailable for ${date}/${gameId}; falling back to API/local loader.`, error)
    }
  }

  const apiBase = getApiBaseUrl()

  if (apiBase) {
    try {
      const payload = await fetchJsonWithTimeout<{ game: Record<string, unknown> }>(
        `${apiBase}/api/slates/${date}/games/${gameId}`,
        5000
      )
      if (payload.game) return payload.game
    } catch (error) {
      console.warn(`Slate game detail API unavailable for ${date}/${gameId}.`, error)
    }
  }

  try {
    const slate = await loadLocalSlateDay(date)
    return slate.games.find((game) => String(game.id) === String(gameId)) ?? {}
  } catch {
    return {}
  }
}

export const searchSlateGamesData = async (query: string, limit = 80): Promise<Record<string, unknown>[]> => {
  const searchPublicSlates = async () => {
    const normalizedQuery = normalizeSearchText(query)
    if (!normalizedQuery) return []
    try {
      const index = await loadPublicSearchIndex()
      return index
        .map((row) => ({
          row,
          score: scoreSearchResult(String(row.searchableText || ''), normalizedQuery, row.title, row.priority)
        }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score || Number(right.row.priority ?? 0) - Number(left.row.priority ?? 0))
        .slice(0, Math.max(1, limit))
        .map(({ row, score }) => {
          const { searchableText: _searchableText, priority: _priority, ...publicRow } = row
          return { ...publicRow, score }
        })
    } catch (error) {
      console.warn(`Public slate search unavailable for ${query}.`, error)
      return []
    }
  }

  if (isPublicStaticMode()) {
    return searchPublicSlates()
  }

  const publicMeta = await tryLoadPublicDataMeta()
  if (publicMeta?.slates?.length || publicMeta?.currentSlate) {
    const publicResults = await searchPublicSlates()
    if (publicResults.length) return publicResults
  }

  const apiBase = getApiBaseUrl()
  if (!apiBase || !query.trim()) return []

  try {
    const payload = await fetchJsonWithTimeout<{ results: Record<string, unknown>[] }>(
      `${apiBase}/api/search/slates?q=${encodeURIComponent(query)}&limit=${limit}`,
      5000
    )
    return Array.isArray(payload.results) ? payload.results : []
  } catch (error) {
    console.warn(`Slate search API unavailable for ${query}.`, error)
    return []
  }
}

export const loadMlbPropBoardData = async (date: string): Promise<Record<string, unknown> | null> => {
  if (isPublicStaticMode()) {
    const availability = await publicSlateAvailability(date)
    if (!availability.hasProps || !(await publicDataMatchesDate(date))) return null
    try {
      return await fetchJsonWithTimeout<Record<string, unknown>>(`${publicSlateBasePath(date)}/props.json`, 5000)
    } catch (error) {
      console.warn(`Public MLB props unavailable for ${date}.`, error)
      return null
    }
  }

  if (await publicDataMatchesDateSafe(date)) {
    const availability = await publicSlateAvailability(date)
    if (availability.hasProps) {
      try {
        return await fetchJsonWithTimeout<Record<string, unknown>>(`${publicSlateBasePath(date)}/props.json`, 5000)
      } catch (error) {
        console.warn(`Public MLB props unavailable for ${date}; falling back to API.`, error)
      }
    }
  }

  const apiBase = getApiBaseUrl()

  if (apiBase) {
    try {
      const payload = await fetchJsonWithTimeout<{ date: string; props: Record<string, unknown> }>(`${apiBase}/api/mlb/${date}/props`)
      if (payload.props) return payload.props
    } catch (error) {
      console.warn(`MLB props API unavailable for ${date}.`, error)
    }
  }

  return null
}

export const loadMlbHomeRunBoardData = async (date: string): Promise<Record<string, unknown> | null> => {
  if (isPublicStaticMode()) {
    const availability = await publicSlateAvailability(date)
    if (!availability.hasHomeRuns || !(await publicDataMatchesDate(date))) return null
    try {
      return await fetchJsonWithTimeout<Record<string, unknown>>(`${publicSlateBasePath(date)}/home-runs.json`, 5000)
    } catch (error) {
      console.warn(`Public MLB home-run board unavailable for ${date}.`, error)
      return null
    }
  }

  if (await publicDataMatchesDateSafe(date)) {
    const availability = await publicSlateAvailability(date)
    if (availability.hasHomeRuns) {
      try {
        return await fetchJsonWithTimeout<Record<string, unknown>>(`${publicSlateBasePath(date)}/home-runs.json`, 5000)
      } catch (error) {
        console.warn(`Public MLB home-run board unavailable for ${date}; falling back to API.`, error)
      }
    }
  }

  const apiBase = getApiBaseUrl()

  if (apiBase) {
    try {
      const payload = await fetchJsonWithTimeout<{ date: string; homeRuns: Record<string, unknown> }>(
        `${apiBase}/api/mlb/${date}/home-runs`
      )
      if (payload.homeRuns) return payload.homeRuns
    } catch (error) {
      console.warn(`MLB home-run board API unavailable for ${date}.`, error)
    }
  }

  return null
}

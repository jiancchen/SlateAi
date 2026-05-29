import {
  defaultSlateDayId,
  fallbackSlateDayManifest,
  type LoadedSlateDay,
  type SlateManifestEntry
} from './slate-fallback'
import { fetchJsonWithTimeout, getApiBaseUrl } from './api-client'
import type { StoryArchiveDaySummary } from './story-types'

export { defaultSlateDayId }
export type { LoadedSlateDay, SlateManifestEntry }
export { fallbackSlateDayManifest }

const normalizeNameToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

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
    console.warn(`Story day API unavailable for winner enrichment on ${id}.`, error)
    return slate
  }
}

export const loadSlateManifestData = async (): Promise<SlateManifestEntry[]> => {
  const apiBase = getApiBaseUrl()

  if (apiBase) {
    try {
      const payload = await fetchJsonWithTimeout<{ slates: SlateManifestEntry[] }>(`${apiBase}/api/slates`)
      if (Array.isArray(payload.slates) && payload.slates.length) {
        return payload.slates
      }
    } catch (error) {
      console.warn('Slate API unavailable, falling back to static manifest.', error)
    }
  }

  return fallbackSlateDayManifest
}

export const loadSlateDayData = async (id: string): Promise<LoadedSlateDay> => {
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

  throw new Error(`No API slate payload available for ${id}`)
}

export const loadSlateGameDetailData = async (date: string, gameId: string): Promise<Record<string, unknown>> => {
  const apiBase = getApiBaseUrl()

  if (apiBase) {
    try {
      const payload = await fetchJsonWithTimeout<{ game: Record<string, unknown> }>(`${apiBase}/api/slates/${date}/games/${gameId}`)
      if (payload.game) return payload.game
    } catch (error) {
      console.warn(`Slate game detail API unavailable for ${date}/${gameId}.`, error)
    }
  }

  return {}
}

export const searchSlateGamesData = async (query: string): Promise<Record<string, unknown>[]> => {
  const apiBase = getApiBaseUrl()
  if (!apiBase || !query.trim()) return []

  try {
    const payload = await fetchJsonWithTimeout<{ results: Record<string, unknown>[] }>(
      `${apiBase}/api/search/slates?q=${encodeURIComponent(query)}`
    )
    return Array.isArray(payload.results) ? payload.results : []
  } catch (error) {
    console.warn(`Slate search API unavailable for ${query}.`, error)
    return []
  }
}

export const loadMlbPropBoardData = async (date: string): Promise<Record<string, unknown> | null> => {
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

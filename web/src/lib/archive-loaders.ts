import type { HistoryEntry } from './history-archive'
import { fetchJsonWithTimeout, getApiBaseUrl } from './api-client'
import type {
  StoryArchiveDaySummary,
  StoryArchiveGame,
  StoryArchiveIndexEntry
} from './story-types'

export const loadHistoryArchiveData = async (): Promise<HistoryEntry[]> => {
  const apiBase = getApiBaseUrl()

  if (apiBase) {
    try {
      const payload = await fetchJsonWithTimeout<{ history: HistoryEntry[] }>(`${apiBase}/api/history`)
      if (Array.isArray(payload.history)) return payload.history
    } catch (error) {
      console.warn('History API unavailable, falling back to bundled archive.', error)
    }
  }

  const module = await import('./history-archive')
  return module.historyArchive
}

export const loadStoryArchiveIndexData = async (): Promise<StoryArchiveIndexEntry[]> => {
  const apiBase = getApiBaseUrl()

  if (!apiBase) return []

  try {
    const payload = await fetchJsonWithTimeout<{ stories: StoryArchiveIndexEntry[] }>(`${apiBase}/api/stories`)
    if (Array.isArray(payload.stories)) return payload.stories
  } catch (error) {
    console.warn('Story API unavailable.', error)
  }

  return []
}

export const loadStoryDayData = async (date: string): Promise<StoryArchiveDaySummary | null> => {
  const apiBase = getApiBaseUrl()
  if (!apiBase) return null

  try {
    const payload = await fetchJsonWithTimeout<{ day: StoryArchiveDaySummary }>(`${apiBase}/api/stories/${date}`)
    return payload.day ?? null
  } catch (error) {
    console.warn(`Story day API unavailable for ${date}.`, error)
    return null
  }
}

export const loadStoryGameData = async (date: string, gamePk: number): Promise<StoryArchiveGame | null> => {
  const apiBase = getApiBaseUrl()
  if (!apiBase) return null

  try {
    const payload = await fetchJsonWithTimeout<{ game: StoryArchiveGame }>(`${apiBase}/api/stories/${date}/games/${gamePk}`)
    return payload.game ?? null
  } catch (error) {
    console.warn(`Story game API unavailable for ${date}/${gamePk}.`, error)
    return null
  }
}

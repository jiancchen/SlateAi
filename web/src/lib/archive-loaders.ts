import type { HistoryEntry } from './history-types'
import { fetchJsonWithTimeout, getApiBaseUrl } from './api-client'
import type {
  StoryArchiveDaySummary,
  StoryArchiveGame,
  StoryArchiveIndexEntry
} from './story-types'

export const loadHistoryArchiveData = async (): Promise<HistoryEntry[]> => {
  const apiBase = getApiBaseUrl()

  if (!apiBase) return []

  try {
    const payload = await fetchJsonWithTimeout<{ history: HistoryEntry[] }>(`${apiBase}/api/history`)
    if (Array.isArray(payload.history)) return payload.history
  } catch (error) {
    console.warn('History API unavailable.', error)
  }

  return []
}

export type ModelHistoryEntry = {
  id: string
  date: string
  label: string
  status: 'graded' | 'active' | 'partial'
  models: Array<{
    id: string
    sport: 'MLB' | 'Tennis' | string
    lane: string
    modelName: string
    version?: string
    performanceLabel?: string
    performancePct?: number | null
    coverageLabel?: string
    changelog: string[]
    artifacts?: Array<{ label: string; path: string }>
  }>
}

export const loadModelHistoryData = async (): Promise<ModelHistoryEntry[]> => {
  const apiBase = getApiBaseUrl()

  if (!apiBase) return []

  try {
    const payload = await fetchJsonWithTimeout<{ modelHistory: ModelHistoryEntry[] }>(`${apiBase}/api/model-history`)
    if (Array.isArray(payload.modelHistory)) return payload.modelHistory
  } catch (error) {
    console.warn('Model history API unavailable.', error)
  }

  return []
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

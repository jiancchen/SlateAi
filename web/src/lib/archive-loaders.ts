import type { HistoryEntry } from './history-archive'
import type { StoryArchiveDay } from './story-archive.generated'
import { fetchJsonWithTimeout, getApiBaseUrl } from './api-client'

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

export const loadStoryArchiveData = async (): Promise<StoryArchiveDay[]> => {
  const apiBase = getApiBaseUrl()

  if (apiBase) {
    try {
      const payload = await fetchJsonWithTimeout<{ stories: Array<Omit<StoryArchiveDay, 'games'> & { games: number }> }>(
        `${apiBase}/api/stories`
      )
      const daySummaries = payload.stories

      if (Array.isArray(daySummaries) && daySummaries.length) {
        const days = await Promise.all(
          daySummaries.map(async (summary) => {
            const dayPayload = await fetchJsonWithTimeout<{ day: StoryArchiveDay }>(`${apiBase}/api/stories/${summary.id}`)
            return dayPayload.day
          })
        )
        return days
      }
    } catch (error) {
      console.warn('Story API unavailable, falling back to bundled story archive.', error)
    }
  }

  const module = await import('./story-archive.generated')
  return module.storyArchive
}

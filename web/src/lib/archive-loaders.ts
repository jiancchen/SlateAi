import type { HistoryEntry } from './history-archive'
import type { StoryArchiveDay } from './story-archive.generated'

const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')

  if (typeof window !== 'undefined') {
    const { hostname } = window.location
    if (hostname === '127.0.0.1' || hostname === 'localhost') {
      return 'http://127.0.0.1:8787'
    }
  }

  return null
}

const fetchJsonWithTimeout = async <T>(url: string, timeoutMs = 1200): Promise<T> => {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }

    return (await response.json()) as T
  } finally {
    window.clearTimeout(timer)
  }
}

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

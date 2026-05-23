import {
  defaultSlateDayId,
  fallbackSlateDayManifest,
  type LoadedSlateDay,
  type SlateManifestEntry
} from './slate-fallback'
import { fetchJsonWithTimeout, getApiBaseUrl } from './api-client'

export { defaultSlateDayId }
export type { LoadedSlateDay, SlateManifestEntry }
export { fallbackSlateDayManifest }

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
      if (payload.slate) return payload.slate
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

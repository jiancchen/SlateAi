import {
  defaultSlateDayId,
  loadSlateDay as loadBundledSlateDay,
  slateDayManifest,
  type LoadedSlateDay,
  type SlateManifestEntry
} from './slate-manifest'
import { fetchJsonWithTimeout, getApiBaseUrl } from './api-client'

export { defaultSlateDayId }
export type { LoadedSlateDay, SlateManifestEntry }

export const fallbackSlateDayManifest = slateDayManifest

export const loadSlateManifestData = async (): Promise<SlateManifestEntry[]> => {
  const apiBase = getApiBaseUrl()

  if (apiBase) {
    try {
      const payload = await fetchJsonWithTimeout<{ slates: SlateManifestEntry[] }>(`${apiBase}/api/slates`)
      if (Array.isArray(payload.slates) && payload.slates.length) {
        return payload.slates
      }
    } catch (error) {
      console.warn('Slate API unavailable, falling back to bundled manifest.', error)
    }
  }

  return slateDayManifest
}

export const loadSlateDayData = async (id: string): Promise<LoadedSlateDay> => {
  const apiBase = getApiBaseUrl()

  if (apiBase) {
    try {
      const payload = await fetchJsonWithTimeout<{ slate: LoadedSlateDay }>(`${apiBase}/api/slates/${id}`)
      if (payload.slate) return payload.slate
    } catch (error) {
      console.warn(`Slate API unavailable for ${id}, falling back to bundled day module.`, error)
    }
  }

  return loadBundledSlateDay(id)
}

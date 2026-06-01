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
    modelDescription?: {
      schemaVersion?: number
      modelId?: string
      sport?: string
      name?: string
      status?: string
      createdForSlate?: string
      summary?: string
      keyImprovements?: string[]
      keyMetrics?: Array<{ label: string; value: string; details?: string }>
      notes?: string[]
      knownLimitations?: string[]
      markdownPresent?: boolean
      files?: Record<string, string>
    } | null
    stack?: {
      warehouseVersion?: string
      featureVersion?: string
      modelId?: string
      evaluatorVersion?: string
    }
    run?: {
      runId?: string
      status?: string
      mode?: string
      snapshottedAt?: string
      sourceHash?: string
      inputHash?: string
      outputHash?: string
      sourceFiles?: number
      inputs?: number
      outputs?: number
      trainingRows?: number
      healthChecks?: number
      healthChecksOk?: number
      gitDirty?: boolean
    }
    settlement?: {
      settlementId?: string
      status?: string
      gradeMode?: string
      settledAt?: string | null
      completeMatches?: number
      pendingMatches?: number
      rowCount?: number
      gradedCount?: number
      hitCount?: number
      missCount?: number
      roiPer100?: number | null
      lanes?: Array<{
        lane: string
        rows: number
        graded: number
        hits?: number
        misses?: number
        hitPct?: number | null
        avgPnlPer100?: number | null
      }>
    } | null
    backtest?: {
      label?: string
      rows?: number
      hits?: number
      hitRatePct?: number | null
      brier?: number | null
      logLoss?: number | null
      auc?: number | null
      dataOnlyRows?: number | null
      dataOnlyHits?: number | null
      dataOnlyHitRatePct?: number | null
      valueGate?: Record<string, any> | null
      trainingCorpus?: Record<string, any> | null
    } | null
    artifacts?: Array<{ label: string; path?: string; role?: string }>
  }>
}

const loadStaticModelHistory = async (): Promise<ModelHistoryEntry[]> => {
  try {
    const payload = await fetchJsonWithTimeout<ModelHistoryEntry[]>('/data/model-history/index.json')
    if (Array.isArray(payload)) return payload
  } catch (error) {
    console.warn('Static model history unavailable.', error)
  }
  return []
}

export const loadModelHistoryData = async (): Promise<ModelHistoryEntry[]> => {
  const apiBase = getApiBaseUrl()

  if (!apiBase) return loadStaticModelHistory()

  try {
    const payload = await fetchJsonWithTimeout<{ modelHistory: ModelHistoryEntry[] }>(`${apiBase}/api/model-history`)
    if (Array.isArray(payload.modelHistory)) return payload.modelHistory
  } catch (error) {
    console.warn('Model history API unavailable.', error)
  }

  return loadStaticModelHistory()
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

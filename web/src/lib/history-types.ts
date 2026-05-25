export type HistoryMetricTone = 'positive' | 'negative' | 'warning' | 'neutral' | 'info'

export type HistoryMetric = {
  label: string
  value: string
  note?: string
  tone?: HistoryMetricTone
}

export type HistoryArtifact = {
  label: string
  path: string
}

export type HistoryGameReview = {
  id: string
  title: string
  start?: string
  predicted: string
  confidence?: number | null
  crowd?: string
  actualWinner?: string
  finalScore?: string
  result: 'hit' | 'miss' | 'pending'
  note?: string
}

export type HistoryGameSection = {
  label: string
  games: HistoryGameReview[]
}

export type HistorySportTab = {
  id: string
  label: string
  summary: string
  metrics?: HistoryMetric[]
  sections?: HistoryGameSection[]
  placeholder?: string
}

export type HistoryRecord = {
  wins: number
  losses: number
}

export type HistoryPropRecord = {
  hits: number
  total: number
}

export type HistoryPerformance = {
  mlbFullGame?: HistoryRecord
  mlbFirst5?: HistoryRecord
  hrBoard?: HistoryPropRecord
  mlbProps?: HistoryPropRecord
  wnba?: HistoryRecord
  nba?: HistoryRecord
  tennis?: HistoryRecord
}

export type HistoryJournal = {
  path: string
  records: number
  sideRows?: number
  hrRows?: number
  propRows?: number
  note?: string
}

export type HistoryEntry = {
  id: string
  date: string
  label: string
  status: 'seed' | 'combined' | 'graded'
  summary: string
  sports: string[]
  trackedMarkets: string[]
  metrics: HistoryMetric[]
  notableHits: string[]
  notableMisses: string[]
  whatWorked: string[]
  whatMissed: string[]
  takeaways: string[]
  artifacts: HistoryArtifact[]
  performance?: HistoryPerformance
  journal?: HistoryJournal
  sportTabs?: HistorySportTab[]
}

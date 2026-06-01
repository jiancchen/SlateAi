import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildParlayModel,
  createParlayLeg,
  formatAmericanOdds,
  rankEfficientFavoritePicks,
  rankFlipRiskPicks,
  rankMlbPlayerProps
} from '../../models/shared/sports-core/app-sports-model.js'
import type { HistoryEntry, HistoryRecord, HistorySportTab } from './lib/history-types'
import type {
  StoryArchiveDaySummary,
  StoryArchiveGame,
  StoryArchiveIndexEntry,
  StoryTimelineEvent
} from './lib/story-types'
import { mlbPropPerformanceByDate } from './lib/history-prop-performance.generated'
import {
  loadHistoryArchiveData,
  loadModelHistoryData,
  type ModelHistoryEntry,
  loadStoryDayData,
  loadStoryGameData,
  loadStoryArchiveIndexData
} from './lib/archive-loaders'
import {
  defaultSlateDayId,
  fallbackSlateDayManifest,
  loadMlbHomeRunBoardData,
  loadMlbPropBoardData,
  searchSlateGamesData,
  loadSlateDayData,
  loadSlateGameDetailData,
  loadSlateManifestData,
  type LoadedSlateDay,
  type SlateManifestEntry
} from './lib/slate-loaders'
import { isPublicStaticMode } from './lib/api-client'
import kalshiTennisTradeCandidates from './lib/kalshi-tennis-trade-candidates.generated.json' with { type: 'json' }
import kalshiTennisSpikeModel from './lib/kalshi-tennis-spike-model.generated.json' with { type: 'json' }
import kalshiMlbMarkets from './lib/kalshi-mlb-markets.generated.json' with { type: 'json' }
import { BoardView } from './views/BoardView'
import { HistoryView } from './views/HistoryView'
import { ModelsView } from './views/ModelsView'
import { ParlayView } from './views/ParlayView'
import { StoriesView } from './views/StoriesView'
import { TicketsView } from './views/TicketsView'

type AnyRecord = Record<string, any>
type DeskTabId = 'board' | 'parlay' | 'tickets' | 'models' | 'history' | 'stories'
type SidebarTabId = 'ticket' | 'markets' | 'sources'

const PARLAY_MIN_LEGS = 2
const PARLAY_MAX_LEGS = 10
const MOBILE_DETAIL_MEDIA_QUERY = '(max-width: 920px)'
const MOBILE_DETAIL_HISTORY_KEY = '__slateMobileDetail'
const MOBILE_DETAIL_HISTORY_TOKEN_KEY = '__slateMobileDetailToken'

const deskTabs: Array<{ id: DeskTabId; label: string }> = [
  { id: 'board', label: 'Board' },
  { id: 'parlay', label: 'Parlay builder' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'models', label: 'Models' },
  { id: 'history', label: 'History' },
  { id: 'stories', label: 'Stories' }
]

const sidebarTabs: Array<{ id: SidebarTabId; label: string }> = [
  { id: 'ticket', label: 'Ticket' },
  { id: 'markets', label: 'Markets' },
  { id: 'sources', label: 'Sources' }
]

const builderCatalogTabs = [
  { id: 'all', label: 'All' },
  { id: 'highConfidence', label: 'High conf' },
  { id: 'payoff', label: 'Value' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'totals', label: 'O/U' },
  { id: 'derivatives', label: 'Derivatives' },
  { id: 'props', label: 'Props' },
  { id: 'flips', label: 'Flips' }
] as const

const builderValidityFilters = [
  { id: 'eligible', label: 'Eligible' },
  { id: 'all', label: 'All' },
  { id: 'invalid', label: 'Invalid' }
] as const

const builderSortOptions = [
  { id: 'confidence', label: 'Confidence' },
  { id: 'time', label: 'Start time' },
  { id: 'edge', label: 'Edge' }
] as const

const confidenceTag = (confidence: number) => {
  if (confidence >= 80) return 'Elite confidence'
  if (confidence >= 72) return 'High confidence'
  if (confidence >= 64) return 'Lean confidence'
  return 'Watch confidence'
}

const payoffTag = (pricePct: number | null | undefined) => {
  if (!Number.isFinite(Number(pricePct))) return null
  const profitCents = Math.max(0, Math.round(100 - Number(pricePct)))
  if (profitCents <= 12) return `Tiny payoff: ${profitCents}c`
  if (profitCents <= 30) return `Fee-sensitive: ${profitCents}c`
  if (profitCents <= 55) return `Playable payoff: ${profitCents}c`
  return `Underdog payoff: ${profitCents}c`
}

const impliedPctFromParticipant = (participant: AnyRecord) => {
  if (Number.isFinite(Number(participant?.impliedProbability))) return Number(participant.impliedProbability) * 100
  if (Number.isFinite(Number(participant?.impliedProbabilityPct))) return Number(participant.impliedProbabilityPct)
  return null
}

const payoffIsPlayable = (entry: AnyRecord) => {
  if (/bet-grade value|thin value/i.test(String(entry.valueGrade || entry.payoffAction || ''))) return true
  if (Number.isFinite(Number(entry.evPer100)) && Number(entry.evPer100) >= 6) return true
  const action = String(entry.payoffAction || '')
  if (/playable edge|underdog value/i.test(action)) return true
  if (/pass at price|watch, do not chase|tiny payoff/i.test(action)) return false
  const pricePct = Number(entry.marketPricePct)
  const confidence = Number(entry.confidence)
  return Number.isFinite(pricePct) && Number.isFinite(confidence) && confidence - pricePct >= 7
}

const roundToTenths = (value: number) => Math.round(Number(value) * 10) / 10

const poissonSeries = (lambdaInput: number, maxRuns = 20) => {
  const lambda = clamp(Number(lambdaInput), 0.05, 20)
  const values: number[] = []
  let probability = Math.exp(-lambda)
  let total = 0

  for (let runs = 0; runs <= maxRuns; runs += 1) {
    if (runs > 0) probability *= lambda / runs
    values.push(probability)
    total += probability
  }

  if (total > 0 && total < 0.999) values[maxRuns] += 1 - total
  return values
}

const buildFirst5LeadProbabilities = (awayRunsInput: number, homeRunsInput: number) => {
  const awaySeries = poissonSeries(awayRunsInput, 16)
  const homeSeries = poissonSeries(homeRunsInput, 16)
  let awayWin = 0
  let homeWin = 0
  let tie = 0

  awaySeries.forEach((awayProbability, awayRuns) => {
    homeSeries.forEach((homeProbability, homeRuns) => {
      const joint = awayProbability * homeProbability
      if (awayRuns > homeRuns) awayWin += joint
      else if (homeRuns > awayRuns) homeWin += joint
      else tie += joint
    })
  })

  return {
    awayWinPct: roundToTenths(awayWin * 100),
    homeWinPct: roundToTenths(homeWin * 100),
    tiePct: roundToTenths(tie * 100)
  }
}

const buildTotalProbabilityPct = (projectedRunsInput: number, lineInput: number, leanInput: string) => {
  const projectedRuns = Number(projectedRunsInput)
  const line = Number(lineInput)
  if (!Number.isFinite(projectedRuns) || !Number.isFinite(line)) return null

  const series = poissonSeries(projectedRuns, 24)
  const overWinsAt = Math.floor(line) + 1
  const underProbability = series.reduce(
    (sum, probability, runs) => (runs < overWinsAt ? sum + probability : sum),
    0
  )
  const overProbability = Math.max(0, 1 - underProbability)
  const lean = String(leanInput || '').toLowerCase()
  if (lean.startsWith('over')) return roundToTenths(overProbability * 100)
  if (lean.startsWith('under')) return roundToTenths(underProbability * 100)
  return roundToTenths(Math.max(overProbability, underProbability) * 100)
}

const contractEvCents = (modelPctInput: number, askCentsInput: number) => {
  const modelPct = Number(modelPctInput)
  const askCents = Number(askCentsInput)
  if (!Number.isFinite(modelPct) || !Number.isFinite(askCents)) return null
  return roundToTenths(modelPct - askCents)
}

const tennisValueTone = (grade?: string | null) => {
  if (/bet-grade value/i.test(String(grade || ''))) return 'accent'
  if (/thin value|near fair/i.test(String(grade || ''))) return 'neutral'
  if (/negative ev/i.test(String(grade || ''))) return 'warning'
  return ''
}

const kalshiTradeCandidateRows = Array.isArray((kalshiTennisTradeCandidates as AnyRecord).candidates)
  ? ((kalshiTennisTradeCandidates as AnyRecord).candidates as AnyRecord[])
  : []

const kalshiSpikeCandidateRows = Array.isArray((kalshiTennisSpikeModel as AnyRecord).currentCandidates)
  ? ((kalshiTennisSpikeModel as AnyRecord).currentCandidates as AnyRecord[])
  : []

const kalshiTradeCandidateKey = (row: AnyRecord) =>
  String(row.marketTicker || row.eventTicker || row.boardMatchId || row.selection || '')

const mergeKalshiSpikeCandidate = (row: AnyRecord) => {
  const key = kalshiTradeCandidateKey(row)
  const spikeRow = kalshiSpikeCandidateRows.find((candidate: AnyRecord) => kalshiTradeCandidateKey(candidate) === key)
  return spikeRow ? { ...row, ...spikeRow } : row
}

const propTypeFilters = [
  { id: 'all', label: 'All' },
  { id: 'homeRun', label: 'HR' },
  { id: 'rbi', label: 'RBI' },
  { id: 'totalBases', label: 'TB' },
  { id: 'pitcherStrikeouts', label: 'Pitcher K' },
  { id: 'hits', label: 'Hits' },
  { id: 'walks', label: 'Walks' },
  { id: 'singles', label: 'Singles' }
] as const

const recommendationModes = [
  {
    id: 'favorites',
    label: 'Efficient favorites',
    copy: 'Only favorites with a real price-and-shape thesis. This lane should stay short on messy slates.'
  },
  {
    id: 'balanced',
    label: 'Balanced',
    copy: 'Blends core legs with a measured amount of live upset exposure.'
  },
  {
    id: 'flips',
    label: 'Flips',
    copy: 'Higher-variance underdogs and fragile-favorite fade spots.'
  }
] as const

const builderLeagueOrder = ['MLB', 'Tennis', 'WNBA', 'NBA', 'UFC'] as const
const mlbLogoBase = 'https://raw.githubusercontent.com/MLBAMGames/mlb_teams_logo_svg/main/light'
const mlbTeamLogoCode: Record<string, string> = {
  'D-backs': 'ari',
  Diamondbacks: 'ari',
  Braves: 'atl',
  Orioles: 'bal',
  'Red Sox': 'bos',
  Cubs: 'chc',
  Reds: 'cin',
  Guardians: 'cle',
  Rockies: 'col',
  'White Sox': 'cws',
  Tigers: 'det',
  Astros: 'hou',
  Royals: 'kc',
  Angels: 'laa',
  Dodgers: 'lad',
  Marlins: 'mia',
  Brewers: 'mil',
  Twins: 'min',
  Mets: 'nym',
  Yankees: 'nyy',
  Athletics: 'oak',
  Phillies: 'phi',
  Pirates: 'pit',
  Padres: 'sd',
  Mariners: 'sea',
  Giants: 'sf',
  Cardinals: 'stl',
  Rays: 'tb',
  Rangers: 'tex',
  'Blue Jays': 'tor',
  Nationals: 'wsh'
}

const mlbTeamAccent: Record<string, string> = {
  'D-backs': '#a71930',
  Diamondbacks: '#a71930',
  Braves: '#ce1141',
  Orioles: '#df4601',
  'Red Sox': '#bd3039',
  Cubs: '#0e3386',
  Reds: '#c6011f',
  Guardians: '#e31937',
  Rockies: '#33006f',
  'White Sox': '#27251f',
  Tigers: '#0c2c56',
  Astros: '#eb6e1f',
  Royals: '#004687',
  Angels: '#ba0021',
  Dodgers: '#005a9c',
  Marlins: '#00a3e0',
  Brewers: '#ffc52f',
  Twins: '#002b5c',
  Mets: '#002d72',
  Yankees: '#0c2340',
  Athletics: '#003831',
  Phillies: '#e81828',
  Pirates: '#fdb827',
  Padres: '#2f241d',
  Mariners: '#005c5c',
  Giants: '#fd5a1e',
  Cardinals: '#c41e3a',
  Rays: '#092c5c',
  Rangers: '#003278',
  'Blue Jays': '#134a8e',
  Nationals: '#ab0003'
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const labelForScore = (score: number) => {
  if (score >= 72) return 'High'
  if (score >= 60) return 'Medium'
  return 'Watch'
}

const formatOrdinal = (value: any) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return String(value ?? '')
  if (numericValue % 100 >= 11 && numericValue % 100 <= 13) return `${numericValue}th`
  if (numericValue % 10 === 1) return `${numericValue}st`
  if (numericValue % 10 === 2) return `${numericValue}nd`
  if (numericValue % 10 === 3) return `${numericValue}rd`
  return `${numericValue}th`
}

const formatNumber = (value: any, digits = 1) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 'N/A'
  return numericValue.toFixed(digits)
}

const formatSignedNumber = (value: any, digits = 1) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 'N/A'
  return `${numericValue >= 0 ? '+' : ''}${numericValue.toFixed(digits)}`
}

const formatTennisValueSelection = (row: AnyRecord) => {
  const marketType = String(row?.marketType || '').toLowerCase()
  const selection = row?.selection || row?.lean || 'Selection'
  const odds = Number.isFinite(Number(row?.americanOdds)) ? ` ${formatAmericanOdds(row.americanOdds)}` : ''
  if (marketType === 'spread' && Number.isFinite(Number(row?.line))) {
    return `${selection} ${formatSignedNumber(row.line, 1)}${odds}`
  }
  if ((marketType === 'total' || marketType.includes('total')) && Number.isFinite(Number(row?.line))) {
    const lineLabel = formatNumber(row.line, 1)
    return String(selection).includes(lineLabel) ? `${selection}${odds}` : `${selection} ${lineLabel}${odds}`
  }
  if (marketType === 'ml' && odds) {
    return `${selection} ML${odds}`
  }
  return selection
}

const tennisValueValidity = (row: AnyRecord) => {
  const marketType = String(row?.marketType || '').toLowerCase()
  const netEv = Number(row?.netEvPer100 ?? Number(row?.evPer100) - 2)
  const modelPct = Number(row?.modelPct)
  const edgePct = Number(row?.edgePct)
  const odds = Number(row?.americanOdds)
  if (!Number.isFinite(netEv) || !Number.isFinite(edgePct) || !Number.isFinite(odds)) {
    return { valid: false, label: 'No price validation', reason: 'Missing EV or edge data.' }
  }
  if (marketType === 'ml') {
    if (odds >= 100 && odds <= 250 && netEv >= 8 && edgePct >= 7 && edgePct <= 24 && Number.isFinite(modelPct) && modelPct >= 45 && modelPct <= 60) {
      return { valid: true, label: 'Fee-adjusted ML candidate', reason: 'Plus-money ML inside the validated price lane, after fee haircut and model-outlier checks.' }
    }
    if (odds < 0) return { valid: false, label: 'Favorite tax trap', reason: 'Favorite payout is too small after price and fee haircut.' }
    if (odds > 250) return { valid: false, label: 'Outlier price/manual review', reason: 'The market disagreement is too large to call validated without manual matchup confirmation.' }
    return { valid: false, label: 'Raw ML edge only', reason: 'ML edge does not clear the fee-adjusted plus-money lane.' }
  }
  if (marketType === 'spread') {
    return { valid: false, label: 'Spread downgraded', reason: 'May 27 spread rows backtested poorly, so positive spread EV is watch-only until the next settled pass.' }
  }
  if (marketType === 'total') {
    return { valid: false, label: 'Total needs proof', reason: 'Totals do not have enough settled Roland Garros backtest yet; treat as watch-only unless live hold/break pattern confirms it.' }
  }
  return { valid: false, label: 'Raw edge only', reason: 'Market type is not in a validated lane yet.' }
}

const normalizeNameToken = (value = '') =>
  `${value}`
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const percentageFromRecord = (record?: HistoryRecord | null) => {
  if (!record) return null
  const total = record.wins + record.losses
  if (!total) return null
  return (record.wins / total) * 100
}

const formatPercent = (value?: number | null, digits = 1) => {
  if (!Number.isFinite(Number(value))) return 'N/A'
  return `${Number(value).toFixed(digits)}%`
}

const buildTrendSegments = (values: Array<number | null>, width: number, height: number, padding: number) => {
  if (!values.length) return []
  const usableHeight = height - padding * 2
  const usableWidth = width - padding * 2
  const points = values.map((value, index) => {
    if (!Number.isFinite(Number(value))) return null
    const x = values.length === 1 ? width / 2 : padding + (usableWidth * index) / (values.length - 1)
    const y = padding + ((100 - Number(value)) / 100) * usableHeight
    return { x, y }
  })

  const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    if (!previous || !current) continue
    segments.push({ x1: previous.x, y1: previous.y, x2: current.x, y2: current.y })
  }

  return segments
}

const getHistoryMetricTone = (metric: { tone?: string }) => metric.tone || 'neutral'
const getHistoryReviewTone = (result?: string) => {
  if (result === 'hit') return 'positive'
  if (result === 'miss') return 'negative'
  return 'info'
}

const buildFallbackHistorySportTabs = (entry: HistoryEntry | null): HistorySportTab[] => {
  if (!entry || entry.sportTabs?.length || entry.sports.length <= 1) return []

  return entry.sports.map((sport) => {
    const lower = sport.toLowerCase()
    const metrics = []

    if (lower === 'mlb') {
      if (entry.performance?.mlbFullGame) {
        metrics.push({
          label: 'Full game',
          value: `${entry.performance.mlbFullGame.wins}-${entry.performance.mlbFullGame.losses}`,
          tone: entry.performance.mlbFullGame.wins >= entry.performance.mlbFullGame.losses ? 'positive' : 'warning'
        })
      }
      if (entry.performance?.mlbFirst5) {
        metrics.push({
          label: 'First 5',
          value: `${entry.performance.mlbFirst5.wins}-${entry.performance.mlbFirst5.losses}`,
          tone: entry.performance.mlbFirst5.wins >= entry.performance.mlbFirst5.losses ? 'positive' : 'warning'
        })
      }
      if (entry.performance?.mlbFirstInning) {
        metrics.push({
          label: '1st inning',
          value: `${entry.performance.mlbFirstInning.wins}-${entry.performance.mlbFirstInning.losses}`,
          tone: entry.performance.mlbFirstInning.wins >= entry.performance.mlbFirstInning.losses ? 'positive' : 'warning'
        })
      }
      if (entry.performance?.hrBoard) {
        metrics.push({
          label: 'HR board',
          value: `${entry.performance.hrBoard.hits}/${entry.performance.hrBoard.total}`,
          tone:
            entry.performance.hrBoard.hits / Math.max(entry.performance.hrBoard.total, 1) >= 0.25 ? 'warning' : 'negative'
        })
      }
      if (entry.performance?.mlbProps) {
        metrics.push({
          label: 'Props',
          value: `${entry.performance.mlbProps.hits}/${entry.performance.mlbProps.total}`,
          tone:
            entry.performance.mlbProps.hits / Math.max(entry.performance.mlbProps.total, 1) >= 0.5 ? 'positive' : 'warning'
        })
      }
    }

    if (lower === 'tennis' && entry.performance?.tennis) {
      metrics.push({
        label: 'Main tour',
        value: `${entry.performance.tennis.wins}-${entry.performance.tennis.losses}`,
        tone: entry.performance.tennis.wins >= entry.performance.tennis.losses ? 'positive' : 'warning'
      })
    }

    if (lower === 'nba' && entry.performance?.nba) {
      metrics.push({
        label: 'NBA',
        value: `${entry.performance.nba.wins}-${entry.performance.nba.losses}`,
        tone: entry.performance.nba.wins >= entry.performance.nba.losses ? 'positive' : 'warning'
      })
    }

    if (lower === 'wnba' && entry.performance?.wnba) {
      metrics.push({
        label: 'WNBA',
        value: `${entry.performance.wnba.wins}-${entry.performance.wnba.losses}`,
        tone: entry.performance.wnba.wins >= entry.performance.wnba.losses ? 'positive' : 'warning'
      })
    }

    return {
      id: lower,
      label: sport,
      summary: `${entry.label} ${sport} archive block.`,
      metrics,
      placeholder:
        `A dedicated ${sport} game-by-game ledger was not saved for this day yet. The archive still keeps the summary metrics, notes, and artifacts above.`
    }
  })
}

const formatSnapshotTime = (isoString: string) => {
  if (!isoString) return ''
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(new Date(isoString))
}

const formatStoryFrame = (event?: StoryTimelineEvent | null) => {
  if (!event) return 'No event loaded'
  return `${event.half === 'top' ? 'Top' : 'Bot'} ${event.inning}`
}

const classifyStoryEventTone = (event?: StoryTimelineEvent | null) => {
  if (!event) return 'neutral'
  const eventType = (event.eventType || '').toLowerCase()
  const eventLabel = (event.event || '').toLowerCase()
  if (event.runDelta > 0 || eventLabel.includes('home run')) return 'scoring'
  if (eventType.includes('walk') || eventType.includes('hit_by_pitch')) return 'patient'
  if (
    eventType.includes('single') ||
    eventType.includes('double') ||
    eventType.includes('triple') ||
    eventType.includes('home_run') ||
    eventLabel.includes('single') ||
    eventLabel.includes('double') ||
    eventLabel.includes('triple')
  ) {
    return 'contact'
  }
  if (eventType.includes('strikeout')) return 'whiff'
  if (eventType.includes('field_out') || eventType.includes('double_play') || eventType.includes('force_out')) return 'out'
  return 'neutral'
}

const buildStoryTimelineGroups = (timeline: StoryTimelineEvent[]) => {
  const groups: Array<{ key: string; label: string; events: StoryTimelineEvent[] }> = []
  timeline.forEach((event) => {
    const key = `${event.half}-${event.inning}`
    const label = `${event.half === 'top' ? 'Top' : 'Bottom'} ${event.inning}`
    const existing = groups[groups.length - 1]
    if (!existing || existing.key !== key) {
      groups.push({ key, label, events: [event] })
      return
    }
    existing.events.push(event)
  })
  return groups
}

const buildTrackedPropBoardByGame = (payload: AnyRecord | null) => {
  if (!payload?.picks || !Array.isArray(payload.picks)) return {}

  const grouped = payload.picks.reduce((acc: Record<string, AnyRecord[]>, pick: AnyRecord) => {
    if (!pick?.gameId) return acc
    if (!acc[pick.gameId]) acc[pick.gameId] = []
    acc[pick.gameId].push(pick)
    return acc
  }, {})

  return Object.fromEntries(
    Object.entries(grouped).map(([gameId, picks]) => {
      const gamePicks = picks as AnyRecord[]
      const sorted = [...gamePicks].sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0))
      const byType = sorted.reduce((acc: Record<string, AnyRecord[]>, pick: AnyRecord) => {
        if (!acc[pick.propType]) acc[pick.propType] = []
        acc[pick.propType].push(pick)
        return acc
      }, {})
      const leader = sorted[0]
      const featured = []
      const featuredIds = new Set<string>()
      Object.keys(byType).forEach((propType) => {
        const topOfType = byType[propType]?.[0]
        if (topOfType && !featuredIds.has(topOfType.id)) {
          featured.push(topOfType)
          featuredIds.add(topOfType.id)
        }
      })
      sorted.forEach((pick) => {
        if (featured.length >= 6 || featuredIds.has(pick.id)) return
        featured.push(pick)
        featuredIds.add(pick.id)
      })
      return [
        gameId,
        {
          available: sorted.length > 0,
          targets: sorted,
          featured,
          byType,
          summary: leader
            ? `${leader.playerName} leads the tracked prop board for this game, with ${sorted.length} narrower lanes surviving the current filters. Featured props are diversified by market type first.`
            : 'No tracked prop lanes survived the current filters.'
        }
      ]
    })
  )
}

const getPacificClock = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value])
  ) as Record<string, string>

  const isoDate = `${parts.year}-${parts.month}-${parts.day}`
  const hour = Number(parts.hour) || 0
  const minute = Number(parts.minute) || 0

  return {
    isoDate,
    minutes: hour * 60 + minute,
    label: `${parts.month}/${parts.day} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} PT`
  }
}

const getEventState = (game: AnyRecord, dayIsoDate: string, pacificClock: ReturnType<typeof getPacificClock>) => {
  if (!game || !dayIsoDate || !pacificClock.isoDate) return { invalid: false, label: 'Open', tone: 'open' }
  if (dayIsoDate < pacificClock.isoDate) return { invalid: true, label: 'Final', tone: 'invalid' }
  if (dayIsoDate > pacificClock.isoDate) return { invalid: false, label: 'Upcoming', tone: 'open' }

  if (Number.isFinite(Number(game.startMinutes)) && Number(game.startMinutes) <= pacificClock.minutes) {
    return { invalid: true, label: 'Started', tone: 'invalid' }
  }

  return { invalid: false, label: 'Open', tone: 'open' }
}

const buildPitcherSummary = (
  pitcher: AnyRecord = {},
  holdConfidence?: number | null,
  firstInningSeason: AnyRecord | null = null,
  warProfile: AnyRecord | null = null,
  strikeoutProp: AnyRecord | null = null
) => {
  const pitcherName = pitcher.fullName || pitcher.name || 'TBD starter'
  const pitchHand = pitcher.pitchHand ? `${pitcher.pitchHand}HP` : '?HP'
  const record = `${pitcher.wins ?? 0}-${pitcher.losses ?? 0}`
  const era = pitcher.era ? `${pitcher.era} ERA` : 'ERA n/a'
  const whip = pitcher.whip ? `${pitcher.whip} WHIP` : 'WHIP n/a'
  const recentForm = pitcher.recentForm
  const usageContext = pitcher.usageContext || {}
  const detailStats = [
    pitcher.strikeOuts !== undefined ? { label: 'SO', value: String(pitcher.strikeOuts) } : null,
    pitcher.inningsPitched ? { label: 'IP', value: String(pitcher.inningsPitched) } : null,
    pitcher.homeRunsAllowed !== undefined ? { label: 'HR', value: String(pitcher.homeRunsAllowed) } : null,
    pitcher.walks !== undefined ? { label: 'BB', value: String(pitcher.walks) } : null
  ].filter(Boolean) as Array<{ label: string; value: string }>
  const recent =
    recentForm && recentForm.startsSample > 0
      ? `Last ${recentForm.startsSample}: ${formatNumber(recentForm.inningsPerStart, 1)} IP/start | ${formatNumber(recentForm.earnedRunsPerStart, 1)} ER/start | ${formatNumber(recentForm.homeRunsAllowedPerStart, 1)} HR/start`
      : ''
  const trendStats =
    recentForm && recentForm.startsSample > 0
      ? [
          { label: 'Hold', value: Number.isFinite(Number(holdConfidence)) ? `${Math.round(Number(holdConfidence))}/100` : 'N/A' },
          { label: 'QS', value: `${Math.round(Number(recentForm.qualityStartRate || 0) * 100)}%` },
          { label: 'Short', value: `${Math.round(Number(recentForm.shortStartRate || 0) * 100)}%` },
          { label: 'Vol', value: formatNumber(recentForm.runVolatility, 1) }
        ]
      : Number.isFinite(Number(holdConfidence))
        ? [{ label: 'Hold', value: `${Math.round(Number(holdConfidence))}/100` }]
        : []
  if (Number.isFinite(Number(usageContext.expectedInnings)) && Number(usageContext.expectedInnings) > 0) {
    trendStats.push({ label: 'EXP IP', value: formatNumber(usageContext.expectedInnings, 1) })
  }

  const firstInningStartsSample = Number(firstInningSeason?.startsSample || 0)
  const firstInningRunGames = Number(firstInningSeason?.firstInningRunGames || 0)
  const firstInningCleanGames =
    firstInningStartsSample > 0 ? Math.max(firstInningStartsSample - firstInningRunGames, 0) : 0
  const firstInningSeasonLine =
    firstInningSeason && firstInningStartsSample > 0
      ? `1st inning season: ${Number(firstInningSeason.firstInningRunsAllowedTotal || 0)} runs in ${firstInningStartsSample} starts (${formatNumber(firstInningSeason.firstInningRunsAllowedPerStart, 2)}/start) · RFI in ${firstInningRunGames}/${firstInningStartsSample} starts · NRFI in ${firstInningCleanGames}/${firstInningStartsSample} starts`
      : ''
  const warLine =
    warProfile &&
    (Number.isFinite(Number(warProfile.currentSeasonWar)) || Number.isFinite(Number(warProfile.previousSeasonWar)))
      ? `${warProfile.currentSeason ?? 'This year'} WAR ${
          Number.isFinite(Number(warProfile.currentSeasonWar)) ? formatNumber(warProfile.currentSeasonWar, 2) : 'n/a'
        }${
          Number(warProfile.currentSeasonGamesStarted || 0) > 0
            ? ` in ${Number(warProfile.currentSeasonGamesStarted || 0)} GS`
            : ''
        } · ${warProfile.previousSeason ?? 'Last year'} WAR ${
          Number.isFinite(Number(warProfile.previousSeasonWar)) ? formatNumber(warProfile.previousSeasonWar, 2) : 'n/a'
        }${
          Number(warProfile.previousSeasonGamesStarted || 0) > 0
            ? ` in ${Number(warProfile.previousSeasonGamesStarted || 0)} GS`
            : ''
        }${
          Number.isFinite(Number(warProfile.warDelta))
            ? ` · Δ ${Number(warProfile.warDelta) > 0 ? '+' : ''}${formatNumber(warProfile.warDelta, 2)}`
            : ''
        }`
      : ''
  const strikeoutMarket = pitcher?.strikeoutMarket ?? null
  const strikeoutLine =
    strikeoutMarket && Number.isFinite(Number(strikeoutMarket.line))
      ? `FanDuel K line: O/U ${formatNumber(strikeoutMarket.line, 1)}${
          Number.isFinite(Number(strikeoutMarket.overPrice)) || Number.isFinite(Number(strikeoutMarket.underPrice))
            ? ` · O ${Number.isFinite(Number(strikeoutMarket.overPrice)) ? formatAmericanOdds(Number(strikeoutMarket.overPrice)) : 'n/a'} / U ${Number.isFinite(Number(strikeoutMarket.underPrice)) ? formatAmericanOdds(Number(strikeoutMarket.underPrice)) : 'n/a'}`
            : ''
        }`
      : ''
  const strikeoutPickLine =
    strikeoutProp && strikeoutProp.marketLabel
      ? `K prop lean: ${strikeoutProp.marketLabel} · ${strikeoutProp.statValueLabel || ''}`.trim()
      : ''

  return {
    headline: pitcherName === 'TBD starter' ? pitcherName : `${pitcherName} (${pitchHand})`,
    primary: `${record} | ${era} | ${whip}`,
    detailStats,
    recent,
    recentStarts: Array.isArray(pitcher.startHistoryLast5) ? pitcher.startHistoryLast5 : [],
    opponentStarts: Array.isArray(pitcher.opponentHistoryThisSeason) ? pitcher.opponentHistoryThisSeason : [],
    firstInningSeasonLine,
    warLine,
    strikeoutLine,
    strikeoutPickLine,
    trendStats,
    usageLabel: usageContext.workloadLabel || '',
    usageNote: usageContext.note || '',
    usageStatusLabel: usageContext.label || '',
    savant: pitcher.savant || null
  }
}

const formatSlashMetric = (value: number | null | undefined, digits = 3) => {
  if (!Number.isFinite(Number(value))) return 'n/a'
  return Number(value).toFixed(digits).replace(/^0/, '.')
}

const computeXops = (stats: AnyRecord | null | undefined) => {
  const obp = Number(stats?.obp)
  const slg = Number(stats?.slg)
  if (!Number.isFinite(obp) || !Number.isFinite(slg)) return null
  return obp * slg
}

const buildLineupPlayerInspectionLine = (player: AnyRecord = {}, opposingHand = '') => {
  const notes = []
  if (Number.isFinite(Number(player.recent?.ops))) {
    const recentXops = computeXops(player.recent)
    notes.push(
      `Recent OPS ${formatSlashMetric(player.recent.ops)}${recentXops !== null ? ` · XOPS ${formatSlashMetric(recentXops)}` : ''}`
    )
  }
  if (Number.isFinite(Number(player.split?.ops))) {
    const handLabel = opposingHand ? ` vs ${opposingHand}HP` : ''
    const splitXops = computeXops(player.split)
    notes.push(
      `Split OPS ${formatSlashMetric(player.split.ops)}${splitXops !== null ? ` · XOPS ${formatSlashMetric(splitXops)}` : ''}${handLabel}`
    )
  }
  if (Number.isFinite(Number(player.season?.ops))) {
    const seasonXops = computeXops(player.season)
    notes.push(
      `Season OPS ${formatSlashMetric(player.season.ops)}${seasonXops !== null ? ` · XOPS ${formatSlashMetric(seasonXops)}` : ''}`
    )
  }
  return notes.join(' · ')
}

const buildTeamContextSummary = (team: AnyRecord = {}) => {
  if (!team || (!Number.isFinite(Number(team.wins)) && !Number.isFinite(Number(team.losses)))) return ''
  const record = `${team.wins ?? '-'}-${team.losses ?? '-'}`
  const rankLabel = team.divisionLeader ? '1st in division' : `${formatOrdinal(team.divisionRank)} in division`
  const streak = team.streakCode ? ` | ${team.streakCode}` : ''
  return `${record} | ${rankLabel}${streak}`
}

const buildRecentRecordLabel = (winPct: number | null | undefined, sample: number | null | undefined) => {
  const numericSample = Number(sample)
  const numericWinPct = Number(winPct)
  if (!Number.isFinite(numericSample) || numericSample <= 0 || !Number.isFinite(numericWinPct)) return ''
  const wins = Math.round(numericWinPct * numericSample)
  const losses = Math.max(numericSample - wins, 0)
  return `${wins}-${losses}`
}

const buildEdgeHeadline = (teamName = '', edge: number | null | undefined, unit = 'H', emptyLabel = 'Even board') => {
  const numericEdge = Number(edge)
  if (!teamName || !Number.isFinite(numericEdge) || Math.abs(numericEdge) < 0.05) return emptyLabel
  return `${teamName} +${formatNumber(Math.abs(numericEdge), 1)} ${unit}`
}

const buildPitcherTypeLabel = (pitcher: AnyRecord = {}, fallbackType = '') => {
  const usageStatus = pitcher?.usageContext?.status || ''
  const hand = pitcher?.pitchHand ? `${pitcher.pitchHand.toLowerCase()}y` : 'arm'
  if (usageStatus === 'debut-window' || usageStatus === 'milb-callup') return `MiLB call-up ${hand}`
  if (usageStatus === 'tiny-sample') return `Tiny-sample ${hand}`
  if (usageStatus === 'new-look') return `New-look ${hand}`
  return fallbackType || 'Unknown lane'
}

const buildPerformancePulse = (teamState?: AnyRecord | null, teamContext?: AnyRecord | null) => {
  const recentGamesSample = Number(teamState?.gamesSample || 0)
  const recentWinPct = Number(teamState?.winPctLast5)
  const recentRunDiffPerGame = Number(teamState?.runDiffLast5)
  const seasonWins = Number(teamContext?.wins)
  const seasonLosses = Number(teamContext?.losses)
  const seasonGames = seasonWins + seasonLosses
  const seasonWinPct =
    Number.isFinite(Number(teamContext?.winningPercentage))
      ? Number(teamContext?.winningPercentage)
      : seasonGames > 0
        ? seasonWins / seasonGames
        : Number.NaN
  const seasonRunDiffPerGame =
    seasonGames > 0 && Number.isFinite(Number(teamContext?.runDifferential))
      ? Number(teamContext?.runDifferential) / seasonGames
      : Number.NaN

  if (
    recentGamesSample <= 0 ||
    !Number.isFinite(recentWinPct) ||
    !Number.isFinite(recentRunDiffPerGame) ||
    !Number.isFinite(seasonWinPct) ||
    !Number.isFinite(seasonRunDiffPerGame)
  ) {
    return null
  }

  const toPerformanceScore = (winPct: number, runDiffPerGame: number) =>
    Math.round(clamp(50 + (winPct - 0.5) * 60 + runDiffPerGame * 5, 1, 99))

  const recentScore = toPerformanceScore(recentWinPct, recentRunDiffPerGame)
  const seasonScore = toPerformanceScore(seasonWinPct, seasonRunDiffPerGame)
  const ratio = seasonScore > 0 ? recentScore / seasonScore : null

  if (!Number.isFinite(ratio)) return null

  return {
    recentGamesSample,
    recentScore,
    seasonScore,
    ratio
  }
}

const buildTeamSnapshotChips = ({
  teamState,
  teamContext,
  lineupConversion,
  offenseContext,
  firstInningTeam
}: {
  teamState?: AnyRecord | null
  teamContext?: AnyRecord | null
  lineupConversion?: AnyRecord | null
  offenseContext?: AnyRecord | null
  firstInningTeam?: AnyRecord | null
}) => {
  const chips: Array<{ label: string; value: string }> = []

  if (teamState && Number(teamState.gamesSample || 0) > 0) {
    const gamesSample = Number(teamState.gamesSample || 0)
    const recordLabel = buildRecentRecordLabel(teamState.winPctLast5, gamesSample)
    chips.push({
      label: `Last ${gamesSample}`,
      value: `${recordLabel || 'n/a'} · ${formatSignedNumber(teamState.runDiffLast5, 1)} RD/G`
    })
  }

  const performancePulse = buildPerformancePulse(teamState, teamContext)
  if (performancePulse) {
    chips.push({
      label: `Perf ${performancePulse.recentGamesSample}/Szn`,
      value: `${performancePulse.recentScore}/${performancePulse.seasonScore} · x${formatNumber(performancePulse.ratio, 2)}`
    })
  }

  if (lineupConversion && Number(lineupConversion.gamesSample || 0) > 0) {
    chips.push({
      label: `Recent ${Number(lineupConversion.gamesSample || 0)}`,
      value: `Conv ${formatNumber(lineupConversion.lineupConversionIndex, 0)} · Quiet F5 ${formatPercent(Number(lineupConversion.quietFirst5Rate || 0) * 100, 0)}`
    })
  }

  if (firstInningTeam && Number(firstInningTeam.gamesSample || 0) > 0) {
    chips.push({
      label: `1st ${Number(firstInningTeam.gamesSample || 0)}`,
      value: `Score ${formatPercent(Number(firstInningTeam.scoredFirstInningRate || 0) * 100, 0)} · Allow ${formatPercent(Number(firstInningTeam.allowedFirstInningRate || 0) * 100, 0)}`
    })
  }

  if (offenseContext && (Number.isFinite(Number(offenseContext.hitsPerGame)) || Number.isFinite(Number(offenseContext.last3HitsPerGame)))) {
    chips.push({
      label: 'Season',
      value: `${formatNumber(offenseContext.hitsPerGame, 1)} H/G · last 3 ${formatNumber(offenseContext.last3HitsPerGame, 1)}`
    })
  }

  return chips
}

const buildBullpenPulseLine = (recentBullpenSummary: AnyRecord | null, seasonBullpenSummary: AnyRecord | null) => {
  if (!recentBullpenSummary || Number(recentBullpenSummary.gamesSample || 0) <= 0) return ''
  const recentGames = Number(recentBullpenSummary.gamesSample || 0)
  const recentLabel = `Bullpen last ${recentGames}: ${formatNumber(recentBullpenSummary.era, 2)} ERA / ${formatNumber(recentBullpenSummary.whip, 2)} WHIP`
  if (!seasonBullpenSummary || seasonBullpenSummary.staleFeed) return recentLabel
  return `${recentLabel} vs season ${formatNumber(seasonBullpenSummary.era, 2)} ERA / ${formatNumber(seasonBullpenSummary.whip, 2)} WHIP`
}

const buildGameFlowOverview = ({
  projection,
  analysis,
  awayTeam,
  homeTeam,
  awayHold,
  homeHold
}: {
  projection?: AnyRecord | null
  analysis?: AnyRecord | null
  awayTeam: string
  homeTeam: string
  awayHold: number
  homeHold: number
}) => {
  const sidePick = analysis?.participant?.name || ''
  const trafficLeader = projection?.edgeTeam || ''
  const first5Leader = projection?.first5EdgeTeam || ''
  const bridgeLeader = projection?.bridgeEdgeTeam || ''
  const starterLeader = awayHold >= homeHold ? awayTeam : homeTeam
  const trafficEdge = Number(projection?.edgeHits || 0)

  if (projection?.lineupSimulation?.overview) {
    const summary = String(projection.lineupSimulation.overview)
    if (sidePick && trafficLeader && sidePick !== trafficLeader) {
      return `${summary} The actual side pick still leans ${sidePick}, but only as a pass-grade conflict because ${trafficLeader} own the raw traffic script while ${starterLeader}${bridgeLeader ? ` and ${bridgeLeader}` : ''} keep the cleaner survival lanes.`
    }
    return summary
  }

  if (sidePick && trafficLeader && sidePick !== trafficLeader) {
    return `${trafficLeader} own the raw full-game traffic edge by ${formatNumber(trafficEdge, 1)} hits, but ${sidePick} still hold the cleaner starter or bridge safety profile. Treat this as a split-script pass, not a clean recommendation.`
  }

  if (trafficLeader) {
    return `${trafficLeader} carry the cleaner full-game traffic path, ${first5Leader || trafficLeader} have the better starter-window lane, and ${bridgeLeader || starterLeader} control the bridge innings.`
  }

  return 'No clean script leader is stored on this pass.'
}

const recentGamesSeriesPalette = ['#52d6b3', '#f4b860', '#5f8dff', '#e77df5', '#ff7f66', '#7be3ff']

const groupRecentGamesBySeries = (games: AnyRecord[] = []) => {
  const groups: AnyRecord[] = []
  for (const game of games) {
    const slot = Number.isFinite(Number(game.seriesSlot)) ? Number(game.seriesSlot) : groups.length
    const current = groups.at(-1)
    if (!current || current.seriesSlot !== slot) {
      groups.push({
        seriesSlot: slot,
        games: [game]
      })
      continue
    }
    current.games.push(game)
  }
  return groups
}

const formatRecentGameTooltip = (teamName: string, game: AnyRecord = {}) => {
  const opponent = game.opponent || 'Opponent'
  const venuePreposition = game.venueRole === 'road' ? 'at' : 'vs'
  const dateLabel = game.date
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${game.date}T12:00:00Z`))
    : 'Recent'
  const resultLabel = game.result || '?'
  const scoreLabel =
    Number.isFinite(Number(game.runsFor)) && Number.isFinite(Number(game.runsAgainst))
      ? `${game.runsFor}-${game.runsAgainst}`
      : 'n/a'
  return `${teamName} ${resultLabel} ${scoreLabel} ${venuePreposition} ${opponent} on ${dateLabel}`
}

const renderRecentGamesStrip = (teamName: string, games: AnyRecord[] = []) => {
  if (!games.length) return null
  const seriesGroups = groupRecentGamesBySeries(games)
  return (
    <div className="recent-games-strip" aria-label={`${teamName} last ${games.length} games`}>
      {seriesGroups.map((group, index) => {
        const barColor = recentGamesSeriesPalette[index % recentGamesSeriesPalette.length]
        return (
          <div key={`${teamName}-${group.seriesSlot}-${index}`} className="recent-games-series">
            <div className="recent-games-dots">
              {group.games.map((game: AnyRecord, gameIndex: number) => {
                const resultTone = game.result === 'W' ? 'win' : game.result === 'L' ? 'loss' : 'tie'
                const roadClass = game.venueRole === 'road' ? 'road' : 'home'
                return (
                  <span
                    key={`${teamName}-${group.seriesSlot}-${game.gamePk || `${game.date}-${gameIndex}`}`}
                    className={`recent-game-dot ${resultTone} ${roadClass}`}
                    title={formatRecentGameTooltip(teamName, game)}
                    aria-label={formatRecentGameTooltip(teamName, game)}
                  />
                )
              })}
            </div>
            <span className="recent-games-series-bar" style={{ backgroundColor: barColor }} />
          </div>
        )
      })}
    </div>
  )
}

const formatMatchupHistoryDate = (date: string) => {
  if (!date) return 'Recent'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
}

const shortenPitcherName = (name = '') => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length <= 1) return name || ''
  const first = parts[0]?.[0] ? `${parts[0][0]}.` : ''
  const last = parts.at(-1) || ''
  return [first, last].filter(Boolean).join(' ')
}

const formatStarterFirstInningLabel = (starter: AnyRecord | null | undefined) => {
  if (!starter?.pitcherName) return ''
  const shortName = shortenPitcherName(starter.pitcherName)
  const runsAllowed = Number(starter.firstInningRunsAllowed || 0) || 0
  if (runsAllowed <= 0) return `${shortName} NRFI`
  if (runsAllowed === 1) return `${shortName} RFI`
  return `${shortName} ${runsAllowed}RFI`
}

const buildPitcherStartHistoryDetail = (start: AnyRecord = {}) => {
  const venueLabel = start.venueRole === 'road' ? '@' : 'vs'
  const teamResult = start.teamResult || '?'
  const scoreLabel =
    Number.isFinite(Number(start.teamRuns)) && Number.isFinite(Number(start.opponentRuns))
      ? `${start.teamRuns}-${start.opponentRuns}`
      : 'n/a'
  const lines = [
    `${formatMatchupHistoryDate(start.date)} ${venueLabel} ${start.opponentName || 'Opponent'}`,
    `${teamResult} ${scoreLabel}`,
    `${start.inningsPitchedLabel || '-'} IP · ${Number(start.earnedRuns || 0) || 0} ER · ${Number(start.hitsAllowed || 0) || 0} H · ${Number(start.walksAllowed || 0) || 0} BB · ${Number(start.strikeouts || 0) || 0} K · ${Number(start.homeRunsAllowed || 0) || 0} HR`
  ]
  if (Number.isFinite(Number(start.pitchesThrown)) && Number(start.pitchesThrown) > 0) {
    lines.push(`${Number(start.pitchesThrown)} pitches`)
  }
  if (start.firstInningOutcome) {
    lines.push(`${start.firstInningOutcome} · ${Number(start.firstInningRunsAllowed || 0) || 0} 1st-inning runs allowed`)
  }
  if (start.qualityStart) {
    lines.push('Quality start')
  }
  if (start.venueName) {
    lines.push(start.venueName)
  }
  return lines.join('\n')
}

const renderPitcherStartHistory = (label: string, starts: AnyRecord[] = [], emptyNote = '') => {
  if (!starts.length && !emptyNote) return null

  return (
    <section className="pitcher-history-section">
      <div className="pitcher-history-head">
        <small>{label}</small>
        {starts.length ? <span>{starts.length} start{starts.length === 1 ? '' : 's'}</span> : null}
      </div>
      {starts.length ? (
        <div className="pitcher-history-bubble-row">
          {starts.map((start, index) => {
            const venueLabel = start.venueRole === 'road' ? '@' : 'vs'
            const teamResult = start.teamResult || '?'
            return (
              <span
                key={`${label}-${start.gamePk || `${start.date}-${index}`}`}
                className={`pitcher-history-bubble ${start.qualityStart ? 'quality' : ''}`}
                tabIndex={0}
                title={buildPitcherStartHistoryDetail(start)}
              >
                <small>{formatMatchupHistoryDate(start.date)}</small>
                <strong>{teamResult} {venueLabel} {start.opponentName || 'Opp'}</strong>
                <span>{start.inningsPitchedLabel || '-'} IP · {Number(start.earnedRuns || 0) || 0} ER · {Number(start.strikeouts || 0) || 0} K</span>
                <span className="pitcher-history-popover">
                  <strong>{formatMatchupHistoryDate(start.date)} {venueLabel} {start.opponentName || 'Opponent'}</strong>
                  <small>{teamResult} {Number.isFinite(Number(start.teamRuns)) && Number.isFinite(Number(start.opponentRuns)) ? `${start.teamRuns}-${start.opponentRuns}` : 'n/a'}</small>
                  <small>{start.inningsPitchedLabel || '-'} IP · {Number(start.earnedRuns || 0) || 0} ER · {Number(start.hitsAllowed || 0) || 0} H · {Number(start.walksAllowed || 0) || 0} BB · {Number(start.strikeouts || 0) || 0} K · {Number(start.homeRunsAllowed || 0) || 0} HR</small>
                  {Number.isFinite(Number(start.pitchesThrown)) && Number(start.pitchesThrown) > 0 ? (
                    <small>{Number(start.pitchesThrown)} pitches</small>
                  ) : null}
                  {start.firstInningOutcome ? (
                    <small>{start.firstInningOutcome} · {Number(start.firstInningRunsAllowed || 0) || 0} 1st-inning runs allowed</small>
                  ) : null}
                  {start.qualityStart ? <small>Quality start</small> : null}
                </span>
              </span>
            )
          })}
        </div>
      ) : (
        <small>{emptyNote}</small>
      )}
    </section>
  )
}

const renderMatchupStoryChart = (teamName: string, headerLabel: string, games: AnyRecord[] = []) => {
  if (!games.length) return null

  const gridTemplateColumns = `52px repeat(${games.length}, minmax(58px, 1fr))`
  const rows = [
    { key: 'market', label: 'Mkt' },
    { key: 'hitters', label: 'Bat' },
    { key: 'starter', label: 'SP' },
    { key: 'relief', label: 'RP' }
  ]

  return (
    <section className="matchup-story-block" aria-label={`${teamName} ${headerLabel} story chart`}>
      <div className="matchup-history-scroll">
        <div className="matchup-story-chart">
          <div className="matchup-story-row matchup-story-header" style={{ gridTemplateColumns }}>
            <span className="matchup-story-label">Story</span>
            {games.map((game, index) => (
              <span
                key={`${teamName}-${headerLabel}-story-head-${game.gamePk || index}`}
                className="matchup-story-date"
              >
                <strong>{formatMatchupHistoryDate(game.date)}</strong>
                <small>{game.result || '?'}</small>
              </span>
            ))}
          </div>
          {rows.map((row) => (
            <div
              key={`${teamName}-${headerLabel}-story-${row.key}`}
              className="matchup-story-row"
              style={{ gridTemplateColumns }}
            >
              <span className="matchup-story-label">{row.label}</span>
              {games.map((game, index) => {
                const story = game.storyAxes?.[row.key] ?? { label: 'N/A', tone: 'info' }
                return (
                  <span
                    key={`${teamName}-${row.key}-${game.gamePk || index}`}
                    className={`matchup-story-cell ${story.tone || 'info'}`}
                    title={story.label || 'N/A'}
                  >
                    {story.label || 'N/A'}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const renderInningHistoryTable = (
  teamName: string,
  headerLabel: string,
  games: AnyRecord[] = [],
  highlightPitcherName = '',
  historyWindow: 5 | 10 = 5,
  onHistoryWindowChange: ((nextWindow: 5 | 10) => void) | null = null
) => {
  if (!games.length) return null

  const visibleCount = Math.min(games.length, historyWindow)
  const visibleGames = games.slice(-visibleCount)
  const maxInning = Math.max(
    9,
    ...visibleGames.map((game) => Array.isArray(game.innings) ? game.innings.length : 0)
  )
  const gridTemplateColumns = `84px repeat(${maxInning}, minmax(22px, 1fr)) 28px`
  const canToggleWindow = games.length > 5 && typeof onHistoryWindowChange === 'function'

  return (
    <section className="matchup-history-block" aria-label={`${teamName} ${headerLabel} inning history`}>
      {canToggleWindow ? (
        <div className="matchup-history-toolbar">
          <span className="matchup-history-toggle-label">Window</span>
          <div className="matchup-history-toggle" role="group" aria-label={`${teamName} ${headerLabel} window toggle`}>
            {[5, 10].map((windowSize) => {
              const typedWindow = windowSize as 5 | 10
              return (
                <button
                  key={`${teamName}-${headerLabel}-window-${windowSize}`}
                  type="button"
                  className={typedWindow === historyWindow ? 'active' : ''}
                  onClick={() => onHistoryWindowChange(typedWindow)}
                  aria-pressed={typedWindow === historyWindow}
                >
                  {windowSize}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
      <div className="matchup-history-scroll">
        <div className="matchup-history-table">
          <div className="matchup-history-row matchup-history-header" style={{ gridTemplateColumns }}>
            <span className="matchup-history-meta">{headerLabel}</span>
            {Array.from({ length: maxInning }, (_, index) => (
              <span key={`${teamName}-${headerLabel}-inning-head-${index + 1}`} className="matchup-history-cell heading">
                {index + 1}
              </span>
            ))}
            <span className="matchup-history-cell heading">R</span>
          </div>
          {visibleGames.map((game, index) => {
            const venueLabel = game.venueRole === 'road' ? '@' : 'vs'
            const scoreLabel =
              Number.isFinite(Number(game.runsFor)) && Number.isFinite(Number(game.runsAgainst))
                ? `${game.runsFor}-${game.runsAgainst}`
                : 'n/a'
            const starterMatchesToday =
              highlightPitcherName &&
              normalizeNameToken(game.starters?.team?.pitcherName || '') === normalizeNameToken(highlightPitcherName)
            return (
              <div
                key={`${teamName}-${headerLabel}-${game.gamePk || `${game.date}-${index}`}`}
                className="matchup-history-row"
                style={{ gridTemplateColumns }}
              >
                <span className="matchup-history-meta">
                  <strong>{formatMatchupHistoryDate(game.date)}</strong>
                  <small>{game.result || '?'} {scoreLabel} {venueLabel}</small>
                  {game.starters?.team || game.starters?.opponent ? (
                    <small className="matchup-history-pitchers">
                      {formatStarterFirstInningLabel(game.starters?.team)}
                      {game.starters?.team && game.starters?.opponent ? ' / ' : ''}
                      {formatStarterFirstInningLabel(game.starters?.opponent)}
                    </small>
                  ) : null}
                  {starterMatchesToday ? (
                    <small>
                      <span className="matchup-history-starter-pill">Today SP</span>
                    </small>
                  ) : null}
                </span>
                {Array.from({ length: maxInning }, (_, inningIndex) => {
                  const runValue = Number(game.innings?.[inningIndex]?.runs || 0) || 0
                  return (
                    <span
                      key={`${teamName}-${game.gamePk || index}-inning-${inningIndex + 1}`}
                      className={`matchup-history-cell ${runValue > 0 ? 'scored' : ''}`}
                    >
                      {runValue}
                    </span>
                  )
                })}
                <span className="matchup-history-cell total">{Number(game.runsFor || 0) || 0}</span>
              </div>
            )
          })}
        </div>
      </div>
      {renderMatchupStoryChart(teamName, headerLabel, visibleGames)}
    </section>
  )
}

const renderMatchupInningHistory = (
  teamName: string,
  opponentName: string,
  games: AnyRecord[] = [],
  highlightPitcherName = '',
  historyWindow: 5 | 10 = 5,
  onHistoryWindowChange: ((nextWindow: 5 | 10) => void) | null = null
) => renderInningHistoryTable(teamName, `vs ${opponentName}`, games, highlightPitcherName, historyWindow, onHistoryWindowChange)

const renderRecentInningHistory = (
  teamName: string,
  games: AnyRecord[] = [],
  historyWindow: 5 | 10 = 5,
  onHistoryWindowChange: ((nextWindow: 5 | 10) => void) | null = null
) =>
  renderInningHistoryTable(teamName, `Last ${Math.min(historyWindow, games.length)} overall`, games, '', historyWindow, onHistoryWindowChange)

const buildMlbGameStory = ({
  game,
  projection,
  awayTeam,
  homeTeam
}: {
  game: AnyRecord
  projection: AnyRecord
  awayTeam: string
  homeTeam: string
}) => {
  const analysis = game.analysis ?? {}
  const indicators = analysis.indicators ?? {}
  const participant = analysis.participant ?? {}
  const pickName = participant.name || projection?.edgeTeam || awayTeam
  const pickIsAway = pickName === awayTeam
  const opponentName = pickIsAway ? homeTeam : awayTeam
  const pickStarter = pickIsAway ? game.starterContext?.away ?? null : game.starterContext?.home ?? null
  const oppStarter = pickIsAway ? game.starterContext?.home ?? null : game.starterContext?.away ?? null
  const pickLineupSummary = pickIsAway ? game.lineupBoard?.away?.summary ?? {} : game.lineupBoard?.home?.summary ?? {}
  const oppLineupSummary = pickIsAway ? game.lineupBoard?.home?.summary ?? {} : game.lineupBoard?.away?.summary ?? {}
  const pickState = pickIsAway ? game.stateContext?.teamState?.away ?? null : game.stateContext?.teamState?.home ?? null
  const oppState = pickIsAway ? game.stateContext?.teamState?.home ?? null : game.stateContext?.teamState?.away ?? null
  const pickSeries = pickIsAway ? game.stateContext?.seriesEarlyPhase?.away ?? null : game.stateContext?.seriesEarlyPhase?.home ?? null
  const oppSeries = pickIsAway ? game.stateContext?.seriesEarlyPhase?.home ?? null : game.stateContext?.seriesEarlyPhase?.away ?? null
  const starterLeverage = Number(indicators.starterLeverageIndex || 0)
  const lateStability = Number(indicators.lateInningStabilityIndex || 0)
  const reliefRisk = Number(indicators.reliefPitchingRisk || 0)
  const coinflipPressure = Number(indicators.coinflipPressure || 0)
  const tierOneRiskPoints = Number(indicators.tierOneRiskPoints || 0)
  const tierOnePassFlag = Boolean(indicators.tierOnePassFlag || analysis.tier === 'Pass')
  const opponentSnapback = Number(indicators.oppSnapbackPressure || 0)
  const pickSnapback = Number(indicators.pickSnapbackPressure || 0)
  const pickTop6Cold = Number(indicators.pickTop6Cold || 0)
  const opponentTop6Heat = Number(indicators.oppTop6Heat || 0)
  const vetoCount = Number(indicators.researchOnlyVetoFlagCount || 0)
  const vetoReasons = Array.isArray(indicators.researchOnlyVetoFlags) ? indicators.researchOnlyVetoFlags : []
  const protectedMarketDogFlag = Boolean(indicators.protectedMarketDogFlag)
  const chaosAction = String(indicators.vetoLayer?.recommendedAction || '')
  const efficientFavoriteFlag = Boolean(indicators.efficientFavoriteCandidateFlag)
  const efficientFavoriteReasons = Array.isArray(indicators.efficientFavoriteReasons)
    ? indicators.efficientFavoriteReasons
    : []
  const impliedProbabilityPct = Number.isFinite(Number(participant.impliedProbability))
    ? Number(participant.impliedProbability) * 100
    : null
  const isUnderdog = Number.isFinite(Number(participant.americanOdds)) ? Number(participant.americanOdds) > 0 : impliedProbabilityPct !== null ? impliedProbabilityPct < 50 : false
  const firstInning = projection?.firstInning ?? null
  const firstInningStrong = ['Strong', 'Clear'].includes(String(firstInning?.strength || ''))
  const pickReasons = Array.isArray(analysis.pickReasons) ? analysis.pickReasons.filter(Boolean) : []
  const pickStarterName = pickStarter?.fullName || pickStarter?.pitcherName || pickStarter?.name || pickName
  const oppStarterName = oppStarter?.fullName || oppStarter?.pitcherName || oppStarter?.name || opponentName
  const pickPressureBats = (pickLineupSummary?.overperformHitters ?? []).map((entry: AnyRecord) => entry.name).filter(Boolean).slice(0, 3)
  const oppPressureBats = (oppLineupSummary?.overperformHitters ?? []).map((entry: AnyRecord) => entry.name).filter(Boolean).slice(0, 3)
  const pickSoftBats = (pickLineupSummary?.underperformHitters ?? []).map((entry: AnyRecord) => entry.name).filter(Boolean).slice(0, 2)
  const oppSoftBats = (oppLineupSummary?.underperformHitters ?? []).map((entry: AnyRecord) => entry.name).filter(Boolean).slice(0, 2)
  const formatNameList = (names: string[]) => {
    if (!names.length) return ''
    if (names.length === 1) return names[0]
    if (names.length === 2) return `${names[0]} and ${names[1]}`
    return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`
  }
  const bothSeriesDeadEarly =
    Number(pickSeries?.gamesSample || 0) >= 2 &&
    Number(oppSeries?.gamesSample || 0) >= 2 &&
    Number(pickSeries?.scoredFirstInningRate || 0) === 0 &&
    Number(oppSeries?.scoredFirstInningRate || 0) === 0
  const seriesQuietThroughThree =
    Number(pickSeries?.runsFirst3PerGame || 0) <= 0.5 &&
    Number(oppSeries?.runsFirst3PerGame || 0) <= 0.5
  const pickQuietFirst5Rate = Number(indicators.pickQuietFirst5Rate || 0)
  const oppQuietFirst5Rate = Number(indicators.oppQuietFirst5Rate || 0)
  const pickScorelessFirst3Rate = Number(indicators.pickTeamScorelessFirst3Rate || 0)
  const oppScorelessFirst3Rate = Number(indicators.oppTeamScorelessFirst3Rate || 0)
  const pickConversionIndex = Number(indicators.pickLineupConversionIndex || 0)
  const oppConversionIndex = Number(indicators.oppLineupConversionIndex || 0)
  const pickDeadTraffic = Number(indicators.pickDeadBatTrafficRate || 0)
  const oppDeadTraffic = Number(indicators.oppDeadBatTrafficRate || 0)
  const quietStartShape =
    pickQuietFirst5Rate >= 0.4 &&
    oppQuietFirst5Rate >= 0.4 &&
    pickScorelessFirst3Rate >= 0.35 &&
    oppScorelessFirst3Rate >= 0.35
  const conversionEdgeTeam =
    pickConversionIndex === oppConversionIndex
      ? null
      : pickConversionIndex > oppConversionIndex
        ? pickName
        : opponentName
  const conversionGap = Math.abs(pickConversionIndex - oppConversionIndex)

  const vetoReasonLabels = vetoReasons.map((reason) => {
    if (reason === 'heavyFavoriteWeakLineup') return 'favorite price with weak lineup conversion'
    if (reason === 'heavyFavoriteNoisyBullpen') return 'favorite price with noisy bullpen shape'
    if (reason === 'deadEarlyRisk') return 'dead-early offensive shape'
    if (reason === 'clusterBullpenTrap') return 'run-cluster profile against a louder opposing bullpen'
    return reason
  })
  const efficientFavoriteReasonLabels = efficientFavoriteReasons.map((reason) => {
    if (reason === 'moderateFavoritePrice') return 'moderate favorite price'
    if (reason === 'favoritePriceStillPlayable') return 'playable favorite price'
    if (reason === 'starterControl') return 'clean starter control'
    if (reason === 'lateHoldSupport') return 'stable late hold'
    if (reason === 'lineupConversionSupport') return 'lineup conversion support'
    if (reason === 'broadSupport') return 'broad signal support'
    if (reason === 'modelAgreement') return 'model agreement'
    return reason
  })

  let headline = `${pickName} is the model side, but the bet still needs the price and matchup data to support it.`
  if (vetoCount > 0) {
    headline = `${pickName} grades best in the model, but the risk flags make this a pass.`
  } else if (bothSeriesDeadEarly && seriesQuietThroughThree) {
    headline = `${awayTeam} and ${homeTeam} have both started slowly in this series, so side bets need early offense confirmation.`
  } else if (efficientFavoriteFlag) {
    headline = `${pickName} is a playable favorite because the price is not too expensive and the support metrics agree.`
  } else if (tierOnePassFlag) {
    headline = `${pickName} may rate best, but the risk flags are stronger than the edge.`
  } else if (protectedMarketDogFlag) {
    headline = `${pickName} is an underdog with a playable price because the favorite has the larger risk flags.`
  } else if (starterLeverage >= 70 && lateStability + 10 < starterLeverage) {
    headline = `${pickName} look much cleaner through five than over the full nine innings.`
  } else if (isUnderdog) {
    headline = `${pickName} is an underdog read; it needs a real price edge, not just a hunch.`
  } else if (reliefRisk <= 40 && lateStability >= 55 && coinflipPressure <= 30) {
    headline = `${pickName} have one of the cleaner full-game shapes on the board.`
  }

  let marketText = 'The price is close enough that this should be judged by the posted number, starter matchup, and bullpen risk.'
  if (protectedMarketDogFlag) {
    marketText = `${pickName} is priced as the underdog${participant.americanLabel ? ` at ${participant.americanLabel}` : ''}, while the favorite has the larger lineup or bullpen risk.`
  } else if (efficientFavoriteFlag) {
    marketText = `${pickName} is in a playable favorite price range${participant.americanLabel ? ` at ${participant.americanLabel}` : ''}; the price is not swallowing the whole edge.`
  } else if (isUnderdog) {
    marketText = `${pickName} is priced as the underdog${participant.americanLabel ? ` at ${participant.americanLabel}` : ''}; only play it if the model edge beats the price.`
  } else if (impliedProbabilityPct !== null && impliedProbabilityPct >= 58) {
    marketText = `${pickName} are carrying a real favorite price${participant.americanLabel ? ` at ${participant.americanLabel}` : ''}, which means the story has to beat the cost, not just beat the opponent.`
  } else if (impliedProbabilityPct !== null) {
    marketText = `${pickName} are only around a ${formatPercent(impliedProbabilityPct, 0)} market favorite, so this is a price-sensitive edge, not a runaway side.`
  }

  let stateText = 'Neither team has a major streak flag, so the case depends more on the matchup data than recent win-loss noise.'
  if (vetoCount > 0 && vetoReasonLabels.length) {
    stateText = `Risk flags: ${vetoReasonLabels.join(' and ')}. That is enough to downgrade the side.`
  } else if (bothSeriesDeadEarly && seriesQuietThroughThree) {
    stateText = `Through ${pickSeries?.gamesSample} games in this series, ${pickName} has scored in the 1st ${formatPercent((pickSeries?.scoredFirstInningRate ?? 0) * 100, 0)} of the time and ${opponentName} ${formatPercent((oppSeries?.scoredFirstInningRate ?? 0) * 100, 0)}.`
  } else if (quietStartShape) {
    stateText = `${pickName} has been scoreless or low-output through five in ${formatPercent(pickQuietFirst5Rate * 100, 0)} of recent games; ${opponentName} is at ${formatPercent(oppQuietFirst5Rate * 100, 0)}.`
  } else if (conversionEdgeTeam && conversionGap >= 8) {
    stateText = `${conversionEdgeTeam} has the better hit-to-run conversion profile by ${formatNumber(conversionGap, 1)} points.`
  } else if (opponentSnapback >= 50 && opponentSnapback >= pickSnapback + 10) {
    stateText = `${opponentName} comes in with bounce-back pressure, so fading them is more dangerous than the recent form makes it look.`
  } else if (pickState?.streakDirection === 'L' && Number(pickState?.streakLength || 0) >= 3) {
    stateText = `${pickName} are carrying bounceback pressure from a stretched skid, which can cut both ways: urgency is real, but so is fragility.`
  } else if (pickTop6Cold >= 45) {
    stateText = `${pickName}'s top order is carrying real cold-bat pressure, so this side needs cleaner sequencing than the headline number suggests.`
  } else if (opponentTop6Heat >= 40 || Number(oppState?.heatRegressionIndex || 0) >= 65) {
    stateText = `${opponentName} are running hot enough that regression is part of the story, but not guaranteed on this one game.`
  }

  let shapeText = 'The full-game side is not clearly separated by phase; one bad inning can change the bet.'
  if (vetoCount > 0) {
    shapeText = 'The risk is specific enough to downgrade the side rather than treat it as normal variance.'
  } else if (pickReasons.length >= 2) {
    shapeText = `${pickReasons[0]} ${pickReasons[1]}`
  } else if (pickReasons.length === 1) {
    shapeText = pickReasons[0]
  } else if (pickPressureBats.length || oppPressureBats.length) {
    const attackTeam =
      Number(indicators.pickLineupConversionIndex || 0) >= Number(indicators.oppLineupConversionIndex || 0)
        ? pickName
        : opponentName
    const attackStarterName = attackTeam === pickName ? oppStarterName : pickStarterName
    const attackNames = attackTeam === pickName ? pickPressureBats : oppPressureBats
    const softNames = attackTeam === pickName ? oppSoftBats : pickSoftBats
    shapeText = `${attackTeam}'s live bats are ${formatNameList(attackNames)} against ${attackStarterName}.${softNames.length ? ` The softer bats right now are ${formatNameList(softNames)}.` : ''}`
  } else if (starterLeverage >= 70 && lateStability + 10 < starterLeverage) {
    shapeText = `The starter phase is the cleanest part of the story. Once the bridge innings begin, the edge softens quickly.`
  } else if (starterLeverage >= 70 && lateStability >= 55 && reliefRisk <= 40) {
    shapeText = `The starter matchup and bullpen profile both support ${pickName}.`
  } else if (coinflipPressure >= 65 || reliefRisk >= 70) {
    shapeText = 'This is high variance; the favorite can be the better side and still be overpriced.'
  } else if (firstInning && Number(firstInning.yesProbabilityPct || 0) >= 70) {
    shapeText = 'The early innings project louder than the later pace, so a first-inning or first-five burst matters more than a long slow grind.'
  }

  let expressionText = 'Wait for a better price or use a smaller stake unless the pregame edge is clear.'
  if (firstInningStrong && firstInning?.pick && firstInning.pick !== 'Pass' && (bothSeriesDeadEarly || analysis.tier === 'Pass')) {
    expressionText = `${firstInning.label}, not the side. The first-inning read is clearer than the full-game moneyline here.`
  } else if (vetoCount > 0) {
    expressionText = 'Pass the side. The risk flags are stronger than the model edge.'
  } else if (efficientFavoriteFlag) {
    expressionText = 'Full-game favorite is playable at this price.'
  } else if (protectedMarketDogFlag) {
    expressionText = 'Underdog moneyline or pass; do not pay up for the favorite.'
  } else if (tierOnePassFlag) {
    expressionText = 'Pass. Too many risk flags are fighting the edge.'
  } else if (starterLeverage >= 70 && lateStability + 10 < starterLeverage) {
    expressionText = 'First five or nothing. The matchup is cleaner early than late.'
  } else if (reliefRisk <= 40 && lateStability >= 55 && coinflipPressure <= 30) {
    expressionText = 'Full-game side is cleaner than the phase props here.'
  } else if (projection?.totals?.fullGame?.chaosGate?.vetoed) {
    expressionText = `Pass the full-game total. Chaos gate overrode ${projection.totals.fullGame.originalLabel || projection.totals.fullGame.label}.`
  } else if ((analysis.modelEdge ?? 0) < 4 && projection?.totals?.fullGame?.label) {
    expressionText = `The total may be cleaner than the side. Current totals lean is ${projection.totals.fullGame.label}.`
  }

  let triggerText =
    'Early baserunners need to turn into runs; empty traffic is not enough.'
  if (vetoCount > 0) {
    triggerText = `Pass if ${vetoReasonLabels.join(' and ')} shows up again.`
  } else if (bothSeriesDeadEarly && seriesQuietThroughThree) {
    triggerText = `A first-inning run would break the slow-start pattern from this series.`
  } else if (quietStartShape) {
    triggerText = `The first team to score with runners on base gets the advantage; otherwise this stays a low-conversion game.`
  } else if (starterLeverage >= 70 && lateStability + 10 < starterLeverage) {
    triggerText = `${pickStarterName} needs to control the first two trips through the order.`
  } else if (Number(indicators.pickLineupConversionIndex || 0) < Number(indicators.oppLineupConversionIndex || 0)) {
    triggerText = `${pickName} needs to score on its first real chance; ${opponentName} has the better conversion profile.`
  } else if (Number(indicators.pickBullpenMistakeChaos || 0) > Number(indicators.oppBullpenMistakeChaos || 0) + 6) {
    triggerText = `The edge drops if ${pickName} has to use the bullpen early.`
  } else if (pickDeadTraffic >= 0.25 || oppDeadTraffic >= 0.25) {
    const deadTeam = pickDeadTraffic >= oppDeadTraffic ? pickName : opponentName
    triggerText = `${deadTeam} has been getting runners on without scoring enough; another early miss lowers the side value.`
  }

  const chips = [
    chaosAction === 'Hard pass' ? { label: 'Hard pass', tone: 'danger' } : null,
    chaosAction === 'Pass' ? { label: 'Risk pass', tone: 'danger' } : null,
    chaosAction === 'Eligible' ? { label: 'Risk clear', tone: 'accent' } : null,
    vetoCount > 0 ? { label: `Veto ${vetoCount}x`, tone: 'danger' } : null,
    efficientFavoriteFlag ? { label: 'Efficient favorite', tone: 'accent' } : null,
    protectedMarketDogFlag ? { label: 'Underdog value', tone: 'accent' } : null,
    tierOnePassFlag ? { label: 'Pass first', tone: 'danger' } : null,
    opponentSnapback >= 50 && opponentSnapback >= pickSnapback + 10 ? { label: `${opponentName} snapback live`, tone: 'warning' } : null,
    starterLeverage >= 70 && lateStability + 10 < starterLeverage ? { label: 'Early better than late', tone: 'accent' } : null,
    coinflipPressure >= 65 ? { label: 'Coin-flip pressure', tone: 'warning' } : null,
    reliefRisk >= 70 ? { label: 'Bullpen risk', tone: 'danger' } : null,
    pickTop6Cold >= 45 ? { label: `${pickName} top-order cold`, tone: 'danger' } : null
  ].filter(Boolean) as Array<{ label: string; tone: string }>

  return {
    headline,
    cards: [
      { label: 'Market', body: marketText, tone: tierOnePassFlag || isUnderdog ? 'warning' : 'neutral' },
      { label: 'Series read', body: stateText, tone: opponentSnapback >= 50 || pickTop6Cold >= 45 || bothSeriesDeadEarly ? 'warning' : 'neutral' },
      { label: 'Key matchup', body: shapeText, tone: starterLeverage >= 70 && lateStability + 10 < starterLeverage ? 'accent' : coinflipPressure >= 65 || reliefRisk >= 70 ? 'danger' : 'neutral' },
      { label: 'What changes the bet', body: triggerText, tone: vetoCount > 0 || coinflipPressure >= 65 ? 'danger' : 'warning' },
      { label: 'Best bet type', body: expressionText, tone: tierOnePassFlag || vetoCount > 0 ? 'danger' : starterLeverage >= 70 && lateStability + 10 < starterLeverage ? 'accent' : 'neutral' }
    ],
    chips
  }
}

const getMetricTone = (value: number, inverse = false) => {
  if (!Number.isFinite(value)) return 'neutral'
  const score = inverse ? -value : value
  if (score >= 4) return 'accent'
  if (score >= 1.5) return 'warning'
  if (score <= -1.5) return 'danger'
  return 'neutral'
}

const MetricHelp = ({ label, help }: { label: string; help: string }) => (
  <span className="metric-help" data-help={help} tabIndex={0}>
    <span>{label}</span>
    <span className="metric-help-icon">?</span>
  </span>
)

const lineupStatusLabel = (status = '') => {
  if (status === 'posted') return 'Confirmed'
  if (status === 'partial') return 'Projected'
  return 'Pending'
}

const getTeamLogoUrl = (league: string, teamName: string) => {
  if (league !== 'MLB') return ''
  const code = mlbTeamLogoCode[teamName]
  return code ? `${mlbLogoBase}/${code}_l.svg` : ''
}

const getTeamAccent = (league: string, teamName: string) => {
  if (league !== 'MLB') return '#4fd2a6'
  return mlbTeamAccent[teamName] || '#4fd2a6'
}

const namesLikelyMatch = (left = '', right = '') => {
  const normalizedLeft = normalizeNameToken(left)
  const normalizedRight = normalizeNameToken(right)
  if (!normalizedLeft || !normalizedRight) return false
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  )
}

const getCompetitorDisplayName = (game: AnyRecord, side: AnyRecord, index: number) => {
  if (game?.league === 'Tennis') {
    return side?.displayName || game.tennisContext?.players?.[index]?.label || side?.name || ''
  }
  return side?.name || ''
}

const getTennisNameVariants = (name = '') => {
  const normalized = normalizeNameToken(name)
  if (!normalized) return []
  const parts = normalized.split(' ').filter(Boolean)
  const variants = new Set([normalized])
  if (parts.length >= 2) {
    variants.add([...parts].reverse().join(' '))
    const familyName = parts[parts.length - 1]
    if (familyName.length >= 5) variants.add(familyName)
  }
  return [...variants].filter((entry) => entry.length >= 4)
}

const kalshiCandidateSearchText = (row: AnyRecord) =>
  normalizeNameToken([
    row.selection,
    row.title,
    row.boardTitle,
    row.eventTicker,
    row.marketTicker
  ].filter(Boolean).join(' '))

const kalshiCandidateMatchesName = (row: AnyRecord, playerName: string) => {
  const searchText = kalshiCandidateSearchText(row)
  const compactSearchText = searchText.replace(/\s+/g, '')
  return getTennisNameVariants(playerName).some((variant) => {
    const compactVariant = variant.replace(/\s+/g, '')
    return searchText.includes(variant) || compactSearchText.includes(compactVariant)
  })
}

const kalshiCandidateMatchesGame = (row: AnyRecord, game: AnyRecord) => {
  if (!row || !game || game.league !== 'Tennis') return false
  if (row.boardMatchId) return row.boardMatchId === game.id
  const occurrenceDate = row.occurrenceDatetime ? String(row.occurrenceDatetime).slice(0, 10) : ''
  const gameId = String(game.id || '')
  if (occurrenceDate && /\d{4}-\d{2}-\d{2}/.test(gameId) && !gameId.includes(occurrenceDate)) return false
  const playerNames = (game.matchup || [])
    .map((entry: AnyRecord, index: number) => getCompetitorDisplayName(game, entry, index))
    .filter(Boolean)
  if (playerNames.length < 2) return false
  return playerNames.every((playerName: string) => kalshiCandidateMatchesName(row, playerName))
}

const findKalshiTradeCandidateForGame = (game: AnyRecord) =>
  [...kalshiSpikeCandidateRows, ...kalshiTradeCandidateRows.map(mergeKalshiSpikeCandidate)]
    .find((row: AnyRecord) => kalshiCandidateMatchesGame(row, game))

const getGameWinnerLabel = (game: AnyRecord) =>
  String(game?.winnerTeam || game?.winnerName || game?.winner || game?.result?.winner || '').trim()

const getGameResultLine = (game: AnyRecord) => {
  const winnerLabel = getGameWinnerLabel(game)
  if (!winnerLabel) return ''
  const scoreline = String(game?.scoreline || game?.result?.scoreline || game?.tennisResult?.scoreline || '').trim()
  const status = String(game?.result?.status || game?.tennisResult?.status || '').trim()
  return `${winnerLabel} won${scoreline ? ` · ${scoreline}` : status ? ` · ${status}` : ''}`
}

const isWinningCompetitor = (game: AnyRecord, side: AnyRecord, index: number) => {
  const winnerLabel = getGameWinnerLabel(game)
  if (!winnerLabel) return false
  const competitorLabel = getCompetitorDisplayName(game, side, index)
  return namesLikelyMatch(competitorLabel, winnerLabel)
}

const getGameDisplayTitle = (game: AnyRecord) => {
  if (game?.league === 'Tennis') {
    const left = getCompetitorDisplayName(game, game.matchup?.[0], 0)
    const right = getCompetitorDisplayName(game, game.matchup?.[1], 1)
    return `${left} vs ${right}`
  }
  return game?.title || ''
}

const swingTextFor = (game: AnyRecord) => game?.swingFactor || game?.swing || 'No swing-factor note stored yet.'

const buildGameHighlights = (game: AnyRecord) => {
  const chips: Array<{ tone: string; label: string }> = []

  if (game.league === 'MLB' && game.analysis?.mlbProjection) {
    const projection = game.analysis.mlbProjection
    const selectedScript =
      projection.teamScripts?.find((script: AnyRecord) => script.teamName === game.analysis?.participant?.name) ??
      projection.teamScripts?.[0]
    const pressureLabel = selectedScript?.pressureLabel
    const bridgePressure = selectedScript?.bullpenOverview
    const bothLineupsPosted =
      game.lineupBoard?.status?.away === 'posted' && game.lineupBoard?.status?.home === 'posted'
    const partialLineups =
      !bothLineupsPosted &&
      (game.lineupBoard?.status?.away === 'partial' || game.lineupBoard?.status?.home === 'partial')

    if (projection.first5EdgeTeam && projection.first5EdgeTeam !== projection.edgeTeam) {
      chips.push({ tone: 'warning', label: `F5 ${projection.first5EdgeTeam}` })
    }
    if (projection.bridgeEdgeTeam && projection.bridgeEdgeTeam !== projection.edgeTeam) {
      chips.push({ tone: 'danger', label: `Late ${projection.bridgeEdgeTeam}` })
    }
    if (pressureLabel) {
      chips.push({
        tone: /traffic-only/i.test(pressureLabel) ? 'neutral' : 'accent',
        label: pressureLabel
      })
    }
    if (bridgePressure && !/no strong reliever-arsenal edge/i.test(bridgePressure)) {
      chips.push({ tone: 'warning', label: 'Bridge live' })
    }
    if (projection.totals?.fullGame?.chaosGate?.vetoed) {
      chips.push({
        tone: 'danger',
        label: 'Total chaos veto'
      })
    } else if (projection.totals?.fullGame?.lean && projection.totals.fullGame.lean !== 'Pass') {
      chips.push({
        tone: projection.totals.fullGame.lean === 'Over' ? 'warning' : 'neutral',
        label: projection.totals.fullGame.label
      })
    }
    if (projection.firstInning?.pick && projection.firstInning.pick !== 'Pass') {
      chips.push({
        tone: projection.firstInning.pick === 'YRFI' ? 'warning' : 'neutral',
        label: projection.firstInning.pick
      })
    }
    if ((game.analysis?.indicators?.reliefPitchingRisk ?? 0) >= 68) {
      chips.push({ tone: 'danger', label: 'Late risk' })
    }
    if ((game.analysis?.indicators?.coinflipPressure ?? 0) >= 64) {
      chips.push({ tone: 'danger', label: 'Flip live' })
    }
    const chaosAction = game.analysis?.indicators?.vetoLayer?.recommendedAction
    if (chaosAction === 'Hard pass') {
      chips.push({ tone: 'danger', label: 'Hard pass' })
    } else if (chaosAction === 'Pass') {
      chips.push({ tone: 'danger', label: 'Risk pass' })
    } else if (chaosAction === 'Eligible') {
      chips.push({ tone: 'accent', label: 'Risk clear' })
    }
    if ((game.analysis?.indicators?.researchOnlyVetoFlagCount ?? 0) > 0) {
      chips.push({
        tone: 'danger',
        label: `Veto ${(game.analysis?.indicators?.researchOnlyVetoFlagCount ?? 0)}x`
      })
    } else if (game.analysis?.indicators?.efficientFavoriteCandidateFlag) {
      chips.push({ tone: 'accent', label: 'Efficient favorite' })
    } else if (game.analysis?.indicators?.protectedMarketDogFlag) {
      chips.push({ tone: 'accent', label: 'Underdog value' })
    }
    if (bothLineupsPosted) chips.push({ tone: 'accent', label: 'Lineups in' })
    else if (partialLineups) chips.push({ tone: 'neutral', label: 'Lineups partial' })
    if (projection.weather?.label && /helps carry|suppresses carry/i.test(projection.weather.label)) {
      chips.push({
        tone: /helps carry/i.test(projection.weather.label) ? 'warning' : 'neutral',
        label: /helps carry/i.test(projection.weather.label) ? 'Weather up' : 'Weather down'
      })
    }
  } else if (game.league === 'Tennis' && game.tennisContext) {
    if (game.tennisContext.surface) chips.push({ tone: 'neutral', label: game.tennisContext.surface })
    if (game.tennisContext.h2hLeader === game.analysis?.participant?.name) chips.push({ tone: 'accent', label: 'H2H edge' })
    if (game.tennisContext.liveDog) chips.push({ tone: 'warning', label: 'Underdog live' })
    if (game.tennisContext.fatigueFlag) chips.push({ tone: 'danger', label: 'Fatigue live' })
    if (game.tennisContext.formEdgeName === game.analysis?.participant?.name) chips.push({ tone: 'accent', label: 'Form edge' })
    if (game.tennisContext.tradePlan?.laneLabel) {
      chips.push({
        tone:
          game.tennisContext.tradePlan.tone === 'danger'
            ? 'danger'
            : game.tennisContext.tradePlan.tone === 'warning'
              ? 'warning'
              : 'accent',
        label: game.tennisContext.tradePlan.laneLabel
      })
    }
    if ((game.analysis?.volatility ?? 0) >= 70) chips.push({ tone: 'danger', label: 'Volatile' })
  } else {
    if ((game.analysis?.confidence ?? 0) >= 72) chips.push({ tone: 'accent', label: 'High confidence' })
    if ((game.analysis?.volatility ?? 0) >= 68) chips.push({ tone: 'danger', label: 'High variance' })
  }

  return chips.slice(0, 4)
}

const buildBalancedRecommendationSet = (
  favoritePicks: AnyRecord[],
  flipPicks: AnyRecord[],
  legCount: number,
  rawWeight = 0.5
) => {
  const targetLegCount = clamp(Math.round(Number(legCount) || 0), 0, PARLAY_MAX_LEGS)
  const safeWeight = clamp(Number(rawWeight) || 0, 0, 1)

  if (!targetLegCount) {
    return {
      picks: [],
      targetFlipLegs: 0,
      actualFlipLegs: 0,
      averageFlipProbability: 0
    }
  }

  const uniqueFavoritePicks = favoritePicks.filter(
    (pick, index, list) => list.findIndex((entry) => entry.gameId === pick.gameId) === index
  )
  const uniqueFlipPicks = flipPicks.filter(
    (pick, index, list) => list.findIndex((entry) => entry.gameId === pick.gameId) === index
  )
  const flipSample = uniqueFlipPicks.slice(0, Math.min(targetLegCount * 2, uniqueFlipPicks.length))
  const averageFlipProbability = flipSample.length
    ? flipSample.reduce(
        (total, pick) => total + clamp(pick.flipProbability ?? (pick.flipScore ?? 55) / 100, 0.18, 0.82),
        0
      ) / flipSample.length
    : 0

  let targetFlipLegs = Math.round(targetLegCount * safeWeight * averageFlipProbability)

  if (safeWeight >= 0.38 && targetFlipLegs === 0 && uniqueFlipPicks.length && targetLegCount >= 3) {
    targetFlipLegs = 1
  }

  targetFlipLegs = clamp(targetFlipLegs, 0, Math.min(targetLegCount, uniqueFlipPicks.length))

  const picks: AnyRecord[] = []
  const gameIds = new Set<string>()

  uniqueFlipPicks.forEach((pick) => {
    if (picks.length >= targetFlipLegs || gameIds.has(pick.gameId)) return
    picks.push(pick)
    gameIds.add(pick.gameId)
  })

  uniqueFavoritePicks.forEach((pick) => {
    if (picks.length >= targetLegCount || gameIds.has(pick.gameId)) return
    picks.push(pick)
    gameIds.add(pick.gameId)
  })

  uniqueFlipPicks.forEach((pick) => {
    if (picks.length >= targetLegCount || gameIds.has(pick.gameId)) return
    picks.push(pick)
    gameIds.add(pick.gameId)
  })

  return {
    picks,
    targetFlipLegs,
    actualFlipLegs: picks.filter((pick) => pick.flipScore !== undefined).length,
    averageFlipProbability
  }
}

function App() {
  const publicStaticMode = isPublicStaticMode()
  const visibleDeskTabs = useMemo(
    () =>
      publicStaticMode
        ? deskTabs.filter((tab) => !['models', 'history', 'stories'].includes(tab.id))
        : deskTabs,
    [publicStaticMode]
  )
  const [activeDayId, setActiveDayId] = useState(defaultSlateDayId)
  const [activeDeskTab, setActiveDeskTab] = useState<DeskTabId>('board')
  const [isMobileBoardDetailOpen, setIsMobileBoardDetailOpen] = useState(false)
  const [activeHistoryId, setActiveHistoryId] = useState('')
  const [activeHistorySportTabId, setActiveHistorySportTabId] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTabId>('ticket')
  const [marketSearch, setMarketSearch] = useState('')
  const [builderCatalogTab, setBuilderCatalogTab] = useState<(typeof builderCatalogTabs)[number]['id']>('all')
  const [builderValidityFilter, setBuilderValidityFilter] = useState<(typeof builderValidityFilters)[number]['id']>('eligible')
  const [builderSort, setBuilderSort] = useState<(typeof builderSortOptions)[number]['id']>('confidence')
  const [activePropType, setActivePropType] = useState<(typeof propTypeFilters)[number]['id']>('all')
  const [builderLeagueFilter, setBuilderLeagueFilter] = useState<string>('all')
  const [parlayStake, setParlayStake] = useState(25)
  const [recommendedLegCount, setRecommendedLegCount] = useState(4)
  const [recommendationMode, setRecommendationMode] = useState<(typeof recommendationModes)[number]['id']>('favorites')
  const [balanceWeight, setBalanceWeight] = useState(0.5)
  const [pacificClock, setPacificClock] = useState(getPacificClock())
  const [selectedGameIdByDay, setSelectedGameIdByDay] = useState<Record<string, string>>({})
  const [selectedPicksByDay, setSelectedPicksByDay] = useState<Record<string, Record<string, string>>>({})
  const [selectedPropsByDay, setSelectedPropsByDay] = useState<Record<string, Record<string, AnyRecord>>>({})
  const [selectedTotalsByDay, setSelectedTotalsByDay] = useState<Record<string, Record<string, AnyRecord>>>({})
  const [slateManifest, setSlateManifest] = useState<SlateManifestEntry[]>(fallbackSlateDayManifest)
  const [loadedSlates, setLoadedSlates] = useState<Record<string, LoadedSlateDay>>({})
  const [globalSearchResults, setGlobalSearchResults] = useState<AnyRecord[]>([])
  const [isGlobalSearchLoading, setIsGlobalSearchLoading] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const mobileDetailHistoryRef = useRef(false)
  const mobileDetailHistoryTokenRef = useRef(0)
  const [loadedGameDetailsByDay, setLoadedGameDetailsByDay] = useState<Record<string, Record<string, AnyRecord>>>({})
  const [loadingGameDetailsByDay, setLoadingGameDetailsByDay] = useState<Record<string, Record<string, boolean>>>({})
  const [loadedPropBoardsByDay, setLoadedPropBoardsByDay] = useState<Record<string, AnyRecord | null>>({})
  const [loadedHomeRunBoardsByDay, setLoadedHomeRunBoardsByDay] = useState<Record<string, AnyRecord | null>>({})
  const [loadingSlateIds, setLoadingSlateIds] = useState<Record<string, boolean>>({})
  const [historyArchive, setHistoryArchive] = useState<HistoryEntry[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [modelHistory, setModelHistory] = useState<ModelHistoryEntry[]>([])
  const [modelHistoryLoaded, setModelHistoryLoaded] = useState(false)
  const [storyArchive, setStoryArchive] = useState<StoryArchiveIndexEntry[]>([])
  const [storiesLoaded, setStoriesLoaded] = useState(false)
  const [loadedStoryDaysById, setLoadedStoryDaysById] = useState<Record<string, StoryArchiveDaySummary | null>>({})
  const [loadingStoryDaysById, setLoadingStoryDaysById] = useState<Record<string, boolean>>({})
  const [loadedStoryGamesByDay, setLoadedStoryGamesByDay] = useState<Record<string, Record<number, StoryArchiveGame>>>({})
  const [loadingStoryGamesByDay, setLoadingStoryGamesByDay] = useState<Record<string, Record<number, boolean>>>({})
  const [activeStoryId, setActiveStoryId] = useState('')
  const [selectedStoryGamePk, setSelectedStoryGamePk] = useState<number | null>(null)

  const isMobileDetailViewport = () => window.matchMedia(MOBILE_DETAIL_MEDIA_QUERY).matches

  const closeMobileBoardDetail = () => {
    if (mobileDetailHistoryRef.current) {
      window.history.back()
      return
    }
    setIsMobileBoardDetailOpen(false)
  }

  useEffect(() => {
    if (!visibleDeskTabs.some((tab) => tab.id === activeDeskTab)) {
      setActiveDeskTab('board')
    }
  }, [activeDeskTab, visibleDeskTabs])

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as AnyRecord | null
      if (state?.[MOBILE_DETAIL_HISTORY_KEY]) {
        const dayId = String(state.dayId || '')
        const gameId = String(state.gameId || '')
        const filter = String(state.activeFilter || '')
        mobileDetailHistoryRef.current = true
        if (dayId) setActiveDayId(dayId)
        if (filter) setActiveFilter(filter)
        if (dayId && gameId) {
          setSelectedGameIdByDay((current) => ({ ...current, [dayId]: gameId }))
        }
        setActiveDeskTab('board')
        setIsMobileBoardDetailOpen(true)
        return
      }

      if (!mobileDetailHistoryRef.current) return
      mobileDetailHistoryRef.current = false
      setIsMobileBoardDetailOpen(false)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (activeDeskTab !== 'board') setIsMobileBoardDetailOpen(false)
  }, [activeDeskTab])
  const [mlbHistoryWindowByKey, setMlbHistoryWindowByKey] = useState<Record<string, 5 | 10>>({})
  const [activeValueScopeByDay, setActiveValueScopeByDay] = useState<Record<string, string>>({})

  useEffect(() => {
    const updateClock = () => setPacificClock(getPacificClock())
    updateClock()
    const timer = window.setInterval(updateClock, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTypingTarget =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        setIsSearchFocused(true)
        return
      }

      if (event.key === '/' && !isTypingTarget) {
        event.preventDefault()
        searchInputRef.current?.focus()
        setIsSearchFocused(true)
      }
    }

    window.addEventListener('keydown', handleSearchShortcut)
    return () => window.removeEventListener('keydown', handleSearchShortcut)
  }, [])

  useEffect(() => {
    let cancelled = false

    loadSlateManifestData()
      .then((manifest) => {
        if (cancelled || !manifest.length) return
        setSlateManifest(manifest)
        setActiveDayId((current) => {
          const latestManifestId = [...manifest].sort((left, right) => left.id.localeCompare(right.id)).at(-1)?.id || current
          if (!manifest.some((entry) => entry.id === current)) return latestManifestId
          if (current === defaultSlateDayId && latestManifestId > current) return latestManifestId
          return current
        })
      })
      .catch((error) => {
        console.error('Failed to load slate manifest', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const orderedSlateDays = useMemo(
    () => [...slateManifest].sort((left, right) => right.id.localeCompare(left.id)),
    [slateManifest]
  )

  const activeDayShell = useMemo(
    () => orderedSlateDays.find((day) => day.id === activeDayId) ?? orderedSlateDays[0],
    [activeDayId, orderedSlateDays]
  )

  const activeDay = activeDayShell ? loadedSlates[activeDayShell.id] ?? null : null
  const isActiveDayLoading = Boolean(activeDayShell?.id && loadingSlateIds[activeDayShell.id] && !activeDay)

  useEffect(() => {
    const slateId = activeDayShell?.id
    if (!slateId || loadedSlates[slateId] || loadingSlateIds[slateId]) return

    setLoadingSlateIds((current) => ({ ...current, [slateId]: true }))

    loadSlateDayData(slateId)
      .then((day) => {
        setLoadedSlates((current) => ({ ...current, [day.id]: day }))
      })
      .catch((error) => {
        console.error(`Failed to load slate ${slateId}`, error)
      })
      .finally(() => {
        setLoadingSlateIds((current) => ({ ...current, [slateId]: false }))
      })
  }, [activeDayShell?.id, loadedSlates, loadingSlateIds])

  useEffect(() => {
    if (historyLoaded || (activeDeskTab !== 'history' && activeDeskTab !== 'models')) return

    let cancelled = false
    loadHistoryArchiveData()
      .then((archive) => {
        if (cancelled) return
        setHistoryArchive(archive)
        setActiveHistoryId((current) => current || archive[0]?.id || '')
        setHistoryLoaded(true)
      })
      .catch((error) => {
        console.error('Failed to load history archive', error)
      })

    return () => {
      cancelled = true
    }
  }, [activeDeskTab, historyLoaded])

  useEffect(() => {
    if (modelHistoryLoaded || activeDeskTab !== 'models') return

    let cancelled = false
    loadModelHistoryData()
      .then((history) => {
        if (cancelled) return
        setModelHistory(history)
        setModelHistoryLoaded(true)
      })
      .catch((error) => {
        console.error('Failed to load model history', error)
        if (!cancelled) setModelHistoryLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [activeDeskTab, modelHistoryLoaded])

  useEffect(() => {
    const query = marketSearch.trim()
    setActiveSearchResultIndex(0)
    if (query.length < 2) {
      setGlobalSearchResults([])
      setIsGlobalSearchLoading(false)
      return
    }

    let cancelled = false
    setIsGlobalSearchLoading(true)
    const timer = window.setTimeout(() => {
      searchSlateGamesData(query, 80)
        .then((results) => {
          if (!cancelled) {
            setGlobalSearchResults(results as AnyRecord[])
            setActiveSearchResultIndex(0)
          }
        })
        .catch((error) => {
          console.error(`Failed to search slates for ${query}`, error)
          if (!cancelled) setGlobalSearchResults([])
        })
        .finally(() => {
          if (!cancelled) setIsGlobalSearchLoading(false)
        })
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [marketSearch])

  useEffect(() => {
    if (storiesLoaded || activeDeskTab !== 'stories') return

    let cancelled = false
    loadStoryArchiveIndexData()
      .then((archive) => {
        if (cancelled) return
        setStoryArchive(archive)
        setActiveStoryId((current) => current || archive[archive.length - 1]?.id || '')
        setStoriesLoaded(true)
      })
      .catch((error) => {
        console.error('Failed to load story archive', error)
      })

    return () => {
      cancelled = true
    }
  }, [activeDeskTab, storiesLoaded])

  useEffect(() => {
    if (!storiesLoaded || !activeStoryId || activeStoryId in loadedStoryDaysById || loadingStoryDaysById[activeStoryId]) return

    setLoadingStoryDaysById((current) => ({ ...current, [activeStoryId]: true }))
    loadStoryDayData(activeStoryId)
      .then((day) => {
        setLoadedStoryDaysById((current) => ({ ...current, [activeStoryId]: day }))
      })
      .catch((error) => {
        console.error(`Failed to load story day ${activeStoryId}`, error)
      })
      .finally(() => {
        setLoadingStoryDaysById((current) => ({ ...current, [activeStoryId]: false }))
      })
  }, [activeStoryId, storiesLoaded, loadedStoryDaysById, loadingStoryDaysById])

  const activeDayIndex = orderedSlateDays.findIndex((day) => day.id === activeDayShell?.id)
  const slateMeta = activeDay?.slateMeta ?? activeDayShell?.slateMeta ?? { date: 'Slate', isoDate: '' }
  const oddsMeta = activeDay?.oddsMeta ?? { snapshot: pacificClock.label }
  const games = activeDay?.games ?? []
  const baseFilterOptions = activeDay?.filters?.length ? activeDay.filters : ['All']
  const filterOptions = games.some((game: AnyRecord) => game.league === 'Tennis' || game.league === 'MLB') && !baseFilterOptions.includes('Value')
    ? [...baseFilterOptions, 'Value']
    : baseFilterOptions
  const activeDayIsoDate = activeDay?.slateMeta?.isoDate ?? activeDayShell?.id ?? ''

  useEffect(() => {
    if (!filterOptions.includes(activeFilter)) setActiveFilter('All')
  }, [activeFilter, filterOptions])

  useEffect(() => {
    document.title = `${slateMeta.date} Sports Desk`
  }, [slateMeta.date])

  const activeStoryDay = activeStoryId ? loadedStoryDaysById[activeStoryId] ?? null : null
  const activeStoryGameSummary =
    activeStoryDay?.games.find((game) => game.gamePk === selectedStoryGamePk) ?? activeStoryDay?.games[0] ?? null
  const activeStoryGame =
    (activeStoryId && activeStoryGameSummary
      ? loadedStoryGamesByDay[activeStoryId]?.[activeStoryGameSummary.gamePk] ?? null
      : null) || null
  const activeStoryTimeline = activeStoryGame?.timeline ?? []
  const activeStoryTimelineGroups = useMemo(() => buildStoryTimelineGroups(activeStoryTimeline), [activeStoryTimeline])

  useEffect(() => {
    if (!activeStoryDay?.games?.length) return
    const currentSelected = activeStoryDay.games.find((game) => game.gamePk === selectedStoryGamePk)
    if (!currentSelected) {
      setSelectedStoryGamePk(activeStoryDay.games[0]?.gamePk ?? null)
    }
  }, [activeStoryDay, selectedStoryGamePk])

  useEffect(() => {
    if (!activeStoryId || !activeStoryGameSummary) return
    if (loadedStoryGamesByDay[activeStoryId]?.[activeStoryGameSummary.gamePk]) return
    if (loadingStoryGamesByDay[activeStoryId]?.[activeStoryGameSummary.gamePk]) return

    setLoadingStoryGamesByDay((current) => ({
      ...current,
      [activeStoryId]: { ...(current[activeStoryId] || {}), [activeStoryGameSummary.gamePk]: true }
    }))

    loadStoryGameData(activeStoryId, activeStoryGameSummary.gamePk)
      .then((game) => {
        if (!game) return
        setLoadedStoryGamesByDay((current) => ({
          ...current,
          [activeStoryId]: { ...(current[activeStoryId] || {}), [activeStoryGameSummary.gamePk]: game }
        }))
      })
      .catch((error) => {
        console.error(`Failed to load story game ${activeStoryId}/${activeStoryGameSummary.gamePk}`, error)
      })
      .finally(() => {
        setLoadingStoryGamesByDay((current) => ({
          ...current,
          [activeStoryId]: { ...(current[activeStoryId] || {}), [activeStoryGameSummary.gamePk]: false }
        }))
      })
  }, [activeStoryDay, activeStoryGameSummary, activeStoryId, loadedStoryGamesByDay, loadingStoryGamesByDay])

  const visibleGames = useMemo(() => {
    if (activeFilter === 'Value') return []
    const search = marketSearch.trim().toLowerCase()
    return games.filter((game: AnyRecord) => {
      if (activeFilter !== 'All' && game.league !== activeFilter) return false
      if (!search) return true
      const haystack = [
        game.title,
        game.stage,
        game.summary,
        game.analysis?.participant?.name,
        ...(game.matchup ?? []).map((entry: AnyRecord) => entry?.name)
      ]
        .flat()
        .join(' ')
        .toLowerCase()
      return haystack.includes(search)
    })
  }, [activeFilter, games, marketSearch])

  useEffect(() => {
    const currentSelected = selectedGameIdByDay[activeDayId]
    const currentVisible = visibleGames.find((game: AnyRecord) => game.id === currentSelected)
    if (!currentVisible && visibleGames[0]) {
      setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: visibleGames[0].id }))
    }
  }, [activeDayId, selectedGameIdByDay, visibleGames])

  const selectedGameId = selectedGameIdByDay[activeDayId] ?? visibleGames[0]?.id ?? games[0]?.id ?? ''
  const selectedGameSummary =
    games.find((game: AnyRecord) => game.id === selectedGameId) ?? visibleGames[0] ?? games[0] ?? null

  const pushMobileBoardDetailHistory = (dayId: string, gameId: string, targetFilter = activeFilter) => {
    if (!dayId || !gameId || mobileDetailHistoryRef.current) return
    if (!isMobileDetailViewport()) return

    const baseState =
      window.history.state && typeof window.history.state === 'object'
        ? { ...(window.history.state as AnyRecord) }
        : {}
    delete baseState[MOBILE_DETAIL_HISTORY_KEY]
    delete baseState[MOBILE_DETAIL_HISTORY_TOKEN_KEY]

    mobileDetailHistoryTokenRef.current += 1
    window.history.pushState(
      {
        ...baseState,
        [MOBILE_DETAIL_HISTORY_KEY]: true,
        [MOBILE_DETAIL_HISTORY_TOKEN_KEY]: mobileDetailHistoryTokenRef.current,
        dayId,
        activeFilter: targetFilter,
        gameId
      },
      '',
      window.location.href
    )
    mobileDetailHistoryRef.current = true
  }

  const openMobileBoardDetail = (gameId = selectedGameId, dayId = activeDayId, targetFilter = activeFilter) => {
    pushMobileBoardDetailHistory(dayId, gameId, targetFilter)
    setIsMobileBoardDetailOpen(true)
  }

  useEffect(() => {
    if (!activeDayId || !selectedGameId || !selectedGameSummary) return
    if (selectedGameSummary.detailLevel === 'full') return
    if (loadedGameDetailsByDay[activeDayId]?.[selectedGameId]) return
    if (loadingGameDetailsByDay[activeDayId]?.[selectedGameId]) return

    setLoadingGameDetailsByDay((current) => ({
      ...current,
      [activeDayId]: { ...(current[activeDayId] || {}), [selectedGameId]: true }
    }))

    loadSlateGameDetailData(activeDayId, selectedGameId)
      .then((gameDetail) => {
        setLoadedGameDetailsByDay((current) => ({
          ...current,
          [activeDayId]: { ...(current[activeDayId] || {}), [selectedGameId]: gameDetail as AnyRecord }
        }))
      })
      .catch((error) => {
        console.error(`Failed to load game detail ${activeDayId}/${selectedGameId}`, error)
      })
      .finally(() => {
        setLoadingGameDetailsByDay((current) => ({
          ...current,
          [activeDayId]: { ...(current[activeDayId] || {}), [selectedGameId]: false }
        }))
      })
  }, [activeDayId, selectedGameId, selectedGameSummary, loadedGameDetailsByDay, loadingGameDetailsByDay])

  useEffect(() => {
    if (!activeDayId) return
    if (!games.some((game: AnyRecord) => game.league === 'MLB')) return
    if (loadedPropBoardsByDay[activeDayId] !== undefined) return

    loadMlbPropBoardData(activeDayId)
      .then((propsPayload) => {
        setLoadedPropBoardsByDay((current) => ({ ...current, [activeDayId]: propsPayload }))
      })
      .catch((error) => {
        console.error(`Failed to load MLB prop board for ${activeDayId}`, error)
        setLoadedPropBoardsByDay((current) => ({ ...current, [activeDayId]: null }))
      })
  }, [activeDayId, games, loadedPropBoardsByDay])

  useEffect(() => {
    if (!activeDayId) return
    if (!games.some((game: AnyRecord) => game.league === 'MLB')) return
    if (loadedHomeRunBoardsByDay[activeDayId] !== undefined) return

    loadMlbHomeRunBoardData(activeDayId)
      .then((homeRunPayload) => {
        setLoadedHomeRunBoardsByDay((current) => ({ ...current, [activeDayId]: homeRunPayload }))
      })
      .catch((error) => {
        console.error(`Failed to load MLB home-run board for ${activeDayId}`, error)
        setLoadedHomeRunBoardsByDay((current) => ({ ...current, [activeDayId]: null }))
      })
  }, [activeDayId, games, loadedHomeRunBoardsByDay])

  const activePropBoardByGame = useMemo(
    () => buildTrackedPropBoardByGame(loadedPropBoardsByDay[activeDayId] ?? null),
    [activeDayId, loadedPropBoardsByDay]
  )
  const activeHomeRunBoard = loadedHomeRunBoardsByDay[activeDayId] ?? null

  const selectedGameDetail = loadedGameDetailsByDay[activeDayId]?.[selectedGameId] ?? null
  const selectedGame =
    selectedGameSummary
      ? {
          ...selectedGameSummary,
          ...(selectedGameDetail || {}),
          playerProps:
            activePropBoardByGame[selectedGameId] ??
            selectedGameDetail?.playerProps ??
            selectedGameSummary.playerProps ??
            null
        }
      : null
  const isSelectedGameDetailLoading =
    Boolean(selectedGameSummary) &&
    selectedGameSummary?.detailLevel !== 'full' &&
    !selectedGameDetail &&
    Boolean(loadingGameDetailsByDay[activeDayId]?.[selectedGameId])
  const activeHistoryEntry = historyArchive.find((entry) => entry.id === activeHistoryId) ?? historyArchive[0] ?? null
  const activeHistoryPropSummary = activeHistoryEntry ? mlbPropPerformanceByDate[activeHistoryEntry.id] ?? null : null
  const activeHistorySportTabs = useMemo(
    () => (activeHistoryEntry?.sportTabs?.length ? activeHistoryEntry.sportTabs : buildFallbackHistorySportTabs(activeHistoryEntry)),
    [activeHistoryEntry]
  )
  const activeHistorySportTab =
    activeHistorySportTabs.find((tab) => tab.id === activeHistorySportTabId) ?? activeHistorySportTabs[0] ?? null
  const activeHistorySportSections = activeHistorySportTab?.sections ?? []
  const activeHistoryMetrics = useMemo(() => {
    if (!activeHistoryEntry) return []
    const metrics = [...activeHistoryEntry.metrics]
    if (activeHistoryPropSummary?.overall?.total) {
      metrics.push({
        label: 'Non-HR props',
        value: `${activeHistoryPropSummary.overall.hits}/${activeHistoryPropSummary.overall.total}`,
        note: `${formatPercent(activeHistoryPropSummary.overall.hitRate)} hit rate`,
        tone:
          activeHistoryPropSummary.overall.hitRate !== null && activeHistoryPropSummary.overall.hitRate >= 55
            ? 'positive'
            : activeHistoryPropSummary.overall.hitRate !== null && activeHistoryPropSummary.overall.hitRate >= 45
              ? 'warning'
              : 'negative'
      })
    }
    return metrics
  }, [activeHistoryEntry, activeHistoryPropSummary])
  const activeHistoryTrackedMarkets = useMemo(() => {
    if (!activeHistoryEntry) return []
    return activeHistoryPropSummary?.overall?.total && !activeHistoryEntry.trackedMarkets.includes('Player props')
      ? [...activeHistoryEntry.trackedMarkets, 'Player props']
      : activeHistoryEntry.trackedMarkets
  }, [activeHistoryEntry, activeHistoryPropSummary])

  useEffect(() => {
    if (!activeHistorySportTabs.length) {
      setActiveHistorySportTabId('')
      return
    }

    setActiveHistorySportTabId((current) => {
      if (current && activeHistorySportTabs.some((tab) => tab.id === current)) return current
      return activeHistorySportTabs[0]?.id ?? ''
    })
  }, [activeHistoryEntry?.id, activeHistorySportTabs])

  const gradedHistoryEntries = useMemo(
    () =>
      [...historyArchive]
        .filter(
          (entry): entry is HistoryEntry =>
            entry.status === 'graded' && Boolean(entry.performance)
        )
        .sort((left, right) => left.id.localeCompare(right.id)),
    [historyArchive]
  )

  const historyTrendPoints = useMemo(
    () =>
      gradedHistoryEntries.map((entry) => ({
        id: entry.id,
        label: entry.label.replace(', 2026', '').replace('May ', 'May '),
        fullGame: percentageFromRecord(entry.performance?.mlbFullGame),
        first5: percentageFromRecord(entry.performance?.mlbFirst5),
        firstInning: percentageFromRecord(entry.performance?.mlbFirstInning),
        hrBoard: entry.performance?.hrBoard
          ? (entry.performance.hrBoard.hits / entry.performance.hrBoard.total) * 100
          : null
        ,
        tennis: percentageFromRecord(entry.performance?.tennis),
        props: mlbPropPerformanceByDate[entry.id]?.overall.hitRate ?? null
      })),
    [gradedHistoryEntries]
  )

  const historyTrendSummary = useMemo(() => {
    const summarize = (values: Array<number | null>) => {
      const cleanValues = values.filter((value): value is number => Number.isFinite(Number(value)))
      if (!cleanValues.length) return null
      return cleanValues.reduce((total, value) => total + value, 0) / cleanValues.length
    }

    return {
      fullGame: summarize(historyTrendPoints.map((entry) => entry.fullGame)),
      first5: summarize(historyTrendPoints.map((entry) => entry.first5)),
      firstInning: summarize(historyTrendPoints.map((entry) => entry.firstInning)),
      hrBoard: summarize(historyTrendPoints.map((entry) => entry.hrBoard)),
      tennis: summarize(historyTrendPoints.map((entry) => entry.tennis)),
      props: summarize(historyTrendPoints.map((entry) => entry.props))
    }
  }, [historyTrendPoints])
  const latestHistoryTrendLabel = historyTrendPoints.at(-1)?.label ?? historyArchive[0]?.label ?? 'the latest graded day'
  const dailyHistoryTrendPoints = useMemo(() => [...historyTrendPoints].reverse(), [historyTrendPoints])

  const storyRailDays = useMemo(() => [...storyArchive].sort((left, right) => right.id.localeCompare(left.id)), [storyArchive])

  const activeStoryMetrics = useMemo(() => {
    if (!activeStoryDay) return []
    const games = Number(activeStoryDay.metrics.games || 0)
    const toneForRate = (count: number, high = 0.45, mid = 0.25) => {
      if (!games) return 'info'
      const rate = count / games
      if (rate >= high) return 'warning'
      if (rate >= mid) return 'positive'
      return 'info'
    }

    return [
      {
        label: 'First-inning jolts',
        value: String(activeStoryDay.metrics.firstInningJolts || 0),
        note: games ? `${formatPercent(((activeStoryDay.metrics.firstInningJolts || 0) / games) * 100, 0)} of games scored in the 1st` : '',
        tone: toneForRate(activeStoryDay.metrics.firstInningJolts || 0, 0.35, 0.15)
      },
      {
        label: 'Quiet first 5',
        value: String(activeStoryDay.metrics.quietFirst5 || 0),
        note: games ? `${formatPercent(((activeStoryDay.metrics.quietFirst5 || 0) / games) * 100, 0)} stayed muted through five` : '',
        tone: toneForRate(activeStoryDay.metrics.quietFirst5 || 0, 0.45, 0.25)
      },
      {
        label: 'Bullpen flips',
        value: String(activeStoryDay.metrics.bullpenFlips || 0),
        note: games ? `${formatPercent(((activeStoryDay.metrics.bullpenFlips || 0) / games) * 100, 0)} changed after the starter window` : '',
        tone: toneForRate(activeStoryDay.metrics.bullpenFlips || 0, 0.25, 0.1)
      },
      {
        label: 'Comeback wins',
        value: String(activeStoryDay.metrics.comebackWins || 0),
        note: games ? `${formatPercent(((activeStoryDay.metrics.comebackWins || 0) / games) * 100, 0)} required a comeback` : '',
        tone: toneForRate(activeStoryDay.metrics.comebackWins || 0, 0.35, 0.15)
      },
      {
        label: 'Runs: first 5 / final',
        value: `${activeStoryDay.metrics.totalRunsFirst5 || 0} / ${activeStoryDay.metrics.totalRunsFinal || 0}`,
        note: 'Quick read on early suppression vs full-game release',
        tone: 'positive'
      },
      {
        label: 'Captured events',
        value: `${activeStoryDay.metrics.plateAppearances || 0} PA`,
        note: `${activeStoryDay.metrics.pitchEvents || 0} pitch events warehoused`,
        tone: 'info'
      }
    ]
  }, [activeStoryDay])

  useEffect(() => {
    if (!activeStoryDay?.games?.length) return
    setSelectedStoryGamePk((current) => {
      if (current && activeStoryDay.games.some((game) => game.gamePk === current)) return current
      return activeStoryDay.games[0]?.gamePk ?? null
    })
  }, [activeStoryDay?.id, activeStoryDay?.games])

  const trendChartWidth = 760
  const trendChartHeight = 220
  const trendChartPadding = 24
  const fullGameTrendSegments = buildTrendSegments(
    historyTrendPoints.map((entry) => entry.fullGame),
    trendChartWidth,
    trendChartHeight,
    trendChartPadding
  )
  const first5TrendSegments = buildTrendSegments(
    historyTrendPoints.map((entry) => entry.first5),
    trendChartWidth,
    trendChartHeight,
    trendChartPadding
  )
  const firstInningTrendSegments = buildTrendSegments(
    historyTrendPoints.map((entry) => entry.firstInning),
    trendChartWidth,
    trendChartHeight,
    trendChartPadding
  )
  const hrTrendSegments = buildTrendSegments(
    historyTrendPoints.map((entry) => entry.hrBoard),
    trendChartWidth,
    trendChartHeight,
    trendChartPadding
  )
  const tennisTrendSegments = buildTrendSegments(
    historyTrendPoints.map((entry) => entry.tennis),
    trendChartWidth,
    trendChartHeight,
    trendChartPadding
  )
  const propTrendSegments = buildTrendSegments(
    historyTrendPoints.map((entry) => entry.props),
    trendChartWidth,
    trendChartHeight,
    trendChartPadding
  )

  const selectedPicks = selectedPicksByDay[activeDayId] ?? {}
  const selectedProps = selectedPropsByDay[activeDayId] ?? {}
  const selectedTotals = selectedTotalsByDay[activeDayId] ?? {}

  const lineupStatusCounts = useMemo(() => {
    return games
      .filter((game: AnyRecord) => game.league === 'MLB' && game.lineupBoard?.status)
      .reduce(
        (totals: AnyRecord, game: AnyRecord) => {
          totals.total += 2
          const awayStatus = game.lineupBoard?.status?.away
          const homeStatus = game.lineupBoard?.status?.home
          if (awayStatus === 'posted') totals.posted += 1
          else if (awayStatus === 'partial') totals.partial += 1
          if (homeStatus === 'posted') totals.posted += 1
          else if (homeStatus === 'partial') totals.partial += 1
          return totals
        },
        { posted: 0, partial: 0, total: 0 }
      )
  }, [games])

  const latestLineupSnapshot = useMemo(
    () =>
      games
        .map((game: AnyRecord) => game.lineupBoard?.snapshot)
        .filter(Boolean)
        .sort()
        .at(-1) ?? '',
    [games]
  )

  const eligibleMoneylineGames = useMemo(
    () =>
      games.filter(
        (game: AnyRecord) =>
          game.moneyline?.available && !getEventState(game, activeDayIsoDate, pacificClock).invalid
      ),
    [activeDayIsoDate, games, pacificClock]
  )

  const efficientFavoritePicks = useMemo(() => rankEfficientFavoritePicks(games), [games])
  const flipRiskPicks = useMemo(() => rankFlipRiskPicks(games), [games])
  const mlbPlayerProps = useMemo(() => {
    const fromApi = Object.values(activePropBoardByGame).flatMap((board: AnyRecord) => board?.targets ?? [])
    if (fromApi.length) {
      return [...fromApi]
        .sort((left, right) => {
          if ((right.confidence ?? 0) !== (left.confidence ?? 0)) return (right.confidence ?? 0) - (left.confidence ?? 0)
          return (right.expectedValue ?? 0) - (left.expectedValue ?? 0)
        })
        .map((prop: AnyRecord, index: number) => {
          const matchedGame =
            games.find((game: AnyRecord) => game.id === prop.gameId) ??
            ({ id: prop.gameId, league: 'MLB', start: prop.start, stage: prop.stage, startMinutes: 0 } as AnyRecord)

          return {
            ...prop,
            rank: index + 1,
            league: prop.league || matchedGame.league || 'MLB',
            game: matchedGame
          }
        })
    }
    return rankMlbPlayerProps(games)
  }, [activePropBoardByGame, games])

  const favoriteRecommendationPool = useMemo(
    () => efficientFavoritePicks.filter((pick: AnyRecord) => pick.game?.moneyline?.available),
    [efficientFavoritePicks]
  )

  const scopedFavoriteRecommendationPool = useMemo(
    () =>
      favoriteRecommendationPool.filter(
        (pick: AnyRecord) => builderLeagueFilter === 'all' || pick.league === builderLeagueFilter
      ),
    [builderLeagueFilter, favoriteRecommendationPool]
  )

  const scopedFlipRiskPicks = useMemo(
    () => flipRiskPicks.filter((pick: AnyRecord) => builderLeagueFilter === 'all' || pick.league === builderLeagueFilter),
    [builderLeagueFilter, flipRiskPicks]
  )

  const filteredMoneylineGames = useMemo(
    () => scopedFavoriteRecommendationPool.filter((pick: AnyRecord) => !getEventState(pick.game, activeDayIsoDate, pacificClock).invalid),
    [activeDayIsoDate, pacificClock, scopedFavoriteRecommendationPool]
  )

  const favoriteCatalogEntries = useMemo(
    () =>
      favoriteRecommendationPool.map((pick: AnyRecord) => {
        const eventState = getEventState(pick.game, activeDayIsoDate, pacificClock)
        const marketPricePct = impliedPctFromParticipant(pick.participant)
        const payoffLabel = payoffTag(marketPricePct)
        return {
          id: `favorite:${pick.gameId}:${pick.participantId}`,
          category: 'favorites',
          actionKind: 'ticket',
          gameId: pick.gameId,
          league: pick.league,
          start: pick.start,
          startMinutes: Number(pick.game?.startMinutes) || 0,
          stage: pick.stage,
          title: `${pick.participant.name} moneyline`,
          subtitle: pick.gameTitle,
          confidence: pick.confidence,
          sortConfidence: pick.confidence,
          sortEdge: Math.abs(Number(pick.modelEdge) || 0),
          marketPricePct,
          payoffAction: Number.isFinite(Number(marketPricePct)) && Number(pick.confidence) - Number(marketPricePct) >= 7 ? 'Playable edge' : payoffLabel,
          priceLabel: pick.participant?.americanLabel ?? 'Model only',
          metaLabel: payoffLabel ? `${pick.marketProbabilityLabel} · ${payoffLabel}` : pick.marketProbabilityLabel,
          summary: pick.rationale,
          tags: [`${pick.confidence}% confidence`, confidenceTag(Number(pick.confidence) || 0), payoffLabel, pick.tier, ...buildGameHighlights(pick.game).map((chip) => chip.label)].filter(Boolean).slice(0, 4),
          invalid: eventState.invalid,
          statusLabel: eventState.label,
          tone: eventState.tone,
          selected: selectedPicks[pick.gameId] === pick.participantId,
          raw: pick
        }
      }),
    [activeDayIsoDate, favoriteRecommendationPool, pacificClock, selectedPicks]
  )

  const flipCatalogEntries = useMemo(
    () =>
      flipRiskPicks.map((pick: AnyRecord) => {
        const eventState = getEventState(pick.game, activeDayIsoDate, pacificClock)
        return {
          id: `flip:${pick.gameId}:${pick.participantId}`,
          category: 'flips',
          actionKind: 'ticket',
          gameId: pick.gameId,
          league: pick.league,
          start: pick.start,
          startMinutes: Number(pick.game?.startMinutes) || 0,
          stage: pick.stage,
          title: `${pick.participant.name} upset lane`,
          subtitle: pick.gameTitle,
          confidence: pick.flipScore,
          sortConfidence: pick.flipScore,
          sortEdge: Math.abs(Number(pick.flipProbability) || 0),
          priceLabel: pick.participant?.americanLabel ?? 'Underdog look',
          metaLabel: pick.marketProbabilityLabel,
          summary: pick.flipReason,
          tags: [`${pick.flipScore}% confidence`, confidenceTag(Number(pick.flipScore) || 0), pick.tier, ...buildGameHighlights(pick.game).map((chip) => chip.label)].slice(0, 4),
          invalid: eventState.invalid,
          statusLabel: eventState.label,
          tone: eventState.tone,
          selected: selectedPicks[pick.gameId] === pick.participantId,
          raw: pick
        }
      }),
    [activeDayIsoDate, flipRiskPicks, pacificClock, selectedPicks]
  )

  const totalCatalogEntries = useMemo(
    () =>
      games
        .filter((game: AnyRecord) => game.league === 'MLB' && game.analysis?.mlbProjection?.totals)
        .flatMap((game: AnyRecord) => {
          const totals = game.analysis.mlbProjection.totals
          const eventState = getEventState(game, activeDayIsoDate, pacificClock)
          const phases = [
            {
              id: 'full',
              label: 'Full game',
              lean: totals.fullGame,
              projectedRuns: totals.projectedFullTotalRuns,
              line: game.analysis.mlbProjection.postedTotal,
              projectedLabel: `Proj ${totals.projectedFullTotalRuns} vs ${game.analysis.mlbProjection.postedTotal ?? 'N/A'}`
            },
            {
              id: 'first5',
              label: 'First 5',
              lean: totals.first5,
              projectedRuns: totals.projectedFirst5TotalRuns,
              line: totals.derivedFirst5TotalLine,
              projectedLabel: `Proj ${totals.projectedFirst5TotalRuns} vs ${totals.derivedFirst5TotalLine ?? 'N/A'}`
            },
            {
              id: 'late',
              label: 'Rest of game',
              lean: totals.late,
              projectedRuns: totals.projectedLateTotalRuns,
              line: totals.derivedLateTotalLine,
              projectedLabel: `Proj ${totals.projectedLateTotalRuns} vs ${totals.derivedLateTotalLine ?? 'N/A'}`
            }
          ]

          return phases
            .filter((phase) => phase.lean?.lean && phase.lean.lean !== 'Pass')
            .map((phase) => {
              const savedId = `${game.id}:total:${phase.id}`
              const modelPct = buildTotalProbabilityPct(phase.projectedRuns, phase.line, phase.lean.lean)
              const confidence = Number.isFinite(Number(modelPct)) ? Math.round(Number(modelPct)) : 0

              return {
                id: savedId,
                category: 'totals',
                actionKind: 'total',
                gameId: game.id,
                league: game.league,
                start: game.start,
                startMinutes: Number(game.startMinutes) || 0,
                stage: game.stage,
                title: phase.lean.label,
                subtitle: `${game.title} · ${phase.label}`,
                confidence,
                sortConfidence: confidence,
                sortEdge: Math.abs(Number(phase.lean.edge) || 0),
                priceLabel: phase.projectedLabel,
                metaLabel: phase.lean.strength,
                summary: phase.lean.summary,
                tags: [
                  phase.label,
                  phase.lean.chaosGate?.warning ? 'Chaos checked' : null,
                  totals.bullpenExhaustionNote ? 'Bullpen live' : 'Model total'
                ].filter(Boolean).slice(0, 3),
                invalid: eventState.invalid,
                statusLabel: eventState.label,
                tone: eventState.tone,
                selected: Boolean(selectedTotals[savedId]),
                raw: {
                  id: savedId,
                  gameId: game.id,
                  gameTitle: game.title,
                  league: game.league,
                  phaseId: phase.id,
                  marketLabel: phase.lean.label,
                  phaseLabel: phase.label,
                  modelPct,
                  projectedRuns: phase.projectedRuns,
                  line: phase.line,
                  summary: phase.lean.summary,
                  strength: phase.lean.strength,
                  chaosGate: phase.lean.chaosGate ?? null,
                  projectedLabel: phase.projectedLabel
                }
              }
            })
        }),
    [activeDayIsoDate, games, pacificClock, selectedTotals]
  )

  const derivativeCatalogEntries = useMemo(
    () => {
      const publishedValueRows = (activeDay as AnyRecord | null)?.tennisValueSummary
        ? [
            ...(((activeDay as AnyRecord).tennisValueSummary.betGradeRows || []) as AnyRecord[]),
            ...(((activeDay as AnyRecord).tennisValueSummary.thinRows || []) as AnyRecord[])
          ]
        : []
      const publishedEntries = publishedValueRows
        .map((row: AnyRecord) => {
          const game = games.find((entry: AnyRecord) => entry.id === row.gameId)
          if (!game) return null
          const eventState = getEventState(game, activeDayIsoDate, pacificClock)
          const confidence = Number.isFinite(Number(row.confidence)) ? Number(row.confidence) : game.analysis?.confidence ?? 50
          const evPer100 = Number.isFinite(Number(row.evPer100)) ? Number(row.evPer100) : null
          const edgePct = Number.isFinite(Number(row.edgePct)) ? Number(row.edgePct) : null
          const valueGrade = row.valueGrade || null
          const marketLabel = row.marketType || row.label || 'Market'
          const valueLabel = [
            row.selection || row.label || 'Selection',
            Number.isFinite(Number(row.line)) ? row.line : null,
            Number.isFinite(Number(row.americanOdds)) ? formatAmericanOdds(row.americanOdds) : null
          ].filter(Boolean).join(' ')
          const valueMeta = [
            valueGrade,
            edgePct != null ? `edge ${formatSignedNumber(edgePct, 1)} pts` : null,
            evPer100 != null ? `EV ${formatSignedNumber(evPer100, 1)}/100` : null
          ].filter(Boolean).join(' · ')
          return {
            id: `${game.id}:published-value:${marketLabel}:${valueLabel}`,
            category: 'derivatives',
            actionKind: 'total',
            gameId: game.id,
            league: game.league,
            start: game.start,
            startMinutes: Number(game.startMinutes) || 0,
            stage: game.stage,
            title: `${marketLabel} · ${row.selection || 'Value'}`,
            subtitle: game.title,
            confidence,
            sortConfidence: confidence,
            sortEdge: evPer100 ?? Math.abs(edgePct ?? confidence - 50),
            payoffAction: valueGrade,
            valueGrade,
            evPer100,
            edgePct,
            priceLabel: valueLabel || 'Published value row',
            metaLabel: valueMeta || 'Published value row',
            summary: row.reason || 'Published tennis value row from the May 28 EV pass.',
            tags: [`${confidence}% confidence`, confidenceTag(confidence), valueGrade, evPer100 != null ? `EV ${formatSignedNumber(evPer100, 1)}` : null, marketLabel].filter(Boolean).slice(0, 4),
            invalid: eventState.invalid,
            statusLabel: eventState.label,
            tone: eventState.invalid ? eventState.tone : tennisValueTone(valueGrade) || eventState.tone,
            selected: Boolean(selectedTotals[`${game.id}:published-value:${marketLabel}:${valueLabel}`]),
            raw: {
              id: `${game.id}:published-value:${marketLabel}:${valueLabel}`,
              gameId: game.id,
              gameTitle: game.title,
              league: game.league,
              marketLabel: `${marketLabel}: ${row.selection || 'Value'}`,
              phaseLabel: 'Derivative',
              summary: row.reason || 'Published tennis value row from the May 28 EV pass.',
              strength: `${confidence}% confidence`,
              projectedLabel: valueLabel,
              confidence,
              valueGrade,
              evPer100,
              edgePct
            }
          }
        })
        .filter(Boolean) as AnyRecord[]

      const detailedEntries = games.flatMap((game: AnyRecord) => {
        const derivativeMarkets = game.tennisContext?.derivativeMarkets
        if (!Array.isArray(derivativeMarkets) || !derivativeMarkets.length) return []
        const eventState = getEventState(game, activeDayIsoDate, pacificClock)
        return derivativeMarkets.map((market: AnyRecord) => {
          const savedId = `${game.id}:derivative:${String(market.label || 'market').toLowerCase().replace(/[^a-z0-9]+/g, '-')}:${String(market.value || market.lean || 'read').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
          const confidence = Number.isFinite(Number(market.confidence)) ? Number(market.confidence) : game.analysis?.confidence ?? 50
          const marketEconomics = market.label === 'ML' ? game.tennisContext?.marketEconomics : null
          const payoffLabel = payoffTag(marketEconomics?.deskPricePct)
          const evPer100 = Number.isFinite(Number(market.evPer100)) ? Number(market.evPer100) : null
          const edgePct = Number.isFinite(Number(market.edgePct)) ? Number(market.edgePct) : null
          const valueGrade = market.valueGrade || market.payoffAction || null
          const edgeScore =
            evPer100 != null
              ? evPer100
              : market.label === 'ML'
                ? Math.abs(Number(game.tennisContext?.marketEconomics?.deskEdgePct) || 0)
                : Math.abs(confidence - 50)
          const valueMeta = [
            valueGrade,
            edgePct != null ? `edge ${formatSignedNumber(edgePct, 1)} pts` : null,
            evPer100 != null ? `EV ${formatSignedNumber(evPer100, 1)}/100` : null
          ].filter(Boolean).join(' · ')
          return {
            id: savedId,
            category: 'derivatives',
            actionKind: 'total',
            gameId: game.id,
            league: game.league,
            start: game.start,
            startMinutes: Number(game.startMinutes) || 0,
            stage: game.stage,
            title: `${market.label} · ${market.lean}`,
            subtitle: game.title,
            confidence,
            sortConfidence: confidence,
            sortEdge: edgeScore,
            marketPricePct: marketEconomics?.deskPricePct ?? null,
            payoffAction: valueGrade || marketEconomics?.priceAction || null,
            valueGrade,
            evPer100,
            edgePct,
            priceLabel: payoffLabel ? `${market.value} · ${payoffLabel}` : market.value,
            metaLabel: valueMeta || (game.tennisContext?.projection?.totalGames
              ? `Projected games ${game.tennisContext.projection.totalGames}`
              : marketEconomics?.priceAction ?? 'Derivative read'),
            summary: market.reason,
            tags: [`${confidence}% confidence`, confidenceTag(confidence), valueGrade, evPer100 != null ? `EV ${formatSignedNumber(evPer100, 1)}` : null, market.label, market.lean, game.analysis?.tier].filter(Boolean).slice(0, 4),
            invalid: eventState.invalid,
            statusLabel: eventState.label,
            tone: eventState.invalid ? eventState.tone : tennisValueTone(valueGrade) || eventState.tone,
            selected: Boolean(selectedTotals[savedId]),
            raw: {
              id: savedId,
              gameId: game.id,
              gameTitle: game.title,
              league: game.league,
              marketLabel: `${market.label}: ${market.lean}`,
              phaseLabel: 'Derivative',
              summary: market.reason,
              strength: `${confidence}% confidence`,
              projectedLabel: market.value,
              confidence,
              valueGrade,
              evPer100,
              edgePct
            }
          }
        })
      })

      const publishedIds = new Set(publishedEntries.map((entry) => entry.id))
      return [...publishedEntries, ...detailedEntries.filter((entry: AnyRecord) => !publishedIds.has(entry.id))]
    },
    [activeDay, activeDayIsoDate, games, pacificClock, selectedTotals]
  )

  const propCatalogEntries = useMemo(
    () =>
      mlbPlayerProps.map((prop: AnyRecord) => {
        const eventState = getEventState(prop.game, activeDayIsoDate, pacificClock)
        return {
          id: prop.id,
          category: 'props',
          actionKind: 'prop',
          gameId: prop.gameId,
          league: prop.league,
          start: prop.game?.start ?? prop.start ?? '',
          startMinutes: Number(prop.game?.startMinutes) || 0,
          stage: prop.game?.stage ?? '',
          title: `${prop.playerName} ${prop.marketLabel}`,
          subtitle: prop.gameTitle,
          confidence: prop.confidence,
          sortConfidence: prop.confidence,
          sortEdge: Number(prop.expectedValue) || Number(prop.probability) || 0,
          priceLabel: prop.statValueLabel,
          metaLabel: `${prop.probability}% model`,
          summary: prop.reason || prop.matchupNote,
          tags: [prop.recommendationTier, prop.propLabel, prop.shadowSupportTag, prop.lineupStatus].filter(Boolean).slice(0, 4),
          invalid: eventState.invalid,
          statusLabel: eventState.label,
          tone: eventState.tone,
          selected: Boolean(selectedProps[prop.id]),
          raw: prop
        }
      }),
    [activeDayIsoDate, mlbPlayerProps, pacificClock, selectedProps]
  )

  const allBuilderEntries = useMemo(
    () => [...favoriteCatalogEntries, ...totalCatalogEntries, ...derivativeCatalogEntries, ...propCatalogEntries, ...flipCatalogEntries],
    [derivativeCatalogEntries, favoriteCatalogEntries, totalCatalogEntries, propCatalogEntries, flipCatalogEntries]
  )

  const builderLeagueFilters = useMemo(() => {
    const availableLeagues = new Set(allBuilderEntries.map((entry) => entry.league).filter(Boolean))
    return [
      { id: 'all', label: 'All sports' },
      ...builderLeagueOrder.filter((league) => availableLeagues.has(league)).map((league) => ({ id: league, label: league }))
    ]
  }, [allBuilderEntries])

  const builderCatalogEntries = useMemo(() => {
    const allEntries = allBuilderEntries
    return allEntries
      .filter((entry) => {
        if (builderCatalogTab === 'highConfidence') {
          if (Number(entry.sortConfidence) < 72) return false
        } else if (builderCatalogTab === 'payoff') {
          if (!payoffIsPlayable(entry)) return false
        } else if (builderCatalogTab !== 'all' && entry.category !== builderCatalogTab) {
          return false
        }
        if (builderLeagueFilter !== 'all' && entry.league !== builderLeagueFilter) return false
        if (entry.category === 'props' && activePropType !== 'all' && entry.raw?.propType !== activePropType) return false
        if (builderValidityFilter === 'eligible') return !entry.invalid
        if (builderValidityFilter === 'invalid') return entry.invalid
        return true
      })
      .sort((left, right) => {
        if (builderValidityFilter === 'all' && left.invalid !== right.invalid) return left.invalid ? 1 : -1
        if (builderSort === 'time') {
          if (left.startMinutes !== right.startMinutes) return left.startMinutes - right.startMinutes
          return right.sortConfidence - left.sortConfidence
        }
        if (builderSort === 'edge') {
          if (right.sortEdge !== left.sortEdge) return right.sortEdge - left.sortEdge
          return right.sortConfidence - left.sortConfidence
        }
        if (right.sortConfidence !== left.sortConfidence) return right.sortConfidence - left.sortConfidence
        return left.startMinutes - right.startMinutes
      })
  }, [
    activePropType,
    allBuilderEntries,
    builderCatalogTab,
    builderLeagueFilter,
    builderSort,
    builderValidityFilter
  ])

  const activeKalshiTradeRows = useMemo(() => {
    const mergedRowsByKey = new Map<string, AnyRecord>()
    ;[...kalshiTradeCandidateRows, ...kalshiSpikeCandidateRows].forEach((row: AnyRecord) => {
      const key = kalshiTradeCandidateKey(row)
      if (!key) return
      const existing = mergedRowsByKey.get(key) || {}
      mergedRowsByKey.set(key, { ...existing, ...row })
    })
    return [...mergedRowsByKey.values()]
      .map((row: AnyRecord) => {
        const game = games.find((entry: AnyRecord) => kalshiCandidateMatchesGame(row, entry)) || null
        const occurrenceDate = row.occurrenceDatetime ? String(row.occurrenceDatetime).slice(0, 10) : ''
        const sameFavoriteHistory = Array.isArray(row.kalshiPriceHistory?.sameFavorite) ? row.kalshiPriceHistory.sameFavorite : []
        const similarEntryCount = Number(row.kalshiPriceHistory?.similarEntry?.n || 0)
        return {
          ...row,
          game,
          gameTitle: game?.title || row.boardTitle || row.title,
          occurrenceDate,
          effectiveTier: row.spikeModelTier || row.candidateTier || 'watch',
          sameFavoriteHistoryCount: sameFavoriteHistory.length,
          similarEntryHistoryCount: similarEntryCount,
          hasKalshiHistory: sameFavoriteHistory.length > 0 || similarEntryCount > 0
        }
      })
      .filter((row: AnyRecord) => row.game && (!activeDayIsoDate || !row.occurrenceDate || row.occurrenceDate === activeDayIsoDate))
      .sort((left: AnyRecord, right: AnyRecord) =>
        Number(right.spikeModelEvPctOfEntry25x ?? right.tradeEvPctOfEntry ?? -9) -
        Number(left.spikeModelEvPctOfEntry25x ?? left.tradeEvPctOfEntry ?? -9)
      )
  }, [activeDayIsoDate, games])

  const tennisValueSummary = useMemo(() => {
    const tennisGames = games.filter((game: AnyRecord) => game.league === 'Tennis')
    if (!tennisGames.length) return null
    const publishedValueSummary = (activeDay as AnyRecord | null)?.tennisValueSummary
    if (publishedValueSummary) {
      const summary = publishedValueSummary as AnyRecord
      const attachGame = (row: AnyRecord) => ({
        ...row,
        game: games.find((game: AnyRecord) => game.id === row.gameId) ?? null,
        validity: tennisValueValidity(row)
      })
      const rawRows = (summary.rows || []).map(attachGame).filter((row: AnyRecord) => row.game)
      const rawBetGradeRows = (summary.betGradeRows || []).map(attachGame).filter((row: AnyRecord) => row.game)
      const validatedRows = rawBetGradeRows.filter((row: AnyRecord) => row.validity?.valid)
      const attachSummaryRows = (rows: AnyRecord[] = []) => rows.map(attachGame).filter((row: AnyRecord) => row.game)
      return {
        ...summary,
        rows: rawRows,
        betGradeRows: rawBetGradeRows,
        validatedRows,
        modelPickRows: attachSummaryRows(summary.modelPickRows || []).slice(0, 8),
        mlRows: attachSummaryRows(summary.mlRows || []).slice(0, 8),
        matchTotalRows: attachSummaryRows(summary.matchTotalRows || []).slice(0, 8),
        firstSetRows: attachSummaryRows(summary.firstSetRows || []).slice(0, 8),
        spreadRows: attachSummaryRows(summary.spreadRows || []).slice(0, 8),
        setWinRows: attachSummaryRows(summary.setWinRows || []).slice(0, 8),
        kalshiTradeRows: activeKalshiTradeRows,
        kalshiTradeCandidates: activeKalshiTradeRows.filter((row: AnyRecord) => row.effectiveTier === 'trade'),
        kalshiWatchRows: activeKalshiTradeRows.filter((row: AnyRecord) => row.effectiveTier === 'watch'),
        kalshiPassRows: activeKalshiTradeRows.filter((row: AnyRecord) => row.effectiveTier === 'pass'),
        kalshiNoHistoryRows: activeKalshiTradeRows.filter((row: AnyRecord) => !row.hasKalshiHistory),
        rawPositiveRows: (summary.rawPositiveRows || []).map(attachGame).filter((row: AnyRecord) => row.game),
        thinRows: (summary.thinRows || []).map(attachGame).filter((row: AnyRecord) => row.game),
        negativeMlRows: (summary.negativeMlRows || []).map(attachGame).filter((row: AnyRecord) => row.game)
      }
    }
    const rows = tennisGames.flatMap((game: AnyRecord) =>
      (game.tennisContext?.derivativeMarkets || []).map((market: AnyRecord) => ({
        ...market,
        game,
        gameTitle: game.title,
        start: game.start,
        marketType: market.marketType || market.label,
        valueGrade: market.valueGrade || 'No grade',
        evPer100: Number.isFinite(Number(market.evPer100)) ? Number(market.evPer100) : null,
        edgePct: Number.isFinite(Number(market.edgePct)) ? Number(market.edgePct) : null,
        confidence: Number.isFinite(Number(market.confidence)) ? Number(market.confidence) : game.analysis?.confidence ?? 50
      }))
    )
    if (!rows.length) return null

    const marketKey = (row: AnyRecord) => String(row.marketType || row.label || '').toLowerCase()
    const boardRank = (row: AnyRecord) => {
      const ev = Number(row.evPer100)
      return (row.betGrade ? 1000 : 0) + (Number.isFinite(ev) ? 300 + ev : Number(row.confidence || row.modelPct || 0))
    }
    const sortByBoardRank = (left: AnyRecord, right: AnyRecord) => boardRank(right) - boardRank(left)
    const isMatchTotalRow = (row: AnyRecord) => {
      const key = marketKey(row)
      return (key.includes('o/u') || key.includes('total')) && !key.includes('first') && !key.includes('1st')
    }
    const isFirstSetRow = (row: AnyRecord) => {
      const key = marketKey(row)
      return key.includes('first') || key.includes('1st')
    }
    const countByGrade = rows.reduce((acc: Record<string, number>, row: AnyRecord) => {
      acc[row.valueGrade] = (acc[row.valueGrade] || 0) + 1
      return acc
    }, {})
    const betGradeRows = rows
      .filter((row: AnyRecord) => row.valueGrade === 'Bet-grade value')
      .map((row: AnyRecord) => ({ ...row, validity: tennisValueValidity(row) }))
      .sort((left: AnyRecord, right: AnyRecord) => (right.evPer100 ?? -999) - (left.evPer100 ?? -999))
    const validatedRows = betGradeRows.filter((row: AnyRecord) => row.validity?.valid)
    const rawPositiveRows = rows
      .filter((row: AnyRecord) => Number(row.evPer100) > 0)
      .map((row: AnyRecord) => ({ ...row, validity: tennisValueValidity(row) }))
      .filter((row: AnyRecord) => !row.validity?.valid)
      .sort((left: AnyRecord, right: AnyRecord) => (right.evPer100 ?? -999) - (left.evPer100 ?? -999))
    const thinRows = rows
      .filter((row: AnyRecord) => row.valueGrade === 'Thin value')
      .sort((left: AnyRecord, right: AnyRecord) => (right.evPer100 ?? -999) - (left.evPer100 ?? -999))
    const negativeMlRows = rows
      .filter((row: AnyRecord) => row.valueGrade === 'Negative EV' && String(row.marketType).toLowerCase() === 'ml')
      .sort((left: AnyRecord, right: AnyRecord) => (left.evPer100 ?? 999) - (right.evPer100 ?? 999))
    const pricedRows = rows.filter((row: AnyRecord) => Number.isFinite(Number(row.evPer100)))
    const noPriceRows = rows.filter((row: AnyRecord) => /needs posted price|no price/i.test(String(row.valueGrade)))

    return {
      rows,
      totalRows: rows.length,
      pricedRows: pricedRows.length,
      noPriceRows: noPriceRows.length,
      countByGrade,
      betGradeRows,
      validatedRows,
      modelPickRows: rows
        .filter((row: AnyRecord) => marketKey(row) === 'ml' && normalizeNameToken(row.selection) === normalizeNameToken(row.game?.analysis?.participant?.name))
        .sort(sortByBoardRank)
        .slice(0, 8),
      mlRows: rows.filter((row: AnyRecord) => marketKey(row) === 'ml').sort(sortByBoardRank).slice(0, 8),
      matchTotalRows: rows.filter(isMatchTotalRow).sort(sortByBoardRank).slice(0, 8),
      firstSetRows: rows.filter(isFirstSetRow).sort(sortByBoardRank).slice(0, 8),
      spreadRows: rows.filter((row: AnyRecord) => marketKey(row) === 'spread').sort(sortByBoardRank).slice(0, 8),
      setWinRows: rows.filter((row: AnyRecord) => marketKey(row).includes('set') && !isFirstSetRow(row)).sort(sortByBoardRank).slice(0, 8),
      kalshiTradeRows: activeKalshiTradeRows,
      kalshiTradeCandidates: activeKalshiTradeRows.filter((row: AnyRecord) => row.effectiveTier === 'trade'),
      kalshiWatchRows: activeKalshiTradeRows.filter((row: AnyRecord) => row.effectiveTier === 'watch'),
      kalshiPassRows: activeKalshiTradeRows.filter((row: AnyRecord) => row.effectiveTier === 'pass'),
      kalshiNoHistoryRows: activeKalshiTradeRows.filter((row: AnyRecord) => !row.hasKalshiHistory),
      rawPositiveRows,
      thinRows,
      negativeMlRows,
      note:
        activeDayIsoDate === '2026-05-29'
          ? 'May 29 uses the hardened PM gate: trade rows require mapped Kalshi history plus positive spike EV. No-history rows are forced to pass until a price-history comp exists.'
          : activeDayIsoDate === '2026-05-28'
            ? 'May 28 is pre-match. May 27 backtest: ML value rows went 3-1 with +21.9% flat ROI; spreads went 1-3 and stay downgraded until the next settled pass.'
        : 'EV is model probability against the posted price. A likely winner can still be a bad bet if the payout is too small.'
    }
  }, [activeDay, activeDayIsoDate, activeKalshiTradeRows, games])

  const activeKalshiMlbMarketByGame = useMemo(() => {
    const byDate = (kalshiMlbMarkets as AnyRecord)?.dates?.[activeDayIsoDate]?.byGameId
    return byDate && typeof byDate === 'object' ? byDate : {}
  }, [activeDayIsoDate])

  const mlbValueSummary = useMemo(() => {
    const mlbGames = games.filter((game: AnyRecord) => game.league === 'MLB')
    if (!mlbGames.length) return null
    const hrScoreBandRank = (band: string) => {
      if (band === 'premium') return 3
      if (band === 'strong') return 2
      if (band === 'viable') return 1
      return 0
    }

    const fullyPostedGames = mlbGames.filter(
      (game: AnyRecord) => game.lineupBoard?.status?.away === 'posted' && game.lineupBoard?.status?.home === 'posted'
    ).length
    const partialGames = mlbGames.filter((game: AnyRecord) => {
      const away = game.lineupBoard?.status?.away
      const home = game.lineupBoard?.status?.home
      return away === 'partial' || home === 'partial'
    }).length

    const first5MoneylineRows: AnyRecord[] = []
    const first5TotalRows: AnyRecord[] = []
    const first5TotalResearchRows: AnyRecord[] = []

    const sideRows = favoriteCatalogEntries
      .filter(
        (entry: AnyRecord) =>
          entry.league === 'MLB' &&
          !entry.invalid &&
          (entry.raw?.valueGate === 'validated' || entry.raw?.valueGrade === 'Bet-grade value')
      )
      .sort((left: AnyRecord, right: AnyRecord) => right.sortEdge - left.sortEdge || right.confidence - left.confidence)

    const totalRows = totalCatalogEntries
      .filter(
        (entry: AnyRecord) =>
          entry.league === 'MLB' &&
          !entry.invalid &&
          entry.raw?.phaseId === 'full' &&
          (entry.raw?.valueGate === 'validated' || entry.raw?.valueGrade === 'Bet-grade value')
      )
      .sort((left: AnyRecord, right: AnyRecord) => right.sortEdge - left.sortEdge || right.confidence - left.confidence)

    const tbBackedRows = propCatalogEntries
      .filter(
        (entry: AnyRecord) =>
          entry.league === 'MLB' &&
          !entry.invalid &&
          entry.raw?.propType === 'totalBases' &&
          entry.raw?.shadowSupportTag === 'TB backed'
      )
      .sort((left: AnyRecord, right: AnyRecord) => right.sortConfidence - left.sortConfidence || right.sortEdge - left.sortEdge)

    const tbSoftHeatRows = propCatalogEntries
      .filter(
        (entry: AnyRecord) =>
          entry.league === 'MLB' &&
          !entry.invalid &&
          entry.raw?.propType === 'totalBases' &&
          entry.raw?.shadowSupportTag === 'Soft heat'
      )
      .sort((left: AnyRecord, right: AnyRecord) => right.sortConfidence - left.sortConfidence || right.sortEdge - left.sortEdge)

    const totalBaseRows = propCatalogEntries
      .filter((entry: AnyRecord) => entry.league === 'MLB' && !entry.invalid && entry.raw?.propType === 'totalBases')
      .sort((left: AnyRecord, right: AnyRecord) => right.sortConfidence - left.sortConfidence || right.sortEdge - left.sortEdge)

    const strikeoutRows = propCatalogEntries
      .filter(
        (entry: AnyRecord) =>
          entry.league === 'MLB' &&
          !entry.invalid &&
          entry.raw?.propType === 'pitcherStrikeouts' &&
          Number(entry.confidence) >= 60
      )
      .sort((left: AnyRecord, right: AnyRecord) => right.sortConfidence - left.sortConfidence || right.sortEdge - left.sortEdge)

    const strikeoutOverRows = strikeoutRows.filter((entry: AnyRecord) => /over/i.test(String(entry.raw?.marketLabel || entry.title || '')))
    const strikeoutUnderRows = strikeoutRows.filter((entry: AnyRecord) => /under/i.test(String(entry.raw?.marketLabel || entry.title || '')))

    const battingImpactRows = propCatalogEntries
      .filter(
        (entry: AnyRecord) =>
          entry.league === 'MLB' &&
          !entry.invalid &&
          ['hits', 'rbi', 'hitRunRbi', 'hitsRunsRbis', 'runs', 'walks', 'singles'].includes(String(entry.raw?.propType || ''))
      )
      .sort((left: AnyRecord, right: AnyRecord) => right.sortConfidence - left.sortConfidence || right.sortEdge - left.sortEdge)

    const hitRunRbiRows = battingImpactRows.filter((entry: AnyRecord) =>
      ['hits', 'rbi', 'hitRunRbi', 'hitsRunsRbis', 'runs'].includes(String(entry.raw?.propType || ''))
    )

    const battingImpactFallbackRows = battingImpactRows.filter((entry: AnyRecord) =>
      ['walks', 'singles'].includes(String(entry.raw?.propType || ''))
    )

    const battingProductionRows = mlbGames
      .flatMap((game: AnyRecord) => {
        const gameDetail = loadedGameDetailsByDay[activeDayId]?.[game.id] ?? null
        const lineupBoard = gameDetail?.lineupBoard ?? null
        if (!lineupBoard) return []

        return (['away', 'home'] as const).flatMap((sideKey) => {
          const team = lineupBoard?.[sideKey] ?? {}
          const lineup = Array.isArray(team.lineup) ? team.lineup : []
          const lineupStatus = lineupBoard?.status?.[sideKey] || 'partial'
          const opposingHand = team.opposingStarter?.handedness || team.opposingStarter?.throws || ''
          const aggregate = team.aggregate || {}

          return lineup.map((player: AnyRecord) => {
            const recentXops = computeXops(player.recent)
            const splitXops = computeXops(player.split)
            const seasonXops = computeXops(player.season)
            const statcast = player.statcastTrend || {}
            const opponentContext = player.opponentContext || {}
            const metrics = player.metrics || {}
            const slot = Number(player.slot || 9)
            const slotBonus = Math.max(0, 12 - (slot - 1) * 1.4)
            const recentXwoba = Number(statcast.rolling7Xwoba || 0)
            const recentHitRate = Number(player.recent?.hitRate || 0)
            const splitHitRate = Number(player.split?.hitRate || 0)
            const seasonHitRate = Number(player.season?.hitRate || 0)
            const recentObp = Number(player.recent?.obp || 0)
            const splitObp = Number(player.split?.obp || 0)
            const seasonObp = Number(player.season?.obp || 0)
            const recentTbRate = Number(player.recent?.totalBasesRate || 0)
            const splitTbRate = Number(player.split?.totalBasesRate || 0)
            const seasonTbRate = Number(player.season?.totalBasesRate || 0)
            const weightedHitRate = recentHitRate * 0.45 + splitHitRate * 0.35 + seasonHitRate * 0.2
            const weightedObp = recentObp * 0.45 + splitObp * 0.35 + seasonObp * 0.2
            const weightedTbRate = recentTbRate * 0.45 + splitTbRate * 0.35 + seasonTbRate * 0.2
            const projectedPa = clamp(4.85 - (slot - 1) * 0.11, 3.75, 4.9)
            const lineupPressure = Number(aggregate.overallPressureIndex || 50) / 100
            const matchupPressure = clamp(Number(metrics.matchupScore || 50) / 100, 0.2, 1.2)
            const pitchFitPressure = clamp(0.85 + Number(metrics.pitchTypeFitScore || 50) / 200, 0.65, 1.35)
            const runSlotFactor = slot === 1 ? 1.12 : slot <= 3 ? 1.06 : slot <= 5 ? 1 : 0.9
            const rbiSlotFactor = slot === 1 ? 0.78 : slot <= 3 ? 1.12 : slot <= 5 ? 1.02 : 0.88
            const expectedHits = projectedPa * weightedHitRate
            const expectedBases = projectedPa * weightedTbRate * matchupPressure * pitchFitPressure
            const expectedRuns =
              projectedPa *
              (
                weightedObp * 0.22 +
                recentXwoba * 0.1 +
                lineupPressure * 0.06
              ) *
              matchupPressure *
              runSlotFactor
            const expectedRbis =
              projectedPa *
              (
                weightedTbRate * 0.16 +
                recentXwoba * 0.08 +
                weightedHitRate * 0.08 +
                lineupPressure * 0.04
              ) *
              matchupPressure *
              pitchFitPressure *
              rbiSlotFactor
            const expectedHrr = expectedHits + expectedRuns + expectedRbis
            const productionScore =
              (Number(recentXops || 0) * 140) +
              (Number(splitXops || 0) * 120) +
              (Number(seasonXops || 0) * 70) +
              (recentXwoba * 55) +
              (Number(metrics.contactScore || 0) * 0.12) +
              (Number(metrics.patienceScore || 0) * 0.1) +
              (Number(metrics.formScore || 0) * 0.16) +
              (Number(metrics.matchupScore || 0) * 0.16) +
              (Number(metrics.pitchTypeFitScore || 0) * 0.08) +
              (Number(opponentContext.hitsPerPaWeightDeltaLast10 || 0) * 120) +
              (Number(opponentContext.totalBasesPerPaWeightDeltaLast10 || 0) * 80) +
              slotBonus

            const summaryBits = [
              game.title,
              `slot ${slot}${player.primaryTag ? ` ${player.primaryTag}` : ''}`,
              `xB ${formatNumber(expectedBases, 2)}`,
              recentXops != null ? `Recent XOPS ${formatSlashMetric(recentXops)}` : null,
              splitXops != null ? `Split XOPS ${formatSlashMetric(splitXops)}${opposingHand ? ` vs ${opposingHand}HP` : ''}` : null,
              Number.isFinite(recentXwoba) && recentXwoba > 0 ? `7d xwOBA ${formatSlashMetric(recentXwoba)}` : null,
              Number.isFinite(Number(metrics.matchupScore)) ? `matchup ${Math.round(Number(metrics.matchupScore))}` : null,
              Number.isFinite(Number(metrics.pitchTypeGrade)) ? `fit ${formatSignedNumber(metrics.pitchTypeGrade, 1)}` : null
            ].filter(Boolean)

            return {
              id: `impact:${game.id}:${sideKey}:${player.playerId ?? player.name}`,
              gameId: game.id,
              league: 'MLB',
              title: `${player.name} H+R+RBI watch`,
              summary: summaryBits.join(' · '),
              confidence: 0,
              sortConfidence: 0,
              sortEdge: productionScore,
              priceLabel: `xB ${formatNumber(expectedBases, 2)} · Exp H ${formatNumber(expectedHits, 2)} · R ${formatNumber(expectedRuns, 2)} · RBI ${formatNumber(expectedRbis, 2)} · Total ${formatNumber(expectedHrr, 2)} · ${lineupStatus} order`,
              raw: {
                propType: 'hitRunRbiModel',
                lineupStatus,
                productionScore,
                expectedBases,
                expectedHits,
                expectedRuns,
                expectedRbis,
                expectedHrr,
                expectedBasesModel: {
                  expectedBases,
                  weightedTbRate,
                  projectedPa,
                  matchupPressure,
                  pitchFitPressure
                },
                slot,
                playerName: player.name
              }
            }
          })
        })
      })
      .sort((left: AnyRecord, right: AnyRecord) => right.sortEdge - left.sortEdge || right.confidence - left.confidence)
      .map((row: AnyRecord, index: number, allRows: AnyRecord[]) => {
        const maxEdge = Number(allRows[0]?.sortEdge || 0)
        const minEdge = Number(allRows[allRows.length - 1]?.sortEdge || maxEdge)
        const normalizedEdge = maxEdge > minEdge
          ? clamp((Number(row.sortEdge || 0) - minEdge) / (maxEdge - minEdge), 0, 1)
          : 0.5
        const confidence = clamp(Math.round(54 + normalizedEdge * 34), 48, 88)
        return {
          ...row,
          confidence,
          sortConfidence: confidence
        }
      })

    const displayHitRunRbiRows = hitRunRbiRows

    const gameIdByTitle = Object.fromEntries(mlbGames.map((game: AnyRecord) => [game.title, game.id]))
    const homeRunPayloadRows = Array.isArray(activeHomeRunBoard?.picks) ? activeHomeRunBoard.picks : []
    const fallbackPerGameRows = mlbGames.flatMap((game: AnyRecord) => {
      const groupedTargets = [
        ...(Array.isArray(game.homeRunTargets?.featured) ? game.homeRunTargets.featured : []),
        ...(Array.isArray(game.homeRunTargets?.likely) ? game.homeRunTargets.likely : []),
        ...(Array.isArray(game.homeRunTargets?.possible) ? game.homeRunTargets.possible : []),
        ...(Array.isArray(game.homeRunTargets?.targets) ? game.homeRunTargets.targets : [])
      ]
      const seenPlayers = new Set<string>()
      return groupedTargets
        .filter((target: AnyRecord) => {
          const dedupeKey = `${game.id}:${target.playerId ?? target.playerName ?? target.name ?? 'hr'}`
          if (seenPlayers.has(dedupeKey)) return false
          seenPlayers.add(dedupeKey)
          return true
        })
        .map((target: AnyRecord) => ({
          ...target,
          gameTitle: game.title,
          gameId: game.id,
          lineupStatus: target.lineupContext?.lineupStatus || 'partial'
        }))
    })

    const homeRunRows = (homeRunPayloadRows.length ? homeRunPayloadRows : fallbackPerGameRows)
      .map((target: AnyRecord, index: number) => ({
        ...target,
        gameId: target.gameId || gameIdByTitle[target.gameTitle] || null,
        lineupStatus: target.lineupStatus || target.lineupContext?.lineupStatus || 'partial',
        rank: Number.isFinite(Number(target.rank)) ? Number(target.rank) : index + 1
      }))
      .filter((target: AnyRecord) => target.playerName && hrScoreBandRank(String(target.scoreBand || '')) > 0)
      .sort((left: AnyRecord, right: AnyRecord) => {
        const postedDelta =
          Number(right.lineupStatus === 'posted') - Number(left.lineupStatus === 'posted')
        if (postedDelta) return postedDelta
        const scoreBandDelta = hrScoreBandRank(String(right.scoreBand || '')) - hrScoreBandRank(String(left.scoreBand || ''))
        if (scoreBandDelta) return scoreBandDelta
        return Number(right.score || right.baseScore || 0) - Number(left.score || left.baseScore || 0)
      })

    const premiumHomeRunRows = homeRunRows.filter((row: AnyRecord) => String(row.scoreBand || '') === 'premium')
    const strongHomeRunRows = homeRunRows.filter((row: AnyRecord) => String(row.scoreBand || '') === 'strong')
    const viableHomeRunRows = homeRunRows.filter((row: AnyRecord) => String(row.scoreBand || '') === 'viable')
    const postedHomeRunRows = homeRunRows.filter((row: AnyRecord) => row.lineupStatus === 'posted')

    const topRows = [...tbBackedRows, ...strikeoutRows, ...first5MoneylineRows, ...first5TotalRows, ...totalRows, ...sideRows]
      .sort((left: AnyRecord, right: AnyRecord) => right.sortConfidence - left.sortConfidence || right.sortEdge - left.sortEdge)
      .slice(0, 12)

    return {
      totalGames: mlbGames.length,
      fullyPostedGames,
      partialGames,
      mappedKalshiGames: Object.keys(activeKalshiMlbMarketByGame).length,
      sideRows,
      totalRows,
      first5MoneylineRows,
      first5TotalRows,
      first5TotalResearchRows,
      first5TotalGateNote:
        'MLB value rows must be model-owned. The UI does not derive first-five O/U, first-five ML, or total value rows from projections.',
      totalBaseRows,
      tbBackedRows,
      tbSoftHeatRows,
      strikeoutRows,
      strikeoutOverRows,
      strikeoutUnderRows,
      battingImpactRows,
      hitRunRbiRows,
      battingProductionRows,
      displayHitRunRbiRows,
      battingImpactFallbackRows,
      homeRunRows,
      premiumHomeRunRows,
      strongHomeRunRows,
      viableHomeRunRows,
      postedHomeRunRows,
      topRows,
        note:
          fullyPostedGames === mlbGames.length
          ? 'MLB value center filters model-owned value rows only. UI-side first-five ML/O-U, totals EV, and scalp transforms are disabled until the cartridge publishes those lanes directly.'
          : `MLB value center is live, but only ${fullyPostedGames}/${mlbGames.length} games are fully posted. It filters model-owned value rows only; UI-side transforms are disabled.`
      }
  }, [
    activeDayId,
    activeHomeRunBoard,
    activeKalshiMlbMarketByGame,
    favoriteCatalogEntries,
    games,
    loadedGameDetailsByDay,
    propCatalogEntries,
    totalCatalogEntries
  ])

  const mlbFirstInningValueSummary = useMemo(() => {
    const mlbGames = games.filter((game: AnyRecord) => game.league === 'MLB')
    if (!mlbGames.length) return null

    const rows = mlbGames
      .map((game: AnyRecord) => {
        const firstInning = game.analysis?.mlbProjection?.firstInning
        if (!firstInning || String(firstInning.pick || '').toLowerCase() === 'pass') return null

        const yesModel = Number(firstInning.yesProbabilityPct)
        const noModel = Number(firstInning.noProbabilityPct)
        const awayRunPct = Number(firstInning.awayRunProbabilityPct)
        const homeRunPct = Number(firstInning.homeRunProbabilityPct)
        if (![yesModel, noModel, awayRunPct, homeRunPct].every(Number.isFinite)) return null

        const kalshiFirstInning = activeKalshiMlbMarketByGame[game.id]?.firstInning ?? null
        const yesAsk = Number(kalshiFirstInning?.yesAskCents)
        const noAsk = Number(kalshiFirstInning?.noAskCents)
        const hasKalshi = [yesAsk, noAsk].every(Number.isFinite)
        const modelConfidence = Math.round(String(firstInning.pick || '').toUpperCase() === 'YRFI' ? yesModel : noModel)

        return {
          gameId: game.id,
          title: game.title,
          pick: firstInning.pick,
          strength: firstInning.strength,
          confidence: modelConfidence,
          yesModel,
          noModel,
          yesAsk,
          noAsk,
          hasKalshi,
          awayRunPct,
          homeRunPct,
          edge: Number(firstInning.edge) || 0,
          summary: firstInning.summary
        }
      })
      .filter(Boolean)

    const yrfiRows = rows
      .filter((row: AnyRecord) => String(row.pick || '').toUpperCase() === 'YRFI')
      .sort(
        (left: AnyRecord, right: AnyRecord) =>
          right.confidence - left.confidence ||
          right.edge - left.edge ||
          right.yesModel - left.yesModel
      )

    const nrfiRows = rows
      .filter((row: AnyRecord) => String(row.pick || '').toUpperCase() === 'NRFI')
      .sort(
        (left: AnyRecord, right: AnyRecord) =>
          right.confidence - left.confidence ||
          right.edge - left.edge ||
          right.noModel - left.noModel
      )

    return {
      totalGames: mlbGames.length,
      modeledGames: rows.length,
      mappedGames: rows.filter((row: AnyRecord) => row.hasKalshi).length,
      yrfiRows,
      nrfiRows,
      note:
        'First-inning board is model-first. It ranks the strongest YRFI / NRFI lanes from lineup pressure, early scoring shape, and starter leakage; Kalshi asks only show up as optional context when mapped.'
    }
  }, [activeKalshiMlbMarketByGame, games])

  const mlbScalpSummary = useMemo(() => {
    return null
  }, [])

  const availableValueScopes = useMemo(() => {
    const scopes: Array<{ id: string; label: string }> = [{ id: 'all', label: 'All' }]

    if (tennisValueSummary) scopes.push({ id: 'tennis', label: 'Tennis' })
    if (mlbValueSummary && (mlbValueSummary.sideRows.length || mlbValueSummary.totalRows.length)) {
      scopes.push({ id: 'mlb-overview', label: 'Overview' })
    }
    if (
      mlbValueSummary &&
      (mlbValueSummary.first5MoneylineRows?.length ||
        mlbValueSummary.first5TotalRows?.length ||
        mlbValueSummary.first5TotalResearchRows?.length)
    ) {
      scopes.push({ id: 'mlb-first5', label: '1st 5' })
    }
    if (mlbFirstInningValueSummary && (mlbFirstInningValueSummary.yrfiRows.length || mlbFirstInningValueSummary.nrfiRows.length)) {
      scopes.push({ id: 'mlb-first-inning', label: '1st inning' })
    }
    if (mlbValueSummary?.totalBaseRows.length) scopes.push({ id: 'mlb-tb', label: 'TB' })
    if (mlbValueSummary?.strikeoutRows.length) scopes.push({ id: 'mlb-strikeouts', label: 'K O/U' })
    if (mlbValueSummary && (mlbValueSummary.hitRunRbiRows.length || mlbValueSummary.battingProductionRows.length)) {
      scopes.push({ id: 'mlb-impact', label: 'H+R+RBI' })
    }
    if (mlbValueSummary?.homeRunRows.length) scopes.push({ id: 'mlb-hr', label: 'HR' })
    if (mlbScalpSummary?.scalpRows.length) scopes.push({ id: 'mlb-scalp', label: 'Scalp' })

    return scopes
  }, [mlbFirstInningValueSummary, mlbScalpSummary, mlbValueSummary, tennisValueSummary])

  const activeValueScope = activeValueScopeByDay[activeDayId] ?? 'all'
  const shouldShowValueScope = (scopeId: string) => activeValueScope === 'all' || activeValueScope === scopeId

  useEffect(() => {
    const validScopeIds = new Set(availableValueScopes.map((scope) => scope.id))
    const currentScope = activeValueScopeByDay[activeDayId] ?? 'all'
    if (validScopeIds.has(currentScope)) return
    setActiveValueScopeByDay((current) => ({ ...current, [activeDayId]: 'all' }))
  }, [activeDayId, activeValueScopeByDay, availableValueScopes])

  useEffect(() => {
    if (activeFilter !== 'Value') return
    if (!['all', 'mlb-impact'].includes(activeValueScope)) return

    const mlbGameIds = games.filter((game: AnyRecord) => game.league === 'MLB').map((game: AnyRecord) => game.id)
    mlbGameIds.forEach((gameId: string) => {
      if (loadedGameDetailsByDay[activeDayId]?.[gameId]) return
      if (loadingGameDetailsByDay[activeDayId]?.[gameId]) return

      setLoadingGameDetailsByDay((current) => ({
        ...current,
        [activeDayId]: { ...(current[activeDayId] || {}), [gameId]: true }
      }))

      loadSlateGameDetailData(activeDayId, gameId)
        .then((gameDetail) => {
          setLoadedGameDetailsByDay((current) => ({
            ...current,
            [activeDayId]: { ...(current[activeDayId] || {}), [gameId]: gameDetail as AnyRecord }
          }))
        })
        .catch((error) => {
          console.error(`Failed to preload MLB impact detail ${activeDayId}/${gameId}`, error)
        })
        .finally(() => {
          setLoadingGameDetailsByDay((current) => ({
            ...current,
            [activeDayId]: { ...(current[activeDayId] || {}), [gameId]: false }
          }))
        })
    })
  }, [activeDayId, activeFilter, activeValueScope, games, loadedGameDetailsByDay, loadingGameDetailsByDay])

  useEffect(() => {
    if (activeFilter !== 'Value') return
    if (activeValueScope !== 'mlb-hr') return
    if (!mlbValueSummary?.homeRunRows?.length) return

    const topHrGameIds = mlbValueSummary.homeRunRows
      .slice(0, 10)
      .map((row: AnyRecord) => row.gameId)
      .filter((gameId: string | null) => Boolean(gameId))

    topHrGameIds.forEach((gameId: string) => {
      if (loadedGameDetailsByDay[activeDayId]?.[gameId]) return
      if (loadingGameDetailsByDay[activeDayId]?.[gameId]) return

      setLoadingGameDetailsByDay((current) => ({
        ...current,
        [activeDayId]: { ...(current[activeDayId] || {}), [gameId]: true }
      }))

      loadSlateGameDetailData(activeDayId, gameId)
        .then((gameDetail) => {
          setLoadedGameDetailsByDay((current) => ({
            ...current,
            [activeDayId]: { ...(current[activeDayId] || {}), [gameId]: gameDetail as AnyRecord }
          }))
        })
        .catch((error) => {
          console.error(`Failed to preload MLB HR detail ${activeDayId}/${gameId}`, error)
        })
        .finally(() => {
          setLoadingGameDetailsByDay((current) => ({
            ...current,
            [activeDayId]: { ...(current[activeDayId] || {}), [gameId]: false }
          }))
        })
    })
  }, [
    activeDayId,
    activeFilter,
    activeValueScope,
    loadedGameDetailsByDay,
    loadingGameDetailsByDay,
    mlbValueSummary?.homeRunRows
  ])

  const parlayLegs = useMemo(() => {
    return Object.entries(selectedPicks)
      .map(([gameId, participantId]) => {
        const game = games.find((entry: AnyRecord) => entry.id === gameId)
        return game ? createParlayLeg(game, participantId, 'manual') : null
      })
      .filter(Boolean)
  }, [games, selectedPicks])

  const parlay = useMemo(() => buildParlayModel(parlayLegs, parlayStake), [parlayLegs, parlayStake])
  const atParlayLimit = parlay.legCount >= PARLAY_MAX_LEGS
  const parlayReady = parlay.legCount >= PARLAY_MIN_LEGS
  const parlayStatus = parlayReady
    ? `${parlay.legCount}-leg ticket ready at ${parlay.combinedAmericanLabel}.`
    : `Add ${Math.max(0, PARLAY_MIN_LEGS - parlay.legCount)} more side${parlay.legCount === 0 ? 's' : ''} to price the parlay.`

  const recommendationCounts = useMemo(() => {
    const maxAvailable = Math.min(PARLAY_MAX_LEGS, filteredMoneylineGames.length)
    return Array.from({ length: Math.max(0, maxAvailable - 1) }, (_, index) => index + 2)
  }, [filteredMoneylineGames.length])

  const recommendedLegTarget = clamp(recommendedLegCount, 2, Math.max(2, recommendationCounts.at(-1) ?? 2))

  const balancedRecommendation = useMemo(
    () => buildBalancedRecommendationSet(scopedFavoriteRecommendationPool, scopedFlipRiskPicks, recommendedLegTarget, balanceWeight),
    [balanceWeight, recommendedLegTarget, scopedFavoriteRecommendationPool, scopedFlipRiskPicks]
  )

  const recommendedPicks = useMemo(() => {
    if (recommendationMode === 'balanced') return balancedRecommendation.picks
    if (recommendationMode === 'flips') return scopedFlipRiskPicks.slice(0, recommendedLegTarget)
    return scopedFavoriteRecommendationPool.slice(0, recommendedLegTarget)
  }, [balancedRecommendation.picks, recommendationMode, recommendedLegTarget, scopedFavoriteRecommendationPool, scopedFlipRiskPicks])

  const recommendedParlay = useMemo(() => {
    const legs = recommendedPicks
      .map((pick: AnyRecord) => {
        const game = games.find((entry: AnyRecord) => entry.id === pick.gameId)
        return game ? createParlayLeg(game, pick.participantId, recommendationMode) : null
      })
      .filter(Boolean)
    return buildParlayModel(legs, parlayStake)
  }, [games, parlayStake, recommendationMode, recommendedPicks])

  const selectedPropEntries = Object.values(selectedProps)
  const selectedTotalEntries = Object.values(selectedTotals)
  const propConfidenceAverage = selectedPropEntries.length
    ? Math.round(selectedPropEntries.reduce((sum: number, entry: AnyRecord) => sum + (entry.confidence || 0), 0) / selectedPropEntries.length)
    : 0
  const trimmedMarketSearch = marketSearch.trim()
  const quickSearchSuggestions = useMemo(() => {
    const dateLabel = slateMeta.date || activeDayId
    const mlbGamesCount = games.filter((game: AnyRecord) => game.league === 'MLB').length
    const tennisGamesCount = games.filter((game: AnyRecord) => game.league === 'Tennis').length
    const suggestions: AnyRecord[] = [
      {
        id: `${activeDayId}:quick:best-props`,
        kind: 'quick',
        resultType: 'Props',
        targetTab: 'parlay',
        builderCatalogTab: 'props',
        builderValidityFilter: 'eligible',
        builderSort: 'confidence',
        builderLeagueFilter: 'all',
        propType: 'all',
        date: activeDayId,
        dateLabel,
        title: 'Best props',
        subtitle: `${dateLabel} | eligible props by confidence`,
        matchContext: propCatalogEntries.length ? `${propCatalogEntries.length} props` : 'Builder'
      },
      {
        id: `${activeDayId}:quick:value-props`,
        kind: 'quick',
        resultType: 'Value props',
        targetTab: 'parlay',
        builderCatalogTab: 'props',
        builderValidityFilter: 'eligible',
        builderSort: 'edge',
        builderLeagueFilter: 'all',
        propType: 'all',
        date: activeDayId,
        dateLabel,
        title: 'Value props',
        subtitle: `${dateLabel} | props sorted by model edge`,
        matchContext: 'Edge sort'
      },
      {
        id: `${activeDayId}:quick:all-value`,
        kind: 'quick',
        resultType: 'Value board',
        targetTab: 'board',
        targetFilter: 'Value',
        valueScope: 'all',
        date: activeDayId,
        dateLabel,
        title: 'All value lanes',
        subtitle: `${dateLabel} | sides, props, totals, HR, first inning`,
        matchContext: 'Board'
      }
    ]

    if (mlbGamesCount) {
      suggestions.push(
        {
          id: `${activeDayId}:quick:mlb-hr`,
          kind: 'quick',
          resultType: 'HR board',
          targetTab: 'board',
          targetFilter: 'Value',
          valueScope: 'mlb-hr',
          date: activeDayId,
          dateLabel,
          title: 'Home-run value board',
          subtitle: `${dateLabel} | top HR lanes and Statcast ladder`,
          matchContext: mlbValueSummary?.homeRunRows?.length ? `${mlbValueSummary.homeRunRows.length} lanes` : 'HR ladder'
        },
        {
          id: `${activeDayId}:quick:tb-props`,
          kind: 'quick',
          resultType: 'TB props',
          targetTab: 'parlay',
          builderCatalogTab: 'props',
          builderValidityFilter: 'eligible',
          builderSort: 'confidence',
          builderLeagueFilter: 'MLB',
          propType: 'totalBases',
          date: activeDayId,
          dateLabel,
          title: 'Total bases props',
          subtitle: `${dateLabel} | MLB TB candidates`,
          matchContext: mlbValueSummary?.totalBaseRows?.length ? `${mlbValueSummary.totalBaseRows.length} rows` : 'MLB props'
        },
        {
          id: `${activeDayId}:quick:k-props`,
          kind: 'quick',
          resultType: 'Pitcher K',
          targetTab: 'parlay',
          builderCatalogTab: 'props',
          builderValidityFilter: 'eligible',
          builderSort: 'confidence',
          builderLeagueFilter: 'MLB',
          propType: 'pitcherStrikeouts',
          date: activeDayId,
          dateLabel,
          title: 'Pitcher strikeout props',
          subtitle: `${dateLabel} | K overs and unders`,
          matchContext: mlbValueSummary?.strikeoutRows?.length ? `${mlbValueSummary.strikeoutRows.length} rows` : 'Pitcher props'
        }
      )

      if (mlbFirstInningValueSummary?.yrfiRows.length || mlbFirstInningValueSummary?.nrfiRows.length) {
        suggestions.push({
          id: `${activeDayId}:quick:first-inning`,
          kind: 'quick',
          resultType: '1st inning',
          targetTab: 'board',
          targetFilter: 'Value',
          valueScope: 'mlb-first-inning',
          date: activeDayId,
          dateLabel,
          title: 'First-inning value',
          subtitle: `${dateLabel} | YRFI and NRFI price gaps`,
          matchContext: `${(mlbFirstInningValueSummary?.yrfiRows.length || 0) + (mlbFirstInningValueSummary?.nrfiRows.length || 0)} rows`
        })
      }
    }

    if (tennisGamesCount) {
      suggestions.push({
        id: `${activeDayId}:quick:tennis-value`,
        kind: 'quick',
        resultType: 'Tennis value',
        targetTab: 'board',
        targetFilter: 'Value',
        valueScope: 'tennis',
        date: activeDayId,
        dateLabel,
        title: 'Tennis value board',
        subtitle: `${dateLabel} | match, spread, total, Kalshi`,
        matchContext: `${tennisValueSummary?.rows?.length || tennisGamesCount} rows`
      })
    }

    return suggestions.slice(0, 8)
  }, [activeDayId, games, mlbFirstInningValueSummary, mlbValueSummary, propCatalogEntries.length, slateMeta.date, tennisValueSummary])
  const isShowingQuickSearch = trimmedMarketSearch.length < 2
  const searchPreviewResults = isShowingQuickSearch ? quickSearchSuggestions : globalSearchResults.slice(0, 8)
  const showSearchPopover =
    (isSearchFocused && (isShowingQuickSearch || trimmedMarketSearch.length >= 2)) || isGlobalSearchLoading

  const handleSearchInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!showSearchPopover) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSearchResultIndex((current) => Math.min(current + 1, Math.max(searchPreviewResults.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSearchResultIndex((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter') {
      const result = searchPreviewResults[activeSearchResultIndex] ?? searchPreviewResults[0]
      if (result) {
        event.preventDefault()
        openGlobalSearchResult(result)
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setIsSearchFocused(false)
      searchInputRef.current?.blur()
    }
  }

  const selectDay = (dayId: string) => {
    setActiveDayId(dayId)
    setActiveFilter('All')
    setIsMobileBoardDetailOpen(false)
  }

  const openGlobalSearchResult = (result: AnyRecord) => {
    const date = String(result.date || '')
    const gameId = String(result.gameId || '')
    if (!date) return
    const targetTab = visibleDeskTabs.some((tab) => tab.id === result.targetTab) ? result.targetTab as DeskTabId : 'board'
    const targetFilter = String(result.targetFilter || (targetTab === 'board' ? 'All' : activeFilter))
    const opensBoardDetail = targetTab === 'board' && Boolean(gameId)

    setActiveDayId(date)
    setActiveFilter(targetFilter)
    if (gameId) {
      setSelectedGameIdByDay((current) => ({ ...current, [date]: gameId }))
    }
    if (result.valueScope) {
      setActiveValueScopeByDay((current) => ({ ...current, [date]: String(result.valueScope) }))
    }
    if (result.builderCatalogTab) setBuilderCatalogTab(result.builderCatalogTab)
    if (result.builderValidityFilter) setBuilderValidityFilter(result.builderValidityFilter)
    if (result.builderSort) setBuilderSort(result.builderSort)
    if (result.builderLeagueFilter) setBuilderLeagueFilter(String(result.builderLeagueFilter))
    if (result.propType) setActivePropType(result.propType)
    setActiveDeskTab(targetTab)
    if (opensBoardDetail) openMobileBoardDetail(gameId, date, targetFilter)
    else setIsMobileBoardDetailOpen(false)
    setMarketSearch('')
    setIsSearchFocused(false)
    searchInputRef.current?.blur()
  }

  const stepDay = (offset: number) => {
    const nextIndex = activeDayIndex + offset
    const target = orderedSlateDays[nextIndex]
    if (target) selectDay(target.id)
  }

  const openGame = (gameId: string) => {
    setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: gameId }))
    setActiveDeskTab('board')
    openMobileBoardDetail(gameId)
  }

  const toggleMoneylineSelection = (game: AnyRecord, participantId: string) => {
    const eventState = getEventState(game, activeDayIsoDate, pacificClock)
    if (eventState.invalid) return

    setSelectedPicksByDay((current) => {
      const daySelections = { ...(current[activeDayId] ?? {}) }
      if (daySelections[game.id] === participantId) delete daySelections[game.id]
      else {
        if (!daySelections[game.id] && Object.keys(daySelections).length >= PARLAY_MAX_LEGS) return current
        daySelections[game.id] = participantId
      }
      return { ...current, [activeDayId]: daySelections }
    })
  }

  const addAnalystPick = (game: AnyRecord) => {
    if (!game?.moneyline?.available || !game.analysis?.participantId) return
    toggleMoneylineSelection(game, game.analysis.participantId)
  }

  const removeParlayPick = (gameId: string) => {
    setSelectedPicksByDay((current) => {
      const daySelections = { ...(current[activeDayId] ?? {}) }
      delete daySelections[gameId]
      return { ...current, [activeDayId]: daySelections }
    })
  }

  const clearParlay = () => {
    setSelectedPicksByDay((current) => ({ ...current, [activeDayId]: {} }))
  }

  const toggleSelectedProp = (entry: AnyRecord) => {
    setSelectedPropsByDay((current) => {
      const daySelections = { ...(current[activeDayId] ?? {}) }
      if (daySelections[entry.id]) delete daySelections[entry.id]
      else daySelections[entry.id] = entry
      return { ...current, [activeDayId]: daySelections }
    })
  }

  const toggleSelectedTotal = (entry: AnyRecord) => {
    setSelectedTotalsByDay((current) => {
      const daySelections = { ...(current[activeDayId] ?? {}) }
      if (daySelections[entry.id]) delete daySelections[entry.id]
      else daySelections[entry.id] = entry
      return { ...current, [activeDayId]: daySelections }
    })
  }

  const clearSelectedProps = () => setSelectedPropsByDay((current) => ({ ...current, [activeDayId]: {} }))
  const clearSelectedTotals = () => setSelectedTotalsByDay((current) => ({ ...current, [activeDayId]: {} }))

  const applyBuilderEntry = (entry: AnyRecord) => {
    if (entry.invalid) return
    if (entry.actionKind === 'ticket') {
      const game = games.find((item: AnyRecord) => item.id === entry.gameId)
      if (game && entry.raw?.participantId) toggleMoneylineSelection(game, entry.raw.participantId)
      return
    }
    if (entry.actionKind === 'prop') {
      toggleSelectedProp(entry.raw)
      return
    }
    toggleSelectedTotal(entry.raw)
  }

  const loadRecommendedParlay = () => {
    const nextSelections: Record<string, string> = {}
    recommendedPicks.forEach((pick: AnyRecord) => {
      nextSelections[pick.gameId] = pick.participantId
    })
    setSelectedPicksByDay((current) => ({ ...current, [activeDayId]: nextSelections }))
    setActiveSidebarTab('ticket')
  }

  const hasPreviousDay = activeDayIndex > 0
  const hasNextDay = activeDayIndex >= 0 && activeDayIndex < orderedSlateDays.length - 1

  const renderLeagueBadge = (league: string) => (
    <span className={`league-badge league-${league.toLowerCase()}`}>{league}</span>
  )

  const renderMoneylinePanel = (game: AnyRecord, options: { embedded?: boolean } = {}) => {
    if (!game?.moneyline?.available) return null
    return (
      <section className={`pick-panel ${options.embedded ? 'embedded' : ''}`} aria-label={`Parlay picks for ${game.title}`}>
        <div className="pick-heading">
          <div>
            <p className="pick-kicker">Ticket</p>
            <p className="pick-caption">{game.moneyline.label}</p>
          </div>
          <div className="pick-side-meta">
            <span className="pick-source">{game.moneyline.provider}</span>
            <strong className="pick-analysis-note">My pick: {game.analysis?.participant?.name}</strong>
          </div>
        </div>

        <div className="pick-grid compact">
          {game.moneyline.participants.map((participant: AnyRecord) => (
            <button
              key={participant.id}
              type="button"
              className={`pick-button ${selectedPicks[game.id] === participant.id ? 'active' : ''}`}
              onClick={() => toggleMoneylineSelection(game, participant.id)}
            >
              <span className="pick-button-name">{participant.name}</span>
              <span className="pick-button-price">
                <strong>{participant.americanLabel}</strong>
                <small>{participant.impliedProbabilityLabel} implied</small>
              </span>
            </button>
          ))}
        </div>
      </section>
    )
  }

  const mlbDetailProps = {
    activeDayId,
    activeKalshiMlbMarketByGame,
    buildBullpenPulseLine,
    buildEdgeHeadline,
    buildGameFlowOverview,
    buildLineupPlayerInspectionLine,
    buildMlbGameStory,
    buildPitcherSummary,
    buildPitcherTypeLabel,
    buildTeamContextSummary,
    buildTeamSnapshotChips,
    formatNumber,
    formatPercent,
    formatSignedNumber,
    getMetricTone,
    getTeamAccent,
    getTeamLogoUrl,
    kalshiMlbMarkets,
    lineupStatusLabel,
    MetricHelp,
    mlbHistoryWindowByKey,
    normalizeNameToken,
    renderMatchupInningHistory,
    renderPitcherStartHistory,
    renderRecentGamesStrip,
    renderRecentInningHistory,
    setMlbHistoryWindowByKey
  }

  const tennisDetailProps = {
    findKalshiTradeCandidateForGame,
    formatAmericanOdds,
    formatNumber,
    formatPercent,
    formatSignedNumber,
    tennisValueTone
  }

  return (
    <div className={`terminal-shell ${isMobileBoardDetailOpen && activeDeskTab === 'board' ? 'mobile-detail-active' : ''}`}>
      <header className="desk-globalbar">
        <button type="button" className="mobile-header-back" onClick={closeMobileBoardDetail}>
          Back to board
        </button>

        <div className="topbar-brand">
          <div className="brand-mark">S</div>
          <div className="brand-wordmark">
            Slate<span>.</span>
          </div>
        </div>

        <div className="desk-tab-row" role="tablist" aria-label="Desk tabs">
          {visibleDeskTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={`desk-tab ${activeDeskTab === tab.id ? 'active' : ''}`}
              aria-selected={activeDeskTab === tab.id}
              onClick={() => setActiveDeskTab(tab.id)}
            >
              {tab.label}
              {tab.id === 'parlay' ? <span className="desk-tab-count">{parlay.legCount}</span> : null}
            </button>
          ))}
        </div>

        <div className="global-search-shell">
          <label className="global-search" aria-label="Search markets">
            <span>Search markets, players, signals...</span>
            <input
              ref={searchInputRef}
              type="text"
              value={marketSearch}
              onChange={(event) => setMarketSearch(event.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onClick={() => setIsSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
              onKeyDown={handleSearchInputKeyDown}
              placeholder="Search all dates, players, teams, props..."
            />
            <small>⌘K</small>
          </label>

          {showSearchPopover ? (
            <div className="global-search-popover" role="listbox" aria-label="Search suggestions">
              <div className="global-search-popover-head">
                <span>{isShowingQuickSearch ? 'Quick jumps' : 'Search all dates'}</span>
                <small>
                  {isShowingQuickSearch
                    ? `${quickSearchSuggestions.length} shortcut${quickSearchSuggestions.length === 1 ? '' : 's'}`
                    : isGlobalSearchLoading
                    ? 'Indexing...'
                    : `${globalSearchResults.length} match${globalSearchResults.length === 1 ? '' : 'es'}`}
                </small>
              </div>
              {isGlobalSearchLoading && !searchPreviewResults.length ? (
                <div className="global-search-empty">
                  <strong>Looking across slates</strong>
                  <small>Games, lineups, props, HR boards, and value lanes.</small>
                </div>
              ) : searchPreviewResults.length ? (
                searchPreviewResults.map((result: AnyRecord, index: number) => (
                  <button
                    key={result.id || `${result.date}-${result.gameId}-${result.title}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeSearchResultIndex}
                    className={`global-search-option ${index === activeSearchResultIndex ? 'active' : ''}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveSearchResultIndex(index)}
                    onClick={() => openGlobalSearchResult(result)}
                  >
                    <span>
                      <strong>{result.title}</strong>
                      <small>{result.subtitle || `${result.dateLabel || result.date} | ${result.stage || result.league || ''}`}</small>
                    </span>
                    <span className="global-search-option-meta">
                      <strong>{result.resultType || result.league || result.kind || 'Match'}</strong>
                      <small>{result.matchContext || result.valueScope || result.propType || result.confidence || ''}</small>
                    </span>
                  </button>
                ))
              ) : (
                <div className="global-search-empty">
                  <strong>No matches yet</strong>
                  <small>Try a player, team, position, prop, market, or date.</small>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="topbar-status mono">
          <span className="live-dot" />
          <span>Live</span>
          <span>{oddsMeta?.snapshot || pacificClock.label}</span>
        </div>
      </header>

      <div className="desk-datestrip">
        <div className="mobile-date-picker">
          <button type="button" className="datestrip-step mobile-date-step" disabled={!hasPreviousDay} onClick={() => stepDay(-1)} aria-label="Previous slate">
            ‹
          </button>
          <label className="mobile-date-select-shell">
            <span className="eyebrow">Slate</span>
            <select value={activeDayId} onChange={(event) => selectDay(event.target.value)} aria-label="Select slate date">
              {orderedSlateDays.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.slateMeta.date} · {day.summary.totalGames} games
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="datestrip-step mobile-date-step" disabled={!hasNextDay} onClick={() => stepDay(1)} aria-label="Next slate">
            ›
          </button>
        </div>
        <div className="datestrip-label">
          <span className="eyebrow">Slate</span>
        </div>
        <button type="button" className="datestrip-step" disabled={!hasPreviousDay} onClick={() => stepDay(-1)}>
          ‹
        </button>
        <div className="datestrip-scroll no-scrollbar">
          {orderedSlateDays.map((day) => (
            <button
              key={day.id}
              type="button"
              className={`date-chip compact ${activeDayId === day.id ? 'active' : ''}`}
              onClick={() => selectDay(day.id)}
            >
              <small>
                {day.id.slice(8, 10)} / {day.id.slice(5, 7)}
              </small>
              <strong>{day.slateMeta.date}</strong>
              <span>{day.summary.totalGames}</span>
            </button>
          ))}
        </div>
        <button type="button" className="datestrip-step" disabled={!hasNextDay} onClick={() => stepDay(1)}>
          ›
        </button>
        <div className="datestrip-meta mono">
          <span>{games.length} games</span>
          <span>{eligibleMoneylineGames.length} eligible</span>
          <span>{parlay.legCount} selected</span>
        </div>
      </div>

      {activeDeskTab === 'board' ? (
        <BoardView
          activeDayId={activeDayId}
          activeDayIsoDate={activeDayIsoDate}
          activeFilter={activeFilter}
          activeValueScope={activeValueScope}
          addAnalystPick={addAnalystPick}
          availableValueScopes={availableValueScopes}
          buildGameHighlights={buildGameHighlights}
          filterOptions={filterOptions}
          formatNumber={formatNumber}
          formatPercent={formatPercent}
          formatSignedNumber={formatSignedNumber}
          formatSnapshotTime={formatSnapshotTime}
          formatTennisValueSelection={formatTennisValueSelection}
          games={games}
          getCompetitorDisplayName={getCompetitorDisplayName}
          getGameDisplayTitle={getGameDisplayTitle}
          getGameResultLine={getGameResultLine}
          globalSearchResults={globalSearchResults}
          isActiveDayLoading={isActiveDayLoading}
          isGlobalSearchLoading={isGlobalSearchLoading}
          isSelectedGameDetailLoading={isSelectedGameDetailLoading}
          isWinningCompetitor={isWinningCompetitor}
          labelForScore={labelForScore}
          latestLineupSnapshot={latestLineupSnapshot}
          lineupStatusCounts={lineupStatusCounts}
          loadedGameDetailsByDay={loadedGameDetailsByDay}
          marketSearch={marketSearch}
          mlbFirstInningValueSummary={mlbFirstInningValueSummary}
          mlbScalpSummary={mlbScalpSummary}
          mlbValueSummary={mlbValueSummary}
          openGlobalSearchResult={openGlobalSearchResult}
          renderLeagueBadge={renderLeagueBadge}
          mlbDetailProps={mlbDetailProps}
          renderMoneylinePanel={renderMoneylinePanel}
          tennisDetailProps={tennisDetailProps}
          selectedGame={selectedGame}
          selectedGameId={selectedGameId}
          selectedPicks={selectedPicks}
          setActiveDeskTab={setActiveDeskTab}
          setActiveFilter={setActiveFilter}
          setActiveValueScopeByDay={setActiveValueScopeByDay}
          setSelectedGameIdByDay={setSelectedGameIdByDay}
          shouldShowValueScope={shouldShowValueScope}
          slateMeta={slateMeta}
          swingTextFor={swingTextFor}
          tennisValueSummary={tennisValueSummary}
          visibleGames={visibleGames}
          isMobileDetailOpen={isMobileBoardDetailOpen}
          openMobileDetailForGame={openMobileBoardDetail}
          setIsMobileDetailOpen={setIsMobileBoardDetailOpen}
        />
      ) : null}
      {activeDeskTab === 'parlay' ? (
        <ParlayView
          activeDay={activeDay}
          activePropType={activePropType}
          activeSidebarTab={activeSidebarTab}
          applyBuilderEntry={applyBuilderEntry}
          atParlayLimit={atParlayLimit}
          balanceWeight={balanceWeight}
          balancedRecommendation={balancedRecommendation}
          builderCatalogEntries={builderCatalogEntries}
          builderCatalogTab={builderCatalogTab}
          builderCatalogTabs={builderCatalogTabs}
          builderLeagueFilter={builderLeagueFilter}
          builderLeagueFilters={builderLeagueFilters}
          builderSort={builderSort}
          builderSortOptions={builderSortOptions}
          builderValidityFilter={builderValidityFilter}
          builderValidityFilters={builderValidityFilters}
          clearParlay={clearParlay}
          clearSelectedProps={clearSelectedProps}
          clearSelectedTotals={clearSelectedTotals}
          filteredMoneylineGames={filteredMoneylineGames}
          loadRecommendedParlay={loadRecommendedParlay}
          openGame={openGame}
          pacificClock={pacificClock}
          parlay={parlay}
          parlayReady={parlayReady}
          parlayStake={parlayStake}
          parlayStatus={parlayStatus}
          propConfidenceAverage={propConfidenceAverage}
          propTypeFilters={propTypeFilters}
          recommendationCounts={recommendationCounts}
          recommendationMode={recommendationMode}
          recommendationModes={recommendationModes}
          recommendedLegTarget={recommendedLegTarget}
          recommendedParlay={recommendedParlay}
          removeParlayPick={removeParlayPick}
          renderLeagueBadge={renderLeagueBadge}
          selectedPropEntries={selectedPropEntries}
          selectedTotalEntries={selectedTotalEntries}
          setActiveDeskTab={setActiveDeskTab}
          setActivePropType={setActivePropType}
          setActiveSidebarTab={setActiveSidebarTab}
          setBalanceWeight={setBalanceWeight}
          setBuilderCatalogTab={setBuilderCatalogTab}
          setBuilderLeagueFilter={setBuilderLeagueFilter}
          setBuilderSort={setBuilderSort}
          setBuilderValidityFilter={setBuilderValidityFilter}
          setParlayStake={setParlayStake}
          setRecommendationMode={setRecommendationMode}
          setRecommendedLegCount={setRecommendedLegCount}
          sidebarTabs={sidebarTabs}
          toggleSelectedProp={toggleSelectedProp}
          toggleSelectedTotal={toggleSelectedTotal}
        />
      ) : null}
      {activeDeskTab === 'tickets' ? (
        <TicketsView />
      ) : null}

      {activeDeskTab === 'models' ? (
        <ModelsView
          dailyHistoryTrendPoints={dailyHistoryTrendPoints}
          eligibleMoneylineGames={eligibleMoneylineGames}
          favoriteRecommendationPool={favoriteRecommendationPool}
          first5TrendSegments={first5TrendSegments}
          firstInningTrendSegments={firstInningTrendSegments}
          formatPercent={formatPercent}
          formatSnapshotTime={formatSnapshotTime}
          fullGameTrendSegments={fullGameTrendSegments}
          games={games}
          historyLoaded={historyLoaded}
          historyTrendPoints={historyTrendPoints}
          historyTrendSummary={historyTrendSummary}
          hrTrendSegments={hrTrendSegments}
          latestHistoryTrendLabel={latestHistoryTrendLabel}
          latestLineupSnapshot={latestLineupSnapshot}
          modelHistory={modelHistory}
          modelHistoryLoaded={modelHistoryLoaded}
          propTrendSegments={propTrendSegments}
          slateMeta={slateMeta}
          tennisTrendSegments={tennisTrendSegments}
          trendChartHeight={trendChartHeight}
          trendChartPadding={trendChartPadding}
          trendChartWidth={trendChartWidth}
        />
      ) : null}
      {activeDeskTab === 'history' ? (
        <HistoryView
          activeHistoryEntry={activeHistoryEntry}
          activeHistoryMetrics={activeHistoryMetrics}
          activeHistoryPropSummary={activeHistoryPropSummary}
          activeHistorySportSections={activeHistorySportSections}
          activeHistorySportTab={activeHistorySportTab}
          activeHistorySportTabs={activeHistorySportTabs}
          activeHistoryTrackedMarkets={activeHistoryTrackedMarkets}
          formatPercent={formatPercent}
          getHistoryMetricTone={getHistoryMetricTone}
          getHistoryReviewTone={getHistoryReviewTone}
          historyArchive={historyArchive}
          historyLoaded={historyLoaded}
          setActiveHistoryId={setActiveHistoryId}
          setActiveHistorySportTabId={setActiveHistorySportTabId}
        />
      ) : null}
      {activeDeskTab === 'stories' ? (
        <StoriesView
          activeStoryDay={activeStoryDay}
          activeStoryGame={activeStoryGame}
          activeStoryGameSummary={activeStoryGameSummary}
          activeStoryId={activeStoryId}
          activeStoryMetrics={activeStoryMetrics}
          activeStoryTimeline={activeStoryTimeline}
          activeStoryTimelineGroups={activeStoryTimelineGroups}
          classifyStoryEventTone={classifyStoryEventTone}
          getHistoryMetricTone={getHistoryMetricTone}
          loadingStoryDaysById={loadingStoryDaysById}
          setActiveStoryId={setActiveStoryId}
          setSelectedStoryGamePk={setSelectedStoryGamePk}
          storiesLoaded={storiesLoaded}
          storyArchive={storyArchive}
          storyRailDays={storyRailDays}
        />
      ) : null}
    </div>
  )
}

export default App

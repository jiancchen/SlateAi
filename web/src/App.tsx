import { useEffect, useMemo, useState } from 'react'
import {
  buildParlayModel,
  createParlayLeg,
  formatAmericanOdds,
  rankEfficientFavoritePicks,
  rankFlipRiskPicks,
  rankMlbPlayerProps
} from './lib/sports-model.js'
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
  loadStoryDayData,
  loadStoryGameData,
  loadStoryArchiveIndexData
} from './lib/archive-loaders'
import {
  defaultSlateDayId,
  fallbackSlateDayManifest,
  loadMlbPropBoardData,
  loadSlateDayData,
  loadSlateGameDetailData,
  loadSlateManifestData,
  type LoadedSlateDay,
  type SlateManifestEntry
} from './lib/slate-loaders'

type AnyRecord = Record<string, any>
type DeskTabId = 'board' | 'parlay' | 'tickets' | 'models' | 'history' | 'stories'
type SidebarTabId = 'ticket' | 'markets' | 'sources'

const PARLAY_MIN_LEGS = 2
const PARLAY_MAX_LEGS = 10

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

const tennisValueTone = (grade?: string | null) => {
  if (/bet-grade value/i.test(String(grade || ''))) return 'accent'
  if (/thin value|near fair/i.test(String(grade || ''))) return 'neutral'
  if (/negative ev/i.test(String(grade || ''))) return 'warning'
  return ''
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
      const sorted = [...picks].sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0))
      const byType = sorted.reduce((acc: Record<string, AnyRecord[]>, pick: AnyRecord) => {
        if (!acc[pick.propType]) acc[pick.propType] = []
        acc[pick.propType].push(pick)
        return acc
      }, {})
      const leader = sorted[0]
      return [
        gameId,
        {
          available: sorted.length > 0,
          targets: sorted,
          featured: sorted.slice(0, 6),
          byType,
          summary: leader
            ? `${leader.playerName} leads the tracked prop board for this game, with ${sorted.length} narrower lanes surviving the current filters.`
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

const buildLineupPlayerInspectionLine = (player: AnyRecord = {}, opposingHand = '') => {
  const notes = []
  if (Number.isFinite(Number(player.recent?.ops))) {
    notes.push(`Recent OPS ${formatSlashMetric(player.recent.ops)}`)
  }
  if (Number.isFinite(Number(player.split?.ops))) {
    const handLabel = opposingHand ? ` vs ${opposingHand}HP` : ''
    notes.push(`Split OPS ${formatSlashMetric(player.split.ops)}${handLabel}`)
  }
  if (Number.isFinite(Number(player.season?.ops))) {
    notes.push(`Season OPS ${formatSlashMetric(player.season.ops)}`)
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

const buildTeamSnapshotChips = ({
  teamState,
  lineupConversion,
  offenseContext,
  firstInningTeam
}: {
  teamState?: AnyRecord | null
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

const renderInningHistoryTable = (teamName: string, headerLabel: string, games: AnyRecord[] = []) => {
  if (!games.length) return null

  const maxInning = Math.max(
    9,
    ...games.map((game) => Array.isArray(game.innings) ? game.innings.length : 0)
  )
  const gridTemplateColumns = `84px repeat(${maxInning}, minmax(22px, 1fr)) 28px`

  return (
    <section className="matchup-history-block" aria-label={`${teamName} ${headerLabel} inning history`}>
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
          {games.map((game, index) => {
            const venueLabel = game.venueRole === 'road' ? '@' : 'vs'
            const scoreLabel =
              Number.isFinite(Number(game.runsFor)) && Number.isFinite(Number(game.runsAgainst))
                ? `${game.runsFor}-${game.runsAgainst}`
                : 'n/a'
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
      {renderMatchupStoryChart(teamName, headerLabel, games)}
    </section>
  )
}

const renderMatchupInningHistory = (teamName: string, opponentName: string, games: AnyRecord[] = []) =>
  renderInningHistoryTable(teamName, `vs ${opponentName}`, games)

const renderRecentInningHistory = (teamName: string, games: AnyRecord[] = []) =>
  renderInningHistoryTable(teamName, 'Last 5 overall', games)

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

const getCompetitorDisplayName = (game: AnyRecord, side: AnyRecord, index: number) => {
  if (game?.league === 'Tennis') {
    return side?.displayName || game.tennisContext?.players?.[index]?.label || side?.name || ''
  }
  return side?.name || ''
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
    if (projection.totals?.fullGame?.lean && projection.totals.fullGame.lean !== 'Pass') {
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
  const [activeDayId, setActiveDayId] = useState(defaultSlateDayId)
  const [activeDeskTab, setActiveDeskTab] = useState<DeskTabId>('board')
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
  const [loadedGameDetailsByDay, setLoadedGameDetailsByDay] = useState<Record<string, Record<string, AnyRecord>>>({})
  const [loadingGameDetailsByDay, setLoadingGameDetailsByDay] = useState<Record<string, Record<string, boolean>>>({})
  const [loadedPropBoardsByDay, setLoadedPropBoardsByDay] = useState<Record<string, AnyRecord | null>>({})
  const [loadingSlateIds, setLoadingSlateIds] = useState<Record<string, boolean>>({})
  const [historyArchive, setHistoryArchive] = useState<HistoryEntry[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [storyArchive, setStoryArchive] = useState<StoryArchiveIndexEntry[]>([])
  const [storiesLoaded, setStoriesLoaded] = useState(false)
  const [loadedStoryDaysById, setLoadedStoryDaysById] = useState<Record<string, StoryArchiveDaySummary>>({})
  const [loadingStoryDaysById, setLoadingStoryDaysById] = useState<Record<string, boolean>>({})
  const [loadedStoryGamesByDay, setLoadedStoryGamesByDay] = useState<Record<string, Record<number, StoryArchiveGame>>>({})
  const [loadingStoryGamesByDay, setLoadingStoryGamesByDay] = useState<Record<string, Record<number, boolean>>>({})
  const [activeStoryId, setActiveStoryId] = useState('')
  const [selectedStoryGamePk, setSelectedStoryGamePk] = useState<number | null>(null)

  useEffect(() => {
    const updateClock = () => setPacificClock(getPacificClock())
    updateClock()
    const timer = window.setInterval(updateClock, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false

    loadSlateManifestData()
      .then((manifest) => {
        if (cancelled || !manifest.length) return
        setSlateManifest(manifest)
        setActiveDayId((current) =>
          manifest.some((entry) => entry.id === current) ? current : manifest.at(-1)?.id || current
        )
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
    if (!storiesLoaded || !activeStoryId || loadedStoryDaysById[activeStoryId] || loadingStoryDaysById[activeStoryId]) return

    setLoadingStoryDaysById((current) => ({ ...current, [activeStoryId]: true }))
    loadStoryDayData(activeStoryId)
      .then((day) => {
        if (!day) return
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
  const filterOptions = activeDay?.filters?.length ? activeDay.filters : ['All']
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

  const activePropBoardByGame = useMemo(
    () => buildTrackedPropBoardByGame(loadedPropBoardsByDay[activeDayId] ?? null),
    [activeDayId, loadedPropBoardsByDay]
  )

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
        .map((prop: AnyRecord, index: number) => ({
          ...prop,
          rank: index + 1,
          game:
            games.find((game: AnyRecord) => game.id === prop.gameId) ??
            ({ id: prop.gameId, league: 'MLB', start: prop.start, stage: prop.stage, startMinutes: 0 } as AnyRecord)
        }))
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
              projectedLabel: `Proj ${totals.projectedFullTotalRuns} vs ${game.analysis.mlbProjection.postedTotal ?? 'N/A'}`
            },
            {
              id: 'first5',
              label: 'First 5',
              lean: totals.first5,
              projectedLabel: `Proj ${totals.projectedFirst5TotalRuns} vs ${totals.derivedFirst5TotalLine ?? 'N/A'}`
            },
            {
              id: 'late',
              label: 'Rest of game',
              lean: totals.late,
              projectedLabel: `Proj ${totals.projectedLateTotalRuns} vs ${totals.derivedLateTotalLine ?? 'N/A'}`
            }
          ]

          return phases
            .filter((phase) => phase.lean?.lean && phase.lean.lean !== 'Pass')
            .map((phase) => {
              const savedId = `${game.id}:total:${phase.id}`
              const confidence = Math.round(
                Math.min(
                  90,
                  54 + Math.abs(Number(phase.lean.edge) || 0) * 18 + Math.max((game.analysis.confidence || 50) - 56, 0) * 0.2
                )
              )

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
                tags: [phase.label, totals.bullpenExhaustionNote ? 'Bullpen live' : 'Model total'].slice(0, 2),
                invalid: eventState.invalid,
                statusLabel: eventState.label,
                tone: eventState.tone,
                selected: Boolean(selectedTotals[savedId]),
                raw: {
                  id: savedId,
                  gameId: game.id,
                  gameTitle: game.title,
                  league: game.league,
                  marketLabel: phase.lean.label,
                  phaseLabel: phase.label,
                  summary: phase.lean.summary,
                  strength: phase.lean.strength,
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
          tags: [prop.recommendationTier, prop.propLabel, prop.lineupStatus].filter(Boolean).slice(0, 3),
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

  const tennisValueSummary = useMemo(() => {
    const tennisGames = games.filter((game: AnyRecord) => game.league === 'Tennis')
    if (!tennisGames.length) return null
    const publishedValueSummary = (activeDay as AnyRecord | null)?.tennisValueSummary
    if (publishedValueSummary) {
      const summary = publishedValueSummary as AnyRecord
      const attachGame = (row: AnyRecord) => ({
        ...row,
        game: games.find((game: AnyRecord) => game.id === row.gameId) ?? null
      })
      return {
        ...summary,
        rows: (summary.rows || []).map(attachGame).filter((row: AnyRecord) => row.game),
        betGradeRows: (summary.betGradeRows || []).map(attachGame).filter((row: AnyRecord) => row.game),
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

    const countByGrade = rows.reduce((acc: Record<string, number>, row: AnyRecord) => {
      acc[row.valueGrade] = (acc[row.valueGrade] || 0) + 1
      return acc
    }, {})
    const betGradeRows = rows
      .filter((row: AnyRecord) => row.valueGrade === 'Bet-grade value')
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
      thinRows,
      negativeMlRows,
      note:
        activeDayIsoDate === '2026-05-28'
          ? 'May 28 is pre-match. May 27 backtest: ML value rows went 3-1 with +21.9% flat ROI; spreads went 1-3 and stay downgraded until the next settled pass.'
          : 'EV is model probability against the posted price. A likely winner can still be a bad bet if the payout is too small.'
    }
  }, [activeDay, activeDayIsoDate, games])

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

  const selectDay = (dayId: string) => {
    setActiveDayId(dayId)
    setActiveFilter('All')
  }

  const stepDay = (offset: number) => {
    const nextIndex = activeDayIndex + offset
    const target = orderedSlateDays[nextIndex]
    if (target) selectDay(target.id)
  }

  const openGame = (gameId: string) => {
    setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: gameId }))
    setActiveDeskTab('board')
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

  const renderMoneylinePanel = (game: AnyRecord) => {
    if (!game?.moneyline?.available) return null
    return (
      <section className="pick-panel" aria-label={`Parlay picks for ${game.title}`}>
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
              <span>{participant.name}</span>
              <strong>{participant.americanLabel}</strong>
              <small>{participant.impliedProbabilityLabel} implied</small>
            </button>
          ))}
        </div>
      </section>
    )
  }

  const renderMlbDetail = (game: AnyRecord) => {
    const projection = game.analysis?.mlbProjection
    const featuredProps = game.playerProps?.featured ?? []
    const allTrackedProps = game.playerProps?.targets ?? featuredProps
    const findPitcherStrikeoutProp = (pitcherName: string) =>
      allTrackedProps.find(
        (prop: AnyRecord) =>
          prop.propType === 'pitcherStrikeouts' &&
          normalizeNameToken(prop.playerName) === normalizeNameToken(pitcherName)
      ) ?? null
    const awayHold = Number(projection?.awayStarterHoldConfidence)
    const homeHold = Number(projection?.homeStarterHoldConfidence)
    const awayStarter = buildPitcherSummary(
      game.starterContext?.away,
      awayHold,
      game.stateContext?.firstInningPitcherSeason?.away ?? null,
      game.stateContext?.pitcherWar?.away ?? null,
      findPitcherStrikeoutProp(game.starterContext?.away?.fullName || '')
    )
    const homeStarter = buildPitcherSummary(
      game.starterContext?.home,
      homeHold,
      game.stateContext?.firstInningPitcherSeason?.home ?? null,
      game.stateContext?.pitcherWar?.home ?? null,
      findPitcherStrikeoutProp(game.starterContext?.home?.fullName || '')
    )
    const awayTeam = game.matchup?.[0]?.name ?? 'Away'
    const homeTeam = game.matchup?.[1]?.name ?? 'Home'
    const awayLineup = game.lineupBoard?.away
    const homeLineup = game.lineupBoard?.home
    const homeRunTargets = game.homeRunTargets?.featured ?? game.homeRunTargets?.targets ?? []
    const awayScript = projection?.teamScripts?.find((entry: AnyRecord) => entry.teamName === awayTeam)
    const homeScript = projection?.teamScripts?.find((entry: AnyRecord) => entry.teamName === homeTeam)
    const awaySummary = game.lineupBoard?.away?.summary ?? awayScript ?? {}
    const homeSummary = game.lineupBoard?.home?.summary ?? homeScript ?? {}
    const mergeBridgeChain = (primary: AnyRecord[] = [], fallback: AnyRecord[] = []) => {
      const fallbackByName = new Map(fallback.map((reliever: AnyRecord) => [reliever.name, reliever]))
      if (!primary.length) return fallback
      return primary.map((reliever: AnyRecord) => ({
        ...(fallbackByName.get(reliever.name) ?? {}),
        ...reliever
      }))
    }
    const awayBridge = mergeBridgeChain(
      projection?.awayLikelyRelievers?.length
        ? projection.awayLikelyRelievers
        : game.bullpenChainContext?.away?.topRelievers ?? [],
      awaySummary?.bullpenPitchTypeSummary?.relievers ?? []
    )
    const homeBridge = mergeBridgeChain(
      projection?.homeLikelyRelievers?.length
        ? projection.homeLikelyRelievers
        : game.bullpenChainContext?.home?.topRelievers ?? [],
      homeSummary?.bullpenPitchTypeSummary?.relievers ?? []
    )
    const awayBridgeScore = Number.isFinite(Number(projection?.awayBullpenChainScore))
      ? Number(projection?.awayBullpenChainScore)
      : Number(awaySummary?.bullpenPitchTypeSummary?.pressureIndex)
    const homeBridgeScore = Number.isFinite(Number(projection?.homeBullpenChainScore))
      ? Number(projection?.homeBullpenChainScore)
      : Number(homeSummary?.bullpenPitchTypeSummary?.pressureIndex)
    const awayRecentBullpenSummary = game.bullpenChainContext?.away?.recentBullpenSummary ?? null
    const homeRecentBullpenSummary = game.bullpenChainContext?.home?.recentBullpenSummary ?? null
    const awaySeasonBullpenSummary = game.bullpenContext?.away ?? null
    const homeSeasonBullpenSummary = game.bullpenContext?.home ?? null
    const awayStory = game.storyContext?.away?.summary
    const homeStory = game.storyContext?.home?.summary
    const awayRecentGames = game.stateContext?.recentGames?.away ?? []
    const homeRecentGames = game.stateContext?.recentGames?.home ?? []
    const awayTeamState = game.stateContext?.teamState?.away ?? null
    const homeTeamState = game.stateContext?.teamState?.home ?? null
    const awayLineupConversion = game.stateContext?.lineupConversion?.away ?? null
    const homeLineupConversion = game.stateContext?.lineupConversion?.home ?? null
    const awayFirstInningTeam = game.stateContext?.firstInningTeam?.away ?? null
    const homeFirstInningTeam = game.stateContext?.firstInningTeam?.home ?? null
    const awaySnapshotChips = buildTeamSnapshotChips({
      teamState: awayTeamState,
      lineupConversion: awayLineupConversion,
      offenseContext: game.offenseContext?.away ?? null,
      firstInningTeam: awayFirstInningTeam
    })
    const homeSnapshotChips = buildTeamSnapshotChips({
      teamState: homeTeamState,
      lineupConversion: homeLineupConversion,
      offenseContext: game.offenseContext?.home ?? null,
      firstInningTeam: homeFirstInningTeam
    })
    const awayBullpenPulse = buildBullpenPulseLine(awayRecentBullpenSummary, awaySeasonBullpenSummary)
    const homeBullpenPulse = buildBullpenPulseLine(homeRecentBullpenSummary, homeSeasonBullpenSummary)
    const awayRecentInningHistory = game.stateContext?.recentInningHistory?.away ?? []
    const homeRecentInningHistory = game.stateContext?.recentInningHistory?.home ?? []
    const awayMatchupHistory = game.stateContext?.matchupInningHistory?.away ?? []
    const homeMatchupHistory = game.stateContext?.matchupInningHistory?.home ?? []
    const gameStory = buildMlbGameStory({ game, projection, awayTeam, homeTeam })
    const totals = projection?.totals
    const totalsCards = totals
      ? [
          {
            id: 'full',
            title: 'Full game',
            lean: totals.fullGame,
            lineLabel: projection?.postedTotal != null ? `${projection.postedTotal}` : 'N/A',
            projectedLabel: `${formatNumber(totals.projectedFullTotalRuns, 1)} projected runs`,
            splitLabel: `${awayTeam} ${formatNumber(projection?.awayProjectedRuns, 1)} + ${homeTeam} ${formatNumber(projection?.homeProjectedRuns, 1)}`
          },
          {
            id: 'first5',
            title: 'First 5 innings',
            lean: totals.first5,
            lineLabel: totals.derivedFirst5TotalLine != null ? `${totals.derivedFirst5TotalLine}` : 'N/A',
            projectedLabel: `${formatNumber(totals.projectedFirst5TotalRuns, 1)} projected runs`,
            splitLabel: `${awayTeam} ${formatNumber(projection?.awayFirst5ProjectedRuns, 1)} + ${homeTeam} ${formatNumber(projection?.homeFirst5ProjectedRuns, 1)}`
          },
          {
            id: 'late',
            title: 'Rest of game',
            lean: totals.late,
            lineLabel: totals.derivedLateTotalLine != null ? `${totals.derivedLateTotalLine}` : 'N/A',
            projectedLabel: `${formatNumber(totals.projectedLateTotalRuns, 1)} projected runs`,
            splitLabel: `${awayTeam} ${formatNumber(projection?.awayLateProjectedRuns, 1)} + ${homeTeam} ${formatNumber(projection?.homeLateProjectedRuns, 1)}`
          },
          ...(projection?.firstInning
            ? [
                {
                  id: 'first-inning',
                  title: 'Run in 1st',
                  lean: projection.firstInning,
                  lineLabel: '0.5 run',
                  projectedLabel: `${formatPercent(projection.firstInning.yesProbabilityPct, 0)} YRFI / ${formatPercent(projection.firstInning.noProbabilityPct, 0)} NRFI`,
                  splitLabel: `${awayTeam} ${formatPercent(projection.firstInning.awayRunProbabilityPct, 0)} score · ${homeTeam} ${formatPercent(projection.firstInning.homeRunProbabilityPct, 0)} score`,
                  reasonStack: Array.isArray(projection.firstInning.reasonStack) ? projection.firstInning.reasonStack : [],
                  cautionStack: Array.isArray(projection.firstInning.cautionStack) ? projection.firstInning.cautionStack : []
                }
              ]
            : [])
        ]
      : []
    const gameFlowOverview = buildGameFlowOverview({
      projection,
      analysis: game.analysis,
      awayTeam,
      homeTeam,
      awayHold,
      homeHold
    })
    const pointEdgeHeadline = buildEdgeHeadline(projection?.edgeTeam || '', projection?.edgeHits, 'H', 'Even board')
    const first5EdgeHeadline = buildEdgeHeadline(projection?.first5EdgeTeam || '', projection?.first5EdgeHits, 'H', 'Even first 5')
    const lateEdgeHeadline = buildEdgeHeadline(projection?.lateEdgeTeam || '', projection?.lateEdgeHits, 'H', 'Even late')
    const sidePickName = game.analysis?.participant?.name || projection?.edgeTeam || 'Pass'
    const sidePickConflict =
      sidePickName && projection?.edgeTeam && sidePickName !== projection.edgeTeam && game.analysis?.tier === 'Pass'
    const awayPitcherTypeLabel = buildPitcherTypeLabel(game.starterContext?.away ?? {}, projection?.awayPitcherType)
    const homePitcherTypeLabel = buildPitcherTypeLabel(game.starterContext?.home ?? {}, projection?.homePitcherType)
    const renderBridgeChainCard = (
      teamName: string,
      relievers: AnyRecord[],
      chainScore: number,
      workloadLabel: string,
      advantage: boolean,
      recentBullpenSummary: AnyRecord | null,
      seasonBullpenSummary: AnyRecord | null
    ) => (
      <article className={`bridge-chain-card-react ${advantage ? 'advantage' : ''}`}>
        <div className="bridge-chain-card-head">
          <div>
            <p className="eyebrow">{teamName} bridge chain</p>
            <strong>{Number.isFinite(chainScore) ? `${chainScore.toFixed(1)} score` : 'No chain score'}</strong>
          </div>
          <span className={`builder-status-pill ${workloadLabel === 'unknown' ? 'invalid' : 'open'}`}>
            {workloadLabel === 'unknown' ? 'Unknown workload' : workloadLabel}
          </span>
        </div>
        {recentBullpenSummary && Number(recentBullpenSummary.gamesSample || 0) > 0 ? (
          <p className="react-section-copy">
            Last {Number(recentBullpenSummary.gamesSample || 0)} bullpen games: {formatNumber(recentBullpenSummary.era, 2)} ERA / {formatNumber(recentBullpenSummary.whip, 2)} WHIP
            {seasonBullpenSummary && !seasonBullpenSummary.staleFeed
              ? ` vs season ${formatNumber(seasonBullpenSummary.era, 2)} ERA / ${formatNumber(seasonBullpenSummary.whip, 2)} WHIP`
              : ''}
          </p>
        ) : null}
        {relievers.length ? (
          <div className="bridge-chain-list">
            {relievers.slice(0, 2).map((reliever) => (
              <div key={`${teamName}-${reliever.pitcherId || reliever.name}`} className="bridge-chain-row">
                <div>
                  <strong>{reliever.name}</strong>
                  <small>{reliever.role || 'middle'} · {formatNumber(reliever.expectedOuts, 2)} outs</small>
                  {Number(reliever.recentTeamGamesSample || 0) > 0 ? (
                    <small>
                      First up in {Number(reliever.recentFirstRelieverCountLast5Games || 0)}/{Number(reliever.recentTeamGamesSample || 0)} recent team games
                    </small>
                  ) : null}
                  {reliever.pitchMixSummary ? <small>{reliever.pitchMixSummary}</small> : null}
                </div>
                <div className="bridge-chain-meta">
                  <span>First up {formatNumber(reliever.firstRelieverLikelihood, 0)}%</span>
                  <small>
                    Availability {formatNumber(reliever.availabilityScore, 0)}/100
                    {reliever.backToBack ? ' · B2B' : reliever.workedYesterday ? ' · worked yesterday' : ''}
                  </small>
                  {reliever.topAttackers?.length ? (
                    <small>
                      Top attackers: {reliever.topAttackers.slice(0, 2).map((hitter: AnyRecord) => hitter.name).join(', ')}
                    </small>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="react-section-copy">No likely bridge chain stored yet for this club on the current warehouse pass.</p>
        )}
      </article>
    )

    return (
      <>
        <section className="detail-panel game-story-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Game story</p>
            <span>{gameStory.headline}</span>
          </div>
          {gameStory.chips.length ? (
            <div className="react-pill-row game-story-chip-row">
              {gameStory.chips.map((chip) => (
                <span key={`${game.id}-${chip.label}`} className={`game-highlight-chip ${chip.tone}`}>
                  {chip.label}
                </span>
              ))}
            </div>
          ) : null}
          <div className="game-story-grid">
            {gameStory.cards.map((card) => (
              <article key={`${game.id}-${card.label}`} className={`game-story-card ${card.tone}`}>
                <small>{card.label}</small>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="detail-panel react-card-grid">
          <article className="react-team-card" style={{ borderColor: `${getTeamAccent('MLB', awayTeam)}55` }}>
            <div className="react-team-card-top">
              <div className="react-team-id">
                {getTeamLogoUrl('MLB', awayTeam) ? <img src={getTeamLogoUrl('MLB', awayTeam)} alt={awayTeam} className="react-team-logo" /> : null}
                <div>
                  <strong>{awayTeam}</strong>
                  <small>{buildTeamContextSummary(game.teamContext?.away)}</small>
                  {renderRecentGamesStrip(awayTeam, awayRecentGames)}
                  {awaySnapshotChips.length ? (
                    <div className="pitcher-summary-chip-row secondary team-snapshot-chip-row">
                      {awaySnapshotChips.map((stat) => (
                        <span key={`${awayTeam}-snapshot-${stat.label}`} className="pitcher-summary-chip muted">
                          <small>{stat.label}</small>
                          <strong>{stat.value}</strong>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {awayBullpenPulse ? <small>{awayBullpenPulse}</small> : null}
                </div>
              </div>
              <span className="builder-status-pill open">{lineupStatusLabel(game.lineupBoard?.status?.away)}</span>
            </div>
            {renderRecentInningHistory(awayTeam, awayRecentInningHistory)}
            {renderMatchupInningHistory(awayTeam, homeTeam, awayMatchupHistory)}
            <div className="pitcher-summary-block">
              <strong className="pitcher-summary-headline">{awayStarter.headline}</strong>
              <p className="pitcher-summary-line">{awayStarter.primary}</p>
              {awayStarter.usageStatusLabel ? (
                <div className="pitcher-summary-kicker-row">
                  <span className="pitcher-summary-kicker">{awayStarter.usageStatusLabel}</span>
                  {awayStarter.usageLabel ? <span className="pitcher-summary-kicker muted">{awayStarter.usageLabel}</span> : null}
                </div>
              ) : null}
              {awayStarter.detailStats.length ? (
                <div className="pitcher-summary-chip-row">
                  {awayStarter.detailStats.map((stat) => (
                    <span key={`${awayTeam}-${stat.label}`} className="pitcher-summary-chip">
                      <small>{stat.label}</small>
                      <strong>{stat.value}</strong>
                    </span>
                  ))}
                </div>
              ) : null}
              {awayStarter.trendStats.length ? (
                <div className="pitcher-summary-chip-row secondary">
                  {awayStarter.trendStats.map((stat) => (
                    <span key={`${awayTeam}-trend-${stat.label}`} className="pitcher-summary-chip muted">
                      <small>{stat.label}</small>
                      <strong>{stat.value}</strong>
                    </span>
                  ))}
                </div>
              ) : null}
              {awayStarter.savant?.playerUrl ? (
                <div className="pitcher-summary-link-row">
                  <a href={awayStarter.savant.playerUrl} target="_blank" rel="noreferrer">Savant</a>
                  {awayStarter.savant?.statsUrls?.splits ? (
                    <a href={awayStarter.savant.statsUrls.splits} target="_blank" rel="noreferrer">Splits</a>
                  ) : null}
                  {awayStarter.savant?.statsUrls?.gamelogs ? (
                    <a href={awayStarter.savant.statsUrls.gamelogs} target="_blank" rel="noreferrer">Logs</a>
                  ) : null}
                  {awayStarter.savant?.statsUrls?.statcast ? (
                    <a href={awayStarter.savant.statsUrls.statcast} target="_blank" rel="noreferrer">Statcast</a>
                  ) : null}
                </div>
              ) : null}
            </div>
            {awayStarter.recent ? <small>{awayStarter.recent}</small> : null}
            {awayStarter.firstInningSeasonLine ? <small>{awayStarter.firstInningSeasonLine}</small> : null}
            {awayStarter.warLine ? <small>{awayStarter.warLine}</small> : null}
            {awayStarter.strikeoutLine ? <small>{awayStarter.strikeoutLine}</small> : null}
            {awayStarter.strikeoutPickLine ? <small>{awayStarter.strikeoutPickLine}</small> : null}
            {!awayStarter.recent && awayStarter.usageNote ? <small>{awayStarter.usageNote}</small> : null}
            {awayStory ? <p className="react-section-copy">{awayStory}</p> : null}
            {awayScript ? (
              <>
                <p className="react-section-copy">{awayScript.overview}</p>
                <div className="react-pill-row">
                  {(awayScript.overperformHitters ?? []).slice(0, 3).map((hitter: AnyRecord) => (
                    <span key={`${awayTeam}-${hitter.name}`} className="game-highlight-chip accent">
                      {hitter.name}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </article>

          <article className="react-team-card" style={{ borderColor: `${getTeamAccent('MLB', homeTeam)}55` }}>
            <div className="react-team-card-top">
              <div className="react-team-id">
                {getTeamLogoUrl('MLB', homeTeam) ? <img src={getTeamLogoUrl('MLB', homeTeam)} alt={homeTeam} className="react-team-logo" /> : null}
                <div>
                  <strong>{homeTeam}</strong>
                  <small>{buildTeamContextSummary(game.teamContext?.home)}</small>
                  {renderRecentGamesStrip(homeTeam, homeRecentGames)}
                  {homeSnapshotChips.length ? (
                    <div className="pitcher-summary-chip-row secondary team-snapshot-chip-row">
                      {homeSnapshotChips.map((stat) => (
                        <span key={`${homeTeam}-snapshot-${stat.label}`} className="pitcher-summary-chip muted">
                          <small>{stat.label}</small>
                          <strong>{stat.value}</strong>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {homeBullpenPulse ? <small>{homeBullpenPulse}</small> : null}
                </div>
              </div>
              <span className="builder-status-pill open">{lineupStatusLabel(game.lineupBoard?.status?.home)}</span>
            </div>
            {renderRecentInningHistory(homeTeam, homeRecentInningHistory)}
            {renderMatchupInningHistory(homeTeam, awayTeam, homeMatchupHistory)}
            <div className="pitcher-summary-block">
              <strong className="pitcher-summary-headline">{homeStarter.headline}</strong>
              <p className="pitcher-summary-line">{homeStarter.primary}</p>
              {homeStarter.usageStatusLabel ? (
                <div className="pitcher-summary-kicker-row">
                  <span className="pitcher-summary-kicker">{homeStarter.usageStatusLabel}</span>
                  {homeStarter.usageLabel ? <span className="pitcher-summary-kicker muted">{homeStarter.usageLabel}</span> : null}
                </div>
              ) : null}
              {homeStarter.detailStats.length ? (
                <div className="pitcher-summary-chip-row">
                  {homeStarter.detailStats.map((stat) => (
                    <span key={`${homeTeam}-${stat.label}`} className="pitcher-summary-chip">
                      <small>{stat.label}</small>
                      <strong>{stat.value}</strong>
                    </span>
                  ))}
                </div>
              ) : null}
              {homeStarter.trendStats.length ? (
                <div className="pitcher-summary-chip-row secondary">
                  {homeStarter.trendStats.map((stat) => (
                    <span key={`${homeTeam}-trend-${stat.label}`} className="pitcher-summary-chip muted">
                      <small>{stat.label}</small>
                      <strong>{stat.value}</strong>
                    </span>
                  ))}
                </div>
              ) : null}
              {homeStarter.savant?.playerUrl ? (
                <div className="pitcher-summary-link-row">
                  <a href={homeStarter.savant.playerUrl} target="_blank" rel="noreferrer">Savant</a>
                  {homeStarter.savant?.statsUrls?.splits ? (
                    <a href={homeStarter.savant.statsUrls.splits} target="_blank" rel="noreferrer">Splits</a>
                  ) : null}
                  {homeStarter.savant?.statsUrls?.gamelogs ? (
                    <a href={homeStarter.savant.statsUrls.gamelogs} target="_blank" rel="noreferrer">Logs</a>
                  ) : null}
                  {homeStarter.savant?.statsUrls?.statcast ? (
                    <a href={homeStarter.savant.statsUrls.statcast} target="_blank" rel="noreferrer">Statcast</a>
                  ) : null}
                </div>
              ) : null}
            </div>
            {homeStarter.recent ? <small>{homeStarter.recent}</small> : null}
            {homeStarter.firstInningSeasonLine ? <small>{homeStarter.firstInningSeasonLine}</small> : null}
            {homeStarter.warLine ? <small>{homeStarter.warLine}</small> : null}
            {homeStarter.strikeoutLine ? <small>{homeStarter.strikeoutLine}</small> : null}
            {homeStarter.strikeoutPickLine ? <small>{homeStarter.strikeoutPickLine}</small> : null}
            {!homeStarter.recent && homeStarter.usageNote ? <small>{homeStarter.usageNote}</small> : null}
            {homeStory ? <p className="react-section-copy">{homeStory}</p> : null}
            {homeScript ? (
              <>
                <p className="react-section-copy">{homeScript.overview}</p>
                <div className="react-pill-row">
                  {(homeScript.overperformHitters ?? []).slice(0, 3).map((hitter: AnyRecord) => (
                    <span key={`${homeTeam}-${hitter.name}`} className="game-highlight-chip accent">
                      {hitter.name}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </article>
        </section>

        {projection ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">Game flow</p>
              <span>{projection.weather?.label || 'No weather note'}</span>
            </div>
            <p className="react-section-copy">{gameFlowOverview}</p>
            {projection?.lineupSimulation?.phases?.length ? (
              <div className="react-pill-row">
                {projection.lineupSimulation.phases.slice(0, 3).map((phase: AnyRecord) => (
                  <span key={`${game.id}-${phase.label}`} className="game-highlight-chip neutral">
                    {phase.label}: {phase.edgeTeam} {phase.projection}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mlb-signal-grid">
              <article className={`mlb-signal-card ${getMetricTone(Number(projection?.edgeHits))}`}>
                <div className="mlb-signal-head">
                  <MetricHelp
                    label="Point edge"
                    help="Projected full-game hit and traffic gap. This is the raw traffic script leader, not automatically the final side pick."
                  />
                  <span>{projection.edgeTeam || 'Even'}</span>
                </div>
                <strong>{pointEdgeHeadline}</strong>
                <small>
                  {awayTeam} {projection.awayProjectedHits} H at {projection.awayHitEfficiencyPct}% vs {homeTeam} {projection.homeProjectedHits} H at {projection.homeHitEfficiencyPct}%
                </small>
              </article>

              <article className={`mlb-signal-card ${getMetricTone(Number(projection?.first5EdgeHits))}`}>
                <div className="mlb-signal-head">
                  <MetricHelp
                    label="First 5 edge"
                    help="Projected first-five hit edge after folding in lineup fit, starter form, and starter hold confidence. This is the starter-window traffic script."
                  />
                  <span>{projection.first5EdgeTeam || 'Even'}</span>
                </div>
                <strong>{first5EdgeHeadline}</strong>
                <small>
                  {awayTeam} {projection.awayFirst5ProjectedHits} H vs {homeTeam} {projection.homeFirst5ProjectedHits} H
                </small>
              </article>

              <article className={`mlb-signal-card ${getMetricTone(Number(projection?.lateEdgeHits))}`}>
                <div className="mlb-signal-head">
                  <MetricHelp
                    label="Late edge"
                    help="Projected rest-of-game hit edge once the starters hand the game to the likely bridge relievers. This is the bridge-and-finish traffic script."
                  />
                  <span>{projection.lateEdgeTeam || 'Even'}</span>
                </div>
                <strong>{lateEdgeHeadline}</strong>
                <small>
                  {awayTeam} {projection.awayLateProjectedHits} H vs {homeTeam} {projection.homeLateProjectedHits} H
                </small>
              </article>

              <article className={`mlb-signal-card ${awayHold >= homeHold ? 'accent' : 'warning'}`}>
                <div className="mlb-signal-head">
                  <MetricHelp
                    label="Starter hold"
                    help="Estimated ability for each starter to hold their lane before handing the game to the bullpen. Higher means the starter is likelier to survive cleanly."
                  />
                  <span>{awayHold >= homeHold ? awayTeam : homeTeam}</span>
                </div>
                <strong>{awayTeam} {formatNumber(awayHold, 1)} vs {homeTeam} {formatNumber(homeHold, 1)}</strong>
                <small>{awayTeam}: {awayPitcherTypeLabel} · {homeTeam}: {homePitcherTypeLabel}</small>
              </article>

              <article className={`mlb-signal-card ${projection.bridgeEdgeTeam ? 'warning' : 'neutral'}`}>
                <div className="mlb-signal-head">
                  <MetricHelp
                    label="Bridge chain"
                    help="Likely first two relievers plus their workload and bridge quality. This is the cleanest read on who is likelier to control the middle innings."
                  />
                  <span>{projection.bridgeEdgeTeam || 'Even'}</span>
                </div>
                <strong>{projection.bridgeEdgeTeam ? `${projection.bridgeEdgeTeam} +${formatNumber(projection.bridgeEdgeScore, 1)}` : 'No bridge split'}</strong>
                <small>
                  {awayTeam} {Number.isFinite(awayBridgeScore) ? awayBridgeScore.toFixed(1) : 'n/a'} vs {homeTeam} {Number.isFinite(homeBridgeScore) ? homeBridgeScore.toFixed(1) : 'n/a'}
                </small>
              </article>
            </div>
            <div className="react-card-grid">
              <article className="react-mini-panel">
                <span className="eyebrow">Model edge</span>
                <strong>{sidePickConflict ? `${sidePickName} pass-grade dog` : game.analysis?.modelEdgeLabel || 'No edge stored'}</strong>
                <small>
                  {sidePickConflict
                    ? `${sidePickName} only survives here as a protected-dog or pass lane. ${projection.edgeTeam} own the raw traffic script, while ${awayHold >= homeHold ? awayTeam : homeTeam}${projection.bridgeEdgeTeam ? ` and ${projection.bridgeEdgeTeam}` : ''} carry the cleaner survival phases.`
                    : game.analysis?.indicators?.projectedHitEdgeForPick !== undefined
                      ? Number(game.analysis.indicators.projectedHitEdgeForPick) >= 0
                        ? `${game.analysis?.participant?.name || projection.edgeTeam} carry a real ${formatNumber(game.analysis.indicators.projectedHitEdgeForPick, 1)}-hit edge behind the side pick.`
                        : `${game.analysis?.participant?.name || projection.edgeTeam} trail the raw hit script by ${formatNumber(Math.abs(Number(game.analysis.indicators.projectedHitEdgeForPick)), 1)} hits, so this side needs its starter or bridge edge to hold.`
                      : 'Use together with traffic script, bridge chain, and lineup pressure.'}
                </small>
              </article>
              <article className="react-mini-panel">
                <span className="eyebrow">First 5 traffic</span>
                <strong>{projection.first5EdgeTeam || 'Even'}</strong>
                <small>{projection.totals?.first5?.summary}</small>
              </article>
              <article className="react-mini-panel">
                <span className="eyebrow">Bridge traffic</span>
                <strong>{projection.bridgeEdgeTeam || 'Even'}</strong>
                <small>{projection.totals?.late?.summary}</small>
              </article>
              <article className="react-mini-panel">
                <span className="eyebrow">Full-game traffic</span>
                <strong>{projection.edgeTeam || game.analysis?.participant?.name}</strong>
                <small>{projection.totals?.fullGame?.summary}</small>
              </article>
            </div>
          </section>
        ) : null}

        {projection ? (
          <section className="detail-panel totals-board">
            <div className="detail-panel-header">
              <p className="eyebrow">Over / under board</p>
              <span>{totals?.weatherNote || 'Full game plus inning splits'}</span>
            </div>
            <div className="totals-grid">
              {totalsCards.map((card) => (
                <article key={`${game.id}-${card.id}`} className="totals-card">
                  <div className="totals-card-head">
                    <div>
                      <p className="eyebrow">{card.title}</p>
                      <strong>{card.lean?.label || 'Pass'}</strong>
                    </div>
                    <span>{card.lean?.strength || 'Pass'}</span>
                  </div>
                  <small>{card.lean?.summary || 'No totals edge stored for this phase.'}</small>
                  <span>{card.projectedLabel}</span>
                  <small>Line: {card.lineLabel}</small>
                  <small>{card.splitLabel}</small>
                  {Array.isArray((card as AnyRecord).reasonStack) && (card as AnyRecord).reasonStack.length ? (
                    <div className="first-inning-reason-stack">
                      <strong>Why</strong>
                      <ul>
                        {((card as AnyRecord).reasonStack as string[]).map((reason, index) => (
                          <li key={`${game.id}-${card.id}-reason-${index}`}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {Array.isArray((card as AnyRecord).cautionStack) && (card as AnyRecord).cautionStack.length ? (
                    <div className="first-inning-reason-stack caution">
                      <strong>Counterweights</strong>
                      <ul>
                        {((card as AnyRecord).cautionStack as string[]).map((reason, index) => (
                          <li key={`${game.id}-${card.id}-caution-${index}`}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            <small className="totals-footnote">
              {totals?.bullpenExhaustionNote || 'No bullpen or weather totals note stored yet.'}
            </small>
          </section>
        ) : null}

        {projection ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">Bridge chains</p>
              <span>{projection.bridgeEdgeTeam ? `${projection.bridgeEdgeTeam} hold the cleaner middle-innings lane` : 'Bridge lanes are close on this pass'}</span>
            </div>
            <div className="bridge-chain-grid-react">
              {renderBridgeChainCard(
                awayTeam,
                awayBridge,
                awayBridgeScore,
                projection.awayBullpenExhaustionLabel || 'unknown',
                projection.bridgeEdgeTeam === awayTeam,
                awayRecentBullpenSummary,
                awaySeasonBullpenSummary
              )}
              {renderBridgeChainCard(
                homeTeam,
                homeBridge,
                homeBridgeScore,
                projection.homeBullpenExhaustionLabel || 'unknown',
                projection.bridgeEdgeTeam === homeTeam,
                homeRecentBullpenSummary,
                homeSeasonBullpenSummary
              )}
            </div>
          </section>
        ) : null}

        {game.lineupBoard ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">Lineups</p>
              <span>{game.lineupBoard.weather?.label || game.lineupBoard.marketWeatherContext?.total || 'Projected board'}</span>
            </div>
            <div className="react-lineup-columns">
              {[awayLineup, homeLineup].map((lineupTeam: AnyRecord, index: number) => {
                if (!lineupTeam) return null
                const teamName = index === 0 ? awayTeam : homeTeam
                return (
                  <article key={teamName} className="react-lineup-card">
                    <div className="react-lineup-card-head">
                      <strong>{teamName}</strong>
                      <small>{lineupStatusLabel(index === 0 ? game.lineupBoard?.status?.away : game.lineupBoard?.status?.home)}</small>
                    </div>
                    <div className="react-pill-row">
                      <span className="game-highlight-chip neutral">
                        <MetricHelp
                          label={`Top third ${formatNumber(lineupTeam.summary?.topThirdScore, 1)}`}
                          help="How strong the top of the order looks against today's starter lane. Higher means more early scoring pressure."
                        />
                      </span>
                      <span className="game-highlight-chip neutral">
                        <MetricHelp
                          label={`Depth ${formatNumber(lineupTeam.summary?.depthScore, 0)}`}
                          help="Bottom-half lineup quality after the stars. Higher depth matters more once the lineup turns over and the game gets into middle innings."
                        />
                      </span>
                      <span className="game-highlight-chip accent">
                        <MetricHelp
                          label={lineupTeam.summary?.pressureLabel || 'Lineup pressure'}
                          help="Short read on how this batting order is expected to apply pressure today based on form, split fit, and pitch-type matchup."
                        />
                      </span>
                    </div>
                    <div className="lineup-matchup-board">
                      <div className="lineup-matchup-head">
                        <strong>
                          Vs {lineupTeam.opposingStarter?.name} ({lineupTeam.opposingStarter?.hand}HP, {lineupTeam.opposingStarter?.type?.toLowerCase() || 'unknown lane'})
                        </strong>
                        <small>Starter mix: {lineupTeam.opposingStarter?.pitchMixSummary || 'Pitch mix not stored'}</small>
                        {lineupTeam.summary?.bullpenPitchTypeSummary?.firstReliever?.pitchMixSummary ? (
                          <small>
                            1st bridge mix: {lineupTeam.summary.bullpenPitchTypeSummary.firstReliever.name} · {lineupTeam.summary.bullpenPitchTypeSummary.firstReliever.pitchMixSummary}
                          </small>
                        ) : null}
                      </div>
                      <p className="react-section-copy">{lineupTeam.summary?.overview || lineupTeam.summary?.bullpenOverview || lineupTeam.opposingStarter?.pitchMixSummary}</p>
                      <div className="react-pill-row">
                        {(lineupTeam.summary?.overperformHitters || []).slice(0, 3).map((hitter: AnyRecord, hitterIndex: number) => (
                          <span key={`${teamName}-carry-${hitter.name}-${hitter.tag || 'x'}-${hitterIndex}`} className="game-highlight-chip accent">
                            {hitter.name} {hitter.tag}
                          </span>
                        ))}
                        {(lineupTeam.summary?.underperformHitters || []).slice(0, 2).map((hitter: AnyRecord, hitterIndex: number) => (
                          <span key={`${teamName}-fade-${hitter.name}-${hitter.tag || 'x'}-${hitterIndex}`} className="game-highlight-chip danger">
                            {hitter.name} {hitter.tag}
                          </span>
                        ))}
                      </div>
                      {lineupTeam.summary?.bullpenOverview ? <small>{lineupTeam.summary.bullpenOverview}</small> : null}
                      {lineupTeam.summary?.bullpenOverperformHitters?.length ? (
                        <div className="react-pill-row">
                          {lineupTeam.summary.bullpenOverperformHitters.slice(0, 3).map((hitter: AnyRecord, hitterIndex: number) => (
                            <span key={`${teamName}-bridge-${hitter.name}-${hitter.slot ?? 'x'}-${hitterIndex}`} className="game-highlight-chip warning">
                              Bridge: {hitter.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {lineupTeam.bvpHistory ? (
                        <div className="lineup-bvp-block">
                          <small>{lineupTeam.bvpHistory.summary}</small>
                          <div className="react-pill-row">
                            {(lineupTeam.bvpHistory.hot || []).slice(0, 2).map((entry: AnyRecord, entryIndex: number) => (
                              <span key={`${teamName}-bvp-hot-${entry.name}-${entry.sample || 'x'}-${entryIndex}`} className="game-highlight-chip accent">
                                BvP hot: {entry.name} {entry.sample}
                                {entry.homeRuns ? `, ${entry.homeRuns} HR` : ''}
                              </span>
                            ))}
                            {(lineupTeam.bvpHistory.cold || []).slice(0, 2).map((entry: AnyRecord, entryIndex: number) => (
                              <span key={`${teamName}-bvp-cold-${entry.name}-${entry.sample || 'x'}-${entryIndex}`} className="game-highlight-chip danger">
                                BvP cold: {entry.name} {entry.sample}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="react-lineup-list">
                      {(lineupTeam.lineup ?? []).slice(0, 9).map((player: AnyRecord) => (
                        <div key={`${teamName}-${player.playerId}-${player.slot}`} className="react-lineup-player">
                          <div>
                            <strong>{player.slot}. {player.name}</strong>
                            <small>{player.position} · {player.bats} · {player.primaryTag}</small>
                          </div>
                          <div className="react-lineup-player-metrics">
                            <span className={`game-highlight-chip ${getMetricTone(Number(player.metrics?.matchupGrade))}`}>
                              Matchup {formatSignedNumber(player.metrics?.matchupGrade, 1)}
                            </span>
                            <span className={`game-highlight-chip ${getMetricTone(Number(player.metrics?.pitchTypeGrade))}`}>
                              Pitch fit {formatSignedNumber(player.metrics?.pitchTypeGrade, 1)}
                            </span>
                          </div>
                          <span>{player.matchupNote} · {player.pitchType?.summary || player.summary}</span>
                          {buildLineupPlayerInspectionLine(player, lineupTeam.opposingStarter?.hand) ? (
                            <small className="react-lineup-player-inspection">
                              {buildLineupPlayerInspectionLine(player, lineupTeam.opposingStarter?.hand)}
                            </small>
                          ) : null}
                          {player.savant?.playerUrl ? (
                            <div className="react-lineup-player-links">
                              <a href={player.savant.playerUrl} target="_blank" rel="noreferrer">Savant</a>
                              {player.savant?.statsUrls?.splits ? (
                                <a href={player.savant.statsUrls.splits} target="_blank" rel="noreferrer">Splits</a>
                              ) : null}
                              {player.savant?.statsUrls?.gamelogs ? (
                                <a href={player.savant.statsUrls.gamelogs} target="_blank" rel="noreferrer">Logs</a>
                              ) : null}
                              {player.savant?.statsUrls?.statcast ? (
                                <a href={player.savant.statsUrls.statcast} target="_blank" rel="noreferrer">Statcast</a>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        {featuredProps.length > 0 ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">Featured props</p>
              <span>{game.playerProps?.summary}</span>
            </div>
            <div className="react-prop-grid">
              {featuredProps.slice(0, 6).map((prop: AnyRecord) => (
                <article key={prop.id} className="react-prop-card">
                  <div className="react-prop-head">
                    <strong>{prop.playerName}</strong>
                    <span>{prop.confidence}%</span>
                  </div>
                  <p>{prop.marketLabel}</p>
                  <small>{prop.statValueLabel}</small>
                  <small>{prop.reason}</small>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {homeRunTargets.length > 0 ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">Home run board</p>
              <span>Weighted candidates</span>
            </div>
            <div className="react-prop-grid">
              {homeRunTargets.slice(0, 6).map((target: AnyRecord) => (
                <article key={target.id ?? `${target.teamName}-${target.playerName}`} className="react-prop-card">
                  <div className="react-prop-head">
                    <strong>{target.playerName}</strong>
                    <span>{target.shareLabel || `${Math.round((target.weightedShare ?? 0) * 100)}%`}</span>
                  </div>
                  <p>{target.teamName}</p>
                  <small>{target.reason || target.summary || target.formSummary}</small>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </>
    )
  }

  const renderTennisDetail = (game: AnyRecord) => {
    const context = game.tennisContext
    const projection = context?.projection
    const tradePlan = context?.tradePlan
    const weaknessEdge = context?.weaknessEdge
    const marketEconomics = context?.marketEconomics
    const warehouseContext = context?.warehouseContext || context?.sofascoreData
    const clayMatchupData = context?.clayMatchupData
    const opponentQualityData = context?.opponentQualityData
    const qualityPlayers = Array.isArray(opponentQualityData?.players) ? opponentQualityData.players : []
    const formatRecord = (record?: AnyRecord | null) => {
      if (!record || !Number.isFinite(Number(record.wins)) || !Number.isFinite(Number(record.losses))) return 'N/A'
      const pct = Number.isFinite(Number(record.winPct)) ? ` · ${formatPercent(Number(record.winPct) * 100, 1)}` : ''
      return `${record.wins}-${record.losses}${pct}`
    }
    const formatRank = (player: AnyRecord) => {
      const rank = player?.ranking?.rank
      return Number.isFinite(Number(rank)) ? `#${rank} ${player?.ranking?.tour || ''}`.trim() : 'Rank outside board'
    }
    const formatIdentity = (ranking?: AnyRecord | null) => {
      const parts = [
        ranking?.country,
        Number.isFinite(Number(ranking?.age)) ? `Age ${ranking.age}` : null,
        Number.isFinite(Number(ranking?.points)) ? `${Number(ranking.points).toLocaleString('en-US')} pts` : null
      ].filter(Boolean)
      return parts.length ? parts.join(' · ') : 'No profile data'
    }
    const marketValueTone = (edgePct: any) => {
      const edge = Number(edgePct)
      if (!Number.isFinite(edge)) return ''
      if (edge >= 7) return 'accent'
      if (edge <= -4) return 'warning'
      return ''
    }
    const marketValueLabel = (edgePct: any) => {
      const edge = Number(edgePct)
      if (!Number.isFinite(edge)) return 'No model edge'
      if (edge >= 7) return 'Positive value'
      if (edge <= -4) return 'Bad price'
      return 'Near fair'
    }
    const statDisplay = (stat?: AnyRecord | null) => {
      if (!stat) return 'Pending'
      if (stat.raw !== undefined && stat.raw !== null && stat.raw !== '') return String(stat.raw)
      if (Number.isFinite(Number(stat.percentage))) return `${Math.round(Number(stat.percentage))}%`
      if (Number.isFinite(Number(stat.numeric))) return formatNumber(Number(stat.numeric), 0)
      return 'Pending'
    }
    const expectedStatDisplay = (expectedStats: AnyRecord | null | undefined, key: string, suffix = '') => {
      const value = expectedStats?.stats?.[key]
      if (value === null || value === undefined || value === '') return 'No expected row'
      if (!Number.isFinite(Number(value))) return 'No expected row'
      return `Exp ${formatNumber(Number(value), Number(value) % 1 === 0 ? 0 : 1)}${suffix}`
    }
    const statWithExpected = (actual: AnyRecord | null | undefined, expectedStats: AnyRecord | null | undefined, expectedKey: string, suffix = '') => {
      if (actual) return statDisplay(actual)
      return expectedStatDisplay(expectedStats, expectedKey, suffix)
    }
    const normalizeTennisName = (value: string) => {
      const normalized = String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/gi, ' ')
        .trim()
        .toLowerCase()
      const aliases: Record<string, string> = {
        'xinyu wang': 'wang xinyu',
        'xiyu wang': 'wang xiyu',
        'yibing wu': 'wu yibing'
      }
      return aliases[normalized] || normalized
    }
    const playerWarehouseStats = (playerName: string) =>
      (warehouseContext?.players || []).find((entry: AnyRecord) => normalizeTennisName(entry.name) === normalizeTennisName(playerName))
        ?.stats || null
    const warehouseH2hLabel = () => {
      const h2h = warehouseContext?.h2h
      if (!h2h) return 'No SofaScore H2H row'
      const homeWins = Number.isFinite(Number(h2h.homeWins)) ? h2h.homeWins : 'N/A'
      const awayWins = Number.isFinite(Number(h2h.awayWins)) ? h2h.awayWins : 'N/A'
      return `${h2h.homeName || 'Home'} ${homeWins}-${awayWins} ${h2h.awayName || 'Away'}`
    }
    const weaknessRiskPct = (score: any) => {
      const numericScore = Number(score)
      if (!Number.isFinite(numericScore)) return null
      return Math.max(0, Math.min(100, Math.round((numericScore / 35) * 100)))
    }
    const weaknessRiskLabel = (score: any) => {
      const riskPct = weaknessRiskPct(score)
      if (riskPct == null) return 'No serve risk score'
      if (riskPct < 23) return 'Clean serve profile'
      if (riskPct < 43) return 'Mild serve risk'
      if (riskPct < 69) return 'Watch serve pressure'
      return 'Fragile serve profile'
    }
    const formatRecentScore = (match: AnyRecord) => {
      const tokens = match?.parsed?.scoreTokens
      if (Array.isArray(tokens) && tokens.length) {
        return tokens
          .map((token: AnyRecord) => {
            const left = token.leftGames
            const right = token.rightGames
            if (!Number.isFinite(Number(left)) || !Number.isFinite(Number(right))) return token.raw
            const raw = String(token.raw || '')
            const tiebreak = raw.match(/^\d+-\d+(\d+)$/)?.[1]
            return tiebreak ? `${left}-${right}(${tiebreak})` : `${left}-${right}`
          })
          .join(' ')
      }
      return String(match?.result || 'No score line')
        .replace(/^[A-Z]{3}\s+/, '')
        .replace(/\s+(?:1st|2nd|3rd|4th|QF|SF|F)$/i, '')
        .replace(/\b(\d)-(\d)(\d)\b/g, '$1-$2($3)')
        .replace(/\s+/g, ' ')
        .trim()
    }
    const formatRecentOutcome = (match: AnyRecord) => {
      const parsed = match?.parsed || {}
      if (parsed.walkover) return 'Walkover'
      if (parsed.retirement) return parsed.playerWon ? 'Won by retirement' : 'Lost by retirement'
      if (parsed.playerWon === true) return 'Win'
      if (parsed.playerWon === false) return 'Loss'
      if (/loss/i.test(match?.result || '')) return 'Loss'
      return 'Result'
    }
    const recentStatValue = (player: AnyRecord, match: AnyRecord, keys: string[], fallbackKey?: string) => {
      const stats = match?.serviceStats || match?.flashscoreStats || match?.stats || {}
      for (const key of keys) {
        const value = stats?.[key]
        if (value !== undefined && value !== null && value !== '') {
          const numericValue = Number(value)
          if (key.toLowerCase().includes('pct') && Number.isFinite(numericValue)) return `${Math.round(numericValue)}%`
          return String(value)
        }
      }
      const fallbackValue = fallbackKey ? player?.serviceData?.[fallbackKey] : null
      if (fallbackValue !== undefined && fallbackValue !== null && fallbackValue !== '' && Number.isFinite(Number(fallbackValue))) {
        return `Avg ${Math.round(Number(fallbackValue))}${fallbackKey?.toLowerCase().includes('pct') ? '%' : ''}`
      }
      return 'No FS row'
    }
    const renderRecentMatchCard = (player: AnyRecord, match: AnyRecord, index: number, variant = 'quality') => {
      const rank = match.opponentRanking?.rank
      const rankLabel = Number.isFinite(Number(rank)) ? `#${rank}` : 'No live rank'
      const identityLabel = formatIdentity(match.opponentRanking)
      const eventLabel = match.eventTier || match.event || 'Event missing'
      const outcome = formatRecentOutcome(match)
      const outcomeClass = outcome.toLowerCase().includes('win') ? 'positive' : outcome.toLowerCase().includes('loss') ? 'negative' : 'neutral'
      const holdValue = recentStatValue(player, match, ['serviceGamesWon', 'holdPct', 'serviceHoldPct'], 'avgServiceHoldPct')
      const aceValue = recentStatValue(player, match, ['aces', 'aceCount'], 'avgAces')
      const firstServeWon = recentStatValue(player, match, ['firstServePointsWon', 'firstServeWonPct'], 'avgFirstServeWonPct')
      return (
        <article key={`${player.name}-${variant}-${match.date}-${match.opponent}-${index}`} className="tennis-recent-card">
          <div className="tennis-recent-head">
            <div>
              <strong>{match.opponent || 'Opponent missing'}</strong>
              <span>{rankLabel}</span>
            </div>
            <span className={`tennis-result-pill ${outcomeClass}`}>{outcome}</span>
          </div>
          <p className="tennis-recent-score">{formatRecentScore(match)}</p>
          <div className="tennis-recent-chip-row">
            <span>{identityLabel}</span>
            <span>{eventLabel}</span>
            {match.date ? <span>{match.date}</span> : null}
            {match.parsed?.decidingSet ? <span>Deciding set</span> : null}
            {match.parsed?.resistance ? <span>Pressure</span> : null}
          </div>
          <div className="tennis-recent-stat-grid">
            <div>
              <span>Hold</span>
              <strong>{holdValue}</strong>
            </div>
            <div>
              <span>Aces</span>
              <strong>{aceValue}</strong>
            </div>
            <div>
              <span>1st won</span>
              <strong>{firstServeWon}</strong>
            </div>
          </div>
        </article>
      )
    }
    return (
      <>
        {context?.players?.length ? (
          <section className="detail-panel react-card-grid">
            {context.players.map((player: AnyRecord) => (
              <article key={player.name} className="react-team-card">
                <div className="react-team-card-top">
                  <div className="react-team-id">
                    <div>
                      <strong>{player.label}</strong>
                      <small>{player.record2026}</small>
                    </div>
                  </div>
                  <span className="builder-status-pill open">{player.marketLabel}</span>
                </div>
                <p>{player.clayLine}</p>
                {player.weakness ? (
                  <div className="tennis-risk-meter">
                    <div className="tennis-risk-meter-head">
                      <span>Serve risk</span>
                      <strong>{weaknessRiskPct(player.weakness.weaknessScore) ?? 'N/A'}/100</strong>
                    </div>
                    <div className="meter-track volatility tennis-risk-track">
                      <span style={{ width: `${weaknessRiskPct(player.weakness.weaknessScore) ?? 0}%` }} />
                    </div>
                    <small>
                      {weaknessRiskLabel(player.weakness.weaknessScore)} · raw {player.weakness.weaknessScore ?? 'N/A'} internal
                      {player.weakness.avgDoubleFaults != null ? ` · double faults ${player.weakness.avgDoubleFaults}/match` : ''}
                      {player.weakness.secondServeWonPct != null ? ` · 2nd won ${player.weakness.secondServeWonPct}%` : ''}
                      {player.weakness.avgUnforcedErrors != null ? ` · unforced ${player.weakness.avgUnforcedErrors}/match` : ''}
                    </small>
                    <small>{player.weakness.firstGameComfort}</small>
                  </div>
                ) : null}
                <small>{player.notes}</small>
                <p className="react-section-copy">{player.matchupNote}</p>
              </article>
            ))}
          </section>
        ) : null}

        {context?.comparisonRows?.length ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">Matchup board</p>
              <span>{projection?.overview || 'Clay comparison board'}</span>
            </div>
            <div className="react-comparison-grid">
              {context.comparisonRows.map((row: AnyRecord) => {
                const max = Math.max(row.leftScore || 1, row.rightScore || 1, 1)
                return (
                  <article key={row.label} className="react-comparison-row">
                    <div className="react-comparison-meta">
                      <strong>{row.label}</strong>
                      <small>{row.metric}</small>
                    </div>
                    <div className="react-comparison-values">
                      <span>{row.leftLabel}</span>
                      <span>{row.rightLabel}</span>
                    </div>
                    <div className="react-comparison-bars">
                      <div className="react-comparison-bar">
                        <span style={{ width: `${Math.max(12, (row.leftScore / max) * 100)}%` }} />
                      </div>
                      <div className="react-comparison-bar right">
                        <span style={{ width: `${Math.max(12, (row.rightScore / max) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="react-comparison-scoreline">
                      <span>{row.leftScore}</span>
                      <span>{row.winner}</span>
                      <span>{row.rightScore}</span>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        {weaknessEdge ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">Weakness edge</p>
              <span>{weaknessEdge.edgeType || 'No clear weakness edge'}</span>
            </div>
            <p className="react-section-copy">{weaknessEdge.gameFlow}</p>
            <div className="react-card-grid">
              <article className={`react-mini-panel ${weaknessEdge.edgeType === 'Weakness warning' ? 'warning' : ''}`}>
                <span className="eyebrow">Target</span>
                <strong>{weaknessEdge.target || 'No target'}</strong>
                <small>
                  Score gap {Number.isFinite(Number(weaknessEdge.scoreGap)) ? formatNumber(weaknessEdge.scoreGap, 0) : 'N/A'}
                </small>
              </article>
              <article className="react-mini-panel">
                <span className="eyebrow">Live trigger</span>
                <strong>{weaknessEdge.vulnerableSide || weaknessEdge.attackingSide || 'Wait'}</strong>
                <small>{weaknessEdge.liveTrigger}</small>
              </article>
              <article className="react-mini-panel">
                <span className="eyebrow">Spread / total</span>
                <strong>{weaknessEdge.spreadRead}</strong>
                <small>{weaknessEdge.totalRead}</small>
              </article>
            </div>
          </section>
        ) : null}

        {warehouseContext ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">Warehouse match data</p>
              <span>{warehouseContext.source || 'SofaScore / warehouse'}</span>
            </div>
            <div className="react-card-grid">
              <article className="react-mini-panel">
                <span className="eyebrow">Surface / H2H</span>
                <strong>{warehouseContext.surface || 'Surface pending'}</strong>
                <small>{warehouseH2hLabel()}</small>
              </article>
              <article className="react-mini-panel">
                <span className="eyebrow">Coverage</span>
                <strong>{warehouseContext.coverage?.playerStatRows ?? 0} player stat rows</strong>
                <small>{warehouseContext.sourceUrl ? 'SofaScore event mapped to board match' : 'No event URL mapped'}</small>
              </article>
              <article className="react-mini-panel">
                <span className="eyebrow">Score state</span>
                <strong>
                  {warehouseContext.score?.home?.current != null || warehouseContext.score?.away?.current != null
                    ? `${warehouseContext.score?.home?.current ?? 0}-${warehouseContext.score?.away?.current ?? 0}`
                    : 'Pregame / no score'}
                </strong>
                <small>{warehouseContext.tournament || 'Tournament row pending'}</small>
              </article>
            </div>
            {context?.players?.length ? (
              <div className="tennis-warehouse-grid">
                {context.players.map((player: AnyRecord) => {
                  const stats = player.warehouseStats?.stats || playerWarehouseStats(player.name)
                  const expectedStats = player.warehouseStats?.expectedStats || warehouseContext?.players
                    ?.find((entry: AnyRecord) => normalizeTennisName(entry.name) === normalizeTennisName(player.name))
                    ?.expectedStats
                  return (
                    <article key={`${game.id}-${player.name}-warehouse`} className="tennis-warehouse-card">
                      <div className="tennis-recent-head">
                        <div>
                          <strong>{player.name}</strong>
                          <span>
                            {stats ? 'SofaScore actual ALL-period stats' : expectedStats ? `Pregame expected from ${expectedStats.matches || 0} recent rows` : 'Stat feed pending'}
                          </span>
                        </div>
                      </div>
                      <div className="tennis-recent-stat-grid">
                        <div>
                          <span>Aces</span>
                          <strong>{statWithExpected(stats?.aces, expectedStats, 'aces')}</strong>
                        </div>
                        <div>
                          <span>DF</span>
                          <strong>{statWithExpected(stats?.doubleFaults, expectedStats, 'doubleFaults')}</strong>
                        </div>
                        <div>
                          <span>1st won</span>
                          <strong>{statWithExpected(stats?.firstServeWonPct, expectedStats, 'firstServeWonPct', '%')}</strong>
                        </div>
                        <div>
                          <span>2nd won</span>
                          <strong>{statWithExpected(stats?.secondServeWonPct, expectedStats, 'secondServeWonPct', '%')}</strong>
                        </div>
                        <div>
                          <span>1st in</span>
                          <strong>{statWithExpected(stats?.firstServePct, expectedStats, 'firstServePct', '%')}</strong>
                        </div>
                        <div>
                          <span>Service pts</span>
                          <strong>{statWithExpected(stats?.servicePointsWon, expectedStats, 'servicePointsWonPct', '%')}</strong>
                        </div>
                        <div>
                          <span>BP saved</span>
                          <strong>{statWithExpected(stats?.breakPointsSaved, expectedStats, 'breakPointsSavedPct', '%')}</strong>
                        </div>
                        <div>
                          <span>BP converted</span>
                          <strong>{statWithExpected(stats?.breakPointsConverted, expectedStats, 'breakPointsConvertedPct', '%')}</strong>
                        </div>
                        <div>
                          <span>Winners</span>
                          <strong>{statWithExpected(stats?.winners, expectedStats, 'winners')}</strong>
                        </div>
                        <div>
                          <span>Forced errors</span>
                          <strong>{statWithExpected(stats?.forcedErrors, expectedStats, 'forcedErrors')}</strong>
                        </div>
                        <div>
                          <span>Unforced</span>
                          <strong>{statWithExpected(stats?.unforcedErrors, expectedStats, 'unforcedErrors')}</strong>
                        </div>
                        <div>
                          <span>Return pts</span>
                          <strong>{statWithExpected(stats?.returnPointsWon, expectedStats, 'returnPointsWonPct', '%')}</strong>
                        </div>
                      </div>
                      {expectedStats?.note ? <small className="tennis-data-note">{expectedStats.note}</small> : null}
                    </article>
                  )
                })}
              </div>
            ) : null}
          </section>
        ) : null}

        {warehouseContext?.sofascoreSignals ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">SofaScore source signals</p>
              <span>Stored as context, not our pick</span>
            </div>
            <div className="react-card-grid">
              <article className="react-mini-panel">
                <span className="eyebrow">Crowd vote</span>
                <strong>
                  {warehouseContext.sofascoreSignals.votes?.homeName || 'Home'} {formatPercent(warehouseContext.sofascoreSignals.votes?.homePct, 1)}
                </strong>
                <small>
                  {warehouseContext.sofascoreSignals.votes?.awayName || 'Away'} {formatPercent(warehouseContext.sofascoreSignals.votes?.awayPct, 1)}
                </small>
              </article>
              <article className="react-mini-panel">
                <span className="eyebrow">Winning odds</span>
                <strong>
                  {warehouseContext.sofascoreSignals.winningOdds?.home?.name || 'Home'} {formatPercent(warehouseContext.sofascoreSignals.winningOdds?.home?.expected, 0)}
                </strong>
                <small>
                  {warehouseContext.sofascoreSignals.winningOdds?.away?.name || 'Away'} {formatPercent(warehouseContext.sofascoreSignals.winningOdds?.away?.expected, 0)}
                </small>
              </article>
              <article className="react-mini-panel">
                <span className="eyebrow">Tennis power</span>
                <strong>{warehouseContext.sofascoreSignals.tennisPower?.rows ?? 0} game-flow rows</strong>
                <small>
                  Positive games: {warehouseContext.sofascoreSignals.tennisPower?.homePositiveGames ?? 0} / {warehouseContext.sofascoreSignals.tennisPower?.awayPositiveGames ?? 0}
                </small>
              </article>
            </div>
            <p className="react-section-copy">{warehouseContext.sofascoreSignals.note}</p>
          </section>
        ) : null}

        {qualityPlayers.length ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">Clay evidence stack</p>
              <span>Our model input, not the source-site pick</span>
            </div>
            {opponentQualityData?.matchupRead ? (
              <p className="react-section-copy">{opponentQualityData.matchupRead}</p>
            ) : null}
            <div className="react-card-grid tennis-quality-grid">
              {qualityPlayers.map((player: AnyRecord) => {
                const window = player.recentWindow || {}
                const clayRecord = player.records?.clay2026
                const overallRecord = player.records?.overall2026
                const adjustedScore = Number.isFinite(Number(window.opponentAdjustedFormScore))
                  ? formatNumber(window.opponentAdjustedFormScore, 1)
                  : 'Low coverage'
                return (
                  <article key={`${game.id}-${player.name}-quality`} className="react-team-card tennis-quality-card">
                    <div className="react-team-card-top">
                      <div className="react-team-id">
                        <div>
                          <strong>{player.name}</strong>
                          <small>{formatRank(player)}</small>
                          <small>{formatIdentity(player.ranking)}</small>
                        </div>
                      </div>
                      <span className="builder-status-pill open">
                        {Number.isFinite(Number(window.rankingCoveragePct))
                          ? `${Math.round(Number(window.rankingCoveragePct) * 100)}% ranked`
                          : 'No rank coverage'}
                      </span>
                    </div>

                    <div className="tennis-quality-metrics">
                      <div>
                        <span>2026 clay</span>
                        <strong>{formatRecord(clayRecord)}</strong>
                      </div>
                      <div>
                        <span>Overall</span>
                        <strong>{formatRecord(overallRecord)}</strong>
                      </div>
                      <div>
                        <span>Recent W-L</span>
                        <strong>
                          {Number.isFinite(Number(window.wins)) && Number.isFinite(Number(window.losses))
                            ? `${window.wins}-${window.losses}`
                            : 'N/A'}
                        </strong>
                      </div>
                      <div>
                        <span>Game share</span>
                        <strong>{Number.isFinite(Number(window.gamePct)) ? formatPercent(Number(window.gamePct) * 100, 1) : 'N/A'}</strong>
                      </div>
                      <div>
                        <span>Top-50 opps</span>
                        <strong>{Number.isFinite(Number(window.top50Opponents)) ? window.top50Opponents : 'N/A'}</strong>
                      </div>
                      <div>
                        <span>Adj form</span>
                        <strong>{adjustedScore}</strong>
                      </div>
                    </div>

                    <p className="tennis-player-note">
                      Recent opponent sample: {window.knownOpponentRanks ?? 0}/{window.matches ?? 0} ranked
                      {Number.isFinite(Number(window.avgKnownOpponentRank))
                        ? ` · avg rank ${formatNumber(window.avgKnownOpponentRank, 1)}`
                        : ''}
                      {Number.isFinite(Number(window.resistanceMatches))
                        ? ` · ${window.resistanceMatches} pressure matches`
                        : ''}
                    </p>

                    <div className="tennis-match-log">
                      {(player.recentMatches || []).slice(0, 4).map((match: AnyRecord, index: number) => renderRecentMatchCard(player, match, index))}
                    </div>

                    <small className="tennis-data-note">
                      {player.serviceData?.note ||
                        'Flashscore service hold, ace, and serve-point fields will appear here once that match stat feed is joined.'}
                    </small>
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        {tradePlan ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">Trade lane</p>
              <span>{tradePlan.laneLabel}</span>
            </div>
            <p className="react-section-copy">{tradePlan.summary}</p>
            <div className="react-card-grid">
              <article className="react-mini-panel">
                <span className="eyebrow">Entry side</span>
                <strong>{tradePlan.entrySideName}</strong>
                <small>
                  Market {tradePlan.entryPricePct ?? tradePlan.dogMarketPct}% vs {tradePlan.otherSideName || tradePlan.favoriteName}{' '}
                  {tradePlan.otherSideMarketPct ?? tradePlan.favoriteMarketPct}%
                </small>
              </article>
              <article className="react-mini-panel">
                <span className="eyebrow">Trigger</span>
                <strong>{tradePlan.laneLabel}</strong>
                <small>{tradePlan.trigger}</small>
              </article>
              <article className="react-mini-panel">
                <span className="eyebrow">Exit map</span>
                <strong>{tradePlan.headline}</strong>
                <small>{tradePlan.exit}</small>
              </article>
            </div>
          </section>
        ) : null}

        {marketEconomics?.players?.length ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">Moneyline value math</p>
              <span>{marketEconomics.source || 'Market price'}</span>
            </div>
            <p className="react-section-copy">
              Confidence is the model win estimate. Implied is the sportsbook break-even price. Edge is model minus implied;
              negative edge means the pick can be likely to win and still be a bad ML bet.
            </p>
            <div className="react-card-grid">
              {marketEconomics.players.map((player: AnyRecord) => (
                <article
                  key={`${game.id}-${player.name}-value`}
                  className={`react-mini-panel ${marketValueTone(player.edgePct)}`}
                >
                  <span className="eyebrow">{player.name}</span>
                  <strong>{marketValueLabel(player.edgePct)}</strong>
                  <small>
                    Model {formatPercent(player.modelPct, 1)} vs implied {formatPercent(player.impliedPct, 1)} ={' '}
                    {formatSignedNumber(player.edgePct, 1)} pts
                  </small>
                  <p className="react-section-copy">
                    {formatAmericanOdds(player.americanOdds)} · risk 100 to win{' '}
                    {Number.isFinite(Number(player.centsProfitIfWin))
                      ? `${formatNumber(player.centsProfitIfWin, 1)}`
                      : 'N/A'}
                    ; {player.priceBand || 'price band pending'}.
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {context?.valueBoard ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">Bet-grade value board</p>
              <span>ML, spread, total, set-win</span>
            </div>
            <p className="react-section-copy">
              {context.valueBoard.note || 'EV is profit per 100 risked from model probability vs posted odds.'}
            </p>
            <div className="tennis-value-detail-grid">
              {[context.valueBoard.ml, context.valueBoard.spread, context.valueBoard.total]
                .filter(Boolean)
                .map((entry: AnyRecord) => (
                  <article
                    key={`${game.id}-value-board-${entry.marketType}`}
                    className={`react-mini-panel ${tennisValueTone(entry.valueGrade)}`}
                  >
                    <span className="eyebrow">{entry.marketType}</span>
                    <strong>{entry.valueGrade || 'Value pending'}</strong>
                    <small>
                      {entry.selection || 'No bet'}
                      {Number.isFinite(Number(entry.line)) ? ` ${entry.line}` : ''}
                      {Number.isFinite(Number(entry.americanOdds)) ? ` ${formatAmericanOdds(entry.americanOdds)}` : ''}
                    </small>
                    <small>
                      Model {formatPercent(entry.modelPct, 1)}
                      {Number.isFinite(Number(entry.impliedPct)) ? ` vs implied ${formatPercent(entry.impliedPct, 1)}` : ''}
                      {Number.isFinite(Number(entry.edgePct)) ? ` · edge ${formatSignedNumber(entry.edgePct, 1)} pts` : ''}
                    </small>
                    {Number.isFinite(Number(entry.evPer100)) ? <p className="react-section-copy">EV {formatSignedNumber(entry.evPer100, 1)} per 100</p> : null}
                  </article>
                ))}
              {(context.valueBoard.setWin || []).map((entry: AnyRecord) => (
                <article key={`${game.id}-set-win-${entry.name}`} className="react-mini-panel">
                  <span className="eyebrow">Win a set</span>
                  <strong>{entry.name}</strong>
                  <small>{entry.confidence}% confidence · {entry.label}</small>
                  <small>{entry.valueGrade || 'Needs posted price'}</small>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {context?.derivativeMarkets?.length ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">Derivative market reads</p>
              <span>ML, spread, and O/U</span>
            </div>
            <div className="react-card-grid">
              {context.derivativeMarkets.map((entry: AnyRecord) => (
                <article key={`${game.id}-${entry.label}-${entry.value}`} className={`react-mini-panel ${entry.tone || ''}`}>
                  <span className="eyebrow">{entry.label}</span>
                  <strong>{entry.lean}</strong>
                  <small>
                    {entry.value}
                    {Number.isFinite(Number(entry.confidence)) ? ` | ${entry.confidence}% confidence` : ''}
                  </small>
                  {entry.valueGrade || Number.isFinite(Number(entry.evPer100)) ? (
                    <small>
                      {entry.valueGrade || 'Value pending'}
                      {Number.isFinite(Number(entry.edgePct)) ? ` · edge ${formatSignedNumber(entry.edgePct, 1)} pts` : ''}
                      {Number.isFinite(Number(entry.evPer100)) ? ` · EV ${formatSignedNumber(entry.evPer100, 1)} per 100` : ''}
                    </small>
                  ) : null}
                  <p className="react-section-copy">{entry.reason}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {clayMatchupData ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">Clay matchup data</p>
              <span>Tennistonic source context</span>
            </div>
            {clayMatchupData.players?.length ? (
              <>
                <div className="react-card-grid">
                  <article className="react-mini-panel">
                    <span className="eyebrow">H2H</span>
                    <strong>{clayMatchupData.h2hRecord || clayMatchupData.h2hText || 'No H2H data'}</strong>
                    <small>{clayMatchupData.h2hText || clayMatchupData.prediction || 'No page summary loaded'}</small>
                  </article>
                  <article className="react-mini-panel">
                    <span className="eyebrow">Source-site call</span>
                    <strong>{clayMatchupData.prediction || 'No page prediction'}</strong>
                    <small>{clayMatchupData.sourceUrl ? 'Stored as context only; our prediction is the desk lean above.' : 'Source page missing.'}</small>
                  </article>
                  {clayMatchupData.tradeRead ? (
                    <article className="react-mini-panel">
                      <span className="eyebrow">Clay trade read</span>
                      <strong>{tradePlan?.laneLabel || 'Matchup lane'}</strong>
                      <small>{clayMatchupData.tradeRead}</small>
                    </article>
                  ) : null}
                </div>

                <div className="react-card-grid">
                  {clayMatchupData.players.map((player: AnyRecord) => (
                    <article key={player.name} className="react-team-card">
                      <div className="react-team-card-top">
                        <div className="react-team-id">
                          <div>
                            <strong>{player.name}</strong>
                            <small>2026 clay {player.record2026?.clay || 'N/A'}</small>
                          </div>
                        </div>
                      </div>
                      <div className="react-pill-row">
                        <span className="history-pill neutral">Overall {player.record2026?.overall || 'N/A'}</span>
                        <span className="history-pill neutral">Hard {player.record2026?.hard || 'N/A'}</span>
                        <span className="history-pill neutral">Clay {player.record2026?.clay || 'N/A'}</span>
                      </div>
                      <p className="tennis-data-note">
                        Recent opponent ranks and Flashscore service rows are shown in the clay evidence stack above after
                        warehouse enrichment. Raw source-site match logs are kept out of this card because they do not
                        carry joined rank/profile/stat fields.
                      </p>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="react-card-grid">
                <article className="react-mini-panel">
                  <span className="eyebrow">Source status</span>
                  <strong>Tennistonic did not load in time</strong>
                  <small>{clayMatchupData.error || 'Clay matchup source data was unavailable for this match.'}</small>
                </article>
              </div>
            )}
          </section>
        ) : null}

        {projection ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">Projected path</p>
              <span>{projection.projectedWinner}</span>
            </div>
            <div className="react-card-grid">
              <article className="react-mini-panel">
                <span className="eyebrow">Set line</span>
                <strong>{projection.projectedSetLine}</strong>
                <small>{projection.projectedScoreline}</small>
              </article>
              <article className="react-mini-panel">
                <span className="eyebrow">Total games</span>
                <strong>{projection.totalGames}</strong>
                <small>{projection.straightSetsProbability}% straight sets</small>
              </article>
              <article className="react-mini-panel">
                <span className="eyebrow">Volatility</span>
                <strong>{projection.upsetRisk}%</strong>
                <small>Upset risk</small>
              </article>
            </div>

            {projection.fantasy?.length ? (
              <>
                <p className="detail-note">
                  PrizePicks style: 10 match points + 3/-3 per set won/lost + 1/-1 per game won/lost + 0.5 per ace - 0.5 per double fault.
                </p>
                <div className="react-prop-grid">
                  {projection.fantasy.map((entry: AnyRecord) => (
                    <article key={entry.name} className="react-prop-card">
                      <div className="react-prop-head">
                        <strong>{entry.name}</strong>
                        <span>{entry.projectedFantasyScore}</span>
                      </div>
                      <p>PrizePicks fantasy</p>
                      <small>
                        {entry.projectedSetsWon}-{entry.projectedSetsLost} sets · {entry.projectedGamesWon}-{entry.projectedGamesLost} games
                      </small>
                      {entry.projectedAces != null || entry.projectedDoubleFaults != null ? (
                        <small>
                          {entry.projectedAces ?? 'n/a'} aces · {entry.projectedDoubleFaults ?? 'n/a'} double faults
                        </small>
                      ) : null}
                      <small>{entry.winPath}</small>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        {game.playerAnalysis?.length ? (
          <section className="detail-panel">
            <div className="detail-panel-header">
              <p className="eyebrow">Player analysis</p>
              <span>{game.analysis?.participant?.name} lean</span>
            </div>
            <ul className="factor-list compact">
              {game.playerAnalysis.map((line: string, index: number) => (
                <li key={`${game.id}-player-analysis-${index}`}>{line}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </>
    )
  }

  return (
    <div className="terminal-shell">
      <header className="desk-globalbar">
        <div className="topbar-brand">
          <div className="brand-mark">S</div>
          <div className="brand-wordmark">
            Slate<span>.</span>
          </div>
        </div>

        <div className="desk-tab-row" role="tablist" aria-label="Desk tabs">
          {deskTabs.map((tab) => (
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

        <label className="global-search" aria-label="Search markets">
          <span>Search markets, players, signals...</span>
          <input
            type="text"
            value={marketSearch}
            onChange={(event) => setMarketSearch(event.target.value)}
            placeholder="Filter the current slate..."
          />
          <small>⌘K</small>
        </label>

        <div className="topbar-status mono">
          <span className="live-dot" />
          <span>Live</span>
          <span>{oddsMeta?.snapshot || pacificClock.label}</span>
        </div>
      </header>

      <div className="desk-datestrip">
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
        <div className="desk-board-workspace">
          <section className="games-rail">
            <div className="games-rail-header">
              <div>
                <p className="eyebrow">Games</p>
                <h2>
                  {slateMeta.date} · {activeFilter === 'All' ? 'full board' : activeFilter}
                </h2>
              </div>
              <div className="games-rail-meta mono">
                <span>{visibleGames.length} visible</span>
                {games.some((game: AnyRecord) => game.league === 'MLB') ? (
                  <span>
                    {lineupStatusCounts.posted}/{lineupStatusCounts.total} posted
                  </span>
                ) : null}
              </div>
            </div>

            <div className="games-rail-filters">
              {filterOptions.map((filter: string) => (
                <button
                  key={filter}
                  type="button"
                  className={`rail-filter-chip ${activeFilter === filter ? 'active' : ''}`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>

            {tennisValueSummary ? (
              <section className="tennis-value-slate-card">
                <div className="tennis-value-slate-head">
                  <div>
                    <p className="eyebrow">Tennis value board</p>
                    <h3>{activeDayIsoDate} EV pass</h3>
                  </div>
                  <span>{tennisValueSummary.pricedRows}/{tennisValueSummary.totalRows} priced</span>
                </div>
                <p>{tennisValueSummary.note}</p>
                <div className="tennis-value-pill-row">
                  <span>Bet-grade {tennisValueSummary.countByGrade['Bet-grade value'] || 0}</span>
                  <span>Thin {tennisValueSummary.countByGrade['Thin value'] || 0}</span>
                  <span>Negative EV {tennisValueSummary.countByGrade['Negative EV'] || 0}</span>
                  <span>Need price {tennisValueSummary.noPriceRows}</span>
                </div>
                {tennisValueSummary.betGradeRows.length ? (
                  <div className="tennis-value-list">
                    {tennisValueSummary.betGradeRows.slice(0, 5).map((row: AnyRecord) => (
                      <button
                        key={`${row.game.id}-${row.label}-${row.value}`}
                        type="button"
                        className="tennis-value-row"
                        onClick={() => setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: row.game.id }))}
                      >
                        <span>
                          <strong>{row.selection || row.lean}</strong>
                          <small>{row.marketType} · {row.gameTitle}</small>
                        </span>
                        <span>
                          <strong>{formatSignedNumber(row.evPer100, 1)}</strong>
                          <small>EV/100</small>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {tennisValueSummary.negativeMlRows.length ? (
                  <small className="tennis-value-warning">
                    ML traps: {tennisValueSummary.negativeMlRows.slice(0, 3).map((row: AnyRecord) => `${row.selection} ${formatSignedNumber(row.evPer100, 1)}`).join(' · ')}
                  </small>
                ) : null}
              </section>
            ) : null}

            <div className="games-rail-list no-scrollbar">
              {isActiveDayLoading ? (
                <div className="placeholder-panel compact">
                  <p className="eyebrow">Loading slate</p>
                  <h3>Pulling board data for {slateMeta.date}</h3>
                  <p>The day module is loading on demand so the initial app bundle can stay lighter.</p>
                </div>
              ) : visibleGames.length === 0 ? (
                <div className="placeholder-panel compact">
                  <p className="eyebrow">No markets</p>
                  <h3>No results for this filter yet</h3>
                  <p>Try a different date, sport, or a looser search phrase.</p>
                </div>
              ) : (
                visibleGames.map((game: AnyRecord) => (
                  <button
                    key={game.id}
                    type="button"
                    className={`game-rail-row ${selectedGame?.id === game.id ? 'active' : ''}`}
                    onClick={() => setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: game.id }))}
                  >
                    <div className="game-rail-row-meta">
                      {renderLeagueBadge(game.league)}
                      <span className="mono">{game.start}</span>
                      <span className="game-rail-stage">{game.stage}</span>
                    </div>

                    <div className="game-rail-row-main">
                      <div className="game-rail-title-wrap">
                        <div className="game-rail-title">
                          <span>{getCompetitorDisplayName(game, game.matchup?.[0], 0)}</span>
                          <span className="versus-dot">vs</span>
                          <span>{getCompetitorDisplayName(game, game.matchup?.[1], 1)}</span>
                        </div>
                        <small>{game.analysis?.participant?.name} lean</small>
                      </div>
                      <div className="game-rail-score mono">{game.analysis?.confidence}</div>
                    </div>

                    <div className="game-rail-row-bottom">
                      <div className="game-rail-chips">
                        {buildGameHighlights(game)
                          .slice(0, 3)
                          .map((chip, index) => (
                            <span key={`${game.id}-chip-${index}`} className={`game-highlight-chip ${chip.tone}`}>
                              {chip.label}
                            </span>
                          ))}
                      </div>
                      <div className="game-rail-vol">
                        <span>{labelForScore(game.analysis?.confidence ?? 0)}</span>
                        <div className="mini-vol-bar">
                          <span style={{ width: `${game.analysis?.volatility ?? 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="detail-canvas">
            {isActiveDayLoading && !selectedGame ? (
              <div className="placeholder-panel compact">
                <p className="eyebrow">Loading detail</p>
                <h3>Preparing the selected slate</h3>
                <p>Once the board loads, matchup analysis and props will appear here.</p>
              </div>
            ) : selectedGame ? (
              <>
                <div className="detail-canvas-header">
                  <div className="detail-canvas-title-block">
                    <div className="detail-canvas-topline">
                      {renderLeagueBadge(selectedGame.league)}
                      <span className="mono">{selectedGame.start}</span>
                      <span>{selectedGame.stage}</span>
                      {latestLineupSnapshot ? <span>{formatSnapshotTime(latestLineupSnapshot)}</span> : null}
                    </div>
                    <h1>{getGameDisplayTitle(selectedGame)}</h1>
                  </div>

                  <div className="detail-canvas-actions">
                    {selectedGame.moneyline?.available ? (
                      <button type="button" className="analysis-action-button active" onClick={() => addAnalystPick(selectedGame)}>
                        {selectedPicks[selectedGame.id] === selectedGame.analysis?.participantId ? 'In ticket' : 'Add analyst pick'}
                      </button>
                    ) : null}
                    <button type="button" className="analysis-action-button" onClick={() => setActiveDeskTab('parlay')}>
                      Open builder
                    </button>
                  </div>
                </div>

                <div className="detail-kpi-strip">
                  <article className="detail-kpi-card">
                    <span className="eyebrow">Pick</span>
                    <strong>{selectedGame.analysis?.participant?.name || 'No pick'}</strong>
                    <small>Analyst read</small>
                  </article>
                  <article className="detail-kpi-card">
                    <span className="eyebrow">Confidence</span>
                    <strong>{selectedGame.analysis?.confidence}</strong>
                    <small>{labelForScore(selectedGame.analysis?.confidence ?? 0)}</small>
                  </article>
                  <article className="detail-kpi-card">
                    <span className="eyebrow">Volatility</span>
                    <strong>{selectedGame.analysis?.volatility}%</strong>
                    <small>{labelForScore(selectedGame.analysis?.volatility ?? 0)}</small>
                  </article>
                  <article className="detail-kpi-card">
                    <span className="eyebrow">Market</span>
                    <strong>
                      {selectedGame.tennisContext?.predictionMarket
                        ? selectedGame.analysis?.marketProbabilityLabel
                        : selectedGame.moneyline?.available
                          ? selectedGame.analysis?.marketProbabilityLabel
                          : 'Model only'}
                    </strong>
                    <small>
                      {selectedGame.tennisContext?.marketEconomics?.priceAction ||
                        (selectedGame.moneyline?.available ? selectedGame.moneyline.provider : 'No moneyline')}
                    </small>
                  </article>
                  <article className="detail-kpi-card">
                    <span className="eyebrow">Inputs</span>
                    <strong>{selectedGame.analysis?.inputsUsed ?? 0}</strong>
                    <small>{(selectedGame.tags ?? []).join(' · ')}</small>
                  </article>
                </div>

                <div className="detail-canvas-scroll no-scrollbar">
                  <div className="detail-canvas-grid">
                    <section className="detail-panel insight-panel">
                      <div className="detail-panel-header">
                        <p className="eyebrow">Editorial read</p>
                        <span>{(selectedGame.tags ?? []).join(' | ')}</span>
                      </div>
                      <p className="game-summary">{selectedGame.summary}</p>
                      <div className="closeout">
                        <p className="lean-line">{selectedGame.analysis?.lean}</p>
                        <p className="swing-line">{swingTextFor(selectedGame)}</p>
                      </div>
                      <div className="meter-grid compact">
                        <div className="meter-card">
                          <div className="meter-label">
                            <span>Confidence</span>
                            <strong>{labelForScore(selectedGame.analysis?.confidence ?? 0)}</strong>
                          </div>
                          <div className="meter-track">
                            <span style={{ width: `${selectedGame.analysis?.confidence ?? 0}%` }} />
                          </div>
                        </div>
                        <div className="meter-card">
                          <div className="meter-label">
                            <span>Volatility</span>
                            <strong>{labelForScore(selectedGame.analysis?.volatility ?? 0)}</strong>
                          </div>
                          <div className="meter-track volatility">
                            <span style={{ width: `${selectedGame.analysis?.volatility ?? 0}%` }} />
                          </div>
                        </div>
                      </div>
                      <ul className="factor-list compact">
                        {(selectedGame.factors ?? []).map((factor: string, index: number) => (
                          <li key={`${selectedGame.id}-factor-${index}`}>{factor}</li>
                        ))}
                      </ul>
                    </section>

                    <div className="detail-stack">
                      {renderMoneylinePanel(selectedGame)}
                      <section className="odds-panel">
                        <div className="detail-panel-header">
                          <p className="eyebrow">Odds snapshot</p>
                          <span>{selectedGame.odds?.provider || selectedGame.moneyline?.provider || 'Model board'}</span>
                        </div>
                        <p className="react-section-copy">{selectedGame.odds?.note || selectedGame.summary}</p>
                        <div className="react-prop-grid">
                          {(selectedGame.odds?.markets ?? []).map((market: AnyRecord) => (
                            <article key={`${selectedGame.id}-${market.label}`} className="react-prop-card odds-market-card">
                              <div className="odds-market-head">
                                <strong>{market.label}</strong>
                                <small>{market.book || selectedGame.odds?.provider}</small>
                              </div>
                              <p>{market.value}</p>
                            </article>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>

                  {selectedGame.league === 'MLB' && isSelectedGameDetailLoading ? (
                    <section className="placeholder-panel compact">
                      <p className="eyebrow">Loading matchup detail</p>
                      <h3>Pulling lineup, starter, bridge, and story context</h3>
                      <p>The board summary is already loaded; the heavier MLB game detail is being fetched on demand.</p>
                    </section>
                  ) : null}
                  {selectedGame.league === 'MLB' && !isSelectedGameDetailLoading ? renderMlbDetail(selectedGame) : null}
                  {selectedGame.league === 'Tennis' ? renderTennisDetail(selectedGame) : null}
                </div>
              </>
            ) : (
              <div className="placeholder-panel">
                <p className="eyebrow">Board</p>
                <h3>No market selected</h3>
                <p>Select a game from the rail to open the detail canvas.</p>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {activeDeskTab === 'parlay' ? (
        <div className="desk-tool-workspace">
          <section className="builder-shell" aria-label="Parlay builder">
            <div className="builder-layout">
              <section className="builder-catalog">
                <div className="builder-catalog-header">
                  <div>
                    <p className="eyebrow">Pick catalog</p>
                    <h2>Favorite reads, totals, and props</h2>
                    <p className="parlay-sidebar-copy">Use the left rail to sort live ideas. Started events stay visible but cannot be added.</p>
                  </div>
                  <div className="builder-catalog-meta mono">
                    <span>{builderCatalogEntries.length} showing</span>
                    <span>{pacificClock.label}</span>
                  </div>
                </div>

                <div className="builder-filter-stack">
                  <div className="builder-filter-row">
                    {builderCatalogTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        className={`builder-filter-chip ${builderCatalogTab === tab.id ? 'active' : ''}`}
                        onClick={() => setBuilderCatalogTab(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="builder-filter-row">
                    {builderValidityFilters.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        className={`builder-filter-chip subtle ${builderValidityFilter === filter.id ? 'active' : ''}`}
                        onClick={() => setBuilderValidityFilter(filter.id)}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>

                  <div className="builder-filter-row">
                    {builderLeagueFilters.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        className={`builder-filter-chip subtle ${builderLeagueFilter === filter.id ? 'active' : ''}`}
                        onClick={() => setBuilderLeagueFilter(filter.id)}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>

                  <div className="builder-filter-row builder-filter-row--split">
                    <div className="builder-filter-group">
                      {builderSortOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`builder-filter-chip subtle ${builderSort === option.id ? 'active' : ''}`}
                          onClick={() => setBuilderSort(option.id)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <div className="builder-filter-group">
                      {propTypeFilters.map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          className={`builder-filter-chip subtle ${activePropType === filter.id ? 'active' : ''}`}
                          onClick={() => setActivePropType(filter.id)}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="builder-catalog-list no-scrollbar">
                  {builderCatalogEntries.length === 0 ? (
                    <div className="placeholder-panel compact">
                      <p className="eyebrow">No candidates</p>
                      <h3>Nothing matches this filter set yet</h3>
                      <p>Try another lane, relax the invalid filter, or reset the prop type.</p>
                    </div>
                  ) : (
                    builderCatalogEntries.map((entry) => (
                      <article key={entry.id} className="builder-entry-card" data-invalid={entry.invalid}>
                        <div className="builder-entry-topline">
                          <div className="builder-entry-meta">
                            {renderLeagueBadge(entry.league)}
                            <span className="mono">{entry.start}</span>
                            <span>{entry.stage}</span>
                          </div>
                          <span className={`builder-status-pill ${entry.tone}`}>{entry.statusLabel}</span>
                        </div>

                        <div className="builder-entry-main">
                          <div className="builder-entry-copy">
                            <strong>{entry.title}</strong>
                            <p>{entry.subtitle}</p>
                            <small>{entry.summary}</small>
                            <div className="builder-entry-tags">
                              {entry.tags.map((tag: string) => (
                                <span key={`${entry.id}-${tag}`}>{tag}</span>
                              ))}
                            </div>
                          </div>

                          <div className="builder-entry-side">
                            <strong>{entry.confidence}%</strong>
                            <span>{entry.priceLabel}</span>
                            {entry.metaLabel ? <small>{entry.metaLabel}</small> : null}
                            <button
                              type="button"
                              className={`analysis-action-button ${entry.selected ? 'active' : ''}`}
                              disabled={entry.invalid || (entry.actionKind === 'ticket' && atParlayLimit && !entry.selected)}
                              onClick={() => applyBuilderEntry(entry)}
                            >
                              {entry.actionKind === 'ticket'
                                ? entry.selected
                                  ? 'In ticket'
                                  : 'Add side'
                                : entry.actionKind === 'prop'
                                  ? entry.selected
                                    ? 'Saved'
                                    : 'Save prop'
                                  : entry.selected
                                    ? 'Saved'
                                    : 'Save total'}
                            </button>
                            <button
                              type="button"
                              className="analysis-action-button ghost"
                              onClick={() => {
                                openGame(entry.gameId)
                                setActiveDeskTab('board')
                              }}
                            >
                              Open game
                            </button>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="builder-execution workspace-panel">
                <div className="parlay-sidebar-header">
                  <div>
                    <p className="eyebrow">Execution</p>
                    <h2>Slip and saved markets</h2>
                    <p className="parlay-sidebar-copy">Moneyline legs price into the slip. Totals and props save alongside it until you price them manually.</p>
                  </div>
                  <button type="button" className="clear-parlay-button" disabled={parlay.legCount === 0} onClick={clearParlay}>
                    Clear ticket
                  </button>
                </div>

                <div className="sidebar-tab-row" role="tablist" aria-label="Builder tools">
                  {sidebarTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      className={`sidebar-tab-button ${activeSidebarTab === tab.id ? 'active' : ''}`}
                      aria-selected={activeSidebarTab === tab.id}
                      onClick={() => setActiveSidebarTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeSidebarTab === 'ticket' ? (
                  <>
                    <div className="parlay-stats-grid compact">
                      <article className="parlay-stat-card">
                        <span className="parlay-stat-label">Eligible sides</span>
                        <strong>{filteredMoneylineGames.length}</strong>
                      </article>
                      <article className="parlay-stat-card">
                        <span className="parlay-stat-label">Selected</span>
                        <strong>{parlay.legCount}</strong>
                      </article>
                      <article className="parlay-stat-card">
                        <span className="parlay-stat-label">Combined odds</span>
                        <strong>{parlay.combinedAmericanLabel}</strong>
                        <small>Decimal {parlay.combinedDecimalLabel}</small>
                      </article>
                      <article className="parlay-stat-card">
                        <span className="parlay-stat-label">Implied hit rate</span>
                        <strong>{parlay.impliedProbabilityLabel}</strong>
                      </article>
                    </div>

                    {recommendationCounts.length > 0 ? (
                      <div className="ticket-autobuild">
                        <p className="ticket-autobuild-label">Auto-build ticket</p>
                        <div className="recommendation-mode-row" role="tablist" aria-label="Recommendation mode">
                          {recommendationModes.map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              role="tab"
                              className={`recommendation-mode-button ${recommendationMode === mode.id ? 'active' : ''}`}
                              aria-selected={recommendationMode === mode.id}
                              onClick={() => setRecommendationMode(mode.id)}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                        <p className="ticket-autobuild-copy">
                          {recommendationModes.find((mode) => mode.id === recommendationMode)?.copy}
                        </p>
                        {recommendationMode === 'balanced' ? (
                          <label className="balance-slider-card" htmlFor="balance-weight">
                            <div className="balance-slider-head">
                              <span>Flip weight</span>
                              <strong>{balanceWeight.toFixed(2)}</strong>
                            </div>
                            <input
                              id="balance-weight"
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={balanceWeight}
                              onChange={(event) => setBalanceWeight(Number(event.target.value))}
                            />
                            <small>
                              Targeting about {balancedRecommendation.targetFlipLegs} flip
                              {balancedRecommendation.targetFlipLegs === 1 ? '' : 's'} in this {recommendedLegTarget}-leg mix from an average underdog rate of{' '}
                              {Math.round(balancedRecommendation.averageFlipProbability * 100)}%.
                            </small>
                          </label>
                        ) : null}

                        <div className="recommendation-size-row">
                          {recommendationCounts.map((count) => (
                            <button
                              key={count}
                              type="button"
                              className={`size-chip ${recommendedLegTarget === count ? 'active' : ''}`}
                              onClick={() => setRecommendedLegCount(count)}
                            >
                              {count}-leg
                            </button>
                          ))}
                        </div>

                        <p className="ticket-autobuild-preview">
                          {recommendationMode === 'flips' ? 'Flip-risk' : recommendationMode === 'balanced' ? 'Balanced' : 'Favorites'} set: {recommendedParlay.combinedAmericanLabel} | {recommendedParlay.impliedProbabilityLabel} implied
                        </p>
                        <button type="button" className="load-recommended-button" onClick={loadRecommendedParlay}>
                          Load {recommendedLegTarget}-leg {recommendationMode === 'flips' ? 'flip-risk' : recommendationMode} ticket
                        </button>
                      </div>
                    ) : null}

                    <div className="parlay-body stacked">
                      <label className="stake-card" htmlFor="parlay-stake">
                        <span className="parlay-stat-label">Stake</span>
                        <input
                          id="parlay-stake"
                          type="number"
                          min="1"
                          step="5"
                          value={parlayStake}
                          onChange={(event) => setParlayStake(Number(event.target.value) || 0)}
                        />
                      </label>
                      <div className="parlay-return-grid">
                        <article className="parlay-return-card">
                          <span className="parlay-stat-label">Projected return</span>
                          <strong>{parlay.grossReturnLabel}</strong>
                        </article>
                        <article className="parlay-return-card">
                          <span className="parlay-stat-label">Projected profit</span>
                          <strong>{parlay.profitLabel}</strong>
                        </article>
                      </div>
                    </div>

                    <div className="sidebar-status-card" data-ready={parlayReady}>
                      <p className="parlay-status-title">{parlayReady ? 'Ticket ready' : 'Ticket in progress'}</p>
                      <p className="parlay-status-copy">{parlayStatus}</p>
                    </div>

                    {parlay.legCount === 0 ? (
                      <p className="parlay-empty">Use the catalog on the left to add cleaner sides or save manual markets.</p>
                    ) : (
                      <div className="parlay-leg-list">
                        {parlay.legs.map((leg: AnyRecord) => (
                          <article key={leg.id} className="parlay-leg-card">
                            <div>
                              <p className="parlay-leg-topline">
                                {leg.league} | {leg.start} | {leg.stage}
                              </p>
                              <p className="parlay-leg-pick">
                                {leg.pickName} over {leg.opponentName}
                              </p>
                              <p className="parlay-leg-game">{leg.gameTitle}</p>
                            </div>
                            <div className="parlay-leg-side">
                              <strong>{leg.americanLabel}</strong>
                              <span>{leg.impliedProbabilityLabel} implied</span>
                              {leg.isAnalystPick ? <span className="analyst-chip">Analyst match</span> : null}
                              <button type="button" className="remove-leg-button" onClick={() => removeParlayPick(leg.gameId)}>
                                Remove
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </>
                ) : null}

                {activeSidebarTab === 'markets' ? (
                  <>
                    <div className="parlay-stats-grid compact">
                      <article className="parlay-stat-card">
                        <span className="parlay-stat-label">Saved props</span>
                        <strong>{selectedPropEntries.length}</strong>
                      </article>
                      <article className="parlay-stat-card">
                        <span className="parlay-stat-label">Saved totals</span>
                        <strong>{selectedTotalEntries.length}</strong>
                      </article>
                      <article className="parlay-stat-card">
                        <span className="parlay-stat-label">Avg confidence</span>
                        <strong>{selectedPropEntries.length ? `${propConfidenceAverage}%` : 'N/A'}</strong>
                      </article>
                      <article className="parlay-stat-card">
                        <span className="parlay-stat-label">Prop filter</span>
                        <strong>{propTypeFilters.find((entry) => entry.id === activePropType)?.label ?? 'All'}</strong>
                      </article>
                    </div>

                    <div className="action-section">
                      <div className="action-section-header">
                        <div>
                          <p className="ticket-autobuild-label">Manual markets</p>
                          <p className="ticket-autobuild-copy">These are the unpriced adds from the left catalog. Keep them here while you decide whether the edge is stronger in hits, TB, RBI, or totals.</p>
                        </div>
                        <div className="builder-clear-group">
                          <button type="button" className="clear-parlay-button" disabled={!selectedPropEntries.length} onClick={clearSelectedProps}>
                            Clear props
                          </button>
                          <button type="button" className="clear-parlay-button" disabled={!selectedTotalEntries.length} onClick={clearSelectedTotals}>
                            Clear totals
                          </button>
                        </div>
                      </div>
                    </div>

                    {selectedTotalEntries.length ? (
                      <div className="action-section">
                        <div className="action-section-header">
                          <h3>Saved totals</h3>
                          <span>{selectedTotalEntries.length}</span>
                        </div>
                        <div className="prop-pick-list">
                          {selectedTotalEntries.map((total: AnyRecord) => (
                            <article key={total.id} className="prop-pick-card">
                              <div>
                                <p className="parlay-leg-topline">
                                  {total.league} | {total.phaseLabel}
                                </p>
                                <p className="parlay-leg-pick">{total.marketLabel}</p>
                                <p className="parlay-leg-game">{total.gameTitle}</p>
                                <p className="parlay-leg-game">{total.projectedLabel}</p>
                              </div>
                              <div className="parlay-leg-side">
                                <strong>{total.strength}</strong>
                                <span>Manual price</span>
                                <button type="button" className="remove-leg-button" onClick={() => toggleSelectedTotal(total)}>
                                  Remove
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {selectedPropEntries.length ? (
                      <div className="action-section">
                        <div className="action-section-header">
                          <h3>Saved props</h3>
                          <span>{selectedPropEntries.length}</span>
                        </div>
                        <div className="prop-pick-list">
                          {selectedPropEntries.map((prop: AnyRecord) => (
                            <article key={prop.id} className="prop-pick-card">
                              <div>
                                <p className="parlay-leg-topline">
                                  {prop.league} | {prop.lineupStatus}
                                </p>
                                <p className="parlay-leg-pick">
                                  {prop.playerName} {prop.marketLabel}
                                </p>
                                <p className="parlay-leg-game">{prop.gameTitle}</p>
                                <p className="parlay-leg-game">{prop.reason}</p>
                              </div>
                              <div className="parlay-leg-side">
                                <strong>{prop.confidence}%</strong>
                                <span>{prop.probability}% model</span>
                                <button type="button" className="remove-leg-button" onClick={() => toggleSelectedProp(prop)}>
                                  Remove
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {!selectedPropEntries.length && !selectedTotalEntries.length ? (
                      <p className="parlay-empty">Save totals and props from the left catalog to stage manual markets here.</p>
                    ) : null}
                  </>
                ) : null}

                {activeSidebarTab === 'sources' ? (
                  <div className="action-section">
                    <div className="action-section-header">
                      <h3>Source registry</h3>
                      <span>{activeDay?.sources?.length ?? 0}</span>
                    </div>
                    <div className="sources-list">
                      {(activeDay?.sources ?? []).map((source: AnyRecord, index: number) => (
                        <a key={`${source.label || source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer">
                          <strong>{source.label || source.url}</strong>
                          <small>{source.note || source.url}</small>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </section>
        </div>
      ) : null}

      {activeDeskTab === 'tickets' ? (
        <div className="desk-tool-workspace">
          <section className="workspace-panel placeholder-panel">
            <p className="eyebrow">Tickets</p>
            <h3>Ticket history next</h3>
            <p>The React migration keeps the shell ready for graded slips, settled parlays, and historical tracking.</p>
          </section>
        </div>
      ) : null}

      {activeDeskTab === 'models' ? (
        <div className="desk-tool-workspace models-workspace">
          <section className="workspace-panel action-section models-chart-panel">
            <div className="action-section-header">
              <h3>Accuracy trend through {latestHistoryTrendLabel}</h3>
              <span>{historyTrendPoints.length} graded days</span>
            </div>

            {historyLoaded ? (
              <>
                <div className="history-metric-grid models-metric-grid">
                  <article className="parlay-stat-card history-metric-card positive">
                    <span className="parlay-stat-label">Avg MLB full game</span>
                    <strong>{formatPercent(historyTrendSummary.fullGame)}</strong>
                    <small>Daily graded archive</small>
                  </article>
                  <article className="parlay-stat-card history-metric-card warning">
                    <span className="parlay-stat-label">Avg MLB first 5</span>
                    <strong>{formatPercent(historyTrendSummary.first5)}</strong>
                    <small>Starter-window hit rate</small>
                  </article>
                  <article className="parlay-stat-card history-metric-card first-inning">
                    <span className="parlay-stat-label">Avg MLB 1st inning</span>
                    <strong>{formatPercent(historyTrendSummary.firstInning)}</strong>
                    <small>YRFI / NRFI hit rate</small>
                  </article>
                  <article className="parlay-stat-card history-metric-card negative">
                    <span className="parlay-stat-label">Avg HR board</span>
                    <strong>{formatPercent(historyTrendSummary.hrBoard)}</strong>
                    <small>Hit rate on saved HR pool</small>
                  </article>
                  <article className="parlay-stat-card history-metric-card props">
                    <span className="parlay-stat-label">Avg non-HR props</span>
                    <strong>{formatPercent(historyTrendSummary.props)}</strong>
                    <small>Hits, TB, RBI, walks, singles</small>
                  </article>
                  <article className="parlay-stat-card history-metric-card info">
                    <span className="parlay-stat-label">Avg tennis main tour</span>
                    <strong>{formatPercent(historyTrendSummary.tennis)}</strong>
                    <small>Graded main-tour tennis picks</small>
                  </article>
                </div>

                <div className="trend-chart-shell">
                  <div className="trend-chart-legend">
                    <span><i className="trend-dot positive" />MLB full game</span>
                    <span><i className="trend-dot warning" />MLB first 5</span>
                    <span><i className="trend-dot first-inning" />MLB 1st inning</span>
                    <span><i className="trend-dot negative" />HR board</span>
                    <span><i className="trend-dot props" />Non-HR props</span>
                    <span><i className="trend-dot tennis" />Tennis main tour</span>
                  </div>

                  <div className="trend-chart-frame">
                    <svg viewBox={`0 0 ${trendChartWidth} ${trendChartHeight}`} className="trend-chart" role="img" aria-label="Model accuracy trend">
                      {[0, 25, 50, 75, 100].map((tick) => {
                        const y = trendChartPadding + ((100 - tick) / 100) * (trendChartHeight - trendChartPadding * 2)
                        return (
                          <g key={`tick-${tick}`}>
                            <line x1={trendChartPadding} y1={y} x2={trendChartWidth - trendChartPadding} y2={y} className="trend-grid-line" />
                            <text x={6} y={y + 4} className="trend-axis-label">{tick}</text>
                          </g>
                        )
                      })}

                      {fullGameTrendSegments.map((segment, index) => (
                        <line
                          key={`full-${index}`}
                          x1={segment.x1}
                          y1={segment.y1}
                          x2={segment.x2}
                          y2={segment.y2}
                          className="trend-line positive"
                        />
                      ))}
                      {first5TrendSegments.map((segment, index) => (
                        <line
                          key={`first5-${index}`}
                          x1={segment.x1}
                          y1={segment.y1}
                          x2={segment.x2}
                          y2={segment.y2}
                          className="trend-line warning"
                        />
                      ))}
                      {firstInningTrendSegments.map((segment, index) => (
                        <line
                          key={`first-inning-${index}`}
                          x1={segment.x1}
                          y1={segment.y1}
                          x2={segment.x2}
                          y2={segment.y2}
                          className="trend-line first-inning"
                        />
                      ))}
                      {hrTrendSegments.map((segment, index) => (
                        <line
                          key={`hr-${index}`}
                          x1={segment.x1}
                          y1={segment.y1}
                          x2={segment.x2}
                          y2={segment.y2}
                          className="trend-line negative"
                        />
                      ))}
                      {propTrendSegments.map((segment, index) => (
                        <line
                          key={`props-${index}`}
                          x1={segment.x1}
                          y1={segment.y1}
                          x2={segment.x2}
                          y2={segment.y2}
                          className="trend-line props"
                        />
                      ))}
                      {tennisTrendSegments.map((segment, index) => (
                        <line
                          key={`tennis-${index}`}
                          x1={segment.x1}
                          y1={segment.y1}
                          x2={segment.x2}
                          y2={segment.y2}
                          className="trend-line tennis"
                        />
                      ))}

                      {historyTrendPoints.map((entry, index) => {
                        const x =
                          historyTrendPoints.length === 1
                            ? trendChartWidth / 2
                            : trendChartPadding +
                              ((trendChartWidth - trendChartPadding * 2) * index) / (historyTrendPoints.length - 1)

                        return (
                          <g key={entry.id}>
                            {entry.fullGame !== null ? (
                              <circle
                                cx={x}
                                cy={trendChartPadding + ((100 - entry.fullGame) / 100) * (trendChartHeight - trendChartPadding * 2)}
                                r="4"
                                className="trend-point positive"
                              />
                            ) : null}
                            {entry.first5 !== null ? (
                              <circle
                                cx={x}
                                cy={trendChartPadding + ((100 - entry.first5) / 100) * (trendChartHeight - trendChartPadding * 2)}
                                r="4"
                                className="trend-point warning"
                              />
                            ) : null}
                            {entry.firstInning !== null ? (
                              <circle
                                cx={x}
                                cy={trendChartPadding + ((100 - entry.firstInning) / 100) * (trendChartHeight - trendChartPadding * 2)}
                                r="4"
                                className="trend-point first-inning"
                              />
                            ) : null}
                            {entry.hrBoard !== null ? (
                              <circle
                                cx={x}
                                cy={trendChartPadding + ((100 - entry.hrBoard) / 100) * (trendChartHeight - trendChartPadding * 2)}
                                r="4"
                                className="trend-point negative"
                              />
                            ) : null}
                            {entry.props !== null ? (
                              <circle
                                cx={x}
                                cy={trendChartPadding + ((100 - entry.props) / 100) * (trendChartHeight - trendChartPadding * 2)}
                                r="4"
                                className="trend-point props"
                              />
                            ) : null}
                            {entry.tennis !== null ? (
                              <circle
                                cx={x}
                                cy={trendChartPadding + ((100 - entry.tennis) / 100) * (trendChartHeight - trendChartPadding * 2)}
                                r="4"
                                className="trend-point tennis"
                              />
                            ) : null}
                            <text x={x} y={trendChartHeight - 6} textAnchor="middle" className="trend-axis-label">{entry.id.slice(5)}</text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>
                </div>

                <div className="models-daily-grid">
                  {dailyHistoryTrendPoints.map((entry) => (
                    <article key={`daily-${entry.id}`} className="history-ledger-card models-daily-card">
                      <span className="parlay-stat-label">{entry.label}</span>
                      <div className="models-daily-rows">
                        <div>
                          <span>MLB FG</span>
                          <strong>{formatPercent(entry.fullGame)}</strong>
                        </div>
                        <div>
                          <span>MLB F5</span>
                          <strong>{formatPercent(entry.first5)}</strong>
                        </div>
                        <div>
                          <span>MLB RFI</span>
                          <strong>{formatPercent(entry.firstInning)}</strong>
                        </div>
                        <div>
                          <span>HR</span>
                          <strong>{formatPercent(entry.hrBoard)}</strong>
                        </div>
                        <div>
                          <span>Tennis</span>
                          <strong>{formatPercent(entry.tennis)}</strong>
                        </div>
                        <div>
                          <span>Props</span>
                          <strong>{formatPercent(entry.props)}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p className="react-section-copy">Loading graded archive…</p>
            )}
          </section>

          <section className="workspace-panel action-section">
            <div className="action-section-header">
              <h3>Current slate diagnostics</h3>
              <span>{games.length} games</span>
            </div>
            <ul className="factor-list compact">
              <li>Slate day: {slateMeta.date}</li>
              <li>Latest lineup refresh: {latestLineupSnapshot ? formatSnapshotTime(latestLineupSnapshot) : 'Not available'}</li>
              <li>Eligible moneylines: {eligibleMoneylineGames.length}</li>
              <li>Top analysis lane: {favoriteRecommendationPool[0]?.participant?.name ?? 'No active edge'}</li>
            </ul>
          </section>
          <section className="workspace-panel action-section">
            <div className="action-section-header">
              <h3>Archive note</h3>
              <span>JSONL ready</span>
            </div>
            <p className="react-section-copy">
              Daily hit and miss ledgers now export to structured JSONL under <code>data-private/history</code>, so the archive can train against individual picks instead of only summary docs.
            </p>
          </section>
        </div>
      ) : null}

      {activeDeskTab === 'history' ? (
        <div className="desk-tool-workspace history-workspace">
          <section className="workspace-panel history-rail">
            <div className="history-rail-header">
              <div>
                <p className="eyebrow">History</p>
                <h3>Archive through {historyArchive[0]?.label ?? 'the latest graded day'}</h3>
                <p className="react-section-copy">
                  Daily grading blocks, combined backtests, and the saved board artifacts that fed them.
                </p>
              </div>
              <span className="mono history-archive-count">{historyArchive.length} blocks</span>
            </div>

            <div className="history-rail-list no-scrollbar">
              {!historyLoaded ? <p className="react-section-copy">Loading archive…</p> : null}
              {historyArchive.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`history-row ${activeHistoryEntry?.id === entry.id ? 'active' : ''}`}
                  onClick={() => setActiveHistoryId(entry.id)}
                >
                  <div className="history-row-topline">
                    <span className="mono">{entry.date}</span>
                    <span className={`history-status-pill ${entry.status}`}>{entry.status}</span>
                  </div>
                  <strong>{entry.label}</strong>
                  <p>{entry.summary}</p>
                  <div className="history-row-tags">
                    {entry.trackedMarkets.map((market) => (
                      <span key={`${entry.id}-${market}`}>{market}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="workspace-panel history-detail">
            {!historyLoaded ? (
              <p className="react-section-copy">Loading archive detail…</p>
            ) : activeHistoryEntry ? (
              <>
                <div className="history-detail-header">
                  <div>
                    <p className="eyebrow">Archive detail</p>
                    <h2>{activeHistoryEntry.label}</h2>
                    <p className="react-section-copy">{activeHistoryEntry.summary}</p>
                  </div>
                  <div className="history-sports mono">
                    {activeHistoryEntry.sports.map((sport) => (
                      <span key={`${activeHistoryEntry.id}-${sport}`}>{sport}</span>
                    ))}
                  </div>
                </div>

                <div className="history-detail-body">
                <div className="history-metric-grid">
                  {activeHistoryMetrics.map((metric) => (
                    <article
                      key={`${activeHistoryEntry.id}-${metric.label}`}
                      className={`parlay-stat-card history-metric-card ${getHistoryMetricTone(metric)}`}
                    >
                      <span className="parlay-stat-label">{metric.label}</span>
                      <strong>{metric.value}</strong>
                      {metric.note ? <small>{metric.note}</small> : null}
                    </article>
                  ))}
                </div>

                {activeHistorySportTabs.length ? (
                  <section className="action-section history-deep-dive">
                    <div className="action-section-header">
                      <h3>Day review</h3>
                      <span>{activeHistorySportTabs.length} sports</span>
                    </div>

                    <div className="history-sport-tabs">
                      {activeHistorySportTabs.map((tab) => (
                        <button
                          key={`${activeHistoryEntry.id}-sport-tab-${tab.id}`}
                          type="button"
                          className={`history-sport-tab ${activeHistorySportTab?.id === tab.id ? 'active' : ''}`}
                          onClick={() => setActiveHistorySportTabId(tab.id)}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {activeHistorySportTab ? (
                      <div className="history-sport-shell">
                        <p className="react-section-copy">{activeHistorySportTab.summary}</p>

                        {activeHistorySportTab.metrics?.length ? (
                          <div className="history-sport-metric-grid">
                            {activeHistorySportTab.metrics.map((metric) => (
                              <article
                                key={`${activeHistoryEntry.id}-${activeHistorySportTab.id}-${metric.label}`}
                                className={`history-ledger-card history-sport-metric ${getHistoryMetricTone(metric)}`}
                              >
                                <span className="parlay-stat-label">{metric.label}</span>
                                <strong>{metric.value}</strong>
                                {metric.note ? <small>{metric.note}</small> : null}
                              </article>
                            ))}
                          </div>
                        ) : null}

                        {activeHistorySportTab.placeholder ? (
                          <article className="history-ledger-card">
                            <span className="parlay-stat-label">
                              {activeHistorySportTab.sections?.length ? 'Coverage note' : 'Reserved slot'}
                            </span>
                            <strong>
                              {activeHistorySportTab.sections?.length
                                ? `${activeHistorySportTab.label} detail is partial`
                                : `${activeHistorySportTab.label} review pending`}
                            </strong>
                            <small>{activeHistorySportTab.placeholder}</small>
                          </article>
                        ) : null}

                        {activeHistorySportSections.map((section) => (
                          <div key={`${activeHistoryEntry.id}-${activeHistorySportTab.id}-${section.label}`} className="history-review-section">
                            <div className="action-section-header">
                              <h3>{section.label}</h3>
                              <span>{section.games.length} matches</span>
                            </div>
                            <div className="history-review-grid">
                              {section.games.map((game) => (
                                <article
                                  key={`${activeHistoryEntry.id}-${activeHistorySportTab.id}-${game.id}`}
                                  className={`history-review-card ${getHistoryReviewTone(game.result)}`}
                                >
                                  <div className="history-review-topline">
                                    <strong>{game.title}</strong>
                                    <span className={`history-review-pill ${getHistoryReviewTone(game.result)}`}>{game.result}</span>
                                  </div>
                                  <div className="history-review-meta">
                                    {game.start ? <span>{game.start}</span> : null}
                                    {game.crowd ? <span>Board {game.crowd}</span> : null}
                                  </div>
                                  <div className="history-review-row">
                                    <span>Predicted</span>
                                    <strong>{game.predicted}</strong>
                                    <small>{game.confidence ? `${game.confidence} confidence` : 'Desk lean'}</small>
                                  </div>
                                  <div className="history-review-row">
                                    <span>Actual</span>
                                    <strong>{game.actualWinner ?? 'Pending'}</strong>
                                    <small>{game.finalScore ?? game.note ?? 'Awaiting result'}</small>
                                  </div>
                                  {game.note && game.finalScore ? <p className="history-review-note">{game.note}</p> : null}
                                </article>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}

                <div className="history-section-grid">
                  <section className="action-section">
                    <div className="action-section-header">
                      <h3>Result ledger</h3>
                      <span>{activeHistoryEntry.journal?.records ?? activeHistoryEntry.trackedMarkets.length}</span>
                    </div>
                    <div className="history-ledger-grid">
                      <article className="history-ledger-card">
                        <span className="parlay-stat-label">Coverage</span>
                        <strong>
                          {activeHistoryEntry.journal
                            ? `${activeHistoryEntry.journal.records} rows`
                            : `${activeHistoryTrackedMarkets.length} markets`}
                        </strong>
                        <small>
                          {activeHistoryEntry.journal
                            ? `${activeHistoryEntry.journal.sideRows ?? 0} sides | ${activeHistoryEntry.journal.hrRows ?? 0} HR props | ${activeHistoryEntry.journal.propRows ?? activeHistoryPropSummary?.overall?.total ?? 0} player props`
                            : activeHistoryTrackedMarkets.join(' | ')}
                        </small>
                      </article>
                      <article className="history-ledger-card">
                        <span className="parlay-stat-label">Training asset</span>
                        <strong>{activeHistoryEntry.journal ? 'JSONL ready' : 'Summary only'}</strong>
                        <small>{activeHistoryEntry.journal?.note ?? 'Older archive blocks only preserve summary-level grading.'}</small>
                      </article>
                    </div>
                    <div className="history-chip-row">
                      {activeHistoryTrackedMarkets.map((market) => (
                        <span key={`${activeHistoryEntry.id}-market-${market}`} className="history-chip">
                          {market}
                        </span>
                      ))}
                    </div>
                  </section>

                  {activeHistoryPropSummary?.overall?.total ? (
                    <section className="action-section">
                      <div className="action-section-header">
                        <h3>Prop breakdown</h3>
                        <span>{activeHistoryPropSummary.overall.total}</span>
                      </div>
                      <div className="history-ledger-grid">
                        {Object.entries(activeHistoryPropSummary.byType).map(([propType, summary]) => (
                          <article key={`${activeHistoryEntry.id}-prop-${propType}`} className="history-ledger-card">
                            <span className="parlay-stat-label">{propType}</span>
                            <strong>
                              {summary.hits}/{summary.total}
                            </strong>
                            <small>{formatPercent(summary.hitRate)} hit rate</small>
                          </article>
                        ))}
                      </div>
                      {activeHistoryPropSummary.topHits.length ? (
                        <div className="history-subsection">
                          <span className="parlay-stat-label">Best prop hits</span>
                          <p className="react-section-copy">{activeHistoryPropSummary.topHits.join(' | ')}</p>
                        </div>
                      ) : null}
                      {activeHistoryPropSummary.topMisses.length ? (
                        <div className="history-subsection">
                          <span className="parlay-stat-label">Best prop misses to learn from</span>
                          <p className="react-section-copy">{activeHistoryPropSummary.topMisses.join(' | ')}</p>
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  <section className="action-section">
                    <div className="action-section-header">
                      <h3>Notable hits</h3>
                      <span>{activeHistoryEntry.notableHits.length}</span>
                    </div>
                    <ul className="factor-list compact">
                      {activeHistoryEntry.notableHits.map((item) => (
                        <li key={`${activeHistoryEntry.id}-hit-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="action-section">
                    <div className="action-section-header">
                      <h3>Notable misses</h3>
                      <span>{activeHistoryEntry.notableMisses.length}</span>
                    </div>
                    <ul className="factor-list compact">
                      {activeHistoryEntry.notableMisses.map((item) => (
                        <li key={`${activeHistoryEntry.id}-key-miss-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="action-section">
                    <div className="action-section-header">
                      <h3>What worked</h3>
                      <span>{activeHistoryEntry.whatWorked.length}</span>
                    </div>
                    <ul className="factor-list compact">
                      {activeHistoryEntry.whatWorked.map((item) => (
                        <li key={`${activeHistoryEntry.id}-worked-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="action-section">
                    <div className="action-section-header">
                      <h3>What missed</h3>
                      <span>{activeHistoryEntry.whatMissed.length}</span>
                    </div>
                    <ul className="factor-list compact">
                      {activeHistoryEntry.whatMissed.map((item) => (
                        <li key={`${activeHistoryEntry.id}-missed-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="action-section">
                    <div className="action-section-header">
                      <h3>Takeaways</h3>
                      <span>{activeHistoryEntry.takeaways.length}</span>
                    </div>
                    <ul className="factor-list compact">
                      {activeHistoryEntry.takeaways.map((item) => (
                        <li key={`${activeHistoryEntry.id}-takeaway-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </section>
                </div>

                <section className="action-section">
                  <div className="action-section-header">
                    <h3>Archive artifacts</h3>
                    <span>{activeHistoryEntry.artifacts.length}</span>
                  </div>
                  <div className="history-artifact-list">
                    {activeHistoryEntry.artifacts.map((artifact) => (
                      <article key={`${activeHistoryEntry.id}-${artifact.path}`} className="history-artifact-card">
                        <strong>{artifact.label}</strong>
                        <code>{artifact.path}</code>
                      </article>
                    ))}
                  </div>
                </section>
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {activeDeskTab === 'stories' ? (
        <div className="desk-tool-workspace history-workspace stories-workspace">
          <section className="workspace-panel history-rail">
            <div className="history-rail-header">
              <div>
                <p className="eyebrow">Stories</p>
                <h3>MLB game archive through May 21</h3>
                <p className="react-section-copy">
                  Derived from warehoused plate appearances and pitch events so we can study how games actually broke, not just who won.
                </p>
              </div>
              <span className="mono history-archive-count">{storyArchive.length} days</span>
            </div>

            <div className="history-rail-list no-scrollbar">
              {!storiesLoaded ? <p className="react-section-copy">Loading story archive…</p> : null}
              {storyRailDays.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  className={`history-row ${activeStoryId === day.id ? 'active' : ''}`}
                  onClick={() => setActiveStoryId(day.id)}
                >
                  <div className="history-row-topline">
                    <span className="mono">{day.date}</span>
                    <span className="history-status-pill graded">{day.metrics.games} games</span>
                  </div>
                  <strong>{day.headline}</strong>
                  <p>
                    {day.metrics.quietFirst5} quiet first-5 starts | {day.metrics.bullpenFlips} bullpen flips | {day.metrics.comebackWins} comeback wins
                  </p>
                  <div className="history-row-tags">
                    <span>PA {day.metrics.plateAppearances}</span>
                    <span>Pitches {day.metrics.pitchEvents}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="workspace-panel history-detail">
            {!storiesLoaded ? (
              <p className="react-section-copy">Loading story detail…</p>
            ) : loadingStoryDaysById[activeStoryId] && !activeStoryDay ? (
              <p className="react-section-copy">Loading story day…</p>
            ) : activeStoryDay ? (
              <>
                <div className="history-detail-header">
                  <div>
                    <p className="eyebrow">Story detail</p>
                    <h2>{activeStoryDay.date}</h2>
                    <p className="react-section-copy">{activeStoryDay.headline}</p>
                  </div>
                  <div className="history-sports mono">
                    <span>MLB</span>
                    <span>{activeStoryDay.metrics.games} games</span>
                  </div>
                </div>

                <div className="history-metric-grid">
                  {activeStoryMetrics.map((metric) => (
                    <article key={`${activeStoryDay.id}-${metric.label}`} className={`parlay-stat-card history-metric-card ${getHistoryMetricTone(metric)}`}>
                      <span className="parlay-stat-label">{metric.label}</span>
                      <strong>{metric.value}</strong>
                      {metric.note ? <small>{metric.note}</small> : null}
                    </article>
                  ))}
                </div>

                <div className="history-section-grid story-section-grid">
                  <section className="action-section story-section-span">
                    <div className="action-section-header">
                      <h3>Game event log</h3>
                      <span>
                        {activeStoryGame
                          ? `${activeStoryGame.title} · ${activeStoryTimeline.length} events`
                          : activeStoryGameSummary
                            ? `${activeStoryGameSummary.title} · loading`
                            : 'No game selected'}
                      </span>
                    </div>

                    {activeStoryGame ? (
                      <div className="story-log-shell">
                        <div className="story-log-picker">
                          {activeStoryDay.games.map((game) => (
                            <button
                              key={`${activeStoryDay.id}-pick-${game.gamePk}`}
                              type="button"
                              className={`history-chip ${activeStoryGameSummary?.gamePk === game.gamePk ? 'active' : ''}`}
                              onClick={() => setSelectedStoryGamePk(game.gamePk)}
                            >
                              {game.awayTeam.split(' ').slice(-1)[0]} @ {game.homeTeam.split(' ').slice(-1)[0]}
                            </button>
                          ))}
                        </div>

                        <div className="story-log-summary">
                          <article className="history-ledger-card">
                            <span className="parlay-stat-label">Final score</span>
                            <strong>
                              {activeStoryGame.awayTeam} {activeStoryGame.summary?.awayRuns ?? 0} - {activeStoryGame.summary?.homeRuns ?? 0} {activeStoryGame.homeTeam}
                            </strong>
                            <small>{activeStoryGame.winnerTeam ? `${activeStoryGame.winnerTeam} won the game` : 'Final result unavailable'}</small>
                          </article>
                          <article className="history-ledger-card">
                            <span className="parlay-stat-label">Story tags</span>
                            <strong>{activeStoryGame.tags.length ? activeStoryGame.tags.join(' · ') : 'No tags'}</strong>
                            <small>
                              First scoring inning {activeStoryGame.firstScoringInning || '—'} · lead changes {activeStoryGame.leadChanges || 0}
                            </small>
                          </article>
                          <article className="history-ledger-card">
                            <span className="parlay-stat-label">Run split</span>
                            <strong>{activeStoryGame.totalRunsFirst5} first 5 · {activeStoryGame.totalRunsFinal} final</strong>
                            <small>
                              HR starter / relief: {activeStoryGame.hrOffStarters} / {activeStoryGame.hrOffRelievers}
                            </small>
                          </article>
                        </div>

                        <div className="story-log-groups">
                          {activeStoryTimelineGroups.map((group) => (
                            <section key={`${activeStoryGame.gamePk}-${group.key}`} className="story-log-group">
                              <div className="story-log-group-head">
                                <h4>{group.label}</h4>
                                <span className="history-status-pill graded">{group.events.length} plays</span>
                              </div>
                              <div className="story-log-events">
                                {group.events.map((event) => (
                                  <article
                                    key={`${activeStoryGame.gamePk}-${group.key}-${event.atBatIndex}`}
                                    className={`story-log-event tone-${classifyStoryEventTone(event)}`}
                                  >
                                    <div className="story-log-event-topline">
                                      <span className="mono">
                                        {event.half === 'top' ? 'T' : 'B'}
                                        {event.inning}
                                      </span>
                                      <strong>{event.event}</strong>
                                      <span className="mono">
                                        {event.awayScore}-{event.homeScore}
                                      </span>
                                    </div>
                                    <p>{event.description}</p>
                                    <div className="story-log-tags">
                                      <span>{event.battingTeam}</span>
                                      <span>
                                        {event.batterName} vs {event.pitcherName}
                                      </span>
                                      <span>{event.outs} outs</span>
                                      <span>{event.baseState || 'Empty'}</span>
                                      {event.runDelta > 0 ? <span>+{event.runDelta} run</span> : null}
                                      {event.isScoringPlay ? <span>Scoring play</span> : null}
                                    </div>
                                  </article>
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>
                      </div>
                    ) : activeStoryGameSummary ? (
                      <p className="react-section-copy">Loading selected game log…</p>
                    ) : (
                      <p className="react-section-copy">No game story is available on this day.</p>
                    )}
                  </section>

                  <section className="action-section story-section-span">
                    <div className="action-section-header">
                      <h3>Game stories</h3>
                      <span>{activeStoryDay.games.length}</span>
                    </div>
                    <div className="story-game-grid">
                      {activeStoryDay.games.map((game) => (
                        <article key={`${activeStoryDay.id}-${game.gamePk}`} className={`story-game-card ${activeStoryGameSummary?.gamePk === game.gamePk ? 'active' : ''}`}>
                          <div className="story-game-head">
                            <div>
                              <strong>{game.title}</strong>
                              <p className="react-section-copy">
                                {game.winnerTeam} over {game.loserTeam}
                              </p>
                            </div>
                            <span className="history-status-pill graded">
                              {game.totalRunsFinal} runs
                            </span>
                          </div>
                          <div className="history-chip-row">
                            <button
                              type="button"
                              className={`history-chip ${activeStoryGameSummary?.gamePk === game.gamePk ? 'active' : ''}`}
                              onClick={() => setSelectedStoryGamePk(game.gamePk)}
                            >
                              Load game log
                            </button>
                          </div>
                          <div className="story-summary-grid">
                            <div>
                              <span className="parlay-stat-label">Lead after 5</span>
                              <strong>{game.leadAfter5Team || 'Tied / none'}</strong>
                            </div>
                            <div>
                              <span className="parlay-stat-label">First scoring inning</span>
                              <strong>{game.firstScoringInning || 'No scoring'}</strong>
                            </div>
                            <div>
                              <span className="parlay-stat-label">Lead changes</span>
                              <strong>{game.leadChanges}</strong>
                            </div>
                            <div>
                              <span className="parlay-stat-label">Max comeback</span>
                              <strong>{game.maxComebackRuns}</strong>
                            </div>
                            <div>
                              <span className="parlay-stat-label">Runs first 5</span>
                              <strong>{game.totalRunsFirst5}</strong>
                            </div>
                            <div>
                              <span className="parlay-stat-label">HR starter / relief</span>
                              <strong>
                                {game.hrOffStarters} / {game.hrOffRelievers}
                              </strong>
                            </div>
                          </div>
                          {game.tags?.length ? (
                            <div className="history-chip-row">
                              {game.tags.map((tag: string) => (
                                <span key={`${game.gamePk}-${tag}`} className="history-chip">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <p className="react-section-copy">
                            {game.summary?.headline || 'Story summary unavailable'}.
                            {game.summary?.firstInningRuns !== undefined ? ` First inning runs: ${game.summary.firstInningRuns}.` : ''}
                            {game.summary?.awayRunsFirst5 !== undefined && game.summary?.homeRunsFirst5 !== undefined
                              ? ` First 5 split: ${game.title.split(' @ ')[0]} ${game.summary.awayRunsFirst5}, ${game.title.split(' @ ')[1]} ${game.summary.homeRunsFirst5}.`
                              : ''}
                          </p>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              </>
            ) : (
              <p className="react-section-copy">No story day is available yet.</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default App

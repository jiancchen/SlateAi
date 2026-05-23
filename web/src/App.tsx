import { useEffect, useMemo, useState } from 'react'
import {
  buildParlayModel,
  createParlayLeg,
  formatAmericanOdds,
  rankAnalysisPicks,
  rankFlipRiskPicks,
  rankMlbPlayerProps
} from './lib/sports-model.js'
import type { HistoryEntry, HistoryRecord } from './lib/history-types'
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
  { id: 'favorites', label: 'Favorites' },
  { id: 'totals', label: 'O/U' },
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

const propTypeFilters = [
  { id: 'all', label: 'All' },
  { id: 'homeRun', label: 'HR' },
  { id: 'rbi', label: 'RBI' },
  { id: 'totalBases', label: 'TB' },
  { id: 'hits', label: 'Hits' },
  { id: 'walks', label: 'Walks' },
  { id: 'singles', label: 'Singles' }
] as const

const recommendationModes = [
  {
    id: 'favorites',
    label: 'Favorites',
    copy: 'Cleaner core reads only. On messy slates this lane stays intentionally short.'
  },
  {
    id: 'balanced',
    label: 'Balanced',
    copy: 'Blends core legs with a measured amount of live upset exposure.'
  },
  {
    id: 'flips',
    label: 'Flips',
    copy: 'Higher-variance dogs and fragile-favorite fade spots.'
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

const buildPitcherSummary = (pitcher: AnyRecord = {}, holdConfidence?: number | null) => {
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

  return {
    headline: pitcherName === 'TBD starter' ? pitcherName : `${pitcherName} (${pitchHand})`,
    primary: `${record} | ${era} | ${whip}`,
    detailStats,
    recent,
    trendStats,
    usageLabel: usageContext.workloadLabel || '',
    usageNote: usageContext.note || '',
    usageStatusLabel: usageContext.label || '',
    savant: pitcher.savant || null
  }
}

const buildTeamContextSummary = (team: AnyRecord = {}) => {
  if (!team || (!Number.isFinite(Number(team.wins)) && !Number.isFinite(Number(team.losses)))) return ''
  const record = `${team.wins ?? '-'}-${team.losses ?? '-'}`
  const rankLabel = team.divisionLeader ? '1st in division' : `${formatOrdinal(team.divisionRank)} in division`
  const streak = team.streakCode ? ` | ${team.streakCode}` : ''
  return `${record} | ${rankLabel}${streak}`
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
    if (game.tennisContext.liveDog) chips.push({ tone: 'warning', label: 'Dog live' })
    if (game.tennisContext.fatigueFlag) chips.push({ tone: 'danger', label: 'Fatigue live' })
    if (game.tennisContext.formEdgeName === game.analysis?.participant?.name) chips.push({ tone: 'accent', label: 'Form edge' })
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

  const gradedHistoryEntries = useMemo(
    () =>
      [...historyArchive]
        .filter(
          (entry): entry is HistoryEntry =>
            entry.status === 'graded' &&
            Boolean(entry.performance?.mlbFullGame) &&
            Boolean(entry.performance?.mlbFirst5) &&
            Boolean(entry.performance?.hrBoard)
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
      hrBoard: summarize(historyTrendPoints.map((entry) => entry.hrBoard)),
      tennis: summarize(historyTrendPoints.map((entry) => entry.tennis)),
      props: summarize(historyTrendPoints.map((entry) => entry.props))
    }
  }, [historyTrendPoints])

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

  const analysisPicks = useMemo(() => rankAnalysisPicks(games), [games])
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
    () => analysisPicks.filter((pick: AnyRecord) => pick.game?.moneyline?.available),
    [analysisPicks]
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
          priceLabel: pick.participant?.americanLabel ?? 'Model only',
          metaLabel: pick.marketProbabilityLabel,
          summary: pick.rationale,
          tags: [pick.tier, ...buildGameHighlights(pick.game).map((chip) => chip.label)].slice(0, 3),
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
          priceLabel: pick.participant?.americanLabel ?? 'Dog look',
          metaLabel: pick.marketProbabilityLabel,
          summary: pick.flipReason,
          tags: [pick.tier, ...buildGameHighlights(pick.game).map((chip) => chip.label)].slice(0, 3),
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
    () => [...favoriteCatalogEntries, ...totalCatalogEntries, ...propCatalogEntries, ...flipCatalogEntries],
    [favoriteCatalogEntries, totalCatalogEntries, propCatalogEntries, flipCatalogEntries]
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
        if (builderCatalogTab !== 'all' && entry.category !== builderCatalogTab) return false
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
    const awayHold = Number(projection?.awayStarterHoldConfidence)
    const homeHold = Number(projection?.homeStarterHoldConfidence)
    const awayStarter = buildPitcherSummary(game.starterContext?.away, awayHold)
    const homeStarter = buildPitcherSummary(game.starterContext?.home, homeHold)
    const awayTeam = game.matchup?.[0]?.name ?? 'Away'
    const homeTeam = game.matchup?.[1]?.name ?? 'Home'
    const awayLineup = game.lineupBoard?.away
    const homeLineup = game.lineupBoard?.home
    const featuredProps = game.playerProps?.featured ?? []
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
    const awayProjectionLead = projection
      ? projection.edgeTeam === awayTeam
        ? Number(projection.edgeHits || 0)
        : -Number(projection.edgeHits || 0)
      : null
    const first5Lead = projection
      ? projection.first5EdgeTeam === awayTeam
        ? Number(projection.first5EdgeHits || 0)
        : -Number(projection.first5EdgeHits || 0)
      : null
    const lateLead = projection
      ? projection.lateEdgeTeam === awayTeam
        ? Number(projection.lateEdgeHits || 0)
        : -Number(projection.lateEdgeHits || 0)
      : null
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
    const awayStory = game.storyContext?.away?.summary
    const homeStory = game.storyContext?.home?.summary
    const awayRecentGames = game.stateContext?.recentGames?.away ?? []
    const homeRecentGames = game.stateContext?.recentGames?.home ?? []
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
                  splitLabel: `${awayTeam} ${formatPercent(projection.firstInning.awayRunProbabilityPct, 0)} score · ${homeTeam} ${formatPercent(projection.firstInning.homeRunProbabilityPct, 0)} score`
                }
              ]
            : [])
        ]
      : []
    const renderBridgeChainCard = (
      teamName: string,
      relievers: AnyRecord[],
      chainScore: number,
      workloadLabel: string,
      advantage: boolean
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
        {relievers.length ? (
          <div className="bridge-chain-list">
            {relievers.slice(0, 2).map((reliever) => (
              <div key={`${teamName}-${reliever.pitcherId || reliever.name}`} className="bridge-chain-row">
                <div>
                  <strong>{reliever.name}</strong>
                  <small>{reliever.role || 'middle'} · {formatNumber(reliever.expectedOuts, 2)} outs</small>
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
        <section className="detail-panel react-card-grid">
          <article className="react-team-card" style={{ borderColor: `${getTeamAccent('MLB', awayTeam)}55` }}>
            <div className="react-team-card-top">
              <div className="react-team-id">
                {getTeamLogoUrl('MLB', awayTeam) ? <img src={getTeamLogoUrl('MLB', awayTeam)} alt={awayTeam} className="react-team-logo" /> : null}
                <div>
                  <strong>{awayTeam}</strong>
                  <small>{buildTeamContextSummary(game.teamContext?.away)}</small>
                  {renderRecentGamesStrip(awayTeam, awayRecentGames)}
                </div>
              </div>
              <span className="builder-status-pill open">{lineupStatusLabel(game.lineupBoard?.status?.away)}</span>
            </div>
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
                </div>
              </div>
              <span className="builder-status-pill open">{lineupStatusLabel(game.lineupBoard?.status?.home)}</span>
            </div>
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
            <div className="mlb-signal-grid">
              <article className={`mlb-signal-card ${getMetricTone(Number(awayProjectionLead))}`}>
                <div className="mlb-signal-head">
                  <MetricHelp
                    label="Point edge"
                    help="Projected full-game hit and traffic gap. Positive means the away side is expected to create more base traffic; negative means the home side is."
                  />
                  <span>{projection.edgeTeam || 'Even'}</span>
                </div>
                <strong>{Number.isFinite(awayProjectionLead) ? `${awayTeam} ${formatSignedNumber(awayProjectionLead, 1)} H` : 'Even board'}</strong>
                <small>
                  {awayTeam} {projection.awayProjectedHits} H at {projection.awayHitEfficiencyPct}% vs {homeTeam} {projection.homeProjectedHits} H at {projection.homeHitEfficiencyPct}%
                </small>
              </article>

              <article className={`mlb-signal-card ${getMetricTone(Number(first5Lead))}`}>
                <div className="mlb-signal-head">
                  <MetricHelp
                    label="First 5 edge"
                    help="Projected first-five hit edge after folding in lineup fit, starter form, and starter hold confidence."
                  />
                  <span>{projection.first5EdgeTeam || 'Even'}</span>
                </div>
                <strong>{Number.isFinite(first5Lead) ? `${awayTeam} ${formatSignedNumber(first5Lead, 1)} H` : 'Even first 5'}</strong>
                <small>
                  {awayTeam} {projection.awayFirst5ProjectedHits} H vs {homeTeam} {projection.homeFirst5ProjectedHits} H
                </small>
              </article>

              <article className={`mlb-signal-card ${getMetricTone(Number(lateLead))}`}>
                <div className="mlb-signal-head">
                  <MetricHelp
                    label="Late edge"
                    help="Projected rest-of-game hit edge once the starters hand the game to the likely bridge relievers."
                  />
                  <span>{projection.lateEdgeTeam || 'Even'}</span>
                </div>
                <strong>{Number.isFinite(lateLead) ? `${awayTeam} ${formatSignedNumber(lateLead, 1)} H` : 'Even late'}</strong>
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
                <small>{awayTeam}: {projection.awayPitcherType} · {homeTeam}: {projection.homePitcherType}</small>
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
                <strong>{game.analysis?.modelEdgeLabel || 'No edge stored'}</strong>
                <small>
                  {game.analysis?.indicators?.projectedHitEdgeForPick !== undefined
                    ? `${game.analysis?.participant?.name || projection.edgeTeam} carry ${formatNumber(game.analysis.indicators.projectedHitEdgeForPick, 1)} projected-hit edge for the side pick.`
                    : 'Use together with hit edge, bridge chain, and lineup pressure.'}
                </small>
              </article>
              <article className="react-mini-panel">
                <span className="eyebrow">First 5</span>
                <strong>{projection.first5EdgeTeam || 'Even'}</strong>
                <small>{projection.totals?.first5?.summary}</small>
              </article>
              <article className="react-mini-panel">
                <span className="eyebrow">Bridge</span>
                <strong>{projection.bridgeEdgeTeam || 'Even'}</strong>
                <small>{projection.totals?.late?.summary}</small>
              </article>
              <article className="react-mini-panel">
                <span className="eyebrow">Full game</span>
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
                projection.bridgeEdgeTeam === awayTeam
              )}
              {renderBridgeChainCard(
                homeTeam,
                homeBridge,
                homeBridgeScore,
                projection.homeBullpenExhaustionLabel || 'unknown',
                projection.bridgeEdgeTeam === homeTeam
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
                        <small>{lineupTeam.opposingStarter?.pitchMixSummary || 'Pitch mix not stored'}</small>
                      </div>
                      <p className="react-section-copy">{lineupTeam.summary?.overview || lineupTeam.summary?.bullpenOverview || lineupTeam.opposingStarter?.pitchMixSummary}</p>
                      <div className="react-pill-row">
                        {(lineupTeam.summary?.overperformHitters || []).slice(0, 3).map((hitter: AnyRecord) => (
                          <span key={`${teamName}-carry-${hitter.name}`} className="game-highlight-chip accent">
                            {hitter.name} {hitter.tag}
                          </span>
                        ))}
                        {(lineupTeam.summary?.underperformHitters || []).slice(0, 2).map((hitter: AnyRecord) => (
                          <span key={`${teamName}-fade-${hitter.name}`} className="game-highlight-chip danger">
                            {hitter.name} {hitter.tag}
                          </span>
                        ))}
                      </div>
                      {lineupTeam.summary?.bullpenOverview ? <small>{lineupTeam.summary.bullpenOverview}</small> : null}
                      {lineupTeam.summary?.bullpenOverperformHitters?.length ? (
                        <div className="react-pill-row">
                          {lineupTeam.summary.bullpenOverperformHitters.slice(0, 3).map((hitter: AnyRecord) => (
                            <span key={`${teamName}-bridge-${hitter.name}-${hitter.slot ?? 'x'}`} className="game-highlight-chip warning">
                              Bridge: {hitter.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {lineupTeam.bvpHistory ? (
                        <div className="lineup-bvp-block">
                          <small>{lineupTeam.bvpHistory.summary}</small>
                          <div className="react-pill-row">
                            {(lineupTeam.bvpHistory.hot || []).slice(0, 2).map((entry: AnyRecord) => (
                              <span key={`${teamName}-bvp-hot-${entry.name}`} className="game-highlight-chip accent">
                                BvP hot: {entry.name} {entry.sample}
                                {entry.homeRuns ? `, ${entry.homeRuns} HR` : ''}
                              </span>
                            ))}
                            {(lineupTeam.bvpHistory.cold || []).slice(0, 2).map((entry: AnyRecord) => (
                              <span key={`${teamName}-bvp-cold-${entry.name}`} className="game-highlight-chip danger">
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
                    <strong>{selectedGame.moneyline?.available ? selectedGame.analysis?.marketProbabilityLabel : 'Model only'}</strong>
                    <small>{selectedGame.moneyline?.available ? selectedGame.moneyline.provider : 'No moneyline'}</small>
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
                              {balancedRecommendation.targetFlipLegs === 1 ? '' : 's'} in this {recommendedLegTarget}-leg mix from an average live-dog rate of{' '}
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
              <h3>Accuracy trend through May 21</h3>
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
                <h3>Archive through May 21</h3>
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
                <h3>MLB script archive through May 21</h3>
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
                    {day.metrics.quietFirst5} quiet first-5 scripts | {day.metrics.bullpenFlips} bullpen flips | {day.metrics.comebackWins} comeback wins
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
                            <strong>{activeStoryGame.tags.length ? activeStoryGame.tags.join(' · ') : 'No script tags'}</strong>
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

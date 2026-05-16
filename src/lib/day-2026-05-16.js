import { createSportsMatchModel } from './sports-model.js'
import { parkContextByHomeTeam } from './day-2026-05-13-mlb-data.js'
import {
  standingsContextByTeam,
  teamOffenseContextByTeam,
  teamBullpenContextByTeam,
  teamSavantContextByTeam
} from './mlb-context-2026-05-16.js'
import { homeRunTargetsByGame } from './day-2026-05-16-home-run-data.js'
import { bullpenChainByTeam, rawGames } from './day-2026-05-16-data.js'
import { lineupBoardsByGameId, lineupMatchupContextByGameId } from './day-2026-05-16-lineups.js'

export const slateMeta = {
  title: 'Saturday MLB Desk',
  date: 'May 16, 2026',
  isoDate: '2026-05-16',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A live May 16 MLB slate built from official probable starters, current board pricing, standings, team hit context, bullpen quality, Statcast contact quality, and the warehouse bridge-reliever workload chain.',
  notes: [
    'This is the first live board where the desk explicitly separates the starter phase, likely bridge-reliever window, and full-game hold instead of collapsing all nine innings into one read.',
    'The bullpen chain is still a probabilistic layer, not a certainty layer, but it is finally concrete enough to flag which sides look cleaner for first five than for full game.',
    'The May 16 card now pulls posted batting orders from the official feed/live endpoint, then scores each listed hitter on recent form, handedness split, and starter-style fit.',
    'The home-run layer is a pre-lineup carry board built from Statcast xHR, recent bunching, no-doubter quality, and the opposing starter script, not just season HR totals.',
    'Official WNBA sources show no May 16 board, so the desk stays MLB-only today and will reopen WNBA on the next live date.'
  ]
}

export const filters = ['All', 'MLB']

export const oddsMeta = {
  provider: 'Official MLB data + ScoresAndOdds live board',
  snapshot: 'May 16, 2026, 8:25 AM PT',
  note:
    'Pricing uses the accessible same-day ScoresAndOdds MLB board and matchup pages, then layers official probable starters, current standings, hit-production context, bullpen season quality, Statcast contact quality, and the warehouse likely-reliever chain.'
}

export const sources = [
  { label: 'MLB probable pitchers', url: 'https://www.mlb.com/probable-pitchers' },
  {
    label: 'MLB schedule API for May 16, 2026',
    url: 'https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-16&hydrate=probablePitcher,team'
  },
  {
    label: 'MLB standings API for 2026 regular season',
    url: 'https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason'
  },
  { label: 'TeamRankings MLB hits per game', url: 'https://www.teamrankings.com/mlb/stat/hits-per-game' },
  {
    label: 'Covers MLB bullpen ERA',
    url: 'https://www.covers.com/sport/baseball/mlb/statistics/team-bullpenera/2026'
  },
  {
    label: 'Statcast park factors',
    url: 'https://baseballsavant.mlb.com/leaderboard/statcast-park-factors'
  },
  { label: 'Baseball Savant league hitting', url: 'https://baseballsavant.mlb.com/league' },
  { label: 'MLB starting lineups', url: 'https://www.mlb.com/starting-lineups' },
  { label: 'Statcast home run tracker', url: 'https://baseballsavant.mlb.com/leaderboard/home-runs' },
  { label: 'ScoresAndOdds MLB board', url: 'https://www.scoresandodds.com/mlb' },
  { label: 'WNBA official scoreboard', url: 'https://stats.wnba.com/stats/scoreboardV2?GameDate=05/16/2026&LeagueID=10&DayOffset=0' }
]

const market = (label, book, value) => ({ label, book, value })

const makeBoardOdds = ({ spread = '', total = '', moneyline = '', provider = oddsMeta.provider }) => ({
  participantOrder: [0, 1],
  markets: [
    ...(spread ? [market('Spread', provider, spread)] : []),
    ...(total ? [market('Total', provider, total)] : []),
    ...(moneyline ? [market('Moneyline', provider, moneyline)] : [])
  ],
  note: 'Board snapshot plus model context. Use the market price and phase split together, not separately.',
  provider
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const parseAmericanPair = (value = '') =>
  [...`${value}`
    .replace(/\beven\b/gi, '+100')
    .replace(/\bev\b/gi, '+100')
    .replace(/\bpk\b/gi, '+100')
    .matchAll(/[+-]\d+/g)]
    .map((match) => Number(match[0]))

const impliedProbabilityFromAmerican = (americanOdds) =>
  americanOdds > 0 ? 100 / (americanOdds + 100) : Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)

const parseWinningPercentage = (value = '') => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0.5
}

const parseGamesBack = (value = '') => {
  if (!value || value === '-' || value === 'E') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const parseStreakCode = (value = '') => {
  const match = value.match(/^([WL])(\d+)$/i)
  if (!match) return 0
  return match[1].toUpperCase() === 'W' ? Number(match[2]) : -Number(match[2])
}

const formatOrdinal = (value) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return String(value)
  if (numericValue % 100 >= 11 && numericValue % 100 <= 13) return `${numericValue}th`
  if (numericValue % 10 === 1) return `${numericValue}st`
  if (numericValue % 10 === 2) return `${numericValue}nd`
  if (numericValue % 10 === 3) return `${numericValue}rd`
  return `${numericValue}th`
}

const pitcherDetail = (pitcher) =>
  `${pitcher.fullName} (${pitcher.pitchHand || '?'}HP) | ${pitcher.wins}-${pitcher.losses} | ${pitcher.era} ERA | ${pitcher.strikeOuts} SO | ${Number(pitcher.whip || 0).toFixed(2)} WHIP | ${pitcher.inningsPitched} IP`

const buildStandingsLabel = (team = {}) => {
  const rankLabel = team.divisionLeader ? 'division leader' : `${formatOrdinal(team.divisionRank)} in division`
  const runDiff = Number(team.runDifferential) || 0
  return `${team.wins}-${team.losses}, ${rankLabel}, ${runDiff >= 0 ? '+' : ''}${runDiff} RD`
}

const starterScore = (pitcher = {}) => {
  const era = Number(pitcher.era)
  const eraScore = Number.isFinite(era) ? clamp(92 - era * 9, 18, 90) : 50
  const decisions = Number(pitcher.wins || 0) + Number(pitcher.losses || 0)
  const winPct = decisions > 0 ? Number(pitcher.wins || 0) / decisions : 0.5
  const recordScore = clamp(28 + winPct * 46 + Math.min(decisions, 6) * 2, 24, 86)
  const strikeoutScore = clamp(34 + Number(pitcher.strikeOuts || 0) * 1.08, 24, 88)
  return recordScore * 0.28 + eraScore * 0.44 + strikeoutScore * 0.28
}

const buildStandingsScore = (team = {}) =>
  clamp(
    26 +
      parseWinningPercentage(team.winningPercentage) * 56 +
      (6 - (Number(team.divisionRank) || 5)) * 3 +
      clamp(Number(team.runDifferential) || 0, -80, 80) / 5 +
      (team.divisionLeader ? 6 : 0) +
      parseStreakCode(team.streakCode) * 1.2 -
      parseGamesBack(team.gamesBack) * 0.8,
    18,
    94
  )

const buildOffenseScore = (profile = {}, role = '') => {
  const splitHits = /home/i.test(role) ? Number(profile.homeHitsPerGame) : Number(profile.awayHitsPerGame)
  const baselineHits = Number(profile.hitsPerGame)
  const recentHits = Number(profile.last3HitsPerGame)

  if (![splitHits, baselineHits, recentHits].every(Number.isFinite)) return 50

  return clamp(
    48 +
      (baselineHits - 7.8) * 10 +
      (splitHits - 7.8) * 7 +
      (recentHits - baselineHits) * 8,
    24,
    92
  )
}

const buildBullpenScore = (profile = {}) => {
  const era = Number(profile.era)
  const whip = Number(profile.whip)
  const strikeouts = Number(profile.strikeouts)
  const walks = Number(profile.walks)

  if (![era, whip, strikeouts, walks].every(Number.isFinite)) return 50

  const eraScore = clamp(96 - era * 11, 18, 92)
  const whipScore = clamp(114 - whip * 35, 20, 92)
  const ratioScore = clamp(28 + (strikeouts / Math.max(walks, 1)) * 18, 22, 88)

  return eraScore * 0.46 + whipScore * 0.34 + ratioScore * 0.2
}

const buildBullpenChainScore = (profile = {}) => {
  const relievers = Array.isArray(profile?.topRelievers) ? profile.topRelievers.slice(0, 2) : []
  if (!relievers.length) return 50

  const scores = relievers.map((reliever, index) =>
    clamp(
      Number(reliever.firstRelieverLikelihood || 55) * 0.24 +
        Number(reliever.availabilityScore || 55) * 0.31 +
        Number(reliever.bridgeScore || 60) * 0.31 +
        Number(reliever.expectedOuts || 2.5) * 4.2 +
        (/bridge/i.test(reliever.role || '') ? 4 : 0) -
        (reliever.workedYesterday ? 6 : 0) -
        (reliever.backToBack ? 10 : 0) -
        index * 2,
      18,
      96
    )
  )

  return scores[0] * 0.62 + (scores[1] ?? scores[0]) * 0.38
}

const buildSavantScore = (profile = {}) => {
  const blendedHitRate = (Number(profile.ba) + Number(profile.xba)) / 2
  return clamp(
    50 +
      (blendedHitRate - 0.245) * 520 +
      (Number(profile.hardHitPct) - 39) * 1 +
      (Number(profile.barrelPct) - 7.5) * 1.5 +
      (Number(profile.xwoba) - 0.315) * 160,
    18,
    94
  )
}

const topRelieverSummary = (profile = {}) => {
  const relievers = Array.isArray(profile?.topRelievers) ? profile.topRelievers.slice(0, 2) : []
  if (!relievers.length) return 'No likely bridge chain stored yet.'

  return relievers
    .map((reliever) => {
      const fatigueTag = reliever.backToBack ? ' B2B' : reliever.workedYesterday ? ' worked yesterday' : ''
      return `${reliever.name} ${Number(reliever.firstRelieverLikelihood).toFixed(0)}% first-up / ${Number(reliever.availabilityScore).toFixed(0)} avail${fatigueTag}`
    })
    .join('; ')
}

const getWindowLabel = (startMinutes) => {
  if (startMinutes < 720) return 'Saturday matinee'
  if (startMinutes < 960) return 'Saturday afternoon board'
  if (startMinutes < 1110) return 'Saturday prime board'
  return 'Saturday night board'
}

const enrichRawGame = (game) => ({
  ...game,
  teamContext: { away: standingsContextByTeam[game.away], home: standingsContextByTeam[game.home] },
  parkContext: parkContextByHomeTeam[game.home] ?? null,
  offenseContext: { away: teamOffenseContextByTeam[game.away], home: teamOffenseContextByTeam[game.home] },
  bullpenContext: { away: teamBullpenContextByTeam[game.away], home: teamBullpenContextByTeam[game.home] },
  bullpenChainContext: { away: bullpenChainByTeam[game.away] ?? null, home: bullpenChainByTeam[game.home] ?? null },
  savantContext: { away: teamSavantContextByTeam[game.away], home: teamSavantContextByTeam[game.home] }
})

const buildMlbGame = (raw) => {
  const [awayOdds = null, homeOdds = null] = parseAmericanPair(raw.moneyline)
  const awayMarketScore = Number.isFinite(awayOdds) ? impliedProbabilityFromAmerican(awayOdds) * 100 : 50
  const homeMarketScore = Number.isFinite(homeOdds) ? impliedProbabilityFromAmerican(homeOdds) * 100 : 50
  const awayStarterScore = starterScore(raw.awayPitcher)
  const homeStarterScore = starterScore(raw.homePitcher)
  const awayStandingsScore = buildStandingsScore(raw.teamContext.away)
  const homeStandingsScore = buildStandingsScore(raw.teamContext.home)
  const awayOffenseScore = buildOffenseScore(raw.offenseContext.away, 'Away')
  const homeOffenseScore = buildOffenseScore(raw.offenseContext.home, 'Home')
  const awayBullpenScore = buildBullpenScore(raw.bullpenContext.away)
  const homeBullpenScore = buildBullpenScore(raw.bullpenContext.home)
  const awayBullpenChainScore = buildBullpenChainScore(raw.bullpenChainContext.away)
  const homeBullpenChainScore = buildBullpenChainScore(raw.bullpenChainContext.home)
  const awaySavantScore = buildSavantScore(raw.savantContext.away)
  const homeSavantScore = buildSavantScore(raw.savantContext.home)

  const awayFirst5Composite =
    awayMarketScore * 0.22 +
    awayStarterScore * 0.32 +
    awayStandingsScore * 0.11 +
    awayOffenseScore * 0.17 +
    awaySavantScore * 0.18
  const homeFirst5Composite =
    homeMarketScore * 0.22 +
    homeStarterScore * 0.32 +
    homeStandingsScore * 0.11 +
    homeOffenseScore * 0.17 +
    homeSavantScore * 0.18

  const awayFullGameComposite =
    awayMarketScore * 0.24 +
    awayStarterScore * 0.22 +
    awayStandingsScore * 0.12 +
    awayOffenseScore * 0.14 +
    awayBullpenScore * 0.1 +
    awayBullpenChainScore * 0.09 +
    awaySavantScore * 0.09
  const homeFullGameComposite =
    homeMarketScore * 0.24 +
    homeStarterScore * 0.22 +
    homeStandingsScore * 0.12 +
    homeOffenseScore * 0.14 +
    homeBullpenScore * 0.1 +
    homeBullpenChainScore * 0.09 +
    homeSavantScore * 0.09

  const awayLateComposite =
    awayBullpenScore * 0.42 +
    awayBullpenChainScore * 0.38 +
    awayOffenseScore * 0.1 +
    awaySavantScore * 0.1
  const homeLateComposite =
    homeBullpenScore * 0.42 +
    homeBullpenChainScore * 0.38 +
    homeOffenseScore * 0.1 +
    homeSavantScore * 0.1

  const first5Index = awayFirst5Composite >= homeFirst5Composite ? 0 : 1
  const fullGameIndex = awayFullGameComposite >= homeFullGameComposite ? 0 : 1
  const lateIndex = awayLateComposite >= homeLateComposite ? 0 : 1
  const favoriteIndex = awayMarketScore >= homeMarketScore ? 0 : 1
  const first5Team = first5Index === 0 ? raw.away : raw.home
  const projectedTeam = fullGameIndex === 0 ? raw.away : raw.home
  const lateTeam = lateIndex === 0 ? raw.away : raw.home
  const favoriteTeam = favoriteIndex === 0 ? raw.away : raw.home
  const bullpenEdgeTeam = awayBullpenChainScore >= homeBullpenChainScore ? raw.away : raw.home
  const runIndex = Number(raw.parkContext?.indexRuns || 100)
  const chainGap = Math.abs(awayBullpenChainScore - homeBullpenChainScore)

  const tags = [
    first5Team === projectedTeam ? `${projectedTeam} first-5 + full-game` : `${first5Team} first 5 / ${lateTeam} late`,
    `${bullpenEdgeTeam} bridge edge`,
    runIndex >= 106 ? 'Run-boosting park' : runIndex <= 94 ? 'Run-suppressing park' : `${favoriteTeam} price edge`
  ]

  const factors = [
    `Current board: ${raw.moneyline} | ${raw.total} | ${raw.spread}.`,
    `${raw.awayPitcher.fullName} gives ${raw.away} a ${raw.awayPitcher.era} ERA, ${Number(raw.awayPitcher.whip || 0).toFixed(2)} WHIP, ${raw.awayPitcher.strikeOuts} strikeout baseline; ${raw.homePitcher.fullName} gives ${raw.home} a ${raw.homePitcher.era} ERA, ${Number(raw.homePitcher.whip || 0).toFixed(2)} WHIP, ${raw.homePitcher.strikeOuts} strikeout baseline.`,
    `${raw.away} enter ${buildStandingsLabel(raw.teamContext.away)} with ${raw.offenseContext.away.hitsPerGame.toFixed(2)} H/G and last 3 at ${raw.offenseContext.away.last3HitsPerGame.toFixed(2)}; ${raw.home} enter ${buildStandingsLabel(raw.teamContext.home)} with ${raw.offenseContext.home.hitsPerGame.toFixed(2)} H/G and last 3 at ${raw.offenseContext.home.last3HitsPerGame.toFixed(2)}.`,
    `${raw.away} bullpen: ${raw.bullpenContext.away.era.toFixed(2)} ERA, ${raw.bullpenContext.away.whip.toFixed(2)} WHIP. Likely first two relievers: ${topRelieverSummary(raw.bullpenChainContext.away)}`,
    `${raw.home} bullpen: ${raw.bullpenContext.home.era.toFixed(2)} ERA, ${raw.bullpenContext.home.whip.toFixed(2)} WHIP. Likely first two relievers: ${topRelieverSummary(raw.bullpenChainContext.home)}${raw.pitcherSourceNote ? ` ${raw.pitcherSourceNote}` : ''}`
  ]

  let summary = ''
  if (first5Team === projectedTeam && projectedTeam === lateTeam) {
    summary = `${projectedTeam} carry the cleaner all-phase script on the morning board, with the starter window, bridge reliever lane, and full-game hold all leaning the same direction.`
  } else if (first5Team !== lateTeam) {
    summary = `${raw.away} @ ${raw.home} is a split-script matchup: ${first5Team} profile cleaner through the starter phase, but ${lateTeam} own the stronger bridge-to-finish lane once the game leaves the opener.`
  } else {
    summary = `${projectedTeam} still look cleaner full game, but the edge is more about keeping the bridge and late relief chain intact than simply winning the first few innings.`
  }

  return {
    id: raw.id,
    league: 'MLB',
    title: `${raw.away} @ ${raw.home}`,
    start: raw.start,
    startMinutes: raw.startMinutes,
    stage: getWindowLabel(raw.startMinutes),
    spotlight:
      Math.abs(awayFullGameComposite - homeFullGameComposite) >= 4.5 ||
      first5Team !== lateTeam ||
      chainGap >= 8 ||
      runIndex >= 108,
    tags: [...new Set(tags)].slice(0, 3),
    matchup: [
      { side: 'Away', name: raw.away, detail: pitcherDetail(raw.awayPitcher) },
      { side: 'Home', name: raw.home, detail: pitcherDetail(raw.homePitcher) }
    ],
    summary,
    lean: `Lean ${projectedTeam}, but keep the ${first5Team === projectedTeam ? 'starter-phase edge' : `${first5Team} first-five edge`} and ${lateTeam} late-game hold in mind before treating it like one uniform script.`,
    factors,
    swingFactor: `Swing factor: whether ${favoriteTeam} can survive the bridge innings cleanly once the likely first two relievers take over.`,
    teamContext: raw.teamContext,
    parkContext: raw.parkContext,
    offenseContext: raw.offenseContext,
    bullpenContext: raw.bullpenContext,
    bullpenChainContext: raw.bullpenChainContext,
    savantContext: raw.savantContext,
    lineupContext: lineupMatchupContextByGameId[raw.id] ?? null,
    lineupBoard: lineupBoardsByGameId[raw.id] ?? null,
    homeRunTargets: homeRunTargetsByGame[`${raw.away} @ ${raw.home}`] ?? null,
    starterContext: { away: raw.awayPitcher, home: raw.homePitcher },
    pitcherSourceNote: raw.pitcherSourceNote || '',
    odds: makeBoardOdds({ spread: raw.spread, total: raw.total, moneyline: raw.moneyline, provider: oddsMeta.provider })
  }
}

export const games = rawGames.map((game) =>
  createSportsMatchModel(buildMlbGame(enrichRawGame(game)), oddsMeta.provider)
)

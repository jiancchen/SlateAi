import { createSportsMatchModel } from './sports-model.js'
import { parkContextByHomeTeam } from './day-2026-05-13-mlb-data.js'
import {
  standingsContextByTeam,
  teamOffenseContextByTeam,
  teamBullpenContextByTeam,
  teamSavantContextByTeam
} from './mlb-context-2026-05-19.js'
import { teamStoryContextByTeam } from './mlb-story-context-2026-05-19.js'
import { homeRunTargetsByGame } from './day-2026-05-19-home-run-data.js'
import { bullpenChainByTeam, rawGames } from './day-2026-05-19-data.js'
import { lineupBoardsByGameId, lineupMatchupContextByGameId } from './day-2026-05-19-lineups.js'

export const mlbNotes = [
  'The May 19 MLB board is built after the ugly May 18 postmortem, so the model is now lighter on shaky minor favorites, harsher on incomplete-lineup traffic edges, and more willing to leave noisy games out of the core lane.',
  'Today’s emphasis is cleaner separation between real baseball control and paper-favorite traps: if the starter window, lineup pressure, bridge chain, and team story do not agree, the card should read as volatile instead of pretending certainty.',
  'The home-run layer stays pre-lineup for most games until more official batting orders lock, and the broader player-prop board is now more important than forcing a tiny list of bomb-only picks.'
]

export const mlbSources = [
  { label: 'MLB probable pitchers', url: 'https://www.mlb.com/probable-pitchers/2026-05-19' },
  {
    label: 'MLB schedule API for May 19, 2026',
    url: 'https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-19&hydrate=probablePitcher,team'
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
  { label: 'Baseball Savant league hitting', url: 'https://baseballsavant.mlb.com/league' },
  {
    label: 'ESPN MLB daily batting leaders for May 18, 2026',
    url: 'https://www.espn.com/mlb/stats/dailyleaders/_/date/20260518/type/batting'
  },
  { label: 'MLB starting lineups', url: 'https://www.mlb.com/starting-lineups' },
  { label: 'ScoresAndOdds MLB board', url: 'https://www.scoresandodds.com/mlb?date=2026-05-19' }
]

const oddsProvider = 'Official MLB data + ScoresAndOdds live board'

const market = (label, book, value) => ({ label, book, value })

const makeBoardOdds = ({ spread = '', total = '', moneyline = '', provider = oddsProvider }) => ({
  participantOrder: [0, 1],
  markets: [
    ...(spread ? [market('Spread', provider, spread)] : []),
    ...(total ? [market('Total', provider, total)] : []),
    ...(moneyline ? [market('Moneyline', provider, moneyline)] : [])
  ],
  note: 'Board snapshot plus model context. Read the side together with the first-five and late-game split.',
  provider
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const profileSignature = (profile = {}) => JSON.stringify(profile)
const buildStaleSignatureSet = (profilesByTeam = {}, minTeams = 3) => {
  const counts = new Map()

  for (const profile of Object.values(profilesByTeam)) {
    const signature = profileSignature(profile)
    counts.set(signature, (counts.get(signature) || 0) + 1)
  }

  return new Set([...counts.entries()].filter(([, count]) => count >= minTeams).map(([signature]) => signature))
}

const staleOffenseSignatures = buildStaleSignatureSet(teamOffenseContextByTeam)
const staleBullpenSignatures = buildStaleSignatureSet(teamBullpenContextByTeam)

const flagContextProfile = (profile, staleSignatures, kind) => {
  if (!profile) return null
  const signature = profileSignature(profile)
  if (!staleSignatures.has(signature)) return profile

  return {
    ...profile,
    staleFeed: true,
    staleReason: `${kind} feed duplicated across multiple clubs`
  }
}

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

const formatPitcherMetric = (value, suffix = '') => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${parsed.toFixed(2)}${suffix}` : `${value || '-'}${suffix}`
}

const pitcherDetail = (pitcher) =>
  `${pitcher.fullName} (${pitcher.pitchHand || '?'}HP) | ${pitcher.wins}-${pitcher.losses} | ${pitcher.era} ERA | ${pitcher.strikeOuts} SO | ${formatPitcherMetric(pitcher.whip, ' WHIP')} | ${pitcher.inningsPitched} IP`

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
  if (profile.staleFeed) return 50
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
  if (profile.staleFeed) return 50
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
      return `${reliever.name} first up ${Number(reliever.firstRelieverLikelihood).toFixed(0)}% / availability ${Number(reliever.availabilityScore).toFixed(0)}/100${fatigueTag}`
    })
    .join('; ')
}

const offenseContextSummary = (teamName, profile = {}, standings = {}) => {
  const standingLabel = buildStandingsLabel(standings)
  if (!profile) return `${teamName} enter ${standingLabel}, but the team hit-production feed is unavailable.`
  if (profile.staleFeed) {
    return `${teamName} enter ${standingLabel}, but the stored team hit-production feed is duplicated across multiple clubs, so this board is leaning more heavily on lineup, starter-form, and contact-quality context.`
  }

  return `${teamName} enter ${standingLabel} with ${profile.hitsPerGame.toFixed(2)} H/G and last 3 at ${profile.last3HitsPerGame.toFixed(2)}.`
}

const bullpenContextSummary = (teamName, profile = {}, chainProfile = {}) => {
  if (!profile) {
    return `${teamName} bullpen season line is unavailable. Likely first two relievers: ${topRelieverSummary(chainProfile)}`
  }

  if (profile.staleFeed) {
    return `${teamName} bullpen season stat feed is currently duplicated across multiple clubs, so this board is leaning on the likely first two relievers instead: ${topRelieverSummary(chainProfile)}`
  }

  return `${teamName} bullpen: ${profile.era.toFixed(2)} ERA, ${profile.whip.toFixed(2)} WHIP. Likely first two relievers: ${topRelieverSummary(chainProfile)}`
}

const storyContextSummary = (teamName, story = null) => {
  if (!story?.summary) return `${teamName} team-story context has not been tagged yet.`
  return `${teamName} story: ${story.summary}`
}

const getWindowLabel = (startMinutes) => {
  if (startMinutes < 720) return 'Tuesday matinee'
  if (startMinutes < 960) return 'Tuesday afternoon board'
  if (startMinutes < 1110) return 'Tuesday prime board'
  return 'Tuesday night board'
}

const enrichRawGame = (game) => ({
  ...game,
  teamContext: { away: standingsContextByTeam[game.away], home: standingsContextByTeam[game.home] },
  parkContext: parkContextByHomeTeam[game.home] ?? null,
  offenseContext: {
    away: flagContextProfile(teamOffenseContextByTeam[game.away], staleOffenseSignatures, 'Offense'),
    home: flagContextProfile(teamOffenseContextByTeam[game.home], staleOffenseSignatures, 'Offense')
  },
  bullpenContext: {
    away: flagContextProfile(teamBullpenContextByTeam[game.away], staleBullpenSignatures, 'Bullpen'),
    home: flagContextProfile(teamBullpenContextByTeam[game.home], staleBullpenSignatures, 'Bullpen')
  },
  bullpenChainContext: { away: bullpenChainByTeam[game.away] ?? null, home: bullpenChainByTeam[game.home] ?? null },
  savantContext: { away: teamSavantContextByTeam[game.away], home: teamSavantContextByTeam[game.home] },
  storyContext: { away: teamStoryContextByTeam[game.away] ?? null, home: teamStoryContextByTeam[game.home] ?? null }
})

const buildMlbGame = (raw) => {
  const awayMoneyline = Number(raw.moneyline.match(/[+-]\d+/)?.[0] ?? 0)
  const homeMoneyline = Number(raw.moneyline.match(/[+-]\d+/g)?.[1] ?? 0)
  const impliedProbability = (americanOdds) =>
    americanOdds > 0 ? 100 / (americanOdds + 100) : Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)
  const awayMarketScore = Number.isFinite(awayMoneyline) ? impliedProbability(awayMoneyline) * 100 : 50
  const homeMarketScore = Number.isFinite(homeMoneyline) ? impliedProbability(homeMoneyline) * 100 : 50
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
    `${raw.awayPitcher.fullName} gives ${raw.away} a ${raw.awayPitcher.era} ERA, ${formatPitcherMetric(raw.awayPitcher.whip, ' WHIP')}, ${raw.awayPitcher.strikeOuts} strikeout baseline; ${raw.homePitcher.fullName} gives ${raw.home} a ${raw.homePitcher.era} ERA, ${formatPitcherMetric(raw.homePitcher.whip, ' WHIP')}, ${raw.homePitcher.strikeOuts} strikeout baseline.`,
    `${offenseContextSummary(raw.away, raw.offenseContext.away, raw.teamContext.away)} ${offenseContextSummary(raw.home, raw.offenseContext.home, raw.teamContext.home)}`,
    bullpenContextSummary(raw.away, raw.bullpenContext.away, raw.bullpenChainContext.away),
    bullpenContextSummary(raw.home, raw.bullpenContext.home, raw.bullpenChainContext.home),
    `${storyContextSummary(raw.away, raw.storyContext.away)} ${storyContextSummary(raw.home, raw.storyContext.home)}`
  ]

  let summary = ''
  if (first5Team === projectedTeam && projectedTeam === lateTeam) {
    summary = `${projectedTeam} carry the cleaner all-phase script on the current board, with the starter window, bridge lane, and full-game hold all pointing the same direction.`
  } else if (first5Team !== lateTeam) {
    summary = `${raw.away} @ ${raw.home} is a split-script matchup: ${first5Team} project cleaner through the starter phase, but ${lateTeam} own the stronger bridge-to-finish lane once the game leaves the opener.`
  } else {
    summary = `${projectedTeam} still look cleaner full game, but the edge is more about surviving the bridge and late relief chain than simply winning the first few innings.`
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
    storyContext: raw.storyContext,
    lineupContext: lineupMatchupContextByGameId[raw.id] ?? null,
    lineupBoard: lineupBoardsByGameId[raw.id] ?? null,
    homeRunTargets: homeRunTargetsByGame[`${raw.away} @ ${raw.home}`] ?? null,
    starterContext: { away: raw.awayPitcher, home: raw.homePitcher },
    pitcherSourceNote: raw.pitcherSourceNote || '',
    odds: makeBoardOdds({ spread: raw.spread, total: raw.total, moneyline: raw.moneyline, provider: oddsProvider })
  }
}

export const mlbGames = rawGames.map((game) =>
  createSportsMatchModel(buildMlbGame(enrichRawGame(game)), oddsProvider)
)

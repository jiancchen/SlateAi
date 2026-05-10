import { createSportsMatchModel } from './sports-model.js'

export const slateMeta = {
  title: 'Sunday MLB Slate',
  date: 'May 10, 2026',
  isoDate: '2026-05-10',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A stored day-two board generated from the known-good source list, using official MLB matchup data and Covers opening moneylines for a real test-run build.',
  notes: [
    'This day was built from the source-registry workflow instead of a hand-entered slate.',
    'Matchups and probable pitchers come from official MLB data, cross-checked against MLB.com probable-pitcher pages.',
    'The MLB reads now blend moneyline, listed starter form, standings context, and Statcast park factors.',
    'This automated ingest currently wires moneyline first; run line and total parsing are the next step in the daily build path.'
  ]
}

export const filters = ['All', 'MLB']

export const oddsMeta = {
  provider: 'Official MLB data + Covers opening moneyline board',
  snapshot: 'May 10, 2026, 1:16 AM ET',
  note:
    'This test-run build uses official MLB matchup and probable-pitcher data plus the Covers opening moneyline rows that were exposed in the accessible board. Run line and total parsing are still pending in the automated ingest flow.'
}

export const sources = [
  {
    label: 'MLB probable pitchers',
    url: 'https://www.mlb.com/probable-pitchers'
  },
  {
    label: 'Baseball Savant probable pitchers',
    url: 'https://baseballsavant.mlb.com/probable-pitchers'
  },
  {
    label: 'MLB schedule API for May 10, 2026',
    url: 'https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-10&hydrate=probablePitcher,team'
  },
  {
    label: 'MLB standings API for 2026 regular season',
    url: 'https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason'
  },
  {
    label: 'ESPN MLB standings',
    url: 'https://www.espn.com/mlb/standings'
  },
  {
    label: 'Statcast park factors',
    url: 'https://baseballsavant.mlb.com/leaderboard/statcast-park-factors'
  },
  {
    label: 'Covers MLB odds board',
    url: 'https://www.covers.com/sport/baseball/mlb/odds'
  }
]

const market = (label, book, value) => ({ label, book, value })

const makeOdds = (moneyline) => ({
  markets: [market('Moneyline', 'Covers opening board', moneyline)],
  note:
    'Automated May 10 ingest is currently using the Covers opening moneyline row. Run line and total are the next parser stage.',
  provider: 'Covers opening board'
})

const parseAmericanPair = (value = '') =>
  [...value.matchAll(/[+-]\d+/g)].map((match) => Number(match[0]))

const impliedProbabilityFromAmerican = (americanOdds) =>
  americanOdds > 0
    ? 100 / (americanOdds + 100)
    : Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const parseEra = (value) => (value === '-.--' ? null : Number(value))

const lastName = (fullName = '') => fullName.split(' ').at(-1) || fullName

const pitcherDetail = (pitcher) =>
  `${pitcher.fullName} (${pitcher.pitchHand}HP) | ${pitcher.wins}-${pitcher.losses} | ${pitcher.era} ERA | ${pitcher.strikeOuts} SO`

const pitcherRecordScore = (pitcher) => {
  const decisions = pitcher.wins + pitcher.losses
  const winPct = decisions > 0 ? pitcher.wins / decisions : 0.5

  return clamp(28 + winPct * 46 + Math.min(decisions, 6) * 2, 24, 86)
}

const pitcherEraScore = (pitcher) => {
  const era = parseEra(pitcher.era)

  return Number.isFinite(era) ? clamp(92 - era * 9, 18, 90) : 50
}

const pitcherStrikeoutScore = (pitcher) => clamp(34 + pitcher.strikeOuts * 1.08, 24, 88)

const starterScore = (pitcher) =>
  pitcherRecordScore(pitcher) * 0.28 +
  pitcherEraScore(pitcher) * 0.44 +
  pitcherStrikeoutScore(pitcher) * 0.28

const getWindowLabel = (startMinutes) => {
  if (startMinutes < 600) return 'Sunday early window'
  if (startMinutes < 720) return 'Sunday matinee'
  if (startMinutes < 900) return 'Sunday late window'

  return 'Sunday closer'
}

const standingsContextByTeam = {
  Nationals: {
    wins: 19,
    losses: 21,
    winningPercentage: '.475',
    divisionRank: '2',
    gamesBack: '8.0',
    runDifferential: -10,
    streakCode: 'L1',
    divisionLeader: false
  },
  Marlins: {
    wins: 18,
    losses: 22,
    winningPercentage: '.450',
    divisionRank: '4',
    gamesBack: '9.0',
    runDifferential: -6,
    streakCode: 'W1',
    divisionLeader: false
  },
  Athletics: {
    wins: 21,
    losses: 18,
    winningPercentage: '.538',
    divisionRank: '1',
    gamesBack: '-',
    runDifferential: -5,
    streakCode: 'W3',
    divisionLeader: true
  },
  Orioles: {
    wins: 17,
    losses: 23,
    winningPercentage: '.425',
    divisionRank: '5',
    gamesBack: '9.0',
    runDifferential: -42,
    streakCode: 'L3',
    divisionLeader: false
  },
  Rays: {
    wins: 25,
    losses: 13,
    winningPercentage: '.658',
    divisionRank: '1',
    gamesBack: '-',
    runDifferential: 17,
    streakCode: 'L1',
    divisionLeader: true
  },
  'Red Sox': {
    wins: 17,
    losses: 22,
    winningPercentage: '.436',
    divisionRank: '4',
    gamesBack: '8.5',
    runDifferential: -9,
    streakCode: 'W1',
    divisionLeader: false
  },
  Rockies: {
    wins: 16,
    losses: 24,
    winningPercentage: '.400',
    divisionRank: '4',
    gamesBack: '8.5',
    runDifferential: -29,
    streakCode: 'L1',
    divisionLeader: false
  },
  Phillies: {
    wins: 18,
    losses: 22,
    winningPercentage: '.450',
    divisionRank: '3',
    gamesBack: '9.0',
    runDifferential: -38,
    streakCode: 'W1',
    divisionLeader: false
  },
  Angels: {
    wins: 15,
    losses: 25,
    winningPercentage: '.375',
    divisionRank: '5',
    gamesBack: '6.5',
    runDifferential: -29,
    streakCode: 'L2',
    divisionLeader: false
  },
  'Blue Jays': {
    wins: 18,
    losses: 21,
    winningPercentage: '.462',
    divisionRank: '3',
    gamesBack: '7.5',
    runDifferential: -7,
    streakCode: 'W2',
    divisionLeader: false
  },
  Astros: {
    wins: 16,
    losses: 24,
    winningPercentage: '.400',
    divisionRank: '4',
    gamesBack: '5.5',
    runDifferential: -29,
    streakCode: 'L1',
    divisionLeader: false
  },
  Reds: {
    wins: 21,
    losses: 19,
    winningPercentage: '.525',
    divisionRank: '5',
    gamesBack: '6.0',
    runDifferential: -38,
    streakCode: 'W1',
    divisionLeader: false
  },
  Twins: {
    wins: 17,
    losses: 23,
    winningPercentage: '.425',
    divisionRank: '5',
    gamesBack: '3.5',
    runDifferential: -13,
    streakCode: 'W1',
    divisionLeader: false
  },
  Guardians: {
    wins: 21,
    losses: 20,
    winningPercentage: '.512',
    divisionRank: '1',
    gamesBack: '-',
    runDifferential: -3,
    streakCode: 'L1',
    divisionLeader: true
  },
  Mariners: {
    wins: 19,
    losses: 21,
    winningPercentage: '.475',
    divisionRank: '2',
    gamesBack: '2.5',
    runDifferential: 3,
    streakCode: 'L1',
    divisionLeader: false
  },
  'White Sox': {
    wins: 18,
    losses: 21,
    winningPercentage: '.462',
    divisionRank: '3',
    gamesBack: '2.0',
    runDifferential: -15,
    streakCode: 'W1',
    divisionLeader: false
  },
  Yankees: {
    wins: 26,
    losses: 14,
    winningPercentage: '.650',
    divisionRank: '2',
    gamesBack: '-',
    runDifferential: 74,
    streakCode: 'L2',
    divisionLeader: false
  },
  Brewers: {
    wins: 21,
    losses: 16,
    winningPercentage: '.568',
    divisionRank: '3',
    gamesBack: '4.5',
    runDifferential: 53,
    streakCode: 'W3',
    divisionLeader: false
  },
  Cubs: {
    wins: 27,
    losses: 13,
    winningPercentage: '.675',
    divisionRank: '1',
    gamesBack: '-',
    runDifferential: 50,
    streakCode: 'L1',
    divisionLeader: true
  },
  Rangers: {
    wins: 18,
    losses: 21,
    winningPercentage: '.462',
    divisionRank: '3',
    gamesBack: '3.0',
    runDifferential: -6,
    streakCode: 'W1',
    divisionLeader: false
  },
  Pirates: {
    wins: 22,
    losses: 18,
    winningPercentage: '.550',
    divisionRank: '4',
    gamesBack: '5.0',
    runDifferential: 32,
    streakCode: 'W1',
    divisionLeader: false
  },
  Giants: {
    wins: 15,
    losses: 24,
    winningPercentage: '.385',
    divisionRank: '5',
    gamesBack: '9.0',
    runDifferential: -49,
    streakCode: 'L1',
    divisionLeader: false
  },
  Mets: {
    wins: 15,
    losses: 24,
    winningPercentage: '.385',
    divisionRank: '5',
    gamesBack: '11.5',
    runDifferential: -27,
    streakCode: 'L1',
    divisionLeader: false
  },
  'D-backs': {
    wins: 18,
    losses: 20,
    winningPercentage: '.474',
    divisionRank: '3',
    gamesBack: '5.5',
    runDifferential: -26,
    streakCode: 'W1',
    divisionLeader: false
  },
  Cardinals: {
    wins: 23,
    losses: 16,
    winningPercentage: '.590',
    divisionRank: '2',
    gamesBack: '3.5',
    runDifferential: 4,
    streakCode: 'L1',
    divisionLeader: false
  },
  Padres: {
    wins: 23,
    losses: 16,
    winningPercentage: '.590',
    divisionRank: '2',
    gamesBack: '1.0',
    runDifferential: 2,
    streakCode: 'W1',
    divisionLeader: false
  },
  Braves: {
    wins: 27,
    losses: 13,
    winningPercentage: '.675',
    divisionRank: '1',
    gamesBack: '-',
    runDifferential: 82,
    streakCode: 'W1',
    divisionLeader: true
  },
  Dodgers: {
    wins: 24,
    losses: 15,
    winningPercentage: '.615',
    divisionRank: '1',
    gamesBack: '-',
    runDifferential: 74,
    streakCode: 'L1',
    divisionLeader: true
  },
  Tigers: {
    wins: 18,
    losses: 22,
    winningPercentage: '.450',
    divisionRank: '4',
    gamesBack: '2.5',
    runDifferential: 1,
    streakCode: 'L5',
    divisionLeader: false
  },
  Royals: {
    wins: 19,
    losses: 21,
    winningPercentage: '.475',
    divisionRank: '2',
    gamesBack: '1.5',
    runDifferential: -11,
    streakCode: 'W2',
    divisionLeader: false
  }
}

const parkContextByHomeTeam = {
  Marlins: {
    venueName: 'loanDepot park',
    indexRuns: 100,
    indexHr: 87,
    indexWoba: 100,
    yearRange: '2024-2026'
  },
  Orioles: {
    venueName: 'Oriole Park at Camden Yards',
    indexRuns: 108,
    indexHr: 114,
    indexWoba: 104,
    yearRange: '2024-2026'
  },
  'Red Sox': {
    venueName: 'Fenway Park',
    indexRuns: 104,
    indexHr: 84,
    indexWoba: 102,
    yearRange: '2024-2026'
  },
  Phillies: {
    venueName: 'Citizens Bank Park',
    indexRuns: 104,
    indexHr: 114,
    indexWoba: 102,
    yearRange: '2024-2026'
  },
  'Blue Jays': {
    venueName: 'Rogers Centre',
    indexRuns: 102,
    indexHr: 110,
    indexWoba: 101,
    yearRange: '2024-2026'
  },
  Reds: {
    venueName: 'Great American Ball Park',
    indexRuns: 106,
    indexHr: 122,
    indexWoba: 103,
    yearRange: '2024-2026'
  },
  Guardians: {
    venueName: 'Progressive Field',
    indexRuns: 96,
    indexHr: 95,
    indexWoba: 98,
    yearRange: '2024-2026'
  },
  'White Sox': {
    venueName: 'Rate Field',
    indexRuns: 96,
    indexHr: 94,
    indexWoba: 98,
    yearRange: '2024-2026'
  },
  Brewers: {
    venueName: 'American Family Field',
    indexRuns: 94,
    indexHr: 106,
    indexWoba: 97,
    yearRange: '2024-2026'
  },
  Rangers: {
    venueName: 'Globe Life Field',
    indexRuns: 85,
    indexHr: 89,
    indexWoba: 92,
    yearRange: '2024-2026'
  },
  Giants: {
    venueName: 'Oracle Park',
    indexRuns: 94,
    indexHr: 78,
    indexWoba: 97,
    yearRange: '2024-2026'
  },
  'D-backs': {
    venueName: 'Chase Field',
    indexRuns: 110,
    indexHr: 93,
    indexWoba: 105,
    yearRange: '2024-2026'
  },
  Padres: {
    venueName: 'Petco Park',
    indexRuns: 94,
    indexHr: 108,
    indexWoba: 97,
    yearRange: '2024-2026'
  },
  Dodgers: {
    venueName: 'UNIQLO Field at Dodger Stadium',
    indexRuns: 104,
    indexHr: 129,
    indexWoba: 102,
    yearRange: '2024-2026'
  },
  Royals: {
    venueName: 'Kauffman Stadium',
    indexRuns: 100,
    indexHr: 83,
    indexWoba: 100,
    yearRange: '2024-2026'
  }
}

const parseWinningPct = (value = '') => {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0.5
}

const formatOrdinal = (value) => {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) return `${value}`
  if (numericValue % 100 >= 11 && numericValue % 100 <= 13) return `${numericValue}th`
  if (numericValue % 10 === 1) return `${numericValue}st`
  if (numericValue % 10 === 2) return `${numericValue}nd`
  if (numericValue % 10 === 3) return `${numericValue}rd`

  return `${numericValue}th`
}

const buildStandingsScore = (team = {}) =>
  parseWinningPct(team.winningPercentage) * 100 +
  (Number(team.runDifferential) || 0) / 4 +
  (team.divisionLeader ? 7 : 0) +
  (6 - (Number(team.divisionRank) || 5)) * 2

const buildStandingsLabel = (team = {}) => {
  const rankLabel = team.divisionLeader
    ? 'division leader'
    : `${formatOrdinal(team.divisionRank)} in division`

  return `${team.wins}-${team.losses}, ${rankLabel}`
}

const buildTags = (raw, favoriteIndex, starterIndex) => {
  const [awayOdds, homeOdds] = parseAmericanPair(raw.openingMoneyline)
  const awayEra = parseEra(raw.awayPitcher.era)
  const homeEra = parseEra(raw.homePitcher.era)
  const tags = []
  const awayStandingsScore = buildStandingsScore(raw.teamContext?.away)
  const homeStandingsScore = buildStandingsScore(raw.teamContext?.home)
  const standingsIndex = awayStandingsScore >= homeStandingsScore ? 0 : 1

  if (Math.abs(Math.abs(awayOdds) - Math.abs(homeOdds)) <= 12) tags.push('Tight opener')
  else tags.push(`${favoriteIndex === 0 ? raw.away : raw.home} slight edge`)

  if (Number.isFinite(awayEra) && Number.isFinite(homeEra)) {
    const eraGap = Math.abs(awayEra - homeEra)

    if (eraGap >= 1) tags.push(`ERA edge ${starterIndex === 0 ? raw.away : raw.home}`)
    else tags.push('ERA duel')
  }

  if (Math.abs(raw.awayPitcher.strikeOuts - raw.homePitcher.strikeOuts) >= 12) {
    tags.push(`K edge ${raw.awayPitcher.strikeOuts > raw.homePitcher.strikeOuts ? raw.away : raw.home}`)
  }

  if (Math.abs(awayStandingsScore - homeStandingsScore) >= 9) {
    tags.push(`Record edge ${standingsIndex === 0 ? raw.away : raw.home}`)
  }

  if ((raw.parkContext?.indexRuns || 100) >= 106) tags.push('Hitter-friendly park')
  else if ((raw.parkContext?.indexRuns || 100) <= 94) tags.push('Pitcher-friendly park')

  if (raw.awayPitcher.pitchHand !== raw.homePitcher.pitchHand) tags.push('Left-right contrast')

  return [...new Set(tags)].slice(0, 3)
}

const buildSummary = (raw, favoriteIndex, starterIndex, modelIndex) => {
  const favorite = favoriteIndex === 0 ? raw.away : raw.home
  const starterSide = starterIndex === 0 ? raw.away : raw.home
  const modelSide = modelIndex === 0 ? raw.away : raw.home
  const awayStandingsScore = buildStandingsScore(raw.teamContext?.away)
  const homeStandingsScore = buildStandingsScore(raw.teamContext?.home)
  const standingsSide = awayStandingsScore >= homeStandingsScore ? raw.away : raw.home
  const venueName = raw.parkContext?.venueName

  if (modelSide === starterSide && modelSide === standingsSide) {
    return `${modelSide} bring the cleaner three-layer case, with the market, listed starter shape, and standings profile all leaning their way${venueName ? ` at ${venueName}` : ''}.`
  }

  if ((raw.parkContext?.indexRuns || 100) >= 106) {
    return `This matchup lands in a livelier run environment at ${venueName}, so even the stronger pregame side may need room before the middle innings.`
  }

  if ((raw.parkContext?.indexRuns || 100) <= 94) {
    return `${venueName} leans run-suppressing, which makes the cleaner pitcher and standings baseline carry a little more weight.`
  }

  if (favorite === starterSide) {
    return `${favorite} opened with both the price and the listed starter shape nudging in the same direction.`
  }

  if (modelSide === starterSide) {
    return `The market opened near the middle, but the cleaner listed starter profile gives ${starterSide} the stronger pregame case.`
  }

  return `This opener is close enough that the first moneyline and the listed pitcher form are pulling against each other.`
}

const buildFactors = (raw, favoriteIndex, starterIndex) => {
  const starterTeam = starterIndex === 0 ? raw.away : raw.home
  const starterPitcher = starterIndex === 0 ? raw.awayPitcher : raw.homePitcher
  const weakerPitcher = starterIndex === 0 ? raw.homePitcher : raw.awayPitcher
  const favoriteTeam = favoriteIndex === 0 ? raw.away : raw.home
  const awayEra = parseEra(raw.awayPitcher.era)
  const homeEra = parseEra(raw.homePitcher.era)
  const eraGap =
    Number.isFinite(awayEra) && Number.isFinite(homeEra) ? Math.abs(awayEra - homeEra) : null
  const awayStandingsLabel = buildStandingsLabel(raw.teamContext?.away)
  const homeStandingsLabel = buildStandingsLabel(raw.teamContext?.home)

  const factors = [
    `Opening line: ${raw.openingMoneyline}.`,
    `${starterPitcher.fullName} carries the cleaner listed starter line for ${starterTeam}, with ${starterPitcher.era} ERA and ${starterPitcher.strikeOuts} strikeouts.`,
    `${raw.away} enter ${awayStandingsLabel}; ${raw.home} enter ${homeStandingsLabel}.`,
    favoriteTeam === starterTeam
      ? `${favoriteTeam} have the market and starter case aligned before first pitch.`
      : `${favoriteTeam} drew the opener, but ${starterTeam} have the sharper mound profile on paper.`
  ]

  if (!Number.isFinite(parseEra(raw.awayPitcher.era)) || !Number.isFinite(parseEra(raw.homePitcher.era))) {
    factors[3] = 'One listed starter is carrying an incomplete 2026 sample, which raises volatility.'
  } else if (Number.isFinite(eraGap) && eraGap >= 1.4) {
    factors[3] = `${weakerPitcher.fullName} enters with the softer ERA baseline, so early traffic could flip the whole script quickly.`
  }

  if (raw.parkContext?.venueName) {
    factors.push(
      `${raw.parkContext.venueName} sits at ${raw.parkContext.indexRuns} for runs and ${raw.parkContext.indexHr} for home runs over ${raw.parkContext.yearRange}, which helps frame the scoring environment.`
    )
  }

  return factors
}

const buildSwingFactor = (raw, starterIndex) => {
  const weakerPitcher = starterIndex === 0 ? raw.homePitcher : raw.awayPitcher
  const strongerPitcher = starterIndex === 0 ? raw.awayPitcher : raw.homePitcher
  const venueName = raw.parkContext?.venueName

  if (!Number.isFinite(parseEra(weakerPitcher.era))) {
    return `Swing factor: whether ${lastName(weakerPitcher.fullName)} can validate the small sample once hitters see him twice.`
  }

  if ((raw.parkContext?.indexRuns || 100) >= 106 || (raw.parkContext?.indexHr || 100) >= 114) {
    return `Swing factor: whether ${lastName(weakerPitcher.fullName)} can keep the ball in the yard long enough to stop ${venueName} from amplifying any early mistake.`
  }

  return `Swing factor: whether ${lastName(weakerPitcher.fullName)} can survive the early innings well enough to keep ${lastName(strongerPitcher.fullName)} from dictating the whole pace.`
}

const buildLean = (raw, modelIndex) =>
  `Lean ${modelIndex === 0 ? raw.away : raw.home} if the better combined starter, standings, and market profile still holds once late lineup noise settles.`

const shouldSpotlight = (raw, favoriteIndex) => {
  const [awayOdds, homeOdds] = parseAmericanPair(raw.openingMoneyline)
  const favoredOdds = favoriteIndex === 0 ? awayOdds : homeOdds
  const awayEra = parseEra(raw.awayPitcher.era)
  const homeEra = parseEra(raw.homePitcher.era)

  return (
    favoredOdds <= -155 ||
    (Number.isFinite(awayEra) && Number.isFinite(homeEra) && awayEra <= 2.5 && homeEra <= 2.5) ||
    raw.awayPitcher.strikeOuts >= 45 ||
    raw.homePitcher.strikeOuts >= 45 ||
    (raw.parkContext?.indexRuns || 100) >= 108
  )
}

const buildRawGame = (raw) => {
  const [awayOdds, homeOdds] = parseAmericanPair(raw.openingMoneyline)
  const awayMarketScore = impliedProbabilityFromAmerican(awayOdds) * 100
  const homeMarketScore = impliedProbabilityFromAmerican(homeOdds) * 100
  const awayStarterScore = starterScore(raw.awayPitcher)
  const homeStarterScore = starterScore(raw.homePitcher)
  const favoriteIndex = awayMarketScore >= homeMarketScore ? 0 : 1
  const starterIndex = awayStarterScore >= homeStarterScore ? 0 : 1
  const awayComposite = awayMarketScore * 0.42 + awayStarterScore * 0.58
  const homeComposite = homeMarketScore * 0.42 + homeStarterScore * 0.58
  const modelIndex = awayComposite >= homeComposite ? 0 : 1

  return {
    id: raw.id,
    league: 'MLB',
    title: `${raw.away} @ ${raw.home}`,
    teamContext: raw.teamContext,
    parkContext: raw.parkContext,
    start: raw.start,
    startMinutes: raw.startMinutes,
    stage: getWindowLabel(raw.startMinutes),
    tags: buildTags(raw, favoriteIndex, starterIndex),
    matchup: [
      {
        side: 'Away',
        name: raw.away,
        detail: pitcherDetail(raw.awayPitcher)
      },
      {
        side: 'Home',
        name: raw.home,
        detail: pitcherDetail(raw.homePitcher)
      }
    ],
    summary: buildSummary(raw, favoriteIndex, starterIndex, modelIndex),
    lean: buildLean(raw, modelIndex),
    factors: buildFactors(raw, favoriteIndex, starterIndex),
    swingFactor: buildSwingFactor(raw, starterIndex),
    spotlight: shouldSpotlight(raw, favoriteIndex),
    odds: makeOdds(raw.openingMoneyline)
  }
}

const rawGames = [
  {
    id: 'nationals-marlins',
    away: 'Nationals',
    home: 'Marlins',
    start: '9:15 AM PT',
    startMinutes: 555,
    openingMoneyline: 'WSH +120 / MIA -132',
    awayPitcher: {
      fullName: 'Cade Cavalli',
      pitchHand: 'R',
      wins: 1,
      losses: 2,
      era: '4.15',
      strikeOuts: 40
    },
    homePitcher: {
      fullName: 'Sandy Alcantara',
      pitchHand: 'R',
      wins: 3,
      losses: 2,
      era: '4.01',
      strikeOuts: 36
    }
  },
  {
    id: 'athletics-orioles',
    away: 'Athletics',
    home: 'Orioles',
    start: '10:35 AM PT',
    startMinutes: 635,
    openingMoneyline: 'ATH -103 / BAL -108',
    awayPitcher: {
      fullName: 'Luis Severino',
      pitchHand: 'R',
      wins: 2,
      losses: 3,
      era: '4.15',
      strikeOuts: 43
    },
    homePitcher: {
      fullName: 'Chris Bassitt',
      pitchHand: 'R',
      wins: 2,
      losses: 2,
      era: '5.91',
      strikeOuts: 20
    }
  },
  {
    id: 'rays-red-sox',
    away: 'Rays',
    home: 'Red Sox',
    start: '10:35 AM PT',
    startMinutes: 635,
    openingMoneyline: 'TB +105 / BOS -127',
    awayPitcher: {
      fullName: 'Nick Martinez',
      pitchHand: 'R',
      wins: 3,
      losses: 1,
      era: '1.71',
      strikeOuts: 28
    },
    homePitcher: {
      fullName: 'Payton Tolle',
      pitchHand: 'L',
      wins: 1,
      losses: 1,
      era: '2.04',
      strikeOuts: 23
    }
  },
  {
    id: 'rockies-phillies',
    away: 'Rockies',
    home: 'Phillies',
    start: '10:35 AM PT',
    startMinutes: 635,
    openingMoneyline: 'COL +244 / PHI -282',
    awayPitcher: {
      fullName: 'Tomoyuki Sugano',
      pitchHand: 'R',
      wins: 3,
      losses: 2,
      era: '3.41',
      strikeOuts: 22
    },
    homePitcher: {
      fullName: 'Cristopher Sánchez',
      pitchHand: 'L',
      wins: 3,
      losses: 2,
      era: '2.42',
      strikeOuts: 60
    }
  },
  {
    id: 'angels-blue-jays',
    away: 'Angels',
    home: 'Blue Jays',
    start: '10:37 AM PT',
    startMinutes: 637,
    openingMoneyline: 'LAA -115 / TOR +105',
    awayPitcher: {
      fullName: 'José Soriano',
      pitchHand: 'R',
      wins: 5,
      losses: 2,
      era: '1.74',
      strikeOuts: 54
    },
    homePitcher: {
      fullName: 'Spencer Miles',
      pitchHand: 'R',
      wins: 1,
      losses: 0,
      era: '3.50',
      strikeOuts: 16
    }
  },
  {
    id: 'astros-reds',
    away: 'Astros',
    home: 'Reds',
    start: '10:40 AM PT',
    startMinutes: 640,
    openingMoneyline: 'HOU +101 / CIN -120',
    awayPitcher: {
      fullName: 'Kai-Wei Teng',
      pitchHand: 'R',
      wins: 1,
      losses: 2,
      era: '2.35',
      strikeOuts: 22
    },
    homePitcher: {
      fullName: 'Andrew Abbott',
      pitchHand: 'L',
      wins: 1,
      losses: 2,
      era: '5.13',
      strikeOuts: 28
    }
  },
  {
    id: 'twins-guardians',
    away: 'Twins',
    home: 'Guardians',
    start: '10:40 AM PT',
    startMinutes: 640,
    openingMoneyline: 'MIN +114 / CLE -154',
    awayPitcher: {
      fullName: 'Andrew Morris',
      pitchHand: 'R',
      wins: 1,
      losses: 1,
      era: '4.96',
      strikeOuts: 15
    },
    homePitcher: {
      fullName: 'Gavin Williams',
      pitchHand: 'R',
      wins: 5,
      losses: 2,
      era: '3.28',
      strikeOuts: 60
    }
  },
  {
    id: 'mariners-white-sox',
    away: 'Mariners',
    home: 'White Sox',
    start: '11:10 AM PT',
    startMinutes: 670,
    openingMoneyline: 'SEA -122 / CWS +110',
    awayPitcher: {
      fullName: 'Logan Gilbert',
      pitchHand: 'R',
      wins: 2,
      losses: 3,
      era: '4.30',
      strikeOuts: 43
    },
    homePitcher: {
      fullName: 'Davis Martin',
      pitchHand: 'R',
      wins: 5,
      losses: 1,
      era: '1.64',
      strikeOuts: 43
    }
  },
  {
    id: 'yankees-brewers',
    away: 'Yankees',
    home: 'Brewers',
    start: '11:10 AM PT',
    startMinutes: 670,
    openingMoneyline: 'NYY -119 / MIL +108',
    awayPitcher: {
      fullName: 'Carlos Rodón',
      pitchHand: 'L',
      wins: 0,
      losses: 0,
      era: '-.--',
      strikeOuts: 0
    },
    homePitcher: {
      fullName: 'Logan Henderson',
      pitchHand: 'R',
      wins: 0,
      losses: 1,
      era: '4.50',
      strikeOuts: 11
    }
  },
  {
    id: 'cubs-rangers',
    away: 'Cubs',
    home: 'Rangers',
    start: '11:35 AM PT',
    startMinutes: 695,
    openingMoneyline: 'CHC +113 / TEX -124',
    awayPitcher: {
      fullName: 'Jameson Taillon',
      pitchHand: 'R',
      wins: 2,
      losses: 1,
      era: '4.24',
      strikeOuts: 36
    },
    homePitcher: {
      fullName: 'Jacob deGrom',
      pitchHand: 'R',
      wins: 2,
      losses: 2,
      era: '3.11',
      strikeOuts: 47
    }
  },
  {
    id: 'pirates-giants',
    away: 'Pirates',
    home: 'Giants',
    start: '1:05 PM PT',
    startMinutes: 785,
    openingMoneyline: 'PIT +106 / SF -117',
    awayPitcher: {
      fullName: 'Bubba Chandler',
      pitchHand: 'R',
      wins: 1,
      losses: 4,
      era: '4.76',
      strikeOuts: 31
    },
    homePitcher: {
      fullName: 'Tyler Mahle',
      pitchHand: 'R',
      wins: 1,
      losses: 4,
      era: '5.00',
      strikeOuts: 34
    }
  },
  {
    id: 'mets-d-backs',
    away: 'Mets',
    home: 'D-backs',
    start: '1:10 PM PT',
    startMinutes: 790,
    openingMoneyline: 'NYM -108 / AZ -111',
    awayPitcher: {
      fullName: 'Huascar Brazobán',
      pitchHand: 'R',
      wins: 2,
      losses: 0,
      era: '1.53',
      strikeOuts: 14
    },
    homePitcher: {
      fullName: 'Eduardo Rodriguez',
      pitchHand: 'L',
      wins: 3,
      losses: 0,
      era: '2.50',
      strikeOuts: 29
    }
  },
  {
    id: 'cardinals-padres',
    away: 'Cardinals',
    home: 'Padres',
    start: '1:10 PM PT',
    startMinutes: 790,
    openingMoneyline: 'STL +115 / SD -127',
    awayPitcher: {
      fullName: 'Kyle Leahy',
      pitchHand: 'R',
      wins: 4,
      losses: 3,
      era: '4.93',
      strikeOuts: 27
    },
    homePitcher: {
      fullName: 'Walker Buehler',
      pitchHand: 'R',
      wins: 2,
      losses: 2,
      era: '5.64',
      strikeOuts: 29
    }
  },
  {
    id: 'braves-dodgers',
    away: 'Braves',
    home: 'Dodgers',
    start: '1:10 PM PT',
    startMinutes: 790,
    openingMoneyline: 'ATL +109 / LAD -121',
    awayPitcher: {
      fullName: 'Bryce Elder',
      pitchHand: 'R',
      wins: 3,
      losses: 1,
      era: '2.02',
      strikeOuts: 45
    },
    homePitcher: {
      fullName: 'Justin Wrobleski',
      pitchHand: 'L',
      wins: 5,
      losses: 0,
      era: '1.25',
      strikeOuts: 15
    }
  },
  {
    id: 'tigers-royals',
    away: 'Tigers',
    home: 'Royals',
    start: '4:20 PM PT',
    startMinutes: 980,
    openingMoneyline: 'DET +105 / KC -132',
    awayPitcher: {
      fullName: 'Brenan Hanifee',
      pitchHand: 'R',
      wins: 0,
      losses: 0,
      era: '0.00',
      strikeOuts: 4
    },
    homePitcher: {
      fullName: 'Noah Cameron',
      pitchHand: 'L',
      wins: 2,
      losses: 2,
      era: '5.40',
      strikeOuts: 28
    }
  }
]

const enrichRawGame = (game) => ({
  ...game,
  teamContext: {
    away: standingsContextByTeam[game.away],
    home: standingsContextByTeam[game.home]
  },
  parkContext: parkContextByHomeTeam[game.home] ?? null
})

export const games = rawGames.map((game) =>
  createSportsMatchModel(buildRawGame(enrichRawGame(game)), oddsMeta.provider)
)

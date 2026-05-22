import { createSportsMatchModel } from './sports-model.js'
import {
  lineupMatchupContextByGame,
  teamBullpenContextByTeam,
  teamOffenseContextByTeam
} from './mlb-context-2026-05-10.js'

export const slateMeta = {
  title: 'Sunday Cross-Sport Board',
  date: 'May 10, 2026',
  isoDate: '2026-05-10',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A stored May 10 board that now blends MLB, NBA, and WNBA using official league data, live market snapshots, and playoff-series box-score context.',
  notes: [
    'This day was built from the source-registry workflow instead of a hand-entered slate.',
    'Matchups and probable pitchers come from official MLB data, cross-checked against MLB.com probable-pitcher pages.',
    'The MLB reads now blend moneyline, listed starter form, standings context, Statcast park factors, team hit production, bullpen quality, and BallparkPal lineup-vs-starter context, with the Orioles starter updated to Keegan Akin on the latest morning refresh.',
    'The NBA playoff cards now include official Games 1-3 box-score context, series trends, and key-player notes for today\'s Game 4 matchups.',
    'WNBA and NBA prices come from the current ScoresAndOdds board snapshot, while MLB remains wired to the stored opening-moneyline ingest.'
  ]
}

export const filters = ['All', 'MLB', 'NBA', 'WNBA']

export const oddsMeta = {
  provider: 'Mixed official league data + live board snapshots',
  snapshot: 'May 10, 2026, 9:17 AM PT',
  note:
    'MLB is still tied to the stored opening-moneyline ingest. NBA and WNBA use the current ScoresAndOdds board, and the two NBA playoff cards add official series box-score context from Games 1-3.'
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
    label: 'TeamRankings MLB hits per game',
    url: 'https://www.teamrankings.com/mlb/stat/hits-per-game'
  },
  {
    label: 'Covers MLB bullpen ERA',
    url: 'https://www.covers.com/sport/baseball/mlb/statistics/team-bullpenera/2026'
  },
  {
    label: 'BallparkPal matchup board',
    url: 'https://www.ballparkpal.com/Matchups.php'
  },
  {
    label: 'Covers MLB odds board',
    url: 'https://www.covers.com/sport/baseball/mlb/odds'
  },
  {
    label: 'NBA 2026 playoffs schedule',
    url: 'https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true'
  },
  {
    label: 'ScoresAndOdds NBA board',
    url: 'https://www.scoresandodds.com/nba'
  },
  {
    label: 'Knicks vs 76ers Game 1 official PDF box score',
    url: 'https://statsdmz.nba.com/pdfs/20260504/20260504_PHINYK.pdf'
  },
  {
    label: 'Knicks vs 76ers Game 2 official PDF box score',
    url: 'https://statsdmz.nba.com/pdfs/20260506/20260506_PHINYK.pdf'
  },
  {
    label: 'Knicks vs 76ers Game 3 official PDF box score',
    url: 'https://statsdmz.nba.com/pdfs/20260508/20260508_NYKPHI.pdf'
  },
  {
    label: 'Spurs vs Timberwolves Game 1 official PDF box score',
    url: 'https://statsdmz.nba.com/pdfs/20260504/20260504_MINSAS.pdf'
  },
  {
    label: 'Spurs vs Timberwolves Game 2 official PDF box score',
    url: 'https://statsdmz.nba.com/pdfs/20260506/20260506_MINSAS.pdf'
  },
  {
    label: 'Spurs vs Timberwolves Game 3 official PDF box score',
    url: 'https://statsdmz.nba.com/pdfs/20260508/20260508_SASMIN.pdf'
  },
  {
    label: 'WNBA daily slate hub',
    url: 'https://www.wnba.com/'
  },
  {
    label: 'ScoresAndOdds WNBA board',
    url: 'https://www.scoresandodds.com/wnba'
  }
]

const market = (label, book, value) => ({ label, book, value })

const makeOdds = (moneyline) => ({
  markets: [market('Moneyline', 'Covers opening board', moneyline)],
  note:
    'Automated May 10 ingest is currently using the Covers opening moneyline row. Run line and total are the next parser stage.',
  provider: 'Covers opening board'
})

const makeBoardOdds = ({ spread = '', total = '', moneyline = '', provider = 'ScoresAndOdds board' }) => ({
  participantOrder: [0, 1],
  markets: [
    ...(spread ? [market('Spread', provider, spread)] : []),
    ...(total ? [market('Total', provider, total)] : []),
    ...(moneyline ? [market('Moneyline', provider, moneyline)] : [])
  ],
  note:
    'Current board snapshot from ScoresAndOdds on the May 10 morning refresh. This layer is meant to complement the deeper model read, not replace it.',
  provider
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
      fullName: 'Keegan Akin',
      pitchHand: 'L',
      wins: 0,
      losses: 0,
      era: '11.12',
      strikeOuts: 5
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

const basketballGames = [
  {
    id: 'storm-sun',
    league: 'WNBA',
    start: '10:00 AM PT',
    startMinutes: 600,
    title: 'Storm @ Sun',
    stage: 'WNBA opening weekend',
    spotlight: false,
    tags: ['Short number', 'Home opener', 'Frontcourt test'],
    matchup: [
      {
        side: 'Away',
        name: 'Storm',
        detail: 'Road opener | Perimeter creation and pace pressure'
      },
      {
        side: 'Home',
        name: 'Sun',
        detail: 'Home opener | Interior-control profile and half-court discipline'
      }
    ],
    summary:
      'Connecticut gets the home-opener edge in a very short number, while Seattle needs cleaner guard shot creation to keep the Sun from dictating the game shape in the half court.',
    factors: [
      'This line is tight enough that rebounding, turnover margin, and late-clock execution matter more than broad preseason opinions.',
      'Connecticut carries the cleaner home-environment case, especially if the game slows into a more physical half-court script.',
      'Seattle still has enough perimeter creation to flip the read if the Storm can win the burst-scoring stretches early.'
    ],
    lean: 'Lean Sun on the home floor and the steadier opening baseline.',
    swing: 'Swing factor: whether Seattle can win the guard-creation minutes enough to offset Connecticut\'s home-floor control.',
    odds: makeBoardOdds({
      spread: 'SEA +2.5 (-112) / CON -2.5 (-108)',
      total: 'O 164.5 (-108) / U 164.5 (-112)',
      moneyline: 'SEA +110 / CON -130'
    })
  },
  {
    id: 'liberty-mystics',
    league: 'WNBA',
    start: '12:00 PM PT',
    startMinutes: 720,
    title: 'Liberty @ Mystics',
    stage: 'WNBA opening weekend',
    spotlight: true,
    tags: ['Road favorite', 'Talent gap', 'Half-court test'],
    matchup: [
      {
        side: 'Away',
        name: 'Liberty',
        detail: 'Stewart | Ionescu | Jonquel Jones | Proven title-level core'
      },
      {
        side: 'Home',
        name: 'Mystics',
        detail: 'Home opener | Younger group trying to slow the script'
      }
    ],
    summary:
      'New York brings the cleaner top-end talent and the deeper continuity profile, which is why the market still hangs a meaningful road-favorite tax despite the travel spot.',
    factors: [
      'The Liberty own the stronger shot-creation hierarchy and the safer possession baseline when games compress late.',
      'Washington\'s path is to slow the pace, force a half-court grind, and turn this into a lower-event execution test.',
      'If New York wins the glass and keeps the Mystics out of transition shortcuts, the talent edge should show up over four quarters.'
    ],
    lean: 'Lean Liberty because the championship core still sets the higher possession-to-possession floor.',
    swing: 'Swing factor: whether Washington can slow the game enough to make New York earn every trip in the half court.',
    odds: makeBoardOdds({
      spread: 'NYL -5.5 (-108) / WAS +5.5 (-112)',
      total: 'O 165.5 (-105) / U 165.5 (-115)',
      moneyline: 'NYL -230 / WAS +190'
    })
  },
  {
    id: 'knicks-76ers',
    league: 'NBA',
    start: '12:30 PM PT',
    startMinutes: 750,
    title: 'Knicks @ 76ers',
    stage: 'East semifinal Game 4',
    spotlight: true,
    tags: ['Series pressure', 'Paint edge', 'Closeout attempt'],
    matchup: [
      {
        side: 'Away',
        name: 'Knicks',
        detail: 'Brunson | Towns | Bridges | Leading series 3-0'
      },
      {
        side: 'Home',
        name: '76ers',
        detail: 'Maxey | George | Embiid | Home elimination spot'
      }
    ],
    summary:
      'New York has controlled the series through paint pressure, rebounding, and cleaner possessions, so Philadelphia now needs more than star-level scoring to change the math in Game 4.',
    factors: [
      'The Knicks are averaging 117.7 points per game in the series and have led the 76ers in paint scoring in every game so far.',
      'Philadelphia has had enough individual scoring to keep stretches competitive, but the turnover count and rebound margin keep dragging the game back toward New York.',
      'The 76ers are finally back home, which matters, but the burden is now on them to flip the possession battle instead of just matching Brunson shot for shot.'
    ],
    lean: 'Lean Knicks because the three-game sample keeps rewarding their paint pressure and cleaner possessions.',
    swing: 'Swing factor: whether Philadelphia can finally win the turnover and paint battle at home instead of just trading star scoring.',
    seriesBreakdown: {
      kicker: 'Playoff series to date',
      title: 'Why New York is one win from closing this out',
      record: 'Knicks lead 3-0',
      recap:
        'The three-game sample has been remarkably consistent. New York has lived at the rim, owned more extra-possession minutes, and trusted Jalen Brunson to settle every unstable stretch. Philadelphia still has enough star scoring to threaten a single game, but the 76ers have not solved the turnover pressure or the paint deficit long enough to actually flip a result.',
      seriesStats: [
        'NYK 117.7 PPG | PHI 98.0 PPG',
        'Paint points: NYK 55.3 | PHI 36.0',
        'Rebounds: NYK 41.7 | PHI 33.3',
        '76ers turnovers: 16.0 per game'
      ],
      boxScores: [
        {
          label: 'Game 1',
          date: 'May 4, 2026',
          result: 'Knicks 137, 76ers 98',
          notes: [
            'New York shot 63.1 percent and scored 58 points in the paint.',
            'Philadelphia turned it over 19 times, which fed 25 Knicks points.',
            'The opener never really stabilized once Brunson and the Knicks front line got downhill.'
          ],
          leaders: [
            {
              team: 'Knicks leaders',
              lines: [
                'Jalen Brunson: 35 points',
                'OG Anunoby: 18 points',
                'Karl-Anthony Towns: 17 points',
                'Mikal Bridges: 17 points'
              ]
            },
            {
              team: '76ers leaders',
              lines: [
                'Paul George: 17 points',
                'Joel Embiid: 14 points',
                'Tyrese Maxey: 13 points'
              ]
            }
          ]
        },
        {
          label: 'Game 2',
          date: 'May 6, 2026',
          result: 'Knicks 108, 76ers 102',
          notes: [
            'The game was tighter, but New York still won the paint battle 56-30.',
            'Philadelphia coughed it up 18 more times and never fully cleaned the possession margin.',
            'Joel Embiid was inactive, which put even more creation load on Maxey and George.'
          ],
          leaders: [
            {
              team: 'Knicks leaders',
              lines: [
                'Jalen Brunson: 26 points',
                'OG Anunoby: 24 points',
                'Karl-Anthony Towns: 20 points',
                'Mikal Bridges: 18 points'
              ]
            },
            {
              team: '76ers leaders',
              lines: [
                'Tyrese Maxey: 26 points',
                'Paul George: 19 points',
                'Kelly Oubre Jr.: 19 points'
              ]
            }
          ]
        },
        {
          label: 'Game 3',
          date: 'May 8, 2026',
          result: 'Knicks 108, 76ers 94',
          notes: [
            'New York again controlled the interior, posting a 52-46 paint edge and 20 second-chance points.',
            'Philadelphia shot 42.9 percent and still never found enough support scoring around its stars.',
            'OG Anunoby was inactive with a right hamstring strain, and the Knicks still kept the series script intact.'
          ],
          leaders: [
            {
              team: 'Knicks leaders',
              lines: [
                'Jalen Brunson: 33 points',
                'Mikal Bridges: 23 points',
                'Landry Shamet: 15 points',
                'Josh Hart: 12 points, 11 rebounds'
              ]
            },
            {
              team: '76ers leaders',
              lines: [
                'Kelly Oubre Jr.: 22 points',
                'Joel Embiid: 18 points',
                'Tyrese Maxey: 17 points'
              ]
            }
          ]
        }
      ],
      playerAnalysis: [
        'Jalen Brunson is dictating the series at 31.3 points per game and keeps getting Philadelphia into late-clock help decisions.',
        'Mikal Bridges has quietly been the two-way stabilizer at 19.3 points per game, while Karl-Anthony Towns has added scoring, rebounding, and connective passing every night.',
        'Tyrese Maxey has been Philadelphia\'s cleanest perimeter pressure source at 18.7 points per game, but New York has made every Maxey burst feel isolated rather than contagious.',
        'Paul George and Kelly Oubre Jr. have both had scoring pockets, yet the 76ers still trail badly in paint production and second-chance control.',
        'Joel Embiid missed Game 2 and returned in Game 3, so availability rhythm has been part of the series read entering this elimination spot.',
        'OG Anunoby sat Game 3 with a right hamstring strain, which matters because New York has still controlled the series even while rotating through a key wing absence.'
      ],
      sources: [
        {
          label: 'NBA playoffs schedule',
          url: 'https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true'
        },
        {
          label: 'Game 1 official PDF box score',
          url: 'https://statsdmz.nba.com/pdfs/20260504/20260504_PHINYK.pdf'
        },
        {
          label: 'Game 2 official PDF box score',
          url: 'https://statsdmz.nba.com/pdfs/20260506/20260506_PHINYK.pdf'
        },
        {
          label: 'Game 3 official PDF box score',
          url: 'https://statsdmz.nba.com/pdfs/20260508/20260508_NYKPHI.pdf'
        }
      ]
    },
    odds: makeBoardOdds({
      spread: 'NYK -1.5 (-110) / PHI +1.5 (-110)',
      total: 'O 214.5 (-110) / U 214.5 (-110)',
      moneyline: 'NYK -120 / PHI +100'
    })
  },
  {
    id: 'aces-sparks',
    league: 'WNBA',
    start: '3:00 PM PT',
    startMinutes: 900,
    title: 'Aces @ Sparks',
    stage: 'WNBA opening weekend',
    spotlight: true,
    tags: ['Short spread', 'Tradable number', 'Late-window game'],
    matchup: [
      {
        side: 'Away',
        name: 'Aces',
        detail: 'Star-heavy road group | Slight market favorite'
      },
      {
        side: 'Home',
        name: 'Sparks',
        detail: 'Home floor | Live dog in a one-possession spread'
      }
    ],
    summary:
      'This is the most tradable WNBA number on the board. Las Vegas still wears the shorter price, but the spread getting shaved to -1.5 says the market sees a very real one-possession game profile.',
    factors: [
      'The Aces own the cleaner closing-time star power case if the final five minutes are still live.',
      'Los Angeles gets home-floor comfort and only needs one strong shot-making run to turn a near-pick game into a dog-cover or outright-win spot.',
      'Because the number is so small, late-game free throws and turnover discipline can swing everything.'
    ],
    lean: 'Lean Aces on closing-time star reliability, but this is one of the swingier WNBA side reads on the slate.',
    swing: 'Swing factor: whether the Sparks can turn the game into a half-court possession grind instead of letting Las Vegas play downhill late.',
    odds: makeBoardOdds({
      spread: 'LVA -1.5 (-115) / LAS +1.5 (-105)',
      total: 'O 177.5 (-110) / U 177.5 (-110)',
      moneyline: 'LVA -130 / LAS +110'
    })
  },
  {
    id: 'spurs-timberwolves',
    league: 'NBA',
    start: '4:30 PM PT',
    startMinutes: 990,
    title: 'Spurs @ Timberwolves',
    stage: 'West semifinal Game 4',
    spotlight: true,
    tags: ['Series pressure', 'Wembanyama edge', 'Home response'],
    matchup: [
      {
        side: 'Away',
        name: 'Spurs',
        detail: 'Wembanyama | Castle | Fox | Leading series 2-1'
      },
      {
        side: 'Home',
        name: 'Timberwolves',
        detail: 'Edwards | Randle | Reid | Must-answer Game 4'
      }
    ],
    summary:
      'San Antonio has turned this series by controlling the interior and getting cleaner guard play behind Victor Wembanyama, which leaves Minnesota needing a real home-floor response in Game 4.',
    factors: [
      'The Spurs are averaging 116.7 points per game in the series and just dropped 133 in their most lopsided win.',
      'Victor Wembanyama\'s two-way footprint is warping the matchup, especially when San Antonio can pair his rim control with Castle and Fox pace.',
      'Minnesota is still live at home because Anthony Edwards can detonate a single game, but the Wolves need cleaner secondary support and fewer momentum-killing stretches.'
    ],
    lean: 'Lean Spurs because the current series sample keeps rewarding their interior control and cleaner backcourt orchestration.',
    swing: 'Swing factor: whether Minnesota can keep San Antonio out of early transition and make Wembanyama guard in space without giving up the glass.',
    seriesBreakdown: {
      kicker: 'Playoff series to date',
      title: 'Why San Antonio has taken control after Game 1',
      record: 'Spurs lead 2-1',
      recap:
        'Minnesota grabbed the opener, but the series has increasingly tilted toward San Antonio\'s cleaner structure. The Spurs have gotten elite interior impact from Wembanyama, steadier guard orchestration from Castle and Fox, and enough pace pressure to make the Wolves chase the game shape more often than dictate it.',
      seriesStats: [
        'SAS 116.7 PPG | MIN 102.3 PPG',
        'Wembanyama: 23.0 PPG | 15.0 RPG | 6.3 BPG',
        'Castle: 17.0 PPG | 7.0 APG',
        'Edwards: 20.7 PPG | 14.0 RPG in Game 3 response'
      ],
      boxScores: [
        {
          label: 'Game 1',
          date: 'May 4, 2026',
          result: 'Timberwolves 104, Spurs 102',
          notes: [
            'Minnesota edged the opener despite San Antonio winning the fast-break points 27-11.',
            'The Wolves got 52 points in the paint and enough frontcourt scoring to survive the late swings.',
            'Even in the loss, Wembanyama flashed the matchup problem with a 15-rebound, 12-block line.'
          ],
          leaders: [
            {
              team: 'Timberwolves leaders',
              lines: [
                'Julius Randle: 21 points',
                'Anthony Edwards: 18 points',
                'Jaden McDaniels: 16 points',
                'Terrence Shannon Jr.: 16 points'
              ]
            },
            {
              team: 'Spurs leaders',
              lines: [
                'Dylan Harper: 18 points',
                'Stephon Castle: 17 points',
                'Julian Champagnie: 17 points',
                'Victor Wembanyama: 11 points, 15 rebounds, 12 blocks'
              ]
            }
          ]
        },
        {
          label: 'Game 2',
          date: 'May 6, 2026',
          result: 'Spurs 133, Timberwolves 95',
          notes: [
            'San Antonio buried Minnesota with 16 made threes and a 29-5 fast-break edge.',
            'The Wolves committed 22 turnovers and never recovered from the pace deficit.',
            'This was the cleanest proof yet that the Spurs can win outside of pure Wembanyama shot volume.'
          ],
          leaders: [
            {
              team: 'Spurs leaders',
              lines: [
                'Stephon Castle: 21 points',
                'Victor Wembanyama: 19 points, 15 rebounds',
                'De’Aaron Fox: 16 points'
              ]
            },
            {
              team: 'Timberwolves leaders',
              lines: [
                'Jaden McDaniels: 12 points',
                'Julius Randle: 12 points',
                'Anthony Edwards: 12 points',
                'Naz Reid: 11 points'
              ]
            }
          ]
        },
        {
          label: 'Game 3',
          date: 'May 8, 2026',
          result: 'Spurs 115, Timberwolves 108',
          notes: [
            'Wembanyama detonated for 39 points and 15 rebounds, and the Wolves still never fully solved the matchup.',
            'Minnesota generated 30 second-chance points, but San Antonio stayed cleaner in the high-leverage possessions.',
            'Donte DiVincenzo remained out, which left another support-minute gap for the Wolves to patch on the fly.'
          ],
          leaders: [
            {
              team: 'Spurs leaders',
              lines: [
                'Victor Wembanyama: 39 points, 15 rebounds, 5 blocks',
                'De’Aaron Fox: 17 points',
                'Stephon Castle: 13 points, 12 assists'
              ]
            },
            {
              team: 'Timberwolves leaders',
              lines: [
                'Anthony Edwards: 32 points, 14 rebounds',
                'Naz Reid: 18 points',
                'Jaden McDaniels: 17 points'
              ]
            }
          ]
        }
      ],
      playerAnalysis: [
        'Victor Wembanyama has become the matchup winner of the series at 23.0 points, 15.0 rebounds, and 6.3 blocks per game.',
        'Stephon Castle has quietly stabilized the Spurs offense with 17.0 points and 7.0 assists per game, which matters because it keeps San Antonio from living and dying on one creator.',
        'De’Aaron Fox has given the Spurs enough downhill juice to punish Minnesota whenever the Wolves get loose in transition defense.',
        'Anthony Edwards still carries the clearest single-game ceiling for Minnesota, and his 32-point Game 3 shows the Wolves are not out of answers if the supporting script improves.',
        'Julius Randle opened the series well but needs a stronger interior response after San Antonio kept pulling the frontcourt matchup back toward Wembanyama.',
        'Naz Reid and Jaden McDaniels have both had useful support bursts, but Minnesota still needs a cleaner collective game to avoid letting San Antonio dictate the terms again.'
      ],
      sources: [
        {
          label: 'NBA playoffs schedule',
          url: 'https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true'
        },
        {
          label: 'Game 1 official PDF box score',
          url: 'https://statsdmz.nba.com/pdfs/20260504/20260504_MINSAS.pdf'
        },
        {
          label: 'Game 2 official PDF box score',
          url: 'https://statsdmz.nba.com/pdfs/20260506/20260506_MINSAS.pdf'
        },
        {
          label: 'Game 3 official PDF box score',
          url: 'https://statsdmz.nba.com/pdfs/20260508/20260508_SASMIN.pdf'
        }
      ]
    },
    odds: makeBoardOdds({
      spread: 'SAS -4.5 (-115) / MIN +4.5 (-105)',
      total: 'O 217.5 (-115) / U 217.5 (-105)',
      moneyline: 'SAS -192 / MIN +160'
    })
  },
  {
    id: 'mercury-valkyries',
    league: 'WNBA',
    start: '5:30 PM PT',
    startMinutes: 1050,
    title: 'Mercury @ Valkyries',
    stage: 'WNBA opening weekend',
    spotlight: true,
    tags: ['Home debut', 'Tight market', 'Late close'],
    matchup: [
      {
        side: 'Away',
        name: 'Mercury',
        detail: 'Veteran road group | Live dog in a narrow number'
      },
      {
        side: 'Home',
        name: 'Valkyries',
        detail: 'Inaugural home game | Slight market favorite'
      }
    ],
    summary:
      'Golden State gets the inaugural-home-game energy with only a slight market edge, while Phoenix brings the more familiar veteran backbone into the building.',
    factors: [
      'A one-bucket spread means crowd environment and late-game poise can matter almost as much as raw team strength.',
      'Phoenix has the more familiar veteran feel, but the Valkyries get the schedule spot the market usually respects: a real home-stage debut with a short number.',
      'If the game stays close late, it becomes a test of whether home energy outweighs Phoenix\'s steadier veteran rhythm.'
    ],
    lean: 'Lean Valkyries on the home debut energy in a very small market.',
    swing: 'Swing factor: whether Phoenix can keep the building quiet early enough to turn this back into a pure execution game.',
    odds: makeBoardOdds({
      spread: 'PHX +1.5 (-105) / GSV -1.5 (-115)',
      total: 'O 158.5 (-108) / U 158.5 (-112)',
      moneyline: 'PHX +105 / GSV -125'
    })
  }
]

const enrichRawGame = (game) => ({
  ...game,
  teamContext: {
    away: standingsContextByTeam[game.away],
    home: standingsContextByTeam[game.home]
  },
  parkContext: parkContextByHomeTeam[game.home] ?? null,
  offenseContext: {
    away: teamOffenseContextByTeam[game.away] ?? null,
    home: teamOffenseContextByTeam[game.home] ?? null
  },
  bullpenContext: {
    away: teamBullpenContextByTeam[game.away] ?? null,
    home: teamBullpenContextByTeam[game.home] ?? null
  },
  lineupContext: lineupMatchupContextByGame[game.id] ?? null
})

const modeledGames = [
  ...rawGames.map((game) => createSportsMatchModel(buildRawGame(enrichRawGame(game)), oddsMeta.provider)),
  ...basketballGames.map((game) => createSportsMatchModel(game, game.odds.provider))
]

export const games = modeledGames.sort(
  (left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title)
)

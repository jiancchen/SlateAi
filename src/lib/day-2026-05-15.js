import { createSportsMatchModel } from './sports-model.js'
import { parkContextByHomeTeam } from './day-2026-05-13-mlb-data.js'
import {
  standingsContextByTeam,
  teamOffenseContextByTeam,
  teamBullpenContextByTeam,
  teamSavantContextByTeam
} from './mlb-context-2026-05-15.js'

export const slateMeta = {
  title: 'Friday Trading Board',
  date: 'May 15, 2026',
  isoDate: '2026-05-15',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A full May 15 board with 15 MLB games, 2 NBA playoff games, and 4 WNBA games, rebuilt from current official starters, live board pricing, standings, bullpen form, contact quality, and current playoff or roster context.',
  notes: [
    'The May 14 board held up best on baseball, but the thinner edge games still reinforced the same weak point: shaky late-inning protection and fragile favorite scripts can erase a cleaner first-pass read.',
    "Today's MLB model keeps the projected-hit edge and hit-efficiency layer, while staying more skeptical of favorites that need weak bullpens or unstable starter samples to survive nine innings.",
    'Dodgers-style talent edges are still being treated with more caution if the recent form, bullpen protection, or hit-quality path does not fully support the sticker price.',
    'WNBA remains on a lead-fragility watch after the recent blown leads, so the short and medium-range numbers are being treated more like tradable scripts than automatic favorite boards.',
    'Both NBA games are Game 6 spots tonight, so the board explicitly prices in closeout pressure instead of pretending the earlier box scores carry forward linearly.'
  ]
}

export const filters = ['All', 'MLB', 'NBA', 'WNBA']

export const oddsMeta = {
  provider: 'Mixed official league data + live board snapshots',
  snapshot: 'May 15, 2026, 10:15 AM PT',
  note:
    'MLB pricing comes from the live ScoresAndOdds board, then layers official probable pitchers, standings, TeamRankings hit production, Covers bullpen stats, park context, and Baseball Savant team contact quality. NBA playoff reads combine current moneylines with the current series box-score arc. WNBA uses current ScoresAndOdds prices plus the May 15 LineStar board and official team roster production.'
}

export const sources = [
  { label: 'MLB probable pitchers', url: 'https://www.mlb.com/probable-pitchers' },
  { label: 'MLB schedule API for May 15, 2026', url: 'https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-15&hydrate=probablePitcher,team' },
  { label: 'MLB standings API for 2026 regular season', url: 'https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason' },
  { label: 'TeamRankings MLB hits per game', url: 'https://www.teamrankings.com/mlb/stat/hits-per-game' },
  { label: 'Covers MLB bullpen ERA', url: 'https://www.covers.com/sport/baseball/mlb/statistics/team-bullpenera/2026' },
  { label: 'Statcast park factors', url: 'https://baseballsavant.mlb.com/leaderboard/statcast-park-factors' },
  { label: 'Baseball Savant league hitting', url: 'https://baseballsavant.mlb.com/league' },
  { label: 'ScoresAndOdds MLB board', url: 'https://www.scoresandodds.com/mlb' },
  { label: 'ScoresAndOdds NBA board', url: 'https://www.scoresandodds.com/nba' },
  { label: 'ScoresAndOdds WNBA board', url: 'https://www.scoresandodds.com/wnba' },
  { label: 'LineStar WNBA fantasy defense', url: 'https://www.linestarapp.com/FantasyDefense/Sport/WNBA/Site/DraftKings' },
  { label: 'Aces roster', url: 'https://aces.wnba.com/roster' },
  { label: 'Sun roster', url: 'https://sun.wnba.com/roster' },
  { label: 'Mystics roster', url: 'https://mystics.wnba.com/roster' },
  { label: 'Fever roster', url: 'https://fever.wnba.com/roster' },
  { label: 'Tempo roster', url: 'https://tempo.wnba.com/roster' },
  { label: 'Sparks roster', url: 'https://sparks.wnba.com/roster' },
  { label: 'Sky roster', url: 'https://sky.wnba.com/roster' },
  { label: 'Mercury roster', url: 'https://mercury.wnba.com/roster' },
  { label: 'NBA playoffs schedule', url: 'https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true' },
  { label: 'Cavaliers-Pistons Game 5 official PDF box score', url: 'https://statsdmz.nba.com/pdfs/20260513/20260513_CLEDET_book.pdf' },
  { label: 'Spurs-Timberwolves Game 5 official PDF box score', url: 'https://statsdmz.nba.com/pdfs/20260512/20260512_MINSAS_book.pdf' }
]

const market = (label, book, value) => ({ label, book, value })

const makeBoardOdds = ({ spread = '', total = '', moneyline = '', provider = 'ScoresAndOdds board' }) => ({
  participantOrder: [0, 1],
  markets: [
    ...(spread ? [market('Spread', provider, spread)] : []),
    ...(total ? [market('Total', provider, total)] : []),
    ...(moneyline ? [market('Moneyline', provider, moneyline)] : [])
  ],
  note:
    'Current board snapshot from the accessible same-day board. This price layer is meant to sit beside the model read, not replace it.',
  provider
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const parseAmericanPair = (value = '') => [...value.matchAll(/[+-]\d+/g)].map((match) => Number(match[0]))
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
  `${pitcher.fullName} (${pitcher.pitchHand || "?"}HP) | ${pitcher.wins}-${pitcher.losses} | ${pitcher.era} ERA | ${pitcher.strikeOuts} SO | ${Number(pitcher.whip || 0).toFixed(2)} WHIP | ${pitcher.inningsPitched} IP`
const buildStandingsLabel = (team = {}) => {
  const rankLabel = team.divisionLeader ? 'division leader' : `${formatOrdinal(team.divisionRank)} in division`
  const runDiff = Number(team.runDifferential) || 0
  return `${team.wins}-${team.losses}, ${rankLabel}, ${runDiff >= 0 ? "+" : ""}${runDiff} RD`
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
  return clamp(48 + (baselineHits - 7.8) * 10 + (splitHits - 7.8) * 7 + (recentHits - baselineHits) * 8, 24, 92)
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
const getWindowLabel = (startMinutes) => {
  if (startMinutes < 720) return 'Friday early board'
  if (startMinutes < 960) return 'Friday afternoon board'
  if (startMinutes < 1140) return 'Friday prime window'
  return 'Friday nightcap'
}

const rawGames = [
  {
    "id": "phillies-pirates",
    "away": "Phillies",
    "home": "Pirates",
    "start": "3:40 PM PT",
    "startMinutes": 940,
    "awayPitcher": {
      "fullName": "Aaron Nola",
      "pitchHand": "R",
      "wins": 2,
      "losses": 3,
      "era": "5.14",
      "strikeOuts": 44,
      "inningsPitched": "42.0",
      "hitsAllowed": 47,
      "walks": 15,
      "homeRunsAllowed": 7,
      "whip": 1.48,
      "gamesStarted": 8
    },
    "homePitcher": {
      "fullName": "Braxton Ashcraft",
      "pitchHand": "R",
      "wins": 2,
      "losses": 2,
      "era": "2.77",
      "strikeOuts": 51,
      "inningsPitched": "48.2",
      "hitsAllowed": 37,
      "walks": 14,
      "homeRunsAllowed": 4,
      "whip": 1.05,
      "gamesStarted": 8
    },
    "spread": "Phillies +1.5 (-186) / Pirates -1.5 (+153)",
    "total": "o8 (-112) / u8 (-108)",
    "moneyline": "Phillies +114 / Pirates -137",
    "pitcherSourceNote": ""
  },
  {
    "id": "orioles-nationals",
    "away": "Orioles",
    "home": "Nationals",
    "start": "3:45 PM PT",
    "startMinutes": 945,
    "awayPitcher": {
      "fullName": "Shane Baz",
      "pitchHand": "R",
      "wins": 1,
      "losses": 4,
      "era": "5.48",
      "strikeOuts": 38,
      "inningsPitched": "44.1",
      "hitsAllowed": 50,
      "walks": 19,
      "homeRunsAllowed": 5,
      "whip": 1.56,
      "gamesStarted": 8
    },
    "homePitcher": {
      "fullName": "Zack Littell",
      "pitchHand": "R",
      "wins": 1,
      "losses": 4,
      "era": "6.94",
      "strikeOuts": 17,
      "inningsPitched": "36.1",
      "hitsAllowed": 45,
      "walks": 13,
      "homeRunsAllowed": 14,
      "whip": 1.6,
      "gamesStarted": 5
    },
    "spread": "Orioles -1.5 (+114) / Nationals +1.5 (-137)",
    "total": "o9.5 (-103) / u9.5 (-117)",
    "moneyline": "Orioles -142 / Nationals +118",
    "pitcherSourceNote": ""
  },
  {
    "id": "blue-jays-tigers",
    "away": "Blue Jays",
    "home": "Tigers",
    "start": "3:45 PM PT",
    "startMinutes": 945,
    "awayPitcher": {
      "fullName": "Trey Yesavage",
      "pitchHand": "R",
      "wins": 1,
      "losses": 1,
      "era": "0.68",
      "strikeOuts": 15,
      "inningsPitched": "13.1",
      "hitsAllowed": 13,
      "walks": 5,
      "homeRunsAllowed": 0,
      "whip": 1.35,
      "gamesStarted": 3
    },
    "homePitcher": {
      "fullName": "Brenan Hanifee",
      "pitchHand": "R",
      "wins": 0,
      "losses": 0,
      "era": "1.08",
      "strikeOuts": 4,
      "inningsPitched": "8.1",
      "hitsAllowed": 8,
      "walks": 1,
      "homeRunsAllowed": 1,
      "whip": 1.08,
      "gamesStarted": 1
    },
    "spread": "Blue Jays -1.5 (+130) / Tigers +1.5 (-157)",
    "total": "o8 (-110) / u8 (-110)",
    "moneyline": "Blue Jays -126 / Tigers +105",
    "pitcherSourceNote": ""
  },
  {
    "id": "reds-guardians",
    "away": "Reds",
    "home": "Guardians",
    "start": "4:10 PM PT",
    "startMinutes": 970,
    "awayPitcher": {
      "fullName": "Andrew Abbott",
      "pitchHand": "L",
      "wins": 2,
      "losses": 2,
      "era": "4.47",
      "strikeOuts": 33,
      "inningsPitched": "46.1",
      "hitsAllowed": 50,
      "walks": 20,
      "homeRunsAllowed": 5,
      "whip": 1.51,
      "gamesStarted": 9
    },
    "homePitcher": {
      "fullName": "Tanner Bibee",
      "pitchHand": "R",
      "wins": 0,
      "losses": 5,
      "era": "4.17",
      "strikeOuts": 45,
      "inningsPitched": "45.1",
      "hitsAllowed": 43,
      "walks": 18,
      "homeRunsAllowed": 7,
      "whip": 1.35,
      "gamesStarted": 9
    },
    "spread": "Reds +1.5 (-182) / Guardians -1.5 (+150)",
    "total": "o8 (-105) / u8 (-114)",
    "moneyline": "Reds +118 / Guardians -142",
    "pitcherSourceNote": ""
  },
  {
    "id": "marlins-rays",
    "away": "Marlins",
    "home": "Rays",
    "start": "4:10 PM PT",
    "startMinutes": 970,
    "awayPitcher": {
      "fullName": "Janson Junk",
      "pitchHand": "R",
      "wins": 2,
      "losses": 3,
      "era": "3.25",
      "strikeOuts": 33,
      "inningsPitched": "44.1",
      "hitsAllowed": 39,
      "walks": 10,
      "homeRunsAllowed": 4,
      "whip": 1.11,
      "gamesStarted": 8
    },
    "homePitcher": {
      "fullName": "Jesse Scholtens",
      "pitchHand": "R",
      "wins": 3,
      "losses": 2,
      "era": "3.29",
      "strikeOuts": 21,
      "inningsPitched": "27.1",
      "hitsAllowed": 22,
      "walks": 10,
      "homeRunsAllowed": 4,
      "whip": 1.17,
      "gamesStarted": 2
    },
    "spread": "Marlins -1.5 (+163) / Rays +1.5 (-200)",
    "total": "o8 (-105) / u8 (-114)",
    "moneyline": "Marlins +102 / Rays -123",
    "pitcherSourceNote": ""
  },
  {
    "id": "brewers-twins",
    "away": "Brewers",
    "home": "Twins",
    "start": "4:10 PM PT",
    "startMinutes": 970,
    "awayPitcher": {
      "fullName": "Chad Patrick",
      "pitchHand": "R",
      "wins": 2,
      "losses": 2,
      "era": "3.06",
      "strikeOuts": 26,
      "inningsPitched": "35.1",
      "hitsAllowed": 31,
      "walks": 17,
      "homeRunsAllowed": 2,
      "whip": 1.36,
      "gamesStarted": 5
    },
    "homePitcher": {
      "fullName": "Joe Ryan",
      "pitchHand": "R",
      "wins": 2,
      "losses": 3,
      "era": "3.43",
      "strikeOuts": 45,
      "inningsPitched": "44.2",
      "hitsAllowed": 33,
      "walks": 13,
      "homeRunsAllowed": 3,
      "whip": 1.03,
      "gamesStarted": 9
    },
    "spread": "Brewers -1.5 (+144) / Twins +1.5 (-175)",
    "total": "o9 (-102) / u9 (-118)",
    "moneyline": "Brewers -112 / Twins -107",
    "pitcherSourceNote": "Milwaukee starter still showed as TBD on the official probable-pitchers feed while the live board listed Chad Patrick (R)."
  },
  {
    "id": "red-sox-braves",
    "away": "Red Sox",
    "home": "Braves",
    "start": "4:15 PM PT",
    "startMinutes": 975,
    "awayPitcher": {
      "fullName": "Connelly Early",
      "pitchHand": "L",
      "wins": 3,
      "losses": 2,
      "era": "3.16",
      "strikeOuts": 39,
      "inningsPitched": "42.2",
      "hitsAllowed": 34,
      "walks": 18,
      "homeRunsAllowed": 5,
      "whip": 1.22,
      "gamesStarted": 8
    },
    "homePitcher": {
      "fullName": "Spencer Strider",
      "pitchHand": "R",
      "wins": 1,
      "losses": 0,
      "era": "2.89",
      "strikeOuts": 14,
      "inningsPitched": "9.1",
      "hitsAllowed": 5,
      "walks": 7,
      "homeRunsAllowed": 1,
      "whip": 1.29,
      "gamesStarted": 2
    },
    "spread": "Red Sox +1.5 (-163) / Braves -1.5 (+135)",
    "total": "o8 (-102) / u8 (-119)",
    "moneyline": "Red Sox +129 / Braves -156",
    "pitcherSourceNote": ""
  },
  {
    "id": "yankees-mets",
    "away": "Yankees",
    "home": "Mets",
    "start": "4:15 PM PT",
    "startMinutes": 975,
    "awayPitcher": {
      "fullName": "Cam Schlittler",
      "pitchHand": "R",
      "wins": 5,
      "losses": 1,
      "era": "1.35",
      "strikeOuts": 59,
      "inningsPitched": "53.1",
      "hitsAllowed": 34,
      "walks": 9,
      "homeRunsAllowed": 1,
      "whip": 0.81,
      "gamesStarted": 9
    },
    "homePitcher": {
      "fullName": "Clay Holmes",
      "pitchHand": "R",
      "wins": 4,
      "losses": 3,
      "era": "1.86",
      "strikeOuts": 37,
      "inningsPitched": "48.1",
      "hitsAllowed": 33,
      "walks": 16,
      "homeRunsAllowed": 3,
      "whip": 1.01,
      "gamesStarted": 8
    },
    "spread": "Yankees -1.5 (+119) / Mets +1.5 (-143)",
    "total": "o7 (-105) / u7 (-114)",
    "moneyline": "Yankees -157 / Mets +130",
    "pitcherSourceNote": ""
  },
  {
    "id": "cubs-white-sox",
    "away": "Cubs",
    "home": "White Sox",
    "start": "4:40 PM PT",
    "startMinutes": 1000,
    "awayPitcher": {
      "fullName": "Edward Cabrera",
      "pitchHand": "R",
      "wins": 3,
      "losses": 1,
      "era": "3.88",
      "strikeOuts": 43,
      "inningsPitched": "46.1",
      "hitsAllowed": 46,
      "walks": 15,
      "homeRunsAllowed": 7,
      "whip": 1.32,
      "gamesStarted": 8
    },
    "homePitcher": {
      "fullName": "Sean Burke",
      "pitchHand": "R",
      "wins": 2,
      "losses": 3,
      "era": "3.68",
      "strikeOuts": 36,
      "inningsPitched": "44.0",
      "hitsAllowed": 38,
      "walks": 10,
      "homeRunsAllowed": 5,
      "whip": 1.09,
      "gamesStarted": 6
    },
    "spread": "Cubs -1.5 (+113) / White Sox +1.5 (-136)",
    "total": "o8.5 (-106) / u8.5 (-113)",
    "moneyline": "Cubs -149 / White Sox +123",
    "pitcherSourceNote": ""
  },
  {
    "id": "rangers-astros",
    "away": "Rangers",
    "home": "Astros",
    "start": "5:10 PM PT",
    "startMinutes": 1030,
    "awayPitcher": {
      "fullName": "Jack Leiter",
      "pitchHand": "R",
      "wins": 1,
      "losses": 3,
      "era": "4.85",
      "strikeOuts": 49,
      "inningsPitched": "42.2",
      "hitsAllowed": 43,
      "walks": 18,
      "homeRunsAllowed": 7,
      "whip": 1.43,
      "gamesStarted": 8
    },
    "homePitcher": {
      "fullName": "Spencer Arrighetti",
      "pitchHand": "R",
      "wins": 4,
      "losses": 1,
      "era": "1.88",
      "strikeOuts": 30,
      "inningsPitched": "28.2",
      "hitsAllowed": 21,
      "walks": 17,
      "homeRunsAllowed": 1,
      "whip": 1.33,
      "gamesStarted": 5
    },
    "spread": "Rangers -1.5 (+149) / Astros +1.5 (-181)",
    "total": "o8.5 (-114) / u8.5 (-105)",
    "moneyline": "Rangers -112 / Astros -108",
    "pitcherSourceNote": ""
  },
  {
    "id": "royals-cardinals",
    "away": "Royals",
    "home": "Cardinals",
    "start": "5:15 PM PT",
    "startMinutes": 1035,
    "awayPitcher": {
      "fullName": "Michael Wacha",
      "pitchHand": "R",
      "wins": 4,
      "losses": 2,
      "era": "2.63",
      "strikeOuts": 42,
      "inningsPitched": "51.1",
      "hitsAllowed": 34,
      "walks": 17,
      "homeRunsAllowed": 5,
      "whip": 0.99,
      "gamesStarted": 8
    },
    "homePitcher": {
      "fullName": "Dustin May",
      "pitchHand": "R",
      "wins": 3,
      "losses": 4,
      "era": "4.85",
      "strikeOuts": 32,
      "inningsPitched": "42.2",
      "hitsAllowed": 50,
      "walks": 11,
      "homeRunsAllowed": 4,
      "whip": 1.43,
      "gamesStarted": 8
    },
    "spread": "Royals -1.5 (+145) / Cardinals +1.5 (-176)",
    "total": "o8.5 (-112) / u8.5 (-107)",
    "moneyline": "Royals -105 / Cardinals -114",
    "pitcherSourceNote": ""
  },
  {
    "id": "diamondbacks-rockies",
    "away": "Diamondbacks",
    "home": "Rockies",
    "start": "5:40 PM PT",
    "startMinutes": 1060,
    "awayPitcher": {
      "fullName": "Merrill Kelly",
      "pitchHand": "R",
      "wins": 2,
      "losses": 3,
      "era": "7.62",
      "strikeOuts": 20,
      "inningsPitched": "26.0",
      "hitsAllowed": 32,
      "walks": 18,
      "homeRunsAllowed": 6,
      "whip": 1.92,
      "gamesStarted": 5
    },
    "homePitcher": {
      "fullName": "Kyle Freeland",
      "pitchHand": "L",
      "wins": 1,
      "losses": 4,
      "era": "6.00",
      "strikeOuts": 28,
      "inningsPitched": "30.0",
      "hitsAllowed": 36,
      "walks": 8,
      "homeRunsAllowed": 7,
      "whip": 1.47,
      "gamesStarted": 6
    },
    "spread": "Diamondbacks -1.5 (+114) / Rockies +1.5 (-137)",
    "total": "o11.5 (-112) / u11.5 (-108)",
    "moneyline": "Diamondbacks -125 / Rockies +104",
    "pitcherSourceNote": ""
  },
  {
    "id": "dodgers-angels",
    "away": "Dodgers",
    "home": "Angels",
    "start": "6:38 PM PT",
    "startMinutes": 1118,
    "awayPitcher": {
      "fullName": "Blake Snell",
      "pitchHand": "L",
      "wins": 0,
      "losses": 1,
      "era": "12.00",
      "strikeOuts": 5,
      "inningsPitched": "3.0",
      "hitsAllowed": 6,
      "walks": 2,
      "homeRunsAllowed": 0,
      "whip": 2.67,
      "gamesStarted": 1
    },
    "homePitcher": {
      "fullName": "Jack Kochanowicz",
      "pitchHand": "R",
      "wins": 2,
      "losses": 2,
      "era": "3.97",
      "strikeOuts": 30,
      "inningsPitched": "45.1",
      "hitsAllowed": 38,
      "walks": 23,
      "homeRunsAllowed": 2,
      "whip": 1.35,
      "gamesStarted": 8
    },
    "spread": "Dodgers -1.5 (-137) / Angels +1.5 (+114)",
    "total": "o9 (-110) / u9 (-110)",
    "moneyline": "Dodgers -231 / Angels +187",
    "pitcherSourceNote": ""
  },
  {
    "id": "padres-mariners",
    "away": "Padres",
    "home": "Mariners",
    "start": "6:40 PM PT",
    "startMinutes": 1120,
    "awayPitcher": {
      "fullName": "Randy Vásquez",
      "pitchHand": "R",
      "wins": 4,
      "losses": 1,
      "era": "3.05",
      "strikeOuts": 42,
      "inningsPitched": "44.1",
      "hitsAllowed": 39,
      "walks": 13,
      "homeRunsAllowed": 4,
      "whip": 1.17,
      "gamesStarted": 8
    },
    "homePitcher": {
      "fullName": "Emerson Hancock",
      "pitchHand": "R",
      "wins": 3,
      "losses": 1,
      "era": "3.21",
      "strikeOuts": 50,
      "inningsPitched": "47.2",
      "hitsAllowed": 39,
      "walks": 9,
      "homeRunsAllowed": 8,
      "whip": 1.01,
      "gamesStarted": 8
    },
    "spread": "Padres +1.5 (-196) / Mariners -1.5 (+161)",
    "total": "o7 (-115) / u7 (-104)",
    "moneyline": "Padres +109 / Mariners -131",
    "pitcherSourceNote": ""
  },
  {
    "id": "giants-athletics",
    "away": "Giants",
    "home": "Athletics",
    "start": "6:40 PM PT",
    "startMinutes": 1120,
    "awayPitcher": {
      "fullName": "Tyler Mahle",
      "pitchHand": "R",
      "wins": 1,
      "losses": 4,
      "era": "5.18",
      "strikeOuts": 42,
      "inningsPitched": "41.2",
      "hitsAllowed": 42,
      "walks": 20,
      "homeRunsAllowed": 8,
      "whip": 1.49,
      "gamesStarted": 8
    },
    "homePitcher": {
      "fullName": "Aaron Civale",
      "pitchHand": "R",
      "wins": 4,
      "losses": 1,
      "era": "2.59",
      "strikeOuts": 33,
      "inningsPitched": "41.2",
      "hitsAllowed": 45,
      "walks": 13,
      "homeRunsAllowed": 4,
      "whip": 1.39,
      "gamesStarted": 8
    },
    "spread": "Giants +1.5 (-175) / Athletics -1.5 (+144)",
    "total": "o10 (-105) / u10 (-114)",
    "moneyline": "Giants +113 / Athletics -136",
    "pitcherSourceNote": ""
  }
]

const enrichRawGame = (game) => ({
  ...game,
  teamContext: { away: standingsContextByTeam[game.away], home: standingsContextByTeam[game.home] },
  parkContext: parkContextByHomeTeam[game.home] || null,
  offenseContext: { away: teamOffenseContextByTeam[game.away], home: teamOffenseContextByTeam[game.home] },
  bullpenContext: { away: teamBullpenContextByTeam[game.away], home: teamBullpenContextByTeam[game.home] },
  savantContext: { away: teamSavantContextByTeam[game.away], home: teamSavantContextByTeam[game.home] }
})

const buildMlbGame = (raw) => {
  const [awayOdds, homeOdds] = parseAmericanPair(raw.moneyline)
  const awayMarketScore = impliedProbabilityFromAmerican(awayOdds) * 100
  const homeMarketScore = impliedProbabilityFromAmerican(homeOdds) * 100
  const awayStarterScore = starterScore(raw.awayPitcher)
  const homeStarterScore = starterScore(raw.homePitcher)
  const awayStandingsScore = buildStandingsScore(raw.teamContext.away)
  const homeStandingsScore = buildStandingsScore(raw.teamContext.home)
  const awayOffenseScore = buildOffenseScore(raw.offenseContext.away, 'Away')
  const homeOffenseScore = buildOffenseScore(raw.offenseContext.home, 'Home')
  const awayBullpenScore = buildBullpenScore(raw.bullpenContext.away)
  const homeBullpenScore = buildBullpenScore(raw.bullpenContext.home)
  const awaySavantScore = buildSavantScore(raw.savantContext.away)
  const homeSavantScore = buildSavantScore(raw.savantContext.home)

  const awayComposite = awayMarketScore * 0.27 + awayStarterScore * 0.22 + awayStandingsScore * 0.13 + awayOffenseScore * 0.14 + awayBullpenScore * 0.11 + awaySavantScore * 0.13
  const homeComposite = homeMarketScore * 0.27 + homeStarterScore * 0.22 + homeStandingsScore * 0.13 + homeOffenseScore * 0.14 + homeBullpenScore * 0.11 + homeSavantScore * 0.13

  const modelIndex = awayComposite >= homeComposite ? 0 : 1
  const favoriteIndex = awayMarketScore >= homeMarketScore ? 0 : 1
  const starterIndex = awayStarterScore >= homeStarterScore ? 0 : 1
  const bullpenIndex = awayBullpenScore >= homeBullpenScore ? 0 : 1
  const savantIndex = awaySavantScore >= homeSavantScore ? 0 : 1
  const projectedTeam = modelIndex === 0 ? raw.away : raw.home
  const starterTeam = starterIndex === 0 ? raw.away : raw.home
  const bullpenTeam = bullpenIndex === 0 ? raw.away : raw.home
  const contactTeam = savantIndex === 0 ? raw.away : raw.home
  const favoriteTeam = favoriteIndex === 0 ? raw.away : raw.home

  const tags = [
    Math.abs(Math.abs(awayOdds) - Math.abs(homeOdds)) <= 18 ? 'Tradable number' : `${favoriteTeam} price edge`,
    `Starter edge ${starterTeam}`,
    `Bullpen edge ${bullpenTeam}`,
    `Contact edge ${contactTeam}`
  ]

  if ((raw.parkContext?.indexRuns || 100) >= 106) tags.push('Run-boosting park')
  if ((raw.parkContext?.indexRuns || 100) <= 94) tags.push('Run-suppressing park')

  const factors = [
    `Current board: ${raw.moneyline} | ${raw.total} | ${raw.spread}.`,
    `${raw.awayPitcher.fullName} gives ${raw.away} a ${raw.awayPitcher.era} ERA, ${Number(raw.awayPitcher.whip || 0).toFixed(2)} WHIP, ${raw.awayPitcher.strikeOuts} strikeout baseline; ${raw.homePitcher.fullName} gives ${raw.home} a ${raw.homePitcher.era} ERA, ${Number(raw.homePitcher.whip || 0).toFixed(2)} WHIP, ${raw.homePitcher.strikeOuts} strikeout baseline.`,
    `${raw.away} enter ${buildStandingsLabel(raw.teamContext.away)}; ${raw.home} enter ${buildStandingsLabel(raw.teamContext.home)}.`,
    `${raw.away} offense: ${raw.offenseContext.away.hitsPerGame.toFixed(2)} H/G, last 3 ${raw.offenseContext.away.last3HitsPerGame.toFixed(2)}, road ${raw.offenseContext.away.awayHitsPerGame.toFixed(2)}; ${raw.home} offense: ${raw.offenseContext.home.hitsPerGame.toFixed(2)} H/G, last 3 ${raw.offenseContext.home.last3HitsPerGame.toFixed(2)}, home ${raw.offenseContext.home.homeHitsPerGame.toFixed(2)}.`,
    `${raw.away} bullpen: ${raw.bullpenContext.away.era.toFixed(2)} ERA, ${raw.bullpenContext.away.whip.toFixed(2)} WHIP; ${raw.home} bullpen: ${raw.bullpenContext.home.era.toFixed(2)} ERA, ${raw.bullpenContext.home.whip.toFixed(2)} WHIP. Contact-quality edge: ${contactTeam}.
${raw.pitcherSourceNote ? ` ${raw.pitcherSourceNote}` : ""}`.trim()
  ]

  return {
    id: raw.id,
    league: 'MLB',
    title: `${raw.away} @ ${raw.home}`,
    start: raw.start,
    startMinutes: raw.startMinutes,
    stage: getWindowLabel(raw.startMinutes),
    spotlight:
      Math.abs(awayComposite - homeComposite) >= 5 ||
      Math.abs(awaySavantScore - homeSavantScore) >= 8 ||
      Math.abs(awayBullpenScore - homeBullpenScore) >= 8 ||
      (raw.parkContext?.indexRuns || 100) >= 108,
    tags: [...new Set(tags)].slice(0, 3),
    matchup: [
      { side: 'Away', name: raw.away, detail: pitcherDetail(raw.awayPitcher) },
      { side: 'Home', name: raw.home, detail: pitcherDetail(raw.homePitcher) }
    ],
    summary:
      projectedTeam === starterTeam && projectedTeam === bullpenTeam
        ? `${projectedTeam} own the cleaner full-game shape on the morning board because the market, starter lane, and late-inning protection all lean the same way.`
        : `${raw.away} @ ${raw.home} is more about full-game chain quality than one clean surface number, because the market, starter lane, and late bullpen script are not all pointing to the same side.`,
    lean:
      `Lean ${projectedTeam} if the projected hit edge and bullpen follow-through hold once the game leaves the opening pass through the order.`,
    factors,
    swingFactor:
      `Swing factor: whether ${favoriteTeam} can protect its better early script once the game reaches the thinner bullpen and traffic innings.`,
    teamContext: raw.teamContext,
    parkContext: raw.parkContext,
    offenseContext: raw.offenseContext,
    bullpenContext: raw.bullpenContext,
    savantContext: raw.savantContext,
    starterContext: { away: raw.awayPitcher, home: raw.homePitcher },
    pitcherSourceNote: raw.pitcherSourceNote || '',
    odds: makeBoardOdds({ spread: raw.spread, total: raw.total, moneyline: raw.moneyline })
  }
}

const makeGame = (game) => createSportsMatchModel(game, oddsMeta.provider)

const basketballGames = [
  makeGame({
    id: 'pistons-cavaliers-g6',
    league: 'NBA',
    start: '4:00 PM PT',
    startMinutes: 960,
    title: 'Pistons @ Cavaliers',
    stage: 'East semifinal Game 6',
    spotlight: true,
    tags: ['Cavs lead 3-2', 'Closeout pressure', 'Cade vs Harden'],
    matchup: [
      { side: 'Away', name: 'Pistons', detail: 'Cunningham | Harris | Duren | Facing elimination' },
      { side: 'Home', name: 'Cavaliers', detail: 'Harden | Mitchell | Allen | Home closeout spot' }
    ],
    summary:
      'Cleveland finally stole the control of this series in Game 5, but the road comeback also confirmed Detroit is still live whenever Cade Cunningham owns the possession game long enough to drag Cleveland into another late shot-making war.',
    factors: [
      'Current board: Pistons +145 / Cavaliers -175 with Cleveland laying 4.5 and the total sitting at 210.5.',
      'Game 5 on Wednesday, May 13, 2026 ended 117-113 in overtime for Cleveland after the Cavaliers erased a nine-point deficit late in regulation, which changed the series from a Detroit control script into a real home closeout spot for the Cavs.',
      "Cleveland now has the cleaner top-end scoring path after James Harden's 30-point Game 5 and Donovan Mitchell's 21-point overtime response, but Detroit still has the steadier possession organizer in Cunningham if the game compresses again."
    ],
    lean:
      'Lean Cavaliers because the home closeout setup and the revived Harden-Mitchell creation tree are finally aligned, while still keeping real volatility alive because Detroit has already proven it can win the structure battle in this series.',
    swing:
      'Swing factor: whether Cunningham can keep the game organized long enough to stop Cleveland from turning the final minutes into another pure star-shot-making finish.',
    seriesBreakdown: {
      kicker: 'Playoff series to date',
      title: 'Why Game 6 is still live even with Cleveland holding serve',
      record: 'Cavaliers lead 3-2',
      recap:
        'Detroit took the first two games by controlling possessions and tempo, Cleveland answered with the two home games, and then the Cavaliers stole Game 5 in overtime on Wednesday, May 13, 2026. That gives the Cavs the cleaner current momentum, but it does not erase the fact that Detroit has already owned large stretches of the series whenever Cunningham gets enough support and the Pistons keep the game from becoming a late isolation shootout.',
      seriesStats: [
        'DET 108.6 PPG | CLE 109.0 PPG through five games',
        'Game 5: Cleveland 117, Detroit 113 (OT) on May 13, 2026',
        'Cade Cunningham: 39 points, 9 assists in Game 5',
        'James Harden: playoff-best 30 points in Game 5',
        'Game 6 price: CLE -175 | DET +145'
      ],
      boxScores: [
        {
          label: 'Game 1',
          date: 'May 5, 2026',
          result: 'Pistons 111, Cavaliers 101',
          notes: [
            'Detroit won the turnover and control game from the opening quarter and never let Cleveland fully own the pace.',
            'The Pistons turned live-ball pressure into extra offense, which set the early tone for the series.',
            'Cleveland scored enough in pockets, but the possession chain still belonged to Detroit.'
          ],
          leaders: [
            { team: 'Pistons leaders', lines: ['Cade Cunningham: 23 points, 7 assists', 'Tobias Harris: 20 points', 'Duncan Robinson: 19 points', 'Jalen Duren: 11 points, 12 rebounds'] },
            { team: 'Cavaliers leaders', lines: ['Donovan Mitchell: 23 points', 'James Harden: 22 points, 7 assists', 'Max Strus: 19 points'] }
          ]
        },
        {
          label: 'Game 2',
          date: 'May 7, 2026',
          result: 'Pistons 107, Cavaliers 97',
          notes: [
            'Detroit again kept Cleveland under 100 and won the cleaner late-game possessions.',
            'Mitchell scored, but the Pistons kept finding steadier support scoring.',
            'This was the second straight proof that the dog route was not a one-game punch.'
          ],
          leaders: [
            { team: 'Pistons leaders', lines: ['Cade Cunningham: 25 points, 10 assists', 'Tobias Harris: 21 points', 'Duncan Robinson: 17 points', 'Caris LeVert: 14 points'] },
            { team: 'Cavaliers leaders', lines: ['Donovan Mitchell: 31 points', 'Jarrett Allen: 22 points', 'Evan Mobley: 9 points'] }
          ]
        },
        {
          label: 'Game 3',
          date: 'May 9, 2026',
          result: 'Cavaliers 116, Pistons 109',
          notes: [
            'Cleveland finally found its first clean response behind a huge Mitchell scoring night and better offensive efficiency.',
            'Detroit still got a triple-double from Cunningham and stayed live deep into the game.',
            'This was the first hard proof that the Cavs could win without fully controlling the possession script.'
          ],
          leaders: [
            { team: 'Cavaliers leaders', lines: ['Donovan Mitchell: 35 points, 10 rebounds', 'James Harden: 19 points, 7 assists', 'Jarrett Allen: 18 points'] },
            { team: 'Pistons leaders', lines: ['Cade Cunningham: 27 points, 10 rebounds, 10 assists', 'Tobias Harris: 21 points', 'Paul Reed: 11 points'] }
          ]
        },
        {
          label: 'Game 4',
          date: 'May 11, 2026',
          result: 'Cavaliers 112, Pistons 103',
          notes: [
            "Cleveland's stars finally bent a full game the way the Cavs needed, and the series stopped feeling Detroit-controlled.",
            "Detroit still made the game playable into the late stages, but the Pistons could not match Cleveland's late creation burst.",
            'The result mattered because it reset the series into a true swing game instead of a Pistons lean.'
          ],
          leaders: [
            { team: 'Cavaliers leaders', lines: ['Donovan Mitchell: 43 points', 'James Harden: 24 points, 11 assists', 'Jarrett Allen: interior control minutes'] },
            { team: 'Pistons leaders', lines: ['Cade Cunningham: lead-creator load', 'Tobias Harris: support scoring', 'Detroit needed steadier closing offense'] }
          ]
        },
        {
          label: 'Game 5',
          date: 'May 13, 2026',
          result: 'Cavaliers 117, Pistons 113 (OT)',
          notes: [
            'Cleveland rallied from a nine-point deficit late in regulation and stole the first road win of the series in overtime.',
            'James Harden scored a playoff-best 30 points and Donovan Mitchell added 21, which finally gave Cleveland the two-star creation punch it had been chasing all series.',
            'Detroit still got a massive Cunningham performance and remained within one late possession, so the series is not suddenly noise-free.'
          ],
          leaders: [
            { team: 'Cavaliers leaders', lines: ['James Harden: 30 points', 'Donovan Mitchell: 21 points', 'Cleveland flipped the late offense in overtime'] },
            { team: 'Pistons leaders', lines: ['Cade Cunningham: 39 points, 9 assists', 'Detroit led by 9 late in regulation', 'Daniss Jenkins: 19 points in support minutes'] }
          ]
        }
      ],
      playerAnalysis: [
        'Cade Cunningham is still the cleanest full-series organizer in the matchup, which is why Detroit remains dangerous even down 3-2.',
        "James Harden's 30-point Game 5 mattered because it finally gave Cleveland the second reliable creator the Cavaliers had been missing under Mitchell.",
        "Mitchell still owns the fastest takeover ceiling on the floor, even if his path has been noisier from game to game than Cunningham's.",
        'Jarrett Allen and the interior minutes stay important because the series keeps toggling between Detroit control possessions and Cleveland scoring punches.',
        "Detroit still needs real support from Harris, Duren, and the auxiliary shooting to avoid putting every late trip on Cunningham's shoulders."
      ],
      sources: [
        { label: 'NBA playoffs schedule', url: 'https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true' },
        { label: 'Game 1 official PDF box score', url: 'https://statsdmz.nba.com/pdfs/20260505/20260505_CLEDET_book.pdf' },
        { label: 'Game 2 official PDF box score', url: 'https://statsdmz.nba.com/pdfs/20260507/20260507_CLEDET_book.pdf' },
        { label: 'Game 3 official PDF box score', url: 'https://statsdmz.nba.com/pdfs/20260509/20260509_DETCLE_book.pdf' },
        { label: 'Game 4 official PDF box score', url: 'https://statsdmz.nba.com/pdfs/20260511/20260511_DETCLE_book.pdf' },
        { label: 'Game 5 official PDF box score', url: 'https://statsdmz.nba.com/pdfs/20260513/20260513_CLEDET_book.pdf' }
      ]
    },
    odds: makeBoardOdds({ spread: 'Pistons +4.5 (-115) / Cavaliers -4.5 (-105)', total: 'o210.5 (-110) / u210.5 (-110)', moneyline: 'Pistons +145 / Cavaliers -175' })
  }),
  makeGame({
    id: 'spurs-timberwolves-g6',
    league: 'NBA',
    start: '6:30 PM PT',
    startMinutes: 1110,
    title: 'Spurs @ Timberwolves',
    stage: 'West semifinal Game 6',
    spotlight: true,
    tags: ['Spurs lead 3-2', 'Road closeout', 'Wemby leverage'],
    matchup: [
      { side: 'Away', name: 'Spurs', detail: 'Wembanyama | Fox | Castle | Road closeout spot' },
      { side: 'Home', name: 'Timberwolves', detail: 'Edwards | Randle | Reid | Home elimination game' }
    ],
    summary:
      'San Antonio regained the interior script in Game 5, but tonight is still a real stress test because Minnesota finally gets a true home elimination spot after the series has already shown it can swing wildly with one Wembanyama or Edwards-fueled game.',
    factors: [
      'Current board: Spurs -218 / Timberwolves +180 with San Antonio laying 5.5 and the total sitting at 219.5.',
      'Game 5 on Tuesday, May 12, 2026 ended 126-97 for San Antonio, and the scale of that result mattered because it reset the matchup back toward the Spurs after Minnesota tied the series in the Wembanyama ejection game.',
      "Victor Wembanyama's 27 points, 17 rebounds, 5 assists, and 3 blocks in Game 5 restored the biggest matchup-bending force in the series, but Anthony Edwards still keeps the single-game home eruption path alive for Minnesota."
    ],
    lean:
      'Lean Spurs because the current series shape still belongs to the better interior force and the deeper creator tree, while keeping home-elimination volatility alive because Minnesota has already proven it can flip a game when Edwards gets enough support.',
    swing:
      'Swing factor: whether Minnesota can keep Wembanyama from resetting the paint and second-chance script once the game reaches the leverage possessions.',
    seriesBreakdown: {
      kicker: 'Playoff series to date',
      title: 'Why San Antonio still has to finish a series that keeps shifting shape',
      record: 'Spurs lead 3-2',
      recap:
        "Minnesota stole the opener, San Antonio answered with Games 2 and 3, the Wolves tied the series after Wembanyama's Game 4 ejection, and then the Spurs responded with a 29-point Game 5 win on Tuesday, May 12, 2026. That gives San Antonio the clearer current edge, but it also means tonight is the first true Timberwolves elimination game in a series that has already shown how much one player-driven swing can change the read.",
      seriesStats: [
        'SAS 117.0 PPG | MIN 103.6 PPG through five games',
        'Game 5: Spurs 126, Timberwolves 97 on May 12, 2026',
        'Victor Wembanyama: 27 points, 17 rebounds, 5 assists, 3 blocks in Game 5',
        "Anthony Edwards: still Minnesota's best single-game answer",
        'Game 6 price: SAS -218 | MIN +180'
      ],
      boxScores: [
        {
          label: 'Game 1',
          date: 'May 4, 2026',
          result: 'Timberwolves 104, Spurs 102',
          notes: [
            'Minnesota escaped the opener even though San Antonio won the fast-break points 27-11.',
            'The Wolves got enough frontcourt scoring to survive the late swings.',
            'Wembanyama still flashed the matchup problem with 15 rebounds and 12 blocks in the loss.'
          ],
          leaders: [
            { team: 'Timberwolves leaders', lines: ['Julius Randle: 21 points', 'Anthony Edwards: 18 points', 'Jaden McDaniels: 16 points', 'Terrence Shannon Jr.: 16 points'] },
            { team: 'Spurs leaders', lines: ['Dylan Harper: 18 points', 'Stephon Castle: 17 points', 'Julian Champagnie: 17 points', 'Victor Wembanyama: 11 points, 15 rebounds, 12 blocks'] }
          ]
        },
        {
          label: 'Game 2',
          date: 'May 6, 2026',
          result: 'Spurs 133, Timberwolves 95',
          notes: [
            'San Antonio buried Minnesota with pace, threes, and a 29-5 fast-break edge.',
            'The Wolves committed 22 turnovers and never recovered from the speed deficit.',
            'This was the cleanest proof that the Spurs can win outside of pure Wembanyama shot volume.'
          ],
          leaders: [
            { team: 'Spurs leaders', lines: ['Stephon Castle: 21 points', 'Victor Wembanyama: 19 points, 15 rebounds', "De'Aaron Fox: 16 points"] },
            { team: 'Timberwolves leaders', lines: ['Jaden McDaniels: 12 points', 'Julius Randle: 12 points', 'Anthony Edwards: 12 points', 'Naz Reid: 11 points'] }
          ]
        },
        {
          label: 'Game 3',
          date: 'May 8, 2026',
          result: 'Spurs 115, Timberwolves 108',
          notes: [
            'Wembanyama detonated for 39 points and 15 rebounds, and Minnesota never fully solved the matchup.',
            'The Wolves generated second-chance offense, but San Antonio stayed cleaner in the highest-leverage possessions.',
            "This was the version of the series where the Spurs' best player simply decided the geometry of the game."
          ],
          leaders: [
            { team: 'Spurs leaders', lines: ['Victor Wembanyama: 39 points, 15 rebounds, 5 blocks', "De'Aaron Fox: 17 points", 'Stephon Castle: 13 points, 12 assists'] },
            { team: 'Timberwolves leaders', lines: ['Anthony Edwards: 32 points, 14 rebounds', 'Naz Reid: 18 points', 'Jaden McDaniels: 17 points'] }
          ]
        },
        {
          label: 'Game 4',
          date: 'May 10, 2026',
          result: 'Timberwolves 114, Spurs 109',
          notes: [
            'Wembanyama was ejected for a Flagrant 2 with 8:39 left in the second quarter, which changed the game shape immediately.',
            'Anthony Edwards answered with 36 points while Minnesota got enough frontcourt help to even the series.',
            'San Antonio still got 24 points from Fox and 24 from Dylan Harper, so the Spurs offense stayed live even after the ejection.'
          ],
          leaders: [
            { team: 'Timberwolves leaders', lines: ['Anthony Edwards: 36 points', 'Naz Reid: 15 points', 'Jaden McDaniels: 14 points', 'Julius Randle: 12 points'] },
            { team: 'Spurs leaders', lines: ["De'Aaron Fox: 24 points", 'Dylan Harper: 24 points', 'Stephon Castle: 20 points', 'Victor Wembanyama: 4 points before ejection'] }
          ]
        },
        {
          label: 'Game 5',
          date: 'May 12, 2026',
          result: 'Spurs 126, Timberwolves 97',
          notes: [
            'San Antonio reclaimed the series with a 29-point answer game and completely re-established the paint and interior leverage.',
            'Wembanyama responded to the ejection narrative with 27 points, 17 rebounds, 5 assists, and 3 blocks, which reset him as the biggest force in the matchup.',
            'Minnesota never found enough support behind Edwards to keep the scoreline or game script compressed.'
          ],
          leaders: [
            { team: 'Spurs leaders', lines: ['Victor Wembanyama: 27 points, 17 rebounds, 5 assists, 3 blocks', 'Keldon Johnson: 21 points', "De'Aaron Fox: 18 points", 'Stephon Castle: 17 points'] },
            { team: 'Timberwolves leaders', lines: ['Anthony Edwards: 20 points', 'Jaden McDaniels: 17 points', 'Julius Randle: 17 points', 'Minnesota trailed the matchup pressure most of the night'] }
          ]
        }
      ],
      playerAnalysis: [
        'Victor Wembanyama is still the single most important matchup-bending player in the series, and Game 5 was the clean reminder after the Game 4 ejection noise.',
        'Anthony Edwards keeps Minnesota alive because he is still the likeliest home-side player to detonate for a one-night shot-making answer.',
        "De'Aaron Fox and Stephon Castle matter because the Spurs do not need every good possession to be a Wembanyama touch when their secondary creators are stable.",
        "Naz Reid and Jaden McDaniels remain Minnesota's cleanest support counters whenever the Wolves actually look dangerous in this matchup.",
        "Keldon Johnson's 21-point Game 5 punch mattered because it widened the Spurs' margin for error beyond their star core."
      ],
      sources: [
        { label: 'NBA playoffs schedule', url: 'https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true' },
        { label: 'Game 1 official PDF box score', url: 'https://statsdmz.nba.com/pdfs/20260504/20260504_MINSAS.pdf' },
        { label: 'Game 2 official PDF box score', url: 'https://statsdmz.nba.com/pdfs/20260506/20260506_MINSAS.pdf' },
        { label: 'Game 3 official PDF box score', url: 'https://statsdmz.nba.com/pdfs/20260508/20260508_SASMIN.pdf' },
        { label: 'Game 4 official PDF box score', url: 'https://statsdmz.nba.com/pdfs/20260510/20260510_SASMIN_book.pdf' },
        { label: 'Game 5 official PDF box score', url: 'https://statsdmz.nba.com/pdfs/20260512/20260512_MINSAS_book.pdf' }
      ]
    },
    odds: makeBoardOdds({ spread: 'Spurs -5.5 (-115) / Timberwolves +5.5 (-105)', total: 'o219.5 (-105) / u219.5 (-115)', moneyline: 'Spurs -218 / Timberwolves +180' })
  })
]

const wnbaGames = [
  makeGame({
    id: 'aces-sun-2026-05-15',
    league: 'WNBA',
    start: '4:30 PM PT',
    startMinutes: 990,
    title: 'Aces @ Sun',
    stage: 'Friday WNBA board',
    spotlight: true,
    tags: ['Heavy favorite', 'Talent gap', "A'ja pressure"],
    matchup: [
      { side: 'Away', name: 'Aces', detail: '2-1 | 89.7 PPG | No. 3 offense | Wilson 20.0 PPG' },
      { side: 'Home', name: 'Sun', detail: '0-3 | 75.3 PPG | No. 14 defense | Morrow 16.0 PPG' }
    ],
    summary:
      'This is the cleanest WNBA hierarchy game on the board because Las Vegas owns the stronger top-end star profile and Connecticut has not yet shown the offensive floor to survive many dead possessions.',
    factors: [
      'Current board: Aces -1350 / Sun +800 with Las Vegas laying 14.5 and the total at 171.5.',
      'LineStar has the Aces at 89.7 points per game with the No. 3 offense, while Connecticut is at 75.3 points per game with the No. 15 offense and No. 14 defense.',
      "A'ja Wilson, Chennedy Carter, and Jackie Young give Las Vegas the cleanest scoring tree in the matchup, while Connecticut still needs a much tighter game from Aneesah Morrow and Brittney Griner to stay inside the larger script."
    ],
    lean:
      'Lean Aces because the roster ceiling and team-shape gap are both too large to fade casually, while still respecting the usual big-spread backdoor variance.',
    swing:
      'Swing factor: whether Las Vegas gets enough early separation to avoid giving Connecticut a slow-pace hang-around path.',
    playerAnalysis: [
      "A'ja Wilson remains the cleanest top-end piece in this game at 20.0 points and 6.3 rebounds per game, which is why the Aces keep the heavy-favorite tag.",
      'Chennedy Carter at 19.7 points and Jackie Young at 14.3 points with 6.0 assists mean Las Vegas does not need Wilson to create every scoring run alone.',
      "Connecticut can still push back on the glass through Aneesah Morrow at 16.0 points and 11.0 rebounds plus Brittney Griner's interior scoring.",
      "Hailey Van Lith's playmaking matters for the Sun because if Connecticut cannot keep the ball moving cleanly, the Aces' talent edge shows up quickly."
    ],
    odds: makeBoardOdds({ spread: 'Aces -14.5 (-118) / Sun +14.5 (-102)', total: 'o171.5 (-110) / u171.5 (-110)', moneyline: 'Aces -1350 / Sun +800' })
  }),
  makeGame({
    id: 'mystics-fever-2026-05-15',
    league: 'WNBA',
    start: '4:30 PM PT',
    startMinutes: 990,
    title: 'Mystics @ Fever',
    stage: 'Friday WNBA board',
    spotlight: true,
    tags: ['Scoring edge', 'Clark pressure', 'Live dog defense'],
    matchup: [
      { side: 'Away', name: 'Mystics', detail: '1-1 | 80.5 PPG | No. 5 defense | Citron 21.5 PPG' },
      { side: 'Home', name: 'Fever', detail: '1-1 | 95.5 PPG | No. 2 offense | Clark 22.0 PPG / 8.0 APG' }
    ],
    summary:
      'Indiana has the sharper offensive ceiling at home, but Washington is the more interesting dog on the WNBA board because the Mystics carry the better defense and enough frontcourt scoring to keep the favorite from coasting.',
    factors: [
      'Current board: Mystics +295 / Fever -375 with Indiana laying 8.5 and the total at 169.5.',
      'LineStar has Indiana at 95.5 points per game with the No. 2 offense, while Washington is only at 80.5 points per game but carries the No. 5 defense.',
      'The Fever still own the stronger creator pair through Caitlin Clark and Kelsey Mitchell, but Washington can keep the game alive if Sonia Citron and Shakira Austin make Indiana work on every half-court trip.'
    ],
    lean:
      "Lean Fever because the Clark-Mitchell shot-creation engine is still the cleanest offensive answer on the floor, while keeping the volatility high enough to respect Washington's defense and live-dog path.",
    swing:
      'Swing factor: whether Indiana can keep its offensive pace without handing Washington the kind of defensive game script that compresses the final five minutes.',
    playerAnalysis: [
      'Caitlin Clark at 22.0 points and 8.0 assists is still the best game-organizing force in the matchup, especially once Indiana gets downhill in transition.',
      "Kelsey Mitchell's 26.5 points per game gives the Fever the fastest scoring punch, which is why Indiana still deserves the favorite role.",
      'Washington stays live because Sonia Citron is already at 21.5 points per game and Shakira Austin is giving the Mystics 17.0 points with 10.5 rebounds.',
      "Aliyah Boston and Monique Billings matter for Indiana because the Fever do not want Washington's frontcourt to turn this into a half-court wrestling match."
    ],
    odds: makeBoardOdds({ spread: 'Mystics +8.5 (-110) / Fever -8.5 (-110)', total: 'o169.5 (-115) / u169.5 (-105)', moneyline: 'Mystics +295 / Fever -375' })
  }),
  makeGame({
    id: 'tempo-sparks-2026-05-15',
    league: 'WNBA',
    start: '7:00 PM PT',
    startMinutes: 1140,
    title: 'Tempo @ Sparks',
    stage: 'Friday WNBA board',
    spotlight: false,
    tags: ['Short-to-medium favorite', 'Defense vs scoring', 'Late-game variance'],
    matchup: [
      { side: 'Away', name: 'Tempo', detail: '1-1 | 75.5 PPG | No. 1 defense | Mabrey 26.5 PPG' },
      { side: 'Home', name: 'Sparks', detail: '0-2 | 78.0 PPG | No. 13 defense | Plum 26.0 PPG' }
    ],
    summary:
      'Los Angeles is still getting the stronger market vote, but this is a genuine variance game because the Sparks bring the cleaner scoring ceiling while Toronto is already the better defensive team through two games.',
    factors: [
      'Current board: Tempo +270 / Sparks -340 with Los Angeles laying 7.5 and the total at 170.5.',
      'LineStar has Toronto as the No. 1 defense at 70.5 points allowed per game, while Los Angeles is allowing 96.0 with the No. 13 defense.',
      'The Sparks still have the best single-game perimeter scorer in Kelsey Plum, but Toronto can absolutely keep the game inside the number if Marina Mabrey and Brittney Sykes control the shot quality.'
    ],
    lean:
      'Lean Sparks only because the market and shot-creation tier still shade their way, but keep this one in the higher-variance bucket because Toronto already owns the cleaner defensive profile.',
    swing:
      'Swing factor: whether Los Angeles can create enough clean offense to outrun a Toronto defense that has already proven it can flatten a game.',
    playerAnalysis: [
      'Kelsey Plum at 26.0 points per game is still the cleanest single-game scorer here, which is the main reason Los Angeles keeps favorite status.',
      'Nneka Ogwumike and Dearica Hamby give the Sparks more veteran scoring stability than their 0-2 record suggests.',
      "Marina Mabrey's 26.5 points per game plus Brittney Sykes' two-way workload are the reasons Toronto stays very live despite the expansion-team label.",
      'This matchup may come down to whether Cameron Brink and the Sparks front line can keep Toronto from turning it into a lower-possession defensive grind.'
    ],
    odds: makeBoardOdds({ spread: 'Tempo +7.5 (-110) / Sparks -7.5 (-110)', total: 'o170.5 (-105) / u170.5 (-115)', moneyline: 'Tempo +270 / Sparks -340' })
  }),
  makeGame({
    id: 'sky-mercury-2026-05-15',
    league: 'WNBA',
    start: '7:00 PM PT',
    startMinutes: 1140,
    title: 'Sky @ Mercury',
    stage: 'Friday WNBA board',
    spotlight: false,
    tags: ['Short number', 'Defense test', 'Live dog'],
    matchup: [
      { side: 'Away', name: 'Sky', detail: '2-0 | 83.5 PPG | No. 2 defense | Rickea 18.5 PPG' },
      { side: 'Home', name: 'Mercury', detail: '1-2 | 87.3 PPG | No. 7 offense | Copper 18.0 PPG' }
    ],
    summary:
      'Phoenix has the slightly cleaner home scoring profile, but Chicago is one of the more interesting live dogs on the board because the Sky have opened 2-0 with a much better defensive baseline.',
    factors: [
      'Current board: Sky +150 / Mercury -180 with Phoenix laying 3.5 and the total at 166.5.',
      'LineStar has Chicago allowing only 73.0 points per game with the No. 2 defense, while Phoenix is scoring 87.3 per game but still defending closer to league average.',
      'The Mercury still own the more proven veteran star mix through Kahleah Copper and Alyssa Thomas, but Chicago has enough current defensive structure to make the favorite work.'
    ],
    lean:
      'Lean Mercury because the home floor and veteran creation tree still make Phoenix the cleaner late-game side, while treating Chicago as one of the better live underdogs on the WNBA board.',
    swing:
      'Swing factor: whether Phoenix can keep Chicago from dragging the game into a slower defensive finish where each extra stop raises the dog path.',
    playerAnalysis: [
      "Kahleah Copper remains Phoenix's clearest scoring trigger at 18.0 points per game, and Alyssa Thomas is still the matchup organizer with 16.3 points and 9.3 assists.",
      'DeWanna Bonner and Natasha Mack matter because Phoenix needs more than one creator if Chicago keeps the pace under control.',
      "Rickea Jackson at 18.5 points and Kamilla Cardoso's interior presence give Chicago a much sturdier current profile than a normal short road dog.",
      'Skylar Diggins and Jacy Sheldon both help Chicago stay attached in the backcourt, which is why this number should be treated more cautiously than a casual favorite board.'
    ],
    odds: makeBoardOdds({ spread: 'Sky +3.5 (-102) / Mercury -3.5 (-118)', total: 'o166.5 (-110) / u166.5 (-110)', moneyline: 'Sky +150 / Mercury -180' })
  })
]

const mlbGames = rawGames.map((game) => makeGame(buildMlbGame(enrichRawGame(game))))
const modeledGames = [...mlbGames, ...basketballGames, ...wnbaGames]

export const games = modeledGames.sort((left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title))

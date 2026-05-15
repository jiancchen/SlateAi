import { createSportsMatchModel } from "./sports-model.js"
import { parkContextByHomeTeam } from "./day-2026-05-13-mlb-data.js"

export const slateMeta = {
  title: "Thursday Trading Board",
  date: "May 14, 2026",
  isoDate: "2026-05-14",
  timeZone: "America/Los_Angeles",
  subtitle:
    "A live May 14 board with 11 MLB games and 2 WNBA games, rebuilt from current official starters, live market boards, updated standings, bullpen form, Baseball Savant team contact quality, and WNBA roster plus defense context.",
  notes: [
    "The May 13 board finished 10-8 overall, including 7-6 on MLB, 3-1 on WNBA, and 0-1 on NBA.",
    "The biggest MLB misses clustered around shallow or unstable starter samples and teams whose underlying contact quality was stronger than their surface standings or streak context suggested.",
    "May 14 adds pitcher archetypes, projected hit edge, and hit-efficiency estimates to the MLB model so favorites are not treated as clean if the underdog can still win the traffic battle.",
    "There is no NBA playoff game on Thursday, May 14, 2026 on the official schedule, so today is an MLB plus WNBA board.",
    "The first two MLB games were already in warmup on the 9:30 AM PT refresh, so they are still on the board but effectively near lock.",
    "WNBA game notes now use official team roster production plus the LineStar defense board so the cards can talk about real scorers, playmakers, and team defense shape instead of only the betting number."
  ]
}

export const filters = ["All", "MLB", "WNBA"]

export const oddsMeta = {
  provider: "Mixed official league data + live board snapshots",
  snapshot: "May 14, 2026, 9:30 AM PT MLB / 8:20 AM PT WNBA",
  note:
    "MLB prices are wired to the live ScoresAndOdds board, while the MLB model now layers official probable pitchers, current standings, TeamRankings hit production, Covers bullpen stats, Statcast park factors, and Baseball Savant team contact quality. WNBA pricing and team-shape context were refreshed from the May 14 LineStar board and official WNBA roster pages."
}

export const sources = [
  { label: "MLB probable pitchers", url: "https://www.mlb.com/probable-pitchers" },
  {
    label: "MLB schedule API for May 14, 2026",
    url: "https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-14&hydrate=probablePitcher,team"
  },
  {
    label: "MLB standings API for 2026 regular season",
    url: "https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason"
  },
  { label: "TeamRankings MLB hits per game", url: "https://www.teamrankings.com/mlb/stat/hits-per-game" },
  {
    label: "Covers MLB bullpen ERA",
    url: "https://www.covers.com/sport/baseball/mlb/statistics/team-bullpenera/2026"
  },
  {
    label: "Statcast park factors",
    url: "https://baseballsavant.mlb.com/leaderboard/statcast-park-factors"
  },
  {
    label: "Baseball Savant league hitting",
    url: "https://baseballsavant.mlb.com/league"
  },
  { label: "ScoresAndOdds MLB board", url: "https://www.scoresandodds.com/mlb" },
  { label: "ScoresAndOdds WNBA board", url: "https://www.scoresandodds.com/wnba" },
  { label: "WNBA home page", url: "https://www.wnba.com/" },
  { label: "RotoWire WNBA opponent averages", url: "https://www.rotowire.com/wnba/opp-avg.php" },
  {
    label: "LineStar WNBA fantasy defense",
    url: "https://www.linestarapp.com/FantasyDefense/Sport/WNBA/Site/DraftKings"
  }
]

const market = (label, book, value) => ({ label, book, value })

const makeBoardOdds = ({ spread = "", total = "", moneyline = "", provider = "ScoresAndOdds board" }) => ({
  participantOrder: [0, 1],
  markets: [
    ...(spread ? [market("Spread", provider, spread)] : []),
    ...(total ? [market("Total", provider, total)] : []),
    ...(moneyline ? [market("Moneyline", provider, moneyline)] : [])
  ],
  note:
    "Current board snapshot from ScoresAndOdds on the May 14 morning refresh. This price layer is meant to sit beside the model read, not replace it.",
  provider
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const parseEra = (value) => (value === "-.--" ? null : Number(value))

const parseAmericanPair = (value = "") => [...value.matchAll(/[+-]\d+/g)].map((match) => Number(match[0]))

const impliedProbabilityFromAmerican = (americanOdds) =>
  americanOdds > 0
    ? 100 / (americanOdds + 100)
    : Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)

const parseWinningPercentage = (value = "") => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0.5
}

const parseGamesBack = (value = "") => {
  if (!value || value === "-" || value === "E") return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const parseStreakCode = (value = "") => {
  const match = value.match(/^([WL])(\d+)$/i)
  if (!match) return 0
  return match[1].toUpperCase() === "W" ? Number(match[2]) : -Number(match[2])
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

const pitcherDetail = (pitcher) =>
  `${pitcher.fullName} (${pitcher.pitchHand}HP) | ${pitcher.wins}-${pitcher.losses} | ${pitcher.era} ERA | ${pitcher.strikeOuts} SO | ${pitcher.whip.toFixed(2)} WHIP | ${pitcher.inningsPitched} IP`

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

const buildStandingsLabel = (team = {}) => {
  const rankLabel = team.divisionLeader ? "division leader" : `${formatOrdinal(team.divisionRank)} in division`
  const runDiff = Number(team.runDifferential) || 0
  return `${team.wins}-${team.losses}, ${rankLabel}, ${runDiff >= 0 ? "+" : ""}${runDiff} RD`
}

const buildOffenseScore = (profile = {}, role = "") => {
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
  if (startMinutes < 630) return "Thursday first pitch"
  if (startMinutes < 720) return "Thursday matinee"
  if (startMinutes < 900) return "Thursday day window"
  if (startMinutes < 1080) return "Thursday prime window"
  return "Thursday nightcap"
}

const buildTags = (raw, favoriteIndex, starterIndex, savantIndex, bullpenIndex) => {
  const [awayOdds, homeOdds] = parseAmericanPair(raw.moneyline)
  const tags = []
  const favoriteTeam = favoriteIndex === 0 ? raw.away : raw.home

  if (Math.abs(Math.abs(awayOdds) - Math.abs(homeOdds)) <= 18) tags.push("Tradable number")
  else tags.push(`${favoriteTeam} price edge`)

  if (starterIndex !== null) tags.push(`Starter edge ${starterIndex === 0 ? raw.away : raw.home}`)
  if (savantIndex !== null) tags.push(`Contact edge ${savantIndex === 0 ? raw.away : raw.home}`)
  if (bullpenIndex !== null) tags.push(`Bullpen edge ${bullpenIndex === 0 ? raw.away : raw.home}`)

  if ((raw.parkContext?.indexRuns || 100) >= 106) tags.push("Run-boosting park")
  if ((raw.parkContext?.indexRuns || 100) <= 94) tags.push("Run-suppressing park")

  return [...new Set(tags)].slice(0, 3)
}

const buildSummary = (raw, modelIndex, starterIndex, savantIndex) => {
  const modelTeam = modelIndex === 0 ? raw.away : raw.home
  const starterTeam = starterIndex === 0 ? raw.away : raw.home
  const contactTeam = savantIndex === 0 ? raw.away : raw.home

  if (modelTeam === starterTeam && modelTeam === contactTeam) {
    return `${modelTeam} own the cleaner full-game case on the morning board, with the market, starter look, and contact profile mostly lining up in the same direction.`
  }

  return `${raw.away} vs ${raw.home} is more about full-game chain quality than a single surface stat, because the market, starter layer, and contact-quality layer are not perfectly pulling in one direction.`
}

const buildFactors = (raw, starterIndex, contactIndex, bullpenIndex) => {
  const starterTeam = starterIndex === 0 ? raw.away : raw.home
  const starterPitcher = starterIndex === 0 ? raw.awayPitcher : raw.homePitcher
  const awayOffense = raw.offenseContext.away
  const homeOffense = raw.offenseContext.home
  const awayBullpen = raw.bullpenContext.away
  const homeBullpen = raw.bullpenContext.home
  const awaySavant = raw.savantContext.away
  const homeSavant = raw.savantContext.home

  return [
    `Current board: ${raw.moneyline} | ${raw.total} | ${raw.spread}.`,
    `${starterPitcher.fullName} carries the cleaner starter line for ${starterTeam}, with ${starterPitcher.era} ERA, ${starterPitcher.whip.toFixed(2)} WHIP, and ${starterPitcher.strikeOuts} strikeouts.`,
    `${raw.away} enter ${buildStandingsLabel(raw.teamContext.away)}; ${raw.home} enter ${buildStandingsLabel(raw.teamContext.home)}.`,
    `${raw.away} offense: ${awayOffense.hitsPerGame.toFixed(2)} H/G, last 3 ${awayOffense.last3HitsPerGame.toFixed(2)}, away ${awayOffense.awayHitsPerGame.toFixed(2)}; ${raw.home} offense: ${homeOffense.hitsPerGame.toFixed(2)} H/G, last 3 ${homeOffense.last3HitsPerGame.toFixed(2)}, home ${homeOffense.homeHitsPerGame.toFixed(2)}.`,
    `${raw.away} bullpen: ${awayBullpen.era.toFixed(2)} ERA and ${awayBullpen.whip.toFixed(2)} WHIP; ${raw.home} bullpen: ${homeBullpen.era.toFixed(2)} ERA and ${homeBullpen.whip.toFixed(2)} WHIP. Statcast contact edge: ${contactIndex === 0 ? raw.away : raw.home} with ${contactIndex === 0 ? awaySavant.xba.toFixed(3) : homeSavant.xba.toFixed(3)} xBA and ${contactIndex === 0 ? awaySavant.hardHitPct.toFixed(1) : homeSavant.hardHitPct.toFixed(1)}% hard-hit.`
  ]
}

const buildSwingFactor = (raw, favoriteIndex, bullpenIndex) => {
  const favoriteTeam = favoriteIndex === 0 ? raw.away : raw.home
  const bullpenTeam = bullpenIndex === 0 ? raw.away : raw.home
  return `Swing factor: whether ${bullpenTeam} can own the late innings enough to undo whatever edge ${favoriteTeam} creates through the first two trips in the order.`
}

const buildLean = (raw, modelIndex) =>
  `Lean ${modelIndex === 0 ? raw.away : raw.home} if the cleaner starter-to-bullpen chain and contact-quality edge hold once the game stretches beyond the first look at each lineup.`

const shouldSpotlight = (raw, favoriteIndex, savantIndex) => {
  const [awayOdds, homeOdds] = parseAmericanPair(raw.moneyline)
  const favoredOdds = favoriteIndex === 0 ? awayOdds : homeOdds
  return (
    favoredOdds <= -160 ||
    raw.awayPitcher.strikeOuts >= 50 ||
    raw.homePitcher.strikeOuts >= 50 ||
    Math.abs(buildSavantScore(raw.savantContext.away) - buildSavantScore(raw.savantContext.home)) >= 9 ||
    (raw.parkContext?.indexRuns || 100) >= 108
  )
}

const standingsContextByTeam = {
  "Red Sox": { divisionLeader: false, divisionRank: "5", gamesBack: "10.0", losses: 24, runDifferential: -11, streakCode: "W1", winningPercentage: ".429", wins: 18 },
  "White Sox": { divisionLeader: false, divisionRank: "2", gamesBack: "1.5", losses: 21, runDifferential: -12, streakCode: "W4", winningPercentage: ".500", wins: 21 },
  "Twins": { divisionLeader: false, divisionRank: "3", gamesBack: "4.0", losses: 24, runDifferential: -13, streakCode: "L1", winningPercentage: ".442", wins: 19 },
  "Royals": { divisionLeader: false, divisionRank: "4", gamesBack: "4.0", losses: 24, runDifferential: -16, streakCode: "L3", winningPercentage: ".442", wins: 19 },
  "Tigers": { divisionLeader: false, divisionRank: "5", gamesBack: "4.0", losses: 24, runDifferential: -5, streakCode: "L2", winningPercentage: ".442", wins: 19 },
  "Athletics": { divisionLeader: true, divisionRank: "1", gamesBack: "-", losses: 20, runDifferential: -4, streakCode: "W1", winningPercentage: ".524", wins: 22 },
  "Mariners": { divisionLeader: false, divisionRank: "3", gamesBack: "2.0", losses: 23, runDifferential: 11, streakCode: "L1", winningPercentage: ".477", wins: 21 },
  "Astros": { divisionLeader: false, divisionRank: "4", gamesBack: "6.0", losses: 27, runDifferential: -43, streakCode: "W1", winningPercentage: ".386", wins: 17 },
  "Braves": { divisionLeader: true, divisionRank: "1", gamesBack: "-", losses: 13, runDifferential: 93, streakCode: "W4", winningPercentage: ".698", wins: 30 },
  "Nationals": { divisionLeader: false, divisionRank: "2", gamesBack: "9.0", losses: 22, runDifferential: -6, streakCode: "W2", winningPercentage: ".488", wins: 21 },
  "Phillies": { divisionLeader: false, divisionRank: "3", gamesBack: "10.0", losses: 23, runDifferential: -33, streakCode: "L1", winningPercentage: ".465", wins: 20 },
  "Marlins": { divisionLeader: false, divisionRank: "4", gamesBack: "10.0", losses: 23, runDifferential: -2, streakCode: "W1", winningPercentage: ".465", wins: 20 },
  "Mets": { divisionLeader: false, divisionRank: "5", gamesBack: "12.5", losses: 25, runDifferential: -22, streakCode: "W2", winningPercentage: ".405", wins: 17 },
  "Cubs": { divisionLeader: true, divisionRank: "1", gamesBack: "-", losses: 16, runDifferential: 41, streakCode: "L4", winningPercentage: ".628", wins: 27 },
  "Brewers": { divisionLeader: false, divisionRank: "2", gamesBack: "2.5", losses: 17, runDifferential: 54, streakCode: "L1", winningPercentage: ".575", wins: 23 },
  "Cardinals": { divisionLeader: false, divisionRank: "3", gamesBack: "2.5", losses: 18, runDifferential: 1, streakCode: "L1", winningPercentage: ".571", wins: 24 },
  "Pirates": { divisionLeader: false, divisionRank: "4", gamesBack: "4.0", losses: 20, runDifferential: 27, streakCode: "L1", winningPercentage: ".535", wins: 23 },
  "Reds": { divisionLeader: false, divisionRank: "5", gamesBack: "5.0", losses: 21, runDifferential: -40, streakCode: "L2", winningPercentage: ".512", wins: 22 },
  "Padres": { divisionLeader: true, divisionRank: "1", gamesBack: "-", losses: 17, runDifferential: 3, streakCode: "W1", winningPercentage: ".595", wins: 25 },
  "Dodgers": { divisionLeader: false, divisionRank: "2", gamesBack: "0.5", losses: 18, runDifferential: 63, streakCode: "W1", winningPercentage: ".581", wins: 25 },
  "Giants": { divisionLeader: false, divisionRank: "4", gamesBack: "7.5", losses: 25, runDifferential: -42, streakCode: "L1", winningPercentage: ".419", wins: 18 },
  "Rockies": { divisionLeader: false, divisionRank: "5", gamesBack: "8.5", losses: 26, runDifferential: -31, streakCode: "W1", winningPercentage: ".395", wins: 17 }
}

const teamOffenseContextByTeam = {
  "Braves": { hitsPerGame: 9.34884, last3HitsPerGame: 9.33333, last1Hits: 8, homeHitsPerGame: 9.45, awayHitsPerGame: 9.26087 },
  "Dodgers": { hitsPerGame: 8.83721, last3HitsPerGame: 7.66667, last1Hits: 9, homeHitsPerGame: 7.58333, awayHitsPerGame: 10.4211 },
  "Astros": { hitsPerGame: 8.75, last3HitsPerGame: 8.66667, last1Hits: 12, homeHitsPerGame: 7.72727, awayHitsPerGame: 9.77273 },
  "Pirates": { hitsPerGame: 8.60465, last3HitsPerGame: 7.33333, last1Hits: 6, homeHitsPerGame: 9.59091, awayHitsPerGame: 7.57143 },
  "Athletics": { hitsPerGame: 8.54762, last3HitsPerGame: 7.66667, last1Hits: 13, homeHitsPerGame: 9.16667, awayHitsPerGame: 8.08333 },
  "Rockies": { hitsPerGame: 8.46512, last3HitsPerGame: 7, last1Hits: 11, homeHitsPerGame: 8.68421, awayHitsPerGame: 8.29167 },
  "Nationals": { hitsPerGame: 8.4186, last3HitsPerGame: 9.66667, last1Hits: 10, homeHitsPerGame: 8, awayHitsPerGame: 8.75 },
  "Cubs": { hitsPerGame: 8.30233, last3HitsPerGame: 2.66667, last1Hits: 4, homeHitsPerGame: 8.82609, awayHitsPerGame: 7.7 },
  "Giants": { hitsPerGame: 8.25581, last3HitsPerGame: 9.33333, last1Hits: 6, homeHitsPerGame: 7.63636, awayHitsPerGame: 8.90476 },
  "Brewers": { hitsPerGame: 8.15, last3HitsPerGame: 8.66667, last1Hits: 9, homeHitsPerGame: 8.04348, awayHitsPerGame: 8.29412 },
  "Marlins": { hitsPerGame: 8.09302, last3HitsPerGame: 6.33333, last1Hits: 11, homeHitsPerGame: 8.38461, awayHitsPerGame: 7.64706 },
  "Tigers": { hitsPerGame: 8.06977, last3HitsPerGame: 9, last1Hits: 8, homeHitsPerGame: 8.05556, awayHitsPerGame: 8.08 },
  "Cardinals": { hitsPerGame: 8.04762, last3HitsPerGame: 8.66667, last1Hits: 13, homeHitsPerGame: 8.1, awayHitsPerGame: 8 },
  "Royals": { hitsPerGame: 7.93023, last3HitsPerGame: 8, last1Hits: 5, homeHitsPerGame: 8.69565, awayHitsPerGame: 7.05 },
  "Phillies": { hitsPerGame: 7.88372, last3HitsPerGame: 6, last1Hits: 3, homeHitsPerGame: 8.58333, awayHitsPerGame: 7 },
  "Twins": { hitsPerGame: 7.86047, last3HitsPerGame: 8.33333, last1Hits: 8, homeHitsPerGame: 8.13636, awayHitsPerGame: 7.57143 },
  "Red Sox": { hitsPerGame: 7.85714, last3HitsPerGame: 7.66667, last1Hits: 8, homeHitsPerGame: 7.09524, awayHitsPerGame: 8.61905 },
  "White Sox": { hitsPerGame: 7.64286, last3HitsPerGame: 7.33333, last1Hits: 10, homeHitsPerGame: 7.4, awayHitsPerGame: 7.86364 },
  "Mariners": { hitsPerGame: 7.61364, last3HitsPerGame: 8.66667, last1Hits: 8, homeHitsPerGame: 7.78261, awayHitsPerGame: 7.42857 },
  "Mets": { hitsPerGame: 7.5, last3HitsPerGame: 8, last1Hits: 7, homeHitsPerGame: 7.65, awayHitsPerGame: 7.36364 },
  "Reds": { hitsPerGame: 7.32558, last3HitsPerGame: 8.66667, last1Hits: 7, homeHitsPerGame: 6.95652, awayHitsPerGame: 7.75 },
  "Padres": { hitsPerGame: 7.28571, last3HitsPerGame: 6, last1Hits: 6, homeHitsPerGame: 7.04348, awayHitsPerGame: 7.57895 }
}

const teamBullpenContextByTeam = {
  "Astros": { era: 5.91, saves: 8, hits: 187, earnedRuns: 122, whip: 1.61, homeRuns: 34, walks: 110, strikeouts: 179 },
  "Twins": { era: 5.39, saves: 8, hits: 164, earnedRuns: 93, whip: 1.58, homeRuns: 15, walks: 77, strikeouts: 128 },
  "Royals": { era: 4.71, saves: 13, hits: 127, earnedRuns: 76, whip: 1.45, homeRuns: 20, walks: 80, strikeouts: 141 },
  "Reds": { era: 4.64, saves: 11, hits: 152, earnedRuns: 87, whip: 1.54, homeRuns: 23, walks: 104, strikeouts: 168 },
  "Athletics": { era: 4.63, saves: 12, hits: 148, earnedRuns: 81, whip: 1.44, homeRuns: 18, walks: 73, strikeouts: 150 },
  "Nationals": { era: 4.63, saves: 11, hits: 191, earnedRuns: 103, whip: 1.42, homeRuns: 28, walks: 86, strikeouts: 153 },
  "Cardinals": { era: 4.62, saves: 15, hits: 142, earnedRuns: 80, whip: 1.41, homeRuns: 16, walks: 75, strikeouts: 136 },
  "White Sox": { era: 4.53, saves: 14, hits: 171, earnedRuns: 94, whip: 1.44, homeRuns: 21, walks: 91, strikeouts: 171 },
  "Rockies": { era: 4.37, saves: 11, hits: 184, earnedRuns: 94, whip: 1.34, homeRuns: 25, walks: 65, strikeouts: 188 },
  "Pirates": { era: 4.14, saves: 8, hits: 147, earnedRuns: 76, whip: 1.37, homeRuns: 15, walks: 70, strikeouts: 166 },
  "Phillies": { era: 3.96, saves: 9, hits: 157, earnedRuns: 71, whip: 1.33, homeRuns: 14, walks: 54, strikeouts: 172 },
  "Tigers": { era: 3.89, saves: 9, hits: 151, earnedRuns: 71, whip: 1.39, homeRuns: 15, walks: 76, strikeouts: 164 },
  "Cubs": { era: 3.87, saves: 9, hits: 131, earnedRuns: 66, whip: 1.26, homeRuns: 21, walks: 61, strikeouts: 136 },
  "Dodgers": { era: 3.61, saves: 9, hits: 111, earnedRuns: 53, whip: 1.22, homeRuns: 8, walks: 45, strikeouts: 138 },
  "Padres": { era: 3.6, saves: 15, hits: 147, earnedRuns: 69, whip: 1.2, homeRuns: 13, walks: 57, strikeouts: 179 },
  "Brewers": { era: 3.53, saves: 12, hits: 147, earnedRuns: 64, whip: 1.33, homeRuns: 12, walks: 66, strikeouts: 171 },
  "Mets": { era: 3.53, saves: 6, hits: 155, earnedRuns: 67, whip: 1.27, homeRuns: 17, walks: 58, strikeouts: 182 },
  "Giants": { era: 3.47, saves: 8, hits: 122, earnedRuns: 56, whip: 1.37, homeRuns: 11, walks: 71, strikeouts: 121 },
  "Marlins": { era: 3.31, saves: 12, hits: 100, earnedRuns: 55, whip: 1.19, homeRuns: 9, walks: 74, strikeouts: 157 },
  "Red Sox": { era: 3.22, saves: 9, hits: 136, earnedRuns: 59, whip: 1.21, homeRuns: 19, walks: 61, strikeouts: 155 },
  "Mariners": { era: 3.15, saves: 12, hits: 135, earnedRuns: 49, whip: 1.33, homeRuns: 11, walks: 46, strikeouts: 141 },
  "Braves": { era: 3.1, saves: 15, hits: 115, earnedRuns: 52, whip: 1.1, homeRuns: 14, walks: 49, strikeouts: 154 }
}

const teamSavantContextByTeam = {
  "Padres": { pa: 1541, ab: 1377, hits: 306, ba: 0.222, obp: 0.295, slg: 0.367, woba: 0.297, barrels: 89, barrelPct: 8.6, hardHitPct: 42.9, exitVelocity: 89.2, launchAngle: 9.9, xba: 0.243, xslg: 0.398, xwoba: 0.316 },
  "Brewers": { pa: 1552, ab: 1341, hits: 326, ba: 0.243, obp: 0.334, slg: 0.356, woba: 0.313, barrels: 68, barrelPct: 6.5, hardHitPct: 37.3, exitVelocity: 88.3, launchAngle: 8.6, xba: 0.235, xslg: 0.37, xwoba: 0.312 },
  "Mets": { pa: 1556, ab: 1402, hits: 315, ba: 0.225, obp: 0.29, slg: 0.34, woba: 0.284, barrels: 91, barrelPct: 8.4, hardHitPct: 41.4, exitVelocity: 89.7, launchAngle: 12.3, xba: 0.244, xslg: 0.4, xwoba: 0.311 },
  "Red Sox": { pa: 1573, ab: 1400, hits: 330, ba: 0.236, obp: 0.313, slg: 0.354, woba: 0.303, barrels: 78, barrelPct: 7.5, hardHitPct: 40.8, exitVelocity: 88.9, launchAngle: 11.5, xba: 0.24, xslg: 0.378, xwoba: 0.311 },
  "Giants": { pa: 1574, ab: 1460, hits: 355, ba: 0.243, obp: 0.29, slg: 0.366, woba: 0.292, barrels: 72, barrelPct: 6.4, hardHitPct: 36.7, exitVelocity: 88.5, launchAngle: 13.5, xba: 0.247, xslg: 0.374, xwoba: 0.293 },
  "White Sox": { pa: 1602, ab: 1380, hits: 321, ba: 0.233, obp: 0.323, slg: 0.396, woba: 0.322, barrels: 103, barrelPct: 10.2, hardHitPct: 41.3, exitVelocity: 89.2, launchAngle: 13.9, xba: 0.243, xslg: 0.422, xwoba: 0.332 },
  "Marlins": { pa: 1609, ab: 1420, hits: 348, ba: 0.245, obp: 0.324, slg: 0.375, woba: 0.315, barrels: 71, barrelPct: 6.5, hardHitPct: 39.8, exitVelocity: 88.6, launchAngle: 12.8, xba: 0.237, xslg: 0.366, xwoba: 0.306 },
  "Royals": { pa: 1612, ab: 1417, hits: 341, ba: 0.241, obp: 0.319, slg: 0.392, woba: 0.318, barrels: 103, barrelPct: 9.5, hardHitPct: 42.4, exitVelocity: 89.7, launchAngle: 15.8, xba: 0.243, xslg: 0.394, xwoba: 0.319 },
  "Cardinals": { pa: 1616, ab: 1412, hits: 338, ba: 0.239, obp: 0.321, slg: 0.387, woba: 0.317, barrels: 88, barrelPct: 8.1, hardHitPct: 39.7, exitVelocity: 89.1, launchAngle: 13.3, xba: 0.243, xslg: 0.411, xwoba: 0.324 },
  "Phillies": { pa: 1617, ab: 1459, hits: 339, ba: 0.232, obp: 0.299, slg: 0.39, woba: 0.307, barrels: 82, barrelPct: 7.3, hardHitPct: 40.9, exitVelocity: 89.6, launchAngle: 12.7, xba: 0.248, xslg: 0.401, xwoba: 0.315 },
  "Athletics": { pa: 1618, ab: 1430, hits: 359, ba: 0.251, obp: 0.327, slg: 0.404, woba: 0.326, barrels: 96, barrelPct: 8.9, hardHitPct: 41.4, exitVelocity: 89.3, launchAngle: 12.9, xba: 0.252, xslg: 0.411, xwoba: 0.325 },
  "Rockies": { pa: 1624, ab: 1460, hits: 364, ba: 0.249, obp: 0.317, slg: 0.401, woba: 0.321, barrels: 72, barrelPct: 6.9, hardHitPct: 37.8, exitVelocity: 88.1, launchAngle: 14.4, xba: 0.24, xslg: 0.387, xwoba: 0.308 },
  "Tigers": { pa: 1625, ab: 1433, hits: 347, ba: 0.242, obp: 0.325, slg: 0.388, woba: 0.321, barrels: 104, barrelPct: 9.7, hardHitPct: 39.8, exitVelocity: 88.7, launchAngle: 15.4, xba: 0.253, xslg: 0.431, xwoba: 0.336 },
  "Reds": { pa: 1628, ab: 1433, hits: 315, ba: 0.22, obp: 0.306, slg: 0.379, woba: 0.309, barrels: 117, barrelPct: 11.6, hardHitPct: 38.5, exitVelocity: 89.9, launchAngle: 17.5, xba: 0.244, xslg: 0.43, xwoba: 0.335 },
  "Braves": { pa: 1638, ab: 1478, hits: 402, ba: 0.272, obp: 0.334, slg: 0.453, woba: 0.347, barrels: 118, barrelPct: 10.2, hardHitPct: 41.4, exitVelocity: 89.8, launchAngle: 14.3, xba: 0.263, xslg: 0.458, xwoba: 0.342 },
  "Dodgers": { pa: 1645, ab: 1444, hits: 380, ba: 0.263, obp: 0.342, slg: 0.433, woba: 0.344, barrels: 112, barrelPct: 10, hardHitPct: 42, exitVelocity: 90, launchAngle: 14.1, xba: 0.267, xslg: 0.452, xwoba: 0.35 },
  "Twins": { pa: 1650, ab: 1439, hits: 338, ba: 0.235, obp: 0.323, slg: 0.385, woba: 0.319, barrels: 104, barrelPct: 9.7, hardHitPct: 37.1, exitVelocity: 88.2, launchAngle: 15.1, xba: 0.23, xslg: 0.386, xwoba: 0.316 },
  "Mariners": { pa: 1667, ab: 1454, hits: 335, ba: 0.23, obp: 0.32, slg: 0.38, woba: 0.317, barrels: 94, barrelPct: 8.8, hardHitPct: 39.1, exitVelocity: 89, launchAngle: 14.9, xba: 0.241, xslg: 0.41, xwoba: 0.329 },
  "Nationals": { pa: 1675, ab: 1478, hits: 362, ba: 0.245, obp: 0.325, slg: 0.413, woba: 0.329, barrels: 99, barrelPct: 8.9, hardHitPct: 39.2, exitVelocity: 89, launchAngle: 11.6, xba: 0.253, xslg: 0.419, xwoba: 0.331 },
  "Cubs": { pa: 1689, ab: 1452, hits: 357, ba: 0.246, obp: 0.342, slg: 0.406, woba: 0.335, barrels: 94, barrelPct: 8.4, hardHitPct: 40.4, exitVelocity: 89, launchAngle: 14.5, xba: 0.246, xslg: 0.411, xwoba: 0.333 },
  "Astros": { pa: 1690, ab: 1498, hits: 385, ba: 0.257, obp: 0.332, slg: 0.421, woba: 0.334, barrels: 101, barrelPct: 8.7, hardHitPct: 37.6, exitVelocity: 88.9, launchAngle: 13.5, xba: 0.258, xslg: 0.426, xwoba: 0.332 },
  "Pirates": { pa: 1703, ab: 1490, hits: 370, ba: 0.248, obp: 0.336, slg: 0.389, woba: 0.326, barrels: 84, barrelPct: 7.6, hardHitPct: 40.4, exitVelocity: 89, launchAngle: 11.3, xba: 0.248, xslg: 0.404, xwoba: 0.328 }
}

const makePitcher = (
  fullName,
  pitchHand,
  wins,
  losses,
  era,
  strikeOuts,
  inningsPitched,
  hitsAllowed,
  walks,
  homeRunsAllowed,
  whip,
  gamesStarted
) => ({
  fullName,
  pitchHand,
  wins,
  losses,
  era,
  strikeOuts,
  inningsPitched,
  hitsAllowed,
  walks,
  homeRunsAllowed,
  whip,
  gamesStarted
})

const rawGames = [
  {
    id: "rockies-pirates",
    away: "Rockies",
    home: "Pirates",
    start: "9:35 AM PT",
    startMinutes: 575,
    awayPitcher: makePitcher("Chase Dollander", "R", 3, 2, "3.35", 47, "43.0", 34, 17, 5, 1.19, 2),
    homePitcher: makePitcher("Mason Montgomery", "L", 1, 0, "2.87", 23, "15.2", 12, 8, 1, 1.28, 2),
    spread: "Rockies +1.5 (-144) / Pirates -1.5 (+119)",
    total: "O7.5 (-118) / U7.5 (-102)",
    moneyline: "Rockies +148 / Pirates -180"
  },
  {
    id: "nationals-reds",
    away: "Nationals",
    home: "Reds",
    start: "9:40 AM PT",
    startMinutes: 580,
    awayPitcher: makePitcher("Foster Griffin", "L", 4, 1, "2.12", 42, "46.2", 33, 15, 6, 1.03, 8),
    homePitcher: makePitcher("Chase Burns", "R", 4, 1, "2.11", 48, "47.0", 33, 16, 6, 1.04, 8),
    spread: "Nationals +1.5 (-158) / Reds -1.5 (+131)",
    total: "O7.5 (-114) / U7.5 (-106)",
    moneyline: "Nationals +134 / Reds -162"
  },
  {
    id: "tigers-mets",
    away: "Tigers",
    home: "Mets",
    start: "10:10 AM PT",
    startMinutes: 610,
    awayPitcher: makePitcher("Keider Montero", "R", 2, 2, "3.18", 29, "39.2", 30, 8, 3, 0.96, 7),
    homePitcher: makePitcher("Nolan McLean", "R", 1, 2, "2.78", 57, "45.1", 29, 12, 3, 0.9, 8),
    spread: "Tigers +1.5 (-170) / Mets -1.5 (+140)",
    total: "O7 (-120) / U7 (-101)",
    moneyline: "Tigers +130 / Mets -157"
  },
  {
    id: "marlins-twins",
    away: "Marlins",
    home: "Twins",
    start: "10:40 AM PT",
    startMinutes: 640,
    awayPitcher: makePitcher("Braxton Garrett", "L", 0, 0, "-.--", 0, "0", 0, 0, 0, 0, 0),
    homePitcher: makePitcher("Zebby Matthews", "R", 0, 0, "-.--", 0, "0", 0, 0, 0, 0, 0),
    spread: "Marlins -1.5 (+141) / Twins +1.5 (-172)",
    total: "O8.5 (-112) / U8.5 (-107)",
    moneyline: "Marlins -110 / Twins -109"
  },
  {
    id: "padres-brewers",
    away: "Padres",
    home: "Brewers",
    start: "10:40 AM PT",
    startMinutes: 640,
    awayPitcher: makePitcher("Griffin Canning", "R", 0, 1, "6.75", 12, "9.1", 10, 5, 1, 1.61, 2),
    homePitcher: makePitcher("Kyle Harrison", "L", 3, 1, "2.41", 41, "33.2", 28, 13, 3, 1.22, 7),
    spread: "Padres +1.5 (-175) / Brewers -1.5 (+144)",
    total: "O8 (-102) / U8 (-119)",
    moneyline: "Padres +118 / Brewers -142"
  },
  {
    id: "mariners-astros",
    away: "Mariners",
    home: "Astros",
    start: "11:10 AM PT",
    startMinutes: 670,
    awayPitcher: makePitcher("Luis Castillo", "R", 0, 4, "6.57", 37, "38.1", 49, 13, 6, 1.62, 8),
    homePitcher: makePitcher("Mike Burrows", "R", 2, 4, "5.04", 42, "44.2", 52, 14, 8, 1.48, 8),
    spread: "Mariners -1.5 (+135) / Astros +1.5 (-163)",
    total: "O9 (-109) / U9 (-110)",
    moneyline: "Mariners -118 / Astros -102"
  },
  {
    id: "cardinals-athletics",
    away: "Cardinals",
    home: "Athletics",
    start: "12:05 PM PT",
    startMinutes: 725,
    awayPitcher: makePitcher("Michael McGreevy", "R", 3, 2, "2.18", 33, "45.1", 29, 10, 5, 0.86, 8),
    homePitcher: makePitcher("Jacob Lopez", "L", 3, 2, "6.11", 28, "35.1", 38, 24, 8, 1.75, 7),
    spread: "Cardinals +1.5 (-184) / Athletics -1.5 (+152)",
    total: "O9.5 (-114) / U9.5 (-105)",
    moneyline: "Cardinals +101 / Athletics -122"
  },
  {
    id: "phillies-red-sox",
    away: "Phillies",
    home: "Red Sox",
    start: "3:45 PM PT",
    startMinutes: 945,
    awayPitcher: makePitcher("Jesús Luzardo", "L", 3, 3, "5.77", 57, "43.2", 49, 12, 5, 1.4, 8),
    homePitcher: makePitcher("Ranger Suarez", "L", 2, 2, "2.77", 32, "39.0", 27, 10, 3, 0.95, 7),
    spread: "Phillies -1.5 (+157) / Red Sox +1.5 (-192)",
    total: "O7 (-120) / U7 (-101)",
    moneyline: "Phillies -108 / Red Sox -112"
  },
  {
    id: "cubs-braves",
    away: "Cubs",
    home: "Braves",
    start: "4:15 PM PT",
    startMinutes: 975,
    awayPitcher: makePitcher("Ben Brown", "R", 1, 1, "1.82", 27, "29.2", 18, 9, 1, 0.91, 1),
    homePitcher: makePitcher("Chris Sale", "L", 6, 2, "2.20", 56, "49.0", 31, 12, 6, 0.88, 8),
    spread: "Cubs +1.5 (-143) / Braves -1.5 (+119)",
    total: "O7.5 (-102) / U7.5 (-119)",
    moneyline: "Cubs +149 / Braves -181"
  },
  {
    id: "royals-white-sox",
    away: "Royals",
    home: "White Sox",
    start: "4:40 PM PT",
    startMinutes: 1000,
    awayPitcher: makePitcher("Kris Bubic", "L", 3, 1, "3.50", 47, "46.1", 31, 23, 3, 1.17, 8),
    homePitcher: makePitcher("Anthony Kay", "L", 2, 1, "4.89", 25, "35.0", 38, 17, 6, 1.57, 6),
    spread: "Royals -1.5 (+119) / White Sox +1.5 (-144)",
    total: "O8 (-107) / U8 (-112)",
    moneyline: "Royals -137 / White Sox +114"
  },
  {
    id: "giants-dodgers",
    away: "Giants",
    home: "Dodgers",
    start: "7:10 PM PT",
    startMinutes: 1150,
    awayPitcher: makePitcher("Landen Roupp", "R", 5, 3, "3.09", 51, "43.2", 29, 19, 1, 1.1, 8),
    homePitcher: makePitcher("Emmet Sheehan", "R", 2, 1, "4.79", 43, "35.2", 38, 10, 6, 1.35, 7),
    spread: "Giants +1.5 (-137) / Dodgers -1.5 (+114)",
    total: "O8 (-105) / U8 (-114)",
    moneyline: "Giants +149 / Dodgers -181"
  }
]

const enrichRawGame = (game) => ({
  ...game,
  teamContext: {
    away: standingsContextByTeam[game.away],
    home: standingsContextByTeam[game.home]
  },
  parkContext: parkContextByHomeTeam[game.home] || null,
  offenseContext: {
    away: teamOffenseContextByTeam[game.away],
    home: teamOffenseContextByTeam[game.home]
  },
  bullpenContext: {
    away: teamBullpenContextByTeam[game.away],
    home: teamBullpenContextByTeam[game.home]
  },
  savantContext: {
    away: teamSavantContextByTeam[game.away],
    home: teamSavantContextByTeam[game.home]
  }
})

const buildRawGame = (raw) => {
  const [awayOdds, homeOdds] = parseAmericanPair(raw.moneyline)
  const awayMarketScore = impliedProbabilityFromAmerican(awayOdds) * 100
  const homeMarketScore = impliedProbabilityFromAmerican(homeOdds) * 100
  const awayStarterScore = starterScore(raw.awayPitcher)
  const homeStarterScore = starterScore(raw.homePitcher)
  const awayStandingsScore = buildStandingsScore(raw.teamContext.away)
  const homeStandingsScore = buildStandingsScore(raw.teamContext.home)
  const awayOffenseScore = buildOffenseScore(raw.offenseContext.away, "Away")
  const homeOffenseScore = buildOffenseScore(raw.offenseContext.home, "Home")
  const awayBullpenScore = buildBullpenScore(raw.bullpenContext.away)
  const homeBullpenScore = buildBullpenScore(raw.bullpenContext.home)
  const awaySavantScore = buildSavantScore(raw.savantContext.away)
  const homeSavantScore = buildSavantScore(raw.savantContext.home)
  const favoriteIndex = awayMarketScore >= homeMarketScore ? 0 : 1
  const starterIndex = awayStarterScore >= homeStarterScore ? 0 : 1
  const savantIndex = awaySavantScore >= homeSavantScore ? 0 : 1
  const bullpenIndex = awayBullpenScore >= homeBullpenScore ? 0 : 1
  const awayComposite =
    awayMarketScore * 0.28 +
    awayStarterScore * 0.22 +
    awayStandingsScore * 0.14 +
    awayOffenseScore * 0.14 +
    awayBullpenScore * 0.1 +
    awaySavantScore * 0.12
  const homeComposite =
    homeMarketScore * 0.28 +
    homeStarterScore * 0.22 +
    homeStandingsScore * 0.14 +
    homeOffenseScore * 0.14 +
    homeBullpenScore * 0.1 +
    homeSavantScore * 0.12
  const modelIndex = awayComposite >= homeComposite ? 0 : 1

  return {
    id: raw.id,
    league: "MLB",
    title: `${raw.away} @ ${raw.home}`,
    teamContext: raw.teamContext,
    parkContext: raw.parkContext,
    offenseContext: raw.offenseContext,
    bullpenContext: raw.bullpenContext,
    savantContext: raw.savantContext,
    starterContext: {
      away: raw.awayPitcher,
      home: raw.homePitcher
    },
    start: raw.start,
    startMinutes: raw.startMinutes,
    stage: getWindowLabel(raw.startMinutes),
    tags: buildTags(raw, favoriteIndex, starterIndex, savantIndex, bullpenIndex),
    matchup: [
      { side: "Away", name: raw.away, detail: pitcherDetail(raw.awayPitcher) },
      { side: "Home", name: raw.home, detail: pitcherDetail(raw.homePitcher) }
    ],
    summary: buildSummary(raw, modelIndex, starterIndex, savantIndex),
    lean: buildLean(raw, modelIndex),
    factors: buildFactors(raw, starterIndex, savantIndex, bullpenIndex),
    swingFactor: buildSwingFactor(raw, favoriteIndex, bullpenIndex),
    spotlight: shouldSpotlight(raw, favoriteIndex, savantIndex),
    odds: makeBoardOdds({ spread: raw.spread, total: raw.total, moneyline: raw.moneyline })
  }
}

const makeWnbaGame = ({
  id,
  start,
  startMinutes,
  title,
  stage,
  summary,
  factors,
  lean,
  swing,
  tags,
  matchup,
  odds,
  playerAnalysis = []
}) =>
  createSportsMatchModel(
    {
      id,
      league: "WNBA",
      start,
      startMinutes,
      title,
      stage,
      spotlight: true,
      tags,
      matchup,
      summary,
      factors,
      lean,
      swing,
      playerAnalysis,
      odds: makeBoardOdds(odds)
    },
    oddsMeta.provider
  )

const mlbGames = rawGames.map((game) =>
  createSportsMatchModel(buildRawGame(enrichRawGame(game)), oddsMeta.provider)
)

const wnbaGames = [
  makeWnbaGame({
    id: "lynx-wings",
    start: "5:00 PM PT",
    startMinutes: 1020,
    title: "Lynx @ Wings",
    stage: "Thursday WNBA board",
    tags: ["Short spread", "Guard-creation duel", "High variance"],
    matchup: [
      { side: "Away", name: "Lynx", detail: "1-1 | 89.0 PPG | No. 9 defense | Miles 17.0 PPG / 7.5 APG" },
      { side: "Home", name: "Wings", detail: "1-1 | 89.5 PPG | No. 5 offense | Arike 21.0 PPG" }
    ],
    summary:
      "This is still the sharper WNBA trading spot on the board because Dallas owns the bigger pure scoring ceiling, but the profile gap is narrow enough that Minnesota's passing structure can absolutely keep the fourth quarter live.",
    factors: [
      "Current board: Lynx +145 / Wings -175 with Dallas laying 3.5 and the total sitting at 178.5 on the LineStar May 14 refresh.",
      "LineStar's team board has Minnesota at 89.0 points per game with the No. 9 defense, while Dallas sits at 89.5 points per game with the No. 11 defense, so this is a real but narrow team-profile edge instead of a blowout number.",
      "Official roster production says Dallas still has the best single-game scorer in Arike Ogunbowale at 21.0 points per game, but Minnesota's Olivia Miles at 17.0 points and 7.5 assists plus Courtney Williams at 5.5 assists keep the Lynx's possession control very live."
    ],
    lean:
      "Lean Wings because Arike plus Paige Bueckers still give Dallas the cleaner late-clock scoring tree at home, but keep it in the high-variance bucket because the Lynx can win the passing and decision-making battle.",
    swing:
      "Swing factor: whether Dallas can turn its guard scoring edge into clean final-five-minute possessions or let Minnesota's ball movement flatten the game into a coin-flip finish.",
    odds: {
      spread: "Lynx +3.5 (-110) / Wings -3.5 (-110)",
      total: "O178.5 (-110) / U178.5 (-110)",
      moneyline: "Lynx +145 / Wings -175"
    },
    playerAnalysis: [
      "Arike Ogunbowale is still Dallas's cleanest takeover scorer at 21.0 points per game, which is the main reason the Wings keep the favorite tag in a short number.",
      "Paige Bueckers at 17.5 points and 3.5 assists gives Dallas a second real creator, but Minnesota can answer with more pure table-setting through Olivia Miles at 17.0 points and 7.5 assists plus Courtney Williams at 12.5 points and 5.5 assists.",
      "Kayla McBride is also at 17.0 points per game for Minnesota, so Dallas does not get a free perimeter shot-making edge once the game tightens.",
      "Natasha Howard's 10.0 points and 8.0 rebounds matter here because if Dallas does not clearly win the guard shot-quality battle, Minnesota has enough veteran frontcourt stability to steal a short road number."
    ]
  }),
  makeWnbaGame({
    id: "liberty-fire",
    start: "7:00 PM PT",
    startMinutes: 1140,
    title: "Liberty @ Fire",
    stage: "Thursday WNBA board",
    tags: ["Top offense", "Heavy favorite", "Expansion defense test"],
    matchup: [
      { side: "Away", name: "Liberty", detail: "2-1 | 100.0 PPG | No. 1 offense | Stewart 23.3 PPG" },
      { side: "Home", name: "Fire", detail: "1-1 | 90.5 PPG | No. 14 defense | Leite 19.5 PPG" }
    ],
    summary:
      "New York is still carrying the clearest talent and scoring-tier gap on the WNBA board tonight, and the team-level numbers agree with it because Portland's defense has been the softest of the four teams in action.",
    factors: [
      "Current board: Liberty -650 / Fire +470 with New York laying 11.5 and the total at 175.5 on the LineStar May 14 refresh.",
      "LineStar has New York as the No. 1 offense at 100.0 points per game, while Portland is allowing 97.0 per game with the No. 14 defense, which is the exact structural mismatch behind the price.",
      "The Fire are not empty offensively because Carla Leite and Bridget Carleton are both at 19.5 points per game, but New York's shot-creation tree is simply deeper and more proven right now."
    ],
    lean:
      "Lean Liberty because the offense hierarchy and star depth gap are too large to fade casually, while keeping some variance alive because the road role still leaves room for a backdoor or stalled favorite script.",
    swing:
      "Swing factor: whether New York gets enough early separation through Stewart and the secondary creators to stop Portland from turning this into a score-for-score crowd game.",
    odds: {
      spread: "Liberty -11.5 (-110) / Fire +11.5 (-110)",
      total: "O175.5 (-110) / U175.5 (-110)",
      moneyline: "Liberty -650 / Fire +470"
    },
    playerAnalysis: [
      "Breanna Stewart is the cleanest ceiling piece on the slate at 23.3 points and 9.7 rebounds per game, and she is backed by Marine Johannes at 20.0 points plus Jonquel Jones at 13.3 points and 6.7 boards.",
      "Pauline Astier at 15.7 points and 4.7 assists gives New York another live organizer, so this favorite is not dependent on one creator to keep the road offense structured.",
      "Portland can still throw punches because Carla Leite and Bridget Carleton are both at 19.5 points per game, and Luisa Geiselsoder is giving 10.5 points with 6.0 rebounds inside.",
      "The Fire path is mostly about keeping New York in a half-court possession game, because once the Liberty start stacking creator touches and defensive rebounds, the team-depth gap shows up quickly."
    ]
  })
]

const modeledGames = [...mlbGames, ...wnbaGames]

export const games = modeledGames.sort(
  (left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title)
)

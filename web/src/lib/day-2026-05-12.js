import { createSportsMatchModel } from "./sports-model.js"
import {
  lineupMatchupContextByGame,
  teamBullpenContextByTeam,
  teamOffenseContextByTeam
} from "./mlb-context-2026-05-12.js"
import {
  parkContextByHomeTeam,
  rawGames,
  standingsContextByTeam
} from "./day-2026-05-12-mlb-data.js"

export const slateMeta = {
  title: "Tuesday Trading Board",
  date: "May 12, 2026",
  isoDate: "2026-05-12",
  timeZone: "America/Los_Angeles",
  subtitle:
    "A stored May 12 board with 15 MLB games, one NBA playoff game, and three WNBA games, refreshed from official MLB starters, current market boards, and updated playoff context.",
  notes: [
    "This day keeps the desk workflow intact: official MLB schedule and starter feeds first, then standings, offense, bullpen, park factors, and current market prices.",
    "BallparkPal did not feed clean lineup-vs-starter data on the May 12 pull because the page redirected to a secure checkout wall, so the MLB model is intentionally running without that layer instead of faking a matchup grade.",
    "Phillies at Red Sox is carrying a source-mismatch volatility bump because MLB.com still listed Boston as TBD while the live board was already dealing Brayan Bello.",
    "Spurs-Timberwolves is now a tied 2-2 series entering Game 5 after Minnesota survived Game 4, but Victor Wembanyama's ejection makes that sample noisier than a normal four-game split.",
    "WNBA is back on the board today with three games, all pulled from the live ScoresAndOdds slate."
  ]
}

export const filters = ["All", "MLB", "NBA", "WNBA"]

export const oddsMeta = {
  provider: "Mixed official league data + live board snapshots",
  snapshot: "May 12, 2026, 11:11 AM PT",
  note:
    "MLB, NBA, and WNBA prices are wired to the current ScoresAndOdds board. MLB analysis uses official schedule and probable-pitcher data plus standings, offense, bullpen, and Statcast park factors, while BallparkPal lineup context was unavailable on this pull."
}

export const sources = [
  { label: "MLB probable pitchers", url: "https://www.mlb.com/probable-pitchers" },
  {
    label: "MLB schedule API for May 12, 2026",
    url: "https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-12&hydrate=probablePitcher,team"
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
  { label: "ScoresAndOdds MLB board", url: "https://www.scoresandodds.com/mlb" },
  {
    label: "NBA 2026 playoffs schedule",
    url: "https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true"
  },
  { label: "ScoresAndOdds NBA board", url: "https://www.scoresandodds.com/nba" },
  {
    label: "Spurs vs Timberwolves Game 1 official PDF box score",
    url: "https://statsdmz.nba.com/pdfs/20260504/20260504_MINSAS.pdf"
  },
  {
    label: "Spurs vs Timberwolves Game 2 official PDF box score",
    url: "https://statsdmz.nba.com/pdfs/20260506/20260506_MINSAS.pdf"
  },
  {
    label: "Spurs vs Timberwolves Game 3 official PDF box score",
    url: "https://statsdmz.nba.com/pdfs/20260508/20260508_SASMIN.pdf"
  },
  {
    label: "Spurs vs Timberwolves Game 4 official PDF box score",
    url: "https://statsdmz.nba.com/pdfs/20260510/20260510_SASMIN_book.pdf"
  },
  { label: "ScoresAndOdds WNBA board", url: "https://www.scoresandodds.com/wnba" },
  { label: "WNBA home page", url: "https://www.wnba.com/" }
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
    "Current board snapshot from ScoresAndOdds on the May 12 late-morning refresh. This price layer is meant to sit beside the model read, not replace it.",
  provider
})

const parseAmericanPair = (value = "") => [...value.matchAll(/[+-]\d+/g)].map((match) => Number(match[0]))

const impliedProbabilityFromAmerican = (americanOdds) =>
  americanOdds > 0
    ? 100 / (americanOdds + 100)
    : Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const parseEra = (value) => (value === "-.--" ? null : Number(value))
const lastName = (fullName = "") => fullName.split(" ").at(-1) || fullName

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

const getWindowLabel = (startMinutes) => {
  if (startMinutes < 960) return "Tuesday opener"
  if (startMinutes < 1020) return "Tuesday swing window"
  if (startMinutes < 1110) return "Tuesday prime window"
  return "Tuesday nightcap"
}

const buildTags = (raw, favoriteIndex, starterIndex) => {
  const [awayOdds, homeOdds] = parseAmericanPair(raw.moneyline)
  const awayEra = parseEra(raw.awayPitcher.era)
  const homeEra = parseEra(raw.homePitcher.era)
  const awayOffenseScore = buildOffenseScore(raw.offenseContext?.away, "Away")
  const homeOffenseScore = buildOffenseScore(raw.offenseContext?.home, "Home")
  const awayBullpenScore = buildBullpenScore(raw.bullpenContext?.away)
  const homeBullpenScore = buildBullpenScore(raw.bullpenContext?.home)
  const tags = []

  if (Math.abs(Math.abs(awayOdds) - Math.abs(homeOdds)) <= 18) tags.push("Tradable number")
  else tags.push(`${favoriteIndex === 0 ? raw.away : raw.home} price edge`)

  if (Number.isFinite(awayEra) && Number.isFinite(homeEra)) {
    const eraGap = Math.abs(awayEra - homeEra)
    if (eraGap >= 1) tags.push(`ERA edge ${starterIndex === 0 ? raw.away : raw.home}`)
    else tags.push("Starter duel")
  }

  if (Math.abs(raw.awayPitcher.strikeOuts - raw.homePitcher.strikeOuts) >= 12) {
    tags.push(`K edge ${raw.awayPitcher.strikeOuts > raw.homePitcher.strikeOuts ? raw.away : raw.home}`)
  }

  if (Math.abs(awayOffenseScore - homeOffenseScore) >= 7) {
    tags.push(`Contact edge ${awayOffenseScore > homeOffenseScore ? raw.away : raw.home}`)
  }

  if (Math.abs(awayBullpenScore - homeBullpenScore) >= 8) {
    tags.push(`Bullpen edge ${awayBullpenScore > homeBullpenScore ? raw.away : raw.home}`)
  }

  if ((raw.parkContext?.indexRuns || 100) >= 106) tags.push("Run-boosting park")
  else if ((raw.parkContext?.indexRuns || 100) <= 94) tags.push("Run-suppressing park")

  if (raw.pitcherSourceNote) tags.push("Starter feed mismatch")

  return [...new Set(tags)].slice(0, 3)
}

const buildSummary = (raw, favoriteIndex, starterIndex, modelIndex) => {
  const favorite = favoriteIndex === 0 ? raw.away : raw.home
  const starterSide = starterIndex === 0 ? raw.away : raw.home
  const modelSide = modelIndex === 0 ? raw.away : raw.home
  const awayStandingsScore = buildStandingsScore(raw.teamContext?.away)
  const homeStandingsScore = buildStandingsScore(raw.teamContext?.home)
  const standingsSide = awayStandingsScore >= homeStandingsScore ? raw.away : raw.home
  const awayBullpenScore = buildBullpenScore(raw.bullpenContext?.away)
  const homeBullpenScore = buildBullpenScore(raw.bullpenContext?.home)
  const bullpenSide = awayBullpenScore >= homeBullpenScore ? raw.away : raw.home
  const venueName = raw.parkContext?.venueName

  if (raw.pitcherSourceNote) {
    return "This board is already carrying starter-source noise because MLB.com still had one side unresolved while the market was dealing a specific arm, so the pregame read is tradable but less clean than the surface number suggests."
  }

  if (modelSide === starterSide && modelSide === standingsSide && modelSide === bullpenSide) {
    return `${modelSide} bring the cleaner multi-layer case, with the market, listed starter shape, standings profile, and bullpen follow-through all leaning their way${venueName ? ` at ${venueName}` : ""}.`
  }

  if (
    (raw.parkContext?.indexRuns || 100) >= 106 &&
    ((parseEra(raw.awayPitcher.era) || 0) >= 4.5 || (parseEra(raw.homePitcher.era) || 0) >= 4.5)
  ) {
    return `This matchup lands in a livelier scoring environment${venueName ? ` at ${venueName}` : ""}, which keeps the underdog path alive if either starter leaks traffic early.`
  }

  if (favorite !== bullpenSide && favorite !== starterSide) {
    return `${favorite} still carry the number, but the cleaner bullpen or starter layer is leaning the other way, so this price deserves more caution than a routine favorite spot.`
  }

  return `${favorite} have the shorter price, but the game shape still looks live because at least one of the supporting layers is pulling back toward ${modelSide}.`
}

const buildFactors = (raw, favoriteIndex, starterIndex) => {
  const starterTeam = starterIndex === 0 ? raw.away : raw.home
  const starterPitcher = starterIndex === 0 ? raw.awayPitcher : raw.homePitcher
  const weakerPitcher = starterIndex === 0 ? raw.homePitcher : raw.awayPitcher
  const favoriteTeam = favoriteIndex === 0 ? raw.away : raw.home
  const awayOffense = raw.offenseContext?.away
  const homeOffense = raw.offenseContext?.home
  const awayBullpen = raw.bullpenContext?.away
  const homeBullpen = raw.bullpenContext?.home
  const factors = [
    `Current board: ${raw.moneyline} | ${raw.total} | ${raw.spread}.`,
    `${starterPitcher.fullName} carries the cleaner starter line for ${starterTeam}, with ${starterPitcher.era} ERA and ${starterPitcher.strikeOuts} strikeouts.`,
    `${raw.away} enter ${buildStandingsLabel(raw.teamContext?.away)}; ${raw.home} enter ${buildStandingsLabel(raw.teamContext?.home)}.`,
    `${raw.away} offense: ${awayOffense.hitsPerGame.toFixed(2)} H/G with ${awayOffense.last3HitsPerGame.toFixed(2)} over the last three; ${raw.home} offense: ${homeOffense.hitsPerGame.toFixed(2)} H/G with ${homeOffense.last3HitsPerGame.toFixed(2)} over the last three.`,
    `${raw.away} bullpen: ${awayBullpen.era.toFixed(2)} ERA and ${awayBullpen.whip.toFixed(2)} WHIP; ${raw.home} bullpen: ${homeBullpen.era.toFixed(2)} ERA and ${homeBullpen.whip.toFixed(2)} WHIP.`
  ]

  if (raw.pitcherSourceNote) {
    factors.push(raw.pitcherSourceNote)
  } else if (raw.parkContext?.venueName) {
    factors.push(
      `${raw.parkContext.venueName} sits at ${raw.parkContext.indexRuns} for runs and ${raw.parkContext.indexHr} for home runs over ${raw.parkContext.yearRange}, which helps frame the scoring environment.`
    )
  }

  if (favoriteTeam !== starterTeam) {
    factors[1] = `${favoriteTeam} drew the shorter price, but ${starterPitcher.fullName} is the sharper listed mound profile on paper for ${starterTeam}.`
  }

  if (parseEra(weakerPitcher.era) >= 5.5) {
    factors[1] = `${weakerPitcher.fullName} enters with the softer ERA baseline, so early traffic could flip the whole script quickly.`
  }

  return factors.slice(0, 5)
}

const buildSwingFactor = (raw, starterIndex) => {
  const weakerPitcher = starterIndex === 0 ? raw.homePitcher : raw.awayPitcher
  const strongerPitcher = starterIndex === 0 ? raw.awayPitcher : raw.homePitcher
  const venueName = raw.parkContext?.venueName
  const underdogBullpenTeam =
    buildBullpenScore(raw.bullpenContext?.away) >= buildBullpenScore(raw.bullpenContext?.home)
      ? raw.away
      : raw.home

  if (raw.pitcherSourceNote) {
    return "Swing factor: whether the board-listed Boston starter look is real enough to trust once the official feed finally settles."
  }

  if ((raw.parkContext?.indexRuns || 100) >= 106 || (raw.parkContext?.indexHr || 100) >= 114) {
    return `Swing factor: whether ${lastName(weakerPitcher.fullName)} can keep the ball in the yard long enough to stop ${venueName} from amplifying an early mistake.`
  }

  return `Swing factor: whether ${underdogBullpenTeam} can keep the game live long enough to stop ${lastName(strongerPitcher.fullName)} from dictating the entire pace.`
}

const buildLean = (raw, modelIndex) =>
  `Lean ${modelIndex === 0 ? raw.away : raw.home} if the cleaner starter-to-bullpen chain and standings profile still hold once the late innings start to matter.`

const shouldSpotlight = (raw, favoriteIndex) => {
  const [awayOdds, homeOdds] = parseAmericanPair(raw.moneyline)
  const favoredOdds = favoriteIndex === 0 ? awayOdds : homeOdds
  return (
    favoredOdds <= -155 ||
    raw.awayPitcher.strikeOuts >= 45 ||
    raw.homePitcher.strikeOuts >= 45 ||
    (raw.parkContext?.indexRuns || 100) >= 108 ||
    Boolean(raw.pitcherSourceNote)
  )
}

const buildRawGame = (raw) => {
  const [awayOdds, homeOdds] = parseAmericanPair(raw.moneyline)
  const awayMarketScore = impliedProbabilityFromAmerican(awayOdds) * 100
  const homeMarketScore = impliedProbabilityFromAmerican(homeOdds) * 100
  const awayStarterScore = starterScore(raw.awayPitcher)
  const homeStarterScore = starterScore(raw.homePitcher)
  const favoriteIndex = awayMarketScore >= homeMarketScore ? 0 : 1
  const starterIndex = awayStarterScore >= homeStarterScore ? 0 : 1
  const awayComposite =
    awayMarketScore * 0.36 +
    awayStarterScore * 0.34 +
    buildStandingsScore(raw.teamContext?.away) * 0.18 +
    buildBullpenScore(raw.bullpenContext?.away) * 0.12
  const homeComposite =
    homeMarketScore * 0.36 +
    homeStarterScore * 0.34 +
    buildStandingsScore(raw.teamContext?.home) * 0.18 +
    buildBullpenScore(raw.bullpenContext?.home) * 0.12
  const modelIndex = awayComposite >= homeComposite ? 0 : 1

  return {
    id: raw.id,
    league: "MLB",
    title: `${raw.away} @ ${raw.home}`,
    teamContext: raw.teamContext,
    parkContext: raw.parkContext,
    offenseContext: raw.offenseContext,
    bullpenContext: raw.bullpenContext,
    lineupContext: lineupMatchupContextByGame[raw.id],
    pitcherSourceNote: raw.pitcherSourceNote || "",
    start: raw.start,
    startMinutes: raw.startMinutes,
    stage: getWindowLabel(raw.startMinutes),
    tags: buildTags(raw, favoriteIndex, starterIndex),
    matchup: [
      { side: "Away", name: raw.away, detail: pitcherDetail(raw.awayPitcher) },
      { side: "Home", name: raw.home, detail: pitcherDetail(raw.homePitcher) }
    ],
    summary: buildSummary(raw, favoriteIndex, starterIndex, modelIndex),
    lean: buildLean(raw, modelIndex),
    factors: buildFactors(raw, favoriteIndex, starterIndex),
    swingFactor: buildSwingFactor(raw, starterIndex),
    spotlight: shouldSpotlight(raw, favoriteIndex),
    odds: makeBoardOdds({ spread: raw.spread, total: raw.total, moneyline: raw.moneyline })
  }
}

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
  }
})

const basketballGames = [
  {
    id: "spurs-timberwolves-g5",
    league: "NBA",
    start: "5:00 PM PT",
    startMinutes: 1020,
    title: "Timberwolves @ Spurs",
    stage: "West semifinal Game 5",
    spotlight: true,
    tags: ["Series tied 2-2", "Game 5 leverage", "Wemby variance"],
    matchup: [
      { side: "Away", name: "Timberwolves", detail: "Edwards | Reid | McDaniels | Tied series 2-2" },
      { side: "Home", name: "Spurs", detail: "Wembanyama | Fox | Castle | Home Game 5" }
    ],
    summary:
      "The series is back in San Antonio tied 2-2, but the shape is still noisier than a normal tied series because Minnesota's Game 4 win came in the game where Victor Wembanyama was ejected in the second quarter.",
    factors: [
      "San Antonio still owns the stronger scoring average through four games, 114.8 to 105.3, and the market is dealing the Spurs like the cleaner full-series side at home.",
      "Minnesota proved in Game 4 that the Wolves can survive the Spurs pace if Anthony Edwards gets enough help from Naz Reid, McDaniels, and the glass.",
      "Wembanyama's Game 4 ejection is part of the sample now, which means the series numbers need to be read with more variance than a cleaner four-game split would carry."
    ],
    lean:
      "Lean Spurs because the home floor, the bigger market vote, and the stronger full-series scoring profile still lean their way, but this is a higher-variance read than the raw moneyline suggests.",
    swing:
      "Swing factor: whether Minnesota can keep Wembanyama from resetting the interior script now that the series is back in San Antonio.",
    seriesBreakdown: {
      kicker: "Playoff series to date",
      title: "Why Game 5 is more volatile than a normal tied series",
      record: "Series tied 2-2",
      recap:
        "Minnesota won the opener, San Antonio flipped the series with two straight wins, and then the Wolves answered in Game 4 after Wembanyama was ejected in the second quarter. The Spurs still have the cleaner full-series scoring profile and the stronger interior ceiling, but Minnesota has already shown the series can bend quickly when Edwards gets real support and the pace stays closer to neutral.",
      seriesStats: [
        "SAS 114.8 PPG | MIN 105.3 PPG",
        "Anthony Edwards: 36-point Game 4 response",
        "Wembanyama Game 4 ejection: 8:39 left in 2Q",
        "Game 5 price: SAS -380 | MIN +300"
      ],
      boxScores: [
        {
          label: "Game 1",
          date: "May 4, 2026",
          result: "Timberwolves 104, Spurs 102",
          notes: [
            "Minnesota escaped the opener even though San Antonio won the fast-break points 27-11.",
            "The Wolves got 52 paint points and enough frontcourt scoring to survive the late swings.",
            "Wembanyama still flashed the matchup problem with 15 rebounds and 12 blocks in the loss."
          ],
          leaders: [
            { team: "Timberwolves leaders", lines: ["Julius Randle: 21 points", "Anthony Edwards: 18 points", "Jaden McDaniels: 16 points", "Terrence Shannon Jr.: 16 points"] },
            { team: "Spurs leaders", lines: ["Dylan Harper: 18 points", "Stephon Castle: 17 points", "Julian Champagnie: 17 points", "Victor Wembanyama: 11 points, 15 rebounds, 12 blocks"] }
          ]
        },
        {
          label: "Game 2",
          date: "May 6, 2026",
          result: "Spurs 133, Timberwolves 95",
          notes: [
            "San Antonio buried Minnesota with 16 made threes and a 29-5 fast-break edge.",
            "The Wolves committed 22 turnovers and never recovered from the pace deficit.",
            "This was the cleanest proof that the Spurs can win outside of pure Wembanyama shot volume."
          ],
          leaders: [
            { team: "Spurs leaders", lines: ["Stephon Castle: 21 points", "Victor Wembanyama: 19 points, 15 rebounds", "De'Aaron Fox: 16 points"] },
            { team: "Timberwolves leaders", lines: ["Jaden McDaniels: 12 points", "Julius Randle: 12 points", "Anthony Edwards: 12 points", "Naz Reid: 11 points"] }
          ]
        },
        {
          label: "Game 3",
          date: "May 8, 2026",
          result: "Spurs 115, Timberwolves 108",
          notes: [
            "Wembanyama detonated for 39 points and 15 rebounds, and Minnesota still never fully solved the matchup.",
            "The Wolves generated 30 second-chance points, but San Antonio stayed cleaner in the highest-leverage possessions.",
            "Minnesota was still patching support minutes on the fly, which kept the Spurs in control late."
          ],
          leaders: [
            { team: "Spurs leaders", lines: ["Victor Wembanyama: 39 points, 15 rebounds, 5 blocks", "De'Aaron Fox: 17 points", "Stephon Castle: 13 points, 12 assists"] },
            { team: "Timberwolves leaders", lines: ["Anthony Edwards: 32 points, 14 rebounds", "Naz Reid: 18 points", "Jaden McDaniels: 17 points"] }
          ]
        },
        {
          label: "Game 4",
          date: "May 10, 2026",
          result: "Timberwolves 114, Spurs 109",
          notes: [
            "Wembanyama was ejected for a Flagrant 2 with 8:39 left in the second quarter, which changed the rest of the game shape immediately.",
            "Anthony Edwards answered with 36 points, while Naz Reid and the Wolves frontcourt pieced together enough support to even the series.",
            "San Antonio still got 24 points from De'Aaron Fox and 24 from Dylan Harper, so the Spurs offense stayed live even after the ejection."
          ],
          leaders: [
            { team: "Timberwolves leaders", lines: ["Anthony Edwards: 36 points", "Naz Reid: 15 points", "Jaden McDaniels: 14 points", "Julius Randle: 12 points"] },
            { team: "Spurs leaders", lines: ["De'Aaron Fox: 24 points", "Dylan Harper: 24 points", "Stephon Castle: 20 points", "Victor Wembanyama: 4 points before ejection"] }
          ]
        }
      ],
      playerAnalysis: [
        "Victor Wembanyama is still the biggest matchup-bending force in the series, but Game 4 also showed how much variance shows up if he is not on the floor for long stretches.",
        "Anthony Edwards just reminded everyone that Minnesota's best single-game scorer is still alive in this matchup if the support shooting and rebounding come with him.",
        "Stephon Castle and De'Aaron Fox keep stabilizing San Antonio's offense, which matters because the Spurs do not need every good possession to be a Wembanyama touch.",
        "Naz Reid and Jaden McDaniels have been the cleaner support pieces for Minnesota whenever the Wolves have looked most dangerous.",
        "Dylan Harper's Game 4 scoring punch matters because it gave the Spurs another perimeter answer once the frontcourt script broke."
      ],
      sources: [
        { label: "NBA playoffs schedule", url: "https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true" },
        { label: "Game 1 official PDF box score", url: "https://statsdmz.nba.com/pdfs/20260504/20260504_MINSAS.pdf" },
        { label: "Game 2 official PDF box score", url: "https://statsdmz.nba.com/pdfs/20260506/20260506_MINSAS.pdf" },
        { label: "Game 3 official PDF box score", url: "https://statsdmz.nba.com/pdfs/20260508/20260508_SASMIN.pdf" },
        { label: "Game 4 official PDF box score", url: "https://statsdmz.nba.com/pdfs/20260510/20260510_SASMIN_book.pdf" }
      ]
    },
    odds: makeBoardOdds({
      spread: "Timberwolves +9.5 (-110) / Spurs -9.5 (-110)",
      total: "O218.5 (-108) / U218.5 (-112)",
      moneyline: "Timberwolves +300 / Spurs -380"
    })
  }
]

const wnbaGames = [
  {
    id: "dream-wings-2026-05-12",
    league: "WNBA",
    start: "5:00 PM PT",
    startMinutes: 1020,
    title: "Dream @ Wings",
    stage: "Commissioner's Cup opener",
    spotlight: false,
    tags: ["Short spread", "1-0 vs 1-0", "Live dog"],
    matchup: [
      { side: "Away", name: "Dream", detail: "1-0 | Slight road favorite | Cleaner opening result" },
      { side: "Home", name: "Wings", detail: "1-0 | Home floor | Live short-number dog" }
    ],
    summary:
      "This is the cleaner coin-flip game on the WNBA slate. Atlanta carries the slightly shorter road price, but both teams enter 1-0 and the spread is still living in one-possession territory.",
    factors: [
      "The Dream only need a small edge in late-game execution to justify the -130 road moneyline.",
      "Dallas gets the home floor and a short enough number that one strong shot-making stretch can flip the script outright.",
      "Because both teams are still early in the sample, this game should be treated as a tradable number, not a certainty board."
    ],
    lean:
      "Lean Dream because the early market and the steadier opening-game base both shade their way, but the number is still compact enough that Dallas remains very live.",
    swing:
      "Swing factor: whether Atlanta can keep the game organized late or let Dallas drag it into a pure one-possession finish.",
    odds: makeBoardOdds({
      spread: "Dream -2.5 (-105) / Wings +2.5 (-115)",
      total: "O179.5 (-112) / U179.5 (-108)",
      moneyline: "Dream -130 / Wings +110"
    })
  },
  {
    id: "liberty-fire-2026-05-12",
    league: "WNBA",
    start: "7:00 PM PT",
    startMinutes: 1140,
    title: "Liberty @ Fire",
    stage: "Commissioner's Cup opener",
    spotlight: true,
    tags: ["Heavy favorite", "Expansion spot", "Liberty tier"],
    matchup: [
      { side: "Away", name: "Liberty", detail: "2-0 | Road powerhouse | Double-digit favorite" },
      { side: "Home", name: "Fire", detail: "0-1 | Home underdog | Expansion script" }
    ],
    summary:
      "New York is the clearest WNBA side on the board. The Liberty arrive 2-0, the price is sitting at -950, and the spread says the market still sees a meaningful class gap even on the road.",
    factors: [
      "The Liberty bring the cleanest roster-tier and system-trust profile on the current WNBA board.",
      "Portland's home environment can still create some energy swings, but the Fire need the game to stay compressed far longer than the number expects.",
      "When the spread is already past two possessions, the real question is less who is better and more whether the favorite plays a clean enough full forty."
    ],
    lean:
      "Lean Liberty because this is still the biggest talent and continuity gap on the WNBA slate, even with the road setting.",
    swing:
      "Swing factor: whether New York keeps the game professional from the opening quarter or lets the home underdog hang around the spread.",
    odds: makeBoardOdds({
      spread: "Liberty -12.5 (-115) / Fire +12.5 (-105)",
      total: "O174.5 (-105) / U174.5 (-115)",
      moneyline: "Liberty -950 / Fire +625"
    })
  },
  {
    id: "lynx-mercury-2026-05-12",
    league: "WNBA",
    start: "7:00 PM PT",
    startMinutes: 1140,
    title: "Lynx @ Mercury",
    stage: "Commissioner's Cup opener",
    spotlight: false,
    tags: ["Mercury edge", "Bounce-back spot", "Medium variance"],
    matchup: [
      { side: "Away", name: "Lynx", detail: "0-1 | Bounce-back road spot | Plus money" },
      { side: "Home", name: "Mercury", detail: "1-1 | Home favorite | Better current number" }
    ],
    summary:
      "Phoenix holds the cleaner current number in the late WNBA window, but the price still leaves room for Minnesota if the Lynx stabilize after the 0-1 start.",
    factors: [
      "The Mercury are dealing as the home favorite at -192 and only need a modestly cleaner closing script to justify it.",
      "Minnesota is still live because the dog path only needs one stronger road shot-making stretch to put pressure on a medium spread.",
      "This game is less certain than the Liberty board and should be treated more like a shaped lean than a lock."
    ],
    lean:
      "Lean Mercury because the home floor and current price both favor Phoenix, but this is still a medium-variance spot rather than a flat favorite auto-click.",
    swing:
      "Swing factor: whether Phoenix can hold the game in its preferred half-court rhythm or let Minnesota turn it into a looser back-and-forth.",
    odds: makeBoardOdds({
      spread: "Lynx +4.5 (-115) / Mercury -4.5 (-105)",
      total: "O169.5 (-108) / U169.5 (-112)",
      moneyline: "Lynx +160 / Mercury -192"
    })
  }
]

const modeledGames = [
  ...rawGames.map((game) => createSportsMatchModel(buildRawGame(enrichRawGame(game)), oddsMeta.provider)),
  ...basketballGames.map((game) => createSportsMatchModel(game, game.odds.provider)),
  ...wnbaGames.map((game) => createSportsMatchModel(game, game.odds.provider))
]

export const games = modeledGames.sort(
  (left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title)
)

import { createSportsMatchModel } from "./sports-model.js"
import {
  lineupMatchupContextByGame,
  teamBullpenContextByTeam,
  teamOffenseContextByTeam
} from "./mlb-context-2026-05-13.js"
import {
  parkContextByHomeTeam,
  rawGames,
  standingsContextByTeam
} from "./day-2026-05-13-mlb-data.js"

export const slateMeta = {
  title: "Wednesday Trading Board",
  date: "May 13, 2026",
  isoDate: "2026-05-13",
  timeZone: "America/Los_Angeles",
  subtitle:
    "A live May 13 remaining-games board with 13 MLB games, one NBA playoff game, and four WNBA games, refreshed from official MLB starters, current market boards, and current playoff context.",
  notes: [
    "This pass intentionally excludes the first two MLB games because the official MLB feed had Yankees at Orioles and Angels at Guardians already in progress on the 11:25 AM PT refresh.",
    "BallparkPal still redirected to a checkout wall on the May 13 pull, so the MLB model is again running without day-of lineup-vs-starter grades instead of inventing them.",
    "The MLB read leans harder on full-game chain quality today, especially bullpen escape hatches and whether a favorite is carrying a real losing-streak penalty into the price.",
    "Cavaliers at Pistons is now a tied 2-2 series, so the NBA card has been rolled forward from the old Detroit-leads version instead of leaving stale leverage context in place.",
    "WNBA is fully active today with four games, including two short-number spots where the model is intentionally treating late-game fragility as part of the story."
  ]
}

export const filters = ["All", "MLB", "NBA", "WNBA"]

export const oddsMeta = {
  provider: "Mixed official league data + live board snapshots",
  snapshot: "May 13, 2026, 11:25 AM PT",
  note:
    "MLB, NBA, and WNBA prices are wired to the current ScoresAndOdds board. MLB analysis uses official schedule and probable-pitcher data plus standings, offense, bullpen, and Statcast park factors, while BallparkPal lineup context was unavailable on this pull."
}

export const sources = [
  { label: "MLB probable pitchers", url: "https://www.mlb.com/probable-pitchers" },
  {
    label: "MLB schedule API for May 13, 2026",
    url: "https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-13&hydrate=probablePitcher,team"
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
    label: "Pistons vs Cavaliers Game 1 official PDF box score",
    url: "https://statsdmz.nba.com/pdfs/20260505/20260505_CLEDET_book.pdf"
  },
  {
    label: "Pistons vs Cavaliers Game 2 official PDF box score",
    url: "https://statsdmz.nba.com/pdfs/20260507/20260507_CLEDET_book.pdf"
  },
  {
    label: "Pistons vs Cavaliers Game 3 official PDF box score",
    url: "https://statsdmz.nba.com/pdfs/20260509/20260509_DETCLE_book.pdf"
  },
  {
    label: "Pistons vs Cavaliers Game 4 official PDF box score",
    url: "https://statsdmz.nba.com/pdfs/20260511/20260511_DETCLE_book.pdf"
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
    "Current board snapshot from ScoresAndOdds on the May 13 late-morning refresh. This price layer is meant to sit beside the model read, not replace it.",
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
    id: "cavaliers-pistons-g5",
    league: "NBA",
    start: "5:00 PM PT",
    startMinutes: 1020,
    title: "Cavaliers @ Pistons",
    stage: "East semifinal Game 5",
    spotlight: true,
    tags: ["Series tied 2-2", "Mitchell pressure", "Home-floor swing"],
    matchup: [
      { side: "Away", name: "Cavaliers", detail: "Mitchell | Harden | Allen | Series tied 2-2" },
      { side: "Home", name: "Pistons", detail: "Cunningham | Harris | Duren | Home Game 5" }
    ],
    summary:
      "The series is back in Detroit tied 2-2 after Cleveland answered both Pistons opening wins with two response games of its own. That makes tonight less about a broad team-quality debate and more about whose lead creators and support scoring hold up under the first true swing game of the series.",
    factors: [
      "Detroit still owns the slight scoring edge through four games, 107.5 to 106.5, and Cade Cunningham has been the steadier full-series organizer.",
      "Cleveland's comeback path is real because Donovan Mitchell and James Harden just combined to flip Game 4, showing the Cavaliers can win the shot-creation battle outright when Mitchell gets downhill and the secondary playmaking lands behind him.",
      "With the series now even and the current number only laying four, this is a leverage game where late-game trust matters more than regular-season reputation."
    ],
    lean:
      "Lean Pistons because the home floor and Cade's cleaner possession-by-possession control still make Detroit the slightly safer side, but this is no longer the kind of series where Cleveland winning tonight would count as a surprise.",
    swing:
      "Swing factor: whether Detroit can keep Mitchell out of another 40-plus scoring gear or let Cleveland's stars turn this into a pure shot-making contest.",
    seriesBreakdown: {
      kicker: "Playoff series to date",
      title: "Why the first real swing game sits on Detroit's floor",
      record: "Series tied 2-2",
      recap:
        "Detroit took the first two games by being the cleaner full-possession team, then Cleveland answered with back-to-back home wins to even the series. The Pistons still have the steadier transition and control script, but Mitchell's takeover in Game 4 reminded everyone that the Cavs can still bend a game through pure top-end shot creation when the support minutes stop leaking.",
      seriesStats: [
        "DET 107.5 PPG | CLE 106.5 PPG",
        "Cade Cunningham: 23.5 PPG | 8.3 APG through 4 games",
        "Donovan Mitchell: 30-point average with a 43-point Game 4",
        "Game 5 price: DET -180 | CLE +150"
      ],
      boxScores: [
        {
          label: "Game 1",
          date: "May 5, 2026",
          result: "Pistons 111, Cavaliers 101",
          notes: [
            "Detroit blew the game open with a 37-point first quarter and never let Cleveland fully own the pace.",
            "The Pistons turned 20 Cavaliers turnovers into 31 points, which set the tone for the whole early series script.",
            "Cleveland had isolated scoring stretches, but Detroit looked cleaner across the entire possession chain."
          ],
          leaders: [
            { team: "Pistons leaders", lines: ["Cade Cunningham: 23 points, 7 assists", "Tobias Harris: 20 points", "Duncan Robinson: 19 points", "Jalen Duren: 11 points, 12 rebounds"] },
            { team: "Cavaliers leaders", lines: ["Donovan Mitchell: 23 points", "James Harden: 22 points, 7 assists", "Max Strus: 19 points"] }
          ]
        },
        {
          label: "Game 2",
          date: "May 7, 2026",
          result: "Pistons 107, Cavaliers 97",
          notes: [
            "Detroit again kept Cleveland under 100 and won the more efficient perimeter possessions.",
            "Mitchell scored 31, but the Pistons still looked more connected late and kept finding support scoring.",
            "This was the second straight proof that Detroit's underdog route was not just a one-game punch."
          ],
          leaders: [
            { team: "Pistons leaders", lines: ["Cade Cunningham: 25 points, 10 assists", "Tobias Harris: 21 points", "Duncan Robinson: 17 points", "Caris LeVert: 14 points"] },
            { team: "Cavaliers leaders", lines: ["Donovan Mitchell: 31 points", "Jarrett Allen: 22 points", "Evan Mobley: 9 points"] }
          ]
        },
        {
          label: "Game 3",
          date: "May 9, 2026",
          result: "Cavaliers 116, Pistons 109",
          notes: [
            "Cleveland finally got its first home response behind a 35-point Mitchell game and much better offensive efficiency.",
            "Detroit still got a triple-double from Cunningham and 60 paint points, so the Pistons never really stopped being live.",
            "This was the first hard proof that the Cavaliers could punish Detroit without fully winning the transition script."
          ],
          leaders: [
            { team: "Cavaliers leaders", lines: ["Donovan Mitchell: 35 points, 10 rebounds", "James Harden: 19 points, 7 assists", "Jarrett Allen: 18 points"] },
            { team: "Pistons leaders", lines: ["Cade Cunningham: 27 points, 10 rebounds, 10 assists", "Tobias Harris: 21 points", "Paul Reed: 11 points"] }
          ]
        },
        {
          label: "Game 4",
          date: "May 11, 2026",
          result: "Cavaliers 112, Pistons 103",
          notes: [
            "Cleveland's stars finally bent a full game the way the Cavs needed, with Mitchell detonating in the second half and Harden steering the offense underneath him.",
            "Detroit still made the game playable into the late stages, but the Pistons could not match Cleveland's top-end shot creation once the Cavaliers found rhythm.",
            "The result matters because it changed the series from Detroit control to a true coin-flip swing game."
          ],
          leaders: [
            { team: "Cavaliers leaders", lines: ["Donovan Mitchell: 43 points", "James Harden: 24 points, 11 assists", "Jarrett Allen: interior control minutes"] },
            { team: "Pistons leaders", lines: ["Cade Cunningham: lead-creator load", "Tobias Harris: support scoring", "Detroit needed steadier closing offense"] }
          ]
        }
      ],
      playerAnalysis: [
        "Cade Cunningham is still the cleanest full-series engine because Detroit's half-court possessions keep looking more organized when the game gets tight.",
        "Donovan Mitchell just reminded the whole series that Cleveland still owns the biggest single-game scoring ceiling on the floor.",
        "James Harden's Game 4 playmaking matters because it finally gave Cleveland another stable source of creation underneath Mitchell's burst.",
        "Tobias Harris and Detroit's support pieces still matter because the Pistons do not need Cade to solve every offensive trip by himself when the secondary scoring shows up.",
        "Jarrett Allen and the interior battle stay important because this series keeps toggling between Detroit control possessions and Cleveland shot-making punches."
      ],
      sources: [
        { label: "NBA playoffs schedule", url: "https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true" },
        { label: "Game 1 official PDF box score", url: "https://statsdmz.nba.com/pdfs/20260505/20260505_CLEDET_book.pdf" },
        { label: "Game 2 official PDF box score", url: "https://statsdmz.nba.com/pdfs/20260507/20260507_CLEDET_book.pdf" },
        { label: "Game 3 official PDF box score", url: "https://statsdmz.nba.com/pdfs/20260509/20260509_DETCLE_book.pdf" },
        { label: "Game 4 official PDF box score", url: "https://statsdmz.nba.com/pdfs/20260511/20260511_DETCLE_book.pdf" }
      ]
    },
    odds: makeBoardOdds({
      spread: "Cavaliers +4 (-110) / Pistons -4 (-110)",
      total: "O222.5 (-110) / U222.5 (-110)",
      moneyline: "Cavaliers +150 / Pistons -180"
    })
  }
]

const wnbaGames = [
  {
    id: "storm-tempo-2026-05-13",
    league: "WNBA",
    start: "4:00 PM PT",
    startMinutes: 960,
    title: "Storm @ Tempo",
    stage: "Commissioner's Cup window",
    spotlight: false,
    tags: ["Short favorite", "Expansion spot", "Late-game variance"],
    matchup: [
      { side: "Away", name: "Storm", detail: "1-1 | Slight road dog | Veteran guard pressure" },
      { side: "Home", name: "Tempo", detail: "0-1 | Expansion home floor | Favored by market" }
    ],
    summary:
      "Toronto is getting a real home-floor vote in a compact number, but this is exactly the kind of early-season WNBA spot where a short favorite can still get dragged into a one-possession finish.",
    factors: [
      "The current board is asking Toronto to justify a short favorite price in just the second live read on the franchise.",
      "Seattle is still live because the veteran perimeter core can absolutely keep this inside one or two late possessions.",
      "This is the kind of board where protecting against lead fragility matters more than pretending either side owns a huge talent gap."
    ],
    lean:
      "Lean Tempo because the home setup and current market shape shade that way, but the edge is narrow and Seattle is exactly the kind of dog that can flip a short number late.",
    swing:
      "Swing factor: whether Toronto can keep control once the game reaches closing-time guard possessions.",
    odds: makeBoardOdds({
      spread: "Storm +2.5 (-112) / Tempo -2.5 (-108)",
      total: "O163.5 (-108) / U163.5 (-112)",
      moneyline: "Storm +130 / Tempo -155"
    })
  },
  {
    id: "aces-sun-2026-05-13",
    league: "WNBA",
    start: "5:00 PM PT",
    startMinutes: 1020,
    title: "Aces @ Sun",
    stage: "Commissioner's Cup window",
    spotlight: true,
    tags: ["Heavy favorite", "Class gap", "Spread discipline"],
    matchup: [
      { side: "Away", name: "Aces", detail: "1-1 | Road powerhouse | Big favorite" },
      { side: "Home", name: "Sun", detail: "0-2 | Home underdog | Needing a pace break" }
    ],
    summary:
      "Las Vegas is the clearest straight-up side on the WNBA board, but the spread is already deep enough that the real question is game professionalism rather than team quality.",
    factors: [
      "The Aces still own the better top-end talent and the cleaner closing hierarchy, which is why the moneyline is already deep into favorite territory.",
      "Connecticut's only real path is to compress the game and make Las Vegas play a lower-possession, less clean favorite script for a full forty.",
      "After the WNBA leads that evaporated yesterday, this is exactly the kind of spot where the side can be right while the spread still gets noisy."
    ],
    lean:
      "Lean Aces because the class gap is still too real to ignore, but this is stronger as a winner read than as an automatic spread click.",
    swing:
      "Swing factor: whether Las Vegas builds enough separation early to keep Connecticut from turning this into a slow, annoying fourth quarter.",
    odds: makeBoardOdds({
      spread: "Aces -14.5 (-110) / Sun +14.5 (-110)",
      total: "O168.5 (-110) / U168.5 (-110)",
      moneyline: "Aces -1100 / Sun +700"
    })
  },
  {
    id: "sky-valkyries-2026-05-13",
    league: "WNBA",
    start: "7:00 PM PT",
    startMinutes: 1140,
    title: "Sky @ Valkyries",
    stage: "Commissioner's Cup window",
    spotlight: false,
    tags: ["Home momentum", "2-0 start", "Favored debut group"],
    matchup: [
      { side: "Away", name: "Sky", detail: "1-0 | Road underdog | Need cleaner close" },
      { side: "Home", name: "Valkyries", detail: "2-0 | Home favorite | Expansion energy still live" }
    ],
    summary:
      "Golden State is getting the market vote again, and the 2-0 start plus home building energy explain why. The catch is that a mid-range WNBA favorite still needs to survive the late-game noise that keeps showing up around these short-to-medium numbers.",
    factors: [
      "The Valkyries have already shown enough early belief and crowd juice to justify home-favorite status against a Chicago group still proving what travels.",
      "Chicago is still live because this number is not too large for one good perimeter stretch to pull the favorite back into a close finish.",
      "This board is more about whether Golden State can keep control than whether the underdog lacks a path."
    ],
    lean:
      "Lean Valkyries because the current board, the unbeaten start, and the home environment are all leaning the same way.",
    swing:
      "Swing factor: whether Golden State keeps the game in its preferred tempo or lets Chicago drag it into a late trading range.",
    odds: makeBoardOdds({
      spread: "Sky +5.5 (-110) / Valkyries -5.5 (-110)",
      total: "O160.5 (-108) / U160.5 (-112)",
      moneyline: "Sky +200 / Valkyries -245"
    })
  },
  {
    id: "fever-sparks-2026-05-13",
    league: "WNBA",
    start: "7:30 PM PT",
    startMinutes: 1170,
    title: "Fever @ Sparks",
    stage: "Commissioner's Cup window",
    spotlight: false,
    tags: ["Short spread", "Bounce-back spot", "High lead fragility"],
    matchup: [
      { side: "Away", name: "Fever", detail: "0-1 | Slight road favorite | Need steadier close" },
      { side: "Home", name: "Sparks", detail: "0-1 | Home dog | One-possession path" }
    ],
    summary:
      "This is the most fragile WNBA number on the board. Indiana is only laying a tiny road price, which means neither side needs much to flip the outcome once the fourth quarter gets messy.",
    factors: [
      "Indiana still gets the nod because the market is asking the Fever to be slightly cleaner in the possessions that decide the game.",
      "Los Angeles remains very live because a short home dog only needs one or two good late-game sequences to flip everything.",
      "After yesterday's blown-lead reads, this is the exact kind of spot where we should treat the favorite as a lean, not a lock."
    ],
    lean:
      "Lean Fever because the current board still gives Indiana the smaller quality edge, but this is one of the widest-variance favorites on the whole slate.",
    swing:
      "Swing factor: whether Indiana can actually close cleanly if the game is inside one possession in the final two minutes.",
    odds: makeBoardOdds({
      spread: "Fever -1.5 (-112) / Sparks +1.5 (-108)",
      total: "O168.5 (-110) / U168.5 (-110)",
      moneyline: "Fever -120 / Sparks +100"
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

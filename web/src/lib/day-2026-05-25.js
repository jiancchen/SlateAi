import { createSportsMatchModel } from './sports-model.js'
import { buildTennistonicH2HUrl } from './tennis-source-mapping.js'
import { rawGames, bullpenChainByTeam } from './day-2026-05-25-data.js'
import {
  standingsContextByTeam,
  teamOffenseContextByTeam,
  teamBullpenContextByTeam,
  teamSavantContextByTeam
} from './mlb-context-2026-05-25.js'
import { lineupBoardsByGameId, lineupMatchupContextByGameId } from './day-2026-05-25-lineups.js'
import { parkContextByHomeTeam } from './day-2026-05-13-mlb-data.js'
import tennisClayContext from './day-2026-05-25-tennis-clay-context.generated.json' with { type: 'json' }
import tennisOpponentQualityContext from './day-2026-05-25-tennis-opponent-quality.generated.json' with { type: 'json' }

const oddsProvider = 'Roland Garros desk board'
const mlbOddsProvider = 'Official MLB data + ScoresAndOdds live board'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const formatPct = (value) => (Number.isFinite(value) ? `${Math.round(value)}%` : 'n/a')

const market = (label, book, value) => ({ label, book, value })

const buildMlbBoardOdds = ({ spread = '', total = '', moneyline = '', provider = mlbOddsProvider }) => ({
  participantOrder: [0, 1],
  markets: [
    ...(spread ? [market('Spread', provider, spread)] : []),
    ...(total ? [market('Total', provider, total)] : []),
    ...(moneyline ? [market('Moneyline', provider, moneyline)] : [])
  ],
  note: 'Board snapshot plus model context.',
  provider
})

const formatPitcherMetric = (value, suffix = '') => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${parsed.toFixed(2)}${suffix}` : `${value || '-'}${suffix}`
}

const pitcherDetail = (pitcher) =>
  `${pitcher.fullName} (${pitcher.pitchHand || '?'}HP) | ${pitcher.wins}-${pitcher.losses} | ${pitcher.era} ERA | ${pitcher.strikeOuts} SO | ${formatPitcherMetric(pitcher.whip, ' WHIP')} | ${pitcher.inningsPitched} IP`

const getWindowLabel = (startMinutes = 0) => {
  if (startMinutes < 720) return 'Morning MLB Board'
  if (startMinutes < 900) return 'Afternoon MLB Board'
  return 'Evening MLB Board'
}

const buildMlbGame = (raw, instanceIndex = 0) => {
  const uniqueId = instanceIndex > 0 ? `${raw.id}-${raw.gamePk}` : raw.id
  const factors = [
    `Current board: ${raw.moneyline} | ${raw.total} | ${raw.spread}.`,
    `${raw.awayPitcher.fullName} vs ${raw.homePitcher.fullName}.`
  ]

  return createSportsMatchModel(
    {
      id: uniqueId,
      gamePk: Number.isFinite(Number(raw.gamePk)) ? Number(raw.gamePk) : null,
      league: 'MLB',
      title: `${raw.away} @ ${raw.home}`,
      start: raw.start,
      startMinutes: raw.startMinutes,
      stage: getWindowLabel(raw.startMinutes),
      spotlight: false,
      tags: ['MLB'],
      matchup: [
        { side: 'Away', name: raw.away, detail: pitcherDetail(raw.awayPitcher) },
        { side: 'Home', name: raw.home, detail: pitcherDetail(raw.homePitcher) }
      ],
      summary: `${raw.away} @ ${raw.home} with ${raw.awayPitcher.fullName} against ${raw.homePitcher.fullName}.`,
      lean: 'Lean on the modeled side, but respect the split between starter phase and late-game hold.',
      factors,
      swingFactor: 'Swing factor: whether the starter edge survives the bridge innings.',
      teamContext: {
        away: standingsContextByTeam[raw.away] ?? null,
        home: standingsContextByTeam[raw.home] ?? null
      },
      parkContext: parkContextByHomeTeam[raw.home] ?? null,
      offenseContext: {
        away: teamOffenseContextByTeam[raw.away] ?? null,
        home: teamOffenseContextByTeam[raw.home] ?? null
      },
      bullpenContext: {
        away: teamBullpenContextByTeam[raw.away] ?? null,
        home: teamBullpenContextByTeam[raw.home] ?? null
      },
      bullpenChainContext: {
        away: bullpenChainByTeam[raw.away] ?? null,
        home: bullpenChainByTeam[raw.home] ?? null
      },
      savantContext: {
        away: teamSavantContextByTeam[raw.away] ?? null,
        home: teamSavantContextByTeam[raw.home] ?? null
      },
      storyContext: {
        away: null,
        home: null
      },
      tierTwoContext: raw.tierTwoContext ?? null,
      tierThreeContext: raw.tierThreeContext ?? null,
      stateContext: raw.stateContext ?? null,
      lineupContext: lineupMatchupContextByGameId[raw.id] ?? null,
      lineupBoard: lineupBoardsByGameId[raw.id] ?? null,
      starterContext: { away: raw.awayPitcher, home: raw.homePitcher },
      pitcherSourceNote: raw.pitcherSourceNote || '',
      odds: buildMlbBoardOdds({
        spread: raw.spread,
        total: raw.total,
        moneyline: raw.moneyline,
        provider: mlbOddsProvider
      })
    },
    mlbOddsProvider
  )
}

const buildPredictionOnlyOdds = () => ({
  participantOrder: [0, 1],
  markets: [],
  note:
    'This Roland Garros board is a prediction desk built from official Day 2 scheduling, ATP/WTA context, and manual matchup reads. Any visible percentages are context only, not sportsbook prices.',
  provider: oddsProvider
})

const buildPlayerDetail = (player) => {
  const parts = []
  if (player.profile) parts.push(player.profile)
  if (Number.isFinite(player.boardPct)) parts.push(`Board ${formatPct(player.boardPct)}`)
  return parts.join(' | ')
}

const buildComparisonRows = ({ playerA, playerB, pick, confidence, volatility }) => {
  const pickIsA = pick.name === playerA.name
  const deskLeft = pickIsA ? confidence : 100 - confidence
  const deskRight = pickIsA ? 100 - confidence : confidence
  const stabilityLeft = pickIsA ? 100 - volatility : volatility
  const stabilityRight = pickIsA ? volatility : 100 - volatility

  const rows = []

  if (Number.isFinite(playerA.boardPct) && Number.isFinite(playerB.boardPct)) {
    rows.push({
      label: 'Community board',
      metric: 'Crowd split',
      leftScore: clamp(Math.round(playerA.boardPct), 0, 100),
      rightScore: clamp(Math.round(playerB.boardPct), 0, 100),
      leftLabel: playerA.name,
      rightLabel: playerB.name,
      winner:
        Math.round(playerA.boardPct) === Math.round(playerB.boardPct)
          ? 'Even'
          : playerA.boardPct > playerB.boardPct
            ? playerA.name
            : playerB.name
    })
  }

  rows.push(
    {
      label: 'Desk lean',
      metric: 'Confidence split',
      leftScore: clamp(Math.round(deskLeft), 0, 100),
      rightScore: clamp(Math.round(deskRight), 0, 100),
      leftLabel: playerA.name,
      rightLabel: playerB.name,
      winner: pick.name
    },
    {
      label: 'Script stability',
      metric: 'Lower chaos side',
      leftScore: clamp(Math.round(stabilityLeft), 0, 100),
      rightScore: clamp(Math.round(stabilityRight), 0, 100),
      leftLabel: playerA.name,
      rightLabel: playerB.name,
      winner: pick.name
    }
  )

  return rows
}

const buildProjection = ({ format, pick, confidence, volatility }) => {
  const bestOfFive = format === 'ATP'
  const upsetRisk = clamp(Math.round(volatility * 0.55 + (100 - confidence) * 0.45), 16, 84)
  const straightSetsProbability = clamp(
    Math.round(confidence + (bestOfFive ? -8 : 2) - volatility * 0.22),
    bestOfFive ? 28 : 36,
    bestOfFive ? 74 : 82
  )

  if (bestOfFive) {
    if (confidence >= 74 && volatility <= 52) {
      return {
        projectedWinner: pick.name,
        projectedSetLine: '3-0',
        projectedScoreline: '6-4, 6-3, 6-3',
        totalGames: 28,
        straightSetsProbability,
        upsetRisk,
        overview: `${pick.name} is projected to keep this in a fairly clean three-set lane.`,
        fantasy: []
      }
    }

    if (confidence >= 62) {
      return {
        projectedWinner: pick.name,
        projectedSetLine: '3-1',
        projectedScoreline: '6-4, 4-6, 6-3, 6-4',
        totalGames: 39,
        straightSetsProbability,
        upsetRisk,
        overview: `${pick.name} still gets the nod, but the match has enough shape to spill into a real four-set solve.`,
        fantasy: []
      }
    }

    return {
      projectedWinner: pick.name,
      projectedSetLine: '3-2',
      projectedScoreline: '7-5, 4-6, 6-3, 3-6, 6-4',
      totalGames: 47,
      straightSetsProbability,
      upsetRisk,
      overview: `${pick.name} is the desk side, but this is much closer to a five-set pressure match than a comfort favorite.`,
      fantasy: []
    }
  }

  if (confidence >= 72 && volatility <= 56) {
    return {
      projectedWinner: pick.name,
      projectedSetLine: '2-0',
      projectedScoreline: '6-4, 6-3',
      totalGames: 19,
      straightSetsProbability,
      upsetRisk,
      overview: `${pick.name} is projected to keep this in a fairly clean two-set lane.`,
      fantasy: []
    }
  }

  if (confidence >= 60) {
    return {
      projectedWinner: pick.name,
      projectedSetLine: '2-1',
      projectedScoreline: '6-4, 3-6, 6-4',
      totalGames: 29,
      straightSetsProbability,
      upsetRisk,
      overview: `${pick.name} still gets the desk nod, but the match profile looks more like a three-set solve than a cruise.`,
      fantasy: []
    }
  }

  return {
    projectedWinner: pick.name,
    projectedSetLine: '2-1',
    projectedScoreline: '7-5, 4-6, 6-4',
    totalGames: 32,
    straightSetsProbability,
    upsetRisk,
    overview: `${pick.name} is live, but this is much closer to a pressure opener than a stable favorite lane.`,
    fantasy: []
  }
}

const buildTradePlan = ({ playerA, playerB, pick, confidence, volatility, projection, format }) => {
  if (!Number.isFinite(playerA.boardPct) || !Number.isFinite(playerB.boardPct)) return null

  const favorite = playerA.boardPct >= playerB.boardPct ? playerA : playerB
  const dog = favorite === playerA ? playerB : playerA
  const favoriteIsPick = pick.name === favorite.name
  const favoriteDeskPct = clamp(Math.round(favoriteIsPick ? confidence : 100 - confidence), 0, 100)
  const dogDeskPct = clamp(Math.round(favoriteIsPick ? 100 - confidence : confidence), 0, 100)
  const marketGap = Math.round(favorite.boardPct - favoriteDeskPct)
  const dogLift = Math.round(dogDeskPct - dog.boardPct)
  const favoritePrice = clamp(Math.round(favorite.boardPct), 0, 100)
  const dogPrice = clamp(Math.round(dog.boardPct), 0, 100)
  const projectedSetLine = projection?.projectedSetLine || ''
  const dogSetPathLive =
    projectedSetLine === '3-1' ||
    projectedSetLine === '3-2' ||
    projectedSetLine === '2-1' ||
    volatility >= 62

  const buildReactionBand = () => {
    if (dogPrice <= 10) return 'Reaction band: roughly 28-40c if the dog holds clean and pushes the favorite into a real first-set scoreboard.'
    if (dogPrice <= 18) return 'Reaction band: roughly 25-36c if the dog gets through the first service turns clean or breaks first.'
    if (dogPrice <= 28) return 'Reaction band: roughly 30-45c if the opener stays on script for the dog through the first set.'
    return 'Reaction band: roughly 35-55c if the dog gets the early scoreboard leverage.'
  }

  if (favoritePrice >= 85 && dogSetPathLive) {
    return {
      laneLabel: '4-4 dog scalp',
      tone: 'warning',
      entrySideName: dog.name,
      favoriteName: favorite.name,
      headline: `${dog.name} is cheap enough to trade even without needing the full upset.`,
      summary: `${favorite.name} is priced like a near-lock at ${favoritePrice}%, but this match still has enough shape for ${dog.name} to hold early or steal a set. The trading edge is the price compression, not the outright result.`,
      trigger: `${dog.name} keeps the first set on serve through the 4-4 window, holds the first couple service turns clean, or lands the first break.`,
      exit: buildReactionBand(),
      marketGap,
      dogLift,
      favoriteMarketPct: favoritePrice,
      dogMarketPct: dogPrice
    }
  }

  if (favoritePrice >= 75 && volatility >= 58) {
    return {
      laneLabel: 'Inflated favorite',
      tone: 'danger',
      entrySideName: dog.name,
      favoriteName: favorite.name,
      headline: `${favorite.name} looks overpriced for a match this noisy.`,
      summary: `${favorite.name} is sitting at ${favoritePrice}% on the board, but the volatility says this is not a clean cruise lane. ${dog.name} does not need to win the whole match for the contract to re-rate in a useful way.`,
      trigger: `${dog.name} keeps the first set alive through the 4-4 zone, stretches return games, or simply avoids an early scoreboard collapse.`,
      exit: buildReactionBand(),
      marketGap,
      dogLift,
      favoriteMarketPct: favoritePrice,
      dogMarketPct: dogPrice
    }
  }

  if (dogPrice <= 35 && dogLift >= 6) {
    return {
      laneLabel: 'Live dog scalp',
      tone: 'accent',
      entrySideName: dog.name,
      favoriteName: favorite.name,
      headline: `${dog.name} is livelier than the board price suggests.`,
      summary: `${dog.name} is only ${dogPrice}% on the public board, but the desk sees a much more competitive path. This is closer to a live underdog than a dead longshot.`,
      trigger: `${dog.name} turns the first set into a serve-by-serve fight, keeps it on serve toward 4-4, and makes the favorite play real pressure points early.`,
      exit: buildReactionBand(),
      marketGap,
      dogLift,
      favoriteMarketPct: favoritePrice,
      dogMarketPct: dogPrice
    }
  }

  if (favoritePrice >= 70 && favoriteDeskPct >= favoritePrice && volatility <= 45) {
    return {
      laneLabel: 'Winner only',
      tone: 'neutral',
      entrySideName: favorite.name,
      favoriteName: favorite.name,
      headline: `${favorite.name} looks more like a hold-to-expiry favorite than a trade scalp.`,
      summary: `The board price and the desk read are broadly aligned here, so there is less obvious mispricing to scalp off the opener.`,
      trigger: `Only trade this if you simply want favorite continuation rather than an early mispricing reaction.`,
      exit: 'No obvious dog compression lane.',
      marketGap,
      dogLift,
      favoriteMarketPct: favoritePrice,
      dogMarketPct: dogPrice
    }
  }

  return {
    laneLabel: 'On-serve scalp',
    tone: 'neutral',
    entrySideName: dog.name,
    favoriteName: favorite.name,
    headline: `This match is more of an in-play read than a clean pre-match favorite hold.`,
    summary: `The board is not wildly off on price, but the match still has enough early noise that the first set should matter more than the pre-match winner call.`,
    trigger: `${dog.name} needs to stay on serve early, keep the opener live into the 4-4 range, and force the favorite to earn the first real break.`,
    exit: buildReactionBand(),
    marketGap,
    dogLift,
    favoriteMarketPct: favoritePrice,
    dogMarketPct: dogPrice
  }
}

const makeRolandGarrosMatch = ({
  id,
  start,
  startMinutes,
  format,
  playerA,
  playerB,
  pickName,
  confidence,
  volatility,
  angle,
  swing,
  tags = [],
  spotlight = false
}) => {
  const pick = pickName === playerA.name ? playerA : playerB
  const hasBoardSplit = Number.isFinite(playerA.boardPct) && Number.isFinite(playerB.boardPct)
  const h2hUrl = buildTennistonicH2HUrl(playerA.name, playerB.name)
  const comparisonRows = buildComparisonRows({ playerA, playerB, pick, confidence, volatility })
  const projection = buildProjection({ format, pick, confidence, volatility })
  const tradePlan = buildTradePlan({ playerA, playerB, pick, confidence, volatility, projection, format })
  const event = format === 'ATP' ? 'Roland Garros Men' : 'Roland Garros Women'

  const summary = hasBoardSplit
    ? `${pick.name} gets the desk lean because ${angle}. The crowd board is ${formatPct(playerA.boardPct)} / ${formatPct(playerB.boardPct)}, so this read is using the split as context rather than treating the bigger name as automatic.`
    : `${pick.name} gets the desk lean because ${angle}. This is a schedule-driven Day 2 read without a saved public split on the board.`

  const factors = [
    `${playerA.name}: ${playerA.note}`,
    `${playerB.name}: ${playerB.note}`,
    `Clay desk angle: ${angle}.`,
    `Swing factor: ${swing}`
  ]

  if (hasBoardSplit) {
    factors.unshift(
      `Community board split: ${playerA.name} ${formatPct(playerA.boardPct)} vs ${playerB.name} ${formatPct(playerB.boardPct)}. This is market-shape context only, not a sportsbook line.`
    )
  }

  return createSportsMatchModel(
    {
      id,
      league: 'Tennis',
      start,
      startMinutes,
      title: `${playerA.name} vs ${playerB.name}`,
      stage: `${event} | Round 1`,
      spotlight: spotlight || confidence >= 72,
      confidence,
      volatility,
      tags: ['Clay', 'Roland Garros', ...tags],
      matchup: [
        { side: 'Player 1', name: playerA.name, displayName: playerA.name, detail: buildPlayerDetail(playerA) },
        { side: 'Player 2', name: playerB.name, displayName: playerB.name, detail: buildPlayerDetail(playerB) }
      ],
      summary,
      factors,
      lean: `Lean ${pick.name} because ${angle}.`,
      swing: `Swing factor: ${swing}`,
      odds: buildPredictionOnlyOdds(),
      tennisContext: {
        surface: 'Clay',
        h2hLeader: '',
        fatigueFlag: false,
        liveDog:
          Number.isFinite(playerA.boardPct) && Number.isFinite(playerB.boardPct)
            ? pick.boardPct < (pick.name === playerA.name ? playerB.boardPct : playerA.boardPct)
            : false,
        players: [
          {
            name: playerA.name,
            rank: null,
            label: playerA.name,
            form: null,
            boardPct: Number.isFinite(playerA.boardPct) ? playerA.boardPct : null,
            decimalOdds: null,
            marketLabel: Number.isFinite(playerA.boardPct) ? `Board ${formatPct(playerA.boardPct)}` : 'Desk only',
            clayLine: playerA.profile || 'Roland Garros desk read',
            record2026: playerA.recordTag || '',
            notes: playerA.note,
            matchupNote: pick.name === playerA.name ? `${playerA.name} is the desk lean.` : `${playerA.name} is live only if the upset script shows up early.`
          },
          {
            name: playerB.name,
            rank: null,
            label: playerB.name,
            form: null,
            boardPct: Number.isFinite(playerB.boardPct) ? playerB.boardPct : null,
            decimalOdds: null,
            marketLabel: Number.isFinite(playerB.boardPct) ? `Board ${formatPct(playerB.boardPct)}` : 'Desk only',
            clayLine: playerB.profile || 'Roland Garros desk read',
            record2026: playerB.recordTag || '',
            notes: playerB.note,
            matchupNote: pick.name === playerB.name ? `${playerB.name} is the desk lean.` : `${playerB.name} is live only if the upset script shows up early.`
          }
        ],
        comparisonRows,
        projection,
        tradePlan,
        clayMatchupData: tennisClayContext.matches?.[id] ?? null,
        opponentQualityData: tennisOpponentQualityContext.matches?.[id] ?? null,
        researchLinks: [
          { label: 'ESPN scoreboard', url: 'https://www.espn.com/tennis/scoreboard' },
          { label: 'Tennistonic H2H', url: h2hUrl }
        ],
        formEdgeName: pick.name
      },
      playerAnalysis: [
        `${pick.name} is the desk side because ${angle}.`,
        `${playerA.name} note: ${playerA.note}`,
        `${playerB.name} note: ${playerB.note}`,
        ...(tradePlan ? [`Market trade lane: ${tradePlan.summary}`] : []),
        `Swing factor: ${swing}`
      ]
    },
    oddsProvider
  )
}

const buildQuickPlayer = ({
  name,
  isPick,
  format,
  profile,
  recordTag,
  note,
  boardPct
}) => ({
  name,
  profile:
    profile ||
    (isPick
      ? format === 'ATP'
        ? 'Cleaner ATP clay lane'
        : 'Stronger current clay lane'
      : 'Needs upset script'),
  recordTag: recordTag || (isPick ? 'Desk side' : 'Needs pressure path'),
  note:
    note ||
    (isPick
      ? `${name} owns the cleaner normal-script path if the opener stays on serve and on terms.`
      : `${name} needs early scoreboard pressure or a messy start to turn this into a real upset lane.`),
  boardPct
})

const makeQuickRolandGarrosMatch = ({
  id,
  start,
  startMinutes,
  format,
  playerAName,
  playerBName,
  pickName,
  confidence,
  volatility,
  angle,
  swing,
  tags = [],
  spotlight = false,
  playerAProfile,
  playerBProfile,
  playerARecordTag,
  playerBRecordTag,
  playerANote,
  playerBNote,
  playerABoardPct,
  playerBBoardPct
}) =>
  makeRolandGarrosMatch({
    id,
    start,
    startMinutes,
    format,
    playerA: buildQuickPlayer({
      name: playerAName,
      isPick: pickName === playerAName,
      format,
      profile: playerAProfile,
      recordTag: playerARecordTag,
      note: playerANote,
      boardPct: playerABoardPct
    }),
    playerB: buildQuickPlayer({
      name: playerBName,
      isPick: pickName === playerBName,
      format,
      profile: playerBProfile,
      recordTag: playerBRecordTag,
      note: playerBNote,
      boardPct: playerBBoardPct
    }),
    pickName,
    confidence,
    volatility,
    angle,
    swing,
    tags,
    spotlight
  })

const featuredMatches = [
  makeRolandGarrosMatch({
    id: 'rg-w-swiatek-jones-2026-05-25',
    start: '3:00 AM PT',
    startMinutes: 180,
    format: 'WTA',
    playerA: {
      name: 'Iga Swiatek',
      profile: 'Four-time Roland Garros champion',
      recordTag: 'Clean favorite lane',
      note: 'Swiatek is still the best pure clay problem on this side of the draw even if her aura is not quite as automatic as it was two years ago.',
      boardPct: 98
    },
    playerB: {
      name: 'Emerson Jones',
      profile: 'Teenage wildcard',
      recordTag: 'Big stage jump',
      note: 'Jones has talent and athletic bloodlines, but this is a huge clay-major jump against the most proven Paris player in the field.',
      boardPct: 2
    },
    pickName: 'Iga Swiatek',
    confidence: 81,
    volatility: 34,
    angle: 'Swiatek still owns the cleanest clay-court control path on the whole Day 2 board',
    swing: 'Only a very flat Swiatek opening set or a truly fearless Jones start makes this noisy.',
    tags: ['Favorite', 'Women'],
    spotlight: true
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-erjavec-rybakina-2026-05-25',
    start: '4:30 AM PT',
    startMinutes: 270,
    format: 'WTA',
    playerA: {
      name: 'Veronika Erjavec',
      profile: 'Qualifier pressure test',
      recordTag: 'Needs chaos path',
      note: 'Erjavec needs scoreboard tension and enough cheap points to stop this from becoming a power mismatch.',
      boardPct: 3
    },
    playerB: {
      name: 'Elena Rybakina',
      profile: 'Top-end power favorite',
      recordTag: 'Cleaner weapons edge',
      note: 'Rybakina’s serve-plus-first-ball profile should matter even on clay as long as she keeps the error count in range.',
      boardPct: 98
    },
    pickName: 'Elena Rybakina',
    confidence: 74,
    volatility: 45,
    angle: 'Rybakina has too much first-strike quality if this stays in a normal round-one script',
    swing: 'If the clay drags her into long neutral rallies and the serve dips, the favorite lane narrows fast.',
    tags: ['Favorite', 'Women']
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-rinderknech-rodionov-2026-05-25',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'ATP',
    playerA: {
      name: 'Arthur Rinderknech',
      profile: 'French home edge',
      recordTag: 'Moderate ATP lean',
      note: 'Rinderknech gets home support and the more repeatable first-strike pattern if he stays on the front foot.',
      boardPct: 76
    },
    playerB: {
      name: 'Jurij Rodionov',
      profile: 'Live if physical',
      recordTag: 'Spoiler path only',
      note: 'Rodionov needs the match to turn messy and physical because the cleaner pressure lane sits with the Frenchman.',
      boardPct: 26
    },
    pickName: 'Arthur Rinderknech',
    confidence: 61,
    volatility: 61,
    angle: 'Rinderknech gets the more natural home-clay opening script without needing to do anything too exotic',
    swing: 'If Rodionov extends points and takes away the first strike, this falls back toward coin-flip territory.',
    tags: ['Men']
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-svitolina-bondar-2026-05-25',
    start: '4:00 AM PT',
    startMinutes: 240,
    format: 'WTA',
    playerA: {
      name: 'Elina Svitolina',
      profile: 'Rome champion',
      recordTag: 'Clean current-form lane',
      note: 'Svitolina arrives with the strongest current clay résumé on this section of the women’s Day 2 board.',
      boardPct: 86
    },
    playerB: {
      name: 'Anna Bondar',
      profile: 'Clay-capable underdog',
      recordTag: 'Needs serving day',
      note: 'Bondar can hang if the serve earns enough free looks, but the all-court consistency edge sits with Svitolina.',
      boardPct: 16
    },
    pickName: 'Elina Svitolina',
    confidence: 76,
    volatility: 39,
    angle: 'Svitolina has the best current-form foundation on the women’s Day 2 board outside the top title favorites',
    swing: 'If Bondar gets first-strike control and keeps Svitolina from extending patterns, the match can get tighter than expected.',
    tags: ['Favorite', 'Women'],
    spotlight: true
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-rakotomanga-anisimova-2026-05-25',
    start: '5:30 AM PT',
    startMinutes: 330,
    format: 'WTA',
    playerA: {
      name: 'Tiantsoa Rakotomanga Rajaonah',
      profile: 'French clay riser',
      recordTag: 'Live upset lane',
      note: 'Rakotomanga Rajaonah gets the clay time she wants and the local support that can turn this into a real pressure opener.'
    },
    playerB: {
      name: 'Amanda Anisimova',
      profile: 'Higher-ceiling hitter',
      recordTag: 'Wrist question',
      note: 'Anisimova has the bigger raw ball, but the wrist and layoff make this much less clean than a name-only read.'
    },
    pickName: 'Amanda Anisimova',
    confidence: 57,
    volatility: 76,
    angle: 'Anisimova still has the better top-end shotmaking if the wrist holds up well enough to let her take the match over',
    swing: 'If the wrist limits her acceleration and the clay slows the strike zone down, the French underdog becomes very real.',
    tags: ['Women', 'Volatile']
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-merida-shelton-2026-05-25',
    start: '7:00 AM PT',
    startMinutes: 420,
    format: 'ATP',
    playerA: {
      name: 'Daniel Merida',
      profile: 'Young lefty underdog',
      recordTag: 'Needs scoreboard chaos',
      note: 'Merida needs a rough serving day from Shelton and enough return dents to stop this from becoming a weapons mismatch.'
    },
    playerB: {
      name: 'Ben Shelton',
      profile: 'Top-five seed power favorite',
      recordTag: 'Cleaner weapons side',
      note: 'Shelton is not a pure clay machine, but the serve-plus-forehand package should still be too much in a normal first-round major match.'
    },
    pickName: 'Ben Shelton',
    confidence: 73,
    volatility: 46,
    angle: 'Shelton’s first-strike advantage should carry the match if he avoids turning it into a long-reactive clay grind',
    swing: 'If Merida makes enough returns and drags Shelton into second-shot patience, the edge shrinks quickly.',
    tags: ['Favorite', 'Men']
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-wawrinka-de-jong-2026-05-25',
    start: '3:30 AM PT',
    startMinutes: 210,
    format: 'ATP',
    playerA: {
      name: 'Stan Wawrinka',
      profile: 'Former champion farewell lane',
      recordTag: 'Emotion tax',
      note: 'Wawrinka still has the shotmaking ceiling, but this kind of late-career opener is more about body and length tolerance than memory.',
      boardPct: 41
    },
    playerB: {
      name: 'Jesper de Jong',
      profile: 'Younger clay grinder',
      recordTag: 'Long-match pressure edge',
      note: 'De Jong is less glamorous, but the age, legs, and clay patience can matter a lot if this turns into a long work match.',
      boardPct: 61
    },
    pickName: 'Jesper de Jong',
    confidence: 58,
    volatility: 69,
    angle: 'de Jong is the more trustworthy long-match clay body even if Wawrinka owns the bigger-shot nostalgia card',
    swing: 'If Wawrinka serves well enough to keep points short and free his backhand early, the veteran ceiling can still override the age gap.',
    tags: ['Men', 'Volatile']
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-humbert-mannarino-2026-05-25',
    start: '6:00 AM PT',
    startMinutes: 360,
    format: 'ATP',
    playerA: {
      name: 'Ugo Humbert',
      profile: 'French seed with cleaner ceiling',
      recordTag: 'Medium-trust favorite',
      note: 'Humbert has the better live level, but this all-French opener is still more awkward than a broad seed-vs-unseeded read.',
      boardPct: 87
    },
    playerB: {
      name: 'Adrian Mannarino',
      profile: 'Veteran disruptor',
      recordTag: 'Pattern-break dog',
      note: 'Mannarino is dangerous only if he turns the match into a rhythm problem instead of letting Humbert dictate pace.',
      boardPct: 15
    },
    pickName: 'Ugo Humbert',
    confidence: 62,
    volatility: 65,
    angle: 'Humbert has the cleaner level and more likely scoreboard control in a match that still carries real French-opener weirdness',
    swing: 'If Mannarino flattens the tempo and frustrates the favorite early, this can become a lot less comfortable.',
    tags: ['Men']
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-gaston-monfils-2026-05-25',
    start: '11:15 AM PT',
    startMinutes: 675,
    format: 'ATP',
    playerA: {
      name: 'Hugo Gaston',
      profile: 'Trick-shot French spoiler',
      recordTag: 'Crowd chaos path',
      note: 'Gaston can make this weird enough to matter if he gets the crowd and the touch game rolling.'
    },
    playerB: {
      name: 'Gael Monfils',
      profile: 'Home farewell spotlight',
      recordTag: 'Emotion-heavy opener',
      note: 'Monfils will have the stadium and the occasion, but that also makes this one of the least clean prediction spots on the main courts.'
    },
    pickName: 'Gael Monfils',
    confidence: 53,
    volatility: 82,
    angle: 'Monfils gets the tiniest desk lean because the stage should still amplify his best pressure tennis more than Gaston’s',
    swing: 'If Monfils cannot earn cheap holds and the match becomes all feel and all crowd, Gaston can absolutely flip the script.',
    tags: ['Men', 'Volatile'],
    spotlight: true
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-sinner-tabur-2026-05-25',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'ATP',
    playerA: {
      name: 'Jannik Sinner',
      profile: 'Top-end major favorite',
      recordTag: 'Clean carryover side',
      note: 'Sinner should have too much quality in every normal script of this match, and this is the kind of opener where the board should stay simple.',
      boardPct: 99
    },
    playerB: {
      name: 'Clement Tabur',
      profile: 'Huge longshot',
      recordTag: 'Only chaos path',
      note: 'Tabur needs the match to go completely sideways because the clean talent and pace gap is massive.',
      boardPct: 2
    },
    pickName: 'Jannik Sinner',
    confidence: 83,
    volatility: 28,
    angle: 'Sinner is still just a clean early-round major favorite and does not need a creative read attached to him',
    swing: 'Only a totally flat opening from Sinner makes this remotely alive.',
    tags: ['Favorite', 'Men'],
    spotlight: true
  })
]

const expandedMatches = [
  makeQuickRolandGarrosMatch({
    id: 'rg-w-marcinko-lys-2026-05-25',
    start: '3:30 AM PT',
    startMinutes: 210,
    format: 'WTA',
    playerAName: 'Petra Marcinko',
    playerBName: 'Eva Lys',
    pickName: 'Eva Lys',
    confidence: 57,
    volatility: 64,
    angle: 'Lys gets the steadier current-level lean in a match that still looks much closer to a three-set grind than a clean favorite lane',
    swing: 'If Marcinko starts dictating first and keeps the scoreboard on her serve, this gets coin-flip fast.',
    playerABoardPct: 56,
    playerBBoardPct: 47,
    tags: ['Women', 'Volatile']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-kasatkina-sonmez-2026-05-25',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'WTA',
    playerAName: 'Daria Kasatkina',
    playerBName: 'Zeynep Sonmez',
    pickName: 'Daria Kasatkina',
    confidence: 72,
    volatility: 41,
    angle: 'Kasatkina has the cleaner clay problem-solving lane if she turns this into a rhythm and pattern match',
    swing: 'If Sonmez forces first-strike points and shortens the patterns, the edge tightens.',
    playerABoardPct: 68,
    playerBBoardPct: 33,
    tags: ['Women', 'Favorite']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-rakhimova-cristian-2026-05-25',
    start: '7:30 AM PT',
    startMinutes: 450,
    format: 'WTA',
    playerAName: 'Kamilla Rakhimova',
    playerBName: 'Jaqueline Cristian',
    pickName: 'Jaqueline Cristian',
    confidence: 56,
    volatility: 68,
    angle: 'Cristian gets the slight desk edge because her longer clay exchanges are easier to trust in a messy opener',
    swing: 'If Rakhimova lands enough first strikes, the match swings right back to even.',
    playerABoardPct: 25,
    playerBBoardPct: 76,
    tags: ['Women', 'Volatile']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-zakharova-muchova-2026-05-25',
    start: '7:30 AM PT',
    startMinutes: 450,
    format: 'WTA',
    playerAName: 'Anastasia Zakharova',
    playerBName: 'Karolina Muchova',
    pickName: 'Karolina Muchova',
    confidence: 71,
    volatility: 44,
    angle: 'Muchova has too many ways to solve a normal round-one clay match if her body gives her a clean runway',
    swing: 'If the movement or physical side is limited, the favorite lane becomes much less comfortable.',
    playerABoardPct: 13,
    playerBBoardPct: 88,
    tags: ['Women', 'Favorite']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-paolini-yastremska-2026-05-25',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'WTA',
    playerAName: 'Jasmine Paolini',
    playerBName: 'Dayana Yastremska',
    pickName: 'Jasmine Paolini',
    confidence: 63,
    volatility: 62,
    angle: 'Paolini gets the lean because her clay balance and rally tolerance are easier to trust over a full match',
    swing: 'If Yastremska gets the first-strike rhythm early, the whole script gets louder fast.',
    playerABoardPct: 63,
    playerBBoardPct: 39,
    tags: ['Women']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-samsonova-teichmann-2026-05-25',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'WTA',
    playerAName: 'Liudmila Samsonova',
    playerBName: 'Jil Teichmann',
    pickName: 'Liudmila Samsonova',
    confidence: 62,
    volatility: 59,
    angle: 'Samsonova has the cleaner top-end weapons if she can avoid letting this settle into a pure lefty clay grind',
    swing: 'If Teichmann drags the match into longer shape-heavy exchanges, the dog lane becomes live.',
    playerABoardPct: 77,
    playerBBoardPct: 24,
    tags: ['Women']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-bandecchi-bucsa-2026-05-25',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'WTA',
    playerAName: 'Susan Bandecchi',
    playerBName: 'Cristina Bucsa',
    pickName: 'Cristina Bucsa',
    confidence: 58,
    volatility: 63,
    angle: 'Bucsa gets the desk nod in a match where steadier clay patterns matter more than raw upside',
    swing: 'If Bandecchi owns the first-strike points, this gets uncomfortable quickly.',
    playerABoardPct: 30,
    playerBBoardPct: 71,
    tags: ['Women', 'Volatile']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-shnaider-zarazua-2026-05-25',
    start: '7:30 AM PT',
    startMinutes: 450,
    format: 'WTA',
    playerAName: 'Diana Shnaider',
    playerBName: 'Renata Zarazua',
    pickName: 'Diana Shnaider',
    confidence: 69,
    volatility: 47,
    angle: 'Shnaider brings the stronger current level and enough lefty pressure to own the normal script',
    swing: 'If Zarazua keeps the ball low and turns this into a patience match, the favorite has to work much harder.',
    playerABoardPct: 87,
    playerBBoardPct: 14,
    tags: ['Women', 'Favorite']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-hanyu-kessler-2026-05-25',
    start: '7:30 AM PT',
    startMinutes: 450,
    format: 'WTA',
    playerAName: 'Guo Hanyu',
    playerBName: 'McCartney Kessler',
    pickName: 'McCartney Kessler',
    confidence: 61,
    volatility: 58,
    angle: 'Kessler gets the slight edge because her current level is easier to trust if this becomes a clean opener',
    swing: 'If the match turns into a pure clay patience test, the gap narrows fast.',
    playerABoardPct: 30,
    playerBBoardPct: 71,
    tags: ['Women']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-urhobo-boulter-2026-05-25',
    start: '6:00 AM PT',
    startMinutes: 360,
    format: 'WTA',
    playerAName: 'Akasha Urhobo',
    playerBName: 'Katie Boulter',
    pickName: 'Katie Boulter',
    confidence: 68,
    volatility: 49,
    angle: 'Boulter gets the cleaner pro-level lane even if clay is not where she wants to spend extra time',
    swing: 'If Urhobo starts fearless and keeps the points short, the opener gets noisy.',
    playerABoardPct: 31,
    playerBBoardPct: 70,
    tags: ['Women', 'Favorite']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-joint-potapova-2026-05-25',
    start: '4:00 AM PT',
    startMinutes: 240,
    format: 'WTA',
    playerAName: 'Maya Joint',
    playerBName: 'Anastasia Potapova',
    pickName: 'Anastasia Potapova',
    confidence: 60,
    volatility: 61,
    angle: 'Potapova has the cleaner shotmaking path if she keeps the error count from ballooning on clay',
    swing: 'If Joint makes this physical and drags out the rallies, the younger dog becomes very real.',
    playerABoardPct: 14,
    playerBBoardPct: 87,
    tags: ['Women']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-gibson-putintseva-2026-05-25',
    start: '6:00 AM PT',
    startMinutes: 360,
    format: 'WTA',
    playerAName: 'Talia Gibson',
    playerBName: 'Yulia Putintseva',
    pickName: 'Yulia Putintseva',
    confidence: 67,
    volatility: 50,
    angle: 'Putintseva gets the lean because this is the kind of clay annoyance match she can still own with shape and disruption',
    swing: 'If Gibson stays composed and attacks short balls, the veteran edge gets much thinner.',
    playerABoardPct: 26,
    playerBBoardPct: 74,
    tags: ['Women', 'Favorite']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-osorio-alexandrova-2026-05-25',
    start: '7:30 AM PT',
    startMinutes: 450,
    format: 'WTA',
    playerAName: 'Camila Osorio',
    playerBName: 'Ekaterina Alexandrova',
    pickName: 'Ekaterina Alexandrova',
    confidence: 62,
    volatility: 63,
    angle: 'Alexandrova gets the desk side if she can keep this in first-strike territory instead of a pure clay scramble',
    swing: 'If Osorio extends patterns and makes this all movement and all shape, the underdog path opens.',
    playerABoardPct: 58,
    playerBBoardPct: 44,
    tags: ['Women']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-quevedo-jeanjean-2026-05-25',
    start: '5:30 AM PT',
    startMinutes: 330,
    format: 'WTA',
    playerAName: 'Kaitlin Quevedo',
    playerBName: 'Leolia Jeanjean',
    pickName: 'Leolia Jeanjean',
    confidence: 57,
    volatility: 67,
    angle: 'Jeanjean gets the slight lean because the home-clay script is easier to trust than a pure upside projection',
    swing: 'If Quevedo serves and swings freely from the start, the match can flip on tempo.',
    playerABoardPct: 47,
    playerBBoardPct: 55,
    tags: ['Women', 'Volatile']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-chwalinska-zheng-2026-05-25',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'WTA',
    playerAName: 'Maja Chwalinska',
    playerBName: 'Zheng Qinwen',
    pickName: 'Zheng Qinwen',
    confidence: 75,
    volatility: 40,
    angle: 'Zheng has too much clean top-end pressure if this stays in a normal first-round lane',
    swing: 'If the serve deserts her and the match turns into pure patience, the underdog gets a foothold.',
    playerABoardPct: 25,
    playerBBoardPct: 76,
    tags: ['Women', 'Favorite']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-maria-mertens-2026-05-25',
    start: '4:00 AM PT',
    startMinutes: 240,
    format: 'WTA',
    playerAName: 'Tatjana Maria',
    playerBName: 'Elise Mertens',
    pickName: 'Elise Mertens',
    confidence: 64,
    volatility: 55,
    angle: 'Mertens gets the lean because her clay balance is easier to trust than Maria’s slice-disruption path over a full match',
    swing: 'If Maria makes the tempo ugly and low enough, this stops looking comfortable.',
    playerABoardPct: 9,
    playerBBoardPct: 93,
    tags: ['Women']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-grabher-sramkova-2026-05-25',
    start: '3:30 AM PT',
    startMinutes: 210,
    format: 'WTA',
    playerAName: 'Julia Grabher',
    playerBName: 'Rebecca Sramkova',
    pickName: 'Rebecca Sramkova',
    confidence: 60,
    volatility: 60,
    angle: 'Sramkova gets the slight edge because her cleaner current level is easier to buy in a neutral opener',
    swing: 'If Grabher owns the longer clay exchanges, the match flattens out quickly.',
    playerABoardPct: 37,
    playerBBoardPct: 65,
    tags: ['Women']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-ostapenko-seidel-2026-05-25',
    start: '6:00 AM PT',
    startMinutes: 360,
    format: 'WTA',
    playerAName: 'Jelena Ostapenko',
    playerBName: 'Ella Seidel',
    pickName: 'Jelena Ostapenko',
    confidence: 68,
    volatility: 60,
    angle: 'Ostapenko gets the desk lean because the raw ceiling gap is real if she keeps the error count in range',
    swing: 'If the ball-striking leaks too much and Seidel stays calm, this can get weird quickly.',
    playerABoardPct: 80,
    playerBBoardPct: 21,
    tags: ['Women']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-udvardy-golubic-2026-05-25',
    start: '5:30 AM PT',
    startMinutes: 330,
    format: 'WTA',
    playerAName: 'Panna Udvardy',
    playerBName: 'Viktorija Golubic',
    pickName: 'Viktorija Golubic',
    confidence: 61,
    volatility: 57,
    angle: 'Golubic gets the steadier desk lean in a match that should be more about shape and patience than raw power',
    swing: 'If Udvardy controls the forehand lane, the gap almost disappears.',
    playerABoardPct: 56,
    playerBBoardPct: 46,
    tags: ['Women']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-w-parks-fernandez-2026-05-25',
    start: '7:30 AM PT',
    startMinutes: 450,
    format: 'WTA',
    playerAName: 'Alycia Parks',
    playerBName: 'Leylah Fernandez',
    pickName: 'Leylah Fernandez',
    confidence: 58,
    volatility: 70,
    angle: 'Fernandez gets the desk nod because her return-and-rally shape is easier to trust on clay than a pure serve-first read',
    swing: 'If Parks lands enough first serves and shortcuts points, the dog lane gets very real.',
    playerABoardPct: 23,
    playerBBoardPct: 78,
    tags: ['Women', 'Volatile']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-kokkinakis-atmane-2026-05-25',
    start: '4:00 AM PT',
    startMinutes: 240,
    format: 'ATP',
    playerAName: 'Thanasi Kokkinakis',
    playerBName: 'Terence Atmane',
    pickName: 'Terence Atmane',
    confidence: 55,
    volatility: 71,
    angle: 'Atmane gets the tiny lean because the clay-first physical path is easier to trust than a pure serve-driven projection here',
    swing: 'If Kokkinakis is serving big and staying short, the match flips back toward him fast.',
    playerABoardPct: 24,
    playerBBoardPct: 76,
    tags: ['Men', 'Volatile']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-carreno-lehecka-2026-05-25',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'ATP',
    playerAName: 'Pablo Carreno Busta',
    playerBName: 'Jiri Lehecka',
    pickName: 'Jiri Lehecka',
    confidence: 63,
    volatility: 56,
    angle: 'Lehecka has the cleaner live level if this match does not turn into a pure old-school clay drag',
    swing: 'If Carreno Busta makes the points heavy and repetitive, the veteran clay lane comes alive.',
    playerABoardPct: 19,
    playerBBoardPct: 82,
    tags: ['Men']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-kovacevic-jodar-2026-05-25',
    start: '4:00 AM PT',
    startMinutes: 240,
    format: 'ATP',
    playerAName: 'Aleksandar Kovacevic',
    playerBName: 'Rafael Jodar',
    pickName: 'Aleksandar Kovacevic',
    confidence: 60,
    volatility: 58,
    angle: 'Kovacevic gets the desk lean because the pro-level baseline is easier to trust over a full five-set opener',
    swing: 'If Jodar stays fearless and keeps the pressure on the favorite’s second serve, this gets live.',
    playerABoardPct: 12,
    playerBBoardPct: 89,
    tags: ['Men']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-shevchenko-michelsen-2026-05-25',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'ATP',
    playerAName: 'Alexandr Shevchenko',
    playerBName: 'Alex Michelsen',
    pickName: 'Alex Michelsen',
    confidence: 59,
    volatility: 61,
    angle: 'Michelsen gets the slight edge because his current level is easier to trust if the match stays mostly on serve',
    swing: 'If Shevchenko makes this physical and shape-heavy, the line gets much thinner.',
    playerABoardPct: 39,
    playerBBoardPct: 62,
    tags: ['Men']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-fucsovics-berrettini-2026-05-25',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'ATP',
    playerAName: 'Marton Fucsovics',
    playerBName: 'Matteo Berrettini',
    pickName: 'Matteo Berrettini',
    confidence: 61,
    volatility: 60,
    angle: 'Berrettini gets the desk nod because the serve-plus-forehand weapons should still matter over five sets',
    swing: 'If Fucsovics absorbs the first strike and extends every service game, the favorite lane gets noisy.',
    playerABoardPct: 36,
    playerBBoardPct: 65,
    tags: ['Men']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-munar-hurkacz-2026-05-25',
    start: '4:00 AM PT',
    startMinutes: 240,
    format: 'ATP',
    playerAName: 'Jaume Munar',
    playerBName: 'Hubert Hurkacz',
    pickName: 'Jaume Munar',
    confidence: 56,
    volatility: 68,
    angle: 'Munar gets the clay-script lean because he is more likely to enjoy the long, dirty patterns this match can create',
    swing: 'If Hurkacz serves at a high clip and keeps the match on his terms, the upset lane dies fast.',
    playerABoardPct: 45,
    playerBBoardPct: 55,
    tags: ['Men', 'Volatile']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-collignon-vukic-2026-05-25',
    start: '7:00 AM PT',
    startMinutes: 420,
    format: 'ATP',
    playerAName: 'Raphael Collignon',
    playerBName: 'Aleksandar Vukic',
    pickName: 'Aleksandar Vukic',
    confidence: 58,
    volatility: 60,
    angle: 'Vukic gets the slight desk edge because the current tour-level baseline is easier to buy in a neutral opener',
    swing: 'If Collignon settles first on clay and drags the favorite into extra balls, this flattens quickly.',
    playerABoardPct: 92,
    playerBBoardPct: 10,
    tags: ['Men']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-spizzirri-tiafoe-2026-05-25',
    start: '3:30 AM PT',
    startMinutes: 210,
    format: 'ATP',
    playerAName: 'Eliot Spizzirri',
    playerBName: 'Frances Tiafoe',
    pickName: 'Frances Tiafoe',
    confidence: 66,
    volatility: 53,
    angle: 'Tiafoe has too much live athletic margin if this stays in a normal first-round major script',
    swing: 'If he leaks focus and lets the underdog make this physical, the edge narrows fast.',
    playerABoardPct: 11,
    playerBBoardPct: 91,
    tags: ['Men', 'Favorite']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-vanassche-kypson-2026-05-25',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'ATP',
    playerAName: 'Luca Van Assche',
    playerBName: 'Patrick Kypson',
    pickName: 'Luca Van Assche',
    confidence: 63,
    volatility: 55,
    angle: 'Van Assche gets the home-clay lean because the baseline patterns and surface comfort are easier to trust here',
    swing: 'If Kypson steals free holds and keeps the scoreboard moving, this gets tighter than the clay profile suggests.',
    playerABoardPct: 54,
    playerBBoardPct: 49,
    tags: ['Men']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-bautista-nakashima-2026-05-25',
    start: '3:30 AM PT',
    startMinutes: 210,
    format: 'ATP',
    playerAName: 'Roberto Bautista Agut',
    playerBName: 'Brandon Nakashima',
    pickName: 'Roberto Bautista Agut',
    confidence: 54,
    volatility: 70,
    angle: 'Bautista Agut gets the tiny desk lean because the clay patience lane is easier to trust than a clean hard-court projection',
    swing: 'If Nakashima serves big and keeps the points short, the veteran edge disappears.',
    playerABoardPct: 24,
    playerBBoardPct: 78,
    tags: ['Men', 'Volatile']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-cerundolo-botic-2026-05-25',
    start: '7:00 AM PT',
    startMinutes: 420,
    format: 'ATP',
    playerAName: 'Francisco Cerundolo',
    playerBName: 'Botic Van De Zandschulp',
    pickName: 'Francisco Cerundolo',
    confidence: 74,
    volatility: 41,
    angle: 'Cerundolo is one of the cleaner ATP clay sides because the surface-specific baseline edge is real',
    swing: 'If he starts passive and lets Botic flatten the first strike, the margin tightens.',
    playerABoardPct: 84,
    playerBBoardPct: 17,
    tags: ['Men', 'Favorite']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-navone-brooksby-2026-05-25',
    start: '5:00 AM PT',
    startMinutes: 300,
    format: 'ATP',
    playerAName: 'Mariano Navone',
    playerBName: 'Jenson Brooksby',
    pickName: 'Mariano Navone',
    confidence: 58,
    volatility: 65,
    angle: 'Navone gets the clay-script lean because the longer baseline lane should belong to him more often than not',
    swing: 'If Brooksby turns this into a feel and disruption match, the script gets awkward quickly.',
    playerABoardPct: 85,
    playerBBoardPct: 16,
    tags: ['Men']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-deminaur-samuel-2026-05-25',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'ATP',
    playerAName: 'Alex de Minaur',
    playerBName: 'Toby Samuel',
    pickName: 'Alex de Minaur',
    confidence: 77,
    volatility: 36,
    angle: 'de Minaur is a clean major favorite because the movement and repeatability gap is simply too big in a normal opener',
    swing: 'Only a flat opening set or a very hot serving day from Samuel makes this noisy.',
    playerABoardPct: 92,
    playerBBoardPct: 9,
    tags: ['Men', 'Favorite']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-cobolli-pellegrino-2026-05-25',
    start: '7:00 AM PT',
    startMinutes: 420,
    format: 'ATP',
    playerAName: 'Flavio Cobolli',
    playerBName: 'Andrea Pellegrino',
    pickName: 'Flavio Cobolli',
    confidence: 71,
    volatility: 44,
    angle: 'Cobolli gets the strong clay-day lean because the current baseline quality and comfort gap look real',
    swing: 'If Pellegrino keeps the first-strike pressure high, the favorite has to solve more than expected.',
    playerABoardPct: 74,
    playerBBoardPct: 27,
    tags: ['Men', 'Favorite']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-wu-giron-2026-05-25',
    start: '7:00 AM PT',
    startMinutes: 420,
    format: 'ATP',
    playerAName: 'Wu Yibing',
    playerBName: 'Marcos Giron',
    pickName: 'Marcos Giron',
    confidence: 63,
    volatility: 54,
    angle: 'Giron gets the lean because his tour-level stability is easier to trust over a full five-set opener',
    swing: 'If Wu serves well enough to free the forehand early, the match gets much more fragile.',
    playerABoardPct: 46,
    playerBBoardPct: 56,
    tags: ['Men']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-ruud-safiullin-2026-05-25',
    start: '5:30 AM PT',
    startMinutes: 330,
    format: 'ATP',
    playerAName: 'Casper Ruud',
    playerBName: 'Roman Safiullin',
    pickName: 'Casper Ruud',
    confidence: 79,
    volatility: 34,
    angle: 'Ruud is still one of the cleaner ATP clay favorites because the surface identity and five-set rhythm are so established',
    swing: 'If he starts passive and lets Safiullin dictate first, the first set can get uncomfortable.',
    playerABoardPct: 89,
    playerBBoardPct: 12,
    tags: ['Men', 'Favorite'],
    spotlight: true
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-buse-rublev-2026-05-25',
    start: '5:30 AM PT',
    startMinutes: 330,
    format: 'ATP',
    playerAName: 'Ignacio Buse',
    playerBName: 'Andrey Rublev',
    pickName: 'Andrey Rublev',
    confidence: 74,
    volatility: 42,
    angle: 'Rublev gets the clean talent-side lean if he keeps the ball-striking under control from the start',
    swing: 'If the errors stack early and Buse stays relaxed, the scoreline can get more awkward than expected.',
    playerABoardPct: 33,
    playerBBoardPct: 68,
    tags: ['Men', 'Favorite']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-nava-ugocarabelli-2026-05-25',
    start: '5:00 AM PT',
    startMinutes: 300,
    format: 'ATP',
    playerAName: 'Emilio Nava',
    playerBName: 'Camilo Ugo Carabelli',
    pickName: 'Camilo Ugo Carabelli',
    confidence: 55,
    volatility: 67,
    angle: 'Ugo Carabelli gets the slight clay-script edge because the heavier dirt patterns are more likely to suit him',
    swing: 'If Nava serves and attacks well enough to keep the points short, this becomes a real toss-up.',
    playerABoardPct: 50,
    playerBBoardPct: 51,
    tags: ['Men', 'Volatile']
  }),
  makeQuickRolandGarrosMatch({
    id: 'rg-m-hijikata-tpaul-2026-05-25',
    start: '5:30 AM PT',
    startMinutes: 330,
    format: 'ATP',
    playerAName: 'Rinky Hijikata',
    playerBName: 'Tommy Paul',
    pickName: 'Tommy Paul',
    confidence: 70,
    volatility: 45,
    angle: 'Tommy Paul gets the cleaner all-court lane because the movement and shot tolerance should travel well enough to clay',
    swing: 'If Hijikata keeps serve pressure high and steals cheap games, the margin shrinks quickly.',
    playerABoardPct: 7,
    playerBBoardPct: 94,
    tags: ['Men', 'Favorite']
  })
]

const matches = [...featuredMatches, ...expandedMatches]

const mlbIdCounts = new Map()
const mlbGames = rawGames.map((raw) => {
  const seen = mlbIdCounts.get(raw.id) ?? 0
  mlbIdCounts.set(raw.id, seen + 1)
  return buildMlbGame(raw, seen)
})

export const slateMeta = {
  title: 'Monday MLB + Roland Garros Desk',
  date: 'May 25, 2026',
  isoDate: '2026-05-25',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A combined Monday slate with the full May 25 MLB board plus the broader Roland Garros Day 2 tennis desk.',
  notes: [
    'MLB is coming from the generated May 25 split files, including starter context, lineup boards, park context, bullpen-chain context, and the current state / mistake-shape layers.',
    'The tennis portion covers the fuller Roland Garros Day 2 board rather than the earlier trimmed featured set.',
    'The board now covers the broader Day 2 scoreboard instead of the earlier trimmed set of featured matches.',
    'ATP structure still gets more trust than medium-confidence WTA chaos after the May 24 review.',
    'Where no public split was saved locally, the card is using official schedule context and manual matchup reads only.'
  ]
}

export const filters = ['All', 'MLB', 'Tennis']

export const oddsMeta = {
  provider: 'Official MLB data + ScoresAndOdds live board / Roland Garros desk board',
  snapshot: 'May 25, 2026 MLB + Roland Garros desk',
  note:
    'MLB uses the generated live board pipeline with official data and accessible odds snapshots. Tennis uses captured market splits plus manual clay trade reads.'
}

export const sources = [
  {
    label: 'MLB probable pitchers',
    url: 'https://www.mlb.com/probable-pitchers'
  },
  {
    label: 'MLB starting lineups',
    url: 'https://www.mlb.com/starting-lineups'
  },
  {
    label: 'ScoresAndOdds MLB board',
    url: 'https://www.scoresandodds.com/mlb'
  },
  {
    label: 'ESPN tennis scoreboard',
    url: 'https://www.espn.com/tennis/scoreboard'
  },
  {
    label: 'Roland Garros order of play',
    url: 'https://www.rolandgarros.com/en-us/order-of-play?annexeCourt=all&competition=all&country=all&date=2026-05-25&favoriteFilter=false&principalCourt=all&year=2026'
  },
  {
    label: 'ATP Tour Day 2 schedule note',
    url: 'https://www.atptour.com/en/news/roland-garros-2026-schedule'
  },
  {
    label: 'Roland Garros Day 2 match-of-the-day note',
    url: 'https://www.rolandgarros.com/en-us/article/day-2-match-of-the-day-anisimova'
  },
  {
    label: 'WTA match notes hub',
    url: 'https://www.wtatennis.com/match-notes'
  }
]

export const games = [...mlbGames, ...matches].sort(
  (left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title)
)

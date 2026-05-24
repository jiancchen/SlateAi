import { createSportsMatchModel } from './sports-model.js'
import { buildTennistonicH2HUrl } from './tennis-source-mapping.js'
import { rawGames, bullpenChainByTeam } from './day-2026-05-24-data.js'
import {
  standingsContextByTeam,
  teamOffenseContextByTeam,
  teamBullpenContextByTeam,
  teamSavantContextByTeam
} from './mlb-context-2026-05-24.js'
import { lineupBoardsByGameId, lineupMatchupContextByGameId } from './day-2026-05-24-lineups.js'
import { parkContextByHomeTeam } from './day-2026-05-13-mlb-data.js'

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
    'This Roland Garros board is a prediction desk built from the user shortlist, official schedules, and community board splits. The split percentages are context only, not sportsbook prices.',
  provider: oddsProvider
})

const buildPlayerLabel = (player) => (Number.isFinite(player.rank) ? `#${player.rank} ${player.name}` : player.name)

const buildPlayerDetail = (player) => {
  const parts = []
  if (player.profile) parts.push(player.profile)
  if (Number.isFinite(player.boardPct)) parts.push(`Board ${formatPct(player.boardPct)}`)
  return parts.join(' | ')
}

const buildComparisonRow = (label, metric, leftScore, rightScore, leftLabel, rightLabel) => ({
  label,
  metric,
  leftScore: clamp(Math.round(leftScore), 0, 100),
  rightScore: clamp(Math.round(rightScore), 0, 100),
  leftLabel,
  rightLabel,
  winner:
    Math.round(leftScore) === Math.round(rightScore)
      ? 'Even'
      : leftScore > rightScore
        ? leftLabel
        : rightLabel
})

const buildComparisonRows = ({ playerA, playerB, pick, confidence, volatility }) => {
  const pickIsA = pick.name === playerA.name
  const deskLeft = pickIsA ? confidence : 100 - confidence
  const deskRight = pickIsA ? 100 - confidence : confidence
  const stabilityLeft = pickIsA ? 100 - volatility : volatility
  const stabilityRight = pickIsA ? volatility : 100 - volatility

  return [
    buildComparisonRow(
      'Community board',
      'Crowd split',
      playerA.boardPct ?? 50,
      playerB.boardPct ?? 50,
      playerA.name,
      playerB.name
    ),
    buildComparisonRow(
      'Desk lean',
      'Confidence split',
      deskLeft,
      deskRight,
      playerA.name,
      playerB.name
    ),
    buildComparisonRow(
      'Script stability',
      'Lower chaos side',
      stabilityLeft,
      stabilityRight,
      playerA.name,
      playerB.name
    )
  ]
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
    if (confidence >= 74 && volatility <= 54) {
      return {
        projectedWinner: pick.name,
        projectedSetLine: '3-0',
        projectedScoreline: '6-4, 6-4, 6-3',
        totalGames: 29,
        straightSetsProbability,
        upsetRisk,
        overview: `${pick.name} should control this if the cleaner clay script holds from the start.`,
        fantasy: []
      }
    }

    if (confidence >= 64) {
      return {
        projectedWinner: pick.name,
        projectedSetLine: '3-1',
        projectedScoreline: '6-4, 4-6, 6-3, 6-4',
        totalGames: 39,
        straightSetsProbability,
        upsetRisk,
        overview: `${pick.name} still gets the nod, but the path looks more like a four-set clay solve than a cruise.`,
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
      overview: `${pick.name} is live, but this has real five-set spill risk if the underdog keeps the first strike pressure up.`,
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

  if (confidence >= 62) {
    return {
      projectedWinner: pick.name,
      projectedSetLine: '2-1',
      projectedScoreline: '6-4, 3-6, 6-4',
      totalGames: 29,
      straightSetsProbability,
      upsetRisk,
      overview: `${pick.name} still gets the nod, but the path looks more like a three-set clay squeeze than a blowout.`,
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
    overview: `${pick.name} is the desk side, but this is much closer to a live coin-flip than a comfort favorite spot.`,
    fantasy: []
  }
}

const buildPlayers = ({ playerA, playerB, pick }) => {
  const buildNotes = (player, opponent) => {
    if (player.name === pick.name) {
      return `${player.note} This is the side the desk trusts more if the clay match settles into its normal pattern.`
    }
    return `${player.note} The upset path needs this player to force the swing condition instead of letting the cleaner clay script hold.`
  }

  const buildMatchupNote = (player, opponent) => {
    if (player.name === pick.name) {
      return `${player.name} is the desk lean over ${opponent.name}.`
    }
    return `${player.name} is live only if the match bends toward the upset script early.`
  }

  return [playerA, playerB].map((player, index, array) => {
    const opponent = array[index === 0 ? 1 : 0]
    return {
      name: player.name,
      rank: player.rank ?? null,
      label: buildPlayerLabel(player),
      form: null,
      decimalOdds: null,
      marketLabel: Number.isFinite(player.boardPct) ? `Board ${formatPct(player.boardPct)}` : 'Desk only',
      clayLine: player.profile || 'Roland Garros round one desk read',
      record2026: player.recordTag || '',
      notes: buildNotes(player, opponent),
      matchupNote: buildMatchupNote(player, opponent)
    }
  })
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
  const opponent = pickName === playerA.name ? playerB : playerA
  const liveDog =
    Number.isFinite(pick.boardPct) && Number.isFinite(opponent.boardPct) ? pick.boardPct < opponent.boardPct : false
  const comparisonRows = buildComparisonRows({ playerA, playerB, pick, confidence, volatility })
  const projection = buildProjection({ format, pick, confidence, volatility })
  const h2hUrl = buildTennistonicH2HUrl(playerA.name, playerB.name)
  const event = format === 'ATP' ? 'Roland Garros Men' : 'Roland Garros Women'

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
        {
          side: 'Player 1',
          name: playerA.name,
          displayName: buildPlayerLabel(playerA),
          detail: buildPlayerDetail(playerA)
        },
        {
          side: 'Player 2',
          name: playerB.name,
          displayName: buildPlayerLabel(playerB),
          detail: buildPlayerDetail(playerB)
        }
      ],
      summary: `${pick.name} gets the desk lean because ${angle}. The crowd board is ${formatPct(playerA.boardPct)} / ${formatPct(playerB.boardPct)}, so this read is using the split as context rather than treating the bigger name as automatic.`,
      factors: [
        `Community board split: ${playerA.name} ${formatPct(playerA.boardPct)} vs ${playerB.name} ${formatPct(playerB.boardPct)}. This is being used as market-shape context only, not as a sportsbook line.`,
        `${playerA.name}: ${playerA.note}`,
        `${playerB.name}: ${playerB.note}`,
        `Clay desk angle: ${angle}.`,
        `Swing factor: ${swing}`
      ],
      lean: `Lean ${pick.name} because ${angle}.`,
      swing: `Swing factor: ${swing}`,
      odds: buildPredictionOnlyOdds(),
      tennisContext: {
        surface: 'Clay',
        h2hLeader: '',
        fatigueFlag: false,
        liveDog,
        players: buildPlayers({ playerA, playerB, pick }),
        comparisonRows,
        projection,
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
        `Board shape: ${playerA.name} ${formatPct(playerA.boardPct)} / ${playerB.name} ${formatPct(playerB.boardPct)}. That split is context only, not a price.`,
        `Swing factor: ${swing}`
      ]
    },
    oddsProvider
  )
}

const matches = [
  makeRolandGarrosMatch({
    id: 'rg-w-arango-bassols-ribera-2026-05-24',
    start: '7:30 AM PT',
    startMinutes: 450,
    format: 'WTA',
    playerA: {
      name: 'Emiliana Arango',
      boardPct: 51,
      profile: 'Live clay grinder',
      recordTag: 'Coin-flip lane',
      note: 'Arango can stay competitive on clay, but this matchup looks more about patience and shape than clean separation.'
    },
    playerB: {
      name: 'Marina Bassols Ribera',
      boardPct: 50,
      profile: 'Spanish clay specialist',
      recordTag: 'Long-rally comfort',
      note: 'Bassols Ribera is more comfortable winning ugly clay points, which matters in a true toss-up opener.'
    },
    pickName: 'Marina Bassols Ribera',
    confidence: 53,
    volatility: 78,
    angle: 'Bassols Ribera is a little more natural in the slower, longer clay exchanges this match is likely to produce',
    swing: 'If Arango starts dictating with first-ball aggression instead of trading neutral clay points, the whole read can flip.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-tagger-wang-2026-05-24',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'WTA',
    playerA: {
      name: 'Lilli Tagger',
      boardPct: 60,
      profile: 'Grand Slam debut',
      recordTag: 'Thin sample',
      note: 'Tagger is live, but first-round debut pressure can make the shot tolerance wobble if the match gets tight.'
    },
    playerB: {
      name: 'Xinyu Wang',
      boardPct: 41,
      profile: 'Bigger-tour hard-court name',
      recordTag: 'Surface question',
      note: 'Wang is not a clay lock, but she brings more big-stage match reps than Tagger does.'
    },
    pickName: 'Xinyu Wang',
    confidence: 52,
    volatility: 80,
    angle: 'Tagger is interesting, but the debut noise is large enough that the steadier experience side still gets the desk nod',
    swing: 'If Tagger serves cleanly and keeps the forehand front-foot, Wang can get dragged into the kind of nervous opener she hates.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-kostyuk-selekhmeteva-2026-05-24',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'WTA',
    playerA: {
      name: 'Marta Kostyuk',
      boardPct: 93,
      profile: 'Top-shelf clay favorite',
      recordTag: 'Clean favorite lane',
      note: 'Kostyuk brings the cleaner clay baseline, better point construction, and stronger current level.'
    },
    playerB: {
      name: 'Oksana Selekhmeteva',
      boardPct: 9,
      profile: 'Live only if chaotic',
      recordTag: 'Upset-only path',
      note: 'Selekhmeteva needs quick scoreboard pressure because the longer the clay exchanges get, the worse this matchup looks.'
    },
    pickName: 'Marta Kostyuk',
    confidence: 78,
    volatility: 43,
    angle: 'Kostyuk owns the clearest talent and surface edge on the women’s shortlist',
    swing: 'Only a loose, error-heavy Kostyuk start really opens the door here.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-bouzkova-bronzetti-2026-05-24',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'WTA',
    playerA: {
      name: 'Marie Bouzkova',
      boardPct: 81,
      profile: 'Steady clay grinder',
      recordTag: 'Name favorite, but not a lock',
      note: 'Bouzkova is the steadier point-builder, but Bronzetti can make this annoying if she keeps the rally depth high.'
    },
    playerB: {
      name: 'Lucia Bronzetti',
      boardPct: 20,
      profile: 'Counterpunch clay spoiler',
      recordTag: 'Live if physical',
      note: 'Bronzetti is live if she can drag Bouzkova into a long neutral exchange match instead of losing the first strike.'
    },
    pickName: 'Marie Bouzkova',
    confidence: 61,
    volatility: 63,
    angle: 'Bouzkova still has the cleaner clay floor even if the public split is a little too hot',
    swing: 'If Bronzetti keeps return depth high and turns this into a grind, Bouzkova loses the easy favorite lane.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-kraus-bencic-2026-05-24',
    start: '3:00 AM PT',
    startMinutes: 180,
    format: 'WTA',
    playerA: {
      name: 'Sinja Kraus',
      boardPct: 21,
      profile: 'Live underdog',
      recordTag: 'Clay resistance lane',
      note: 'Kraus can hang around if she keeps the points physical and prevents Bencic from dictating early.'
    },
    playerB: {
      name: 'Belinda Bencic',
      boardPct: 80,
      profile: 'Higher-end all-court favorite',
      recordTag: 'Advance, not auto-cruise',
      note: 'Bencic is better player for player, but this is more about moving through than rolling through.'
    },
    pickName: 'Belinda Bencic',
    confidence: 63,
    volatility: 60,
    angle: 'Bencic brings the cleaner overall level, but the clay version of this match is narrower than the name value suggests',
    swing: 'If Kraus makes Bencic hit one more ball all morning, the favorite can get dragged into a longer, wobblier opener.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-volynets-burel-2026-05-24',
    start: '3:30 AM PT',
    startMinutes: 210,
    format: 'WTA',
    playerA: {
      name: 'Katie Volynets',
      boardPct: 82,
      profile: 'Public favorite',
      recordTag: 'Crowd may be too hot',
      note: 'Volynets is solid, but this is exactly the kind of price where the board can get ahead of itself on the steadier name.'
    },
    playerB: {
      name: 'Clara Burel',
      boardPct: 19,
      profile: 'French home dog',
      recordTag: 'Live dog lane',
      note: 'Burel gets the home-clay crowd and enough point-shaping ability to make this much less one-way than the split implies.'
    },
    pickName: 'Clara Burel',
    confidence: 57,
    volatility: 76,
    angle: 'Burel is the live dog because the home-clay pressure and WTA volatility make the 82/19 split feel too rich',
    swing: 'If Volynets serves cleanly and gets scoreboard control early, the crowd edge loses a lot of its power.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-linette-valentova-2026-05-24',
    start: '3:30 AM PT',
    startMinutes: 210,
    format: 'WTA',
    playerA: {
      name: 'Magda Linette',
      boardPct: 24,
      profile: 'Veteran name value',
      recordTag: 'Clay trust light',
      note: 'Linette still has tour craft, but she is not the kind of clay favorite you want to overpay for.'
    },
    playerB: {
      name: 'Tereza Valentova',
      boardPct: 77,
      profile: 'Young upside lane',
      recordTag: 'Current-shape support',
      note: 'Valentova looks like the stronger current-shape clay side if her nerves hold in round one.'
    },
    pickName: 'Tereza Valentova',
    confidence: 64,
    volatility: 67,
    angle: 'Valentova has the better live shape for this clay opener than Linette does right now',
    swing: 'If the moment gets too big and Valentova leaks serve points early, Linette has enough veteran craft to flip the match.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-krejcikova-baptiste-2026-05-24',
    start: '4:00 AM PT',
    startMinutes: 240,
    format: 'WTA',
    playerA: {
      name: 'Barbora Krejcikova',
      boardPct: 46,
      profile: 'Big-name former champion',
      recordTag: 'Resume > current trust',
      note: 'Krejcikova still has the résumé, but round-one trust is about current shape, not memory.'
    },
    playerB: {
      name: 'Hailey Baptiste',
      boardPct: 57,
      profile: 'Current-form pressure bat',
      recordTag: 'Live dog-to-favorite lane',
      note: 'Baptiste has the fresher current look for a match where tempo and first strike should matter more than pedigree.'
    },
    pickName: 'Hailey Baptiste',
    confidence: 61,
    volatility: 72,
    angle: 'Baptiste is the better current-shape play even if Krejcikova still wins on résumé points',
    swing: 'If Krejcikova settles into a smart all-court pattern instead of forcing pace, the pedigree can still show up.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-jones-haddad-maia-2026-05-24',
    start: '4:00 AM PT',
    startMinutes: 240,
    format: 'WTA',
    playerA: {
      name: 'Francesca Jones',
      boardPct: 62,
      profile: 'Current-form clay dog',
      recordTag: 'Interesting dog lane',
      note: 'Jones is the kind of form dog who can make a cold favorite uncomfortable right away on clay.'
    },
    playerB: {
      name: 'Beatriz Haddad Maia',
      boardPct: 38,
      profile: 'Higher-ceiling name',
      recordTag: 'Trust still shaky',
      note: 'Haddad Maia has the bigger ceiling, but this has not been the kind of stretch where blind trust makes sense.'
    },
    pickName: 'Francesca Jones',
    confidence: 56,
    volatility: 77,
    angle: 'Jones is the more interesting current-form side in a match where the bigger name still has not earned automatic trust',
    swing: 'If Haddad Maia lands serve plus first forehand from the jump, the raw quality gap can still take over.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-korpatsch-sorribes-tormo-2026-05-24',
    start: '5:30 AM PT',
    startMinutes: 330,
    format: 'WTA',
    playerA: {
      name: 'Tamara Korpatsch',
      boardPct: 57,
      profile: 'Flat clay split favorite',
      recordTag: 'Thin edge only',
      note: 'Korpatsch is fine here, but she is not naturally priced as a true separation favorite.'
    },
    playerB: {
      name: 'Sara Sorribes Tormo',
      boardPct: 45,
      profile: 'Clay grind specialist',
      recordTag: 'Long-rally spoiler',
      note: 'Sorribes Tormo is still one of the better pure rhythm breakers on clay when the match gets ugly.'
    },
    pickName: 'Sara Sorribes Tormo',
    confidence: 55,
    volatility: 75,
    angle: 'Sorribes Tormo is the better long-rally clay problem if this stays ugly instead of clean',
    swing: 'If Korpatsch keeps the points shorter and stops the pattern from getting sticky, the board favorite can hold.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-kenin-stearns-2026-05-24',
    start: '5:30 AM PT',
    startMinutes: 330,
    format: 'WTA',
    playerA: {
      name: 'Sofia Kenin',
      boardPct: 35,
      profile: 'Veteran name value',
      recordTag: 'Respect, not trust',
      note: 'Kenin can still find match management, but this kind of clay spot is more dangerous than the name alone says.'
    },
    playerB: {
      name: 'Peyton Stearns',
      boardPct: 66,
      profile: 'Strong current-shape clay side',
      recordTag: 'Best WTA dog lane',
      note: 'Stearns brings the better current clay script and looks like the more trustworthy first-strike player here.'
    },
    pickName: 'Peyton Stearns',
    confidence: 68,
    volatility: 61,
    angle: 'Stearns has the cleaner current clay shape and should be the side until Kenin proves she can still control this type of opener',
    swing: 'If Kenin turns this into a weird tactical match instead of a pressure baseline match, the veteran edge comes back.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-raducanu-sierra-2026-05-24',
    start: '6:00 AM PT',
    startMinutes: 360,
    format: 'WTA',
    playerA: {
      name: 'Emma Raducanu',
      boardPct: 41,
      profile: 'Bigger-name favorite aura',
      recordTag: 'Clay trust light',
      note: 'Raducanu on clay is still a spot where the name usually travels farther than the actual certainty.'
    },
    playerB: {
      name: 'Solana Sierra',
      boardPct: 60,
      profile: 'Live clay dog',
      recordTag: 'Current-shape edge',
      note: 'Sierra looks more comfortable in the slower clay patterns this opener should create.'
    },
    pickName: 'Solana Sierra',
    confidence: 63,
    volatility: 70,
    angle: 'Sierra is the live clay side because the surface fit looks more natural than it does for Raducanu',
    swing: 'If Raducanu gets cheap holds and keeps the backhand clean early, the bigger-ball quality can still swing the match.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-ferro-andreeva-2026-05-24',
    start: '6:30 AM PT',
    startMinutes: 390,
    format: 'WTA',
    playerA: {
      name: 'Fiona Ferro',
      boardPct: 5,
      profile: 'French clay veteran',
      recordTag: 'Home spoiler path',
      note: 'Ferro is not dead here because the home clay feel and slower point pattern can make this more awkward than the split says.'
    },
    playerB: {
      name: 'Mirra Andreeva',
      boardPct: 96,
      profile: 'Elite young favorite',
      recordTag: 'Should win, but still round one',
      note: 'Andreeva is still the right side, but 96/5 is hotter than the actual clay opener risk deserves.'
    },
    pickName: 'Mirra Andreeva',
    confidence: 74,
    volatility: 55,
    angle: 'Andreeva is still the superior clay player, even if Ferro has enough home-context resistance to spoil a perfect favorite read',
    swing: 'If Ferro makes this physical and emotional from the first return game, the favorite can lose the clean two-set lane.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-stephens-bejlek-2026-05-24',
    start: '7:30 AM PT',
    startMinutes: 450,
    format: 'WTA',
    playerA: {
      name: 'Sloane Stephens',
      boardPct: 41,
      profile: 'Veteran major champion name',
      recordTag: 'Reputation tax live',
      note: 'Stephens can still look brilliant for stretches, but that does not make her a stable opener trust lane.'
    },
    playerB: {
      name: 'Sara Bejlek',
      boardPct: 60,
      profile: 'Young clay upside',
      recordTag: 'Live dog favorite',
      note: 'Bejlek is the kind of younger clay player who can pressure a veteran if the focus gap shows up at all.'
    },
    pickName: 'Sara Bejlek',
    confidence: 62,
    volatility: 73,
    angle: 'Bejlek is the better current-trust clay side in a match where Stephens still carries more name than certainty',
    swing: 'If Stephens is locked in on serve plus first strike from the beginning, the talent ceiling can still take the match away.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-snigur-tauson-2026-05-24',
    start: '7:30 AM PT',
    startMinutes: 450,
    format: 'WTA',
    playerA: {
      name: 'Daria Snigur',
      boardPct: 39,
      profile: 'Change-up dog',
      recordTag: 'Needs disruption',
      note: 'Snigur has to win this by making the favorite uncomfortable, not by out-hitting her.'
    },
    playerB: {
      name: 'Clara Tauson',
      boardPct: 62,
      profile: 'Bigger-ball favorite',
      recordTag: 'Cleaner weapons',
      note: 'Tauson has the heavier clean weapons and should control more of the match if she stays patient on clay.'
    },
    pickName: 'Clara Tauson',
    confidence: 65,
    volatility: 62,
    angle: 'Tauson has the clearer weapons edge and enough current support to take this as long as she respects the clay patience required',
    swing: 'If Snigur turns it into a pattern-breaker’s match instead of a strike-first match, the upset path gets real.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-w-efremova-cirstea-2026-05-24',
    start: '7:30 AM PT',
    startMinutes: 450,
    format: 'WTA',
    playerA: {
      name: 'Ksenia Efremova',
      boardPct: 5,
      profile: 'French upside longshot',
      recordTag: 'Future more than now',
      note: 'Efremova is talented, but this is still a big jump in class for a round-one major match.'
    },
    playerB: {
      name: 'Sorana Cirstea',
      boardPct: 95,
      profile: 'Veteran class edge',
      recordTag: 'One of the cleaner WTA favorites',
      note: 'Cirstea gets a very manageable opener if she simply plays to level and does not overcomplicate the clay patterns.'
    },
    pickName: 'Sorana Cirstea',
    confidence: 76,
    volatility: 44,
    angle: 'Cirstea is one of the cleaner women’s favorites because the experience and quality jump is still real here',
    swing: 'Only a very flat Cirstea opening set really makes this interesting.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-royer-dellien-2026-05-24',
    start: '7:00 AM PT',
    startMinutes: 420,
    format: 'ATP',
    playerA: {
      name: 'Valentin Royer',
      boardPct: 44,
      profile: 'French wild-card energy',
      recordTag: 'Crowd pressure lane',
      note: 'Royer will have the crowd, but Dellien is the one with the more repeatable clay grind profile.'
    },
    playerB: {
      name: 'Hugo Dellien',
      boardPct: 57,
      profile: 'Pure clay grinder',
      recordTag: 'Safer clay floor',
      note: 'Dellien usually gives you the more repeatable clay point pattern in this kind of opener.'
    },
    pickName: 'Hugo Dellien',
    confidence: 60,
    volatility: 63,
    angle: 'Dellien has the safer clay floor even if the French crowd keeps the opener annoying',
    swing: 'If Royer serves above his normal lane and keeps the stadium hot, Dellien can get pulled into a mess.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-hanfmann-medjedovic-2026-05-24',
    start: '7:00 AM PT',
    startMinutes: 420,
    format: 'ATP',
    playerA: {
      name: 'Yannick Hanfmann',
      boardPct: 35,
      profile: 'Clay-capable veteran',
      recordTag: 'Not dead, but underpowered',
      note: 'Hanfmann can play clay, but he still looks like the weaker current-side if Medjedovic is healthy enough.'
    },
    playerB: {
      name: 'Hamad Medjedovic',
      boardPct: 66,
      profile: 'Higher-upside current lane',
      recordTag: 'Cleaner pressure side',
      note: 'Medjedovic carries the stronger current pressure profile if the body holds up over a best-of-five start.'
    },
    pickName: 'Hamad Medjedovic',
    confidence: 63,
    volatility: 68,
    angle: 'Medjedovic has the stronger current pressure lane and should own more of the first-strike tennis',
    swing: 'If the match gets overly physical and long, Hanfmann’s clay reps can pull this much closer.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-pavlovic-fonseca-2026-05-24',
    start: '7:00 AM PT',
    startMinutes: 420,
    format: 'ATP',
    playerA: {
      name: 'Luka Pavlovic',
      boardPct: 9,
      profile: 'French qualifier spoiler',
      recordTag: 'Needs first-strike chaos',
      note: 'Pavlovic needs serve pressure and a noisy atmosphere because the steadier clay talent edge sits on the other side.'
    },
    playerB: {
      name: 'Joao Fonseca',
      boardPct: 93,
      profile: 'Top young clay favorite',
      recordTag: 'Clean ATP side',
      note: 'Fonseca is one of the better ATP favorites on this board because the live level and clay upside are both real.'
    },
    pickName: 'Joao Fonseca',
    confidence: 75,
    volatility: 47,
    angle: 'Fonseca still looks like a real ATP clay favorite rather than a hype-only favorite here',
    swing: 'If Pavlovic keeps enough free points flowing on serve and drags the crowd into every game, a set can still get weird.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-blockx-wong-2026-05-24',
    start: '7:00 AM PT',
    startMinutes: 420,
    format: 'ATP',
    playerA: {
      name: 'Alexander Blockx',
      boardPct: 88,
      profile: 'Higher-rated young favorite',
      recordTag: 'Cleaner youth lane',
      note: 'Blockx has the cleaner young-player favorite lane if he keeps the match from getting too loose.'
    },
    playerB: {
      name: 'Coleman Wong',
      boardPct: 13,
      profile: 'Live counter lane',
      recordTag: 'Needs rhythm break',
      note: 'Wong needs to drag Blockx into an uncomfortable rhythm match instead of a clean talent match.'
    },
    pickName: 'Alexander Blockx',
    confidence: 69,
    volatility: 55,
    angle: 'Blockx has the cleaner overall youth-upside path and should be able to control more of the match',
    swing: 'If Wong turns it into a shape match and keeps points awkward, Blockx can start leaking cheap games.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-mpetshi-perricard-djokovic-2026-05-24',
    start: '11:15 AM PT',
    startMinutes: 675,
    format: 'ATP',
    playerA: {
      name: 'Giovanni Mpetshi Perricard',
      boardPct: 12,
      profile: 'Serve-bomb spoiler',
      recordTag: 'One-set chaos lane',
      note: 'Mpetshi Perricard is live only if the serve dominates enough to turn this into tiebreak and scoreboard pressure.'
    },
    playerB: {
      name: 'Novak Djokovic',
      boardPct: 89,
      profile: 'GOAT favorite, but not peak auto-pilot',
      recordTag: 'Still right side, not free',
      note: 'Djokovic is still the right match winner, but the serve pressure on the other side makes this much less automatic than the name suggests.'
    },
    pickName: 'Novak Djokovic',
    confidence: 70,
    volatility: 58,
    angle: 'Djokovic still owns the better best-of-five problem-solving path, even if the price-like split is hotter than the actual danger level',
    swing: 'If Djokovic has to play repeated tiebreaks because he cannot get real return dents early, the whole match tightens.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-sinner-tabur-2026-05-25',
    start: 'May 25, 2:00 AM PT',
    startMinutes: 1560,
    format: 'ATP',
    playerA: {
      name: 'Jannik Sinner',
      boardPct: 99,
      profile: 'Top-end major favorite',
      recordTag: 'Overnight carry',
      note: 'Sinner should have too much in every normal script of this match.'
    },
    playerB: {
      name: 'Clement Tabur',
      boardPct: 2,
      profile: 'Huge longshot',
      recordTag: 'Only chaos path',
      note: 'Tabur needs the match to go completely off the rails because the clean talent gap is massive.'
    },
    pickName: 'Jannik Sinner',
    confidence: 81,
    volatility: 35,
    angle: 'Sinner is just a clean early-round major favorite here',
    swing: 'Only a totally flat opening from Sinner makes this remotely alive.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-llamas-ruiz-tirante-2026-05-24',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'ATP',
    playerA: {
      name: 'Pablo Llamas Ruiz',
      boardPct: 47,
      profile: 'Clay-capable grinder',
      recordTag: 'Coin-flip ATP lane',
      note: 'Llamas Ruiz is perfectly live, but this is one of the harder true separation reads on the ATP side.'
    },
    playerB: {
      name: 'Thiago Agustin Tirante',
      boardPct: 54,
      profile: 'Slight clay edge',
      recordTag: 'Thin lean only',
      note: 'Tirante gets the desk lean mostly because the clay script looks a little more natural on his side.'
    },
    pickName: 'Thiago Agustin Tirante',
    confidence: 54,
    volatility: 79,
    angle: 'Tirante gets the tiniest clay-shape nod in what still looks like a very real toss-up',
    swing: 'If Llamas Ruiz controls the neutral rally pace, this goes straight back to even.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-khachanov-gea-2026-05-24',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'ATP',
    playerA: {
      name: 'Karen Khachanov',
      boardPct: 83,
      profile: 'Clean ATP clay favorite',
      recordTag: 'One of the better men’s sides',
      note: 'Khachanov has the better live level, better best-of-five floor, and cleaner clay control path.'
    },
    playerB: {
      name: 'Arthur Gea',
      boardPct: 18,
      profile: 'French wild-card dog',
      recordTag: 'Needs a crowd wave',
      note: 'Gea needs a hot stadium and a nervous favorite because the normal ATP script still runs to Khachanov.'
    },
    pickName: 'Karen Khachanov',
    confidence: 74,
    volatility: 46,
    angle: 'Khachanov is one of the cleaner ATP day-one favorites on the whole shortlist',
    swing: 'If Gea can keep the crowd engaged and make Khachanov play a tight first set, the opener gets messier.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-duckworth-diallo-2026-05-24',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'ATP',
    playerA: {
      name: 'James Duckworth',
      boardPct: 39,
      profile: 'Veteran underdog',
      recordTag: 'Needs shorter points',
      note: 'Duckworth wants this cleaner and faster than the average Roland Garros opener.'
    },
    playerB: {
      name: 'Gabriel Diallo',
      boardPct: 62,
      profile: 'Current pressure favorite',
      recordTag: 'Upside supported',
      note: 'Diallo looks like the better current pressure side as long as the clay does not completely drag him out of rhythm.'
    },
    pickName: 'Gabriel Diallo',
    confidence: 62,
    volatility: 67,
    angle: 'Diallo gets the nod because the current upside and first-strike pressure still look stronger here',
    swing: 'If Duckworth makes the points ugly and low-tempo, the favorite loses a lot of what makes him attractive.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-kecmanovic-marozsan-2026-05-24',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'ATP',
    playerA: {
      name: 'Miomir Kecmanovic',
      boardPct: 60,
      profile: 'Steadier ATP side',
      recordTag: 'Thin favorite',
      note: 'Kecmanovic is the steadier baseline pick, but this is not the kind of match where you should pretend the volatility disappears.'
    },
    playerB: {
      name: 'Fabian Marozsan',
      boardPct: 42,
      profile: 'Higher-volatility spoiler',
      recordTag: 'Can redline',
      note: 'Marozsan can absolutely take the racquet away for stretches if the shotmaking lands.'
    },
    pickName: 'Miomir Kecmanovic',
    confidence: 58,
    volatility: 73,
    angle: 'Kecmanovic gets the desk lean because he is a little more repeatable over five sets than Marozsan is',
    swing: 'If Marozsan finds the aggressive range early, the steadier script can disappear quickly.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-dzumhur-davidovich-fokina-2026-05-24',
    start: '2:00 AM PT',
    startMinutes: 120,
    format: 'ATP',
    playerA: {
      name: 'Damir Dzumhur',
      boardPct: 15,
      profile: 'Counterpunch dog',
      recordTag: 'Needs attrition',
      note: 'Dzumhur needs this to become long and emotionally messy to gain real traction.'
    },
    playerB: {
      name: 'Alejandro Davidovich Fokina',
      boardPct: 87,
      profile: 'Better clay athlete',
      recordTag: 'Favored for a reason',
      note: 'ADF has the better live athletic and clay pressure profile if he does not spray the match away.'
    },
    pickName: 'Alejandro Davidovich Fokina',
    confidence: 70,
    volatility: 56,
    angle: 'Davidovich Fokina still has the better clay-athlete lane and should own more of the dynamic points',
    swing: 'If he starts leaking games through impatience, Dzumhur is exactly the kind of opponent who drags him into a headache.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-jacquet-trungelliti-2026-05-24',
    start: '3:30 AM PT',
    startMinutes: 210,
    format: 'ATP',
    playerA: {
      name: 'Kyrian Jacquet',
      boardPct: 57,
      profile: 'French home lean',
      recordTag: 'Thin but real lean',
      note: 'Jacquet gets the home-clay lift and enough current support to deserve a small lean.'
    },
    playerB: {
      name: 'Marco Trungelliti',
      boardPct: 44,
      profile: 'Crafty veteran clay dog',
      recordTag: 'Spoiler if long',
      note: 'Trungelliti can absolutely turn this into a long, annoying clay problem if Jacquet gets nervous.'
    },
    pickName: 'Kyrian Jacquet',
    confidence: 57,
    volatility: 72,
    angle: 'Jacquet gets the home-clay nod, but this is still closer to a pressure match than a clean favorite lane',
    swing: 'If Trungelliti stretches the rallies and drags the crowd from support into tension, the match flips fast.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-machac-bergs-2026-05-24',
    start: '4:00 AM PT',
    startMinutes: 240,
    format: 'ATP',
    playerA: {
      name: 'Tomas Machac',
      boardPct: 58,
      profile: 'More complete current player',
      recordTag: 'Reasonable ATP lean',
      note: 'Machac gets the nod because his all-around level is cleaner than Bergs’ on most days.'
    },
    playerB: {
      name: 'Zizou Bergs',
      boardPct: 44,
      profile: 'Athletic spoiler',
      recordTag: 'Live if pace works',
      note: 'Bergs is live if he can keep the match athletic and front-foot instead of letting it settle into a cleaner structure.'
    },
    pickName: 'Tomas Machac',
    confidence: 61,
    volatility: 66,
    angle: 'Machac is still the more complete day-one ATP side even if the edge is not huge',
    swing: 'If Bergs gets enough free pace and keeps the rallies shorter, this gets much closer than the desk wants.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-borges-etcheverry-2026-05-24',
    start: '4:00 AM PT',
    startMinutes: 240,
    format: 'ATP',
    playerA: {
      name: 'Nuno Borges',
      boardPct: 34,
      profile: 'Live all-court underdog',
      recordTag: 'Not dead, but less natural',
      note: 'Borges is good enough to hang around, but this matchup still tilts to the more natural clay script on the other side.'
    },
    playerB: {
      name: 'Tomas Martin Etcheverry',
      boardPct: 68,
      profile: 'Pure clay tournament type',
      recordTag: 'One of the better clay reads',
      note: 'Etcheverry usually gives you the more repeatable clay shape over five sets in this kind of match.'
    },
    pickName: 'Tomas Martin Etcheverry',
    confidence: 69,
    volatility: 52,
    angle: 'Etcheverry is the stronger clay-script player and should be favored for the right reasons here',
    swing: 'If Borges can keep the match from settling into a pure clay baseline pattern, the edge narrows a lot.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-zverev-bonzi-2026-05-24',
    start: '4:30 AM PT',
    startMinutes: 270,
    format: 'ATP',
    playerA: {
      name: 'Alexander Zverev',
      boardPct: 96,
      profile: 'Top-tier ATP favorite',
      recordTag: 'Clean elite side',
      note: 'Zverev is still one of the more trustworthy men’s favorites because the clay baseline and best-of-five floor are both real.'
    },
    playerB: {
      name: 'Benjamin Bonzi',
      boardPct: 6,
      profile: 'French crowd spoiler',
      recordTag: 'Needs atmosphere and timing',
      note: 'Bonzi needs the crowd plus a wobbly serving start from Zverev because the clean matchup still runs heavily against him.'
    },
    pickName: 'Alexander Zverev',
    confidence: 79,
    volatility: 39,
    angle: 'Zverev is one of the cleanest ATP match-winner reads on the full board',
    swing: 'If Bonzi can drag the first set into a tiebreak or a crowd-heavy grind, the match gets more annoying but still starts from a clear Zverev edge.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-droguet-mensik-2026-05-24',
    start: '5:00 AM PT',
    startMinutes: 300,
    format: 'ATP',
    playerA: {
      name: 'Titouan Droguet',
      boardPct: 33,
      profile: 'French home dog',
      recordTag: 'Energy upset lane',
      note: 'Droguet can get real crowd lift, but the cleaner long-term upside still sits opposite him.'
    },
    playerB: {
      name: 'Jakub Mensik',
      boardPct: 68,
      profile: 'Better young favorite',
      recordTag: 'Upside supported',
      note: 'Mensik is simply the more dangerous player if the match is decided by who brings more top-end shot quality over time.'
    },
    pickName: 'Jakub Mensik',
    confidence: 67,
    volatility: 59,
    angle: 'Mensik gets the nod because the long-run upside and baseline pressure should tell over five sets',
    swing: 'If Droguet makes the atmosphere hot enough and turns the match emotional, the opener can get sticky.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-m-zheng-prizmic-2026-05-24',
    start: '5:00 AM PT',
    startMinutes: 300,
    format: 'ATP',
    playerA: {
      name: 'Michael Zheng',
      boardPct: 18,
      profile: 'Young longshot',
      recordTag: 'Needs breakout day',
      note: 'Zheng needs the match to land far above his baseline if he is going to upset a steadier clay-side opponent.'
    },
    playerB: {
      name: 'Dino Prizmic',
      boardPct: 84,
      profile: 'Cleaner clay prospect',
      recordTag: 'Strong ATP youth lane',
      note: 'Prizmic looks like the more stable clay prospect right now and should control more of the match pattern.'
    },
    pickName: 'Dino Prizmic',
    confidence: 71,
    volatility: 50,
    angle: 'Prizmic is the cleaner clay prospect and should be trusted more than the underdog in a normal script',
    swing: 'If Zheng can turn the match into a pure first-strike contest before the clay points lengthen, the upset path appears.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-halys-bellucci-2026-05-24',
    start: '5:00 AM PT',
    startMinutes: 300,
    format: 'ATP',
    playerA: {
      name: 'Quentin Halys',
      boardPct: 57,
      profile: 'French crowd favorite',
      recordTag: 'Price may be rich',
      note: 'Halys gets crowd help, but this is the kind of match where the favorite number can lean too hard into home support.'
    },
    playerB: {
      name: 'Mattia Bellucci',
      boardPct: 44,
      profile: 'Live clay dog',
      recordTag: 'Useful dog lane',
      note: 'Bellucci is live because the actual tennis matchup looks closer than the crowd aura around Halys.'
    },
    pickName: 'Mattia Bellucci',
    confidence: 58,
    volatility: 74,
    angle: 'Bellucci is the live dog because the crowd premium on Halys looks a little too expensive',
    swing: 'If Halys serves lights-out and rides the stadium momentum, the dog case can disappear fast.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-fritz-basavareddy-2026-05-24',
    start: '5:30 AM PT',
    startMinutes: 330,
    format: 'ATP',
    playerA: {
      name: 'Taylor Fritz',
      boardPct: 80,
      profile: 'Bigger-name ATP favorite',
      recordTag: 'Should win, not a clay lock',
      note: 'Fritz should still advance more often, but he is not the kind of clay favorite you want to pretend is flawless.'
    },
    playerB: {
      name: 'Nishesh Basavareddy',
      boardPct: 21,
      profile: 'Young challenger',
      recordTag: 'Needs pace lane',
      note: 'Basavareddy needs the match to stay clean and offensive because the longer clay grind still favors the favorite’s level.'
    },
    pickName: 'Taylor Fritz',
    confidence: 66,
    volatility: 60,
    angle: 'Fritz is still the better player and should win more often even if this is not a blind clay-steam spot',
    swing: 'If Basavareddy serves freely and Fritz gets impatient on the dirt, this can get more dangerous than the name read suggests.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-cina-opelka-2026-05-24',
    start: '5:30 AM PT',
    startMinutes: 330,
    format: 'ATP',
    playerA: {
      name: 'Federico Cina',
      boardPct: 65,
      profile: 'Clay-side youngster',
      recordTag: 'Interesting style edge',
      note: 'Cina gets the more natural clay-shape lane if he can make Opelka actually play rallies.'
    },
    playerB: {
      name: 'Reilly Opelka',
      boardPct: 37,
      profile: 'Serve-only chaos path',
      recordTag: 'Short-point threat',
      note: 'Opelka can wreck any read if the serve is untouchable, but clay still asks him to do the thing he least wants to do.'
    },
    pickName: 'Federico Cina',
    confidence: 61,
    volatility: 75,
    angle: 'Cina gets the desk lean because the match should favor the player more willing to actually play on clay',
    swing: 'If Opelka holds serve too easily and keeps this in short-point mode, the clay argument never gets to breathe.'
  }),
  makeRolandGarrosMatch({
    id: 'rg-m-sonego-herbert-2026-05-24',
    start: '7:00 AM PT',
    startMinutes: 420,
    format: 'ATP',
    playerA: {
      name: 'Lorenzo Sonego',
      boardPct: 65,
      profile: 'More stable ATP side',
      recordTag: 'French crowd still matters',
      note: 'Sonego gets the cleaner overall lane, but Herbert can still make the match noisy in Paris.'
    },
    playerB: {
      name: 'Pierre-Hugues Herbert',
      boardPct: 36,
      profile: 'French veteran spoiler',
      recordTag: 'Crowd and serve path',
      note: 'Herbert needs crowd energy and enough serve quality to stop the match from becoming a repeatable Sonego clay pattern.'
    },
    pickName: 'Lorenzo Sonego',
    confidence: 64,
    volatility: 65,
    angle: 'Sonego is the more stable ATP match side if the opener plays in a mostly normal clay shape',
    swing: 'If Herbert rides the crowd and keeps the match on his serve, the pressure can shift fast.'
  })
]

const mlbIdCounts = new Map()
const mlbGames = rawGames.map((raw) => {
  const seen = mlbIdCounts.get(raw.id) ?? 0
  mlbIdCounts.set(raw.id, seen + 1)
  return buildMlbGame(raw, seen)
})

export const slateMeta = {
  title: 'Sunday MLB + Roland Garros Desk',
  date: 'May 24, 2026',
  isoDate: '2026-05-24',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A combined Sunday slate with the full May 24 MLB board plus the user-shortlist Roland Garros Day 1 tennis desk, using the generated MLB pipeline outputs and manual clay reads for tennis.',
  notes: [
    'MLB is coming from the generated May 24 split files, including starter context, lineup boards, park context, bullpen-chain context, and the current state / mistake-shape layers.',
    'The tennis portion is focused only on the Roland Garros round-one matches from the user shortlist rather than the full major board.',
    'The visible percentages are crowd-board shape, not sportsbook lines. The desk is using them to judge where the public may be too hot or too cold on a player.',
    'ATP clay reads are still being trusted more than WTA name reads after the recent postmortem, so the cleaner men’s favorites are promoted more aggressively than the women’s name brands.',
    'Several WTA matches are deliberately treated as live-dog or pressure-openers rather than clean favorite spots, even when the public split looks lopsided.',
    'Sinner vs Tabur rolls into the early May 25 Pacific window, but it is included here because it was part of the same user shortlist.'
  ]
}

export const filters = ['All', 'MLB', 'Tennis']

export const oddsMeta = {
  provider: 'Official MLB data + ScoresAndOdds live board / Roland Garros desk board',
  snapshot: 'May 24, 2026 MLB + Roland Garros desk',
  note:
    'MLB uses the generated live board pipeline with official data and accessible odds snapshots. Tennis uses community split screenshots plus manual desk reads built around clay fit, pressure tolerance, and live-dog risk.'
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
    url: 'https://www.rolandgarros.com/en-us/order-of-play?annexeCourt=all&competition=all&country=all&date=2026-05-24&favoriteFilter=false&principalCourt=all&year=2026'
  },
  {
    label: 'ATP Tour Day 1 schedule note',
    url: 'https://www.atptour.com/en/news/roland-garros-2026-sunday-schedule'
  },
  {
    label: 'WTA match notes hub',
    url: 'https://www.wtatennis.com/match-notes'
  },
  {
    label: 'Tennistonic H2H compare',
    url: 'https://tennistonic.com/head-to-head-compare/Karen-Khachanov-Vs-Arthur-Gea/'
  }
]

export const games = [...mlbGames, ...matches].sort(
  (left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title)
)

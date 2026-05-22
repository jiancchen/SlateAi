import { createSportsMatchModel } from './sports-model.js'
import { tennisClayContext } from './day-2026-05-21-tennis-context.js'
import { buildTennistonicH2HUrl } from './tennis-source-mapping.js'
import qualifierTennistonicContext from './day-2026-05-22-qualifier-context.generated.json' with { type: 'json' }

const oddsProvider = 'Oddschecker + TennisStats clay board'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const formatPct = (value) => (Number.isFinite(value) ? `${value.toFixed(1)}%` : 'n/a')
const formatRank = (value) => (Number.isFinite(value) ? `${Math.round(value)}` : 'n/a')

const qualifierClayOverrides = {
  'Aliaksandra Sasnovich': {
    note:
      'Recent Tennistonic log shows a clay-heavy run through Paris qualifying and the European clay swing, but the point-level SPW/RPW sample is not structured in the current dataset yet.'
  },
  'Marina Bassols Ribera': {
    note:
      'Recent clay run includes Paris qualifying, La Bisbal d’Emporda, Madrid, and W75 Portoroz, with wins over Karolina Pliskova and Beatriz Haddad Maia standing out in the recent lane.'
  }
}

const defaultQualifierClayFallback = {
  note:
    'Roland-Garros qualifying is a clay-only board, so recent schedule context should still be read as clay-relevant even when the structured SPW/RPW warehouse layer has not been loaded yet.'
}

const recentOpponentStrengthMap = {
  'Beatriz Haddad Maia': 5,
  'Donna Vekic': 5,
  'Nicolas Jarry': 5,
  'Bianca Vanessa Andreescu': 5,
  'Karolina Pliskova': 4.8,
  'Pablo Carreno-Busta': 4.8,
  'Thiago Seyboth Wild': 4.6,
  'Tomas Barrios Vera': 4.5,
  'Sebastian Ofner': 4.5,
  'Jesper De Jong': 4.5,
  'Dusan Lajovic': 4.5,
  'Lucia Bronzetti': 4.5,
  'Viktoriya Tomova': 4.4,
  'Federico Coria': 4.4,
  'Tristan Schoolkate': 4.3,
  'Timofey Skatov': 4.3,
  'Luca Van Assche': 4.3,
  'Laura Pigossi': 4.3,
  'Kaja Juvan': 4.3,
  'Jerome Kym': 4.3,
  'Rebeka Masarova': 4.3,
  'Henrique Rocha': 4.3,
  'Benjamin Hassan': 4.1,
  'Bu Yunchaokete': 4.1,
  'Jaime Faria': 4.1,
  'Arthur Fery': 4.1,
  'Marco Trungelliti': 4.1,
  'Polona Hercog': 4.1,
  'Kristina Mladenovic': 4.1,
  'Nuria Brancaccio': 4.1,
  'Mark Lajal': 4.1,
  'Gustavo Heide': 4.1,
  'Luca Nardi': 4.1,
  'Jan Choinski': 4.1,
  'Kaichi Uchida': 4.1,
  'Alex Molcan': 4.1,
  'Rodrigo Pacheco Mendez': 3.9,
  'Nicolai Budkov Kjaer': 3.9,
  'Martin Krumich': 3.9,
  'Joao Lucas Reis Da Silva': 3.9,
  'Nicolas Mejia': 3.9,
  'Vilius Gaubas': 3.9,
  'Katarzyna Kawa': 3.8,
  'Whitney Osuigwe': 3.7,
  'Oceane Dodin': 3.7,
  'Varvara Lepchenko': 3.7,
  'Francesco Maestrelli': 3.7,
  'Alejandro Moro Canas': 3.7,
  'Rudolf Molleker': 3.7,
  'Mai Hontama': 3.7,
  'Anastasiia Sobolieva': 3.7,
  'Kaja Juvan': 4.3,
  'Storm Hunter': 3.6,
  'Chloe Paquet': 3.6,
  'Anouk Koevermans': 3.6,
  'Francisca Jorge': 3.5,
  'Harry Wendelken': 3.4,
  'Julie Belgraver': 3.3,
  'Aoi Ito': 3.3,
  'Sean Cuenin': 3.2,
  'Teodora Kostovic': 3.2,
  'Rei Sakamoto': 3.2,
  'Amandine Monnot': 3.1,
  'Julia Stusek': 3.1,
  'Matthew William Donald': 3,
  'Lautaro Midon': 3,
  'Yexin Ma': 2.9,
  'Carol Zhao': 2.9,
  'Alicia Dudeney': 2.8,
  'Caijsa Wilda Hennemann': 2.8,
  'Karman Kaur Thandi': 2.8,
  'Alice Robbe': 2.8,
  'Lucie Havlickova': 2.8
}

const buildQualifierFallback = (playerName) => {
  const base = qualifierTennistonicContext[playerName] ?? null
  const override = qualifierClayOverrides[playerName] ?? null
  if (!base && !override) return null
  return {
    ...(base ?? {}),
    ...(override ?? {}),
    note: [base?.note, override?.note].filter(Boolean).join(' | ') || override?.note || base?.note || ''
  }
}

const qualifierRecentWinPct = (fallback) =>
  Number.isFinite(fallback?.sample) && fallback.sample > 0 ? fallback.wins / fallback.sample : null

const qualifierTapeWinPct = (fallback) =>
  Number.isFinite(fallback?.tapeWins) && Number.isFinite(fallback?.tapeLosses) && fallback.tapeWins + fallback.tapeLosses > 0
    ? fallback.tapeWins / (fallback.tapeWins + fallback.tapeLosses)
    : null

const qualifierOpponentStrength = (fallback) => {
  const rows = fallback?.recentRows?.filter((row) => row?.opponent) ?? []
  if (!rows.length) return null
  const values = rows.map((row) => recentOpponentStrengthMap[row.opponent] ?? 3)
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const qualifierRecentOpponents = (fallback, limit = 3) =>
  (fallback?.recentRows ?? [])
    .map((row) => row?.opponent)
    .filter(Boolean)
    .slice(0, limit)

const formatRecentOpposition = (fallback, limit = 3) => {
  const opponents = qualifierRecentOpponents(fallback, limit)
  if (!opponents.length) return 'recent opponent lane n/a'
  return opponents.join(', ')
}

const qualifierFallbackScore = (fallback, rank = null) => {
  if (!fallback) return null
  const seasonPct = Number.isFinite(fallback.winPct2026) ? fallback.winPct2026 : 0.5
  const recentPct = qualifierRecentWinPct(fallback) ?? 0.5
  const tapePct = qualifierTapeWinPct(fallback) ?? 0.5
  const margin = Number.isFinite(fallback.avgMargin) ? fallback.avgMargin : 0
  const tier = Number.isFinite(fallback.avgTier) ? fallback.avgTier : 2
  const straightSets = Number.isFinite(fallback.straightSetWins) ? fallback.straightSetWins : 0
  const decidingSets = Number.isFinite(fallback.decidingSetMatches) ? fallback.decidingSetMatches : 0
  const oppositionStrength = qualifierOpponentStrength(fallback) ?? 3
  const rankBonus = Number.isFinite(rank) ? clamp((220 - rank) / 25, -4, 6) : 0
  return (
    seasonPct * 28 +
    recentPct * 28 +
    tapePct * 18 +
    margin * 1.5 +
    tier * 2.5 +
    straightSets * 1.4 -
    decidingSets * 0.7 +
    (oppositionStrength - 3) * 7 +
    rankBonus
  )
}

const qualifierFallbackForm = (fallback) => {
  if (!fallback) return null
  const score = qualifierFallbackScore(fallback)
  return Number.isFinite(score) ? clamp(Math.round(score), 44, 88) : null
}

const estimateHoldRate = (servicePointWinPct) => {
  if (!Number.isFinite(servicePointWinPct)) return null
  const p = clamp(servicePointWinPct / 100, 0.35, 0.85)
  const q = 1 - p
  const preDeuce = p ** 4 * (1 + 4 * q + 10 * q ** 2)
  const deuceReach = 20 * p ** 3 * q ** 3
  const deuceWin = (p ** 2) / (1 - 2 * p * q)
  return clamp((preDeuce + deuceReach * deuceWin) * 100, 0, 100)
}

const formatHoldRate = (servicePointWinPct) => {
  const value = estimateHoldRate(servicePointWinPct)
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : 'n/a'
}

const decimalToAmerican = (decimalOdds) => {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) return null
  if (decimalOdds >= 2) return Math.round((decimalOdds - 1) * 100)
  return Math.round(-100 / (decimalOdds - 1))
}

const formatAmericanOdds = (value) => {
  if (!Number.isFinite(value)) return ''
  return value > 0 ? `+${value}` : `${value}`
}

const buildMoneylineValue = (playerA, playerB) => {
  const left = decimalToAmerican(playerA.decimalOdds)
  const right = decimalToAmerican(playerB.decimalOdds)
  if (!Number.isFinite(left) || !Number.isFinite(right)) return ''
  return `${formatAmericanOdds(left)} / ${formatAmericanOdds(right)}`
}

const withClayContext = (player) => ({
  ...player,
  recentClay: tennisClayContext[player.name] ?? null,
  recentClayFallback: player.recentClayFallback ?? buildQualifierFallback(player.name)
})

const normalizedMoneylineProb = (player, opponent) => {
  if (!Number.isFinite(player.decimalOdds) || !Number.isFinite(opponent.decimalOdds)) return null
  const own = 1 / player.decimalOdds
  const other = 1 / opponent.decimalOdds
  const total = own + other
  return total > 0 ? own / total : null
}

const clayCompositeScore = (player) => {
  const ctx = player.recentClay
  if (!ctx) return null
  return ctx.spw + ctx.rpw + (ctx.dr - 1) * 18
}

const clayScoreDelta = (pick, opponent) => {
  const pickScore = clayCompositeScore(pick)
  const opponentScore = clayCompositeScore(opponent)
  if (!Number.isFinite(pickScore) || !Number.isFinite(opponentScore)) {
    const pickFallback = qualifierFallbackScore(pick.recentClayFallback, pick.rank)
    const opponentFallback = qualifierFallbackScore(opponent.recentClayFallback, opponent.rank)
    if (Number.isFinite(pickFallback) && Number.isFinite(opponentFallback)) {
      return pickFallback - opponentFallback
    }
  }
  if (!Number.isFinite(pickScore) || !Number.isFinite(opponentScore)) return null

  const pickOppAvg = pick.recentClay?.lastOppRankAvg
  const opponentOppAvg = opponent.recentClay?.lastOppRankAvg
  const scheduleAdjustment =
    Number.isFinite(pickOppAvg) && Number.isFinite(opponentOppAvg)
      ? clamp((opponentOppAvg - pickOppAvg) / 30, -3, 3)
      : 0

  return pickScore - opponentScore + scheduleAdjustment
}

const buildClayLine = (player) => {
  const ctx = player.recentClay
  if (!ctx && player.recentClayFallback) {
    const fallback = player.recentClayFallback
    if (Number.isFinite(fallback.wins) && Number.isFinite(fallback.losses)) {
      const tape = Number.isFinite(fallback.tapeWins) && Number.isFinite(fallback.tapeLosses) ? `${fallback.tapeWins}-${fallback.tapeLosses} tape` : 'tape n/a'
      const season = Number.isFinite(fallback.winPct2026) ? `${Math.round(fallback.winPct2026 * 100)}% 2026 win` : '2026 n/a'
      const margin = Number.isFinite(fallback.avgMargin) ? `${fallback.avgMargin >= 0 ? '+' : ''}${fallback.avgMargin.toFixed(1)} avg margin` : 'margin n/a'
      const oppositionStrength = qualifierOpponentStrength(fallback)
      const oppositionLine = Number.isFinite(oppositionStrength) ? `opp lane ${oppositionStrength.toFixed(1)}/5` : 'opp lane n/a'
      return `Clay ${fallback.wins}-${fallback.losses} recent | ${tape} | ${season} | ${margin} | ${oppositionLine}`
    }
    return `Clay-heavy recent schedule | ${fallback.note}`
  }
  if (!ctx) return 'Structured clay point sample not loaded yet.'
  return `Clay ${ctx.wins}-${ctx.losses} | ${formatPct(ctx.spw)} SPW | est hold ${formatHoldRate(ctx.spw)} | ${formatPct(ctx.rpw)} RPW | avg opp rk ${formatRank(ctx.lastOppRankAvg)}`
}

const buildClayShape = (player) => {
  const ctx = player.recentClay
  if (!ctx && player.recentClayFallback) {
    const fallback = player.recentClayFallback
    if (Number.isFinite(fallback.wins) && Number.isFinite(fallback.losses)) {
      const tape = Number.isFinite(fallback.tapeWins) && Number.isFinite(fallback.tapeLosses) ? `${fallback.tapeWins}-${fallback.tapeLosses}` : 'n/a'
      const season = Number.isFinite(fallback.winPct2026) ? `${Math.round(fallback.winPct2026 * 100)}%` : 'n/a'
      const tier = Number.isFinite(fallback.avgTier) ? `${fallback.avgTier.toFixed(1)}/5` : 'n/a'
      const margin = Number.isFinite(fallback.avgMargin) ? `${fallback.avgMargin >= 0 ? '+' : ''}${fallback.avgMargin.toFixed(1)}` : 'n/a'
      const oppositionStrength = qualifierOpponentStrength(fallback)
      const oppositionLine = Number.isFinite(oppositionStrength)
        ? `Recent opponent lane grades about ${oppositionStrength.toFixed(1)}/5 with wins over ${formatRecentOpposition(fallback)}.`
        : `Recent wins include ${formatRecentOpposition(fallback)}.`
      return `${player.name} is ${fallback.wins}-${fallback.losses} in the recent clay log with a ${tape} 10-match tape, ${season} 2026 win rate, ${margin} average game margin, and ${tier} recent schedule level. ${oppositionLine} ${fallback.note}`.trim()
    }
    return `${player.name} has a clearly clay-heavy recent schedule. ${fallback.note} We still do not have the point-level SPW/RPW hold sample loaded for this player on this pass.`
  }
  if (!ctx) return `${player.name} is still being treated as a clay match read here, but the structured point-level clay sample is not loaded yet.`
  return `${player.name} is ${ctx.wins}-${ctx.losses} over ${ctx.sample} recent clay matches, winning ${formatPct(ctx.spw)} of service points with an estimated ${formatHoldRate(ctx.spw)} hold rate, plus ${formatPct(ctx.rpw)} of return points against opponents averaging rank ${formatRank(ctx.lastOppRankAvg)}.`
}

const buildPlayerLabel = (player) => `#${formatRank(player.rank)} ${player.name}`

const playerDetail = (player) => {
  const parts = [`Rank ${player.rank}`]
  if (Number.isFinite(player.form)) parts.push(`Form ${player.form}`)
  if (Number.isFinite(player.elo)) parts.push(`Elo ${player.elo}`)
  if (player.seed) parts.push(`Seed ${player.seed}`)
  if (player.record2026) parts.push(player.record2026)
  if (player.recentClay || player.recentClayFallback) parts.push(buildClayLine(player))
  return parts.join(' | ')
}

const buildClayDecisionNote = (pick, opponent) => {
  const delta = clayScoreDelta(pick, opponent)
  if (!Number.isFinite(delta)) {
    if (pick.recentClayFallback || opponent.recentClayFallback) {
      return 'Recent clay match logs are loaded here, so the qualifier edge is being driven by recent clay record, 10-match tape, schedule level, and match-margin form even though the full SPW/RPW layer is still incomplete.'
    }
    return 'Point-level clay numbers are not fully loaded here, so the edge is leaning more on ranking, market shape, and known clay-week context than a complete SPW/RPW sample.'
  }

  if (delta >= 8) return `Recent clay point-winning leans clearly toward ${pick.name}, and the board shape agrees.`
  if (delta >= 3) return `Recent clay numbers still lean ${pick.name}, but the edge is more about steadier point-winning than knockout dominance.`
  if (delta > -3) return 'Recent clay point-winning is basically flat here, so this semifinal is more about match management and nerve control than raw surface separation.'
  if (delta > -8) return `Recent clay point-winning data tilts a bit toward ${opponent.name}, so this stays a fragile board lean rather than a clean stats-backed favorite.`
  return `Recent clay point-winning runs against ${pick.name} in a real way, which is why this still profiles as a high-volatility match.`
}

const adjustConfidenceFromClay = (baseConfidence, baseVolatility, pick, opponent) => {
  const delta = clayScoreDelta(pick, opponent)
  let confidence = baseConfidence
  let volatility = baseVolatility

  if (Number.isFinite(delta)) {
    if (delta >= 5) {
      confidence += 3
      volatility -= 4
    } else if (delta >= 2) {
      confidence += 1
      volatility -= 2
    } else if (delta <= -5) {
      confidence -= 5
      volatility += 7
    } else if (delta <= -2) {
      confidence -= 3
      volatility += 4
    }
  }

  return {
    confidence: clamp(Math.round(confidence), 50, 82),
    volatility: clamp(Math.round(volatility), 42, 92)
  }
}

const buildComparisonRows = (playerA, playerB) => {
  const fallbackA = qualifierFallbackScore(playerA.recentClayFallback, playerA.rank)
  const fallbackB = qualifierFallbackScore(playerB.recentClayFallback, playerB.rank)
  const rows = [
    {
      label: 'Court advantage',
      metric: 'Clay fit',
      leftScore: clamp(
        Math.round(
          Number.isFinite(clayCompositeScore(playerA))
            ? (clayCompositeScore(playerA) ?? 92) - 6
            : Number.isFinite(fallbackA)
              ? fallbackA
              : 58
        ),
        20,
        95
      ),
      rightScore: clamp(
        Math.round(
          Number.isFinite(clayCompositeScore(playerB))
            ? (clayCompositeScore(playerB) ?? 92) - 6
            : Number.isFinite(fallbackB)
              ? fallbackB
              : 58
        ),
        20,
        95
      ),
      leftLabel: playerA.name,
      rightLabel: playerB.name
    },
    {
      label: 'Recent form',
      metric: 'Current rhythm',
      leftScore: clamp(Math.round(playerA.form ?? 50), 20, 95),
      rightScore: clamp(Math.round(playerB.form ?? 50), 20, 95),
      leftLabel: playerA.name,
      rightLabel: playerB.name
    },
    {
      label: 'Serve advantage',
      metric: 'Clay hold pressure',
      leftScore: clamp(
        Math.round(
          estimateHoldRate(playerA.recentClay?.spw ?? NaN) ??
            (Number.isFinite(playerA.recentClayFallback?.avgMargin) ? 60 + playerA.recentClayFallback.avgMargin * 2 : 62)
        ),
        20,
        95
      ),
      rightScore: clamp(
        Math.round(
          estimateHoldRate(playerB.recentClay?.spw ?? NaN) ??
            (Number.isFinite(playerB.recentClayFallback?.avgMargin) ? 60 + playerB.recentClayFallback.avgMargin * 2 : 62)
        ),
        20,
        95
      ),
      leftLabel: playerA.name,
      rightLabel: playerB.name
    },
    {
      label: 'Comeback advantage',
      metric: 'Return + grind',
      leftScore: clamp(
        Math.round(
          Number.isFinite(playerA.recentClay?.rpw)
            ? (playerA.recentClay?.rpw ?? 36) * 1.8
            : 52 + (playerA.recentClayFallback?.decidingSetMatches ?? 0) * 4 + (playerA.recentClayFallback?.wins ?? 0)
        ),
        20,
        95
      ),
      rightScore: clamp(
        Math.round(
          Number.isFinite(playerB.recentClay?.rpw)
            ? (playerB.recentClay?.rpw ?? 36) * 1.8
            : 52 + (playerB.recentClayFallback?.decidingSetMatches ?? 0) * 4 + (playerB.recentClayFallback?.wins ?? 0)
        ),
        20,
        95
      ),
      leftLabel: playerA.name,
      rightLabel: playerB.name
    },
    {
      label: 'Market trust',
      metric: 'Board price',
      leftScore: clamp(Math.round((normalizedMoneylineProb(playerA, playerB) ?? 0.5) * 100), 20, 95),
      rightScore: clamp(Math.round((normalizedMoneylineProb(playerB, playerA) ?? 0.5) * 100), 20, 95),
      leftLabel: playerA.name,
      rightLabel: playerB.name
    }
  ]

  return rows.map((row) => ({
    ...row,
    winner:
      row.leftScore === row.rightScore
        ? 'Even'
        : row.leftScore > row.rightScore
          ? row.leftLabel
          : row.rightLabel
  }))
}

const buildProjection = ({ pick, opponent, confidence, volatility }) => {
  const straightSets = confidence >= 68 && volatility <= 56
  const setLine = straightSets ? '2-0' : '2-1'
  const winnerSets = 2
  const loserSets = straightSets ? 0 : 1
  const winnerGames = straightSets ? 12 : 18
  const loserGames = straightSets ? 8 : 12
  const totalGames = straightSets ? 20 : 30
  const straightSetsProbability = clamp(Math.round(confidence - volatility * 0.2), 28, 76)
  const upsetRisk = clamp(Math.round(volatility * 0.88), 24, 82)

  const buildFantasyLine = (player, setsWon, setsLost, gamesWon, gamesLost) => {
    const aceRate = player.recentClay ? clamp((player.recentClay.spw - 52) * 0.12, 0.8, 6.5) : 2.4
    const doubleFaultRate = clamp(2.2 - aceRate * 0.18, 0.5, 2.4)
    const fantasy =
      10 +
      setsWon * 3 -
      setsLost * 3 +
      gamesWon -
      gamesLost +
      aceRate * 0.5 -
      doubleFaultRate * 0.5

    return {
      name: player.name,
      projectedFantasyScore: fantasy.toFixed(1),
      projectedSetsWon: setsWon,
      projectedSetsLost: setsLost,
      projectedGamesWon: gamesWon,
      projectedGamesLost: gamesLost,
      projectedAces: aceRate.toFixed(1),
      projectedDoubleFaults: doubleFaultRate.toFixed(1),
      winPath: `${player.name} projects for ${gamesWon} games won with about ${aceRate.toFixed(1)} aces and ${doubleFaultRate.toFixed(1)} double faults.`
    }
  }

  return {
    projectedWinner: pick.name,
    projectedSetLine: setLine,
    projectedScoreline: `${pick.name} over ${opponent.name}`,
    totalGames: `${totalGames}`,
    straightSetsProbability,
    upsetRisk,
    overview: `${pick.name} still owns the cleaner pre-match semifinal path, but this is a clay board, not a lock.`,
    fantasy: [
      buildFantasyLine(pick, winnerSets, loserSets, winnerGames, loserGames),
      buildFantasyLine(opponent, loserSets, winnerSets, loserGames, winnerGames)
    ]
  }
}

const makeTennisOdds = (playerA, playerB) => ({
  participantOrder: [0, 1],
  markets: [
    {
      label: 'Moneyline',
      book: oddsProvider,
      value: buildMoneylineValue(playerA, playerB)
    }
  ],
  note:
    'Clay-only tennis board using official semifinal schedules plus Oddschecker and TennisStats. Read the side with form, surface fit, and market shape together.',
  provider: oddsProvider
})

const buildSummary = ({ pick, opponent, event, round, angle }) => {
  const pickClay = pick.recentClay
  const opponentClay = opponent.recentClay
  if (pickClay && opponentClay) {
    return `${pick.name} gets the lean in ${event} ${round} because the recent clay profile is more stable: ${formatPct(pickClay.spw)} service points won and ${formatPct(pickClay.rpw)} return points won over the last ${pickClay.sample} clay matches, versus ${formatPct(opponentClay.spw)} and ${formatPct(opponentClay.rpw)} for ${opponent.name}, and the wider setup still says ${angle}.`
  }

  if (pick.recentClayFallback && opponent.recentClayFallback) {
    const pickTape = Number.isFinite(pick.recentClayFallback.tapeWins) && Number.isFinite(pick.recentClayFallback.tapeLosses)
      ? `${pick.recentClayFallback.tapeWins}-${pick.recentClayFallback.tapeLosses}`
      : 'n/a'
    const oppTape = Number.isFinite(opponent.recentClayFallback.tapeWins) && Number.isFinite(opponent.recentClayFallback.tapeLosses)
      ? `${opponent.recentClayFallback.tapeWins}-${opponent.recentClayFallback.tapeLosses}`
      : 'n/a'
    const pickOpposition = qualifierOpponentStrength(pick.recentClayFallback)
    const opponentOpposition = qualifierOpponentStrength(opponent.recentClayFallback)
    const oppositionLine =
      Number.isFinite(pickOpposition) && Number.isFinite(opponentOpposition)
        ? `The recent-opposition lane also leans ${pick.name}: ${pickOpposition.toFixed(1)}/5 versus ${opponentOpposition.toFixed(1)}/5.`
        : `Recent opposition check: ${pick.name} recently faced ${formatRecentOpposition(pick.recentClayFallback)}, while ${opponent.name} came through ${formatRecentOpposition(opponent.recentClayFallback)}.`
    return `${pick.name} gets the lean in ${event} ${round} because the recent clay log is stronger: ${pick.recentClayFallback.wins}-${pick.recentClayFallback.losses} in the tracked recent matches with a ${pickTape} tape and ${Math.round((pick.recentClayFallback.winPct2026 ?? 0.5) * 100)}% 2026 win rate, versus ${opponent.recentClayFallback.wins}-${opponent.recentClayFallback.losses}, ${oppTape}, and ${Math.round((opponent.recentClayFallback.winPct2026 ?? 0.5) * 100)}% for ${opponent.name}. ${oppositionLine}`
  }

  return `${pick.name} gets the lean in ${event} ${round} because the clay-week profile is steadier: form ${pick.form ?? 'n/a'} vs ${opponent.form ?? 'n/a'}, rank ${pick.rank} vs ${opponent.rank}, and ${angle}.`
}

const makeTennisMatch = ({
  id,
  event,
  round,
  start,
  startMinutes,
  stage,
  playerA,
  playerB,
  pickName,
  confidence,
  volatility,
  angle,
  swing,
  fatigue = '',
  tags = []
}) => {
  const enrichedPlayerA = withClayContext(playerA)
  const enrichedPlayerB = withClayContext(playerB)
  const pick = pickName === enrichedPlayerA.name ? enrichedPlayerA : enrichedPlayerB
  const opponent = pickName === enrichedPlayerA.name ? enrichedPlayerB : enrichedPlayerA
  const adjusted = adjustConfidenceFromClay(confidence, volatility, pick, opponent)
  const comparisonRows = buildComparisonRows(enrichedPlayerA, enrichedPlayerB)
  const tennistonicH2HUrl = buildTennistonicH2HUrl(enrichedPlayerA.name, enrichedPlayerB.name)
  const projection = buildProjection({
    pick,
    opponent,
    confidence: adjusted.confidence,
    volatility: adjusted.volatility
  })

  return createSportsMatchModel(
    {
      id,
      league: 'Tennis',
      start,
      startMinutes,
      title: `${playerA.name} vs ${playerB.name}`,
      stage: `${event} | ${stage || round}`,
      spotlight: adjusted.confidence >= 68,
      confidence: adjusted.confidence,
      volatility: adjusted.volatility,
      tags: ['Clay', ...tags],
      matchup: [
        {
          side: 'Player 1',
          name: enrichedPlayerA.name,
          displayName: buildPlayerLabel(enrichedPlayerA),
          detail: playerDetail(enrichedPlayerA)
        },
        {
          side: 'Player 2',
          name: enrichedPlayerB.name,
          displayName: buildPlayerLabel(enrichedPlayerB),
          detail: playerDetail(enrichedPlayerB)
        }
      ],
      summary: buildSummary({ pick, opponent, event, round, angle }),
      factors: [
        `${pick.name} carries the stronger pre-match path on ranking / market shape: rank ${pick.rank} vs ${opponent.rank}${Number.isFinite(pick.decimalOdds) ? `, price ${pick.decimalOdds.toFixed(2)}` : ''}.`,
        buildClayShape(pick),
        buildClayShape(opponent),
        buildClayDecisionNote(pick, opponent),
        'Tennistonic H2H cross-check is available when a close clay matchup needs one more matchup-page pass.',
        fatigue || 'No fresh injury flag surfaced on the accessible pre-match sources for this pass.'
      ],
      lean: `Lean ${pick.name} because ${angle}.`,
      swing,
      odds: makeTennisOdds(playerA, playerB),
      tennisContext: {
        surface: 'Clay',
        liveDog:
          Number.isFinite(pick.decimalOdds) && Number.isFinite(opponent.decimalOdds)
            ? pick.decimalOdds > opponent.decimalOdds
            : false,
        players: [
          {
            name: enrichedPlayerA.name,
            rank: enrichedPlayerA.rank,
            label: buildPlayerLabel(enrichedPlayerA),
            form: enrichedPlayerA.form ?? null,
            decimalOdds: enrichedPlayerA.decimalOdds ?? null,
            marketLabel: Number.isFinite(enrichedPlayerA.decimalOdds) ? enrichedPlayerA.decimalOdds.toFixed(2) : 'Model only',
            clayLine: buildClayLine(enrichedPlayerA),
            record2026: enrichedPlayerA.record2026 || '',
            notes: buildClayShape(enrichedPlayerA),
            matchupNote: buildClayDecisionNote(enrichedPlayerA, enrichedPlayerB)
          },
          {
            name: enrichedPlayerB.name,
            rank: enrichedPlayerB.rank,
            label: buildPlayerLabel(enrichedPlayerB),
            form: enrichedPlayerB.form ?? null,
            decimalOdds: enrichedPlayerB.decimalOdds ?? null,
            marketLabel: Number.isFinite(enrichedPlayerB.decimalOdds) ? enrichedPlayerB.decimalOdds.toFixed(2) : 'Model only',
            clayLine: buildClayLine(enrichedPlayerB),
            record2026: enrichedPlayerB.record2026 || '',
            notes: buildClayShape(enrichedPlayerB),
            matchupNote: buildClayDecisionNote(enrichedPlayerB, enrichedPlayerA)
          }
        ],
        researchLinks: [{ label: 'Tennistonic H2H', url: tennistonicH2HUrl }],
        comparisonRows,
        projection,
        formEdgeName:
          Number.isFinite(playerA.form) && Number.isFinite(playerB.form)
            ? playerA.form === playerB.form
              ? ''
              : playerA.form > playerB.form
                ? playerA.name
                : playerB.name
            : ''
      },
      playerAnalysis: [
        `${pick.name} is the cleaner pre-match side because the recent clay point-winning profile, form signal, and current board shape land better than they do for ${opponent.name}.`,
        buildClayDecisionNote(pick, opponent),
        fatigue || 'This is more about clay rhythm, serve control, and semifinal nerve than any visible injury story.',
        `Tennistonic H2H page is available as a direct matchup cross-check here: ${tennistonicH2HUrl}`,
        'No strong clean H2H edge surfaced on the accessible sources for this pass, so this read leans more heavily on surface fit and current week shape.',
        buildClayShape(pick),
        swing
      ]
    },
    oddsProvider
  )
}

const normalizeQualifierRank = (value, fallback = 220) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const buildQualifierOddsPair = (rankA, rankB) => {
  const normalizedA = normalizeQualifierRank(rankA)
  const normalizedB = normalizeQualifierRank(rankB)
  const rankGap = clamp((normalizedB - normalizedA) / 240, -0.22, 0.22)
  const playerAProb = clamp(0.5 + rankGap, 0.32, 0.68)
  const playerBProb = 1 - playerAProb
  return {
    playerADecimal: Number((1 / playerAProb).toFixed(2)),
    playerBDecimal: Number((1 / playerBProb).toFixed(2))
  }
}

const makeFrenchOpenQualifierMatch = ({
  id,
  start,
  startMinutes,
  playerA,
  playerB,
  note = '',
  tags = []
}) => {
  const rankA = normalizeQualifierRank(playerA.rank)
  const rankB = normalizeQualifierRank(playerB.rank)
  const fallbackA = buildQualifierFallback(playerA.name) ?? defaultQualifierClayFallback
  const fallbackB = buildQualifierFallback(playerB.name) ?? defaultQualifierClayFallback
  const scoreA = qualifierFallbackScore(fallbackA, rankA)
  const scoreB = qualifierFallbackScore(fallbackB, rankB)
  const pickIsPlayerA =
    Number.isFinite(scoreA) && Number.isFinite(scoreB) ? scoreA >= scoreB : rankA <= rankB
  const formA = qualifierFallbackForm(fallbackA)
  const formB = qualifierFallbackForm(fallbackB)
  const scoreGap =
    Number.isFinite(scoreA) && Number.isFinite(scoreB) ? Math.abs(scoreA - scoreB) : null
  const rankGap = Math.abs(rankA - rankB)
  const odds = buildQualifierOddsPair(rankA, rankB)
  const pickName = pickIsPlayerA ? playerA.name : playerB.name
  const opponentName = pickIsPlayerA ? playerB.name : playerA.name
  const confidence = Number.isFinite(scoreGap)
    ? clamp(Math.round(53 + Math.min(15, scoreGap * 0.85)), 53, 72)
    : clamp(Math.round(52 + Math.min(12, rankGap * 0.08)), 52, 67)
  const volatility = Number.isFinite(scoreGap)
    ? clamp(Math.round(80 - Math.min(14, scoreGap * 0.7)), 58, 82)
    : clamp(Math.round(82 - Math.min(14, rankGap * 0.09)), 64, 84)

  return makeTennisMatch({
    id,
    event: 'French Open Qualifying',
    round: 'Qualifying singles',
    stage: 'Friday qualifying board',
    start,
    startMinutes,
    playerA: {
      ...playerA,
      rank: rankA,
      form: playerA.form ?? formA ?? 50,
      decimalOdds: odds.playerADecimal,
      record2026: playerA.record2026 || 'Qualifying-board clay read',
      recentClayFallback: fallbackA
    },
    playerB: {
      ...playerB,
      rank: rankB,
      form: playerB.form ?? formB ?? 50,
      decimalOdds: odds.playerBDecimal,
      record2026: playerB.record2026 || 'Qualifying-board clay read',
      recentClayFallback: fallbackB
    },
    pickName,
    confidence,
    volatility,
    angle:
      Number.isFinite(scoreGap) && scoreGap >= 6
        ? `the recent clay log, 10-match tape, and 2026 form all still point more cleanly to ${pickName}, even if final-round qualifying always carries real swing risk`
        : Number.isFinite(scoreGap)
          ? `${pickName} still owns the slightly cleaner recent-clay and form profile in a spot where qualifying nerves can flatten a thin edge`
          : rankGap >= 30
            ? `the cleaner qualifying paper profile still points to ${pickName}, even if final-round qualifying always carries real swing risk`
            : `the ranking edge is small, but ${pickName} still owns the slightly cleaner pre-match profile in a spot where late qualifying nerves matter`,
    swing:
      note ||
      `Swing factor: whether ${opponentName} can turn this into a long clay grind and make the thin paper edge on ${pickName} disappear.`,
    fatigue:
      'Final-round qualifying keeps the legs, recovery, and pressure management in play on every close set, so these reads stay lower-conviction than the ATP/WTA semifinal board.',
    tags: ['Qualifying', 'Roland-Garros', ...tags]
  })
}

const matches = [
  makeTennisMatch({
    id: 'atp-geneva-ruud-navone-2026-05-22',
    event: 'ATP Geneva',
    round: 'Semifinal',
    stage: 'Friday semifinal board',
    start: '4:00 AM PT',
    startMinutes: 240,
    playerA: { name: 'Casper Ruud', rank: 17, form: 65, decimalOdds: 1.29, elo: 2185, record2026: 'Clay trust profile still clean' },
    playerB: { name: 'Mariano Navone', rank: 42, form: 60, decimalOdds: 4.0, record2026: 'Geneva control week still real' },
    pickName: 'Casper Ruud',
    confidence: 72,
    volatility: 50,
    angle: 'the clay-floor advantage is still real even against a Navone run that has looked sharper than the raw rank gap',
    swing: 'Swing factor: whether Navone can keep the return games long enough to deny Ruud the cleaner serve-plus-one rhythm he has been leaning on all week.',
    tags: ['Semifinal', 'Court edge']
  }),
  makeTennisMatch({
    id: 'wta-strasbourg-navarro-li-2026-05-22',
    event: 'WTA Strasbourg',
    round: 'Semifinal',
    stage: 'Friday semifinal board',
    start: '4:30 AM PT',
    startMinutes: 270,
    playerA: { name: 'Emma Navarro', rank: 39, form: 33, decimalOdds: 2.0, record2026: 'Top-seed profile, slower clay reset' },
    playerB: { name: 'Ann Li', rank: 30, form: 50, decimalOdds: 1.83, record2026: 'Live flat-hitting semifinal run' },
    pickName: 'Ann Li',
    confidence: 56,
    volatility: 66,
    angle: 'the current clay week is still holding together against stronger average opposition, and the board is no longer pricing Navarro as the obvious stabilizer',
    swing: 'Swing factor: whether Navarro can force enough long return games to flatten Li’s first-strike edge and drag the semifinal into a slower three-set pattern.',
    tags: ['Semifinal', 'Live dog']
  }),
  makeTennisMatch({
    id: 'atp-geneva-tien-bublik-2026-05-22',
    event: 'ATP Geneva',
    round: 'Semifinal',
    stage: 'Friday semifinal board',
    start: '5:30 AM PT',
    startMinutes: 330,
    playerA: { name: 'Learner Tien', rank: 20, form: 62, decimalOdds: 2.2, record2026: 'Cleaner all-court clay week' },
    playerB: { name: 'Alexander Bublik', rank: 10, form: 63, decimalOdds: 1.8, elo: 3230, record2026: 'Higher ceiling, still mood-swing live' },
    pickName: 'Learner Tien',
    confidence: 54,
    volatility: 75,
    angle: 'the clay-point profile is cleaner and the semifinal setup still punishes Bublik if the focus lane drifts even slightly',
    swing: 'Swing factor: whether Bublik brings the locked-in version long enough to stop Tien from steadily winning the neutral-ball exchanges.',
    tags: ['Semifinal', 'Dog live']
  }),
  makeTennisMatch({
    id: 'atp-hamburg-buse-kovacevic-2026-05-22',
    event: 'ATP Hamburg',
    round: 'Semifinal',
    stage: 'Friday semifinal board',
    start: '5:30 AM PT',
    startMinutes: 330,
    playerA: { name: 'Aleksandar Kovacevic', rank: 94, form: 43, decimalOdds: 4.0, record2026: 'Counterpunching surprise semifinal' },
    playerB: { name: 'Ignacio Buse', rank: 57, form: 57, decimalOdds: 1.3, record2026: 'Hamburg clay wave still loud' },
    pickName: 'Ignacio Buse',
    confidence: 71,
    volatility: 52,
    angle: 'the full Hamburg week still points his way and the market is finally respecting how real that clay rhythm has become',
    swing: 'Swing factor: whether Kovacevic can keep enough first-ball aggression alive to stop Buse from owning the longer baseline flow again.',
    tags: ['Semifinal', 'Form edge']
  }),
  makeTennisMatch({
    id: 'wta-strasbourg-mboko-cristian-2026-05-22',
    event: 'WTA Strasbourg',
    round: 'Semifinal',
    stage: 'Friday semifinal board',
    start: '6:30 AM PT',
    startMinutes: 390,
    playerA: { name: 'Victoria Mboko', rank: 9, form: 76, decimalOdds: 1.37, elo: 3395, record2026: 'Fast-rising pressure still intact' },
    playerB: { name: 'Jaqueline Cristian', rank: 33, form: 54, decimalOdds: 3.25, record2026: 'Quietly stronger clay-point week' },
    pickName: 'Victoria Mboko',
    confidence: 56,
    volatility: 72,
    angle: 'the ceiling and market respect remain huge, but Cristian is carrying the better clay-point profile and makes this much more fragile than the price suggests',
    swing: 'Swing factor: whether Cristian can keep enough return pressure live to test Mboko’s front-running confidence once the semifinal tightens.',
    tags: ['Semifinal', 'Volatile']
  }),
  makeTennisMatch({
    id: 'atp-hamburg-deminaur-paul-2026-05-22',
    event: 'ATP Hamburg',
    round: 'Semifinal',
    stage: 'Friday semifinal board',
    start: '7:30 AM PT',
    startMinutes: 450,
    playerA: { name: 'Alex de Minaur', rank: 9, form: 65, decimalOdds: 1.73, elo: 3665, record2026: 'Floor still cleaner under pressure' },
    playerB: { name: 'Tommy Paul', rank: 26, form: 69, decimalOdds: 2.2, elo: 1625, record2026: 'Clay week keeps finding escapes' },
    pickName: 'Tommy Paul',
    confidence: 53,
    volatility: 74,
    angle: 'the clay-point profile has been better than the seed gap suggests, and his week has looked more comfortable on slow points than the raw market line gives him credit for',
    swing: 'Swing factor: whether De Minaur can keep enough return pressure in play to stop Paul from taking the match into another scoreline grinder.',
    tags: ['Semifinal', 'Close board']
  }),
  makeFrenchOpenQualifierMatch({
    id: 'rg-qualifying-dellien-carballes-baena-2026-05-22',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Roberto Carballes Baena', rank: 206 },
    playerB: { name: 'Hugo Dellien', rank: 139 },
    note: 'Swing factor: whether Carballes Baena can turn this into a slower clay exchange pattern instead of letting Dellien own the heavier physical lane.'
  }),
  makeFrenchOpenQualifierMatch({
    id: 'rg-qualifying-sun-liu-2026-05-22',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Lulu Sun', rank: 111 },
    playerB: { name: 'Claire Liu', rank: 182 },
    note: 'Swing factor: whether Liu can flatten the tempo enough to stop Sun from winning the cleaner baseline exchanges.'
  }),
  makeFrenchOpenQualifierMatch({
    id: 'rg-qualifying-blanch-pavlovic-2026-05-22',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Darwin Blanch', rank: 280 },
    playerB: { name: 'Luka Pavlovic', rank: 240 },
    note: 'Swing factor: whether Blanch can inject enough first-strike pace to turn this into a volatility match instead of a steadier qualifier script.'
  }),
  makeFrenchOpenQualifierMatch({
    id: 'rg-qualifying-maristany-quevedo-2026-05-22',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Guiomar Maristany Zuleta De Reales', rank: 190 },
    playerB: { name: 'Kaitlin Quevedo', rank: 127 }
  }),
  makeFrenchOpenQualifierMatch({
    id: 'rg-qualifying-nava-martinez-2026-05-22',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Emilio Nava', rank: 97 },
    playerB: { name: 'Pedro Martinez', rank: 141 }
  }),
  makeFrenchOpenQualifierMatch({
    id: 'rg-qualifying-sasnovich-bassols-ribera-2026-05-22',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Aliaksandra Sasnovich', rank: 126 },
    playerB: { name: 'Marina Bassols Ribera', rank: 177 }
  }),
  makeFrenchOpenQualifierMatch({
    id: 'rg-qualifying-gentzsch-safiullin-2026-05-22',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Tom Gentzsch', rank: 219 },
    playerB: { name: 'Roman Safiullin', rank: 142 }
  }),
  makeFrenchOpenQualifierMatch({
    id: 'rg-qualifying-kudermetova-wang-2026-05-22',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Polina Kudermetova', rank: 125 },
    playerB: { name: 'Xiyu Wang', rank: 148 }
  }),
  makeFrenchOpenQualifierMatch({
    id: 'rg-qualifying-gojo-rodionov-2026-05-22',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Borna Gojo', rank: 172 },
    playerB: { name: 'Jurij Rodionov', rank: 158 }
  }),
  makeFrenchOpenQualifierMatch({
    id: 'rg-qualifying-zavatska-bronzetti-2026-05-22',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Katarina Zavatska', rank: 268 },
    playerB: { name: 'Lucia Bronzetti', rank: 173 }
  }),
  makeFrenchOpenQualifierMatch({
    id: 'rg-qualifying-bandecchi-hruncakova-2026-05-22',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Susan Bandecchi', rank: 215 },
    playerB: { name: 'Viktoria Hrunčáková', rank: 224 }
  }),
  makeFrenchOpenQualifierMatch({
    id: 'rg-qualifying-gaubas-llamas-ruiz-2026-05-22',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Vilius Gaubas', rank: 133 },
    playerB: { name: 'Pablo Llamas Ruiz', rank: 124 }
  }),
  makeFrenchOpenQualifierMatch({
    id: 'rg-qualifying-sramkova-carle-2026-05-22',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Rebecca Sramkova', rank: 121 },
    playerB: { name: 'Maria Lourdes Carle', rank: 209 }
  }),
  makeFrenchOpenQualifierMatch({
    id: 'rg-qualifying-tan-fruhvirtova-2026-05-22',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Harmony Tan', rank: 225 },
    playerB: { name: 'Linda Fruhvirtova', rank: 150 }
  }),
  makeFrenchOpenQualifierMatch({
    id: 'rg-qualifying-herbert-riedi-2026-05-22',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Pierre-Hugues Herbert', rank: 223 },
    playerB: { name: 'Leandro Riedi', rank: 121 }
  }),
  makeFrenchOpenQualifierMatch({
    id: 'rg-qualifying-gill-jacquet-2026-05-22',
    start: '4:00 AM PT',
    startMinutes: 240,
    playerA: { name: 'Felix Gill', rank: 237 },
    playerB: { name: 'Kyrian Jacquet', rank: 147 },
    note: 'Swing factor: the later not-before start makes recovery and patience more important if Gill can drag Jacquet into a longer qualifying scrap.'
  })
]

export const slateMeta = {
  title: 'Friday Tennis Desk',
  date: 'May 22, 2026',
  isoDate: '2026-05-22',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A focused May 22 clay semifinal board built from official ATP/WTA schedules, Oddschecker lines, TennisStats form context, official ATP/WTA stat pages, and Tennis Abstract player research.',
  notes: [
    'Every match on this board is on clay, and the field is down to semifinals, so the model is leaning more on surface-specific point winning and tournament rhythm than on broad ranking alone.',
    'The Friday board now mixes the ATP/WTA semifinals with the official Roland-Garros qualifying singles matches that are on the May 22 order of play.',
    'May 21 was a useful reminder that ATP clay-point reads held much better than the WTA Strasbourg quarterfinals, so this semifinal board intentionally compresses WTA confidence and leans harder on current-week rhythm than on stable-name value.',
    'No explicit injury note surfaced from the accessible pre-match sources this morning, so volatility is being driven more by semifinal pressure, qualifying-day load, and market-vs-surface mismatch than by medical news.',
    'The Roland-Garros qualifying section is lower-confidence than the semifinal board because the official order of play was cleaner than the accessible market pages on this pass, so those matches are leaning more heavily on ranking and clay-week shape than on a fully priced market.'
  ]
}

export const filters = ['All', 'Tennis']

export const oddsMeta = {
  provider: 'Official ATP/WTA schedules + Oddschecker + TennisStats + ATP/WTA stats',
  snapshot: 'May 22, 2026 pre-open semifinal clay desk',
  note:
    'Tennis uses official semifinal schedules plus Oddschecker, TennisStats, ATP/WTA stats pages, and player research sources for ranking, form, surface fit, H2H, and accessible moneylines.'
}

export const sources = [
  {
    label: 'Oddschecker tennis lines',
    url: 'https://www.oddschecker.com/us/tennis'
  },
  {
    label: 'TennisStats match board',
    url: 'https://tennisstats.com/'
  },
  {
    label: 'Tennis Abstract player research example',
    url: 'https://www.tennisabstract.com/cgi-bin/player.cgi?p=126205/Tommy-Paul'
  },
  {
    label: 'ATP official stats',
    url: 'https://www.atptour.com/stats/'
  },
  {
    label: 'ATP official H2H',
    url: 'https://www.atptour.com/en/h2h'
  },
  {
    label: 'WTA official player stats example',
    url: 'https://www.wtatennis.com/players/331006/victoria-mboko/stats'
  },
  {
    label: 'WTA By The Numbers',
    url: 'https://wtafiles.wtatennis.com/pdf/matchnotes/2026/2026WTA_ByTheNumbers.pdf'
  },
  {
    label: 'Ultimate Tennis Statistics',
    url: 'https://www.ultimatetennisstatistics.com/'
  },
  {
    label: 'Tennis Explorer',
    url: 'https://www.tennisexplorer.com/'
  },
  {
    label: 'Tennistonic H2H compare',
    url: 'https://tennistonic.com/head-to-head-compare/Hugo-Dellien-Vs-Roberto-Carballes-Baena/'
  },
  {
    label: 'ATP Hamburg schedule',
    url: 'https://www.bbc.co.uk/sport/tennis/hamburg-european-open/mens-singles/scores-and-schedule/2026-05-22'
  },
  {
    label: 'ATP Geneva schedule',
    url: 'https://www.bbc.co.uk/sport/tennis/atp-geneva-open/mens-singles/scores-and-schedule/2026-05-22'
  },
  {
    label: 'WTA Strasbourg schedule',
    url: 'https://www.bbc.co.uk/sport/tennis/wta-internationaux-de-strasbourg/womens-singles/scores-and-schedule/2026-05-22'
  },
  {
    label: 'Roland-Garros order of play',
    url: 'https://www.rolandgarros.com/en-us/order-of-play?annexeCourt=all&competition=all&country=all&date=2026-05-22&favoriteFilter=false&principalCourt=all&year=2026'
  }
]

export const games = [...matches].sort(
  (left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title)
)

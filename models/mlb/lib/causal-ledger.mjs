const LEDGER_VERSION = 'mlb-causal-ledger-v0.1'

const array = (value) => (Array.isArray(value) ? value : [])

const num = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const round = (value, digits = 1) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const factor = 10 ** digits
  return Math.round(parsed * factor) / factor
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const normalizeName = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const personNameKeys = (value = '') => {
  const normalized = normalizeName(value)
  const parts = normalized.split(' ').filter(Boolean)
  if (!parts.length) return []
  const first = parts[0]
  const last = parts.at(-1)
  return [
    normalized,
    first && last ? `${first.slice(0, 1)} ${last}` : '',
    last || ''
  ].filter(Boolean)
}

const personNamesMatch = (left = '', right = '') => {
  const leftKeys = new Set(personNameKeys(left))
  return personNameKeys(right).some((key) => leftKeys.has(key))
}

const sideTeamName = (game = {}, side = 'away') => {
  if (side === 'away') {
    return game.matchup?.[0]?.name || game.lineupBoard?.away?.teamName || game.away || game.awayTeam || 'Away'
  }
  return game.matchup?.[1]?.name || game.lineupBoard?.home?.teamName || game.home || game.homeTeam || 'Home'
}

const sideLabel = (side = 'away') => (side === 'away' ? 'away' : 'home')
const opponentSide = (side = 'away') => (side === 'away' ? 'home' : 'away')

const average = (values = []) => {
  const valid = values.map(Number).filter(Number.isFinite)
  if (!valid.length) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

const countWhere = (items = [], predicate) => items.filter(predicate).length

const splitSourceStatus = (player = {}) =>
  player.espnHitterSplit?.sourceStatus ||
  player.espnHitterSplits?.sourceStatus ||
  player.matchupKernel?.components?.espnHitterHandednessSplit?.sourceStatus ||
  ''

const findMarketValue = (game = {}, pattern) =>
  array(game.odds?.markets).find((market) => pattern.test(String(market?.label || '')))?.value || ''

const parseAmericanOdds = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace(/[−–—]/g, '-').replace(/[^+\-0-9]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

const impliedProbability = (americanOdds) => {
  const odds = Number(americanOdds)
  if (!Number.isFinite(odds) || odds === 0) return null
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100)
}

const parseMoneylinePair = (value = '') => {
  const matches = String(value).match(/[+\-−–—]?\d{2,4}/g) || []
  return matches.slice(0, 2).map(parseAmericanOdds)
}

const bvpRowsForSide = (game = {}, side = 'away', lineup = []) => {
  const ficSide = side === 'away'
    ? game.ficDailyMatchupContext?.awayOffense
    : game.ficDailyMatchupContext?.homeOffense
  const lineupNames = array(lineup).map((player) => player?.name).filter(Boolean)
  const sideFicRows = array(ficSide?.topRows)
  const gameFicRows = array(game.ficDailyMatchupContext?.topRows).filter((row) =>
    lineupNames.some((name) => personNamesMatch(name, row.playerName))
  )
  const ficRows = (sideFicRows.length ? sideFicRows : gameFicRows).map((row) => ({
    source: 'FantasyInfoCentral Daily Matchups',
    playerName: row.playerName,
    pitcherName: row.pitcherName || ficSide?.pitcherName || null,
    atBats: num(row.bvpAtBats ?? row.atBats, null),
    avg: num(row.bvpAvg ?? row.avg, null),
    ops: num(row.bvpOps ?? row.ops, null),
    hrForce: num(row.hrForce, null),
    matchupPass: Boolean(row.matchupPass),
    scoringEligible: false,
    scoreImpact: 0,
    recencyStatus: 'undated-or-unverified'
  }))

  const history = game.lineupBoard?.[side]?.bvpHistory || null
  const historyRows = [
    ...array(history?.hot).map((row) => ({ ...row, tone: row.tone || 'hot' })),
    ...array(history?.cold).map((row) => ({ ...row, tone: row.tone || 'cold' }))
  ].map((row) => ({
    source: 'RotoWire BvP',
    playerName: row.name,
    pitcherName: history?.pitcherName || null,
    atBats: num(row.atBats, null),
    avg: num(row.avg, null),
    ops: num(row.ops, null),
    homeRuns: num(row.homeRuns, null),
    tone: row.tone || null,
    scoringEligible: Boolean(row.scoringEligible),
    scoreImpact: num(row.scoreImpact, 0),
    recencyStatus: row.recencyStatus || 'undated-aggregate',
    summary: row.summary || ''
  }))

  const deduped = []
  const seen = new Set()
  for (const row of [...ficRows, ...historyRows]) {
    const key = `${normalizeName(row.playerName)}:${row.source}:${row.tone || ''}`
    if (!row.playerName || seen.has(key)) continue
    seen.add(key)
    deduped.push(row)
  }
  return deduped
}

const rowByPlayerName = (rows = []) => {
  const map = new Map()
  for (const row of rows) {
    for (const key of personNameKeys(row.playerName)) {
      if (!key || map.has(key)) continue
      map.set(key, row)
    }
  }
  return map
}

const bvpForPlayer = (player = {}, bvpByName = new Map()) => {
  for (const key of personNameKeys(player.name)) {
    const row = bvpByName.get(key)
    if (row) return row
  }
  return null
}

const buildPlayerFactor = (player = {}, bvpByName = new Map()) => {
  const metrics = player.metrics || {}
  const kernel = player.matchupKernel || null
  const components = kernel?.components || {}
  const currentForm = components.currentForm || {}
  const batterSplit = components.batterHandednessSplit || {}
  const espnSplit = player.espnHitterSplit || components.espnHitterHandednessSplit || null
  const pitcherAllowedSplit = components.pitcherAllowedSplit || null
  const pitchType = player.pitchType || components.pitchType || null
  const bvp = bvpForPlayer(player, bvpByName)
  const seasonOps = num(player.season?.ops ?? currentForm.seasonOps, null)
  const recentOps = num(player.recent?.ops ?? currentForm.recentOps, null)
  const splitOps = num(player.split?.ops ?? batterSplit.splitOps, null)
  const espnSplitOps = num(espnSplit?.ops, null)
  const effectiveSplitOps = Number.isFinite(espnSplitOps) ? espnSplitOps : splitOps
  const splitOpsDelta =
    Number.isFinite(effectiveSplitOps) && Number.isFinite(seasonOps)
      ? round(effectiveSplitOps - seasonOps, 3)
      : num(metrics.espnSplitOpsDelta ?? batterSplit.splitOpsDelta, null)
  const starterKernelScore = num(metrics.starterMatchupKernelScore ?? kernel?.score, null)
  const pitchTypeGrade = num(metrics.pitchTypeGrade ?? pitchType?.fitGrade, null)
  const matchupScore = num(metrics.matchupScore, null)

  return {
    playerId: player.playerId || player.internalPlayerId || null,
    slot: num(player.slot, null),
    name: player.name || '',
    position: player.position || '',
    bats: player.bats || '',
    primaryTag: player.primaryTag || '',
    tags: array(player.tags).slice(0, 8),
    matchupScore: round(matchupScore, 1),
    matchupGrade: round(metrics.matchupGrade, 2),
    starterKernelScore: round(starterKernelScore, 1),
    starterKernelConfidence: round(metrics.starterMatchupKernelConfidence ?? kernel?.confidence, 1),
    starterKernelLabel: kernel?.label || '',
    seasonOps: round(seasonOps, 3),
    recentOps: round(recentOps, 3),
    splitOps: round(splitOps, 3),
    selectedSplitOps: round(effectiveSplitOps, 3),
    selectedSplitSource: Number.isFinite(espnSplitOps) ? 'ESPN handedness split' : Number.isFinite(splitOps) ? 'lineup handedness split' : '',
    splitOpsDelta,
    espnSplit: espnSplit
      ? {
          source: espnSplit.source || 'ESPN player splits',
          sourceStatus: espnSplit.sourceStatus || splitSourceStatus(player),
          sourceUrl: espnSplit.sourceUrl || '',
          pitcherHand: espnSplit.pitcherHand || kernel?.opposingStarterHand || '',
          label: espnSplit.label || '',
          atBats: num(espnSplit.atBats, null),
          plateAppearances: num(espnSplit.plateAppearances, null),
          avg: round(espnSplit.avg, 3),
          obp: round(espnSplit.obp, 3),
          slg: round(espnSplit.slg, 3),
          ops: round(espnSplit.ops, 3),
          opsDeltaVsSeason: round(espnSplit.opsDeltaVsSeason ?? splitOpsDelta, 3),
          scoreWeight: round(espnSplit.scoreWeight, 2),
          capActive: Boolean(espnSplit.capActive)
        }
      : null,
    pitcherAllowedSplit: pitcherAllowedSplit
      ? {
          source: pitcherAllowedSplit.source || 'ESPN pitcher splits',
          sourceStatus: pitcherAllowedSplit.sourceStatus || '',
          side: pitcherAllowedSplit.side || '',
          atBats: num(pitcherAllowedSplit.atBats, null),
          avg: round(pitcherAllowedSplit.avg, 3),
          obp: round(pitcherAllowedSplit.obp, 3),
          slg: round(pitcherAllowedSplit.slg, 3),
          ops: round(pitcherAllowedSplit.ops, 3),
          opsDeltaVsBaseline: round(pitcherAllowedSplit.opsDeltaVsBaseline, 3)
        }
      : null,
    pitchFit: pitchType
      ? {
          fitGrade: round(pitchTypeGrade, 2),
          leagueGrade: round(metrics.pitchTypeLeagueGrade ?? pitchType.leagueGrade, 2),
          fitScore: round(metrics.pitchTypeFitScore ?? pitchType.fitScore, 1),
          coveragePct: round(metrics.pitchTypeCoveragePct ?? pitchType.coveragePct, 1),
          summary: pitchType.summary || ''
        }
      : null,
    bvpH2h: bvp
      ? {
          source: bvp.source,
          playerName: bvp.playerName,
          pitcherName: bvp.pitcherName || '',
          atBats: bvp.atBats,
          avg: round(bvp.avg, 3),
          ops: round(bvp.ops, 3),
          homeRuns: bvp.homeRuns ?? null,
          hrForce: round(bvp.hrForce, 2),
          tone: bvp.tone || '',
          scoringEligible: Boolean(bvp.scoringEligible),
          scoreImpact: num(bvp.scoreImpact, 0),
          recencyStatus: bvp.recencyStatus || '',
          summary: bvp.summary || ''
        }
      : null,
    caps: {
      currentFormCapActive: Boolean(currentForm.capActive),
      platoonCapActive: Boolean(batterSplit.capActive),
      espnPlatoonCapActive: Boolean(components.espnHitterHandednessSplit?.capActive)
    },
    reasons: array(kernel?.reasons).slice(0, 5),
    summary: player.summary || player.matchupNote || ''
  }
}

const buildLineupDelta = ({ sideContext = {}, lineup = [] }) => {
  const aggregate = sideContext.aggregate || {}
  const matchupScores = lineup.map((player) => num(player.metrics?.matchupScore, null)).filter(Number.isFinite)
  const matchupGrades = lineup.map((player) => num(player.metrics?.matchupGrade, null)).filter(Number.isFinite)
  const kernelScores = lineup
    .map((player) => num(player.metrics?.starterMatchupKernelScore ?? player.matchupKernel?.score, null))
    .filter(Number.isFinite)
  const averageMatchupScore = average(matchupScores)
  const averageMatchupGrade = num(aggregate.averageMatchupGrade, average(matchupGrades))
  return {
    averageMatchupScore: round(averageMatchupScore, 1),
    averageMatchupGrade: round(averageMatchupGrade, 2),
    delta: round((averageMatchupScore ?? 50) - 50, 1),
    trackedBatters: num(aggregate.trackedBatters, lineup.length),
    starterThreatCount: num(aggregate.starterThreatCount, countWhere(lineup, (player) => num(player.metrics?.matchupGrade, 0) >= 2)),
    suppressorCount: num(aggregate.suppressorCount, countWhere(lineup, (player) => array(player.tags).includes('cold'))),
    topThirdScore: round(aggregate.topThirdScore, 1),
    middleScore: round(sideContext.summary?.middleScore, 1),
    depthScore: round(aggregate.depthScore, 1),
    starterKernelScore: round(aggregate.starterMatchupKernelScore ?? average(kernelScores), 1),
    starterKernelIndex: round(aggregate.starterMatchupKernelIndex, 1)
  }
}

const buildHandednessDelta = ({ sideContext = {}, lineup = [] }) => {
  const aggregate = sideContext.aggregate || {}
  const splitScores = lineup.map((player) => num(player.metrics?.splitScore, null)).filter(Number.isFinite)
  const espnDeltas = lineup.map((player) => num(player.metrics?.espnSplitOpsDelta, null)).filter(Number.isFinite)
  const averageSplitScore = average(splitScores)
  const averageEspnOpsDelta = average(espnDeltas)
  return {
    delta: round((averageSplitScore ?? 50) - 50, 1),
    averageSplitScore: round(averageSplitScore, 1),
    averageEspnOpsDelta: round(averageEspnOpsDelta, 3),
    platoonPressureIndex: round(aggregate.platoonPressureIndex, 1),
    platoonCount: num(aggregate.platoonCount, countWhere(lineup, (player) => array(player.tags).includes('split edge'))),
    espnSplitEdgeCount: num(aggregate.espnSplitEdgeCount, countWhere(lineup, (player) => array(player.tags).includes('espn split edge'))),
    espnSplitRiskCount: num(aggregate.espnSplitRiskCount, countWhere(lineup, (player) => array(player.tags).includes('espn split risk'))),
    weakSplitRiskCount: countWhere(lineup, (player) => Boolean(player.metrics?.handednessSplitRisk)),
    sourceStatuses: [...new Set(lineup.map(splitSourceStatus).filter(Boolean))]
  }
}

const buildPitchFitDelta = ({ sideContext = {}, lineup = [] }) => {
  const aggregate = sideContext.aggregate || {}
  const grades = lineup.map((player) => num(player.metrics?.pitchTypeGrade, null)).filter(Number.isFinite)
  const averageGrade = average(grades)
  return {
    delta: round((num(aggregate.pitchTypePressureIndex, null) ?? (50 + (averageGrade ?? 0) * 6)) - 50, 1),
    pitchTypePressureIndex: round(aggregate.pitchTypePressureIndex, 1),
    averagePitchTypeGrade: round(averageGrade, 2),
    pitchTypeLeagueGrade: round(aggregate.pitchTypeLeagueGrade, 2),
    pitchTypeEdgeCount: num(aggregate.pitchTypeEdgeCount, countWhere(lineup, (player) => array(player.tags).includes('arsenal edge'))),
    topThirdArsenalCount: num(aggregate.topThirdArsenalCount, null),
    coveragePct: round(average(lineup.map((player) => num(player.metrics?.pitchTypeCoveragePct, null))), 1)
  }
}

const buildBvpDelta = ({ game = {}, side = 'away', rows = [] }) => {
  const history = game.lineupBoard?.[side]?.bvpHistory || null
  const sampleRows = rows.filter((row) => num(row.atBats, 0) >= 5)
  const hotRows = sampleRows.filter((row) => row.tone === 'hot' || num(row.ops, 0) >= 0.8 || num(row.avg, 0) >= 0.3)
  const coldRows = sampleRows.filter((row) => row.tone === 'cold' || (Number.isFinite(num(row.ops, null)) && num(row.ops, 1) <= 0.55))
  const contextDelta = clamp((hotRows.length - coldRows.length) * 1.2, -4, 4)
  const scoringRows = sampleRows.filter((row) => row.scoringEligible)
  return {
    contextDelta: round(contextDelta, 1),
    scoreImpact: round(average(scoringRows.map((row) => num(row.scoreImpact, 0))) ?? 0, 2),
    scoringEligibleRows: scoringRows.length,
    sampleRows: sampleRows.length,
    hotRows: hotRows.length,
    coldRows: coldRows.length,
    summary: history?.summary || (sampleRows.length ? 'BvP/H2H rows are present as context.' : 'No BvP/H2H sample attached to this lineup.'),
    policy: history?.scoringPolicy || {
      usableForScoring: false,
      scoreImpact: 0,
      minAtBats: 5,
      maxAgeSeasons: 3,
      reason: 'BvP/H2H requires a dated recent sample before direct scoring.'
    },
    topRows: sampleRows
      .sort((left, right) => num(right.ops, -1) - num(left.ops, -1) || num(right.atBats, 0) - num(left.atBats, 0))
      .slice(0, 4)
      .map((row) => ({
        source: row.source,
        playerName: row.playerName,
        atBats: row.atBats,
        avg: round(row.avg, 3),
        ops: round(row.ops, 3),
        hrForce: round(row.hrForce, 2),
        tone: row.tone || '',
        scoringEligible: Boolean(row.scoringEligible),
        scoreImpact: num(row.scoreImpact, 0),
        recencyStatus: row.recencyStatus || ''
      }))
  }
}

const buildHrForceDelta = ({ game = {}, side = 'away' }) => {
  const sideFic = side === 'away'
    ? game.ficDailyMatchupContext?.awayOffense
    : game.ficDailyMatchupContext?.homeOffense
  const gameFic = game.ficDailyMatchupContext || {}
  const averageHrForce = num(sideFic?.averageHrForce, num(gameFic.averageHrForce, null))
  const maxHrForce = num(sideFic?.maxHrForce, num(gameFic.maxHrForce, null))
  const highHrForceRows = num(sideFic?.highHrForceRows, 0)
  const extremeHrForceRows = num(sideFic?.extremeHrForceRows, 0)
  const carryDelta =
    Number.isFinite(averageHrForce)
      ? clamp((averageHrForce - 1.2) * 8 + extremeHrForceRows * 1.2 + highHrForceRows * 0.35, -4, 10)
      : 0
  return {
    delta: round(carryDelta, 1),
    averageHrForce: round(averageHrForce, 2),
    maxHrForce: round(maxHrForce, 2),
    highHrForceRows,
    extremeHrForceRows,
    totalYrfiSignal: maxHrForce >= 1.7 ? 'extreme carry' : maxHrForce >= 1.4 ? 'carry' : maxHrForce ? 'neutral-low' : 'missing',
    note:
      maxHrForce >= 1.7
        ? 'HRForce is extreme; this should raise total/YRFI and pitcher-collapse sensitivity.'
        : maxHrForce >= 1.4
          ? 'HRForce is supportive for carry, totals, and first-inning run pressure.'
          : 'HRForce is not a positive over/HR signal here.'
  }
}

const buildEnvDelta = (game = {}) => {
  const env = game.environmentAdjustmentContext || null
  if (!env) {
    return {
      delta: 0,
      sourceStatus: 'missing'
    }
  }
  const expected = env.expected || {}
  const weather = env.weather || {}
  const visibility = env.visibility || {}
  return {
    delta: round(num(expected.totalRunsDelta, 0), 2),
    source: 'MLB-ENV1',
    sourceStatus: 'present',
    signal: env.signal || '',
    expectedTotalRunsDelta: round(expected.totalRunsDelta, 2),
    expectedHitsDelta: round(expected.hitsDelta, 2),
    expectedHrDelta: round(expected.hrDelta, 2),
    expectedStrikeoutsDelta: round(expected.strikeoutsDelta, 2),
    expectedWalksDelta: round(expected.walksDelta, 2),
    parkRunDelta: round(env.park?.runDelta, 2),
    parkHrDelta: round(env.park?.hrDelta, 2),
    weatherHrForce: round(weather.hrForce ?? weather.effectiveHrForce, 2),
    weatherSignal: weather.signal || '',
    umpireRunsDelta: round(env.umpire?.runsDelta, 2),
    umpireAssignmentStatus: env.umpire?.assignmentStatus || '',
    visibility: {
      lateLocalStart: Boolean(visibility.lateLocalStart),
      hitsMultiplier: round(visibility.hitsMultiplier, 2),
      hrMultiplier: round(visibility.hrMultiplier, 2),
      runsMultiplier: round(visibility.runsMultiplier, 2)
    }
  }
}

const buildRp2Delta = ({ game = {}, side = 'away' }) => {
  const own = game.reliefProjectionContext?.[side] || null
  const opponent = game.reliefProjectionContext?.[opponentSide(side)] || null
  const ownRuns = num(own?.projectedReliefRunsAllowed, null)
  const opponentRuns = num(opponent?.projectedReliefRunsAllowed, null)
  const ownStress = num(own?.bridgeStressScore, null)
  const opponentStress = num(opponent?.bridgeStressScore, null)
  const sideHoldDelta =
    Number.isFinite(ownRuns) && Number.isFinite(opponentRuns)
      ? clamp((opponentRuns - ownRuns) * 4, -8, 8)
      : 0
  const lateScoringDelta =
    Number.isFinite(opponentRuns)
      ? clamp((opponentRuns - 1.55) * 3 + Math.max((opponentStress ?? 50) - 55, 0) * 0.08, -5, 8)
      : 0

  return {
    sideHoldDelta: round(sideHoldDelta, 1),
    offenseLateScoringDelta: round(lateScoringDelta, 1),
    ownBullpen: own
      ? {
          projectedReliefRunsAllowed: round(ownRuns, 2),
          projectedReliefOuts: round(own.projectedReliefOuts, 1),
          projectedRelieversUsed: round(own.projectedRelieversUsed, 1),
          bridgeStressScore: round(ownStress, 1),
          leverageAvailabilityScore: round(own.leverageAvailabilityScore, 1),
          fatigueScore: round(own.fatigueScore, 1),
          qualityScore: round(own.qualityScore, 1),
          runRiskTier: own.runRiskTier || '',
          lead: own.lead || null
        }
      : null,
    opposingBullpen: opponent
      ? {
          projectedReliefRunsAllowed: round(opponentRuns, 2),
          projectedReliefOuts: round(opponent.projectedReliefOuts, 1),
          projectedRelieversUsed: round(opponent.projectedRelieversUsed, 1),
          bridgeStressScore: round(opponentStress, 1),
          leverageAvailabilityScore: round(opponent.leverageAvailabilityScore, 1),
          fatigueScore: round(opponent.fatigueScore, 1),
          qualityScore: round(opponent.qualityScore, 1),
          runRiskTier: opponent.runRiskTier || '',
          lead: opponent.lead || null
        }
      : null,
    source: own || opponent ? 'MLB-RP2' : '',
    note: 'RP2 is team-side bullpen projection. Side-hold and late-scoring deltas are directional receipts, not exact first-reliever identity.'
  }
}

const buildOpenerPrimaryDelta = ({ game = {}, side = 'away' }) => {
  const boardSide = game.lineupBoard?.[side] || {}
  const pitcherSource = game.lineupBoard?.pitcherSourceContext?.[side] || null
  const starter = game.starterContext?.[side] || null
  const opener = boardSide.openerContext || pitcherSource?.opener || starter?.openerContext || null
  const roleContext = boardSide.starterRoleContext || pitcherSource?.starterRoleContext || starter?.starterRoleContext || null
  const roleText = [
    roleContext?.role,
    roleContext?.roleLabel,
    pitcherSource?.role,
    pitcherSource?.starter?.roleLabel,
    opener?.role,
    opener?.roleLabel
  ].filter(Boolean).join(' ')
  const openerLike = Boolean(opener) || /opener|bulk|primary/i.test(roleText)

  return {
    delta: openerLike ? -1.5 : 0,
    hasOpenerContext: Boolean(opener),
    starterRole: roleContext?.role || pitcherSource?.role || 'starter',
    roleLabel: roleContext?.roleLabel || pitcherSource?.starter?.roleLabel || '',
    primaryPitcherName: starter?.fullName || boardSide.opposingStarter?.name || '',
    openerName: opener?.name || opener?.pitcherName || pitcherSource?.opener?.name || '',
    source: roleContext?.source || pitcherSource?.source || '',
    note:
      openerLike
        ? 'Opener/primary context present; starter-dependent markets should read the primary/bulk role separately from official first pitcher.'
        : 'No opener/primary adjustment surfaced.'
  }
}

const buildMarketDelta = (game = {}) => {
  const moneylineValue = findMarketValue(game, /^Moneyline$/i)
  const moneylineOdds = parseMoneylinePair(moneylineValue)
  const awayImp = impliedProbability(moneylineOdds[0])
  const homeImp = impliedProbability(moneylineOdds[1])
  const totalValue = findMarketValue(game, /^Total$/i)
  const first5MoneylineValue = findMarketValue(game, /(?:1st|first)\s*5\s*ML/i)
  const first5TotalValue = findMarketValue(game, /(?:1st|first)\s*5\s*Total/i)
  return {
    source: game.odds?.provider || '',
    moneyline: {
      raw: moneylineValue,
      awayOdds: moneylineOdds[0] ?? null,
      homeOdds: moneylineOdds[1] ?? null,
      awayImpliedPct: round(Number.isFinite(awayImp) ? awayImp * 100 : null, 1),
      homeImpliedPct: round(Number.isFinite(homeImp) ? homeImp * 100 : null, 1)
    },
    first5Moneyline: {
      raw: first5MoneylineValue
    },
    total: {
      raw: totalValue,
      postedLine: num(String(totalValue).match(/\d+(?:\.\d+)?/)?.[0], null)
    },
    first5Total: {
      raw: first5TotalValue,
      postedLine: num(String(first5TotalValue).match(/\d+(?:\.\d+)?/)?.[0], null)
    }
  }
}

const buildProjectionDeltas = (game = {}) => {
  const projection = game.analysis?.mlbProjection || {}
  const firstInning = projection.firstInning || {}
  const totals = projection.totals || {}
  const sideProjection = {
    awayProjectedRuns: round(projection.awayProjectedRuns, 1),
    homeProjectedRuns: round(projection.homeProjectedRuns, 1),
    runDiffAwayMinusHome: Number.isFinite(num(projection.awayProjectedRuns, null)) && Number.isFinite(num(projection.homeProjectedRuns, null))
      ? round(num(projection.awayProjectedRuns, 0) - num(projection.homeProjectedRuns, 0), 1)
      : null,
    awayFirst5ProjectedRuns: round(projection.awayFirst5ProjectedRuns, 1),
    homeFirst5ProjectedRuns: round(projection.homeFirst5ProjectedRuns, 1),
    first5RunDiffAwayMinusHome:
      Number.isFinite(num(projection.awayFirst5ProjectedRuns, null)) &&
      Number.isFinite(num(projection.homeFirst5ProjectedRuns, null))
        ? round(num(projection.awayFirst5ProjectedRuns, 0) - num(projection.homeFirst5ProjectedRuns, 0), 1)
        : null,
    edgeTeam: projection.edgeTeam || '',
    edgeHits: round(projection.edgeHits, 1),
    modelEdge: round(game.analysis?.modelEdge, 1),
    moneylineShape: game.analysis?.moneylineShape || projection.moneylineShape || null,
    first5Moneyline: projection.first5Moneyline || null
  }
  return {
    moneyline: sideProjection,
    firstFive: {
      awayProjectedRuns: sideProjection.awayFirst5ProjectedRuns,
      homeProjectedRuns: sideProjection.homeFirst5ProjectedRuns,
      runDiffAwayMinusHome: sideProjection.first5RunDiffAwayMinusHome,
      projectedTotalRuns: round(totals.projectedFirst5TotalRuns ?? totals.tailAdjustedProjectedFirst5TotalRuns, 1),
      marketLine: round(totals.derivedFirst5TotalLine ?? totals.first5TotalLine ?? totals.first5?.line, 1),
      lean: totals.first5?.lean || ''
    },
    totals: {
      projectedFullTotalRuns: round(totals.projectedFullTotalRuns ?? projection.projectedFullTotalRuns, 1),
      marketLine: round(totals.derivedFullTotalLine ?? totals.fullGameTotalLine ?? totals.fullGame?.line, 1),
      fullGameLean: totals.fullGame?.lean || '',
      fullGameEdge: round(totals.fullGame?.edge, 1),
      first5Lean: totals.first5?.lean || '',
      first5Edge: round(totals.first5?.edge, 1)
    },
    yrfi: {
      pick: firstInning.pick || '',
      yesProbabilityPct: round(firstInning.yesProbabilityPct, 1),
      noProbabilityPct: round(firstInning.noProbabilityPct, 1),
      edge: round(firstInning.edge, 1),
      strength: firstInning.strength || '',
      awayRunProbabilityPct: round(firstInning.awayRunProbabilityPct, 1),
      homeRunProbabilityPct: round(firstInning.homeRunProbabilityPct, 1),
      projectedRuns: round(firstInning.projectedRuns, 2),
      weatherAdjustment: firstInning.weatherAdjustment || null
    }
  }
}

const buildTeamLedger = ({ game = {}, side = 'away', envDelta = null }) => {
  const lineup = array(game.lineupBoard?.[side]?.lineup)
  const teamName = sideTeamName(game, side)
  const sideContext =
    game.lineupContext?.[teamName] ||
    game.lineupContext?.[game.lineupBoard?.[side]?.teamName] ||
    {}
  const bvpRows = bvpRowsForSide(game, side, lineup)
  const bvpByName = rowByPlayerName(bvpRows)
  const playerFactors = lineup.map((player) => buildPlayerFactor(player, bvpByName))
  const lineupDelta = buildLineupDelta({ sideContext, lineup })
  const handednessDelta = buildHandednessDelta({ sideContext, lineup })
  const pitchFitDelta = buildPitchFitDelta({ sideContext, lineup })
  const bvpDelta = buildBvpDelta({ game, side, rows: bvpRows })
  const hrForceDelta = buildHrForceDelta({ game, side })
  const rp2Delta = buildRp2Delta({ game, side })
  const openerPrimaryDelta = buildOpenerPrimaryDelta({ game, side })

  return {
    side,
    teamName,
    deltas: {
      lineup: lineupDelta,
      handednessSplits: handednessDelta,
      pitchFit: pitchFitDelta,
      bvpH2h: bvpDelta,
      hrForce: hrForceDelta,
      env1: envDelta,
      rp2: rp2Delta,
      openerPrimary: openerPrimaryDelta
    },
    topPositiveFactors: playerFactors
      .filter((player) => Number.isFinite(num(player.matchupScore, null)))
      .sort((left, right) => num(right.matchupScore, 0) - num(left.matchupScore, 0))
      .slice(0, 4),
    topRiskFactors: playerFactors
      .filter((player) => Number.isFinite(num(player.matchupScore, null)))
      .sort((left, right) => num(left.matchupScore, 0) - num(right.matchupScore, 0))
      .slice(0, 4),
    playerFactors,
    coverage: {
      lineupPlayers: lineup.length,
      playerFactors: playerFactors.length,
      playersWithSelectedSplits: countWhere(playerFactors, (player) => Number.isFinite(num(player.selectedSplitOps, null))),
      playersWithEspnSplits: countWhere(playerFactors, (player) => Boolean(player.espnSplit)),
      playersWithPitchFit: countWhere(playerFactors, (player) => Boolean(player.pitchFit)),
      playersWithBvpH2h: countWhere(playerFactors, (player) => Boolean(player.bvpH2h)),
      playersWithStarterKernel: countWhere(playerFactors, (player) => Number.isFinite(num(player.starterKernelScore, null)))
    }
  }
}

export const buildMlbCausalLedgerContext = (game = {}) => {
  if (!game || game.league !== 'MLB') return null
  const envDelta = buildEnvDelta(game)
  const market = buildMarketDelta(game)
  const projections = buildProjectionDeltas(game)
  const away = buildTeamLedger({ game, side: 'away', envDelta })
  const home = buildTeamLedger({ game, side: 'home', envDelta })
  const sourcesUsed = [
    game.lineupBoard ? 'lineupBoard' : null,
    game.lineupContext ? 'lineupContext' : null,
    game.ficDailyMatchupContext ? 'FantasyInfoCentral Daily Matchups' : null,
    game.environmentAdjustmentContext ? 'MLB-ENV1' : null,
    game.reliefProjectionContext?.away || game.reliefProjectionContext?.home ? 'MLB-RP2' : null,
    game.odds ? 'market board' : null,
    game.analysis?.mlbProjection ? 'MLB-M2 projection' : null
  ].filter(Boolean)

  return {
    version: LEDGER_VERSION,
    generatedAt: new Date().toISOString(),
    gameId: game.id || null,
    gamePk: num(game.gamePk, null),
    title: game.title || `${away.teamName} @ ${home.teamName}`,
    slateDate: game.slateDate || game.metadata?.slateDate || null,
    sourcesUsed,
    scoringPolicy: {
      splits: 'Handedness split OPS/AVG sharpens the existing batter-starter kernel; it does not replace recent form, season baseline, pitch fit, or BvP context.',
      bvpH2h: 'BvP/H2H remains a separate lane. Undated aggregate rows are context-only with scoreImpact 0 until dated recent samples are available.',
      hrForce: 'HRForce feeds carry, total/YRFI, and pitcher-collapse pressure; high HRForce is not a reliable under-support signal.',
      rp2: 'RP2 is a team-side bullpen path projection. Use for late scoring risk, bridge stress, and bullpen-path warnings, not exact first reliever identity.'
    },
    gameDeltas: {
      env1: envDelta,
      market,
      projections
    },
    teamDeltas: {
      away: away.deltas,
      home: home.deltas
    },
    playerFactors: {
      away: away.playerFactors,
      home: home.playerFactors
    },
    topFactors: {
      awayPositive: away.topPositiveFactors,
      awayRisks: away.topRiskFactors,
      homePositive: home.topPositiveFactors,
      homeRisks: home.topRiskFactors
    },
    coverage: {
      away: away.coverage,
      home: home.coverage,
      hasLineupLedger: away.coverage.playerFactors >= 9 && home.coverage.playerFactors >= 9,
      hasHandednessSplitLedger: away.coverage.playersWithSelectedSplits >= 7 && home.coverage.playersWithSelectedSplits >= 7,
      hasPitchFitLedger: away.coverage.playersWithPitchFit >= 7 && home.coverage.playersWithPitchFit >= 7,
      hasBvpH2hLedger: away.coverage.playersWithBvpH2h > 0 || home.coverage.playersWithBvpH2h > 0,
      hasEnv1Ledger: envDelta.sourceStatus === 'present',
      hasRp2Ledger: Boolean(game.reliefProjectionContext?.away && game.reliefProjectionContext?.home),
      hasProjectionLedger: Boolean(game.analysis?.mlbProjection)
    }
  }
}

export const withMlbCausalLedgerContext = (game = {}) => {
  if (!game || game.league !== 'MLB') return game
  return {
    ...game,
    causalLedgerContext: buildMlbCausalLedgerContext(game)
  }
}

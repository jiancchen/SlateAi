const array = (value) => (Array.isArray(value) ? value : [])
const hasText = (value) => String(value || '').trim().length > 0
const isFiniteNumber = (value) => Number.isFinite(Number(value))

const normalizeLineupState = ({ status = '', source = '', count = 0 } = {}) => {
  const normalizedStatus = String(status || '').toLowerCase()
  const normalizedSource = String(source || '').toLowerCase()
  if (count >= 9 && /posted|official|confirmed/.test(normalizedStatus)) return 'official'
  if (count >= 9) return 'projected'
  if (count > 0) return 'partial'
  if (/locked/.test(normalizedStatus)) return 'locked'
  if (/stale/.test(normalizedStatus)) return 'stale'
  if (/pending|none|missing/.test(normalizedStatus) || /none/.test(normalizedSource)) return 'missing'
  return 'missing'
}

const lineupSideContext = (game = {}, side = 'away') => {
  const lineupBoard = game.lineupBoard || {}
  const team = lineupBoard[side] || {}
  const lineup = array(team.lineup)
  const rawStatus = lineupBoard.status?.[side] || team.status || ''
  const source = team.lineupSource || team.source || ''
  const state = normalizeLineupState({ status: rawStatus, source, count: lineup.length })
  return {
    side,
    teamName: team.teamName || game.matchup?.[side === 'away' ? 0 : 1]?.name || '',
    status: rawStatus || state,
    normalizedStatus: state,
    source,
    snapshot: lineupBoard.snapshot || '',
    hitterCount: lineup.length,
    complete: lineup.length >= 9,
    projected: state === 'projected',
    official: state === 'official',
    partial: state === 'partial',
    missing: state === 'missing'
  }
}

const starterSplitStatus = (starter = {}) => {
  const status = starter?.espnSplits?.sourceStatus || starter?.espnSplits?.source_status || ''
  if (status === 'fetched' || status === 'missing-espn-athlete') return status
  return ''
}

const pitcherRoleContextFor = (game = {}, side = 'away') => {
  const lineupBoard = game.lineupBoard || {}
  const opponentSide = side === 'away' ? 'home' : 'away'
  const pitcherSourceContext = lineupBoard.pitcherSourceContext?.[side] || game.pitcherSourceContext?.[side] || null
  const opponentStarter = lineupBoard[opponentSide]?.opposingStarter || null
  const starterRoleContext =
    pitcherSourceContext?.starterRoleContext ||
    opponentStarter?.starterRoleContext ||
    null
  const sourceRole =
    pitcherSourceContext?.source ||
    pitcherSourceContext?.starter?.sourceRole ||
    opponentStarter?.sourceRole ||
    starterRoleContext?.source ||
    ''
  return {
    source: sourceRole || '',
    role: pitcherSourceContext?.role || starterRoleContext?.role || opponentStarter?.role || '',
    roleLabel: pitcherSourceContext?.starter?.roleLabel || starterRoleContext?.roleLabel || opponentStarter?.roleLabel || '',
    note: pitcherSourceContext?.note || starterRoleContext?.note || opponentStarter?.starterRoleContext?.note || '',
    opener:
      pitcherSourceContext?.opener ||
      opponentStarter?.openerContext ||
      null,
    hasContext: Boolean(sourceRole || starterRoleContext || opponentStarter)
  }
}

const pitcherSideContext = (game = {}, side = 'away') => {
  const starter = game.starterContext?.[side] || game.startingPitcherContext?.[side] || {}
  const roleContext = pitcherRoleContextFor(game, side)
  const name = starter.fullName || starter.name || ''
  const id = starter.id ?? starter.mlbPlayerId ?? starter.playerId ?? null
  return {
    side,
    name,
    id,
    hand: starter.pitchHand || starter.hand || starter.handedness || '',
    complete: hasText(name) || isFiniteNumber(id),
    usageStatus: starter.usageContext?.status || '',
    roleContext,
    isPrimaryBulk: /primary|bulk/i.test(`${roleContext.source} ${roleContext.role} ${roleContext.roleLabel}`),
    hasOpener: Boolean(roleContext.opener),
    espnSplitStatus: starterSplitStatus(starter),
    hasStatMuse: Boolean(starter.statmuseVsOpponent?.sourceUrl || starter.statmuseVsOpponent?.statmuseUrl)
  }
}

const playerHasPitchFit = (player) => hasText(player?.pitchType?.summary)
const playerHasBatterProjection = (player) =>
  Boolean(player?.metrics) &&
  (isFiniteNumber(player.metrics.matchupGrade) ||
    isFiniteNumber(player.metrics.starterMatchupKernelScore) ||
    isFiniteNumber(player.metrics.formScore))
const normalizedPitcherHand = (value = '') => {
  const hand = String(value || '').trim().toUpperCase()
  if (hand.startsWith('L')) return 'L'
  if (hand.startsWith('R')) return 'R'
  return ''
}

const selectedHandednessSplit = (player = {}, pitcherHand = '') => {
  const hand = normalizedPitcherHand(pitcherHand || player?.espnHitterSplit?.pitcherHand)
  if (hand === 'L') return player?.espnHitterSplits?.vsLeft || null
  if (hand === 'R') return player?.espnHitterSplits?.vsRight || null
  return null
}

const selectedLegacySplitMatchesHand = (player = {}, pitcherHand = '') => {
  const hand = normalizedPitcherHand(pitcherHand)
  const selectedHand = normalizedPitcherHand(player?.espnHitterSplit?.pitcherHand)
  if (hand && selectedHand && hand !== selectedHand) return false
  return isFiniteNumber(player?.espnHitterSplit?.ops) || isFiniteNumber(player?.split?.ops)
}

const playerHasSelectedHandednessSplit = (player = {}, pitcherHand = '') =>
  isFiniteNumber(selectedHandednessSplit(player, pitcherHand)?.ops) ||
  selectedLegacySplitMatchesHand(player, pitcherHand)

const lineupPlayerLabel = (player = {}, index = 0, side = '') => ({
  side,
  slot: player.slot ?? player.battingOrder ?? index + 1,
  playerId: player.playerId ?? player.id ?? player.mlbPlayerId ?? null,
  name: player.name || player.fullName || '',
  position: player.position || '',
  bats: player.bats || player.battingHand || ''
})

const isPitcherLineupSlot = (player = {}) =>
  /^P$/i.test(String(player.position || '').trim()) || /^pitcher$/i.test(String(player.positionName || '').trim())

const missingPlayerRows = (players = [], side = '', predicate = () => false) =>
  players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => !predicate(player))
    .map(({ player, index }) => lineupPlayerLabel(player, index, side))

const sideHitterContext = (players = [], side = '', teamBoard = {}) => {
  const opposingStarterHand = teamBoard.opposingStarter?.hand || teamBoard.opposingStarter?.handedness || ''
  const hasSelectedSplit = (player) => playerHasSelectedHandednessSplit(player, opposingStarterHand)
  return {
    totalHitters: players.length,
    opposingStarterHand: normalizedPitcherHand(opposingStarterHand),
    pitchFitHitters: players.filter(playerHasPitchFit).length,
    batterProjectionHitters: players.filter(playerHasBatterProjection).length,
    handednessSplitHitters: players.filter(hasSelectedSplit).length,
    pitcherSlotHitters: players
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => isPitcherLineupSlot(player))
      .map(({ player, index }) => lineupPlayerLabel(player, index, side)),
    missingPitchFitHitters: missingPlayerRows(players, side, playerHasPitchFit),
    missingBatterProjectionHitters: missingPlayerRows(players, side, playerHasBatterProjection),
    missingHandednessSplitHitters: missingPlayerRows(players, side, hasSelectedSplit)
  }
}

const addendumContext = (game = {}) => {
  const awayBoard = game.lineupBoard?.away || {}
  const homeBoard = game.lineupBoard?.home || {}
  const awayLineup = array(awayBoard.lineup)
  const homeLineup = array(homeBoard.lineup)
  const players = [...awayLineup, ...homeLineup]
  const hitterContext = {
    away: sideHitterContext(awayLineup, 'away', awayBoard),
    home: sideHitterContext(homeLineup, 'home', homeBoard)
  }
  const projection = game.analysis?.mlbProjection || {}
  const totals = projection.totals || {}
  return {
    park: Boolean(game.parkContext?.venueName || game.parkContext?.name),
    environment: Boolean(game.environmentAdjustmentContext),
    ficDailyMatchups: Boolean(game.ficDailyMatchupContext),
    rp2: Boolean(game.reliefProjectionContext?.away && game.reliefProjectionContext?.home),
    sp1: Boolean(game.starterProfileContext?.away && game.starterProfileContext?.home),
    bridgeChain: Boolean(game.bullpenChainContext?.away && game.bullpenChainContext?.home),
    relieverShadow: Boolean(game.relieverShadowContext?.away && game.relieverShadowContext?.home),
    firstFive: isFiniteNumber(totals.derivedFirst5TotalLine) ||
      isFiniteNumber(totals.projectedFirst5TotalRuns) ||
      isFiniteNumber(projection.awayFirst5ProjectedRuns),
    firstInning: Boolean(projection.firstInning),
    pitchFitHitters: players.filter(playerHasPitchFit).length,
    batterProjectionHitters: players.filter(playerHasBatterProjection).length,
    handednessSplitHitters: hitterContext.away.handednessSplitHitters + hitterContext.home.handednessSplitHitters,
    totalHitters: players.length,
    hitterContext,
    pitcherSlotHitters: [...hitterContext.away.pitcherSlotHitters, ...hitterContext.home.pitcherSlotHitters],
    missingPitchFitHitters: [...hitterContext.away.missingPitchFitHitters, ...hitterContext.home.missingPitchFitHitters],
    missingBatterProjectionHitters: [
      ...hitterContext.away.missingBatterProjectionHitters,
      ...hitterContext.home.missingBatterProjectionHitters
    ],
    missingHandednessSplitHitters: [
      ...hitterContext.away.missingHandednessSplitHitters,
      ...hitterContext.home.missingHandednessSplitHitters
    ]
  }
}

export const buildMlbPredictionEligibility = (game = {}, options = {}) => {
  const requirePublicModelContext = options.requirePublicModelContext !== false
  const requireAddendums = Boolean(options.requireAddendums)
  const requireStatMuse = Boolean(options.requireStatMuse)
  const lineup = {
    away: lineupSideContext(game, 'away'),
    home: lineupSideContext(game, 'home')
  }
  const pitchers = {
    away: pitcherSideContext(game, 'away'),
    home: pitcherSideContext(game, 'home')
  }
  const addendums = addendumContext(game)
  const hardFailures = []
  const warnings = []

  for (const side of ['away', 'home']) {
    if (!lineup[side].complete) {
      hardFailures.push(`${side}-lineup-${lineup[side].hitterCount ? 'partial' : 'missing'}`)
    }
    if (array(addendums.hitterContext?.[side]?.pitcherSlotHitters).length) hardFailures.push(`${side}-lineup-pitcher-slot`)
    if (!lineup[side].snapshot) warnings.push(`${side}-lineup-snapshot-missing`)
    if (!lineup[side].source) warnings.push(`${side}-lineup-source-missing`)
    if (!pitchers[side].complete) hardFailures.push(`${side}-projection-pitcher-missing`)
    if (pitchers[side].usageStatus === 'starter-tbd') hardFailures.push(`${side}-projection-pitcher-tbd`)
    if (!pitchers[side].roleContext.hasContext) warnings.push(`${side}-pitcher-role-context-missing`)
    if (!pitchers[side].espnSplitStatus) {
      if (requirePublicModelContext) hardFailures.push(`${side}-espn-pitcher-splits-missing`)
      else warnings.push(`${side}-espn-pitcher-splits-missing`)
    }
    if (requireStatMuse && !pitchers[side].hasStatMuse) warnings.push(`${side}-statmuse-context-missing`)
  }

  if (requirePublicModelContext) {
    const expectedHitterContext = addendums.totalHitters
    if (addendums.pitchFitHitters < expectedHitterContext) hardFailures.push('pitch-fit-hitters-missing')
    if (addendums.batterProjectionHitters < expectedHitterContext) hardFailures.push('batter-projection-hitters-missing')
    if (addendums.handednessSplitHitters < expectedHitterContext) hardFailures.push('hitter-handedness-splits-missing')
    if (!addendums.park) hardFailures.push('park-context-missing')
    if (!addendums.firstFive) hardFailures.push('first-five-context-missing')
    if (!addendums.firstInning) hardFailures.push('first-inning-context-missing')
  }

  if (requireAddendums) {
    if (!addendums.environment) hardFailures.push('env1-context-missing')
    if (!addendums.ficDailyMatchups) hardFailures.push('fic-daily-matchups-missing')
    if (!addendums.rp2) hardFailures.push('rp2-context-missing')
  } else {
    if (!addendums.environment) warnings.push('env1-context-missing')
    if (!addendums.ficDailyMatchups) warnings.push('fic-daily-matchups-missing')
    if (!addendums.rp2) warnings.push('rp2-context-missing')
  }
  if (!addendums.sp1) warnings.push('sp1-starter-profile-context-missing')

  const eligible = hardFailures.length === 0
  const status = eligible
    ? lineup.away.official && lineup.home.official
      ? 'official'
      : 'projected'
    : 'pending'

  return {
    version: 'mlb-prediction-eligibility-v1',
    eligible,
    status,
    hardFailures,
    warnings,
    lineup,
    pitchers,
    addendums
  }
}

export const withMlbPredictionEligibility = (game = {}, options = {}) => ({
  ...game,
  predictionEligibility: buildMlbPredictionEligibility(game, options)
})

import { structuredInputOverrides } from '../../../../../web/src/lib/structured-inputs.js'
import {
  americanToDecimal,
  average,
  clamp,
  formatAmericanOdds,
  formatProbability,
  getAnalysisTier,
  impliedProbabilityFromAmerican,
  normalizeText,
  parseAmericanOddsPair,
  roundToTenths
} from './core-utils.js'
import {
  computeNoVigProbabilities,
  getMoneylineMarket
} from './market-utils.js'
import {
  buildMarketSignal,
  createSignal,
  normalizeSignal
} from './signal-utils.js'
import { parseRecord } from './mlb-starter-utils.js'
import {
  applyMlbTierOneControls,
  buildMlbEfficientFavoriteLane,
  buildMlbResearchVetoFlags,
  buildMlbVetoLayer
} from './mlb-side-controls.js'
import { buildMlbAnalysisContext } from './mlb-analysis-context.js'
import { buildMlbDecisionIndicators } from './mlb-decision-indicators.js'
import { buildMlbPlayerProps } from './mlb-props.js'
import { teamNamesMatch } from './team-utils.js'

export {
  americanToDecimal,
  decimalToAmerican,
  formatAmericanOdds,
  formatCurrency,
  formatProbability,
  impliedProbabilityFromAmerican,
  parseAmericanOddsPair
} from './core-utils.js'
export { simulateMlbGame } from './mlb-simulation.js'
export {
  rankAnalysisPicks,
  rankEfficientFavoritePicks,
  rankFlipRiskPicks
} from './pick-rankings.js'
export { buildParlayModel, createParlayLeg } from './parlay.js'
export {
  rankMlbPlayerPropCandidatesLegacy,
  rankMlbPlayerProps
} from './mlb-props.js'

const fallbackRecommendationWeight = {
  confidence: 0.72,
  stability: 0.28
}

const structuredRecommendationWeight = {
  confidence: 0.6,
  stability: 0.22,
  edge: 0.18
}

const MLB_SIDE_MODEL_DESIGNATION = 'board-moneyline-v1.1'

const sportVolatilityBase = {
  MLB: 52,
  UFC: 60,
  NBA: 54,
  WNBA: 60
}

const buildParticipantAliases = (name) => {
  const normalized = normalizeText(name)

  if (!normalized) return []

  const tokens = normalized.split(' ')
  const aliases = new Set([normalized, tokens.at(-1), tokens[0]])

  return [...aliases].filter((alias) => alias && alias.length >= 3)
}

const findAnalysisParticipant = (leanText, participants) => {
  const normalizedLean = normalizeText(leanText).replace(/^lean\s+/, '')
  let bestMatch = null

  participants.forEach((participant) => {
    buildParticipantAliases(participant.name).forEach((alias) => {
      const index = normalizedLean.indexOf(alias)

      if (index === -1) return

      if (
        !bestMatch ||
        index < bestMatch.index ||
        (index === bestMatch.index && alias.length > bestMatch.aliasLength)
      ) {
        bestMatch = {
          participant,
          index,
          aliasLength: alias.length
        }
      }
    })
  })

  return bestMatch?.participant ?? null
}

const buildParticipantModel = (game, side, index, americanOdds = null) => {
  const decimalOdds = americanToDecimal(americanOdds)
  const impliedProbability = impliedProbabilityFromAmerican(americanOdds)

  return {
    id: `${game.id}:${index}`,
    index,
    role: side.side,
    name: side.name,
    detail: side.detail,
    americanOdds,
    americanLabel: formatAmericanOdds(americanOdds),
    decimalOdds,
    impliedProbability,
    impliedProbabilityLabel: formatProbability(impliedProbability)
  }
}

const detectWeightClass = (text = '') => {
  const normalized = normalizeText(text)

  for (const weightClass of ['flyweight', 'bantamweight', 'featherweight', 'lightweight', 'welterweight', 'middleweight', 'light heavyweight', 'heavyweight']) {
    if (normalized.includes(weightClass)) return weightClass
  }

  return ''
}

const applyProfileDelta = (profile, delta) => {
  Object.entries(delta).forEach(([key, value]) => {
    profile[key] += value
  })
}

const buildFighterProfile = (detail = '', stage = '') => {
  const parts = detail.split('|').map((part) => part.trim()).filter(Boolean)
  const record = parseRecord(parts[0] || '')
  const descriptors = parts.slice(1)
  const descriptorText = normalizeText([stage, ...descriptors].join(' | '))
  const weightClass = detectWeightClass([stage, ...descriptors].join(' | '))
  const totalBouts = record?.totalBouts ?? 0
  const winPct = record?.winPct ?? 0.5

  const profile = {
    striking: 50,
    grappling: 50,
    pace: 50,
    durability: clamp(46 + winPct * 12 + Math.log(totalBouts + 1) * 4, 38, 86),
    finishing: 50,
    experience: clamp(40 + Math.log(totalBouts + 1) * 14, 36, 90),
    championship: 50
  }

  const descriptorRules = [
    [/former champion/, { experience: 14, durability: 6, pace: 4, championship: 12 }],
    [/champion/, { experience: 10, durability: 4, pace: 4, championship: 10 }],
    [/prospect/, { experience: -8, pace: 4, finishing: 3, championship: -6 }],
    [/elite/, { striking: 5, grappling: 5, pace: 4, durability: 4, finishing: 4, championship: 4 }],
    [/grappling|grappler|jiu jitsu|submission/, { grappling: 18, striking: -4, pace: 3, finishing: 4 }],
    [/control/, { grappling: 12, pace: 5, durability: 3 }],
    [/striker|striking|boxer|jab/, { striking: 16, grappling: -6 }],
    [/pressure/, { striking: 5, pace: 9, durability: 4 }],
    [/explosive|power/, { striking: 6, finishing: 16, pace: -3 }],
    [/range|rangy|tall/, { striking: 9, durability: 3 }],
    [/southpaw/, { striking: 4 }],
    [/volume|pace/, { pace: 12, durability: 4, championship: 3 }],
    [/dynamic|freestyle/, { striking: 4, grappling: 6, finishing: 4 }],
    [/winning profile/, { experience: 8, durability: 5, championship: 4 }],
    [/fight week spotlight/, { pace: 2, finishing: 2 }]
  ]

  descriptorRules.forEach(([pattern, delta]) => {
    if (pattern.test(descriptorText)) applyProfileDelta(profile, delta)
  })

  if (record?.losses === 0) {
    applyProfileDelta(profile, { durability: 4, championship: 4 })
  }

  if (winPct >= 0.82) {
    applyProfileDelta(profile, { durability: 3, championship: 4 })
  }

  if (totalBouts >= 25) {
    applyProfileDelta(profile, { experience: 6, durability: 4 })
  }

  if (weightClass === 'heavyweight') {
    applyProfileDelta(profile, { finishing: 8, pace: -2 })
  }

  Object.keys(profile).forEach((key) => {
    profile[key] = clamp(profile[key], 24, 94)
  })

  return {
    ...record,
    weightClass,
    descriptors,
    profile
  }
}

const buildUfcAnalysisContext = (game, participants) => {
  const fighters = participants.map((participant) => buildFighterProfile(participant.detail, game.stage))
  const signals = [buildMarketSignal(game.league, participants)].filter(Boolean)
  const volatilityModifiers = []
  const isTitleFight = /title fight|main event/i.test(game.stage)
  const marketProbabilities = computeNoVigProbabilities(
    participants.map((participant) => participant.americanOdds)
  )

  if (fighters.every(Boolean)) {
    signals.push(
      createSignal(
        'Win profile',
        0.12,
        fighters.map((fighter) => ({
          label: fighter ? `${fighter.wins}-${fighter.losses}${fighter.draws ? `-${fighter.draws}` : ''}` : 'Record unavailable',
          score: fighter
            ? clamp(34 + fighter.winPct * 46 + Math.log(fighter.totalBouts + 1) * 6, 24, 90)
            : 50
        })),
        'Listed fight records'
      )
    )

    signals.push(
      createSignal(
        'Striking profile',
        0.12,
        fighters.map((fighter) => ({
          label: fighter.descriptors[0] || 'Style note unavailable',
          score: fighter.profile.striking
        })),
        'Structured fighter profile'
      )
    )

    signals.push(
      createSignal(
        'Control and grappling',
        0.18,
        fighters.map((fighter) => ({
          label: fighter.descriptors.at(-1) || 'Style note unavailable',
          score: fighter.profile.grappling
        })),
        'Structured fighter profile'
      )
    )

    signals.push(
      createSignal(
        'Pace and cardio',
        0.11,
        fighters.map((fighter) => ({
          label: fighter.weightClass || 'Open-weight pace note',
          score: fighter.profile.pace
        })),
        'Structured fighter profile'
      )
    )

    signals.push(
      createSignal(
        'Durability and experience',
        0.14,
        fighters.map((fighter) => ({
          label: `${fighter.totalBouts} pro bouts`,
          score: average([fighter.profile.durability, fighter.profile.experience])
        })),
        'Structured fighter profile'
      )
    )

    signals.push(
      createSignal(
        'Finishing danger',
        0.11,
        fighters.map((fighter) => ({
          label: fighter.descriptors.join(' | ') || 'Finish profile unavailable',
          score: fighter.profile.finishing
        })),
        'Structured fighter profile'
      )
    )

    if (isTitleFight) {
      signals.push(
        createSignal(
          'Championship composure',
          0.1,
          fighters.map((fighter) => ({
            label: fighter.descriptors.join(' | ') || 'Five-round read',
            score: fighter.profile.championship
          })),
          'Structured fighter profile'
        )
      )
    }

    if (fighters.some((fighter) => fighter.weightClass === 'heavyweight')) {
      volatilityModifiers.push({ label: 'Heavyweight finishing volatility', delta: 8 })
    }

    if (average(fighters.map((fighter) => fighter.profile.finishing)) >= 76) {
      volatilityModifiers.push({ label: 'Both sides bring real finish equity', delta: 6 })
    }

    if (isTitleFight) {
      volatilityModifiers.push({ label: 'Championship rounds add adaptation variance', delta: 4 })
    }

    if (Math.abs(fighters[0].profile.grappling - fighters[1].profile.grappling) >= 20) {
      volatilityModifiers.push({ label: 'Major control split can swing rounds fast', delta: 4 })
    }

    if (fighters.every((fighter) => fighter.totalBouts <= 20)) {
      volatilityModifiers.push({ label: 'Younger career samples leave more unknowns', delta: 4 })
    }

    if (marketProbabilities.length === participants.length && Math.max(...marketProbabilities) >= 0.68) {
      volatilityModifiers.push({ label: 'Market favorite is clearly established', delta: -6 })
    }
  }

  return {
    sourceLabel: 'Moneyline + structured fighter profiles',
    signals,
    volatilityBase: sportVolatilityBase.UFC,
    volatilityModifiers
  }
}

const buildOverrideAnalysisContext = (game, participants) => {
  const override = structuredInputOverrides[game.id]

  if (!override) return null

  return {
    sourceLabel: override.sourceLabel || 'Moneyline + local structured inputs',
    signals: [buildMarketSignal(game.league, participants), ...(override.signals || [])].filter(Boolean),
    volatilityBase: override.volatility?.base ?? sportVolatilityBase[game.league] ?? 55,
    volatilityModifiers: override.volatility?.modifiers ?? []
  }
}

const buildStructuredAnalysisContext = (game, participants) => {
  if (game.league === 'MLB') return buildMlbAnalysisContext(game, participants)
  if (game.league === 'UFC') return buildUfcAnalysisContext(game, participants)
  if (game.league === 'NBA' || game.league === 'WNBA') {
    return buildOverrideAnalysisContext(game, participants)
  }

  return null
}

const buildFallbackAnalysisModel = (game, participants, hasFullMoneyline) => {
  const providedAnalysis = game.analysis ?? {}
  const participant = findAnalysisParticipant(game.lean, participants)
  const opponent = participant ? participants.find((entry) => entry.id !== participant.id) : null
  const confidence = Number(game.confidence) || 0
  const volatility = Number(game.volatility) || 0
  const allowModelOnlyAnalysis = game.league === 'Tennis'
  const isTennisMarketPrice = allowModelOnlyAnalysis && Boolean(game.tennisContext?.predictionMarket)
  const tennisMarketPlayer = game.tennisContext?.players?.find((entry) =>
    participant ? teamNamesMatch(entry.name, participant.name) : false
  )
  const tennisMarketProbability =
    allowModelOnlyAnalysis && Number.isFinite(tennisMarketPlayer?.boardPct)
      ? tennisMarketPlayer.boardPct / 100
      : null
  const tennisMarketEconomicsPlayer = game.tennisContext?.marketEconomics?.players?.find((entry) =>
    participant ? teamNamesMatch(entry.name, participant.name) : false
  )
  const tennisModelEdge = Number(tennisMarketEconomicsPlayer?.edgePct)
  const tennisInputsUsed = [
    game.tennisContext?.predictionMarket,
    game.tennisContext?.marketEconomics,
    game.tennisContext?.opponentQualityData,
    game.tennisContext?.weaknessEdge,
    game.tennisContext?.clayMatchupData
  ].filter(Boolean).length
  const marketProbability = participant?.impliedProbability ?? tennisMarketProbability
  const recommendationScore = Math.round(
    confidence * fallbackRecommendationWeight.confidence +
      (100 - volatility) * fallbackRecommendationWeight.stability
  )

  return {
    available: Boolean(
      participant &&
        (allowModelOnlyAnalysis || (hasFullMoneyline && Number.isFinite(participant.americanOdds)))
    ),
    participantId: participant?.id ?? null,
    participant,
    opponent,
    lean: game.lean,
    rationale: game.factors?.[0] || game.summary,
    confidence,
    volatility,
    recommendationScore,
    tier: providedAnalysis.tier || getAnalysisTier(confidence, volatility),
    sourceLabel: providedAnalysis.sourceLabel || 'Editorial slate read',
    modelEdge: Number.isFinite(tennisModelEdge) ? tennisModelEdge : 0,
    modelEdgeLabel: Number.isFinite(tennisModelEdge)
      ? `${tennisModelEdge >= 0 ? '+' : ''}${tennisModelEdge.toFixed(1)} pts vs market`
      : allowModelOnlyAnalysis && !hasFullMoneyline ? 'Model-only read' : 'Editorial read',
    marketProbability,
    marketProbabilityLabel:
      (Number.isFinite(participant?.impliedProbability) ? participant.impliedProbabilityLabel : null) ??
      (Number.isFinite(tennisMarketProbability)
        ? `${isTennisMarketPrice ? 'Market price ' : ''}${formatProbability(tennisMarketProbability)}`
        : allowModelOnlyAnalysis && !hasFullMoneyline
          ? 'Model only'
          : 'N/A'),
    inputs: [],
    inputsUsed: allowModelOnlyAnalysis ? tennisInputsUsed : 0,
    volatilityNotes: []
  }
}

const buildStructuredAnalysisModel = (game, participants, hasFullMoneyline) => {
  const context = buildStructuredAnalysisContext(game, participants)

  if (!context?.signals?.length) return null

  const normalizedSignals = context.signals.map((signal) => normalizeSignal(signal, participants))
  const totalWeight = normalizedSignals.reduce((sum, signal) => sum + signal.weight, 0)

  if (!totalWeight) return null

  const sideScores = participants.map((_, index) =>
    normalizedSignals.reduce((sum, signal) => sum + signal.values[index].score * signal.weight, 0) /
    totalWeight
  )

  const marketSignal = normalizedSignals.find((signal) => signal.label === 'Market price')
  const marketProbabilities = marketSignal
    ? marketSignal.values.map((entry) => entry.score / 100)
    : computeNoVigProbabilities(participants.map((entry) => entry.americanOdds))
  const marketWinnerIndex =
    marketProbabilities.length === participants.length
      ? marketProbabilities[0] >= marketProbabilities[1]
        ? 0
        : 1
      : null
  const adjustedSideScores = [...sideScores]

  if (
    game.league === 'MLB' &&
    marketWinnerIndex !== null &&
    context.mlbRiskContext?.projectedHitProfiles?.length === participants.length
  ) {
    const underdogIndex = marketWinnerIndex === 0 ? 1 : 0
    const favoriteHitProfile = context.mlbRiskContext.projectedHitProfiles[marketWinnerIndex]
    const underdogHitProfile = context.mlbRiskContext.projectedHitProfiles[underdogIndex]
    const favoriteBullpenChain = context.mlbRiskContext.bullpenChainScores?.[marketWinnerIndex]
    const underdogBullpenChain = context.mlbRiskContext.bullpenChainScores?.[underdogIndex]

    if (favoriteHitProfile && underdogHitProfile) {
      const favoriteHitGap = favoriteHitProfile.projectedHits - underdogHitProfile.projectedHits
      const favoriteFirst5Gap =
        favoriteHitProfile.first5ProjectedHits - underdogHitProfile.first5ProjectedHits
      const favoriteLateGap =
        favoriteHitProfile.lateProjectedHits - underdogHitProfile.lateProjectedHits
      const favoriteBullpenGap =
        Number.isFinite(favoriteBullpenChain) && Number.isFinite(underdogBullpenChain)
          ? favoriteBullpenChain - underdogBullpenChain
          : 0

      if (favoriteHitGap <= -1) {
        adjustedSideScores[underdogIndex] += Math.min(4.6, Math.abs(favoriteHitGap) * 1.7)
      }

      if (favoriteFirst5Gap <= -0.8) {
        adjustedSideScores[underdogIndex] += Math.min(2.1, Math.abs(favoriteFirst5Gap) * 1.3)
      }

      if (favoriteLateGap <= -0.8 && favoriteBullpenGap < 0) {
        adjustedSideScores[underdogIndex] += Math.min(
          2.4,
          Math.abs(favoriteLateGap) * 1.15 + Math.abs(favoriteBullpenGap) * 0.1
        )
      }
    }
  }

  const initialModelEdge = Math.abs(adjustedSideScores[0] - adjustedSideScores[1])
  let consensusOverrideNote = null

  if (game.league === 'MLB' && context.mlbProjection && participants.length === 2) {
    const phaseTeamNames = [
      context.mlbProjection.edgeTeam,
      context.mlbProjection.first5EdgeTeam,
      context.mlbProjection.lateEdgeTeam,
      context.mlbProjection.bridgeEdgeTeam
    ].filter(Boolean)

    const normalizedPhaseIndices = phaseTeamNames
      .map((teamName) => participants.findIndex((participant) => teamNamesMatch(participant.name, teamName)))
      .filter((index) => index >= 0)

    const unanimousPhaseIndex =
      normalizedPhaseIndices.length === 4 && normalizedPhaseIndices.every((index) => index === normalizedPhaseIndices[0])
        ? normalizedPhaseIndices[0]
        : null

    if (unanimousPhaseIndex !== null) {
      const oppositeIndex = unanimousPhaseIndex === 0 ? 1 : 0
      const phaseConsensusStrength =
        (Number(context.mlbProjection.edgeHits) || 0) +
        (Number(context.mlbProjection.first5EdgeHits) || 0) +
        (Number(context.mlbProjection.lateEdgeHits) || 0) +
        (Number(context.mlbProjection.bridgeEdgeScore) || 0) * 0.2

      if (
        adjustedSideScores[unanimousPhaseIndex] < adjustedSideScores[oppositeIndex] &&
        initialModelEdge <= 6 &&
        phaseConsensusStrength >= 1
      ) {
        const overrideBump = Math.max(0.8, Math.min(3.6, phaseConsensusStrength * 0.9))
        adjustedSideScores[unanimousPhaseIndex] = Math.max(
          adjustedSideScores[unanimousPhaseIndex],
          adjustedSideScores[oppositeIndex] + overrideBump
        )
        consensusOverrideNote = `${participants[unanimousPhaseIndex].name} owned every phase edge, so the side pick was pulled back toward the full-game script.`
      }
    }
  }

  const winnerIndex = adjustedSideScores[0] >= adjustedSideScores[1] ? 0 : 1
  const loserIndex = winnerIndex === 0 ? 1 : 0
  const participant = participants[winnerIndex]
  const opponent = participants[loserIndex]
  const modelEdge = adjustedSideScores[winnerIndex] - adjustedSideScores[loserIndex]
  const coverageBonus = Math.min(6, normalizedSignals.length)
  const agreementBonus =
    marketWinnerIndex === null ? 0 : marketWinnerIndex === winnerIndex ? 5 : -3
  const marketSupport = marketProbabilities[winnerIndex] ?? participant.impliedProbability ?? 0.5
  const pickIsMarketFavorite =
    marketProbabilities.length === participants.length
      ? winnerIndex === marketWinnerIndex
      : participant.impliedProbability >= (opponent?.impliedProbability ?? 0)
  const pickIsMarketUnderdog =
    marketProbabilities.length === participants.length
      ? winnerIndex !== marketWinnerIndex
      : participant.impliedProbability < (opponent?.impliedProbability ?? 0)
  const modelSlateDate =
    typeof game.slateDate === 'string'
      ? game.slateDate
      : typeof game.metadata?.slateDate === 'string'
        ? game.metadata.slateDate
        : ''
  const enableMay30QuietStartGate =
    game.league === 'MLB' &&
    (game.metadata?.quietStartFullGameGate === true ||
      (/^\d{4}-\d{2}-\d{2}$/.test(modelSlateDate) && modelSlateDate >= '2026-05-31'))
  const baseConfidence = Math.round(
    clamp(
      50 +
        modelEdge * 0.95 +
        coverageBonus +
        agreementBonus +
        Math.abs(marketSupport - 0.5) * 12 +
        (context.confidenceModifier ?? 0),
      52,
      89
    )
  )
  const marketTightness =
    marketProbabilities.length === participants.length
      ? (1 - Math.abs(marketProbabilities[0] - 0.5) * 2) * 12
      : 4
  const modifierDelta = (context.volatilityModifiers || []).reduce(
    (sum, modifier) => sum + modifier.delta,
    0
  )
  const baseVolatility = Math.round(
    clamp(
      (context.volatilityBase ?? sportVolatilityBase[game.league] ?? 55) +
        marketTightness +
        modifierDelta -
        modelEdge * 0.5 +
        (normalizedSignals.length < 3 ? 6 : 0),
      30,
      92
    )
  )
  const mlbIndicators =
    game.league === 'MLB'
      ? buildMlbDecisionIndicators({
          riskContext: context.mlbRiskContext,
          participants,
          winnerIndex,
          loserIndex,
          modelEdge,
          baseVolatility,
          enableMay30QuietStartGate
        })
      : null
  const confidence = Math.round(
    clamp(baseConfidence + (mlbIndicators?.confidenceDelta ?? 0), 52, 89)
  )
  const volatility = Math.round(
    clamp(baseVolatility + (mlbIndicators?.volatilityDelta ?? 0), 30, 92)
  )
  const inputCandidates = normalizedSignals
    .filter((signal) => signal.favoredParticipantId === participant.id && signal.margin > 0)
    .sort((left, right) => right.margin * right.weight - left.margin * left.weight)
  const favoredSignalCount = inputCandidates.length

  const inputs = inputCandidates.slice(0, 3).map((signal) => ({
    label: signal.label,
    summary: signal.summary,
    source: signal.source,
    margin: roundToTenths(signal.margin),
    weight: signal.weight
  }))

  const leanDrivers = inputs.slice(0, 2).map((input) => input.label.toLowerCase())
  const lean =
    leanDrivers.length > 0
      ? `Model pick: ${participant.name} on ${leanDrivers.join(' and ')}.`
      : `Model pick: ${participant.name}.`
  const pickScript = context.mlbProjection?.teamScripts?.find((script) =>
    teamNamesMatch(script.teamName, participant.name)
  )
  const tierOneControls =
    game.league === 'MLB' && mlbIndicators
        ? applyMlbTierOneControls({
          confidence,
          volatility,
          modelEdge,
          starterLeverageIndex: mlbIndicators.starterLeverageIndex,
          lateInningStabilityIndex: mlbIndicators.lateInningStabilityIndex,
          reliefPitchingRisk: mlbIndicators.reliefPitchingRisk,
          coinflipPressure: mlbIndicators.coinflipPressure,
          favoredSignalCount,
          pickStarterLeashScore: mlbIndicators.pickStarterLeashScore,
          oppStarterLeashScore: mlbIndicators.oppStarterLeashScore,
          marketProbability: marketSupport,
          pickIsMarketFavorite,
          statefulSuggestedEdgeHaircut: mlbIndicators.statefulSuggestedEdgeHaircut ?? 0,
          statefulSuggestedConfidenceHaircut: mlbIndicators.statefulSuggestedConfidenceHaircut ?? 0,
          statefulOpponentSnapbackTrapFlag: Boolean(mlbIndicators.statefulOpponentSnapbackTrapFlag),
          tierThreeSuggestedEdgeHaircut: mlbIndicators.tierThreeSuggestedEdgeHaircut ?? 0,
          tierThreeSuggestedConfidenceHaircut: mlbIndicators.tierThreeSuggestedConfidenceHaircut ?? 0,
          tierThreeBullpenCommandMismatchFlag: Boolean(mlbIndicators.tierThreeBullpenCommandMismatchFlag)
        })
      : null
  const researchVetoFlags =
    game.league === 'MLB' && mlbIndicators
      ? buildMlbResearchVetoFlags({
          enableQuietStartFullGameGate: enableMay30QuietStartGate,
          marketProbability: marketSupport,
          pickIsMarketFavorite,
          pickIsMarketUnderdog,
          pickLineupConversionIndex: mlbIndicators.pickLineupConversionIndex,
          pickDeadBatTrafficRate: mlbIndicators.pickDeadBatTrafficRate,
          pickTeamScorelessFirst3Rate: mlbIndicators.pickTeamScorelessFirst3Rate,
          pickTrafficNoConversionRate: mlbIndicators.pickTrafficNoConversionRate,
          pickQuietFirst5Rate: mlbIndicators.pickQuietFirst5Rate,
          pickBullpenMistakeChaos: mlbIndicators.pickBullpenMistakeChaos,
          oppBullpenMistakeChaos: mlbIndicators.oppBullpenMistakeChaos,
          pickTeamRunClustering: mlbIndicators.pickTeamRunClustering,
          pickTeamMistakeChaos: mlbIndicators.pickTeamMistakeChaos,
          oppTeamMistakeChaos: mlbIndicators.oppTeamMistakeChaos
        })
      : null
  const efficientFavoriteLane =
    game.league === 'MLB' && mlbIndicators
      ? buildMlbEfficientFavoriteLane({
          enableQuietStartFullGameGate: enableMay30QuietStartGate,
          marketProbability: marketSupport,
          pickIsMarketFavorite,
          confidence: tierOneControls?.adjustedConfidence ?? confidence,
          volatility: tierOneControls?.adjustedVolatility ?? volatility,
          modelEdge: tierOneControls?.adjustedModelEdge ?? modelEdge,
          starterLeverageIndex: mlbIndicators.starterLeverageIndex,
          lateInningStabilityIndex: mlbIndicators.lateInningStabilityIndex,
          reliefPitchingRisk: mlbIndicators.reliefPitchingRisk,
          favoredSignalCount,
          tierOneRiskPoints: tierOneControls?.riskPoints ?? 0,
          tierOnePassFlag: Boolean(tierOneControls?.passFlag),
          riskFlags: tierOneControls?.riskFlags ?? [],
          researchOnlyVetoFlagCount: researchVetoFlags?.researchOnlyVetoFlagCount ?? 0,
          pickLineupConversionIndex: mlbIndicators.pickLineupConversionIndex,
          pickDeadBatTrafficRate: mlbIndicators.pickDeadBatTrafficRate,
          pickTeamScorelessFirst3Rate: mlbIndicators.pickTeamScorelessFirst3Rate,
          pickTrafficNoConversionRate: mlbIndicators.pickTrafficNoConversionRate,
          pickQuietFirst5Rate: mlbIndicators.pickQuietFirst5Rate,
          pickBullpenMistakeChaos: mlbIndicators.pickBullpenMistakeChaos
        })
      : null
  const vetoLayer =
    game.league === 'MLB'
      ? buildMlbVetoLayer({
          researchOnlyVetoFlagCount: researchVetoFlags?.researchOnlyVetoFlagCount ?? 0,
          researchOnlyVetoFlags: researchVetoFlags?.researchOnlyVetoFlags ?? [],
          protectedMarketDogFlag: Boolean(researchVetoFlags?.protectedMarketDogFlag)
        })
      : null
  const vetoPassFlag = Number(researchVetoFlags?.researchOnlyVetoFlagCount || 0) > 0
  const finalConfidence = tierOneControls?.adjustedConfidence ?? confidence
  const finalVolatility = tierOneControls?.adjustedVolatility ?? volatility
  const finalModelEdge = tierOneControls?.adjustedModelEdge ?? modelEdge
  const computedTier = tierOneControls?.selectionTier ?? getAnalysisTier(finalConfidence, finalVolatility)
  const finalTier = vetoPassFlag ? 'Pass' : computedTier
  const finalRecommendationScore = Math.round(
    finalConfidence * structuredRecommendationWeight.confidence +
      (100 - finalVolatility) * structuredRecommendationWeight.stability +
      finalModelEdge * structuredRecommendationWeight.edge
  )

  return {
    available: Boolean(hasFullMoneyline && participant && Number.isFinite(participant.americanOdds)),
    participantId: participant.id,
    participant,
    opponent,
    lean,
    rationale: inputs[0]?.summary || game.factors?.[0] || game.summary,
    confidence: finalConfidence,
    volatility: finalVolatility,
    recommendationScore: finalRecommendationScore,
    tier: finalTier,
    sourceLabel: context.sourceLabel,
    modelDesignation: game.league === 'MLB' ? MLB_SIDE_MODEL_DESIGNATION : null,
    modelEdge: roundToTenths(finalModelEdge),
    modelEdgeLabel: `${roundToTenths(finalModelEdge)}-point model edge`,
    marketProbability: marketSupport,
    marketProbabilityLabel: formatProbability(marketSupport),
    inputs,
    inputsUsed: normalizedSignals.length,
    volatilityNotes: [
      ...(context.volatilityModifiers || []),
      ...(mlbIndicators?.notes || []),
      ...(tierOneControls?.notes || []),
      ...(consensusOverrideNote ? [{ label: consensusOverrideNote, delta: 0 }] : [])
    ],
    pickReasons: pickScript?.winPath?.slice(0, 4) ?? [],
    indicators: mlbIndicators
      ? {
          reliefPitchingRisk: mlbIndicators.reliefPitchingRisk,
          coinflipPressure: mlbIndicators.coinflipPressure,
          starterLeverageIndex: mlbIndicators.starterLeverageIndex,
          lateInningStabilityIndex: mlbIndicators.lateInningStabilityIndex,
          pickBullpenScore: mlbIndicators.pickBullpenScore,
          oppBullpenScore: mlbIndicators.oppBullpenScore,
          pickBullpenChainScore: mlbIndicators.pickBullpenChainScore,
          oppBullpenChainScore: mlbIndicators.oppBullpenChainScore,
          pickStarterScore: mlbIndicators.pickStarterScore,
          oppStarterScore: mlbIndicators.oppStarterScore,
          pickStarterLeashScore: mlbIndicators.pickStarterLeashScore,
          oppStarterLeashScore: mlbIndicators.oppStarterLeashScore,
          pickStoryInstability: mlbIndicators.pickStoryInstability,
          oppStoryInstability: mlbIndicators.oppStoryInstability,
          pickSnapbackPressure: mlbIndicators.pickSnapbackPressure,
          oppSnapbackPressure: mlbIndicators.oppSnapbackPressure,
          pickHeatRegression: mlbIndicators.pickHeatRegression,
          oppHeatRegression: mlbIndicators.oppHeatRegression,
          pickFormPressure: mlbIndicators.pickFormPressure,
          oppFormPressure: mlbIndicators.oppFormPressure,
          pickTop6Pressure: mlbIndicators.pickTop6Pressure,
          oppTop6Pressure: mlbIndicators.oppTop6Pressure,
          pickTop6Cold: mlbIndicators.pickTop6Cold,
          oppTop6Cold: mlbIndicators.oppTop6Cold,
          pickTop6Heat: mlbIndicators.pickTop6Heat,
          oppTop6Heat: mlbIndicators.oppTop6Heat,
          pickTeamMistakeChaos: mlbIndicators.pickTeamMistakeChaos,
          oppTeamMistakeChaos: mlbIndicators.oppTeamMistakeChaos,
          pickTeamRunClustering: mlbIndicators.pickTeamRunClustering,
          oppTeamRunClustering: mlbIndicators.oppTeamRunClustering,
          pickTeamScorelessFirst3Rate: mlbIndicators.pickTeamScorelessFirst3Rate,
          oppTeamScorelessFirst3Rate: mlbIndicators.oppTeamScorelessFirst3Rate,
          pickLineupConversionIndex: mlbIndicators.pickLineupConversionIndex,
          oppLineupConversionIndex: mlbIndicators.oppLineupConversionIndex,
          pickDeadBatTrafficRate: mlbIndicators.pickDeadBatTrafficRate,
          oppDeadBatTrafficRate: mlbIndicators.oppDeadBatTrafficRate,
          pickTrafficNoConversionRate: mlbIndicators.pickTrafficNoConversionRate,
          oppTrafficNoConversionRate: mlbIndicators.oppTrafficNoConversionRate,
          pickQuietFirst5Rate: mlbIndicators.pickQuietFirst5Rate,
          oppQuietFirst5Rate: mlbIndicators.oppQuietFirst5Rate,
          pickBullpenMistakeChaos: mlbIndicators.pickBullpenMistakeChaos,
          oppBullpenMistakeChaos: mlbIndicators.oppBullpenMistakeChaos,
          pickStateSeriesGameNumber: mlbIndicators.pickStateSeriesGameNumber,
          oppStateSeriesGameNumber: mlbIndicators.oppStateSeriesGameNumber,
          pickStreakDirection: mlbIndicators.pickStreakDirection,
          oppStreakDirection: mlbIndicators.oppStreakDirection,
          pickStreakLength: mlbIndicators.pickStreakLength,
          oppStreakLength: mlbIndicators.oppStreakLength,
          pickRelieverCommandRisk: mlbIndicators.pickRelieverCommandRisk,
          oppRelieverCommandRisk: mlbIndicators.oppRelieverCommandRisk,
          relieverCommandGap: mlbIndicators.relieverCommandGap,
          pickThirdTimePenalty: mlbIndicators.pickThirdTimePenalty,
          oppThirdTimePenalty: mlbIndicators.oppThirdTimePenalty,
          statefulOpponentSnapbackTrapFlag: Boolean(mlbIndicators.statefulOpponentSnapbackTrapFlag),
          statefulHeatRegressionTrapFlag: Boolean(mlbIndicators.statefulHeatRegressionTrapFlag),
          statefulTopOrderPressureTrapFlag: Boolean(mlbIndicators.statefulTopOrderPressureTrapFlag),
          statefulSeriesCarryoverTrapFlag: Boolean(mlbIndicators.statefulSeriesCarryoverTrapFlag),
          statefulSuggestedEdgeHaircut: mlbIndicators.statefulSuggestedEdgeHaircut ?? 0,
          statefulSuggestedConfidenceHaircut: mlbIndicators.statefulSuggestedConfidenceHaircut ?? 0,
          may30QuietStartRiskFlag: Boolean(mlbIndicators.may30QuietStartRiskFlag),
          may30TrafficNoConversionRiskFlag: Boolean(mlbIndicators.may30TrafficNoConversionRiskFlag),
          may30QuietFirst5RiskFlag: Boolean(mlbIndicators.may30QuietFirst5RiskFlag),
          tierThreeBullpenCommandMismatchFlag: Boolean(mlbIndicators.tierThreeBullpenCommandMismatchFlag),
          tierThreeSuggestedEdgeHaircut: mlbIndicators.tierThreeSuggestedEdgeHaircut ?? 0,
          tierThreeSuggestedConfidenceHaircut: mlbIndicators.tierThreeSuggestedConfidenceHaircut ?? 0,
          projectedHitEdgeForPick: mlbIndicators.projectedHitEdgeForPick,
          hitEdgeAgainstPick: mlbIndicators.hitEdgeAgainstPick,
          pickIsMarketFavorite,
          pickIsMarketUnderdog,
          heavyFavoriteWeakLineupFlag: Boolean(researchVetoFlags?.heavyFavoriteWeakLineupFlag),
          heavyFavoriteNoisyBullpenFlag: Boolean(researchVetoFlags?.heavyFavoriteNoisyBullpenFlag),
          deadEarlyRiskFlag: Boolean(researchVetoFlags?.deadEarlyRiskFlag),
          quietStartRiskFlag: Boolean(researchVetoFlags?.quietStartRiskFlag),
          trafficNoConversionRiskFlag: Boolean(researchVetoFlags?.trafficNoConversionRiskFlag),
          quietFirst5RiskFlag: Boolean(researchVetoFlags?.quietFirst5RiskFlag),
          quietFirst3FullGameRiskFlag: Boolean(researchVetoFlags?.quietFirst3FullGameRiskFlag),
          clusterBullpenTrapFlag: Boolean(researchVetoFlags?.clusterBullpenTrapFlag),
          protectedMarketDogFlag: Boolean(researchVetoFlags?.protectedMarketDogFlag),
          marketDogOpponentChaosGapFlag: Boolean(researchVetoFlags?.marketDogOpponentChaosGapFlag),
          researchOnlyVetoFlags: researchVetoFlags?.researchOnlyVetoFlags ?? [],
          researchOnlyVetoFlagCount: researchVetoFlags?.researchOnlyVetoFlagCount ?? 0,
          vetoLayer,
          efficientFavoriteCandidateFlag: Boolean(efficientFavoriteLane?.candidateFlag),
          efficientFavoriteScore: efficientFavoriteLane?.score ?? null,
          efficientFavoriteTier: efficientFavoriteLane?.laneTier ?? null,
          efficientFavoriteReasons: efficientFavoriteLane?.positiveReasons ?? [],
          efficientFavoritePenaltyFlags: efficientFavoriteLane?.penaltyFlags ?? [],
          efficientFavoriteBlockers: efficientFavoriteLane?.blockers ?? [],
          tierOneRiskPoints: tierOneControls?.riskPoints ?? 0,
          tierOnePassFlag: Boolean(tierOneControls?.passFlag),
          tierOneRiskFlags: tierOneControls?.riskFlags ?? [],
          favoredSignalCount,
          starterLateGap: tierOneControls?.starterLateGap ?? null,
          starterLeashGap: tierOneControls?.starterLeashGap ?? null,
          edgeHaircutApplied: tierOneControls?.edgeHaircut ?? 0
        }
      : null,
    mlbProjection: context.mlbProjection ?? null
  }
}

const buildAnalysisModel = (game, participants, hasFullMoneyline) =>
  buildStructuredAnalysisModel(game, participants, hasFullMoneyline) ??
  buildFallbackAnalysisModel(game, participants, hasFullMoneyline)

export const createSportsMatchModel = (game, fallbackOddsProvider = '') => {
  const oddsProvider = game.odds?.provider || fallbackOddsProvider
  const moneylineMarket = getMoneylineMarket(game.odds)
  const parsedMoneylineOdds = parseAmericanOddsPair(moneylineMarket?.value)
  const participantOrder = game.odds?.participantOrder || game.matchup.map((_, index) => index)
  const oddsByParticipantIndex = new Map(
    participantOrder.map((participantIndex, oddsIndex) => [
      participantIndex,
      parsedMoneylineOdds[oddsIndex] ?? null
    ])
  )

  const participants = game.matchup.map((side, index) =>
    buildParticipantModel(game, side, index, oddsByParticipantIndex.get(index) ?? null)
  )

  const moneylineParticipants = participants.filter((participant) =>
    Number.isFinite(participant.americanOdds)
  )
  const analysis = buildAnalysisModel(
    game,
    participants,
    moneylineParticipants.length === game.matchup.length
  )
  const playerProps = buildMlbPlayerProps(game, analysis)

  return {
    ...game,
    odds: {
      ...game.odds,
      provider: oddsProvider
    },
    participants,
    moneyline: {
      available: moneylineParticipants.length === game.matchup.length,
      label: moneylineMarket?.label || 'Moneyline',
      provider: oddsProvider,
      participants: moneylineParticipants
    },
    analysis,
    playerProps,
    metadata: {
      participantCount: participants.length,
      participantNames: participants.map((participant) => participant.name),
      tagCount: game.tags.length,
      hasSeriesBreakdown: Boolean(game.seriesBreakdown),
      hasMoneyline: Boolean(moneylineMarket),
      hasAnalysisPick: Boolean(analysis.participantId),
      hasStructuredInputs: analysis.inputsUsed > 0,
      hasPlayerProps: playerProps.available,
      startMinutes: game.startMinutes,
      spotlight: game.spotlight,
      league: game.league,
      oddsProvider
    }
  }
}

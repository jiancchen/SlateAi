import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { activeMlbAppModelId, resolveMlbAppAdapter } from '../../models/mlb/app-model.js'
import { loadMlbDayGamesFromDb } from '../../models/mlb/db/day-games.mjs'
import { withMlbCausalLedgerContext } from '../../models/mlb/lib/causal-ledger.mjs'
import { withMlbPredictionEligibility } from '../../models/mlb/lib/prediction-eligibility.mjs'
import { parkContextByHomeTeam } from '../../web/src/lib/day-2026-05-13-mlb-data.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')

const importFresh = async (absolutePath) =>
  import(`${pathToFileURL(absolutePath).href}?t=${Date.now()}`)

const importMaybeFresh = async (absolutePath) => {
  try {
    return await importFresh(absolutePath)
  } catch {
    return null
  }
}

const oddsProvider = 'Official MLB data + ScoresAndOdds live board'
const market = (label, book, value) => ({ label, book, value })

const makeBoardOdds = ({ spread = '', total = '', moneyline = '', first5Moneyline = '', first5Total = '', provider = oddsProvider }) => ({
  participantOrder: [0, 1],
  markets: [
    ...(spread ? [market('Spread', provider, spread)] : []),
    ...(total ? [market('Total', provider, total)] : []),
    ...(moneyline ? [market('Moneyline', provider, moneyline)] : []),
    ...(first5Moneyline ? [market('1st 5 ML', provider, first5Moneyline)] : []),
    ...(first5Total ? [market('1st 5 Total', provider, first5Total)] : [])
  ],
  note: 'Board snapshot plus model context.',
  provider
})

const formatPitcherMetric = (value, suffix = '') => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${parsed.toFixed(2)}${suffix}` : `${value || '-'}${suffix}`
}

const numericOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const boolValue = (value) => value === true || value === 'true' || value === 1 || value === '1'

const hasTopRelievers = (profile) => Array.isArray(profile?.topRelievers) && profile.topRelievers.length > 0

const buildRp2BullpenChainContext = (teamName, reliefProjectionContext = null) => {
  if (!reliefProjectionContext) return null

  const candidates = Array.isArray(reliefProjectionContext.candidates)
    ? reliefProjectionContext.candidates
    : []
  const topRelievers = candidates
    .slice(0, 4)
    .map((candidate, index) => {
      const name = candidate?.name || candidate?.pitcherName
      if (!name) return null
      return {
        name,
        pitcherName: name,
        pitcherId: numericOrNull(candidate.pitcherId),
        role: candidate.role || (index === 0 ? 'lead bridge' : 'bridge'),
        throws: candidate.throws || null,
        expectedOuts: numericOrNull(candidate.expectedOuts),
        availabilityScore: numericOrNull(candidate.availabilityScore),
        bridgeScore: numericOrNull(candidate.bridgeScore),
        fatigueScore: numericOrNull(candidate.fatigueScore),
        firstRelieverLikelihood: numericOrNull(candidate.firstRelieverLikelihood),
        workedYesterday: boolValue(candidate.workedYesterday),
        backToBack: boolValue(candidate.backToBack),
        pitchesLast3: numericOrNull(candidate.pitchesLast3),
        pitchesLast6: numericOrNull(candidate.pitchesLast6),
        usedDaysLast3: numericOrNull(candidate.usedDaysLast3),
        usedDaysLast6: numericOrNull(candidate.usedDaysLast6),
        unavailable: boolValue(candidate.unavailable),
        shadowSharePct: numericOrNull(candidate.shadowSharePct),
        source: 'MLB-RP2',
        projectionSource: candidate.source || reliefProjectionContext.sourceMode || 'MLB-RP2',
        identityConfidence: 'low',
        projectionOnly: true
      }
    })
    .filter(Boolean)

  if (!topRelievers.length) return null

  const projectedRuns = numericOrNull(reliefProjectionContext.projectedReliefRunsAllowed)
  const projectedOuts = numericOrNull(reliefProjectionContext.projectedReliefOuts)
  const bridgeStress = numericOrNull(reliefProjectionContext.bridgeStressScore)
  const riskLabel = reliefProjectionContext.runRiskTier
    ? String(reliefProjectionContext.runRiskTier).replace(/_/g, ' ')
    : 'bridge projection'
  const summaryParts = [
    `RP2 ${riskLabel}`,
    Number.isFinite(projectedRuns) ? `${projectedRuns.toFixed(2)} projected relief runs` : null,
    Number.isFinite(projectedOuts) ? `${projectedOuts.toFixed(1)} projected outs` : null,
    Number.isFinite(bridgeStress) ? `bridge stress ${bridgeStress.toFixed(1)}` : null
  ].filter(Boolean)

  return {
    teamName,
    source: 'MLB-RP2',
    chainSource: 'MLB-RP2',
    modelVersion: reliefProjectionContext.modelVersion || null,
    sourceMode: reliefProjectionContext.sourceMode || null,
    projectionOnly: true,
    identityConfidence: 'low',
    topRelievers,
    recentBullpenSummary: null,
    projectedReliefRunsAllowed: projectedRuns,
    projectedReliefOuts: projectedOuts,
    projectedRelieversUsed: numericOrNull(reliefProjectionContext.projectedRelieversUsed),
    bridgeStressScore: bridgeStress,
    leverageAvailabilityScore: numericOrNull(reliefProjectionContext.leverageAvailabilityScore),
    fatigueScore: numericOrNull(reliefProjectionContext.fatigueScore),
    qualityScore: numericOrNull(reliefProjectionContext.qualityScore),
    runRiskTier: reliefProjectionContext.runRiskTier || null,
    topTwoSharePct: numericOrNull(reliefProjectionContext.topTwoSharePct),
    lead: reliefProjectionContext.lead || null,
    reasons: Array.isArray(reliefProjectionContext.reasons) ? reliefProjectionContext.reasons : [],
    summaryLine: summaryParts.join(' | '),
    note: 'RP2 team-side bridge projection; exact first-up reliever identity remains shadow-only.'
  }
}

const resolveBullpenChainContext = ({ raw, side, teamName, bullpenChainByTeam }) => {
  const chainContext = bullpenChainByTeam[teamName] ?? null
  if (hasTopRelievers(chainContext)) return chainContext

  const sideProjection =
    raw.reliefProjectionContext?.[side] ??
    raw[`${side}ReliefProjectionContext`] ??
    null
  return buildRp2BullpenChainContext(teamName, sideProjection)
}

const pitcherDetail = (pitcher) =>
  `${pitcher.fullName} (${pitcher.pitchHand || '?'}HP) | ${pitcher.wins}-${pitcher.losses} | ${pitcher.era} ERA | ${pitcher.strikeOuts} SO | ${formatPitcherMetric(pitcher.whip, ' WHIP')} | ${pitcher.inningsPitched} IP`

const getWindowLabel = (startMinutes = 0) => {
  if (startMinutes < 720) return 'Morning MLB Board'
  if (startMinutes < 900) return 'Afternoon MLB Board'
  return 'Evening MLB Board'
}

const withValidatedMlbPredictionEligibility = (games = [], options = {}) =>
  games.map((game) => withMlbPredictionEligibility(game, {
    requireAddendums: Boolean(options.requireAddendums)
  }))

const invalidPredictionGames = (games = []) =>
  games.filter((game) => !game.predictionEligibility?.eligible)

const summarizeInvalidPredictionGames = (games = []) =>
  games
    .slice(0, 6)
    .map((game) => `${game.id || game.title || 'unknown'}: ${(game.predictionEligibility?.hardFailures || []).join(', ')}`)
    .join('; ')

const buildGenericMlbGame = (
  raw,
  {
    uniqueId = raw.id,
    standingsContextByTeam,
    teamOffenseContextByTeam,
    teamBullpenContextByTeam,
    teamSavantContextByTeam,
    teamStoryContextByTeam,
    bullpenChainByTeam,
    relieverShadowByTeam,
    lineupBoardsByGameId,
    lineupMatchupContextByGameId
  }
) => {
  const slateDate = raw.slateDate ?? raw.metadata?.slateDate ?? null
  const metadata =
    raw.metadata || slateDate
      ? {
          ...(raw.metadata ?? {}),
          ...(slateDate ? { slateDate } : {}),
          modelCartridge: raw.metadata?.modelCartridge ?? activeMlbAppModelId,
          quietStartFullGameGate: Boolean(raw.metadata?.quietStartFullGameGate)
        }
      : null
  const factors = [
    `Current board: ${raw.moneyline} | ${raw.total} | ${raw.spread} | F5 ${raw.first5Moneyline || 'no F5 ML'} / ${raw.first5Total || 'no F5 total'}.`,
    `${raw.awayPitcher.fullName} vs ${raw.homePitcher.fullName}.`
  ]

  return {
    id: uniqueId,
    gamePk: Number.isFinite(Number(raw.gamePk)) ? Number(raw.gamePk) : null,
    ...(slateDate ? { slateDate } : {}),
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
    lean: `Lean on the modeled side, but respect the split between starter phase and late-game hold.`,
    factors,
    swingFactor: 'Swing factor: whether the starter edge survives the bridge innings.',
    teamContext: {
      away: standingsContextByTeam[raw.away] ?? null,
      home: standingsContextByTeam[raw.home] ?? null
    },
    parkContext: raw.parkContext ?? parkContextByHomeTeam[raw.home] ?? null,
    environmentAdjustmentContext: raw.environmentAdjustmentContext ?? null,
    ficDailyMatchupContext: raw.ficDailyMatchupContext ?? null,
    offenseContext: {
      away: teamOffenseContextByTeam[raw.away] ?? null,
      home: teamOffenseContextByTeam[raw.home] ?? null
    },
    bullpenContext: {
      away: teamBullpenContextByTeam[raw.away] ?? null,
      home: teamBullpenContextByTeam[raw.home] ?? null
    },
    bullpenChainContext: {
      away: resolveBullpenChainContext({ raw, side: 'away', teamName: raw.away, bullpenChainByTeam }),
      home: resolveBullpenChainContext({ raw, side: 'home', teamName: raw.home, bullpenChainByTeam })
    },
    relieverShadowContext: {
      away: relieverShadowByTeam[raw.away] ?? null,
      home: relieverShadowByTeam[raw.home] ?? null
    },
    reliefProjectionContext: raw.reliefProjectionContext ?? null,
    savantContext: {
      away: teamSavantContextByTeam[raw.away] ?? null,
      home: teamSavantContextByTeam[raw.home] ?? null
    },
    storyContext: {
      away: teamStoryContextByTeam[raw.away] ?? null,
      home: teamStoryContextByTeam[raw.home] ?? null
    },
    tierTwoContext: raw.tierTwoContext ?? null,
    tierThreeContext: raw.tierThreeContext ?? null,
    stateContext: raw.stateContext ?? null,
    lineupContext: lineupMatchupContextByGameId[raw.id] ?? null,
    lineupBoard: lineupBoardsByGameId[raw.id] ?? null,
    starterContext: { away: raw.awayPitcher, home: raw.homePitcher },
    pitcherSourceNote: raw.pitcherSourceNote || '',
    ...(metadata ? { metadata } : {}),
    odds: makeBoardOdds({
      spread: raw.spread,
      total: raw.total,
      moneyline: raw.moneyline,
      first5Moneyline: raw.first5Moneyline,
      first5Total: raw.first5Total,
      provider: raw.oddsProvider || oddsProvider
    })
  }
}

export const loadMlbDayGames = async (date) => {
  if (process.env.MLB_DAY_GAMES_DISABLE_DB !== '1') {
    try {
      const dbGames = await loadMlbDayGamesFromDb(date)
      if (dbGames.length) {
        const validatedDbGames = withValidatedMlbPredictionEligibility(dbGames, { requireAddendums: true })
        const invalidDbGames = invalidPredictionGames(validatedDbGames)
        if (!invalidDbGames.length) return validatedDbGames
        const detail = summarizeInvalidPredictionGames(invalidDbGames)
        if (process.env.MLB_DAY_GAMES_STRICT_DB === '1') {
          throw new Error(`DB MLB day games failed prediction eligibility for ${date}: ${detail}`)
        }
        console.warn(`[loadMlbDayGames] DB input failed prediction eligibility for ${date}; falling back to generated files: ${detail}`)
      }
    } catch (error) {
      if (process.env.MLB_DAY_GAMES_STRICT_DB === '1') {
        throw error
      }
      console.warn(`[loadMlbDayGames] DB input unavailable for ${date}; falling back to legacy generated files: ${error.message}`)
    }
  }

  const splitDataModulePath = path.join(rootDir, 'web', 'src', 'lib', `day-${date}-data.js`)
  if (fs.existsSync(splitDataModulePath)) {
    const dataModule = await importFresh(splitDataModulePath)
    const contextModule = await importFresh(path.join(rootDir, 'web', 'src', 'lib', `mlb-context-${date}.js`))
    const lineupModule = await importFresh(path.join(rootDir, 'web', 'src', 'lib', `day-${date}-lineups.js`))
    const relieverShadowModule =
      (await importMaybeFresh(path.join(rootDir, 'web', 'src', 'lib', `day-${date}-reliever-shadow.js`))) ?? {}
    const storyModule =
      (await importMaybeFresh(path.join(rootDir, 'web', 'src', 'lib', `mlb-story-context-${date}.js`))) ?? {}

    const rawGames = dataModule.rawGames ?? []
    const dependencies = {
      standingsContextByTeam: contextModule.standingsContextByTeam ?? {},
      teamOffenseContextByTeam: contextModule.teamOffenseContextByTeam ?? {},
      teamBullpenContextByTeam: contextModule.teamBullpenContextByTeam ?? {},
      teamSavantContextByTeam: contextModule.teamSavantContextByTeam ?? {},
      teamStoryContextByTeam: storyModule.teamStoryContextByTeam ?? {},
      bullpenChainByTeam: dataModule.bullpenChainByTeam ?? {},
      relieverShadowByTeam: relieverShadowModule.relieverShadowByTeam ?? {},
      lineupBoardsByGameId: lineupModule.lineupBoardsByGameId ?? {},
      lineupMatchupContextByGameId: lineupModule.lineupMatchupContextByGameId ?? {}
    }

    const rawIdCounts = new Map()
    return rawGames.map((raw) => {
      const baseId = raw.id
      const seenCount = rawIdCounts.get(baseId) ?? 0
      rawIdCounts.set(baseId, seenCount + 1)
      const uniqueId =
        seenCount > 0 && Number.isFinite(Number(raw.gamePk))
          ? `${baseId}-${Number(raw.gamePk)}`
          : seenCount > 0
            ? `${baseId}-g${seenCount + 1}`
            : baseId
      const game = buildGenericMlbGame(raw, { ...dependencies, uniqueId })
      const adapter = resolveMlbAppAdapter(game.metadata?.modelCartridge)
      return withMlbPredictionEligibility(
        withMlbCausalLedgerContext(adapter.createSportsMatchModel(game, oddsProvider)),
        { requireAddendums: true }
      )
    })
  }

  const dayWrapperPath = path.join(rootDir, 'web', 'src', 'lib', `day-${date}.js`)
  const wrappedDay = await importMaybeFresh(dayWrapperPath)
  if (wrappedDay?.games) {
    const wrappedMlbGames = wrappedDay.games.filter((game) => game.league === 'MLB')
    if (wrappedMlbGames.length) return withValidatedMlbPredictionEligibility(wrappedMlbGames, { requireAddendums: true })
  }

  return []
}

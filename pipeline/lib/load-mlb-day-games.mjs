import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { createSportsMatchModel } from '../../models/mlb/cartridges/MLB-M0/lib/sports-model.js'
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

const makeBoardOdds = ({ spread = '', total = '', moneyline = '', provider = oddsProvider }) => ({
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
          modelCartridge: raw.metadata?.modelCartridge ?? 'MLB-M0',
          quietStartFullGameGate: Boolean(raw.metadata?.quietStartFullGameGate)
        }
      : null
  const factors = [
    `Current board: ${raw.moneyline} | ${raw.total} | ${raw.spread}.`,
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
    relieverShadowContext: {
      away: relieverShadowByTeam[raw.away] ?? null,
      home: relieverShadowByTeam[raw.home] ?? null
    },
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
      provider: oddsProvider
    })
  }
}

export const loadMlbDayGames = async (date) => {
  const dayWrapperPath = path.join(rootDir, 'web', 'src', 'lib', `day-${date}.js`)
  const wrappedDay = await importMaybeFresh(dayWrapperPath)
  if (wrappedDay?.games) {
    const wrappedMlbGames = wrappedDay.games.filter((game) => game.league === 'MLB')
    if (wrappedMlbGames.length) return wrappedMlbGames
  }

  const splitDataModulePath = path.join(rootDir, 'web', 'src', 'lib', `day-${date}-data.js`)
  if (!fs.existsSync(splitDataModulePath)) {
    return []
  }
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
    return createSportsMatchModel(buildGenericMlbGame(raw, { ...dependencies, uniqueId }), oddsProvider)
  })
}

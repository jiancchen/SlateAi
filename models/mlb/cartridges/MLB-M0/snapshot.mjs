import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'

const rootDir = path.resolve(import.meta.dirname, '..', '..', '..', '..')
const snapshotSchema = 1

const readJson = async (relativePath, fallback = null) => {
  try {
    return JSON.parse(await fs.readFile(path.resolve(rootDir, relativePath), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

const writeJson = async (relativePath, payload) => {
  const absolute = path.resolve(rootDir, relativePath)
  await fs.mkdir(path.dirname(absolute), { recursive: true })
  await fs.writeFile(absolute, `${JSON.stringify(payload, null, 2)}\n`)
}

const stableJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

const sha256Text = (text) => crypto.createHash('sha256').update(text).digest('hex')

const round = (value) => {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Number(numeric.toFixed(4)) : value
}

const compactParticipant = (participant = {}) => ({
  role: participant.role ?? null,
  name: participant.name ?? null,
  americanOdds: round(participant.americanOdds),
  impliedProbability: round(participant.impliedProbability)
})

const compactReliever = (reliever = {}) => ({
  pitcherId: reliever.pitcherId ?? null,
  name: reliever.name ?? null,
  role: reliever.role ?? null,
  shadowSharePct: round(reliever.shadowSharePct),
  firstRelieverLikelihood: round(reliever.firstRelieverLikelihood),
  availabilityScore: round(reliever.availabilityScore),
  bridgeScore: round(reliever.bridgeScore),
  expectedOuts: round(reliever.expectedOuts),
  reasonTags: reliever.reasonTags ?? []
})

const compactRelieverTeam = (entry = null) => {
  if (!entry) return null
  return {
    teamName: entry.teamName ?? null,
    modelTag: entry.modelTag ?? null,
    starterHookRiskPct: round(entry.starterHookRiskPct),
    topTwoSharePct: round(entry.topTwoSharePct),
    remainingTop3AvailabilityAvg: round(entry.remainingTop3AvailabilityAvg),
    remainingTop3BridgeScoreAvg: round(entry.remainingTop3BridgeScoreAvg),
    remainingTop3ExpectedOutsAvg: round(entry.remainingTop3ExpectedOutsAvg),
    lead: compactReliever((entry.relievers || [])[0] || {}),
    alternate: compactReliever((entry.relievers || [])[1] || {}),
    top3: (entry.relievers || []).slice(0, 3).map(compactReliever),
    summaryLine: entry.summaryLine ?? null
  }
}

const compactLineupTeamContext = (entry = null) => {
  if (!entry) return null
  return {
    averageMatchupGrade: round(entry.averageMatchupGrade),
    trackedBatters: entry.trackedBatters ?? null,
    starterThreatCount: entry.starterThreatCount ?? null,
    contactCount: entry.contactCount ?? null,
    powerCount: entry.powerCount ?? null,
    platoonCount: entry.platoonCount ?? null,
    pitchTypeEdgeCount: entry.pitchTypeEdgeCount ?? null,
    starterPressureIndex: round(entry.starterPressureIndex),
    overallPressureIndex: round(entry.overallPressureIndex),
    topThirdScore: round(entry.topThirdScore),
    depthScore: round(entry.depthScore)
  }
}

const compactTeamState = (entry = null) => {
  if (!entry) return null
  return {
    previousResult: entry.previousResult ?? null,
    streakDirection: entry.streakDirection ?? null,
    streakLength: entry.streakLength ?? null,
    winPctLast5: round(entry.winPctLast5),
    runDiffLast5: round(entry.runDiffLast5),
    bullpenFlipLossCountLast5: entry.bullpenFlipLossCountLast5 ?? null,
    snapbackPressureIndex: round(entry.snapbackPressureIndex),
    heatRegressionIndex: round(entry.heatRegressionIndex),
    formPressureIndex: round(entry.formPressureIndex)
  }
}

const compactGame = (game = {}) => ({
  id: game.id ?? null,
  gamePk: game.gamePk ?? null,
  title: game.title ?? null,
  start: game.start ?? null,
  startMinutes: game.startMinutes ?? null,
  stage: game.stage ?? null,
  tags: game.tags ?? [],
  pick: game.analysis?.participant?.name ?? null,
  opponent: game.analysis?.opponent?.name ?? null,
  confidence: round(game.analysis?.confidence),
  volatility: round(game.analysis?.volatility),
  recommendationScore: round(game.analysis?.recommendationScore),
  tier: game.analysis?.tier ?? null,
  lean: game.analysis?.lean ?? null,
  rationale: game.analysis?.rationale ?? null,
  modelDesignation: game.analysis?.modelDesignation ?? null,
  modelEdge: round(game.analysis?.modelEdge),
  marketProbability: round(game.analysis?.marketProbability),
  participants: (game.participants || []).map(compactParticipant),
  oddsMarkets: (game.odds?.markets || []).map((market) => ({
    label: market.label ?? null,
    value: market.value ?? null
  })),
  relieverShadowContext: {
    away: compactRelieverTeam(game.relieverShadowContext?.away),
    home: compactRelieverTeam(game.relieverShadowContext?.home)
  },
  lineupContext: Object.fromEntries(
    Object.entries(game.lineupContext || {}).map(([team, context]) => [team, compactLineupTeamContext(context)])
  ),
  teamState: {
    away: compactTeamState(game.stateContext?.teamState?.away),
    home: compactTeamState(game.stateContext?.teamState?.home)
  }
})

const compactSidePick = (pick = {}) => ({
  gameId: pick.gameId ?? null,
  gameTitle: pick.gameTitle ?? null,
  predictedTeam: pick.predictedTeam ?? null,
  predictedSide: pick.predictedSide ?? null,
  confidence: round(pick.confidence),
  modelEdge: round(pick.modelEdge),
  marketProbability: round(pick.marketProbability),
  pickIsMarketFavorite: Boolean(pick.pickIsMarketFavorite),
  pickIsMarketUnderdog: Boolean(pick.pickIsMarketUnderdog),
  vetoCount: pick.vetoCount ?? 0,
  recommendedAction: pick.recommendedAction ?? null,
  keyMetrics: pick.keyMetrics ?? {}
})

const compactPropPick = (pick = {}) => ({
  rank: pick.rank ?? null,
  id: pick.id ?? null,
  gameId: pick.gameId ?? null,
  gameTitle: pick.gameTitle ?? null,
  playerId: pick.playerId ?? null,
  playerName: pick.playerName ?? null,
  teamName: pick.teamName ?? null,
  propType: pick.propType ?? null,
  marketLabel: pick.marketLabel ?? null,
  lineThreshold: round(pick.lineThreshold),
  confidence: round(pick.confidence),
  probability: round(pick.probability),
  expectedValue: round(pick.expectedValue),
  recommendationTier: pick.recommendationTier ?? null,
  shadowSupportTag: pick.shadowSupportTag ?? null,
  reason: pick.reason ?? null
})

const compactHomeRunPick = (pick = {}) => ({
  rank: pick.rank ?? null,
  playerId: pick.playerId ?? null,
  playerName: pick.playerName ?? null,
  teamName: pick.teamName ?? null,
  gameTitle: pick.gameTitle ?? null,
  opposingPitcher: pick.opposingPitcher ?? null,
  opposingPitcherHand: pick.opposingPitcherHand ?? null,
  parkHrIndex: round(pick.parkHrIndex),
  seasonHr: pick.seasonHr ?? null,
  seasonXHR: round(pick.seasonXHR),
  baseScore: round(pick.baseScore),
  lineupPriority: round(pick.lineupPriority),
  weatherBoost: round(pick.weatherBoost),
  recentHrSinceMay1: pick.recentHrSinceMay1 ?? null,
  daysSinceLastHr: pick.daysSinceLastHr ?? null
})

const compactLineupBoard = (lineupBoard = {}) => ({
  meta: {
    date: lineupBoard.meta?.date ?? null,
    gameCount: lineupBoard.meta?.gameCount ?? null,
    playerCount: lineupBoard.meta?.playerCount ?? null,
    sourceLabel: lineupBoard.meta?.sourceLabel ?? null
  },
  games: Object.fromEntries(
    Object.entries(lineupBoard.lineupBoardsByGameId || {}).map(([gameId, board]) => [gameId, {
      status: board.status ?? null,
      awayTeam: board.away?.teamName ?? null,
      homeTeam: board.home?.teamName ?? null,
      awaySlots: (board.away?.lineup || []).map((player) => ({
        slot: player.slot,
        name: player.name,
        bats: player.bats,
        position: player.position
      })),
      homeSlots: (board.home?.lineup || []).map((player) => ({
        slot: player.slot,
        name: player.name,
        bats: player.bats,
        position: player.position
      }))
    }])
  )
})

export const buildM0Snapshot = async ({ date }) => {
  const summary = await readJson(`published-data/slates/${date}/summary.json`, {})
  const gamesDir = path.resolve(rootDir, `published-data/slates/${date}/games`)
  const gameFiles = (await fs.readdir(gamesDir))
    .filter((fileName) => fileName.endsWith('.json') && !fileName.startsWith('rg-'))
    .sort()
  const games = await Promise.all(gameFiles.map(async (fileName) => compactGame(
    await readJson(`published-data/slates/${date}/games/${fileName}`, {})
  )))
  const sides = await readJson(`data-private/predictions/mlb-sides/${date}-veto-artifact.json`, {})
  const props = await readJson(`data-private/predictions/mlb-player-props/${date}-player-props.json`, {})
  const homeRuns = await readJson(`data-private/predictions/mlb-home-runs/${date}-statcast-prototype.json`, {})
  const relieverShadow = await readJson(`data-private/predictions/mlb-reliever-shadow/${date}-reliever-shadow.json`, {})
  const lineupBoard = await readJson(`data-private/lineups/mlb/${date}-lineup-board.json`, {})

  const artifactSummary = {
    publicSummaryGames: (summary.games || []).filter((game) => game.league === 'MLB').length,
    gameFiles: gameFiles.length,
    sidePicks: (sides.picks || []).length,
    propPicks: (props.picks || []).length,
    homeRunPicks: (homeRuns.picks || []).length,
    relieverTeams: Object.keys(relieverShadow.relieverShadowByTeam || {}).length,
    lineupGames: Object.keys(lineupBoard.lineupBoardsByGameId || {}).length
  }

  const payload = {
    schemaVersion: snapshotSchema,
    sport: 'mlb',
    modelId: 'MLB-M0',
    date,
    status: 'golden-target',
    artifactSummary,
    games,
    sidePicks: (sides.picks || []).map(compactSidePick),
    props: {
      modelName: props.modelName ?? null,
      summary: props.summary ?? null,
      picks: (props.picks || []).map(compactPropPick)
    },
    homeRuns: {
      modelName: homeRuns.modelName ?? null,
      picks: (homeRuns.picks || []).map(compactHomeRunPick)
    },
    relieverShadow: {
      meta: relieverShadow.meta ?? null,
      teams: Object.fromEntries(
        Object.entries(relieverShadow.relieverShadowByTeam || {})
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([team, entry]) => [team, compactRelieverTeam(entry)])
      )
    },
    lineupBoard: compactLineupBoard(lineupBoard)
  }

  return {
    ...payload,
    snapshotHash: sha256Text(stableJson(payload))
  }
}

export const snapshotPath = ({ date }) => `data-private/model-cartridges/mlb/MLB-M0/golden/${date}.snapshot.json`

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = { date: '', update: false }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = args[index + 1]
      index += 1
    } else if (arg === '--update') {
      options.update = true
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('Pass --date YYYY-MM-DD')
  return options
}

const executedUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null

if (import.meta.url === executedUrl) {
  const options = parseArgs()
  const snapshot = await buildM0Snapshot(options)
  if (options.update) {
    await writeJson(snapshotPath(options), snapshot)
    console.log(`Updated ${snapshotPath(options)}`)
  } else {
    console.log(JSON.stringify({
      date: options.date,
      snapshotHash: snapshot.snapshotHash,
      artifactSummary: snapshot.artifactSummary
    }, null, 2))
  }
}

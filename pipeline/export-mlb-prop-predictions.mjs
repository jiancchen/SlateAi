import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { rankMlbPlayerProps, rankMlbPlayerPropCandidatesLegacy } from '../web/src/lib/sports-model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const fullTeamNames = {
  Braves: 'Atlanta Braves',
  Orioles: 'Baltimore Orioles',
  'Red Sox': 'Boston Red Sox',
  Cubs: 'Chicago Cubs',
  Reds: 'Cincinnati Reds',
  Guardians: 'Cleveland Guardians',
  Rockies: 'Colorado Rockies',
  'White Sox': 'Chicago White Sox',
  Tigers: 'Detroit Tigers',
  Astros: 'Houston Astros',
  Royals: 'Kansas City Royals',
  Angels: 'Los Angeles Angels',
  Dodgers: 'Los Angeles Dodgers',
  Marlins: 'Miami Marlins',
  Brewers: 'Milwaukee Brewers',
  Twins: 'Minnesota Twins',
  Mets: 'New York Mets',
  Yankees: 'New York Yankees',
  Athletics: 'Athletics',
  Phillies: 'Philadelphia Phillies',
  Pirates: 'Pittsburgh Pirates',
  Padres: 'San Diego Padres',
  Mariners: 'Seattle Mariners',
  Giants: 'San Francisco Giants',
  Cardinals: 'St. Louis Cardinals',
  Rays: 'Tampa Bay Rays',
  Rangers: 'Texas Rangers',
  'Blue Jays': 'Toronto Blue Jays',
  Nationals: 'Washington Nationals',
  'D-backs': 'Arizona Diamondbacks',
  Diamondbacks: 'Arizona Diamondbacks'
}

const propThresholdByType = {
  rbi: 0.5,
  totalBases: 1.5,
  hits: 1.5,
  walks: 0.5,
  singles: 0.5
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: null,
    out: null,
    legacyOut: null
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') options.date = args[++index]
    else if (arg === '--out') options.out = args[++index]
    else if (arg === '--legacy-out') options.legacyOut = args[++index]
  }

  if (!options.date) {
    throw new Error('Missing required --date argument, expected YYYY-MM-DD.')
  }

  options.out ||= path.join(
    rootDir,
    'data-private',
    'predictions',
    'mlb-player-props',
    `${options.date}-player-props.json`
  )
  options.legacyOut ||= path.join(
    rootDir,
    'data-private',
    'predictions',
    'mlb-player-props-legacy',
    `${options.date}-player-props-legacy.json`
  )

  return options
}

const loadDayGames = async (date) => {
  const modulePath = path.join(rootDir, 'web', 'src', 'lib', `day-${date}.js`)
  const dayModule = await import(pathToFileURL(modulePath).href)
  return dayModule.games?.filter((game) => game.league === 'MLB') ?? []
}

const fullNameForTeam = (name = '') => fullTeamNames[name] || name

const thresholdForProp = (propType, marketLabel = '') => {
  if (Number.isFinite(propThresholdByType[propType])) return propThresholdByType[propType]
  const match = marketLabel.match(/Over\s+([0-9.]+)/i)
  return match ? Number(match[1]) : null
}

const serializePropPick = (target) => {
  const awayTeam = target.game?.matchup?.[0]?.name || ''
  const homeTeam = target.game?.matchup?.[1]?.name || ''
  const awayTeamFull = fullNameForTeam(awayTeam)
  const homeTeamFull = fullNameForTeam(homeTeam)
  const teamNameFull = fullNameForTeam(target.teamName)
  const opponentName = target.teamName === awayTeam ? homeTeam : awayTeam
  const opponentNameFull = fullNameForTeam(opponentName)
  const lineThreshold = thresholdForProp(target.propType, target.marketLabel)

  return {
    rank: target.rank,
    id: target.id,
    gameId: target.gameId,
    gameTitle: target.gameTitle,
    start: target.game?.start || '',
    stage: target.game?.stage || '',
    awayTeam,
    homeTeam,
    awayTeamFull,
    homeTeamFull,
    playerId: target.playerId,
    playerName: target.playerName,
    teamName: target.teamName,
    teamNameFull,
    opponentName,
    opponentNameFull,
    slot: target.slot,
    propType: target.propType,
    propLabel: target.propLabel,
    marketLabel: target.marketLabel,
    lineThreshold,
    confidence: target.confidence,
    probability: target.probability,
    expectedValue: target.expectedValue,
    statValueLabel: target.statValueLabel,
    recommendationTier: target.recommendationTier,
    reason: target.reason,
    matchupNote: target.matchupNote,
    teamScriptLabel: target.teamScriptLabel,
    lineupStatus: target.lineupStatus,
    playerSummary: target.playerSummary
  }
}

const summarizeByType = (picks) =>
  picks.reduce((summary, pick) => {
    summary[pick.propType] = (summary[pick.propType] || 0) + 1
    return summary
  }, {})

const main = async () => {
  const { date, out, legacyOut } = parseArgs()
  const games = await loadDayGames(date)
  const rankedProps = rankMlbPlayerProps(games)
    .filter((target) => target.propType !== 'homeRun')
    .map(serializePropPick)
  const legacyProps = rankMlbPlayerPropCandidatesLegacy(games)
    .filter((target) => target.propType !== 'homeRun')
    .map(serializePropPick)

  const payload = {
    modelName: 'mlb-player-props-v2',
    date,
    generatedAt: new Date().toISOString(),
    sources: ['day-file-live-board', 'web/src/lib/sports-model.js'],
    summary: {
      totalGames: games.length,
      totalPicks: rankedProps.length,
      byType: summarizeByType(rankedProps)
    },
    picks: rankedProps
  }

  const legacyPayload = {
    modelName: 'mlb-player-props-v1-legacy',
    date,
    generatedAt: payload.generatedAt,
    sources: payload.sources,
    summary: {
      totalGames: games.length,
      totalPicks: legacyProps.length,
      byType: summarizeByType(legacyProps)
    },
    picks: legacyProps
  }

  await mkdir(path.dirname(out), { recursive: true })
  await mkdir(path.dirname(legacyOut), { recursive: true })
  await writeFile(out, JSON.stringify(payload, null, 2), 'utf8')
  await writeFile(legacyOut, JSON.stringify(legacyPayload, null, 2), 'utf8')
  console.log(`Saved ${rankedProps.length} tracked player props to ${out}`)
  console.log(`Saved ${legacyProps.length} legacy player props to ${legacyOut}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

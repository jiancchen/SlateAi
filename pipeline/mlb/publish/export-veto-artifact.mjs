import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadMlbDayGames } from '../../lib/load-mlb-day-games.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..')

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: null,
    out: null
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') options.date = args[++index]
    else if (arg === '--out') options.out = args[++index]
  }

  if (!options.date) {
    throw new Error('Missing required --date argument, expected YYYY-MM-DD.')
  }

  options.out ||= path.join(
    rootDir,
    'data-private',
    'predictions',
    'mlb-sides',
    `${options.date}-veto-artifact.json`
  )

  return options
}

const buildRecommendedAction = ({ vetoCount = 0, protectedMarketDogFlag = false }) => {
  if (protectedMarketDogFlag && vetoCount === 0) return 'Protected dog'
  if (vetoCount >= 2) return 'Hard pass'
  if (vetoCount === 1) return 'Pass'
  return 'Eligible'
}

const buildEntry = (game, date) => {
  const analysis = game.analysis ?? {}
  const indicators = analysis.indicators ?? {}
  const predictedTeam = analysis.participant?.name ?? null
  const predictedSide =
    predictedTeam === game.participants?.[0]?.name
      ? 'away'
      : predictedTeam === game.participants?.[1]?.name
        ? 'home'
        : null
  const vetoReasons = Array.isArray(indicators.researchOnlyVetoFlags)
    ? indicators.researchOnlyVetoFlags
    : []
  const protectedMarketDogFlag = Boolean(
    indicators.protectedMarketDogFlag ?? indicators.marketDogOpponentChaosGapFlag
  )

  return {
    predictionDate: date,
    gameId: game.id,
    gameTitle: game.title,
    predictedTeam,
    predictedSide,
    confidence: analysis.confidence ?? null,
    modelEdge: analysis.modelEdge ?? null,
    marketProbability: analysis.marketProbability ?? null,
    marketProbabilityLabel: analysis.marketProbabilityLabel ?? null,
    pickIsMarketFavorite: Boolean(analysis.participant && indicators.pickIsMarketFavorite),
    pickIsMarketUnderdog: Boolean(analysis.participant && indicators.pickIsMarketUnderdog),
    vetoCount: vetoReasons.length,
    vetoReasons,
    protectedMarketDogFlag,
    recommendedAction: buildRecommendedAction({
      vetoCount: vetoReasons.length,
      protectedMarketDogFlag
    }),
    keyMetrics: {
      pickLineupConversionIndex: indicators.pickLineupConversionIndex ?? null,
      pickDeadBatTrafficRate: indicators.pickDeadBatTrafficRate ?? null,
      pickTrafficNoConversionRate: indicators.pickTrafficNoConversionRate ?? null,
      pickBullpenMistakeChaos: indicators.pickBullpenMistakeChaos ?? null,
      oppBullpenMistakeChaos: indicators.oppBullpenMistakeChaos ?? null,
      pickTeamRunClustering: indicators.pickTeamRunClustering ?? null,
      pickTeamMistakeChaos: indicators.pickTeamMistakeChaos ?? null,
      oppTeamMistakeChaos: indicators.oppTeamMistakeChaos ?? null
    }
  }
}

const main = async () => {
  const options = parseArgs()
  const slateGames = await loadMlbDayGames(options.date)
  const picks = slateGames
    .filter((game) => game.league === 'MLB' && game.analysis?.participant?.name)
    .map((game) => buildEntry(game, options.date))

  const payload = {
    generatedAt: new Date().toISOString(),
    predictionDate: options.date,
    picks
  }

  await mkdir(path.dirname(options.out), { recursive: true })
  await writeFile(options.out, JSON.stringify(payload, null, 2))
  console.log(`Saved ${picks.length} MLB veto artifact rows to ${options.out}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

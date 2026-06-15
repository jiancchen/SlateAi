import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'

import { buildMlbPredictionEligibility } from '../models/mlb/lib/prediction-eligibility.mjs'

const root = path.resolve(import.meta.dirname, '..')
const currentRoot = path.join(root, 'web', 'public', 'data', 'current')
const reportsRoot = path.join(root, 'data-migration', 'reports')

const argValue = (name, fallback = '') => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const localPath = (relativePath) => path.join(currentRoot, relativePath.replace(/^\/?data\/current\/?/, ''))

const fetchJson = async (baseUrl, relativePath) => {
  if (!baseUrl) {
    return JSON.parse(await fs.readFile(localPath(relativePath), 'utf8'))
  }
  const url = new URL(relativePath.replace(/^\//, ''), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`)
  return response.json()
}

const isFiniteNumber = (value) => Number.isFinite(Number(value))
const array = (value) => (Array.isArray(value) ? value : [])
const playerHasSummary = (player) => String(player?.summary || '').trim().length >= 40
const playerHasSavant = (player) => Boolean(player?.savant?.playerUrl || player?.savant?.statsUrls?.statcast)
const playerHasGrade = (player) => isFiniteNumber(player?.metrics?.matchupGrade)
const playerHasSplit = (player) => isFiniteNumber(player?.split?.ops) || isFiniteNumber(player?.split?.plateAppearances)
const playerHasPitchFit = (player) => String(player?.pitchType?.summary || '').trim().length > 0
const playerHasXwobaBubble = (player) =>
  isFiniteNumber(player?.statcastTrend?.rolling7Xwoba) && isFiniteNumber(player?.statcastTrend?.rolling30Xwoba)

const starterSplitStatus = (starter) => {
  const status = starter?.espnSplits?.sourceStatus
  if (status === 'fetched' || status === 'missing-espn-athlete') return status
  return ''
}

const projectionHasFirstFive = (projection = {}) => {
  const totals = projection.totals || {}
  return (
    isFiniteNumber(totals.derivedFirst5TotalLine) ||
    isFiniteNumber(totals.first5ProjectedRuns) ||
    isFiniteNumber(projection.first5?.projectedRuns)
  )
}

const projectionHasPushContext = (projection = {}) => {
  const totals = projection.totals || {}
  return (
    isFiniteNumber(projection.first5Moneyline?.pushProbability) ||
    isFiniteNumber(projection.first5Moneyline?.pushPct) ||
    isFiniteNumber(totals.first5PushProbability) ||
    isFiniteNumber(totals.first5PushProb) ||
    isFiniteNumber(projection.first5?.pushProbability)
  )
}

const oddsMarketValue = (game, pattern) =>
  array(game?.odds?.markets).find((market) => pattern.test(String(market?.label || '')) && String(market?.value || '').trim())

const hasDraftKingsBoard = (game) =>
  /draftkings/i.test([game?.odds?.provider, ...array(game?.odds?.markets).map((market) => market?.book)].filter(Boolean).join(' '))

const hasDraftKingsFullGameLines = (game) =>
  hasDraftKingsBoard(game) &&
  Boolean(oddsMarketValue(game, /^Moneyline$/i)) &&
  Boolean(oddsMarketValue(game, /^Total$/i))

const hasDraftKingsFirstFiveLines = (game) =>
  hasDraftKingsBoard(game) &&
  Boolean(oddsMarketValue(game, /(?:1st|first)\s*5\s*ML/i)) &&
  Boolean(oddsMarketValue(game, /(?:1st|first)\s*5\s*Total/i))

const summarizeGame = (game) => {
  const awayLineup = array(game?.lineupBoard?.away?.lineup)
  const homeLineup = array(game?.lineupBoard?.home?.lineup)
  const players = [...awayLineup, ...homeLineup]
  const projection = game?.analysis?.mlbProjection || {}
  const starterStatuses = [
    starterSplitStatus(game?.starterContext?.away),
    starterSplitStatus(game?.starterContext?.home)
  ]
  const predictionEligibility = buildMlbPredictionEligibility(game, { requireAddendums: true })

  return {
    id: game?.id,
    title: game?.title,
    players: players.length,
    awayPlayers: awayLineup.length,
    homePlayers: homeLineup.length,
    summaries: players.filter(playerHasSummary).length,
    savantLinks: players.filter(playerHasSavant).length,
    matchupGrades: players.filter(playerHasGrade).length,
    splitRows: players.filter(playerHasSplit).length,
    pitchFits: players.filter(playerHasPitchFit).length,
    xwobaBubbles: players.filter(playerHasXwobaBubble).length,
    starterSplitStatuses: starterStatuses,
    hasBridgeChain: Boolean(game?.bullpenChainContext?.away && game?.bullpenChainContext?.home),
    hasRelieverShadow: Boolean(game?.relieverShadowContext?.away && game?.relieverShadowContext?.home),
    hasParkContext: Boolean(game?.parkContext?.venueName),
    hasFirstFive: projectionHasFirstFive(projection),
    hasFirstFivePush: projectionHasPushContext(projection),
    hasDraftKingsBoard: hasDraftKingsBoard(game),
    hasDraftKingsFullGameLines: hasDraftKingsFullGameLines(game),
    hasDraftKingsFirstFiveLines: hasDraftKingsFirstFiveLines(game),
    first5TotalLineSource: projection?.totals?.first5TotalLineSource || '',
    hasMoneylineShape: Boolean(projection?.moneylineShape),
    hasFirstInning: Boolean(projection?.firstInning),
    predictionEligibility
  }
}

const hardFailuresForGame = (gameReport) => {
  const failures = []
  if (gameReport.predictionEligibility && !gameReport.predictionEligibility.eligible) {
    failures.push(...gameReport.predictionEligibility.hardFailures.map((failure) => `prediction-eligibility:${failure}`))
  }
  if (gameReport.awayPlayers < 9 || gameReport.homePlayers < 9) failures.push('lineup-below-9-per-side')
  if (gameReport.summaries < 16) failures.push('missing-batter-summaries')
  if (gameReport.savantLinks < 16) failures.push('missing-savant-links')
  if (gameReport.matchupGrades < 16) failures.push('missing-matchup-grades')
  if (gameReport.splitRows < 14) failures.push('missing-batter-splits')
  if (gameReport.pitchFits < 16) failures.push('missing-pitch-fit')
  if (gameReport.xwobaBubbles < 14) failures.push('missing-batter-xwoba-bubbles')
  if (!gameReport.hasBridgeChain) failures.push('missing-bridge-chain')
  if (!gameReport.hasRelieverShadow) failures.push('missing-rp36-shadow')
  if (!gameReport.hasParkContext) failures.push('missing-park-context')
  if (!gameReport.hasFirstFive) failures.push('missing-first-five-context')
  if (!gameReport.hasFirstFivePush) failures.push('missing-first-five-push-context')
  if (gameReport.hasDraftKingsBoard && !gameReport.hasDraftKingsFullGameLines) failures.push('missing-draftkings-full-game-lines')
  if (gameReport.hasDraftKingsBoard && !gameReport.hasDraftKingsFirstFiveLines) failures.push('missing-draftkings-first-five-lines')
  if (gameReport.hasDraftKingsBoard && gameReport.first5TotalLineSource !== 'posted') failures.push('first-five-total-not-posted-market-line')
  if (!gameReport.hasMoneylineShape) failures.push('missing-moneyline-shape')
  if (!gameReport.hasFirstInning) failures.push('missing-first-inning-context')
  if (gameReport.starterSplitStatuses.some((status) => !status)) failures.push('missing-espn-pitcher-splits')
  return failures
}

const propsReport = (props = {}) => {
  const picks = array(props.picks)
  const byType = picks.reduce((acc, pick) => {
    const type = pick?.propType || 'unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
  const pitcherStrikeoutPicks = picks.filter((pick) => pick?.propType === 'pitcherStrikeouts')
  const pitcherStrikeoutDraftKings = pitcherStrikeoutPicks.filter((pick) =>
    /draftkings/i.test([pick?.sportsbook, pick?.sourceName, pick?.sourcePath].filter(Boolean).join(' '))
  ).length
  const sources = array(props.sources).map((source) => source?.name || source?.source || source).filter(Boolean)
  return { total: picks.length, byType, pitcherStrikeoutDraftKings, sources, mergedFrom: props.mergedFrom || [] }
}

const propsFailures = (report) => {
  const failures = []
  if (report.total < 100) failures.push('prop-board-too-small')
  if ((report.byType.totalBases || 0) < 25) failures.push('missing-total-bases-props')
  if ((report.byType.pitcherStrikeouts || 0) < 1) failures.push('missing-pitcher-strikeout-props')
  if ((report.byType.pitcherStrikeouts || 0) > 0 && report.pitcherStrikeoutDraftKings < 1) {
    failures.push('pitcher-strikeout-props-missing-draftkings-lineage')
  }
  if ((report.byType.singles || 0) < 20) failures.push('missing-singles-props')
  if ((report.byType.walks || 0) < 10) failures.push('missing-walk-props')
  return failures
}

const valueBoardReport = (gameReports = [], games = [], propSummary = {}) => {
  const first5MoneylineRows = games.filter((game) => {
    const projection = game?.analysis?.mlbProjection || {}
    const awayRuns = Number(projection.awayFirst5ProjectedRuns)
    const homeRuns = Number(projection.homeFirst5ProjectedRuns)
    return Number.isFinite(awayRuns) && Number.isFinite(homeRuns) && Math.abs(awayRuns - homeRuns) >= 0.15
  }).length
  const first5TotalRows = games.filter((game) => {
    const first5 = game?.analysis?.mlbProjection?.totals?.first5
    return first5 && String(first5.lean || '').trim() && isFiniteNumber(first5.edge)
  }).length
  const moneylineRows = games.filter((game) => {
    const projection = game?.analysis?.mlbProjection || {}
    return Boolean(game?.analysis?.participant && projection.moneylineShape)
  }).length
  const firstInningRows = games.filter((game) => Boolean(game?.analysis?.mlbProjection?.firstInning)).length
  const fullGameTotalRows = games.filter((game) => {
    const fullGame = game?.analysis?.mlbProjection?.totals?.fullGame
    return fullGame && String(fullGame.lean || '').trim() && isFiniteNumber(fullGame.edge)
  }).length
  return {
    moneylineRows,
    first5MoneylineRows,
    first5TotalRows,
    firstInningRows,
    fullGameTotalRows,
    totalBaseRows: propSummary.byType?.totalBases || 0,
    pitcherStrikeoutRows: propSummary.byType?.pitcherStrikeouts || 0,
    gameCount: gameReports.length
  }
}

const valueBoardFailures = (report) => {
  const failures = []
  if (report.moneylineRows < Math.max(1, Math.floor(report.gameCount * 0.75))) failures.push('missing-ml-value-board-rows')
  if (report.first5MoneylineRows < 1) failures.push('missing-first5-ml-value-board-rows')
  if (report.first5TotalRows < 1) failures.push('missing-first5-total-value-board-rows')
  if (report.firstInningRows < Math.max(1, Math.floor(report.gameCount * 0.75))) failures.push('missing-first-inning-value-board-rows')
  if (report.totalBaseRows < 25) failures.push('missing-total-bases-value-board-rows')
  if (report.pitcherStrikeoutRows < 1) failures.push('missing-pitcher-k-value-board-rows')
  return failures
}

const expectedDraftKingsGames = async (date) => {
  if (!date || !fsSync.existsSync(root)) return 0
  const filePath = path.join(root, 'data-private', 'odds', 'draftkings', 'mlb', `${date}-draftkings-mlb-lines.json`)
  try {
    const payload = JSON.parse(await fs.readFile(filePath, 'utf8'))
    return array(payload.events).length
  } catch {
    return 0
  }
}

const writeReport = async (date, report) => {
  await fs.mkdir(reportsRoot, { recursive: true })
  const suffix = report.baseUrl ? 'live' : 'local'
  const filePath = path.join(reportsRoot, `audit_public_mlb_slate_${date}_${suffix}.json`)
  await fs.writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return filePath
}

const main = async () => {
  const date = argValue('--date')
  const baseUrl = argValue('--base')
  const summary = await fetchJson(baseUrl, '/data/current/summary.json')
  const slateDate = date || summary.id || summary.date
  const summaryGames = array(summary.games)
  const mlbSummaryGames = summaryGames.filter((game) => game?.league === 'MLB')
  const nonMlbGames = summaryGames.filter((game) => game?.league !== 'MLB')

  const gameReports = []
  const gameDetails = []
  const hardFailures = []
  for (const summaryGame of mlbSummaryGames) {
    const game = await fetchJson(baseUrl, `/data/current/games/${summaryGame.id}.json`)
    gameDetails.push(game)
    const gameReport = summarizeGame(game)
    const failures = hardFailuresForGame(gameReport)
    gameReports.push({ ...gameReport, failures })
    for (const failure of failures) {
      hardFailures.push({ gameId: gameReport.id, title: gameReport.title, failure })
    }
  }

  let props = null
  try {
    props = await fetchJson(baseUrl, '/data/current/props.json')
  } catch (error) {
    hardFailures.push({ failure: 'missing-props-json', detail: error.message })
  }

  const propSummary = propsReport(props || {})
  for (const failure of propsFailures(propSummary)) hardFailures.push({ failure })
  const valueBoard = valueBoardReport(gameReports, gameDetails, propSummary)
  for (const failure of valueBoardFailures(valueBoard)) hardFailures.push({ failure })
  const draftKingsExpectedGames = await expectedDraftKingsGames(slateDate)
  const draftKingsLineCoverage = {
    expectedGames: draftKingsExpectedGames,
    boardGames: gameReports.filter((game) => game.hasDraftKingsBoard).length,
    fullGameLineGames: gameReports.filter((game) => game.hasDraftKingsFullGameLines).length,
    firstFiveLineGames: gameReports.filter((game) => game.hasDraftKingsFirstFiveLines).length,
    postedFirst5TotalGames: gameReports.filter((game) => game.hasDraftKingsBoard && game.first5TotalLineSource === 'posted').length
  }
  if (draftKingsExpectedGames > 0 && draftKingsLineCoverage.fullGameLineGames < draftKingsExpectedGames) {
    hardFailures.push({ failure: 'draftkings-full-game-line-coverage-short', ...draftKingsLineCoverage })
  }
  if (draftKingsExpectedGames > 0 && draftKingsLineCoverage.firstFiveLineGames < draftKingsExpectedGames) {
    hardFailures.push({ failure: 'draftkings-first-five-line-coverage-short', ...draftKingsLineCoverage })
  }

  if (!mlbSummaryGames.length) hardFailures.push({ failure: 'no-mlb-games-in-summary' })
  if (date && summary.id && summary.id !== date) {
    hardFailures.push({ failure: 'current-summary-date-mismatch', expected: date, actual: summary.id })
  }

  const report = {
    audit: 'public-mlb-slate',
    date: slateDate,
    baseUrl: baseUrl || null,
    generatedAt: new Date().toISOString(),
    summary: {
      totalGames: summaryGames.length,
      mlbGames: mlbSummaryGames.length,
      nonMlbGames: nonMlbGames.length
    },
    games: gameReports,
    props: propSummary,
    valueBoard,
    draftKingsLineCoverage,
    hardFailures
  }

  const reportPath = await writeReport(slateDate, report)
  const status = hardFailures.length ? 'FAIL' : 'PASS'
  console.log(`[audit-public-mlb-slate] ${status} ${slateDate}`)
  console.log(`[audit-public-mlb-slate] games=${mlbSummaryGames.length} nonMlbPreserved=${nonMlbGames.length} props=${propSummary.total}`)
  console.log(`[audit-public-mlb-slate] report=${path.relative(root, reportPath)}`)
  if (hardFailures.length) {
    console.error(JSON.stringify(hardFailures.slice(0, 30), null, 2))
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(`[audit-public-mlb-slate] ${error.stack || error.message}`)
  process.exitCode = 1
})

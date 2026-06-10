import path from 'node:path'
import { pathToFileURL } from 'node:url'

const rootDir = path.resolve(import.meta.dirname, '..')

const parseArgs = () => {
  const options = { date: '', allowPartialMarketContext: false }
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--date') {
      options.date = args[index + 1] || ''
      index += 1
    } else if (args[index] === '--allow-partial-market-context') {
      options.allowPartialMarketContext = true
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new Error('Pass --date YYYY-MM-DD')
  }
  return options
}

const isSportsbookBacked = (game) => {
  const text = [
    game?.analysis?.sourceLabel,
    game?.odds?.provider,
    game?.moneyline?.provider,
    ...(game?.tags || [])
  ].filter(Boolean).join(' ')
  return /draftkings|fanduel|robinhood|sportsbook|prediction market/i.test(text)
}

const isMarketOnlyRow = (game) => {
  const text = [
    ...(game?.tags || []),
    game?.analysis?.tier,
    game?.lean
  ].filter(Boolean).join(' ')
  return /market only|no model edge/i.test(text)
}

const hasRecentRows = (warehouseStats) => {
  const recent = warehouseStats?.recentFormMetrics?.matches || warehouseStats?.recentMatches || []
  return Array.isArray(recent) && recent.length > 0
}

const hasFormChart = (warehouseStats) => {
  const points = warehouseStats?.formChart?.points || warehouseStats?.formChartPoints || []
  return Array.isArray(points) && points.length > 0
}

const hasStatRows = (warehouseStats) => {
  const stats = warehouseStats?.statRows || warehouseStats?.matchStats || warehouseStats?.statSummary || []
  if (Array.isArray(stats) && stats.length > 0) return true
  if (stats && Object.keys(stats).length) return true
  const expected = warehouseStats?.expectedStats?.stats || {}
  if (expected && Object.keys(expected).length) return true
  return (warehouseStats?.recentFormMetrics?.matches || []).some((match) => (match?.serviceStats?.rows || []).length > 0)
}

const audit = async ({ date, allowPartialMarketContext }) => {
  const modulePath = path.join(rootDir, 'web', 'src', 'lib', `day-${date}.js`)
  const slate = await import(`${pathToFileURL(modulePath).href}?audit=${Date.now()}`)
  const games = slate.games || []
  const missing = []
  let playerCount = 0
  let profileCount = 0
  let rankCount = 0
  let recentCount = 0
  let statCount = 0
  let chartCount = 0

  for (const game of games) {
    if (game.league !== 'Tennis') continue
    for (const participant of game.tennisContext?.players || []) {
      playerCount += 1
      const stats = participant?.warehouseStats
      const marketContextAllowed = allowPartialMarketContext && isSportsbookBacked(game) && (Boolean(stats) || isMarketOnlyRow(game))
      const profile = stats?.profile || stats?.playerProfile || null
      const rank = profile?.rank ?? profile?.currentRanking ?? profile?.current_ranking ?? stats?.ranking?.rank ?? participant?.rank ?? null
      const row = {
        game: game.title,
        player: participant.name,
        hasWarehouseStats: Boolean(stats),
        hasProfile: Boolean(profile),
        hasRank: rank !== null && rank !== undefined,
        hasRecent: hasRecentRows(stats),
        hasStats: hasStatRows(stats),
        hasFormChart: hasFormChart(stats)
      }
      if (row.hasProfile) profileCount += 1
      if (row.hasRank) rankCount += 1
      if (row.hasRecent) recentCount += 1
      if (row.hasStats) statCount += 1
      if (row.hasFormChart) chartCount += 1
      if (!row.hasWarehouseStats || !row.hasProfile || !row.hasRank || !row.hasRecent || !row.hasStats || !row.hasFormChart) {
        missing.push({
          ...row,
          blocking: !marketContextAllowed,
          warningReason: marketContextAllowed ? 'partial sportsbook-backed warehouse context' : 'missing required warehouse context'
        })
      }
    }
  }
  const blockingMissing = missing.filter((row) => row.blocking)

  const report = {
    ok: playerCount > 0 && blockingMissing.length === 0,
    date,
    allowPartialMarketContext,
    playerCount,
    profileCount,
    rankCount,
    recentCount,
    statCount,
    chartCount,
    missingCount: missing.length,
    blockingMissingCount: blockingMissing.length,
    missing: missing.slice(0, 50)
  }
  console.log(JSON.stringify(report, null, 2))
  if (!report.ok) process.exitCode = 1
}

audit(parseArgs()).catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})

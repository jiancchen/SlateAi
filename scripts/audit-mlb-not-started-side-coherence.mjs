import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const argValue = (name) => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : null
}

const hasFlag = (name) => process.argv.includes(name)

const pacificDateKey = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())

const pacificNowMinutes = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value])
  )
  return Number(parts.hour) * 60 + Number(parts.minute)
}

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'))

const loadSummary = async ({ date, base }) => {
  if (base) {
    const url = new URL('/data/current/summary.json', base)
    url.searchParams.set('ts', String(Date.now()))
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
    return response.json()
  }

  const slatePath = path.join(root, 'web', 'public', 'data', 'slates', date, 'summary.json')
  try {
    return await readJson(slatePath)
  } catch {
    return readJson(path.join(root, 'web', 'public', 'data', 'current', 'summary.json'))
  }
}

const allPhasesOwned = (diagnostics = {}) =>
  diagnostics.pickOwnsFull === true &&
  diagnostics.pickOwnsFirst5 === true &&
  diagnostics.pickOwnsLate === true &&
  diagnostics.pickOwnsBridge === true

const sideHasTimingExpression = (bestExpression = '') =>
  /first[-\s]?five|f5|live(?:\s+side|\s+lead|\s+entry)?|after starter exit|no taxed ml/i.test(
    String(bestExpression)
  )

const summarizeGame = (game) => {
  const analysis = game.analysis || {}
  const projection = analysis.mlbProjection || {}
  const moneylineShape = projection.moneylineShape || {}
  const diagnostics = analysis.gameShape?.category?.diagnostics || {}
  const sideGate = analysis.indicators?.sideCoherenceGate || {}
  const runDiff = Number(moneylineShape.runDiff)
  const projectedHitEdge = Number(diagnostics.projectedHitEdge)
  const modelEdge = Number(analysis.modelEdge)
  const confidence = Number(analysis.confidence)
  const hardFailures = []
  const warnings = []
  const notes = []

  const separatedAllPhaseSide =
    moneylineShape.grade === 'Separated ML shape' &&
    Number.isFinite(runDiff) &&
    runDiff >= 1.4 &&
    Number.isFinite(projectedHitEdge) &&
    projectedHitEdge >= 1.5 &&
    Number.isFinite(modelEdge) &&
    modelEdge >= 6 &&
    allPhasesOwned(diagnostics)

  if (separatedAllPhaseSide) {
    if (analysis.tier === 'Pass' || confidence < 60 || !analysis.indicators?.sideCoherencePromoteFlag) {
      hardFailures.push('separated-all-phase-side-not-promoted')
    } else {
      notes.push('separated-all-phase-side-promoted')
    }
  }

  if (analysis.indicators?.sideCoherencePromoteFlag && analysis.indicators?.tierOnePassFlag) {
    hardFailures.push('promoted-side-still-has-public-tier-one-pass-flag')
  }

  if (
    Number.isFinite(Number(moneylineShape.confidence)) &&
    Number.isFinite(confidence) &&
    Number(moneylineShape.confidence) !== confidence
  ) {
    hardFailures.push('moneyline-shape-confidence-mismatch')
  }

  if (
    Number.isFinite(runDiff) &&
    runDiff < -0.1 &&
    Number.isFinite(modelEdge) &&
    modelEdge <= 3 &&
    sideHasTimingExpression(analysis.gameShape?.category?.bestExpression) &&
    !analysis.indicators?.sideCoherencePassFlag
  ) {
    hardFailures.push('projected-behind-thin-side-not-demoted')
  }

  if (analysis.indicators?.sideCoherencePassFlag && analysis.tier !== 'Pass') {
    hardFailures.push('side-coherence-pass-flag-without-pass-tier')
  }

  if (analysis.tier !== 'Pass' && confidence <= 52) {
    warnings.push('playable-side-surfaced-at-confidence-floor')
  }

  if (analysis.tier === 'Pass' && allPhasesOwned(diagnostics) && moneylineShape.grade === 'Thin ML shape') {
    notes.push('all-phases-owned-but-thin-ml-shape-pass')
  }

  return {
    gameId: game.id,
    title: game.title,
    start: game.start,
    startMinutes: game.startMinutes,
    pick: analysis.participant?.name || null,
    tier: analysis.tier || null,
    confidence: Number.isFinite(confidence) ? confidence : null,
    modelEdge: Number.isFinite(modelEdge) ? modelEdge : null,
    volatility: Number.isFinite(Number(analysis.volatility)) ? Number(analysis.volatility) : null,
    moneylineShape: {
      grade: moneylineShape.grade || null,
      runDiff: Number.isFinite(runDiff) ? runDiff : null,
      projectedTotalRuns: Number.isFinite(Number(moneylineShape.projectedTotalRuns))
        ? Number(moneylineShape.projectedTotalRuns)
        : null,
      confidence: Number.isFinite(Number(moneylineShape.confidence)) ? Number(moneylineShape.confidence) : null
    },
    projectedRuns: {
      away: projection.awayProjectedRuns ?? null,
      home: projection.homeProjectedRuns ?? null
    },
    projectedHits: {
      away: projection.awayProjectedHits ?? null,
      home: projection.homeProjectedHits ?? null
    },
    phases: {
      full: projection.edgeTeam || null,
      first5: projection.first5EdgeTeam || null,
      late: projection.lateEdgeTeam || null,
      bridge: projection.bridgeEdgeTeam || null
    },
    sideCoherenceGate: sideGate,
    sideCoherencePromoteFlag: Boolean(analysis.indicators?.sideCoherencePromoteFlag),
    sideCoherencePassFlag: Boolean(analysis.indicators?.sideCoherencePassFlag),
    tierOnePassFlag: Boolean(analysis.indicators?.tierOnePassFlag),
    tierOneRawPassFlag: Boolean(analysis.indicators?.tierOneRawPassFlag),
    hardFailures,
    warnings,
    notes
  }
}

const main = async () => {
  const date = argValue('--date') || pacificDateKey()
  const base = argValue('--base')
  const cutoffArg = argValue('--cutoff-minutes') || argValue('--started-cutoff-minutes')
  const cutoffMinutes = cutoffArg ? Number(cutoffArg) : date === pacificDateKey() ? pacificNowMinutes() : null
  const summary = await loadSummary({ date, base })
  const games = (summary.games || [])
    .filter((game) => game?.league === 'MLB')
    .filter((game) =>
      Number.isFinite(cutoffMinutes) && Number.isFinite(Number(game.startMinutes))
        ? Number(game.startMinutes) > cutoffMinutes
        : true
    )
    .map(summarizeGame)

  const hardFailures = games.flatMap((game) =>
    game.hardFailures.map((failure) => ({
      gameId: game.gameId,
      title: game.title,
      failure
    }))
  )
  const warnings = games.flatMap((game) =>
    game.warnings.map((warning) => ({
      gameId: game.gameId,
      title: game.title,
      warning
    }))
  )
  const report = {
    audit: 'mlb-not-started-side-coherence',
    date,
    base: base || 'local',
    generatedAt: new Date().toISOString(),
    cutoffMinutes,
    gamesAudited: games.length,
    status: hardFailures.length ? 'fail' : 'pass',
    hardFailures,
    warnings,
    games
  }

  if (!base || hasFlag('--write-report')) {
    const suffix = base ? 'live' : 'local'
    const reportPath = path.join(
      root,
      'data-migration',
      'reports',
      `audit_mlb_not_started_side_coherence_${date}_${suffix}.json`
    )
    await fs.mkdir(path.dirname(reportPath), { recursive: true })
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
    console.log(`[audit-mlb-not-started-side-coherence] report=${path.relative(root, reportPath)}`)
  }

  console.log(`[audit-mlb-not-started-side-coherence] ${report.status.toUpperCase()} ${date}`)
  console.log(
    `[audit-mlb-not-started-side-coherence] games=${games.length} hardFailures=${hardFailures.length} warnings=${warnings.length}`
  )
  for (const failure of hardFailures) {
    console.log(`FAIL ${failure.gameId}: ${failure.failure}`)
  }
  for (const warning of warnings) {
    console.log(`WARN ${warning.gameId}: ${warning.warning}`)
  }

  if (hardFailures.length) process.exit(1)
}

main().catch((error) => {
  console.error(`[audit-mlb-not-started-side-coherence] ${error.stack || error.message}`)
  process.exit(1)
})

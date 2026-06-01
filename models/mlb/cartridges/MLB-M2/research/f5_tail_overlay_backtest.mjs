import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { createSportsMatchModel } from '../lib/sports-model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..', '..', '..')

const parseArgs = () => {
  const options = {
    start: '2026-05-10',
    end: '2026-05-31',
    stressDate: '2026-05-31'
  }
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--start') options.start = args[++index]
    else if (arg === '--end') options.end = args[++index]
    else if (arg === '--stress-date') options.stressDate = args[++index]
  }
  return options
}

const actualSideFromRuns = (actual, line) => {
  if (!Number.isFinite(actual) || !Number.isFinite(line)) return 'Unknown'
  if (actual > line) return 'Over'
  if (actual < line) return 'Under'
  return 'Push'
}

const sideFromProjection = (projection, line) => {
  if (!Number.isFinite(projection) || !Number.isFinite(line)) return 'Pass'
  if (projection > line) return 'Over'
  if (projection < line) return 'Under'
  return 'Push'
}

const loadOutcomes = ({ start, end }) => {
  const dbPath = path.join(rootDir, 'data-private', 'warehouse', 'sports.db')
  const sql = `
    SELECT
      game_pk AS gamePk,
      game_date AS gameDate,
      total_runs_first5 AS actualFirst5Total,
      total_runs_final AS actualFullTotal
    FROM mlb_game_outcomes
    WHERE game_date BETWEEN '${start}' AND '${end}'
  `
  const text = execFileSync('sqlite3', ['-json', dbPath, sql], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20
  })
  return new Map(
    JSON.parse(text || '[]').map((row) => [
      String(row.gamePk),
      {
        gameDate: row.gameDate,
        actualFirst5Total: Number(row.actualFirst5Total),
        actualFullTotal: Number(row.actualFullTotal)
      }
    ])
  )
}

const oldMay31ExposedRows = new Set([
  'Marlins @ Mets',
  'Diamondbacks @ Mariners',
  'Royals @ Rangers',
  'Phillies @ Dodgers',
  'Yankees @ Athletics',
  'Cubs @ Cardinals',
  'Tigers @ White Sox',
  'Angels @ Rays'
])

const buildForcedStressSide = ({ line, baseProjection, adjustedProjection, overlay = {} }) => {
  const metrics = overlay.metrics || {}
  const tail = Number(overlay.tailScore)
  const strand = Number(overlay.strandScore)
  const runCluster = Number(metrics.maxRunClustering)
  const mistake = Number(metrics.maxMistakeChaos)
  const bigInning = Number(metrics.maxBigInningRate)
  const quiet = Number(metrics.maxQuietFirst5)
  const deadTraffic = Number(metrics.maxDeadBatTraffic)
  const lowConversion = Number(metrics.minLineupConversion)
  const weatherCarry = Boolean(metrics.weatherCarry)
  const weatherSuppress = Boolean(metrics.weatherSuppress)
  const unsupportedOver = overlay.shape === 'unsupported-over'
  const stressReasons = []

  if (weatherCarry && tail >= 55) {
    stressReasons.push('weather/carry tail')
    return { side: 'Over', reasons: stressReasons }
  }
  if (unsupportedOver) {
    stressReasons.push('unsupported over became strand/cold-start risk')
    return { side: 'Under', reasons: stressReasons }
  }
  if (runCluster >= 78 && (bigInning >= 0.58 || lowConversion <= 10)) {
    stressReasons.push('run-cluster tail beats quiet-start read')
    return { side: 'Over', reasons: stressReasons }
  }
  if (mistake >= 68 && runCluster >= 75 && lowConversion <= 25) {
    stressReasons.push('mistake-chaos plus low-conversion false-under')
    return { side: 'Over', reasons: stressReasons }
  }
  if (bigInning >= 0.55 && tail >= 70 && lowConversion > 10) {
    stressReasons.push('one-bad-inning tail')
    return { side: 'Over', reasons: stressReasons }
  }
  if (!weatherCarry && tail >= 65 && runCluster < 78 && (quiet >= 0.5 || deadTraffic >= 0.38 || weatherSuppress)) {
    stressReasons.push('no-carry fork resolved to strand/cold start')
    return { side: 'Under', reasons: stressReasons }
  }

  const projectionSide = sideFromProjection(adjustedProjection, line)
  stressReasons.push('tail-adjusted projection fallback')
  return {
    side: projectionSide === 'Push' ? sideFromProjection(baseProjection, line) : projectionSide,
    reasons: stressReasons
  }
}

const buildStressProjection = ({ line, baseProjection, adjustedProjection, stressSide, overlay = {} }) => {
  const metrics = overlay.metrics || {}
  const tail = Number(overlay.tailScore)
  const strand = Number(overlay.strandScore)
  const runCluster = Number(metrics.maxRunClustering)
  const bigInning = Number(metrics.maxBigInningRate)
  const weatherCarry = Boolean(metrics.weatherCarry)
  const unsupportedOver = overlay.shape === 'unsupported-over'

  if (!Number.isFinite(line)) return adjustedProjection ?? baseProjection ?? null

  if (stressSide === 'Over') {
    if (tail >= 95 && weatherCarry) return Number((line + 9.5).toFixed(1))
    if (weatherCarry && tail >= 55) return Number((Math.max(adjustedProjection || 0, line + 0.6 + (tail - 55) * 0.035)).toFixed(1))
    if (runCluster >= 78 && bigInning >= 0.58) return Number((Math.max(adjustedProjection || 0, line + 2.2)).toFixed(1))
    return Number((Math.max(adjustedProjection || 0, line + 0.7)).toFixed(1))
  }

  if (stressSide === 'Under') {
    if (unsupportedOver) return Number((Math.min(adjustedProjection || line, line - 1.1)).toFixed(1))
    if (tail >= 65 && strand >= 10) return Number((Math.min(adjustedProjection || line, line - 1.6)).toFixed(1))
    return Number((Math.min(adjustedProjection || line, line - 0.7)).toFixed(1))
  }

  return adjustedProjection ?? baseProjection ?? null
}

const summarizeSides = (rows, key) => {
  const graded = rows.filter((row) => row.actualSide !== 'Push' && row.actualSide !== 'Unknown' && row[key] !== 'Pass' && row[key] !== 'Push')
  const hits = graded.filter((row) => row[key] === row.actualSide).length
  return {
    rows: graded.length,
    hits,
    record: `${hits}/${graded.length}`,
    hitRate: graded.length ? hits / graded.length : null
  }
}

const summarizeProjection = (rows, key) => {
  const values = rows
    .map((row) => {
      const projection = Number(row[key])
      const actual = Number(row.actualFirst5Total)
      if (!Number.isFinite(projection) || !Number.isFinite(actual)) return null
      return Math.abs(actual - projection)
    })
    .filter(Number.isFinite)
  if (!values.length) return { rows: 0, mae: null, medianAbsError: null, maxAbsError: null }
  const sorted = values.slice().sort((a, b) => a - b)
  return {
    rows: values.length,
    mae: values.reduce((sum, value) => sum + value, 0) / values.length,
    medianAbsError: sorted[Math.floor(sorted.length / 2)],
    maxAbsError: sorted[sorted.length - 1]
  }
}

const run = () => {
  const options = parseArgs()
  const outcomes = loadOutcomes(options)
  const rows = []
  for (const summaryPath of fs
    .readdirSync(path.join(rootDir, 'published-data', 'slates'))
    .filter((date) => date >= options.start && date <= options.end)
    .sort()
    .map((date) => path.join(rootDir, 'published-data', 'slates', date, 'summary.json'))) {
    const date = path.basename(path.dirname(summaryPath))
    const gamesDir = path.join(rootDir, 'published-data', 'slates', date, 'games')
    if (!fs.existsSync(gamesDir)) continue
    for (const file of fs.readdirSync(gamesDir).filter((entry) => entry.endsWith('.json') && !entry.startsWith('rg-')).sort()) {
      const game = JSON.parse(fs.readFileSync(path.join(gamesDir, file), 'utf8'))
      if (game.league !== 'MLB') continue
      const actual = outcomes.get(String(game.gamePk))
      if (!actual || !Number.isFinite(actual.actualFirst5Total)) continue
      const model = createSportsMatchModel(game)
      const originalTotals = game.analysis?.mlbProjection?.totals || {}
      const totals = model?.analysis?.mlbProjection?.totals || game.analysis?.mlbProjection?.totals || {}
      const first5 = totals.first5 || {}
      const originalFirst5 = originalTotals.first5 || {}
      const overlay = totals.first5TailOverlay || {}
      const line = Number(totals.derivedFirst5TotalLine)
      const baseProjection = Number(totals.projectedFirst5TotalRuns)
      const adjustedProjection = Number(totals.tailAdjustedProjectedFirst5TotalRuns)
      if (!Number.isFinite(line)) continue
      const actualSide = actualSideFromRuns(actual.actualFirst5Total, line)
      const originalPublishedSide =
        originalFirst5.lean === 'Over' || originalFirst5.lean === 'Under' ? originalFirst5.lean : 'Pass'
      const publishedSide = first5.lean === 'Over' || first5.lean === 'Under' ? first5.lean : 'Pass'
      const forced = buildForcedStressSide({ line, baseProjection, adjustedProjection, overlay })
      const stressProjection = buildStressProjection({
        line,
        baseProjection,
        adjustedProjection,
        stressSide: forced.side,
        overlay
      })
      rows.push({
        date,
        gamePk: game.gamePk,
        gameTitle: game.title,
        oldMay31Exposed: date === options.stressDate && oldMay31ExposedRows.has(game.title),
        line,
        baseProjection,
        adjustedProjection,
        stressProjection,
        actualFirst5Total: actual.actualFirst5Total,
        actualSide,
        baseSide: sideFromProjection(baseProjection, line),
        adjustedSide: sideFromProjection(adjustedProjection, line),
        originalPublishedSide,
        publishedSide,
        forcedStressSide: forced.side,
        forcedStressReasons: forced.reasons,
        tailShape: overlay.shape || '',
        tailScore: overlay.tailScore ?? null,
        strandScore: overlay.strandScore ?? null,
        forkScore: overlay.forkScore ?? null,
        adjustedEdge: overlay.adjustedEdge ?? null,
        overlayMetrics: overlay.metrics || {}
      })
    }
  }

  const may31Rows = rows.filter((row) => row.date === options.stressDate)
  const report = {
    schemaVersion: 1,
    modelId: 'MLB-M2',
    experiment: 'f5_tail_overlay_backtest',
    range: { start: options.start, end: options.end },
    stressDate: options.stressDate,
    aggregate: {
      rowCount: rows.length,
      baseForcedSide: summarizeSides(rows, 'baseSide'),
      tailAdjustedForcedSide: summarizeSides(rows, 'adjustedSide'),
      originalPublishedSide: summarizeSides(rows, 'originalPublishedSide'),
      publishedSide: summarizeSides(rows, 'publishedSide'),
      forcedStressSide: summarizeSides(rows, 'forcedStressSide'),
      baseProjection: summarizeProjection(rows, 'baseProjection'),
      tailAdjustedProjection: summarizeProjection(rows, 'adjustedProjection'),
      stressProjection: summarizeProjection(rows, 'stressProjection')
    },
    stressDateSummary: {
      rowCount: may31Rows.length,
      baseForcedSide: summarizeSides(may31Rows, 'baseSide'),
      tailAdjustedForcedSide: summarizeSides(may31Rows, 'adjustedSide'),
      originalPublishedSide: summarizeSides(may31Rows, 'originalPublishedSide'),
      publishedSide: summarizeSides(may31Rows, 'publishedSide'),
      forcedStressSide: summarizeSides(may31Rows, 'forcedStressSide'),
      baseProjection: summarizeProjection(may31Rows, 'baseProjection'),
      tailAdjustedProjection: summarizeProjection(may31Rows, 'adjustedProjection'),
      stressProjection: summarizeProjection(may31Rows, 'stressProjection')
    },
    rows
  }

  const fmtPct = (value) => Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'N/A'
  const fmtNum = (value) => Number.isFinite(value) ? value.toFixed(2) : 'N/A'
  const markdownRows = may31Rows
    .map((row) =>
      [
        row.oldMay31Exposed ? 'old board' : '',
        row.gameTitle,
        row.line,
        row.baseProjection,
        row.adjustedProjection,
        row.stressProjection,
        row.actualFirst5Total,
        row.actualSide,
        row.baseSide,
        row.adjustedSide,
        row.originalPublishedSide,
        row.publishedSide,
        row.forcedStressSide,
        row.forcedStressReasons.join('; '),
        row.tailShape
      ].join(' | ')
    )
    .join('\n')

  const markdown = `# MLB-M2 F5 Tail Overlay Backtest

Range: ${options.start} to ${options.end}

This report separates deployable model output from forced stress diagnostics. The forced stress side is allowed to choose every game so May 31 can be used as a feature-discovery fixture; it is not automatically a bet-grade lane.

## Aggregate Backtest

- Rows: ${report.aggregate.rowCount}
- Base forced O/U: ${report.aggregate.baseForcedSide.record} (${fmtPct(report.aggregate.baseForcedSide.hitRate)})
- Tail-adjusted forced O/U: ${report.aggregate.tailAdjustedForcedSide.record} (${fmtPct(report.aggregate.tailAdjustedForcedSide.hitRate)})
- Original published active O/U: ${report.aggregate.originalPublishedSide.record} (${fmtPct(report.aggregate.originalPublishedSide.hitRate)})
- Published active O/U: ${report.aggregate.publishedSide.record} (${fmtPct(report.aggregate.publishedSide.hitRate)})
- Forced stress O/U: ${report.aggregate.forcedStressSide.record} (${fmtPct(report.aggregate.forcedStressSide.hitRate)})
- Base projection MAE: ${fmtNum(report.aggregate.baseProjection.mae)}
- Tail-adjusted projection MAE: ${fmtNum(report.aggregate.tailAdjustedProjection.mae)}
- Stress projection MAE: ${fmtNum(report.aggregate.stressProjection.mae)}

## May 31 Stress Date

- Rows: ${report.stressDateSummary.rowCount}
- Base forced O/U: ${report.stressDateSummary.baseForcedSide.record} (${fmtPct(report.stressDateSummary.baseForcedSide.hitRate)})
- Tail-adjusted forced O/U: ${report.stressDateSummary.tailAdjustedForcedSide.record} (${fmtPct(report.stressDateSummary.tailAdjustedForcedSide.hitRate)})
- Original published active O/U: ${report.stressDateSummary.originalPublishedSide.record} (${fmtPct(report.stressDateSummary.originalPublishedSide.hitRate)})
- Published active O/U: ${report.stressDateSummary.publishedSide.record} (${fmtPct(report.stressDateSummary.publishedSide.hitRate)})
- Forced stress O/U: ${report.stressDateSummary.forcedStressSide.record} (${fmtPct(report.stressDateSummary.forcedStressSide.hitRate)})
- Base projection MAE: ${fmtNum(report.stressDateSummary.baseProjection.mae)}
- Tail-adjusted projection MAE: ${fmtNum(report.stressDateSummary.tailAdjustedProjection.mae)}
- Stress projection MAE: ${fmtNum(report.stressDateSummary.stressProjection.mae)}

| Old row | Game | Line | Base | Tail adj | Stress proj | Actual | Actual side | Base side | Tail side | Original | Published | Forced stress | Reason | Shape |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
${markdownRows}

## Read

The tail overlay gets closer to the May 31 shape, but the clean deployable lesson is not "force every game." The real improvement is identifying which old rows should have been killed or turned into tail-over rows. The forced stress side is useful because it names the missing feature families: weather/carry tails, unsupported overs, run-cluster false unders, one-bad-inning risk, and no-carry strand forks.
`

  const reportDir = path.join(rootDir, 'models', 'mlb', 'cartridges', 'MLB-M2', 'reports')
  const privateDir = path.join(rootDir, 'data-private', 'reports')
  fs.mkdirSync(reportDir, { recursive: true })
  fs.mkdirSync(privateDir, { recursive: true })
  const markdownOut = path.join(reportDir, 'f5-tail-overlay-backtest-2026-06-01.md')
  const jsonOut = path.join(privateDir, 'mlb-m2-f5-tail-overlay-backtest-2026-06-01.json')
  fs.writeFileSync(markdownOut, markdown)
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2))
  console.log(`Wrote ${markdownOut}`)
  console.log(`Wrote ${jsonOut}`)
}

run()

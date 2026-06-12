import fs from 'node:fs/promises'
import path from 'node:path'

import { buildEnvironmentRows, modelId, modelVersion } from './build-mlb-environment-adjustments.mjs'
import {
  avg,
  getArg,
  mlbDbPath,
  rootDir,
  round,
  sqlQuote,
  sqliteJson
} from './lib/mlb-model-utils.mjs'

const dbPath = getArg('--db', mlbDbPath)
const available = sqliteJson(`
select min(game_date) as start_date, max(game_date) as end_date
from mlb_game_outcomes
where total_runs_final is not null;
`, dbPath)[0] || {}

const startDate = getArg('--start-date', available.start_date || '2026-03-26')
const endDate = getArg('--end-date', available.end_date || startDate)
const outPath = getArg(
  '--out',
  path.join(rootDir, 'models/mlb/cartridges/MLB-ENV1/reports', `env1-backtest-${startDate}-to-${endDate}.json`)
)
const mdOutPath = getArg(
  '--md-out',
  path.join(rootDir, 'models/mlb/cartridges/MLB-ENV1/reports', `env1-backtest-${startDate}-to-${endDate}.md`)
)

const dateRange = (start, end) => {
  const dates = []
  let cursor = Date.parse(`${start}T12:00:00Z`)
  const stop = Date.parse(`${end}T12:00:00Z`)
  while (Number.isFinite(cursor) && cursor <= stop) {
    dates.push(new Date(cursor).toISOString().slice(0, 10))
    cursor += 86400000
  }
  return dates
}

const pct = (numerator, denominator) => denominator > 0 ? numerator / denominator * 100 : 0

const actualRows = sqliteJson(`
select
  cast(game_pk as integer) as game_pk,
  game_date,
  away_team,
  home_team,
  cast(total_runs_final as real) as total_runs_final,
  cast(away_hits_final as real) + cast(home_hits_final as real) as total_hits,
  cast(away_home_runs_final as real) + cast(home_home_runs_final as real) as total_home_runs
from mlb_game_outcomes
where game_date between ${sqlQuote(startDate)} and ${sqlQuote(endDate)}
  and total_runs_final is not null
order by game_date, game_pk;
`, dbPath)

const actualByGamePk = new Map(actualRows.map((row) => [Number(row.game_pk), row]))

const rollingLeagueBaseline = (date) => {
  const prior = actualRows.filter((row) => row.game_date < date).slice(-150)
  return avg(prior.map((row) => row.total_runs_final)) ?? avg(actualRows.map((row) => row.total_runs_final)) ?? 8.8
}

const projectionRows = dateRange(startDate, endDate).flatMap((date) => buildEnvironmentRows({ date, dbPath }))
const matched = projectionRows.map((row) => {
  const actual = actualByGamePk.get(Number(row.gamePk))
  if (!actual) return null
  const baselineTotal = rollingLeagueBaseline(row.sourceDate)
  return {
    ...row,
    actual,
    baselineTotal,
    projectedTotal: baselineTotal + Number(row.expectedTotalRunsDelta || 0),
    actualDelta: Number(actual.total_runs_final) - baselineTotal
  }
}).filter(Boolean)

const mae = (rows, predFn, actualFn) => {
  const values = rows.map((row) => Math.abs(Number(predFn(row)) - Number(actualFn(row)))).filter(Number.isFinite)
  return avg(values)
}

const directionalAccuracy = (rows, threshold = 0.18) => {
  const directional = rows.filter((row) => Math.abs(Number(row.expectedTotalRunsDelta)) >= threshold)
  const hits = directional.filter((row) => Math.sign(Number(row.expectedTotalRunsDelta)) === Math.sign(Number(row.actualDelta))).length
  return {
    samples: directional.length,
    hitPct: round(pct(hits, directional.length), 1)
  }
}

const bucketRows = (rows, bucketFn) => {
  const buckets = new Map()
  rows.forEach((row) => {
    const bucket = bucketFn(row)
    if (!buckets.has(bucket)) buckets.set(bucket, [])
    buckets.get(bucket).push(row)
  })
  return [...buckets.entries()].map(([bucket, bucketItems]) => ({
    bucket,
    samples: bucketItems.length,
    avgExpectedDelta: round(avg(bucketItems.map((row) => row.expectedTotalRunsDelta)), 3),
    avgExpectedHitsDelta: round(avg(bucketItems.map((row) => row.expectedHitsDelta)), 3),
    avgExpectedHrDelta: round(avg(bucketItems.map((row) => row.expectedHrDelta)), 3),
    avgActualDelta: round(avg(bucketItems.map((row) => row.actualDelta)), 3),
    avgActualTotal: round(avg(bucketItems.map((row) => row.actual.total_runs_final)), 3),
    avgActualHits: round(avg(bucketItems.map((row) => row.actual.total_hits)), 3),
    avgActualHr: round(avg(bucketItems.map((row) => row.actual.total_home_runs)), 3),
    totalMae: round(mae(bucketItems, (row) => row.projectedTotal, (row) => row.actual.total_runs_final), 3),
    baselineMae: round(mae(bucketItems, (row) => row.baselineTotal, (row) => row.actual.total_runs_final), 3),
    directional: directionalAccuracy(bucketItems)
  }))
}

const totalMae = mae(matched, (row) => row.projectedTotal, (row) => row.actual.total_runs_final)
const baselineMae = mae(matched, (row) => row.baselineTotal, (row) => row.actual.total_runs_final)

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  modelId,
  modelVersion,
  window: { startDate, endDate },
  coverage: {
    dates: dateRange(startDate, endDate).length,
    projectionRows: projectionRows.length,
    matchedGames: matched.length,
    withFicWeather: matched.filter((row) => row.sourceFlags.hasFicWeather).length,
    withExactUmpire: matched.filter((row) => row.sourceFlags.hasExactUmpireAssignment).length,
    withParkContext: matched.filter((row) => row.sourceFlags.hasParkContext).length,
    withLocalStartContext: matched.filter((row) => row.sourceFlags.hasLocalStartContext).length,
    lateLocalStarts: matched.filter((row) => row.sourceFlags.isLateLocalStart).length
  },
  headline: {
    totalMae: round(totalMae, 3),
    baselineTotalMae: round(baselineMae, 3),
    maeLiftPct: Number.isFinite(totalMae) && Number.isFinite(baselineMae)
      ? round((baselineMae - totalMae) / Math.max(baselineMae, 0.001) * 100, 1)
      : null,
    directional: directionalAccuracy(matched)
  },
  buckets: {
    runEnvironmentSignal: bucketRows(matched, (row) => row.runEnvironmentSignal),
    parkRunIndex: bucketRows(matched, (row) => {
      const index = Number(row.parkRunIndex)
      if (index >= 106) return 'park_runs_106_plus'
      if (index >= 102) return 'park_runs_102_105'
      if (index <= 94) return 'park_runs_94_below'
      if (index <= 98) return 'park_runs_95_98'
      return 'park_runs_neutral'
    }),
    hrForceSignal: bucketRows(matched, (row) => row.hrForceRunSignal || 'missing'),
    visibilitySignal: bucketRows(matched, (row) => row.visibilitySignal || 'missing')
  },
  promotionGate: {
    status: matched.length >= 300 && totalMae < baselineMae && matched.filter((row) => row.sourceFlags.hasFicWeather).length >= 100
      ? 'candidate'
      : 'shadow_only',
    reasons: [
      matched.length < 300 ? `Needs at least 300 settled game samples; has ${matched.length}.` : null,
      !(totalMae < baselineMae) ? 'Environment-adjusted total baseline must beat rolling league baseline MAE.' : null,
      matched.filter((row) => row.sourceFlags.hasFicWeather).length < 100 ? 'Needs at least 100 settled FIC weather/HRForce games before validating HRForce weights.' : null
    ].filter(Boolean)
  }
}

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...(rows.length ? rows : [['-']]).map((row) => `| ${row.join(' | ')} |`)
].join('\n')

const md = `# MLB-ENV1 Environment Adjustment Backtest

Window: \`${startDate}\` to \`${endDate}\`

## Coverage

- projection rows: \`${report.coverage.projectionRows}\`
- matched settled games: \`${report.coverage.matchedGames}\`
- matched FIC weather games: \`${report.coverage.withFicWeather}\`
- exact umpire games: \`${report.coverage.withExactUmpire}\`
- local start context games: \`${report.coverage.withLocalStartContext}\`
- late local starts: \`${report.coverage.lateLocalStarts}\`
- promotion status: \`${report.promotionGate.status}\`

## Headline

${markdownTable(
  ['Metric', 'ENV1', 'Baseline'],
  [
    ['Total runs MAE', `${report.headline.totalMae}`, `${report.headline.baselineTotalMae}`],
    ['Directional samples', `${report.headline.directional.samples}`, '-'],
    ['Directional hit rate', `${report.headline.directional.hitPct}%`, '-']
  ]
)}

## Run Environment Buckets

${markdownTable(
  ['Bucket', 'Samples', 'Exp Delta', 'Actual Delta', 'Actual Total', 'MAE', 'Base MAE', 'Dir'],
  report.buckets.runEnvironmentSignal.map((row) => [
    row.bucket,
    `${row.samples}`,
    `${row.avgExpectedDelta}`,
    `${row.avgActualDelta}`,
    `${row.avgActualTotal}`,
    `${row.totalMae}`,
    `${row.baselineMae}`,
    `${row.directional.hitPct}%/${row.directional.samples}`
  ])
)}

## Visibility Buckets

${markdownTable(
  ['Bucket', 'Samples', 'Exp Runs', 'Actual Delta', 'Actual Total', 'Exp Hits', 'Actual Hits', 'Exp HR', 'Actual HR'],
  report.buckets.visibilitySignal.map((row) => [
    row.bucket,
    `${row.samples}`,
    `${row.avgExpectedDelta}`,
    `${row.avgActualDelta}`,
    `${row.avgActualTotal}`,
    `${row.avgExpectedHitsDelta}`,
    `${row.avgActualHits}`,
    `${row.avgExpectedHrDelta}`,
    `${row.avgActualHr}`
  ])
)}

## Promotion Gate

${report.promotionGate.reasons.length ? report.promotionGate.reasons.map((reason) => `- ${reason}`).join('\n') : '- Gate passed for shadow candidate review.'}
`

await fs.mkdir(path.dirname(outPath), { recursive: true })
await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`)
await fs.mkdir(path.dirname(mdOutPath), { recursive: true })
await fs.writeFile(mdOutPath, md)

console.log(JSON.stringify({
  status: 'ok',
  modelId,
  modelVersion,
  window: report.window,
  outPath: path.relative(rootDir, outPath),
  mdOutPath: path.relative(rootDir, mdOutPath),
  coverage: report.coverage,
  headline: report.headline,
  promotionGate: report.promotionGate
}, null, 2))

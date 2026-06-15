import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dbPath = path.join(rootDir, 'data-private/warehouse/sports/mlb/sql-mlb.db')
const reportsRoot = path.join(rootDir, 'data-migration/reports')

const argValue = (name, fallback = '') => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const date = argValue('--date')
const startDate = argValue('--start-date', date)
const endDate = argValue('--end-date', date)

if (!startDate || !endDate) {
  throw new Error('Usage: node scripts/backtest-mlb-sp1.mjs --date YYYY-MM-DD OR --start-date YYYY-MM-DD --end-date YYYY-MM-DD')
}

const sqlQuote = (value) => `'${String(value).replaceAll("'", "''")}'`

const query = (sql) => {
  const raw = execFileSync('sqlite3', ['-json', dbPath, sql], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 80
  }).trim()
  return raw ? JSON.parse(raw) : []
}

const parseJson = (value, fallback = null) => {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const num = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const round = (value, digits = 2) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const factor = 10 ** digits
  return Math.round(parsed * factor) / factor
}

const average = (values) => {
  const finite = values.map((value) => Number(value)).filter(Number.isFinite)
  if (!finite.length) return null
  return finite.reduce((sum, value) => sum + value, 0) / finite.length
}

const pct = (hits, total) => (total > 0 ? round((hits / total) * 100, 1) : null)

const pearson = (xs, ys) => {
  const pairs = xs
    .map((x, index) => [Number(x), Number(ys[index])])
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
  if (pairs.length < 3) return null
  const meanX = average(pairs.map(([x]) => x))
  const meanY = average(pairs.map(([, y]) => y))
  const numerator = pairs.reduce((sum, [x, y]) => sum + (x - meanX) * (y - meanY), 0)
  const denominatorX = Math.sqrt(pairs.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0))
  const denominatorY = Math.sqrt(pairs.reduce((sum, [, y]) => sum + (y - meanY) ** 2, 0))
  if (!denominatorX || !denominatorY) return null
  return round(numerator / (denominatorX * denominatorY), 3)
}

const riskBucket = (value) => {
  const risk = num(value, null)
  if (!Number.isFinite(risk)) return 'unknown'
  if (risk >= 66) return 'high'
  if (risk >= 58) return 'elevated'
  if (risk >= 50) return 'neutral'
  return 'low'
}

const hrForceBucket = (value) => {
  const hrForce = num(value, null)
  if (!Number.isFinite(hrForce)) return 'unknown'
  if (hrForce >= 1.7) return 'extreme_carry'
  if (hrForce >= 1.5) return 'high_carry'
  if (hrForce >= 1.4) return 'carry'
  return 'low_or_dome'
}

const rows = query(`
  select
    sp1.source_date,
    sp1.model_version,
    sp1.game_id,
    sp1.game_pk,
    sp1.team_role,
    sp1.team_name,
    sp1.opponent_name,
    sp1.pitcher_id,
    sp1.mlb_player_id,
    sp1.pitcher_name,
    sp1.pitcher_role,
    sp1.source_status,
    sp1.starter_profile_score,
    sp1.run_prevention_score,
    sp1.first_inning_risk_score,
    sp1.repeat_opponent_tax_score,
    sp1.weather_fragility_score,
    sp1.handedness_fragility_score,
    sp1.pitch_mix_fit_score,
    sp1.collapse_risk_score,
    sp1.expected_runs_allowed_delta,
    sp1.expected_hits_allowed_delta,
    sp1.expected_hr_allowed_delta,
    sp1.expected_walk_delta,
    sp1.expected_k_delta,
    sp1.expected_outs_delta,
    sp1.yrfi_probability_delta,
    sp1.confidence_score,
    sp1.feature_snapshot_json,
    sp1.reasons_json,
    sp1.flags_json,
    pa.pitcher_id as actual_pitcher_id,
    pa.pitcher_name as actual_pitcher_name,
    pa.pitcher_role as actual_pitcher_role,
    pa.runs_allowed as actual_runs_allowed,
    pa.earned_runs as actual_earned_runs,
    pa.hits_allowed as actual_hits_allowed,
    pa.home_runs_allowed as actual_hr_allowed,
    pa.walks_allowed as actual_walks_allowed,
    pa.strikeouts as actual_strikeouts,
    pa.outs_recorded as actual_outs_recorded,
    pa.pitches_thrown as actual_pitches_thrown,
    opp.runs_scored as opponent_runs_final,
    opp.runs_scored_first5 as opponent_runs_first5,
    opp.hits as opponent_hits_final,
    opp.hits_first5 as opponent_hits_first5,
    opp.home_runs as opponent_hr_final,
    opp.home_runs_first5 as opponent_hr_first5,
    go.total_runs_final,
    go.total_runs_first5
  from mlb_starting_pitcher_profile_v1_daily sp1
  left join mlb_pitcher_appearances pa
    on pa.game_date = sp1.source_date
   and pa.game_pk = sp1.game_pk
   and pa.team_role = sp1.team_role
   and (
      cast(pa.pitcher_id as text) = cast(sp1.mlb_player_id as text)
      or lower(pa.pitcher_name) = lower(sp1.pitcher_name)
   )
  left join mlb_game_team_stats opp
    on opp.game_date = sp1.source_date
   and opp.game_pk = sp1.game_pk
   and opp.team_role = case when sp1.team_role = 'away' then 'home' else 'away' end
  left join mlb_game_outcomes go
    on go.game_date = sp1.source_date
   and go.game_pk = sp1.game_pk
  where sp1.source_date between ${sqlQuote(startDate)} and ${sqlQuote(endDate)}
    and sp1.model_version = (
      select max(latest.model_version)
      from mlb_starting_pitcher_profile_v1_daily latest
      where latest.source_date = sp1.source_date
    )
  order by sp1.source_date, sp1.game_pk, sp1.team_role
`)

const enrichedRows = rows.map((row) => {
  const features = parseJson(row.feature_snapshot_json, {})
  const reasons = parseJson(row.reasons_json, [])
  const flags = parseJson(row.flags_json, [])
  const actualRuns = num(row.actual_runs_allowed, null)
  const actualHits = num(row.actual_hits_allowed, null)
  const actualHr = num(row.actual_hr_allowed, null)
  const actualOuts = num(row.actual_outs_recorded, null)
  const collapseRiskScore = num(row.collapse_risk_score, null)
  const starterCollapsed =
    Number.isFinite(actualRuns) &&
    Number.isFinite(actualOuts) &&
    (actualRuns >= 4 || actualOuts <= 12 || num(actualHr, 0) >= 2)
  const starterSurvived =
    Number.isFinite(actualRuns) &&
    Number.isFinite(actualOuts) &&
    actualRuns <= 2 &&
    actualOuts >= 15

  return {
    ...row,
    features,
    reasons,
    flags,
    weatherHrForce: features?.weatherProfile?.effectiveHrForce ?? features?.weatherProfile?.hrForce ?? null,
    weightedHitterSplitOps: features?.canonicalSplits?.weightedHitterSplitOps ?? null,
    weightedPitcherAllowedOps: features?.canonicalSplits?.weightedPitcherAllowedOps ?? null,
    topThirdHitterSplitOps: features?.canonicalSplits?.topThirdHitterSplitOps ?? null,
    riskBucket: riskBucket(collapseRiskScore),
    hrForceBucket: hrForceBucket(features?.weatherProfile?.effectiveHrForce ?? features?.weatherProfile?.hrForce),
    starterCollapsed,
    starterSurvived
  }
})

const matchedRows = enrichedRows.filter((row) => row.actual_pitcher_id || row.actual_pitcher_name)
const actualRunAverage = average(matchedRows.map((row) => row.actual_runs_allowed))
const actualHitAverage = average(matchedRows.map((row) => row.actual_hits_allowed))
const actualHrAverage = average(matchedRows.map((row) => row.actual_hr_allowed))

const summarizeBucket = (bucketRows) => ({
  rows: bucketRows.length,
  collapseRatePct: pct(bucketRows.filter((row) => row.starterCollapsed).length, bucketRows.length),
  survivalRatePct: pct(bucketRows.filter((row) => row.starterSurvived).length, bucketRows.length),
  avgCollapseRisk: round(average(bucketRows.map((row) => row.collapse_risk_score)), 1),
  avgActualStarterRuns: round(average(bucketRows.map((row) => row.actual_runs_allowed)), 2),
  avgActualStarterHits: round(average(bucketRows.map((row) => row.actual_hits_allowed)), 2),
  avgActualStarterHr: round(average(bucketRows.map((row) => row.actual_hr_allowed)), 2),
  avgActualOuts: round(average(bucketRows.map((row) => row.actual_outs_recorded)), 1),
  avgOpponentRuns: round(average(bucketRows.map((row) => row.opponent_runs_final)), 2),
  avgOpponentF5Runs: round(average(bucketRows.map((row) => row.opponent_runs_first5)), 2)
})

const bucketSummary = (key) =>
  Object.fromEntries(
    [...new Set(matchedRows.map((row) => row[key] || 'unknown'))]
      .sort()
      .map((bucket) => [bucket, summarizeBucket(matchedRows.filter((row) => (row[key] || 'unknown') === bucket))])
  )

const directionScore = (rowsForScore, predicate) => {
  const graded = rowsForScore.filter((row) => predicate(row).graded)
  const hits = graded.filter((row) => predicate(row).hit).length
  return { graded: graded.length, hits, hitRatePct: pct(hits, graded.length) }
}

const collapseDirection = directionScore(matchedRows, (row) => {
  const risk = num(row.collapse_risk_score, null)
  if (!Number.isFinite(risk) || risk > 58 && risk < 66) return { graded: false, hit: false }
  if (risk >= 66) return { graded: true, hit: row.starterCollapsed }
  if (risk <= 50) return { graded: true, hit: !row.starterCollapsed }
  return { graded: false, hit: false }
})

const runDeltaDirection = directionScore(matchedRows, (row) => {
  const delta = num(row.expected_runs_allowed_delta, null)
  const actual = num(row.actual_runs_allowed, null)
  if (!Number.isFinite(delta) || !Number.isFinite(actual) || Math.abs(delta) < 0.1 || !Number.isFinite(actualRunAverage)) {
    return { graded: false, hit: false }
  }
  return { graded: true, hit: delta > 0 ? actual >= actualRunAverage : actual <= actualRunAverage }
})

const hitDeltaDirection = directionScore(matchedRows, (row) => {
  const delta = num(row.expected_hits_allowed_delta, null)
  const actual = num(row.actual_hits_allowed, null)
  if (!Number.isFinite(delta) || !Number.isFinite(actual) || Math.abs(delta) < 0.25 || !Number.isFinite(actualHitAverage)) {
    return { graded: false, hit: false }
  }
  return { graded: true, hit: delta > 0 ? actual >= actualHitAverage : actual <= actualHitAverage }
})

const hrDeltaDirection = directionScore(matchedRows, (row) => {
  const delta = num(row.expected_hr_allowed_delta, null)
  const actual = num(row.actual_hr_allowed, null)
  if (!Number.isFinite(delta) || !Number.isFinite(actual) || Math.abs(delta) < 0.08 || !Number.isFinite(actualHrAverage)) {
    return { graded: false, hit: false }
  }
  return { graded: true, hit: delta > 0 ? actual >= actualHrAverage : actual <= actualHrAverage }
})

const compactRow = (row) => ({
  date: row.source_date,
  gameId: row.game_id,
  team: row.team_name,
  opponent: row.opponent_name,
  pitcher: row.pitcher_name,
  role: row.actual_pitcher_role || row.pitcher_role || '',
  collapseRisk: round(row.collapse_risk_score, 1),
  expectedRunsDelta: round(row.expected_runs_allowed_delta, 2),
  expectedHitsDelta: round(row.expected_hits_allowed_delta, 2),
  expectedHrDelta: round(row.expected_hr_allowed_delta, 2),
  hrForce: round(row.weatherHrForce, 2),
  actualRunsAllowed: num(row.actual_runs_allowed, null),
  actualHitsAllowed: num(row.actual_hits_allowed, null),
  actualHrAllowed: num(row.actual_hr_allowed, null),
  actualOuts: num(row.actual_outs_recorded, null),
  opponentRuns: num(row.opponent_runs_final, null),
  flags: Array.isArray(row.flags) ? row.flags.slice(0, 4) : []
})

const highRiskSurvivals = matchedRows
  .filter((row) => num(row.collapse_risk_score, 0) >= 64 && row.starterSurvived)
  .sort((a, b) => num(b.collapse_risk_score, 0) - num(a.collapse_risk_score, 0))
  .slice(0, 12)
  .map(compactRow)

const lowRiskCollapses = matchedRows
  .filter((row) => num(row.collapse_risk_score, 100) <= 52 && row.starterCollapsed)
  .sort((a, b) => num(b.actual_runs_allowed, 0) - num(a.actual_runs_allowed, 0))
  .slice(0, 12)
  .map(compactRow)

const runDeltaMisses = matchedRows
  .filter((row) => {
    const delta = num(row.expected_runs_allowed_delta, 0)
    const actual = num(row.actual_runs_allowed, null)
    if (!Number.isFinite(actual) || !Number.isFinite(actualRunAverage) || Math.abs(delta) < 0.1) return false
    return delta > 0 ? actual < actualRunAverage : actual > actualRunAverage
  })
  .sort((a, b) => Math.abs(num(b.expected_runs_allowed_delta, 0)) - Math.abs(num(a.expected_runs_allowed_delta, 0)))
  .slice(0, 12)
  .map(compactRow)

const report = {
  backtest: 'mlb-sp1-shadow',
  dateRange: { startDate, endDate },
  generatedAt: new Date().toISOString(),
  modelVersions: [...new Set(enrichedRows.map((row) => row.model_version).filter(Boolean))],
  rows: enrichedRows.length,
  matchedActualRows: matchedRows.length,
  missingActualRows: enrichedRows.length - matchedRows.length,
  actualBaselines: {
    avgStarterRunsAllowed: round(actualRunAverage, 2),
    avgStarterHitsAllowed: round(actualHitAverage, 2),
    avgStarterHrAllowed: round(actualHrAverage, 2)
  },
  correlations: {
    collapseRiskToRunsAllowed: pearson(matchedRows.map((row) => row.collapse_risk_score), matchedRows.map((row) => row.actual_runs_allowed)),
    collapseRiskToOutsRecorded: pearson(matchedRows.map((row) => row.collapse_risk_score), matchedRows.map((row) => row.actual_outs_recorded)),
    expectedRunDeltaToRunsAllowed: pearson(matchedRows.map((row) => row.expected_runs_allowed_delta), matchedRows.map((row) => row.actual_runs_allowed)),
    expectedHitDeltaToHitsAllowed: pearson(matchedRows.map((row) => row.expected_hits_allowed_delta), matchedRows.map((row) => row.actual_hits_allowed)),
    expectedHrDeltaToHrAllowed: pearson(matchedRows.map((row) => row.expected_hr_allowed_delta), matchedRows.map((row) => row.actual_hr_allowed)),
    hrForceToRunsAllowed: pearson(matchedRows.map((row) => row.weatherHrForce), matchedRows.map((row) => row.actual_runs_allowed))
  },
  directionalScores: {
    collapseRisk: collapseDirection,
    expectedRunsAllowedDelta: runDeltaDirection,
    expectedHitsAllowedDelta: hitDeltaDirection,
    expectedHrAllowedDelta: hrDeltaDirection
  },
  buckets: {
    byCollapseRisk: bucketSummary('riskBucket'),
    byHrForce: bucketSummary('hrForceBucket')
  },
  misses: {
    highRiskSurvivals,
    lowRiskCollapses,
    runDeltaMisses
  },
  promotionRead: {
    status: 'shadow_only',
    note: 'This report measures SP1 signal direction. It does not promote SP1 into public scoring without a larger settled window and lane-specific calibration.'
  }
}

const reportSlug = startDate === endDate ? startDate : `${startDate}_${endDate}`
const jsonPath = path.join(reportsRoot, `backtest_mlb_sp1_${reportSlug}.json`)
const markdownPath = path.join(reportsRoot, `backtest_mlb_sp1_${reportSlug}.md`)

const markdown = [
  `# MLB-SP1 Shadow Backtest ${reportSlug}`,
  '',
  `- Rows: ${report.rows}`,
  `- Matched actual rows: ${report.matchedActualRows}`,
  `- Model versions: ${report.modelVersions.join(', ') || 'n/a'}`,
  `- Avg starter runs allowed: ${report.actualBaselines.avgStarterRunsAllowed}`,
  `- Avg starter hits allowed: ${report.actualBaselines.avgStarterHitsAllowed}`,
  '',
  '## Directional Scores',
  '',
  `- Collapse risk: ${report.directionalScores.collapseRisk.hits}/${report.directionalScores.collapseRisk.graded} (${report.directionalScores.collapseRisk.hitRatePct ?? 'n/a'}%)`,
  `- Runs delta: ${report.directionalScores.expectedRunsAllowedDelta.hits}/${report.directionalScores.expectedRunsAllowedDelta.graded} (${report.directionalScores.expectedRunsAllowedDelta.hitRatePct ?? 'n/a'}%)`,
  `- Hits delta: ${report.directionalScores.expectedHitsAllowedDelta.hits}/${report.directionalScores.expectedHitsAllowedDelta.graded} (${report.directionalScores.expectedHitsAllowedDelta.hitRatePct ?? 'n/a'}%)`,
  `- HR delta: ${report.directionalScores.expectedHrAllowedDelta.hits}/${report.directionalScores.expectedHrAllowedDelta.graded} (${report.directionalScores.expectedHrAllowedDelta.hitRatePct ?? 'n/a'}%)`,
  '',
  '## Correlations',
  '',
  `- Collapse risk -> starter runs allowed: ${report.correlations.collapseRiskToRunsAllowed ?? 'n/a'}`,
  `- Collapse risk -> outs recorded: ${report.correlations.collapseRiskToOutsRecorded ?? 'n/a'}`,
  `- Expected run delta -> starter runs allowed: ${report.correlations.expectedRunDeltaToRunsAllowed ?? 'n/a'}`,
  `- HRForce -> starter runs allowed: ${report.correlations.hrForceToRunsAllowed ?? 'n/a'}`,
  '',
  '## Collapse Risk Buckets',
  '',
  '| Bucket | Rows | Collapse % | Survive % | Avg RA | Avg H | Avg HR | Avg Outs |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...Object.entries(report.buckets.byCollapseRisk).map(([bucket, summary]) =>
    `| ${bucket} | ${summary.rows} | ${summary.collapseRatePct ?? 'n/a'} | ${summary.survivalRatePct ?? 'n/a'} | ${summary.avgActualStarterRuns ?? 'n/a'} | ${summary.avgActualStarterHits ?? 'n/a'} | ${summary.avgActualStarterHr ?? 'n/a'} | ${summary.avgActualOuts ?? 'n/a'} |`
  ),
  '',
  '## Miss Samples',
  '',
  `- High-risk survivals: ${highRiskSurvivals.length}`,
  `- Low-risk collapses: ${lowRiskCollapses.length}`,
  `- Run-delta misses: ${runDeltaMisses.length}`,
  '',
  'Promotion read: shadow only. Use a larger settled window before lane promotion.',
  ''
].join('\n')

fs.mkdirSync(reportsRoot, { recursive: true })
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`)
fs.writeFileSync(markdownPath, `${markdown}\n`)

console.log(`[backtest-mlb-sp1] rows=${report.rows} matched=${report.matchedActualRows}`)
console.log(`[backtest-mlb-sp1] collapse risk ${report.directionalScores.collapseRisk.hits}/${report.directionalScores.collapseRisk.graded} (${report.directionalScores.collapseRisk.hitRatePct ?? 'n/a'}%)`)
console.log(`[backtest-mlb-sp1] runs delta ${report.directionalScores.expectedRunsAllowedDelta.hits}/${report.directionalScores.expectedRunsAllowedDelta.graded} (${report.directionalScores.expectedRunsAllowedDelta.hitRatePct ?? 'n/a'}%)`)
console.log(`[backtest-mlb-sp1] report=${path.relative(rootDir, jsonPath)}`)

if (!report.rows || !report.matchedActualRows) {
  process.exitCode = 1
}

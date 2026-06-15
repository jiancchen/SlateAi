import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { currentDayBoardForDate } from '../models/mlb/db/queries.mjs'
import { querySqlite } from '../models/mlb/db/sqlite.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const reportsRoot = path.join(rootDir, 'data-migration/reports')

const argValue = (name, fallback = '') => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const date = argValue('--date')

if (!date) {
  throw new Error('Usage: node scripts/audit-mlb-sp1.mjs --date YYYY-MM-DD')
}

const queryOptional = (sql, params = [], options = {}) => {
  try {
    return querySqlite(sql, params, options)
  } catch (error) {
    if (/no such table/i.test(error.message || '')) return []
    throw error
  }
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

const main = () => {
  fs.mkdirSync(reportsRoot, { recursive: true })
  const board = currentDayBoardForDate(date)
  const expectedProfiles = board.games.length * 2
  const expectedKeys = []
  for (const game of board.games) {
    expectedKeys.push(`${game.game_id}:away`)
    expectedKeys.push(`${game.game_id}:home`)
  }

  const tableRows = queryOptional(
    `
    select *
    from mlb_starting_pitcher_profile_v1_daily
    where source_date = ?
      and model_version = (
        select max(model_version)
        from mlb_starting_pitcher_profile_v1_daily
        where source_date = ?
      )
    `,
    [date, date],
    { maxBuffer: 1024 * 1024 * 40 }
  )
  const rowsByKey = new Map(tableRows.map((row) => [`${row.game_id}:${row.team_role}`, row]))
  const hardFailures = []
  const warnings = []
  const missing = expectedKeys.filter((key) => !rowsByKey.has(key))
  if (!tableRows.length) hardFailures.push('missing-sp1-profile-rows')
  if (missing.length) hardFailures.push(`missing-sp1-game-side-profiles:${missing.slice(0, 12).join(',')}`)

  const incompleteRows = []
  const thinRows = []
  const missingCanonicalRows = []
  const missingDeltas = []
  for (const row of tableRows) {
    const key = `${row.game_id}:${row.team_role}:${row.pitcher_name}`
    const snapshot = parseJson(row.feature_snapshot_json, {}) || {}
    const splits = snapshot.canonicalSplits || {}
    const coverage = snapshot.coverage || {}
    if (row.source_status !== 'complete') incompleteRows.push(key)
    if (num(row.confidence_score, 0) < 60) thinRows.push(key)
    if (num(coverage.hitterSplitRows, 0) < 7 || num(coverage.pitcherAllowedRows, 0) < 2) {
      missingCanonicalRows.push(key)
    }
    if (!Number.isFinite(num(row.collapse_risk_score, null)) ||
        !Number.isFinite(num(row.expected_runs_allowed_delta, null)) ||
        !Number.isFinite(num(row.yrfi_probability_delta, null))) {
      missingDeltas.push(key)
    }
    if (!splits.pitcherAllowed?.vsLhb || !splits.pitcherAllowed?.vsRhb) {
      missingCanonicalRows.push(`${key}:pitcher-handedness`)
    }
  }

  if (tableRows.length < expectedProfiles) hardFailures.push(`sp1-row-coverage-low:${tableRows.length}/${expectedProfiles}`)
  if (missingCanonicalRows.length) hardFailures.push(`canonical-split-coverage-low:${missingCanonicalRows.slice(0, 12).join(',')}`)
  if (missingDeltas.length) hardFailures.push(`sp1-deltas-missing:${missingDeltas.slice(0, 12).join(',')}`)
  if (incompleteRows.length) warnings.push(`partial-sp1-source-status:${incompleteRows.slice(0, 12).join(',')}`)
  if (thinRows.length) warnings.push(`thin-sp1-confidence:${thinRows.slice(0, 12).join(',')}`)

  const report = {
    audit: 'mlb-sp1-starter-profile',
    date,
    generatedAt: new Date().toISOString(),
    table: 'mlb_starting_pitcher_profile_v1_daily',
    expectedProfiles,
    actualProfiles: tableRows.length,
    hardFailures,
    warnings,
    rows: tableRows.map((row) => ({
      gameId: row.game_id,
      teamRole: row.team_role,
      teamName: row.team_name,
      pitcherName: row.pitcher_name,
      sourceStatus: row.source_status,
      starterProfileScore: num(row.starter_profile_score, null),
      collapseRiskScore: num(row.collapse_risk_score, null),
      handednessFragilityScore: num(row.handedness_fragility_score, null),
      weatherFragilityScore: num(row.weather_fragility_score, null),
      pitchMixFitScore: num(row.pitch_mix_fit_score, null),
      expectedRunsAllowedDelta: num(row.expected_runs_allowed_delta, null),
      yrfiProbabilityDelta: num(row.yrfi_probability_delta, null),
      confidenceScore: num(row.confidence_score, null)
    })),
    status: hardFailures.length ? 'failed' : 'passed'
  }
  const reportPath = path.join(reportsRoot, `audit_mlb_sp1_${date}.json`)
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`[audit-mlb-sp1] ${report.status}: ${tableRows.length}/${expectedProfiles} profiles, ${hardFailures.length} hard failures`)
  console.log(`[audit-mlb-sp1] report=${path.relative(rootDir, reportPath)}`)
  for (const failure of hardFailures.slice(0, 20)) console.error(`[audit-mlb-sp1] ${failure}`)
  if (hardFailures.length) process.exit(1)
}

main()

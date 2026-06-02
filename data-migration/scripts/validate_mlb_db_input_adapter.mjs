#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  gamesForDate,
  lineupCoverageForDate,
  marketCoverageForDate,
  modelArtifactCoverageForDate,
  sourceStatusForDate
} from '../../models/mlb/db/queries.mjs'

const __filename = fileURLToPath(import.meta.url)
const rootDir = path.resolve(path.dirname(__filename), '..', '..')

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: null,
    report: 'data-migration/reports/validate_mlb_db_input_adapter_2026-06-02.json'
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') options.date = args[index + 1], index += 1
    else if (arg === '--report') options.report = args[index + 1], index += 1
  }
  if (!options.date) throw new Error('Missing --date YYYY-MM-DD')
  return options
}

const addCheck = (checks, name, ok, details) => {
  checks.push({ name, ok: Boolean(ok), details })
}

const options = parseArgs()
const games = gamesForDate(options.date)
const statuses = sourceStatusForDate(options.date)
const lineup = lineupCoverageForDate(options.date)
const markets = marketCoverageForDate(options.date)
const artifacts = modelArtifactCoverageForDate(options.date)

const checks = []
addCheck(checks, 'games_available', games.length > 0, `${games.length} games`)
addCheck(checks, 'source_status_available', statuses.length > 0, `${statuses.length} source rows`)
addCheck(
  checks,
  'lineup_status_matches_coverage',
  lineup.source_status
    && Number(lineup.source_status.expected_item_count || 0) === lineup.expected_slots
    && Number(lineup.source_status.actual_item_count || 0) === lineup.slots,
  `typed slots ${lineup.slots}/${lineup.expected_slots}; status ${lineup.source_status?.actual_item_count}/${lineup.source_status?.expected_item_count}`
)
addCheck(checks, 'markets_available', markets.contracts > 0, `${markets.contracts} contracts`)
addCheck(checks, 'model_artifacts_visible', artifacts.prediction_rows_by_lane.length > 0, `${artifacts.prediction_rows_by_lane.length} lanes`)

const report = {
  generated_at: new Date().toISOString(),
  script: 'data-migration/scripts/validate_mlb_db_input_adapter.mjs',
  date: options.date,
  games: {
    count: games.length,
    sample: games.slice(0, 3)
  },
  source_status_count: statuses.length,
  lineup,
  markets,
  artifacts,
  checks,
  ok: checks.every((check) => check.ok)
}

const reportPath = path.resolve(rootDir, options.report)
fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
process.exitCode = report.ok ? 0 : 1

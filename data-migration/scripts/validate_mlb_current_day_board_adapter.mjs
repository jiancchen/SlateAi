#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { currentDayBoardForDate } from '../../models/mlb/db/queries.mjs'

const __filename = fileURLToPath(import.meta.url)
const rootDir = path.resolve(path.dirname(__filename), '..', '..')

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: null,
    report: 'data-migration/reports/validate_mlb_current_day_board_adapter_2026-06-02.json'
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
const board = currentDayBoardForDate(options.date)
const lineupSides = board.games.reduce((sum, game) => sum + Object.keys(game.lineups).length, 0)
const lineupSlots = board.games.reduce(
  (sum, game) => sum + Object.values(game.lineups).reduce((inner, lineup) => inner + lineup.slots.length, 0),
  0
)
const partialLineups = board.games.reduce(
  (sum, game) => sum + Object.values(game.lineups).filter((lineup) => lineup.lineup_status === 'partial').length,
  0
)
const marketGames = board.games.filter((game) => game.markets.length > 0).length

const checks = []
addCheck(checks, 'games_available', board.games.length > 0, `${board.games.length} games`)
addCheck(checks, 'two_lineup_sides_per_game', lineupSides === board.games.length * 2, `${lineupSides}/${board.games.length * 2}`)
addCheck(
  checks,
  'lineup_slots_match_active_source_status',
  lineupSlots === Number(board.coverage.lineup.source_status?.actual_item_count || 0),
  `${lineupSlots}/${board.coverage.lineup.source_status?.actual_item_count}`
)
addCheck(checks, 'partial_lineup_count_visible', partialLineups === board.coverage.lineup.partial_lineups, `${partialLineups}/${board.coverage.lineup.partial_lineups}`)
addCheck(checks, 'probables_two_per_game', board.coverage.starters === board.games.length * 2, `${board.coverage.starters}/${board.games.length * 2}`)
addCheck(checks, 'markets_cover_games', marketGames === board.games.length, `${marketGames}/${board.games.length}`)

const report = {
  generated_at: new Date().toISOString(),
  script: 'data-migration/scripts/validate_mlb_current_day_board_adapter.mjs',
  date: options.date,
  counts: {
    games: board.games.length,
    lineup_sides: lineupSides,
    lineup_slots: lineupSlots,
    partial_lineups: partialLineups,
    starters: board.coverage.starters,
    markets: board.coverage.markets,
    games_with_markets: marketGames
  },
  sample: board.games.slice(0, 2).map((game) => ({
    game_id: game.game_id,
    away_team: game.away_team,
    home_team: game.home_team,
    starters: game.starters.map((starter) => starter.pitcher_name),
    lineup_sides: Object.values(game.lineups).map((lineup) => ({
      team_name: lineup.team_name,
      lineup_status: lineup.lineup_status,
      slots: lineup.slots.length
    })),
    markets: game.markets.length
  })),
  checks,
  ok: checks.every((check) => check.ok)
}

const reportPath = path.resolve(rootDir, options.report)
fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
process.exitCode = report.ok ? 0 : 1

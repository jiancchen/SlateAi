#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { currentDayBoardForDate } from '../../models/mlb/db/queries.mjs'
import { loadMlbDayGamesFromDb } from '../../models/mlb/db/day-games.mjs'
import { loadMlbDayGames } from '../../pipeline/lib/load-mlb-day-games.mjs'

const __filename = fileURLToPath(import.meta.url)
const rootDir = path.resolve(path.dirname(__filename), '..', '..')

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: null,
    report: 'data-migration/reports/validate_mlb_day_games_db_loader_2026-06-02.json'
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

const countLineupSides = (games = []) =>
  games.reduce((sum, game) => {
    const statuses = game.lineupBoard?.status || {}
    return sum + ['away', 'home'].filter((side) => statuses[side]).length
  }, 0)

const countLineupSlots = (games = []) =>
  games.reduce((sum, game) => {
    const away = Array.isArray(game.lineupBoard?.away?.lineup) ? game.lineupBoard.away.lineup.length : 0
    const home = Array.isArray(game.lineupBoard?.home?.lineup) ? game.lineupBoard.home.lineup.length : 0
    return sum + away + home
  }, 0)

const options = parseArgs()
const board = currentDayBoardForDate(options.date)
const dbGames = await loadMlbDayGamesFromDb(options.date)
const activeGames = await loadMlbDayGames(options.date)

const dbGameCount = dbGames.length
const activeDbSourced = activeGames.filter((game) => game.metadata?.inputSource === 'sql-mlb.db').length
const gamesWithAnalysis = activeGames.filter((game) => game.analysis?.participant?.name).length
const gamesWithProjection = activeGames.filter((game) => game.analysis?.mlbProjection).length
const gamesWithPlayerProps = activeGames.filter((game) => game.playerProps?.available).length
const playerPropFeatured = activeGames.reduce((sum, game) => sum + (game.playerProps?.featured?.length || 0), 0)
const playerPropTargets = activeGames.reduce((sum, game) => sum + (game.playerProps?.targets?.length || 0), 0)
const gamesWithRemainingGaps = activeGames.filter((game) => game.metadata?.remainingGaps?.length).length
const dbLineupSlots = countLineupSlots(activeGames)
const dbLineupSides = countLineupSides(activeGames)

const checks = []
addCheck(checks, 'db_loader_games_match_board', dbGameCount === board.games.length, `${dbGameCount}/${board.games.length}`)
addCheck(checks, 'active_loader_uses_db', activeDbSourced === activeGames.length && activeGames.length > 0, `${activeDbSourced}/${activeGames.length}`)
addCheck(checks, 'analysis_available', gamesWithAnalysis === activeGames.length, `${gamesWithAnalysis}/${activeGames.length}`)
addCheck(checks, 'mlb_projection_available', gamesWithProjection === activeGames.length, `${gamesWithProjection}/${activeGames.length}`)
addCheck(checks, 'lineup_sides_available', dbLineupSides === activeGames.length * 2, `${dbLineupSides}/${activeGames.length * 2}`)
addCheck(
  checks,
  'lineup_slots_match_active_source',
  dbLineupSlots === Number(board.coverage.lineup.source_status?.actual_item_count || 0),
  `${dbLineupSlots}/${board.coverage.lineup.source_status?.actual_item_count}`
)
addCheck(checks, 'player_prop_surface_available', gamesWithPlayerProps === activeGames.length, `${gamesWithPlayerProps}/${activeGames.length}`)

const report = {
  generated_at: new Date().toISOString(),
  script: 'data-migration/scripts/validate_mlb_day_games_db_loader.mjs',
  date: options.date,
  counts: {
    board_games: board.games.length,
    db_loader_games: dbGameCount,
    active_loader_games: activeGames.length,
    active_db_sourced_games: activeDbSourced,
    games_with_analysis: gamesWithAnalysis,
    games_with_projection: gamesWithProjection,
    lineup_sides: dbLineupSides,
    lineup_slots: dbLineupSlots,
    games_with_player_props: gamesWithPlayerProps,
    player_prop_featured: playerPropFeatured,
    player_prop_targets: playerPropTargets,
    games_with_remaining_gaps: gamesWithRemainingGaps
  },
  remaining_gaps: Object.fromEntries(
    [...new Set(activeGames.flatMap((game) => game.metadata?.remainingGaps || []))]
      .sort()
      .map((gap) => [gap, activeGames.filter((game) => (game.metadata?.remainingGaps || []).includes(gap)).length])
  ),
  sample: activeGames.slice(0, 3).map((game) => ({
    id: game.id,
    title: game.title,
    input_source: game.metadata?.inputSource,
    pick: game.analysis?.participant?.name || null,
    confidence: game.analysis?.confidence || null,
    tier: game.analysis?.tier || null,
    lineup_status: game.lineupBoard?.status || null,
    featured_props: game.playerProps?.featured?.length || 0,
    target_props: game.playerProps?.targets?.length || 0,
    remaining_gaps: game.metadata?.remainingGaps || []
  })),
  checks,
  ok: checks.every((check) => check.ok)
}

const reportPath = path.resolve(rootDir, options.report)
fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
process.exitCode = report.ok ? 0 : 1


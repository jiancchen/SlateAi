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
const lineupPath = argValue('--lineup-file', date ? path.join(rootDir, 'data-private/lineups/mlb', `${date}-lineup-board.json`) : '')

if (!date) {
  throw new Error('Usage: node scripts/audit-mlb-player-split-families.mjs --date YYYY-MM-DD [--lineup-file path]')
}

const sqlQuote = (value) => {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}
const sqlite = (sql) =>
  execFileSync('sqlite3', ['-json', dbPath, sql], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 40
  })
const query = (sql) => JSON.parse(sqlite(sql))

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'))

const lineupPlayers = () => {
  if (!fs.existsSync(lineupPath)) return []
  const payload = readJson(lineupPath)
  const players = []
  for (const board of Object.values(payload.lineupBoardsByGameId || {})) {
    for (const teamRole of ['away', 'home']) {
      const teamBoard = board[teamRole] || {}
      for (const player of teamBoard.lineup || []) {
        players.push({
          gameId: board.gameId,
          gameTitle: board.title || '',
          teamRole,
          teamName: teamBoard.teamName || '',
          playerId: String(player.playerId || ''),
          playerName: player.name || '',
          battingOrder: player.slot ?? null,
          position: player.position || '',
          bats: player.bats || '',
          opposingStarter: teamBoard.opposingStarter?.name || '',
          opposingStarterHand: teamBoard.opposingStarter?.hand || '',
          hasSelectedSplit: Boolean(player.espnHitterSplit || player.split),
          hasFullEspnSplits: Boolean(player.espnHitterSplits?.vsLeft || player.espnHitterSplits?.vsRight)
        })
      }
    }
  }
  return players
}

const tableExists = () => {
  const rows = query(`
    select name
    from sqlite_master
    where type = 'table'
      and name = 'mlb_player_split_family_snapshots'
  `)
  return rows.length > 0
}

const main = () => {
  fs.mkdirSync(reportsRoot, { recursive: true })
  const failures = []
  const warnings = []
  const expectedPlayers = lineupPlayers()
  const expectedLineupPlayers = expectedPlayers.length
  const exists = tableExists()
  if (!exists) {
    failures.push('missing-player-split-family-table')
  }

  const pitcherRows = query(`
    select count(*) as fetched_pitchers
    from mlb_pitcher_espn_splits
    where snapshot_date = ${sqlQuote(date)}
      and source_status = 'fetched'
  `)
  const expectedPitchers = Number(pitcherRows[0]?.fetched_pitchers || 0)
  const rows = exists
    ? query(`
        select player_role, split_family, split_key, count(*) as rows
        from mlb_player_split_family_snapshots
        where snapshot_date = ${sqlQuote(date)}
        group by player_role, split_family, split_key
        order by player_role, split_family, split_key
      `)
    : []
  const countFor = (role, family, key = '') =>
    rows
      .filter((row) =>
        row.player_role === role &&
        row.split_family === family &&
        (!key || row.split_key === key)
      )
      .reduce((sum, row) => sum + Number(row.rows || 0), 0)

  const hitterHandednessRows = countFor('hitter', 'handedness')
  const pitcherHandednessRows = countFor('pitcher', 'handedness')
  const pitcherDayNightRows = countFor('pitcher', 'day_night')
  const pitcherHomeAwayRows = countFor('pitcher', 'home_away')
  const totalRows = rows.reduce((sum, row) => sum + Number(row.rows || 0), 0)
  const hitterRows = exists
    ? query(`
        select game_id, team_role, player_id, split_key, ops, source_status
        from mlb_player_split_family_snapshots
        where snapshot_date = ${sqlQuote(date)}
          and player_role = 'hitter'
          and split_family = 'handedness'
      `)
    : []
  const hitterRowKeys = new Set(hitterRows.map((row) => `${row.game_id}:${row.team_role}:${row.player_id}`))
  const hitterRowsBySelectedKey = new Map(
    hitterRows.map((row) => [`${row.game_id}:${row.team_role}:${row.player_id}:${row.split_key}`, row])
  )
  const selectedSplitKeyForHand = (hand = '') => {
    if (/^l/i.test(String(hand))) return 'vs_lhp'
    if (/^r/i.test(String(hand))) return 'vs_rhp'
    return ''
  }
  const missingHitterHandedness = expectedPlayers
    .filter((player) => !hitterRowKeys.has(`${player.gameId}:${player.teamRole}:${player.playerId}`))
  const unusableSelectedHitterHandedness = expectedPlayers
    .map((player) => ({
      ...player,
      selectedSplitKey: selectedSplitKeyForHand(player.opposingStarterHand),
      selectedRow: hitterRowsBySelectedKey.get(
        `${player.gameId}:${player.teamRole}:${player.playerId}:${selectedSplitKeyForHand(player.opposingStarterHand)}`
      )
    }))
    .filter((player) => player.selectedSplitKey && (!player.selectedRow || !Number.isFinite(Number(player.selectedRow.ops))))
  const hitterPlayersWithHandedness = expectedLineupPlayers - missingHitterHandedness.length
  const pitcherListedAsHitter = expectedPlayers.filter((player) => String(player.position || '').toUpperCase() === 'P')

  if (!totalRows) failures.push('missing-player-split-family-rows')
  if (expectedLineupPlayers && missingHitterHandedness.length) {
    failures.push(`hitter-handedness-player-coverage-low:${hitterPlayersWithHandedness}/${expectedLineupPlayers}`)
  }
  if (pitcherListedAsHitter.length) {
    failures.push(`lineup-position-pitcher-slots:${pitcherListedAsHitter.slice(0, 8).map((player) => `${player.gameId}:${player.teamRole}:${player.playerName}`).join(',')}`)
  }
  if (expectedPitchers && pitcherHandednessRows < expectedPitchers * 2) {
    failures.push(`pitcher-handedness-coverage-low:${pitcherHandednessRows}/${expectedPitchers * 2}`)
  }
  if (expectedPitchers && pitcherDayNightRows < expectedPitchers * 2) {
    failures.push(`pitcher-day-night-coverage-low:${pitcherDayNightRows}/${expectedPitchers * 2}`)
  }
  if (expectedPitchers && pitcherHomeAwayRows < expectedPitchers * 2) {
    failures.push(`pitcher-home-away-coverage-low:${pitcherHomeAwayRows}/${expectedPitchers * 2}`)
  }
  if (!expectedLineupPlayers) warnings.push('lineup-board-not-found-or-empty')
  if (!expectedPitchers) warnings.push('no-fetched-espn-pitcher-splits')
  if (unusableSelectedHitterHandedness.length) {
    warnings.push(`selected-hitter-handedness-splits-unusable:${unusableSelectedHitterHandedness.length}`)
  }

  const report = {
    audit: 'mlb-player-split-families',
    date,
    generatedAt: new Date().toISOString(),
    table: 'mlb_player_split_family_snapshots',
    expectedLineupPlayers,
    expectedPitchers,
    counts: {
      totalRows,
      hitterHandednessRows,
      hitterPlayersWithHandedness,
      pitcherHandednessRows,
      pitcherDayNightRows,
      pitcherHomeAwayRows,
      byFamily: rows
    },
    missing: {
      hitterHandedness: missingHitterHandedness.slice(0, 60),
      unusableSelectedHitterHandedness: unusableSelectedHitterHandedness.slice(0, 60).map((player) => ({
        gameId: player.gameId,
        gameTitle: player.gameTitle,
        teamRole: player.teamRole,
        teamName: player.teamName,
        playerId: player.playerId,
        playerName: player.playerName,
        battingOrder: player.battingOrder,
        position: player.position,
        bats: player.bats,
        opposingStarter: player.opposingStarter,
        opposingStarterHand: player.opposingStarterHand,
        selectedSplitKey: player.selectedSplitKey,
        sourceStatus: player.selectedRow?.source_status || 'missing-row'
      })),
      pitcherListedAsHitter: pitcherListedAsHitter.slice(0, 60)
    },
    hardFailures: failures,
    warnings,
    status: failures.length ? 'failed' : 'passed'
  }
  const reportPath = path.join(reportsRoot, `audit_mlb_player_split_families_${date}.json`)
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`[audit-mlb-player-split-families] ${report.status}: ${totalRows} rows, ${failures.length} hard failures`)
  console.log(`[audit-mlb-player-split-families] report=${path.relative(rootDir, reportPath)}`)
  for (const failure of failures.slice(0, 20)) {
    console.error(`[audit-mlb-player-split-families] ${failure}`)
  }
  for (const missing of missingHitterHandedness.slice(0, 12)) {
    console.error(`[audit-mlb-player-split-families] missing hitter split: ${missing.gameId}:${missing.teamRole}:${missing.playerName} vs ${missing.opposingStarterHand || '?'}HP ${missing.opposingStarter || ''}`.trim())
  }
  for (const missing of unusableSelectedHitterHandedness.slice(0, 12)) {
    console.error(`[audit-mlb-player-split-families] unusable selected hitter split: ${missing.gameId}:${missing.teamRole}:${missing.playerName} ${missing.selectedSplitKey} vs ${missing.opposingStarterHand || '?'}HP ${missing.opposingStarter || ''}`.trim())
  }
  for (const badSlot of pitcherListedAsHitter.slice(0, 12)) {
    console.error(`[audit-mlb-player-split-families] pitcher listed in lineup: ${badSlot.gameId}:${badSlot.teamRole}:${badSlot.playerName} slot ${badSlot.battingOrder}`)
  }
  if (failures.length) process.exit(1)
}

main()

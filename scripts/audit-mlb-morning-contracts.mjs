import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const dbPath = path.join(root, 'data-private', 'warehouse', 'sports', 'mlb', 'sql-mlb.db')
const currentRoot = path.join(root, 'web', 'public', 'data', 'current')
const reportsRoot = path.join(root, 'data-migration', 'reports')

const argValue = (name, fallback = '') => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const readJson = async (filePath, fallback = null) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

const sqliteJson = (sql) => {
  if (!fsSync.existsSync(dbPath)) return []
  const raw = execFileSync('sqlite3', ['-json', dbPath, sql], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 80
  }).trim()
  return raw ? JSON.parse(raw) : []
}

const sqlText = (value = '') => `'${String(value).replaceAll("'", "''")}'`
const array = (value) => (Array.isArray(value) ? value : [])
const fail = (failures, failure, detail = {}) => failures.push({ failure, ...detail })
const hasLineage = (row = {}) => Boolean(row.sportsbook && row.sourceName && row.sourcePath && row.marketCapturedAt)

const pitcherRows = (games = []) =>
  games.flatMap((game) =>
    ['away', 'home'].map((side) => ({
      gameId: game.id,
      gameTitle: game.title,
      side,
      starter: game.starterContext?.[side] || {}
    }))
  )

const espnCategoryMap = (starter = {}) =>
  new Map(array(starter.espnSplits?.categories).map((category) => [category.key, category]))

const auditEspnSplitTables = (games, failures) => {
  const required = ['byInningPitches', 'byBreakdown', 'byDayMonth', 'byOpponent', 'byArena', 'byBattingOrder']
  for (const row of pitcherRows(games)) {
    const status = row.starter.espnSplits?.sourceStatus
    if (status !== 'fetched') {
      fail(failures, 'espn-splits-not-fetched', {
        gameId: row.gameId,
        starter: row.starter.fullName,
        status: status || 'missing'
      })
      continue
    }
    const categories = espnCategoryMap(row.starter)
    for (const key of required) {
      const category = categories.get(key)
      if (!category || !array(category.rows).length) {
        fail(failures, 'espn-split-category-missing', {
          gameId: row.gameId,
          starter: row.starter.fullName,
          category: key
        })
      }
    }
  }
}

const auditStatMuse = (date, games, failures) => {
  const starters = pitcherRows(games)
  const dbRows = sqliteJson(`
    select game_id, pitcher_name, opponent_team, appearances, game_rows_json, statmuse_url
    from mlb_starter_vs_team_statmuse
    where snapshot_date=${sqlText(date)}
  `)
  if (dbRows.length < starters.length) {
    fail(failures, 'statmuse-db-row-count-low', { expected: starters.length, actual: dbRows.length })
  }
  for (const row of starters) {
    const statmuse = row.starter.statmuseVsOpponent
    if (!statmuse?.sourceUrl) {
      fail(failures, 'statmuse-public-missing', { gameId: row.gameId, starter: row.starter.fullName })
      continue
    }
    if (!Array.isArray(statmuse.gameRows)) {
      fail(failures, 'statmuse-year-rows-not-structured', { gameId: row.gameId, starter: row.starter.fullName })
    }
  }
}

const auditDraftKingsMarkets = (date, games, failures) => {
  const gameCount = games.length
  const rows = sqliteJson(`
    select source_name, market_type, count(distinct game_id) as games, count(*) as rows
    from market_snapshots
    where substr(coalesce(captured_at, ''), 1, 10)=${sqlText(date)}
      and lower(source_name)='draftkings'
    group by source_name, market_type
  `)
  const byMarket = Object.fromEntries(rows.map((row) => [row.market_type, Number(row.games || 0)]))
  for (const marketType of ['moneyline', 'game_total', 'first5_moneyline', 'first5_total']) {
    if ((byMarket[marketType] || 0) < gameCount) {
      fail(failures, 'draftkings-market-family-missing', {
        marketType,
        expectedGames: gameCount,
        actualGames: byMarket[marketType] || 0
      })
    }
  }
}

const auditPropLineage = (props, failures) => {
  const picks = array(props?.picks)
  const pricedTypes = new Set(['totalBases', 'singles', 'walks', 'rbi', 'hits', 'pitcherStrikeouts'])
  const missing = picks
    .filter((pick) => pricedTypes.has(pick.propType))
    .filter((pick) => !hasLineage(pick))
    .slice(0, 25)
  if (missing.length) {
    fail(failures, 'priced-props-missing-sportsbook-lineage', {
      samples: missing.map((pick) => ({
        id: pick.id,
        playerName: pick.playerName,
        propType: pick.propType,
        marketLabel: pick.marketLabel
      }))
    })
  }
}

const auditRotowireProof = (games, failures) => {
  for (const game of games) {
    for (const side of ['away', 'home']) {
      const team = game.lineupBoard?.[side] || {}
      if (team.lineupSource === 'rotowire-supplement' && !team.lineupSourceAudit) {
        fail(failures, 'rotowire-fallback-missing-substitution-audit', {
          gameId: game.id,
          side,
          teamName: team.teamName || game.matchup?.[side === 'away' ? 0 : 1]?.name
        })
      }
    }
  }
}

const auditSourceStatusMismatch = (date, failures) => {
  const propRows = sqliteJson(`
    select count(*) as rows
    from prop_market_snapshots
    where market_date=${sqlText(date)}
  `)[0]?.rows || 0
  const marketRows = sqliteJson(`
    select count(*) as rows
    from market_snapshots
    where substr(coalesce(captured_at, ''), 1, 10)=${sqlText(date)}
  `)[0]?.rows || 0
  const statuses = sqliteJson(`
    select source_name, last_status, actual_item_count, cache_valid_until
    from source_fetch_status
    where sport='mlb'
      and source_date=${sqlText(date)}
      and source_name in ('mlb_props', 'mlb_odds')
  `)
  const statusByName = Object.fromEntries(statuses.map((row) => [row.source_name, row]))
  if (propRows > 0 && statusByName.mlb_props?.last_status !== 'success') {
    fail(failures, 'source-status-row-mismatch', {
      sourceName: 'mlb_props',
      actualRows: propRows,
      sourceStatus: statusByName.mlb_props || null
    })
  }
  if (marketRows > 0 && statusByName.mlb_odds?.last_status !== 'success') {
    fail(failures, 'source-status-row-mismatch', {
      sourceName: 'mlb_odds',
      actualRows: marketRows,
      sourceStatus: statusByName.mlb_odds || null
    })
  }
}

const auditPublicSchema = (games, failures) => {
  for (const game of games) {
    if (!game.gamePk) fail(failures, 'public-schema-missing-game-pk', { gameId: game.id })
    if (!game.lineupBoard?.away?.lineup || !game.lineupBoard?.home?.lineup) {
      fail(failures, 'public-schema-missing-lineup-board', { gameId: game.id })
    }
    if (!game.analysis?.mlbProjection) fail(failures, 'public-schema-missing-mlb-projection', { gameId: game.id })
    if (!game.starterContext?.away || !game.starterContext?.home) {
      fail(failures, 'public-schema-missing-starter-context', { gameId: game.id })
    }
  }
}

const writeReport = async (date, report) => {
  await fs.mkdir(reportsRoot, { recursive: true })
  const filePath = path.join(reportsRoot, `audit_mlb_morning_contracts_${date}.json`)
  await fs.writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return filePath
}

const main = async () => {
  const date = argValue('--date')
  if (!date) throw new Error('Usage: node scripts/audit-mlb-morning-contracts.mjs --date YYYY-MM-DD')
  const summary = await readJson(path.join(currentRoot, 'summary.json'))
  const props = await readJson(path.join(currentRoot, 'props.json'), { picks: [] })
  const games = []
  for (const summaryGame of array(summary?.games).filter((game) => game.league === 'MLB')) {
    games.push(await readJson(path.join(currentRoot, 'games', `${summaryGame.id}.json`)))
  }
  const failures = []
  auditPublicSchema(games, failures)
  auditDraftKingsMarkets(date, games, failures)
  auditRotowireProof(games, failures)
  auditStatMuse(date, games, failures)
  auditEspnSplitTables(games, failures)
  auditPropLineage(props, failures)
  auditSourceStatusMismatch(date, failures)

  const report = {
    audit: 'mlb-morning-contracts',
    date,
    generatedAt: new Date().toISOString(),
    gameCount: games.length,
    propCount: array(props?.picks).length,
    failures
  }
  const reportPath = await writeReport(date, report)
  console.log(`[audit-mlb-morning-contracts] ${failures.length ? 'FAIL' : 'PASS'} ${date}`)
  console.log(`[audit-mlb-morning-contracts] report=${path.relative(root, reportPath)}`)
  if (failures.length) {
    console.error(JSON.stringify(failures.slice(0, 40), null, 2))
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(`[audit-mlb-morning-contracts] ${error.stack || error.message}`)
  process.exit(1)
})

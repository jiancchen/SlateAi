import fs from 'node:fs/promises'
import path from 'node:path'

import { loadMlbDayGames } from '../pipeline/lib/load-mlb-day-games.mjs'
import { loadMlbDayGamesFromDb } from '../models/mlb/db/day-games.mjs'
import { buildMlbPredictionEligibility } from '../models/mlb/lib/prediction-eligibility.mjs'

const root = path.resolve(import.meta.dirname, '..')
const reportsRoot = path.join(root, 'data-migration', 'reports')

const argValue = (name, fallback = '') => {
  const index = process.argv.indexOf(name)
  if (index >= 0) return process.argv[index + 1] || fallback
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`))
  return inline ? inline.slice(name.length + 1) : fallback
}

const hasFlag = (name) => process.argv.includes(name)
const array = (value) => (Array.isArray(value) ? value : [])
const asNumber = (value, fallback = null) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const sideName = (game = {}, side = 'away') =>
  game.matchup?.[side === 'away' ? 0 : 1]?.name ||
  game.participants?.[side === 'away' ? 0 : 1]?.name ||
  game[side] ||
  null

const lineups = (game = {}, side = 'away') => array(game.lineupBoard?.[side]?.lineup)

const starter = (game = {}, side = 'away') =>
  game.starterContext?.[side] ||
  game.startingPitcherContext?.[side] ||
  null

const starterSummary = (game = {}, side = 'away') => {
  const pitcher = starter(game, side)
  return {
    name: pitcher?.fullName || pitcher?.name || null,
    id: pitcher?.id ?? pitcher?.mlbPlayerId ?? pitcher?.playerId ?? null,
    hand: pitcher?.pitchHand || pitcher?.hand || null,
    usageStatus: pitcher?.usageContext?.status || null,
    espnSplitStatus: pitcher?.espnSplits?.sourceStatus || pitcher?.espnSplits?.source_status || null,
    statmuse: Boolean(pitcher?.statmuseVsOpponent?.sourceUrl || pitcher?.statmuseVsOpponent?.statmuseUrl)
  }
}

const sideLineupSummary = (game = {}, side = 'away') => {
  const board = game.lineupBoard || {}
  const team = board[side] || {}
  return {
    teamName: team.teamName || sideName(game, side),
    status: board.status?.[side] || team.status || null,
    source: team.lineupSource || team.source || null,
    count: lineups(game, side).length,
    snapshot: board.snapshot || null,
    sample: lineups(game, side).slice(0, 3).map((player) => ({
      name: player.name || player.playerName || null,
      bats: player.bats || player.batterHand || null,
      hasPitchFit: Boolean(player.pitchType?.summary),
      hasProjection: Boolean(player.metrics),
      hasHandednessSplit: Boolean(player.espnHitterSplit || player.espnHitterSplits || player.split)
    }))
  }
}

const gameKey = (game = {}) => {
  const gamePk = asNumber(game.gamePk, null)
  if (gamePk !== null) return `pk:${gamePk}`
  return `id:${game.id || `${sideName(game, 'away') || ''}-${sideName(game, 'home') || ''}`}`
}

const gameSnapshot = (game = {}) => {
  const eligibility = buildMlbPredictionEligibility(game, { requireAddendums: true })
  const analysis = game.analysis || {}
  return {
    id: game.id || null,
    gamePk: asNumber(game.gamePk, null),
    title: game.title || null,
    start: game.start || null,
    eligible: eligibility.eligible,
    status: eligibility.status,
    hardFailures: eligibility.hardFailures,
    warnings: eligibility.warnings,
    lineup: {
      away: sideLineupSummary(game, 'away'),
      home: sideLineupSummary(game, 'home')
    },
    pitchers: {
      away: starterSummary(game, 'away'),
      home: starterSummary(game, 'home')
    },
    addendums: eligibility.addendums,
    analysis: {
      available: Boolean(analysis.available),
      participant: analysis.participant?.name || null,
      confidence: analysis.confidence ?? null,
      hasProjection: Boolean(analysis.mlbProjection),
      hasFirst5Moneyline: Boolean(analysis.mlbProjection?.first5Moneyline),
      hasTotals: Boolean(analysis.mlbProjection?.totals)
    },
    markets: {
      moneyline: Boolean(game.moneyline?.available),
      oddsMarkets: array(game.odds?.markets).length
    }
  }
}

const compareValues = ({ label, generated, db, mismatches, severity = 'hard' }) => {
  if (JSON.stringify(generated) !== JSON.stringify(db)) {
    mismatches.push({ field: label, severity, generated, db })
  }
}

const compareMatchedGame = ({ generated, db }) => {
  const generatedSnapshot = gameSnapshot(generated)
  const dbSnapshot = gameSnapshot(db)
  const mismatches = []

  compareValues({
    label: 'eligibility',
    generated: {
      eligible: generatedSnapshot.eligible,
      hardFailures: generatedSnapshot.hardFailures
    },
    db: {
      eligible: dbSnapshot.eligible,
      hardFailures: dbSnapshot.hardFailures
    },
    mismatches
  })

  for (const side of ['away', 'home']) {
    compareValues({
      label: `${side}.lineup.count`,
      generated: generatedSnapshot.lineup[side].count,
      db: dbSnapshot.lineup[side].count,
      mismatches
    })
    compareValues({
      label: `${side}.lineup.status`,
      generated: generatedSnapshot.lineup[side].status,
      db: dbSnapshot.lineup[side].status,
      mismatches,
      severity: 'warning'
    })
    compareValues({
      label: `${side}.lineup.source`,
      generated: generatedSnapshot.lineup[side].source,
      db: dbSnapshot.lineup[side].source,
      mismatches,
      severity: 'warning'
    })
    compareValues({
      label: `${side}.starter.identity`,
      generated: {
        name: generatedSnapshot.pitchers[side].name,
        id: generatedSnapshot.pitchers[side].id,
        hand: generatedSnapshot.pitchers[side].hand,
        espnSplitStatus: generatedSnapshot.pitchers[side].espnSplitStatus
      },
      db: {
        name: dbSnapshot.pitchers[side].name,
        id: dbSnapshot.pitchers[side].id,
        hand: dbSnapshot.pitchers[side].hand,
        espnSplitStatus: dbSnapshot.pitchers[side].espnSplitStatus
      },
      mismatches
    })
    compareValues({
      label: `${side}.starter.context`,
      generated: {
        usageStatus: generatedSnapshot.pitchers[side].usageStatus,
        statmuse: generatedSnapshot.pitchers[side].statmuse
      },
      db: {
        usageStatus: dbSnapshot.pitchers[side].usageStatus,
        statmuse: dbSnapshot.pitchers[side].statmuse
      },
      mismatches,
      severity: 'warning'
    })
  }

  compareValues({
    label: 'addendums',
    generated: generatedSnapshot.addendums,
    db: dbSnapshot.addendums,
    mismatches
  })
  compareValues({
    label: 'analysis',
    generated: generatedSnapshot.analysis,
    db: dbSnapshot.analysis,
    mismatches,
    severity: 'warning'
  })

  return {
    key: gameKey(generated),
    id: generatedSnapshot.id || dbSnapshot.id,
    title: generatedSnapshot.title || dbSnapshot.title,
    generated: generatedSnapshot,
    db: dbSnapshot,
    mismatches
  }
}

const writeReport = async (date, report) => {
  await fs.mkdir(reportsRoot, { recursive: true })
  const filePath = path.join(reportsRoot, `audit_mlb_generated_db_parity_${date}.json`)
  await fs.writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return filePath
}

const main = async () => {
  const date = argValue('--date')
  if (!date) throw new Error('Usage: node scripts/audit-mlb-generated-db-parity.mjs --date YYYY-MM-DD [--allow-failures]')

  const previousDisableDb = process.env.MLB_DAY_GAMES_DISABLE_DB
  process.env.MLB_DAY_GAMES_DISABLE_DB = '1'
  const generatedGames = await loadMlbDayGames(date)
  if (previousDisableDb === undefined) delete process.env.MLB_DAY_GAMES_DISABLE_DB
  else process.env.MLB_DAY_GAMES_DISABLE_DB = previousDisableDb
  const dbGames = await loadMlbDayGamesFromDb(date)

  const generatedByKey = new Map(generatedGames.map((game) => [gameKey(game), game]))
  const dbByKey = new Map(dbGames.map((game) => [gameKey(game), game]))
  const missingInDb = generatedGames
    .filter((game) => !dbByKey.has(gameKey(game)))
    .map(gameSnapshot)
  const extraInDb = dbGames
    .filter((game) => !generatedByKey.has(gameKey(game)))
    .map(gameSnapshot)
  const matched = generatedGames
    .filter((game) => dbByKey.has(gameKey(game)))
    .map((generated) => compareMatchedGame({ generated, db: dbByKey.get(gameKey(generated)) }))

  const generatedEligible = generatedGames.filter((game) =>
    buildMlbPredictionEligibility(game, { requireAddendums: true }).eligible
  ).length
  const dbEligible = dbGames.filter((game) =>
    buildMlbPredictionEligibility(game, { requireAddendums: true }).eligible
  ).length
  const mismatchRows = matched.filter((row) => row.mismatches.length)
  const blockingMismatchRows = matched.filter((row) => row.mismatches.some((mismatch) => mismatch.severity === 'hard'))
  const warningMismatchRows = matched.filter((row) => row.mismatches.some((mismatch) => mismatch.severity === 'warning'))
  const hardFailures = [
    ...(missingInDb.length ? [{ failure: 'generated-games-missing-in-db', count: missingInDb.length }] : []),
    ...(extraInDb.length ? [{ failure: 'db-games-not-in-generated', count: extraInDb.length }] : []),
    ...(generatedEligible !== dbEligible
      ? [{ failure: 'eligible-count-mismatch', generatedEligible, dbEligible }]
      : []),
    ...(blockingMismatchRows.length ? [{ failure: 'matched-game-blocking-context-mismatch', count: blockingMismatchRows.length }] : [])
  ]

  const report = {
    audit: 'mlb-generated-db-parity',
    date,
    generatedAt: new Date().toISOString(),
    status: hardFailures.length ? 'fail' : 'pass',
    summary: {
      generatedGames: generatedGames.length,
      dbGames: dbGames.length,
      generatedEligible,
      dbEligible,
      missingInDb: missingInDb.length,
      extraInDb: extraInDb.length,
      matchedGames: matched.length,
      mismatchedMatchedGames: mismatchRows.length,
      blockingMismatchedGames: blockingMismatchRows.length,
      warningMismatchedGames: warningMismatchRows.length
    },
    hardFailures,
    missingInDb,
    extraInDb,
    matched
  }
  const reportPath = await writeReport(date, report)
  console.log(`[audit-mlb-generated-db-parity] ${report.status.toUpperCase()} ${date}`)
  console.log(`[audit-mlb-generated-db-parity] generated=${generatedGames.length} db=${dbGames.length} generatedEligible=${generatedEligible} dbEligible=${dbEligible} blockingMismatched=${blockingMismatchRows.length} warningMismatched=${warningMismatchRows.length}`)
  console.log(`[audit-mlb-generated-db-parity] report=${path.relative(root, reportPath)}`)

  if (hardFailures.length && !hasFlag('--allow-failures')) {
    console.error(JSON.stringify(hardFailures, null, 2))
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(`[audit-mlb-generated-db-parity] ${error.stack || error.message}`)
  process.exit(1)
})

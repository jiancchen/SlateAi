import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')

const argValue = (name, fallback = '') => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const supplementalByDate = {
  '2026-06-05': [
    {
      gameId: 'red-sox-yankees',
      side: 'home',
      teamName: 'Yankees',
      slot: 8,
      playerId: 682987,
      name: 'Spencer Jones',
      position: 'RF',
      bats: 'L',
      statcastTrend: {
        gamesSample7: 0,
        paSample7: 0,
        bbeSample7: 0,
        rolling7Xwoba: null,
        rolling14Xwoba: null,
        rolling30Xwoba: 0.259,
        rolling7Xba: null,
        rolling14Xba: null,
        rolling30Xba: 0.249,
        rolling7Xslg: null,
        rolling14Xslg: null,
        rolling30Xslg: 0.383,
        rolling7BarrelPct: null,
        rolling14BarrelPct: null,
        rolling30BarrelPct: 0,
        rolling7HardHitPct: null,
        rolling14HardHitPct: null,
        rolling30HardHitPct: 26.2,
        rolling7SweetSpotPct: null,
        rolling14SweetSpotPct: null,
        rolling30SweetSpotPct: 21.4,
        trendSignal: 'low-sample'
      }
    },
    {
      gameId: 'guardians-rangers',
      side: 'home',
      teamName: 'Rangers',
      slot: 2,
      playerId: 694671,
      name: 'Wyatt Langford',
      position: 'LF',
      bats: 'R'
    },
    {
      gameId: 'reds-cardinals',
      side: 'home',
      teamName: 'Cardinals',
      slot: 5,
      playerId: 663457,
      name: 'Lars Nootbaar',
      position: 'LF',
      bats: 'L'
    }
  ]
}

const savantFor = (player) => ({
  playerId: player.playerId,
  playerUrl: `https://baseballsavant.mlb.com/savant-player/${player.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${player.playerId}`,
  statsSuffix: 'r-hitting-mlb',
  season: 2026,
  statsUrls: {
    statcast: `https://baseballsavant.mlb.com/savant-player/${player.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${player.playerId}?stats=statcast-r-hitting-mlb&season=2026`,
    splits: `https://baseballsavant.mlb.com/savant-player/${player.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${player.playerId}?stats=splits-r-hitting-mlb&season=2026`,
    gamelogs: `https://baseballsavant.mlb.com/savant-player/${player.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${player.playerId}?stats=gamelogs-r-hitting-mlb&season=2026`
  }
})

const supplementalEntry = (player) => ({
  playerId: player.playerId,
  slot: player.slot,
  name: player.name,
  position: player.position,
  bats: player.bats,
  savant: savantFor(player),
  season: {
    gamesPlayed: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    walks: 0,
    totalBases: 0,
    atBats: 0,
    plateAppearances: 0,
    avg: null,
    obp: null,
    slg: null,
    ops: null,
    hitRate: null,
    singlesRate: null,
    hrRate: null,
    walkRate: null,
    totalBasesRate: null
  },
  recent: {
    gamesPlayed: 0,
    hits: 0,
    totalBases: 0,
    atBats: 0,
    plateAppearances: 0,
    avg: null,
    obp: null,
    slg: null,
    ops: null,
    hitRate: null,
    singlesRate: null,
    hrRate: null,
    walkRate: null,
    totalBasesRate: null
  },
  split: {
    plateAppearances: 0,
    atBats: 0,
    hits: 0,
    totalBases: 0,
    avg: null,
    obp: null,
    slg: null,
    ops: null,
    hitRate: null,
    singlesRate: null,
    hrRate: null,
    walkRate: null,
    totalBasesRate: null,
    source: 'supplemental lineup repair; split unavailable'
  },
  metrics: {
    powerScore: 50,
    contactScore: 50,
    patienceScore: 50,
    formScore: 50,
    splitScore: 50,
    varianceScore: 65,
    pitchTypeFitScore: 50,
    pitchTypeGrade: 0,
    pitchTypeCoveragePct: 0,
    matchupScore: 50,
    matchupGrade: 0
  },
  pitchType: {
    fitScore: 50,
    fitGrade: 0,
    coveragePct: 0,
    summary: 'Supplemental lineup slot; pitch-fit source row unavailable',
    topPitches: []
  },
  statcastTrend: player.statcastTrend || {
    gamesSample7: 0,
    paSample7: 0,
    bbeSample7: 0,
    rolling7Xwoba: null,
    rolling14Xwoba: null,
    rolling30Xwoba: null,
    trendSignal: 'missing'
  },
  opponentContext: null,
  careerProfile: null,
  summary: `${player.name} is inserted from the supplemental lineup repair so the posted ${player.teamName} batting order remains complete. Treat this row as lineup identity coverage only; projection sub-sources were not available for this hitter in the refreshed export.`,
  tags: ['supplemental-lineup-repair', 'low-confidence-context'],
  sourceNote: 'Supplemental lineup repair; do not treat placeholder metrics as model evidence.'
})

const serializeModule = ({ meta, lineupBoardsByGameId, lineupMatchupContextByGameId }) =>
  `export const lineupSnapshotMeta = ${JSON.stringify(meta, null, 2)}\n\n` +
  `export const lineupBoardsByGameId = ${JSON.stringify(lineupBoardsByGameId, null, 2)}\n\n` +
  `export const lineupMatchupContextByGameId = ${JSON.stringify(lineupMatchupContextByGameId, null, 2)}\n`

const applyRepairs = (lineupBoardsByGameId, repairs) => {
  const applied = []
  for (const repair of repairs) {
    const board = lineupBoardsByGameId[repair.gameId]
    const side = board?.[repair.side]
    if (!side?.lineup) {
      applied.push({ ...repair, status: 'missing-board' })
      continue
    }
    if (side.lineup.some((player) => Number(player.slot) === repair.slot || Number(player.playerId) === repair.playerId)) {
      applied.push({ ...repair, status: 'already-present' })
      continue
    }
    side.lineup.push(supplementalEntry(repair))
    side.lineup.sort((left, right) => Number(left.slot || 0) - Number(right.slot || 0))
    side.lineupSource = `${side.lineupSource || 'lineup'} + supplemental-repair`
    applied.push({ ...repair, status: 'inserted' })
  }
  return applied
}

const main = async () => {
  const date = argValue('--date')
  if (!date) throw new Error('Usage: node scripts/repair-mlb-lineup-supplements.mjs --date YYYY-MM-DD')
  const repairs = supplementalByDate[date] || []
  if (!repairs.length) {
    console.log(JSON.stringify({ date, repairs: 0, inserted: 0 }))
    return
  }

  const modulePath = path.join(root, 'web', 'src', 'lib', `day-${date}-lineups.js`)
  const jsonPath = path.join(root, 'data-private', 'lineups', 'mlb', `${date}-lineup-board.json`)
  const module = await import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`)
  const lineupBoardsByGameId = JSON.parse(JSON.stringify(module.lineupBoardsByGameId || {}))
  const lineupMatchupContextByGameId = JSON.parse(JSON.stringify(module.lineupMatchupContextByGameId || {}))
  const meta = JSON.parse(JSON.stringify(module.lineupSnapshotMeta || { date }))
  const applied = applyRepairs(lineupBoardsByGameId, repairs)
  meta.playerCount = Object.values(lineupBoardsByGameId).reduce(
    (sum, board) => sum + (board.away?.lineup?.length || 0) + (board.home?.lineup?.length || 0),
    0
  )
  meta.supplementalRepairs = applied
  await fs.writeFile(modulePath, serializeModule({ meta, lineupBoardsByGameId, lineupMatchupContextByGameId }), 'utf8')
  await fs.writeFile(jsonPath, `${JSON.stringify({ meta, lineupBoardsByGameId, lineupMatchupContextByGameId }, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({
    date,
    repairs: applied.length,
    inserted: applied.filter((row) => row.status === 'inserted').length,
    playerCount: meta.playerCount,
    shortLineups: Object.values(lineupBoardsByGameId).flatMap((board) =>
      ['away', 'home']
        .filter((side) => (board[side]?.lineup?.length || 0) !== 9)
        .map((side) => ({ gameId: board.gameId, side, teamName: board[side]?.teamName, count: board[side]?.lineup?.length || 0 }))
    )
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

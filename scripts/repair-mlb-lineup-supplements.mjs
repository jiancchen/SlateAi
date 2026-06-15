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
  '2026-06-14': [],
  '2026-06-11': [
    {
      gameId: 'dodgers-pirates',
      side: 'home',
      teamName: 'Pirates',
      slot: 5,
      playerId: 663968,
      name: 'Jake Mangum',
      position: 'RF',
      bats: 'S',
      statcastTrend: {
        sourceAsOfDate: '2026-06-06',
        gamesSample7: 4,
        paSample7: 18,
        bbeSample7: 36,
        rolling7Xwoba: 0.334,
        rolling14Xwoba: 0.312,
        rolling30Xwoba: 0.28,
        rolling7Xba: 0.293,
        rolling14Xba: 0.272,
        rolling30Xba: 0.256,
        rolling7Xslg: 0.471,
        rolling14Xslg: 0.4,
        rolling30Xslg: 0.354,
        rolling7BarrelPct: 2.8,
        rolling14BarrelPct: 1.8,
        rolling30BarrelPct: 1.2,
        rolling7HardHitPct: 16.7,
        rolling14HardHitPct: 12.7,
        rolling30HardHitPct: 11.2,
        rolling7SweetSpotPct: 44.4,
        rolling14SweetSpotPct: 36.4,
        rolling30SweetSpotPct: 36.2,
        xwobaTrend: 0.054,
        barrelTrend: 1.6,
        hardHitTrend: 5.5,
        sweetSpotTrend: 8.2,
        trendSignal: 'improving'
      }
    }
  ],
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

const replacementByDate = {
  '2026-06-14': [
    {
      gameId: 'rockies-athletics',
      side: 'away',
      teamName: 'Rockies',
      source: 'RotoWire expected lineup, 2026-06-14 Rockies @ Athletics',
      players: [
        { slot: 1, playerId: 664983, name: 'Jake McCarthy', position: 'LF', bats: 'L' },
        { slot: 2, playerId: 650489, name: 'Willi Castro', position: '2B', bats: 'S' },
        { slot: 3, playerId: 681198, name: 'TJ Rumfield', position: '1B', bats: 'L' },
        { slot: 4, playerId: 696100, name: 'Hunter Goodman', position: 'C', bats: 'R' },
        { slot: 5, playerId: 687859, name: 'Troy Johnston', position: 'RF', bats: 'L' },
        { slot: 6, playerId: 678662, name: 'Ezequiel Tovar', position: 'SS', bats: 'R' },
        { slot: 7, playerId: 694249, name: 'Cole Carrigg', position: 'CF', bats: 'S' },
        { slot: 8, playerId: 691720, name: 'Kyle Karros', position: '3B', bats: 'R' },
        { slot: 9, playerId: 666397, name: 'Edouard Julien', position: 'DH', bats: 'L' }
      ]
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

const applyReplacements = (lineupBoardsByGameId, lineupMatchupContextByGameId, replacements) => {
  const applied = []
  for (const replacement of replacements) {
    const board = lineupBoardsByGameId[replacement.gameId]
    const side = board?.[replacement.side]
    if (!side?.lineup) {
      applied.push({ ...replacement, status: 'missing-board' })
      continue
    }

    const byPlayerId = new Map(side.lineup.map((player) => [Number(player.playerId), player]))
    const byName = new Map(side.lineup.map((player) => [String(player.name || '').toLowerCase(), player]))
    side.lineup = replacement.players.map((player) => {
      const existing = byPlayerId.get(Number(player.playerId)) || byName.get(String(player.name || '').toLowerCase())
      if (!existing) return supplementalEntry({ ...player, teamName: replacement.teamName })
      return {
        ...existing,
        slot: player.slot,
        position: player.position || existing.position,
        bats: player.bats || existing.bats,
        sourceNote: [existing.sourceNote, `${replacement.source}; slot/position repaired`].filter(Boolean).join(' | ')
      }
    }).sort((left, right) => Number(left.slot || 0) - Number(right.slot || 0))
    side.lineupSource = `${side.lineupSource || 'lineup'} + supplemental-replacement`
    if (side.aggregate) side.aggregate.trackedBatters = side.lineup.length

    const matchupContext = lineupMatchupContextByGameId?.[replacement.gameId]?.[replacement.teamName]
    if (matchupContext) {
      matchupContext.trackedBatters = side.lineup.length
      matchupContext.supplementalReplacement = replacement.source
    }
    applied.push({
      gameId: replacement.gameId,
      side: replacement.side,
      teamName: replacement.teamName,
      source: replacement.source,
      status: 'replaced',
      playerCount: side.lineup.length,
      supplementalPlayers: replacement.players
        .filter((player) => !byPlayerId.has(Number(player.playerId)) && !byName.has(String(player.name || '').toLowerCase()))
        .map((player) => player.name)
    })
  }
  return applied
}

const main = async () => {
  const date = argValue('--date')
  if (!date) throw new Error('Usage: node scripts/repair-mlb-lineup-supplements.mjs --date YYYY-MM-DD')
  const repairs = supplementalByDate[date] || []
  const replacements = replacementByDate[date] || []
  if (!repairs.length && !replacements.length) {
    console.log(JSON.stringify({ date, repairs: 0, replacements: 0, inserted: 0 }))
    return
  }

  const modulePath = path.join(root, 'web', 'src', 'lib', `day-${date}-lineups.js`)
  const jsonPath = path.join(root, 'data-private', 'lineups', 'mlb', `${date}-lineup-board.json`)
  const module = await import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`)
  const lineupBoardsByGameId = JSON.parse(JSON.stringify(module.lineupBoardsByGameId || {}))
  const lineupMatchupContextByGameId = JSON.parse(JSON.stringify(module.lineupMatchupContextByGameId || {}))
  const meta = JSON.parse(JSON.stringify(module.lineupSnapshotMeta || { date }))
  const replaced = applyReplacements(lineupBoardsByGameId, lineupMatchupContextByGameId, replacements)
  const applied = applyRepairs(lineupBoardsByGameId, repairs)
  meta.playerCount = Object.values(lineupBoardsByGameId).reduce(
    (sum, board) => sum + (board.away?.lineup?.length || 0) + (board.home?.lineup?.length || 0),
    0
  )
  meta.supplementalRepairs = applied
  meta.supplementalReplacements = replaced
  await fs.writeFile(modulePath, serializeModule({ meta, lineupBoardsByGameId, lineupMatchupContextByGameId }), 'utf8')
  await fs.writeFile(jsonPath, `${JSON.stringify({ meta, lineupBoardsByGameId, lineupMatchupContextByGameId }, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({
    date,
    repairs: applied.length,
    replacements: replaced.length,
    inserted: applied.filter((row) => row.status === 'inserted').length,
    replaced: replaced.filter((row) => row.status === 'replaced').length,
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

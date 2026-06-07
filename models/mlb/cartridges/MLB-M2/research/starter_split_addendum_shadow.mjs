import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { buildGameStarterSplitAddendum } from '../lib/starter-split-addendum.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..', '..', '..')
const sqlMlbDb = path.join(rootDir, 'data-private', 'warehouse', 'sports', 'mlb', 'sql-mlb.db')

const argValue = (name, fallback = '') => {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const options = {
  date: argValue('--date', '2026-06-06'),
  db: argValue('--db', sqlMlbDb)
}

const sqlQuote = (value) => `'${String(value).replace(/'/g, "''")}'`

const sqliteJson = (sql) => {
  const text = execFileSync('sqlite3', ['-json', options.db, sql], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 80
  })
  return JSON.parse(text || '[]')
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))

const round = (value, digits = 1) => {
  if (!Number.isFinite(value)) return null
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

const pct = (value) => (Number.isFinite(value) ? `${round(value, 1)}%` : 'n/a')

const hitLabel = (hit) => (hit === null ? 'n/a' : hit ? 'hit' : 'miss')

const firstInningPickFromYes = (yesPct) => {
  if (!Number.isFinite(yesPct)) return 'Pass'
  if (yesPct >= 55) return 'YRFI'
  if (yesPct <= 45) return 'NRFI'
  return 'Pass'
}

const totalSide = (projection, line) => {
  if (!Number.isFinite(projection) || !Number.isFinite(line)) return 'Pass'
  const edge = projection - line
  if (edge >= 0.6) return 'Over'
  if (edge <= -0.6) return 'Under'
  return 'Pass'
}

const actualTotalSide = (actual, line) => {
  if (!Number.isFinite(actual) || !Number.isFinite(line)) return 'Unknown'
  if (actual > line) return 'Over'
  if (actual < line) return 'Under'
  return 'Push'
}

const sourceKey = (row) => `${row.game_id}|${String(row.pitcher_name || '').toLowerCase()}`

const findSource = (map, game, pitcherName) => {
  const normalizedPitcher = String(pitcherName || '').toLowerCase()
  const gameIds = [`mlb-${game.gamePk}`, game.id].filter(Boolean)
  for (const gameId of gameIds) {
    const row = map.get(`${gameId}|${normalizedPitcher}`)
    if (row) return row
  }
  return null
}

const loadSources = (date) => {
  const espnRows = sqliteJson(`
    select *
    from mlb_pitcher_espn_splits
    where snapshot_date = ${sqlQuote(date)}
  `)
  const statmuseRows = sqliteJson(`
    select *
    from mlb_starter_vs_team_statmuse
    where snapshot_date = ${sqlQuote(date)}
  `)
  return {
    espn: new Map(espnRows.map((row) => [sourceKey(row), row])),
    statmuse: new Map(statmuseRows.map((row) => [sourceKey(row), row])),
    counts: {
      espn: espnRows.length,
      statmuse: statmuseRows.length
    }
  }
}

const loadPhaseOutcomes = (date) => {
  const rows = sqliteJson(`
    select *
    from mlb_phase_outcomes_daily
    where game_date = ${sqlQuote(date)}
  `)
  const byGame = new Map()
  for (const row of rows) {
    const key = String(row.game_pk)
    const entry = byGame.get(key) || {}
    entry[row.team_role] = row
    byGame.set(key, entry)
  }
  return byGame
}

const loadGames = (date) => {
  const gamesDir = path.join(rootDir, 'published-data', 'slates', date, 'games')
  if (!fs.existsSync(gamesDir)) throw new Error(`Missing published games dir: ${gamesDir}`)
  return fs
    .readdirSync(gamesDir)
    .filter((file) => file.endsWith('.json') && !file.startsWith('rg-'))
    .sort()
    .map((file) => readJson(path.join(gamesDir, file)))
    .filter((game) => game.league === 'MLB')
}

const buildRow = ({ game, sources, phase }) => {
  const gameId = `mlb-${game.gamePk}`
  const awayPitcher = game?.starterContext?.away?.fullName || ''
  const homePitcher = game?.starterContext?.home?.fullName || ''
  const awayEspn = findSource(sources.espn, game, awayPitcher)
  const homeEspn = findSource(sources.espn, game, homePitcher)
  const awayStatmuse = findSource(sources.statmuse, game, awayPitcher)
  const homeStatmuse = findSource(sources.statmuse, game, homePitcher)
  const addendum = buildGameStarterSplitAddendum({
    game,
    awayEspnSplits: awayEspn,
    homeEspnSplits: homeEspn,
    awayStatmuseVsOpponent: awayStatmuse,
    homeStatmuseVsOpponent: homeStatmuse
  })
  const hasAnyAddendumSource =
    Boolean(awayEspn) ||
    Boolean(homeEspn) ||
    Boolean(awayStatmuse) ||
    Boolean(homeStatmuse)

  const firstInning = game?.analysis?.mlbProjection?.firstInning || {}
  const totals = game?.analysis?.mlbProjection?.totals || {}
  const f5 = totals.first5 || {}
  const baselineYesPct = Number(firstInning.yesProbabilityPct)
  const adjustedYesPct = Number.isFinite(baselineYesPct)
    ? Math.min(99, Math.max(1, baselineYesPct + addendum.adjustments.yrfiProbabilityPct))
    : null
  const baselineFirstInningPick = firstInning.pick || firstInningPickFromYes(baselineYesPct)
  const adjustedFirstInningPick = hasAnyAddendumSource
    ? firstInningPickFromYes(adjustedYesPct)
    : baselineFirstInningPick
  const line = Number(totals.postedFirst5TotalLine ?? totals.derivedFirst5TotalLine ?? totals.runShareFirst5TotalLine)
  const baselineF5Projection = Number(totals.tailAdjustedProjectedFirst5TotalRuns ?? totals.projectedFirst5TotalRuns)
  const adjustedF5Projection = Number.isFinite(baselineF5Projection)
    ? baselineF5Projection + addendum.adjustments.first5TotalRuns
    : null
  const baselineF5TotalLean = f5.lean === 'Over' || f5.lean === 'Under' ? f5.lean : totalSide(baselineF5Projection, line)
  const adjustedF5TotalLean = hasAnyAddendumSource
    ? totalSide(adjustedF5Projection, line)
    : baselineF5TotalLean

  const awayOutcome = phase?.away
  const homeOutcome = phase?.home
  const actualFirstInningYes =
    awayOutcome && homeOutcome
      ? Number(awayOutcome.runs_first1 || 0) + Number(homeOutcome.runs_first1 || 0) > 0
      : null
  const actualFirst5Total =
    awayOutcome && homeOutcome
      ? Number(awayOutcome.runs_first5 || 0) + Number(homeOutcome.runs_first5 || 0)
      : null
  const actualF5TotalSide = actualTotalSide(actualFirst5Total, line)
  const baselineFirstInningHit =
    actualFirstInningYes === null || baselineFirstInningPick === 'Pass'
      ? null
      : (baselineFirstInningPick === 'YRFI') === actualFirstInningYes
  const adjustedFirstInningHit =
    actualFirstInningYes === null || adjustedFirstInningPick === 'Pass'
      ? null
      : (adjustedFirstInningPick === 'YRFI') === actualFirstInningYes
  const baselineF5TotalHit =
    actualF5TotalSide === 'Unknown' || actualF5TotalSide === 'Push' || baselineF5TotalLean === 'Pass'
      ? null
      : baselineF5TotalLean === actualF5TotalSide
  const adjustedF5TotalHit =
    actualF5TotalSide === 'Unknown' || actualF5TotalSide === 'Push' || adjustedF5TotalLean === 'Pass'
      ? null
      : adjustedF5TotalLean === actualF5TotalSide

  return {
    gameId,
    title: game.title,
    sourceCoverage: {
      espn: [Boolean(awayEspn), Boolean(homeEspn)],
      statmuse: [Boolean(awayStatmuse), Boolean(homeStatmuse)]
    },
    baseline: {
      firstInningPick: baselineFirstInningPick,
      firstInningYesPct: round(baselineYesPct, 1),
      f5TotalLean: baselineF5TotalLean,
      f5Projection: round(baselineF5Projection, 1),
      f5Line: round(line, 1)
    },
    addendum,
    adjusted: {
      firstInningPick: adjustedFirstInningPick,
      firstInningYesPct: round(adjustedYesPct, 1),
      f5TotalLean: adjustedF5TotalLean,
      f5Projection: round(adjustedF5Projection, 2),
      awayFirst5LeadProbabilityPctDelta: addendum.adjustments.awayFirst5LeadProbabilityPct
    },
    actual: {
      firstInningYes: actualFirstInningYes,
      f5Total: actualFirst5Total,
      f5TotalSide: actualF5TotalSide,
      awayFirst5Runs: awayOutcome ? Number(awayOutcome.runs_first5 || 0) : null,
      homeFirst5Runs: homeOutcome ? Number(homeOutcome.runs_first5 || 0) : null
    },
    results: {
      baselineFirstInningHit,
      adjustedFirstInningHit,
      baselineF5TotalHit,
      adjustedF5TotalHit
    }
  }
}

const summarizeBooleanHits = (rows, key) => {
  const graded = rows.map((row) => row.results[key]).filter((value) => value !== null)
  const hits = graded.filter(Boolean).length
  return {
    graded: graded.length,
    hits,
    misses: graded.length - hits,
    hitRate: graded.length ? hits / graded.length : null
  }
}

const highConfidenceMisses = (rows, mode) =>
  rows
    .filter((row) => {
      const yesPct = mode === 'baseline' ? row.baseline.firstInningYesPct : row.adjusted.firstInningYesPct
      const pick = mode === 'baseline' ? row.baseline.firstInningPick : row.adjusted.firstInningPick
      const hit = mode === 'baseline' ? row.results.baselineFirstInningHit : row.results.adjustedFirstInningHit
      const confidence = pick === 'YRFI' ? yesPct : pick === 'NRFI' ? 100 - yesPct : null
      return hit === false && Number.isFinite(confidence) && confidence >= 65
    })
    .map((row) => row.title)

const writeReports = ({ date, rows, sources }) => {
  const summary = {
    date,
    sourceRows: sources.counts,
    sourceCoverage: {
      games: rows.length,
      fullEspnGames: rows.filter((row) => row.sourceCoverage.espn.every(Boolean)).length,
      fullStatmuseGames: rows.filter((row) => row.sourceCoverage.statmuse.every(Boolean)).length
    },
    firstInning: {
      baseline: summarizeBooleanHits(rows, 'baselineFirstInningHit'),
      adjusted: summarizeBooleanHits(rows, 'adjustedFirstInningHit'),
      baselineHighConfidenceMisses: highConfidenceMisses(rows, 'baseline'),
      adjustedHighConfidenceMisses: highConfidenceMisses(rows, 'adjusted')
    },
    first5Total: {
      baseline: summarizeBooleanHits(rows, 'baselineF5TotalHit'),
      adjusted: summarizeBooleanHits(rows, 'adjustedF5TotalHit')
    }
  }
  const reportDir = path.join(rootDir, 'models', 'mlb', 'cartridges', 'MLB-M2', 'reports')
  fs.mkdirSync(reportDir, { recursive: true })
  const jsonPath = path.join(reportDir, `starter-split-addendum-shadow-${date}.json`)
  const mdPath = path.join(reportDir, `starter-split-addendum-shadow-${date}.md`)
  fs.writeFileSync(jsonPath, `${JSON.stringify({ summary, rows }, null, 2)}\n`)
  fs.writeFileSync(mdPath, [
    `# Starter Split Addendum Shadow - ${date}`,
    '',
    'This is a shadow report. It does not change live M2 predictions.',
    '',
    '## Source Coverage',
    '',
    `- ESPN split rows: ${sources.counts.espn}`,
    `- StatMuse rows: ${sources.counts.statmuse}`,
    `- Games with both ESPN starters: ${summary.sourceCoverage.fullEspnGames}/${summary.sourceCoverage.games}`,
    `- Games with both StatMuse starters: ${summary.sourceCoverage.fullStatmuseGames}/${summary.sourceCoverage.games}`,
    '',
    '## Results',
    '',
    `- First inning baseline: ${summary.firstInning.baseline.hits}/${summary.firstInning.baseline.graded}`,
    `- First inning addendum: ${summary.firstInning.adjusted.hits}/${summary.firstInning.adjusted.graded}`,
    `- F5 total baseline: ${summary.first5Total.baseline.hits}/${summary.first5Total.baseline.graded}`,
    `- F5 total addendum: ${summary.first5Total.adjusted.hits}/${summary.first5Total.adjusted.graded}`,
    '',
    '## High-Confidence First-Inning Misses',
    '',
    `- Baseline: ${summary.firstInning.baselineHighConfidenceMisses.join(', ') || 'none'}`,
    `- Addendum: ${summary.firstInning.adjustedHighConfidenceMisses.join(', ') || 'none'}`,
    '',
    '## Game Rows',
    '',
    '| Game | Src | FI Base -> Add | F5 Base -> Add | Actual |',
    '|---|---:|---|---|---|',
    ...rows.map((row) => {
      const src = `${row.sourceCoverage.espn.filter(Boolean).length}/2 ESPN, ${row.sourceCoverage.statmuse.filter(Boolean).length}/2 SM`
      const fi = `${row.baseline.firstInningPick} ${pct(row.baseline.firstInningYesPct)} (${hitLabel(row.results.baselineFirstInningHit)}) -> ${row.adjusted.firstInningPick} ${pct(row.adjusted.firstInningYesPct)} (${hitLabel(row.results.adjustedFirstInningHit)})`
      const f5 = `${row.baseline.f5TotalLean} ${row.baseline.f5Projection}/${row.baseline.f5Line} (${hitLabel(row.results.baselineF5TotalHit)}) -> ${row.adjusted.f5TotalLean} ${row.adjusted.f5Projection}/${row.baseline.f5Line} (${hitLabel(row.results.adjustedF5TotalHit)})`
      const actual = `FI ${row.actual.firstInningYes ? 'YRFI' : 'NRFI'}, F5 ${row.actual.f5Total} ${row.actual.f5TotalSide}`
      return `| ${row.title} | ${src} | ${fi} | ${f5} | ${actual} |`
    }),
    ''
  ].join('\n'))
  return { summary, jsonPath, mdPath }
}

const run = () => {
  const games = loadGames(options.date)
  const sources = loadSources(options.date)
  const outcomes = loadPhaseOutcomes(options.date)
  const rows = games.map((game) => buildRow({ game, sources, phase: outcomes.get(String(game.gamePk)) }))
  const result = writeReports({ date: options.date, rows, sources })
  console.log(JSON.stringify(result, null, 2))
}

run()

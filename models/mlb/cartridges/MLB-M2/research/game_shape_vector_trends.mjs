import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { createSportsMatchModel } from '../lib/sports-model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..', '..', '..')

const shortNames = {
  'Arizona Diamondbacks': 'Diamondbacks',
  Athletics: 'Athletics',
  'Atlanta Braves': 'Braves',
  'Baltimore Orioles': 'Orioles',
  'Boston Red Sox': 'Red Sox',
  'Chicago Cubs': 'Cubs',
  'Chicago White Sox': 'White Sox',
  'Cincinnati Reds': 'Reds',
  'Cleveland Guardians': 'Guardians',
  'Colorado Rockies': 'Rockies',
  'Detroit Tigers': 'Tigers',
  'Houston Astros': 'Astros',
  'Kansas City Royals': 'Royals',
  'Los Angeles Angels': 'Angels',
  'Los Angeles Dodgers': 'Dodgers',
  'Miami Marlins': 'Marlins',
  'Milwaukee Brewers': 'Brewers',
  'Minnesota Twins': 'Twins',
  'New York Mets': 'Mets',
  'New York Yankees': 'Yankees',
  'Philadelphia Phillies': 'Phillies',
  'Pittsburgh Pirates': 'Pirates',
  'San Diego Padres': 'Padres',
  'San Francisco Giants': 'Giants',
  'Seattle Mariners': 'Mariners',
  'St. Louis Cardinals': 'Cardinals',
  'Tampa Bay Rays': 'Rays',
  'Texas Rangers': 'Rangers',
  'Toronto Blue Jays': 'Blue Jays',
  'Washington Nationals': 'Nationals'
}

const axes = ['pressure', 'chaos', 'freeze', 'air', 'bridge', 'flow']
const toShortName = (name) => shortNames[name] || name
const normalizeName = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
const round = (value, places = 1) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  const factor = 10 ** places
  return Math.round(numeric * factor) / factor
}
const rate = (hits, rows) => (rows ? hits / rows : null)
const pct = (value) => (Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'N/A')
const avg = (values) => {
  const clean = values.map(Number).filter(Number.isFinite)
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : null
}
const sum = (values) => values.map(Number).filter(Number.isFinite).reduce((total, value) => total + value, 0)

const parseArgs = () => {
  const options = {
    start: '2026-05-10',
    end: '2026-05-31'
  }
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--start') options.start = args[++index]
    else if (arg === '--end') options.end = args[++index]
  }
  return options
}

const sqliteJson = (sql) => {
  const dbPath = path.join(rootDir, 'data-private', 'warehouse', 'sports.db')
  const text = execFileSync('sqlite3', ['-json', dbPath, sql], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 50
  })
  return JSON.parse(text || '[]')
}

const loadOutcomes = ({ start, end }) => {
  const rows = sqliteJson(`
    SELECT
      game_pk AS gamePk,
      game_date AS gameDate,
      away_team AS awayTeam,
      home_team AS homeTeam,
      away_runs_final AS awayRunsFinal,
      home_runs_final AS homeRunsFinal,
      away_runs_first5 AS awayRunsFirst5,
      home_runs_first5 AS homeRunsFirst5,
      away_hits_first5 AS awayHitsFirst5,
      home_hits_first5 AS homeHitsFirst5,
      total_runs_first5 AS totalRunsFirst5,
      total_runs_final AS totalRunsFinal,
      home_full_game_result AS homeFullGameResult,
      home_first5_result AS homeFirst5Result
    FROM mlb_game_outcomes
    WHERE game_date BETWEEN '${start}' AND '${end}'
  `)
  return new Map(rows.map((row) => [String(row.gamePk), row]))
}

const listSlateFiles = ({ start, end }) => {
  const slateRoot = path.join(rootDir, 'published-data', 'slates')
  return fs
    .readdirSync(slateRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name >= start && entry.name <= end)
    .flatMap((entry) => {
      const gamesDir = path.join(slateRoot, entry.name, 'games')
      if (!fs.existsSync(gamesDir)) return []
      return fs
        .readdirSync(gamesDir)
        .filter((file) => file.endsWith('.json') && !file.startsWith('rg-'))
        .map((file) => path.join(gamesDir, file))
    })
    .sort()
}

const sideOutcome = ({ profileTeam, outcome }) => {
  const awayShort = toShortName(outcome.awayTeam)
  const homeShort = toShortName(outcome.homeTeam)
  const profile = normalizeName(profileTeam)
  const away = normalizeName(awayShort)
  const home = normalizeName(homeShort)
  const isAway = profile === away || away.includes(profile) || profile.includes(away)
  const isHome = profile === home || home.includes(profile) || profile.includes(home)
  if (!isAway && !isHome) return null
  const side = isAway ? 'away' : 'home'
  const opponent = isAway ? homeShort : awayShort
  const runsFirst5 = Number(isAway ? outcome.awayRunsFirst5 : outcome.homeRunsFirst5)
  const runsFinal = Number(isAway ? outcome.awayRunsFinal : outcome.homeRunsFinal)
  const oppRunsFirst5 = Number(isAway ? outcome.homeRunsFirst5 : outcome.awayRunsFirst5)
  const oppRunsFinal = Number(isAway ? outcome.homeRunsFinal : outcome.awayRunsFinal)
  return {
    side,
    opponent,
    runsFirst5,
    runsFinal,
    oppRunsFirst5,
    oppRunsFinal,
    first5Win: runsFirst5 > oppRunsFirst5,
    first5Loss: runsFirst5 < oppRunsFirst5,
    finalWin: runsFinal > oppRunsFinal,
    finalLoss: runsFinal < oppRunsFinal,
    lateRuns: runsFinal - runsFirst5,
    first5Explosion: runsFirst5 >= 5,
    first5Scored: runsFirst5 >= 3,
    first5Dead: runsFirst5 <= 1,
    finalExplosion: runsFinal >= 8,
    lateExplosion: runsFinal - runsFirst5 >= 3
  }
}

const summarizeTeamRows = (rows) => {
  const count = rows.length
  return {
    rows: count,
    avgF5Runs: round(avg(rows.map((row) => row.runsFirst5))),
    avgFinalRuns: round(avg(rows.map((row) => row.runsFinal))),
    f5ScoredRate: rate(rows.filter((row) => row.first5Scored).length, count),
    f5ExplosionRate: rate(rows.filter((row) => row.first5Explosion).length, count),
    f5DeadRate: rate(rows.filter((row) => row.first5Dead).length, count),
    lateExplosionRate: rate(rows.filter((row) => row.lateExplosion).length, count),
    finalWinRate: rate(rows.filter((row) => row.finalWin).length, count),
    f5WinRate: rate(rows.filter((row) => row.first5Win).length, count)
  }
}

const summarizeGameRows = (rows) => {
  const count = rows.length
  return {
    rows: count,
    avgF5Total: round(avg(rows.map((row) => row.totalRunsFirst5))),
    avgFinalTotal: round(avg(rows.map((row) => row.totalRunsFinal))),
    highF5TotalRate: rate(rows.filter((row) => row.totalRunsFirst5 >= 5).length, count),
    lowF5TotalRate: rate(rows.filter((row) => row.totalRunsFirst5 <= 3).length, count),
    highFullTotalRate: rate(rows.filter((row) => row.totalRunsFinal >= 9).length, count),
    veryHighFullTotalRate: rate(rows.filter((row) => row.totalRunsFinal >= 12).length, count)
  }
}

const axisBucketSummaries = (teamRows, gameRows) => {
  const baselineTeam = summarizeTeamRows(teamRows)
  const baselineGame = summarizeGameRows(gameRows)
  return {
    baselineTeam,
    baselineGame,
    teamAxes: axes.map((axis) => {
      const high = teamRows.filter((row) => row.scores[axis] >= 60)
      const loud = teamRows.filter((row) => row.scores[axis] >= 70)
      const low = teamRows.filter((row) => row.scores[axis] < 40)
      const highSummary = summarizeTeamRows(high)
      const loudSummary = summarizeTeamRows(loud)
      const lowSummary = summarizeTeamRows(low)
      return {
        axis,
        high: highSummary,
        loud: loudSummary,
        low: lowSummary,
        highLift: {
          f5ScoredRate: round((highSummary.f5ScoredRate ?? 0) - (baselineTeam.f5ScoredRate ?? 0), 3),
          f5ExplosionRate: round((highSummary.f5ExplosionRate ?? 0) - (baselineTeam.f5ExplosionRate ?? 0), 3),
          f5DeadRate: round((highSummary.f5DeadRate ?? 0) - (baselineTeam.f5DeadRate ?? 0), 3),
          lateExplosionRate: round((highSummary.lateExplosionRate ?? 0) - (baselineTeam.lateExplosionRate ?? 0), 3)
        }
      }
    }),
    gameAxes: axes.map((axis) => {
      const high = gameRows.filter((row) => row.gameScores[axis] >= 60)
      const loud = gameRows.filter((row) => row.gameScores[axis] >= 70)
      const low = gameRows.filter((row) => row.gameScores[axis] < 40)
      const highSummary = summarizeGameRows(high)
      const loudSummary = summarizeGameRows(loud)
      const lowSummary = summarizeGameRows(low)
      return {
        axis,
        high: highSummary,
        loud: loudSummary,
        low: lowSummary,
        highLift: {
          highF5TotalRate: round((highSummary.highF5TotalRate ?? 0) - (baselineGame.highF5TotalRate ?? 0), 3),
          lowF5TotalRate: round((highSummary.lowF5TotalRate ?? 0) - (baselineGame.lowF5TotalRate ?? 0), 3),
          highFullTotalRate: round((highSummary.highFullTotalRate ?? 0) - (baselineGame.highFullTotalRate ?? 0), 3),
          veryHighFullTotalRate: round((highSummary.veryHighFullTotalRate ?? 0) - (baselineGame.veryHighFullTotalRate ?? 0), 3)
        }
      }
    })
  }
}

const teamArchetype = (row) => {
  const { pressure, chaos, freeze, air, bridge, flow } = row.scores
  if (pressure >= 60 && chaos >= 60 && freeze >= 55) return 'pressure-chaos fork'
  if (pressure >= 60 && chaos >= 60) return 'pressure chaos'
  if (chaos >= 60 && air >= 58) return 'air chaos'
  if (freeze >= 55 && pressure < 50) return 'dead-freeze trap'
  if (bridge >= 55) return 'bridge volatility'
  if (flow >= 75 && chaos < 55 && freeze < 50) return 'clean flow'
  if (pressure >= 60 && freeze < 45) return 'clean pressure'
  return 'balanced/unclear'
}

const gameArchetype = (row) => {
  const { pressure, chaos, freeze, air, bridge, flow } = row.gameScores
  if (pressure >= 60 && chaos >= 65 && freeze >= 60) return 'live fork: pressure plus freeze plus chaos'
  if (chaos >= 65 && air >= 58) return 'over-tail air chaos'
  if (freeze >= 60 && pressure < 55) return 'under/freezer'
  if (bridge >= 55 && chaos >= 55) return 'late chaos bridge'
  if (flow >= 75 && chaos < 55 && freeze < 50) return 'clean phase stack'
  if (flow >= 75 && chaos >= 60) return 'aligned but chaotic'
  return 'balanced/unclear'
}

const pairSummaries = (teamRows, gameRows) => {
  const teamPairs = [
    ['pressure>=60 & chaos>=60', (row) => row.scores.pressure >= 60 && row.scores.chaos >= 60],
    ['pressure>=60 & freeze>=55', (row) => row.scores.pressure >= 60 && row.scores.freeze >= 55],
    ['pressure>=60 & freeze<45', (row) => row.scores.pressure >= 60 && row.scores.freeze < 45],
    ['chaos>=60 & air>=58', (row) => row.scores.chaos >= 60 && row.scores.air >= 58],
    ['freeze>=55 & pressure<50', (row) => row.scores.freeze >= 55 && row.scores.pressure < 50],
    ['bridge>=55', (row) => row.scores.bridge >= 55],
    ['flow>=75 & chaos<55 & freeze<50', (row) => row.scores.flow >= 75 && row.scores.chaos < 55 && row.scores.freeze < 50]
  ].map(([label, predicate]) => ({ label, ...summarizeTeamRows(teamRows.filter(predicate)) }))

  const gamePairs = [
    ['pressure>=60 & chaos>=65 & freeze>=60', (row) => row.gameScores.pressure >= 60 && row.gameScores.chaos >= 65 && row.gameScores.freeze >= 60],
    ['chaos>=65 & air>=58', (row) => row.gameScores.chaos >= 65 && row.gameScores.air >= 58],
    ['freeze>=60 & pressure<55', (row) => row.gameScores.freeze >= 60 && row.gameScores.pressure < 55],
    ['bridge>=55 & chaos>=55', (row) => row.gameScores.bridge >= 55 && row.gameScores.chaos >= 55],
    ['flow>=75 & chaos<55 & freeze<50', (row) => row.gameScores.flow >= 75 && row.gameScores.chaos < 55 && row.gameScores.freeze < 50],
    ['flow>=75 & chaos>=60', (row) => row.gameScores.flow >= 75 && row.gameScores.chaos >= 60]
  ].map(([label, predicate]) => ({ label, ...summarizeGameRows(gameRows.filter(predicate)) }))

  return { teamPairs, gamePairs }
}

const archetypeSummaries = (teamRows, gameRows) => {
  const teamMap = new Map()
  for (const row of teamRows) {
    const label = teamArchetype(row)
    if (!teamMap.has(label)) teamMap.set(label, [])
    teamMap.get(label).push(row)
  }
  const gameMap = new Map()
  for (const row of gameRows) {
    const label = gameArchetype(row)
    if (!gameMap.has(label)) gameMap.set(label, [])
    gameMap.get(label).push(row)
  }
  return {
    teamArchetypes: [...teamMap.entries()]
      .map(([label, rows]) => ({ label, ...summarizeTeamRows(rows) }))
      .sort((left, right) => right.rows - left.rows),
    gameArchetypes: [...gameMap.entries()]
      .map(([label, rows]) => ({ label, ...summarizeGameRows(rows) }))
      .sort((left, right) => right.rows - left.rows)
  }
}

const deltaSummaries = (teamRows) => {
  const byTeam = new Map()
  for (const row of teamRows) {
    if (!byTeam.has(row.team)) byTeam.set(row.team, [])
    byTeam.get(row.team).push(row)
  }
  const deltaRows = []
  for (const rows of byTeam.values()) {
    const sorted = rows.slice().sort((a, b) => (a.date === b.date ? a.gamePk - b.gamePk : a.date.localeCompare(b.date)))
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1]
      const current = sorted[index]
      const deltas = Object.fromEntries(axes.map((axis) => [axis, round(current.scores[axis] - previous.scores[axis])]))
      deltaRows.push({
        ...current,
        previousDate: previous.date,
        deltas
      })
    }
  }
  const candidates = [
    ['pressure jump >=12', (row) => row.deltas.pressure >= 12],
    ['chaos jump >=12', (row) => row.deltas.chaos >= 12],
    ['freeze jump >=12', (row) => row.deltas.freeze >= 12],
    ['air jump >=12', (row) => row.deltas.air >= 12],
    ['bridge jump >=12', (row) => row.deltas.bridge >= 12],
    ['flow collapse <=-20', (row) => row.deltas.flow <= -20],
    ['pressure drop <=-12', (row) => row.deltas.pressure <= -12],
    ['freeze drop <=-12', (row) => row.deltas.freeze <= -12]
  ]
  return candidates
    .map(([label, predicate]) => ({ label, ...summarizeTeamRows(deltaRows.filter(predicate)) }))
    .filter((row) => row.rows > 0)
    .sort((left, right) => right.rows - left.rows)
}

const buildMarkdown = ({ options, report }) => {
  const lines = []
  lines.push(`# MLB-M2 Game-Shape Vector Trends`)
  lines.push('')
  lines.push(`Range: ${options.start} to ${options.end}`)
  lines.push('')
  lines.push(`This treats each team-game as a radar vector, not a UI widget. The visible chart is just the human-readable view of the six-dimensional state.`)
  lines.push('')
  lines.push(`## Coverage`)
  lines.push('')
  lines.push(`- Games: ${report.coverage.games}`)
  lines.push(`- Team vectors: ${report.coverage.teamVectors}`)
  lines.push(`- Dates: ${report.coverage.dates.join(', ')}`)
  lines.push('')
  lines.push(`## Baselines`)
  lines.push('')
  lines.push(`- Team 3+ F5 runs: ${pct(report.axisBuckets.baselineTeam.f5ScoredRate)}; explosion 5+ F5 runs: ${pct(report.axisBuckets.baselineTeam.f5ExplosionRate)}; dead 0-1 F5 runs: ${pct(report.axisBuckets.baselineTeam.f5DeadRate)}`)
  lines.push(`- Game F5 total 5+: ${pct(report.axisBuckets.baselineGame.highF5TotalRate)}; full-game total 9+: ${pct(report.axisBuckets.baselineGame.highFullTotalRate)}; 12+: ${pct(report.axisBuckets.baselineGame.veryHighFullTotalRate)}`)
  lines.push('')
  lines.push(`## Team Axis Buckets`)
  lines.push('')
  lines.push(`| Axis high >=60 | Rows | Avg F5 R | 3+ F5 | 5+ F5 explosion | Dead F5 | Late 3+ | Lift: 5+ F5 |`)
  lines.push(`| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`)
  for (const row of report.axisBuckets.teamAxes) {
    lines.push(`| ${row.axis} | ${row.high.rows} | ${row.high.avgF5Runs ?? 'N/A'} | ${pct(row.high.f5ScoredRate)} | ${pct(row.high.f5ExplosionRate)} | ${pct(row.high.f5DeadRate)} | ${pct(row.high.lateExplosionRate)} | ${pct(row.highLift.f5ExplosionRate)} |`)
  }
  lines.push('')
  lines.push(`## Game Axis Buckets`)
  lines.push('')
  lines.push(`| Axis high >=60 | Rows | Avg F5 total | Avg final total | F5 total 5+ | F5 total <=3 | Final 9+ | Final 12+ |`)
  lines.push(`| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`)
  for (const row of report.axisBuckets.gameAxes) {
    lines.push(`| ${row.axis} | ${row.high.rows} | ${row.high.avgF5Total ?? 'N/A'} | ${row.high.avgFinalTotal ?? 'N/A'} | ${pct(row.high.highF5TotalRate)} | ${pct(row.high.lowF5TotalRate)} | ${pct(row.high.highFullTotalRate)} | ${pct(row.high.veryHighFullTotalRate)} |`)
  }
  lines.push('')
  lines.push(`## Team Vector Shapes`)
  lines.push('')
  lines.push(`| Shape | Rows | Avg F5 R | 3+ F5 | 5+ F5 explosion | Dead F5 | Final win |`)
  lines.push(`| --- | ---: | ---: | ---: | ---: | ---: | ---: |`)
  for (const row of report.archetypes.teamArchetypes) {
    lines.push(`| ${row.label} | ${row.rows} | ${row.avgF5Runs ?? 'N/A'} | ${pct(row.f5ScoredRate)} | ${pct(row.f5ExplosionRate)} | ${pct(row.f5DeadRate)} | ${pct(row.finalWinRate)} |`)
  }
  lines.push('')
  lines.push(`## Game Vector Shapes`)
  lines.push('')
  lines.push(`| Shape | Rows | Avg F5 total | Avg final total | F5 total 5+ | Final 9+ | Final 12+ |`)
  lines.push(`| --- | ---: | ---: | ---: | ---: | ---: | ---: |`)
  for (const row of report.archetypes.gameArchetypes) {
    lines.push(`| ${row.label} | ${row.rows} | ${row.avgF5Total ?? 'N/A'} | ${row.avgFinalTotal ?? 'N/A'} | ${pct(row.highF5TotalRate)} | ${pct(row.highFullTotalRate)} | ${pct(row.veryHighFullTotalRate)} |`)
  }
  lines.push('')
  lines.push(`## Movement Trends`)
  lines.push('')
  lines.push(`| Vector movement | Rows | Avg F5 R | 3+ F5 | 5+ F5 explosion | Dead F5 | Late 3+ |`)
  lines.push(`| --- | ---: | ---: | ---: | ---: | ---: | ---: |`)
  for (const row of report.deltaTrends) {
    lines.push(`| ${row.label} | ${row.rows} | ${row.avgF5Runs ?? 'N/A'} | ${pct(row.f5ScoredRate)} | ${pct(row.f5ExplosionRate)} | ${pct(row.f5DeadRate)} | ${pct(row.lateExplosionRate)} |`)
  }
  lines.push('')
  lines.push(`## Early Reads`)
  lines.push('')
  for (const read of report.earlyReads) lines.push(`- ${read}`)
  lines.push('')
  lines.push(`## Next Model Work`)
  lines.push('')
  lines.push(`- Persist team-game radar vectors into the warehouse as first-class rows, not just generated JSON.`)
  lines.push(`- Train vector transitions by team: current vector, prior vector, delta vector, and next-game outcome.`)
  lines.push(`- Add player-level radar vectors for starters, relievers, and lineup slots, then aggregate them into team vectors instead of only deriving team state from existing summaries.`)
  lines.push(`- Use vector archetypes to choose market lanes. Example: pressure-chaos fork should not be treated like ordinary ML confidence.`)
  lines.push('')
  return lines.join('\n')
}

const main = () => {
  const options = parseArgs()
  const outcomes = loadOutcomes(options)
  const files = listSlateFiles(options)
  const teamRows = []
  const gameRows = []
  const dateSet = new Set()

  for (const file of files) {
    const game = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (game.league !== 'MLB' || !game.gamePk) continue
    const outcome = outcomes.get(String(game.gamePk))
    if (!outcome) continue
    const model = createSportsMatchModel(game)
    const radar = model.analysis?.gameShape?.radar
    if (!radar?.gameProfile?.scores || !Array.isArray(radar.profiles)) continue
    dateSet.add(outcome.gameDate)
    const gameScores = Object.fromEntries(axes.map((axis) => [axis, Number(radar.gameProfile.scores[axis])]))
    gameRows.push({
      date: outcome.gameDate,
      gamePk: game.gamePk,
      title: game.title,
      label: radar.gameProfile.label,
      bestExpression: radar.gameProfile.bestExpression,
      gameScores,
      totalRunsFirst5: Number(outcome.totalRunsFirst5),
      totalRunsFinal: Number(outcome.totalRunsFinal),
      archetype: null
    })
    for (const profile of radar.profiles) {
      const actual = sideOutcome({ profileTeam: profile.team, outcome })
      if (!actual) continue
      const scores = Object.fromEntries(axes.map((axis) => [axis, Number(profile.scores?.[axis])]))
      teamRows.push({
        date: outcome.gameDate,
        gamePk: game.gamePk,
        title: game.title,
        role: profile.role,
        team: profile.team,
        opponent: actual.opponent,
        side: actual.side,
        scores,
        polygon: profile.polygon ?? axes.map((axis) => scores[axis]),
        ...actual
      })
    }
  }

  for (const row of teamRows) row.archetype = teamArchetype(row)
  for (const row of gameRows) row.archetype = gameArchetype(row)

  const axisBuckets = axisBucketSummaries(teamRows, gameRows)
  const pairs = pairSummaries(teamRows, gameRows)
  const archetypes = archetypeSummaries(teamRows, gameRows)
  const deltaTrends = deltaSummaries(teamRows)
  const topTeamSignals = axisBuckets.teamAxes
    .map((row) => ({
      axis: row.axis,
      explosionLift: row.highLift.f5ExplosionRate,
      deadLift: row.highLift.f5DeadRate,
      scoredLift: row.highLift.f5ScoredRate,
      lateLift: row.highLift.lateExplosionRate,
      rows: row.high.rows
    }))
    .filter((row) => row.rows >= 20)
    .sort((left, right) => Math.abs(right.explosionLift) - Math.abs(left.explosionLift))
  const topGameSignals = axisBuckets.gameAxes
    .map((row) => ({
      axis: row.axis,
      highFullLift: row.highLift.highFullTotalRate,
      veryHighFullLift: row.highLift.veryHighFullTotalRate,
      highF5Lift: row.highLift.highF5TotalRate,
      lowF5Lift: row.highLift.lowF5TotalRate,
      rows: row.high.rows
    }))
    .filter((row) => row.rows >= 10)
    .sort((left, right) => Math.abs(right.highF5Lift) - Math.abs(left.highF5Lift))

  const earlyReads = []
  const pressureChaos = pairs.teamPairs.find((row) => row.label === 'pressure>=60 & chaos>=60')
  const pressureFreeze = pairs.teamPairs.find((row) => row.label === 'pressure>=60 & freeze>=55')
  const deadFreeze = pairs.teamPairs.find((row) => row.label === 'freeze>=55 & pressure<50')
  const alignedChaos = pairs.gamePairs.find((row) => row.label === 'flow>=75 & chaos>=60')
  if (pressureChaos?.rows) {
    earlyReads.push(`Pressure plus chaos is an explosion/fork state: ${pressureChaos.rows} team rows, ${pct(pressureChaos.f5ExplosionRate)} reached 5+ F5 runs and ${pct(pressureChaos.f5ScoredRate)} reached 3+.`)
  }
  if (pressureFreeze?.rows) {
    earlyReads.push(`Pressure plus freeze is the dangerous fork: it can score, but dead-rate stayed at ${pct(pressureFreeze.f5DeadRate)}. This is exactly where a point projection can lie.`)
  }
  if (deadFreeze?.rows) {
    earlyReads.push(`Freeze without pressure behaves like a true dead-offense state: ${pct(deadFreeze.f5DeadRate)} ended 0-1 F5 runs.`)
  }
  if (alignedChaos?.rows) {
    earlyReads.push(`Flow does not mean safe. Aligned-but-chaotic games had ${pct(alignedChaos.highF5TotalRate)} F5 totals of 5+ and ${pct(alignedChaos.highFullTotalRate)} full-game totals of 9+.`)
  }
  if (topTeamSignals[0]) {
    earlyReads.push(`Largest single-axis team explosion lift came from high ${topTeamSignals[0].axis}: ${pct(topTeamSignals[0].explosionLift)} over baseline.`)
  }
  if (topGameSignals[0]) {
    earlyReads.push(`Largest single-axis game F5-total lift came from high ${topGameSignals[0].axis}: ${pct(topGameSignals[0].highF5Lift)} over baseline.`)
  }

  const report = {
    schemaVersion: 1,
    modelId: 'MLB-M2',
    experiment: 'game_shape_vector_trends',
    options,
    coverage: {
      games: gameRows.length,
      teamVectors: teamRows.length,
      dates: [...dateSet].sort()
    },
    axisBuckets,
    pairs,
    archetypes,
    deltaTrends,
    topTeamSignals,
    topGameSignals,
    earlyReads,
    teamRows,
    gameRows
  }

  const reportDir = path.join(rootDir, 'models', 'mlb', 'cartridges', 'MLB-M2', 'reports')
  const privateDir = path.join(rootDir, 'data-private', 'reports')
  fs.mkdirSync(reportDir, { recursive: true })
  fs.mkdirSync(privateDir, { recursive: true })
  const safeRange = `${options.start}-to-${options.end}`
  const markdownOut = path.join(reportDir, `game-shape-vector-trends-${safeRange}.md`)
  const jsonOut = path.join(privateDir, `mlb-m2-game-shape-vector-trends-${safeRange}.json`)
  fs.writeFileSync(markdownOut, buildMarkdown({ options, report }))
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2))
  console.log(`Wrote ${markdownOut}`)
  console.log(`Wrote ${jsonOut}`)
  console.log(JSON.stringify({
    coverage: report.coverage,
    earlyReads: report.earlyReads
  }, null, 2))
}

main()

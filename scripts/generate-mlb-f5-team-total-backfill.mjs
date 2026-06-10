#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const defaultDbPath = path.join(repoRoot, 'data-private/warehouse/sports/mlb/sql-mlb.db')
const defaultOutPath = path.join(repoRoot, 'web/src/lib/mlb-f5-team-total-backfill.generated.js')

const args = process.argv.slice(2)
const readArg = (name, fallback = null) => {
  const index = args.indexOf(name)
  if (index === -1) return fallback
  return args[index + 1] ?? fallback
}

const dates = String(readArg('--dates', '') || '')
  .split(',')
  .map((date) => date.trim())
  .filter(Boolean)
const dbPath = path.resolve(repoRoot, readArg('--db', defaultDbPath))
const outPath = path.resolve(repoRoot, readArg('--out', defaultOutPath))

if (!dates.length) {
  console.error('Usage: node scripts/generate-mlb-f5-team-total-backfill.mjs --dates YYYY-MM-DD[,YYYY-MM-DD]')
  process.exit(1)
}

const roundToTenths = (value) => Math.round(Number(value) * 10) / 10
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const teamNickname = (name) => {
  const normalized = String(name || '').trim()
  const map = new Map([
    ['Arizona Diamondbacks', 'Diamondbacks'],
    ['Athletics', 'Athletics'],
    ['Atlanta Braves', 'Braves'],
    ['Baltimore Orioles', 'Orioles'],
    ['Boston Red Sox', 'Red Sox'],
    ['Chicago Cubs', 'Cubs'],
    ['Chicago White Sox', 'White Sox'],
    ['Cincinnati Reds', 'Reds'],
    ['Cleveland Guardians', 'Guardians'],
    ['Colorado Rockies', 'Rockies'],
    ['Detroit Tigers', 'Tigers'],
    ['Houston Astros', 'Astros'],
    ['Kansas City Royals', 'Royals'],
    ['Los Angeles Angels', 'Angels'],
    ['Los Angeles Dodgers', 'Dodgers'],
    ['Miami Marlins', 'Marlins'],
    ['Milwaukee Brewers', 'Brewers'],
    ['Minnesota Twins', 'Twins'],
    ['New York Mets', 'Mets'],
    ['New York Yankees', 'Yankees'],
    ['Philadelphia Phillies', 'Phillies'],
    ['Pittsburgh Pirates', 'Pirates'],
    ['San Diego Padres', 'Padres'],
    ['San Francisco Giants', 'Giants'],
    ['Seattle Mariners', 'Mariners'],
    ['St. Louis Cardinals', 'Cardinals'],
    ['Tampa Bay Rays', 'Rays'],
    ['Texas Rangers', 'Rangers'],
    ['Toronto Blue Jays', 'Blue Jays'],
    ['Washington Nationals', 'Nationals']
  ])
  return map.get(normalized) || normalized
}

const previousDate = (isoDate) => {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

const poissonSeries = (lambdaInput, maxRuns = 24) => {
  const lambda = Math.max(0.05, Number(lambdaInput) || 0.05)
  const series = []
  let probability = Math.exp(-lambda)
  series.push(probability)
  for (let runs = 1; runs <= maxRuns; runs += 1) {
    probability = (probability * lambda) / runs
    series.push(probability)
  }
  const total = series.reduce((sum, value) => sum + value, 0)
  return total > 0 ? series.map((value) => value / total) : series
}

const totalProbabilityPct = (projectedRunsInput, lineInput, leanInput) => {
  const projectedRuns = Number(projectedRunsInput)
  const line = Number(lineInput)
  if (!Number.isFinite(projectedRuns) || !Number.isFinite(line)) return null
  const series = poissonSeries(projectedRuns, 24)
  const overWinsAt = Math.floor(line) + 1
  const underProbability = series.reduce((sum, probability, runs) => (runs < overWinsAt ? sum + probability : sum), 0)
  const overProbability = Math.max(0, 1 - underProbability)
  const lean = String(leanInput || '').toLowerCase()
  if (lean.startsWith('over')) return roundToTenths(overProbability * 100)
  if (lean.startsWith('under')) return roundToTenths(underProbability * 100)
  return roundToTenths(Math.max(overProbability, underProbability) * 100)
}

const sqliteJson = (sql) => {
  const output = execFileSync('sqlite3', ['-json', dbPath, sql], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 40
  }).trim()
  return output ? JSON.parse(output) : []
}

const loadSummaryGames = (date) => {
  const summaryPath = path.join(repoRoot, 'published-data/slates', date, 'summary.json')
  if (!fs.existsSync(summaryPath)) return []
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
  return Array.isArray(summary.games) ? summary.games.filter((game) => game.league === 'MLB') : []
}

const sqlString = (value) => String(value).replace(/'/g, "''")

const loadF5TeamTotalContracts = (date) =>
  sqliteJson(`
    select
      g.game_date,
      g.game_id,
      g.away_team_id,
      g.home_team_id,
      at.name as away_team_name,
      ht.name as home_team_name,
      mc.team_id,
      t.name as team_name,
      mc.line_value,
      go.f5_away_runs,
      go.f5_home_runs
    from market_contracts mc
    join games g on g.game_id = mc.game_id
    join teams at on at.team_id = g.away_team_id
    join teams ht on ht.team_id = g.home_team_id
    left join teams t on t.team_id = mc.team_id
    left join game_outcomes go on go.game_id = g.game_id
    where g.game_date = '${sqlString(date)}'
      and mc.source_name = 'draftkings'
      and mc.market_type = 'teamTotalRunsFirst5'
      and mc.selection_name in ('Over', 'Under')
      and mc.team_id is not null
    group by g.game_id, mc.team_id, mc.line_value
    order by g.game_id, mc.team_id
  `)

const buildGameLookup = (games) => {
  const bySlug = new Map()
  games.forEach((game) => {
    bySlug.set(game.id, game)
    const matchup = Array.isArray(game.matchup) ? game.matchup : []
    const awayName = matchup[0]?.name || ''
    const homeName = matchup[1]?.name || ''
    if (awayName && homeName) bySlug.set(`${slugify(awayName)}-${slugify(homeName)}`, game)
  })
  return bySlug
}

const rowResult = (lean, line, actualRuns) => {
  if (!Number.isFinite(actualRuns)) return null
  if (actualRuns === line) {
    return {
      hit: null,
      tone: 'push',
      label: `PUSH | ${roundToTenths(actualRuns)} F5 RUNS`,
      actualRuns,
      actualScore: `${roundToTenths(actualRuns)} F5 runs`
    }
  }
  const hit = String(lean).toLowerCase().startsWith('over') ? actualRuns > line : actualRuns < line
  return {
    hit,
    label: `${hit ? 'HIT' : 'MISS'} | ${roundToTenths(actualRuns)} F5 RUNS`,
    actualRuns,
    actualScore: `${roundToTenths(actualRuns)} F5 runs`
  }
}

const rows = []
const audit = []

dates.forEach((date) => {
  const games = loadSummaryGames(date)
  const gameLookup = buildGameLookup(games)
  const contracts = loadF5TeamTotalContracts(date)
  const asOfDate = previousDate(date)
  let emitted = 0
  let skippedNoProjection = 0
  let skippedThinEdge = 0
  let skippedNoGame = 0

  contracts.forEach((contract) => {
    const awayNick = teamNickname(contract.away_team_name)
    const homeNick = teamNickname(contract.home_team_name)
    const game =
      gameLookup.get(`${slugify(awayNick)}-${slugify(homeNick)}`) ||
      gameLookup.get(`${slugify(contract.away_team_name)}-${slugify(contract.home_team_name)}`)
    if (!game) {
      skippedNoGame += 1
      return
    }
    const side = contract.team_id === contract.away_team_id ? 'away' : contract.team_id === contract.home_team_id ? 'home' : ''
    const projection = game.analysis?.mlbProjection || {}
    const projectedRuns = side === 'away' ? Number(projection.awayFirst5ProjectedRuns) : side === 'home' ? Number(projection.homeFirst5ProjectedRuns) : NaN
    const line = Number(contract.line_value)
    if (!Number.isFinite(projectedRuns) || !Number.isFinite(line)) {
      skippedNoProjection += 1
      return
    }
    const edge = projectedRuns - line
    if (Math.abs(edge) < 0.25) {
      skippedThinEdge += 1
      return
    }
    const lean = projectedRuns >= line ? 'Over' : 'Under'
    const probability = totalProbabilityPct(projectedRuns, line, lean)
    if (!Number.isFinite(Number(probability))) {
      skippedNoProjection += 1
      return
    }
    const thinEdgeHaircut = Math.abs(edge) < 0.5 ? 4 : 0
    const confidence = clamp(Math.round(Number(probability)) - thinEdgeHaircut, 50, 80)
    const actualRuns = side === 'away' ? Number(contract.f5_away_runs) : Number(contract.f5_home_runs)
    const teamName = teamNickname(contract.team_name)
    const result = rowResult(lean, line, actualRuns)
    rows.push({
      id: `team-total-backfill:${date}:${game.id}:${slugify(teamName)}:first5`,
      date,
      category: 'team-total',
      actionKind: 'total',
      gameId: game.id,
      league: 'MLB',
      start: game.start,
      startMinutes: Number(game.startMinutes) || 0,
      stage: game.stage,
      title: `${teamName} ${lean} F5 ${roundToTenths(line)}`,
      subtitle: `${game.title} | backfill as-of ${asOfDate}`,
      confidence,
      sortConfidence: confidence,
      sortEdge: Math.abs(edge),
      priceLabel: `Proj ${roundToTenths(projectedRuns)} | edge ${edge >= 0 ? '+' : ''}${roundToTenths(edge)}`,
      metaLabel: `${roundToTenths(probability)}% model | data through ${asOfDate}`,
      summary: `${teamName} projected ${roundToTenths(projectedRuns)} first-five runs against a posted F5 team-total line of ${roundToTenths(line)} using the ${date} pregame slate read.`,
      tags: ['Team total', '1st 5', `${roundToTenths(probability)}% raw`, `as-of ${asOfDate}`],
      invalid: false,
      statusLabel: '',
      tone: '',
      selected: false,
      result,
      raw: {
        marketType: 'Team total runs',
        selection: lean,
        teamName,
        teamKey: slugify(teamName),
        windowKey: 'first5',
        line,
        projectedRuns,
        edge,
        probability,
        confidence,
        confidenceHaircut: thinEdgeHaircut,
        source: 'backfilled-f5-team-total:data-minus-one',
        asOfDate,
        actualRuns: Number.isFinite(actualRuns) ? actualRuns : null,
        gameDbId: contract.game_id
      }
    })
    emitted += 1
  })

  audit.push({
    date,
    contracts: contracts.length,
    emitted,
    skippedNoGame,
    skippedNoProjection,
    skippedThinEdge
  })
})

rows.sort((left, right) => {
  if (left.date !== right.date) return left.date.localeCompare(right.date)
  return right.sortEdge - left.sortEdge || right.sortConfidence - left.sortConfidence
})

const moduleText = `// Generated by scripts/generate-mlb-f5-team-total-backfill.mjs\n// Do not edit by hand.\nexport const mlbF5TeamTotalBackfillRows = ${JSON.stringify(rows, null, 2)}\n`
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, moduleText)

console.log(
  JSON.stringify(
    {
      ok: true,
      outPath: path.relative(repoRoot, outPath),
      rows: rows.length,
      audit
    },
    null,
    2
  )
)

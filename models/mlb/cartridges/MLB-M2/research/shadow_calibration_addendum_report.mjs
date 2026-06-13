#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../../../..')
const dbPath = path.join(repoRoot, 'data-private/warehouse/sports/mlb/sql-mlb.db')
const reportsDir = path.join(repoRoot, 'models/mlb/cartridges/MLB-M2/reports')

const args = process.argv.slice(2)
const argValue = (name, fallback = '') => {
  const index = args.indexOf(name)
  return index === -1 ? fallback : args[index + 1] ?? fallback
}

const round = (value, digits = 1) => {
  const factor = 10 ** digits
  return Math.round(Number(value) * factor) / factor
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const discreteTotalEdge = (projectedRunsInput, lineInput, leanInput) => {
  const projectedRuns = Number(projectedRunsInput)
  const line = Number(lineInput)
  if (!Number.isFinite(projectedRuns) || !Number.isFinite(line)) return null
  const lean = String(leanInput || '').toLowerCase()
  if (lean.startsWith('over')) {
    const winThreshold = Math.floor(line) + 1
    return { thresholdCushion: projectedRuns - winThreshold, winThreshold }
  }
  if (lean.startsWith('under')) {
    const winThreshold = Math.ceil(line) - 1
    return { thresholdCushion: winThreshold - projectedRuns, winThreshold }
  }
  return null
}

const sqlString = (value) => String(value).replace(/'/g, "''")

const sqliteJson = (sql) => {
  const output = execFileSync('sqlite3', ['-json', dbPath, sql], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 50
  }).trim()
  return output ? JSON.parse(output) : []
}

const nickname = (teamName) => {
  const names = {
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
  return names[String(teamName || '').trim()] || String(teamName || '').trim()
}

const dateRange = (start, end) => {
  const rows = []
  const current = new Date(`${start}T12:00:00Z`)
  const last = new Date(`${end}T12:00:00Z`)
  while (current <= last) {
    rows.push(current.toISOString().slice(0, 10))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return rows
}

const datesFromArgs = () => {
  const explicit = argValue('--dates')
  if (explicit) return explicit.split(',').map((date) => date.trim()).filter(Boolean)
  const start = argValue('--start-date')
  const end = argValue('--end-date', start)
  if (start && end) return dateRange(start, end)
  console.error('Usage: npm run data:research:mlb-shadow-calibration-addendum -- --dates YYYY-MM-DD,YYYY-MM-DD')
  process.exit(1)
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
  return series.map((value) => value / total)
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
  if (lean.startsWith('over')) return round(overProbability * 100, 1)
  if (lean.startsWith('under')) return round(underProbability * 100, 1)
  return round(Math.max(overProbability, underProbability) * 100, 1)
}

const first5LeadProbabilities = (awayRuns, homeRuns) => {
  const away = poissonSeries(awayRuns, 15)
  const home = poissonSeries(homeRuns, 15)
  let awayWin = 0
  let homeWin = 0
  let tie = 0
  away.forEach((awayProbability, awayScore) => {
    home.forEach((homeProbability, homeScore) => {
      const joint = awayProbability * homeProbability
      if (awayScore > homeScore) awayWin += joint
      else if (homeScore > awayScore) homeWin += joint
      else tie += joint
    })
  })
  return {
    awayWinPct: round(awayWin * 100, 1),
    homeWinPct: round(homeWin * 100, 1),
    tiePct: round(tie * 100, 1)
  }
}

const impliedPctFromAmericanOdds = (oddsInput) => {
  const odds = Number(oddsInput)
  if (!Number.isFinite(odds) || odds === 0) return null
  return odds > 0 ? (100 / (odds + 100)) * 100 : (-odds / (-odds + 100)) * 100
}

const rowRecord = (rows, field = 'hit') => {
  const wins = rows.filter((row) => (field === 'nonLoss' ? row.nonLoss : row.hit)).length
  const losses = rows.length - wins
  return {
    wins,
    losses,
    total: rows.length,
    hitRatePct: rows.length ? round((wins / rows.length) * 100, 1) : null,
    label: `${wins}-${losses}`
  }
}

const confidenceBucket = (row) => {
  const confidence = Number(row.confidence)
  if (confidence >= 80) return '80+'
  if (confidence >= 75) return '75-79'
  if (confidence >= 70) return '70-74'
  if (confidence >= 65) return '65-69'
  if (confidence >= 60) return '60-64'
  return '<60'
}

const edgeBucket = (row) => {
  const edge = Number(row.edge)
  if (edge >= 2) return '2+'
  if (edge >= 1.5) return '1.5-1.99'
  if (edge >= 1) return '1-1.49'
  if (edge >= 0.5) return '0.5-0.99'
  return '<0.5'
}

const bucketTable = (rows, bucketFn, field = 'hit') => {
  const grouped = new Map()
  rows.forEach((row) => {
    const bucket = bucketFn(row)
    if (!grouped.has(bucket)) grouped.set(bucket, [])
    grouped.get(bucket).push(row)
  })
  return [...grouped.entries()].map(([bucket, bucketRows]) => ({
    bucket,
    ...rowRecord(bucketRows, field)
  }))
}

const formatRecord = (record) => `${record.label} (${record.hitRatePct ?? 'n/a'}%, n=${record.total})`

const formatNumber = (value, digits = 1) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : 'n/a'
}

const formatSignedNumber = (value, digits = 1) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'n/a'
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(digits)}`
}

const shadowSeedWindow = '2026-06-06..2026-06-08'

const mlShapeConflictBucket = (row) => {
  const confidence = Number(row.confidence)
  const marginSupport = Number(row.edge)
  if (confidence >= 65 && marginSupport < 8) return 'high-confidence-thin-margin'
  if (confidence >= 65 && marginSupport >= 11) return 'confidence-and-margin-align'
  if (confidence < 65 && marginSupport >= 11) return 'high-margin-low-confidence'
  return confidence >= 65 ? 'confidence-primary' : 'watch-low-confidence'
}

const buildMlShapeShadowCalibration = (row) => {
  const confidence = Number(row.confidence) || 0
  const marketEdge = Number(row.marketEdge)
  const marginSupport = Number(row.edge) || 0
  const promoted = confidence >= 65
  const conflictBucket = mlShapeConflictBucket(row)
  const marketEdgeLabel = Number.isFinite(marketEdge)
    ? `${formatSignedNumber(marketEdge)} pts market edge`
    : 'no priced market edge'
  const marginLabel = `${formatNumber(marginSupport)}% margin support`
  const conflictReason =
    conflictBucket === 'high-confidence-thin-margin'
      ? `Confidence is carrying this ML read; ${marginLabel} is thin, so this is a closer-score win profile.`
      : conflictBucket === 'confidence-and-margin-align'
        ? `Confidence and margin both support the read: ${confidence}% model confidence plus ${marginLabel}.`
        : conflictBucket === 'high-margin-low-confidence'
          ? `Margin support is strong at ${formatNumber(marginSupport)}%, but ${confidence}% model confidence is too low to promote.`
          : `${confidence}% model confidence is the primary ML signal; ${marginLabel} is only tiebreak context.`

  return {
    mode: 'shadow',
    tier: promoted ? 'promoted' : 'watch',
    potdEligible: promoted,
    calibratedScore: round(
      confidence +
        (promoted ? 8 : 0) +
        Math.max(Number.isFinite(marketEdge) ? marketEdge : 0, 0) * 0.35 +
        Math.min(marginSupport, 20) * 0.15,
      1
    ),
    modelConfidence: confidence,
    lane: 'ml-shape',
    primarySignal: 'modelConfidence',
    secondarySignal: 'marketEdge',
    tiebreakSignal: 'marginSupport',
    metricConflict: conflictBucket,
    reasons: [
      `${row.pick}: ${conflictReason} ${marketEdgeLabel}.`,
      promoted
        ? 'ML shape confidence >=65 is the current promoted seed bucket.'
        : 'ML shape below 65% is watch-only; confidence remains the primary ML trust signal.'
    ],
    cautions: ['Small sample: June 6-8 seed window only.'],
    evidence: {
      seedWindow: shadowSeedWindow,
      bucket: promoted ? 'ML shape confidence >=65' : 'ML shape below 65',
      record: promoted ? '12-3' : '12-10',
      hitRatePct: promoted ? 80 : 54.5
    }
  }
}

const loadPublishedGames = (date) => {
  const summaryPath = path.join(repoRoot, 'published-data/slates', date, 'summary.json')
  if (!fs.existsSync(summaryPath)) return []
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
  return Array.isArray(summary.games) ? summary.games.filter((game) => game.league === 'MLB') : []
}

const loadOutcomes = (dates) => {
  const rows = sqliteJson(`
    select
      g.game_date,
      at.name as away_team_name,
      ht.name as home_team_name,
      go.away_runs,
      go.home_runs,
      go.f5_away_runs,
      go.f5_home_runs,
      max(case when po.team_role = 'away' then po.runs_first1 end) as away_first1,
      max(case when po.team_role = 'home' then po.runs_first1 end) as home_first1
    from games g
    join teams at on at.team_id = g.away_team_id
    join teams ht on ht.team_id = g.home_team_id
    join game_outcomes go on go.game_id = g.game_id
    left join phase_outcomes po on po.game_id = g.game_id
    where g.game_date in ('${dates.map(sqlString).join("','")}')
    group by g.game_id
  `)
  const byDateTitle = new Map()
  rows.forEach((row) => {
    const title = `${nickname(row.away_team_name)} @ ${nickname(row.home_team_name)}`
    byDateTitle.set(`${row.game_date}:${title}`, row)
  })
  return byDateTitle
}

const loadTeamTotalContracts = (dates) =>
  sqliteJson(`
    select
      g.game_date,
      at.name as away_team_name,
      ht.name as home_team_name,
      g.away_team_id,
      g.home_team_id,
      mc.team_id,
      t.name as team_name,
      mc.line_value
    from market_contracts mc
    join games g on g.game_id = mc.game_id
    join teams at on at.team_id = g.away_team_id
    join teams ht on ht.team_id = g.home_team_id
    left join teams t on t.team_id = mc.team_id
    where g.game_date in ('${dates.map(sqlString).join("','")}')
      and mc.source_name = 'draftkings'
      and mc.market_type = 'teamTotalRunsFirst5'
      and mc.selection_name in ('Over', 'Under')
      and mc.team_id is not null
    group by g.game_date, g.game_id, mc.team_id, mc.line_value
  `)

const buildRows = (dates) => {
  const outcomes = loadOutcomes(dates)
  const lanes = {
    shape: [],
    f5ml: [],
    f5ou: [],
    first: [],
    teamtotal: []
  }
  const gameByDateTitle = new Map()

  dates.forEach((date) => {
    loadPublishedGames(date).forEach((game) => {
      gameByDateTitle.set(`${date}:${game.title}`, game)
      const outcome = outcomes.get(`${date}:${game.title}`)
      if (!outcome) return
      const projection = game.analysis?.mlbProjection || {}

      const awayFullRuns = Number(projection.awayProjectedRuns)
      const homeFullRuns = Number(projection.homeProjectedRuns)
      const participant = game.analysis?.participant || null
      const participantIndex = Number(participant?.index)
      if (participant && Number.isFinite(awayFullRuns) && Number.isFinite(homeFullRuns) && [0, 1].includes(participantIndex)) {
        const projectedTotal =
          Number(projection.moneylineShape?.projectedTotalRuns) || awayFullRuns + homeFullRuns
        const pickRuns =
          Number(projection.moneylineShape?.pickProjectedRuns) || (participantIndex === 0 ? awayFullRuns : homeFullRuns)
        const opponentRuns =
          Number(projection.moneylineShape?.opponentProjectedRuns) || (participantIndex === 0 ? homeFullRuns : awayFullRuns)
        const runDiff = Number.isFinite(Number(projection.moneylineShape?.runDiff))
          ? Number(projection.moneylineShape.runDiff)
          : pickRuns - opponentRuns
        const runDiffShare = Number.isFinite(Number(projection.moneylineShape?.runDiffSharePct))
          ? Number(projection.moneylineShape.runDiffSharePct)
          : (Math.abs(runDiff) / projectedTotal) * 100
        const confidence = Number(projection.moneylineShape?.confidence ?? game.analysis?.confidence ?? 0) || 0
        const marketPct = impliedPctFromAmericanOdds(participant.americanOdds)
        const actualWinner =
          Number(outcome.away_runs) > Number(outcome.home_runs)
            ? nickname(outcome.away_team_name)
            : Number(outcome.home_runs) > Number(outcome.away_runs)
              ? nickname(outcome.home_team_name)
              : ''
        const shapeRow = {
          date,
          lane: 'ml-shape',
          game: game.title,
          pick: participant.name,
          confidence,
          edge: runDiffShare,
          runDiff,
          marketEdge: Number.isFinite(Number(marketPct)) ? confidence - Number(marketPct) : null,
          hit: participant.name === actualWinner
        }
        shapeRow.shadowCalibration = buildMlShapeShadowCalibration(shapeRow)
        lanes.shape.push(shapeRow)
      }

      const awayFirst5Runs = Number(projection.awayFirst5ProjectedRuns)
      const homeFirst5Runs = Number(projection.homeFirst5ProjectedRuns)
      if (!Number.isFinite(awayFirst5Runs) || !Number.isFinite(homeFirst5Runs)) return

      const lead = first5LeadProbabilities(awayFirst5Runs, homeFirst5Runs)
      const pickIndex = homeFirst5Runs >= awayFirst5Runs ? 1 : 0
      const pick = game.matchup?.[pickIndex]?.name || ''
      const pickRuns = pickIndex === 0 ? awayFirst5Runs : homeFirst5Runs
      const opponentRuns = pickIndex === 0 ? homeFirst5Runs : awayFirst5Runs
      const projectedTotal = awayFirst5Runs + homeFirst5Runs
      const tieRisk =
        lead.tiePct >= 30 && projectedTotal <= 4.2
          ? 'high'
          : lead.tiePct >= 26 && projectedTotal <= 4.8
            ? 'watch'
            : 'low'
      const leadPct = pickIndex === 0 ? lead.awayWinPct : lead.homeWinPct
      const confidence = clamp(
        Math.round(Number(leadPct) || 50) - (tieRisk === 'high' ? 8 : tieRisk === 'watch' ? 4 : 0),
        50,
        86
      )
      const actualFirst5Winner =
        Number(outcome.f5_away_runs) > Number(outcome.f5_home_runs)
          ? nickname(outcome.away_team_name)
          : Number(outcome.f5_home_runs) > Number(outcome.f5_away_runs)
            ? nickname(outcome.home_team_name)
            : 'Push'
      lanes.f5ml.push({
        date,
        lane: 'f5-ml',
        game: game.title,
        pick,
        confidence,
        edge: Math.abs(pickRuns - opponentRuns),
        tiePct: lead.tiePct,
        tieRisk,
        hit: pick === actualFirst5Winner,
        push: actualFirst5Winner === 'Push',
        nonLoss: pick === actualFirst5Winner || actualFirst5Winner === 'Push'
      })

      const first5Total = projection.totals?.first5 || null
      const first5Lean = String(first5Total?.lean || '').trim()
      const first5Line = Number(
        [
          projection.totals?.postedFirst5TotalLine,
          projection.totals?.derivedFirst5TotalLine,
          projection.totals?.runShareFirst5TotalLine
        ].find((value) => value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value)))
      )
      if (/^(over|under)$/i.test(first5Lean) && Number.isFinite(first5Line)) {
        const edge = projectedTotal - first5Line
        const probability = totalProbabilityPct(projectedTotal, first5Line, first5Lean)
        const confidence = clamp(
          Math.round(Number(probability) || 54 + Math.abs(edge) * 8) - (Math.abs(edge) < 0.8 ? 3 : 0),
          50,
          78
        )
        const actualRuns = Number(outcome.f5_away_runs) + Number(outcome.f5_home_runs)
        lanes.f5ou.push({
          date,
          lane: 'f5-ou',
          game: game.title,
          pick: `${first5Lean} ${first5Line}`,
          confidence,
          edge: Math.abs(edge),
          side: first5Lean,
          hit: /over/i.test(first5Lean) ? actualRuns > first5Line : actualRuns < first5Line
        })
      }

      const firstInning = projection.firstInning || null
      if (firstInning && String(firstInning.pick || '').toLowerCase() !== 'pass') {
        const pick = String(firstInning.pick || '').toUpperCase()
        const confidence = Math.round(pick === 'YRFI' ? Number(firstInning.yesProbabilityPct) : Number(firstInning.noProbabilityPct))
        const actual = Number(outcome.away_first1) + Number(outcome.home_first1) > 0 ? 'YRFI' : 'NRFI'
        lanes.first.push({
          date,
          lane: pick.toLowerCase(),
          game: game.title,
          pick,
          confidence,
          edge: Number(firstInning.edge) || 0,
          hit: pick === actual
        })
      }
    })
  })

  loadTeamTotalContracts(dates).forEach((contract) => {
    const date = contract.game_date
    const title = `${nickname(contract.away_team_name)} @ ${nickname(contract.home_team_name)}`
    const game = gameByDateTitle.get(`${date}:${title}`)
    const outcome = outcomes.get(`${date}:${title}`)
    if (!game || !outcome) return
    const projection = game.analysis?.mlbProjection || {}
    const side =
      contract.team_id === contract.away_team_id
        ? 'away'
        : contract.team_id === contract.home_team_id
          ? 'home'
          : ''
    const projectedRuns =
      side === 'away'
        ? Number(projection.awayFirst5ProjectedRuns)
        : side === 'home'
          ? Number(projection.homeFirst5ProjectedRuns)
          : NaN
    const line = Number(contract.line_value)
    if (!Number.isFinite(projectedRuns) || !Number.isFinite(line)) return
    const lean = projectedRuns >= line ? 'Over' : 'Under'
    const edgeState = discreteTotalEdge(projectedRuns, line, lean)
    if (!edgeState) return
    const edge = edgeState.thresholdCushion
    if (edge < 0.25) return
    const probability = totalProbabilityPct(projectedRuns, line, lean)
    const confidence = clamp(Math.round(Number(probability)) - (edge < 0.75 ? 6 : edge < 1 ? 3 : 0), 50, 80)
    const actualRuns = side === 'away' ? Number(outcome.f5_away_runs) : Number(outcome.f5_home_runs)
    lanes.teamtotal.push({
      date,
      lane: 'team-total-f5',
      game: title,
      pick: `${nickname(contract.team_name)} ${lean} ${line}`,
      confidence,
      edge,
      thresholdCushion: edge,
      side: lean,
      hit: /over/i.test(lean) ? actualRuns > line : actualRuns < line
    })
  })

  return lanes
}

const promotedShape = (row) => row.shadowCalibration?.tier === 'promoted'
const promotedF5Ml = (row) => row.edge >= 0.5 && row.edge < 1.5 && row.tiePct < 20
const promotedNrfi = (row) => row.pick === 'NRFI' && row.confidence >= 60
const promotedTeamTotal = (row) => row.confidence >= 65 || row.confidence < 60

const sortCalibrated = (left, right) =>
  Number(right.shadowCalibration?.calibratedScore || 0) - Number(left.shadowCalibration?.calibratedScore || 0) ||
  Number(right.confidence || 0) - Number(left.confidence || 0) ||
  Number(right.marketEdge || 0) - Number(left.marketEdge || 0) ||
  Number(right.edge || 0) - Number(left.edge || 0)

const dates = datesFromArgs()
const label = `${dates[0]}-to-${dates[dates.length - 1]}`
const lanes = buildRows(dates)

const baselineAll = [
  ...lanes.shape,
  ...lanes.f5ml.map((row) => ({ ...row, hit: row.nonLoss })),
  ...lanes.f5ou,
  ...lanes.first,
  ...lanes.teamtotal
]
const trustedCore = [
  ...lanes.shape,
  ...lanes.f5ml.map((row) => ({ ...row, hit: row.nonLoss })),
  ...lanes.first.filter((row) => row.pick === 'NRFI'),
  ...lanes.teamtotal
]
const bucketFilteredCore = [
  ...lanes.shape.filter(promotedShape),
  ...lanes.f5ml.filter(promotedF5Ml).map((row) => ({ ...row, hit: row.nonLoss })),
  ...lanes.first.filter(promotedNrfi),
  ...lanes.teamtotal.filter(promotedTeamTotal)
]

const potdSummary = dates.map((date) => {
  const rawSections = {
    shape: lanes.shape.filter((row) => row.date === date),
    f5ml: lanes.f5ml.filter((row) => row.date === date).map((row) => ({ ...row, hit: row.nonLoss })),
    f5ou: lanes.f5ou.filter((row) => row.date === date),
    teamtotal: lanes.teamtotal.filter((row) => row.date === date),
    nrfi: lanes.first.filter((row) => row.date === date && row.pick === 'NRFI')
  }
  const calibratedSections = {
    shape: rawSections.shape.filter(promotedShape),
    f5ml: lanes.f5ml.filter((row) => row.date === date && promotedF5Ml(row)).map((row) => ({ ...row, hit: row.nonLoss })),
    f5ou: [],
    teamtotal: rawSections.teamtotal.filter(promotedTeamTotal),
    nrfi: rawSections.nrfi.filter(promotedNrfi)
  }
  const rawTop = Object.entries(rawSections)
    .map(([section, rows]) => ({
      section,
      row: [...rows].sort((left, right) => right.edge - left.edge || right.confidence - left.confidence)[0] || null
    }))
    .filter((entry) => entry.row)
  const calibratedTop = Object.entries(calibratedSections)
    .map(([section, rows]) => ({
      section,
      row: [...rows].sort(sortCalibrated)[0] || null
    }))
    .filter((entry) => entry.row)
  return {
    date,
    raw: {
      picks: rawTop,
      ...rowRecord(rawTop.map((entry) => entry.row))
    },
    calibrated: {
      picks: calibratedTop,
      ...rowRecord(calibratedTop.map((entry) => entry.row))
    }
  }
})

const mlShapeConflictSamples = lanes.shape
  .map((row) => ({
    date: row.date,
    game: row.game,
    pick: row.pick,
    hit: row.hit,
    confidence: row.confidence,
    marketEdge: Number.isFinite(Number(row.marketEdge)) ? round(row.marketEdge, 1) : null,
    marginSupportPct: round(row.edge, 1),
    tier: row.shadowCalibration?.tier,
    metricConflict: row.shadowCalibration?.metricConflict,
    reason: row.shadowCalibration?.reasons?.[0] || ''
  }))
  .sort(
    (left, right) =>
      String(left.metricConflict).localeCompare(String(right.metricConflict)) ||
      Number(right.confidence || 0) - Number(left.confidence || 0)
  )

const report = {
  schemaVersion: 1,
  modelId: 'MLB-M2',
  componentId: 'shadow-calibration-addendum',
  mode: 'shadow',
  dates,
  records: {
    baselineAll: rowRecord(baselineAll),
    trustedCore: rowRecord(trustedCore),
    bucketFilteredCore: rowRecord(bucketFilteredCore),
    mlShapeConfidence65Plus: rowRecord(lanes.shape.filter(promotedShape)),
    mlShapeBelow65: rowRecord(lanes.shape.filter((row) => !promotedShape(row))),
    f5MlPromotedNonLoss: rowRecord(lanes.f5ml.filter(promotedF5Ml), 'nonLoss'),
    nrfiConfidence60Plus: rowRecord(lanes.first.filter(promotedNrfi)),
    teamTotalsPromotedSeed: rowRecord(lanes.teamtotal.filter(promotedTeamTotal))
  },
  buckets: {
    mlShapeByConfidence: bucketTable(lanes.shape, confidenceBucket),
    mlShapeByMetricConflict: bucketTable(lanes.shape, (row) => row.shadowCalibration?.metricConflict || mlShapeConflictBucket(row)),
    f5MlByConfidenceNonLoss: bucketTable(lanes.f5ml, confidenceBucket, 'nonLoss'),
    f5MlByEdgeNonLoss: bucketTable(lanes.f5ml, edgeBucket, 'nonLoss'),
    f5OuByConfidence: bucketTable(lanes.f5ou, confidenceBucket),
    nrfiByConfidence: bucketTable(lanes.first.filter((row) => row.pick === 'NRFI'), confidenceBucket),
    yrfiByConfidence: bucketTable(lanes.first.filter((row) => row.pick === 'YRFI'), confidenceBucket),
    teamTotalsByConfidence: bucketTable(lanes.teamtotal, confidenceBucket),
    teamTotalsByEdge: bucketTable(lanes.teamtotal, edgeBucket)
  },
  samples: {
    mlShapeConflictSamples
  },
  potdSummary,
  rules: {
    promotedShape: 'ML shape confidence >=65',
    mlShapeSignalPriority: 'promotion tier -> model confidence -> market edge -> margin support',
    mlShapeConflictPolicy:
      'High margin support does not override low confidence; high confidence with thin margin is a closer-score win profile.',
    promotedF5Ml: 'F5 ML confidence-first promotion: edge >=0.5, lead confidence >=52, tiePct <20; edge >=1.5 is strong-edge support, not a demotion',
    promotedNrfi: 'NRFI confidence >=60',
    promotedTeamTotal: 'F5 team total confidence >=65 or <60 seed only when discrete hit-threshold cushion >=0.75 runs; watch thin threshold cushions even when raw line edge looks large',
    researchOnly: ['YRFI', 'F5 O/U', 'F5 O/U Pass/Hold/Unsupported over']
  }
}

fs.mkdirSync(reportsDir, { recursive: true })
const jsonPath = path.join(reportsDir, `shadow-calibration-addendum-${label}.json`)
const mdPath = path.join(reportsDir, `shadow-calibration-addendum-${label}.md`)
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2))

const table = (rows) =>
  ['| Bucket | Record | Hit rate | N |', '|---|---:|---:|---:|']
    .concat(rows.map((row) => `| ${row.bucket} | ${row.label} | ${row.hitRatePct ?? 'n/a'}% | ${row.total} |`))
    .join('\n')

const mlShapeSampleTable = (rows) =>
  ['| Date | Pick | Conflict | Tier | Conf | Margin | Hit | Reason |', '|---|---|---|---|---:|---:|---|---|']
    .concat(
      rows.slice(0, 12).map((row) =>
        `| ${row.date} | ${row.pick} | ${row.metricConflict} | ${row.tier} | ${row.confidence}% | ${row.marginSupportPct}% | ${row.hit ? 'hit' : 'miss'} | ${String(row.reason || '').replace(/\|/g, '/')} |`
      )
    )
    .join('\n')

const md = [
  '# Shadow Calibration Addendum Report',
  '',
  `Date window: ${dates[0]} to ${dates[dates.length - 1]}`,
  '',
  '## Summary',
  '',
  `- Baseline all target lanes: ${formatRecord(report.records.baselineAll)}`,
  `- Trusted core without YRFI/F5 O/U promotion: ${formatRecord(report.records.trustedCore)}`,
  `- Bucket-filtered core: ${formatRecord(report.records.bucketFilteredCore)}`,
  '',
  '## Current Seed Rules',
  '',
  `- ML shape: ${report.rules.promotedShape} (${formatRecord(report.records.mlShapeConfidence65Plus)})`,
  `- ML shape signal priority: ${report.rules.mlShapeSignalPriority}.`,
  `- ML shape conflict policy: ${report.rules.mlShapeConflictPolicy}`,
  `- F5 ML: ${report.rules.promotedF5Ml} (${formatRecord(report.records.f5MlPromotedNonLoss)} non-loss)`,
  `- NRFI: ${report.rules.promotedNrfi} (${formatRecord(report.records.nrfiConfidence60Plus)})`,
  `- F5 team totals: ${report.rules.promotedTeamTotal} (${formatRecord(report.records.teamTotalsPromotedSeed)})`,
  '- Research-only: YRFI and F5 O/U until larger walk-forward confirms a promotable bucket.',
  '',
  '## ML Shape By Confidence',
  '',
  table(report.buckets.mlShapeByConfidence),
  '',
  '## ML Shape By Confidence/Margin Conflict',
  '',
  table(report.buckets.mlShapeByMetricConflict),
  '',
  '## ML Shape Conflict Samples',
  '',
  mlShapeSampleTable(report.samples.mlShapeConflictSamples),
  '',
  '## F5 ML By Edge (Non-Loss)',
  '',
  table(report.buckets.f5MlByEdgeNonLoss),
  '',
  '## NRFI By Confidence',
  '',
  table(report.buckets.nrfiByConfidence),
  '',
  '## YRFI By Confidence',
  '',
  table(report.buckets.yrfiByConfidence),
  '',
  '## Team Totals By Confidence',
  '',
  table(report.buckets.teamTotalsByConfidence),
  '',
  '## POTD Raw Vs Calibrated',
  '',
  '| Date | Raw top sections | Calibrated promoted sections |',
  '|---|---:|---:|',
  ...potdSummary.map(
    (day) => `| ${day.date} | ${day.raw.label} (${day.raw.hitRatePct}%) | ${day.calibrated.label} (${day.calibrated.hitRatePct}%) |`
  ),
  ''
].join('\n')
fs.writeFileSync(mdPath, md)

console.log(
  JSON.stringify(
    {
      ok: true,
      jsonPath: path.relative(repoRoot, jsonPath),
      mdPath: path.relative(repoRoot, mdPath),
      records: report.records
    },
    null,
    2
  )
)

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { createSportsMatchModel } from '../lib/sports-model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..', '..', '..')

const parseArgs = () => {
  const options = {
    postDate: '2026-05-31',
    today: '2026-06-01'
  }
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--post-date') options.postDate = args[++index]
    else if (arg === '--today') options.today = args[++index]
  }
  return options
}

const round = (value, places = 1) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  const factor = 10 ** places
  return Math.round(numeric * factor) / factor
}

const pct = (value) => (Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'N/A')

const sqliteJson = (sql) => {
  const dbPath = path.join(rootDir, 'data-private', 'warehouse', 'sports.db')
  const text = execFileSync('sqlite3', ['-json', dbPath, sql], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 80
  })
  return JSON.parse(text || '[]')
}

const safeJson = (text) => {
  try {
    return JSON.parse(text || '{}')
  } catch {
    return {}
  }
}

const normalizeName = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

const eventSets = {
  hit: new Set(['single', 'double', 'triple', 'home_run']),
  extraBase: new Set(['double', 'triple', 'home_run']),
  freePass: new Set(['walk', 'intent_walk', 'hit_by_pitch', 'catcher_interf']),
  error: new Set(['field_error']),
  doublePlay: new Set(['grounded_into_double_play', 'double_play', 'force_out_double_play'])
}

const listMlbFiles = (date) => {
  const gamesDir = path.join(rootDir, 'published-data', 'slates', date, 'games')
  if (!fs.existsSync(gamesDir)) return []
  return fs
    .readdirSync(gamesDir)
    .filter((file) => file.endsWith('.json') && !file.startsWith('rg-'))
    .map((file) => path.join(gamesDir, file))
    .filter((file) => {
      const game = safeJson(fs.readFileSync(file, 'utf8'))
      return game.league === 'MLB'
    })
    .sort()
}

const loadPublishedGames = (date) => {
  const map = new Map()
  for (const file of listMlbFiles(date)) {
    const game = safeJson(fs.readFileSync(file, 'utf8'))
    if (game.gamePk) map.set(String(game.gamePk), { file, game })
  }
  return map
}

const loadOutcomes = (date) => {
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
      total_runs_first5 AS totalRunsFirst5,
      total_runs_final AS totalRunsFinal,
      away_home_runs_first5 AS awayHomeRunsFirst5,
      home_home_runs_first5 AS homeHomeRunsFirst5,
      away_home_runs_final AS awayHomeRunsFinal,
      home_home_runs_final AS homeHomeRunsFinal
    FROM mlb_game_outcomes
    WHERE game_date = '${date}'
    ORDER BY game_pk
  `)
  return rows
}

const loadPlateAppearances = (date) => {
  const rows = sqliteJson(`
    SELECT
      game_pk AS gamePk,
      at_bat_index AS atBatIndex,
      game_date AS gameDate,
      inning,
      half_inning AS halfInning,
      batting_team AS battingTeam,
      fielding_team AS fieldingTeam,
      outs_before AS outsBefore,
      outs_after AS outsAfter,
      pitcher_name AS pitcherName,
      batter_name AS batterName,
      men_on_base AS menOnBase,
      base_state_start AS baseStateStart,
      event,
      event_type AS eventType,
      description,
      rbi,
      run_delta AS runDelta,
      raw_json AS rawJson
    FROM mlb_plate_appearances
    WHERE game_date = '${date}'
    ORDER BY game_pk, at_bat_index
  `)
  const byGame = new Map()
  for (const row of rows) {
    const list = byGame.get(String(row.gamePk)) || []
    list.push(row)
    byGame.set(String(row.gamePk), list)
  }
  return byGame
}

const loadVisibility = (date) => {
  const rows = sqliteJson(`
    SELECT
      o.game_pk AS gamePk,
      o.fielding_errors AS fieldingErrors,
      o.outfield_errors AS outfieldErrors,
      o.outfield_hits AS outfieldHits,
      o.outfield_air_hits AS outfieldAirHits,
      o.outfield_extra_base_hits AS outfieldExtraBaseHits,
      o.outfield_home_runs AS outfieldHomeRuns,
      o.visibility_pressure_events AS visibilityPressureEvents,
      s.visibility_risk_score AS visibilityRiskScore,
      s.risk_label AS riskLabel
    FROM mlb_game_visibility_outcomes o
    LEFT JOIN mlb_game_sun_visibility_snapshots s ON s.game_pk = o.game_pk
    WHERE o.game_date = '${date}'
  `)
  return new Map(rows.map((row) => [String(row.gamePk), row]))
}

const hitDataForPa = (row) => {
  const raw = safeJson(row.rawJson)
  const events = raw.playEvents || []
  const hitEvent = [...events].reverse().find((event) => event.hitData)
  if (!hitEvent) return null
  const hit = hitEvent.hitData || {}
  return {
    launchSpeed: Number(hit.launchSpeed),
    launchAngle: Number(hit.launchAngle),
    trajectory: hit.trajectory || '',
    distance: Number(hit.totalDistance),
    location: String(hit.location || ''),
    hardness: hit.hardness || ''
  }
}

const emptyStats = () => ({
  runs: 0,
  pa: 0,
  baserunners: 0,
  hits: 0,
  singles: 0,
  doubles: 0,
  triples: 0,
  homeRuns: 0,
  extraBaseHits: 0,
  freePasses: 0,
  errors: 0,
  strikeouts: 0,
  doublePlays: 0,
  scoringPas: 0,
  twoOutRuns: 0,
  twoOutScoringPas: 0,
  runnersOnPas: 0,
  hardHits: 0,
  ballsInPlay: 0,
  airBalls: 0,
  outfieldAirBalls: 0,
  inningsWithTrafficNoRuns: 0,
  inningsWithRuns: 0,
  crookedInnings: 0,
  maxInningRuns: 0
})

const addPa = (stats, row) => {
  const eventType = String(row.eventType || '').toLowerCase()
  const runs = Number(row.runDelta || 0)
  stats.pa += 1
  stats.runs += runs
  if (eventSets.hit.has(eventType)) stats.hits += 1
  if (eventType === 'single') stats.singles += 1
  if (eventType === 'double') stats.doubles += 1
  if (eventType === 'triple') stats.triples += 1
  if (eventType === 'home_run') stats.homeRuns += 1
  if (eventSets.extraBase.has(eventType)) stats.extraBaseHits += 1
  if (eventSets.freePass.has(eventType)) stats.freePasses += 1
  if (eventSets.error.has(eventType)) stats.errors += 1
  if (eventType === 'strikeout') stats.strikeouts += 1
  if (eventSets.doublePlay.has(eventType)) stats.doublePlays += 1
  if (eventSets.hit.has(eventType) || eventSets.freePass.has(eventType) || eventSets.error.has(eventType)) stats.baserunners += 1
  if (String(row.baseStateStart || row.menOnBase || '').toLowerCase() !== 'empty') stats.runnersOnPas += 1
  if (runs > 0) {
    stats.scoringPas += 1
    if (Number(row.outsBefore) >= 2) {
      stats.twoOutRuns += runs
      stats.twoOutScoringPas += 1
    }
  }
  const hit = hitDataForPa(row)
  if (hit) {
    stats.ballsInPlay += 1
    if (Number(hit.launchSpeed) >= 95) stats.hardHits += 1
    if (['fly_ball', 'line_drive', 'popup'].includes(hit.trajectory)) stats.airBalls += 1
    if (['7', '8', '9'].includes(hit.location) && ['fly_ball', 'line_drive', 'popup'].includes(hit.trajectory)) {
      stats.outfieldAirBalls += 1
    }
  }
}

const finishInningStats = (stats, inningMap) => {
  for (const inning of Object.values(inningMap)) {
    if (inning.runs > 0) stats.inningsWithRuns += 1
    if (inning.runs >= 3) stats.crookedInnings += 1
    if (inning.baserunners > 0 && inning.runs === 0) stats.inningsWithTrafficNoRuns += 1
    stats.maxInningRuns = Math.max(stats.maxInningRuns, inning.runs)
  }
}

const summarizeRows = (rows) => {
  const total = emptyStats()
  const first5 = emptyStats()
  const bridge = emptyStats()
  const late = emptyStats()
  const teams = new Map()
  const pitchers = new Map()
  const inningMap = {}

  for (const row of rows) {
    const inning = Number(row.inning || 0)
    const teamKey = row.battingTeam || 'Unknown'
    const pitcherKey = row.pitcherName || 'Unknown'
    const inningKey = `${inning}:${teamKey}`
    inningMap[inningKey] = inningMap[inningKey] || { runs: 0, baserunners: 0 }
    inningMap[inningKey].runs += Number(row.runDelta || 0)
    const eventType = String(row.eventType || '').toLowerCase()
    if (eventSets.hit.has(eventType) || eventSets.freePass.has(eventType) || eventSets.error.has(eventType)) {
      inningMap[inningKey].baserunners += 1
    }

    addPa(total, row)
    if (inning <= 5) addPa(first5, row)
    else if (inning <= 7) addPa(bridge, row)
    else addPa(late, row)

    const team = teams.get(teamKey) || emptyStats()
    addPa(team, row)
    teams.set(teamKey, team)

    const pitcher = pitchers.get(pitcherKey) || emptyStats()
    addPa(pitcher, row)
    pitchers.set(pitcherKey, pitcher)
  }

  finishInningStats(total, inningMap)
  finishInningStats(first5, Object.fromEntries(Object.entries(inningMap).filter(([key]) => Number(key.split(':')[0]) <= 5)))
  finishInningStats(bridge, Object.fromEntries(Object.entries(inningMap).filter(([key]) => {
    const inning = Number(key.split(':')[0])
    return inning >= 6 && inning <= 7
  })))
  finishInningStats(late, Object.fromEntries(Object.entries(inningMap).filter(([key]) => Number(key.split(':')[0]) >= 8)))

  return {
    total,
    first5,
    bridge,
    late,
    teams: Object.fromEntries([...teams.entries()].map(([key, value]) => [key, value])),
    pitchers: Object.fromEntries(
      [...pitchers.entries()]
        .sort((left, right) => right[1].runs - left[1].runs)
        .slice(0, 8)
        .map(([key, value]) => [key, value])
    )
  }
}

const topRunInnings = (rows, limit = 4) => {
  const innings = new Map()
  for (const row of rows) {
    const key = `${row.inning} ${row.halfInning} ${row.battingTeam}`
    const item = innings.get(key) || {
      inning: Number(row.inning),
      half: row.halfInning,
      team: row.battingTeam,
      runs: 0,
      baserunners: 0,
      scoring: []
    }
    item.runs += Number(row.runDelta || 0)
    const eventType = String(row.eventType || '').toLowerCase()
    if (eventSets.hit.has(eventType) || eventSets.freePass.has(eventType) || eventSets.error.has(eventType)) item.baserunners += 1
    if (Number(row.runDelta || 0) > 0) {
      item.scoring.push(`${row.batterName}: ${row.event} (${row.runDelta})`)
    }
    innings.set(key, item)
  }
  return [...innings.values()]
    .filter((inning) => inning.runs > 0 || inning.baserunners >= 2)
    .sort((left, right) => right.runs - left.runs || right.baserunners - left.baserunners)
    .slice(0, limit)
}

const lineSide = (actual, line) => {
  if (!Number.isFinite(actual) || !Number.isFinite(line)) return 'unknown'
  if (actual > line) return 'over'
  if (actual < line) return 'under'
  return 'push'
}

const pregameChecks = (game) => {
  const model = createSportsMatchModel(game)
  const totals = model.analysis?.mlbProjection?.totals || game.analysis?.mlbProjection?.totals || {}
  const fullGate = totals.fullGame?.chaosGate || {}
  const f5Gate = totals.first5?.chaosGate || {}
  const metrics = f5Gate.metrics || fullGate.metrics || {}
  const weather = model.analysis?.mlbProjection?.weather || game.analysis?.mlbProjection?.weather || {}
  const gameShape = model.analysis?.gameShape || game.analysis?.gameShape || {}
  const radarAxes = gameShape.radar?.gameProfile?.dominantAxes?.map((axis) => `${axis.label} ${axis.score}`) || []
  const first5Tail = totals.first5TailOverlay || model.analysis?.mlbProjection?.first5TailOverlay || {}
  return {
    projectedFull: Number(totals.projectedFullTotalRuns),
    projectedF5: Number(totals.projectedFirst5TotalRuns),
    postedFull: Number(model.analysis?.mlbProjection?.postedTotal || game.analysis?.mlbProjection?.postedTotal),
    postedF5: Number(totals.derivedFirst5TotalLine),
    fullLean: totals.fullGame?.lean || null,
    f5Lean: totals.first5?.lean || null,
    chaosVeto: Boolean(fullGate.vetoed || f5Gate.vetoed),
    chaosWarning: Boolean(fullGate.warning || f5Gate.warning),
    chaosReason: f5Gate.vetoReason || fullGate.vetoReason || '',
    maxMistakeChaos: round(metrics.maxMistakeChaos),
    maxRunClustering: round(metrics.maxRunClustering),
    maxOneBadInningAllowed: round(Number(metrics.maxOneBadInningAllowed) * 100),
    maxQuietFirst5: round(Number(metrics.maxQuietFirst5) * 100),
    minLineupConversion: round(metrics.minLineupConversion),
    weatherLabel: weather.label || totals.weatherNote || '',
    weatherCarry: Boolean(metrics.weatherCarry || /carry|wind out|hot/i.test(weather.label || totals.weatherNote || '')),
    dominantAxes: radarAxes,
    tailShape: first5Tail.shape || null,
    tailScore: round(first5Tail.tailScore),
    strandScore: round(first5Tail.strandScore),
    forkScore: round(first5Tail.forkScore)
  }
}

const classifyStory = ({ outcome, stats, published, visibility }) => {
  const game = published?.game
  const pregame = game ? pregameChecks(game) : {}
  const fullLine = Number(pregame.postedFull || game?.analysis?.mlbProjection?.postedTotal)
  const f5Line = Number(pregame.postedF5 || game?.analysis?.mlbProjection?.totals?.derivedFirst5TotalLine)
  const fullActual = Number(outcome.totalRunsFinal)
  const f5Actual = Number(outcome.totalRunsFirst5)
  const fullSide = lineSide(fullActual, fullLine)
  const f5Side = lineSide(f5Actual, f5Line)
  const first5 = stats.first5
  const total = stats.total
  const bridge = stats.bridge
  const late = stats.late

  const overCauses = []
  const underCauses = []
  const repeatability = []

  if (first5.maxInningRuns >= 5 || first5.crookedInnings >= 2) {
    overCauses.push(`starter-window crooked inning: max F5 inning ${first5.maxInningRuns}, crooked F5 innings ${first5.crookedInnings}`)
  }
  if (total.homeRuns >= 3 || total.extraBaseHits >= 6 || (total.runs >= 9 && total.homeRuns >= 2 && total.extraBaseHits >= 5)) {
    overCauses.push(`power damage: ${total.homeRuns} HR, ${total.extraBaseHits} XBH`)
  }
  if (first5.runs >= 5 && first5.homeRuns <= 1 && first5.baserunners >= 12) {
    overCauses.push(`traffic avalanche without HR dependency: ${first5.baserunners} F5 baserunners, ${first5.hits} hits, ${first5.freePasses} free passes`)
  }
  if (total.freePasses >= 8 || first5.freePasses >= 5) {
    overCauses.push(`free-pass fuel: ${total.freePasses} BB/HBP/CI, ${first5.freePasses} before the 6th`)
  }
  if (total.errors >= 2 || Number(visibility?.fieldingErrors || 0) >= 2) {
    overCauses.push(`defensive leak: ${visibility?.fieldingErrors ?? total.errors} fielding errors, ${visibility?.outfieldErrors ?? 0} outfield errors`)
  }
  if (bridge.runs + late.runs >= 4) {
    overCauses.push(`post-starter scoring: ${bridge.runs} bridge runs and ${late.runs} late runs`)
  }
  if (total.hardHits >= 14 || Number(visibility?.outfieldExtraBaseHits || 0) >= 4) {
    overCauses.push(`loud-contact tail: ${total.hardHits} hard-hit balls, ${visibility?.outfieldExtraBaseHits ?? 'N/A'} outfield XBH`)
  }
  if (total.twoOutRuns >= 4) {
    overCauses.push(`two-out scoring: ${total.twoOutRuns} runs with two outs`)
  }

  if (first5.runs <= 3 && first5.baserunners <= 10) {
    underCauses.push(`starter-window traffic stayed low: ${first5.runs} F5 runs on ${first5.baserunners} baserunners`)
  }
  if (total.homeRuns === 0 || total.extraBaseHits <= 3) {
    underCauses.push(`power stayed contained: ${total.homeRuns} HR, ${total.extraBaseHits} XBH`)
  }
  if (total.inningsWithTrafficNoRuns >= 6 || first5.inningsWithTrafficNoRuns >= 4) {
    underCauses.push(`traffic stranded: ${total.inningsWithTrafficNoRuns} innings with traffic and no runs`)
  }
  if (total.strikeouts >= 18 || first5.strikeouts >= 10) {
    underCauses.push(`bat-missing held the run chain down: ${total.strikeouts} strikeouts`)
  }
  if (bridge.runs + late.runs <= 2) {
    underCauses.push(`bridge/late stayed clean: ${bridge.runs + late.runs} runs after the 5th`)
  }
  if (total.doublePlays >= 3) {
    underCauses.push(`rally deletion: ${total.doublePlays} double-play/force-DP events`)
  }

  if (pregame.chaosWarning || pregame.chaosVeto) {
    repeatability.push(`pregame did see chaos: ${pregame.chaosReason || 'chaos warning'}; mistake ${pregame.maxMistakeChaos}, cluster ${pregame.maxRunClustering}, one-bad ${pregame.maxOneBadInningAllowed}%`)
  }
  if (pregame.weatherCarry) repeatability.push(`pregame carry was live: ${pregame.weatherLabel}`)
  if (Number(pregame.maxQuietFirst5) >= 60) {
    repeatability.push(`pregame also saw under/strand risk: quiet F5 ${pregame.maxQuietFirst5}%, lineup conversion floor ${pregame.minLineupConversion}`)
  }
  if (pregame.tailShape) {
    repeatability.push(`tail overlay said ${pregame.tailShape}: tail ${pregame.tailScore}, strand ${pregame.strandScore}, fork ${pregame.forkScore}`)
  }
  if (pregame.dominantAxes?.length) repeatability.push(`radar axes: ${pregame.dominantAxes.join(', ')}`)

  const primaryStory =
    f5Side === 'over' || fullSide === 'over'
      ? overCauses.slice(0, 3).join('; ') || 'over came from distributed run conversion'
      : underCauses.slice(0, 3).join('; ') || 'under came from run suppression without one dominant cause'
  const fullActualDrivers = fullSide === 'over' ? overCauses : fullSide === 'under' ? underCauses : []
  const f5ActualDrivers = f5Side === 'over' ? overCauses : f5Side === 'under' ? underCauses : []
  const counterDrivers = fullSide === 'over' || f5Side === 'over' ? underCauses : overCauses

  return {
    gamePk: outcome.gamePk,
    title: `${outcome.awayTeam} @ ${outcome.homeTeam}`,
    lines: {
      full: Number.isFinite(fullLine) ? fullLine : null,
      first5: Number.isFinite(f5Line) ? f5Line : null
    },
    actual: {
      full: fullActual,
      first5: f5Actual,
      finalScore: `${outcome.awayRunsFinal}-${outcome.homeRunsFinal}`,
      first5Score: `${outcome.awayRunsFirst5}-${outcome.homeRunsFirst5}`
    },
    sides: {
      full: fullSide,
      first5: f5Side
    },
    primaryStory,
    fullActualDrivers,
    f5ActualDrivers,
    counterDrivers,
    overCauses,
    underCauses,
    repeatability,
    topInnings: topRunInnings(published?.rows || [], 5),
    stats: {
      first5,
      bridge,
      late,
      total,
      visibility
    },
    pregame
  }
}

const todayRead = (game) => {
  const pregame = pregameChecks(game)
  const overWhy = []
  const underWhy = []
  const liveChecks = []
  if (pregame.chaosWarning || pregame.chaosVeto) overWhy.push(`chaos warning: ${pregame.chaosReason || 'one-bad-inning path'}`)
  if (Number(pregame.maxMistakeChaos) >= 62) overWhy.push(`mistake-chaos ${pregame.maxMistakeChaos}`)
  if (Number(pregame.maxRunClustering) >= 68) overWhy.push(`run-cluster ${pregame.maxRunClustering}`)
  if (Number(pregame.maxOneBadInningAllowed) >= 55) overWhy.push(`one-bad-inning ${pregame.maxOneBadInningAllowed}%`)
  if (pregame.weatherCarry) overWhy.push(`carry environment: ${pregame.weatherLabel}`)
  if (['over-tail', 'live-only fork'].includes(pregame.tailShape)) overWhy.push(`tail overlay ${pregame.tailShape}: tail ${pregame.tailScore}`)

  if (Number(pregame.maxQuietFirst5) >= 60) underWhy.push(`quiet-first-five ${pregame.maxQuietFirst5}%`)
  if (Number(pregame.minLineupConversion) <= 25) underWhy.push(`weak conversion floor ${pregame.minLineupConversion}`)
  if (pregame.tailShape === 'strand-tail') underWhy.push(`tail overlay strand-tail: strand ${pregame.strandScore}`)
  if (pregame.fullLean === 'Under' || pregame.f5Lean === 'Under') underWhy.push(`model lean ${pregame.f5Lean || pregame.fullLean}`)

  if (overWhy.length && underWhy.length) liveChecks.push('fork game: require first-cycle baserunners, pitcher command wobble, or hard outfield contact before trusting an over')
  if (overWhy.length && !underWhy.length) liveChecks.push('over can be pregame-active only if market price clears calibrated gate')
  if (!overWhy.length && underWhy.length) liveChecks.push('under survives only while first time through order stays low-traffic')
  if (!overWhy.length && !underWhy.length) liveChecks.push('no strong story edge from current M2 fields')

  return {
    gamePk: game.gamePk,
    title: game.title,
    question: 'Will the previous over/under mechanism happen today?',
    overWhy,
    underWhy,
    liveChecks,
    pregame
  }
}

const buildMarkdown = ({ postDate, today, stories, todayReads }) => {
  const lines = []
  lines.push('# MLB-M2 Run Total Story Engine')
  lines.push('')
  lines.push(`Postgame date: ${postDate}`)
  lines.push(`Today check: ${today}`)
  lines.push('')
  lines.push('This report asks the baseball question first: why did the game go over or under, and is that mechanism visible before the next slate? It is intentionally not a projection-error table.')
  lines.push('')
  lines.push('## Settled Game Stories')
  lines.push('')
  for (const story of stories) {
    lines.push(`### ${story.title}`)
    lines.push('')
    lines.push(`- Result: full ${story.actual.full} vs line ${story.lines.full ?? 'N/A'} (${story.sides.full}); F5 ${story.actual.first5} vs line ${story.lines.first5 ?? 'N/A'} (${story.sides.first5}).`)
    lines.push(`- Primary story: ${story.primaryStory}.`)
    if (story.fullActualDrivers.length) lines.push(`- Why the full-game ${story.sides.full} happened: ${story.fullActualDrivers.slice(0, 5).join('; ')}.`)
    if (story.f5ActualDrivers.length) lines.push(`- Why the F5 ${story.sides.first5} happened: ${story.f5ActualDrivers.slice(0, 5).join('; ')}.`)
    if (story.counterDrivers.length) lines.push(`- Counter-story to check next time: ${story.counterDrivers.slice(0, 4).join('; ')}.`)
    if (story.repeatability.length) lines.push(`- Pregame repeatability checks: ${story.repeatability.slice(0, 4).join('; ')}.`)
    if (story.topInnings.length) {
      const inningText = story.topInnings
        .slice(0, 3)
        .map((inning) => `${inning.inning}${inning.half === 'top' ? 'T' : 'B'} ${inning.team}: ${inning.runs} R / ${inning.baserunners} traffic`)
        .join('; ')
      lines.push(`- Key innings: ${inningText}.`)
    }
    lines.push('')
  }
  lines.push('## Today Transfer Check')
  lines.push('')
  if (!todayReads.length) {
    lines.push('- No MLB published game files were available for the today check.')
  } else {
    for (const read of todayReads) {
      lines.push(`### ${read.title}`)
      lines.push('')
      lines.push(`- Why over could happen: ${read.overWhy.length ? read.overWhy.join('; ') : 'no strong pregame over mechanism surfaced'}.`)
      lines.push(`- Why under could happen: ${read.underWhy.length ? read.underWhy.join('; ') : 'no strong pregame under mechanism surfaced'}.`)
      lines.push(`- How to use it: ${read.liveChecks.join('; ')}.`)
      lines.push('')
    }
  }
  lines.push('## Model Rule')
  lines.push('')
  lines.push('- M2 totals must classify the story bucket before pricing the side: crooked-inning over, traffic-conversion over, power over, bridge over, starter hold under, strand under, power-suppressed under, or fork/live-only.')
  lines.push('- The value board should filter model-owned story buckets. It should not convert a point projection into EV by itself.')
  lines.push('- A story is repeatable only when the pregame file shows the same mechanism: command leak, traffic, power/carry, fielding/outfield tail, bridge leak, or strand suppressor.')
  return lines.join('\n')
}

const main = () => {
  const options = parseArgs()
  const outcomes = loadOutcomes(options.postDate)
  const paByGame = loadPlateAppearances(options.postDate)
  const published = loadPublishedGames(options.postDate)
  const visibility = loadVisibility(options.postDate)
  const stories = []

  for (const outcome of outcomes) {
    const rows = paByGame.get(String(outcome.gamePk)) || []
    const pub = published.get(String(outcome.gamePk)) || null
    const stats = summarizeRows(rows)
    stories.push(
      classifyStory({
        outcome,
        stats,
        published: pub ? { ...pub, rows } : { rows },
        visibility: visibility.get(String(outcome.gamePk)) || null
      })
    )
  }

  const todayReads = [...loadPublishedGames(options.today).values()].map(({ game }) => todayRead(game))
  const report = {
    schemaVersion: 1,
    modelId: 'MLB-M2',
    experiment: 'run_total_story_engine',
    postDate: options.postDate,
    today: options.today,
    coverage: {
      settledGames: stories.length,
      todayGames: todayReads.length
    },
    stories,
    todayReads
  }

  const reportDir = path.join(rootDir, 'models', 'mlb', 'cartridges', 'MLB-M2', 'reports')
  const privateDir = path.join(rootDir, 'data-private', 'reports')
  fs.mkdirSync(reportDir, { recursive: true })
  fs.mkdirSync(privateDir, { recursive: true })
  const markdownOut = path.join(reportDir, `run-total-story-engine-${options.postDate}-today-${options.today}.md`)
  const jsonOut = path.join(privateDir, `mlb-m2-run-total-story-engine-${options.postDate}-today-${options.today}.json`)
  fs.writeFileSync(markdownOut, buildMarkdown({ postDate: options.postDate, today: options.today, stories, todayReads }))
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2))
  console.log(`Wrote ${markdownOut}`)
  console.log(`Wrote ${jsonOut}`)
  console.log(JSON.stringify(report.coverage, null, 2))
}

main()

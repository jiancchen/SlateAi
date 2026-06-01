import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { createSportsMatchModel } from '../lib/sports-model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..', '..', '..')
const date = '2026-05-31'

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

const toShortName = (name) => shortNames[name] || name
const numberOrNull = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}
const round1 = (value) => Number.isFinite(Number(value)) ? Math.round(Number(value) * 10) / 10 : null
const sqliteJson = (sql) =>
  JSON.parse(
    execFileSync('sqlite3', ['-json', path.join(rootDir, 'data-private', 'warehouse', 'sports.db'), sql], {
      cwd: rootDir,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 50
    }) || '[]'
  )

const loadOutcomes = () => {
  const rows = sqliteJson(`
    SELECT
      game_pk AS gamePk,
      away_team AS awayTeam,
      home_team AS homeTeam,
      away_runs_first5 AS awayRunsFirst5,
      home_runs_first5 AS homeRunsFirst5,
      away_hits_first5 AS awayHitsFirst5,
      home_hits_first5 AS homeHitsFirst5,
      total_runs_first5 AS totalRunsFirst5
    FROM mlb_game_outcomes
    WHERE game_date = '${date}'
  `)
  return new Map(rows.map((row) => [String(row.gamePk), row]))
}

const loadPaShape = () => {
  const rows = sqliteJson(`
    SELECT
      game_pk AS gamePk,
      inning,
      batting_team AS battingTeam,
      event_type AS eventType,
      run_delta AS runDelta
    FROM mlb_plate_appearances
    WHERE game_date = '${date}' AND inning <= 5
  `)
  const map = new Map()
  const inningMap = new Map()
  for (const row of rows) {
    const team = toShortName(row.battingTeam)
    const key = `${row.gamePk}:${team}`
    const bucket = map.get(key) || {
      plateAppearances: 0,
      hits: 0,
      xbh: 0,
      homeRuns: 0,
      freePasses: 0,
      strikeouts: 0,
      errorsOn: 0,
      traffic: 0,
      runsFromPa: 0
    }
    const event = String(row.eventType || '')
    const hit = ['single', 'double', 'triple', 'home_run'].includes(event)
    const xbh = ['double', 'triple', 'home_run'].includes(event)
    const freePass = ['walk', 'intent_walk', 'hit_by_pitch', 'catcher_interf'].includes(event)
    const error = event.includes('error')
    bucket.plateAppearances += 1
    if (hit) bucket.hits += 1
    if (xbh) bucket.xbh += 1
    if (event === 'home_run') bucket.homeRuns += 1
    if (freePass) bucket.freePasses += 1
    if (event === 'strikeout') bucket.strikeouts += 1
    if (error) bucket.errorsOn += 1
    if (hit || freePass || error) bucket.traffic += 1
    bucket.runsFromPa += Math.max(Number(row.runDelta || 0), 0)
    map.set(key, bucket)

    const inningKey = `${key}:${row.inning}`
    inningMap.set(inningKey, (inningMap.get(inningKey) || 0) + Math.max(Number(row.runDelta || 0), 0))
  }
  for (const [key, bucket] of map.entries()) {
    let maxInningRuns = 0
    for (let inning = 1; inning <= 5; inning += 1) {
      maxInningRuns = Math.max(maxInningRuns, inningMap.get(`${key}:${inning}`) || 0)
    }
    bucket.maxInningRuns = maxInningRuns
    bucket.trafficConversion = bucket.traffic ? bucket.runsFromPa / bucket.traffic : null
    bucket.runsPerHit = bucket.hits ? bucket.runsFromPa / bucket.hits : null
  }
  return map
}

const loadContactShape = () => {
  const rows = sqliteJson(`
    SELECT game_pk AS gamePk, batting_team AS battingTeam, raw_json AS rawJson
    FROM mlb_pitch_events
    WHERE game_date = '${date}' AND inning <= 5 AND is_in_play = 1 AND raw_json IS NOT NULL
  `)
  const map = new Map()
  for (const row of rows) {
    const team = toShortName(row.battingTeam)
    const key = `${row.gamePk}:${team}`
    const bucket = map.get(key) || {
      bbe: 0,
      hardHit: 0,
      barrelish: 0,
      weakContact: 0,
      longContact: 0,
      launchSpeedTotal: 0,
      launchAngleTotal: 0
    }
    let payload = {}
    try {
      payload = JSON.parse(row.rawJson)
    } catch {
      payload = {}
    }
    const hitData = payload.hitData || {}
    const launchSpeed = numberOrNull(hitData.launchSpeed)
    const launchAngle = numberOrNull(hitData.launchAngle)
    const distance = numberOrNull(hitData.totalDistance)
    bucket.bbe += 1
    if (Number.isFinite(launchSpeed)) {
      bucket.launchSpeedTotal += launchSpeed
      if (launchSpeed >= 95) bucket.hardHit += 1
      if (launchSpeed <= 72) bucket.weakContact += 1
    }
    if (Number.isFinite(launchAngle)) bucket.launchAngleTotal += launchAngle
    if (Number.isFinite(launchSpeed) && Number.isFinite(launchAngle) && launchSpeed >= 95 && launchAngle >= 8 && launchAngle <= 32) {
      bucket.barrelish += 1
    }
    if (Number.isFinite(distance) && distance >= 275) bucket.longContact += 1
    map.set(key, bucket)
  }
  for (const bucket of map.values()) {
    bucket.hardHitRate = bucket.bbe ? bucket.hardHit / bucket.bbe : null
    bucket.barrelishRate = bucket.bbe ? bucket.barrelish / bucket.bbe : null
    bucket.avgLaunchSpeed = bucket.bbe ? bucket.launchSpeedTotal / bucket.bbe : null
    bucket.avgLaunchAngle = bucket.bbe ? bucket.launchAngleTotal / bucket.bbe : null
  }
  return map
}

const trendFlags = ({ mistake = {}, lineup = {}, hitter = {}, teamState = {}, gameTail = {} }) => {
  const flags = []
  const runCluster = Number(mistake.runClusteringIndex)
  const mistakeChaos = Number(mistake.mistakeChaosIndex)
  const oneBad = Number(mistake.oneBadInningAllowedRate)
  const quiet = Number(lineup.quietFirst5Rate)
  const deadTraffic = Number(lineup.deadBatTrafficRate)
  const noConversion = Number(lineup.trafficNoConversionRate)
  const conversion = Number(lineup.lineupConversionIndex)
  const heat = Number(hitter.top6HeatIndex)
  const xwobaTrend = Number(hitter.top6XwobaTrend)
  const runDiffLast5 = Number(teamState.runDiffLast5)
  if (runCluster >= 75) flags.push(`run cluster ${round1(runCluster)}`)
  if (mistakeChaos >= 66) flags.push(`mistake chaos ${round1(mistakeChaos)}`)
  if (oneBad >= 0.55) flags.push(`one-bad ${Math.round(oneBad * 100)}%`)
  if (quiet >= 0.5) flags.push(`quiet F5 ${Math.round(quiet * 100)}%`)
  if (deadTraffic >= 0.38) flags.push(`dead traffic ${Math.round(deadTraffic * 100)}%`)
  if (noConversion >= 0.25) flags.push(`no-conv ${Math.round(noConversion * 100)}%`)
  if (conversion <= 25) flags.push(`low conversion ${round1(conversion)}`)
  if (heat >= 62) flags.push(`hitter heat ${round1(heat)}`)
  if (xwobaTrend >= 0.04) flags.push(`xwOBA up ${round1(xwobaTrend)}`)
  if (runDiffLast5 >= 3) flags.push(`run diff L5 +${round1(runDiffLast5)}`)
  if (gameTail?.shape === 'over-tail') flags.push('game over-tail')
  if (gameTail?.shape === 'unsupported-over') flags.push('unsupported game over')
  if (gameTail?.shape === 'live-only fork') flags.push('game fork')
  return flags
}

const outcomeBucket = (runs) => {
  if (runs >= 5) return 'explosion'
  if (runs >= 3) return 'scored'
  if (runs >= 2) return 'low'
  return 'dead'
}

const projectionBucket = (runs) => {
  if (runs >= 3.4) return 'expected explosion/scoring'
  if (runs >= 2.6) return 'expected scored'
  if (runs >= 1.8) return 'expected low'
  return 'expected dead'
}

const classifyMiss = ({ projectedRuns, actualRuns, pa = {}, contact = {}, flags = [] }) => {
  const miss = actualRuns - projectedRuns
  if (actualRuns >= 5 && projectedRuns < 3.4) {
    if (flags.some((flag) => /run cluster|one-bad|mistake chaos|over-tail|xwOBA up/.test(flag))) return 'missed explosion signal'
    return 'unseen explosion'
  }
  if (actualRuns <= 1 && projectedRuns >= 2.4) {
    if ((contact.hardHitRate ?? 0) <= 0.24) return 'projected runs but contact died'
    if ((pa.trafficConversion ?? 1) <= 0.18) return 'projected runs but traffic stranded'
    return 'projected runs but offense dead'
  }
  if (miss >= 2) return 'under-projected scoring'
  if (miss <= -2) return 'over-projected scoring'
  return 'close enough'
}

const main = () => {
  const outcomes = loadOutcomes()
  const paShape = loadPaShape()
  const contactShape = loadContactShape()
  const rows = []
  const gameRows = []
  const gamesDir = path.join(rootDir, 'published-data', 'slates', date, 'games')
  for (const file of fs.readdirSync(gamesDir).filter((entry) => entry.endsWith('.json') && !entry.startsWith('rg-')).sort()) {
    const game = JSON.parse(fs.readFileSync(path.join(gamesDir, file), 'utf8'))
    if (game.league !== 'MLB') continue
    const actual = outcomes.get(String(game.gamePk))
    if (!actual) continue
    const model = createSportsMatchModel(game)
    const totals = model.analysis?.mlbProjection?.totals || {}
    const projection = model.analysis?.mlbProjection || {}
    const sideContexts = [
      {
        side: 'away',
        team: toShortName(actual.awayTeam),
        projectedRuns: Number(projection.awayFirst5ProjectedRuns),
        projectedHits: Number(projection.awayFirst5ProjectedHits),
        actualRuns: Number(actual.awayRunsFirst5),
        actualHits: Number(actual.awayHitsFirst5),
        mistake: game.stateContext?.teamMistakeShape?.away || {},
        lineup: game.stateContext?.lineupConversion?.away || {},
        hitter: game.stateContext?.hitterState?.away || {},
        teamState: game.stateContext?.teamState?.away || {}
      },
      {
        side: 'home',
        team: toShortName(actual.homeTeam),
        projectedRuns: Number(projection.homeFirst5ProjectedRuns),
        projectedHits: Number(projection.homeFirst5ProjectedHits),
        actualRuns: Number(actual.homeRunsFirst5),
        actualHits: Number(actual.homeHitsFirst5),
        mistake: game.stateContext?.teamMistakeShape?.home || {},
        lineup: game.stateContext?.lineupConversion?.home || {},
        hitter: game.stateContext?.hitterState?.home || {},
        teamState: game.stateContext?.teamState?.home || {}
      }
    ]
    gameRows.push({
      gameTitle: game.title,
      baseF5Total: totals.projectedFirst5TotalRuns,
      tailAdjustedF5Total: totals.tailAdjustedProjectedFirst5TotalRuns,
      line: totals.derivedFirst5TotalLine,
      actualF5Total: actual.totalRunsFirst5,
      tailShape: totals.first5TailOverlay?.shape || '',
      publishedSide: totals.first5?.lean || 'Pass'
    })
    for (const context of sideContexts) {
      const key = `${game.gamePk}:${context.team}`
      const pa = paShape.get(key) || {}
      const contact = contactShape.get(key) || {}
      const flags = trendFlags({
        mistake: context.mistake,
        lineup: context.lineup,
        hitter: context.hitter,
        teamState: context.teamState,
        gameTail: totals.first5TailOverlay || {}
      })
      const projected3Plus = context.projectedRuns >= 2.8
      const actual3Plus = context.actualRuns >= 3
      const projectedExplosion = context.projectedRuns >= 3.4 || flags.some((flag) => /over-tail|run cluster|one-bad/.test(flag))
      const actualExplosion = context.actualRuns >= 5
      const projectedDead = context.projectedRuns <= 1.8 || flags.some((flag) => /unsupported game over|quiet F5|dead traffic|no-conv/.test(flag))
      const actualDead = context.actualRuns <= 1
      rows.push({
        gameTitle: game.title,
        team: context.team,
        side: context.side,
        projectedRuns: round1(context.projectedRuns),
        actualRuns: context.actualRuns,
        runMiss: round1(context.actualRuns - context.projectedRuns),
        projectedHits: round1(context.projectedHits),
        actualHits: context.actualHits,
        projectionBucket: projectionBucket(context.projectedRuns),
        outcomeBucket: outcomeBucket(context.actualRuns),
        projected3Plus,
        actual3Plus,
        hit3Plus: projected3Plus === actual3Plus,
        projectedExplosion,
        actualExplosion,
        hitExplosion: projectedExplosion === actualExplosion,
        projectedDead,
        actualDead,
        hitDead: projectedDead === actualDead,
        pa,
        contact,
        trendFlags: flags,
        missClass: classifyMiss({
          projectedRuns: context.projectedRuns,
          actualRuns: context.actualRuns,
          pa,
          contact,
          flags
        })
      })
    }
  }

  const rate = (items, key) => {
    const graded = items.filter((row) => typeof row[key] === 'boolean')
    const hits = graded.filter((row) => row[key]).length
    return {
      record: `${hits}/${graded.length}`,
      hitRate: graded.length ? hits / graded.length : null
    }
  }
  const groupedMisses = rows.reduce((acc, row) => {
    acc[row.missClass] = (acc[row.missClass] || 0) + 1
    return acc
  }, {})
  const explosionRows = rows.filter((row) => row.actualExplosion)
  const deadRows = rows.filter((row) => row.actualDead)
  const biggestMisses = rows
    .slice()
    .sort((a, b) => Math.abs(b.runMiss) - Math.abs(a.runMiss))
    .slice(0, 12)

  const report = {
    schemaVersion: 1,
    modelId: 'MLB-M2',
    experiment: 'may31_team_run_truth_audit',
    date,
    summary: {
      teamRows: rows.length,
      threePlusClassifier: rate(rows, 'hit3Plus'),
      explosionClassifier: rate(rows, 'hitExplosion'),
      deadClassifier: rate(rows, 'hitDead'),
      actualExplosionTeams: explosionRows.length,
      actualDeadTeams: deadRows.length,
      missClasses: groupedMisses
    },
    gameRows,
    biggestMisses,
    rows
  }

  const fmtPct = (value) => Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'N/A'
  const missRows = biggestMisses
    .map((row) =>
      [
        row.gameTitle,
        row.team,
        row.projectedRuns,
        row.actualRuns,
        row.runMiss,
        row.projectionBucket,
        row.outcomeBucket,
        row.missClass,
        row.trendFlags.join('; '),
        row.contact?.hardHitRate == null ? '' : `${Math.round(row.contact.hardHitRate * 100)}%`,
        row.pa?.trafficConversion == null ? '' : `${Math.round(row.pa.trafficConversion * 100)}%`
      ].join(' | ')
    )
    .join('\n')
  const allRows = rows
    .map((row) =>
      [
        row.gameTitle,
        row.team,
        row.projectedRuns,
        row.actualRuns,
        row.runMiss,
        row.actual3Plus ? '3+' : '0-2',
        row.actualExplosion ? 'explosion' : '',
        row.actualDead ? 'dead' : '',
        row.missClass,
        row.trendFlags.join('; ')
      ].join(' | ')
    )
    .join('\n')
  const markdown = `# MLB-M2 May 31 Team Run Truth Audit

This audit treats May 31 as a correctness problem, not an error-minimization problem. The questions are: did we identify which teams would score, which teams would die, and which teams had explosion paths?

## Correctness Summary

- Team rows: ${report.summary.teamRows}
- 3+ run classifier: ${report.summary.threePlusClassifier.record} (${fmtPct(report.summary.threePlusClassifier.hitRate)})
- Explosion classifier: ${report.summary.explosionClassifier.record} (${fmtPct(report.summary.explosionClassifier.hitRate)})
- Dead-offense classifier: ${report.summary.deadClassifier.record} (${fmtPct(report.summary.deadClassifier.hitRate)})
- Actual explosion teams: ${report.summary.actualExplosionTeams}
- Actual dead teams: ${report.summary.actualDeadTeams}

Miss classes:

${Object.entries(groupedMisses).map(([label, count]) => `- ${label}: ${count}`).join('\n')}

## Biggest Team-Level Misses

| Game | Team | Proj R | Actual R | Miss | Projection | Outcome | Miss class | Pregame trend flags | Hard-hit | Traffic conv |
| --- | --- | ---: | ---: | ---: | --- | --- | --- | --- | ---: | ---: |
${missRows}

## All Team Rows

| Game | Team | Proj R | Actual R | Miss | Actual 3+ | Explosion | Dead | Miss class | Pregame trend flags |
| --- | --- | ---: | ---: | ---: | --- | --- | --- | --- | --- |
${allRows}

## Read

The model’s problem was not only run-count error. The underlying expectation buckets were wrong. It missed several teams that should have been treated as explosion candidates, and it projected scoring from teams whose contact or conversion path died. For M2, expected runs should be downstream of a game-shape classifier: explosion path, dead path, normal path, or live fork.
`

  const reportDir = path.join(rootDir, 'models', 'mlb', 'cartridges', 'MLB-M2', 'reports')
  const privateDir = path.join(rootDir, 'data-private', 'reports')
  fs.mkdirSync(reportDir, { recursive: true })
  fs.mkdirSync(privateDir, { recursive: true })
  const markdownOut = path.join(reportDir, 'may31-team-run-truth-audit-2026-06-01.md')
  const jsonOut = path.join(privateDir, 'mlb-m2-may31-team-run-truth-audit-2026-06-01.json')
  fs.writeFileSync(markdownOut, markdown)
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2))
  console.log(`Wrote ${markdownOut}`)
  console.log(`Wrote ${jsonOut}`)
}

main()

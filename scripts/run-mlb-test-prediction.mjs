import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import { buildMlbPredictionEligibility } from '../models/mlb/lib/prediction-eligibility.mjs'
import { rankAnalysisPicks } from '../models/mlb/cartridges/MLB-M2/lib/pick-rankings.js'

const root = path.resolve(import.meta.dirname, '..')
const reportsRoot = path.join(root, 'data-migration', 'reports')

const argValue = (name, fallback = '') => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const hasFlag = (name) => process.argv.includes(name)
const array = (value) => (Array.isArray(value) ? value : [])
const num = (value, fallback = null) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const pacificToday = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date()).map((part) => [part.type, part.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

const readJson = async (filePath, fallback = null) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

const writeJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

const writeText = async (filePath, text) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, text, 'utf8')
}

const run = (label, command, args = []) => {
  const startedMs = Date.now()
  const rendered = [command, ...args].join(' ')
  console.log(`\n[mlb-test-prediction] ${label}`)
  console.log(`[mlb-test-prediction] $ ${rendered}`)
  execFileSync(command, args, { cwd: root, stdio: 'inherit', env: { ...process.env } })
  const finishedMs = Date.now()
  return {
    label,
    command: rendered,
    status: 'passed',
    startedAt: new Date(startedMs).toISOString(),
    finishedAt: new Date(finishedMs).toISOString(),
    durationMs: finishedMs - startedMs
  }
}

const loadCurrentSlate = async (date) => {
  const summaryPath = path.join(root, 'web', 'public', 'data', 'current', 'summary.json')
  const summary = await readJson(summaryPath, null)
  if (!summary) throw new Error('Missing web/public/data/current/summary.json; run the prediction chain first.')
  const slateDate = summary.id || summary.date
  if (date && slateDate !== date) {
    throw new Error(`Current slate date mismatch: expected ${date}, found ${slateDate || 'unknown'}.`)
  }
  const games = []
  for (const row of array(summary.games).filter((game) => game?.league === 'MLB')) {
    const gamePath = path.join(root, 'web', 'public', 'data', 'current', 'games', `${row.id}.json`)
    const game = await readJson(gamePath, null)
    if (game) {
      games.push({
        ...game,
        predictionEligibility: buildMlbPredictionEligibility(game, { requireAddendums: true })
      })
    }
  }
  return { summary, games }
}

const playerLabel = (player = {}) =>
  [player.side, player.slot, player.name || player.playerId || 'unknown'].filter((value) => value !== undefined && value !== '').join(':')

const eligibilitySummary = (games = []) => {
  const eligible = games.filter((game) => game?.predictionEligibility?.eligible === true)
  const pending = games.filter((game) => game?.predictionEligibility?.eligible !== true)
  const official = games.filter((game) => game?.predictionEligibility?.status === 'official')
  const projected = games.filter((game) => game?.predictionEligibility?.status === 'projected')
  const blockedGames = pending.map((game) => {
    const eligibility = game.predictionEligibility || {}
    const addendums = eligibility.addendums || {}
    return {
      gameId: game.id,
      title: game.title,
      status: eligibility.status || 'pending',
      hardFailures: array(eligibility.hardFailures),
      missingPitchFitHitters: array(addendums.missingPitchFitHitters).map(playerLabel),
      missingBatterProjectionHitters: array(addendums.missingBatterProjectionHitters).map(playerLabel),
      missingHandednessSplitHitters: array(addendums.missingHandednessSplitHitters).map(playerLabel),
      pitcherSlotHitters: array(addendums.pitcherSlotHitters).map(playerLabel)
    }
  })
  return {
    totalGames: games.length,
    eligibleGames: eligible.length,
    pendingGames: pending.length,
    officialLineupGames: official.length,
    projectedLineupGames: projected.length,
    blockedGames
  }
}

const strengthWeight = (strength = '') => {
  const key = String(strength || '').toLowerCase()
  if (/strong|best/.test(key)) return 24
  if (/lean|clear/.test(key)) return 14
  if (/thin|watch/.test(key)) return 5
  if (/pass|hold/.test(key)) return -10
  return 0
}

const marketRow = ({ game, market, pick, edge = null, probability = null, score = 0, detail = '', source = '' }) => ({
  gameId: game.id,
  title: game.title,
  start: game.start,
  market,
  pick,
  edge,
  probability,
  score: Math.round(score),
  detail,
  source
})

const collectMarketPicks = (games = []) => {
  const eligibleGames = games.filter((game) => game?.predictionEligibility?.eligible === true)
  const rows = []

  for (const ranked of rankAnalysisPicks(eligibleGames).slice(0, 12)) {
    rows.push(marketRow({
      game: ranked.game,
      market: 'Moneyline',
      pick: ranked.participant?.name || ranked.game?.analysis?.participant?.name || ranked.game?.analysis?.lean || 'ML lean',
      edge: num(ranked.modelEdge, null),
      probability: ranked.participant?.impliedProbabilityLabel || ranked.marketProbabilityLabel || null,
      score: num(ranked.safetyScore, 0),
      detail: `${ranked.tier || 'ranked'}; confidence ${ranked.confidence ?? 'n/a'}; safety ${ranked.safetyScore}`,
      source: 'M2 pick rankings'
    }))
  }

  for (const game of eligibleGames) {
    const projection = game?.analysis?.mlbProjection || {}
    const totals = projection.totals || {}
    const first5Ml = projection.first5Moneyline || {}
    if (first5Ml.pickTeam && num(first5Ml.leadProbability, null) !== null) {
      const leadProbability = num(first5Ml.leadProbability, 0)
      const runGap = Math.abs(num(first5Ml.homeProjectedRuns, 0) - num(first5Ml.awayProjectedRuns, 0))
      rows.push(marketRow({
        game,
        market: 'First 5 ML',
        pick: first5Ml.pickTeam,
        edge: Math.round(runGap * 10) / 10,
        probability: `${leadProbability}% lead / ${first5Ml.pushProbability ?? 'n/a'}% push`,
        score: leadProbability - 50 + runGap * 24,
        detail: `${first5Ml.awayProjectedRuns ?? 'n/a'}-${first5Ml.homeProjectedRuns ?? 'n/a'} projected F5 runs`,
        source: first5Ml.source || 'M2 first-five projected runs'
      }))
    }

    for (const [market, total] of [
      ['Full Game Total', totals.fullGame],
      ['First 5 Total', totals.first5],
      ['Rest Of Game Total', totals.restOfGame]
    ]) {
      if (!total?.lean || /pass|hold/i.test(String(total.lean))) continue
      const edge = Math.abs(num(total.edge, 0))
      rows.push(marketRow({
        game,
        market,
        pick: total.label || `${total.lean} ${total.line ?? ''}`.trim(),
        edge,
        probability: null,
        score: edge * 18 + strengthWeight(total.strength),
        detail: total.summary || `${total.lean} edge ${edge}`,
        source: 'M2 totals'
      }))
    }

    const firstInning = projection.firstInning || {}
    if (firstInning.pick && !/pass|hold/i.test(String(firstInning.pick))) {
      const edge = Math.abs(num(firstInning.edge, 0))
      const probability = firstInning.pick === 'YRFI'
        ? num(firstInning.yesProbabilityPct, null)
        : num(firstInning.noProbabilityPct, null)
      rows.push(marketRow({
        game,
        market: 'First Inning',
        pick: firstInning.label || firstInning.pick,
        edge,
        probability: probability === null ? null : `${probability}%`,
        score: edge * 1.6 + (probability === null ? 0 : probability - 50) + strengthWeight(firstInning.strength),
        detail: array(firstInning.reasonStack).slice(0, 2).join('; ') || `${firstInning.pick} edge ${edge}`,
        source: 'M2 first-inning model'
      }))
    }
  }

  return rows
    .filter((row) => row.pick)
    .sort((left, right) => right.score - left.score)
}

const sourceSnapshot = async (date) => {
  const reportNames = {
    morning: `mlb_morning_predictions_${date}.json`,
    predictionContract: `audit_mlb_prediction_contract_${date}.json`,
    morningContracts: `audit_mlb_morning_contracts_${date}.json`,
    publicAudit: `audit_public_mlb_slate_${date}_local.json`,
    causalLedger: `audit_mlb_causal_ledger_${date}.json`,
    splitFamilies: `audit_mlb_player_split_families_${date}.json`,
    sp1: `audit_mlb_sp1_${date}.json`
  }
  const snapshot = {}
  for (const [key, fileName] of Object.entries(reportNames)) {
    const payload = await readJson(path.join(reportsRoot, fileName), null)
    snapshot[key] = payload
      ? {
          status: payload.status || (array(payload.hardFailures || payload.failures).length ? 'fail' : 'pass'),
          hardFailures: array(payload.hardFailures || payload.failures).length,
          warnings: array(payload.warnings).length,
          path: path.join('data-migration', 'reports', fileName)
        }
      : { status: 'missing', hardFailures: null, warnings: null, path: path.join('data-migration', 'reports', fileName) }
  }
  return snapshot
}

const markdownReport = (report) => {
  const lines = [
    `# MLB Test Prediction ${report.date}`,
    '',
    `- Run ID: ${report.runId}`,
    `- Generated: ${report.generatedAt}`,
    `- Morning chain run: ${report.skipRun ? 'skipped' : 'yes'}`,
    `- Source gaps allowed: ${report.allowSourceGaps ? 'yes' : 'no'}`,
    `- Eligibility: ${report.eligibility.eligibleGames}/${report.eligibility.totalGames} games eligible, ${report.eligibility.pendingGames} pending`,
    '',
    '## Blocked Games',
    ''
  ]
  if (!report.eligibility.blockedGames.length) {
    lines.push('- None')
  } else {
    for (const game of report.eligibility.blockedGames) {
      lines.push(`- ${game.title}: ${game.hardFailures.join(', ') || 'pending'}`)
      if (game.missingHandednessSplitHitters.length) {
        lines.push(`  - Missing L/R splits: ${game.missingHandednessSplitHitters.join(', ')}`)
      }
      if (game.missingPitchFitHitters.length) {
        lines.push(`  - Missing pitch fit: ${game.missingPitchFitHitters.join(', ')}`)
      }
    }
  }
  lines.push('', '## Best Surfaced Markets', '')
  for (const pick of report.bestPicks.slice(0, report.maxPicks)) {
    lines.push(`- ${pick.market}: ${pick.pick} (${pick.title}) score ${pick.score}; ${pick.detail}`)
  }
  lines.push('', '## Source Snapshot', '')
  for (const [key, value] of Object.entries(report.sourceSnapshot)) {
    lines.push(`- ${key}: ${value.status}; failures ${value.hardFailures ?? 'n/a'}; warnings ${value.warnings ?? 'n/a'}`)
  }
  lines.push('')
  return `${lines.join('\n')}\n`
}

const main = async () => {
  const date = argValue('--date', pacificToday())
  const skipRun = hasFlag('--skip-run')
  const allowSourceGaps = hasFlag('--allow-source-gaps')
  const maxPicks = num(argValue('--max-picks', '12'), 12)
  const runId = `mlb-test-prediction-${date}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`
  const steps = []

  if (!skipRun) {
    const morningArgs = ['run', 'data:run:mlb-morning', '--', '--date', date, '--skip-prior-close']
    if (allowSourceGaps) morningArgs.push('--allow-source-gaps')
    steps.push(run('Run strict no-deploy MLB morning prediction chain', 'npm', morningArgs))
  }

  const { summary, games } = await loadCurrentSlate(date)
  const eligibility = eligibilitySummary(games)
  const bestPicks = collectMarketPicks(games)
  const snapshot = await sourceSnapshot(date)
  const report = {
    run: 'mlb-test-prediction',
    runId,
    date,
    generatedAt: new Date().toISOString(),
    skipRun,
    allowSourceGaps,
    maxPicks,
    currentSummaryId: summary.id || summary.date || null,
    steps,
    eligibility,
    bestPicks,
    sourceSnapshot: snapshot
  }
  const jsonPath = path.join(reportsRoot, `mlb_test_prediction_${date}.json`)
  const mdPath = path.join(reportsRoot, `mlb_test_prediction_${date}.md`)
  await writeJson(jsonPath, report)
  await writeText(mdPath, markdownReport(report))

  console.log(`\n[mlb-test-prediction] complete ${date}`)
  console.log(`[mlb-test-prediction] eligible=${eligibility.eligibleGames}/${eligibility.totalGames} pending=${eligibility.pendingGames}`)
  console.log(`[mlb-test-prediction] report=${path.relative(root, jsonPath)}`)
  console.log(`[mlb-test-prediction] markdown=${path.relative(root, mdPath)}`)
  if (eligibility.pendingGames > 0 && !allowSourceGaps) process.exitCode = 1
}

main().catch((error) => {
  console.error(`[mlb-test-prediction] ${error.stack || error.message}`)
  process.exit(1)
})

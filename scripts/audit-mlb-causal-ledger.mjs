import fs from 'node:fs/promises'
import path from 'node:path'

import { loadMlbDayGames } from '../pipeline/lib/load-mlb-day-games.mjs'
import { buildMlbPredictionEligibility } from '../models/mlb/lib/prediction-eligibility.mjs'

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

const array = (value) => (Array.isArray(value) ? value : [])
const num = (value, fallback = null) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const writeJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

const summarizeSide = (ledger = {}, side = 'away') => {
  const coverage = ledger.coverage?.[side] || {}
  const deltas = ledger.teamDeltas?.[side] || {}
  const players = array(ledger.playerFactors?.[side])
  return {
    lineupPlayers: num(coverage.lineupPlayers, players.length),
    playerFactors: num(coverage.playerFactors, players.length),
    playersWithSelectedSplits: num(coverage.playersWithSelectedSplits, players.filter((player) => num(player.selectedSplitOps, null)).length),
    playersWithEspnSplits: num(coverage.playersWithEspnSplits, players.filter((player) => player.espnSplit).length),
    playersWithPitchFit: num(coverage.playersWithPitchFit, players.filter((player) => player.pitchFit).length),
    playersWithBvpH2h: num(coverage.playersWithBvpH2h, players.filter((player) => player.bvpH2h).length),
    playersWithStarterKernel: num(coverage.playersWithStarterKernel, players.filter((player) => num(player.starterKernelScore, null)).length),
    lineupDelta: deltas.lineup?.delta ?? null,
    handednessSplitDelta: deltas.handednessSplits?.delta ?? null,
    pitchFitDelta: deltas.pitchFit?.delta ?? null,
    bvpContextDelta: deltas.bvpH2h?.contextDelta ?? null,
    hrForceDelta: deltas.hrForce?.delta ?? null,
    maxHrForce: deltas.hrForce?.maxHrForce ?? null,
    sp1PitcherName: deltas.sp1StarterProfile?.pitcherName ?? null,
    sp1CollapseRiskScore: deltas.sp1StarterProfile?.collapseRiskScore ?? null,
    sp1OffenseRunDelta: deltas.sp1StarterProfile?.offenseRunDelta ?? null,
    sp1WeightedPitcherAllowedOps: deltas.sp1StarterProfile?.splitSummary?.weightedPitcherAllowedOps ?? null,
    sp1WeightedHitterSplitOps: deltas.sp1StarterProfile?.splitSummary?.weightedHitterSplitOps ?? null,
    rp2SideHoldDelta: deltas.rp2?.sideHoldDelta ?? null,
    openerPrimaryDelta: deltas.openerPrimary?.delta ?? null
  }
}

const hardFailuresForGame = ({ game, ledger, eligibility }) => {
  const failures = []
  const away = ledger?.coverage?.away || {}
  const home = ledger?.coverage?.home || {}
  const awayPlayers = array(ledger?.playerFactors?.away)
  const homePlayers = array(ledger?.playerFactors?.home)
  const ficRowCount = num(game.ficDailyMatchupContext?.rowCount, 0)
  const maxHrForce = Math.max(
    num(ledger?.teamDeltas?.away?.hrForce?.maxHrForce, 0),
    num(ledger?.teamDeltas?.home?.hrForce?.maxHrForce, 0)
  )

  if (!ledger) failures.push('missing-causal-ledger')
  if (ledger?.version !== 'mlb-causal-ledger-v0.1') failures.push('unexpected-causal-ledger-version')
  if (!eligibility?.eligible) failures.push(...array(eligibility?.hardFailures).map((failure) => `prediction-eligibility:${failure}`))
  if (num(away.playerFactors, awayPlayers.length) < 9 || num(home.playerFactors, homePlayers.length) < 9) failures.push('missing-lineup-player-factors')
  if (num(away.playersWithStarterKernel, 0) < 8 || num(home.playersWithStarterKernel, 0) < 8) failures.push('missing-starter-kernel-ledger')
  if (num(away.playersWithSelectedSplits, 0) < 7 || num(home.playersWithSelectedSplits, 0) < 7) failures.push('missing-handedness-split-ledger')
  if (num(away.playersWithPitchFit, 0) < 7 || num(home.playersWithPitchFit, 0) < 7) failures.push('missing-pitch-fit-ledger')
  if (ficRowCount > 0 && !ledger?.coverage?.hasBvpH2hLedger) failures.push('fic-bvp-present-but-not-attached-to-ledger')
  if (game.environmentAdjustmentContext && !ledger?.coverage?.hasEnv1Ledger) failures.push('env1-present-but-not-attached-to-ledger')
  if (game.reliefProjectionContext?.away && game.reliefProjectionContext?.home && !ledger?.coverage?.hasRp2Ledger) failures.push('rp2-present-but-not-attached-to-ledger')
  if (!game.starterProfileContext?.away || !game.starterProfileContext?.home) failures.push('sp1-context-missing')
  if (game.starterProfileContext?.away && game.starterProfileContext?.home && !ledger?.coverage?.hasSp1Ledger) failures.push('sp1-present-but-not-attached-to-ledger')
  for (const side of ['away', 'home']) {
    const sp1 = ledger?.teamDeltas?.[side]?.sp1StarterProfile || null
    if (!sp1 || sp1.sourceStatus === 'missing') {
      failures.push(`sp1-${side}-offense-delta-missing`)
      continue
    }
    if (!Number.isFinite(num(sp1.collapseRiskScore, null))) failures.push(`sp1-${side}-collapse-score-missing`)
    if (!Number.isFinite(num(sp1.offenseRunDelta, null))) failures.push(`sp1-${side}-run-delta-missing`)
    if (!Number.isFinite(num(sp1.splitSummary?.weightedPitcherAllowedOps, null))) failures.push(`sp1-${side}-pitcher-split-ops-missing`)
    if (!Number.isFinite(num(sp1.splitSummary?.weightedHitterSplitOps, null))) failures.push(`sp1-${side}-hitter-split-ops-missing`)
  }
  if (game.analysis?.mlbProjection && !ledger?.coverage?.hasProjectionLedger) failures.push('projection-present-but-not-attached-to-ledger')
  if (maxHrForce >= 1.7) {
    const awaySignal = ledger?.teamDeltas?.away?.hrForce?.totalYrfiSignal
    const homeSignal = ledger?.teamDeltas?.home?.hrForce?.totalYrfiSignal
    if (awaySignal !== 'extreme carry' && homeSignal !== 'extreme carry') failures.push('extreme-hrforce-not-surfaced')
  }
  return failures
}

const main = async () => {
  const date = argValue('--date', pacificToday())
  const strictEligibleOnly = !hasFlag('--include-ineligible')
  const games = await loadMlbDayGames(date)
  const reports = []
  const hardFailures = []

  for (const game of games) {
    if (game.league !== 'MLB') continue
    const eligibility = game.predictionEligibility || buildMlbPredictionEligibility(game, { requireAddendums: true })
    if (strictEligibleOnly && !eligibility.eligible) continue
    const ledger = game.causalLedgerContext || null
    const failures = hardFailuresForGame({ game, ledger, eligibility })
    const report = {
      id: game.id,
      title: game.title,
      eligible: Boolean(eligibility.eligible),
      failures,
      ledgerVersion: ledger?.version || null,
      sourcesUsed: ledger?.sourcesUsed || [],
      away: summarizeSide(ledger, 'away'),
      home: summarizeSide(ledger, 'home'),
      gameDeltas: ledger?.gameDeltas || null
    }
    reports.push(report)
    for (const failure of failures) {
      hardFailures.push({ id: game.id, title: game.title, failure })
    }
  }

  const payload = {
    audit: 'mlb-causal-ledger',
    date,
    generatedAt: new Date().toISOString(),
    strictEligibleOnly,
    games: reports,
    hardFailures,
    status: hardFailures.length ? 'failed' : 'passed'
  }
  const reportPath = path.join(reportsRoot, `audit_mlb_causal_ledger_${date}.json`)
  await writeJson(reportPath, payload)
  console.log(`[audit-mlb-causal-ledger] ${payload.status}: ${reports.length} games, ${hardFailures.length} hard failures`)
  console.log(`[audit-mlb-causal-ledger] report=${path.relative(root, reportPath)}`)
  if (hardFailures.length) {
    for (const failure of hardFailures.slice(0, 20)) {
      console.error(`[audit-mlb-causal-ledger] ${failure.id}: ${failure.failure}`)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(`[audit-mlb-causal-ledger] ${error.stack || error.message}`)
  process.exit(1)
})

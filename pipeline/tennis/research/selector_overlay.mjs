#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const REPORTS_DIR = path.join(ROOT, 'data-private/reports')
const PREDICTIONS_DIR = path.join(ROOT, 'data-private/predictions/tennis')

const CONFIG = {
  modelCartridge: 'TEN-T1-SELECTOR',
  sourceModelCartridge: 'TEN-T0',
  minPredictionSupport: 2,
  minServeReturnGap: 3,
  chalkRiskMinImplied: 0.65,
  chalkRiskMaxImplied: 0.75,
  expensiveChalkImplied: 0.75,
  extremeChalkImplied: 0.85,
  minStatsMatchesForServeSignal: 2,
  maxDirectDogImplied: 0.49
}

const parseArgs = () => {
  const options = {
    date: '',
    dayModule: '',
    baselineReport: '',
    outputJson: '',
    outputMarkdown: '',
    outputArtifact: ''
  }
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = args[++index] || ''
    } else if (arg === '--day-module') {
      options.dayModule = args[++index] || ''
    } else if (arg === '--baseline-report') {
      options.baselineReport = args[++index] || ''
    } else if (arg === '--output-json') {
      options.outputJson = args[++index] || ''
    } else if (arg === '--output-md' || arg === '--output-markdown') {
      options.outputMarkdown = args[++index] || ''
    } else if (arg === '--output-artifact') {
      options.outputArtifact = args[++index] || ''
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new Error('Pass --date YYYY-MM-DD')
  }
  options.dayModule ||= path.join(ROOT, `web/src/lib/day-${options.date}.js`)
  options.baselineReport ||= path.join(REPORTS_DIR, `tennis-baseline-pass-${options.date}.json`)
  options.outputJson ||= path.join(REPORTS_DIR, `tennis-selector-overlay-${options.date}.json`)
  options.outputMarkdown ||= path.join(REPORTS_DIR, `tennis-selector-overlay-${options.date}.md`)
  options.outputArtifact ||= path.join(PREDICTIONS_DIR, `${options.date}-tennis-t1-selector.json`)
  return options
}

const readJsonIfExists = (jsonPath) => {
  if (!fs.existsSync(jsonPath)) return null
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
}

const normalize = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(pyotr)\b/g, 'petr')
    .replace(/\b(yousuke)\b/g, 'yosuke')
    .replace(/\b(samsonova)\b/g, 'samson')
    .replace(/\b(ludmilla)\b/g, 'liudmila')
    .replace(/\b(darya)\b/g, 'daria')
    .replace(/\b(tomas barrios vera)\b/g, 'marcelo tomas barrios vera')
    .replace(/\b(wang xiyu)\b/g, 'xiyu wang')
    .replace(/\b(zheng qinwen)\b/g, 'qinwen zheng')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

const tokens = (value) => new Set(normalize(value).split(' ').filter(Boolean))

const similarity = (left, right) => {
  const a = tokens(left)
  const b = tokens(right)
  if (!a.size || !b.size) return 0
  let intersection = 0
  for (const token of a) if (b.has(token)) intersection += 1
  return intersection / Math.max(a.size, b.size)
}

const namesMatch = (left, right) => normalize(left) === normalize(right) || similarity(left, right) >= 0.8

const asNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const pct = (value, digits = 1) =>
  value === null || value === undefined ? 'n/a' : `${(Number(value) * 100).toFixed(digits)}%`

const signed = (value, digits = 1) => {
  if (value === null || value === undefined) return 'n/a'
  const number = Number(value)
  return `${number >= 0 ? '+' : ''}${number.toFixed(digits)}`
}

const americanProfit = (odds) => {
  const value = asNumber(odds)
  if (!value) return null
  return value > 0 ? value : 10000 / Math.abs(value)
}

const parseRank = (detail) => {
  const match = String(detail || '').match(/(?:live\s+)?rank\s+#\s*(\d+)/i)
  const rank = match ? Number(match[1]) : null
  return rank && rank > 0 ? rank : null
}

const parseForm = (detail) => {
  const match = String(detail || '').match(/adj\s+form\s+(-?\d+(?:\.\d+)?)/i)
  return match ? Number(match[1]) : null
}

const participantOdds = (participants, selection) => {
  const participant = participants.find((entry) => namesMatch(entry.name, selection))
  if (!participant) return null
  return {
    odds: participant.odds,
    impliedProbability: participant.impliedProbability,
    impliedProbabilityNormalized: participant.impliedProbabilityNormalized
  }
}

const marketParticipants = (game) => {
  const participants = game.moneyline?.participants?.length ? game.moneyline.participants : game.participants || []
  const impliedSum = participants.reduce((sum, row) => sum + (asNumber(row.impliedProbability) || 0), 0)
  return participants.map((row) => ({
    name: row.name,
    detail: row.detail || '',
    odds: asNumber(row.americanOdds),
    impliedProbability: asNumber(row.impliedProbability),
    impliedProbabilityNormalized: impliedSum ? (asNumber(row.impliedProbability) || 0) / impliedSum : null,
    rank: parseRank(row.detail || ''),
    form: parseForm(row.detail || ''),
    serveReturnScore: null,
    serveReturnInputs: null,
    weaknessInputs: null
  }))
}

const enrichServeReturn = (game, participants) => {
  const byName = new Map(participants.map((row) => [normalize(row.name), row]))
  const weakness = game.tennisContext?.weaknessEdge || {}
  for (const side of [weakness.pick, weakness.opponent].filter(Boolean)) {
    const row = byName.get(normalize(side.name))
    if (!row) continue
    const service = asNumber(side.servicePointsWonPct)
    const returnWon = asNumber(side.returnPointsWonPct)
    const matchesWithStats = asNumber(side.matchesWithStats)
    row.weaknessInputs = {
      firstServeWonPct: asNumber(side.firstServeWonPct),
      secondServeWonPct: asNumber(side.secondServeWonPct),
      firstServePct: asNumber(side.firstServePct),
      avgAces: asNumber(side.avgAces),
      avgDoubleFaults: asNumber(side.avgDoubleFaults),
      returnPointsWonPct: returnWon,
      servicePointsWonPct: service,
      weakServeMatches: asNumber(side.weakServeMatches),
      matchesWithStats,
      weaknessScore: asNumber(side.weaknessScore),
      liabilities: Array.isArray(side.liabilities) ? side.liabilities : [],
      strengths: Array.isArray(side.strengths) ? side.strengths : []
    }
    if (
      service !== null &&
      returnWon !== null &&
      (matchesWithStats === null || matchesWithStats >= CONFIG.minStatsMatchesForServeSignal)
    ) {
      row.serveReturnScore = Number((service + returnWon).toFixed(1))
      row.serveReturnInputs = {
        servicePointsWonPct: service,
        returnPointsWonPct: returnWon,
        matchesWithStats,
        weaknessScore: asNumber(side.weaknessScore)
      }
    }
  }
  return participants
}

const parseParticipantFeatures = (game) => enrichServeReturn(game, marketParticipants(game))

const chooseMax = (participants, field, { minGap = 0 } = {}) => {
  const rows = participants.filter((row) => asNumber(row[field]) !== null)
  if (rows.length < 2) return null
  rows.sort((a, b) => b[field] - a[field])
  if (Math.abs(rows[0][field] - rows[1][field]) < minGap) return null
  return {
    pick: rows[0].name,
    gap: Number((rows[0][field] - rows[1][field]).toFixed(3)),
    values: Object.fromEntries(rows.map((row) => [row.name, row[field]]))
  }
}

const chooseBestRank = (participants) => {
  const rows = participants.filter((row) => asNumber(row.rank) !== null)
  if (rows.length < 2) return null
  rows.sort((a, b) => a.rank - b.rank)
  return {
    pick: rows[0].name,
    gap: rows[1].rank - rows[0].rank,
    values: Object.fromEntries(rows.map((row) => [row.name, row.rank]))
  }
}

const supportFor = (selection, signals) =>
  Object.values(signals).filter((signal) => signal?.pick && namesMatch(signal.pick, selection)).length

const oppositionFor = (selection, signals) =>
  Object.values(signals).filter((signal) => signal?.pick && !namesMatch(signal.pick, selection)).length

const signalNamesFor = (selection, signals) =>
  Object.entries(signals)
    .filter(([, signal]) => signal?.pick && namesMatch(signal.pick, selection))
    .map(([name]) => name)

const topSignalConsensus = (signals) => {
  const counts = new Map()
  for (const [signalName, signal] of Object.entries(signals)) {
    if (!signal?.pick) continue
    const key = normalize(signal.pick)
    const existing = counts.get(key) || { name: signal.pick, count: 0, signals: [] }
    existing.count += 1
    existing.signals.push(signalName)
    counts.set(key, existing)
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)
}

const opponentOf = (selection, participants) =>
  participants.find((participant) => !namesMatch(participant.name, selection)) || null

const classifyGame = (game) => ({
  depth: game.tags?.includes('Warehouse joined') ? 'Warehouse joined' : game.tags?.includes('Market only') ? 'Market only' : 'Other',
  tour: game.tags?.includes('WTA') ? 'WTA' : game.tags?.includes('ATP Challenger') ? 'ATP Challenger' : 'Other',
  surface: ['Clay', 'Grass', 'Hard'].find((surface) => game.tags?.includes(surface)) || 'Unknown',
  provider: game.metadata?.oddsProvider || game.moneyline?.provider || (String(game.id || '').startsWith('rh-') ? 'Robinhood prediction market' : 'DraftKings Sportsbook')
})

const sourceLinks = (game) => {
  const links = Array.isArray(game.tennisContext?.researchLinks) ? game.tennisContext.researchLinks : []
  return links
    .filter((link) => link?.url)
    .map((link) => ({ label: link.label || 'source', url: link.url }))
}

const riskFlagsFor = ({ game, selected, opponent, selectedOdds, support, opposition, classes }) => {
  const flags = []
  const selectedStats = selected?.weaknessInputs || {}
  const opponentStats = opponent?.weaknessInputs || {}
  const implied = selectedOdds?.impliedProbabilityNormalized

  if (classes.depth !== 'Warehouse joined') flags.push('missing warehouse join')
  if (game.tags?.includes('Market only')) flags.push('market-only row')
  if (implied !== null && implied !== undefined && implied >= CONFIG.chalkRiskMinImplied && implied < CONFIG.chalkRiskMaxImplied) {
    flags.push('mid-heavy chalk band')
  }
  if (implied !== null && implied !== undefined && implied >= CONFIG.expensiveChalkImplied) {
    flags.push(implied >= CONFIG.extremeChalkImplied ? 'extreme chalk price' : 'expensive chalk price')
  }
  if (opposition >= 1) flags.push('at least one independent signal opposes')
  if (support < CONFIG.minPredictionSupport) flags.push('insufficient independent support')
  if (selectedStats.matchesWithStats !== null && selectedStats.matchesWithStats < CONFIG.minStatsMatchesForServeSignal) {
    flags.push('thin serve sample')
  }
  if (selectedStats.weakServeMatches >= 3) flags.push('recent serve instability')
  if (selectedStats.secondServeWonPct !== null && selectedStats.secondServeWonPct < 50) flags.push('attackable second serve')
  if (selectedStats.avgDoubleFaults !== null && selectedStats.avgDoubleFaults >= 4) flags.push('double-fault pressure')
  if (opponentStats.returnPointsWonPct !== null && opponentStats.returnPointsWonPct >= 47) flags.push('opponent creates return pressure')
  if (classes.surface === 'Grass' && classes.tour === 'WTA') flags.push('WTA grass volatility')
  return [...new Set(flags)]
}

const decideSelector = ({ game, participants, signals, classes }) => {
  const publishedPick = game.analysis?.participant?.name || null
  const marketFavorite = chooseMax(participants, 'impliedProbabilityNormalized')?.pick || null
  const basePick = publishedPick || marketFavorite
  const consensus = topSignalConsensus(signals)
  const leader = consensus[0] || null
  const runnerUp = consensus[1] || null
  const baseSupport = basePick ? supportFor(basePick, signals) : 0
  const baseOpposition = basePick ? oppositionFor(basePick, signals) : 0
  const marketSupport = marketFavorite ? supportFor(marketFavorite, signals) : 0
  const marketOpposition = marketFavorite ? oppositionFor(marketFavorite, signals) : 0
  const selectedParticipant = basePick ? participants.find((entry) => namesMatch(entry.name, basePick)) : null
  const selectedOpponent = basePick ? opponentOf(basePick, participants) : null
  const selectedOdds = basePick ? participantOdds(participants, basePick) : null
  const riskFlags = riskFlagsFor({
    game,
    selected: selectedParticipant,
    opponent: selectedOpponent,
    selectedOdds,
    support: baseSupport,
    opposition: baseOpposition,
    classes
  })

  let tier = 'watch'
  let selectorPick = basePick
  let action = 'Do not treat as a pregame ML pick; keep it on the watch board.'
  let label = 'Watch'

  if (!basePick || participants.length < 2) {
    tier = 'no-play'
    selectorPick = null
    label = 'No Play'
    action = 'Missing a usable two-player market or model pick.'
  } else if (classes.depth !== 'Warehouse joined') {
    tier = 'no-play'
    label = 'No Play'
    action = 'Source context is too thin for the selector.'
  } else if (baseSupport >= CONFIG.minPredictionSupport && baseOpposition <= 1) {
    tier = 'prediction'
    label = baseSupport >= 3 && baseOpposition === 0 ? 'Prediction A' : 'Prediction B'
    action = 'Pregame ML prediction candidate.'
  } else if (leader?.count >= CONFIG.minPredictionSupport && marketFavorite && !namesMatch(leader.name, marketFavorite)) {
    tier = 'live-dog'
    selectorPick = leader.name
    label = 'Live Dog'
    action = 'Use as a favorite-fade and live-entry candidate, not an automatic pregame dog bet.'
  } else if (marketFavorite && marketOpposition >= CONFIG.minPredictionSupport) {
    tier = 'fade'
    selectorPick = marketFavorite
    label = 'Fade'
    action = 'Do not publish as a pregame ML pick; market favorite lacks selector support.'
  }

  const implied = selectedOdds?.impliedProbabilityNormalized
  if (tier === 'prediction' && implied !== null && implied !== undefined && implied <= CONFIG.maxDirectDogImplied) {
    label = 'Prediction Dog'
  }
  if (tier === 'prediction' && riskFlags.includes('mid-heavy chalk band') && baseSupport < 3) {
    label = 'Prediction B Chalk Risk'
  }
  if (tier === 'prediction' && riskFlags.includes('expensive chalk price') && baseSupport < 3) {
    tier = 'watch'
    label = 'Chalk Watch'
    action = 'Too expensive without full three-signal proof.'
  }

  const confidence = (() => {
    if (tier === 'prediction') return Math.min(86, 58 + baseSupport * 7 - baseOpposition * 4 - Math.min(riskFlags.length, 3) * 2)
    if (tier === 'live-dog') return Math.min(72, 50 + (leader?.count || 0) * 6)
    if (tier === 'fade') return 54 + marketOpposition * 5
    if (tier === 'watch') return 48 + baseSupport * 4 - baseOpposition * 3
    return 0
  })()

  return {
    tier,
    label,
    pick: selectorPick,
    basePick,
    marketFavorite,
    publishedPick,
    action,
    confidence,
    support: {
      baseSupport,
      baseOpposition,
      marketSupport,
      marketOpposition,
      signalNames: selectorPick ? signalNamesFor(selectorPick, signals) : [],
      consensus: consensus.map((row) => ({
        player: row.name,
        count: row.count,
        signals: row.signals
      })),
      runnerUp: runnerUp ? {
        player: runnerUp.name,
        count: runnerUp.count,
        signals: runnerUp.signals
      } : null
    },
    riskFlags
  }
}

const evaluatePick = ({ pick, participants, result }) => {
  if (!pick || !result?.final || !result.winner) {
    return { graded: false, hit: null, winner: result?.winner || null, pnlPer100: null }
  }
  const odds = participantOdds(participants, pick)
  const profit = americanProfit(odds?.odds)
  const hit = namesMatch(pick, result.winner)
  return {
    graded: true,
    hit,
    winner: result.winner,
    pnlPer100: profit === null ? null : Number((hit ? profit : -100).toFixed(1))
  }
}

const summarizeTier = (rows, tier) => {
  const candidates = rows.filter((row) => row.selector.tier === tier)
  const graded = candidates.filter((row) => row.evaluation?.graded)
  const hits = graded.filter((row) => row.evaluation.hit).length
  const misses = graded.filter((row) => row.evaluation.hit === false).length
  const pnlRows = graded.filter((row) => row.evaluation.pnlPer100 !== null)
  const pnl = pnlRows.reduce((sum, row) => sum + Number(row.evaluation.pnlPer100 || 0), 0)
  return {
    tier,
    candidates: candidates.length,
    graded: graded.length,
    hits,
    misses,
    hitRate: graded.length ? Number((hits / graded.length).toFixed(4)) : null,
    flatPnlPer100: pnlRows.length ? Number(pnl.toFixed(1)) : null,
    flatRoiPct: pnlRows.length ? Number((pnl / (pnlRows.length * 100) * 100).toFixed(1)) : null
  }
}

const baselineRowsById = (baselineReport) => {
  const rows = baselineReport?.rows || []
  const byId = new Map()
  for (const row of rows) {
    if (row.id) byId.set(row.id, row)
    if (row.match) byId.set(`match:${normalize(row.match)}`, row)
  }
  return byId
}

const baselineRowFor = (game, baselineRows) =>
  baselineRows.get(game.id) || baselineRows.get(`match:${normalize(game.title)}`) || null

const formatOdds = (value) => {
  const odds = asNumber(value)
  if (odds === null) return ''
  return odds > 0 ? `+${odds}` : String(odds)
}

const signalSummary = (row) =>
  Object.entries(row.signals)
    .filter(([, signal]) => signal?.pick)
    .map(([key, signal]) => `${key}:${signal.pick}${signal.gap !== null && signal.gap !== undefined ? ` (${signal.gap})` : ''}`)
    .join('; ')

const compactRisks = (risks) => {
  if (!risks?.length) return ''
  return risks.slice(0, 3).join('; ')
}

const makeMarkdown = (report) => {
  const lines = []
  lines.push(`# Tennis TEN-T1 Selector Overlay - ${report.date}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- Source rows: ${report.summary.totalRows}`)
  lines.push(`- Prediction candidates: ${report.summary.predictionRows}`)
  lines.push(`- Watch rows: ${report.summary.watchRows}`)
  lines.push(`- Fade rows: ${report.summary.fadeRows}`)
  lines.push(`- Live-dog rows: ${report.summary.liveDogRows}`)
  lines.push(`- No-play rows: ${report.summary.noPlayRows}`)
  if (report.evaluation?.prediction) {
    const metric = report.evaluation.prediction
    lines.push(`- Prediction self-check: ${metric.hits}/${metric.graded} (${pct(metric.hitRate)}) settled, ROI ${signed(metric.flatRoiPct)}%`)
  }
  lines.push('')
  lines.push('## Prediction Board')
  lines.push('')
  lines.push('| # | Tier | Match | Pick | Odds | Implied | Support | Risks | Result |')
  lines.push('|---:|---|---|---|---:|---:|---:|---|---|')
  for (const row of report.rows.filter((entry) => entry.selector.tier === 'prediction')) {
    const price = row.market[normalize(row.selector.pick)] || {}
    const result = row.evaluation?.graded ? `${row.evaluation.hit ? 'hit' : 'miss'} (${row.evaluation.winner})` : ''
    lines.push(`| ${row.index} | ${row.selector.label} | ${row.match.replace(/\|/g, '/')} | ${row.selector.pick || ''} | ${formatOdds(price.odds)} | ${pct(price.impliedProbabilityNormalized)} | ${row.selector.support.baseSupport}-${row.selector.support.baseOpposition} | ${compactRisks(row.selector.riskFlags)} | ${result} |`)
  }
  lines.push('')
  lines.push('## Live-Dog And Fade Board')
  lines.push('')
  lines.push('| # | Lane | Match | Side | Support | Action | Signals |')
  lines.push('|---:|---|---|---|---:|---|---|')
  for (const row of report.rows.filter((entry) => ['live-dog', 'fade'].includes(entry.selector.tier))) {
    lines.push(`| ${row.index} | ${row.selector.label} | ${row.match.replace(/\|/g, '/')} | ${row.selector.pick || ''} | ${row.selector.support.baseSupport}-${row.selector.support.baseOpposition} | ${row.selector.action} | ${signalSummary(row)} |`)
  }
  lines.push('')
  lines.push('## Watch Board')
  lines.push('')
  lines.push('| # | Match | Base Pick | Support | Risks |')
  lines.push('|---:|---|---|---:|---|')
  for (const row of report.rows.filter((entry) => entry.selector.tier === 'watch').slice(0, 60)) {
    lines.push(`| ${row.index} | ${row.match.replace(/\|/g, '/')} | ${row.selector.basePick || ''} | ${row.selector.support.baseSupport}-${row.selector.support.baseOpposition} | ${compactRisks(row.selector.riskFlags)} |`)
  }
  lines.push('')
  lines.push('## Method')
  lines.push('')
  lines.push('- TEN-T0 stays as the raw slate/model-fair generator.')
  lines.push('- TEN-T1 promotes only rows where the TEN-T0 side has at least two independent non-market supports from live rank, adjusted form, and TennisLive serve/return profile.')
  lines.push('- Opposing consensus becomes a live-dog or fade lane instead of a blind pregame upset pick.')
  lines.push('- Market-only rows and rows without a warehouse join are no-play until source context is linked.')
  return `${lines.join('\n')}\n`
}

const main = async () => {
  const options = parseArgs()
  const dayModulePath = path.resolve(options.dayModule)
  if (!fs.existsSync(dayModulePath)) throw new Error(`Day module not found: ${dayModulePath}`)

  const dayModule = await import(pathToFileURL(dayModulePath).href)
  const games = dayModule.games || []
  if (!Array.isArray(games) || !games.length) throw new Error(`No games exported by ${dayModulePath}`)

  const baselineReport = readJsonIfExists(path.resolve(options.baselineReport))
  const baselineRows = baselineRowsById(baselineReport)

  const rows = games.map((game, index) => {
    const participants = parseParticipantFeatures(game)
    const classes = classifyGame(game)
    const signals = {
      rank: chooseBestRank(participants),
      form: chooseMax(participants, 'form'),
      serveReturn: chooseMax(participants, 'serveReturnScore', { minGap: CONFIG.minServeReturnGap })
    }
    const selector = decideSelector({ game, participants, signals, classes })
    const baselineRow = baselineRowFor(game, baselineRows)
    const result = baselineRow?.result || null
    const evaluation = evaluatePick({ pick: selector.pick, participants, result })
    const market = Object.fromEntries(participants.map((participant) => [
      normalize(participant.name),
      {
        name: participant.name,
        odds: participant.odds,
        impliedProbability: participant.impliedProbability,
        impliedProbabilityNormalized: participant.impliedProbabilityNormalized
      }
    ]))
    return {
      index: index + 1,
      id: game.id,
      match: game.title,
      stage: game.stage || null,
      tags: game.tags || [],
      classes,
      sourceLinks: sourceLinks(game),
      selector,
      signals,
      market,
      participants,
      result,
      evaluation
    }
  })

  const tierMetrics = Object.fromEntries(['prediction', 'watch', 'fade', 'live-dog', 'no-play'].map((tier) => [tier, summarizeTier(rows, tier)]))
  const summary = {
    totalRows: rows.length,
    predictionRows: tierMetrics.prediction.candidates,
    watchRows: tierMetrics.watch.candidates,
    fadeRows: tierMetrics.fade.candidates,
    liveDogRows: tierMetrics['live-dog'].candidates,
    noPlayRows: tierMetrics['no-play'].candidates,
    gradedRows: rows.filter((row) => row.evaluation?.graded).length
  }

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    date: options.date,
    modelCartridge: CONFIG.modelCartridge,
    sourceModelCartridge: CONFIG.sourceModelCartridge,
    config: CONFIG,
    inputs: {
      dayModule: path.relative(ROOT, dayModulePath),
      baselineReport: baselineReport ? path.relative(ROOT, path.resolve(options.baselineReport)) : null
    },
    summary,
    evaluation: tierMetrics,
    rows
  }

  const artifact = {
    schemaVersion: 1,
    generatedAt: report.generatedAt,
    date: report.date,
    modelCartridge: CONFIG.modelCartridge,
    sourceModelCartridge: CONFIG.sourceModelCartridge,
    summary,
    picks: rows
      .filter((row) => row.selector.tier === 'prediction')
      .map((row) => ({
        id: row.id,
        match: row.match,
        pick: row.selector.pick,
        tier: row.selector.label,
        confidence: row.selector.confidence,
        support: row.selector.support,
        riskFlags: row.selector.riskFlags,
        market: row.market[normalize(row.selector.pick)] || null,
        sourceLinks: row.sourceLinks
      })),
    lanes: {
      predictions: rows.filter((row) => row.selector.tier === 'prediction').map((row) => row.id),
      watch: rows.filter((row) => row.selector.tier === 'watch').map((row) => row.id),
      fades: rows.filter((row) => row.selector.tier === 'fade').map((row) => row.id),
      liveDogs: rows.filter((row) => row.selector.tier === 'live-dog').map((row) => row.id),
      noPlays: rows.filter((row) => row.selector.tier === 'no-play').map((row) => row.id)
    },
    rows: rows.map((row) => ({
      id: row.id,
      match: row.match,
      selector: row.selector,
      signals: row.signals,
      market: row.market,
      sourceLinks: row.sourceLinks
    }))
  }

  fs.mkdirSync(path.dirname(options.outputJson), { recursive: true })
  fs.mkdirSync(path.dirname(options.outputArtifact), { recursive: true })
  fs.writeFileSync(options.outputJson, JSON.stringify(report, null, 2))
  fs.writeFileSync(options.outputMarkdown, makeMarkdown(report))
  fs.writeFileSync(options.outputArtifact, JSON.stringify(artifact, null, 2))

  console.log(JSON.stringify({
    date: report.date,
    rows: report.summary.totalRows,
    predictions: report.summary.predictionRows,
    watch: report.summary.watchRows,
    fades: report.summary.fadeRows,
    liveDogs: report.summary.liveDogRows,
    noPlays: report.summary.noPlayRows,
    predictionEvaluation: report.evaluation.prediction,
    outputJson: path.relative(ROOT, options.outputJson),
    outputMarkdown: path.relative(ROOT, options.outputMarkdown),
    outputArtifact: path.relative(ROOT, options.outputArtifact)
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

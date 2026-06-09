#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import cp from 'node:child_process'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const DEFAULT_DB = path.join(ROOT, 'data-private/warehouse/sports/tennis/sql-tennis.db')
const REPORTS_DIR = path.join(ROOT, 'data-private/reports')

const parseArgs = () => {
  const options = {
    date: '',
    dayModule: '',
    db: DEFAULT_DB,
    outputJson: '',
    outputMarkdown: '',
    includeNextDayScoreboard: true
  }
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = args[++index] || ''
    } else if (arg === '--day-module') {
      options.dayModule = args[++index] || ''
    } else if (arg === '--db') {
      options.db = args[++index] || ''
    } else if (arg === '--output-json') {
      options.outputJson = args[++index] || ''
    } else if (arg === '--output-md' || arg === '--output-markdown') {
      options.outputMarkdown = args[++index] || ''
    } else if (arg === '--same-day-scoreboard-only') {
      options.includeNextDayScoreboard = false
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new Error('Pass --date YYYY-MM-DD')
  }
  options.dayModule ||= path.join(ROOT, `web/src/lib/day-${options.date}.js`)
  options.outputJson ||= path.join(REPORTS_DIR, `tennis-baseline-pass-${options.date}.json`)
  options.outputMarkdown ||= path.join(REPORTS_DIR, `tennis-baseline-pass-${options.date}.md`)
  return options
}

const addDays = (date, days) => {
  const parsed = new Date(`${date}T00:00:00Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

const readJsonIfExists = (jsonPath) => {
  if (!fs.existsSync(jsonPath)) return null
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
}

const sqliteJson = (db, sql) => {
  if (!fs.existsSync(db)) return []
  const output = cp.execFileSync('sqlite3', ['-json', db, sql], {
    encoding: 'utf8',
    maxBuffer: 20_000_000
  })
  return output.trim() ? JSON.parse(output) : []
}

const normalize = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(vanessa|gibert|annie|adina|akua|sarah|george|muirhead|riveros|fa)\b/g, ' ')
    .replace(/\b(pyotr)\b/g, 'petr')
    .replace(/\b(taro taro)\b/g, 'taro daniel')
    .replace(/\b(abedallah)\b/g, 'abdullah')
    .replace(/\b(yousuke)\b/g, 'yosuke')
    .replace(/\b(samsonova)\b/g, 'samson')
    .replace(/\b(ludmilla)\b/g, 'liudmila')
    .replace(/\b(darya)\b/g, 'daria')
    .replace(/\b(tomas barrios vera)\b/g, 'marcelo tomas barrios vera')
    .replace(/\b(arklon huertas del pino)\b/g, 'arklon huertas del pino cordova')
    .replace(/\b(nicolas villalon)\b/g, 'nicolas villalon valdes')
    .replace(/\b(johan alexander rodriguez)\b/g, 'johan alexander rodriguez rodriguez')
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

const pairKey = (left, right) => [normalize(left), normalize(right)].sort().join(' | ')

const pairScore = (left, right, result) => Math.max(
  similarity(left, result.p1) * similarity(right, result.p2),
  similarity(left, result.p2) * similarity(right, result.p1),
  similarity(`${left} ${right}`, `${result.p1} ${result.p2}`)
)

const splitMatch = (title) => {
  const [left = '', right = ''] = String(title || '').split(/\s+vs\s+/i)
  return [left, right]
}

const asNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const clampProb = (value) => {
  const number = asNumber(value)
  if (number === null) return null
  return Math.max(0.01, Math.min(0.99, number))
}

const americanProfit = (odds) => {
  const value = asNumber(odds)
  if (!value) return null
  return value > 0 ? value : 10000 / Math.abs(value)
}

const participantOdds = (game, selection) => {
  const participants = game.moneyline?.participants || []
  const participant = participants.find((entry) => namesMatch(entry.name, selection))
  if (!participant) return null
  const impliedProbability = asNumber(participant.impliedProbability)
  const impliedSum = participants.reduce((sum, entry) => sum + (asNumber(entry.impliedProbability) || 0), 0)
  return {
    odds: asNumber(participant.americanOdds),
    impliedProbability,
    impliedProbabilityNormalized: impliedSum ? impliedProbability / impliedSum : null
  }
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

const parseParticipantFeatures = (game) => {
  const byName = new Map()
  const participants = game.moneyline?.participants?.length ? game.moneyline.participants : game.participants || []
  const impliedSum = participants.reduce((sum, row) => sum + (asNumber(row.impliedProbability) || 0), 0)
  for (const row of participants) {
    const detail = row.detail || ''
    byName.set(normalize(row.name), {
      name: row.name,
      detail,
      odds: asNumber(row.americanOdds),
      impliedProbability: asNumber(row.impliedProbability),
      impliedProbabilityNormalized: impliedSum ? (asNumber(row.impliedProbability) || 0) / impliedSum : null,
      rank: parseRank(detail),
      form: parseForm(detail),
      serveReturnScore: null,
      serveReturnInputs: null
    })
  }

  const weakness = game.tennisContext?.weaknessEdge || {}
  for (const side of [weakness.pick, weakness.opponent].filter(Boolean)) {
    const key = normalize(side.name)
    const row = byName.get(key)
    if (!row) continue
    const service = asNumber(side.servicePointsWonPct)
    const returnWon = asNumber(side.returnPointsWonPct)
    if (service !== null && returnWon !== null) {
      row.serveReturnScore = Number((service + returnWon).toFixed(1))
      row.serveReturnInputs = {
        servicePointsWonPct: service,
        returnPointsWonPct: returnWon,
        matchesWithStats: asNumber(side.matchesWithStats),
        weaknessScore: asNumber(side.weaknessScore)
      }
    }
  }
  return [...byName.values()]
}

const chooseMax = (participants, field, { minGap = 0 } = {}) => {
  const rows = participants.filter((row) => asNumber(row[field]) !== null)
  if (rows.length < 2) return null
  rows.sort((a, b) => b[field] - a[field])
  if (Math.abs(rows[0][field] - rows[1][field]) < minGap) return null
  return rows[0].name
}

const chooseBestRank = (participants, { minGap = 0 } = {}) => {
  const rows = participants.filter((row) => asNumber(row.rank) !== null)
  if (rows.length < 2) return null
  rows.sort((a, b) => a.rank - b.rank)
  if (Math.abs(rows[0].rank - rows[1].rank) < minGap) return null
  return rows[0].name
}

const supportSignals = (picks) => {
  const signals = ['rankFavorite', 'formFavorite', 'serveReturnFavorite']
  const counts = new Map()
  for (const signal of signals) {
    const pick = picks[signal]
    if (!pick) continue
    const key = normalize(pick)
    counts.set(key, {
      name: pick,
      count: (counts.get(key)?.count || 0) + 1,
      signals: [...(counts.get(key)?.signals || []), signal]
    })
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)
}

const consensusPick = (picks, minimumSignals) => {
  const [first, second] = supportSignals(picks)
  if (!first || first.count < minimumSignals) return null
  if (second && second.count === first.count) return null
  return first.name
}

const supportCountFor = (selection, picks) =>
  ['rankFavorite', 'formFavorite', 'serveReturnFavorite']
    .filter((key) => picks[key] && namesMatch(picks[key], selection))
    .length

const oppositionCountFor = (selection, picks) =>
  ['rankFavorite', 'formFavorite', 'serveReturnFavorite']
    .filter((key) => picks[key] && !namesMatch(picks[key], selection))
    .length

const loadEspnResults = (date, includeNextDayScoreboard) => {
  const dates = [date]
  if (includeNextDayScoreboard) dates.push(addDays(date, 1))
  const results = []
  const sources = []
  for (const scoreboardDate of dates) {
    const scoreboardPath = path.join(ROOT, `data-private/reference/tennis/espn-scoreboard-${scoreboardDate}.json`)
    const scoreboard = readJsonIfExists(scoreboardPath)
    if (!scoreboard) continue
    sources.push(scoreboard.sourceUrl || scoreboardPath)
    for (const match of scoreboard.singles || []) {
      const [p1, p2] = (match.players || []).map((player) => player.name)
      if (!p1 || !p2) continue
      const record = {
        source: 'ESPN',
        date: String(match.date || '').slice(0, 10),
        p1,
        p2,
        winner: match.completed ? match.winnerName || '' : '',
        score: match.scoreline || '',
        status: match.statusDescription || match.status?.description || '',
        final: Boolean(match.completed && match.winnerName)
      }
      results.push(record)
    }
  }
  return { results, sources }
}

const loadTennisLiveResults = (db, date) => {
  const nextDate = addDays(date, 1)
  const rows = sqliteJson(db, `
    select match_date, tournament, player1_name, player2_name, winner_name, score_text, status, source_match_url, match_id
    from tennislive_match_summaries
    where match_date in ('${date}', '${nextDate}') or match_id like 'tl-unknown-date%'
  `)
  const sources = new Set()
  const results = []
  for (const row of rows) {
    if (row.source_match_url) sources.add(row.source_match_url)
    const score = row.score_text || ''
    const live = /\bLIVE\b/i.test(score)
    results.push({
      source: 'TennisLive',
      date: row.match_date || '',
      tournament: row.tournament || '',
      p1: row.player1_name || '',
      p2: row.player2_name || '',
      winner: row.winner_name || '',
      score,
      status: row.status || '',
      url: row.source_match_url || '',
      final: Boolean(row.winner_name && !live && /completed|final/i.test(row.status || 'completed'))
    })
  }
  return { results, sources: [...sources] }
}

const resultPreference = (result) => (result.source === 'ESPN' ? 4 : 2) + (result.score ? 1 : 0) + (result.final ? 4 : 0)

const bestResultFor = (game, results, finalOnly = true) => {
  const candidates = finalOnly ? results.filter((result) => result.final) : results
  const [left, right] = splitMatch(game.title)
  const exact = candidates.filter((result) => pairKey(result.p1, result.p2) === pairKey(left, right))
  if (exact.length) return exact.sort((a, b) => resultPreference(b) - resultPreference(a))[0]

  let best = null
  for (const result of candidates) {
    const score = pairScore(left, right, result)
    if (score > 0.69 && (!best || score > best.score)) best = { result, score }
  }
  return best?.result || null
}

const evaluateSelection = ({ game, selection, probability, result }) => {
  if (!selection || !result?.final || !result.winner) {
    return {
      selection: selection || null,
      probability: probability === null || probability === undefined ? null : probability,
      graded: false,
      hit: null,
      pnlPer100: null,
      brier: null,
      logLoss: null
    }
  }
  const hit = namesMatch(selection, result.winner)
  const odds = participantOdds(game, selection)
  const profit = americanProfit(odds?.odds)
  const pnlPer100 = profit === null ? null : Number((hit ? profit : -100).toFixed(1))
  const prob = clampProb(probability)
  return {
    selection,
    probability: prob,
    graded: true,
    hit,
    pnlPer100,
    brier: prob === null ? null : Number(((hit ? 1 - prob : prob) ** 2).toFixed(4)),
    logLoss: prob === null ? null : Number((-Math.log(hit ? prob : 1 - prob)).toFixed(4))
  }
}

const summarizeStrategy = (rows, strategyName) => {
  const evaluated = rows.map((row) => row.strategies[strategyName]).filter(Boolean)
  const graded = evaluated.filter((row) => row.graded)
  const hits = graded.filter((row) => row.hit).length
  const misses = graded.filter((row) => row.hit === false).length
  const pnlRows = graded.filter((row) => row.pnlPer100 !== null)
  const brierRows = graded.filter((row) => row.brier !== null)
  const logLossRows = graded.filter((row) => row.logLoss !== null)
  const sum = (items, key) => items.reduce((total, item) => total + Number(item[key] || 0), 0)
  return {
    strategy: strategyName,
    candidates: evaluated.filter((row) => row.selection).length,
    graded: graded.length,
    hits,
    misses,
    hitRate: graded.length ? Number((hits / graded.length).toFixed(4)) : null,
    flatPnlPer100: pnlRows.length ? Number(sum(pnlRows, 'pnlPer100').toFixed(1)) : null,
    flatRoiPct: pnlRows.length ? Number((sum(pnlRows, 'pnlPer100') / (pnlRows.length * 100) * 100).toFixed(1)) : null,
    brier: brierRows.length ? Number((sum(brierRows, 'brier') / brierRows.length).toFixed(4)) : null,
    logLoss: logLossRows.length ? Number((sum(logLossRows, 'logLoss') / logLossRows.length).toFixed(4)) : null
  }
}

const summarizeBucket = (rows, keyFn) => {
  const buckets = new Map()
  for (const row of rows) {
    if (!row.result?.final) continue
    const key = keyFn(row)
    const current = buckets.get(key) || { key, settled: 0, hits: 0, misses: 0 }
    current.settled += 1
    if (row.strategies.publishedPick.hit) current.hits += 1
    else current.misses += 1
    buckets.set(key, current)
  }
  return [...buckets.values()]
    .map((bucket) => ({
      ...bucket,
      hitRate: bucket.settled ? Number((bucket.hits / bucket.settled).toFixed(4)) : null
    }))
    .sort((a, b) => b.settled - a.settled || String(a.key).localeCompare(String(b.key)))
}

const confidenceBucket = (value) => {
  const conf = asNumber(value)
  if (conf === null) return 'unknown'
  if (conf < 55) return '50-54'
  if (conf < 60) return '55-59'
  if (conf < 65) return '60-64'
  if (conf < 70) return '65-69'
  if (conf < 75) return '70-74'
  if (conf < 80) return '75-79'
  return '80+'
}

const impliedBucket = (value) => {
  const implied = asNumber(value)
  if (implied === null) return 'unknown'
  if (implied < 0.45) return '<45%'
  if (implied < 0.55) return '45-54%'
  if (implied < 0.65) return '55-64%'
  if (implied < 0.75) return '65-74%'
  return '75%+'
}

const classifyGame = (game) => ({
  depth: game.tags?.includes('Warehouse joined') ? 'Warehouse joined' : game.tags?.includes('Market only') ? 'Market only' : 'Other',
  tour: game.tags?.includes('WTA') ? 'WTA' : game.tags?.includes('ATP Challenger') ? 'ATP Challenger' : 'Other',
  surface: ['Clay', 'Grass', 'Hard'].find((surface) => game.tags?.includes(surface)) || 'Unknown',
  provider: game.metadata?.oddsProvider || (String(game.id || '').startsWith('rh-') ? 'Robinhood prediction market' : 'DraftKings Sportsbook')
})

const makeMarkdown = (report) => {
  const pct = (value) => value === null || value === undefined ? 'n/a' : `${(Number(value) * 100).toFixed(1)}%`
  const number = (value) => value === null || value === undefined ? 'n/a' : String(value)
  const lines = []
  lines.push(`# Tennis Baseline Pass - ${report.date}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- Rows: ${report.summary.totalRows}`)
  lines.push(`- Settled: ${report.summary.settledRows}`)
  lines.push(`- Pending/live: ${report.summary.pendingRows}`)
  lines.push(`- Current published pick: ${report.strategyMetrics.publishedPick.hits}/${report.strategyMetrics.publishedPick.graded} (${pct(report.strategyMetrics.publishedPick.hitRate)})`)
  lines.push(`- Market favorite: ${report.strategyMetrics.marketFavorite.hits}/${report.strategyMetrics.marketFavorite.graded} (${pct(report.strategyMetrics.marketFavorite.hitRate)})`)
  lines.push(`- Rank favorite: ${report.strategyMetrics.rankFavorite.hits}/${report.strategyMetrics.rankFavorite.graded} (${pct(report.strategyMetrics.rankFavorite.hitRate)})`)
  lines.push(`- Form favorite: ${report.strategyMetrics.formFavorite.hits}/${report.strategyMetrics.formFavorite.graded} (${pct(report.strategyMetrics.formFavorite.hitRate)})`)
  lines.push(`- Serve/return favorite: ${report.strategyMetrics.serveReturnFavorite.hits}/${report.strategyMetrics.serveReturnFavorite.graded} (${pct(report.strategyMetrics.serveReturnFavorite.hitRate)})`)
  lines.push('')
  lines.push('## Strategy Table')
  lines.push('')
  lines.push('| Strategy | Candidates | Graded | Hits | Misses | Hit Rate | ROI | Brier | Log Loss |')
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|')
  for (const metric of Object.values(report.strategyMetrics)) {
    lines.push(`| ${metric.strategy} | ${metric.candidates} | ${metric.graded} | ${metric.hits} | ${metric.misses} | ${pct(metric.hitRate)} | ${number(metric.flatRoiPct)} | ${number(metric.brier)} | ${number(metric.logLoss)} |`)
  }
  lines.push('')
  lines.push('## Current Pick Buckets')
  for (const [name, rows] of Object.entries(report.currentPickBuckets)) {
    lines.push('')
    lines.push(`### ${name}`)
    lines.push('')
    lines.push('| Bucket | Settled | Hits | Misses | Hit Rate |')
    lines.push('|---|---:|---:|---:|---:|')
    for (const row of rows) {
      lines.push(`| ${row.key} | ${row.settled} | ${row.hits} | ${row.misses} | ${pct(row.hitRate)} |`)
    }
  }
  lines.push('')
  lines.push('## Disagreements')
  lines.push('')
  lines.push('| # | Match | Published | Market | Rank | Form | Serve/Return | Winner |')
  lines.push('|---:|---|---|---|---|---|---|---|')
  for (const row of report.rows.filter((entry) => entry.result?.final && !entry.agreement.publishedEqualsMarket).slice(0, 40)) {
    lines.push(`| ${row.index} | ${row.match.replace(/\|/g, '/')} | ${row.picks.publishedPick || ''} | ${row.picks.marketFavorite || ''} | ${row.picks.rankFavorite || ''} | ${row.picks.formFavorite || ''} | ${row.picks.serveReturnFavorite || ''} | ${row.result.winner || ''} |`)
  }
  lines.push('')
  lines.push('## Notes')
  lines.push('')
  lines.push('- `publishedPick` is the pick emitted in the day module.')
  lines.push('- `marketFavorite` uses normalized implied probability from the available moneyline/prediction-market prices.')
  lines.push('- `rankFavorite`, `formFavorite`, and `serveReturnFavorite` are simple baselines from joined participant detail and TennisLive serve/return stats; they are intentionally not optimized.')
  lines.push('- Pending/live rows are excluded from hit-rate, Brier, log-loss, and ROI.')
  return `${lines.join('\n')}\n`
}

const main = async () => {
  const options = parseArgs()
  const dayModulePath = path.resolve(options.dayModule)
  if (!fs.existsSync(dayModulePath)) throw new Error(`Day module not found: ${dayModulePath}`)
  const dayModule = await import(pathToFileURL(dayModulePath).href)
  const games = dayModule.games || []
  if (!Array.isArray(games) || !games.length) throw new Error(`No games exported by ${dayModulePath}`)

  const espn = loadEspnResults(options.date, options.includeNextDayScoreboard)
  const tennisLive = loadTennisLiveResults(options.db, options.date)
  const results = [...tennisLive.results, ...espn.results]

  const rows = games.map((game, index) => {
    const participants = parseParticipantFeatures(game)
    const classes = classifyGame(game)
    const finalResult = bestResultFor(game, results, true)
    const partialResult = finalResult ? null : bestResultFor(game, results, false)
    const result = finalResult || partialResult
    const publishedPick = game.analysis?.participant?.name || null
    const marketFavorite = chooseMax(participants, 'impliedProbabilityNormalized')
    const rankFavorite = chooseBestRank(participants)
    const formFavorite = chooseMax(participants, 'form')
    const serveReturnFavorite = chooseMax(participants, 'serveReturnScore', { minGap: 3 })
    const picks = {
      publishedPick,
      marketFavorite,
      rankFavorite,
      formFavorite,
      serveReturnFavorite
    }
    const consensus2 = consensusPick(picks, 2)
    const consensus3 = consensusPick(picks, 3)
    const marketSupport = marketFavorite ? supportCountFor(marketFavorite, picks) : 0
    const marketOpposition = marketFavorite ? oppositionCountFor(marketFavorite, picks) : 0
    const publishedSupport = publishedPick ? supportCountFor(publishedPick, picks) : 0
    picks.consensus2 = consensus2
    picks.consensus3 = consensus3
    picks.marketPlusAnySupport = marketFavorite && marketSupport >= 1 ? marketFavorite : null
    picks.marketPlusTwoSupport = marketFavorite && marketSupport >= 2 ? marketFavorite : null
    picks.marketNoOpposition = marketFavorite && marketSupport >= 1 && marketOpposition === 0 ? marketFavorite : null
    picks.publishedPlusTwoSupport = publishedPick && publishedSupport >= 2 ? publishedPick : null

    const marketOdds = marketFavorite ? participantOdds(game, marketFavorite) : null
    const publishedOdds = publishedPick ? participantOdds(game, publishedPick) : null
    const publishedProbability = clampProb(asNumber(game.confidence) === null ? null : asNumber(game.confidence) / 100)
    const marketProbability = clampProb(marketOdds?.impliedProbabilityNormalized ?? marketOdds?.impliedProbability)
    const strategies = {
      publishedPick: evaluateSelection({ game, selection: publishedPick, probability: publishedProbability, result }),
      marketFavorite: evaluateSelection({ game, selection: marketFavorite, probability: marketProbability, result }),
      rankFavorite: evaluateSelection({ game, selection: rankFavorite, probability: null, result }),
      formFavorite: evaluateSelection({ game, selection: formFavorite, probability: null, result }),
      serveReturnFavorite: evaluateSelection({ game, selection: serveReturnFavorite, probability: null, result }),
      consensus2: evaluateSelection({ game, selection: picks.consensus2, probability: null, result }),
      consensus3: evaluateSelection({ game, selection: picks.consensus3, probability: null, result }),
      marketPlusAnySupport: evaluateSelection({ game, selection: picks.marketPlusAnySupport, probability: marketProbability, result }),
      marketPlusTwoSupport: evaluateSelection({ game, selection: picks.marketPlusTwoSupport, probability: marketProbability, result }),
      marketNoOpposition: evaluateSelection({ game, selection: picks.marketNoOpposition, probability: marketProbability, result }),
      publishedPlusTwoSupport: evaluateSelection({ game, selection: picks.publishedPlusTwoSupport, probability: publishedProbability, result })
    }

    return {
      index: index + 1,
      id: game.id,
      match: game.title,
      stage: game.stage,
      confidence: asNumber(game.confidence),
      tags: game.tags || [],
      ...classes,
      participants,
      publishedMarket: {
        odds: publishedOdds?.odds ?? null,
        impliedProbability: publishedOdds?.impliedProbability ?? null,
        impliedProbabilityNormalized: publishedOdds?.impliedProbabilityNormalized ?? null
      },
      marketFavoritePrice: {
        odds: marketOdds?.odds ?? null,
        impliedProbability: marketOdds?.impliedProbability ?? null,
        impliedProbabilityNormalized: marketOdds?.impliedProbabilityNormalized ?? null
      },
      picks,
      support: {
        marketSupport,
        marketOpposition,
        publishedSupport
      },
      agreement: {
        publishedEqualsMarket: Boolean(publishedPick && marketFavorite && namesMatch(publishedPick, marketFavorite)),
        publishedEqualsRank: Boolean(publishedPick && rankFavorite && namesMatch(publishedPick, rankFavorite)),
        publishedEqualsForm: Boolean(publishedPick && formFavorite && namesMatch(publishedPick, formFavorite)),
        publishedEqualsServeReturn: Boolean(publishedPick && serveReturnFavorite && namesMatch(publishedPick, serveReturnFavorite))
      },
      result: result ? {
        source: result.source,
        date: result.date,
        status: result.status,
        final: result.final,
        winner: result.winner || null,
        score: result.score || null,
        players: [result.p1, result.p2]
      } : null,
      strategies
    }
  })

  const strategyNames = Object.keys(rows[0]?.strategies || {})
  const strategyMetrics = Object.fromEntries(strategyNames.map((name) => [name, summarizeStrategy(rows, name)]))
  const settledRows = rows.filter((row) => row.result?.final).length
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    date: options.date,
    inputs: {
      dayModule: path.relative(ROOT, dayModulePath),
      db: fs.existsSync(options.db) ? path.relative(ROOT, options.db) : null,
      espnSources: espn.sources,
      tennisLiveSourceCount: tennisLive.sources.length
    },
    summary: {
      totalRows: rows.length,
      settledRows,
      pendingRows: rows.length - settledRows,
      finalResultRowsLoaded: results.filter((row) => row.final).length,
      partialResultRowsLoaded: results.filter((row) => !row.final).length
    },
    strategyMetrics,
    currentPickBuckets: {
      byDepth: summarizeBucket(rows, (row) => row.depth),
      byTour: summarizeBucket(rows, (row) => row.tour),
      bySurface: summarizeBucket(rows, (row) => row.surface),
      byProvider: summarizeBucket(rows, (row) => row.provider),
      byConfidence: summarizeBucket(rows, (row) => confidenceBucket(row.confidence)),
      byMarketImplied: summarizeBucket(rows, (row) => impliedBucket(row.publishedMarket?.impliedProbabilityNormalized))
    },
    rows
  }

  fs.mkdirSync(path.dirname(options.outputJson), { recursive: true })
  fs.writeFileSync(options.outputJson, JSON.stringify(report, null, 2))
  fs.writeFileSync(options.outputMarkdown, makeMarkdown(report))

  const published = report.strategyMetrics.publishedPick
  const market = report.strategyMetrics.marketFavorite
  const rank = report.strategyMetrics.rankFavorite
  const form = report.strategyMetrics.formFavorite
  console.log(JSON.stringify({
    date: options.date,
    rows: report.summary.totalRows,
    settled: report.summary.settledRows,
    pending: report.summary.pendingRows,
    publishedPick: published,
    marketFavorite: market,
    rankFavorite: rank,
    formFavorite: form,
    outputJson: path.relative(ROOT, options.outputJson),
    outputMarkdown: path.relative(ROOT, options.outputMarkdown)
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

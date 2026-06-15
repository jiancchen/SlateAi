import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'

import { buildMlbPredictionEligibility, withMlbPredictionEligibility } from '../models/mlb/lib/prediction-eligibility.mjs'

const root = path.resolve(import.meta.dirname, '..')
const publishedSlatesRoot = path.join(root, 'published-data', 'slates')

const argValue = (name, fallback = '') => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const hasFlag = (name) => process.argv.includes(name)
const readJson = async (filePath, fallback = null) => {
  if (!fsSync.existsSync(filePath)) return fallback
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

const writeJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

const run = (command, args = [], options = {}) => {
  const rendered = [command, ...args].join(' ')
  console.log(`[publish-mlb-clean-slate] $ ${rendered}`)
  try {
    execFileSync(command, args, {
      cwd: options.cwd || root,
      stdio: 'inherit',
      env: { ...process.env, ...(options.env || {}) }
    })
  } catch (error) {
    if (!options.allowFailure) throw error
    console.warn(`[publish-mlb-clean-slate] warning: command failed but was allowed: ${rendered}`)
  }
}

const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const roundToTenths = (value) => Math.round(Number(value) * 10) / 10

const poissonSeries = (lambdaInput, maxRuns = 20) => {
  const lambda = clamp(Number(lambdaInput), 0.05, 20)
  const values = []
  let probability = Math.exp(-lambda)
  let total = 0
  for (let runs = 0; runs <= maxRuns; runs += 1) {
    if (runs > 0) probability *= lambda / runs
    values.push(probability)
    total += probability
  }
  if (total > 0 && total < 0.999) values[maxRuns] += 1 - total
  return values
}

const buildFirst5LeadProbabilities = (awayRunsInput, homeRunsInput) => {
  const awaySeries = poissonSeries(awayRunsInput, 16)
  const homeSeries = poissonSeries(homeRunsInput, 16)
  let awayWin = 0
  let homeWin = 0
  let tie = 0
  awaySeries.forEach((awayProbability, awayRuns) => {
    homeSeries.forEach((homeProbability, homeRuns) => {
      const joint = awayProbability * homeProbability
      if (awayRuns > homeRuns) awayWin += joint
      else if (homeRuns > awayRuns) homeWin += joint
      else tie += joint
    })
  })
  return {
    awayWinPct: roundToTenths(awayWin * 100),
    homeWinPct: roundToTenths(homeWin * 100),
    tiePct: roundToTenths(tie * 100)
  }
}

const withFirst5PushContext = (game) => {
  const projection = game?.analysis?.mlbProjection
  if (!projection) return game
  const awayRuns = Number(projection.awayFirst5ProjectedRuns)
  const homeRuns = Number(projection.homeFirst5ProjectedRuns)
  if (!Number.isFinite(awayRuns) || !Number.isFinite(homeRuns)) return game
  const probabilities = buildFirst5LeadProbabilities(awayRuns, homeRuns)
  const pickSide = homeRuns >= awayRuns ? 'home' : 'away'
  const leadPct = pickSide === 'home' ? probabilities.homeWinPct : probabilities.awayWinPct
  return {
    ...game,
    analysis: {
      ...game.analysis,
      mlbProjection: {
        ...projection,
        first5Moneyline: {
          pickSide,
          pickTeam: pickSide === 'home' ? game.matchup?.[1]?.name || '' : game.matchup?.[0]?.name || '',
          awayProjectedRuns: roundToTenths(awayRuns),
          homeProjectedRuns: roundToTenths(homeRuns),
          awayLeadProbability: probabilities.awayWinPct,
          homeLeadProbability: probabilities.homeWinPct,
          pushProbability: probabilities.tiePct,
          leadProbability: leadPct,
          source: 'M2 first-five projected runs; tie is a first-five ML push'
        }
      }
    }
  }
}

const labelForDate = (date) => {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

const sourceKey = (source = {}) => source.url || source.label || JSON.stringify(source)

const mergeSources = (existingSources = []) => {
  const required = [
    { label: 'Official MLB schedule, probable pitchers, lineups, and game feeds', url: 'https://www.mlb.com/' },
    { label: 'Rotowire confirmed MLB daily lineups fallback', url: 'https://www.rotowire.com/baseball/daily-lineups.php' },
    { label: 'DraftKings MLB player prop board', url: 'https://sportsbook.draftkings.com/leagues/baseball/mlb' },
    { label: 'Baseball Savant hitter and pitcher pages', url: 'https://baseballsavant.mlb.com/' },
    { label: 'ESPN pitcher splits pages', url: 'https://www.espn.com/mlb/players' },
    { label: 'StatMuse starter vs opponent history', url: 'https://www.statmuse.com/mlb' }
  ]
  const merged = []
  const seen = new Set()
  for (const source of [...existingSources, ...required]) {
    const key = sourceKey(source)
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(source)
  }
  return merged
}

const knownAllowedAuditFailures = new Set([
  'pitcher-strikeout-props-missing-draftkings-lineage',
  'missing-bridge-chain',
  'missing-rp36-shadow'
])

const runPublicMlbAudit = async (date, options = {}) => {
  try {
    run('node', ['scripts/audit-public-mlb-slate.mjs', '--date', date])
  } catch (error) {
    if (!options.allowKnownFailures) throw error
    const reportPath = path.join(root, 'data-migration', 'reports', `audit_public_mlb_slate_${date}_local.json`)
    const report = await readJson(reportPath, {})
    const failures = (report.hardFailures || []).map((failure) => failure?.failure).filter(Boolean)
    const unexpectedFailures = failures.filter((failure) => !knownAllowedAuditFailures.has(failure))
    if (!failures.length || unexpectedFailures.length) throw error
    console.warn(
      `[publish-mlb-clean-slate] warning: audit blocked only by allowed known failure(s): ${failures.join(', ')}`
    )
  }
}

const updatePublishedIndex = async (date, summary) => {
  const indexPath = path.join(publishedSlatesRoot, 'index.json')
  const index = await readJson(indexPath, [])
  const entry = {
    id: date,
    label: summary.label || labelForDate(date),
    status: 'ready',
    slateMeta: summary.slateMeta || { date: summary.label || labelForDate(date), isoDate: date },
    summary: {
      totalGames: summary.games.length,
      mlbGames: summary.games.filter((game) => game?.league === 'MLB').length
    }
  }
  const next = [...index.filter((item) => item?.id !== date), entry].sort((left, right) =>
    String(left.id).localeCompare(String(right.id))
  )
  await writeJson(indexPath, next)
}

const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value))

const asNumber = (value, fallback = null) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const roundTenths = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed * 10) / 10 : null
}

const blankInningRunRow = (inning) => ({
  inning,
  phase: inning >= 6 ? 'not modeled' : '',
  runProbabilityPct: null,
  noRunProbabilityPct: null,
  awayRunProbabilityPct: null,
  homeRunProbabilityPct: null,
  lean: '',
  strength: 'blank',
  sampleHalves: null,
  caution: 'Bullpen/late-inning model intentionally blank.',
  reason: ''
})

const probabilityToExpectedRuns = (probabilityPct) => {
  const pct = asNumber(probabilityPct, null)
  if (!Number.isFinite(pct)) return null
  return -Math.log(1 - clampNumber(pct / 100, 0.01, 0.92))
}

const expectedRunsToProbabilityPct = (runs) => {
  const parsed = asNumber(runs, null)
  if (!Number.isFinite(parsed)) return null
  return roundTenths((1 - Math.exp(-Math.max(0, parsed))) * 100)
}

const parseAmericanOdds = (value) => {
  if (value === null || value === undefined) return null
  const parsed = Number(String(value).replace(/[−–—]/g, '-').replace(/[^+\-0-9]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

const teamKeyFromDkLabel = (value = '') => slugify(String(value).replace(/^[A-Z]{2,3}\s+/, '').trim())

const pitcherKey = (value = '') => slugify(value)

const oddsPairFromSelections = (selections = []) => {
  const over = selections.find((selection) => /^over$/i.test(selection?.label || selection?.outcomeType || ''))
  const under = selections.find((selection) => /^under$/i.test(selection?.label || selection?.outcomeType || ''))
  const yes = selections.find((selection) => /^yes$/i.test(selection?.label || selection?.outcomeType || ''))
  const no = selections.find((selection) => /^no$/i.test(selection?.label || selection?.outcomeType || ''))
  return {
    line: asNumber(over?.points ?? under?.points, null),
    overOdds: parseAmericanOdds(over?.displayOdds?.american),
    underOdds: parseAmericanOdds(under?.displayOdds?.american),
    yesOdds: parseAmericanOdds(yes?.displayOdds?.american),
    noOdds: parseAmericanOdds(no?.displayOdds?.american)
  }
}

const array = (value) => (Array.isArray(value) ? value : [])

const starterDependentPublicContextFailures = (game = null) => {
  const eligibility = game?.predictionEligibility || buildMlbPredictionEligibility(game, { requireAddendums: true })
  return array(eligibility.hardFailures)
}

const gameClearsStarterDependentPublicContext = (game = null) =>
  starterDependentPublicContextFailures(game).length === 0

const loadDkSpecialtyMarketAnchors = async (date) => {
  const filePath = path.join(root, 'data-private', 'odds', 'draftkings', 'mlb', `${date}-draftkings-mlb-lines.json`)
  const payload = await readJson(filePath, null)
  const events = Array.isArray(payload?.events) ? payload.events : []
  const byGameId = {}

  for (const event of events) {
    const [awayRaw, homeRaw] = String(event.name || '').split('@').map((part) => part.trim())
    if (!awayRaw || !homeRaw) continue
    const gameId = `${teamKeyFromDkLabel(awayRaw)}-${teamKeyFromDkLabel(homeRaw)}`
    const rawMarkets = event.markets?.rawMarkets || []
    const rawSelections = event.markets?.rawSelections || []
    const selectionsFor = (marketId) => rawSelections.filter((selection) => String(selection.marketId) === String(marketId))
    const mainSelectionsFor = (marketId) => {
      const rows = selectionsFor(marketId)
      const tagged = rows.filter((selection) => (selection.tags || []).includes('MainPointLine'))
      return tagged.length ? tagged : rows
    }
    const anchor = {
      source: 'DraftKings raw specialty markets',
      sourceEventId: event.eventId || null,
      teamRuns: {},
      teamHits: {},
      pitchers: {},
      missing: []
    }

    for (const market of rawMarkets) {
      const name = String(market.name || '')
      const teamRuns = name.match(/^(.+): Team Total Runs - 1st ([357]) Innings$/)
      if (teamRuns) {
        const teamKey = teamKeyFromDkLabel(teamRuns[1])
        const windowKey = `first${teamRuns[2]}`
        anchor.teamRuns[teamKey] = {
          ...(anchor.teamRuns[teamKey] || {}),
          [windowKey]: oddsPairFromSelections(mainSelectionsFor(market.id))
        }
        continue
      }

      const hitsAllowed = name.match(/^(.+) Hits Allowed O\/U$/)
      const earnedRuns = name.match(/^(.+) Earned Runs Allowed O\/U$/)
      const win = name.match(/^Will (.+) Record a Win\?$/)
      if (hitsAllowed || earnedRuns || win) {
        const nameMatch = hitsAllowed || earnedRuns || win
        const key = pitcherKey(nameMatch[1])
        anchor.pitchers[key] = {
          ...(anchor.pitchers[key] || {}),
          name: nameMatch[1],
          ...(hitsAllowed ? { hitsAllowed: oddsPairFromSelections(mainSelectionsFor(market.id)) } : {}),
          ...(earnedRuns ? { earnedRunsAllowed: oddsPairFromSelections(mainSelectionsFor(market.id)) } : {}),
          ...(win ? { recordWin: oddsPairFromSelections(selectionsFor(market.id)) } : {})
        }
      }
    }

    if (!Object.keys(anchor.teamHits).length) anchor.missing.push('team total hits')
    byGameId[gameId] = anchor
  }

  return byGameId
}

const formatMarketAnchorNote = ({ game, anchors }) => {
  if (!anchors) return ''
  const [awayTeam = '', homeTeam = ''] = String(game.title || '').split('@').map((part) => part.trim())
  const awayKey = slugify(awayTeam)
  const homeKey = slugify(homeTeam)
  const teamRuns = [
    anchors.teamRuns?.[awayKey]?.first5?.line ? `${awayTeam} F5 runs ${anchors.teamRuns[awayKey].first5.line}` : '',
    anchors.teamRuns?.[homeKey]?.first5?.line ? `${homeTeam} F5 runs ${anchors.teamRuns[homeKey].first5.line}` : ''
  ].filter(Boolean)
  const pitcherBits = Object.values(anchors.pitchers || {})
    .slice(0, 2)
    .map((pitcher) => {
      const parts = [
        pitcher.hitsAllowed?.line ? `HA ${pitcher.hitsAllowed.line}` : '',
        pitcher.earnedRunsAllowed?.line ? `ER ${pitcher.earnedRunsAllowed.line}` : '',
        pitcher.recordWin?.yesOdds ? `win yes ${pitcher.recordWin.yesOdds > 0 ? '+' : ''}${pitcher.recordWin.yesOdds}` : ''
      ].filter(Boolean)
      return parts.length ? `${pitcher.name}: ${parts.join(', ')}` : ''
    })
    .filter(Boolean)
  const missing = anchors.missing?.includes('team total hits') ? 'team-hit line unavailable' : ''
  return [...teamRuns, ...pitcherBits, missing].filter(Boolean).join('; ')
}

const pacificDateParts = (date = new Date()) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date).map((part) => [part.type, part.value])
  )

const pacificToday = () => {
  const parts = pacificDateParts()
  return `${parts.year}-${parts.month}-${parts.day}`
}

const pacificNowMinutes = () => {
  const parts = pacificDateParts()
  const hour = Number(parts.hour === '24' ? 0 : parts.hour)
  const minute = Number(parts.minute)
  return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0)
}

const parseStartedCutoffMinutes = (value = '') => {
  if (!value) return null
  if (/^\d+$/.test(String(value).trim())) return Number(value)
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

const gameStartedByCutoff = (game = {}, cutoffMinutes = null) => {
  if (!Number.isFinite(Number(cutoffMinutes))) return false
  const startMinutes = Number(game.startMinutes)
  return Number.isFinite(startMinutes) && startMinutes <= Number(cutoffMinutes)
}

const buildM2InningRunMatrix = (game, matrix, marketAnchors = null) => {
  const projection = game?.analysis?.mlbProjection || {}
  const firstInning = projection.firstInning || null
  const baseRows = Array.isArray(matrix?.rows) ? matrix.rows : []
  const first5ProjectedRuns = asNumber(
    projection.totals?.projectedFirst5TotalRuns ?? projection.totals?.tailAdjustedProjectedFirst5TotalRuns,
    null
  )
  const marketAnchorNote = formatMarketAnchorNote({ game, anchors: marketAnchors })

  const rows = Array.from({ length: 9 }, (_, index) => {
    const inning = index + 1
    const baseline = baseRows.find((row) => Number(row?.inning) === inning) || {}

    if (inning === 1 && firstInning) {
      const yesPct = asNumber(firstInning.yesProbabilityPct, null)
      const noPct = asNumber(firstInning.noProbabilityPct, Number.isFinite(yesPct) ? 100 - yesPct : null)
      return {
        ...baseline,
        inning,
        phase: 'M2 YRFI/NRFI',
        runProbabilityPct: roundTenths(yesPct),
        noRunProbabilityPct: roundTenths(noPct),
        awayRunProbabilityPct: roundTenths(firstInning.awayRunProbabilityPct),
        homeRunProbabilityPct: roundTenths(firstInning.homeRunProbabilityPct),
        lean: firstInning.pick === 'YRFI' ? 'Run' : firstInning.pick === 'NRFI' ? 'No run' : 'Pass',
        strength: String(firstInning.strength || '').toLowerCase() || 'm2',
        sourceModel: 'M2 first-inning',
        reason: firstInning.summary || baseline.reason || '',
        caution: Array.isArray(firstInning.cautionStack) ? firstInning.cautionStack.slice(0, 2).join(' ') : ''
      }
    }

    if (inning >= 2 && inning <= 5 && Number.isFinite(first5ProjectedRuns)) {
      const firstRuns = asNumber(firstInning?.projectedRuns, probabilityToExpectedRuns(firstInning?.yesProbabilityPct) ?? 0)
      const remainingRuns = Math.max(0.05, first5ProjectedRuns - Math.max(0, firstRuns || 0))
      const inningWeights = [2, 3, 4, 5].map((targetInning) => {
        const row = baseRows.find((candidate) => Number(candidate?.inning) === targetInning) || {}
        return {
          inning: targetInning,
          weight: probabilityToExpectedRuns(row.runProbabilityPct) ?? 0.35
        }
      })
      const totalWeight = inningWeights.reduce((sum, row) => sum + row.weight, 0) || 1
      const inningWeight = inningWeights.find((row) => row.inning === inning)?.weight || 0.25
      const expectedRuns = remainingRuns * (inningWeight / totalWeight)
      const runProbabilityPct = expectedRunsToProbabilityPct(expectedRuns)
      const awayBase = asNumber(baseline.awayRunProbabilityPct, 50)
      const homeBase = asNumber(baseline.homeRunProbabilityPct, 50)
      const splitTotal = Math.max(awayBase + homeBase, 1)
      const awayRunProbabilityPct = roundTenths((runProbabilityPct * awayBase) / splitTotal)
      const homeRunProbabilityPct = roundTenths((runProbabilityPct * homeBase) / splitTotal)
      return {
        ...baseline,
        inning,
        phase: inning <= 3 ? 'M2 early F5' : 'M2 turnover F5',
        runProbabilityPct,
        noRunProbabilityPct: roundTenths(100 - runProbabilityPct),
        awayRunProbabilityPct,
        homeRunProbabilityPct,
        lean: runProbabilityPct >= 52 ? 'Run' : 'No run',
        strength: runProbabilityPct >= 60 || runProbabilityPct <= 40 ? 'm2-strong' : 'm2-baseline',
        sourceModel: 'M2 F5 allocator',
        caution: 'Allocated from M2 first-five total; inning split is directional.',
        reason: [
          `M2 F5 allocator: ${roundTenths(first5ProjectedRuns)} projected first-five runs, with inning ${inning} weighted by early scoring shape.`,
          marketAnchorNote ? `Market anchors: ${marketAnchorNote}.` : ''
        ].filter(Boolean).join(' ')
      }
    }

    return blankInningRunRow(inning)
  })

  return {
    ...(matrix || {}),
    source: 'M2 inning run map: inning 1 YRFI/NRFI, innings 2-5 F5 allocator',
    sourceStatus: firstInning && Number.isFinite(first5ProjectedRuns) ? 'm2' : 'partial',
    marketAnchors: marketAnchors || null,
    rows
  }
}

const publishRichMlbGames = async (date, options = {}) => {
  process.env.MLB_DAY_GAMES_DISABLE_DB = '1'
  const { loadMlbDayGames } = await import('../pipeline/lib/load-mlb-day-games.mjs')
  const { loadMlbInningRunMatricesFromDb, loadMlbSpecialtyMarketAnchorsFromDb } = await import('../models/mlb/db/day-games.mjs')
  const inningRunMatrices = await loadMlbInningRunMatricesFromDb(date)
  const warehouseMarketAnchors = await loadMlbSpecialtyMarketAnchorsFromDb(date)
  const rawMarketAnchors = Object.keys(warehouseMarketAnchors).length ? {} : await loadDkSpecialtyMarketAnchors(date)
  const specialtyMarketAnchors = Object.keys(warehouseMarketAnchors).length ? warehouseMarketAnchors : rawMarketAnchors
  const loadedMlbGames = (await loadMlbDayGames(date)).map((game) => {
    const matrix = inningRunMatrices[game.id]
    const m2Matrix = matrix ? buildM2InningRunMatrix(game, matrix, specialtyMarketAnchors[game.id] || null) : null
    const enrichedGame = matrix
      ? {
          ...game,
          stateContext: {
            ...(game.stateContext || {}),
            inningRunMatrix: m2Matrix
          }
        }
      : game
    return withMlbPredictionEligibility(withFirst5PushContext(enrichedGame), { requireAddendums: true })
  })
  const omittedMlbGames = loadedMlbGames
    .filter((game) => !gameClearsStarterDependentPublicContext(game))
    .map((game) => ({
      id: game.id,
      title: game.title,
      reason: 'starter-dependent-public-context-incomplete',
      failures: starterDependentPublicContextFailures(game),
      awayStarterStatus: game.starterContext?.away?.usageContext?.status || null,
      homeStarterStatus: game.starterContext?.home?.usageContext?.status || null
    }))
  const mlbGames = loadedMlbGames.filter(gameClearsStarterDependentPublicContext)
  if (!mlbGames.length) throw new Error(`No rich MLB games loaded for ${date}`)

  const slateRoot = path.join(publishedSlatesRoot, date)
  const gamesRoot = path.join(slateRoot, 'games')
  const summaryPath = path.join(slateRoot, 'summary.json')
  const existingSummary = await readJson(summaryPath, {
    id: date,
    label: labelForDate(date),
    status: 'ready',
    slateMeta: { date: labelForDate(date), isoDate: date },
    games: [],
    sources: []
  })
  const nonMlbGames = (existingSummary.games || []).filter((game) => game?.league !== 'MLB')
  const preserveStarted = Boolean(options.preserveStarted)
  const hasExplicitStartedCutoff =
    options.startedCutoffMinutes !== null &&
    options.startedCutoffMinutes !== undefined &&
    String(options.startedCutoffMinutes).trim() !== ''
  const startedCutoffMinutes = hasExplicitStartedCutoff && Number.isFinite(Number(options.startedCutoffMinutes))
    ? Number(options.startedCutoffMinutes)
    : date === pacificToday()
      ? pacificNowMinutes()
      : null
  const existingStartedMlbGames = preserveStarted
    ? (existingSummary.games || [])
        .filter((game) => game?.league === 'MLB' && gameStartedByCutoff(game, startedCutoffMinutes))
    : []
  const preservedStartedIds = new Set(existingStartedMlbGames.map((game) => game.id).filter(Boolean))
  const publishableMlbGames = mlbGames.filter((game) => !preservedStartedIds.has(game.id))

  await fs.mkdir(gamesRoot, { recursive: true })
  for (const existingGame of existingSummary.games || []) {
    if (existingGame?.league !== 'MLB') continue
    if (preservedStartedIds.has(existingGame.id)) continue
    await fs.rm(path.join(gamesRoot, `${slugify(existingGame.id)}.json`), { force: true })
  }
  for (const game of publishableMlbGames) {
    await writeJson(path.join(gamesRoot, `${slugify(game.id)}.json`), game)
  }

  const keepGameFiles = new Set(
    [...nonMlbGames, ...existingStartedMlbGames, ...publishableMlbGames].map((game) => `${slugify(game.id)}.json`)
  )
  for (const entry of await fs.readdir(gamesRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    if (keepGameFiles.has(entry.name)) continue
    await fs.rm(path.join(gamesRoot, entry.name), { force: true })
  }

  const games = [...nonMlbGames, ...existingStartedMlbGames, ...publishableMlbGames].sort((left, right) => {
    const startDelta = Number(left.startMinutes ?? 99999) - Number(right.startMinutes ?? 99999)
    if (Number.isFinite(startDelta) && startDelta !== 0) return startDelta
    return String(left.title || '').localeCompare(String(right.title || ''))
  })

  const summary = {
    ...existingSummary,
    id: date,
    label: existingSummary.label || labelForDate(date),
    status: 'ready',
    slateMeta: {
      ...(existingSummary.slateMeta || { date: existingSummary.label || labelForDate(date), isoDate: date }),
      omittedMlbGames,
      ...(preserveStarted
        ? {
            preservedStartedMlbGames: existingStartedMlbGames.map((game) => ({
              id: game.id,
              title: game.title,
              start: game.start,
              startMinutes: game.startMinutes
            })),
            startedPreservationCutoffMinutes: startedCutoffMinutes
          }
        : {})
    },
    summary: {
      ...(existingSummary.summary || {}),
      totalGames: games.length,
      mlbGames: existingStartedMlbGames.length + publishableMlbGames.length,
      ...(preserveStarted ? { preservedStartedMlbGames: existingStartedMlbGames.length } : {}),
      ...(preserveStarted ? { refreshedMlbGames: publishableMlbGames.length } : {}),
      omittedMlbGames: omittedMlbGames.length
    },
    filters: Array.from(new Set([...(existingSummary.filters || ['All']), 'Tennis', 'MLB'])),
    sources: mergeSources(existingSummary.sources || []),
    games,
    updatedAt: new Date().toISOString()
  }

  await writeJson(summaryPath, summary)
  await updatePublishedIndex(date, summary)
  console.log(
    `[publish-mlb-clean-slate] published ${publishableMlbGames.length} MLB games, preserved ${existingStartedMlbGames.length} started MLB games, omitted ${omittedMlbGames.length} starter-context games, and preserved ${nonMlbGames.length} non-MLB games`
  )
}

const main = async () => {
  const date = argValue('--date')
  if (!date) {
    throw new Error(
      'Usage: npm run data:publish:mlb-clean -- --date YYYY-MM-DD [--refresh] [--preserve-public-slates] [--allow-known-audit-failures] [--deploy]'
    )
  }

  const shouldRefresh = hasFlag('--refresh')
  const deploy = hasFlag('--deploy')
  const skipEspn = hasFlag('--skip-espn')
  const skipGenerate = hasFlag('--skip-generate')
  const preservePublicSlates = hasFlag('--preserve-public-slates')
  const preserveStarted = hasFlag('--preserve-started')
  const startedCutoffMinutes = parseStartedCutoffMinutes(argValue('--started-cutoff-minutes') || argValue('--started-cutoff'))
  const allowKnownAuditFailures = hasFlag('--allow-known-audit-failures') || hasFlag('--allow-audit-failures')
  const liveBase = argValue('--live-base')

  if (shouldRefresh && !skipGenerate) {
    run('npm', ['run', 'data:refresh:mlb-live', '--', '--date', date])
    run('npm', ['run', 'data:ingest:hitter-lineup-splits', '--', '--date', date])
  }
  if (shouldRefresh && !skipEspn) {
    run('node', ['scripts/warehouse-mlb-espn-pitcher-splits.mjs', '--date', date])
  }

  await publishRichMlbGames(date, { preserveStarted, startedCutoffMinutes })

  const publicExportArgs = ['run', 'data:export:public-current', '--', '--date', date]
  const publicExportOptions = preservePublicSlates ? {} : { env: { PUBLIC_SLATE_SCOPE: 'current-window' } }
  if (!preservePublicSlates) publicExportArgs.push('--current-window')
  run('npm', publicExportArgs, publicExportOptions)
  await runPublicMlbAudit(date, { allowKnownFailures: allowKnownAuditFailures })

  if (deploy) {
    run('vercel', ['build', '--prod', '--yes'], {
      cwd: path.join(root, 'web'),
      env: { VITE_PUBLIC_DESK_TABS: 'board,batters' }
    })
    run('vercel', ['deploy', '--prebuilt', '--prod', '--yes'], { cwd: path.join(root, 'web') })
    if (liveBase) {
      run('node', ['scripts/audit-public-mlb-slate.mjs', '--date', date, '--base', liveBase])
    }
  }
}

main().catch((error) => {
  console.error(`[publish-mlb-clean-slate] ${error.stack || error.message}`)
  process.exit(1)
})

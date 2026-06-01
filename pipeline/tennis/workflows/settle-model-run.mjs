import {
  activeStack,
  readJson,
  runDirFor,
  runIdFor,
  shellQuote,
  sha256Text,
  sqliteExec,
  sqliteJson,
  stableJson,
  writeJson
} from '../../lib/model-run-utils.mjs'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = { date: '', model: '', runId: '', requireSettled: false, dryRun: false }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = args[index + 1]
      index += 1
    } else if (arg === '--model') {
      options.model = String(args[index + 1] || '').toUpperCase()
      index += 1
    } else if (arg === '--run-id') {
      options.runId = args[index + 1] || ''
      index += 1
    } else if (arg === '--require-settled') {
      options.requireSettled = true
    } else if (arg === '--dry-run') {
      options.dryRun = true
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('Pass --date YYYY-MM-DD')
  return options
}

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const splitMatchTitle = (title) => {
  const parts = String(title || '').split(/\s+vs\s+/i)
  return [parts[0] || '', parts[1] || '']
}

const namesLikelyMatch = (left, right) => {
  const a = normalize(left)
  const b = normalize(right)
  if (!a || !b) return false
  if (a === b || a.includes(b) || b.includes(a)) return true
  const aTokens = new Set(a.split(' '))
  const bTokens = new Set(b.split(' '))
  return [...aTokens].every((token) => bTokens.has(token)) || [...bTokens].every((token) => aTokens.has(token))
}

const pairKey = (left, right) => [normalize(left), normalize(right)].filter(Boolean).sort().join(' vs ')

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const americanProfit = (odds) => {
  const value = toNumber(odds)
  if (!value) return null
  return value > 0 ? value : 10000 / Math.abs(value)
}

const boolInt = (value) => value === null || value === undefined ? null : value ? 1 : 0

const parseLineFromSelection = (selection) => {
  const match = String(selection || '').match(/(?:over|under)\s+(\d+(?:\.\d+)?)/i)
  return match ? Number(match[1]) : null
}

const parseScoreline = (scoreline) => {
  const sets = []
  for (const token of String(scoreline || '').split(/\s+/).filter(Boolean)) {
    const match = token.match(/^(\d+)-(\d+)/)
    if (!match) continue
    sets.push({
      p1Games: Number(match[1]),
      p2Games: Number(match[2])
    })
  }
  const totals = sets.reduce((acc, set) => {
    acc.p1Games += set.p1Games
    acc.p2Games += set.p2Games
    if (set.p1Games > set.p2Games) acc.p1Sets += 1
    if (set.p2Games > set.p1Games) acc.p2Sets += 1
    return acc
  }, { p1Games: 0, p2Games: 0, p1Sets: 0, p2Sets: 0 })
  return {
    sets,
    ...totals,
    totalGames: totals.p1Games + totals.p2Games,
    firstSetGames: sets[0] ? sets[0].p1Games + sets[0].p2Games : null
  }
}

const loadResults = async (date) => {
  const rows = await sqliteJson(`
    select slate_date, match_id, title, player1_name, player2_name,
           player1_normalized_name, player2_normalized_name,
           winner_name, winner_normalized_name, scoreline, status, completed
    from tennis_match_results
    where slate_date = ${shellQuote(date)}
      and completed = 1
  `)
  const byPair = new Map()
  for (const row of rows) {
    const keys = [
      row.match_id,
      pairKey(row.player1_name, row.player2_name),
      pairKey(row.player1_normalized_name, row.player2_normalized_name),
      pairKey(...splitMatchTitle(row.title))
    ].filter(Boolean)
    const parsedScore = parseScoreline(row.scoreline)
    const result = { ...row, parsedScore }
    for (const key of keys) byPair.set(String(key), result)
  }
  return { rows, byPair }
}

const resultForMatch = (match, byPair) => {
  const [left, right] = splitMatchTitle(match.match)
  const keys = [
    match.matchId,
    pairKey(left, right),
    pairKey(...splitMatchTitle(match.match))
  ].filter(Boolean)
  for (const key of keys) {
    const result = byPair.get(String(key))
    if (result) return result
  }
  for (const result of byPair.values()) {
    if (
      (namesLikelyMatch(left, result.player1_name) && namesLikelyMatch(right, result.player2_name)) ||
      (namesLikelyMatch(left, result.player2_name) && namesLikelyMatch(right, result.player1_name))
    ) {
      return result
    }
  }
  return null
}

const laneForRow = (row) => {
  const label = row.label || row.marketType || 'Unknown'
  if (/moneyline|ml value/i.test(`${row.marketType} ${label}`)) return 'ML'
  if (/spread/i.test(`${row.marketType} ${label}`)) return 'Spread'
  if (/first-set|1st set/i.test(`${row.marketType} ${label}`)) return 'First-set O/U'
  if (/total games|o\/u/i.test(`${row.marketType} ${label}`)) return 'Match O/U'
  if (/win a set/i.test(`${row.marketType} ${label}`)) return 'Set-win'
  return label
}

const gradeMarketRow = ({ runId, settlementId, date, match, row, result }) => {
  const [left, right] = splitMatchTitle(match.match)
  const parsedScore = result?.parsedScore || {}
  const selection = row.selection ?? null
  const lane = laneForRow(row)
  const line = toNumber(row.line) ?? parseLineFromSelection(selection)
  let hit = null
  let graded = false
  let actualWinnerName = result?.winner_name ?? null
  let resultStatus = result?.status ?? (result ? 'completed' : 'pending')

  if (result) {
    if (lane === 'ML') {
      graded = Boolean(selection && actualWinnerName)
      hit = graded ? normalize(selection) === normalize(actualWinnerName) : null
    } else if (lane === 'Spread' && line !== null) {
      const selectionIsLeft = namesLikelyMatch(selection, left)
      const selectionIsRight = namesLikelyMatch(selection, right)
      if (selectionIsLeft || selectionIsRight) {
        const selectedGames = selectionIsLeft ? parsedScore.p1Games : parsedScore.p2Games
        const opponentGames = selectionIsLeft ? parsedScore.p2Games : parsedScore.p1Games
        if (Number.isFinite(selectedGames) && Number.isFinite(opponentGames)) {
          graded = true
          hit = selectedGames + line > opponentGames
        }
      }
    } else if (lane === 'Match O/U' && line !== null && /^(over|under)$/i.test(String(selection))) {
      if (Number.isFinite(parsedScore.totalGames)) {
        graded = true
        hit = /^over$/i.test(selection) ? parsedScore.totalGames > line : parsedScore.totalGames < line
      }
    } else if (lane === 'First-set O/U' && line !== null && /^(over|under)/i.test(String(selection))) {
      if (Number.isFinite(parsedScore.firstSetGames)) {
        graded = true
        hit = /^over/i.test(selection) ? parsedScore.firstSetGames > line : parsedScore.firstSetGames < line
      }
    }
  }

  const odds = toNumber(row.americanOdds)
  const profit = americanProfit(odds)
  const pnlPer100 = graded && profit !== null ? (hit ? Number(profit.toFixed(1)) : -100) : null
  const payload = {
    match,
    marketRow: row,
    result: result ? {
      title: result.title,
      player1Name: result.player1_name,
      player2Name: result.player2_name,
      winnerName: actualWinnerName,
      scoreline: result.scoreline,
      parsedScore
    } : null
  }
  const gradeRowId = sha256Text(stableJson({
    settlementId,
    match: match.match,
    lane,
    marketType: row.marketType,
    label: row.label,
    selection,
    line,
    odds
  }))
  return {
    gradeRowId,
    settlementId,
    sourceRunId: runId,
    slateDate: date,
    matchId: match.matchId ?? null,
    matchTitle: match.match,
    lane,
    marketType: row.marketType || row.label || lane,
    selection,
    line,
    odds,
    modelPct: toNumber(row.modelPct),
    confidence: toNumber(row.confidence) ?? toNumber(match.confidence),
    impliedPct: toNumber(row.impliedPct),
    edgePct: toNumber(row.edgePct),
    evPer100: toNumber(row.netEvPer100) ?? toNumber(row.evPer100),
    valueGrade: row.grade ?? row.valueGrade ?? null,
    resultStatus,
    graded,
    hit,
    pnlPer100,
    actualWinnerName,
    scoreline: result?.scoreline ?? null,
    payload
  }
}

const kalshiRows = ({ runId, settlementId, date }) => {
  return readJson(`data-private/reports/kalshi-tennis-spike-model-${date}.json`, null).then((spike) => {
    const candidates = Array.isArray(spike?.currentCandidates) ? spike.currentCandidates : []
    return candidates.map((candidate) => {
      const gradeRowId = sha256Text(stableJson({
        settlementId,
        lane: 'Kalshi trade-to-sell',
        matchId: candidate.boardMatchId || candidate.matchId,
        selection: candidate.selection || candidate.playerName,
        entry: candidate.entryCents,
        target: candidate.targetCents
      }))
      return {
        gradeRowId,
        settlementId,
        sourceRunId: runId,
        slateDate: date,
        matchId: candidate.boardMatchId || candidate.matchId || null,
        matchTitle: candidate.match || candidate.title || null,
        lane: 'Kalshi trade-to-sell',
        marketType: 'Prediction market exit',
        selection: candidate.selection || candidate.playerName || null,
        line: toNumber(candidate.targetCents),
        odds: null,
        modelPct: toNumber(candidate.touchRatePct) ?? toNumber(candidate.hitRatePct),
        confidence: toNumber(candidate.confidence),
        impliedPct: toNumber(candidate.entryCents),
        edgePct: toNumber(candidate.edgePct),
        evPer100: toNumber(candidate.evPerEntryPct),
        valueGrade: candidate.grade || candidate.lane || null,
        resultStatus: 'pending_price_path',
        graded: false,
        hit: null,
        pnlPer100: null,
        actualWinnerName: null,
        scoreline: null,
        payload: { candidate }
      }
    })
  })
}

const summarizeRows = (rows) => {
  const byLane = {}
  for (const row of rows) {
    const bucket = byLane[row.lane] ?? { rows: 0, graded: 0, hits: 0, misses: 0, pnlPer100: 0 }
    bucket.rows += 1
    if (row.graded) {
      bucket.graded += 1
      if (row.hit) bucket.hits += 1
      else bucket.misses += 1
      bucket.pnlPer100 += Number(row.pnlPer100 || 0)
    }
    byLane[row.lane] = bucket
  }
  for (const lane of Object.keys(byLane)) {
    const bucket = byLane[lane]
    bucket.hitRate = bucket.graded ? Number((bucket.hits / bucket.graded).toFixed(3)) : null
    bucket.roi = bucket.graded ? Number((bucket.pnlPer100 / (100 * bucket.graded)).toFixed(3)) : null
    bucket.pnlPer100 = Number(bucket.pnlPer100.toFixed(1))
  }
  return byLane
}

const confidenceBucket = (row) => {
  const value = toNumber(row.confidence) ?? toNumber(row.modelPct)
  if (value === null) return 'unknown'
  if (value < 50) return '<50'
  if (value < 60) return '50-59'
  if (value < 70) return '60-69'
  return '70+'
}

const impliedBucket = (row) => {
  const value = toNumber(row.impliedPct)
  if (value === null) return 'unknown'
  if (value < 33) return '<33'
  if (value < 50) return '33-49'
  if (value < 67) return '50-66'
  return '67+'
}

const sideBucket = (row) => {
  const value = toNumber(row.impliedPct)
  if (value === null) return 'unknown'
  return value >= 50 ? 'favorite' : 'underdog'
}

const buildBuckets = (rows, settlementId, runId, date) => {
  const bucketFns = [
    ['confidence', confidenceBucket],
    ['market-implied', impliedBucket],
    ['favorite-underdog', sideBucket]
  ]
  const buckets = []
  for (const [bucketType, resolver] of bucketFns) {
    const grouped = new Map()
    for (const row of rows) {
      if (!row.graded) continue
      const key = `${row.lane}::${resolver(row)}`
      const group = grouped.get(key) ?? { lane: row.lane, bucketName: resolver(row), rows: [] }
      group.rows.push(row)
      grouped.set(key, group)
    }
    for (const group of grouped.values()) {
      const hits = group.rows.filter((row) => row.hit).length
      const pnl = group.rows.reduce((total, row) => total + Number(row.pnlPer100 || 0), 0)
      buckets.push({
        settlementId,
        sourceRunId: runId,
        slateDate: date,
        lane: group.lane,
        bucketType,
        bucketName: group.bucketName,
        sampleSize: group.rows.length,
        gradedCount: group.rows.length,
        hitCount: hits,
        hitRate: group.rows.length ? Number((hits / group.rows.length).toFixed(3)) : null,
        roiPer100: group.rows.length ? Number((pnl / (100 * group.rows.length)).toFixed(3)) : null,
        payload: {
          rows: group.rows.map((row) => row.gradeRowId)
        }
      })
    }
  }
  return buckets
}

const sqlValue = (value) => {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null'
  if (typeof value === 'boolean') return value ? '1' : '0'
  return shellQuote(String(value))
}

const persistSettlement = async ({ settlement, rows, buckets }) => {
  await sqliteExec(`
    insert into tennis_model_run_settlements(
      settlement_id, source_run_id, slate_date, model_id, evaluator_version,
      status, grade_mode, settled_at, result_hash, grade_hash, complete_matches,
      pending_matches, row_count, graded_count, hit_count, miss_count, roi_per_100,
      payload_json
    )
    values (
      ${shellQuote(settlement.settlementId)}, ${shellQuote(settlement.sourceRunId)},
      ${shellQuote(settlement.slateDate)}, ${shellQuote(settlement.modelId)},
      ${shellQuote(settlement.evaluatorVersion || '')}, ${shellQuote(settlement.status)},
      ${shellQuote(settlement.gradeMode)}, ${settlement.settledAt ? shellQuote(settlement.settledAt) : 'null'},
      ${shellQuote(settlement.resultHash)}, ${shellQuote(settlement.gradeHash)},
      ${settlement.completeMatches}, ${settlement.pendingMatches}, ${settlement.rowCount},
      ${settlement.gradedCount}, ${settlement.hitCount}, ${settlement.missCount},
      ${sqlValue(settlement.roiPer100)}, ${shellQuote(JSON.stringify(settlement.payload))}
    )
    on conflict(settlement_id) do update set
      status = excluded.status,
      settled_at = excluded.settled_at,
      result_hash = excluded.result_hash,
      grade_hash = excluded.grade_hash,
      complete_matches = excluded.complete_matches,
      pending_matches = excluded.pending_matches,
      row_count = excluded.row_count,
      graded_count = excluded.graded_count,
      hit_count = excluded.hit_count,
      miss_count = excluded.miss_count,
      roi_per_100 = excluded.roi_per_100,
      payload_json = excluded.payload_json,
      updated_at = current_timestamp
  `)
  for (const row of rows) {
    await sqliteExec(`
      insert into tennis_model_run_lane_grades(
        grade_row_id, settlement_id, source_run_id, slate_date, match_id,
        match_title, lane, market_type, selection, line, odds, model_pct,
        confidence, implied_pct, edge_pct, ev_per_100, value_grade,
        result_status, graded, hit, pnl_per_100, actual_winner_name,
        scoreline, payload_json
      )
      values (
        ${shellQuote(row.gradeRowId)}, ${shellQuote(row.settlementId)}, ${shellQuote(row.sourceRunId)},
        ${shellQuote(row.slateDate)}, ${sqlValue(row.matchId)}, ${sqlValue(row.matchTitle)},
        ${shellQuote(row.lane)}, ${shellQuote(row.marketType)}, ${sqlValue(row.selection)},
        ${sqlValue(row.line)}, ${sqlValue(row.odds)}, ${sqlValue(row.modelPct)},
        ${sqlValue(row.confidence)}, ${sqlValue(row.impliedPct)}, ${sqlValue(row.edgePct)},
        ${sqlValue(row.evPer100)}, ${sqlValue(row.valueGrade)}, ${sqlValue(row.resultStatus)},
        ${row.graded ? 1 : 0}, ${boolInt(row.hit) ?? 'null'}, ${sqlValue(row.pnlPer100)},
        ${sqlValue(row.actualWinnerName)}, ${sqlValue(row.scoreline)}, ${shellQuote(JSON.stringify(row.payload))}
      )
      on conflict(grade_row_id) do update set
        result_status = excluded.result_status,
        graded = excluded.graded,
        hit = excluded.hit,
        pnl_per_100 = excluded.pnl_per_100,
        actual_winner_name = excluded.actual_winner_name,
        scoreline = excluded.scoreline,
        payload_json = excluded.payload_json,
        updated_at = current_timestamp
    `)
  }
  for (const bucket of buckets) {
    await sqliteExec(`
      insert into tennis_model_run_calibration_buckets(
        settlement_id, source_run_id, slate_date, lane, bucket_type, bucket_name,
        sample_size, graded_count, hit_count, hit_rate, roi_per_100, payload_json
      )
      values (
        ${shellQuote(bucket.settlementId)}, ${shellQuote(bucket.sourceRunId)}, ${shellQuote(bucket.slateDate)},
        ${shellQuote(bucket.lane)}, ${shellQuote(bucket.bucketType)}, ${shellQuote(bucket.bucketName)},
        ${bucket.sampleSize}, ${bucket.gradedCount}, ${bucket.hitCount},
        ${sqlValue(bucket.hitRate)}, ${sqlValue(bucket.roiPer100)}, ${shellQuote(JSON.stringify(bucket.payload))}
      )
      on conflict(settlement_id, lane, bucket_type, bucket_name) do update set
        sample_size = excluded.sample_size,
        graded_count = excluded.graded_count,
        hit_count = excluded.hit_count,
        hit_rate = excluded.hit_rate,
        roi_per_100 = excluded.roi_per_100,
        payload_json = excluded.payload_json,
        updated_at = current_timestamp
    `)
  }
}

const main = async () => {
  const options = parseArgs()
  const stack = await activeStack({ model: options.model || null })
  const model = stack.modelId
  const runId = options.runId || runIdFor({ date: options.date, stack })
  const runDir = runDirFor({ model, date: options.date })
  const run = await readJson(`${runDir}/run.json`)
  if (!run) throw new Error(`Missing model run snapshot: ${runDir}/run.json`)
  if (!['snapshotted', 'settled', 'locked'].includes(run.status)) {
    throw new Error(`Run has not been snapshotted: ${runId}`)
  }
  const snapshot = await readJson(`${runDir}/predictions.snapshot.json`)
  if (!snapshot) throw new Error(`Missing prediction snapshot: ${runDir}/predictions.snapshot.json`)
  const { rows: resultRows, byPair } = await loadResults(options.date)
  const settlementId = `${runId}:postmatch`
  const marketRows = []
  const resultMatches = new Set()
  for (const match of snapshot.matches || []) {
    const result = resultForMatch(match, byPair)
    if (result) resultMatches.add(match.match)
    for (const row of match.bettingMatrix || []) {
      marketRows.push(gradeMarketRow({ runId, settlementId, date: options.date, match, row, result }))
    }
  }
  const kalshi = await kalshiRows({ runId, settlementId, date: options.date })
  const rows = [...marketRows, ...kalshi]
  const gradedRows = rows.filter((row) => row.graded)
  const hitCount = gradedRows.filter((row) => row.hit).length
  const pnl = gradedRows.reduce((total, row) => total + Number(row.pnlPer100 || 0), 0)
  const summaryByLane = summarizeRows(rows)
  const buckets = buildBuckets(rows, settlementId, runId, options.date)
  const pendingMatches = Math.max(0, (snapshot.matches || []).length - resultMatches.size)
  const status = pendingMatches ? 'pending' : 'settled'
  if (options.requireSettled && status !== 'settled') {
    throw new Error(`Settlement is not complete: ${resultMatches.size}/${(snapshot.matches || []).length} matches have results`)
  }
  const settlement = {
    schemaVersion: 1,
    settlementId,
    sourceRunId: runId,
    slateDate: options.date,
    modelId: model,
    evaluatorVersion: stack.evaluatorVersion,
    status,
    gradeMode: 'postmatch',
    settledAt: status === 'settled' ? new Date().toISOString() : null,
    resultHash: sha256Text(stableJson(resultRows)),
    gradeHash: sha256Text(stableJson(rows)),
    completeMatches: resultMatches.size,
    pendingMatches,
    rowCount: rows.length,
    gradedCount: gradedRows.length,
    hitCount,
    missCount: gradedRows.length - hitCount,
    roiPer100: gradedRows.length ? Number((pnl / (100 * gradedRows.length)).toFixed(3)) : null,
    lanes: summaryByLane,
    buckets,
    payload: {
      sourceRun: {
        runId,
        sourceHash: run.sourceHash,
        inputHash: run.inputHash,
        outputHash: run.outputHash
      },
      snapshotMatches: (snapshot.matches || []).length,
      resultRows: resultRows.length,
      lanes: summaryByLane
    }
  }
  const artifact = {
    ...settlement,
    rows,
    buckets
  }
  if (!options.dryRun) {
    await writeJson(`${runDir}/postmatch-grades.json`, artifact)
    await persistSettlement({ settlement, rows, buckets })
  }
  console.log(JSON.stringify({
    settlementId,
    sourceRunId: runId,
    status,
    dryRun: options.dryRun,
    completeMatches: settlement.completeMatches,
    pendingMatches: settlement.pendingMatches,
    rowCount: settlement.rowCount,
    gradedCount: settlement.gradedCount,
    hitCount: settlement.hitCount,
    missCount: settlement.missCount,
    roiPer100: settlement.roiPer100,
    lanes: settlement.lanes
  }, null, 2))
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})

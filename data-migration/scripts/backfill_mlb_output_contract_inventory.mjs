#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const rootDir = path.resolve(import.meta.dirname, '..', '..')
const defaultReportDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date())

const parseArgs = () => {
  const options = {
    reportDate: defaultReportDate,
    maxFields: 240,
    maxExamples: 3
  }
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--report-date') options.reportDate = args[++index]
    else if (arg === '--json-out') options.jsonOut = args[++index]
    else if (arg === '--markdown-out') options.markdownOut = args[++index]
    else if (arg === '--max-fields') options.maxFields = Number(args[++index])
    else if (arg === '--max-examples') options.maxExamples = Number(args[++index])
    else if (arg === '--help') {
      console.log(`Usage: node data-migration/scripts/backfill_mlb_output_contract_inventory.mjs [--report-date YYYY-MM-DD] [--json-out path] [--markdown-out path]`)
      process.exit(0)
    }
  }
  options.jsonOut ||= `data-migration/reports/mlb_output_contract_inventory_${options.reportDate}.json`
  options.markdownOut ||= `development-docs/mlb/models/mlb-m3-output-contract-inventory-${options.reportDate}.md`
  return options
}

const artifactFamilies = [
  {
    id: 'side_board',
    title: 'Side board picks',
    contractClass: 'market_prediction + selection_row',
    outputPurpose: 'Moneyline/side board rows with selected team, confidence, edge, and embedded game-shape context.',
    roots: ['data-private/predictions/mlb-sides'],
    match: (relativePath) => /-board[^/]*\.json$/.test(relativePath),
    rowExtractors: [
      { id: 'side_board_pick', path: 'picks[]', rows: (payload) => payload.picks || [] },
      {
        id: 'game_flow_total_context',
        path: 'picks[].projection.totals',
        rows: (payload) => (payload.picks || []).map((pick) => ({
          predictionDate: pick.predictionDate,
          gameId: pick.gameId,
          gamePk: pick.gamePk,
          gameTitle: pick.gameTitle,
          modelName: pick.modelName,
          ...(pick.projection?.totals || {})
        })).filter((row) => Object.keys(row).length > 5)
      },
      {
        id: 'first_inning_context',
        path: 'picks[].projection.firstInning',
        rows: (payload) => (payload.picks || []).map((pick) => ({
          predictionDate: pick.predictionDate,
          gameId: pick.gameId,
          gamePk: pick.gamePk,
          gameTitle: pick.gameTitle,
          modelName: pick.modelName,
          ...(pick.projection?.firstInning || {})
        })).filter((row) => Object.keys(row).length > 5)
      }
    ]
  },
  {
    id: 'side_veto',
    title: 'Side veto artifact',
    contractClass: 'selection_policy_result',
    outputPurpose: 'Post-model side gating rows with veto reasons and recommended action.',
    roots: ['data-private/predictions/mlb-sides'],
    match: (relativePath) => /-veto-artifact\.json$/.test(relativePath),
    rowExtractors: [
      { id: 'side_veto_pick', path: 'picks[]', rows: (payload) => payload.picks || [] }
    ]
  },
  {
    id: 'player_props',
    title: 'Player prop picks',
    contractClass: 'market_prediction + selection_row',
    outputPurpose: 'Current player prop board rows for hits, total bases, walks, home runs, RBI, and related markets.',
    roots: ['data-private/predictions/mlb-player-props'],
    match: (relativePath) => /-player-props\.json$/.test(relativePath),
    rowExtractors: [
      { id: 'player_prop_pick', path: 'picks[]', rows: (payload) => payload.picks || [] }
    ]
  },
  {
    id: 'player_props_legacy',
    title: 'Legacy player prop picks',
    contractClass: 'legacy_market_prediction + selection_row',
    outputPurpose: 'Legacy player prop rows that should be mapped only for baseline comparison.',
    roots: ['data-private/predictions/mlb-player-props-legacy'],
    match: (relativePath) => /-player-props-legacy\.json$/.test(relativePath),
    rowExtractors: [
      { id: 'legacy_player_prop_pick', path: 'picks[]', rows: (payload) => payload.picks || [] }
    ]
  },
  {
    id: 'home_runs',
    title: 'Home run board',
    contractClass: 'market_candidate + selection_row',
    outputPurpose: 'Home-run candidate board. Current artifact is score/rank oriented rather than probability/line oriented.',
    roots: ['data-private/predictions/mlb-home-runs'],
    match: (relativePath) => /-statcast-prototype\.json$/.test(relativePath),
    rowExtractors: [
      { id: 'home_run_pick', path: 'picks[]', rows: (payload) => payload.picks || [] },
      { id: 'home_run_game_context', path: 'games[]', rows: (payload) => payload.games || [] }
    ]
  },
  {
    id: 'reliever_shadow',
    title: 'Reliever shadow forecast',
    contractClass: 'latent_forecast',
    outputPurpose: 'RP36/E36 first-up reliever, availability, bridge, and expected-outs forecast.',
    roots: ['data-private/predictions/mlb-reliever-shadow'],
    match: (relativePath) => /-reliever-shadow\.json$/.test(relativePath),
    rowExtractors: [
      {
        id: 'reliever_shadow_team',
        path: 'relieverShadowByTeam{}',
        rows: (payload) => Object.values(payload.relieverShadowByTeam || {})
      },
      {
        id: 'reliever_shadow_pitcher',
        path: 'relieverShadowByTeam{}.relievers[]',
        rows: (payload) => Object.values(payload.relieverShadowByTeam || {}).flatMap((entry) =>
          (entry.relievers || []).map((reliever) => ({
            teamName: entry.teamName,
            officialTeamName: entry.officialTeamName,
            opponentName: entry.opponentName,
            modelTag: entry.modelTag,
            ...reliever
          }))
        )
      }
    ]
  },
  {
    id: 'lineup_board',
    title: 'Lineup board and matchup state',
    contractClass: 'canonical_slate_state + feature_snapshot',
    outputPurpose: 'Lineups, hitter split/statcast/pitch-fit state, starter context, and per-game matchup board.',
    roots: ['data-private/lineups/mlb'],
    match: (relativePath) => /-lineup-board\.json$/.test(relativePath),
    rowExtractors: [
      {
        id: 'lineup_game',
        path: 'lineupBoardsByGameId{}',
        rows: (payload) => Object.values(payload.lineupBoardsByGameId || {})
      },
      {
        id: 'lineup_player',
        path: 'lineupBoardsByGameId{}.away/home.lineup[]',
        rows: (payload) => Object.values(payload.lineupBoardsByGameId || {}).flatMap((game) => {
          const sides = [
            ['away', game.away],
            ['home', game.home]
          ]
          return sides.flatMap(([side, entry]) =>
            (entry?.lineup || []).map((player) => ({
              gameId: game.gameId,
              gameTitle: game.title,
              side,
              teamName: entry.teamName,
              opposingStarterName: entry.opposingStarter?.name,
              opposingStarterHand: entry.opposingStarter?.hand,
              ...player
            }))
          )
        })
      },
      {
        id: 'lineup_matchup_context',
        path: 'lineupMatchupContextByGameId{}',
        rows: (payload) => Object.entries(payload.lineupMatchupContextByGameId || {}).map(([gameId, context]) => ({
          gameId,
          ...context
        }))
      }
    ]
  },
  {
    id: 'market_fitness',
    title: 'Market fitness research artifacts',
    contractClass: 'research_artifact',
    outputPurpose: 'Training/fitness outputs that should become tracked experiment artifacts, not slate presentation payloads.',
    roots: ['data-private/predictions/mlb-market-fitness'],
    match: (relativePath) => /\.json$/.test(relativePath),
    rowExtractors: [
      { id: 'market_fitness_top_level', path: '$', rows: (payload) => [payload] },
      {
        id: 'market_fitness_rows',
        path: 'detectedArrays[]',
        rows: (payload) => collectNamedArrayRows(payload, ['rows', 'picks', 'candidates', 'predictions', 'games', 'models', 'markets'])
      }
    ]
  },
  {
    id: 'model_snapshots',
    title: 'Model cartridge snapshots',
    contractClass: 'run_snapshot',
    outputPurpose: 'Golden and snapshotted model-run payloads with compacted games, picks, and source artifact hashes.',
    roots: ['data-private/model-cartridges/mlb'],
    match: (relativePath) => /\.snapshot\.json$/.test(relativePath),
    rowExtractors: [
      { id: 'snapshot_top_level', path: '$', rows: (payload) => [payload] },
      { id: 'snapshot_game', path: 'games[]', rows: (payload) => payload.games || [] },
      { id: 'snapshot_side_pick', path: 'sidePicks[]', rows: (payload) => payload.sidePicks || [] },
      { id: 'snapshot_prop_pick', path: 'propPicks[]', rows: (payload) => payload.propPicks || [] },
      { id: 'snapshot_home_run_pick', path: 'homeRunPicks[]', rows: (payload) => payload.homeRunPicks || [] }
    ]
  }
]

const contractSources = [
  {
    id: 'cartridge_contracts',
    roots: ['models/mlb/cartridges'],
    match: (relativePath) => /(?:output|metrics)-contract\.json$/.test(relativePath)
  }
]

const dbTables = [
  'prediction_rows',
  'settlement_rows',
  'component_settlement_rows',
  'prop_backtest_rows',
  'side_backtest_rows',
  'home_run_backtest_rows',
  'model_artifacts',
  'mlb_side_predictions',
  'mlb_prop_predictions',
  'mlb_home_run_predictions',
  'mlb_side_backtests',
  'mlb_prop_backtests',
  'mlb_home_run_backtests',
  'mlb_rp36_settlements',
  'mlb_rp36_team_settlements',
  'model_runs',
  'model_run_lanes',
  'model_run_artifacts',
  'model_component_runs',
  'market_contracts',
  'market_snapshots',
  'prop_market_snapshots'
]

const dbSources = [
  {
    id: 'typed_mlb_sqlite',
    role: 'canonical typed MLB store',
    path: 'data-private/warehouse/sports/mlb/sql-mlb.db'
  },
  {
    id: 'legacy_sports_db',
    role: 'legacy warehouse and historical model-output store',
    path: 'data-private/warehouse/sports.db'
  }
]

const m3ContractSeeds = [
  {
    contractId: 'canonical_slate_state',
    purpose: 'Input state shared by all prediction heads.',
    observedEvidence: ['lineup_board.lineup_game', 'lineup_board.lineup_player'],
    status: 'observed_as_artifact_needs_db_contract'
  },
  {
    contractId: 'latent_forecast.reliever_shadow',
    purpose: 'First-up reliever cluster, availability, bridge quality, expected outs/pitches.',
    observedEvidence: ['reliever_shadow.reliever_shadow_team', 'reliever_shadow.reliever_shadow_pitcher'],
    status: 'observed'
  },
  {
    contractId: 'latent_forecast.game_flow',
    purpose: 'Full-game, first-five, late-game, and first-inning run-shape context used by market heads.',
    observedEvidence: ['side_board.game_flow_total_context', 'side_board.first_inning_context'],
    status: 'observed_inside_side_board_needs_promoted_forecast_contract'
  },
  {
    contractId: 'market_prediction.moneyline',
    purpose: 'Known-game team win probability and edge against moneyline market.',
    observedEvidence: ['side_board.side_board_pick'],
    status: 'partial_observed_missing_explicit_model_probability'
  },
  {
    contractId: 'market_prediction.full_game_total',
    purpose: 'Over/under probability against known full-game total lines.',
    observedEvidence: ['typed_mlb_sqlite.market_contracts market_type=total', 'side_board.game_flow_total_context.fullGame'],
    status: 'market_lines_observed_context_only_prediction_rows_missing'
  },
  {
    contractId: 'market_prediction.first5_total',
    purpose: 'Over/under probability against known first-five total lines.',
    observedEvidence: ['typed_mlb_sqlite.market_contracts market_type=first5Total', 'side_board.game_flow_total_context.first5'],
    status: 'market_lines_observed_context_only_prediction_rows_missing'
  },
  {
    contractId: 'market_prediction.first_inning',
    purpose: 'First-inning yes/no or over/under probability against known market lines.',
    observedEvidence: ['typed_mlb_sqlite.market_contracts market_type=firstInning', 'side_board.first_inning_context'],
    status: 'market_lines_observed_context_only_prediction_rows_missing'
  },
  {
    contractId: 'market_prediction.first5_moneyline',
    purpose: 'First-five side probability against known first-five winner contracts.',
    observedEvidence: ['typed_mlb_sqlite.market_contracts market_type=first5Winner'],
    status: 'market_lines_observed_prediction_rows_missing'
  },
  {
    contractId: 'market_prediction.player_prop',
    purpose: 'Known player prop line probability and expected value.',
    observedEvidence: ['player_props.player_prop_pick'],
    status: 'observed_needs_normalization'
  },
  {
    contractId: 'market_prediction.home_run',
    purpose: 'Player HR probability/edge against available market.',
    observedEvidence: ['home_runs.home_run_pick'],
    status: 'candidate_only_missing_probability_and_market_line'
  },
  {
    contractId: 'selection_policy_result',
    purpose: 'Board inclusion/pass/veto decision separated from model probability.',
    observedEvidence: ['side_veto.side_veto_pick', 'side_board.side_board_pick', 'player_props.player_prop_pick'],
    status: 'observed_mixed_into_prediction_payloads'
  },
  {
    contractId: 'experiment_artifact',
    purpose: 'Training/backtest/model fitness artifact with metrics, feature set, and data lineage.',
    observedEvidence: ['market_fitness.market_fitness_top_level', 'model_snapshots.snapshot_top_level'],
    status: 'observed_unstandardized'
  }
]

const fileExists = async (relativePath) => {
  try {
    await fs.access(path.resolve(rootDir, relativePath))
    return true
  } catch {
    return false
  }
}

const walkFiles = async (relativeDir) => {
  const absoluteDir = path.resolve(rootDir, relativeDir)
  if (!(await fileExists(relativeDir))) return []
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walkFiles(relativePath))
    } else if (entry.isFile()) {
      files.push(relativePath)
    }
  }
  return files
}

const readJson = async (relativePath) => {
  const text = await fs.readFile(path.resolve(rootDir, relativePath), 'utf8')
  return JSON.parse(text)
}

const writeJson = async (relativePath, payload) => {
  const absolute = path.resolve(rootDir, relativePath)
  await fs.mkdir(path.dirname(absolute), { recursive: true })
  await fs.writeFile(absolute, `${JSON.stringify(payload, null, 2)}\n`)
}

const writeText = async (relativePath, text) => {
  const absolute = path.resolve(rootDir, relativePath)
  await fs.mkdir(path.dirname(absolute), { recursive: true })
  await fs.writeFile(absolute, text)
}

const typeOf = (value) => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

const stableExample = (value) => {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return `[array:${value.length}]`
  if (typeof value === 'object') return `{object:${Object.keys(value).slice(0, 6).join(',')}}`
  if (typeof value === 'string' && value.length > 120) return `${value.slice(0, 117)}...`
  return value
}

const addField = (out, key, value) => {
  if (!key) return
  if (!out.has(key)) out.set(key, [])
  out.get(key).push(value)
}

const flattenValue = (value, prefix, out, depth = 0) => {
  if (!prefix) return
  if (value === undefined) return
  if (value === null || typeof value !== 'object') {
    addField(out, prefix, value)
    return
  }
  if (Array.isArray(value)) {
    addField(out, prefix, value)
    if (depth >= 5) return
    value.slice(0, 5).forEach((entry) => {
      if (entry && typeof entry === 'object') flattenObject(entry, `${prefix}[]`, out, depth + 1)
      else addField(out, `${prefix}[]`, entry)
    })
    return
  }
  if (depth >= 6) {
    addField(out, prefix, value)
    return
  }
  flattenObject(value, prefix, out, depth + 1)
}

const flattenObject = (value, prefix = '', out = new Map(), depth = 0) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (prefix) addField(out, prefix, value)
    return out
  }
  for (const [key, entry] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key
    flattenValue(entry, next, out, depth)
  }
  return out
}

const summarizeRows = (rows, options) => {
  const stats = new Map()
  const rowCount = rows.length
  for (const row of rows) {
    const rowFields = flattenObject(row)
    const seen = new Set()
    for (const [fieldPath, values] of rowFields.entries()) {
      if (!stats.has(fieldPath)) {
        stats.set(fieldPath, {
          path: fieldPath,
          presentRows: 0,
          typeCounts: {},
          examples: [],
          distinctValues: new Set()
        })
      }
      const entry = stats.get(fieldPath)
      if (!seen.has(fieldPath)) {
        entry.presentRows += 1
        seen.add(fieldPath)
      }
      for (const value of values) {
        const valueType = typeOf(value)
        entry.typeCounts[valueType] = (entry.typeCounts[valueType] || 0) + 1
        const example = stableExample(value)
        if (entry.examples.length < options.maxExamples && !entry.examples.some((stored) => JSON.stringify(stored) === JSON.stringify(example))) {
          entry.examples.push(example)
        }
        if (['string', 'number', 'boolean'].includes(valueType) && entry.distinctValues.size <= 30) {
          entry.distinctValues.add(String(value))
        }
      }
    }
  }
  const fields = [...stats.values()]
    .map((entry) => ({
      path: entry.path,
      presentRows: entry.presentRows,
      required: rowCount > 0 && entry.presentRows === rowCount,
      coveragePct: rowCount > 0 ? Number(((entry.presentRows / rowCount) * 100).toFixed(1)) : 0,
      typeCounts: entry.typeCounts,
      examples: entry.examples,
      distinctValues:
        entry.distinctValues.size > 0 && entry.distinctValues.size <= 20
          ? [...entry.distinctValues].slice(0, 20)
          : undefined
    }))
    .sort((left, right) => {
      if (right.presentRows !== left.presentRows) return right.presentRows - left.presentRows
      return left.path.localeCompare(right.path)
    })
  return {
    rowCount,
    fieldCount: fields.length,
    requiredFieldCount: fields.filter((field) => field.required).length,
    fields: fields.slice(0, options.maxFields)
  }
}

const dateFromPath = (relativePath) => {
  const match = relativePath.match(/(\d{4}-\d{2}-\d{2})/)
  return match?.[1] || null
}

const unique = (values) => [...new Set(values.filter(Boolean))]

const dateSummary = (files) => {
  const dates = unique(files.map(dateFromPath)).sort()
  return {
    count: dates.length,
    min: dates[0] || null,
    max: dates.at(-1) || null,
    dates
  }
}

const collectNamedArrayRows = (payload, names) => {
  const rows = []
  const visit = (value, prefix, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 4) return
    if (Array.isArray(value)) return
    for (const [key, entry] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${key}` : key
      if (Array.isArray(entry) && names.includes(key)) {
        entry.forEach((row) => rows.push({ sourceArrayPath: next, ...(row && typeof row === 'object' ? row : { value: row }) }))
      } else if (entry && typeof entry === 'object') {
        visit(entry, next, depth + 1)
      }
    }
  }
  visit(payload, '')
  return rows
}

const collectFamilyFiles = async (family) => {
  const allFiles = []
  for (const root of family.roots) {
    const files = await walkFiles(root)
    allFiles.push(...files.filter((relativePath) => relativePath.endsWith('.json') && family.match(relativePath)))
  }
  return allFiles.sort()
}

const summarizeArtifactFamily = async (family, options) => {
  const files = await collectFamilyFiles(family)
  const topLevelKeys = new Map()
  const rowBuckets = new Map()
  const parseFailures = []
  for (const file of files) {
    let payload
    try {
      payload = await readJson(file)
    } catch (error) {
      parseFailures.push({ file, error: error.message })
      continue
    }
    Object.keys(payload || {}).forEach((key) => topLevelKeys.set(key, (topLevelKeys.get(key) || 0) + 1))
    for (const extractor of family.rowExtractors) {
      const rows = extractor.rows(payload)
      if (!rowBuckets.has(extractor.id)) {
        rowBuckets.set(extractor.id, {
          id: extractor.id,
          path: extractor.path,
          rows: []
        })
      }
      rowBuckets.get(extractor.id).rows.push(...rows.map((row) => ({
        __sourceFile: file,
        __sourceDate: dateFromPath(file),
        ...(row && typeof row === 'object' ? row : { value: row })
      })))
    }
  }
  return {
    id: family.id,
    title: family.title,
    contractClass: family.contractClass,
    outputPurpose: family.outputPurpose,
    files: files.length,
    dates: dateSummary(files),
    parseFailures,
    topLevelKeys: [...topLevelKeys.entries()].sort((left, right) => right[1] - left[1]).map(([key, count]) => ({ key, files: count })),
    rowContracts: [...rowBuckets.values()].map((bucket) => ({
      id: bucket.id,
      path: bucket.path,
      ...summarizeRows(bucket.rows, options)
    }))
  }
}

const summarizeContractSources = async (source) => {
  const files = []
  for (const root of source.roots) {
    const rootFiles = await walkFiles(root)
    files.push(...rootFiles.filter((relativePath) => relativePath.endsWith('.json') && source.match(relativePath)))
  }
  const rows = []
  for (const file of files.sort()) {
    try {
      const payload = await readJson(file)
      rows.push({
        file,
        modelId: payload.modelId || payload.model_id || path.basename(path.dirname(file)),
        status: payload.status || null,
        lanes: payload.lanes || null,
        outputKind: payload.outputKind || null,
        requiredFields: payload.requiredFields || payload.requiredPublicFields || null,
        topLevelKeys: Object.keys(payload)
      })
    } catch (error) {
      rows.push({ file, error: error.message })
    }
  }
  return {
    id: source.id,
    files: rows.length,
    rows
  }
}

const sqliteJson = (dbPath, sql) => {
  try {
    const output = execFileSync('sqlite3', ['-json', dbPath, sql], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim()
    return output ? JSON.parse(output) : []
  } catch (error) {
    return { error: error.message }
  }
}

const summarizeDbTables = () => {
  const sources = dbSources.map((source) => {
    const absoluteDbPath = path.resolve(rootDir, source.path)
    const tables = sqliteJson(absoluteDbPath, "select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name;")
    if (!Array.isArray(tables)) return { ...source, available: false, error: tables.error, tables: [] }
    const tableSet = new Set(tables.map((row) => row.name))
    return {
      ...source,
      available: true,
      tables: dbTables.map((table) => {
        if (!tableSet.has(table)) {
          return { table, exists: false }
        }
        const columns = sqliteJson(absoluteDbPath, `pragma table_info(${table});`)
        const count = sqliteJson(absoluteDbPath, `select count(*) as rows from ${table};`)
        const dateColumns = Array.isArray(columns)
          ? columns.map((column) => column.name).filter((name) => /date|slate|run_date|prediction_date|snapshot_date/.test(name))
          : []
        const dateRange = dateColumns[0]
          ? sqliteJson(absoluteDbPath, `select min(${dateColumns[0]}) as min_date, max(${dateColumns[0]}) as max_date, count(distinct ${dateColumns[0]}) as date_count from ${table};`)
          : []
        const breakdown = dbBreakdown(absoluteDbPath, table, tableSet)
        return {
          table,
          exists: true,
          rows: Array.isArray(count) ? Number(count[0]?.rows || 0) : null,
          dateColumn: dateColumns[0] || null,
          dateRange: Array.isArray(dateRange) ? dateRange[0] || null : null,
          columns: Array.isArray(columns) ? columns.map((column) => ({
            name: column.name,
            type: column.type,
            notnull: Boolean(column.notnull),
            pk: Boolean(column.pk)
          })) : [],
          breakdown
        }
      })
    }
  })
  return {
    available: sources.some((source) => source.available),
    sources,
    tables: sources.flatMap((source) => source.tables.map((table) => ({ source: source.id, ...table })))
  }
}

const importantField = (fieldPath) =>
  /(^|\.)(date|modelName|modelId|gameId|gamePk|gameTitle|marketType|propType|marketLabel|line|lineThreshold|side|teamName|playerId|playerName|pitcherId|pitcherName|confidence|probability|expectedValue|score|modelEdge|marketProbability|recommendedAction|vetoReasons|firstRelieverLikelihood|expectedOuts|availabilityScore|bridgeScore|rank|selection|sourceArtifact|lane)($|\.)/i.test(fieldPath)

const dbBreakdown = (dbPath, table, tableSet) => {
  const safeLimit = ' limit 80'
  if (table === 'prediction_rows' && tableSet.has('model_runs')) {
    return sqliteJson(dbPath, `
      select lane, market_type, count(*) as rows
      from prediction_rows
      join model_runs using(model_run_id)
      group by lane, market_type
      order by rows desc, lane, market_type
      ${safeLimit};
    `)
  }
  if (table === 'market_contracts') {
    return sqliteJson(dbPath, `
      select coalesce(market_type, 'unknown') as market_type, count(*) as rows
      from market_contracts
      group by coalesce(market_type, 'unknown')
      order by rows desc, market_type
      ${safeLimit};
    `)
  }
  if (table === 'prop_market_snapshots') {
    return sqliteJson(dbPath, `
      select coalesce(market_type, 'unknown') as market_type, count(*) as rows
      from prop_market_snapshots
      group by coalesce(market_type, 'unknown')
      order by rows desc, market_type
      ${safeLimit};
    `)
  }
  if (table === 'mlb_prop_predictions') {
    return sqliteJson(dbPath, `
      select coalesce(prop_type, 'unknown') as prop_type, count(*) as rows
      from mlb_prop_predictions
      group by coalesce(prop_type, 'unknown')
      order by rows desc, prop_type
      ${safeLimit};
    `)
  }
  if (table === 'mlb_side_predictions') {
    return sqliteJson(dbPath, `
      select coalesce(model_name, 'unknown') as model_name, count(*) as rows
      from mlb_side_predictions
      group by coalesce(model_name, 'unknown')
      order by rows desc, model_name
      ${safeLimit};
    `)
  }
  return []
}

const compactFieldList = (rowContract) =>
  rowContract.fields
    .filter((field) => importantField(field.path))
    .slice(0, 30)
    .map((field) => `${field.required ? '*' : ''}${field.path}`)

const domainFields = (rowContract) =>
  rowContract.fields
    .filter((field) =>
      ['propType', 'marketType', 'lane', 'modelName', 'recommendedAction', 'scoreBand', 'shadowSupportLevel'].includes(field.path) ||
      /(^|\.)marketType$|(^|\.)propType$|(^|\.)lane$/.test(field.path)
    )
    .filter((field) => field.distinctValues?.length)
    .slice(0, 10)

const buildMarkdown = (report) => {
  const lines = []
  lines.push(`# MLB M3 Output Contract Inventory`)
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push('')
  lines.push(`This is a read-only backfill of the current MLB output surface. It inventories artifact contracts, existing cartridge contract files, and typed DB output tables so M3 can be designed from outputs backward.`)
  lines.push('')
  lines.push(`## Executive Summary`)
  lines.push('')
  lines.push(`- Artifact families scanned: ${report.artifactFamilies.length}`)
  lines.push(`- Artifact files scanned: ${report.summary.artifactFiles}`)
  lines.push(`- Observed artifact dates: ${report.summary.dateRange.min || 'n/a'} to ${report.summary.dateRange.max || 'n/a'} (${report.summary.dateRange.count} distinct dates)`)
  lines.push(`- Existing contract source files: ${report.contractSources.reduce((sum, source) => sum + source.files, 0)}`)
  lines.push(`- DB sources inspected: ${report.dbTables.sources.filter((source) => source.available).length}/${report.dbTables.sources.length}`)
  lines.push(`- Typed/legacy DB output tables present: ${report.dbTables.tables.filter((table) => table.exists).length}/${report.dbTables.tables.length}`)
  lines.push('')
  lines.push(`## Observed Artifact Families`)
  lines.push('')
  lines.push(`| Family | Class | Files | Dates | Row Contracts | Notes |`)
  lines.push(`|---|---:|---:|---:|---|---|`)
  for (const family of report.artifactFamilies) {
    const rowSummary = family.rowContracts.map((row) => `${row.id}: ${row.rowCount} rows / ${row.fieldCount} fields`).join('<br>')
    lines.push(`| ${family.title} | ${family.contractClass} | ${family.files} | ${family.dates.count} | ${rowSummary || '-'} | ${family.outputPurpose} |`)
  }
  lines.push('')
  lines.push(`## Contract Seeds For M3`)
  lines.push('')
  lines.push(`| Contract | Status | Evidence | Purpose |`)
  lines.push(`|---|---|---|---|`)
  for (const seed of report.m3ContractSeeds) {
    lines.push(`| \`${seed.contractId}\` | ${seed.status} | ${seed.observedEvidence.map((value) => `\`${value}\``).join('<br>')} | ${seed.purpose} |`)
  }
  lines.push('')
  lines.push(`## Row Contract Detail`)
  for (const family of report.artifactFamilies) {
    lines.push('')
    lines.push(`### ${family.title}`)
    lines.push('')
    lines.push(`Class: \`${family.contractClass}\``)
    lines.push('')
    lines.push(`Files: ${family.files}; dates: ${family.dates.min || 'n/a'} to ${family.dates.max || 'n/a'}`)
    lines.push('')
    for (const rowContract of family.rowContracts) {
      lines.push(`#### ${rowContract.id}`)
      lines.push('')
      lines.push(`Path: \`${rowContract.path}\`; rows: ${rowContract.rowCount}; fields: ${rowContract.fieldCount}; always-present fields: ${rowContract.requiredFieldCount}`)
      const fields = compactFieldList(rowContract)
      if (fields.length) {
        lines.push('')
        lines.push(`Key observed fields:`)
        for (const field of fields) lines.push(`- \`${field}\``)
      }
      const examples = rowContract.fields
        .filter((field) => importantField(field.path) && field.examples.length)
        .slice(0, 8)
      if (examples.length) {
        lines.push('')
        lines.push(`Sample values:`)
        for (const field of examples) {
          lines.push(`- \`${field.path}\`: ${field.examples.map((example) => `\`${String(example).replaceAll('|', '\\|')}\``).join(', ')}`)
        }
      }
      const domains = domainFields(rowContract)
      if (domains.length) {
        lines.push('')
        lines.push(`Observed domains:`)
        for (const field of domains) {
          lines.push(`- \`${field.path}\`: ${field.distinctValues.map((value) => `\`${String(value).replaceAll('|', '\\|')}\``).join(', ')}`)
        }
      }
      lines.push('')
    }
  }
  lines.push(`## Existing Cartridge Contract Files`)
  lines.push('')
  for (const source of report.contractSources) {
    for (const row of source.rows) {
      lines.push(`- \`${row.file}\`: model \`${row.modelId || 'unknown'}\`, status \`${row.status || 'unknown'}\`${row.outputKind ? `, kind \`${row.outputKind}\`` : ''}`)
    }
  }
  lines.push('')
  lines.push(`## Typed DB Output Tables`)
  lines.push('')
  lines.push(`| Source | Table | Exists | Rows | Date Range | Columns |`)
  lines.push(`|---|---|---:|---:|---|---:|`)
  for (const table of report.dbTables.tables) {
    const dateRange = table.dateRange ? `${table.dateRange.min_date || 'n/a'} to ${table.dateRange.max_date || 'n/a'} (${table.dateRange.date_count || 0})` : '-'
    lines.push(`| \`${table.source}\` | \`${table.table}\` | ${table.exists ? 'yes' : 'no'} | ${table.rows ?? '-'} | ${dateRange} | ${table.columns?.length || 0} |`)
  }
  const predictionBreakdowns = report.dbTables.tables
    .filter((table) => table.exists && Array.isArray(table.breakdown) && table.breakdown.length)
    .map((table) => ({
      source: table.source,
      table: table.table,
      rows: table.breakdown.slice(0, 20)
    }))
  if (predictionBreakdowns.length) {
    lines.push('')
    lines.push(`### DB Output Breakdowns`)
    for (const entry of predictionBreakdowns) {
      lines.push('')
      lines.push(`\`${entry.source}.${entry.table}\``)
      for (const row of entry.rows) {
        const label = Object.entries(row)
          .filter(([key]) => key !== 'rows')
          .map(([key, value]) => `${key}=${value}`)
          .join(', ')
        lines.push(`- ${label}: ${row.rows}`)
      }
    }
  }
  lines.push('')
  lines.push(`## Immediate Design Implications`)
  lines.push('')
  lines.push(`- M3 should define separate contracts for latent forecasts, market predictions, selection-policy results, and presentation exports.`)
  lines.push(`- Current side/home-run outputs are not fully priced market-prediction rows; side rows lack explicit model win probability, and HR rows are score/rank candidates rather than probability against a known line.`)
  lines.push(`- Player props are closest to the future market-prediction row shape because they already expose player, market label, line threshold, probability, expected value, and confidence.`)
  lines.push(`- Reliever shadow is already a latent forecast contract and should feed reconciliation/simulation rather than publish standalone picks.`)
  lines.push(`- Lineup board is too large to remain a presentation artifact; M3 should materialize this as canonical slate state plus reusable feature snapshots.`)
  lines.push('')
  return `${lines.join('\n')}\n`
}

const main = async () => {
  const options = parseArgs()
  const artifactSummaries = []
  for (const family of artifactFamilies) {
    artifactSummaries.push(await summarizeArtifactFamily(family, options))
  }
  const contractSourceSummaries = []
  for (const source of contractSources) {
    contractSourceSummaries.push(await summarizeContractSources(source))
  }
  const allDates = artifactSummaries.flatMap((family) => family.dates.dates)
  const report = {
    generatedAt: new Date().toISOString(),
    reportDate: options.reportDate,
    script: 'data-migration/scripts/backfill_mlb_output_contract_inventory.mjs',
    summary: {
      artifactFamilies: artifactSummaries.length,
      artifactFiles: artifactSummaries.reduce((sum, family) => sum + family.files, 0),
      dateRange: dateSummary(allDates)
    },
    m3ContractSeeds,
    artifactFamilies: artifactSummaries,
    contractSources: contractSourceSummaries,
    dbTables: summarizeDbTables()
  }
  await writeJson(options.jsonOut, report)
  await writeText(options.markdownOut, buildMarkdown(report))
  console.log(JSON.stringify({
    ok: true,
    jsonOut: options.jsonOut,
    markdownOut: options.markdownOut,
    artifactFamilies: report.summary.artifactFamilies,
    artifactFiles: report.summary.artifactFiles,
    dateRange: report.summary.dateRange
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const timestamp = new Date().toISOString();
const defaultDb = path.join(repoRoot, 'data-private/warehouse/sports/mlb/sql-mlb.db');

function parseArgs(argv) {
  const args = {
    start: null,
    end: null,
    date: null,
    db: defaultDb,
    dryRun: false,
    report: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--start') args.start = argv[++index];
    else if (arg === '--end') args.end = argv[++index];
    else if (arg === '--date') args.date = argv[++index];
    else if (arg === '--db') args.db = path.resolve(argv[++index]);
    else if (arg === '--report') args.report = path.resolve(argv[++index]);
    else if (arg === '--dry-run') args.dryRun = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.date) {
    args.start = args.date;
    args.end = args.date;
  }
  args.start ||= '2026-06-01';
  args.end ||= args.start;
  args.report ||= path.join(
    repoRoot,
    'data-migration/reports',
    `backfill_mlb_cached_prediction_rows_${args.start}_${args.end}.json`,
  );
  return args;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function readJson(localPath) {
  return JSON.parse(readFileSync(path.join(repoRoot, localPath), 'utf8'));
}

function localExists(localPath) {
  return existsSync(path.join(repoRoot, localPath));
}

function fileHash(localPath) {
  return sha256(readFileSync(path.join(repoRoot, localPath)));
}

function fileMtime(localPath) {
  return statSync(path.join(repoRoot, localPath)).mtime.toISOString();
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNumber(value) {
  if (value === null || value === undefined || value === '') return 'null';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(numeric) : 'null';
}

function runSqlite(dbPath, sql) {
  return execFileSync('sqlite3', [dbPath], {
    cwd: repoRoot,
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function queryJson(dbPath, sql) {
  const output = execFileSync('sqlite3', ['-json', dbPath], {
    cwd: repoRoot,
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
  return output ? JSON.parse(output) : [];
}

function queryScalar(dbPath, sql) {
  return runSqlite(dbPath, sql).trim();
}

function datesBetween(start, end) {
  const out = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const stop = new Date(`${end}T00:00:00Z`);
  while (cursor <= stop) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function stableId(parts) {
  return `pred-${sha256(parts.filter((part) => part !== null && part !== undefined).join('|')).slice(0, 32)}`;
}

function ensurePredictionLifecycleColumns(dbPath) {
  const columns = new Set(queryJson(dbPath, 'pragma table_info(prediction_rows);').map((column) => column.name));
  const statements = [];
  if (!columns.has('is_final')) {
    statements.push('alter table prediction_rows add column is_final integer not null default 0;');
  }
  if (!columns.has('finalized_at')) {
    statements.push('alter table prediction_rows add column finalized_at text;');
  }
  if (!columns.has('final_reason')) {
    statements.push('alter table prediction_rows add column final_reason text;');
  }
  statements.push('create index if not exists idx_mlb_prediction_rows_final on prediction_rows (is_final, game_id);');
  if (statements.length) runSqlite(dbPath, statements.join('\n'));
}

function probabilityValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric > 1 ? numeric / 100 : numeric;
}

function confidenceValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function gameIdFor(game) {
  return game?.gamePk ? `mlb-${game.gamePk}` : game?.id || null;
}

function playerIdFor(value) {
  if (value === null || value === undefined || value === '') return null;
  return `mlb-player-${value}`;
}

function compactJson(value) {
  return JSON.stringify(value, (_key, item) => {
    if (Array.isArray(item) && item.length > 12) return item.slice(0, 12);
    return item;
  });
}

function chunked(values, size = 400) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function startedGameIdsForRows(dbPath, rows) {
  const gameIds = [...new Set(rows.map((row) => row.game_id).filter(Boolean))];
  const started = new Set();
  for (const batch of chunked(gameIds)) {
    const ids = batch.map(sqlString).join(',');
    const records = queryJson(
      dbPath,
      `select game_id
       from games
       where game_id in (${ids})
         and start_time_utc is not null
         and start_time_utc <= ${sqlString(timestamp)}
         and coalesce(lower(status), '') not like '%postpon%'
         and coalesce(lower(status), '') not like '%cancel%';`,
    );
    for (const record of records) started.add(record.game_id);
  }
  return started;
}

function attachFinalState(dbPath, rows) {
  const started = startedGameIdsForRows(dbPath, rows);
  return rows.map((row) => ({
    ...row,
    is_final: started.has(row.game_id) ? 1 : 0,
    finalized_at: started.has(row.game_id) ? timestamp : null,
    final_reason: started.has(row.game_id) ? 'game_started' : null,
  }));
}

function finalizeStartedRowsSql(start, end) {
  return `update prediction_rows
    set is_final = 1,
      finalized_at = coalesce(finalized_at, ${sqlString(timestamp)}),
      final_reason = coalesce(final_reason, 'game_started')
    where coalesce(is_final, 0) = 0
      and model_run_id in (
        select model_run_id
        from model_runs
        where sport = 'mlb'
          and run_date between ${sqlString(start)} and ${sqlString(end)}
      )
      and game_id in (
        select game_id
        from games
        where start_time_utc is not null
          and start_time_utc <= ${sqlString(timestamp)}
          and coalesce(lower(status), '') not like '%postpon%'
          and coalesce(lower(status), '') not like '%cancel%'
      );`;
}

function gameDirForDate(date) {
  const candidates = [
    `published-data/slates/${date}/games`,
    `web/public/data/slates/${date}/games`,
  ];
  return candidates.find(localExists) || null;
}

function readGameArtifacts(date) {
  const dir = gameDirForDate(date);
  if (!dir) return { games: [], sources: [] };
  const games = [];
  const sources = [];
  for (const file of readdirSync(path.join(repoRoot, dir)).filter((entry) => entry.endsWith('.json')).sort()) {
    const localPath = `${dir}/${file}`;
    const game = readJson(localPath);
    if (game?.league !== 'MLB') continue;
    games.push({ game, localPath });
    sources.push(localPath);
  }
  return { games, sources };
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function gameLookupFromArtifacts(records) {
  const bySlug = new Map();
  const byTitle = new Map();
  for (const { game, localPath } of records) {
    const canonicalGameId = gameIdFor(game);
    if (!canonicalGameId) continue;
    const slug = path.basename(localPath, '.json');
    bySlug.set(normalizeKey(slug), canonicalGameId);
    if (game?.id) bySlug.set(normalizeKey(game.id), canonicalGameId);
    if (game?.title) byTitle.set(normalizeKey(game.title), canonicalGameId);
  }
  return { bySlug, byTitle };
}

function canonicalGameIdForPick(pick, lookup) {
  if (pick?.gamePk) return `mlb-${pick.gamePk}`;
  const rawGameId = pick?.gameId;
  if (rawGameId && String(rawGameId).startsWith('mlb-')) return rawGameId;
  if (rawGameId && lookup.bySlug.has(normalizeKey(rawGameId))) {
    return lookup.bySlug.get(normalizeKey(rawGameId));
  }
  if (pick?.gameTitle && lookup.byTitle.has(normalizeKey(pick.gameTitle))) {
    return lookup.byTitle.get(normalizeKey(pick.gameTitle));
  }
  return rawGameId || null;
}

function readPropArtifacts(date) {
  const publicCandidates = [
    `web/public/data/slates/${date}/props.json`,
    `published-data/slates/${date}/props.json`,
  ];
  for (const localPath of publicCandidates) {
    if (!localExists(localPath)) continue;
    const payload = readJson(localPath);
    if (Array.isArray(payload?.picks) && payload.picks.length) {
      return { picks: payload.picks, sources: [localPath], mode: 'public' };
    }
  }

  const privateCandidates = [
    `data-private/predictions/mlb-player-props/${date}-player-props.json`,
    `data-private/predictions/mlb-player-props-legacy/${date}-player-props-legacy.json`,
  ];
  const picks = [];
  const sources = [];
  for (const localPath of privateCandidates) {
    if (!localExists(localPath)) continue;
    const payload = readJson(localPath);
    if (!Array.isArray(payload?.picks) || !payload.picks.length) continue;
    sources.push(localPath);
    picks.push(...payload.picks);
  }
  const seen = new Set();
  const deduped = [];
  for (const pick of picks) {
    const key = pick.id || `${pick.gameId}:${pick.playerId}:${pick.propType}:${pick.marketLabel}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(pick);
  }
  return { picks: deduped, sources, mode: sources.length ? 'private-merged' : 'missing' };
}

function readHomeRunArtifacts(date) {
  const candidates = [
    `web/public/data/slates/${date}/home-runs.json`,
    `published-data/slates/${date}/home-runs.json`,
    `data-private/predictions/mlb-home-runs/${date}-statcast-prototype.json`,
  ];
  for (const localPath of candidates) {
    if (!localExists(localPath)) continue;
    const payload = readJson(localPath);
    if (Array.isArray(payload?.picks) && payload.picks.length) {
      return { picks: payload.picks, sources: [localPath] };
    }
  }
  return { picks: [], sources: [] };
}

function rowFromParts({ modelRunId, sourcePath, sourceIndex, gameId, identityGameId, playerId, lane, marketType, selection, probability, projectedValue, confidence, evCents, oddsAmerican, rationale }) {
  const identityGameKey = identityGameId !== undefined ? identityGameId : gameId;
  return {
    prediction_row_id: stableId([modelRunId, sourcePath, sourceIndex, identityGameKey, playerId, lane, marketType, selection]),
    model_run_id: modelRunId,
    game_id: gameId,
    player_id: playerId,
    lane,
    market_type: marketType,
    selection: selection || 'unknown',
    predicted_probability: probabilityValue(probability),
    projected_value: projectedValue ?? null,
    confidence: confidenceValue(confidence),
    ev_cents: evCents ?? null,
    price_cents: null,
    odds_american: oddsAmerican ?? null,
    rationale_json: compactJson({ source_path: sourcePath, source_index: sourceIndex, ...rationale }),
  };
}

function gameRows(date, records, modelRunId) {
  const rows = [];
  for (const { game, localPath } of records) {
    const projection = game.analysis?.mlbProjection || {};
    const gameId = gameIdFor(game);
    const pick = game.analysis?.participant;
    if (pick?.name) {
      rows.push(rowFromParts({
        modelRunId,
        sourcePath: localPath,
        sourceIndex: 'ml-shape',
        gameId,
        lane: 'ml_shape',
        marketType: 'moneyline',
        selection: pick.name,
        probability: game.analysis?.marketProbability,
        projectedValue: game.analysis?.modelEdge,
        confidence: game.analysis?.confidence,
        oddsAmerican: pick.americanOdds,
        rationale: {
          game_title: game.title,
          model_designation: game.analysis?.modelDesignation,
          rationale: game.analysis?.rationale,
          market_label: pick.americanLabel,
        },
      }));
    }

    const first = projection.firstInning;
    if (first?.pick && String(first.pick).toLowerCase() !== 'pass') {
      const pickUpper = String(first.pick).toUpperCase();
      rows.push(rowFromParts({
        modelRunId,
        sourcePath: localPath,
        sourceIndex: 'first-inning',
        gameId,
        lane: 'first_inning',
        marketType: 'yrfi_nrfi',
        selection: pickUpper,
        probability: pickUpper === 'YRFI' ? first.yesProbabilityPct : first.noProbabilityPct,
        projectedValue: first.projectedRuns,
        confidence: pickUpper === 'YRFI' ? first.yesProbabilityPct : first.noProbabilityPct,
        rationale: {
          game_title: game.title,
          strength: first.strength,
          edge: first.edge,
          away_run_probability_pct: first.awayRunProbabilityPct,
          home_run_probability_pct: first.homeRunProbabilityPct,
          summary: first.summary,
        },
      }));
    }

    const awayF5 = Number(projection.awayFirst5ProjectedRuns);
    const homeF5 = Number(projection.homeFirst5ProjectedRuns);
    if (Number.isFinite(awayF5) && Number.isFinite(homeF5) && Math.abs(awayF5 - homeF5) >= 0.15) {
      const pickIndex = homeF5 >= awayF5 ? 1 : 0;
      const participant =
        (game.moneyline?.participants || []).find((entry) => Number(entry.index) === pickIndex) ||
        (game.participants || [])[pickIndex] ||
        null;
      const selection = participant?.name || (pickIndex === 0 ? game.matchup?.[0]?.name : game.matchup?.[1]?.name);
      rows.push(rowFromParts({
        modelRunId,
        sourcePath: localPath,
        sourceIndex: 'first5-ml',
        gameId,
        lane: 'first5_ml',
        marketType: 'first5_moneyline',
        selection,
        projectedValue: Math.abs(awayF5 - homeF5),
        confidence: null,
        oddsAmerican: participant?.americanOdds,
        rationale: {
          game_title: game.title,
          away_first5_projected_runs: awayF5,
          home_first5_projected_runs: homeF5,
          first5_edge_team: projection.first5EdgeTeam,
        },
      }));
    }

    const first5Total = projection.totals?.first5;
    const first5Lean = String(first5Total?.lean || '').trim();
    if (['Over', 'Under'].includes(first5Lean)) {
      const line = [
        projection.totals?.postedFirst5TotalLine,
        projection.totals?.derivedFirst5TotalLine,
        projection.totals?.runShareFirst5TotalLine,
      ].find((value) => value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value)));
      rows.push(rowFromParts({
        modelRunId,
        sourcePath: localPath,
        sourceIndex: 'first5-total',
        gameId,
        lane: 'first5_total',
        marketType: 'first5_total',
        selection: `${first5Lean}${line ? ` ${line}` : ''}`,
        projectedValue: first5Total?.tailOverlay?.adjustedProjectedRuns ?? projection.totals?.projectedFirst5TotalRuns,
        confidence: first5Total?.probability ?? null,
        rationale: {
          game_title: game.title,
          lean: first5Lean,
          line,
          edge: first5Total?.edge,
          strength: first5Total?.strength,
          summary: first5Total?.summary,
          line_source: projection.totals?.first5TotalLineSource,
        },
      }));
    }

    const fullTotal = projection.totals?.fullGame;
    if (['Over', 'Under'].includes(String(fullTotal?.lean || '').trim())) {
      rows.push(rowFromParts({
        modelRunId,
        sourcePath: localPath,
        sourceIndex: 'full-total',
        gameId,
        lane: 'full_total',
        marketType: 'game_total',
        selection: `${fullTotal.lean}${projection.postedTotal ? ` ${projection.postedTotal}` : ''}`,
        projectedValue: projection.totals?.projectedFullTotalRuns,
        confidence: null,
        rationale: {
          game_title: game.title,
          edge: fullTotal.edge,
          strength: fullTotal.strength,
          summary: fullTotal.summary,
        },
      }));
    }
  }
  return rows;
}

function propRows(date, picks, modelRunId, gameLookup) {
  return picks.map((pick, index) => rowFromParts({
    modelRunId,
    sourcePath: `mlb-props:${date}`,
    sourceIndex: index,
    gameId: canonicalGameIdForPick(pick, gameLookup),
    identityGameId: pick.gamePk ? `mlb-${pick.gamePk}` : pick.gameId || null,
    playerId: playerIdFor(pick.playerId),
    lane: 'player_prop',
    marketType: pick.propType || 'player_prop',
    selection: `${pick.playerName || 'Unknown'} ${pick.marketLabel || pick.propLabel || pick.propType || ''}`.trim(),
    probability: pick.probability,
    projectedValue: pick.expectedValue,
    confidence: pick.confidence,
    oddsAmerican: pick.oddsAmerican ?? null,
    rationale: {
      game_title: pick.gameTitle,
      player_name: pick.playerName,
      team_name: pick.teamName,
      market_label: pick.marketLabel,
      line_threshold: pick.lineThreshold,
      recommendation_tier: pick.recommendationTier,
      shadow_support_tag: pick.shadowSupportTag,
      reason: pick.reason,
      source_name: pick.sourceName,
      source_path: pick.sourcePath,
      market_captured_at: pick.marketCapturedAt,
    },
  }));
}

function homeRunRows(date, picks, modelRunId, gameLookup) {
  return picks.map((pick, index) => rowFromParts({
    modelRunId,
    sourcePath: `mlb-home-runs:${date}`,
    sourceIndex: index,
    gameId: canonicalGameIdForPick(pick, gameLookup),
    identityGameId: pick.gamePk ? `mlb-${pick.gamePk}` : pick.gameId || null,
    playerId: playerIdFor(pick.playerId),
    lane: 'home_run',
    marketType: 'home_run',
    selection: pick.playerName || 'Unknown',
    projectedValue: pick.score ?? pick.baseScore,
    confidence: pick.confidence ?? null,
    rationale: {
      game_title: pick.gameTitle,
      player_name: pick.playerName,
      team_name: pick.teamName,
      score: pick.score,
      score_band: pick.scoreBand,
      burst_tag: pick.burstTag,
      signal_summary: pick.signalSummary,
    },
  }));
}

function modelRunSql(run) {
  return `insert into model_runs (
    model_run_id, sport, model_id, model_version, run_date, run_type,
    status, cartridge_path, manifest_path, input_hash, output_hash, created_at, notes,
    source_table, source_pk, source_detail_json, output_count
  ) values (
    ${sqlString(run.model_run_id)}, 'mlb', ${sqlString(run.model_id)}, ${sqlString(run.model_version)},
    ${sqlString(run.run_date)}, ${sqlString(run.run_type)}, 'backfilled',
    null, null, null, ${sqlString(run.output_hash)}, ${sqlString(timestamp)}, ${sqlString(run.notes)},
    ${sqlString(run.source_table)}, ${sqlString(run.source_pk)}, ${sqlString(run.source_detail_json)},
    ${sqlNumber(run.output_count)}
  ) on conflict(model_run_id) do update set
    status = excluded.status,
    output_hash = excluded.output_hash,
    notes = excluded.notes,
    source_table = excluded.source_table,
    source_pk = excluded.source_pk,
    source_detail_json = excluded.source_detail_json,
    output_count = excluded.output_count;`;
}

function artifactSql(modelRunId, localPath, artifactType) {
  return `insert into model_artifacts (
    artifact_id, model_run_id, artifact_type, local_path, content_hash, created_at
  ) values (
    ${sqlString(`artifact-${sha256(`${modelRunId}|${localPath}`).slice(0, 32)}`)},
    ${sqlString(modelRunId)},
    ${sqlString(artifactType)},
    ${sqlString(localPath)},
    ${sqlString(localExists(localPath) ? fileHash(localPath) : sha256(localPath))},
    ${sqlString(localExists(localPath) ? fileMtime(localPath) : timestamp)}
  ) on conflict(artifact_id) do update set
    artifact_type = excluded.artifact_type,
    content_hash = excluded.content_hash,
    created_at = excluded.created_at;`;
}

function predictionSql(row) {
  return `insert into prediction_rows (
    prediction_row_id, model_run_id, game_id, player_id, lane, market_type, selection,
    predicted_probability, projected_value, confidence, ev_cents, price_cents,
    odds_american, feature_snapshot_id, rationale_json, created_at,
    is_final, finalized_at, final_reason
  ) values (
    ${sqlString(row.prediction_row_id)}, ${sqlString(row.model_run_id)}, ${sqlString(row.game_id)},
    ${sqlString(row.player_id)}, ${sqlString(row.lane)}, ${sqlString(row.market_type)},
    ${sqlString(row.selection)}, ${sqlNumber(row.predicted_probability)}, ${sqlNumber(row.projected_value)},
    ${sqlNumber(row.confidence)}, ${sqlNumber(row.ev_cents)}, ${sqlNumber(row.price_cents)},
    ${sqlNumber(row.odds_american)}, null, ${sqlString(row.rationale_json)}, ${sqlString(timestamp)},
    ${sqlNumber(row.is_final)}, ${sqlString(row.finalized_at)}, ${sqlString(row.final_reason)}
  ) on conflict(prediction_row_id) do update set
    game_id = excluded.game_id,
    player_id = excluded.player_id,
    lane = excluded.lane,
    market_type = excluded.market_type,
    selection = excluded.selection,
    predicted_probability = excluded.predicted_probability,
    projected_value = excluded.projected_value,
    confidence = excluded.confidence,
    ev_cents = excluded.ev_cents,
    price_cents = excluded.price_cents,
    odds_american = excluded.odds_american,
    rationale_json = excluded.rationale_json,
    created_at = excluded.created_at,
    is_final = excluded.is_final,
    finalized_at = excluded.finalized_at,
    final_reason = excluded.final_reason
  where coalesce(prediction_rows.is_final, 0) = 0;`;
}

function dateBackfill(date) {
  const gameArtifacts = readGameArtifacts(date);
  const propArtifacts = readPropArtifacts(date);
  const hrArtifacts = readHomeRunArtifacts(date);
  const gameLookup = gameLookupFromArtifacts(gameArtifacts.games);
  const sourcePaths = [...gameArtifacts.sources, ...propArtifacts.sources, ...hrArtifacts.sources];
  const sourceHash = sha256(sourcePaths.map((source) => `${source}:${localExists(source) ? fileHash(source) : ''}`).join('|'));
  const modelRunId = `cached-mlb-board-${date}`;
  const rows = [
    ...gameRows(date, gameArtifacts.games, modelRunId),
    ...propRows(date, propArtifacts.picks, modelRunId, gameLookup),
    ...homeRunRows(date, hrArtifacts.picks, modelRunId, gameLookup),
  ];
  const run = {
    model_run_id: modelRunId,
    model_id: 'MLB-cached-board',
    model_version: 'public-artifact-backfill-v1',
    run_date: date,
    run_type: 'cached-board-backfill',
    output_hash: sourceHash,
    output_count: rows.length,
    source_table: 'published-data/web-public/data-private-predictions',
    source_pk: date,
    source_detail_json: compactJson({
      game_artifacts: gameArtifacts.sources.length,
      prop_artifact_mode: propArtifacts.mode,
      prop_artifacts: propArtifacts.sources,
      home_run_artifacts: hrArtifacts.sources,
    }),
    notes: compactJson({
      source: 'cached MLB public/private prediction artifacts',
      warning: 'Backfilled from cached artifacts, not from the original model execution process.',
    }),
  };
  return { date, run, rows, sources: sourcePaths, gameArtifacts, propArtifacts, hrArtifacts };
}

const args = parseArgs(process.argv.slice(2));
if (!args.dryRun) ensurePredictionLifecycleColumns(args.db);
const dates = datesBetween(args.start, args.end);
const before = Number(queryScalar(args.db, 'select count(*) from prediction_rows;'));
const reports = dates.map(dateBackfill);
const allRows = attachFinalState(args.db, reports.flatMap((report) => report.rows));

if (!args.dryRun) {
  const statements = ['begin;'];
  statements.push(finalizeStartedRowsSql(args.start, args.end));
  for (const report of reports) {
    statements.push(modelRunSql(report.run));
    for (const source of report.sources) {
      statements.push(artifactSql(report.run.model_run_id, source, source.includes('/games/') ? 'cached-game-artifact' : 'cached-board-artifact'));
    }
    for (const row of allRows.filter((candidate) => candidate.model_run_id === report.run.model_run_id)) {
      statements.push(predictionSql(row));
    }
  }
  statements.push(`insert into migration_runs (
    migration_run_id, sport, phase, script_path, source_ref, target_ref, status,
    dry_run, row_count_source, row_count_inserted, row_count_updated, row_count_skipped,
    checksum, report_path, started_at, finished_at, notes
  ) values (
    ${sqlString(`cached-mlb-prediction-backfill-${args.start}-${args.end}-${timestamp.replaceAll(/[:.]/g, '-')}`)},
    'mlb',
    'cached-prediction-backfill',
    'data-migration/scripts/backfill_mlb_cached_prediction_rows.mjs',
    'published-data,web/public,data-private/predictions',
    'sql-mlb.db:model_runs,model_artifacts,prediction_rows',
    'backfilled',
    0,
    ${sqlNumber(reports.reduce((sum, report) => sum + report.sources.length, 0))},
    ${sqlNumber(allRows.length)},
    null,
    0,
    ${sqlString(sha256(JSON.stringify(allRows.map((row) => row.prediction_row_id))))},
    ${sqlString(path.relative(repoRoot, args.report))},
    ${sqlString(timestamp)},
    ${sqlString(timestamp)},
    ${sqlString('Backfilled MLB prediction rows from cached public/private slate artifacts.')}
  );`);
  statements.push('commit;');
  runSqlite(args.db, statements.join('\n'));
}

const after = args.dryRun ? before : Number(queryScalar(args.db, 'select count(*) from prediction_rows;'));
const laneCounts = allRows.reduce((counts, row) => {
  counts[row.lane] = (counts[row.lane] || 0) + 1;
  return counts;
}, {});
const report = {
  generated_at: timestamp,
  script: 'data-migration/scripts/backfill_mlb_cached_prediction_rows.mjs',
  db: path.relative(repoRoot, args.db),
  start: args.start,
  end: args.end,
  dry_run: args.dryRun,
  dates: reports.map((entry) => ({
    date: entry.date,
    rows: entry.rows.length,
    lane_counts: entry.rows.reduce((counts, row) => {
      counts[row.lane] = (counts[row.lane] || 0) + 1;
      return counts;
    }, {}),
    game_artifacts: entry.gameArtifacts.sources.length,
    prop_rows: entry.propArtifacts.picks.length,
    prop_sources: entry.propArtifacts.sources,
    home_run_rows: entry.hrArtifacts.picks.length,
    home_run_sources: entry.hrArtifacts.sources,
  })),
  planned_prediction_rows: allRows.length,
  lane_counts: laneCounts,
  final_prediction_rows: allRows.filter((row) => row.is_final).length,
  before_prediction_rows: before,
  after_prediction_rows: after,
  sample_rows: allRows.slice(0, 12).map((row) => ({
    prediction_row_id: row.prediction_row_id,
    lane: row.lane,
    market_type: row.market_type,
    selection: row.selection,
    confidence: row.confidence,
  })),
  ok: true,
};
mkdirSync(path.dirname(args.report), { recursive: true });
writeFileSync(args.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

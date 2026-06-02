import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export function sha256Text(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

export function readJsonArtifact(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function dateFromPath(localPath) {
  const match = localPath.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  return match ? match[1] : null;
}

export function inferArtifactType(localPath, payload = null) {
  const basename = path.basename(localPath, '.json');
  if (basename === 'run') return 'run-manifest';
  if (basename === 'snapshot') return 'prediction-snapshot';
  if (basename.includes('backtest')) return 'backtest';
  if (basename.includes('calibration')) return 'calibration';
  if (basename.includes('grade')) return 'settlement-grades';
  if (basename.includes('health')) return 'health';
  if (basename.includes('publish')) return 'publish-manifest';
  if (payload?.picks || payload?.rows || payload?.matches || payload?.games) return 'legacy-prediction-artifact';
  return basename;
}

export function detectShape(payload, localPath) {
  if (payload?.runId && payload?.sport && payload?.modelId) return 'model-run-manifest';
  if (payload?.snapshotHash || payload?.artifactSummary || payload?.games || payload?.matches) return 'model-snapshot-or-prediction';
  if (payload?.picks || payload?.rows) return 'legacy-prediction-artifact';
  if (payload?.grades || payload?.settlement || payload?.settlementRows) return 'settlement-artifact';
  return inferArtifactType(localPath, payload);
}

export function modelVersionFromPayload(payload) {
  const parts = [
    payload?.warehouseVersion,
    payload?.featureVersion,
    payload?.modelId,
    payload?.reliefAddendum,
    payload?.evaluatorVersion,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('/') : null;
}

export function modelRunFromManifest(payload, localPath) {
  const runDate = payload.slateDate || payload.date || dateFromPath(localPath);
  const createdAt = payload.createdAt || payload.snapshottedAt || payload.generatedAt || statSync(localPath).mtime.toISOString();
  return {
    model_run_id: payload.runId || `${payload.sport || 'unknown'}-${payload.modelId || 'unknown'}-${runDate || 'undated'}-${sha256Text(localPath).slice(0, 12)}`,
    sport: payload.sport,
    model_id: payload.modelId || payload.model || 'unknown',
    model_version: modelVersionFromPayload(payload),
    run_date: runDate || 'undated',
    run_type: payload.mode || 'pregame',
    status: payload.status || 'captured',
    cartridge_path: payload.modelCartridge?.entrypoint || payload.modelManifest?.entrypoint || null,
    manifest_path: payload.modelManifest?.path || payload.modelCartridge?.manifestPath || null,
    input_hash: payload.inputHash || payload.trainingRows?.hash || null,
    output_hash: payload.outputHash || payload.snapshotHash || null,
    created_at: createdAt,
    notes: JSON.stringify({
      source: 'model-run-manifest',
      local_path: localPath,
      artifact_summary: payload.artifactSummary || null,
      git: payload.git || null,
    }),
  };
}

export function modelRunFromPredictionArtifact(payload, localPath, sport, artifactKind) {
  const runDate = payload.date || payload.startDate || payload.slateDate || dateFromPath(localPath) || 'undated';
  const modelId = payload.modelId || payload.modelName || payload.model || artifactKind;
  const createdAt = payload.generatedAt || payload.createdAt || statSync(localPath).mtime.toISOString();
  return {
    model_run_id: `legacy-${sport}-${artifactKind}-${runDate}-${sha256Text(localPath).slice(0, 12)}`,
    sport,
    model_id: modelId,
    model_version: payload.modelDesignation || payload.modelVersion || null,
    run_date: runDate,
    run_type: 'legacy_prediction_artifact',
    status: 'captured',
    cartridge_path: null,
    manifest_path: null,
    input_hash: null,
    output_hash: payload.snapshotHash || sha256File(localPath),
    created_at: createdAt,
    notes: JSON.stringify({
      source: 'legacy-prediction-artifact',
      artifact_kind: artifactKind,
      local_path: localPath,
      shape: detectShape(payload, localPath),
    }),
  };
}

export function artifactRow(modelRunId, localPath, payload = null, role = null) {
  const stats = statSync(localPath);
  return {
    artifact_id: `artifact-${sha256Text(`${modelRunId}|${localPath}`).slice(0, 32)}`,
    model_run_id: modelRunId,
    artifact_type: role || inferArtifactType(localPath, payload),
    local_path: localPath,
    content_hash: sha256File(localPath),
    created_at: stats.mtime.toISOString(),
  };
}

function probabilityValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric > 1) return numeric / 100;
  return numeric;
}

function confidenceValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function evCentsValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function priceCentsFromProbability(value) {
  const probability = probabilityValue(value);
  return probability === null ? null : Number((probability * 100).toFixed(3));
}

function stableRowId(parts) {
  return `pred-${sha256Text(parts.filter((part) => part !== null && part !== undefined).join('|')).slice(0, 32)}`;
}

function slugId(value) {
  if (!value) return null;
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mlbPredictionRows(payload, localPath, modelRunId) {
  const rows = [];
  const picks = Array.isArray(payload.picks) ? payload.picks : [];
  const markets = Array.isArray(payload.markets) ? payload.markets : [];

  for (const [index, pick] of picks.entries()) {
    const kind = path.basename(path.dirname(localPath));
    const isHomeRun = kind === 'mlb-home-runs';
    const isProp = kind === 'mlb-player-props' || kind === 'mlb-player-props-legacy';
    const isSide = kind === 'mlb-sides';

    if (!isHomeRun && !isProp && !isSide) continue;

    const gameId = pick.gamePk ? `mlb-${pick.gamePk}` : pick.gameId || null;
    const playerId = pick.playerId ? `mlb-player-${pick.playerId}` : null;
    const lane = isHomeRun ? 'home_run' : isProp ? 'player_prop' : 'ml';
    const marketType = isHomeRun ? 'home_run' : isProp ? pick.propType || 'player_prop' : 'moneyline';
    const selection = isHomeRun ? pick.playerName : isProp ? `${pick.playerName} ${pick.marketLabel || pick.propLabel || pick.propType}` : pick.predictedTeam;

    rows.push({
      prediction_row_id: stableRowId([modelRunId, localPath, index, lane, marketType, selection]),
      model_run_id: modelRunId,
      game_id: gameId,
      player_id: playerId,
      lane,
      market_type: marketType,
      selection: selection || 'unknown',
      predicted_probability: probabilityValue(pick.probability ?? pick.marketProbability),
      projected_value: pick.expectedValue ?? pick.baseScore ?? pick.modelEdge ?? null,
      confidence: confidenceValue(pick.confidence),
      ev_cents: evCentsValue(pick.netEvPer100 ?? pick.evCents ?? pick.modelEdge),
      price_cents: priceCentsFromProbability(pick.marketProbability),
      odds_american: pick.marketAmericanOdds ?? pick.oddsAmerican ?? null,
      rationale_json: JSON.stringify({
        source_path: localPath,
        artifact_kind: kind,
        index,
        raw_id: pick.id || null,
        game_title: pick.gameTitle || null,
        reason: pick.reason || pick.rationale || null,
        grade: pick.recommendationTier || pick.recommendedAction || pick.tier || null,
        raw: pick,
      }),
    });
  }

  for (const [index, market] of markets.entries()) {
    const selection = market.selection || market.pick || market.side || market.label || market.market || 'unknown';
    rows.push({
      prediction_row_id: stableRowId([modelRunId, localPath, index, 'market_fitness', selection]),
      model_run_id: modelRunId,
      game_id: market.gamePk ? `mlb-${market.gamePk}` : market.gameId || null,
      player_id: market.playerId ? `mlb-player-${market.playerId}` : null,
      lane: 'market_fitness',
      market_type: market.marketType || market.type || 'market_fitness',
      selection,
      predicted_probability: probabilityValue(market.modelProbability ?? market.probability),
      projected_value: market.projectedValue ?? market.projection ?? null,
      confidence: confidenceValue(market.confidence),
      ev_cents: evCentsValue(market.netEvPer100 ?? market.evCents),
      price_cents: priceCentsFromProbability(market.marketProbability ?? market.impliedProbability),
      odds_american: market.oddsAmerican ?? market.marketAmericanOdds ?? null,
      rationale_json: JSON.stringify({ source_path: localPath, index, raw: market }),
    });
  }

  return rows;
}

function tennisPredictionRows(payload, localPath, modelRunId) {
  const rows = [];
  const picks = Array.isArray(payload.picks) ? payload.picks : [];
  const ensembleRows = Array.isArray(payload.rows) ? payload.rows : [];

  for (const [index, pick] of picks.entries()) {
    rows.push({
      prediction_row_id: stableRowId([modelRunId, localPath, index, 'ml', pick.match, pick.pick]),
      model_run_id: modelRunId,
      match_id: pick.matchId || pick.id || `legacy-tennis-match-${slugId(pick.match) || stableRowId([localPath, index])}`,
      lane: 'ml',
      market_type: 'match_winner',
      selection: pick.pick || pick.selection || 'unknown',
      predicted_probability: probabilityValue(pick.modelProbability ?? pick.probability),
      projected_value: pick.modelEdge ?? null,
      confidence: confidenceValue(pick.confidence),
      ev_cents: evCentsValue(pick.netEvPer100),
      price_cents: priceCentsFromProbability(pick.marketProbability),
      odds_american: pick.marketAmericanOdds ?? pick.fairOdds ?? null,
      rationale_json: JSON.stringify({
        source_path: localPath,
        index,
        match: pick.match || null,
        tier: pick.tier || null,
        rationale: pick.rationale || null,
        raw: pick,
      }),
    });
  }

  for (const [index, row] of ensembleRows.entries()) {
    if (row.totalGames || row.gameHandicap || row.firstSet) {
      if (row.totalGames) {
        rows.push({
          prediction_row_id: stableRowId([modelRunId, localPath, index, 'match_total_games', row.matchId, row.totalGames.lean]),
          model_run_id: modelRunId,
          match_id: row.matchId || `legacy-tennis-match-${slugId(row.match) || stableRowId([localPath, index])}`,
          lane: 'match_ou',
          market_type: 'match_total_games',
          selection: row.totalGames.lean || 'unknown',
          predicted_probability: null,
          projected_value: row.expectedMatchGames ?? null,
          confidence: confidenceValue(row.totalGames.confidence),
          ev_cents: null,
          price_cents: null,
          odds_american: row.totalGames.lean === 'Over' ? row.totalGames.overOdds : row.totalGames.underOdds,
          rationale_json: JSON.stringify({ source_path: localPath, index, match: row.match, line: row.totalGames.postedLine, raw: row.totalGames }),
        });
      }
      if (row.gameHandicap) {
        rows.push({
          prediction_row_id: stableRowId([modelRunId, localPath, index, 'game_spread', row.matchId, row.gameHandicap.selection]),
          model_run_id: modelRunId,
          match_id: row.matchId || `legacy-tennis-match-${slugId(row.match) || stableRowId([localPath, index])}`,
          lane: 'spread',
          market_type: 'game_spread',
          selection: row.gameHandicap.selection || 'unknown',
          predicted_probability: null,
          projected_value: row.gameHandicap.projectedMarginGames ?? null,
          confidence: confidenceValue(row.gameHandicap.confidence),
          ev_cents: null,
          price_cents: null,
          odds_american: row.gameHandicap.odds ?? null,
          rationale_json: JSON.stringify({ source_path: localPath, index, match: row.match, line: row.gameHandicap.postedSpread, raw: row.gameHandicap }),
        });
      }
      if (row.firstSet) {
        rows.push({
          prediction_row_id: stableRowId([modelRunId, localPath, index, 'first_set_ou', row.matchId, row.firstSet.lean]),
          model_run_id: modelRunId,
          match_id: row.matchId || `legacy-tennis-match-${slugId(row.match) || stableRowId([localPath, index])}`,
          lane: 'first_set_ou',
          market_type: 'first_set_total_games',
          selection: row.firstSet.lean || 'unknown',
          predicted_probability: null,
          projected_value: row.firstSet.expectedGames ?? row.expectedFirstSetGames ?? null,
          confidence: confidenceValue(row.firstSet.confidence),
          ev_cents: null,
          price_cents: null,
          odds_american: null,
          rationale_json: JSON.stringify({ source_path: localPath, index, match: row.match, raw: row.firstSet }),
        });
      }
      continue;
    }

    rows.push({
      prediction_row_id: stableRowId([modelRunId, localPath, index, 'ml', row.matchId, row.selection]),
      model_run_id: modelRunId,
      match_id: row.matchId || `legacy-tennis-match-${slugId(row.match) || stableRowId([localPath, index])}`,
      lane: 'ml',
      market_type: 'match_winner',
      selection: row.selection || 'unknown',
      predicted_probability: probabilityValue(row.modelProbability),
      projected_value: row.marketDisagreementPct ?? null,
      confidence: confidenceValue(row.modelProbability),
      ev_cents: evCentsValue(row.netEvPer100),
      price_cents: priceCentsFromProbability(row.marketProbability),
      odds_american: row.fairOdds ?? null,
      rationale_json: JSON.stringify({
        source_path: localPath,
        index,
        match: row.match || null,
        grade: row.grade || null,
        risk_gate: row.riskGate || null,
        raw: row,
      }),
    });
  }

  return rows;
}

export function predictionRowsFromArtifact(payload, localPath, modelRunId, sport) {
  if (sport === 'mlb') return mlbPredictionRows(payload, localPath, modelRunId);
  if (sport === 'tennis') return tennisPredictionRows(payload, localPath, modelRunId);
  return [];
}

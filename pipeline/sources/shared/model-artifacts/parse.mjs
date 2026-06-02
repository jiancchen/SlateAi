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

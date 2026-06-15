import crypto from 'node:crypto'

import { sqlQuote, sqliteExec } from './mlb-model-utils.mjs'

const cleanIdPart = (value = '') =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const toCount = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
}

const cacheValidUntil = (finishedAt, cacheTtlHours) => {
  const ttl = Number(cacheTtlHours)
  const timestamp = Date.parse(finishedAt)
  if (!Number.isFinite(ttl) || !Number.isFinite(timestamp)) return null
  return new Date(timestamp + ttl * 60 * 60 * 1000).toISOString()
}

const detailsText = (notes) => {
  if (notes === null || notes === undefined) return '{}'
  return typeof notes === 'string' ? notes : JSON.stringify(notes)
}

export const writeMlbSourceStatus = ({
  dbPath,
  sourceName,
  sourceFamily = null,
  sourceDate,
  runReason,
  requestedUrl = null,
  cacheStatus = 'generated',
  cacheTtlHours = null,
  previousSuccessAt = null,
  status = 'success',
  completenessStatus = 'complete',
  expectedItemCount = null,
  actualItemCount = null,
  missingItemCount = null,
  unresolvedCount = 0,
  sourceSnapshotId = null,
  startedAt = new Date().toISOString(),
  finishedAt = startedAt,
  errorCode = null,
  errorMessage = null,
  notes = {}
} = {}) => {
  if (!dbPath) throw new Error('writeMlbSourceStatus requires dbPath')
  if (!sourceName) throw new Error('writeMlbSourceStatus requires sourceName')
  if (!sourceDate) throw new Error('writeMlbSourceStatus requires sourceDate')

  const expected = toCount(expectedItemCount)
  const actual = toCount(actualItemCount)
  const missing = toCount(
    missingItemCount,
    expected !== null && actual !== null ? Math.max(expected - actual, 0) : null
  )
  const unresolved = toCount(unresolvedCount, 0)
  const noteText = detailsText(notes)
  const hash = crypto
    .createHash('sha256')
    .update(`${sourceName}|${sourceDate}|${finishedAt}|${noteText}`)
    .digest('hex')
    .slice(0, 12)
  const runId = sourceSnapshotId || [
    'mlb',
    cleanIdPart(sourceName),
    cleanIdPart(sourceDate),
    cleanIdPart(finishedAt).slice(0, 20),
    hash
  ].filter(Boolean).join('-')
  const statusId = `mlb-${sourceName}-${sourceDate}`
  const successAt = status === 'success' || status === 'partial' ? finishedAt : previousSuccessAt

  sqliteExec(`
insert or replace into source_fetch_runs (
  source_fetch_run_id, sport, source_name, source_family, source_date, run_reason, requested_url,
  cache_status, cache_ttl_hours, previous_success_at, status, completeness_status, expected_item_count,
  actual_item_count, missing_item_count, source_snapshot_id, started_at, finished_at, error_code, error_message, details_json
) values (
  ${sqlQuote(runId)}, 'mlb', ${sqlQuote(sourceName)}, ${sqlQuote(sourceFamily)}, ${sqlQuote(sourceDate)},
  ${sqlQuote(runReason || `daily-${sourceName}-build`)}, ${sqlQuote(requestedUrl)}, ${sqlQuote(cacheStatus)},
  ${sqlQuote(cacheTtlHours)}, ${sqlQuote(previousSuccessAt)}, ${sqlQuote(status)}, ${sqlQuote(completenessStatus)},
  ${sqlQuote(expected)}, ${sqlQuote(actual)}, ${sqlQuote(missing)}, ${sqlQuote(sourceSnapshotId)},
  ${sqlQuote(startedAt)}, ${sqlQuote(finishedAt)}, ${sqlQuote(errorCode)}, ${sqlQuote(errorMessage)}, ${sqlQuote(noteText)}
);
insert or replace into source_fetch_status (
  source_fetch_status_id, sport, source_name, source_family, source_date, last_fetch_run_id,
  last_attempt_at, last_success_at, last_status, last_completeness_status, cache_valid_until,
  expected_item_count, actual_item_count, missing_item_count, unresolved_count, updated_at, notes
) values (
  ${sqlQuote(statusId)}, 'mlb', ${sqlQuote(sourceName)}, ${sqlQuote(sourceFamily)}, ${sqlQuote(sourceDate)},
  ${sqlQuote(runId)}, ${sqlQuote(startedAt)}, ${sqlQuote(successAt)}, ${sqlQuote(status)}, ${sqlQuote(completenessStatus)},
  ${sqlQuote(cacheValidUntil(finishedAt, cacheTtlHours))}, ${sqlQuote(expected)}, ${sqlQuote(actual)},
  ${sqlQuote(missing)}, ${sqlQuote(unresolved)}, ${sqlQuote(finishedAt)}, ${sqlQuote(noteText)}
);
`, dbPath)

  return { runId, statusId }
}

#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRelativeTargetForSport } from './sport_db_schema.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const timestamp = new Date().toISOString();

function parseArgs(argv) {
  const args = {
    settlementReport: path.join(repoRoot, 'data-migration/reports/phase4_mlb_ml_settlement_2026-06-02.json'),
    report: path.join(repoRoot, 'data-migration/reports/phase4_validate_mlb_ml_settlement_2026-06-02.json'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--settlement-report') args.settlementReport = path.resolve(argv[++index]);
    else if (arg === '--report') args.report = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function runSqlite(dbPath, sql) {
  return execFileSync('sqlite3', [dbPath], {
    cwd: repoRoot,
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function queryScalar(dbPath, sql) {
  return runSqlite(dbPath, sql).trim();
}

function appendMigrationEvent(report, options) {
  const eventPath = path.join(repoRoot, 'data-migration/migration_events.jsonl');
  const event = {
    event_id: `phase4-mlb-ml-settlement-validation-${timestamp.replaceAll(/[:.]/g, '-')}`,
    timestamp,
    phase: '4',
    area: 'mlb_ml_settlement_validation',
    source: path.relative(repoRoot, options.settlementReport),
    target: 'data-private/warehouse/sports/mlb/sql-mlb.db:settlement_rows',
    parser_module: 'none',
    migration_script: 'data-migration/scripts/validate_mlb_ml_settlement.mjs',
    validation: report.ok
      ? `${report.actual_settlement_rows}/${report.expected_settlement_rows} MLB ML settlements validated`
      : `MLB ML settlement validation failed: ${JSON.stringify(report.mismatches)}`,
    status_from: 'backfilled',
    status_to: report.ok ? 'validated' : 'blocked',
    report_path: path.relative(repoRoot, options.report),
    checksum: report.source_checksum,
    notes: `${report.unresolved_rows} MLB ML rows remain unresolved by design.`,
  };
  writeFileSync(eventPath, `${JSON.stringify(event)}\n`, { flag: 'a' });
}

const options = parseArgs(process.argv.slice(2));
const target = repoRelativeTargetForSport('mlb', repoRoot);
const settlementReport = JSON.parse(readFileSync(options.settlementReport, 'utf8'));
mkdirSync(path.dirname(options.report), { recursive: true });

const actualSettlementRows = Number(queryScalar(target.absoluteDbPath, 'select count(*) from settlement_rows;'));
const linkedMlRows = Number(
  queryScalar(
    target.absoluteDbPath,
    `select count(*)
     from settlement_rows sr
     join prediction_rows pr on pr.prediction_row_id = sr.prediction_row_id
     where pr.lane = 'ml';`,
  ),
);
const orphanRows = Number(
  queryScalar(
    target.absoluteDbPath,
    `select count(*)
     from settlement_rows sr
     left join prediction_rows pr on pr.prediction_row_id = sr.prediction_row_id
     where pr.prediction_row_id is null;`,
  ),
);

const mismatches = [];
if (actualSettlementRows !== settlementReport.settled_rows) {
  mismatches.push({ table: 'settlement_rows', expected: settlementReport.settled_rows, actual: actualSettlementRows });
}
if (linkedMlRows !== actualSettlementRows) {
  mismatches.push({ table: 'settlement_rows.ml_links', expected: actualSettlementRows, actual: linkedMlRows });
}
if (orphanRows !== 0) {
  mismatches.push({ table: 'settlement_rows.orphans', expected: 0, actual: orphanRows });
}

const report = {
  generated_at: timestamp,
  phase: '4',
  script: 'data-migration/scripts/validate_mlb_ml_settlement.mjs',
  sport: 'mlb',
  expected_settlement_rows: settlementReport.settled_rows,
  actual_settlement_rows: actualSettlementRows,
  linked_ml_rows: linkedMlRows,
  orphan_rows: orphanRows,
  unresolved_rows: settlementReport.unresolved_rows,
  source_checksum: settlementReport.checksum,
  mismatches,
  ok: mismatches.length === 0,
};

appendMigrationEvent(report, options);
writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${options.report}`);
console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exit(1);

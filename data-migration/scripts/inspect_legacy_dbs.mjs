#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');

const defaultDbPath = path.join(repoRoot, 'data-private/warehouse/sports.db');
const defaultOutputPath = path.join(
  repoRoot,
  'data-migration/reports/legacy_db_inventory_2026-06-01.json',
);

const dbPath = path.resolve(process.argv[2] || defaultDbPath);
const outputPath = path.resolve(process.argv[3] || defaultOutputPath);

function runSqlite(args) {
  return execFileSync('sqlite3', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function queryJson(sql) {
  const output = runSqlite(['-json', dbPath, sql]);
  if (!output) return [];
  return JSON.parse(output);
}

function queryScalar(sql) {
  return runSqlite([dbPath, sql]);
}

function sportGroupForTable(name) {
  if (name.startsWith('mlb_')) return 'mlb';
  if (name.startsWith('tennis_')) return 'tennis';
  if (
    [
      'park_factor_snapshots',
      'statcast_hr_leaderboard_snapshots',
      'weather_observations',
    ].includes(name)
  ) {
    return 'mlb_adjacent';
  }
  if (name === 'source_snapshots') return 'shared_source';
  return 'shared_or_unknown';
}

function countRowsSafely(name, type) {
  if (type !== 'table') return null;
  const escaped = name.replaceAll('"', '""');
  return Number(queryScalar(`select count(*) from "${escaped}";`));
}

function tableHash(rows) {
  const hash = createHash('sha256');
  for (const row of rows) {
    hash.update(`${row.name}|${row.type}|${row.sport_group}|${row.row_count ?? ''}\n`);
  }
  return hash.digest('hex');
}

if (!existsSync(dbPath)) {
  throw new Error(`Legacy DB not found: ${dbPath}`);
}

mkdirSync(path.dirname(outputPath), { recursive: true });

const objects = queryJson(`
  select name, type
  from sqlite_master
  where type in ('table', 'view')
    and name not like 'sqlite_%'
  order by name;
`);

const tables = objects.map((object) => {
  const sportGroup = sportGroupForTable(object.name);
  const rowCount = countRowsSafely(object.name, object.type);
  return {
    name: object.name,
    type: object.type,
    sport_group: sportGroup,
    row_count: rowCount,
  };
});

const summaryByGroup = {};
for (const table of tables) {
  if (!summaryByGroup[table.sport_group]) {
    summaryByGroup[table.sport_group] = {
      objects: 0,
      tables: 0,
      views: 0,
      rows: 0,
    };
  }
  const summary = summaryByGroup[table.sport_group];
  summary.objects += 1;
  if (table.type === 'table') summary.tables += 1;
  if (table.type === 'view') summary.views += 1;
  if (typeof table.row_count === 'number') summary.rows += table.row_count;
}

const report = {
  generated_at: new Date().toISOString(),
  repo_root: repoRoot,
  db_path: dbPath,
  db_size_bytes: statSync(dbPath).size,
  object_count: tables.length,
  table_count: tables.filter((table) => table.type === 'table').length,
  view_count: tables.filter((table) => table.type === 'view').length,
  table_inventory_hash: tableHash(tables),
  summary_by_group: summaryByGroup,
  tables,
};

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Wrote ${outputPath}`);
console.log(
  JSON.stringify(
    {
      db_size_bytes: report.db_size_bytes,
      object_count: report.object_count,
      table_count: report.table_count,
      view_count: report.view_count,
      table_inventory_hash: report.table_inventory_hash.slice(0, 12),
      summary_by_group: report.summary_by_group,
    },
    null,
    2,
  ),
);


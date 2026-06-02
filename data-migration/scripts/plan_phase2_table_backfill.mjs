#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const timestamp = new Date().toISOString();

function parseArgs(argv) {
  const args = {
    sourceDb: path.join(repoRoot, 'data-private/warehouse/sports.db'),
    report: path.join(repoRoot, 'data-migration/reports/phase2_legacy_table_mapping_2026-06-02.json'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--source-db') args.sourceDb = path.resolve(argv[++index]);
    else if (arg === '--report') args.report = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function runSqlite(dbPath, args, input) {
  return execFileSync('sqlite3', args.concat(dbPath), {
    cwd: repoRoot,
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function queryJson(dbPath, sql) {
  const output = runSqlite(dbPath, ['-json'], sql);
  if (!output) return [];
  return JSON.parse(output);
}

function queryScalar(dbPath, sql) {
  return runSqlite(dbPath, [], sql);
}

function sqlIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function sportForTable(name) {
  if (name.startsWith('mlb_')) return 'mlb';
  if (name.startsWith('tennis_')) return 'tennis';
  if (['weather_observations', 'park_factor_snapshots', 'statcast_hr_leaderboard_snapshots'].includes(name)) {
    return 'mlb';
  }
  if (name === 'source_snapshots') return 'shared';
  return 'unknown';
}

function targetGroupForTable(name) {
  const exact = {
    mlb_games: 'mlb.core.games',
    mlb_starting_pitchers: 'mlb.core.starting_pitchers',
    mlb_pitch_events: 'mlb.events.pitch_events',
    mlb_plate_appearances: 'mlb.events.plate_appearances',
    mlb_game_outcomes: 'mlb.results.game_outcomes',
    mlb_game_team_stats: 'mlb.events.game_team_stats_pending_schema',
    mlb_player_game_batting: 'mlb.events.player_game_batting_pending_schema',
    mlb_pitcher_appearances: 'mlb.events.pitcher_appearances_pending_schema',
    tennis_players: 'tennis.core.players',
    tennis_matches: 'tennis.core.matches',
    tennis_match_sources: 'tennis.source.match_sources',
    tennis_rankings: 'tennis.form.rankings',
    tennis_recent_matches: 'tennis.form.recent_matches',
    tennis_recent_form_metrics: 'tennis.form.player_form_snapshots',
    tennis_player_match_context: 'tennis.form.player_match_context_pending_schema',
    tennis_h2h_matches: 'tennis.context.h2h_matches',
    tennis_h2h_snapshots: 'tennis.context.h2h_snapshots_pending_schema',
    tennis_match_results: 'tennis.results.match_results_pending_schema',
    tennis_predictions: 'tennis.predictions.prediction_rows',
    tennis_prediction_grades: 'tennis.predictions.settlement_rows',
    tennis_model_runs: 'tennis.model.model_runs',
  };
  if (exact[name]) return exact[name];
  if (name.includes('odds') || name.includes('market')) return `${sportForTable(name)}.markets.market_snapshots`;
  if (name.includes('prediction')) return `${sportForTable(name)}.predictions.prediction_rows`;
  if (name.includes('backtest') || name.includes('settlement') || name.includes('grade')) return `${sportForTable(name)}.settlements.settlement_rows`;
  if (name.includes('flashscore') || name.includes('sofascore') || name.includes('livesport')) return 'tennis.stats_or_replay';
  if (name.includes('weather') || name.includes('sun_visibility') || name.includes('park_factor')) return 'mlb.environment.game_environment_snapshots';
  if (name.includes('team_')) return 'mlb.features.team_feature_snapshots';
  if (name.includes('hitter') || name.includes('pitcher') || name.includes('player') || name.includes('starter') || name.includes('reliever')) {
    return 'mlb.features.player_feature_snapshots';
  }
  if (name.startsWith('tennis_model_run_')) return 'tennis.model.model_artifacts_or_metrics';
  return `${sportForTable(name)}.unmapped`;
}

function migrationComplexity(name, columns) {
  const target = targetGroupForTable(name);
  if (target.includes('pending_schema') || target.endsWith('.unmapped')) return 'blocked_or_needs_schema';
  if (target.includes('feature_snapshots') || target.includes('stats_or_replay')) return 'parse_or_json_pack';
  if (columns.some((column) => column.name.endsWith('_json') || column.type?.toLowerCase().includes('json'))) return 'json_preserving';
  return 'direct_or_light_transform';
}

function tableHash(tables) {
  const hash = createHash('sha256');
  for (const table of tables) {
    hash.update(`${table.name}|${table.row_count}|${table.columns.map((column) => `${column.name}:${column.type}`).join(',')}\n`);
  }
  return hash.digest('hex');
}

const options = parseArgs(process.argv.slice(2));
mkdirSync(path.dirname(options.report), { recursive: true });

const tableNames = queryJson(
  options.sourceDb,
  `select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name;`,
).map((row) => row.name);

const tables = tableNames.map((name) => {
  const columns = queryJson(options.sourceDb, `pragma table_info(${sqlIdentifier(name)});`).map((column) => ({
    cid: column.cid,
    name: column.name,
    type: column.type,
    notnull: column.notnull,
    pk: column.pk,
  }));
  const rowCount = Number(queryScalar(options.sourceDb, `select count(*) from ${sqlIdentifier(name)};`));
  const sport = sportForTable(name);
  const targetGroup = targetGroupForTable(name);
  return {
    name,
    sport,
    row_count: rowCount,
    column_count: columns.length,
    columns,
    target_group: targetGroup,
    complexity: migrationComplexity(name, columns),
  };
});

const summary = {};
for (const table of tables) {
  const key = `${table.sport}.${table.complexity}`;
  summary[key] ??= { tables: 0, rows: 0 };
  summary[key].tables += 1;
  summary[key].rows += table.row_count;
}

const report = {
  generated_at: timestamp,
  phase: '2',
  script: 'data-migration/scripts/plan_phase2_table_backfill.mjs',
  source_db: path.relative(repoRoot, options.sourceDb),
  source_db_size_bytes: statSync(options.sourceDb).size,
  table_count: tables.length,
  table_mapping_hash: tableHash(tables),
  summary,
  tables,
};

writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${options.report}`);
console.log(
  JSON.stringify(
    {
      table_count: report.table_count,
      table_mapping_hash: report.table_mapping_hash.slice(0, 12),
      summary,
    },
    null,
    2,
  ),
);


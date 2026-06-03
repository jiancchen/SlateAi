#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');

const legacyDbPath = path.join(repoRoot, 'data-private/warehouse/sports.db');
const typedDbPath = path.join(repoRoot, 'data-private/warehouse/sports/mlb/sql-mlb.db');
const reportDate = process.argv.includes('--report-date')
  ? process.argv[process.argv.indexOf('--report-date') + 1]
  : '2026-06-03';
const jsonReportPath = path.join(
  repoRoot,
  `data-migration/reports/mlb_legacy_to_typed_gap_audit_${reportDate}.json`,
);
const markdownReportPath = path.join(
  repoRoot,
  `data-migration/reports/mlb_legacy_to_typed_gap_audit_${reportDate}.md`,
);

const DATE_COLUMNS = [
  'game_date',
  'snapshot_date',
  'prediction_date',
  'market_date',
  'as_of_date',
  'source_date',
  'slate_date',
  'run_date',
  'captured_at',
  'commence_time',
  'created_at',
  'indexed_at',
  'locked_at',
  'migrated_at',
  'date',
];

const SOURCE_SPECS = {
  mlb_games: {
    family: 'core_game_feed',
    targets: ['games'],
    migration: 'data-migration/scripts/ingest_mlb_schedule_game_feed_raw_to_typed.py',
    notes: 'Canonical game row. Target populated from raw ingest, not legacy_table_rows.',
  },
  mlb_starting_pitchers: {
    family: 'core_game_feed',
    targets: ['starting_pitchers'],
    migration: 'data-migration/scripts/ingest_mlb_schedule_game_feed_raw_to_typed.py',
    notes: 'Probable/actual starter state. Target populated from raw ingest and lineups.',
  },
  mlb_plate_appearances: {
    family: 'core_replay_state',
    targets: ['plate_appearances'],
    migration: 'data-migration/scripts/ingest_mlb_schedule_game_feed_raw_to_typed.py',
    notes: 'Critical replay table. Target exists but is currently missing richer legacy base/out/count/score fields.',
  },
  mlb_pitch_events: {
    family: 'core_replay_state',
    targets: ['pitch_events'],
    migration: 'data-migration/scripts/ingest_mlb_schedule_game_feed_raw_to_typed.py',
    notes: 'Critical replay table. Target exists but is currently missing richer legacy count/call/pitch-order fields.',
  },
  mlb_game_outcomes: { family: 'results', targets: ['game_outcomes'], migration: 'data-migration/scripts/normalize_mlb_results.py' },
  mlb_game_team_stats: { family: 'results', targets: ['team_game_stats'], migration: 'data-migration/scripts/normalize_mlb_results.py' },
  mlb_player_game_batting: { family: 'results', targets: ['player_game_batting'], migration: 'data-migration/scripts/normalize_mlb_results.py' },
  mlb_batter_game_outcomes: { family: 'results', targets: ['batter_game_outcomes'], migration: 'data-migration/scripts/normalize_mlb_results.py' },
  mlb_pitcher_appearances: { family: 'results', targets: ['pitcher_appearances'], migration: 'data-migration/scripts/normalize_mlb_results.py' },
  mlb_starting_pitcher_game_logs: { family: 'results', targets: ['starting_pitcher_game_logs'], migration: 'data-migration/scripts/normalize_mlb_results.py' },
  mlb_home_run_events: { family: 'results', targets: ['home_run_events'], migration: 'data-migration/scripts/normalize_mlb_results.py' },
  mlb_phase_outcomes_daily: { family: 'results', targets: ['phase_outcomes'], migration: 'data-migration/scripts/normalize_mlb_results.py' },
  mlb_game_story_labels: { family: 'game_story', targets: ['game_story_labels'], migration: 'data-migration/scripts/normalize_mlb_team_context.py' },
  mlb_game_story_signals: { family: 'game_story', targets: ['game_story_signals'], migration: 'data-migration/scripts/normalize_mlb_team_context.py' },
  mlb_state_formula_training_rows: { family: 'game_shape_research', targets: ['state_formula_training_rows'], migration: 'data-migration/scripts/normalize_mlb_game_shape.py' },
  mlb_state_formula_backtests: { family: 'game_shape_research', targets: ['state_formula_backtests'], migration: 'data-migration/scripts/normalize_mlb_game_shape.py' },
  mlb_game_sun_visibility_snapshots: { family: 'environment', targets: ['game_sun_visibility_snapshots'], migration: 'data-migration/scripts/normalize_mlb_environment.py' },
  mlb_game_visibility_outcomes: { family: 'environment', targets: ['game_visibility_outcomes'], migration: 'data-migration/scripts/normalize_mlb_environment.py' },

  mlb_team_rolling_form: { family: 'team_features', targets: ['team_rolling_form_snapshots'], migration: 'data-migration/scripts/normalize_mlb_team_features.py' },
  mlb_team_story_priors: { family: 'team_features', targets: ['team_story_priors'], migration: 'data-migration/scripts/normalize_mlb_team_context.py' },
  mlb_team_first_inning_profiles_daily: { family: 'team_features', targets: ['team_first_inning_profiles'], migration: 'data-migration/scripts/normalize_mlb_team_features.py' },
  mlb_team_mistake_shape_daily: { family: 'team_features', targets: ['team_mistake_shape_snapshots'], migration: 'data-migration/scripts/normalize_mlb_team_features.py' },
  mlb_team_lead_surrender_profiles: { family: 'team_features', targets: ['team_lead_surrender_profiles'], migration: 'data-migration/scripts/normalize_mlb_team_features.py' },
  mlb_team_whiff_persistence_profiles: { family: 'team_features', targets: ['team_whiff_persistence_profiles'], migration: 'data-migration/scripts/normalize_mlb_team_features.py' },
  mlb_team_form_carryover_profiles: { family: 'team_features', targets: ['team_form_carryover_profiles'], migration: 'data-migration/scripts/normalize_mlb_team_features.py' },
  mlb_team_opponent_quality_daily: { family: 'team_features', targets: ['team_opponent_quality_snapshots'], migration: 'data-migration/scripts/normalize_mlb_team_features.py' },
  mlb_team_state_snapshots: { family: 'team_features', targets: ['team_state_snapshots'], migration: 'data-migration/scripts/normalize_mlb_team_features.py' },
  mlb_team_market_context_daily: { family: 'market_context', targets: ['team_market_context_snapshots'], migration: 'data-migration/scripts/normalize_mlb_markets.py' },
  mlb_series_context_snapshots: { family: 'team_context', targets: ['series_context_snapshots'], migration: 'data-migration/scripts/normalize_mlb_team_context.py' },

  mlb_hitter_career_profiles: { family: 'player_context', targets: ['player_career_profiles'], migration: 'data-migration/scripts/normalize_mlb_player_context.py' },
  mlb_player_identity_profiles: { family: 'player_context', targets: ['player_identity_profiles'], migration: 'data-migration/scripts/normalize_mlb_player_context.py' },
  mlb_hitter_split_snapshots: { family: 'player_context', targets: ['player_split_snapshots'], migration: 'data-migration/scripts/normalize_mlb_player_context.py' },
  mlb_hitter_pitch_type_response_daily: { family: 'hitter_features', targets: ['player_pitch_type_response_snapshots'], migration: 'data-migration/scripts/normalize_mlb_hitter_features.py' },
  mlb_player_current_deviation_daily: { family: 'hitter_features', targets: ['player_current_deviation_snapshots'], migration: 'data-migration/scripts/normalize_mlb_hitter_features.py' },
  mlb_player_game_distribution_daily: { family: 'hitter_features', targets: ['player_game_distribution_snapshots'], migration: 'data-migration/scripts/normalize_mlb_hitter_features.py' },
  mlb_hitter_statcast_trend_snapshots: { family: 'hitter_features', targets: ['player_statcast_snapshots'], migration: 'data-migration/scripts/normalize_mlb_hitter_features.py' },
  mlb_hitter_statcast_game_logs: { family: 'hitter_features', targets: ['player_statcast_game_logs'], migration: 'data-migration/scripts/normalize_mlb_hitter_features.py' },
  mlb_hitter_classic_trend_snapshots: { family: 'hitter_features', targets: ['player_classic_stat_snapshots'], migration: 'data-migration/scripts/normalize_mlb_hitter_features.py' },
  mlb_hitter_opponent_context_snapshots: { family: 'hitter_features', targets: ['player_opponent_context_snapshots'], migration: 'data-migration/scripts/normalize_mlb_hitter_features.py' },
  mlb_hitter_state_snapshots: { family: 'hitter_features', targets: ['player_state_snapshots'], migration: 'data-migration/scripts/normalize_mlb_hitter_features.py' },
  mlb_player_identity_curves_daily: { family: 'player_identity', targets: ['player_identity_curves'], migration: 'data-migration/scripts/normalize_mlb_player_context.py' },
  mlb_player_identity_model_backtests: { family: 'predictions_backtests', targets: ['player_identity_backtest_rows'], migration: 'data-migration/scripts/normalize_mlb_predictions.py' },

  mlb_pitcher_war_by_season: { family: 'player_context', targets: ['pitcher_season_value_snapshots'], migration: 'data-migration/scripts/normalize_mlb_player_context.py' },
  mlb_starting_pitcher_rolling_form: { family: 'pitcher_features', targets: ['starting_pitcher_form_snapshots'], migration: 'data-migration/scripts/normalize_mlb_pitcher_features.py' },
  mlb_starter_leash_profiles: { family: 'pitcher_features', targets: ['starter_leash_profiles'], migration: 'data-migration/scripts/normalize_mlb_pitcher_features.py' },
  mlb_starter_third_time_penalty_profiles: { family: 'pitcher_features', targets: ['starter_third_time_penalty_profiles'], migration: 'data-migration/scripts/normalize_mlb_pitcher_features.py' },
  mlb_pitcher_first_inning_profiles_daily: { family: 'pitcher_features', targets: ['pitcher_first_inning_profiles'], migration: 'data-migration/scripts/normalize_mlb_pitcher_features.py' },
  mlb_pitcher_mistake_shape_daily: { family: 'pitcher_features', targets: ['pitcher_mistake_shape_snapshots'], migration: 'data-migration/scripts/normalize_mlb_pitcher_features.py' },
  mlb_pitcher_pitch_mix_daily: { family: 'pitcher_features', targets: ['pitcher_pitch_mix_snapshots'], migration: 'data-migration/scripts/normalize_mlb_pitcher_features.py' },

  mlb_bullpen_usage: { family: 'bullpen_features', targets: ['bullpen_usage_snapshots'], migration: 'data-migration/scripts/normalize_mlb_bullpen_features.py' },
  mlb_bullpen_mistake_shape_daily: { family: 'bullpen_features', targets: ['bullpen_mistake_shape_snapshots'], migration: 'data-migration/scripts/normalize_mlb_bullpen_features.py' },
  mlb_likely_relief_chains: { family: 'bullpen_features', targets: ['likely_relief_chains'], migration: 'data-migration/scripts/normalize_mlb_bullpen_features.py' },
  mlb_reliever_first_batter_command_profiles: { family: 'bullpen_features', targets: ['reliever_command_profiles'], migration: 'data-migration/scripts/normalize_mlb_bullpen_features.py' },
  mlb_team_bullpen_shape_daily: { family: 'bullpen_features', targets: ['team_bullpen_shape_snapshots'], migration: 'data-migration/scripts/normalize_mlb_bullpen_features.py' },

  mlb_lineup_conversion_shape_daily: { family: 'lineup_features', targets: ['lineup_shape_snapshots'], migration: 'data-migration/scripts/normalize_mlb_lineups.py' },
  mlb_lineup_dependency_profiles: { family: 'lineup_features', targets: ['lineup_shape_snapshots'], migration: 'data-migration/scripts/normalize_mlb_lineups.py' },
  mlb_lineup_pitcher_matchup_daily: { family: 'lineup_features', targets: ['lineups', 'lineup_slots', 'lineup_matchup_snapshots'], migration: 'data-migration/scripts/normalize_mlb_lineups.py' },

  mlb_featured_market_odds_snapshots: { family: 'markets', targets: ['market_snapshots'], migration: 'data-migration/scripts/normalize_mlb_markets.py' },
  mlb_kalshi_market_snapshots: { family: 'markets', targets: ['market_contracts', 'market_price_ticks'], migration: 'data-migration/scripts/normalize_mlb_markets.py' },
  mlb_market_mispricing_labels: { family: 'markets', targets: ['market_mispricing_labels'], migration: 'data-migration/scripts/normalize_mlb_markets.py' },
  mlb_player_prop_odds_snapshots: { family: 'markets', targets: ['prop_market_snapshots'], migration: 'data-migration/scripts/normalize_mlb_props.py' },

  mlb_side_predictions: { family: 'predictions_backtests', targets: ['prediction_rows'], migration: 'data-migration/scripts/normalize_mlb_predictions.py' },
  mlb_prop_predictions: { family: 'predictions_backtests', targets: ['prediction_rows'], migration: 'data-migration/scripts/normalize_mlb_predictions.py' },
  mlb_home_run_predictions: { family: 'predictions_backtests', targets: ['prediction_rows'], migration: 'data-migration/scripts/normalize_mlb_predictions.py' },
  mlb_side_backtests: { family: 'predictions_backtests', targets: ['side_backtest_rows'], migration: 'data-migration/scripts/normalize_mlb_predictions.py' },
  mlb_prop_backtests: { family: 'predictions_backtests', targets: ['prop_backtest_rows'], migration: 'data-migration/scripts/normalize_mlb_predictions.py' },
  mlb_home_run_backtests: { family: 'predictions_backtests', targets: ['home_run_backtest_rows'], migration: 'data-migration/scripts/normalize_mlb_predictions.py' },
  mlb_rp36_settlements: { family: 'predictions_backtests', targets: ['component_settlement_rows'], migration: 'data-migration/scripts/normalize_mlb_predictions.py' },
  mlb_rp36_team_settlements: { family: 'predictions_backtests', targets: ['component_settlement_rows'], migration: 'data-migration/scripts/normalize_mlb_predictions.py' },

  model_runs: { family: 'model_metadata', targets: ['model_runs'], migration: 'data-migration/scripts/normalize_mlb_model_metadata.py' },
  model_component_runs: { family: 'model_metadata', targets: ['model_component_runs'], migration: 'data-migration/scripts/normalize_mlb_model_metadata.py' },
  model_run_lanes: { family: 'model_metadata', targets: ['model_run_lanes'], migration: 'data-migration/scripts/normalize_mlb_model_metadata.py' },
  model_run_artifacts: { family: 'model_metadata', targets: ['model_run_artifacts'], migration: 'data-migration/scripts/normalize_mlb_model_metadata.py' },

  statcast_hr_leaderboard_snapshots: {
    family: 'adjacent_mlb_raw_context',
    targets: ['statcast_hr_leaderboard_snapshots'],
    migration: 'data-migration/scripts/ingest_mlb_player_context_raw_to_typed.py',
    notes: 'MLB adjacent source; typed target exists.',
  },
  park_factor_snapshots: {
    family: 'adjacent_environment',
    targets: ['game_environment_snapshots'],
    migration: 'needs migration design',
    notes: 'Legacy adjacent table is not in legacy_table_rows. Decide whether to normalize into game_environment_snapshots or a park_factor_snapshots typed table.',
  },
  weather_observations: {
    family: 'adjacent_environment',
    targets: ['game_environment_snapshots'],
    migration: 'needs migration design',
    notes: 'Shared weather table in sports.db. Needs MLB partitioning and typed weather/environment normalization.',
  },
  source_snapshots: {
    family: 'shared_source_metadata',
    targets: ['source_snapshots'],
    migration: 'needs partitioned migration or re-ingest',
    notes: 'Shared legacy source metadata includes multiple sports; only MLB-relevant rows should be moved or re-ingested.',
  },
};

const REPLAY_REQUIRED_FIELDS = {
  plate_appearances: [
    'at_bat_index',
    'outs_before',
    'outs_after',
    'balls_final',
    'strikes_final',
    'base_state_start',
    'base_state_end',
    'away_score_before',
    'home_score_before',
    'away_score_after',
    'home_score_after',
    'men_on_base',
    'is_scoring_play',
    'is_out',
    'is_at_bat',
    'raw_json',
  ],
  pitch_events: [
    'at_bat_index',
    'event_index',
    'balls',
    'strikes',
    'outs',
    'is_pitch',
    'is_strike',
    'is_ball',
    'call_code',
    'call_description',
    'pitch_type_code',
    'pitch_type_description',
    'start_speed',
    'end_speed',
    'play_id',
    'raw_json',
  ],
};

function quoteIdent(name) {
  return `"${String(name).replaceAll('"', '""')}"`;
}

function runSqliteJson(dbPath, sql) {
  const output = execFileSync('sqlite3', ['-json', dbPath, sql], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024 * 64,
  }).trim();
  return output ? JSON.parse(output) : [];
}

function scalar(dbPath, sql) {
  const output = execFileSync('sqlite3', [dbPath, sql], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024 * 64,
  }).trim();
  return output;
}

function tableNames(dbPath) {
  return runSqliteJson(
    dbPath,
    `
      select name
      from sqlite_master
      where type = 'table'
        and name not like 'sqlite_%'
      order by name;
    `,
  ).map((row) => row.name);
}

function tableColumns(dbPath, tableName) {
  return runSqliteJson(dbPath, `pragma table_info(${quoteIdent(tableName)});`);
}

function tableCount(dbPath, tableName) {
  return Number(scalar(dbPath, `select count(*) from ${quoteIdent(tableName)};`));
}

function dateRanges(dbPath, tableName, columns) {
  const names = new Set(columns.map((column) => column.name));
  const present = DATE_COLUMNS.filter((column) => names.has(column));
  const ranges = {};
  for (const column of present) {
    const rows = runSqliteJson(
      dbPath,
      `
        select min(${quoteIdent(column)}) as min_value, max(${quoteIdent(column)}) as max_value
        from ${quoteIdent(tableName)}
        where ${quoteIdent(column)} is not null;
      `,
    );
    if (rows[0]?.min_value || rows[0]?.max_value) {
      ranges[column] = {
        min: rows[0]?.min_value ?? null,
        max: rows[0]?.max_value ?? null,
      };
    }
  }
  return ranges;
}

function relevantLegacyTables(allTables) {
  return allTables
    .filter((table) => table.startsWith('mlb_') || SOURCE_SPECS[table])
    .sort();
}

function legacyStagingCounts() {
  const rows = runSqliteJson(
    typedDbPath,
    `
      select source_table, count(*) as rows, min(source_date) as min_source_date, max(source_date) as max_source_date
      from legacy_table_rows
      where sport = 'mlb'
         or source_table in ('model_runs', 'model_component_runs', 'model_run_lanes', 'model_run_artifacts', 'statcast_hr_leaderboard_snapshots')
      group by source_table
      order by source_table;
    `,
  );
  return Object.fromEntries(rows.map((row) => [row.source_table, row]));
}

function targetLineageCount(tableName, sourceTable, targetColumns) {
  if (!targetColumns.some((column) => column.name === 'source_table')) return null;
  const rows = runSqliteJson(
    typedDbPath,
    `
      select count(*) as rows
      from ${quoteIdent(tableName)}
      where source_table = ${JSON.stringify(sourceTable)};
    `,
  );
  return Number(rows[0]?.rows ?? 0);
}

function classifySource({ legacyRows, stagedRows, spec, targetDetails }) {
  if (!spec) return 'needs_mapping';
  const missingTargets = targetDetails.filter((target) => !target.exists);
  if (missingTargets.length) return 'target_schema_missing';
  const lineageRows = targetDetails.reduce((sum, target) => sum + (target.source_rows ?? 0), 0);
  const totalRows = targetDetails.reduce((sum, target) => sum + (target.total_rows ?? 0), 0);
  if (lineageRows > 0) return 'normalized_with_source_lineage';
  if (totalRows > 0 && stagedRows === 0 && legacyRows > 0) return 'target_populated_not_staged';
  if (totalRows > 0 && stagedRows > 0) return 'target_populated_lineage_unclear';
  if (stagedRows > 0) return 'staged_only_not_normalized';
  if (legacyRows > 0) return 'not_staged';
  return 'empty_or_inactive';
}

function summarizeBy(rows, key) {
  const summary = {};
  for (const row of rows) {
    const name = row[key] || 'unknown';
    if (!summary[name]) summary[name] = { tables: 0, legacy_rows: 0, staged_rows: 0, target_source_rows: 0 };
    summary[name].tables += 1;
    summary[name].legacy_rows += row.legacy_rows || 0;
    summary[name].staged_rows += row.staged_rows || 0;
    summary[name].target_source_rows += row.target_source_rows || 0;
  }
  return summary;
}

function codePathGroup(file) {
  if (file.startsWith('models/mlb/')) return 'mlb_model_runtime';
  if (file.startsWith('pipeline/mlb/')) return 'mlb_pipeline_runtime';
  if (file.startsWith('api/')) return 'api_runtime';
  if (file.startsWith('tests/')) return 'tests';
  if (file.startsWith('data-migration/')) return 'data_migration_utility';
  if (file.startsWith('scripts/')) return 'shared_script';
  return 'other';
}

function isCodePathCutoverBlocker(file) {
  const group = codePathGroup(file);
  return ['mlb_model_runtime', 'mlb_pipeline_runtime', 'api_runtime'].includes(group);
}

function codePathAudit() {
  const args = [
    '-n',
    'data-private.*/warehouse/sports\\.db|warehouse/sports\\.db|SPORTS_DB_PATH|sportsDbPath|warehousePath',
    'models/mlb',
    'pipeline/mlb',
    'data-migration',
    'scripts',
    'api',
    'tests',
    '-g',
    '*.mjs',
    '-g',
    '*.js',
    '-g',
    '*.ts',
    '-g',
    '*.py',
  ];
  let output = '';
  try {
    output = execFileSync('rg', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 1024 * 1024 * 32,
    });
  } catch (error) {
    if (error.status !== 1) throw error;
    return [];
  }
  return output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.+?):(\d+):(.*)$/);
      const file = match?.[1] || 'unknown';
      const lineNumber = Number(match?.[2] || 0);
      const text = match?.[3]?.trim() || line;
      return {
        file,
        line: lineNumber,
        group: codePathGroup(file),
        cutover_blocker: isCodePathCutoverBlocker(file),
        text,
      };
    })
    .filter((row) => row.file !== 'data-migration/scripts/audit_mlb_legacy_to_typed_gap.mjs');
}

function replaySchemaGaps(typedColumnsByTable, legacyColumnsByTable) {
  const gaps = {};
  for (const [targetTable, requiredFields] of Object.entries(REPLAY_REQUIRED_FIELDS)) {
    const targetColumns = new Set((typedColumnsByTable[targetTable] || []).map((column) => column.name));
    const legacyTable = `mlb_${targetTable}`;
    const legacyColumns = new Set((legacyColumnsByTable[legacyTable] || []).map((column) => column.name));
    const missing = requiredFields.filter((field) => !targetColumns.has(field));
    gaps[targetTable] = {
      legacy_table: legacyTable,
      required_fields: requiredFields,
      fields_present_in_legacy: requiredFields.filter((field) => legacyColumns.has(field)),
      fields_missing_from_typed: missing,
      severity: missing.length ? 'critical_for_m3_replay' : 'ok',
    };
  }
  return gaps;
}

function markdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const sep = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replaceAll('|', '\\|')).join(' | ')} |`);
  return [header, sep, ...body].join('\n');
}

function renderMarkdown(report) {
  const criticalRows = report.source_audit.filter((row) =>
    [
      'not_staged',
      'staged_only_not_normalized',
      'target_schema_missing',
      'needs_mapping',
      'target_populated_not_staged',
      'target_populated_lineage_unclear',
    ].includes(row.status),
  );
  const replayRows = Object.entries(report.replay_schema_gaps).map(([table, gap]) => ({
    table,
    missing: gap.fields_missing_from_typed.join(', '),
    severity: gap.severity,
  }));
  const topRows = report.source_audit
    .slice()
    .sort((a, b) => (b.legacy_rows || 0) - (a.legacy_rows || 0))
    .slice(0, 25);
  const codeRows = report.sports_db_read_paths
    .filter((row) => row.cutover_blocker)
    .slice(0, 40);
  return `# MLB Legacy to Typed DB Migration Gap Audit

Generated: ${report.generated_at}

Legacy DB: \`${report.legacy_db.relative_path}\` (${report.legacy_db.size_mb} MB)

Typed DB: \`${report.typed_db.relative_path}\` (${report.typed_db.size_mb} MB)

## Summary

- Legacy/adjacent source tables audited: ${report.summary.legacy_tables_audited}
- Legacy rows audited: ${report.summary.legacy_rows_audited}
- Tables staged in \`legacy_table_rows\`: ${report.summary.staged_source_tables}
- Staged rows: ${report.summary.staged_rows}
- Typed target tables inspected: ${report.summary.typed_tables}
- Direct \`sports.db\` code references found: ${report.summary.sports_db_read_paths}
- Runtime cutover blockers: ${report.summary.sports_db_cutover_blockers}

## Status Counts

${markdownTable(
  Object.entries(report.summary.by_status).map(([status, value]) => ({ status, ...value })),
  [
    { label: 'Status', value: (row) => row.status },
    { label: 'Tables', value: (row) => row.tables },
    { label: 'Legacy Rows', value: (row) => row.legacy_rows },
    { label: 'Staged Rows', value: (row) => row.staged_rows },
    { label: 'Target Source Rows', value: (row) => row.target_source_rows },
  ],
)}

## Critical Replay Schema Gaps

${markdownTable(replayRows, [
  { label: 'Typed Table', value: (row) => row.table },
  { label: 'Severity', value: (row) => row.severity },
  { label: 'Missing Replay Fields', value: (row) => row.missing },
])}

## Tables Needing Migration Attention

${markdownTable(criticalRows, [
  { label: 'Source Table', value: (row) => row.source_table },
  { label: 'Family', value: (row) => row.family },
  { label: 'Status', value: (row) => row.status },
  { label: 'Legacy Rows', value: (row) => row.legacy_rows },
  { label: 'Staged Rows', value: (row) => row.staged_rows },
  { label: 'Targets', value: (row) => row.targets.join(', ') },
  { label: 'Migration', value: (row) => row.migration },
  { label: 'Notes', value: (row) => row.notes },
])}

## Runtime Sports DB Read Path Audit

These code paths still directly reference \`data-private/warehouse/sports.db\` or shared warehouse path helpers and should be cut over after typed DB parity is proven.

${markdownTable(codeRows, [
  { label: 'Group', value: (row) => row.group },
  { label: 'File', value: (row) => `${row.file}:${row.line}` },
  { label: 'Reference', value: (row) => row.text },
])}

## Largest Legacy Source Tables

${markdownTable(topRows, [
  { label: 'Source Table', value: (row) => row.source_table },
  { label: 'Family', value: (row) => row.family },
  { label: 'Status', value: (row) => row.status },
  { label: 'Legacy Rows', value: (row) => row.legacy_rows },
  { label: 'Staged Rows', value: (row) => row.staged_rows },
  { label: 'Target Source Rows', value: (row) => row.target_source_rows },
  { label: 'Targets', value: (row) => row.targets.join(', ') },
])}

## Migration Order Recommendation

1. Add typed replay-state columns for \`plate_appearances\` and \`pitch_events\`, then backfill from legacy/raw state.
2. For \`target_populated_not_staged\` tables, prove parity from typed targets and either backfill provenance or document why raw ingest replaced legacy staging.
3. For \`target_populated_lineage_unclear\` tables, add source lineage columns or targeted validators so prediction/market parity can be proven without \`sports.db\`.
4. Run family validators after each migration family and require source-lineage counts where the target supports \`source_table\`.
5. Move remaining MLB-adjacent environment/source metadata into typed DB or document why it is no longer required.
6. Update all MLB code paths still reading \`data-private/warehouse/sports.db\` after typed parity is proven.

Full machine-readable detail is in \`${path.relative(repoRoot, jsonReportPath)}\`.
`;
}

function main() {
  if (!existsSync(legacyDbPath)) throw new Error(`Legacy DB missing: ${legacyDbPath}`);
  if (!existsSync(typedDbPath)) throw new Error(`Typed DB missing: ${typedDbPath}`);
  mkdirSync(path.dirname(jsonReportPath), { recursive: true });

  const legacyTables = tableNames(legacyDbPath);
  const typedTables = tableNames(typedDbPath);
  const typedTableSet = new Set(typedTables);
  const stagedCounts = legacyStagingCounts();

  const relevantTables = relevantLegacyTables(legacyTables);
  const legacyColumnsByTable = {};
  const typedColumnsByTable = {};
  for (const table of relevantTables) legacyColumnsByTable[table] = tableColumns(legacyDbPath, table);
  for (const table of typedTables) typedColumnsByTable[table] = tableColumns(typedDbPath, table);

  const sourceAudit = relevantTables.map((sourceTable) => {
    const spec = SOURCE_SPECS[sourceTable];
    const legacyColumns = legacyColumnsByTable[sourceTable] || [];
    const legacyRows = tableCount(legacyDbPath, sourceTable);
    const staged = stagedCounts[sourceTable];
    const targets = spec?.targets || [];
    const targetDetails = targets.map((targetTable) => {
      const exists = typedTableSet.has(targetTable);
      const targetColumns = typedColumnsByTable[targetTable] || [];
      const totalRows = exists ? tableCount(typedDbPath, targetTable) : null;
      const sourceRows = exists ? targetLineageCount(targetTable, sourceTable, targetColumns) : null;
      return {
        table: targetTable,
        exists,
        total_rows: totalRows,
        source_rows: sourceRows,
        has_source_table_column: targetColumns.some((column) => column.name === 'source_table'),
      };
    });
    const targetSourceRows = targetDetails.reduce((sum, target) => sum + (target.source_rows ?? 0), 0);
    return {
      source_table: sourceTable,
      family: spec?.family || 'unmapped',
      migration: spec?.migration || 'needs migration design',
      notes: spec?.notes || '',
      legacy_rows: legacyRows,
      staged_rows: Number(staged?.rows ?? 0),
      staged_min_source_date: staged?.min_source_date ?? null,
      staged_max_source_date: staged?.max_source_date ?? null,
      legacy_date_ranges: dateRanges(legacyDbPath, sourceTable, legacyColumns),
      targets,
      target_details: targetDetails,
      target_source_rows: targetSourceRows,
      status: classifySource({
        legacyRows,
        stagedRows: Number(staged?.rows ?? 0),
        spec,
        targetDetails,
      }),
      columns: legacyColumns.map((column) => column.name),
    };
  });

  const stagedButNoLegacyTable = Object.keys(stagedCounts)
    .filter((sourceTable) => !legacyTables.includes(sourceTable))
    .sort()
    .map((sourceTable) => ({
      source_table: sourceTable,
      staged_rows: Number(stagedCounts[sourceTable]?.rows ?? 0),
      min_source_date: stagedCounts[sourceTable]?.min_source_date ?? null,
      max_source_date: stagedCounts[sourceTable]?.max_source_date ?? null,
      mapped_targets: SOURCE_SPECS[sourceTable]?.targets || [],
    }));

  const sportsDbReadPaths = codePathAudit();

  const report = {
    generated_at: new Date().toISOString(),
    report_date: reportDate,
    legacy_db: {
      path: legacyDbPath,
      relative_path: path.relative(repoRoot, legacyDbPath),
      size_bytes: statSync(legacyDbPath).size,
      size_mb: Math.round((statSync(legacyDbPath).size / 1024 / 1024) * 10) / 10,
    },
    typed_db: {
      path: typedDbPath,
      relative_path: path.relative(repoRoot, typedDbPath),
      size_bytes: statSync(typedDbPath).size,
      size_mb: Math.round((statSync(typedDbPath).size / 1024 / 1024) * 10) / 10,
    },
    summary: {
      legacy_tables_total: legacyTables.length,
      legacy_tables_audited: sourceAudit.length,
      legacy_rows_audited: sourceAudit.reduce((sum, row) => sum + row.legacy_rows, 0),
      staged_source_tables: Object.keys(stagedCounts).length,
      staged_rows: Object.values(stagedCounts).reduce((sum, row) => sum + Number(row.rows || 0), 0),
      typed_tables: typedTables.length,
      by_status: summarizeBy(sourceAudit, 'status'),
      by_family: summarizeBy(sourceAudit, 'family'),
      sports_db_read_paths: sportsDbReadPaths.length,
      sports_db_cutover_blockers: sportsDbReadPaths.filter((row) => row.cutover_blocker).length,
    },
    replay_schema_gaps: replaySchemaGaps(typedColumnsByTable, legacyColumnsByTable),
    source_audit: sourceAudit,
    staged_but_no_legacy_table: stagedButNoLegacyTable,
    sports_db_read_paths: sportsDbReadPaths,
    typed_tables: typedTables,
  };

  writeFileSync(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(markdownReportPath, renderMarkdown(report));
  console.log(
    JSON.stringify(
      {
        json_report: path.relative(repoRoot, jsonReportPath),
        markdown_report: path.relative(repoRoot, markdownReportPath),
        summary: report.summary,
        replay_schema_gaps: report.replay_schema_gaps,
      },
      null,
      2,
    ),
  );
}

main();

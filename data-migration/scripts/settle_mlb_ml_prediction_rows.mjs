#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRelativeTargetForSport } from './sport_db_schema.mjs';
import { sha256Text } from '../../pipeline/sources/shared/model-artifacts/parse.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const timestamp = new Date().toISOString();

function parseArgs(argv) {
  const args = {
    dryRun: false,
    report: path.join(repoRoot, 'data-migration/reports/phase4_mlb_ml_settlement_2026-06-02.json'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') args.dryRun = true;
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
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function queryJson(dbPath, sql) {
  const output = runSqlite(dbPath, ['-json'], sql);
  return output ? JSON.parse(output) : [];
}

function queryScalar(dbPath, sql) {
  return runSqlite(dbPath, [], sql).trim();
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function normalizeName(value) {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bd-backs\b/g, 'diamondbacks')
    .replace(/\bdbacks\b/g, 'diamondbacks')
    .replace(/\bos\b/g, 'orioles')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function teamMatches(selection, teamName) {
  const selectionNorm = normalizeName(selection);
  const teamNorm = normalizeName(teamName);
  if (!selectionNorm || !teamNorm) return false;
  return teamNorm.includes(selectionNorm) || selectionNorm.includes(teamNorm);
}

function parseRationale(rawJson) {
  try {
    const parsed = JSON.parse(rawJson || '{}');
    return parsed.raw || parsed;
  } catch {
    return {};
  }
}

function loadContext(dbPath) {
  const teams = new Map(
    queryJson(dbPath, `select team_id, name, abbreviation from teams;`).map((team) => [team.team_id, team]),
  );
  const games = queryJson(
    dbPath,
    `select
      g.game_id,
      g.game_date,
      g.away_team_id,
      g.home_team_id,
      go.winner_team_id,
      go.completed_at
    from games g
    join game_outcomes go on go.game_id = g.game_id
    where go.winner_team_id is not null;`,
  ).map((game) => ({
    ...game,
    away_team: teams.get(game.away_team_id),
    home_team: teams.get(game.home_team_id),
    winner_team: teams.get(game.winner_team_id),
  }));
  return { teams, games, gameById: new Map(games.map((game) => [game.game_id, game])) };
}

function findGameForPrediction(prediction, raw, context) {
  if (prediction.game_id && context.gameById.has(prediction.game_id)) return context.gameById.get(prediction.game_id);
  const date = raw.predictionDate || raw.date || prediction.run_date;
  if (!date) return null;
  const away = raw.awayTeamFull || raw.awayTeam || null;
  const home = raw.homeTeamFull || raw.homeTeam || null;
  const title = raw.gameTitle || '';
  const [titleAway, titleHome] = title.includes('@') ? title.split('@').map((part) => part.trim()) : [null, null];
  const awayHint = away || titleAway;
  const homeHint = home || titleHome;
  if (!awayHint || !homeHint) return null;
  return (
    context.games.find(
      (game) =>
        game.game_date === date &&
        teamMatches(awayHint, game.away_team?.name) &&
        teamMatches(homeHint, game.home_team?.name),
    ) || null
  );
}

function americanProfitCents(oddsAmerican) {
  if (!Number.isFinite(Number(oddsAmerican)) || Number(oddsAmerican) === 0) return null;
  const odds = Number(oddsAmerican);
  if (odds > 0) return odds;
  return Number((10000 / Math.abs(odds)).toFixed(2));
}

function settlementRows(dbPath) {
  const context = loadContext(dbPath);
  const predictions = queryJson(
    dbPath,
    `select
      pr.prediction_row_id,
      pr.game_id,
      pr.selection,
      pr.odds_american,
      pr.rationale_json,
      mr.run_date
    from prediction_rows pr
    join model_runs mr on mr.model_run_id = pr.model_run_id
    where pr.lane = 'ml'
    order by mr.run_date, pr.prediction_row_id;`,
  );
  const rows = [];
  const unresolved = [];
  for (const prediction of predictions) {
    const raw = parseRationale(prediction.rationale_json);
    const game = findGameForPrediction(prediction, raw, context);
    if (!game?.winner_team) {
      unresolved.push({
        prediction_row_id: prediction.prediction_row_id,
        game_id: prediction.game_id,
        selection: prediction.selection,
        run_date: prediction.run_date,
        reason: 'game or winner not resolved',
      });
      continue;
    }
    const won = teamMatches(prediction.selection, game.winner_team.name);
    const profitWin = americanProfitCents(prediction.odds_american);
    rows.push({
      settlement_row_id: `settle-${sha256Text(`mlb-ml|${prediction.prediction_row_id}`).slice(0, 32)}`,
      prediction_row_id: prediction.prediction_row_id,
      event_id: game.game_id,
      settled_at: game.completed_at || timestamp,
      result_value: null,
      won: won ? 1 : 0,
      profit_cents: profitWin === null ? null : won ? profitWin : -100,
      settlement_notes: JSON.stringify({
        lane: 'ml',
        selected: prediction.selection,
        winner: game.winner_team.name,
        game_id: game.game_id,
      }),
    });
  }
  return { rows, unresolved };
}

function insertSettlements(dbPath, rows, options) {
  if (rows.length === 0 || options.dryRun) return;
  const sql = [
    'begin;',
    ...rows.map((row) => `insert into settlement_rows (
      settlement_row_id,
      prediction_row_id,
      event_id,
      settled_at,
      result_value,
      won,
      profit_cents,
      settlement_notes
    ) values (
      ${sqlString(row.settlement_row_id)},
      ${sqlString(row.prediction_row_id)},
      ${sqlString(row.event_id)},
      ${sqlString(row.settled_at)},
      null,
      ${row.won},
      ${row.profit_cents === null ? 'null' : row.profit_cents},
      ${sqlString(row.settlement_notes)}
    ) on conflict(settlement_row_id) do update set
      event_id = excluded.event_id,
      settled_at = excluded.settled_at,
      won = excluded.won,
      profit_cents = excluded.profit_cents,
      settlement_notes = excluded.settlement_notes;`),
    `insert into migration_runs (
      migration_run_id,
      sport,
      phase,
      script_path,
      source_ref,
      target_ref,
      status,
      dry_run,
      row_count_source,
      row_count_inserted,
      row_count_updated,
      row_count_skipped,
      checksum,
      report_path,
      started_at,
      finished_at,
      notes
    ) values (
      ${sqlString(`phase4-mlb-ml-settlement-${timestamp.replaceAll(/[:.]/g, '-')}`)},
      'mlb',
      '4',
      'data-migration/scripts/settle_mlb_ml_prediction_rows.mjs',
      'prediction_rows:ml',
      'sql-mlb.db:settlement_rows',
      'backfilled',
      0,
      ${rows.length},
      ${rows.length},
      null,
      0,
      ${sqlString(sha256Text(JSON.stringify(rows.map((row) => row.settlement_row_id))))},
      ${sqlString(path.relative(repoRoot, options.report))},
      ${sqlString(timestamp)},
      ${sqlString(timestamp)},
      'Settled MLB moneyline prediction rows from game_outcomes.'
    );`,
    'commit;',
  ].join('\n');
  runSqlite(dbPath, [], sql);
}

function appendMigrationEvent(report, options) {
  const eventPath = path.join(repoRoot, 'data-migration/migration_events.jsonl');
  const event = {
    event_id: `phase4-mlb-ml-settlement-${timestamp.replaceAll(/[:.]/g, '-')}${options.dryRun ? '-dry-run' : ''}`,
    timestamp,
    phase: '4',
    area: 'mlb_ml_settlement',
    source: 'prediction_rows:ml + game_outcomes',
    target: 'data-private/warehouse/sports/mlb/sql-mlb.db:settlement_rows',
    parser_module: 'none',
    migration_script: 'data-migration/scripts/settle_mlb_ml_prediction_rows.mjs',
    validation: options.dryRun ? 'dry-run only' : `${report.settled_rows} MLB ML rows settled`,
    status_from: 'not_started',
    status_to: options.dryRun ? 'planned' : 'backfilled',
    report_path: path.relative(repoRoot, options.report),
    checksum: report.checksum,
    notes: `${report.unresolved_rows} MLB ML rows unresolved.`,
  };
  writeFileSync(eventPath, `${JSON.stringify(event)}\n`, { flag: 'a' });
}

const options = parseArgs(process.argv.slice(2));
const target = repoRelativeTargetForSport('mlb', repoRoot);
mkdirSync(path.dirname(options.report), { recursive: true });

const before = Number(queryScalar(target.absoluteDbPath, 'select count(*) from settlement_rows;'));
const settlement = settlementRows(target.absoluteDbPath);
insertSettlements(target.absoluteDbPath, settlement.rows, options);
const after = options.dryRun ? before : Number(queryScalar(target.absoluteDbPath, 'select count(*) from settlement_rows;'));

const report = {
  generated_at: timestamp,
  phase: '4',
  script: 'data-migration/scripts/settle_mlb_ml_prediction_rows.mjs',
  dry_run: options.dryRun,
  sport: 'mlb',
  before_settlement_rows: before,
  after_settlement_rows: after,
  settled_rows: settlement.rows.length,
  unresolved_rows: settlement.unresolved.length,
  win_count: settlement.rows.filter((row) => row.won).length,
  loss_count: settlement.rows.filter((row) => !row.won).length,
  unresolved_sample: settlement.unresolved.slice(0, 20),
  sample_rows: settlement.rows.slice(0, 10),
  checksum: sha256Text(JSON.stringify(settlement.rows.map((row) => row.settlement_row_id))),
  ok: true,
};

appendMigrationEvent(report, options);
writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${options.report}`);
console.log(JSON.stringify(report, null, 2));

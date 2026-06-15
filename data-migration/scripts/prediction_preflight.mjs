#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRelativeTargetForSport, SPORTS } from './sport_db_schema.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const timestamp = new Date().toISOString();

const ACCEPTED_STATUSES = new Set(['success', 'partial', 'skipped_cache']);
const BLOCKING_STATUSES = new Set(['failed', 'missing', 'disabled']);

const LANE_RULES = {
  all: {
    includeRequiredFamilies: null,
    excludeFamilies: new Set(),
    optionalSources: new Set(),
  },
  prediction: {
    includeRequiredFamilies: null,
    excludeFamilies: new Set(['markets']),
    optionalSources: new Set(),
  },
  value: {
    includeRequiredFamilies: null,
    excludeFamilies: new Set(),
    optionalSources: new Set(),
  },
  market: {
    includeRequiredFamilies: new Set(['markets']),
    excludeFamilies: new Set(),
    optionalSources: new Set(),
  },
  postmatch: {
    includeRequiredFamilies: null,
    excludeFamilies: new Set(),
    optionalSources: new Set(['tennis_sofascore_replay', 'tennis_livesport_replay']),
    requireOneOfSources: new Set(['tennis_sofascore_replay', 'tennis_livesport_replay']),
  },
  props: {
    includeRequiredFamilies: null,
    excludeFamilies: new Set(),
    optionalSources: new Set(),
  },
  postgame: {
    includeRequiredFamilies: null,
    excludeFamilies: new Set(),
    optionalSources: new Set(),
  },
  m2_training: {
    includeRequiredFamilies: null,
    excludeFamilies: new Set(),
    optionalSources: new Set(),
  },
};

const SPORT_LANE_SOURCES = {
  mlb: {
    prediction: new Set([
      'mlb_schedule',
      'mlb_game_feed',
      'mlb_lineups',
      'mlb_probables',
      'mlb_odds',
      'fantasyinfocentral_weather',
      'fantasyinfocentral_daily_matchups',
      'fantasyinfocentral_umpire_factors',
      'fangraphs_roster_resource_bullpen_depth',
      'statmuse_starter_vs_team',
      'espn_pitcher_splits',
      'mlb_env1',
      'mlb_rp2',
    ]),
    value: new Set([
      'mlb_schedule',
      'mlb_game_feed',
      'mlb_lineups',
      'mlb_probables',
      'mlb_pitcher_features',
      'mlb_bullpen_features',
      'mlb_team_features',
      'mlb_environment',
      'mlb_odds',
    ]),
    props: new Set([
      'mlb_schedule',
      'mlb_game_feed',
      'mlb_lineups',
      'baseballsavant_hitter_statcast',
      'mlb_player_context',
      'mlb_pitcher_features',
      'mlb_odds',
      'mlb_props',
    ]),
    market: new Set(['mlb_odds', 'mlb_props']),
    postgame: new Set(['mlb_schedule', 'mlb_game_feed', 'mlb_model_artifacts']),
    m2_training: new Set([
      'mlb_game_feed',
      'mlb_lineups',
      'mlb_pitcher_features',
      'mlb_bullpen_features',
      'mlb_team_features',
      'mlb_environment',
      'mlb_game_shape',
    ]),
  },
};

const SYNTHETIC_POLICY_DEFAULTS = {
  fantasyinfocentral_weather: { source_family: 'weather-run-environment', ttl: 12, max_stale: 24 },
  fantasyinfocentral_daily_matchups: { source_family: 'batter-vs-pitcher', ttl: 12, max_stale: 24 },
  fantasyinfocentral_umpire_factors: { source_family: 'umpire-factor-profile', ttl: 12, max_stale: 24 },
  fangraphs_roster_resource_bullpen_depth: { source_family: 'bullpen-depth', ttl: 12, max_stale: 24 },
  statmuse_starter_vs_team: { source_family: 'starter-history', ttl: 12, max_stale: 24 },
  espn_pitcher_splits: { source_family: 'pitcher-splits', ttl: 12, max_stale: 24 },
  mlb_env1: { source_family: 'environment-addendum', ttl: 12, max_stale: 24 },
  mlb_rp2: { source_family: 'bullpen-addendum', ttl: 12, max_stale: 24 },
};

function parseArgs(argv) {
  const args = {
    sport: null,
    date: null,
    lane: 'all',
    allowPartial: true,
    degraded: false,
    report: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--sport') args.sport = argv[++index];
    else if (arg === '--date') args.date = argv[++index];
    else if (arg === '--lane') args.lane = argv[++index];
    else if (arg === '--no-partial') args.allowPartial = false;
    else if (arg === '--degraded') args.degraded = true;
    else if (arg === '--report') args.report = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.sport || !SPORTS.includes(args.sport)) throw new Error(`--sport must be one of ${SPORTS.join(', ')}`);
  if (!args.date || !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) throw new Error('--date is required in YYYY-MM-DD format');
  if (!LANE_RULES[args.lane]) throw new Error(`--lane must be one of ${Object.keys(LANE_RULES).join(', ')}`);
  if (!args.report) {
    args.report = path.join(repoRoot, 'data-migration/reports', `prediction_preflight_${args.sport}_${args.date}_${args.lane}.json`);
  }
  return args;
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
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

function parseTime(value) {
  if (!value) return null;
  const normalized = String(value).includes('T') ? String(value) : `${String(value).replace(' ', 'T')}Z`;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function syntheticPolicy(sourceName, status = null, sport = 'mlb') {
  const defaults = SYNTHETIC_POLICY_DEFAULTS[sourceName] || {};
  return {
    source_fetch_policy_id: `${sport}:${sourceName}:synthetic`,
    sport,
    source_name: sourceName,
    source_family: status?.source_family || defaults.source_family || 'unknown',
    run_rule: 'fetch_if_stale',
    default_ttl_hours: defaults.ttl ?? 12,
    max_stale_hours: defaults.max_stale ?? 24,
    required_for_prediction: 1,
    notes: 'Synthetic lane policy until source_fetch_policies is backfilled.',
  };
}

function loadPolicies(dbPath, sport) {
  return queryJson(
    dbPath,
    `select *
     from source_fetch_policies
     where sport = ${sqlString(sport)}
     order by source_name;`,
  );
}

function loadStatuses(dbPath, sport, date) {
  const rows = queryJson(
    dbPath,
    `select *
     from source_fetch_status
     where sport = ${sqlString(sport)}
       and source_date = ${sqlString(date)}
     order by source_name;`,
  );
  return new Map(rows.map((row) => [row.source_name, row]));
}

function isPolicyInLane(policy, laneRule, options) {
  const sportLaneSources = SPORT_LANE_SOURCES[options.sport]?.[options.lane];
  if (sportLaneSources) return sportLaneSources.has(policy.source_name);
  const family = policy.source_family || '';
  if (laneRule.includeRequiredFamilies && !laneRule.includeRequiredFamilies.has(family)) return false;
  if (laneRule.excludeFamilies.has(family)) return false;
  return Number(policy.required_for_prediction) === 1 || laneRule.optionalSources.has(policy.source_name);
}

function evaluateSource(policy, status, options, nowMs, laneRule) {
  const isRequired = Number(policy.required_for_prediction) === 1;
  const laneOptional = laneRule.optionalSources.has(policy.source_name);
  const requiredForLane = isRequired || laneOptional;
  const warnings = [];
  const errors = [];

  if (!status) {
    errors.push(`Missing source_fetch_status for ${policy.source_name}/${options.date}`);
    return {
      source_name: policy.source_name,
      source_family: policy.source_family,
      required_for_prediction: isRequired,
      required_for_lane: requiredForLane,
      status: null,
      stale: true,
      errors,
      warnings,
      ok: false,
    };
  }

  const cacheUntilMs = parseTime(status.cache_valid_until);
  const lastSuccessMs = parseTime(status.last_success_at || status.updated_at || status.last_attempt_at);
  const maxStaleHours = Number(policy.max_stale_hours ?? policy.default_ttl_hours);
  const derivedCacheUntilMs =
    !cacheUntilMs && Number.isFinite(maxStaleHours) && lastSuccessMs
      ? lastSuccessMs + maxStaleHours * 60 * 60 * 1000
      : null;
  const effectiveCacheUntilMs = cacheUntilMs || derivedCacheUntilMs;
  const stale = !effectiveCacheUntilMs || effectiveCacheUntilMs <= nowMs;
  if (BLOCKING_STATUSES.has(status.last_status)) errors.push(`Blocking status: ${status.last_status}`);
  if (!ACCEPTED_STATUSES.has(status.last_status)) errors.push(`Unexpected status: ${status.last_status}`);
  if (!options.allowPartial && status.last_status === 'partial') errors.push('Partial source is not allowed');
  if (status.last_status === 'partial') warnings.push(`Partial source: missing ${status.missing_item_count ?? 'unknown'} item(s)`);
  if (stale) {
    const derivedLabel = derivedCacheUntilMs ? new Date(derivedCacheUntilMs).toISOString() : 'none';
    errors.push(`Stale or missing cache_valid_until: ${status.cache_valid_until || derivedLabel}`);
  }
  if (Number(status.actual_item_count ?? 0) <= 0) errors.push('No actual source items recorded');
  if (Number(status.unresolved_count ?? 0) > 0) warnings.push(`Unresolved source rows: ${status.unresolved_count}`);

  return {
    source_name: policy.source_name,
    source_family: policy.source_family,
    required_for_prediction: isRequired,
    required_for_lane: requiredForLane,
    status: {
      source_date: status.source_date,
      last_status: status.last_status,
      last_completeness_status: status.last_completeness_status,
      last_success_at: status.last_success_at,
      cache_valid_until: status.cache_valid_until,
      expected_item_count: status.expected_item_count,
      actual_item_count: status.actual_item_count,
      missing_item_count: status.missing_item_count,
      unresolved_count: status.unresolved_count,
      notes: status.notes,
    },
    stale,
    errors,
    warnings,
    ok: errors.length === 0,
  };
}

function evaluateRequireOneOf(results, laneRule) {
  if (!laneRule.requireOneOfSources) return [];
  const eligible = results.filter((result) => laneRule.requireOneOfSources.has(result.source_name));
  if (eligible.some((result) => result.ok)) return [];
  return [`At least one source must pass: ${[...laneRule.requireOneOfSources].join(', ')}`];
}

function buildPreflight(options) {
  const target = repoRelativeTargetForSport(options.sport, repoRoot);
  const laneRule = LANE_RULES[options.lane];
  const policies = loadPolicies(target.absoluteDbPath, options.sport);
  const statuses = loadStatuses(target.absoluteDbPath, options.sport, options.date);
  const sportLaneSources = SPORT_LANE_SOURCES[options.sport]?.[options.lane];
  const policiesByName = new Map(policies.map((policy) => [policy.source_name, policy]));
  const selectedPolicies = sportLaneSources
    ? [...sportLaneSources].map((sourceName) =>
        policiesByName.get(sourceName) || syntheticPolicy(sourceName, statuses.get(sourceName), options.sport),
      )
    : policies.filter((policy) => isPolicyInLane(policy, laneRule, options));
  const nowMs = Date.now();
  const sourceResults = selectedPolicies.map((policy) => evaluateSource(policy, statuses.get(policy.source_name), options, nowMs, laneRule));
  const laneErrors = evaluateRequireOneOf(sourceResults, laneRule);
  const blockingErrors = [
    ...sourceResults.flatMap((result) => result.errors.map((error) => `${result.source_name}: ${error}`)),
    ...laneErrors,
  ];
  const warnings = sourceResults.flatMap((result) => result.warnings.map((warning) => `${result.source_name}: ${warning}`));
  const ok = blockingErrors.length === 0;
  return {
    generated_at: timestamp,
    script: 'data-migration/scripts/prediction_preflight.mjs',
    sport: options.sport,
    source_date: options.date,
    lane: options.lane,
    degraded: options.degraded,
    db_path: target.dbPath,
    required_sources_checked: sourceResults.length,
    passed_sources: sourceResults.filter((result) => result.ok).length,
    stale_sources: sourceResults.filter((result) => result.stale).map((result) => result.source_name),
    warnings,
    blocking_errors: blockingErrors,
    sources: sourceResults,
    ok,
    publish_allowed: ok || options.degraded,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = buildPreflight(options);
  mkdirSync(path.dirname(options.report), { recursive: true });
  writeFileSync(options.report, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.publish_allowed) process.exit(1);
}

main();

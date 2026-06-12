import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const getArg = (name, fallback = null) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const date = getArg('--date', new Date().toISOString().slice(0, 10))
const sourceName = 'fantasyinfocentral_weather'
const sourceUrl = getArg('--url', 'https://www.fantasyinfocentral.com/mlb/weather/')
const dbPath = path.join(rootDir, 'data-private/warehouse/sports/mlb/sql-mlb.db')
const rawPath = path.join(rootDir, 'data-private/raw/fantasyinfocentral/mlb/weather', `${date}.html`)
const artifactPath = path.join(rootDir, 'data-private/warehouse/mlb/fantasyinfocentral-weather', `${date}.json`)

const mkdirp = async (dir) => fs.mkdir(dir, { recursive: true })

const sqlQuote = (value) => {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}

const sqliteExec = (sql) => execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 80 })

const stripTags = (value = '') =>
  String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&deg;/g, ' deg ')
    .replace(/\s+/g, ' ')
    .trim()

const numberOrNull = (value) => {
  const text = String(value ?? '').replace(/[^0-9.-]/g, '')
  if (!text) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeTeam = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bst\b/g, 'saint')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bthe\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const parsePercent = (value) => numberOrNull(value)
const parseMph = (value) => numberOrNull(value)
const parseHrForce = (value) => {
  const text = String(value ?? '').trim()
  if (!text || text === '--') return null
  return numberOrNull(text)
}

const classifyHrForceRunSignal = ({ hrForce, forecastMaxHrForce, noWeatherImpact, domeClosed, roofStatus }) => {
  const values = [hrForce, forecastMaxHrForce]
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map(Number)
    .filter(Number.isFinite)
  const effectiveHrForce = values.length ? Math.max(...values) : null
  const domeHrForceNa = !values.length && (Boolean(noWeatherImpact) || Boolean(domeClosed) || /dome/i.test(String(roofStatus || '')))
  if (Number.isFinite(effectiveHrForce) && effectiveHrForce >= 1.4) {
    return {
      effectiveHrForce,
      hrForceRunSignal: 'higher_runs',
      hrForceRunSignalReason: 'Current or forecast HRForce is >= 1.4, indicating higher HR/run-environment pressure.',
      highHrForceFlag: true,
      lowHrForceFlag: false,
      domeHrForceNaFlag: false
    }
  }
  if (domeHrForceNa) {
    return {
      effectiveHrForce,
      hrForceRunSignal: 'lower_runs_dome_na',
      hrForceRunSignalReason: 'HRForce is not active/available because the game is in a dome or no-weather-impact setting; treat as lower weather carry.',
      highHrForceFlag: false,
      lowHrForceFlag: true,
      domeHrForceNaFlag: true
    }
  }
  if (Number.isFinite(effectiveHrForce) && effectiveHrForce < 1.4) {
    return {
      effectiveHrForce,
      hrForceRunSignal: 'lower_runs',
      hrForceRunSignalReason: 'Current and forecast HRForce are below 1.4, indicating lower HR/run-environment pressure.',
      highHrForceFlag: false,
      lowHrForceFlag: true,
      domeHrForceNaFlag: false
    }
  }
  return {
    effectiveHrForce,
    hrForceRunSignal: 'unknown',
    hrForceRunSignalReason: 'HRForce signal was not available and no dome/no-weather-impact marker was detected.',
    highHrForceFlag: false,
    lowHrForceFlag: false,
    domeHrForceNaFlag: false
  }
}

const extractAttr = (html, attrName) => {
  const match = String(html || '').match(new RegExp(`${attrName}="([^"]*)"`, 'i'))
  return match?.[1] || null
}

const extractFirstPitchDate = (blocks) => {
  const joined = blocks.join('\n')
  return stripTags(joined.match(/game on ([^:]+?):/i)?.[1] || '') || null
}

const forecastRows = (blockHtml, matchupKey, gameTimeEt) =>
  [...blockHtml.matchAll(/<div>\s*<span class="[^"]*\bwicon\b[^"]*"[\s\S]*?<\/div>/gi)].map((match) => {
    const rowHtml = match[0]
    const rowAfterTemp = rowHtml.slice(Math.max(0, rowHtml.search(/<span>\s*\d+&deg;/i)))
    const metrics = [...rowAfterTemp.matchAll(/<span(?:\s+[^>]*)?>([^<]*)<\/span>/gi)]
      .map((metric) => stripTags(metric[1]))
      .filter(Boolean)
    const hrfMatch = rowHtml.match(/<span class="fcasthrf[^"]*"[^>]*data-tooltip="([^"]*)"[^>]*>([\s\S]*?)<\/span>/i)
    const rainDescription = stripTags(rowHtml.match(/<span class="rdesc">([^<]*)<\/span>/i)?.[1] || '')
    return {
      matchupKey,
      gameTimeEt,
      conditionTitle: stripTags(rowHtml.match(/<img\b[^>]*title="([^"]*)"/i)?.[1] || '') || null,
      rainDescription: rainDescription && rainDescription !== '-----' ? rainDescription : null,
      temperatureF: numberOrNull(metrics[0]),
      humidityPct: parsePercent(metrics[1]),
      precipPct: parsePercent(metrics[2]),
      precipTooltip: stripTags(rowHtml.match(/<span(?:\s+[^>]*)?title="([^"]*chance of rain)"[^>]*>/i)?.[1] || '') || null,
      windSpeedMph: parseMph(metrics[3]),
      windDegree: numberOrNull(rowHtml.match(/class="fcastdeg"[^>]*style="--degree:([^"]+)"/i)?.[1]),
      hrForce: parseHrForce(hrfMatch?.[2]),
      hrForceTooltip: stripTags(hrfMatch?.[1] || '') || null,
      hourLabel: metrics.at(-1) || null,
      rawText: stripTags(rowHtml),
      rawJson: null
    }
  })

const parseWeatherBlocks = (html, capturedAt, sourceSnapshotId, sourceLastModified) => {
  const blocks = [...html.matchAll(/<div[^>]*class="[^"]*\bweather_block\b[^"]*"[\s\S]*?(?=<div[^>]*class="[^"]*\bweather_block\b|<footer|$)/gi)].map((match) => match[0])
  const sourceGameDateLabel = extractFirstPitchDate(blocks)
  const games = blocks.map((blockHtml) => {
    const blockTag = blockHtml.match(/<div\b[^>]*class="[^"]*\bweather_block\b[^"]*"[^>]*>/i)?.[0] || ''
    const weatherBlockId = blockTag.match(/\bid\s*=\s*"?\s*([^"'\s>]+)/i)?.[1] || null
    const blockClasses = extractAttr(blockTag, 'class') || ''
    const teamMatch = blockHtml.match(/<a\b[^>]*class="team\s+([A-Z]{2,3})"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a\b[^>]*class="team\s+after\s+([A-Z]{2,3})"[^>]*>([\s\S]*?)<\/a>/i)
    const awayTeamAbbr = teamMatch?.[1] || null
    const awayTeam = stripTags(teamMatch?.[2] || '') || null
    const homeTeamAbbr = teamMatch?.[3] || weatherBlockId
    const homeTeam = stripTags(teamMatch?.[4] || '') || null
    if (!awayTeam || !homeTeam) return null

    const matchupKey = `${normalizeTeam(awayTeam)}|${normalizeTeam(homeTeam)}`
    const gameTimeEt = stripTags(blockHtml.match(/<span class="sb_time">([\s\S]*?)<\/span>/i)?.[1] || '') || null
    const currentTitle = stripTags(blockHtml.match(/<div class="weather_title[^"]*"[\s\S]*?<img\b[^>]*title="([^"]*)"/i)?.[1] || '') || null
    const currentCondition = stripTags(blockHtml.match(/<div class="weather_title[^"]*">[\s\S]*?<span class="temp">[\s\S]*?<\/span>\s*<\/div>\s*<span>([\s\S]*?)<\/span>/i)?.[1] || '') || null
    const hrForceMatch = blockHtml.match(/<div class="hrforce[^"]*"[^>]*data-tooltip="([^"]*)"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/i)
    const domeClosed = /\bdm_closed\b/i.test(blockClasses)
    const domeStadium = /\bdome\b/i.test(blockClasses) || /Retractable Dome/i.test(blockHtml)
    const noWeatherImpact = /No weather impact/i.test(blockHtml) || /not active: dome stadium/i.test(hrForceMatch?.[1] || '')
    const hourly = forecastRows(blockHtml, matchupKey, gameTimeEt)
    const hrForce = parseHrForce(hrForceMatch?.[2])
    const forecastMaxHrForce = hourly.reduce((maxValue, forecast) => {
      if (!Number.isFinite(Number(forecast.hrForce))) return maxValue
      return Math.max(maxValue ?? Number(forecast.hrForce), Number(forecast.hrForce))
    }, null)
    const roofStatus = domeClosed ? 'likely_closed' : (domeStadium ? 'dome_not_marked_closed' : 'open_air')
    const hrForceSignal = classifyHrForceRunSignal({
      hrForce,
      forecastMaxHrForce,
      noWeatherImpact,
      domeClosed,
      roofStatus
    })

    const row = {
      sourceDate: date,
      sourceGameDateLabel,
      matchupKey,
      weatherBlockId,
      blockClasses,
      awayTeamAbbr,
      homeTeamAbbr,
      awayTeam,
      homeTeam,
      matchup: `${awayTeam} @ ${homeTeam}`,
      gameTimeEt,
      currentTemperatureF: numberOrNull(blockHtml.match(/<span class="temp">([\s\S]*?)<\/span>/i)?.[1]),
      currentCondition,
      currentConditionTitle: currentTitle,
      windSpeedMph: parseMph(blockHtml.match(/<span class="speed">([\s\S]*?)<\/span>/i)?.[1]),
      windDegree: numberOrNull(blockHtml.match(/<div class="diamond"[^>]*style="--degree:([^"]+)"/i)?.[1]),
      hrForce,
      hrForceLabel: stripTags(hrForceMatch?.[2] || '') || null,
      hrForceTooltip: stripTags(hrForceMatch?.[1] || '') || null,
      forecastMaxHrForce,
      effectiveHrForce: hrForceSignal.effectiveHrForce,
      hrForceRunSignal: hrForceSignal.hrForceRunSignal,
      hrForceRunSignalReason: hrForceSignal.hrForceRunSignalReason,
      highHrForceFlag: hrForceSignal.highHrForceFlag,
      lowHrForceFlag: hrForceSignal.lowHrForceFlag,
      domeHrForceNaFlag: hrForceSignal.domeHrForceNaFlag,
      roofStatus,
      domeClosed,
      noWeatherImpact,
      sourceLastModified,
      sourceSnapshotId,
      capturedAt,
      rawJson: null
    }
    row.rawJson = JSON.stringify({ ...row, rawJson: undefined })
    hourly.forEach((forecast) => {
      forecast.sourceDate = date
      forecast.homeTeamAbbr = homeTeamAbbr
      forecast.awayTeamAbbr = awayTeamAbbr
      forecast.sourceSnapshotId = sourceSnapshotId
      forecast.capturedAt = capturedAt
      forecast.rawJson = JSON.stringify({ ...forecast, rawJson: undefined })
    })
    return { row, hourly }
  }).filter(Boolean)

  return {
    games: games.map((game) => game.row),
    hourly: games.flatMap((game) => game.hourly)
  }
}

const readGames = () => {
  const raw = sqliteExec(`
select game_pk, game_date, away_team, home_team, status, start_time_utc
from mlb_games
where game_date between date(${sqlQuote(date)}, '-7 day') and date(${sqlQuote(date)}, '+7 day')
order by game_date, start_time_utc;
`)
  return raw.trim().split('\n').filter(Boolean).map((line) => {
    const [gamePk, gameDate, awayTeam, homeTeam, status, startTimeUtc] = line.split('|')
    return {
      gamePk: Number(gamePk),
      gameDate,
      awayTeam,
      homeTeam,
      status,
      startTimeUtc,
      matchupKey: `${normalizeTeam(awayTeam)}|${normalizeTeam(homeTeam)}`
    }
  })
}

const attachGames = (weatherRows, games) => weatherRows.map((row) => {
  const candidates = games.filter((game) => game.matchupKey === row.matchupKey)
  const exact = candidates.find((game) => game.gameDate === date)
  const fallback = exact || candidates[0] || null
  return {
    ...row,
    gamePk: exact?.gamePk || null,
    matchedGameDate: exact?.gameDate || null,
    matchedAwayTeam: exact?.awayTeam || null,
    matchedHomeTeam: exact?.homeTeam || null,
    matchedStatus: exact?.status || null,
    matchedStartTimeUtc: exact?.startTimeUtc || null,
    bestAvailableGamePk: fallback?.gamePk || null,
    bestAvailableGameDate: fallback?.gameDate || null,
    dateMatchStatus: exact ? 'exact' : (fallback ? 'matchup_other_date' : 'unmatched')
  }
})

const createTables = () => {
  sqliteExec(`
create table if not exists mlb_fic_weather_daily (
  source_date text not null,
  matchup_key text not null,
  game_time_et text not null default '',
  game_pk integer,
  matched_game_date text,
  best_available_game_pk integer,
  best_available_game_date text,
  date_match_status text not null,
  away_team_abbr text,
  home_team_abbr text,
  away_team text,
  home_team text,
  matchup text,
  current_temperature_f real,
  current_condition text,
  current_condition_title text,
  wind_speed_mph real,
  wind_degree real,
  hr_force real,
  hr_force_label text,
  hr_force_tooltip text,
  forecast_max_hr_force real,
  effective_hr_force real,
  hr_force_run_signal text,
  hr_force_run_signal_reason text,
  high_hr_force_flag integer not null default 0,
  low_hr_force_flag integer not null default 0,
  dome_hr_force_na_flag integer not null default 0,
  weather_block_id text,
  block_classes text,
  roof_status text,
  dome_closed integer not null default 0,
  no_weather_impact integer not null default 0,
  source_game_date_label text,
  source_last_modified text,
  source_snapshot_id text,
  captured_at text,
  raw_json text,
  primary key (source_date, matchup_key, game_time_et)
);
create table if not exists mlb_fic_weather_hourly_daily (
  source_date text not null,
  matchup_key text not null,
  game_time_et text not null default '',
  hour_label text not null,
  away_team_abbr text,
  home_team_abbr text,
  condition_title text,
  rain_description text,
  temperature_f real,
  humidity_pct real,
  precip_pct real,
  precip_tooltip text,
  wind_speed_mph real,
  wind_degree real,
  hr_force real,
  hr_force_tooltip text,
  source_snapshot_id text,
  captured_at text,
  raw_text text,
  raw_json text,
  primary key (source_date, matchup_key, game_time_et, hour_label)
);
create index if not exists idx_mlb_fic_weather_daily_game on mlb_fic_weather_daily(game_pk);
create index if not exists idx_mlb_fic_weather_daily_date on mlb_fic_weather_daily(source_date, date_match_status);
create index if not exists idx_mlb_fic_weather_hourly_date on mlb_fic_weather_hourly_daily(source_date, matchup_key);
delete from mlb_fic_weather_daily where source_date = ${sqlQuote(date)};
delete from mlb_fic_weather_hourly_daily where source_date = ${sqlQuote(date)};
`)

  const existingColumns = sqliteExec(`pragma table_info(mlb_fic_weather_daily);`)
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('|')[1])
  const addColumn = (name, type) => {
    if (!existingColumns.includes(name)) sqliteExec(`alter table mlb_fic_weather_daily add column ${name} ${type};`)
  }
  addColumn('effective_hr_force', 'real')
  addColumn('hr_force_run_signal', 'text')
  addColumn('hr_force_run_signal_reason', 'text')
  addColumn('high_hr_force_flag', 'integer not null default 0')
  addColumn('low_hr_force_flag', 'integer not null default 0')
  addColumn('dome_hr_force_na_flag', 'integer not null default 0')
}

const insertRows = (weatherRows, hourlyRows) => {
  if (weatherRows.length) {
    const values = weatherRows.map((row) => `(
      ${sqlQuote(row.sourceDate)}, ${sqlQuote(row.matchupKey)}, ${sqlQuote(row.gameTimeEt || '')},
      ${sqlQuote(row.gamePk)}, ${sqlQuote(row.matchedGameDate)}, ${sqlQuote(row.bestAvailableGamePk)},
      ${sqlQuote(row.bestAvailableGameDate)}, ${sqlQuote(row.dateMatchStatus)}, ${sqlQuote(row.awayTeamAbbr)},
      ${sqlQuote(row.homeTeamAbbr)}, ${sqlQuote(row.awayTeam)}, ${sqlQuote(row.homeTeam)}, ${sqlQuote(row.matchup)},
      ${sqlQuote(row.currentTemperatureF)}, ${sqlQuote(row.currentCondition)}, ${sqlQuote(row.currentConditionTitle)},
      ${sqlQuote(row.windSpeedMph)}, ${sqlQuote(row.windDegree)}, ${sqlQuote(row.hrForce)}, ${sqlQuote(row.hrForceLabel)},
      ${sqlQuote(row.hrForceTooltip)}, ${sqlQuote(row.forecastMaxHrForce)}, ${sqlQuote(row.weatherBlockId)},
      ${sqlQuote(row.effectiveHrForce)}, ${sqlQuote(row.hrForceRunSignal)}, ${sqlQuote(row.hrForceRunSignalReason)},
      ${row.highHrForceFlag ? 1 : 0}, ${row.lowHrForceFlag ? 1 : 0}, ${row.domeHrForceNaFlag ? 1 : 0},
      ${sqlQuote(row.blockClasses)}, ${sqlQuote(row.roofStatus)}, ${row.domeClosed ? 1 : 0}, ${row.noWeatherImpact ? 1 : 0},
      ${sqlQuote(row.sourceGameDateLabel)}, ${sqlQuote(row.sourceLastModified)}, ${sqlQuote(row.sourceSnapshotId)},
      ${sqlQuote(row.capturedAt)}, ${sqlQuote(row.rawJson)}
    )`).join(',\n')
    sqliteExec(`insert or replace into mlb_fic_weather_daily (
      source_date, matchup_key, game_time_et, game_pk, matched_game_date, best_available_game_pk,
      best_available_game_date, date_match_status, away_team_abbr, home_team_abbr, away_team, home_team,
      matchup, current_temperature_f, current_condition, current_condition_title, wind_speed_mph, wind_degree,
      hr_force, hr_force_label, hr_force_tooltip, forecast_max_hr_force, weather_block_id,
      effective_hr_force, hr_force_run_signal, hr_force_run_signal_reason, high_hr_force_flag,
      low_hr_force_flag, dome_hr_force_na_flag, block_classes, roof_status, dome_closed, no_weather_impact, source_game_date_label, source_last_modified,
      source_snapshot_id, captured_at, raw_json
    ) values ${values};`)
  }

  if (hourlyRows.length) {
    const values = hourlyRows.map((row) => `(
      ${sqlQuote(row.sourceDate)}, ${sqlQuote(row.matchupKey)}, ${sqlQuote(row.gameTimeEt || '')}, ${sqlQuote(row.hourLabel || '')},
      ${sqlQuote(row.awayTeamAbbr)}, ${sqlQuote(row.homeTeamAbbr)}, ${sqlQuote(row.conditionTitle)}, ${sqlQuote(row.rainDescription)},
      ${sqlQuote(row.temperatureF)}, ${sqlQuote(row.humidityPct)}, ${sqlQuote(row.precipPct)}, ${sqlQuote(row.precipTooltip)},
      ${sqlQuote(row.windSpeedMph)}, ${sqlQuote(row.windDegree)}, ${sqlQuote(row.hrForce)}, ${sqlQuote(row.hrForceTooltip)},
      ${sqlQuote(row.sourceSnapshotId)}, ${sqlQuote(row.capturedAt)}, ${sqlQuote(row.rawText)}, ${sqlQuote(row.rawJson)}
    )`).join(',\n')
    sqliteExec(`insert or replace into mlb_fic_weather_hourly_daily (
      source_date, matchup_key, game_time_et, hour_label, away_team_abbr, home_team_abbr, condition_title,
      rain_description, temperature_f, humidity_pct, precip_pct, precip_tooltip, wind_speed_mph, wind_degree,
      hr_force, hr_force_tooltip, source_snapshot_id, captured_at, raw_text, raw_json
    ) values ${values};`)
  }
}

const writeSourceStatus = ({ startedAt, finishedAt, contentHash, sourceSnapshotId, weatherRows, hourlyRows }) => {
  const exactCount = weatherRows.filter((row) => row.dateMatchStatus === 'exact').length
  const unresolvedCount = weatherRows.length - exactCount
  const highHrForceCount = weatherRows.filter((row) =>
    row.highHrForceFlag
  ).length
  const lowHrForceCount = weatherRows.filter((row) => row.lowHrForceFlag).length
  const domeNaCount = weatherRows.filter((row) => row.domeHrForceNaFlag).length
  const notes = JSON.stringify({
    artifactPath: path.relative(rootDir, artifactPath),
    rawPath: path.relative(rootDir, rawPath),
    gameCount: weatherRows.length,
    hourlyCount: hourlyRows.length,
    exactGameMatches: exactCount,
    unresolvedCount,
    highHrForceCount,
    lowHrForceCount,
    domeNaCount,
    warning: unresolvedCount ? 'Some FIC weather rows did not match the requested MLB date/game exactly.' : null
  })
  sqliteExec(`
insert or replace into source_snapshots (
  source_snapshot_id, source_name, sport, source_url, local_path, captured_at, source_date, content_hash, content_type, status, notes
) values (
  ${sqlQuote(sourceSnapshotId)}, ${sqlQuote(sourceName)}, 'mlb', ${sqlQuote(sourceUrl)}, ${sqlQuote(path.relative(rootDir, rawPath))},
  ${sqlQuote(finishedAt)}, ${sqlQuote(date)}, ${sqlQuote(contentHash)}, 'text/html', 'captured', ${sqlQuote(notes)}
);
insert or replace into source_fetch_runs (
  source_fetch_run_id, sport, source_name, source_family, source_date, run_reason, requested_url,
  cache_status, cache_ttl_hours, previous_success_at, status, completeness_status, expected_item_count,
  actual_item_count, missing_item_count, source_snapshot_id, started_at, finished_at, error_code, error_message, details_json
) values (
  ${sqlQuote(sourceSnapshotId)}, 'mlb', ${sqlQuote(sourceName)}, 'weather-run-environment', ${sqlQuote(date)}, 'daily-hrforce-weather-warehouse',
  ${sqlQuote(sourceUrl)}, 'network', null, null, 'success', 'complete', ${weatherRows.length},
  ${weatherRows.length}, 0, ${sqlQuote(sourceSnapshotId)}, ${sqlQuote(startedAt)}, ${sqlQuote(finishedAt)},
  null, null, ${sqlQuote(notes)}
);
insert or replace into source_fetch_status (
  source_fetch_status_id, sport, source_name, source_family, source_date, last_fetch_run_id,
  last_attempt_at, last_success_at, last_status, last_completeness_status, cache_valid_until,
  expected_item_count, actual_item_count, missing_item_count, unresolved_count, updated_at, notes
) values (
  ${sqlQuote(`mlb-${sourceName}-${date}`)}, 'mlb', ${sqlQuote(sourceName)}, 'weather-run-environment', ${sqlQuote(date)},
  ${sqlQuote(sourceSnapshotId)}, ${sqlQuote(startedAt)}, ${sqlQuote(finishedAt)}, 'success', 'complete',
  null, ${weatherRows.length}, ${weatherRows.length}, 0, ${unresolvedCount}, ${sqlQuote(finishedAt)}, ${sqlQuote(notes)}
);
`)
}

const main = async () => {
  const startedAt = new Date().toISOString()
  const response = await fetch(sourceUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 Codex MLB FIC weather warehouse',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })
  if (!response.ok) throw new Error(`FantasyInfoCentral weather fetch failed: ${response.status} ${response.statusText}`)
  const html = await response.text()
  const finishedAt = new Date().toISOString()
  const contentHash = crypto.createHash('sha256').update(html).digest('hex')
  const sourceSnapshotId = `mlb-fic-weather-${date}-${contentHash.slice(0, 16)}`
  const sourceLastModified = response.headers.get('last-modified')
  const parsed = parseWeatherBlocks(html, finishedAt, sourceSnapshotId, sourceLastModified)
  const weatherRows = attachGames(parsed.games, readGames())
  const hourlyRows = parsed.hourly

  if (weatherRows.length < 5) throw new Error(`FantasyInfoCentral weather parser found only ${weatherRows.length} games`)

  await mkdirp(path.dirname(rawPath))
  await mkdirp(path.dirname(artifactPath))
  await fs.writeFile(rawPath, html)
  const payload = {
    schemaVersion: 1,
    source: sourceName,
    sourceUrl,
    sourceDate: date,
    capturedAt: finishedAt,
    contentHash,
    sourceSnapshotId,
    sourceLastModified,
    modelUse: {
      highHrForceGate: 'Treat effective HRForce >= 1.4 as higher HR/run-environment pressure. Do not promote an over or HR pick from HRForce alone.',
      lowHrForceGate: 'Treat effective HRForce < 1.4 as lower HR/run-environment pressure. Dome or HRForce N/A games are lower weather-carry unless another non-weather signal overrides.',
      underPolicy: 'Unders need stronger support when current or forecast HRForce is >= 1.4, especially with warm air, wind out, weak bullpen bridge, or hard-contact support.'
    },
    games: weatherRows,
    hourly: hourlyRows
  }
  await fs.writeFile(artifactPath, JSON.stringify(payload, null, 2))

  createTables()
  insertRows(weatherRows, hourlyRows)
  writeSourceStatus({ startedAt, finishedAt, contentHash, sourceSnapshotId, weatherRows, hourlyRows })

  const highHrForceRows = weatherRows.filter((row) =>
    row.highHrForceFlag
  )
  const lowHrForceRows = weatherRows.filter((row) => row.lowHrForceFlag)
  console.log(JSON.stringify({
    status: 'ok',
    date,
    games: weatherRows.length,
    hourlyRows: hourlyRows.length,
    exactGameMatches: weatherRows.filter((row) => row.dateMatchStatus === 'exact').length,
    highHrForceGames: highHrForceRows.length,
    lowHrForceGames: lowHrForceRows.length,
    domeHrForceNaGames: weatherRows.filter((row) => row.domeHrForceNaFlag).length,
    artifactPath: path.relative(rootDir, artifactPath),
    rawPath: path.relative(rootDir, rawPath),
    highHrForceExamples: highHrForceRows.slice(0, 10).map((row) => ({
      matchup: row.matchup,
      currentHrForce: row.hrForce,
      forecastMaxHrForce: row.forecastMaxHrForce,
      effectiveHrForce: row.effectiveHrForce,
      runSignal: row.hrForceRunSignal,
      wind: row.windSpeedMph,
      condition: row.currentCondition,
      roofStatus: row.roofStatus
    })),
    lowHrForceExamples: lowHrForceRows.slice(0, 8).map((row) => ({
      matchup: row.matchup,
      currentHrForce: row.hrForce,
      forecastMaxHrForce: row.forecastMaxHrForce,
      effectiveHrForce: row.effectiveHrForce,
      runSignal: row.hrForceRunSignal,
      roofStatus: row.roofStatus
    }))
  }, null, 2))
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})

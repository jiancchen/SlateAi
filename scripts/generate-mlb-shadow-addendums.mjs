import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const getArg = (name, fallback = null) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const datesArg = getArg('--dates', new Date().toISOString().slice(0, 10))
const dates = datesArg.split(',').map((date) => date.trim()).filter(Boolean)
const dbPath = path.join(rootDir, 'data-private/warehouse/sports/mlb/sql-mlb.db')
const outPath = path.join(rootDir, 'web/src/lib/mlb-shadow-addendums.generated.js')

const sqliteJson = (sql) => {
  const raw = execFileSync('sqlite3', ['-json', dbPath, sql], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 80 })
  return raw.trim() ? JSON.parse(raw) : []
}

const sqlQuote = (value) => `'${String(value).replace(/'/g, "''")}'`
const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const round = (value, digits = 1) => {
  if (!Number.isFinite(Number(value))) return null
  const power = 10 ** digits
  return Math.round(Number(value) * power) / power
}

const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const normalizeName = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const daysBack = (sourceDate, usageDate) => {
  const source = Date.parse(`${sourceDate}T12:00:00Z`)
  const usage = Date.parse(`${usageDate}T12:00:00Z`)
  if (!Number.isFinite(source) || !Number.isFinite(usage)) return null
  return Math.round((source - usage) / 86400000)
}

const roleRank = (role) => {
  const key = String(role || '').toUpperCase()
  if (key === 'CL') return 1
  if (key === 'SU8') return 2
  if (key === 'SU7') return 3
  if (key.startsWith('SU')) return 4
  if (key === 'MID') return 5
  if (key === 'LR') return 8
  return 6
}

const roleIsHighLeverage = (role) => {
  const key = String(role || '').toUpperCase()
  return key === 'CL' || key.startsWith('SU')
}

const summarizeTeamBullpen = (sourceDate, team, depthRows, usageRows) => {
  const players = depthRows
    .map((row) => {
      const usage = usageRows.filter((usageRow) => usageRow.player_key === row.player_key)
      const last3 = usage.filter((usageRow) => {
        const back = daysBack(sourceDate, usageRow.usage_date)
        return back !== null && back >= 1 && back <= 3
      })
      const last6 = usage.filter((usageRow) => {
        const back = daysBack(sourceDate, usageRow.usage_date)
        return back !== null && back >= 1 && back <= 6
      })
      const pitchesLast3 = last3.reduce((sum, usageRow) => sum + (Number(usageRow.pitches) || 0), 0)
      const pitchesLast6 = last6.reduce((sum, usageRow) => sum + (Number(usageRow.pitches) || 0), 0)
      const usedDaysLast3 = last3.filter((usageRow) => Number(usageRow.pitches) > 0).length
      const usedDaysLast6 = last6.filter((usageRow) => Number(usageRow.pitches) > 0).length
      const flags = last6.flatMap((usageRow) => {
        try {
          return JSON.parse(usageRow.outcome_flags_json || '[]')
        } catch {
          return []
        }
      })
      const unavailable = usage.some((usageRow) => String(usageRow.override_status || '').toUpperCase() && String(usageRow.override_status || '').toUpperCase() !== 'MLB')
      const stress =
        pitchesLast3 * 0.8 +
        pitchesLast6 * 0.25 +
        usedDaysLast3 * 10 +
        (roleIsHighLeverage(row.role) ? 10 : 0) +
        (unavailable ? 24 : 0)
      return {
        playerName: row.player_name,
        playerKey: row.player_key,
        role: row.role,
        throws: row.throws,
        pitchesLast3,
        pitchesLast6,
        usedDaysLast3,
        usedDaysLast6,
        flags,
        unavailable,
        stress: round(stress, 1)
      }
    })
    .sort((left, right) => roleRank(left.role) - roleRank(right.role) || Number(right.stress) - Number(left.stress))

  const highLeverage = players.filter((player) => roleIsHighLeverage(player.role)).slice(0, 4)
  const leveragePool = highLeverage.length ? highLeverage : players.slice(0, 4)
  const top3 = players.slice(0, 3)
  const topPitchesLast3 = leveragePool.reduce((sum, player) => sum + player.pitchesLast3, 0)
  const topPitchesLast6 = leveragePool.reduce((sum, player) => sum + player.pitchesLast6, 0)
  const taxedArms = leveragePool.filter((player) =>
    player.pitchesLast3 >= 35 ||
    player.pitchesLast6 >= 60 ||
    player.usedDaysLast3 >= 2 ||
    player.unavailable
  )
  const unavailableArms = players.filter((player) => player.unavailable)
  const stressScore = clamp(
    22 +
      topPitchesLast3 * 0.45 +
      topPitchesLast6 * 0.1 +
      taxedArms.length * 12 +
      unavailableArms.length * 10,
    0,
    100
  )
  const tag = stressScore >= 70 ? 'taxed' : stressScore >= 52 ? 'watch' : stressScore <= 34 ? 'fresh' : 'stable'
  const teamLabel = team.team_name || team.team_abbr || team.team_slug || 'Team'
  const keyArms = top3.map((player) => {
    const bits = [`${player.playerName} ${player.role}`]
    if (player.pitchesLast3) bits.push(`${player.pitchesLast3}p/3d`)
    if (player.usedDaysLast3) bits.push(`${player.usedDaysLast3} uses/3d`)
    if (player.unavailable) bits.push('override')
    return bits.join(' ')
  })
  const reasons = [
    tag === 'taxed'
      ? `${teamLabel} leverage relief looks taxed: ${round(topPitchesLast3, 0)} high-leverage pitches over the last 3 days.`
      : tag === 'fresh'
        ? `${teamLabel} leverage relief looks fresh: only ${round(topPitchesLast3, 0)} high-leverage pitches over the last 3 days.`
        : `${teamLabel} leverage relief is ${tag}: ${round(topPitchesLast3, 0)} high-leverage pitches over the last 3 days.`,
    taxedArms.length ? `Taxed/limited arms: ${taxedArms.map((player) => `${player.playerName} (${player.role})`).slice(0, 4).join(', ')}.` : null
  ].filter(Boolean)

  return {
    teamSlug: team.team_slug,
    teamAbbr: team.team_abbr,
    teamName: team.team_name,
    stressScore: round(stressScore, 0),
    tag,
    topPitchesLast3,
    topPitchesLast6,
    taxedArmCount: taxedArms.length,
    unavailableArmCount: unavailableArms.length,
    keyArms,
    reasons,
    players: players.slice(0, 8)
  }
}

const buildDatePayload = (date) => {
  const games = sqliteJson(`
select game_pk, game_date, away_team, home_team, status, start_time_utc
from mlb_games
where game_date = ${sqlQuote(date)}
order by start_time_utc;
`)
  const depthRows = sqliteJson(`
select *
from mlb_fangraphs_bullpen_depth_daily
where source_date = ${sqlQuote(date)}
order by team_slug, role, player_name;
`)
  const usageRows = sqliteJson(`
select *
from mlb_fangraphs_bullpen_usage_daily
where source_date = ${sqlQuote(date)};
`)
  const umpireRows = sqliteJson(`
select *
from mlb_umpire_assignments_daily
where source_date = ${sqlQuote(date)}
  and date_match_status = 'exact';
`)

  const teams = new Map()
  depthRows.forEach((row) => {
    if (!teams.has(row.team_slug)) {
      teams.set(row.team_slug, {
        team_slug: row.team_slug,
        team_abbr: row.team_abbr,
        team_name: row.team_name
      })
    }
  })
  const bullpenByTeamSlug = {}
  for (const [teamSlug, team] of teams) {
    bullpenByTeamSlug[teamSlug] = summarizeTeamBullpen(
      date,
      team,
      depthRows.filter((row) => row.team_slug === teamSlug),
      usageRows.filter((row) => row.team_slug === teamSlug)
    )
  }
  const bullpenByTeamName = {}
  Object.values(bullpenByTeamSlug).forEach((team) => {
    bullpenByTeamName[normalizeName(team.teamName)] = team
    bullpenByTeamName[normalizeName(team.teamAbbr)] = team
  })

  const umpireByGamePk = Object.fromEntries(umpireRows.map((row) => [String(row.game_pk), {
    umpireName: row.umpire_name,
    zoneLabel: row.zone_label,
    zoneFactor: row.zone_factor,
    kPerGame: row.k_per_game,
    bbPerGame: row.bb_per_game,
    nrfiPct: row.nrfi_pct,
    sampleGames: row.sample_games,
    exactMatch: true,
    reasons: [
      row.zone_factor !== null ? `${row.umpire_name} zone factor ${row.zone_factor} (${row.zone_label || 'zone'}).` : null,
      row.k_per_game !== null ? `${row.k_per_game} umpire K/game sample.` : null,
      row.bb_per_game !== null ? `${row.bb_per_game} BB/game sample.` : null
    ].filter(Boolean)
  }]))

  const gamesById = {}
  games.forEach((game) => {
    const awayBullpen = bullpenByTeamName[normalizeName(game.away_team)] || null
    const homeBullpen = bullpenByTeamName[normalizeName(game.home_team)] || null
    const gameId = `${slugify(game.away_team)}-${slugify(game.home_team)}`
    gamesById[gameId] = {
      gamePk: game.game_pk,
      gameDate: game.game_date,
      awayTeam: game.away_team,
      homeTeam: game.home_team,
      away: { bullpen: awayBullpen },
      home: { bullpen: homeBullpen },
      umpire: umpireByGamePk[String(game.game_pk)] || null
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    date,
    source: 'sql-mlb.db shadow addendums',
    coverage: {
      games: games.length,
      teamsWithBullpen: Object.keys(bullpenByTeamSlug).length,
      exactUmpireGames: Object.keys(umpireByGamePk).length
    },
    gamesById,
    bullpenByTeamName
  }
}

const existing = {}
try {
  const current = await fs.readFile(outPath, 'utf8')
  const match = current.match(/export const mlbShadowAddendumsByDate = ([\s\S]*?)\n\nexport default/)
  if (match) Object.assign(existing, JSON.parse(match[1]))
} catch {}

dates.forEach((date) => {
  existing[date] = buildDatePayload(date)
})

const text = `// Generated by scripts/generate-mlb-shadow-addendums.mjs. Do not edit by hand.\nexport const mlbShadowAddendumsByDate = ${JSON.stringify(existing, null, 2)}\n\nexport default mlbShadowAddendumsByDate\n`
await fs.writeFile(outPath, text)
console.log(JSON.stringify({
  status: 'ok',
  outPath: path.relative(rootDir, outPath),
  dates,
  coverage: Object.fromEntries(dates.map((date) => [date, existing[date]?.coverage || null]))
}, null, 2))

import { execFileSync, execSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const season = 2026

const officialToDeskTeam = {
  'Washington Nationals': 'Nationals',
  'Miami Marlins': 'Marlins',
  Athletics: 'Athletics',
  'Baltimore Orioles': 'Orioles',
  'Tampa Bay Rays': 'Rays',
  'Boston Red Sox': 'Red Sox',
  'Colorado Rockies': 'Rockies',
  'Philadelphia Phillies': 'Phillies',
  'Los Angeles Angels': 'Angels',
  'Toronto Blue Jays': 'Blue Jays',
  'Houston Astros': 'Astros',
  'Cincinnati Reds': 'Reds',
  'Minnesota Twins': 'Twins',
  'Cleveland Guardians': 'Guardians',
  'Seattle Mariners': 'Mariners',
  'Chicago White Sox': 'White Sox',
  'New York Yankees': 'Yankees',
  'Milwaukee Brewers': 'Brewers',
  'Chicago Cubs': 'Cubs',
  'Texas Rangers': 'Rangers',
  'Pittsburgh Pirates': 'Pirates',
  'San Francisco Giants': 'Giants',
  'Atlanta Braves': 'Braves',
  'Los Angeles Dodgers': 'Dodgers',
  'St. Louis Cardinals': 'Cardinals',
  'San Diego Padres': 'Padres',
  'New York Mets': 'Mets',
  'Arizona Diamondbacks': 'Diamondbacks',
  'Kansas City Royals': 'Royals',
  'Detroit Tigers': 'Tigers'
}

const deskToOfficialTeam = Object.fromEntries(
  Object.entries(officialToDeskTeam).map(([official, desk]) => [desk, official])
)

const deskTeamToRtAbbreviation = {
  Astros: 'HOU',
  Cubs: 'CHC',
  Cardinals: 'STL',
  Reds: 'CIN',
  Guardians: 'CLE',
  Phillies: 'PHI',
  Rays: 'TB',
  Yankees: 'NYY',
  Pirates: 'PIT',
  'Blue Jays': 'TOR',
  Twins: 'MIN',
  'Red Sox': 'BOS',
  Mets: 'NYM',
  Marlins: 'MIA',
  Tigers: 'DET',
  Orioles: 'BAL',
  Nationals: 'WSH',
  Braves: 'ATL',
  Dodgers: 'LAD',
  Brewers: 'MIL',
  Rockies: 'COL',
  Diamondbacks: 'ARI',
  Royals: 'KC',
  Mariners: 'SEA',
  'White Sox': 'CWS',
  Rangers: 'TEX',
  Angels: 'LAA',
  Athletics: 'ATH',
  Padres: 'SD',
  Giants: 'SF'
}

const customSlugsByDeskTeam = {
  'Blue Jays': 'blue-jays',
  'Red Sox': 'red-sox',
  'White Sox': 'white-sox',
  Diamondbacks: 'diamondbacks'
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: null,
    baselineContextDate: '2026-05-15'
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') options.date = args[++index]
    else if (arg === '--baseline-context-date') options.baselineContextDate = args[++index]
  }

  if (!options.date) {
    throw new Error('Missing required --date argument, expected YYYY-MM-DD.')
  }

  return options
}

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })

  if (!response.ok) {
    throw new Error(`Failed request ${response.status} for ${url}`)
  }

  return response.json()
}

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })

  if (!response.ok) {
    throw new Error(`Failed request ${response.status} for ${url}`)
  }

  return response.text()
}

const parseBaseballInnings = (value = 0) => {
  const stringValue = `${value}`.trim()
  const match = stringValue.match(/^(\d+)(?:\.(\d))?$/)

  if (!match) return Number(stringValue) || 0

  const wholeInnings = Number(match[1])
  const partialOuts = Number(match[2] || 0)
  return wholeInnings + (partialOuts === 1 ? 1 / 3 : partialOuts === 2 ? 2 / 3 : 0)
}

const slugifyDeskTeam = (teamName = '') =>
  customSlugsByDeskTeam[teamName] ||
  teamName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const toMatchupSlug = (awayDeskTeam, homeDeskTeam) =>
  `${slugifyDeskTeam(awayDeskTeam)}-vs-${slugifyDeskTeam(homeDeskTeam)}`

const buildDeskGameId = ({ awayDesk, homeDesk, gamePk = null, forceUnique = false, gameNumber = null } = {}) => {
  const baseId = `${slugifyDeskTeam(awayDesk)}-${slugifyDeskTeam(homeDesk)}`
  if (!forceUnique) return baseId
  if (Number.isFinite(Number(gameNumber)) && Number(gameNumber) > 0) {
    return `${baseId}-g${Number(gameNumber)}`
  }
  if (Number.isFinite(Number(gamePk)) && Number(gamePk) > 0) {
    return `${baseId}-${Number(gamePk)}`
  }
  return `${baseId}-2`
}

const formatPtStart = (isoString) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  return `${formatter.format(new Date(isoString)).replace(/\s/g, ' ')} PT`
}

const getPtStartMinutes = (isoString) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date(isoString))

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

const normalizePitchHand = (value = '') => {
  const normalized = `${value}`.trim().toUpperCase()
  if (normalized.startsWith('L')) return 'L'
  if (normalized.startsWith('R')) return 'R'
  return ''
}

const formatDecimalString = (value, digits = 2) =>
  Number.isFinite(value) ? Number(value).toFixed(digits) : '-'

const formatInningsString = (value) => {
  if (!Number.isFinite(value)) return '-'
  const whole = Math.trunc(value)
  const remainder = value - whole
  if (Math.abs(remainder - 1 / 3) < 0.05) return `${whole}.1`
  if (Math.abs(remainder - 2 / 3) < 0.05) return `${whole}.2`
  return `${whole}.0`
}

const parseXmlAttributes = (text = '') =>
  Object.fromEntries(
    [...text.matchAll(/([a-z0-9-]+)="([^"]*)"/gi)].map((match) => [match[1], match[2]])
  )

const parseStarterRecord = (value = '') => {
  const match = `${value}`.match(/\((\d+)-(\d+)\)/)
  if (!match) return null
  return { wins: Number(match[1]), losses: Number(match[2]) }
}

const isPostponedScheduleGame = (game = {}) =>
  `${game?.status?.detailedState || ''}`.toLowerCase() === 'postponed' ||
  `${game?.status?.statusCode || ''}`.toUpperCase() === 'DR'

const normalizeNameToken = (value = '') =>
  `${value}`
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const slugifyPlayerName = (value = '') =>
  `${value}`
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const buildBaseballSavantLinks = ({ playerId, fullName, seasonYear = season, type = 'pitching' } = {}) => {
  if (!Number.isFinite(Number(playerId))) return null

  const normalizedType = type === 'hitting' ? 'hitting' : 'pitching'
  const statsSuffix = normalizedType === 'hitting' ? 'r-hitting-mlb' : 'r-pitching-mlb'
  const playerSlug = slugifyPlayerName(fullName || `player-${playerId}`) || `player-${playerId}`
  const playerUrl = `https://baseballsavant.mlb.com/savant-player/${playerSlug}-${Number(playerId)}`
  const buildStatsUrl = (statsKey) => `${playerUrl}?stats=${statsKey}-${statsSuffix}&season=${seasonYear}`

  return {
    playerId: Number(playerId),
    playerUrl,
    statsSuffix,
    season: seasonYear,
    statsUrls: {
      statcast: buildStatsUrl('statcast'),
      splits: buildStatsUrl('splits'),
      gamelogs: buildStatsUrl('gamelogs')
    }
  }
}

const buildPitcherFallbackSummary = ({ fullName = '', record = '' } = {}) => {
  const parsedRecord = parseStarterRecord(record)
  return {
    id: null,
    fullName,
    pitchHand: '',
    wins: parsedRecord?.wins ?? 0,
    losses: parsedRecord?.losses ?? 0,
    era: '-',
    strikeOuts: 0,
    inningsPitched: '-',
    hitsAllowed: 0,
    walks: 0,
    homeRunsAllowed: 0,
    whip: null,
    gamesStarted: 0,
    probableSource: 'rtsports-fallback',
    savant: null
  }
}

const buildPitcherSummary = (person = null) => {
  const stat = person?.stats?.[0]?.splits?.[0]?.stat ?? {}
  const inningsFloat = parseBaseballInnings(stat.inningsPitched ?? 0)
  const hitsAllowed = Number(stat.hits ?? 0)
  const walks = Number(stat.baseOnBalls ?? 0)
  const homeRunsAllowed = Number(stat.homeRuns ?? 0)

  return {
    id: Number(person?.id ?? 0) || null,
    fullName: person?.fullName || '',
    pitchHand: normalizePitchHand(person?.pitchHand?.code || person?.pitchHand?.description || ''),
    wins: Number(stat.wins ?? 0),
    losses: Number(stat.losses ?? 0),
    era: Number.isFinite(Number(stat.era)) ? formatDecimalString(Number(stat.era), 2) : '-',
    strikeOuts: Number(stat.strikeOuts ?? 0),
    inningsPitched: inningsFloat > 0 ? formatInningsString(inningsFloat) : '-',
    hitsAllowed: Number.isFinite(hitsAllowed) ? hitsAllowed : null,
    walks: Number.isFinite(walks) ? walks : null,
    homeRunsAllowed: Number.isFinite(homeRunsAllowed) ? homeRunsAllowed : null,
    whip: Number.isFinite(Number(stat.whip)) ? formatDecimalString(Number(stat.whip), 2) : null,
    gamesStarted: Number(stat.gamesStarted ?? 0) || 0,
    probableSource: 'mlb-api',
    savant: buildBaseballSavantLinks({
      playerId: Number(person?.id ?? 0) || null,
      fullName: person?.fullName || '',
      seasonYear: season,
      type: 'pitching'
    })
  }
}

const fetchRtSportsProbables = async (date) => {
  const xml = await fetchText(`https://rtsports.com/baseball/mlb-schedule-provider.php?START=${date}&DAYS=1`)
  const dateBlock = xml.match(new RegExp(`<mlb-schedule[^>]*date="${date}"[^>]*>([\\s\\S]*?)</mlb-schedule>`, 'i'))
  if (!dateBlock) return {}

  const byMatchupKey = {}
  for (const match of dateBlock[1].matchAll(/<game\s+([^>]+?)\/>/gi)) {
    const attrs = parseXmlAttributes(match[1])
    const key = `${attrs['away-abbreviation'] || ''}-${attrs['home-abbreviation'] || ''}`
    if (!byMatchupKey[key]) byMatchupKey[key] = []
    byMatchupKey[key].push({
      awayStarter: attrs['away-starter'] || '',
      awayStarterRecord: attrs['away-starter-record'] || '',
      homeStarter: attrs['home-starter'] || '',
      homeStarterRecord: attrs['home-starter-record'] || '',
      gameTime: attrs['game-time'] || ''
    })
  }

  return byMatchupKey
}

const starterUsageOverridesByPitcherId = {
  543037: {
    when: ({ seasonStarts }) => seasonStarts === 0,
    status: 'return-from-surgery',
    label: 'Season debut after rehab',
    note: 'Making his 2026 MLB debut after completing rehab from March 2025 Tommy John surgery, so command, feel, and length should still be treated as comeback-volatile on day one.',
    expectedInnings: 4.8,
    workloadLabel: '4-5 inning lane'
  },
  680570: {
    when: ({ seasonStarts, startsLoaded }) => seasonStarts <= 1 || startsLoaded <= 1,
    status: 'fresh-off-il',
    label: 'Fresh off IL',
    note: 'Opened 2026 on the injured list with right shoulder inflammation and only recently returned, so the first few outings should still be treated as short-leash and high-variance.',
    expectedInnings: 4.2,
    workloadLabel: 'Short leash'
  }
}

const tableRowCells = (rowHtml = '') =>
  [...rowHtml.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((match) =>
    match[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )

const parseOddsText = (value = '') => value.replace(/\s*\+\s*$/, '').trim()

const parseHighlightedOrFirstOdds = (rowHtml = '') => {
  const anchors = [...rowHtml.matchAll(/<a [^>]*class="([^"]*)"[^>]*>(.*?)<\/a>/gs)].map((match) => ({
    className: match[1] || '',
    body: match[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }))

  const best = anchors.find((anchor) => /highlight/.test(anchor.className))
  return parseOddsText(best?.body || anchors[0]?.body || '')
}

const extractOddsRows = (html, table) => {
  const tableMatch = html.match(new RegExp(`<tbody id="odds-table-${table}--\\d+".*?<\\/tbody>`, 's'))
  if (!tableMatch) return []
  return [...tableMatch[0].matchAll(/<tr>(.*?)<\/tr>/gs)].map((match) => match[1])
}

const parseMatchupOdds = async (awayDeskTeam, homeDeskTeam) => {
  const slug = toMatchupSlug(awayDeskTeam, homeDeskTeam)
  const url = `https://www.scoresandodds.com/mlb/${slug}`
  const html = await fetchText(url)
  const moneylineRows = extractOddsRows(html, 'moneyline')
  const spreadRows = extractOddsRows(html, 'spread')
  const totalRows = extractOddsRows(html, 'total')

  const moneylineAway = parseHighlightedOrFirstOdds(moneylineRows[0])
  const moneylineHome = parseHighlightedOrFirstOdds(moneylineRows[1])
  const spreadAway = parseHighlightedOrFirstOdds(spreadRows[0])
  const spreadHome = parseHighlightedOrFirstOdds(spreadRows[1])
  const totalOver = parseHighlightedOrFirstOdds(totalRows[0])
  const totalUnder = parseHighlightedOrFirstOdds(totalRows[1])

  return {
    spread: spreadAway && spreadHome ? `${spreadAway} / ${spreadHome}` : '',
    total: totalOver && totalUnder ? `${totalOver} / ${totalUnder}` : '',
    moneyline: moneylineAway && moneylineHome ? `${awayDeskTeam} ${moneylineAway} / ${homeDeskTeam} ${moneylineHome}` : '',
    oddsPage: url
  }
}

const runSqliteJson = (sql) => {
  const output = execFileSync(
    'sqlite3',
    ['-json', path.join(rootDir, 'data-private', 'warehouse', 'sports.db'), sql],
    { encoding: 'utf8', cwd: rootDir }
  )
  return JSON.parse(output || '[]')
}

const buildBullpenChainByTeam = ({ date, games }) => {
  const rows = runSqliteJson(
    `select team_name, pitcher_id, pitcher_name, likely_role, first_reliever_likelihood, availability_score, bridge_score, worked_yesterday_flag, back_to_back_flag, last_appearance_date, avg_outs_per_appearance from mlb_bullpen_usage where as_of_date='${date}' order by team_name, first_reliever_likelihood desc;`
  )

  const starterNames = new Set(
    games.flatMap((game) => [game.awayPitcher.fullName, game.homePitcher.fullName]).filter(Boolean)
  )
  const opponentByTeam = Object.fromEntries(
    games.flatMap((game) => [
      [game.away, game.home],
      [game.home, game.away]
    ])
  )

  const grouped = rows.reduce((map, row) => {
    const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
    if (!map.has(deskTeam)) map.set(deskTeam, [])
    map.get(deskTeam).push(row)
    return map
  }, new Map())

  return Object.fromEntries(
    [...grouped.entries()].map(([teamName, relievers]) => {
      const filtered = relievers.filter((reliever) => {
        if (starterNames.has(reliever.pitcher_name)) return false
        return Number(reliever.avg_outs_per_appearance ?? 0) <= 8.5
      })
      const chosen = (filtered.length ? filtered : relievers).slice(0, 2)

      return [
        teamName,
        {
          opponent: opponentByTeam[teamName] || '',
          topRelievers: chosen.map((reliever) => ({
            pitcherId: Number(reliever.pitcher_id || 0) || null,
            name: reliever.pitcher_name,
            role: reliever.likely_role || 'middle',
            firstRelieverLikelihood: Number(Number(reliever.first_reliever_likelihood || 0).toFixed(2)),
            availabilityScore: Number(Number(reliever.availability_score || 0).toFixed(2)),
            bridgeScore: Number(Number(reliever.bridge_score || 0).toFixed(1)),
            expectedOuts: Number(Number(reliever.avg_outs_per_appearance || 0).toFixed(2)),
            workedYesterday: Boolean(reliever.worked_yesterday_flag),
            backToBack: Boolean(reliever.back_to_back_flag),
            lastAppearanceDate: reliever.last_appearance_date || ''
          }))
        }
      ]
    })
  )
}

const roundMaybe = (value, digits = 2) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : null
}

const isOnBaseEventType = (eventType = '') => {
  const normalized = String(eventType || '').toLowerCase()
  if (!normalized) return false
  if (['single', 'double', 'triple', 'home_run', 'walk', 'intent_walk', 'hit_by_pitch', 'catcher_interference'].includes(normalized)) {
    return true
  }
  return normalized.includes('error')
}

const daysBetweenIso = (earlierIsoDate = '', laterIsoDate = '') => {
  if (!earlierIsoDate || !laterIsoDate) return null
  const earlier = new Date(`${earlierIsoDate}T12:00:00Z`)
  const later = new Date(`${laterIsoDate}T12:00:00Z`)
  const diff = later.getTime() - earlier.getTime()
  return Number.isFinite(diff) ? Math.round(diff / 86400000) : null
}

const choosePreferredPitcherForm = (rows = []) => {
  if (!rows.length) return null

  return [...rows].sort((left, right) => {
    const sampleGap = Number(right.starts_sample || 0) - Number(left.starts_sample || 0)
    if (sampleGap !== 0) return sampleGap

    const windowGap = Math.abs(Number(left.window_starts || 99) - 3) - Math.abs(Number(right.window_starts || 99) - 3)
    if (windowGap !== 0) return windowGap

    return Number(left.window_starts || 99) - Number(right.window_starts || 99)
  })[0]
}

const buildRecentStarterFormByPitcherId = ({ date, games }) => {
  const pitcherIds = [
    ...new Set(
      games.flatMap((game) => [game.awayPitcher?.id, game.homePitcher?.id]).filter((value) => Number.isFinite(value))
    )
  ]

  if (!pitcherIds.length) return {}

  const rows = runSqliteJson(
    `select pitcher_id, pitcher_name, window_starts, starts_sample, innings_per_start, earned_runs_per_start, hits_allowed_per_start, home_runs_allowed_per_start, walks_allowed_per_start, strikeouts_per_start, whip_like, short_start_rate, quality_start_rate, run_volatility, home_run_burstiness, recent_3_earned_runs_delta from mlb_starting_pitcher_rolling_form where as_of_date='${date}' and pitcher_id in (${pitcherIds.join(',')}) order by pitcher_id, window_starts;`
  )

  const grouped = rows.reduce((map, row) => {
    const key = Number(row.pitcher_id)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(row)
    return map
  }, new Map())

  return Object.fromEntries(
    [...grouped.entries()].map(([pitcherId, pitcherRows]) => {
      const chosen = choosePreferredPitcherForm(pitcherRows)
      if (!chosen) return [pitcherId, null]

      return [
        pitcherId,
        {
          pitcherName: chosen.pitcher_name || '',
          windowStarts: Number(chosen.window_starts || 0) || null,
          startsSample: Number(chosen.starts_sample || 0) || 0,
          inningsPerStart: roundMaybe(chosen.innings_per_start),
          earnedRunsPerStart: roundMaybe(chosen.earned_runs_per_start),
          hitsAllowedPerStart: roundMaybe(chosen.hits_allowed_per_start),
          homeRunsAllowedPerStart: roundMaybe(chosen.home_runs_allowed_per_start),
          walksAllowedPerStart: roundMaybe(chosen.walks_allowed_per_start),
          strikeoutsPerStart: roundMaybe(chosen.strikeouts_per_start),
          whipLike: roundMaybe(chosen.whip_like),
          shortStartRate: roundMaybe(chosen.short_start_rate),
          qualityStartRate: roundMaybe(chosen.quality_start_rate),
          runVolatility: roundMaybe(chosen.run_volatility),
          homeRunBurstiness: roundMaybe(chosen.home_run_burstiness),
          recent3EarnedRunsDelta: roundMaybe(chosen.recent_3_earned_runs_delta)
        }
      ]
    })
  )
}

const buildStarterUsageContextByPitcherId = ({ date, games }) => {
  const pitcherIds = [
    ...new Set(
      games.flatMap((game) => [game.awayPitcher?.id, game.homePitcher?.id]).filter((value) => Number.isFinite(value))
    )
  ]

  if (!pitcherIds.length) return {}

  const rows = runSqliteJson(
    `select pitcher_id, pitcher_name, count(*) as starts_loaded, min(game_date) as first_start_date, max(game_date) as last_start_date, avg(innings_pitched) as avg_innings_per_start, avg(pitches_thrown) as avg_pitches, sum(case when innings_pitched < 4 then 1 else 0 end) as short_starts, sum(case when innings_pitched >= 6 then 1 else 0 end) as durable_starts from mlb_starting_pitcher_game_logs where game_date < '${date}' and pitcher_id in (${pitcherIds.join(',')}) and innings_pitched is not null and outs_recorded is not null group by pitcher_id, pitcher_name;`
  )

  return Object.fromEntries(
    rows.map((row) => [
      Number(row.pitcher_id),
      {
        startsLoaded: Number(row.starts_loaded || 0) || 0,
        firstStartDate: row.first_start_date || '',
        lastStartDate: row.last_start_date || '',
        avgInningsPerStart: roundMaybe(row.avg_innings_per_start),
        avgPitches: roundMaybe(row.avg_pitches, 0),
        shortStartRate:
          Number(row.starts_loaded || 0) > 0 ? roundMaybe(Number(row.short_starts || 0) / Number(row.starts_loaded || 1)) : null,
        durableStartRate:
          Number(row.starts_loaded || 0) > 0 ? roundMaybe(Number(row.durable_starts || 0) / Number(row.starts_loaded || 1)) : null
      }
    ])
  )
}

const buildStarterLeashByPitcherId = ({ date, games, windowStarts = 5 }) => {
  const pitcherIds = [
    ...new Set(
      games.flatMap((game) => [game.awayPitcher?.id, game.homePitcher?.id]).filter((value) => Number.isFinite(value))
    )
  ]

  if (!pitcherIds.length) return {}

  const rows = runSqliteJson(
    `select pitcher_id, pitcher_name, window_starts, starts_sample, outs_per_start, innings_per_start, pitches_per_start, short_start_rate, five_plus_inning_rate, six_plus_inning_rate, ninety_pitch_rate, leash_volatility, recent_3_outs_delta, leash_score from mlb_starter_leash_profiles where as_of_date='${date}' and window_starts=${windowStarts} and pitcher_id in (${pitcherIds.join(',')}) order by pitcher_id;`
  )

  return Object.fromEntries(
    rows.map((row) => [
      Number(row.pitcher_id),
      {
        pitcherName: row.pitcher_name || '',
        windowStarts: Number(row.window_starts || 0) || null,
        startsSample: Number(row.starts_sample || 0) || 0,
        outsPerStart: roundMaybe(row.outs_per_start),
        inningsPerStart: roundMaybe(row.innings_per_start),
        pitchesPerStart: roundMaybe(row.pitches_per_start, 0),
        shortStartRate: roundMaybe(row.short_start_rate),
        fivePlusInningRate: roundMaybe(row.five_plus_inning_rate),
        sixPlusInningRate: roundMaybe(row.six_plus_inning_rate),
        ninetyPitchRate: roundMaybe(row.ninety_pitch_rate),
        leashVolatility: roundMaybe(row.leash_volatility),
        recent3OutsDelta: roundMaybe(row.recent_3_outs_delta),
        leashScore: roundMaybe(row.leash_score)
      }
    ])
  )
}

const buildTeamStoryPriorsByTeam = ({ date, games, windowGames = 10 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `select team_name, window_games, games_sample, win_rate, quiet_first5_rate, first_inning_jolt_rate, comeback_win_rate, blew_lead_loss_rate, bullpen_flip_win_rate, bullpen_flip_loss_rate, late_break_rate, starter_cracked_rate, traffic_no_conversion_rate, low_total_game_rate, high_total_game_rate, avg_first_scoring_inning, avg_total_runs_first5, avg_total_runs_final, story_instability_index from mlb_team_story_priors where as_of_date='${date}' and window_games=${windowGames} and team_name in (${quotedTeams}) order by team_name;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
      return [
        deskTeam,
        {
          windowGames: Number(row.window_games || 0) || null,
          gamesSample: Number(row.games_sample || 0) || 0,
          winRate: roundMaybe(row.win_rate),
          quietFirst5Rate: roundMaybe(row.quiet_first5_rate),
          firstInningJoltRate: roundMaybe(row.first_inning_jolt_rate),
          comebackWinRate: roundMaybe(row.comeback_win_rate),
          blewLeadLossRate: roundMaybe(row.blew_lead_loss_rate),
          bullpenFlipWinRate: roundMaybe(row.bullpen_flip_win_rate),
          bullpenFlipLossRate: roundMaybe(row.bullpen_flip_loss_rate),
          lateBreakRate: roundMaybe(row.late_break_rate),
          starterCrackedRate: roundMaybe(row.starter_cracked_rate),
          trafficNoConversionRate: roundMaybe(row.traffic_no_conversion_rate),
          lowTotalGameRate: roundMaybe(row.low_total_game_rate),
          highTotalGameRate: roundMaybe(row.high_total_game_rate),
          avgFirstScoringInning: roundMaybe(row.avg_first_scoring_inning),
          avgTotalRunsFirst5: roundMaybe(row.avg_total_runs_first5),
          avgTotalRunsFinal: roundMaybe(row.avg_total_runs_final),
          storyInstabilityIndex: roundMaybe(row.story_instability_index)
        }
      ]
    })
  )
}

const buildTeamStateByTeam = ({ date, games }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `select team_name, scheduled_opponent, scheduled_series_game_number, division_matchup_flag, games_sample, previous_result, streak_direction, streak_length, win_pct_last3, win_pct_last5, run_diff_last3, run_diff_last5, close_loss_count_last5, blowout_win_count_last5, blowout_loss_count_last5, comeback_win_count_last5, bullpen_flip_loss_count_last5, quiet_first5_count_last5, first_inning_jolt_count_last5, opponent_win_pct_last5, snapback_pressure_index, heat_regression_index, form_pressure_index from mlb_team_state_snapshots where as_of_date='${date}' and team_name in (${quotedTeams}) order by team_name;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
      return [
        deskTeam,
        {
          scheduledOpponent: officialToDeskTeam[row.scheduled_opponent] || row.scheduled_opponent || '',
          scheduledSeriesGameNumber: Number(row.scheduled_series_game_number || 0) || null,
          divisionMatchupFlag: Boolean(row.division_matchup_flag),
          gamesSample: Number(row.games_sample || 0) || 0,
          previousResult: row.previous_result || null,
          streakDirection: row.streak_direction || null,
          streakLength: Number(row.streak_length || 0) || 0,
          winPctLast3: roundMaybe(row.win_pct_last3),
          winPctLast5: roundMaybe(row.win_pct_last5),
          runDiffLast3: roundMaybe(row.run_diff_last3),
          runDiffLast5: roundMaybe(row.run_diff_last5),
          closeLossCountLast5: Number(row.close_loss_count_last5 || 0) || 0,
          blowoutWinCountLast5: Number(row.blowout_win_count_last5 || 0) || 0,
          blowoutLossCountLast5: Number(row.blowout_loss_count_last5 || 0) || 0,
          comebackWinCountLast5: Number(row.comeback_win_count_last5 || 0) || 0,
          bullpenFlipLossCountLast5: Number(row.bullpen_flip_loss_count_last5 || 0) || 0,
          quietFirst5CountLast5: Number(row.quiet_first5_count_last5 || 0) || 0,
          firstInningJoltCountLast5: Number(row.first_inning_jolt_count_last5 || 0) || 0,
          opponentWinPctLast5: roundMaybe(row.opponent_win_pct_last5),
          snapbackPressureIndex: roundMaybe(row.snapback_pressure_index),
          heatRegressionIndex: roundMaybe(row.heat_regression_index),
          formPressureIndex: roundMaybe(row.form_pressure_index)
        }
      ]
    })
  )
}

const buildTeamMistakeShapeByTeam = ({ date, games, windowGames = 8 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `select team_name, window_games, games_sample, low_scoring_game_rate, high_scoring_game_rate, scoreless_first3_rate, first_inning_run_allowed_rate, early_multi_run_allowed_rate, one_big_inning_rate, one_bad_inning_allowed_rate, traffic_game_rate, dead_bat_traffic_rate, traffic_no_conversion_rate, base_runner_conversion_rate, stranded_traffic_rate, top_order_pressure_no_conversion_rate, bullpen_meltdown_rate, run_clustering_index, mistake_chaos_index from mlb_team_mistake_shape_daily where as_of_date='${date}' and window_games=${windowGames} and team_name in (${quotedTeams}) order by team_name;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
      return [
        deskTeam,
        {
          windowGames: Number(row.window_games || 0) || null,
          gamesSample: Number(row.games_sample || 0) || 0,
          lowScoringGameRate: roundMaybe(row.low_scoring_game_rate),
          highScoringGameRate: roundMaybe(row.high_scoring_game_rate),
          scorelessFirst3Rate: roundMaybe(row.scoreless_first3_rate),
          firstInningRunAllowedRate: roundMaybe(row.first_inning_run_allowed_rate),
          earlyMultiRunAllowedRate: roundMaybe(row.early_multi_run_allowed_rate),
          oneBigInningRate: roundMaybe(row.one_big_inning_rate),
          oneBadInningAllowedRate: roundMaybe(row.one_bad_inning_allowed_rate),
          trafficGameRate: roundMaybe(row.traffic_game_rate),
          deadBatTrafficRate: roundMaybe(row.dead_bat_traffic_rate),
          trafficNoConversionRate: roundMaybe(row.traffic_no_conversion_rate),
          baseRunnerConversionRate: roundMaybe(row.base_runner_conversion_rate),
          strandedTrafficRate: roundMaybe(row.stranded_traffic_rate),
          topOrderPressureNoConversionRate: roundMaybe(row.top_order_pressure_no_conversion_rate),
          bullpenMeltdownRate: roundMaybe(row.bullpen_meltdown_rate),
          runClusteringIndex: roundMaybe(row.run_clustering_index),
          mistakeChaosIndex: roundMaybe(row.mistake_chaos_index)
        }
      ]
    })
  )
}

const buildLineupConversionShapeByTeam = ({ date, games, windowGames = 8 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `select team_name, window_games, games_sample, baserunners_per_game, runs_per_baserunner, stranded_traffic_rate, early_baserunners_per_game, early_conversion_rate, top_order_baserunners_first3_per_game, top_order_conversion_share, traffic_no_conversion_rate, dead_bat_traffic_rate, quiet_first5_rate, conversion_volatility, lineup_conversion_index from mlb_lineup_conversion_shape_daily where as_of_date='${date}' and window_games=${windowGames} and team_name in (${quotedTeams}) order by team_name;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
      return [
        deskTeam,
        {
          windowGames: Number(row.window_games || 0) || null,
          gamesSample: Number(row.games_sample || 0) || 0,
          baserunnersPerGame: roundMaybe(row.baserunners_per_game),
          runsPerBaserunner: roundMaybe(row.runs_per_baserunner),
          strandedTrafficRate: roundMaybe(row.stranded_traffic_rate),
          earlyBaserunnersPerGame: roundMaybe(row.early_baserunners_per_game),
          earlyConversionRate: roundMaybe(row.early_conversion_rate),
          topOrderBaserunnersFirst3PerGame: roundMaybe(row.top_order_baserunners_first3_per_game),
          topOrderConversionShare: roundMaybe(row.top_order_conversion_share),
          trafficNoConversionRate: roundMaybe(row.traffic_no_conversion_rate),
          deadBatTrafficRate: roundMaybe(row.dead_bat_traffic_rate),
          quietFirst5Rate: roundMaybe(row.quiet_first5_rate),
          conversionVolatility: roundMaybe(row.conversion_volatility),
          lineupConversionIndex: roundMaybe(row.lineup_conversion_index)
        }
      ]
    })
  )
}

const buildBullpenMistakeShapeByTeam = ({ date, games, windowDays = 14 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `select team_name, window_days, appearances_sample, games_sample, first_batter_reach_rate, first_batter_walk_rate, meltdown_appearance_rate, home_run_appearance_rate, inherited_traffic_entry_rate, inherited_traffic_score_rate, bullpen_meltdown_game_rate, lead_loss_after_entry_rate, bridge_clean_game_rate, bullpen_chaos_index from mlb_bullpen_mistake_shape_daily where as_of_date='${date}' and window_days=${windowDays} and team_name in (${quotedTeams}) order by team_name;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
      return [
        deskTeam,
        {
          windowDays: Number(row.window_days || 0) || null,
          appearancesSample: Number(row.appearances_sample || 0) || 0,
          gamesSample: Number(row.games_sample || 0) || 0,
          firstBatterReachRate: roundMaybe(row.first_batter_reach_rate),
          firstBatterWalkRate: roundMaybe(row.first_batter_walk_rate),
          meltdownAppearanceRate: roundMaybe(row.meltdown_appearance_rate),
          homeRunAppearanceRate: roundMaybe(row.home_run_appearance_rate),
          inheritedTrafficEntryRate: roundMaybe(row.inherited_traffic_entry_rate),
          inheritedTrafficScoreRate: roundMaybe(row.inherited_traffic_score_rate),
          bullpenMeltdownGameRate: roundMaybe(row.bullpen_meltdown_game_rate),
          leadLossAfterEntryRate: roundMaybe(row.lead_loss_after_entry_rate),
          bridgeCleanGameRate: roundMaybe(row.bridge_clean_game_rate),
          bullpenChaosIndex: roundMaybe(row.bullpen_chaos_index)
        }
      ]
    })
  )
}

const buildFirstInningTeamProfilesByTeam = ({ date, games, windowGames = 8 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `select team_name, window_games, games_sample, first_inning_runs_per_game, first_inning_runs_allowed_per_game, scored_first_inning_rate, scoreless_first_inning_rate, allowed_first_inning_rate, first_inning_multi_run_rate, first_inning_multi_run_allowed_rate, nrfi_game_rate, yrfi_game_rate, first_inning_net_edge, first_inning_scoring_index, first_inning_allow_risk_index from mlb_team_first_inning_profiles_daily where as_of_date='${date}' and window_games=${windowGames} and team_name in (${quotedTeams}) order by team_name;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
      return [
        deskTeam,
        {
          windowGames: Number(row.window_games || 0) || null,
          gamesSample: Number(row.games_sample || 0) || 0,
          firstInningRunsPerGame: roundMaybe(row.first_inning_runs_per_game),
          firstInningRunsAllowedPerGame: roundMaybe(row.first_inning_runs_allowed_per_game),
          scoredFirstInningRate: roundMaybe(row.scored_first_inning_rate),
          scorelessFirstInningRate: roundMaybe(row.scoreless_first_inning_rate),
          allowedFirstInningRate: roundMaybe(row.allowed_first_inning_rate),
          firstInningMultiRunRate: roundMaybe(row.first_inning_multi_run_rate),
          firstInningMultiRunAllowedRate: roundMaybe(row.first_inning_multi_run_allowed_rate),
          nrfiGameRate: roundMaybe(row.nrfi_game_rate),
          yrfiGameRate: roundMaybe(row.yrfi_game_rate),
          firstInningNetEdge: roundMaybe(row.first_inning_net_edge),
          firstInningScoringIndex: roundMaybe(row.first_inning_scoring_index),
          firstInningAllowRiskIndex: roundMaybe(row.first_inning_allow_risk_index)
        }
      ]
    })
  )
}

const buildFirstInningPitcherProfilesByPitcherId = ({ date, games, windowStarts = 5 }) => {
  const pitcherIds = [
    ...new Set(
      games
        .flatMap((game) => [Number(game.awayPitcher?.id), Number(game.homePitcher?.id)])
        .filter(Number.isFinite)
    )
  ]

  if (!pitcherIds.length) return {}

  const rows = runSqliteJson(
    `select pitcher_id, pitcher_name, window_starts, starts_sample, first_batter_reach_rate, first_inning_run_allowed_rate, first_inning_runs_allowed_per_start, first_inning_multi_run_allowed_rate, first_inning_baserunners_per_start, first_inning_walk_rate, first_inning_home_run_rate, first_inning_clean_rate, first_inning_pressure_index from mlb_pitcher_first_inning_profiles_daily where as_of_date='${date}' and window_starts=${windowStarts} and pitcher_id in (${pitcherIds.join(',')}) order by pitcher_id;`
  )

  const profileByPitcherId = Object.fromEntries(
    rows.map((row) => [
      Number(row.pitcher_id),
      {
        pitcherName: row.pitcher_name || null,
        windowStarts: Number(row.window_starts || 0) || null,
        startsSample: Number(row.starts_sample || 0) || 0,
        firstBatterReachRate: roundMaybe(row.first_batter_reach_rate),
        firstInningRunAllowedRate: roundMaybe(row.first_inning_run_allowed_rate),
        firstInningRunsAllowedPerStart: roundMaybe(row.first_inning_runs_allowed_per_start),
        firstInningMultiRunAllowedRate: roundMaybe(row.first_inning_multi_run_allowed_rate),
        firstInningBaserunnersPerStart: roundMaybe(row.first_inning_baserunners_per_start),
        firstInningWalkRate: roundMaybe(row.first_inning_walk_rate),
        firstInningHomeRunRate: roundMaybe(row.first_inning_home_run_rate),
        firstInningCleanRate: roundMaybe(row.first_inning_clean_rate),
        firstInningPressureIndex: roundMaybe(row.first_inning_pressure_index)
      }
    ])
  )

  pitcherIds.forEach((pitcherId) => {
    if (profileByPitcherId[pitcherId]) return

    const startRows = runSqliteJson(
      `select pitcher_name, game_pk, game_date from mlb_starting_pitcher_game_logs where pitcher_id=${pitcherId} and game_date<'${date}' order by game_date desc, game_pk desc limit ${windowStarts};`
    )

    if (!startRows.length) return

    const packets = startRows
      .map((startRow) => {
        const paRows = runSqliteJson(
          `select at_bat_index, lower(coalesce(event_type, '')) as event_type, run_delta from mlb_plate_appearances where game_pk=${Number(startRow.game_pk)} and pitcher_id=${pitcherId} and inning=1 order by at_bat_index;`
        )

        if (!paRows.length) return null

        const firstPa = paRows[0]
        let baserunners = 0
        let runsAllowed = 0
        let walkFlag = 0
        let homeRunFlag = 0

        paRows.forEach((row) => {
          const eventType = row.event_type || ''
          const runDelta = Number(row.run_delta || 0) || 0
          runsAllowed += runDelta
          if (isOnBaseEventType(eventType)) baserunners += 1
          if (['walk', 'intent_walk', 'hit_by_pitch'].includes(eventType)) walkFlag = 1
          if (eventType === 'home_run') homeRunFlag = 1
        })

        return {
          firstBatterReachFlag: isOnBaseEventType(firstPa.event_type || '') ? 1 : 0,
          firstInningRunAllowedFlag: runsAllowed > 0 ? 1 : 0,
          firstInningMultiRunAllowedFlag: runsAllowed >= 2 ? 1 : 0,
          firstInningRunsAllowed: runsAllowed,
          firstInningBaserunners: baserunners,
          firstInningWalkFlag: walkFlag,
          firstInningHomeRunFlag: homeRunFlag,
          firstInningCleanFlag: runsAllowed === 0 ? 1 : 0
        }
      })
      .filter(Boolean)

    if (!packets.length) return

    const average = (values = []) => {
      if (!values.length) return null
      return values.reduce((sum, value) => sum + value, 0) / values.length
    }

    const firstBatterReachRate = average(packets.map((packet) => packet.firstBatterReachFlag))
    const firstInningRunAllowedRate = average(packets.map((packet) => packet.firstInningRunAllowedFlag))
    const firstInningRunsAllowedPerStart = average(packets.map((packet) => packet.firstInningRunsAllowed))
    const firstInningMultiRunAllowedRate = average(
      packets.map((packet) => packet.firstInningMultiRunAllowedFlag)
    )
    const firstInningBaserunnersPerStart = average(
      packets.map((packet) => packet.firstInningBaserunners)
    )
    const firstInningWalkRate = average(packets.map((packet) => packet.firstInningWalkFlag))
    const firstInningHomeRunRate = average(packets.map((packet) => packet.firstInningHomeRunFlag))
    const firstInningCleanRate = average(packets.map((packet) => packet.firstInningCleanFlag))
    const firstInningPressureIndex = roundMaybe(
      Math.max(
        0,
        Math.min(
          100,
          12 +
            (firstBatterReachRate || 0) * 18 +
            (firstInningRunAllowedRate || 0) * 28 +
            (firstInningRunsAllowedPerStart || 0) * 16 +
            (firstInningMultiRunAllowedRate || 0) * 18 +
            (firstInningBaserunnersPerStart || 0) * 8 +
            (firstInningWalkRate || 0) * 12 +
            (firstInningHomeRunRate || 0) * 14 -
            (firstInningCleanRate || 0) * 8
        )
      )
    )

    profileByPitcherId[pitcherId] = {
      pitcherName: startRows[0]?.pitcher_name || null,
      windowStarts,
      startsSample: packets.length,
      firstBatterReachRate: roundMaybe(firstBatterReachRate),
      firstInningRunAllowedRate: roundMaybe(firstInningRunAllowedRate),
      firstInningRunsAllowedPerStart: roundMaybe(firstInningRunsAllowedPerStart),
      firstInningMultiRunAllowedRate: roundMaybe(firstInningMultiRunAllowedRate),
      firstInningBaserunnersPerStart: roundMaybe(firstInningBaserunnersPerStart),
      firstInningWalkRate: roundMaybe(firstInningWalkRate),
      firstInningHomeRunRate: roundMaybe(firstInningHomeRunRate),
      firstInningCleanRate: roundMaybe(firstInningCleanRate),
      firstInningPressureIndex
    }
  })

  return profileByPitcherId
}

const buildRecentGamesByTeam = ({ date, games, limit = 8 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `with recent_team_games as (
      select
        o.game_pk,
        o.game_date,
        g.game_datetime,
        o.away_team as team_name,
        o.home_team as opponent_name,
        'road' as venue_role,
        o.away_runs_final as runs_for,
        o.home_runs_final as runs_against,
        case
          when o.away_runs_final > o.home_runs_final then 'W'
          when o.away_runs_final < o.home_runs_final then 'L'
          else 'T'
        end as result
      from mlb_game_outcomes o
      join mlb_games g on g.game_pk = o.game_pk
      where o.away_team in (${quotedTeams})
        and o.game_date < '${date}'

      union all

      select
        o.game_pk,
        o.game_date,
        g.game_datetime,
        o.home_team as team_name,
        o.away_team as opponent_name,
        'home' as venue_role,
        o.home_runs_final as runs_for,
        o.away_runs_final as runs_against,
        case
          when o.home_runs_final > o.away_runs_final then 'W'
          when o.home_runs_final < o.away_runs_final then 'L'
          else 'T'
        end as result
      from mlb_game_outcomes o
      join mlb_games g on g.game_pk = o.game_pk
      where o.home_team in (${quotedTeams})
        and o.game_date < '${date}'
    ),
    ranked as (
      select
        *,
        row_number() over (
          partition by team_name
          order by coalesce(game_datetime, game_date) desc, game_pk desc
        ) as rn
      from recent_team_games
    )
    select *
    from ranked
    where rn <= ${Math.max(1, limit)}
    order by team_name, coalesce(game_datetime, game_date) asc, game_pk asc;`
  )

  const grouped = rows.reduce((map, row) => {
    const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
    if (!map.has(deskTeam)) map.set(deskTeam, [])
    map.get(deskTeam).push({
      gamePk: Number(row.game_pk || 0) || null,
      date: row.game_date || '',
      opponent: officialToDeskTeam[row.opponent_name] || row.opponent_name || '',
      venueRole: row.venue_role || '',
      result: row.result || 'T',
      runsFor: Number(row.runs_for || 0) || 0,
      runsAgainst: Number(row.runs_against || 0) || 0
    })
    return map
  }, new Map())

  return Object.fromEntries(
    [...grouped.entries()].map(([deskTeam, gameRows]) => {
      let lastOpponent = null
      let seriesSlot = -1
      const recentGames = gameRows.map((row) => {
        if (row.opponent !== lastOpponent) {
          seriesSlot += 1
          lastOpponent = row.opponent
        }

        return {
          ...row,
          seriesSlot
        }
      })

      return [deskTeam, recentGames]
    })
  )
}

const buildSeriesEarlyPhaseByTeam = ({ date, games, lookbackDays = 5, limit = 3 }) => {
  const matchupPairs = games.flatMap((game) => [
    { team: game.away, opponent: game.home },
    { team: game.home, opponent: game.away }
  ])

  if (!matchupPairs.length) return {}

  const whereClauses = matchupPairs
    .map(({ team, opponent }) => {
      const officialTeam = (deskToOfficialTeam[team] || team).replace(/'/g, "''")
      const officialOpponent = (deskToOfficialTeam[opponent] || opponent).replace(/'/g, "''")
      return `(team_name='${officialTeam}' and opponent_team='${officialOpponent}')`
    })
    .join(' or ')

  const rows = runSqliteJson(
    `with recent_series_phase as (
      select
        *,
        row_number() over (
          partition by team_name, opponent_team
          order by game_date desc, game_pk desc
        ) as rn
      from mlb_phase_outcomes_daily
      where game_date < '${date}'
        and game_date >= date('${date}', '-${Math.max(1, lookbackDays)} days')
        and (${whereClauses})
    )
    select
      team_name,
      opponent_team,
      count(*) as games_sample,
      avg(runs_first1) as runs_first1_per_game,
      avg(runs_first3) as runs_first3_per_game,
      avg(scored_first_inning_flag) as scored_first_inning_rate,
      avg(allowed_first_inning_flag) as allowed_first_inning_rate,
      avg(scoreless_first3_flag) as scoreless_first3_rate,
      avg(tied_after3_flag) as tied_after3_rate,
      avg(traffic_no_conversion_flag) as traffic_no_conversion_rate
    from recent_series_phase
    where rn <= ${Math.max(1, limit)}
    group by team_name, opponent_team
    order by team_name, opponent_team;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
      return [
        deskTeam,
        {
          opponentTeam: officialToDeskTeam[row.opponent_team] || row.opponent_team || '',
          gamesSample: Number(row.games_sample || 0) || 0,
          runsFirst1PerGame: roundMaybe(row.runs_first1_per_game),
          runsFirst3PerGame: roundMaybe(row.runs_first3_per_game),
          scoredFirstInningRate: roundMaybe(row.scored_first_inning_rate),
          allowedFirstInningRate: roundMaybe(row.allowed_first_inning_rate),
          scorelessFirst3Rate: roundMaybe(row.scoreless_first3_rate),
          tiedAfter3Rate: roundMaybe(row.tied_after3_rate),
          trafficNoConversionRate: roundMaybe(row.traffic_no_conversion_rate)
        }
      ]
    })
  )
}

const buildHitterStateByTeam = ({ date, games, topSlots = 6 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `with ranked as (
      select
        team_name,
        player_id,
        player_name,
        batting_order_avg_last5,
        hit_streak_games,
        hitless_streak_games,
        home_run_streak_games,
        hits_per_pa_last5,
        total_bases_per_pa_last5,
        strikeout_rate_last5,
        walk_rate_last5,
        whiff_rate_last5,
        pressure_plate_index,
        cold_streak_index,
        heat_regression_index,
        row_number() over (
          partition by team_name
          order by coalesce(batting_order_avg_last5, 99), player_name asc
        ) as rn
      from mlb_hitter_state_snapshots
      where as_of_date='${date}'
        and team_name in (${quotedTeams})
    )
    select *
    from ranked
    where rn <= ${Math.max(1, topSlots)}
    order by team_name, rn;`
  )

  const grouped = rows.reduce((map, row) => {
    const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
    if (!map.has(deskTeam)) map.set(deskTeam, [])
    map.get(deskTeam).push(row)
    return map
  }, new Map())

  return Object.fromEntries(
    [...grouped.entries()].map(([deskTeam, playerRows]) => {
      const topRows = playerRows.slice(0, topSlots)
      const hottest = [...topRows].sort((left, right) => Number(right.heat_regression_index || 0) - Number(left.heat_regression_index || 0))[0]
      const coldest = [...topRows].sort((left, right) => Number(right.cold_streak_index || 0) - Number(left.cold_streak_index || 0))[0]
      const mostPressured = [...topRows].sort((left, right) => Number(right.pressure_plate_index || 0) - Number(left.pressure_plate_index || 0))[0]

      return [
        deskTeam,
        {
          topSlots,
          hittersTracked: topRows.length,
          top6PressureIndex: roundMaybe(topRows.reduce((sum, row) => sum + Number(row.pressure_plate_index || 0), 0) / Math.max(topRows.length, 1)),
          top6ColdIndex: roundMaybe(topRows.reduce((sum, row) => sum + Number(row.cold_streak_index || 0), 0) / Math.max(topRows.length, 1)),
          top6HeatIndex: roundMaybe(topRows.reduce((sum, row) => sum + Number(row.heat_regression_index || 0), 0) / Math.max(topRows.length, 1)),
          top6WhiffRate: roundMaybe(topRows.reduce((sum, row) => sum + Number(row.whiff_rate_last5 || 0), 0) / Math.max(topRows.length, 1)),
          top6StrikeoutRate: roundMaybe(topRows.reduce((sum, row) => sum + Number(row.strikeout_rate_last5 || 0), 0) / Math.max(topRows.length, 1)),
          top6WalkRate: roundMaybe(topRows.reduce((sum, row) => sum + Number(row.walk_rate_last5 || 0), 0) / Math.max(topRows.length, 1)),
          hottestHitter:
            hottest
              ? {
                  playerId: Number(hottest.player_id || 0) || null,
                  playerName: hottest.player_name || '',
                  heatRegressionIndex: roundMaybe(hottest.heat_regression_index),
                  hitStreakGames: Number(hottest.hit_streak_games || 0) || 0,
                  homeRunStreakGames: Number(hottest.home_run_streak_games || 0) || 0,
                  hitsPerPaLast5: roundMaybe(hottest.hits_per_pa_last5),
                  totalBasesPerPaLast5: roundMaybe(hottest.total_bases_per_pa_last5)
                }
              : null,
          coldestHitter:
            coldest
              ? {
                  playerId: Number(coldest.player_id || 0) || null,
                  playerName: coldest.player_name || '',
                  coldStreakIndex: roundMaybe(coldest.cold_streak_index),
                  hitlessStreakGames: Number(coldest.hitless_streak_games || 0) || 0,
                  whiffRateLast5: roundMaybe(coldest.whiff_rate_last5),
                  strikeoutRateLast5: roundMaybe(coldest.strikeout_rate_last5)
                }
              : null,
          pressureHitter:
            mostPressured
              ? {
                  playerId: Number(mostPressured.player_id || 0) || null,
                  playerName: mostPressured.player_name || '',
                  pressurePlateIndex: roundMaybe(mostPressured.pressure_plate_index),
                  hitlessStreakGames: Number(mostPressured.hitless_streak_games || 0) || 0,
                  whiffRateLast5: roundMaybe(mostPressured.whiff_rate_last5),
                  walkRateLast5: roundMaybe(mostPressured.walk_rate_last5)
                }
              : null
        }
      ]
    })
  )
}

const buildSeriesContextByGamePk = ({ date, games }) => {
  const gamePks = [...new Set(games.map((game) => game.gamePk).filter((value) => Number.isFinite(value)))]

  if (!gamePks.length) return {}

  const rows = runSqliteJson(
    `select game_pk, same_division_flag, previous_matchups_14d, previous_matchups_30d, series_game_number, played_yesterday_flag from mlb_series_context_snapshots where as_of_date='${date}' and game_pk in (${gamePks.join(',')}) order by game_pk;`
  )

  return Object.fromEntries(
    rows.map((row) => [
      Number(row.game_pk),
      {
        sameDivisionFlag: Boolean(row.same_division_flag),
        previousMatchups14d: Number(row.previous_matchups_14d || 0) || 0,
        previousMatchups30d: Number(row.previous_matchups_30d || 0) || 0,
        seriesGameNumber: Number(row.series_game_number || 0) || null,
        playedYesterdayFlag: Boolean(row.played_yesterday_flag)
      }
    ])
  )
}

const buildTierThreeBullpenProfilesByTeam = ({ date, games, appearanceWindow = 8 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]
  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `with ranked as (
      select
        usage.team_name,
        usage.pitcher_id,
        usage.pitcher_name,
        usage.first_reliever_likelihood,
        usage.availability_score,
        usage.bridge_score,
        row_number() over (
          partition by usage.team_name
          order by usage.first_reliever_likelihood desc, usage.availability_score desc, usage.bridge_score desc, usage.pitcher_name asc
        ) as rn
      from mlb_bullpen_usage usage
      where usage.as_of_date='${date}'
        and usage.team_name in (${quotedTeams})
    )
    select
      ranked.team_name,
      ranked.pitcher_id,
      ranked.pitcher_name,
      ranked.first_reliever_likelihood,
      profile.entries_sample,
      profile.first_pitch_ball_rate,
      profile.first_pitch_strike_rate,
      profile.ball_rate,
      profile.reached_rate,
      profile.free_pass_rate,
      profile.scoring_play_rate,
      profile.command_risk_index
    from ranked
    left join mlb_reliever_first_batter_command_profiles profile
      on profile.as_of_date='${date}'
     and profile.team_name=ranked.team_name
     and profile.pitcher_id=ranked.pitcher_id
     and profile.appearance_window=${appearanceWindow}
    where ranked.rn = 1
    order by ranked.team_name;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
      return [
        deskTeam,
        {
          pitcherId: Number(row.pitcher_id || 0) || null,
          pitcherName: row.pitcher_name || '',
          firstRelieverLikelihood: roundMaybe(row.first_reliever_likelihood),
          entriesSample: Number(row.entries_sample || 0) || 0,
          firstPitchBallRate: roundMaybe(row.first_pitch_ball_rate),
          firstPitchStrikeRate: roundMaybe(row.first_pitch_strike_rate),
          ballRate: roundMaybe(row.ball_rate),
          reachedRate: roundMaybe(row.reached_rate),
          freePassRate: roundMaybe(row.free_pass_rate),
          scoringPlayRate: roundMaybe(row.scoring_play_rate),
          commandRiskIndex: roundMaybe(row.command_risk_index)
        }
      ]
    })
  )
}

const buildStarterThirdTimePenaltyByPitcherId = ({ date, games, windowStarts = 5 }) => {
  const pitcherIds = [
    ...new Set(
      games.flatMap((game) => [game.awayPitcher?.id, game.homePitcher?.id]).filter((value) => Number.isFinite(value))
    )
  ]

  if (!pitcherIds.length) return {}

  const rows = runSqliteJson(
    `select pitcher_id, pitcher_name, window_starts, starts_sample, starts_with_third_trip, third_trip_exposure_rate, third_trip_reached_delta, third_trip_scoring_delta, third_trip_run_delta_delta, third_trip_hr_delta, third_time_penalty_index
     from mlb_starter_third_time_penalty_profiles
     where as_of_date='${date}'
       and window_starts=${windowStarts}
       and pitcher_id in (${pitcherIds.join(',')})
     order by pitcher_id;`
  )

  return Object.fromEntries(
    rows.map((row) => [
      Number(row.pitcher_id),
      {
        pitcherName: row.pitcher_name || '',
        windowStarts: Number(row.window_starts || 0) || null,
        startsSample: Number(row.starts_sample || 0) || 0,
        startsWithThirdTrip: Number(row.starts_with_third_trip || 0) || 0,
        thirdTripExposureRate: roundMaybe(row.third_trip_exposure_rate),
        thirdTripReachedDelta: roundMaybe(row.third_trip_reached_delta),
        thirdTripScoringDelta: roundMaybe(row.third_trip_scoring_delta),
        thirdTripRunDeltaDelta: roundMaybe(row.third_trip_run_delta_delta),
        thirdTripHrDelta: roundMaybe(row.third_trip_hr_delta),
        thirdTimePenaltyIndex: roundMaybe(row.third_time_penalty_index)
      }
    ])
  )
}

const buildStarterUsageNote = ({ pitcher = {}, recentForm = null, usage = null, date }) => {
  const seasonStarts = Number(pitcher.gamesStarted || 0)
  const startsLoaded = Number(usage?.startsLoaded || 0)
  const seasonInnings = parseBaseballInnings(pitcher.inningsPitched)
  const starterOverride = Number.isFinite(Number(pitcher.id)) ? starterUsageOverridesByPitcherId[Number(pitcher.id)] ?? null : null
  const warehouseSampleConflict = seasonInnings >= 18 && seasonStarts <= 1 && startsLoaded <= 1
  const seasonDerivedExpectedInnings =
    seasonStarts > 1 && seasonInnings > 0 ? roundMaybe(seasonInnings / Math.max(seasonStarts, 1)) : null
  const fallbackExpectedInnings = warehouseSampleConflict ? (seasonInnings >= 24 ? 5.2 : 4.6) : null
  const expectedInnings =
    starterOverride?.expectedInnings ??
    (warehouseSampleConflict
      ? fallbackExpectedInnings ?? recentForm?.inningsPerStart ?? usage?.avgInningsPerStart ?? seasonDerivedExpectedInnings
      : recentForm?.inningsPerStart ?? usage?.avgInningsPerStart ?? seasonDerivedExpectedInnings ?? fallbackExpectedInnings)
  const daysSinceLastStart = usage?.lastStartDate ? daysBetweenIso(usage.lastStartDate, date) : null
  const shortLeashRisk = recentForm?.shortStartRate ?? usage?.shortStartRate ?? null
  const durableRate = recentForm?.qualityStartRate ?? usage?.durableStartRate ?? null

  let status = 'loaded'
  let label = 'Established starter'
  let note = ''

  if (!pitcher.fullName && !pitcher.id) {
    status = 'starter-tbd'
    label = 'Starter TBD'
    note = 'Official probable pitcher is still unconfirmed on this pass, so innings expectation and matchup shape should stay flexible.'
  } else if (starterOverride?.when?.({ seasonStarts, startsLoaded, recentForm, pitcher, usage, date }) ?? false) {
    status = starterOverride.status || 'override'
    label = starterOverride.label || 'Special starter context'
    note = starterOverride.note || ''
  } else if (recentForm?.startsSample > 0 && !warehouseSampleConflict) {
    status = recentForm.startsSample <= 2 ? 'tiny-sample' : 'loaded'
    label = recentForm.startsSample <= 2 ? 'Tiny recent sample' : 'Established starter'
    note =
      recentForm.startsSample <= 2
        ? `Only ${recentForm.startsSample} recent MLB start${recentForm.startsSample === 1 ? '' : 's'} are in the rolling sample, so the form read is still fragile.`
        : `Recent MLB form is loaded across ${recentForm.startsSample} starts.`
  } else if (warehouseSampleConflict) {
    status = 'warehouse-gap'
    label = 'Warehouse sample incomplete'
    note = `The season line shows ${pitcher.inningsPitched} MLB innings, but only ${Math.max(startsLoaded, seasonStarts)} logged start${Math.max(startsLoaded, seasonStarts) === 1 ? '' : 's'} cleared the warehouse on this pass, so trust the starter lane more than the thin rolling sample.`
  } else if (startsLoaded === 0 && seasonStarts === 0) {
    status = 'debut-window'
    label = 'Debut / opener watch'
    note = 'No MLB starts are loaded yet, so this looks like a debut, opener, or fresh call-up lane with very little reliable innings history.'
  } else if (startsLoaded <= 1 || seasonStarts <= 1) {
    status = 'tiny-sample'
    label = 'Tiny MLB sample'
    note = `Only ${Math.max(startsLoaded, seasonStarts)} MLB start${Math.max(startsLoaded, seasonStarts) === 1 ? '' : 's'} are loaded, so the board should assume a shorter leash and higher variance.`
  } else if (Number.isFinite(daysSinceLastStart) && daysSinceLastStart >= 20) {
    status = 'long-layoff'
    label = 'Long layoff'
    note = `Last MLB start on file was ${daysSinceLastStart} days ago, so this probable comes in without a trustworthy current rhythm read.`
  } else if (seasonStarts <= 3 || startsLoaded <= 3) {
    status = 'new-look'
    label = 'New-look starter'
    note = `This is still a low-sample MLB starter look with only ${Math.max(startsLoaded, seasonStarts)} starts on file, so innings expectation matters more than the raw ERA line.`
  } else {
    status = 'season-only'
    label = 'Season-only form'
    note = 'Season line is loaded, but the current rolling recent-start sample did not clear the filter on this pass.'
  }

  const workloadLabel =
    starterOverride?.workloadLabel ||
    (Number.isFinite(expectedInnings)
      ? expectedInnings >= 5.8
        ? 'Workhorse lane'
        : expectedInnings >= 4.8
          ? '5-inning lane'
          : 'Short leash'
      : 'Unknown leash')

  return {
    status,
    label,
    note,
    expectedInnings: roundMaybe(expectedInnings),
    daysSinceLastStart,
    startsLoaded,
    shortLeashRisk: roundMaybe(shortLeashRisk),
    durableRate: roundMaybe(durableRate),
    leashScore: roundMaybe(usage?.leashScore),
    leashVolatility: roundMaybe(usage?.leashVolatility),
    recent3OutsDelta: roundMaybe(usage?.recent3OutsDelta),
    fivePlusInningRate: roundMaybe(usage?.fivePlusInningRate),
    sixPlusInningRate: roundMaybe(usage?.sixPlusInningRate),
    ninetyPitchRate: roundMaybe(usage?.ninetyPitchRate),
    workloadLabel
  }
}

const buildStandingsContext = (records = []) => {
  const context = {}

  for (const record of records) {
    for (const teamRecord of record.teamRecords || []) {
      const officialName = teamRecord.team?.name
      const deskName = officialToDeskTeam[officialName] || officialName
      if (!deskName) continue

      context[deskName] = {
        divisionLeader: Boolean(teamRecord.divisionLeader),
        divisionRank: `${teamRecord.divisionRank ?? ''}`,
        gamesBack: `${teamRecord.gamesBack ?? '-'}`,
        losses: Number(teamRecord.losses ?? 0),
        runDifferential: Number(teamRecord.runDifferential ?? 0),
        streakCode: teamRecord.streak?.streakCode || '',
        winningPercentage: teamRecord.winningPercentage || '.500',
        wins: Number(teamRecord.wins ?? 0)
      }
    }
  }

  return context
}

const writeModuleFile = async (targetPath, contents) => {
  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, contents, 'utf8')
}

const fetchTeamRoster = async (teamId, rosterCache) => {
  if (!Number.isFinite(Number(teamId))) return []
  if (rosterCache.has(teamId)) return rosterCache.get(teamId)

  const response = await fetchJson(`https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=40Man`)
  const roster = response.roster || []
  rosterCache.set(teamId, roster)
  return roster
}

const fetchPitcherPerson = async (pitcherId, pitcherCache) => {
  if (!Number.isFinite(Number(pitcherId))) return null
  if (pitcherCache.has(pitcherId)) return pitcherCache.get(pitcherId)

  const personUrl =
    `https://statsapi.mlb.com/api/v1/people/${pitcherId}` +
    `?hydrate=stats(group=[pitching],type=[season],season=${season},sportId=1)`
  const personResponse = await fetchJson(personUrl)
  const person = personResponse.people?.[0] || null
  pitcherCache.set(pitcherId, person)
  return person
}

const resolveFallbackPitcherPerson = async ({ teamId, starterName, rosterCache, pitcherCache }) => {
  const normalizedStarter = normalizeNameToken(starterName)
  if (!normalizedStarter) return null

  const roster = await fetchTeamRoster(teamId, rosterCache)
  const pitcherRoster = roster.filter((entry) => `${entry.position?.abbreviation || ''}`.toUpperCase() === 'P')
  const starterTokens = normalizedStarter.split(' ')

  const rosterMatch =
    pitcherRoster.find((entry) => normalizeNameToken(entry.person?.fullName || '') === normalizedStarter) ||
    pitcherRoster.find((entry) => starterTokens.every((token) => normalizeNameToken(entry.person?.fullName || '').includes(token))) ||
    pitcherRoster.find((entry) => {
      const fullName = normalizeNameToken(entry.person?.fullName || '')
      const lastName = fullName.split(' ').filter(Boolean).at(-1) || ''
      return lastName === normalizedStarter
    })

  if (rosterMatch?.person?.id) {
    return fetchPitcherPerson(Number(rosterMatch.person.id), pitcherCache)
  }

  const searchResponse = await fetchJson(
    `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(starterName)}`
  )

  const rosterIds = new Set(pitcherRoster.map((entry) => Number(entry.person?.id || 0)).filter(Boolean))
  const candidates = (searchResponse.people || []).filter((person) => `${person.primaryPosition?.abbreviation || ''}`.toUpperCase() === 'P')
  const chosen =
    candidates.find((person) => rosterIds.has(Number(person.id))) ||
    candidates.find((person) => Number(person.currentTeam?.id || 0) === Number(teamId)) ||
    candidates[0]

  if (!chosen?.id) return null
  return fetchPitcherPerson(Number(chosen.id), pitcherCache)
}

const main = async () => {
  const options = parseArgs()
  const scheduleUrl =
    `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${options.date}` +
    '&hydrate=probablePitcher,team'
  const standingsUrl =
    `https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=${season}` +
    '&standingsTypes=regularSeason'

  const schedule = await fetchJson(scheduleUrl)
  const standings = await fetchJson(standingsUrl)
  const rtSportsProbablesByMatchup = await fetchRtSportsProbables(options.date)
  const pitcherIds = new Set()

  for (const dateEntry of schedule.dates || []) {
    for (const game of dateEntry.games || []) {
      if (isPostponedScheduleGame(game)) continue
      const awayPitcherId = game.teams?.away?.probablePitcher?.id
      const homePitcherId = game.teams?.home?.probablePitcher?.id
      if (awayPitcherId) pitcherIds.add(awayPitcherId)
      if (homePitcherId) pitcherIds.add(homePitcherId)
    }
  }

  const pitcherCache = new Map()
  const rosterCache = new Map()
  await Promise.all(
    [...pitcherIds].map(async (pitcherId) => {
      const personUrl =
        `https://statsapi.mlb.com/api/v1/people/${pitcherId}` +
        `?hydrate=stats(group=[pitching],type=[season],season=${season},sportId=1)`
      const personResponse = await fetchJson(personUrl)
      pitcherCache.set(pitcherId, personResponse.people?.[0] || null)
    })
  )

  const rawGames = []
  const seenMatchupCounts = new Map()
  for (const dateEntry of schedule.dates || []) {
    for (const game of dateEntry.games || []) {
      if (isPostponedScheduleGame(game)) continue
      const awayOfficial = game.teams?.away?.team?.name
      const homeOfficial = game.teams?.home?.team?.name
      const awayDesk = officialToDeskTeam[awayOfficial]
      const homeDesk = officialToDeskTeam[homeOfficial]

      if (!awayDesk || !homeDesk) continue

      const rtMatchupKey = `${deskTeamToRtAbbreviation[awayDesk] || ''}-${deskTeamToRtAbbreviation[homeDesk] || ''}`
      const rtFallback = rtSportsProbablesByMatchup[rtMatchupKey]?.[0] || null

      const awayProbable = game.teams?.away?.probablePitcher || {}
      const homeProbable = game.teams?.home?.probablePitcher || {}

      const awayFallbackPerson =
        !awayProbable?.id && rtFallback?.awayStarter
          ? await resolveFallbackPitcherPerson({
              teamId: Number(game.teams?.away?.team?.id || 0),
              starterName: rtFallback.awayStarter,
              rosterCache,
              pitcherCache
            })
          : null
      const homeFallbackPerson =
        !homeProbable?.id && rtFallback?.homeStarter
          ? await resolveFallbackPitcherPerson({
              teamId: Number(game.teams?.home?.team?.id || 0),
              starterName: rtFallback.homeStarter,
              rosterCache,
              pitcherCache
            })
          : null

      const awayPitcher = awayProbable?.id
        ? buildPitcherSummary(pitcherCache.get(awayProbable.id) || { fullName: awayProbable.fullName || '' })
        : awayFallbackPerson
          ? { ...buildPitcherSummary(awayFallbackPerson), probableSource: 'rtsports-fallback' }
          : buildPitcherFallbackSummary({
              fullName: rtFallback?.awayStarter || awayProbable?.fullName || '',
              record: rtFallback?.awayStarterRecord || ''
            })
      const homePitcher = homeProbable?.id
        ? buildPitcherSummary(pitcherCache.get(homeProbable.id) || { fullName: homeProbable.fullName || '' })
        : homeFallbackPerson
          ? { ...buildPitcherSummary(homeFallbackPerson), probableSource: 'rtsports-fallback' }
          : buildPitcherFallbackSummary({
              fullName: rtFallback?.homeStarter || homeProbable?.fullName || '',
              record: rtFallback?.homeStarterRecord || ''
            })
      const boardOdds = await parseMatchupOdds(awayDesk, homeDesk)

      const matchupKey = `${slugifyDeskTeam(awayDesk)}-${slugifyDeskTeam(homeDesk)}`
      const seenCount = seenMatchupCounts.get(matchupKey) ?? 0
      seenMatchupCounts.set(matchupKey, seenCount + 1)

      rawGames.push({
        gamePk: Number(game.gamePk || 0) || null,
        id: buildDeskGameId({
          awayDesk,
          homeDesk,
          gamePk: Number(game.gamePk || 0) || null,
          gameNumber: Number(game.gameNumber || 0) || null,
          forceUnique: seenCount > 0
        }),
        away: awayDesk,
        home: homeDesk,
        start: formatPtStart(game.gameDate),
        startMinutes: getPtStartMinutes(game.gameDate),
        awayPitcher,
        homePitcher,
        spread: boardOdds.spread,
        total: boardOdds.total,
        moneyline: boardOdds.moneyline,
        pitcherSourceNote: '',
        oddsPage: boardOdds.oddsPage
      })
    }
  }

  rawGames.sort((left, right) => left.startMinutes - right.startMinutes || left.id.localeCompare(right.id))

  const bullpenChainByTeam = buildBullpenChainByTeam({ date: options.date, games: rawGames })
  const recentStarterFormByPitcherId = buildRecentStarterFormByPitcherId({ date: options.date, games: rawGames })
  const starterUsageContextByPitcherId = buildStarterUsageContextByPitcherId({ date: options.date, games: rawGames })
  const starterLeashByPitcherId = buildStarterLeashByPitcherId({ date: options.date, games: rawGames })
  const teamStoryPriorsByTeam = buildTeamStoryPriorsByTeam({ date: options.date, games: rawGames })
  const teamStateByTeam = buildTeamStateByTeam({ date: options.date, games: rawGames })
  const hitterStateByTeam = buildHitterStateByTeam({ date: options.date, games: rawGames })
  const teamMistakeShapeByTeam = buildTeamMistakeShapeByTeam({ date: options.date, games: rawGames })
  const lineupConversionShapeByTeam = buildLineupConversionShapeByTeam({ date: options.date, games: rawGames })
  const bullpenMistakeShapeByTeam = buildBullpenMistakeShapeByTeam({ date: options.date, games: rawGames })
  const firstInningTeamProfilesByTeam = buildFirstInningTeamProfilesByTeam({ date: options.date, games: rawGames })
  const firstInningPitcherProfilesByPitcherId = buildFirstInningPitcherProfilesByPitcherId({ date: options.date, games: rawGames })
  const seriesEarlyPhaseByTeam = buildSeriesEarlyPhaseByTeam({ date: options.date, games: rawGames })
  const recentGamesByTeam = buildRecentGamesByTeam({ date: options.date, games: rawGames })
  const seriesContextByGamePk = buildSeriesContextByGamePk({ date: options.date, games: rawGames })
  const tierThreeBullpenProfilesByTeam = buildTierThreeBullpenProfilesByTeam({ date: options.date, games: rawGames })
  const starterThirdTimePenaltyByPitcherId = buildStarterThirdTimePenaltyByPitcherId({ date: options.date, games: rawGames })
  const standingsContextByTeam = buildStandingsContext(standings.records || [])
  const enrichedRawGames = rawGames.map((game) => ({
    ...game,
    awayPitcher: {
      ...game.awayPitcher,
      recentForm: Number.isFinite(game.awayPitcher?.id)
        ? recentStarterFormByPitcherId[game.awayPitcher.id] ?? null
        : null,
      usageContext: buildStarterUsageNote({
        pitcher: game.awayPitcher,
        recentForm: Number.isFinite(game.awayPitcher?.id) ? recentStarterFormByPitcherId[game.awayPitcher.id] ?? null : null,
        usage:
          Number.isFinite(game.awayPitcher?.id)
            ? {
                ...(starterUsageContextByPitcherId[game.awayPitcher.id] ?? {}),
                ...(starterLeashByPitcherId[game.awayPitcher.id] ?? {})
              }
            : null,
        date: options.date
      })
    },
    homePitcher: {
      ...game.homePitcher,
      recentForm: Number.isFinite(game.homePitcher?.id)
        ? recentStarterFormByPitcherId[game.homePitcher.id] ?? null
        : null,
      usageContext: buildStarterUsageNote({
        pitcher: game.homePitcher,
        recentForm: Number.isFinite(game.homePitcher?.id) ? recentStarterFormByPitcherId[game.homePitcher.id] ?? null : null,
        usage:
          Number.isFinite(game.homePitcher?.id)
            ? {
                ...(starterUsageContextByPitcherId[game.homePitcher.id] ?? {}),
                ...(starterLeashByPitcherId[game.homePitcher.id] ?? {})
              }
            : null,
        date: options.date
      })
    },
    tierTwoContext: {
      storyPriors: {
        away: teamStoryPriorsByTeam[game.away] ?? null,
        home: teamStoryPriorsByTeam[game.home] ?? null
      },
      series: Number.isFinite(game.gamePk) ? seriesContextByGamePk[game.gamePk] ?? null : null
    },
    stateContext: {
      teamState: {
        away: teamStateByTeam[game.away] ?? null,
        home: teamStateByTeam[game.home] ?? null
      },
      hitterState: {
        away: hitterStateByTeam[game.away] ?? null,
        home: hitterStateByTeam[game.home] ?? null
      },
      teamMistakeShape: {
        away: teamMistakeShapeByTeam[game.away] ?? null,
        home: teamMistakeShapeByTeam[game.home] ?? null
      },
      lineupConversion: {
        away: lineupConversionShapeByTeam[game.away] ?? null,
        home: lineupConversionShapeByTeam[game.home] ?? null
      },
      bullpenMistake: {
        away: bullpenMistakeShapeByTeam[game.away] ?? null,
        home: bullpenMistakeShapeByTeam[game.home] ?? null
      },
      firstInningTeam: {
        away: firstInningTeamProfilesByTeam[game.away] ?? null,
        home: firstInningTeamProfilesByTeam[game.home] ?? null
      },
      firstInningPitcher: {
        away: Number.isFinite(game.awayPitcher?.id) ? firstInningPitcherProfilesByPitcherId[game.awayPitcher.id] ?? null : null,
        home: Number.isFinite(game.homePitcher?.id) ? firstInningPitcherProfilesByPitcherId[game.homePitcher.id] ?? null : null
      },
      seriesEarlyPhase: {
        away: seriesEarlyPhaseByTeam[game.away] ?? null,
        home: seriesEarlyPhaseByTeam[game.home] ?? null
      },
      recentGames: {
        away: recentGamesByTeam[game.away] ?? [],
        home: recentGamesByTeam[game.home] ?? []
      }
    },
    tierThreeContext: {
      bullpenCommand: {
        away: tierThreeBullpenProfilesByTeam[game.away] ?? null,
        home: tierThreeBullpenProfilesByTeam[game.home] ?? null
      },
      starterThirdTime: {
        away: Number.isFinite(game.awayPitcher?.id) ? starterThirdTimePenaltyByPitcherId[game.awayPitcher.id] ?? null : null,
        home: Number.isFinite(game.homePitcher?.id) ? starterThirdTimePenaltyByPitcherId[game.homePitcher.id] ?? null : null
      }
    }
  }))

  const dayDataModule = `export const rawGames = ${JSON.stringify(enrichedRawGames, null, 2)}\n\nexport const bullpenChainByTeam = ${JSON.stringify(bullpenChainByTeam, null, 2)}\n`
  const dayContextModule = `import {\n  teamOffenseContextByTeam,\n  teamBullpenContextByTeam,\n  teamSavantContextByTeam\n} from './mlb-context-${options.baselineContextDate}.js'\n\nexport const standingsContextByTeam = ${JSON.stringify(standingsContextByTeam, null, 2)}\n\nexport { teamOffenseContextByTeam, teamBullpenContextByTeam, teamSavantContextByTeam }\n`

  await writeModuleFile(
    path.join(rootDir, 'web', 'src', 'lib', `day-${options.date}-data.js`),
    dayDataModule
  )
  await writeModuleFile(
    path.join(rootDir, 'web', 'src', 'lib', `mlb-context-${options.date}.js`),
    dayContextModule
  )

  console.log(`Generated MLB day data for ${options.date} with ${rawGames.length} games.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

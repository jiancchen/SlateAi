import { execSync } from 'node:child_process'
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
    probableSource: 'rtsports-fallback'
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
    probableSource: 'mlb-api'
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
  const command = `sqlite3 -json "${path.join(rootDir, 'data-private', 'warehouse', 'sports.db')}" ${JSON.stringify(sql)}`
  const output = execSync(command, { encoding: 'utf8', cwd: rootDir })
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

      rawGames.push({
        id: `${slugifyDeskTeam(awayDesk)}-${slugifyDeskTeam(homeDesk)}`,
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
        usage: Number.isFinite(game.awayPitcher?.id) ? starterUsageContextByPitcherId[game.awayPitcher.id] ?? null : null,
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
        usage: Number.isFinite(game.homePitcher?.id) ? starterUsageContextByPitcherId[game.homePitcher.id] ?? null : null,
        date: options.date
      })
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

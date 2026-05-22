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
    gamesStarted: Number(stat.gamesStarted ?? 0) || 0
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
  const pitcherIds = new Set()

  for (const dateEntry of schedule.dates || []) {
    for (const game of dateEntry.games || []) {
      const awayPitcherId = game.teams?.away?.probablePitcher?.id
      const homePitcherId = game.teams?.home?.probablePitcher?.id
      if (awayPitcherId) pitcherIds.add(awayPitcherId)
      if (homePitcherId) pitcherIds.add(homePitcherId)
    }
  }

  const pitcherCache = new Map()
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
      const awayOfficial = game.teams?.away?.team?.name
      const homeOfficial = game.teams?.home?.team?.name
      const awayDesk = officialToDeskTeam[awayOfficial]
      const homeDesk = officialToDeskTeam[homeOfficial]

      if (!awayDesk || !homeDesk) continue

      const awayPitcher = buildPitcherSummary(
        pitcherCache.get(game.teams?.away?.probablePitcher?.id) || {
          fullName: game.teams?.away?.probablePitcher?.fullName || ''
        }
      )
      const homePitcher = buildPitcherSummary(
        pitcherCache.get(game.teams?.home?.probablePitcher?.id) || {
          fullName: game.teams?.home?.probablePitcher?.fullName || ''
        }
      )
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
  const standingsContextByTeam = buildStandingsContext(standings.records || [])
  const enrichedRawGames = rawGames.map((game) => ({
    ...game,
    awayPitcher: {
      ...game.awayPitcher,
      recentForm: Number.isFinite(game.awayPitcher?.id)
        ? recentStarterFormByPitcherId[game.awayPitcher.id] ?? null
        : null
    },
    homePitcher: {
      ...game.homePitcher,
      recentForm: Number.isFinite(game.homePitcher?.id)
        ? recentStarterFormByPitcherId[game.homePitcher.id] ?? null
        : null
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

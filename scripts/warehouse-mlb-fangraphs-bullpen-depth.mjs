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
const requestedTeam = getArg('--team', 'all')
const dbPath = path.join(rootDir, 'data-private/warehouse/sports/mlb/sql-mlb.db')
const sourceName = 'fangraphs_roster_resource_bullpen_depth'
const sourceFamily = 'bullpen-depth'
const closerSourceName = 'fangraphs_roster_resource_closer_depth'
const closerSourceFamily = 'closer-depth'

const teams = [
  ['athletics', 'ATH', 'Athletics'],
  ['blue-jays', 'TOR', 'Toronto Blue Jays'],
  ['orioles', 'BAL', 'Baltimore Orioles'],
  ['rays', 'TBR', 'Tampa Bay Rays'],
  ['red-sox', 'BOS', 'Boston Red Sox'],
  ['yankees', 'NYY', 'New York Yankees'],
  ['guardians', 'CLE', 'Cleveland Guardians'],
  ['royals', 'KCR', 'Kansas City Royals'],
  ['tigers', 'DET', 'Detroit Tigers'],
  ['twins', 'MIN', 'Minnesota Twins'],
  ['white-sox', 'CHW', 'Chicago White Sox'],
  ['angels', 'LAA', 'Los Angeles Angels'],
  ['astros', 'HOU', 'Houston Astros'],
  ['mariners', 'SEA', 'Seattle Mariners'],
  ['rangers', 'TEX', 'Texas Rangers'],
  ['braves', 'ATL', 'Atlanta Braves'],
  ['marlins', 'MIA', 'Miami Marlins'],
  ['mets', 'NYM', 'New York Mets'],
  ['nationals', 'WSN', 'Washington Nationals'],
  ['phillies', 'PHI', 'Philadelphia Phillies'],
  ['brewers', 'MIL', 'Milwaukee Brewers'],
  ['cardinals', 'STL', 'St. Louis Cardinals'],
  ['cubs', 'CHC', 'Chicago Cubs'],
  ['pirates', 'PIT', 'Pittsburgh Pirates'],
  ['reds', 'CIN', 'Cincinnati Reds'],
  ['diamondbacks', 'ARI', 'Arizona Diamondbacks'],
  ['dodgers', 'LAD', 'Los Angeles Dodgers'],
  ['giants', 'SFG', 'San Francisco Giants'],
  ['padres', 'SDP', 'San Diego Padres'],
  ['rockies', 'COL', 'Colorado Rockies']
].map(([slug, abbr, name]) => ({ slug, abbr, name }))

const selectedTeams = requestedTeam === 'all'
  ? teams
  : teams.filter((team) => [team.slug, team.abbr, team.name].map((value) => value.toLowerCase()).includes(requestedTeam.toLowerCase()))

if (selectedTeams.length === 0) {
  throw new Error(`Unknown FanGraphs team slug/abbr/name: ${requestedTeam}`)
}

const teamByAbbr = new Map(teams.map((team) => [team.abbr, team]))
const selectedTeamAbbrs = new Set(selectedTeams.map((team) => team.abbr))

const sqlQuote = (value) => {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}

const sqliteExec = (sql) => execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 80 })

const addDays = (isoDate, days) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + days))
  return [
    next.getUTCFullYear(),
    `${next.getUTCMonth() + 1}`.padStart(2, '0'),
    `${next.getUTCDate()}`.padStart(2, '0')
  ].join('-')
}

const readJsonIfExists = async (filePath) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

const stripTags = (value = '') =>
  String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#039;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

const normalizePerson = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const numOrNull = (value) => {
  const text = stripTags(value).replace(/[^0-9.-]/g, '')
  if (!text) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

const rawOrNull = (value) => {
  const text = stripTags(value)
  return text ? text : null
}

const textOrNull = (value) => {
  if (value === null || value === undefined) return null
  return rawOrNull(value)
}

const jsonOrNull = (value) => {
  if (value === null || value === undefined) return null
  return JSON.stringify(value)
}

const intFlag = (value) => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value ? 1 : 0
  const text = String(value).trim().toLowerCase()
  if (['y', 'yes', 'true', '1', 'active'].includes(text)) return 1
  if (['n', 'no', 'false', '0', 'inactive'].includes(text)) return 0
  return null
}

const toIsoDateTime = (value) => {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 1000000000) return new Date(numeric * 1000).toISOString()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? textOrNull(value) : parsed.toISOString()
}

const stableIdPart = (value) =>
  normalizePerson(value || '')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'unknown'

const playerKeyFromIds = ({ fangraphsPlayerId = null, mlbamId = null, playerName = null }) => {
  if (fangraphsPlayerId) return `fg:${fangraphsPlayerId}`
  if (mlbamId) return `mlbam:${mlbamId}`
  return normalizePerson(playerName)
}

const playerUrlToFgId = (playerUrl) =>
  String(playerUrl || '').match(/\/players\/[^/]+\/(\d+)\//)?.[1] || null

const extractNextData = (html, sourceLabel) => {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!match) throw new Error(`FanGraphs ${sourceLabel} payload missing __NEXT_DATA__`)
  return JSON.parse(match[1])
}

const extractRosterResourcePayload = (html, sourceLabel) => {
  const nextData = extractNextData(html, sourceLabel)
  const queries = nextData?.props?.pageProps?.dehydratedState?.queries || []
  const payload = queries[0]?.state?.data
  if (!payload || typeof payload !== 'object') throw new Error(`FanGraphs ${sourceLabel} payload missing dehydrated data`)
  return payload
}

const parseUsageCell = (cellHtml, usageDate, dayLabel) => {
  const override = cellHtml.match(/data-override="([^"]+)"/i)?.[1] || null
  const outcomeRaw = cellHtml.match(/data-outcome="([^"]*)"/i)?.[1] || ''
  const text = stripTags(cellHtml)
  const pitches = override ? null : numOrNull(text.match(/^\d+/)?.[0] || '')
  const flags = (outcomeRaw || text.match(/\(([^)]+)\)/)?.[1] || '')
    .replace(/[()]/g, '')
    .split(',')
    .map((flag) => flag.trim())
    .filter(Boolean)
  return {
    usageDate,
    dayLabel,
    pitches,
    flags,
    overrideStatus: override,
    rawValue: text || null
  }
}

const parseBullpen = (html, team, sourceSnapshotId, capturedAt) => {
  const section = html.match(/<h2 class="rr-header table-header mlb-bp">Bullpen[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i)?.[1] || ''
  const header = html.match(/<h2 class="rr-header table-header mlb-bp">Bullpen[\s\S]*?<thead>([\s\S]*?)<\/thead>/i)?.[1] || ''
  const usageDates = [...new Map([...header.matchAll(/<th[^>]*data-col="(\d+)"[^>]*data-col-id="specialBullpenUsage"[\s\S]*?<div class="game-bullpen-usage"><div>([^<]+)<\/div><div>([^<]+)<\/div><\/div>[\s\S]*?<\/th>/gi)]
    .map((match) => [Number(match[1]), {
      col: Number(match[1]),
      dayLabel: stripTags(match[2]),
      usageDate: toIsoMonthDay(date, stripTags(match[3]))
    }])).values()]
    .sort((a, b) => a.col - b.col)

  const rows = [...section.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((match) => match[0])
  const depthRows = []
  const usageRows = []

  for (const rowHtml of rows) {
    const cells = [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[0])
    if (cells.length < 18) continue
    const role = rawOrNull(cells[0])
    const position = rawOrNull(cells[1])
    const playerCell = cells[3] || ''
    const playerName = rawOrNull(playerCell)
    if (!role || position !== 'RP' || !playerName) continue
    const playerUrl = playerCell.match(/href="([^"]+)"/i)?.[1] || null
    const fangraphsPlayerId = playerUrl?.match(/\/players\/[^/]+\/(\d+)\//)?.[1] || null
    const playerKey = fangraphsPlayerId ? `fg:${fangraphsPlayerId}` : normalizePerson(playerName)
    const isFortyMan = /\broster-40\b/.test(playerCell) ? 1 : 0
    const depthRow = {
      sourceDate: date,
      teamSlug: team.slug,
      teamAbbr: team.abbr,
      teamName: team.name,
      role,
      position,
      jerseyNumber: rawOrNull(cells[2]),
      playerName,
      playerKey,
      fangraphsPlayerId,
      playerUrl,
      throws: rawOrNull(cells[4]),
      age: numOrNull(cells[5]),
      howAcquired: rawOrNull(cells[6]),
      options: rawOrNull(cells[7]),
      serviceTime: rawOrNull(cells[8]),
      signingYear: numOrNull(cells[9]),
      signingTeam: rawOrNull(cells[10]),
      signingRound: rawOrNull(cells[11]),
      signingPick: rawOrNull(cells[12]),
      overallRankNext: numOrNull(cells[13]),
      orgRankNext: numOrNull(cells[14]),
      orgRankPrevious: numOrNull(cells[15]),
      powerRankOverall: numOrNull(cells[16]),
      powerRankLast14: numOrNull(cells[17]),
      isFortyMan,
      sourceSnapshotId,
      capturedAt
    }
    depthRows.push(depthRow)
    for (let index = 0; index < usageDates.length; index += 1) {
      const usage = parseUsageCell(cells[18 + index] || '', usageDates[index].usageDate, usageDates[index].dayLabel)
      usageRows.push({
        sourceDate: date,
        teamSlug: team.slug,
        teamAbbr: team.abbr,
        teamName: team.name,
        playerKey,
        playerName,
        role,
        throws: depthRow.throws,
        ...usage,
        sourceSnapshotId,
        capturedAt
      })
    }
  }
  return { depthRows, usageRows }
}

const toIsoMonthDay = (sourceDate, monthDay) => {
  const match = String(monthDay || '').match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!match) return null
  const [year] = sourceDate.split('-').map(Number)
  const month = match[1].padStart(2, '0')
  const day = match[2].padStart(2, '0')
  return `${year}-${month}-${day}`
}

const buildTeamLookupByFanGraphsId = (payload) => {
  const lookup = new Map()
  for (const row of payload?.dataTeamList || []) {
    const abbr = textOrNull(row.AbbName)
    const team = abbr ? teamByAbbr.get(abbr) : null
    if (row.TeamId !== null && row.TeamId !== undefined) lookup.set(String(row.TeamId), team || {
      slug: stableIdPart(row.ShortName || row.FullName || abbr),
      abbr,
      name: textOrNull(row.FullName || row.ShortName || abbr)
    })
  }
  return lookup
}

const buildRosterIdLookup = (payload) => {
  const lookup = new Map()
  for (const row of payload?.dataRoster || []) {
    const mlbamId = textOrNull(row.mlbamid)
    const fangraphsPlayerId = textOrNull(row.playerid || playerUrlToFgId(row.UPURL))
    if (mlbamId && fangraphsPlayerId) lookup.set(mlbamId, fangraphsPlayerId)
  }
  return lookup
}

const parseTeamPayloadRows = (payload, team, sourceSnapshotId, capturedAt) => {
  const sourceLoadedAt = toIsoDateTime(payload.dataLoadDate)
  const fgTeamById = buildTeamLookupByFanGraphsId(payload)
  const fgIdByMlbam = buildRosterIdLookup(payload)
  const rosterRows = []
  const structuredUsageRows = []
  const transactionRows = []
  const teamRankingRows = []

  for (const [index, row] of (payload.dataRoster || []).entries()) {
    if (textOrNull(row.position) !== 'RP') continue
    const playerName = textOrNull(row.player || row.playerNameDisplay)
    if (!playerName) continue
    const fangraphsPlayerId = textOrNull(row.playerid || playerUrlToFgId(row.UPURL))
    const mlbamId = numOrNull(row.mlbamid)
    const playerKey = playerKeyFromIds({ fangraphsPlayerId, mlbamId, playerName })
    rosterRows.push({
      sourceDate: date,
      teamSlug: team.slug,
      teamAbbr: team.abbr,
      teamName: team.name,
      sourceLoadedAt,
      rosterOrdinal: index + 1,
      fangraphsTeamId: numOrNull(row.teamid),
      rosterType: textOrNull(row.type),
      role: textOrNull(row.role),
      position: textOrNull(row.position),
      jerseyNumber: textOrNull(row.jnum || row.jnum1),
      playerName,
      playerKey,
      fangraphsPlayerId,
      mlbamId,
      retroId: textOrNull(row.retroid),
      statsId: textOrNull(row.statsid1),
      mlbAuto: textOrNull(row.mlbauto),
      minorBamId: numOrNull(row.minorbamid),
      playerUrl: textOrNull(row.UPURL),
      throws: textOrNull(row.throws || row.handed),
      bats: textOrNull(row.bats),
      handed: textOrNull(row.handed),
      age: numOrNull(row.age),
      is40Man: intFlag(row.roster40),
      projectedLevel: textOrNull(row.projectedlevel),
      rosterNotes: textOrNull(row.notes),
      injuryNotes: textOrNull(row.injurynotes),
      injuryDate: textOrNull(row.injurydate),
      retroDate: textOrNull(row.retrodate),
      howAcquired: textOrNull(row.acquired),
      acquiredCode: textOrNull(row.acquiredcode),
      acquiredRecent: textOrNull(row.acquiredrecent),
      options: textOrNull(row.options),
      serviceTime: textOrNull(row.servicetime),
      country: textOrNull(row.country),
      season: numOrNull(row.season),
      inningsPitched: numOrNull(row.IP),
      rpPoints: numOrNull(row.RP_Pts),
      powerRankRp: numOrNull(row.prrp),
      powerRankRpLast14: numOrNull(row.prrp14),
      projectedPt: numOrNull(row.proj_PT),
      projectedWar: numOrNull(row.proj_WAR),
      actualPt: numOrNull(row.actual_PT),
      actualWar: numOrNull(row.actual_WAR),
      projPitGs: numOrNull(row.proj_pit_GS),
      projPitSv: numOrNull(row.proj_pit_SV),
      projPitHits: numOrNull(row.proj_pit_H),
      projPitSo: numOrNull(row.proj_pit_SO),
      projPitBb: numOrNull(row.proj_pit_BB),
      projPitEra: numOrNull(row.proj_pit_ERA),
      projPitIp: numOrNull(row.proj_pit_IP),
      projPitWar: numOrNull(row.proj_pit_WAR),
      actualPitGs: numOrNull(row.actual_pit_GS),
      actualPitSv: numOrNull(row.actual_pit_SV),
      actualPitHits: numOrNull(row.actual_pit_H),
      actualPitSo: numOrNull(row.actual_pit_SO),
      actualPitBb: numOrNull(row.actual_pit_BB),
      actualPitEra: numOrNull(row.actual_pit_ERA),
      actualPitIp: numOrNull(row.actual_pit_IP),
      actualPitWar: numOrNull(row.actual_pit_WAR),
      actualPitK9: numOrNull(row['actual_pit_K/9']),
      actualPitBb9: numOrNull(row['actual_pit_BB/9']),
      actualPitKPct: numOrNull(row['actual_pit_K%']),
      actualPitBbPct: numOrNull(row['actual_pit_BB%']),
      actualPitBarrelPct: numOrNull(row['actual_pit_Barrel%']),
      actualPitHardHitPct: numOrNull(row['actual_pit_HardHit%']),
      actualPitEv: numOrNull(row.actual_pit_EV),
      rawRowJson: jsonOrNull(row),
      sourceSnapshotId,
      capturedAt
    })
  }

  for (const row of payload.dataBullpenUsage?.dataPlayers || []) {
    const playerName = textOrNull(row.playerName)
    const mlbamId = numOrNull(row.mlbamid)
    const fangraphsPlayerId = fgIdByMlbam.get(String(row.mlbamid)) || null
    const playerKey = playerKeyFromIds({ fangraphsPlayerId, mlbamId, playerName })
    const fgTeam = fgTeamById.get(String(row.teamid)) || team
    const opponentTeam = fgTeamById.get(String(row.oppteamid)) || null
    const gameDate = textOrNull(row.gameDate)
    structuredUsageRows.push({
      usageEventId: `fg-bp-use:${date}:${fgTeam.slug}:${playerKey}:${gameDate || 'unknown'}`,
      sourceDate: date,
      teamSlug: fgTeam.slug,
      teamAbbr: fgTeam.abbr,
      teamName: fgTeam.name,
      sourceLoadedAt,
      gameDate,
      playerKey,
      fangraphsPlayerId,
      mlbamId,
      playerName,
      fangraphsTeamId: numOrNull(row.teamid),
      fangraphsOpponentTeamId: numOrNull(row.oppteamid),
      opponentTeamAbbr: opponentTeam?.abbr || null,
      homeAway: textOrNull(row.homeaway),
      games: numOrNull(row.g),
      gamesStarted: numOrNull(row.gs),
      wins: numOrNull(row.w),
      losses: numOrNull(row.l),
      blownSaves: numOrNull(row.bs),
      saves: numOrNull(row.sv),
      holds: numOrNull(row.hld),
      inningsPitched: numOrNull(row.ip),
      battersFaced: numOrNull(row.tbf),
      pitches: numOrNull(row.pitches),
      valueOverride: textOrNull(row.valueOverride),
      rawRowJson: jsonOrNull(row),
      sourceSnapshotId,
      capturedAt
    })
  }

  for (const row of payload.dataRecentTransactions || []) {
    const playerName = textOrNull(row.playerName1 || row.playerName)
    const fangraphsPlayerId = textOrNull(row.playerid || playerUrlToFgId(row.UPURL))
    const mlbamId = numOrNull(row.mlbamid)
    const playerKey = playerKeyFromIds({ fangraphsPlayerId, mlbamId, playerName })
    const transDate = textOrNull(row.transDate)?.slice(0, 10) || null
    transactionRows.push({
      transactionId: `fg-tx:${date}:${team.slug}:${playerKey}:${transDate || 'unknown'}:${stableIdPart(row.transCategory)}:${stableIdPart(row.transDesc)}`,
      sourceDate: date,
      teamSlug: team.slug,
      teamAbbr: team.abbr,
      teamName: team.name,
      sourceLoadedAt,
      transactionDate: transDate,
      position: textOrNull(row.position),
      season: numOrNull(row.season),
      seasonType: textOrNull(row.seasonType),
      playerKey,
      fangraphsPlayerId,
      mlbamId,
      playerName,
      transactionCategory: textOrNull(row.transCategory),
      transactionDescription: textOrNull(row.transDesc),
      transactionTeam: textOrNull(row.team),
      teamChange: textOrNull(row.teamChange),
      notes: textOrNull(row.notes),
      fantasyImpact: numOrNull(row.fantasyImpact),
      playerUrl: textOrNull(row.UPURL),
      rawRowJson: jsonOrNull(row),
      sourceSnapshotId,
      capturedAt
    })
  }

  for (const row of payload.dataTeamRanking?.rp || []) {
    teamRankingRows.push({
      sourceDate: date,
      teamSlug: team.slug,
      teamAbbr: team.abbr,
      teamName: team.name,
      sourceLoadedAt,
      fangraphsTeamId: numOrNull(row.teamId),
      eraRank: numOrNull(row.ERA),
      whipRank: numOrNull(row.WHIP),
      bb9Rank: numOrNull(row['BB/9']),
      k9Rank: numOrNull(row['K/9']),
      h9Rank: numOrNull(row['H/9']),
      hr9Rank: numOrNull(row['HR/9']),
      rawRowJson: jsonOrNull(row),
      sourceSnapshotId,
      capturedAt
    })
  }

  return { sourceLoadedAt, rosterRows, structuredUsageRows, transactionRows, teamRankingRows }
}

const parseCloserPayloadRows = (payload, sourceSnapshotId, capturedAt) => {
  const closerRows = []
  const closerUsageRows = []
  for (const row of payload.dataPlayers || []) {
    const teamAbbr = textOrNull(row.TeamAbbName)
    const team = teamAbbr ? teamByAbbr.get(teamAbbr) : null
    if (!team || !selectedTeamAbbrs.has(teamAbbr)) continue
    const playerName = textOrNull(row.playerName)
    const fangraphsPlayerId = textOrNull(row.playerId || playerUrlToFgId(row.UPURL))
    const mlbamId = numOrNull(row.mlbamid)
    const playerKey = playerKeyFromIds({ fangraphsPlayerId, mlbamId, playerName })
    closerRows.push({
      sourceDate: date,
      teamSlug: team.slug,
      teamAbbr: team.abbr,
      teamName: team.name,
      role: textOrNull(row.Role),
      tags: textOrNull(row.Tags),
      playerKey,
      fangraphsPlayerId,
      mlbamId,
      xMlbamId: numOrNull(row.xMLBAMID),
      playerName,
      playerUrl: textOrNull(row.UPURL),
      throws: textOrNull(row.throws),
      positionDb: textOrNull(row.positionDB),
      age: numOrNull(row.age),
      is40Man: intFlag(row.is40Man),
      isActive: intFlag(row.isActive),
      fangraphsTeamId: numOrNull(row.playerTeamId),
      fastballVelocity: numOrNull(row.pivFA),
      sinkerVelocity: numOrNull(row.pivSI),
      games: numOrNull(row.G),
      saves: numOrNull(row.SV),
      saveOpportunities: numOrNull(row.SVOpp),
      holds: numOrNull(row.HLD),
      blownSaves: numOrNull(row.BS),
      inningsPitched: numOrNull(row.IP),
      bb9: numOrNull(row['BB/9']),
      bbPct: numOrNull(row['BB%']),
      k9: numOrNull(row['K/9']),
      kPct: numOrNull(row['K%']),
      era: numOrNull(row.ERA),
      battedBallEvents: numOrNull(row.BBE),
      avgEv: numOrNull(row.EV),
      launchAngle: numOrNull(row.LA),
      barrelPct: numOrNull(row['Barrel%']),
      hardHitPct: numOrNull(row['HardHit%']),
      meltdowns: numOrNull(row.MD),
      shutdowns: numOrNull(row.SD),
      stuffPlus: numOrNull(row.sp_stuff),
      stuffFastball: numOrNull(row.sp_s_FF),
      stuffSinker: numOrNull(row.sp_s_SI),
      stuffCutter: numOrNull(row.sp_s_FC),
      stuffSplitter: numOrNull(row.sp_s_FS),
      stuffSlider: numOrNull(row.sp_s_SL),
      stuffCurve: numOrNull(row.sp_s_CU),
      stuffChangeup: numOrNull(row.sp_s_CH),
      swingingStrikePct: numOrNull(row['SwStr%']),
      pitcherTotalsJson: jsonOrNull(row.pitcherTotals),
      rawRowJson: jsonOrNull(row),
      sourceSnapshotId,
      capturedAt
    })

    for (const usage of row.pitcherUsage || []) {
      const gameDate = textOrNull(usage.gameDate)
      closerUsageRows.push({
        usageEventId: `fg-closer-use:${date}:${team.slug}:${playerKey}:${gameDate || 'unknown'}`,
        sourceDate: date,
        teamSlug: team.slug,
        teamAbbr: team.abbr,
        teamName: team.name,
        gameDate,
        playerKey,
        fangraphsPlayerId,
        mlbamId: numOrNull(usage.mlbamid || row.mlbamid),
        playerName: textOrNull(usage.playerName || playerName),
        role: textOrNull(row.Role),
        tags: textOrNull(row.Tags),
        fangraphsTeamId: numOrNull(usage.teamid),
        fangraphsOpponentTeamId: numOrNull(usage.oppteamid),
        homeAway: textOrNull(usage.homeaway),
        games: numOrNull(usage.g),
        gamesStarted: numOrNull(usage.gs),
        wins: numOrNull(usage.w),
        losses: numOrNull(usage.l),
        blownSaves: numOrNull(usage.bs),
        saves: numOrNull(usage.sv),
        holds: numOrNull(usage.hld),
        inningsPitched: numOrNull(usage.ip),
        battersFaced: numOrNull(usage.tbf),
        pitches: numOrNull(usage.pitches),
        inning: textOrNull(usage.inn),
        leverageIndex: numOrNull(usage.LI),
        valueOverride: textOrNull(usage.valueOverride),
        rawRowJson: jsonOrNull(usage),
        sourceSnapshotId,
        capturedAt
      })
    }
  }
  return { closerRows, closerUsageRows, closerDateList: payload.dateList || [] }
}

const createTables = () => {
  sqliteExec(`
create table if not exists mlb_fangraphs_bullpen_depth_daily (
  source_date text not null,
  team_slug text not null,
  team_abbr text,
  team_name text,
  role text,
  position text,
  jersey_number text,
  player_name text not null,
  player_key text not null,
  fangraphs_player_id text,
  player_url text,
  throws text,
  age real,
  how_acquired text,
  options text,
  service_time text,
  signing_year integer,
  signing_team text,
  signing_round text,
  signing_pick text,
  overall_rank_next integer,
  org_rank_next integer,
  org_rank_previous integer,
  power_rank_overall integer,
  power_rank_last14 integer,
  is_40man integer not null default 0,
  source_snapshot_id text,
  captured_at text,
  primary key (source_date, team_slug, player_key)
);
create table if not exists mlb_fangraphs_bullpen_usage_daily (
  source_date text not null,
  team_slug text not null,
  team_abbr text,
  team_name text,
  player_key text not null,
  player_name text not null,
  role text,
  throws text,
  usage_date text,
  day_label text,
  pitches integer,
  outcome_flags_json text,
  override_status text,
  raw_value text,
  source_snapshot_id text,
  captured_at text,
  primary key (source_date, team_slug, player_key, usage_date)
);
create table if not exists mlb_fangraphs_relief_roster_daily (
  source_date text not null,
  team_slug text not null,
  team_abbr text,
  team_name text,
  source_loaded_at text,
  roster_ordinal integer,
  fangraphs_team_id integer,
  roster_type text,
  role text,
  position text,
  jersey_number text,
  player_name text not null,
  player_key text not null,
  fangraphs_player_id text,
  mlbam_id integer,
  retro_id text,
  stats_id text,
  mlb_auto text,
  minor_bam_id integer,
  player_url text,
  throws text,
  bats text,
  handed text,
  age real,
  is_40man integer,
  projected_level text,
  roster_notes text,
  injury_notes text,
  injury_date text,
  retro_date text,
  how_acquired text,
  acquired_code text,
  acquired_recent text,
  options text,
  service_time text,
  country text,
  season integer,
  innings_pitched real,
  rp_points real,
  power_rank_rp integer,
  power_rank_rp_last14 integer,
  projected_pt real,
  projected_war real,
  actual_pt real,
  actual_war real,
  proj_pit_gs real,
  proj_pit_sv real,
  proj_pit_hits real,
  proj_pit_so real,
  proj_pit_bb real,
  proj_pit_era real,
  proj_pit_ip real,
  proj_pit_war real,
  actual_pit_gs real,
  actual_pit_sv real,
  actual_pit_hits real,
  actual_pit_so real,
  actual_pit_bb real,
  actual_pit_era real,
  actual_pit_ip real,
  actual_pit_war real,
  actual_pit_k9 real,
  actual_pit_bb9 real,
  actual_pit_k_pct real,
  actual_pit_bb_pct real,
  actual_pit_barrel_pct real,
  actual_pit_hardhit_pct real,
  actual_pit_ev real,
  raw_row_json text,
  source_snapshot_id text,
  captured_at text,
  primary key (source_date, team_slug, player_key)
);
create table if not exists mlb_fangraphs_bullpen_usage_events_daily (
  usage_event_id text primary key,
  source_date text not null,
  team_slug text not null,
  team_abbr text,
  team_name text,
  source_loaded_at text,
  game_date text,
  player_key text not null,
  fangraphs_player_id text,
  mlbam_id integer,
  player_name text,
  fangraphs_team_id integer,
  fangraphs_opponent_team_id integer,
  opponent_team_abbr text,
  home_away text,
  games integer,
  games_started integer,
  wins integer,
  losses integer,
  blown_saves integer,
  saves integer,
  holds integer,
  innings_pitched real,
  batters_faced integer,
  pitches integer,
  value_override text,
  raw_row_json text,
  source_snapshot_id text,
  captured_at text
);
create table if not exists mlb_fangraphs_roster_transactions_daily (
  transaction_id text primary key,
  source_date text not null,
  team_slug text not null,
  team_abbr text,
  team_name text,
  source_loaded_at text,
  transaction_date text,
  position text,
  season integer,
  season_type text,
  player_key text,
  fangraphs_player_id text,
  mlbam_id integer,
  player_name text,
  transaction_category text,
  transaction_description text,
  transaction_team text,
  team_change text,
  notes text,
  fantasy_impact real,
  player_url text,
  raw_row_json text,
  source_snapshot_id text,
  captured_at text
);
create table if not exists mlb_fangraphs_team_rp_rankings_daily (
  source_date text not null,
  team_slug text not null,
  team_abbr text,
  team_name text,
  source_loaded_at text,
  fangraphs_team_id integer,
  era_rank integer,
  whip_rank integer,
  bb9_rank integer,
  k9_rank integer,
  h9_rank integer,
  hr9_rank integer,
  raw_row_json text,
  source_snapshot_id text,
  captured_at text,
  primary key (source_date, team_slug)
);
create table if not exists mlb_fangraphs_closer_depth_daily (
  source_date text not null,
  team_slug text not null,
  team_abbr text,
  team_name text,
  role text,
  tags text,
  player_key text not null,
  fangraphs_player_id text,
  mlbam_id integer,
  x_mlbam_id integer,
  player_name text,
  player_url text,
  throws text,
  position_db text,
  age real,
  is_40man integer,
  is_active integer,
  fangraphs_team_id integer,
  fastball_velocity real,
  sinker_velocity real,
  games integer,
  saves integer,
  save_opportunities integer,
  holds integer,
  blown_saves integer,
  innings_pitched real,
  bb9 real,
  bb_pct real,
  k9 real,
  k_pct real,
  era real,
  batted_ball_events integer,
  avg_ev real,
  launch_angle real,
  barrel_pct real,
  hardhit_pct real,
  meltdowns integer,
  shutdowns integer,
  stuff_plus real,
  stuff_fastball real,
  stuff_sinker real,
  stuff_cutter real,
  stuff_splitter real,
  stuff_slider real,
  stuff_curve real,
  stuff_changeup real,
  swinging_strike_pct real,
  pitcher_totals_json text,
  raw_row_json text,
  source_snapshot_id text,
  captured_at text,
  primary key (source_date, team_slug, player_key)
);
create table if not exists mlb_fangraphs_closer_usage_daily (
  usage_event_id text primary key,
  source_date text not null,
  team_slug text not null,
  team_abbr text,
  team_name text,
  game_date text,
  player_key text not null,
  fangraphs_player_id text,
  mlbam_id integer,
  player_name text,
  role text,
  tags text,
  fangraphs_team_id integer,
  fangraphs_opponent_team_id integer,
  home_away text,
  games integer,
  games_started integer,
  wins integer,
  losses integer,
  blown_saves integer,
  saves integer,
  holds integer,
  innings_pitched real,
  batters_faced integer,
  pitches integer,
  inning text,
  leverage_index real,
  value_override text,
  raw_row_json text,
  source_snapshot_id text,
  captured_at text
);
create index if not exists idx_fg_bullpen_depth_date_team on mlb_fangraphs_bullpen_depth_daily(source_date, team_slug);
create index if not exists idx_fg_bullpen_usage_date_team on mlb_fangraphs_bullpen_usage_daily(source_date, team_slug, usage_date);
create index if not exists idx_fg_relief_roster_date_team on mlb_fangraphs_relief_roster_daily(source_date, team_slug);
create index if not exists idx_fg_bullpen_usage_events_date_team on mlb_fangraphs_bullpen_usage_events_daily(source_date, team_slug, game_date);
create index if not exists idx_fg_roster_transactions_date_team on mlb_fangraphs_roster_transactions_daily(source_date, team_slug, transaction_date);
create index if not exists idx_fg_team_rp_rankings_date_team on mlb_fangraphs_team_rp_rankings_daily(source_date, team_slug);
create index if not exists idx_fg_closer_depth_date_team on mlb_fangraphs_closer_depth_daily(source_date, team_slug);
create index if not exists idx_fg_closer_usage_date_team on mlb_fangraphs_closer_usage_daily(source_date, team_slug, game_date);
delete from mlb_fangraphs_bullpen_depth_daily where source_date = ${sqlQuote(date)} and team_slug in (${selectedTeams.map((team) => sqlQuote(team.slug)).join(',')});
delete from mlb_fangraphs_bullpen_usage_daily where source_date = ${sqlQuote(date)} and team_slug in (${selectedTeams.map((team) => sqlQuote(team.slug)).join(',')});
delete from mlb_fangraphs_relief_roster_daily where source_date = ${sqlQuote(date)} and team_slug in (${selectedTeams.map((team) => sqlQuote(team.slug)).join(',')});
delete from mlb_fangraphs_bullpen_usage_events_daily where source_date = ${sqlQuote(date)} and team_slug in (${selectedTeams.map((team) => sqlQuote(team.slug)).join(',')});
delete from mlb_fangraphs_roster_transactions_daily where source_date = ${sqlQuote(date)} and team_slug in (${selectedTeams.map((team) => sqlQuote(team.slug)).join(',')});
delete from mlb_fangraphs_team_rp_rankings_daily where source_date = ${sqlQuote(date)} and team_slug in (${selectedTeams.map((team) => sqlQuote(team.slug)).join(',')});
delete from mlb_fangraphs_closer_depth_daily where source_date = ${sqlQuote(date)} and team_slug in (${selectedTeams.map((team) => sqlQuote(team.slug)).join(',')});
delete from mlb_fangraphs_closer_usage_daily where source_date = ${sqlQuote(date)} and team_slug in (${selectedTeams.map((team) => sqlQuote(team.slug)).join(',')});
`)
}

const insertDepthRows = (rows) => {
  if (!rows.length) return
  const values = rows.map((row) => `(
    ${sqlQuote(row.sourceDate)}, ${sqlQuote(row.teamSlug)}, ${sqlQuote(row.teamAbbr)}, ${sqlQuote(row.teamName)},
    ${sqlQuote(row.role)}, ${sqlQuote(row.position)}, ${sqlQuote(row.jerseyNumber)}, ${sqlQuote(row.playerName)},
    ${sqlQuote(row.playerKey)}, ${sqlQuote(row.fangraphsPlayerId)}, ${sqlQuote(row.playerUrl)}, ${sqlQuote(row.throws)},
    ${sqlQuote(row.age)}, ${sqlQuote(row.howAcquired)}, ${sqlQuote(row.options)}, ${sqlQuote(row.serviceTime)},
    ${sqlQuote(row.signingYear)}, ${sqlQuote(row.signingTeam)}, ${sqlQuote(row.signingRound)}, ${sqlQuote(row.signingPick)},
    ${sqlQuote(row.overallRankNext)}, ${sqlQuote(row.orgRankNext)}, ${sqlQuote(row.orgRankPrevious)},
    ${sqlQuote(row.powerRankOverall)}, ${sqlQuote(row.powerRankLast14)}, ${row.isFortyMan ? 1 : 0},
    ${sqlQuote(row.sourceSnapshotId)}, ${sqlQuote(row.capturedAt)}
  )`).join(',\n')
  sqliteExec(`insert or replace into mlb_fangraphs_bullpen_depth_daily (
    source_date, team_slug, team_abbr, team_name, role, position, jersey_number, player_name,
    player_key, fangraphs_player_id, player_url, throws, age, how_acquired, options, service_time,
    signing_year, signing_team, signing_round, signing_pick, overall_rank_next, org_rank_next,
    org_rank_previous, power_rank_overall, power_rank_last14, is_40man, source_snapshot_id, captured_at
  ) values ${values};`)
}

const insertUsageRows = (rows) => {
  if (!rows.length) return
  const values = rows.map((row) => `(
    ${sqlQuote(row.sourceDate)}, ${sqlQuote(row.teamSlug)}, ${sqlQuote(row.teamAbbr)}, ${sqlQuote(row.teamName)},
    ${sqlQuote(row.playerKey)}, ${sqlQuote(row.playerName)}, ${sqlQuote(row.role)}, ${sqlQuote(row.throws)},
    ${sqlQuote(row.usageDate)}, ${sqlQuote(row.dayLabel)}, ${sqlQuote(row.pitches)}, ${sqlQuote(JSON.stringify(row.flags))},
    ${sqlQuote(row.overrideStatus)}, ${sqlQuote(row.rawValue)}, ${sqlQuote(row.sourceSnapshotId)}, ${sqlQuote(row.capturedAt)}
  )`).join(',\n')
  sqliteExec(`insert or replace into mlb_fangraphs_bullpen_usage_daily (
    source_date, team_slug, team_abbr, team_name, player_key, player_name, role, throws,
    usage_date, day_label, pitches, outcome_flags_json, override_status, raw_value, source_snapshot_id, captured_at
  ) values ${values};`)
}

const insertChunked = (table, columns, rows, valueBuilder, chunkSize = 40) => {
  if (!rows.length) return
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize)
    sqliteExec(`insert or replace into ${table} (${columns.join(', ')}) values ${chunk.map(valueBuilder).join(',\n')};`)
  }
}

const insertReliefRosterRows = (rows) => insertChunked('mlb_fangraphs_relief_roster_daily', [
  'source_date', 'team_slug', 'team_abbr', 'team_name', 'source_loaded_at', 'roster_ordinal',
  'fangraphs_team_id', 'roster_type', 'role', 'position', 'jersey_number', 'player_name', 'player_key',
  'fangraphs_player_id', 'mlbam_id', 'retro_id', 'stats_id', 'mlb_auto', 'minor_bam_id', 'player_url',
  'throws', 'bats', 'handed', 'age', 'is_40man', 'projected_level', 'roster_notes', 'injury_notes',
  'injury_date', 'retro_date', 'how_acquired', 'acquired_code', 'acquired_recent', 'options',
  'service_time', 'country', 'season', 'innings_pitched', 'rp_points', 'power_rank_rp',
  'power_rank_rp_last14', 'projected_pt', 'projected_war', 'actual_pt', 'actual_war',
  'proj_pit_gs', 'proj_pit_sv', 'proj_pit_hits', 'proj_pit_so', 'proj_pit_bb', 'proj_pit_era',
  'proj_pit_ip', 'proj_pit_war', 'actual_pit_gs', 'actual_pit_sv', 'actual_pit_hits',
  'actual_pit_so', 'actual_pit_bb', 'actual_pit_era', 'actual_pit_ip', 'actual_pit_war',
  'actual_pit_k9', 'actual_pit_bb9', 'actual_pit_k_pct', 'actual_pit_bb_pct',
  'actual_pit_barrel_pct', 'actual_pit_hardhit_pct', 'actual_pit_ev', 'raw_row_json',
  'source_snapshot_id', 'captured_at'
], rows, (row) => `(
  ${sqlQuote(row.sourceDate)}, ${sqlQuote(row.teamSlug)}, ${sqlQuote(row.teamAbbr)}, ${sqlQuote(row.teamName)},
  ${sqlQuote(row.sourceLoadedAt)}, ${sqlQuote(row.rosterOrdinal)}, ${sqlQuote(row.fangraphsTeamId)},
  ${sqlQuote(row.rosterType)}, ${sqlQuote(row.role)}, ${sqlQuote(row.position)}, ${sqlQuote(row.jerseyNumber)},
  ${sqlQuote(row.playerName)}, ${sqlQuote(row.playerKey)}, ${sqlQuote(row.fangraphsPlayerId)}, ${sqlQuote(row.mlbamId)},
  ${sqlQuote(row.retroId)}, ${sqlQuote(row.statsId)}, ${sqlQuote(row.mlbAuto)}, ${sqlQuote(row.minorBamId)},
  ${sqlQuote(row.playerUrl)}, ${sqlQuote(row.throws)}, ${sqlQuote(row.bats)}, ${sqlQuote(row.handed)},
  ${sqlQuote(row.age)}, ${sqlQuote(row.is40Man)}, ${sqlQuote(row.projectedLevel)}, ${sqlQuote(row.rosterNotes)},
  ${sqlQuote(row.injuryNotes)}, ${sqlQuote(row.injuryDate)}, ${sqlQuote(row.retroDate)}, ${sqlQuote(row.howAcquired)},
  ${sqlQuote(row.acquiredCode)}, ${sqlQuote(row.acquiredRecent)}, ${sqlQuote(row.options)}, ${sqlQuote(row.serviceTime)},
  ${sqlQuote(row.country)}, ${sqlQuote(row.season)}, ${sqlQuote(row.inningsPitched)}, ${sqlQuote(row.rpPoints)},
  ${sqlQuote(row.powerRankRp)}, ${sqlQuote(row.powerRankRpLast14)}, ${sqlQuote(row.projectedPt)}, ${sqlQuote(row.projectedWar)},
  ${sqlQuote(row.actualPt)}, ${sqlQuote(row.actualWar)}, ${sqlQuote(row.projPitGs)}, ${sqlQuote(row.projPitSv)},
  ${sqlQuote(row.projPitHits)}, ${sqlQuote(row.projPitSo)}, ${sqlQuote(row.projPitBb)}, ${sqlQuote(row.projPitEra)},
  ${sqlQuote(row.projPitIp)}, ${sqlQuote(row.projPitWar)}, ${sqlQuote(row.actualPitGs)}, ${sqlQuote(row.actualPitSv)},
  ${sqlQuote(row.actualPitHits)}, ${sqlQuote(row.actualPitSo)}, ${sqlQuote(row.actualPitBb)}, ${sqlQuote(row.actualPitEra)},
  ${sqlQuote(row.actualPitIp)}, ${sqlQuote(row.actualPitWar)}, ${sqlQuote(row.actualPitK9)}, ${sqlQuote(row.actualPitBb9)},
  ${sqlQuote(row.actualPitKPct)}, ${sqlQuote(row.actualPitBbPct)}, ${sqlQuote(row.actualPitBarrelPct)},
  ${sqlQuote(row.actualPitHardHitPct)}, ${sqlQuote(row.actualPitEv)}, ${sqlQuote(row.rawRowJson)},
  ${sqlQuote(row.sourceSnapshotId)}, ${sqlQuote(row.capturedAt)}
)`)

const insertStructuredUsageRows = (rows) => insertChunked('mlb_fangraphs_bullpen_usage_events_daily', [
  'usage_event_id', 'source_date', 'team_slug', 'team_abbr', 'team_name', 'source_loaded_at', 'game_date',
  'player_key', 'fangraphs_player_id', 'mlbam_id', 'player_name', 'fangraphs_team_id',
  'fangraphs_opponent_team_id', 'opponent_team_abbr', 'home_away', 'games', 'games_started',
  'wins', 'losses', 'blown_saves', 'saves', 'holds', 'innings_pitched', 'batters_faced',
  'pitches', 'value_override', 'raw_row_json', 'source_snapshot_id', 'captured_at'
], rows, (row) => `(
  ${sqlQuote(row.usageEventId)}, ${sqlQuote(row.sourceDate)}, ${sqlQuote(row.teamSlug)}, ${sqlQuote(row.teamAbbr)},
  ${sqlQuote(row.teamName)}, ${sqlQuote(row.sourceLoadedAt)}, ${sqlQuote(row.gameDate)}, ${sqlQuote(row.playerKey)},
  ${sqlQuote(row.fangraphsPlayerId)}, ${sqlQuote(row.mlbamId)}, ${sqlQuote(row.playerName)}, ${sqlQuote(row.fangraphsTeamId)},
  ${sqlQuote(row.fangraphsOpponentTeamId)}, ${sqlQuote(row.opponentTeamAbbr)}, ${sqlQuote(row.homeAway)}, ${sqlQuote(row.games)},
  ${sqlQuote(row.gamesStarted)}, ${sqlQuote(row.wins)}, ${sqlQuote(row.losses)}, ${sqlQuote(row.blownSaves)},
  ${sqlQuote(row.saves)}, ${sqlQuote(row.holds)}, ${sqlQuote(row.inningsPitched)}, ${sqlQuote(row.battersFaced)},
  ${sqlQuote(row.pitches)}, ${sqlQuote(row.valueOverride)}, ${sqlQuote(row.rawRowJson)}, ${sqlQuote(row.sourceSnapshotId)},
  ${sqlQuote(row.capturedAt)}
)`)

const insertTransactionRows = (rows) => insertChunked('mlb_fangraphs_roster_transactions_daily', [
  'transaction_id', 'source_date', 'team_slug', 'team_abbr', 'team_name', 'source_loaded_at',
  'transaction_date', 'position', 'season', 'season_type', 'player_key', 'fangraphs_player_id',
  'mlbam_id', 'player_name', 'transaction_category', 'transaction_description', 'transaction_team',
  'team_change', 'notes', 'fantasy_impact', 'player_url', 'raw_row_json', 'source_snapshot_id', 'captured_at'
], rows, (row) => `(
  ${sqlQuote(row.transactionId)}, ${sqlQuote(row.sourceDate)}, ${sqlQuote(row.teamSlug)}, ${sqlQuote(row.teamAbbr)},
  ${sqlQuote(row.teamName)}, ${sqlQuote(row.sourceLoadedAt)}, ${sqlQuote(row.transactionDate)}, ${sqlQuote(row.position)},
  ${sqlQuote(row.season)}, ${sqlQuote(row.seasonType)}, ${sqlQuote(row.playerKey)}, ${sqlQuote(row.fangraphsPlayerId)},
  ${sqlQuote(row.mlbamId)}, ${sqlQuote(row.playerName)}, ${sqlQuote(row.transactionCategory)},
  ${sqlQuote(row.transactionDescription)}, ${sqlQuote(row.transactionTeam)}, ${sqlQuote(row.teamChange)},
  ${sqlQuote(row.notes)}, ${sqlQuote(row.fantasyImpact)}, ${sqlQuote(row.playerUrl)}, ${sqlQuote(row.rawRowJson)},
  ${sqlQuote(row.sourceSnapshotId)}, ${sqlQuote(row.capturedAt)}
)`)

const insertTeamRankingRows = (rows) => insertChunked('mlb_fangraphs_team_rp_rankings_daily', [
  'source_date', 'team_slug', 'team_abbr', 'team_name', 'source_loaded_at', 'fangraphs_team_id',
  'era_rank', 'whip_rank', 'bb9_rank', 'k9_rank', 'h9_rank', 'hr9_rank', 'raw_row_json',
  'source_snapshot_id', 'captured_at'
], rows, (row) => `(
  ${sqlQuote(row.sourceDate)}, ${sqlQuote(row.teamSlug)}, ${sqlQuote(row.teamAbbr)}, ${sqlQuote(row.teamName)},
  ${sqlQuote(row.sourceLoadedAt)}, ${sqlQuote(row.fangraphsTeamId)}, ${sqlQuote(row.eraRank)},
  ${sqlQuote(row.whipRank)}, ${sqlQuote(row.bb9Rank)}, ${sqlQuote(row.k9Rank)}, ${sqlQuote(row.h9Rank)},
  ${sqlQuote(row.hr9Rank)}, ${sqlQuote(row.rawRowJson)}, ${sqlQuote(row.sourceSnapshotId)}, ${sqlQuote(row.capturedAt)}
)`)

const insertCloserRows = (rows) => insertChunked('mlb_fangraphs_closer_depth_daily', [
  'source_date', 'team_slug', 'team_abbr', 'team_name', 'role', 'tags', 'player_key',
  'fangraphs_player_id', 'mlbam_id', 'x_mlbam_id', 'player_name', 'player_url', 'throws',
  'position_db', 'age', 'is_40man', 'is_active', 'fangraphs_team_id', 'fastball_velocity',
  'sinker_velocity', 'games', 'saves', 'save_opportunities', 'holds', 'blown_saves',
  'innings_pitched', 'bb9', 'bb_pct', 'k9', 'k_pct', 'era', 'batted_ball_events', 'avg_ev',
  'launch_angle', 'barrel_pct', 'hardhit_pct', 'meltdowns', 'shutdowns', 'stuff_plus',
  'stuff_fastball', 'stuff_sinker', 'stuff_cutter', 'stuff_splitter', 'stuff_slider',
  'stuff_curve', 'stuff_changeup', 'swinging_strike_pct', 'pitcher_totals_json',
  'raw_row_json', 'source_snapshot_id', 'captured_at'
], rows, (row) => `(
  ${sqlQuote(row.sourceDate)}, ${sqlQuote(row.teamSlug)}, ${sqlQuote(row.teamAbbr)}, ${sqlQuote(row.teamName)},
  ${sqlQuote(row.role)}, ${sqlQuote(row.tags)}, ${sqlQuote(row.playerKey)}, ${sqlQuote(row.fangraphsPlayerId)},
  ${sqlQuote(row.mlbamId)}, ${sqlQuote(row.xMlbamId)}, ${sqlQuote(row.playerName)}, ${sqlQuote(row.playerUrl)},
  ${sqlQuote(row.throws)}, ${sqlQuote(row.positionDb)}, ${sqlQuote(row.age)}, ${sqlQuote(row.is40Man)},
  ${sqlQuote(row.isActive)}, ${sqlQuote(row.fangraphsTeamId)}, ${sqlQuote(row.fastballVelocity)},
  ${sqlQuote(row.sinkerVelocity)}, ${sqlQuote(row.games)}, ${sqlQuote(row.saves)}, ${sqlQuote(row.saveOpportunities)},
  ${sqlQuote(row.holds)}, ${sqlQuote(row.blownSaves)}, ${sqlQuote(row.inningsPitched)}, ${sqlQuote(row.bb9)},
  ${sqlQuote(row.bbPct)}, ${sqlQuote(row.k9)}, ${sqlQuote(row.kPct)}, ${sqlQuote(row.era)},
  ${sqlQuote(row.battedBallEvents)}, ${sqlQuote(row.avgEv)}, ${sqlQuote(row.launchAngle)}, ${sqlQuote(row.barrelPct)},
  ${sqlQuote(row.hardHitPct)}, ${sqlQuote(row.meltdowns)}, ${sqlQuote(row.shutdowns)}, ${sqlQuote(row.stuffPlus)},
  ${sqlQuote(row.stuffFastball)}, ${sqlQuote(row.stuffSinker)}, ${sqlQuote(row.stuffCutter)},
  ${sqlQuote(row.stuffSplitter)}, ${sqlQuote(row.stuffSlider)}, ${sqlQuote(row.stuffCurve)},
  ${sqlQuote(row.stuffChangeup)}, ${sqlQuote(row.swingingStrikePct)}, ${sqlQuote(row.pitcherTotalsJson)},
  ${sqlQuote(row.rawRowJson)}, ${sqlQuote(row.sourceSnapshotId)}, ${sqlQuote(row.capturedAt)}
)`)

const insertCloserUsageRows = (rows) => insertChunked('mlb_fangraphs_closer_usage_daily', [
  'usage_event_id', 'source_date', 'team_slug', 'team_abbr', 'team_name', 'game_date', 'player_key',
  'fangraphs_player_id', 'mlbam_id', 'player_name', 'role', 'tags', 'fangraphs_team_id',
  'fangraphs_opponent_team_id', 'home_away', 'games', 'games_started', 'wins', 'losses',
  'blown_saves', 'saves', 'holds', 'innings_pitched', 'batters_faced', 'pitches', 'inning',
  'leverage_index', 'value_override', 'raw_row_json', 'source_snapshot_id', 'captured_at'
], rows, (row) => `(
  ${sqlQuote(row.usageEventId)}, ${sqlQuote(row.sourceDate)}, ${sqlQuote(row.teamSlug)}, ${sqlQuote(row.teamAbbr)},
  ${sqlQuote(row.teamName)}, ${sqlQuote(row.gameDate)}, ${sqlQuote(row.playerKey)}, ${sqlQuote(row.fangraphsPlayerId)},
  ${sqlQuote(row.mlbamId)}, ${sqlQuote(row.playerName)}, ${sqlQuote(row.role)}, ${sqlQuote(row.tags)},
  ${sqlQuote(row.fangraphsTeamId)}, ${sqlQuote(row.fangraphsOpponentTeamId)}, ${sqlQuote(row.homeAway)},
  ${sqlQuote(row.games)}, ${sqlQuote(row.gamesStarted)}, ${sqlQuote(row.wins)}, ${sqlQuote(row.losses)},
  ${sqlQuote(row.blownSaves)}, ${sqlQuote(row.saves)}, ${sqlQuote(row.holds)}, ${sqlQuote(row.inningsPitched)},
  ${sqlQuote(row.battersFaced)}, ${sqlQuote(row.pitches)}, ${sqlQuote(row.inning)}, ${sqlQuote(row.leverageIndex)},
  ${sqlQuote(row.valueOverride)}, ${sqlQuote(row.rawRowJson)}, ${sqlQuote(row.sourceSnapshotId)}, ${sqlQuote(row.capturedAt)}
)`)

const writeSourceRows = (capturedAt, runId, totalDepthRows, totalUsageRows, teamSummaries, extraCounts = {}) => {
  const notes = JSON.stringify({
    teamCount: selectedTeams.length,
    depthRows: totalDepthRows,
    usageRows: totalUsageRows,
    ...extraCounts,
    teams: teamSummaries
  })
  sqliteExec(`
insert or replace into source_fetch_runs (
  source_fetch_run_id, sport, source_name, source_family, source_date, run_reason, requested_url,
  cache_status, cache_ttl_hours, previous_success_at, status, completeness_status, expected_item_count,
  actual_item_count, missing_item_count, source_snapshot_id, started_at, finished_at, error_code, error_message, details_json
) values (
  ${sqlQuote(runId)}, 'mlb', ${sqlQuote(sourceName)}, ${sqlQuote(sourceFamily)}, ${sqlQuote(date)}, 'daily-bullpen-depth-warehouse',
  'https://www.fangraphs.com/roster-resource/depth-charts/{team}', 'network', null, null, 'success', 'complete',
  ${selectedTeams.length}, ${teamSummaries.length}, ${selectedTeams.length - teamSummaries.length}, null,
  ${sqlQuote(capturedAt)}, ${sqlQuote(capturedAt)}, null, null, ${sqlQuote(notes)}
);
insert or replace into source_fetch_status (
  source_fetch_status_id, sport, source_name, source_family, source_date, last_fetch_run_id,
  last_attempt_at, last_success_at, last_status, last_completeness_status, cache_valid_until,
  expected_item_count, actual_item_count, missing_item_count, unresolved_count, updated_at, notes
) values (
  ${sqlQuote(`mlb-${sourceName}-${date}`)}, 'mlb', ${sqlQuote(sourceName)}, ${sqlQuote(sourceFamily)}, ${sqlQuote(date)},
  ${sqlQuote(runId)}, ${sqlQuote(capturedAt)}, ${sqlQuote(capturedAt)}, 'success', 'complete', null,
  ${selectedTeams.length}, ${teamSummaries.length}, ${selectedTeams.length - teamSummaries.length}, 0, ${sqlQuote(capturedAt)}, ${sqlQuote(notes)}
);
	`)
}

const writeCloserSourceRows = (capturedAt, runId, closerSummary) => {
  const notes = JSON.stringify(closerSummary)
  sqliteExec(`
insert or replace into source_fetch_runs (
  source_fetch_run_id, sport, source_name, source_family, source_date, run_reason, requested_url,
  cache_status, cache_ttl_hours, previous_success_at, status, completeness_status, expected_item_count,
  actual_item_count, missing_item_count, source_snapshot_id, started_at, finished_at, error_code, error_message, details_json
) values (
  ${sqlQuote(runId)}, 'mlb', ${sqlQuote(closerSourceName)}, ${sqlQuote(closerSourceFamily)}, ${sqlQuote(date)}, 'daily-closer-depth-warehouse',
  'https://www.fangraphs.com/roster-resource/closer-depth-chart', 'network', null, null, 'success', 'complete',
  1, 1, 0, ${sqlQuote(closerSummary.sourceSnapshotId)}, ${sqlQuote(capturedAt)}, ${sqlQuote(capturedAt)}, null, null, ${sqlQuote(notes)}
);
insert or replace into source_fetch_status (
  source_fetch_status_id, sport, source_name, source_family, source_date, last_fetch_run_id,
  last_attempt_at, last_success_at, last_status, last_completeness_status, cache_valid_until,
  expected_item_count, actual_item_count, missing_item_count, unresolved_count, updated_at, notes
) values (
  ${sqlQuote(`mlb-${closerSourceName}-${date}`)}, 'mlb', ${sqlQuote(closerSourceName)}, ${sqlQuote(closerSourceFamily)}, ${sqlQuote(date)},
  ${sqlQuote(runId)}, ${sqlQuote(capturedAt)}, ${sqlQuote(capturedAt)}, 'success', 'complete', null,
  1, 1, 0, 0, ${sqlQuote(capturedAt)}, ${sqlQuote(notes)}
);
`)
}

const latestCachedTeamArtifact = async (team, maxLookbackDays = 7) => {
  for (let offset = 1; offset <= maxLookbackDays; offset += 1) {
    const fallbackDate = addDays(date, -offset)
    const artifactPath = path.join(
      rootDir,
      'data-private/warehouse/mlb/fangraphs-bullpen-depth',
      fallbackDate,
      `${team.slug}.json`
    )
    const artifact = await readJsonIfExists(artifactPath)
    if (artifact?.depthRows?.length) return { artifact, artifactPath, fallbackDate }
  }
  return null
}

const withTodaySource = (rows = [], sourceSnapshotId, capturedAt, idRewriter = null) =>
  rows.map((row) => {
    const next = {
      ...row,
      sourceDate: date,
      teamSlug: row.teamSlug || row.team?.slug,
      teamAbbr: row.teamAbbr || row.team?.abbr,
      teamName: row.teamName || row.team?.name,
      sourceSnapshotId,
      capturedAt
    }
    if (idRewriter) idRewriter(next)
    return next
  })

const loadCachedTeam = async (team, sourceUrl, fetchStatus) => {
  const cached = await latestCachedTeamArtifact(team)
  if (!cached) return null

  const capturedAt = new Date().toISOString()
  const sourceSnapshotId = `mlb-fangraphs-bullpen-${date}-${team.slug}-cached-${cached.fallbackDate}`
  const artifactPath = path.join(rootDir, 'data-private/warehouse/mlb/fangraphs-bullpen-depth', date, `${team.slug}.json`)
  await fs.mkdir(path.dirname(artifactPath), { recursive: true })

  const depthRows = withTodaySource(cached.artifact.depthRows, sourceSnapshotId, capturedAt)
  const usageRows = withTodaySource(cached.artifact.usageRows, sourceSnapshotId, capturedAt)
  const reliefRosterRows = withTodaySource(cached.artifact.reliefRosterRows, sourceSnapshotId, capturedAt)
  const structuredUsageRows = withTodaySource(
    cached.artifact.structuredUsageRows,
    sourceSnapshotId,
    capturedAt,
    (row) => {
      if (typeof row.usageEventId === 'string') {
        row.usageEventId = row.usageEventId.replace(/^fg-bp-use:[^:]+:/, `fg-bp-use:${date}:`)
      }
    }
  )
  const transactionRows = withTodaySource(
    cached.artifact.transactionRows,
    sourceSnapshotId,
    capturedAt,
    (row) => {
      if (typeof row.transactionId === 'string') {
        row.transactionId = row.transactionId.replace(/^fg-tx:[^:]+:/, `fg-tx:${date}:`)
      }
    }
  )
  const teamRankingRows = withTodaySource(cached.artifact.teamRankingRows, sourceSnapshotId, capturedAt)

  await fs.writeFile(artifactPath, JSON.stringify({
    ...cached.artifact,
    sourceDate: date,
    capturedAt,
    sourceUrl,
    sourceSnapshotId,
    team,
    cacheFallback: {
      fromDate: cached.fallbackDate,
      fromArtifactPath: path.relative(rootDir, cached.artifactPath),
      reason: fetchStatus
    },
    depthRows,
    usageRows,
    reliefRosterRows,
    structuredUsageRows,
    transactionRows,
    teamRankingRows
  }, null, 2))

  sqliteExec(`
insert or replace into source_snapshots (
  source_snapshot_id, source_name, sport, source_url, local_path, captured_at, source_date, content_hash, content_type, status, notes
) values (
  ${sqlQuote(sourceSnapshotId)}, ${sqlQuote(sourceName)}, 'mlb', ${sqlQuote(sourceUrl)},
  ${sqlQuote(path.relative(rootDir, artifactPath))}, ${sqlQuote(capturedAt)}, ${sqlQuote(date)}, ${sqlQuote(cached.artifact.contentHash || null)},
  'application/json', 'cached', ${sqlQuote(JSON.stringify({
    team,
    fallbackFromDate: cached.fallbackDate,
    fallbackFromArtifactPath: path.relative(rootDir, cached.artifactPath),
    reason: fetchStatus,
    artifactPath: path.relative(rootDir, artifactPath)
  }))}
);
`)

  return {
    team,
    capturedAt,
    sourceSnapshotId,
    depthRows,
    usageRows,
    enrichedRows: {
      sourceLoadedAt: cached.artifact.sourceLoadedAt,
      rosterRows: reliefRosterRows,
      structuredUsageRows,
      transactionRows,
      teamRankingRows
    },
    rawPath: cached.artifactPath,
    artifactPath,
    cacheFallback: {
      fromDate: cached.fallbackDate,
      reason: fetchStatus
    }
  }
}

const fetchTeam = async (team) => {
  const sourceUrl = `https://www.fangraphs.com/roster-resource/depth-charts/${team.slug}`
  const response = await fetch(sourceUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 Codex MLB bullpen depth warehouse',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })
  if (!response.ok) {
    const fetchStatus = `${response.status} ${response.statusText}`.trim()
    const cached = await loadCachedTeam(team, sourceUrl, fetchStatus)
    if (cached) return cached
    throw new Error(`FanGraphs fetch failed for ${team.slug}: ${fetchStatus}`)
  }
  const html = await response.text()
  const capturedAt = new Date().toISOString()
  const contentHash = crypto.createHash('sha256').update(html).digest('hex')
  const sourceSnapshotId = `mlb-fangraphs-bullpen-${date}-${team.slug}-${contentHash.slice(0, 16)}`
  const rawPath = path.join(rootDir, 'data-private/raw/fangraphs/mlb/depth-charts', date, `${team.slug}.html`)
  const artifactPath = path.join(rootDir, 'data-private/warehouse/mlb/fangraphs-bullpen-depth', date, `${team.slug}.json`)
  await fs.mkdir(path.dirname(rawPath), { recursive: true })
  await fs.mkdir(path.dirname(artifactPath), { recursive: true })
  await fs.writeFile(rawPath, html)
  const { depthRows, usageRows } = parseBullpen(html, team, sourceSnapshotId, capturedAt)
  const payload = extractRosterResourcePayload(html, team.slug)
  const enrichedRows = parseTeamPayloadRows(payload, team, sourceSnapshotId, capturedAt)
  await fs.writeFile(artifactPath, JSON.stringify({
    schemaVersion: 2,
    source: sourceName,
    sourceUrl,
    sourceDate: date,
    capturedAt,
    contentHash,
    sourceSnapshotId,
    sourceLoadedAt: enrichedRows.sourceLoadedAt,
    team,
    depthRows,
    usageRows,
    reliefRosterRows: enrichedRows.rosterRows,
    structuredUsageRows: enrichedRows.structuredUsageRows,
    transactionRows: enrichedRows.transactionRows,
    teamRankingRows: enrichedRows.teamRankingRows
  }, null, 2))
  sqliteExec(`
insert or replace into source_snapshots (
  source_snapshot_id, source_name, sport, source_url, local_path, captured_at, source_date, content_hash, content_type, status, notes
) values (
  ${sqlQuote(sourceSnapshotId)}, ${sqlQuote(sourceName)}, 'mlb', ${sqlQuote(sourceUrl)},
  ${sqlQuote(path.relative(rootDir, rawPath))}, ${sqlQuote(capturedAt)}, ${sqlQuote(date)}, ${sqlQuote(contentHash)},
  'text/html', 'captured', ${sqlQuote(JSON.stringify({
    team,
    sourceLoadedAt: enrichedRows.sourceLoadedAt,
    depthRows: depthRows.length,
    usageRows: usageRows.length,
    reliefRosterRows: enrichedRows.rosterRows.length,
    structuredUsageRows: enrichedRows.structuredUsageRows.length,
    transactionRows: enrichedRows.transactionRows.length,
    teamRankingRows: enrichedRows.teamRankingRows.length,
    artifactPath: path.relative(rootDir, artifactPath)
  }))}
);
`)
  return { team, capturedAt, sourceSnapshotId, depthRows, usageRows, enrichedRows, rawPath, artifactPath }
}

const fetchCloserDepth = async () => {
  const sourceUrl = 'https://www.fangraphs.com/roster-resource/closer-depth-chart'
  const response = await fetch(sourceUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 Codex MLB closer depth warehouse',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })
  if (!response.ok) throw new Error(`FanGraphs closer depth fetch failed: ${response.status} ${response.statusText}`)
  const html = await response.text()
  const capturedAt = new Date().toISOString()
  const contentHash = crypto.createHash('sha256').update(html).digest('hex')
  const sourceSnapshotId = `mlb-fangraphs-closer-depth-${date}-${contentHash.slice(0, 16)}`
  const rawPath = path.join(rootDir, 'data-private/raw/fangraphs/mlb/closer-depth-chart', date, 'closer-depth-chart.html')
  const artifactPath = path.join(rootDir, 'data-private/warehouse/mlb/fangraphs-closer-depth', date, 'closer-depth-chart.json')
  await fs.mkdir(path.dirname(rawPath), { recursive: true })
  await fs.mkdir(path.dirname(artifactPath), { recursive: true })
  await fs.writeFile(rawPath, html)
  const payload = extractRosterResourcePayload(html, 'closer-depth-chart')
  const { closerRows, closerUsageRows, closerDateList } = parseCloserPayloadRows(payload, sourceSnapshotId, capturedAt)
  await fs.writeFile(artifactPath, JSON.stringify({
    schemaVersion: 1,
    source: closerSourceName,
    sourceUrl,
    sourceDate: date,
    capturedAt,
    contentHash,
    sourceSnapshotId,
    requestedTeams: selectedTeams,
    dateList: closerDateList,
    closerRows,
    closerUsageRows
  }, null, 2))
  sqliteExec(`
insert or replace into source_snapshots (
  source_snapshot_id, source_name, sport, source_url, local_path, captured_at, source_date, content_hash, content_type, status, notes
) values (
  ${sqlQuote(sourceSnapshotId)}, ${sqlQuote(closerSourceName)}, 'mlb', ${sqlQuote(sourceUrl)},
  ${sqlQuote(path.relative(rootDir, rawPath))}, ${sqlQuote(capturedAt)}, ${sqlQuote(date)}, ${sqlQuote(contentHash)},
  'text/html', 'captured', ${sqlQuote(JSON.stringify({
    requestedTeams: selectedTeams.map((team) => team.slug),
    closerRows: closerRows.length,
    closerUsageRows: closerUsageRows.length,
    dateList: closerDateList,
    artifactPath: path.relative(rootDir, artifactPath)
  }))}
);
`)
  return { capturedAt, sourceSnapshotId, closerRows, closerUsageRows, closerDateList, rawPath, artifactPath }
}

const main = async () => {
  createTables()
  const capturedAt = new Date().toISOString()
  const runId = `mlb-fangraphs-bullpen-depth-${date}-${crypto.randomUUID()}`
  const teamSummaries = []
  let totalDepthRows = 0
  let totalUsageRows = 0
  let totalReliefRosterRows = 0
  let totalStructuredUsageRows = 0
  let totalTransactionRows = 0
  let totalTeamRankingRows = 0
  let cacheFallbackTeams = 0
  for (const team of selectedTeams) {
    const result = await fetchTeam(team)
    if (result.depthRows.length === 0) throw new Error(`No bullpen rows parsed for ${team.slug}`)
    insertDepthRows(result.depthRows)
    insertUsageRows(result.usageRows)
    insertReliefRosterRows(result.enrichedRows.rosterRows)
    insertStructuredUsageRows(result.enrichedRows.structuredUsageRows)
    insertTransactionRows(result.enrichedRows.transactionRows)
    insertTeamRankingRows(result.enrichedRows.teamRankingRows)
    totalDepthRows += result.depthRows.length
    totalUsageRows += result.usageRows.length
    totalReliefRosterRows += result.enrichedRows.rosterRows.length
    totalStructuredUsageRows += result.enrichedRows.structuredUsageRows.length
    totalTransactionRows += result.enrichedRows.transactionRows.length
    totalTeamRankingRows += result.enrichedRows.teamRankingRows.length
    if (result.cacheFallback) cacheFallbackTeams += 1
    teamSummaries.push({
      teamSlug: team.slug,
      teamAbbr: team.abbr,
      sourceLoadedAt: result.enrichedRows.sourceLoadedAt,
      cacheFallback: result.cacheFallback || null,
      depthRows: result.depthRows.length,
      usageRows: result.usageRows.length,
      reliefRosterRows: result.enrichedRows.rosterRows.length,
      structuredUsageRows: result.enrichedRows.structuredUsageRows.length,
      transactionRows: result.enrichedRows.transactionRows.length,
      teamRankingRows: result.enrichedRows.teamRankingRows.length,
      rawPath: path.relative(rootDir, result.rawPath),
      artifactPath: path.relative(rootDir, result.artifactPath)
    })
  }

  const closerResult = await fetchCloserDepth()
  insertCloserRows(closerResult.closerRows)
  insertCloserUsageRows(closerResult.closerUsageRows)

  writeSourceRows(capturedAt, runId, totalDepthRows, totalUsageRows, teamSummaries, {
    reliefRosterRows: totalReliefRosterRows,
    structuredUsageRows: totalStructuredUsageRows,
    transactionRows: totalTransactionRows,
    teamRankingRows: totalTeamRankingRows,
    cacheFallbackTeams,
    closerRows: closerResult.closerRows.length,
    closerUsageRows: closerResult.closerUsageRows.length
  })
  writeCloserSourceRows(capturedAt, `mlb-fangraphs-closer-depth-${date}-${crypto.randomUUID()}`, {
    sourceSnapshotId: closerResult.sourceSnapshotId,
    requestedTeams: selectedTeams.map((team) => team.slug),
    closerRows: closerResult.closerRows.length,
    closerUsageRows: closerResult.closerUsageRows.length,
    dateList: closerResult.closerDateList,
    rawPath: path.relative(rootDir, closerResult.rawPath),
    artifactPath: path.relative(rootDir, closerResult.artifactPath)
  })

  console.log(JSON.stringify({
    status: 'ok',
    date,
    teams: selectedTeams.length,
    depthRows: totalDepthRows,
    usageRows: totalUsageRows,
    reliefRosterRows: totalReliefRosterRows,
    structuredUsageRows: totalStructuredUsageRows,
    transactionRows: totalTransactionRows,
    teamRankingRows: totalTeamRankingRows,
    cacheFallbackTeams,
    closerRows: closerResult.closerRows.length,
    closerUsageRows: closerResult.closerUsageRows.length,
    examples: teamSummaries.slice(0, 6)
  }, null, 2))
}

main().then(() => {
  process.exit(0)
}).catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})

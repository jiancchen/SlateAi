import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { parkContextByHomeTeam } from '../src/lib/day-2026-05-13-mlb-data.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const abbrToTeam = {
  PHI: 'Phillies',
  PIT: 'Pirates',
  TOR: 'Blue Jays',
  DET: 'Tigers',
  BAL: 'Orioles',
  WSH: 'Nationals',
  MIL: 'Brewers',
  MIN: 'Twins',
  MIA: 'Marlins',
  TB: 'Rays',
  CIN: 'Reds',
  CLE: 'Guardians',
  BOS: 'Red Sox',
  ATL: 'Braves',
  NYY: 'Yankees',
  NYM: 'Mets',
  CHC: 'Cubs',
  CWS: 'White Sox',
  TEX: 'Rangers',
  HOU: 'Astros',
  KC: 'Royals',
  STL: 'Cardinals',
  ARI: 'Diamondbacks',
  COL: 'Rockies',
  LAD: 'Dodgers',
  LAA: 'Angels',
  SF: 'Giants',
  ATH: 'Athletics',
  SD: 'Padres',
  SEA: 'Mariners'
}

const teamToAbbr = Object.fromEntries(Object.entries(abbrToTeam).map(([abbr, team]) => [team, abbr]))

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: null,
    top: 12,
    scanLimit: 24,
    teamLimit: 4,
    out: null,
    moduleOut: null
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') options.date = args[++index]
    else if (arg === '--top') options.top = Number(args[++index])
    else if (arg === '--scan-limit') options.scanLimit = Number(args[++index])
    else if (arg === '--team-limit') options.teamLimit = Number(args[++index])
    else if (arg === '--out') options.out = args[++index]
    else if (arg === '--module-out') options.moduleOut = args[++index]
  }

  if (!options.date) {
    throw new Error('Missing required --date argument, expected YYYY-MM-DD.')
  }

  options.out ||= path.join(rootDir, 'data', 'predictions', 'mlb-home-runs', `${options.date}-statcast-prototype.json`)
  return options
}

const formatPlayerName = (value = '') => {
  const [lastName = '', firstName = ''] = value.split(',').map((part) => part.trim())
  return firstName ? `${firstName} ${lastName}` : value
}

const parseCsv = (text) => {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  const pushField = () => {
    row.push(field)
    field = ''
  }

  const pushRow = () => {
    rows.push(row)
    row = []
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      pushField()
      continue
    }

    if (char === '\n') {
      pushField()
      pushRow()
      continue
    }

    if (char === '\r') {
      continue
    }

    field += char
  }

  if (field.length || row.length) {
    pushField()
    pushRow()
  }

  const header = rows[0][0]?.charCodeAt(0) === 0xfeff ? [rows[0][0].slice(1), ...rows[0].slice(1)] : rows[0]
  return rows
    .slice(1)
    .filter((entry) => entry.length === header.length)
    .map((entry) => Object.fromEntries(header.map((column, index) => [column, entry[index]])))
}

const loadDayGames = async (date) => {
  const dayModulePath = path.join(rootDir, 'src', 'lib', `day-${date}.js`)
  const dayModule = await import(pathToFileURL(dayModulePath).href)
  return dayModule.games.filter((game) => game.league === 'MLB')
}

const buildMatchupMap = (games) => {
  const matchupByAbbr = {}

  for (const game of games) {
    const awayTeam = game.participants[0].name
    const homeTeam = game.participants[1].name
    const awayAbbr = teamToAbbr[awayTeam]
    const homeAbbr = teamToAbbr[homeTeam]
    const parkContext = parkContextByHomeTeam[homeTeam] || {}
    const awayPitcher = game.starterContext?.away || {}
    const homePitcher = game.starterContext?.home || {}

    const homeParkHrIndex = Number(parkContext.indexHr || 100)
    const awayOpponentHr9 =
      Number(homePitcher.homeRunsAllowed || 0) * 9 / Math.max(Number(homePitcher.inningsPitched || 1), 1)
    const homeOpponentHr9 =
      Number(awayPitcher.homeRunsAllowed || 0) * 9 / Math.max(Number(awayPitcher.inningsPitched || 1), 1)

    matchupByAbbr[awayAbbr] = {
      teamName: awayTeam,
      gameTitle: game.title,
      opposingPitcher: homePitcher.fullName,
      opposingPitcherHand: homePitcher.pitchHand,
      opposingPitcherHr9: awayOpponentHr9,
      parkHrIndex: homeParkHrIndex
    }

    matchupByAbbr[homeAbbr] = {
      teamName: homeTeam,
      gameTitle: game.title,
      opposingPitcher: awayPitcher.fullName,
      opposingPitcherHand: awayPitcher.pitchHand,
      opposingPitcherHr9: homeOpponentHr9,
      parkHrIndex: homeParkHrIndex
    }
  }

  return matchupByAbbr
}

const fetchStatcastLeaderboard = async (season) => {
  const url = `https://baseballsavant.mlb.com/leaderboard/home-runs?year=${season}&player_type=Batter&cat=xhr&team=&min=0&csv=true`
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch Statcast leaderboard: ${response.status}`)
  }
  return parseCsv(await response.text())
}

const fetchPlayerDetails = async (playerId, season) => {
  const url =
    `https://baseballsavant.mlb.com/leaderboard/home-runs?type=details&player_id=${playerId}` +
    `&year=${season}&player_type=Batter&cat=xhr`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch Statcast detail for player ${playerId}: ${response.status}`)
  }
  return response.json()
}

const scoreCandidateDetails = (candidate, detailRows, season) => {
  const recentRows = detailRows.filter((row) => row.result === 'home_run' && row.game_date >= `${season}-05-01`)
  const last7Rows = detailRows.filter((row) => row.result === 'home_run' && row.game_date >= `${season}-05-08`)
  const noDoubterRate = recentRows.length
    ? recentRows.filter((row) => row.hr_cat === 'No Doubter').length / recentRows.length
    : 0
  const avgEv = recentRows.length
    ? recentRows.reduce((sum, row) => sum + Number(row.exit_velocity || 0), 0) / recentRows.length
    : 0

  candidate.recentHrSinceMay1 = recentRows.length
  candidate.homeRunsLast7Days = last7Rows.length
  candidate.noDoubterRate = Number(noDoubterRate.toFixed(2))
  candidate.avgExitVelocityOnHomers = Number(avgEv.toFixed(1))
  candidate.score = Number(
    (
      candidate.baseScore +
      candidate.recentHrSinceMay1 * 2.8 +
      candidate.homeRunsLast7Days * 1.6 +
      candidate.noDoubterRate * 6 +
      Math.max(0, (avgEv - 104) * 0.5)
    ).toFixed(1)
  )
  candidate.scoreBand =
    candidate.score >= 100 ? 'premium' : candidate.score >= 82 ? 'strong' : candidate.score >= 70 ? 'live' : 'thin'
  candidate.burstTag =
    candidate.homeRunsLast7Days >= 4
      ? 'heater'
      : candidate.recentHrSinceMay1 >= 5
        ? 'active'
        : candidate.noDoubterRate >= 0.55
          ? 'carry'
          : 'watch'
  candidate.rationale = [
    `${candidate.seasonHr} HR and ${candidate.seasonXHR} xHR on the season`,
    `${candidate.recentHrSinceMay1} HR since May 1 with ${candidate.homeRunsLast7Days} in the last week`,
    `${candidate.opposingPitcher} is allowing roughly ${candidate.opposingPitcherHr9} HR/9`,
    `Park HR index ${candidate.parkHrIndex}`
  ]

  return candidate
}

const scoreCandidates = async ({ date, season, top, scanLimit, teamLimit }) => {
  const games = await loadDayGames(date)
  const matchupByAbbr = buildMatchupMap(games)
  const leaderboard = await fetchStatcastLeaderboard(season)

  const preScoredCandidates = leaderboard
    .filter((row) => matchupByAbbr[row.team_abbrev])
    .map((row) => {
      const matchup = matchupByAbbr[row.team_abbrev]
      const hr = Number(row.hr_total)
      const xhr = Number(row.xhr)
      const xhrDiff = Number(row.xhr_diff)
      const baseScore =
        xhr * 2.4 +
        hr * 1.3 +
        matchup.opposingPitcherHr9 * 7 +
        (matchup.parkHrIndex - 100) * 0.12 +
        Math.max(0, -xhrDiff) * 2.2 -
        Math.max(0, xhrDiff) * 0.8

      return {
        playerId: Number(row.player_id),
        playerName: formatPlayerName(row.player),
        teamAbbrev: row.team_abbrev,
        teamName: matchup.teamName,
        gameTitle: matchup.gameTitle,
        opposingPitcher: matchup.opposingPitcher,
        opposingPitcherHand: matchup.opposingPitcherHand,
        opposingPitcherHr9: Number(matchup.opposingPitcherHr9.toFixed(2)),
        parkHrIndex: matchup.parkHrIndex,
        seasonHr: hr,
        seasonXHR: xhr,
        xhrDiff,
        baseScore
      }
    })
    .filter((candidate) => candidate.seasonHr >= 5 || candidate.seasonXHR >= 5)
    .sort((left, right) => right.baseScore - left.baseScore)

  const shortlistedCandidates = Object.values(
    preScoredCandidates.reduce((accumulator, candidate) => {
      accumulator[candidate.teamAbbrev] ||= []
      accumulator[candidate.teamAbbrev].push(candidate)
      return accumulator
    }, {})
  )
    .flatMap((teamCandidates) => teamCandidates.slice(0, teamLimit))
    .slice(0, Math.max(scanLimit, games.length * 6))

  const scoredCandidates = []
  const chunkSize = 8
  for (let start = 0; start < shortlistedCandidates.length; start += chunkSize) {
    const batch = shortlistedCandidates.slice(start, start + chunkSize)
    const batchScores = await Promise.all(
      batch.map(async (candidate) => {
        const detailRows = await fetchPlayerDetails(candidate.playerId, season)
        return scoreCandidateDetails(candidate, detailRows, season)
      })
    )
    scoredCandidates.push(...batchScores)
  }

  const rankedPicks = scoredCandidates
    .sort((left, right) => right.score - left.score)
    .slice(0, top)
    .map((candidate, index) => ({
      rank: index + 1,
      ...candidate
    }))

  const gameBoards = games.map((game) => {
    const candidates = scoredCandidates
      .filter((candidate) => candidate.gameTitle === game.title)
      .sort((left, right) => right.score - left.score)

    const likely = candidates.slice(0, 1)
    if (candidates[1] && candidates[1].score >= Math.max(68, candidates[0].score - 7)) {
      likely.push(candidates[1])
    }
    const possible = candidates
      .filter((candidate) => !likely.some((likelyCandidate) => likelyCandidate.playerId === candidate.playerId))
      .slice(0, 3)
      .filter((candidate) => candidate.score >= 53)

    const leadCandidate = likely[0] ?? possible[0] ?? null
    let gameSummary = 'No usable home-run lane has surfaced yet on the pre-lineup board.'
    if (leadCandidate) {
      gameSummary =
        leadCandidate.scoreBand === 'premium'
          ? `${leadCandidate.playerName} is the premium carry bat here, driven by ${leadCandidate.recentHrSinceMay1} recent homers, a ${leadCandidate.opposingPitcherHr9} HR/9 starter matchup, and elite carry quality.`
          : leadCandidate.scoreBand === 'strong' || leadCandidate.scoreBand === 'live'
            ? `${leadCandidate.playerName} is the cleanest likely bat here, driven by ${leadCandidate.recentHrSinceMay1} recent homers, a ${leadCandidate.opposingPitcherHr9} HR/9 starter matchup, and a ${leadCandidate.scoreBand} contact-quality signal.`
            : `${leadCandidate.playerName} is the best available lane here, but this game still grades as a thinner HR script before confirmed lineups arrive.`
    }

    return {
      gameTitle: game.title,
      likely,
      possible,
      summary: gameSummary
    }
  })

  return {
    picks: rankedPicks,
    games: gameBoards
  }
}

const main = async () => {
  const { date, top, scanLimit, teamLimit, out, moduleOut } = parseArgs()
  const season = Number(date.slice(0, 4))
  const { picks, games } = await scoreCandidates({ date, season, top, scanLimit, teamLimit })

  const payload = {
    modelName: 'statcast-hr-prototype-v2',
    date,
    generatedAt: new Date().toISOString(),
    sources: [
      'https://baseballsavant.mlb.com/leaderboard/home-runs',
      `https://baseballsavant.mlb.com/leaderboard/home-runs?year=${season}&player_type=Batter&cat=xhr&team=&min=0&csv=true`,
      'https://baseballsavant.mlb.com/leaderboard/home-runs?type=details'
    ],
    picks,
    games
  }

  await mkdir(path.dirname(out), { recursive: true })
  await writeFile(out, JSON.stringify(payload, null, 2))
  if (moduleOut) {
    const moduleSource = `export const homeRunBoardMeta = ${JSON.stringify(
      {
        modelName: payload.modelName,
        date: payload.date,
        generatedAt: payload.generatedAt,
        sources: payload.sources
      },
      null,
      2
    )}\n\nexport const homeRunTargetsByGame = ${JSON.stringify(
      Object.fromEntries(payload.games.map((entry) => [entry.gameTitle, entry])),
      null,
      2
    )}\n`
    await mkdir(path.dirname(moduleOut), { recursive: true })
    await writeFile(moduleOut, moduleSource)
  }
  console.log(`Saved ${picks.length} home-run picks to ${out}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

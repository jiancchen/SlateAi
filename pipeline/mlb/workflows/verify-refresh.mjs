import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { loadMlbDayGames } from '../../lib/load-mlb-day-games.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..')

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = { date: null }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') options.date = args[++index]
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

const importFresh = async (absolutePath) => import(`${pathToFileURL(absolutePath).href}?t=${Date.now()}`)

const isPostponedScheduleGame = (game = {}) =>
  `${game?.status?.detailedState || ''}`.toLowerCase() === 'postponed' ||
  `${game?.status?.statusCode || ''}`.toUpperCase() === 'DR'

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

const countHomeRunTargets = (board = {}) =>
  Object.values(board || {}).reduce((total, gameBoard) => {
    const likely = Array.isArray(gameBoard?.likely) ? gameBoard.likely.length : 0
    const possible = Array.isArray(gameBoard?.possible) ? gameBoard.possible.length : 0
    const alternates = Array.isArray(gameBoard?.alternates) ? gameBoard.alternates.length : 0
    return total + likely + possible + alternates
  }, 0)

const formatCheck = (status, label, detail = '') =>
  `${status.padEnd(5)} ${label}${detail ? ` — ${detail}` : ''}`

const main = async () => {
  const options = parseArgs()
  const schedule = await fetchJson(
    `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${options.date}&hydrate=probablePitcher,team`
  )
  const officialGames = (schedule.dates || []).flatMap((entry) => entry.games || [])
  const activeOfficialGames = officialGames.filter((game) => !isPostponedScheduleGame(game))
  const postponedGames = officialGames.filter((game) => isPostponedScheduleGame(game))

  const lineupModule = await importFresh(path.join(rootDir, 'web', 'src', 'lib', `day-${options.date}-lineups.js`))
  const hrModule = await importFresh(path.join(rootDir, 'web', 'src', 'lib', `day-${options.date}-home-run-data.js`))

  const games = await loadMlbDayGames(options.date)
  const lineupBoardsByGameId = lineupModule.lineupBoardsByGameId || {}
  const lineupBoards = Object.values(lineupBoardsByGameId)
  const homeRunTargetsByGame = hrModule.homeRunTargetsByGame || {}

  const propFile = path.join(
    rootDir,
    'data-private',
    'predictions',
    'mlb-player-props',
    `${options.date}-player-props.json`
  )
  const savedProps = JSON.parse(await readFile(propFile, 'utf8'))
  const propCount = Array.isArray(savedProps?.picks)
    ? savedProps.picks.length
    : Array.isArray(savedProps?.props)
      ? savedProps.props.length
      : Number(savedProps?.summary?.totalPicks || 0)

  const lineupCounts = { posted: 0, partial: 0, pending: 0 }
  const weatherCount = lineupBoards.filter((board) => board?.weather).length
  const partialGames = []
  const lineupPlayers = lineupBoards.flatMap((board) => [
    ...(board?.away?.lineup || []),
    ...(board?.home?.lineup || [])
  ])
  const lineupCareerProfileCount = lineupPlayers.filter(
    (player) => Number(player?.careerProfile?.careerPlateAppearances || 0) > 0
  ).length
  const tinySamplePropsWithoutRepeatability = (savedProps?.picks || []).filter((pick) => {
    const seasonPa = Number(pick?.sample?.seasonPlateAppearances || 0) || 0
    return seasonPa > 0 && seasonPa < 24 && !pick?.repeatability?.label
  })

  for (const board of lineupBoards) {
    const awayStatus = board?.status?.away || 'pending'
    const homeStatus = board?.status?.home || 'pending'
    for (const status of [awayStatus, homeStatus]) {
      if (status === 'posted') lineupCounts.posted += 1
      else if (status === 'partial') lineupCounts.partial += 1
      else lineupCounts.pending += 1
    }
    if (awayStatus !== 'posted' || homeStatus !== 'posted') {
      partialGames.push(`${board.title}: away=${awayStatus} home=${homeStatus}`)
    }
  }

  const parkCoverageCount = games.filter((game) => game.parkContext).length
  const weatherCoverageCount = games.filter((game) => game.analysis?.mlbProjection?.weather).length
  const bridgeCoverageGames = games.filter((game) => {
    const projection = game.analysis?.mlbProjection
    return (
      Array.isArray(projection?.awayLikelyRelievers) &&
      projection.awayLikelyRelievers.length > 0 &&
      Array.isArray(projection?.homeLikelyRelievers) &&
      projection.homeLikelyRelievers.length > 0
    )
  }).length
  const hrTargetCount = countHomeRunTargets(homeRunTargetsByGame)
  const expectLineupDrivenBoards = lineupCounts.posted > 0

  const checks = []
  checks.push({
    ok: games.length === activeOfficialGames.length,
    label: 'Active game count matches official schedule',
    detail: `local ${games.length} vs official ${activeOfficialGames.length}`
  })
  checks.push({
    ok: !games.some((game) => postponedGames.some((official) => {
      const away = official?.teams?.away?.team?.name || ''
      const home = official?.teams?.home?.team?.name || ''
      const awayDesk = officialToDeskTeam[away] || away
      const homeDesk = officialToDeskTeam[home] || home
      return game.title === `${awayDesk} @ ${homeDesk}`
    })),
    label: 'Postponed games removed from active slate',
    detail: postponedGames.length
      ? postponedGames
          .map((game) => `${game.teams.away.team.name} @ ${game.teams.home.team.name}`)
          .join(', ')
      : 'none'
  })
  checks.push({
    ok: lineupBoards.length === games.length,
    label: 'Lineup boards generated for each active game',
    detail: `${lineupBoards.length} boards for ${games.length} games`
  })
  checks.push({
    ok: lineupPlayers.length === 0 || lineupCareerProfileCount >= Math.floor(lineupPlayers.length * 0.92),
    label: 'Hitter career profiles joined to lineup boards',
    detail: `${lineupCareerProfileCount}/${lineupPlayers.length} lineup bats`
  })
  checks.push({
    ok: tinySamplePropsWithoutRepeatability.length === 0,
    label: 'Tiny-sample props carry repeatability labels',
    detail: `${tinySamplePropsWithoutRepeatability.length} unsupported tiny-sample props`
  })
  checks.push({
    ok: lineupCounts.pending === 0,
    label: 'No pending lineup states remain',
    detail: `${lineupCounts.posted} posted, ${lineupCounts.partial} partial, ${lineupCounts.pending} pending`
  })
  checks.push({
    ok: weatherCount === lineupBoards.length,
    label: 'Weather attached to every lineup board',
    detail: `${weatherCount}/${lineupBoards.length}`
  })
  checks.push({
    ok: parkCoverageCount === games.length,
    label: 'Park context attached to every MLB game',
    detail: `${parkCoverageCount}/${games.length}`
  })
  checks.push({
    ok: weatherCoverageCount === games.length,
    label: 'Weather profile attached to every MLB projection',
    detail: `${weatherCoverageCount}/${games.length}`
  })
  checks.push({
    ok: bridgeCoverageGames === games.length,
    label: 'Bridge reliever coverage attached to every MLB game',
    detail: `${bridgeCoverageGames}/${games.length}`
  })
  checks.push({
    ok: hrTargetCount > 0,
    label: 'Home-run board generated',
    detail: `${hrTargetCount} weighted targets`
  })
  checks.push({
    ok: propCount > 0,
    label: 'Non-HR prop board generated',
    detail: `${propCount} props saved`
  })

  const hardFailures = checks.filter((check) => !check.ok && (
    check.label === 'Active game count matches official schedule' ||
    check.label === 'Lineup boards generated for each active game' ||
    check.label === 'Hitter career profiles joined to lineup boards' ||
    check.label === 'Tiny-sample props carry repeatability labels' ||
    ((check.label === 'Home-run board generated' ||
      check.label === 'Non-HR prop board generated') &&
      expectLineupDrivenBoards)
  ))

  console.log(`MLB refresh verification for ${options.date}`)
  console.log('')
  for (const check of checks) {
    const status = check.ok ? 'PASS' : hardFailures.includes(check) ? 'FAIL' : 'WARN'
    console.log(formatCheck(status, check.label, check.detail))
  }

  if (partialGames.length) {
    console.log('')
    console.log('Non-fully-posted games:')
    for (const game of partialGames) {
      console.log(`- ${game}`)
    }
  }

  if (hardFailures.length) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

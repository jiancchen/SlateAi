import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..')

const defaultFiles = [
  '/Users/jcchen/Downloads/may14batting leaders.rtf',
  '/Users/jcchen/Downloads/may14_battingleaders.rtf',
  '/Users/jcchen/Downloads/may15battingleaders.rtf',
  '/Users/jcchen/Downloads/may16batting leaders.rtf',
  '/Users/jcchen/Downloads/may17_batting_leaders.txt.rtf'
]

const teamMap = {
  ATL: 'Braves',
  ARI: 'Diamondbacks',
  ATH: 'Athletics',
  BAL: 'Orioles',
  BOS: 'Red Sox',
  CHC: 'Cubs',
  CHW: 'White Sox',
  CIN: 'Reds',
  CLE: 'Guardians',
  COL: 'Rockies',
  DET: 'Tigers',
  HOU: 'Astros',
  KC: 'Royals',
  LAA: 'Angels',
  LAD: 'Dodgers',
  MIA: 'Marlins',
  MIL: 'Brewers',
  MIN: 'Twins',
  NYM: 'Mets',
  NYY: 'Yankees',
  PHI: 'Phillies',
  PIT: 'Pirates',
  SD: 'Padres',
  SEA: 'Mariners',
  SF: 'Giants',
  STL: 'Cardinals',
  TB: 'Rays',
  TEX: 'Rangers',
  TOR: 'Blue Jays',
  WSH: 'Nationals'
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    year: 2026,
    files: [],
    out: path.join(rootDir, 'data-private', 'reference', 'mlb-batting-impact-history.json'),
    moduleOut: path.join(rootDir, 'web', 'src', 'lib', 'mlb-batting-impact-history.js')
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--year') options.year = Number(args[++index])
    else if (arg === '--file') options.files.push(args[++index])
    else if (arg === '--out') options.out = args[++index]
    else if (arg === '--module-out') options.moduleOut = args[++index]
  }

  if (!options.files.length) {
    options.files = defaultFiles.filter((filePath) => existsSync(filePath))
  }

  if (!options.files.length) {
    throw new Error('No batting-leader files were found. Pass one or more --file paths.')
  }

  return options
}

const inferDateFromPath = (filePath, seasonYear) => {
  const baseName = path.basename(filePath).toLowerCase()
  const mayMatch = baseName.match(/may[\s_]?(\d{1,2})/)
  if (!mayMatch) {
    throw new Error(`Could not infer date from filename: ${filePath}`)
  }

  const day = `${Number(mayMatch[1])}`.padStart(2, '0')
  return `${seasonYear}-05-${day}`
}

const isPlayerName = (value = '') => /^[A-Za-z'.\- ]+$/.test(value)
const isTeamAbbrev = (value = '') => /^[A-Z]{2,3}$/.test(value)
const isOpponentCell = (value = '') => value.includes('@') || value.includes('vs')
const isHab = (value = '') => /^\d+\/\d+$/.test(value)
const isNumeric = (value = '') => /^\d+$/.test(value)

const impactScoreForRow = (row) =>
  Number(
    (
      row.totalBases * 1.7 +
      row.homeRuns * 4.5 +
      row.rbi * 1.2 +
      row.hits * 1 +
      row.runs * 0.8 +
      row.walks * 0.5 +
      row.stolenBases * 0.6
    ).toFixed(2)
  )

const normalizeTextOutput = (filePath) =>
  execFileSync('textutil', ['-convert', 'txt', '-stdout', filePath], {
    encoding: 'utf8'
  })

const parseRowsFromFile = (filePath, seasonYear) => {
  const date = inferDateFromPath(filePath, seasonYear)
  const text = normalizeTextOutput(filePath)
  const lines = text
    .split('\n')
    .map((line) => line.trim().replace(/\u00a0/g, ' '))
    .filter(Boolean)

  const rows = []

  for (let index = 0; index < lines.length - 9; index += 1) {
    const playerName = lines[index]
    const teamAbbrev = lines[index + 1]
    const opponent = lines[index + 2]
    const hitsAtBats = lines[index + 4]
    const homeRuns = lines[index + 5]
    const runs = lines[index + 6]
    const rbi = lines[index + 7]
    const walks = lines[index + 8]
    const totalBases = lines[index + 9]
    const stolenBases = lines[index + 10] ?? '0'

    if (
      !isPlayerName(playerName) ||
      !isTeamAbbrev(teamAbbrev) ||
      !isOpponentCell(opponent) ||
      !isHab(hitsAtBats) ||
      !isNumeric(homeRuns) ||
      !isNumeric(runs) ||
      !isNumeric(rbi) ||
      !isNumeric(walks) ||
      !isNumeric(totalBases)
    ) {
      continue
    }

    const [hits, atBats] = hitsAtBats.split('/').map(Number)
    const row = {
      date,
      playerName,
      teamAbbrev,
      teamName: teamMap[teamAbbrev] || teamAbbrev,
      opponent,
      hits,
      atBats,
      homeRuns: Number(homeRuns),
      runs: Number(runs),
      rbi: Number(rbi),
      walks: Number(walks),
      totalBases: Number(totalBases),
      stolenBases: isNumeric(stolenBases) ? Number(stolenBases) : 0
    }

    row.impactScore = impactScoreForRow(row)
    rows.push(row)
  }

  const deduped = []
  const seen = new Set()

  for (const row of rows) {
    const key = [
      row.date,
      row.playerName,
      row.teamAbbrev,
      row.opponent,
      row.hits,
      row.atBats,
      row.homeRuns,
      row.runs,
      row.rbi,
      row.walks,
      row.totalBases,
      row.stolenBases
    ].join('|')

    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(row)
  }

  return deduped
}

const buildPlayerHistory = (rows) => {
  const history = new Map()

  for (const row of rows) {
    const current = history.get(row.playerName) || {
      playerName: row.playerName,
      teamName: row.teamName,
      appearances: 0,
      impactScore: 0,
      averageImpactScore: 0,
      hrGames: 0,
      totalBases: 0,
      dates: []
    }

    current.appearances += 1
    current.impactScore += row.impactScore
    current.hrGames += row.homeRuns > 0 ? 1 : 0
    current.totalBases += row.totalBases
    current.dates.push(row.date)
    current.teamName = row.teamName
    history.set(row.playerName, current)
  }

  for (const entry of history.values()) {
    entry.impactScore = Number(entry.impactScore.toFixed(2))
    entry.averageImpactScore = Number((entry.impactScore / entry.appearances).toFixed(2))
    entry.dates = [...new Set(entry.dates)].sort()
  }

  return Object.fromEntries([...history.entries()].sort((left, right) => right[1].impactScore - left[1].impactScore))
}

const main = async () => {
  const options = parseArgs()
  const rows = options.files.flatMap((filePath) => parseRowsFromFile(filePath, options.year))
  const byPlayerName = buildPlayerHistory(rows)
  const payload = {
    season: options.year,
    generatedAt: new Date().toISOString(),
    files: options.files.map((filePath) => path.basename(filePath)),
    rowCount: rows.length,
    playerCount: Object.keys(byPlayerName).length,
    rows,
    byPlayerName
  }

  await mkdir(path.dirname(options.out), { recursive: true })
  await writeFile(options.out, JSON.stringify(payload, null, 2))

  const moduleSource =
    `export const battingImpactMeta = ${JSON.stringify(
      {
        season: payload.season,
        generatedAt: payload.generatedAt,
        files: payload.files,
        rowCount: payload.rowCount,
        playerCount: payload.playerCount
      },
      null,
      2
    )}\n\n` +
    `export const battingImpactRows = ${JSON.stringify(payload.rows, null, 2)}\n\n` +
    `export const battingImpactByPlayerName = ${JSON.stringify(payload.byPlayerName, null, 2)}\n`

  await mkdir(path.dirname(options.moduleOut), { recursive: true })
  await writeFile(options.moduleOut, moduleSource)

  console.log(`Wrote ${payload.rowCount} batting-impact rows for ${payload.playerCount} players.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

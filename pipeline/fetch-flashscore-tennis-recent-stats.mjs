import fs from 'node:fs/promises'
import path from 'node:path'
import { fetchFlashscoreTennisStats } from './fetch-flashscore-tennis-stats.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const DEFAULT_INPUT = 'web/src/lib/day-2026-05-27-tennis-opponent-quality.generated.json'
const DEFAULT_OUTPUT_DIR = 'data-private/reference/tennis/flashscore-match-stats'
const DEFAULT_MAP_OUTPUT = 'data-private/reference/tennis/flashscore-recent-match-map-2026-05-27.json'

const TOURNAMENT_URLS = [
  ['atp-singles', 'french-open', 'Paris'],
  ['wta-singles', 'french-open', 'Paris'],
  ['atp-singles', 'rome', 'Rome'],
  ['wta-singles', 'rome', 'Rome'],
  ['atp-singles', 'madrid', 'Madrid'],
  ['wta-singles', 'madrid', 'Madrid'],
  ['atp-singles', 'hamburg', 'Hamburg'],
  ['wta-singles', 'hamburg', 'Hamburg'],
  ['atp-singles', 'geneva', 'Geneva'],
  ['atp-singles', 'barcelona', 'Barcelona'],
  ['atp-singles', 'miami', 'Miami'],
  ['wta-singles', 'miami', 'Miami'],
  ['atp-singles', 'dubai', 'Dubai'],
  ['wta-singles', 'dubai', 'Dubai'],
  ['wta-singles', 'strasbourg', 'Strasbourg'],
  ['wta-singles', 'rabat', 'Rabat'],
  ['wta-singles', 'parma', 'Parma'],
  ['wta-singles', 'stuttgart', 'Stuttgart'],
  ['wta-singles', 'charleston', 'Charleston'],
  ['atp-challenger-men-singles', 'cagliari-challenger-men', 'Cagliari Challenger'],
  ['atp-challenger-men-singles', 'aix-en-provence-challenger-men', 'Aix En Provence Challenger'],
  ['atp-challenger-men-singles', 'tunis-challenger-men', 'Tunis Challenger']
]

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    input: DEFAULT_INPUT,
    outputDir: DEFAULT_OUTPUT_DIR,
    mapOutput: DEFAULT_MAP_OUTPUT,
    limit: 0,
    events: ''
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--input') {
      options.input = args[index + 1]
      index += 1
    } else if (arg === '--output-dir') {
      options.outputDir = args[index + 1]
      index += 1
    } else if (arg === '--map-output') {
      options.mapOutput = args[index + 1]
      index += 1
    } else if (arg === '--limit') {
      options.limit = Number(args[index + 1]) || 0
      index += 1
    } else if (arg === '--events') {
      options.events = args[index + 1]
      index += 1
    }
  }

  return options
}

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const tokenSet = (value) => new Set(normalize(value).split(' ').filter(Boolean))

const lastToken = (value) => {
  const tokens = normalize(value).split(' ').filter(Boolean)
  return tokens[tokens.length - 1] || ''
}

const tokenOverlap = (left, right) => {
  const leftTokens = tokenSet(left)
  const rightTokens = tokenSet(right)
  let count = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) count += 1
  }
  return count
}

const firstInitial = (value) => normalize(value).split(' ').filter(Boolean)[0]?.[0] || ''

const samePlayer = (left, right) => {
  if (!left || !right) return false
  const leftNorm = normalize(left)
  const rightNorm = normalize(right)
  if (leftNorm === rightNorm) return true
  const overlap = tokenOverlap(left, right)
  if (overlap >= Math.min(tokenSet(left).size, tokenSet(right).size, 2)) return true
  const leftLast = lastToken(left)
  const rightLast = lastToken(right)
  const leftTokens = tokenSet(left)
  const rightTokens = tokenSet(right)
  const sharedLongToken = [...leftTokens].find((token) => token.length >= 5 && rightTokens.has(token))
  if (sharedLongToken) {
    const leftInitial = firstInitial(left)
    const rightInitial = firstInitial(right)
    const leftHasInitialToken = [...leftTokens].some((token) => token.length === 1)
    const rightHasInitialToken = [...rightTokens].some((token) => token.length === 1)
    const leftSingleInitial = [...leftTokens].find((token) => token.length === 1)
    const rightSingleInitial = [...rightTokens].find((token) => token.length === 1)
    if (!leftHasInitialToken && !rightHasInitialToken) return true
    if (leftInitial && rightInitial && leftInitial === rightInitial) return true
    if (leftSingleInitial && rightInitial && leftSingleInitial === rightInitial) return true
    if (rightSingleInitial && leftInitial && rightSingleInitial === leftInitial) return true
  }
  return Boolean(
    (leftLast && leftLast.length > 3 && rightTokens.has(leftLast)) ||
      (rightLast && rightLast.length > 3 && leftTokens.has(rightLast))
  )
}

const samePair = (leftPair, rightPair) =>
  leftPair.length === 2 &&
  rightPair.length === 2 &&
  ((samePlayer(leftPair[0], rightPair[0]) && samePlayer(leftPair[1], rightPair[1])) ||
    (samePlayer(leftPair[0], rightPair[1]) && samePlayer(leftPair[1], rightPair[0])))

const parseFeedRecords = (text) =>
  String(text || '')
    .split('~')
    .map((record) => Object.fromEntries([...record.matchAll(/([A-Z0-9]{2,4})÷([^¬]*)/g)].map((match) => [match[1], match[2]])))
    .filter((record) => Object.keys(record).length)

const parseRecentDate = (value) => {
  const match = String(value || '').match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2})/)
  if (!match) return ''
  const months = {
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    may: '05',
    jun: '06',
    jul: '07',
    aug: '08',
    sep: '09',
    oct: '10',
    nov: '11',
    dec: '12'
  }
  const month = months[match[2].toLowerCase()]
  if (!month) return ''
  return `20${match[3]}-${month}-${String(match[1]).padStart(2, '0')}`
}

const parseSideStats = (payload, playerName) => {
  const matchScope = (payload.scopes || []).find((scope) => scope.label === 'Match') || payload.scopes?.[0]
  const stats = {}
  const sourceRows = []
  for (const section of matchScope?.sections || []) {
    for (const stat of section.stats || []) {
      const side = samePlayer(playerName, stat.leftPlayer) ? 'left' : samePlayer(playerName, stat.rightPlayer) ? 'right' : ''
      if (!side) continue
      const rawValue = stat[side]
      const label = normalize(stat.label)
      const parsed = parseStatValue(rawValue)
      sourceRows.push({ section: section.label, label: stat.label, value: rawValue })
      if (label === 'aces') stats.aces = parsed.number ?? rawValue
      if (label === 'double faults') stats.doubleFaults = parsed.number ?? rawValue
      if (label === '1st serve percentage') stats.firstServePct = parsed.percent ?? rawValue
      if (label === '1st serve points won') stats.firstServeWonPct = parsed.percent ?? rawValue
      if (label === '2nd serve points won') stats.secondServeWonPct = parsed.percent ?? rawValue
      if (label === 'break points saved') {
        stats.breakPointsSaved = rawValue
        stats.breakPointsSavedPct = parsed.percent ?? null
      }
      if (label === 'service points won') stats.servicePointsWonPct = parsed.percent ?? rawValue
      if (label === 'return points won') stats.returnPointsWonPct = parsed.percent ?? rawValue
      if (label === 'winners') stats.winners = parsed.number ?? rawValue
      if (label === 'unforced errors') stats.unforcedErrors = parsed.number ?? rawValue
      if (label === 'service games won') {
        stats.serviceGamesWon = rawValue
        stats.serviceHoldPct = parsed.percent ?? rawValue
        stats.holdPct = parsed.percent ?? rawValue
      }
      if (label === 'return games won') {
        stats.returnGamesWon = rawValue
        stats.returnGamesWonPct = parsed.percent ?? rawValue
      }
    }
  }
  return {
    source: 'Flashscore',
    flashscoreId: payload.matchId,
    sourceUrl: payload.sourceUrl,
    ...stats,
    rows: sourceRows
  }
}

const parseStatValue = (value) => {
  const text = String(value || '')
  const percent = text.match(/(-?\d+(?:\.\d+)?)%/)
  const fraction = text.match(/(\d+)\s*\/\s*(\d+)/)
  const number = text.match(/^-?\d+(?:\.\d+)?$/)
  return {
    raw: text,
    number: number ? Number(number[0]) : null,
    percent: percent ? Number(percent[1]) : null,
    made: fraction ? Number(fraction[1]) : null,
    total: fraction ? Number(fraction[2]) : null
  }
}

const fetchTournamentRecords = async (allowedEvents) => {
  const records = []
  for (const [group, slug, event] of TOURNAMENT_URLS) {
    if (allowedEvents.size && !allowedEvents.has(normalize(event))) continue
    const url = `https://www.flashscoreusa.com/tennis/${group}/${slug}/results/`
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })
      if (!response.ok) throw new Error(`${response.status}`)
      const html = await response.text()
      for (const record of parseFeedRecords(html)) {
        if (!record.AA || !record.AE || !record.AF || !record.AD) continue
        records.push({
          event,
          tournamentUrl: url,
          flashscoreId: record.AA,
          timestamp: Number(record.AD),
          isoDate: new Date(Number(record.AD) * 1000).toISOString().slice(0, 10),
          players: [record.AE, record.AF],
          flashscoreLabel: `${record.AE} - ${record.AF}`
        })
      }
      console.log(`Loaded ${event}: ${records.filter((record) => record.tournamentUrl === url).length} result records`)
    } catch (error) {
      console.warn(`Skipping Flashscore ${event} results (${url}): ${error.message}`)
    }
  }
  return records
}

const collectRecentRows = (quality) => {
  const rows = []
  for (const [boardMatchId, match] of Object.entries(quality.matches || {})) {
    for (const player of match.players || []) {
      for (const [recentIndex, recent] of (player.recentMatches || []).entries()) {
        rows.push({
          key: `${boardMatchId}::${normalize(player.name)}::${recentIndex}`,
          boardMatchId,
          boardTitle: match.title,
          playerName: player.name,
          opponentName: recent.opponent,
          recentIndex,
          recentEvent: recent.event || '',
          recentDate: recent.date || '',
          recentIsoDate: parseRecentDate(recent.date),
          recentResult: recent.result || ''
        })
      }
    }
  }
  return rows
}

const main = async () => {
  const options = parseArgs()
  const inputPath = path.resolve(options.input)
  const outputDir = path.resolve(options.outputDir)
  const mapOutput = path.resolve(options.mapOutput)
  const quality = JSON.parse(await fs.readFile(inputPath, 'utf8'))
  const rows = collectRecentRows(quality)
  const allowedEvents = new Set(
    (options.events ? options.events.split(',') : ['Paris', 'Rome', 'Madrid', 'Hamburg', 'Geneva', 'Strasbourg', 'Rabat', 'Parma'])
      .map(normalize)
      .filter(Boolean)
  )
  const tournamentRecords = await fetchTournamentRecords(allowedEvents)
  const map = {}
  const matchedRows = []
  const failed = []

  for (const row of rows) {
    if (row.recentIsoDate) {
      const recordIndex = tournamentRecords.findIndex(
        (record) =>
          record.isoDate === row.recentIsoDate &&
          samePair([row.playerName, row.opponentName], record.players) &&
          (!row.recentEvent || !record.event || normalize(row.recentEvent) === normalize(record.event))
      )
      if (recordIndex >= 0) {
        matchedRows.push({ row, record: tournamentRecords[recordIndex] })
      }
    }
  }

  const limited = options.limit > 0 ? matchedRows.slice(0, options.limit) : matchedRows
  await fs.mkdir(outputDir, { recursive: true })
  for (const { row, record } of limited) {
    try {
      const payload = await fetchFlashscoreTennisStats({
        matchId: record.flashscoreId,
        extra: {
          sourceKind: 'recent-match',
          slateDate: quality.source?.slateDate || '2026-05-27',
          boardMatchId: row.boardMatchId,
          boardTitle: row.boardTitle,
          boardPlayerName: row.playerName,
          recentOpponentName: row.opponentName,
          recentIndex: row.recentIndex,
          recentEvent: row.recentEvent,
          recentDate: row.recentDate,
          recentIsoDate: row.recentIsoDate,
          recentResult: row.recentResult,
          flashscoreLabel: record.flashscoreLabel,
          flashscoreTournamentUrl: record.tournamentUrl,
          players: record.players
        }
      })
      const outputPath = path.join(outputDir, `${payload.matchId}.json`)
      await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
      map[row.key] = {
        ...row,
        flashscoreId: payload.matchId,
        flashscoreLabel: record.flashscoreLabel,
        flashscoreTournamentUrl: record.tournamentUrl,
        players: record.players,
        serviceStats: parseSideStats(payload, row.playerName)
      }
    } catch (error) {
      failed.push({ ...row, flashscoreId: record.flashscoreId, error: error.message })
    }
  }

  const coverage = {
    recentRows: rows.length,
    tournamentRecords: tournamentRecords.length,
    matchedRows: matchedRows.length,
    fetchedRows: Object.keys(map).length,
    limited: limited.length,
    failed: failed.length
  }

  await fs.mkdir(path.dirname(mapOutput), { recursive: true })
  await fs.writeFile(
    mapOutput,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: inputPath,
        outputDir,
        coverage,
        map,
        failed
      },
      null,
      2
    )}\n`
  )
  console.log(JSON.stringify(coverage, null, 2))
  if (failed.length) console.log(JSON.stringify({ failed: failed.slice(0, 20) }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

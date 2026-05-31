import fs from 'node:fs/promises'
import path from 'node:path'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: '',
    output: ''
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = String(args[index + 1] || '').trim()
      index += 1
    } else if (arg === '--output') {
      options.output = String(args[index + 1] || '').trim()
      index += 1
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new Error('Pass --date as YYYY-MM-DD')
  }
  if (!options.output) {
    options.output = `data-private/reference/tennis/espn-scoreboard-${options.date}.json`
  }
  return options
}

const compactDate = (date) => date.replaceAll('-', '')

const extractFittState = (html) => {
  const marker = "window['__espnfitt__']="
  const start = html.indexOf(marker)
  if (start < 0) throw new Error('Could not find ESPN fitt state payload')

  let index = start + marker.length
  let depth = 0
  let inString = false
  let escaped = false

  for (; index < html.length; index += 1) {
    const char = html[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
    } else if (char === '{') {
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return JSON.parse(html.slice(start + marker.length, index + 1))
      }
    }
  }

  throw new Error('Could not parse ESPN fitt state JSON')
}

const parseCourt = (note = '') => {
  const parts = String(note || '').split(' - ')
  return {
    round: parts[0] || '',
    court: parts.slice(1).join(' - ') || ''
  }
}

const scoreFor = (player = {}) =>
  (player.lnescrs || []).map((set) => ({
    set: set.p ?? null,
    value: set.v ?? '',
    tiebreak: set.t ?? null,
    wonSet: Boolean(set.w)
  }))

const buildScoreline = (competitors = []) => {
  const maxSets = Math.max(...competitors.map((player) => (player.lnescrs || []).length), 0)
  const sets = []
  for (let index = 0; index < maxSets; index += 1) {
    const left = competitors[0]?.lnescrs?.[index]
    const right = competitors[1]?.lnescrs?.[index]
    if (!left && !right) continue
    sets.push(`${left?.v ?? ''}-${right?.v ?? ''}${left?.t || right?.t ? `(${left?.t ?? ''}-${right?.t ?? ''})` : ''}`)
  }
  return sets.join(' ')
}

const normalizeCompetition = (competition) => {
  const { round, court } = parseCourt(competition.note)
  const players = (competition.competitors || []).map((player) => ({
    id: player.id ?? '',
    name: player.nm ?? '',
    seed: Number.isFinite(Number(player.rnk)) ? Number(player.rnk) : null,
    countryLogo: player.logo ?? '',
    profileUrl: player.link ?? '',
    winner: Boolean(player.wnr),
    scores: scoreFor(player)
  }))

  return {
    eventId: competition.id,
    date: competition.date,
    status: competition.status ?? {},
    completed: Boolean(competition.status?.completed),
    statusDescription: competition.status?.description ?? '',
    note: competition.note ?? '',
    round,
    court,
    doubles: Boolean(competition.dbls || players.some((player) => player.roster?.length)),
    singles: !competition.dbls && players.length === 2 && (competition.competitors || []).every((player) => !player.rstr),
    broadcast: competition.brdcst ?? '',
    winnerName: players.find((player) => player.winner)?.name ?? null,
    scoreline: buildScoreline(competition.competitors || []),
    players,
    raw: competition
  }
}

const main = async () => {
  const options = parseArgs()
  const url = `https://www.espn.com/tennis/scoreboard/_/date/${compactDate(options.date)}`
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0'
    }
  })
  if (!response.ok) throw new Error(`ESPN scoreboard request failed ${response.status}`)

  const html = await response.text()
  const fitt = extractFittState(html)
  const scoreboard = fitt.page?.content?.scoreboard ?? {}
  const competitions = Object.values(scoreboard.competitions || {}).map(normalizeCompetition)
  const singles = competitions.filter((competition) => competition.singles)

  const payload = {
    source: 'ESPN tennis scoreboard',
    sourceUrl: url,
    fetchedAt: new Date().toISOString(),
    date: options.date,
    tournament: scoreboard.tournaments?.[0]?.name ?? '',
    competitions,
    singles
  }

  const outputPath = path.resolve(options.output)
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`Wrote ${singles.length} singles / ${competitions.length} total competitions to ${outputPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

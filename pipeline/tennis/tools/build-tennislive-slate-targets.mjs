import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: '',
    dkFile: '',
    robinhoodFile: '',
    playerOutput: '',
    matchOutput: '',
    report: ''
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = String(args[index + 1] || '').trim()
      index += 1
    } else if (arg === '--dk-file') {
      options.dkFile = String(args[index + 1] || '').trim()
      index += 1
    } else if (arg === '--robinhood-file') {
      options.robinhoodFile = String(args[index + 1] || '').trim()
      index += 1
    } else if (arg === '--player-output') {
      options.playerOutput = String(args[index + 1] || '').trim()
      index += 1
    } else if (arg === '--match-output') {
      options.matchOutput = String(args[index + 1] || '').trim()
      index += 1
    } else if (arg === '--report') {
      options.report = String(args[index + 1] || '').trim()
      index += 1
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new Error('Pass --date YYYY-MM-DD')
  }
  options.dkFile ||= `data-private/reference/tennis/draftkings-lines-${options.date}.json`
  options.robinhoodFile ||= `data-private/reference/tennis/robinhood-tennis-supplement-${options.date}.json`
  options.playerOutput ||= `data-migration/reports/tennislive_slate_player_urls_${options.date}.txt`
  options.matchOutput ||= `data-migration/reports/tennislive_slate_match_urls_${options.date}.txt`
  options.report ||= `data-migration/reports/build_tennislive_slate_targets_${options.date}.json`
  return options
}

const readJson = async (relativePath, fallback) => {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, relativePath), 'utf8'))
  } catch (error) {
    if (fallback !== undefined) return fallback
    throw error
  }
}

const normalizeName = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const slug = (value) =>
  normalizeName(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const PLAYER_SLUG_OVERRIDES = new Map(
  Object.entries({
    'abedallah shelbayh': 'abdullah-shelbayh',
    'abdullah shelbayh': 'abdullah-shelbayh',
    'marko topo': 'marko-topo',
    'marko topo': 'marko-topo',
    'pyotr nesterov': 'petr-nesterov',
    'petr nesterov': 'petr-nesterov',
    'qinwen zheng': 'qinwen-zheng',
    'taro daniel': 'taro-daniel',
    'tiantsoa sarah rakotomanga rajaonah': 'tiantsoa-sarah-rakotomanga-rajaonah',
    'xiyu wang': 'xiyu-wang'
  })
)

const TOURNAMENT_SLUG_OVERRIDES = [
  [/bratislava/i, 'bratislava-challenger-2026'],
  [/cattolica/i, 'cattolica-challenger-2026'],
  [/hertogenbosch|s-hertogenbosch/i, 'libema-open-hertogenbosch-2026'],
  [/ilkley/i, 'ilkley-challenger-2026'],
  [/london/i, 'hsbc-championships-london-2026'],
  [/lyon/i, 'lyon-challenger-2026'],
  [/modena/i, 'modena-2026'],
  [/san miguel de tucuman/i, 'san-miguel-de-tucuman-challenger-2026']
]

const playerSlug = (name) => PLAYER_SLUG_OVERRIDES.get(normalizeName(name)) || slug(name)

const splitMatch = (value) => String(value || '').split(/\s+vs\s+/i).map((part) => part.trim()).filter(Boolean)

const tourFromText = (text) => (/wta|women/i.test(text) ? 'wta' : 'atp')

const tournamentSlug = (value) => {
  const text = String(value || '')
  for (const [pattern, replacement] of TOURNAMENT_SLUG_OVERRIDES) {
    if (pattern.test(text)) return replacement
  }
  return `${slug(text.replace(/\b(ATP|WTA|125K|Qualification|Quals?\.)\b/gi, ''))}-2026`
}

const sourceMatchRows = (dkPayload, robinhoodPayload) => {
  const rows = []
  for (const match of dkPayload.matches || []) {
    const players = splitMatch(match.match || match.draftKingsMatch)
    if (players.length !== 2) continue
    rows.push({
      source: 'draftkings',
      title: players.join(' vs '),
      players,
      tournament: match.leagueName || '',
      tour: tourFromText(match.leagueName || ''),
      eventId: match.eventId || null
    })
  }
  for (const match of robinhoodPayload.matches || []) {
    const players = Array.isArray(match.players) ? match.players.map((player) => player.name).filter(Boolean) : splitMatch(match.title)
    if (players.length !== 2) continue
    rows.push({
      source: 'robinhood',
      title: players.join(' vs '),
      players,
      tournament: match.tournament || '',
      tour: /^wta/i.test(match.category || match.tournament || '') ? 'wta' : 'atp',
      eventId: match.eventId || null
    })
  }
  return rows
}

const dedupe = (rows, keyFn) => {
  const seen = new Set()
  const output = []
  for (const row of rows) {
    const key = keyFn(row)
    if (seen.has(key)) continue
    seen.add(key)
    output.push(row)
  }
  return output
}

const main = async () => {
  const options = parseArgs()
  const dkPayload = await readJson(options.dkFile, { matches: [] })
  const robinhoodPayload = await readJson(options.robinhoodFile, { matches: [] })
  const matches = sourceMatchRows(dkPayload, robinhoodPayload)
  const playerTargets = dedupe(
    matches.flatMap((match) =>
      match.players.map((name) => ({
        name,
        tour: match.tour,
        url: `https://www.tennislive.net/${match.tour}/${playerSlug(name)}/`
      }))
    ),
    (row) => `${row.tour}:${playerSlug(row.name)}`
  ).sort((left, right) => left.url.localeCompare(right.url))
  const matchTargets = dedupe(
    matches.map((match) => ({
      ...match,
      url: `https://www.tennislive.net/${match.tour}/match/${playerSlug(match.players[0])}-VS-${playerSlug(match.players[1])}/${tournamentSlug(match.tournament)}/`
    })),
    (row) => `${row.tour}:${row.players.map(playerSlug).sort().join('|')}:${tournamentSlug(row.tournament)}`
  ).sort((left, right) => left.url.localeCompare(right.url))

  await fs.mkdir(path.dirname(path.join(ROOT, options.playerOutput)), { recursive: true })
  await fs.mkdir(path.dirname(path.join(ROOT, options.matchOutput)), { recursive: true })
  await fs.writeFile(path.join(ROOT, options.playerOutput), `${playerTargets.map((row) => row.url).join('\n')}\n`)
  await fs.writeFile(path.join(ROOT, options.matchOutput), `${matchTargets.map((row) => row.url).join('\n')}\n`)
  await fs.writeFile(
    path.join(ROOT, options.report),
    `${JSON.stringify(
      {
        date: options.date,
        dkMatches: (dkPayload.matches || []).length,
        robinhoodMatches: (robinhoodPayload.matches || []).length,
        sourceMatches: matches.length,
        playerTargets: playerTargets.length,
        matchTargets: matchTargets.length,
        playerOutput: options.playerOutput,
        matchOutput: options.matchOutput,
        tournaments: [...new Set(matches.map((match) => match.tournament).filter(Boolean))].sort(),
        generatedAt: new Date().toISOString()
      },
      null,
      2
    )}\n`
  )
  console.log(`Wrote ${playerTargets.length} TennisLive player URLs to ${options.playerOutput}`)
  console.log(`Wrote ${matchTargets.length} TennisLive match URLs to ${options.matchOutput}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

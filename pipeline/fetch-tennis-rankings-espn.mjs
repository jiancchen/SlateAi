import fs from 'node:fs/promises'
import path from 'node:path'

const OUTPUT = 'data-private/reference/tennis/player-rankings.json'
const HISTORY_DIR = 'data-private/reference/tennis/player-rankings-history'
const ESPN_SOURCES = [
  {
    tour: 'ATP',
    url: 'https://www.espn.com/tennis/rankings/_/type/atp/season/2026'
  },
  {
    tour: 'WTA',
    url: 'https://www.espn.com/tennis/rankings/_/type/wta/season/2026'
  }
]
const LIVE_TENNIS_SOURCES = [
  {
    tour: 'ATP',
    url: 'https://live-tennis.eu/en/atp-live-ranking'
  },
  {
    tour: 'WTA',
    url: 'https://live-tennis.eu/en/wta-live-ranking'
  }
]

const normalizeName = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()

const stripTags = (value) =>
  String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: new Date().toISOString().slice(0, 10),
    output: OUTPUT,
    historyDir: HISTORY_DIR,
    liveSnapshotAtp: null,
    liveSnapshotWta: null
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = args[index + 1]
      index += 1
    } else if (arg === '--output') {
      options.output = args[index + 1]
      index += 1
    } else if (arg === '--history-dir') {
      options.historyDir = args[index + 1]
      index += 1
    } else if (arg === '--live-snapshot-atp') {
      options.liveSnapshotAtp = args[index + 1]
      index += 1
    } else if (arg === '--live-snapshot-wta') {
      options.liveSnapshotWta = args[index + 1]
      index += 1
    }
  }

  return options
}

const parseEspnRows = (html, source) => {
  const rows = [...html.matchAll(/<tr class="Table__TR[\s\S]*?<\/tr>/g)].map((match) => match[0])
  const players = []

  for (const row of rows) {
    const rankMatch = row.match(/<span class="rank_column">(\d+)<\/span>/)
    const nameMatch = row.match(/<a class="AnchorLink"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/)
    const countryMatch = row.match(/<img[^>]*title="([^"]+)"/)
    const cells = [...row.matchAll(/<td class="Table__TD"><span class="">([^<]+)<\/span><\/td>/g)].map((match) =>
      stripTags(match[1])
    )

    if (!rankMatch || !nameMatch) continue

    const rank = Number.parseInt(rankMatch[1], 10)
    const points = Number.parseInt(String(cells[0] || '').replace(/,/g, ''), 10)
    const age = Number.parseInt(String(cells[1] || ''), 10)
    const name = stripTags(nameMatch[2])

    players.push({
      name,
      normalizedName: normalizeName(name),
      rank,
      points: Number.isFinite(points) ? points : null,
      age: Number.isFinite(age) ? age : null,
      country: countryMatch ? stripTags(countryMatch[1]) : null,
      tour: source.tour,
      profileUrl: nameMatch[1],
      source: source.url
    })
  }

  return players
}

const parseLiveTennisRows = (html, source) => {
  if (/cf-mitigated|Just a moment|Enable JavaScript and cookies/i.test(html)) {
    throw new Error('Live Tennis returned a Cloudflare challenge page')
  }

  const text = stripTags(html).replace(/\s+/g, ' ')
  const tableStart = text.indexOf('# CH Player Age Ctry Pts')
  if (tableStart === -1) return []
  const tableText = text.slice(tableStart)
  const rows = []
  const rowPattern =
    /(?:^|\s)(\d{1,4})\s+(?:(?:CH)|(?:NCH\s*\(\d+\))|(?:\d{1,3}))?\s*([A-ZÀ-ÖØ-öø-ÿ'’.\- ]+?)\s+(\d{2})\s+([A-Z]{3})\s+(\d{1,6})(?=\s+(?:[+\-]\d+|\d{1,4}\s+(?:(?:CH)|(?:NCH)|(?:\d{1,3}))|Advertisement|$))/g
  let match = rowPattern.exec(tableText)
  while (match) {
    const rank = Number.parseInt(match[1], 10)
    const name = stripTags(match[2])
    const age = Number.parseInt(match[3], 10)
    const country = match[4]
    const points = Number.parseInt(match[5], 10)
    if (name && Number.isFinite(rank)) {
      rows.push({
        name,
        normalizedName: normalizeName(name),
        rank,
        points: Number.isFinite(points) ? points : null,
        age: Number.isFinite(age) ? age : null,
        country,
        tour: source.tour,
        profileUrl: source.url,
        source: source.url
      })
    }
    match = rowPattern.exec(tableText)
  }
  return rows
}

const parseLiveTennisSnapshotRows = (snapshot, source) => {
  const rowMatches = [...String(snapshot || '').matchAll(/- row "([^"]+)":/g)].map((match) => match[1])
  const rows = []

  for (const row of rowMatches) {
    if (!/^\d{1,4}\s/.test(row) || /^#\s/.test(row)) continue
    const match = row.match(/^(\d{1,4})\s+(.+?)\s+(\d{1,2}(?:\.\d+)?)\s+([A-Z]{3})\d*\s+(\d{1,6})(?:\s|$)/u)
    if (!match) continue
    const rank = Number.parseInt(match[1], 10)
    const name = stripTags(match[2])
      .replace(/^(?:CH|NCH\s+\(\d+\)|\d{1,3})\s+/u, '')
      .trim()
    const age = Number.parseFloat(match[3])
    const country = match[4]
    const points = Number.parseInt(match[5], 10)
    if (!name || !Number.isFinite(rank)) continue
    rows.push({
      name,
      normalizedName: normalizeName(name),
      rank,
      points: Number.isFinite(points) ? points : null,
      age: Number.isFinite(age) ? age : null,
      country,
      tour: source.tour,
      profileUrl: source.url,
      source: `${source.url} browser snapshot`
    })
  }

  return rows
}

const fetchHtml = async (url) => {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })
  const html = await response.text()
  if (!response.ok) {
    const challenge = /cf-mitigated|Just a moment|Enable JavaScript and cookies/i.test(html)
    throw new Error(`${challenge ? 'Challenge' : 'HTTP'} ${response.status}`)
  }
  return html
}

const main = async () => {
  const options = parseArgs()
  const players = {}
  const sourceCounts = {}
  const sourceErrors = {}

  for (const source of ESPN_SOURCES) {
    const html = await fetchHtml(source.url)
    const parsed = parseEspnRows(html, source)
    sourceCounts[`ESPN ${source.tour}`] = parsed.length
    for (const player of parsed) {
      players[player.normalizedName] = {
        name: player.name,
        rank: player.rank,
        points: player.points,
        age: player.age,
        country: player.country,
        tour: player.tour,
        source: player.source,
        profileUrl: player.profileUrl,
        asOf: options.date
      }
    }
  }

  for (const source of LIVE_TENNIS_SOURCES) {
    let parsed = []
    try {
      const html = await fetchHtml(source.url)
      parsed = parseLiveTennisRows(html, source)
      sourceCounts[`Live Tennis ${source.tour}`] = parsed.length
    } catch (error) {
      const snapshotPath = source.tour === 'ATP' ? options.liveSnapshotAtp : options.liveSnapshotWta
      if (snapshotPath) {
        const snapshot = await fs.readFile(snapshotPath, 'utf8')
        parsed = parseLiveTennisSnapshotRows(snapshot, source)
      }
      sourceCounts[`Live Tennis ${source.tour}`] = parsed.length
      sourceErrors[`Live Tennis ${source.tour}`] = error.message
    }
    for (const player of parsed) {
      players[player.normalizedName] = {
        ...(players[player.normalizedName] || {}),
        name: player.name,
        rank: player.rank,
        points: player.points,
        age: player.age,
        country: player.country,
        tour: player.tour,
        source: player.source,
        profileUrl: player.profileUrl,
        asOf: options.date,
        liveRankSource: player.source
      }
    }
  }

  const output = {
    source: 'ESPN tennis rankings + Live Tennis live rankings when reachable',
    asOf: options.date,
    sourceUrls: [...ESPN_SOURCES, ...LIVE_TENNIS_SOURCES].map((source) => source.url),
    sourceCounts,
    sourceErrors,
    players
  }

  const outputPath = path.resolve(options.output)
  const historyPath = path.resolve(options.historyDir, `${options.date}.json`)
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.mkdir(path.dirname(historyPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
  await fs.writeFile(historyPath, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`Wrote ${Object.keys(players).length} tennis ranking rows to ${outputPath}`)
  console.log(`Wrote dated tennis ranking snapshot to ${historyPath}`)
  console.log(JSON.stringify({ sourceCounts, sourceErrors }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

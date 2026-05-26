import fs from 'node:fs/promises'
import path from 'node:path'

const OUTPUT = 'data-private/reference/tennis/player-rankings.json'
const SOURCES = [
  {
    tour: 'ATP',
    url: 'https://www.espn.com/tennis/rankings/_/type/atp/season/2026'
  },
  {
    tour: 'WTA',
    url: 'https://www.espn.com/tennis/rankings/_/type/wta/season/2026'
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

const parseRows = (html, source) => {
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

const main = async () => {
  const players = {}
  const sourceCounts = {}

  for (const source of SOURCES) {
    const response = await fetch(source.url, {
      headers: {
        'user-agent': 'Mozilla/5.0'
      }
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch ${source.url}: ${response.status}`)
    }
    const html = await response.text()
    const parsed = parseRows(html, source)
    sourceCounts[source.tour] = parsed.length
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
        asOf: '2026-05-26'
      }
    }
  }

  const output = {
    source: 'ESPN tennis rankings',
    asOf: '2026-05-26',
    sourceUrls: SOURCES.map((source) => source.url),
    sourceCounts,
    players
  }

  const outputPath = path.resolve(OUTPUT)
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`Wrote ${Object.keys(players).length} ESPN tennis ranking rows to ${outputPath}`)
  console.log(JSON.stringify(sourceCounts))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

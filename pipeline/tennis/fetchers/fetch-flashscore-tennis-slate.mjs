import fs from 'node:fs/promises'
import path from 'node:path'
import { fetchFlashscoreTennisStats } from './fetch-flashscore-tennis-stats.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const OUTPUT_DIR = path.join(ROOT, 'data-private/reference/tennis/flashscore-match-stats')
const TOURNAMENT_URLS = [
  'https://www.flashscoreusa.com/tennis/atp-singles/french-open/',
  'https://www.flashscoreusa.com/tennis/wta-singles/french-open/'
]

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: '',
    outputDir: OUTPUT_DIR,
    limit: 0
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = args[index + 1]
      index += 1
    } else if (arg === '--output-dir') {
      options.outputDir = path.resolve(args[index + 1])
      index += 1
    } else if (arg === '--limit') {
      options.limit = Number(args[index + 1]) || 0
      index += 1
    }
  }

  if (!options.date) {
    throw new Error('Pass --date YYYY-MM-DD')
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
  return Boolean(
    (leftLast && leftLast.length > 3 && rightTokens.has(leftLast)) ||
      (rightLast && rightLast.length > 3 && leftTokens.has(rightLast))
  )
}

const samePair = (leftPair, rightPair) => {
  if (leftPair.length !== 2 || rightPair.length !== 2) return false
  return (
    (samePlayer(leftPair[0], rightPair[0]) && samePlayer(leftPair[1], rightPair[1])) ||
    (samePlayer(leftPair[0], rightPair[1]) && samePlayer(leftPair[1], rightPair[0]))
  )
}

const flashscoreDateLabel = (isoDate) => {
  const [, month, day] = isoDate.split('-').map(Number)
  return `${month}/${day}`
}

const decodeHtml = (value) =>
  String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')

const extractDateLinks = (html, isoDate) => {
  const dateLabel = flashscoreDateLabel(isoDate)
  const links = []
  const markerPattern = /(?:^|[,>]\s*)(\d{1,2}\/\d{1,2})\s/g
  let match
  const markers = []
  while ((match = markerPattern.exec(html))) {
    markers.push({ label: match[1], index: match.index + match[0].lastIndexOf(match[1]) })
  }

  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index]
    if (marker.label !== dateLabel) continue
    const next = markers.slice(index + 1).find((candidate) => candidate.index > marker.index)
    const chunk = html.slice(marker.index, next?.index ?? html.length)
    for (const link of chunk.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)) {
      if (!link[1].startsWith('/game/tennis/')) continue
      const label = decodeHtml(link[2])
      const players = label.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean)
      if (players.length !== 2) continue
      links.push({
        url: new URL(link[1], 'https://www.flashscoreusa.com').href,
        label,
        players
      })
    }
  }

  return links
}

const readSlateGames = async (isoDate) => {
  const gamesDir = path.join(ROOT, 'published-data/slates', isoDate, 'games')
  const files = await fs.readdir(gamesDir)
  const games = []
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const payload = JSON.parse(await fs.readFile(path.join(gamesDir, file), 'utf8'))
    if (payload.league !== 'Tennis') continue
    const players = (payload.tennisContext?.players || []).map((player) => player.name).filter(Boolean)
    if (players.length !== 2) continue
    games.push({
      id: payload.id,
      title: payload.title,
      players,
      file
    })
  }
  return games
}

const fetchTournamentLinks = async (isoDate) => {
  const allLinks = []
  for (const tournamentUrl of TOURNAMENT_URLS) {
    const response = await fetch(tournamentUrl, { headers: { 'user-agent': 'Mozilla/5.0' } })
    if (!response.ok) {
      throw new Error(`Flashscore tournament page failed ${response.status}: ${tournamentUrl}`)
    }
    const html = await response.text()
    for (const link of extractDateLinks(html, isoDate)) {
      allLinks.push({ ...link, tournamentUrl })
    }
  }
  return allLinks
}

const main = async () => {
  const options = parseArgs()
  const [games, links] = await Promise.all([readSlateGames(options.date), fetchTournamentLinks(options.date)])
  const matched = []
  const unmatchedSlate = []
  const usedLinkIndexes = new Set()

  for (const game of games) {
    const linkIndex = links.findIndex((link, index) => !usedLinkIndexes.has(index) && samePair(game.players, link.players))
    if (linkIndex === -1) {
      unmatchedSlate.push(game)
      continue
    }
    usedLinkIndexes.add(linkIndex)
    matched.push({ game, link: links[linkIndex] })
  }

  const limited = options.limit > 0 ? matched.slice(0, options.limit) : matched
  await fs.mkdir(options.outputDir, { recursive: true })
  const fetched = []
  const failed = []

  for (const item of limited) {
    try {
      const payload = await fetchFlashscoreTennisStats({
        url: item.link.url,
        extra: {
          slateDate: options.date,
          boardMatchId: item.game.id,
          boardTitle: item.game.title,
          flashscoreLabel: item.link.label,
          flashscoreTournamentUrl: item.link.tournamentUrl
        }
      })
      payload.players = payload.players.map((player) => item.game.players.find((boardPlayer) => samePlayer(player, boardPlayer)) || player)
      const outputPath = path.join(options.outputDir, `${payload.matchId}.json`)
      await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
      fetched.push({
        boardMatchId: item.game.id,
        flashscoreId: payload.matchId,
        statsRows: payload.scopes.reduce(
          (count, scope) => count + scope.sections.reduce((inner, section) => inner + section.stats.length, 0),
          0
        ),
        output: path.relative(ROOT, outputPath)
      })
    } catch (error) {
      failed.push({ boardMatchId: item.game.id, url: item.link.url, error: error.message })
    }
  }

  console.log(
    JSON.stringify(
      {
        date: options.date,
        slateMatches: games.length,
        flashscoreLinks: links.length,
        matched: matched.length,
        fetched: fetched.length,
        unmatchedSlate: unmatchedSlate.map((game) => ({ id: game.id, title: game.title })),
        unusedFlashscoreLinks: links
          .filter((_, index) => !usedLinkIndexes.has(index))
          .map((link) => ({ label: link.label, url: link.url })),
        failed,
        outputs: fetched
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

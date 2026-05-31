import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const publishedRoot = path.join(root, 'published-data')
const webPublicDataRoot = path.join(root, 'web', 'public', 'data')
const currentRoot = path.join(webPublicDataRoot, 'current')
const publicSlatesRoot = path.join(webPublicDataRoot, 'slates')
const publicModelHistoryRoot = path.join(webPublicDataRoot, 'model-history')

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'))
const writeJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(payload)}\n`, 'utf8')
}

const argValue = (name) => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : ''
}

const parseDateList = (value = '') =>
  String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

const currentIsoDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${byType.year}-${byType.month}-${byType.day}`
}

const addDays = (isoDate, days) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return [
    date.getUTCFullYear(),
    `${date.getUTCMonth() + 1}`.padStart(2, '0'),
    `${date.getUTCDate()}`.padStart(2, '0')
  ].join('-')
}

const selectSlate = async () => {
  const requestedDate = argValue('--date') || process.env.PUBLIC_SLATE_DATE
  const manifest = await readJson(path.join(publishedRoot, 'slates', 'index.json'))
  const sorted = [...manifest].sort((left, right) => String(left.id).localeCompare(String(right.id)))
  if (requestedDate) {
    const requested = sorted.find((entry) => entry.id === requestedDate)
    if (!requested) throw new Error(`No published slate found for ${requestedDate}`)
    return requested
  }

  const today = currentIsoDate()
  const todaySlate = sorted.find((entry) => entry.id === today)
  if (todaySlate) return todaySlate

  const latestNotFuture = sorted.filter((entry) => String(entry.id) <= today).at(-1)
  return latestNotFuture || sorted.at(-1)
}

const selectPublicSlates = async (currentSlate) => {
  const manifest = await readJson(path.join(publishedRoot, 'slates', 'index.json'))
  const sorted = [...manifest].sort((left, right) => String(left.id).localeCompare(String(right.id)))
  const explicitDates = [
    ...parseDateList(argValue('--include-dates')),
    ...parseDateList(process.env.PUBLIC_EXTRA_SLATE_DATES)
  ]
  const ids = new Set([currentSlate.id, addDays(currentSlate.id, 1), ...explicitDates].filter(Boolean))
  return sorted.filter((entry) => ids.has(entry.id))
}

const copyIfPresent = async (sourcePath, targetPath) => {
  if (!fsSync.existsSync(sourcePath)) return false
  await fs.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.copyFile(sourcePath, targetPath)
  return true
}

const normalizeSearchText = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()

const collectSearchText = (value, depth = 0) => {
  if (value === null || value === undefined || depth > 4) return []
  if (['string', 'number', 'boolean'].includes(typeof value)) return [String(value)]
  if (Array.isArray(value)) return value.flatMap((entry) => collectSearchText(entry, depth + 1))
  if (typeof value !== 'object') return []
  return Object.entries(value)
    .filter(([key]) => !['url', 'urls', 'sources', 'sourceUrl'].includes(key))
    .flatMap(([, entry]) => collectSearchText(entry, depth + 1))
}

const gameTeamNames = (game) => {
  const matchup = Array.isArray(game.matchup) ? game.matchup : []
  return matchup.map((entry) => entry?.name || entry?.displayName).filter(Boolean)
}

const findGameIdForTitle = (games, title) => {
  const normalizedTitle = normalizeSearchText(title)
  return String(games.find((game) => normalizeSearchText(game.title) === normalizedTitle)?.id || '')
}

const searchRow = (slate, fields, searchParts) => ({
  ...fields,
  date: slate.id,
  dateLabel: slate.label,
  searchableText: normalizeSearchText(searchParts.flatMap((part) => collectSearchText(part)).join(' '))
})

const buildSearchIndex = async (slate, summary, propsPath, homeRunsPath) => {
  const games = Array.isArray(summary.games) ? summary.games : []
  const rows = []
  const hasMlb = games.some((game) => game.league === 'MLB')
  const hasTennis = games.some((game) => game.league === 'Tennis')

  if (hasMlb) {
    rows.push(
      searchRow(
        slate,
        {
          id: `${slate.id}:mlb-value-center`,
          kind: 'view',
          resultType: 'Value board',
          targetTab: 'board',
          targetFilter: 'Value',
          valueScope: 'mlb-overview',
          league: 'MLB',
          title: 'MLB value center',
          subtitle: `${slate.label} | sides, totals, first inning, props`,
          matchContext: 'Overview',
          priority: 15
        },
        [slate, 'mlb baseball value board sides totals markets props first inning yrfi nrfi']
      )
    )
  }

  if (hasTennis) {
    rows.push(
      searchRow(
        slate,
        {
          id: `${slate.id}:tennis-value-board`,
          kind: 'view',
          resultType: 'Value board',
          targetTab: 'board',
          targetFilter: 'Value',
          valueScope: 'tennis',
          league: 'Tennis',
          title: 'Tennis value board',
          subtitle: `${slate.label} | match, spread, total, Kalshi`,
          matchContext: 'Tennis',
          priority: 15
        },
        [slate, 'tennis value board match winner spread total games kalshi trade']
      )
    )
  }

  for (const game of games) {
    const teams = gameTeamNames(game)
    rows.push(
      searchRow(
        slate,
        {
          id: `${slate.id}:${game.id}:game`,
          kind: 'game',
          resultType: String(game.league || 'Game'),
          targetTab: 'board',
          targetFilter: 'All',
          gameId: game.id,
          league: game.league,
          title: game.title,
          subtitle: `${slate.label} | ${game.start || 'TBD'} | ${game.stage || game.league || 'Game'}`,
          stage: game.stage,
          start: game.start,
          confidence: game.analysis?.confidence ?? game.confidence ?? null,
          matchContext: teams.join(' vs '),
          priority: 30
        },
        [slate, game, teams, 'game matchup team teams moneyline side total market']
      )
    )
  }

  const propPayload = fsSync.existsSync(propsPath) ? await readJson(propsPath) : null
  const props = Array.isArray(propPayload?.picks) ? propPayload.picks : []
  if (props.length) {
    rows.push(
      searchRow(
        slate,
        {
          id: `${slate.id}:mlb-props-board`,
          kind: 'view',
          resultType: 'Props',
          targetTab: 'parlay',
          builderCatalogTab: 'props',
          builderLeagueFilter: 'MLB',
          league: 'MLB',
          title: 'MLB player props',
          subtitle: `${slate.label} | TB, pitcher K, hits, RBI, walks`,
          matchContext: 'Parlay builder',
          priority: 15
        },
        [slate, props, 'mlb baseball player props total bases tb pitcher strikeouts hits rbi walks singles']
      )
    )
  }

  for (const prop of props) {
    rows.push(
      searchRow(
        slate,
        {
          id: `${slate.id}:prop:${prop.id || `${prop.playerName}-${prop.propType}`}`,
          kind: 'prop',
          resultType: 'Prop',
          targetTab: 'parlay',
          builderCatalogTab: 'props',
          builderLeagueFilter: 'MLB',
          propType: prop.propType,
          gameId: String(prop.gameId || findGameIdForTitle(games, prop.gameTitle) || ''),
          league: 'MLB',
          title: `${prop.playerName || 'Player'} ${prop.marketLabel || prop.propLabel || 'prop'}`,
          subtitle: `${prop.gameTitle || 'MLB'} | ${prop.propLabel || prop.propType || 'Prop'} | ${slate.label}`,
          stage: prop.stage,
          start: prop.start,
          confidence: prop.confidence,
          matchContext: prop.recommendationTier || prop.propLabel || 'Player prop',
          priority: 55
        },
        [slate, prop, 'mlb baseball player props prop total bases tb pitcher strikeouts hits rbi walks singles']
      )
    )
  }

  const homeRunPayload = fsSync.existsSync(homeRunsPath) ? await readJson(homeRunsPath) : null
  const homeRuns = Array.isArray(homeRunPayload?.picks) ? homeRunPayload.picks : []
  if (homeRuns.length) {
    rows.push(
      searchRow(
        slate,
        {
          id: `${slate.id}:mlb-hr-board`,
          kind: 'view',
          resultType: 'HR board',
          targetTab: 'board',
          targetFilter: 'Value',
          valueScope: 'mlb-hr',
          league: 'MLB',
          title: 'MLB HR value board',
          subtitle: `${slate.label} | ${homeRuns.length} home-run candidates`,
          matchContext: 'Home runs',
          priority: 22
        },
        [slate, homeRuns, 'mlb baseball home runs home run homer hr long ball value ladder statcast']
      )
    )
  }

  for (const pick of homeRuns) {
    rows.push(
      searchRow(
        slate,
        {
          id: `${slate.id}:hr:${pick.playerId || pick.playerName}:${pick.gameId || ''}`,
          kind: 'homeRun',
          resultType: 'HR',
          targetTab: 'board',
          targetFilter: 'Value',
          valueScope: 'mlb-hr',
          gameId: String(pick.gameId || findGameIdForTitle(games, pick.gameTitle) || ''),
          league: 'MLB',
          title: `${pick.playerName || 'Player'} home-run lane`,
          subtitle: `${pick.teamName || 'MLB'} | ${pick.gameTitle || 'Game'} | ${slate.label}`,
          confidence: pick.modelSharePct ?? pick.score ?? pick.baseScore ?? null,
          matchContext: pick.scoreBand || pick.lane || 'HR watch',
          priority: 60
        },
        [slate, pick, 'mlb baseball home runs home run homer hr long ball statcast batter hitter']
      )
    )
  }

  return rows
}

const exportSlateBundle = async (slate, targetRoot) => {
  const sourceSlateRoot = path.join(publishedRoot, 'slates', slate.id)
  const sourceSummaryPath = path.join(sourceSlateRoot, 'summary.json')
  const sourceGamesRoot = path.join(sourceSlateRoot, 'games')
  if (!fsSync.existsSync(sourceSummaryPath)) {
    throw new Error(`Missing published summary for ${slate.id}: ${sourceSummaryPath}`)
  }

  await fs.rm(targetRoot, { recursive: true, force: true })
  await fs.mkdir(path.join(targetRoot, 'games'), { recursive: true })
  await fs.cp(sourceGamesRoot, path.join(targetRoot, 'games'), { recursive: true })
  await fs.copyFile(sourceSummaryPath, path.join(targetRoot, 'summary.json'))

  const propsSource = path.join(root, 'data-private', 'predictions', 'mlb-player-props', `${slate.id}-player-props.json`)
  const homeRunsSource = path.join(root, 'data-private', 'predictions', 'mlb-home-runs', `${slate.id}-statcast-prototype.json`)
  const propsTarget = path.join(targetRoot, 'props.json')
  const homeRunsTarget = path.join(targetRoot, 'home-runs.json')
  const hasProps = await copyIfPresent(propsSource, propsTarget)
  const hasHomeRuns = await copyIfPresent(homeRunsSource, homeRunsTarget)

  const summary = await readJson(path.join(targetRoot, 'summary.json'))
  const searchIndex = await buildSearchIndex(slate, summary, propsTarget, homeRunsTarget)
  await writeJson(path.join(targetRoot, 'search.json'), searchIndex)
  return { slate, summary, searchIndex, hasProps, hasHomeRuns }
}

const main = async () => {
  const slate = await selectSlate()
  if (!slate) throw new Error('No published slate is available to export')

  const slates = await selectPublicSlates(slate)
  await fs.rm(publicSlatesRoot, { recursive: true, force: true })

  const bundles = []
  for (const publicSlate of slates) {
    bundles.push(await exportSlateBundle(publicSlate, path.join(publicSlatesRoot, publicSlate.id)))
  }

  const currentBundle = bundles.find((bundle) => bundle.slate.id === slate.id)
  if (!currentBundle) throw new Error(`Current slate ${slate.id} was not exported`)

  await fs.rm(currentRoot, { recursive: true, force: true })
  await fs.cp(path.join(publicSlatesRoot, slate.id), currentRoot, { recursive: true })

  const combinedSearchIndex = bundles.flatMap((bundle) => bundle.searchIndex)
  await writeJson(path.join(webPublicDataRoot, 'search.json'), combinedSearchIndex)

  const sourceModelHistoryRoot = path.join(publishedRoot, 'model-history')
  await fs.rm(publicModelHistoryRoot, { recursive: true, force: true })
  if (fsSync.existsSync(sourceModelHistoryRoot)) {
    await fs.cp(sourceModelHistoryRoot, publicModelHistoryRoot, { recursive: true })
  }

  const availabilityByDate = Object.fromEntries(
    bundles.map((bundle) => [
      bundle.slate.id,
      {
        hasProps: bundle.hasProps,
        hasHomeRuns: bundle.hasHomeRuns
      }
    ])
  )

  await writeJson(path.join(webPublicDataRoot, 'meta.json'), {
    mode: 'current-day-static',
    generatedAt: new Date().toISOString(),
    currentSlate: slate,
    slates: bundles.map((bundle) => bundle.slate),
    availabilityByDate,
    hasProps: currentBundle.hasProps,
    hasHomeRuns: currentBundle.hasHomeRuns,
    files: {
      summary: '/data/current/summary.json',
      games: '/data/current/games',
      props: currentBundle.hasProps ? '/data/current/props.json' : null,
      homeRuns: currentBundle.hasHomeRuns ? '/data/current/home-runs.json' : null,
      search: '/data/search.json',
      slates: '/data/slates',
      modelHistory: fsSync.existsSync(path.join(publicModelHistoryRoot, 'index.json')) ? '/data/model-history/index.json' : null
    }
  })

  console.log(
    `Public slates exported: ${bundles.map((bundle) => bundle.slate.id).join(', ')}; current ${slate.id} (${currentBundle.summary.games?.length ?? 0} games, ${combinedSearchIndex.length} search rows) -> ${webPublicDataRoot}`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

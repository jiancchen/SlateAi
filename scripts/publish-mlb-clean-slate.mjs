import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const publishedSlatesRoot = path.join(root, 'published-data', 'slates')

const argValue = (name, fallback = '') => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const hasFlag = (name) => process.argv.includes(name)
const readJson = async (filePath, fallback = null) => {
  if (!fsSync.existsSync(filePath)) return fallback
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

const writeJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

const run = (command, args = [], options = {}) => {
  const rendered = [command, ...args].join(' ')
  console.log(`[publish-mlb-clean-slate] $ ${rendered}`)
  execFileSync(command, args, {
    cwd: options.cwd || root,
    stdio: 'inherit',
    env: { ...process.env, ...(options.env || {}) }
  })
}

const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const roundToTenths = (value) => Math.round(Number(value) * 10) / 10

const poissonSeries = (lambdaInput, maxRuns = 20) => {
  const lambda = clamp(Number(lambdaInput), 0.05, 20)
  const values = []
  let probability = Math.exp(-lambda)
  let total = 0
  for (let runs = 0; runs <= maxRuns; runs += 1) {
    if (runs > 0) probability *= lambda / runs
    values.push(probability)
    total += probability
  }
  if (total > 0 && total < 0.999) values[maxRuns] += 1 - total
  return values
}

const buildFirst5LeadProbabilities = (awayRunsInput, homeRunsInput) => {
  const awaySeries = poissonSeries(awayRunsInput, 16)
  const homeSeries = poissonSeries(homeRunsInput, 16)
  let awayWin = 0
  let homeWin = 0
  let tie = 0
  awaySeries.forEach((awayProbability, awayRuns) => {
    homeSeries.forEach((homeProbability, homeRuns) => {
      const joint = awayProbability * homeProbability
      if (awayRuns > homeRuns) awayWin += joint
      else if (homeRuns > awayRuns) homeWin += joint
      else tie += joint
    })
  })
  return {
    awayWinPct: roundToTenths(awayWin * 100),
    homeWinPct: roundToTenths(homeWin * 100),
    tiePct: roundToTenths(tie * 100)
  }
}

const withFirst5PushContext = (game) => {
  const projection = game?.analysis?.mlbProjection
  if (!projection) return game
  const awayRuns = Number(projection.awayFirst5ProjectedRuns)
  const homeRuns = Number(projection.homeFirst5ProjectedRuns)
  if (!Number.isFinite(awayRuns) || !Number.isFinite(homeRuns)) return game
  const probabilities = buildFirst5LeadProbabilities(awayRuns, homeRuns)
  const pickSide = homeRuns >= awayRuns ? 'home' : 'away'
  const leadPct = pickSide === 'home' ? probabilities.homeWinPct : probabilities.awayWinPct
  return {
    ...game,
    analysis: {
      ...game.analysis,
      mlbProjection: {
        ...projection,
        first5Moneyline: {
          pickSide,
          pickTeam: pickSide === 'home' ? game.matchup?.[1]?.name || '' : game.matchup?.[0]?.name || '',
          awayProjectedRuns: roundToTenths(awayRuns),
          homeProjectedRuns: roundToTenths(homeRuns),
          awayLeadProbability: probabilities.awayWinPct,
          homeLeadProbability: probabilities.homeWinPct,
          pushProbability: probabilities.tiePct,
          leadProbability: leadPct,
          source: 'M2 first-five projected runs; tie is a first-five ML push'
        }
      }
    }
  }
}

const labelForDate = (date) => {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

const sourceKey = (source = {}) => source.url || source.label || JSON.stringify(source)

const mergeSources = (existingSources = []) => {
  const required = [
    { label: 'Official MLB schedule, probable pitchers, lineups, and game feeds', url: 'https://www.mlb.com/' },
    { label: 'Rotowire confirmed MLB daily lineups fallback', url: 'https://www.rotowire.com/baseball/daily-lineups.php' },
    { label: 'DraftKings MLB player prop board', url: 'https://sportsbook.draftkings.com/leagues/baseball/mlb' },
    { label: 'Baseball Savant hitter and pitcher pages', url: 'https://baseballsavant.mlb.com/' },
    { label: 'ESPN pitcher splits pages', url: 'https://www.espn.com/mlb/players' },
    { label: 'StatMuse starter vs opponent history', url: 'https://www.statmuse.com/mlb' }
  ]
  const merged = []
  const seen = new Set()
  for (const source of [...existingSources, ...required]) {
    const key = sourceKey(source)
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(source)
  }
  return merged
}

const updatePublishedIndex = async (date, summary) => {
  const indexPath = path.join(publishedSlatesRoot, 'index.json')
  const index = await readJson(indexPath, [])
  const entry = {
    id: date,
    label: summary.label || labelForDate(date),
    status: 'ready',
    slateMeta: summary.slateMeta || { date: summary.label || labelForDate(date), isoDate: date },
    summary: {
      totalGames: summary.games.length,
      mlbGames: summary.games.filter((game) => game?.league === 'MLB').length
    }
  }
  const next = [...index.filter((item) => item?.id !== date), entry].sort((left, right) =>
    String(left.id).localeCompare(String(right.id))
  )
  await writeJson(indexPath, next)
}

const publishRichMlbGames = async (date) => {
  process.env.MLB_DAY_GAMES_DISABLE_DB = '1'
  const { loadMlbDayGames } = await import('../pipeline/lib/load-mlb-day-games.mjs')
  const mlbGames = (await loadMlbDayGames(date)).map(withFirst5PushContext)
  if (!mlbGames.length) throw new Error(`No rich MLB games loaded for ${date}`)

  const slateRoot = path.join(publishedSlatesRoot, date)
  const gamesRoot = path.join(slateRoot, 'games')
  const summaryPath = path.join(slateRoot, 'summary.json')
  const existingSummary = await readJson(summaryPath, {
    id: date,
    label: labelForDate(date),
    status: 'ready',
    slateMeta: { date: labelForDate(date), isoDate: date },
    games: [],
    sources: []
  })
  const nonMlbGames = (existingSummary.games || []).filter((game) => game?.league !== 'MLB')

  await fs.mkdir(gamesRoot, { recursive: true })
  for (const game of mlbGames) {
    await writeJson(path.join(gamesRoot, `${slugify(game.id)}.json`), game)
  }

  const games = [...nonMlbGames, ...mlbGames].sort((left, right) => {
    const startDelta = Number(left.startMinutes ?? 99999) - Number(right.startMinutes ?? 99999)
    if (Number.isFinite(startDelta) && startDelta !== 0) return startDelta
    return String(left.title || '').localeCompare(String(right.title || ''))
  })

  const summary = {
    ...existingSummary,
    id: date,
    label: existingSummary.label || labelForDate(date),
    status: 'ready',
    slateMeta: existingSummary.slateMeta || { date: existingSummary.label || labelForDate(date), isoDate: date },
    summary: {
      ...(existingSummary.summary || {}),
      totalGames: games.length,
      mlbGames: mlbGames.length
    },
    filters: Array.from(new Set([...(existingSummary.filters || ['All']), 'Tennis', 'MLB'])),
    sources: mergeSources(existingSummary.sources || []),
    games,
    updatedAt: new Date().toISOString()
  }

  await writeJson(summaryPath, summary)
  await updatePublishedIndex(date, summary)
  console.log(
    `[publish-mlb-clean-slate] published ${mlbGames.length} MLB games and preserved ${nonMlbGames.length} non-MLB games`
  )
}

const main = async () => {
  const date = argValue('--date')
  if (!date) throw new Error('Usage: npm run data:publish:mlb-clean -- --date YYYY-MM-DD [--refresh] [--deploy]')

  const shouldRefresh = hasFlag('--refresh')
  const deploy = hasFlag('--deploy')
  const skipEspn = hasFlag('--skip-espn')
  const skipGenerate = hasFlag('--skip-generate')
  const liveBase = argValue('--live-base')

  if (shouldRefresh && !skipGenerate) {
    run('npm', ['run', 'data:refresh:mlb-live', '--', '--date', date])
    run('npm', ['run', 'data:ingest:hitter-lineup-splits', '--', '--date', date])
  }
  if (shouldRefresh && !skipEspn) {
    run('node', ['scripts/warehouse-mlb-espn-pitcher-splits.mjs', '--date', date])
  }

  await publishRichMlbGames(date)

  run('npm', ['run', 'data:export:public-current', '--', '--date', date, '--current-window'], {
    env: { PUBLIC_SLATE_SCOPE: 'current-window' }
  })
  run('node', ['scripts/audit-public-mlb-slate.mjs', '--date', date])

  if (deploy) {
    run('vercel', ['build', '--prod', '--yes'], {
      cwd: path.join(root, 'web'),
      env: { VITE_PUBLIC_DESK_TABS: 'board,batters' }
    })
    run('vercel', ['deploy', '--prebuilt', '--prod', '--yes'], { cwd: path.join(root, 'web') })
    if (liveBase) {
      run('node', ['scripts/audit-public-mlb-slate.mjs', '--date', date, '--base', liveBase])
    }
  }
}

main().catch((error) => {
  console.error(`[publish-mlb-clean-slate] ${error.stack || error.message}`)
  process.exit(1)
})

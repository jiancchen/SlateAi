import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const reportsRoot = path.join(root, 'data-migration', 'reports')

const argValue = (name, fallback = '') => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const hasFlag = (name) => process.argv.includes(name)

const pacificToday = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date()).map((part) => [part.type, part.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
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

const readJson = async (filePath, fallback = null) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

const writeJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

const run = (label, command, args = [], options = {}) => {
  const startedAt = new Date().toISOString()
  const rendered = [command, ...args].join(' ')
  console.log(`\n[mlb-morning] ${label}`)
  console.log(`[mlb-morning] $ ${rendered}`)
  if (options.dryRun) {
    return { label, command: rendered, status: 'dry_run', startedAt, finishedAt: new Date().toISOString() }
  }
  try {
    execFileSync(command, args, {
      cwd: options.cwd || root,
      stdio: 'inherit',
      env: { ...process.env, ...(options.env || {}) }
    })
    return { label, command: rendered, status: 'passed', startedAt, finishedAt: new Date().toISOString() }
  } catch (error) {
    if (options.allowFailure) {
      return {
        label,
        command: rendered,
        status: 'allowed_failure',
        startedAt,
        finishedAt: new Date().toISOString(),
        error: error.message
      }
    }
    throw error
  }
}

const currentSummaryPath = () => path.join(root, 'web', 'public', 'data', 'current', 'summary.json')

const nonMlbIdsForCurrent = async () => {
  const summary = await readJson(currentSummaryPath(), { games: [] })
  return (summary.games || []).filter((game) => game.league !== 'MLB').map((game) => game.id).sort()
}

const assertNonMlbPreserved = (before = [], after = []) => {
  const afterSet = new Set(after)
  const missing = before.filter((id) => !afterSet.has(id))
  if (missing.length) {
    throw new Error(`Non-MLB slate IDs were not preserved: ${missing.slice(0, 12).join(', ')}`)
  }
  return { before: before.length, after: after.length, missing }
}

const main = async () => {
  const date = argValue('--date', pacificToday())
  const deploy = hasFlag('--deploy')
  const dryRun = hasFlag('--dry-run')
  const allowSourceGaps = hasFlag('--allow-source-gaps')
  const skipPriorClose = hasFlag('--skip-prior-close')
  const liveBase = argValue('--live-base', 'https://slate-web-static-1.vercel.app')
  const priorDate = argValue('--prior-date', addDays(date, -1))
  const steps = []
  const beforeNonMlbIds = await nonMlbIdsForCurrent()

  console.log(`[mlb-morning] date=${date}`)
  console.log(`[mlb-morning] prior=${priorDate}`)
  console.log(`[mlb-morning] deploy=${deploy}`)
  console.log(`[mlb-morning] allowSourceGaps=${allowSourceGaps}`)

  if (!skipPriorClose) {
    steps.push(run('Close and grade prior MLB day', 'npm', ['run', 'data:close:mlb-day', '--', '--date', priorDate], {
      dryRun,
      allowFailure: true
    }))
  }

  steps.push(run('Full M2 live refresh: MLB schedule, lineups, markets, model lanes, RP36, props', 'npm', [
    'run', 'data:refresh:mlb-live', '--', '--date', date
  ], { dryRun }))

  steps.push(run('Fetch StatMuse starter-vs-team history', 'node', [
    'data-migration/scripts/fetch-mlb-starter-vs-team-statmuse.mjs', '--date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Warehouse ESPN pitcher splits', 'node', [
    'scripts/warehouse-mlb-espn-pitcher-splits.mjs', '--date', date
  ], { dryRun }))

  steps.push(run('Regenerate M2 day files after supplemental sources', 'npm', [
    'run', 'data:generate:mlb-day', '--', '--date', date, '--skip-preflight'
  ], { dryRun }))

  steps.push(run('Regenerate lineup board after supplemental sources', 'npm', [
    'run', 'data:export:mlb-lineups', '--', '--date', date, '--skip-preflight'
  ], { dryRun }))

  steps.push(run('Ingest generated hitter lineup splits', 'npm', [
    'run', 'data:ingest:hitter-lineup-splits', '--', '--date', date
  ], { dryRun }))

  steps.push(run('Regenerate player props with market lineage', 'npm', [
    'run', 'data:export:mlb-props', '--', '--date', date, '--skip-preflight'
  ], { dryRun, env: { MLB_DAY_GAMES_DISABLE_DB: '1' } }))

  steps.push(run('Publish rich MLB slate and preserve non-MLB games', 'npm', [
    'run', 'data:publish:mlb-clean', '--', '--date', date
  ], { dryRun }))

  const afterNonMlbIds = dryRun ? beforeNonMlbIds : await nonMlbIdsForCurrent()
  const preservation = assertNonMlbPreserved(beforeNonMlbIds, afterNonMlbIds)

  steps.push(run('Public data audit', 'npm', [
    'run', 'data:audit:mlb-public', '--', '--date', date
  ], { dryRun }))

  steps.push(run('Hard source-contract audit', 'npm', [
    'run', 'data:audit:mlb-morning-contracts', '--', '--date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  if (deploy) {
    steps.push(run('Build and deploy public site with hash/private-reference checks', 'npm', [
      'run', 'publish:site', '--', '--date', date
    ], { dryRun }))
    steps.push(run('Live public data audit', 'npm', [
      'run', 'data:audit:mlb-public', '--', '--date', date, '--base', liveBase
    ], { dryRun }))
  }

  const report = {
    run: 'mlb-morning-predictions',
    date,
    priorDate,
    generatedAt: new Date().toISOString(),
    deploy,
    allowSourceGaps,
    nonMlbPreservation: preservation,
    steps
  }
  const reportPath = path.join(reportsRoot, `mlb_morning_predictions_${date}.json`)
  if (!dryRun) await writeJson(reportPath, report)
  console.log(`\n[mlb-morning] complete ${date}`)
  console.log(`[mlb-morning] report=${dryRun ? 'dry-run-not-written' : path.relative(root, reportPath)}`)
  if (allowSourceGaps) {
    console.log('[mlb-morning] source gaps were allowed; do not treat this as production-green.')
  }
}

main().catch(async (error) => {
  console.error(`[mlb-morning] ${error.stack || error.message}`)
  process.exit(1)
})

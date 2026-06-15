import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dirname, '..')
const reportsRoot = path.join(rootDir, 'data-migration', 'reports')

const argValue = (name, fallback = '') => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const hasFlag = (name) => process.argv.includes(name)

const addDays = (isoDate, days) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return [
    date.getUTCFullYear(),
    `${date.getUTCMonth() + 1}`.padStart(2, '0'),
    `${date.getUTCDate()}`.padStart(2, '0')
  ].join('-')
}

const dateRange = (startDate, endDate) => {
  const dates = []
  for (let cursor = startDate; cursor <= endDate; cursor = addDays(cursor, 1)) {
    dates.push(cursor)
  }
  return dates
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

const writeText = async (filePath, text) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, text, 'utf8')
}

const run = (label, command, args = [], options = {}) => {
  const startedMs = Date.now()
  const startedAt = new Date(startedMs).toISOString()
  const rendered = [command, ...args].join(' ')
  console.log(`\n[mlb-sp1-calibration] ${label}`)
  console.log(`[mlb-sp1-calibration] $ ${rendered}`)

  if (options.dryRun) {
    const finishedMs = Date.now()
    return {
      label,
      command: rendered,
      status: 'dry_run',
      startedAt,
      finishedAt: new Date(finishedMs).toISOString(),
      durationMs: finishedMs - startedMs
    }
  }

  try {
    execFileSync(command, args, { cwd: rootDir, stdio: 'inherit', env: process.env })
    const finishedMs = Date.now()
    return {
      label,
      command: rendered,
      status: 'passed',
      startedAt,
      finishedAt: new Date(finishedMs).toISOString(),
      durationMs: finishedMs - startedMs
    }
  } catch (error) {
    const finishedMs = Date.now()
    const failed = {
      label,
      command: rendered,
      status: options.continueOnError ? 'failed_allowed' : 'failed',
      startedAt,
      finishedAt: new Date(finishedMs).toISOString(),
      durationMs: finishedMs - startedMs,
      error: error.message
    }
    if (options.continueOnError) return failed
    throw Object.assign(error, { step: failed })
  }
}

const seconds = (ms = 0) => `${(Number(ms || 0) / 1000).toFixed(1)}s`

const stepCounts = (steps = []) =>
  steps.reduce((acc, step) => {
    acc[step.status] = (acc[step.status] || 0) + 1
    return acc
  }, {})

const reportSlug = (startDate, endDate) => (startDate === endDate ? startDate : `${startDate}_${endDate}`)

const buildMarkdown = (report, backtest = null) => {
  const counts = stepCounts(report.steps)
  const lines = [
    `# MLB-SP1 Shadow Calibration ${report.slug}`,
    '',
    `- Run ID: ${report.runId}`,
    `- Generated: ${report.generatedAt}`,
    `- Dates: ${report.dates.join(', ')}`,
    `- Step status counts: ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}`,
    `- Continue on error: ${report.continueOnError ? 'yes' : 'no'}`,
    ''
  ]

  if (backtest) {
    lines.push(
      '## Backtest Readout',
      '',
      `- Rows: ${backtest.rows ?? 'n/a'}`,
      `- Matched actual rows: ${backtest.matchedActualRows ?? 'n/a'}`,
      `- Collapse risk: ${backtest.directionalScores?.collapseRisk?.hits ?? 'n/a'}/${backtest.directionalScores?.collapseRisk?.graded ?? 'n/a'} (${backtest.directionalScores?.collapseRisk?.hitRatePct ?? 'n/a'}%)`,
      `- Runs delta: ${backtest.directionalScores?.expectedRunsAllowedDelta?.hits ?? 'n/a'}/${backtest.directionalScores?.expectedRunsAllowedDelta?.graded ?? 'n/a'} (${backtest.directionalScores?.expectedRunsAllowedDelta?.hitRatePct ?? 'n/a'}%)`,
      `- Hits delta: ${backtest.directionalScores?.expectedHitsAllowedDelta?.hits ?? 'n/a'}/${backtest.directionalScores?.expectedHitsAllowedDelta?.graded ?? 'n/a'} (${backtest.directionalScores?.expectedHitsAllowedDelta?.hitRatePct ?? 'n/a'}%)`,
      `- HR delta: ${backtest.directionalScores?.expectedHrAllowedDelta?.hits ?? 'n/a'}/${backtest.directionalScores?.expectedHrAllowedDelta?.graded ?? 'n/a'} (${backtest.directionalScores?.expectedHrAllowedDelta?.hitRatePct ?? 'n/a'}%)`,
      ''
    )
  }

  lines.push(
    '## Steps',
    '',
    '| Step | Status | Duration |',
    '| --- | --- | ---: |',
    ...report.steps.map((step) => `| ${step.label.replaceAll('|', '/')} | ${step.status} | ${seconds(step.durationMs)} |`),
    ''
  )

  const nonPassing = report.steps.filter((step) => step.status !== 'passed' && step.status !== 'dry_run')
  if (nonPassing.length) {
    lines.push('## Non-Passing Steps', '')
    for (const step of nonPassing) {
      lines.push(`- ${step.label}: ${step.status}${step.error ? ` (${step.error})` : ''}`)
    }
    lines.push('')
  }

  lines.push('Promotion read: SP1 stays shadow until this report shows durable, lane-specific lift across a settled multi-date sample.', '')
  return `${lines.join('\n')}\n`
}

const main = async () => {
  const date = argValue('--date')
  const startDate = argValue('--start-date', date)
  const endDate = argValue('--end-date', date)
  const dryRun = hasFlag('--dry-run')
  const continueOnError = hasFlag('--continue-on-error')
  const skipSplits = hasFlag('--skip-splits')
  const skipSplitAudit = hasFlag('--skip-split-audit')
  const skipBuild = hasFlag('--skip-build')
  const skipSp1Audit = hasFlag('--skip-sp1-audit')
  const skipBacktest = hasFlag('--skip-backtest')

  if (!startDate || !endDate) {
    throw new Error('Usage: node scripts/run-mlb-sp1-shadow-calibration.mjs --date YYYY-MM-DD OR --start-date YYYY-MM-DD --end-date YYYY-MM-DD')
  }

  const dates = dateRange(startDate, endDate)
  const slug = reportSlug(startDate, endDate)
  const runId = `mlb-sp1-calibration-${slug}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`
  const steps = []

  console.log(`[mlb-sp1-calibration] dates=${dates.join(',')}`)
  console.log(`[mlb-sp1-calibration] dryRun=${dryRun}`)
  console.log(`[mlb-sp1-calibration] continueOnError=${continueOnError}`)

  for (const currentDate of dates) {
    if (!skipSplits) {
      steps.push(run(`Warehouse canonical split families ${currentDate}`, 'npm', [
        'run', 'data:warehouse:mlb-player-split-families', '--', '--date', currentDate
      ], { dryRun, continueOnError }))
    }

    if (!skipSplitAudit) {
      steps.push(run(`Audit canonical split families ${currentDate}`, 'npm', [
        'run', 'data:audit:mlb-player-split-families', '--', '--date', currentDate
      ], { dryRun, continueOnError }))
    }

    if (!skipBuild) {
      steps.push(run(`Build MLB-SP1 profiles ${currentDate}`, 'npm', [
        'run', 'data:build:mlb-sp1', '--', '--date', currentDate
      ], { dryRun, continueOnError }))
    }

    if (!skipSp1Audit) {
      steps.push(run(`Audit MLB-SP1 profiles ${currentDate}`, 'npm', [
        'run', 'data:audit:mlb-sp1', '--', '--date', currentDate
      ], { dryRun, continueOnError }))
    }
  }

  if (!skipBacktest) {
    steps.push(run(`Backtest MLB-SP1 shadow ${slug}`, 'npm', [
      'run', 'data:backtest:mlb-sp1', '--', '--start-date', startDate, '--end-date', endDate
    ], { dryRun, continueOnError }))
  }

  const backtestPath = path.join(reportsRoot, `backtest_mlb_sp1_${slug}.json`)
  const backtest = dryRun || skipBacktest ? null : await readJson(backtestPath, null)
  const report = {
    run: 'mlb-sp1-shadow-calibration',
    runId,
    slug,
    startDate,
    endDate,
    dates,
    generatedAt: new Date().toISOString(),
    dryRun,
    continueOnError,
    skipped: {
      splits: skipSplits,
      splitAudit: skipSplitAudit,
      build: skipBuild,
      sp1Audit: skipSp1Audit,
      backtest: skipBacktest
    },
    backtestReport: dryRun || skipBacktest ? null : path.relative(rootDir, backtestPath),
    steps
  }

  const reportPath = path.join(reportsRoot, `run_mlb_sp1_shadow_calibration_${slug}.json`)
  const markdownPath = path.join(reportsRoot, `run_mlb_sp1_shadow_calibration_${slug}.md`)
  if (!dryRun) await writeJson(reportPath, report)
  if (!dryRun) await writeText(markdownPath, buildMarkdown(report, backtest))

  const failures = steps.filter((step) => step.status === 'failed_allowed')
  console.log(`\n[mlb-sp1-calibration] complete ${slug}`)
  console.log(`[mlb-sp1-calibration] report=${dryRun ? 'dry-run-not-written' : path.relative(rootDir, reportPath)}`)
  if (failures.length) {
    console.log(`[mlb-sp1-calibration] allowed failures=${failures.length}`)
    process.exitCode = 1
  }
}

main().catch((error) => {
  if (error.step) {
    console.error(`[mlb-sp1-calibration] ${error.step.label} failed: ${error.step.error}`)
  } else {
    console.error(`[mlb-sp1-calibration] ${error.stack || error.message}`)
  }
  process.exit(1)
})

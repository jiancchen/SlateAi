import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..', '..', '..')

const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')

const checks = []
const fail = (message) => checks.push({ ok: false, message })
const pass = (message) => checks.push({ ok: true, message })

const appSource = read('web/src/App.tsx')
const boardSource = read('web/src/views/BoardView.tsx')

const requires = (condition, message) => (condition ? pass(message) : fail(message))

requires(
  /const first5MoneylineRows:\s*AnyRecord\[\]\s*=\s*\[\]/.test(appSource),
  'F5 moneyline value rows are initialized empty in the UI builder.'
)

requires(
  /const first5TotalRows:\s*AnyRecord\[\]\s*=\s*\[\]/.test(appSource),
  'F5 O/U value rows are initialized empty in the UI builder.'
)

requires(
  !/first5MoneylineRows\.push|first5TotalRows\.push/.test(appSource),
  'The UI does not push/generated first-five value rows from projections.'
)

requires(
  /first5TotalResearchRows:\s*AnyRecord\[\]\s*=\s*\[\]/.test(appSource),
  'Research-only F5 O/U rows have a separate bucket.'
)

requires(
  /entry\.raw\?\.valueGate\s*===\s*'validated'/.test(appSource) &&
    /entry\.raw\?\.valueGrade\s*===\s*'Bet-grade value'/.test(appSource),
  'Side/full-total value rows require model-owned validation or bet-grade value metadata.'
)

requires(
  /1st 5 O\/U research only/.test(boardSource) && /tennis-value-row muted/.test(boardSource),
  'BoardView renders F5 O/U research rows as muted research-only rows.'
)

requires(
  /MLB value rows must be model-owned/.test(appSource),
  'The value board carries the model-owned-row gate note.'
)

const failed = checks.filter((check) => !check.ok)
console.log(JSON.stringify({
  modelId: 'MLB-M2',
  check: 'value-row-gates',
  status: failed.length ? 'failed' : 'passed',
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
}, null, 2))

if (failed.length) process.exitCode = 1

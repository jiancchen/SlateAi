import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createSportsMatchModel } from '../lib/sports-model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..', '..', '..')
const date = '2026-05-31'

const actualSideFromRuns = (actual, line) => {
  if (!Number.isFinite(actual) || !Number.isFinite(line)) return 'Unknown'
  if (actual > line) return 'Over'
  if (actual < line) return 'Under'
  return 'Push'
}

const oldExposedRows = new Set([
  'Marlins @ Mets',
  'Diamondbacks @ Mariners',
  'Royals @ Rangers',
  'Phillies @ Dodgers',
  'Yankees @ Athletics',
  'Cubs @ Cardinals',
  'Tigers @ White Sox',
  'Angels @ Rays'
])

const stressPath = path.join(rootDir, 'data-private', 'reports', `mlb-m2-may31-f5-stress-harness-${date}.json`)
const stress = JSON.parse(fs.readFileSync(stressPath, 'utf8'))
const actualLookup = new Map(
  stress.games.map((row) => [
    row.game_title,
    {
      actualF5Total: Number(row.actual_f5_total),
      line: Number(row.first5_line),
      actualSide: actualSideFromRuns(Number(row.actual_f5_total), Number(row.first5_line))
    }
  ])
)

const gamesDir = path.join(rootDir, 'published-data', 'slates', date, 'games')
const rows = fs
  .readdirSync(gamesDir)
  .filter((file) => file.endsWith('.json') && !file.startsWith('rg-'))
  .sort()
  .map((file) => {
    const game = JSON.parse(fs.readFileSync(path.join(gamesDir, file), 'utf8'))
    const model = createSportsMatchModel(game)
    const totals = model?.analysis?.mlbProjection?.totals || game.analysis?.mlbProjection?.totals || {}
    const first5 = totals.first5 || {}
    const overlay = totals.first5TailOverlay || {}
    const actual = actualLookup.get(game.title) || {}
    const side = first5.lean === 'Over' || first5.lean === 'Under' ? first5.lean : 'Pass'
    return {
      gameTitle: game.title,
      oldExposed: oldExposedRows.has(game.title),
      baseProjectedFirst5: totals.projectedFirst5TotalRuns ?? null,
      tailAdjustedFirst5: totals.tailAdjustedProjectedFirst5TotalRuns ?? null,
      line: totals.derivedFirst5TotalLine ?? actual.line ?? null,
      side,
      label: first5.label || '',
      strength: first5.strength || '',
      actualFirst5Total: actual.actualF5Total ?? null,
      actualSide: actual.actualSide || 'Unknown',
      hit: side === 'Pass' ? null : side === actual.actualSide,
      tailShape: overlay.shape || '',
      tailScore: overlay.tailScore ?? null,
      strandScore: overlay.strandScore ?? null,
      adjustedEdge: overlay.adjustedEdge ?? null,
      notes: overlay.notes || []
    }
  })

const activeRows = rows.filter((row) => row.side !== 'Pass' && row.actualSide !== 'Push')
const activeHits = activeRows.filter((row) => row.hit).length
const oldRows = rows.filter((row) => row.oldExposed)
const oldWrongStillActive = oldRows.filter((row) => row.side !== 'Pass' && row.side !== row.actualSide)

const report = {
  schemaVersion: 1,
  modelId: 'MLB-M2',
  experiment: 'may31_f5_tail_overlay_check',
  date,
  activeRecord: `${activeHits}/${activeRows.length}`,
  activeHitRate: activeRows.length ? activeHits / activeRows.length : null,
  oldExposedRows: oldRows.length,
  oldWrongStillActive: oldWrongStillActive.length,
  rows
}

const markdownRows = rows
  .map((row) =>
    [
      row.oldExposed ? 'old board' : '',
      row.gameTitle,
      row.line,
      row.baseProjectedFirst5,
      row.tailAdjustedFirst5,
      row.side,
      row.actualFirst5Total,
      row.actualSide,
      row.hit === null ? 'pass' : row.hit ? 'hit' : 'miss',
      row.tailShape
    ].join(' | ')
  )
  .join('\n')

const markdown = `# MLB-M2 May 31 F5 Tail Overlay Check

Date: ${date}

This is a replay of May 31 through the current MLB-M2 tail-overlay code. It is retrospective and should be treated as a stress-test artifact, not a clean future backtest.

## Result

- Active F5 total sides: ${report.activeRecord}
- Old exposed F5 O/U rows checked: ${report.oldExposedRows}
- Old wrong rows still active: ${report.oldWrongStillActive}

The fix is not that every game gets a forced side. The fix is that the old bad rows no longer get promoted as clean value. The overlay either moves them into the right heavy-tail side or downgrades them to pass/live-only when both explosion and strand paths are live.

| Old row | Game | Line | Base | Tail adj | New side | Actual | Actual side | Result | Shape |
| --- | --- | ---: | ---: | ---: | --- | ---: | --- | --- | --- |
${markdownRows}
`

const reportDir = path.join(rootDir, 'models', 'mlb', 'cartridges', 'MLB-M2', 'reports')
const privateDir = path.join(rootDir, 'data-private', 'reports')
fs.mkdirSync(reportDir, { recursive: true })
fs.mkdirSync(privateDir, { recursive: true })
const markdownOut = path.join(reportDir, 'may31-f5-tail-overlay-check-2026-06-01.md')
const jsonOut = path.join(privateDir, 'mlb-m2-may31-f5-tail-overlay-check-2026-06-01.json')
fs.writeFileSync(markdownOut, markdown)
fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2))
console.log(`Wrote ${markdownOut}`)
console.log(`Wrote ${jsonOut}`)

#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const rootDir = path.resolve(path.dirname(__filename), '..', '..')

const DEFAULT_TARGETS = [
  'models/mlb/cartridges/MLB-M2',
  'models/mlb/cartridges/MLB-M0',
  'pipeline/mlb'
]

const ACTIVE_TARGETS = [
  'pipeline/lib/load-mlb-day-games.mjs',
  'models/mlb/run-cartridge.mjs',
  'models/mlb/db/day-games.mjs',
  'models/mlb/db/queries.mjs',
  'models/mlb/db/sqlite.mjs',
  'models/mlb/cartridges/MLB-M2/runner.mjs',
  'models/mlb/cartridges/MLB-M2/workflows/pregame.mjs',
  'models/mlb/cartridges/MLB-M2/workflows/refresh-live-board.mjs',
  'models/mlb/cartridges/MLB-M2/workflows/followup.mjs',
  'models/mlb/cartridges/MLB-M2/workflows/verify-refresh.mjs',
  'models/mlb/cartridges/MLB-M2/lanes/generate-day-files.mjs',
  'models/mlb/cartridges/MLB-M2/lanes/lineups.mjs',
  'models/mlb/cartridges/MLB-M2/lanes/props.mjs',
  'models/mlb/cartridges/MLB-M2/lanes/sides.mjs',
  'models/mlb/cartridges/MLB-M2/lanes/veto.mjs',
  'models/mlb/cartridges/MLB-M2/lanes/home-runs.mjs',
  'models/mlb/cartridges/MLB-M2/lanes/history-journal.mjs',
  'models/mlb/cartridges/MLB-M2/snapshot.mjs',
  'models/mlb/cartridges/MLB-M2/snapshot-run.mjs'
]

const PATTERNS = [
  {
    key: 'legacy_sports_db',
    description: 'Reads legacy shared sports.db instead of sport-specific sql-mlb.db/duck-mlb.duckdb.',
    severity: 'cutover_blocker',
    regex: /sports\.db/g
  },
  {
    key: 'warehouse_cli',
    description: 'Shells into the legacy MLB warehouse CLI instead of a typed DB adapter.',
    severity: 'cutover_blocker',
    regex: /mlb_warehouse\.py/g
  },
  {
    key: 'published_data_input',
    description: 'Uses public/site mirrors as model inputs.',
    severity: 'cutover_blocker',
    regex: /published-data\/slates|published-data['",\s]+slates/g
  },
  {
    key: 'private_prediction_json_input',
    description: 'Uses generated prediction JSON artifacts as model inputs.',
    severity: 'cutover_blocker',
    regex: /data-private\/predictions|data-private['",\s]+predictions/g
  },
  {
    key: 'private_prediction_json_output',
    description: 'Writes generated prediction JSON artifacts as compatibility outputs.',
    severity: 'output_surface',
    regex: null
  },
  {
    key: 'raw_archive_input',
    description: 'Uses raw/archive files directly instead of typed source tables.',
    severity: 'cutover_target',
    regex: /data-private\/raw|data-private['",\s]+raw|data-private\/lineups|data-private['",\s]+lineups|data-private\/odds|data-private['",\s]+odds|data-private\/history|data-private['",\s]+history/g
  },
  {
    key: 'generated_module_input',
    description: 'Uses generated modules/files that should become DB-derived exports.',
    severity: 'cutover_target',
    regex: /\.generated\.|\/generated\/|['",\s]+generated['",\s]|web\/src\/lib\/day-|web['",\s]+src['",\s]+lib['",\s]+day-|mlb-batting-impact-history\.js/g
  },
  {
    key: 'legacy_sqlite_shell',
    description: 'Uses sqlite shell calls, often pointing at legacy DB paths.',
    severity: 'review',
    regex: /execFileSync\(['"]sqlite3['"]|spawnSync\(['"]sqlite3['"]|sqlite3['"],/g
  },
  {
    key: 'db_ready_reference',
    description: 'Already references sport-specific SQLite/DuckDB inputs or the DB-first shared day-game loader.',
    severity: 'db_ready',
    regex: /sql-mlb\.db|duck-mlb\.duckdb|warehouse\/sports\/mlb|loadMlbDayGames/g
  }
]

const CODE_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.py',
  '.md'
])

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    targets: [...DEFAULT_TARGETS],
    report: 'data-migration/reports/mlb_db_input_cutover_audit_2026-06-02.json',
    profile: 'full'
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--target') {
      options.targets.push(args[index + 1])
      index += 1
    } else if (arg === '--targets') {
      options.targets = String(args[index + 1] || '').split(',').filter(Boolean)
      index += 1
    } else if (arg === '--report') {
      options.report = args[index + 1]
      index += 1
    } else if (arg === '--profile') {
      options.profile = args[index + 1]
      if (options.profile === 'active') {
        options.targets = [...ACTIVE_TARGETS]
      }
      index += 1
    }
  }
  return options
}

function walk(relativePath) {
  const absolute = path.resolve(rootDir, relativePath)
  if (!fs.existsSync(absolute)) return []
  const stat = fs.statSync(absolute)
  if (stat.isFile()) return [absolute]
  const files = []
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const child = path.join(absolute, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(path.relative(rootDir, child)))
    } else if (CODE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(child)
    }
  }
  return files
}

function lineNumberForOffset(text, offset) {
  let line = 1
  for (let index = 0; index < offset; index += 1) {
    if (text.charCodeAt(index) === 10) line += 1
  }
  return line
}

function lineContextForOffset(text, offset, radius = 5) {
  const lineNumber = lineNumberForOffset(text, offset)
  const lines = text.split('\n')
  const start = Math.max(0, lineNumber - radius - 1)
  const end = Math.min(lines.length, lineNumber + radius)
  return lines.slice(start, end).join('\n')
}

function normalizeHit(pattern, text, offset) {
  if (pattern.key !== 'private_prediction_json_input') return pattern
  const context = lineContextForOffset(text, offset)
  if (/(?:options\.)?(?:legacyOut|moduleOut|out)\s*(?:\|\|=|:)\s*path\.join/.test(context)) {
    return {
      key: 'private_prediction_json_output',
      severity: 'output_surface'
    }
  }
  return pattern
}

function auditFile(absolutePath) {
  const relativePath = path.relative(rootDir, absolutePath)
  const text = fs.readFileSync(absolutePath, 'utf8')
  const hits = []
  for (const pattern of PATTERNS) {
    if (!pattern.regex) continue
    pattern.regex.lastIndex = 0
    let match
    while ((match = pattern.regex.exec(text)) !== null) {
      const normalized = normalizeHit(pattern, text, match.index)
      hits.push({
        key: normalized.key,
        severity: normalized.severity,
        line: lineNumberForOffset(text, match.index),
        match: match[0]
      })
    }
  }
  if (!hits.length) return null
  return { path: relativePath, hits }
}

function summarize(files) {
  const byPattern = Object.fromEntries(PATTERNS.map((pattern) => [pattern.key, {
    description: pattern.description,
    severity: pattern.severity,
    files: 0,
    hits: 0
  }]))
  const byFile = []
  for (const file of files) {
    const counts = {}
    for (const hit of file.hits) {
      counts[hit.key] = (counts[hit.key] || 0) + 1
    }
    for (const [key, count] of Object.entries(counts)) {
      byPattern[key].files += 1
      byPattern[key].hits += count
    }
    byFile.push({
      path: file.path,
      total_hits: file.hits.length,
      counts
    })
  }
  byFile.sort((a, b) => b.total_hits - a.total_hits || a.path.localeCompare(b.path))
  return { byPattern, byFile }
}

const options = parseArgs()
const scannedFiles = [...new Set(options.targets.flatMap(walk))].sort()
const files = scannedFiles.map(auditFile).filter(Boolean)
const report = {
  generated_at: new Date().toISOString(),
  script: 'data-migration/scripts/audit_mlb_db_input_cutover.mjs',
  profile: options.profile,
  targets: options.targets,
  scanned_file_count: scannedFiles.length,
  files_with_hits: files.length,
  summary: summarize(files),
  files
}

const reportPath = path.resolve(rootDir, options.report)
fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))

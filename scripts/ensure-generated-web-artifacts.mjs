import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const webLibDir = path.join(rootDir, 'web', 'src', 'lib')
const mlbGeneratedDir = path.join(rootDir, 'models', 'mlb', 'cartridges', 'MLB-M0', 'generated')

const ensureFile = async (filePath, source) => {
  try {
    await fs.access(filePath)
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, source, 'utf8')
    console.log(`Seeded missing generated artifact -> ${filePath}`)
  }
}

await ensureFile(
  path.join(mlbGeneratedDir, 'mlb-prop-calibration.generated.js'),
  `export const mlbPropCalibration = {
  overallByType: {},
  byTeamAndType: {},
  byReasonTagAndType: {},
  byScriptTagAndType: {},
  byStoryTagAndType: {}
}\n`
)

await ensureFile(
  path.join(webLibDir, 'mlb-prop-calibration.generated.js'),
  "export { mlbPropCalibration } from '../../../models/mlb/cartridges/MLB-M0/generated/mlb-prop-calibration.generated.js'\n"
)

await ensureFile(
  path.join(webLibDir, 'history-prop-performance.generated.ts'),
  `export type PropSummary = {
  hits: number
  total: number
  hitRate: number | null
}

export type DailyPropSummary = {
  overall: PropSummary
  byType: Record<string, PropSummary>
  topHits: string[]
  topMisses: string[]
}

export const mlbPropPerformanceByDate: Record<string, DailyPropSummary> = {}\n`
)

await ensureFile(
  path.join(webLibDir, 'kalshi-mlb-markets.generated.json'),
  `{
  "source": "Kalshi external API",
  "fetchedAt": null,
  "dates": {}
}
`
)

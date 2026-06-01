import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..')

execFileSync(
  'node',
  [path.join(rootDir, 'models', 'mlb', 'run-cartridge.mjs'), '--entry', 'pregame', ...process.argv.slice(2)],
  { cwd: rootDir, stdio: 'inherit' }
)

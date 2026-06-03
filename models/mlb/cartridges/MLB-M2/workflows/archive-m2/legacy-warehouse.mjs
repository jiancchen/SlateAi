import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const runLegacyM2Warehouse = (rootDir, command, extraArgs = []) => {
  console.warn(`[MLB-M2 legacy warehouse] ${command} remains M2-only; not part of the MLB-M3 typed ingestion surface.`)
  execFileSync('python3', [path.join(rootDir, 'pipeline', 'mlb', 'warehouse', 'mlb_warehouse.py'), command, ...extraArgs], {
    cwd: rootDir,
    stdio: 'inherit'
  })
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null
const modulePath = fileURLToPath(import.meta.url)

if (invokedPath === modulePath) {
  const [command, ...extraArgs] = process.argv.slice(2)
  if (!command) {
    console.error('Usage: node models/mlb/cartridges/MLB-M2/workflows/archive-m2/legacy-warehouse.mjs <warehouse-command> [...args]')
    process.exit(2)
  }
  const rootDir = path.resolve(path.dirname(modulePath), '../../../../../..')
  runLegacyM2Warehouse(rootDir, command, extraArgs)
}

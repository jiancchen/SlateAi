import { execFileSync } from 'node:child_process'
import path from 'node:path'

export const runLegacyM2Warehouse = (rootDir, command, extraArgs = []) => {
  console.warn(`[MLB-M2 legacy warehouse] ${command} remains M2-only; not part of the MLB-M3 typed ingestion surface.`)
  execFileSync('python3', [path.join(rootDir, 'pipeline', 'mlb', 'warehouse', 'mlb_warehouse.py'), command, ...extraArgs], {
    cwd: rootDir,
    stdio: 'inherit'
  })
}

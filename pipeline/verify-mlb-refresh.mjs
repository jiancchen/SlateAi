import { spawn } from 'node:child_process'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dirname, '..')
const workflow = path.join(rootDir, 'pipeline', 'mlb', 'workflows', 'verify-refresh.mjs')

const child = spawn(process.execPath, [workflow, ...process.argv.slice(2)], {
  cwd: rootDir,
  stdio: 'inherit'
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exitCode = code ?? 1
})

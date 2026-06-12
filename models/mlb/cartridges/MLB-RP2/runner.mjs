import { spawn } from 'node:child_process'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dirname, '..', '..', '..', '..')
const runner = path.join(rootDir, 'scripts', 'build-mlb-relief-projections-v1.mjs')
const args = process.argv.slice(2)

const child = spawn(process.execPath, [runner, ...args], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, MLB_MODEL_ID: 'MLB-RP2' }
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exitCode = code ?? 1
})

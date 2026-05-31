import { spawn } from 'node:child_process'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dirname, '..')
const target = path.join(rootDir, 'pipeline', 'tennis', 'publish', 'generate-day-module.mjs')

const child = spawn(process.execPath, [target, ...process.argv.slice(2)], {
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

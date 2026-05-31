import { spawn } from 'node:child_process'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dirname, '..', '..', '..')
const generator = path.join(rootDir, 'pipeline', 'generate-tennis-day-module.mjs')
const args = process.argv.slice(2)

if (!args.includes('--model')) {
  args.unshift('T0')
  args.unshift('--model')
}

const child = spawn(process.execPath, [generator, ...args], {
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

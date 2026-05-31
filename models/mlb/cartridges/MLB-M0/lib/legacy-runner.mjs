import { spawn } from 'node:child_process'
import path from 'node:path'

export const rootDir = path.resolve(import.meta.dirname, '..', '..', '..', '..', '..')

export const runLegacyNode = (relativePath, args = []) => {
  const scriptPath = path.join(rootDir, relativePath)
  const child = spawn(process.execPath, [scriptPath, ...args], {
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
}

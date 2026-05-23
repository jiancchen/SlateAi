import { spawn } from 'node:child_process'

const root = process.cwd()
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const children = []

const spawnNamed = (label, args) => {
  const child = spawn(npmCommand, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      stopAll(signal)
      return
    }
    if (code && code !== 0) {
      console.error(`[${label}] exited with code ${code}`)
      stopAll('SIGTERM')
      process.exitCode = code
    }
  })

  children.push(child)
  return child
}

const stopAll = (signal = 'SIGTERM') => {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal)
    }
  }
}

process.on('SIGINT', () => {
  stopAll('SIGINT')
  process.exit(130)
})

process.on('SIGTERM', () => {
  stopAll('SIGTERM')
  process.exit(143)
})

spawnNamed('api', ['run', 'dev:api'])
spawnNamed('web', ['run', 'dev:web'])

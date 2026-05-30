import { spawn } from 'node:child_process'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')

const argValue = (name) => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : ''
}

const run = (label, command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? root,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...(options.env ?? {})
      }
    })

    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${label} stopped by ${signal}`))
        return
      }
      if (code) {
        reject(new Error(`${label} failed with exit code ${code}`))
        return
      }
      resolve()
    })
  })

const main = async () => {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const vercelCommand = process.platform === 'win32' ? 'vercel.cmd' : 'vercel'
  const webRoot = path.join(root, 'web')
  const requestedDate = argValue('--date')
  const extraDates = argValue('--include-dates')
  const env = {
    ...(requestedDate ? { PUBLIC_SLATE_DATE: requestedDate } : {}),
    ...(extraDates ? { PUBLIC_EXTRA_SLATE_DATES: extraDates } : {})
  }

  await run('public build', npmCommand, ['run', 'build'], { env })
  await run('vercel production deploy', vercelCommand, ['--prod', '--force'], { cwd: webRoot })
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})

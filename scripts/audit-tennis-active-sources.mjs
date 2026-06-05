import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const blockedPattern = /flashscore|sofascore|tennistonic|tennis[_\s-]*tonic/i

const argValue = (name) => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : ''
}

const walkFiles = async (dir) => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = []
    for (const entry of entries) {
      if (entry.name === '.DS_Store') continue
      const child = path.join(dir, entry.name)
      if (entry.isDirectory()) files.push(...await walkFiles(child))
      else if (entry.isFile()) files.push(child)
    }
    return files
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

const scanTextFiles = async (paths) => {
  const leaks = []
  for (const target of paths) {
    const absolute = path.resolve(root, target)
    if (!fsSync.existsSync(absolute)) continue
    const files = fsSync.statSync(absolute).isDirectory()
      ? await walkFiles(absolute)
      : [absolute]
    for (const file of files.filter((item) => /\.(json|js|txt)$/i.test(item))) {
      const text = await fs.readFile(file, 'utf8')
      const match = blockedPattern.exec(text)
      if (!match) continue
      const start = Math.max(0, match.index - 80)
      const end = Math.min(text.length, match.index + match[0].length + 80)
      leaks.push({
        file: path.relative(root, file),
        snippet: text.slice(start, end).replace(/\s+/g, ' ')
      })
    }
  }
  return leaks
}

const collectGames = async (date) => {
  const modulePath = path.join(root, 'web', 'src', 'lib', `day-${date}.js`)
  if (!fsSync.existsSync(modulePath)) return []
  const mod = await import(`${pathToFileURL(modulePath).href}?audit=${Date.now()}`)
  return Array.isArray(mod.games) ? mod.games : []
}

const currentSlateId = async () => {
  try {
    const payload = JSON.parse(await fs.readFile(path.join(root, 'web', 'public', 'data', 'meta.json'), 'utf8'))
    return payload?.currentSlate?.id || ''
  } catch {
    return ''
  }
}

const findSourceProblems = (value, pathParts = []) => {
  const problems = []
  if (value == null) return problems
  if (typeof value === 'string') {
    if (blockedPattern.test(value)) problems.push({ path: pathParts.join('.'), value })
    return problems
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => problems.push(...findSourceProblems(item, [...pathParts, String(index)])))
    return problems
  }
  if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      problems.push(...findSourceProblems(nested, [...pathParts, key]))
    }
  }
  return problems
}

const main = async () => {
  const date = argValue('--date')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Pass --date YYYY-MM-DD')

  const targets = [
    `web/src/lib/day-${date}.js`,
    `web/src/lib/day-${date}-tennis-warehouse-context.generated.json`,
    `published-data/slates/${date}`,
    `web/public/data/slates/${date}`
  ]
  if (await currentSlateId() === date) targets.push('web/public/data/current')
  const textLeaks = await scanTextFiles(targets)
  const games = await collectGames(date)
  const structuralLeaks = findSourceProblems({ games }).slice(0, 20)

  if (textLeaks.length || structuralLeaks.length) {
    console.error(`Tennis active-source audit failed for ${date}`)
    for (const leak of textLeaks.slice(0, 12)) {
      console.error(`- ${leak.file}: ...${leak.snippet}...`)
    }
    for (const leak of structuralLeaks) {
      console.error(`- games.${leak.path}: ${leak.value}`)
    }
    process.exit(1)
  }

  console.log(JSON.stringify({
    status: 'passed',
    date,
    games: games.length,
    scannedTargets: targets.filter((target) => fsSync.existsSync(path.resolve(root, target))),
    rule: 'active tennis artifacts contain no blocked legacy source references'
  }, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})

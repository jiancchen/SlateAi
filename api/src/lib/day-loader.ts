import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { publishedDataRoot, webLibRoot } from './paths.js'

export type SlateManifestEntry = {
  id: string
  label: string
  status: 'ready' | 'draft'
  slateMeta: {
    date: string
    isoDate: string
  }
  summary: {
    totalGames: number
  }
}

export type LoadedSlateDay = SlateManifestEntry & {
  filters: string[]
  oddsMeta: Record<string, unknown>
  games: Record<string, unknown>[]
  sources: Array<Record<string, unknown>>
}

const mainDayPattern = /^day-(\d{4}-\d{2}-\d{2})\.js$/
const slatesRoot = path.join(publishedDataRoot, 'slates')
const slateIndexPath = path.join(slatesRoot, 'index.json')
const slateSummaryPath = (id: string) => path.join(slatesRoot, id, 'summary.json')
const slateGamePath = (id: string, gameId: string) => path.join(slatesRoot, id, 'games', `${gameId}.json`)

const formatDateLabel = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  const label = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  })
  return label
}

const readJsonIfPresent = <T>(filePath: string): T | null => {
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

const listMainDayFiles = () =>
  fs
    .readdirSync(webLibRoot)
    .map((fileName) => {
      const match = fileName.match(mainDayPattern)
      return match ? { fileName, id: match[1] } : null
    })
    .filter((entry): entry is { fileName: string; id: string } => Boolean(entry))
    .sort((left, right) => left.id.localeCompare(right.id))

export const listSlateManifestFromModules = async (): Promise<SlateManifestEntry[]> => {
  const entries = listMainDayFiles()

  const results = await Promise.all(
    entries.map(async ({ id, fileName }) => {
      const module = await import(`${pathToFileURL(path.join(webLibRoot, fileName)).href}?t=${Date.now()}`)
      const games = Array.isArray(module.games) ? module.games : []
      const slateMeta = module.slateMeta ?? { date: formatDateLabel(id), isoDate: id }

      return {
        id,
        label: slateMeta.date ?? formatDateLabel(id),
        status: 'ready' as const,
        slateMeta: {
          date: slateMeta.date ?? formatDateLabel(id),
          isoDate: slateMeta.isoDate ?? id
        },
        summary: {
          totalGames: games.length
        }
      }
    })
  )

  return results
}

export const loadSlateDayFromModules = async (id: string): Promise<LoadedSlateDay> => {
  const modulePath = path.join(webLibRoot, `day-${id}.js`)

  if (!fs.existsSync(modulePath)) {
    throw new Error(`No day module found for ${id}`)
  }

  const module = await import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`)
  const games = Array.isArray(module.games) ? module.games : []
  const slateMeta = module.slateMeta ?? { date: formatDateLabel(id), isoDate: id }

  return {
    id,
    label: slateMeta.date ?? formatDateLabel(id),
    status: 'ready',
    slateMeta: {
      date: slateMeta.date ?? formatDateLabel(id),
      isoDate: slateMeta.isoDate ?? id
    },
    summary: {
      totalGames: games.length
    },
    filters: Array.isArray(module.filters) ? module.filters : ['All'],
    oddsMeta: module.oddsMeta ?? {},
    games,
    sources: Array.isArray(module.sources) ? module.sources : []
  }
}

export const listSlateManifest = async (): Promise<SlateManifestEntry[]> => {
  const published = readJsonIfPresent<SlateManifestEntry[]>(slateIndexPath)
  if (published?.length) return published
  return listSlateManifestFromModules()
}

export const loadSlateDay = async (id: string): Promise<LoadedSlateDay> => {
  const published =
    readJsonIfPresent<LoadedSlateDay>(slateSummaryPath(id)) ??
    readJsonIfPresent<LoadedSlateDay>(path.join(slatesRoot, `${id}.json`))
  if (published) return published
  return loadSlateDayFromModules(id)
}

export const loadSlateGameDetail = async (id: string, gameId: string): Promise<Record<string, unknown>> => {
  const published = readJsonIfPresent<Record<string, unknown>>(slateGamePath(id, gameId))
  if (published) return published

  const day = await loadSlateDayFromModules(id)
  const game = day.games.find((entry) => entry?.id === gameId)
  if (!game) {
    throw new Error(`No game detail found for ${id}/${gameId}`)
  }
  return game
}

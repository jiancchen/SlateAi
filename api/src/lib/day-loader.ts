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
const splitMlbDayPattern = /^day-(\d{4}-\d{2}-\d{2})-data\.js$/
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

const listSplitMlbDayIds = () => {
  const wrappedDayIds = new Set(listMainDayFiles().map((entry) => entry.id))

  return fs
    .readdirSync(webLibRoot)
    .map((fileName) => {
      const match = fileName.match(splitMlbDayPattern)
      if (!match) return null
      const id = match[1]
      return wrappedDayIds.has(id) ? null : id
    })
    .filter((id): id is string => Boolean(id))
    .sort((left, right) => left.localeCompare(right))
}

const loadSplitMlbDayGames = async (id: string): Promise<Record<string, unknown>[]> => {
  const loaderModulePath = path.join(webLibRoot, '..', '..', '..', 'pipeline', 'lib', 'load-mlb-day-games.mjs')
  const loaderModule = (await import(`${pathToFileURL(loaderModulePath).href}?t=${Date.now()}`)) as {
    loadMlbDayGames?: (date: string) => Promise<Record<string, unknown>[]>
  }

  if (typeof loaderModule.loadMlbDayGames !== 'function') {
    throw new Error('Fresh MLB day loader is unavailable')
  }

  return loaderModule.loadMlbDayGames(id)
}

export const listSlateManifestFromModules = async (): Promise<SlateManifestEntry[]> => {
  const wrappedEntries = listMainDayFiles()

  const wrappedResults = await Promise.all(
    wrappedEntries.map(async ({ id, fileName }) => {
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

  const splitResults = await Promise.all(
    listSplitMlbDayIds().map(async (id) => ({
      id,
      label: formatDateLabel(id),
      status: 'ready' as const,
      slateMeta: {
        date: formatDateLabel(id),
        isoDate: id
      },
      summary: {
        totalGames: (await loadSplitMlbDayGames(id)).length
      }
    }))
  )

  return [...wrappedResults, ...splitResults].sort((left, right) => left.id.localeCompare(right.id))
}

export const loadSlateDayFromModules = async (id: string): Promise<LoadedSlateDay> => {
  const modulePath = path.join(webLibRoot, `day-${id}.js`)

  if (fs.existsSync(modulePath)) {
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

  const splitDataModulePath = path.join(webLibRoot, `day-${id}-data.js`)
  if (fs.existsSync(splitDataModulePath)) {
    const games = await loadSplitMlbDayGames(id)

    return {
      id,
      label: formatDateLabel(id),
      status: 'ready',
      slateMeta: {
        date: formatDateLabel(id),
        isoDate: id
      },
      summary: {
        totalGames: games.length
      },
      filters: ['All', 'MLB'],
      oddsMeta: {},
      games,
      sources: []
    }
  }

  throw new Error(`No day module found for ${id}`)
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

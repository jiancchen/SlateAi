import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { webLibRoot } from './paths.js'

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

const listMainDayFiles = () =>
  fs
    .readdirSync(webLibRoot)
    .map((fileName) => {
      const match = fileName.match(mainDayPattern)
      return match ? { fileName, id: match[1] } : null
    })
    .filter((entry): entry is { fileName: string; id: string } => Boolean(entry))
    .sort((left, right) => left.id.localeCompare(right.id))

export const listSlateManifest = async (): Promise<SlateManifestEntry[]> => {
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

export const loadSlateDay = async (id: string): Promise<LoadedSlateDay> => {
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

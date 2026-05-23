import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { publishedDataRoot, webLibRoot } from './paths.js'

const historyRoot = path.join(publishedDataRoot, 'history')
const storiesRoot = path.join(publishedDataRoot, 'stories')
const storySummaryPath = (date: string) => path.join(storiesRoot, date, 'summary.json')
const storyGamePath = (date: string, gamePk: string | number) => path.join(storiesRoot, date, 'games', `${gamePk}.json`)

const loadModule = async <T>(fileName: string, exportName: string): Promise<T> => {
  const modulePath = path.join(webLibRoot, fileName)
  const module = await import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`)
  return module[exportName] as T
}

const readJsonIfPresent = <T>(filePath: string): T | null => {
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

export const loadHistoryArchiveFromModules = async () =>
  loadModule<Array<Record<string, unknown>>>('history-archive.ts', 'historyArchive')

export const loadStoryArchiveFromModules = async () =>
  loadModule<Array<Record<string, unknown>>>('story-archive.generated.ts', 'storyArchive')

const summarizeStoryDay = (day: Record<string, any>) => ({
  id: String(day.id),
  date: String(day.date),
  headline: String(day.headline),
  metrics: (day.metrics ?? {}) as Record<string, number>,
  games: Array.isArray(day.games)
    ? day.games.map((game) => {
        const summary = { ...(game as Record<string, unknown>) }
        delete summary.timeline
        return summary
      })
    : []
})

export const loadHistoryArchive = async () =>
  readJsonIfPresent<Array<Record<string, unknown>>>(path.join(historyRoot, 'index.json')) ?? loadHistoryArchiveFromModules()

export const loadHistoryEntry = async (date: string) =>
  readJsonIfPresent<Record<string, unknown>>(path.join(historyRoot, `${date}.json`))

export type StoryArchiveIndexEntry = {
  id: string
  date: string
  headline: string
  metrics: Record<string, number>
  games: number
}

export const loadStoryIndex = async (): Promise<StoryArchiveIndexEntry[]> => {
  const published = readJsonIfPresent<StoryArchiveIndexEntry[]>(path.join(storiesRoot, 'index.json'))
  if (published?.length) return published

  const archive = await loadStoryArchiveFromModules()
  return archive.map((day) => ({
    id: String(day.id),
    date: String(day.date),
    headline: String(day.headline),
    metrics: (day.metrics ?? {}) as Record<string, number>,
    games: Array.isArray(day.games) ? day.games.length : 0
  }))
}

export const loadStoryDay = async (date: string) => {
  const nested = readJsonIfPresent<Record<string, unknown>>(storySummaryPath(date))
  if (nested) return nested
  return readJsonIfPresent<Record<string, unknown>>(path.join(storiesRoot, `${date}.json`))
}

export const loadStoryDayWithFallback = async (date: string) => {
  const published = await loadStoryDay(date)
  if (published) return published

  const archive = await loadStoryArchiveFromModules()
  const day = archive.find((item) => String(item.id) === date)
  return day ? summarizeStoryDay(day as Record<string, any>) : null
}

export const loadStoryGame = async (date: string, gamePk: string | number) =>
  readJsonIfPresent<Record<string, unknown>>(storyGamePath(date, gamePk))

export const loadStoryGameWithFallback = async (date: string, gamePk: string | number) => {
  const published = await loadStoryGame(date, gamePk)
  if (published) return published

  const archive = await loadStoryArchiveFromModules()
  const day = archive.find((item) => String(item.id) === date)
  const game = (day as Record<string, any> | undefined)?.games?.find?.(
    (entry: Record<string, unknown>) => String(entry.gamePk) === String(gamePk)
  )
  return (game as Record<string, unknown>) ?? null
}

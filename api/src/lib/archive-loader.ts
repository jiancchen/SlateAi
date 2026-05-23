import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { publishedDataRoot, webLibRoot } from './paths.js'

const historyRoot = path.join(publishedDataRoot, 'history')
const storiesRoot = path.join(publishedDataRoot, 'stories')

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

export const loadStoryDay = async (date: string) =>
  readJsonIfPresent<Record<string, unknown>>(path.join(storiesRoot, `${date}.json`))

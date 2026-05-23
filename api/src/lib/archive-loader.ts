import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { webLibRoot } from './paths.js'

const loadModule = async <T>(fileName: string, exportName: string): Promise<T> => {
  const modulePath = path.join(webLibRoot, fileName)
  const module = await import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`)
  return module[exportName] as T
}

export const loadHistoryArchive = async () =>
  loadModule<Array<Record<string, unknown>>>('history-archive.ts', 'historyArchive')

export const loadStoryArchive = async () =>
  loadModule<Array<Record<string, unknown>>>('story-archive.generated.ts', 'storyArchive')

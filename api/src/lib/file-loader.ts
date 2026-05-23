import fs from 'node:fs/promises'
import path from 'node:path'
import { dataPrivateRoot } from './paths.js'

const readJsonFile = async <T>(filePath: string): Promise<T> => {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw) as T
}

export const loadMlbHomeRunBoard = async (date: string) =>
  readJsonFile<Record<string, unknown>>(path.join(dataPrivateRoot, 'predictions', 'mlb-home-runs', `${date}-statcast-prototype.json`))

export const loadMlbPlayerProps = async (date: string) =>
  readJsonFile<Record<string, unknown>>(path.join(dataPrivateRoot, 'predictions', 'mlb-player-props', `${date}-player-props.json`))

export const loadMlbLineupBoard = async (date: string) =>
  readJsonFile<Record<string, unknown>>(path.join(dataPrivateRoot, 'lineups', 'mlb', `${date}-lineup-board.json`))

import { execFileSync } from 'node:child_process'
import { warehousePath } from './paths.js'

export const runSqliteJson = <T>(sql: string): T[] => {
  const raw = execFileSync('sqlite3', ['-json', warehousePath, sql], {
    encoding: 'utf8'
  }).trim()

  if (!raw) return []

  return JSON.parse(raw) as T[]
}

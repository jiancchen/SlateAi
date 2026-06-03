import { execFileSync } from 'node:child_process'
import { legacyWarehousePath, mlbWarehousePath } from './paths.js'

const runSqliteJsonAt = <T>(dbPath: string, sql: string): T[] => {
  const raw = execFileSync('sqlite3', ['-json', dbPath, sql], {
    encoding: 'utf8'
  }).trim()

  if (!raw) return []

  return JSON.parse(raw) as T[]
}

export const runLegacySqliteJson = <T>(sql: string): T[] => runSqliteJsonAt<T>(legacyWarehousePath, sql)

export const runMlbSqliteJson = <T>(sql: string): T[] => runSqliteJsonAt<T>(mlbWarehousePath, sql)

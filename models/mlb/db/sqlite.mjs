import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const rootDir = path.resolve(path.dirname(__filename), '..', '..', '..')

export const mlbSqlitePath = path.join(rootDir, 'data-private', 'warehouse', 'sports', 'mlb', 'sql-mlb.db')
export const mlbDuckDbPath = path.join(rootDir, 'data-private', 'warehouse', 'analytics', 'duck-mlb.duckdb')

export const sqlValue = (value) => {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? '1' : '0'
  return `'${String(value).replaceAll("'", "''")}'`
}

export const bindSql = (sql, params = []) => {
  let index = 0
  return sql.replace(/\?/g, () => {
    if (index >= params.length) {
      throw new Error(`Missing SQL bind value for placeholder ${index + 1}`)
    }
    const value = sqlValue(params[index])
    index += 1
    return value
  })
}

export const querySqlite = (sql, params = [], options = {}) => {
  const dbPath = options.dbPath || mlbSqlitePath
  const boundSql = bindSql(sql, params)
  const raw = execFileSync('sqlite3', ['-json', dbPath, boundSql], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: options.maxBuffer || 1024 * 1024 * 20
  }).trim()
  if (!raw) return []
  return JSON.parse(raw)
}

export const queryOneSqlite = (sql, params = [], options = {}) => {
  return querySqlite(sql, params, options)[0] || null
}

export const sqliteTableCount = (tableName, options = {}) => {
  const safeName = String(tableName).replace(/[^a-zA-Z0-9_]/g, '')
  if (!safeName) throw new Error('Invalid table name')
  const row = queryOneSqlite(`select count(*) as count from ${safeName}`, [], options)
  return Number(row?.count || 0)
}


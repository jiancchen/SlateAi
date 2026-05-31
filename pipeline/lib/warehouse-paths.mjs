import path from 'node:path'

export const rootDir = path.resolve(import.meta.dirname, '..', '..')
export const warehouseDir = path.join(rootDir, 'data-private', 'warehouse')
export const sportsDbPath = path.join(warehouseDir, 'sports.db')

const envPath = (name) => {
  const value = process.env[name]
  return value ? path.resolve(value) : null
}

export const warehousePathForSport = (sport = 'shared') => {
  const sportKey = String(sport).toUpperCase().replace(/[^A-Z0-9_]+/g, '')
  return envPath(`SLATE_${sportKey}_WAREHOUSE_DB`) || envPath('SLATE_WAREHOUSE_DB') || sportsDbPath
}

export const tennisWarehousePath = () => warehousePathForSport('tennis')
export const mlbWarehousePath = () => warehousePathForSport('mlb')

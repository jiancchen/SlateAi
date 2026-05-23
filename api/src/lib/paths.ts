import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const repoRoot = path.resolve(currentDir, '../../..')
export const webRoot = path.join(repoRoot, 'web')
export const webLibRoot = path.join(webRoot, 'src', 'lib')
export const dataPrivateRoot = path.join(repoRoot, 'data-private')
export const warehousePath = path.join(dataPrivateRoot, 'warehouse', 'sports.db')

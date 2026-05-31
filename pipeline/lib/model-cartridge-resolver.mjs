import fs from 'node:fs/promises'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dirname, '..', '..')

const exists = async (relativePath) => {
  try {
    await fs.access(path.resolve(rootDir, relativePath))
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

export const tennisCartridgeDirCandidates = (modelId) => {
  const safeModelId = String(modelId || '').replace(/[^a-z0-9_-]/gi, '')
  if (!safeModelId) return []
  return [
    `models/tennis/cartridges/${safeModelId}`
  ]
}

export const resolveTennisCartridgeDir = async ({ modelId, requiredFile = 'manifest.json' } = {}) => {
  for (const dir of tennisCartridgeDirCandidates(modelId)) {
    const probe = requiredFile ? `${dir}/${requiredFile}` : dir
    if (await exists(probe)) return { dir, source: 'models' }
  }
  throw new Error(`Unable to resolve tennis model cartridge ${modelId || ''}`)
}

export const resolveTennisCartridgeFile = async ({ modelId, fileName }) => {
  const cartridge = await resolveTennisCartridgeDir({ modelId, requiredFile: fileName })
  return {
    ...cartridge,
    path: `${cartridge.dir}/${fileName}`
  }
}

import registry from './registry.json' with { type: 'json' }
import * as MLBM0 from './cartridges/MLB-M0/lib/sports-model.js'

const normalizeModelId = (value) => {
  const normalized = String(value || '').trim().toUpperCase()
  if (/^M\d+$/.test(normalized)) return `MLB-${normalized}`
  if (/^RP\d+$/.test(normalized)) return `MLB-${normalized}`
  return normalized
}

const mlbAppAdapters = {
  'MLB-M0': MLBM0
}

export const activeMlbAppModelId = normalizeModelId(
  registry.active?.model || registry.activeModelId || 'MLB-M0'
)

export const registeredMlbAppModelIds = Object.freeze(Object.keys(mlbAppAdapters))

export const resolveMlbAppAdapter = (modelId = activeMlbAppModelId) => {
  const normalized = normalizeModelId(modelId) || activeMlbAppModelId
  const adapter = mlbAppAdapters[normalized]
  if (!adapter) {
    throw new Error(
      `No MLB app adapter registered for ${normalized}. Add it to models/mlb/app-model.js before activating that cartridge.`
    )
  }
  return adapter
}

export const createSportsMatchModel = (...args) =>
  resolveMlbAppAdapter().createSportsMatchModel(...args)

export const simulateMlbGame = (...args) =>
  resolveMlbAppAdapter().simulateMlbGame(...args)

export const rankAnalysisPicks = (...args) =>
  resolveMlbAppAdapter().rankAnalysisPicks(...args)

export const rankEfficientFavoritePicks = (...args) =>
  resolveMlbAppAdapter().rankEfficientFavoritePicks(...args)

export const rankFlipRiskPicks = (...args) =>
  resolveMlbAppAdapter().rankFlipRiskPicks(...args)

export const buildParlayModel = (...args) =>
  resolveMlbAppAdapter().buildParlayModel(...args)

export const createParlayLeg = (...args) =>
  resolveMlbAppAdapter().createParlayLeg(...args)

export const rankMlbPlayerPropCandidatesLegacy = (...args) =>
  resolveMlbAppAdapter().rankMlbPlayerPropCandidatesLegacy(...args)

export const rankMlbPlayerProps = (...args) =>
  resolveMlbAppAdapter().rankMlbPlayerProps(...args)

export const mlbPropCalibration = resolveMlbAppAdapter().mlbPropCalibration

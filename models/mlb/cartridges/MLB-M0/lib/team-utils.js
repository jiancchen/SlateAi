import { normalizeText } from './core-utils.js'

export const normalizeTeamAlias = (value = '') => {
  const normalized = normalizeText(value)

  if (normalized === 'd backs' || normalized === 'dbacks') return 'diamondbacks'
  if (normalized === 'a s' || normalized === 'as') return 'athletics'

  return normalized
}

export const teamNamesMatch = (left = '', right = '') => normalizeTeamAlias(left) === normalizeTeamAlias(right)

export const findLineupBoardForTeam = (lineupBoard = null, teamName = '') => {
  if (!lineupBoard || !teamName) return null
  if (teamNamesMatch(lineupBoard.away?.teamName, teamName)) return lineupBoard.away
  if (teamNamesMatch(lineupBoard.home?.teamName, teamName)) return lineupBoard.home
  return null
}

export const formatLineupStatusLabel = (status = '') => {
  if (status === 'posted') return 'confirmed lineup'
  if (status === 'partial') return 'partial lineup'
  return 'lineup pending'
}

const normalizeTennisSlug = (value) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const tennistonicPlayerSlugMap = {
  'Pedro Martinez': 'Pedro-Martinez-Portero',
  'Guiomar Maristany Zuleta De Reales': 'Guiomar-Zuleta-De-Reales',
  'Pierre-Hugues Herbert': 'Pierre~Hugues-Herbert'
}

export const lookupTennistonicPlayerSlug = (playerName) =>
  tennistonicPlayerSlugMap[playerName] ?? normalizeTennisSlug(playerName)

export const buildTennistonicH2HUrl = (playerAName, playerBName) =>
  `https://tennistonic.com/head-to-head-compare/${lookupTennistonicPlayerSlug(playerAName)}-Vs-${lookupTennistonicPlayerSlug(playerBName)}/`

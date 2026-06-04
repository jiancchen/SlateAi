const normalizeTennisSlug = (value) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const tennistonicPlayerSlugMap = {
  'Catherine McNally': 'Caty-McNally',
  'Pablo Carreno Busta': 'Pablo-Carreno-Busta',
  'Pedro Martinez': 'Pedro-Martinez-Portero',
  'Diego Dedura-Palomero': 'Diego-Dedura',
  'Wang Xinyu': 'Xinyu-Wang',
  'Wang Xiyu': 'Xiyu-Wang',
  'Yunchaokete Bu': 'Bu-Yunchaokete',
  'Guiomar Maristany Zuleta De Reales': 'Guiomar-Zuleta-De-Reales',
  'Coleman Wong': 'Chak-Lam-Coleman-Wong',
  'Pierre-Hugues Herbert': 'Pierre~Hugues-Herbert'
}

export const lookupTennistonicPlayerSlug = (playerName) =>
  tennistonicPlayerSlugMap[playerName] ?? normalizeTennisSlug(playerName)

export const buildTennistonicH2HUrl = (playerAName, playerBName) =>
  `https://tennistonic.com/head-to-head-compare/${lookupTennistonicPlayerSlug(playerAName)}-Vs-${lookupTennistonicPlayerSlug(playerBName)}/`

export type SlateManifestEntry = {
  id: string
  label: string
  status: 'ready' | 'draft'
  slateMeta: {
    date: string
    isoDate: string
  }
  summary: {
    totalGames: number
  }
}

export type LoadedSlateDay = SlateManifestEntry & {
  filters: string[]
  oddsMeta: Record<string, any>
  games: Record<string, any>[]
  sources: Array<Record<string, any>>
}

export const fallbackSlateDayManifest: SlateManifestEntry[] = [
  { id: '2026-05-09', label: 'May 9, 2026', status: 'ready', slateMeta: { date: 'May 9, 2026', isoDate: '2026-05-09' }, summary: { totalGames: 29 } },
  { id: '2026-05-10', label: 'May 10, 2026', status: 'ready', slateMeta: { date: 'May 10, 2026', isoDate: '2026-05-10' }, summary: { totalGames: 21 } },
  { id: '2026-05-11', label: 'May 11, 2026', status: 'ready', slateMeta: { date: 'May 11, 2026', isoDate: '2026-05-11' }, summary: { totalGames: 8 } },
  { id: '2026-05-12', label: 'May 12, 2026', status: 'ready', slateMeta: { date: 'May 12, 2026', isoDate: '2026-05-12' }, summary: { totalGames: 19 } },
  { id: '2026-05-13', label: 'May 13, 2026', status: 'ready', slateMeta: { date: 'May 13, 2026', isoDate: '2026-05-13' }, summary: { totalGames: 18 } },
  { id: '2026-05-14', label: 'May 14, 2026', status: 'ready', slateMeta: { date: 'May 14, 2026', isoDate: '2026-05-14' }, summary: { totalGames: 13 } },
  { id: '2026-05-15', label: 'May 15, 2026', status: 'ready', slateMeta: { date: 'May 15, 2026', isoDate: '2026-05-15' }, summary: { totalGames: 21 } },
  { id: '2026-05-16', label: 'May 16, 2026', status: 'ready', slateMeta: { date: 'May 16, 2026', isoDate: '2026-05-16' }, summary: { totalGames: 15 } },
  { id: '2026-05-17', label: 'May 17, 2026', status: 'ready', slateMeta: { date: 'May 17, 2026', isoDate: '2026-05-17' }, summary: { totalGames: 20 } },
  { id: '2026-05-18', label: 'May 18, 2026', status: 'ready', slateMeta: { date: 'May 18, 2026', isoDate: '2026-05-18' }, summary: { totalGames: 17 } },
  { id: '2026-05-19', label: 'May 19, 2026', status: 'ready', slateMeta: { date: 'May 19, 2026', isoDate: '2026-05-19' }, summary: { totalGames: 17 } },
  { id: '2026-05-20', label: 'May 20, 2026', status: 'ready', slateMeta: { date: 'May 20, 2026', isoDate: '2026-05-20' }, summary: { totalGames: 13 } },
  { id: '2026-05-21', label: 'May 21, 2026', status: 'ready', slateMeta: { date: 'May 21, 2026', isoDate: '2026-05-21' }, summary: { totalGames: 35 } },
  { id: '2026-05-22', label: 'May 22, 2026', status: 'ready', slateMeta: { date: 'May 22, 2026', isoDate: '2026-05-22' }, summary: { totalGames: 6 } },
  { id: '2026-05-23', label: 'May 23, 2026', status: 'ready', slateMeta: { date: 'May 23, 2026', isoDate: '2026-05-23' }, summary: { totalGames: 14 } },
  { id: '2026-05-24', label: 'May 24, 2026', status: 'ready', slateMeta: { date: 'May 24, 2026', isoDate: '2026-05-24' }, summary: { totalGames: 53 } }
]

const currentLocalIsoDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const latestActiveOrPastSlate = [...fallbackSlateDayManifest]
  .filter((day) => day.id <= currentLocalIsoDate())
  .at(-1)

export const defaultSlateDayId = latestActiveOrPastSlate?.id ?? fallbackSlateDayManifest.at(-1)?.id ?? ''

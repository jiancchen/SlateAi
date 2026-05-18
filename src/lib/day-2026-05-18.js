import { mlbGames, mlbNotes, mlbSources } from './day-2026-05-18-mlb.js'

export const slateMeta = {
  title: 'Monday MLB Desk',
  date: 'May 18, 2026',
  isoDate: '2026-05-18',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A live May 18 MLB slate built from official probable starters, current board pricing, standings, team hit context, bullpen quality, lineup context, and the refreshed home-run lane.',
  notes: [...mlbNotes, 'There are no NBA or WNBA games on the current Monday board, so May 18 stays MLB-only.']
}

export const filters = ['All', 'MLB']

export const oddsMeta = {
  provider: 'Official MLB data + live board snapshots',
  snapshot: 'May 18, 2026, late morning PT',
  note:
    'Pricing comes from the accessible ScoresAndOdds MLB matchup pages, then layers official probable starters, standings, bullpen prep, lineup context, and the May 17 backtest adjustments.'
}

export const sources = [...mlbSources]

export const games = mlbGames

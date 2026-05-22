import { mlbGames, mlbNotes, mlbSources } from './day-2026-05-20-mlb.js'

export const slateMeta = {
  title: 'Wednesday MLB Desk',
  date: 'May 20, 2026',
  isoDate: '2026-05-20',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A live May 20 remaining-games MLB board after the early first pitches, using official league pages, matchup-board pricing, lineup context, and the updated volatility model.',
  notes: [...mlbNotes]
}

export const filters = ['All', 'MLB']

export const oddsMeta = {
  provider: 'Official MLB data + matchup board snapshots',
  snapshot: 'May 20, 2026, 10:13 AM PT remaining-games refresh',
  note:
    'This live desk now stays baseball-first: official probable pitchers, current matchup-board pricing, lineup context, bullpen-chain context, and the updated volatility model.'
}

export const sources = [...mlbSources]

export const games = [...mlbGames]

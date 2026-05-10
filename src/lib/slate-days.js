import {
  filters as dayOneFilters,
  games as dayOneGames,
  oddsMeta as dayOneOddsMeta,
  slateMeta as dayOneSlateMeta,
  sources as dayOneSources
} from './slate.js'
import {
  filters as dayTwoFilters,
  games as dayTwoGames,
  oddsMeta as dayTwoOddsMeta,
  slateMeta as dayTwoSlateMeta,
  sources as dayTwoSources
} from './day-2026-05-10.js'

const deriveFilters = (games, fallbackFilters = ['All']) => {
  const derivedLeagues = [...new Set(games.map((game) => game.league))]

  return derivedLeagues.length > 0 ? ['All', ...derivedLeagues] : fallbackFilters
}

const buildLeagueSummary = (games) => {
  const leagueOrder = ['MLB', 'UFC', 'NBA', 'WNBA']

  return leagueOrder.map((league) => {
    const leagueGames = games.filter((game) => game.league === league)

    return {
      league,
      total: leagueGames.length,
      spotlightCount: leagueGames.filter((game) => game.spotlight).length
    }
  })
}

const createSlateDay = ({
  id,
  label,
  status,
  slateMeta,
  games = [],
  filters = ['All'],
  oddsMeta,
  sources = [],
  intakeChecklist = [],
  intakePrompt = '',
  feedNotes = [],
  archive = {}
}) => ({
  id,
  label,
  status,
  slateMeta,
  games,
  filters: deriveFilters(games, filters),
  oddsMeta,
  sources,
  intakeChecklist,
  intakePrompt,
  feedNotes,
  archive,
  summary: {
    totalGames: games.length,
    moneylineGames: games.filter((game) => game.moneyline?.available).length,
    spotlightGames: games.filter((game) => game.spotlight).length,
    leagueCards: buildLeagueSummary(games)
  }
})

const may9Slate = createSlateDay({
  id: dayOneSlateMeta.isoDate,
  label: 'Day 1',
  status: 'ready',
  slateMeta: dayOneSlateMeta,
  games: dayOneGames,
  filters: dayOneFilters,
  oddsMeta: dayOneOddsMeta,
  sources: dayOneSources,
  intakeChecklist: [
    'Backfill final MLB results once you want the archive side to light up.',
    'Keep late odds snapshots if you want to compare day-one prices to day-two openers.',
    'Add injuries, lineup changes, or late scratches that mattered after lock.'
  ],
  intakePrompt:
    'This is the imported May 9, 2026 board. It is now the baseline archive day we can compare future slates against.',
  feedNotes: [
    'Use this day as the structure reference for future slates.',
    'The model layer already knows how to parse MLB starters and UFC fight descriptors from the game cards.'
  ],
  archive: {
    resultsStored: false,
    leaguesTracked: ['MLB']
  }
})

const may10Slate = createSlateDay({
  id: dayTwoSlateMeta.isoDate,
  label: 'Day 2',
  status: 'ready',
  slateMeta: dayTwoSlateMeta,
  games: dayTwoGames,
  filters: dayTwoFilters,
  oddsMeta: dayTwoOddsMeta,
  sources: dayTwoSources,
  intakeChecklist: [
    'Backfill final scores and winning starters after the games close.',
    'Decide whether you want the automated ingest to persist opening odds, latest odds, or both.',
    'Add run line and total parsing as the next MLB ingest pass.',
    'When you want other leagues on this date, add equally clean schedule sources to daily-games-external.md.'
  ],
  intakePrompt:
    'Day 2 is now a live test-run board built from the source registry. It is ready for postgame results, deeper odds parsing, or expansion into other leagues.',
  feedNotes: [
    'This stored day proves the daybook flow can hydrate a full MLB slate from reusable links.',
    'Official MLB matchup data, standings context, and Statcast park factors were all structured cleanly enough to reuse.',
    'The current automated pass wires moneyline only; run line and total are the next clean extension.'
  ],
  archive: {
    resultsStored: false,
    leaguesTracked: ['MLB']
  }
})

export const slateDays = [may9Slate, may10Slate]
export const defaultSlateDayId = slateDays[0]?.id ?? ''

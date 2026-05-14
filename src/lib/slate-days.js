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
import {
  filters as dayThreeFilters,
  games as dayThreeGames,
  oddsMeta as dayThreeOddsMeta,
  slateMeta as dayThreeSlateMeta,
  sources as dayThreeSources
} from './day-2026-05-11.js'
import {
  filters as dayFourFilters,
  games as dayFourGames,
  oddsMeta as dayFourOddsMeta,
  slateMeta as dayFourSlateMeta,
  sources as dayFourSources
} from './day-2026-05-12.js'
import {
  filters as dayFiveFilters,
  games as dayFiveGames,
  oddsMeta as dayFiveOddsMeta,
  slateMeta as dayFiveSlateMeta,
  sources as dayFiveSources
} from './day-2026-05-13.js'

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
  label: dayOneSlateMeta.date,
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
  label: dayTwoSlateMeta.date,
  status: 'ready',
  slateMeta: dayTwoSlateMeta,
  games: dayTwoGames,
  filters: dayTwoFilters,
  oddsMeta: dayTwoOddsMeta,
  sources: dayTwoSources,
  intakeChecklist: [
    'Backfill final scores and winning starters after the games close.',
    'Decide whether you want the automated ingest to persist opening odds, latest odds, or both.',
    'Keep the NBA series links and WNBA board links in daily-games-external.md if they stay stable.',
    'Add run line and total parsing as the next MLB ingest pass.',
    'Store postgame MLB, NBA, and WNBA results so this day can become a real archive reference.'
  ],
  intakePrompt:
    'May 10 is now a live multi-sport board built from the source registry. It is ready for postgame results, deeper odds parsing, or the next day build.',
  feedNotes: [
    'This stored day now proves the daybook flow can hydrate MLB plus same-day NBA and WNBA markets from reusable links.',
    'Official MLB matchup data, standings context, Statcast park factors, and official NBA playoff box-score PDFs all structured cleanly enough to reuse.',
    'The current automated pass still wires MLB moneyline first; run line and total are the next clean extension.'
  ],
  archive: {
    resultsStored: false,
    leaguesTracked: ['MLB', 'NBA', 'WNBA']
  }
})

const may11Slate = createSlateDay({
  id: dayThreeSlateMeta.isoDate,
  label: dayThreeSlateMeta.date,
  status: 'ready',
  slateMeta: dayThreeSlateMeta,
  games: dayThreeGames,
  filters: dayThreeFilters,
  oddsMeta: dayThreeOddsMeta,
  sources: dayThreeSources,
  intakeChecklist: [
    'Store final MLB results once the board closes so we can compare model edges against outcomes.',
    'Backfill the NBA Game 4 results to keep both playoff series as rolling archives.',
    'Refresh the Angels starter once MLB.com resolves the TBD listing on the official probable-pitchers page.',
    'Add run line and total history if you want to compare opening numbers against the late board.'
  ],
  intakePrompt:
    'May 11 is now the live board. It bakes in the latest MLB probable pitchers, the current market board, and the updated NBA series context.',
  feedNotes: [
    'This is the first day that explicitly tightened MLB favorite confidence after reviewing prior-day results.',
    'The MLB model now raises volatility for favorites entering on losing streaks or for games where the official starter feed and market board are not perfectly aligned.',
    'There was no WNBA board available on the current May 11 refresh, so the stored day is MLB plus NBA only.'
  ],
  archive: {
    resultsStored: false,
    leaguesTracked: ['MLB', 'NBA']
  }
})

const may12Slate = createSlateDay({
  id: dayFourSlateMeta.isoDate,
  label: dayFourSlateMeta.date,
  status: 'ready',
  slateMeta: dayFourSlateMeta,
  games: dayFourGames,
  filters: dayFourFilters,
  oddsMeta: dayFourOddsMeta,
  sources: dayFourSources,
  intakeChecklist: [
    'Store the final MLB results so we can compare the no-lineup-context version of the model against outcomes.',
    'Backfill the Spurs-Timberwolves Game 5 result and keep the series archive rolling if Game 6 is needed.',
    'Refresh BallparkPal or replace it with another daily lineup-context source if the secure checkout wall persists.',
    'Check whether MLB.com ever resolved the Phillies-Red Sox starter listing after the live board had already moved to Bello.'
  ],
  intakePrompt:
    'May 12 is now the live board. It carries the current MLB, NBA, and WNBA slate, with the MLB model intentionally running without lineup-fit data when the usual daily source did not parse cleanly.',
  feedNotes: [
    'This is the first stored day where the MLB model explicitly ran without BallparkPal lineup context because the page redirected to a secure checkout wall.',
    'The day still carries the full standings, offense, bullpen, starter, and park-factor structure, so the model is degraded gracefully instead of guessing.',
    'The NBA side now includes the fourth Spurs-Timberwolves playoff box score and treats the Game 4 ejection context as part of the variance story, not as a clean trend.'
  ],
  archive: {
    resultsStored: false,
    leaguesTracked: ['MLB', 'NBA', 'WNBA']
  }
})

const may13Slate = createSlateDay({
  id: dayFiveSlateMeta.isoDate,
  label: dayFiveSlateMeta.date,
  status: 'ready',
  slateMeta: dayFiveSlateMeta,
  games: dayFiveGames,
  filters: dayFiveFilters,
  oddsMeta: dayFiveOddsMeta,
  sources: dayFiveSources,
  intakeChecklist: [
    'Store the final MLB results so the remaining-games model can be compared against only the pregame opportunities that were still open after midday.',
    'Backfill the Cavaliers-Pistons Game 5 result and keep the series archive rolling if Game 6 is needed.',
    'Keep checking whether BallparkPal is usable again; this is now the second straight day the model had to degrade without lineup-fit inputs.',
    'Review whether the stronger losing-streak and weak-bullpen variance bumps improved the fragile-favorite MLB reads.'
  ],
  intakePrompt:
    'May 13 is now the live remaining-games board. It intentionally starts after the two MLB games that were already in progress at refresh time and keeps the current MLB, NBA, and WNBA action in one place.',
  feedNotes: [
    'This is the first daybook entry that intentionally stores only the still-actionable part of the slate instead of the full morning schedule.',
    'The MLB model got a small variance upgrade here: deeper penalties for favorites on longer skids and for starter-first favorites that still need a weaker bullpen to close.',
    'WNBA is fully back on the board today, but the short-number games are being treated with more caution after the prior days lead volatility.'
  ],
  archive: {
    resultsStored: false,
    leaguesTracked: ['MLB', 'NBA', 'WNBA']
  }
})

export const slateDays = [may9Slate, may10Slate, may11Slate, may12Slate, may13Slate]
export const defaultSlateDayId = slateDays.at(-1)?.id ?? ''

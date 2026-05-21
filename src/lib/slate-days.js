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
import {
  filters as daySixFilters,
  games as daySixGames,
  oddsMeta as daySixOddsMeta,
  slateMeta as daySixSlateMeta,
  sources as daySixSources
} from './day-2026-05-14.js'
import {
  filters as daySevenFilters,
  games as daySevenGames,
  oddsMeta as daySevenOddsMeta,
  slateMeta as daySevenSlateMeta,
  sources as daySevenSources
} from './day-2026-05-15.js'
import {
  filters as dayEightFilters,
  games as dayEightGames,
  oddsMeta as dayEightOddsMeta,
  slateMeta as dayEightSlateMeta,
  sources as dayEightSources
} from './day-2026-05-16.js'
import {
  filters as dayNineFilters,
  games as dayNineGames,
  oddsMeta as dayNineOddsMeta,
  slateMeta as dayNineSlateMeta,
  sources as dayNineSources
} from './day-2026-05-17.js'
import {
  filters as dayTenFilters,
  games as dayTenGames,
  oddsMeta as dayTenOddsMeta,
  slateMeta as dayTenSlateMeta,
  sources as dayTenSources
} from './day-2026-05-18.js'
import {
  filters as dayElevenFilters,
  games as dayElevenGames,
  oddsMeta as dayElevenOddsMeta,
  slateMeta as dayElevenSlateMeta,
  sources as dayElevenSources
} from './day-2026-05-19.js'
import {
  filters as dayTwelveFilters,
  games as dayTwelveGames,
  oddsMeta as dayTwelveOddsMeta,
  slateMeta as dayTwelveSlateMeta,
  sources as dayTwelveSources
} from './day-2026-05-20.js'
import {
  filters as dayThirteenFilters,
  games as dayThirteenGames,
  oddsMeta as dayThirteenOddsMeta,
  slateMeta as dayThirteenSlateMeta,
  sources as dayThirteenSources
} from './day-2026-05-21.js'

const deriveFilters = (games, fallbackFilters = ['All']) => {
  const derivedLeagues = [...new Set(games.map((game) => game.league))]

  return derivedLeagues.length > 0 ? ['All', ...derivedLeagues] : fallbackFilters
}

const buildLeagueSummary = (games) => {
  const leagueOrder = ['MLB', 'Tennis', 'UFC', 'NBA', 'WNBA']

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

const may14Slate = createSlateDay({
  id: daySixSlateMeta.isoDate,
  label: daySixSlateMeta.date,
  status: 'ready',
  slateMeta: daySixSlateMeta,
  games: daySixGames,
  filters: daySixFilters,
  oddsMeta: daySixOddsMeta,
  sources: daySixSources,
  intakeChecklist: [
    'Store the final MLB results so the new projected-hit model can be checked against actual traffic and not just winners.',
    'Review whether the new shallow-sample starter penalties improved the noisy MLB spots from May 13.',
    'Track whether the White Sox, Astros, and Braves contact-quality upgrades were enough to catch the kinds of surface-record traps the old model missed.',
    'Keep the Baseball Savant league page in the source registry because it is now a real daily input, not just a nice-to-have reference.'
  ],
  intakePrompt:
    'May 14 is now the live board. It carries the current MLB and WNBA slate, with the MLB model upgraded to include pitcher archetypes, projected hit edge, and hit-efficiency context.',
  feedNotes: [
    'This is the first stored day where the MLB model explicitly adds projected extra hits and hit efficiency to the read instead of leaning only on market, starter ERA, and team hits per game.',
    'The May 13 review is baked into this slate: shallow-starter penalties are stronger, and better underlying contact teams can push back on cleaner-looking favorites.',
    'There is no NBA game on the official May 14 schedule, so the daybook deliberately stays focused on the sports that actually have actionable boards.'
  ],
  archive: {
    resultsStored: false,
    leaguesTracked: ['MLB', 'WNBA']
  }
})

const may15Slate = createSlateDay({
  id: daySevenSlateMeta.isoDate,
  label: daySevenSlateMeta.date,
  status: 'ready',
  slateMeta: daySevenSlateMeta,
  games: daySevenGames,
  filters: daySevenFilters,
  oddsMeta: daySevenOddsMeta,
  sources: daySevenSources,
  intakeChecklist: [
    'Store the final MLB results so the projected-hit edge and hit-efficiency layer can be checked against actual traffic, not just winners.',
    'Review whether the Dodgers-style favorite caution and bullpen-volatility penalties improved the fragile-favorite reads from the last two slates.',
    'Backfill the NBA Game 6 results so both playoff series stay as rolling archives instead of static snapshots.',
    'Track the WNBA short-number games closely, because this is the first slate after explicitly leaning harder into lead-fragility variance.'
  ],
  intakePrompt:
    'May 15 is now the live board. It carries a full MLB slate, both NBA playoff Game 6s, and four WNBA games with refreshed team and player context.',
  feedNotes: [
    'This is the first stored day where the full board carries MLB, NBA, and WNBA at once while the MLB model is already upgraded for projected hits, hit efficiency, pitcher types, bullpen shape, and contact quality.',
    'The official MLB probable-pitchers feed still needed a variance note on the Brewers starter, so the daybook keeps the official listing and the live board discrepancy together instead of forcing false certainty.',
    'WNBA player notes now come from current official roster production plus the LineStar team board, which makes the cards materially stronger than generic early-season blurbs.'
  ],
  archive: {
    resultsStored: false,
    leaguesTracked: ['MLB', 'NBA', 'WNBA']
  }
})

const may16Slate = createSlateDay({
  id: dayEightSlateMeta.isoDate,
  label: dayEightSlateMeta.date,
  status: 'ready',
  slateMeta: dayEightSlateMeta,
  games: dayEightGames,
  filters: dayEightFilters,
  oddsMeta: dayEightOddsMeta,
  sources: dayEightSources,
  intakeChecklist: [
    'Refresh the board once confirmed lineups land so the starter-phase and late-bridge split can be compared against the lineup-confirmed version.',
    'Store final MLB results and first-five outcomes so the new bridge-chain indicators can be graded directly instead of only narratively.',
    'Track whether the first-two-reliever chain helped catch the games that look cleaner for first five than for full-game moneyline.',
    'Keep an eye on any official probable-starter changes because this day intentionally started from the early official morning feed.'
  ],
  intakePrompt:
    'May 16 is now the live MLB board. It is the first one built around starter phase, bridge reliever chain, and full-game hold as separate parts of the same read.',
  feedNotes: [
    'This is the first daybook entry where the warehouse likely-reliever chain is a first-class model input instead of just a postgame explanation layer.',
    'The model now splits the projected hit script into first five, late innings, and full game, which makes the UI much closer to an actual baseball desk view.',
    'The slate is MLB-only by design for the morning pass so today’s baseball read can be refreshed faster when the next lineup wave arrives.'
  ],
  archive: {
    resultsStored: false,
    leaguesTracked: ['MLB']
  }
})

const may17Slate = createSlateDay({
  id: dayNineSlateMeta.isoDate,
  label: dayNineSlateMeta.date,
  status: 'ready',
  slateMeta: dayNineSlateMeta,
  games: dayNineGames,
  filters: dayNineFilters,
  oddsMeta: dayNineOddsMeta,
  sources: dayNineSources,
  intakeChecklist: [
    'Refresh posted MLB lineups again closer to first pitch if you want the last few unposted teams to move from projected script to live lineup script.',
    'Refresh the WNBA moneyline board once more before first tip if you want the latest same-day market snapshot.',
    'Backfill the actual Game 7 result and key swing plays so the volatility tag can be graded against the final script.',
    'Store the final MLB outcomes so the May 17 postmortem can test whether the traffic-first rebalance improved on the May 16 review.'
  ],
  intakePrompt:
    'May 17 is now the live all-sports board: refreshed MLB, the four WNBA games, and the one NBA Game 7 all share the same desk.',
  feedNotes: [
    'This is the first May 17 pass where the MLB layer is fully refreshed instead of deferred, and it reflects the May 16 backtest adjustments directly in the model weights.',
    'The baseball board now punishes fragile favorites more aggressively when the projected hit script points to the dog, which is why a few true flip spots now surface on the Sunday slate.',
    'This is the first daybook entry built from official WNBA team and player stat dashboards instead of only lineup-adjacent roster blurbs.',
    'The WNBA market layer is moneyline-first on the early pass because the accessible board exposed the cleanest same-day prices there.',
    'The NBA side is a one-game volatility board by design, with Detroit carrying the cleaner path but the entire card still flagged as high-variance because it is a Game 7.'
  ],
  archive: {
    resultsStored: false,
    leaguesTracked: ['MLB', 'NBA', 'WNBA']
  }
})

const may18Slate = createSlateDay({
  id: dayTenSlateMeta.isoDate,
  label: dayTenSlateMeta.date,
  status: 'ready',
  slateMeta: dayTenSlateMeta,
  games: dayTenGames,
  filters: dayTenFilters,
  oddsMeta: dayTenOddsMeta,
  sources: dayTenSources,
  intakeChecklist: [
    'Refresh the lineup board once MLB posts official batting orders, because the early pass is still operating in pre-lineup mode.',
    'Export and store the May 18 side board so tomorrow’s backtest can grade today without another manual bridge step.',
    'Store the final MLB results and home-run events so the lineup-aware HR board can be checked against the actual Sunday carry bats.',
    'Watch whether the softer conviction cap on very high-variance MLB scripts improves the noisy favorite and live-dog lanes from May 17.'
  ],
  intakePrompt:
    'May 18 is now the live MLB board. It keeps the May 17 review in the model, while waiting on official posted lineups to sharpen the hitter scripts and home-run lanes later in the day.',
  feedNotes: [
    'This is the first May 18 pass after the May 17 review, and it deliberately tones down conviction on games that still carry very high baseball variance even when the model edge looks big on paper.',
    'The home-run board is refreshed for today, but the official lineup feed had not posted batting orders yet on this pass, so the HR lanes are explicitly pre-lineup rather than pretending to be final.',
    'There is no NBA or WNBA action on the current May 18 board, so the desk stays MLB-only and faster to refresh once lineups start landing.'
  ],
  archive: {
    resultsStored: false,
    leaguesTracked: ['MLB']
  }
})

const may19Slate = createSlateDay({
  id: dayElevenSlateMeta.isoDate,
  label: dayElevenSlateMeta.date,
  status: 'ready',
  slateMeta: dayElevenSlateMeta,
  games: dayElevenGames,
  filters: dayElevenFilters,
  oddsMeta: dayElevenOddsMeta,
  sources: dayElevenSources,
  intakeChecklist: [
    'Refresh the MLB lineup board again once more official batting orders post, because the early pass still carries a large projected-lineup share.',
    'Store the final MLB results and first-five outcomes so the stricter volatility and team-story penalties can be graded after the May 18 miss cluster.',
    'Backfill the WNBA result so the short one-game board can be compared against the early-season team-shape read.',
    'Store the NBA Game 1 result and swing moments so the conference-finals volatility tag can be graded against the real late-game script.'
  ],
  intakePrompt:
    'May 19 is now the live desk: refreshed MLB, one WNBA game, and one NBA conference-finals opener all sit on the same board with the updated volatility and team-story logic.',
  feedNotes: [
    'This is the first slate after the May 18 postmortem tightened favorite safety rules and compressed exaggerated projected-hit gaps from partial lineups.',
    'The MLB board now carries more explicit team-story penalties for clubs that look better on paper than in their recent scoring or hold quality.',
    'WNBA and NBA are both one-game boards tonight, so the desk intentionally treats them as focused volatility reads instead of pretending there is a full multi-game sample to lean on.'
  ],
  archive: {
    resultsStored: false,
    leaguesTracked: ['MLB', 'NBA', 'WNBA']
  }
})

const may20Slate = createSlateDay({
  id: dayTwelveSlateMeta.isoDate,
  label: dayTwelveSlateMeta.date,
  status: 'ready',
  slateMeta: dayTwelveSlateMeta,
  games: dayTwelveGames,
  filters: dayTwelveFilters,
  oddsMeta: dayTwelveOddsMeta,
  sources: dayTwelveSources,
  intakeChecklist: [
    'Refresh the MLB lineup board again once more official batting orders post, because this remaining-games pass still leans heavily on projected orders outside the early posted teams.',
    'Store the final MLB results and first-five outcomes so the remaining-games version of the model can be graded separately from full-day morning boards.',
    'Backfill the WNBA result so the one-game board can be compared against the expansion-team variance read.',
    'Store the NBA Game 2 result and swing moments so the Thunder bounceback read can be graded against the actual playoff script.'
  ],
  intakePrompt:
    'May 20 is now the live remaining-games desk: refreshed MLB after the first two early starts, plus the one WNBA game and West finals Game 2.',
  feedNotes: [
    'This is another intentionally partial baseball slate, built only from the still-actionable games after the first pitches had already started at 10:13 AM Pacific.',
    'The May 20 MLB card is materially better than the first raw pull because the warehouse lookback was refreshed first, restoring recent-start packets for 28 of 30 listed starters.',
    'The WNBA and NBA sides are both one-game volatility reads again, so the desk is better used as a trim card than a broad all-night parlay board.'
  ],
  archive: {
    resultsStored: false,
    leaguesTracked: ['MLB']
  }
})

const may21Slate = createSlateDay({
  id: dayThirteenSlateMeta.isoDate,
  label: dayThirteenSlateMeta.date,
  status: 'ready',
  slateMeta: dayThirteenSlateMeta,
  games: dayThirteenGames,
  filters: dayThirteenFilters,
  oddsMeta: dayThirteenOddsMeta,
  sources: dayThirteenSources,
  intakeChecklist: [
    'Refresh the main-tour tennis prices once the last overnight market moves settle, because early clay boards can still drift on weather and late withdrawals.',
    'Backfill the Roland-Garros qualifying results so the model can grade how well rank, seed, and fatigue explained the final-round qualifying board.',
    'Keep the TennisStats and Tennis Abstract links in the source registry because they are now the fastest way to rebuild tennis match context without wide search.',
    'If any late player withdrawal or medical timeout news breaks, update the relevant match notes before first ball.'
  ],
  intakePrompt:
    'May 21 is now the live tennis desk: WTA Strasbourg, ATP Hamburg, ATP Geneva, and Roland-Garros qualifying all sit on the same clay-only board.',
  feedNotes: [
    'This is the first dedicated tennis daybook entry, and it leans on clay form, ranking pressure, H2H shape, and qualifying fatigue instead of the old all-sports override approach.',
    'Roland-Garros coverage here is qualifying round three rather than the main draw, so those matches are intentionally treated as more volatile model-only reads when no clean market price was accessible.',
    'The active desk focus is now MLB plus Tennis; older NBA and WNBA boards stay in the archive, but the live workflow is no longer centered on them.'
  ],
  archive: {
    resultsStored: false,
    leaguesTracked: ['Tennis']
  }
})

export const slateDays = [may9Slate, may10Slate, may11Slate, may12Slate, may13Slate, may14Slate, may15Slate, may16Slate, may17Slate, may18Slate, may19Slate, may20Slate, may21Slate]

const currentLocalIsoDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const latestActiveOrPastSlate = [...slateDays]
  .filter((day) => day.id <= currentLocalIsoDate())
  .at(-1)

export const defaultSlateDayId = latestActiveOrPastSlate?.id ?? slateDays.at(-1)?.id ?? ''

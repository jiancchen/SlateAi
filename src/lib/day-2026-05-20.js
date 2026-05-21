import { createSportsMatchModel } from './sports-model.js'
import { mlbGames, mlbNotes, mlbSources } from './day-2026-05-20-mlb.js'

export const slateMeta = {
  title: 'Wednesday All-Sports Desk',
  date: 'May 20, 2026',
  isoDate: '2026-05-20',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A live May 20 remaining-games board with the refreshed MLB slate after the early first pitches, one WNBA matchup, and West finals Game 2, using official league pages, live board pricing, lineup context, and the updated volatility model.',
  notes: [
    ...mlbNotes,
    'The WNBA board is only one game tonight, so it leans more heavily on current lineups, early-season team shape, and live pricing than on deep sample size.',
    'Spurs-Thunder Game 2 is a playoff volatility board by design because Oklahoma City is trying to answer a double-overtime Game 1 loss against a San Antonio team that can still bend the entire script through Wembanyama.'
  ]
}

export const filters = ['All', 'MLB', 'WNBA', 'NBA']

export const oddsMeta = {
  provider: 'Official league data + matchup board snapshots',
  snapshot: 'May 20, 2026, 10:13 AM PT remaining-games refresh',
  note:
    'MLB pricing continues to come from the accessible matchup-board workflow layered with the lineup, bullpen-chain, and team-story model. WNBA and NBA use official game pages, StatMuse preview stats, and current live board pricing.'
}

export const sources = [
  ...mlbSources,
  {
    label: 'WNBA official scoreboard for May 20, 2026',
    url: 'https://stats.wnba.com/stats/scoreboardV2?GameDate=05/20/2026&LeagueID=10&DayOffset=0'
  },
  {
    label: 'Fire-Fever StatMuse preview',
    url: 'https://www.statmuse.com/wnba/game/5-20-2026-pdx-at-ind-7777'
  },
  {
    label: 'Fire-Fever RotoWire odds',
    url: 'https://www.rotowire.com/betting/wnba/game/fire-vs-fever-odds-2026-05-20-2956697'
  },
  {
    label: 'NBA 2026 playoffs schedule',
    url: 'https://www.nba.com/news/2026-nba-playoffs-schedule'
  },
  {
    label: 'Spurs-Thunder StatMuse preview',
    url: 'https://www.statmuse.com/nba/game/5-20-2026-sas-at-okc-78542'
  },
  {
    label: 'Spurs-Thunder RotoWire odds',
    url: 'https://www.rotowire.com/betting/nba/game/thunder-vs-spurs-odds-2026-05-20-2978974'
  }
]

const market = (label, book, value) => ({ label, book, value })

const makeBoardOdds = ({
  spread = '',
  total = '',
  moneyline = '',
  provider = oddsMeta.provider
}) => ({
  participantOrder: [0, 1],
  markets: [
    ...(spread ? [market('Spread', provider, spread)] : []),
    ...(total ? [market('Total', provider, total)] : []),
    ...(moneyline ? [market('Moneyline', provider, moneyline)] : [])
  ],
  note:
    'This board is mixing official game context with live matchup pricing. Read these sides together with volatility and player-usage notes, especially in the early-season WNBA cards and the NBA series opener.',
  provider
})

const makeGame = (game) => createSportsMatchModel(game, oddsMeta.provider)

const extraGames = [
  makeGame({
    id: 'fire-fever-2026-05-20',
    league: 'WNBA',
    start: '4:00 PM PT',
    startMinutes: 960,
    title: 'Fire @ Fever',
    stage: 'Wednesday WNBA board',
    spotlight: true,
    tags: ['Fever favorite', 'Expansion volatility', 'Clark tempo control'],
    matchup: [
      {
        side: 'Away',
        name: 'Fire',
        detail: '1-1 | 83.5 implied pts | expansion road spot | secondary scoring still volatile'
      },
      {
        side: 'Home',
        name: 'Fever',
        detail: '2-2 | 97.0 implied pts | home pace edge | Clark control + transition lift'
      }
    ],
    summary:
      'Indiana carries the cleaner offense and the much stronger raw market respect, but the Fire are still the kind of expansion-team variance case that can stay live if the Fever get sloppy around the perimeter and fail to separate early.',
    factors: [
      'Current RotoWire board: Fire +600 / Fever -900 with Indiana -13.5 and a 180.5 total.',
      'StatMuse frames this as a major shape gap, with Indiana at home and Portland still operating more like a live spoiler than a stable favorite-cover candidate.',
      'This is the kind of early-season WNBA game where the side can still be right while the spread stays noisy, especially if Indiana leads without fully closing possessions.'
    ],
    lean:
      'Lean Fever because the home pace and guard control are cleaner, while still respecting Fire variance enough to treat the spread as more fragile than the moneyline.',
    swing:
      "Swing factor: whether Indiana can turn its pace and shotmaking edge into a real separation script before Portland drags the game into a looser, higher-variance scoring path.",
    playerAnalysis: [
      'Caitlin Clark is still the cleanest control point in the matchup because Indiana can flatten a lot of chaos when she dictates pace and early offense.',
      'The Fire stay live only if the secondary scorers show up behind the top-line creation, because the favorite gap gets wide quickly if Portland turns into a one-engine offense.',
      'Indiana’s best path is to force the game into transition and make the expansion side chase structure instead of just trading shotmaking.',
      'This is a better moneyline read than spread read because the game can still stay messy even if Indiana is the cleaner team.'
    ],
    odds: makeBoardOdds({
      spread: 'Fire +13.5 (-115) / Fever -13.5 (-105)',
      total: '180.5',
      moneyline: 'Fire +600 / Fever -900',
      provider: 'RotoWire WNBA odds'
    })
  }),
  makeGame({
    id: 'spurs-thunder-wcf-g2-2026-05-20',
    league: 'NBA',
    start: '5:30 PM PT',
    startMinutes: 1050,
    title: 'Spurs @ Thunder',
    stage: 'West finals Game 2',
    spotlight: true,
    tags: ['Game 2 volatility', 'OKC bounceback', 'Wemby distortion risk'],
    matchup: [
      {
        side: 'Away',
        name: 'Spurs',
        detail: '62-20 | up 1-0 | Wembanyama 41 in Game 1 | live shotmaking dog'
      },
      {
        side: 'Home',
        name: 'Thunder',
        detail: '64-18 | home bounceback spot | SGA control | better baseline defense'
      }
    ],
    summary:
      'Oklahoma City is still the cleaner Game 2 home side because the Thunder own the deeper season-long control profile and should answer with real urgency after the double-overtime Game 1 loss, but San Antonio is too live to treat this like a normal favorite script.',
    factors: [
      'Current RotoWire / StatMuse board: Spurs roughly +200 and Thunder roughly -240 to -250, with Oklahoma City -6.5 and a 215.5 total.',
      'The official playoff schedule has this as Western Conference Finals Game 2 with San Antonio leading 1-0 after a 122-115 double-overtime win in Game 1.',
      'The Thunder still carry the better season-long defensive shape, but that edge now has to survive the exact Wembanyama distortion that broke Game 1.'
    ],
    lean:
      'Lean Thunder because the home bounceback, cleaner depth, and stronger base defense still give Oklahoma City the better Game 2 path, while fully respecting the Spurs as a real volatility dog.',
    swing:
      "Swing factor: whether Oklahoma City can shrink Victor Wembanyama's influence enough to keep Game 2 from becoming another distorted half-court and late-clock battle.",
    playerAnalysis: [
      'Victor Wembanyama is still the single biggest volatility piece on the entire board after the 41-point, 24-rebound Game 1 eruption.',
      'Shai Gilgeous-Alexander remains the cleanest late-clock stabilizer, which is why the Thunder are still the more reasonable favorite even after dropping the opener.',
      'Jalen Williams returning to a fuller role matters a lot because Oklahoma City needs more creation around SGA than it got in the opener.',
      'San Antonio stays live if Castle and the secondary guards keep enough pressure on OKC to stop the Thunder from loading everything onto Wemby.'
    ],
    seriesBreakdown: {
      kicker: 'West finals Game 2',
      title: 'Why OKC can be the right side without pretending the Spurs are dead',
      record: 'Spurs lead series 1-0',
      recap:
        'San Antonio stole Game 1 in double overtime behind a Wembanyama masterpiece, but the Thunder still own the better overall control profile and the clearer home reset spot for Game 2. That makes Oklahoma City the fairer side, while still leaving the dog route very real if the game drifts back into another half-court war.',
      seriesStats: [
        'OKC 64-18 | SAS 62-20',
        'Series: Spurs lead 1-0',
        'Consensus board: OKC -6.5 | 215.5 total',
        'Game 1: Spurs 122, Thunder 115 (2OT)'
      ],
      boxScores: [
        {
          label: 'Game 1 recap',
          date: 'May 18, 2026',
          result: 'Spurs 122, Thunder 115 (2OT)',
          notes: [
            'Wembanyama bent the whole opener with 41 points and 24 boards, which is exactly why the dog route is still live tonight.',
            'The Thunder do not need a philosophical reset as much as they need cleaner shotmaking and better late-clock support around SGA.'
          ]
        },
        {
          label: 'Game 2 market frame',
          date: 'May 20, 2026',
          result: 'Opening market: Thunder around -240 / Spurs around +200',
          notes: [
            'If Oklahoma City controls the paint and keeps Wemby from warping every key possession, the Thunder have the cleaner bounceback path.',
            'If San Antonio drags the game into another slower, bigger, more chaotic shape, the underdog route stays alive all night.'
          ]
        }
      ]
    },
    odds: makeBoardOdds({
      spread: 'Spurs +6.5 (-110) / Thunder -6.5 (-110)',
      total: '215.5',
      moneyline: 'Spurs +200 / Thunder -250',
      provider: 'StatMuse + RotoWire consensus odds'
    })
  })
]

export const games = [...mlbGames, ...extraGames].sort(
  (left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title)
)

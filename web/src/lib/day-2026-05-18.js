import { createSportsMatchModel } from './sports-model.js'
import { mlbGames, mlbNotes, mlbSources } from './day-2026-05-18-mlb.js'

export const slateMeta = {
  title: 'Monday All-Sports Desk',
  date: 'May 18, 2026',
  isoDate: '2026-05-18',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A live May 18 board with the refreshed MLB slate plus tonight’s WNBA doubleheader and West finals Game 1, using official league pages, current matchup pricing, lineup context, and the updated split-script model.',
  notes: [
    ...mlbNotes,
    'The WNBA board is only two games tonight, so each card is leaning harder on current lineups, player leaders, and early-season team shape than on deep sample size.',
    'Spurs-Thunder is flagged as a volatility game because the market is pricing Oklahoma City as a clear home favorite while San Antonio still owned the 2025-26 regular-season series 4-1.'
  ]
}

export const filters = ['All', 'MLB', 'WNBA', 'NBA']

export const oddsMeta = {
  provider: 'Official league data + matchup board snapshots',
  snapshot: 'May 18, 2026, early afternoon PT',
  note:
    'MLB pricing continues to come from the accessible matchup-board workflow layered with the lineup and bullpen-chain model. WNBA and NBA use official game pages, StatMuse preview stats, and current RotoWire matchup pricing.'
}

export const sources = [
  ...mlbSources,
  {
    label: 'WNBA official scoreboard for May 18, 2026',
    url: 'https://stats.wnba.com/stats/scoreboardV2?GameDate=05/18/2026&LeagueID=10&DayOffset=0'
  },
  {
    label: 'Mystics-Wings StatMuse preview',
    url: 'https://www.statmuse.com/wnba/game/5-18-2026-was-at-dal-7774'
  },
  {
    label: 'Mystics-Wings RotoWire odds',
    url: 'https://www.rotowire.com/betting/wnba/game/mystics-vs-wings-odds-2026-05-18-2956694'
  },
  {
    label: 'Sun-Fire StatMuse preview',
    url: 'https://www.statmuse.com/wnba/game/5-18-2026-con-at-pdx-7775'
  },
  {
    label: 'Sun-Fire RotoWire odds',
    url: 'https://www.rotowire.com/betting/wnba/game/sun-vs-fire-odds-2026-05-18-2956695'
  },
  {
    label: 'Spurs-Thunder official NBA game summary',
    url: 'https://www.nba.com/game/sas-vs-okc-0042500311'
  },
  {
    label: 'Spurs-Thunder StatMuse preview',
    url: 'https://www.statmuse.com/nba/game/5-18-2026-okc-vs-sas-78541'
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
    id: 'mystics-wings-2026-05-18',
    league: 'WNBA',
    start: '5:00 PM PT',
    startMinutes: 1020,
    title: 'Mystics @ Wings',
    stage: 'Monday WNBA opener',
    spotlight: true,
    tags: ['Live dog', 'Guard ceiling vs paint edge', 'Short-number volatility'],
    matchup: [
      {
        side: 'Away',
        name: 'Mystics',
        detail: '2-1 | 88.3 ORTG | 88.3 DRTG | Citron 24.3 PPG | Iriafen 13.7 RPG'
      },
      {
        side: 'Home',
        name: 'Wings',
        detail: '1-2 | Paige 20.7 PPG | Shepard 7.7 RPG / 5.3 APG | home favorite'
      }
    ],
    summary:
      'Dallas has the cleaner home guard ceiling through Paige Bueckers and Arike Ogunbowale, but Washington is one of the stronger live-dog profiles on tonight’s short board because the Mystics have matched Dallas in offensive rating and looked firmer defensively and on the glass.',
    factors: [
      'Current RotoWire board: Mystics +164 / Wings -198 with Dallas -4.5 and a 170.5 total.',
      'StatMuse has both teams at an 88.3 offensive rating, but Washington enters 2-1 with the cleaner early defensive number while Dallas is 1-2 and still proving the closing script.',
      'Projected lineups still give Dallas the louder backcourt ceiling with Paige Bueckers, Arike Ogunbowale, and Odyssey Sims, while Washington counters with a more physical frontcourt through Kiki Iriafen and Shakira Austin.'
    ],
    lean:
      'Lean Mystics as a live dog if their frontcourt volume and defensive shape hold up, while still respecting Dallas as the cleaner pure shot-making side at home.',
    swing:
      "Swing factor: whether Dallas's guards can create enough separation before Washington turns the game into a paint-and-rebounding script.",
    playerAnalysis: [
      'Sonia Citron has been the most stable scorer in the matchup at 24.3 points per game, which is why Washington can stay live even without the home floor.',
      'Kiki Iriafen and Shakira Austin are the biggest shape pieces because Dallas has not consistently handled heavy interior volume yet.',
      'Paige Bueckers remains the cleanest half-court organizer on the home side, and Arike Ogunbowale is still the player most likely to blow up a dead possession.',
      'Jessica Shepard matters more than the moneyline suggests because if Dallas does not rebound its own misses and complete possessions, the Wings favorite script gets thin fast.'
    ],
    odds: makeBoardOdds({
      spread: 'Mystics +4.5 (-102) / Wings -4.5 (-118)',
      total: '170.5',
      moneyline: 'Mystics +164 / Wings -198',
      provider: 'RotoWire WNBA odds'
    })
  }),
  makeGame({
    id: 'spurs-thunder-2026-05-18',
    league: 'NBA',
    start: '5:30 PM PT',
    startMinutes: 1050,
    title: 'Spurs @ Thunder',
    stage: 'West finals Game 1',
    spotlight: true,
    tags: ['Game 1 volatility', 'Spurs season-series edge', 'Home favorite pressure'],
    matchup: [
      {
        side: 'Away',
        name: 'Spurs',
        detail: '62-20 | 4-1 vs OKC in regular season | Wembanyama 25.0 PPG / 11.5 RPG'
      },
      {
        side: 'Home',
        name: 'Thunder',
        detail: '64-18 | 107.9 DRTG | SGA 31.1 PPG | 8-2 last 10'
      }
    ],
    summary:
      'Oklahoma City is still the cleaner Game 1 home side because the Thunder own the better defensive base and the deeper rested setting, but this is not a casual favorite script when San Antonio already took four of five regular-season meetings and brings the most disruptive size profile OKC has faced in weeks.',
    factors: [
      'Current StatMuse board: Spurs +200 / Thunder -250 with Oklahoma City -6.5 and a 218.5 total.',
      'The official NBA game page shows San Antonio winning four of the five regular-season meetings, including the most recent 116-106 result on February 4, 2026.',
      'StatMuse team stats still lean Oklahoma City overall with a +11.1 net rating and 107.9 defensive rating against San Antonio’s +8.3 net rating and 111.5 defensive rating.'
    ],
    lean:
      'Lean Thunder because the home floor and cleaner defensive control still matter most in a series opener, while tagging San Antonio as one of the strongest plus-money game scripts on the board.',
    swing:
      "Swing factor: whether Oklahoma City can keep Victor Wembanyama from warping the paint and forcing the Thunder into a slower, half-court size battle.",
    playerAnalysis: [
      'Shai Gilgeous-Alexander is still the most stable late-clock scorer in the matchup, which is why Oklahoma City owns the cleaner final-minute path.',
      'Victor Wembanyama is the largest single volatility source because his rebounding and rim pressure can bend both the pace and the shot map in a hurry.',
      'De’Aaron Fox, Stephon Castle, and Devin Vassell give San Antonio more than one entry point into the offense, which is a big reason the Spurs took the season series.',
      'If Jalen Williams really gives the Thunder a full starter run, Oklahoma City’s wing balance becomes much more convincing than the raw 4-1 season-series record makes it look.'
    ],
    seriesBreakdown: {
      kicker: 'Series opener context',
      title: 'Why OKC can still be right even after losing the season series',
      record: 'Spurs led regular season 4-1',
      recap:
        'San Antonio won four of the five regular-season meetings, but playoff Game 1 is arriving in Oklahoma City with the Thunder rested, healthy enough to restore the starting five, and carrying the better full-season defensive profile. That leaves the Thunder as the cleaner home side, while still making the Spurs one of the more believable dog routes on the board.',
      seriesStats: [
        'OKC 64-18 | SAS 62-20',
        'Regular season: Spurs 4-1 vs Thunder',
        'Consensus board: OKC -6.5 | 218.5 total',
        'StatMuse net rating: OKC +11.1 | SAS +8.3'
      ],
      boxScores: [
        {
          label: 'Last meeting',
          date: 'February 4, 2026',
          result: 'Spurs 116, Thunder 106',
          notes: [
            'San Antonio won the latest head-to-head by taking the size and transition battle.',
            'That result is a real warning against overrating the home-favorite label in Game 1.'
          ]
        },
        {
          label: 'Best OKC response',
          date: 'January 13, 2026',
          result: 'Thunder 119, Spurs 98',
          notes: [
            'Oklahoma City’s cleanest win in the matchup came when the Thunder controlled mistakes and flattened San Antonio’s rim pressure early.',
            'That is still the most important template for the home favorite tonight.'
          ]
        }
      ]
    },
    odds: makeBoardOdds({
      spread: 'Spurs +6.5 (-110) / Thunder -6.5 (-110)',
      total: '218.5',
      moneyline: 'Spurs +200 / Thunder -250',
      provider: 'StatMuse consensus odds'
    })
  }),
  makeGame({
    id: 'sun-fire-2026-05-18',
    league: 'WNBA',
    start: '7:00 PM PT',
    startMinutes: 1140,
    title: 'Sun @ Fire',
    stage: 'Monday WNBA late window',
    spotlight: false,
    tags: ['Fire favorite', 'Sun slump', 'Paint vs spacing'],
    matchup: [
      {
        side: 'Away',
        name: 'Sun',
        detail: '0-4 | 80.0 ORTG | -18.5 net | Morrow 14.5 PPG / 10.8 RPG'
      },
      {
        side: 'Home',
        name: 'Fire',
        detail: '1-2 | 87.7 ORTG | Carla Leite 19.5 PPG | 35.5% from three'
      }
    ],
    summary:
      'Portland owns the cleaner offensive lane tonight because Connecticut has been stuck in a deep scoring hole through four games, and the Fire can spread the floor much better than the Sun have handled so far.',
    factors: [
      'Current RotoWire board: Sun +150 / Fire -180 with Portland -4.5 and a 172.5 total.',
      'StatMuse has Connecticut at an 80.0 offensive rating with a brutal -18.5 net rating, while Portland has been weak too but still sits materially ahead on offense at 87.7.',
      'Projected lineups keep Brittney Griner and Aneesah Morrow as the Sun’s best interior answer, but the Fire have more spacing through Carla Leite, Bridget Carleton, Emily Engstler, and Nyadiew Puoch.'
    ],
    lean:
      'Lean Fire because Portland has the cleaner perimeter pressure and the more stable scoring tree, while Connecticut still needs a much more efficient Griner-Morrow interior game to flip the script.',
    swing:
      'Swing factor: whether Connecticut can turn the game into a half-court paint contest before Portland stacks enough threes to force the Sun into chase mode.',
    playerAnalysis: [
      'Carla Leite is still the top scoring engine in the matchup at 19.5 points per game, which is why Portland holds the favorite tag even with a modest overall record.',
      'Bridget Carleton and Emily Engstler matter because the Fire only need competent secondary spacing to stress a Connecticut defense that has already leaked a 98.5 defensive rating.',
      'Brittney Griner is the Sun’s best single game-shape lever, especially if she is fully available and can punish Portland inside.',
      'Aneesah Morrow and Saniya Rivers keep Connecticut from being empty, but the Sun still need much cleaner shooting than their 28.9% team three-point mark.'
    ],
    odds: makeBoardOdds({
      spread: 'Sun +4.5 (-115) / Fire -4.5 (-105)',
      total: '172.5',
      moneyline: 'Sun +150 / Fire -180',
      provider: 'RotoWire WNBA odds'
    })
  })
]

export const games = [...mlbGames, ...extraGames].sort(
  (left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title)
)

import { createSportsMatchModel } from './sports-model.js'
import { mlbGames, mlbNotes, mlbSources } from './day-2026-05-17-mlb.js'

export const slateMeta = {
  title: 'Sunday All-Sports Desk',
  date: 'May 17, 2026',
  isoDate: '2026-05-17',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A full Sunday board with the refreshed May 17 MLB slate, the four live WNBA games, and the one NBA Game 7, using official league data, live board pricing, lineup context, and bullpen-chain prep.',
  notes: [
    ...mlbNotes,
    'The WNBA board is back live on Sunday after the official May 16 schedule came back empty.',
    'The Game 7 card is deliberately tagged as a volatility board even with a home lean, because single-game elimination pressure can flip a clean edge into a shot-making war quickly.'
  ]
}

export const filters = ['All', 'MLB', 'WNBA', 'NBA']

export const oddsMeta = {
  provider: 'Official league stats + live board snapshots',
  snapshot: 'May 17, 2026, late morning PT',
  note:
    'MLB pricing comes from the accessible ScoresAndOdds matchup pages, then layers official probable starters, current standings, team hit context, bullpen quality, bullpen-chain workload, and posted lineups. WNBA and NBA continue to use the official league dashboards plus the live board snapshots.'
}

export const sources = [
  ...mlbSources,
  {
    label: 'WNBA official scoreboard for May 17, 2026',
    url: 'https://stats.wnba.com/stats/scoreboardV2?GameDate=05/17/2026&LeagueID=10&DayOffset=0'
  },
  {
    label: 'WNBA official team stats dashboard',
    url: 'https://stats.wnba.com/stats/leaguedashteamstats?LeagueID=10&PerMode=PerGame&Season=2026&SeasonType=Regular+Season'
  },
  {
    label: 'WNBA official player stats dashboard',
    url: 'https://stats.wnba.com/stats/leaguedashplayerstats?LeagueID=10&PerMode=PerGame&Season=2026&SeasonType=Regular+Season&StarterBench=Starters'
  },
  { label: 'Covers WNBA odds board', url: 'https://www.covers.com/sport/basketball/wnba/odds' },
  { label: 'NBA playoffs schedule', url: 'https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true' },
  { label: 'ScoresAndOdds NBA board', url: 'https://www.scoresandodds.com/nba?date=2026-05-17' },
  { label: 'Pistons-Cavaliers Game 6 official PDF box score', url: 'https://statsdmz.nba.com/pdfs/20260515/20260515_DETCLE_book.pdf' },
  { label: 'Pistons-Cavaliers Game 5 official PDF box score', url: 'https://statsdmz.nba.com/pdfs/20260513/20260513_CLEDET_book.pdf' }
]

const market = (label, book, value) => ({ label, book, value })

const makeBoardOdds = ({ spread = '', total = '', moneyline = '', provider = oddsMeta.provider }) => ({
  participantOrder: [0, 1],
  markets: [
    ...(spread ? [market('Spread', provider, spread)] : []),
    ...(total ? [market('Total', provider, total)] : []),
    ...(moneyline ? [market('Moneyline', provider, moneyline)] : [])
  ],
  note:
    'This board is mixing official league stats with same-day live prices. For WNBA, the moneyline is the cleanest current market layer on the early board.',
  provider
})

const makeGame = (game) => createSportsMatchModel(game, oddsMeta.provider)

export const games = [
  ...mlbGames,
  makeGame({
    id: 'aces-dream-2026-05-17',
    league: 'WNBA',
    start: '10:30 AM PT',
    startMinutes: 630,
    title: 'Aces @ Dream',
    stage: 'Sunday WNBA opener',
    spotlight: true,
    tags: ["Near pick'em", "A'ja ceiling", 'Rebounding war'],
    matchup: [
      { side: 'Away', name: 'Aces', detail: "3-1 | 92.5 PPG | +7.5 differential | A'ja Wilson 26.3 PPG" },
      { side: 'Home', name: 'Dream', detail: '2-0 | 84.0 PPG | 45.0 RPG | Allisha Gray 25.0 PPG' }
    ],
    summary:
      "Las Vegas still brings the cleanest single-player ceiling on the Sunday WNBA board, but Atlanta is not a passive home dog because the Dream are rebounding everything and keeping this game priced like a true two-way script.",
    factors: [
      'Current moneyline board: Aces -103 / Dream -120.',
      "Official WNBA team stats have Las Vegas at 92.5 points per game with a +7.5 differential, while Atlanta is 2-0 with 45.0 rebounds per game and a +3.0 differential.",
      "A'ja Wilson at 26.3 points per game is the highest-end scorer in the matchup, but Atlanta can answer with Allisha Gray at 25.0 plus Jordin Canada, Rhyne Howard, and Angel Reese's 15.0 rebounds."
    ],
    lean:
      "Lean Aces by ceiling and late-game trust, but this is closer to a tradable volatility game than a comfortable favorite spot because Atlanta's glass and home pressure are very real.",
    swing:
      "Swing factor: whether Atlanta's rebounding and second-chance pressure can turn the game into a grind instead of an A'ja Wilson shot-making script.",
    playerAnalysis: [
      "A'ja Wilson is still the cleanest one-player takeover bet on the floor at 26.3 points per game, which is why Las Vegas can be live even without the home edge.",
      'Jackie Young and Chelsea Gray matter because the Aces do not need every possession to become a pure Wilson touch in the last six minutes.',
      "Allisha Gray's 25.0 points per game plus Rhyne Howard and Jordin Canada keep Atlanta from being a one-path team.",
      "Angel Reese's 15.0 rebounds per game are one of the strongest game-shape signals here because if Atlanta owns the glass, the home side can completely bend the pace."
    ],
    odds: makeBoardOdds({ moneyline: 'Aces -103 / Dream -120', provider: 'Covers WNBA odds board' })
  }),
  makeGame({
    id: 'storm-fever-2026-05-17',
    league: 'WNBA',
    start: '3:00 PM PT',
    startMinutes: 900,
    title: 'Storm @ Fever',
    stage: 'Sunday WNBA board',
    spotlight: true,
    tags: ['Heavy favorite', 'Clark-Mitchell engine', 'Big favorite variance'],
    matchup: [
      { side: 'Away', name: 'Storm', detail: '1-2 | 80.7 PPG | -5.7 differential | Malonga 16.0 PPG' },
      { side: 'Home', name: 'Fever', detail: '1-2 | 97.7 PPG | Clark 25.3 PPG / 8.0 APG | Mitchell 25.7 PPG' }
    ],
    summary:
      'Indiana owns the cleanest offensive engine on this WNBA slate, and Seattle has not yet shown enough half-court creation to feel comfortable fading the Fever unless the favorite starts leaking empty possessions.',
    factors: [
      'Current moneyline board: Storm +373 / Fever -556.',
      'Official WNBA team stats have Indiana at 97.7 points per game with 22.3 assists, while Seattle is at 80.7 points per game with a negative differential through three games.',
      'Caitlin Clark and Kelsey Mitchell are both above 25 points per game, which gives Indiana the fastest scoring punch on the day.'
    ],
    lean:
      'Lean Fever strongly because the scoring and creation tree is too much cleaner on the early board, while still respecting the usual backdoor and early-season favorite variance.',
    swing:
      'Swing factor: whether Indiana protects the ball well enough to keep Seattle from turning this into a free-possession underdog game.',
    playerAnalysis: [
      'Caitlin Clark at 25.3 points and 8.0 assists is still the best game-organizing force in this matchup.',
      "Kelsey Mitchell's 25.7 points per game make Indiana much more than a one-creator offense, which is why the favorite role is so expensive here.",
      'Aliyah Boston and Monique Billings matter because the Fever need enough frontcourt balance to stop Seattle from hanging around through effort plays.',
      "Seattle's clearest live path still runs through Dominique Malonga and a much better defensive game than the Storm have shown so far."
    ],
    odds: makeBoardOdds({ moneyline: 'Storm +373 / Fever -556', provider: 'Covers WNBA odds board' })
  }),
  makeGame({
    id: 'sky-lynx-2026-05-17',
    league: 'WNBA',
    start: '4:00 PM PT',
    startMinutes: 960,
    title: 'Sky @ Lynx',
    stage: 'Sunday WNBA board',
    spotlight: false,
    tags: ['Live dog', 'Lead-guard edge', 'Interior counter'],
    matchup: [
      { side: 'Away', name: 'Sky', detail: '2-1 | 83.3 PPG | +4.3 differential | Rickea Jackson 22.0 PPG' },
      { side: 'Home', name: 'Lynx', detail: '2-1 | 89.3 PPG | Olivia Miles 16.3 PPG / 7.0 APG' }
    ],
    summary:
      "Minnesota has the cleaner organizer profile at home, but Chicago stays live because Rickea Jackson and Kamilla Cardoso give the Sky a real scoring-plus-size answer that can compress a short game.",
    factors: [
      'Current moneyline board: Sky +166 / Lynx -208.',
      'Official WNBA team stats have Minnesota at 89.3 points per game on 53.1% shooting, while Chicago is at 83.3 points per game with the better current point differential.',
      'The Lynx still own the cleaner lead-guard script through Olivia Miles and Courtney Williams, but Chicago has the stronger pure interior counter through Cardoso.'
    ],
    lean:
      'Lean Lynx because the home guard structure is cleaner, while treating Chicago as a very live underdog rather than a passive plus-money tag.',
    swing:
      'Swing factor: whether Minnesota can keep the game in guard flow instead of letting Chicago turn it into a Rickea-plus-Cardoso pressure game.',
    playerAnalysis: [
      'Olivia Miles at 16.3 points and 7.0 assists is the cleanest game-management piece in the matchup.',
      'Courtney Williams and Natasha Howard matter because Minnesota does not need every quality look to be a Miles-created possession.',
      "Rickea Jackson's 22.0 points per game keep Chicago dangerous in any close fourth quarter.",
      "Kamilla Cardoso's 12.3 points and 9.7 rebounds are the main reason the Sky can still force the game back inside even without the home floor."
    ],
    odds: makeBoardOdds({ moneyline: 'Sky +166 / Lynx -208', provider: 'Covers WNBA odds board' })
  }),
  makeGame({
    id: 'tempo-sparks-2026-05-17',
    league: 'WNBA',
    start: '4:00 PM PT',
    startMinutes: 960,
    title: 'Tempo @ Sparks',
    stage: 'Sunday WNBA board',
    spotlight: true,
    tags: ['Volatile favorite', 'Live dog', 'Plum vs Mabrey'],
    matchup: [
      { side: 'Away', name: 'Tempo', detail: '1-2 | +2.0 differential | Mabrey 20.0 PPG | Sykes 19.7 PPG' },
      { side: 'Home', name: 'Sparks', detail: '1-2 | 85.0 PPG | Plum 26.3 PPG | -10.7 differential' }
    ],
    summary:
      'Los Angeles still has the best single-player scoring ceiling through Kelsey Plum, but Toronto grades much better under the hood than a normal +266 road dog and turns this into one of the sharper volatility spots on the board.',
    factors: [
      'Current moneyline board: Tempo +266 / Sparks -357.',
      'Official WNBA team stats have Toronto at a positive point differential despite the 1-2 record, while Los Angeles is scoring 85.0 per game but carrying a -10.7 differential.',
      'Toronto is forcing more defensive events and protecting the ball better, but the Sparks still own the cleaner star shot-making ceiling through Plum, Nneka Ogwumike, and Dearica Hamby.'
    ],
    lean:
      'Lean Sparks only because the top-end scoring tree and home floor still point their way, while keeping Toronto as one of the strongest live-dog routes on the slate.',
    swing:
      'Swing factor: whether the Sparks can actually convert their star shot-making edge before Toronto drags the game into a lower-cleanliness defensive finish.',
    playerAnalysis: [
      'Kelsey Plum at 26.3 points per game is still the best pure scorer in the matchup and the main reason Los Angeles remains favorite.',
      'Nneka Ogwumike and Dearica Hamby matter because the Sparks need veteran support scoring to justify a heavier home price.',
      'Marina Mabrey and Brittney Sykes give Toronto the exact kind of scoring-plus-pressure backcourt that keeps the dog route very real.',
      "This matchup is noisy because Toronto's team profile is healthier than the moneyline implies, even if Plum still owns the single biggest shot-making ceiling."
    ],
    odds: makeBoardOdds({ moneyline: 'Tempo +266 / Sparks -357', provider: 'Covers WNBA odds board' })
  }),
  makeGame({
    id: 'cavaliers-pistons-g7',
    league: 'NBA',
    start: '5:00 PM PT',
    startMinutes: 1020,
    title: 'Cavaliers @ Pistons',
    stage: 'East semifinal Game 7',
    spotlight: true,
    tags: ['Game 7', 'Volatile script', 'Cade control'],
    matchup: [
      { side: 'Away', name: 'Cavaliers', detail: 'Mitchell | Harden | Allen | +150 road dog' },
      { side: 'Home', name: 'Pistons', detail: 'Cunningham | Harris | Duren | -180 home side' }
    ],
    summary:
      'Detroit forced the series back home with a 115-94 road hammer in Game 6, but Game 7 is still one of the most volatile single-game scripts we have carried because Cleveland can still break the possession battle if Mitchell and Harden turn the last six minutes into a bailout contest.',
    factors: [
      'Current board: Cavaliers +150 / Pistons -180 with Detroit -4.5 and the total at 205.5.',
      'Official playoff scheduling has the series tied 3-3 after Detroit won Game 6 on Friday, May 15, 2026 by a 115-94 scoreline.',
      "Through six games, Detroit has scored 109.7 points per game to Cleveland's 106.2, but the Cavaliers still own the faster emergency shot-making path when the game compresses."
    ],
    lean:
      'Lean Pistons because the home floor plus the Game 6 reset gives Detroit the cleanest Game 7 control path, while still flagging this as a true volatility board and not a clean favorite coast.',
    swing:
      "Swing factor: whether Cade Cunningham can keep the possession count on Detroit's terms long enough to stop Cleveland from turning Game 7 into pure star-shot variance.",
    playerAnalysis: [
      'Cade Cunningham remains the cleanest single player for controlling the rhythm of this series, which matters even more in a winner-take-all setting.',
      'Donovan Mitchell and James Harden are still the main reason Cleveland can steal this game even when Detroit looks cleaner on paper.',
      'Jalen Duren and Tobias Harris matter because Detroit has looked strongest whenever its secondary pieces keep the game from becoming a two-creator duel.',
      'Game 7 pressure magnifies every late-possession choice, so the safer read is still Detroit with an explicit volatility warning rather than a casual favorite label.'
    ],
    seriesBreakdown: {
      kicker: 'Playoff series to date',
      title: 'Why Detroit has the cleaner Game 7 lane but not the safer night',
      record: 'Series tied 3-3',
      recap:
        'Detroit took the first two games, Cleveland answered with the middle stretch, the Cavaliers stole Game 5 in overtime, and then the Pistons blasted back with a 115-94 road win in Game 6 on Friday, May 15, 2026. That means Detroit owns the latest control signal and the home floor, but Cleveland still carries enough star scoring to make the final minutes dangerous even if the Pistons are the cleaner side overall.',
      seriesStats: [
        'DET 109.7 PPG | CLE 106.2 PPG through six games',
        'Game 6: Pistons 115, Cavaliers 94 on May 15, 2026',
        'Game 5: Cavaliers 117, Pistons 113 on May 13, 2026',
        'Game 7 price: DET -4.5 | CLE +150 | 205.5 total'
      ],
      boxScores: [
        {
          label: 'Game 6',
          date: 'May 15, 2026',
          result: 'Pistons 115, Cavaliers 94',
          notes: [
            'Detroit reclaimed the physical and defensive script by holding Cleveland under 100 and forcing a winner-take-all return to Detroit.',
            'The Pistons looked fresher, bigger, and cleaner across the full possession chain, which matters more than any one hot quarter heading into Game 7.',
            'Cleveland now has to answer the first real series blowout it has absorbed since the opening two games.'
          ]
        },
        {
          label: 'Game 5',
          date: 'May 13, 2026',
          result: 'Cavaliers 117, Pistons 113 (OT)',
          notes: [
            'Cleveland stole the game in overtime after erasing a nine-point fourth-quarter deficit.',
            'That comeback remains the reminder that the Cavaliers still own a live late-game star path even when Detroit controls the first script.',
            'The contrast between Game 5 and Game 6 is exactly why this Game 7 carries a volatility label.'
          ],
          leaders: [
            { team: 'Pistons leaders', lines: ['Cade Cunningham: 39 points, 9 assists', 'Tobias Harris: major support scoring load'] },
            { team: 'Cavaliers leaders', lines: ['James Harden: 30 points', 'Donovan Mitchell: 21 points and the overtime response'] }
          ]
        }
      ],
      playerAnalysis: [
        "Cunningham is still the cleanest Game 7 organizer because he can slow the game down without fully killing Detroit's offense.",
        'Mitchell and Harden are still the purest road-variance pairing on the board, which is why the Cavaliers remain dangerous at plus money.',
        'Duren and Harris matter because Detroit needs more than one creator if Cleveland turns the last five minutes into a star-only sequence.',
        'The sharpest read is still Pistons with full respect for the shot-making chaos that comes with a single NBA elimination game.'
      ],
      sources: [
        { label: 'NBA playoffs schedule', url: 'https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true' },
        { label: 'Game 6 official PDF box score', url: 'https://statsdmz.nba.com/pdfs/20260515/20260515_DETCLE_book.pdf' },
        { label: 'Game 5 official PDF box score', url: 'https://statsdmz.nba.com/pdfs/20260513/20260513_CLEDET_book.pdf' }
      ]
    },
    odds: makeBoardOdds({
      spread: 'Cavaliers +4.5 (-112) / Pistons -4.5 (-108)',
      total: 'o205.5 (-110) / u205.5 (-110)',
      moneyline: 'Cavaliers +150 / Pistons -180',
      provider: 'ScoresAndOdds NBA board'
    })
  })
].sort((left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title))

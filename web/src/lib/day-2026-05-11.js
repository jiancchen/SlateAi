import { createSportsMatchModel } from './sports-model.js'
import {
  lineupMatchupContextByGame,
  teamBullpenContextByTeam,
  teamOffenseContextByTeam
} from './mlb-context-2026-05-11.js'

export const slateMeta = {
  title: 'Monday Trading Board',
  date: 'May 11, 2026',
  isoDate: '2026-05-11',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A current May 11 board with six MLB games and two NBA playoff games, refreshed from official starters, playoff box scores, and the latest market boards.',
  notes: [
    'This slate was rebuilt after reviewing the May 10 results instead of just carrying the old priors forward.',
    'The MLB model now adds more variance when a favorite comes in on a losing streak, when the underdog is carrying live form, or when the official probable-starter page does not cleanly match the market board.',
    'The Dodgers are still priced as the favorite tonight, but the read is intentionally less automatic because Sasaki enters with a 5.97 ERA and Los Angeles is on a two-game skid.',
    'The Angels-Guardians matchup is carrying an extra volatility flag because MLB.com still listed the Angels starter as TBD on the morning refresh while the market board dealt Brent Suter.',
    'There was no WNBA board available on the current May 11 refresh, so today is an MLB plus NBA slate.'
  ]
}

export const filters = ['All', 'MLB', 'NBA']

export const oddsMeta = {
  provider: 'Mixed official league data + live board snapshots',
  snapshot: 'May 11, 2026, 9:02 AM PT',
  note:
    'MLB and NBA prices are wired to the current ScoresAndOdds board, while the deeper analysis uses official MLB schedule and probable-pitcher data plus official NBA playoff box-score PDFs.'
}

export const sources = [
  {
    label: 'MLB probable pitchers',
    url: 'https://www.mlb.com/probable-pitchers'
  },
  {
    label: 'MLB schedule API for May 11, 2026',
    url: 'https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-05-11&hydrate=probablePitcher,team'
  },
  {
    label: 'MLB standings API for 2026 regular season',
    url: 'https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason'
  },
  {
    label: 'TeamRankings MLB hits per game',
    url: 'https://www.teamrankings.com/mlb/stat/hits-per-game'
  },
  {
    label: 'Covers MLB bullpen ERA',
    url: 'https://www.covers.com/sport/baseball/mlb/statistics/team-bullpenera/2026'
  },
  {
    label: 'BallparkPal matchup board',
    url: 'https://www.ballparkpal.com/Matchups.php'
  },
  {
    label: 'ScoresAndOdds MLB board',
    url: 'https://www.scoresandodds.com/mlb'
  },
  {
    label: 'NBA 2026 playoffs schedule',
    url: 'https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true'
  },
  {
    label: 'ScoresAndOdds NBA board',
    url: 'https://www.scoresandodds.com/nba'
  },
  {
    label: 'Thunder vs Lakers Game 1 official PDF box score',
    url: 'https://statsdmz.nba.com/pdfs/20260505/20260505_LALOKC_book.pdf'
  },
  {
    label: 'Thunder vs Lakers Game 2 official PDF box score',
    url: 'https://statsdmz.nba.com/pdfs/20260507/20260507_LALOKC_book.pdf'
  },
  {
    label: 'Thunder vs Lakers Game 3 official PDF box score',
    url: 'https://statsdmz.nba.com/pdfs/20260509/20260509_OKCLAL_book.pdf'
  },
  {
    label: 'Pistons vs Cavaliers Game 1 official PDF box score',
    url: 'https://statsdmz.nba.com/pdfs/20260505/20260505_CLEDET_book.pdf'
  },
  {
    label: 'Pistons vs Cavaliers Game 2 official PDF box score',
    url: 'https://statsdmz.nba.com/pdfs/20260507/20260507_CLEDET_book.pdf'
  },
  {
    label: 'Pistons vs Cavaliers Game 3 official PDF box score',
    url: 'https://statsdmz.nba.com/pdfs/20260509/20260509_DETCLE_book.pdf'
  }
]

const market = (label, book, value) => ({ label, book, value })

const makeBoardOdds = ({
  spread = '',
  total = '',
  moneyline = '',
  provider = 'ScoresAndOdds board'
}) => ({
  participantOrder: [0, 1],
  markets: [
    ...(spread ? [market('Spread', provider, spread)] : []),
    ...(total ? [market('Total', provider, total)] : []),
    ...(moneyline ? [market('Moneyline', provider, moneyline)] : [])
  ],
  note:
    'Current board snapshot from ScoresAndOdds on the May 11 morning refresh. This sits on top of the deeper model inputs rather than replacing them.',
  provider
})

const makePitcher = (fullName, pitchHand, wins, losses, era, strikeOuts) => ({
  fullName,
  pitchHand,
  wins,
  losses,
  era,
  strikeOuts
})

const pitcherDetail = (pitcher) =>
  `${pitcher.fullName} (${pitcher.pitchHand}HP) | ${pitcher.wins}-${pitcher.losses} | ${pitcher.era} ERA | ${pitcher.strikeOuts} SO`

const standingsContextByTeam = {
  Angels: {
    wins: 16,
    losses: 25,
    winningPercentage: '.390',
    divisionRank: '4',
    gamesBack: '5.5',
    runDifferential: -24,
    streakCode: 'W1',
    divisionLeader: false
  },
  Astros: {
    wins: 16,
    losses: 25,
    winningPercentage: '.390',
    divisionRank: '5',
    gamesBack: '5.5',
    runDifferential: -34,
    streakCode: 'L2',
    divisionLeader: false
  },
  'Blue Jays': {
    wins: 18,
    losses: 22,
    winningPercentage: '.450',
    divisionRank: '3',
    gamesBack: '8.5',
    runDifferential: -12,
    streakCode: 'L1',
    divisionLeader: false
  },
  Dodgers: {
    wins: 24,
    losses: 16,
    winningPercentage: '.600',
    divisionRank: '2',
    gamesBack: '-',
    runDifferential: 69,
    streakCode: 'L2',
    divisionLeader: false
  },
  'D-backs': {
    wins: 19,
    losses: 20,
    winningPercentage: '.487',
    divisionRank: '3',
    gamesBack: '4.5',
    runDifferential: -22,
    streakCode: 'W2',
    divisionLeader: false
  },
  Giants: {
    wins: 16,
    losses: 24,
    winningPercentage: '.400',
    divisionRank: '4',
    gamesBack: '8.0',
    runDifferential: -48,
    streakCode: 'W1',
    divisionLeader: false
  },
  Guardians: {
    wins: 21,
    losses: 21,
    winningPercentage: '.500',
    divisionRank: '1',
    gamesBack: '-',
    runDifferential: -4,
    streakCode: 'L2',
    divisionLeader: true
  },
  Mariners: {
    wins: 19,
    losses: 22,
    winningPercentage: '.463',
    divisionRank: '3',
    gamesBack: '2.5',
    runDifferential: 2,
    streakCode: 'L2',
    divisionLeader: false
  },
  Orioles: {
    wins: 18,
    losses: 23,
    winningPercentage: '.439',
    divisionRank: '4',
    gamesBack: '9.0',
    runDifferential: -41,
    streakCode: 'W1',
    divisionLeader: false
  },
  Rangers: {
    wins: 19,
    losses: 21,
    winningPercentage: '.475',
    divisionRank: '2',
    gamesBack: '2.0',
    runDifferential: -3,
    streakCode: 'W2',
    divisionLeader: false
  },
  Rays: {
    wins: 26,
    losses: 13,
    winningPercentage: '.667',
    divisionRank: '1',
    gamesBack: '-',
    runDifferential: 20,
    streakCode: 'W1',
    divisionLeader: true
  },
  Yankees: {
    wins: 26,
    losses: 15,
    winningPercentage: '.634',
    divisionRank: '2',
    gamesBack: '1.0',
    runDifferential: 73,
    streakCode: 'L3',
    divisionLeader: false
  }
}

const parkContextByHomeTeam = {
  Astros: {
    venueName: 'Daikin Park',
    indexRuns: 98,
    indexHr: 101,
    indexWoba: 99,
    yearRange: '2024-2026'
  },
  'Blue Jays': {
    venueName: 'Rogers Centre',
    indexRuns: 102,
    indexHr: 110,
    indexWoba: 101,
    yearRange: '2024-2026'
  },
  Dodgers: {
    venueName: 'UNIQLO Field at Dodger Stadium',
    indexRuns: 104,
    indexHr: 129,
    indexWoba: 102,
    yearRange: '2024-2026'
  },
  Guardians: {
    venueName: 'Progressive Field',
    indexRuns: 96,
    indexHr: 95,
    indexWoba: 98,
    yearRange: '2024-2026'
  },
  Orioles: {
    venueName: 'Oriole Park at Camden Yards',
    indexRuns: 108,
    indexHr: 114,
    indexWoba: 104,
    yearRange: '2024-2026'
  },
  Rangers: {
    venueName: 'Globe Life Field',
    indexRuns: 85,
    indexHr: 89,
    indexWoba: 92,
    yearRange: '2024-2026'
  }
}

const buildMlbGame = ({
  id,
  away,
  home,
  awayPitcher,
  homePitcher,
  start,
  startMinutes,
  stage,
  spotlight,
  tags,
  summary,
  factors,
  lean,
  swingFactor,
  odds,
  pitcherSourceNote = ''
}) => ({
  id,
  league: 'MLB',
  title: `${away} @ ${home}`,
  start,
  startMinutes,
  stage,
  spotlight,
  tags,
  teamContext: {
    away: standingsContextByTeam[away],
    home: standingsContextByTeam[home]
  },
  parkContext: parkContextByHomeTeam[home] ?? null,
  offenseContext: {
    away: teamOffenseContextByTeam[away] ?? null,
    home: teamOffenseContextByTeam[home] ?? null
  },
  bullpenContext: {
    away: teamBullpenContextByTeam[away] ?? null,
    home: teamBullpenContextByTeam[home] ?? null
  },
  lineupContext: lineupMatchupContextByGame[id] ?? null,
  pitcherSourceNote,
  matchup: [
    {
      side: 'Away',
      name: away,
      detail: pitcherDetail(awayPitcher)
    },
    {
      side: 'Home',
      name: home,
      detail: pitcherDetail(homePitcher)
    }
  ],
  summary,
  factors,
  lean,
  swingFactor,
  odds: makeBoardOdds(odds)
})

const mlbGames = [
  buildMlbGame({
    id: 'angels-guardians',
    away: 'Angels',
    home: 'Guardians',
    awayPitcher: makePitcher('Brent Suter', 'L', 1, 1, '4.03', 22),
    homePitcher: makePitcher('Joey Cantillo', 'L', 2, 1, '3.43', 37),
    start: '3:10 PM PT',
    startMinutes: 910,
    stage: 'Monday opener',
    spotlight: true,
    tags: ['Starter uncertainty', 'Guardians fit edge', 'Bullpen gap'],
    summary:
      'Cleveland has the cleaner full-game script because the Guardians rate better in lineup fit, bullpen follow-through, and general pregame clarity while the Angels side is still carrying listed-starter ambiguity.',
    factors: [
      'The current board is Angels +144 / Guardians -175 with a low 7.5 total, so the market still expects Cleveland to dictate the base game shape.',
      'BallparkPal gave the Guardians a much stronger lineup-vs-lefty fit at +6.31 compared with the Angels at -1.46, which is a real split for this specific matchup.',
      'The Angels bullpen enters at 5.38 ERA and 1.51 WHIP, so even a stable Brent Suter bridge still leaves late-inning leakage risk.'
    ],
    lean:
      'Lean Guardians because the home side has the cleaner starter-to-bullpen chain and the sharper lineup fit once the game gets past the opening turns.',
    swingFactor:
      'Swing factor: whether the Angels final starter plan settles cleanly enough to keep Cleveland from cashing the matchup edge the second time through the order.',
    pitcherSourceNote:
      'MLB probable pitchers still listed the Angels side as TBD on the morning refresh, while the current market board was dealing Brent Suter.',
    odds: {
      spread: 'LAA +1.5 (-149) / CLE -1.5 (+123)',
      total: 'O 7.5 (-102) / U 7.5 (-118)',
      moneyline: 'LAA +144 / CLE -175'
    }
  }),
  buildMlbGame({
    id: 'yankees-orioles',
    away: 'Yankees',
    home: 'Orioles',
    awayPitcher: makePitcher('Ryan Weathers', 'L', 2, 2, '3.03', 45),
    homePitcher: makePitcher('Brandon Young', 'R', 3, 1, '4.35', 14),
    start: '3:35 PM PT',
    startMinutes: 935,
    stage: 'Monday first wave',
    spotlight: true,
    tags: ['Yankees edge', 'Road favorite', 'Skid watch'],
    summary:
      'New York still brings the stronger overall case, but the Yankees recent skid keeps this from being clean autopilot chalk even with a better bullpen and the sharper strikeout profile on the mound.',
    factors: [
      'Weathers carries the deeper miss-bat line with 45 strikeouts and a 3.03 ERA, while Brandon Young enters with a lighter strikeout baseline at 14 and a 4.35 ERA.',
      'The Yankees bullpen is still materially stronger at 3.25 ERA and 1.26 WHIP, which matters if this is a close game by the sixth inning.',
      'Baltimore does get a hitter-friendlier home yard, but the Yankees still own the better lineup grade tonight at +4.62 versus +1.77.'
    ],
    lean:
      'Lean Yankees, but this is a smaller confidence favorite because New York is carrying a three-game losing streak into a road spot.',
    swingFactor:
      'Swing factor: whether the Yankees cash their early lineup edge or let Camden Yards keep Baltimore live into the later innings.',
    odds: {
      spread: 'NYY -1.5 (+102) / BAL +1.5 (-122)',
      total: 'O 9 (+102) / U 9 (-122)',
      moneyline: 'NYY -156 / BAL +129'
    }
  }),
  buildMlbGame({
    id: 'rays-blue-jays',
    away: 'Rays',
    home: 'Blue Jays',
    awayPitcher: makePitcher('Drew Rasmussen', 'R', 2, 1, '2.95', 37),
    homePitcher: makePitcher('Kevin Gausman', 'R', 2, 2, '3.09', 43),
    start: '4:07 PM PT',
    startMinutes: 967,
    stage: 'Monday first wave',
    spotlight: true,
    tags: ['Pitching duel', 'Live dog', 'Tight total'],
    summary:
      'This is one of the cleaner coin-flip MLB boards tonight because the starters are close, Toronto has the hotter recent hit profile, and Tampa still owns the better season baseline and bullpen floor.',
    factors: [
      'The total is only 7.5, which tells you both Rasmussen and Gausman are earning real respect before first pitch.',
      'Toronto is carrying 9.33 hits per game over the last three, while Tampa comes in as the stronger full-season team with the better record and a slightly cleaner bullpen.',
      'BallparkPal leans a little toward the Blue Jays lineup tonight, but the margin is small enough that this still feels like a tradable underdog spot rather than a firm favorite hold.'
    ],
    lean:
      'Lean Rays as the live dog because the overall team profile still looks a touch sturdier than the current price suggests.',
    swingFactor:
      'Swing factor: whether Toronto can turn its recent contact surge into enough early traffic to keep Rasmussen from controlling the tempo.',
    odds: {
      spread: 'TB +1.5 (-207) / TOR -1.5 (+169)',
      total: 'O 7.5 (+104) / U 7.5 (-126)',
      moneyline: 'TB +109 / TOR -131'
    }
  }),
  buildMlbGame({
    id: 'd-backs-rangers',
    away: 'D-backs',
    home: 'Rangers',
    awayPitcher: makePitcher('Michael Soroka', 'R', 4, 2, '4.14', 42),
    homePitcher: makePitcher('Nathan Eovaldi', 'R', 4, 4, '4.15', 47),
    start: '5:05 PM PT',
    startMinutes: 1025,
    stage: 'Monday evening',
    spotlight: false,
    tags: ['Low total', 'Bullpen edge TEX', 'Pitcher-friendly park'],
    summary:
      'Texas gets a slight home lean in a low-event environment because Globe Life still suppresses scoring and the Rangers bullpen is the cleanest late-game unit in this matchup.',
    factors: [
      'Eovaldi and Soroka are basically even on listed ERA, so the 7.5 total and park context matter more than a giant starting-pitcher split.',
      'Texas owns the better bullpen by a real margin at 2.80 ERA and 1.20 WHIP, which is a clean separator in a likely one- or two-run script.',
      'Arizona does bring the better road hit split, so this is not a dead underdog, but the BallparkPal matchup read still leans gently toward Texas.'
    ],
    lean:
      'Lean Rangers because the home bullpen edge is the cleanest full-game separator in a matchup that otherwise runs pretty tight.',
    swingFactor:
      'Swing factor: whether Soroka can keep the game compressed long enough to turn this into a late bullpen coin flip instead of a Texas leverage game.',
    odds: {
      spread: 'ARI +1.5 (-199) / TEX -1.5 (+163)',
      total: 'O 7.5 (-112) / U 7.5 (-108)',
      moneyline: 'ARI +109 / TEX -131'
    }
  }),
  buildMlbGame({
    id: 'mariners-astros',
    away: 'Mariners',
    home: 'Astros',
    awayPitcher: makePitcher('George Kirby', 'R', 4, 2, '2.94', 39),
    homePitcher: makePitcher('Peter Lambert', 'R', 2, 2, '2.42', 23),
    start: '5:10 PM PT',
    startMinutes: 1030,
    stage: 'Monday evening',
    spotlight: true,
    tags: ['Model edge SEA', 'Astros bullpen risk', 'Lineup split'],
    summary:
      'Seattle brings one of the cleaner MLB reads on the board because the Mariners own the stronger lineup fit, the far better bullpen, and enough starter stability to make Houston chase the script.',
    factors: [
      'The Mariners lineup grade is +4.08 tonight while Houston sits at -4.85, which is one of the widest BallparkPal splits on the board.',
      'Houston is still carrying the weakest bullpen profile in this slate at 6.05 ERA, 1.63 WHIP, and 103 walks, which makes late innings especially fragile.',
      'Lambert has pitched better than the market probably expected, but Seattle still gets the more trustworthy full-game chain from Kirby through the bullpen.'
    ],
    lean:
      'Lean Mariners because the matchup context keeps pointing toward Seattle once the game reaches the middle innings.',
    swingFactor:
      'Swing factor: whether Lambert can win enough early count leverage to keep the Astros from handing the ball to that bullpen in a deficit.',
    odds: {
      spread: 'SEA -1.5 (+119) / HOU +1.5 (-143)',
      total: 'O 9 (+100) / U 9 (-120)',
      moneyline: 'SEA -143 / HOU +119'
    }
  }),
  buildMlbGame({
    id: 'giants-dodgers',
    away: 'Giants',
    home: 'Dodgers',
    awayPitcher: makePitcher('Trevor McDonald', 'R', 1, 0, '1.29', 8),
    homePitcher: makePitcher('Roki Sasaki', 'R', 1, 3, '5.97', 26),
    start: '7:10 PM PT',
    startMinutes: 1150,
    stage: 'Monday nightcap',
    spotlight: true,
    tags: ['Dodgers skid', 'Sasaki concern', 'Live dog'],
    summary:
      'Los Angeles still has the stronger roster shell, but the current price looks too rich for a favorite bringing a two-game skid, a struggling listed starter, and a live opponent with a hotter recent contact profile.',
    factors: [
      'The Dodgers are still laying -194, yet Sasaki carries a 5.97 ERA and the Giants arrive with a 10.67 hits-per-game clip over their last three.',
      'San Francisco grades slightly better in the lineup-vs-starter read tonight, which matters when the road dog is also getting plus money in a high-total park.',
      'Los Angeles still owns the better bullpen and the stronger full-season offense, so the favorite case is still real even if it is much less clean than the price implies.'
    ],
    lean:
      'Lean Giants as the live dog if the recent-hit form and Sasaki volatility keep this game from ever settling into a clean Dodgers favorite script.',
    swingFactor:
      'Swing factor: whether Sasaki can finally give Los Angeles a stable first five innings or leave the Dodgers chasing a live Giants dog again.',
    odds: {
      spread: 'SF +1.5 (-131) / LAD -1.5 (+109)',
      total: 'O 9.5 (+102) / U 9.5 (-122)',
      moneyline: 'SF +159 / LAD -194'
    }
  })
]

const basketballGames = [
  {
    id: 'pistons-cavaliers-g4',
    league: 'NBA',
    start: '4:00 PM PT',
    startMinutes: 960,
    title: 'Pistons @ Cavaliers',
    stage: 'East semifinal Game 4',
    spotlight: true,
    tags: ['Series edge DET', 'Home response', 'Live dog'],
    matchup: [
      {
        side: 'Away',
        name: 'Pistons',
        detail: 'Cade Cunningham | Tobias Harris | Duncan Robinson | Leading series 2-1'
      },
      {
        side: 'Home',
        name: 'Cavaliers',
        detail: 'Donovan Mitchell | James Harden | Evan Mobley | Back home after Game 3 win'
      }
    ],
    summary:
      'Detroit still owns the series edge because the Pistons have been cleaner in transition, steadier behind Cade Cunningham, and deeper on the secondary-scoring line, even though Cleveland finally got its answer game at home.',
    factors: [
      'Detroit has outscored Cleveland 109.0 to 104.7 per game in the series and won the first two by repeatedly turning pace and second chances into separation.',
      'Donovan Mitchell is still the biggest pure scorer in the matchup at 29.7 points per game, which is why Cleveland remains dangerous every time the game gets loose.',
      'The price still favors the Cavaliers at home, but the series has already shown the Pistons can win this exact matchup script more than one way.'
    ],
    lean:
      'Lean Pistons as the live dog because the three-game sample still favors their all-around control more than the current price does.',
    swing:
      'Swing factor: whether Cleveland can make this another Mitchell-led efficiency game instead of letting Detroit turn it back into a transition and support-scoring battle.',
    seriesBreakdown: {
      kicker: 'Playoff series to date',
      title: 'Why Detroit still owns the leverage despite the Cleveland bounce-back',
      record: 'Pistons lead 2-1',
      recap:
        'Detroit took the first two games by being the cleaner, more connected team over full possessions. Cleveland finally pushed back in Game 3 behind a huge Donovan Mitchell night at home, but the broader sample still says Cade Cunningham and the Pistons support cast have been more stable from game to game.',
      seriesStats: [
        'DET 109.0 PPG | CLE 104.7 PPG',
        'Cade Cunningham: 25.0 PPG | 9.0 APG',
        'Donovan Mitchell: 29.7 PPG',
        'Fast-break points: DET 13.0 | CLE 6.7'
      ],
      boxScores: [
        {
          label: 'Game 1',
          date: 'May 5, 2026',
          result: 'Pistons 111, Cavaliers 101',
          notes: [
            'Detroit blew the game open with a 37-point first quarter and never trailed by more than a few possessions after that.',
            'The paint scoring was even, but the Pistons won the extra-possession and transition minutes.',
            'Cleveland turned it over 20 times, which fed 31 Pistons points.'
          ],
          leaders: [
            {
              team: 'Pistons leaders',
              lines: [
                'Cade Cunningham: 23 points, 7 assists',
                'Tobias Harris: 20 points',
                'Duncan Robinson: 19 points',
                'Jalen Duren: 11 points, 12 rebounds'
              ]
            },
            {
              team: 'Cavaliers leaders',
              lines: [
                'Donovan Mitchell: 23 points',
                'James Harden: 22 points, 7 assists',
                'Max Strus: 19 points'
              ]
            }
          ]
        },
        {
          label: 'Game 2',
          date: 'May 7, 2026',
          result: 'Pistons 107, Cavaliers 97',
          notes: [
            'Detroit again defended well enough to keep the Cavs under 100 while owning the perimeter shooting battle.',
            'Cleveland actually won the paint and second-chance numbers, but the Pistons were more efficient from the outside and late in possessions.',
            'Mitchell scored 31, yet Detroit still felt more connected across the whole lineup.'
          ],
          leaders: [
            {
              team: 'Pistons leaders',
              lines: [
                'Cade Cunningham: 25 points, 10 assists',
                'Tobias Harris: 21 points',
                'Duncan Robinson: 17 points',
                'Caris LeVert: 14 points'
              ]
            },
            {
              team: 'Cavaliers leaders',
              lines: [
                'Donovan Mitchell: 31 points',
                'Jarrett Allen: 22 points',
                'Evan Mobley: 9 points'
              ]
            }
          ]
        },
        {
          label: 'Game 3',
          date: 'May 9, 2026',
          result: 'Cavaliers 116, Pistons 109',
          notes: [
            'Cleveland finally got its home-floor response behind a 35-point Mitchell game and much better overall efficiency.',
            'Detroit still got a triple-double from Cunningham and 60 paint points, so the game never stopped being live.',
            'This was the first real proof that the Cavaliers can punish the Pistons without fully winning the transition script.'
          ],
          leaders: [
            {
              team: 'Cavaliers leaders',
              lines: [
                'Donovan Mitchell: 35 points, 10 rebounds',
                'James Harden: 19 points, 7 assists',
                'Jarrett Allen: 18 points'
              ]
            },
            {
              team: 'Pistons leaders',
              lines: [
                'Cade Cunningham: 27 points, 10 rebounds, 10 assists',
                'Tobias Harris: 21 points',
                'Paul Reed: 11 points'
              ]
            }
          ]
        }
      ],
      playerAnalysis: [
        'Cade Cunningham has been the most complete engine in the series at 25.0 points and 9.0 assists per game, which is why Detroit keeps finding organized possessions even after Cleveland runs.',
        'Tobias Harris and Duncan Robinson have both been reliable enough scoring behind Cade to keep Detroit from being a one-star offense.',
        'Donovan Mitchell is still the biggest pure shot-making threat in the matchup at 29.7 points per game and just reminded everyone of that with 35 in Game 3.',
        'James Harden has had stronger creation stretches at home, but Cleveland still needs steadier support around Mitchell from game to game.',
        'Detroit has consistently found transition and second-chance routes into the game, which is why the underdog script keeps surviving even when Cleveland lands a scorer outburst.'
      ],
      sources: [
        {
          label: 'NBA playoffs schedule',
          url: 'https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true'
        },
        {
          label: 'Game 1 official PDF box score',
          url: 'https://statsdmz.nba.com/pdfs/20260505/20260505_CLEDET_book.pdf'
        },
        {
          label: 'Game 2 official PDF box score',
          url: 'https://statsdmz.nba.com/pdfs/20260507/20260507_CLEDET_book.pdf'
        },
        {
          label: 'Game 3 official PDF box score',
          url: 'https://statsdmz.nba.com/pdfs/20260509/20260509_DETCLE_book.pdf'
        }
      ]
    },
    odds: makeBoardOdds({
      spread: 'DET +3.5 (-105) / CLE -3.5 (-115)',
      total: 'O 213.5 (-105) / U 213.5 (-115)',
      moneyline: 'DET +140 / CLE -166'
    })
  },
  {
    id: 'thunder-lakers-g4',
    league: 'NBA',
    start: '7:30 PM PT',
    startMinutes: 1170,
    title: 'Thunder @ Lakers',
    stage: 'West semifinal Game 4',
    spotlight: true,
    tags: ['Closeout spot', 'OKC 3-0', 'Lakers desperation'],
    matchup: [
      {
        side: 'Away',
        name: 'Thunder',
        detail: 'Gilgeous-Alexander | Holmgren | Ajay Mitchell | Leading series 3-0'
      },
      {
        side: 'Home',
        name: 'Lakers',
        detail: 'LeBron James | Austin Reaves | Rui Hachimura | Home elimination spot'
      }
    ],
    summary:
      'Oklahoma City has been the clearly better team through three games because the Thunder keep winning the possession battle, the support scoring, and the pace-pressure minutes, leaving the Lakers needing a near-perfect home response just to keep the series alive.',
    factors: [
      'The Thunder are averaging 121.3 points per game in the series while holding the Lakers to 101.7, which is not a one-game blip anymore.',
      'Chet Holmgren and Ajay Mitchell have both cleared 20 points per game in the sample, so Oklahoma City is not relying on a one-man SGA carry job.',
      'Doncic has missed every game of the series so far, which keeps asking LeBron, Reaves, and Rui to solve a defense and pace profile that has not cracked yet.'
    ],
    lean:
      'Lean Thunder because the three-game sample has been too one-sided to ignore even with the Lakers finally getting another home shot.',
    swing:
      'Swing factor: whether the Lakers can finally cut down the turnovers and transition damage enough to make this a real half-court game in the fourth.',
    seriesBreakdown: {
      kicker: 'Playoff series to date',
      title: 'Why Oklahoma City is one win from ending this early',
      record: 'Thunder lead 3-0',
      recap:
        'The series has tilted harder every game. Oklahoma City won the opener with interior control, buried the Lakers in Game 2 by punishing turnovers and support-minute gaps, and then walked into Los Angeles and won Game 3 by 23. The Lakers have had scoring pockets from LeBron, Rui, and Reaves, but they still have not solved the Thunder pace, paint pressure, or depth.',
      seriesStats: [
        'OKC 121.3 PPG | LAL 101.7 PPG',
        'Chet Holmgren: 21.3 PPG | 10.0 RPG',
        'Ajay Mitchell: 20.7 PPG',
        'Lakers turnovers: 17.7 per game'
      ],
      boxScores: [
        {
          label: 'Game 1',
          date: 'May 5, 2026',
          result: 'Thunder 108, Lakers 90',
          notes: [
            'Oklahoma City owned the paint 48-40 and won the second-chance battle 21-11.',
            'The Lakers turned it over 18 times and never found stable half-court rhythm.',
            'Doncic was inactive, which left LeBron carrying the offense from the opening tip.'
          ],
          leaders: [
            {
              team: 'Thunder leaders',
              lines: [
                'Chet Holmgren: 24 points, 12 rebounds',
                'Ajay Mitchell: 18 points',
                'Shai Gilgeous-Alexander: 18 points',
                'Jared McCain: 12 points'
              ]
            },
            {
              team: 'Lakers leaders',
              lines: [
                'LeBron James: 27 points',
                'Rui Hachimura: 18 points',
                'Marcus Smart: 12 points',
                'Deandre Ayton: 10 points, 12 rebounds'
              ]
            }
          ]
        },
        {
          label: 'Game 2',
          date: 'May 7, 2026',
          result: 'Thunder 125, Lakers 107',
          notes: [
            'The Lakers actually won the paint 52-46, but they still gave the game away with 21 turnovers.',
            'Oklahoma City turned those extra possessions into a 14-point fast-break edge and 17 second-chance points.',
            'This was the clearest proof that the Thunder could separate even without a monster SGA scoring load.'
          ],
          leaders: [
            {
              team: 'Thunder leaders',
              lines: [
                'Chet Holmgren: 22 points, 9 rebounds',
                'Shai Gilgeous-Alexander: 22 points',
                'Ajay Mitchell: 20 points',
                'Jared McCain: 18 points'
              ]
            },
            {
              team: 'Lakers leaders',
              lines: [
                'Austin Reaves: 31 points',
                'LeBron James: 23 points',
                'Rui Hachimura: 16 points'
              ]
            }
          ]
        },
        {
          label: 'Game 3',
          date: 'May 9, 2026',
          result: 'Thunder 131, Lakers 108',
          notes: [
            'Oklahoma City walked into Los Angeles and detonated for 131 points on 56.4 percent shooting.',
            'The Thunder won the paint 64-44 and the fast-break battle 19-9, which is exactly the game shape the Lakers have been failing to stop.',
            'Even with the Lakers getting decent shot-making from Rui and Kennard, the game still felt like a Thunder control script once the second half opened.'
          ],
          leaders: [
            {
              team: 'Thunder leaders',
              lines: [
                'Ajay Mitchell: 24 points, 10 assists',
                'Shai Gilgeous-Alexander: 23 points, 9 assists',
                'Chet Holmgren: 18 points, 9 rebounds',
                'Cason Wallace: 16 points'
              ]
            },
            {
              team: 'Lakers leaders',
              lines: [
                'Rui Hachimura: 21 points',
                'LeBron James: 19 points, 8 assists',
                'Luke Kennard: 18 points',
                'Austin Reaves: 17 points'
              ]
            }
          ]
        }
      ],
      playerAnalysis: [
        'Chet Holmgren has been the most consistent interior force in the series at 21.3 points and 10.0 rebounds per game.',
        'Ajay Mitchell has become a real swing piece for Oklahoma City at 20.7 points per game, which makes the Thunder much harder to flatten into an SGA-only offense.',
        'Shai Gilgeous-Alexander has not even needed a full takeover game yet because the Thunder depth has kept landing winning stretches.',
        'LeBron is still producing at 23.0 points per game, but the Lakers have not found enough clean support possessions around him to absorb the Doncic absence.',
        'Rui Hachimura has quietly been one of the Lakers best scorers in the series, while Reaves has alternated between big offense and too many turnover-loaded possessions.',
        'Doncic missing every game of the series remains one of the biggest context drivers in the whole playoff board.'
      ],
      sources: [
        {
          label: 'NBA playoffs schedule',
          url: 'https://www.nba.com/news/2026-nba-playoffs-schedule?hidenav=true'
        },
        {
          label: 'Game 1 official PDF box score',
          url: 'https://statsdmz.nba.com/pdfs/20260505/20260505_LALOKC_book.pdf'
        },
        {
          label: 'Game 2 official PDF box score',
          url: 'https://statsdmz.nba.com/pdfs/20260507/20260507_LALOKC_book.pdf'
        },
        {
          label: 'Game 3 official PDF box score',
          url: 'https://statsdmz.nba.com/pdfs/20260509/20260509_OKCLAL_book.pdf'
        }
      ]
    },
    odds: makeBoardOdds({
      spread: 'OKC -11.5 (-105) / LAL +11.5 (-115)',
      total: 'O 214.5 (-112) / U 214.5 (-108)',
      moneyline: 'OKC -520 / LAL +390'
    })
  }
]

const modeledGames = [
  ...mlbGames.map((game) => createSportsMatchModel(game, game.odds.provider)),
  ...basketballGames.map((game) => createSportsMatchModel(game, game.odds.provider))
]

export const games = modeledGames.sort(
  (left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title)
)

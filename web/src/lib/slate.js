import { createSportsMatchModel } from './app-sports-model.js'

export const slateMeta = {
  title: 'Saturday Slate',
  date: 'May 9, 2026',
  isoDate: '2026-05-09',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A one-page board for every matchup from the provided sports slate, grouped by league and written for quick scan plus deeper read.',
  notes: [
    'Matchups and listed starters are preserved from the supplied RTF slate.',
    'The UFC board uses the corrected fight list from the follow-up card update, including the added prelim matchups.',
    'Odds are a Covers snapshot from May 9, 2026, between 4:03 PM ET and 4:04 PM ET, so some early or live markets were already partially unavailable.'
  ]
}

export const filters = ['All', 'MLB', 'UFC', 'NBA', 'WNBA']

export const oddsMeta = {
  provider: 'Covers odds boards',
  snapshot: 'May 9, 2026, 4:03 PM ET to 4:04 PM ET',
  note:
    'Each card shows one current book snapshot from the markets Covers exposed at fetch time. Some early MLB games and much of the UFC undercard had partial or missing board data by then.'
}

export const sources = [
  {
    label: 'MLB schedule for May 9, 2026',
    url: 'https://www.mlb.com/schedule/2026-05-09'
  },
  {
    label: 'Covers MLB odds board',
    url: 'https://www.covers.com/sport/baseball/mlb/odds'
  },
  {
    label: 'NBA Thunder vs Lakers Game 3 summary',
    url: 'https://www.nba.com/game/okc-vs-lal-0042500223'
  },
  {
    label: 'NBA Thunder vs Lakers Game 1 box score',
    url: 'https://www.nba.com/game/lal-vs-okc-0042500221/box-score'
  },
  {
    label: 'NBA Thunder vs Lakers Game 2 box score',
    url: 'https://www.nba.com/game/lal-vs-okc-0042500222/box-score'
  },
  {
    label: 'NBA playoffs Thunder-Lakers series page',
    url: 'https://cdn-uat.nba.com/playoffs/2026/west-semifinal-1'
  },
  {
    label: 'Covers NBA odds board',
    url: 'https://www.covers.com/sport/basketball/nba/odds'
  },
  {
    label: 'WNBA Sky vs Fire game summary',
    url: 'https://www.wnba.com/game/1022600006/CHI-vs-PDX'
  },
  {
    label: 'Chicago Sky 2026 schedule release',
    url: 'https://sky.wnba.com/news/chicago-sky-announce-2026-season-schedule'
  },
  {
    label: 'Covers WNBA odds board',
    url: 'https://www.covers.com/sport/basketball/wnba/odds'
  },
  {
    label: 'UFC 328 fight week guide',
    url: 'https://www.ufc.com/ufc-328-fight-week-guide'
  },
  {
    label: 'UFC 328 event card',
    url: 'https://www.ufc.com/event/ufc-328?page=1'
  },
  {
    label: 'Covers UFC odds board',
    url: 'https://www.covers.com/sport/mma/ufc/odds'
  }
]

const market = (label, book, value) => ({ label, book, value })

const makeOdds = (markets, note = '', provider = '', participantOrder = null) => ({
  markets,
  note,
  provider,
  participantOrder
})

const startLabelToMinutes = (label) => {
  const match = label.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)

  if (!match) return Number.POSITIVE_INFINITY

  let hour = Number(match[1]) % 12
  const minute = Number(match[2])

  if (match[3].toUpperCase() === 'PM') hour += 12

  return hour * 60 + minute
}

const ufcConsensusProvider = 'User-supplied multi-book UFC board'
const ufcWinnerOddsNote =
  'Approximate UFC winner prices computed from the non-blank book lines you supplied, using a midpoint-style consensus rather than a single shop snapshot.'

const makeUfcConsensusOdds = (
  approx,
  range,
  note = ufcWinnerOddsNote,
  participantOrder = [0, 1]
) =>
  makeOdds(
    [
      market('Approx winner odds', 'Supplied board consensus', approx),
      market('Range across listed books', 'Supplied board', range)
    ],
    note,
    ufcConsensusProvider,
    participantOrder
  )

const oddsByGameId = {
  'ath-ori': makeOdds([
    market('Moneyline', 'FanDuel', 'ATH -106 / BAL -110'),
    market('Run line', 'FanDuel', 'ATH -1.5 (+146) / BAL +1.5 (-178)'),
    market('Total', 'FanDuel', 'Over 9.5 (-122) / Under 9.5 (+100)')
  ]),
  'was-mia': makeOdds([
    market('Moneyline', 'FanDuel', 'WAS +118 / MIA -138'),
    market('Run line', 'FanDuel', 'WAS +1.5 (-188) / MIA -1.5 (+155)'),
    market('Total', 'FanDuel', 'Over 8.5 (+100) / Under 8.5 (-122)')
  ]),
  'tb-bos': makeOdds(
    [
      market('Moneyline', 'Kalshi Sports', 'TB -111 / BOS -108'),
      market('Run line', 'Covers board', 'Unavailable in accessible feed'),
      market('Total', 'Covers board', 'Unavailable in accessible feed')
    ],
    'At snapshot time the accessible board was only exposing the moneyline for this game.'
  ),
  'hou-cin': makeOdds(
    [
      market('Moneyline', 'Polymarket', 'HOU +134 / CIN -148'),
      market('Run line', 'Covers board', 'Unavailable in accessible feed'),
      market('Total', 'Covers board', 'Unavailable in accessible feed')
    ],
    'At snapshot time the accessible board was only exposing the moneyline for this game.'
  ),
  'col-phi': makeOdds([
    market('Moneyline', 'FanDuel', 'COL +240 / PHI -295'),
    market('Run line', 'FanDuel', 'COL +1.5 (+105) / PHI -1.5 (-126)'),
    market('Total', 'FanDuel', 'Over 8.5 (-105) / Under 8.5 (-115)')
  ]),
  'min-cle': makeOdds([
    market('Moneyline', 'Fanatics Sportsbook', 'MIN +125 / CLE -150'),
    market('Run line', 'Fanatics Sportsbook', 'MIN +1.5 (-170) / CLE -1.5 (+140)'),
    market('Total', 'Fanatics Sportsbook', 'Over 7.5 (-110) / Under 7.5 (-110)')
  ]),
  'chc-tex': makeOdds([
    market('Moneyline', 'FanDuel', 'CHC +110 / TEX -130'),
    market('Run line', 'FanDuel', 'CHC +1.5 (-194) / TEX -1.5 (+160)'),
    market('Total', 'FanDuel', 'Over 8.0 (-115) / Under 8.0 (-105)')
  ]),
  'sea-cws': makeOdds([
    market('Moneyline', 'FanDuel', 'SEA -126 / CHW +108'),
    market('Run line', 'FanDuel', 'SEA -1.5 (+132) / CHW +1.5 (-160)'),
    market('Total', 'FanDuel', 'Over 7.5 (-122) / Under 7.5 (+100)')
  ]),
  'det-kc': makeOdds([
    market('Moneyline', 'Kalshi Sports', 'DET +119 / KC -143'),
    market('Run line', 'DraftKings', 'DET +1.5 (-180) / KC -1.5 (+148)'),
    market('Total', 'DraftKings', 'Over 9.5 (-102) / Under 9.5 (-118)')
  ]),
  'nyy-mil': makeOdds([
    market('Moneyline', 'FanDuel', 'NYY -122 / MIL +104'),
    market('Run line', 'FanDuel', 'NYY -1.5 (+138) / MIL +1.5 (-166)'),
    market('Total', 'FanDuel', 'Over 8.0 (-115) / Under 8.0 (-105)')
  ]),
  'stl-sd': makeOdds([
    market('Moneyline', 'FanDuel', 'STL +116 / SD -136'),
    market('Run line', 'FanDuel', 'STL +1.5 (-192) / SD -1.5 (+158)'),
    market('Total', 'FanDuel', 'Over 8.5 (+100) / Under 8.5 (-122)')
  ]),
  'nym-ari': makeOdds([
    market('Moneyline', 'Novig', 'NYM -104 / AZ +102'),
    market('Run line', 'FanDuel', 'NYM -1.5 (+142) / AZ +1.5 (-184)'),
    market('Total', 'DraftKings', 'Over 9.5 (+100) / Under 9.5 (-120)')
  ]),
  'pit-sf': makeOdds([
    market('Moneyline', 'FanDuel', 'PIT -104 / SF -112'),
    market('Run line', 'FanDuel', 'PIT -1.5 (+158) / SF +1.5 (-192)'),
    market('Total', 'FanDuel', 'Over 8.5 (+100) / Under 8.5 (-122)')
  ]),
  'atl-lad': makeOdds([
    market('Moneyline', 'FanDuel', 'ATL +124 / LAD -146'),
    market('Run line', 'FanDuel', 'ATL +1.5 (-164) / LAD -1.5 (+136)'),
    market('Total', 'FanDuel', 'Over 9.5 (+100) / Under 9.5 (-122)')
  ]),
  'carpenter-ochoa': makeUfcConsensusOdds(
    'Ochoa -180 / Carpenter +150',
    'Ochoa -188 to -163 / Carpenter +140 to +156',
    ufcWinnerOddsNote,
    [1, 0]
  ),
  'susurkaev-santos': makeUfcConsensusOdds(
    'Susurkaev -800 / Santos +540',
    'Susurkaev -800 to -770 / Santos +500 to +572'
  ),
  'sabatini-gomis': makeUfcConsensusOdds(
    'Sabatini -175 / Gomis +140',
    'Sabatini -177 to -150 / Gomis +134 to +148'
  ),
  'kopylov-tulio': makeUfcConsensusOdds(
    'Tulio -186 / Kopylov +150',
    'Tulio -194 to -170 / Kopylov +150 to +163',
    ufcWinnerOddsNote,
    [1, 0]
  ),
  'miller-gordon': makeUfcConsensusOdds(
    'Gordon -280 / Miller +225',
    'Gordon -295 to -245 / Miller +210 to +235',
    ufcWinnerOddsNote,
    [1, 0]
  ),
  'dawson-rebecki': makeUfcConsensusOdds(
    'Dawson -146 / Rebecki +120',
    'Dawson -150 to -133 / Rebecki +118 to +127'
  ),
  'alvarez-amosov': makeUfcConsensusOdds(
    'Amosov -182 / Alvarez +150',
    'Amosov -191 to -175 / Alvarez +140 to +170',
    ufcWinnerOddsNote,
    [1, 0]
  ),
  'sky-fire': makeOdds([
    market('Moneyline', 'Caesars', 'CHI -240 / PDX +196'),
    market('Spread', 'Caesars', 'CHI -5.5 (-110) / PDX +5.5 (-110)'),
    market('Total', 'Caesars', 'Over 163.5 (-115) / Under 163.5 (-105)')
  ]),
  'thunder-lakers': makeOdds([
    market('Moneyline', 'DraftKings', 'OKC -375 / LAL +295'),
    market('Spread', 'DraftKings', 'OKC -8.5 (-110) / LAL +8.5 (-110)'),
    market('Total', 'DraftKings', 'Over 210.5 (-110) / Under 210.5 (-110)')
  ]),
  'gautier-diaz': makeUfcConsensusOdds(
    'Gautier -1400 / Diaz +775',
    'Gautier -1430 to -970 / Diaz +683 to +850'
  ),
  'green-stephens': makeUfcConsensusOdds(
    'Green -405 / Stephens +315',
    'Green -440 to -376 / Stephens +300 to +355'
  ),
  'brady-buckley': makeUfcConsensusOdds(
    'Buckley -219 / Brady +185',
    'Buckley -235 to -110 / Brady -120 to +190',
    'This board is wider than most of the UFC slate because Caesars sat near pick\'em while the rest of the listed books leaned much more clearly toward Buckley.',
    [1, 0]
  ),
  'volkov-cortes-acosta': makeUfcConsensusOdds(
    'Volkov -141 / Cortes-Acosta +118',
    'Volkov -150 to -125 / Cortes-Acosta +105 to +124'
  ),
  'van-taira': makeUfcConsensusOdds(
    'Taira -162 / Van +135',
    'Taira -175 to -150 / Van +128 to +144',
    ufcWinnerOddsNote,
    [1, 0]
  ),
  'chimaev-strickland': makeUfcConsensusOdds(
    'Chimaev -500 / Strickland +397',
    'Chimaev -590 to -400 / Strickland +350 to +425'
  )
}

const rawGames = [
  {
    id: 'ath-ori',
    league: 'MLB',
    start: '1:05 PM PT',
    title: 'Athletics @ Orioles',
    stage: 'Early window',
    spotlight: false,
    confidence: 63,
    volatility: 58,
    tags: ['Listed probable starters', 'Command matchup'],
    matchup: [
      {
        side: 'Away',
        name: 'Athletics',
        detail: 'Aaron Civale (RHP) | 3-1 | 2.95 ERA | 27 SO'
      },
      {
        side: 'Home',
        name: 'Orioles',
        detail: 'Shane Baz (RHP) | 1-3 | 4.99 ERA | 33 SO'
      }
    ],
    summary:
      'This looks like a command-versus-ceiling game. Civale has the steadier run prevention profile, while Baz brings the louder strikeout upside but also more inning-to-inning turbulence.',
    factors: [
      'Civale is the cleaner first-five profile because the ERA and record suggest fewer self-inflicted counts.',
      'Baz can still steal the game if the fastball shape carries, because his strikeout volume is the best pure bat-missing number in this matchup.',
      'If neither lineup strings together traffic early, one mistake over the middle could decide the entire script.'
    ],
    lean: 'Lean Athletics in a tighter, lower-scoring script.',
    swing: 'Swing factor: whether Baz gets ahead often enough to turn the game into a strikeout contest.'
  },
  {
    id: 'was-mia',
    league: 'MLB',
    start: '1:10 PM PT',
    title: 'Nationals @ Marlins',
    stage: 'Early window',
    spotlight: false,
    confidence: 58,
    volatility: 49,
    tags: ['Pitching efficiency', 'Contact game'],
    matchup: [
      {
        side: 'Away',
        name: 'Nationals',
        detail: 'Richard Lovelady (LHP) | 2-1 | 2.40 ERA | 14 SO'
      },
      {
        side: 'Home',
        name: 'Marlins',
        detail: 'Janson Junk (RHP) | 2-3 | 2.82 ERA | 27 SO'
      }
    ],
    summary:
      'This one feels more about traffic management than raw dominance. Lovelady brings the better ERA, but Junk has the stronger strikeout count and a little more room to pitch out of trouble on his own.',
    factors: [
      'The handedness split matters because both starters can change the game rhythm by forcing lineup adjustments early.',
      'Junk has the better miss-bat profile, which usually matters more once runners reach.',
      'Because both ERAs are under 3.00, run support may be a later-inning problem rather than an opening-frame problem.'
    ],
    lean: 'Lean Marlins by a hair if Junk keeps the walk total under control.',
    swing: 'Swing factor: whether Washington can force Lovelady through the order a third time on its terms.'
  },
  {
    id: 'tb-bos',
    league: 'MLB',
    start: '1:10 PM PT',
    title: 'Rays @ Red Sox',
    stage: 'Early window',
    spotlight: false,
    confidence: 61,
    volatility: 52,
    tags: ['Sharp starter duel', 'Left-right contrast'],
    matchup: [
      {
        side: 'Away',
        name: 'Rays',
        detail: 'Nick Martinez (RHP) | 3-1 | 1.71 ERA | 28 SO'
      },
      {
        side: 'Home',
        name: 'Red Sox',
        detail: 'Payton Tolle (LHP) | 1-1 | 2.04 ERA | 23 SO'
      }
    ],
    summary:
      'This is one of the cleaner pitching games on the slate. Martinez has the best ERA on the board, but Tolle gives Boston the left-handed look and enough swing-and-miss to keep the matchup honest.',
    factors: [
      'Martinez is the safer first-five anchor because 1.71 ERA usually means the damage clusters have been tiny.',
      'Tolle can flip the script if the left-on-right angle keeps Tampa from getting comfortable lift.',
      'Neither side looks built for a slugfest based on the listed starters, so sequencing should matter more than total base hits.'
    ],
    lean: 'Lean Rays, but only slightly because the home lefty wrinkle matters.',
    swing: 'Swing factor: whether Tolle turns enough counts into chase counts instead of contact counts.'
  },
  {
    id: 'hou-cin',
    league: 'MLB',
    start: '1:10 PM PT',
    title: 'Astros @ Reds',
    stage: 'Early window',
    spotlight: true,
    confidence: 72,
    volatility: 64,
    tags: ['Best MLB starter duel', 'Strikeout upside'],
    matchup: [
      {
        side: 'Away',
        name: 'Astros',
        detail: 'Spencer Arrighetti (RHP) | 4-0 | 1.96 ERA | 25 SO'
      },
      {
        side: 'Home',
        name: 'Reds',
        detail: 'Chase Burns (RHP) | 3-1 | 2.20 ERA | 46 SO'
      }
    ],
    summary:
      'This is the most electric mound matchup in the MLB portion of the slate. Arrighetti brings the cleaner run-prevention line, but Burns has a huge strikeout edge and the kind of stuff that can erase traffic immediately.',
    factors: [
      'Burns has the swing-and-miss edge by a wide margin, which gives Cincinnati the higher single-game ceiling.',
      'Arrighetti has not lost yet in the listed sample, so Houston has the steadier tone if the game becomes a patience test.',
      'If either starter gets pulled early, the advantage probably shifts to whichever offense already forced stress pitches by the third inning.'
    ],
    lean: 'Lean Reds in a true coin-flip because Burns has the loudest put-away gear.',
    swing: 'Swing factor: can Houston avoid two-strike damage often enough to make Burns work deep counts?'
  },
  {
    id: 'col-phi',
    league: 'MLB',
    start: '3:05 PM PT',
    title: 'Rockies @ Phillies',
    stage: 'Midday window',
    spotlight: false,
    confidence: 69,
    volatility: 68,
    tags: ['Bounce-back spot', 'Run-scoring risk'],
    matchup: [
      {
        side: 'Away',
        name: 'Rockies',
        detail: 'Kyle Freeland (LHP) | 1-3 | 5.04 ERA | 24 SO'
      },
      {
        side: 'Home',
        name: 'Phillies',
        detail: 'Aaron Nola (RHP) | 2-3 | 5.06 ERA | 40 SO'
      }
    ],
    summary:
      'The ERA lines say danger, but the strikeout gap still gives Nola the more believable recovery path. Freeland can survive with weak contact, yet this profile looks more fragile if the Phillies force hard contact early.',
    factors: [
      'Nola has the better escape hatch because 40 strikeouts can cover for early traffic in a way 24 usually cannot.',
      'Freeland probably needs efficiency and ground-ball rhythm; a deep-count version of this game favors Philadelphia.',
      'Because both listed ERAs are above 5.00, this card carries one of the bigger over-game feels on the board.'
    ],
    lean: 'Lean Phillies, mostly on bat-missing edge and home scoring ceiling.',
    swing: 'Swing factor: whether Nola actually turns his strikeout volume into shutdown innings instead of scatter.'
  },
  {
    id: 'min-cle',
    league: 'MLB',
    start: '3:10 PM PT',
    title: 'Twins @ Guardians',
    stage: 'Midday window',
    spotlight: false,
    confidence: 66,
    volatility: 54,
    tags: ['Division feel', 'Starter trust'],
    matchup: [
      {
        side: 'Away',
        name: 'Twins',
        detail: 'Joe Ryan (RHP) | 2-3 | 3.72 ERA | 40 SO'
      },
      {
        side: 'Home',
        name: 'Guardians',
        detail: 'Tanner Bibee (RHP) | 0-5 | 4.58 ERA | 36 SO'
      }
    ],
    summary:
      'The records tell the story fast here: Ryan looks more stable, Bibee looks stuck fighting uphill. The strikeout counts are close enough that stuff is not the issue; consistency is.',
    factors: [
      'Ryan enters with the better ERA and the better record, which makes Minnesota the cleaner side when projecting a normal script.',
      'Bibee still has enough strikeout volume to create a rebound case if he wins the first trip through the order.',
      'If Cleveland falls behind early, the pressure shifts onto a starter who has not shown much margin for error in the listed sample.'
    ],
    lean: 'Lean Twins unless Bibee finds a sharper first-pitch strike rhythm immediately.',
    swing: 'Swing factor: whether Bibee can turn his stuff quality into quick innings before the game starts speeding up.'
  },
  {
    id: 'chc-tex',
    league: 'MLB',
    start: '4:05 PM PT',
    title: 'Cubs @ Rangers',
    stage: 'Late afternoon',
    spotlight: false,
    confidence: 71,
    volatility: 57,
    tags: ['Starter edge', 'Upset watch'],
    matchup: [
      {
        side: 'Away',
        name: 'Cubs',
        detail: 'Edward Cabrera (RHP) | 3-0 | 3.27 ERA | 37 SO'
      },
      {
        side: 'Home',
        name: 'Rangers',
        detail: 'Jack Leiter (RHP) | 1-3 | 5.45 ERA | 43 SO'
      }
    ],
    summary:
      'Cabrera is the calmer projection, Leiter is the volatility play. Leiter has enough strikeout juice to explode upward, but the ERA and record combination make him harder to trust over a full start.',
    factors: [
      'Cabrera has the stronger baseline because he has paired a winning record with acceptable run prevention.',
      'Leiter can steal the game outright if the strikeout number is the real signal and the ERA is just noise.',
      'Texas probably needs the punchout version of Leiter, not the traffic-and-labor version, to control the middle innings.'
    ],
    lean: 'Lean Cubs because the safer starter line is hard to ignore.',
    swing: 'Swing factor: whether Leiter turns those 43 strikeouts into early count leverage instead of bailout attempts.'
  },
  {
    id: 'sea-cws',
    league: 'MLB',
    start: '4:10 PM PT',
    title: 'Mariners @ White Sox',
    stage: 'Late afternoon',
    spotlight: false,
    confidence: 57,
    volatility: 76,
    tags: ['Chaos meter high', 'Rebound candidate'],
    matchup: [
      {
        side: 'Away',
        name: 'Mariners',
        detail: 'Luis Castillo (RHP) | 0-3 | 6.29 ERA | 31 SO'
      },
      {
        side: 'Home',
        name: 'White Sox',
        detail: 'Anthony Kay (LHP) | 1-1 | 5.70 ERA | 20 SO'
      }
    ],
    summary:
      'This is not a clean trust game for either side. Castillo has the better strikeout total and the bigger name-recognition ceiling, but the listed ERA says the floor has been ugly; Kay is less explosive and not exactly steady himself.',
    factors: [
      'Seattle has the higher bounce-back appeal because Castillo still owns the superior bat-missing line.',
      'Chicago can pressure the game by turning it into a contact-and-count grind rather than a stuff contest.',
      'This is one of the clearest volatility games on the slate because both starters arrive with damage already on their cards.'
    ],
    lean: 'Lean Mariners because Castillo still has the more believable path to six usable innings.',
    swing: 'Swing factor: whether Castillo rediscovers finish-pitch command or stays in survival mode.'
  },
  {
    id: 'det-kc',
    league: 'MLB',
    start: '4:10 PM PT',
    title: 'Tigers @ Royals',
    stage: 'Late afternoon',
    spotlight: false,
    confidence: 62,
    volatility: 44,
    tags: ['Quietly solid game', 'Low-drama projection'],
    matchup: [
      {
        side: 'Away',
        name: 'Tigers',
        detail: 'Burch Smith (RHP) | 0-1 | 1.59 ERA | 16 SO'
      },
      {
        side: 'Home',
        name: 'Royals',
        detail: 'Michael Wacha (RHP) | 3-2 | 3.05 ERA | 36 SO'
      }
    ],
    summary:
      'This matchup has a sneaky balance to it. Smith has the prettier ERA, but the workload indicators still push some trust back toward Wacha because of the stronger strikeout volume and more complete resume feel.',
    factors: [
      'Smith has been excellent at run suppression, but the strikeout count leaves less margin if batted-ball luck turns.',
      'Wacha carries the more self-sustaining profile because he can finish innings without needing as much contact help.',
      'This game feels more likely to stay within one or two runs than to swing wildly in either direction.'
    ],
    lean: 'Lean Royals because Wacha is easier to project across six innings.',
    swing: 'Swing factor: whether Smith keeps runners off enough to protect the lower-strikeout profile.'
  },
  {
    id: 'nyy-mil',
    league: 'MLB',
    start: '4:10 PM PT',
    title: 'Yankees @ Brewers',
    stage: 'Late afternoon',
    spotlight: true,
    confidence: 68,
    volatility: 56,
    tags: ['Premium pitching line', 'National window feel'],
    matchup: [
      {
        side: 'Away',
        name: 'Yankees',
        detail: 'Cam Schlittler (RHP) | 5-1 | 1.52 ERA | 53 SO'
      },
      {
        side: 'Home',
        name: 'Brewers',
        detail: 'Kyle Harrison (LHP) | 3-1 | 2.12 ERA | 35 SO'
      }
    ],
    summary:
      'This is another marquee pitching matchup, but the listed numbers give New York the cleaner edge. Schlittler has the best combined record, ERA, and strikeout profile of the two, while Harrison still offers a strong left-handed counter with less pure dominance.',
    factors: [
      'Schlittler is carrying ace-level numbers in the provided slate and deserves the first nod on raw form.',
      'Harrison gives Milwaukee a tactical edge if the Yankees struggle to square the left-handed lane early.',
      'Because both starters arrive hot, bullpen execution and one timely extra-base hit may decide the final margin.'
    ],
    lean: 'Lean Yankees, but this projects more like a strong duel than a runaway.',
    swing: 'Swing factor: whether Harrison turns the handedness advantage into soft contact instead of free passes.'
  },
  {
    id: 'stl-sd',
    league: 'MLB',
    start: '4:15 PM PT',
    title: 'Cardinals @ Padres',
    stage: 'Late afternoon',
    spotlight: false,
    confidence: 65,
    volatility: 61,
    tags: ['Home edge', 'Mid-tier volatility'],
    matchup: [
      {
        side: 'Away',
        name: 'Cardinals',
        detail: 'Dustin May (RHP) | 3-3 | 5.15 ERA | 25 SO'
      },
      {
        side: 'Home',
        name: 'Padres',
        detail: 'Randy Vasquez (RHP) | 3-1 | 3.20 ERA | 36 SO'
      }
    ],
    summary:
      'Vasquez is carrying the more stable card, and the strikeout gap reinforces it. May can absolutely flash a better raw-inning look, but the slate numbers make San Diego the more dependable projection.',
    factors: [
      'The home starter owns both the ERA and strikeout edge, which is usually enough to control a matchup like this.',
      'May needs quick-count efficiency because the line does not suggest he can survive prolonged traffic.',
      'If the game gets to the sixth inning within one run, the Padres should feel better about the path they used to get there.'
    ],
    lean: 'Lean Padres on the clearer starter advantage.',
    swing: 'Swing factor: whether May can win the first two innings and keep pressure off his own pitch count.'
  },
  {
    id: 'nym-ari',
    league: 'MLB',
    start: '4:15 PM PT',
    title: 'Mets @ Diamondbacks',
    stage: 'Late afternoon',
    spotlight: true,
    confidence: 78,
    volatility: 63,
    tags: ['Largest starter gap', 'Bullpen insurance'],
    matchup: [
      {
        side: 'Away',
        name: 'Mets',
        detail: 'Clay Holmes (RHP) | 4-2 | 1.69 ERA | 31 SO'
      },
      {
        side: 'Home',
        name: 'Diamondbacks',
        detail: 'Merrill Kelly (RHP) | 1-3 | 9.95 ERA | 14 SO'
      }
    ],
    summary:
      'On paper this is one of the clearest MLB leans of the day. Holmes owns the stronger record, far better ERA, and the better strikeout clip, while Kelly enters with almost no statistical cushion.',
    factors: [
      'The ERA gap is enormous, and that usually matters even before any lineup context enters the conversation.',
      'Holmes does not need to be perfect if he simply keeps the game normal; Kelly needs a real form reset to flip the projection.',
      'Arizona likely has to create offense early, because a trailing script asks too much of the listed starter profile.'
    ],
    lean: 'Lean Mets with one of the stronger confidence scores on the board.',
    swing: 'Swing factor: whether Kelly can look like a completely different pitcher for one night and steal the tempo.'
  },
  {
    id: 'pit-sf',
    league: 'MLB',
    start: '6:05 PM PT',
    title: 'Pirates @ Giants',
    stage: 'Evening window',
    spotlight: false,
    confidence: 60,
    volatility: 47,
    tags: ['Even matchup', 'Late-card grinder'],
    matchup: [
      {
        side: 'Away',
        name: 'Pirates',
        detail: 'Braxton Ashcraft (RHP) | 1-2 | 3.02 ERA | 45 SO'
      },
      {
        side: 'Home',
        name: 'Giants',
        detail: 'Landen Roupp (RHP) | 5-2 | 3.18 ERA | 43 SO'
      }
    ],
    summary:
      'This is a good late-night balance game. Ashcraft has a slightly better ERA and slightly more punchouts, but Roupp carries the better win-loss momentum and home setting.',
    factors: [
      'Ashcraft has the sharper strikeout-to-ERA mix if you only care about pitch quality.',
      'Roupp has done the better job finishing games on the correct side, which matters when the profiles are this close.',
      'Expect a game that swings more on one crooked frame than on any sustained offensive wave.'
    ],
    lean: 'Lean Giants narrowly because the overall card is close and home field becomes the tiebreaker.',
    swing: 'Swing factor: whether Ashcraft turns the strikeout edge into early scoreboard control.'
  },
  {
    id: 'atl-lad',
    league: 'MLB',
    start: '6:10 PM PT',
    title: 'Braves @ Dodgers',
    stage: 'Evening window',
    spotlight: true,
    confidence: 64,
    volatility: 81,
    tags: ['Prime-time volatility', 'Big-name uncertainty'],
    matchup: [
      {
        side: 'Away',
        name: 'Braves',
        detail: 'Spencer Strider (RHP) | 0-0 | 8.10 ERA | 6 SO'
      },
      {
        side: 'Home',
        name: 'Dodgers',
        detail: 'Blake Snell (LHP) | 0-0 | -.-- ERA | 0 SO'
      }
    ],
    summary:
      'This is the hardest MLB game to model cleanly because both starter lines are incomplete in different ways. Strider has the tiny sample with ugly run prevention, Snell has effectively no listed sample, which turns this into a talent-and-readiness handicap more than a true stat handicap.',
    factors: [
      'Atlanta gets the more concrete information, even if the early ERA is rough, because at least we have some recorded workload.',
      'Snell creates uncertainty in both directions: elite ceiling if sharp, early-exit risk if the build-up is not all the way there.',
      'This is a game where live context matters more than pregame confidence, especially after the first trip through both lineups.'
    ],
    lean: 'Lean Dodgers slightly on home setting, but this is a low-conviction pregame read.',
    swing: 'Swing factor: which starter looks ready right away rather than needing innings to find timing.'
  },
  {
    id: 'carpenter-ochoa',
    league: 'UFC',
    start: '2:00 PM PT',
    title: 'Clayton Carpenter vs Jose Ochoa',
    stage: 'UFC early prelims',
    spotlight: false,
    confidence: 55,
    volatility: 67,
    tags: ['Flyweight opener', 'Fast pace'],
    matchup: [
      {
        side: 'A side',
        name: 'Clayton Carpenter',
        detail: '8-2 | Flyweight | MMA Lab'
      },
      {
        side: 'B side',
        name: 'Jose Ochoa',
        detail: '8-2 | Flyweight | Peruvian prospect'
      }
    ],
    summary:
      'An opener like this usually comes down to who settles first. Carpenter has a submission-heavy profile, so his cleanest route is forcing scrambles and mat returns rather than playing a pure speed-and-volume kickboxing match.',
    factors: [
      'Both fighters arrive with the same listed record, so the technical route matters more than raw experience count.',
      'Carpenter looks best when he can chain one attack into another instead of winning one-shot exchanges.',
      'Ochoa can make the bout messy if he denies the first grappling layer and forces a striking-only pace.'
    ],
    lean: 'Lean Carpenter if he can turn early level changes into sustained control.',
    swing: 'Swing factor: the first successful scramble sequence, because it will shape the confidence of both corners.'
  },
  {
    id: 'susurkaev-santos',
    league: 'UFC',
    start: '2:30 PM PT',
    title: 'Susurkaev vs Santos',
    stage: 'UFC early prelims',
    spotlight: false,
    confidence: 58,
    volatility: 71,
    tags: ['Unbeaten pressure', 'Prospect test'],
    matchup: [
      {
        side: 'A side',
        name: 'Baysangur Susurkaev',
        detail: '11-0 | Middleweight'
      },
      {
        side: 'B side',
        name: 'Djorden Santos',
        detail: '11-2 | Middleweight'
      }
    ],
    summary:
      'The undefeated mark gives Susurkaev the early narrative edge, but this is still a classic prospect-proof fight. Santos does not need to be prettier minute to minute if he can turn the bout into a rough, momentum-breaking contest.',
    factors: [
      'An unbeaten fighter often enters with cleaner confidence, which matters in the first round.',
      'Santos has enough experience to play spoiler if he can extend exchanges and force resets.',
      'This matchup feels more knockout-sensitive than scorecard-sensitive because both men should hunt momentum aggressively.'
    ],
    lean: 'Lean Susurkaev on confidence and unbeaten pace, but the volatility is high.',
    swing: 'Swing factor: who wins the first sustained exchange in open space rather than along the fence.'
  },
  {
    id: 'sabatini-gomis',
    league: 'UFC',
    start: '3:00 PM PT',
    title: 'Sabatini vs Gomis',
    stage: 'UFC early prelims',
    spotlight: false,
    confidence: 63,
    volatility: 59,
    tags: ['Style clash', 'Grappling test'],
    matchup: [
      {
        side: 'A side',
        name: 'Pat Sabatini',
        detail: '21-5 | Brazilian Jiu-Jitsu | Featherweight'
      },
      {
        side: 'B side',
        name: 'William Gomis',
        detail: '15-3 | Sanda | Southpaw featherweight'
      }
    ],
    summary:
      'This is one of the cleaner UFC style fights on the slate. Sabatini wants control, top time, and repeatable grappling sequences; Gomis wants range, posture, and enough space to make the entries feel expensive.',
    factors: [
      'Sabatini has the clearer specialist path because his best wins usually come from making the fight live on the mat.',
      'Gomis is the longer striker and the southpaw look can complicate timing if Sabatini has to shoot from farther out.',
      'If Gomis survives the first deep grappling sequence, the striking minutes become much more interesting for him.'
    ],
    lean: 'Lean Sabatini if the takedown chain starts early; otherwise the fight tightens fast.',
    swing: 'Swing factor: whether Gomis can force Sabatini to shoot from predictable, distant entries.'
  },
  {
    id: 'kopylov-tulio',
    league: 'UFC',
    start: '3:30 PM PT',
    title: 'Kopylov vs Tulio',
    stage: 'UFC early prelims',
    spotlight: false,
    confidence: 57,
    volatility: 73,
    tags: ['Middleweight danger', 'Kickboxing threat'],
    matchup: [
      {
        side: 'A side',
        name: 'Roman Kopylov',
        detail: '14-5 | Middleweight'
      },
      {
        side: 'B side',
        name: 'Marco Tulio',
        detail: '14-2 | Middleweight'
      }
    ],
    summary:
      'This is the kind of middleweight fight that can look controlled right up until it is not. Kopylov is usually best when he owns the kicking range, but Tulio has the kind of record that suggests he is comfortable fighting through chaos.',
    factors: [
      'Kopylov should want a measured, ranged fight where he can build reads over time.',
      'Tulio benefits if the exchanges become dirtier and the pace becomes about reactions rather than setups.',
      'Both men carry enough finishing threat that a slow start does not remove knockout risk.'
    ],
    lean: 'Lean Kopylov on cleaner range work, but not with much safety.',
    swing: 'Swing factor: whether Tulio can crowd the kicking lane before Kopylov settles into rhythm.'
  },
  {
    id: 'miller-gordon',
    league: 'UFC',
    start: '4:00 PM PT',
    title: 'Miller vs Gordon',
    stage: 'UFC prelims',
    spotlight: false,
    confidence: 54,
    volatility: 52,
    tags: ['Veteran fight', 'Pace management'],
    matchup: [
      {
        side: 'A side',
        name: 'Jim Miller',
        detail: 'Veteran lightweight'
      },
      {
        side: 'B side',
        name: 'Jared Gordon',
        detail: 'Pressure boxer-wrestler'
      }
    ],
    summary:
      'Veteran fights are often about who gets to their preferred speed first. Miller wants moments of control and opportunistic grappling danger, while Gordon is usually at his best when the bout stays in a repeatable, high-effort rhythm.',
    factors: [
      'Miller does not need dominant minutes if he can create one bad defensive choice in transition.',
      'Gordon benefits from volume and pace because it asks the older fighter to answer cleanly for longer stretches.',
      'This matchup probably looks closer on the scorecards than it feels in live momentum swings.'
    ],
    lean: 'Lean Gordon by activity, with real submission danger attached to every scramble.',
    swing: 'Swing factor: whether Miller can turn one clinch or scramble into top control before the cardio pace builds.'
  },
  {
    id: 'dawson-rebecki',
    league: 'UFC',
    start: '4:30 PM PT',
    title: 'Dawson vs Rebecki',
    stage: 'UFC prelims',
    spotlight: true,
    confidence: 66,
    volatility: 62,
    tags: ['Scramble war', 'Control vs pressure'],
    matchup: [
      {
        side: 'A side',
        name: 'Grant Dawson',
        detail: 'Top-position specialist'
      },
      {
        side: 'B side',
        name: 'Mateusz Rebecki',
        detail: 'Pressure-heavy lightweight'
      }
    ],
    summary:
      'This is one of the better action fights below the UFC main card. Dawson is strongest when he can chain takedowns and flatten rounds with control, while Rebecki is built to make every position feel exhausting and urgent.',
    factors: [
      'Dawson has the cleaner path on paper because sustained control usually wins minutes clearly.',
      'Rebecki is the better spoiler if he can deny resets and keep the fight burning at a frantic pace.',
      'Whoever wins the first serious scramble should gain both tactical and emotional leverage.'
    ],
    lean: 'Lean Dawson if he can make the first five minutes look positional instead of chaotic.',
    swing: 'Swing factor: whether Rebecki can force Dawson to wrestle reactively instead of proactively.'
  },
  {
    id: 'alvarez-amosov',
    league: 'UFC',
    start: '5:00 PM PT',
    title: 'Alvarez vs Amosov',
    stage: 'UFC prelims',
    spotlight: false,
    confidence: 60,
    volatility: 65,
    tags: ['Cross-discipline intrigue', 'Welterweight leverage'],
    matchup: [
      {
        side: 'A side',
        name: 'Joel Alvarez',
        detail: '23-3 | Tall, rangy offensive threat'
      },
      {
        side: 'B side',
        name: 'Yaroslav Amosov',
        detail: '29-1 | Elite winning profile'
      }
    ],
    summary:
      'This is a high-intrigue matchup because both men bring a real identity. Alvarez wants length, offense, and ugly reactions from distance, while Amosov arrives with the most polished win-loss profile of the non-title fights.',
    factors: [
      'Amosov carries the stronger macro signal because 29-1 is not accidental over that many appearances.',
      'Alvarez can break structure if his length starts forcing defensive mistakes instead of neutral exchanges.',
      'Transitions matter here more than single shots, because both sides can punish a bad second decision.'
    ],
    lean: 'Lean Amosov on composure and round-to-round dependability.',
    swing: 'Swing factor: whether Alvarez can keep the fight at the edge of his frame instead of inside exchange range.'
  },
  {
    id: 'sky-fire',
    league: 'WNBA',
    start: '5:00 PM PT',
    title: 'Sky @ Fire',
    stage: 'Season opener',
    spotlight: true,
    confidence: 51,
    volatility: 69,
    tags: ['Portland expansion debut', 'Opening-night variance'],
    matchup: [
      {
        side: 'Road',
        name: 'Chicago Sky',
        detail: 'Road opener in a new-look season'
      },
      {
        side: 'Home',
        name: 'Portland Fire',
        detail: 'Expansion debut at Moda Center'
      }
    ],
    summary:
      'Opening-night reads in the WNBA are always messy, and this one is even messier because Portland is making its expansion debut. Chicago has the cleaner continuity edge, but the home crowd and the emotional spike of a franchise opener can flatten normal projections quickly.',
    factors: [
      'The Sky should be the steadier side if the game becomes about half-court execution and avoiding opening-night mistakes.',
      'Portland has the stronger atmosphere edge, and that matters more in a season opener than it would in mid-July.',
      'Injury and rotation uncertainty push this matchup toward feel and composure rather than hard numbers.'
    ],
    lean: 'Lean Sky very slightly on experience, with major respect for the home-opener swing.',
    swing: 'Swing factor: which side settles first when the adrenaline spike wears off in the second quarter.'
  },
  {
    id: 'thunder-lakers',
    league: 'NBA',
    start: '5:30 PM PT',
    title: 'Thunder @ Lakers',
    stage: 'West semifinal Game 3',
    spotlight: true,
    confidence: 75,
    volatility: 64,
    tags: ['OKC leads 2-0', 'Official box-score deep dive'],
    matchup: [
      {
        side: 'Road',
        name: 'Thunder',
        detail: 'Series lead 2-0 | Depth and third-quarter punch'
      },
      {
        side: 'Home',
        name: 'Lakers',
        detail: 'Back home | Urgency spot in Game 3'
      }
    ],
    summary:
      'Oklahoma City has not just gone up 2-0; it has controlled the possession battle and the support-cast minutes. Through two games the Thunder own a 233-197 scoring edge, an 82-35 bench edge, and a 46-30 advantage in points off turnovers, which is why the Lakers now need the home swing plus a much cleaner supporting-game response in Game 3.',
    factors: [
      'The Thunder have been better in the hidden-possession categories: 48.0 rebounds per game to the Lakers\' 42.0, 19.0 second-chance points per game to 8.5, and only 13.0 turnovers per game to the Lakers\' 18.5.',
      'The Lakers have still gotten enough top-end shot creation to believe in a bounce-back, but the margin for error is tiny because LeBron, Reaves, and Hachimura cannot also cover for weak bench minutes and loose ball security.',
      'If Los Angeles cleans up the turnover game and gets even a neutral bench segment, the pressure flips back onto OKC late because this is the first truly hostile game environment of the series.'
    ],
    seriesBreakdown: {
      kicker: 'Last two playoff games',
      title: 'Why Oklahoma City owns the series so far',
      record: 'Thunder lead 2-0',
      recap:
        'The first two games say the same thing in slightly different ways: Oklahoma City has been deeper, cleaner with possessions, and much more dangerous outside of pure star scoring. The Lakers have had enough individual offense to stay alive in stretches, but OKC keeps winning the bench minutes, the scramble minutes, and the extra-possession minutes.',
      seriesStats: [
        'OKC 116.5 PPG | LAL 98.5 PPG',
        'Bench points: OKC 41.0 | LAL 17.5',
        'Points off turnovers: OKC 23.0 | LAL 15.0',
        'Second-chance points: OKC 19.0 | LAL 8.5'
      ],
      boxScores: [
        {
          label: 'Game 1',
          date: 'May 5, 2026',
          result: 'Thunder 108, Lakers 90',
          notes: [
            'OKC won the rebound margin 50-47 and the second-chance battle 21-11.',
            'The Thunder bench outscored the Lakers bench 34-15.',
            'Los Angeles shot only 41.2 percent and got just 8 points from Austin Reaves.'
          ],
          leaders: [
            {
              team: 'Thunder leaders',
              lines: [
                'Chet Holmgren: 24 points, 12 rebounds, 3 blocks',
                'Shai Gilgeous-Alexander: 18 points, 6 assists',
                'Ajay Mitchell: 18 points, 4 assists'
              ]
            },
            {
              team: 'Lakers leaders',
              lines: [
                'LeBron James: 27 points, 6 assists on 12-of-17 shooting',
                'Rui Hachimura: 18 points, 3 made threes',
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
            'OKC forced 20 Lakers turnovers and turned them into 26 points.',
            'The Thunder bench detonated for 48 points, compared with 20 for Los Angeles.',
            'The Lakers shot 50.0 percent overall and still lost by 18, which tells you how much the possession gap hurt.'
          ],
          leaders: [
            {
              team: 'Thunder leaders',
              lines: [
                'Chet Holmgren: 22 points, 9 rebounds, 4 steals, 2 blocks',
                'Shai Gilgeous-Alexander: 22 points',
                'Ajay Mitchell: 20 points, 6 assists'
              ]
            },
            {
              team: 'Lakers leaders',
              lines: [
                'Austin Reaves: 31 points, 6 assists',
                'LeBron James: 23 points, 6 assists, 3 steals',
                'Rui Hachimura: 16 points, 4 made threes'
              ]
            }
          ]
        }
      ],
      playerAnalysis: [
        'Chet Holmgren has been the cleanest matchup winner in the series. He is averaging 23.0 points and 10.5 rebounds on 57.1 percent shooting, while also protecting the rim and creating defensive events all over the floor.',
        'LeBron James has given the Lakers a real scoring base at 25.0 points and 6.0 assists per game, but OKC has largely survived those minutes because it is winning the non-LeBron possessions so decisively.',
        'Austin Reaves swung from 8 points on 3-of-16 shooting in Game 1 to 31 points in Game 2. That jump matters because it shows the Lakers can still create offense, but it also shows how little room they have for an off night from a primary creator.',
        'Ajay Mitchell and Jared McCain have changed the texture of the series. Mitchell is at 19.0 points and 5.0 assists per game, while McCain has hit 8 of 10 threes across the two wins.',
        'Across Games 1 and 2, Luka Doncic was unavailable, which forced more creation burden onto LeBron and Reaves and made OKC\'s pressure on the ball more valuable every time the Lakers had to play into late-clock situations.',
        'Deandre Ayton\'s rebounding has held up at 11.0 boards per game, but his 6.5 points on 6-of-19 shooting leaves the Lakers without enough payoff on interior touches when OKC shrinks the floor.'
      ],
      sources: [
        {
          label: 'Game 1 official NBA box score',
          url: 'https://www.nba.com/game/lal-vs-okc-0042500221/box-score'
        },
        {
          label: 'Game 2 official NBA box score',
          url: 'https://www.nba.com/game/lal-vs-okc-0042500222/box-score'
        }
      ]
    },
    lean: 'Lean Thunder on team-level reliability, but this is a live underdog spot for the Lakers.',
    swing: 'Swing factor: whether the Lakers can keep OKC from owning the third quarter again.'
  },
  {
    id: 'gautier-diaz',
    league: 'UFC',
    start: '5:30 PM PT',
    title: 'Gautier vs Diaz',
    stage: 'UFC prelims',
    spotlight: false,
    confidence: 62,
    volatility: 74,
    tags: ['Prospect power', 'Middleweight danger'],
    matchup: [
      {
        side: 'A side',
        name: 'Ateba Gautier',
        detail: '10-1 | Middleweight | Fight-week spotlight'
      },
      {
        side: 'B side',
        name: 'Ozzy Diaz',
        detail: '10-3 | Middleweight'
      }
    ],
    summary:
      'Gautier feels like the upside side in this matchup because his build-up has been more prospect-centric and the physicality flashes are hard to miss. Diaz still has the right spoiler profile if he survives the initial danger and forces longer reads.',
    factors: [
      'Gautier benefits if the fight stays explosive and reaction-based rather than tactical and layered.',
      'Diaz wants to make the favorite answer second and third questions instead of winning only the first exchange.',
      'This is a card where one clean connection could rewrite the entire projection immediately.'
    ],
    lean: 'Lean Gautier because the upside moments look sharper.',
    swing: 'Swing factor: whether Diaz can push the fight beyond the first rush and make it a composure test.'
  },
  {
    id: 'green-stephens',
    league: 'UFC',
    start: '6:00 PM PT',
    title: 'Green vs Stephens',
    stage: 'UFC main card opener',
    spotlight: false,
    confidence: 59,
    volatility: 72,
    tags: ['Veteran violence', 'Main-card crowd fight'],
    matchup: [
      {
        side: 'A side',
        name: 'King Green',
        detail: '34-17-1 | BJJ and MMA craft'
      },
      {
        side: 'B side',
        name: 'Jeremy Stephens',
        detail: '29-22 | Striker with raw power'
      }
    ],
    summary:
      'This is built for crowd noise. Green has the better all-around toolkit and can win the fight in more than one phase, but Stephens does not need many clean looks to flip a lightweight bout violently.',
    factors: [
      'Green has the broader decision tree, which matters if the fight becomes layered instead of reckless.',
      'Stephens is the cleaner single-shot danger and can punish every lazy exit.',
      'Experience matters less here than discipline, because both men have seen enough to know exactly what can go wrong.'
    ],
    lean: 'Lean Green if he keeps the fight technical and mixes phases.',
    swing: 'Swing factor: whether Stephens can force pocket exchanges instead of chasing long stretches.'
  },
  {
    id: 'brady-buckley',
    league: 'UFC',
    start: '6:40 PM PT',
    title: 'Brady vs Buckley',
    stage: 'UFC main card',
    spotlight: true,
    confidence: 67,
    volatility: 68,
    tags: ['Wrestling vs power', 'Welterweight hinge fight'],
    matchup: [
      {
        side: 'A side',
        name: 'Sean Brady',
        detail: '18-2 | Control grappler'
      },
      {
        side: 'B side',
        name: 'Joaquin Buckley',
        detail: '21-7 | Explosive striker'
      }
    ],
    summary:
      'This is a clean identity fight. Brady wants body lock sequences, mat time, and control that removes Buckley from his power rhythm; Buckley wants space, bursts, and moments where Brady has to shoot from too far away.',
    factors: [
      'Brady is the safer read because his best path is repeatable and scorecard-friendly.',
      'Buckley is the volatility engine because one clean stretch of open-space striking can end the discussion.',
      'The fight often turns on whether Brady earns respect with the first takedown attempt or gets shrugged off immediately.'
    ],
    lean: 'Lean Brady because the control path is more reliable over three rounds.',
    swing: 'Swing factor: Buckley\'s ability to punish entries before the clinch is fully connected.'
  },
  {
    id: 'volkov-cortes-acosta',
    league: 'UFC',
    start: '7:20 PM PT',
    title: 'Volkov vs Cortes-Acosta',
    stage: 'UFC co-feature slot',
    spotlight: true,
    confidence: 64,
    volatility: 61,
    tags: ['Heavyweight stakes', 'Range vs pressure'],
    matchup: [
      {
        side: 'A side',
        name: 'Alexander Volkov',
        detail: '39-11 | Tall-range heavyweight'
      },
      {
        side: 'B side',
        name: 'Waldo Cortes-Acosta',
        detail: '17-2 | Pressure boxer'
      }
    ],
    summary:
      'Heavyweight fights often reduce to who wins distance, and that is exactly the core question here. Volkov wants range, straight shots, and patient damage; Cortes-Acosta wants to step into the pocket and make the taller man uncomfortable defending in layers.',
    factors: [
      'Volkov has the cleaner minute-winning style if he establishes the jab and long kick game early.',
      'Cortes-Acosta becomes much more dangerous if he can make Volkov plant and trade instead of glide.',
      'Because both men can change the fight with one sequence, scorecard reads matter less than the live range battle.'
    ],
    lean: 'Lean Volkov on cleaner range control and overall craft.',
    swing: 'Swing factor: whether Cortes-Acosta can consistently close the gap without eating straight counters.'
  },
  {
    id: 'van-taira',
    league: 'UFC',
    start: '8:00 PM PT',
    title: 'Van vs Taira',
    stage: 'UFC flyweight title fight',
    spotlight: true,
    confidence: 65,
    volatility: 64,
    tags: ['Title fight', 'Youthful elite matchup'],
    matchup: [
      {
        side: 'Champion',
        name: 'Joshua Van',
        detail: '16-2 | Flyweight champion | Freestyle striking rhythm'
      },
      {
        side: 'Challenger',
        name: 'Tatsuro Taira',
        detail: '18-1 | Long, dynamic grappling threat'
      }
    ],
    summary:
      'This is one of the best technical fights on the whole board. Van brings fast confidence, clean power for the division, and the composure of a champion; Taira brings length, a dangerous submission tree, and the kind of grappling threat that can rewrite any round instantly.',
    factors: [
      'Van is most dangerous if he can keep the exchanges in open space and make Taira reset between attempts.',
      'Taira does not need constant control; he only needs enough entries to make every striking exchange feel risky.',
      'Championship pacing matters, because both fighters are young enough to fight hard early without always revealing the late-round answer.'
    ],
    lean: 'Lean Van slightly on striking confidence and recent championship proof.',
    swing: 'Swing factor: whether Taira can force extended grappling without absorbing too much damage on the way in.'
  },
  {
    id: 'chimaev-strickland',
    league: 'UFC',
    start: '8:45 PM PT',
    title: 'Chimaev vs Strickland',
    stage: 'UFC middleweight title fight',
    spotlight: true,
    confidence: 74,
    volatility: 57,
    tags: ['Main event', 'Champion vs former champion'],
    matchup: [
      {
        side: 'Champion',
        name: 'Khamzat Chimaev',
        detail: '15-0 | Middleweight champion | Elite pressure grappling'
      },
      {
        side: 'Challenger',
        name: 'Sean Strickland',
        detail: '30-7 | Former champion | Volume jab and pace'
      }
    ],
    summary:
      'This is the sharpest championship contrast on the slate. Chimaev owns the more dominant control profile and arrives unbeaten; Strickland brings the kind of volume, jab discipline, and stubborn durability that can drag a favorite into longer, less comfortable rounds.',
    factors: [
      'Chimaev has the stronger A-game and the cleaner path to dictating where the fight happens.',
      'Strickland is most dangerous if he survives the first wave, keeps the fight standing, and turns every minute into a high-repetition decision test.',
      'Five-round fights reward adaptability, so this is not just about the first takedown or first jab battle.'
    ],
    lean: 'Lean Chimaev because his top-end control tools are harder to answer than to describe away.',
    swing: 'Swing factor: whether Strickland can consistently deny the early positional losses that fuel Chimaev\'s confidence.'
  }
]

export const games = rawGames.map((game) => ({
  ...createSportsMatchModel(
    {
      ...game,
      startMinutes: startLabelToMinutes(game.start),
      odds:
        oddsByGameId[game.id] ??
        makeOdds([market('Odds snapshot', 'Covers board', 'No line snapshot was attached for this matchup.')])
    },
    oddsMeta.provider
  )
}))

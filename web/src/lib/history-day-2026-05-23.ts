import type { HistoryGameReview, HistorySportTab } from './history-types'

const game = (entry: HistoryGameReview): HistoryGameReview => entry

const mlbSideGames: HistoryGameReview[] = [
  game({
    id: 'may23-cardinals-reds-g1',
    title: 'Cardinals @ Reds #1',
    start: '10:10 AM PT',
    predicted: 'St. Louis Cardinals',
    confidence: 52,
    actualWinner: 'Cincinnati Reds',
    result: 'miss',
    note: 'FG miss | F5 miss | 1st miss | Edge 6.5 | Path: late_push'
  }),
  game({
    id: 'may23-astros-cubs',
    title: 'Astros @ Cubs',
    start: '11:20 AM PT',
    predicted: 'Houston Astros',
    confidence: 52,
    actualWinner: 'Houston Astros',
    result: 'hit',
    note: 'FG hit | F5 hit | 1st hit | Edge 6.4 | Path: jumped_early_hold'
  }),
  game({
    id: 'may23-pirates-bluejays',
    title: 'Pirates @ Blue Jays',
    start: '12:07 PM PT',
    predicted: 'Pittsburgh Pirates',
    confidence: 52,
    actualWinner: 'Toronto Blue Jays',
    result: 'miss',
    note: 'FG miss | F5 miss | 1st hit | Edge 8.5 | Path: dead_early_loss'
  }),
  game({
    id: 'may23-guardians-phillies',
    title: 'Guardians @ Phillies',
    start: '1:05 PM PT',
    predicted: 'Philadelphia Phillies',
    confidence: 67,
    actualWinner: 'Philadelphia Phillies',
    result: 'hit',
    note: 'FG hit | F5 hit | 1st miss | Edge 7.9 | Path: starter_carried'
  }),
  game({
    id: 'may23-whitesox-giants',
    title: 'White Sox @ Giants',
    start: '1:05 PM PT',
    predicted: 'Chicago White Sox',
    confidence: 52,
    actualWinner: 'San Francisco Giants',
    result: 'miss',
    note: 'FG miss | F5 miss | 1st miss | Edge 10.0 | Path: dead_early_loss'
  }),
  game({
    id: 'may23-mariners-royals',
    title: 'Mariners @ Royals',
    start: '1:10 PM PT',
    predicted: 'Seattle Mariners',
    confidence: 63,
    actualWinner: 'Kansas City Royals',
    result: 'miss',
    note: 'FG miss | F5 miss | 1st hit | Edge 8.6 | Path: dead_early_loss'
  }),
  game({
    id: 'may23-mets-marlins',
    title: 'Mets @ Marlins',
    start: '1:10 PM PT',
    predicted: 'Miami Marlins',
    confidence: 61,
    actualWinner: 'Miami Marlins',
    result: 'hit',
    note: 'FG hit | F5 hit | 1st miss | Edge 3.2 | Path: starter_carried'
  }),
  game({
    id: 'may23-nationals-braves',
    title: 'Nationals @ Braves',
    start: '4:15 PM PT',
    predicted: 'Atlanta Braves',
    confidence: 66,
    actualWinner: 'Washington Nationals',
    result: 'miss',
    note: 'FG miss | F5 miss | 1st miss | Edge 8.9 | Path: dead_early_loss'
  }),
  game({
    id: 'may23-twins-redsox',
    title: 'Twins @ Red Sox',
    start: '4:15 PM PT',
    predicted: 'Minnesota Twins',
    confidence: 52,
    actualWinner: 'Minnesota Twins',
    result: 'hit',
    note: 'FG hit | F5 hit | 1st hit | Edge 0.0 | Path: jumped_early_hold'
  }),
  game({
    id: 'may23-cardinals-reds-g2',
    title: 'Cardinals @ Reds #2',
    start: '4:40 PM PT',
    predicted: 'St. Louis Cardinals',
    confidence: 52,
    actualWinner: 'St. Louis Cardinals',
    result: 'hit',
    note: 'FG hit | F5 hit | 1st miss | Edge 4.5 | Path: late_comeback'
  }),
  game({
    id: 'may23-dodgers-brewers',
    title: 'Dodgers @ Brewers',
    start: '4:40 PM PT',
    predicted: 'Los Angeles Dodgers',
    confidence: 52,
    actualWinner: 'Los Angeles Dodgers',
    result: 'hit',
    note: 'FG hit | F5 hit | 1st hit | Edge 1.0 | Path: late_comeback'
  }),
  game({
    id: 'may23-athletics-padres',
    title: 'Athletics @ Padres',
    start: '6:40 PM PT',
    predicted: 'Athletics',
    confidence: 52,
    actualWinner: 'San Diego Padres',
    result: 'miss',
    note: 'FG miss | F5 miss | 1st hit | Edge 4.9 | Path: dead_early_loss'
  }),
  game({
    id: 'may23-rangers-angels',
    title: 'Rangers @ Angels',
    start: '6:40 PM PT',
    predicted: 'Texas Rangers',
    confidence: 73,
    actualWinner: 'Los Angeles Angels',
    result: 'miss',
    note: 'FG miss | F5 miss | 1st hit | Edge 12.1 | Path: balanced_path'
  }),
  game({
    id: 'may23-rockies-diamondbacks',
    title: 'Rockies @ Diamondbacks',
    start: '7:10 PM PT',
    predicted: 'Arizona Diamondbacks',
    confidence: 52,
    actualWinner: 'Arizona Diamondbacks',
    result: 'hit',
    note: 'FG hit | F5 hit | 1st miss | Edge 3.9 | Path: starter_carried'
  })
]

export const may23HistorySportTabs: HistorySportTab[] = [
  {
    id: 'mlb',
    label: 'MLB',
    summary:
      'May 23 was a dead-early, low-conversion baseball slate. The board mostly failed not because the wrong starters collapsed, but because the predicted side never got going early enough.',
    metrics: [
      { label: 'Full game', value: '7-7', tone: 'warning' },
      { label: 'First 5', value: '7-7', tone: 'warning' },
      { label: '1st inning', value: '7-7', tone: 'warning' },
      { label: 'Top props', value: '3/8', note: 'All were TB over 1.5', tone: 'negative' }
    ],
    sections: [
      { label: 'Side board', games: mlbSideGames }
    ]
  }
]

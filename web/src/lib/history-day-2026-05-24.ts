import type { HistoryGameReview, HistorySportTab } from './history-types'

const game = (entry: HistoryGameReview): HistoryGameReview => entry

const atpGames: HistoryGameReview[] = [
  game({
    id: 'may24-atp-adf-dzumhur',
    title: 'Damir Dzumhur vs Alejandro Davidovich Fokina',
    start: '2:00 AM PT',
    predicted: 'Alejandro Davidovich Fokina',
    confidence: 70,
    crowd: '15 / 87',
    actualWinner: 'Alejandro Davidovich Fokina',
    finalScore: '6-7(3), 6-3, 2-6, 7-5, 6-3',
    result: 'hit'
  }),
  game({
    id: 'may24-atp-duckworth-diallo',
    title: 'James Duckworth vs Gabriel Diallo',
    start: '2:00 AM PT',
    predicted: 'Gabriel Diallo',
    confidence: 62,
    crowd: '39 / 62',
    actualWinner: 'James Duckworth',
    finalScore: '6-3, 4-1 ret.',
    result: 'miss',
    note: 'Retirement loss for the pick.'
  }),
  game({
    id: 'may24-atp-khachanov-gea',
    title: 'Karen Khachanov vs Arthur Gea',
    start: '2:00 AM PT',
    predicted: 'Karen Khachanov',
    confidence: 74,
    crowd: '83 / 18',
    actualWinner: 'Karen Khachanov',
    finalScore: '6-3, 7-6(3), 6-0',
    result: 'hit'
  }),
  game({
    id: 'may24-atp-kecmanovic-marozsan',
    title: 'Miomir Kecmanovic vs Fabian Marozsan',
    start: '2:00 AM PT',
    predicted: 'Miomir Kecmanovic',
    confidence: 58,
    crowd: '60 / 42',
    actualWinner: 'Miomir Kecmanovic',
    finalScore: '7-6(0), 6-3, 6-4',
    result: 'hit'
  }),
  game({
    id: 'may24-atp-llamas-tirante',
    title: 'Pablo Llamas Ruiz vs Thiago Agustin Tirante',
    start: '2:00 AM PT',
    predicted: 'Thiago Agustin Tirante',
    confidence: 54,
    crowd: '47 / 54',
    actualWinner: 'Thiago Agustin Tirante',
    finalScore: '6-3, 7-6(6), 6-7(5), 6-0',
    result: 'hit'
  }),
  game({
    id: 'may24-atp-jacquet-trungelliti',
    title: 'Kyrian Jacquet vs Marco Trungelliti',
    start: '3:30 AM PT',
    predicted: 'Kyrian Jacquet',
    confidence: 57,
    crowd: '57 / 44',
    actualWinner: 'Marco Trungelliti',
    finalScore: '6-4, 6-2, 6-2',
    result: 'miss'
  }),
  game({
    id: 'may24-atp-borges-etcheverry',
    title: 'Nuno Borges vs Tomas Martin Etcheverry',
    start: '4:00 AM PT',
    predicted: 'Tomas Martin Etcheverry',
    confidence: 69,
    crowd: '34 / 68',
    actualWinner: 'Nuno Borges',
    finalScore: '6-3, 6-4, 6-2',
    result: 'miss'
  }),
  game({
    id: 'may24-atp-machac-bergs',
    title: 'Tomas Machac vs Zizou Bergs',
    start: '4:00 AM PT',
    predicted: 'Tomas Machac',
    confidence: 61,
    crowd: '58 / 44',
    actualWinner: 'Tomas Machac',
    finalScore: '6-4, 6-4, 6-3',
    result: 'hit'
  }),
  game({
    id: 'may24-atp-zverev-bonzi',
    title: 'Alexander Zverev vs Benjamin Bonzi',
    start: '4:30 AM PT',
    predicted: 'Alexander Zverev',
    confidence: 79,
    crowd: '96 / 6',
    actualWinner: 'Alexander Zverev',
    finalScore: '6-3, 6-4, 6-2',
    result: 'hit'
  }),
  game({
    id: 'may24-atp-zheng-prizmic',
    title: 'Michael Zheng vs Dino Prizmic',
    start: '5:00 AM PT',
    predicted: 'Dino Prizmic',
    confidence: 71,
    crowd: '18 / 84',
    actualWinner: 'Dino Prizmic',
    finalScore: '6-1, 6-1, 6-3',
    result: 'hit'
  }),
  game({
    id: 'may24-atp-halys-bellucci',
    title: 'Quentin Halys vs Mattia Bellucci',
    start: '5:00 AM PT',
    predicted: 'Mattia Bellucci',
    confidence: 58,
    crowd: '57 / 44',
    actualWinner: 'Quentin Halys',
    finalScore: '6-3, 7-6(4), 6-3',
    result: 'miss'
  }),
  game({
    id: 'may24-atp-droguet-mensik',
    title: 'Titouan Droguet vs Jakub Mensik',
    start: '5:00 AM PT',
    predicted: 'Jakub Mensik',
    confidence: 67,
    crowd: '33 / 68',
    actualWinner: 'Jakub Mensik',
    finalScore: '6-3, 6-2, 6-4',
    result: 'hit'
  }),
  game({
    id: 'may24-atp-cina-opelka',
    title: 'Federico Cina vs Reilly Opelka',
    start: '5:30 AM PT',
    predicted: 'Federico Cina',
    confidence: 61,
    crowd: '65 / 37',
    actualWinner: 'Federico Cina',
    finalScore: '3-6, 6-4, 6-2, 6-7(6), 6-4',
    result: 'hit'
  }),
  game({
    id: 'may24-atp-fritz-basavareddy',
    title: 'Taylor Fritz vs Nishesh Basavareddy',
    start: '5:30 AM PT',
    predicted: 'Taylor Fritz',
    confidence: 66,
    crowd: '80 / 21',
    actualWinner: 'Nishesh Basavareddy',
    finalScore: '7-6(5), 7-6(5), 6-7(9), 6-1',
    result: 'miss'
  }),
  game({
    id: 'may24-atp-pavlovic-fonseca',
    title: 'Luka Pavlovic vs Joao Fonseca',
    start: '7:00 AM PT',
    predicted: 'Joao Fonseca',
    confidence: 75,
    crowd: '9 / 93',
    actualWinner: 'Joao Fonseca',
    finalScore: '7-6(6), 6-4, 6-2',
    result: 'hit'
  }),
  game({
    id: 'may24-atp-royer-dellien',
    title: 'Valentin Royer vs Hugo Dellien',
    start: '7:00 AM PT',
    predicted: 'Hugo Dellien',
    confidence: 60,
    crowd: '44 / 57',
    actualWinner: 'Valentin Royer',
    finalScore: '6-4, 6-2, 6-2',
    result: 'miss'
  }),
  game({
    id: 'may24-atp-hanfmann-medjedovic',
    title: 'Yannick Hanfmann vs Hamad Medjedovic',
    start: '7:00 AM PT',
    predicted: 'Hamad Medjedovic',
    confidence: 63,
    crowd: '35 / 66',
    actualWinner: 'Hamad Medjedovic',
    finalScore: '6-3, 6-4, 6-7(1), 6-4',
    result: 'hit'
  }),
  game({
    id: 'may24-atp-blockx-wong',
    title: 'Alexander Blockx vs Coleman Wong',
    start: '7:00 AM PT',
    predicted: 'Alexander Blockx',
    confidence: 69,
    crowd: '88 / 13',
    actualWinner: 'Alexander Blockx',
    finalScore: '6-3, 6-4, 6-2',
    result: 'hit'
  }),
  game({
    id: 'may24-atp-sonego-herbert',
    title: 'Lorenzo Sonego vs Pierre-Hugues Herbert',
    start: '7:00 AM PT',
    predicted: 'Lorenzo Sonego',
    confidence: 64,
    crowd: '65 / 36',
    actualWinner: 'Lorenzo Sonego',
    finalScore: '7-6(3), 5-7, 6-2, 1-6, 6-4',
    result: 'hit'
  }),
  game({
    id: 'may24-atp-gmp-djokovic',
    title: 'Giovanni Mpetshi Perricard vs Novak Djokovic',
    start: '11:15 AM PT',
    predicted: 'Novak Djokovic',
    confidence: 70,
    crowd: '12 / 89',
    actualWinner: 'Novak Djokovic',
    finalScore: '5-7, 7-5, 6-1, 6-4',
    result: 'hit'
  })
]

const wtaGames: HistoryGameReview[] = [
  game({
    id: 'may24-wta-tagger-wang',
    title: 'Lilli Tagger vs Xinyu Wang',
    start: '2:00 AM PT',
    predicted: 'Xinyu Wang',
    confidence: 52,
    crowd: '60 / 41',
    actualWinner: 'Xinyu Wang',
    finalScore: '6-3, 3-6, 6-4',
    result: 'hit'
  }),
  game({
    id: 'may24-wta-bouzkova-bronzetti',
    title: 'Marie Bouzkova vs Lucia Bronzetti',
    start: '2:00 AM PT',
    predicted: 'Marie Bouzkova',
    confidence: 61,
    crowd: '81 / 20',
    actualWinner: 'Marie Bouzkova',
    finalScore: '6-3, 6-1',
    result: 'hit'
  }),
  game({
    id: 'may24-wta-kostyuk-selekhmeteva',
    title: 'Marta Kostyuk vs Oksana Selekhmeteva',
    start: '2:00 AM PT',
    predicted: 'Marta Kostyuk',
    confidence: 78,
    crowd: '93 / 9',
    actualWinner: 'Marta Kostyuk',
    finalScore: '6-2, 6-3',
    result: 'hit'
  }),
  game({
    id: 'may24-wta-kraus-bencic',
    title: 'Sinja Kraus vs Belinda Bencic',
    start: '3:00 AM PT',
    predicted: 'Belinda Bencic',
    confidence: 63,
    crowd: '21 / 80',
    actualWinner: 'Belinda Bencic',
    finalScore: '6-2, 6-3',
    result: 'hit'
  }),
  game({
    id: 'may24-wta-volynets-burel',
    title: 'Katie Volynets vs Clara Burel',
    start: '3:30 AM PT',
    predicted: 'Clara Burel',
    confidence: 57,
    crowd: '82 / 19',
    actualWinner: 'Katie Volynets',
    finalScore: '6-3, 6-1',
    result: 'miss'
  }),
  game({
    id: 'may24-wta-linette-valentova',
    title: 'Magda Linette vs Tereza Valentova',
    start: '3:30 AM PT',
    predicted: 'Tereza Valentova',
    confidence: 64,
    crowd: '24 / 77',
    actualWinner: 'Magda Linette',
    finalScore: '5-7, 6-4, 7-6(9)',
    result: 'miss'
  }),
  game({
    id: 'may24-wta-krejcikova-baptiste',
    title: 'Barbora Krejcikova vs Hailey Baptiste',
    start: '4:00 AM PT',
    predicted: 'Hailey Baptiste',
    confidence: 61,
    crowd: '46 / 57',
    actualWinner: 'Hailey Baptiste',
    finalScore: '6-7(7), 7-6(6), 6-2',
    result: 'hit'
  }),
  game({
    id: 'may24-wta-jones-haddad-maia',
    title: 'Francesca Jones vs Beatriz Haddad Maia',
    start: '4:00 AM PT',
    predicted: 'Francesca Jones',
    confidence: 56,
    crowd: '62 / 38',
    actualWinner: 'Francesca Jones',
    finalScore: '1-6, 7-6(4), 6-2',
    result: 'hit'
  }),
  game({
    id: 'may24-wta-kenin-stearns',
    title: 'Sofia Kenin vs Peyton Stearns',
    start: '5:30 AM PT',
    predicted: 'Peyton Stearns',
    confidence: 68,
    crowd: '35 / 66',
    actualWinner: 'Peyton Stearns',
    finalScore: '6-3, 6-3',
    result: 'hit'
  }),
  game({
    id: 'may24-wta-korpatsch-sorribes',
    title: 'Tamara Korpatsch vs Sara Sorribes Tormo',
    start: '5:30 AM PT',
    predicted: 'Sara Sorribes Tormo',
    confidence: 55,
    crowd: '57 / 45',
    actualWinner: 'Tamara Korpatsch',
    finalScore: '6-4, 6-2',
    result: 'miss'
  }),
  game({
    id: 'may24-wta-raducanu-sierra',
    title: 'Emma Raducanu vs Solana Sierra',
    start: '6:00 AM PT',
    predicted: 'Solana Sierra',
    confidence: 63,
    crowd: '41 / 60',
    actualWinner: 'Solana Sierra',
    finalScore: '6-0, 7-6(4)',
    result: 'hit'
  }),
  game({
    id: 'may24-wta-ferro-andreeva',
    title: 'Fiona Ferro vs Mirra Andreeva',
    start: '6:30 AM PT',
    predicted: 'Mirra Andreeva',
    confidence: 74,
    crowd: '5 / 96',
    actualWinner: 'Mirra Andreeva',
    finalScore: '6-3, 6-3',
    result: 'hit'
  }),
  game({
    id: 'may24-wta-snigur-tauson',
    title: 'Daria Snigur vs Clara Tauson',
    start: '7:30 AM PT',
    predicted: 'Clara Tauson',
    confidence: 65,
    crowd: '39 / 62',
    actualWinner: 'Daria Snigur',
    finalScore: '3-6, 7-5, 6-2',
    result: 'miss'
  }),
  game({
    id: 'may24-wta-arango-bassols',
    title: 'Emiliana Arango vs Marina Bassols Ribera',
    start: '7:30 AM PT',
    predicted: 'Marina Bassols Ribera',
    confidence: 53,
    crowd: '51 / 50',
    actualWinner: 'Marina Bassols Ribera',
    finalScore: '6-3, 6-4',
    result: 'hit'
  }),
  game({
    id: 'may24-wta-efremova-cirstea',
    title: 'Ksenia Efremova vs Sorana Cirstea',
    start: '7:30 AM PT',
    predicted: 'Sorana Cirstea',
    confidence: 76,
    crowd: '5 / 95',
    actualWinner: 'Sorana Cirstea',
    finalScore: '6-3, 6-1',
    result: 'hit'
  }),
  game({
    id: 'may24-wta-stephens-bejlek',
    title: 'Sloane Stephens vs Sara Bejlek',
    start: '7:30 AM PT',
    predicted: 'Sara Bejlek',
    confidence: 62,
    crowd: '41 / 60',
    actualWinner: 'Sara Bejlek',
    finalScore: '6-3, 6-2',
    result: 'hit'
  })
]

const pendingGames: HistoryGameReview[] = [
  game({
    id: 'may24-atp-sinner-tabur',
    title: 'Jannik Sinner vs Clement Tabur',
    start: 'May 25, 2:00 AM PT',
    predicted: 'Jannik Sinner',
    confidence: 81,
    crowd: '99 / 2',
    result: 'pending',
    note: 'This match was on the board, but it belonged to the next calendar day.'
  })
]

const mlbMorningGames: HistoryGameReview[] = [
  game({
    id: 'may24-mlb-pirates-blue-jays',
    title: 'Pirates @ Blue Jays',
    start: '10:05 AM PT',
    predicted: 'Pittsburgh Pirates',
    confidence: 56,
    actualWinner: 'Pittsburgh Pirates',
    finalScore: '4-1',
    result: 'hit',
    note: 'Pass tier | F5 hit: Pirates led 2-1 after five.'
  }),
  game({
    id: 'may24-mlb-tigers-orioles-g1',
    title: 'Tigers @ Orioles (Game 1)',
    start: '10:05 AM PT',
    predicted: 'Baltimore Orioles',
    confidence: 54,
    actualWinner: 'Baltimore Orioles',
    finalScore: '3-5',
    result: 'hit',
    note: 'Pass tier | F5 miss: Tigers led 2-0 after five.'
  }),
  game({
    id: 'may24-mlb-guardians-phillies',
    title: 'Guardians @ Phillies',
    start: '10:35 AM PT',
    predicted: 'Cleveland Guardians',
    confidence: 74,
    actualWinner: 'Cleveland Guardians',
    finalScore: '3-1',
    result: 'hit',
    note: 'Strong tier | F5 hit: Guardians led 1-0 after five.'
  }),
  game({
    id: 'may24-mlb-rays-yankees',
    title: 'Rays @ Yankees',
    start: '10:35 AM PT',
    predicted: 'Tampa Bay Rays',
    confidence: 55,
    actualWinner: 'New York Yankees',
    finalScore: '0-2',
    result: 'miss',
    note: 'Swingy tier | F5 miss: scoreless tie through five.'
  }),
  game({
    id: 'may24-mlb-twins-red-sox',
    title: 'Twins @ Red Sox',
    start: '10:35 AM PT',
    predicted: 'Minnesota Twins',
    confidence: 52,
    actualWinner: 'Minnesota Twins',
    finalScore: '6-5',
    result: 'hit',
    note: 'Pass tier | F5 miss: Red Sox led 4-3 after five.'
  }),
  game({
    id: 'may24-mlb-mets-marlins',
    title: 'Mets @ Marlins',
    start: '10:40 AM PT',
    predicted: 'Miami Marlins',
    confidence: 63,
    actualWinner: 'Miami Marlins',
    finalScore: '0-4',
    result: 'hit',
    note: 'Swingy tier | F5 miss: scoreless tie through five.'
  }),
  game({
    id: 'may24-mlb-dodgers-brewers',
    title: 'Dodgers @ Brewers',
    start: '11:10 AM PT',
    predicted: 'Los Angeles Dodgers',
    confidence: 56,
    actualWinner: 'Los Angeles Dodgers',
    finalScore: '5-1',
    result: 'hit',
    note: 'Swingy tier | F5 hit: Dodgers led 5-1 after five.'
  }),
  game({
    id: 'may24-mlb-mariners-royals',
    title: 'Mariners @ Royals',
    start: '11:10 AM PT',
    predicted: 'Seattle Mariners',
    confidence: 69,
    actualWinner: 'Kansas City Royals',
    finalScore: '6-8',
    result: 'miss',
    note: 'Pass tier | F5 miss: Royals led 4-1 after five.'
  }),
  game({
    id: 'may24-mlb-astros-cubs',
    title: 'Astros @ Cubs',
    start: '11:20 AM PT',
    predicted: 'Houston Astros',
    confidence: 52,
    actualWinner: 'Houston Astros',
    finalScore: '8-5',
    result: 'hit',
    note: 'Pass tier | F5 hit: Astros led 7-3 after five.'
  })
]

const mlbAfternoonGames: HistoryGameReview[] = [
  game({
    id: 'may24-mlb-white-sox-giants',
    title: 'White Sox @ Giants',
    start: '1:05 PM PT',
    predicted: 'San Francisco Giants',
    confidence: 64,
    actualWinner: 'San Francisco Giants',
    finalScore: '5-8',
    result: 'hit',
    note: 'Pass tier | F5 hit: Giants led 8-4 after five.'
  }),
  game({
    id: 'may24-mlb-athletics-padres',
    title: 'Athletics @ Padres',
    start: '1:10 PM PT',
    predicted: 'San Diego Padres',
    confidence: 75,
    actualWinner: 'Athletics',
    finalScore: '5-2',
    result: 'miss',
    note: 'Strong tier | F5 miss: Athletics led 4-0 after five.'
  }),
  game({
    id: 'may24-mlb-nationals-braves',
    title: 'Nationals @ Braves',
    start: '1:10 PM PT',
    predicted: 'Atlanta Braves',
    confidence: 70,
    actualWinner: 'Washington Nationals',
    finalScore: '2-1',
    result: 'miss',
    note: 'Strong tier | F5 miss: Nationals led 1-0 after five.'
  }),
  game({
    id: 'may24-mlb-rockies-dbacks',
    title: 'Rockies @ Diamondbacks',
    start: '1:10 PM PT',
    predicted: 'Arizona Diamondbacks',
    confidence: 58,
    actualWinner: 'Arizona Diamondbacks',
    finalScore: '1-9',
    result: 'hit',
    note: 'Swingy tier | F5 hit: Diamondbacks led 7-0 after five.'
  })
]

const mlbEveningGames: HistoryGameReview[] = [
  game({
    id: 'may24-mlb-tigers-orioles-g2',
    title: 'Tigers @ Orioles (Game 2)',
    start: '4:15 PM PT',
    predicted: 'Detroit Tigers',
    confidence: 52,
    actualWinner: 'Detroit Tigers',
    finalScore: '4-1',
    result: 'hit',
    note: 'Pass tier | F5 hit: Tigers led 4-1 after five.'
  }),
  game({
    id: 'may24-mlb-rangers-angels',
    title: 'Rangers @ Angels',
    start: '6:38 PM PT',
    predicted: 'Texas Rangers',
    confidence: 52,
    actualWinner: 'Los Angeles Angels',
    finalScore: '1-2',
    result: 'miss',
    note: 'Pass tier | F5 miss: tied 1-1 through five.'
  })
]

export const may24HistorySportTabs: HistorySportTab[] = [
  {
    id: 'tennis',
    label: 'Tennis',
    summary:
      'Roland Garros Day 1 match ledger from the May 24 desk board, with the predicted side, desk confidence, board split, and the final match score for every tracked match.',
    metrics: [
      { label: 'Graded card', value: '25-11', tone: 'positive' },
      { label: 'ATP', value: '14-6', tone: 'positive' },
      { label: 'WTA', value: '11-5', tone: 'warning' },
      { label: 'Pending', value: '1 match', note: 'Sinner vs Tabur moved to May 25', tone: 'info' }
    ],
    sections: [
      { label: 'ATP', games: atpGames },
      { label: 'WTA', games: wtaGames },
      { label: 'Pending', games: pendingGames }
    ]
  },
  {
    id: 'mlb',
    label: 'MLB',
    summary:
      'May 24 MLB graded much better than the empty models chart suggested: the side board finished 10-5 full game, the first-inning lane went 8-7, the first-five lane slipped to 7-8, and the tracked prop board was a wipeout.',
    metrics: [
      { label: 'Full game', value: '10-5', tone: 'positive' },
      { label: 'First 5', value: '7-8', tone: 'warning' },
      { label: '1st inning', value: '8-7', note: 'New YRFI / NRFI lane now tracked in the archive', tone: 'warning' },
      { label: 'HR board', value: '2/12', tone: 'warning' },
      { label: 'Tracked props', value: '0/29', note: 'Every graded May 24 prop missed', tone: 'negative' }
    ],
    sections: [
      { label: 'Morning MLB Board', games: mlbMorningGames },
      { label: 'Afternoon MLB Board', games: mlbAfternoonGames },
      { label: 'Evening MLB Board', games: mlbEveningGames }
    ]
  }
]

export type HistoryMetric = {
  label: string
  value: string
  note?: string
}

export type HistoryArtifact = {
  label: string
  path: string
}

export type HistoryEntry = {
  id: string
  date: string
  label: string
  status: 'seed' | 'combined' | 'graded'
  summary: string
  sports: string[]
  trackedMarkets: string[]
  metrics: HistoryMetric[]
  whatWorked: string[]
  whatMissed: string[]
  takeaways: string[]
  artifacts: HistoryArtifact[]
}

export const historyArchive: HistoryEntry[] = [
  {
    id: '2026-05-20',
    date: '2026-05-20',
    label: 'May 20, 2026',
    status: 'graded',
    summary:
      'Remaining-games MLB board finished basically coin-flip on sides and still weak on HR props. The card was better than May 18, but not clean enough to trust wholesale.',
    sports: ['MLB'],
    trackedMarkets: ['Moneyline', 'First 5', 'HR props'],
    metrics: [
      { label: 'MLB full game', value: '7-6' },
      { label: 'MLB first 5', value: '5-8' },
      { label: 'HR board', value: '2/12', note: 'Casey Schmitt, Jake Burger' },
      { label: 'Slate shape', value: 'Remaining games only', note: 'Two early MLB games were already excluded' }
    ],
    whatWorked: [
      'The board still found enough winners to stay above water on full-game sides.',
      'The HR board finally got two through after the May 18 and May 19 shutouts.',
      'The smaller remaining-games slate was easier to scan than the wider full-day baseball boards.'
    ],
    whatMissed: [
      'Giants lost again to Arizona, which kept exposing the same fake-edge tendency around that matchup.',
      'Mets, Yankees, Royals, Cardinals, and Tigers all failed as side picks.',
      'First-five again lagged the full-game board, which means the starter-window story was still not clean enough.',
      'The HR board was still far too narrow relative to the actual lineup-wide distribution.'
    ],
    takeaways: [
      'Side confidence still needs a stronger penalty when the matchup is thin and the board is only leaning on partial lineup context.',
      'The archive should treat full-game wins and first-five wins separately because the difference is meaningful on baseball slates.',
      'Player-prop history is still HR-first on these archive days; broader TB / hits / RBI settlement was not yet being exported daily.'
    ],
    artifacts: [
      {
        label: 'Follow-up doc',
        path: '/Users/jcchen/Documents/New project/followup_may_20.md'
      },
      {
        label: 'Saved HR board',
        path: '/Users/jcchen/Documents/New project/data/predictions/mlb-home-runs/2026-05-20-statcast-prototype.json'
      },
      {
        label: 'Stored live slate',
        path: '/Users/jcchen/Documents/New project/src/lib/day-2026-05-20.js'
      },
      {
        label: 'Stored MLB board',
        path: '/Users/jcchen/Documents/New project/src/lib/day-2026-05-20-mlb.js'
      }
    ]
  },
  {
    id: '2026-05-19',
    date: '2026-05-19',
    label: 'May 19, 2026',
    status: 'graded',
    summary:
      'This was one of the better MLB side days, but it came with the same huge warning on the HR layer: sides were strong, home-run props were still dead wrong.',
    sports: ['MLB', 'WNBA', 'NBA'],
    trackedMarkets: ['Moneyline', 'First 5', 'HR props'],
    metrics: [
      { label: 'MLB full game', value: '11-4' },
      { label: 'MLB first 5', value: '8-7' },
      { label: 'HR board', value: '0/12' },
      { label: 'Cleanest side day', value: 'Yes', note: 'Best MLB side mark in the current archive block' }
    ],
    whatWorked: [
      'The side board was materially sharper and got most of the slate right despite still carrying volatility flags.',
      'The model was directionally better on the moneyline than on the first-five layer.',
      'The board finally looked like it could find enough baseball winners when the edges were not overstated.'
    ],
    whatMissed: [
      'Blue Jays over Yankees, Twins over Astros, Giants over Diamondbacks, and Mariners over White Sox were the main side misses.',
      'The HR board went 0-for-12, which means the player-level concentration problem was still unresolved.',
      'Even on a good side day, the prop layer was still solving the wrong problem.'
    ],
    takeaways: [
      'The side engine and the HR engine should not be judged as one system; May 19 was proof they were behaving very differently.',
      'Good side days can still sit next to terrible HR days if the player-prop board is too star-centric.',
      'This is the kind of slate where the history tab needs to separate winners, quality of read, and prop accuracy instead of flattening them into one result.'
    ],
    artifacts: [
      {
        label: 'Follow-up doc',
        path: '/Users/jcchen/Documents/New project/followup_may_19.md'
      },
      {
        label: 'Saved HR board',
        path: '/Users/jcchen/Documents/New project/data/predictions/mlb-home-runs/2026-05-19-statcast-prototype.json'
      },
      {
        label: 'Stored live slate',
        path: '/Users/jcchen/Documents/New project/src/lib/day-2026-05-19.js'
      },
      {
        label: 'Stored MLB board',
        path: '/Users/jcchen/Documents/New project/src/lib/day-2026-05-19-mlb.js'
      }
    ]
  },
  {
    id: '2026-05-18',
    date: '2026-05-18',
    label: 'May 18, 2026',
    status: 'graded',
    summary:
      'Bad baseball day. The side board was underwater, the first-five board was worse, and the HR board went completely blank against a 32-homer slate.',
    sports: ['MLB', 'WNBA', 'NBA'],
    trackedMarkets: ['Moneyline', 'First 5', 'HR props'],
    metrics: [
      { label: 'MLB full game', value: '6-8' },
      { label: 'MLB first 5', value: '4-10' },
      { label: 'HR board', value: '0/12' },
      { label: 'WNBA / NBA', value: '1-1 / 0-1' }
    ],
    whatWorked: [
      'Rays, Yankees, Mets, Red Sox, Twins, and Mariners won on the MLB side.',
      'The board still surfaced a few true team-level winners even on a poor overall baseball day.',
      'The postmortem clearly separated clean control wins from comeback escapes, which became a useful archive distinction.'
    ],
    whatMissed: [
      'Giants over Diamondbacks and Braves over Marlins were dead wrong early and never recovered.',
      'Dodgers over Padres, Athletics over Angels, Cubs over Brewers, Rangers over Rockies, and Tigers over Guardians all missed.',
      'The HR board missed everything despite the slate producing 32 total home runs.',
      'This was also the day where the Arenado miss exposed the latent-power blind spot.'
    ],
    takeaways: [
      'Not all winning sides were good reads; the Yankees comeback was the clean example.',
      'The HR layer was too concentrated around headline bats and missed the real lineup clusters.',
      'May 18 is the strongest argument for keeping a visible no-bet / watchlist tier inside the app.'
    ],
    artifacts: [
      {
        label: 'Follow-up doc',
        path: '/Users/jcchen/Documents/New project/followup_may_18.md'
      },
      {
        label: 'Saved HR board',
        path: '/Users/jcchen/Documents/New project/data/predictions/mlb-home-runs/2026-05-18-statcast-prototype.json'
      },
      {
        label: 'Saved side board',
        path: '/Users/jcchen/Documents/New project/data/predictions/mlb-sides/2026-05-18-board-v2.json'
      },
      {
        label: 'Current retro report',
        path: '/Users/jcchen/Documents/New project/data/reports/current-model-retro-may16-may18.md'
      }
    ]
  },
  {
    id: '2026-05-17',
    date: '2026-05-17',
    label: 'May 17, 2026',
    status: 'graded',
    summary:
      'Stronger MLB side day than the surrounding slates, but still weak at the player-distribution layer. The board found winners better than it found the actual loud bats.',
    sports: ['MLB', 'WNBA', 'NBA'],
    trackedMarkets: ['Moneyline', 'First 5', 'HR props'],
    metrics: [
      { label: 'MLB full game', value: '10-5' },
      { label: 'MLB first 5', value: '8-7' },
      { label: 'HR board', value: '3/12', note: 'Gavin Sheets, Elly De La Cruz, Bryce Harper overlap' },
      { label: 'Archive theme', value: 'Better sides than props' }
    ],
    whatWorked: [
      'This was the best MLB side day in the original saved-board archive.',
      'The HR board at least found some real overlap, especially Gavin Sheets.',
      'The side model was directionally stronger than the player-level concentration layer.'
    ],
    whatMissed: [
      'The board still missed most of the actual loud-bat distribution despite a better side day.',
      'Diamondbacks and Giants cluster reads were still too narrow at the hitter level.',
      'This is also where Elly became a good example of false carryover risk when looking ahead to the next day.'
    ],
    takeaways: [
      'The system can find second-order names, but it still misses too much of the wider lineup wave.',
      'Good side performance does not automatically validate the player-prop board.',
      'This day pushed the archive toward separating team-wave reads from single-bat HR reads.'
    ],
    artifacts: [
      {
        label: 'Follow-up doc',
        path: '/Users/jcchen/Documents/New project/followup_may_17.md'
      },
      {
        label: 'Saved HR board',
        path: '/Users/jcchen/Documents/New project/data/predictions/mlb-home-runs/2026-05-17-statcast-prototype.json'
      },
      {
        label: 'Saved side board',
        path: '/Users/jcchen/Documents/New project/data/predictions/mlb-sides/2026-05-17-board-v2.json'
      }
    ]
  },
  {
    id: '2026-05-16',
    date: '2026-05-16',
    label: 'May 16, 2026',
    status: 'graded',
    summary:
      'Mixed side day, but still the best home-run hit day in the archive block. Even then, the player-level board was far too narrow relative to the real batting-leader field.',
    sports: ['MLB'],
    trackedMarkets: ['Moneyline', 'First 5', 'HR props'],
    metrics: [
      { label: 'MLB full game', value: '8-7' },
      { label: 'MLB first 5', value: '8-7' },
      { label: 'HR board', value: '6/12' },
      { label: 'Batting-leader overlap', value: '2/30', note: 'Drake Baldwin, Bryce Harper' }
    ],
    whatWorked: [
      'This was the strongest HR hit rate in the current archive block.',
      'Drake Baldwin and Bryce Harper were true board hits.',
      'The board was at least directionally close on a few team-wave stories even when it chose the wrong hitter.'
    ],
    whatMissed: [
      'Only 2 of 30 saved NL batting leaders were on the HR board.',
      'Nationals, Marlins, Dodgers, and Giants lineup waves all outran the narrow player selection.',
      'The board was still asking “who homers?” instead of “who overperforms across hits, TB, RBI, and runs?”'
    ],
    takeaways: [
      'May 16 is where the archive clearly showed the need for a wider loud-bat model.',
      'HR-first framing was already too narrow even on the day where HR hit rate looked best.',
      'This day is the cleanest justification for the later prop-builder shift toward TB, hits, RBI, and walks.'
    ],
    artifacts: [
      {
        label: 'Follow-up doc',
        path: '/Users/jcchen/Documents/New project/followup_may_16.md'
      },
      {
        label: 'Saved HR board',
        path: '/Users/jcchen/Documents/New project/data/predictions/mlb-home-runs/2026-05-16-statcast-prototype.json'
      },
      {
        label: 'Saved side board',
        path: '/Users/jcchen/Documents/New project/data/predictions/mlb-sides/2026-05-16-board-v2.json'
      },
      {
        label: 'Daily side report',
        path: '/Users/jcchen/Documents/New project/data/reports/mlb-side-backtest-2026-05-16.md'
      }
    ]
  },
  {
    id: '2026-05-10-to-2026-05-15',
    date: '2026-05-10',
    label: 'May 10-15, 2026',
    status: 'combined',
    summary:
      'The first real MLB backtest block. This is where the model learned that first-five and full-game should be graded separately and that bullpen context was not optional.',
    sports: ['MLB'],
    trackedMarkets: ['Moneyline', 'First 5'],
    metrics: [
      { label: 'Training full game', value: '69.4%', note: '36 games, May 10-12' },
      { label: 'Verification full game', value: '61.5%', note: '39 games, May 13-15' },
      { label: 'Training first 5', value: '61.1%' },
      { label: 'Verification first 5', value: '59.0%' }
    ],
    whatWorked: [
      'The board was respectable on the early training block and still solid on verification.',
      'This archive period proved there was a real baseball read worth refining, not just noise.',
      'It also created the first useful starter-window versus full-game split.'
    ],
    whatMissed: [
      'Detailed daily prop settlement was not being archived yet.',
      'Thin-edge and high-volatility misses were still too common.',
      'The hit-efficiency layer was not yet trustworthy enough to stand on its own.'
    ],
    takeaways: [
      'This six-day block is the baseline report the later history entries build on.',
      'The archive after May 16 is much richer because this period showed exactly what was missing.',
      'Early history should be read as a model-evolution block, not as final production-grade output.'
    ],
    artifacts: [
      {
        label: 'Combined side backtest',
        path: '/Users/jcchen/Documents/New project/data/reports/mlb-side-backtest-2026-05-10-to-2026-05-15.md'
      },
      {
        label: 'Combined saved side board',
        path: '/Users/jcchen/Documents/New project/data/predictions/mlb-sides/2026-05-10-to-2026-05-15-board-v2.json'
      }
    ]
  },
  {
    id: '2026-05-09',
    date: '2026-05-09',
    label: 'May 9, 2026',
    status: 'seed',
    summary:
      'Initial imported archive day. This is the seed board that established the daybook structure before the later daily backtests and prop tracking were fully wired.',
    sports: ['MLB'],
    trackedMarkets: ['Moneyline'],
    metrics: [
      { label: 'Archive status', value: 'Seed slate' },
      { label: 'Tracked games', value: '29 total' },
      { label: 'Detailed grading', value: 'Not stored' }
    ],
    whatWorked: [
      'This day gave the project a stable archive baseline and a reusable slate format.',
      'The seed import proved the app could carry a real daybook instead of one hard-coded board.'
    ],
    whatMissed: [
      'No detailed postgame grading was preserved for this first archive seed.',
      'Prop history was not being tracked yet.'
    ],
    takeaways: [
      'May 9 is the archive origin point, not a mature backtest day.',
      'Later entries should be interpreted as model iterations on top of this seed structure.'
    ],
    artifacts: [
      {
        label: 'Stored day file',
        path: '/Users/jcchen/Documents/New project/src/lib/slate.js'
      }
    ]
  }
]

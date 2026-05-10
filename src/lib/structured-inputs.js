const signal = (label, weight, values, source = 'Local structured input') => ({
  label,
  weight,
  values,
  source
})

const modifier = (label, delta) => ({ label, delta })

export const structuredInputOverrides = {
  'sky-fire': {
    sourceLabel: 'Moneyline + structured roster context',
    signals: [
      signal('Continuity and roster stability', 0.28, [
        { label: 'Returning team structure', score: 74 },
        { label: 'Expansion roster learning live', score: 28 }
      ]),
      signal('Game-management trust', 0.2, [
        { label: 'Cleaner opening-night execution base', score: 70 },
        { label: 'New group still defining late-clock answers', score: 32 }
      ]),
      signal('Home-opener emotion', 0.14, [
        { label: 'Road opener', score: 44 },
        { label: 'Expansion debut crowd spike', score: 56 }
      ]),
      signal('Shot-creation dependability', 0.16, [
        { label: 'More predictable half-court creation', score: 68 },
        { label: 'Likelier rhythm swings', score: 39 }
      ])
    ],
    volatility: {
      base: 63,
      modifiers: [
        modifier('Expansion opener uncertainty', 12),
        modifier('Only one side has continuity', -4)
      ]
    }
  },
  'thunder-lakers': {
    sourceLabel: 'Moneyline + local structured playoff inputs',
    signals: [
      signal('Series scoring profile', 0.2, [
        { label: '116.5 points per game', score: 78 },
        { label: '98.5 points per game', score: 22 }
      ]),
      signal('Bench production', 0.18, [
        { label: '41.0 bench points per game', score: 84 },
        { label: '17.5 bench points per game', score: 16 }
      ]),
      signal('Turnover battle', 0.18, [
        { label: 'Forced 20 turnovers in Game 2 and own the points-off-TO edge', score: 82 },
        { label: '18.5 turnovers per game through two games', score: 18 }
      ]),
      signal('Rebounds and extra possessions', 0.16, [
        { label: '48.0 rebounds and 19.0 second-chance points per game', score: 76 },
        { label: '42.0 rebounds and 8.5 second-chance points per game', score: 24 }
      ]),
      signal('Home-court response spot', 0.12, [
        { label: 'Road favorite entering first hostile environment of the series', score: 43 },
        { label: 'Back home in a must-answer Game 3', score: 57 }
      ]),
      signal('Support-cast reliability', 0.1, [
        { label: 'Holmgren, Mitchell, and McCain are all lifting non-SGA minutes', score: 73 },
        { label: 'LeBron and Reaves still need cleaner support behind them', score: 27 }
      ])
    ],
    volatility: {
      base: 56,
      modifiers: [
        modifier('First Lakers home game of the series', 6),
        modifier('Playoff desperation spot for Los Angeles', 5),
        modifier('Oklahoma City already owns a two-game sample edge', -5)
      ]
    }
  }
}

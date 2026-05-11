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
  },
  'storm-sun': {
    sourceLabel: 'Moneyline + structured opening-week team context',
    signals: [
      signal('Continuity and opening-week structure', 0.22, [
        { label: 'Road opener with more live readjustment', score: 52 },
        { label: 'Slightly steadier opening base', score: 64 }
      ]),
      signal('Perimeter shot creation', 0.18, [
        { label: 'Guard-driven scoring pressure', score: 58 },
        { label: 'More balanced half-court creation', score: 54 }
      ]),
      signal('Interior control and rebounding', 0.18, [
        { label: 'Need cleaner glass work on the road', score: 48 },
        { label: 'Stronger frontcourt-control script', score: 62 }
      ]),
      signal('Home opener environment', 0.12, [
        { label: 'Road opener', score: 44 },
        { label: 'Home crowd and game-flow comfort', score: 56 }
      ]),
      signal('Late-game trust in a short spread', 0.14, [
        { label: 'Can flip it with guard shot-making', score: 50 },
        { label: 'Slightly cleaner late-possession baseline', score: 60 }
      ])
    ],
    volatility: {
      base: 60,
      modifiers: [
        modifier('Opening-week uncertainty', 8),
        modifier('Short spread leaves little margin', 3),
        modifier('Market still gives the home side a small edge', -3)
      ]
    }
  },
  'liberty-mystics': {
    sourceLabel: 'Moneyline + structured roster-tier context',
    signals: [
      signal('Continuity and system trust', 0.26, [
        { label: 'Championship-level core remains intact', score: 78 },
        { label: 'Younger group still shaping roles', score: 38 }
      ]),
      signal('Star shot creation', 0.18, [
        { label: 'Multiple high-end closers', score: 76 },
        { label: 'Need more collective creation', score: 46 }
      ]),
      signal('Frontcourt size and rebounding', 0.16, [
        { label: 'Stronger interior floor', score: 72 },
        { label: 'Underdog path needs overperformance', score: 44 }
      ]),
      signal('Road-discipline baseline', 0.12, [
        { label: 'Veteran road favorite profile', score: 54 },
        { label: 'Home opener energy', score: 46 }
      ]),
      signal('Late-game trust', 0.14, [
        { label: 'Cleaner late-clock hierarchy', score: 74 },
        { label: 'Need game script to stay compressed', score: 40 }
      ])
    ],
    volatility: {
      base: 56,
      modifiers: [
        modifier('Opening-week rotation unknowns', 5),
        modifier('Meaningful talent gap lowers upset baseline', -6),
        modifier('Road favorite still carries environment risk', 3)
      ]
    }
  },
  'knicks-76ers': {
    sourceLabel: 'Moneyline + official Games 1-3 playoff box scores',
    signals: [
      signal('Series scoring profile', 0.2, [
        { label: '117.7 points per game through three games', score: 80 },
        { label: '98.0 points per game through three games', score: 20 }
      ]),
      signal('Paint and rebound control', 0.18, [
        { label: '55.3 paint points and 41.7 rebounds per game', score: 78 },
        { label: '36.0 paint points and 33.3 rebounds per game', score: 22 }
      ]),
      signal('Lead-creator pressure', 0.16, [
        { label: 'Brunson at 31.3 points per game', score: 76 },
        { label: 'Maxey still carrying the cleanest perimeter burst', score: 56 }
      ]),
      signal('Support-cast reliability', 0.15, [
        { label: 'Bridges, Towns, Hart, and New York bench minutes keep landing', score: 74 },
        { label: 'George and Oubre have scored, but support has been thinner', score: 40 }
      ]),
      signal('Turnover and extra-possession battle', 0.11, [
        { label: '76ers are forcing too few mistakes and giving too many back', score: 72 },
        { label: '16.0 turnovers per game is still dragging the script', score: 28 }
      ]),
      signal('Game 4 environment', 0.12, [
        { label: 'Road closeout attempt', score: 44 },
        { label: 'Home elimination urgency', score: 56 }
      ])
    ],
    volatility: {
      base: 52,
      modifiers: [
        modifier('Philadelphia home elimination spot adds variance', 7),
        modifier('Three-game sample keeps favoring New York', -5),
        modifier('Availability rhythm has moved around both teams already', 4)
      ]
    }
  },
  'aces-sparks': {
    sourceLabel: 'Moneyline + structured team-hierarchy context',
    signals: [
      signal('Top-end star ceiling', 0.22, [
        { label: 'More trusted closing-time talent stack', score: 74 },
        { label: 'Live dog ceiling at home, but less proven late', score: 58 }
      ]),
      signal('Guard shot creation', 0.18, [
        { label: 'Cleaner downhill and pull-up answers late', score: 72 },
        { label: 'Need more efficient half-court creation', score: 57 }
      ]),
      signal('Interior physicality', 0.14, [
        { label: 'Slightly stronger glass baseline', score: 67 },
        { label: 'Can compete, but needs the whistle and activity edge', score: 59 }
      ]),
      signal('Home-floor response', 0.12, [
        { label: 'Road favorite', score: 45 },
        { label: 'Home comfort and live dog energy', score: 55 }
      ]),
      signal('Late-game trust in a one-possession spread', 0.16, [
        { label: 'Veteran closeout profile', score: 73 },
        { label: 'Must keep it inside one or two possessions', score: 52 }
      ])
    ],
    volatility: {
      base: 59,
      modifiers: [
        modifier('One-possession market adds swinginess', 6),
        modifier('Opening-week uncertainty', 4),
        modifier('Veteran closing edge trims some chaos', -3)
      ]
    }
  },
  'spurs-timberwolves': {
    sourceLabel: 'Moneyline + official Games 1-3 playoff box scores',
    signals: [
      signal('Series scoring profile', 0.18, [
        { label: '116.7 points per game through three games', score: 78 },
        { label: '102.3 points per game through three games', score: 22 }
      ]),
      signal('Interior impact', 0.19, [
        { label: 'Wembanyama at 23.0 points, 15.0 rebounds, 6.3 blocks', score: 84 },
        { label: 'Need a more forceful frontcourt counter', score: 34 }
      ]),
      signal('Backcourt orchestration', 0.14, [
        { label: 'Castle and Fox keep the pace cleaner', score: 72 },
        { label: 'Edwards owns the burst, but the support reads are looser', score: 54 }
      ]),
      signal('Secondary scoring stability', 0.12, [
        { label: 'Multiple Spurs creators keep arriving in different games', score: 70 },
        { label: 'Minnesota still leans too hard on Edwards responses', score: 45 }
      ]),
      signal('Turnover and transition leverage', 0.11, [
        { label: 'Game 2 proved the Spurs can weaponize pace and mistakes', score: 74 },
        { label: 'Transition-defense control has not been stable enough', score: 26 }
      ]),
      signal('Game 4 environment', 0.12, [
        { label: 'Road favorite in a live road environment', score: 45 },
        { label: 'Home response spot for Minnesota', score: 55 }
      ])
    ],
    volatility: {
      base: 54,
      modifiers: [
        modifier('Minnesota home response spot adds variance', 6),
        modifier('Wembanyama interior edge has held for three games', -4),
        modifier('Edwards can rewrite a single-game shot profile fast', 4)
      ]
    }
  },
  'mercury-valkyries': {
    sourceLabel: 'Moneyline + structured debut-environment context',
    signals: [
      signal('Home-debut environment', 0.18, [
        { label: 'Road opener into a loud building', score: 42 },
        { label: 'Inaugural home game energy', score: 68 }
      ]),
      signal('Veteran continuity', 0.16, [
        { label: 'More established veteran feel', score: 58 },
        { label: 'Newer group still finding the steady script', score: 46 }
      ]),
      signal('Defensive and rebounding baseline', 0.16, [
        { label: 'Can hold up physically if the pace stays manageable', score: 50 },
        { label: 'Slightly better home-floor defensive shape', score: 60 }
      ]),
      signal('Shot-creation reliability', 0.16, [
        { label: 'Veteran scoring comfort', score: 56 },
        { label: 'Enough spacing and crowd energy to keep it live', score: 54 }
      ]),
      signal('Late-game leverage', 0.12, [
        { label: 'Road execution test', score: 45 },
        { label: 'Home-stage bump in a short spread', score: 55 }
      ])
    ],
    volatility: {
      base: 62,
      modifiers: [
        modifier('Expansion-team home debut adds noise', 8),
        modifier('Short moneyline keeps upset paths wide open', 4)
      ]
    }
  }
}

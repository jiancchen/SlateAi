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
  'thunder-lakers-g4': {
    sourceLabel: 'Moneyline + official Games 1-3 playoff box scores',
    signals: [
      signal('Series scoring profile', 0.2, [
        { label: '121.3 points per game through three games', score: 82 },
        { label: '101.7 points per game through three games', score: 18 }
      ]),
      signal('Paint and transition leverage', 0.18, [
        { label: '52.7 paint points and 16.3 fast-break points per game', score: 80 },
        { label: '45.3 paint points and 8.0 fast-break points per game', score: 20 }
      ]),
      signal('Turnover control', 0.18, [
        { label: 'Only 11.7 turnovers per game and a plus-19 turnover margin', score: 84 },
        { label: '17.7 turnovers per game has kept feeding Oklahoma City extra trips', score: 16 }
      ]),
      signal('Support-cast reliability', 0.14, [
        { label: 'Holmgren and Ajay Mitchell are both above 20 points per game, and the bench keeps landing shots', score: 78 },
        { label: 'LeBron and Rui have scored, but the support picture is still thinner without Doncic', score: 28 }
      ]),
      signal('Availability rhythm', 0.12, [
        { label: 'Core rotation is stable enough around SGA', score: 72 },
        { label: 'Doncic has missed every game of the series so far', score: 24 }
      ]),
      signal('Game 4 environment', 0.1, [
        { label: 'Road closeout attempt', score: 44 },
        { label: 'Home elimination spot', score: 56 }
      ])
    ],
    volatility: {
      base: 54,
      modifiers: [
        modifier('Lakers home elimination spot adds some pushback variance', 6),
        modifier('Oklahoma City already owns a three-game sample edge', -7),
        modifier('LeBron single-game ceiling still leaves some chaos alive', 4)
      ]
    }
  },
  'pistons-cavaliers-g4': {
    sourceLabel: 'Moneyline + official Games 1-3 playoff box scores',
    signals: [
      signal('Series scoring profile', 0.16, [
        { label: '109.0 points per game through three games', score: 64 },
        { label: '104.7 points per game through three games', score: 36 }
      ]),
      signal('Transition and extra-possession pressure', 0.18, [
        { label: '13.0 fast-break points and 18.0 second-chance points per game', score: 76 },
        { label: '6.7 fast-break points and 14.7 second-chance points per game', score: 41 }
      ]),
      signal('Lead-creator pressure', 0.16, [
        { label: 'Cade Cunningham is at 25.0 points and 9.0 assists per game', score: 74 },
        { label: 'Donovan Mitchell is still the top scorer at 29.7 points per game', score: 68 }
      ]),
      signal('Support-cast reliability', 0.16, [
        { label: 'Harris, Robinson, and LeVert have all delivered real scoring pockets', score: 78 },
        { label: 'Cleveland finally got more help in Game 3, but the support has swung harder game to game', score: 46 }
      ]),
      signal('Turnover discipline', 0.14, [
        { label: 'Only 12.0 turnovers per game through three games', score: 72 },
        { label: '15.0 turnovers per game keeps leaving some possessions on the table', score: 42 }
      ]),
      signal('Game 4 environment', 0.1, [
        { label: 'Road team trying to tighten the series grip', score: 45 },
        { label: 'Home floor after finally getting a response win', score: 55 }
      ])
    ],
    volatility: {
      base: 58,
      modifiers: [
        modifier('Cleveland home response spot adds real variance', 6),
        modifier('Detroit has already proven the dog path twice in this series', -2),
        modifier('Mitchell can still rewrite a single-game scoring script fast', 4)
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
  'spurs-timberwolves-g5': {
    sourceLabel: 'Moneyline + official Games 1-4 playoff box scores',
    signals: [
      signal('Series scoring profile', 0.18, [
        { label: '114.8 points per game through four games', score: 74 },
        { label: '105.3 points per game through four games', score: 26 }
      ]),
      signal('Interior leverage', 0.19, [
        { label: 'Wembanyama still owns the biggest frontcourt ceiling in the matchup', score: 82 },
        { label: 'Minnesota just showed it can survive by committee on the glass', score: 48 }
      ]),
      signal('Backcourt creation', 0.14, [
        { label: 'Fox, Castle, and Harper keep giving San Antonio multiple creation lanes', score: 70 },
        { label: 'Edwards still owns the biggest single-game scoring detonation', score: 66 }
      ]),
      signal('Support-minute reliability', 0.12, [
        { label: 'Spurs still have more ways to score beyond one player', score: 68 },
        { label: 'Reid and McDaniels gave Minnesota a real support answer in Game 4', score: 60 }
      ]),
      signal('Series volatility context', 0.11, [
        { label: 'Game 4 loss came in the Wembanyama ejection game', score: 62 },
        { label: 'Series is tied, and Minnesota just proved the counterpunch is live', score: 58 }
      ]),
      signal('Game 5 environment', 0.12, [
        { label: 'Home floor with the market leaning hard back toward San Antonio', score: 58 },
        { label: 'Road team trying to carry the Game 4 answer into the toughest setting yet', score: 42 }
      ])
    ],
    volatility: {
      base: 58,
      modifiers: [
        modifier('Series is tied 2-2, which keeps multiple game scripts live', 7),
        modifier('Wembanyama Game 4 ejection makes the latest sample noisier', 5),
        modifier('San Antonio still owns the stronger full-series scoring profile', -3),
        modifier('Anthony Edwards can still redraw a single-game shot profile quickly', 4)
      ]
    }
  },
  'dream-wings-2026-05-12': {
    sourceLabel: 'Moneyline + structured early-season team context',
    signals: [
      signal('Opening-week structure', 0.22, [
        { label: 'Slightly steadier opening result base', score: 64 },
        { label: 'Also 1-0, but still in a more reactive price position', score: 58 }
      ]),
      signal('Late-game trust in a short spread', 0.18, [
        { label: 'Road favorite with a cleaner market vote', score: 62 },
        { label: 'Home dog that only needs one run to flip the whole number', score: 56 }
      ]),
      signal('Shot-creation dependability', 0.16, [
        { label: 'Slightly cleaner half-court creation baseline', score: 60 },
        { label: 'More variance-friendly home attack', score: 54 }
      ]),
      signal('Home-floor pressure', 0.12, [
        { label: 'Road opener', score: 45 },
        { label: 'Home floor in a one-possession game shape', score: 55 }
      ]),
      signal('Market shape', 0.14, [
        { label: 'Short road favorite profile', score: 58 },
        { label: 'Live home dog profile', score: 52 }
      ])
    ],
    volatility: {
      base: 61,
      modifiers: [
        modifier('Short spread keeps the upset path wide open', 6),
        modifier('Both teams are only one game into the sample', 5),
        modifier('Market still gives Atlanta the cleaner base', -2)
      ]
    }
  },
  'liberty-fire-2026-05-12': {
    sourceLabel: 'Moneyline + structured team-hierarchy context',
    signals: [
      signal('Continuity and roster trust', 0.26, [
        { label: '2-0 start with the cleanest continuity profile on the board', score: 84 },
        { label: '0-1 expansion build still shaping a stable script', score: 28 }
      ]),
      signal('Top-end talent gap', 0.2, [
        { label: 'Multiple high-trust closers and a deeper rotation floor', score: 82 },
        { label: 'Home underdog path needs the game to stay compressed a long time', score: 30 }
      ]),
      signal('Road professionalism', 0.12, [
        { label: 'Veteran road favorite profile', score: 60 },
        { label: 'Home energy matters, but so does execution', score: 40 }
      ]),
      signal('Late-game trust', 0.16, [
        { label: 'Cleaner late-clock hierarchy', score: 80 },
        { label: 'Must overperform the price late', score: 34 }
      ])
    ],
    volatility: {
      base: 55,
      modifiers: [
        modifier('Double-digit spread lowers outright upset frequency', -7),
        modifier('Expansion home environment still adds a little noise', 4),
        modifier('Road favorite still has to clear a big number', 2)
      ]
    }
  },
  'lynx-mercury-2026-05-12': {
    sourceLabel: 'Moneyline + structured early-season team context',
    signals: [
      signal('Current form baseline', 0.2, [
        { label: '0-1 start and road reset spot', score: 46 },
        { label: '1-1 start with the cleaner current market base', score: 64 }
      ]),
      signal('Home-floor leverage', 0.16, [
        { label: 'Road bounce-back ask', score: 44 },
        { label: 'Home favorite in a manageable range', score: 56 }
      ]),
      signal('Game-script control', 0.18, [
        { label: 'Underdog path likely needs a looser, more chaotic tempo', score: 50 },
        { label: 'Slightly stronger half-court control profile', score: 62 }
      ]),
      signal('Late-game trust', 0.14, [
        { label: 'Still live if the number stays within one run late', score: 52 },
        { label: 'Cleaner current closeout shape', score: 60 }
      ])
    ],
    volatility: {
      base: 60,
      modifiers: [
        modifier('Medium spread keeps the dog route alive', 4),
        modifier('Early-season sample is still thin', 5),
        modifier('Home favorite status trims some of the chaos', -2)
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
  },
  'cavaliers-pistons-g5': {
    sourceLabel: 'Moneyline + official Games 1-4 playoff box scores',
    signals: [
      signal('Series scoring profile', 0.16, [
        { label: '106.5 points per game through four games', score: 47 },
        { label: '107.5 points per game through four games', score: 53 }
      ]),
      signal('Lead-creator stability', 0.18, [
        { label: 'Mitchell owns the biggest scoring ceiling, but the shape swings harder game to game', score: 58 },
        { label: 'Cunningham has been the cleaner full-possession organizer', score: 66 }
      ]),
      signal('Support-cast dependability', 0.16, [
        { label: 'Harden finally gave Cleveland real secondary creation in Game 4', score: 60 },
        { label: 'Harris, Duren, and Detroit support still feel steadier across the whole sample', score: 64 }
      ]),
      signal('Transition and possession control', 0.16, [
        { label: 'Need to keep Detroit from winning the control minutes again', score: 46 },
        { label: 'The Pistons still own the cleaner transition-and-control script', score: 68 }
      ]),
      signal('Game 5 environment', 0.12, [
        { label: 'Road team after finally finding traction', score: 45 },
        { label: 'Home floor in the first real swing game', score: 55 }
      ])
    ],
    volatility: {
      base: 57,
      modifiers: [
        modifier('Series is tied 2-2, so leverage jumps sharply', 7),
        modifier('Mitchell just showed a takeover ceiling that can rewrite the board', 5),
        modifier('Detroit still owns the steadier full-series profile', -3)
      ]
    }
  },
  'storm-tempo-2026-05-13': {
    sourceLabel: 'Moneyline + structured early-season guard-play context',
    signals: [
      signal('Home-floor spark', 0.18, [
        { label: 'Road veteran group in a short game', score: 48 },
        { label: 'Expansion home floor is already getting real market respect', score: 62 }
      ]),
      signal('Shot-creation stability', 0.18, [
        { label: 'Seattle still has the cleaner veteran guard pressure', score: 58 },
        { label: 'Toronto is still proving the late-possession answers', score: 46 }
      ]),
      signal('Current market posture', 0.14, [
        { label: 'Live dog because the number is short', score: 48 },
        { label: 'Favorite, but only by a thin edge', score: 52 }
      ]),
      signal('Late-game trust', 0.16, [
        { label: 'Road underdog can absolutely steal a close finish', score: 56 },
        { label: 'Favorite still needs to prove it can close cleanly', score: 50 }
      ])
    ],
    volatility: {
      base: 64,
      modifiers: [
        modifier('Short number keeps both paths wide open', 7),
        modifier('Expansion home environment adds noise', 6)
      ]
    }
  },
  'aces-sun-2026-05-13': {
    sourceLabel: 'Moneyline + structured roster-tier context',
    signals: [
      signal('Top-end talent gap', 0.24, [
        { label: 'Cleaner star hierarchy and more trusted closers', score: 82 },
        { label: 'Need a compressed script to survive the raw talent gap', score: 28 }
      ]),
      signal('Road professionalism', 0.16, [
        { label: 'Veteran road favorite profile', score: 68 },
        { label: 'Home underdog energy', score: 46 }
      ]),
      signal('Spread management', 0.14, [
        { label: 'Winner profile is strong, but margin still has to be earned', score: 60 },
        { label: 'Underdog path is more about hanging inside the number', score: 40 }
      ]),
      signal('Late-game trust', 0.18, [
        { label: 'Cleaner closing hierarchy', score: 78 },
        { label: 'Need the favorite to lose discipline late', score: 34 }
      ])
    ],
    volatility: {
      base: 56,
      modifiers: [
        modifier('Double-digit spread lowers outright upset frequency', -8),
        modifier('Backdoor-cover risk still matters on a number this big', 6)
      ]
    }
  },
  'sky-valkyries-2026-05-13': {
    sourceLabel: 'Moneyline + structured early-momentum context',
    signals: [
      signal('Current form baseline', 0.18, [
        { label: 'Road reset spot after an opener win', score: 48 },
        { label: '2-0 start and a building that is still carrying real lift', score: 66 }
      ]),
      signal('Home-floor leverage', 0.16, [
        { label: 'Road underdog script', score: 44 },
        { label: 'Home favorite in a medium range', score: 56 }
      ]),
      signal('Game-script control', 0.18, [
        { label: 'Chicago path likely needs a looser game', score: 48 },
        { label: 'Golden State gets the slightly cleaner pace-and-control setup', score: 62 }
      ]),
      signal('Late-game trust', 0.14, [
        { label: 'Still live if the favorite gets dragged into a close fourth', score: 52 },
        { label: 'Favorite is better positioned, but not immune to late noise', score: 58 }
      ])
    ],
    volatility: {
      base: 62,
      modifiers: [
        modifier('Medium spread keeps the dog route alive', 4),
        modifier('Early-season sample is still thin', 5),
        modifier('Home momentum lowers some of the chaos', -2)
      ]
    }
  },
  'fever-sparks-2026-05-13': {
    sourceLabel: 'Moneyline + structured close-game variance context',
    signals: [
      signal('Current market posture', 0.16, [
        { label: 'Short road favorite status only', score: 54 },
        { label: 'Home dog with a very live one-possession path', score: 46 }
      ]),
      signal('Lead-fragility risk', 0.2, [
        { label: 'Favorite can still leak a late lead in this number range', score: 48 },
        { label: 'Dog does not need much to stay attached', score: 52 }
      ]),
      signal('Half-court organization', 0.16, [
        { label: 'Indiana still has the slightly cleaner expected setup', score: 58 },
        { label: 'Los Angeles needs to create more stable late possessions', score: 44 }
      ]),
      signal('Closing-time trust', 0.16, [
        { label: 'Lean favorite only if the closing possessions stay organized', score: 54 },
        { label: 'Home dog route gets stronger if the final minutes get messy', score: 46 }
      ])
    ],
    volatility: {
      base: 66,
      modifiers: [
        modifier('Short spread makes this one of the noisiest boards of the day', 8),
        modifier('Yesterdays late WNBA swings reinforce the caution here', 4)
      ]
    }
  },
  'lynx-wings': {
    sourceLabel: 'LineStar WNBA team records + official WNBA roster production',
    signals: [
      signal('Lead-guard orchestration', 0.2, [
        { label: 'Olivia Miles 17.0 PPG and 7.5 APG plus Courtney Williams 5.5 APG', score: 58 },
        { label: 'Paige Bueckers 17.5 PPG plus Odyssey Sims support behind Arike', score: 62 }
      ]),
      signal('Pure shot-making ceiling', 0.18, [
        { label: 'Kayla McBride 17.0 PPG keeps Minnesota live every quarter', score: 56 },
        { label: 'Arike Ogunbowale 21.0 PPG is still the top single-game scorer', score: 69 }
      ]),
      signal('Team profile', 0.18, [
        { label: '89.0 PPG with the No. 9 defense', score: 57 },
        { label: '89.5 PPG with the No. 11 defense', score: 53 }
      ]),
      signal('Market and venue', 0.14, [
        { label: 'Road dog on a short board', score: 46 },
        { label: 'Home favorite around -175 and -3.5', score: 54 }
      ]),
      signal('Late-game control risk', 0.14, [
        { label: 'Minnesota path rises if the game becomes a passing and poise contest', score: 52 },
        { label: 'Dallas still needs to close a short number cleanly', score: 48 }
      ])
    ],
    volatility: {
      base: 68,
      modifiers: [
        modifier('Short spread keeps both fourth-quarter paths live', 7),
        modifier('Early-season sample is still thin', 6),
        modifier('Both teams have credible lead guards, which raises swing potential', 4)
      ]
    }
  },
  'liberty-fire': {
    sourceLabel: 'LineStar WNBA team records + official WNBA roster production',
    signals: [
      signal('Offensive separation', 0.24, [
        { label: '100.0 PPG and the No. 1 offense on the board', score: 89 },
        { label: '90.5 PPG but facing a clear class jump', score: 39 }
      ]),
      signal('Top-end scorers', 0.2, [
        { label: 'Stewart 23.3, Johannes 20.0, Jonquel 13.3', score: 88 },
        { label: 'Leite 19.5 and Carleton 19.5 keep the dog from being empty', score: 47 }
      ]),
      signal('Secondary creation', 0.14, [
        { label: 'Pauline Astier 15.7 PPG and 4.7 APG extend the setup tree', score: 79 },
        { label: 'Leite is the cleanest home-side organizer at 4.5 APG', score: 44 }
      ]),
      signal('Defense profile', 0.16, [
        { label: '88.7 allowed per game with more trusted rebound-and-close pieces', score: 64 },
        { label: '97.0 allowed per game and 14th-ranked defense', score: 36 }
      ]),
      signal('Home-dog variance', 0.1, [
        { label: 'Road favorite still carries some environment drag', score: 47 },
        { label: 'Home crowd keeps a little dog equity alive', score: 53 }
      ])
    ],
    volatility: {
      base: 55,
      modifiers: [
        modifier('Large spread lowers outright upset frequency', -8),
        modifier('Road favorite still has some backdoor variance', 4),
        modifier('Portland has enough scoring punch to stay noisy if New York coasts', 3)
      ]
    }
  },
  'pistons-cavaliers-g6': {
    sourceLabel: 'Moneyline + official Games 1-5 playoff box scores',
    signals: [
      signal('Series scoring profile', 0.16, [
        { label: '108.6 points per game through five games', score: 49 },
        { label: '109.0 points per game through five games', score: 51 }
      ]),
      signal('Lead-creator shape', 0.18, [
        { label: 'Cunningham still owns the cleaner possession-by-possession script', score: 62 },
        { label: 'Harden and Mitchell finally landed together in Game 5', score: 69 }
      ]),
      signal('Support-cast dependability', 0.16, [
        { label: 'Detroit support has been steadier across the whole series', score: 58 },
        { label: 'Cleveland support now has a stronger top-end answer after the comeback win', score: 63 }
      ]),
      signal('Late-game trust', 0.16, [
        { label: 'Road elimination team still needs cleaner closing offense', score: 46 },
        { label: 'Home closeout spot with revived shot creation', score: 67 }
      ]),
      signal('Venue and leverage', 0.12, [
        { label: 'Road elimination game', score: 45 },
        { label: 'Home floor in a Game 6 closeout chance', score: 55 }
      ])
    ],
    volatility: {
      base: 60,
      modifiers: [
        modifier('Detroit has already proven the series can bend back toward control basketball', 4),
        modifier('Cleveland finally stole the first road win and carries better current momentum', -3),
        modifier('Single-game Cunningham or Mitchell takeover paths still keep the board noisy', 5)
      ]
    }
  },
  'spurs-timberwolves-g6': {
    sourceLabel: 'Moneyline + official Games 1-5 playoff box scores',
    signals: [
      signal('Series scoring profile', 0.18, [
        { label: '117.0 points per game through five games', score: 79 },
        { label: '103.6 points per game through five games', score: 21 }
      ]),
      signal('Interior force', 0.2, [
        { label: 'Wembanyama reclaimed the paint script in Game 5', score: 86 },
        { label: 'Minnesota still needs a cleaner frontcourt answer', score: 34 }
      ]),
      signal('Secondary creators', 0.14, [
        { label: 'Fox and Castle keep extending the Spurs setup tree', score: 74 },
        { label: 'Edwards still needs steadier support behind him', score: 44 }
      ]),
      signal('Current form', 0.14, [
        { label: '126-97 response in Game 5', score: 78 },
        { label: 'Home elimination urgency after a blowout loss', score: 43 }
      ]),
      signal('Venue and pressure', 0.12, [
        { label: 'Road closeout attempt', score: 45 },
        { label: 'Home elimination game', score: 55 }
      ])
    ],
    volatility: {
      base: 56,
      modifiers: [
        modifier('Minnesota home elimination spot adds real response variance', 6),
        modifier('San Antonio owns the clearest current interior edge in the series', -4),
        modifier('Edwards single-game eruption path still keeps the dog alive', 4)
      ]
    }
  },
  'aces-sun-2026-05-15': {
    sourceLabel: 'LineStar WNBA team records + official WNBA roster production',
    signals: [
      signal('Team profile', 0.22, [
        { label: '89.7 PPG with the No. 3 offense', score: 84 },
        { label: '75.3 PPG with the No. 15 offense', score: 24 }
      ]),
      signal('Top-end star power', 0.2, [
        { label: "A'ja Wilson, Chennedy Carter, and Jackie Young", score: 86 },
        { label: 'Morrow and Griner need a compressed script', score: 34 }
      ]),
      signal('Defense and control', 0.16, [
        { label: 'No. 6 defense and steadier late-game structure', score: 73 },
        { label: 'No. 14 defense has leaked too much early-season pressure', score: 37 }
      ]),
      signal('Road professionalism', 0.12, [
        { label: 'Veteran road favorite profile', score: 60 },
        { label: 'Home underdog energy', score: 40 }
      ])
    ],
    volatility: {
      base: 55,
      modifiers: [
        modifier('Large spread lowers outright upset frequency', -8),
        modifier('Backdoor-cover risk still matters in a number this big', 5)
      ]
    }
  },
  'mystics-fever-2026-05-15': {
    sourceLabel: 'LineStar WNBA team records + official WNBA roster production',
    signals: [
      signal('Offensive ceiling', 0.22, [
        { label: '80.5 PPG and more half-court grind', score: 38 },
        { label: '95.5 PPG with the No. 2 offense', score: 82 }
      ]),
      signal('Lead creators', 0.2, [
        { label: 'Citron and Austin keep Washington live', score: 54 },
        { label: 'Clark and Mitchell own the cleaner scoring tree', score: 84 }
      ]),
      signal('Defense profile', 0.18, [
        { label: 'No. 5 defense can flatten the game', score: 68 },
        { label: 'No. 12 defense leaves more late-game leakage', score: 46 }
      ]),
      signal('Venue and market', 0.12, [
        { label: 'Road dog around +295', score: 42 },
        { label: 'Home favorite around -375', score: 58 }
      ])
    ],
    volatility: {
      base: 63,
      modifiers: [
        modifier('Washington defensive floor keeps the dog route alive', 5),
        modifier('Indiana still owns the clearer offensive ceiling at home', -2),
        modifier('WNBA lead-fragility remains part of the current environment', 4)
      ]
    }
  },
  'tempo-sparks-2026-05-15': {
    sourceLabel: 'LineStar WNBA team records + official WNBA roster production',
    signals: [
      signal('Current team profile', 0.18, [
        { label: '75.5 PPG but the No. 1 defense', score: 60 },
        { label: '78.0 PPG with the No. 13 defense', score: 52 }
      ]),
      signal('Top-end scoring', 0.2, [
        { label: 'Mabrey and Sykes can keep the dog live', score: 58 },
        { label: 'Plum plus veteran frontcourt scoring still owns the cleaner ceiling', score: 72 }
      ]),
      signal('Late-game trust', 0.16, [
        { label: 'Expansion team still proving the closing script', score: 42 },
        { label: 'Home favorite with more veteran scoring answers', score: 66 }
      ]),
      signal('Venue and market', 0.12, [
        { label: 'Road dog around +270', score: 43 },
        { label: 'Home favorite around -340', score: 57 }
      ])
    ],
    volatility: {
      base: 67,
      modifiers: [
        modifier('Toronto defensive edge keeps this noisier than the moneyline suggests', 6),
        modifier('Sparks defensive profile is still too loose for a clean favorite script', 4),
        modifier('Plum single-game scoring ceiling trims some of the chaos', -2)
      ]
    }
  },
  'sky-mercury-2026-05-15': {
    sourceLabel: 'LineStar WNBA team records + official WNBA roster production',
    signals: [
      signal('Current form and defense', 0.2, [
        { label: '2-0 start with the No. 2 defense', score: 72 },
        { label: '1-2 with a more neutral defense profile', score: 54 }
      ]),
      signal('Shot creation', 0.18, [
        { label: 'Rickea plus the guard mix keep Chicago live', score: 56 },
        { label: 'Copper and Alyssa Thomas still own the cleaner veteran creation tree', score: 68 }
      ]),
      signal('Interior control', 0.16, [
        { label: 'Cardoso gives Chicago a real paint anchor', score: 66 },
        { label: 'Phoenix still needs more than one interior answer', score: 52 }
      ]),
      signal('Venue and late-game trust', 0.14, [
        { label: 'Road dog with stronger current defense', score: 48 },
        { label: 'Home favorite with more proven closing creators', score: 62 }
      ])
    ],
    volatility: {
      base: 66,
      modifiers: [
        modifier('Short number keeps both fourth-quarter paths alive', 6),
        modifier('Chicago defensive profile makes the dog more credible than usual', 4),
        modifier('Phoenix veteran closers trim a little of the chaos', -2)
      ]
    }
  },
  'aces-dream-2026-05-17': {
    sourceLabel: 'WNBA official team and player stats + Covers moneyline snapshot',
    signals: [
      signal('Team scoring profile', 0.22, [
        { label: '92.5 PPG with a +7.5 point differential', score: 82 },
        { label: '84.0 PPG with a 2-0 start and +3 differential', score: 62 }
      ]),
      signal('Top-end star control', 0.24, [
        { label: "A'ja Wilson 26.3 PPG with Jackie Young and Chelsea Gray behind her", score: 84 },
        { label: 'Allisha Gray 25.0 PPG with Canada, Howard, and Reese keeping Atlanta live', score: 74 }
      ]),
      signal('Glass and physicality', 0.16, [
        { label: '35.0 rebounds per game and cleaner shotmaking', score: 48 },
        { label: '45.0 rebounds per game with Angel Reese at 15.0 boards', score: 72 }
      ]),
      signal('Late-game trust', 0.16, [
        { label: 'Veteran Aces late-clock answers still grade cleaner', score: 76 },
        { label: 'Dream are live, but still newer in this exact closing tier', score: 54 }
      ]),
      signal('Market and venue', 0.12, [
        { label: 'Road side sitting near even money', score: 48 },
        { label: 'Home side slight favorite around -120', score: 52 }
      ])
    ],
    volatility: {
      base: 69,
      modifiers: [
        modifier('Near-pickem board keeps both scripts alive', 8),
        modifier('Atlanta rebounding edge can bend the game late', 5),
        modifier("A'ja's top-end control trims some of the chaos", -2)
      ]
    }
  },
  'storm-fever-2026-05-17': {
    sourceLabel: 'WNBA official team and player stats + Covers moneyline snapshot',
    signals: [
      signal('Offensive ceiling', 0.24, [
        { label: '80.7 PPG with a much thinner half-court tree', score: 32 },
        { label: '97.7 PPG and the cleanest scoring profile on the board', score: 88 }
      ]),
      signal('Lead creators', 0.22, [
        { label: 'Malonga leads at 16.0 PPG, but the shot-creation tree is still forming', score: 36 },
        { label: 'Kelsey Mitchell 25.7 and Caitlin Clark 25.3 with 8.0 APG', score: 90 }
      ]),
      signal('Ball movement and control', 0.16, [
        { label: '16.0 assists per game with less reliable pressure release', score: 40 },
        { label: '22.3 assists per game with more organized flow', score: 78 }
      ]),
      signal('Frontcourt support', 0.14, [
        { label: 'Storm size keeps them from being empty', score: 50 },
        { label: 'Aliyah Boston plus Monique Billings keep the favorite from being guard-only', score: 64 }
      ]),
      signal('Market and venue', 0.12, [
        { label: 'Road dog north of +350', score: 28 },
        { label: 'Home favorite around -556', score: 72 }
      ])
    ],
    volatility: {
      base: 59,
      modifiers: [
        modifier('Big favorite script lowers outright upset frequency', -6),
        modifier('Early-season sample is still thin enough to keep some variance alive', 4),
        modifier('Indiana offense has the cleanest current creation tree', -3)
      ]
    }
  },
  'sky-lynx-2026-05-17': {
    sourceLabel: 'WNBA official team and player stats + Covers moneyline snapshot',
    signals: [
      signal('Current team shape', 0.22, [
        { label: '83.3 PPG with a +4.3 point differential', score: 54 },
        { label: '89.3 PPG with a +2.3 differential and stronger shot quality', score: 66 }
      ]),
      signal('Lead-guard orchestration', 0.22, [
        { label: 'Skylar Diggins 5.7 APG behind Rickea Jackson scoring pressure', score: 48 },
        { label: 'Olivia Miles 16.3 PPG and 7.0 APG with Courtney Williams support', score: 74 }
      ]),
      signal('Interior presence', 0.16, [
        { label: 'Kamilla Cardoso 12.3 PPG and 9.7 RPG keep Chicago live inside', score: 66 },
        { label: 'Natasha Howard 15.3 PPG and 7.0 RPG keep Minnesota balanced', score: 58 }
      ]),
      signal('Wing scoring dependability', 0.16, [
        { label: 'Rickea is the sharpest single scorer in this matchup at 22.0 PPG', score: 64 },
        { label: 'Minnesota has more scoring depth across four starters in double figures range', score: 70 }
      ]),
      signal('Market and venue', 0.12, [
        { label: 'Road dog around +166', score: 42 },
        { label: 'Home favorite around -208', score: 58 }
      ])
    ],
    volatility: {
      base: 66,
      modifiers: [
        modifier('Chicago interior edge keeps the dog route alive', 5),
        modifier('Minnesota has the cleaner lead-guard structure at home', -2),
        modifier('Short-to-medium number keeps fourth-quarter variance in play', 4)
      ]
    }
  },
  'tempo-sparks-2026-05-17': {
    sourceLabel: 'WNBA official team and player stats + Covers moneyline snapshot',
    signals: [
      signal('Current team profile', 0.22, [
        { label: '82.0 PPG with a positive point differential despite the 1-2 record', score: 66 },
        { label: '85.0 PPG but a -10.7 point differential through three games', score: 46 }
      ]),
      signal('Top-end scoring', 0.22, [
        { label: 'Mabrey 20.0 and Sykes 19.7 keep Toronto live every quarter', score: 60 },
        { label: 'Kelsey Plum 26.3 plus Nneka and Hamby still own the cleaner star ceiling', score: 80 }
      ]),
      signal('Ball security and defensive pressure', 0.18, [
        { label: '11.3 steals per game and less turnover leakage', score: 72 },
        { label: '18.0 turnovers per game and a looser defensive script', score: 34 }
      ]),
      signal('Late-game trust', 0.14, [
        { label: 'Expansion roster still proving the close', score: 42 },
        { label: 'Home side still gets the veteran closing vote', score: 62 }
      ]),
      signal('Market and venue', 0.12, [
        { label: 'Road dog around +266', score: 38 },
        { label: 'Home favorite around -357', score: 62 }
      ])
    ],
    volatility: {
      base: 72,
      modifiers: [
        modifier('Toronto profile is better than the record, which keeps the dog alive', 7),
        modifier('Sparks have the cleaner single-scorer ceiling through Plum', -2),
        modifier('Expansion-game late scripts are still noisy', 5)
      ]
    }
  },
  'cavaliers-pistons-g7': {
    sourceLabel: 'Moneyline + official Games 1-6 playoff results',
    signals: [
      signal('Series scoring profile', 0.18, [
        { label: '106.2 points per game through six games', score: 44 },
        { label: '109.7 points per game through six games', score: 56 }
      ]),
      signal('Possession organizer', 0.18, [
        { label: 'Mitchell and Harden still own the fastest bailout scoring path', score: 58 },
        { label: 'Cade Cunningham has been the steadier game-shape organizer', score: 66 }
      ]),
      signal('Current momentum', 0.22, [
        { label: 'Cleveland got run out 115-94 in Game 6 and now has to answer on the road', score: 28 },
        { label: 'Detroit forced Game 7 by taking back the physical script in Game 6', score: 72 }
      ]),
      signal('Support-cast dependability', 0.14, [
        { label: 'Cleveland support still swings wider game to game', score: 46 },
        { label: 'Detroit support has landed more consistent two-way possessions', score: 60 }
      ]),
      signal('Market and venue', 0.12, [
        { label: 'Road dog around +150', score: 42 },
        { label: 'Home favorite around -180 in a true Game 7', score: 58 }
      ]),
      signal('Late-shotmaking ceiling', 0.16, [
        { label: 'Mitchell-Harden can still steal the last five minutes if the game compresses', score: 64 },
        { label: 'Detroit still needs to finish the control work with enough shot making', score: 56 }
      ])
    ],
    volatility: {
      base: 78,
      modifiers: [
        modifier('Game 7 leverage alone makes this the noisiest board on the slate', 10),
        modifier('Detroit just reset the series with a road blowout', 4),
        modifier('Cleveland still has enough star scoring to flip a close finish', 6),
        modifier('Home floor gives Detroit the cleanest control path', -2)
      ]
    }
  }
}

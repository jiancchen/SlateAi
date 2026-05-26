import type { HistoryEntry } from './history-types'
import { may23HistorySportTabs } from './history-day-2026-05-23'
import { may24HistorySportTabs } from './history-day-2026-05-24'

export const historyArchive: HistoryEntry[] = [
  {
    id: '2026-05-25',
    date: '2026-05-25',
    label: 'May 25, 2026',
    status: 'graded',
    summary:
      'The May 25 MLB board was a losing side day with even more damage pushed into first five and props. The clearest truth from the archive is that totals-style restraint aged much better than the broad side and prop spread.',
    sports: ['MLB'],
    trackedMarkets: ['MLB moneyline', 'MLB first 5', 'MLB first inning', 'HR props', 'Player props'],
    performance: {
      mlbFullGame: { wins: 5, losses: 8 },
      mlbFirst5: { wins: 4, losses: 9 },
      mlbFirstInning: { wins: 6, losses: 7 },
      hrBoard: { hits: 2, total: 12 },
      mlbProps: { hits: 0, total: 28 }
    },
    journal: {
      path: 'data-private/history/mlb-results-2026-05-25.jsonl',
      records: 66,
      sideRows: 13,
      hrRows: 12,
      propRows: 28,
      note: 'May 25 was backfilled from the saved day board, derived first-inning results, the HR archive, and tracked prop backtests after the original history exporter stopped at May 24.'
    },
    metrics: [
      { label: 'MLB full game', value: '5-8', tone: 'negative' },
      { label: 'MLB first 5', value: '4-9', note: 'The early-game side lane was worse than the final result board', tone: 'negative' },
      { label: 'MLB 1st inning', value: '6-7', note: 'Close to flat again, but still below the bar we need', tone: 'warning' },
      { label: 'HR board', value: '2/12', note: 'A little better than the worst days, still not strong enough', tone: 'warning' },
      { label: 'Tracked props', value: '0/28', note: 'The May 25 prop board completely failed again', tone: 'negative' }
    ],
    notableHits: [
      'The full-game side wins were Brewers, Nationals, Phillies, Dodgers, and Yankees.',
      'The cleaner first-inning hits came from Astros/Rangers YRFI, Marlins/Blue Jays YRFI, Phillies/Padres YRFI, Reds/Mets NRFI, Twins/White Sox YRFI, and Yankees/Royals NRFI.',
      'The HR board at least found two homers instead of going nearly blank.'
    ],
    notableMisses: [
      'The full-game side misses piled up on Rangers, Cubs, Giants, Athletics, Blue Jays, Rays, Mets, and Twins.',
      'First five was even rougher than full game, which is a bad sign for the current early-script side framing.',
      'Tracked props went 0-for-28, which makes the lane unusable until it is rebuilt.'
    ],
    whatWorked: [
      'The archive now captures the actual May 25 MLB slip instead of dropping the day entirely from the models page.',
      'The first-inning lane at least stayed close enough to flat that we can inspect it by reason stack instead of dismissing it as pure noise.',
      'The journal for this day is now durable and can feed future calibration work.'
    ],
    whatMissed: [
      'The side board still overexposed itself to mediocre confidence plays instead of filtering harder.',
      'The first-five layer remains weaker than both full game and totals-style thinking.',
      'Props are still the worst product on the board by a wide margin.'
    ],
    takeaways: [
      'May 25 should count on the models page as a losing MLB day, not as a missing one.',
      'This is another piece of evidence that the current side engine needs a pass-first gate before it earns recommendation authority.',
      'Any lane that cannot beat these archive baselines should be demoted automatically on the live board.'
    ],
    artifacts: [
      {
        label: 'May 25 MLB results journal',
        path: 'data-private/history/mlb-results-2026-05-25.jsonl'
      },
      {
        label: 'Stored May 25 board',
        path: 'web/src/lib/day-2026-05-25.js'
      },
      {
        label: 'Saved May 25 tracked prop board',
        path: 'data-private/predictions/mlb-player-props/2026-05-25-player-props.json'
      },
      {
        label: 'Saved May 25 HR board',
        path: 'data-private/predictions/mlb-home-runs/2026-05-25-statcast-prototype.json'
      }
    ]
  },
  {
    id: '2026-05-24',
    date: '2026-05-24',
    label: 'May 24, 2026',
    status: 'graded',
    summary:
      'Roland Garros Day 1 stayed solid on the tennis side, and the same-date MLB slate was much better than the blank chart implied: 10-5 full game, 7-8 first five, 8-7 first inning, with the damage pushed into props instead of sides.',
    sports: ['Tennis', 'MLB'],
    trackedMarkets: ['Match winner', 'MLB moneyline', 'MLB first 5', 'MLB first inning', 'HR props', 'Player props'],
    performance: {
      tennis: { wins: 25, losses: 11 },
      mlbFullGame: { wins: 10, losses: 5 },
      mlbFirst5: { wins: 7, losses: 8 },
      mlbFirstInning: { wins: 8, losses: 7 },
      hrBoard: { hits: 2, total: 12 },
      mlbProps: { hits: 0, total: 29 }
    },
    journal: {
      path: 'data-private/history/mlb-results-2026-05-24.jsonl',
      records: 71,
      sideRows: 15,
      hrRows: 12,
      propRows: 29,
      note: 'May 24 MLB was rebuilt from the generated live board plus the outcome warehouse after the original closeout skipped the side import, and now includes the derived first-inning lane.'
    },
    metrics: [
      { label: 'Tennis desk', value: '25-11', tone: 'positive' },
      { label: 'MLB full game', value: '10-5', tone: 'positive' },
      { label: 'MLB first 5', value: '7-8', note: 'The early lane lagged the stronger full-game board', tone: 'warning' },
      { label: 'MLB 1st inning', value: '8-7', note: 'The new YRFI/NRFI lane was basically coin-flip on day two', tone: 'warning' },
      { label: 'Tracked props', value: '0/29', note: 'The May 24 prop board completely failed', tone: 'negative' },
      { label: 'ATP board', value: '14-6', note: 'The cleaner part of the card again', tone: 'positive' },
      { label: 'WTA board', value: '11-5', note: 'Still the shakier lane', tone: 'warning' }
    ],
    notableHits: [
      'Khachanov, Zverev, Djokovic, Fonseca, Mensik, Medjedovic, Sonego, and Blockx all landed on the ATP side.',
      'Baptiste over Krejcikova, Francesca Jones over Haddad Maia, Sierra over Raducanu, and Bejlek over Stephens were the sharper women’s hits.',
      'The desk stayed on the right side of the stronger clay-shape favorites much more often than the noisier coin-flip lanes.',
      'On the MLB slate, Guardians, Marlins, Dodgers, Astros, Giants, Diamondbacks, both Tigers/Orioles reads, and the Pirates all landed on the full-game board.'
    ],
    notableMisses: [
      'The biggest ATP misses were Fritz, Etcheverry, Dellien, and Diallo.',
      'The WTA misses clustered in the more volatile lanes: Burel, Valentova, Sorribes Tormo, Tauson, and the Tagger/Wang opener.',
      'This was not a slate where broad “current form” was enough on the women’s side without cleaner surface or matchup confirmation.',
      'The strongest MLB misses were the Padres and Braves, both of which lost outright despite clearing the old favorite-side bar.'
    ],
    whatWorked: [
      'ATP clay structure remained the most trustworthy part of the tennis board.',
      'The page now has a real per-match history review instead of flattening the whole day into one summary paragraph.',
      'The archive can finally separate where the board was strong from where it was simply busy.',
      'May 24 MLB proves the side board can still grade positively even on a slate where the first-five and prop lanes do not.'
    ],
    whatMissed: [
      'Too many of the misses still came from trying to be clever in women’s toss-up spots.',
      'A few public-favorite ATP reads were not strong enough to justify the confidence they carried.',
      'The slate needed a clearer separation between “clean favorite,” “live dog,” and “coin flip we should leave alone.”',
      'The MLB prop board was unusable on May 24, and the first-five layer still trailed the stronger full-game read.'
    ],
    takeaways: [
      'May 24 confirms the earlier lesson that ATP clay is the better predictive lane than WTA volatility.',
      'The tennis history page should be used as a benchmark archive, not just a postmortem note.',
      'When the board has a real edge, it needs to show up game by game like this, not just in an aggregate record.',
      'For MLB, May 24 should count as a good side day, not a blank or zero day, and the models page should say so explicitly.'
    ],
    artifacts: [
      {
        label: 'May 24 MLB results journal',
        path: 'data-private/history/mlb-results-2026-05-24.jsonl'
      },
      {
        label: 'Saved May 24 prop board',
        path: 'data-private/predictions/mlb-player-props/2026-05-24-player-props.json'
      },
      {
        label: 'Saved May 24 HR board',
        path: 'data-private/predictions/mlb-home-runs/2026-05-24-statcast-prototype.json'
      },
      {
        label: 'Published slate summary',
        path: 'published-data/slates/2026-05-24/summary.json'
      },
      {
        label: 'Stored day board',
        path: 'web/src/lib/day-2026-05-24.js'
      },
      {
        label: 'May 24 history detail data',
        path: 'web/src/lib/history-day-2026-05-24.ts'
      }
    ],
    sportTabs: may24HistorySportTabs
  },
  {
    id: '2026-05-23',
    date: '2026-05-23',
    label: 'May 23, 2026',
    status: 'graded',
    summary:
      'A dead-early, low-conversion MLB slate that exposed the side board’s biggest flaw: it kept leaning on paper strength even when the predicted team never got going soon enough.',
    sports: ['MLB'],
    trackedMarkets: ['Moneyline', 'First 5', 'First inning', 'HR props', 'Player props'],
    performance: {
      mlbFullGame: { wins: 7, losses: 7 },
      mlbFirst5: { wins: 7, losses: 7 },
      mlbFirstInning: { wins: 7, losses: 7 }
    },
    journal: {
      path: 'data-private/history/mlb-results-2026-05-23.jsonl',
      records: 68,
      sideRows: 14,
      hrRows: 12,
      propRows: 28,
      note: 'This archive block now points at the rebuilt May 23 results journal, including the derived first-inning lane and the original tracked prop rows.'
    },
    metrics: [
      { label: 'MLB full game', value: '7-7', tone: 'warning' },
      { label: 'MLB first 5', value: '7-7', tone: 'warning' },
      { label: '1st inning lane', value: '7-7', note: 'Mostly timing misses on oversmoothed YRFI spots', tone: 'warning' },
      { label: 'Top props', value: '3/8', note: 'All top 8 settled props were TB over 1.5', tone: 'negative' }
    ],
    notableHits: [
      'Astros, Phillies, Marlins, Twins, Cardinals game 2, Dodgers, and Diamondbacks all landed on the full-game side board.',
      'The cleaner winning paths were narrow: three starter-carried wins, two jumped-early holds, and two late comebacks.',
      'The slate clearly separated dead-early losses from true starter-collapse games, which is useful training data.'
    ],
    notableMisses: [
      'Five of the seven full-game misses came from the same failure path: dead_early_loss.',
      'The first-inning board over-predicted YRFI in quiet-first-inning spots like Cardinals/Reds, White Sox/Giants, and Rockies/Diamondbacks.',
      'The top prop cluster was effectively one repeated market, and it only went 3-for-8.'
    ],
    whatWorked: [
      'The postmortem finally made the repeated failure path obvious instead of treating the day like random noise.',
      'Game-by-game paths such as starter_carried, jumped_early_hold, and late_comeback gave the archive better structure.',
      'The slate produced exactly the kind of examples needed for dead_early_loss and timing suppression work.'
    ],
    whatMissed: [
      'The side engine still picked first and vetoed later, which left too many paper-side reads alive.',
      'The first-inning lane still leaned too hard on broad recent offense instead of quiet-series and quiet-first-three shape.',
      'The veto layer stayed too blunt to be used as a real live gate.'
    ],
    takeaways: [
      'May 23 should be remembered as a dead-early timing failure, not a generic bad-luck slate.',
      'The board needs to promote early scoring shape and suppression logic ahead of raw side confidence.',
      'Archive quality improved the moment the day was reviewed by path instead of only wins and losses.'
    ],
    artifacts: [
      {
        label: 'May 23 postmortem',
        path: 'development-docs/may23-slate-postmortem-052326.md'
      },
      {
        label: 'May 23 chaos follow-ups',
        path: 'development-docs/may23-chaos-followups-052326.md'
      },
      {
        label: 'Stored live slate',
        path: 'web/src/lib/day-2026-05-23.js'
      }
    ],
    sportTabs: may23HistorySportTabs
  },
  {
    id: '2026-05-22',
    date: '2026-05-22',
    label: 'May 22, 2026',
    status: 'graded',
    summary:
      'A split-script baseball slate: several truly dead-scoring games, several loud games, too many comeback and bullpen-turn losses for the side board, but the tracked non-HR props were the most encouraging part of the day.',
    sports: ['MLB'],
    trackedMarkets: ['Moneyline', 'First 5', 'HR props', 'Player props'],
    performance: {
      mlbFullGame: { wins: 7, losses: 7 },
      mlbFirst5: { wins: 6, losses: 8 },
      hrBoard: { hits: 1, total: 12 },
      mlbProps: { hits: 15, total: 27 }
    },
    journal: {
      path: 'data-private/history/mlb-results-2026-05-22.jsonl',
      records: 53,
      sideRows: 14,
      hrRows: 12,
      propRows: 27,
      note: 'This is the first fully warehoused day with the newer tracked prop board, game-story signals, and cleaned final-only outcome filtering.'
    },
    metrics: [
      { label: 'MLB full game', value: '7-7', tone: 'warning' },
      { label: 'MLB first 5', value: '6-8', tone: 'negative' },
      { label: 'HR board', value: '1/12', note: 'Juan Soto only', tone: 'negative' },
      { label: 'Story shape', value: '8 comebacks / 3 bullpen flips', note: 'Not a uniform under slate; too many games changed script midstream', tone: 'warning' }
    ],
    notableHits: [
      'Astros, Rays, Blue Jays, Braves, Orioles, Mariners, and White Sox all landed on the MLB full-game board.',
      'Juan Soto was the only HR board hit and got there immediately.',
      'Tracked non-HR props finished 15-for-27, led by total bases at 11-for-21.'
    ],
    notableMisses: [
      'Guardians, Mets, Red Sox, Dodgers, Rangers, Athletics, and Diamondbacks made up the seven side misses.',
      'The HR board still finished just 1-for-12.',
      'Several painful losses came from comeback or bullpen-flip game scripts rather than clean pregame misreads.'
    ],
    whatWorked: [
      'The tracked prop board finally looked more selective and materially healthier than the old broad candidate universe.',
      'The story warehouse correctly identified a split day with quiet-through-five games and separate loud-game clusters.',
      'The archive now captures comeback wins, bullpen flips, and prop results in one daily record instead of flattening everything into sides plus HR only.'
    ],
    whatMissed: [
      'The side board finished flat, and the misses were concentrated in the games that later turned into comeback or bullpen-turn chaos.',
      'The first-five layer again lagged the actual early game shape on a difficult script-divergence slate.',
      'The HR board still underperformed badly relative to the real home-run distribution.'
    ],
    takeaways: [
      'May 22 is a strong example of why “under day” was not enough as an explanation; it was really two different scoring slates in one.',
      'The next real edge is still script awareness: quiet-through-five, comeback pressure, and bullpen-turn instability mattered more than average team strength.',
      'The tracked prop board is the most encouraging model lane from this slate and deserves more development than the broad legacy prop universe.'
    ],
    artifacts: [
      {
        label: 'Daily results journal',
        path: 'data-private/history/mlb-results-2026-05-22.jsonl'
      },
      {
        label: 'Follow-up doc',
        path: 'research/followups/followup_may_22.md'
      },
      {
        label: 'Saved HR board',
        path: 'data-private/predictions/mlb-home-runs/2026-05-22-statcast-prototype.json'
      },
      {
        label: 'Saved tracked prop board',
        path: 'data-private/predictions/mlb-player-props/2026-05-22-player-props.json'
      },
      {
        label: 'Stored live slate',
        path: 'web/src/lib/day-2026-05-22.js'
      },
      {
        label: 'Stored MLB board',
        path: 'web/src/lib/day-2026-05-22-mlb.js'
      }
    ]
  },
  {
    id: '2026-05-21',
    date: '2026-05-21',
    label: 'May 21, 2026',
    status: 'graded',
    summary:
      'A better baseball side day, a useful main-tour tennis day, and another weak HR board. The Athletics late comeback was a real win, but not a clean control read.',
    sports: ['MLB', 'Tennis'],
    trackedMarkets: ['Moneyline', 'First 5', 'HR props', 'Match winner'],
    performance: {
      mlbFullGame: { wins: 5, losses: 2 },
      mlbFirst5: { wins: 4, losses: 2 },
      hrBoard: { hits: 1, total: 12 },
      tennis: { wins: 7, losses: 5 }
    },
    journal: {
      path: 'data-private/history/mlb-results-2026-05-21.jsonl',
      records: 19,
      sideRows: 7,
      hrRows: 12,
      note: 'The MLB ledger is fully exported. Tennis grading is captured in the follow-up doc, with main-tour matches settled and qualifying still kept outside the JSONL archive.'
    },
    metrics: [
      { label: 'MLB full game', value: '5-2', tone: 'positive' },
      { label: 'MLB first 5', value: '4-2-1', note: 'Diamondbacks pushed 0-0 after five', tone: 'warning' },
      { label: 'HR board', value: '1/12', note: 'Brandon Lowe only', tone: 'negative' },
      { label: 'Tennis main tour', value: '7-5', tone: 'positive' }
    ],
    notableHits: [
      'Pirates, Braves, Blue Jays, Athletics, and Diamondbacks all landed on the MLB side.',
      'The ATP clay board held again with wins from Buse, Tommy Paul, de Minaur, Navone, Ruud, and Learner Tien.',
      'Athletics came back from a 2-0 deficit after five innings to win 3-2.'
    ],
    notableMisses: [
      'Tigers over Guardians and Nationals over Mets were the two MLB side misses.',
      'The HR board only hit Brandon Lowe and missed the rest of the slate.',
      'The WTA quarterfinal reads still lagged the ATP reads on the tennis side.'
    ],
    whatWorked: [
      'The MLB side board was directionally strong at 5-2 on the full-game card.',
      'The tennis main-tour board finished 7-5 and remained useful on ATP clay.',
      'The archive now clearly distinguishes a winning side day from a good HR day, instead of flattening them together.'
    ],
    whatMissed: [
      'The HR layer still solved the wrong problem and finished 1-for-12.',
      'Not all MLB wins were clean control reads; Athletics and Diamondbacks both needed more contextual grading.',
      'WTA weekly-form drift continues to be underweighted versus ATP on these clay slates.'
    ],
    takeaways: [
      'May 21 is a good example of why the archive has to track quality of read, not just raw winner counts.',
      'A 5-2 baseball side day can still hide thin or comeback-dependent winners.',
      'The tennis model is more trustworthy on ATP clay than on current-week WTA quarterfinal spots, and the HR model still needs the largest revision.'
    ],
    artifacts: [
      {
        label: 'Daily results journal',
        path: 'data-private/history/mlb-results-2026-05-21.jsonl'
      },
      {
        label: 'Combined follow-up doc',
        path: 'research/followups/followup_may_21.md'
      },
      {
        label: 'Tennis follow-up doc',
        path: 'research/followups/followup_may_21_tennis.md'
      },
      {
        label: 'Saved HR board',
        path: 'data-private/predictions/mlb-home-runs/2026-05-21-statcast-prototype.json'
      },
      {
        label: 'Stored combined slate',
        path: 'web/src/lib/day-2026-05-21.js'
      },
      {
        label: 'Stored MLB board',
        path: 'web/src/lib/day-2026-05-21-mlb.js'
      }
    ]
  },
  {
    id: '2026-05-20',
    date: '2026-05-20',
    label: 'May 20, 2026',
    status: 'graded',
    summary:
      'Remaining-games MLB board finished basically coin-flip on sides and still weak on HR props. The card was better than May 18, but not clean enough to trust wholesale.',
    sports: ['MLB'],
    trackedMarkets: ['Moneyline', 'First 5', 'HR props'],
    performance: {
      mlbFullGame: { wins: 7, losses: 6 },
      mlbFirst5: { wins: 5, losses: 8 },
      hrBoard: { hits: 2, total: 12 }
    },
    journal: {
      path: 'data-private/history/mlb-results-2026-05-20.jsonl',
      records: 25,
      sideRows: 13,
      hrRows: 12,
      note: 'Remaining-games slate only; two early MLB games were excluded before the board was saved.'
    },
    metrics: [
      { label: 'MLB full game', value: '7-6', tone: 'positive' },
      { label: 'MLB first 5', value: '5-8', tone: 'negative' },
      { label: 'HR board', value: '2/12', note: 'Casey Schmitt, Jake Burger', tone: 'warning' },
      { label: 'Slate shape', value: 'Remaining games only', note: 'Two early MLB games were already excluded', tone: 'info' }
    ],
    notableHits: [
      'Dodgers over Padres landed as the cleanest late-board side.',
      'Mariners over White Sox helped keep the full-game card barely positive.',
      'Casey Schmitt and Jake Burger were the only HR board hits.'
    ],
    notableMisses: [
      'Giants over Diamondbacks missed again despite the board still giving that matchup too much respect.',
      'Mets, Yankees, Royals, Cardinals, and Tigers all failed as side picks.',
      'The first-five layer lagged the full-game board again.'
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
        label: 'Daily results journal',
        path: 'data-private/history/mlb-results-2026-05-20.jsonl'
      },
      {
        label: 'Follow-up doc',
        path: 'research/followups/followup_may_20.md'
      },
      {
        label: 'Saved HR board',
        path: 'data-private/predictions/mlb-home-runs/2026-05-20-statcast-prototype.json'
      },
      {
        label: 'Stored live slate',
        path: 'web/src/lib/day-2026-05-20.js'
      },
      {
        label: 'Stored MLB board',
        path: 'web/src/lib/day-2026-05-20-mlb.js'
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
    performance: {
      mlbFullGame: { wins: 11, losses: 4 },
      mlbFirst5: { wins: 8, losses: 7 },
      hrBoard: { hits: 0, total: 12 }
    },
    journal: {
      path: 'data-private/history/mlb-results-2026-05-19.jsonl',
      records: 27,
      sideRows: 15,
      hrRows: 12,
      note: 'Best MLB side day in the graded archive, but still a complete HR wipeout.'
    },
    metrics: [
      { label: 'MLB full game', value: '11-4', tone: 'positive' },
      { label: 'MLB first 5', value: '8-7', tone: 'warning' },
      { label: 'HR board', value: '0/12', tone: 'negative' },
      { label: 'Cleanest side day', value: 'Yes', note: 'Best MLB side mark in the current archive block', tone: 'positive' }
    ],
    notableHits: [
      'Braves over Marlins and Red Sox over Royals were part of the sharpest side cluster.',
      'Diamondbacks over Rockies and Athletics over Angels helped push the full-game board to 11-4.',
      'The side engine finally looked like it could win without inventing giant fake edges.'
    ],
    notableMisses: [
      'Blue Jays over Yankees, Twins over Astros, Giants over Diamondbacks, and Mariners over White Sox were the main side misses.',
      'The HR board still went 0-for-12 even on the best side day.',
      'Good side performance still masked that the player-prop layer was solving the wrong problem.'
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
        label: 'Daily results journal',
        path: 'data-private/history/mlb-results-2026-05-19.jsonl'
      },
      {
        label: 'Follow-up doc',
        path: 'research/followups/followup_may_19.md'
      },
      {
        label: 'Saved HR board',
        path: 'data-private/predictions/mlb-home-runs/2026-05-19-statcast-prototype.json'
      },
      {
        label: 'Stored live slate',
        path: 'web/src/lib/day-2026-05-19.js'
      },
      {
        label: 'Stored MLB board',
        path: 'web/src/lib/day-2026-05-19-mlb.js'
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
    performance: {
      mlbFullGame: { wins: 6, losses: 8 },
      mlbFirst5: { wins: 4, losses: 10 },
      hrBoard: { hits: 0, total: 12 },
      wnba: { wins: 1, losses: 1 },
      nba: { wins: 0, losses: 1 }
    },
    journal: {
      path: 'data-private/history/mlb-results-2026-05-18.jsonl',
      records: 27,
      sideRows: 15,
      hrRows: 12,
      note: 'This is the slate where the archive most clearly separated bad side reads from bad HR concentration.'
    },
    metrics: [
      { label: 'MLB full game', value: '6-8', tone: 'negative' },
      { label: 'MLB first 5', value: '4-10', tone: 'negative' },
      { label: 'HR board', value: '0/12', tone: 'negative' },
      { label: 'WNBA / NBA', value: '1-1 / 0-1', tone: 'warning' }
    ],
    notableHits: [
      'Rays, Yankees, Mets, Red Sox, Twins, and Mariners won on the MLB side.',
      'The board still surfaced a few true team-level winners even on a poor overall baseball day.',
      'The postmortem cleanly separated comeback escapes from good reads.'
    ],
    notableMisses: [
      'Giants over Diamondbacks and Braves over Marlins were dead wrong early and never recovered.',
      'Dodgers over Padres, Athletics over Angels, Cubs over Brewers, Rangers over Rockies, and Tigers over Guardians all missed.',
      'The HR board missed everything despite the slate producing 32 total home runs.'
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
        label: 'Daily results journal',
        path: 'data-private/history/mlb-results-2026-05-18.jsonl'
      },
      {
        label: 'Follow-up doc',
        path: 'research/followups/followup_may_18.md'
      },
      {
        label: 'Saved HR board',
        path: 'data-private/predictions/mlb-home-runs/2026-05-18-statcast-prototype.json'
      },
      {
        label: 'Saved side board',
        path: 'data-private/predictions/mlb-sides/2026-05-18-board-v2.json'
      },
      {
        label: 'Current retro report',
        path: 'data-private/reports/current-model-retro-may16-may18.md'
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
    performance: {
      mlbFullGame: { wins: 10, losses: 5 },
      mlbFirst5: { wins: 8, losses: 7 },
      hrBoard: { hits: 3, total: 12 }
    },
    journal: {
      path: 'data-private/history/mlb-results-2026-05-17.jsonl',
      records: 27,
      sideRows: 15,
      hrRows: 12,
      note: 'Better side day than props; this is also the archive day that produced the Elly false-carryover warning.'
    },
    metrics: [
      { label: 'MLB full game', value: '10-5', tone: 'positive' },
      { label: 'MLB first 5', value: '8-7', tone: 'warning' },
      { label: 'HR board', value: '3/12', note: 'Gavin Sheets, Elly De La Cruz, Bryce Harper overlap', tone: 'warning' },
      { label: 'Archive theme', value: 'Better sides than props', tone: 'info' }
    ],
    notableHits: [
      'Braves over Red Sox, Mets over Yankees, and Phillies over Pirates were part of the stronger side cluster.',
      'Gavin Sheets and Bryce Harper were real HR board overlap hits.',
      'The side model was directionally much stronger than the player-level concentration layer.'
    ],
    notableMisses: [
      'The board still missed most of the actual loud-bat distribution despite a better side day.',
      'Diamondbacks and Giants cluster reads were still too narrow at the hitter level.',
      'This is the archive day that later exposed Elly as a false next-day carryover.'
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
        label: 'Daily results journal',
        path: 'data-private/history/mlb-results-2026-05-17.jsonl'
      },
      {
        label: 'Follow-up doc',
        path: 'research/followups/followup_may_17.md'
      },
      {
        label: 'Saved HR board',
        path: 'data-private/predictions/mlb-home-runs/2026-05-17-statcast-prototype.json'
      },
      {
        label: 'Saved side board',
        path: 'data-private/predictions/mlb-sides/2026-05-17-board-v2.json'
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
    performance: {
      mlbFullGame: { wins: 8, losses: 7 },
      mlbFirst5: { wins: 8, losses: 7 },
      hrBoard: { hits: 6, total: 12 }
    },
    journal: {
      path: 'data-private/history/mlb-results-2026-05-16.jsonl',
      records: 27,
      sideRows: 15,
      hrRows: 12,
      note: 'Best HR hit rate in the current archive block, but still a very narrow board versus the actual loud bats.'
    },
    metrics: [
      { label: 'MLB full game', value: '8-7', tone: 'warning' },
      { label: 'MLB first 5', value: '8-7', tone: 'warning' },
      { label: 'HR board', value: '6/12', tone: 'positive' },
      { label: 'Batting-leader overlap', value: '2/30', note: 'Drake Baldwin, Bryce Harper', tone: 'negative' }
    ],
    notableHits: [
      'Nationals and Phillies were part of the stronger side outcomes.',
      'Drake Baldwin and Bryce Harper were true HR board hits.',
      'This was the archive day where the HR model looked best on paper.'
    ],
    notableMisses: [
      'Only 2 of 30 saved NL batting leaders were on the HR board.',
      'Nationals, Marlins, Dodgers, and Giants lineup waves all outran the narrow player selection.',
      'The board was still asking who homers instead of who overperforms across hits, TB, RBI, and runs.'
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
        label: 'Daily results journal',
        path: 'data-private/history/mlb-results-2026-05-16.jsonl'
      },
      {
        label: 'Follow-up doc',
        path: 'research/followups/followup_may_16.md'
      },
      {
        label: 'Saved HR board',
        path: 'data-private/predictions/mlb-home-runs/2026-05-16-statcast-prototype.json'
      },
      {
        label: 'Saved side board',
        path: 'data-private/predictions/mlb-sides/2026-05-16-board-v2.json'
      },
      {
        label: 'Daily side report',
        path: 'data-private/reports/mlb-side-backtest-2026-05-16.md'
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
      { label: 'Training full game', value: '69.4%', note: '36 games, May 10-12', tone: 'positive' },
      { label: 'Verification full game', value: '61.5%', note: '39 games, May 13-15', tone: 'warning' },
      { label: 'Training first 5', value: '61.1%', tone: 'warning' },
      { label: 'Verification first 5', value: '59.0%', tone: 'warning' }
    ],
    notableHits: [
      'This is the block where the board proved there was a real baseball read worth refining.',
      'The model was clearly better than random on both training and verification windows.'
    ],
    notableMisses: [
      'Detailed daily prop settlement was not being archived yet.',
      'Thin-edge and high-volatility misses were still too common.'
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
        path: 'data-private/reports/mlb-side-backtest-2026-05-10-to-2026-05-15.md'
      },
      {
        label: 'Combined saved side board',
        path: 'data-private/predictions/mlb-sides/2026-05-10-to-2026-05-15-board-v2.json'
      },
      {
        label: 'Archive JSONL ledger',
        path: 'data-private/history/mlb-results-archive.jsonl'
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
      { label: 'Archive status', value: 'Seed slate', tone: 'info' },
      { label: 'Tracked games', value: '29 total', tone: 'neutral' },
      { label: 'Detailed grading', value: 'Not stored', tone: 'warning' }
    ],
    notableHits: [
      'This day gave the project a stable archive baseline and a reusable slate format.'
    ],
    notableMisses: [
      'No detailed postgame grading was preserved for this first archive seed.',
      'Prop history was not being tracked yet.'
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
        path: 'web/src/lib/slate.js'
      }
    ]
  }
]

import { createSportsMatchModel } from './sports-model.js'
import { mlbGames, mlbNotes, mlbSources } from './day-2026-05-19-mlb.js'

export const slateMeta = {
  title: 'Tuesday All-Sports Desk',
  date: 'May 19, 2026',
  isoDate: '2026-05-19',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A live May 19 board with the refreshed MLB slate, tonight’s one WNBA matchup, and the Eastern Conference Finals opener, using official league pages, live board pricing, lineup context, and the updated volatility model.',
  notes: [
    ...mlbNotes,
    'The WNBA board is only one game tonight, so it leans more heavily on current lineups, early-season team shape, and live pricing than on deep sample size.',
    'Cavaliers-Knicks is a playoff volatility board by design, because Game 1 pricing and single-game shotmaking variance can flatten even a fair home favorite read.'
  ]
}

export const filters = ['All', 'MLB', 'WNBA', 'NBA']

export const oddsMeta = {
  provider: 'Official league data + matchup board snapshots',
  snapshot: 'May 19, 2026, late morning PT',
  note:
    'MLB pricing continues to come from the accessible matchup-board workflow layered with the lineup, bullpen-chain, and team-story model. WNBA and NBA use official game pages, StatMuse preview stats, and current live board pricing.'
}

export const sources = [
  ...mlbSources,
  {
    label: 'WNBA official scoreboard for May 19, 2026',
    url: 'https://stats.wnba.com/stats/scoreboardV2?GameDate=05/19/2026&LeagueID=10&DayOffset=0'
  },
  {
    label: 'Tempo-Mercury StatMuse preview',
    url: 'https://www.statmuse.com/wnba/game/5-19-2026-tor-at-phx-7776'
  },
  {
    label: 'Tempo-Mercury RotoWire odds',
    url: 'https://www.rotowire.com/betting/wnba/game/tempo-vs-mercury-odds-2026-05-19-2956696'
  },
  {
    label: 'Cavaliers-Knicks official NBA game summary',
    url: 'https://www.nba.com/knicks/game/0042500301'
  },
  {
    label: 'Cavaliers-Knicks StatMuse preview',
    url: 'https://www.statmuse.com/nba/game/5-19-2026-cle-at-nyk-78548'
  }
]

const market = (label, book, value) => ({ label, book, value })

const makeBoardOdds = ({
  spread = '',
  total = '',
  moneyline = '',
  provider = oddsMeta.provider
}) => ({
  participantOrder: [0, 1],
  markets: [
    ...(spread ? [market('Spread', provider, spread)] : []),
    ...(total ? [market('Total', provider, total)] : []),
    ...(moneyline ? [market('Moneyline', provider, moneyline)] : [])
  ],
  note:
    'This board is mixing official game context with live matchup pricing. Read these sides together with volatility and player-usage notes, especially in the early-season WNBA cards and the NBA series opener.',
  provider
})

const makeGame = (game) => createSportsMatchModel(game, oddsMeta.provider)

const extraGames = [
  makeGame({
    id: 'tempo-mercury-2026-05-19',
    league: 'WNBA',
    start: '7:00 PM PT',
    startMinutes: 1140,
    title: 'Tempo @ Mercury',
    stage: 'Tuesday WNBA board',
    spotlight: true,
    tags: ['Mercury favorite', 'Expansion volatility', 'Mabrey usage vs PHX depth'],
    matchup: [
      {
        side: 'Away',
        name: 'Tempo',
        detail: '0-1 | 65.0 ORTG | 68.0 DRTG | Marina Mabrey 27.0 PPG | 20.0 3P%'
      },
      {
        side: 'Home',
        name: 'Mercury',
        detail: '1-0 | 99.0 ORTG | 66.0 DRTG | Alyssa Thomas 20.0 PPG / 9.0 APG'
      }
    ],
    summary:
      'Phoenix carries the cleaner two-way opener because the Mercury already own a much healthier offensive shape and enough veteran depth to punish a Toronto team still learning its scoring tree.',
    factors: [
      'Current RotoWire board: Tempo +275 / Mercury -345 with Phoenix -8.5 and a 171.5 total.',
      'StatMuse has Toronto at a 65.0 offensive rating and Phoenix at 99.0 through the early sample, which is a huge shape gap even before home court is added.',
      'Projected lineups still center Toronto on Marina Mabrey, Brittney Sykes, and Kiki Rice, while Phoenix counters with Alyssa Thomas, Kahleah Copper, DeWanna Bonner, and Natasha Mack.'
    ],
    lean:
      'Lean Mercury because Phoenix has the cleaner offensive base and the more stable veteran possession chain, while still tagging the game as expansion-team variance rather than a blind favorite coast.',
    swing:
      "Swing factor: whether Toronto can turn Marina Mabrey's shot volume into enough real offense before Phoenix's veteran size and passing flatten the game.",
    playerAnalysis: [
      'Marina Mabrey still has the loudest current scoring line for Toronto at 27.0 points per game, which is why the Tempo can stay live even with the rough team baseline.',
      'Brittney Sykes and Kiki Rice matter because Toronto needs a real second creator and not just a Mabrey heat check if it wants to hang around on the road.',
      'Alyssa Thomas is the cleanest all-around control piece in the matchup, and Phoenix gets an even cleaner favorite path if her passing bends Toronto’s defense early.',
      'Kahleah Copper, DeWanna Bonner, and Natasha Mack give the Mercury a deeper possession tree than Toronto has shown so far.'
    ],
    odds: makeBoardOdds({
      spread: 'Tempo +8.5 (-115) / Mercury -8.5 (-105)',
      total: '171.5',
      moneyline: 'Tempo +275 / Mercury -345',
      provider: 'RotoWire WNBA odds'
    })
  }),
  makeGame({
    id: 'cavaliers-knicks-ecf-g1-2026-05-19',
    league: 'NBA',
    start: '5:00 PM PT',
    startMinutes: 1020,
    title: 'Cavaliers @ Knicks',
    stage: 'East finals Game 1',
    spotlight: true,
    tags: ['Game 1 volatility', 'Knicks home edge', 'Playoff noise'],
    matchup: [
      {
        side: 'Away',
        name: 'Cavaliers',
        detail: '52-30 | Mitchell 27.9 PPG | Mobley 9.0 RPG | Harden 7.7 APG'
      },
      {
        side: 'Home',
        name: 'Knicks',
        detail: '53-29 | Brunson 26.0 PPG | Towns 11.9 RPG | 8-2 last 10'
      }
    ],
    summary:
      'New York is still the cleaner Game 1 home side because the Knicks bring the stronger full-season defensive base and the better recent form, but this is exactly the kind of playoff opener where a live shotmaking underdog can erase a paper edge quickly.',
    factors: [
      'Current StatMuse board: Cavaliers +200 / Knicks -250 with New York -6.5 and a 216.5 total.',
      'StatMuse team stats lean New York by overall shape: the Knicks sit at a 116.5 offensive rating and 110.1 defensive rating against Cleveland’s 119.5 offense but 115.4 defense.',
      'Last-10 form also leans New York, with the Knicks 8-2 and Cleveland 6-4 entering the conference-finals opener.'
    ],
    lean:
      'Lean Knicks because the home floor, recent form, and better defensive control are enough to justify the opener favorite tag, while still respecting Cleveland as a live shotmaking dog in a noisy playoff setting.',
    swing:
      "Swing factor: whether New York can keep Cleveland from turning the game into a Donovan Mitchell bailout contest once the half-court possessions tighten.",
    playerAnalysis: [
      'Jalen Brunson still gives New York the cleanest half-court organizer in the matchup, which matters most in a Game 1 that should get tighter late.',
      'Karl-Anthony Towns and the Knicks’ frontcourt glass help stabilize the favorite case beyond just one shotmaker.',
      'Donovan Mitchell is the main reason Cleveland stays dangerous even when the Knicks look cleaner on paper.',
      'James Harden and Evan Mobley give the Cavaliers enough secondary creation and size that the underdog lane is very real if New York’s offense goes stagnant.'
    ],
    seriesBreakdown: {
      kicker: 'Conference-finals opener',
      title: 'Why the Knicks deserve Game 1 respect without pretending this is safe',
      record: 'Series 0-0',
      recap:
        'The East finals begin Tuesday, May 19, 2026 in New York. The Knicks have the steadier defensive profile and the better recent form, but conference-finals openers are exactly where a live underdog with elite creators can punch through a fair favorite price.',
      seriesStats: [
        'NYK 53-29 | CLE 52-30',
        'Consensus board: NYK -6.5 | 216.5 total',
        'Last 10: NYK 8-2 | CLE 6-4',
        'StatMuse net rating: NYK +6.3 | CLE +4.1'
      ],
      boxScores: [
        {
          label: 'Current form',
          date: 'May 19, 2026',
          result: 'Conference-finals Game 1 setup',
          notes: [
            'New York arrives hotter and with the better defensive base, which is why the home favorite script is still real.',
            'Cleveland still has enough shotmaking to flatten a paper edge if the game turns into late-clock pull-up basketball.'
          ]
        },
        {
          label: 'Key pressure points',
          date: 'May 19, 2026',
          result: 'Opening market: Knicks -250 / Cavaliers +200',
          notes: [
            'If New York controls turnovers and keeps its defense attached, the Knicks have the cleaner win path.',
            'If Cleveland gets downhill enough to create free points and scramble threes, the underdog route stays alive all night.'
          ]
        }
      ]
    },
    odds: makeBoardOdds({
      spread: 'Cavaliers +6.5 (-105) / Knicks -6.5 (-115)',
      total: '216.5',
      moneyline: 'Cavaliers +200 / Knicks -250',
      provider: 'StatMuse consensus odds'
    })
  })
]

export const games = [...mlbGames, ...extraGames].sort(
  (left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title)
)

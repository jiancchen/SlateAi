import { createSportsMatchModel } from './sports-model.js'
import { tennisClayContext } from './day-2026-05-21-tennis-context.js'

const oddsProvider = 'Oddschecker + TennisStats clay board'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const formatPct = (value) => (Number.isFinite(value) ? `${value.toFixed(1)}%` : 'n/a')
const formatRank = (value) => (Number.isFinite(value) ? `${Math.round(value)}` : 'n/a')

const decimalToAmerican = (decimalOdds) => {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) return null
  if (decimalOdds >= 2) return Math.round((decimalOdds - 1) * 100)
  return Math.round(-100 / (decimalOdds - 1))
}

const formatAmericanOdds = (value) => {
  if (!Number.isFinite(value)) return ''
  return value > 0 ? `+${value}` : `${value}`
}

const buildMoneylineValue = (playerA, playerB) => {
  const left = decimalToAmerican(playerA.decimalOdds)
  const right = decimalToAmerican(playerB.decimalOdds)
  if (!Number.isFinite(left) || !Number.isFinite(right)) return ''
  return `${formatAmericanOdds(left)} / ${formatAmericanOdds(right)}`
}

const withClayContext = (player) => ({
  ...player,
  recentClay: tennisClayContext[player.name] ?? null
})

const normalizedMoneylineProb = (player, opponent) => {
  if (!Number.isFinite(player.decimalOdds) || !Number.isFinite(opponent.decimalOdds)) return null
  const own = 1 / player.decimalOdds
  const other = 1 / opponent.decimalOdds
  const total = own + other
  return total > 0 ? own / total : null
}

const clayCompositeScore = (player) => {
  const ctx = player.recentClay
  if (!ctx) return null
  return ctx.spw + ctx.rpw + (ctx.dr - 1) * 18
}

const clayScoreDelta = (pick, opponent) => {
  const pickScore = clayCompositeScore(pick)
  const opponentScore = clayCompositeScore(opponent)
  if (!Number.isFinite(pickScore) || !Number.isFinite(opponentScore)) return null

  const pickOppAvg = pick.recentClay?.lastOppRankAvg
  const opponentOppAvg = opponent.recentClay?.lastOppRankAvg
  const scheduleAdjustment =
    Number.isFinite(pickOppAvg) && Number.isFinite(opponentOppAvg)
      ? clamp((opponentOppAvg - pickOppAvg) / 30, -3, 3)
      : 0

  return pickScore - opponentScore + scheduleAdjustment
}

const buildClayLine = (player) => {
  const ctx = player.recentClay
  if (!ctx) return 'Clay sample still thin.'
  return `Clay ${ctx.wins}-${ctx.losses} | ${formatPct(ctx.spw)} SPW | ${formatPct(ctx.rpw)} RPW | avg opp rk ${formatRank(ctx.lastOppRankAvg)}`
}

const buildClayShape = (player) => {
  const ctx = player.recentClay
  if (!ctx) return `${player.name} does not have a clean recent clay sample loaded yet.`
  return `${player.name} is ${ctx.wins}-${ctx.losses} over ${ctx.sample} recent clay matches, winning ${formatPct(ctx.spw)} of service points and ${formatPct(ctx.rpw)} of return points against opponents averaging rank ${formatRank(ctx.lastOppRankAvg)}.`
}

const buildPlayerLabel = (player) => `#${formatRank(player.rank)} ${player.name}`

const playerDetail = (player) => {
  const parts = [`Rank ${player.rank}`]
  if (Number.isFinite(player.form)) parts.push(`Form ${player.form}`)
  if (Number.isFinite(player.elo)) parts.push(`Elo ${player.elo}`)
  if (player.seed) parts.push(`Seed ${player.seed}`)
  if (player.record2026) parts.push(player.record2026)
  if (player.recentClay) parts.push(buildClayLine(player))
  return parts.join(' | ')
}

const buildClayDecisionNote = (pick, opponent) => {
  const delta = clayScoreDelta(pick, opponent)
  if (!Number.isFinite(delta)) {
    return 'Recent clay numbers are thin here, so the edge is coming more from rank, market shape, and weekly rhythm than a heavy surface sample.'
  }

  if (delta >= 8) return `Recent clay point-winning leans clearly toward ${pick.name}, and the board shape agrees.`
  if (delta >= 3) return `Recent clay numbers still lean ${pick.name}, but the edge is more about steadier point-winning than knockout dominance.`
  if (delta > -3) return 'Recent clay point-winning is basically flat here, so this semifinal is more about match management and nerve control than raw surface separation.'
  if (delta > -8) return `Recent clay point-winning data tilts a bit toward ${opponent.name}, so this stays a fragile board lean rather than a clean stats-backed favorite.`
  return `Recent clay point-winning runs against ${pick.name} in a real way, which is why this still profiles as a high-volatility match.`
}

const adjustConfidenceFromClay = (baseConfidence, baseVolatility, pick, opponent) => {
  const delta = clayScoreDelta(pick, opponent)
  let confidence = baseConfidence
  let volatility = baseVolatility

  if (Number.isFinite(delta)) {
    if (delta >= 5) {
      confidence += 3
      volatility -= 4
    } else if (delta >= 2) {
      confidence += 1
      volatility -= 2
    } else if (delta <= -5) {
      confidence -= 5
      volatility += 7
    } else if (delta <= -2) {
      confidence -= 3
      volatility += 4
    }
  }

  return {
    confidence: clamp(Math.round(confidence), 50, 82),
    volatility: clamp(Math.round(volatility), 42, 92)
  }
}

const buildComparisonRows = (playerA, playerB) => {
  const rows = [
    {
      label: 'Court advantage',
      metric: 'Clay fit',
      leftScore: clamp(Math.round((clayCompositeScore(playerA) ?? 92) - 6), 20, 95),
      rightScore: clamp(Math.round((clayCompositeScore(playerB) ?? 92) - 6), 20, 95),
      leftLabel: playerA.name,
      rightLabel: playerB.name
    },
    {
      label: 'Recent form',
      metric: 'Current rhythm',
      leftScore: clamp(Math.round(playerA.form ?? 50), 20, 95),
      rightScore: clamp(Math.round(playerB.form ?? 50), 20, 95),
      leftLabel: playerA.name,
      rightLabel: playerB.name
    },
    {
      label: 'Serve advantage',
      metric: 'Service pressure',
      leftScore: clamp(Math.round((playerA.recentClay?.spw ?? 54) * 1.2), 20, 95),
      rightScore: clamp(Math.round((playerB.recentClay?.spw ?? 54) * 1.2), 20, 95),
      leftLabel: playerA.name,
      rightLabel: playerB.name
    },
    {
      label: 'Comeback advantage',
      metric: 'Return + grind',
      leftScore: clamp(Math.round((playerA.recentClay?.rpw ?? 36) * 1.8), 20, 95),
      rightScore: clamp(Math.round((playerB.recentClay?.rpw ?? 36) * 1.8), 20, 95),
      leftLabel: playerA.name,
      rightLabel: playerB.name
    },
    {
      label: 'Market trust',
      metric: 'Board price',
      leftScore: clamp(Math.round((normalizedMoneylineProb(playerA, playerB) ?? 0.5) * 100), 20, 95),
      rightScore: clamp(Math.round((normalizedMoneylineProb(playerB, playerA) ?? 0.5) * 100), 20, 95),
      leftLabel: playerA.name,
      rightLabel: playerB.name
    }
  ]

  return rows.map((row) => ({
    ...row,
    winner:
      row.leftScore === row.rightScore
        ? 'Even'
        : row.leftScore > row.rightScore
          ? row.leftLabel
          : row.rightLabel
  }))
}

const buildProjection = ({ pick, opponent, confidence, volatility }) => {
  const straightSets = confidence >= 68 && volatility <= 56
  const setLine = straightSets ? '2-0' : '2-1'
  const winnerSets = 2
  const loserSets = straightSets ? 0 : 1
  const winnerGames = straightSets ? 12 : 18
  const loserGames = straightSets ? 8 : 12
  const totalGames = straightSets ? 20 : 30
  const straightSetsProbability = clamp(Math.round(confidence - volatility * 0.2), 28, 76)
  const upsetRisk = clamp(Math.round(volatility * 0.88), 24, 82)

  const buildFantasyLine = (player, setsWon, setsLost, gamesWon, gamesLost) => {
    const aceRate = player.recentClay ? clamp((player.recentClay.spw - 52) * 0.12, 0.8, 6.5) : 2.4
    const doubleFaultRate = clamp(2.2 - aceRate * 0.18, 0.5, 2.4)
    const fantasy =
      10 +
      setsWon * 6 -
      setsLost * 3 +
      gamesWon * 2.5 -
      gamesLost * 2 +
      aceRate * 0.4 -
      doubleFaultRate

    return {
      name: player.name,
      projectedFantasyScore: fantasy.toFixed(1),
      projectedSetsWon: setsWon,
      projectedSetsLost: setsLost,
      projectedGamesWon: gamesWon,
      projectedGamesLost: gamesLost,
      winPath: `${player.name} projects for ${gamesWon} games won with ${aceRate.toFixed(1)} expected aces.`
    }
  }

  return {
    projectedWinner: pick.name,
    projectedSetLine: setLine,
    projectedScoreline: `${pick.name} over ${opponent.name}`,
    totalGames: `${totalGames}`,
    straightSetsProbability,
    upsetRisk,
    overview: `${pick.name} still owns the cleaner pre-match semifinal path, but this is a clay board, not a lock.`,
    fantasy: [
      buildFantasyLine(pick, winnerSets, loserSets, winnerGames, loserGames),
      buildFantasyLine(opponent, loserSets, winnerSets, loserGames, winnerGames)
    ]
  }
}

const makeTennisOdds = (playerA, playerB) => ({
  participantOrder: [0, 1],
  markets: [
    {
      label: 'Moneyline',
      book: oddsProvider,
      value: buildMoneylineValue(playerA, playerB)
    }
  ],
  note:
    'Clay-only tennis board using official semifinal schedules plus Oddschecker and TennisStats. Read the side with form, surface fit, and market shape together.',
  provider: oddsProvider
})

const buildSummary = ({ pick, opponent, event, round, angle }) => {
  const pickClay = pick.recentClay
  const opponentClay = opponent.recentClay
  if (pickClay && opponentClay) {
    return `${pick.name} gets the lean in ${event} ${round} because the recent clay profile is more stable: ${formatPct(pickClay.spw)} service points won and ${formatPct(pickClay.rpw)} return points won over the last ${pickClay.sample} clay matches, versus ${formatPct(opponentClay.spw)} and ${formatPct(opponentClay.rpw)} for ${opponent.name}, and the wider setup still says ${angle}.`
  }

  return `${pick.name} gets the lean in ${event} ${round} because the clay-week profile is steadier: form ${pick.form ?? 'n/a'} vs ${opponent.form ?? 'n/a'}, rank ${pick.rank} vs ${opponent.rank}, and ${angle}.`
}

const makeTennisMatch = ({
  id,
  event,
  round,
  start,
  startMinutes,
  stage,
  playerA,
  playerB,
  pickName,
  confidence,
  volatility,
  angle,
  swing,
  fatigue = '',
  tags = []
}) => {
  const enrichedPlayerA = withClayContext(playerA)
  const enrichedPlayerB = withClayContext(playerB)
  const pick = pickName === enrichedPlayerA.name ? enrichedPlayerA : enrichedPlayerB
  const opponent = pickName === enrichedPlayerA.name ? enrichedPlayerB : enrichedPlayerA
  const adjusted = adjustConfidenceFromClay(confidence, volatility, pick, opponent)
  const comparisonRows = buildComparisonRows(enrichedPlayerA, enrichedPlayerB)
  const projection = buildProjection({
    pick,
    opponent,
    confidence: adjusted.confidence,
    volatility: adjusted.volatility
  })

  return createSportsMatchModel(
    {
      id,
      league: 'Tennis',
      start,
      startMinutes,
      title: `${playerA.name} vs ${playerB.name}`,
      stage: `${event} | ${stage || round}`,
      spotlight: adjusted.confidence >= 68,
      confidence: adjusted.confidence,
      volatility: adjusted.volatility,
      tags: ['Clay', ...tags],
      matchup: [
        {
          side: 'Player 1',
          name: enrichedPlayerA.name,
          displayName: buildPlayerLabel(enrichedPlayerA),
          detail: playerDetail(enrichedPlayerA)
        },
        {
          side: 'Player 2',
          name: enrichedPlayerB.name,
          displayName: buildPlayerLabel(enrichedPlayerB),
          detail: playerDetail(enrichedPlayerB)
        }
      ],
      summary: buildSummary({ pick, opponent, event, round, angle }),
      factors: [
        `${pick.name} carries the stronger pre-match path on ranking / market shape: rank ${pick.rank} vs ${opponent.rank}${Number.isFinite(pick.decimalOdds) ? `, price ${pick.decimalOdds.toFixed(2)}` : ''}.`,
        buildClayShape(pick),
        buildClayShape(opponent),
        buildClayDecisionNote(pick, opponent),
        fatigue || 'No fresh injury flag surfaced on the accessible pre-match sources for this pass.'
      ],
      lean: `Lean ${pick.name} because ${angle}.`,
      swing,
      odds: makeTennisOdds(playerA, playerB),
      tennisContext: {
        surface: 'Clay',
        liveDog:
          Number.isFinite(pick.decimalOdds) && Number.isFinite(opponent.decimalOdds)
            ? pick.decimalOdds > opponent.decimalOdds
            : false,
        players: [
          {
            name: enrichedPlayerA.name,
            rank: enrichedPlayerA.rank,
            label: buildPlayerLabel(enrichedPlayerA),
            form: enrichedPlayerA.form ?? null,
            decimalOdds: enrichedPlayerA.decimalOdds ?? null,
            marketLabel: Number.isFinite(enrichedPlayerA.decimalOdds) ? enrichedPlayerA.decimalOdds.toFixed(2) : 'Model only',
            clayLine: buildClayLine(enrichedPlayerA),
            record2026: enrichedPlayerA.record2026 || '',
            notes: buildClayShape(enrichedPlayerA),
            matchupNote: buildClayDecisionNote(enrichedPlayerA, enrichedPlayerB)
          },
          {
            name: enrichedPlayerB.name,
            rank: enrichedPlayerB.rank,
            label: buildPlayerLabel(enrichedPlayerB),
            form: enrichedPlayerB.form ?? null,
            decimalOdds: enrichedPlayerB.decimalOdds ?? null,
            marketLabel: Number.isFinite(enrichedPlayerB.decimalOdds) ? enrichedPlayerB.decimalOdds.toFixed(2) : 'Model only',
            clayLine: buildClayLine(enrichedPlayerB),
            record2026: enrichedPlayerB.record2026 || '',
            notes: buildClayShape(enrichedPlayerB),
            matchupNote: buildClayDecisionNote(enrichedPlayerB, enrichedPlayerA)
          }
        ],
        comparisonRows,
        projection,
        formEdgeName:
          Number.isFinite(playerA.form) && Number.isFinite(playerB.form)
            ? playerA.form === playerB.form
              ? ''
              : playerA.form > playerB.form
                ? playerA.name
                : playerB.name
            : ''
      },
      playerAnalysis: [
        `${pick.name} is the cleaner pre-match side because the recent clay point-winning profile, form signal, and current board shape land better than they do for ${opponent.name}.`,
        buildClayDecisionNote(pick, opponent),
        fatigue || 'This is more about clay rhythm, serve control, and semifinal nerve than any visible injury story.',
        'No strong clean H2H edge surfaced on the accessible sources for this pass, so this read leans more heavily on surface fit and current week shape.',
        buildClayShape(pick),
        swing
      ]
    },
    oddsProvider
  )
}

const matches = [
  makeTennisMatch({
    id: 'atp-geneva-ruud-navone-2026-05-22',
    event: 'ATP Geneva',
    round: 'Semifinal',
    stage: 'Friday semifinal board',
    start: '4:00 AM PT',
    startMinutes: 240,
    playerA: { name: 'Casper Ruud', rank: 17, form: 65, decimalOdds: 1.29, elo: 2185, record2026: 'Clay trust profile still clean' },
    playerB: { name: 'Mariano Navone', rank: 42, form: 60, decimalOdds: 4.0, record2026: 'Geneva control week still real' },
    pickName: 'Casper Ruud',
    confidence: 72,
    volatility: 50,
    angle: 'the clay-floor advantage is still real even against a Navone run that has looked sharper than the raw rank gap',
    swing: 'Swing factor: whether Navone can keep the return games long enough to deny Ruud the cleaner serve-plus-one rhythm he has been leaning on all week.',
    tags: ['Semifinal', 'Court edge']
  }),
  makeTennisMatch({
    id: 'wta-strasbourg-navarro-li-2026-05-22',
    event: 'WTA Strasbourg',
    round: 'Semifinal',
    stage: 'Friday semifinal board',
    start: '4:30 AM PT',
    startMinutes: 270,
    playerA: { name: 'Emma Navarro', rank: 39, form: 33, decimalOdds: 2.0, record2026: 'Top-seed profile, slower clay reset' },
    playerB: { name: 'Ann Li', rank: 30, form: 50, decimalOdds: 1.83, record2026: 'Live flat-hitting semifinal run' },
    pickName: 'Ann Li',
    confidence: 56,
    volatility: 66,
    angle: 'the current clay week is still holding together against stronger average opposition, and the board is no longer pricing Navarro as the obvious stabilizer',
    swing: 'Swing factor: whether Navarro can force enough long return games to flatten Li’s first-strike edge and drag the semifinal into a slower three-set pattern.',
    tags: ['Semifinal', 'Live dog']
  }),
  makeTennisMatch({
    id: 'atp-geneva-tien-bublik-2026-05-22',
    event: 'ATP Geneva',
    round: 'Semifinal',
    stage: 'Friday semifinal board',
    start: '5:30 AM PT',
    startMinutes: 330,
    playerA: { name: 'Learner Tien', rank: 20, form: 62, decimalOdds: 2.2, record2026: 'Cleaner all-court clay week' },
    playerB: { name: 'Alexander Bublik', rank: 10, form: 63, decimalOdds: 1.8, elo: 3230, record2026: 'Higher ceiling, still mood-swing live' },
    pickName: 'Learner Tien',
    confidence: 54,
    volatility: 75,
    angle: 'the clay-point profile is cleaner and the semifinal setup still punishes Bublik if the focus lane drifts even slightly',
    swing: 'Swing factor: whether Bublik brings the locked-in version long enough to stop Tien from steadily winning the neutral-ball exchanges.',
    tags: ['Semifinal', 'Dog live']
  }),
  makeTennisMatch({
    id: 'atp-hamburg-buse-kovacevic-2026-05-22',
    event: 'ATP Hamburg',
    round: 'Semifinal',
    stage: 'Friday semifinal board',
    start: '5:30 AM PT',
    startMinutes: 330,
    playerA: { name: 'Aleksandar Kovacevic', rank: 94, form: 43, decimalOdds: 4.0, record2026: 'Counterpunching surprise semifinal' },
    playerB: { name: 'Ignacio Buse', rank: 57, form: 57, decimalOdds: 1.3, record2026: 'Hamburg clay wave still loud' },
    pickName: 'Ignacio Buse',
    confidence: 71,
    volatility: 52,
    angle: 'the full Hamburg week still points his way and the market is finally respecting how real that clay rhythm has become',
    swing: 'Swing factor: whether Kovacevic can keep enough first-ball aggression alive to stop Buse from owning the longer baseline flow again.',
    tags: ['Semifinal', 'Form edge']
  }),
  makeTennisMatch({
    id: 'wta-strasbourg-mboko-cristian-2026-05-22',
    event: 'WTA Strasbourg',
    round: 'Semifinal',
    stage: 'Friday semifinal board',
    start: '6:30 AM PT',
    startMinutes: 390,
    playerA: { name: 'Victoria Mboko', rank: 9, form: 76, decimalOdds: 1.37, elo: 3395, record2026: 'Fast-rising pressure still intact' },
    playerB: { name: 'Jaqueline Cristian', rank: 33, form: 54, decimalOdds: 3.25, record2026: 'Quietly stronger clay-point week' },
    pickName: 'Victoria Mboko',
    confidence: 56,
    volatility: 72,
    angle: 'the ceiling and market respect remain huge, but Cristian is carrying the better clay-point profile and makes this much more fragile than the price suggests',
    swing: 'Swing factor: whether Cristian can keep enough return pressure live to test Mboko’s front-running confidence once the semifinal tightens.',
    tags: ['Semifinal', 'Volatile']
  }),
  makeTennisMatch({
    id: 'atp-hamburg-deminaur-paul-2026-05-22',
    event: 'ATP Hamburg',
    round: 'Semifinal',
    stage: 'Friday semifinal board',
    start: '7:30 AM PT',
    startMinutes: 450,
    playerA: { name: 'Alex de Minaur', rank: 9, form: 65, decimalOdds: 1.73, elo: 3665, record2026: 'Floor still cleaner under pressure' },
    playerB: { name: 'Tommy Paul', rank: 26, form: 69, decimalOdds: 2.2, elo: 1625, record2026: 'Clay week keeps finding escapes' },
    pickName: 'Tommy Paul',
    confidence: 53,
    volatility: 74,
    angle: 'the clay-point profile has been better than the seed gap suggests, and his week has looked more comfortable on slow points than the raw market line gives him credit for',
    swing: 'Swing factor: whether De Minaur can keep enough return pressure in play to stop Paul from taking the match into another scoreline grinder.',
    tags: ['Semifinal', 'Close board']
  })
]

export const slateMeta = {
  title: 'Friday Tennis Desk',
  date: 'May 22, 2026',
  isoDate: '2026-05-22',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A focused May 22 clay semifinal board built from official ATP/WTA schedules, Oddschecker lines, TennisStats form context, official ATP/WTA stat pages, and Tennis Abstract player research.',
  notes: [
    'Every match on this board is on clay, and the field is down to semifinals, so the model is leaning more on surface-specific point winning and tournament rhythm than on broad ranking alone.',
    'The Friday board is intentionally tighter than May 21 because only the official ATP and WTA semifinal matches had clean schedule-plus-price coverage on this pass.',
    'May 21 was a useful reminder that ATP clay-point reads held much better than the WTA Strasbourg quarterfinals, so this semifinal board intentionally compresses WTA confidence and leans harder on current-week rhythm than on stable-name value.',
    'No explicit injury note surfaced from the accessible pre-match sources this morning, so volatility is being driven more by semifinal pressure, recent clay load, and market-vs-surface mismatch than by medical news.'
  ]
}

export const filters = ['All', 'Tennis']

export const oddsMeta = {
  provider: 'Official ATP/WTA schedules + Oddschecker + TennisStats + ATP/WTA stats',
  snapshot: 'May 22, 2026 pre-open semifinal clay desk',
  note:
    'Tennis uses official semifinal schedules plus Oddschecker, TennisStats, ATP/WTA stats pages, and player research sources for ranking, form, surface fit, H2H, and accessible moneylines.'
}

export const sources = [
  {
    label: 'Oddschecker tennis lines',
    url: 'https://www.oddschecker.com/us/tennis'
  },
  {
    label: 'TennisStats match board',
    url: 'https://tennisstats.com/'
  },
  {
    label: 'Tennis Abstract player research example',
    url: 'https://www.tennisabstract.com/cgi-bin/player.cgi?p=126205/Tommy-Paul'
  },
  {
    label: 'ATP official stats',
    url: 'https://www.atptour.com/stats/'
  },
  {
    label: 'ATP official H2H',
    url: 'https://www.atptour.com/en/h2h'
  },
  {
    label: 'WTA official player stats example',
    url: 'https://www.wtatennis.com/players/331006/victoria-mboko/stats'
  },
  {
    label: 'WTA By The Numbers',
    url: 'https://wtafiles.wtatennis.com/pdf/matchnotes/2026/2026WTA_ByTheNumbers.pdf'
  },
  {
    label: 'Ultimate Tennis Statistics',
    url: 'https://www.ultimatetennisstatistics.com/'
  },
  {
    label: 'Tennis Explorer',
    url: 'https://www.tennisexplorer.com/'
  },
  {
    label: 'ATP Hamburg schedule',
    url: 'https://www.bbc.co.uk/sport/tennis/hamburg-european-open/mens-singles/scores-and-schedule/2026-05-22'
  },
  {
    label: 'ATP Geneva schedule',
    url: 'https://www.bbc.co.uk/sport/tennis/atp-geneva-open/mens-singles/scores-and-schedule/2026-05-22'
  },
  {
    label: 'WTA Strasbourg schedule',
    url: 'https://www.bbc.co.uk/sport/tennis/wta-internationaux-de-strasbourg/womens-singles/scores-and-schedule/2026-05-22'
  }
]

export const games = [...matches].sort(
  (left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title)
)

import { createSportsMatchModel } from './sports-model.js'
import { buildTennistonicH2HUrl } from './tennis-source-mapping.js'
import { rawGames, bullpenChainByTeam } from './day-2026-05-26-data.js'
import {
  standingsContextByTeam,
  teamOffenseContextByTeam,
  teamBullpenContextByTeam,
  teamSavantContextByTeam
} from './mlb-context-2026-05-26.js'
import { lineupBoardsByGameId, lineupMatchupContextByGameId } from './day-2026-05-26-lineups.js'
import { parkContextByHomeTeam } from './day-2026-05-13-mlb-data.js'
import tennisClayContext from './day-2026-05-26-tennis-clay-context.generated.json' with { type: 'json' }
import tennisOpponentQualityContext from './day-2026-05-26-tennis-opponent-quality.generated.json' with { type: 'json' }

const oddsProvider = 'Roland Garros desk board'
const mlbOddsProvider = 'Official MLB data + ScoresAndOdds live board'
const marketSource = 'Prediction market screenshot'
const marketCapturedAt = '2026-05-26 12:16 AM PT'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const formatPct = (value) => (Number.isFinite(value) ? `${Math.round(value)}%` : 'n/a')
const formatAmount = (value) => (Number.isFinite(value) ? value.toLocaleString('en-US') : 'n/a')
const formatSignedPct = (value) => (Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${Math.round(value)} pts` : 'n/a')
const mlbMarket = (label, book, value) => ({ label, book, value })

const buildMlbBoardOdds = ({ spread = '', total = '', moneyline = '', provider = mlbOddsProvider }) => ({
  participantOrder: [0, 1],
  markets: [
    ...(spread ? [mlbMarket('Spread', provider, spread)] : []),
    ...(total ? [mlbMarket('Total', provider, total)] : []),
    ...(moneyline ? [mlbMarket('Moneyline', provider, moneyline)] : [])
  ],
  note: 'Board snapshot plus model context.',
  provider
})

const formatPitcherMetric = (value, suffix = '') => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${parsed.toFixed(2)}${suffix}` : `${value || '-'}${suffix}`
}

const pitcherDetail = (pitcher) =>
  `${pitcher.fullName} (${pitcher.pitchHand || '?'}HP) | ${pitcher.wins}-${pitcher.losses} | ${pitcher.era} ERA | ${pitcher.strikeOuts} SO | ${formatPitcherMetric(pitcher.whip, ' WHIP')} | ${pitcher.inningsPitched} IP`

const getWindowLabel = (startMinutes = 0) => {
  if (startMinutes < 720) return 'Morning MLB Board'
  if (startMinutes < 900) return 'Afternoon MLB Board'
  return 'Evening MLB Board'
}

const buildMlbGame = (raw, instanceIndex = 0) => {
  const uniqueId = instanceIndex > 0 ? `${raw.id}-${raw.gamePk}` : raw.id
  const factors = [
    `Current board: ${raw.moneyline} | ${raw.total} | ${raw.spread}.`,
    `${raw.awayPitcher.fullName} vs ${raw.homePitcher.fullName}.`
  ]

  return createSportsMatchModel(
    {
      id: uniqueId,
      gamePk: Number.isFinite(Number(raw.gamePk)) ? Number(raw.gamePk) : null,
      league: 'MLB',
      title: `${raw.away} @ ${raw.home}`,
      start: raw.start,
      startMinutes: raw.startMinutes,
      stage: getWindowLabel(raw.startMinutes),
      spotlight: false,
      tags: ['MLB'],
      matchup: [
        { side: 'Away', name: raw.away, detail: pitcherDetail(raw.awayPitcher) },
        { side: 'Home', name: raw.home, detail: pitcherDetail(raw.homePitcher) }
      ],
      summary: `${raw.away} @ ${raw.home} with ${raw.awayPitcher.fullName} against ${raw.homePitcher.fullName}.`,
      lean: 'Lean on the modeled side, but respect the split between starter phase and late-game hold.',
      factors,
      swingFactor: 'Swing factor: whether the starter edge survives the bridge innings.',
      teamContext: {
        away: standingsContextByTeam[raw.away] ?? null,
        home: standingsContextByTeam[raw.home] ?? null
      },
      parkContext: parkContextByHomeTeam[raw.home] ?? null,
      offenseContext: {
        away: teamOffenseContextByTeam[raw.away] ?? null,
        home: teamOffenseContextByTeam[raw.home] ?? null
      },
      bullpenContext: {
        away: teamBullpenContextByTeam[raw.away] ?? null,
        home: teamBullpenContextByTeam[raw.home] ?? null
      },
      bullpenChainContext: {
        away: bullpenChainByTeam[raw.away] ?? null,
        home: bullpenChainByTeam[raw.home] ?? null
      },
      savantContext: {
        away: teamSavantContextByTeam[raw.away] ?? null,
        home: teamSavantContextByTeam[raw.home] ?? null
      },
      storyContext: {
        away: null,
        home: null
      },
      tierTwoContext: raw.tierTwoContext ?? null,
      tierThreeContext: raw.tierThreeContext ?? null,
      stateContext: raw.stateContext ?? null,
      lineupContext: lineupMatchupContextByGameId[raw.id] ?? null,
      lineupBoard: lineupBoardsByGameId[raw.id] ?? null,
      starterContext: { away: raw.awayPitcher, home: raw.homePitcher },
      pitcherSourceNote: raw.pitcherSourceNote || '',
      odds: buildMlbBoardOdds({
        spread: raw.spread,
        total: raw.total,
        moneyline: raw.moneyline,
        provider: mlbOddsProvider
      })
    },
    mlbOddsProvider
  )
}

const buildPlayerEconomics = (name, pricePct, amount) => {
  if (!Number.isFinite(pricePct) || pricePct <= 0) return null
  const cost = pricePct / 100
  const grossProfitPct = ((1 - cost) / cost) * 100
  const priceBand =
    pricePct >= 85
      ? 'tiny-upside favorite'
      : pricePct >= 70
        ? 'fee-sensitive favorite'
        : pricePct >= 55
          ? 'moderate favorite'
          : pricePct >= 40
            ? 'coinflip zone'
            : 'dog payout lane'

  return {
    name,
    pricePct,
    amount,
    priceBand,
    grossProfitPct: Math.round(grossProfitPct),
    grossPayoutMultiple: Number((1 / cost).toFixed(2)),
    centsAtRisk: pricePct,
    centsProfitIfWin: 100 - pricePct
  }
}

const buildMarketEconomics = ({ raw, market, marketA, marketB }) => {
  if (!market || !Number.isFinite(marketA?.pct) || !Number.isFinite(marketB?.pct)) return null

  const players = [
    buildPlayerEconomics(raw.a, marketA.pct, marketA.amount),
    buildPlayerEconomics(raw.b, marketB.pct, marketB.amount)
  ].filter(Boolean)
  const picked = players.find((player) => player.name === raw.pick)
  const other = players.find((player) => player.name !== raw.pick)
  const favorite = players.reduce((winner, player) => (player.pricePct > winner.pricePct ? player : winner), players[0])
  const deskEdgePct = picked ? raw.conf - picked.pricePct : null
  const feeBufferPct = 3
  const favoriteTax = Number.isFinite(picked?.pricePct) && picked.pricePct >= 70
  const priceAction =
    !picked
      ? 'No market read'
      : favoriteTax && deskEdgePct <= feeBufferPct
        ? 'Pass at price'
        : favoriteTax && deskEdgePct <= feeBufferPct + 5
          ? 'Watch, do not chase'
          : picked.pricePct < 45 && raw.conf >= 55
            ? 'Dog value lane'
            : deskEdgePct >= feeBufferPct + 4
              ? 'Playable edge'
              : 'No clear price edge'
  const summary =
    !picked
      ? 'No screenshot price was captured for the desk side.'
      : favoriteTax
        ? `${raw.pick} is priced at ${formatPct(picked.pricePct)}, leaving only ${picked.centsProfitIfWin}c gross profit per share before platform fees. The pick can be likely and still be a poor buy unless our true edge clears the price by more than the fee buffer.`
        : `${raw.pick} is priced at ${formatPct(picked.pricePct)}, a ${picked.priceBand} with roughly ${picked.grossProfitPct}% gross profit on stake before platform fees if it wins.`

  return {
    source: marketSource,
    capturedAt: marketCapturedAt,
    feeBufferPct,
    totalVolume: market.total,
    deskPickName: raw.pick,
    deskConfidencePct: raw.conf,
    deskPricePct: picked?.pricePct ?? null,
    deskEdgePct,
    favoriteName: favorite?.name ?? null,
    favoritePricePct: favorite?.pricePct ?? null,
    otherSideName: other?.name ?? null,
    otherSidePricePct: other?.pricePct ?? null,
    priceAction,
    summary,
    players
  }
}

const buildPredictionOnlyOdds = (raw, market) => ({
  participantOrder: [0, 1],
  markets: market
    ? [
        {
          label: 'Prediction market',
          book: marketSource,
          value: `${raw.a} ${formatPct(market.players?.[raw.a]?.pct)} / ${raw.b} ${formatPct(market.players?.[raw.b]?.pct)}`
        },
        {
          label: 'Market volume',
          book: marketSource,
          value: formatAmount(market.total)
        }
      ]
    : [],
  note: 'This Roland Garros board is a prediction desk built from the official May 26 singles schedule, ESPN scoreboard data, and manual ATP/WTA clay decision rules. Doubles are intentionally excluded.',
  provider: oddsProvider
})

const participant = (id, index, role, name, detail) => ({
  id: `${id}:${index}`,
  index,
  role,
  name,
  detail,
  americanOdds: null,
  americanLabel: 'N/A',
  decimalOdds: null,
  impliedProbability: null,
  impliedProbabilityLabel: 'N/A'
})

const stage = (format) => `Roland Garros ${format === 'ATP' ? 'Men' : 'Women'} | Round 1`

const buildMatch = (raw) => {
  const id = `rg-${raw.fmt === 'ATP' ? 'm' : 'w'}-${raw.idSlug}-2026-05-26`
  const market = marketByMatchId[id] ?? null
  const marketA = market?.players?.[raw.a] ?? null
  const marketB = market?.players?.[raw.b] ?? null
  const hasMarket = Number.isFinite(marketA?.pct) && Number.isFinite(marketB?.pct)
  const marketEconomics = buildMarketEconomics({ raw, market, marketA, marketB })
  const pickIndex = raw.pick === raw.a ? 0 : 1
  const playerA = { side: 'Player 1', name: raw.a, displayName: raw.a, detail: raw.profileA }
  const playerB = { side: 'Player 2', name: raw.b, displayName: raw.b, detail: raw.profileB }
  const participants = [
    participant(id, 0, 'Player 1', raw.a, raw.profileA),
    participant(id, 1, 'Player 2', raw.b, raw.profileB)
  ]
  const picked = participants[pickIndex]
  const opponent = participants[pickIndex === 0 ? 1 : 0]
  const dogNote = raw.vol >= 68 ? ' This is deliberately capped as a volatility read, not a forced high-conviction pick.' : ''
  const summary = `${raw.pick} gets the desk lean because ${raw.angle}.${dogNote}`
  const factors = [
    ...(hasMarket
      ? [
          `Prediction market: ${raw.a} ${formatPct(marketA.pct)} (${formatAmount(marketA.amount)}) vs ${raw.b} ${formatPct(marketB.pct)} (${formatAmount(marketB.amount)}), ${formatAmount(market.total)} total captured from screenshots.`,
          `Market economics: ${marketEconomics.priceAction}. ${marketEconomics.summary} Desk edge vs captured price: ${formatSignedPct(marketEconomics.deskEdgePct)}.`
        ]
      : []),
    `${raw.a}: ${raw.noteA}`,
    `${raw.b}: ${raw.noteB}`,
    `Clay desk angle: ${raw.angle}.`,
    `Swing factor: ${raw.swing}`
  ]
  const h2hUrl = buildTennistonicH2HUrl(raw.a, raw.b)

  return createSportsMatchModel(
    {
      id,
      league: 'Tennis',
      start: raw.time,
      startMinutes: raw.min,
      title: `${raw.a} vs ${raw.b}`,
      stage: stage(raw.fmt),
      spotlight: raw.conf >= 72 || raw.tags.includes('Favorite'),
      confidence: raw.conf,
      volatility: raw.vol,
      tags: ['Clay', 'Roland Garros', ...raw.tags],
      matchup: [playerA, playerB],
      summary,
      factors,
      lean: `Lean ${raw.pick} because ${raw.angle}.`,
      swing: `Swing factor: ${raw.swing}`,
      swingFactor: `Swing factor: ${raw.swing}`,
      odds: buildPredictionOnlyOdds(raw, market),
      tennisContext: {
        surface: 'Clay',
        court: raw.court,
        h2hLeader: '',
        fatigueFlag: false,
        liveDog: hasMarket ? (raw.pick === raw.a ? marketA.pct < marketB.pct : marketB.pct < marketA.pct) : raw.conf < 60,
        players: [
          { name: raw.a, rank: null, label: raw.a, form: null, boardPct: Number.isFinite(marketA?.pct) ? marketA.pct : null, decimalOdds: null, marketLabel: Number.isFinite(marketA?.pct) ? `Market ${formatPct(marketA.pct)}` : 'Desk only', clayLine: raw.profileA, record2026: '', notes: raw.noteA, matchupNote: raw.pick === raw.a ? `${raw.a} is the desk lean.` : `${raw.a} needs the upset script.` },
          { name: raw.b, rank: null, label: raw.b, form: null, boardPct: Number.isFinite(marketB?.pct) ? marketB.pct : null, decimalOdds: null, marketLabel: Number.isFinite(marketB?.pct) ? `Market ${formatPct(marketB.pct)}` : 'Desk only', clayLine: raw.profileB, record2026: '', notes: raw.noteB, matchupNote: raw.pick === raw.b ? `${raw.b} is the desk lean.` : `${raw.b} needs the upset script.` }
        ],
        comparisonRows: [
          ...(hasMarket
            ? [
                { label: 'Prediction market', metric: 'Screenshot split', leftScore: clamp(Math.round(marketA.pct), 0, 100), rightScore: clamp(Math.round(marketB.pct), 0, 100), leftLabel: raw.a, rightLabel: raw.b, winner: marketA.pct === marketB.pct ? 'Even' : marketA.pct > marketB.pct ? raw.a : raw.b }
              ]
            : []),
          { label: 'Desk lean', metric: 'Confidence split', leftScore: raw.pick === raw.a ? raw.conf : 100 - raw.conf, rightScore: raw.pick === raw.b ? raw.conf : 100 - raw.conf, leftLabel: raw.a, rightLabel: raw.b, winner: raw.pick },
          { label: 'Volatility', metric: 'Lower chaos side', leftScore: raw.pick === raw.a ? 100 - raw.vol : raw.vol, rightScore: raw.pick === raw.b ? 100 - raw.vol : raw.vol, leftLabel: raw.a, rightLabel: raw.b, winner: raw.pick }
        ],
        predictionMarket: market
          ? {
              source: marketSource,
              capturedAt: marketCapturedAt,
              totalVolume: market.total,
              players: [
                { name: raw.a, probabilityPct: marketA?.pct ?? null, amount: marketA?.amount ?? null },
                { name: raw.b, probabilityPct: marketB?.pct ?? null, amount: marketB?.amount ?? null }
              ]
            }
          : null,
        projection: {
          projectedWinner: raw.pick,
          projectedSetLine: raw.fmt === 'ATP' ? (raw.conf >= 72 ? '3-0 or 3-1' : '3-1 or 3-2') : (raw.conf >= 70 ? '2-0 or 2-1' : '2-1'),
          projectedScoreline: raw.fmt === 'ATP' ? 'Best-of-five lean; exact score not modeled.' : 'Best-of-three lean; exact score not modeled.',
          totalGames: null,
          straightSetsProbability: Math.max(38, Math.min(72, Math.round(raw.conf - raw.vol * 0.18))),
          upsetRisk: Math.max(10, Math.min(48, Math.round(100 - raw.conf + raw.vol * 0.22))),
          overview: `${raw.pick} is projected to own the cleaner normal script, with volatility at ${raw.vol} because ${raw.swing}`,
          fantasy: []
        },
        tradePlan: marketEconomics
          ? {
              laneLabel: marketEconomics.priceAction,
              tone:
                marketEconomics.priceAction === 'Pass at price'
                  ? 'danger'
                  : marketEconomics.priceAction === 'Watch, do not chase'
                    ? 'warning'
                    : marketEconomics.priceAction === 'Playable edge' || marketEconomics.priceAction === 'Dog value lane'
                      ? 'accent'
                      : 'neutral',
              entrySideName: marketEconomics.deskPickName,
              favoriteName: marketEconomics.favoriteName,
              headline: marketEconomics.priceAction,
              summary: marketEconomics.summary,
              trigger:
                marketEconomics.priceAction === 'Pass at price'
                  ? 'Need a better live entry or stronger evidence than the current desk edge. Do not buy the favorite just because it is likely.'
                  : 'Use the market price as an entry filter; win probability is not enough by itself.',
              exit: `Desk confidence ${raw.conf}% vs market ${marketEconomics.deskPricePct ?? 'n/a'}%, with a ${marketEconomics.feeBufferPct} pt fee buffer.`,
              marketGap: Math.round(marketEconomics.deskEdgePct ?? 0),
              dogLift: null,
              entryPricePct: marketEconomics.deskPricePct,
              otherSideName: marketEconomics.otherSideName,
              otherSideMarketPct: marketEconomics.otherSidePricePct,
              favoriteMarketPct: marketEconomics.favoritePricePct,
              dogMarketPct: Math.min(marketA.pct, marketB.pct)
            }
          : null,
        marketEconomics,
        clayMatchupData: tennisClayContext.matches?.[id] ?? null,
        opponentQualityData: tennisOpponentQualityContext.matches?.[id] ?? null,
        researchLinks: [
          { label: 'ESPN scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260526' },
          { label: 'Roland Garros order of play', url: 'https://www.rolandgarros.com/en-us/order-of-play?annexeCourt=all&competition=all&country=all&date=2026-05-26&favoriteFilter=false&principalCourt=all&year=2026' },
          { label: 'Tennistonic H2H', url: h2hUrl }
        ],
        formEdgeName: raw.pick
      },
      playerAnalysis: [
        `${raw.pick} is the desk side because ${raw.angle}.`,
        `${raw.a} note: ${raw.noteA}`,
        `${raw.b} note: ${raw.noteB}`,
        `Swing factor: ${raw.swing}`
      ],
      participants,
      moneyline: { available: false, label: 'Moneyline', provider: oddsProvider, participants: [] },
      analysis: {
        available: true,
        participantId: picked.id,
        participant: picked,
        opponent,
        lean: `Lean ${raw.pick} because ${raw.angle}.`,
        rationale: factors[2],
        confidence: raw.conf,
        volatility: raw.vol,
        recommendationScore: raw.recommendationScore,
        tier: raw.tier,
        sourceLabel: 'Editorial slate read',
        modelEdge: 0,
        modelEdgeLabel: 'Model-only read',
        marketProbability: hasMarket ? (raw.pick === raw.a ? marketA.pct : marketB.pct) : null,
        marketProbabilityLabel: hasMarket ? `Market ${formatPct(raw.pick === raw.a ? marketA.pct : marketB.pct)}` : 'N/A',
        inputs: [],
        inputsUsed: 0,
        volatilityNotes: raw.vol >= 68 ? [{ label: 'Volatility gate: treated as swingy/watch-grade rather than clean favorite.', delta: raw.vol - 60 }] : []
      }
    },
    oddsProvider
  )
}

const rawSingles = [
  {
    "fmt": "WTA",
    "time": "2:00 AM PT",
    "min": 120,
    "court": "Court 12",
    "a": "Emma Navarro",
    "b": "Janice Tjen",
    "pick": "Emma Navarro",
    "conf": 64,
    "vol": 54,
    "tags": [
      "Women"
    ],
    "profileA": "Seed-level baseline favorite",
    "profileB": "Qualifier-style pressure path",
    "noteA": "Navarro has the cleaner rally tolerance and should be better over repeated neutral exchanges.",
    "noteB": "Tjen needs early return pressure and short-scoreboard bursts to turn this into a real upset lane.",
    "angle": "Navarro has the steadier clay pattern and the better repeatable return game in a match that should reward patience more than first-strike noise",
    "swing": "If Tjen takes time away early and keeps the first set on serve, this can slide into a much thinner WTA opener.",
    "idSlug": "navarro-tjen",
    "recommendationScore": 61,
    "tier": "Lean"
  },
  {
    "fmt": "WTA",
    "time": "2:00 AM PT",
    "min": 120,
    "court": "Court 14",
    "a": "Iva Jovic",
    "b": "Alexandra Eala",
    "pick": "Iva Jovic",
    "conf": 57,
    "vol": 70,
    "tags": [
      "Women",
      "Volatile"
    ],
    "profileA": "Seeded youth ceiling",
    "profileB": "Lefty upset lane",
    "noteA": "Jovic owns the seeded profile, but this is still a young-player WTA spot that should not be overtrusted.",
    "noteB": "Eala is live if she makes the crosscourt patterns uncomfortable and forces Jovic to hit through pressure.",
    "angle": "Jovic gets the smallest lean on seed-level upside, but the match belongs in the danger zone rather than the clean-pick bucket",
    "swing": "If Eala stretches rallies and makes this about shape instead of pace, the favorite edge can disappear quickly.",
    "idSlug": "jovic-eala",
    "recommendationScore": 48,
    "tier": "Swingy"
  },
  {
    "fmt": "WTA",
    "time": "2:00 AM PT",
    "min": 120,
    "court": "Court 6",
    "a": "Donna Vekic",
    "b": "Alice Tubello",
    "pick": "Donna Vekic",
    "conf": 62,
    "vol": 58,
    "tags": [
      "Women"
    ],
    "profileA": "Tour-level weapons edge",
    "profileB": "Home-clay pressure path",
    "noteA": "Vekic has the bigger serve and first-ball profile, which gives her more ways to control scoreboard pressure.",
    "noteB": "Tubello needs the French crowd and clay rhythm to make Vekic hit extra balls from uncomfortable positions.",
    "angle": "Vekic has the cleaner tour-level weapons edge, but the WTA clay volatility keeps this out of core territory",
    "swing": "If Tubello extends rallies and Vekic starts donating errors, the home underdog becomes live.",
    "idSlug": "vekic-tubello",
    "recommendationScore": 57,
    "tier": "Lean"
  },
  {
    "fmt": "WTA",
    "time": "2:00 AM PT",
    "min": 120,
    "court": "Court 9",
    "a": "Claire Liu",
    "b": "Moyuka Uchijima",
    "pick": "Claire Liu",
    "conf": 55,
    "vol": 72,
    "tags": [
      "Women",
      "Volatile"
    ],
    "profileA": "Slight control lean",
    "profileB": "Rhythm spoiler",
    "noteA": "Liu is the tiny desk side because her point construction is a little easier to trust in a slow-court opener.",
    "noteB": "Uchijima can flip this if she owns the first strike and keeps Liu from settling into neutral patterns.",
    "angle": "Liu is only a narrow preference because this is exactly the type of WTA round-one match that should be treated as coin-flip-adjacent",
    "swing": "If Uchijima finds first-strike rhythm, the match should be priced closer to even almost immediately.",
    "idSlug": "liu-uchijima",
    "recommendationScore": 46,
    "tier": "Swingy"
  },
  {
    "fmt": "WTA",
    "time": "3:00 AM PT",
    "min": 180,
    "court": "Court Philippe-Chatrier",
    "a": "Aryna Sabalenka",
    "b": "Jessica Bouzas Maneiro",
    "pick": "Aryna Sabalenka",
    "conf": 82,
    "vol": 30,
    "tags": [
      "Women",
      "Favorite"
    ],
    "profileA": "Top seed power favorite",
    "profileB": "Needs error-heavy favorite",
    "noteA": "Sabalenka owns the top-end power and should control most normal service games even on clay.",
    "noteB": "Bouzas Maneiro needs Sabalenka to misfire for long enough to turn the opener into scoreboard tension.",
    "angle": "Sabalenka is a clean top-seed lane because the first-strike and physicality gap is too large in a normal match",
    "swing": "Only a very loose Sabalenka first set makes this meaningfully noisy.",
    "idSlug": "sabalenka-maneiro",
    "recommendationScore": 86,
    "tier": "Core"
  },
  {
    "fmt": "WTA",
    "time": "3:30 AM PT",
    "min": 210,
    "court": "Court 6",
    "a": "Linda Noskova",
    "b": "Maria Sakkari",
    "pick": "Linda Noskova",
    "conf": 60,
    "vol": 66,
    "tags": [
      "Women",
      "Volatile"
    ],
    "profileA": "Seeded first-strike edge",
    "profileB": "Veteran physical counter",
    "noteA": "Noskova has the cleaner power lane and can take the match out of Sakkari’s preferred grind if she serves well.",
    "noteB": "Sakkari is dangerous if she turns it into legs, repeat balls, and emotional pressure.",
    "angle": "Noskova gets the lean on cleaner current weapons, but this is not a low-volatility WTA favorite spot",
    "swing": "If Sakkari makes the match physical and Noskova’s first serve dips, this can flip.",
    "idSlug": "noskova-sakkari",
    "recommendationScore": 53,
    "tier": "Lean"
  },
  {
    "fmt": "WTA",
    "time": "3:30 AM PT",
    "min": 210,
    "court": "Court 12",
    "a": "Ann Li",
    "b": "Zhang Shuai",
    "pick": "Ann Li",
    "conf": 61,
    "vol": 60,
    "tags": [
      "Women"
    ],
    "profileA": "Seeded steadier lane",
    "profileB": "Veteran spoiler path",
    "noteA": "Li gets the nod because the steadier current profile should matter if this becomes a sequence-of-holds match.",
    "noteB": "Zhang needs to shorten points and force Li into rushed decisions before the clay patterns settle.",
    "angle": "Li has the cleaner current trust profile and should own more of the neutral rally patterns",
    "swing": "If Zhang protects serve early and attacks second balls, this becomes more volatile than the seed line suggests.",
    "idSlug": "li-shuai",
    "recommendationScore": 56,
    "tier": "Lean"
  },
  {
    "fmt": "WTA",
    "time": "4:00 AM PT",
    "min": 240,
    "court": "Court 7",
    "a": "Linda Fruhvirtova",
    "b": "Elsa Jacquemot",
    "pick": "Elsa Jacquemot",
    "conf": 56,
    "vol": 74,
    "tags": [
      "Women",
      "Volatile"
    ],
    "profileA": "Talent edge if clean",
    "profileB": "French-clay pressure lane",
    "noteA": "Fruhvirtova has the higher clean-ball ceiling, but her path needs steadier control than she always gives.",
    "noteB": "Jacquemot can make this uncomfortable with home support and heavier clay exchanges.",
    "angle": "Jacquemot is the live home-clay side, but this is a watch-grade lean more than a clean prediction",
    "swing": "If Fruhvirtova lands first and keeps points short, the French crowd angle matters less.",
    "idSlug": "jacquemot-fruhvirtova",
    "recommendationScore": 46,
    "tier": "Swingy"
  },
  {
    "fmt": "WTA",
    "time": "4:00 AM PT",
    "min": 240,
    "court": "Court Suzanne-Lenglen",
    "a": "Laura Siegemund",
    "b": "Naomi Osaka",
    "pick": "Naomi Osaka",
    "conf": 58,
    "vol": 70,
    "tags": [
      "Women"
    ],
    "profileA": "Clay-craft disruptor",
    "profileB": "Higher ceiling favorite",
    "noteA": "Siegemund has the craft to make Osaka uncomfortable, especially if she varies height and tempo.",
    "noteB": "Osaka still has the bigger serve and ball-striking ceiling, and that should be enough if the error count stays reasonable.",
    "angle": "Osaka keeps the weapons lean, but Siegemund’s opponent-adjusted clay form is a real warning against treating this as a normal favorite spot",
    "swing": "If Siegemund drags Osaka into drop-shot and shape management, the data warning can turn into a full upset lane.",
    "idSlug": "osaka-siegemund",
    "recommendationScore": 56,
    "tier": "Lean"
  },
  {
    "fmt": "WTA",
    "time": "5:00 AM PT",
    "min": 300,
    "court": "Court 5",
    "a": "Dalma Galfi",
    "b": "Mayar Sherif",
    "pick": "Mayar Sherif",
    "conf": 60,
    "vol": 62,
    "tags": [
      "Women"
    ],
    "profileA": "Needs first-strike day",
    "profileB": "Clay-volume edge",
    "noteA": "Galfi can win if she keeps the points shorter and avoids getting pulled into Sherif’s preferred rhythm.",
    "noteB": "Sherif has the more natural clay identity and should be better if the match becomes physical.",
    "angle": "Sherif has the more reliable clay-volume profile and should benefit if rallies extend",
    "swing": "If Galfi wins the first-strike exchanges and keeps Sherif defending, the edge tightens.",
    "idSlug": "sherif-galfi",
    "recommendationScore": 54,
    "tier": "Lean"
  },
  {
    "fmt": "WTA",
    "time": "5:30 AM PT",
    "min": 330,
    "court": "Court 7",
    "a": "Anhelina Kalinina",
    "b": "Diane Parry",
    "pick": "Anhelina Kalinina",
    "conf": 56,
    "vol": 70,
    "tags": [
      "Women",
      "Volatile"
    ],
    "profileA": "Data-led clay control lean",
    "profileB": "Home variety danger",
    "noteA": "Kalinina has the stronger ranking and clay-win profile, and the enriched data makes the home-underdog story less automatic.",
    "noteB": "Parry still has the crowd, variety, and a nearly level opponent-adjusted read, so this is not clean.",
    "angle": "Kalinina has the sturdier clay and ranking profile, while Parry’s home variety keeps this in the swingy WTA band",
    "swing": "If Parry changes tempo early and gets the crowd into return games, Kalinina’s data edge can flatten quickly.",
    "idSlug": "parry-kalinina",
    "recommendationScore": 49,
    "tier": "Swingy"
  },
  {
    "fmt": "WTA",
    "time": "5:30 AM PT",
    "min": 330,
    "court": "Court 8",
    "a": "Antonia Ruzic",
    "b": "Ashlyn Krueger",
    "pick": "Ashlyn Krueger",
    "conf": 59,
    "vol": 67,
    "tags": [
      "Women",
      "Volatile"
    ],
    "profileA": "Clay rhythm path",
    "profileB": "Higher power ceiling",
    "noteA": "Ruzic is live if she can make Krueger play extra balls and prove the movement over multiple sets.",
    "noteB": "Krueger has the better first-strike tools and should be able to control enough short points.",
    "angle": "Krueger gets the edge on power and current upside, but the clay movement question keeps the confidence capped",
    "swing": "If Ruzic makes this a patience test, Krueger has to earn the favorite lane.",
    "idSlug": "krueger-ruzic",
    "recommendationScore": 51,
    "tier": "Lean"
  },
  {
    "fmt": "WTA",
    "time": "5:30 AM PT",
    "min": 330,
    "court": "Court Suzanne-Lenglen",
    "a": "Anna Kalinskaya",
    "b": "Lois Boisson",
    "pick": "Anna Kalinskaya",
    "conf": 64,
    "vol": 57,
    "tags": [
      "Women"
    ],
    "profileA": "Seeded baseline control",
    "profileB": "French upset pressure",
    "noteA": "Kalinskaya has the cleaner baseline shape and should be able to absorb the home-crowd wave if she starts solidly.",
    "noteB": "Boisson needs the match to become emotional and physical enough to stress Kalinskaya’s service games.",
    "angle": "Kalinskaya has the better normal-script baseline control, with only moderate home-underdog pressure attached",
    "swing": "If Boisson gets the crowd into every deuce game, this gets much less comfortable.",
    "idSlug": "kalinskaya-boisson",
    "recommendationScore": 60,
    "tier": "Lean"
  },
  {
    "fmt": "WTA",
    "time": "6:00 AM PT",
    "min": 360,
    "court": "Court 13",
    "a": "Alina Korneeva",
    "b": "Elisabetta Cocciaretto",
    "pick": "Elisabetta Cocciaretto",
    "conf": 55,
    "vol": 72,
    "tags": [
      "Women",
      "Volatile"
    ],
    "profileA": "Young upside lane",
    "profileB": "Clay-seasoned counter",
    "noteA": "Korneeva has the talent to make this noisy, especially if she takes time away early.",
    "noteB": "Cocciaretto is the steadier clay operator and should ask more reliable questions over a full match.",
    "angle": "Cocciaretto keeps the narrow ranking and clay-construction lean, but Korneeva’s limited-coverage form profile makes this closer to a coin flip",
    "swing": "If Korneeva starts fast and hits through the court, the desk side gets fragile quickly.",
    "idSlug": "cocciaretto-korneeva",
    "recommendationScore": 51,
    "tier": "Swingy"
  },
  {
    "fmt": "WTA",
    "time": "6:00 AM PT",
    "min": 360,
    "court": "Court Simonne-Mathieu",
    "a": "Hanne Vandewinkel",
    "b": "Madison Keys",
    "pick": "Madison Keys",
    "conf": 70,
    "vol": 47,
    "tags": [
      "Women",
      "Favorite"
    ],
    "profileA": "Needs movement test",
    "profileB": "Seeded power edge",
    "noteA": "Vandewinkel needs Keys to leak errors and give her enough return looks to make this a clay grind.",
    "noteB": "Keys has too much serve and first-strike weight if she keeps the miss count in range.",
    "angle": "Keys has the clean power edge and enough experience to avoid overcomplicating this opener",
    "swing": "If Keys gets dragged into long neutral rallies and loses timing, the upset risk climbs.",
    "idSlug": "keys-vandewinkel",
    "recommendationScore": 69,
    "tier": "Strong"
  },
  {
    "fmt": "WTA",
    "time": "6:30 AM PT",
    "min": 390,
    "court": "Court Philippe-Chatrier",
    "a": "Coco Gauff",
    "b": "Taylor Townsend",
    "pick": "Coco Gauff",
    "conf": 73,
    "vol": 43,
    "tags": [
      "Women",
      "Favorite"
    ],
    "profileA": "Top seed athletic edge",
    "profileB": "Lefty disruption path",
    "noteA": "Gauff has the athletic coverage, return pressure, and clay defense to own the longer match script.",
    "noteB": "Townsend can make this interesting if the lefty patterns and net pressure rush Gauff’s forehand decisions.",
    "angle": "Gauff has the stronger clay defense and return-pressure base, even with the all-American matchup noise",
    "swing": "If Townsend serves big and gets forward before rallies settle, the match can get tighter than expected.",
    "idSlug": "gauff-townsend",
    "recommendationScore": 77,
    "tier": "Strong"
  },
  {
    "fmt": "WTA",
    "time": "7:00 AM PT",
    "min": 420,
    "court": "Court 9",
    "a": "Elena Pridankina",
    "b": "Oleksandra Oliynykova",
    "pick": "Elena Pridankina",
    "conf": 56,
    "vol": 73,
    "tags": [
      "Women",
      "Volatile"
    ],
    "profileA": "Recent qualifying form",
    "profileB": "Clay upset path",
    "noteA": "Pridankina gets the slight lean because her recent qualifying rhythm should help her start cleaner.",
    "noteB": "Oliynykova can flip it if she makes the match physical and turns service games into long clusters.",
    "angle": "Pridankina is the form lean, but the edge is thin enough that this should be treated as swingy",
    "swing": "If Oliynykova digs into return games early, this can become a coin flip.",
    "idSlug": "pridankina-oliynykova",
    "recommendationScore": 46,
    "tier": "Swingy"
  },
  {
    "fmt": "WTA",
    "time": "7:30 AM PT",
    "min": 450,
    "court": "Court 13",
    "a": "Simona Waltert",
    "b": "Katerina Siniakova",
    "pick": "Simona Waltert",
    "conf": 55,
    "vol": 70,
    "tags": [
      "Women"
    ],
    "profileA": "Data-led clay form lean",
    "profileB": "Variety counterweight",
    "noteA": "Waltert has the better recent clay record and opponent-adjusted form read, enough to flip this from Siniakova at a low-confidence level.",
    "noteB": "Siniakova still has the more complete toolbox, so Waltert needs depth and patience rather than a loose tactical match.",
    "angle": "Waltert has the stronger current clay evidence, but Siniakova’s all-court craft keeps the confidence capped",
    "swing": "If Siniakova breaks rhythm with variety and gets Waltert playing reactive tennis, the original toolbox read can win.",
    "idSlug": "siniakova-waltert",
    "recommendationScore": 56,
    "tier": "Lean"
  },
  {
    "fmt": "WTA",
    "time": "7:30 AM PT",
    "min": 450,
    "court": "Court 14",
    "a": "Victoria Mboko",
    "b": "Nikola Bartunkova",
    "pick": "Victoria Mboko",
    "conf": 66,
    "vol": 55,
    "tags": [
      "Women"
    ],
    "profileA": "Seeded breakout lane",
    "profileB": "Young spoiler path",
    "noteA": "Mboko has the stronger current profile and should be able to impose more pressure from neutral balls.",
    "noteB": "Bartunkova is live if she keeps the match in long games and forces Mboko to protect the seed pressure.",
    "angle": "Mboko has the clearer current-form and athletic pressure edge, but youth-on-youth volatility still matters",
    "swing": "If Bartunkova extends the first set and makes Mboko feel the seed tag, this tightens.",
    "idSlug": "mboko-bartunkova",
    "recommendationScore": 63,
    "tier": "Lean"
  },
  {
    "fmt": "WTA",
    "time": "7:30 AM PT",
    "min": 450,
    "court": "Court Simonne-Mathieu",
    "a": "Kimberly Birrell",
    "b": "Jessica Pegula",
    "pick": "Jessica Pegula",
    "conf": 74,
    "vol": 40,
    "tags": [
      "Women",
      "Favorite"
    ],
    "profileA": "Needs favorite leakage",
    "profileB": "Top-five stability edge",
    "noteA": "Birrell needs Pegula to get passive and donate enough short balls to keep return games live.",
    "noteB": "Pegula is one of the cleaner WTA early-round trust profiles because she rarely needs perfect shotmaking to create pressure.",
    "angle": "Pegula has the steadier top-five baseline and return profile, which is exactly the cleaner WTA lane the board should promote",
    "swing": "If Pegula becomes too passive and Birrell owns the front foot, the match can stretch.",
    "idSlug": "pegula-birrell",
    "recommendationScore": 78,
    "tier": "Core"
  },
  {
    "fmt": "ATP",
    "time": "2:00 AM PT",
    "min": 120,
    "court": "Court 13",
    "a": "Alexei Popyrin",
    "b": "Zachary Svajda",
    "pick": "Alexei Popyrin",
    "conf": 67,
    "vol": 50,
    "tags": [
      "Men"
    ],
    "profileA": "Bigger ATP weapons",
    "profileB": "Needs return pressure",
    "noteA": "Popyrin has the heavier serve and forehand, and best-of-five gives him more runway to stabilize if one set gets loose.",
    "noteB": "Svajda needs to make enough returns and create low-margin pressure on Popyrin’s second ball.",
    "angle": "Popyrin has the cleaner ATP weapons profile and more best-of-five correction room",
    "swing": "If Svajda turns Popyrin’s service games into long deuce clusters, the edge becomes much thinner.",
    "idSlug": "popyrin-svajda",
    "recommendationScore": 65,
    "tier": "Lean"
  },
  {
    "fmt": "ATP",
    "time": "2:00 AM PT",
    "min": 120,
    "court": "Court 7",
    "a": "Tallon Griekspoor",
    "b": "Matteo Arnaldi",
    "pick": "Matteo Arnaldi",
    "conf": 58,
    "vol": 68,
    "tags": [
      "Men",
      "Volatile"
    ],
    "profileA": "Seeded serve-plus-one risk",
    "profileB": "Data-led clay form lean",
    "noteA": "Griekspoor still has the ranking and first-strike serve path, but his recent clay profile is weaker than the old desk lean implied.",
    "noteB": "Arnaldi brings the better opponent-adjusted clay read and enough rally tolerance to drag this away from a simple seed script.",
    "angle": "Arnaldi has the stronger clay-form and opponent-quality profile, while Griekspoor keeps this capped through serve and ranking equity",
    "swing": "If Griekspoor lands cheap holds and avoids long neutral exchanges, the original seeded path can still hold.",
    "idSlug": "griekspoor-arnaldi",
    "recommendationScore": 53,
    "tier": "Lean"
  },
  {
    "fmt": "ATP",
    "time": "2:00 AM PT",
    "min": 120,
    "court": "Court 8",
    "a": "Alejandro Tabilo",
    "b": "Kamil Majchrzak",
    "pick": "Alejandro Tabilo",
    "conf": 63,
    "vol": 58,
    "tags": [
      "Men"
    ],
    "profileA": "Lefty clay shape",
    "profileB": "Needs clean hold pattern",
    "noteA": "Tabilo’s lefty shape and clay comfort give him the better repeatable pressure lane.",
    "noteB": "Majchrzak needs to hold efficiently and avoid letting Tabilo build forehand-pattern control.",
    "angle": "Tabilo has the more natural clay pattern and lefty rhythm edge",
    "swing": "If Majchrzak keeps Tabilo out of return games early, this can become more scoreboard-driven than matchup-driven.",
    "idSlug": "tabilo-majchrzak",
    "recommendationScore": 58,
    "tier": "Lean"
  },
  {
    "fmt": "ATP",
    "time": "2:00 AM PT",
    "min": 120,
    "court": "Court Simonne-Mathieu",
    "a": "Marin Cilic",
    "b": "Moise Kouame",
    "pick": "Marin Cilic",
    "conf": 61,
    "vol": 67,
    "tags": [
      "Men",
      "Volatile"
    ],
    "profileA": "Veteran weapons edge",
    "profileB": "French wildcard chaos",
    "noteA": "Cilic still has the serve and major experience to manage a young opponent if his body is there.",
    "noteB": "Kouame has the home-crowd chaos path and can make this uncomfortable if Cilic starts slowly.",
    "angle": "Cilic gets the veteran weapons lean, but the age and home-wildcard variables keep the volatility elevated",
    "swing": "If Kouame rides the crowd and Cilic’s movement looks heavy, this can flip into a live dog spot.",
    "idSlug": "cilic-kouame",
    "recommendationScore": 53,
    "tier": "Lean"
  },
  {
    "fmt": "ATP",
    "time": "2:00 AM PT",
    "min": 120,
    "court": "Court Suzanne-Lenglen",
    "a": "Adam Walton",
    "b": "Daniil Medvedev",
    "pick": "Daniil Medvedev",
    "conf": 75,
    "vol": 39,
    "tags": [
      "Men",
      "Favorite"
    ],
    "profileA": "Needs clay discomfort",
    "profileB": "Top-seed problem solver",
    "noteA": "Walton needs Medvedev to hate the conditions and give away enough service games to make this real.",
    "noteB": "Medvedev is not a natural clay hammer, but the return quality and best-of-five problem solving should be too much.",
    "angle": "Medvedev has too much return stability and five-set problem solving for a normal first-round script",
    "swing": "If Medvedev gets irritated early and Walton protects serve, the match may look uglier than the projection.",
    "idSlug": "medvedev-walton",
    "recommendationScore": 79,
    "tier": "Core"
  },
  {
    "fmt": "ATP",
    "time": "3:00 AM PT",
    "min": 180,
    "court": "Court 4",
    "a": "Facundo Diaz Acosta",
    "b": "Zhang Zhizhen",
    "pick": "Facundo Diaz Acosta",
    "conf": 62,
    "vol": 61,
    "tags": [
      "Men"
    ],
    "profileA": "Clay-first identity",
    "profileB": "Bigger strike spoiler",
    "noteA": "Diaz Acosta owns the more natural clay identity and should be more comfortable in long baseline patterns.",
    "noteB": "Zhang can win if he keeps points shorter and prevents this from turning into clay-volume tennis.",
    "angle": "Diaz Acosta has the cleaner clay-specific profile even if Zhang owns the bigger first-strike ceiling",
    "swing": "If Zhang serves through enough games and attacks early, the clay edge can be muted.",
    "idSlug": "acosta-zhizhen",
    "recommendationScore": 56,
    "tier": "Lean"
  },
  {
    "fmt": "ATP",
    "time": "3:30 AM PT",
    "min": 210,
    "court": "Court 14",
    "a": "Thomas Faurel",
    "b": "Valentin Vacherot",
    "pick": "Valentin Vacherot",
    "conf": 68,
    "vol": 49,
    "tags": [
      "Men"
    ],
    "profileA": "French pressure path",
    "profileB": "Seeded ATP control",
    "noteA": "Faurel needs the crowd and early scoreboard stress to pull Vacherot into a tense opener.",
    "noteB": "Vacherot has the steadier ATP level and should have more ways to protect serve over five sets.",
    "angle": "Vacherot has the cleaner ATP baseline and serve stability against a home underdog profile",
    "swing": "If Faurel turns the first set into a crowd match, the favorite may have to work through pressure.",
    "idSlug": "vacherot-faurel",
    "recommendationScore": 67,
    "tier": "Strong"
  },
  {
    "fmt": "ATP",
    "time": "3:30 AM PT",
    "min": 210,
    "court": "Court 9",
    "a": "Martin Landaluce",
    "b": "Juan Carlos Prado Angelo",
    "pick": "Juan Carlos Prado Angelo",
    "conf": 54,
    "vol": 74,
    "tags": [
      "Men",
      "Volatile"
    ],
    "profileA": "Upside counterweight",
    "profileB": "Clay-form upset lean",
    "noteA": "Landaluce still has the higher-ceiling profile and enough ranked-opponent exposure to stay live.",
    "noteB": "Prado Angelo carries the better clay record and slightly better scoreline-form read, but ranking coverage is thinner.",
    "angle": "Prado Angelo gets the smallest data-led lean on clay form, with Landaluce’s upside keeping this nearly coin-flip",
    "swing": "If Landaluce controls the forehand patterns and gets cheap holds, the upside profile can still be enough.",
    "idSlug": "landaluce-angelo",
    "recommendationScore": 48,
    "tier": "Swingy"
  },
  {
    "fmt": "ATP",
    "time": "4:00 AM PT",
    "min": 240,
    "court": "Court 13",
    "a": "Cameron Norrie",
    "b": "Adolfo Daniel Vallejo",
    "pick": "Adolfo Daniel Vallejo",
    "conf": 56,
    "vol": 70,
    "tags": [
      "Men"
    ],
    "profileA": "Veteran five-set counterweight",
    "profileB": "Data-led clay form lean",
    "noteA": "Norrie still owns the experience, lefty patterns, and best-of-five problem-solving edge, so he cannot be dismissed.",
    "noteB": "Vallejo has the stronger 2026 clay record and opponent-adjusted form profile, making the original confidence too rich.",
    "angle": "Vallejo owns the better current clay evidence, while Norrie keeps this in high-volatility territory through experience and fitness",
    "swing": "If Norrie turns this into attrition and forces Vallejo to solve patterns over five sets, the data edge can leak.",
    "idSlug": "norrie-vallejo",
    "recommendationScore": 68,
    "tier": "Strong"
  },
  {
    "fmt": "ATP",
    "time": "4:00 AM PT",
    "min": 240,
    "court": "Court Simonne-Mathieu",
    "a": "Vit Kopriva",
    "b": "Corentin Moutet",
    "pick": "Vit Kopriva",
    "conf": 56,
    "vol": 69,
    "tags": [
      "Men",
      "Volatile"
    ],
    "profileA": "Data-led clay grinder",
    "profileB": "Home disruption risk",
    "noteA": "Kopriva grades better on recent clay strength and opponent-quality context, with enough patience to mute crowd swings.",
    "noteB": "Moutet still has home support, lefty variety, and disruption, which is why this stays a volatile lean.",
    "angle": "Kopriva has the cleaner recent clay evidence, but Moutet’s home-variety path keeps the margin thin",
    "swing": "If Moutet turns the match into crowd-driven problem solving instead of disciplined clay patterns, the French lean can reappear.",
    "idSlug": "moutet-kopriva",
    "recommendationScore": 56,
    "tier": "Lean"
  },
  {
    "fmt": "ATP",
    "time": "4:30 AM PT",
    "min": 270,
    "court": "TBD",
    "a": "Alexandre Muller",
    "b": "Stefanos Tsitsipas",
    "pick": "Stefanos Tsitsipas",
    "conf": 72,
    "vol": 45,
    "tags": [
      "Men",
      "Favorite"
    ],
    "profileA": "Home upset pressure",
    "profileB": "Higher clay ceiling",
    "noteA": "Muller can make this sticky with home support and enough backhand pressure into Tsitsipas’s weaker wing.",
    "noteB": "Tsitsipas still has the higher clay ceiling and should control more serve-plus-forehand patterns.",
    "angle": "Tsitsipas has the stronger clay ceiling and best-of-five scoring runway, even with some recent trust questions",
    "swing": "If Muller attacks the backhand and the crowd turns every service game heavy, the favorite path tightens.",
    "idSlug": "tsitsipas-muller",
    "recommendationScore": 76,
    "tier": "Strong"
  },
  {
    "fmt": "ATP",
    "time": "5:00 AM PT",
    "min": 300,
    "court": "Court 12",
    "a": "Sebastian Baez",
    "b": "Roman Andres Burruchaga",
    "pick": "Roman Andres Burruchaga",
    "conf": 57,
    "vol": 66,
    "tags": [
      "Men"
    ],
    "profileA": "Reputation clay favorite",
    "profileB": "Data-led clay form lean",
    "noteA": "Baez still owns the name, H2H, and known clay-specialist reputation, but his 2026 clay form is not supporting a strong favorite tag.",
    "noteB": "Burruchaga has the stronger 2026 clay record and opponent-adjusted form profile, making him the revised lean.",
    "angle": "Burruchaga has the better current clay evidence even though Baez keeps H2H and reputation counterweights",
    "swing": "If Baez owns court position early and turns this into his preferred forehand patterns, the revision can look too cute.",
    "idSlug": "baez-burruchaga",
    "recommendationScore": 66,
    "tier": "Strong"
  },
  {
    "fmt": "ATP",
    "time": "5:00 AM PT",
    "min": 300,
    "court": "Court 6",
    "a": "Cristian Garin",
    "b": "Learner Tien",
    "pick": "Learner Tien",
    "conf": 59,
    "vol": 67,
    "tags": [
      "Men",
      "Volatile"
    ],
    "profileA": "Experienced clay spoiler",
    "profileB": "Seeded current upside",
    "noteA": "Garin has enough clay experience to punish any loose Tien stretches.",
    "noteB": "Tien gets the lean because the current ranking/seed profile points to a cleaner overall level.",
    "angle": "Tien is the current-level side, but Garin’s clay experience makes this one of the less comfortable seeded reads",
    "swing": "If Garin turns it into physical clay exchanges and Tien gets impatient, the upset path is real.",
    "idSlug": "tien-garin",
    "recommendationScore": 51,
    "tier": "Lean"
  },
  {
    "fmt": "ATP",
    "time": "5:30 AM PT",
    "min": 330,
    "court": "Court 14",
    "a": "Alexander Bublik",
    "b": "Jan-Lennard Struff",
    "pick": "Alexander Bublik",
    "conf": 64,
    "vol": 61,
    "tags": [
      "Men"
    ],
    "profileA": "Seeded serve creativity",
    "profileB": "First-strike spoiler",
    "noteA": "Bublik has the more dynamic serve and shotmaking package, and best-of-five gives him time to solve one loose patch.",
    "noteB": "Struff can make this very dangerous if he lands first serves and keeps points short.",
    "angle": "Bublik has the higher current ceiling and more varied service-game pressure, but Struff keeps the volatility alive",
    "swing": "If Struff wins the first-strike battle and Bublik gets loose, this can swing quickly.",
    "idSlug": "bublik-struff",
    "recommendationScore": 58,
    "tier": "Lean"
  },
  {
    "fmt": "ATP",
    "time": "7:00 AM PT",
    "min": 420,
    "court": "Court 12",
    "a": "Ethan Quinn",
    "b": "Francisco Comesana",
    "pick": "Francisco Comesana",
    "conf": 60,
    "vol": 62,
    "tags": [
      "Men"
    ],
    "profileA": "American upside path",
    "profileB": "Clay comfort edge",
    "noteA": "Quinn needs the serve and forehand to shorten the match before Comesana settles into clay rhythm.",
    "noteB": "Comesana is more comfortable in clay patterns and should ask better baseline questions over time.",
    "angle": "Comesana has the more natural clay identity and should benefit if the match becomes physical",
    "swing": "If Quinn serves through pressure games and gets short balls, the clay edge gets compressed.",
    "idSlug": "comesana-quinn",
    "recommendationScore": 54,
    "tier": "Lean"
  },
  {
    "fmt": "ATP",
    "time": "7:00 AM PT",
    "min": 420,
    "court": "Court 6",
    "a": "Jaime Faria",
    "b": "Denis Shapovalov",
    "pick": "Denis Shapovalov",
    "conf": 58,
    "vol": 74,
    "tags": [
      "Men",
      "Volatile"
    ],
    "profileA": "Clay patience path",
    "profileB": "Higher weapons ceiling",
    "noteA": "Faria is live because Shapovalov can still donate errors if the match asks for too much patience.",
    "noteB": "Shapovalov has the bigger serve and shotmaking ceiling, which is enough for a narrow desk lean.",
    "angle": "Shapovalov gets the weapons lean, but this is exactly the kind of high-volatility ATP spot to keep capped",
    "swing": "If Faria makes Shapovalov hit extra balls from neutral positions, the dog lane becomes very real.",
    "idSlug": "shapovalov-faria",
    "recommendationScore": 48,
    "tier": "Swingy"
  },
  {
    "fmt": "ATP",
    "time": "7:00 AM PT",
    "min": 420,
    "court": "Court 7",
    "a": "Sebastian Ofner",
    "b": "Luciano Darderi",
    "pick": "Luciano Darderi",
    "conf": 70,
    "vol": 45,
    "tags": [
      "Men",
      "Favorite"
    ],
    "profileA": "Needs first-strike disruption",
    "profileB": "Seeded clay identity",
    "noteA": "Ofner needs to keep the match out of long clay exchanges and stress Darderi’s service games early.",
    "noteB": "Darderi has the more coherent clay identity and should be stronger in extended baseline phases.",
    "angle": "Darderi has the cleaner clay-specialist lane and enough seed-level trust to promote",
    "swing": "If Ofner serves big and keeps rallies short, the match can look less clay-controlled.",
    "idSlug": "darderi-ofner",
    "recommendationScore": 70,
    "tier": "Strong"
  },
  {
    "fmt": "ATP",
    "time": "7:00 AM PT",
    "min": 420,
    "court": "Court 8",
    "a": "Jacob Fearnley",
    "b": "Juan Manuel Cerundolo",
    "pick": "Juan Manuel Cerundolo",
    "conf": 61,
    "vol": 63,
    "tags": [
      "Men"
    ],
    "profileA": "Needs tempo control",
    "profileB": "Clay-family baseline edge",
    "noteA": "Fearnley needs to protect serve and avoid letting Cerundolo turn the match into heavy clay patterns.",
    "noteB": "Cerundolo has the more natural clay movement and rally tolerance.",
    "angle": "Cerundolo has the better clay-native pattern if the match settles into baseline exchanges",
    "swing": "If Fearnley keeps games short and gets cheap holds, the edge narrows.",
    "idSlug": "cerundolo-fearnley",
    "recommendationScore": 55,
    "tier": "Lean"
  },
  {
    "fmt": "ATP",
    "time": "7:00 AM PT",
    "min": 420,
    "court": "TBD",
    "a": "Felix Auger-Aliassime",
    "b": "Daniel Altmaier",
    "pick": "Felix Auger-Aliassime",
    "conf": 66,
    "vol": 56,
    "tags": [
      "Men",
      "Favorite"
    ],
    "profileA": "Seeded power-athlete edge",
    "profileB": "Clay spoiler path",
    "noteA": "Auger-Aliassime has the larger serve and athletic ceiling, and the seed profile should matter if he starts cleanly.",
    "noteB": "Altmaier is a legitimate clay spoiler if he drags the match into shape and patience.",
    "angle": "Auger-Aliassime has the stronger overall level, but Altmaier’s clay comfort keeps this from being a full-confidence favorite",
    "swing": "If Altmaier extends rallies and gets FAA playing reactive tennis, this can get long.",
    "idSlug": "auger-aliassime-altmaier",
    "recommendationScore": 62,
    "tier": "Lean"
  },
  {
    "fmt": "ATP",
    "time": "11:15 AM PT",
    "min": 675,
    "court": "Court Philippe-Chatrier",
    "a": "Jannik Sinner",
    "b": "Clement Tabur",
    "pick": "Jannik Sinner",
    "conf": 84,
    "vol": 27,
    "tags": [
      "Men",
      "Favorite"
    ],
    "profileA": "Top-end major favorite",
    "profileB": "Huge longshot",
    "noteA": "Sinner should have too much quality in every normal script of this match, and the board does not need to get creative here.",
    "noteB": "Tabur needs early scoreboard chaos and a strangely flat favorite to make this more than a survival match.",
    "angle": "Sinner is the cleanest ATP favorite on the May 26 carryover lane and owns every normal tennis script",
    "swing": "Only a totally flat Sinner opening or an injury-style disruption makes this live.",
    "idSlug": "sinner-tabur",
    "recommendationScore": 86,
    "tier": "Core"
  }
]

const market = (total, rows) => ({
  total,
  players: Object.fromEntries(rows.map(([name, amount, pct]) => [name, { amount, pct }]))
})

const marketByMatchId = {
  'rg-m-acosta-zhizhen-2026-05-26': market(20086, [
    ['Facundo Diaz Acosta', 13892, 69],
    ['Zhang Zhizhen', 6194, 33]
  ]),
  'rg-m-auger-aliassime-altmaier-2026-05-26': market(58946, [
    ['Felix Auger-Aliassime', 28770, 76],
    ['Daniel Altmaier', 30176, 25]
  ]),
  'rg-m-baez-burruchaga-2026-05-26': market(216775, [
    ['Sebastian Baez', 33789, 53],
    ['Roman Andres Burruchaga', 182986, 49]
  ]),
  'rg-m-bublik-struff-2026-05-26': market(43127, [
    ['Alexander Bublik', 34702, 78],
    ['Jan-Lennard Struff', 8425, 24]
  ]),
  'rg-m-cerundolo-fearnley-2026-05-26': market(7831, [
    ['Juan Manuel Cerundolo', 4326, 79],
    ['Jacob Fearnley', 3505, 22]
  ]),
  'rg-m-cilic-kouame-2026-05-26': market(203190, [
    ['Marin Cilic', 126317, 77],
    ['Moise Kouame', 76873, 26]
  ]),
  'rg-m-comesana-quinn-2026-05-26': market(19265, [
    ['Francisco Comesana', 8961, 59],
    ['Ethan Quinn', 10304, 42]
  ]),
  'rg-m-darderi-ofner-2026-05-26': market(44990, [
    ['Luciano Darderi', 32883, 75],
    ['Sebastian Ofner', 12107, 26]
  ]),
  'rg-m-griekspoor-arnaldi-2026-05-26': market(162459, [
    ['Tallon Griekspoor', 57504, 43],
    ['Matteo Arnaldi', 104955, 57]
  ]),
  'rg-m-landaluce-angelo-2026-05-26': market(62477, [
    ['Martin Landaluce', 56244, 74],
    ['Juan Carlos Prado Angelo', 6233, 25]
  ]),
  'rg-m-medvedev-walton-2026-05-26': market(209158, [
    ['Daniil Medvedev', 79678, 94],
    ['Adam Walton', 129480, 7]
  ]),
  'rg-m-moutet-kopriva-2026-05-26': market(49355, [
    ['Corentin Moutet', 23237, 60],
    ['Vit Kopriva', 26118, 41]
  ]),
  'rg-m-norrie-vallejo-2026-05-26': market(162791, [
    ['Cameron Norrie', 71125, 46],
    ['Adolfo Daniel Vallejo', 91666, 55]
  ]),
  'rg-m-popyrin-svajda-2026-05-26': market(38688, [
    ['Alexei Popyrin', 7551, 89],
    ['Zachary Svajda', 31137, 13]
  ]),
  'rg-m-shapovalov-faria-2026-05-26': market(61554, [
    ['Denis Shapovalov', 36086, 40],
    ['Jaime Faria', 25468, 61]
  ]),
  'rg-m-sinner-tabur-2026-05-26': market(234984, [
    ['Jannik Sinner', 71972, 99],
    ['Clement Tabur', 163012, 2]
  ]),
  'rg-m-tabilo-majchrzak-2026-05-26': market(18564, [
    ['Alejandro Tabilo', 8179, 80],
    ['Kamil Majchrzak', 10385, 21]
  ]),
  'rg-m-tien-garin-2026-05-26': market(296071, [
    ['Learner Tien', 284429, 66],
    ['Cristian Garin', 11642, 36]
  ]),
  'rg-m-tsitsipas-muller-2026-05-26': market(35549, [
    ['Stefanos Tsitsipas', 8551, 84],
    ['Alexandre Muller', 26998, 17]
  ]),
  'rg-m-vacherot-faurel-2026-05-26': market(33881, [
    ['Valentin Vacherot', 25685, 87],
    ['Thomas Faurel', 8196, 15]
  ]),
  'rg-w-cocciaretto-korneeva-2026-05-26': market(1357, [
    ['Elisabetta Cocciaretto', 1009, 66],
    ['Alina Korneeva', 348, 34]
  ]),
  'rg-w-gauff-townsend-2026-05-26': market(28846, [
    ['Coco Gauff', 21322, 89],
    ['Taylor Townsend', 7524, 12]
  ]),
  'rg-w-jacquemot-fruhvirtova-2026-05-26': market(8137, [
    ['Elsa Jacquemot', 2047, 55],
    ['Linda Fruhvirtova', 6090, 47]
  ]),
  'rg-w-jovic-eala-2026-05-26': market(73803, [
    ['Iva Jovic', 41526, 72],
    ['Alexandra Eala', 32277, 30]
  ]),
  'rg-w-kalinskaya-boisson-2026-05-26': market(19460, [
    ['Anna Kalinskaya', 9597, 64],
    ['Lois Boisson', 9863, 37]
  ]),
  'rg-w-keys-vandewinkel-2026-05-26': market(5640, [
    ['Madison Keys', 2682, 88],
    ['Hanne Vandewinkel', 2958, 13]
  ]),
  'rg-w-krueger-ruzic-2026-05-26': market(1982, [
    ['Ashlyn Krueger', 960, 62],
    ['Antonia Ruzic', 1022, 39]
  ]),
  'rg-w-li-shuai-2026-05-26': market(17126, [
    ['Ann Li', 10959, 73],
    ['Zhang Shuai', 6167, 30]
  ]),
  'rg-w-liu-uchijima-2026-05-26': market(41649, [
    ['Claire Liu', 37035, 60],
    ['Moyuka Uchijima', 4614, 43]
  ]),
  'rg-w-mboko-bartunkova-2026-05-26': market(8910, [
    ['Victoria Mboko', 8064, 75],
    ['Nikola Bartunkova', 846, 26]
  ]),
  'rg-w-navarro-tjen-2026-05-26': market(41086, [
    ['Emma Navarro', 29745, 76],
    ['Janice Tjen', 11341, 27]
  ]),
  'rg-w-noskova-sakkari-2026-05-26': market(33162, [
    ['Linda Noskova', 20987, 72],
    ['Maria Sakkari', 12175, 30]
  ]),
  'rg-w-osaka-siegemund-2026-05-26': market(20125, [
    ['Naomi Osaka', 17800, 76],
    ['Laura Siegemund', 2325, 25]
  ]),
  'rg-w-parry-kalinina-2026-05-26': market(13071, [
    ['Diane Parry', 7237, 30],
    ['Anhelina Kalinina', 5834, 71]
  ]),
  'rg-w-pegula-birrell-2026-05-26': market(34041, [
    ['Jessica Pegula', 19001, 98],
    ['Kimberly Birrell', 15040, 3]
  ]),
  'rg-w-pridankina-oliynykova-2026-05-26': market(3518, [
    ['Elena Pridankina', 604, 35],
    ['Oleksandra Oliynykova', 2914, 67]
  ]),
  'rg-w-sabalenka-maneiro-2026-05-26': market(143271, [
    ['Aryna Sabalenka', 102599, 96],
    ['Jessica Bouzas Maneiro', 40672, 5]
  ]),
  'rg-w-siniakova-waltert-2026-05-26': market(2263, [
    ['Katerina Siniakova', 2089, 68],
    ['Simona Waltert', 174, 33]
  ]),
  'rg-w-vekic-tubello-2026-05-26': market(30171, [
    ['Donna Vekic', 28547, 76],
    ['Alice Tubello', 1624, 26]
  ])
}

const matches = rawSingles.map(buildMatch)
const mlbIdCounts = new Map()
const mlbGames = rawGames.map((raw) => {
  const seen = mlbIdCounts.get(raw.id) ?? 0
  mlbIdCounts.set(raw.id, seen + 1)
  return buildMlbGame(raw, seen)
})

export const slateMeta = {
  title: 'Tuesday MLB + Roland Garros Desk',
  date: 'May 26, 2026',
  isoDate: '2026-05-26',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'A combined Tuesday slate with the live May 26 MLB board plus the Roland Garros singles desk.',
  notes: [
    'MLB is coming from the generated May 26 split files, including starter context, lineup boards, park context, bullpen-chain context, and the current state / mistake-shape layers.',
    'The tennis portion remains singles-only; doubles are intentionally excluded from the prediction desk.',
    'Where no public market split was saved locally for tennis, the card is using official schedule context and manual clay matchup reads only.'
  ]
}
export const filters = ['All', 'MLB', 'Tennis']
export const oddsMeta = {
  provider: 'Official MLB data + ScoresAndOdds live board / Roland Garros desk board',
  snapshot: 'May 26, 2026 MLB + Roland Garros desk',
  note:
    'MLB uses the generated live board pipeline with official data and accessible odds snapshots. Tennis remains a singles-only clay desk.'
}
export const sources = [
  { label: 'MLB probable pitchers', url: 'https://www.mlb.com/probable-pitchers' },
  { label: 'MLB starting lineups', url: 'https://www.mlb.com/starting-lineups' },
  { label: 'ScoresAndOdds MLB board', url: 'https://www.scoresandodds.com/mlb' },
  { label: 'ESPN tennis scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260526' },
  { label: 'Roland Garros order of play', url: 'https://www.rolandgarros.com/en-us/order-of-play?annexeCourt=all&competition=all&country=all&date=2026-05-26&favoriteFilter=false&principalCourt=all&year=2026' }
]

export const games = [...mlbGames, ...matches].sort(
  (left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title)
)

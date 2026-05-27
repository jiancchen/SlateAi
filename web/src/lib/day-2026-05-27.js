import { createSportsMatchModel } from './sports-model.js'
import { buildTennistonicH2HUrl } from './tennis-source-mapping.js'
import tennisClayContext from './day-2026-05-27-tennis-clay-context.generated.json' with { type: 'json' }
import tennisOpponentQualityContext from './day-2026-05-27-tennis-opponent-quality.generated.json' with { type: 'json' }

const oddsProvider = 'Roland Garros desk board'
const marketSource = 'Prediction market screenshot'
const marketCapturedAt = '2026-05-26 4:31 PM PT'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const formatPct = (value) => (Number.isFinite(value) ? `${Math.round(value)}%` : 'n/a')
const formatAmount = (value) => (Number.isFinite(value) ? value.toLocaleString('en-US') : 'n/a')
const formatSignedPct = (value) => (Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${Math.round(value)} pts` : 'n/a')

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
  note: 'This May 27 Roland Garros board is a singles-only prediction desk built from the ESPN scoreboard, the May 26 postmortem, conservative R2 clay rules, and captured prediction-market prices where available. Doubles and the Alex de Minaur walkover are intentionally excluded.',
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

const stage = (raw) => `Roland Garros ${raw.fmt === 'ATP' ? 'Men' : 'Women'} | ${raw.round || 'Round 2'}`

const buildMatch = (raw) => {
  const id = `rg-${raw.fmt === 'ATP' ? 'm' : 'w'}-${raw.idSlug}-2026-05-27`
  const market = marketByMatchId[id] ?? null
  const marketA = market?.players?.[raw.a] ?? null
  const marketB = market?.players?.[raw.b] ?? null
  const hasMarket = Number.isFinite(marketA?.pct) && Number.isFinite(marketB?.pct)
  const marketEconomics = buildMarketEconomics({ raw, market, marketA, marketB })
  const pickIndex = raw.pick === raw.a ? 0 : 1
  const participants = [
    participant(id, 0, 'Player 1', raw.a, raw.profileA),
    participant(id, 1, 'Player 2', raw.b, raw.profileB)
  ]
  const picked = participants[pickIndex]
  const opponent = participants[pickIndex === 0 ? 1 : 0]
  const dogNote = raw.vol >= 68 ? ' This is a watch-grade read unless the market price is generous enough to pay for the risk.' : ''
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
    `Swing factor: ${raw.swing}`,
    'May 26 lesson applied: high-probability favorites still need price discipline, and WTA volatility dogs need a stronger technical reason before becoming core plays.'
  ]
  const h2hUrl = buildTennistonicH2HUrl(raw.a, raw.b)

  return createSportsMatchModel(
    {
      id,
      eventId: raw.eventId,
      league: 'Tennis',
      start: raw.time,
      startMinutes: raw.min,
      title: `${raw.a} vs ${raw.b}`,
      stage: stage(raw),
      spotlight: raw.conf >= 73 || raw.tags.includes('Favorite'),
      confidence: raw.conf,
      volatility: raw.vol,
      tags: ['Clay', 'Roland Garros', ...raw.tags],
      matchup: [
        { side: 'Player 1', name: raw.a, displayName: raw.a, detail: raw.profileA },
        { side: 'Player 2', name: raw.b, displayName: raw.b, detail: raw.profileB }
      ],
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
          { name: raw.a, rank: raw.seedA, label: raw.a, form: null, boardPct: Number.isFinite(marketA?.pct) ? marketA.pct : null, decimalOdds: null, marketLabel: Number.isFinite(marketA?.pct) ? `Market ${formatPct(marketA.pct)}` : 'No market', clayLine: raw.profileA, record2026: '', notes: raw.noteA, matchupNote: raw.pick === raw.a ? `${raw.a} is the desk lean.` : `${raw.a} needs the upset script.` },
          { name: raw.b, rank: raw.seedB, label: raw.b, form: null, boardPct: Number.isFinite(marketB?.pct) ? marketB.pct : null, decimalOdds: null, marketLabel: Number.isFinite(marketB?.pct) ? `Market ${formatPct(marketB.pct)}` : 'No market', clayLine: raw.profileB, record2026: '', notes: raw.noteB, matchupNote: raw.pick === raw.b ? `${raw.b} is the desk lean.` : `${raw.b} needs the upset script.` }
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
          straightSetsProbability: Math.max(35, Math.min(72, Math.round(raw.conf - raw.vol * 0.16))),
          upsetRisk: Math.max(12, Math.min(52, Math.round(100 - raw.conf + raw.vol * 0.2))),
          overview: `${raw.pick} is projected on the cleaner Round 2 script, with volatility at ${raw.vol} because ${raw.swing}`,
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
          { label: 'ESPN scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260527' },
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
        rationale: hasMarket ? factors[1] : factors[2],
        confidence: raw.conf,
        volatility: raw.vol,
        recommendationScore: raw.recommendationScore,
        tier: raw.tier,
        sourceLabel: 'Editorial slate read',
        modelEdge: 0,
        modelEdgeLabel: 'Model-only read',
        marketProbability: hasMarket ? (raw.pick === raw.a ? marketA.pct / 100 : marketB.pct / 100) : null,
        marketProbabilityLabel: hasMarket ? formatPct(raw.pick === raw.a ? marketA.pct : marketB.pct) : 'Model only',
        inputs: [],
        inputsUsed: 0,
        volatilityNotes: raw.vol >= 68 ? [{ label: 'Volatility gate: watch-grade unless price pays enough.', delta: raw.vol - 60 }] : []
      }
    },
    oddsProvider
  )
}

const rawSingles = [
  {
    "eventId": "175536",
    "fmt": "WTA",
    "time": "4:30 AM PT",
    "min": 270,
    "court": "Court Philippe-Chatrier",
    "round": "Round 2",
    "a": "Elina Svitolina",
    "b": "Kaitlin Quevedo",
    "seedA": 7,
    "seedB": null,
    "pick": "Elina Svitolina",
    "conf": 78,
    "vol": 38,
    "tier": "Core",
    "tags": [
      "Women",
      "Favorite"
    ],
    "profileA": "Seed #7",
    "profileB": "Unseeded R2 profile",
    "noteA": "Elina Svitolina is the desk side, but price and volatility still matter.",
    "noteB": "Kaitlin Quevedo needs the upset script to show early.",
    "angle": "Svitolina owns the cleaner elite-clay baseline and return-pressure path against a lower-experience opponent.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "elina-svitolina-kaitlin-quevedo",
    "recommendationScore": 72
  },
  {
    "eventId": "175539",
    "fmt": "WTA",
    "time": "7:30 AM PT",
    "min": 450,
    "court": "Court 14",
    "round": "Round 2",
    "a": "Kamilla Rakhimova",
    "b": "Karolina Muchova",
    "seedA": null,
    "seedB": 10,
    "pick": "Karolina Muchova",
    "conf": 73,
    "vol": 44,
    "tier": "Core",
    "tags": [
      "Women",
      "Favorite"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Seed #10",
    "noteA": "Kamilla Rakhimova needs the upset script to show early.",
    "noteB": "Karolina Muchova is the desk side, but price and volatility still matter.",
    "angle": "Muchova has the more complete clay toolkit and better problem-solving lane if the match turns tactical.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "kamilla-rakhimova-karolina-muchova",
    "recommendationScore": 67
  },
  {
    "eventId": "175542",
    "fmt": "WTA",
    "time": "3:30 AM PT",
    "min": 210,
    "court": "Court 13",
    "round": "Round 2",
    "a": "Daria Snigur",
    "b": "Peyton Stearns",
    "seedA": null,
    "seedB": null,
    "pick": "Peyton Stearns",
    "conf": 57,
    "vol": 68,
    "tier": "Swingy",
    "tags": [
      "Women",
      "Volatile"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Unseeded R2 profile",
    "noteA": "Daria Snigur needs the upset script to show early.",
    "noteB": "Peyton Stearns is the desk side, but price and volatility still matter.",
    "angle": "Stearns has the bigger rally ceiling, but Snigur makes this a volatile WTA rhythm match.",
    "swing": "Treat as watch-grade unless market price leaves real payout room.",
    "idSlug": "daria-snigur-peyton-stearns",
    "recommendationScore": 48
  },
  {
    "eventId": "175545",
    "fmt": "WTA",
    "time": "2:00 AM PT",
    "min": 120,
    "court": "Court 7",
    "round": "Round 2",
    "a": "Tamara Korpatsch",
    "b": "Wang Xinyu",
    "seedA": null,
    "seedB": 32,
    "pick": "Wang Xinyu",
    "conf": 62,
    "vol": 61,
    "tier": "Lean",
    "tags": [
      "Women"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Seed #32",
    "noteA": "Tamara Korpatsch needs the upset script to show early.",
    "noteB": "Wang Xinyu is the desk side, but price and volatility still matter.",
    "angle": "Wang carries the stronger seed-level profile, but Korpatsch keeps enough clay resistance to cap confidence.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "tamara-korpatsch-wang-xinyu",
    "recommendationScore": 54
  },
  {
    "eventId": "175548",
    "fmt": "WTA",
    "time": "6:30 AM PT",
    "min": 390,
    "court": "Court 12",
    "round": "Round 2",
    "a": "Jil Teichmann",
    "b": "Magdalena Frech",
    "seedA": null,
    "seedB": null,
    "pick": "Magdalena Frech",
    "conf": 55,
    "vol": 68,
    "tier": "Swingy",
    "tags": [
      "Women",
      "Volatile"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Unseeded R2 profile",
    "noteA": "Jil Teichmann needs the upset script to show early.",
    "noteB": "Magdalena Frech is the desk side, but price and volatility still matter.",
    "angle": "Frech gets the steadier baseline lean in a match without a clean knockout edge.",
    "swing": "Treat as watch-grade unless market price leaves real payout room.",
    "idSlug": "jil-teichmann-magdalena-frech",
    "recommendationScore": 47
  },
  {
    "eventId": "175550",
    "fmt": "WTA",
    "time": "7:30 AM PT",
    "min": 450,
    "court": "Court Simonne-Mathieu",
    "round": "Round 2",
    "a": "Mirra Andreeva",
    "b": "Marina Bassols Ribera",
    "seedA": 8,
    "seedB": null,
    "pick": "Mirra Andreeva",
    "conf": 80,
    "vol": 35,
    "tier": "Core",
    "tags": [
      "Women",
      "Favorite"
    ],
    "profileA": "Seed #8",
    "profileB": "Unseeded R2 profile",
    "noteA": "Mirra Andreeva is the desk side, but price and volatility still matter.",
    "noteB": "Marina Bassols Ribera needs the upset script to show early.",
    "angle": "Andreeva has the clearest WTA class edge on the back half of the slate.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "mirra-andreeva-marina-bassols-ribera",
    "recommendationScore": 75
  },
  {
    "eventId": "175551",
    "fmt": "WTA",
    "time": "5:00 AM PT",
    "min": 300,
    "court": "Court 13",
    "round": "Round 2",
    "a": "Francesca Jones",
    "b": "Marie Bouzkova",
    "seedA": null,
    "seedB": 27,
    "pick": "Marie Bouzkova",
    "conf": 60,
    "vol": 64,
    "tier": "Lean",
    "tags": [
      "Women"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Seed #27",
    "noteA": "Francesca Jones needs the upset script to show early.",
    "noteB": "Marie Bouzkova is the desk side, but price and volatility still matter.",
    "angle": "Bouzkova is the steadier percentage player, but Jones has already shown upset bite this week.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "francesca-jones-marie-bouzkova",
    "recommendationScore": 52
  },
  {
    "eventId": "175555",
    "fmt": "WTA",
    "time": "2:00 AM PT",
    "min": 120,
    "court": "Court Simonne-Mathieu",
    "round": "Round 2",
    "a": "Catherine McNally",
    "b": "Belinda Bencic",
    "seedA": null,
    "seedB": 11,
    "pick": "Belinda Bencic",
    "conf": 68,
    "vol": 54,
    "tier": "Strong",
    "tags": [
      "Women"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Seed #11",
    "noteA": "Catherine McNally needs the upset script to show early.",
    "noteB": "Belinda Bencic is the desk side, but price and volatility still matter.",
    "angle": "Bencic has the higher repeatable floor if she keeps McNally from stealing short-point stretches.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "catherine-mcnally-belinda-bencic",
    "recommendationScore": 60
  },
  {
    "eventId": "175556",
    "fmt": "WTA",
    "time": "4:00 AM PT",
    "min": 240,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 2",
    "a": "Yuliia Starodubtseva",
    "b": "Elena Rybakina",
    "seedA": null,
    "seedB": 2,
    "pick": "Elena Rybakina",
    "conf": 81,
    "vol": 34,
    "tier": "Core",
    "tags": [
      "Women",
      "Favorite"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Seed #2",
    "noteA": "Yuliia Starodubtseva needs the upset script to show early.",
    "noteB": "Elena Rybakina is the desk side, but price and volatility still matter.",
    "angle": "Rybakina owns the serve-plus-first-strike gap and should not need a complicated clay script.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "yuliia-starodubtseva-elena-rybakina",
    "recommendationScore": 76
  },
  {
    "eventId": "175564",
    "fmt": "WTA",
    "time": "4:00 AM PT",
    "min": 240,
    "court": "Court 14",
    "round": "Round 2",
    "a": "Marta Kostyuk",
    "b": "Katie Volynets",
    "seedA": 15,
    "seedB": null,
    "pick": "Marta Kostyuk",
    "conf": 65,
    "vol": 57,
    "tier": "Strong",
    "tags": [
      "Women"
    ],
    "profileA": "Seed #15",
    "profileB": "Unseeded R2 profile",
    "noteA": "Marta Kostyuk is the desk side, but price and volatility still matter.",
    "noteB": "Katie Volynets needs the upset script to show early.",
    "angle": "Kostyuk has the better athletic baseline profile, though Volynets can stretch this if she extends points.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "marta-kostyuk-katie-volynets",
    "recommendationScore": 57
  },
  {
    "eventId": "175565",
    "fmt": "WTA",
    "time": "6:00 AM PT",
    "min": 360,
    "court": "Court 6",
    "round": "Round 2",
    "a": "Hailey Baptiste",
    "b": "Wang Xiyu",
    "seedA": 26,
    "seedB": null,
    "pick": "Hailey Baptiste",
    "conf": 56,
    "vol": 70,
    "tier": "Swingy",
    "tags": [
      "Women",
      "Volatile"
    ],
    "profileA": "Seed #26",
    "profileB": "Unseeded R2 profile",
    "noteA": "Hailey Baptiste is the desk side, but price and volatility still matter.",
    "noteB": "Wang Xiyu needs the upset script to show early.",
    "angle": "Baptiste has the seed/upside edge, but this is exactly the WTA band that needs restraint.",
    "swing": "Treat as watch-grade unless market price leaves real payout room.",
    "idSlug": "hailey-baptiste-wang-xiyu",
    "recommendationScore": 47
  },
  {
    "eventId": "175567",
    "fmt": "WTA",
    "time": "5:30 AM PT",
    "min": 330,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 2",
    "a": "Jasmine Paolini",
    "b": "Solana Sierra",
    "seedA": 13,
    "seedB": null,
    "pick": "Jasmine Paolini",
    "conf": 70,
    "vol": 50,
    "tier": "Strong",
    "tags": [
      "Women"
    ],
    "profileA": "Seed #13",
    "profileB": "Unseeded R2 profile",
    "noteA": "Jasmine Paolini is the desk side, but price and volatility still matter.",
    "noteB": "Solana Sierra needs the upset script to show early.",
    "angle": "Paolini has the stronger clay movement and pressure-tolerance profile.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "jasmine-paolini-solana-sierra",
    "recommendationScore": 63
  },
  {
    "eventId": "175570",
    "fmt": "WTA",
    "time": "7:30 AM PT",
    "min": 450,
    "court": "Court 6",
    "round": "Round 2",
    "a": "Eva Lys",
    "b": "Sorana Cirstea",
    "seedA": null,
    "seedB": 18,
    "pick": "Sorana Cirstea",
    "conf": 59,
    "vol": 66,
    "tier": "Lean",
    "tags": [
      "Women"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Seed #18",
    "noteA": "Eva Lys needs the upset script to show early.",
    "noteB": "Sorana Cirstea is the desk side, but price and volatility still matter.",
    "angle": "Cirstea gets the experience and ball-striking lean, but Lys has enough tempo disruption to keep it thin.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "eva-lys-sorana-cirstea",
    "recommendationScore": 50
  },
  {
    "eventId": "175571",
    "fmt": "WTA",
    "time": "3:00 AM PT",
    "min": 180,
    "court": "Court 12",
    "round": "Round 2",
    "a": "Viktorija Golubic",
    "b": "Alycia Parks",
    "seedA": null,
    "seedB": null,
    "pick": "Viktorija Golubic",
    "conf": 54,
    "vol": 72,
    "tier": "Swingy",
    "tags": [
      "Women",
      "Volatile"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Unseeded R2 profile",
    "noteA": "Viktorija Golubic is the desk side, but price and volatility still matter.",
    "noteB": "Alycia Parks needs the upset script to show early.",
    "angle": "Golubic is the clay-control side, but Parks can wreck the read if serve plus first ball lands.",
    "swing": "Treat as watch-grade unless market price leaves real payout room.",
    "idSlug": "viktorija-golubic-alycia-parks",
    "recommendationScore": 45
  },
  {
    "eventId": "175576",
    "fmt": "WTA",
    "time": "3:00 AM PT",
    "min": 180,
    "court": "Court Philippe-Chatrier",
    "round": "Round 2",
    "a": "Sara Bejlek",
    "b": "Iga Swiatek",
    "seedA": null,
    "seedB": 3,
    "pick": "Iga Swiatek",
    "conf": 84,
    "vol": 28,
    "tier": "Core",
    "tags": [
      "Women",
      "Favorite"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Seed #3",
    "noteA": "Sara Bejlek needs the upset script to show early.",
    "noteB": "Iga Swiatek is the desk side, but price and volatility still matter.",
    "angle": "Swiatek is the cleanest WTA favorite and owns every normal clay pattern.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "sara-bejlek-iga-swiatek",
    "recommendationScore": 80
  },
  {
    "eventId": "175579",
    "fmt": "WTA",
    "time": "3:30 AM PT",
    "min": 210,
    "court": "Court 7",
    "round": "Round 2",
    "a": "Jelena Ostapenko",
    "b": "Magda Linette",
    "seedA": 29,
    "seedB": null,
    "pick": "Magda Linette",
    "conf": 56,
    "vol": 71,
    "tier": "Swingy",
    "tags": [
      "Women",
      "Volatile"
    ],
    "profileA": "Seed #29",
    "profileB": "Unseeded R2 profile",
    "noteA": "Jelena Ostapenko needs the upset script to show early.",
    "noteB": "Magda Linette is the desk side, but price and volatility still matter.",
    "angle": "Linette gets the steadier clay-trust lean against Ostapenko volatility, but this is not a comfort pick.",
    "swing": "Treat as watch-grade unless market price leaves real payout room.",
    "idSlug": "jelena-ostapenko-magda-linette",
    "recommendationScore": 47
  },
  {
    "eventId": "175687",
    "fmt": "ATP",
    "time": "4:00 AM PT",
    "min": 240,
    "court": "Court 6",
    "round": "Round 2",
    "a": "Mariano Navone",
    "b": "Jakub Mensik",
    "seedA": null,
    "seedB": 26,
    "pick": "Jakub Mensik",
    "conf": 61,
    "vol": 63,
    "tier": "Lean",
    "tags": [
      "Men"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Seed #26",
    "noteA": "Mariano Navone needs the upset script to show early.",
    "noteB": "Jakub Mensik is the desk side, but price and volatility still matter.",
    "angle": "Mensik has the higher ceiling, while Navone clay craft keeps the favorite lane from getting too clean.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "mariano-navone-jakub-mensik",
    "recommendationScore": 53
  },
  {
    "eventId": "175698",
    "fmt": "ATP",
    "time": "7:00 AM PT",
    "min": 420,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 2",
    "a": "Casper Ruud",
    "b": "Hamad Medjedovic",
    "seedA": 15,
    "seedB": null,
    "pick": "Casper Ruud",
    "conf": 73,
    "vol": 45,
    "tier": "Core",
    "tags": [
      "Men",
      "Favorite"
    ],
    "profileA": "Seed #15",
    "profileB": "Unseeded R2 profile",
    "noteA": "Casper Ruud is the desk side, but price and volatility still matter.",
    "noteB": "Hamad Medjedovic needs the upset script to show early.",
    "angle": "Ruud has the Roland Garros clay structure and best-of-five stability edge.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "casper-ruud-hamad-medjedovic",
    "recommendationScore": 67
  },
  {
    "eventId": "175708",
    "fmt": "ATP",
    "time": "3:30 AM PT",
    "min": 210,
    "court": "Court Simonne-Mathieu",
    "round": "Round 2",
    "a": "Camilo Ugo Carabelli",
    "b": "Andrey Rublev",
    "seedA": null,
    "seedB": 11,
    "pick": "Andrey Rublev",
    "conf": 69,
    "vol": 55,
    "tier": "Strong",
    "tags": [
      "Men"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Seed #11",
    "noteA": "Camilo Ugo Carabelli needs the upset script to show early.",
    "noteB": "Andrey Rublev is the desk side, but price and volatility still matter.",
    "angle": "Rublev has the bigger offense and seed-level floor, but Ugo Carabelli is clay-native enough to resist.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "camilo-ugo-carabelli-andrey-rublev",
    "recommendationScore": 61
  },
  {
    "eventId": "175714",
    "fmt": "ATP",
    "time": "4:30 AM PT",
    "min": 270,
    "court": "Court 12",
    "round": "Round 2",
    "a": "Nuno Borges",
    "b": "Miomir Kecmanovic",
    "seedA": null,
    "seedB": null,
    "pick": "Miomir Kecmanovic",
    "conf": 56,
    "vol": 67,
    "tier": "Swingy",
    "tags": [
      "Men"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Unseeded R2 profile",
    "noteA": "Nuno Borges needs the upset script to show early.",
    "noteB": "Miomir Kecmanovic is the desk side, but price and volatility still matter.",
    "angle": "Kecmanovic gets the slightly cleaner ATP baseline read after Borges came through a high-variance upset lane.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "nuno-borges-miomir-kecmanovic",
    "recommendationScore": 48
  },
  {
    "eventId": "175719",
    "fmt": "ATP",
    "time": "6:30 AM PT",
    "min": 390,
    "court": "Court 13",
    "round": "Round 2",
    "a": "Nishesh Basavareddy",
    "b": "Alex Michelsen",
    "seedA": null,
    "seedB": null,
    "pick": "Alex Michelsen",
    "conf": 58,
    "vol": 66,
    "tier": "Lean",
    "tags": [
      "Men"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Unseeded R2 profile",
    "noteA": "Nishesh Basavareddy needs the upset script to show early.",
    "noteB": "Alex Michelsen is the desk side, but price and volatility still matter.",
    "angle": "Michelsen owns the higher tour-level ceiling, but Basavareddy keeps this in a young-player volatility pocket.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "nishesh-basavareddy-alex-michelsen",
    "recommendationScore": 50
  },
  {
    "eventId": "175725",
    "fmt": "ATP",
    "time": "5:00 AM PT",
    "min": 300,
    "court": "Court 7",
    "round": "Round 2",
    "a": "James Duckworth",
    "b": "Rafael Jodar",
    "seedA": null,
    "seedB": 27,
    "pick": "Rafael Jodar",
    "conf": 55,
    "vol": 72,
    "tier": "Swingy",
    "tags": [
      "Men",
      "Volatile"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Seed #27",
    "noteA": "James Duckworth needs the upset script to show early.",
    "noteB": "Rafael Jodar is the desk side, but price and volatility still matter.",
    "angle": "Jodar gets the upside lean, but Duckworth just punished a similar underdog-dismissal mistake.",
    "swing": "Treat as watch-grade unless market price leaves real payout room.",
    "idSlug": "james-duckworth-rafael-jodar",
    "recommendationScore": 46
  },
  {
    "eventId": "175731",
    "fmt": "ATP",
    "time": "6:00 AM PT",
    "min": 360,
    "court": "Court Philippe-Chatrier",
    "round": "Round 2",
    "a": "Valentin Royer",
    "b": "Novak Djokovic",
    "seedA": null,
    "seedB": 3,
    "pick": "Novak Djokovic",
    "conf": 82,
    "vol": 30,
    "tier": "Core",
    "tags": [
      "Men",
      "Favorite"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Seed #3",
    "noteA": "Valentin Royer needs the upset script to show early.",
    "noteB": "Novak Djokovic is the desk side, but price and volatility still matter.",
    "angle": "Djokovic has the best-of-five solving edge and should control every extended phase.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "valentin-royer-novak-djokovic",
    "recommendationScore": 78
  },
  {
    "eventId": "175733",
    "fmt": "ATP",
    "time": "7:00 AM PT",
    "min": 420,
    "court": "Court 7",
    "round": "Round 2",
    "a": "Lorenzo Sonego",
    "b": "Tommy Paul",
    "seedA": null,
    "seedB": 24,
    "pick": "Tommy Paul",
    "conf": 62,
    "vol": 60,
    "tier": "Lean",
    "tags": [
      "Men"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Seed #24",
    "noteA": "Lorenzo Sonego needs the upset script to show early.",
    "noteB": "Tommy Paul is the desk side, but price and volatility still matter.",
    "angle": "Paul has the broader athletic profile, though Sonego can make this uncomfortable with hold pressure.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "lorenzo-sonego-tommy-paul",
    "recommendationScore": 54
  },
  {
    "eventId": "175735",
    "fmt": "ATP",
    "time": "5:30 AM PT",
    "min": 330,
    "court": "Court 14",
    "round": "Round 2",
    "a": "Joao Fonseca",
    "b": "Dino Prizmic",
    "seedA": 28,
    "seedB": null,
    "pick": "Joao Fonseca",
    "conf": 66,
    "vol": 58,
    "tier": "Strong",
    "tags": [
      "Men"
    ],
    "profileA": "Seed #28",
    "profileB": "Unseeded R2 profile",
    "noteA": "Joao Fonseca is the desk side, but price and volatility still matter.",
    "noteB": "Dino Prizmic needs the upset script to show early.",
    "angle": "Fonseca has the cleaner current upside and heavier clay offense.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "joao-fonseca-dino-prizmic",
    "recommendationScore": 58
  },
  {
    "eventId": "175742",
    "fmt": "ATP",
    "time": "5:00 AM PT",
    "min": 300,
    "court": "Court 9",
    "round": "Round 2",
    "a": "Thanasi Kokkinakis",
    "b": "Pablo Carreno Busta",
    "seedA": null,
    "seedB": null,
    "pick": "Pablo Carreno Busta",
    "conf": 57,
    "vol": 68,
    "tier": "Swingy",
    "tags": [
      "Men",
      "Volatile"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Unseeded R2 profile",
    "noteA": "Thanasi Kokkinakis needs the upset script to show early.",
    "noteB": "Pablo Carreno Busta is the desk side, but price and volatility still matter.",
    "angle": "Carreno Busta gets the clay-pattern lean, but Kokkinakis can shorten enough points to flip it.",
    "swing": "Treat as watch-grade unless market price leaves real payout room.",
    "idSlug": "thanasi-kokkinakis-pablo-carreno-busta",
    "recommendationScore": 48
  },
  {
    "eventId": "175757",
    "fmt": "ATP",
    "time": "2:00 AM PT",
    "min": 120,
    "court": "Court 14",
    "round": "Round 2",
    "a": "Alejandro Davidovich Fokina",
    "b": "Thiago Agustin Tirante",
    "seedA": 21,
    "seedB": null,
    "pick": "Alejandro Davidovich Fokina",
    "conf": 68,
    "vol": 54,
    "tier": "Strong",
    "tags": [
      "Men"
    ],
    "profileA": "Seed #21",
    "profileB": "Unseeded R2 profile",
    "noteA": "Alejandro Davidovich Fokina is the desk side, but price and volatility still matter.",
    "noteB": "Thiago Agustin Tirante needs the upset script to show early.",
    "angle": "Davidovich Fokina has the better clay-athletic and return profile over five sets.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "alejandro-davidovich-fokina-thiago-agustin-tirante",
    "recommendationScore": 60
  },
  {
    "eventId": "175760",
    "fmt": "ATP",
    "time": "11:15 AM PT",
    "min": 675,
    "court": "Court Philippe-Chatrier",
    "round": "Round 2",
    "a": "Tomas Machac",
    "b": "Alexander Zverev",
    "seedA": null,
    "seedB": 2,
    "pick": "Alexander Zverev",
    "conf": 76,
    "vol": 42,
    "tier": "Core",
    "tags": [
      "Men",
      "Favorite"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Seed #2",
    "noteA": "Tomas Machac needs the upset script to show early.",
    "noteB": "Alexander Zverev is the desk side, but price and volatility still matter.",
    "angle": "Zverev has the serve/backhand stability and best-of-five floor, even against a dangerous Machac.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "tomas-machac-alexander-zverev",
    "recommendationScore": 70
  },
  {
    "eventId": "175763",
    "fmt": "ATP",
    "time": "5:30 AM PT",
    "min": 330,
    "court": "Court Simonne-Mathieu",
    "round": "Round 2",
    "a": "Ugo Humbert",
    "b": "Quentin Halys",
    "seedA": 32,
    "seedB": null,
    "pick": "Ugo Humbert",
    "conf": 58,
    "vol": 67,
    "tier": "Lean",
    "tags": [
      "Men"
    ],
    "profileA": "Seed #32",
    "profileB": "Unseeded R2 profile",
    "noteA": "Ugo Humbert is the desk side, but price and volatility still matter.",
    "noteB": "Quentin Halys needs the upset script to show early.",
    "angle": "Humbert gets the seed/serve lean, but Halys makes it price-sensitive and not a core clay read.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "ugo-humbert-quentin-halys",
    "recommendationScore": 49
  },
  {
    "eventId": "175765",
    "fmt": "ATP",
    "time": "2:00 AM PT",
    "min": 120,
    "court": "Court Suzanne-Lenglen",
    "round": "Round 2",
    "a": "Karen Khachanov",
    "b": "Marco Trungelliti",
    "seedA": 13,
    "seedB": null,
    "pick": "Karen Khachanov",
    "conf": 74,
    "vol": 43,
    "tier": "Core",
    "tags": [
      "Men",
      "Favorite"
    ],
    "profileA": "Seed #13",
    "profileB": "Unseeded R2 profile",
    "noteA": "Karen Khachanov is the desk side, but price and volatility still matter.",
    "noteB": "Marco Trungelliti needs the upset script to show early.",
    "angle": "Khachanov has the cleaner seeded ATP structure against Trungelliti.",
    "swing": "The favorite path holds if the first set does not turn into scoreboard stress.",
    "idSlug": "karen-khachanov-marco-trungelliti",
    "recommendationScore": 68
  },
  {
    "eventId": "175768",
    "fmt": "ATP",
    "time": "2:00 AM PT",
    "min": 120,
    "court": "Court 6",
    "round": "Round 2",
    "a": "Federico Cina",
    "b": "Jesper de Jong",
    "seedA": null,
    "seedB": null,
    "pick": "Jesper de Jong",
    "conf": 57,
    "vol": 69,
    "tier": "Swingy",
    "tags": [
      "Men",
      "Volatile"
    ],
    "profileA": "Unseeded R2 profile",
    "profileB": "Unseeded R2 profile",
    "noteA": "Federico Cina needs the upset script to show early.",
    "noteB": "Jesper de Jong is the desk side, but price and volatility still matter.",
    "angle": "De Jong gets the more mature clay-lane lean, but Cina has enough upside to keep it watch-grade.",
    "swing": "Treat as watch-grade unless market price leaves real payout room.",
    "idSlug": "federico-cina-jesper-de-jong",
    "recommendationScore": 48
  }
]

const market = (total, rows) => ({
  total,
  players: Object.fromEntries(rows.map(([name, amount, pct]) => [name, { amount, pct }]))
})

const marketByMatchId = {
  'rg-w-tamara-korpatsch-wang-xinyu-2026-05-27': market(8687, [
    ['Tamara Korpatsch', 2660, 49],
    ['Wang Xinyu', 6027, 52]
  ]),
  'rg-w-sara-bejlek-iga-swiatek-2026-05-27': market(26045, [
    ['Sara Bejlek', 11628, 6],
    ['Iga Swiatek', 14417, 95]
  ]),
  'rg-w-viktorija-golubic-alycia-parks-2026-05-27': market(5148, [
    ['Viktorija Golubic', 602, 51],
    ['Alycia Parks', 4546, 51]
  ]),
  'rg-w-daria-snigur-peyton-stearns-2026-05-27': market(4622, [
    ['Daria Snigur', 796, 35],
    ['Peyton Stearns', 3826, 67]
  ]),
  'rg-w-jelena-ostapenko-magda-linette-2026-05-27': market(3940, [
    ['Jelena Ostapenko', 1094, 78],
    ['Magda Linette', 2846, 23]
  ]),
  'rg-w-marta-kostyuk-katie-volynets-2026-05-27': market(8238, [
    ['Marta Kostyuk', 3460, 87],
    ['Katie Volynets', 4778, 14]
  ]),
  'rg-w-elina-svitolina-kaitlin-quevedo-2026-05-27': market(9997, [
    ['Elina Svitolina', 1950, 93],
    ['Kaitlin Quevedo', 8047, 9]
  ]),
  'rg-w-francesca-jones-marie-bouzkova-2026-05-27': market(2314, [
    ['Francesca Jones', 846, 24],
    ['Marie Bouzkova', 1468, 77]
  ]),
  'rg-w-jasmine-paolini-solana-sierra-2026-05-27': market(3862, [
    ['Jasmine Paolini', 3599, 64],
    ['Solana Sierra', 263, 36]
  ]),
  'rg-w-hailey-baptiste-wang-xiyu-2026-05-27': market(21125, [
    ['Hailey Baptiste', 12847, 67],
    ['Wang Xiyu', 8278, 33]
  ]),
  'rg-w-jil-teichmann-magdalena-frech-2026-05-27': market(2748, [
    ['Jil Teichmann', 2033, 41],
    ['Magdalena Frech', 715, 60]
  ]),
  'rg-w-mirra-andreeva-marina-bassols-ribera-2026-05-27': market(23128, [
    ['Mirra Andreeva', 11515, 95],
    ['Marina Bassols Ribera', 11613, 6]
  ]),
  'rg-w-kamilla-rakhimova-karolina-muchova-2026-05-27': market(5074, [
    ['Kamilla Rakhimova', 4498, 11],
    ['Karolina Muchova', 576, 90]
  ]),
  'rg-w-eva-lys-sorana-cirstea-2026-05-27': market(3282, [
    ['Eva Lys', 795, 22],
    ['Sorana Cirstea', 2487, 79]
  ]),
  'rg-m-karen-khachanov-marco-trungelliti-2026-05-27': market(48411, [
    ['Karen Khachanov', 33192, 77],
    ['Marco Trungelliti', 15219, 23]
  ]),
  'rg-m-alejandro-davidovich-fokina-thiago-agustin-tirante-2026-05-27': market(19119, [
    ['Alejandro Davidovich Fokina', 9636, 43],
    ['Thiago Agustin Tirante', 9483, 58]
  ]),
  'rg-m-federico-cina-jesper-de-jong-2026-05-27': market(12378, [
    ['Federico Cina', 2319, 41],
    ['Jesper de Jong', 10059, 59]
  ]),
  'rg-m-camilo-ugo-carabelli-andrey-rublev-2026-05-27': market(11613, [
    ['Camilo Ugo Carabelli', 1934, 23],
    ['Andrey Rublev', 9679, 78]
  ]),
  'rg-m-mariano-navone-jakub-mensik-2026-05-27': market(19037, [
    ['Mariano Navone', 13725, 48],
    ['Jakub Mensik', 5312, 53]
  ]),
  'rg-m-james-duckworth-rafael-jodar-2026-05-27': market(62865, [
    ['James Duckworth', 46310, 6],
    ['Rafael Jodar', 16555, 95]
  ]),
  'rg-m-nuno-borges-miomir-kecmanovic-2026-05-27': market(17930, [
    ['Nuno Borges', 2987, 39],
    ['Miomir Kecmanovic', 14943, 61]
  ]),
  'rg-m-thanasi-kokkinakis-pablo-carreno-busta-2026-05-27': market(13920, [
    ['Thanasi Kokkinakis', 1398, 30],
    ['Pablo Carreno Busta', 12522, 71]
  ]),
  'rg-m-joao-fonseca-dino-prizmic-2026-05-27': market(35557, [
    ['Joao Fonseca', 14860, 53],
    ['Dino Prizmic', 20697, 48]
  ]),
  'rg-m-ugo-humbert-quentin-halys-2026-05-27': market(4894, [
    ['Ugo Humbert', 3162, 59],
    ['Quentin Halys', 1732, 42]
  ]),
  'rg-m-valentin-royer-novak-djokovic-2026-05-27': market(58240, [
    ['Valentin Royer', 10601, 12],
    ['Novak Djokovic', 47639, 88]
  ]),
  'rg-m-nishesh-basavareddy-alex-michelsen-2026-05-27': market(15225, [
    ['Nishesh Basavareddy', 11677, 37],
    ['Alex Michelsen', 3548, 65]
  ]),
  'rg-m-lorenzo-sonego-tommy-paul-2026-05-27': market(19260, [
    ['Lorenzo Sonego', 5883, 16],
    ['Tommy Paul', 13377, 85]
  ]),
  'rg-m-casper-ruud-hamad-medjedovic-2026-05-27': market(14880, [
    ['Hamad Medjedovic', 2437, 31],
    ['Casper Ruud', 12443, 70]
  ]),
  'rg-m-tomas-machac-alexander-zverev-2026-05-27': market(35621, [
    ['Tomas Machac', 4726, 15],
    ['Alexander Zverev', 30895, 85]
  ])
}

const matches = rawSingles.map(buildMatch)

export const slateMeta = { date: 'May 27, 2026', isoDate: '2026-05-27' }
export const filters = ['All', 'Tennis']
export const oddsMeta = {
  provider: oddsProvider,
  snapshot: 'May 27, 2026 Roland Garros singles desk',
  note: 'Singles only. Doubles are intentionally excluded; Alex de Minaur vs Alexander Blockx is excluded because ESPN marks it as a walkover.'
}
export const sources = [
  { label: 'ESPN tennis scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260527' }
]

export const games = matches.sort((left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title))

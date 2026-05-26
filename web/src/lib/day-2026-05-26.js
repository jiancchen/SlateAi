import { createSportsMatchModel } from './sports-model.js'
import { buildTennistonicH2HUrl } from './tennis-source-mapping.js'
import tennisClayContext from './day-2026-05-26-tennis-clay-context.generated.json' with { type: 'json' }
import tennisOpponentQualityContext from './day-2026-05-26-tennis-opponent-quality.generated.json' with { type: 'json' }

const oddsProvider = 'Roland Garros desk board'

const buildPredictionOnlyOdds = () => ({
  participantOrder: [0, 1],
  markets: [],
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
      odds: buildPredictionOnlyOdds(),
      tennisContext: {
        surface: 'Clay',
        court: raw.court,
        h2hLeader: '',
        fatigueFlag: false,
        liveDog: raw.conf < 60,
        players: [
          { name: raw.a, rank: null, label: raw.a, form: null, boardPct: null, decimalOdds: null, marketLabel: 'Desk only', clayLine: raw.profileA, record2026: '', notes: raw.noteA, matchupNote: raw.pick === raw.a ? `${raw.a} is the desk lean.` : `${raw.a} needs the upset script.` },
          { name: raw.b, rank: null, label: raw.b, form: null, boardPct: null, decimalOdds: null, marketLabel: 'Desk only', clayLine: raw.profileB, record2026: '', notes: raw.noteB, matchupNote: raw.pick === raw.b ? `${raw.b} is the desk lean.` : `${raw.b} needs the upset script.` }
        ],
        comparisonRows: [
          { label: 'Desk lean', metric: 'Confidence split', leftScore: raw.pick === raw.a ? raw.conf : 100 - raw.conf, rightScore: raw.pick === raw.b ? raw.conf : 100 - raw.conf, leftLabel: raw.a, rightLabel: raw.b, winner: raw.pick },
          { label: 'Volatility', metric: 'Lower chaos side', leftScore: raw.pick === raw.a ? 100 - raw.vol : raw.vol, rightScore: raw.pick === raw.b ? 100 - raw.vol : raw.vol, leftLabel: raw.a, rightLabel: raw.b, winner: raw.pick }
        ],
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
        tradePlan: null,
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
        marketProbability: null,
        marketProbabilityLabel: 'N/A',
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
    "conf": 63,
    "vol": 64,
    "tags": [
      "Women"
    ],
    "profileA": "Clay-craft disruptor",
    "profileB": "Higher ceiling favorite",
    "noteA": "Siegemund has the craft to make Osaka uncomfortable, especially if she varies height and tempo.",
    "noteB": "Osaka still has the bigger serve and ball-striking ceiling, and that should be enough if the error count stays reasonable.",
    "angle": "Osaka gets the lean because the weapons ceiling is real, but Siegemund’s clay craft prevents this from being a simple favorite stamp",
    "swing": "If Siegemund drags Osaka into drop-shot and shape management, this can get ugly fast.",
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
    "pick": "Diane Parry",
    "conf": 58,
    "vol": 70,
    "tags": [
      "Women",
      "Volatile"
    ],
    "profileA": "Cleaner baseline if settled",
    "profileB": "Home-clay shape edge",
    "noteA": "Kalinina is dangerous if she controls neutral rallies and prevents Parry from changing tempo.",
    "noteB": "Parry has the crowd, variety, and clay-specific disruption to make this a complicated opener.",
    "angle": "Parry gets the narrow home-clay lean because the variety and crowd can matter in a match without a clean favorite lane",
    "swing": "If Kalinina keeps this linear and controls depth, Parry’s variety can become decorative instead of decisive.",
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
    "conf": 59,
    "vol": 68,
    "tags": [
      "Women",
      "Volatile"
    ],
    "profileA": "Young upside lane",
    "profileB": "Clay-seasoned counter",
    "noteA": "Korneeva has the talent to make this noisy, especially if she takes time away early.",
    "noteB": "Cocciaretto is the steadier clay operator and should ask more reliable questions over a full match.",
    "angle": "Cocciaretto gets the lean because her clay point construction is easier to trust against a younger volatility profile",
    "swing": "If Korneeva starts fast and hits through the court, the desk side gets fragile.",
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
    "pick": "Katerina Siniakova",
    "conf": 62,
    "vol": 61,
    "tags": [
      "Women"
    ],
    "profileA": "Needs first-strike control",
    "profileB": "Variety and doubles-hardened hands",
    "noteA": "Waltert needs to keep Siniakova from turning points into awkward all-court problems.",
    "noteB": "Siniakova has the variety, court sense, and clay adaptability to solve a messy opener.",
    "angle": "Siniakova has the more complete clay-toolbox read if this turns into a problem-solving match",
    "swing": "If Waltert keeps the ball deep and takes away Siniakova’s variety, the favorite path narrows.",
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
    "pick": "Tallon Griekspoor",
    "conf": 60,
    "vol": 64,
    "tags": [
      "Men",
      "Volatile"
    ],
    "profileA": "Seeded serve-plus-one",
    "profileB": "Clay grinder pressure",
    "noteA": "Griekspoor has the seed and first-strike lane, but this is not a pristine clay mismatch.",
    "noteB": "Arnaldi can absolutely make this physical and test Griekspoor’s patience over five sets.",
    "angle": "Griekspoor gets a modest ATP lean on serve-plus-one stability, but Arnaldi’s clay tolerance keeps this in the swingy band",
    "swing": "If Arnaldi extends rallies and wins the legs battle, the seeded edge can leak.",
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
    "pick": "Martin Landaluce",
    "conf": 57,
    "vol": 70,
    "tags": [
      "Men",
      "Volatile"
    ],
    "profileA": "Higher prospect ceiling",
    "profileB": "Clay-dog pressure",
    "noteA": "Landaluce has the higher ceiling and should be slightly more trustworthy if he controls the forehand patterns.",
    "noteB": "Prado Angelo can flip this by making it a dirtball patience test and stretching the match physically.",
    "angle": "Landaluce is a small upside lean, but this is too thin to treat like a clean ATP favorite",
    "swing": "If Prado Angelo wins the long exchanges early, the projection moves toward even.",
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
    "pick": "Cameron Norrie",
    "conf": 69,
    "vol": 48,
    "tags": [
      "Men"
    ],
    "profileA": "Best-of-five grinder edge",
    "profileB": "Needs breakthrough level",
    "noteA": "Norrie’s lefty patterns, fitness, and five-set tolerance are strong assets against a younger opponent.",
    "noteB": "Vallejo needs to hit through the structure early before Norrie turns this into attrition.",
    "angle": "Norrie has the better five-set clay problem-solving and fitness profile",
    "swing": "If Vallejo lands enough first-strike forehands and avoids long neutral rallies, the upset lane opens.",
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
    "pick": "Corentin Moutet",
    "conf": 63,
    "vol": 66,
    "tags": [
      "Men",
      "Volatile"
    ],
    "profileA": "Steady clay grinder",
    "profileB": "French disruption edge",
    "noteA": "Kopriva is dangerous if he stays emotionally flat and keeps the match in repeatable clay patterns.",
    "noteB": "Moutet gets the crowd, variety, and lefty disruption, but that also brings volatility.",
    "angle": "Moutet gets the home-clay disruption lean, though it is not clean enough for a core tag",
    "swing": "If Kopriva neutralizes the crowd and makes Moutet play disciplined tennis, this can flip.",
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
    "pick": "Sebastian Baez",
    "conf": 68,
    "vol": 50,
    "tags": [
      "Men"
    ],
    "profileA": "Clay specialist favorite",
    "profileB": "Needs physical upset",
    "noteA": "Baez is the more proven clay engine and should be comfortable in the exact rally shape this match invites.",
    "noteB": "Burruchaga needs to outlast the specialist and create enough depth pressure to avoid being moved side to side.",
    "angle": "Baez has the cleaner clay-specialist profile and should win the physical baseline script",
    "swing": "If Burruchaga keeps Baez from owning court position, the match can stretch.",
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

const matches = rawSingles.map(buildMatch)

export const slateMeta = { date: 'May 26, 2026', isoDate: '2026-05-26' }
export const filters = ['All', 'Tennis']
export const oddsMeta = {
  provider: oddsProvider,
  snapshot: 'May 26, 2026 Roland Garros singles desk',
  note: 'Singles only. Doubles from the ESPN slate are intentionally excluded from predictions.'
}
export const sources = [
  { label: 'ESPN tennis scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/20260526' },
  { label: 'Roland Garros order of play', url: 'https://www.rolandgarros.com/en-us/order-of-play?annexeCourt=all&competition=all&country=all&date=2026-05-26&favoriteFilter=false&principalCourt=all&year=2026' }
]

export const games = matches.sort((left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title))

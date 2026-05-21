import { createSportsMatchModel } from './sports-model.js'

const oddsProvider = 'Official order of play + TennisStats H2H board'

const market = (label, book, value) => ({ label, book, value })

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
  const awayAmerican = decimalToAmerican(playerA.decimalOdds)
  const homeAmerican = decimalToAmerican(playerB.decimalOdds)

  if (!Number.isFinite(awayAmerican) || !Number.isFinite(homeAmerican)) return ''

  return `${formatAmericanOdds(awayAmerican)} / ${formatAmericanOdds(homeAmerican)}`
}

const makeTennisOdds = (playerA, playerB, provider = oddsProvider) => {
  const moneyline = buildMoneylineValue(playerA, playerB)

  return {
    participantOrder: [0, 1],
    markets: moneyline ? [market('Moneyline', provider, moneyline)] : [],
    note:
      'Clay-only tennis board using official order of play plus TennisStats moneylines when available. Read the pick together with form, H2H, fatigue, and surface fit.',
    provider
  }
}

const playerDetail = (player) => {
  const parts = [`Rank ${player.rank}`]
  if (Number.isFinite(player.form)) parts.push(`Form ${player.form}`)
  if (Number.isFinite(player.elo)) parts.push(`Elo ${player.elo}`)
  if (player.seed) parts.push(`Seed ${player.seed}`)
  if (player.record2026) parts.push(player.record2026)
  return parts.join(' | ')
}

const buildSummary = ({ pick, opponent, event, round, angle }) =>
  `${pick.name} gets the lean in ${event} ${round} because the clay-week profile is steadier: form ${pick.form ?? 'n/a'} vs ${opponent.form ?? 'n/a'}, rank ${pick.rank} vs ${opponent.rank}, and ${angle}.`

const buildFactors = ({ playerA, playerB, pick, opponent, h2h, fatigue, angle, extraFactors = [] }) => {
  const factors = [
    `TennisStats form board: ${playerA.name} ${playerA.form ?? 'n/a'} vs ${playerB.name} ${playerB.form ?? 'n/a'} on a full-clay slate.`,
    `${pick.name} carries the stronger pre-match path on ranking / market shape: rank ${pick.rank} vs ${opponent.rank}${Number.isFinite(pick.decimalOdds) ? `, price ${pick.decimalOdds.toFixed(2)}` : ''}.`,
    h2h
      ? `${h2h.leader} ${h2h.record} in the visible head-to-head sample, which matters more here because both players are seeing a slower clay script.`
      : 'No strong accessible H2H edge surfaced, so the read leans more heavily on current form, clay fit, and weekly workload.'
  ]

  if (fatigue) factors.push(fatigue)
  return [...factors, ...extraFactors]
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
  h2h = null,
  fatigue = '',
  tags = [],
  spotlight = false,
  extraFactors = [],
  sourceLabel = oddsProvider
}) => {
  const pick = pickName === playerA.name ? playerA : playerB
  const opponent = pickName === playerA.name ? playerB : playerA
  const isDog = Number.isFinite(pick.decimalOdds) && Number.isFinite(opponent.decimalOdds)
    ? pick.decimalOdds > opponent.decimalOdds
    : false

  return createSportsMatchModel(
    {
      id,
      league: 'Tennis',
      start,
      startMinutes,
      title: `${playerA.name} vs ${playerB.name}`,
      stage: `${event} | ${stage || round}`,
      spotlight,
      confidence,
      volatility,
      tags: ['Clay', ...tags],
      matchup: [
        {
          side: 'Player 1',
          name: playerA.name,
          detail: playerDetail(playerA)
        },
        {
          side: 'Player 2',
          name: playerB.name,
          detail: playerDetail(playerB)
        }
      ],
      summary: buildSummary({ pick, opponent, event, round, angle }),
      factors: buildFactors({ playerA, playerB, pick, opponent, h2h, fatigue, angle, extraFactors }),
      lean: `Lean ${pick.name} because ${angle}.`,
      swing,
      odds: makeTennisOdds(playerA, playerB, sourceLabel),
      tennisContext: {
        surface: 'Clay',
        h2hLeader: h2h?.leader || '',
        fatigueFlag: Boolean(fatigue),
        liveDog: isDog,
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
        `${pick.name} is the cleaner pre-match side because the combination of form, clay fit, and current board shape lands better than it does for ${opponent.name}.`,
        fatigue
          ? fatigue
          : 'No fresh injury flag surfaced on the accessible pre-match sources for this pass, so the risk read is coming more from surface fit and recent match load than from explicit health news.',
        h2h
          ? `${h2h.leader} ${h2h.record} in the visible H2H sample, which matters more here because these points should be long and clay-driven.`
          : 'With no strong H2H edge exposed, this is more about who is arriving in the better clay rhythm today.',
        swing
      ]
    },
    sourceLabel
  )
}

const matches = [
  makeTennisMatch({
    id: 'strasbourg-bouzkova-li-2026-05-21',
    event: 'WTA Strasbourg',
    round: 'Quarterfinal',
    stage: 'Thursday quarterfinal board',
    start: '1:30 AM PT',
    startMinutes: 90,
    playerA: { name: 'Marie Bouzkova', rank: 27, form: 52, decimalOdds: 1.8, record2026: 'Steadier clay reset' },
    playerB: { name: 'Ann Li', rank: 30, form: 50, decimalOdds: 2.0, record2026: 'Live flat-hitting dog' },
    pickName: 'Marie Bouzkova',
    confidence: 63,
    volatility: 53,
    angle: 'the Bouzkova clay floor is steadier and the visible H2H edge is already 3-0',
    swing:
      'Swing factor: whether Li can keep first-strike pace high enough to stop Bouzkova from dragging the match into a longer clay exchange pattern.',
    h2h: { leader: 'Marie Bouzkova', record: 'leads 3-0' },
    tags: ['H2H edge', 'Clay floor']
  }),
  makeTennisMatch({
    id: 'strasbourg-cristian-kasatkina-2026-05-21',
    event: 'WTA Strasbourg',
    round: 'Quarterfinal',
    stage: 'Thursday quarterfinal board',
    start: '3:00 AM PT',
    startMinutes: 180,
    playerA: { name: 'Jaqueline Cristian', rank: 33, form: 54, decimalOdds: 2.3, record2026: 'Aggressive clay-week form' },
    playerB: { name: 'Daria Kasatkina', rank: 62, form: 62, decimalOdds: 1.62, elo: 2715, record2026: '13-8 season line' },
    pickName: 'Daria Kasatkina',
    confidence: 61,
    volatility: 62,
    angle: 'Kasatkina is still the cleaner clay problem-solver when the points get long, even though the rank line alone looks noisy',
    swing:
      'Swing factor: whether Cristian can finish enough forehand drives early before Kasatkina turns the match into a slower, shape-changing clay puzzle.',
    h2h: { leader: 'Series', record: 'is level 2-2' },
    tags: ['Shape match', 'Long-rally edge']
  }),
  makeTennisMatch({
    id: 'strasbourg-zhang-navarro-2026-05-21',
    event: 'WTA Strasbourg',
    round: 'Quarterfinal',
    stage: 'Thursday quarterfinal board',
    start: '4:30 AM PT',
    startMinutes: 270,
    playerA: { name: 'Shuai Zhang', rank: 74, form: 42, decimalOdds: 3.0, record2026: 'Veteran counterpuncher' },
    playerB: { name: 'Emma Navarro', rank: 39, form: 33, decimalOdds: 1.4, elo: 2557, record2026: 'Market favorite, form soft' },
    pickName: 'Shuai Zhang',
    confidence: 55,
    volatility: 77,
    angle: 'Navarro is the paper favorite, but Zhang has the cleaner visible H2H pattern and the volatility is high enough to treat this as a live dog spot',
    swing:
      'Swing factor: whether Navarro can hold up physically and impose first-strike offense before Zhang turns the match into a change-of-pace clay grinder.',
    h2h: { leader: 'Shuai Zhang', record: 'leads 3-0' },
    tags: ['Dog live', 'H2H edge', 'Volatile']
  }),
  makeTennisMatch({
    id: 'strasbourg-mboko-fernandez-2026-05-21',
    event: 'WTA Strasbourg',
    round: 'Quarterfinal',
    stage: 'Thursday quarterfinal board',
    start: '8:30 AM PT',
    startMinutes: 510,
    playerA: { name: 'Victoria Mboko', rank: 9, form: 76, decimalOdds: 1.62, elo: 3395, record2026: 'Fast-rising clay pressure' },
    playerB: { name: 'Leylah Fernandez', rank: 24, form: 48, decimalOdds: 2.3, record2026: 'Counterpunch live, but wave weaker' },
    pickName: 'Victoria Mboko',
    confidence: 68,
    volatility: 49,
    angle: 'Mboko owns the sharper current form, stronger Elo profile, and the more explosive baseline pressure for this clay quarterfinal',
    swing:
      'Swing factor: whether Fernandez can keep return depth high enough to force Mboko to hit one more ball instead of letting the favorite dictate with first-strike power.',
    h2h: { leader: 'Victoria Mboko', record: 'leads 1-0' },
    tags: ['Core read', 'Carry form'],
    spotlight: true
  }),
  makeTennisMatch({
    id: 'hamburg-buse-humbert-2026-05-21',
    event: 'ATP Hamburg',
    round: 'Quarterfinal',
    stage: 'Thursday quarterfinal board',
    start: '3:00 AM PT',
    startMinutes: 180,
    playerA: { name: 'Ignacio Buse', rank: 57, form: 57, decimalOdds: 1.57, record2026: 'Clay-week surge' },
    playerB: { name: 'Ugo Humbert', rank: 34, form: 54, decimalOdds: 2.38, record2026: 'Bigger name, less clay comfort' },
    pickName: 'Ignacio Buse',
    confidence: 60,
    volatility: 68,
    angle: 'Buse has the stronger clay-week form and is the deserved market favorite even though Humbert still owns the bigger overall ranking profile',
    swing:
      'Swing factor: whether Humbert can flatten points quickly enough to stop Buse from extending rallies and turning this into a pure clay grind.',
    tags: ['Clay edge', 'Favorite but fragile']
  }),
  makeTennisMatch({
    id: 'hamburg-paul-altmaier-2026-05-21',
    event: 'ATP Hamburg',
    round: 'Quarterfinal',
    stage: 'Thursday quarterfinal board',
    start: '4:30 AM PT',
    startMinutes: 270,
    playerA: { name: 'Tommy Paul', rank: 26, form: 69, decimalOdds: 1.4, elo: 1625, record2026: '16-9 season line' },
    playerB: { name: 'Daniel Altmaier', rank: 65, form: 42, decimalOdds: 3.0, record2026: 'Clay spoiler path' },
    pickName: 'Tommy Paul',
    confidence: 74,
    volatility: 48,
    angle: 'Paul is carrying the better current form, the cleaner ranking gap, and the steadier clay-week control profile into this quarterfinal',
    swing:
      'Swing factor: whether Altmaier can stretch enough return games to drag Paul into the kind of long clay night where favorite control starts to leak.',
    h2h: { leader: 'Tommy Paul', record: 'leads 1-0' },
    tags: ['Core read', 'Form edge'],
    spotlight: true
  }),
  makeTennisMatch({
    id: 'hamburg-kovacevic-carabelli-2026-05-21',
    event: 'ATP Hamburg',
    round: 'Quarterfinal',
    stage: 'Thursday quarterfinal board',
    start: '6:00 AM PT',
    startMinutes: 360,
    playerA: { name: 'Aleksandar Kovacevic', rank: 94, form: 43, decimalOdds: 2.6, record2026: 'Live first-strike dog' },
    playerB: { name: 'Camilo Ugo Carabelli', rank: 68, form: 55, decimalOdds: 1.5, record2026: 'Clay grinder profile' },
    pickName: 'Camilo Ugo Carabelli',
    confidence: 62,
    volatility: 57,
    angle: 'Ugo Carabelli arrives with the stronger clay-week form and the more repeatable rally tolerance for a slower Hamburg script',
    swing:
      'Swing factor: whether Kovacevic can keep enough free points flowing on serve to stop this from becoming a long, attritional clay match.',
    tags: ['Clay grinder', 'Watchdog live']
  }),
  makeTennisMatch({
    id: 'hamburg-darderi-deminuar-2026-05-21',
    event: 'ATP Hamburg',
    round: 'Quarterfinal',
    stage: 'Thursday quarterfinal board',
    start: '9:00 AM PT',
    startMinutes: 540,
    playerA: { name: 'Luciano Darderi', rank: 16, form: 63, decimalOdds: 2.1, record2026: 'Live clay hitter' },
    playerB: { name: 'Alex de Minaur', rank: 9, form: 65, decimalOdds: 1.73, elo: 3665, record2026: 'Top-end floor intact' },
    pickName: 'Alex de Minaur',
    confidence: 64,
    volatility: 54,
    angle: 'De Minaur still owns the better overall floor and should win more of the extended movement patterns if this quarterfinal stays clean physically',
    swing:
      'Swing factor: whether Darderi can keep front-foot aggression high enough to stop de Minaur from turning neutral balls into long defensive exchanges.',
    tags: ['Top-10 floor', 'Clay pressure']
  }),
  makeTennisMatch({
    id: 'geneva-navone-munar-2026-05-21',
    event: 'ATP Geneva',
    round: 'Quarterfinal',
    stage: 'Thursday quarterfinal board',
    start: '4:00 AM PT',
    startMinutes: 240,
    playerA: { name: 'Mariano Navone', rank: 42, form: 60, decimalOdds: 1.8, record2026: 'Clay-week control live' },
    playerB: { name: 'Jaume Munar', rank: 39, form: 56, decimalOdds: 2.0, record2026: 'Another grinder, very close match' },
    pickName: 'Mariano Navone',
    confidence: 57,
    volatility: 70,
    angle: 'the clay-specific form edge tilts to Navone, but this is still one of the tighter attritional matches on the whole board',
    swing:
      'Swing factor: whether Munar can make this ugly enough on return to force Navone into a pure break-trade instead of a cleaner top-of-rally pattern.',
    tags: ['Grinder war', 'High variance']
  }),
  makeTennisMatch({
    id: 'geneva-popyrin-ruud-2026-05-21',
    event: 'ATP Geneva',
    round: 'Quarterfinal',
    stage: 'Thursday quarterfinal board',
    start: '5:30 AM PT',
    startMinutes: 330,
    playerA: { name: 'Alexei Popyrin', rank: 61, form: 40, decimalOdds: 3.4, record2026: 'Power dog on clay' },
    playerB: { name: 'Casper Ruud', rank: 17, form: 65, decimalOdds: 1.33, elo: 2185, record2026: 'Clay trust profile' },
    pickName: 'Casper Ruud',
    confidence: 75,
    volatility: 44,
    angle: 'Ruud is still one of the cleaner clay reads on the board because the ranking gap, form gap, and surface comfort all lean his way at once',
    swing:
      'Swing factor: whether Popyrin can keep first-strike serve patterns hot enough to shorten the match before Ruud grinds him into longer clay points.',
    h2h: { leader: 'Series', record: 'is level 1-1' },
    tags: ['Core read', 'Clay specialist'],
    spotlight: true
  }),
  makeTennisMatch({
    id: 'geneva-michelsen-tien-2026-05-21',
    event: 'ATP Geneva',
    round: 'Quarterfinal',
    stage: 'Thursday quarterfinal board',
    start: '9:00 AM PT',
    startMinutes: 540,
    playerA: { name: 'Alex Michelsen', rank: 41, form: 58, record2026: 'Big first-strike upside' },
    playerB: { name: 'Learner Tien', rank: 20, form: 62, record2026: 'Cleaner all-court growth' },
    pickName: 'Learner Tien',
    confidence: 58,
    volatility: 76,
    angle: 'Tien carries the better form and ranking line, but with no clean accessible market snapshot this still reads as a volatile growth-match rather than a core side',
    swing:
      'Swing factor: whether Michelsen can keep the court short and stop Tien from dragging the match into a fuller clay chess match.',
    h2h: { leader: 'Learner Tien', record: 'leads 3-1' },
    tags: ['No live price', 'Growth match', 'Volatile']
  }),
  makeTennisMatch({
    id: 'geneva-rinderknech-bublik-2026-05-21',
    event: 'ATP Geneva',
    round: 'Quarterfinal',
    stage: 'Thursday quarterfinal board',
    start: '10:30 AM PT',
    startMinutes: 630,
    playerA: { name: 'Arthur Rinderknech', rank: 24, form: 40, decimalOdds: 2.2, record2026: 'Live serve-first dog' },
    playerB: { name: 'Alexander Bublik', rank: 10, form: 63, decimalOdds: 1.67, elo: 3230, record2026: 'Bigger ceiling, bigger mood swings' },
    pickName: 'Arthur Rinderknech',
    confidence: 56,
    volatility: 79,
    angle: 'Bublik still grades better overall, but the H2H sample and volatility shape make Rinderknech the more interesting live-dog play if the match tilts serve-heavy',
    swing:
      'Swing factor: whether Bublik stays patient enough on clay to keep the match from turning into a one-break swing on a few short service games.',
    h2h: { leader: 'Arthur Rinderknech', record: 'leads 2-1' },
    tags: ['Dog live', 'Serve variance', 'Volatile']
  }),
  makeTennisMatch({
    id: 'rgq-romero-stephens-2026-05-21',
    event: 'French Open Qualifying',
    round: 'Third round',
    stage: 'Thursday qualifying board',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Leyre Romero Gormaz', rank: 159, record2026: 'Younger clay legs' },
    playerB: { name: 'Sloane Stephens', rank: 361, record2026: 'Name value, but ranking slide' },
    pickName: 'Leyre Romero Gormaz',
    confidence: 57,
    volatility: 74,
    angle: 'the current ranking and cleaner qualifying-week trajectory both lean to Romero Gormaz even though Stephens still carries the bigger historical name',
    swing:
      'Swing factor: whether Stephens can find one more big-serving patch before the younger legs and current ranking reality reassert themselves.',
    fatigue:
      'Qualifying-round fatigue matters here because both players are on the third straight clay-win-or-go-home day, and that usually compresses the late-match edge.',
    tags: ['Qualifying fatigue', 'Name-vs-form']
  }),
  makeTennisMatch({
    id: 'rgq-svrcina-faurel-2026-05-21',
    event: 'French Open Qualifying',
    round: 'Third round',
    stage: 'Thursday qualifying board',
    start: '4:30 AM PT',
    startMinutes: 270,
    playerA: { name: 'Dalibor Svrcina', rank: 111, seed: 8, record2026: 'Seeded qualifier path' },
    playerB: { name: 'Thomas Faurel', rank: 382, record2026: 'Home underdog, big ranking gap' },
    pickName: 'Dalibor Svrcina',
    confidence: 69,
    volatility: 50,
    angle: 'Svrcina owns the much stronger current ranking line and seeded qualifying profile, which is enough to make this one of the cleaner Roland-Garros qualifying reads',
    swing:
      'Swing factor: whether Faurel can use home-crowd energy to keep the match emotionally volatile long enough to pressure the favorite.',
    fatigue:
      'Both players are on a third straight qualifying day, but the seeded player still has the stronger baseline if the match becomes a pure clay attrition test.',
    tags: ['Qualifying favorite', 'Ranking gap']
  }),
  makeTennisMatch({
    id: 'rgq-faria-neumayer-2026-05-21',
    event: 'French Open Qualifying',
    round: 'Third round',
    stage: 'Thursday qualifying board',
    start: '7:00 AM PT',
    startMinutes: 420,
    playerA: { name: 'Jaime Faria', rank: 117, seed: 10, record2026: 'Seeded clay-week edge' },
    playerB: { name: 'Lukas Neumayer', rank: 188, record2026: 'Live dog, thinner floor' },
    pickName: 'Jaime Faria',
    confidence: 60,
    volatility: 63,
    angle: 'Faria gets the lean because the ranking, seed line, and current qualifying path are cleaner, even if the match still looks grindy',
    swing:
      'Swing factor: whether Neumayer can lengthen enough return games to make this a break-trade match instead of a controlled seeded-player win path.',
    fatigue: 'Third-round qualifying load adds endurance variance to every long deuce game here.',
    tags: ['Qualifying fatigue']
  }),
  makeTennisMatch({
    id: 'rgq-kraus-friedsam-2026-05-21',
    event: 'French Open Qualifying',
    round: 'Third round',
    stage: 'Thursday qualifying board',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Sinja Kraus', rank: 101, seed: 2, record2026: 'Top-seeded qualifying path' },
    playerB: { name: 'Anna-Lena Friedsam', rank: 213, record2026: 'Veteran spoiler route' },
    pickName: 'Sinja Kraus',
    confidence: 62,
    volatility: 60,
    angle: 'Kraus brings the better rank, seed, and current qualifying path into a match where Friedsam still needs to outperform the baseline numbers',
    swing:
      'Swing factor: whether Friedsam can use experience to keep the scoreline compressed long enough to stress the favorite on serve late.',
    fatigue: 'Third-round qualifying means the cleaner legs and recovery matter almost as much as the raw pre-match rating.',
    tags: ['Qualifying favorite']
  }),
  makeTennisMatch({
    id: 'rgq-samuel-bueno-2026-05-21',
    event: 'French Open Qualifying',
    round: 'Third round',
    stage: 'Thursday qualifying board',
    start: '4:30 AM PT',
    startMinutes: 270,
    playerA: { name: 'Toby Samuel', rank: 159, record2026: 'Tight ranking battle' },
    playerB: { name: 'Gonzalo Bueno', rank: 185, record2026: 'Clay-dog route' },
    pickName: 'Gonzalo Bueno',
    confidence: 58,
    volatility: 70,
    angle: 'Bueno is the thinner dog lean because the clay-specific grind path looks a little stronger than the pure ranking line suggests',
    swing:
      'Swing factor: whether Samuel can keep enough free points flowing on serve to avoid giving Bueno a full clay-rally canvas.',
    fatigue: 'Third-round qualifying wear makes this one easier to flip than the raw ranking gap implies.',
    tags: ['Dog live', 'Qualifying fatigue']
  }),
  makeTennisMatch({
    id: 'rgq-wong-prado-2026-05-21',
    event: 'French Open Qualifying',
    round: 'Third round',
    stage: 'Thursday qualifying board',
    start: '7:00 AM PT',
    startMinutes: 420,
    playerA: { name: 'Coleman Wong', rank: 113, seed: 4, record2026: 'Seeded path still clean' },
    playerB: { name: 'Juan Carlos Prado Angelo', rank: 178, record2026: 'Young live dog' },
    pickName: 'Coleman Wong',
    confidence: 61,
    volatility: 66,
    angle: 'Wong still carries the cleaner seeded-qualifying path and enough ranking gap to be the more stable side',
    swing:
      'Swing factor: whether Prado Angelo can get this into enough long return games to make the seed defend pressure points over and over.',
    fatigue: 'Three straight qualifying days keep the volatility elevated even with the seed advantage.',
    tags: ['Qualifying favorite']
  }),
  makeTennisMatch({
    id: 'rgq-dejong-zheng-2026-05-21',
    event: 'French Open Qualifying',
    round: 'Third round',
    stage: 'Thursday qualifying board',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Jesper De Jong', rank: 109, seed: 1, record2026: 'Top seed, steadier floor' },
    playerB: { name: 'Michael Zheng', rank: 146, record2026: 'Live younger dog' },
    pickName: 'Jesper De Jong',
    confidence: 64,
    volatility: 58,
    angle: 'De Jong has the best seed line in this qualifying cluster and enough ranking margin to make him the cleaner side',
    swing:
      'Swing factor: whether Zheng can keep the first strike dangerous enough to stop the top seed from settling into a full clay rhythm.',
    fatigue: 'Top-seed respect helps, but this is still third-round qualifying and late legs matter.',
    tags: ['Qualifying favorite', 'Seed pressure']
  }),
  makeTennisMatch({
    id: 'rgq-sherif-minnen-2026-05-21',
    event: 'French Open Qualifying',
    round: 'Third round',
    stage: 'Thursday qualifying board',
    start: '4:30 AM PT',
    startMinutes: 270,
    playerA: { name: 'Mayar Sherif', rank: 130, seed: 9, record2026: 'Clay-savvy seeded path' },
    playerB: { name: 'Greet Minnen', rank: 167, record2026: 'Underdog return game live' },
    pickName: 'Mayar Sherif',
    confidence: 60,
    volatility: 62,
    angle: 'Sherif gets the lean because the seed line and clay comfort look a little steadier than Minnen’s pure upset route',
    swing:
      'Swing factor: whether Minnen can shorten enough points to keep Sherif from turning the match into a slower clay-balance battle.',
    fatigue: 'Third-round qualifying load matters, but Sherif still profiles like the calmer clay side.',
    tags: ['Clay edge', 'Qualifying fatigue']
  }),
  makeTennisMatch({
    id: 'rgq-chwalinska-lamens-2026-05-21',
    event: 'French Open Qualifying',
    round: 'Third round',
    stage: 'Thursday qualifying board',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Maja Chwalinska', rank: 116, seed: 8, record2026: 'Slight seed edge' },
    playerB: { name: 'Suzan Lamens', rank: 129, seed: 17, record2026: 'Near-peer grinder' },
    pickName: 'Maja Chwalinska',
    confidence: 54,
    volatility: 73,
    angle: 'the seed and ranking edge are there for Chwalinska, but only barely, so this still reads as one of the more fragile qualifying favorites',
    swing:
      'Swing factor: whether Lamens can erase the thin ranking gap by making this a pure endurance and return-pressure match.',
    fatigue: 'Two seeded players on the third qualifying day usually means a tighter, more physical script than the numbers imply.',
    tags: ['Thin edge', 'Qualifying fatigue', 'Volatile']
  }),
  makeTennisMatch({
    id: 'rgq-galarneau-cina-2026-05-21',
    event: 'French Open Qualifying',
    round: 'Third round',
    stage: 'Thursday qualifying board',
    start: '4:30 AM PT',
    startMinutes: 270,
    playerA: { name: 'Alexis Galarneau', rank: 194, record2026: 'Slight rank edge only' },
    playerB: { name: 'Federico Cina', rank: 216, record2026: 'Live lower-floor dog' },
    pickName: 'Alexis Galarneau',
    confidence: 53,
    volatility: 76,
    angle: 'Galarneau gets the lean almost entirely on the thin ranking edge, which is exactly why this should stay in the fragile-qualifier bucket',
    swing:
      'Swing factor: whether Cina can turn this into a one-break match and make the modest ranking edge irrelevant.',
    fatigue: 'This is one of the qualifier matches where load and nerve management probably matter more than any clean paper edge.',
    tags: ['Thin edge', 'Volatile', 'Qualifying fatigue']
  }),
  makeTennisMatch({
    id: 'rgq-krueger-stoiana-2026-05-21',
    event: 'French Open Qualifying',
    round: 'Third round',
    stage: 'Thursday qualifying board',
    start: '7:00 AM PT',
    startMinutes: 420,
    playerA: { name: 'Ashlyn Krueger', rank: 107, seed: 3, record2026: 'Top-seeded qualifying path' },
    playerB: { name: 'Mary Stoiana', rank: 146, record2026: 'Live younger dog' },
    pickName: 'Ashlyn Krueger',
    confidence: 61,
    volatility: 62,
    angle: 'Krueger still has the cleaner seeded path and a meaningful enough ranking edge to deserve the lean',
    swing:
      'Swing factor: whether Stoiana can keep enough return pressure on the favorite to turn this into a nerves match instead of a seed-holds-serve match.',
    fatigue: 'Third-round qualifying creates enough wear that even solid seeds still need to earn the final set.',
    tags: ['Qualifying favorite']
  }),
  makeTennisMatch({
    id: 'rgq-holmgren-diazacosta-2026-05-21',
    event: 'French Open Qualifying',
    round: 'Third round',
    stage: 'Thursday qualifying board',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'August Holmgren', rank: 155, record2026: 'Small dog, limited gap' },
    playerB: { name: 'Facundo Diaz Acosta', rank: 150, record2026: 'Slight clay profile lean' },
    pickName: 'Facundo Diaz Acosta',
    confidence: 55,
    volatility: 74,
    angle: 'this is basically a coin-flip ranking match, but Diaz Acosta gets the nod on the slightly cleaner clay read',
    swing:
      'Swing factor: whether Holmgren can keep enough cheap serve points to stop the match from becoming a pure clay rally test.',
    fatigue: 'Third-round qualifying turns small paper edges like this into real volatility traps.',
    tags: ['Coin flip', 'Qualifying fatigue', 'Volatile']
  }),
  makeTennisMatch({
    id: 'rgq-pridankina-sakatsume-2026-05-21',
    event: 'French Open Qualifying',
    round: 'Third round',
    stage: 'Thursday qualifying board',
    start: '4:30 AM PT',
    startMinutes: 270,
    playerA: { name: 'Elena Pridankina', rank: 220, record2026: 'Bigger upset needed' },
    playerB: { name: 'Himeno Sakatsume', rank: 131, seed: 21, record2026: 'Seeded stability' },
    pickName: 'Himeno Sakatsume',
    confidence: 65,
    volatility: 56,
    angle: 'Sakatsume has the cleaner ranking line and the seed protection that usually matters by the third qualifying round',
    swing:
      'Swing factor: whether Pridankina can turn the match into a pure momentum fight before the seeded player’s structure settles in.',
    fatigue: 'The qualifying grind is live, but Sakatsume still has the better paper profile than most women left in this section.',
    tags: ['Qualifying favorite', 'Seed pressure']
  }),
  makeTennisMatch({
    id: 'rgq-cecchinato-pellegrino-2026-05-21',
    event: 'French Open Qualifying',
    round: 'Third round',
    stage: 'Thursday qualifying board',
    start: '2:00 AM PT',
    startMinutes: 120,
    playerA: { name: 'Marco Cecchinato', rank: 180, record2026: 'Veteran clay name, thinner current line' },
    playerB: { name: 'Andrea Pellegrino', rank: 126, record2026: 'Current ranking edge' },
    pickName: 'Andrea Pellegrino',
    confidence: 57,
    volatility: 71,
    angle: 'Pellegrino gets the lean because the current ranking line is cleaner, even though Cecchinato’s clay-name value keeps this from ever being comfortable',
    swing:
      'Swing factor: whether Cecchinato can revive enough vintage clay feel to wipe out the cleaner current ranking signal.',
    fatigue: 'Veteran clay names can still spike for a day, which is why this stays more volatile than the rank gap alone suggests.',
    tags: ['Veteran trap', 'Volatile']
  }),
  makeTennisMatch({
    id: 'rgq-guo-costoulas-2026-05-21',
    event: 'French Open Qualifying',
    round: 'Third round',
    stage: 'Thursday qualifying board',
    start: '4:30 AM PT',
    startMinutes: 270,
    playerA: { name: 'Hanyu Guo', rank: 168, record2026: 'Underdog path live' },
    playerB: { name: 'Sofia Costoulas', rank: 144, record2026: 'Slightly cleaner ranking line' },
    pickName: 'Sofia Costoulas',
    confidence: 56,
    volatility: 68,
    angle: 'Costoulas is the narrow lean because the ranking line is cleaner, but nothing about this qualifier looks sturdy',
    swing:
      'Swing factor: whether Guo can keep enough scoreboard pressure on serve to turn the thin rank gap into noise.',
    fatigue: 'Third-round qualifying keeps the upset path very real when the ranking gap is this small.',
    tags: ['Thin edge', 'Qualifying fatigue']
  }),
  makeTennisMatch({
    id: 'rgq-korneeva-riera-2026-05-21',
    event: 'French Open Qualifying',
    round: 'Third round',
    stage: 'Thursday qualifying board',
    start: '7:00 AM PT',
    startMinutes: 420,
    playerA: { name: 'Alina Korneeva', rank: 120, seed: 15, record2026: 'Seeded path, better current line' },
    playerB: { name: 'Julia Riera', rank: 180, record2026: 'Dog needs match tilt' },
    pickName: 'Alina Korneeva',
    confidence: 63,
    volatility: 59,
    angle: 'Korneeva carries the stronger ranking line and the seed cushion that usually matters once qualifying reaches the final day',
    swing:
      'Swing factor: whether Riera can make enough return games chaotic to keep the favorite from cruising on scoreline control alone.',
    fatigue: 'Even the stronger seeds still need real recovery on the last qualifying day, but Korneeva owns the cleaner setup.',
    tags: ['Qualifying favorite']
  })
]

export const slateMeta = {
  title: 'Thursday Tennis Desk',
  date: 'May 21, 2026',
  isoDate: '2026-05-21',
  timeZone: 'America/Los_Angeles',
  subtitle:
    'Clay-heavy May 21 tennis board covering WTA Strasbourg, ATP Hamburg, ATP Geneva, and the Roland-Garros qualifying final round, built from official order-of-play pages, TennisStats match pages, and Tennis Abstract player research.',
  notes: [
    'Every match on this board is on clay, so the model is leaning more on form, H2H shape, ranking pressure, and weekly workload than it would on a mixed-surface slate.',
    'French Open coverage here is qualifying round three, not the main draw. Those matches carry more fatigue variance because everyone is on a third straight win-or-go-home day.',
    'No fresh injury flag surfaced from the accessible pre-match sources on this pass, so the risk read is coming mostly from recent match load, surface fit, and the current market shape rather than explicit medical news.'
  ]
}

export const filters = ['All', 'Tennis']

export const oddsMeta = {
  provider: oddsProvider,
  snapshot: 'May 20, 2026, 8:10 PM PT for the May 21 clay slate',
  note:
    'Main-tour matches use official schedule pages plus TennisStats match boards for ranking, form, Elo, H2H, and accessible moneylines. Roland-Garros qualifying matches use the official order-of-play payload and stay model-only when no clean pre-match price was accessible.'
}

export const sources = [
  {
    label: 'TennisStats match board',
    url: 'https://tennisstats.com/'
  },
  {
    label: 'Tennis Abstract player research example',
    url: 'https://www.tennisabstract.com/cgi-bin/player.cgi?p=126205/Tommy-Paul'
  },
  {
    label: 'ATP Hamburg schedule',
    url: 'https://www.bbc.co.uk/sport/tennis/hamburg-european-open/scores-and-schedule/2026-05-21'
  },
  {
    label: 'ATP Geneva schedule',
    url: 'https://www.bbc.co.uk/sport/tennis/atp-geneva-open/mens-singles/scores-and-schedule/2026-05-21'
  },
  {
    label: 'WTA Strasbourg order of play PDF',
    url: 'https://wtafiles.wtatennis.com/pdf/draws/2026/406/OP.pdf'
  },
  {
    label: 'Roland-Garros order of play',
    url: 'https://www.rolandgarros.com/en-us/order-of-play?annexeCourt=all&competition=all&country=all&date=2026-05-21&favoriteFilter=false&principalCourt=all&year=2026'
  }
]

export const games = matches.sort(
  (left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title)
)

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { querySqlite } from '../../../db/sqlite.mjs'
import { loadMlbDayGames } from '../../../../../pipeline/lib/load-mlb-day-games.mjs'
import { formatAmericanOdds, rankMlbPlayerProps, rankMlbPlayerPropCandidatesLegacy } from '../lib/sports-model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..', '..', '..')

const fullTeamNames = {
  Braves: 'Atlanta Braves',
  Orioles: 'Baltimore Orioles',
  'Red Sox': 'Boston Red Sox',
  Cubs: 'Chicago Cubs',
  Reds: 'Cincinnati Reds',
  Guardians: 'Cleveland Guardians',
  Rockies: 'Colorado Rockies',
  'White Sox': 'Chicago White Sox',
  Tigers: 'Detroit Tigers',
  Astros: 'Houston Astros',
  Royals: 'Kansas City Royals',
  Angels: 'Los Angeles Angels',
  Dodgers: 'Los Angeles Dodgers',
  Marlins: 'Miami Marlins',
  Brewers: 'Milwaukee Brewers',
  Twins: 'Minnesota Twins',
  Mets: 'New York Mets',
  Yankees: 'New York Yankees',
  Athletics: 'Athletics',
  Phillies: 'Philadelphia Phillies',
  Pirates: 'Pittsburgh Pirates',
  Padres: 'San Diego Padres',
  Mariners: 'Seattle Mariners',
  Giants: 'San Francisco Giants',
  Cardinals: 'St. Louis Cardinals',
  Rays: 'Tampa Bay Rays',
  Rangers: 'Texas Rangers',
  'Blue Jays': 'Toronto Blue Jays',
  Nationals: 'Washington Nationals',
  'D-backs': 'Arizona Diamondbacks',
  Diamondbacks: 'Arizona Diamondbacks'
}

const propThresholdByType = {
  rbi: 0.5,
  totalBases: 1.5,
  hits: 1.5,
  walks: 0.5,
  singles: 0.5,
  pitcherStrikeouts: null
}

const parseBaseballInnings = (value = 0) => {
  const stringValue = `${value}`.trim()
  const match = stringValue.match(/^(\d+)(?:\.(\d))?$/)

  if (!match) return Number(stringValue) || 0

  const wholeInnings = Number(match[1])
  const partialOuts = Number(match[2] || 0)
  return wholeInnings + (partialOuts === 1 ? 1 / 3 : partialOuts === 2 ? 2 / 3 : 0)
}

const normalizeNameToken = (value = '') =>
  `${value}`
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const roundToTenths = (value) => Math.round(Number(value) * 10) / 10

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: null,
    out: null,
    legacyOut: null
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') options.date = args[++index]
    else if (arg === '--out') options.out = args[++index]
    else if (arg === '--legacy-out') options.legacyOut = args[++index]
  }

  if (!options.date) {
    throw new Error('Missing required --date argument, expected YYYY-MM-DD.')
  }

  options.out ||= path.join(
    rootDir,
    'data-private',
    'predictions',
    'mlb-player-props',
    `${options.date}-player-props.json`
  )
  options.legacyOut ||= path.join(
    rootDir,
    'data-private',
    'predictions',
    'mlb-player-props-legacy',
    `${options.date}-player-props-legacy.json`
  )

  return options
}

const loadDayGames = async (date) => loadMlbDayGames(date)

const fullNameForTeam = (name = '') => fullTeamNames[name] || name

const thresholdForProp = (propType, marketLabel = '') => {
  if (Number.isFinite(propThresholdByType[propType])) return propThresholdByType[propType]
  const match = marketLabel.match(/Over\s+([0-9.]+)/i)
  return match ? Number(match[1]) : null
}

const serializePropPick = (target) => {
  const awayTeam = target.game?.matchup?.[0]?.name || ''
  const homeTeam = target.game?.matchup?.[1]?.name || ''
  const awayTeamFull = fullNameForTeam(awayTeam)
  const homeTeamFull = fullNameForTeam(homeTeam)
  const teamNameFull = fullNameForTeam(target.teamName)
  const opponentName = target.teamName === awayTeam ? homeTeam : awayTeam
  const opponentNameFull = fullNameForTeam(opponentName)
  const lineThreshold = thresholdForProp(target.propType, target.marketLabel)

  return {
    rank: target.rank,
    id: target.id,
    gameId: target.gameId,
    gameTitle: target.gameTitle,
    start: target.game?.start || '',
    stage: target.game?.stage || '',
    awayTeam,
    homeTeam,
    awayTeamFull,
    homeTeamFull,
    playerId: target.playerId,
    playerName: target.playerName,
    teamName: target.teamName,
    teamNameFull,
    opponentName,
    opponentNameFull,
    slot: target.slot,
    propType: target.propType,
    propLabel: target.propLabel,
    marketLabel: target.marketLabel,
    lineThreshold,
    sportsbook: target.sportsbook || null,
    sourceName: target.sourceName || null,
    sourcePath: target.sourcePath || null,
    marketCapturedAt: target.marketCapturedAt || null,
    confidence: target.confidence,
    probability: target.probability,
    expectedValue: target.expectedValue,
    statValueLabel: target.statValueLabel,
    sample: target.sample || null,
    repeatability: target.repeatability || null,
    recommendationTier: target.recommendationTier,
    shadowSupportTag: target.shadowSupportTag || null,
    shadowSupportLevel: target.shadowSupportLevel || null,
    reason: target.reason,
    scriptTags: Array.isArray(target.scriptTags) ? target.scriptTags : [],
    matchupNote: target.matchupNote,
    teamScriptLabel: target.teamScriptLabel,
    lineupStatus: target.lineupStatus,
    playerSummary: target.playerSummary
  }
}

const summarizeByType = (picks) =>
  picks.reduce((summary, pick) => {
    summary[pick.propType] = (summary[pick.propType] || 0) + 1
    return summary
  }, {})

const sortAndRankProps = (picks) =>
  [...picks]
    .sort((left, right) => {
      if (Number(right.confidence || 0) !== Number(left.confidence || 0)) {
        return Number(right.confidence || 0) - Number(left.confidence || 0)
      }
      if (Number(right.expectedValue || 0) !== Number(left.expectedValue || 0)) {
        return Number(right.expectedValue || 0) - Number(left.expectedValue || 0)
      }
      return Number(right.probability || 0) - Number(left.probability || 0)
    })
    .map((pick, index) => ({ ...pick, rank: index + 1 }))

const loadPitcherStrikeoutOddsByGame = (date) => {
  const rows = querySqlite(`
    SELECT
      game_id,
      player_name,
      line_value,
      MAX(source_name) AS source_name,
      MAX(sportsbook) AS sportsbook,
      MAX(source_path) AS source_path,
      MAX(captured_at) AS captured_at,
      MAX(CASE WHEN selection='Over' THEN american_odds END) AS over_price,
      MAX(CASE WHEN selection='Under' THEN american_odds END) AS under_price
    FROM prop_market_snapshots
    WHERE market_date=?
      AND market_key='pitcher_strikeouts'
    GROUP BY game_id, player_name, line_value
    ORDER BY game_id, player_name
  `, [date])

  return rows.reduce((acc, row) => {
    const gameId = String(row.game_id || '').trim()
    if (!gameId) return acc
    if (!acc[gameId]) acc[gameId] = {}
    acc[gameId][normalizeNameToken(row.player_name)] = {
      playerName: row.player_name,
      line: Number.isFinite(Number(row.line_value)) ? Number(row.line_value) : null,
      overPrice: Number.isFinite(Number(row.over_price)) ? Number(row.over_price) : null,
      underPrice: Number.isFinite(Number(row.under_price)) ? Number(row.under_price) : null,
      sportsbook: row.sportsbook || row.source_name || 'Prop market',
      sourceName: row.source_name || '',
      sourcePath: row.source_path || '',
      capturedAt: row.captured_at || ''
    }
    return acc
  }, {})
}

const average = (values = [], fallback = 0) => {
  const valid = values.map((value) => Number(value)).filter(Number.isFinite)
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : fallback
}

const normalizeLineupStatus = (status = '') => {
  const normalized = String(status || '').toLowerCase()
  if (['posted', 'confirmed', 'official'].includes(normalized)) return 'posted'
  if (normalized === 'partial') return 'partial'
  return 'pending'
}

const buildPitcherStrikeoutPick = ({ game, starter, teamName, opponentName, opponentLineup, lineupStatus, projectedRunsAgainst, market }) => {
  if (!starter?.fullName || !market || !Number.isFinite(Number(market.line))) return null

  const inningsPitched = parseBaseballInnings(starter.inningsPitched ?? 0)
  const strikeouts = Number(starter.strikeOuts)
  const gamesStarted = Number(starter.gamesStarted || 0)
  const seasonKPer9 = inningsPitched > 0 && Number.isFinite(strikeouts) ? (strikeouts / inningsPitched) * 9 : null
  const recentForm = starter.recentForm || null
  const recentKPerStart = Number(recentForm?.strikeoutsPerStart)
  const recentIpPerStart = Number(recentForm?.inningsPerStart)
  const recentKPer9 =
    Number.isFinite(recentKPerStart) && Number.isFinite(recentIpPerStart) && recentIpPerStart > 0
      ? (recentKPerStart / recentIpPerStart) * 9
      : null
  const expectedInnings = Number(starter.usageContext?.expectedInnings)
  const seasonIpPerStart = inningsPitched > 0 && gamesStarted > 0 ? inningsPitched / gamesStarted : null
  const workloadIp =
    Number.isFinite(expectedInnings) && expectedInnings > 0
      ? expectedInnings
      : Number.isFinite(recentIpPerStart) && recentIpPerStart > 0
        ? recentIpPerStart
        : Number.isFinite(seasonIpPerStart) && seasonIpPerStart > 0
          ? seasonIpPerStart
          : 4.9
  const usageStatus = String(starter.usageContext?.status || '')
  const adjustedWorkloadIp =
    usageStatus === 'debut-window'
      ? Math.min(workloadIp, 4.3)
      : usageStatus === 'tiny-sample'
        ? Math.min(workloadIp, 4.7)
        : workloadIp
  const baseKPer9 =
    Number.isFinite(recentKPer9) && Number.isFinite(seasonKPer9)
      ? recentKPer9 * 0.58 + seasonKPer9 * 0.42
      : Number.isFinite(recentKPer9)
        ? recentKPer9
        : Number.isFinite(seasonKPer9)
          ? seasonKPer9
          : null
  if (!Number.isFinite(baseKPer9)) return null

  const lineup = Array.isArray(opponentLineup) ? opponentLineup : []
  const contactAvg = average(lineup.map((hitter) => hitter?.metrics?.contactScore), 50)
  const patienceAvg = average(lineup.map((hitter) => hitter?.metrics?.patienceScore), 50)
  const whiffResistance = clamp(1 + (55 - contactAvg) / 105 + (50 - patienceAvg) / 210, 0.76, 1.24)
  const runPressure = clamp(1 - Math.max(Number(projectedRunsAgainst || 0) - 4.4, 0) * 0.045, 0.82, 1.05)
  const whip = Number(starter.whip)
  const trafficPenalty = Number.isFinite(whip) ? clamp(1 - Math.max(whip - 1.28, 0) * 0.12, 0.84, 1.04) : 1
  const expectedStrikeouts = adjustedWorkloadIp * (baseKPer9 / 9) * whiffResistance * runPressure * trafficPenalty
  const edge = expectedStrikeouts - Number(market.line)
  if (Math.abs(edge) < 0.35) return null

  const lean = edge > 0 ? 'Over' : 'Under'
  const selectedPrice = lean === 'Over' ? market.overPrice : market.underPrice
  const normalizedLineupStatus = lineup.length >= 9 ? 'posted' : normalizeLineupStatus(lineupStatus)
  const baseConfidence =
    56 +
    Math.abs(edge) * 17 +
    (normalizedLineupStatus === 'posted' ? 4 : normalizedLineupStatus === 'partial' ? -2 : -8) +
    (recentForm?.startsSample ? 4 : 0) +
    (usageStatus === 'tiny-sample' ? -6 : usageStatus === 'debut-window' ? -10 : usageStatus === 'season-only' ? -2 : 0)
  const confidence = Math.round(clamp(baseConfidence, 42, 81))
  if (confidence < 60) return null

  const probability = roundToTenths(clamp(50 + Math.abs(edge) * 13.5, 36, 78))
  const priceLabel = Number.isFinite(Number(selectedPrice)) ? formatAmericanOdds(Number(selectedPrice)) : 'n/a'
  const overLabel = Number.isFinite(Number(market.overPrice)) ? formatAmericanOdds(Number(market.overPrice)) : 'n/a'
  const underLabel = Number.isFinite(Number(market.underPrice)) ? formatAmericanOdds(Number(market.underPrice)) : 'n/a'
  const reasons = []
  reasons.push(`${adjustedWorkloadIp.toFixed(1)} IP lane`)
  reasons.push(`${baseKPer9.toFixed(1)} K/9 base`)
  reasons.push(
    whiffResistance >= 1
      ? `${opponentName} are whiff-friendly`
      : `${opponentName} suppress Ks`
  )

  const scriptTags = [
    normalizedLineupStatus === 'posted' ? 'posted-lineup' : normalizedLineupStatus === 'partial' ? 'partial-lineup' : 'pending-lineup',
    'starter-k-lane',
    whiffResistance >= 1.03 ? 'opponent-whiff-lane' : 'contact-resistance',
    usageStatus === 'tiny-sample' || usageStatus === 'debut-window' ? 'short-leash-risk' : 'starter-volume-live'
  ]

  return {
    rank: 0,
    id: `${game.id}:${starter.id || normalizeNameToken(starter.fullName)}:pitcherStrikeouts`,
    gameId: game.id,
    gameTitle: game.title,
    start: game.start,
    stage: game.stage,
    awayTeam: game.matchup?.[0]?.name || '',
    homeTeam: game.matchup?.[1]?.name || '',
    awayTeamFull: fullNameForTeam(game.matchup?.[0]?.name || ''),
    homeTeamFull: fullNameForTeam(game.matchup?.[1]?.name || ''),
    playerId: starter.id ?? null,
    playerName: starter.fullName,
    teamName,
    teamNameFull: fullNameForTeam(teamName),
    opponentName,
    opponentNameFull: fullNameForTeam(opponentName),
    slot: null,
    propType: 'pitcherStrikeouts',
    propLabel: 'K',
    sportsbook: market.sportsbook || 'Prop market',
    sourceName: market.sourceName || '',
    sourcePath: market.sourcePath || '',
    marketCapturedAt: market.capturedAt || '',
    marketLabel: `${lean} ${market.line} strikeouts`,
    lineThreshold: Number(market.line),
    confidence,
    probability,
    expectedValue: roundToTenths(expectedStrikeouts),
    statValueLabel: `${roundToTenths(expectedStrikeouts)} exp K · O ${overLabel} / U ${underLabel}`,
    recommendationTier: confidence >= 76 ? 'Core' : confidence >= 68 ? 'Strong' : 'Lean',
    reason: reasons.join(' | '),
    scriptTags,
    matchupNote: `${market.sportsbook || 'Market'} K line ${market.line} · ${lean} price ${priceLabel}`,
    teamScriptLabel: starter.usageContext?.workloadLabel || '',
    lineupStatus: normalizedLineupStatus,
    playerSummary: `${starter.era} ERA | ${starter.inningsPitched} IP | ${starter.strikeOuts} SO | ${starter.usageContext?.note || starter.usageContext?.label || ''}`
  }
}

const buildPitcherStrikeoutProps = (games, date) => {
  const oddsByGame = loadPitcherStrikeoutOddsByGame(date)
  const picks = []

  games.forEach((game) => {
    const gameId = game.metadata?.canonicalGameId || (Number.isFinite(Number(game.gamePk)) ? `mlb-${game.gamePk}` : '')
    if (!gameId) return
    const gameOdds = oddsByGame[gameId] || {}
    const awayStarter = game.starterContext?.away
    const homeStarter = game.starterContext?.home
    const awayMarket = gameOdds[normalizeNameToken(awayStarter?.fullName)]
    const homeMarket = gameOdds[normalizeNameToken(homeStarter?.fullName)]
    const projection = game.analysis?.mlbProjection || {}

    const awayPick = buildPitcherStrikeoutPick({
      game,
      starter: awayStarter,
      teamName: game.matchup?.[0]?.name || '',
      opponentName: game.matchup?.[1]?.name || '',
      opponentLineup: game.lineupBoard?.home?.lineup || [],
      lineupStatus: game.lineupBoard?.status?.home || 'pending',
      projectedRunsAgainst: projection.homeProjectedRuns,
      market: awayMarket
    })
    if (awayPick) picks.push(awayPick)

    const homePick = buildPitcherStrikeoutPick({
      game,
      starter: homeStarter,
      teamName: game.matchup?.[1]?.name || '',
      opponentName: game.matchup?.[0]?.name || '',
      opponentLineup: game.lineupBoard?.away?.lineup || [],
      lineupStatus: game.lineupBoard?.status?.away || 'pending',
      projectedRunsAgainst: projection.awayProjectedRuns,
      market: homeMarket
    })
    if (homePick) picks.push(homePick)
  })

  return picks
}

const main = async () => {
  const { date, out, legacyOut } = parseArgs()
  const games = await loadDayGames(date)
  const rankedProps = rankMlbPlayerProps(games)
    .filter((target) => target.propType !== 'homeRun')
    .map(serializePropPick)
  const pitcherStrikeoutProps = buildPitcherStrikeoutProps(games, date)
  const combinedProps = sortAndRankProps([...rankedProps, ...pitcherStrikeoutProps])
  const legacyProps = rankMlbPlayerPropCandidatesLegacy(games)
    .filter((target) => target.propType !== 'homeRun')
    .map(serializePropPick)

  const payload = {
    modelName: 'mlb-player-props-v2',
    date,
    generatedAt: new Date().toISOString(),
    sources: ['typed MLB DB day-game loader', 'models/mlb/app-model.js', 'sql-mlb.db prop_market_snapshots'],
    summary: {
      totalGames: games.length,
      totalPicks: combinedProps.length,
      byType: summarizeByType(combinedProps)
    },
    picks: combinedProps
  }

  const legacyPayload = {
    modelName: 'mlb-player-props-v1-legacy',
    date,
    generatedAt: payload.generatedAt,
    sources: payload.sources,
    summary: {
      totalGames: games.length,
      totalPicks: legacyProps.length,
      byType: summarizeByType(legacyProps)
    },
    picks: legacyProps
  }

  await mkdir(path.dirname(out), { recursive: true })
  await mkdir(path.dirname(legacyOut), { recursive: true })
  await writeFile(out, JSON.stringify(payload, null, 2), 'utf8')
  await writeFile(legacyOut, JSON.stringify(legacyPayload, null, 2), 'utf8')
  console.log(`Saved ${combinedProps.length} tracked player props to ${out}`)
  console.log(`Saved ${legacyProps.length} legacy player props to ${legacyOut}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

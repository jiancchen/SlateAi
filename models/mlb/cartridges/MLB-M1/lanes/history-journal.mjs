import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { slateDays } from '../../../../../web/src/lib/slate-days.js'
import { games as may24Games } from '../../../../../web/src/lib/day-2026-05-24.js'

const ROOT = process.cwd()
const HISTORY_DIR = path.join(ROOT, 'data-private', 'history')
const SLATES_DIR = path.join(ROOT, 'published-data', 'slates')
const DEFAULT_HR_MODEL_NAME = 'statcast-hr-prototype-v3'
const DEFAULT_PROP_MODEL_NAME = 'mlb-player-props-v2'

const FULL_NAMES = {
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

const SIDE_MODEL_NAMES = {
  '2026-05-16': 'board-moneyline-v2-may16',
  '2026-05-17': 'board-moneyline-v2-may17',
  '2026-05-18': 'board-moneyline-v2-may18',
  '2026-05-23': 'board-moneyline-v1.1-may23'
}

const HR_MODEL_NAMES = {
  '2026-05-16': DEFAULT_HR_MODEL_NAME,
  '2026-05-17': DEFAULT_HR_MODEL_NAME,
  '2026-05-18': DEFAULT_HR_MODEL_NAME,
  '2026-05-19': DEFAULT_HR_MODEL_NAME,
  '2026-05-20': DEFAULT_HR_MODEL_NAME,
  '2026-05-21': DEFAULT_HR_MODEL_NAME,
  '2026-05-22': DEFAULT_HR_MODEL_NAME,
  '2026-05-23': DEFAULT_HR_MODEL_NAME,
  '2026-05-24': DEFAULT_HR_MODEL_NAME,
  '2026-05-25': DEFAULT_HR_MODEL_NAME
}

const PROP_MODEL_NAMES = {
  '2026-05-16': 'mlb-player-props-v1',
  '2026-05-17': 'mlb-player-props-v1',
  '2026-05-18': 'mlb-player-props-v1',
  '2026-05-19': 'mlb-player-props-v1',
  '2026-05-20': 'mlb-player-props-v1',
  '2026-05-21': 'mlb-player-props-v1',
  '2026-05-22': DEFAULT_PROP_MODEL_NAME,
  '2026-05-23': DEFAULT_PROP_MODEL_NAME,
  '2026-05-24': DEFAULT_PROP_MODEL_NAME,
  '2026-05-25': DEFAULT_PROP_MODEL_NAME
}

const CUSTOM_DAY_GAMES = {
  '2026-05-24': may24Games
}

const readJsonSql = (query) => {
  const escaped = query.replace(/"/g, '\\"')
  const output = execSync(`sqlite3 -json data-private/warehouse/sports.db "${escaped}"`, {
    cwd: ROOT,
    encoding: 'utf8'
  }).trim()
  return output ? JSON.parse(output) : []
}

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true })
}

const fetchJson = (url) =>
  JSON.parse(
    execSync(`curl -sL "${url}"`, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    })
  )

const loadPublishedMlbGames = (date) => {
  const gamesDir = path.join(ROOT, 'published-data', 'slates', date, 'games')
  if (!fs.existsSync(gamesDir)) return []

  return fs
    .readdirSync(gamesDir)
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => JSON.parse(fs.readFileSync(path.join(gamesDir, fileName), 'utf8')))
    .filter((game) => game?.league === 'MLB')
}

const isFullySettledMlbDate = (date) => {
  const rows = readJsonSql(`
    select
      count(*) as total_games,
      sum(case when status in ('Final', 'Game Over', 'Completed') then 1 else 0 end) as final_games
    from mlb_games
    where game_date = '${date}'
  `)
  const row = rows[0]
  if (!row) return false
  return Number(row.total_games || 0) > 0 && Number(row.total_games || 0) === Number(row.final_games || 0)
}

const discoverTrackedMlbDates = () => {
  if (!fs.existsSync(SLATES_DIR)) return []
  const now = new Date()
  const todayIso = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`

  return fs
    .readdirSync(SLATES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
    .map((entry) => entry.name)
    .filter((date) => date < todayIso || (date === todayIso && isFullySettledMlbDate(date)))
    .filter((date) => loadPublishedMlbGames(date).length > 0 || CUSTOM_DAY_GAMES[date]?.length)
    .sort((left, right) => left.localeCompare(right))
}

const makeSideResultJustification = (row) => {
  const parts = []
  if (row.hit_full_game) parts.push(`Full game hit: picked ${row.predicted_team} and got ${row.actual_winner}.`)
  else parts.push(`Full game miss: picked ${row.predicted_team}, actual winner was ${row.actual_winner}.`)
  if (row.hit_first5) parts.push(`First 5 also landed on ${row.actual_first5_winner}.`)
  else parts.push(`First 5 did not land; winner after five was ${row.actual_first5_winner}.`)
  if (row.bullpen_flip_loss) parts.push('This graded as a bullpen-flip loss.')
  if (row.starter_rescue_win) parts.push('This graded as a starter-rescue win.')
  return parts.join(' ')
}

const buildSavedSideRecords = (date) => {
  const modelName = SIDE_MODEL_NAMES[date]
  const rows = readJsonSql(`
    select
      b.prediction_date,
      b.model_name,
      b.game_id,
      b.game_title,
      b.away_team,
      b.home_team,
      b.predicted_team,
      b.predicted_side,
      b.actual_winner,
      b.actual_first5_winner,
      b.hit_full_game,
      b.hit_first5,
      b.bullpen_flip_loss,
      b.starter_rescue_win,
      b.thin_edge_flag,
      b.high_volatility_flag,
      b.hit_edge_against_pick_flag,
      b.predicted_runs_final,
      b.opponent_runs_final,
      b.predicted_runs_first5,
      b.opponent_runs_first5,
      b.predicted_bullpen_runs,
      b.opponent_bullpen_runs,
      b.bullpen_net_diff,
      b.relief_pitching_risk,
      b.coinflip_pressure,
      p.confidence,
      p.volatility,
      p.model_edge,
      p.source_label,
      p.input_labels_json,
      p.metadata_json,
      p.projection_json
    from mlb_side_backtests b
    join mlb_side_predictions p
      on p.prediction_date = b.prediction_date
     and p.model_name = b.model_name
     and p.game_id = b.game_id
    where b.prediction_date = '${date}'
      and b.model_name = '${modelName}'
    order by b.game_title
  `)

  return rows.map((row) => {
    const inputLabels = JSON.parse(row.input_labels_json || '[]')
    const indicators = JSON.parse(row.metadata_json || '{}')
    const projection = JSON.parse(row.projection_json || 'null')
    return {
      date,
      sport: 'MLB',
      marketType: 'moneyline',
      modelName: row.model_name,
      sourceType: 'saved-side-backtest',
      matchup: row.game_title,
      awayTeam: row.away_team,
      homeTeam: row.home_team,
      predictedPick: row.predicted_team,
      predictedSide: row.predicted_side,
      confidence: row.confidence,
      volatility: row.volatility,
      pointEdge: row.model_edge,
      marketAmericanOdds: indicators.marketAmericanOdds ?? null,
      marketProbability: indicators.marketProbability ?? null,
      marketProbabilityLabel: indicators.marketProbabilityLabel ?? null,
      opponentMarketAmericanOdds: indicators.opponentMarketAmericanOdds ?? null,
      opponentMarketProbability: indicators.opponentMarketProbability ?? null,
      opponentMarketProbabilityLabel: indicators.opponentMarketProbabilityLabel ?? null,
      marketFavoriteTeam: indicators.marketFavoriteTeam ?? null,
      marketFavoriteProbability: indicators.marketFavoriteProbability ?? null,
      marketFavoriteProbabilityLabel: indicators.marketFavoriteProbabilityLabel ?? null,
      marketFavoriteAmericanOdds: indicators.marketFavoriteAmericanOdds ?? null,
      pickIsMarketFavorite: Boolean(indicators.pickIsMarketFavorite),
      pickIsMarketUnderdog: Boolean(indicators.pickIsMarketUnderdog),
      marketPriceGap: indicators.marketPriceGap ?? null,
      sourceLabel: row.source_label,
      inputLabels,
      indicators,
      projection,
      meta: {
        thinEdge: Boolean(row.thin_edge_flag),
        highVolatility: Boolean(row.high_volatility_flag),
        hitEdgeAgainstPick: Boolean(row.hit_edge_against_pick_flag)
      },
      pickJustification: inputLabels.join(', '),
      result: {
        fullGameHit: Boolean(row.hit_full_game),
        first5Hit: Boolean(row.hit_first5),
        actualWinner: row.actual_winner,
        actualFirst5Winner: row.actual_first5_winner,
        bullpenFlipLoss: Boolean(row.bullpen_flip_loss),
        starterRescueWin: Boolean(row.starter_rescue_win),
        predictedRunsFinal: row.predicted_runs_final,
        opponentRunsFinal: row.opponent_runs_final,
        predictedRunsFirst5: row.predicted_runs_first5,
        opponentRunsFirst5: row.opponent_runs_first5,
        predictedBullpenRuns: row.predicted_bullpen_runs,
        opponentBullpenRuns: row.opponent_bullpen_runs,
        bullpenNetDiff: row.bullpen_net_diff
      },
      resultJustification: makeSideResultJustification(row)
    }
  })
}

const buildDerivedSideRecords = (date) => {
  const day = slateDays.find((entry) => entry.id === date)
  const games = day?.games ?? CUSTOM_DAY_GAMES[date] ?? loadPublishedMlbGames(date)
  if (!games.length) return []

  const outcomes = readJsonSql(`
    select
      game_pk,
      away_team,
      home_team,
      away_runs_final,
      home_runs_final,
      away_runs_first5,
      home_runs_first5,
      home_full_game_result,
      home_first5_result
    from mlb_game_outcomes
    where game_date = '${date}'
  `)

  const outcomeByGamePk = new Map(
    outcomes
      .filter((row) => Number.isFinite(Number(row.game_pk)))
      .map((row) => [Number(row.game_pk), row])
  )
  const outcomeByMatchup = new Map(outcomes.map((row) => [`${row.away_team} @ ${row.home_team}`, row]))

  return games
    .filter((game) => game.league === 'MLB')
    .map((game) => {
      const awayName = FULL_NAMES[game.matchup?.[0]?.name] || game.matchup?.[0]?.name
      const homeName = FULL_NAMES[game.matchup?.[1]?.name] || game.matchup?.[1]?.name
      const gamePk = Number.isFinite(Number(game.gamePk)) ? Number(game.gamePk) : null
      const row = (gamePk !== null ? outcomeByGamePk.get(gamePk) : null) ?? outcomeByMatchup.get(`${awayName} @ ${homeName}`)
      if (!row) return null
      const actualWinner = row.home_full_game_result === 'win' ? homeName : awayName
      const actualFirst5Winner = row.home_first5_result === 'win' ? homeName : row.home_first5_result === 'loss' ? awayName : 'tie'
      const predictedPick = FULL_NAMES[game.analysis?.participant?.name] || game.analysis?.participant?.name
      const projected = game.analysis?.mlbProjection ?? null
      const pickParticipant =
        game.participants?.find((participant) => participant.name === game.analysis?.participant?.name) ??
        game.analysis?.participant ??
        null
      const opponentParticipant =
        game.participants?.find((participant) => participant.name !== game.analysis?.participant?.name) ??
        game.analysis?.opponent ??
        null
      const marketFavoriteParticipant =
        Array.isArray(game.participants) && game.participants.length === 2
          ? [...game.participants].sort(
              (left, right) => (Number(right.impliedProbability) || 0) - (Number(left.impliedProbability) || 0)
            )[0]
          : null
      return {
        date,
        sport: 'MLB',
        marketType: 'moneyline',
        modelName: 'day-file-live-board',
        sourceType: 'derived-from-day-file',
        matchup: game.title,
        awayTeam: awayName,
        homeTeam: homeName,
        predictedPick,
        predictedSide: predictedPick === awayName ? 'away' : 'home',
        confidence: game.analysis?.confidence ?? null,
        volatility: game.analysis?.volatility ?? null,
        pointEdge: game.analysis?.modelEdge ?? null,
        marketAmericanOdds: Number.isFinite(Number(pickParticipant?.americanOdds))
          ? Number(pickParticipant.americanOdds)
          : null,
        marketProbability: Number.isFinite(pickParticipant?.impliedProbability)
          ? pickParticipant.impliedProbability
          : game.analysis?.marketProbability ?? null,
        marketProbabilityLabel:
          pickParticipant?.impliedProbabilityLabel ?? game.analysis?.marketProbabilityLabel ?? null,
        opponentMarketAmericanOdds: Number.isFinite(Number(opponentParticipant?.americanOdds))
          ? Number(opponentParticipant.americanOdds)
          : null,
        opponentMarketProbability: Number.isFinite(opponentParticipant?.impliedProbability)
          ? opponentParticipant.impliedProbability
          : null,
        opponentMarketProbabilityLabel: opponentParticipant?.impliedProbabilityLabel ?? null,
        marketFavoriteTeam: marketFavoriteParticipant ? (FULL_NAMES[marketFavoriteParticipant.name] || marketFavoriteParticipant.name) : null,
        marketFavoriteProbability: Number.isFinite(marketFavoriteParticipant?.impliedProbability)
          ? marketFavoriteParticipant.impliedProbability
          : null,
        marketFavoriteProbabilityLabel: marketFavoriteParticipant?.impliedProbabilityLabel ?? null,
        marketFavoriteAmericanOdds: Number.isFinite(Number(marketFavoriteParticipant?.americanOdds))
          ? Number(marketFavoriteParticipant.americanOdds)
          : null,
        pickIsMarketFavorite:
          Number.isFinite(pickParticipant?.impliedProbability) &&
          Number.isFinite(opponentParticipant?.impliedProbability)
            ? pickParticipant.impliedProbability >= opponentParticipant.impliedProbability
            : null,
        pickIsMarketUnderdog:
          Number.isFinite(pickParticipant?.impliedProbability) &&
          Number.isFinite(opponentParticipant?.impliedProbability)
            ? pickParticipant.impliedProbability < opponentParticipant.impliedProbability
            : null,
        marketPriceGap:
          Number.isFinite(pickParticipant?.impliedProbability) &&
          Number.isFinite(opponentParticipant?.impliedProbability)
            ? Number((pickParticipant.impliedProbability - opponentParticipant.impliedProbability).toFixed(3))
            : null,
        sourceLabel: game.analysis?.sourceLabel ?? '',
        inputLabels: (game.analysis?.inputs ?? []).map((item) => item.label),
        indicators: game.analysis?.indicators ?? {},
        projection: projected,
        meta: {
          stage: game.stage,
          tags: game.tags ?? []
        },
        pickJustification: game.analysis?.rationale ?? game.summary,
        result: {
          fullGameHit: actualWinner === predictedPick,
          first5Hit: actualFirst5Winner === predictedPick,
          actualWinner,
          actualFirst5Winner,
          awayRunsFinal: row.away_runs_final,
          homeRunsFinal: row.home_runs_final,
          awayRunsFirst5: row.away_runs_first5,
          homeRunsFirst5: row.home_runs_first5
        },
        resultJustification:
          actualWinner === predictedPick
            ? `Full game hit: picked ${predictedPick} and got ${actualWinner}.`
            : `Full game miss: picked ${predictedPick}, actual winner was ${actualWinner}.`
      }
    })
    .filter(Boolean)
}

const buildHrRecords = (date) => {
  const modelName = HR_MODEL_NAMES[date] ?? DEFAULT_HR_MODEL_NAME
  const rows = readJsonSql(`
    select
      b.prediction_date,
      b.model_name,
      b.player_id,
      b.player_name,
      b.team_abbrev,
      b.actual_home_runs,
      b.hit_flag,
      b.matched_event_keys,
      p.rank,
      p.game_title,
      p.opposing_pitcher,
      p.score,
      p.metadata_json
    from mlb_home_run_backtests b
    join mlb_home_run_predictions p
      on p.prediction_date = b.prediction_date
     and p.model_name = b.model_name
     and p.player_id = b.player_id
    where b.prediction_date = '${date}'
      and b.model_name = '${modelName}'
    order by p.rank asc
  `)

  if (!rows.length) {
    return buildDerivedHrRecords(date, modelName)
  }

  return rows.map((row) => {
    const metadata = JSON.parse(row.metadata_json || '{}')
    return {
      date,
      sport: 'MLB',
      marketType: 'homeRun',
      modelName: row.model_name,
      sourceType: 'saved-hr-backtest',
      matchup: row.game_title,
      playerId: row.player_id,
      playerName: row.player_name,
      teamAbbrev: row.team_abbrev,
      predictedPick: row.player_name,
      confidenceRank: row.rank,
      rawScore: row.score,
      opposingPitcher: row.opposing_pitcher,
      meta: metadata,
      pickJustification: Array.isArray(metadata.rationale) ? metadata.rationale.join(' | ') : '',
      result: {
        hit: Boolean(row.hit_flag),
        actualHomeRuns: row.actual_home_runs,
        matchedEventKeys: row.matched_event_keys ? String(row.matched_event_keys).split(',') : []
      },
      resultJustification: row.hit_flag
        ? `${row.player_name} homered ${row.actual_home_runs} time(s).`
        : `${row.player_name} did not homer on this slate.`
    }
  })
}

const buildDerivedHrRecords = (date, modelName) => {
  const predictionPath = path.join(
    ROOT,
    'data-private',
    'predictions',
    'mlb-home-runs',
    `${date}-statcast-prototype.json`
  )
  if (!fs.existsSync(predictionPath)) return []

  const predictionBoard = JSON.parse(fs.readFileSync(predictionPath, 'utf8'))
  const picks = predictionBoard.picks ?? []
  const schedule = fetchJson(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}`)
  const actualEvents = []

  for (const day of schedule.dates ?? []) {
    for (const game of day.games ?? []) {
      const feed = fetchJson(`https://statsapi.mlb.com/api/v1.1/game/${game.gamePk}/feed/live`)
      for (const play of feed.liveData?.plays?.allPlays ?? []) {
        if (play?.result?.event !== 'Home Run') continue
        actualEvents.push({
          playerName: play.matchup?.batter?.fullName,
          gameTitle: `${feed.gameData?.teams?.away?.name} @ ${feed.gameData?.teams?.home?.name}`,
          inning: play.about?.inning,
          half: play.about?.halfInning
        })
      }
    }
  }

  const eventsByPlayer = actualEvents.reduce((map, event) => {
    const existing = map.get(event.playerName) ?? []
    existing.push(event)
    map.set(event.playerName, existing)
    return map
  }, new Map())

  return picks.map((pick) => {
    const matchedEvents = eventsByPlayer.get(pick.playerName) ?? []
    const hit = matchedEvents.length > 0

    return {
      date,
      sport: 'MLB',
      marketType: 'homeRun',
      modelName,
      sourceType: 'derived-from-saved-hr-board',
      matchup: pick.gameTitle,
      playerId: pick.playerId,
      playerName: pick.playerName,
      teamAbbrev: pick.teamAbbrev,
      predictedPick: pick.playerName,
      confidenceRank: pick.rank,
      rawScore: pick.score,
      opposingPitcher: pick.opposingPitcher,
      meta: pick,
      pickJustification: Array.isArray(pick.rationale) ? pick.rationale.join(' | ') : '',
      result: {
        hit,
        actualHomeRuns: matchedEvents.length,
        matchedEventKeys: matchedEvents.map((event) => `${event.gameTitle}|${event.inning}|${event.half}`)
      },
      resultJustification: hit
        ? `${pick.playerName} homered ${matchedEvents.length} time(s).`
        : `${pick.playerName} did not homer on this slate.`
    }
  })
}

const buildPropRecords = (date) => {
  const modelName = PROP_MODEL_NAMES[date] ?? DEFAULT_PROP_MODEL_NAME

  const rows = readJsonSql(`
    select
      b.prediction_date,
      b.model_name,
      b.game_id,
      b.player_id,
      b.player_name,
      b.team_name,
      b.prop_type,
      b.market_label,
      b.line_threshold,
      b.actual_value,
      b.hit_flag,
      b.result_label,
      b.metadata_json as result_metadata_json,
      p.rank,
      p.game_title,
      p.confidence,
      p.probability,
      p.expected_value,
      p.recommendation_tier,
      p.metadata_json,
      p.raw_json
    from mlb_prop_backtests b
    join mlb_prop_predictions p
      on p.prediction_date = b.prediction_date
     and p.model_name = b.model_name
     and p.game_id = b.game_id
     and p.player_id = b.player_id
     and p.prop_type = b.prop_type
    where b.prediction_date = '${date}'
      and b.model_name = '${modelName}'
    order by p.rank asc, p.prop_type asc, p.player_name asc
  `)

  return rows.map((row) => {
    const metadata = JSON.parse(row.metadata_json || '{}')
    const resultMetadata = JSON.parse(row.result_metadata_json || '{}')
    const raw = JSON.parse(row.raw_json || '{}')
    return {
      date,
      sport: 'MLB',
      marketType: 'playerProp',
      modelName: row.model_name,
      sourceType: 'saved-prop-backtest',
      matchup: row.game_title,
      gameId: row.game_id,
      playerId: row.player_id,
      playerName: row.player_name,
      teamName: row.team_name,
      predictedPick: `${row.player_name} ${row.market_label}`,
      propType: row.prop_type,
      propLabel: raw.propLabel || row.prop_type,
      marketLabel: row.market_label,
      lineThreshold: row.line_threshold,
      confidenceRank: row.rank,
      confidence: row.confidence,
      probability: row.probability,
      expectedValue: row.expected_value,
      recommendationTier: row.recommendation_tier,
      meta: {
        ...metadata,
        scriptTags: Array.isArray(metadata.scriptTags) ? metadata.scriptTags : [],
        statValueLabel: raw.statValueLabel,
        slot: raw.slot
      },
      pickJustification: metadata.reason || '',
      result: {
        hit: Boolean(row.hit_flag),
        actualValue: row.actual_value,
        lineThreshold: row.line_threshold,
        plateAppearances: resultMetadata.plateAppearances,
        atBats: resultMetadata.atBats,
        gamePk: resultMetadata.gamePk,
        storyTags: Array.isArray(resultMetadata.storyTags) ? resultMetadata.storyTags : [],
        storySummary: resultMetadata.storySummary ?? {}
      },
      resultJustification: row.result_label || `${row.player_name} result not available.`
    }
  })
}

const buildDerivedFirstInningRecords = (date) => {
  const games = loadPublishedMlbGames(date)
  if (!games.length) return []

  const inningRows = readJsonSql(`
    select
      game_pk,
      batting_team,
      coalesce(sum(run_delta), 0) as runs_in_first
    from mlb_plate_appearances
    where game_date = '${date}'
      and inning = 1
    group by game_pk, batting_team
  `)

  const runsByGamePk = new Map()
  for (const row of inningRows) {
    const gamePk = Number(row.game_pk)
    if (!Number.isFinite(gamePk)) continue
    const existing = runsByGamePk.get(gamePk) ?? {}
    existing[row.batting_team] = Number(row.runs_in_first) || 0
    runsByGamePk.set(gamePk, existing)
  }

  return games
    .map((game) => {
      const firstInning = game.analysis?.mlbProjection?.firstInning
      if (!firstInning?.pick || firstInning.pick === 'Pass') return null

      const gamePk = Number(game.gamePk)
      if (!Number.isFinite(gamePk)) return null

      const awayTeam = FULL_NAMES[game.matchup?.[0]?.name] || game.matchup?.[0]?.name
      const homeTeam = FULL_NAMES[game.matchup?.[1]?.name] || game.matchup?.[1]?.name
      const inningRuns = runsByGamePk.get(gamePk) ?? {}
      const awayRuns = Number(inningRuns[awayTeam]) || 0
      const homeRuns = Number(inningRuns[homeTeam]) || 0
      const totalRuns = awayRuns + homeRuns
      const actualPick = totalRuns > 0 ? 'YRFI' : 'NRFI'
      const predictedPick = firstInning.pick

      return {
        date,
        sport: 'MLB',
        marketType: 'firstInning',
        modelName: 'day-file-first-inning',
        sourceType: 'derived-from-published-game-file',
        matchup: game.title,
        gameId: game.id,
        gamePk,
        predictedPick,
        confidence:
          predictedPick === 'YRFI'
            ? firstInning.yesProbabilityPct ?? null
            : firstInning.noProbabilityPct ?? null,
        meta: {
          strength: firstInning.strength ?? null,
          line: firstInning.line ?? null,
          awayRunProbabilityPct: firstInning.awayRunProbabilityPct ?? null,
          homeRunProbabilityPct: firstInning.homeRunProbabilityPct ?? null,
          yesProbabilityPct: firstInning.yesProbabilityPct ?? null,
          noProbabilityPct: firstInning.noProbabilityPct ?? null
        },
        pickJustification: firstInning.summary ?? '',
        result: {
          hit: predictedPick === actualPick,
          actualPick,
          totalRuns,
          awayRuns,
          homeRuns
        },
        resultJustification:
          predictedPick === actualPick
            ? `${predictedPick} hit: ${awayTeam} ${awayRuns}, ${homeTeam} ${homeRuns} in the 1st.`
            : `${predictedPick} missed: actual first-inning result was ${actualPick} with ${awayTeam} ${awayRuns}, ${homeTeam} ${homeRuns}.`
      }
    })
    .filter(Boolean)
}

const buildPropSummary = (propRecords) => {
  const grouped = {}
  for (const record of propRecords) {
    const key = record.propType
    if (!grouped[key]) grouped[key] = { hits: 0, total: 0 }
    grouped[key].total += 1
    if (record.result?.hit) grouped[key].hits += 1
  }

  const overall = {
    hits: propRecords.filter((record) => record.result?.hit).length,
    total: propRecords.length
  }

  const topHits = propRecords
    .filter((record) => record.result?.hit)
    .sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0))
    .slice(0, 4)
    .map((record) => `${record.playerName} ${record.marketLabel}`)

  const topMisses = propRecords
    .filter((record) => !record.result?.hit)
    .sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0))
    .slice(0, 4)
    .map((record) => `${record.playerName} ${record.marketLabel}`)

  return {
    overall: {
      ...overall,
      hitRate: overall.total ? Number(((overall.hits / overall.total) * 100).toFixed(1)) : null
    },
    byType: Object.fromEntries(
      Object.entries(grouped).map(([propType, summary]) => [
        propType,
        {
          ...summary,
          hitRate: summary.total ? Number(((summary.hits / summary.total) * 100).toFixed(1)) : null
        }
      ])
    ),
    topHits,
    topMisses
  }
}

const writePropSummaryModule = (propSummaryByDate) => {
  const target = path.join(ROOT, 'web', 'src', 'lib', 'history-prop-performance.generated.ts')
  const moduleSource = `export type PropSummary = {
  hits: number
  total: number
  hitRate: number | null
}

export type DailyPropSummary = {
  overall: PropSummary
  byType: Record<string, PropSummary>
  topHits: string[]
  topMisses: string[]
}

export const mlbPropPerformanceByDate: Record<string, DailyPropSummary> = ${JSON.stringify(propSummaryByDate, null, 2)}\n`
  fs.writeFileSync(target, moduleSource, 'utf8')
  console.log(`Wrote prop performance summary -> ${target}`)
}

const buildPropCalibration = (propRecords) => {
  const overallByType = {}
  const byTeamAndType = {}
  const byReasonTagAndType = {}
  const byScriptTagAndType = {}
  const byStoryTagAndType = {}

  const touchBucket = (store, key) => {
    if (!store[key]) store[key] = { hits: 0, total: 0 }
    return store[key]
  }

  const reasonTagsFor = (record) => {
    const raw = record?.meta?.reason || record?.pickJustification || ''
    return raw
      .split('|')
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean)
  }

  const scriptTagsFor = (record) =>
    (record?.meta?.scriptTags ?? []).map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)

  const storyTagsFor = (record) =>
    (record?.result?.storyTags ?? []).map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)

  for (const record of propRecords) {
    const propType = record.propType
    const hit = Boolean(record.result?.hit)
    if (!propType) continue

    const overall = touchBucket(overallByType, propType)
    overall.total += 1
    if (hit) overall.hits += 1

    if (record.teamName) {
      const teamBucket = touchBucket(byTeamAndType, `${propType}::${record.teamName}`)
      teamBucket.total += 1
      if (hit) teamBucket.hits += 1
    }

    for (const tag of reasonTagsFor(record)) {
      const tagBucket = touchBucket(byReasonTagAndType, `${propType}::${tag}`)
      tagBucket.total += 1
      if (hit) tagBucket.hits += 1
    }

    for (const tag of scriptTagsFor(record)) {
      const tagBucket = touchBucket(byScriptTagAndType, `${propType}::${tag}`)
      tagBucket.total += 1
      if (hit) tagBucket.hits += 1
    }

    for (const tag of storyTagsFor(record)) {
      const tagBucket = touchBucket(byStoryTagAndType, `${propType}::${tag}`)
      tagBucket.total += 1
      if (hit) tagBucket.hits += 1
    }
  }

  const finalize = (store, minSample) =>
    Object.fromEntries(
      Object.entries(store)
        .filter(([, summary]) => summary.total >= minSample)
        .map(([key, summary]) => [
          key,
          {
            hits: summary.hits,
            total: summary.total,
            hitRate: summary.total ? Number(((summary.hits / summary.total) * 100).toFixed(1)) : null
          }
        ])
    )

  return {
    overallByType: finalize(overallByType, 1),
    byTeamAndType: finalize(byTeamAndType, 4),
    byReasonTagAndType: finalize(byReasonTagAndType, 6),
    byScriptTagAndType: finalize(byScriptTagAndType, 6),
    byStoryTagAndType: finalize(byStoryTagAndType, 6)
  }
}

const writePropCalibrationModule = (propRecords) => {
  const target = path.join(ROOT, 'models', 'mlb', 'cartridges', 'MLB-M1', 'generated', 'mlb-prop-calibration.generated.js')
  const webShimTarget = path.join(ROOT, 'web', 'src', 'lib', 'mlb-prop-calibration.generated.js')
  const calibration = buildPropCalibration(propRecords)
  const moduleSource = `export const mlbPropCalibration = ${JSON.stringify(calibration, null, 2)}\n`
  ensureDir(path.dirname(target))
  fs.writeFileSync(target, moduleSource, 'utf8')
  fs.writeFileSync(webShimTarget, moduleSource, 'utf8')
  console.log(`Wrote prop calibration -> ${target}`)
}

const dates = discoverTrackedMlbDates()
ensureDir(HISTORY_DIR)

const trackedFiles = new Set(dates.map((date) => `mlb-results-${date}.jsonl`))
for (const fileName of fs.readdirSync(HISTORY_DIR)) {
  if (!/^mlb-results-\d{4}-\d{2}-\d{2}\.jsonl$/.test(fileName)) continue
  if (trackedFiles.has(fileName)) continue
  fs.unlinkSync(path.join(HISTORY_DIR, fileName))
}

const allRecords = []
const propSummaryByDate = {}

for (const date of dates) {
  const sideRecords = SIDE_MODEL_NAMES[date] ? buildSavedSideRecords(date) : buildDerivedSideRecords(date)
  const firstInningRecords = buildDerivedFirstInningRecords(date)
  const hrRecords = buildHrRecords(date)
  const propRecords = buildPropRecords(date)
  const records = [...sideRecords, ...firstInningRecords, ...hrRecords, ...propRecords]
  if (propRecords.length) {
    propSummaryByDate[date] = buildPropSummary(propRecords)
  }
  allRecords.push(...records)
  const target = path.join(HISTORY_DIR, `mlb-results-${date}.jsonl`)
  fs.writeFileSync(target, records.map((record) => JSON.stringify(record)).join('\n') + '\n', 'utf8')
  console.log(`Wrote ${records.length} records -> ${target}`)
}

const combinedTarget = path.join(HISTORY_DIR, 'mlb-results-archive.jsonl')
fs.writeFileSync(combinedTarget, allRecords.map((record) => JSON.stringify(record)).join('\n') + '\n', 'utf8')
console.log(`Wrote ${allRecords.length} records -> ${combinedTarget}`)
writePropSummaryModule(propSummaryByDate)
writePropCalibrationModule(allRecords.filter((record) => record.marketType === 'playerProp'))

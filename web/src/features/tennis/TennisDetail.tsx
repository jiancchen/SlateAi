type AnyRecord = Record<string, any>

type TennisDetailProps = Record<string, any>

export function TennisDetail(props: TennisDetailProps) {
  const {
    game,
    findKalshiTradeCandidateForGame,
    formatAmericanOdds,
    formatNumber,
    formatPercent,
    formatSignedNumber,
    tennisValueTone
  } = props

  const context = game.tennisContext
  const projection = context?.projection
  const tradePlan = context?.tradePlan
  const weaknessEdge = context?.weaknessEdge
  const marketEconomics = context?.marketEconomics
  const ensembleValueCase = context?.ensembleValueCase
  const warehouseContext = context?.warehouseContext
  const matchSurface =
    context?.surface ||
    game?.surface ||
    (Array.isArray(game?.tags) ? game.tags.find((tag: string) => /^(clay|grass|hard|i\. hard|carpet)$/i.test(String(tag))) : null) ||
    'Surface'
  const clayMatchupData = context?.clayMatchupData
  const opponentQualityData = context?.opponentQualityData
  const rawQualityPlayers = Array.isArray(opponentQualityData?.players) ? opponentQualityData.players : []
  const normalizeTennisName = (value: string) => {
    const normalized = String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, ' ')
      .trim()
      .toLowerCase()
    const aliases: Record<string, string> = {
      'barbora palicov': 'barbora palicova',
      'bu yunchaokete': 'yunchaokete bu',
      'chak lam coleman wong': 'coleman wong',
      'diego dedura': 'diego dedura palomero',
      'georgia pedone': 'giorgia pedone',
      'noma akugue noha': 'noma noha akugue',
      'taro taro': 'taro daniel',
      'xinyu wang': 'wang xinyu',
      'xiyu wang': 'wang xiyu',
      'yibing wu': 'wu yibing'
    }
    return aliases[normalized] || normalized
  }
  const formatRecord = (record?: AnyRecord | null) => {
    if (!record || !Number.isFinite(Number(record.wins)) || !Number.isFinite(Number(record.losses))) return 'N/A'
    const pct = Number.isFinite(Number(record.winPct)) ? ` | ${formatPercent(Number(record.winPct) * 100, 1)}` : ''
    return `${record.wins}-${record.losses}${pct}`
  }
  const rankingForPlayer = (player: AnyRecord) => {
    const warehousePlayer = warehousePlayerFor(player?.name || player?.label || '', player)
    const ranking = player?.ranking || player?.warehouseStats?.ranking || warehousePlayer?.ranking || {}
    const profile = player?.warehouseStats?.profile || warehousePlayer?.profile || {}
    const rank = ranking.rank ?? profile.rank ?? player?.rank
    return {
      ...ranking,
      rank,
      tour: ranking.tour || profile.rankingLabel || (game?.stage?.includes('Women') ? 'WTA' : 'ATP'),
      country: ranking.country || profile.country,
      age: ranking.age ?? profile.age,
      points: ranking.points ?? profile.points,
      sourceUrl: ranking.sourceUrl || profile.sourceUrl
    }
  }
  const formatRank = (player: AnyRecord) => {
    const ranking = rankingForPlayer(player)
    const rank = ranking?.rank
    return Number.isFinite(Number(rank)) ? `${ranking?.tour || ''} #${rank}`.trim() : 'Rank pending'
  }
  const formatIdentity = (ranking?: AnyRecord | null) => {
    const parts = [
      ranking?.country,
      Number.isFinite(Number(ranking?.age)) ? `Age ${ranking.age}` : null,
      Number.isFinite(Number(ranking?.points)) ? `${Number(ranking.points).toLocaleString('en-US')} pts` : null
    ].filter(Boolean)
    return parts.length ? parts.join(' | ') : 'No profile data'
  }
  const marketValueTone = (edgePct: any) => {
    const edge = Number(edgePct)
    if (!Number.isFinite(edge)) return ''
    if (edge >= 7) return 'accent'
    if (edge <= -4) return 'warning'
    return ''
  }
  const marketValueLabel = (edgePct: any) => {
    const edge = Number(edgePct)
    if (!Number.isFinite(edge)) return 'No model edge'
    if (edge >= 7) return 'Positive value'
    if (edge <= -4) return 'Bad price'
    return 'Near fair'
  }
  const isBlockedTennisSource = (value: any) => {
    const source = String(value || '').toLowerCase()
    const blocked = ['fla' + 'shscore', 'sofa' + 'score']
    return blocked.some((name) => source.includes(name))
  }
  const statDisplay = (stat?: AnyRecord | null) => {
    if (!stat) return 'Pending'
    if (stat.raw !== undefined && stat.raw !== null && stat.raw !== '') return String(stat.raw)
    if (Number.isFinite(Number(stat.percentage))) return `${Math.round(Number(stat.percentage))}%`
    if (Number.isFinite(Number(stat.numeric))) return formatNumber(Number(stat.numeric), 0)
    return 'Pending'
  }
  const expectedStatDisplay = (expectedStats: AnyRecord | null | undefined, key: string, suffix = '') => {
    const value = expectedStats?.stats?.[key]
    if (value === null || value === undefined || value === '') return 'No expected row'
    if (!Number.isFinite(Number(value))) return 'No expected row'
    return `Exp ${formatNumber(Number(value), Number(value) % 1 === 0 ? 0 : 1)}${suffix}`
  }
  const statWithExpected = (actual: AnyRecord | null | undefined, expectedStats: AnyRecord | null | undefined, expectedKey: string, suffix = '') => {
    if (actual) return statDisplay(actual)
    return expectedStatDisplay(expectedStats, expectedKey, suffix)
  }
  const bpStatWithExpected = (
    actual: AnyRecord | null | undefined,
    expectedStats: AnyRecord | null | undefined,
    pctKey: string,
    madeKey: string,
    attemptsKey: string
  ) => {
    if (actual) return statDisplay(actual)
    const stats = expectedStats?.stats || {}
    const made = expectedNumber(stats, madeKey)
    const attempts = expectedNumber(stats, attemptsKey)
    const pct = expectedNumber(stats, pctKey)
    if (made != null && attempts != null) {
      const pctLabel = pct != null ? ` (${formatPercent(pct, 1)})` : ''
      return `Exp ${formatNumber(made, 0)}/${formatNumber(attempts, 0)}${pctLabel}`
    }
    return expectedStatDisplay(expectedStats, pctKey, '%')
  }
  const expectedStatsObjectForPlayer = (playerName: string) =>
    warehouseContext?.players?.find((entry: AnyRecord) => normalizeTennisName(entry.name) === normalizeTennisName(playerName))
      ?.expectedStats?.stats || null
  const expectedStatsRecordForPlayer = (playerName: string) =>
    warehouseContext?.players?.find((entry: AnyRecord) => normalizeTennisName(entry.name) === normalizeTennisName(playerName))
      ?.expectedStats || null
  const warehousePlayerFor = (playerName: string, player?: AnyRecord | null) =>
    player?.warehouseStats ||
    warehouseContext?.players?.find((entry: AnyRecord) => normalizeTennisName(entry.name) === normalizeTennisName(playerName)) ||
    null
  const expectedNumber = (stats: AnyRecord | null | undefined, key: string) => {
    const value = stats?.[key]
    if (value === null || value === undefined || value === '') return null
    return Number.isFinite(Number(value)) ? Number(value) : null
  }
  const playerRankLabel = (player: AnyRecord) => {
    const ranking = rankingForPlayer(player)
    const rank = ranking?.rank
    if (rank === null || rank === undefined || rank === '' || !Number.isFinite(Number(rank))) return 'Rank pending'
    const tour = ranking?.tour || (game?.stage?.includes('Women') ? 'WTA' : 'ATP')
    return `${tour} #${rank}`
  }
  const compactRankIdentity = (player: AnyRecord) => {
    const ranking = rankingForPlayer(player)
    const parts = [
      playerRankLabel(player),
      ranking.country,
      Number.isFinite(Number(ranking.points)) ? `${Number(ranking.points).toLocaleString('en-US')} pts` : null
    ].filter(Boolean)
    return parts.join(' | ')
  }
  const formChartForPlayer = (player: AnyRecord) => {
    const warehousePlayer = warehousePlayerFor(player?.name || player?.label || '', player)
    return player?.warehouseStats?.formChart || warehousePlayer?.formChart || null
  }
  const renderTennisLiveFormChart = (player: AnyRecord) => {
    const chart = formChartForPlayer(player)
    const points = Array.isArray(chart?.points)
      ? chart.points.filter((point: AnyRecord) => Number.isFinite(Number(point.value))).slice(-36)
      : []
    if (points.length < 2) return null
    const values = points.map((point: AnyRecord) => Number(point.value))
    const min = Math.min(-2, ...values)
    const max = Math.max(2, ...values)
    const range = Math.max(1, max - min)
    const width = 240
    const height = 74
    const chartPoints = points
      .map((point: AnyRecord, index: number) => {
        const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
        const y = height - 8 - ((Number(point.value) - min) / range) * (height - 18)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
    const zeroY = height - 8 - ((0 - min) / range) * (height - 18)
    const latest = values[values.length - 1]
    const latestDate = points[points.length - 1]?.date
    return (
      <div className="tennislive-form-chart">
        <div className="tennislive-form-chart-head">
          <span>TennisLive form</span>
          <strong>{formatSignedNumber(latest, 1)}</strong>
          {latestDate ? <small>{latestDate}</small> : null}
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${player.name} TennisLive form chart`}>
          <line x1="0" x2={width} y1={zeroY} y2={zeroY} />
          <polyline points={chartPoints} />
        </svg>
      </div>
    )
  }
  const expectationTone = (score: any) => {
    const numericScore = Number(score)
    if (!Number.isFinite(numericScore)) return 'missing'
    if (numericScore >= 64) return 'beat'
    if (numericScore >= 48) return 'met'
    return 'miss'
  }
  const expectationLabel = (score: any) => {
    const numericScore = Number(score)
    if (!Number.isFinite(numericScore)) return 'No row'
    if (numericScore >= 64) return 'Beat'
    if (numericScore >= 48) return 'Met'
    return 'Miss'
  }
  const metricScoreFromExpected = (stats: AnyRecord | null | undefined, key: string) => {
    if (!stats) return null
    if (key === 'Hold') return expectedNumber(stats, 'holdPct')
    if (key === 'Return') {
      const returnGamesWon = expectedNumber(stats, 'returnGamesWonPct')
      if (returnGamesWon != null) return Math.max(0, Math.min(100, returnGamesWon * 1.9 + 22))
      return expectedNumber(stats, 'returnPointsWonPct')
    }
    if (key === 'BP saved') return expectedNumber(stats, 'breakPointsSavedPct')
    if (key === 'BP converted') return expectedNumber(stats, 'breakPointsConvertedPct')
    return null
  }
  const expectationBubblesForPlayer = (player: AnyRecord, expectedStats: AnyRecord | null | undefined) => {
    const warehousePlayer = warehouseContext?.players?.find(
      (entry: AnyRecord) => normalizeTennisName(entry.name) === normalizeTennisName(player.name)
    )
    const summaryRows = warehousePlayer?.recentFormMetrics?.summary || []
    if (summaryRows.length) {
      return summaryRows.slice(0, 5).map((row: AnyRecord) => ({
        label: row.label || row.key || 'Form',
        score: expectedNumber(row, 'score'),
        source: 'recent form'
      }))
    }
    const stats = expectedStats?.stats || expectedStatsObjectForPlayer(player.name) || {}
    return ['Hold', 'Return', 'BP saved', 'BP converted']
      .map((label) => ({ label, score: metricScoreFromExpected(stats, label), source: 'pressure aggregate' }))
      .filter((row) => row.score != null)
      .slice(0, 5)
  }
  const nonEmptyStatRows = (rows: Array<{ label: string; value: string }>) =>
    rows.filter((row) => !/^No expected row$/i.test(row.value) && !/^Pending$/i.test(row.value))
  const derivedHoldPct = (stats: AnyRecord | null | undefined) => {
    const explicitHold = expectedNumber(stats, 'holdPct') ?? expectedNumber(stats, 'serviceHoldPct') ?? expectedNumber(stats, 'avgServiceHoldPct')
    if (explicitHold != null) return explicitHold
    const firstIn = expectedNumber(stats, 'firstServePct')
    const firstWon = expectedNumber(stats, 'firstServeWonPct')
    const secondWon = expectedNumber(stats, 'secondServeWonPct')
    if (firstIn == null || firstWon == null || secondWon == null) return null
    const pointWin = (firstIn / 100) * (firstWon / 100) + (1 - firstIn / 100) * (secondWon / 100)
    if (!Number.isFinite(pointWin) || pointWin <= 0 || pointWin >= 1) return null
    const q = 1 - pointWin
    const preDeuce = pointWin ** 4 * (1 + 4 * q + 10 * q ** 2)
    const reachDeuce = 20 * pointWin ** 3 * q ** 3
    const winFromDeuce = pointWin ** 2 / (pointWin ** 2 + q ** 2)
    return Math.max(0, Math.min(100, (preDeuce + reachDeuce * winFromDeuce) * 100))
  }
  const fractionFromValue = (value: any) => {
    const match = String(value || '').match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/)
    if (!match) return null
    const made = Number(match[1])
    const attempts = Number(match[2])
    return Number.isFinite(made) && Number.isFinite(attempts) ? { made, attempts } : null
  }
  const pressureSampleFromRows = (rows: AnyRecord[]) => {
    let bpSaved = 0
    let bpFaced = 0
    let bpConverted = 0
    let bpChances = 0
    let savedRows = 0
    let convertedRows = 0
    rows.forEach((row) => {
      const saved = fractionFromValue(row?.breakPointsSaved)
      if (saved) {
        bpSaved += saved.made
        bpFaced += saved.attempts
        savedRows += 1
      }
      const converted = fractionFromValue(row?.breakPointsConverted)
      if (converted) {
        bpConverted += converted.made
        bpChances += converted.attempts
        convertedRows += 1
      }
    })
    if (!savedRows && !convertedRows) return null
    return {
      matches: rows.length,
      bpSaved,
      bpFaced,
      bpSavedPct: bpFaced ? (bpSaved / bpFaced) * 100 : null,
      bpFacedPerMatch: savedRows ? bpFaced / savedRows : null,
      bpConverted,
      bpChances,
      bpConvertedPct: bpChances ? (bpConverted / bpChances) * 100 : null,
      bpChancesPerMatch: convertedRows ? bpChances / convertedRows : null
    }
  }
  const serviceStatsFromRecentMetric = (match: AnyRecord) => {
    const metric = Object.values(match?.metrics || {}).find((entry: any) => entry?.raw?.serviceStats)
    return (metric as AnyRecord | undefined)?.raw?.serviceStats || null
  }
  const pressureSampleFromRecentMatches = (matches: AnyRecord[]) =>
    pressureSampleFromRows(matches.map(serviceStatsFromRecentMetric).filter(Boolean) as AnyRecord[])
  const tournamentAliases = () => {
    const values = [game?.stage, warehouseContext?.tournament, warehouseContext?.surface]
      .map((value) => String(value || '').toLowerCase())
      .filter(Boolean)
    const joined = values.join(' ')
    if (joined.includes('roland') || joined.includes('french open')) return ['roland garros', 'french open']
    const stageName = String(game?.stage || '').split('|')[0]?.toLowerCase()
    return stageName
      .replace(/\b(atp|wta|challenger|men|women|round|singles)\b/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 4)
      .slice(0, 3)
  }
  const isCurrentTournamentRecentMatch = (match: AnyRecord) => {
    const event = String(match?.event || '').toLowerCase()
    if (!event) return false
    return tournamentAliases().some((alias) => event.includes(alias))
  }
  const pressureLine = (sample: AnyRecord | null | undefined, type: 'save' | 'convert') => {
    if (!sample) return 'No sample'
    if (type === 'save') {
      if (!Number.isFinite(Number(sample.bpFaced))) return 'No BP faced row'
      return `${formatNumber(Number(sample.bpSaved || 0), 0)}/${formatNumber(Number(sample.bpFaced), 0)} saved · ${formatNumber(Number(sample.bpFacedPerMatch || 0), 1)} faced/match`
    }
    if (!Number.isFinite(Number(sample.bpChances))) return 'No BP chance row'
    return `${formatNumber(Number(sample.bpConverted || 0), 0)}/${formatNumber(Number(sample.bpChances), 0)} converted · ${formatNumber(Number(sample.bpChancesPerMatch || 0), 1)} chances/match`
  }
  const pressureStatsForPlayer = (player: AnyRecord) => {
    const expectedRecord = player?.warehouseStats?.expectedStats || expectedStatsRecordForPlayer(player.name)
    const expectedStats = expectedRecord?.stats || expectedStatsObjectForPlayer(player.name)
    const weakness = player?.weakness || {}
    const recentFormMatches = player?.warehouseStats?.recentFormMetrics?.matches || []
    const last5FromRows = pressureSampleFromRecentMatches(recentFormMatches.slice(0, 5))
    const tournamentFromRows = pressureSampleFromRecentMatches(recentFormMatches.filter(isCurrentTournamentRecentMatch))
    const last5 = last5FromRows || expectedRecord?.pressureSamples?.last5
    const tournament = tournamentFromRows || expectedRecord?.pressureSamples?.tournament
    const recent = expectedRecord?.pressureSamples?.recent
    const hold =
      expectedNumber(weakness, 'serviceHoldPct') ??
      expectedNumber(weakness, 'holdPct') ??
      derivedHoldPct(expectedStats)
    return {
      name: player.name || player.label,
      source: expectedRecord?.source || 'Expected stats',
      sample: expectedRecord?.matches ?? expectedNumber(expectedStats, 'matches'),
      hold,
      bpSaved: expectedNumber(last5, 'bpSavedPct') ?? expectedNumber(recent, 'bpSavedPct') ?? expectedNumber(expectedStats, 'breakPointsSavedPct') ?? expectedNumber(weakness, 'breakPointsSavedPct'),
      bpConverted: expectedNumber(last5, 'bpConvertedPct') ?? expectedNumber(recent, 'bpConvertedPct') ?? expectedNumber(expectedStats, 'breakPointsConvertedPct') ?? expectedNumber(weakness, 'breakPointsConvertedPct'),
      last5,
      tournament
    }
  }
  const fallbackQualityPlayer = (player: AnyRecord) => {
    const warehousePlayer = warehousePlayerFor(player.name, player)
    const expectedStats = warehousePlayer?.expectedStats?.stats || {}
    const recentForm = warehousePlayer?.recentFormMetrics || null
    const recentSummary = Array.isArray(recentForm?.summary) ? recentForm.summary : []
    const recentMatches = Array.isArray(recentForm?.matches) ? recentForm.matches : []
    const metricValue = (key: string) => {
      const row = recentSummary.find((entry: AnyRecord) => entry.key === key)
      return Number.isFinite(Number(row?.score)) ? Number(row.score) : null
    }
    const sample = recentMatches.length || Number(recentForm?.coverage?.exactCells || 0)
    const winPct = metricValue('recent_win_pct')
    const gamePct = metricValue('recent_game_pct')
    const adjustedForm = metricValue('opponent_adjusted_form_score')
    const scorelineForm = metricValue('scoreline_form_score')
    const wins = winPct == null || !sample ? null : Math.round(winPct * sample)
    const ranking = player?.rank
      ? { rank: player.rank, tour: game?.stage?.includes('Women') ? 'WTA' : 'ATP' }
      : null
    const holdPct = derivedHoldPct(expectedStats)
    const secondServeWon = expectedNumber(expectedStats, 'secondServeWonPct')
    const bpConverted = expectedNumber(expectedStats, 'breakPointsConvertedPct')
    const unforcedErrors = expectedNumber(expectedStats, 'unforcedErrors')
    const winners = expectedNumber(expectedStats, 'winners')
    const doubleFaults = expectedNumber(expectedStats, 'avgDoubleFaults') ?? expectedNumber(expectedStats, 'doubleFaults')
    const errorScore =
      unforcedErrors != null || winners != null || doubleFaults != null
        ? Math.max(
            0,
            Math.min(
              100,
              72 -
                Math.max(0, (unforcedErrors ?? 26) / 2.6 - 8) * 4.2 -
                Math.max(0, (doubleFaults ?? 1.5) - 1.5) * 4 +
                Math.max(-10, Math.min(10, ((winners ?? 0) - (unforcedErrors ?? 0)) * 0.25))
            )
          )
        : null
    return {
      name: player.name,
      ranking,
      records: {
        overall2026: null,
        clay2026: null,
        raw: {}
      },
      recentWindow: {
        matches: sample || Number(expectedStats.matches) || warehousePlayer?.expectedStats?.matches || 0,
        completed: sample || Number(expectedStats.matches) || warehousePlayer?.expectedStats?.matches || 0,
        wins: wins ?? expectedNumber(expectedStats, 'wins'),
        losses: wins == null || !sample ? null : Math.max(0, sample - wins),
        gamePct,
        knownOpponentRanks: 0,
        missingOpponentRanks: 0,
        avgKnownOpponentRank: null,
        top50Opponents: null,
        resistanceMatches: null,
        scorelineFormScore: scorelineForm,
        opponentAdjustedFormScore: adjustedForm,
        rankingCoveragePct: null
      },
      serviceData: {
        source: recentForm?.source || 'TennisLive warehouse',
        matchesWithStats: sample || recentMatches.length,
        avgServiceHoldPct: null,
        avgAces: null,
        avgFirstServeWonPct: null,
        note: `TennisLive recent-five warehouse sample joined for ${sample || recentMatches.length} matches.`
      },
      expectedFallback: {
        hold: holdPct,
        secondServe: secondServeWon,
        errorControl: errorScore,
        returnPressure: bpConverted != null ? Math.max(0, Math.min(100, bpConverted * 0.86 + 18)) : null,
        closeout: holdPct != null || secondServeWon != null ? Math.max(0, Math.min(100, (holdPct ?? 66) * 0.55 + (secondServeWon ?? 48) * 0.35 + 8)) : null
      },
      recentMatches,
      warehouseStats: warehousePlayer
    }
  }
  const qualityPlayers = rawQualityPlayers.length
    ? rawQualityPlayers
    : (context?.players || []).map((player: AnyRecord) => fallbackQualityPlayer(player))
  const formatStatNumber = (value: number | null, suffix = '') =>
    value == null ? 'N/A' : `${formatNumber(value, Math.abs(value) >= 10 ? 1 : 1)}${suffix}`
  const buildEnsembleEvidenceBullets = () => {
    if (!ensembleValueCase) return []
    const existing = Array.isArray(ensembleValueCase.bullets) ? ensembleValueCase.bullets.filter(Boolean) : []
    if (existing.length) return existing
    const selectionStats = expectedStatsObjectForPlayer(ensembleValueCase.selection)
    const opponentStats = expectedStatsObjectForPlayer(ensembleValueCase.opponent)
    const bullets = []
    const selectionAces = expectedNumber(selectionStats, 'avgAces')
    const opponentAces = expectedNumber(opponentStats, 'avgAces')
    const selectionDfs = expectedNumber(selectionStats, 'avgDoubleFaults')
    const opponentDfs = expectedNumber(opponentStats, 'avgDoubleFaults')
    if (selectionAces != null || opponentAces != null || selectionDfs != null || opponentDfs != null) {
      bullets.push(
        `RG serve events: ${ensembleValueCase.selection} ${formatStatNumber(selectionAces)} aces / ${formatStatNumber(selectionDfs)} DFs vs ${ensembleValueCase.opponent} ${formatStatNumber(opponentAces)} aces / ${formatStatNumber(opponentDfs)} DFs.`
      )
    }
    const selectionFirst = expectedNumber(selectionStats, 'firstServeWonPct')
    const opponentFirst = expectedNumber(opponentStats, 'firstServeWonPct')
    const selectionSecond = expectedNumber(selectionStats, 'secondServeWonPct')
    const opponentSecond = expectedNumber(opponentStats, 'secondServeWonPct')
    if (selectionFirst != null || opponentFirst != null || selectionSecond != null || opponentSecond != null) {
      bullets.push(
        `Serve points won: ${ensembleValueCase.selection} 1st ${formatStatNumber(selectionFirst, '%')}, 2nd ${formatStatNumber(selectionSecond, '%')} vs ${ensembleValueCase.opponent} 1st ${formatStatNumber(opponentFirst, '%')}, 2nd ${formatStatNumber(opponentSecond, '%')}.`
      )
    }
    const selectionWinners = expectedNumber(selectionStats, 'winners')
    const opponentWinners = expectedNumber(opponentStats, 'winners')
    const selectionUnforced = expectedNumber(selectionStats, 'unforcedErrors')
    const opponentUnforced = expectedNumber(opponentStats, 'unforcedErrors')
    if (selectionWinners != null || opponentWinners != null || selectionUnforced != null || opponentUnforced != null) {
      bullets.push(
        `Winner/error profile: ${ensembleValueCase.selection} ${formatStatNumber(selectionWinners)} winners / ${formatStatNumber(selectionUnforced)} UEs vs ${ensembleValueCase.opponent} ${formatStatNumber(opponentWinners)} winners / ${formatStatNumber(opponentUnforced)} UEs.`
      )
    }
    return bullets
  }
  const playerWarehouseStats = (playerName: string) =>
    (warehouseContext?.players || []).find((entry: AnyRecord) => normalizeTennisName(entry.name) === normalizeTennisName(playerName))
      ?.stats || null
  const warehouseH2hLabel = () => {
    const h2h = warehouseContext?.h2h
    if (!h2h) return 'No H2H row'
    const hasHomeWins = Number.isFinite(Number(h2h.homeWins))
    const hasAwayWins = Number.isFinite(Number(h2h.awayWins))
    if (!hasHomeWins || !hasAwayWins) return 'No direct H2H record yet'
    const homeWins = Number(h2h.homeWins)
    const awayWins = Number(h2h.awayWins)
    return `${h2h.homeName || 'Home'} ${homeWins}-${awayWins} ${h2h.awayName || 'Away'}`
  }
  const renderH2hPanel = () => {
    const h2h = warehouseContext?.h2h || {}
    const h2hRows = h2h.matches || []
    const sourceRecord = clayMatchupData?.h2hRecord || clayMatchupData?.h2hText || warehouseH2hLabel()
    return (
      <article className="react-mini-panel tennis-h2h-panel">
        <div className="tennis-h2h-panel-top">
          <div>
            <span className="eyebrow">H2H</span>
            <strong>{sourceRecord || 'No H2H data'}</strong>
          </div>
          <small>
            {h2hRows.length
              ? `${h2hRows.length} dated row${h2hRows.length === 1 ? '' : 's'} | ${h2h.coverage?.surfaceRows || 0} with surface`
              : 'Aggregate only; no dated direct meetings found in source logs'}
          </small>
        </div>
        {h2hRows.length ? (
          <div className="tennis-h2h-table" role="table" aria-label="Head to head match history">
            <div className="tennis-h2h-row tennis-h2h-head" role="row">
              <span>Date</span>
              <span>Event</span>
              <span>Court</span>
              <span>Winner</span>
              <span>Score</span>
              <span>Wt</span>
            </div>
            {h2hRows.map((row: AnyRecord, index: number) => (
              <div className="tennis-h2h-row" role="row" key={`${game.id}-h2h-${row.isoDate || row.dateLabel || index}`}>
                <span>{row.dateLabel || row.isoDate || 'Date missing'}</span>
                <span>{row.event || 'Event missing'}</span>
                <span>{row.surface || 'Court missing'}</span>
                <span>{row.winnerName || 'Winner unclear'}</span>
                <span>{row.resultText || 'Score missing'}</span>
                <span>{Number.isFinite(Number(row.weight)) ? Number(row.weight).toFixed(2) : 'N/A'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="tennis-data-note">
            TennisLive currently exposes the matchup record but not a dated H2H ledger for this match. Direct
            meetings will populate here once they appear in the recent-match feed or a richer source payload.
          </p>
        )}
      </article>
    )
  }
  const weaknessRiskPct = (score: any) => {
    const numericScore = Number(score)
    if (!Number.isFinite(numericScore)) return null
    return Math.max(0, Math.min(100, Math.round((numericScore / 35) * 100)))
  }
  const weaknessRiskLabel = (score: any) => {
    const riskPct = weaknessRiskPct(score)
    if (riskPct == null) return 'No serve risk score'
    if (riskPct < 23) return 'Clean serve profile'
    if (riskPct < 43) return 'Mild serve risk'
    if (riskPct < 69) return 'Watch serve pressure'
    return 'Fragile serve profile'
  }
  const formatRecentScore = (match: AnyRecord) => {
    if (match?.score) return String(match.score)
    const tokens = match?.parsed?.scoreTokens
    if (Array.isArray(tokens) && tokens.length) {
      return tokens
        .map((token: AnyRecord) => {
          const left = token.leftGames
          const right = token.rightGames
          if (!Number.isFinite(Number(left)) || !Number.isFinite(Number(right))) return token.raw
          const raw = String(token.raw || '')
          const tiebreak = raw.match(/^\d+-\d+(\d+)$/)?.[1]
          return tiebreak ? `${left}-${right}(${tiebreak})` : `${left}-${right}`
        })
        .join(' ')
    }
    return String(match?.result || 'No score line')
      .replace(/^[A-Z]{3}\s+/, '')
      .replace(/\s+(?:1st|2nd|3rd|4th|QF|SF|F)$/i, '')
      .replace(/\b(\d)-(\d)(\d)\b/g, '$1-$2($3)')
      .replace(/\s+/g, ' ')
      .trim()
  }
  const formatRecentOutcome = (match: AnyRecord) => {
    const parsed = match?.parsed || {}
    if (parsed.walkover) return 'Walkover'
    if (parsed.retirement) return parsed.playerWon ? 'Won by retirement' : 'Lost by retirement'
    if (parsed.playerWon === true) return 'Win'
    if (parsed.playerWon === false) return 'Loss'
    if (/^w|win/i.test(match?.result || '')) return 'Win'
    if (/loss/i.test(match?.result || '')) return 'Loss'
    if (/^l|lost/i.test(match?.result || '')) return 'Loss'
    return 'Result'
  }
  const recentStatValue = (player: AnyRecord, match: AnyRecord, keys: string[], fallbackKey?: string) => {
    const stats = match?.serviceStats || match?.stats || {}
    for (const key of keys) {
      const value = stats?.[key]
      if (value !== undefined && value !== null && value !== '') {
        const numericValue = Number(value)
        if (key.toLowerCase().includes('pct') && Number.isFinite(numericValue)) return `${Math.round(numericValue)}%`
        return String(value)
      }
    }
    const fallbackValue = fallbackKey ? player?.serviceData?.[fallbackKey] : null
    if (fallbackValue !== undefined && fallbackValue !== null && fallbackValue !== '' && Number.isFinite(Number(fallbackValue))) {
      return `Avg ${Math.round(Number(fallbackValue))}${fallbackKey?.toLowerCase().includes('pct') ? '%' : ''}`
    }
    return 'No TennisLive stat row'
  }
  const numericStatValue = (match: AnyRecord, keys: string[]) => {
    const stats = match?.serviceStats || match?.stats || {}
    for (const key of keys) {
      const value = stats?.[key]
      if (value !== undefined && value !== null && value !== '') {
        const numericValue = Number(value)
        if (Number.isFinite(numericValue)) return numericValue
        const matchValue = String(value).match(/-?\d+(?:\.\d+)?/)
        if (matchValue) return Number(matchValue[0])
      }
    }
    return null
  }
  const fractionStatValue = (match: AnyRecord, labels: string[], directKeys: string[] = []) => {
    const stats = match?.serviceStats || match?.stats || {}
    for (const key of directKeys) {
      const value = stats?.[key]
      const matchValue = String(value || '').match(/(\d+)\s*\/\s*(\d+)/)
      if (matchValue) return { made: Number(matchValue[1]), attempts: Number(matchValue[2]) }
    }
    const row = (stats?.rows || []).find((entry: AnyRecord) =>
      labels.some((label) => String(entry?.label || '').toLowerCase().includes(label.toLowerCase()))
    )
    const matchValue = String(row?.value || '').match(/(\d+)\s*\/\s*(\d+)/)
    if (matchValue) return { made: Number(matchValue[1]), attempts: Number(matchValue[2]) }
    return null
  }
  const opponentRankWeight = (rank: any) => {
    const numericRank = Number(rank)
    if (!Number.isFinite(numericRank)) return 0.96
    if (numericRank <= 10) return 1.14
    if (numericRank <= 25) return 1.1
    if (numericRank <= 50) return 1.06
    if (numericRank <= 100) return 1.02
    if (numericRank <= 200) return 0.98
    return 0.94
  }
  const weightedAverage = (items: Array<{ value: number; weight: number }>) => {
    const clean = items.filter((item) => Number.isFinite(item.value) && Number.isFinite(item.weight) && item.weight > 0)
    const totalWeight = clean.reduce((sum, item) => sum + item.weight, 0)
    if (!totalWeight) return null
    return clean.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight
  }
  const finiteMetricNumber = (value: any) => {
    if (value === null || value === undefined || value === '') return null
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : null
  }
  const bubbleTone = (score: any) => {
    const numericScore = Number(score)
    if (!Number.isFinite(numericScore)) return 'missing'
    if (numericScore >= 68) return 'strong'
    if (numericScore >= 54) return 'ok'
    if (numericScore >= 42) return 'watch'
    return 'risk'
  }
  const bubbleLabel = (score: any) => {
    const numericScore = Number(score)
    if (!Number.isFinite(numericScore)) return 'No row'
    if (numericScore >= 68) return 'Strong'
    if (numericScore >= 54) return 'Playable'
    if (numericScore >= 42) return 'Watch'
    return 'Risk'
  }
  const tennisFormRows = [
    { key: 'hold', label: 'Hold' },
    { key: 'secondServe', label: '2nd' },
    { key: 'errorControl', label: 'Err' },
    { key: 'returnPressure', label: 'Ret' },
    { key: 'closeout', label: 'Close' }
  ]
  const formatTennisFormDate = (match: AnyRecord, index: number) => {
    const parsed = Date.parse(String(match?.date || '').replace(/(\d{2})$/, '20$1'))
    if (Number.isFinite(parsed)) {
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(parsed))
    }
    if (match?.date) return String(match.date).replace(/\s+26$/, '')
    return `Match ${index + 1}`
  }
  const expectedStatsForPlayer = (playerName: string) =>
    warehouseContext?.players?.find((entry: AnyRecord) => normalizeTennisName(entry.name) === normalizeTennisName(playerName))
      ?.expectedStats?.stats || null
  const warehouseFormMetricsForPlayer = (playerName: string) =>
    warehouseContext?.players?.find((entry: AnyRecord) => normalizeTennisName(entry.name) === normalizeTennisName(playerName))
      ?.recentFormMetrics || null
  const qualityPlayerFor = (playerName: string) =>
    rawQualityPlayers.find((entry: AnyRecord) => normalizeTennisName(entry.name) === normalizeTennisName(playerName)) || null
  const scoreValue = (score: number | null, estimated = false) => ({ score, estimated })
  const fallbackTennisFormScore = (expectedStats: AnyRecord | null, key: string) => {
    if (!expectedStats) return scoreValue(null)
    const hold = Number(expectedStats.holdPct)
    const firstWon = Number(expectedStats.firstServeWonPct)
    const firstIn = Number(expectedStats.firstServePct)
    const secondWon = Number(expectedStats.secondServeWonPct)
    const doubleFaults = Number(expectedStats.doubleFaults)
    const returnWon = Number(expectedStats.returnPointsWonPct)
    const bpConverted = Number(expectedStats.breakPointsConvertedPct)
    const winners = Number(expectedStats.winners)
    const unforced = Number(expectedStats.unforcedErrors)
    const dfPenalty = Number.isFinite(doubleFaults) ? Math.max(0, doubleFaults - 2.5) * 2.2 : 0
    if (key === 'hold' && (Number.isFinite(hold) || Number.isFinite(firstWon))) {
      return scoreValue(Math.max(0, Math.min(100, (Number.isFinite(hold) ? hold : 72) * 0.72 + (Number.isFinite(firstWon) ? firstWon : 64) * 0.22 + ((Number.isFinite(firstIn) ? firstIn : 60) - 60) * 0.1)), true)
    }
    if (key === 'secondServe' && (Number.isFinite(secondWon) || Number.isFinite(hold))) {
      return scoreValue(Math.max(0, Math.min(100, (Number.isFinite(secondWon) ? secondWon : 48) * 0.78 + (Number.isFinite(hold) ? hold : 72) * 0.22 - dfPenalty)), true)
    }
    if (key === 'errorControl' && (Number.isFinite(unforced) || Number.isFinite(doubleFaults) || Number.isFinite(winners))) {
      const winnerBalance = Number.isFinite(winners) && Number.isFinite(unforced) ? winners - unforced : 0
      return scoreValue(Math.max(0, Math.min(100, 72 - Math.max(0, (Number.isFinite(unforced) ? unforced / 2.6 : 10) - 8) * 4.2 - Math.max(0, (Number.isFinite(doubleFaults) ? doubleFaults / 2.6 : 1.5) - 1.5) * 4 + Math.max(-10, Math.min(10, winnerBalance * 0.25)))), true)
    }
    if (key === 'returnPressure' && (Number.isFinite(returnWon) || Number.isFinite(bpConverted))) {
      return scoreValue(Math.max(0, Math.min(100, (Number.isFinite(returnWon) ? returnWon : 34) * 1.28 + (Number.isFinite(bpConverted) ? bpConverted : 35) * 0.18 + 6)), true)
    }
    return scoreValue(null)
  }
  const buildTennisFormMatrix = (player: AnyRecord) => {
    const persistedForm = player?.warehouseStats?.recentFormMetrics || warehouseFormMetricsForPlayer(player.name)
    if (persistedForm?.matches?.length) {
      const hasMetricRows = (persistedForm.matches || []).some((entry: AnyRecord) => entry?.metrics)
      const persistedMatches = (persistedForm.matches || []).slice(0, 5).map((entry: AnyRecord, index: number) => {
        if (!hasMetricRows) {
          const resultText = String(entry.result || '')
          return {
            match: {
              opponent: entry.opponentName,
              event: entry.event,
              date: entry.isoDate || entry.matchDateLabel,
              surface: entry.surface,
              score: entry.score,
              result: entry.result
            },
            dateLabel: entry.matchDateLabel ? formatTennisFormDate({ date: entry.matchDateLabel }, index) : `Match ${index + 1}`,
            resultLabel: /^w|win/i.test(resultText) ? 'W' : /^l|loss|lost/i.test(resultText) ? 'L' : '?',
            weight: 1
          }
        }
        const rawRecent = entry?.metrics?.hold?.raw?.recent || entry?.metrics?.closeout?.raw?.recent || {}
        const metrics = tennisFormRows.reduce((acc: AnyRecord, row) => {
          const metric = entry.metrics?.[row.key] || {}
          const score = finiteMetricNumber(metric.score)
          acc[row.key] = {
            score,
            estimated: Boolean(metric.estimated),
            source: metric.source,
            weight: metric.weight
          }
          return acc
        }, {})
        return {
          ...metrics,
          match: {
            ...rawRecent,
            opponent: entry.opponentName || rawRecent.opponent,
            opponentRanking: {
              ...(rawRecent.opponentRanking || {}),
              rank: entry.opponentRank ?? rawRecent?.opponentRanking?.rank
            },
            event: entry.event || rawRecent.event,
            date: entry.dateLabel || rawRecent.date,
            surface: entry.surface
          },
          dateLabel: entry.dateLabel ? formatTennisFormDate({ date: entry.dateLabel }, Number(entry.recentIndex) || 0) : `Match ${(Number(entry.recentIndex) || 0) + 1}`,
          resultLabel: rawRecent?.parsed?.playerWon === true ? 'W' : rawRecent?.parsed?.playerWon === false ? 'L' : '?',
          weight: Number.isFinite(Number(entry.metrics?.hold?.weight)) ? Number(entry.metrics.hold.weight) : opponentRankWeight(entry.opponentRank)
        }
      })
      const summaryRows = hasMetricRows
        ? (persistedForm.summary || tennisFormRows)
        : (persistedForm.summary || []).map((row: AnyRecord) => ({
            key: row.key,
            label:
              row.key === 'recent_win_pct'
                ? 'Win rate'
                : row.key === 'recent_game_pct'
                  ? 'Game share'
                  : row.label || row.key,
            score:
              row.key === 'recent_win_pct' || row.key === 'recent_game_pct'
                ? Number(row.score) * 100
                : row.score
          }))
      return {
        sample: persistedMatches.length,
        exactCells: persistedForm.coverage?.exactCells ?? 0,
        estimatedRows: persistedForm.coverage?.estimatedCells ?? 0,
        missingCells: persistedForm.coverage?.missingCells ?? 0,
        persisted: true,
        sourceLabel: String(persistedForm.source || '').includes('tennislive') ? 'TennisLive warehouse' : 'Warehouse',
        compactRows: !hasMetricRows,
        matches: persistedMatches,
        summary: summaryRows.map((row: AnyRecord) => ({
          key: row.key,
          label: row.label,
          score: finiteMetricNumber(row.score) == null ? null : Math.round(Number(row.score))
        }))
      }
    }
    const recent = (player.recentMatches || []).slice(0, 5)
    const expectedStats = expectedStatsForPlayer(player.name)
    if (!recent.length && player.expectedFallback) {
      const fallbackMatch = {
        dateLabel: 'RG avg',
        resultLabel: 'Est',
        weight: 1,
        match: {
          opponent: 'Tournament sample',
          event: 'Roland Garros',
          date: '2026-05-30'
        },
        hold: scoreValue(finiteMetricNumber(player.expectedFallback.hold), true),
        secondServe: scoreValue(finiteMetricNumber(player.expectedFallback.secondServe), true),
        errorControl: scoreValue(finiteMetricNumber(player.expectedFallback.errorControl), true),
        returnPressure: scoreValue(finiteMetricNumber(player.expectedFallback.returnPressure), true),
        closeout: scoreValue(finiteMetricNumber(player.expectedFallback.closeout), true)
      }
      return {
        sample: 1,
        exactCells: 0,
        estimatedRows: tennisFormRows.filter((row) => fallbackMatch[row.key]?.score != null).length,
        missingCells: tennisFormRows.filter((row) => fallbackMatch[row.key]?.score == null).length,
        persisted: false,
        fallback: true,
        matches: [fallbackMatch],
        summary: tennisFormRows.map((row) => ({
          key: row.key,
          label: row.label,
          score: fallbackMatch[row.key]?.score == null ? null : Math.round(Number(fallbackMatch[row.key].score))
        }))
      }
    }
    const matchRows = recent.map((match: AnyRecord, index: number) => {
      const setsPlayed = Math.max(1, Number(match?.parsed?.setsPlayed || 0) || 1)
      const weight = opponentRankWeight(match?.opponentRanking?.rank)
      const firstServeWon = numericStatValue(match, ['firstServeWonPct', 'firstServePointsWon'])
      const firstServeIn = numericStatValue(match, ['firstServePct'])
      const secondServeWon = numericStatValue(match, ['secondServeWonPct'])
      const serviceHold = numericStatValue(match, ['holdPct', 'serviceHoldPct'])
      const returnPointsWon = numericStatValue(match, ['returnPointsWonPct'])
      const unforcedErrors = numericStatValue(match, ['unforcedErrors'])
      const doubleFaults = numericStatValue(match, ['doubleFaults'])
      const winners = numericStatValue(match, ['winners'])
      const converted = fractionStatValue(match, ['Break Points Converted'], ['breakPointsConverted'])
      const saved = fractionStatValue(match, ['Break Points Saved'], ['breakPointsSaved'])
      const breakChancesPerSet = converted ? converted.attempts / setsPlayed : null
      const breakConversionPct = converted && converted.attempts ? (converted.made / converted.attempts) * 100 : null
      const bpSavedPct = saved && saved.attempts ? (saved.made / saved.attempts) * 100 : numericStatValue(match, ['breakPointsSavedPct'])
      const ufePerSet = unforcedErrors != null ? unforcedErrors / setsPlayed : null
      const dfPerSet = doubleFaults != null ? doubleFaults / setsPlayed : null
      const winnerBalance = winners != null && unforcedErrors != null ? winners - unforcedErrors : null
      const parsed = match?.parsed || {}
      let closeout = null
      if (parsed.playerWon === true) {
        closeout = parsed.straightSetWin ? 78 : parsed.decidingSet ? 72 : 66
      } else if (parsed.playerWon === false) {
        closeout = parsed.straightSetLoss ? 28 : parsed.decidingSet ? 36 : 42
      }
      if (Number.isFinite(Number(serviceHold))) closeout = (closeout ?? 50) * 0.65 + Number(serviceHold) * 0.35
      if (Number.isFinite(Number(bpSavedPct))) closeout = (closeout ?? 50) + (Number(bpSavedPct) - 62) * 0.08

      const holdScore =
        serviceHold != null || firstServeWon != null
          ? scoreValue(Math.max(0, Math.min(100, (serviceHold ?? 72) * 0.72 + (firstServeWon ?? 64) * 0.22 + ((firstServeIn ?? 60) - 60) * 0.1)))
          : fallbackTennisFormScore(expectedStats, 'hold')
      const secondServeScore =
        secondServeWon != null || serviceHold != null
          ? scoreValue(Math.max(0, Math.min(100, (secondServeWon ?? 48) * 0.78 + (serviceHold ?? 72) * 0.22 - Math.max(0, (dfPerSet ?? 0) - 1.8) * 3.5)))
          : fallbackTennisFormScore(expectedStats, 'secondServe')
      const errorControlScore =
        ufePerSet != null || dfPerSet != null || winnerBalance != null
          ? scoreValue(Math.max(0, Math.min(100, 72 - Math.max(0, (ufePerSet ?? 10) - 8) * 4.2 - Math.max(0, (dfPerSet ?? 1.5) - 1.5) * 4 + Math.max(-10, Math.min(10, (winnerBalance ?? 0) * 0.45)))))
          : fallbackTennisFormScore(expectedStats, 'errorControl')
      const returnPressureScore =
        returnPointsWon != null || converted
          ? scoreValue(Math.max(0, Math.min(100, (returnPointsWon ?? 34) * 1.28 + (breakConversionPct ?? 35) * 0.18 + Math.min(18, (breakChancesPerSet ?? 1.2) * 5))))
          : fallbackTennisFormScore(expectedStats, 'returnPressure')

      return {
        match,
        dateLabel: formatTennisFormDate(match, index),
        resultLabel: match?.parsed?.playerWon === true ? 'W' : match?.parsed?.playerWon === false ? 'L' : '?',
        weight,
        hold: holdScore,
        secondServe: secondServeScore,
        errorControl: errorControlScore,
        returnPressure: returnPressureScore,
        closeout: scoreValue(closeout == null ? null : Math.max(0, Math.min(100, closeout)))
      }
    })
    const scoreFor = (key: string) => {
      const score = weightedAverage(
        matchRows
          .filter((row) => row[key as keyof typeof row]?.score != null)
          .map((row) => ({ value: Number(row[key as keyof typeof row].score), weight: row.weight }))
      )
      return score == null ? null : Math.round(score)
    }
    const sample = recent.length
    const serviceRows = recent.filter((match: AnyRecord) => match?.serviceStats || match?.stats).length
    const estimatedRows = matchRows.reduce((sum, row: AnyRecord) => sum + tennisFormRows.filter((metric) => row[metric.key]?.estimated).length, 0)
    return {
      sample,
      serviceRows,
      exactCells: serviceRows,
      estimatedRows,
      missingCells: 0,
      persisted: false,
      matches: matchRows,
      summary: [
        { key: 'hold', label: 'Hold', score: scoreFor('hold') },
        { key: 'secondServe', label: '2nd serve', score: scoreFor('secondServe') },
        { key: 'errorControl', label: 'Error control', score: scoreFor('errorControl') },
        { key: 'returnPressure', label: 'Return pressure', score: scoreFor('returnPressure') },
        { key: 'closeout', label: 'Closeout', score: scoreFor('closeout') }
      ]
    }
  }
  const renderTennisFormMatrix = (player: AnyRecord) => {
    const form = buildTennisFormMatrix(player)
    if (!form.sample) return null
    if (form.compactRows) {
      return (
        <div className="tennis-form-matrix" aria-label={`${player.name} recent TennisLive form`}>
          <div className="tennis-form-matrix-meta">
            <span>
              {form.sourceLabel || 'Warehouse'} | {form.sample} recent matches | {form.exactCells ?? 0} exact cells
            </span>
          </div>
          <div className="tennis-quality-metrics">
            {form.summary.map((row: AnyRecord) => (
              <div key={`${player.name}-${row.key}-summary`}>
                <span>{row.label}</span>
                <strong>{row.score == null ? 'N/A' : row.key?.includes('pct') ? formatPercent(row.score, 1) : formatNumber(row.score, 1)}</strong>
              </div>
            ))}
          </div>
        </div>
      )
    }
    const gridTemplateColumns = `52px repeat(${form.matches.length}, minmax(74px, 1fr))`
    return (
      <div className="tennis-form-matrix" aria-label={`${player.name} last ${form.sample} tennis form matrix`}>
        <div className="tennis-form-matrix-meta">
          <span>
            {form.sourceLabel || (form.persisted ? 'Warehouse' : form.fallback ? 'Expected fallback' : 'Live')} | {form.exactCells ?? 0} exact cells
            {form.estimatedRows ? ` | ${form.estimatedRows} est cells` : ''}
            {form.missingCells ? ` | ${form.missingCells} missing` : ''} | opponent adjusted
          </span>
        </div>
        <div className="tennis-form-matrix-scroll">
          <div className="tennis-form-matrix-grid">
            <div className="tennis-form-matrix-row tennis-form-matrix-header" style={{ gridTemplateColumns }}>
              <span className="tennis-form-matrix-label">Story</span>
              {form.matches.map((entry: AnyRecord, index: number) => (
                <span key={`${player.name}-form-date-${entry.dateLabel}-${index}`} className="tennis-form-matrix-date">
                  <strong>{entry.dateLabel}</strong>
                  <small>{entry.resultLabel}</small>
                </span>
              ))}
            </div>
            {tennisFormRows.map((row) => (
              <div key={`${player.name}-form-row-${row.key}`} className="tennis-form-matrix-row" style={{ gridTemplateColumns }}>
                <span className="tennis-form-matrix-label">{row.label}</span>
                {form.matches.map((entry: AnyRecord, index: number) => {
                  const metric = entry[row.key] || {}
                  const roundedScore = metric.score == null ? null : Math.round(Number(metric.score))
                  const tone = bubbleTone(roundedScore)
                  return (
                    <span
                      key={`${player.name}-${row.key}-${index}`}
                      className={`tennis-form-matrix-cell ${tone} ${metric.estimated ? 'estimated' : ''}`}
                      title={`${row.label}: ${roundedScore ?? 'No row'}${metric.estimated ? ' estimated from player recent averages' : ''} vs ${entry.match?.opponent || 'opponent'}`}
                    >
                      {roundedScore == null ? 'N/A' : `${metric.estimated ? '~' : ''}${roundedScore}`}
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  const renderRecentBubbleStrip = (player: AnyRecord) => {
    const qualityPlayer = player?.warehouseStats ? null : qualityPlayerFor(player.name)
    const form = buildTennisFormMatrix(player?.warehouseStats ? player : qualityPlayer || player)
    if (!form.sample) return null
    return (
      <div className="tennis-last-five-strip" aria-label={`${player.name} last ${form.sample} match expectation bubbles`}>
        <div className="tennis-last-five-meta">
          <span>Last {form.sample}</span>
          <small>{form.persisted ? 'TennisLive form' : form.fallback ? 'Estimated form' : 'TennisLive recent form'}</small>
        </div>
        <div className="tennis-last-five-bubbles">
          {form.matches.map((entry: AnyRecord, index: number) => {
            const metricScores = tennisFormRows
              .map((row) => finiteMetricNumber(entry[row.key]?.score))
              .filter((score) => score != null) as number[]
            const score = metricScores.length
              ? Math.round(metricScores.reduce((sum, value) => sum + value, 0) / metricScores.length)
              : null
            const tone = bubbleTone(score)
            return (
              <span
                key={`${game.id}-${player.name}-last-five-${entry.dateLabel}-${index}`}
                className={`tennis-last-five-bubble ${tone}`}
                title={`${entry.dateLabel}: ${bubbleLabel(score)}${score == null ? '' : ` (${score})`} vs ${entry.match?.opponent || 'opponent'}`}
              >
                <strong>{entry.resultLabel || '?'}</strong>
                <small>{entry.dateLabel}</small>
              </span>
            )
          })}
        </div>
      </div>
    )
  }
  const renderRecentMatchCard = (player: AnyRecord, match: AnyRecord, index: number, variant = 'quality') => {
    const rank = match.opponentRanking?.rank
    const rankLabel = Number.isFinite(Number(rank)) ? `#${rank}` : 'Rank pending'
    const identityLabel = formatIdentity(match.opponentRanking)
    const eventLabel = match.eventTier || match.event || 'Event missing'
    const outcome = formatRecentOutcome(match)
    const outcomeClass = outcome.toLowerCase().includes('win') ? 'positive' : outcome.toLowerCase().includes('loss') ? 'negative' : 'neutral'
    const statTiles = [
      { label: 'Aces', value: recentStatValue(player, match, ['aces', 'aceCount'], 'avgAces') },
      { label: 'DF', value: recentStatValue(player, match, ['doubleFaults'], 'avgDoubleFaults') },
      { label: '1st in', value: recentStatValue(player, match, ['firstServePct']) },
      { label: '1st won', value: recentStatValue(player, match, ['firstServeWonPct', 'firstServePointsWon'], 'avgFirstServeWonPct') },
      { label: '2nd won', value: recentStatValue(player, match, ['secondServeWonPct', 'secondServePointsWon'], 'avgSecondServeWonPct') },
      { label: 'BP won', value: recentStatValue(player, match, ['breakPointsConverted', 'breakPointsConvertedPct']) },
      { label: 'Return pts', value: recentStatValue(player, match, ['returnPointsWonPct', 'returnPointsWon']) },
      { label: 'Total pts', value: recentStatValue(player, match, ['totalPointsWonPct', 'totalPointsWon']) }
    ]
    const opponentName = match.opponent || match.opponentName || 'Opponent missing'
    const matchDate = match.date || match.isoDate || match.matchDateLabel
    return (
      <article key={`${player.name}-${variant}-${matchDate}-${opponentName}-${index}`} className="tennis-recent-card">
        <div className="tennis-recent-head">
          <div>
            <strong>{opponentName}</strong>
            <span>{rankLabel}</span>
          </div>
          <span className={`tennis-result-pill ${outcomeClass}`}>{outcome}</span>
        </div>
        <p className="tennis-recent-score">{formatRecentScore(match)}</p>
        <div className="tennis-recent-chip-row">
          <span>{identityLabel}</span>
          <span>{eventLabel}</span>
          {matchDate ? <span>{matchDate}</span> : null}
          {match.parsed?.decidingSet ? <span>Deciding set</span> : null}
          {match.parsed?.resistance ? <span>Pressure</span> : null}
        </div>
        <div className="tennis-recent-stat-grid tennislive-service-grid">
          {statTiles.map((tile) => (
            <div key={`${player.name}-${variant}-${matchDate}-${opponentName}-${tile.label}`}>
              <span>{tile.label}</span>
              <strong>{tile.value}</strong>
            </div>
          ))}
        </div>
      </article>
    )
  }
  const kalshiTradeCandidate = findKalshiTradeCandidateForGame(game)
  const kalshiTradeTier = kalshiTradeCandidate?.spikeModelTier || kalshiTradeCandidate?.candidateTier
  const kalshiTradeTarget = Number(kalshiTradeCandidate?.spikeModelTarget25x ?? kalshiTradeCandidate?.projectedExit ?? 0)
  const kalshiTradeEvPct = Number(kalshiTradeCandidate?.spikeModelEvPctOfEntry25x ?? kalshiTradeCandidate?.tradeEvPctOfEntry ?? 0)
  const kalshiTradeEv = Number(kalshiTradeCandidate?.spikeModelEv25x ?? kalshiTradeCandidate?.tradeEvPerContract ?? 0)
  const kalshiTradeHitProbability = Number(kalshiTradeCandidate?.spikeModelProbability25x ?? kalshiTradeCandidate?.targetHitProbability ?? 0)
  const kalshiPriceHistory = kalshiTradeCandidate?.kalshiPriceHistory || {}
  const sameFavoriteHistory = Array.isArray(kalshiPriceHistory.sameFavorite) ? kalshiPriceHistory.sameFavorite : []
  const similarEntryHistory = kalshiPriceHistory.similarEntry || {}
  const hasSimilarEntryHistory = Number(similarEntryHistory.n || 0) > 0
  const hasKalshiHistory = sameFavoriteHistory.length > 0 || hasSimilarEntryHistory
  const kalshiEntryCents = Math.round(Number(kalshiTradeCandidate?.yesAsk || 0) * 100)
  const kalshiTargetCents = Math.round(kalshiTradeTarget * 100)
  const kalshiTradeSummary = kalshiTradeCandidate
    ? `${kalshiTradeCandidate.selection}: ${kalshiEntryCents}c entry, ${kalshiTargetCents}c sell target, ${formatPercent(kalshiTradeHitProbability * 100, 0)} target-hit estimate.`
    : tradePlan
      ? 'No mapped Kalshi contract/history is attached to this match detail yet. Treat this lane as sportsbook context only.'
      : ''
  const bettingMatrix = Array.isArray(context?.bettingMatrix) ? context.bettingMatrix : []
  const bettingMatrixTone = (entry: AnyRecord) => {
    const grade = String(entry.grade || entry.valueGrade || '').toLowerCase()
    const edge = Number(entry.edgePct)
    const edgeGames = Number(entry.edgeGames)
    if (grade.includes('tax') || grade.includes('negative') || grade.includes('pass') || edge <= -4 || edgeGames <= -1) return 'warning'
    if (grade.includes('value') || grade.includes('actionable') || edge >= 7 || edgeGames >= 1) return 'accent'
    return ''
  }
  const hasNumber = (value: any) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
  const bettingMatrixPrice = (entry: AnyRecord) => {
    const pieces = []
    if (hasNumber(entry.line)) {
      const numericLine = Number(entry.line)
      pieces.push(entry.marketType === 'Game spread' && numericLine > 0 ? `+${entry.line}` : `${entry.line}`)
    }
    if (hasNumber(entry.americanOdds)) pieces.push(formatAmericanOdds(entry.americanOdds))
    return pieces.join(' ')
  }
  const pressureStats = Array.isArray(context?.players) ? context.players.map(pressureStatsForPlayer) : []
  const ensembleEvidenceBullets = buildEnsembleEvidenceBullets()
  return (
    <>
      {bettingMatrix.length ? (
        <section className="detail-panel tennis-betting-matrix-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Betting decision matrix</p>
            <span>ML, spread, total, set-win</span>
          </div>
          <div className="tennis-betting-matrix-grid">
            {bettingMatrix.map((entry: AnyRecord) => (
              <article key={`${game.id}-betting-matrix-${entry.label}`} className={`tennis-betting-matrix-card ${bettingMatrixTone(entry)}`}>
                <div className="tennis-betting-card-head">
                  <span className="eyebrow">{entry.label || entry.marketType}</span>
                  <strong>{entry.grade || entry.valueGrade || 'Price required'}</strong>
                </div>
                <div className="tennis-betting-mainline">
                  <strong>{entry.selection || 'No selection'}</strong>
                  {bettingMatrixPrice(entry) ? <span>{bettingMatrixPrice(entry)}</span> : null}
                </div>
                <div className="tennis-betting-number-grid">
                  {hasNumber(entry.modelPct) ? (
                    <div>
                      <span>Model</span>
                      <strong>{formatPercent(entry.modelPct, 1)}</strong>
                    </div>
                  ) : null}
                  {hasNumber(entry.impliedPct) ? (
                    <div>
                      <span>Implied</span>
                      <strong>{formatPercent(entry.impliedPct, 1)}</strong>
                    </div>
                  ) : null}
                  {hasNumber(entry.edgePct) ? (
                    <div>
                      <span>Edge</span>
                      <strong>{formatSignedNumber(entry.edgePct, 1)} pts</strong>
                    </div>
                  ) : null}
                  {hasNumber(entry.netEvPer100 ?? entry.evPer100) ? (
                    <div>
                      <span>EV/100</span>
                      <strong>{formatSignedNumber(entry.netEvPer100 ?? entry.evPer100, 1)}</strong>
                    </div>
                  ) : null}
                  {hasNumber(entry.expectedGames) ? (
                    <div>
                      <span>{entry.marketType === 'Game spread' ? 'Proj margin' : 'Exp games'}</span>
                      <strong>{formatNumber(entry.expectedGames, 1)}</strong>
                    </div>
                  ) : null}
                  {hasNumber(entry.edgeGames) ? (
                    <div>
                      <span>Game edge</span>
                      <strong>{formatSignedNumber(entry.edgeGames, 1)}</strong>
                    </div>
                  ) : null}
                  {hasNumber(entry.confidence) ? (
                    <div>
                      <span>Conf</span>
                      <strong>{formatPercent(entry.confidence, 0)}</strong>
                    </div>
                  ) : null}
                </div>
                {Array.isArray(entry.rows) && entry.rows.length ? (
                  <div className="tennis-set-win-row">
                    {entry.rows.map((row: AnyRecord) => (
                      <span key={`${game.id}-${entry.label}-${row.name}`}>
                        {row.name} <strong>{formatPercent(row.confidence, 0)}</strong>
                      </span>
                    ))}
                  </div>
                ) : null}
                <p>{entry.reason || entry.issue || 'No market-specific writeup stored yet.'}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {pressureStats.length ? (
        <section className="detail-panel tennis-pressure-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Serve + break pressure</p>
            <span>Hold, BP saved, BP converted</span>
          </div>
          <div className="tennis-pressure-grid">
            {pressureStats.map((player: AnyRecord) => (
              <article key={`${game.id}-pressure-${player.name}`} className="tennis-pressure-card">
                <div className="tennis-pressure-card-head">
                  <strong>{player.name}</strong>
                  <small>
                    {player.sample ? `${player.sample} match sample` : 'sample pending'}
                    {player.source ? ` | ${player.source}` : ''}
                  </small>
                </div>
                <div className="tennis-pressure-metrics">
                  <div>
                    <span>Hold</span>
                    <strong>{hasNumber(player.hold) ? formatPercent(player.hold, 1) : 'N/A'}</strong>
                  </div>
                  <div>
                    <span>BP saved</span>
                    <strong>{hasNumber(player.bpSaved) ? formatPercent(player.bpSaved, 1) : 'N/A'}</strong>
                  </div>
                  <div>
                    <span>BP conv</span>
                    <strong>{hasNumber(player.bpConverted) ? formatPercent(player.bpConverted, 1) : 'N/A'}</strong>
                  </div>
                </div>
                <div className="tennis-pressure-volume">
                  <div>
                    <span>Last 5 save</span>
                    <strong>{pressureLine(player.last5, 'save')}</strong>
                  </div>
                  <div>
                    <span>Last 5 convert</span>
                    <strong>{pressureLine(player.last5, 'convert')}</strong>
                  </div>
                  <div>
                    <span>Tourney save</span>
                    <strong>{pressureLine(player.tournament, 'save')}</strong>
                  </div>
                  <div>
                    <span>Tourney convert</span>
                    <strong>{pressureLine(player.tournament, 'convert')}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {kalshiTradeCandidate ? (
        <section className="detail-panel tennis-trade-chart-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Prediction market trade</p>
            <span>{kalshiTradeTier === 'trade' ? 'Model trade candidate' : `${kalshiTradeTier || 'watch'} lane`}</span>
          </div>
          <div className="tennis-trade-chart-layout">
            <div className="tennis-trade-ticket">
              <div className="tennis-trade-contract-id">
                <span className="eyebrow">Kalshi contract</span>
                <strong>{kalshiTradeCandidate.selection}</strong>
                <small>{kalshiTradeCandidate.eventTicker}</small>
              </div>
              <div className="tennis-trade-ticket-grid">
                <div>
                  <span>Entry</span>
                  <strong>{Math.round(Number(kalshiTradeCandidate.yesAsk || 0) * 100)}c</strong>
                </div>
                <div>
                  <span>Sell target</span>
                  <strong>{Math.round(kalshiTradeTarget * 100)}c</strong>
                </div>
                <div>
                  <span>EV/contract</span>
                  <strong>{formatSignedNumber(kalshiTradeEv * 100, 1)}c</strong>
                </div>
                <div>
                  <span>EV/entry</span>
                  <strong>{formatSignedNumber(kalshiTradeEvPct * 100, 0)}%</strong>
                </div>
              </div>
            </div>
            <div className="tennis-trade-context-grid">
              <div>
                <span>Spike model</span>
                <strong>{kalshiTradeTier || 'watch'}</strong>
                <small>{formatPercent(kalshiTradeHitProbability * 100, 0)} target-hit estimate</small>
              </div>
              <div>
                <span>Entry band</span>
                <strong>{kalshiTradeCandidate.entryBand || 'N/A'}</strong>
                <small>{Number(kalshiTradeCandidate.historicalN || 0)} historical comps</small>
              </div>
              <div>
                <span>Open interest</span>
                <strong>{formatNumber(kalshiTradeCandidate.openInterest, 0)}</strong>
                <small>Contract liquidity context</small>
              </div>
              <div>
                <span>Bid / ask</span>
                <strong>
                  {Math.round(Number(kalshiTradeCandidate.yesBid || 0) * 100)}c / {Math.round(Number(kalshiTradeCandidate.yesAsk || 0) * 100)}c
                </strong>
                <small>Current orderbook snapshot</small>
              </div>
            </div>
          </div>
          <div className="tennis-trade-summary-row">
            <span>
              Sell around <strong>{Math.round(kalshiTradeTarget * 100)}c</strong>
            </span>
            <span>
              Model target hit <strong>{formatPercent(kalshiTradeHitProbability * 100, 0)}</strong>
            </span>
            {kalshiTradeCandidate.projectionReasons?.slice(0, 2).map((reason: string) => (
              <span key={`${game.id}-${reason}`}>{reason}</span>
            ))}
          </div>
        </section>
      ) : null}

      {ensembleValueCase ? (
        <section className="detail-panel tennis-ensemble-case-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Ensemble value case</p>
            <span>{ensembleValueCase.grade || ensembleValueCase.riskGate || 'Model overlay'}</span>
          </div>
          <div className="tennis-ensemble-case-layout">
            <article className="tennis-ensemble-main">
              <div>
                <span className="eyebrow">Selection</span>
                <strong>{ensembleValueCase.selection}</strong>
                <small>{ensembleValueCase.headline}</small>
              </div>
              <p>{ensembleValueCase.useCase}</p>
            </article>
            <div className="tennis-ensemble-metrics">
              <div>
                <span>Model</span>
                <strong>{formatPercent(ensembleValueCase.modelProbability, 1)}</strong>
              </div>
              <div>
                <span>Data-only</span>
                <strong>{formatPercent(ensembleValueCase.dataOnlyProbability, 1)}</strong>
              </div>
              <div>
                <span>Market</span>
                <strong>{formatPercent(ensembleValueCase.marketProbability, 1)}</strong>
              </div>
              <div>
                <span>Net EV/100</span>
                <strong>{formatSignedNumber(ensembleValueCase.netEvPer100, 1)}</strong>
              </div>
            </div>
          </div>
          <div className="tennis-ensemble-odds-row">
            <span>
              Book <strong>{formatAmericanOdds(ensembleValueCase.marketOdds)}</strong>
            </span>
            <span>
              Fair <strong>{formatAmericanOdds(ensembleValueCase.fairOdds)}</strong>
            </span>
            <span>
              Gap <strong>{formatSignedNumber(ensembleValueCase.marketDisagreementPct, 1)} pts</strong>
            </span>
            <span>{ensembleValueCase.riskGate || 'risk gate pending'}</span>
          </div>
          {ensembleEvidenceBullets.length ? (
            <div className="tennis-ensemble-list-grid">
              <div>
                <span className="eyebrow">Why the model sees value</span>
                <ul className="factor-list compact">
                  {ensembleEvidenceBullets.map((line: string) => (
                    <li key={`${game.id}-ensemble-bullet-${line}`}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="eyebrow">What can break it</span>
                <ul className="factor-list compact">
                  {(ensembleValueCase.risks || []).map((line: string) => (
                    <li key={`${game.id}-ensemble-risk-${line}`}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {context?.players?.length ? (
        <section className="detail-panel react-card-grid">
          {context.players.map((player: AnyRecord) => (
            <article key={player.name} className="react-team-card">
              <div className="react-team-card-top">
                <div className="react-team-id">
                  <div>
                    <strong>{player.label}</strong>
                    <small>{player.record2026}</small>
                  </div>
                </div>
                <span className="builder-status-pill open">{player.marketLabel}</span>
              </div>
              <p>{player.clayLine}</p>
              {player.weakness ? (
                <div className="tennis-risk-meter">
                  <div className="tennis-risk-meter-head">
                    <span>Serve risk</span>
                    <strong>{weaknessRiskPct(player.weakness.weaknessScore) ?? 'N/A'}/100</strong>
                  </div>
                  <div className="meter-track volatility tennis-risk-track">
                    <span style={{ width: `${weaknessRiskPct(player.weakness.weaknessScore) ?? 0}%` }} />
                  </div>
                  <small>
                    {weaknessRiskLabel(player.weakness.weaknessScore)} | raw {player.weakness.weaknessScore ?? 'N/A'} internal
                    {player.weakness.avgDoubleFaults != null ? ` | double faults ${player.weakness.avgDoubleFaults}/match` : ''}
                    {player.weakness.secondServeWonPct != null ? ` | 2nd won ${player.weakness.secondServeWonPct}%` : ''}
                    {player.weakness.avgUnforcedErrors != null ? ` | unforced ${player.weakness.avgUnforcedErrors}/match` : ''}
                  </small>
                  <small>{player.weakness.firstGameComfort}</small>
                </div>
              ) : null}
              <small>{player.notes}</small>
              <p className="react-section-copy">{player.matchupNote}</p>
            </article>
          ))}
        </section>
      ) : null}

      {context?.comparisonRows?.length || weaknessEdge ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Matchup + risk</p>
            <span>{weaknessEdge?.edgeType || projection?.overview || 'Clay comparison board'}</span>
          </div>
          {context?.comparisonRows?.length ? (
            <div className="react-comparison-grid compact">
              {context.comparisonRows.map((row: AnyRecord) => {
                const max = Math.max(row.leftScore || 1, row.rightScore || 1, 1)
                return (
                  <article key={row.label} className="react-comparison-row">
                    <div className="react-comparison-meta">
                      <strong>{row.label}</strong>
                      <small>{row.metric}</small>
                    </div>
                    <div className="react-comparison-values">
                      <span>{row.leftLabel}</span>
                      <span>{row.rightLabel}</span>
                    </div>
                    <div className="react-comparison-bars">
                      <div className="react-comparison-bar">
                        <span style={{ width: `${Math.max(12, (row.leftScore / max) * 100)}%` }} />
                      </div>
                      <div className="react-comparison-bar right">
                        <span style={{ width: `${Math.max(12, (row.rightScore / max) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="react-comparison-scoreline">
                      <span>{row.leftScore}</span>
                      <span>{row.winner}</span>
                      <span>{row.rightScore}</span>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}
          {weaknessEdge ? (
            <div className="tennis-risk-strip">
              <div>
                <span className="eyebrow">Attack target</span>
                <strong>{weaknessEdge.target || 'No target'}</strong>
                <small>Gap {Number.isFinite(Number(weaknessEdge.scoreGap)) ? formatNumber(weaknessEdge.scoreGap, 0) : 'N/A'}</small>
              </div>
              <div>
                <span className="eyebrow">Entry trigger</span>
                <strong>{weaknessEdge.vulnerableSide || weaknessEdge.attackingSide || 'Wait'}</strong>
                <small>{weaknessEdge.liveTrigger}</small>
              </div>
              <div>
                <span className="eyebrow">Spread / total</span>
                <strong>{weaknessEdge.spreadRead}</strong>
                <small>{weaknessEdge.totalRead}</small>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {warehouseContext ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Warehouse match data</p>
            <span>{warehouseContext.source && !isBlockedTennisSource(warehouseContext.source) ? warehouseContext.source : 'TennisLive warehouse'}</span>
          </div>
          <div className="react-card-grid">
            <article className="react-mini-panel">
              <span className="eyebrow">Surface / H2H</span>
              <strong>{warehouseContext.surface || 'Surface pending'}</strong>
              <small>{warehouseH2hLabel()}</small>
            </article>
            <article className="react-mini-panel">
              <span className="eyebrow">Coverage</span>
              <strong>
                {Number(warehouseContext.coverage?.liveStatRows || warehouseContext.coverage?.playerStatRows || 0) > 0
                  ? `${warehouseContext.coverage?.liveStatRows || warehouseContext.coverage?.playerStatRows} live stat rows`
                  : Number(warehouseContext.coverage?.expectedStatRows || 0) > 0
                    ? `${warehouseContext.coverage.expectedStatRows} pregame stat fields`
                    : 'No stat pack joined'}
              </strong>
              <small>
                {Number(warehouseContext.coverage?.liveStatRows || warehouseContext.coverage?.playerStatRows || 0) > 0
                  ? 'In-match warehouse statistics joined'
                  : Number(warehouseContext.coverage?.expectedStatRows || 0) > 0
                    ? `Season aggregates joined; live stats ${warehouseContext.coverage?.liveStatsStatus || 'unavailable'} before first ball`
                    : warehouseContext.sourceUrl
                      ? 'Event mapped, stats unavailable'
                      : 'No event URL mapped'}
              </small>
            </article>
            <article className="react-mini-panel">
              <span className="eyebrow">Score state</span>
              <strong>
                {warehouseContext.score?.home?.current != null || warehouseContext.score?.away?.current != null
                  ? `${warehouseContext.score?.home?.current ?? 0}-${warehouseContext.score?.away?.current ?? 0}`
                  : 'Pregame / no score'}
              </strong>
              <small>{warehouseContext.tournament || 'Tournament row pending'}</small>
            </article>
          </div>
          {context?.players?.length ? (
            <div className="tennis-warehouse-grid">
              {context.players.map((player: AnyRecord) => {
                const stats = !isBlockedTennisSource(player.warehouseStats?.source) ? player.warehouseStats?.stats : null
                const rawExpectedStats = player.warehouseStats?.expectedStats || warehouseContext?.players
                  ?.find((entry: AnyRecord) => normalizeTennisName(entry.name) === normalizeTennisName(player.name))
                  ?.expectedStats
                const expectedStats = isBlockedTennisSource(rawExpectedStats?.source) ? null : rawExpectedStats
                const statRows = nonEmptyStatRows([
                  { label: 'Hold', value: statWithExpected(stats?.serviceGamesWon, expectedStats, 'holdPct', '%') },
                  { label: 'Return games', value: statWithExpected(stats?.returnGamesWon, expectedStats, 'returnGamesWonPct', '%') },
                  { label: 'Aces', value: statWithExpected(stats?.aces, expectedStats, 'aces') },
                  { label: 'DF', value: statWithExpected(stats?.doubleFaults, expectedStats, 'doubleFaults') },
                  { label: '1st won', value: statWithExpected(stats?.firstServeWonPct, expectedStats, 'firstServeWonPct', '%') },
                  { label: '2nd won', value: statWithExpected(stats?.secondServeWonPct, expectedStats, 'secondServeWonPct', '%') },
                  { label: '1st in', value: statWithExpected(stats?.firstServePct, expectedStats, 'firstServePct', '%') },
                  { label: 'Service pts', value: statWithExpected(stats?.servicePointsWon, expectedStats, 'servicePointsWonPct', '%') },
                  { label: 'BP saved', value: bpStatWithExpected(stats?.breakPointsSaved, expectedStats, 'breakPointsSavedPct', 'breakPointsSaved', 'breakPointsFaced') },
                  { label: 'BP converted', value: bpStatWithExpected(stats?.breakPointsConverted, expectedStats, 'breakPointsConvertedPct', 'breakPointsConverted', 'breakPointsToConvert') },
                  { label: 'Winners', value: statWithExpected(stats?.winners, expectedStats, 'winners') },
                  { label: 'Forced errors', value: statWithExpected(stats?.forcedErrors, expectedStats, 'forcedErrors') },
                  { label: 'Unforced', value: statWithExpected(stats?.unforcedErrors, expectedStats, 'unforcedErrors') },
                  { label: 'Return pts', value: statWithExpected(stats?.returnPointsWon, expectedStats, 'returnPointsWonPct', '%') }
                ])
                const expectationBubbles = expectationBubblesForPlayer(player, expectedStats)
                return (
                  <article key={`${game.id}-${player.name}-warehouse`} className="tennis-warehouse-card">
                    <div className="tennis-recent-head">
                      <div>
                        <strong>{player.name}</strong>
                        <span>
                          {compactRankIdentity(player)}
                        </span>
                        <span>
                          {player.warehouseStats?.recentFormMetrics?.matches?.length
                            ? `TennisLive recent ${player.warehouseStats.recentFormMetrics.matches.length}`
                            : expectedStats
                              ? `Pregame expected from ${expectedStats.matches || 0} TennisLive rows`
                              : 'TennisLive scoreline form only'}
                        </span>
                      </div>
                    </div>
                    {expectationBubbles.length ? (
                      <div className="tennis-expectation-strip" aria-label={`${player.name} expectation summary`}>
                        {expectationBubbles.map((bubble: AnyRecord) => {
                          const tone = expectationTone(bubble.score)
                          return (
                            <span
                              key={`${game.id}-${player.name}-expectation-${bubble.label}`}
                              className={`tennis-expectation-bubble ${tone}`}
                              title={`${bubble.label}: ${formatNumber(Number(bubble.score), 1)} from ${bubble.source}`}
                            >
                              <strong>{expectationLabel(bubble.score)}</strong>
                              <small>{bubble.label}</small>
                            </span>
                          )
                        })}
                      </div>
                    ) : null}
                    {renderTennisLiveFormChart(player)}
                    {renderRecentBubbleStrip(player)}
                    {statRows.length ? (
                      <div className="tennis-recent-stat-grid compact">
                        {statRows.slice(0, 6).map((row) => (
                          <div key={`${game.id}-${player.name}-stat-${row.label}`}>
                            <span>{row.label}</span>
                            <strong>{row.value}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="tennis-data-note">
                        No serve-event rows are warehoused for this player yet. Current card is using market, rank, and pressure context only.
                      </p>
                    )}
                    {expectedStats?.note ? <small className="tennis-data-note">{expectedStats.note}</small> : null}
                  </article>
                )
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {qualityPlayers.length ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">{matchSurface} court</p>
            <span>Model inputs from rank, form, and TennisLive warehouse rows</span>
          </div>
          {opponentQualityData?.matchupRead ? (
            <p className="react-section-copy">{opponentQualityData.matchupRead}</p>
          ) : null}
          <div className="react-card-grid tennis-quality-grid">
            {qualityPlayers.map((player: AnyRecord) => {
              const window = player.recentWindow || {}
              const clayRecord = player.records?.clay2026
              const overallRecord = player.records?.overall2026
              const adjustedScore = Number.isFinite(Number(window.opponentAdjustedFormScore))
                ? formatNumber(window.opponentAdjustedFormScore, 1)
                : 'Low coverage'
              return (
                <article key={`${game.id}-${player.name}-quality`} className="react-team-card tennis-quality-card">
                  <div className="react-team-card-top">
                    <div className="react-team-id">
                      <div>
                        <strong>{player.name}</strong>
                        <small>{formatRank(player)}</small>
                        <small>{formatIdentity(rankingForPlayer(player))}</small>
                      </div>
                    </div>
                    <span className="builder-status-pill open">
                      {Number.isFinite(Number(window.rankingCoveragePct))
                        ? `${Math.round(Number(window.rankingCoveragePct) * 100)}% ranked`
                        : 'No rank coverage'}
                    </span>
                  </div>

                  <div className="tennis-quality-metrics">
                    <div>
                      <span>2026 {String(matchSurface).toLowerCase()}</span>
                      <strong>{formatRecord(clayRecord)}</strong>
                    </div>
                    <div>
                      <span>Overall</span>
                      <strong>{formatRecord(overallRecord)}</strong>
                    </div>
                    <div>
                      <span>Recent W-L</span>
                      <strong>
                        {Number.isFinite(Number(window.wins)) && Number.isFinite(Number(window.losses))
                          ? `${window.wins}-${window.losses}`
                          : 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span>Game share</span>
                      <strong>{Number.isFinite(Number(window.gamePct)) ? formatPercent(Number(window.gamePct) * 100, 1) : 'N/A'}</strong>
                    </div>
                    <div>
                      <span>Top-50 opps</span>
                      <strong>{Number.isFinite(Number(window.top50Opponents)) ? window.top50Opponents : 'N/A'}</strong>
                    </div>
                    <div>
                      <span>Adj form</span>
                      <strong>{adjustedScore}</strong>
                    </div>
                  </div>

                  <p className="tennis-player-note">
                    Recent opponent sample: {window.knownOpponentRanks ?? 0}/{window.matches ?? 0} ranked
                    {Number.isFinite(Number(window.avgKnownOpponentRank))
                      ? ` | avg rank ${formatNumber(window.avgKnownOpponentRank, 1)}`
                      : ''}
                    {Number.isFinite(Number(window.resistanceMatches))
                      ? ` | ${window.resistanceMatches} pressure matches`
                      : ''}
                  </p>

                  {renderTennisFormMatrix(player)}

                  <div className="tennis-match-log">
                    {(player.recentMatches || []).slice(0, 5).map((match: AnyRecord, index: number) => renderRecentMatchCard(player, match, index))}
                  </div>

                  <small className="tennis-data-note">
                    {player.serviceData?.note ||
                      'TennisLive scoreline evidence is joined; service-event rows are hidden unless sourced from TennisLive.'}
                  </small>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}

      {tradePlan ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Trade lane</p>
            <span>
              {kalshiTradeCandidate
                ? `${kalshiTradeTier || 'watch'} | Kalshi mapped`
                : 'No Kalshi history mapped'}
            </span>
          </div>
          <p className="react-section-copy">{kalshiTradeSummary || tradePlan.summary}</p>
          <div className="react-card-grid">
            <article className="react-mini-panel">
              <span className="eyebrow">Entry contract</span>
              <strong>{kalshiTradeCandidate?.selection || tradePlan.entrySideName || 'Not mapped'}</strong>
              <small>
                {kalshiTradeCandidate
                  ? `${kalshiTradeCandidate.marketTicker || kalshiTradeCandidate.eventTicker || 'Kalshi ticker pending'}`
                  : `Market ${tradePlan.entryPricePct ?? tradePlan.dogMarketPct ?? 'N/A'}% vs ${tradePlan.otherSideName || tradePlan.favoriteName || 'other side'} ${tradePlan.otherSideMarketPct ?? tradePlan.favoriteMarketPct ?? 'N/A'}%`}
              </small>
            </article>
            <article className="react-mini-panel">
              <span className="eyebrow">Entry / exit</span>
              <strong>
                {kalshiTradeCandidate ? `${kalshiEntryCents}c -> ${kalshiTargetCents}c` : tradePlan.laneLabel}
              </strong>
              <small>
                {kalshiTradeCandidate
                  ? `${formatSignedNumber(kalshiTradeEvPct * 100, 0)}% EV/entry | ${formatSignedNumber(kalshiTradeEv * 100, 1)}c EV/contract`
                  : tradePlan.trigger}
              </small>
            </article>
            <article className="react-mini-panel">
              <span className="eyebrow">History check</span>
              <strong>
                {hasKalshiHistory
                  ? `${sameFavoriteHistory.length} same favorite | ${Number(similarEntryHistory.n || 0)} similar entry`
                  : 'No historical line rows'}
              </strong>
              <small>
                {hasSimilarEntryHistory
                  ? `${formatPercent(Number(similarEntryHistory.hit_2x || 0) * 100, 0)} hit 2x | avg max ${Math.round(Number(similarEntryHistory.avg_max_bid || 0) * 100)}c`
                  : sameFavoriteHistory[0]
                    ? `${sameFavoriteHistory[0].selection} ${Math.round(Number(sameFavoriteHistory[0].entry || 0) * 100)}c->${Math.round(Number(sameFavoriteHistory[0].maxBid || 0) * 100)}c`
                    : 'Do not force a trade without a mapped price-history comp.'}
              </small>
            </article>
          </div>
          {sameFavoriteHistory.length ? (
            <div className="tennis-trade-summary-row">
              {sameFavoriteHistory.slice(0, 3).map((row: AnyRecord) => (
                <span key={`${game.id}-same-favorite-${row.matchId || row.selection}`}>
                  {row.selection}: {Math.round(Number(row.entry || 0) * 100)}c to {Math.round(Number(row.maxBid || 0) * 100)}c |{' '}
                  {row.scoreline || row.match || 'prior comp'}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {marketEconomics?.players?.length ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Moneyline value math</p>
            <span>{marketEconomics.source || 'Market price'}</span>
          </div>
          <p className="react-section-copy">
            Confidence is the model win estimate. Implied is the sportsbook break-even price. Edge is model minus implied;
            negative edge means the pick can be likely to win and still be a bad ML bet.
          </p>
          <div className="react-card-grid">
            {marketEconomics.players.map((player: AnyRecord) => (
              <article
                key={`${game.id}-${player.name}-value`}
                className={`react-mini-panel ${marketValueTone(player.edgePct)}`}
              >
                <span className="eyebrow">{player.name}</span>
                <strong>{marketValueLabel(player.edgePct)}</strong>
                <small>
                  Model {formatPercent(player.modelPct, 1)} vs implied {formatPercent(player.impliedPct, 1)} ={' '}
                  {formatSignedNumber(player.edgePct, 1)} pts
                </small>
                <p className="react-section-copy">
                  {formatAmericanOdds(player.americanOdds)} | risk 100 to win{' '}
                  {Number.isFinite(Number(player.centsProfitIfWin))
                    ? `${formatNumber(player.centsProfitIfWin, 1)}`
                    : 'N/A'}
                  ; {player.priceBand || 'price band pending'}.
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {context?.valueBoard ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Bet-grade value board</p>
            <span>ML, spread, total, 1st set, set-win</span>
          </div>
          <p className="react-section-copy">
            {context.valueBoard.note || 'EV is profit per 100 risked from model probability vs posted odds.'}
          </p>
          <div className="tennis-value-detail-grid">
            {[context.valueBoard.ml, context.valueBoard.spread, context.valueBoard.total, context.valueBoard.firstSetTotal]
              .filter(Boolean)
              .map((entry: AnyRecord) => (
                <article
                  key={`${game.id}-value-board-${entry.marketType}`}
                  className={`react-mini-panel ${tennisValueTone(entry.valueGrade)}`}
                >
                  <span className="eyebrow">{entry.marketType}</span>
                  <strong>{entry.valueGrade || 'Value pending'}</strong>
                  <small>
                    {entry.selection || 'No bet'}
                    {Number.isFinite(Number(entry.line)) ? ` ${entry.line}` : ''}
                    {Number.isFinite(Number(entry.americanOdds)) ? ` ${formatAmericanOdds(entry.americanOdds)}` : ''}
                  </small>
                  <small>
                    Model {formatPercent(entry.modelPct, 1)}
                    {Number.isFinite(Number(entry.impliedPct)) ? ` vs implied ${formatPercent(entry.impliedPct, 1)}` : ''}
                    {Number.isFinite(Number(entry.edgePct)) ? ` | edge ${formatSignedNumber(entry.edgePct, 1)} pts` : ''}
                  </small>
                  {Number.isFinite(Number(entry.evPer100)) ? <p className="react-section-copy">EV {formatSignedNumber(entry.evPer100, 1)} per 100</p> : null}
                </article>
              ))}
            {(context.valueBoard.setWin || []).map((entry: AnyRecord) => (
              <article key={`${game.id}-set-win-${entry.name}`} className="react-mini-panel">
                <span className="eyebrow">Win a set</span>
                <strong>{entry.name}</strong>
                <small>{entry.confidence}% confidence | {entry.label}</small>
                <small>{entry.valueGrade || 'Needs posted price'}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {context?.derivativeMarkets?.length ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Derivative market reads</p>
            <span>ML, spread, and O/U</span>
          </div>
          <div className="react-card-grid">
            {context.derivativeMarkets.map((entry: AnyRecord) => (
              <article key={`${game.id}-${entry.label}-${entry.value}`} className={`react-mini-panel ${entry.tone || ''}`}>
                <span className="eyebrow">{entry.label}</span>
                <strong>{entry.lean}</strong>
                <small>
                  {entry.value}
                  {Number.isFinite(Number(entry.confidence)) ? ` | ${entry.confidence}% confidence` : ''}
                </small>
                {entry.valueGrade || Number.isFinite(Number(entry.evPer100)) ? (
                  <small>
                    {entry.valueGrade || 'Value pending'}
                    {Number.isFinite(Number(entry.edgePct)) ? ` | edge ${formatSignedNumber(entry.edgePct, 1)} pts` : ''}
                    {Number.isFinite(Number(entry.evPer100)) ? ` | EV ${formatSignedNumber(entry.evPer100, 1)} per 100` : ''}
                  </small>
                ) : null}
                <p className="react-section-copy">{entry.reason}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {clayMatchupData ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Surface matchup data</p>
            <span>Stored context only</span>
          </div>
          {clayMatchupData.players?.length ? (
            <>
              <div className="react-card-grid">
                {renderH2hPanel()}
                <article className="react-mini-panel">
                  <span className="eyebrow">Context call</span>
                  <strong>{clayMatchupData.prediction || 'No page prediction'}</strong>
                  <small>{clayMatchupData.sourceUrl ? 'Stored as context only; our prediction is the desk lean above.' : 'Source page missing.'}</small>
                </article>
                {clayMatchupData.tradeRead ? (
                  <article className="react-mini-panel">
                    <span className="eyebrow">Clay trade read</span>
                    <strong>{tradePlan?.laneLabel || 'Matchup lane'}</strong>
                    <small>{clayMatchupData.tradeRead}</small>
                  </article>
                ) : null}
              </div>

              <div className="react-card-grid">
                {clayMatchupData.players.map((player: AnyRecord) => (
                  <article key={player.name} className="react-team-card">
                    <div className="react-team-card-top">
                      <div className="react-team-id">
                        <div>
                          <strong>{player.name}</strong>
                          <small>2026 clay {player.record2026?.clay || 'N/A'}</small>
                        </div>
                      </div>
                    </div>
                    <div className="react-pill-row">
                      <span className="history-pill neutral">Overall {player.record2026?.overall || 'N/A'}</span>
                      <span className="history-pill neutral">Hard {player.record2026?.hard || 'N/A'}</span>
                      <span className="history-pill neutral">Clay {player.record2026?.clay || 'N/A'}</span>
                    </div>
                    <p className="tennis-data-note">
                      Recent opponent ranks and TennisLive service rows are shown in the surface section above after
                      warehouse enrichment. Raw context logs are kept out of this card when they do not carry joined
                      rank/profile/stat fields.
                    </p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="react-card-grid">
              <article className="react-mini-panel">
                <span className="eyebrow">Source status</span>
                <strong>Surface context unavailable</strong>
                <small>{clayMatchupData.error || 'Surface matchup data was unavailable for this match.'}</small>
              </article>
            </div>
          )}
        </section>
      ) : null}

      {projection ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Projected path</p>
            <span>{projection.projectedWinner}</span>
          </div>
          <div className="react-card-grid">
            <article className="react-mini-panel">
              <span className="eyebrow">Set line</span>
              <strong>{projection.projectedSetLine}</strong>
              <small>{projection.projectedScoreline}</small>
            </article>
            <article className="react-mini-panel">
              <span className="eyebrow">Total games</span>
              <strong>{projection.totalGames}</strong>
              <small>{projection.straightSetsProbability}% straight sets</small>
            </article>
            <article className="react-mini-panel">
              <span className="eyebrow">Volatility</span>
              <strong>{projection.upsetRisk}%</strong>
              <small>Upset risk</small>
            </article>
          </div>

          {projection.fantasy?.length ? (
            <>
              <p className="detail-note">
                PrizePicks style: 10 match points + 3/-3 per set won/lost + 1/-1 per game won/lost + 0.5 per ace - 0.5 per double fault.
              </p>
              <div className="react-prop-grid">
                {projection.fantasy.map((entry: AnyRecord) => (
                  <article key={entry.name} className="react-prop-card">
                    <div className="react-prop-head">
                      <strong>{entry.name}</strong>
                      <span>{entry.projectedFantasyScore}</span>
                    </div>
                    <p>PrizePicks fantasy</p>
                    <small>
                      {entry.projectedSetsWon}-{entry.projectedSetsLost} sets | {entry.projectedGamesWon}-{entry.projectedGamesLost} games
                    </small>
                    {entry.projectedAces != null || entry.projectedDoubleFaults != null ? (
                      <small>
                        {entry.projectedAces ?? 'n/a'} aces | {entry.projectedDoubleFaults ?? 'n/a'} double faults
                      </small>
                    ) : null}
                    <small>{entry.winPath}</small>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {game.playerAnalysis?.length ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Player analysis</p>
            <span>{game.analysis?.participant?.name} lean</span>
          </div>
          <ul className="factor-list compact">
            {game.playerAnalysis.map((line: string, index: number) => (
              <li key={`${game.id}-player-analysis-${index}`}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}

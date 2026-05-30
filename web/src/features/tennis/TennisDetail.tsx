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
  const warehouseContext = context?.warehouseContext || context?.sofascoreData
  const clayMatchupData = context?.clayMatchupData
  const opponentQualityData = context?.opponentQualityData
  const qualityPlayers = Array.isArray(opponentQualityData?.players) ? opponentQualityData.players : []
  const formatRecord = (record?: AnyRecord | null) => {
    if (!record || !Number.isFinite(Number(record.wins)) || !Number.isFinite(Number(record.losses))) return 'N/A'
    const pct = Number.isFinite(Number(record.winPct)) ? ` | ${formatPercent(Number(record.winPct) * 100, 1)}` : ''
    return `${record.wins}-${record.losses}${pct}`
  }
  const formatRank = (player: AnyRecord) => {
    const rank = player?.ranking?.rank
    return Number.isFinite(Number(rank)) ? `#${rank} ${player?.ranking?.tour || ''}`.trim() : 'Rank outside board'
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
  const expectedStatsObjectForPlayer = (playerName: string) =>
    warehouseContext?.players?.find((entry: AnyRecord) => normalizeTennisName(entry.name) === normalizeTennisName(playerName))
      ?.expectedStats?.stats || null
  const expectedNumber = (stats: AnyRecord | null | undefined, key: string) => {
    const value = stats?.[key]
    return Number.isFinite(Number(value)) ? Number(value) : null
  }
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
  const normalizeTennisName = (value: string) => {
    const normalized = String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, ' ')
      .trim()
      .toLowerCase()
    const aliases: Record<string, string> = {
      'xinyu wang': 'wang xinyu',
      'xiyu wang': 'wang xiyu',
      'yibing wu': 'wu yibing'
    }
    return aliases[normalized] || normalized
  }
  const playerWarehouseStats = (playerName: string) =>
    (warehouseContext?.players || []).find((entry: AnyRecord) => normalizeTennisName(entry.name) === normalizeTennisName(playerName))
      ?.stats || null
  const warehouseH2hLabel = () => {
    const h2h = warehouseContext?.h2h
    if (!h2h) return 'No SofaScore H2H row'
    const homeWins = Number.isFinite(Number(h2h.homeWins)) ? h2h.homeWins : 'N/A'
    const awayWins = Number.isFinite(Number(h2h.awayWins)) ? h2h.awayWins : 'N/A'
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
            SofaScore/Tennistonic currently expose the matchup record but not a dated H2H ledger for this match. Direct
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
    if (/loss/i.test(match?.result || '')) return 'Loss'
    return 'Result'
  }
  const recentStatValue = (player: AnyRecord, match: AnyRecord, keys: string[], fallbackKey?: string) => {
    const stats = match?.serviceStats || match?.flashscoreStats || match?.stats || {}
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
    return 'No FS row'
  }
  const numericStatValue = (match: AnyRecord, keys: string[]) => {
    const stats = match?.serviceStats || match?.flashscoreStats || match?.stats || {}
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
    const stats = match?.serviceStats || match?.flashscoreStats || match?.stats || {}
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
    const persistedForm = warehouseFormMetricsForPlayer(player.name)
    if (persistedForm?.matches?.length) {
      const persistedMatches = (persistedForm.matches || []).slice(0, 5).map((entry: AnyRecord) => {
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
      return {
        sample: persistedMatches.length,
        exactCells: persistedForm.coverage?.exactCells ?? 0,
        estimatedRows: persistedForm.coverage?.estimatedCells ?? 0,
        missingCells: persistedForm.coverage?.missingCells ?? 0,
        persisted: true,
        matches: persistedMatches,
        summary: (persistedForm.summary || tennisFormRows).map((row: AnyRecord) => ({
          key: row.key,
          label: row.label,
          score: finiteMetricNumber(row.score) == null ? null : Math.round(Number(row.score))
        }))
      }
    }
    const recent = (player.recentMatches || []).slice(0, 5)
    const expectedStats = expectedStatsForPlayer(player.name)
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
    const serviceRows = recent.filter((match: AnyRecord) => match?.serviceStats || match?.flashscoreStats || match?.stats).length
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
    const gridTemplateColumns = `52px repeat(${form.matches.length}, minmax(74px, 1fr))`
    return (
      <div className="tennis-form-matrix" aria-label={`${player.name} last ${form.sample} tennis form matrix`}>
        <div className="tennis-form-matrix-meta">
          <span>
            {form.persisted ? 'Warehouse' : 'Live'} | {form.exactCells ?? 0} exact cells
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
  const renderRecentMatchCard = (player: AnyRecord, match: AnyRecord, index: number, variant = 'quality') => {
    const rank = match.opponentRanking?.rank
    const rankLabel = Number.isFinite(Number(rank)) ? `#${rank}` : 'No live rank'
    const identityLabel = formatIdentity(match.opponentRanking)
    const eventLabel = match.eventTier || match.event || 'Event missing'
    const outcome = formatRecentOutcome(match)
    const outcomeClass = outcome.toLowerCase().includes('win') ? 'positive' : outcome.toLowerCase().includes('loss') ? 'negative' : 'neutral'
    const holdValue = recentStatValue(player, match, ['serviceGamesWon', 'holdPct', 'serviceHoldPct'], 'avgServiceHoldPct')
    const aceValue = recentStatValue(player, match, ['aces', 'aceCount'], 'avgAces')
    const firstServeWon = recentStatValue(player, match, ['firstServePointsWon', 'firstServeWonPct'], 'avgFirstServeWonPct')
    return (
      <article key={`${player.name}-${variant}-${match.date}-${match.opponent}-${index}`} className="tennis-recent-card">
        <div className="tennis-recent-head">
          <div>
            <strong>{match.opponent || 'Opponent missing'}</strong>
            <span>{rankLabel}</span>
          </div>
          <span className={`tennis-result-pill ${outcomeClass}`}>{outcome}</span>
        </div>
        <p className="tennis-recent-score">{formatRecentScore(match)}</p>
        <div className="tennis-recent-chip-row">
          <span>{identityLabel}</span>
          <span>{eventLabel}</span>
          {match.date ? <span>{match.date}</span> : null}
          {match.parsed?.decidingSet ? <span>Deciding set</span> : null}
          {match.parsed?.resistance ? <span>Pressure</span> : null}
        </div>
        <div className="tennis-recent-stat-grid">
          <div>
            <span>Hold</span>
            <strong>{holdValue}</strong>
          </div>
          <div>
            <span>Aces</span>
            <strong>{aceValue}</strong>
          </div>
          <div>
            <span>1st won</span>
            <strong>{firstServeWon}</strong>
          </div>
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
  const ensembleEvidenceBullets = buildEnsembleEvidenceBullets()
  return (
    <>
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
            <span>{warehouseContext.source || 'SofaScore / warehouse'}</span>
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
                  ? 'In-match SofaScore statistics joined'
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
                const stats = player.warehouseStats?.stats || playerWarehouseStats(player.name)
                const expectedStats = player.warehouseStats?.expectedStats || warehouseContext?.players
                  ?.find((entry: AnyRecord) => normalizeTennisName(entry.name) === normalizeTennisName(player.name))
                  ?.expectedStats
                return (
                  <article key={`${game.id}-${player.name}-warehouse`} className="tennis-warehouse-card">
                    <div className="tennis-recent-head">
                      <div>
                        <strong>{player.name}</strong>
                        <span>
                          {stats ? 'SofaScore actual ALL-period stats' : expectedStats ? `Pregame expected from ${expectedStats.matches || 0} recent rows` : 'Stat feed pending'}
                        </span>
                      </div>
                    </div>
                    <div className="tennis-recent-stat-grid">
                      <div>
                        <span>Aces</span>
                        <strong>{statWithExpected(stats?.aces, expectedStats, 'aces')}</strong>
                      </div>
                      <div>
                        <span>DF</span>
                        <strong>{statWithExpected(stats?.doubleFaults, expectedStats, 'doubleFaults')}</strong>
                      </div>
                      <div>
                        <span>1st won</span>
                        <strong>{statWithExpected(stats?.firstServeWonPct, expectedStats, 'firstServeWonPct', '%')}</strong>
                      </div>
                      <div>
                        <span>2nd won</span>
                        <strong>{statWithExpected(stats?.secondServeWonPct, expectedStats, 'secondServeWonPct', '%')}</strong>
                      </div>
                      <div>
                        <span>1st in</span>
                        <strong>{statWithExpected(stats?.firstServePct, expectedStats, 'firstServePct', '%')}</strong>
                      </div>
                      <div>
                        <span>Service pts</span>
                        <strong>{statWithExpected(stats?.servicePointsWon, expectedStats, 'servicePointsWonPct', '%')}</strong>
                      </div>
                      <div>
                        <span>BP saved</span>
                        <strong>{statWithExpected(stats?.breakPointsSaved, expectedStats, 'breakPointsSavedPct', '%')}</strong>
                      </div>
                      <div>
                        <span>BP converted</span>
                        <strong>{statWithExpected(stats?.breakPointsConverted, expectedStats, 'breakPointsConvertedPct', '%')}</strong>
                      </div>
                      <div>
                        <span>Winners</span>
                        <strong>{statWithExpected(stats?.winners, expectedStats, 'winners')}</strong>
                      </div>
                      <div>
                        <span>Forced errors</span>
                        <strong>{statWithExpected(stats?.forcedErrors, expectedStats, 'forcedErrors')}</strong>
                      </div>
                      <div>
                        <span>Unforced</span>
                        <strong>{statWithExpected(stats?.unforcedErrors, expectedStats, 'unforcedErrors')}</strong>
                      </div>
                      <div>
                        <span>Return pts</span>
                        <strong>{statWithExpected(stats?.returnPointsWon, expectedStats, 'returnPointsWonPct', '%')}</strong>
                      </div>
                    </div>
                    {expectedStats?.note ? <small className="tennis-data-note">{expectedStats.note}</small> : null}
                  </article>
                )
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {warehouseContext?.sofascoreSignals ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">SofaScore source signals</p>
            <span>Stored as context, not our pick</span>
          </div>
          <div className="react-card-grid">
            <article className="react-mini-panel">
              <span className="eyebrow">Crowd vote</span>
              <strong>
                {warehouseContext.sofascoreSignals.votes?.homeName || 'Home'} {formatPercent(warehouseContext.sofascoreSignals.votes?.homePct, 1)}
              </strong>
              <small>
                {warehouseContext.sofascoreSignals.votes?.awayName || 'Away'} {formatPercent(warehouseContext.sofascoreSignals.votes?.awayPct, 1)}
              </small>
            </article>
            <article className="react-mini-panel">
              <span className="eyebrow">Winning odds</span>
              <strong>
                {warehouseContext.sofascoreSignals.winningOdds?.home?.name || 'Home'} {formatPercent(warehouseContext.sofascoreSignals.winningOdds?.home?.expected, 0)}
              </strong>
              <small>
                {warehouseContext.sofascoreSignals.winningOdds?.away?.name || 'Away'} {formatPercent(warehouseContext.sofascoreSignals.winningOdds?.away?.expected, 0)}
              </small>
            </article>
            <article className="react-mini-panel">
              <span className="eyebrow">Tennis power</span>
              <strong>{warehouseContext.sofascoreSignals.tennisPower?.rows ?? 0} game-flow rows</strong>
              <small>
                Positive games: {warehouseContext.sofascoreSignals.tennisPower?.homePositiveGames ?? 0} / {warehouseContext.sofascoreSignals.tennisPower?.awayPositiveGames ?? 0}
              </small>
            </article>
          </div>
          <p className="react-section-copy">{warehouseContext.sofascoreSignals.note}</p>
        </section>
      ) : null}

      {qualityPlayers.length ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Clay evidence stack</p>
            <span>Our model input, not the source-site pick</span>
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
                        <small>{formatIdentity(player.ranking)}</small>
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
                      <span>2026 clay</span>
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
                      'Flashscore service hold, ace, and serve-point fields will appear here once that match stat feed is joined.'}
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
            <span>ML, spread, total, set-win</span>
          </div>
          <p className="react-section-copy">
            {context.valueBoard.note || 'EV is profit per 100 risked from model probability vs posted odds.'}
          </p>
          <div className="tennis-value-detail-grid">
            {[context.valueBoard.ml, context.valueBoard.spread, context.valueBoard.total]
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
            <p className="eyebrow">Clay matchup data</p>
            <span>Tennistonic source context</span>
          </div>
          {clayMatchupData.players?.length ? (
            <>
              <div className="react-card-grid">
                {renderH2hPanel()}
                <article className="react-mini-panel">
                  <span className="eyebrow">Source-site call</span>
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
                      Recent opponent ranks and Flashscore service rows are shown in the clay evidence stack above after
                      warehouse enrichment. Raw source-site match logs are kept out of this card because they do not
                      carry joined rank/profile/stat fields.
                    </p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="react-card-grid">
              <article className="react-mini-panel">
                <span className="eyebrow">Source status</span>
                <strong>Tennistonic did not load in time</strong>
                <small>{clayMatchupData.error || 'Clay matchup source data was unavailable for this match.'}</small>
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

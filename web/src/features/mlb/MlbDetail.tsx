type AnyRecord = Record<string, any>

type MlbDetailProps = Record<string, any>

const propTypeDisplayOrder = ['totalBases', 'pitcherStrikeouts', 'singles', 'walks'] as const

const propTypeLabels: Record<string, string> = {
  totalBases: 'Total bases',
  pitcherStrikeouts: 'Pitcher strikeouts',
  singles: 'Singles',
  walks: 'Walks',
  hits: 'Hits',
  rbi: 'RBIs',
  runs: 'Runs',
  hitRunRbi: 'H+R+RBI',
  hitsRunsRbis: 'H+R+RBI'
}

export function MlbDetail(props: MlbDetailProps) {
  const {
    game,
    activeDayId,
    activeKalshiMlbMarketByGame,
    buildBullpenPulseLine,
    buildEdgeHeadline,
    buildGameFlowOverview,
    buildLineupPlayerInspectionLine,
    buildMlbGameStory,
    buildPitcherSummary,
    buildPitcherTypeLabel,
    buildTeamContextSummary,
    buildTeamSnapshotChips,
    formatNumber,
    formatPercent,
    formatSignedNumber,
    getMetricTone,
    getTeamAccent,
    getTeamLogoUrl,
    kalshiMlbMarkets,
    lineupStatusLabel,
    MetricHelp,
    mlbHistoryWindowByKey,
    normalizeNameToken,
    renderMatchupInningHistory,
    renderPitcherStartHistory,
    renderRecentGamesStrip,
    renderRecentInningHistory,
    setMlbHistoryWindowByKey
  } = props


  const projection = game.analysis?.mlbProjection
  const kalshiContext = activeKalshiMlbMarketByGame[game.id] ?? null
  const allTrackedProps = game.playerProps?.targets ?? game.playerProps?.featured ?? []
  const propByTypeRaw = game.playerProps?.byType ?? {}
  const propByType =
    Object.keys(propByTypeRaw).length > 0
      ? propByTypeRaw
      : allTrackedProps.reduce((acc: Record<string, AnyRecord[]>, prop: AnyRecord) => {
          if (!prop?.propType) return acc
          if (!acc[prop.propType]) acc[prop.propType] = []
          acc[prop.propType].push(prop)
          return acc
        }, {})
  const propLaneSections = [
    ...propTypeDisplayOrder
      .map((propType) => ({
        propType,
        label: propTypeLabels[propType] ?? propType,
        picks: Array.isArray(propByType[propType]) ? [...propByType[propType]].slice(0, propType === 'pitcherStrikeouts' ? 2 : 2) : []
      }))
      .filter((lane) => lane.picks.length > 0),
    ...Object.entries(propByType)
      .filter(([propType]) => !propTypeDisplayOrder.includes(propType as (typeof propTypeDisplayOrder)[number]))
      .map(([propType, picks]) => ({
        propType,
        label: propTypeLabels[propType] ?? propType,
        picks: Array.isArray(picks) ? picks.slice(0, 2) : []
      }))
      .filter((lane) => lane.picks.length > 0)
  ]
  const findPitcherStrikeoutProp = (pitcherName: string) =>
    allTrackedProps.find(
      (prop: AnyRecord) =>
        prop.propType === 'pitcherStrikeouts' &&
        normalizeNameToken(prop.playerName) === normalizeNameToken(pitcherName)
    ) ?? null
  const formatXwoba = (value: unknown) => {
    const numberValue = Number(value)
    if (!Number.isFinite(numberValue)) return 'N/A'
    return numberValue.toFixed(3).replace(/^0/, '.')
  }
  const formatXwobaTrend = (value: unknown) => {
    const numberValue = Number(value)
    if (!Number.isFinite(numberValue)) return ''
    return `${numberValue >= 0 ? '+' : ''}${numberValue.toFixed(3).replace(/^(-?)0/, '$1.')}`
  }
  const xwobaTone = (value: unknown) => {
    const numberValue = Number(value)
    if (!Number.isFinite(numberValue)) return 'empty'
    if (numberValue >= 0.37) return 'strong'
    if (numberValue >= 0.32) return 'watch'
    return 'cold'
  }
  const renderLineupXwobaBubble = (player: AnyRecord) => {
    const statcast = player.statcastTrend || {}
    const trendLabel = formatXwobaTrend(statcast.xwobaTrend)
    return (
      <span
        className={`react-lineup-xwoba-bubble ${xwobaTone(statcast.rolling7Xwoba)}`}
        title={`7-game xwOBA ${formatXwoba(statcast.rolling7Xwoba)} | 30-day xwOBA ${formatXwoba(statcast.rolling30Xwoba)}${trendLabel ? ` | trend ${trendLabel}` : ''}`}
      >
        <strong>7g {formatXwoba(statcast.rolling7Xwoba)}</strong>
        <small>30d {formatXwoba(statcast.rolling30Xwoba)}{trendLabel ? ` · ${trendLabel}` : ''}</small>
      </span>
    )
  }
  const awayHold = Number(projection?.awayStarterHoldConfidence)
  const homeHold = Number(projection?.homeStarterHoldConfidence)
  const awayStarter = buildPitcherSummary(
    game.starterContext?.away,
    awayHold,
    game.stateContext?.firstInningPitcherSeason?.away ?? null,
    game.stateContext?.pitcherWar?.away ?? null,
    findPitcherStrikeoutProp(game.starterContext?.away?.fullName || '')
  )
  const homeStarter = buildPitcherSummary(
    game.starterContext?.home,
    homeHold,
    game.stateContext?.firstInningPitcherSeason?.home ?? null,
    game.stateContext?.pitcherWar?.home ?? null,
    findPitcherStrikeoutProp(game.starterContext?.home?.fullName || '')
  )
  const awayTeam = game.matchup?.[0]?.name ?? 'Away'
  const homeTeam = game.matchup?.[1]?.name ?? 'Home'
  const awayLineup = game.lineupBoard?.away
  const homeLineup = game.lineupBoard?.home
  const statMuseSeasonRows = (history: AnyRecord | null | undefined) =>
    Array.isArray(history?.seasons)
      ? history.seasons.filter((season: AnyRecord) => String(season?.year || '').trim())
      : []
  const formatStatMuseInnings = (value: unknown) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return String(value || '0.0')
    const whole = Math.floor(numeric)
    const partial = Math.round((numeric - whole) * 3)
    return `${whole}.${partial >= 0 && partial <= 2 ? partial : 0}`
  }
  const statMuseFallbackLine = (history: AnyRecord | null | undefined) => {
    if (!history) return ''
    const summary = String(history.summary || '').trim()
    if (summary) return summary
    return history.status === 'found'
      ? `${history.pitcherName || 'Starter'} vs ${history.opponentTeam || 'opponent'}: StatMuse table attached.`
      : `No StatMuse pitcher-vs-team table found for ${history.pitcherName || 'starter'} vs ${history.opponentTeam || 'opponent'}.`
  }
  const renderStatMusePitcherHistory = (
    label: string,
    history: AnyRecord | null | undefined,
    linkLabel: string
  ) => {
    if (!history) return null
    const seasons = statMuseSeasonRows(history)
    return (
      <div className="statmuse-history-card">
        <div className="statmuse-history-head">
          <strong>{label}</strong>
          {history.url ? (
            <a href={history.url} target="_blank" rel="noreferrer">
              {linkLabel}
            </a>
          ) : null}
        </div>
        {seasons.length ? (
          <div className="statmuse-season-list">
            {seasons.map((season: AnyRecord) => (
              <div key={`${label}-${season.year}`} className="statmuse-season-row">
                <strong>{season.year}</strong>
                <span>
                  {season.games || season.gamesStarted || 0} GS/app | {formatStatMuseInnings(season.ip ?? season.inningsPitched)} IP |{' '}
                  {formatNumber(season.era, 2)} ERA | {Number(season.so ?? season.strikeouts ?? season.k ?? 0)} K |{' '}
                  {Number(season.er ?? season.earnedRuns ?? 0)} ER | {Number(season.hr ?? season.homeRuns ?? 0)} HR |{' '}
                  {Number(season.bb ?? season.walks ?? 0)} BB
                </span>
              </div>
            ))}
          </div>
        ) : (
          <small>{statMuseFallbackLine(history)}</small>
        )}
      </div>
    )
  }
  const homeRunTargets = game.homeRunTargets?.featured ?? game.homeRunTargets?.targets ?? []
  const awayScript = projection?.teamScripts?.find((entry: AnyRecord) => entry.teamName === awayTeam)
  const homeScript = projection?.teamScripts?.find((entry: AnyRecord) => entry.teamName === homeTeam)
  const awaySummary = game.lineupBoard?.away?.summary ?? awayScript ?? {}
  const homeSummary = game.lineupBoard?.home?.summary ?? homeScript ?? {}
  const mergeBridgeChain = (primary: AnyRecord[] = [], fallback: AnyRecord[] = []) => {
    const fallbackByName = new Map(fallback.map((reliever: AnyRecord) => [reliever.name, reliever]))
    if (!primary.length) return fallback
    return primary.map((reliever: AnyRecord) => ({
      ...(fallbackByName.get(reliever.name) ?? {}),
      ...reliever
    }))
  }
  const awayBridge = mergeBridgeChain(
    projection?.awayLikelyRelievers?.length
      ? projection.awayLikelyRelievers
      : game.bullpenChainContext?.away?.topRelievers ?? [],
    awaySummary?.bullpenPitchTypeSummary?.relievers ?? []
  )
  const homeBridge = mergeBridgeChain(
    projection?.homeLikelyRelievers?.length
      ? projection.homeLikelyRelievers
      : game.bullpenChainContext?.home?.topRelievers ?? [],
    homeSummary?.bullpenPitchTypeSummary?.relievers ?? []
  )
  const awayBridgeScore = Number.isFinite(Number(projection?.awayBullpenChainScore))
    ? Number(projection?.awayBullpenChainScore)
    : Number(awaySummary?.bullpenPitchTypeSummary?.pressureIndex)
  const homeBridgeScore = Number.isFinite(Number(projection?.homeBullpenChainScore))
    ? Number(projection?.homeBullpenChainScore)
    : Number(homeSummary?.bullpenPitchTypeSummary?.pressureIndex)
  const awayRecentBullpenSummary = game.bullpenChainContext?.away?.recentBullpenSummary ?? null
  const homeRecentBullpenSummary = game.bullpenChainContext?.home?.recentBullpenSummary ?? null
  const getBridgeSourceLabel = (context: AnyRecord | null | undefined) =>
    /RP2/i.test(String(context?.chainSource || context?.source || ''))
      ? 'RP2 bridge projection'
      : 'bridge chain'
  const awayBridgeSourceLabel = getBridgeSourceLabel(game.bullpenChainContext?.away)
  const homeBridgeSourceLabel = getBridgeSourceLabel(game.bullpenChainContext?.home)
  const awaySeasonBullpenSummary = game.bullpenContext?.away ?? null
  const homeSeasonBullpenSummary = game.bullpenContext?.home ?? null
  const awayRelieverShadow = game.relieverShadowContext?.away ?? null
  const homeRelieverShadow = game.relieverShadowContext?.home ?? null
  const awayStory = game.storyContext?.away?.summary
  const homeStory = game.storyContext?.home?.summary
  const awayRecentGames = game.stateContext?.recentGames?.away ?? []
  const homeRecentGames = game.stateContext?.recentGames?.home ?? []
  const awayTeamState = game.stateContext?.teamState?.away ?? null
  const homeTeamState = game.stateContext?.teamState?.home ?? null
  const awayLineupConversion = game.stateContext?.lineupConversion?.away ?? null
  const homeLineupConversion = game.stateContext?.lineupConversion?.home ?? null
  const awayFirstInningTeam = game.stateContext?.firstInningTeam?.away ?? null
  const homeFirstInningTeam = game.stateContext?.firstInningTeam?.home ?? null
  const awaySnapshotChips = buildTeamSnapshotChips({
    teamState: awayTeamState,
    teamContext: game.teamContext?.away ?? null,
    lineupConversion: awayLineupConversion,
    offenseContext: game.offenseContext?.away ?? null,
    firstInningTeam: awayFirstInningTeam,
    seriesEarlyPhase: game.stateContext?.seriesEarlyPhase?.away ?? null,
    recentGames: awayRecentGames,
    opponentName: homeTeam
  })
  const homeSnapshotChips = buildTeamSnapshotChips({
    teamState: homeTeamState,
    teamContext: game.teamContext?.home ?? null,
    lineupConversion: homeLineupConversion,
    offenseContext: game.offenseContext?.home ?? null,
    firstInningTeam: homeFirstInningTeam,
    seriesEarlyPhase: game.stateContext?.seriesEarlyPhase?.home ?? null,
    recentGames: homeRecentGames,
    opponentName: awayTeam
  })
  const awayBullpenPulse = buildBullpenPulseLine(awayRecentBullpenSummary, awaySeasonBullpenSummary)
  const homeBullpenPulse = buildBullpenPulseLine(homeRecentBullpenSummary, homeSeasonBullpenSummary)
  const awayRecentInningHistory = game.stateContext?.recentInningHistory?.away ?? []
  const homeRecentInningHistory = game.stateContext?.recentInningHistory?.home ?? []
  const awayMatchupHistory = game.stateContext?.matchupInningHistory?.away ?? []
  const homeMatchupHistory = game.stateContext?.matchupInningHistory?.home ?? []
  const historyScopeKey = `${activeDayId}:${game.gamePk || `${awayTeam}-${homeTeam}`}`
  const getMlbHistoryWindow = (sectionKey: string, games: AnyRecord[]) => {
    const storedWindow = mlbHistoryWindowByKey[sectionKey] ?? 5
    if (storedWindow === 10 && games.length <= 5) return 5
    return storedWindow
  }
  const updateMlbHistoryWindow = (sectionKey: string, nextWindow: 5 | 10) => {
    setMlbHistoryWindowByKey((current) => ({ ...current, [sectionKey]: nextWindow }))
  }
  const renderStatmuseMatchupPanel = (starter: AnyRecord, teamName: string) => {
    if (!starter.statmuseLine) return null
    const summary = starter.statmuseSummaryStats ?? {}
    const summaryStats = [
      summary.record ? { label: 'REC', value: summary.record } : null,
      summary.era ? { label: 'ERA', value: summary.era } : null,
      Number.isFinite(Number(summary.strikeouts)) ? { label: 'SO', value: String(summary.strikeouts) } : null,
      Number.isFinite(Number(summary.appearances)) ? { label: 'APP', value: String(summary.appearances) } : null,
      summary.inningsPitched ? { label: 'IP', value: String(summary.inningsPitched) } : null
    ].filter(Boolean) as Array<{ label: string; value: string }>
    const seasonMetrics = (row: AnyRecord) => [
      { label: 'REC', value: row.record },
      { label: 'GS', value: row.gamesStarted },
      { label: 'ERA', value: row.era },
      { label: 'SO', value: row.strikeouts },
      { label: 'IP', value: row.inningsPitched },
      { label: 'H', value: row.hitsAllowed },
      { label: 'ER', value: row.earnedRuns },
      { label: 'R', value: row.runsAllowed },
      { label: 'HR', value: row.homeRunsAllowed },
      { label: 'BB', value: row.walks },
      { label: 'TBF', value: row.battersFaced }
    ].filter((entry) => entry.value !== '' && entry.value !== null && entry.value !== undefined)

    return (
      <div className="statmuse-matchup-panel">
        <div className="statmuse-matchup-head">
          <span>
            {starter.statmuseUrl ? (
              <a href={starter.statmuseUrl} target="_blank" rel="noreferrer">StatMuse</a>
            ) : (
              'StatMuse'
            )}
          </span>
          <strong>Career vs {summary.opponentTeam || 'opponent'}</strong>
        </div>
        {summaryStats.length ? (
          <div className="statmuse-summary-grid">
            {summaryStats.map((stat) => (
              <span key={`${teamName}-statmuse-summary-${stat.label}`} className="statmuse-stat-chip">
                <small>{stat.label}</small>
                <strong>{stat.value}</strong>
              </span>
            ))}
          </div>
        ) : (
          <small className="statmuse-empty-line">{starter.statmuseLine.replace(/^StatMuse\s+/, '')}</small>
        )}
        {(starter.statmuseSeasonRows ?? []).length ? (
          <div className="statmuse-season-list">
            {starter.statmuseSeasonRows.map((row: AnyRecord) => (
              <div key={`${teamName}-statmuse-${row.year}`} className="statmuse-season-row">
                <strong>{row.year}</strong>
                <div>
                  {seasonMetrics(row).map((stat) => (
                    <span key={`${teamName}-statmuse-${row.year}-${stat.label}`} className="statmuse-season-stat">
                      <small>{stat.label}</small>
                      <b>{stat.value}</b>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    )
  }
  const espnSplitColumns = (category: AnyRecord) => {
    const preferred =
      category.statType === 'battingAllowed'
        ? ['AB', 'R', 'H', '2B', '3B', 'HR', 'RBI', 'BB', 'HBP', 'SO', 'SB', 'CS', 'AVG', 'OBP', 'SLG', 'OPS']
        : ['ERA', 'W', 'L', 'GP', 'GS', 'IP', 'H', 'R', 'ER', 'HR', 'BB', 'K', 'OBA']
    const labels = Array.isArray(category.labels) ? category.labels : []
    return preferred.filter((label) => labels.includes(label))
  }
  const espnSplitValue = (row: AnyRecord, label: string) =>
    row?.stats?.find((stat: AnyRecord) => stat.label === label || stat.name === label)?.value ?? ''
  const formatSlashStat = (value: unknown) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return String(value || 'n/a')
    return numeric.toFixed(3).replace(/^(-?)0/, '$1')
  }
  const formatSignedSlashStat = (value: unknown) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return ''
    const absolute = Math.abs(numeric).toFixed(3).replace(/^0/, '.')
    return `${numeric >= 0 ? '+' : '-'}${absolute}`
  }
  const pitcherRightLeftRows = (starter: AnyRecord) => {
    const category = starter?.espnSplits?.categories?.find((entry: AnyRecord) => entry.key === 'byRightLeft')
    if (!category || !Array.isArray(category.rows)) return []
    return category.rows.map((row: AnyRecord) => ({
      label: row.label,
      atBats: espnSplitValue(row, 'AB'),
      avg: espnSplitValue(row, 'AVG') || espnSplitValue(row, 'OBA'),
      obp: espnSplitValue(row, 'OBP'),
      slg: espnSplitValue(row, 'SLG'),
      ops: espnSplitValue(row, 'OPS'),
      hr: espnSplitValue(row, 'HR'),
      bb: espnSplitValue(row, 'BB'),
      so: espnSplitValue(row, 'SO') || espnSplitValue(row, 'K')
    }))
  }
  const pitcherRightLeftStory = (starter: AnyRecord) => {
    const rows = pitcherRightLeftRows(starter)
    if (!rows.length) return ''
    const pitcherName = starter?.headline?.replace(/\s*\([LR?]HP\)$/, '') || starter?.fullName || 'Starter'
    return `${pitcherName}: ${rows
      .map((row) =>
        `${row.label.replace(/^vs\.\s*/i, 'vs ')} AVG ${row.avg || 'n/a'}${row.ops ? ` / OPS ${row.ops}` : ''}${row.hr ? ` / HR ${row.hr}` : ''}`
      )
      .join(' | ')}`
  }
  const renderPitcherRightLeftSummary = (starter: AnyRecord, teamName: string) => {
    const rows = pitcherRightLeftRows(starter)
    if (!rows.length) return null
    return (
      <div className="pitcher-lr-summary">
        <div className="pitcher-lr-summary-head">
          <strong>ESPN pitcher L/R split</strong>
          {starter.espnSplits?.sourceUrl ? (
            <a href={starter.espnSplits.sourceUrl} target="_blank" rel="noreferrer">
              source
            </a>
          ) : null}
        </div>
        <div className="pitcher-lr-row-grid">
          {rows.map((row) => (
            <span key={`${teamName}-pitcher-lr-${row.label}`} className="pitcher-lr-row">
              <small>{row.label}</small>
              <strong>{row.avg || 'n/a'} AVG{row.ops ? ` / ${row.ops} OPS` : ''}</strong>
              <em>{[row.atBats ? `${row.atBats} AB` : null, row.hr ? `${row.hr} HR` : null, row.so ? `${row.so} K` : null, row.bb ? `${row.bb} BB` : null].filter(Boolean).join(' | ')}</em>
            </span>
          ))}
        </div>
      </div>
    )
  }
  const hitterSplitForHand = (player: AnyRecord, pitcherHand: unknown) => {
    const hand = String(pitcherHand || player?.espnHitterSplit?.pitcherHand || '').toUpperCase().slice(0, 1)
    const splits = player?.espnHitterSplits || {}
    if (hand === 'L') return splits.vsLeft || player?.espnHitterSplit || null
    if (hand === 'R') return splits.vsRight || player?.espnHitterSplit || null
    return player?.espnHitterSplit || null
  }
  const renderHitterSplitLine = (split: AnyRecord | null | undefined) => {
    if (!split) return 'n/a'
    return [
      `AVG ${formatSlashStat(split.avg)}`,
      `OBP ${formatSlashStat(split.obp)}`,
      `SLG ${formatSlashStat(split.slg)}`,
      `OPS ${formatSlashStat(split.ops)}`
    ].join(' / ')
  }
  const renderBatterSplitModule = (player: AnyRecord, opposingStarterHand: unknown) => {
    const splits = player?.espnHitterSplits || {}
    const currentSplit = hitterSplitForHand(player, opposingStarterHand)
    const leftSplit = splits.vsLeft || null
    const rightSplit = splits.vsRight || null
    if (!currentSplit && !leftSplit && !rightSplit) return null
    const pitcherHand = String(opposingStarterHand || currentSplit?.pitcherHand || '').toUpperCase().slice(0, 1)
    const splitRows = [
      { key: 'L', label: 'vs LHP', split: leftSplit },
      { key: 'R', label: 'vs RHP', split: rightSplit }
    ].filter((entry) => entry.split)
    return (
      <div className="batter-split-strip">
        {currentSplit ? (
          <div className="batter-split-pill primary">
            <small>{currentSplit.label || (pitcherHand ? `vs ${pitcherHand}HP` : 'ESPN split')}</small>
            <strong>{renderHitterSplitLine(currentSplit)}</strong>
            <span>
              {[
                currentSplit.atBats != null ? `${currentSplit.atBats} AB` : null,
                currentSplit.homeRuns != null ? `${currentSplit.homeRuns} HR` : null,
                currentSplit.strikeouts != null ? `${currentSplit.strikeouts} K` : null,
                currentSplit.opsDeltaVsSeason != null ? `OPS delta ${formatSignedSlashStat(currentSplit.opsDeltaVsSeason)}` : null
              ].filter(Boolean).join(' | ')}
            </span>
          </div>
        ) : null}
        {splitRows.map((entry) => (
          <span
            key={`${player.playerId || player.name}-split-${entry.key}`}
            className={`batter-split-pill${entry.key === pitcherHand ? ' active' : ''}`}
          >
            <small>{entry.label}</small>
            <strong>AVG {formatSlashStat(entry.split.avg)} / OPS {formatSlashStat(entry.split.ops)}</strong>
            <em>{[entry.split.atBats != null ? `${entry.split.atBats} AB` : null, entry.split.homeRuns != null ? `${entry.split.homeRuns} HR` : null].filter(Boolean).join(' | ')}</em>
          </span>
        ))}
      </div>
    )
  }
  const renderEspnSplitTable = (starter: AnyRecord, teamName: string) => {
    const splitBlock = starter.espnSplits
    if (!splitBlock) return null
    const categories = Array.isArray(splitBlock.categories)
      ? splitBlock.categories.filter((category: AnyRecord) => Array.isArray(category.rows) && category.rows.length)
      : []
    const insights = Array.isArray(splitBlock.insights) ? splitBlock.insights.filter(Boolean).slice(0, 4) : []
    const sourceStatus = splitBlock.sourceStatus || ''
    if (!categories.length && sourceStatus !== 'fetched') {
      return (
        <div className="espn-splits-panel muted">
          <div className="espn-splits-head">
            <div>
              <span>ESPN splits</span>
              <strong>No split table available</strong>
            </div>
            <small>{sourceStatus || 'missing-source'}</small>
          </div>
        </div>
      )
    }
    return (
      <div className="espn-splits-panel">
        <div className="espn-splits-head">
          <div>
            <span>ESPN splits</span>
            <strong>{splitBlock.pitcherName || starter.headline.replace(/\s*\([LR?]HP\)$/, '')}</strong>
          </div>
          {splitBlock.sourceUrl ? (
            <a href={splitBlock.sourceUrl} target="_blank" rel="noreferrer">
              source
            </a>
          ) : (
            <small>{sourceStatus || 'stored'}</small>
          )}
        </div>
        {insights.length ? (
          <div className="espn-splits-insights">
            {insights.map((insight: string) => (
              <span key={`${teamName}-espn-insight-${insight}`}>{insight}</span>
            ))}
          </div>
        ) : null}
        <div className="espn-splits-group-list">
          {categories.map((category: AnyRecord) => {
            const columns = espnSplitColumns(category)
            if (!columns.length) return null
            return (
              <details
                key={`${teamName}-espn-splits-${category.key}`}
                className="espn-splits-group"
                open={['split', 'byBreakdown', 'byRightLeft', 'byArena', 'byInningPitches'].includes(category.key)}
              >
                <summary>
                  <strong>{category.label}</strong>
                  <small>{category.statType === 'battingAllowed' ? 'batting allowed' : 'pitching'}</small>
                </summary>
                <div className="espn-splits-table-scroll">
                  <table className="espn-splits-table">
                    <thead>
                      <tr>
                        <th>{category.label}</th>
                        {columns.map((label) => (
                          <th key={`${teamName}-${category.key}-${label}`}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {category.rows.map((row: AnyRecord) => (
                        <tr key={`${teamName}-${category.key}-${row.label}`}>
                          <td>{row.label}</td>
                          {columns.map((label) => (
                            <td key={`${teamName}-${category.key}-${row.label}-${label}`}>{espnSplitValue(row, label)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )
          })}
        </div>
      </div>
    )
  }
  const awayRecentHistoryKey = `${historyScopeKey}:away:recent`
  const awayMatchupHistoryKey = `${historyScopeKey}:away:matchup`
  const homeRecentHistoryKey = `${historyScopeKey}:home:recent`
  const homeMatchupHistoryKey = `${historyScopeKey}:home:matchup`
  const gameStory = buildMlbGameStory({ game, projection, awayTeam, homeTeam })
  const totals = projection?.totals
  const formatKalshiQuote = (row: AnyRecord | null | undefined) => {
    if (!row) return 'N/A'
    const yesAsk = Number(row.yesAskCents)
    const noAsk = Number(row.noAskCents)
    if (Number.isFinite(yesAsk) && Number.isFinite(noAsk)) return `${formatNumber(yesAsk, 0)}c / ${formatNumber(noAsk, 0)}c`
    if (Number.isFinite(yesAsk)) return `${formatNumber(yesAsk, 0)}c YES`
    if (Number.isFinite(noAsk)) return `${formatNumber(noAsk, 0)}c NO`
    return 'N/A'
  }
  const kalshiWinnerAway = kalshiContext?.winner?.rows?.find((row: AnyRecord) => row.side === 'away') ?? null
  const kalshiWinnerHome = kalshiContext?.winner?.rows?.find((row: AnyRecord) => row.side === 'home') ?? null
  const kalshiF5Away = kalshiContext?.first5Winner?.rows?.find((row: AnyRecord) => row.side === 'away') ?? null
  const kalshiF5Home = kalshiContext?.first5Winner?.rows?.find((row: AnyRecord) => row.side === 'home') ?? null
  const kalshiF5Tie = kalshiContext?.first5Winner?.rows?.find((row: AnyRecord) => row.side === 'tie') ?? null
  const kalshiTotal = kalshiContext?.total?.selected ?? null
  const kalshiFirstInning = kalshiContext?.firstInning ?? null
  const kalshiFirst5Total = kalshiContext?.first5Total?.selected ?? null
  const kalshiSpread = kalshiContext?.spread?.selected ?? null
  const totalAddendumChips = (lean: AnyRecord | null | undefined) => {
    const metrics = lean?.chaosGate?.metrics || lean?.tailOverlay?.metrics || {}
    return [
      Number(metrics.hrForce) >= 1.4 ? `ENV HRF ${formatNumber(metrics.hrForce, 1)}` : null,
      Number(metrics.ficHrForce) >= 1.4 ? `FIC HRF ${formatNumber(metrics.ficHrForce, 1)}` : null,
      metrics.materialHrForce ? 'Material HRF' : null,
      Number.isFinite(Number(metrics.envRunDelta)) && Math.abs(Number(metrics.envRunDelta)) >= 0.2
        ? `ENV ${formatSignedNumber(metrics.envRunDelta, 1)}R`
        : null,
      metrics.rp2LateRunRisk && Number.isFinite(Number(metrics.maxRp2BridgeStress))
        ? `RP2 bridge ${formatNumber(metrics.maxRp2BridgeStress, 0)}`
        : null,
      lean?.chaosGate?.vetoKind === 'addendum' ? 'ENV/RP2 veto' : null,
      lean?.chaosGate?.warning && lean?.chaosGate?.vetoKind !== 'addendum' ? 'Addendum warning' : null
    ].filter(Boolean).slice(0, 5)
  }
  const adjustmentChecklist = projection?.adjustmentChecklist ?? null
  const compactFlags = (items: Array<string | null | undefined>, limit = 3) =>
    items
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, limit)
  const adjustmentCards = adjustmentChecklist
    ? [
        adjustmentChecklist.environment
          ? {
              id: 'environment',
              title: 'Environment carry',
              value: adjustmentChecklist.environment.materialHrForce
                ? `HRF ${formatNumber(adjustmentChecklist.environment.hrForce, 1)} material`
                : adjustmentChecklist.environment.hrForce != null
                  ? `HRF ${formatNumber(adjustmentChecklist.environment.hrForce, 1)}`
                  : 'Neutral',
              meta: [
                `x${formatNumber(adjustmentChecklist.environment.carryMultiplier, 2)} carry`,
                `${formatSignedNumber(adjustmentChecklist.environment.hitDelta, 1)} H`,
                `${formatSignedNumber(adjustmentChecklist.environment.runDelta, 1)} R`
              ].join(' | '),
              flags: compactFlags([
                ...(adjustmentChecklist.environment.flags ?? []),
                ...(adjustmentChecklist.environment.reasons ?? [])
              ], 4)
            }
          : null,
        Array.isArray(adjustmentChecklist.relief) && adjustmentChecklist.relief.length
          ? {
              id: 'relief',
              title: 'Available bullpen',
              value: adjustmentChecklist.relief
                .map((row: AnyRecord) =>
                  `${row.teamName} ${formatNumber(row.projectedReliefRunsAllowed, 1)} -> ${formatNumber(row.adjustedProjectedReliefRunsAllowed, 1)} R`
                )
                .join(' / '),
              meta: adjustmentChecklist.relief
                .map((row: AnyRecord) =>
                  `${row.teamName} avail ${row.leverageAvailabilityScore != null ? formatNumber(row.leverageAvailabilityScore, 0) : 'n/a'}`
                )
                .join(' | '),
              flags: compactFlags(adjustmentChecklist.relief.flatMap((row: AnyRecord) => row.flags ?? []), 4)
            }
          : null,
        Array.isArray(adjustmentChecklist.starters) && adjustmentChecklist.starters.length
          ? {
              id: 'starters',
              title: 'Pitcher checklist',
              value: adjustmentChecklist.starters
                .map((row: AnyRecord) => `${row.pitcherName || row.teamName}: ${row.gamesStarted ?? 'n/a'} GS`)
                .join(' / '),
              meta: adjustmentChecklist.starters
                .map((row: AnyRecord) => `${row.teamName} ${row.profileType || 'starter'}`)
                .join(' | '),
              flags: compactFlags(adjustmentChecklist.starters.flatMap((row: AnyRecord) => row.flags ?? []), 5)
            }
          : null,
        Array.isArray(adjustmentChecklist.handednessSplits) && adjustmentChecklist.handednessSplits.length
          ? {
              id: 'handedness-splits',
              title: 'Handedness splits',
              value: adjustmentChecklist.handednessSplits
                .map((row: AnyRecord) =>
                  `${row.teamName} ${row.handednessSplitIndex != null ? formatNumber(row.handednessSplitIndex, 0) : 'n/a'} vs ${row.opposingStarterHand || 'SP'}`
                )
                .join(' / '),
              meta: adjustmentChecklist.handednessSplits
                .map((row: AnyRecord) =>
                  `${row.teamName} ${formatSignedNumber(row.hitDelta, 1)} H / ${row.strongSplitCount ?? 0} strong, ${row.weakSplitCount ?? 0} weak`
                )
                .join(' | '),
              flags: compactFlags(adjustmentChecklist.handednessSplits.flatMap((row: AnyRecord) => row.flags ?? []), 6)
            }
          : null,
        Array.isArray(adjustmentChecklist.starterMatchupKernels) && adjustmentChecklist.starterMatchupKernels.length
          ? {
              id: 'starter-matchup-kernel',
              title: 'Starter matchup kernel',
              value: adjustmentChecklist.starterMatchupKernels
                .map((row: AnyRecord) =>
                  `${row.teamName} ${row.starterMatchupKernelIndex != null ? formatNumber(row.starterMatchupKernelIndex, 0) : 'n/a'} vs ${row.opposingStarter || 'SP'}`
                )
                .join(' / '),
              meta: adjustmentChecklist.starterMatchupKernels
                .map((row: AnyRecord) => {
                  const topBat = Array.isArray(row.topHitters) && row.topHitters[0]?.name ? row.topHitters[0].name : 'no clear edge bat'
                  const riskBat = Array.isArray(row.riskHitters) && row.riskHitters[0]?.name ? row.riskHitters[0].name : 'no clear risk bat'
                  return `${row.teamName} ${row.favorableCount ?? 0} up, ${row.suppressedCount ?? 0} down, ESPN ${row.espnSplitEdgeCount ?? 0}/${row.espnSplitRiskCount ?? 0} | ${topBat} / ${riskBat}`
                })
                .join(' | '),
              flags: compactFlags(adjustmentChecklist.starterMatchupKernels.flatMap((row: AnyRecord) => row.flags ?? []), 6)
            }
          : null,
        Array.isArray(adjustmentChecklist.batters) && adjustmentChecklist.batters.length
          ? {
              id: 'batters',
              title: 'Batter/BvP carry',
              value: adjustmentChecklist.batters
                .map((row: AnyRecord) => `${row.teamName} HRF ${row.maxHrForce != null ? formatNumber(row.maxHrForce, 1) : 'n/a'}`)
                .join(' / '),
              meta: adjustmentChecklist.batters
                .map((row: AnyRecord) => `${row.teamName} ${formatSignedNumber(row.hitDelta, 1)} H / ${formatSignedNumber(row.runDelta, 1)} R`)
                .join(' | '),
              flags: compactFlags(adjustmentChecklist.batters.flatMap((row: AnyRecord) => row.flags ?? []), 4)
            }
          : null
      ].filter(Boolean)
    : []
  const handednessStoryCards = adjustmentChecklist
    ? [
        Array.isArray(adjustmentChecklist.handednessSplits) && adjustmentChecklist.handednessSplits.length
          ? {
              label: 'RH/LH lineup fit',
              tone: 'info',
              body: adjustmentChecklist.handednessSplits
                .map((row: AnyRecord) => {
                  const ops = row.topSixSplitOpsAverage ?? row.splitOpsAverage
                  const avg = row.topSixSplitAvgAverage ?? row.splitAvgAverage
                  const flags = compactFlags(row.flags ?? [], 1)
                  return `${row.teamName}: ${row.handednessSplitIndex != null ? formatNumber(row.handednessSplitIndex, 0) : 'n/a'}/100 vs ${row.opposingStarterHand || 'SP'}HP, AVG ${formatSlashStat(avg)}, OPS ${formatSlashStat(ops)}, ${row.strongSplitCount ?? 0} strong / ${row.weakSplitCount ?? 0} weak${flags.length ? ` (${flags[0]})` : ''}`
                })
                .join(' | ')
            }
          : null,
        [pitcherRightLeftStory(awayStarter), pitcherRightLeftStory(homeStarter)].filter(Boolean).length
          ? {
              label: 'Starter L/R allowed',
              tone: 'warning',
              body: [pitcherRightLeftStory(awayStarter), pitcherRightLeftStory(homeStarter)].filter(Boolean).join(' | ')
            }
          : null,
        Array.isArray(adjustmentChecklist.starterMatchupKernels) && adjustmentChecklist.starterMatchupKernels.length
          ? {
              label: 'Batter matchup kernel',
              tone: 'accent',
              body: adjustmentChecklist.starterMatchupKernels
                .map((row: AnyRecord) => {
                  const topHitters = Array.isArray(row.topHitters)
                    ? row.topHitters.slice(0, 2).map((hitter: AnyRecord) => hitter.name).filter(Boolean).join(', ')
                    : ''
                  const riskHitters = Array.isArray(row.riskHitters)
                    ? row.riskHitters.slice(0, 2).map((hitter: AnyRecord) => hitter.name).filter(Boolean).join(', ')
                    : ''
                  return `${row.teamName}: kernel ${row.starterMatchupKernelIndex != null ? formatNumber(row.starterMatchupKernelIndex, 0) : 'n/a'}/100 vs ${row.opposingStarter || 'SP'}, ${row.favorableCount ?? 0} favorable / ${row.suppressedCount ?? 0} suppressed, ESPN split edges ${row.espnSplitEdgeCount ?? 0}-${row.espnSplitRiskCount ?? 0}${topHitters ? `; bats up: ${topHitters}` : ''}${riskHitters ? `; risk: ${riskHitters}` : ''}`
                })
                .join(' | ')
            }
          : null
      ].filter(Boolean)
    : []
  const totalsCards = totals
    ? [
        {
          id: 'full',
          title: 'Full game',
          lean: totals.fullGame,
          lineLabel: projection?.postedTotal != null ? `${projection.postedTotal}` : 'N/A',
          projectedLabel: `${formatNumber(totals.projectedFullTotalRuns, 1)} projected runs`,
          splitLabel: `${awayTeam} ${formatNumber(projection?.awayProjectedRuns, 1)} + ${homeTeam} ${formatNumber(projection?.homeProjectedRuns, 1)}`
        },
        {
          id: 'first5',
          title: 'First 5 innings',
          lean: totals.first5,
          lineLabel: totals.derivedFirst5TotalLine != null ? `${totals.derivedFirst5TotalLine}` : 'N/A',
          projectedLabel: `${formatNumber(totals.projectedFirst5TotalRuns, 1)} projected runs`,
          splitLabel: `${awayTeam} ${formatNumber(projection?.awayFirst5ProjectedRuns, 1)} + ${homeTeam} ${formatNumber(projection?.homeFirst5ProjectedRuns, 1)}`
        },
        {
          id: 'late',
          title: 'Rest of game',
          lean: totals.late,
          lineLabel: totals.derivedLateTotalLine != null ? `${totals.derivedLateTotalLine}` : 'N/A',
          projectedLabel: `${formatNumber(totals.projectedLateTotalRuns, 1)} projected runs`,
          splitLabel: `${awayTeam} ${formatNumber(projection?.awayLateProjectedRuns, 1)} + ${homeTeam} ${formatNumber(projection?.homeLateProjectedRuns, 1)}`
        },
        ...(projection?.firstInning
          ? [
              {
                id: 'first-inning',
                title: 'Run in 1st',
                lean: projection.firstInning,
                lineLabel: '0.5 run',
                projectedLabel: `${formatPercent(projection.firstInning.yesProbabilityPct, 0)} YRFI / ${formatPercent(projection.firstInning.noProbabilityPct, 0)} NRFI`,
                splitLabel: `${awayTeam} ${formatPercent(projection.firstInning.awayRunProbabilityPct, 0)} score | ${homeTeam} ${formatPercent(projection.firstInning.homeRunProbabilityPct, 0)} score`,
                reasonStack: Array.isArray(projection.firstInning.reasonStack) ? projection.firstInning.reasonStack : [],
                cautionStack: Array.isArray(projection.firstInning.cautionStack) ? projection.firstInning.cautionStack : []
              }
            ]
          : [])
      ]
    : []
  const inningRunMatrix = game.stateContext?.inningRunMatrix ?? projection?.inningRunMatrix ?? null
  const inningRunRows = Array.isArray(inningRunMatrix?.rows) ? inningRunMatrix.rows.slice(0, 9) : []
  const gameFlowOverview = buildGameFlowOverview({
    projection,
    analysis: game.analysis,
    awayTeam,
    homeTeam,
    awayHold,
    homeHold
  })
  const m2GameShape = game.analysis?.gameShape ?? game.gameShape ?? null
  const m2StateFormula = game.analysis?.stateFormula ?? game.stateFormula ?? null
  const m2PlayerIdentity = game.analysis?.playerIdentity ?? game.playerIdentity ?? null
  const m2PitcherBatterKernel = game.analysis?.pitcherBatterKernel ?? game.pitcherBatterKernel ?? null
  const m2ValueProof = game.analysis?.valueProof ?? game.valueProof ?? null
  const m2ScoreCards = m2GameShape
    ? [
        { label: 'Reality gap', value: m2GameShape.scores?.realityGapScore },
        { label: 'Chaos', value: m2GameShape.scores?.chaosScore },
        { label: 'Dead early', value: m2GameShape.scores?.deadEarlyScore },
        { label: 'Bridge flip', value: m2GameShape.scores?.bullpenFlipScore }
      ].filter((entry) => Number.isFinite(Number(entry.value)))
    : []
  const m2PhaseCards = m2GameShape?.phaseMap
    ? [
        { label: 'Full game', value: m2GameShape.phaseMap.fullGameTraffic },
        { label: 'First 5', value: m2GameShape.phaseMap.first5 },
        { label: 'Late', value: m2GameShape.phaseMap.late },
        { label: 'Bridge', value: m2GameShape.phaseMap.bridge }
      ].filter((entry) => entry.value)
    : []
  const pointEdgeHeadline = buildEdgeHeadline(projection?.edgeTeam || '', projection?.edgeHits, 'H', 'Even board')
  const first5EdgeHeadline = buildEdgeHeadline(projection?.first5EdgeTeam || '', projection?.first5EdgeHits, 'H', 'Even first 5')
  const lateEdgeHeadline = buildEdgeHeadline(projection?.lateEdgeTeam || '', projection?.lateEdgeHits, 'H', 'Even late')
  const sidePickName = game.analysis?.participant?.name || projection?.edgeTeam || 'Pass'
  const sidePickConflict =
    sidePickName && projection?.edgeTeam && sidePickName !== projection.edgeTeam && game.analysis?.tier === 'Pass'
  const awayPitcherTypeLabel = buildPitcherTypeLabel(game.starterContext?.away ?? {}, projection?.awayPitcherType)
  const homePitcherTypeLabel = buildPitcherTypeLabel(game.starterContext?.home ?? {}, projection?.homePitcherType)
  const buildLeanWriteup = () => {
    if (!projection || !sidePickName || sidePickName === 'Pass') return null

    const numberOrNull = (value: unknown) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }
    const fmt = (value: unknown, digits = 1) => {
      const parsed = numberOrNull(value)
      return parsed === null ? 'n/a' : formatNumber(parsed, digits)
    }
    const sideForTeam = (teamName: string) => teamName === awayTeam ? 'away' : teamName === homeTeam ? 'home' : null
    const pickSide = sideForTeam(sidePickName)
    const oppSide = pickSide === 'away' ? 'home' : pickSide === 'home' ? 'away' : null
    if (!pickSide || !oppSide) return null

    const pickTeam = pickSide === 'away' ? awayTeam : homeTeam
    const oppTeam = oppSide === 'away' ? awayTeam : homeTeam
    const pickStarter = pickSide === 'away' ? game.starterContext?.away : game.starterContext?.home
    const oppStarter = oppSide === 'away' ? game.starterContext?.away : game.starterContext?.home
    const pickLineup = pickSide === 'away' ? awaySummary : homeSummary
    const oppLineup = oppSide === 'away' ? awaySummary : homeSummary
    const pickRelief = projection.reliefProjection?.[pickSide] ?? game.reliefProjectionContext?.[pickSide] ?? null
    const oppRelief = projection.reliefProjection?.[oppSide] ?? game.reliefProjectionContext?.[oppSide] ?? null
    const pickBridge = pickSide === 'away' ? awayBridgeScore : homeBridgeScore
    const oppBridge = oppSide === 'away' ? awayBridgeScore : homeBridgeScore
    const indicators = game.analysis?.indicators ?? {}
    const participant = game.analysis?.participant ?? {}
    const oddsLabel = participant.americanLabel || (
      Number.isFinite(Number(participant.americanOdds))
        ? Number(participant.americanOdds) > 0
          ? `+${participant.americanOdds}`
          : `${participant.americanOdds}`
        : ''
    )
    const metricForSide = (side: string, metric: string) => projection?.[`${side}${metric}`]
    const pickHits = metricForSide(pickSide, 'ProjectedHits')
    const oppHits = metricForSide(oppSide, 'ProjectedHits')
    const pickFirst5Hits = metricForSide(pickSide, 'First5ProjectedHits')
    const oppFirst5Hits = metricForSide(oppSide, 'First5ProjectedHits')
    const pickLateHits = metricForSide(pickSide, 'LateProjectedHits')
    const oppLateHits = metricForSide(oppSide, 'LateProjectedHits')
    const pickMiddle = numberOrNull(pickLineup?.middleScore)
    const oppMiddle = numberOrNull(oppLineup?.middleScore)
    const pickDepth = numberOrNull(pickLineup?.depthScore)
    const oppDepth = numberOrNull(oppLineup?.depthScore)
    const pickTop = numberOrNull(pickLineup?.topThirdScore)
    const oppTop = numberOrNull(oppLineup?.topThirdScore)
    const pickStarterScore = numberOrNull(indicators.pickStarterScore)
    const oppStarterScore = numberOrNull(indicators.oppStarterScore)
    const pickBullpenScore = numberOrNull(indicators.pickBullpenScore)
    const oppBullpenScore = numberOrNull(indicators.oppBullpenScore)
    const pickReliefRuns = numberOrNull(pickRelief?.projectedReliefRunsAllowed)
    const oppReliefRuns = numberOrNull(oppRelief?.projectedReliefRunsAllowed)
    const pickWhip = numberOrNull(pickStarter?.whip)
    const oppWhip = numberOrNull(oppStarter?.whip)
    const oppStarterHistoryEra = numberOrNull(oppStarter?.statmuseVsOpponent?.era)
    const pickMarketShape = indicators.pickIsMarketFavorite
      ? `${pickSide === 'home' ? 'home/' : ''}favorite market shape`
      : indicators.pickIsMarketUnderdog
        ? 'underdog price protection'
        : 'market shape'
    const passGrade = /pass/i.test(String(game.analysis?.tier || ''))
    const pickLabel = `${pickTeam}${oddsLabel ? ` ${oddsLabel}` : ''}`
    const modelEdgeNumber = numberOrNull(game.analysis?.modelEdge)
    const modelEdgeValue = `${game.analysis?.modelEdgeLabel || 'n/a'}${
      modelEdgeNumber !== null && modelEdgeNumber < 2.5
        ? ', so pretty thin'
        : modelEdgeNumber !== null && modelEdgeNumber < 4
          ? ', modest'
          : ''
    }`
    const trafficVerb = Number(pickHits) > Number(oppHits) || Number(pickFirst5Hits) > Number(oppFirst5Hits)
      ? 'winning the traffic script'
      : 'getting the cleaner phase blend'
    const lede = passGrade
      ? `It's only a pass-grade lean toward ${pickLabel} because the model has them ${trafficVerb}, not because it thinks this is a clean bet.`
      : `It's leaning ${pickLabel} because the model has them ${trafficVerb}, not because it thinks this is a clean smash.`
    const metrics = [
      { label: passGrade ? 'Pass-grade lean' : 'Pick', value: pickLabel },
      { label: 'Tier', value: game.analysis?.tier || 'n/a' },
      { label: 'Confidence', value: game.analysis?.confidence != null ? fmt(game.analysis.confidence, 0) : 'n/a' },
      { label: 'Model edge', value: modelEdgeValue },
      { label: 'Projected hits', value: `${pickTeam} ${fmt(pickHits, 1)} vs ${oppTeam} ${fmt(oppHits, 1)}` },
      { label: 'First 5 hits', value: `${pickTeam} ${fmt(pickFirst5Hits, 1)} vs ${oppTeam} ${fmt(oppFirst5Hits, 1)}` },
      { label: 'Late hits', value: `${pickTeam} ${fmt(pickLateHits, 1)} vs ${oppTeam} ${fmt(oppLateHits, 1)}` },
      { label: 'Bridge chain score', value: `${pickTeam} ${fmt(pickBridge, 1)} vs ${oppTeam} ${fmt(oppBridge, 1)}` }
    ]

    const lineupParagraph = (() => {
      const pickMiddleDepth = (pickMiddle ?? 0) + (pickDepth ?? 0)
      const oppMiddleDepth = (oppMiddle ?? 0) + (oppDepth ?? 0)
      if (pickMiddle !== null && oppMiddle !== null && pickDepth !== null && oppDepth !== null && pickMiddleDepth >= oppMiddleDepth + 5) {
        const topPocket = oppTop !== null && pickTop !== null && oppTop > pickTop + 3
          ? `${oppTeam} have a stronger top-third pocket, but `
          : ''
        return `The model likes ${pickTeam} because their lineup grades better across the middle/depth of the order against ${oppStarter?.fullName || 'the opposing starter'}. ${topPocket}${pickTeam} have the broader lineup shape: ${pickTeam} middle score ${fmt(pickMiddle, 1)} vs ${oppTeam} ${fmt(oppMiddle, 1)}, depth ${fmt(pickDepth, 1)} vs ${fmt(oppDepth, 1)}.`
      }
      if (pickTop !== null && oppTop !== null && pickTop >= oppTop + 5) {
        return `The model likes ${pickTeam} because their top-third pocket is the cleaner early-pressure lane against ${oppStarter?.fullName || 'the opposing starter'}: ${pickTeam} top third ${fmt(pickTop, 1)} vs ${oppTeam} ${fmt(oppTop, 1)}.`
      }
      return `The model likes ${pickTeam} because their projected contact lane is cleaner: ${pickTeam} are at ${fmt(pickHits, 1)} projected hits with ${fmt(pickFirst5Hits, 1)} in the starter window, while ${oppTeam} sit at ${fmt(oppHits, 1)} and ${fmt(oppFirst5Hits, 1)}.`
    })()

    const starterNotes = []
    if (pickStarterScore !== null && oppStarterScore !== null) {
      if (oppStarterScore > pickStarterScore + 0.5) {
        starterNotes.push(`${oppStarter?.fullName || `${oppTeam} starter`} actually has the slightly better raw starter score`)
      } else if (pickStarterScore > oppStarterScore + 0.5) {
        starterNotes.push(`${pickStarter?.fullName || `${pickTeam} starter`} owns the cleaner raw starter score`)
      } else {
        starterNotes.push('the raw starter scores are basically even')
      }
    }
    if (Number(pickHits) > Number(oppHits) || Number(pickFirst5Hits) > Number(oppFirst5Hits)) {
      starterNotes.push(`${pickTeam} hitters project for more contact/traffic against ${oppStarter?.fullName || 'the opposing starter'}`)
    }
    if (oppStarterHistoryEra !== null && oppStarterHistoryEra >= 5) {
      starterNotes.push(`${oppStarter?.fullName || `${oppTeam} starter`}'s ${pickTeam} history is ugly: ${fmt(oppStarterHistoryEra, 2)} ERA vs ${pickTeam}`)
    }
    if (pickWhip !== null && oppWhip !== null && pickWhip < oppWhip - 0.03) {
      starterNotes.push(`${pickStarter?.fullName || `${pickTeam} starter`} has the cleaner season WHIP: ${fmt(pickWhip, 2)} vs ${fmt(oppWhip, 2)}`)
    }
    const starterParagraph = starterNotes.length
      ? `The starter read has a few moving parts. ${starterNotes.join(', and ')}.`
      : `The starter read is mixed enough that ${pickTeam} still need the lineup traffic and bridge shape to hold.`

    const counterweights = []
    if (oppBullpenScore !== null && pickBullpenScore !== null && oppBullpenScore > pickBullpenScore + 1) {
      counterweights.push(`season bullpen score favors ${oppTeam} ${fmt(oppBullpenScore, 1)} vs ${fmt(pickBullpenScore, 1)}`)
    }
    if (oppReliefRuns !== null && pickReliefRuns !== null && oppReliefRuns < pickReliefRuns - 0.15) {
      counterweights.push(`RP2 relief runs favor ${oppTeam} ${fmt(oppReliefRuns, 2)} vs ${fmt(pickReliefRuns, 2)}`)
    }
    if (Number.isFinite(oppBridge) && Number.isFinite(pickBridge) && oppBridge > pickBridge + 1) {
      counterweights.push(`bridge chain score favors ${oppTeam} ${fmt(oppBridge, 1)} vs ${fmt(pickBridge, 1)}`)
    }
    const pickBridgeVsOppBullpenSplit =
      Number.isFinite(pickBridge) &&
      Number.isFinite(oppBridge) &&
      Number.isFinite(oppBullpenScore) &&
      Number.isFinite(pickBullpenScore) &&
      pickBridge > oppBridge + 1 &&
      oppBullpenScore > pickBullpenScore + 1
    const bridgeVsBullpenNote = pickBridgeVsOppBullpenSplit
      ? ` That is not a contradiction: bridge chain is today's likely available relief path, while season bullpen score is the broader full-pen quality read.`
      : ''
    const counterweightParagraph = counterweights.length
      ? `The counterweight: ${oppTeam} are better in some bullpen/context pockets. ${counterweights.join(', and ')}.${bridgeVsBullpenNote} That's why this is ${game.analysis?.tier || 'not a blank-check'} rather than a high-conviction play. In plain English: ${pickTeam} lean because of projected lineup traffic and ${pickMarketShape}, but ${oppTeam}'s counterweights are real reasons not to overstate it.`
      : `The counterweight: the edge is still only ${game.analysis?.modelEdgeLabel || 'modest'} with a ${game.analysis?.tier || 'measured'} tag. In plain English: ${pickTeam} lean because of projected lineup traffic and ${pickMarketShape}, but the price and game-shape noise are reasons not to overstate it.`

    return {
      pickTeam,
      lede,
      metrics,
      paragraphs: [lineupParagraph, starterParagraph, counterweightParagraph]
    }
  }
  const leanWriteup = buildLeanWriteup()
  const renderBridgeChainCard = (
    teamName: string,
    relievers: AnyRecord[],
    chainScore: number,
    workloadLabel: string,
    advantage: boolean,
    recentBullpenSummary: AnyRecord | null,
    seasonBullpenSummary: AnyRecord | null,
    shadowContext: AnyRecord | null,
    sourceLabel: string
  ) => (
    <article className={`bridge-chain-card-react ${advantage ? 'advantage' : ''}`}>
      <div className="bridge-chain-card-head">
        <div>
          <p className="eyebrow">{teamName} bridge chain</p>
          <strong>{Number.isFinite(chainScore) ? `${chainScore.toFixed(1)} score` : 'No chain score'}</strong>
        </div>
        <span className={`builder-status-pill ${workloadLabel === 'unknown' ? 'invalid' : 'open'}`}>
          {sourceLabel === 'bridge chain'
            ? workloadLabel === 'unknown'
              ? 'Unknown workload'
              : workloadLabel
            : sourceLabel}
        </span>
      </div>
      {recentBullpenSummary && Number(recentBullpenSummary.gamesSample || 0) > 0 ? (
        <p className="react-section-copy">
          Last {Number(recentBullpenSummary.gamesSample || 0)} bullpen games: {formatNumber(recentBullpenSummary.era, 2)} ERA / {formatNumber(recentBullpenSummary.whip, 2)} WHIP
          {seasonBullpenSummary && !seasonBullpenSummary.staleFeed
            ? ` vs season ${formatNumber(seasonBullpenSummary.era, 2)} ERA / ${formatNumber(seasonBullpenSummary.whip, 2)} WHIP`
            : ''}
        </p>
      ) : seasonBullpenSummary && !seasonBullpenSummary.staleFeed ? (
        <p className="react-section-copy">
          Season bullpen: {formatNumber(seasonBullpenSummary.era, 2)} ERA / {formatNumber(seasonBullpenSummary.whip, 2)} WHIP
          {Number.isFinite(Number(seasonBullpenSummary.saves)) ? ` / ${Number(seasonBullpenSummary.saves)} SV` : ''}
        </p>
      ) : null}
      {shadowContext?.relievers?.length ? (
        <div className="bridge-shadow-box">
          <div className="bridge-shadow-head">
            <div>
              <p className="eyebrow">RP36 / E36 shadow</p>
              <strong>{shadowContext.summaryLine || 'First-up reliever shadow board'}</strong>
            </div>
            <small>
              {formatNumber(shadowContext.researchRates?.exactRate, 1)}% exact · {formatNumber(shadowContext.researchRates?.top2Rate, 1)}% top-2
            </small>
          </div>
          <p className="react-section-copy">
            Lead {shadowContext.relievers[0]?.name || '—'}
            {shadowContext.relievers[1]?.name ? ` · Alt ${shadowContext.relievers[1].name}` : ''}
            {Number.isFinite(Number(shadowContext.topTwoSharePct))
              ? ` · top-2 share ${formatNumber(shadowContext.topTwoSharePct, 1)}%`
              : ''}
            {Number.isFinite(Number(shadowContext.starterHookRiskPct))
              ? ` · hook risk ${formatNumber(shadowContext.starterHookRiskPct, 1)}%`
              : ''}
          </p>
          <div className="bridge-shadow-list">
            {shadowContext.relievers.slice(0, 2).map((reliever: AnyRecord) => (
              <div key={`${teamName}-shadow-${reliever.pitcherId || reliever.name}`} className="bridge-shadow-row">
                <div>
                  <strong>{reliever.name}</strong>
                  <small>
                    {reliever.role || 'bridge'} · {formatNumber(reliever.expectedOuts, 2)} outs · shadow share {formatNumber(reliever.shadowSharePct, 1)}%
                  </small>
                  {reliever.summary ? <small>{reliever.summary}</small> : null}
                </div>
                <div className="bridge-shadow-meta">
                  <span>{formatNumber(reliever.shadowScorePct, 1)} score</span>
                  <small>
                    Availability {formatNumber(reliever.availabilityScore, 0)}/100
                    {reliever.backToBack ? ' | B2B' : reliever.workedYesterday ? ' | worked yesterday' : ''}
                  </small>
                  {reliever.reasonTags?.length ? <small>{reliever.reasonTags.join(' · ')}</small> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {relievers.length ? (
        <div className="bridge-chain-list">
          {relievers.slice(0, 2).map((reliever) => (
            <div key={`${teamName}-${reliever.pitcherId || reliever.name}`} className="bridge-chain-row">
              <div>
                <strong>{reliever.name}</strong>
                <small>{reliever.role || 'middle'} | {formatNumber(reliever.expectedOuts, 2)} outs</small>
                {reliever.projectionOnly ? <small>Team-side projection; identity confidence low.</small> : null}
                {Number(reliever.recentTeamGamesSample || 0) > 0 ? (
                  <small>
                    First up in {Number(reliever.recentFirstRelieverCountLast5Games || 0)}/{Number(reliever.recentTeamGamesSample || 0)} recent team games
                  </small>
                ) : null}
                {reliever.pitchMixSummary ? <small>{reliever.pitchMixSummary}</small> : null}
              </div>
              <div className="bridge-chain-meta">
                <span>First up {formatNumber(reliever.firstRelieverLikelihood, 0)}%</span>
                <small>
                  Availability {formatNumber(reliever.availabilityScore, 0)}/100
                  {reliever.backToBack ? ' | B2B' : reliever.workedYesterday ? ' | worked yesterday' : ''}
                </small>
                {reliever.topAttackers?.length ? (
                  <small>
                    Top attackers: {reliever.topAttackers.slice(0, 2).map((hitter: AnyRecord) => hitter.name).join(', ')}
                  </small>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="react-section-copy">No likely bridge chain stored yet for this club on the current warehouse pass.</p>
      )}
    </article>
  )

  return (
    <>
      <section className="detail-panel game-story-panel">
        <div className="detail-panel-header">
          <p className="eyebrow">Game story</p>
          <span>{gameStory.headline}</span>
        </div>
        {gameStory.chips.length ? (
          <div className="react-pill-row game-story-chip-row">
            {gameStory.chips.map((chip) => (
              <span key={`${game.id}-${chip.label}`} className={`game-highlight-chip ${chip.tone}`}>
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}
        <div className="game-story-grid">
          {gameStory.cards.map((card) => (
            <article key={`${game.id}-${card.label}`} className={`game-story-card ${card.tone}`}>
              <small>{card.label}</small>
              <p>{card.body}</p>
            </article>
          ))}
          {handednessStoryCards.map((card: AnyRecord) => (
            <article key={`${game.id}-handedness-story-${card.label}`} className={`game-story-card ${card.tone}`}>
              <small>{card.label}</small>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      {leanWriteup ? (
        <section className="detail-panel lean-writeup-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Why this lean</p>
            <span>{leanWriteup.pickTeam} read</span>
          </div>
          <p className="lean-writeup-lede">{leanWriteup.lede}</p>
          <p className="react-section-copy">For {game.title}, the live file has:</p>
          <ul className="lean-writeup-metrics">
            {leanWriteup.metrics.map((metric) => (
              <li key={`${game.id}-lean-writeup-${metric.label}`}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </li>
            ))}
          </ul>
          <div className="lean-writeup-body">
            {leanWriteup.paragraphs.map((paragraph, index) => (
              <p key={`${game.id}-lean-writeup-paragraph-${index}`}>{paragraph}</p>
            ))}
          </div>
        </section>
      ) : null}

      {adjustmentCards.length ? (
        <section className="detail-panel projection-adjustment-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Projection adjustments</p>
            <span>{adjustmentChecklist?.summary?.length ? adjustmentChecklist.summary.join(' | ') : 'Model checklist'}</span>
          </div>
          <div className="projection-adjustment-grid">
            {adjustmentCards.map((card: AnyRecord) => (
              <article key={`${game.id}-adjustment-${card.id}`} className="projection-adjustment-card">
                <small>{card.title}</small>
                <strong>{card.value}</strong>
                <span>{card.meta}</span>
                {card.flags?.length ? (
                  <ul>
                    {card.flags.map((flag: string, index: number) => (
                      <li key={`${game.id}-adjustment-${card.id}-${index}`}>{flag}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {m2GameShape || m2StateFormula || m2PlayerIdentity || m2PitcherBatterKernel || m2ValueProof ? (
        <section className="detail-panel game-story-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">MLB-M2 mechanism</p>
            <span>{m2GameShape?.label || m2GameShape?.category?.label || 'Research diagnostics'}</span>
          </div>
          {m2GameShape?.summary ? <p className="react-section-copy">{m2GameShape.summary}</p> : null}
          <div className="react-pill-row game-story-chip-row">
            {m2GameShape?.category?.bestExpression ? (
              <span className="game-highlight-chip accent">{m2GameShape.category.bestExpression}</span>
            ) : null}
            {m2GameShape?.category?.label ? (
              <span className="game-highlight-chip warning">{m2GameShape.category.label}</span>
            ) : null}
            {m2GameShape?.rfLens?.trustedUse ? (
              <span className="game-highlight-chip muted">RF totals lens</span>
            ) : null}
            {m2ValueProof?.trustLabel ? (
              <span className="game-highlight-chip positive">{m2ValueProof.trustLabel}</span>
            ) : null}
          </div>
          {m2ScoreCards.length || m2PhaseCards.length ? (
            <div className="game-story-grid">
              {m2ScoreCards.map((card) => (
                <article key={`${game.id}-m2-score-${card.label}`} className="game-story-card warning">
                  <small>{card.label}</small>
                  <p>{formatNumber(card.value, 1)}/100</p>
                </article>
              ))}
              {m2PhaseCards.map((card) => (
                <article key={`${game.id}-m2-phase-${card.label}`} className="game-story-card accent">
                  <small>{card.label}</small>
                  <p>{card.value}</p>
                </article>
              ))}
            </div>
          ) : null}
          {m2GameShape?.marketImplications ? (
            <div className="game-story-grid">
              {Object.entries(m2GameShape.marketImplications).slice(0, 4).map(([lane, body]) => (
                <article key={`${game.id}-m2-market-${lane}`} className="game-story-card">
                  <small>{lane}</small>
                  <p>{String(body)}</p>
                </article>
              ))}
            </div>
          ) : null}
          {m2StateFormula || m2PlayerIdentity || m2PitcherBatterKernel ? (
            <div className="game-story-grid">
              <article className="game-story-card">
                <small>State formulas</small>
                <p>{m2StateFormula?.summary || m2StateFormula?.status || 'Research-only until holdout and bucket checks improve.'}</p>
              </article>
              <article className="game-story-card">
                <small>Player identity</small>
                <p>{m2PlayerIdentity?.summary || m2PlayerIdentity?.status || 'Diagnostic only; useful for prop triage and repeatability checks.'}</p>
              </article>
              <article className="game-story-card">
                <small>Pitcher-batter kernel</small>
                <p>{m2PitcherBatterKernel?.summary || m2PitcherBatterKernel?.status || 'Candidate pocket; requires line-bucket proof before promotion.'}</p>
              </article>
            </div>
          ) : null}
          {m2ValueProof ? (
            <p className="react-section-copy">
              Value proof: {m2ValueProof.backtestBucket || 'no bucket'} · required hit {m2ValueProof.requiredHitRate || 'pending'} · gate {m2ValueProof.valueGate || 'research'}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="detail-panel react-card-grid">
        <article className="react-team-card" style={{ borderColor: `${getTeamAccent('MLB', awayTeam)}55` }}>
          <div className="react-team-card-top">
            <div className="react-team-id">
              {getTeamLogoUrl('MLB', awayTeam) ? <img src={getTeamLogoUrl('MLB', awayTeam)} alt={awayTeam} className="react-team-logo" /> : null}
              <div>
                <strong>{awayTeam}</strong>
                <small>{buildTeamContextSummary(game.teamContext?.away)}</small>
                {renderRecentGamesStrip(awayTeam, awayRecentGames)}
                {awaySnapshotChips.length ? (
                  <div className="pitcher-summary-chip-row secondary team-snapshot-chip-row">
                    {awaySnapshotChips.map((stat) => (
                      <span key={`${awayTeam}-snapshot-${stat.label}`} className="pitcher-summary-chip muted">
                        <small>{stat.label}</small>
                        <strong>{stat.value}</strong>
                      </span>
                    ))}
                  </div>
                ) : null}
                {awayBullpenPulse ? <small>{awayBullpenPulse}</small> : null}
              </div>
            </div>
            <span className="builder-status-pill open">{lineupStatusLabel(game.lineupBoard?.status?.away)}</span>
          </div>
          {renderRecentInningHistory(
            awayTeam,
            awayRecentInningHistory,
            getMlbHistoryWindow(awayRecentHistoryKey, awayRecentInningHistory),
            (nextWindow) => updateMlbHistoryWindow(awayRecentHistoryKey, nextWindow)
          )}
          {renderMatchupInningHistory(
            awayTeam,
            homeTeam,
            awayMatchupHistory,
            awayStarter.headline.replace(/\s*\([LR?]HP\)$/, ''),
            getMlbHistoryWindow(awayMatchupHistoryKey, awayMatchupHistory),
            (nextWindow) => updateMlbHistoryWindow(awayMatchupHistoryKey, nextWindow)
          )}
          <div className="pitcher-summary-block">
            <strong className="pitcher-summary-headline">{awayStarter.headline}</strong>
            <p className="pitcher-summary-line">{awayStarter.primary}</p>
            {awayStarter.usageStatusLabel ? (
              <div className="pitcher-summary-kicker-row">
                <span className="pitcher-summary-kicker">{awayStarter.usageStatusLabel}</span>
                {awayStarter.usageLabel ? <span className="pitcher-summary-kicker muted">{awayStarter.usageLabel}</span> : null}
              </div>
            ) : null}
            {awayStarter.detailStats.length ? (
              <div className="pitcher-summary-chip-row">
                {awayStarter.detailStats.map((stat) => (
                  <span key={`${awayTeam}-${stat.label}`} className="pitcher-summary-chip">
                    <small>{stat.label}</small>
                    <strong>{stat.value}</strong>
                  </span>
                ))}
              </div>
            ) : null}
            {awayStarter.trendStats.length ? (
              <div className="pitcher-summary-chip-row secondary">
                {awayStarter.trendStats.map((stat) => (
                  <span key={`${awayTeam}-trend-${stat.label}`} className="pitcher-summary-chip muted">
                    <small>{stat.label}</small>
                    <strong>{stat.value}</strong>
                  </span>
                ))}
              </div>
            ) : null}
            {awayStarter.savant?.playerUrl ? (
              <div className="pitcher-summary-link-row">
                <a href={awayStarter.savant.playerUrl} target="_blank" rel="noreferrer">Savant</a>
                {awayStarter.savant?.statsUrls?.splits ? (
                  <a href={awayStarter.savant.statsUrls.splits} target="_blank" rel="noreferrer">Splits</a>
                ) : null}
                {awayStarter.savant?.statsUrls?.gamelogs ? (
                  <a href={awayStarter.savant.statsUrls.gamelogs} target="_blank" rel="noreferrer">Logs</a>
                ) : null}
                {awayStarter.savant?.statsUrls?.statcast ? (
                  <a href={awayStarter.savant.statsUrls.statcast} target="_blank" rel="noreferrer">Statcast</a>
                ) : null}
              </div>
            ) : null}
            {renderPitcherStartHistory(
              'Last 5 starts',
              awayStarter.recentStarts,
              'No prior MLB starts loaded yet.'
            )}
            {renderPitcherStartHistory(
              `vs ${homeTeam} this season`,
              awayStarter.opponentStarts,
              `${awayStarter.headline.replace(/\s*\([LR?]HP\)$/, '')} has not started against ${homeTeam} this season.`
            )}
            {renderStatmuseMatchupPanel(awayStarter, awayTeam)}
            {renderPitcherRightLeftSummary(awayStarter, awayTeam)}
            {renderEspnSplitTable(awayStarter, awayTeam)}
          </div>
          {awayStarter.recent ? <small>{awayStarter.recent}</small> : null}
          {awayStarter.firstInningSeasonLine ? <small>{awayStarter.firstInningSeasonLine}</small> : null}
          {awayStarter.warLine ? <small>{awayStarter.warLine}</small> : null}
          {awayStarter.strikeoutLine ? <small>{awayStarter.strikeoutLine}</small> : null}
          {awayStarter.strikeoutPickLine ? <small>{awayStarter.strikeoutPickLine}</small> : null}
          {!awayStarter.recent && awayStarter.usageNote ? <small>{awayStarter.usageNote}</small> : null}
          {awayStory ? <p className="react-section-copy">{awayStory}</p> : null}
          {awayScript ? (
            <>
              <p className="react-section-copy">{awayScript.overview}</p>
              <div className="react-pill-row">
                {(awayScript.overperformHitters ?? []).slice(0, 3).map((hitter: AnyRecord) => (
                  <span key={`${awayTeam}-${hitter.name}`} className="game-highlight-chip accent">
                    {hitter.name}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </article>

        <article className="react-team-card" style={{ borderColor: `${getTeamAccent('MLB', homeTeam)}55` }}>
          <div className="react-team-card-top">
            <div className="react-team-id">
              {getTeamLogoUrl('MLB', homeTeam) ? <img src={getTeamLogoUrl('MLB', homeTeam)} alt={homeTeam} className="react-team-logo" /> : null}
              <div>
                <strong>{homeTeam}</strong>
                <small>{buildTeamContextSummary(game.teamContext?.home)}</small>
      {renderRecentGamesStrip(homeTeam, homeRecentGames)}
                {homeSnapshotChips.length ? (
                  <div className="pitcher-summary-chip-row secondary team-snapshot-chip-row">
                    {homeSnapshotChips.map((stat) => (
                      <span key={`${homeTeam}-snapshot-${stat.label}`} className="pitcher-summary-chip muted">
                        <small>{stat.label}</small>
                        <strong>{stat.value}</strong>
                      </span>
                    ))}
                  </div>
                ) : null}
                {homeBullpenPulse ? <small>{homeBullpenPulse}</small> : null}
              </div>
            </div>
            <span className="builder-status-pill open">{lineupStatusLabel(game.lineupBoard?.status?.home)}</span>
          </div>
          {renderRecentInningHistory(
            homeTeam,
            homeRecentInningHistory,
            getMlbHistoryWindow(homeRecentHistoryKey, homeRecentInningHistory),
            (nextWindow) => updateMlbHistoryWindow(homeRecentHistoryKey, nextWindow)
          )}
          {renderMatchupInningHistory(
            homeTeam,
            awayTeam,
            homeMatchupHistory,
            homeStarter.headline.replace(/\s*\([LR?]HP\)$/, ''),
            getMlbHistoryWindow(homeMatchupHistoryKey, homeMatchupHistory),
            (nextWindow) => updateMlbHistoryWindow(homeMatchupHistoryKey, nextWindow)
          )}
          <div className="pitcher-summary-block">
            <strong className="pitcher-summary-headline">{homeStarter.headline}</strong>
            <p className="pitcher-summary-line">{homeStarter.primary}</p>
            {homeStarter.usageStatusLabel ? (
              <div className="pitcher-summary-kicker-row">
                <span className="pitcher-summary-kicker">{homeStarter.usageStatusLabel}</span>
                {homeStarter.usageLabel ? <span className="pitcher-summary-kicker muted">{homeStarter.usageLabel}</span> : null}
              </div>
            ) : null}
            {homeStarter.detailStats.length ? (
              <div className="pitcher-summary-chip-row">
                {homeStarter.detailStats.map((stat) => (
                  <span key={`${homeTeam}-${stat.label}`} className="pitcher-summary-chip">
                    <small>{stat.label}</small>
                    <strong>{stat.value}</strong>
                  </span>
                ))}
              </div>
            ) : null}
            {homeStarter.trendStats.length ? (
              <div className="pitcher-summary-chip-row secondary">
                {homeStarter.trendStats.map((stat) => (
                  <span key={`${homeTeam}-trend-${stat.label}`} className="pitcher-summary-chip muted">
                    <small>{stat.label}</small>
                    <strong>{stat.value}</strong>
                  </span>
                ))}
              </div>
            ) : null}
            {homeStarter.savant?.playerUrl ? (
              <div className="pitcher-summary-link-row">
                <a href={homeStarter.savant.playerUrl} target="_blank" rel="noreferrer">Savant</a>
                {homeStarter.savant?.statsUrls?.splits ? (
                  <a href={homeStarter.savant.statsUrls.splits} target="_blank" rel="noreferrer">Splits</a>
                ) : null}
                {homeStarter.savant?.statsUrls?.gamelogs ? (
                  <a href={homeStarter.savant.statsUrls.gamelogs} target="_blank" rel="noreferrer">Logs</a>
                ) : null}
                {homeStarter.savant?.statsUrls?.statcast ? (
                  <a href={homeStarter.savant.statsUrls.statcast} target="_blank" rel="noreferrer">Statcast</a>
                ) : null}
              </div>
            ) : null}
            {renderPitcherStartHistory(
              'Last 5 starts',
              homeStarter.recentStarts,
              'No prior MLB starts loaded yet.'
            )}
            {renderPitcherStartHistory(
              `vs ${awayTeam} this season`,
              homeStarter.opponentStarts,
              `${homeStarter.headline.replace(/\s*\([LR?]HP\)$/, '')} has not started against ${awayTeam} this season.`
            )}
            {renderStatmuseMatchupPanel(homeStarter, homeTeam)}
            {renderPitcherRightLeftSummary(homeStarter, homeTeam)}
            {renderEspnSplitTable(homeStarter, homeTeam)}
          </div>
          {homeStarter.recent ? <small>{homeStarter.recent}</small> : null}
          {homeStarter.firstInningSeasonLine ? <small>{homeStarter.firstInningSeasonLine}</small> : null}
          {homeStarter.warLine ? <small>{homeStarter.warLine}</small> : null}
          {homeStarter.strikeoutLine ? <small>{homeStarter.strikeoutLine}</small> : null}
          {homeStarter.strikeoutPickLine ? <small>{homeStarter.strikeoutPickLine}</small> : null}
          {!homeStarter.recent && homeStarter.usageNote ? <small>{homeStarter.usageNote}</small> : null}
          {homeStory ? <p className="react-section-copy">{homeStory}</p> : null}
          {homeScript ? (
            <>
              <p className="react-section-copy">{homeScript.overview}</p>
              <div className="react-pill-row">
                {(homeScript.overperformHitters ?? []).slice(0, 3).map((hitter: AnyRecord) => (
                  <span key={`${homeTeam}-${hitter.name}`} className="game-highlight-chip accent">
                    {hitter.name}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </article>
      </section>

      {kalshiContext ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Kalshi markets</p>
            <span>{(kalshiMlbMarkets as AnyRecord).source || 'Kalshi external API'}</span>
          </div>
          <p className="react-section-copy">
            Live Kalshi snapshot for this matchup. Prices are shown as YES / NO ask when available.
          </p>
          <div className="react-card-grid compact">
            <article className="react-prop-card odds-market-card">
              <div>
                <strong>Winner</strong>
                <small>{kalshiContext.title}</small>
              </div>
              <p>{awayTeam}: {formatKalshiQuote(kalshiWinnerAway)}</p>
              <p>{homeTeam}: {formatKalshiQuote(kalshiWinnerHome)}</p>
            </article>
            {kalshiTotal ? (
              <article className="react-prop-card odds-market-card">
                <div>
                  <strong>Total</strong>
                  <small>{kalshiTotal.label}</small>
                </div>
                <p>Over / under {formatKalshiQuote(kalshiTotal)}</p>
                <small>{kalshiTotal.rules}</small>
              </article>
            ) : null}
            {kalshiFirstInning ? (
              <article className="react-prop-card odds-market-card">
                <div>
                  <strong>1st inning</strong>
                  <small>YRFI / NRFI</small>
                </div>
                <p>YRFI / NRFI {formatKalshiQuote(kalshiFirstInning)}</p>
                <small>{kalshiFirstInning.rules}</small>
              </article>
            ) : null}
            {(kalshiF5Away || kalshiF5Home || kalshiF5Tie) ? (
              <article className="react-prop-card odds-market-card">
                <div>
                  <strong>First 5 winner</strong>
                  <small>YES prices</small>
                </div>
                {kalshiF5Away ? <p>{awayTeam}: {formatKalshiQuote(kalshiF5Away)}</p> : null}
                {kalshiF5Home ? <p>{homeTeam}: {formatKalshiQuote(kalshiF5Home)}</p> : null}
                {kalshiF5Tie ? <p>Tie: {formatKalshiQuote(kalshiF5Tie)}</p> : null}
              </article>
            ) : null}
            {kalshiFirst5Total ? (
              <article className="react-prop-card odds-market-card">
                <div>
                  <strong>First 5 total</strong>
                  <small>{kalshiFirst5Total.label}</small>
                </div>
                <p>Over / under {formatKalshiQuote(kalshiFirst5Total)}</p>
                <small>{kalshiFirst5Total.rules}</small>
              </article>
            ) : null}
            {kalshiSpread ? (
              <article className="react-prop-card odds-market-card">
                <div>
                  <strong>Spread</strong>
                  <small>{kalshiSpread.title}</small>
                </div>
                <p>{formatKalshiQuote(kalshiSpread)}</p>
                <small>{kalshiSpread.rules}</small>
              </article>
            ) : null}
          </div>
        </section>
      ) : null}

      {inningRunRows.length ? (
        <section className="detail-panel inning-run-matrix-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">All-inning run map</p>
            <span>{inningRunMatrix?.source || 'Warehouse inning scoring profile'}</span>
          </div>
          <div className="inning-run-matrix-scroll">
            <table className="inning-run-matrix">
              <thead>
                <tr>
                  <th>Read</th>
                  {inningRunRows.map((row: AnyRecord) => (
                    <th key={`${game.id}-inning-head-${row.inning}`}>{row.inning}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Run</th>
                  {inningRunRows.map((row: AnyRecord) => (
                    <td key={`${game.id}-inning-run-${row.inning}`} className={row.lean === 'Run' ? `hot ${row.strength || ''}` : ''}>
                      {Number.isFinite(Number(row.runProbabilityPct)) ? (
                        <>
                          <strong>{formatNumber(row.runProbabilityPct, 0)}%</strong>
                          <small>{awayTeam} {formatNumber(row.awayRunProbabilityPct, 0)} / {homeTeam} {formatNumber(row.homeRunProbabilityPct, 0)}</small>
                        </>
                      ) : null}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>No run</th>
                  {inningRunRows.map((row: AnyRecord) => (
                    <td key={`${game.id}-inning-no-run-${row.inning}`} className={row.lean !== 'Run' ? `quiet ${row.strength || ''}` : ''}>
                      {Number.isFinite(Number(row.noRunProbabilityPct)) ? (
                        <>
                          <strong>{formatNumber(row.noRunProbabilityPct, 0)}%</strong>
                          <small>{row.phase || 'inning'}</small>
                        </>
                      ) : null}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>Reason</th>
                  {inningRunRows.map((row: AnyRecord) => (
                    <td key={`${game.id}-inning-reason-${row.inning}`} className="reason">
                      <span>{row.reason || 'Warehouse inning profile blended with league baseline.'}</span>
                      {row.caution ? <small>{row.caution}</small> : null}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {projection ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Game flow</p>
            <span>{projection.weather?.label || 'No weather note'}</span>
          </div>
          <p className="react-section-copy">{gameFlowOverview}</p>
          {projection?.lineupSimulation?.phases?.length ? (
            <div className="react-pill-row">
              {projection.lineupSimulation.phases.slice(0, 3).map((phase: AnyRecord) => (
                <span key={`${game.id}-${phase.label}`} className="game-highlight-chip neutral">
                  {phase.label}: {phase.edgeTeam} {phase.projection}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mlb-signal-grid">
            <article className={`mlb-signal-card ${getMetricTone(Number(projection?.edgeHits))}`}>
              <div className="mlb-signal-head">
                <MetricHelp
                  label="Point edge"
                  help="Projected full-game hit and traffic gap. This is the raw traffic script leader, not automatically the final side pick."
                />
                <span>{projection.edgeTeam || 'Even'}</span>
              </div>
              <strong>{pointEdgeHeadline}</strong>
              <small>
                {awayTeam} {projection.awayProjectedHits} H at {projection.awayHitEfficiencyPct}% vs {homeTeam} {projection.homeProjectedHits} H at {projection.homeHitEfficiencyPct}%
              </small>
            </article>

            <article className={`mlb-signal-card ${getMetricTone(Number(projection?.first5EdgeHits))}`}>
              <div className="mlb-signal-head">
                <MetricHelp
                  label="First 5 edge"
                  help="Projected first-five hit edge after folding in lineup fit, starter form, and starter hold confidence. This is the starter-window traffic script."
                />
                <span>{projection.first5EdgeTeam || 'Even'}</span>
              </div>
              <strong>{first5EdgeHeadline}</strong>
              <small>
                {awayTeam} {projection.awayFirst5ProjectedHits} H vs {homeTeam} {projection.homeFirst5ProjectedHits} H
              </small>
            </article>

            <article className={`mlb-signal-card ${getMetricTone(Number(projection?.lateEdgeHits))}`}>
              <div className="mlb-signal-head">
                <MetricHelp
                  label="Late edge"
                  help="Projected rest-of-game hit edge once the starters hand the game to the likely bridge relievers. This is the bridge-and-finish traffic script."
                />
                <span>{projection.lateEdgeTeam || 'Even'}</span>
              </div>
              <strong>{lateEdgeHeadline}</strong>
              <small>
                {awayTeam} {projection.awayLateProjectedHits} H vs {homeTeam} {projection.homeLateProjectedHits} H
              </small>
            </article>

            <article className={`mlb-signal-card ${awayHold >= homeHold ? 'accent' : 'warning'}`}>
              <div className="mlb-signal-head">
                <MetricHelp
                  label="Starter hold"
                  help="Estimated ability for each starter to hold their lane before handing the game to the bullpen. Higher means the starter is likelier to survive cleanly."
                />
                <span>{awayHold >= homeHold ? awayTeam : homeTeam}</span>
              </div>
              <strong>{awayTeam} {formatNumber(awayHold, 1)} vs {homeTeam} {formatNumber(homeHold, 1)}</strong>
              <small>{awayTeam}: {awayPitcherTypeLabel} | {homeTeam}: {homePitcherTypeLabel}</small>
            </article>

            <article className={`mlb-signal-card ${projection.bridgeEdgeTeam ? 'warning' : 'neutral'}`}>
              <div className="mlb-signal-head">
                <MetricHelp
                  label="Bridge chain"
                  help="Likely first two relievers plus their workload and bridge quality. This is the cleanest read on who is likelier to control the middle innings."
                />
                <span>{projection.bridgeEdgeTeam || 'Even'}</span>
              </div>
              <strong>{projection.bridgeEdgeTeam ? `${projection.bridgeEdgeTeam} +${formatNumber(projection.bridgeEdgeScore, 1)}` : 'No bridge split'}</strong>
              <small>
                {awayTeam} {Number.isFinite(awayBridgeScore) ? awayBridgeScore.toFixed(1) : 'n/a'} vs {homeTeam} {Number.isFinite(homeBridgeScore) ? homeBridgeScore.toFixed(1) : 'n/a'}
              </small>
            </article>
          </div>
          <div className="react-card-grid">
            <article className="react-mini-panel">
              <span className="eyebrow">Model edge</span>
              <strong>{sidePickConflict ? `${sidePickName} pass-grade dog` : game.analysis?.modelEdgeLabel || 'No edge stored'}</strong>
              <small>
                {sidePickConflict
                  ? `${sidePickName} only survives here as a protected-dog or pass lane. ${projection.edgeTeam} own the raw traffic script, while ${awayHold >= homeHold ? awayTeam : homeTeam}${projection.bridgeEdgeTeam ? ` and ${projection.bridgeEdgeTeam}` : ''} carry the cleaner survival phases.`
                  : game.analysis?.indicators?.projectedHitEdgeForPick !== undefined
                    ? Number(game.analysis.indicators.projectedHitEdgeForPick) >= 0
                      ? `${game.analysis?.participant?.name || projection.edgeTeam} carry a real ${formatNumber(game.analysis.indicators.projectedHitEdgeForPick, 1)}-hit edge behind the side pick.`
                      : `${game.analysis?.participant?.name || projection.edgeTeam} trail the raw hit script by ${formatNumber(Math.abs(Number(game.analysis.indicators.projectedHitEdgeForPick)), 1)} hits, so this side needs its starter or bridge edge to hold.`
                    : 'Use together with traffic script, bridge chain, and lineup pressure.'}
              </small>
            </article>
            <article className="react-mini-panel">
              <span className="eyebrow">First 5 traffic</span>
              <strong>{projection.first5EdgeTeam || 'Even'}</strong>
              <small>{projection.totals?.first5?.summary}</small>
            </article>
            <article className="react-mini-panel">
              <span className="eyebrow">Bridge traffic</span>
              <strong>{projection.bridgeEdgeTeam || 'Even'}</strong>
              <small>{projection.totals?.late?.summary}</small>
            </article>
            <article className="react-mini-panel">
              <span className="eyebrow">Full-game traffic</span>
              <strong>{projection.edgeTeam || game.analysis?.participant?.name}</strong>
              <small>{projection.totals?.fullGame?.summary}</small>
            </article>
          </div>
        </section>
      ) : null}

      {projection ? (
        <section className="detail-panel totals-board">
          <div className="detail-panel-header">
            <p className="eyebrow">Over / under board</p>
            <span>{totals?.weatherNote || 'Full game plus inning splits'}</span>
          </div>
          <div className="totals-grid">
            {totalsCards.map((card) => (
              <article key={`${game.id}-${card.id}`} className="totals-card">
                <div className="totals-card-head">
                  <div>
                    <p className="eyebrow">{card.title}</p>
                    <strong>{card.lean?.label || 'Pass'}</strong>
                  </div>
                  <span>{card.lean?.strength || 'Pass'}</span>
                </div>
                <small>{card.lean?.summary || 'No totals edge stored for this phase.'}</small>
                {totalAddendumChips(card.lean).length ? (
                  <div className="totals-addendum-chip-row">
                    {totalAddendumChips(card.lean).map((chip) => (
                      <span key={`${game.id}-${card.id}-${chip}`}>{chip}</span>
                    ))}
                  </div>
                ) : null}
                <span>{card.projectedLabel}</span>
                <small>Line: {card.lineLabel}</small>
                <small>{card.splitLabel}</small>
                {Array.isArray((card as AnyRecord).reasonStack) && (card as AnyRecord).reasonStack.length ? (
                  <div className="first-inning-reason-stack">
                    <strong>Why</strong>
                    <ul>
                      {((card as AnyRecord).reasonStack as string[]).map((reason, index) => (
                        <li key={`${game.id}-${card.id}-reason-${index}`}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {Array.isArray((card as AnyRecord).cautionStack) && (card as AnyRecord).cautionStack.length ? (
                  <div className="first-inning-reason-stack caution">
                    <strong>Counterweights</strong>
                    <ul>
                      {((card as AnyRecord).cautionStack as string[]).map((reason, index) => (
                        <li key={`${game.id}-${card.id}-caution-${index}`}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
          <small className="totals-footnote">
            {totals?.bullpenExhaustionNote || 'No bullpen or weather totals note stored yet.'}
          </small>
        </section>
      ) : null}

      {projection ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Bridge chains</p>
            <span>{projection.bridgeEdgeTeam ? `${projection.bridgeEdgeTeam} hold the cleaner middle-innings lane` : 'Bridge lanes are close on this pass'}</span>
          </div>
          <div className="bridge-chain-grid-react">
            {renderBridgeChainCard(
              awayTeam,
              awayBridge,
              awayBridgeScore,
              projection.awayBullpenExhaustionLabel || 'unknown',
              projection.bridgeEdgeTeam === awayTeam,
              awayRecentBullpenSummary,
              awaySeasonBullpenSummary,
              awayRelieverShadow,
              awayBridgeSourceLabel
            )}
            {renderBridgeChainCard(
              homeTeam,
              homeBridge,
              homeBridgeScore,
              projection.homeBullpenExhaustionLabel || 'unknown',
              projection.bridgeEdgeTeam === homeTeam,
              homeRecentBullpenSummary,
              homeSeasonBullpenSummary,
              homeRelieverShadow,
              homeBridgeSourceLabel
            )}
          </div>
        </section>
      ) : null}

      {game.lineupBoard ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Lineups</p>
            <span>{game.lineupBoard.weather?.label || game.lineupBoard.marketWeatherContext?.total || 'Projected board'}</span>
          </div>
          <div className="react-lineup-columns">
            {[awayLineup, homeLineup].map((lineupTeam: AnyRecord, index: number) => {
              if (!lineupTeam) return null
              const teamName = index === 0 ? awayTeam : homeTeam
              const sideKey = index === 0 ? 'away' : 'home'
              const opponentSideKey = index === 0 ? 'home' : 'away'
              const starterHistory = game.statMusePitcherHistory?.[sideKey]
              const opponentStarterHistory = game.statMusePitcherHistory?.[opponentSideKey]
              return (
                <article key={teamName} className="react-lineup-card">
                  <div className="react-lineup-card-head">
                    <strong>{teamName}</strong>
                    <small>{lineupStatusLabel(index === 0 ? game.lineupBoard?.status?.away : game.lineupBoard?.status?.home)}</small>
                  </div>
                  <div className="react-pill-row">
                    <span className="game-highlight-chip neutral">
                      <MetricHelp
                        label={`Top third ${formatNumber(lineupTeam.summary?.topThirdScore, 1)}`}
                        help="How strong the top of the order looks against today's starter lane. Higher means more early scoring pressure."
                      />
                    </span>
                    <span className="game-highlight-chip neutral">
                      <MetricHelp
                        label={`Depth ${formatNumber(lineupTeam.summary?.depthScore, 0)}`}
                        help="Bottom-half lineup quality after the stars. Higher depth matters more once the lineup turns over and the game gets into middle innings."
                      />
                    </span>
                    <span className="game-highlight-chip accent">
                      <MetricHelp
                        label={lineupTeam.summary?.pressureLabel || 'Lineup pressure'}
                        help="Short read on how this batting order is expected to apply pressure today based on form, split fit, and pitch-type matchup."
                      />
                    </span>
                  </div>
                  <div className="lineup-matchup-board">
                    <div className="lineup-matchup-head">
                      <strong>
                        Vs {lineupTeam.opposingStarter?.name} ({lineupTeam.opposingStarter?.hand}HP, {lineupTeam.opposingStarter?.type?.toLowerCase() || 'unknown lane'})
                      </strong>
                      {lineupTeam.starterRoleContext?.note ? (
                        <small>{lineupTeam.starterRoleContext.note}</small>
                      ) : null}
                      {lineupTeam.openerContext?.name ? (
                        <small>
                          MLB opener: {lineupTeam.openerContext.name}
                          {lineupTeam.openerContext.hand ? ` (${lineupTeam.openerContext.hand}HP)` : ''}; bulk/projection arm above.
                        </small>
                      ) : null}
                      <small>Starter mix: {lineupTeam.opposingStarter?.pitchMixSummary || 'Pitch mix not stored'}</small>
                      {lineupTeam.summary?.bullpenPitchTypeSummary?.firstReliever?.pitchMixSummary ? (
                        <small>
                          1st bridge mix: {lineupTeam.summary.bullpenPitchTypeSummary.firstReliever.name} | {lineupTeam.summary.bullpenPitchTypeSummary.firstReliever.pitchMixSummary}
                        </small>
                      ) : null}
                    </div>
                    <p className="react-section-copy">{lineupTeam.summary?.overview || lineupTeam.summary?.bullpenOverview || lineupTeam.opposingStarter?.pitchMixSummary}</p>
                    {starterHistory || opponentStarterHistory ? (
                      <div className="lineup-bvp-block">
                        {renderStatMusePitcherHistory('Starter history', starterHistory, 'StatMuse starter')}
                        {renderStatMusePitcherHistory(`Opp SP vs ${teamName}`, opponentStarterHistory, 'StatMuse opp SP')}
                      </div>
                    ) : null}
                    <div className="react-pill-row">
                      {(lineupTeam.summary?.overperformHitters || []).slice(0, 3).map((hitter: AnyRecord, hitterIndex: number) => (
                        <span key={`${teamName}-carry-${hitter.name}-${hitter.tag || 'x'}-${hitterIndex}`} className="game-highlight-chip accent">
                          {hitter.name} {hitter.tag}
                        </span>
                      ))}
                      {(lineupTeam.summary?.underperformHitters || []).slice(0, 2).map((hitter: AnyRecord, hitterIndex: number) => (
                        <span key={`${teamName}-fade-${hitter.name}-${hitter.tag || 'x'}-${hitterIndex}`} className="game-highlight-chip danger">
                          {hitter.name} {hitter.tag}
                        </span>
                      ))}
                    </div>
                    {lineupTeam.summary?.bullpenOverview ? <small>{lineupTeam.summary.bullpenOverview}</small> : null}
                    {lineupTeam.summary?.bullpenOverperformHitters?.length ? (
                      <div className="react-pill-row">
                        {lineupTeam.summary.bullpenOverperformHitters.slice(0, 3).map((hitter: AnyRecord, hitterIndex: number) => (
                          <span key={`${teamName}-bridge-${hitter.name}-${hitter.slot ?? 'x'}-${hitterIndex}`} className="game-highlight-chip warning">
                            Bridge: {hitter.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {lineupTeam.bvpHistory ? (
                      <div className="lineup-bvp-block">
                        <small>{lineupTeam.bvpHistory.summary}</small>
                        <div className="react-pill-row">
                          {(lineupTeam.bvpHistory.hot || []).slice(0, 2).map((entry: AnyRecord, entryIndex: number) => (
                            <span key={`${teamName}-bvp-hot-${entry.name}-${entry.sample || 'x'}-${entryIndex}`} className="game-highlight-chip accent">
                              BvP hot: {entry.name} {entry.sample}
                              {entry.homeRuns ? `, ${entry.homeRuns} HR` : ''}
                            </span>
                          ))}
                          {(lineupTeam.bvpHistory.cold || []).slice(0, 2).map((entry: AnyRecord, entryIndex: number) => (
                            <span key={`${teamName}-bvp-cold-${entry.name}-${entry.sample || 'x'}-${entryIndex}`} className="game-highlight-chip danger">
                              BvP cold: {entry.name} {entry.sample}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="react-lineup-list">
                    {(lineupTeam.lineup ?? []).slice(0, 9).map((player: AnyRecord) => (
                      <div key={`${teamName}-${player.playerId}-${player.slot}`} className="react-lineup-player">
                        <div>
                          <strong>{player.slot}. {player.name}</strong>
                          <small>{player.position} | {player.bats} | {player.primaryTag}</small>
                        </div>
                        <div className="react-lineup-player-metrics">
                          {renderLineupXwobaBubble(player)}
                          <span className={`game-highlight-chip ${getMetricTone(Number(player.metrics?.matchupGrade))}`}>
                            Matchup {formatSignedNumber(player.metrics?.matchupGrade, 1)}
                          </span>
                          <span className={`game-highlight-chip ${getMetricTone(Number(player.metrics?.pitchTypeGrade))}`}>
                            Pitch fit {formatSignedNumber(player.metrics?.pitchTypeGrade, 1)}
                          </span>
                        </div>
                        {renderBatterSplitModule(player, lineupTeam.opposingStarter?.hand)}
                        <span>{player.matchupNote} | {player.pitchType?.summary || player.summary}</span>
                        {buildLineupPlayerInspectionLine(player, lineupTeam.opposingStarter?.hand) ? (
                          <small className="react-lineup-player-inspection">
                            {buildLineupPlayerInspectionLine(player, lineupTeam.opposingStarter?.hand)}
                          </small>
                        ) : null}
                        {player.savant?.playerUrl ? (
                          <div className="react-lineup-player-links">
                            <a href={player.savant.playerUrl} target="_blank" rel="noreferrer">Savant</a>
                            {player.savant?.statsUrls?.splits ? (
                              <a href={player.savant.statsUrls.splits} target="_blank" rel="noreferrer">Splits</a>
                            ) : null}
                            {player.savant?.statsUrls?.gamelogs ? (
                              <a href={player.savant.statsUrls.gamelogs} target="_blank" rel="noreferrer">Logs</a>
                            ) : null}
                            {player.savant?.statsUrls?.statcast ? (
                              <a href={player.savant.statsUrls.statcast} target="_blank" rel="noreferrer">Statcast</a>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}

      {propLaneSections.length > 0 ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Prop lanes</p>
            <span>{game.playerProps?.summary}</span>
          </div>
          <div className="react-prop-lane-grid">
            {propLaneSections.map((lane) => (
              <article key={lane.propType} className="react-prop-lane-card">
                <div className="react-prop-lane-head">
                  <strong>{lane.label}</strong>
                  <span>{lane.picks.length} live</span>
                </div>
                <div className="react-prop-grid">
                  {lane.picks.map((prop: AnyRecord) => (
                    <article key={prop.id} className="react-prop-card">
                      <div className="react-prop-head">
                        <strong>{prop.playerName}</strong>
                        <span>Score {Math.round(Number(prop.confidence) || 0)}</span>
                      </div>
                      <p>{prop.marketLabel}</p>
                      {prop.shadowSupportTag ? (
                        <div className="react-pill-row">
                          <span className={`game-highlight-chip ${prop.shadowSupportLevel === 'backed' ? 'accent' : 'warning'}`}>
                            {prop.shadowSupportTag}
                          </span>
                        </div>
                      ) : null}
                      {prop.statValueLabel ? <small>{prop.statValueLabel}</small> : null}
                      <small>{prop.reason}</small>
                    </article>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {homeRunTargets.length > 0 ? (
        <section className="detail-panel">
          <div className="detail-panel-header">
            <p className="eyebrow">Home run board</p>
            <span>Weighted candidates</span>
          </div>
          <div className="react-prop-grid">
            {homeRunTargets.slice(0, 6).map((target: AnyRecord) => (
              <article key={target.id ?? `${target.teamName}-${target.playerName}`} className="react-prop-card">
                <div className="react-prop-head">
                  <strong>{target.playerName}</strong>
                  <span>{target.shareLabel || `${Math.round((target.weightedShare ?? 0) * 100)}%`}</span>
                </div>
                <p>{target.teamName}</p>
                <small>{target.reason || target.summary || target.formSummary}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}

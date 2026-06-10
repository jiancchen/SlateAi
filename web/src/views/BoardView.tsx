import { useEffect } from 'react'
import { MlbDetail } from '../features/mlb/MlbDetail'
import { TennisDetail } from '../features/tennis/TennisDetail'

type AnyRecord = Record<string, any>

type BoardViewProps = Record<string, any>

export function BoardView(props: BoardViewProps) {
  const {
    activeDayId,
    activeDayIsoDate,
    activeFilter,
    activeTennisEventFilter,
    activeValueScope,
    addAnalystPick,
    availableValueScopes,
    buildGameHighlights,
    filterOptions,
    formatNumber,
    formatPercent,
    formatSignedNumber,
    formatSnapshotTime,
    formatTennisValueSelection,
    games,
    getCompetitorDisplayName,
    getGameDisplayTitle,
    getGameResultLine,
    globalSearchResults,
    isMobileDetailOpen: providedMobileDetailOpen,
    isActiveDayLoading,
    isGlobalSearchLoading,
    isSelectedGameDetailLoading,
    isWinningCompetitor,
    labelForScore,
    latestLineupSnapshot,
    lineupStatusCounts,
    loadedGameDetailsByDay,
    marketSearch,
    mlbFirstInningValueSummary,
    mlbDetailProps,
    mlbScalpSummary,
    mlbValueSummary,
    openMobileDetailForGame: providedOpenMobileDetailForGame,
    openGlobalSearchResult,
    renderLeagueBadge,
    renderMoneylinePanel,
    selectedGame,
    selectedGameId,
    selectedPicks,
    setActiveDeskTab,
    setActiveFilter,
    setActiveValueScopeByDay,
    setSelectedGameIdByDay,
    shouldShowValueScope,
    slateMeta,
    swingTextFor,
    tennisDetailProps,
    tennisEventFilterOptions,
    tennisValueSummary,
    shouldShowTennisRailFilter,
    visibleGames,
    setActiveTennisEventFilterByDay,
    setIsMobileDetailOpen: providedSetMobileDetailOpen
  } = props

  const isMobileDetailOpen = Boolean(providedMobileDetailOpen)
  const setIsMobileDetailOpen =
    typeof providedSetMobileDetailOpen === 'function' ? providedSetMobileDetailOpen : () => {}
  const openMobileDetailForGame =
    typeof providedOpenMobileDetailForGame === 'function' ? providedOpenMobileDetailForGame : () => setIsMobileDetailOpen(true)

  useEffect(() => {
    setIsMobileDetailOpen(false)
  }, [activeDayId, activeFilter, activeValueScope])

  const openBoardGame = (gameId: unknown) => {
    const nextGameId = String(gameId || '')
    if (!nextGameId) return
    setSelectedGameIdByDay((current: AnyRecord) => ({ ...current, [activeDayId]: nextGameId }))
    openMobileDetailForGame(nextGameId)
  }

  const valueRowResultClass = (row: AnyRecord) =>
    row?.result?.hit === true ? ' hit' : row?.result?.hit === false ? ' miss' : row?.result?.tone === 'push' ? ' push' : ''

  const renderValueRowResult = (row: AnyRecord) =>
    row?.result?.label ? (
      <small className={`value-row-result ${row.result.hit === true ? 'hit' : row.result.hit === false ? 'miss' : row.result.tone === 'push' ? 'push' : ''}`}>
        {row.result.label}
        {row.result.actualScore
          ? ` | ${row.result.actualScore}`
          : row.result.actualValue !== undefined && row.result.actualValue !== null
            ? ` | Actual ${row.result.actualValue}`
            : ''}
      </small>
    ) : null

  const renderMlbRowTime = (row: AnyRecord) => {
    const start = row?.start || row?.raw?.start || row?.game?.start || ''
    if (!start) return null
    return <small className="mlb-value-row-time">Time {start}</small>
  }

  const shadowTierRank = (row: AnyRecord) => {
    const tier = String(row?.shadowCalibration?.tier || row?.raw?.shadowCalibration?.tier || '').toLowerCase()
    if (tier === 'promoted') return 3
    if (tier === 'watch') return 2
    if (tier === 'research') return 1
    return 0
  }

  const renderShadowCalibration = (row: AnyRecord) => {
    const shadow = row?.shadowCalibration || row?.raw?.shadowCalibration
    if (!shadow?.tier) return null
    const tier = String(shadow.tier).toLowerCase()
    const label = tier === 'promoted' ? 'Promoted' : tier === 'research' ? 'Research' : 'Watch'
    const reason = Array.isArray(shadow.reasons) ? shadow.reasons[0] : ''
    const evidence = shadow.evidence?.record ? `Seed ${shadow.evidence.record}` : ''
    return (
      <small className={`shadow-calibration-badge ${tier}`}>
        <span>{label}</span>
        {[reason, evidence].filter(Boolean).join(' | ')}
      </small>
    )
  }

  const renderTennisValueRows = (sectionLabel: string, rows: AnyRecord[] = []) => {
    const visibleRows = rows.filter((row) => row?.game).slice(0, 5)
    if (!visibleRows.length) return null

    return (
      <div className="tennis-value-list">
        <div className="tennis-value-section-label">{sectionLabel}</div>
        {visibleRows.map((row: AnyRecord) => {
          const rawEv = row.evPer100
          const ev =
            rawEv !== null && rawEv !== undefined && rawEv !== '' && Number.isFinite(Number(rawEv))
              ? Number(rawEv)
              : null
          const confidence = Number(row.modelPct ?? row.confidence)
          const confidenceLabel = Number.isFinite(confidence) ? `${Math.round(confidence)}% conf` : 'conf N/A'
          const expectedGames = Number(row.expectedGames)
          const marketText = String(row.marketType || row.label || '').toLowerCase()
          const showExpectedGames =
            Number.isFinite(expectedGames) && (marketText.includes('total') || marketText.includes('o/u'))
          const lineMeta = [
            row.valueGrade || row.grade || row.marketType,
            showExpectedGames ? `exp ${expectedGames.toFixed(1)} games` : null,
            row.gameTitle
          ].filter(Boolean).join(' | ')

          return (
            <button
              key={`${row.game.id}-${sectionLabel}-${row.marketType || row.label}-${row.selection || row.lean || row.line || 'row'}`}
              type="button"
              className={`tennis-value-row${valueRowResultClass(row)}`}
              onClick={() => openBoardGame(row.game.id)}
            >
              <span>
                <strong>{row.selection === 'No bet' && row.value ? row.value : formatTennisValueSelection(row)}</strong>
                <small>{lineMeta}</small>
              </span>
              <span>
                <strong>
                  {ev !== null
                    ? formatSignedNumber(ev, 1)
                    : Number.isFinite(confidence)
                      ? `${Math.round(confidence)}%`
                      : 'Price'}
                </strong>
                <small>{ev !== null ? `EV/100 | ${confidenceLabel}` : 'model confidence'}</small>
              </span>
            </button>
          )
        })}
      </div>
    )
  }
  const renderDetailKpiStrip = (extraClassName = '') => (
    <div className={`detail-kpi-strip ${extraClassName}`.trim()}>
      <article className="detail-kpi-card">
        <span className="eyebrow">Pick</span>
        <strong>{selectedGame.analysis?.participant?.name || 'No pick'}</strong>
        <small>Analyst read</small>
      </article>
      <article className={`detail-kpi-card ${Number(selectedGame.analysis?.confidence ?? 0) >= 70 ? 'strong-confidence' : ''}`}>
        <span className="eyebrow">Confidence</span>
        <strong>{Number(selectedGame.analysis?.confidence ?? 0) >= 70 ? `👍 ${selectedGame.analysis?.confidence}` : selectedGame.analysis?.confidence}</strong>
        <small>{labelForScore(selectedGame.analysis?.confidence ?? 0)}</small>
      </article>
      <article className="detail-kpi-card">
        <span className="eyebrow">Volatility</span>
        <strong>{selectedGame.analysis?.volatility}%</strong>
        <small>{labelForScore(selectedGame.analysis?.volatility ?? 0)}</small>
      </article>
      <article className="detail-kpi-card">
        <span className="eyebrow">Market</span>
        <strong>
          {selectedGame.tennisContext?.predictionMarket
            ? selectedGame.analysis?.marketProbabilityLabel
            : selectedGame.moneyline?.available
              ? selectedGame.analysis?.marketProbabilityLabel
              : 'Model only'}
        </strong>
        <small>
          {selectedGame.tennisContext?.marketEconomics?.priceAction ||
            (selectedGame.moneyline?.available ? selectedGame.moneyline.provider : 'No moneyline')}
        </small>
      </article>
      <article className="detail-kpi-card">
        <span className="eyebrow">Inputs</span>
        <strong>{selectedGame.analysis?.inputsUsed ?? 0}</strong>
        <small>{(selectedGame.tags ?? []).join(' | ')}</small>
      </article>
    </div>
  )

  const miniLineupSlots = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const formatPitcherHand = (hand: unknown) => {
    const value = String(hand || '').trim()
    if (!value) return ''
    if (/hp$/i.test(value)) return value.toUpperCase()
    if (/^[lr]$/i.test(value)) return `${value.toUpperCase()}HP`
    return value
  }
  const formatMiniStarter = (starter: AnyRecord | null | undefined) => {
    if (!starter) return 'SP TBD'
    const name = starter.fullName || starter.name || 'SP TBD'
    const hand = formatPitcherHand(starter.pitchHand || starter.hand || starter.throws || starter.handedness)
    return hand ? `SP ${name} (${hand})` : `SP ${name}`
  }
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
  const formatMiniBridgeChain = (game: AnyRecord, sideKey: string, team: AnyRecord | null | undefined) => {
    const shadowContext = game.relieverShadowContext?.[sideKey] ?? null
    if (Array.isArray(shadowContext?.relievers) && shadowContext.relievers.length) {
      const relievers = shadowContext.relievers
      const chainLabel = relievers.slice(0, 2).map((reliever: AnyRecord) => reliever.name).filter(Boolean).join(' -> ')
      const context = [
        Number.isFinite(Number(shadowContext.topTwoSharePct)) ? `top-2 share ${formatNumber(shadowContext.topTwoSharePct, 1)}%` : null,
        Number.isFinite(Number(shadowContext.starterHookRiskPct)) ? `hook ${formatNumber(shadowContext.starterHookRiskPct, 1)}%` : null,
        Number.isFinite(Number(shadowContext.remainingTop3AvailabilityAvg))
          ? `availability ${formatNumber(shadowContext.remainingTop3AvailabilityAvg, 0)}/100`
          : null,
        shadowContext.summaryLine || null
      ].filter(Boolean)
      return {
        label: `Bridge chain (RP36): ${chainLabel || 'reliever cluster attached'}`,
        detail: context.length ? context.join(' | ') : 'RP36 reliever-shadow cluster attached.'
      }
    }

    const projection = game.analysis?.mlbProjection ?? {}
    const projectedRelievers =
      sideKey === 'away'
        ? projection.awayLikelyRelievers
        : projection.homeLikelyRelievers
    const relievers = [
      ...(Array.isArray(projectedRelievers) ? projectedRelievers : []),
      ...(Array.isArray(game.bullpenChainContext?.[sideKey]?.topRelievers) ? game.bullpenChainContext[sideKey].topRelievers : []),
      ...(Array.isArray(team?.summary?.bullpenPitchTypeSummary?.relievers) ? team.summary.bullpenPitchTypeSummary.relievers : [])
    ]
    const uniqueRelievers = relievers.filter((reliever: AnyRecord, index: number, all: AnyRecord[]) =>
      reliever?.name && all.findIndex((entry: AnyRecord) => entry?.name === reliever.name) === index
    )
    const recent = game.bullpenChainContext?.[sideKey]?.recentBullpenSummary ?? null
    const score = sideKey === 'away' ? projection.awayBullpenChainScore : projection.homeBullpenChainScore
    const workload = sideKey === 'away' ? projection.awayBullpenExhaustionLabel : projection.homeBullpenExhaustionLabel
    const chainLabel = uniqueRelievers.length
      ? uniqueRelievers.slice(0, 2).map((reliever: AnyRecord) => reliever.name).join(' -> ')
      : 'No RP36 reliever cluster stored'
    const context = [
      Number.isFinite(Number(score)) ? `score ${formatNumber(score, 1)}` : null,
      workload && workload !== 'unknown' ? workload : null,
      recent && Number(recent.gamesSample || 0) > 0
        ? `last ${Number(recent.gamesSample || 0)} BP games ${formatNumber(recent.era, 2)} ERA / ${formatNumber(recent.whip, 2)} WHIP`
        : null
    ].filter(Boolean)
    return {
      label: `Bridge chain (RP36): ${chainLabel}`,
      detail: context.length ? context.join(' | ') : 'RP36 reliever-shadow output is sparse for this game.'
    }
  }
  const getBoardTeamLogoUrl = (league: string, teamName: string) => mlbDetailProps?.getTeamLogoUrl?.(league, teamName) || ''
  const renderBoardTeamLogo = (league: string, teamName: string, variant: 'compact' | 'inline' | 'title' = 'compact') => {
    const logoUrl = mlbDetailProps?.getTeamLogoUrl?.(league, teamName)
    if (!logoUrl) return null
    return <img src={logoUrl} alt="" aria-hidden="true" className={`team-logo team-logo--${variant}`} />
  }
  const buildGameRailLogoStyle = (game: AnyRecord) => {
    if (game?.league !== 'MLB') return null
    const awayTeam = game.matchup?.[0]?.name || ''
    const homeTeam = game.matchup?.[1]?.name || ''
    const awayLogo = getBoardTeamLogoUrl('MLB', awayTeam)
    const homeLogo = getBoardTeamLogoUrl('MLB', homeTeam)
    if (!awayLogo && !homeLogo) return null
    return {
      '--away-logo-url': awayLogo ? `url("${awayLogo}")` : 'none',
      '--home-logo-url': homeLogo ? `url("${homeLogo}")` : 'none'
    } as AnyRecord
  }
  const renderBoardMatchupTitle = (game: AnyRecord) => {
    if (game?.league !== 'MLB') return <h1>{getGameDisplayTitle(game)}</h1>

    const awayTeam = game.matchup?.[0]?.name || getCompetitorDisplayName(game, game.matchup?.[0], 0)
    const homeTeam = game.matchup?.[1]?.name || getCompetitorDisplayName(game, game.matchup?.[1], 1)
    const separator = String(getGameDisplayTitle(game)).includes('@') ? '@' : 'vs'
    return (
      <h1 className="detail-matchup-title">
        <span className="detail-matchup-team">
          {renderBoardTeamLogo('MLB', awayTeam, 'title')}
          <span>{awayTeam}</span>
        </span>
        <span className="detail-matchup-separator">{separator}</span>
        <span className="detail-matchup-team">
          {renderBoardTeamLogo('MLB', homeTeam, 'title')}
          <span>{homeTeam}</span>
        </span>
      </h1>
    )
  }
  const buildMiniLineupSignal = (player: AnyRecord | null | undefined) => {
    if (!player) return null
    const metrics = player.metrics ?? {}
    const tag = String(player.primaryTag || '').toLowerCase()
    const formScore = Number(metrics.formScore)
    const recentOps = Number(player.recent?.ops)
    const splitOps = Number(player.split?.ops)
    const matchupGrade = Number(metrics.matchupGrade)
    const pitchTypeGrade = Number(metrics.pitchTypeGrade)
    const matchupScore = Number(metrics.matchupScore)
    const pitchTypeFitScore = Number(metrics.pitchTypeFitScore)
    const coldNow =
      tag.includes('cold') ||
      (Number.isFinite(formScore) && formScore <= 32) ||
      (Number.isFinite(recentOps) && recentOps < 0.65)
    const hotNow =
      !coldNow &&
      (tag.includes('heater') ||
        (Number.isFinite(formScore) && formScore >= 72) ||
        (Number.isFinite(recentOps) && recentOps >= 0.9))
    const matchupHeatSignals = [
      tag.includes('edge') ||
      tag.includes('carry') ||
      tag.includes('arsenal'),
      Number.isFinite(matchupGrade) && matchupGrade >= 4,
      Number.isFinite(pitchTypeGrade) && pitchTypeGrade >= 3.5,
      Number.isFinite(matchupScore) && matchupScore >= 70,
      Number.isFinite(pitchTypeFitScore) && pitchTypeFitScore >= 75,
      Number.isFinite(splitOps) && splitOps >= 0.85
    ].filter(Boolean).length
    const eliteMatchupHeat =
      (Number.isFinite(matchupGrade) && matchupGrade >= 8) ||
      (Number.isFinite(pitchTypeGrade) && pitchTypeGrade >= 6) ||
      (Number.isFinite(matchupScore) && matchupScore >= 86) ||
      (Number.isFinite(pitchTypeFitScore) && pitchTypeFitScore >= 90) ||
      (Number.isFinite(splitOps) && splitOps >= 1)
    const expectedHeat = matchupHeatSignals >= 3 || eliteMatchupHeat

    if (hotNow && expectedHeat) return { emoji: '🔥🔥', label: 'Hot now and heating matchup' }
    if (coldNow && expectedHeat) return { emoji: '❄️🔥', label: 'Cold lately, heat-up spot' }
    return null
  }
  const clampMiniProjection = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
  const buildMiniLineupBasesSignal = (player: AnyRecord | null | undefined) => {
    if (!player) return null
    const metrics = player.metrics ?? {}
    const slot = Number(player.slot || 9)
    const projectedPa = clampMiniProjection(4.85 - (slot - 1) * 0.11, 3.75, 4.9)
    const recentTbRate = Number(player.recent?.totalBasesRate || 0)
    const splitTbRate = Number(player.split?.totalBasesRate || 0)
    const seasonTbRate = Number(player.season?.totalBasesRate || 0)
    const weightedTbRate = recentTbRate * 0.45 + splitTbRate * 0.35 + seasonTbRate * 0.2
    const matchupPressure = clampMiniProjection(Number(metrics.matchupScore || 50) / 100, 0.2, 1.2)
    const pitchFitPressure = clampMiniProjection(0.85 + Number(metrics.pitchTypeFitScore || 50) / 200, 0.65, 1.35)
    const expectedBases = projectedPa * weightedTbRate * matchupPressure * pitchFitPressure
    if (!Number.isFinite(expectedBases) || expectedBases < 1.5) return null

    return {
      label: `xB ${formatNumber(expectedBases, 1)}`,
      tone: expectedBases >= 2 ? 'strong' : 'watch',
      title: `Expected bases ${formatNumber(expectedBases, 2)} | weighted TB/PA ${formatNumber(weightedTbRate, 3)} | projected PA ${formatNumber(projectedPa, 2)}`
    }
  }
  const formatMiniXwoba = (value: unknown) => {
    const numberValue = Number(value)
    if (!Number.isFinite(numberValue)) return 'N/A'
    return numberValue.toFixed(3).replace(/^0/, '.')
  }
  const buildMiniLineupXwobaSignal = (player: AnyRecord | null | undefined) => {
    if (!player) return null
    const statcast = player.statcastTrend || {}
    const rolling7 = Number(statcast.rolling7Xwoba)
    const rolling30 = Number(statcast.rolling30Xwoba)
    if (!Number.isFinite(rolling7) && !Number.isFinite(rolling30)) return null
    const tone = Number.isFinite(rolling7) && rolling7 >= 0.37 ? 'strong' : Number.isFinite(rolling7) && rolling7 < 0.29 ? 'cold' : 'watch'
    const trend = Number(statcast.xwobaTrend)
    const trendLabel = Number.isFinite(trend) ? `${trend >= 0 ? '+' : ''}${trend.toFixed(3).replace(/^(-?)0/, '$1.')}` : ''
    return {
      label: `xwOBA ${formatMiniXwoba(rolling7)}`,
      tone,
      title: `7-game xwOBA ${formatMiniXwoba(rolling7)} | 30-day xwOBA ${formatMiniXwoba(rolling30)}${trendLabel ? ` | trend ${trendLabel}` : ''}`
    }
  }
  const renderMiniLineupOrder = (game: AnyRecord) => {
    const lineupBoard = game.lineupBoard
    if (!lineupBoard?.away && !lineupBoard?.home) return null

    const lineupStatusLabel = mlbDetailProps?.lineupStatusLabel ?? ((status: string) => status || 'partial')
    const sides = [
      {
        key: 'away',
        teamName: lineupBoard.away?.teamName || game.matchup?.[0]?.name || 'Away',
        status: lineupBoard.status?.away,
        starter: game.starterContext?.away,
        team: lineupBoard.away
      },
      {
        key: 'home',
        teamName: lineupBoard.home?.teamName || game.matchup?.[1]?.name || 'Home',
        status: lineupBoard.status?.home,
        starter: game.starterContext?.home,
        team: lineupBoard.home
      }
    ]
    const hasLineup = sides.some((side) => Array.isArray(side.team?.lineup) && side.team.lineup.length)
    if (!hasLineup) return null

    return (
      <section className="mini-lineup-order" aria-label={`${getGameDisplayTitle(game)} lineup order`}>
        <div className="detail-panel-header mini-lineup-order-head">
          <p className="eyebrow">Lineup order</p>
          <span>{lineupBoard.weather?.label || lineupBoard.marketWeatherContext?.total || 'Projected board'}</span>
        </div>
        <div className="mini-lineup-order-grid">
          {sides.map((side) => {
            const lineup = Array.isArray(side.team?.lineup) ? side.team.lineup.slice(0, 9) : []
            const playerBySlot = new Map<number, AnyRecord>()
            const opponentSideKey = side.key === 'away' ? 'home' : 'away'
            const starterHistory = game.statMusePitcherHistory?.[side.key]
            const opponentStarterHistory = game.statMusePitcherHistory?.[opponentSideKey]
            const bridgeChainSummary = formatMiniBridgeChain(game, side.key, side.team)
            lineup.forEach((player: AnyRecord, index: number) => {
              const slot = Number(player.slot)
              const normalizedSlot = Number.isFinite(slot) && slot >= 1 && slot <= 9 ? slot : index + 1
              if (!playerBySlot.has(normalizedSlot)) playerBySlot.set(normalizedSlot, player)
            })

            return (
              <article key={`${game.id}-${side.key}-mini-lineup`} className="mini-lineup-team">
                <div className="mini-lineup-team-head">
                  <div className="mini-lineup-team-title">
                    {renderBoardTeamLogo('MLB', side.teamName, 'inline')}
                    <div>
                      <strong>{side.teamName}</strong>
                      <small>{formatMiniStarter(side.starter)}</small>
                    </div>
                  </div>
                  <span className={`builder-status-pill ${side.status === 'posted' ? 'open' : ''}`}>
                    {lineupStatusLabel(side.status)}
                  </span>
                </div>
                {starterHistory || opponentStarterHistory ? (
                  <div className="lineup-bvp-block">
                    {renderStatMusePitcherHistory('Starter history', starterHistory, 'StatMuse starter')}
                    {renderStatMusePitcherHistory(`Opp SP vs ${side.teamName}`, opponentStarterHistory, 'StatMuse opp SP')}
                  </div>
                ) : null}
                <div className="lineup-bvp-block">
                  <small>{bridgeChainSummary.label}</small>
                  <small>{bridgeChainSummary.detail}</small>
                </div>
                <div className="mini-lineup-slots">
                  {miniLineupSlots.map((slot) => {
                    const player = playerBySlot.get(slot)
                    const signal = buildMiniLineupSignal(player)
                    const basesSignal = buildMiniLineupBasesSignal(player)
                    const xwobaSignal = buildMiniLineupXwobaSignal(player)
                    const playerMeta = player
                      ? [player.position, player.bats ? `${player.bats} bat` : null].filter(Boolean).join(' | ')
                      : 'missing / unknown'
                    const playerName = player?.name || 'Open slot'

                    return (
                      <div
                        key={`${game.id}-${side.key}-lineup-slot-${slot}`}
                        className={`mini-lineup-slot ${player ? '' : 'missing'}`}
                        title={player ? `${slot}. ${playerName} | ${playerMeta}` : `${side.teamName} slot ${slot} missing`}
                      >
                        <span className="mini-lineup-slot-number">{slot}</span>
                        <div className="mini-lineup-slot-main">
                          <strong className="mini-lineup-slot-name-row">
                            <span className="mini-lineup-player-name">{playerName}</span>
                          </strong>
                          <span className="mini-lineup-slot-meta-row">
                            {signal ? (
                              <span className="mini-lineup-player-signal" aria-label={signal.label} title={signal.label}>
                                {signal.emoji}
                              </span>
                            ) : null}
                            {basesSignal ? (
                              <span className={`mini-lineup-bases-signal ${basesSignal.tone}`} title={basesSignal.title}>
                                {basesSignal.label}
                              </span>
                            ) : null}
                            {xwobaSignal ? (
                              <span className={`mini-lineup-xwoba-signal ${xwobaSignal.tone}`} title={xwobaSignal.title}>
                                {xwobaSignal.label}
                              </span>
                            ) : null}
                            <small>{playerMeta}</small>
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    )
  }
  const selectedMiniLineupOrder = selectedGame?.league === 'MLB' ? renderMiniLineupOrder(selectedGame) : null
  const compareMlbShapeRows = (left: AnyRecord, right: AnyRecord) => {
    const leftConfidence = Number(left.sortConfidence ?? left.confidence ?? 0)
    const rightConfidence = Number(right.sortConfidence ?? right.confidence ?? 0)
    const leftEdge = Number(left.sortEdge ?? 0)
    const rightEdge = Number(right.sortEdge ?? 0)
    const tierDelta = shadowTierRank(right) - shadowTierRank(left)
    if (tierDelta) return tierDelta
    const calibrationDelta =
      Number(right.shadowCalibration?.calibratedScore || right.raw?.shadowCalibration?.calibratedScore || 0) -
      Number(left.shadowCalibration?.calibratedScore || left.raw?.shadowCalibration?.calibratedScore || 0)
    if (calibrationDelta) return calibrationDelta
    const leftMarketEdge =
      Number.isFinite(Number(left.raw?.marketPricePct)) ? Number(leftConfidence) - Number(left.raw.marketPricePct) : -Infinity
    const rightMarketEdge =
      Number.isFinite(Number(right.raw?.marketPricePct)) ? Number(rightConfidence) - Number(right.raw.marketPricePct) : -Infinity
    return rightConfidence - leftConfidence || rightMarketEdge - leftMarketEdge || rightEdge - leftEdge
  }
  const mlbMlShapeBoardRows = (() => {
    if (!mlbValueSummary) return []
    const maxRows = Math.min(10, Number(mlbValueSummary.totalGames || 0))
    const rankedRows = [...(mlbValueSummary.mlShapeRows || [])].sort(compareMlbShapeRows)
    const rowsByGame = new Map<string, AnyRecord>()
    rankedRows.forEach((row: AnyRecord) => {
      const gameId = String(row.gameId || '')
      if (!gameId || rowsByGame.has(gameId)) return
      rowsByGame.set(gameId, row)
    })
    return Array.from(rowsByGame.values()).slice(0, maxRows)
  })()

  return (
    <div className={`desk-board-workspace ${isMobileDetailOpen ? 'mobile-detail-open' : 'mobile-board-open'}`}>
      <section className="games-rail">
        <div className="games-rail-header">
          <div>
            <p className="eyebrow">Games</p>
            <h2>
              {slateMeta.date} | {activeFilter === 'All' ? 'full board' : activeFilter === 'Value' ? 'value board' : activeFilter}
            </h2>
          </div>
          <div className="games-rail-meta mono">
            <span>
              {activeFilter === 'Value'
                ? `${tennisValueSummary?.validatedRows?.length || 0} validated`
                : `${visibleGames.length} visible`}
            </span>
            {games.some((game: AnyRecord) => game.league === 'MLB') ? (
              <span>
                {lineupStatusCounts.posted}/{lineupStatusCounts.total} posted
              </span>
            ) : null}
          </div>
        </div>

        <div className={`games-rail-filters ${shouldShowTennisRailFilter && tennisEventFilterOptions?.length ? 'with-tennis-event-select' : ''}`}>
          {filterOptions.map((filter: string) => (
            <button
              key={filter}
              type="button"
              className={`rail-filter-chip ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
          {shouldShowTennisRailFilter && tennisEventFilterOptions?.length ? (
            <label className="tennis-event-filter">
              <span className="eyebrow">Tennis event</span>
              <select
                value={activeTennisEventFilter}
                onChange={(event) =>
                  setActiveTennisEventFilterByDay((current: AnyRecord) => ({
                    ...current,
                    [activeDayId]: event.target.value
                  }))
                }
              >
                {tennisEventFilterOptions.map((option: AnyRecord) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="games-rail-list no-scrollbar">
          {marketSearch.trim().length >= 2 && globalSearchResults.length ? (
            <section className="global-search-results">
              <div className="global-search-results-head">
                <span>All dates</span>
                <small>{globalSearchResults.length} match{globalSearchResults.length === 1 ? '' : 'es'}</small>
              </div>
              {globalSearchResults.slice(0, 12).map((result: AnyRecord) => (
                <button
                  key={result.id || `${result.date}-${result.gameId}-${result.title}`}
                  type="button"
                  className={`global-search-result ${activeDayId === result.date && selectedGameId === result.gameId ? 'active' : ''}`}
                  onClick={() => openGlobalSearchResult(result)}
                >
                  <span>
                    <strong>{result.title}</strong>
                    <small>{result.subtitle || `${result.dateLabel || result.date} | ${result.start || 'TBD'} | ${result.stage || result.league}`}</small>
                  </span>
                  <span className="global-search-result-meta">
                    <strong>{result.resultType || result.league || result.kind || ''}</strong>
                    <small>{result.matchContext || result.scoreline || result.resultStatus || result.confidence || ''}</small>
                  </span>
                </button>
              ))}
            </section>
          ) : marketSearch.trim().length >= 2 && isGlobalSearchLoading ? (
            <div className="placeholder-panel compact">
              <p className="eyebrow">Searching all dates</p>
              <h3>Looking across the archive</h3>
              <p>Checking every slate for games, teams, lineups, props, value lanes, and player matches.</p>
            </div>
          ) : null}
          {isActiveDayLoading ? (
            <div className="placeholder-panel compact">
              <p className="eyebrow">Loading slate</p>
              <h3>Pulling board data for {slateMeta.date}</h3>
              <p>The day module is loading on demand so the initial app bundle can stay lighter.</p>
            </div>
          ) : activeFilter === 'Value' ? (
            tennisValueSummary || mlbValueSummary || mlbScalpSummary ? (
              <>
                {availableValueScopes.length > 1 ? (
                  <section className="tennis-value-slate-card value-scope-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">Value board selector</p>
                        <h3>{activeDayIsoDate} board scope</h3>
                      </div>
                      <span>{availableValueScopes.find((scope) => scope.id === activeValueScope)?.label || 'All'}</span>
                    </div>
                    <p>Use the scope chips to jump straight to the board you care about instead of scrolling the full stack.</p>
                    <div className="value-scope-row">
                      {availableValueScopes.map((scope) => (
                        <button
                          key={scope.id}
                          type="button"
                          className={`value-scope-chip ${activeValueScope === scope.id ? 'active' : ''}`}
                          onClick={() => setActiveValueScopeByDay((current) => ({ ...current, [activeDayId]: scope.id }))}
                        >
                          {scope.label}
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}
                {tennisValueSummary && shouldShowValueScope('tennis') ? (
                  <section className="tennis-value-slate-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">Tennis value board</p>
                        <h3>{activeDayIsoDate} EV pass</h3>
                      </div>
                      <span>{tennisValueSummary.pricedRows}/{tennisValueSummary.totalRows} priced</span>
                    </div>
                    <p>{tennisValueSummary.note}</p>
                    <div className="tennis-value-pill-row">
                      <span>Validated {tennisValueSummary.validatedRows?.length || 0}</span>
                      <span>ML {tennisValueSummary.mlRows?.length || 0}</span>
                      <span>O/U {tennisValueSummary.matchTotalRows?.length || 0}</span>
                      <span>1st set {tennisValueSummary.firstSetRows?.length || 0}</span>
                      <span>PM trades {tennisValueSummary.kalshiTradeCandidates?.length || 0}</span>
                      <span>PM watch {tennisValueSummary.kalshiWatchRows?.length || 0}</span>
                      <span>PM pass {tennisValueSummary.kalshiPassRows?.length || 0}</span>
                      <span>No history {tennisValueSummary.kalshiNoHistoryRows?.length || 0}</span>
                      <span>Watch EV {tennisValueSummary.rawPositiveRows?.length || 0}</span>
                      <span>Thin {tennisValueSummary.countByGrade['Thin value'] || 0}</span>
                      <span>Negative EV {tennisValueSummary.countByGrade['Negative EV'] || 0}</span>
                      <span>Need price {tennisValueSummary.noPriceRows}</span>
                    </div>
                    {tennisValueSummary.validatedRows?.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">Winner / sportsbook EV</div>
                        {tennisValueSummary.validatedRows.slice(0, 5).map((row: AnyRecord) => (
                          <button
                            key={`${row.game.id}-${row.label}-${row.value}`}
                            type="button"
                            className={`tennis-value-row${valueRowResultClass(row)}`}
                            onClick={() => openBoardGame(row.game.id)}
                          >
                            <span>
                              <strong>{formatTennisValueSelection(row)}</strong>
                              <small>{row.validity?.label || row.marketType} | {row.gameTitle}</small>
                            </span>
                            <span>
                              <strong>{formatSignedNumber(row.evPer100, 1)}</strong>
                              <small>
                                EV/100 | {Number.isFinite(Number(row.modelPct ?? row.confidence))
                                  ? `${Math.round(Number(row.modelPct ?? row.confidence))}% conf`
                                  : 'conf N/A'}
                              </small>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="tennis-value-warning">
                        No blind-bet sportsbook values pass validation. PM rows below are separate trade-to-sell candidates;
                        rows without mapped Kalshi history are pass-only and should not be sized from generic matchup text.
                      </p>
                    )}
                    {renderTennisValueRows(
                      'Moneyline model picks',
                      tennisValueSummary.modelPickRows ||
                        tennisValueSummary.mlRows?.filter((row: AnyRecord) => row.selection === row.game?.analysis?.participant?.name)
                    )}
                    {renderTennisValueRows(
                      'Moneyline price watch (not model pick)',
                      tennisValueSummary.mlRows?.filter((row: AnyRecord) => row.selection !== row.game?.analysis?.participant?.name)
                    )}
                    {renderTennisValueRows('Match O/U games', tennisValueSummary.matchTotalRows)}
                    {renderTennisValueRows('1st-set O/U games', tennisValueSummary.firstSetRows)}
                    {tennisValueSummary.kalshiTradeCandidates?.length ? (
                      <div className="tennis-value-list tennis-trade-list">
                        <div className="tennis-value-section-label">Prediction market trade-to-sell</div>
                        {tennisValueSummary.kalshiTradeCandidates
                          .slice(0, 5)
                          .map((row: AnyRecord) => (
                          <button
                            key={`${row.marketTicker}-${row.boardMatchId}`}
                            type="button"
                            className="tennis-value-row tennis-value-row--trade"
                            onClick={() => openBoardGame(row.game.id)}
                          >
                            <span>
                              <strong>{row.selection} {Math.round(Number(row.yesAsk || 0) * 100)}c</strong>
                              <small>
                                Target {Math.round(Number(row.spikeModelTarget25x ?? row.projectedExit ?? 0) * 100)}c | hist {row.sameFavoriteHistoryCount}/{row.similarEntryHistoryCount} | {row.gameTitle}
                              </small>
                            </span>
                            <span>
                              <strong>{formatSignedNumber(Number(row.spikeModelEvPctOfEntry25x ?? row.tradeEvPctOfEntry ?? 0) * 100, 0)}%</strong>
                              <small>
                                {(row.spikeModelTier || row.candidateTier || 'watch')} | {formatPercent(Number(row.spikeModelProbability25x ?? row.targetHitProbability ?? 0) * 100, 0)} confidence
                              </small>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {tennisValueSummary.kalshiWatchRows?.length ? (
                      <div className="tennis-value-list tennis-trade-list">
                        <div className="tennis-value-section-label">Prediction market watchlist</div>
                        {tennisValueSummary.kalshiWatchRows
                          .slice(0, 5)
                          .map((row: AnyRecord) => (
                          <button
                            key={`${row.marketTicker}-${row.boardMatchId}-watch`}
                            type="button"
                            className="tennis-value-row tennis-value-row--trade"
                            onClick={() => openBoardGame(row.game.id)}
                          >
                            <span>
                              <strong>{row.selection} {Math.round(Number(row.yesAsk || 0) * 100)}c</strong>
                              <small>
                                Watch target {Math.round(Number(row.spikeModelTarget25x ?? row.projectedExit ?? 0) * 100)}c | hist {row.sameFavoriteHistoryCount}/{row.similarEntryHistoryCount} | {row.gameTitle}
                              </small>
                            </span>
                            <span>
                              <strong>{formatSignedNumber(Number(row.spikeModelEvPctOfEntry25x ?? row.tradeEvPctOfEntry ?? 0) * 100, 0)}%</strong>
                              <small>{formatPercent(Number(row.spikeModelProbability25x ?? row.targetHitProbability ?? 0) * 100, 0)} confidence</small>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {tennisValueSummary.kalshiNoHistoryRows?.length ? (
                      <small className="tennis-value-warning">
                        No-history PM pass: {tennisValueSummary.kalshiNoHistoryRows.slice(0, 4).map((row: AnyRecord) => row.selection).join(' | ')}
                      </small>
                    ) : null}
                    {tennisValueSummary.negativeMlRows.length ? (
                      <small className="tennis-value-warning">
                        ML traps: {tennisValueSummary.negativeMlRows.slice(0, 3).map((row: AnyRecord) => `${row.selection} ${formatSignedNumber(row.evPer100, 1)}`).join(' | ')}
                      </small>
                    ) : null}
                  </section>
                ) : null}
                {mlbValueSummary && shouldShowValueScope('mlb-overview') && mlbValueSummary.mlShapeRows?.length ? (
                  <section className="tennis-value-slate-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">MLB ML shape board</p>
                        <h3>{activeDayIsoDate} moneyline shape</h3>
                      </div>
                      <span>{mlbValueSummary.mlShapeRows.length} rows</span>
                    </div>
                    <p>Full-game moneyline shape only. F5 ML, F5 O/U, full-game totals, and team totals stay on their own boards.</p>
                    <div className="tennis-value-pill-row">
                      <span>ML shape {mlbValueSummary.mlShapeRows?.length || 0}</span>
                      <span>Kalshi {mlbValueSummary.mappedKalshiGames}</span>
                      <span>Posted {mlbValueSummary.fullyPostedGames}</span>
                      <span>Partial {mlbValueSummary.partialGames}</span>
                    </div>
                    {mlbMlShapeBoardRows.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">ML shape rows</div>
                        {mlbMlShapeBoardRows.map((row: AnyRecord) => (
                            <button
                              key={`${row.id}-mlb-value`}
                              type="button"
                              className={`tennis-value-row${valueRowResultClass(row)}`}
                              onClick={() => openBoardGame(row.gameId)}
                            >
                              <span>
                                <strong>{row.title}</strong>
                                <small>{row.subtitle} | {row.priceLabel || row.metaLabel}</small>
                                {renderValueRowResult(row)}
                                {renderMlbRowTime(row)}
                              </span>
                              <span>
                              <strong>
                                {row.evCents != null && Number.isFinite(Number(row.evCents))
                                  ? `${formatSignedNumber(row.evCents, 1)}c`
                                  : `${row.confidence}%`}
                              </strong>
                              <small>
                                {row.evCents != null && Number.isFinite(Number(row.evCents))
                                  ? `${row.confidence}% model | ${row.priceLabel || 'priced'}`
                                  : row.tags?.filter((tag: string) => !/^(promoted|watch|research)$/i.test(String(tag))).join(' | ') || row.metaLabel}
                              </small>
                            </span>
                            {renderShadowCalibration(row)}
                            </button>
                          ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}
                {mlbValueSummary && shouldShowValueScope('mlb-totals') && mlbValueSummary.totalRows.length ? (
                  <section className="tennis-value-slate-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">MLB full-game totals board</p>
                        <h3>{activeDayIsoDate} O/U runs</h3>
                      </div>
                      <span>{mlbValueSummary.totalRows.length} rows</span>
                    </div>
                    <p>Full-game O/U rows are separated from ML shape and first-five starter-window rows.</p>
                    <div className="tennis-value-list">
                      {mlbValueSummary.totalRows.slice(0, 12).map((row: AnyRecord) => (
                        <button
                          key={`${row.id}-full-total-board`}
                          type="button"
                          className={`tennis-value-row${valueRowResultClass(row)}`}
                          onClick={() => openBoardGame(row.gameId)}
                        >
                          <span>
                            <strong>{row.title}</strong>
                            <small>{row.subtitle} | {row.metaLabel || row.summary}</small>
                            {renderValueRowResult(row)}
                            {renderMlbRowTime(row)}
                          </span>
                          <span>
                            <strong>
                              {row.evCents != null && Number.isFinite(Number(row.evCents))
                                ? `${formatSignedNumber(row.evCents, 1)}c`
                                : `${row.confidence}%`}
                            </strong>
                            <small>{row.priceLabel}</small>
                          </span>
                          {renderShadowCalibration(row)}
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}
                {mlbValueSummary &&
                shouldShowValueScope('mlb-first5') &&
                ((mlbValueSummary.first5MoneylineRows?.length || 0) +
                  (mlbValueSummary.first5TotalRows?.length || 0) +
                  (mlbValueSummary.first5TotalResearchRows?.length || 0) >
                  0) ? (
                  <section className="tennis-value-slate-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">MLB 1st 5 value board</p>
                        <h3>{activeDayIsoDate} starter-window ML + O/U</h3>
                      </div>
                      <span>
                        {(mlbValueSummary.first5MoneylineRows?.length || 0) + (mlbValueSummary.first5TotalRows?.length || 0)} value rows
                      </span>
                    </div>
                    <p>
                      First 5 ML and O/U are shown from the M2 starter-window projection, with priced status called out separately when a live market is attached.
                    </p>
                    <div className="tennis-value-pill-row">
                      <span>F5 ML {mlbValueSummary.first5MoneylineRows?.length || 0}</span>
                      <span>F5 O/U {mlbValueSummary.first5TotalRows?.length || 0}</span>
                      <span>F5 O/U research {mlbValueSummary.first5TotalResearchRows?.length || 0}</span>
                      <span>
                        Priced {(mlbValueSummary.first5MoneylineRows || []).filter((row: AnyRecord) => row.raw?.hasMarket).length +
                          (mlbValueSummary.first5TotalRows || []).filter((row: AnyRecord) => row.raw?.hasMarket).length}
                      </span>
                    </div>
                    {mlbValueSummary.first5MoneylineRows?.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">1st 5 moneyline</div>
                        {mlbValueSummary.first5MoneylineRows.slice(0, 8).map((row: AnyRecord) => (
                          <button
                            key={`${row.id}-first5-ml-board`}
                            type="button"
                            className={`tennis-value-row${valueRowResultClass(row)}`}
                            onClick={() => openBoardGame(row.gameId)}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.subtitle} | {row.metaLabel}</small>
                              {renderValueRowResult(row)}
                              {renderMlbRowTime(row)}
                            </span>
                            <span>
                              <strong>
                                {row.evCents != null && Number.isFinite(Number(row.evCents))
                                  ? `${formatSignedNumber(row.evCents, 1)}c`
                                  : `${row.confidence}%`}
                              </strong>
                              <small>{row.priceLabel}</small>
                            </span>
                            {renderShadowCalibration(row)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {mlbValueSummary.first5TotalRows?.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">1st 5 O/U runs</div>
                        {mlbValueSummary.first5TotalRows.slice(0, 8).map((row: AnyRecord) => (
                          <button
                            key={`${row.id}-first5-total-board`}
                            type="button"
                            className={`tennis-value-row${valueRowResultClass(row)}`}
                            onClick={() => openBoardGame(row.gameId)}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.subtitle} | {row.metaLabel}</small>
                              {renderValueRowResult(row)}
                              {renderMlbRowTime(row)}
                            </span>
                            <span>
                              <strong>
                                {row.evCents != null && Number.isFinite(Number(row.evCents))
                                  ? `${formatSignedNumber(row.evCents, 1)}c`
                                  : `${row.confidence}%`}
                              </strong>
                              <small>{row.priceLabel}</small>
                            </span>
                            {renderShadowCalibration(row)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {mlbValueSummary.first5TotalResearchRows?.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">1st 5 O/U research only</div>
                        <p className="tennis-value-note">
                          {mlbValueSummary.first5TotalGateNote ||
                            'F5 O/U rows are withheld from bet-grade value until the lane clears settled calibration.'}
                        </p>
                        {mlbValueSummary.first5TotalResearchRows.slice(0, 5).map((row: AnyRecord) => (
                          <button
                            key={`${row.id}-first5-total-research`}
                            type="button"
                            className={`tennis-value-row muted${valueRowResultClass(row)}`}
                            onClick={() => openBoardGame(row.gameId)}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.subtitle} | {row.metaLabel}</small>
                              {renderMlbRowTime(row)}
                            </span>
                            <span>
                              <strong>Research</strong>
                              <small>{(row.raw?.gateReasons || []).slice(0, 2).join(' | ')}</small>
                            </span>
                            {renderShadowCalibration(row)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}
                {mlbValueSummary && shouldShowValueScope('mlb-team-totals') && mlbValueSummary.teamTotalRows?.length ? (
                  <section className="tennis-value-slate-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">MLB team totals value board</p>
                        <h3>{activeDayIsoDate} team run totals</h3>
                      </div>
                      <span>{mlbValueSummary.teamTotalRows.length} rows</span>
                    </div>
                    <p>Posted F5 team-total lines from the typed DK anchors, compared against the M2 first-five team-run projection.</p>
                    <div className="tennis-value-list">
                      {mlbValueSummary.teamTotalRows.slice(0, 12).map((row: AnyRecord) => (
                        <button
                          key={`${row.id}-team-total-board`}
                          type="button"
                          className={`tennis-value-row${valueRowResultClass(row)}`}
                          onClick={() => openBoardGame(row.gameId)}
                        >
                          <span>
                            <strong>{row.title}</strong>
                            <small>{row.subtitle} | {row.metaLabel}</small>
                            {renderValueRowResult(row)}
                            {renderMlbRowTime(row)}
                          </span>
                          <span>
                            <strong>{row.confidence}%</strong>
                            <small>{row.priceLabel}</small>
                          </span>
                          {renderShadowCalibration(row)}
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}
                {mlbFirstInningValueSummary && shouldShowValueScope('mlb-first-inning') ? (
                  <section className="tennis-value-slate-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">MLB 1st-inning model lanes</p>
                        <h3>{activeDayIsoDate} YRFI / NRFI model lanes</h3>
                      </div>
                      <span>{mlbFirstInningValueSummary.modeledGames}/{mlbFirstInningValueSummary.totalGames} modeled</span>
                    </div>
                    <p>{mlbFirstInningValueSummary.note}</p>
                    <div className="tennis-value-pill-row">
                      <span>YRFI lanes {mlbFirstInningValueSummary.yrfiRows.length}</span>
                      <span>NRFI lanes {mlbFirstInningValueSummary.nrfiRows.length}</span>
                      <span>Kalshi mapped {mlbFirstInningValueSummary.mappedGames}</span>
                      {mlbFirstInningValueSummary.settledRows ? (
                        <>
                          <span>Hit {mlbFirstInningValueSummary.hitRows}</span>
                          <span>Miss {mlbFirstInningValueSummary.missRows}</span>
                        </>
                      ) : null}
                    </div>
                    {mlbFirstInningValueSummary.yrfiRows.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">YRFI lanes</div>
                        {mlbFirstInningValueSummary.yrfiRows.slice(0, 10).map((row: AnyRecord) => (
                          <button
                            key={`${row.gameId}-yrfi-value`}
                            type="button"
                            className={`tennis-value-row${valueRowResultClass(row)}`}
                            onClick={() => openBoardGame(row.gameId)}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>
                                {row.result?.label ? `${row.result.label} | ${row.result.actualPick || 'pending'} ${row.result.totalRunsFirst1 ?? ''} R 1st | ` : ''}
                                {row.summary}
                              </small>
                              {renderMlbRowTime(row)}
                            </span>
                            <span>
                              <strong>{row.result?.label || `${row.confidence}%`}</strong>
                              <small>
                                {`YES ${formatNumber(row.yesModel, 1)}% · away ${formatNumber(row.awayRunPct, 1)}% · home ${formatNumber(row.homeRunPct, 1)}%`}
                                {row.hasKalshi ? ` · ask ${formatNumber(row.yesAsk, 1)}c` : ''}
                              </small>
                            </span>
                            {renderShadowCalibration(row)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {mlbFirstInningValueSummary.nrfiRows.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">NRFI lanes</div>
                        {mlbFirstInningValueSummary.nrfiRows.slice(0, 10).map((row: AnyRecord) => (
                          <button
                            key={`${row.gameId}-nrfi-value`}
                            type="button"
                            className={`tennis-value-row${valueRowResultClass(row)}`}
                            onClick={() => openBoardGame(row.gameId)}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>
                                {row.result?.label ? `${row.result.label} | ${row.result.actualPick || 'pending'} ${row.result.totalRunsFirst1 ?? ''} R 1st | ` : ''}
                                {row.summary}
                              </small>
                              {renderMlbRowTime(row)}
                            </span>
                            <span>
                              <strong>{row.result?.label || `${row.confidence}%`}</strong>
                              <small>
                                {`NO ${formatNumber(row.noModel, 1)}% · away ${formatNumber(row.awayRunPct, 1)}% · home ${formatNumber(row.homeRunPct, 1)}%`}
                                {row.hasKalshi ? ` · ask ${formatNumber(row.noAsk, 1)}c` : ''}
                              </small>
                            </span>
                            {renderShadowCalibration(row)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}
                {mlbValueSummary && shouldShowValueScope('mlb-tb') ? (
                  <section className="tennis-value-slate-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">MLB total-bases value board</p>
                        <h3>{activeDayIsoDate} TB lanes</h3>
                      </div>
                      <span>{mlbValueSummary.tbBackedRows.length} backed / {mlbValueSummary.totalBaseRows.length} total</span>
                    </div>
                    <p>TB is the strongest current batter-prop lane. `TB backed` means the deeper Statcast + opponent-strength shadow layer agrees; `soft heat` means the live board likes it but the tougher confirmation is thinner.</p>
                    <div className="tennis-value-pill-row">
                      <span>TB backed {mlbValueSummary.tbBackedRows.length}</span>
                      <span>Soft heat {mlbValueSummary.tbSoftHeatRows.length}</span>
                    </div>
                    {mlbValueSummary.totalBaseRows.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">Top TB values</div>
                        {mlbValueSummary.totalBaseRows.slice(0, 10).map((row: AnyRecord) => (
                          <button
                            key={`${row.id}-tb-board`}
                            type="button"
                            className={`tennis-value-row${valueRowResultClass(row)}`}
                            onClick={() => openBoardGame(row.gameId)}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.summary}</small>
                              {renderMlbRowTime(row)}
                            </span>
                            <span>
                              <strong>{row.confidence}%</strong>
                              <small>{`${row.priceLabel} | ${row.raw?.shadowSupportTag || 'Model-only'}`}</small>
                              {(row.contextWarnings?.length || row.raw?.contextWarnings?.length) ? (
                                <small className="tennis-value-warning inline">
                                  {(row.contextWarnings || row.raw?.contextWarnings).join(' | ')}
                                </small>
                              ) : null}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {mlbValueSummary.tbSoftHeatRows.length ? (
                      <small className="tennis-value-warning">
                        Soft-heat watchlist: {mlbValueSummary.tbSoftHeatRows.slice(0, 5).map((row: AnyRecord) => row.raw?.playerName || row.title).join(' | ')}
                      </small>
                    ) : null}
                  </section>
                ) : null}
                {mlbValueSummary && shouldShowValueScope('mlb-pitcher-er') && mlbValueSummary.pitcherEarnedRunRows?.length ? (
                  <section className="tennis-value-slate-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">MLB pitcher ER value board</p>
                        <h3>{activeDayIsoDate} earned runs allowed</h3>
                      </div>
                      <span>{mlbValueSummary.pitcherEarnedRunRows.length} rows</span>
                    </div>
                    <p>Earned-runs allowed rows use posted DK pitcher ER lines, recent starter ER shape, and opponent first-five run pressure.</p>
                    <div className="tennis-value-list">
                      {mlbValueSummary.pitcherEarnedRunRows.slice(0, 12).map((row: AnyRecord) => (
                        <button
                          key={`${row.id}-pitcher-er-board`}
                          type="button"
                          className={`tennis-value-row${valueRowResultClass(row)}`}
                          onClick={() => openBoardGame(row.gameId)}
                        >
                          <span>
                            <strong>{row.title}</strong>
                            <small>{row.summary}</small>
                            {renderValueRowResult(row)}
                            {renderMlbRowTime(row)}
                          </span>
                          <span>
                            <strong>{row.confidence}%</strong>
                            <small>{`${row.priceLabel} | ${row.metaLabel}`}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}
                {mlbValueSummary && shouldShowValueScope('mlb-strikeouts') ? (
                  <section className="tennis-value-slate-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">MLB strikeout O/U value board</p>
                        <h3>{activeDayIsoDate} pitcher strikeouts</h3>
                      </div>
                      <span>{mlbValueSummary.strikeoutRows.filter((row: AnyRecord) => row.raw?.lineupStatus === 'posted').length}/{mlbValueSummary.strikeoutRows.length} posted</span>
                    </div>
                    <p>Strikeout overs are currently the healthier sub-lane, but this board shows both directions so you can still see the under calls the model is producing.</p>
                    <div className="tennis-value-pill-row">
                      <span>Over {mlbValueSummary.strikeoutOverRows.length}</span>
                      <span>Under {mlbValueSummary.strikeoutUnderRows.length}</span>
                      <span>60+ conf {mlbValueSummary.strikeoutRows.length}</span>
                    </div>
                    {mlbValueSummary.strikeoutOverRows.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">Strikeout overs</div>
                        {mlbValueSummary.strikeoutOverRows.map((row: AnyRecord) => (
                          <button
                            key={`${row.id}-k-over-board`}
                            type="button"
                            className={`tennis-value-row${valueRowResultClass(row)}`}
                            onClick={() => openBoardGame(row.gameId)}
                          >
                          <span>
                            <strong>{row.title}</strong>
                            <small>{row.summary}</small>
                            {renderValueRowResult(row)}
                            {renderMlbRowTime(row)}
                          </span>
                            <span>
                              <strong>{row.confidence}%</strong>
                              <small>{`${row.priceLabel} | ${row.raw?.lineupStatus || 'partial'} order`}</small>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {mlbValueSummary.strikeoutUnderRows.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">Strikeout unders</div>
                        {mlbValueSummary.strikeoutUnderRows.map((row: AnyRecord) => (
                          <button
                            key={`${row.id}-k-under-board`}
                            type="button"
                            className={`tennis-value-row${valueRowResultClass(row)}`}
                            onClick={() => openBoardGame(row.gameId)}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.summary}</small>
                              {renderValueRowResult(row)}
                              {renderMlbRowTime(row)}
                            </span>
                            <span>
                              <strong>{row.confidence}%</strong>
                              <small>{`${row.priceLabel} | ${row.raw?.lineupStatus || 'partial'} order`}</small>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}
                {mlbValueSummary && shouldShowValueScope('mlb-mikes-botd') ? (
                  <section className="tennis-value-slate-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">Mike&apos;s BOTD</p>
                        <h3>{activeDayIsoDate} all-game H+R+RBI screen</h3>
                      </div>
                      <span>{mlbValueSummary.mikesBotdRows?.length || 0} BOTD rows</span>
                    </div>
                    <p>
                      This lane is separate from the normal H+R+RBI board. It promotes Mike-screened HRR rows with projected full-game ML win, 60%+ confidence, 30+ AB, and same-day FIC batter-vs-starter support.
                    </p>
                    <div className="tennis-value-pill-row">
                      <span>Mike screen</span>
                      <span>FIC support</span>
                      <span>AVG &gt; .300</span>
                      <span>OPS &gt; 1.000</span>
                      <span>All today</span>
                    </div>
                    {mlbValueSummary.mikesBotdRows?.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">Mike&apos;s BOTD candidates</div>
                        {mlbValueSummary.mikesBotdRows.slice(0, 8).map((row: AnyRecord) => (
                          <button
                            key={`${row.id}-mikes-botd`}
                            type="button"
                            className={`tennis-value-row${valueRowResultClass(row)}`}
                            onClick={() => openBoardGame(row.gameId)}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.summary}</small>
                              {renderMlbRowTime(row)}
                            </span>
                            <span>
                              <strong>{row.confidence}%</strong>
                              <small>{row.priceLabel}</small>
                              {row.raw?.valueBoardFilters?.ficDailyMatchup ? (
                                <small className="tennis-value-warning inline">
                                  {[
                                    `FIC ${row.raw.valueBoardFilters.ficDailyMatchup.bvpAtBats} AB`,
                                    `AVG ${row.raw.valueBoardFilters.ficDailyMatchup.bvpAvg}`,
                                    `OPS ${row.raw.valueBoardFilters.ficDailyMatchup.bvpOps}`
                                  ].join(' | ')}
                                </small>
                              ) : null}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <small className="tennis-value-warning">
                        No H+R+RBI row currently clears Mike&apos;s BOTD: Mike screen, projected ML win, 60%+ confidence, 30+ AB, and same-day FIC batter-vs-starter support.
                      </small>
                    )}
                  </section>
                ) : null}
                {mlbValueSummary && shouldShowValueScope('mlb-impact') ? (
                  <section className="tennis-value-slate-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">MLB batter value boards</p>
                        <h3>{activeDayIsoDate} H+R+RBI, hits, runs, RBI</h3>
                      </div>
                      <span>
                        {mlbValueSummary.displayHitRunRbiRows.length} HRR · {(mlbValueSummary.hitRows?.length || 0) + (mlbValueSummary.runRows?.length || 0) + (mlbValueSummary.rbiRows?.length || 0)} component
                      </span>
                    </div>
                    <p>
                      Combined H+R+RBI stays as its own clean-board lane. Hits, runs, and RBI stay visible below as separate component prop lanes.
                    </p>
                    <div className="tennis-value-pill-row">
                      <span>H+R+RBI {mlbValueSummary.displayHitRunRbiRows.length}</span>
                      <span>Hits {mlbValueSummary.hitRows?.length || 0}</span>
                      <span>Runs {mlbValueSummary.runRows?.length || 0}</span>
                      <span>RBI {mlbValueSummary.rbiRows?.length || 0}</span>
                    </div>
                    {mlbValueSummary.displayHitRunRbiRows.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">
                          Combined H+R+RBI clean board
                        </div>
                        {mlbValueSummary.displayHitRunRbiRows.slice(0, 8).map((row: AnyRecord) => (
                          <button
                            key={`${row.id}-impact-board`}
                            type="button"
                            className={`tennis-value-row${valueRowResultClass(row)}`}
                            onClick={() => openBoardGame(row.gameId)}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.summary}</small>
                              {renderValueRowResult(row)}
                              {row.raw?.valueBoardFilters ? (
                                <small>
                                  {[
                                    row.raw.valueBoardFilters.projectedTeamFullGameResult
                                      ? `ML PROJ ${String(row.raw.valueBoardFilters.projectedTeamFullGameResult).toUpperCase()}`
                                      : null,
                                    row.raw.valueBoardFilters.actualTeamFullGameResult
                                      ? `ML ${String(row.raw.valueBoardFilters.actualTeamFullGameResult).toUpperCase()}`
                                      : null,
                                    Number.isFinite(Number(row.raw.valueBoardFilters.recentAtBats))
                                      ? `AB ${Number(row.raw.valueBoardFilters.recentAtBats)}`
                                      : null
                                  ].filter(Boolean).join(' | ')}
                                </small>
                              ) : null}
                              {renderMlbRowTime(row)}
                            </span>
                            <span>
                              <strong>{row.confidence}%</strong>
                              <small>{row.priceLabel}</small>
                              {(row.contextWarnings?.length || row.raw?.contextWarnings?.length) ? (
                                <small className="tennis-value-warning inline">
                                  {(row.contextWarnings || row.raw?.contextWarnings).join(' | ')}
                                </small>
                              ) : null}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <small className="tennis-value-warning">
                        No combined H+R+RBI rows pass the clean-board filter yet: projected full-game ML win, 70%+ confidence, and 30+ AB.
                      </small>
                    )}
                    {[
                      ['Hits props', mlbValueSummary.hitRows || []],
                      ['Runs props', mlbValueSummary.runRows || []],
                      ['RBI props', mlbValueSummary.rbiRows || []]
                    ].map(([label, rows]: [string, AnyRecord[]]) =>
                      rows.length ? (
                        <div className="tennis-value-list" key={`mlb-impact-${label}`}>
                          <div className="tennis-value-section-label">{label}</div>
                          {rows.slice(0, 5).map((row: AnyRecord) => (
                            <button
                              key={`${row.id}-${label}-impact-board`}
                              type="button"
                              className={`tennis-value-row${valueRowResultClass(row)}`}
                              onClick={() => openBoardGame(row.gameId)}
                            >
                              <span>
                                <strong>{row.title}</strong>
                                <small>{row.summary}</small>
                                {renderMlbRowTime(row)}
                              </span>
                              <span>
                                <strong>{row.confidence}%</strong>
                                <small>{row.priceLabel}</small>
                                {(row.contextWarnings?.length || row.raw?.contextWarnings?.length) ? (
                                  <small className="tennis-value-warning inline">
                                    {(row.contextWarnings || row.raw?.contextWarnings).join(' | ')}
                                  </small>
                                ) : null}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null
                    )}
                  </section>
                ) : null}
                {mlbValueSummary && shouldShowValueScope('mlb-hr') ? (
                  <section className="tennis-value-slate-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">MLB HR value board</p>
                        <h3>{activeDayIsoDate} current home-run ladder</h3>
                      </div>
                      <span>{mlbValueSummary.postedHomeRunRows.length}/{mlbValueSummary.homeRunRows.length} posted orders</span>
                    </div>
                    <p>
                      HR is still a lower-trust lane than TB or posted-lineup strikeout props, but this board surfaces the
                      strongest current barrel, hard-hit, park, weather, and pitcher-matchup stacks.
                    </p>
                    <small className="tennis-value-warning">
                      Thresholds come from the saved HR score bands: <strong>premium</strong>, <strong>strong</strong>, and <strong>viable</strong>.
                      The ladder below now always shows the top current 10 targets, even if you just want the best available watchlist.
                    </small>
                    <div className="tennis-value-pill-row">
                      <span>Premium {mlbValueSummary.premiumHomeRunRows.length}</span>
                      <span>Strong {mlbValueSummary.strongHomeRunRows.length}</span>
                      <span>Viable {mlbValueSummary.viableHomeRunRows.length}</span>
                      <span>Posted {mlbValueSummary.postedHomeRunRows.length}</span>
                    </div>
                    {mlbValueSummary.homeRunRows.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">Top 10 HR ladder</div>
                        {mlbValueSummary.homeRunRows.slice(0, 10).map((row: AnyRecord) => {
                          const matchedGameSummary = games.find((game: AnyRecord) => game.id === row.gameId) ?? null
                          const matchedGameDetail = row.gameId ? loadedGameDetailsByDay[activeDayId]?.[row.gameId] ?? null : null
                          const matchedGame = matchedGameDetail ?? matchedGameSummary ?? null
                          const isHomeTeam =
                            matchedGame && matchedGame.participants?.[1]?.name === row.teamName
                          const teamContext =
                            matchedGame && isHomeTeam !== null
                              ? matchedGame.teamContext?.[isHomeTeam ? 'home' : 'away'] ?? null
                              : null
                          const opponentStarter =
                            matchedGame && isHomeTeam !== null
                              ? matchedGame.starterContext?.[isHomeTeam ? 'away' : 'home'] ?? null
                              : null
                          const teamGamesPlayed =
                            Number(teamContext?.wins || 0) + Number(teamContext?.losses || 0)
                          const xhrPerTeamGame =
                            Number.isFinite(Number(row.seasonXHR)) && teamGamesPlayed > 0
                              ? Number(row.seasonXHR) / teamGamesPlayed
                              : null
                          const pitchFit = row.lineupContext?.pitchType?.summary
                          const hr9 =
                            Number.isFinite(Number(row.opposingPitcherHr9))
                              ? `starter HR/9 ${formatNumber(row.opposingPitcherHr9, 2)}${
                                  Number.isFinite(Number(opponentStarter?.inningsPitched))
                                    ? ` over ${formatNumber(opponentStarter?.inningsPitched, 1)} IP`
                                    : ''
                                }`
                              : null
                          const park = Number.isFinite(Number(row.parkHrIndex)) ? `${Math.round(Number(row.parkHrIndex))} park HR index` : null
                          const slot = Number.isFinite(Number(row.lineupContext?.slot)) ? `slot ${Number(row.lineupContext.slot)}` : null
                          const statusLabel = row.lineupStatus === 'posted' ? 'posted order' : 'partial order'
                          const expectedHr =
                            xhrPerTeamGame != null ? `xHR/team game ${formatNumber(xhrPerTeamGame, 2)}` : null
                          const recentHr10 =
                            Number.isFinite(Number(row.homeRunsLast10Days)) && Number(row.homeRunsLast10Days) > 0
                              ? `${Number(row.homeRunsLast10Days)} HR last 10d`
                              : null
                          const recentHr7 =
                            Number.isFinite(Number(row.homeRunsLast7Days)) && Number(row.homeRunsLast7Days) > 0
                              ? `${Number(row.homeRunsLast7Days)} HR last 7d`
                              : null
                          const recentSinceMay =
                            Number.isFinite(Number(row.recentHrSinceMay1)) && Number(row.recentHrSinceMay1) > 0
                              ? `${Number(row.recentHrSinceMay1)} since May 1`
                              : null
                          const seasonHrLine = [
                            Number.isFinite(Number(row.seasonHr)) ? `${Number(row.seasonHr)} HR season` : null,
                            Number.isFinite(Number(row.seasonXHR)) ? `${formatNumber(row.seasonXHR, 1)} xHR season` : null,
                            expectedHr,
                          ]
                            .filter(Boolean)
                            .join(' | ')
                          const recentBurstLine = [
                            recentHr10 || recentHr7,
                            recentSinceMay,
                            Number.isFinite(Number(row.daysSinceLastHr)) ? `${Number(row.daysSinceLastHr)}d since last HR` : null,
                          ]
                            .filter(Boolean)
                            .join(' | ')
                          const versusPitcherLine = [
                            row.opposingPitcher
                              ? `vs ${row.opposingPitcher}${row.opposingPitcherHand ? ` (${row.opposingPitcherHand}HP)` : ''}`
                              : null,
                            hr9,
                            park,
                          ]
                            .filter(Boolean)
                            .join(' | ')
                          const lineupLine = [statusLabel, slot].filter(Boolean).join(' | ')
                          const contextSummary = String(row.signalSummary || '')
                            .replace(/\s*\|\s*/g, ' | ')
                            .replace(/^slot\s+\d+\s*|\s*/i, '')
                            .replace(/\s*|\s*[0-9.]+\s*HR\/9 starter$/i, '')
                            .trim()
                          const scoreBandLabel = String(row.scoreBand || 'watch').toUpperCase()
                          const hrScore = Number.isFinite(Number(row.score || row.baseScore))
                            ? Number(row.score || row.baseScore)
                            : null
                          const topScore = Number(mlbValueSummary.homeRunRows[0]?.score || mlbValueSummary.homeRunRows[0]?.baseScore || 0)
                          const slateConfidencePct =
                            hrScore && topScore > 0 ? Math.max(1, Math.min(99, Math.round((hrScore / topScore) * 100))) : null
                          const overallConfidenceLabel =
                            slateConfidencePct != null ? `${slateConfidencePct}% overall HR conf` : 'HR watch'
                          const scoreLabel = hrScore != null ? `${scoreBandLabel} ${formatNumber(hrScore, 1)}` : scoreBandLabel
                          return (
                            <button
                              key={`${row.gameId}-${row.playerId ?? row.playerName}-hr-board`}
                              type="button"
                              className={`tennis-value-row hr-value-row${valueRowResultClass(row)}`}
                              onClick={() => openBoardGame(row.gameId)}
                            >
                              <div className="hr-value-top">
                                <div className="hr-value-title-block">
                                  <strong>#{row.rank || '?'} {row.playerName}</strong>
                                  <small>{row.teamName} | {row.gameTitle}</small>
                                  {renderValueRowResult(row)}
                                  {renderMlbRowTime(row)}
                                </div>
                                <div className="hr-value-score-block">
                                  <strong>{scoreLabel}</strong>
                                  <small>{overallConfidenceLabel}</small>
                                </div>
                              </div>
                              {seasonHrLine ? <div className="hr-value-line"><span className="hr-value-label">Overall</span><small>{seasonHrLine}</small></div> : null}
                              {recentBurstLine ? <div className="hr-value-line"><span className="hr-value-label">Recent</span><small>{recentBurstLine}</small></div> : null}
                              {versusPitcherLine ? <div className="hr-value-line"><span className="hr-value-label">Vs pitcher</span><small>{versusPitcherLine}</small></div> : null}
                              {pitchFit ? <div className="hr-value-line"><span className="hr-value-label">Pitch mix</span><small>{pitchFit}</small></div> : null}
                              {lineupLine || contextSummary ? (
                                <div className="hr-value-line">
                                  <span className="hr-value-label">Context</span>
                                  <small>{[lineupLine, contextSummary].filter(Boolean).join(' | ')}</small>
                                </div>
                              ) : null}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <small className="tennis-value-warning">
                        No HR board payload is available for this slate yet. Once the saved home-run board lands, this ladder
                        will populate automatically.
                      </small>
                    )}
                  </section>
                ) : null}
                {mlbScalpSummary && shouldShowValueScope('mlb-scalp') ? (
                  <section className="tennis-value-slate-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">MLB 1st-inning scalp board</p>
                        <h3>{activeDayIsoDate} NRFI / NO scalp map</h3>
                      </div>
                      <span>{mlbScalpSummary.scalpRows.length}/{mlbScalpSummary.totalGames} mapped</span>
                    </div>
                    <p>{mlbScalpSummary.note}</p>
                    <div className="tennis-value-pill-row">
                      <span>Live ask works {mlbScalpSummary.generic50ReadyRows.length}</span>
                      <span>Need cheaper entry {mlbScalpSummary.cheapEntryRows.length}</span>
                      <span>70c take-it {mlbScalpSummary.take70Rows.length}</span>
                    </div>
                    {mlbScalpSummary.generic50ReadyRows.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">Current NO ask already works</div>
                        {mlbScalpSummary.generic50ReadyRows.slice(0, 5).map((row: AnyRecord) => (
                          <button
                            key={`${row.id}-generic50`}
                            type="button"
                            className={`tennis-value-row${valueRowResultClass(row)}`}
                            onClick={() => openBoardGame(row.gameId)}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.summary}</small>
                              {renderValueRowResult(row)}
                              {renderMlbRowTime(row)}
                            </span>
                            <span>
                              <strong>{row.scalpLabel}</strong>
                              <small>{row.detail}</small>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {mlbScalpSummary.cheapEntryRows.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">Only if you get a cheaper NO entry</div>
                        {mlbScalpSummary.cheapEntryRows.slice(0, 5).map((row: AnyRecord) => (
                          <button
                            key={`${row.id}-cheap`}
                            type="button"
                            className={`tennis-value-row${valueRowResultClass(row)}`}
                            onClick={() => openBoardGame(row.gameId)}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.summary}</small>
                              {renderValueRowResult(row)}
                              {renderMlbRowTime(row)}
                            </span>
                            <span>
                              <strong>{`< ${formatNumber(row.maxEntryFor70Pct, 1)}c`}</strong>
                              <small>{row.detail}</small>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {mlbScalpSummary.take70Rows.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">If 70c prints, take it</div>
                        {mlbScalpSummary.take70Rows.slice(0, 5).map((row: AnyRecord) => (
                          <button
                            key={`${row.id}-take70`}
                            type="button"
                            className={`tennis-value-row${valueRowResultClass(row)}`}
                            onClick={() => openBoardGame(row.gameId)}
                          >
                            <span>
                                <strong>{row.title}</strong>
                                <small>{row.summary}</small>
                                {renderValueRowResult(row)}
                                {renderMlbRowTime(row)}
                              </span>
                            <span>
                              <strong>{`${formatNumber(row.postScorelessTopNoPct, 1)}c fair`}</strong>
                              <small>{row.detail}</small>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}
              </>
            ) : (
              <div className="placeholder-panel compact">
                <p className="eyebrow">Value board</p>
                <h3>No value board for this slate</h3>
                <p>Once priced tennis rows or MLB edge rows are present, this tab will show the strongest board.</p>
              </div>
            )
          ) : visibleGames.length === 0 ? (
            <div className="placeholder-panel compact">
              <p className="eyebrow">No markets</p>
              <h3>No results for this filter yet</h3>
              <p>Try a different date, sport, or a looser search phrase.</p>
            </div>
          ) : (
            visibleGames.map((game: AnyRecord) => (
              <button
                key={game.id}
                type="button"
                className={`game-rail-row ${game.league === 'MLB' ? 'mlb-logo-card' : ''} ${selectedGame?.id === game.id ? 'active' : ''}`}
                style={buildGameRailLogoStyle(game) || undefined}
                onClick={() => openBoardGame(game.id)}
              >
                <div className="game-rail-row-meta">
                  {renderLeagueBadge(game.league)}
                  <span className="mono">{game.start}</span>
                  <span className="game-rail-stage">{game.stage}</span>
                </div>

                <div className="game-rail-row-main">
                  <div className="game-rail-title-wrap">
                    <div className="game-rail-title">
                      <span className={`game-rail-competitor ${isWinningCompetitor(game, game.matchup?.[0], 0) ? 'winner' : ''}`}>
                        {getCompetitorDisplayName(game, game.matchup?.[0], 0)}
                      </span>
                      <span className="versus-dot">vs</span>
                      <span className={`game-rail-competitor ${isWinningCompetitor(game, game.matchup?.[1], 1) ? 'winner' : ''}`}>
                        {getCompetitorDisplayName(game, game.matchup?.[1], 1)}
                      </span>
                    </div>
                    <small>
                      {game.winnerName
                        ? getGameResultLine(game)
                        : `${game.analysis?.participant?.name} lean`}
                    </small>
                  </div>
                  <div className="game-rail-score mono">{game.analysis?.confidence}</div>
                </div>

                <div className="game-rail-row-bottom">
                  <div className="game-rail-chips">
                    {buildGameHighlights(game)
                      .slice(0, 3)
                      .map((chip, index) => (
                        <span key={`${game.id}-chip-${index}`} className={`game-highlight-chip ${chip.tone}`}>
                          {chip.label}
                        </span>
                      ))}
                  </div>
                  <div className="game-rail-vol">
                    <span>{labelForScore(game.analysis?.confidence ?? 0)}</span>
                    <div className="mini-vol-bar">
                      <span style={{ width: `${game.analysis?.volatility ?? 0}%` }} />
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className={`detail-canvas ${selectedGame?.league === 'Tennis' ? 'tennis-detail-canvas' : ''}`}>
        {isActiveDayLoading && !selectedGame ? (
          <div className="placeholder-panel compact">
            <p className="eyebrow">Loading detail</p>
            <h3>Preparing the selected slate</h3>
            <p>Once the board loads, matchup analysis and props will appear here.</p>
          </div>
        ) : selectedGame ? (
          <>
            <div className="detail-canvas-header">
              <button type="button" className="mobile-detail-back" onClick={() => setIsMobileDetailOpen(false)}>
                Back to board
              </button>
              <div className="detail-canvas-title-block">
                <div className="detail-canvas-topline">
                  {renderLeagueBadge(selectedGame.league)}
                  <span className="mono">{selectedGame.start}</span>
                  <span>{selectedGame.stage}</span>
                  {latestLineupSnapshot ? <span>{formatSnapshotTime(latestLineupSnapshot)}</span> : null}
                </div>
                <div className="detail-title-row">
                  {renderBoardMatchupTitle(selectedGame)}
                </div>
              </div>

              <div className="detail-canvas-actions">
                {selectedGame.moneyline?.available ? (
                  <button type="button" className="analysis-action-button active" onClick={() => addAnalystPick(selectedGame)}>
                    {selectedPicks[selectedGame.id] === selectedGame.analysis?.participantId ? 'In ticket' : 'Add analyst pick'}
                  </button>
                ) : null}
                <button type="button" className="analysis-action-button" onClick={() => setActiveDeskTab('parlay')}>
                  Open builder
                </button>
              </div>
            </div>

            {selectedGame.league === 'Tennis' ? null : renderDetailKpiStrip('detail-kpi-strip-static')}

            <div className="detail-canvas-scroll no-scrollbar">
              {selectedGame.league === 'Tennis'
                ? renderDetailKpiStrip('detail-kpi-strip-scroll tennis-detail-kpi-strip no-scrollbar')
                : renderDetailKpiStrip('detail-kpi-strip-scroll mobile-detail-kpi-strip no-scrollbar')}
              <div className={`detail-canvas-grid ${selectedMiniLineupOrder ? 'with-sidecar' : 'single'}`}>
                <section className="detail-panel insight-panel editorial-market-panel">
                  <div className="detail-panel-header">
                    <p className="eyebrow">Editorial read</p>
                    <span>{(selectedGame.tags ?? []).join(' | ')}</span>
                  </div>
                  <p className="game-summary">{selectedGame.summary}</p>
                  <div className="closeout">
                    <p className="lean-line">{selectedGame.analysis?.lean}</p>
                    <p className="swing-line">{swingTextFor(selectedGame)}</p>
                  </div>
                  <ul className="factor-list compact">
                    {(selectedGame.factors ?? []).map((factor: string, index: number) => (
                      <li key={`${selectedGame.id}-factor-${index}`}>{factor}</li>
                    ))}
                  </ul>

                  <div className="editorial-market-grid">
                    {renderMoneylinePanel(selectedGame, { embedded: true })}
                    <section className="editorial-odds-snapshot" aria-label={`Odds snapshot for ${selectedGame.title}`}>
                      <div className="detail-panel-header">
                        <p className="eyebrow">Odds snapshot</p>
                        <span>{selectedGame.odds?.provider || selectedGame.moneyline?.provider || 'Model board'}</span>
                      </div>
                      <p className="react-section-copy">{selectedGame.odds?.note || selectedGame.summary}</p>
                      <div className="editorial-odds-market-list">
                        {(selectedGame.odds?.markets ?? []).map((market: AnyRecord) => (
                          <div key={`${selectedGame.id}-${market.label}`} className="editorial-odds-market">
                            <span>
                              <strong>{market.label}</strong>
                              <small>{market.book || selectedGame.odds?.provider}</small>
                            </span>
                            <p>{market.value}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </section>

                {selectedMiniLineupOrder ? <div className="detail-stack">{selectedMiniLineupOrder}</div> : null}
              </div>

              {selectedGame.league === 'MLB' && isSelectedGameDetailLoading ? (
                <section className="placeholder-panel compact">
                  <p className="eyebrow">Loading matchup detail</p>
                  <h3>Pulling lineup, starter, bridge, and story context</h3>
                  <p>The board summary is already loaded; the heavier MLB game detail is being fetched on demand.</p>
                </section>
              ) : null}
              {selectedGame.league === 'MLB' && !isSelectedGameDetailLoading ? (
                <MlbDetail game={selectedGame} {...mlbDetailProps} />
              ) : null}
              {selectedGame.league === 'Tennis' ? <TennisDetail game={selectedGame} {...tennisDetailProps} /> : null}
            </div>
          </>
        ) : (
          <div className="placeholder-panel">
            <p className="eyebrow">Board</p>
            <h3>No market selected</h3>
            <p>Select a game from the rail to open the detail canvas.</p>
          </div>
        )}
      </section>
    </div>
  )
}

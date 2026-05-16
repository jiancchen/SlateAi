<script>
  import { buildParlayModel, createParlayLeg, rankAnalysisPicks } from './lib/sports-model'
  import { defaultSlateDayId, slateDays } from './lib/slate-days'

  const PARLAY_MIN_LEGS = 2
  const PARLAY_MAX_LEGS = 10
  const leagueOrder = ['MLB', 'UFC', 'NBA', 'WNBA']
  const sidebarTabs = [
    { id: 'ticket', label: 'Ticket' },
    { id: 'signals', label: 'Signals' },
    { id: 'sources', label: 'Sources' },
    { id: 'notes', label: 'Notes' }
  ]

  let activeDayId = defaultSlateDayId
  let activeFilter = 'All'
  let activeSidebarTab = 'ticket'
  let parlayStake = 25
  let recommendedLegCount = 4
  let selectedPicksByDay = {}
  let expandedGameId = ''
  let pinnedSignalsByDay = {}
  let customSourcesByDay = {}
  let deskNotesByDay = {}
  let customSourceLabel = ''
  let customSourceUrl = ''

  const labelForScore = (score) => {
    if (score >= 72) return 'High'
    if (score >= 60) return 'Medium'
    return 'Watch'
  }

  const recommendationToneFor = (pick) => {
    if (pick.confidence >= 76 && pick.volatility <= 46) return 'Core build'
    if (pick.confidence >= 70) return 'Strong build'
    if (pick.volatility >= 62) return 'High-variance build'
    return 'Lean only'
  }

  const comparisonBarWidth = (value, ...comparisonValues) => {
    const numericValue = Number(value)
    const maxValue = Math.max(
      1,
      ...comparisonValues.map((entry) => {
        const numericEntry = Number(entry)
        return Number.isFinite(numericEntry) ? numericEntry : 0
      })
    )

    if (!Number.isFinite(numericValue) || maxValue <= 0) return '16%'

    return `${Math.max(16, Math.min(100, (numericValue / maxValue) * 100)).toFixed(1)}%`
  }

  const relieverStatusLabel = (reliever) => {
    if (!reliever) return 'Status unavailable'
    if (reliever.backToBack) return 'Back to back'
    if (reliever.workedYesterday) return 'Worked yesterday'
    return 'Fresh'
  }

  const countSelectedPicks = (picks) => Object.keys(picks).length

  const picksForDay = (dayId) => selectedPicksByDay[dayId] ?? {}
  const pinnedSignalsForDay = (dayId) => pinnedSignalsByDay[dayId] ?? []
  const customSourcesForDay = (dayId) => customSourcesByDay[dayId] ?? []
  const deskNoteForDay = (dayId) => deskNotesByDay[dayId] ?? ''

  const savePicksForDay = (dayId, nextPicks) => {
    selectedPicksByDay = {
      ...selectedPicksByDay,
      [dayId]: nextPicks
    }
  }

  const savePinnedSignalsForDay = (dayId, nextSignals) => {
    pinnedSignalsByDay = {
      ...pinnedSignalsByDay,
      [dayId]: nextSignals
    }
  }

  const saveCustomSourcesForDay = (dayId, nextSources) => {
    customSourcesByDay = {
      ...customSourcesByDay,
      [dayId]: nextSources
    }
  }

  const saveDeskNoteForDay = (dayId, note) => {
    deskNotesByDay = {
      ...deskNotesByDay,
      [dayId]: note
    }
  }

  $: activeDay = slateDays.find((day) => day.id === activeDayId) ?? slateDays[0]
  $: slateMeta = activeDay?.slateMeta ?? {
    title: 'Slate Daybook',
    date: '',
    subtitle: '',
    notes: []
  }
  $: games = activeDay?.games ?? []
  $: filterOptions = activeDay?.filters ?? ['All']
  $: oddsMeta = activeDay?.oddsMeta ?? { provider: '', snapshot: '', note: '' }
  $: sources = activeDay?.sources ?? []
  $: customSources = activeDay ? customSourcesByDay[activeDay.id] ?? [] : []
  $: allSources = [...sources, ...customSources]
  $: selectedPicks = activeDay ? selectedPicksByDay[activeDay.id] ?? {} : {}
  $: pinnedSignalIds = activeDay ? pinnedSignalsByDay[activeDay.id] ?? [] : []
  $: deskNote = activeDay ? deskNotesByDay[activeDay.id] ?? '' : ''
  $: dayIndex = slateDays.findIndex((day) => day.id === activeDay?.id)
  $: summaryCards =
    activeDay?.summary?.leagueCards ??
    leagueOrder.map((league) => ({ league, total: 0, spotlightCount: 0 }))

  $: if (activeDay && !filterOptions.includes(activeFilter)) {
    activeFilter = 'All'
  }

  $: eligibleMoneylineGames = games.filter((game) => game.moneyline.available)

  $: visibleGames =
    activeFilter === 'All' ? games : games.filter((game) => game.league === activeFilter)

  $: filteredMoneylineGames =
    activeFilter === 'All'
      ? eligibleMoneylineGames
      : eligibleMoneylineGames.filter((game) => game.league === activeFilter)

  $: spotlightGames = visibleGames.filter((game) => game.spotlight).slice(0, 6)

  $: confidenceAverage = visibleGames.length
    ? Math.round(
        visibleGames.reduce((total, game) => total + game.analysis.confidence, 0) /
          visibleGames.length
      )
    : 0

  $: volatilityAverage = visibleGames.length
    ? Math.round(
        visibleGames.reduce((total, game) => total + game.analysis.volatility, 0) /
          visibleGames.length
      )
    : 0

  $: analysisPicks = rankAnalysisPicks(games)

  $: analysisPickPool =
    activeFilter === 'All'
      ? analysisPicks
      : analysisPicks.filter((pick) => pick.league === activeFilter)

  $: analysisRankLookup = new Map(analysisPicks.map((pick) => [pick.gameId, pick.rank]))
  $: signalLadderPicks = analysisPickPool.slice(0, 6)
  $: pinnedSignalPicks = analysisPickPool.filter((pick) => pinnedSignalIds.includes(pick.gameId))
  $: modelCount = visibleGames.filter((game) => game.analysis.inputsUsed > 0).length
  $: spotlightCount = visibleGames.filter((game) => game.spotlight).length
  $: sourceCount = allSources.length

  $: if (!visibleGames.some((game) => game.id === expandedGameId)) {
    expandedGameId = visibleGames[0]?.id ?? ''
  }

  $: recommendationCounts =
    analysisPickPool.length >= PARLAY_MIN_LEGS
      ? Array.from(
          {
            length: Math.min(PARLAY_MAX_LEGS, analysisPickPool.length) - PARLAY_MIN_LEGS + 1
          },
          (_, index) => index + PARLAY_MIN_LEGS
        )
      : []

  $: activeRecommendedLegCount = recommendationCounts.includes(recommendedLegCount)
    ? recommendedLegCount
    : recommendationCounts[0] ?? 0

  $: recommendedParlayLegs =
    activeRecommendedLegCount > 0
      ? analysisPickPool
          .slice(0, activeRecommendedLegCount)
          .map((pick) => createParlayLeg(pick.game, pick.participantId, 'analysis'))
      : []

  $: recommendedParlay = buildParlayModel(recommendedParlayLegs, parlayStake)

  $: parlayLegs = games.flatMap((game) => {
    const participantId = selectedPicks[game.id]

    return participantId ? [createParlayLeg(game, participantId, 'manual')] : []
  })

  $: parlay = buildParlayModel(parlayLegs, parlayStake)
  $: atParlayLimit = parlay.legCount >= PARLAY_MAX_LEGS
  $: parlayReady = parlay.legCount >= PARLAY_MIN_LEGS && parlay.legCount <= PARLAY_MAX_LEGS
  $: parlayStatus =
    parlay.legCount === 0
      ? 'Choose between 2 and 10 moneyline legs from the board or best-picks tab.'
      : parlayReady
        ? `${parlay.legCount}-leg parlay ready.`
        : `Add ${PARLAY_MIN_LEGS - parlay.legCount} more leg to turn this into a parlay.`

  const hasPreviousDay = () => dayIndex > 0
  const hasNextDay = () => dayIndex >= 0 && dayIndex < slateDays.length - 1

  const setSidebarTab = (tabId) => {
    activeSidebarTab = tabId
  }

  const swingTextFor = (game) => game.swing || game.swingFactor || 'Swing factor still forming.'

  const selectDay = (dayId) => {
    if (!dayId || dayId === activeDayId) return

    activeDayId = dayId
    activeFilter = 'All'
    activeSidebarTab = 'ticket'
  }

  const stepDay = (delta) => {
    const nextDay = slateDays[dayIndex + delta]

    if (nextDay) selectDay(nextDay.id)
  }

  const toggleExpandedGame = (gameId) => {
    expandedGameId = expandedGameId === gameId ? '' : gameId
  }

  const openGame = (gameId) => {
    if (!gameId) return

    const targetGame = games.find((game) => game.id === gameId)

    if (targetGame && activeFilter !== 'All' && activeFilter !== targetGame.league) {
      activeFilter = targetGame.league
    }

    expandedGameId = gameId

    if (typeof document !== 'undefined') {
      requestAnimationFrame(() => {
        document.getElementById(`market-${gameId}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      })
    }
  }

  const openGameFromRow = (gameId) => {
    if (!gameId) return
    expandedGameId = expandedGameId === gameId ? '' : gameId
  }

  const openGameFromKey = (gameId, event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    openGameFromRow(gameId)
  }

  const togglePinnedSignal = (gameId) => {
    const currentSignals = pinnedSignalsForDay(activeDay.id)

    if (currentSignals.includes(gameId)) {
      savePinnedSignalsForDay(
        activeDay.id,
        currentSignals.filter((id) => id !== gameId)
      )
      return
    }

    savePinnedSignalsForDay(activeDay.id, [...currentSignals, gameId])
  }

  const addCustomSource = () => {
    const label = customSourceLabel.trim()
    const url = customSourceUrl.trim()

    if (!label || !url || !activeDay) return

    try {
      const parsed = new URL(url)
      saveCustomSourcesForDay(activeDay.id, [
        ...customSourcesForDay(activeDay.id),
        { label, url: parsed.toString() }
      ])
      customSourceLabel = ''
      customSourceUrl = ''
    } catch {
      return
    }
  }

  const toggleParlayPick = (gameId, participantId) => {
    const currentPicks = picksForDay(activeDay.id)

    if (currentPicks[gameId] === participantId) {
      const nextPicks = { ...currentPicks }
      delete nextPicks[gameId]
      savePicksForDay(activeDay.id, nextPicks)
      return
    }

    if (!currentPicks[gameId] && countSelectedPicks(currentPicks) >= PARLAY_MAX_LEGS) {
      activeSidebarTab = 'ticket'
      return
    }

    savePicksForDay(activeDay.id, {
      ...currentPicks,
      [gameId]: participantId
    })

    activeSidebarTab = 'ticket'
  }

  const removeParlayPick = (gameId) => {
    const currentPicks = picksForDay(activeDay.id)

    if (!currentPicks[gameId]) return

    const nextPicks = { ...currentPicks }
    delete nextPicks[gameId]
    savePicksForDay(activeDay.id, nextPicks)
  }

  const clearParlay = () => {
    savePicksForDay(activeDay.id, {})
  }

  const loadRecommendedParlay = (legCount = activeRecommendedLegCount) => {
    if (!legCount) return

    savePicksForDay(
      activeDay.id,
      Object.fromEntries(
        analysisPickPool.slice(0, legCount).map((pick) => [pick.gameId, pick.participantId])
      )
    )
    activeSidebarTab = 'ticket'
  }
</script>

<svelte:head>
  <title>{slateMeta.date} Sports Desk</title>
  <meta
    name="description"
    content={`A trading-desk style sports dashboard with date navigation, sport tabs, internal market scrolling, signals, sources, and parlay tools for the ${slateMeta.date} slate.`}
  />
</svelte:head>

<div class="terminal-shell">
  <header class="desk-topbar">
    <div class="date-header">
      <p class="eyebrow">Date Navigator</p>
      <h1>{slateMeta.date}</h1>
      <p class="terminal-summary">{games.length} games | {filteredMoneylineGames.length} moneylines | {activeDay.status}</p>
    </div>

    <div class="date-control-row">
      <button type="button" class="nav-step-button" disabled={!hasPreviousDay()} on:click={() => stepDay(-1)}>
        Previous
      </button>

      <div class="date-chip-row">
        {#each slateDays as day}
          <button
            type="button"
            class="date-chip"
            class:active={activeDayId === day.id}
            on:click={() => selectDay(day.id)}
          >
            <strong>{day.slateMeta.date}</strong>
            <small>{day.summary.totalGames} games</small>
          </button>
        {/each}
      </div>

      <button type="button" class="nav-step-button" disabled={!hasNextDay()} on:click={() => stepDay(1)}>
        Next
      </button>
    </div>

    <div class="schedule-tape" aria-label="Rolling schedule">
      {#each games as game}
        <button type="button" class="schedule-chip" on:click={() => openGame(game.id)}>
          <span>{game.league}</span>
          <strong>{game.start}</strong>
          <small>{game.title}</small>
        </button>
      {/each}
    </div>
  </header>

  <div class="desk-workspace">
    <main class="browser-column">
      <section class="browser-panel">
        <div class="browser-toolbar">
          <div>
            <p class="eyebrow">Main Browser</p>
            <h2>{activeFilter === 'All' ? 'All Sports' : activeFilter}</h2>
          </div>

          <div class="browser-toolbar-stats">
            <span>{visibleGames.length} visible</span>
            <span>{analysisPickPool.length} signals</span>
            <span>{oddsMeta.snapshot}</span>
          </div>
        </div>

        <div class="sport-tab-strip" role="tablist" aria-label="Sports tabs">
          {#each filterOptions as filter}
            <button
              type="button"
              role="tab"
              class="sport-tab"
              class:active={activeFilter === filter}
              aria-selected={activeFilter === filter}
              on:click={() => (activeFilter = filter)}
            >
              {filter}
            </button>
          {/each}
        </div>

        <div class="market-scroll">
          {#if visibleGames.length === 0}
            <section class="empty-day-panel">
              <p class="empty-day-kicker">{slateMeta.date} | {activeDay.status}</p>
              <h3>{activeDay.intakePrompt}</h3>

              <ul class="empty-day-list">
                {#each activeDay.intakeChecklist as item}
                  <li>{item}</li>
                {/each}
              </ul>
            </section>
          {:else}
            <div class="market-table">
              <div class="market-table-head">
                <span>Market</span>
                <span>Matchup</span>
                <span>Model</span>
                <span>Conf</span>
                <span>Odds</span>
                <span>Actions</span>
              </div>

              {#each visibleGames as game}
                <article id={`market-${game.id}`} class="market-row" data-open={expandedGameId === game.id}>
                  <div
                    class="market-row-main"
                    role="button"
                    tabindex="0"
                    aria-label={`Open ${game.title}`}
                    on:click={() => openGameFromRow(game.id)}
                    on:keydown={(event) => openGameFromKey(game.id, event)}
                  >
                    <div class="market-cell market-identity">
                      <div class="market-title-topline">
                        <span class="league-badge league-{game.league.toLowerCase()}">{game.league}</span>
                        <span class="time-pill">{game.start}</span>
                      </div>
                      <strong>{game.title}</strong>
                      <small>{game.stage}</small>
                    </div>

                    <div class="market-cell market-matchup-compact">
                      {#each game.matchup as side}
                        <div class="market-side-line">
                          <strong>{side.name}</strong>
                          <small>{side.detail}</small>
                        </div>
                      {/each}
                    </div>

                    <div class="market-cell market-signal">
                      <strong>{game.analysis.participant.name}</strong>
                      <small>{game.analysis.modelEdgeLabel}</small>
                      <p>{game.analysis.lean}</p>
                    </div>

                    <div class="market-cell market-confidence">
                      <strong>{game.analysis.confidence}</strong>
                      <small>{labelForScore(game.analysis.confidence)}</small>
                    </div>

                    <div class="market-cell market-odds-compact">
                      {#if game.moneyline.available}
                        {#each game.moneyline.participants as participant}
                          <div class="odds-chip" data-active={game.analysis.participantId === participant.id}>
                            <span>{participant.name}</span>
                            <strong>{participant.americanLabel}</strong>
                          </div>
                        {/each}
                      {:else}
                        <span class="odds-chip empty">No moneyline</span>
                      {/if}
                    </div>

                    <div class="market-cell market-actions">
                      {#if game.moneyline.available}
                        <div class="quick-pick-row">
                          {#each game.moneyline.participants as participant}
                            <button
                              type="button"
                              class="quick-pick-button"
                              class:active={selectedPicks[game.id] === participant.id}
                              disabled={atParlayLimit && !selectedPicks[game.id]}
                              on:click|stopPropagation={() => toggleParlayPick(game.id, participant.id)}
                            >
                              {participant.name}
                            </button>
                          {/each}
                        </div>
                      {/if}

                      <div class="market-row-buttons">
                        <button
                          type="button"
                          class="row-expand-button"
                          on:click|stopPropagation={() => toggleExpandedGame(game.id)}
                        >
                          {expandedGameId === game.id ? 'Hide' : 'Details'}
                        </button>
                        <button
                          type="button"
                          class="row-expand-button"
                          class:active={pinnedSignalIds.includes(game.id)}
                          on:click|stopPropagation={() => togglePinnedSignal(game.id)}
                        >
                          {pinnedSignalIds.includes(game.id) ? 'Pinned' : 'Pin'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {#if expandedGameId === game.id}
                    <div class="market-detail-grid">
                      <section class="detail-panel insight-panel">
                        <div class="detail-panel-header">
                          <p class="eyebrow">Read</p>
                          <span>{game.tags.join(' | ')}</span>
                        </div>

                        <p class="game-summary">{game.summary}</p>

                        <div class="closeout">
                          <p class="lean-line">{game.analysis.lean}</p>
                          <p class="swing-line">{swingTextFor(game)}</p>
                        </div>

                        <div class="meter-grid compact">
                          <div class="meter-card">
                            <div class="meter-label">
                              <span>Confidence</span>
                              <strong>{labelForScore(game.analysis.confidence)}</strong>
                            </div>
                            <div class="meter-track">
                              <span style={`width:${game.analysis.confidence}%;`}></span>
                            </div>
                          </div>

                          <div class="meter-card">
                            <div class="meter-label">
                              <span>Volatility</span>
                              <strong>{labelForScore(game.analysis.volatility)}</strong>
                            </div>
                            <div class="meter-track volatility">
                              <span style={`width:${game.analysis.volatility}%;`}></span>
                            </div>
                          </div>
                        </div>

                        <ul class="factor-list compact">
                          {#each game.factors as factor}
                            <li>{factor}</li>
                          {/each}
                        </ul>
                      </section>

                      <div class="detail-stack">
                        {#if game.moneyline.available}
                          <section class="pick-panel" aria-label={`Parlay picks for ${game.title}`}>
                            <div class="pick-heading">
                              <div>
                                <p class="pick-kicker">Ticket</p>
                                <p class="pick-caption">{game.moneyline.label}</p>
                              </div>

                              <div class="pick-side-meta">
                                <span class="pick-source">{game.moneyline.provider}</span>
                                <strong class="pick-analysis-note">
                                  My pick: {game.analysis.participant.name}
                                </strong>
                              </div>
                            </div>

                            <div class="pick-grid compact">
                              {#each game.moneyline.participants as participant}
                                <button
                                  type="button"
                                  class="pick-button"
                                  class:active={selectedPicks[game.id] === participant.id}
                                  disabled={atParlayLimit && !selectedPicks[game.id]}
                                  on:click|stopPropagation={() => toggleParlayPick(game.id, participant.id)}
                                >
                                  <div class="pick-button-topline">
                                    <span>{participant.name}</span>

                                    {#if game.analysis.available && game.analysis.participantId === participant.id}
                                      <span class="pick-badge">Analyst</span>
                                    {/if}
                                  </div>

                                  <strong>{participant.americanLabel}</strong>
                                  <small>{participant.impliedProbabilityLabel} implied</small>
                                </button>
                              {/each}
                            </div>
                          </section>
                        {/if}

                        <section class="odds-panel" aria-label={`Odds snapshot for ${game.title}`}>
                          <div class="odds-heading">
                            <div>
                              <p class="odds-kicker">Odds Snapshot</p>
                              <p class="odds-caption">{game.odds.provider || oddsMeta.provider}</p>
                            </div>
                            <span class="odds-time">{oddsMeta.snapshot}</span>
                          </div>

                          <div class="odds-list">
                            {#each game.odds.markets as market}
                              <div class="odds-row">
                                <div class="odds-row-topline">
                                  <span>{market.label}</span>
                                  <small>{market.book}</small>
                                </div>
                                <p>{market.value}</p>
                              </div>
                            {/each}
                          </div>

                          {#if game.odds.note}
                            <p class="odds-note">{game.odds.note}</p>
                          {/if}
                        </section>

                        {#if game.analysis.inputs.length > 0}
                          <section class="model-panel" aria-label={`Structured input model for ${game.title}`}>
                            <div class="model-heading">
                              <div>
                                <p class="model-kicker">Structured Model</p>
                                <p class="model-caption">{game.analysis.sourceLabel}</p>
                              </div>

                              <div class="model-heading-meta">
                                <strong>{game.analysis.participant.name}</strong>
                                <span>{game.analysis.modelEdgeLabel}</span>
                              </div>
                            </div>

                            <div class="model-chip-row">
                              <span>Confidence {game.analysis.confidence}</span>
                              <span>Volatility {game.analysis.volatility}</span>
                              <span>Market {game.analysis.marketProbabilityLabel}</span>
                            </div>

                            {#if game.analysis.mlbProjection}
                              {#if game.analysis.indicators}
                                <div class="meter-grid">
                                  <div class="meter-card">
                                    <div class="meter-label">
                                      <span>Starter leverage</span>
                                      <strong>{game.analysis.indicators.starterLeverageIndex}</strong>
                                    </div>
                                    <div class="meter-track">
                                      <span style={`width:${game.analysis.indicators.starterLeverageIndex}%`}></span>
                                    </div>
                                  </div>
                                  <div class="meter-card">
                                    <div class="meter-label">
                                      <span>Late hold</span>
                                      <strong>{game.analysis.indicators.lateInningStabilityIndex}</strong>
                                    </div>
                                    <div class="meter-track">
                                      <span style={`width:${game.analysis.indicators.lateInningStabilityIndex}%`}></span>
                                    </div>
                                  </div>
                                  <div class="meter-card">
                                    <div class="meter-label">
                                      <span>Relief risk</span>
                                      <strong>{game.analysis.indicators.reliefPitchingRisk}</strong>
                                    </div>
                                    <div class="meter-track volatility">
                                      <span style={`width:${game.analysis.indicators.reliefPitchingRisk}%`}></span>
                                    </div>
                                  </div>
                                  <div class="meter-card">
                                    <div class="meter-label">
                                      <span>Coin-flip pressure</span>
                                      <strong>{game.analysis.indicators.coinflipPressure}</strong>
                                    </div>
                                    <div class="meter-track volatility">
                                      <span style={`width:${game.analysis.indicators.coinflipPressure}%`}></span>
                                    </div>
                                  </div>
                                </div>
                              {/if}

                              <div class="model-phase-grid">
                                <article class="model-phase-card">
                                  <div class="model-phase-head">
                                    <div>
                                      <p>First 5</p>
                                      <strong>{game.analysis.mlbProjection.first5EdgeTeam} +{game.analysis.mlbProjection.first5EdgeHits}</strong>
                                    </div>
                                    <span>Starter window</span>
                                  </div>

                                  <div class="flow-lane-grid">
                                    <div class="flow-lane">
                                      <div class="flow-lane-label">
                                        <span>{game.matchup[0].name}</span>
                                        <strong>{game.analysis.mlbProjection.awayFirst5ProjectedHits} H</strong>
                                      </div>
                                      <div class="flow-track">
                                        <span
                                          style={`width:${comparisonBarWidth(
                                            game.analysis.mlbProjection.awayFirst5ProjectedHits,
                                            game.analysis.mlbProjection.awayFirst5ProjectedHits,
                                            game.analysis.mlbProjection.homeFirst5ProjectedHits
                                          )}`}
                                        ></span>
                                      </div>
                                      <small>{game.analysis.mlbProjection.awayFirst5HitEfficiencyPct}% efficiency</small>
                                    </div>
                                    <div class="flow-lane">
                                      <div class="flow-lane-label">
                                        <span>{game.matchup[1].name}</span>
                                        <strong>{game.analysis.mlbProjection.homeFirst5ProjectedHits} H</strong>
                                      </div>
                                      <div class="flow-track">
                                        <span
                                          style={`width:${comparisonBarWidth(
                                            game.analysis.mlbProjection.homeFirst5ProjectedHits,
                                            game.analysis.mlbProjection.awayFirst5ProjectedHits,
                                            game.analysis.mlbProjection.homeFirst5ProjectedHits
                                          )}`}
                                        ></span>
                                      </div>
                                      <small>{game.analysis.mlbProjection.homeFirst5HitEfficiencyPct}% efficiency</small>
                                    </div>
                                  </div>
                                </article>

                                <article class="model-phase-card">
                                  <div class="model-phase-head">
                                    <div>
                                      <p>Rest of game</p>
                                      <strong>{game.analysis.mlbProjection.lateEdgeTeam} +{game.analysis.mlbProjection.lateEdgeHits}</strong>
                                    </div>
                                    <span>Bridge and finish</span>
                                  </div>

                                  <div class="flow-lane-grid">
                                    <div class="flow-lane">
                                      <div class="flow-lane-label">
                                        <span>{game.matchup[0].name}</span>
                                        <strong>{game.analysis.mlbProjection.awayLateProjectedHits} H</strong>
                                      </div>
                                      <div class="flow-track">
                                        <span
                                          style={`width:${comparisonBarWidth(
                                            game.analysis.mlbProjection.awayLateProjectedHits,
                                            game.analysis.mlbProjection.awayLateProjectedHits,
                                            game.analysis.mlbProjection.homeLateProjectedHits
                                          )}`}
                                        ></span>
                                      </div>
                                      <small>{game.analysis.mlbProjection.awayLateHitEfficiencyPct}% efficiency</small>
                                    </div>
                                    <div class="flow-lane">
                                      <div class="flow-lane-label">
                                        <span>{game.matchup[1].name}</span>
                                        <strong>{game.analysis.mlbProjection.homeLateProjectedHits} H</strong>
                                      </div>
                                      <div class="flow-track">
                                        <span
                                          style={`width:${comparisonBarWidth(
                                            game.analysis.mlbProjection.homeLateProjectedHits,
                                            game.analysis.mlbProjection.awayLateProjectedHits,
                                            game.analysis.mlbProjection.homeLateProjectedHits
                                          )}`}
                                        ></span>
                                      </div>
                                      <small>{game.analysis.mlbProjection.homeLateHitEfficiencyPct}% efficiency</small>
                                    </div>
                                  </div>
                                </article>

                                <article class="model-phase-card model-phase-card--edge">
                                  <div class="model-phase-head">
                                    <div>
                                      <p>Full game</p>
                                      <strong>{game.analysis.mlbProjection.edgeTeam} +{game.analysis.mlbProjection.edgeHits}</strong>
                                    </div>
                                    <span>Total hit edge</span>
                                  </div>

                                  <div class="flow-lane-grid">
                                    <div class="flow-lane">
                                      <div class="flow-lane-label">
                                        <span>{game.matchup[0].name}</span>
                                        <strong>{game.analysis.mlbProjection.awayProjectedHits} H</strong>
                                      </div>
                                      <div class="flow-track">
                                        <span
                                          style={`width:${comparisonBarWidth(
                                            game.analysis.mlbProjection.awayProjectedHits,
                                            game.analysis.mlbProjection.awayProjectedHits,
                                            game.analysis.mlbProjection.homeProjectedHits
                                          )}`}
                                        ></span>
                                      </div>
                                      <small>{game.analysis.mlbProjection.awayHitEfficiencyPct}% efficiency</small>
                                    </div>
                                    <div class="flow-lane">
                                      <div class="flow-lane-label">
                                        <span>{game.matchup[1].name}</span>
                                        <strong>{game.analysis.mlbProjection.homeProjectedHits} H</strong>
                                      </div>
                                      <div class="flow-track">
                                        <span
                                          style={`width:${comparisonBarWidth(
                                            game.analysis.mlbProjection.homeProjectedHits,
                                            game.analysis.mlbProjection.awayProjectedHits,
                                            game.analysis.mlbProjection.homeProjectedHits
                                          )}`}
                                        ></span>
                                      </div>
                                      <small>{game.analysis.mlbProjection.homeHitEfficiencyPct}% efficiency</small>
                                    </div>
                                  </div>
                                </article>
                              </div>

                              <div class="model-note-row model-note-row--pitchers">
                                <span>{game.matchup[0].name}: {game.analysis.mlbProjection.awayPitcherType}</span>
                                <span>{game.matchup[1].name}: {game.analysis.mlbProjection.homePitcherType}</span>
                                {#if game.analysis.mlbProjection.bridgeEdgeTeam}
                                  <span>Bridge edge: {game.analysis.mlbProjection.bridgeEdgeTeam} +{game.analysis.mlbProjection.bridgeEdgeScore}</span>
                                {/if}
                              </div>

                              <div class="reliever-chain-grid">
                                <article class="reliever-chain-card">
                                  <div class="reliever-chain-head">
                                    <div>
                                      <p>{game.matchup[0].name} bridge chain</p>
                                      <strong>{game.analysis.mlbProjection.awayBullpenChainScore ?? 'N/A'}</strong>
                                    </div>
                                    <span>Likely first two</span>
                                  </div>

                                  <div class="reliever-list">
                                    {#each game.analysis.mlbProjection.awayLikelyRelievers as reliever}
                                      <div class="reliever-row">
                                        <div>
                                          <strong>{reliever.name}</strong>
                                          <span>{reliever.role} | {Math.round(reliever.firstRelieverLikelihood)}% first-up</span>
                                        </div>
                                        <div class="reliever-meta">
                                          <strong>{Math.round(reliever.availabilityScore)} avail</strong>
                                          <span>{relieverStatusLabel(reliever)}</span>
                                        </div>
                                      </div>
                                    {/each}
                                  </div>
                                </article>

                                <article class="reliever-chain-card">
                                  <div class="reliever-chain-head">
                                    <div>
                                      <p>{game.matchup[1].name} bridge chain</p>
                                      <strong>{game.analysis.mlbProjection.homeBullpenChainScore ?? 'N/A'}</strong>
                                    </div>
                                    <span>Likely first two</span>
                                  </div>

                                  <div class="reliever-list">
                                    {#each game.analysis.mlbProjection.homeLikelyRelievers as reliever}
                                      <div class="reliever-row">
                                        <div>
                                          <strong>{reliever.name}</strong>
                                          <span>{reliever.role} | {Math.round(reliever.firstRelieverLikelihood)}% first-up</span>
                                        </div>
                                        <div class="reliever-meta">
                                          <strong>{Math.round(reliever.availabilityScore)} avail</strong>
                                          <span>{relieverStatusLabel(reliever)}</span>
                                        </div>
                                      </div>
                                    {/each}
                                  </div>
                                </article>
                              </div>

                              {#if game.homeRunTargets}
                                <section class="home-run-board" aria-label={`Home run looks for ${game.title}`}>
                                  <div class="home-run-board-head">
                                    <div>
                                      <p class="series-kicker">Home run looks</p>
                                      <strong>{game.homeRunTargets.summary}</strong>
                                    </div>
                                    <span>Likely and possible</span>
                                  </div>

                                  <div class="home-run-tier-grid">
                                    <article class="home-run-tier">
                                      <div class="home-run-tier-head">
                                        <p>Likely</p>
                                        <span>Best current lane</span>
                                      </div>

                                      <div class="home-run-target-list">
                                        {#if game.homeRunTargets.likely.length}
                                          {#each game.homeRunTargets.likely as target}
                                            <div class="home-run-target-row">
                                              <div>
                                                <strong>{target.playerName}</strong>
                                                <span>{target.teamName} vs {target.opposingPitcher} ({target.opposingPitcherHand}HP)</span>
                                              </div>
                                              <div class="home-run-target-meta">
                                                <strong>{Math.round(target.score)}</strong>
                                                <span>{target.scoreBand} | {target.burstTag}</span>
                                              </div>
                                            </div>
                                          {/each}
                                        {:else}
                                          <p class="home-run-empty">No strong likely bat has surfaced yet.</p>
                                        {/if}
                                      </div>
                                    </article>

                                    <article class="home-run-tier">
                                      <div class="home-run-tier-head">
                                        <p>Possible</p>
                                        <span>Secondary lanes</span>
                                      </div>

                                      <div class="home-run-target-list">
                                        {#if game.homeRunTargets.possible.length}
                                          {#each game.homeRunTargets.possible as target}
                                            <div class="home-run-target-row">
                                              <div>
                                                <strong>{target.playerName}</strong>
                                                <span>{target.teamName} | {target.homeRunsLast7Days} HR last 7 days</span>
                                              </div>
                                              <div class="home-run-target-meta">
                                                <strong>{Math.round(target.score)}</strong>
                                                <span>{target.opposingPitcherHr9} HR/9</span>
                                              </div>
                                            </div>
                                          {/each}
                                        {:else}
                                          <p class="home-run-empty">No second-tier lane yet beyond the lead bat.</p>
                                        {/if}
                                      </div>
                                    </article>
                                  </div>
                                </section>
                              {/if}
                            {/if}

                            <ul class="model-input-list">
                              {#each game.analysis.inputs as input}
                                <li>{input.summary}</li>
                              {/each}
                            </ul>

                            {#if game.analysis.volatilityNotes.length > 0}
                              <div class="model-note-row">
                                {#each game.analysis.volatilityNotes.slice(0, 3) as note}
                                  <span>{note.label}</span>
                                {/each}
                              </div>
                            {/if}
                          </section>
                        {/if}
                      </div>
                    </div>

                    {#if game.playerAnalysis?.length}
                      <section class="player-analysis-panel" aria-label={`Player analysis for ${game.title}`}>
                        <p class="series-kicker">Player analysis</p>

                        <ul class="player-analysis-list">
                          {#each game.playerAnalysis as note}
                            <li>{note}</li>
                          {/each}
                        </ul>
                      </section>
                    {/if}

                    {#if game.seriesBreakdown}
                      <section class="series-panel" aria-label={`Series breakdown for ${game.title}`}>
                        <div class="series-heading">
                          <div>
                            <p class="series-kicker">{game.seriesBreakdown.kicker}</p>
                            <h4>{game.seriesBreakdown.title}</h4>
                          </div>
                          <span class="series-record">{game.seriesBreakdown.record}</span>
                        </div>

                        <p class="series-recap">{game.seriesBreakdown.recap}</p>

                        <div class="series-stat-row">
                          {#each game.seriesBreakdown.seriesStats as stat}
                            <span>{stat}</span>
                          {/each}
                        </div>

                        <div class="boxscore-grid">
                          {#each game.seriesBreakdown.boxScores as boxScore}
                            <article class="boxscore-card">
                              <div class="boxscore-topline">
                                <div>
                                  <p class="boxscore-label">{boxScore.label}</p>
                                  <h5>{boxScore.result}</h5>
                                </div>
                                <span>{boxScore.date}</span>
                              </div>

                              <ul class="boxscore-notes">
                                {#each boxScore.notes as note}
                                  <li>{note}</li>
                                {/each}
                              </ul>

                              {#if boxScore.leaders?.length}
                                <div class="boxscore-leaders">
                                  {#each boxScore.leaders as leaderGroup}
                                    <div class="leader-group">
                                      <p class="leader-group-title">{leaderGroup.team}</p>

                                      <ul class="leader-list">
                                        {#each leaderGroup.lines as line}
                                          <li>{line}</li>
                                        {/each}
                                      </ul>
                                    </div>
                                  {/each}
                                </div>
                              {/if}
                            </article>
                          {/each}
                        </div>

                        {#if game.seriesBreakdown.playerAnalysis?.length}
                          <section class="player-analysis-panel">
                            <p class="series-kicker">Key players</p>

                            <ul class="player-analysis-list">
                              {#each game.seriesBreakdown.playerAnalysis as note}
                                <li>{note}</li>
                              {/each}
                            </ul>
                          </section>
                        {/if}

                        <div class="series-links">
                          {#each game.seriesBreakdown.sources as source}
                            <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
                          {/each}
                        </div>
                      </section>
                    {/if}
                  {/if}
                </article>
              {/each}
            </div>
          {/if}
        </div>
      </section>
    </main>

    <aside class="action-column">
      <section class="action-rail" aria-label="Action rail">
        <div class="parlay-sidebar-header">
          <div>
            <p class="eyebrow">Action Rail</p>
            <h2>Execution</h2>
            <p class="parlay-sidebar-copy">
              Everything on the right is meant to be edited, opened, pinned, or loaded into the
              active slip.
            </p>
          </div>

          <button
            type="button"
            class="clear-parlay-button"
            disabled={parlay.legCount === 0}
            on:click={clearParlay}
          >
            Clear ticket
          </button>
        </div>

        <div class="rail-mini-metrics">
          <article class="rail-mini-card">
            <span>Selected</span>
            <strong>{parlay.legCount}</strong>
          </article>

          <article class="rail-mini-card">
            <span>Analyst matches</span>
            <strong>{parlay.metadata.analystPickCount}</strong>
          </article>

          <article class="rail-mini-card">
            <span>Best set</span>
            <strong>{activeRecommendedLegCount || 0}-leg</strong>
          </article>
        </div>

        <div class="sidebar-tab-row" role="tablist" aria-label="Parlay tools">
          {#each sidebarTabs as tab}
            <button
              type="button"
              role="tab"
              class="sidebar-tab-button"
              class:active={activeSidebarTab === tab.id}
              aria-selected={activeSidebarTab === tab.id}
              on:click={() => setSidebarTab(tab.id)}
            >
              {tab.label}
            </button>
          {/each}
        </div>

        {#if activeSidebarTab === 'ticket'}
          <div class="parlay-stats-grid compact">
            <article class="parlay-stat-card">
              <span class="parlay-stat-label">Eligible legs</span>
              <strong>{filteredMoneylineGames.length}</strong>
            </article>

            <article class="parlay-stat-card">
              <span class="parlay-stat-label">Selected</span>
              <strong>{parlay.legCount}</strong>
            </article>

            <article class="parlay-stat-card">
              <span class="parlay-stat-label">Combined odds</span>
              <strong>{parlay.combinedAmericanLabel}</strong>
              <small>Decimal {parlay.combinedDecimalLabel}</small>
            </article>

            <article class="parlay-stat-card">
              <span class="parlay-stat-label">Implied hit rate</span>
              <strong>{parlay.impliedProbabilityLabel}</strong>
            </article>
          </div>

          {#if recommendationCounts.length > 0}
            <div class="ticket-autobuild">
              <p class="ticket-autobuild-label">Auto-build from model picks</p>

              <div class="recommendation-size-row">
                {#each recommendationCounts as count}
                  <button
                    type="button"
                    class="size-chip"
                    class:active={activeRecommendedLegCount === count}
                    on:click={() => (recommendedLegCount = count)}
                  >
                    {count}-leg
                  </button>
                {/each}
              </div>

              <button
                type="button"
                class="load-recommended-button"
                on:click={() => loadRecommendedParlay(activeRecommendedLegCount)}
              >
                Load {activeRecommendedLegCount}-leg ticket
              </button>
            </div>
          {/if}

          <div class="parlay-body stacked">
            <label class="stake-card" for="parlay-stake">
              <span class="parlay-stat-label">Stake</span>
              <input id="parlay-stake" type="number" min="1" step="5" bind:value={parlayStake} />
            </label>

            <div class="parlay-return-grid">
              <article class="parlay-return-card">
                <span class="parlay-stat-label">Projected return</span>
                <strong>{parlay.grossReturnLabel}</strong>
              </article>

              <article class="parlay-return-card">
                <span class="parlay-stat-label">Projected profit</span>
                <strong>{parlay.profitLabel}</strong>
              </article>
            </div>
          </div>

          <div class="sidebar-status-card" data-ready={parlayReady}>
            <p class="parlay-status-title">{parlayReady ? 'Ticket ready' : 'Ticket in progress'}</p>
            <p class="parlay-status-copy">{parlayStatus}</p>
          </div>

          {#if parlay.legCount > 0}
            <p class="parlay-meta-line">
              Leagues in ticket: {parlay.metadata.leagues.join(', ')} | Legs:
              {parlay.metadata.gameTitles.join(' • ')}
            </p>
          {/if}

          {#if parlay.legCount === 0}
            <p class="parlay-empty">
              Start from any matchup card, or use the best-picks and recommended tabs to load
              analyst-backed legs faster.
            </p>
          {:else}
            <div class="parlay-leg-list">
              {#each parlay.legs as leg}
                <article class="parlay-leg-card">
                  <div>
                    <p class="parlay-leg-topline">{leg.league} | {leg.start} | {leg.stage}</p>
                    <p class="parlay-leg-pick">{leg.pickName} over {leg.opponentName}</p>
                    <p class="parlay-leg-game">{leg.gameTitle}</p>
                  </div>

                  <div class="parlay-leg-side">
                    <strong>{leg.americanLabel}</strong>
                    <span>{leg.impliedProbabilityLabel} implied</span>

                    {#if leg.isAnalystPick}
                      <span class="analyst-chip">Analyst match</span>
                    {/if}

                    <button
                      type="button"
                      class="remove-leg-button"
                      on:click={() => removeParlayPick(leg.gameId)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        {/if}

        {#if activeSidebarTab === 'signals'}
          <div class="sidebar-section-copy">
            <p>Open a market, pin it, or send it straight into the slip.</p>
          </div>

          {#if pinnedSignalPicks.length > 0}
            <div class="action-section">
              <div class="action-section-header">
                <h3>Pinned Signals</h3>
                <span>{pinnedSignalPicks.length}</span>
              </div>

              <div class="analysis-pick-list compact">
                {#each pinnedSignalPicks as pick}
                  <article class="analysis-pick-card compact">
                    <div class="analysis-pick-topline">
                      <span>{pick.league} | {pick.start}</span>
                      <span>{pick.participant.americanLabel}</span>
                    </div>
                    <h3>{pick.participant.name}</h3>
                    <p class="analysis-pick-game">{pick.gameTitle}</p>
                    <div class="analysis-action-row">
                      <button type="button" class="analysis-action-button" on:click={() => openGame(pick.gameId)}>
                        Open
                      </button>
                      <button
                        type="button"
                        class="analysis-action-button"
                        class:active={selectedPicks[pick.gameId] === pick.participantId}
                        disabled={atParlayLimit && !selectedPicks[pick.gameId]}
                        on:click={() => toggleParlayPick(pick.gameId, pick.participantId)}
                      >
                        {selectedPicks[pick.gameId] === pick.participantId ? 'In ticket' : 'Add to ticket'}
                      </button>
                      <button type="button" class="analysis-action-button" on:click={() => togglePinnedSignal(pick.gameId)}>
                        Unpin
                      </button>
                    </div>
                  </article>
                {/each}
              </div>
            </div>
          {/if}

          <div class="action-section">
            <div class="action-section-header">
              <h3>Model Ladder</h3>
              <span>{signalLadderPicks.length}</span>
            </div>

            <div class="analysis-pick-list compact">
              {#each signalLadderPicks as pick}
                <article class="analysis-pick-card compact">
                  <div class="analysis-pick-topline">
                    <span>{pick.league} | {pick.start}</span>
                    <span>{pick.confidence} conf</span>
                  </div>
                  <h3>{pick.participant.name}</h3>
                  <p class="analysis-pick-game">{pick.gameTitle}</p>
                  <p class="analysis-pick-tone">{recommendationToneFor(pick)}</p>
                  <div class="analysis-action-row">
                    <button type="button" class="analysis-action-button" on:click={() => openGame(pick.gameId)}>
                      Open
                    </button>
                    <button
                      type="button"
                      class="analysis-action-button"
                      class:active={selectedPicks[pick.gameId] === pick.participantId}
                      disabled={atParlayLimit && !selectedPicks[pick.gameId]}
                      on:click={() => toggleParlayPick(pick.gameId, pick.participantId)}
                    >
                      {selectedPicks[pick.gameId] === pick.participantId ? 'In ticket' : 'Add'}
                    </button>
                    <button
                      type="button"
                      class="analysis-action-button"
                      class:active={pinnedSignalIds.includes(pick.gameId)}
                      on:click={() => togglePinnedSignal(pick.gameId)}
                    >
                      {pinnedSignalIds.includes(pick.gameId) ? 'Pinned' : 'Pin'}
                    </button>
                  </div>
                </article>
              {/each}
            </div>
          </div>
        {/if}

        {#if activeSidebarTab === 'sources'}
          <div class="action-section">
            <div class="action-section-header">
              <h3>Open Sources</h3>
              <span>{sourceCount}</span>
            </div>

            {#if allSources.length > 0}
              <div class="sources-list">
                {#each allSources as source}
                  <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
                {/each}
              </div>
            {:else}
              <p class="sources-empty">No sources attached yet for this date.</p>
            {/if}
          </div>

          <div class="action-section">
            <div class="action-section-header">
              <h3>Add Source</h3>
              <span>Local</span>
            </div>

            <div class="source-form">
              <input
                type="text"
                placeholder="Source label"
                bind:value={customSourceLabel}
              />
              <input
                type="url"
                placeholder="https://..."
                bind:value={customSourceUrl}
              />
              <button type="button" class="analysis-action-button" on:click={addCustomSource}>
                Add source
              </button>
            </div>
          </div>
        {/if}

        {#if activeSidebarTab === 'notes'}
          <div class="action-section">
            <div class="action-section-header">
              <h3>Desk Notes</h3>
              <span>Edit</span>
            </div>

            <textarea
              class="desk-note-input"
              rows="10"
              placeholder="Add your trading notes for this date..."
              value={deskNote}
              on:input={(event) => saveDeskNoteForDay(activeDay.id, event.currentTarget.value)}
            ></textarea>
          </div>

          <div class="action-section">
            <div class="action-section-header">
              <h3>Imported Notes</h3>
              <span>{slateMeta.notes.length + (activeDay.feedNotes?.length ?? 0)}</span>
            </div>

            <ul class="notes-list">
              {#each slateMeta.notes as note}
                <li>{note}</li>
              {/each}
              {#each activeDay.feedNotes ?? [] as note}
                <li>{note}</li>
              {/each}
            </ul>
          </div>
        {/if}
      </section>
    </aside>
  </div>
</div>

<script>
  import { buildParlayModel, createParlayLeg, rankAnalysisPicks } from './lib/sports-model'
  import { defaultSlateDayId, slateDays } from './lib/slate-days'

  const PARLAY_MIN_LEGS = 2
  const PARLAY_MAX_LEGS = 10
  const leagueOrder = ['MLB', 'UFC', 'NBA', 'WNBA']
  const sidebarTabs = [
    { id: 'ticket', label: 'Ticket' },
    { id: 'best-picks', label: 'Best picks' },
    { id: 'recommended', label: 'Recommended' }
  ]

  let activeDayId = defaultSlateDayId
  let activeFilter = 'All'
  let activeSidebarTab = 'ticket'
  let parlayStake = 25
  let recommendedLegCount = 4
  let selectedPicksByDay = {}
  let expandedGameId = ''

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

  const countSelectedPicks = (picks) => Object.keys(picks).length

  const picksForDay = (dayId) => selectedPicksByDay[dayId] ?? {}

  const savePicksForDay = (dayId, nextPicks) => {
    selectedPicksByDay = {
      ...selectedPicksByDay,
      [dayId]: nextPicks
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
  $: selectedPicks = activeDay ? picksForDay(activeDay.id) : {}
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
  $: modelCount = visibleGames.filter((game) => game.analysis.inputsUsed > 0).length
  $: spotlightCount = visibleGames.filter((game) => game.spotlight).length
  $: sourceCount = sources.length

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
  <title>{slateMeta.title} | {slateMeta.date}</title>
  <meta
    name="description"
    content={`A Svelte-built matchup board with full game-by-game analysis, ranked predictions, and parlay-building tools for the ${slateMeta.date} sports slate.`}
  />
</svelte:head>

<div class="terminal-shell">
  <header class="terminal-topbar">
    <div class="terminal-brand">
      <p class="eyebrow">Market Terminal</p>
      <h1>Slate Desk</h1>
      <p class="terminal-summary">{slateMeta.title} | {slateMeta.date} | {slateMeta.subtitle}</p>
    </div>

    <div class="terminal-state-strip">
      <article class="state-chip">
        <span>Day</span>
        <strong>{activeDay.label}</strong>
      </article>
      <article class="state-chip">
        <span>Scope</span>
        <strong>{activeFilter}</strong>
      </article>
      <article class="state-chip">
        <span>Markets</span>
        <strong>{visibleGames.length}</strong>
      </article>
      <article class="state-chip">
        <span>Moneylines</span>
        <strong>{filteredMoneylineGames.length}</strong>
      </article>
      <article class="state-chip">
        <span>Signals</span>
        <strong>{analysisPickPool.length}</strong>
      </article>
      <article class="state-chip">
        <span>Sources</span>
        <strong>{sourceCount}</strong>
      </article>
    </div>
  </header>

  <div class="desk-layout">
    <aside class="control-column">
      <section class="desk-panel session-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Session</p>
            <h2>Slate View</h2>
          </div>
          <span class="panel-meta">{activeDay.status}</span>
        </div>

        <div class="session-copy">
          <strong>{slateMeta.title}</strong>
          <p>{slateMeta.date}</p>
        </div>

        <div class="session-metrics-grid">
          <article class="mini-stat-card">
            <span>Signal avg</span>
            <strong>{confidenceAverage}</strong>
          </article>
          <article class="mini-stat-card">
            <span>Volatility</span>
            <strong>{volatilityAverage}</strong>
          </article>
          <article class="mini-stat-card">
            <span>Model cards</span>
            <strong>{modelCount}</strong>
          </article>
          <article class="mini-stat-card">
            <span>Ticket legs</span>
            <strong>{parlay.legCount}</strong>
          </article>
        </div>

        <div class="summary-strip compact" aria-label="League summary">
          {#each summaryCards as card}
            <article class="summary-card">
              <p class="summary-league">{card.league}</p>
              <p class="summary-value">{card.total}</p>
              <p class="summary-detail">{card.spotlightCount} spotlights</p>
            </article>
          {/each}
        </div>
      </section>

      <section class="desk-panel daybook-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Navigator</p>
            <h2>Daybook</h2>
          </div>
          <span class="panel-meta">Day {dayIndex + 1} / {slateDays.length}</span>
        </div>

        <div class="daybook-actions">
          <button type="button" disabled={!hasPreviousDay()} on:click={() => stepDay(-1)}>
            Previous
          </button>
          <button type="button" disabled={!hasNextDay()} on:click={() => stepDay(1)}>
            Next
          </button>
        </div>

        <div class="daybook-row">
          {#each slateDays as day}
            <button
              type="button"
              class="daybook-chip"
              class:active={activeDayId === day.id}
              on:click={() => selectDay(day.id)}
            >
              <span class="daybook-chip-label">{day.label}</span>
              <strong>{day.slateMeta.date}</strong>
              <small>{day.summary.totalGames} games | {day.status}</small>
            </button>
          {/each}
        </div>
      </section>

      <section class="desk-panel filter-panel-shell">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Scope</p>
            <h2>Filters</h2>
          </div>
          <span class="panel-meta">{activeFilter}</span>
        </div>

        <div class="scope-strip">
          <article class="scope-card">
            <span>Signal pool</span>
            <strong>{analysisPickPool.length}</strong>
          </article>
          <article class="scope-card">
            <span>Analyst matches</span>
            <strong>{parlay.metadata.analystPickCount}</strong>
          </article>
        </div>

        <section class="filter-panel dashboard-filter-panel" aria-label="League filters">
          {#each filterOptions as filter}
            <button
              type="button"
              class:active={activeFilter === filter}
              on:click={() => (activeFilter = filter)}
            >
              {filter}
            </button>
          {/each}
        </section>
      </section>

      <section class="desk-panel watchlist-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Watchlist</p>
            <h2>Best Signals</h2>
          </div>
          <span class="panel-meta">{signalLadderPicks.length} shown</span>
        </div>

        {#if signalLadderPicks.length === 0}
          <p class="panel-empty">No model-backed moneyline signals are available in this scope.</p>
        {:else}
          <div class="watchlist">
            {#each signalLadderPicks as pick}
              <article class="watchlist-row">
                <div class="watchlist-rank">#{pick.rank}</div>

                <div class="watchlist-copy">
                  <strong>{pick.participant.name}</strong>
                  <p>{pick.gameTitle}</p>
                  <small>{pick.league} | {pick.start} | Confidence {pick.confidence}</small>
                </div>

                <div class="watchlist-side">
                  <span>{pick.participant.americanLabel}</span>
                  <button
                    type="button"
                    class="analysis-action-button compact"
                    class:active={selectedPicks[pick.gameId] === pick.participantId}
                    disabled={atParlayLimit && !selectedPicks[pick.gameId]}
                    on:click={() => toggleParlayPick(pick.gameId, pick.participantId)}
                  >
                    {selectedPicks[pick.gameId] === pick.participantId ? 'Remove' : 'Add'}
                  </button>
                </div>
              </article>
            {/each}
          </div>
        {/if}
      </section>

      {#if spotlightGames.length > 0}
        <section class="desk-panel priority-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Priority</p>
              <h2>Spotlight Tape</h2>
            </div>
            <span class="panel-meta">{spotlightCount} spots</span>
          </div>

          <div class="priority-list">
            {#each spotlightGames as game}
              <article class="priority-row">
                <div>
                  <strong>{game.title}</strong>
                  <p>{game.analysis.lean}</p>
                </div>
                <small>{game.league} | {game.start}</small>
              </article>
            {/each}
          </div>
        </section>
      {/if}
    </aside>

    <main class="board-column">
      <section class="desk-panel market-panel">
        <div class="panel-header panel-header-spread">
          <div>
            <p class="eyebrow">Market Grid</p>
            <h2>{activeFilter === 'All' ? 'Full Slate Board' : `${activeFilter} Board`}</h2>
          </div>
          <div class="market-panel-meta">
            <span>{visibleGames.length} markets</span>
            <span>{filteredMoneylineGames.length} moneylines</span>
            <span>{oddsMeta.snapshot}</span>
          </div>
        </div>

        {#if visibleGames.length === 0}
          <section class="empty-day-panel">
            <p class="empty-day-kicker">{activeDay.label} | {activeDay.status}</p>
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
              <article class="market-row" data-open={expandedGameId === game.id}>
                <div class="market-row-main">
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
                            on:click={() => toggleParlayPick(game.id, participant.id)}
                          >
                            {participant.name}
                          </button>
                        {/each}
                      </div>
                    {/if}

                    <button
                      type="button"
                      class="row-expand-button"
                      on:click={() => toggleExpandedGame(game.id)}
                    >
                      {expandedGameId === game.id ? 'Hide details' : 'Show details'}
                    </button>
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
                                on:click={() => toggleParlayPick(game.id, participant.id)}
                              >
                                <div class="pick-button-topline">
                                  <span>{participant.name}</span>

                                  {#if game.analysis.available && game.analysis.participantId === participant.id}
                                    <span class="pick-badge">
                                      Analyst #{analysisRankLookup.get(game.id)}
                                    </span>
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
                          </article>
                        {/each}
                      </div>

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
      </section>
    </main>

    <aside class="sidebar-column">
      <section class="desk-panel parlay-sidebar" aria-label="Parlay sidebar">
        <div class="parlay-sidebar-header">
          <div>
            <p class="eyebrow">Execution</p>
            <h2>Parlay Center</h2>
            <p class="parlay-sidebar-copy">
              Build tickets from the board or load ranked recommendation sets directly into the
              slip.
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

        {#if activeFilter !== 'All'}
          <p class="sidebar-filter-note">Scoped to the {activeFilter} board right now.</p>
        {/if}

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

        {#if activeSidebarTab === 'best-picks'}
          {#if analysisPickPool.length === 0}
            <p class="parlay-empty">
              No analyst-backed moneyline picks are available for the current filter.
            </p>
          {:else}
            <div class="sidebar-section-copy">
              <p>Ordered by confidence first, then lower volatility.</p>
            </div>

            <div class="analysis-pick-list">
              {#each analysisPickPool as pick}
                <article class="analysis-pick-card">
                  <div class="analysis-pick-topline">
                    <span>#{pick.rank} | {pick.league} | {pick.start}</span>
                    <span>{pick.tier}</span>
                  </div>

                  <h3>{pick.participant.name} over {pick.opponent.name}</h3>
                  <p class="analysis-pick-game">{pick.gameTitle}</p>

                  <div class="analysis-pick-metrics">
                    <span>Confidence {pick.confidence}</span>
                    <span>Volatility {pick.volatility}</span>
                    <span>{pick.participant.americanLabel}</span>
                    <span>{pick.modelEdgeLabel}</span>
                  </div>

                  <p class="analysis-pick-tone">{recommendationToneFor(pick)}</p>
                  <p class="analysis-pick-lean">{pick.lean}</p>
                  <p class="analysis-pick-rationale">{pick.rationale}</p>

                  <button
                    type="button"
                    class="analysis-action-button"
                    class:active={selectedPicks[pick.gameId] === pick.participantId}
                    disabled={atParlayLimit && !selectedPicks[pick.gameId]}
                    on:click={() => toggleParlayPick(pick.gameId, pick.participantId)}
                  >
                    {selectedPicks[pick.gameId] === pick.participantId ? 'Remove from ticket' : 'Add to ticket'}
                  </button>
                </article>
              {/each}
            </div>
          {/if}
        {/if}

        {#if activeSidebarTab === 'recommended'}
          {#if recommendationCounts.length === 0}
            <p class="parlay-empty">
              I need at least two analyst-backed moneyline reads in the current scope to recommend a
              parlay.
            </p>
          {:else}
            <div class="sidebar-section-copy">
              <p>
                These are auto-built from the highest-confidence picks in order, so you can load a
                2-to-10 leg ticket with one click.
              </p>
            </div>

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

            <div class="parlay-stats-grid compact">
              <article class="parlay-stat-card">
                <span class="parlay-stat-label">Recommended odds</span>
                <strong>{recommendedParlay.combinedAmericanLabel}</strong>
                <small>Decimal {recommendedParlay.combinedDecimalLabel}</small>
              </article>

              <article class="parlay-stat-card">
                <span class="parlay-stat-label">Projected return</span>
                <strong>{recommendedParlay.grossReturnLabel}</strong>
              </article>

              <article class="parlay-stat-card">
                <span class="parlay-stat-label">Projected profit</span>
                <strong>{recommendedParlay.profitLabel}</strong>
              </article>

              <article class="parlay-stat-card">
                <span class="parlay-stat-label">Implied hit rate</span>
                <strong>{recommendedParlay.impliedProbabilityLabel}</strong>
              </article>
            </div>

            <button
              type="button"
              class="load-recommended-button"
              on:click={() => loadRecommendedParlay(activeRecommendedLegCount)}
            >
              Load Recommended {activeRecommendedLegCount}-Leg Ticket
            </button>

            <div class="parlay-leg-list preview">
              {#each recommendedParlay.legs as leg, index}
                <article class="parlay-leg-card">
                  <div>
                    <p class="parlay-leg-topline">#{index + 1} | {leg.league} | {leg.start}</p>
                    <p class="parlay-leg-pick">{leg.pickName} over {leg.opponentName}</p>
                    <p class="parlay-leg-game">{leg.gameTitle}</p>
                  </div>

                  <div class="parlay-leg-side">
                    <strong>{leg.americanLabel}</strong>
                    <span>{leg.analysisConfidence} confidence</span>
                    <span class="analyst-chip">{leg.analysisTier}</span>
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        {/if}
      </section>

      <section class="desk-panel research-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Research</p>
            <h2>Model Notes</h2>
          </div>
          <span class="panel-meta">{modelCount} cards</span>
        </div>

        <ul class="notes-list">
          {#each slateMeta.notes as note}
            <li>{note}</li>
          {/each}
          {#each activeDay.feedNotes ?? [] as note}
            <li>{note}</li>
          {/each}
        </ul>
      </section>

      <section class="desk-panel sources-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Sources</p>
            <h2>Feed Links</h2>
          </div>
          <span class="panel-meta">{sourceCount}</span>
        </div>

        {#if sources.length > 0}
          <div class="sources-list">
            {#each sources as source}
              <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
            {/each}
          </div>
        {:else}
          <p class="sources-empty">
            No day-specific source links are attached yet. Use `daily-games-external.md` as the
            known-good starting list for the next import.
          </p>
        {/if}
      </section>
    </aside>
  </div>
</div>

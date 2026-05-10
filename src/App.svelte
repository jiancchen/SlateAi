<script>
  import { filters, games, oddsMeta, slateMeta, sources } from './lib/slate'
  import { buildParlayModel, createParlayLeg, rankAnalysisPicks } from './lib/sports-model'

  const PARLAY_MIN_LEGS = 2
  const PARLAY_MAX_LEGS = 10
  const leagueOrder = ['MLB', 'UFC', 'NBA', 'WNBA']
  const sidebarTabs = [
    { id: 'ticket', label: 'Ticket' },
    { id: 'best-picks', label: 'Best picks' },
    { id: 'recommended', label: 'Recommended' }
  ]

  let activeFilter = 'All'
  let activeSidebarTab = 'ticket'
  let parlayStake = 25
  let recommendedLegCount = 4
  let selectedPicks = {}

  const eligibleMoneylineGames = games.filter((game) => game.moneyline.available)

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

  const summaryCards = leagueOrder.map((league) => {
    const leagueGames = games.filter((game) => game.league === league)
    const spotlightCount = leagueGames.filter((game) => game.spotlight).length

    return {
      league,
      total: leagueGames.length,
      spotlightCount
    }
  })

  $: visibleGames =
    activeFilter === 'All' ? games : games.filter((game) => game.league === activeFilter)

  $: filteredMoneylineGames =
    activeFilter === 'All'
      ? eligibleMoneylineGames
      : eligibleMoneylineGames.filter((game) => game.league === activeFilter)

  $: spotlightGames = visibleGames.filter((game) => game.spotlight).slice(0, 6)

  $: confidenceAverage = Math.round(
    visibleGames.reduce((total, game) => total + game.analysis.confidence, 0) / visibleGames.length
  )

  $: volatilityAverage = Math.round(
    visibleGames.reduce((total, game) => total + game.analysis.volatility, 0) / visibleGames.length
  )

  $: analysisPicks = rankAnalysisPicks(games)

  $: analysisPickPool =
    activeFilter === 'All'
      ? analysisPicks
      : analysisPicks.filter((pick) => pick.league === activeFilter)

  $: analysisRankLookup = new Map(analysisPicks.map((pick) => [pick.gameId, pick.rank]))

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

  const setSidebarTab = (tabId) => {
    activeSidebarTab = tabId
  }

  const toggleParlayPick = (gameId, participantId) => {
    if (selectedPicks[gameId] === participantId) {
      const nextPicks = { ...selectedPicks }
      delete nextPicks[gameId]
      selectedPicks = nextPicks
      return
    }

    if (!selectedPicks[gameId] && countSelectedPicks(selectedPicks) >= PARLAY_MAX_LEGS) {
      activeSidebarTab = 'ticket'
      return
    }

    selectedPicks = {
      ...selectedPicks,
      [gameId]: participantId
    }

    activeSidebarTab = 'ticket'
  }

  const removeParlayPick = (gameId) => {
    if (!selectedPicks[gameId]) return

    const nextPicks = { ...selectedPicks }
    delete nextPicks[gameId]
    selectedPicks = nextPicks
  }

  const clearParlay = () => {
    selectedPicks = {}
  }

  const loadRecommendedParlay = (legCount = activeRecommendedLegCount) => {
    if (!legCount) return

    selectedPicks = Object.fromEntries(
      analysisPickPool.slice(0, legCount).map((pick) => [pick.gameId, pick.participantId])
    )
    activeSidebarTab = 'ticket'
  }
</script>

<svelte:head>
  <title>{slateMeta.title} | {slateMeta.date}</title>
  <meta
    name="description"
    content="A Svelte-built matchup board with full game-by-game analysis, ranked predictions, and parlay-building tools for the May 9, 2026 sports slate."
  />
</svelte:head>

<div class="page-shell">
  <section class="hero-panel">
    <div class="hero-copy">
      <p class="eyebrow">{slateMeta.date} | Imported from sportsx.rtf + corrected UFC card</p>
      <h1>{slateMeta.title}</h1>
      <p class="hero-text">{slateMeta.subtitle}</p>
    </div>

    <div class="hero-stats">
      <div class="hero-stat">
        <span class="hero-label">Total matchups</span>
        <strong>{games.length}</strong>
      </div>
      <div class="hero-stat">
        <span class="hero-label">Spotlight cards</span>
        <strong>{games.filter((game) => game.spotlight).length}</strong>
      </div>
      <div class="hero-stat">
        <span class="hero-label">Confidence average</span>
        <strong>{confidenceAverage}</strong>
      </div>
      <div class="hero-stat">
        <span class="hero-label">Volatility average</span>
        <strong>{volatilityAverage}</strong>
      </div>
    </div>
  </section>

  <section class="summary-strip" aria-label="League summary">
    {#each summaryCards as card}
      <article class="summary-card">
        <p class="summary-league">{card.league}</p>
        <p class="summary-value">{card.total}</p>
        <p class="summary-detail">{card.spotlightCount} spotlight reads</p>
      </article>
    {/each}
  </section>

  <div class="content-shell">
    <main class="content-column">
      <section class="notes-panel">
        <div class="notes-copy">
          <h2>How To Read The Board</h2>
          <p>
            Each card now layers a structured-input model on top of the written matchup read. The
            confidence and volatility meters come from formatted local inputs like market price,
            listed starter lines, fight-profile signals, and playoff or roster context where we
            have it.
          </p>
        </div>

        <ul class="notes-list">
          {#each slateMeta.notes as note}
            <li>{note}</li>
          {/each}
        </ul>
      </section>

      <section class="filter-panel" aria-label="League filters">
        {#each filters as filter}
          <button
            type="button"
            class:active={activeFilter === filter}
            on:click={() => (activeFilter = filter)}
          >
            {filter}
          </button>
        {/each}
      </section>

      {#if spotlightGames.length > 0}
        <section class="spotlight-panel">
          <div class="section-heading">
            <h2>Spotlight Matchups</h2>
            <p>The cards with the clearest leverage, biggest stakes, or widest swing potential.</p>
          </div>

          <div class="spotlight-grid">
            {#each spotlightGames as game, index}
              <article class="spotlight-card" style={`--order:${index};`}>
                <div class="spotlight-topline">
                  <span>{game.league}</span>
                  <span>{game.start}</span>
                </div>
                <h3>{game.title}</h3>
                <p class="spotlight-stage">{game.stage}</p>
                <p class="spotlight-summary">{game.summary}</p>
                <p class="spotlight-lean">{game.analysis.lean}</p>
              </article>
            {/each}
          </div>
        </section>
      {/if}

      <section class="board-panel">
        <div class="section-heading">
          <h2>{activeFilter === 'All' ? 'Full Slate Board' : `${activeFilter} Board`}</h2>
          <p>{visibleGames.length} matchup{visibleGames.length === 1 ? '' : 's'} on screen.</p>
        </div>

        <div class="game-grid">
          {#each visibleGames as game, index}
            <article class="game-card" style={`--order:${index};`}>
              <div class="card-topline">
                <span class="league-badge league-{game.league.toLowerCase()}">{game.league}</span>
                <span class="time-pill">{game.start}</span>
              </div>

              <h3>{game.title}</h3>
              <p class="stage-line">{game.stage}</p>

              <div class="tag-row">
                {#each game.tags as tag}
                  <span>{tag}</span>
                {/each}
              </div>

              <div class="matchup-grid">
                {#each game.matchup as side}
                  <div class="matchup-cell">
                    <p class="matchup-side">{side.side}</p>
                    <h4>{side.name}</h4>
                    <p>{side.detail}</p>
                  </div>
                {/each}
              </div>

              {#if game.moneyline.available}
                <section class="pick-panel" aria-label={`Parlay picks for ${game.title}`}>
                  <div class="pick-heading">
                    <div>
                      <p class="pick-kicker">Parlay Builder</p>
                      <p class="pick-caption">{game.moneyline.label}</p>
                    </div>

                    <div class="pick-side-meta">
                      <span class="pick-source">{game.moneyline.provider}</span>
                      {#if game.analysis.available}
                        <strong class="pick-analysis-note">
                          My pick: {game.analysis.participant.name}
                        </strong>
                      {/if}
                    </div>
                  </div>

                  <div class="pick-grid">
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
                      <p class="model-kicker">Structured Input Model</p>
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
                </section>
              {/if}

              <p class="game-summary">{game.summary}</p>

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

                        <div class="leader-grid">
                          {#each boxScore.leaders as leader}
                            <div class="leader-column">
                              <p class="leader-label">{leader.team}</p>
                              <ul>
                                {#each leader.lines as line}
                                  <li>{line}</li>
                                {/each}
                              </ul>
                            </div>
                          {/each}
                        </div>
                      </article>
                    {/each}
                  </div>

                  <div class="player-analysis">
                    <p class="player-analysis-title">Player analysis</p>
                    <ul class="player-analysis-list">
                      {#each game.seriesBreakdown.playerAnalysis as note}
                        <li>{note}</li>
                      {/each}
                    </ul>
                  </div>

                  <div class="series-links">
                    {#each game.seriesBreakdown.sources as source}
                      <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
                    {/each}
                  </div>
                </section>
              {/if}

              <ul class="factor-list">
                {#each game.factors as factor}
                  <li>{factor}</li>
                {/each}
              </ul>

              <div class="meter-grid">
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

              <div class="closeout">
                <p class="lean-line">{game.analysis.lean}</p>
                <p class="swing-line">{game.swing}</p>
              </div>
            </article>
          {/each}
        </div>
      </section>

      <section class="sources-panel">
        <div class="section-heading">
          <h2>Schedule And Odds Sources</h2>
          <p>
            These pages were used to verify the May 9, 2026 slate while keeping the supplied matchup
            list intact and layering in the late-afternoon odds snapshot.
          </p>
        </div>

        <div class="sources-list">
          {#each sources as source}
            <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
          {/each}
        </div>
      </section>
    </main>

    <aside class="sidebar-column">
      <section class="parlay-sidebar" aria-label="Parlay sidebar">
        <div class="parlay-sidebar-header">
          <div>
            <p class="eyebrow">Pinned Sidebar</p>
            <h2>Parlay Center</h2>
            <p class="parlay-sidebar-copy">
              Build tickets from the board, from my best picks, or from prebuilt 2-to-10 leg
              recommendations.
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
              <span class="parlay-stat-label">Analyst matches</span>
              <strong>{parlay.metadata.analystPickCount}</strong>
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
            <p class="parlay-status-copy">Implied hit rate: {parlay.impliedProbabilityLabel}</p>
          </div>

          {#if parlay.legCount > 0}
            <p class="parlay-meta-line">
              Leagues in ticket: {parlay.metadata.leagues.join(', ')} | Legs:
              {parlay.metadata.gameTitles.join(' • ')}
            </p>
          {/if}

          {#if parlay.legCount === 0}
            <p class="parlay-empty">
              Start from any matchup card, or jump into the best-picks and recommended tabs to load
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
                These are auto-built from my highest-confidence picks, in order, so you can load a
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
                    <p class="parlay-leg-topline">
                      #{index + 1} | {leg.league} | {leg.start}
                    </p>
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
    </aside>
  </div>
</div>

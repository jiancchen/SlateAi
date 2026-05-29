type AnyRecord = Record<string, any>

type ParlayViewProps = Record<string, any>

export function ParlayView(props: ParlayViewProps) {
  const {
    activeDay,
    activePropType,
    activeSidebarTab,
    applyBuilderEntry,
    atParlayLimit,
    balanceWeight,
    balancedRecommendation,
    builderCatalogEntries,
    builderCatalogTab,
    builderCatalogTabs,
    builderLeagueFilter,
    builderLeagueFilters,
    builderSort,
    builderSortOptions,
    builderValidityFilter,
    builderValidityFilters,
    clearParlay,
    clearSelectedProps,
    clearSelectedTotals,
    filteredMoneylineGames,
    loadRecommendedParlay,
    openGame,
    pacificClock,
    parlay,
    parlayReady,
    parlayStake,
    parlayStatus,
    propConfidenceAverage,
    propTypeFilters,
    recommendationCounts,
    recommendationMode,
    recommendationModes,
    recommendedLegTarget,
    recommendedParlay,
    removeParlayPick,
    renderLeagueBadge,
    selectedPropEntries,
    selectedTotalEntries,
    setActiveDeskTab,
    setActivePropType,
    setActiveSidebarTab,
    setBalanceWeight,
    setBuilderCatalogTab,
    setBuilderLeagueFilter,
    setBuilderSort,
    setBuilderValidityFilter,
    setParlayStake,
    setRecommendationMode,
    setRecommendedLegCount,
    sidebarTabs,
    toggleSelectedProp,
    toggleSelectedTotal
  } = props

  return (
    <div className="desk-tool-workspace">
      <section className="builder-shell" aria-label="Parlay builder">
        <div className="builder-layout">
          <section className="builder-catalog">
            <div className="builder-catalog-header">
              <div>
                <p className="eyebrow">Pick catalog</p>
                <h2>Favorite reads, totals, and props</h2>
                <p className="parlay-sidebar-copy">Use the left rail to sort live ideas. Started events stay visible but cannot be added.</p>
              </div>
              <div className="builder-catalog-meta mono">
                <span>{builderCatalogEntries.length} showing</span>
                <span>{pacificClock.label}</span>
              </div>
            </div>

            <div className="builder-filter-stack">
              <div className="builder-filter-row">
                {builderCatalogTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`builder-filter-chip ${builderCatalogTab === tab.id ? 'active' : ''}`}
                    onClick={() => setBuilderCatalogTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="builder-filter-row">
                {builderValidityFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`builder-filter-chip subtle ${builderValidityFilter === filter.id ? 'active' : ''}`}
                    onClick={() => setBuilderValidityFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="builder-filter-row">
                {builderLeagueFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`builder-filter-chip subtle ${builderLeagueFilter === filter.id ? 'active' : ''}`}
                    onClick={() => setBuilderLeagueFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="builder-filter-row builder-filter-row--split">
                <div className="builder-filter-group">
                  {builderSortOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`builder-filter-chip subtle ${builderSort === option.id ? 'active' : ''}`}
                      onClick={() => setBuilderSort(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="builder-filter-group">
                  {propTypeFilters.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      className={`builder-filter-chip subtle ${activePropType === filter.id ? 'active' : ''}`}
                      onClick={() => setActivePropType(filter.id)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="builder-catalog-list no-scrollbar">
              {builderCatalogEntries.length === 0 ? (
                <div className="placeholder-panel compact">
                  <p className="eyebrow">No candidates</p>
                  <h3>Nothing matches this filter set yet</h3>
                  <p>Try another lane, relax the invalid filter, or reset the prop type.</p>
                </div>
              ) : (
                builderCatalogEntries.map((entry) => (
                  <article key={entry.id} className="builder-entry-card" data-invalid={entry.invalid}>
                    <div className="builder-entry-topline">
                      <div className="builder-entry-meta">
                        {renderLeagueBadge(entry.league)}
                        <span className="mono">{entry.start}</span>
                        <span>{entry.stage}</span>
                      </div>
                      <span className={`builder-status-pill ${entry.tone}`}>{entry.statusLabel}</span>
                    </div>

                    <div className="builder-entry-main">
                      <div className="builder-entry-copy">
                        <strong>{entry.title}</strong>
                        <p>{entry.subtitle}</p>
                        <small>{entry.summary}</small>
                        <div className="builder-entry-tags">
                          {entry.tags.map((tag: string) => (
                            <span key={`${entry.id}-${tag}`}>{tag}</span>
                          ))}
                        </div>
                      </div>

                      <div className="builder-entry-side">
                        <strong>{entry.confidence}%</strong>
                        <span>{entry.priceLabel}</span>
                        {entry.metaLabel ? <small>{entry.metaLabel}</small> : null}
                        <button
                          type="button"
                          className={`analysis-action-button ${entry.selected ? 'active' : ''}`}
                          disabled={entry.invalid || (entry.actionKind === 'ticket' && atParlayLimit && !entry.selected)}
                          onClick={() => applyBuilderEntry(entry)}
                        >
                          {entry.actionKind === 'ticket'
                            ? entry.selected
                              ? 'In ticket'
                              : 'Add side'
                            : entry.actionKind === 'prop'
                              ? entry.selected
                                ? 'Saved'
                                : 'Save prop'
                              : entry.selected
                                ? 'Saved'
                                : 'Save total'}
                        </button>
                        <button
                          type="button"
                          className="analysis-action-button ghost"
                          onClick={() => {
                            openGame(entry.gameId)
                            setActiveDeskTab('board')
                          }}
                        >
                          Open game
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="builder-execution workspace-panel">
            <div className="parlay-sidebar-header">
              <div>
                <p className="eyebrow">Execution</p>
                <h2>Slip and saved markets</h2>
                <p className="parlay-sidebar-copy">Moneyline legs price into the slip. Totals and props save alongside it until you price them manually.</p>
              </div>
              <button type="button" className="clear-parlay-button" disabled={parlay.legCount === 0} onClick={clearParlay}>
                Clear ticket
              </button>
            </div>

            <div className="sidebar-tab-row" role="tablist" aria-label="Builder tools">
              {sidebarTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  className={`sidebar-tab-button ${activeSidebarTab === tab.id ? 'active' : ''}`}
                  aria-selected={activeSidebarTab === tab.id}
                  onClick={() => setActiveSidebarTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeSidebarTab === 'ticket' ? (
              <>
                <div className="parlay-stats-grid compact">
                  <article className="parlay-stat-card">
                    <span className="parlay-stat-label">Eligible sides</span>
                    <strong>{filteredMoneylineGames.length}</strong>
                  </article>
                  <article className="parlay-stat-card">
                    <span className="parlay-stat-label">Selected</span>
                    <strong>{parlay.legCount}</strong>
                  </article>
                  <article className="parlay-stat-card">
                    <span className="parlay-stat-label">Combined odds</span>
                    <strong>{parlay.combinedAmericanLabel}</strong>
                    <small>Decimal {parlay.combinedDecimalLabel}</small>
                  </article>
                  <article className="parlay-stat-card">
                    <span className="parlay-stat-label">Implied hit rate</span>
                    <strong>{parlay.impliedProbabilityLabel}</strong>
                  </article>
                </div>

                {recommendationCounts.length > 0 ? (
                  <div className="ticket-autobuild">
                    <p className="ticket-autobuild-label">Auto-build ticket</p>
                    <div className="recommendation-mode-row" role="tablist" aria-label="Recommendation mode">
                      {recommendationModes.map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          role="tab"
                          className={`recommendation-mode-button ${recommendationMode === mode.id ? 'active' : ''}`}
                          aria-selected={recommendationMode === mode.id}
                          onClick={() => setRecommendationMode(mode.id)}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                    <p className="ticket-autobuild-copy">
                      {recommendationModes.find((mode) => mode.id === recommendationMode)?.copy}
                    </p>
                    {recommendationMode === 'balanced' ? (
                      <label className="balance-slider-card" htmlFor="balance-weight">
                        <div className="balance-slider-head">
                          <span>Flip weight</span>
                          <strong>{balanceWeight.toFixed(2)}</strong>
                        </div>
                        <input
                          id="balance-weight"
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={balanceWeight}
                          onChange={(event) => setBalanceWeight(Number(event.target.value))}
                        />
                        <small>
                          Targeting about {balancedRecommendation.targetFlipLegs} flip
                          {balancedRecommendation.targetFlipLegs === 1 ? '' : 's'} in this {recommendedLegTarget}-leg mix from an average underdog rate of{' '}
                          {Math.round(balancedRecommendation.averageFlipProbability * 100)}%.
                        </small>
                      </label>
                    ) : null}

                    <div className="recommendation-size-row">
                      {recommendationCounts.map((count) => (
                        <button
                          key={count}
                          type="button"
                          className={`size-chip ${recommendedLegTarget === count ? 'active' : ''}`}
                          onClick={() => setRecommendedLegCount(count)}
                        >
                          {count}-leg
                        </button>
                      ))}
                    </div>

                    <p className="ticket-autobuild-preview">
                      {recommendationMode === 'flips' ? 'Flip-risk' : recommendationMode === 'balanced' ? 'Balanced' : 'Favorites'} set: {recommendedParlay.combinedAmericanLabel} | {recommendedParlay.impliedProbabilityLabel} implied
                    </p>
                    <button type="button" className="load-recommended-button" onClick={loadRecommendedParlay}>
                      Load {recommendedLegTarget}-leg {recommendationMode === 'flips' ? 'flip-risk' : recommendationMode} ticket
                    </button>
                  </div>
                ) : null}

                <div className="parlay-body stacked">
                  <label className="stake-card" htmlFor="parlay-stake">
                    <span className="parlay-stat-label">Stake</span>
                    <input
                      id="parlay-stake"
                      type="number"
                      min="1"
                      step="5"
                      value={parlayStake}
                      onChange={(event) => setParlayStake(Number(event.target.value) || 0)}
                    />
                  </label>
                  <div className="parlay-return-grid">
                    <article className="parlay-return-card">
                      <span className="parlay-stat-label">Projected return</span>
                      <strong>{parlay.grossReturnLabel}</strong>
                    </article>
                    <article className="parlay-return-card">
                      <span className="parlay-stat-label">Projected profit</span>
                      <strong>{parlay.profitLabel}</strong>
                    </article>
                  </div>
                </div>

                <div className="sidebar-status-card" data-ready={parlayReady}>
                  <p className="parlay-status-title">{parlayReady ? 'Ticket ready' : 'Ticket in progress'}</p>
                  <p className="parlay-status-copy">{parlayStatus}</p>
                </div>

                {parlay.legCount === 0 ? (
                  <p className="parlay-empty">Use the catalog on the left to add cleaner sides or save manual markets.</p>
                ) : (
                  <div className="parlay-leg-list">
                    {parlay.legs.map((leg: AnyRecord) => (
                      <article key={leg.id} className="parlay-leg-card">
                        <div>
                          <p className="parlay-leg-topline">
                            {leg.league} | {leg.start} | {leg.stage}
                          </p>
                          <p className="parlay-leg-pick">
                            {leg.pickName} over {leg.opponentName}
                          </p>
                          <p className="parlay-leg-game">{leg.gameTitle}</p>
                        </div>
                        <div className="parlay-leg-side">
                          <strong>{leg.americanLabel}</strong>
                          <span>{leg.impliedProbabilityLabel} implied</span>
                          {leg.isAnalystPick ? <span className="analyst-chip">Analyst match</span> : null}
                          <button type="button" className="remove-leg-button" onClick={() => removeParlayPick(leg.gameId)}>
                            Remove
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            ) : null}

            {activeSidebarTab === 'markets' ? (
              <>
                <div className="parlay-stats-grid compact">
                  <article className="parlay-stat-card">
                    <span className="parlay-stat-label">Saved props</span>
                    <strong>{selectedPropEntries.length}</strong>
                  </article>
                  <article className="parlay-stat-card">
                    <span className="parlay-stat-label">Saved totals</span>
                    <strong>{selectedTotalEntries.length}</strong>
                  </article>
                  <article className="parlay-stat-card">
                    <span className="parlay-stat-label">Avg confidence</span>
                    <strong>{selectedPropEntries.length ? `${propConfidenceAverage}%` : 'N/A'}</strong>
                  </article>
                  <article className="parlay-stat-card">
                    <span className="parlay-stat-label">Prop filter</span>
                    <strong>{propTypeFilters.find((entry) => entry.id === activePropType)?.label ?? 'All'}</strong>
                  </article>
                </div>

                <div className="action-section">
                  <div className="action-section-header">
                    <div>
                      <p className="ticket-autobuild-label">Manual markets</p>
                      <p className="ticket-autobuild-copy">These are the unpriced adds from the left catalog. Keep them here while you decide whether the edge is stronger in hits, TB, RBI, or totals.</p>
                    </div>
                    <div className="builder-clear-group">
                      <button type="button" className="clear-parlay-button" disabled={!selectedPropEntries.length} onClick={clearSelectedProps}>
                        Clear props
                      </button>
                      <button type="button" className="clear-parlay-button" disabled={!selectedTotalEntries.length} onClick={clearSelectedTotals}>
                        Clear totals
                      </button>
                    </div>
                  </div>
                </div>

                {selectedTotalEntries.length ? (
                  <div className="action-section">
                    <div className="action-section-header">
                      <h3>Saved totals</h3>
                      <span>{selectedTotalEntries.length}</span>
                    </div>
                    <div className="prop-pick-list">
                      {selectedTotalEntries.map((total: AnyRecord) => (
                        <article key={total.id} className="prop-pick-card">
                          <div>
                            <p className="parlay-leg-topline">
                              {total.league} | {total.phaseLabel}
                            </p>
                            <p className="parlay-leg-pick">{total.marketLabel}</p>
                            <p className="parlay-leg-game">{total.gameTitle}</p>
                            <p className="parlay-leg-game">{total.projectedLabel}</p>
                          </div>
                          <div className="parlay-leg-side">
                            <strong>{total.strength}</strong>
                            <span>Manual price</span>
                            <button type="button" className="remove-leg-button" onClick={() => toggleSelectedTotal(total)}>
                              Remove
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedPropEntries.length ? (
                  <div className="action-section">
                    <div className="action-section-header">
                      <h3>Saved props</h3>
                      <span>{selectedPropEntries.length}</span>
                    </div>
                    <div className="prop-pick-list">
                      {selectedPropEntries.map((prop: AnyRecord) => (
                        <article key={prop.id} className="prop-pick-card">
                          <div>
                            <p className="parlay-leg-topline">
                              {prop.league} | {prop.lineupStatus}
                            </p>
                            <p className="parlay-leg-pick">
                              {prop.playerName} {prop.marketLabel}
                            </p>
                            <p className="parlay-leg-game">{prop.gameTitle}</p>
                            <p className="parlay-leg-game">{prop.reason}</p>
                          </div>
                          <div className="parlay-leg-side">
                            <strong>{prop.confidence}%</strong>
                            <span>{prop.probability}% model</span>
                            <button type="button" className="remove-leg-button" onClick={() => toggleSelectedProp(prop)}>
                              Remove
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                {!selectedPropEntries.length && !selectedTotalEntries.length ? (
                  <p className="parlay-empty">Save totals and props from the left catalog to stage manual markets here.</p>
                ) : null}
              </>
            ) : null}

            {activeSidebarTab === 'sources' ? (
              <div className="action-section">
                <div className="action-section-header">
                  <h3>Source registry</h3>
                  <span>{activeDay?.sources?.length ?? 0}</span>
                </div>
                <div className="sources-list">
                  {(activeDay?.sources ?? []).map((source: AnyRecord, index: number) => (
                    <a key={`${source.label || source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer">
                      <strong>{source.label || source.url}</strong>
                      <small>{source.note || source.url}</small>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </div>
  )
}

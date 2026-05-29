import { MlbDetail } from '../features/mlb/MlbDetail'
import { TennisDetail } from '../features/tennis/TennisDetail'

type AnyRecord = Record<string, any>

type BoardViewProps = Record<string, any>

export function BoardView(props: BoardViewProps) {
  const {
    activeDayId,
    activeDayIsoDate,
    activeFilter,
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
    tennisValueSummary,
    visibleGames
  } = props

  return (
    <div className="desk-board-workspace">
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

        <div className="games-rail-filters">
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
                  key={`${result.date}-${result.gameId}`}
                  type="button"
                  className={`global-search-result ${activeDayId === result.date && selectedGameId === result.gameId ? 'active' : ''}`}
                  onClick={() => openGlobalSearchResult(result)}
                >
                  <span>
                    <strong>{result.title}</strong>
                    <small>{result.dateLabel || result.date} | {result.start || 'TBD'} | {result.stage || result.league}</small>
                  </span>
                  <span className="global-search-result-meta">
                    {result.winnerName ? <strong>{result.winnerName}</strong> : <strong>{result.confidence ?? ''}</strong>}
                    <small>{result.scoreline || result.resultStatus || result.league}</small>
                  </span>
                </button>
              ))}
            </section>
          ) : marketSearch.trim().length >= 2 && isGlobalSearchLoading ? (
            <div className="placeholder-panel compact">
              <p className="eyebrow">Searching all dates</p>
              <h3>Looking across the archive</h3>
              <p>Checking every loaded slate for player, team, winner, and score matches.</p>
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
                            className="tennis-value-row"
                            onClick={() => setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: row.game.id }))}
                          >
                            <span>
                              <strong>{formatTennisValueSelection(row)}</strong>
                              <small>{row.validity?.label || row.marketType} | {row.gameTitle}</small>
                            </span>
                            <span>
                              <strong>{formatSignedNumber(row.evPer100, 1)}</strong>
                              <small>EV/100</small>
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
                    {tennisValueSummary.kalshiTradeCandidates?.length ? (
                      <div className="tennis-value-list tennis-trade-list">
                        <div className="tennis-value-section-label">Prediction market trade-to-sell</div>
                        {tennisValueSummary.kalshiTradeCandidates
                          .slice(0, 6)
                          .map((row: AnyRecord) => (
                          <button
                            key={`${row.marketTicker}-${row.boardMatchId}`}
                            type="button"
                            className="tennis-value-row tennis-value-row--trade"
                            onClick={() => setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: row.game.id }))}
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
                                {(row.spikeModelTier || row.candidateTier || 'watch')} | {formatPercent(Number(row.spikeModelProbability25x ?? row.targetHitProbability ?? 0) * 100, 0)}
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
                          .slice(0, 4)
                          .map((row: AnyRecord) => (
                          <button
                            key={`${row.marketTicker}-${row.boardMatchId}-watch`}
                            type="button"
                            className="tennis-value-row tennis-value-row--trade"
                            onClick={() => setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: row.game.id }))}
                          >
                            <span>
                              <strong>{row.selection} {Math.round(Number(row.yesAsk || 0) * 100)}c</strong>
                              <small>
                                Watch target {Math.round(Number(row.spikeModelTarget25x ?? row.projectedExit ?? 0) * 100)}c | hist {row.sameFavoriteHistoryCount}/{row.similarEntryHistoryCount} | {row.gameTitle}
                              </small>
                            </span>
                            <span>
                              <strong>{formatSignedNumber(Number(row.spikeModelEvPctOfEntry25x ?? row.tradeEvPctOfEntry ?? 0) * 100, 0)}%</strong>
                              <small>{formatPercent(Number(row.spikeModelProbability25x ?? row.targetHitProbability ?? 0) * 100, 0)} target hit</small>
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
                {mlbValueSummary && shouldShowValueScope('mlb-overview') ? (
                  <section className="tennis-value-slate-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">MLB value center</p>
                        <h3>{activeDayIsoDate} board map</h3>
                      </div>
                      <span>{mlbValueSummary.fullyPostedGames}/{mlbValueSummary.totalGames} fully posted</span>
                    </div>
                    <p>{mlbValueSummary.note}</p>
                    <div className="tennis-value-pill-row">
                      <span>1st inning {(mlbFirstInningValueSummary?.yrfiRows.length || 0) + (mlbFirstInningValueSummary?.nrfiRows.length || 0)}</span>
                      <span>Side {mlbValueSummary.sideRows.length}</span>
                      <span>Totals {mlbValueSummary.totalRows.length}</span>
                      <span>TB {mlbValueSummary.totalBaseRows.length}</span>
                      <span>K O/U {mlbValueSummary.strikeoutRows.length}</span>
                      <span>H+R+RBI {mlbValueSummary.displayHitRunRbiRows.length}</span>
                      <span>HR {mlbValueSummary.homeRunRows.length}</span>
                      <span>Kalshi {mlbValueSummary.mappedKalshiGames}</span>
                    </div>
                    {mlbValueSummary.sideRows.length || mlbValueSummary.totalRows.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">Side + totals board</div>
                        {[...mlbValueSummary.sideRows.slice(0, 4), ...mlbValueSummary.totalRows.slice(0, 4)]
                          .sort((left: AnyRecord, right: AnyRecord) => right.confidence - left.confidence || right.sortEdge - left.sortEdge)
                          .slice(0, 8)
                          .map((row: AnyRecord) => (
                            <button
                              key={`${row.id}-mlb-value`}
                              type="button"
                              className="tennis-value-row"
                              onClick={() => setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: row.gameId }))}
                            >
                              <span>
                                <strong>{row.title}</strong>
                                <small>{row.subtitle} | {row.priceLabel || row.metaLabel}</small>
                              </span>
                              <span>
                                <strong>{row.confidence}%</strong>
                                <small>{row.tags?.join(' | ') || row.metaLabel}</small>
                              </span>
                            </button>
                          ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}
                {mlbFirstInningValueSummary && shouldShowValueScope('mlb-first-inning') ? (
                  <section className="tennis-value-slate-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">MLB 1st-inning value board</p>
                        <h3>{activeDayIsoDate} YRFI / NRFI price edges</h3>
                      </div>
                      <span>{mlbFirstInningValueSummary.mappedGames}/{mlbFirstInningValueSummary.totalGames} mapped</span>
                    </div>
                    <p>{mlbFirstInningValueSummary.note}</p>
                    <div className="tennis-value-pill-row">
                      <span>YRFI value {mlbFirstInningValueSummary.yrfiRows.length}</span>
                      <span>NRFI value {mlbFirstInningValueSummary.nrfiRows.length}</span>
                    </div>
                    {mlbFirstInningValueSummary.yrfiRows.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">YRFI value</div>
                        {mlbFirstInningValueSummary.yrfiRows.slice(0, 5).map((row: AnyRecord) => (
                          <button
                            key={`${row.gameId}-yrfi-value`}
                            type="button"
                            className="tennis-value-row"
                            onClick={() => setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: row.gameId }))}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.summary}</small>
                            </span>
                            <span>
                              <strong>{`+${formatNumber(row.yesEdge, 1)} pts`}</strong>
                              <small>{`YES ${formatNumber(row.yesModel, 1)}% vs ask ${formatNumber(row.yesAsk, 1)}c`}</small>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {mlbFirstInningValueSummary.nrfiRows.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">NRFI value</div>
                        {mlbFirstInningValueSummary.nrfiRows.slice(0, 5).map((row: AnyRecord) => (
                          <button
                            key={`${row.gameId}-nrfi-value`}
                            type="button"
                            className="tennis-value-row"
                            onClick={() => setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: row.gameId }))}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.summary}</small>
                            </span>
                            <span>
                              <strong>{`+${formatNumber(row.noEdge, 1)} pts`}</strong>
                              <small>{`NO ${formatNumber(row.noModel, 1)}% vs ask ${formatNumber(row.noAsk, 1)}c`}</small>
                            </span>
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
                            className="tennis-value-row"
                            onClick={() => setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: row.gameId }))}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.summary}</small>
                            </span>
                            <span>
                              <strong>{row.confidence}%</strong>
                              <small>{`${row.priceLabel} | ${row.raw?.shadowSupportTag || 'Model-only'}`}</small>
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
                    </div>
                    {mlbValueSummary.strikeoutOverRows.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">Strikeout overs</div>
                        {mlbValueSummary.strikeoutOverRows.slice(0, 6).map((row: AnyRecord) => (
                          <button
                            key={`${row.id}-k-over-board`}
                            type="button"
                            className="tennis-value-row"
                            onClick={() => setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: row.gameId }))}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.summary}</small>
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
                        {mlbValueSummary.strikeoutUnderRows.slice(0, 6).map((row: AnyRecord) => (
                          <button
                            key={`${row.id}-k-under-board`}
                            type="button"
                            className="tennis-value-row"
                            onClick={() => setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: row.gameId }))}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.summary}</small>
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
                {mlbValueSummary && shouldShowValueScope('mlb-impact') ? (
                  <section className="tennis-value-slate-card">
                    <div className="tennis-value-slate-head">
                      <div>
                        <p className="eyebrow">MLB H+R+RBI value board</p>
                        <h3>{activeDayIsoDate} batting-impact lanes</h3>
                      </div>
                      <span>
                        {mlbValueSummary.hitRunRbiRows.length
                          ? `${mlbValueSummary.hitRunRbiRows.length} exported`
                          : `${mlbValueSummary.battingProductionRows.length} model`}
                      </span>
                    </div>
                    <p>
                      This board is meant to surface combined hitting production, not singles/walks. If a true H+R+RBI market is exported we show it directly;
                      otherwise we rank hitters with a batting-production ladder built from XOPS, xwOBA, slot, matchup, and pitch-fit context.
                    </p>
                    {mlbValueSummary.displayHitRunRbiRows.length ? (
                      <div className="tennis-value-list">
                        <div className="tennis-value-section-label">
                          {mlbValueSummary.hitRunRbiRows.length ? 'Live H+R+RBI style props' : 'Modeled H+R+RBI production ladder'}
                        </div>
                        {mlbValueSummary.displayHitRunRbiRows.slice(0, 8).map((row: AnyRecord) => (
                          <button
                            key={`${row.id}-impact-board`}
                            type="button"
                            className="tennis-value-row"
                            onClick={() => setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: row.gameId }))}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.summary}</small>
                            </span>
                            <span>
                              <strong>{row.confidence}%</strong>
                              <small>{row.priceLabel}</small>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <small className="tennis-value-warning">
                        No H+R+RBI ladder is available yet. Open this scope once the MLB game-detail payloads finish loading.
                      </small>
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
                              className="tennis-value-row hr-value-row"
                              onClick={() => {
                                if (!row.gameId) return
                                setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: row.gameId }))
                              }}
                            >
                              <div className="hr-value-top">
                                <div className="hr-value-title-block">
                                  <strong>#{row.rank || '?'} {row.playerName}</strong>
                                  <small>{row.teamName} | {row.gameTitle}</small>
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
                            className="tennis-value-row"
                            onClick={() => setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: row.gameId }))}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.summary}</small>
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
                            className="tennis-value-row"
                            onClick={() => setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: row.gameId }))}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.summary}</small>
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
                            className="tennis-value-row"
                            onClick={() => setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: row.gameId }))}
                          >
                            <span>
                              <strong>{row.title}</strong>
                              <small>{row.summary}</small>
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
                className={`game-rail-row ${selectedGame?.id === game.id ? 'active' : ''}`}
                onClick={() => setSelectedGameIdByDay((current) => ({ ...current, [activeDayId]: game.id }))}
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

      <section className="detail-canvas">
        {isActiveDayLoading && !selectedGame ? (
          <div className="placeholder-panel compact">
            <p className="eyebrow">Loading detail</p>
            <h3>Preparing the selected slate</h3>
            <p>Once the board loads, matchup analysis and props will appear here.</p>
          </div>
        ) : selectedGame ? (
          <>
            <div className="detail-canvas-header">
              <div className="detail-canvas-title-block">
                <div className="detail-canvas-topline">
                  {renderLeagueBadge(selectedGame.league)}
                  <span className="mono">{selectedGame.start}</span>
                  <span>{selectedGame.stage}</span>
                  {latestLineupSnapshot ? <span>{formatSnapshotTime(latestLineupSnapshot)}</span> : null}
                </div>
                <h1>{getGameDisplayTitle(selectedGame)}</h1>
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

            <div className="detail-kpi-strip">
              <article className="detail-kpi-card">
                <span className="eyebrow">Pick</span>
                <strong>{selectedGame.analysis?.participant?.name || 'No pick'}</strong>
                <small>Analyst read</small>
              </article>
              <article className="detail-kpi-card">
                <span className="eyebrow">Confidence</span>
                <strong>{selectedGame.analysis?.confidence}</strong>
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

            <div className="detail-canvas-scroll no-scrollbar">
              <div className="detail-canvas-grid">
                <section className="detail-panel insight-panel">
                  <div className="detail-panel-header">
                    <p className="eyebrow">Editorial read</p>
                    <span>{(selectedGame.tags ?? []).join(' | ')}</span>
                  </div>
                  <p className="game-summary">{selectedGame.summary}</p>
                  <div className="closeout">
                    <p className="lean-line">{selectedGame.analysis?.lean}</p>
                    <p className="swing-line">{swingTextFor(selectedGame)}</p>
                  </div>
                  <div className="meter-grid compact">
                    <div className="meter-card">
                      <div className="meter-label">
                        <span>Confidence</span>
                        <strong>{labelForScore(selectedGame.analysis?.confidence ?? 0)}</strong>
                      </div>
                      <div className="meter-track">
                        <span style={{ width: `${selectedGame.analysis?.confidence ?? 0}%` }} />
                      </div>
                    </div>
                    <div className="meter-card">
                      <div className="meter-label">
                        <span>Volatility</span>
                        <strong>{labelForScore(selectedGame.analysis?.volatility ?? 0)}</strong>
                      </div>
                      <div className="meter-track volatility">
                        <span style={{ width: `${selectedGame.analysis?.volatility ?? 0}%` }} />
                      </div>
                    </div>
                  </div>
                  <ul className="factor-list compact">
                    {(selectedGame.factors ?? []).map((factor: string, index: number) => (
                      <li key={`${selectedGame.id}-factor-${index}`}>{factor}</li>
                    ))}
                  </ul>
                </section>

                <div className="detail-stack">
                  {renderMoneylinePanel(selectedGame)}
                  <section className="odds-panel">
                    <div className="detail-panel-header">
                      <p className="eyebrow">Odds snapshot</p>
                      <span>{selectedGame.odds?.provider || selectedGame.moneyline?.provider || 'Model board'}</span>
                    </div>
                    <p className="react-section-copy">{selectedGame.odds?.note || selectedGame.summary}</p>
                    <div className="react-prop-grid">
                      {(selectedGame.odds?.markets ?? []).map((market: AnyRecord) => (
                        <article key={`${selectedGame.id}-${market.label}`} className="react-prop-card odds-market-card">
                          <div className="odds-market-head">
                            <strong>{market.label}</strong>
                            <small>{market.book || selectedGame.odds?.provider}</small>
                          </div>
                          <p>{market.value}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
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

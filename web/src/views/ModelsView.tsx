import type { ModelHistoryEntry } from '../lib/archive-loaders'

type AnyRecord = Record<string, any>

type TrendPoint = {
  id: string
  label: string
  fullGame: number | null
  first5: number | null
  firstInning: number | null
  hrBoard: number | null
  tennis: number | null
  props: number | null
}

type TrendSegment = {
  x1: number
  y1: number
  x2: number
  y2: number
}

type HistoryTrendSummary = {
  fullGame: number | null
  first5: number | null
  firstInning: number | null
  hrBoard: number | null
  tennis: number | null
  props: number | null
}

type ModelsViewProps = {
  dailyHistoryTrendPoints: TrendPoint[]
  eligibleMoneylineGames: AnyRecord[]
  favoriteRecommendationPool: AnyRecord[]
  first5TrendSegments: TrendSegment[]
  firstInningTrendSegments: TrendSegment[]
  formatPercent: (value?: number | null, digits?: number) => string
  formatSnapshotTime: (isoString: string) => string
  fullGameTrendSegments: TrendSegment[]
  games: AnyRecord[]
  historyLoaded: boolean
  historyTrendPoints: TrendPoint[]
  historyTrendSummary: HistoryTrendSummary
  hrTrendSegments: TrendSegment[]
  latestHistoryTrendLabel: string
  latestLineupSnapshot?: string | null
  modelHistory: ModelHistoryEntry[]
  modelHistoryLoaded: boolean
  propTrendSegments: TrendSegment[]
  slateMeta: { date: string }
  tennisTrendSegments: TrendSegment[]
  trendChartHeight: number
  trendChartPadding: number
  trendChartWidth: number
}

export function ModelsView({
  dailyHistoryTrendPoints,
  eligibleMoneylineGames,
  favoriteRecommendationPool,
  first5TrendSegments,
  firstInningTrendSegments,
  formatPercent,
  formatSnapshotTime,
  fullGameTrendSegments,
  games,
  historyLoaded,
  historyTrendPoints,
  historyTrendSummary,
  hrTrendSegments,
  latestHistoryTrendLabel,
  latestLineupSnapshot,
  modelHistory,
  modelHistoryLoaded,
  propTrendSegments,
  slateMeta,
  tennisTrendSegments,
  trendChartHeight,
  trendChartPadding,
  trendChartWidth
}: ModelsViewProps) {
  return (
    <div className="desk-tool-workspace models-workspace">
      <section className="workspace-panel action-section models-chart-panel">
        <div className="action-section-header">
          <h3>Accuracy trend through {latestHistoryTrendLabel}</h3>
          <span>{historyTrendPoints.length} graded days</span>
        </div>

        {historyLoaded ? (
          <>
            <div className="history-metric-grid models-metric-grid">
              <article className="parlay-stat-card history-metric-card positive">
                <span className="parlay-stat-label">Avg MLB full game</span>
                <strong>{formatPercent(historyTrendSummary.fullGame)}</strong>
                <small>Daily graded archive</small>
              </article>
              <article className="parlay-stat-card history-metric-card warning">
                <span className="parlay-stat-label">Avg MLB first 5</span>
                <strong>{formatPercent(historyTrendSummary.first5)}</strong>
                <small>Starter-window hit rate</small>
              </article>
              <article className="parlay-stat-card history-metric-card first-inning">
                <span className="parlay-stat-label">Avg MLB 1st inning</span>
                <strong>{formatPercent(historyTrendSummary.firstInning)}</strong>
                <small>YRFI / NRFI hit rate</small>
              </article>
              <article className="parlay-stat-card history-metric-card negative">
                <span className="parlay-stat-label">Avg HR board</span>
                <strong>{formatPercent(historyTrendSummary.hrBoard)}</strong>
                <small>Hit rate on saved HR pool</small>
              </article>
              <article className="parlay-stat-card history-metric-card props">
                <span className="parlay-stat-label">Avg non-HR props</span>
                <strong>{formatPercent(historyTrendSummary.props)}</strong>
                <small>Hits, TB, RBI, walks, singles</small>
              </article>
              <article className="parlay-stat-card history-metric-card info">
                <span className="parlay-stat-label">Avg tennis main tour</span>
                <strong>{formatPercent(historyTrendSummary.tennis)}</strong>
                <small>Graded main-tour tennis picks</small>
              </article>
            </div>

            <div className="trend-chart-shell">
              <div className="trend-chart-legend">
                <span><i className="trend-dot positive" />MLB full game</span>
                <span><i className="trend-dot warning" />MLB first 5</span>
                <span><i className="trend-dot first-inning" />MLB 1st inning</span>
                <span><i className="trend-dot negative" />HR board</span>
                <span><i className="trend-dot props" />Non-HR props</span>
                <span><i className="trend-dot tennis" />Tennis main tour</span>
              </div>

              <div className="trend-chart-frame">
                <svg viewBox={`0 0 ${trendChartWidth} ${trendChartHeight}`} className="trend-chart" role="img" aria-label="Model accuracy trend">
                  {[0, 25, 50, 75, 100].map((tick) => {
                    const y = trendChartPadding + ((100 - tick) / 100) * (trendChartHeight - trendChartPadding * 2)
                    return (
                      <g key={`tick-${tick}`}>
                        <line x1={trendChartPadding} y1={y} x2={trendChartWidth - trendChartPadding} y2={y} className="trend-grid-line" />
                        <text x={6} y={y + 4} className="trend-axis-label">{tick}</text>
                      </g>
                    )
                  })}

                  {fullGameTrendSegments.map((segment, index) => (
                    <line key={`full-${index}`} x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} className="trend-line positive" />
                  ))}
                  {first5TrendSegments.map((segment, index) => (
                    <line key={`first5-${index}`} x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} className="trend-line warning" />
                  ))}
                  {firstInningTrendSegments.map((segment, index) => (
                    <line key={`first-inning-${index}`} x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} className="trend-line first-inning" />
                  ))}
                  {hrTrendSegments.map((segment, index) => (
                    <line key={`hr-${index}`} x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} className="trend-line negative" />
                  ))}
                  {propTrendSegments.map((segment, index) => (
                    <line key={`props-${index}`} x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} className="trend-line props" />
                  ))}
                  {tennisTrendSegments.map((segment, index) => (
                    <line key={`tennis-${index}`} x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} className="trend-line tennis" />
                  ))}

                  {historyTrendPoints.map((entry, index) => {
                    const x =
                      historyTrendPoints.length === 1
                        ? trendChartWidth / 2
                        : trendChartPadding +
                          ((trendChartWidth - trendChartPadding * 2) * index) / (historyTrendPoints.length - 1)

                    return (
                      <g key={entry.id}>
                        {entry.fullGame !== null ? (
                          <circle
                            cx={x}
                            cy={trendChartPadding + ((100 - entry.fullGame) / 100) * (trendChartHeight - trendChartPadding * 2)}
                            r="4"
                            className="trend-point positive"
                          />
                        ) : null}
                        {entry.first5 !== null ? (
                          <circle
                            cx={x}
                            cy={trendChartPadding + ((100 - entry.first5) / 100) * (trendChartHeight - trendChartPadding * 2)}
                            r="4"
                            className="trend-point warning"
                          />
                        ) : null}
                        {entry.firstInning !== null ? (
                          <circle
                            cx={x}
                            cy={trendChartPadding + ((100 - entry.firstInning) / 100) * (trendChartHeight - trendChartPadding * 2)}
                            r="4"
                            className="trend-point first-inning"
                          />
                        ) : null}
                        {entry.hrBoard !== null ? (
                          <circle
                            cx={x}
                            cy={trendChartPadding + ((100 - entry.hrBoard) / 100) * (trendChartHeight - trendChartPadding * 2)}
                            r="4"
                            className="trend-point negative"
                          />
                        ) : null}
                        {entry.props !== null ? (
                          <circle
                            cx={x}
                            cy={trendChartPadding + ((100 - entry.props) / 100) * (trendChartHeight - trendChartPadding * 2)}
                            r="4"
                            className="trend-point props"
                          />
                        ) : null}
                        {entry.tennis !== null ? (
                          <circle
                            cx={x}
                            cy={trendChartPadding + ((100 - entry.tennis) / 100) * (trendChartHeight - trendChartPadding * 2)}
                            r="4"
                            className="trend-point tennis"
                          />
                        ) : null}
                        <text x={x} y={trendChartHeight - 6} textAnchor="middle" className="trend-axis-label">{entry.id.slice(5)}</text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>

            <div className="models-daily-grid">
              {dailyHistoryTrendPoints.map((entry) => (
                <article key={`daily-${entry.id}`} className="history-ledger-card models-daily-card">
                  <span className="parlay-stat-label">{entry.label}</span>
                  <div className="models-daily-rows">
                    <div>
                      <span>MLB FG</span>
                      <strong>{formatPercent(entry.fullGame)}</strong>
                    </div>
                    <div>
                      <span>MLB F5</span>
                      <strong>{formatPercent(entry.first5)}</strong>
                    </div>
                    <div>
                      <span>MLB RFI</span>
                      <strong>{formatPercent(entry.firstInning)}</strong>
                    </div>
                    <div>
                      <span>HR</span>
                      <strong>{formatPercent(entry.hrBoard)}</strong>
                    </div>
                    <div>
                      <span>Tennis</span>
                      <strong>{formatPercent(entry.tennis)}</strong>
                    </div>
                    <div>
                      <span>Props</span>
                      <strong>{formatPercent(entry.props)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <section className="models-audit-section">
              <div className="action-section-header">
                <h3>Model change log</h3>
                <span>{modelHistory.length} days</span>
              </div>
              {!modelHistoryLoaded ? (
                <p className="react-section-copy">Loading model audit trail...</p>
              ) : modelHistory.length ? (
                <div className="models-audit-list">
                  {modelHistory.map((day) => (
                    <article key={`model-history-${day.id}`} className="history-ledger-card models-audit-day">
                      <div className="models-audit-day-header">
                        <div>
                          <span className="parlay-stat-label">{day.label}</span>
                          <strong>{day.date}</strong>
                        </div>
                        <span className={`history-status-pill ${day.status}`}>{day.status}</span>
                      </div>
                      <div className="models-audit-models">
                        {day.models.map((model) => (
                          <div key={`${day.id}-${model.id}`} className="models-audit-model-card">
                            <div className="models-audit-model-topline">
                              <span className={`model-sport-pill ${String(model.sport).toLowerCase()}`}>{model.sport}</span>
                              <strong>{model.lane}</strong>
                              <small>{model.modelName}</small>
                            </div>
                            <div className="models-audit-stats">
                              <span>{model.performanceLabel ?? 'Performance pending'}</span>
                              <span>{model.coverageLabel ?? 'Coverage not recorded'}</span>
                            </div>
                            <ul className="models-audit-changelog">
                              {model.changelog.slice(0, 4).map((change, index) => (
                                <li key={`${day.id}-${model.id}-change-${index}`}>{change}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="react-section-copy">No model audit entries exported yet.</p>
              )}
            </section>
          </>
        ) : (
          <p className="react-section-copy">Loading graded archive...</p>
        )}
      </section>

      <section className="workspace-panel action-section">
        <div className="action-section-header">
          <h3>Current slate diagnostics</h3>
          <span>{games.length} games</span>
        </div>
        <ul className="factor-list compact">
          <li>Slate day: {slateMeta.date}</li>
          <li>Latest lineup refresh: {latestLineupSnapshot ? formatSnapshotTime(latestLineupSnapshot) : 'Not available'}</li>
          <li>Eligible moneylines: {eligibleMoneylineGames.length}</li>
          <li>Top analysis lane: {favoriteRecommendationPool[0]?.participant?.name ?? 'No active edge'}</li>
        </ul>
      </section>
      <section className="workspace-panel action-section">
        <div className="action-section-header">
          <h3>Archive note</h3>
          <span>JSONL ready</span>
        </div>
        <p className="react-section-copy">
          Daily hit and miss ledgers now export to structured JSONL under <code>data-private/history</code>, so the archive can train against individual picks instead of only summary docs.
        </p>
      </section>
    </div>
  )
}

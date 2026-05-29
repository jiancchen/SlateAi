import type { DailyPropSummary } from '../lib/history-prop-performance.generated'
import type { HistoryEntry, HistoryMetric, HistorySportTab } from '../lib/history-types'

type HistoryViewProps = {
  activeHistoryEntry: HistoryEntry | null
  activeHistoryMetrics: HistoryMetric[]
  activeHistoryPropSummary: DailyPropSummary | null
  activeHistorySportSections: NonNullable<HistorySportTab['sections']>
  activeHistorySportTab: HistorySportTab | null
  activeHistorySportTabs: HistorySportTab[]
  activeHistoryTrackedMarkets: string[]
  formatPercent: (value?: number | null, digits?: number) => string
  getHistoryMetricTone: (metric: { tone?: string }) => string
  getHistoryReviewTone: (result?: string) => string
  historyArchive: HistoryEntry[]
  historyLoaded: boolean
  setActiveHistoryId: (id: string) => void
  setActiveHistorySportTabId: (id: string) => void
}

export function HistoryView({
  activeHistoryEntry,
  activeHistoryMetrics,
  activeHistoryPropSummary,
  activeHistorySportSections,
  activeHistorySportTab,
  activeHistorySportTabs,
  activeHistoryTrackedMarkets,
  formatPercent,
  getHistoryMetricTone,
  getHistoryReviewTone,
  historyArchive,
  historyLoaded,
  setActiveHistoryId,
  setActiveHistorySportTabId
}: HistoryViewProps) {
  return (
    <div className="desk-tool-workspace history-workspace">
      <section className="workspace-panel history-rail">
        <div className="history-rail-header">
          <div>
            <p className="eyebrow">History</p>
            <h3>Archive through {historyArchive[0]?.label ?? 'the latest graded day'}</h3>
            <p className="react-section-copy">
              Daily grading blocks, combined backtests, and the saved board artifacts that fed them.
            </p>
          </div>
          <span className="mono history-archive-count">{historyArchive.length} blocks</span>
        </div>

        <div className="history-rail-list no-scrollbar">
          {!historyLoaded ? <p className="react-section-copy">Loading archive...</p> : null}
          {historyArchive.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`history-row ${activeHistoryEntry?.id === entry.id ? 'active' : ''}`}
              onClick={() => setActiveHistoryId(entry.id)}
            >
              <div className="history-row-topline">
                <span className="mono">{entry.date}</span>
                <span className={`history-status-pill ${entry.status}`}>{entry.status}</span>
              </div>
              <strong>{entry.label}</strong>
              <p>{entry.summary}</p>
              <div className="history-row-tags">
                {entry.trackedMarkets.map((market) => (
                  <span key={`${entry.id}-${market}`}>{market}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="workspace-panel history-detail">
        {!historyLoaded ? (
          <p className="react-section-copy">Loading archive detail...</p>
        ) : activeHistoryEntry ? (
          <>
            <div className="history-detail-header">
              <div>
                <p className="eyebrow">Archive detail</p>
                <h2>{activeHistoryEntry.label}</h2>
                <p className="react-section-copy">{activeHistoryEntry.summary}</p>
              </div>
              <div className="history-sports mono">
                {activeHistoryEntry.sports.map((sport) => (
                  <span key={`${activeHistoryEntry.id}-${sport}`}>{sport}</span>
                ))}
              </div>
            </div>

            <div className="history-detail-body">
              <div className="history-metric-grid">
                {activeHistoryMetrics.map((metric) => (
                  <article
                    key={`${activeHistoryEntry.id}-${metric.label}`}
                    className={`parlay-stat-card history-metric-card ${getHistoryMetricTone(metric)}`}
                  >
                    <span className="parlay-stat-label">{metric.label}</span>
                    <strong>{metric.value}</strong>
                    {metric.note ? <small>{metric.note}</small> : null}
                  </article>
                ))}
              </div>

              {activeHistorySportTabs.length ? (
                <section className="action-section history-deep-dive">
                  <div className="action-section-header">
                    <h3>Day review</h3>
                    <span>{activeHistorySportTabs.length} sports</span>
                  </div>

                  <div className="history-sport-tabs">
                    {activeHistorySportTabs.map((tab) => (
                      <button
                        key={`${activeHistoryEntry.id}-sport-tab-${tab.id}`}
                        type="button"
                        className={`history-sport-tab ${activeHistorySportTab?.id === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveHistorySportTabId(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {activeHistorySportTab ? (
                    <div className="history-sport-shell">
                      <p className="react-section-copy">{activeHistorySportTab.summary}</p>

                      {activeHistorySportTab.metrics?.length ? (
                        <div className="history-sport-metric-grid">
                          {activeHistorySportTab.metrics.map((metric) => (
                            <article
                              key={`${activeHistoryEntry.id}-${activeHistorySportTab.id}-${metric.label}`}
                              className={`history-ledger-card history-sport-metric ${getHistoryMetricTone(metric)}`}
                            >
                              <span className="parlay-stat-label">{metric.label}</span>
                              <strong>{metric.value}</strong>
                              {metric.note ? <small>{metric.note}</small> : null}
                            </article>
                          ))}
                        </div>
                      ) : null}

                      {activeHistorySportTab.placeholder ? (
                        <article className="history-ledger-card">
                          <span className="parlay-stat-label">
                            {activeHistorySportTab.sections?.length ? 'Coverage note' : 'Reserved slot'}
                          </span>
                          <strong>
                            {activeHistorySportTab.sections?.length
                              ? `${activeHistorySportTab.label} detail is partial`
                              : `${activeHistorySportTab.label} review pending`}
                          </strong>
                          <small>{activeHistorySportTab.placeholder}</small>
                        </article>
                      ) : null}

                      {activeHistorySportSections.map((section) => (
                        <div key={`${activeHistoryEntry.id}-${activeHistorySportTab.id}-${section.label}`} className="history-review-section">
                          <div className="action-section-header">
                            <h3>{section.label}</h3>
                            <span>{section.games.length} matches</span>
                          </div>
                          <div className="history-review-grid">
                            {section.games.map((game) => (
                              <article
                                key={`${activeHistoryEntry.id}-${activeHistorySportTab.id}-${game.id}`}
                                className={`history-review-card ${getHistoryReviewTone(game.result)}`}
                              >
                                <div className="history-review-topline">
                                  <strong>{game.title}</strong>
                                  <span className={`history-review-pill ${getHistoryReviewTone(game.result)}`}>{game.result}</span>
                                </div>
                                <div className="history-review-meta">
                                  {game.start ? <span>{game.start}</span> : null}
                                  {game.crowd ? <span>Board {game.crowd}</span> : null}
                                </div>
                                <div className="history-review-row">
                                  <span>Predicted</span>
                                  <strong>{game.predicted}</strong>
                                  <small>{game.confidence ? `${game.confidence} confidence` : 'Desk lean'}</small>
                                </div>
                                <div className="history-review-row">
                                  <span>Actual</span>
                                  <strong>{game.actualWinner ?? 'Pending'}</strong>
                                  <small>{game.finalScore ?? game.note ?? 'Awaiting result'}</small>
                                </div>
                                {game.note && game.finalScore ? <p className="history-review-note">{game.note}</p> : null}
                              </article>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

              <div className="history-section-grid">
                <section className="action-section">
                  <div className="action-section-header">
                    <h3>Result ledger</h3>
                    <span>{activeHistoryEntry.journal?.records ?? activeHistoryEntry.trackedMarkets.length}</span>
                  </div>
                  <div className="history-ledger-grid">
                    <article className="history-ledger-card">
                      <span className="parlay-stat-label">Coverage</span>
                      <strong>
                        {activeHistoryEntry.journal
                          ? `${activeHistoryEntry.journal.records} rows`
                          : `${activeHistoryTrackedMarkets.length} markets`}
                      </strong>
                      <small>
                        {activeHistoryEntry.journal
                          ? `${activeHistoryEntry.journal.sideRows ?? 0} sides | ${activeHistoryEntry.journal.hrRows ?? 0} HR props | ${activeHistoryEntry.journal.propRows ?? activeHistoryPropSummary?.overall?.total ?? 0} player props`
                          : activeHistoryTrackedMarkets.join(' | ')}
                      </small>
                    </article>
                    <article className="history-ledger-card">
                      <span className="parlay-stat-label">Training asset</span>
                      <strong>{activeHistoryEntry.journal ? 'JSONL ready' : 'Summary only'}</strong>
                      <small>{activeHistoryEntry.journal?.note ?? 'Older archive blocks only preserve summary-level grading.'}</small>
                    </article>
                  </div>
                  <div className="history-chip-row">
                    {activeHistoryTrackedMarkets.map((market) => (
                      <span key={`${activeHistoryEntry.id}-market-${market}`} className="history-chip">
                        {market}
                      </span>
                    ))}
                  </div>
                </section>

                {activeHistoryPropSummary?.overall?.total ? (
                  <section className="action-section">
                    <div className="action-section-header">
                      <h3>Prop breakdown</h3>
                      <span>{activeHistoryPropSummary.overall.total}</span>
                    </div>
                    <div className="history-ledger-grid">
                      {Object.entries(activeHistoryPropSummary.byType).map(([propType, summary]) => (
                        <article key={`${activeHistoryEntry.id}-prop-${propType}`} className="history-ledger-card">
                          <span className="parlay-stat-label">{propType}</span>
                          <strong>
                            {summary.hits}/{summary.total}
                          </strong>
                          <small>{formatPercent(summary.hitRate)} hit rate</small>
                        </article>
                      ))}
                    </div>
                    {activeHistoryPropSummary.topHits.length ? (
                      <div className="history-subsection">
                        <span className="parlay-stat-label">Best prop hits</span>
                        <p className="react-section-copy">{activeHistoryPropSummary.topHits.join(' | ')}</p>
                      </div>
                    ) : null}
                    {activeHistoryPropSummary.topMisses.length ? (
                      <div className="history-subsection">
                        <span className="parlay-stat-label">Best prop misses to learn from</span>
                        <p className="react-section-copy">{activeHistoryPropSummary.topMisses.join(' | ')}</p>
                      </div>
                    ) : null}
                  </section>
                ) : null}

                <HistoryListSection title="Notable hits" itemKey="hit" items={activeHistoryEntry.notableHits} entryId={activeHistoryEntry.id} />
                <HistoryListSection title="Notable misses" itemKey="key-miss" items={activeHistoryEntry.notableMisses} entryId={activeHistoryEntry.id} />
                <HistoryListSection title="What worked" itemKey="worked" items={activeHistoryEntry.whatWorked} entryId={activeHistoryEntry.id} />
                <HistoryListSection title="What missed" itemKey="missed" items={activeHistoryEntry.whatMissed} entryId={activeHistoryEntry.id} />
                <HistoryListSection title="Takeaways" itemKey="takeaway" items={activeHistoryEntry.takeaways} entryId={activeHistoryEntry.id} />
              </div>

              <section className="action-section">
                <div className="action-section-header">
                  <h3>Archive artifacts</h3>
                  <span>{activeHistoryEntry.artifacts.length}</span>
                </div>
                <div className="history-artifact-list">
                  {activeHistoryEntry.artifacts.map((artifact) => (
                    <article key={`${activeHistoryEntry.id}-${artifact.path}`} className="history-artifact-card">
                      <strong>{artifact.label}</strong>
                      <code>{artifact.path}</code>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </section>
    </div>
  )
}

function HistoryListSection({
  entryId,
  itemKey,
  items,
  title
}: {
  entryId: string
  itemKey: string
  items: string[]
  title: string
}) {
  return (
    <section className="action-section">
      <div className="action-section-header">
        <h3>{title}</h3>
        <span>{items.length}</span>
      </div>
      <ul className="factor-list compact">
        {items.map((item) => (
          <li key={`${entryId}-${itemKey}-${item}`}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

import type {
  StoryArchiveDaySummary,
  StoryArchiveGame,
  StoryArchiveIndexEntry,
  StoryTimelineEvent
} from '../lib/story-types'

type StoryMetric = {
  label: string
  value: string
  note?: string
  tone?: string
}

type StoryTimelineGroup = {
  key: string
  label: string
  events: StoryTimelineEvent[]
}

type StoryGameSummary = StoryArchiveDaySummary['games'][number]

type StoriesViewProps = {
  activeStoryDay: StoryArchiveDaySummary | null
  activeStoryGame: StoryArchiveGame | null
  activeStoryGameSummary: StoryGameSummary | null
  activeStoryId: string
  activeStoryMetrics: StoryMetric[]
  activeStoryTimeline: StoryTimelineEvent[]
  activeStoryTimelineGroups: StoryTimelineGroup[]
  classifyStoryEventTone: (event?: StoryTimelineEvent | null) => string
  getHistoryMetricTone: (metric: { tone?: string }) => string
  loadingStoryDaysById: Record<string, boolean>
  setActiveStoryId: (id: string) => void
  setSelectedStoryGamePk: (gamePk: number) => void
  storiesLoaded: boolean
  storyArchive: StoryArchiveIndexEntry[]
  storyRailDays: StoryArchiveIndexEntry[]
}

export function StoriesView({
  activeStoryDay,
  activeStoryGame,
  activeStoryGameSummary,
  activeStoryId,
  activeStoryMetrics,
  activeStoryTimeline,
  activeStoryTimelineGroups,
  classifyStoryEventTone,
  getHistoryMetricTone,
  loadingStoryDaysById,
  setActiveStoryId,
  setSelectedStoryGamePk,
  storiesLoaded,
  storyArchive,
  storyRailDays
}: StoriesViewProps) {
  return (
    <div className="desk-tool-workspace history-workspace stories-workspace">
      <section className="workspace-panel history-rail">
        <div className="history-rail-header">
          <div>
            <p className="eyebrow">Stories</p>
            <h3>MLB game archive through May 21</h3>
            <p className="react-section-copy">
              Derived from warehoused plate appearances and pitch events so we can study how games actually broke, not just who won.
            </p>
          </div>
          <span className="mono history-archive-count">{storyArchive.length} days</span>
        </div>

        <div className="history-rail-list no-scrollbar">
          {!storiesLoaded ? <p className="react-section-copy">Loading story archive...</p> : null}
          {storyRailDays.map((day) => (
            <button
              key={day.id}
              type="button"
              className={`history-row ${activeStoryId === day.id ? 'active' : ''}`}
              onClick={() => setActiveStoryId(day.id)}
            >
              <div className="history-row-topline">
                <span className="mono">{day.date}</span>
                <span className="history-status-pill graded">{day.metrics.games} games</span>
              </div>
              <strong>{day.headline}</strong>
              <p>
                {day.metrics.quietFirst5} quiet first-5 starts | {day.metrics.bullpenFlips} bullpen flips | {day.metrics.comebackWins} comeback wins
              </p>
              <div className="history-row-tags">
                <span>PA {day.metrics.plateAppearances}</span>
                <span>Pitches {day.metrics.pitchEvents}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="workspace-panel history-detail">
        {!storiesLoaded ? (
          <p className="react-section-copy">Loading story detail...</p>
        ) : loadingStoryDaysById[activeStoryId] && !activeStoryDay ? (
          <p className="react-section-copy">Loading story day...</p>
        ) : activeStoryDay ? (
          <>
            <div className="history-detail-header">
              <div>
                <p className="eyebrow">Story detail</p>
                <h2>{activeStoryDay.date}</h2>
                <p className="react-section-copy">{activeStoryDay.headline}</p>
              </div>
              <div className="history-sports mono">
                <span>MLB</span>
                <span>{activeStoryDay.metrics.games} games</span>
              </div>
            </div>

            <div className="history-metric-grid">
              {activeStoryMetrics.map((metric) => (
                <article key={`${activeStoryDay.id}-${metric.label}`} className={`parlay-stat-card history-metric-card ${getHistoryMetricTone(metric)}`}>
                  <span className="parlay-stat-label">{metric.label}</span>
                  <strong>{metric.value}</strong>
                  {metric.note ? <small>{metric.note}</small> : null}
                </article>
              ))}
            </div>

            <div className="history-section-grid story-section-grid">
              <section className="action-section story-section-span">
                <div className="action-section-header">
                  <h3>Game event log</h3>
                  <span>
                    {activeStoryGame
                      ? `${activeStoryGame.title} | ${activeStoryTimeline.length} events`
                      : activeStoryGameSummary
                        ? `${activeStoryGameSummary.title} | loading`
                        : 'No game selected'}
                  </span>
                </div>

                {activeStoryGame ? (
                  <div className="story-log-shell">
                    <div className="story-log-picker">
                      {activeStoryDay.games.map((game) => (
                        <button
                          key={`${activeStoryDay.id}-pick-${game.gamePk}`}
                          type="button"
                          className={`history-chip ${activeStoryGameSummary?.gamePk === game.gamePk ? 'active' : ''}`}
                          onClick={() => setSelectedStoryGamePk(game.gamePk)}
                        >
                          {game.awayTeam.split(' ').slice(-1)[0]} @ {game.homeTeam.split(' ').slice(-1)[0]}
                        </button>
                      ))}
                    </div>

                    <div className="story-log-summary">
                      <article className="history-ledger-card">
                        <span className="parlay-stat-label">Final score</span>
                        <strong>
                          {activeStoryGame.awayTeam} {activeStoryGame.summary?.awayRuns ?? 0} - {activeStoryGame.summary?.homeRuns ?? 0} {activeStoryGame.homeTeam}
                        </strong>
                        <small>{activeStoryGame.winnerTeam ? `${activeStoryGame.winnerTeam} won the game` : 'Final result unavailable'}</small>
                      </article>
                      <article className="history-ledger-card">
                        <span className="parlay-stat-label">Story tags</span>
                        <strong>{activeStoryGame.tags.length ? activeStoryGame.tags.join(' | ') : 'No tags'}</strong>
                        <small>
                          First scoring inning {activeStoryGame.firstScoringInning || '-'} | lead changes {activeStoryGame.leadChanges || 0}
                        </small>
                      </article>
                      <article className="history-ledger-card">
                        <span className="parlay-stat-label">Run split</span>
                        <strong>{activeStoryGame.totalRunsFirst5} first 5 | {activeStoryGame.totalRunsFinal} final</strong>
                        <small>
                          HR starter / relief: {activeStoryGame.hrOffStarters} / {activeStoryGame.hrOffRelievers}
                        </small>
                      </article>
                    </div>

                    <div className="story-log-groups">
                      {activeStoryTimelineGroups.map((group) => (
                        <section key={`${activeStoryGame.gamePk}-${group.key}`} className="story-log-group">
                          <div className="story-log-group-head">
                            <h4>{group.label}</h4>
                            <span className="history-status-pill graded">{group.events.length} plays</span>
                          </div>
                          <div className="story-log-events">
                            {group.events.map((event) => (
                              <article
                                key={`${activeStoryGame.gamePk}-${group.key}-${event.atBatIndex}`}
                                className={`story-log-event tone-${classifyStoryEventTone(event)}`}
                              >
                                <div className="story-log-event-topline">
                                  <span className="mono">
                                    {event.half === 'top' ? 'T' : 'B'}
                                    {event.inning}
                                  </span>
                                  <strong>{event.event}</strong>
                                  <span className="mono">
                                    {event.awayScore}-{event.homeScore}
                                  </span>
                                </div>
                                <p>{event.description}</p>
                                <div className="story-log-tags">
                                  <span>{event.battingTeam}</span>
                                  <span>
                                    {event.batterName} vs {event.pitcherName}
                                  </span>
                                  <span>{event.outs} outs</span>
                                  <span>{event.baseState || 'Empty'}</span>
                                  {event.runDelta > 0 ? <span>+{event.runDelta} run</span> : null}
                                  {event.isScoringPlay ? <span>Scoring play</span> : null}
                                </div>
                              </article>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                ) : activeStoryGameSummary ? (
                  <p className="react-section-copy">Loading selected game log...</p>
                ) : (
                  <p className="react-section-copy">No game story is available on this day.</p>
                )}
              </section>

              <section className="action-section story-section-span">
                <div className="action-section-header">
                  <h3>Game stories</h3>
                  <span>{activeStoryDay.games.length}</span>
                </div>
                <div className="story-game-grid">
                  {activeStoryDay.games.map((game) => (
                    <article key={`${activeStoryDay.id}-${game.gamePk}`} className={`story-game-card ${activeStoryGameSummary?.gamePk === game.gamePk ? 'active' : ''}`}>
                      <div className="story-game-head">
                        <div>
                          <strong>{game.title}</strong>
                          <p className="react-section-copy">
                            {game.winnerTeam} over {game.loserTeam}
                          </p>
                        </div>
                        <span className="history-status-pill graded">
                          {game.totalRunsFinal} runs
                        </span>
                      </div>
                      <div className="history-chip-row">
                        <button
                          type="button"
                          className={`history-chip ${activeStoryGameSummary?.gamePk === game.gamePk ? 'active' : ''}`}
                          onClick={() => setSelectedStoryGamePk(game.gamePk)}
                        >
                          Load game log
                        </button>
                      </div>
                      <div className="story-summary-grid">
                        <div>
                          <span className="parlay-stat-label">Lead after 5</span>
                          <strong>{game.leadAfter5Team || 'Tied / none'}</strong>
                        </div>
                        <div>
                          <span className="parlay-stat-label">First scoring inning</span>
                          <strong>{game.firstScoringInning || 'No scoring'}</strong>
                        </div>
                        <div>
                          <span className="parlay-stat-label">Lead changes</span>
                          <strong>{game.leadChanges}</strong>
                        </div>
                        <div>
                          <span className="parlay-stat-label">Max comeback</span>
                          <strong>{game.maxComebackRuns}</strong>
                        </div>
                        <div>
                          <span className="parlay-stat-label">Runs first 5</span>
                          <strong>{game.totalRunsFirst5}</strong>
                        </div>
                        <div>
                          <span className="parlay-stat-label">HR starter / relief</span>
                          <strong>
                            {game.hrOffStarters} / {game.hrOffRelievers}
                          </strong>
                        </div>
                      </div>
                      {game.tags?.length ? (
                        <div className="history-chip-row">
                          {game.tags.map((tag: string) => (
                            <span key={`${game.gamePk}-${tag}`} className="history-chip">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="react-section-copy">
                        {game.summary?.headline || 'Story summary unavailable'}.
                        {game.summary?.firstInningRuns !== undefined ? ` First inning runs: ${game.summary.firstInningRuns}.` : ''}
                        {game.summary?.awayRunsFirst5 !== undefined && game.summary?.homeRunsFirst5 !== undefined
                          ? ` First 5 split: ${game.title.split(' @ ')[0]} ${game.summary.awayRunsFirst5}, ${game.title.split(' @ ')[1]} ${game.summary.homeRunsFirst5}.`
                          : ''}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : (
          <p className="react-section-copy">No story day is available yet.</p>
        )}
      </section>
    </div>
  )
}

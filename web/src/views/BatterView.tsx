import { useMemo, useState } from 'react'

type AnyRecord = Record<string, any>

type BatterViewProps = {
  activeDayId: string
  batterRows: AnyRecord[]
  formatNumber: (value: any, digits?: number) => string
  openGame: (gameId: string) => void
  slateMeta: AnyRecord
  totalMlbGames: number
}

type SortKey =
  | 'hrLikelyScore'
  | 'hotHitterScore'
  | 'seasonOps'
  | 'recentOps'
  | 'splitOps'
  | 'rolling7Xwoba'
  | 'rolling30Xwoba'
  | 'recentXops'
  | 'recentAvgExitVelocity'
  | 'recentAvgLaunchAngle'
  | 'effectiveBarrelPct'
  | 'weightedOps'
  | 'underTargetScore'
  | 'pitchFitScore'
  | 'matchupScore'
  | 'formScore'
  | 'powerScore'
  | 'slot'
  | 'teamName'
  | 'playerName'

type SortDirection = 'asc' | 'desc'
type BatterFilter = 'all' | 'hrLikely' | 'hotHitters'

const sortOptions: Array<{ key: SortKey; label: string; defaultDirection: SortDirection }> = [
  { key: 'hrLikelyScore', label: 'HR likely', defaultDirection: 'desc' },
  { key: 'hotHitterScore', label: 'Hot hitters', defaultDirection: 'desc' },
  { key: 'seasonOps', label: 'OPS', defaultDirection: 'desc' },
  { key: 'recentOps', label: 'Recent OPS', defaultDirection: 'desc' },
  { key: 'weightedOps', label: 'Weighted OPS', defaultDirection: 'desc' },
  { key: 'rolling7Xwoba', label: 'xwOBA 7g', defaultDirection: 'desc' },
  { key: 'rolling30Xwoba', label: 'xwOBA 30d', defaultDirection: 'desc' },
  { key: 'recentXops', label: 'xOPS', defaultDirection: 'desc' },
  { key: 'effectiveBarrelPct', label: 'Barrel', defaultDirection: 'desc' },
  { key: 'recentAvgExitVelocity', label: 'EV', defaultDirection: 'desc' },
  { key: 'recentAvgLaunchAngle', label: 'Launch', defaultDirection: 'asc' },
  { key: 'underTargetScore', label: 'Under target', defaultDirection: 'desc' },
  { key: 'pitchFitScore', label: 'Pitch fit', defaultDirection: 'asc' },
  { key: 'matchupScore', label: 'Matchup', defaultDirection: 'desc' },
  { key: 'formScore', label: 'Form', defaultDirection: 'desc' },
  { key: 'powerScore', label: 'Power', defaultDirection: 'desc' },
  { key: 'slot', label: 'Slot', defaultDirection: 'asc' },
  { key: 'teamName', label: 'Team', defaultDirection: 'asc' },
  { key: 'playerName', label: 'Name', defaultDirection: 'asc' }
]

const filterOptions: Array<{ key: BatterFilter; label: string; sortKey: SortKey; description: string }> = [
  { key: 'all', label: 'All', sortKey: 'seasonOps', description: 'Full lineup board' },
  { key: 'hrLikely', label: 'HR likely', sortKey: 'hrLikelyScore', description: 'xwOBA + barrel + EV' },
  { key: 'hotHitters', label: 'Hot hitters', sortKey: 'hotHitterScore', description: 'xwOBA + xOPS + launch' }
]

const optionForSort = (key: SortKey) => sortOptions.find((option) => option.key === key) ?? sortOptions[0]

const numericValue = (value: unknown) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

const formatOps = (value: unknown) => {
  const numberValue = numericValue(value)
  if (numberValue == null) return 'N/A'
  return numberValue.toFixed(3).replace(/^0/, '.')
}

const formatXwoba = (value: unknown) => {
  const numberValue = numericValue(value)
  if (numberValue == null) return 'N/A'
  return numberValue.toFixed(3).replace(/^0/, '.')
}

const formatXwobaTrend = (value: unknown) => {
  const numberValue = numericValue(value)
  if (numberValue == null) return ''
  return `${numberValue >= 0 ? '+' : ''}${numberValue.toFixed(3).replace(/^(-?)0/, '$1.')}`
}

const formatPercent = (value: unknown, digits = 1) => {
  const numberValue = numericValue(value)
  if (numberValue == null) return 'N/A'
  return `${numberValue.toFixed(digits)}%`
}

const formatMph = (value: unknown) => {
  const numberValue = numericValue(value)
  if (numberValue == null) return 'EV N/A'
  return `${numberValue.toFixed(1)} mph`
}

const formatLaunch = (value: unknown) => {
  const numberValue = numericValue(value)
  if (numberValue == null) return 'LA N/A'
  return `${numberValue.toFixed(1)} deg`
}

const xwobaTone = (value: unknown) => {
  const numberValue = numericValue(value)
  if (numberValue == null) return 'empty'
  if (numberValue >= 0.37) return 'strong'
  if (numberValue >= 0.32) return 'watch'
  return 'cold'
}

const renderXwobaBubble = (row: AnyRecord) => {
  const trendLabel = formatXwobaTrend(row.xwobaTrend)
  return (
    <div
      className={`xwoba-bubble ${xwobaTone(row.rolling7Xwoba)}`}
      title={`7-game xwOBA ${formatXwoba(row.rolling7Xwoba)} | 30-day xwOBA ${formatXwoba(row.rolling30Xwoba)}${trendLabel ? ` | trend ${trendLabel}` : ''}`}
    >
      <strong>7g {formatXwoba(row.rolling7Xwoba)}</strong>
      <small>30d {formatXwoba(row.rolling30Xwoba)}{trendLabel ? ` · ${trendLabel}` : ''}</small>
    </div>
  )
}

const formatScore = (value: unknown, digits = 0) => {
  const numberValue = numericValue(value)
  if (numberValue == null) return 'N/A'
  return numberValue.toFixed(digits)
}

const compareRows = (left: AnyRecord, right: AnyRecord, sortKey: SortKey, direction: SortDirection) => {
  const leftValue = left[sortKey]
  const rightValue = right[sortKey]
  const leftNumber = numericValue(leftValue)
  const rightNumber = numericValue(rightValue)
  const multiplier = direction === 'asc' ? 1 : -1

  if (leftNumber != null || rightNumber != null) {
    if (leftNumber == null) return 1
    if (rightNumber == null) return -1
    if (leftNumber !== rightNumber) return (leftNumber - rightNumber) * multiplier
  } else {
    const leftText = String(leftValue ?? '')
    const rightText = String(rightValue ?? '')
    const textCompare = leftText.localeCompare(rightText)
    if (textCompare) return textCompare * multiplier
  }

  return (
    String(left.teamName || '').localeCompare(String(right.teamName || '')) ||
    Number(left.slot ?? 99) - Number(right.slot ?? 99) ||
    String(left.playerName || '').localeCompare(String(right.playerName || ''))
  )
}

const isHrLikely = (row: AnyRecord) => {
  const xwoba = numericValue(row.rolling7Xwoba)
  const barrelPct = numericValue(row.effectiveBarrelPct)
  const exitVelocity = numericValue(row.recentAvgExitVelocity)
  const hardHitPct = numericValue(row.effectiveHardHitPct)
  const score = numericValue(row.hrLikelyScore)
  const bbeSample = numericValue(row.recentBbeSample)
  const hasGoodContact = (exitVelocity != null && exitVelocity >= 89) || (hardHitPct != null && hardHitPct >= 40)

  return (
    bbeSample != null &&
    bbeSample >= 10 &&
    xwoba != null &&
    xwoba >= 0.3 &&
    barrelPct != null &&
    barrelPct >= 6 &&
    hasGoodContact &&
    score != null &&
    score >= 45
  )
}

const isHotHitter = (row: AnyRecord) => {
  const xwoba = numericValue(row.rolling7Xwoba)
  const xops = numericValue(row.recentXops)
  const bbeSample = numericValue(row.recentBbeSample)
  return (
    bbeSample != null &&
    bbeSample >= 10 &&
    xwoba != null &&
    xwoba >= 0.3 &&
    xops != null &&
    xops >= 0.725 &&
    row.hasOptimalLaunchAngle === true
  )
}

const renderFeatureCard = (
  row: AnyRecord,
  mode: 'hr' | 'hot',
  openGame: (gameId: string) => void
) => (
  <button key={`${mode}-${row.id}`} type="button" className="batter-feature-card" onClick={() => openGame(row.gameId)}>
    <span className="batter-feature-card-top">
      <strong>{row.playerName}</strong>
      <small>{row.teamName} · slot {row.slot ?? 'N/A'} · vs {row.opposingStarterName}</small>
    </span>
    <span className="batter-feature-metrics">
      <span>
        <strong>{mode === 'hr' ? formatScore(row.hrLikelyScore, 1) : formatScore(row.hotHitterScore, 1)}</strong>
        <small>{mode === 'hr' ? 'score' : 'heat'}</small>
      </span>
      <span>
        <strong>{formatXwoba(row.rolling7Xwoba)}</strong>
        <small>xwOBA</small>
      </span>
      <span>
        <strong>{mode === 'hr' ? formatPercent(row.effectiveBarrelPct) : formatOps(row.recentXops)}</strong>
        <small>{mode === 'hr' ? 'barrel' : 'xOPS'}</small>
      </span>
      <span>
        <strong>{mode === 'hr' ? formatMph(row.recentAvgExitVelocity) : formatLaunch(row.recentAvgLaunchAngle)}</strong>
        <small>{mode === 'hr' ? 'EV' : 'launch'}</small>
      </span>
    </span>
    <small className="batter-feature-note">
      {mode === 'hr' ? [row.pitcherHrNote, row.hrMatchupNote].filter(Boolean).join(' | ') : row.hotHitterReason}
    </small>
  </button>
)

export function BatterView({ activeDayId, batterRows, formatNumber, openGame, slateMeta, totalMlbGames }: BatterViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('seasonOps')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [batterFilter, setBatterFilter] = useState<BatterFilter>('all')
  const [query, setQuery] = useState('')

  const loadedGameIds = useMemo(() => new Set(batterRows.map((row) => row.gameId)).size, [batterRows])
  const postedRows = batterRows.filter((row) => row.lineupStatus === 'posted').length
  const normalizedQuery = query.trim().toLowerCase()

  const searchedRows = useMemo(() => {
    if (!normalizedQuery) return batterRows
    return batterRows.filter((row) =>
      [
        row.playerName,
        row.teamName,
        row.opponentName,
        row.gameTitle,
        row.position,
        row.bats,
        row.opposingStarterName,
        row.primaryTag,
        row.hrMatchupNote,
        row.pitcherHrNote,
        row.bbeSampleNote,
        row.hrLikelyReason,
        row.hotHitterReason
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    )
  }, [batterRows, normalizedQuery])

  const hrLikelyCandidates = useMemo(
    () => [...searchedRows].filter(isHrLikely).sort((left, right) => compareRows(left, right, 'hrLikelyScore', 'desc')),
    [searchedRows]
  )

  const hotHitterCandidates = useMemo(
    () => [...searchedRows].filter(isHotHitter).sort((left, right) => compareRows(left, right, 'recentXops', 'desc')),
    [searchedRows]
  )

  const filteredRows = useMemo(() => {
    if (batterFilter === 'hrLikely') return hrLikelyCandidates
    if (batterFilter === 'hotHitters') return hotHitterCandidates
    return searchedRows
  }, [batterFilter, hotHitterCandidates, hrLikelyCandidates, searchedRows])

  const sortedRows = useMemo(
    () => [...filteredRows].sort((left, right) => compareRows(left, right, sortKey, sortDirection)),
    [filteredRows, sortDirection, sortKey]
  )

  const underTargets = useMemo(
    () =>
      [...searchedRows]
        .filter((row) => numericValue(row.underTargetScore) != null)
        .sort((left, right) => compareRows(left, right, 'underTargetScore', 'desc'))
        .slice(0, 5),
    [searchedRows]
  )

  const setSort = (nextKey: SortKey) => {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextKey)
    setSortDirection(optionForSort(nextKey).defaultDirection)
  }

  const setFilter = (nextFilter: BatterFilter) => {
    setBatterFilter(nextFilter)
    const nextOption = filterOptions.find((option) => option.key === nextFilter)
    if (nextOption && nextOption.sortKey !== sortKey) {
      setSortKey(nextOption.sortKey)
      setSortDirection(optionForSort(nextOption.sortKey).defaultDirection)
    }
  }

  const sortLabel = `${optionForSort(sortKey).label} ${sortDirection === 'asc' ? 'low to high' : 'high to low'}`
  const activeFilterLabel = filterOptions.find((option) => option.key === batterFilter)?.label ?? 'All'

  return (
    <main className="batter-page workspace-panel">
      <section className="batter-hero">
        <div>
          <span className="eyebrow">Batter Board</span>
          <h1>{slateMeta?.date || activeDayId}</h1>
          <p>
            Every MLB lineup batter from the selected slate. Sort by OPS for the best bats, or use Under target to
            find low-OPS hitters with weak pitch-fit and matchup shape.
          </p>
        </div>
        <div className="batter-summary-grid">
          <article>
            <span>Batters</span>
            <strong>{batterRows.length}</strong>
            <small>{postedRows}/{batterRows.length || 0} posted-order rows</small>
          </article>
          <article>
            <span>Loaded Games</span>
            <strong>{loadedGameIds}/{totalMlbGames}</strong>
            <small>{loadedGameIds < totalMlbGames ? 'Loading detail files' : 'Detail coverage loaded'}</small>
          </article>
          <article>
            <span>Sort</span>
            <strong>{optionForSort(sortKey).label}</strong>
            <small>{sortLabel}</small>
          </article>
        </div>
      </section>

      <section className="batter-controls" aria-label="Batter board controls">
        <label className="batter-search">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Player, team, starter, position..."
          />
        </label>
        <div className="batter-sort-chips" role="group" aria-label="Sort batters">
          {sortOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`batter-sort-chip ${sortKey === option.key ? 'active' : ''}`}
              onClick={() => setSort(option.key)}
            >
              {option.label}
              {sortKey === option.key ? <small>{sortDirection === 'asc' ? 'Asc' : 'Desc'}</small> : null}
            </button>
          ))}
        </div>
        <div className="batter-filter-chips" role="group" aria-label="Filter batter board">
          {filterOptions.map((option) => {
            const count =
              option.key === 'hrLikely'
                ? hrLikelyCandidates.length
                : option.key === 'hotHitters'
                  ? hotHitterCandidates.length
                  : searchedRows.length
            return (
              <button
                key={option.key}
                type="button"
                className={`batter-filter-chip ${batterFilter === option.key ? 'active' : ''}`}
                onClick={() => setFilter(option.key)}
              >
                <strong>{option.label}</strong>
                <small>{count} · {option.description}</small>
              </button>
            )
          })}
        </div>
      </section>

      <section className="batter-feature-strip" aria-label="Featured batter filters">
        <article className="batter-feature-lane">
          <div className="batter-section-title">
            <span>HR Likely</span>
            <small>Good xwOBA, barrel, EV, and matchup note</small>
          </div>
          <div className="batter-feature-grid">
            {hrLikelyCandidates.slice(0, 6).length ? (
              hrLikelyCandidates.slice(0, 6).map((row) => renderFeatureCard(row, 'hr', openGame))
            ) : (
              <p className="batter-empty">No HR-likely bats cleared the Statcast thresholds yet.</p>
            )}
          </div>
        </article>
        <article className="batter-feature-lane">
          <div className="batter-section-title">
            <span>Hot Hitters</span>
            <small>Recent xwOBA over .300, xOPS over .725, optimal launch</small>
          </div>
          <div className="batter-feature-grid">
            {hotHitterCandidates.slice(0, 6).length ? (
              hotHitterCandidates.slice(0, 6).map((row) => renderFeatureCard(row, 'hot', openGame))
            ) : (
              <p className="batter-empty">No hot-hitter bats cleared the xOPS and launch filters yet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="batter-under-strip" aria-label="Worst projected under targets">
        <div className="batter-section-title">
          <span>Under Targets</span>
          <small>Low OPS plus weak pitch-fit / matchup score</small>
        </div>
        <div className="batter-under-grid">
          {underTargets.length ? (
            underTargets.map((row) => (
              <button key={`under-${row.id}`} type="button" className="batter-under-card" onClick={() => openGame(row.gameId)}>
                <span>
                  <strong>{row.playerName}</strong>
                  <small>{row.teamName} · slot {row.slot ?? 'N/A'} · vs {row.opposingStarterName}</small>
                </span>
                <span>
                  <strong>{formatNumber(row.underTargetScore, 1)}</strong>
                  <small>{row.underTargetReason}</small>
                </span>
              </button>
            ))
          ) : (
            <p className="batter-empty">No batter rows loaded yet. The app is pulling MLB game details for this slate.</p>
          )}
        </div>
      </section>

      <section className="batter-table-panel">
        <div className="batter-section-title">
          <span>All Batters</span>
          <small>{sortedRows.length} visible · {activeFilterLabel} · {sortLabel}</small>
        </div>
        <div className="batter-table-scroll">
          <table className="batter-table">
            <thead>
              <tr>
                <th>
                  <button type="button" onClick={() => setSort('playerName')}>Batter</button>
                </th>
                <th>
                  <button type="button" onClick={() => setSort('teamName')}>Team</button>
                </th>
                <th>
                  <button type="button" onClick={() => setSort('slot')}>Slot</button>
                </th>
                <th>
                  <button type="button" onClick={() => setSort('seasonOps')}>OPS</button>
                </th>
                <th>
                  <button type="button" onClick={() => setSort('recentOps')}>Recent</button>
                </th>
                <th>
                  <button type="button" onClick={() => setSort('splitOps')}>Split</button>
                </th>
                <th>
                  <button type="button" onClick={() => setSort('rolling7Xwoba')}>xwOBA</button>
                </th>
                <th>
                  <button type="button" onClick={() => setSort('hrLikelyScore')}>HR</button>
                </th>
                <th>
                  <button type="button" onClick={() => setSort('recentXops')}>xOPS / LA</button>
                </th>
                <th>
                  <button type="button" onClick={() => setSort('effectiveBarrelPct')}>Barrel / EV</button>
                </th>
                <th>
                  <button type="button" onClick={() => setSort('pitchFitScore')}>Pitch Fit</button>
                </th>
                <th>
                  <button type="button" onClick={() => setSort('matchupScore')}>Matchup</button>
                </th>
                <th>
                  <button type="button" onClick={() => setSort('formScore')}>Form</button>
                </th>
                <th>
                  <button type="button" onClick={() => setSort('underTargetScore')}>Under</button>
                </th>
                <th>Game</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="batter-name-cell">
                      <strong>{row.playerName}</strong>
                      <small>{[row.position, row.bats ? `${row.bats} bat` : null, row.primaryTag].filter(Boolean).join(' · ')}</small>
                    </div>
                  </td>
                  <td>
                    <strong>{row.teamName}</strong>
                    <small>vs {row.opponentName}</small>
                  </td>
                  <td>{row.slot ?? 'N/A'}</td>
                  <td>{formatOps(row.seasonOps)}</td>
                  <td>{formatOps(row.recentOps)}</td>
                  <td>{formatOps(row.splitOps)}</td>
                  <td>{renderXwobaBubble(row)}</td>
                  <td>
                    <div className="batter-signal-cell">
                      <strong>{formatScore(row.hrLikelyScore, 1)}</strong>
                      <small>{row.pitcherHrNote || 'Pitcher HR/9 N/A'}</small>
                      <small>{row.hrMatchupNote || 'HR context N/A'}</small>
                    </div>
                  </td>
                  <td>
                    <div className="batter-signal-cell">
                      <strong>{formatOps(row.recentXops)}</strong>
                      <small>{formatLaunch(row.recentAvgLaunchAngle)} · {row.hasOptimalLaunchAngle ? 'optimal' : 'not optimal'}</small>
                    </div>
                  </td>
                  <td>
                    <div className="batter-signal-cell">
                      <strong>{formatPercent(row.effectiveBarrelPct)}</strong>
                      <small>{formatMph(row.recentAvgExitVelocity)} · {formatScore(row.recentBbeSample)} BBE</small>
                    </div>
                  </td>
                  <td>
                    <strong>{formatScore(row.pitchFitScore)}</strong>
                    <small>{row.pitchFitGrade != null ? `${formatNumber(row.pitchFitGrade, 1)} grade` : 'grade N/A'}</small>
                  </td>
                  <td>{formatScore(row.matchupScore)}</td>
                  <td>{formatScore(row.formScore)}</td>
                  <td>
                    <strong>{formatNumber(row.underTargetScore, 1)}</strong>
                    <small>{row.weightedOps != null ? `wOPS ${formatOps(row.weightedOps)}` : 'wOPS N/A'}</small>
                  </td>
                  <td>
                    <button type="button" className="batter-open-game" onClick={() => openGame(row.gameId)}>
                      {row.gameTitle}
                      <small>{row.start} · vs {row.opposingStarterName}</small>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

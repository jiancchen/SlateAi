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
  | 'seasonOps'
  | 'recentOps'
  | 'splitOps'
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

const sortOptions: Array<{ key: SortKey; label: string; defaultDirection: SortDirection }> = [
  { key: 'seasonOps', label: 'OPS', defaultDirection: 'desc' },
  { key: 'recentOps', label: 'Recent OPS', defaultDirection: 'desc' },
  { key: 'weightedOps', label: 'Weighted OPS', defaultDirection: 'desc' },
  { key: 'underTargetScore', label: 'Under target', defaultDirection: 'desc' },
  { key: 'pitchFitScore', label: 'Pitch fit', defaultDirection: 'asc' },
  { key: 'matchupScore', label: 'Matchup', defaultDirection: 'desc' },
  { key: 'formScore', label: 'Form', defaultDirection: 'desc' },
  { key: 'powerScore', label: 'Power', defaultDirection: 'desc' },
  { key: 'slot', label: 'Slot', defaultDirection: 'asc' },
  { key: 'teamName', label: 'Team', defaultDirection: 'asc' },
  { key: 'playerName', label: 'Name', defaultDirection: 'asc' }
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

export function BatterView({ activeDayId, batterRows, formatNumber, openGame, slateMeta, totalMlbGames }: BatterViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('seasonOps')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [query, setQuery] = useState('')

  const loadedGameIds = useMemo(() => new Set(batterRows.map((row) => row.gameId)).size, [batterRows])
  const postedRows = batterRows.filter((row) => row.lineupStatus === 'posted').length
  const normalizedQuery = query.trim().toLowerCase()

  const filteredRows = useMemo(() => {
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
        row.primaryTag
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    )
  }, [batterRows, normalizedQuery])

  const sortedRows = useMemo(
    () => [...filteredRows].sort((left, right) => compareRows(left, right, sortKey, sortDirection)),
    [filteredRows, sortDirection, sortKey]
  )

  const underTargets = useMemo(
    () =>
      [...filteredRows]
        .filter((row) => numericValue(row.underTargetScore) != null)
        .sort((left, right) => compareRows(left, right, 'underTargetScore', 'desc'))
        .slice(0, 5),
    [filteredRows]
  )

  const setSort = (nextKey: SortKey) => {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextKey)
    setSortDirection(optionForSort(nextKey).defaultDirection)
  }

  const sortLabel = `${optionForSort(sortKey).label} ${sortDirection === 'asc' ? 'low to high' : 'high to low'}`

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
          <small>{sortedRows.length} visible · {sortLabel}</small>
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

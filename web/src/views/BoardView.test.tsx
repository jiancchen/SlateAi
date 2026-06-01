import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { BoardView } from './BoardView'

afterEach(() => {
  cleanup()
})

const noop = () => {}

function createBaseProps() {
  return {
    activeDayId: '2026-05-30',
    activeDayIsoDate: '2026-05-30',
    activeFilter: 'Value',
    activeValueScope: 'all',
    addAnalystPick: noop,
    availableValueScopes: [{ id: 'all', label: 'All' }],
    buildGameHighlights: () => [],
    filterOptions: ['All', 'Value'],
    formatNumber: (value: any, digits = 1) => Number(value).toFixed(digits),
    formatPercent: (value: any, digits = 1) => `${Number(value).toFixed(digits)}%`,
    formatSignedNumber: (value: any, digits = 1) => {
      const numeric = Number(value)
      return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(digits)}`
    },
    formatSnapshotTime: () => '2:00 PM PT',
    formatTennisValueSelection: (row: any) => row.selection || row.title || 'Selection',
    games: [],
    getCompetitorDisplayName: (_game: any, competitor: any, index: number) => competitor?.name || `Team ${index + 1}`,
    getGameDisplayTitle: (game: any) => game?.title || 'Game',
    getGameResultLine: () => 'Final',
    globalSearchResults: [],
    isActiveDayLoading: false,
    isGlobalSearchLoading: false,
    isSelectedGameDetailLoading: false,
    isWinningCompetitor: () => false,
    labelForScore: (score: number) => (score >= 70 ? 'High' : 'Watch'),
    latestLineupSnapshot: null,
    lineupStatusCounts: { posted: 0, partial: 0, total: 0 },
    loadedGameDetailsByDay: {},
    marketSearch: '',
    mlbFirstInningValueSummary: null,
    mlbDetailProps: {},
    mlbScalpSummary: null,
    mlbValueSummary: null,
    openGlobalSearchResult: noop,
    renderLeagueBadge: (league: string) => league,
    renderMoneylinePanel: () => null,
    selectedGame: null,
    selectedGameId: null,
    selectedPicks: {},
    setActiveDeskTab: noop,
    setActiveFilter: noop,
    setActiveValueScopeByDay: vi.fn(),
    setSelectedGameIdByDay: vi.fn(),
    shouldShowValueScope: () => true,
    slateMeta: { date: 'May 30, 2026' },
    swingTextFor: () => '',
    tennisDetailProps: {},
    tennisValueSummary: null,
    visibleGames: []
  }
}

describe('BoardView MLB value center', () => {
  it('keeps the separate first-inning value board when first-inning data exists', () => {
    const props = createBaseProps()
    render(
      <BoardView
        {...props}
        activeValueScope="mlb-first-inning"
        availableValueScopes={[
          { id: 'all', label: 'All' },
          { id: 'mlb-first-inning', label: '1st inning' }
        ]}
        mlbValueSummary={{
          totalGames: 15,
          fullyPostedGames: 8,
          partialGames: 7,
          mappedKalshiGames: 0,
          sideRows: [],
          totalRows: [],
          totalBaseRows: [],
          tbBackedRows: [],
          tbSoftHeatRows: [],
          strikeoutRows: [],
          strikeoutOverRows: [],
          strikeoutUnderRows: [],
          battingImpactRows: [],
          hitRunRbiRows: [],
          battingProductionRows: [],
          displayHitRunRbiRows: [],
          battingImpactFallbackRows: [],
          homeRunRows: [],
          premiumHomeRunRows: [],
          strongHomeRunRows: [],
          viableHomeRunRows: [],
          postedHomeRunRows: [],
          topRows: [],
          note: 'Overview note'
        }}
        mlbFirstInningValueSummary={{
          totalGames: 15,
          modeledGames: 10,
          mappedGames: 0,
          note: 'First-inning board is model-first.',
          yrfiRows: [
            {
              gameId: 'game-1',
              title: 'Padres @ Nationals',
              summary: 'YRFI live',
              confidence: 82,
              yesModel: 56.1,
              yesAsk: null,
              awayRunPct: 31.2,
              homeRunPct: 35.5,
              hasKalshi: false
            }
          ],
          nrfiRows: [
            {
              gameId: 'game-2',
              title: 'Marlins @ Mets',
              summary: 'NRFI live',
              confidence: 79,
              noModel: 58.4,
              noAsk: null,
              awayRunPct: 22.4,
              homeRunPct: 19.1,
              hasKalshi: false
            }
          ]
        }}
      />
    )

    expect(screen.getByText('MLB 1st-inning model lanes')).toBeTruthy()
    expect(screen.getByText('YRFI lanes')).toBeTruthy()
    expect(screen.getByText('NRFI lanes')).toBeTruthy()
    expect(screen.getByText('Padres @ Nationals')).toBeTruthy()
    expect(screen.getByText('Marlins @ Mets')).toBeTruthy()
  })

  it('caps the overview board at unique-game min(10, slate size)', () => {
    const props = createBaseProps()
    const sideRows = Array.from({ length: 6 }, (_, index) => ({
      id: `side-${index + 1}`,
      gameId: `game-${index + 1}`,
      title: `Side ${index + 1}`,
      subtitle: 'Full game',
      priceLabel: 'Proj 1.0 vs 0.0',
      confidence: 90 - index,
      sortEdge: 20 - index,
      tags: ['Side']
    }))
    const totalRows = Array.from({ length: 7 }, (_, index) => ({
      id: `total-${index + 1}`,
      gameId: `game-${Math.min(index + 1, 6)}`,
      title: `Total ${index + 1}`,
      subtitle: 'Full game',
      priceLabel: 'Proj 8.0 vs 7.5',
      confidence: 89 - index,
      sortEdge: 19 - index,
      tags: ['Total']
    }))

    render(
      <BoardView
        {...props}
        activeValueScope="mlb-overview"
        availableValueScopes={[{ id: 'mlb-overview', label: 'Overview' }]}
        mlbValueSummary={{
          totalGames: 6,
          fullyPostedGames: 3,
          partialGames: 3,
          mappedKalshiGames: 0,
          sideRows,
          totalRows,
          totalBaseRows: [],
          tbBackedRows: [],
          tbSoftHeatRows: [],
          strikeoutRows: [],
          strikeoutOverRows: [],
          strikeoutUnderRows: [],
          battingImpactRows: [],
          hitRunRbiRows: [],
          battingProductionRows: [],
          displayHitRunRbiRows: [],
          battingImpactFallbackRows: [],
          homeRunRows: [],
          premiumHomeRunRows: [],
          strongHomeRunRows: [],
          viableHomeRunRows: [],
          postedHomeRunRows: [],
          topRows: [],
          note: 'Overview note'
        }}
      />
    )

    const heading = screen.getByRole('heading', { name: '2026-05-30 board map' })
    const section = heading.closest('section')
    expect(section).toBeTruthy()
    const rows = within(section as HTMLElement).getAllByRole('button')
    expect(rows).toHaveLength(6)
    expect(within(section as HTMLElement).getByRole('button', { name: /Side 1/i })).toBeTruthy()
    expect(within(section as HTMLElement).getByRole('button', { name: /Side 6/i })).toBeTruthy()
  })

  it('keeps first-five O/U rows research-only when the value gate is not validated', () => {
    const props = createBaseProps()

    render(
      <BoardView
        {...props}
        activeValueScope="mlb-first5"
        availableValueScopes={[{ id: 'mlb-first5', label: '1st 5' }]}
        mlbValueSummary={{
          totalGames: 8,
          fullyPostedGames: 8,
          partialGames: 0,
          mappedKalshiGames: 8,
          sideRows: [],
          totalRows: [],
          first5MoneylineRows: [],
          first5TotalRows: [],
          first5TotalResearchRows: [
            {
              id: 'f5-total-research-1',
              gameId: 'game-1',
              title: 'Under 3.5 F5',
              subtitle: 'Marlins @ Mets',
              metaLabel: 'Model 73.6% | proj 2.6',
              priceLabel: 'Kalshi ask 50c',
              confidence: 74,
              evCents: 23.6,
              raw: {
                gateReasons: ['F5 O/U value lane disabled after May 31 failed calibration', 'chaos gate warning present']
              }
            }
          ],
          first5TotalGateNote: 'F5 O/U is research-only after the May 31 value-board failure.',
          totalBaseRows: [],
          tbBackedRows: [],
          tbSoftHeatRows: [],
          strikeoutRows: [],
          strikeoutOverRows: [],
          strikeoutUnderRows: [],
          battingImpactRows: [],
          hitRunRbiRows: [],
          battingProductionRows: [],
          displayHitRunRbiRows: [],
          battingImpactFallbackRows: [],
          homeRunRows: [],
          premiumHomeRunRows: [],
          strongHomeRunRows: [],
          viableHomeRunRows: [],
          postedHomeRunRows: [],
          topRows: [],
          note: 'Overview note'
        }}
      />
    )

    expect(screen.getByText('0 value rows')).toBeTruthy()
    expect(screen.getByText('F5 O/U research 1')).toBeTruthy()
    expect(screen.getByText('1st 5 O/U research only')).toBeTruthy()
    expect(screen.getByText('Research')).toBeTruthy()
    expect(screen.getByText(/May 31 value-board failure/i)).toBeTruthy()
    expect(screen.queryByText('+23.6c')).toBe(null)
  })
})

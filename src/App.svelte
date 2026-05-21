<script>
  import {
    buildParlayModel,
    createParlayLeg,
    rankMlbPlayerProps,
    rankAnalysisPicks,
    rankFlipRiskPicks,
    simulateMlbGame
  } from './lib/sports-model'
  import { defaultSlateDayId, slateDays } from './lib/slate-days'

  const PARLAY_MIN_LEGS = 2
  const PARLAY_MAX_LEGS = 10
  const leagueOrder = ['MLB', 'Tennis', 'UFC', 'NBA', 'WNBA']
  const deskTabs = [
    { id: 'board', label: 'Board' },
    { id: 'parlay', label: 'Parlay builder' },
    { id: 'tickets', label: 'Tickets' },
    { id: 'models', label: 'Models' },
    { id: 'history', label: 'History' }
  ]
  const sidebarTabs = [
    { id: 'ticket', label: 'Ticket' },
    { id: 'props', label: 'Props' },
    { id: 'signals', label: 'Signals' },
    { id: 'sources', label: 'Sources' },
    { id: 'notes', label: 'Notes' }
  ]
  const propTypeFilters = [
    { id: 'all', label: 'All' },
    { id: 'homeRun', label: 'HR' },
    { id: 'rbi', label: 'RBI' },
    { id: 'totalBases', label: 'TB' },
    { id: 'hits', label: 'Hits' },
    { id: 'walks', label: 'Walks' },
    { id: 'singles', label: 'Singles' }
  ]
  const recommendationModes = [
    {
      id: 'favorites',
      label: 'Favorites',
      copy: 'Cleaner core reads only. On messy slates this lane stays intentionally short.'
    },
    {
      id: 'balanced',
      label: 'Balanced',
      copy: 'Blends core legs with a measured amount of live upset exposure.'
    },
    {
      id: 'flips',
      label: 'Flips',
      copy: 'Higher-variance dogs and fragile-favorite fade spots.'
    }
  ]
  const mlbLogoBase = 'https://raw.githubusercontent.com/MLBAMGames/mlb_teams_logo_svg/main/light'
  const mlbTeamLogoCode = {
    'D-backs': 'ari',
    Diamondbacks: 'ari',
    Braves: 'atl',
    Orioles: 'bal',
    'Red Sox': 'bos',
    Cubs: 'chc',
    Reds: 'cin',
    Guardians: 'cle',
    Rockies: 'col',
    'White Sox': 'cws',
    Tigers: 'det',
    Astros: 'hou',
    Royals: 'kc',
    Angels: 'laa',
    Dodgers: 'lad',
    Marlins: 'mia',
    Brewers: 'mil',
    Twins: 'min',
    Mets: 'nym',
    Yankees: 'nyy',
    Athletics: 'oak',
    Phillies: 'phi',
    Pirates: 'pit',
    Padres: 'sd',
    Mariners: 'sea',
    Giants: 'sf',
    Cardinals: 'stl',
    Rays: 'tb',
    Rangers: 'tex',
    'Blue Jays': 'tor',
    Nationals: 'wsh'
  }
  const mlbTeamAccent = {
    'D-backs': '#a71930',
    Diamondbacks: '#a71930',
    Braves: '#ce1141',
    Orioles: '#df4601',
    'Red Sox': '#bd3039',
    Cubs: '#0e3386',
    Reds: '#c6011f',
    Guardians: '#e31937',
    Rockies: '#33006f',
    'White Sox': '#27251f',
    Tigers: '#0c2c56',
    Astros: '#eb6e1f',
    Royals: '#004687',
    Angels: '#ba0021',
    Dodgers: '#005a9c',
    Marlins: '#00a3e0',
    Brewers: '#ffc52f',
    Twins: '#002b5c',
    Mets: '#002d72',
    Yankees: '#0c2340',
    Athletics: '#003831',
    Phillies: '#e81828',
    Pirates: '#fdb827',
    Padres: '#2f241d',
    Mariners: '#005c5c',
    Giants: '#fd5a1e',
    Cardinals: '#c41e3a',
    Rays: '#092c5c',
    Rangers: '#003278',
    'Blue Jays': '#134a8e',
    Nationals: '#ab0003'
  }

  let activeDayId = defaultSlateDayId
  let activeDeskTab = 'board'
  let activeFilter = 'All'
  let activeSidebarTab = 'ticket'
  let marketSearch = ''
  let parlayStake = 25
  let recommendedLegCount = 4
  let recommendationMode = 'favorites'
  let balanceWeight = 0.5
  let simulationTemperature = 0.5
  let showDeskSettings = false
  let selectedPicksByDay = {}
  let expandedGameId = ''
  let pinnedSignalsByDay = {}
  let selectedPropsByDay = {}
  let customSourcesByDay = {}
  let deskNotesByDay = {}
  let simulatedGamesByDay = {}
  let activePropType = 'all'
  let customSourceLabel = ''
  let customSourceUrl = ''

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

  const formatOrdinal = (value) => {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return String(value || '')
    if (numericValue % 100 >= 11 && numericValue % 100 <= 13) return `${numericValue}th`
    if (numericValue % 10 === 1) return `${numericValue}st`
    if (numericValue % 10 === 2) return `${numericValue}nd`
    if (numericValue % 10 === 3) return `${numericValue}rd`
    return `${numericValue}th`
  }

  const formatNumber = (value, digits = 1) => {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return 'N/A'
    return numericValue.toFixed(digits)
  }

  const comparisonBarWidth = (value, ...comparisonValues) => {
    const numericValue = Number(value)
    const maxValue = Math.max(
      1,
      ...comparisonValues.map((entry) => {
        const numericEntry = Number(entry)
        return Number.isFinite(numericEntry) ? numericEntry : 0
      })
    )

    if (!Number.isFinite(numericValue) || maxValue <= 0) return '16%'

    return `${Math.max(16, Math.min(100, (numericValue / maxValue) * 100)).toFixed(1)}%`
  }

  const relieverStatusLabel = (reliever) => {
    if (!reliever) return 'Status unavailable'
    if (reliever.backToBack) return 'Back to back'
    if (reliever.workedYesterday) return 'Worked yesterday'
    return 'Fresh'
  }

  const lineupStatusLabel = (status = '') => {
    if (status === 'posted') return 'Confirmed'
    if (status === 'partial') return 'Partial'
    return 'Pending'
  }

  const signedValue = (value, digits = 1) => {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return 'N/A'
    return `${numericValue >= 0 ? '+' : ''}${numericValue.toFixed(digits)}`
  }

  const getTeamLogoUrl = (league, teamName) => {
    if (league !== 'MLB') return ''
    const code = mlbTeamLogoCode[teamName]
    return code ? `${mlbLogoBase}/${code}_l.svg` : ''
  }

  const getTeamAccent = (league, teamName) => {
    if (league !== 'MLB') return '#4fd2a6'
    return mlbTeamAccent[teamName] || '#4fd2a6'
  }

  const buildPitcherSummary = (pitcher = {}) => {
    const pitchHand = pitcher.pitchHand ? `${pitcher.pitchHand}HP` : '?HP'
    const record = `${pitcher.wins ?? 0}-${pitcher.losses ?? 0}`
    const era = pitcher.era ? `${pitcher.era} ERA` : 'ERA n/a'
    const whip = pitcher.whip ? `${pitcher.whip} WHIP` : 'WHIP n/a'
    const extra = []
    if (pitcher.strikeOuts !== undefined) extra.push(`${pitcher.strikeOuts} SO`)
    if (pitcher.inningsPitched) extra.push(`${pitcher.inningsPitched} IP`)
    const recentForm = pitcher.recentForm
    const recent =
      recentForm && recentForm.startsSample > 0
        ? `Last ${recentForm.startsSample}: ${formatNumber(recentForm.inningsPerStart, 1)} IP | ${formatNumber(
            recentForm.earnedRunsPerStart,
            1
          )} ER | ${formatNumber(recentForm.homeRunsAllowedPerStart, 1)} HR`
        : ''
    return {
      primary: `${pitchHand} | ${record} | ${era} | ${whip}`,
      recent,
      hover: extra.join(' | ')
    }
  }

  const buildTeamContextSummary = (team = {}) => {
    if (!team || (!Number.isFinite(Number(team.wins)) && !Number.isFinite(Number(team.losses)))) return ''
    const record = `${team.wins ?? '-'}-${team.losses ?? '-'}`
    const rankLabel = team.divisionLeader ? '1st in division' : `${formatOrdinal(team.divisionRank)} in division`
    const streak = team.streakCode ? ` | ${team.streakCode}` : ''
    return `${record} | ${rankLabel}${streak}`
  }

  const simulationTemperatureLabel = (value) => {
    if (value <= 0.18) return 'Cold'
    if (value <= 0.42) return 'Stable'
    if (value <= 0.68) return 'Balanced'
    if (value <= 0.86) return 'Volatile'
    return 'Chaos'
  }

  const formatSnapshotTime = (isoString) => {
    if (!isoString) return ''

    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(isoString))
  }

  const buildGameHighlights = (game) => {
    const chips = []

    if (game.league === 'MLB' && game.analysis?.mlbProjection) {
      const projection = game.analysis.mlbProjection
      const selectedScript =
        projection.teamScripts?.find((script) => script.teamName === game.analysis?.participant?.name) ??
        projection.teamScripts?.[0]
      const carryHitter = selectedScript?.overperformHitters?.[0]?.name
      const bridgeCarry = selectedScript?.bullpenOverperformHitters?.[0]?.name
      const bothLineupsPosted =
        game.lineupBoard?.status?.away === 'posted' && game.lineupBoard?.status?.home === 'posted'
      const partialLineups =
        !bothLineupsPosted &&
        (game.lineupBoard?.status?.away === 'partial' || game.lineupBoard?.status?.home === 'partial')

      if (projection.first5EdgeTeam && projection.first5EdgeTeam !== projection.edgeTeam) {
        chips.push({ tone: 'warning', label: `F5 ${projection.first5EdgeTeam}` })
      }

      if (projection.bridgeEdgeTeam && projection.bridgeEdgeTeam !== projection.edgeTeam) {
        chips.push({ tone: 'danger', label: `Late ${projection.bridgeEdgeTeam}` })
      }

      if (carryHitter) {
        chips.push({ tone: 'accent', label: `Carry ${carryHitter}` })
      }

      if (bridgeCarry && bridgeCarry !== carryHitter) {
        chips.push({ tone: 'warning', label: `Bridge ${bridgeCarry}` })
      }

      if (projection.totals?.fullGame?.lean && projection.totals.fullGame.lean !== 'Pass') {
        chips.push({
          tone: projection.totals.fullGame.lean === 'Over' ? 'warning' : 'neutral',
          label: projection.totals.fullGame.label
        })
      }

      if (game.analysis?.indicators?.reliefPitchingRisk >= 68) {
        chips.push({ tone: 'danger', label: 'Late risk' })
      }

      if (game.analysis?.indicators?.coinflipPressure >= 64) {
        chips.push({ tone: 'danger', label: 'Flip live' })
      }

      if (bothLineupsPosted) {
        chips.push({ tone: 'accent', label: 'Lineups in' })
      } else if (partialLineups) {
        chips.push({ tone: 'neutral', label: 'Lineups partial' })
      }

      if (projection.weather?.label && /helps carry|suppresses carry/i.test(projection.weather.label)) {
        chips.push({
          tone: /helps carry/i.test(projection.weather.label) ? 'warning' : 'neutral',
          label: /helps carry/i.test(projection.weather.label) ? 'Weather up' : 'Weather down'
        })
      }
    } else if (game.league === 'Tennis' && game.tennisContext) {
      if (game.tennisContext.surface) chips.push({ tone: 'neutral', label: game.tennisContext.surface })
      if (game.tennisContext.h2hLeader === game.analysis?.participant?.name) {
        chips.push({ tone: 'accent', label: 'H2H edge' })
      }
      if (game.tennisContext.liveDog) {
        chips.push({ tone: 'warning', label: 'Dog live' })
      }
      if (game.tennisContext.fatigueFlag) {
        chips.push({ tone: 'danger', label: 'Fatigue live' })
      }
      if (game.tennisContext.formEdgeName === game.analysis?.participant?.name) {
        chips.push({ tone: 'accent', label: 'Form edge' })
      }
      if (game.analysis?.volatility >= 70) chips.push({ tone: 'danger', label: 'Volatile' })
    } else {
      if (game.analysis?.confidence >= 72) chips.push({ tone: 'accent', label: 'High confidence' })
      if (game.analysis?.volatility >= 68) chips.push({ tone: 'danger', label: 'High variance' })
    }

    return chips.slice(0, 4)
  }

  const clampValue = (value, min, max) => Math.min(max, Math.max(min, value))

  const countSelectedPicks = (picks) => Object.keys(picks).length

  const buildBalancedRecommendationSet = (favoritePicks, flipPicks, legCount, rawWeight = 0.5) => {
    const targetLegCount = clampValue(Math.round(Number(legCount) || 0), 0, PARLAY_MAX_LEGS)
    const safeWeight = clampValue(Number(rawWeight) || 0, 0, 1)

    if (!targetLegCount) {
      return {
        picks: [],
        targetFlipLegs: 0,
        actualFlipLegs: 0,
        averageFlipProbability: 0
      }
    }

    const uniqueFavoritePicks = favoritePicks.filter(
      (pick, index, list) => list.findIndex((entry) => entry.gameId === pick.gameId) === index
    )
    const uniqueFlipPicks = flipPicks.filter(
      (pick, index, list) => list.findIndex((entry) => entry.gameId === pick.gameId) === index
    )
    const flipSample = uniqueFlipPicks.slice(0, Math.min(targetLegCount * 2, uniqueFlipPicks.length))
    const averageFlipProbability = flipSample.length
      ? flipSample.reduce(
          (total, pick) =>
            total + clampValue(pick.flipProbability ?? (pick.flipScore ?? 55) / 100, 0.18, 0.82),
          0
        ) / flipSample.length
      : 0

    let targetFlipLegs = Math.round(targetLegCount * safeWeight * averageFlipProbability)

    if (safeWeight >= 0.38 && targetFlipLegs === 0 && uniqueFlipPicks.length && targetLegCount >= 3) {
      targetFlipLegs = 1
    }

    targetFlipLegs = clampValue(targetFlipLegs, 0, Math.min(targetLegCount, uniqueFlipPicks.length))

    const picks = []
    const gameIds = new Set()

    uniqueFlipPicks.forEach((pick) => {
      if (picks.length >= targetFlipLegs || gameIds.has(pick.gameId)) return
      picks.push(pick)
      gameIds.add(pick.gameId)
    })

    uniqueFavoritePicks.forEach((pick) => {
      if (picks.length >= targetLegCount || gameIds.has(pick.gameId)) return
      picks.push(pick)
      gameIds.add(pick.gameId)
    })

    uniqueFlipPicks.forEach((pick) => {
      if (picks.length >= targetLegCount || gameIds.has(pick.gameId)) return
      picks.push(pick)
      gameIds.add(pick.gameId)
    })

    return {
      picks,
      targetFlipLegs,
      actualFlipLegs: picks.filter((pick) => pick.flipScore !== undefined).length,
      averageFlipProbability
    }
  }

  const picksForDay = (dayId) => selectedPicksByDay[dayId] ?? {}
  const pinnedSignalsForDay = (dayId) => pinnedSignalsByDay[dayId] ?? []
  const customSourcesForDay = (dayId) => customSourcesByDay[dayId] ?? []
  const deskNoteForDay = (dayId) => deskNotesByDay[dayId] ?? ''
  const simulationsForDay = (dayId) => simulatedGamesByDay[dayId] ?? {}
  const selectedPropsForDay = (dayId) => selectedPropsByDay[dayId] ?? {}

  const savePicksForDay = (dayId, nextPicks) => {
    selectedPicksByDay = {
      ...selectedPicksByDay,
      [dayId]: nextPicks
    }
  }

  const savePinnedSignalsForDay = (dayId, nextSignals) => {
    pinnedSignalsByDay = {
      ...pinnedSignalsByDay,
      [dayId]: nextSignals
    }
  }

  const saveSelectedPropsForDay = (dayId, nextProps) => {
    selectedPropsByDay = {
      ...selectedPropsByDay,
      [dayId]: nextProps
    }
  }

  const saveCustomSourcesForDay = (dayId, nextSources) => {
    customSourcesByDay = {
      ...customSourcesByDay,
      [dayId]: nextSources
    }
  }

  const saveDeskNoteForDay = (dayId, note) => {
    deskNotesByDay = {
      ...deskNotesByDay,
      [dayId]: note
    }
  }

  const saveSimulationsForDay = (dayId, nextSimulations) => {
    simulatedGamesByDay = {
      ...simulatedGamesByDay,
      [dayId]: nextSimulations
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
  $: customSources = activeDay ? customSourcesByDay[activeDay.id] ?? [] : []
  $: allSources = [...sources, ...customSources]
  $: selectedPicks = activeDay ? selectedPicksByDay[activeDay.id] ?? {} : {}
  $: selectedProps = activeDay ? selectedPropsByDay[activeDay.id] ?? {} : {}
  $: pinnedSignalIds = activeDay ? pinnedSignalsByDay[activeDay.id] ?? [] : []
  $: deskNote = activeDay ? deskNotesByDay[activeDay.id] ?? '' : ''
  $: dayIndex = slateDays.findIndex((day) => day.id === activeDay?.id)
  $: summaryCards =
    activeDay?.summary?.leagueCards ??
    leagueOrder.map((league) => ({ league, total: 0, spotlightCount: 0 }))

  $: if (activeDay && !filterOptions.includes(activeFilter)) {
    activeFilter = 'All'
  }

  $: eligibleMoneylineGames = games.filter((game) => game.moneyline.available)

  $: sportFilteredGames = activeFilter === 'All' ? games : games.filter((game) => game.league === activeFilter)
  $: visibleGames = marketSearch
    ? sportFilteredGames.filter((game) => {
        const query = marketSearch.trim().toLowerCase()
        if (!query) return true
        const tags = Array.isArray(game.tags) ? game.tags.join(' ').toLowerCase() : ''
        const matchupNames = game.matchup?.map((side) => side.name.toLowerCase()).join(' ') ?? ''
        return (
          game.title.toLowerCase().includes(query) ||
          game.stage.toLowerCase().includes(query) ||
          matchupNames.includes(query) ||
          tags.includes(query)
        )
      })
    : sportFilteredGames

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
  $: flipRiskPicks = rankFlipRiskPicks(games)
  $: mlbPlayerProps = rankMlbPlayerProps(games)
  $: filteredMlbPlayerProps =
    activePropType === 'all'
      ? mlbPlayerProps
      : mlbPlayerProps.filter((target) => target.propType === activePropType)
  $: selectedPropEntries = Object.values(selectedProps)
  $: propConfidenceAverage = selectedPropEntries.length
    ? Math.round(
        selectedPropEntries.reduce((total, prop) => total + (Number(prop.confidence) || 0), 0) /
          selectedPropEntries.length
      )
    : 0

  $: analysisPickPool =
    activeFilter === 'All'
      ? analysisPicks
      : analysisPicks.filter((pick) => pick.league === activeFilter)
  $: coreAnalysisPickPool = analysisPickPool.filter((pick) => pick.coreEligible)
  $: safeAnalysisPickPool = analysisPickPool.filter(
    (pick) =>
      pick.coreEligible ||
      (pick.confidence >= 58 && pick.tier !== 'Swingy' && pick.safetyScore >= -15)
  )
  $: favoriteRecommendationPool =
    safeAnalysisPickPool.length > 0
      ? safeAnalysisPickPool
      : analysisPickPool.filter((pick) => pick.confidence > 0).slice(0, Math.min(4, analysisPickPool.length))

  $: flipRiskPickPool =
    activeFilter === 'All'
      ? flipRiskPicks
      : flipRiskPicks.filter((pick) => pick.league === activeFilter)

  $: balancedRecommendation = buildBalancedRecommendationSet(
    favoriteRecommendationPool,
    flipRiskPickPool,
    activeRecommendedLegCount,
    balanceWeight
  )
  $: activeRecommendationPool =
    recommendationMode === 'flips'
      ? flipRiskPickPool
      : recommendationMode === 'balanced'
        ? balancedRecommendation.picks
        : favoriteRecommendationPool
  $: activeRecommendationMeta =
    recommendationModes.find((mode) => mode.id === recommendationMode) ?? recommendationModes[0]

  $: analysisRankLookup = new Map(analysisPicks.map((pick) => [pick.gameId, pick.rank]))
  $: signalLadderPicks = favoriteRecommendationPool.slice(0, 6)
  $: pinnedSignalPicks = analysisPickPool.filter((pick) => pinnedSignalIds.includes(pick.gameId))
  $: modelCount = visibleGames.filter((game) => game.analysis.inputsUsed > 0).length
  $: spotlightCount = visibleGames.filter((game) => game.spotlight).length
  $: sourceCount = allSources.length
  $: hasMlbSlate = games.some((game) => game.league === 'MLB')
  $: activeSimulations = activeDay ? simulatedGamesByDay[activeDay.id] ?? {} : {}
  $: mlbGames = games.filter((game) => game.league === 'MLB')
  $: lineupStatusCounts = mlbGames.reduce(
    (totals, game) => {
      const awayStatus = game.lineupBoard?.status?.away
      const homeStatus = game.lineupBoard?.status?.home
      totals.total += awayStatus ? 1 : 0
      totals.total += homeStatus ? 1 : 0
      if (awayStatus === 'posted') totals.posted += 1
      else if (awayStatus === 'partial') totals.partial += 1
      if (homeStatus === 'posted') totals.posted += 1
      else if (homeStatus === 'partial') totals.partial += 1
      return totals
    },
    { posted: 0, partial: 0, total: 0 }
  )
  $: latestLineupSnapshot =
    mlbGames
      .map((game) => game.lineupBoard?.snapshot)
      .filter(Boolean)
      .sort()
      .at(-1) ?? ''
  $: lineupRefreshLabel = latestLineupSnapshot ? `Refresh ${formatSnapshotTime(latestLineupSnapshot)}` : ''

  $: if (!hasMlbSlate) {
    showDeskSettings = false
  }

  $: if (!visibleGames.some((game) => game.id === expandedGameId)) {
    expandedGameId = visibleGames[0]?.id ?? ''
  }
  $: selectedGame = visibleGames.find((game) => game.id === expandedGameId) ?? visibleGames[0] ?? null

  $: recommendationCapacity = Math.min(PARLAY_MAX_LEGS, filteredMoneylineGames.length)
  $: recommendationCounts =
    recommendationCapacity >= PARLAY_MIN_LEGS
      ? Array.from(
          {
            length: recommendationCapacity - PARLAY_MIN_LEGS + 1
          },
          (_, index) => index + PARLAY_MIN_LEGS
        )
      : []

  $: activeRecommendedLegCount = recommendationCounts.includes(recommendedLegCount)
    ? recommendedLegCount
    : recommendationCounts[0] ?? 0

  $: recommendedParlayLegs =
    activeRecommendedLegCount > 0
      ? activeRecommendationPool
          .slice(0, activeRecommendedLegCount)
          .map((pick) =>
            createParlayLeg(
              pick.game,
              pick.participantId,
              recommendationMode === 'flips'
                ? 'flip-risk'
                : recommendationMode === 'balanced'
                  ? 'balanced'
                  : 'analysis'
            )
          )
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
  $: orderedSlateDays = activeDay
    ? [
        activeDay,
        ...slateDays
          .filter((day) => day.id !== activeDay.id)
          .sort((left, right) => right.id.localeCompare(left.id))
      ]
    : [...slateDays].sort((left, right) => right.id.localeCompare(left.id))

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
    marketSearch = ''
    activeSidebarTab = 'ticket'
    showDeskSettings = false
  }

  const stepDay = (delta) => {
    const nextDay = slateDays[dayIndex + delta]

    if (nextDay) selectDay(nextDay.id)
  }

  const toggleExpandedGame = (gameId) => {
    expandedGameId = expandedGameId === gameId ? '' : gameId
  }

  const openGame = (gameId) => {
    if (!gameId) return

    const targetGame = games.find((game) => game.id === gameId)

    if (targetGame && activeFilter !== 'All' && activeFilter !== targetGame.league) {
      activeFilter = targetGame.league
    }

    expandedGameId = gameId

    if (typeof document !== 'undefined') {
      requestAnimationFrame(() => {
        document.getElementById(`market-${gameId}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      })
    }
  }

  const openGameFromRow = (gameId) => {
    if (!gameId) return
    expandedGameId = gameId
  }

  const openGameFromKey = (gameId, event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    openGameFromRow(gameId)
  }

  const addAnalystPick = (game) => {
    if (!game?.moneyline?.available || !game?.analysis?.participantId) return
    toggleParlayPick(game.id, game.analysis.participantId)
  }

  const togglePinnedSignal = (gameId) => {
    const currentSignals = pinnedSignalsForDay(activeDay.id)

    if (currentSignals.includes(gameId)) {
      savePinnedSignalsForDay(
        activeDay.id,
        currentSignals.filter((id) => id !== gameId)
      )
      return
    }

    savePinnedSignalsForDay(activeDay.id, [...currentSignals, gameId])
  }

  const addCustomSource = () => {
    const label = customSourceLabel.trim()
    const url = customSourceUrl.trim()

    if (!label || !url || !activeDay) return

    try {
      const parsed = new URL(url)
      saveCustomSourcesForDay(activeDay.id, [
        ...customSourcesForDay(activeDay.id),
        { label, url: parsed.toString() }
      ])
      customSourceLabel = ''
      customSourceUrl = ''
    } catch {
      return
    }
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

  const togglePlayerProp = (prop) => {
    if (!activeDay || !prop?.id) return

    const currentProps = selectedPropsForDay(activeDay.id)

    if (currentProps[prop.id]) {
      const nextProps = { ...currentProps }
      delete nextProps[prop.id]
      saveSelectedPropsForDay(activeDay.id, nextProps)
      return
    }

    saveSelectedPropsForDay(activeDay.id, {
      ...currentProps,
      [prop.id]: prop
    })
    activeSidebarTab = 'props'
  }

  const removeSelectedProp = (propId) => {
    if (!activeDay || !propId) return
    const currentProps = selectedPropsForDay(activeDay.id)
    if (!currentProps[propId]) return
    const nextProps = { ...currentProps }
    delete nextProps[propId]
    saveSelectedPropsForDay(activeDay.id, nextProps)
  }

  const clearSelectedProps = () => {
    if (!activeDay) return
    saveSelectedPropsForDay(activeDay.id, {})
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

  const runGameSimulation = (game) => {
    if (!activeDay || game.league !== 'MLB' || !game.analysis?.mlbProjection) return

    const currentSimulations = simulationsForDay(activeDay.id)
    const nextRunIndex = (currentSimulations[game.id]?.runIndex ?? 0) + 1
    const nextSimulation = simulateMlbGame(game, simulationTemperature, nextRunIndex)

    if (!nextSimulation) return

    saveSimulationsForDay(activeDay.id, {
      ...currentSimulations,
      [game.id]: nextSimulation
    })
  }

  const loadRecommendedParlay = (legCount = activeRecommendedLegCount) => {
    if (!legCount) return

    savePicksForDay(
      activeDay.id,
      Object.fromEntries(
        activeRecommendationPool.slice(0, legCount).map((pick) => [pick.gameId, pick.participantId])
      )
    )
    activeSidebarTab = 'ticket'
  }
</script>

<svelte:head>
  <title>{slateMeta.date} Sports Desk</title>
  <meta
    name="description"
    content={`A trading-desk style sports dashboard with date navigation, sport tabs, internal market scrolling, signals, sources, and parlay tools for the ${slateMeta.date} slate.`}
  />
</svelte:head>

<div class="terminal-shell">
  <header class="desk-globalbar">
    <div class="topbar-brand">
      <div class="brand-mark">S</div>
      <div class="brand-wordmark">Slate<span>.</span></div>
    </div>

    <div class="desk-tab-row" role="tablist" aria-label="Desk tabs">
      {#each deskTabs as tab}
        <button
          type="button"
          role="tab"
          class="desk-tab"
          class:active={activeDeskTab === tab.id}
          aria-selected={activeDeskTab === tab.id}
          on:click={() => (activeDeskTab = tab.id)}
        >
          {tab.label}
          {#if tab.id === 'parlay'}
            <span class="desk-tab-count">{parlay.legCount}</span>
          {/if}
        </button>
      {/each}
    </div>

    <label class="global-search" aria-label="Search markets">
      <span>Search markets, players, signals...</span>
      <input type="text" bind:value={marketSearch} placeholder="Filter the current slate..." />
      <small>⌘K</small>
    </label>

    <div class="topbar-status mono">
      <span class="live-dot"></span>
      <span>Live</span>
      <span>{oddsMeta.snapshot}</span>
    </div>
  </header>

  <div class="desk-datestrip">
    <div class="datestrip-label">
      <span class="eyebrow">Slate</span>
    </div>
    <button type="button" class="datestrip-step" disabled={!hasPreviousDay()} on:click={() => stepDay(-1)}>
      ‹
    </button>
    <div class="datestrip-scroll no-scrollbar">
      {#each orderedSlateDays as day}
        <button
          type="button"
          class="date-chip compact"
          class:active={activeDayId === day.id}
          on:click={() => selectDay(day.id)}
        >
          <small>{day.id.slice(8, 10)} / {day.id.slice(5, 7)}</small>
          <strong>{day.slateMeta.date}</strong>
          <span>{day.summary.totalGames}</span>
        </button>
      {/each}
    </div>
    <button type="button" class="datestrip-step" disabled={!hasNextDay()} on:click={() => stepDay(1)}>
      ›
    </button>
    <div class="datestrip-meta mono">
      <span>{games.length} games</span>
      <span>{eligibleMoneylineGames.length} eligible</span>
      <span>{parlay.legCount} selected</span>
    </div>
  </div>

  {#if activeDeskTab === 'board'}
    <div class="desk-board-workspace">
      <section class="games-rail">
        <div class="games-rail-header">
          <div>
            <p class="eyebrow">Games</p>
            <h2>{slateMeta.date} · {activeFilter === 'All' ? 'full board' : activeFilter}</h2>
          </div>
          <div class="games-rail-meta mono">
            <span>{visibleGames.length} visible</span>
            {#if hasMlbSlate}
              <span>{lineupStatusCounts.posted}/{lineupStatusCounts.total} posted</span>
            {/if}
          </div>
        </div>

        <div class="games-rail-filters">
          {#each filterOptions as filter}
            <button
              type="button"
              class="rail-filter-chip"
              class:active={activeFilter === filter}
              on:click={() => (activeFilter = filter)}
            >
              {filter}
            </button>
          {/each}
        </div>

        <div class="games-rail-list no-scrollbar">
          {#if visibleGames.length === 0}
            <div class="placeholder-panel compact">
              <p class="eyebrow">No markets</p>
              <h3>No results for this filter yet</h3>
              <p>Try a different date, sport, or a looser search phrase.</p>
            </div>
          {:else}
            {#each visibleGames as game}
              <button
                type="button"
                class="game-rail-row"
                class:active={selectedGame?.id === game.id}
                on:click={() => openGame(game.id)}
              >
                <div class="game-rail-row-meta">
                  <span class="league-badge league-{game.league.toLowerCase()}">{game.league}</span>
                  <span class="mono">{game.start}</span>
                  <span class="game-rail-stage">{game.stage}</span>
                </div>

                <div class="game-rail-row-main">
                  <div class="game-rail-title-wrap">
                    <div class="game-rail-title">
                      <span>{game.matchup[0]?.name}</span>
                      <span class="versus-dot">vs</span>
                      <span>{game.matchup[1]?.name}</span>
                    </div>
                    <small>{game.analysis.participant.name} lean</small>
                  </div>
                  <div class="game-rail-score mono">{game.analysis.confidence}</div>
                </div>

                <div class="game-rail-row-bottom">
                  <div class="game-rail-chips">
                    {#each buildGameHighlights(game).slice(0, 3) as chip}
                      <span class={`game-highlight-chip ${chip.tone}`}>{chip.label}</span>
                    {/each}
                  </div>
                  <div class="game-rail-vol">
                    <span>{labelForScore(game.analysis.confidence)}</span>
                    <div class="mini-vol-bar"><span style={`width:${game.analysis.volatility}%`}></span></div>
                  </div>
                </div>
              </button>
            {/each}
          {/if}
        </div>
      </section>

      <section class="detail-canvas">
        {#if selectedGame}
          {@const game = selectedGame}
          {@const gameSimulation = activeSimulations[game.id]}
          <div class="detail-canvas-header">
            <div class="detail-canvas-title-block">
              <div class="detail-canvas-topline">
                <span class="league-badge league-{game.league.toLowerCase()}">{game.league}</span>
                <span class="mono">{game.start}</span>
                <span>{game.stage}</span>
              </div>
              <h1>{game.title}</h1>
            </div>

            <div class="detail-canvas-actions">
              <button type="button" class="analysis-action-button" on:click={() => togglePinnedSignal(game.id)}>
                {pinnedSignalIds.includes(game.id) ? 'Pinned' : 'Pin'}
              </button>
              {#if game.moneyline.available}
                <button type="button" class="analysis-action-button active" on:click={() => addAnalystPick(game)}>
                  {selectedPicks[game.id] === game.analysis.participantId ? 'In ticket' : 'Add analyst pick'}
                </button>
              {/if}
              <button type="button" class="analysis-action-button" on:click={() => (activeDeskTab = 'parlay')}>
                Open builder
              </button>
            </div>
          </div>

          <div class="detail-kpi-strip">
            <article class="detail-kpi-card">
              <span class="eyebrow">Pick</span>
              <strong>{game.analysis.participant.name}</strong>
              <small>Analyst read</small>
            </article>
            <article class="detail-kpi-card">
              <span class="eyebrow">Confidence</span>
              <strong>{game.analysis.confidence}</strong>
              <small>{labelForScore(game.analysis.confidence)}</small>
            </article>
            <article class="detail-kpi-card">
              <span class="eyebrow">Volatility</span>
              <strong>{game.analysis.volatility}%</strong>
              <small>{labelForScore(game.analysis.volatility)}</small>
            </article>
            <article class="detail-kpi-card">
              <span class="eyebrow">Market</span>
              <strong>{game.moneyline.available ? game.analysis.marketProbabilityLabel : 'Model only'}</strong>
              <small>{game.moneyline.available ? game.moneyline.provider : 'No moneyline'}</small>
            </article>
            <article class="detail-kpi-card">
              <span class="eyebrow">Inputs</span>
              <strong>{game.analysis.inputsUsed}</strong>
              <small>{game.tags.join(' · ')}</small>
            </article>
          </div>

          <div class="detail-canvas-scroll no-scrollbar">
            <div class="detail-canvas-grid">
              <section class="detail-panel insight-panel">
                <div class="detail-panel-header">
                  <p class="eyebrow">Editorial read</p>
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
                        <strong class="pick-analysis-note">My pick: {game.analysis.participant.name}</strong>
                      </div>
                    </div>

                    <div class="pick-grid compact">
                      {#each game.moneyline.participants as participant}
                        <button
                          type="button"
                          class="pick-button"
                          class:active={selectedPicks[game.id] === participant.id}
                          disabled={atParlayLimit && !selectedPicks[game.id]}
                          on:click|stopPropagation={() => toggleParlayPick(game.id, participant.id)}
                        >
                          <div class="pick-button-topline">
                            <span>{participant.name}</span>
                            {#if game.analysis.available && game.analysis.participantId === participant.id}
                              <span class="pick-badge">Analyst</span>
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
                      <p class="odds-kicker">Odds snapshot</p>
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
                        <p class="model-kicker">Structured input model</p>
                        <p class="model-caption">How the current desk is separating this market.</p>
                      </div>
                      <span class="model-market-prob">{game.analysis.marketProbabilityLabel}</span>
                    </div>

                    <ul class="model-input-list">
                      {#each game.analysis.inputs.slice(0, 8) as input}
                        <li>{input.summary}</li>
                      {/each}
                    </ul>

                    {#if game.analysis.volatilityNotes.length > 0}
                      <div class="model-note-row">
                        {#each game.analysis.volatilityNotes.slice(0, 4) as note}
                          <span>{note.label}</span>
                        {/each}
                      </div>
                    {/if}
                  </section>
                {/if}
              </div>
            </div>

            {#if game.analysis.mlbProjection}
              <section class="detail-panel detail-panel--wide">
                <div class="model-phase-grid">
                  <article class="model-phase-card">
                    <div class="model-phase-head">
                      <div>
                        <p>First 5</p>
                        <strong>{game.analysis.mlbProjection.first5EdgeTeam} +{game.analysis.mlbProjection.first5EdgeHits}</strong>
                      </div>
                      <span>Starter window</span>
                    </div>

                    <div class="flow-lane-grid">
                      <div class="flow-lane">
                        <div class="flow-lane-label">
                          <span>{game.matchup[0].name}</span>
                          <strong>{game.analysis.mlbProjection.awayFirst5ProjectedHits} H</strong>
                        </div>
                        <div class="flow-track">
                          <span style={`width:${comparisonBarWidth(game.analysis.mlbProjection.awayFirst5ProjectedHits, game.analysis.mlbProjection.awayFirst5ProjectedHits, game.analysis.mlbProjection.homeFirst5ProjectedHits)}`}></span>
                        </div>
                        <small>{game.analysis.mlbProjection.awayFirst5HitEfficiencyPct}% efficiency</small>
                      </div>
                      <div class="flow-lane">
                        <div class="flow-lane-label">
                          <span>{game.matchup[1].name}</span>
                          <strong>{game.analysis.mlbProjection.homeFirst5ProjectedHits} H</strong>
                        </div>
                        <div class="flow-track">
                          <span style={`width:${comparisonBarWidth(game.analysis.mlbProjection.homeFirst5ProjectedHits, game.analysis.mlbProjection.awayFirst5ProjectedHits, game.analysis.mlbProjection.homeFirst5ProjectedHits)}`}></span>
                        </div>
                        <small>{game.analysis.mlbProjection.homeFirst5HitEfficiencyPct}% efficiency</small>
                      </div>
                    </div>
                  </article>

                  <article class="model-phase-card">
                    <div class="model-phase-head">
                      <div>
                        <p>Rest of game</p>
                        <strong>{game.analysis.mlbProjection.lateEdgeTeam} +{game.analysis.mlbProjection.lateEdgeHits}</strong>
                      </div>
                      <span>Bridge and finish</span>
                    </div>

                    <div class="flow-lane-grid">
                      <div class="flow-lane">
                        <div class="flow-lane-label">
                          <span>{game.matchup[0].name}</span>
                          <strong>{game.analysis.mlbProjection.awayLateProjectedHits} H</strong>
                        </div>
                        <div class="flow-track">
                          <span style={`width:${comparisonBarWidth(game.analysis.mlbProjection.awayLateProjectedHits, game.analysis.mlbProjection.awayLateProjectedHits, game.analysis.mlbProjection.homeLateProjectedHits)}`}></span>
                        </div>
                        <small>{game.analysis.mlbProjection.awayLateHitEfficiencyPct}% efficiency</small>
                      </div>
                      <div class="flow-lane">
                        <div class="flow-lane-label">
                          <span>{game.matchup[1].name}</span>
                          <strong>{game.analysis.mlbProjection.homeLateProjectedHits} H</strong>
                        </div>
                        <div class="flow-track">
                          <span style={`width:${comparisonBarWidth(game.analysis.mlbProjection.homeLateProjectedHits, game.analysis.mlbProjection.awayLateProjectedHits, game.analysis.mlbProjection.homeLateProjectedHits)}`}></span>
                        </div>
                        <small>{game.analysis.mlbProjection.homeLateHitEfficiencyPct}% efficiency</small>
                      </div>
                    </div>
                  </article>

                  <article class="model-phase-card model-phase-card--edge">
                    <div class="model-phase-head">
                      <div>
                        <p>Full game</p>
                        <strong>{game.analysis.mlbProjection.edgeTeam} +{game.analysis.mlbProjection.edgeHits}</strong>
                      </div>
                      <span>Total hit edge</span>
                    </div>

                    <div class="flow-lane-grid">
                      <div class="flow-lane">
                        <div class="flow-lane-label">
                          <span>{game.matchup[0].name}</span>
                          <strong>{game.analysis.mlbProjection.awayProjectedHits} H</strong>
                        </div>
                        <div class="flow-track">
                          <span style={`width:${comparisonBarWidth(game.analysis.mlbProjection.awayProjectedHits, game.analysis.mlbProjection.awayProjectedHits, game.analysis.mlbProjection.homeProjectedHits)}`}></span>
                        </div>
                        <small>{game.analysis.mlbProjection.awayHitEfficiencyPct}% efficiency</small>
                      </div>
                      <div class="flow-lane">
                        <div class="flow-lane-label">
                          <span>{game.matchup[1].name}</span>
                          <strong>{game.analysis.mlbProjection.homeProjectedHits} H</strong>
                        </div>
                        <div class="flow-track">
                          <span style={`width:${comparisonBarWidth(game.analysis.mlbProjection.homeProjectedHits, game.analysis.mlbProjection.awayProjectedHits, game.analysis.mlbProjection.homeProjectedHits)}`}></span>
                        </div>
                        <small>{game.analysis.mlbProjection.homeHitEfficiencyPct}% efficiency</small>
                      </div>
                    </div>
                  </article>
                </div>

                <div class="model-note-row model-note-row--pitchers">
                  <span>{game.matchup[0].name}: {game.analysis.mlbProjection.awayPitcherType}</span>
                  <span>{game.matchup[1].name}: {game.analysis.mlbProjection.homePitcherType}</span>
                  {#if game.analysis.mlbProjection.awayStarterHoldConfidence !== null}
                    <span>{game.starterContext.away.fullName}: hold {game.analysis.mlbProjection.awayStarterHoldConfidence}</span>
                  {/if}
                  {#if game.analysis.mlbProjection.homeStarterHoldConfidence !== null}
                    <span>{game.starterContext.home.fullName}: hold {game.analysis.mlbProjection.homeStarterHoldConfidence}</span>
                  {/if}
                  {#if game.analysis.mlbProjection.bridgeEdgeTeam}
                    <span>Bridge edge: {game.analysis.mlbProjection.bridgeEdgeTeam} +{game.analysis.mlbProjection.bridgeEdgeScore}</span>
                  {/if}
                </div>
              </section>

              <section class="totals-board" aria-label={`Totals board for ${game.title}`}>
                <div class="home-run-board-head">
                  <div>
                    <p class="series-kicker">Totals and flow</p>
                    <strong>{game.analysis.mlbProjection.totals.fullGame.label} | proj {game.analysis.mlbProjection.totals.projectedFullTotalRuns}</strong>
                  </div>
                  <span>Full, first 5, late</span>
                </div>

                <div class="totals-grid">
                  <article class="totals-card">
                    <div class="totals-card-head">
                      <p>Full game</p>
                      <strong>{game.analysis.mlbProjection.totals.fullGame.label}</strong>
                    </div>
                    <span>Proj {game.analysis.mlbProjection.totals.projectedFullTotalRuns} vs {game.analysis.mlbProjection.postedTotal ?? 'N/A'}</span>
                    <small>{game.analysis.mlbProjection.totals.fullGame.summary}</small>
                  </article>

                  <article class="totals-card">
                    <div class="totals-card-head">
                      <p>First 5</p>
                      <strong>{game.analysis.mlbProjection.totals.first5.label}</strong>
                    </div>
                    <span>Proj {game.analysis.mlbProjection.totals.projectedFirst5TotalRuns} vs {game.analysis.mlbProjection.totals.derivedFirst5TotalLine ?? 'N/A'}</span>
                    <small>{game.analysis.mlbProjection.totals.first5.summary}</small>
                  </article>

                  <article class="totals-card">
                    <div class="totals-card-head">
                      <p>Rest of game</p>
                      <strong>{game.analysis.mlbProjection.totals.late.label}</strong>
                    </div>
                    <span>Proj {game.analysis.mlbProjection.totals.projectedLateTotalRuns} vs {game.analysis.mlbProjection.totals.derivedLateTotalLine ?? 'N/A'}</span>
                    <small>{game.analysis.mlbProjection.totals.late.summary}</small>
                  </article>
                </div>

                <p class="totals-footnote">{game.analysis.mlbProjection.totals.bullpenExhaustionNote}</p>
              </section>

              <div class="reliever-chain-grid">
                <article class="reliever-chain-card">
                  <div class="reliever-chain-head">
                    <div>
                      <p>{game.matchup[0].name} bridge chain</p>
                      <strong>{game.analysis.mlbProjection.awayBullpenChainScore ?? 'N/A'}</strong>
                    </div>
                    <span>{game.analysis.mlbProjection.awayBullpenExhaustionLabel} workload</span>
                  </div>
                  <div class="reliever-list">
                    {#each game.analysis.mlbProjection.awayLikelyRelievers as reliever}
                      <div class="reliever-row">
                        <div>
                          <strong>{reliever.name}</strong>
                          <span>{reliever.role} | First up {Math.round(reliever.firstRelieverLikelihood)}%</span>
                        </div>
                        <div class="reliever-meta">
                          <strong>Availability {Math.round(reliever.availabilityScore)}/100</strong>
                          <span>{relieverStatusLabel(reliever)}</span>
                        </div>
                      </div>
                    {/each}
                  </div>
                </article>

                <article class="reliever-chain-card">
                  <div class="reliever-chain-head">
                    <div>
                      <p>{game.matchup[1].name} bridge chain</p>
                      <strong>{game.analysis.mlbProjection.homeBullpenChainScore ?? 'N/A'}</strong>
                    </div>
                    <span>{game.analysis.mlbProjection.homeBullpenExhaustionLabel} workload</span>
                  </div>
                  <div class="reliever-list">
                    {#each game.analysis.mlbProjection.homeLikelyRelievers as reliever}
                      <div class="reliever-row">
                        <div>
                          <strong>{reliever.name}</strong>
                          <span>{reliever.role} | First up {Math.round(reliever.firstRelieverLikelihood)}%</span>
                        </div>
                        <div class="reliever-meta">
                          <strong>Availability {Math.round(reliever.availabilityScore)}/100</strong>
                          <span>{relieverStatusLabel(reliever)}</span>
                        </div>
                      </div>
                    {/each}
                  </div>
                </article>
              </div>

              <div class="team-script-grid">
                {#each game.analysis.mlbProjection.teamScripts as script}
                  <article class="team-script-card">
                    <div class="team-script-head">
                      <div>
                        <p>{script.teamName}</p>
                        <strong>Hitter script</strong>
                      </div>
                      <span>{script.overperformHitters.length ? 'Carry bats live' : script.lineupStatus}</span>
                    </div>
                    <div class="team-script-copy">
                      <strong>Why the lane works</strong>
                      <span>{script.overview}</span>
                    </div>
                    <div class="team-script-copy">
                      <strong>Overperform hitters</strong>
                      <span>
                        {script.overperformHitters.length
                          ? script.overperformHitters.map((hitter) => `${hitter.name} (${hitter.tag})`).join(' • ')
                          : 'No clear carry bat surfaced yet before confirmed lineups.'}
                      </span>
                    </div>
                    {#if script.bullpenOverperformHitters?.length}
                      <div class="team-script-copy">
                        <strong>Bridge hitters</strong>
                        <span>{script.bullpenOverperformHitters.map((hitter) => `${hitter.name} (${hitter.tag})`).join(' • ')}</span>
                      </div>
                    {/if}
                    {#if script.underperformHitters?.length}
                      <div class="team-script-copy">
                        <strong>Underperform hitters</strong>
                        <span>{script.underperformHitters.map((hitter) => `${hitter.name} (${hitter.tag})`).join(' • ')}</span>
                      </div>
                    {/if}
                    <div class="team-script-copy">
                      <strong>Underperform watch</strong>
                      <span>{script.underperformNote}</span>
                    </div>
                  </article>
                {/each}
              </div>

              {#if game.analysis.mlbProjection.lineupSimulation}
                <section class="lineup-simulation-board" aria-label={`Game flow simulation for ${game.title}`}>
                  <div class="home-run-board-head">
                    <div>
                      <p class="series-kicker">Probable game flow</p>
                      <strong>{game.analysis.mlbProjection.lineupSimulation.overview}</strong>
                    </div>
                    <span>Starter, bridge, finish</span>
                  </div>

                  <div class="simulation-phase-grid">
                    {#each game.analysis.mlbProjection.lineupSimulation.phases as phase}
                      <article class="simulation-phase-card">
                        <div class="simulation-phase-head">
                          <div>
                            <p>{phase.label}</p>
                            <strong>{phase.edgeTeam}</strong>
                          </div>
                          <span>{phase.projection}</span>
                        </div>
                        <p>{phase.note}</p>
                      </article>
                    {/each}
                  </div>
                </section>
              {/if}

              <section class="simulation-board" aria-label={`Quick simulator for ${game.title}`}>
                <div class="home-run-board-head">
                  <div>
                    <p class="series-kicker">Quick simulator</p>
                    <strong>Approx box score and inning path at the current temperature index</strong>
                  </div>
                  <div class="simulation-board-actions">
                    <span>Temp {gameSimulation?.temperature?.toFixed(2) ?? simulationTemperature.toFixed(2)}</span>
                    <button type="button" class="simulation-run-button" on:click|stopPropagation={() => runGameSimulation(game)}>
                      {gameSimulation ? 'Re-roll sim' : 'Run sim'}
                    </button>
                  </div>
                </div>

                {#if gameSimulation}
                  <div class="simulation-summary-row">
                    <div>
                      <strong>{gameSimulation.summary}</strong>
                      <p>{gameSimulation.overview}</p>
                    </div>
                    <div class="simulation-summary-meta">
                      <span>{gameSimulation.temperatureLabel}</span>
                      <small>{gameSimulation.upset ? 'Flip result' : 'Model hold'}</small>
                    </div>
                  </div>

                  <div class="simulation-boxscore-grid">
                    {#each [gameSimulation.away, gameSimulation.home] as teamLine}
                      <article class="simulation-boxscore-card" data-winner={gameSimulation.winner === teamLine.teamName}>
                        <div class="simulation-boxscore-head">
                          <div>
                            <p>{teamLine.teamName}</p>
                            <strong>{teamLine.runs} R | {teamLine.hits} H | {teamLine.errors} E</strong>
                          </div>
                          <span>{gameSimulation.winner === teamLine.teamName ? 'Winner' : 'Chasing'}</span>
                        </div>
                        <div class="simulation-boxscore-splits">
                          <span>F5 {teamLine.first5Runs} R / {teamLine.first5Hits} H</span>
                          <span>Late {teamLine.lateRuns} R / {teamLine.lateHits} H</span>
                        </div>
                        <p class="simulation-driver-copy">
                          {teamLine.drivers?.length ? `Likely drivers: ${teamLine.drivers.join(' • ')}` : 'No clear driver cluster surfaced beyond the team-level traffic script.'}
                        </p>
                      </article>
                    {/each}
                  </div>

                  <div class="simulation-linescore-wrap">
                    <table class="simulation-linescore">
                      <thead>
                        <tr>
                          <th>Team</th>
                          {#each gameSimulation.innings as inning}
                            <th>{inning}</th>
                          {/each}
                          <th>R</th>
                          <th>H</th>
                          <th>E</th>
                        </tr>
                      </thead>
                      <tbody>
                        {#each [gameSimulation.away, gameSimulation.home] as teamLine}
                          <tr class:winning-row={gameSimulation.winner === teamLine.teamName}>
                            <th>{teamLine.teamName}</th>
                            {#each teamLine.inningRuns as inningRuns}
                              <td>{inningRuns}</td>
                            {/each}
                            <td>{teamLine.runs}</td>
                            <td>{teamLine.hits}</td>
                            <td>{teamLine.errors}</td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>

                  <div class="simulation-note-grid">
                    <p>{gameSimulation.phaseSummary}</p>
                    <p>{gameSimulation.lineupNote}</p>
                  </div>
                {:else}
                  <div class="simulation-empty-state">
                    <strong>Run a quick sim for this MLB game.</strong>
                    <p>The temperature slider shifts variance from steadier model-hold scripts toward hotter bullpen swings and flip outcomes.</p>
                  </div>
                {/if}
              </section>

              {#if game.lineupBoard}
                <section class="lineup-board" aria-label={`Confirmed lineups for ${game.title}`}>
                  <div class="home-run-board-head">
                    <div>
                      <p class="series-kicker">Full batting orders</p>
                      <strong>Recent form, split fit, and starter-lane tags</strong>
                    </div>
                    <span>Official + weather supplement</span>
                  </div>

                  {#if game.lineupBoard.weather || game.lineupBoard.marketWeatherContext?.line || game.lineupBoard.marketWeatherContext?.total}
                    <div class="lineup-weather-row">
                      {#if game.lineupBoard.weather}
                        <span>{game.lineupBoard.weather.label || game.lineupBoard.weather.summary}</span>
                      {/if}
                      {#if game.lineupBoard.marketWeatherContext?.line}
                        <span>Line {game.lineupBoard.marketWeatherContext.line}</span>
                      {/if}
                      {#if game.lineupBoard.marketWeatherContext?.total}
                        <span>O/U {game.lineupBoard.marketWeatherContext.total}</span>
                      {/if}
                    </div>
                  {/if}

                  <div class="lineup-board-grid">
                    {#each [{ board: game.lineupBoard.away, status: game.lineupBoard.status?.away }, { board: game.lineupBoard.home, status: game.lineupBoard.status?.home }] as lineupTeam}
                      <article class="lineup-team-card">
                        <div class="lineup-team-head">
                          <div>
                            <p>{lineupTeam.board.teamName}</p>
                            <strong>{lineupStatusLabel(lineupTeam.status)}</strong>
                          </div>
                          <span>vs {lineupTeam.board.opposingStarter.name} ({lineupTeam.board.opposingStarter.hand}HP, {lineupTeam.board.opposingStarter.type})</span>
                        </div>

                        <div class="lineup-team-summary">
                          <span>Top third {lineupTeam.board.summary.topThirdScore}</span>
                          <span>Depth {lineupTeam.board.summary.depthScore}</span>
                          <span>{lineupTeam.board.summary.pressureLabel}</span>
                          {#if lineupTeam.board.lineupSource === 'rotowire-supplement'}
                            <span>RotoWire supplement</span>
                          {/if}
                        </div>

                        <p class="lineup-team-overview">{lineupTeam.board.summary.overview}</p>

                        {#if lineupTeam.board.lineup.length}
                          <div class="lineup-list">
                            {#each lineupTeam.board.lineup as hitter}
                              <article class="lineup-row-card">
                                <div class="lineup-row-head">
                                  <div class="lineup-slot">{hitter.slot}</div>
                                  <div class="lineup-player-meta">
                                    <strong>{hitter.name}</strong>
                                    <span>{hitter.position} | {hitter.bats || '?'}HB</span>
                                  </div>
                                  <div class="lineup-matchup-grade">
                                    <strong>{signedValue(hitter.metrics.matchupGrade, 2)}</strong>
                                    <span>{hitter.primaryTag}</span>
                                  </div>
                                </div>
                                <p class="lineup-player-summary">{hitter.summary}</p>
                                {#if hitter.tags?.length}
                                  <div class="lineup-tag-row">
                                    {#each hitter.tags as tag}
                                      <span>{tag}</span>
                                    {/each}
                                  </div>
                                {/if}
                              </article>
                            {/each}
                          </div>
                        {:else}
                          <p class="lineup-team-overview">Official batting order is still pending for this side.</p>
                        {/if}
                      </article>
                    {/each}
                  </div>
                </section>
              {/if}

              {#if game.homeRunTargets}
                <section class="home-run-board" aria-label={`Home run looks for ${game.title}`}>
                  <div class="home-run-board-head">
                    <div>
                      <p class="series-kicker">Home run looks</p>
                      <strong>{game.homeRunTargets.summary}</strong>
                    </div>
                    <span>Weighted pool, not true odds</span>
                  </div>

                  <div class="home-run-tier-grid">
                    <article class="home-run-tier">
                      <div class="home-run-tier-head">
                        <p>Likely</p>
                        <span>Anchor and strongest support</span>
                      </div>
                      <div class="home-run-target-list">
                        {#if game.homeRunTargets.likely.length}
                          {#each game.homeRunTargets.likely as target}
                            <div class="home-run-target-row">
                              <div>
                                <strong>{target.playerName}</strong>
                                <span>{target.teamName} vs {target.opposingPitcher} ({target.opposingPitcherHand}HP)</span>
                                {#if target.signalSummary}
                                  <span>{target.signalSummary}</span>
                                {/if}
                                {#if target.modelSharePct != null}
                                  <div class="home-run-weight-bar" aria-hidden="true">
                                    <span style={`width:${Math.max(12, Math.min(100, target.modelSharePct * 2.6))}%`}></span>
                                  </div>
                                {/if}
                              </div>
                              <div class="home-run-target-meta">
                                <strong>{Math.round(target.score)}</strong>
                                <span>{target.modelSharePct?.toFixed(1)}% share | {target.lane}</span>
                                <span>{target.scoreBand} | {target.burstTag}</span>
                              </div>
                            </div>
                          {/each}
                        {:else}
                          <p class="home-run-empty">No likely lane yet on this matchup.</p>
                        {/if}
                      </div>
                    </article>

                    <article class="home-run-tier">
                      <div class="home-run-tier-head">
                        <p>Possible</p>
                        <span>Secondary pressure bats</span>
                      </div>
                      <div class="home-run-target-list">
                        {#if game.homeRunTargets.possible?.length}
                          {#each game.homeRunTargets.possible as target}
                            <div class="home-run-target-row">
                              <div>
                                <strong>{target.playerName}</strong>
                                <span>{target.signalSummary || `${target.teamName} matchup lane`}</span>
                                {#if target.modelSharePct != null}
                                  <div class="home-run-weight-bar" aria-hidden="true">
                                    <span style={`width:${Math.max(10, Math.min(100, target.modelSharePct * 2.6))}%`}></span>
                                  </div>
                                {/if}
                              </div>
                              <div class="home-run-target-meta">
                                <strong>{Math.round(target.score)}</strong>
                                <span>{target.modelSharePct?.toFixed(1)}% share | {target.lane}</span>
                                <span>{target.scoreBand} | {target.burstTag}</span>
                              </div>
                            </div>
                          {/each}
                        {:else}
                          <p class="home-run-empty">No second-tier lane yet beyond the lead bat.</p>
                        {/if}
                      </div>
                    </article>

                    <article class="home-run-tier">
                      <div class="home-run-tier-head">
                        <p>Alternates</p>
                        <span>Thin but still live</span>
                      </div>
                      <div class="home-run-target-list">
                        {#if game.homeRunTargets.alternates?.length}
                          {#each game.homeRunTargets.alternates as target}
                            <div class="home-run-target-row">
                              <div>
                                <strong>{target.playerName}</strong>
                                <span>{target.signalSummary || `${target.teamName} matchup lane`}</span>
                                {#if target.modelSharePct != null}
                                  <div class="home-run-weight-bar" aria-hidden="true">
                                    <span style={`width:${Math.max(10, Math.min(100, target.modelSharePct * 2.6))}%`}></span>
                                  </div>
                                {/if}
                              </div>
                              <div class="home-run-target-meta">
                                <strong>{Math.round(target.score)}</strong>
                                <span>{target.modelSharePct?.toFixed(1)}% share | {target.lane}</span>
                                <span>{target.scoreBand} | {target.burstTag}</span>
                              </div>
                            </div>
                          {/each}
                        {:else}
                          <p class="home-run-empty">No alternate lanes worth holding yet.</p>
                        {/if}
                      </div>
                    </article>
                  </div>
                </section>
              {/if}

              {#if game.playerProps?.available}
                <section class="player-prop-board" aria-label={`Player prop builder for ${game.title}`}>
                  <div class="home-run-board-head">
                    <div>
                      <p class="series-kicker">Player props</p>
                      <strong>{game.playerProps.summary}</strong>
                    </div>
                    <span>Hits, TB, RBI, walks, singles, HR</span>
                  </div>

                  <div class="player-prop-grid">
                    {#each game.playerProps.featured as prop}
                      <article class="player-prop-card">
                        <div class="player-prop-head">
                          <div>
                            <p>{prop.playerName}</p>
                            <strong>{prop.marketLabel}</strong>
                          </div>
                          <div class="player-prop-meta">
                            <strong>{prop.confidence}%</strong>
                            <span>{prop.recommendationTier}</span>
                          </div>
                        </div>

                        <div class="player-prop-chip-row">
                          <span>{prop.propLabel}</span>
                          <span>{prop.teamName}</span>
                          <span>{prop.statValueLabel}</span>
                        </div>

                        <p class="player-prop-copy">{prop.reason || prop.matchupNote}</p>

                        <div class="player-prop-actions">
                          <small>{prop.matchupNote}</small>
                          <button type="button" class="player-prop-toggle" class:active={Boolean(selectedProps[prop.id])} on:click={() => togglePlayerProp(prop)}>
                            {selectedProps[prop.id] ? 'Saved' : 'Add prop'}
                          </button>
                        </div>
                      </article>
                    {/each}
                  </div>
                </section>
              {/if}
            {/if}

            {#if game.playerAnalysis?.length}
              <section class="player-analysis-panel" aria-label={`Player analysis for ${game.title}`}>
                <p class="series-kicker">Player analysis</p>
                <ul class="player-analysis-list">
                  {#each game.playerAnalysis as note}
                    <li>{note}</li>
                  {/each}
                </ul>
              </section>
            {/if}

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

                      {#if boxScore.leaders?.length}
                        <div class="boxscore-leaders">
                          {#each boxScore.leaders as leaderGroup}
                            <div class="leader-group">
                              <p class="leader-group-title">{leaderGroup.team}</p>
                              <ul class="leader-list">
                                {#each leaderGroup.lines as line}
                                  <li>{line}</li>
                                {/each}
                              </ul>
                            </div>
                          {/each}
                        </div>
                      {/if}
                    </article>
                  {/each}
                </div>

                {#if game.seriesBreakdown.playerAnalysis?.length}
                  <section class="player-analysis-panel">
                    <p class="series-kicker">Key players</p>
                    <ul class="player-analysis-list">
                      {#each game.seriesBreakdown.playerAnalysis as note}
                        <li>{note}</li>
                      {/each}
                    </ul>
                  </section>
                {/if}

                <div class="series-links">
                  {#each game.seriesBreakdown.sources as source}
                    <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
                  {/each}
                </div>
              </section>
            {/if}
          </div>
        {:else}
          <div class="placeholder-panel">
            <p class="eyebrow">Board</p>
            <h3>No market selected</h3>
            <p>Select a game from the rail to open the detail canvas.</p>
          </div>
        {/if}
      </section>
    </div>
  {:else if activeDeskTab === 'parlay'}
    <div class="desk-tool-workspace">
      <section class="builder-shell action-rail" aria-label="Parlay builder">
        <div class="parlay-sidebar-header">
          <div>
            <p class="eyebrow">Parlay builder</p>
            <h2>Execution</h2>
            <p class="parlay-sidebar-copy">Build tickets, save props, and move between core, balanced, and flip-risk setups outside the board view.</p>
          </div>
          <button type="button" class="clear-parlay-button" disabled={parlay.legCount === 0} on:click={clearParlay}>
            Clear ticket
          </button>
        </div>

        <div class="sidebar-tab-row" role="tablist" aria-label="Builder tools">
          {#each sidebarTabs as tab}
            <button type="button" role="tab" class="sidebar-tab-button" class:active={activeSidebarTab === tab.id} aria-selected={activeSidebarTab === tab.id} on:click={() => setSidebarTab(tab.id)}>
              {tab.label}
            </button>
          {/each}
        </div>

        {#if activeSidebarTab === 'ticket'}
          <div class="parlay-stats-grid compact">
            <article class="parlay-stat-card"><span class="parlay-stat-label">Eligible legs</span><strong>{filteredMoneylineGames.length}</strong></article>
            <article class="parlay-stat-card"><span class="parlay-stat-label">Selected</span><strong>{parlay.legCount}</strong></article>
            <article class="parlay-stat-card"><span class="parlay-stat-label">Combined odds</span><strong>{parlay.combinedAmericanLabel}</strong><small>Decimal {parlay.combinedDecimalLabel}</small></article>
            <article class="parlay-stat-card"><span class="parlay-stat-label">Implied hit rate</span><strong>{parlay.impliedProbabilityLabel}</strong></article>
          </div>

          {#if recommendationCounts.length > 0}
            <div class="ticket-autobuild">
              <p class="ticket-autobuild-label">Auto-build ticket</p>
              <div class="recommendation-mode-row" role="tablist" aria-label="Recommendation mode">
                {#each recommendationModes as mode}
                  <button type="button" role="tab" class="recommendation-mode-button" class:active={recommendationMode === mode.id} aria-selected={recommendationMode === mode.id} on:click={() => (recommendationMode = mode.id)}>
                    {mode.label}
                  </button>
                {/each}
              </div>
              <p class="ticket-autobuild-copy">{activeRecommendationMeta.copy}</p>
              {#if recommendationMode === 'balanced'}
                <label class="balance-slider-card" for="balance-weight">
                  <div class="balance-slider-head"><span>Flip weight</span><strong>{balanceWeight.toFixed(2)}</strong></div>
                  <input id="balance-weight" type="range" min="0" max="1" step="0.05" bind:value={balanceWeight} />
                  <small>Targeting about {balancedRecommendation.targetFlipLegs} flip{balancedRecommendation.targetFlipLegs === 1 ? '' : 's'} in this {activeRecommendedLegCount}-leg mix from an average live-dog rate of {Math.round(balancedRecommendation.averageFlipProbability * 100)}%.</small>
                </label>
              {/if}
              <div class="recommendation-size-row">
                {#each recommendationCounts as count}
                  <button type="button" class="size-chip" class:active={activeRecommendedLegCount === count} on:click={() => (recommendedLegCount = count)}>{count}-leg</button>
                {/each}
              </div>
              {#if recommendedParlay.legCount > 0}
                <p class="ticket-autobuild-preview">{activeRecommendationMeta.label} set: {recommendedParlay.combinedAmericanLabel} | {recommendedParlay.impliedProbabilityLabel} implied {#if recommendationMode === 'balanced'}| {balancedRecommendation.actualFlipLegs} flip leg{balancedRecommendation.actualFlipLegs === 1 ? '' : 's'}{/if}</p>
              {/if}
              <button type="button" class="load-recommended-button" on:click={() => loadRecommendedParlay(activeRecommendedLegCount)}>
                Load {activeRecommendedLegCount}-leg {recommendationMode === 'flips' ? 'flip-risk' : recommendationMode} ticket
              </button>
            </div>
          {/if}

          <div class="parlay-body stacked">
            <label class="stake-card" for="parlay-stake"><span class="parlay-stat-label">Stake</span><input id="parlay-stake" type="number" min="1" step="5" bind:value={parlayStake} /></label>
            <div class="parlay-return-grid">
              <article class="parlay-return-card"><span class="parlay-stat-label">Projected return</span><strong>{parlay.grossReturnLabel}</strong></article>
              <article class="parlay-return-card"><span class="parlay-stat-label">Projected profit</span><strong>{parlay.profitLabel}</strong></article>
            </div>
          </div>

          <div class="sidebar-status-card" data-ready={parlayReady}>
            <p class="parlay-status-title">{parlayReady ? 'Ticket ready' : 'Ticket in progress'}</p>
            <p class="parlay-status-copy">{parlayStatus}</p>
          </div>

          {#if parlay.legCount === 0}
            <p class="parlay-empty">Start from the Board tab, then come back here to build around the live card.</p>
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
                    {#if leg.isAnalystPick}<span class="analyst-chip">Analyst match</span>{/if}
                    <button type="button" class="remove-leg-button" on:click={() => removeParlayPick(leg.gameId)}>Remove</button>
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        {:else if activeSidebarTab === 'props'}
          <div class="parlay-stats-grid compact">
            <article class="parlay-stat-card"><span class="parlay-stat-label">Eligible props</span><strong>{mlbPlayerProps.length}</strong></article>
            <article class="parlay-stat-card"><span class="parlay-stat-label">Saved</span><strong>{selectedPropEntries.length}</strong></article>
            <article class="parlay-stat-card"><span class="parlay-stat-label">Avg confidence</span><strong>{selectedPropEntries.length ? `${propConfidenceAverage}%` : 'N/A'}</strong></article>
            <article class="parlay-stat-card"><span class="parlay-stat-label">Type filter</span><strong>{propTypeFilters.find((entry) => entry.id === activePropType)?.label ?? 'All'}</strong></article>
          </div>
          <div class="ticket-autobuild">
            <div class="action-section-header">
              <div>
                <p class="ticket-autobuild-label">MLB prop builder</p>
                <p class="ticket-autobuild-copy">The stronger edge might be on hits, TB, or RBI instead of forcing a HR prop when the game script is more traffic than pure carry.</p>
              </div>
              <button type="button" class="clear-parlay-button" disabled={!selectedPropEntries.length} on:click={clearSelectedProps}>Clear props</button>
            </div>
            <div class="recommendation-size-row">
              {#each propTypeFilters as filter}
                <button type="button" class="size-chip" class:active={activePropType === filter.id} on:click={() => (activePropType = filter.id)}>{filter.label}</button>
              {/each}
            </div>
          </div>
          {#if selectedPropEntries.length > 0}
            <div class="action-section">
              <div class="action-section-header"><h3>Saved Props</h3><span>{selectedPropEntries.length}</span></div>
              <div class="prop-pick-list">
                {#each selectedPropEntries as prop}
                  <article class="prop-pick-card">
                    <div>
                      <p class="parlay-leg-topline">{prop.teamName} | {prop.gameTitle}</p>
                      <p class="parlay-leg-pick">{prop.playerName} {prop.marketLabel}</p>
                      <p class="parlay-leg-game">{prop.reason || prop.matchupNote}</p>
                    </div>
                    <div class="parlay-leg-side">
                      <strong>{prop.confidence}%</strong>
                      <span>{prop.recommendationTier}</span>
                      <button type="button" class="remove-leg-button" on:click={() => removeSelectedProp(prop.id)}>Remove</button>
                    </div>
                  </article>
                {/each}
              </div>
            </div>
          {/if}
          <div class="action-section">
            <div class="action-section-header"><h3>Top Props</h3><span>{filteredMlbPlayerProps.length}</span></div>
            {#if filteredMlbPlayerProps.length > 0}
              <div class="prop-pick-list">
                {#each filteredMlbPlayerProps.slice(0, 18) as prop}
                  <article class="prop-pick-card">
                    <div>
                      <p class="parlay-leg-topline">{prop.gameTitle}</p>
                      <p class="parlay-leg-pick">{prop.playerName} {prop.marketLabel}</p>
                      <p class="parlay-leg-game">{prop.reason || prop.matchupNote}</p>
                    </div>
                    <div class="parlay-leg-side">
                      <strong>{prop.confidence}%</strong>
                      <span>{prop.statValueLabel}</span>
                      <button type="button" class="analysis-action-button" class:active={Boolean(selectedProps[prop.id])} on:click={() => togglePlayerProp(prop)}>{selectedProps[prop.id] ? 'Saved' : 'Add'}</button>
                    </div>
                  </article>
                {/each}
              </div>
            {:else}
              <p class="panel-empty">No MLB player props are available on this filtered board yet.</p>
            {/if}
          </div>
        {:else if activeSidebarTab === 'signals'}
          <div class="action-section">
            <div class="action-section-header"><h3>Model Ladder</h3><span>{signalLadderPicks.length}</span></div>
            <div class="analysis-pick-list compact">
              {#each signalLadderPicks as pick}
                <article class="analysis-pick-card compact">
                  <div class="analysis-pick-topline"><span>{pick.league} | {pick.start}</span><span>{pick.confidence} conf</span></div>
                  <h3>{pick.participant.name}</h3>
                  <p class="analysis-pick-game">{pick.gameTitle}</p>
                  <p class="analysis-pick-tone">{recommendationToneFor(pick)}</p>
                  <div class="analysis-action-row">
                    <button type="button" class="analysis-action-button" on:click={() => { openGame(pick.gameId); activeDeskTab = 'board' }}>Open</button>
                    <button type="button" class="analysis-action-button" class:active={selectedPicks[pick.gameId] === pick.participantId} disabled={atParlayLimit && !selectedPicks[pick.gameId]} on:click={() => toggleParlayPick(pick.gameId, pick.participantId)}>{selectedPicks[pick.gameId] === pick.participantId ? 'In ticket' : 'Add'}</button>
                    <button type="button" class="analysis-action-button" class:active={pinnedSignalIds.includes(pick.gameId)} on:click={() => togglePinnedSignal(pick.gameId)}>{pinnedSignalIds.includes(pick.gameId) ? 'Pinned' : 'Pin'}</button>
                  </div>
                </article>
              {/each}
            </div>
          </div>
        {:else if activeSidebarTab === 'sources'}
          <div class="action-section">
            <div class="action-section-header"><h3>Open Sources</h3><span>{sourceCount}</span></div>
            {#if allSources.length > 0}
              <div class="sources-list">
                {#each allSources as source}
                  <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
                {/each}
              </div>
            {:else}
              <p class="sources-empty">No sources attached yet for this date.</p>
            {/if}
          </div>
          <div class="action-section">
            <div class="action-section-header"><h3>Add Source</h3><span>Local</span></div>
            <div class="source-form">
              <input type="text" placeholder="Source label" bind:value={customSourceLabel} />
              <input type="url" placeholder="https://..." bind:value={customSourceUrl} />
              <button type="button" class="analysis-action-button" on:click={addCustomSource}>Add source</button>
            </div>
          </div>
        {:else if activeSidebarTab === 'notes'}
          <div class="action-section">
            <div class="action-section-header"><h3>Desk Notes</h3><span>Edit</span></div>
            <textarea class="desk-note-input" rows="10" placeholder="Add your trading notes for this date..." value={deskNote} on:input={(event) => saveDeskNoteForDay(activeDay.id, event.currentTarget.value)}></textarea>
          </div>
          <div class="action-section">
            <div class="action-section-header"><h3>Imported Notes</h3><span>{slateMeta.notes.length + (activeDay.feedNotes?.length ?? 0)}</span></div>
            <ul class="notes-list">
              {#each slateMeta.notes as note}<li>{note}</li>{/each}
              {#each activeDay.feedNotes ?? [] as note}<li>{note}</li>{/each}
            </ul>
          </div>
        {/if}
      </section>
    </div>
  {:else if activeDeskTab === 'tickets'}
    <div class="desk-tool-workspace">
      <section class="placeholder-panel workspace-panel">
        <p class="eyebrow">Tickets</p>
        <h3>Saved card snapshot</h3>
        <p>{parlay.legCount ? `${parlay.legCount} active moneyline legs and ${selectedPropEntries.length} saved props are currently staged.` : 'No active ticket yet. Add picks from the board, then return here for archived and sent slips.'}</p>
      </section>
    </div>
  {:else if activeDeskTab === 'models'}
    <div class="desk-tool-workspace models-workspace">
      <section class="workspace-panel action-section">
        <div class="action-section-header"><h3>Model ladder</h3><span>{analysisPickPool.length}</span></div>
        <div class="analysis-pick-list compact">
          {#each analysisPickPool.slice(0, 18) as pick}
            <article class="analysis-pick-card compact">
              <div class="analysis-pick-topline"><span>{pick.league} | {pick.start}</span><span>{pick.confidence} conf</span></div>
              <h3>{pick.participant.name}</h3>
              <p class="analysis-pick-game">{pick.gameTitle}</p>
              <p class="analysis-pick-tone">{recommendationToneFor(pick)}</p>
              <div class="analysis-action-row">
                <button type="button" class="analysis-action-button" on:click={() => { openGame(pick.gameId); activeDeskTab = 'board' }}>Open on board</button>
              </div>
            </article>
          {/each}
        </div>
      </section>

      <section class="workspace-panel action-section">
        <div class="action-section-header"><h3>Sources</h3><span>{sourceCount}</span></div>
        {#if allSources.length > 0}
          <div class="sources-list">
            {#each allSources as source}
              <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
            {/each}
          </div>
        {:else}
          <p class="sources-empty">No sources attached yet for this date.</p>
        {/if}
      </section>
    </div>
  {:else}
    <div class="desk-tool-workspace">
      <section class="placeholder-panel workspace-panel">
        <p class="eyebrow">History</p>
        <h3>Historical tracking will live here</h3>
        <p>We can layer in backtests, archived slates, and model win-quality tracking next without crowding the live board.</p>
      </section>
    </div>
  {/if}
</div>

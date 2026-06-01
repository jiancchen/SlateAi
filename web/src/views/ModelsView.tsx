import { useEffect, useMemo, useState } from 'react'
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

type ModelRecord = ModelHistoryEntry['models'][number]

type CatalogModel = {
  id: string
  sport: 'tennis' | 'mlb'
  name: string
  lane: string
  latestDay?: ModelHistoryEntry
  latest?: ModelRecord
  history: Array<{ day: ModelHistoryEntry; model: ModelRecord }>
  components?: Array<{ day: ModelHistoryEntry; model: ModelRecord }>
  validation?: Array<{ day: ModelHistoryEntry; model: ModelRecord }>
  stub?: boolean
  stubStatus?: string
  description?: string
}

type TennisModelDay = {
  id: string
  date: string
  label: string
  status: string
  models: ModelRecord[]
  primary?: ModelRecord
  settlementModel?: ModelRecord
  runModel?: ModelRecord
}

type TennisModelDirectory = {
  id: string
  name: string
  status: string
  version?: string
  days: TennisModelDay[]
  latestDay?: TennisModelDay
}

const sportLabel = (sport: string) => (sport === 'mlb' ? 'MLB' : 'Tennis')

const isTennisModel = (model: ModelRecord) => String(model.sport).toLowerCase() === 'tennis'
const isMlbModel = (model: ModelRecord) => String(model.sport).toLowerCase() === 'mlb'

const modelKey = (model: ModelRecord) =>
  `${String(model.sport).toLowerCase()}::${model.modelName || 'model'}::${model.lane || 'lane'}`

const stableCatalogId = (model: ModelRecord) => modelKey(model).replace(/[^a-z0-9]+/gi, '-').toLowerCase()

const compactHash = (value?: string) => (value ? value.slice(0, 10) : 'Pending')

const numberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const pctFromSettlement = (settlement: ModelRecord['settlement']) => {
  const graded = numberOrNull(settlement?.gradedCount) ?? 0
  const hits = numberOrNull(settlement?.hitCount) ?? 0
  if (!graded) return null
  return (hits / graded) * 100
}

const pctFromBacktest = (model?: ModelRecord) => {
  const pct = numberOrNull(model?.backtest?.hitRatePct)
  if (pct !== null) return pct
  return numberOrNull(model?.performancePct)
}

const rowCountLabel = (model?: ModelRecord) => {
  if (model?.settlement) return `${model.settlement.gradedCount}/${model.settlement.rowCount} rows graded`
  return model?.coverageLabel || 'No coverage exported'
}

const backtestLabel = (model?: ModelRecord) =>
  model?.backtest?.label || model?.performanceLabel || model?.coverageLabel || 'No backtest exported'

const laneSummaryLabel = (model?: ModelRecord) => {
  if (!model) return 'No model rows'
  return model.performanceLabel || model.backtest?.label || model.coverageLabel || 'No performance exported'
}

const pnlLabel = (value?: number | null) => {
  const numeric = numberOrNull(value)
  if (numeric === null) return 'Pending'
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(1)}`
}

const latestDateLabel = (item?: CatalogModel, formatSnapshotTime?: (isoString: string) => string) => {
  const runTime = item?.latest?.run?.snapshottedAt || item?.latest?.run?.lockedAt
  if (runTime && formatSnapshotTime) return formatSnapshotTime(runTime)
  return item?.latestDay?.label || item?.latestDay?.date || 'Not published'
}

const modelTitle = (model: ModelRecord) => {
  if (model.run && model.modelName) return `${model.modelName} cartridge`
  if (/prediction-market/i.test(model.lane)) return 'Prediction market trade model'
  if (/winner|ml/i.test(model.lane)) return 'Winner and ML value model'
  return model.lane || model.modelName || 'Model'
}

const modelDescription = (model: ModelRecord) => {
  if (model.run) return 'Run cartridge metadata, prediction snapshot, health gates, and postmatch settlement status.'
  if (/prediction-market/i.test(model.lane)) return 'Kalshi trade-to-sell model: entry price, exit targets, historical touch-rate, and candidate coverage.'
  if (/winner|ml/i.test(model.lane)) return 'Tennis winner, moneyline value, spread, total, set-win, and first-set total model surface.'
  return 'Exported model history entry.'
}

const latestEntry = (entries: Array<{ day: ModelHistoryEntry; model: ModelRecord }>) =>
  [...entries].sort((left, right) => String(right.day.id).localeCompare(String(left.day.id)))[0]

const buildTennisModelDays = (modelHistory: ModelHistoryEntry[]): TennisModelDay[] =>
  modelHistory
    .map((day) => {
      const models = (day.models || []).filter(isTennisModel)
      if (!models.length) return null
      const runModel = models.find((model) => model.run || /cartridge run/i.test(model.lane || ''))
      const settlementModel = models.find((model) => model.settlement && Number(model.settlement.rowCount || 0) > 0)
      const winnerModel = models.find((model) => /winner|ml/i.test(model.lane || ''))
      const primary = runModel || settlementModel || winnerModel || models[0]
      const status =
        primary?.settlement?.status ||
        settlementModel?.settlement?.status ||
        (runModel ? 'pending' : day.status || 'backtest')
      return {
        id: String(day.id),
        date: day.date,
        label: day.label,
        status,
        models,
        primary,
        settlementModel: settlementModel || primary,
        runModel
      } satisfies TennisModelDay
    })
    .filter((day): day is TennisModelDay => Boolean(day))
    .sort((left, right) => String(right.id).localeCompare(String(left.id)))

const inferTennisDayModelId = (day: TennisModelDay, fallbackModelId: string) => {
  const explicitModelId =
    day.runModel?.modelName ||
    day.models.find((model) => model.modelDescription?.modelId)?.modelDescription?.modelId
  if (explicitModelId) return explicitModelId

  for (const model of day.models) {
    const versionMatch = String(model.version || '').match(/\bTEN-T\d+\b/i)
    if (versionMatch) return versionMatch[0].toUpperCase()
    const nameMatch = String(model.modelName || '').match(/^TEN-T\d+$/i)
    if (nameMatch) return nameMatch[0].toUpperCase()
  }

  return fallbackModelId
}

const buildTennisModelDirectories = (days: TennisModelDay[]): TennisModelDirectory[] => {
  const fallbackModelId =
    days.find((day) => day.runModel)?.runModel?.modelName ||
    days.find((day) => day.models.some((model) => model.modelDescription?.modelId))
      ?.models.find((model) => model.modelDescription?.modelId)?.modelDescription?.modelId ||
    'TEN-T0'
  const groups = new Map<string, TennisModelDirectory>()

  for (const day of days) {
    const modelId = inferTennisDayModelId(day, String(fallbackModelId))
    const existing = groups.get(modelId)
    if (existing) {
      existing.days.push(day)
      if (!existing.latestDay || String(day.id) > String(existing.latestDay.id)) existing.latestDay = day
      if (!existing.version && day.primary?.version) existing.version = day.primary.version
      if (day.runModel?.run) existing.status = day.runModel.run.status || existing.status
    } else {
      groups.set(modelId, {
        id: modelId,
        name: `${modelId} cartridge`,
        status: day.runModel?.run?.status || day.status || 'active',
        version: day.primary?.version,
        days: [day],
        latestDay: day
      })
    }
  }

  return Array.from(groups.values())
    .map((directory) => ({
      ...directory,
      days: [...directory.days].sort((left, right) => String(right.id).localeCompare(String(left.id)))
    }))
    .sort((left, right) => {
      const leftNumber = Number(String(left.id).replace(/\D/g, ''))
      const rightNumber = Number(String(right.id).replace(/\D/g, ''))
      if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
        return rightNumber - leftNumber
      }
      return right.id.localeCompare(left.id)
    })
}

const tennisDayStatusLabel = (day?: TennisModelDay) => {
  if (!day) return 'No date selected'
  const settlement = day.settlementModel?.settlement
  if (settlement) {
    const graded = Number(settlement.gradedCount || 0)
    const rows = Number(settlement.rowCount || 0)
    const pendingMatches = Number(settlement.pendingMatches || 0)
    const ungraded = Math.max(0, rows - graded)
    if (settlement.status === 'settled' && pendingMatches === 0 && ungraded > 0) {
      return `results complete (${graded}/${rows} graded · ${ungraded} no-line rows)`
    }
    return `${settlement.status} (${graded}/${rows} rows graded)`
  }
  return laneSummaryLabel(day.primary)
}

const tennisSettlementFootnote = (settlement?: ModelRecord['settlement'] | null) => {
  if (!settlement) return 'No settlement artifact'
  const graded = Number(settlement.gradedCount || 0)
  const rows = Number(settlement.rowCount || 0)
  const pendingMatches = Number(settlement.pendingMatches || 0)
  const ungraded = Math.max(0, rows - graded)
  if (settlement.status === 'settled' && pendingMatches === 0 && ungraded > 0) {
    return `${ungraded} generated rows had no captured line/direction`
  }
  return settlement.status || 'Pending'
}

const tennisDayBestLabel = (day?: TennisModelDay) => {
  const winner = day?.models.find((model) => /winner|ml/i.test(model.lane || ''))
  return laneSummaryLabel(winner || day?.primary)
}

const tennisDayKalshiLabel = (day?: TennisModelDay) => {
  const kalshi = day?.models.find((model) => /prediction-market/i.test(model.lane || ''))
  return kalshi ? laneSummaryLabel(kalshi) : 'No prediction-market row'
}

const buildTennisCatalog = (modelHistory: ModelHistoryEntry[]) => {
  const tennisEntries = modelHistory.flatMap((day) =>
    (day.models || [])
      .filter(isTennisModel)
      .map((model) => ({ day, model }))
  )
  const runEntries = tennisEntries.filter(({ model }) => model.run || /cartridge run/i.test(model.lane || ''))
  const preCartridgeEntries = tennisEntries.filter(({ model }) =>
    !model.run &&
    !/cartridge run/i.test(model.lane || '')
  )
  const catalog: CatalogModel[] = []
  const currentRun = latestEntry(runEntries)

  if (currentRun) {
    const currentRunId = currentRun.model.modelName || currentRun.model.run?.runId || 'TEN-T0'
    const eligibleValidationEntries = preCartridgeEntries.filter(({ day, model }) => {
      if (String(day.id) >= String(currentRun.day.id)) return false
      const gradedRows = numberOrNull(model.settlement?.gradedCount) ?? 0
      const hasSpikeBacktest = /prediction-market/i.test(model.lane || '') && numberOrNull(model.performancePct) !== null
      return gradedRows > 0 || hasSpikeBacktest
    })
    const latestValidationDay = latestEntry(eligibleValidationEntries)?.day.id
    const validationEntries = latestValidationDay
      ? eligibleValidationEntries.filter(({ day }) => day.id === latestValidationDay)
      : []
    catalog.push({
      id: `tennis-${String(currentRunId).toLowerCase()}-cartridge`,
      sport: 'tennis',
      name: `${currentRunId} tennis cartridge`,
      lane: 'Current cartridge',
      latestDay: currentRun.day,
      latest: currentRun.model,
      history: runEntries,
      components: tennisEntries.filter(({ day }) => day.id === currentRun.day.id),
      validation: validationEntries,
      description: 'The current tennis model cartridge. The winner, derivative, and prediction-market rows below are lanes/components inside this model, not separate peer cartridges.'
    })
  }

  const legacyEntries = preCartridgeEntries.filter(({ day }) =>
    (!currentRun || day.id !== currentRun.day.id)
  )

  if (legacyEntries.length) {
    const latestLegacy = latestEntry(legacyEntries)
    catalog.push({
      id: 'tennis-legacy-pre-cartridge',
      sport: 'tennis',
      name: 'Legacy tennis archive',
      lane: 'Pre-cartridge lanes',
      latestDay: latestLegacy.day,
      latest: latestLegacy.model,
      history: legacyEntries,
      components: legacyEntries.filter(({ day }) => day.id === latestLegacy.day.id),
      description: 'Historical tennis model rows before the cartridge split. Kept for comparison and backtest context; not the active model.'
    })
  }

  if (catalog.length) return catalog

  const groups = new Map<string, CatalogModel>()
  for (const day of modelHistory) {
    for (const model of day.models || []) {
      if (!isTennisModel(model)) continue
      const key = modelKey(model)
      const existing = groups.get(key)
      const entry = { day, model }
      if (!existing) {
        groups.set(key, {
          id: stableCatalogId(model),
          sport: 'tennis',
          name: modelTitle(model),
          lane: model.lane,
          latestDay: day,
          latest: model,
          history: [entry],
          description: modelDescription(model)
        })
      } else {
        existing.history.push(entry)
        if (String(day.id) > String(existing.latestDay?.id || '')) {
          existing.latestDay = day
          existing.latest = model
        }
      }
    }
  }
  return Array.from(groups.values()).sort((left, right) => {
    const leftRun = left.latest?.run ? 0 : 1
    const rightRun = right.latest?.run ? 0 : 1
    if (leftRun !== rightRun) return leftRun - rightRun
    return left.name.localeCompare(right.name)
  })
}

const mlbStubs: CatalogModel[] = [
  {
    id: 'mlb-sides-stub',
    sport: 'mlb',
    name: 'MLB sides model',
    lane: 'Sides / first five',
    history: [],
    stub: true,
    stubStatus: 'Stubbed',
    description: 'Will show cartridge metadata, day-by-day hit rate, calibration buckets, and run snapshots after MLB is migrated.'
  },
  {
    id: 'mlb-props-stub',
    sport: 'mlb',
    name: 'MLB props model',
    lane: 'Props / HR / first inning',
    history: [],
    stub: true,
    stubStatus: 'Stubbed',
    description: 'Placeholder for the later MLB cartridge split. Current legacy MLB history is intentionally not mixed into this clean dashboard.'
  }
]

const buildMlbCatalog = (modelHistory: ModelHistoryEntry[]) => {
  const mlbEntries = modelHistory.flatMap((day) =>
    (day.models || [])
      .filter(isMlbModel)
      .map((model) => ({ day, model }))
  )
  if (!mlbEntries.length) return mlbStubs

  const runEntries = mlbEntries.filter(({ model }) => model.run || /cartridge run/i.test(model.lane || ''))
  const latestRun = latestEntry(runEntries)
  const latestAny = latestRun || latestEntry(mlbEntries)
  const latestDay = latestAny.day
  const sameDayComponents = mlbEntries.filter(({ day }) => day.id === latestDay.id)
  const sideHistory = mlbEntries.filter(({ model }) => /sides/i.test(model.lane || ''))

  const catalog: CatalogModel[] = [
    {
      id: 'mlb-parent-cartridge',
      sport: 'mlb',
      name: 'MLB-M0 cartridge',
      lane: 'Sides / F5 / first inning / props',
      latestDay,
      latest: latestRun?.model || latestAny.model,
      history: runEntries.length ? runEntries : mlbEntries,
      components: sameDayComponents,
      description: 'The active MLB parent model shell. MLB-M0 owns the daily board lanes while MLB-RP36 feeds bullpen and bridge-risk context as an addendum.'
    }
  ]

  catalog.push({
    id: 'mlb-legacy-lanes',
    sport: 'mlb',
    name: 'Legacy MLB lane archive',
    lane: 'Settled lane history',
    latestDay: latestAny.day,
    latest: sideHistory[0]?.model || latestAny.model,
    history: mlbEntries,
    components: sameDayComponents.filter(({ model }) => !/cartridge run/i.test(model.lane || '')),
    description: 'Settled MLB lane rows from the results journal. Use this to inspect day-by-day sides, first inning, HR, and prop performance while MLB-M0 is still being migrated.'
  })

  return catalog
}

const modelStatus = (item?: CatalogModel) => {
  if (!item) return 'Missing'
  if (item.stub) return item.stubStatus || 'Stub'
  if (item.latest?.settlement?.status) return item.latest.settlement.status
  if (item.latest?.run?.status) return item.latest.run.status
  return item.latestDay?.status || 'active'
}

const selectedBacktestPct = (item?: CatalogModel) => {
  const ownPct = pctFromBacktest(item?.latest)
  if (ownPct !== null) return ownPct
  for (const component of item?.components || []) {
    const componentPct = pctFromBacktest(component.model)
    if (componentPct !== null) return componentPct
  }
  return null
}

const selectedBacktestLabel = (item?: CatalogModel) => {
  if (item?.latest?.backtest?.label) return item.latest.backtest.label
  return item?.components?.find((component) => component.model.backtest?.label)?.model.backtest?.label ||
    item?.latest?.performanceLabel ||
    item?.components?.find((component) => component.model.performanceLabel)?.model.performanceLabel ||
    'No backtest exported'
}

export function ModelsView({
  formatPercent,
  formatSnapshotTime,
  modelHistory,
  modelHistoryLoaded
}: ModelsViewProps) {
  const [activeSport, setActiveSport] = useState<'tennis' | 'mlb'>('tennis')
  const tennisCatalog = useMemo(() => buildTennisCatalog(modelHistory), [modelHistory])
  const tennisModelDays = useMemo(() => buildTennisModelDays(modelHistory), [modelHistory])
  const tennisModelDirectories = useMemo(() => buildTennisModelDirectories(tennisModelDays), [tennisModelDays])
  const mlbCatalog = useMemo(() => buildMlbCatalog(modelHistory), [modelHistory])
  const catalog = activeSport === 'tennis' ? tennisCatalog : mlbCatalog
  const [selectedModelId, setSelectedModelId] = useState('')
  const [selectedTennisModelId, setSelectedTennisModelId] = useState('')
  const [selectedTennisDayId, setSelectedTennisDayId] = useState('')

  useEffect(() => {
    if (!catalog.length) {
      setSelectedModelId('')
      return
    }
    if (!catalog.some((model) => model.id === selectedModelId)) {
      setSelectedModelId(catalog[0].id)
    }
  }, [catalog, selectedModelId])

  useEffect(() => {
    if (!tennisModelDirectories.length) {
      setSelectedTennisModelId('')
      return
    }
    if (!tennisModelDirectories.some((directory) => directory.id === selectedTennisModelId)) {
      setSelectedTennisModelId(tennisModelDirectories[0].id)
    }
  }, [tennisModelDirectories, selectedTennisModelId])

  const selectedTennisDirectory =
    tennisModelDirectories.find((directory) => directory.id === selectedTennisModelId) ||
    tennisModelDirectories[0]
  const selectedTennisDirectoryDays = selectedTennisDirectory?.days || []

  useEffect(() => {
    if (!selectedTennisDirectoryDays.length) {
      setSelectedTennisDayId('')
      return
    }
    if (!selectedTennisDirectoryDays.some((day) => day.id === selectedTennisDayId)) {
      setSelectedTennisDayId(selectedTennisDirectoryDays[0].id)
    }
  }, [selectedTennisDirectoryDays, selectedTennisDayId])

  const selectedModel = catalog.find((model) => model.id === selectedModelId) || catalog[0]
  const selectedTennisDay =
    selectedTennisDirectoryDays.find((day) => day.id === selectedTennisDayId) ||
    selectedTennisDirectoryDays[0] ||
    tennisModelDays[0]
  const selectedTennisPrimary = selectedTennisDay?.primary
  const selectedTennisSettlement = selectedTennisDay?.settlementModel?.settlement
  const selectedTennisWinnerModel = selectedTennisDay?.models.find((model) => /winner|ml/i.test(model.lane || ''))
  const selectedTennisKalshiModel = selectedTennisDay?.models.find((model) => /prediction-market/i.test(model.lane || ''))
  const selectedTennisRunModel = selectedTennisDay?.models.find((model) => model.run || /cartridge run/i.test(model.lane || ''))
  const selectedTennisHitPct = pctFromSettlement(selectedTennisSettlement)
  const currentRun = tennisCatalog.find((model) => model.latest?.run)
  const latestKalshi = latestEntry(modelHistory.flatMap((day) =>
    (day.models || [])
      .filter((model) => isTennisModel(model) && /prediction-market/i.test(model.lane || ''))
      .map((model) => ({ day, model }))
  ))
  const latestTennisDay = tennisModelDays[0]
  const latestSettledTennisDay = tennisModelDays.find((day) => {
    const graded = numberOrNull(day.settlementModel?.settlement?.gradedCount) ?? 0
    return graded > 0
  })
  const currentBacktestAccuracy = selectedBacktestPct(currentRun)
  const selectedPredictionAccuracy = pctFromSettlement(selectedModel?.latest?.settlement)
  const selectedBacktestAccuracy = selectedBacktestPct(selectedModel)
  const selectedModelCard = selectedModel?.latest?.modelDescription ||
    selectedModel?.components?.find((component) => component.model.modelDescription)?.model.modelDescription ||
    null
  const selectedTennisModelCard =
    selectedTennisDirectoryDays.flatMap((day) => day.models).find((model) => model.modelDescription)?.modelDescription ||
    selectedModelCard
  const accuracyDelta =
    selectedPredictionAccuracy !== null && selectedBacktestAccuracy !== null
      ? selectedPredictionAccuracy - selectedBacktestAccuracy
      : null

  const summaryCards = activeSport === 'tennis'
    ? [
        {
          label: 'Current Tennis Model',
          value: selectedTennisDirectory?.id || currentRun?.latest?.modelName || 'TEN-T0',
          detail: selectedTennisDirectory?.version || currentRun?.latest?.version || 'TEN-W1 / TEN-F0 / TEN-T0 / TEN-E0'
        },
        {
          label: 'Prediction Dates',
          value: String(selectedTennisDirectoryDays.length),
          detail: selectedTennisDirectory?.latestDay
            ? `${selectedTennisDirectory.id}: latest ${selectedTennisDirectory.latestDay.date} · ${tennisDayStatusLabel(selectedTennisDirectory.latestDay)}`
            : 'No tennis dates exported'
        },
        {
          label: 'Latest Settled Date',
          value: latestSettledTennisDay?.date || 'None',
          detail: latestSettledTennisDay ? tennisDayBestLabel(latestSettledTennisDay) : 'Waiting for settled tennis rows'
        },
        {
          label: 'Backtest Accuracy',
          value: currentBacktestAccuracy === null || currentBacktestAccuracy === undefined
            ? 'Pending'
            : formatPercent(currentBacktestAccuracy),
          detail: selectedBacktestLabel(currentRun) || latestKalshi?.model?.performanceLabel || 'No backtest metric exported'
        }
      ]
    : [
        {
          label: 'Current MLB Model',
          value: mlbCatalog[0]?.latest?.modelName || 'MLB-M0',
          detail: mlbCatalog[0]?.latest?.version || 'MLB-W1 / MLB-F0 / MLB-M0 / MLB-RP36 / MLB-E0'
        },
        {
          label: 'Models',
          value: String(mlbCatalog.length),
          detail: mlbCatalog[0]?.latestDay
            ? `Latest ${mlbCatalog[0].latestDay.date} · ${modelStatus(mlbCatalog[0])}`
            : 'Waiting on MLB model history'
        },
        {
          label: 'Prediction Accuracy',
          value: selectedBacktestPct(mlbCatalog[0]) === null ? 'Pending' : formatPercent(selectedBacktestPct(mlbCatalog[0])),
          detail: selectedBacktestLabel(mlbCatalog[0])
        },
        {
          label: 'Relief Addendum',
          value: 'MLB-RP36',
          detail: 'Consumed by MLB-M0 for bullpen and bridge-risk context'
        }
      ]

  return (
    <div className="models-dashboard">
      <section className="models-dashboard-hero">
        <div>
          <span className="models-eyebrow">Model Registry</span>
          <h2>Prediction model dashboard</h2>
          <p>Tennis and MLB now show model cartridges, day-by-day settlement, lane components, and the active run metadata as the migrations progress.</p>
        </div>
        <div className="models-sport-switch" role="tablist" aria-label="Model sport selector">
          {(['tennis', 'mlb'] as const).map((sport) => (
            <button
              key={sport}
              type="button"
              className={activeSport === sport ? 'active' : ''}
              onClick={() => setActiveSport(sport)}
            >
              {sportLabel(sport)}
              <span>{sport === 'tennis' ? tennisCatalog.length : mlbCatalog.length}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="models-summary-strip">
        {summaryCards.map((card) => (
          <article key={card.label} className="models-summary-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.detail}</small>
          </article>
        ))}
      </section>

      <div className="models-dashboard-grid">
        <aside className="models-catalog-panel">
          <div className="models-panel-heading">
            <span>{activeSport === 'tennis' ? 'Model Directory' : `${sportLabel(activeSport)} Models`}</span>
            <strong>{activeSport === 'tennis' ? tennisModelDirectories.length : catalog.length}</strong>
          </div>
          {!modelHistoryLoaded && activeSport === 'tennis' ? (
            <p className="models-muted">Loading model registry...</p>
          ) : null}
          <div className="models-catalog-list">
            {activeSport === 'tennis'
              ? tennisModelDirectories.map((directory) => (
                  <div key={directory.id} className={`models-directory ${selectedTennisDirectory?.id === directory.id ? 'active' : ''}`}>
                    <button
                      type="button"
                      className="models-directory-header"
                      onClick={() => {
                        setSelectedTennisModelId(directory.id)
                        setSelectedTennisDayId(directory.days[0]?.id || '')
                      }}
                    >
                      <span>
                        <b>▾</b>
                        {directory.name}
                      </span>
                      <strong>{directory.days.length}</strong>
                      <small>{directory.version || directory.status}</small>
                    </button>
                    <div className="models-directory-children">
                      {directory.days.map((day) => (
                        <button
                          key={`${directory.id}-${day.id}`}
                          type="button"
                          className={`models-catalog-button models-date-child ${selectedTennisDirectory?.id === directory.id && selectedTennisDay?.id === day.id ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedTennisModelId(directory.id)
                            setSelectedTennisDayId(day.id)
                          }}
                        >
                          <span>{day.date}</span>
                          <strong>{tennisDayStatusLabel(day)}</strong>
                          <small>{tennisDayBestLabel(day)}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              : catalog.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    className={`models-catalog-button ${selectedModel?.id === model.id ? 'active' : ''}`}
                    onClick={() => setSelectedModelId(model.id)}
                  >
                    <span>{model.name}</span>
                    <strong>{model.lane}</strong>
                    <small>{model.stub ? model.stubStatus : model.latest?.performanceLabel || model.latestDay?.label}</small>
                  </button>
                ))}
          </div>
        </aside>

        <section className="models-detail-panel">
          {selectedModel ? (
            <>
              <div className="models-detail-header">
                <div>
                  <span className={`models-sport-pill ${selectedModel.sport}`}>{sportLabel(selectedModel.sport)}</span>
                  <h3>{activeSport === 'tennis' ? `${selectedTennisDirectory?.id || currentRun?.latest?.modelName || 'TEN-T0'} prediction history · ${selectedTennisDay?.date || 'No date'}` : selectedModel.name}</h3>
                  <p>
                    {activeSport === 'tennis'
                      ? 'Day-by-day tennis model predictions and grades. Pending dates stay in the history rail until results are imported.'
                      : selectedModel.description}
                  </p>
                </div>
                <div className="models-status-block">
                  <span>Status</span>
                  <strong>{activeSport === 'tennis' ? selectedTennisDay?.status || 'Missing' : modelStatus(selectedModel)}</strong>
                </div>
              </div>

              <div className="models-kpi-grid">
                <article>
                  <span>{activeSport === 'tennis' ? 'Prediction Date' : 'Prediction Accuracy'}</span>
                  <strong>
                    {activeSport === 'tennis'
                      ? selectedTennisDay?.date || 'Missing'
                      : selectedPredictionAccuracy === null ? 'Pending' : formatPercent(selectedPredictionAccuracy)}
                  </strong>
                  <small>{activeSport === 'tennis' ? tennisDayStatusLabel(selectedTennisDay) : rowCountLabel(selectedModel.latest)}</small>
                </article>
                <article>
                  <span>{activeSport === 'tennis' ? 'Settled Hit Rate' : 'Backtest Accuracy'}</span>
                  <strong>
                    {activeSport === 'tennis'
                      ? selectedTennisHitPct !== null
                        ? formatPercent(selectedTennisHitPct)
                        : 'Pending'
                      : selectedBacktestAccuracy === null ? 'Pending' : formatPercent(selectedBacktestAccuracy)}
                  </strong>
                  <small>{activeSport === 'tennis' ? `${selectedTennisSettlement?.gradedCount ?? 0}/${selectedTennisSettlement?.rowCount ?? 0} rows graded` : selectedBacktestLabel(selectedModel)}</small>
                </article>
                <article>
                  <span>{activeSport === 'tennis' ? 'Prediction Market' : 'Prediction vs Backtest'}</span>
                  <strong>
                    {activeSport === 'tennis'
                      ? numberOrNull(selectedTennisDay?.models.find((model) => /prediction-market/i.test(model.lane || ''))?.performancePct) !== null
                        ? formatPercent(selectedTennisDay?.models.find((model) => /prediction-market/i.test(model.lane || ''))?.performancePct)
                        : 'Pending'
                      : accuracyDelta === null ? 'Pending' : `${accuracyDelta >= 0 ? '+' : ''}${accuracyDelta.toFixed(1)} pts`}
                  </strong>
                  <small>{activeSport === 'tennis' ? tennisDayKalshiLabel(selectedTennisDay) : accuracyDelta === null ? 'Needs settled rows' : 'Prediction hit rate minus backtest rate'}</small>
                </article>
                <article>
                  <span>{activeSport === 'tennis' ? 'Model Backtest' : 'Last Updated'}</span>
                  <strong>
                    {activeSport === 'tennis'
                      ? currentBacktestAccuracy === null || currentBacktestAccuracy === undefined ? 'Pending' : formatPercent(currentBacktestAccuracy)
                      : latestDateLabel(selectedModel, formatSnapshotTime)}
                  </strong>
                  <small>{activeSport === 'tennis' ? selectedBacktestLabel(currentRun) : selectedModel.latest?.run?.runId || selectedModel.latestDay?.date || 'Stub only'}</small>
                </article>
              </div>

              {activeSport === 'tennis' && selectedTennisDay ? (
                <section className="models-detail-section models-selected-date-section">
                  <div className="models-section-title">
                    <span>Selected Date Snapshot</span>
                    <small>{selectedTennisDay.date}</small>
                  </div>
                  <div className="models-date-summary-grid">
                    <article>
                      <span>Status</span>
                      <strong>{tennisDayStatusLabel(selectedTennisDay)}</strong>
                      <small>{selectedTennisRunModel ? selectedTennisRunModel.run?.runId || 'Locked cartridge run' : 'Pre-cartridge prediction date'}</small>
                    </article>
                    <article>
                      <span>Winner / ML</span>
                      <strong>{selectedTennisWinnerModel?.performancePct !== null && selectedTennisWinnerModel?.performancePct !== undefined ? formatPercent(selectedTennisWinnerModel.performancePct) : 'Pending'}</strong>
                      <small>{laneSummaryLabel(selectedTennisWinnerModel)}</small>
                    </article>
                    <article>
                      <span>Prediction Market</span>
                      <strong>{selectedTennisKalshiModel?.performancePct !== null && selectedTennisKalshiModel?.performancePct !== undefined ? formatPercent(selectedTennisKalshiModel.performancePct) : 'Pending'}</strong>
                      <small>{laneSummaryLabel(selectedTennisKalshiModel)}</small>
                    </article>
                    <article>
                      <span>Settlement Rows</span>
                      <strong>{selectedTennisSettlement ? `${selectedTennisSettlement.gradedCount}/${selectedTennisSettlement.rowCount}` : 'No rows'}</strong>
                      <small>{tennisSettlementFootnote(selectedTennisSettlement)}</small>
                    </article>
                  </div>
                </section>
              ) : null}

              {activeSport !== 'tennis' && selectedModelCard ? (
                <section className="models-detail-section models-notes-section">
                  <div className="models-section-title">
                    <span>Model Notes</span>
                    <small>{selectedModelCard.modelId || selectedModel.latest?.modelName || selectedModel.id}</small>
                  </div>
                  {selectedModelCard.summary ? <p className="models-note-summary">{selectedModelCard.summary}</p> : null}
                  <div className="models-notes-grid">
                    <div className="models-note-panel">
                      <strong>Key Improvements</strong>
                      <ul>
                        {(selectedModelCard.keyImprovements || []).map((item, index) => (
                          <li key={`${selectedModel.id}-improvement-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="models-note-panel">
                      <strong>Key Metrics</strong>
                      <div className="models-note-metrics">
                        {(selectedModelCard.keyMetrics || []).map((metric) => (
                          <span key={`${selectedModel.id}-${metric.label}`}>
                            <b>{metric.value}</b>
                            <em>{metric.label}</em>
                            {metric.details ? <small>{metric.details}</small> : null}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="models-note-panel">
                      <strong>Notes</strong>
                      <ul>
                        {(selectedModelCard.notes || []).map((item, index) => (
                          <li key={`${selectedModel.id}-note-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="models-note-panel">
                      <strong>Known Limitations</strong>
                      <ul>
                        {(selectedModelCard.knownLimitations || []).map((item, index) => (
                          <li key={`${selectedModel.id}-limit-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="models-detail-section">
                <div className="models-section-title">
                  <span>{activeSport === 'tennis' ? 'Prediction Date Lanes' : 'Model Lanes'}</span>
                  <small>{activeSport === 'tennis' ? selectedTennisDay?.models.length || 0 : selectedModel.components?.length || 0} tracked</small>
                </div>
                {activeSport === 'tennis' && selectedTennisDay?.models.length ? (
                  <div className="models-component-table">
                    <div className="models-component-row header">
                      <span>Lane</span>
                      <span>Component</span>
                      <span>Latest</span>
                      <span>Metric</span>
                    </div>
                    {selectedTennisDay.models.map((model) => (
                      <div key={`${selectedTennisDay.id}-${model.lane}-${model.modelName}`} className="models-component-row">
                        <span>{model.lane}</span>
                        <span>{model.modelName || 'model'}</span>
                        <span>{selectedTennisDay.date}</span>
                        <span>{laneSummaryLabel(model)}</span>
                      </div>
                    ))}
                  </div>
                ) : selectedModel.components?.length ? (
                  <div className="models-component-table">
                    <div className="models-component-row header">
                      <span>Lane</span>
                      <span>Component</span>
                      <span>Latest</span>
                      <span>Metric</span>
                    </div>
                    {selectedModel.components.map(({ day, model }) => (
                      <div key={`${selectedModel.id}-${day.id}-${model.lane}-${model.modelName}`} className="models-component-row">
                        <span>{model.lane}</span>
                        <span>{model.modelName || 'model'}</span>
                        <span>{day.date}</span>
                        <span>{backtestLabel(model)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="models-muted">No lane/component rows exported for this model yet.</p>
                )}
              </section>

              <div className="models-detail-columns">
                <section className="models-detail-section">
                  <div className="models-section-title">
                    <span>Metadata</span>
                    <small>{(activeSport === 'tennis' ? selectedTennisPrimary?.version || selectedTennisPrimary?.modelName : selectedModel.latest?.version || selectedModel.latest?.modelName) || 'Stub'}</small>
                  </div>
                  <dl className="models-metadata-grid">
                    <div>
                      <dt>Model</dt>
                      <dd>{activeSport === 'tennis' ? selectedTennisPrimary?.modelName || currentRun?.latest?.modelName || 'TEN-T0' : selectedModel.latest?.modelName || selectedModel.name}</dd>
                    </div>
                    <div>
                      <dt>Lane</dt>
                      <dd>{activeSport === 'tennis' ? selectedTennisPrimary?.lane || 'Prediction date' : selectedModel.lane}</dd>
                    </div>
                    <div>
                      <dt>Version</dt>
                      <dd>{(activeSport === 'tennis' ? selectedTennisPrimary?.version : selectedModel.latest?.version) || 'Not versioned'}</dd>
                    </div>
                    <div>
                      <dt>Coverage</dt>
                      <dd>{(activeSport === 'tennis' ? selectedTennisPrimary?.coverageLabel : selectedModel.latest?.coverageLabel) || 'Not exported'}</dd>
                    </div>
                    <div>
                      <dt>Source Hash</dt>
                      <dd>{compactHash(activeSport === 'tennis' ? selectedTennisPrimary?.run?.sourceHash : selectedModel.latest?.run?.sourceHash)}</dd>
                    </div>
                    <div>
                      <dt>Input Hash</dt>
                      <dd>{compactHash(activeSport === 'tennis' ? selectedTennisPrimary?.run?.inputHash : selectedModel.latest?.run?.inputHash)}</dd>
                    </div>
                    <div>
                      <dt>Output Hash</dt>
                      <dd>{compactHash(activeSport === 'tennis' ? selectedTennisPrimary?.run?.outputHash : selectedModel.latest?.run?.outputHash)}</dd>
                    </div>
                    <div>
                      <dt>Health Gates</dt>
                      <dd>
                        {(activeSport === 'tennis' ? selectedTennisPrimary?.run : selectedModel.latest?.run)
                          ? `${(activeSport === 'tennis' ? selectedTennisPrimary?.run?.healthChecksOk : selectedModel.latest?.run?.healthChecksOk) ?? 0}/${(activeSport === 'tennis' ? selectedTennisPrimary?.run?.healthChecks : selectedModel.latest?.run?.healthChecks) ?? 0}`
                          : 'Not migrated'}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="models-detail-section">
                  <div className="models-section-title">
                    <span>Settlement Lanes</span>
                    <small>{(activeSport === 'tennis' ? selectedTennisSettlement?.status : selectedModel.latest?.settlement?.status) || 'Pending'}</small>
                  </div>
                  {(activeSport === 'tennis' ? selectedTennisSettlement?.lanes : selectedModel.latest?.settlement?.lanes)?.length ? (
                    <div className="models-lane-table">
                      <div className="models-lane-row header">
                        <span>Lane</span>
                        <span>Rows</span>
                        <span>Hit</span>
                        <span>P/L</span>
                      </div>
                      {(activeSport === 'tennis' ? selectedTennisSettlement?.lanes : selectedModel.latest?.settlement?.lanes)?.map((lane) => (
                        <div key={`${selectedModel.id}-${lane.lane}`} className="models-lane-row">
                          <span>{lane.lane}</span>
                          <span>{lane.graded}/{lane.rows}</span>
                          <span>{lane.hitPct === null || lane.hitPct === undefined ? 'Pending' : formatPercent(lane.hitPct)}</span>
                          <span>{pnlLabel(lane.avgPnlPer100)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="models-muted">No settlement lanes exported for this model yet.</p>
                  )}
                </section>
              </div>

              {activeSport !== 'tennis' && selectedModel.validation?.length ? (
                <section className="models-detail-section">
                  <div className="models-section-title">
                    <span>Pre-Cartridge Validation</span>
                    <small>{selectedModel.validation.length} rows</small>
                  </div>
                  <p className="models-note-summary">
                    These rows are settled lane evidence around the active cartridge. They are useful for validation; release status comes from explicit model activation, not file locks.
                  </p>
                  <div className="models-history-table">
                    <div className="models-history-row header">
                      <span>Date</span>
                      <span>Lane</span>
                      <span>Performance</span>
                      <span>Status</span>
                    </div>
                    {selectedModel.validation.slice(0, 8).map(({ day, model }) => (
                      <div key={`${selectedModel.id}-validation-${day.id}-${model.lane}`} className="models-history-row">
                        <span>{day.date}</span>
                        <span>{model.lane}</span>
                        <span>{model.performanceLabel || backtestLabel(model)}</span>
                        <span>{model.settlement?.status || 'backtest'}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="models-detail-section">
                <div className="models-section-title">
                  <span>{activeSport === 'tennis' ? 'Prediction Date History' : 'Model History'}</span>
                  <small>{activeSport === 'tennis' ? selectedTennisDirectoryDays.length : selectedModel.history.length || 'Stub'}</small>
                </div>
                {activeSport === 'tennis' && selectedTennisDirectoryDays.length ? (
                  <div className="models-history-table">
                    <div className="models-history-row header">
                      <span>Date</span>
                      <span>Performance</span>
                      <span>Coverage</span>
                      <span>Status</span>
                    </div>
                    {selectedTennisDirectoryDays.slice(0, 10).map((day) => (
                      <button
                        key={`${selectedModel.id}-day-history-${day.id}`}
                        type="button"
                        className={`models-history-row models-history-button ${selectedTennisDay?.id === day.id ? 'active' : ''}`}
                        onClick={() => setSelectedTennisDayId(day.id)}
                      >
                        <span>{day.date}</span>
                        <span>{tennisDayBestLabel(day)}</span>
                        <span>{day.primary?.coverageLabel || 'No coverage'}</span>
                        <span>{tennisDayStatusLabel(day)}</span>
                      </button>
                    ))}
                  </div>
                ) : selectedModel.history.length ? (
                  <div className="models-history-table">
                    <div className="models-history-row header">
                      <span>Date</span>
                      <span>Performance</span>
                      <span>Coverage</span>
                      <span>Status</span>
                    </div>
                    {selectedModel.history.slice(0, 8).map(({ day, model }) => (
                      <div key={`${selectedModel.id}-${day.id}`} className="models-history-row">
                        <span>{day.date}</span>
                        <span>{model.performanceLabel || 'Pending'}</span>
                        <span>{model.coverageLabel || 'No coverage'}</span>
                        <span>{model.settlement?.status || day.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="models-muted">MLB will be filled in when its cartridge migration starts.</p>
                )}
              </section>

              {activeSport === 'tennis' && selectedTennisModelCard ? (
                <section className="models-detail-section models-notes-section">
                  <div className="models-section-title">
                    <span>Global Model Card</span>
                    <small>{selectedTennisModelCard.modelId || selectedTennisDirectory?.id || selectedModel.latest?.modelName || selectedModel.id}</small>
                  </div>
                  {selectedTennisModelCard.summary ? <p className="models-note-summary">{selectedTennisModelCard.summary}</p> : null}
                  <div className="models-notes-grid">
                    <div className="models-note-panel">
                      <strong>Key Improvements</strong>
                      <ul>
                        {(selectedTennisModelCard.keyImprovements || []).map((item, index) => (
                          <li key={`${selectedModel.id}-global-improvement-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="models-note-panel">
                      <strong>Key Metrics</strong>
                      <div className="models-note-metrics">
                        {(selectedTennisModelCard.keyMetrics || []).map((metric) => (
                          <span key={`${selectedModel.id}-global-${metric.label}`}>
                            <b>{metric.value}</b>
                            <em>{metric.label}</em>
                            {metric.details ? <small>{metric.details}</small> : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="models-detail-section">
                <div className="models-section-title">
                  <span>Changelog And Artifacts</span>
                  <small>{(activeSport === 'tennis' ? selectedTennisPrimary?.artifacts?.length : selectedModel.latest?.artifacts?.length) || 0} artifacts</small>
                </div>
                <div className="models-log-grid">
                  <ul>
                    {((activeSport === 'tennis' ? selectedTennisPrimary?.changelog : selectedModel.latest?.changelog) || [selectedModel.description || 'No changelog exported yet.']).map((line, index) => (
                      <li key={`${selectedModel.id}-log-${index}`}>{line}</li>
                    ))}
                  </ul>
                  <div className="models-artifact-list">
                    {((activeSport === 'tennis' ? selectedTennisPrimary?.artifacts : selectedModel.latest?.artifacts) || []).map((artifact) => (
                      <span key={`${selectedModel.id}-${artifact.label}-${artifact.role || ''}`}>
                        {artifact.label}
                        <small>{artifact.role || 'artifact'}</small>
                      </span>
                    ))}
                    {!(activeSport === 'tennis' ? selectedTennisPrimary?.artifacts?.length : selectedModel.latest?.artifacts?.length) ? <span>No artifacts published yet</span> : null}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <p className="models-muted">No models exported yet.</p>
          )}
        </section>
      </div>
    </div>
  )
}

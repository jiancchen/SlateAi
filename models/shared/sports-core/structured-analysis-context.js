import { structuredInputOverrides } from './structured-inputs.js'
import { average, clamp, normalizeText, parseRecord } from './core-utils.js'
import { computeNoVigProbabilities } from './market-utils.js'
import { buildMarketSignal, createSignal } from './signal-utils.js'

const sportVolatilityBase = {
  MLB: 52,
  UFC: 60,
  NBA: 54,
  WNBA: 60
}

const detectWeightClass = (text = '') => {
  const normalized = normalizeText(text)

  for (const weightClass of ['flyweight', 'bantamweight', 'featherweight', 'lightweight', 'welterweight', 'middleweight', 'light heavyweight', 'heavyweight']) {
    if (normalized.includes(weightClass)) return weightClass
  }

  return ''
}

const applyProfileDelta = (profile, delta) => {
  Object.entries(delta).forEach(([key, value]) => {
    profile[key] += value
  })
}

const buildFighterProfile = (detail = '', stage = '') => {
  const parts = detail.split('|').map((part) => part.trim()).filter(Boolean)
  const record = parseRecord(parts[0] || '')
  const descriptors = parts.slice(1)
  const descriptorText = normalizeText([stage, ...descriptors].join(' | '))
  const weightClass = detectWeightClass([stage, ...descriptors].join(' | '))
  const totalBouts = record?.totalBouts ?? 0
  const winPct = record?.winPct ?? 0.5

  const profile = {
    striking: 50,
    grappling: 50,
    pace: 50,
    durability: clamp(46 + winPct * 12 + Math.log(totalBouts + 1) * 4, 38, 86),
    finishing: 50,
    experience: clamp(40 + Math.log(totalBouts + 1) * 14, 36, 90),
    championship: 50
  }

  const descriptorRules = [
    [/former champion/, { experience: 14, durability: 6, pace: 4, championship: 12 }],
    [/champion/, { experience: 10, durability: 4, pace: 4, championship: 10 }],
    [/prospect/, { experience: -8, pace: 4, finishing: 3, championship: -6 }],
    [/elite/, { striking: 5, grappling: 5, pace: 4, durability: 4, finishing: 4, championship: 4 }],
    [/grappling|grappler|jiu jitsu|submission/, { grappling: 18, striking: -4, pace: 3, finishing: 4 }],
    [/control/, { grappling: 12, pace: 5, durability: 3 }],
    [/striker|striking|boxer|jab/, { striking: 16, grappling: -6 }],
    [/pressure/, { striking: 5, pace: 9, durability: 4 }],
    [/explosive|power/, { striking: 6, finishing: 16, pace: -3 }],
    [/range|rangy|tall/, { striking: 9, durability: 3 }],
    [/southpaw/, { striking: 4 }],
    [/volume|pace/, { pace: 12, durability: 4, championship: 3 }],
    [/dynamic|freestyle/, { striking: 4, grappling: 6, finishing: 4 }],
    [/winning profile/, { experience: 8, durability: 5, championship: 4 }],
    [/fight week spotlight/, { pace: 2, finishing: 2 }]
  ]

  descriptorRules.forEach(([pattern, delta]) => {
    if (pattern.test(descriptorText)) applyProfileDelta(profile, delta)
  })

  if (record?.losses === 0) {
    applyProfileDelta(profile, { durability: 4, championship: 4 })
  }

  if (winPct >= 0.82) {
    applyProfileDelta(profile, { durability: 3, championship: 4 })
  }

  if (totalBouts >= 25) {
    applyProfileDelta(profile, { experience: 6, durability: 4 })
  }

  if (weightClass === 'heavyweight') {
    applyProfileDelta(profile, { finishing: 8, pace: -2 })
  }

  Object.keys(profile).forEach((key) => {
    profile[key] = clamp(profile[key], 24, 94)
  })

  return {
    ...record,
    weightClass,
    descriptors,
    profile
  }
}

const buildUfcAnalysisContext = (game, participants) => {
  const fighters = participants.map((participant) => buildFighterProfile(participant.detail, game.stage))
  const signals = [buildMarketSignal(game.league, participants)].filter(Boolean)
  const volatilityModifiers = []
  const isTitleFight = /title fight|main event/i.test(game.stage)
  const marketProbabilities = computeNoVigProbabilities(
    participants.map((participant) => participant.americanOdds)
  )

  if (fighters.every(Boolean)) {
    signals.push(
      createSignal(
        'Win profile',
        0.12,
        fighters.map((fighter) => ({
          label: fighter ? `${fighter.wins}-${fighter.losses}${fighter.draws ? `-${fighter.draws}` : ''}` : 'Record unavailable',
          score: fighter
            ? clamp(34 + fighter.winPct * 46 + Math.log(fighter.totalBouts + 1) * 6, 24, 90)
            : 50
        })),
        'Listed fight records'
      )
    )

    signals.push(
      createSignal(
        'Striking profile',
        0.12,
        fighters.map((fighter) => ({
          label: fighter.descriptors[0] || 'Style note unavailable',
          score: fighter.profile.striking
        })),
        'Structured fighter profile'
      )
    )

    signals.push(
      createSignal(
        'Control and grappling',
        0.18,
        fighters.map((fighter) => ({
          label: fighter.descriptors.at(-1) || 'Style note unavailable',
          score: fighter.profile.grappling
        })),
        'Structured fighter profile'
      )
    )

    signals.push(
      createSignal(
        'Pace and cardio',
        0.11,
        fighters.map((fighter) => ({
          label: fighter.weightClass || 'Open-weight pace note',
          score: fighter.profile.pace
        })),
        'Structured fighter profile'
      )
    )

    signals.push(
      createSignal(
        'Durability and experience',
        0.14,
        fighters.map((fighter) => ({
          label: `${fighter.totalBouts} pro bouts`,
          score: average([fighter.profile.durability, fighter.profile.experience])
        })),
        'Structured fighter profile'
      )
    )

    signals.push(
      createSignal(
        'Finishing danger',
        0.11,
        fighters.map((fighter) => ({
          label: fighter.descriptors.join(' | ') || 'Finish profile unavailable',
          score: fighter.profile.finishing
        })),
        'Structured fighter profile'
      )
    )

    if (isTitleFight) {
      signals.push(
        createSignal(
          'Championship composure',
          0.1,
          fighters.map((fighter) => ({
            label: fighter.descriptors.join(' | ') || 'Five-round read',
            score: fighter.profile.championship
          })),
          'Structured fighter profile'
        )
      )
    }

    if (fighters.some((fighter) => fighter.weightClass === 'heavyweight')) {
      volatilityModifiers.push({ label: 'Heavyweight finishing volatility', delta: 8 })
    }

    if (average(fighters.map((fighter) => fighter.profile.finishing)) >= 76) {
      volatilityModifiers.push({ label: 'Both sides bring real finish equity', delta: 6 })
    }

    if (isTitleFight) {
      volatilityModifiers.push({ label: 'Championship rounds add adaptation variance', delta: 4 })
    }

    if (Math.abs(fighters[0].profile.grappling - fighters[1].profile.grappling) >= 20) {
      volatilityModifiers.push({ label: 'Major control split can swing rounds fast', delta: 4 })
    }

    if (fighters.every((fighter) => fighter.totalBouts <= 20)) {
      volatilityModifiers.push({ label: 'Younger career samples leave more unknowns', delta: 4 })
    }

    if (marketProbabilities.length === participants.length && Math.max(...marketProbabilities) >= 0.68) {
      volatilityModifiers.push({ label: 'Market favorite is clearly established', delta: -6 })
    }
  }

  return {
    sourceLabel: 'Moneyline + structured fighter profiles',
    signals,
    volatilityBase: sportVolatilityBase.UFC,
    volatilityModifiers
  }
}

const buildOverrideAnalysisContext = (game, participants) => {
  const override = structuredInputOverrides[game.id]

  if (!override) return null

  return {
    sourceLabel: override.sourceLabel || 'Moneyline + local structured inputs',
    signals: [buildMarketSignal(game.league, participants), ...(override.signals || [])].filter(Boolean),
    volatilityBase: override.volatility?.base ?? sportVolatilityBase[game.league] ?? 55,
    volatilityModifiers: override.volatility?.modifiers ?? []
  }
}

export const createStructuredAnalysisContextBuilder = ({
  buildMlbAnalysisContext = null
} = {}) => (game, participants) => {
  if (game.league === 'MLB') {
    return typeof buildMlbAnalysisContext === 'function'
      ? buildMlbAnalysisContext(game, participants)
      : null
  }

  if (game.league === 'UFC') return buildUfcAnalysisContext(game, participants)
  if (game.league === 'NBA' || game.league === 'WNBA') {
    return buildOverrideAnalysisContext(game, participants)
  }

  return null
}

export const buildStructuredAnalysisContext = createStructuredAnalysisContextBuilder()

export {
  buildOverrideAnalysisContext,
  buildUfcAnalysisContext,
  sportVolatilityBase
}

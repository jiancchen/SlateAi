import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const rootDir = path.resolve(import.meta.dirname, '..')

const readJson = async (relativePath) => {
  const absolute = path.resolve(rootDir, relativePath)
  return JSON.parse(await fs.readFile(absolute, 'utf8'))
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    plan: '',
    sport: '',
    date: '',
    dryRun: false,
    listSteps: false,
    steps: new Set()
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--plan') {
      options.plan = args[index + 1] || ''
      index += 1
    } else if (arg === '--sport') {
      options.sport = String(args[index + 1] || '').toLowerCase()
      index += 1
    } else if (arg === '--date') {
      options.date = args[index + 1] || ''
      index += 1
    } else if (arg === '--step') {
      options.steps.add(args[index + 1] || '')
      index += 1
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--list-steps') {
      options.listSteps = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  return options
}

const getByPath = (value, dottedPath) => dottedPath
  .split('.')
  .reduce((current, key) => (current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined), value)

const renderValue = (value, context) => {
  if (typeof value === 'string') {
    return value.replace(/\$\{([^}]+)\}/g, (_match, token) => {
      const resolved = getByPath(context, token.trim())
      if (resolved === undefined || resolved === null) {
        throw new Error(`Run-plan token could not be resolved: ${token}`)
      }
      return String(resolved)
    })
  }
  if (Array.isArray(value)) return value.map((entry) => renderValue(entry, context))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, renderValue(nested, context)]))
  }
  return value
}

const validatePlan = (plan, planPath) => {
  const errors = []
  if (!plan || typeof plan !== 'object') errors.push('plan must be an object')
  if (!plan.schemaVersion) errors.push('schemaVersion is required')
  if (!plan.id) errors.push('id is required')
  if (!plan.sport) errors.push('sport is required')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(plan.date || ''))) errors.push('date must be YYYY-MM-DD')
  if (!plan.models || typeof plan.models !== 'object') errors.push('models object is required')
  if (!Array.isArray(plan.steps)) errors.push('steps array is required')
  for (const [index, step] of (plan.steps || []).entries()) {
    if (!step.id) errors.push(`steps[${index}].id is required`)
    if (!step.command) errors.push(`steps[${index}].command is required`)
    if (step.args && !Array.isArray(step.args)) errors.push(`steps[${index}].args must be an array`)
  }
  if (errors.length) {
    throw new Error(`Invalid run plan ${planPath}:\n- ${errors.join('\n- ')}`)
  }
}

const resolvePlanPath = async (options) => {
  if (options.plan) return options.plan
  if (options.sport && options.date) return `run-plans/${options.sport}/${options.date}.json`
  if (options.sport) {
    const active = await readJson('run-plans/active.json')
    const planPath = active.activePlans?.[options.sport]
    if (!planPath) throw new Error(`No active run plan configured for ${options.sport}`)
    return planPath
  }
  throw new Error('Pass --plan PATH, or --sport SPORT with optional --date YYYY-MM-DD')
}

const resolveSteps = (plan, options) => {
  const selected = (plan.steps || []).filter((step) => step.enabled !== false)
  if (!options.steps.size) return selected
  return selected.filter((step) => options.steps.has(step.id))
}

const runStep = (step, env) => new Promise((resolve, reject) => {
  const child = spawn(step.command, step.args || [], {
    cwd: rootDir,
    stdio: 'inherit',
    env
  })
  child.on('error', reject)
  child.on('close', (code) => {
    if (code === 0) resolve()
    else reject(new Error(`Run-plan step failed (${code}): ${step.id}`))
  })
})

const main = async () => {
  const options = parseArgs()
  const planPath = await resolvePlanPath(options)
  const plan = await readJson(planPath)
  validatePlan(plan, planPath)
  const context = {
    ...plan,
    plan,
    models: plan.models || {},
    outputs: plan.outputs || {}
  }
  const steps = resolveSteps(plan, options).map((step) => renderValue(step, context))
  if (options.steps.size && steps.length !== options.steps.size) {
    const found = new Set(steps.map((step) => step.id))
    const missing = Array.from(options.steps).filter((step) => !found.has(step))
    throw new Error(`Run-plan step(s) not found or disabled: ${missing.join(', ')}`)
  }
  if (options.listSteps || options.dryRun) {
    console.log(JSON.stringify({
      planPath,
      id: plan.id,
      sport: plan.sport,
      date: plan.date,
      status: plan.status,
      models: plan.models,
      steps: steps.map((step) => ({
        id: step.id,
        command: step.command,
        args: step.args || [],
        description: step.description || ''
      }))
    }, null, 2))
    if (options.dryRun) return
  }
  for (const step of steps) {
    console.log(`\n[run-plan] ${step.id}`)
    await runStep(step, {
      ...process.env,
      SPORT_RUN_PLAN_ID: plan.id,
      SPORT_RUN_PLAN_PATH: planPath,
      SPORT_RUN_PLAN_DATE: plan.date,
      SPORT_RUN_PLAN_SPORT: plan.sport,
      ...(renderValue(plan.env || {}, context)),
      ...(renderValue(step.env || {}, context))
    })
  }
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})

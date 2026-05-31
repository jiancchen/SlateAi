import {
  activeStack,
  gitInfo,
  readJson,
  rootDir,
  runDirFor,
  runIdFor,
  shellQuote,
  sqliteExec,
  sqliteJson,
  writeJson
} from '../../lib/model-run-utils.mjs'
import { resolveTennisCartridgeFile } from '../../lib/model-cartridge-resolver.mjs'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = { date: '', model: '', mode: 'pregame', status: 'created', notes: '', force: false }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = args[index + 1]
      index += 1
    } else if (arg === '--model') {
      options.model = String(args[index + 1] || '').toUpperCase()
      index += 1
    } else if (arg === '--mode') {
      options.mode = args[index + 1]
      index += 1
    } else if (arg === '--status') {
      options.status = args[index + 1]
      index += 1
    } else if (arg === '--notes') {
      options.notes = args[index + 1]
      index += 1
    } else if (arg === '--force') {
      options.force = true
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('Pass --date YYYY-MM-DD')
  return options
}

export const createRun = async (options) => {
  const stack = await activeStack({ model: options.model || null })
  const runId = runIdFor({ date: options.date, stack })
  const registry = await readJson('pipeline/tennis_model_registry.json', {})
  const manifestFile = await resolveTennisCartridgeFile({ modelId: stack.modelId, fileName: 'manifest.json' })
  const manifest = await readJson(manifestFile.path, {})
  const git = await gitInfo()
  const existingRows = await sqliteJson(`select status from tennis_model_runs where run_id = ${shellQuote(runId)} limit 1`)
  if (existingRows[0]?.status === 'locked' && !options.force) {
    throw new Error(`Run ${runId} is already locked. Pass --force only if you intend to rewrite the run shell.`)
  }
  const run = {
    schemaVersion: 1,
    runId,
    sport: 'tennis',
    slateDate: options.date,
    warehouseVersion: stack.warehouseVersion,
    featureVersion: stack.featureVersion,
    modelId: stack.modelId,
    evaluatorVersion: stack.evaluatorVersion,
    mode: options.mode,
    status: options.status,
    createdAt: new Date().toISOString(),
    lockedAt: null,
    git,
    registry: {
      path: registry.registryPath || 'models/tennis/registry.json',
      active: registry.active || null
    },
    modelManifest: {
      path: manifestFile.path,
      name: manifest.name || null,
      status: manifest.status || null
    },
    notes: options.notes || 'Created by create-tennis-model-run.mjs.'
  }
  const runDir = runDirFor({ model: stack.modelId, date: options.date })
  await writeJson(`${runDir}/run.json`, run)
  await sqliteExec(`
    insert into tennis_model_runs(
      run_id, slate_date, sport, warehouse_version, feature_version, model_id,
      evaluator_version, mode, status, git_commit, git_dirty, cartridge_stack_json, notes
    )
    values (
      ${shellQuote(runId)}, ${shellQuote(options.date)}, 'tennis',
      ${shellQuote(stack.warehouseVersion)}, ${shellQuote(stack.featureVersion)}, ${shellQuote(stack.modelId)},
      ${shellQuote(stack.evaluatorVersion)}, ${shellQuote(options.mode)}, ${shellQuote(options.status)},
      ${shellQuote(git.commit || '')}, ${git.dirty ? 1 : 0}, ${shellQuote(JSON.stringify(stack))}, ${shellQuote(run.notes)}
    )
    on conflict(run_id) do update set
      mode = excluded.mode,
      status = excluded.status,
      git_commit = excluded.git_commit,
      git_dirty = excluded.git_dirty,
      cartridge_stack_json = excluded.cartridge_stack_json,
      notes = excluded.notes
  `)
  return { run, runDir: `${rootDir}/${runDir}` }
}

const main = async () => {
  const options = parseArgs()
  const result = await createRun(options)
  console.log(JSON.stringify({ runId: result.run.runId, runDir: result.runDir, status: result.run.status }, null, 2))
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})

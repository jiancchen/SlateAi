import { runLegacyNode } from '../lib/legacy-runner.mjs'

runLegacyNode('pipeline/mlb/workflows/followup.mjs', process.argv.slice(2))

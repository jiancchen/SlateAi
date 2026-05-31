import { runLegacyNode } from '../lib/legacy-runner.mjs'

runLegacyNode('pipeline/mlb/workflows/verify-refresh.mjs', process.argv.slice(2))

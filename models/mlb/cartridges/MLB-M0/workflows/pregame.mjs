import { runLegacyNode } from '../lib/legacy-runner.mjs'

runLegacyNode('pipeline/mlb/workflows/pregame.mjs', process.argv.slice(2))

import { runLegacyNode } from '../lib/legacy-runner.mjs'

runLegacyNode('pipeline/mlb/workflows/refresh-live-board.mjs', process.argv.slice(2))

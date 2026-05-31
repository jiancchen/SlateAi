import { runLegacyNode } from '../lib/legacy-runner.mjs'

runLegacyNode('pipeline/mlb/publish/export-prop-predictions.mjs', process.argv.slice(2))

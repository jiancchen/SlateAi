import { runLegacyNode } from '../lib/legacy-runner.mjs'

runLegacyNode('pipeline/mlb/publish/export-home-run-predictions.mjs', process.argv.slice(2))

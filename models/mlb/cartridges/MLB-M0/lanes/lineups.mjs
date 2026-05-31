import { runLegacyNode } from '../lib/legacy-runner.mjs'

runLegacyNode('pipeline/mlb/publish/export-lineup-model.mjs', process.argv.slice(2))

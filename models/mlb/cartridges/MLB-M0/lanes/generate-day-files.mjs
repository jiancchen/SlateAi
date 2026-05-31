import { runLegacyNode } from '../lib/legacy-runner.mjs'

runLegacyNode('pipeline/mlb/publish/generate-day-files.mjs', process.argv.slice(2))

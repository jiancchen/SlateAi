import { runLegacyNode } from '../lib/legacy-runner.mjs'

runLegacyNode('pipeline/mlb/publish/export-history-journal.mjs', process.argv.slice(2))

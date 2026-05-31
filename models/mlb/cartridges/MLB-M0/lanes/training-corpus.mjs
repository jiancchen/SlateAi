import { runLegacyNode } from '../lib/legacy-runner.mjs'

runLegacyNode('pipeline/mlb/publish/export-training-corpus.mjs', process.argv.slice(2))

import { runLegacyNode } from '../lib/legacy-runner.mjs'

runLegacyNode('pipeline/mlb/publish/export-batting-impact.mjs', process.argv.slice(2))

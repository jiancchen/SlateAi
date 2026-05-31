import { runLegacyNode } from '../lib/legacy-runner.mjs'

runLegacyNode('pipeline/mlb/publish/export-veto-artifact.mjs', process.argv.slice(2))

const source = process.argv.slice(2).join(' ') || 'legacy tennis source'

console.error(`Blocked tennis source command: ${source}`)
console.error('Active tennis ingestion/export must use TennisLive warehouse rows only. Historical files remain for archive/backtest use.')
process.exit(1)

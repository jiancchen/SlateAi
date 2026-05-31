import { spawn } from 'node:child_process'
import { rootDir } from './lib/registry-utils.mjs'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = { left: '', right: '', date: '' }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--left') {
      options.left = String(args[index + 1] || '').toUpperCase()
      index += 1
    } else if (arg === '--right') {
      options.right = String(args[index + 1] || '').toUpperCase()
      index += 1
    } else if (arg === '--date') {
      options.date = args[index + 1] || ''
      index += 1
    }
  }
  if (!options.left || !options.right) throw new Error('Pass --left MLB-... --right MLB-...')
  if (options.date && !/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('Pass --date YYYY-MM-DD')
  return options
}

const pythonCode = String.raw`
import json
import sqlite3
import sys

left, right, date = sys.argv[1], sys.argv[2], sys.argv[3]
conn = sqlite3.connect("data-private/warehouse/sports.db")
conn.row_factory = sqlite3.Row
try:
    where_date = "and slate_date = ?" if date else ""
    params = [left, right] + ([date] if date else [])
    runs = conn.execute(f"""
      select run_id, model_id, slate_date, status, source_hash, input_hash, output_hash
      from model_runs
      where sport = 'mlb'
        and model_id in (?, ?)
        {where_date}
      order by slate_date, model_id
    """, params).fetchall()
    run_ids = [row["run_id"] for row in runs]
    lanes = []
    if run_ids:
        placeholders = ",".join("?" for _ in run_ids)
        lanes = conn.execute(f"""
          select run_id, lane, status, row_count, graded_count, hit_count, hit_pct, avg_pnl_per100
          from model_run_lanes
          where run_id in ({placeholders})
          order by run_id, lane
        """, run_ids).fetchall()
    lane_by_run = {}
    for row in lanes:
        lane_by_run.setdefault(row["run_id"], []).append(dict(row))
    print(json.dumps({
      "left": left,
      "right": right,
      "date": date or None,
      "runs": [dict(row) | {"lanes": lane_by_run.get(row["run_id"], [])} for row in runs]
    }, indent=2))
finally:
    conn.close()
`

const runPython = ({ left, right, date }) => new Promise((resolve) => {
  const child = spawn('python3', ['-c', pythonCode, left, right, date || ''], {
    cwd: rootDir,
    stdio: 'inherit'
  })
  child.on('exit', (code, signal) => resolve({ code: code ?? 1, signal }))
})

const main = async () => {
  const options = parseArgs()
  const result = await runPython(options)
  if (result.signal) process.kill(process.pid, result.signal)
  process.exitCode = result.code
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})

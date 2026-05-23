# Published Data

This directory holds generated JSON snapshots for the read-only API layer.

Current exports:

- `slates/index.json`
- `slates/YYYY-MM-DD.json`
- `history/index.json`
- `history/<entry-id>.json`
- `stories/index.json`
- `stories/YYYY-MM-DD.json`
- `meta.json`

Generate/update with:

```bash
npm run data:export:published
```

Notes:

- These files are transitional. They replace API imports of large TS/JS modules, but the payloads are still too large for ideal frontend delivery.
- The next contract pass should split daily board summaries from deep per-game detail so the browser stops loading the full rich slate object on first open.

# Vercel Deploy Checklist

Use this when you want to publish the frontend without exposing the private pipeline.

## Vercel Project Root

Point Vercel at:

- `web/`

Do **not** deploy from the repository root.

## Required Vercel Settings

- Framework preset: `Vite`
- Root directory: `web`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

The app also includes [vercel.json](/Users/jcchen/Documents/New%20project/web/vercel.json:1), so Vercel should detect the important build settings automatically once `web/` is the root.

## Before You Deploy

From the repository root:

```bash
npm run build
```

If you refreshed prediction data that day, run the relevant local pipeline commands first from the repository root, then deploy:

```bash
npm run data:prep:mlb-day -- --date YYYY-MM-DD --lookback-days 3
npm run data:generate:mlb-day -- --date YYYY-MM-DD
npm run data:export:mlb-lineups -- --date YYYY-MM-DD
npm run data:export:hr -- --date YYYY-MM-DD
npm run build
```

## What Vercel Should Ship

Only the frontend under `web/`:

- `src/`
- `public/`
- `index.html`
- `package.json`
- `vite.config.js`
- `vercel.json`

## What Should Stay Private

Do not expose these directories as part of the hosted app:

- `/Users/jcchen/Documents/New project/pipeline`
- `/Users/jcchen/Documents/New project/data-private`
- `/Users/jcchen/Documents/New project/research`

Those contain the local generator logic, warehouse, reports, JSONL ledgers, and operator notes.

## Deployment Model

This site is currently a **snapshot frontend**:

- local pipeline generates daily outputs
- frontend renders the generated outputs
- Vercel hosts the frontend only

If you want live server-side predictions later, that should be a separate backend or scheduled job, not part of the public Vercel app.

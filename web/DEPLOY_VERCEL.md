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
npm run publish:site
```

This is the command to run when you say "publish": it exports the public static bundle, builds `web/`, and deploys production to Vercel.

For a preflight that does everything except publish to Vercel, run:

```bash
npm run publish:site -- --date TODAY-YYYY-MM-DD --dry-run
```

The deploy script verifies the public two-day window, confirms the deploy root is `web/`, scans public JSON/assets for private paths, hashes `web/dist`, and writes `publish.json` for included tennis model runs after an actual production deploy.

By default, the active public slate is **today in America/Los_Angeles** when that slate exists, plus the next calendar day if that next slate exists. This matters once tomorrow's predictions are generated: the deploy should still make today the `/data/current/` slate while also shipping tomorrow under `/data/slates/NEXT-YYYY-MM-DD/`.

Before every deploy, verify the two-day window:

```bash
cat published-data/slates/index.json | grep -E '"id": "(TODAY-YYYY-MM-DD|NEXT-YYYY-MM-DD)"'
npm run data:export:public-current -- --date TODAY-YYYY-MM-DD
cat web/public/data/meta.json
npm run publish:site -- --date TODAY-YYYY-MM-DD --dry-run
```

The expected shape is:

```text
currentSlate.id = TODAY-YYYY-MM-DD
slates includes TODAY-YYYY-MM-DD
slates includes NEXT-YYYY-MM-DD when next day has been generated
```

To force the active slate:

```bash
npm run publish:site -- --date YYYY-MM-DD
```

The root build exports a rolling public bundle for today and tomorrow when both slates have been generated:

```text
web/public/data/current/
web/public/data/slates/YYYY-MM-DD/
web/public/data/meta.json
web/public/data/search.json
```

In Vercel production, the app reads those static files instead of calling the local `/api` service. `web/public/data/current/` points at today's active slate, while `web/public/data/slates/` can also carry tomorrow's slate for early lookahead. If you need to force the active slate date, run:

```bash
npm run publish:site -- --date YYYY-MM-DD
```

That forced date still exports the next calendar day too if it exists in `published-data/slates/`. Use `PUBLIC_EXTRA_SLATE_DATES=YYYY-MM-DD,YYYY-MM-DD` only when you intentionally want additional public days beyond the standard two-day window.

If you refreshed prediction data that day, run the relevant local pipeline commands first from the repository root, then deploy:

```bash
npm run data:prep:mlb-day -- --date YYYY-MM-DD --lookback-days 3
npm run data:generate:mlb-day -- --date YYYY-MM-DD
npm run data:export:mlb-lineups -- --date YYYY-MM-DD
npm run data:export:hr -- --date YYYY-MM-DD
npm run data:export:published
npm run publish:site -- --date YYYY-MM-DD
```

After production deploy, check the model run publish artifact:

```bash
cat data-private/model-runs/tennis/T0/YYYY-MM-DD/publish.json
```

## What Vercel Should Ship

Only the frontend under `web/`:

- `src/`
- `public/`
- `public/data/current/`
- `public/data/slates/`
- `public/data/meta.json`
- `public/data/search.json`
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
- `published-data/` is collapsed into a current-day public bundle under `web/public/data`
- frontend renders the current published day from static JSON
- Vercel hosts the frontend only

If you want live server-side predictions later, that should be a separate backend or scheduled job, not part of the public Vercel app.

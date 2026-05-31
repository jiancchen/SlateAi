# Slate Workspace Setup

Use this guide when setting up the project from scratch on a new machine or after deleting the local warehouse.

## What Lives Where

- GitHub stores the code, lightweight public snapshots, docs, tests, and normal source files.
- Hugging Face stores the large ignored warehouse artifacts that GitHub should not carry.
- Vercel hosts only the static frontend from `web/`.

Current private Hugging Face dataset:

```text
javvyai/slate-sports-warehouse
```

Verified visibility:

```text
visibility: private
```

This is a private Hugging Face dataset repository, not a public bucket.

## Prerequisites

Install the local tools:

```bash
brew install node zstd
```

SQLite is available on macOS by default. If your machine does not have it:

```bash
brew install sqlite
```

Install the Hugging Face CLI:

```bash
curl -LsSf https://hf.co/cli/install.sh | bash
```

If the installer complains about Python 3.10+, put Homebrew Python first for the install:

```bash
export PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH"
curl -LsSf https://hf.co/cli/install.sh | bash
```

Make sure your shell can find `hf`:

```bash
source ~/.zshrc
hf --version
```

If needed:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Clone And Install

```bash
git clone https://github.com/jiancchen/SlateAi.git
cd SlateAi
npm run setup
```

That installs both the web and API packages.

## Hugging Face Login

Create a Hugging Face user access token with **Write** permission.

Then log in:

```bash
hf auth login
```

When prompted:

```text
Add token as git credential? [y/N]: y
```

Check the active account:

```bash
hf auth whoami
```

Check that the warehouse repo is private:

```bash
hf repos list --repo-type dataset --search slate-sports-warehouse --json
```

Expected result includes:

```json
"visibility": "private"
```

## Restore Private Warehouse Data

On a fresh clone, pull the latest private warehouse snapshot:

```bash
npm run warehouse:restore:hf
```

This restores:

```text
data-private/warehouse/sports.db
data-private/raw/
```

If those paths already exist and you intentionally want to replace them:

```bash
npm run warehouse:restore:hf -- --force
```

To restore a specific dated snapshot:

```bash
npm run warehouse:restore:hf -- --date YYYY-MM-DD
```

To restore only the SQLite warehouse:

```bash
npm run warehouse:restore:hf -- --skip-raw
```

To restore only raw source pulls:

```bash
npm run warehouse:restore:hf -- --skip-db
```

## Sync Private Warehouse Data

Manual daily backup:

```bash
npm run warehouse:sync:hf
```

Specific date:

```bash
npm run warehouse:sync:hf -- --date YYYY-MM-DD
```

The sync uploads both dated artifacts and `latest/` aliases:

```text
snapshots/YYYY-MM-DD/sports-YYYY-MM-DD.db.zst
snapshots/YYYY-MM-DD/raw-YYYY-MM-DD.tar.zst
snapshots/YYYY-MM-DD/manifest.json
latest/sports-latest.db.zst
latest/raw-latest.tar.zst
latest/manifest.json
```

The active Codex automation is:

```text
Daily HF warehouse sync
11:30 PM America/Los_Angeles
npm run warehouse:sync:hf
```

## Run Locally

Start both API and web:

```bash
npm run dev
```

The local stack serves:

```text
API: http://127.0.0.1:8787
Web: Vite URL printed by the dev command
```

Run only the web app:

```bash
npm run dev:web
```

Run only the API:

```bash
npm run dev:api
```

## Build And Test

```bash
npm run test
npm run build
```

The root build exports the public static data bundle into `web/public/data/`, then builds the Vite app.

## Publish Static Site

The Vercel project root is `web/`.

Publish production:

```bash
npm run publish:site
```

Force a public slate date:

```bash
npm run publish:site -- --date YYYY-MM-DD
```

The hosted site reads static JSON from:

```text
web/public/data/current/
web/public/data/slates/
web/public/data/meta.json
web/public/data/search.json
```

It does not need the private API server in production unless you intentionally configure one.

## Recovery Checklist

If a new machine is empty:

```bash
git clone https://github.com/jiancchen/SlateAi.git
cd SlateAi
npm run setup
hf auth login
npm run warehouse:restore:hf
npm run test
npm run build
npm run dev
```

If the local warehouse looks stale:

```bash
npm run warehouse:restore:hf -- --force
```

If Hugging Face has fresh data and GitHub is clean, that is expected. GitHub intentionally does not store the large SQLite and raw source archive.

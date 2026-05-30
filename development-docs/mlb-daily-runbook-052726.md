# MLB Daily Runbook

This is the default MLB workflow now. Use these two commands instead of piecing the day together by hand.

## Pregame board refresh

Run this before the slate, and again later in the day after more lineups post:

```bash
npm run data:run:mlb-pregame -- --date YYYY-MM-DD
```

What it does:

- refreshes the live MLB slate
- ingests current/previous season pitcher WAR
- ingests recent hitter Statcast game logs and rebuilds rolling `7/14/30` contact-quality trends
- refreshes first-inning, hidden-edge, mistake-shape, state-snapshot, and tier-3 warehouse tables
- pulls current-day FanDuel pitcher strikeout lines
- regenerates the MLB day file, lineup board, HR board, and tracked props
- verifies the slate refresh
- republishes site/API payloads
- rebuilds web and API

## Postgame closeout + follow-up

Run this after the slate is finished:

```bash
npm run data:run:mlb-followup -- --date YYYY-MM-DD
```

What it does:

- ingests settled MLB game results
- derives story signals and story labels
- grades HR and tracked prop boards
- exports the daily history journal
- writes the daily postmortem and follow-up markdown files
- republishes site/API payloads so `History`, `Models`, and `Stories` update automatically
- reruns the MLB research reports tied to daily follow-up

## Backward analysis checklist

After the follow-up run finishes, the default review should answer these questions:

1. Did the side board fail because the wrong team was picked, or because the game stayed `dead early` and the pick never got going?
2. Were `F5` misses really starter misses, or were they timing / scoring-shape misses?
3. Did the `YRFI/NRFI` lane miss because:
   - the wrong offense was expected to score,
   - the timing was wrong,
   - or a tiny pitcher sample was overweighted?
4. Which prop lanes actually worked by type:
   - `pitcher strikeouts`
   - `total bases`
   - `singles`
   - `home runs`
   - `hits`
   - `runs`
   - `RBIs`
   - `H+R+RBI`
5. Did any current research flags show up again:
   - `dead_early_loss`
   - `slumping loser`
   - `loss but not dead`
   - `high snapback, low form`
6. Did the side-import / backtest tables write correctly, or did the warehouse miss a grading path?

Daily backward-analysis artifacts should include:

- the settled history journal
- the postmortem markdown
- the chaos / follow-up markdown
- any refreshed market-model or prop-signal research docs touched by the day

If the current cycle includes batter-outcome work, the follow-up should also:

- refresh `mlb_batter_game_outcomes`
- rerun the batter outcome baseline report
- rerun the batter outcome gate sweep
- note whether `hits`, `runs`, `RBIs`, or combined `H+R+RBI` was the strongest next candidate

If the day exposed a repeat failure mode, update the relevant research doc or add a new one before moving on to the next slate.

## Probable starter watcher

Run this when you want the board to react to listed-starter changes in near real time:

```bash
npm run data:watch:mlb-probables -- --date YYYY-MM-DD --interval-seconds 120 --refresh-on-change --verify-after-refresh
```

What it does:

- polls the official MLB schedule probable-pitcher feed
- stores a local baseline snapshot for the day
- detects any pitching swap by game and team side
- classifies the change using our warehouse context:
  - tiny MLB sample / debut / call-up lane
  - handedness flip
  - WAR downgrade
  - established starter replaced by unknown arm
- writes alerts to `data-private/alerts/mlb-probable-changes/YYYY-MM-DD.jsonl`
- triggers a quick live-slate rebuild and republish when a real change lands

## Kalshi MLB snapshot watcher

Run this when you want to warehouse MLB Kalshi quotes for later scalp research:

```bash
npm run data:watch:kalshi-mlb-live -- --date YYYY-MM-DD --interval-seconds 60
```

What it does:

- fetches the current Kalshi MLB markets already mapped to our published game IDs
- captures quotes into `mlb_kalshi_market_snapshots`
- writes the raw payload to `data-private/raw/kalshi/mlb/YYYY-MM-DD/`
- records a warehouse source snapshot under `kalshi.mlb.live`

Important note:

- this is a warehouse-first collector, not a high-frequency trading engine
- pregame prices are usually stable enough that continuous polling is not the point
- the useful windows are:
  - a small pregame window before first pitch
  - live innings once the game is in progress
  - optional end-state captures for research
- use `--include-idle` only when you want a baseline snapshot outside those live windows
- use `--include-final` only when you want to store final/postgame market states for audit work

Recommended cadence:

- midday or early afternoon:
  - capture one baseline snapshot only
  - `npm run data:watch:kalshi-mlb-live -- --date YYYY-MM-DD --once --include-idle`
- about `20` minutes before the earliest first pitch:
  - start the normal watcher
  - `npm run data:watch:kalshi-mlb-live -- --date YYYY-MM-DD --interval-seconds 60`
- once games go live:
  - keep the watcher running during active windows
  - this is where the useful repricing path is collected
- after the last game if you want a research audit:
  - optional one-shot final-state capture
  - `npm run data:watch:kalshi-mlb-live -- --date YYYY-MM-DD --once --include-final`

Do not think of this as a minute-by-minute all-day poller. The useful research states are:

- baseline pregame
- near first pitch
- early live innings
- later live state changes
- optional final/postgame

## Daily pattern

### Before first pitch

```bash
npm run data:run:mlb-pregame -- --date 2026-05-28
```

### Later after more lineups post

```bash
npm run data:run:mlb-pregame -- --date 2026-05-28
```

### Keep starter changes watched during the day

```bash
npm run data:watch:mlb-probables -- --date 2026-05-28 --interval-seconds 120 --refresh-on-change --verify-after-refresh
```

### After final games settle

```bash
npm run data:run:mlb-followup -- --date 2026-05-28
```

## Notes

- The pregame run is safe to rerun multiple times in one day as lineups and probable pitchers change.
- The watcher is designed for probable-starter changes specifically, especially call-up/debut swaps that should force an immediate board rebuild.
- The follow-up run is the source of truth for daily MLB history, models, and postmortem output.
- The backward-analysis checklist above is part of the default postgame routine now, not an optional extra.
- If a day uses a different prop or HR model name, pass the same optional flags already supported by `data:close:mlb-day`.

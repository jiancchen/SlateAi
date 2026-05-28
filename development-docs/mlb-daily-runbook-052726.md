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
- If a day uses a different prop or HR model name, pass the same optional flags already supported by `data:close:mlb-day`.

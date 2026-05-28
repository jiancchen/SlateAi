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

## Daily pattern

### Before first pitch

```bash
npm run data:run:mlb-pregame -- --date 2026-05-28
```

### Later after more lineups post

```bash
npm run data:run:mlb-pregame -- --date 2026-05-28
```

### After final games settle

```bash
npm run data:run:mlb-followup -- --date 2026-05-28
```

## Notes

- The pregame run is safe to rerun multiple times in one day as lineups and probable pitchers change.
- The follow-up run is the source of truth for daily MLB history, models, and postmortem output.
- If a day uses a different prop or HR model name, pass the same optional flags already supported by `data:close:mlb-day`.

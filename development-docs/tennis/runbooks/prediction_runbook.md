# Tennis Prediction Runbook

This runbook is the current production path for pre-match tennis predictions. After prediction artifacts are generated, the normal flow updates the Vercel site while preserving existing published slate dates.

Primary source order:

1. DraftKings tennis board for slate discovery and market/prop lines.
2. Robinhood prediction-markets tennis page for binary contract prices, bid/ask/last, volume, and open interest.
3. TennisLive for player, match, ranking/profile, recent form, stats, H2H, and replay context.
4. ESPN scoreboard as cross-check/fallback for major-event slate timing and result import.

Do not use active Flashscore, SofaScore, or Tennistonic commands. Those package scripts are intentionally blocked for active ingestion/export and may exist only as archived research history.

## Run Modes

Always label the run mode before fetching or predicting:

- `pregame`: only pre-match slate, rankings, player/match context, and market lines.
- `live`: live score/price state; never overwrites pregame predictions.
- `postmatch`: results, replay, candles, grading, and settlement.
- `rerun` or `backtest`: historical replay with explicit leakage boundary.

For pregame runs, do not use settled results, postmatch replay, or live-market data captured after match start.

## Pregame Flow

Set the two-date tennis window at the start of the run. Tennis usually needs today's slate as current plus tomorrow's slate when the next-day board is available.

```bash
TODAY=$(TZ=America/Los_Angeles date +%F)
TOMORROW=$(TZ=America/Los_Angeles date -v+1d +%F 2>/dev/null || TZ=America/Los_Angeles date -d tomorrow +%F)
```

Use `YYYY-MM-DD` below for each date being generated. For a normal publish run, generate `TODAY` first and then `TOMORROW` if the DK/TennisLive slate exists.

### 1. Initialize Warehouse

```bash
npm run data:init:tennis
npm run data:migrate:tennis
```

Source DB:

`data-private/warehouse/sports/tennis/sql-tennis.db`

### 2. Fetch Rankings

Rankings must be fetched before player/match enrichment so daily rank, points, age, country, and tour history are preserved.

```bash
npm run data:fetch:tennis-rankings -- --date YYYY-MM-DD
npm run data:import:tennis-rankings
npm run data:typed:ingest:tennis-rankings -- --date YYYY-MM-DD \
  --report data-migration/reports/ingest_tennis_rankings_raw_to_typed_YYYY-MM-DD.json
```

Audit:

```bash
python3 data-migration/scripts/validate_tennis_rankings_raw_to_typed.py \
  --date YYYY-MM-DD \
  --report data-migration/reports/validate_tennis_rankings_raw_to_typed_YYYY-MM-DD.json
```

### 3. Fetch DraftKings Tennis Board First

Use DraftKings as the first active slate source.

```bash
node pipeline/tennis/fetchers/scrape_draftkings_tennis.mjs --date YYYY-MM-DD
```

Output:

`data-private/reference/tennis/draftkings-lines-YYYY-MM-DD.json`

Required DK discovery rules:

- Start from `https://sportsbook.draftkings.com/sports/tennis`.
- Pull all not-started tennis events for `YYYY-MM-DD`.
- Exclude doubles.
- Exclude ITF.
- Prioritize events in this order:
  - French Open / Roland Garros singles.
  - WTA and WTA 125K.
  - ATP Challenger.
  - Other ATP/WTA singles only if intentionally included.
- Capture all available event-detail categories, including:
  - `match lines`
  - `sets`
  - `first game props`
  - `first x games props`
  - `player props`
  - `match props`

Required market families:

- Moneyline.
- Game handicap / games spread.
- Total match games.
- First-set total games.
- Player to win at least one set.
- First-service-game total points.
- First game props.
- First X games props when posted.
- Any additional player or match props exposed by DK should be preserved in raw receipts even if not yet modeled.

Important current implementation note:

The existing DK scraper captures many of these markets, but it still relies partly on an existing day module for matching and only auto-supplements unmatched ATP Challenger events. For a fully correct run, inspect `draftkings-lines-YYYY-MM-DD.json` and confirm French Open, WTA, and Challenger events are present. If missing, the scraper should be updated before prediction generation.

### 4. Fetch Robinhood Prediction-Market Prices

Use Robinhood as the active prediction-market price lane. It does not replace DK slate discovery or DK game props; it adds binary contract pricing and liquidity context.

```bash
npm run data:fetch:tennis-robinhood -- --date YYYY-MM-DD
```

Source page:

`https://robinhood.com/us/en/prediction-markets/tennis/`

Outputs:

- `data-private/odds/robinhood/tennis/YYYY-MM-DD-robinhood-tennis-markets.json`
- `data-private/reference/tennis/robinhood-tennis-markets-YYYY-MM-DD.json`
- `data-private/reference/tennis/robinhood-tennis-supplement-YYYY-MM-DD.json`

Required Robinhood rules:

- Keep only the requested event day.
- Keep only French Open singles, WTA/WTA 125K singles, and ATP Challenger singles in the supplement used by predictions.
- Preserve broader raw Robinhood receipts for audit, but do not publish uncategorized `tennis_other` rows as predictions.
- Preserve `sourceUrl`, Robinhood event id, contract id/symbol, bid/ask/last prices, quote timestamp, volume, and open interest.
- Treat zero dated events as source fetch missing/empty, not as parsed data.
- Treat supplement rows with no typed `market_contracts`, `market_price_ticks`, or linked `market_snapshots` as parsed-but-not-inserted or inserted-but-not-linked failures.

### 5. Materialize DK And Robinhood Markets Into `sql-tennis.db`

Every eligible DK event should become canonical warehouse data before prediction:

- `source_snapshots` for the raw DK JSON.
- `matches` for each singles event.
- `match_players` for the two players.
- `players` aliases as needed.
- `market_snapshots` for each parsed market selection.

Every eligible Robinhood supplement match should add:

- `source_snapshots` for the Robinhood supplement JSON.
- `matches` and `match_players` when DK/TennisLive did not already materialize the match.
- `market_contracts` for binary winner contracts.
- `market_price_ticks` for bid/ask/last, volume, and open interest.
- `market_snapshots` for model-visible moneyline binary prices.

Normalize odds after both DK and Robinhood files are present:

```bash
npm run data:typed:ingest:tennis-odds -- --date YYYY-MM-DD \
  --report data-migration/reports/ingest_tennis_odds_raw_to_typed_YYYY-MM-DD_markets.json
```

The typed ingest prunes stale DK/FanDuel snapshots for the current source file and stale Robinhood contracts/ticks/snapshots/match-only rows for the current date before inserting the current parse. Negative row deltas are acceptable when the current Robinhood supplement is narrower than a prior fetch; verify the `deleted_stale_rows` report field.

Audit:

```bash
python3 data-migration/scripts/validate_tennis_odds_raw_to_typed.py \
  --date YYYY-MM-DD \
  --report data-migration/reports/validate_tennis_odds_raw_to_typed_YYYY-MM-DD_markets.json
```

If validator fails only because FanDuel rows are absent, note that as a coverage warning. If DK market snapshots are absent, Robinhood supplement rows were parsed but not inserted, Robinhood contracts/ticks are unlinked for dated matches, or mappings are unresolved for slate matches, stop.

Useful SQL checks:

```bash
sqlite3 -header -column data-private/warehouse/sports/tennis/sql-tennis.db "
select source_name, source_date, count(*) as snapshots
from source_snapshots
where source_date='YYYY-MM-DD'
group by source_name, source_date;

select source_name, market_type, count(*) as rows
from market_snapshots
where date(captured_at)='YYYY-MM-DD'
group by source_name, market_type
order by source_name, market_type;

select source_name, count(*) as contracts
from market_contracts mc
join matches m on m.match_id = mc.match_id
where m.match_date='YYYY-MM-DD'
group by source_name;

select source_name, count(*) as ticks
from market_price_ticks
where raw_source_snapshot_id in (
  select source_snapshot_id
  from source_snapshots
  where sport='tennis'
    and source_name='tennis_odds'
    and source_date='YYYY-MM-DD'
)
group by source_name;
"
```

### 6. Build TennisLive URL Targets From DK Slate

Use DK event names to build TennisLive targets:

- One TennisLive player URL for each player.
- One exact TennisLive match URL for each slate match when TennisLive exposes it.

Write audit artifacts:

- `data-migration/reports/tennislive_slate_player_urls_YYYY-MM-DD.txt`
- `data-migration/reports/tennislive_slate_match_urls_YYYY-MM-DD.txt`
- Optional JSON mapping with DK event id, DK names, TennisLive URL, event, surface, and confidence.

Target URL patterns:

```text
https://www.tennislive.net/atp/player-slug/
https://www.tennislive.net/wta/player-slug/
https://www.tennislive.net/atp/match/player-a-VS-player-b/tournament-2026/
https://www.tennislive.net/wta/match/player-a-VS-player-b/tournament-2026/
```

Do not crawl tournament pages recursively. Use tournament pages only to discover exact match URLs when needed, then store explicit URLs.

### 7. Ingest TennisLive Context

```bash
python3 data-migration/scripts/ingest_tennis_tennislive_to_typed.py \
  --date YYYY-MM-DD \
  --player-url-file data-migration/reports/tennislive_slate_player_urls_YYYY-MM-DD.txt \
  --match-url-file data-migration/reports/tennislive_slate_match_urls_YYYY-MM-DD.txt \
  --max-links 25 \
  --max-matches 5 \
  --report data-migration/reports/ingest_tennis_tennislive_YYYY-MM-DD_slate.json
```

Expected source-native tables:

- `tennislive_player_sources`
- `tennislive_player_profiles`
- `tennislive_player_surface_records`
- `tennislive_player_match_links`
- `tennislive_match_sources`
- `tennislive_match_summaries`
- `tennislive_match_player_snapshots`
- `tennislive_match_replay_games`
- `tennislive_match_replay_points`
- `tennislive_h2h_source_rows`
- `tennislive_form_chart_points`

Expected canonical tables:

- `players`
- `matches`
- `match_players`
- `match_stat_rows`
- `replay_games`
- `replay_points`

Stop if player URLs fail broadly. If one or two exact match URLs are not exposed yet, keep the player-page context and mark those matches as lower context coverage.

### 8. Export Warehouse Context

Production/site-facing path:

```bash
npm run data:export:tennis-warehouse-context -- --date YYYY-MM-DD
```

Private audit path:

```bash
npm run data:export:tennis-warehouse-context -- \
  --date YYYY-MM-DD \
  --output data-private/predictions/tennis/YYYY-MM-DD-tennis-warehouse-context.generated.json
```

Use the production path for normal runs because the generated day module and Vercel export read from `web/src/lib`.

### 9. Generate TEN-T0 Predictions

Production/site-facing path:

```bash
node pipeline/tennis/publish/generate-day-module.mjs \
  --date YYYY-MM-DD \
  --predictions-output data-private/predictions/tennis/YYYY-MM-DD-tennis-t0-predictions.json
```

This writes the site day module and the prediction artifact expected by the publish pipeline.

Private audit path:

```bash
node pipeline/tennis/publish/generate-day-module.mjs \
  --date YYYY-MM-DD \
  --input-source files \
  --warehouse-context data-private/predictions/tennis/YYYY-MM-DD-tennis-warehouse-context.generated.json \
  --output data-private/predictions/tennis/YYYY-MM-DD-tennis-day-module.generated.js \
  --predictions-output data-private/predictions/tennis/YYYY-MM-DD-tennis-t0-predictions.json
```

Private DB-mode path, only when canonical `matches` and `match_players` exist for the date:

```bash
node pipeline/tennis/publish/generate-day-module.mjs \
  --date YYYY-MM-DD \
  --input-source db \
  --db-path data-private/warehouse/sports/tennis/sql-tennis.db \
  --warehouse-context data-private/predictions/tennis/YYYY-MM-DD-tennis-warehouse-context.generated.json \
  --output data-private/predictions/tennis/YYYY-MM-DD-tennis-day-module.generated.js \
  --predictions-output data-private/predictions/tennis/YYYY-MM-DD-tennis-t0-predictions.json
```

Generated prediction artifact must include:

- `date`
- `modelCartridge`
- `totalSingles`
- `picks`

Each pick must include:

- `match`
- `pick`
- `confidence`
- `volatility`
- `bettingMatrix`
- `valueBoard`

Required value books:

- `ml`
- `spread`
- `total`
- `firstSetTotal`
- `setWin`

### 10. Import-Check Generated Module

Production/site-facing module:

```bash
node -e "import('./web/src/lib/day-YYYY-MM-DD.js').then(m=>console.log({games:m.games.length, provider:m.oddsMeta?.provider}))"
```

Private audit module:

```bash
node -e "import('./data-private/predictions/tennis/YYYY-MM-DD-tennis-day-module.generated.js').then(m=>console.log({games:m.games.length, provider:m.oddsMeta?.provider}))"
```

This should expose the expected game count before publishing.

### 11. Generate TEN-T1 Selector Overlay

TEN-T0 is the raw slate and market-fair generator. The selector overlay is the narrower daily board for usable pregame candidates, watch rows, live-dog rows, fades, and no-plays.

```bash
npm run data:selector:tennis -- --date YYYY-MM-DD
```

Outputs:

- `data-private/reports/tennis-selector-overlay-YYYY-MM-DD.json`
- `data-private/reports/tennis-selector-overlay-YYYY-MM-DD.md`
- `data-private/predictions/tennis/YYYY-MM-DD-tennis-t1-selector.json`

Publishing guidance:

- Use `Prediction A`, `Prediction B`, and `Prediction Dog` as the pregame ML candidate board.
- Treat `Live Dog` rows as live-entry or favorite-fade candidates, not automatic pregame dog bets.
- Treat `Watch`, `Chalk Watch`, `Fade`, and `No Play` rows as non-publish ML rows unless a later operator override is documented.
- If the selector output has zero prediction candidates, publish the slate as watch/no-play instead of forcing TEN-T0 rows into picks.

### 12. Pregame Health And Run Records

Pregame health:

```bash
npm run data:health:tennis -- --date YYYY-MM-DD --pregame
```

Formal model-run lifecycle:

```bash
npm run data:create:tennis-run -- --date YYYY-MM-DD --model TEN-T0 --mode pregame --status created
npm run data:snapshot:tennis-run -- --date YYYY-MM-DD --model TEN-T0 --mode pregame
npm run data:check:tennis-run -- --date YYYY-MM-DD --model TEN-T0
```

Capture DB run artifacts when using the typed DB/model artifact path:

```bash
npm run data:capture:tennis-t0-db -- \
  --date YYYY-MM-DD \
  --predictions data-private/predictions/tennis/YYYY-MM-DD-tennis-t0-predictions.json \
  --module data-private/predictions/tennis/YYYY-MM-DD-tennis-day-module.generated.js \
  --context data-private/predictions/tennis/YYYY-MM-DD-tennis-warehouse-context.generated.json
```

### 13. Publish To Vercel

After prediction artifacts are generated, export the tennis slate, refresh the public two-day window, and deploy. This is the normal production path.

```bash
npm run data:audit:tennis-active-sources -- --date YYYY-MM-DD
npm run data:export:tennis-published-slate -- --date YYYY-MM-DD
```

For the normal tennis window, run the production export/generate/published-slate steps for `TODAY`, then repeat them for `TOMORROW` if tomorrow's slate was generated.

```bash
npm run data:export:tennis-warehouse-context -- --date "$TODAY"
node pipeline/tennis/publish/generate-day-module.mjs \
  --date "$TODAY" \
  --predictions-output "data-private/predictions/tennis/$TODAY-tennis-t0-predictions.json"
npm run data:export:tennis-published-slate -- --date "$TODAY"

npm run data:export:tennis-warehouse-context -- --date "$TOMORROW"
node pipeline/tennis/publish/generate-day-module.mjs \
  --date "$TOMORROW" \
  --predictions-output "data-private/predictions/tennis/$TOMORROW-tennis-t0-predictions.json"
npm run data:export:tennis-published-slate -- --date "$TOMORROW"
```

If tomorrow has no DK/TennisLive slate yet, skip tomorrow generation and state why.

Before public export, record the current published slate index:

```bash
node - <<'NODE'
const fs = require('fs')
const index = JSON.parse(fs.readFileSync('published-data/slates/index.json', 'utf8'))
console.log(index.map((entry) => entry.id).join('\n'))
NODE
```

Refresh public data with the current-window scope. This makes `TODAY` the `/data/current/` slate and includes `TOMORROW` under `/data/slates/YYYY-MM-DD/` when it exists in `published-data/slates`.

```bash
PUBLIC_SLATE_DATE="$TODAY" PUBLIC_SLATE_SCOPE=current-window npm run data:export:published
PUBLIC_SLATE_DATE="$TODAY" PUBLIC_SLATE_SCOPE=current-window npm run data:export:public-current -- --current-window
PUBLIC_SLATE_SCOPE=current-window npm run publish:site -- --date "$TODAY"
```

Do not use these in a normal tennis deploy:

- `--only-current`
- `--only-dates` unless it explicitly includes both `TODAY` and `TOMORROW` and the user requested a restricted deploy.
- Manual deletion of `published-data/slates`, `web/public/data/slates`, or `web/public/data/current`.

After export/deploy, rerun the slate-index check. Existing unrelated slate dates must still be present. Adding or updating `TODAY` and `TOMORROW` is expected; deleting unrelated dates is a failure.

Run final public audits for each included date:

```bash
npm run data:audit:tennis-active-sources -- --date "$TODAY"
npm run data:audit:tennis-match-contract -- --date "$TODAY"
npm run data:audit:tennis-warehouse-identity -- --date "$TODAY"

npm run data:audit:tennis-active-sources -- --date "$TOMORROW"
npm run data:audit:tennis-match-contract -- --date "$TOMORROW"
npm run data:audit:tennis-warehouse-identity -- --date "$TOMORROW"
```

Public/static exports must not expose `data-private`, local absolute paths, or blocked source references. `publish:site` performs a deploy-shape check that requires the requested date to be the current slate and requires the next generated slate to be present in public slates unless `--only-current` is used.

### 13. No-Publish Audit Exception

Use a no-publish/private run only when the user explicitly asks not to update the site. In that mode, do not run:

- `npm run data:export:published`
- `npm run data:export:tennis-published-slate`
- `npm run publish:site`
- any command that writes `published-data/`, `web/public/data/`, or default `web/src/lib/day-YYYY-MM-DD*.js`

## Prediction Decision Rules

Keep these lanes separate:

- Winner lean: likely match winner.
- Sportsbook bet: playable edge after line, price, and model-risk gates.
- Prediction-market trade: can the contract reprice upward before settlement.

Rules:

- A likely winner is not automatically a bet.
- Expensive favorites need price/economics gating.
- WTA low-confidence picks default to watch/pass unless technical edge is clear.
- Low-priced dogs need service/return, opponent-quality, or repricing evidence.
- ML can be pass while spread, O/U, set-win, or first-set O/U is useful.
- For best-of-five, set-win and total-games lanes deserve extra attention.
- If a match lacks core hold/return/error context, keep it watch-only.

## Required Audit Summary

At the end of a production pregame run, report:

- DK events captured.
- DK market snapshots inserted by market type.
- Robinhood events captured.
- Robinhood supplement matches inserted.
- Robinhood contracts, ticks, and linked moneyline binary snapshots inserted.
- TennisLive player URLs attempted/succeeded.
- TennisLive match URLs attempted/succeeded.
- Prediction match count.
- Number of matches with market data.
- Number of matches with TennisLive warehouse context.
- Prediction artifacts written.
- Published current slate date.
- Published tomorrow slate date, or the reason tomorrow was absent.
- Vercel deployment URL.
- Confirmation that unrelated existing published slate dates were preserved.
- Final public audit results for each included tennis date.
- Any unresolved DK player/match mappings.
- Any matches without exact TennisLive match URL.

For a no-publish/private exception, replace the publish fields with a clear statement that public/site files were intentionally untouched.

## Known Gaps To Fix

- The DK tennis scraper should fully promote DraftKings as slate discovery, not depend on an existing site day module for French Open/WTA matching.
- The DK scraper should supplement WTA/WTA 125K and French Open rows the same way it currently supplements ATP Challenger rows.
- DK raw receipts should preserve any player/match props not currently normalized.
- Odds validation should support a no-FanDuel mode so missing FanDuel coverage is a warning instead of a hard failure when DK and Robinhood are populated.
- Canonical `matches` and `match_players` should be materialized from DK when TennisLive exact match pages are not available yet.

# Tennis Reference Notes

This folder is the private-side home for tennis source normalization and future warehousing.

Current guidance:
- Tennistonic matchup URLs are not always built from the raw match-sheet name.
- The published frontend helper lives at `/Users/jcchen/Documents/New project/web/src/lib/tennis-source-mapping.js`.
- When a Tennistonic player or matchup URL only works with a custom spelling, suffix, or punctuation pattern, add it to that mapping helper so future slates reuse the working URL instead of falling back to "no data."

Next warehouse targets:
- player alias map across TennisStats / Tennistonic / Oddschecker / ATP / WTA / match-sheet names
- recent match logs by surface
- recent service / return / estimated hold context by surface
- injury / withdrawal / qualifying load notes

Ranking warehouse:
- `player-rankings.json` is the local join table for opponent-quality enrichment.
- `player-rankings-history/YYYY-MM-DD.json` stores dated snapshots for future historical ranking charts.
- Keys should use the normalized player name produced by `pipeline/enrich-tennis-opponent-quality.mjs` when possible.
- Entry shape: `{ "rank": 12, "points": 2665, "age": 24, "country": "CZE", "tour": "ATP", "source": "ATP rankings", "asOf": "2026-05-25" }`.
- The enrichment layer can run with an empty warehouse, but it will mark missing ranking coverage instead of pretending opponent quality is known.
- Daily command: `npm run data:fetch:tennis-rankings -- --date YYYY-MM-DD && npm run data:import:tennis-rankings`.
- The fetcher attempts Live Tennis (`live-tennis.eu`) for live rank, age, country, and points, then keeps ESPN ranking rows as the fallback when Live Tennis returns a browser challenge.
- Browser challenge fallback: capture the readable Chrome page snapshots in `live-tennis-browser-snapshots/` and pass them back with `--live-snapshot-atp PATH --live-snapshot-wta PATH`.
- Historical chart source: query `tennis_rankings` by `normalized_name`, `tour`, and `as_of_date`; do not overwrite old dated rows.

Opponent-adjusted clay context:
- Run `node pipeline/enrich-tennis-opponent-quality.mjs --input web/src/lib/day-YYYY-MM-DD-tennis-clay-context.generated.json --output web/src/lib/day-YYYY-MM-DD-tennis-opponent-quality.generated.json --flashscore-recent-map data-private/reference/tennis/flashscore-recent-match-map-YYYY-MM-DD.json`.
- The output scores recent scoreline resistance, 2026 clay record, set/game share, and opponent quality when rankings are available.
- Tennistonic score rows do not include true service games held, break points, or return-break rates. Run the Flashscore recent-match pass first when match-detail pages need those fields.

Flashscore service/return stats:
- Run `node pipeline/tennis/fetchers/fetch-flashscore-tennis-stats.mjs --url "https://www.flashscoreusa.com/game/tennis/.../?mid=MATCHID"`.
- Outputs are written to `flashscore-match-stats/MATCHID.json`.
- The parser stores match and set-level service data, including first-serve percentage, first/second serve points won, break points saved/converted, service games won, return games won, and total games won.
- SH/SI columns are mapped to the left/right player order in the supplied Flashscore URL.
- For slate detail pages, run `npm run data:fetch:tennis-flashscore-recent -- --input web/src/lib/day-YYYY-MM-DD-tennis-opponent-quality.generated.json --map-output data-private/reference/tennis/flashscore-recent-match-map-YYYY-MM-DD.json`.
- The recent-match pass resolves known tournament result pages, fetches each matched Flashscore stat feed, stores the raw match JSON, and writes a join map keyed by board match, player, and recent-match index.
- Import the stored Flashscore rows into SQLite with `npm run data:import:tennis-flashscore` so service/return stats are available in `tennis_flashscore_player_stat_rows` and recent-card joins are queryable from `tennis_flashscore_recent_links`.
- After importing, run `npm run data:backfill:tennis-recent-form -- --date YYYY-MM-DD`. This is the required bridge from raw Flashscore rows into `tennis_recent_form_metrics`, which powers the last-5 form bubbles on match detail pages.
- Quality gate before publishing: `select match_id, normalized_name, sum(score is null) from tennis_recent_form_metrics where match_id like '%YYYY-MM-DD%' and recent_index < 5 group by 1,2 having sum(score is null) > 0;` should return no rows for promoted slate matches. If it returns rows, the slate is data-incomplete and should not be treated as analysis-ready.

SofaScore match/H2H stats:
- Use SofaScore when we have an event page URL and need confirmed event metadata, H2H counts, red-clay surface, completed score, and detailed match statistics by set.
- Fetch a match with `npm run data:fetch:tennis-sofascore-match -- --date YYYY-MM-DD --url "https://www.sofascore.com/tennis/match/...#id:SOFASCORE_EVENT_ID"`.
- Fetch a whole published slate with `npm run data:fetch:tennis-sofascore-slate -- --date YYYY-MM-DD`; it reads SofaScore's daily tennis schedule, keeps Roland Garros singles, and joins each event back to `published-data/slates/YYYY-MM-DD/games` by player names.
- The fetcher opens the event in a browser context before calling SofaScore's event, statistics, H2H, and featured-odds endpoints because direct `curl` requests can return 403.
- Raw files are stored in `sofascore-match-data/SOFASCORE_EVENT_ID.json` and are mapped back to the board match id when `--date` can match the two player names in `published-data/slates/YYYY-MM-DD/games`.
- Import with `npm run data:import:tennis-sofascore`. Query match metadata in `tennis_sofascore_matches`, flattened home/away stat rows in `tennis_sofascore_stat_rows`, and player-tied rows in `tennis_sofascore_player_stat_rows`.
- Daily slate warehouse loop: import the published slate with `npm run data:import:tennis-slate -- --date YYYY-MM-DD`, then import Flashscore and SofaScore rows. The slate import warehouses the Tennistonic H2H/clay context already used by the model in `tennis_h2h_snapshots`, `tennis_player_match_context`, and `tennis_recent_matches`.

Kalshi trade-to-sell checks:
- Treat cheap-underdog prediction-market rows as trade candidates only after a stabilization check. A dog needs enough hold, second-serve, error-control, or return-pressure evidence to survive the first service cycles.
- Query `tennis_kalshi_market_candles` and `tennis_kalshi_intramatch_trade_features` before promoting a row. Store same-favorite history and similar-entry history on the candidate payload.
- Same-favorite history should include the prior opponent, entry ask, max bid/trade, scoreline, and whether the contract doubled. This catches hot favorites whose opponents do not actually re-rate upward.
- Promotion gate: no same-favorite history and no similar-entry bucket means no pre-match `trade-to-sell` label. Mark it `data incomplete` or `pass` until a contract history comp exists.
- User-facing trade detail must display the exact price-history rows used. Generic weakness text is not enough evidence for an entry/exit recommendation.
- If the favorite is top-20 and in strong clay/recent form, and the dog has weak hold/error profile with no return-pressure edge, veto or downgrade even when the raw entry price is attractive.

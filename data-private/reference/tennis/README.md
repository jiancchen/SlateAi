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
- Run `node pipeline/fetch-flashscore-tennis-stats.mjs --url "https://www.flashscoreusa.com/game/tennis/.../?mid=MATCHID"`.
- Outputs are written to `flashscore-match-stats/MATCHID.json`.
- The parser stores match and set-level service data, including first-serve percentage, first/second serve points won, break points saved/converted, service games won, return games won, and total games won.
- SH/SI columns are mapped to the left/right player order in the supplied Flashscore URL.
- For slate detail pages, run `npm run data:fetch:tennis-flashscore-recent -- --input web/src/lib/day-YYYY-MM-DD-tennis-opponent-quality.generated.json --map-output data-private/reference/tennis/flashscore-recent-match-map-YYYY-MM-DD.json`.
- The recent-match pass resolves known tournament result pages, fetches each matched Flashscore stat feed, stores the raw match JSON, and writes a join map keyed by board match, player, and recent-match index.
- Import the stored Flashscore rows into SQLite with `npm run data:import:tennis-flashscore` so service/return stats are available in `tennis_flashscore_player_stat_rows` and recent-card joins are queryable from `tennis_flashscore_recent_links`.

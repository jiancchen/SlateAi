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
- Keys should use the normalized player name produced by `pipeline/enrich-tennis-opponent-quality.mjs` when possible.
- Entry shape: `{ "rank": 12, "tour": "ATP", "source": "ATP rankings", "asOf": "2026-05-25" }`.
- The enrichment layer can run with an empty warehouse, but it will mark missing ranking coverage instead of pretending opponent quality is known.

Opponent-adjusted clay context:
- Run `node pipeline/enrich-tennis-opponent-quality.mjs --input web/src/lib/day-YYYY-MM-DD-tennis-clay-context.generated.json --output web/src/lib/day-YYYY-MM-DD-tennis-opponent-quality.generated.json`.
- The output scores recent scoreline resistance, 2026 clay record, set/game share, and opponent quality when rankings are available.
- Tennistonic score rows do not include true service games held, break points, or return-break rates. Those need a separate stats source before we expose them as hard features.

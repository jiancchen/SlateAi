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

# Tennis Ingestion And Health Remediation Plan

This plan turns the June 7, 2026 TennisLive/Tennistonic ingestion diagnosis into six implementation phases. The goal is to make `sql-tennis.db` prove exactly where each slate player and match stands:

- source fetch missing
- source fetched but parser produced no usable rows
- parsed rows inserted into source-native tables
- canonical typed rows inserted
- typed rows populated but linked to the wrong slate player or match
- linked rows available to prediction, export, and health checks

Do not treat this as a betting-model change. This is a warehouse correctness and observability repair.

## Phase 1. Identity Canonicalization Repair

### Goal

Stop TennisLive rows from landing on active accent-duplicate player IDs such as `tennis-player-carlos-s-nchez-jover` when the slate uses `tennis-player-carlos-sanchez-jover`.

### Problem To Fix

`data-migration/scripts/ingest_tennis_tennislive_to_typed.py` currently resolves players by scanning `players` and returning the first normalized name match. If both accented and ASCII duplicates are active, the ingestor can pick the wrong row and all source-native TennisLive data becomes invisible to the slate join.

### Scope

- Extend the existing player identity repair flow.
- Handle full-name accent duplicates, not only abbreviated stubs.
- Preserve source evidence for each redirect.

### Implementation Steps

1. Add full-name duplicate classification to `pipeline/sources/tennis/normalization/player_identity_repair.py`.
2. Group active players by `player_identity_registry.normalized_name`.
3. For each duplicate group, choose the canonical target by:
   - existing active `match_players` references
   - existing `market_contracts`, `market_snapshots`, and `prediction_rows`
   - canonical ASCII slug quality
   - trusted aliases and ranking rows
   - then source-native profile rows as secondary evidence
4. Write `player_identity_redirects` rows from lower-confidence duplicates to the canonical target.
5. Write `entity_aliases` rows for redirected player IDs and source URLs.
6. Deactivate redirected duplicate rows in `players.active` and `player_identity_registry.active`.
7. Add a report with each duplicate group, selected target, evidence counts, and rows affected.

### Validation

```bash
python3 data-migration/scripts/repair_tennis_player_identity.py \
  --report data-migration/reports/repair_tennis_player_identity_full_name_duplicates_YYYY-MM-DD_dry_run.json

python3 data-migration/scripts/repair_tennis_player_identity.py \
  --apply \
  --report data-migration/reports/repair_tennis_player_identity_full_name_duplicates_YYYY-MM-DD.json

python3 data-migration/scripts/validate_tennis_player_identity_repair.py \
  --report data-migration/reports/validate_tennis_player_identity_repair_full_name_duplicates_YYYY-MM-DD.json
```

SQL spot check:

```bash
sqlite3 -header -column data-private/warehouse/sports/tennis/sql-tennis.db "
select pir.normalized_name, count(*) as active_players
from player_identity_registry pir
join players p on p.player_id = pir.player_id
where pir.sport = 'tennis'
  and pir.active = 1
  and p.active = 1
group by pir.normalized_name
having count(*) > 1
order by active_players desc, pir.normalized_name
limit 50;
"
```

### Exit Criteria

- June 7 slate duplicate examples redirect to the canonical slate IDs.
- Active duplicate normalized-name groups either go to zero or have explicit `needs_deep_dive` candidates with evidence.
- No redirected player remains active.

### 2026-06-07 Execution Notes

Phase 1 was applied against `data-private/warehouse/sports/tennis/sql-tennis.db`.

Reports:

- Dry run: `data-migration/reports/repair_tennis_player_identity_full_name_duplicates_2026-06-07_dry_run.json`
- Full duplicate apply: `data-migration/reports/repair_tennis_player_identity_full_name_duplicates_2026-06-07.json`
- Legacy active redirect cleanup: `data-migration/reports/repair_tennis_player_identity_legacy_active_redirect_sources_2026-06-07.json`
- Validator: `data-migration/reports/validate_tennis_player_identity_repair_full_name_duplicates_2026-06-07.json`

Applied results:

- Full-name duplicate candidates: 290
- Full-name duplicate redirects ready/applied: 290
- Abbreviation stub redirects applied: 642
- Active abbreviation stubs after apply: 0
- Legacy active redirect source rows deactivated: 3
- Validator result: `ok=true`, `active_duplicate_normalized_groups=0`, `active_duplicate_normalized_players=0`, `active_from_players=0`, `orphan_redirects=0`

June 7 spot checks redirected the known TennisLive accent duplicates to their canonical slate IDs:

- `tennis-player-carlos-s-nchez-jover` -> `tennis-player-carlos-sanchez-jover`
- `tennis-player-alex-mart-pujolras` -> `tennis-player-alex-marti-pujolras`
- `tennis-player-david-jord-sanchis` -> `tennis-player-david-jorda-sanchis`
- `tennis-player-hynek-barto` -> `tennis-player-hynek-barton`
- `tennis-player-matt-o-martineau` -> `tennis-player-matteo-martineau`
- `tennis-player-ma-malige` -> `tennis-player-mae-malige`
- `tennis-player-rapha-l-p-rot` -> `tennis-player-raphael-perot`

Remaining note: Phase 1 canonicalizes identities and redirect state. It does not move existing TennisLive profile/stat rows from deactivated duplicate IDs onto canonical IDs; that is Phase 2 and Phase 6 work.

## Phase 2. TennisLive Ingest Canonical Resolver

### Goal

Make the TennisLive ingestor write every player-keyed row to the canonical player ID at ingest time.

### Problem To Fix

Even after Phase 1, ingestion can regress if `upsert_player` ignores redirects and canonical registry preferences.

### Scope

- Update `data-migration/scripts/ingest_tennis_tennislive_to_typed.py`.
- Reuse `player_identity_redirects`, `player_identity_registry`, and trusted aliases.
- Register failed fetch attempts in the DB, not only in JSON reports.

### Implementation Steps

1. Replace the current first-match player scan with a resolver function:
   - exact active TennisLive URL alias
   - active `player_identity_redirects`
   - active `player_identity_registry.normalized_name`
   - existing canonical ASCII player ID when unambiguous
   - create `tlp-*` only when no canonical candidate exists
2. Add `canonicalize_player_id(con, player_id)` and call it before every player-keyed write.
3. Use canonical IDs in:
   - `tennislive_player_sources`
   - `tennislive_player_profiles`
   - `tennislive_player_surface_records`
   - `tennislive_player_match_links`
   - `recent_matches`
   - `player_form_snapshots`
   - `match_players`
   - `match_stat_rows`
   - `replay_games`
   - `replay_points`
   - `tennislive_form_chart_points`
4. When a player page or match page fetch fails, insert a `source_snapshots` row with status `failed` and the attempted URL.
5. Insert/update `source_fetch_runs` and `source_fetch_status` for the TennisLive slate ingest:
   - attempted player URLs
   - successful player pages
   - failed player pages
   - attempted match URLs
   - successful match pages
   - failed match pages
   - parser failures
6. When a recent-match link is skipped because `tennislive_match_sources` already has that URL, backfill `tennislive_player_match_links.match_id` from the existing source row instead of leaving the link unjoined.

### Validation

```bash
python3 -m py_compile data-migration/scripts/ingest_tennis_tennislive_to_typed.py

python3 data-migration/scripts/ingest_tennis_tennislive_to_typed.py \
  --date YYYY-MM-DD \
  --player-url-file data-migration/reports/tennislive_slate_player_urls_YYYY-MM-DD.txt \
  --match-url-file data-migration/reports/tennislive_slate_match_urls_YYYY-MM-DD.txt \
  --max-links 25 \
  --max-matches 5 \
  --report data-migration/reports/ingest_tennis_tennislive_YYYY-MM-DD_slate_after_identity_fix.json
```

SQL spot check:

```bash
sqlite3 -header -column data-private/warehouse/sports/tennis/sql-tennis.db "
with slate as (
  select distinct mp.player_id, p.name
  from match_players mp
  join matches m on m.match_id = mp.match_id
  join players p on p.player_id = mp.player_id
  where m.match_date = 'YYYY-MM-DD'
)
select
  count(*) as slate_players,
  sum(case when exists (
    select 1 from tennislive_player_profiles tlp where tlp.player_id = slate.player_id
  ) then 1 else 0 end) as players_with_tennislive_profile,
  sum(case when exists (
    select 1 from match_stat_rows msr
    where msr.player_id = slate.player_id and msr.source_name = 'tennislive'
  ) then 1 else 0 end) as players_with_tennislive_stats
from slate;
"
```

### Exit Criteria

- Previously missing June 7 canonical players pick up their TennisLive profiles/stat rows where the source page was successfully fetched.
- Failed URLs are visible from DB source status tables.
- No successful TennisLive profile URL maps only to a deactivated duplicate ID.

### 2026-06-07 Execution Notes

Phase 2 was applied to `data-migration/scripts/ingest_tennis_tennislive_to_typed.py` and validated with a targeted June 7 forced TennisLive ingest for the known accent-duplicate slate players.

Code changes:

- `upsert_player` now resolves by TennisLive URL alias, active identity redirects, active `player_identity_registry.normalized_name`, canonical ASCII player ID, and then `tlp-*` creation only as a fallback.
- All player-keyed writes that call `upsert_player` now receive canonical IDs after redirect resolution.
- Existing `tennislive_match_sources` rows now backfill `tennislive_player_match_links.match_id` when a page is skipped because it is already in the DB.
- Failed player and match URL attempts now write `source_snapshots.status='failed'` rows with attempted URL and error evidence.
- Each run now writes `source_fetch_runs` and `source_fetch_status` for `source_name='tennislive'`.
- `ensure_tennislive_schema` now installs the `source_fetch_policies` row for `tennislive`.

Reports:

- Targeted canonical ingest: `data-migration/reports/ingest_tennis_tennislive_2026-06-07_phase2_canonical_targets.json`
- Fetch contract validation: `data-migration/reports/validate_source_fetch_tennislive_2026-06-07_phase2.json`

Targeted ingest command:

```bash
python3 data-migration/scripts/ingest_tennis_tennislive_to_typed.py \
  --date 2026-06-07 \
  --force \
  --max-links 25 \
  --max-matches 2 \
  --player-url https://www.tennislive.net/atp/alex-marti-pujolras/ \
  --player-url https://www.tennislive.net/atp/carlos-sanchez-jover/ \
  --player-url https://www.tennislive.net/atp/david-jorda-sanchis/ \
  --player-url https://www.tennislive.net/atp/hynek-barton/ \
  --player-url https://www.tennislive.net/atp/matteo-martineau/ \
  --player-url https://www.tennislive.net/atp/mae-malige/ \
  --player-url https://www.tennislive.net/atp/raphael-perot/ \
  --report data-migration/reports/ingest_tennis_tennislive_2026-06-07_phase2_canonical_targets.json
```

Applied results:

- Player pages attempted/succeeded/failed: 7 / 7 / 0
- Match pages attempted/succeeded/failed: 14 / 14 / 0
- `source_fetch_status` for `tennislive` on `2026-06-07`: `success`, `complete`, 21 actual pages from 21 expected pages
- `validate_source_fetch_contract` for `tennislive` on `2026-06-07`: `ok=true`
- Active canonical IDs for the seven known duplicate players now have TennisLive profiles, surface records, match links, recent rows, form snapshots, and stat rows.

Resolver spot checks:

- `Carlos Sánchez Jover` -> `tennis-player-carlos-sanchez-jover`
- `Alex Martí Pujolras` -> `tennis-player-alex-marti-pujolras`
- `David Jordá Sanchis` -> `tennis-player-david-jorda-sanchis`
- `Hynek Bartoň` -> `tennis-player-hynek-barton`
- `Mattéo Martineau` -> `tennis-player-matteo-martineau`
- `Maé Malige` -> `tennis-player-mae-malige`
- `Raphaël Pérot` -> `tennis-player-raphael-perot`

Old strict health gate note:

- `npm run data:health:tennis -- --date 2026-06-07 --pregame` still fails `sourceFiles`, `rankings`, `warehouse`, and `published`.
- Its `tennislive` subsection is now `ok=true`.
- Remaining failures are expected outside Phase 2: missing ESPN scoreboard file, strict full-slate profile/rank expectations for players whose TennisLive pages failed or lack ranks, and published artifacts not regenerated after the DB repair.

Remaining note: Phase 2 prevents new TennisLive writes from using deactivated duplicates. It does not delete or migrate historical rows already stored under deactivated duplicate IDs; that is Phase 6 backfill/export/regression work.

## Phase 3. TennisLive Serve And Pressure Promotion

### Goal

Promote TennisLive match page serve stats from `match_stat_rows` into model-facing player and match pressure tables.

### Problem To Fix

`match_stat_rows` contains TennisLive stats such as first serve percentage, first serve points won, second serve points won, break points won, total return points won, and total points won. `service_pressure_snapshots` currently has no TennisLive rows, so health/model/export checks can miss data that is present.

### Scope

- Add a TennisLive pressure builder.
- Keep raw `match_stat_rows` as source of truth.
- Write source URLs and snapshot IDs into downstream features where possible.

### Implementation Steps

1. Add a TennisLive-specific stat normalization map for:
   - `1st SERVE %`
   - `1st SERVE POINTS WON`
   - `2nd SERVE POINTS WON`
   - `BREAK POINTS WON`
   - `TOTAL RETURN POINTS WON`
   - `TOTAL POINTS WON`
   - `ACES`
   - `DOUBLE FAULTS`
2. Derive per-match service pressure rows:
   - break points converted made/attempts/pct from `BREAK POINTS WON`
   - return pressure from `TOTAL RETURN POINTS WON`
   - first/second serve strength into `features_json` when `service_pressure_snapshots` does not have columns for the metric
3. Add or reuse a table for richer TennisLive recent service stat aggregates if needed.
4. Backfill slate players from their latest five TennisLive recent matches.
5. Preserve provenance:
   - `source_name = 'tennislive'`
   - `source_snapshot_id`
   - source match URL via source-native link tables
6. Update export code to read TennisLive pressure rows before falling back to older provider rows.

### Validation

```bash
python3 -m py_compile pipeline/sources/tennis/normalization/stats.py

sqlite3 -header -column data-private/warehouse/sports/tennis/sql-tennis.db "
select source_name, count(*) as rows, count(distinct player_id) as players
from service_pressure_snapshots
group by source_name
order by rows desc;
"
```

Expected after repair:

- `service_pressure_snapshots.source_name = 'tennislive'` has rows.
- June 7 slate players with TennisLive `match_stat_rows` also have pressure or expected-stat coverage.

### Exit Criteria

- TennisLive serve stats are available to prediction context without depending on Flashscore/SofaScore.
- Published player cards no longer say recent stat rows are missing when source TennisLive match stat rows exist.

### 2026-06-07 Execution Notes

Phase 3 was applied against the June 7 slate using existing TennisLive rows in `match_stat_rows`.

Code changes:

- Added `build_tennislive_service_pressure` to `pipeline/sources/tennis/normalization/stats.py`.
- Added TennisLive hold-percentage derivation from first-serve in, first-serve points won, and second-serve points won.
- Mapped `TOTAL RETURN POINTS WON` into the existing `service_pressure_snapshots.break_pct` return-pressure slot.
- Mapped `BREAK POINTS WON` into break-point converted fields.
- Inferred break points saved from the opponent's TennisLive `BREAK POINTS WON` row when the opponent row is present for the same historical match.
- Added `data-migration/scripts/promote_tennis_tennislive_pressure.py` as the repeatable Phase 3 promotion/report command.
- Kept source URL provenance through `match_stat_rows.source_snapshot_id -> source_snapshots.source_url`; `service_pressure_snapshots` does not currently have a source snapshot column.

Reports:

- Dry run: `data-migration/reports/promote_tennis_tennislive_pressure_2026-06-07_phase3_dry_run.json`
- Applied run: `data-migration/reports/promote_tennis_tennislive_pressure_2026-06-07_phase3.json`

Validation commands:

```bash
python3 -m py_compile \
  pipeline/sources/tennis/normalization/stats.py \
  data-migration/scripts/promote_tennis_tennislive_pressure.py

python3 data-migration/scripts/promote_tennis_tennislive_pressure.py \
  --slate-date 2026-06-07 \
  --dry-run \
  --report data-migration/reports/promote_tennis_tennislive_pressure_2026-06-07_phase3_dry_run.json

python3 data-migration/scripts/promote_tennis_tennislive_pressure.py \
  --slate-date 2026-06-07 \
  --report data-migration/reports/promote_tennis_tennislive_pressure_2026-06-07_phase3.json
```

Applied results:

- Loaded TennisLive stat rows, including opponent rows for break-point-saved inference: 7,984
- Loaded TennisLive player-match stat buckets: 998
- Selected June 7 slate-player pressure buckets: 537
- Upserted `service_pressure_snapshots` rows with `source_name='tennislive'`: 537
- June 7 slate players: 118
- June 7 slate players with TennisLive `match_stat_rows`: 111
- June 7 slate players with TennisLive `service_pressure_snapshots`: 111
- TennisLive pressure source URL provenance spot check passed through `match_stat_rows.source_snapshot_id -> source_snapshots.source_url`.

Coverage spot check after apply:

```text
source_name                  rows  players  matches
flashscore_recent_match_map  784   136      84
tennislive                   537   111      499
sofascore                    500   277      250
flashscore                   362   240      181
```

Remaining note: Phase 3 promotes rows that already exist in `match_stat_rows`. The seven June 7 slate players without TennisLive stat rows remain a fetch/parse/linkage issue for Phase 5 diagnostics and Phase 6 backfill.

Old strict health gate note:

- `npm run data:health:tennis -- --date 2026-06-07 --pregame` still exits 1 for `sourceFiles`, `rankings`, `warehouse`, and `published`.
- Its `tennislive` subsection is `ok=true`.
- The warehouse section now reports `statPlayers=111`, matching the 111 slate players with TennisLive stat rows and TennisLive pressure rows.
- Remaining failures are outside Phase 3: missing ESPN scoreboard file, rank/profile expectations for partial players, published artifacts not regenerated after the DB repair, and health still treating partial DK-only context as hard failure.

## Phase 4. Tennistonic Supplemental Context Decision

### Goal

Decide whether Tennistonic returns as an active typed supplemental source or remains archived.

### Problem To Fix

The user-facing desire is to use Tennistonic rank/history and H2H context when it has data, but active source policy currently blocks Tennistonic commands and active artifacts.

### Current State

`data:typed:ingest:tennis-tennistonic` is routed to the blocked legacy-source script. Existing TennisTonic rows are only present for older archived slates. Active source audits reject `tennistonic` text in generated/public artifacts.

### Implementation Options

Option A: Keep Tennistonic archived.

- Do not use it in active predictions.
- Remove Tennistonic from current run expectations.
- Keep active-source audit unchanged.

Option B: Reintroduce Tennistonic as typed supplemental context.

- Rename the source family to a neutral active name only if policy allows it.
- Store raw pages or generated DOM JSON in `source_snapshots`.
- Write H2H/opponent quality to `match_context_snapshots`.
- Write ranking/history only if fields are source-attributed and more complete than ESPN/Live Tennis.
- Keep it out of public artifact text if the active-source audit still blocks the name.

### Implementation Steps For Option B

1. Unblock or replace `data:typed:ingest:tennis-tennistonic` with `data-migration/scripts/ingest_tennis_tennistonic_context.py`.
2. Add source fetch status writes for Tennistonic attempts and parse output.
3. Add validation that every context row has:
   - `match_id`
   - `source_url`
   - `source_snapshot_id`
   - `feature_family`
   - parse status
4. Decide how public artifacts may cite the source:
   - either allow `tennistonic` in active-source audit
   - or keep Tennistonic rows private and expose only neutral derived fields with DB provenance
5. Update the feature contract and runbook to say Tennistonic is supplemental, not a hard gate.

### Validation

```bash
npm run data:typed:ingest:tennis-tennistonic -- --date YYYY-MM-DD \
  --clay-context web/src/lib/day-YYYY-MM-DD-tennis-clay-context.generated.json \
  --opponent-quality web/src/lib/day-YYYY-MM-DD-tennis-opponent-quality.generated.json

sqlite3 -header -column data-private/warehouse/sports/tennis/sql-tennis.db "
select source_name, feature_family, snapshot_date, count(*) as rows
from match_context_snapshots
where lower(source_name) like '%tennistonic%'
   or lower(feature_family) like '%tennistonic%'
group by source_name, feature_family, snapshot_date;
"
```

### Exit Criteria

- Tennistonic is either clearly archived or clearly typed-supplemental.
- Active audits agree with that policy.
- Health checks do not silently require a blocked source.

### 2026-06-07 Execution Notes

Phase 4 chose Option B with a public-safety constraint: Tennistonic-derived rows are allowed as private typed supplemental context, but active public artifacts must not expose blocked source text or URLs.

Code changes:

- Re-enabled `npm run data:typed:ingest:tennis-tennistonic` as a typed supplemental importer instead of the blocked legacy command.
- Added `data-migration/scripts/ingest_tennis_tennistonic_context.py` support for:
  - default generated artifact paths by date
  - `--source-db`, `--report`, `--dry-run`, and `--allow-missing-artifacts`
  - neutral typed source name: `tennis_supplemental_context`
  - neutral feature families: `supplemental_clay_context` and `supplemental_opponent_quality`
  - `source_fetch_policies`, `source_fetch_runs`, and `source_fetch_status`
  - source URL preservation in private `source_snapshots.source_url`
  - player-level supplemental history writes to `player_form_snapshots`
  - payload sanitization so neutral typed context does not contain blocked active-source text
- Added `data-migration/scripts/validate_tennis_supplemental_context.py` and `npm run data:typed:validate:tennis-supplemental-context`.

Important policy:

- Do not write `tennistonic` into active public artifacts.
- Do preserve the original source URL in `source_snapshots`.
- Do not insert ranking rows as Tennistonic rankings when the rank came from the separate ranking artifact. Joined rank fields may remain inside supplemental player history as context, while canonical `rankings` stays owned by the ranking source.

Positive validation run:

```bash
python3 data-migration/scripts/ingest_tennis_tennistonic_context.py \
  --date 2026-06-04 \
  --report data-migration/reports/ingest_tennis_tennistonic_context_2026-06-04_phase4.json

npm run data:typed:validate:tennis-supplemental-context -- \
  --date 2026-06-04 \
  --report data-migration/reports/validate_tennis_supplemental_context_2026-06-04_phase4.json
```

June 4 applied results:

- Source snapshots: 23
- Match context snapshots: 46
- Supplemental player history rows: 43
- Source URLs preserved: 23
- Validation classification: `inserted_with_unlinked_players`
- Unlinked player rows: 3
- Blocked provider text in neutral context/player-history payloads: 0

June 7 diagnostic run:

```bash
npm run data:typed:ingest:tennis-tennistonic -- \
  --date 2026-06-07 \
  --allow-missing-artifacts \
  --report data-migration/reports/ingest_tennis_tennistonic_context_2026-06-07_phase4_missing_artifacts.json

npm run data:typed:validate:tennis-supplemental-context -- \
  --date 2026-06-07 \
  --report data-migration/reports/validate_tennis_supplemental_context_2026-06-07_phase4.json
```

June 7 diagnostic results:

- Missing generated artifacts:
  - `web/src/lib/day-2026-06-07-tennis-clay-context.generated.json`
  - `web/src/lib/day-2026-06-07-tennis-opponent-quality.generated.json`
- Source fetch status: `missing`
- Completeness classification: `source_fetch_missing`
- Match context snapshots inserted: 0
- Supplemental player history rows inserted: 0
- Validation classification: `source_fetch_missing`

Active public audit:

```bash
npm run data:audit:tennis-active-sources -- --date 2026-06-07
```

Result: passed. Active June 7 artifacts still contain no blocked legacy source references.

Remaining note: Phase 4 does not fetch/generate new Tennistonic artifacts. It restores a safe typed supplemental import path and makes missing generated artifacts visible from source status and validation reports. A future optional fetch/backfill can run `pipeline/tennis/publish/generate-clay-context.mjs` and `pipeline/tennis/publish/enrich-opponent-quality.mjs`, then import through this adapter.

## Phase 5. Health Gate Rewrite

### Goal

Rewrite `data:health:tennis` so failures are diagnostic instead of blunt.

### Problem To Fix

The current gate still expects ESPN scoreboard and complete TennisLive depth for every slate player. It also checks rank only from `tennislive_player_profiles.current_ranking`, even when canonical `rankings` rows exist.

### Scope

- Update `pipeline/tennis/workflows/health.py`.
- Keep strict mode available.
- Add pregame DK-only qualifier tolerance where appropriate.

### New Health Categories

1. `sourceFetch`
   - attempted URLs
   - success count
   - failed count
   - missing source receipt count
2. `sourceParse`
   - source snapshots parsed
   - parser failures
   - parsed rows by source-native table
3. `typedInsert`
   - canonical typed rows inserted
   - player/match/stat/rank rows by table
4. `slateLinkage`
   - rows linked to `matches.match_date`
   - rows linked to slate `match_players`
   - rows stranded on redirected/deactivated player IDs
5. `publishReadiness`
   - generated context file exists
   - public detail payload has required minimum fields
   - market-only rows are marked as partial instead of failing the entire slate
6. `settlementReadiness`
   - results, replay, candles, and labels only required in settled mode

### Implementation Steps

1. Keep ESPN scoreboard as required only when an ESPN-source run mode is requested.
2. Accept canonical `rankings` rows as rank coverage, with TennisLive profile rank as preferred but not exclusive.
3. Compare slate player coverage against full-depth TennisLive matches and market-only DK rows separately.
4. Add a diagnostic list of rows where data exists on a redirected or duplicate player ID.
5. Add explicit failed-fetch summaries from `source_snapshots.status = 'failed'` and `source_fetch_status`.
6. Emit machine-readable JSON with statuses:
   - `ok`
   - `warning`
   - `failed`
   - `not_applicable`

### Validation

```bash
python3 -m py_compile pipeline/tennis/workflows/health.py

npm run data:health:tennis -- --date YYYY-MM-DD --pregame
npm run data:health:tennis -- --date YYYY-MM-DD --pregame --strict
```

### Exit Criteria

- Health output tells whether each miss is fetch, parse, insert, or linkage.
- DK-only qualifier rows produce partial-context warnings unless the prediction path requires full depth.
- Strict mode still exists for full-depth slates.

### Phase 5 Execution, June 7 Slate

Implemented in `pipeline/tennis/workflows/health.py`.

New behavior:

- `sourceFiles` requires the generated warehouse context in normal pregame mode. ESPN scoreboard is required only in strict or settled mode.
- `sourceFetch` reads `source_fetch_status` and `source_fetch_policies`, and reports:
  - source rows that were explicitly missing or failed
  - required rows whose completeness is still `unknown`
  - source policies with no status receipt for the slate
  - failed `source_snapshots`
- `sourceParse` reports `source_fetch_missing`, `source_parsed_empty`, `source_parsed_but_not_inserted`, and failed source snapshots separately.
- `typedInsert` reports typed match, match-player, market, rank, profile, recent, stat, pressure, and form coverage.
- `slateLinkage` reports redirected slate player IDs and full-depth rows where typed data is populated on a canonical target but the slate still points at the duplicate/source ID.
- `publishReadiness` summarizes generated context, published detail payloads, and value-book completeness.
- `settlementReadiness` is `not_applicable` for pregame mode and only requires replay/candles/results/training labels in settled mode.
- `--strict` promotes partial-context warnings to hard failures.

Validation:

```bash
python3 -m py_compile pipeline/tennis/workflows/health.py
npm run data:health:tennis -- --date 2026-06-07 --pregame
npm run data:health:tennis -- --date 2026-06-07 --pregame --strict
```

Normal pregame result:

- Status: `PASS`
- The gate now passes with warnings instead of failing the whole slate because the site has enough typed match, TennisLive, market, and value-book data to publish known partial rows.
- Key counts:
  - 91 typed matches
  - 36 full-depth TennisLive matches
  - 55 market-only matches
  - 118 slate players
  - 274 typed market snapshots
  - 111 slate players with profile/recent/stat/pressure/form coverage
- Warnings now identify the actual buckets:
  - optional source files missing: ESPN scoreboard and FanDuel lines
  - `tennis_supplemental_context` missing because generated clay/opponent-quality artifacts are absent
  - `tennis_odds` and `tennis_rankings` succeeded but still report unknown completeness
  - legacy required policies have no June 7 status receipt
  - 8 full-depth slate players still point at redirected duplicate IDs
  - 5 full-depth players are missing strict rank/stat/pressure coverage
  - published detail payload checks 55 game files and 110 players, with 20 partial warehouse-context cells

Strict result:

- Status: `FAIL`
- Expected strict failures:
  - `sourceFiles`: ESPN scoreboard missing
  - `sourceFetch`: missing/unknown/unreceipted source policy rows
  - `sourceParse`: supplemental context classified as `source_fetch_missing`
  - `rankings`: strict slate ranking coverage incomplete
  - `typedInsert`: strict typed coverage incomplete for all slate players
  - `slateLinkage`: redirected or unlinked full-depth player rows remain
  - `warehouse`: strict TennisLive warehouse coverage incomplete
  - `published`: strict published payload requires all identity/stat/chart cells

Performance note: slate-player coverage is cached within a single health process, reducing repeated pregame health from roughly 38 seconds to about 5 seconds on the June 7 warehouse.

## Phase 6. Backfill, Export, And Regression Gates

### Goal

Apply the fixed ingestion path to recent slates and prove the public site/export path reads the repaired warehouse state.

### Scope

- Backfill June 6 and June 7 TennisLive context.
- Re-export warehouse context.
- Re-run predictions only if the repaired features intentionally change the prediction artifact.
- Preserve current published dates.

### Implementation Steps

1. Run identity repair and validation.
2. Re-run TennisLive ingestion for June 6 and June 7 with the canonical resolver.
3. Run TennisLive pressure promotion.
4. Re-export warehouse context:

```bash
npm run data:export:tennis-published-slate -- --date YYYY-MM-DD
```

5. Run public and warehouse audits:

```bash
npm run data:audit:tennis-active-sources -- --date YYYY-MM-DD
npm run data:audit:tennis-match-contract -- --date YYYY-MM-DD
node scripts/audit-tennis-warehouse-identity.mjs --date YYYY-MM-DD --allow-partial-market-context
npm run data:health:tennis -- --date YYYY-MM-DD --pregame
```

6. If prediction artifacts change, snapshot the model run and publish through the normal runbook.
7. Confirm Vercel/public data still preserves old slate dates.

### Validation Queries

```bash
sqlite3 -header -column data-private/warehouse/sports/tennis/sql-tennis.db "
with slate as (
  select distinct mp.player_id, p.name
  from match_players mp
  join matches m on m.match_id = mp.match_id
  join players p on p.player_id = mp.player_id
  where m.match_date = 'YYYY-MM-DD'
)
select
  count(*) as slate_players,
  sum(case when exists (select 1 from tennislive_player_profiles p where p.player_id = slate.player_id) then 1 else 0 end) as profiles,
  sum(case when exists (select 1 from rankings r where r.player_id = slate.player_id and r.ranking_date <= 'YYYY-MM-DD') then 1 else 0 end) as rankings,
  sum(case when exists (select 1 from recent_matches r where r.player_id = slate.player_id and r.source_name = 'tennislive') then 1 else 0 end) as recent_matches,
  sum(case when exists (select 1 from match_stat_rows s where s.player_id = slate.player_id and s.source_name = 'tennislive') then 1 else 0 end) as match_stats,
  sum(case when exists (select 1 from service_pressure_snapshots s where s.player_id = slate.player_id and s.source_name = 'tennislive') then 1 else 0 end) as pressure
from slate;
"
```

### Exit Criteria

- June 7 health no longer fails because successfully fetched data is stranded on duplicate IDs.
- Health distinguishes true upstream 404s from parser/write/linkage defects.
- Published-data index date preservation still passes.
- The site can show current and tomorrow tennis slates without deleting older dates.

### Phase 6 Execution, June 6 And June 7 Backfill

Phase 6 was run as a warehouse backfill and publish verification pass for the June 7 tennis slate. June 6 was backfilled in the warehouse, but the public June 6 slate remains an MLB slate and does not have a tennis day module.

Identity repair was rerun before the backfill:

```text
repair redirect_ready=642 redirects_written=642
validation ok=true active_redirects=938 orphan_redirects=0 active_from_players=0 active_abbrev_stubs=0 active_duplicate_normalized_groups=0
```

Reports:

- `data-migration/reports/repair_tennis_player_identity_phase6_2026-06-07.json`
- `data-migration/reports/validate_tennis_player_identity_repair_phase6_2026-06-07.json`

Focused TennisLive backfill used the known slate player and match source URLs with `--max-links 0 --max-matches 0` to avoid broad recent-match crawling:

```text
2026-06-06: player_attempts=40 player_successes=40 match_attempts=33 match_successes=33 status=complete
2026-06-07: player_attempts=104 player_successes=103 match_attempts=36 match_successes=36 status=partial
2026-06-07 retry: https://www.tennislive.net/atp/giuseppe-la-vela/ status=complete
```

Reports:

- `data-migration/reports/ingest_tennis_tennislive_2026-06-06_phase6.json`
- `data-migration/reports/ingest_tennis_tennislive_2026-06-07_phase6.json`
- `data-migration/reports/ingest_tennis_tennislive_2026-06-07_phase6_retry_giuseppe_la_vela.json`

Important source-status note: the June 7 retry rewrote the latest `source_fetch_status` row for `tennislive` to the one-page retry counts. The full batch report and `source_snapshots` still preserve the original 139/140 batch result plus the transient failed snapshot.

TennisLive pressure promotion was rerun after the backfill:

```text
2026-06-06: selected_players=54 pressure_players_before=23 pressure_players_after=51 stat_players_after=51 row_delta=176
2026-06-07: selected_players=118 pressure_players_before=111 pressure_players_after=111 stat_players_after=111 row_delta=1
```

Reports:

- `data-migration/reports/promote_tennis_tennislive_pressure_2026-06-06_phase6.json`
- `data-migration/reports/promote_tennis_tennislive_pressure_2026-06-07_phase6.json`

Warehouse context export was rerun for both dates:

```bash
npm run data:export:tennis-warehouse-context -- --date 2026-06-06
npm run data:export:tennis-warehouse-context -- --date 2026-06-07
```

June 7 was republished to the durable slate folder and then exported to the public current window:

```bash
npm run data:export:tennis-published-slate -- --date 2026-06-07
PUBLIC_SLATE_DATE=2026-06-07 PUBLIC_SLATE_SCOPE=current-window npm run data:export:published
```

Publish results:

- June 7 tennis published slate exported 55 games to `published-data/slates/2026-06-07`.
- `web/public/data/current/summary.json` points to `currentSlate=2026-06-07` with 55 tennis games.
- Durable `published-data/slates/index.json` still had 29 dates after export, including both `2026-06-06` and `2026-06-07`.
- The public current-window export emitted MLB fallback warnings for older non-tennis days. Review those generated MLB/meta diffs before committing.

Regression gates:

| Date | Gate | Result | Notes |
|---|---|---|---|
| 2026-06-06 | `data:audit:tennis-active-sources` | pass | No public tennis games for the date. |
| 2026-06-06 | `data:audit:tennis-match-contract` | pass | 34 warehouse matches; surfaces Clay 17, Grass 11, Hard 6. |
| 2026-06-06 | `data:audit:tennis-warehouse-identity --allow-partial-market-context` | not_applicable | No `web/src/lib/day-2026-06-06.js` tennis day module; public slate is MLB-only. |
| 2026-06-06 | `data:health:tennis --pregame` | expected fail | Public/published tennis checks fail because June 6 is not a public tennis slate. TennisLive linkage also shows 32 mapped matches of 34 because of duplicate/reversed match IDs from older rows. |
| 2026-06-07 | `data:audit:tennis-active-sources` | pass | Scanned day module, warehouse context, published slate, public slate, and public current data. |
| 2026-06-07 | `data:audit:tennis-match-contract` | pass | 91 warehouse matches; surfaces Clay 73, Hard 4, Grass 14. |
| 2026-06-07 | `data:audit:tennis-warehouse-identity --allow-partial-market-context` | pass | 110 public players; 14 partial rows, 0 blocking missing rows. |
| 2026-06-07 | `data:health:tennis --pregame` | pass with warnings | Warnings remain for optional/missing source receipts, partial supplemental context, and public value-book coverage. |

Warehouse coverage after Phase 6:

| Date | Slate players | Profiles | Rankings | Recent matches | Match stats | Pressure |
|---|---:|---:|---:|---:|---:|---:|
| 2026-06-06 | 54 | 44 | 46 | 44 | 51 | 51 |
| 2026-06-07 | 118 | 112 | 100 | 111 | 111 | 111 |

Follow-ups:

- Clean duplicate/reversed June 6 TennisLive match IDs if June 6 ever needs to become a public tennis slate.
- Preserve the full June 7 batch reports when auditing source fetch health, because the one-page retry is now the latest `source_fetch_status` row.
- Review public export diffs for older MLB slates/model-history before staging, since `data:export:published` refreshed more than the current tennis slate.

## Phase Dependencies

Run phases in order:

1. Identity canonicalization repair.
2. TennisLive ingest canonical resolver.
3. TennisLive serve and pressure promotion.
4. Tennistonic supplemental context decision.
5. Health gate rewrite.
6. Backfill, export, and regression gates.

Phase 4 can be deferred if the active-source policy remains TennisLive-only. Phases 1, 2, 3, and 5 are required to make the June 7 ingestion issue visible and fixable.

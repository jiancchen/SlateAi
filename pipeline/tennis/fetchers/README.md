# Tennis Fetchers

Tennis source pull scripts live here after migration.

- ESPN scoreboard and rankings pulls.
- Flashscore slate, player-page, current-match, and recent stat pulls.
- SofaScore match/slate pulls.
- Flashscore point-by-point pulls from `df_mh_1_<matchId>` when SofaScore replay mapping misses; Livesport is fallback only when Flashscore cannot supply the match/player URL.
- FanDuel event-page market scrape.
- Roland Garros weather warehousing.

## Flashscore Player Pages And Challenger Rows

Flashscore is the first source for Robinhood/Challenger rows. Use tournament pages to resolve board matches to Flashscore match ids and player profile URLs, then use player pages for recent singles context and recent-match stat joins.

```bash
npm run data:fetch:tennis-flashscore-player-pages -- \
  --date 2026-06-02 \
  --recent-limit 5

npm run data:import:tennis-flashscore
npm run data:backfill:tennis-recent-form -- --date 2026-06-02
```

This writes `flashscore-player-pages-YYYY-MM-DD.json`, updates `flashscore-recent-match-map-YYYY-MM-DD.json`, and stores recent match stat files under `data-private/reference/tennis/flashscore-match-stats/`.

## Flashscore / Livesport Point-By-Point

Use this when a Flashscore match URL is available and the slate needs replay flow warehoused. A Livesport URL is acceptable only as a fallback because the feed format is compatible.

```bash
npm run data:fetch:tennis-livesport-pbp -- \
  --url 'https://www.livesport.com/game/tennis/cobolli-flavio-zDtaCcPe/svajda-zachary-vynGYhMa/summary/point-by-point/set-1/?mid=pWVT5bC5' \
  --slate-date 2026-06-01 \
  --board-title 'Flavio Cobolli vs Zachary Svajda'

npm run data:import:tennis-livesport-pbp
```

The fetcher stores the URL player map with match id, source URL, home/away player names, Livesport player slug ids, board match id when known or inferred, games, points, break points, set points, and raw feed payloads.

# Tennis Fetchers

Tennis source pull scripts live here after migration.

- ESPN scoreboard and rankings pulls.
- Flashscore slate/recent stat pulls.
- SofaScore match/slate pulls.
- Livesport/Flashscore point-by-point pulls from `df_mh_1_<matchId>` when SofaScore replay mapping misses.
- FanDuel event-page market scrape.
- Roland Garros weather warehousing.

## Livesport / Flashscore Point-By-Point

Use this when a Livesport or Flashscore match URL is available and the slate needs replay flow warehoused.

```bash
npm run data:fetch:tennis-livesport-pbp -- \
  --url 'https://www.livesport.com/game/tennis/cobolli-flavio-zDtaCcPe/svajda-zachary-vynGYhMa/summary/point-by-point/set-1/?mid=pWVT5bC5' \
  --slate-date 2026-06-01 \
  --board-title 'Flavio Cobolli vs Zachary Svajda'

npm run data:import:tennis-livesport-pbp
```

The fetcher stores the URL player map with match id, source URL, home/away player names, Livesport player slug ids, board match id when known or inferred, games, points, break points, set points, and raw feed payloads.

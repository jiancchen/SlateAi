-- Tennis canonical audit views.
--
-- These views define read-only surfaces for auditing the warehouse before any
-- replacement tennis model is designed. They intentionally separate canonical
-- TennisLive-shaped rows from market-watch rows and archived TEN-T0 outputs.

drop view if exists v_tennis_canonical_matches;
create view v_tennis_canonical_matches as
with participant_shape as (
  select
    match_id,
    count(*) as participant_rows,
    count(distinct player_id) as distinct_players
  from match_players
  group by match_id
),
tennislive_source_one as (
  select
    match_id,
    max(source_match_url) as source_match_url,
    max(last_source_snapshot_id) as last_source_snapshot_id
  from tennislive_match_sources
  where active = 1
  group by match_id
),
tennislive_summary_one as (
  select *
  from tennislive_match_summaries
  where rowid in (
    select max(rowid)
    from tennislive_match_summaries
    group by match_id
  )
)
select
  m.match_id,
  m.match_date,
  m.start_time_utc,
  case
    when m.start_time_utc is null or m.start_time_utc = '' then 'missing_start_time'
    else 'has_start_time'
  end as start_time_status,
  m.status,
  m.round,
  m.tour,
  m.surface,
  m.best_of,
  m.tournament_id,
  t.name as tournament_name,
  t.level as tournament_level,
  tl.source_match_url as tennislive_match_url,
  tl.last_source_snapshot_id as tennislive_source_snapshot_id,
  tls.score_text as tennislive_score_text,
  tls.winner_name as tennislive_winner_name,
  participant_shape.participant_rows,
  participant_shape.distinct_players,
  'canonical' as audit_bucket
from matches m
join participant_shape on participant_shape.match_id = m.match_id
join tennislive_source_one tl on tl.match_id = m.match_id
left join tennislive_summary_one tls on tls.match_id = m.match_id
left join tournaments t on t.tournament_id = m.tournament_id
where m.match_date is not null
  and m.match_date != ''
  and m.status is not null
  and m.status != ''
  and participant_shape.participant_rows = 2
  and participant_shape.distinct_players = 2;

drop view if exists v_tennis_canonical_match_players;
create view v_tennis_canonical_match_players as
select
  mp.match_id,
  mp.player_id,
  mp.side,
  mp.seed,
  mp.pre_match_rank,
  mp.market_name,
  p.name,
  p.canonical_name,
  p.tour,
  p.country,
  p.birth_date,
  tlp.source_player_url as tennislive_player_url,
  tlp.last_source_snapshot_id as tennislive_source_snapshot_id,
  'canonical' as audit_bucket
from match_players mp
join v_tennis_canonical_matches cm on cm.match_id = mp.match_id
join players p on p.player_id = mp.player_id
left join tennislive_player_sources tlp on tlp.player_id = mp.player_id and tlp.active = 1;

drop view if exists v_tennis_quarantine_non_tennislive_matches;
create view v_tennis_quarantine_non_tennislive_matches as
with participant_shape as (
  select
    match_id,
    count(*) as participant_rows,
    count(distinct player_id) as distinct_players
  from match_players
  group by match_id
),
active_tennislive_match_ids as (
  select distinct match_id
  from tennislive_match_sources
  where active = 1
)
select
  m.match_id,
  case
    when instr(m.match_id, '-') > 0 then substr(m.match_id, 1, instr(m.match_id, '-') - 1)
    else 'none'
  end as id_prefix,
  m.match_date,
  m.start_time_utc,
  m.status,
  m.tour,
  m.surface,
  coalesce(participant_shape.participant_rows, 0) as participant_rows,
  coalesce(participant_shape.distinct_players, 0) as distinct_players,
  'quarantine' as audit_bucket,
  'match_not_attached_to_active_tennislive_source' as audit_reason
from matches m
left join participant_shape on participant_shape.match_id = m.match_id
left join active_tennislive_match_ids tl on tl.match_id = m.match_id
where tl.match_id is null;

drop view if exists v_tennis_needs_review_match_shapes;
create view v_tennis_needs_review_match_shapes as
with participant_shape as (
  select
    match_id,
    count(*) as participant_rows,
    count(distinct player_id) as distinct_players
  from match_players
  group by match_id
)
select
  m.match_id,
  m.match_date,
  m.start_time_utc,
  m.status,
  coalesce(participant_shape.participant_rows, 0) as participant_rows,
  coalesce(participant_shape.distinct_players, 0) as distinct_players,
  case
    when participant_shape.participant_rows != 2 or participant_shape.distinct_players != 2 then 'participant_shape_not_two_distinct_players'
    when m.start_time_utc is null or m.start_time_utc = '' then 'missing_start_time'
    when m.status is null or m.status = '' then 'missing_status'
    else 'review'
  end as audit_reason,
  'needs_review' as audit_bucket
from matches m
left join participant_shape on participant_shape.match_id = m.match_id
where coalesce(participant_shape.participant_rows, 0) != 2
   or coalesce(participant_shape.distinct_players, 0) != 2
   or m.start_time_utc is null
   or m.start_time_utc = ''
   or m.status is null
   or m.status = '';

drop view if exists v_tennis_resolved_market_snapshots;
create view v_tennis_resolved_market_snapshots as
with duplicate_groups as (
  select
    match_id,
    player_id,
    source_name,
    market_type,
    selection,
    line_value,
    captured_at,
    count(*) as duplicate_group_rows
  from market_snapshots
  group by match_id, player_id, source_name, market_type, selection, line_value, captured_at
)
select
  ms.market_snapshot_id,
  ms.match_id,
  ms.player_id,
  ms.source_name,
  ms.market_type,
  ms.selection,
  ms.line_value,
  ms.odds_american,
  ms.price_cents,
  ms.implied_probability,
  ms.captured_at,
  dg.duplicate_group_rows,
  case
    when dg.duplicate_group_rows > 1 then 'needs_review_duplicate_market_group'
    else 'resolved_market'
  end as audit_reason,
  case
    when dg.duplicate_group_rows > 1 then 'needs_review'
    else 'canonical'
  end as audit_bucket
from market_snapshots ms
join v_tennis_canonical_matches cm on cm.match_id = ms.match_id
join players p on p.player_id = ms.player_id
join duplicate_groups dg
  on dg.match_id = ms.match_id
 and dg.player_id = ms.player_id
 and dg.source_name = ms.source_name
 and dg.market_type = ms.market_type
 and dg.selection = ms.selection
 and (dg.line_value = ms.line_value or (dg.line_value is null and ms.line_value is null))
 and dg.captured_at = ms.captured_at
where ms.match_id is not null
  and ms.match_id != ''
  and ms.player_id is not null
  and ms.player_id != '';

drop view if exists v_tennis_market_identity_gaps;
create view v_tennis_market_identity_gaps as
select
  ms.market_snapshot_id,
  ms.match_id,
  ms.player_id,
  ms.source_name,
  ms.market_type,
  ms.selection,
  ms.line_value,
  ms.odds_american,
  ms.price_cents,
  ms.implied_probability,
  ms.captured_at,
  case
    when ms.match_id is null or ms.match_id = '' then 'missing_match_id'
    when m.match_id is null then 'match_id_not_in_matches'
    when ms.player_id is null or ms.player_id = '' then 'missing_player_id'
    when p.player_id is null then 'player_id_not_in_players'
    else 'review'
  end as audit_reason,
  'needs_review' as audit_bucket
from market_snapshots ms
left join matches m on m.match_id = ms.match_id
left join players p on p.player_id = ms.player_id
where ms.match_id is null
   or ms.match_id = ''
   or m.match_id is null
   or ms.player_id is null
   or ms.player_id = ''
   or p.player_id is null;

drop view if exists v_tennis_forensic_prediction_rows;
create view v_tennis_forensic_prediction_rows as
select
  p.prediction_row_id,
  p.model_run_id,
  mr.model_id,
  mr.run_date,
  mr.run_type,
  mr.status as model_run_status,
  p.match_id,
  p.player_id,
  p.lane,
  p.market_type,
  p.selection,
  p.predicted_probability,
  p.projected_value,
  p.confidence,
  p.ev_cents,
  p.price_cents,
  p.odds_american,
  p.created_at,
  case when p.model_run_id like 'tennis-TEN-T0-%' then 1 else 0 end as is_ten_t0,
  case when instr(coalesce(p.rationale_json, ''), '"marketOnly":true') > 0 then 1 else 0 end as is_market_only,
  case when m.match_id is null then 1 else 0 end as missing_db_match,
  case
    when p.model_run_id like 'tennis-TEN-T0-%' and instr(coalesce(p.rationale_json, ''), '"marketOnly":true') > 0 then 'ten_t0_market_only_row_captured_as_prediction'
    when p.model_run_id like 'tennis-TEN-T0-%' then 'ten_t0_archived_forensic'
    when m.match_id is null then 'prediction_row_match_id_not_in_matches'
    else 'prediction_row_review'
  end as audit_reason,
  case
    when p.model_run_id like 'tennis-TEN-T0-%' then 'quarantine'
    when m.match_id is null then 'quarantine'
    else 'needs_review'
  end as audit_bucket
from prediction_rows p
left join model_runs mr on mr.model_run_id = p.model_run_id
left join matches m on m.match_id = p.match_id;

drop view if exists v_tennis_prediction_settlement_status;
create view v_tennis_prediction_settlement_status as
select
  p.prediction_row_id,
  p.model_run_id,
  p.match_id,
  p.lane,
  p.market_type,
  p.selection,
  sr.settlement_row_id,
  sr.settled_at,
  sr.result_value,
  sr.won,
  sr.profit_cents,
  case
    when sr.settlement_row_id is null then 'missing_settlement'
    else 'settled'
  end as settlement_status
from prediction_rows p
left join settlement_rows sr on sr.prediction_row_id = p.prediction_row_id;

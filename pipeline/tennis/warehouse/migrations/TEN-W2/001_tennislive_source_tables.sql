create table if not exists tennislive_player_sources (
  player_id text not null,
  source_name text not null default 'tennislive',
  source_player_url text not null,
  source_player_slug text,
  tour text,
  first_seen_at text not null default current_timestamp,
  last_ingested_at text,
  last_content_hash text,
  last_source_snapshot_id text,
  active integer not null default 1,
  primary key (player_id, source_name, source_player_url)
);

create unique index if not exists idx_tennislive_player_sources_url
  on tennislive_player_sources(source_player_url);

create table if not exists tennislive_player_profiles (
  player_id text not null,
  source_name text not null default 'tennislive',
  source_player_url text,
  name text,
  country text,
  birthdate text,
  age integer,
  current_ranking integer,
  ranking_label text,
  top_ranking integer,
  top_ranking_date text,
  top_ranking_points integer,
  points integer,
  prize_money text,
  matches_total integer,
  wins integer,
  losses integer,
  win_pct real,
  source_snapshot_id text,
  captured_at text not null,
  raw_json text,
  primary key (player_id, source_name, captured_at)
);

create index if not exists idx_tennislive_player_profiles_player
  on tennislive_player_profiles(player_id, captured_at desc);

create table if not exists tennislive_player_surface_records (
  player_id text not null,
  source_name text not null default 'tennislive',
  source_player_url text,
  season text not null,
  surface text not null,
  wins integer,
  losses integer,
  win_pct real,
  source_snapshot_id text,
  captured_at text not null,
  raw_text text,
  primary key (player_id, source_name, season, surface, captured_at)
);

create index if not exists idx_tennislive_surface_records_player
  on tennislive_player_surface_records(player_id, season, surface);

create table if not exists tennislive_player_match_links (
  tennislive_match_link_id text primary key,
  player_id text not null,
  match_id text,
  source_name text not null default 'tennislive',
  source_player_url text,
  source_match_url text not null,
  match_date text,
  round text,
  player1_name text,
  player2_name text,
  opponent_name text,
  result_text text,
  score_text text,
  tournament text,
  surface text,
  outcome text,
  source_snapshot_id text,
  discovered_at text not null default current_timestamp,
  last_ingested_at text,
  ingest_status text not null default 'discovered',
  raw_json text
);

create unique index if not exists idx_tennislive_player_match_links_player_url
  on tennislive_player_match_links(player_id, source_match_url);

create index if not exists idx_tennislive_player_match_links_match
  on tennislive_player_match_links(match_id);

create table if not exists tennislive_match_sources (
  match_id text not null,
  source_name text not null default 'tennislive',
  source_match_url text not null,
  source_match_slug text,
  source_event_slug text,
  source_event_label text,
  first_seen_at text not null default current_timestamp,
  last_ingested_at text,
  last_content_hash text,
  last_source_snapshot_id text,
  active integer not null default 1,
  primary key (match_id, source_name, source_match_url)
);

create unique index if not exists idx_tennislive_match_sources_url
  on tennislive_match_sources(source_match_url);

create table if not exists tennislive_match_summaries (
  match_id text primary key,
  source_name text not null default 'tennislive',
  source_match_url text,
  match_date text,
  start_time_local text,
  round text,
  player1_name text,
  player2_name text,
  winner_name text,
  score_text text,
  tournament text,
  tournament_url text,
  country text,
  surface text,
  status text,
  source_snapshot_id text,
  captured_at text not null,
  raw_json text
);

create table if not exists tennislive_match_player_snapshots (
  match_player_snapshot_id text primary key,
  match_id text not null,
  player_id text,
  source_name text not null default 'tennislive',
  source_match_url text,
  side integer,
  player_name text,
  country text,
  birthdate text,
  age integer,
  height text,
  weight text,
  pro_since text,
  play_hand text,
  current_ranking integer,
  points integer,
  prize_money text,
  photo_url text,
  source_snapshot_id text,
  captured_at text not null,
  raw_json text
);

create index if not exists idx_tennislive_match_player_snapshots_match
  on tennislive_match_player_snapshots(match_id, side);

create table if not exists tennislive_match_replay_games (
  replay_game_id text primary key,
  match_id text not null,
  set_number integer,
  game_number integer,
  server_name text,
  score_before text,
  score_after text,
  raw_points_text text,
  break_point_count integer,
  deuce_count integer,
  is_tiebreak integer not null default 0,
  source_snapshot_id text,
  captured_at text not null
);

create index if not exists idx_tennislive_replay_games_match
  on tennislive_match_replay_games(match_id, set_number, game_number);

create table if not exists tennislive_match_replay_points (
  replay_point_id text primary key,
  replay_game_id text not null,
  match_id text not null,
  set_number integer,
  game_number integer,
  point_number integer,
  point_score text,
  is_break_point integer not null default 0,
  is_deuce integer not null default 0,
  is_tiebreak integer not null default 0,
  raw_point_text text,
  source_snapshot_id text
);

create index if not exists idx_tennislive_replay_points_game
  on tennislive_match_replay_points(replay_game_id, point_number);

create table if not exists tennislive_h2h_source_rows (
  h2h_source_row_id text primary key,
  source_name text not null default 'tennislive',
  source_url text,
  player1_id text,
  player2_id text,
  match_id text,
  match_date text,
  round text,
  player1_name text,
  player2_name text,
  winner_name text,
  score_text text,
  tournament text,
  surface text,
  source_match_url text,
  source_snapshot_id text,
  captured_at text not null,
  raw_json text
);

create index if not exists idx_tennislive_h2h_players
  on tennislive_h2h_source_rows(player1_id, player2_id, match_date);

create table if not exists tennislive_form_chart_points (
  form_chart_point_id text primary key,
  player_id text,
  source_name text not null default 'tennislive',
  source_url text,
  chart_context text,
  opponent_player_id text,
  sequence_index integer,
  form_value real,
  label text,
  source_snapshot_id text,
  captured_at text not null,
  raw_json text
);

create index if not exists idx_tennislive_form_chart_points_player
  on tennislive_form_chart_points(player_id, chart_context, sequence_index);

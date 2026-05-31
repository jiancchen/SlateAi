create table if not exists tennis_model_run_settlements (
  settlement_id text primary key,
  source_run_id text not null,
  slate_date text not null,
  model_id text not null,
  evaluator_version text,
  status text not null,
  grade_mode text not null default 'postmatch',
  settled_at text,
  result_hash text,
  grade_hash text,
  complete_matches integer not null default 0,
  pending_matches integer not null default 0,
  row_count integer not null default 0,
  graded_count integer not null default 0,
  hit_count integer not null default 0,
  miss_count integer not null default 0,
  roi_per_100 real,
  payload_json text not null,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp,
  foreign key (source_run_id) references tennis_model_runs(run_id)
);

create index if not exists idx_tennis_model_run_settlements_source
  on tennis_model_run_settlements(source_run_id);

create index if not exists idx_tennis_model_run_settlements_date
  on tennis_model_run_settlements(slate_date, status);

create table if not exists tennis_model_run_lane_grades (
  grade_row_id text primary key,
  settlement_id text not null,
  source_run_id text not null,
  slate_date text not null,
  match_id text,
  match_title text,
  lane text not null,
  market_type text not null,
  selection text,
  line real,
  odds real,
  model_pct real,
  confidence real,
  implied_pct real,
  edge_pct real,
  ev_per_100 real,
  value_grade text,
  result_status text,
  graded integer not null default 0,
  hit integer,
  pnl_per_100 real,
  actual_winner_name text,
  scoreline text,
  payload_json text not null,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp,
  foreign key (settlement_id) references tennis_model_run_settlements(settlement_id),
  foreign key (source_run_id) references tennis_model_runs(run_id)
);

create index if not exists idx_tennis_model_run_lane_grades_source
  on tennis_model_run_lane_grades(source_run_id, lane);

create index if not exists idx_tennis_model_run_lane_grades_date
  on tennis_model_run_lane_grades(slate_date, lane, graded);

create table if not exists tennis_model_run_calibration_buckets (
  settlement_id text not null,
  source_run_id text not null,
  slate_date text not null,
  lane text not null,
  bucket_type text not null,
  bucket_name text not null,
  sample_size integer not null default 0,
  graded_count integer not null default 0,
  hit_count integer not null default 0,
  hit_rate real,
  roi_per_100 real,
  payload_json text not null,
  created_at text not null default current_timestamp,
  updated_at text not null default current_timestamp,
  primary key (settlement_id, lane, bucket_type, bucket_name),
  foreign key (settlement_id) references tennis_model_run_settlements(settlement_id),
  foreign key (source_run_id) references tennis_model_runs(run_id)
);

create index if not exists idx_tennis_model_run_calibration_source
  on tennis_model_run_calibration_buckets(source_run_id, bucket_type, lane);

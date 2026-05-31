create table if not exists tennis_schema_migrations (
  migration_id text primary key,
  warehouse_version text not null,
  file_path text not null,
  sha256 text not null,
  applied_at text not null default current_timestamp,
  status text not null default 'applied',
  notes text
);

create table if not exists tennis_model_runs (
  run_id text primary key,
  slate_date text not null,
  sport text not null default 'tennis',
  warehouse_version text not null,
  feature_version text not null,
  model_id text not null,
  evaluator_version text not null,
  mode text not null,
  status text not null,
  created_at text not null default current_timestamp,
  locked_at text,
  input_hash text,
  source_hash text,
  output_hash text,
  git_commit text,
  git_dirty integer not null default 0,
  cartridge_stack_json text,
  notes text
);

create index if not exists idx_tennis_model_runs_slate_date
  on tennis_model_runs(slate_date);

create index if not exists idx_tennis_model_runs_stack
  on tennis_model_runs(warehouse_version, feature_version, model_id, evaluator_version);

create table if not exists tennis_model_run_files (
  run_id text not null,
  file_path text not null,
  file_role text,
  sha256 text,
  file_exists integer not null default 1,
  created_at text not null default current_timestamp,
  primary key (run_id, file_path),
  foreign key (run_id) references tennis_model_runs(run_id)
);

create table if not exists tennis_model_run_inputs (
  run_id text not null,
  input_path text not null,
  input_role text,
  sha256 text,
  input_exists integer not null default 1,
  captured_at text,
  created_at text not null default current_timestamp,
  primary key (run_id, input_path),
  foreign key (run_id) references tennis_model_runs(run_id)
);

create table if not exists tennis_model_run_outputs (
  run_id text not null,
  output_path text not null,
  output_role text,
  sha256 text,
  created_at text not null default current_timestamp,
  primary key (run_id, output_path),
  foreign key (run_id) references tennis_model_runs(run_id)
);

create table if not exists tennis_model_run_metrics (
  run_id text not null,
  metric_scope text not null,
  metric_name text not null,
  metric_value real,
  sample_size integer,
  payload_json text,
  created_at text not null default current_timestamp,
  primary key (run_id, metric_scope, metric_name),
  foreign key (run_id) references tennis_model_runs(run_id)
);

create table if not exists tennis_model_run_events (
  run_id text not null,
  event_type text not null,
  event_message text,
  payload_json text,
  created_at text not null default current_timestamp,
  foreign key (run_id) references tennis_model_runs(run_id)
);

create index if not exists idx_tennis_model_run_events_run_type
  on tennis_model_run_events(run_id, event_type);

create table if not exists tennis_model_run_training_rows (
  run_id text not null,
  row_hash text not null,
  slate_date text,
  match_id text,
  side text,
  payload_json text not null,
  label_available integer not null default 0,
  created_at text not null default current_timestamp,
  primary key (run_id, row_hash),
  foreign key (run_id) references tennis_model_runs(run_id)
);

create index if not exists idx_tennis_model_run_training_rows_date
  on tennis_model_run_training_rows(run_id, slate_date);

create index if not exists idx_tennis_model_run_training_rows_match
  on tennis_model_run_training_rows(run_id, match_id);

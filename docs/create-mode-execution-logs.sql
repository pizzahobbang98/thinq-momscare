create extension if not exists pgcrypto;

create table if not exists public.mode_execution_logs (
  id uuid primary key default gen_random_uuid(),
  mode text not null,
  mode_label text not null,
  source text not null,
  input_text text,
  created_at timestamptz not null default now()
);

create index if not exists mode_execution_logs_created_at_idx
  on public.mode_execution_logs (created_at desc);

create index if not exists mode_execution_logs_mode_idx
  on public.mode_execution_logs (mode);

comment on table public.mode_execution_logs is
  'ThinQ Mom demo mode execution log. mode_runs remains the shared-state sync source.';

comment on column public.mode_execution_logs.mode is
  'Normalized demo mode key: nausea, sleep, housework, ocean, forest, city, condition_balance, sleep_rhythm, mood_refresh, rest_ready, couple_dinner.';

comment on column public.mode_execution_logs.mode_label is
  'Korean display label used in the demo UI.';

comment on column public.mode_execution_logs.source is
  'Normalized execution source: voice_wake, mobile_hub, manual_control, simulation_3d.';

comment on column public.mode_execution_logs.input_text is
  'Original user utterance or manual-control command text when available.';

alter table public.mode_execution_logs disable row level security;

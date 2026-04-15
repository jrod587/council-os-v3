-- Council OS v3 — canonical Supabase schema for the current verified MVP.
-- Phase 3 Sprint 2 scope: Gate 1 → Gate 2 proof and persistence hardening.

create extension if not exists pgcrypto;

create table if not exists user_accounts (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  session_budget numeric(10,2) not null default 2.00,
  monthly_usage integer not null default 0,
  rate_limit_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_accounts_rate_limit_status_check
    check (rate_limit_status in ('active', 'limited', 'blocked'))
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  problem_raw text,
  problem_refined text,
  status text not null default 'intake',
  team jsonb,
  action_plan jsonb,
  constraint sessions_status_check
    check (status in ('intake', 'team_proposed', 'team_approved', 'plan_proposed', 'completed'))
);

create index if not exists sessions_created_at_idx on sessions(created_at desc);
create index if not exists sessions_status_idx on sessions(status);
create index if not exists sessions_user_id_idx on sessions(user_id);

alter table sessions add column if not exists user_id uuid references user_accounts(id) on delete set null;
alter table sessions add column if not exists updated_at timestamptz not null default now();
alter table sessions add column if not exists team jsonb;
alter table sessions add column if not exists action_plan jsonb;
alter table sessions drop constraint if exists sessions_status_check;
alter table sessions add constraint sessions_status_check
  check (status in ('intake', 'team_proposed', 'team_approved', 'plan_proposed', 'completed'));

alter table user_accounts add column if not exists session_budget numeric(10,2) not null default 2.00;
alter table user_accounts add column if not exists monthly_usage integer not null default 0;
alter table user_accounts add column if not exists rate_limit_status text not null default 'active';
alter table user_accounts add column if not exists updated_at timestamptz not null default now();

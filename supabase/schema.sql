-- Council OS v3 — Phase 4 canonical schema
-- Scope: Supabase Auth linkage, founder credits, Stripe purchases, session gating,
-- and credit restoration when bootstrap fails before Atlas meaningfully starts.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  email text unique,
  stripe_customer_id text unique,
  founder_credits_remaining integer not null default 0,
  purchased_credits_remaining integer not null default 0,
  session_budget numeric(10,2) not null default 2.00,
  monthly_usage integer not null default 0,
  total_sessions_started integer not null default 0,
  rate_limit_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_accounts_founder_credits_check
    check (founder_credits_remaining >= 0),
  constraint user_accounts_purchased_credits_check
    check (purchased_credits_remaining >= 0),
  constraint user_accounts_monthly_usage_check
    check (monthly_usage >= 0),
  constraint user_accounts_total_sessions_started_check
    check (total_sessions_started >= 0),
  constraint user_accounts_rate_limit_status_check
    check (rate_limit_status in ('active', 'limited', 'blocked'))
);

alter table public.user_accounts
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists stripe_customer_id text,
  add column if not exists founder_credits_remaining integer not null default 0,
  add column if not exists purchased_credits_remaining integer not null default 0,
  add column if not exists total_sessions_started integer not null default 0,
  add column if not exists session_budget numeric(10,2) not null default 2.00,
  add column if not exists monthly_usage integer not null default 0,
  add column if not exists rate_limit_status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists user_accounts_auth_user_id_idx
  on public.user_accounts(auth_user_id);
create unique index if not exists user_accounts_email_idx
  on public.user_accounts(email);

create table if not exists public.founder_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  credits_granted integer not null default 3,
  max_redemptions integer not null default 1,
  times_redeemed integer not null default 0,
  is_active boolean not null default true,
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founder_codes_credits_granted_check
    check (credits_granted > 0),
  constraint founder_codes_max_redemptions_check
    check (max_redemptions > 0),
  constraint founder_codes_times_redeemed_check
    check (times_redeemed >= 0)
);

create table if not exists public.founder_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  founder_code_id uuid not null references public.founder_codes(id) on delete cascade,
  user_account_id uuid not null references public.user_accounts(id) on delete cascade,
  credits_granted integer not null,
  redeemed_at timestamptz not null default now(),
  unique (founder_code_id, user_account_id)
);

create index if not exists founder_code_redemptions_user_idx
  on public.founder_code_redemptions(user_account_id, redeemed_at desc);

create table if not exists public.stripe_purchases (
  id uuid primary key default gen_random_uuid(),
  user_account_id uuid not null references public.user_accounts(id) on delete cascade,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  amount_total integer not null,
  currency text not null default 'usd',
  credits_granted integer not null default 1,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint stripe_purchases_credits_granted_check
    check (credits_granted > 0),
  constraint stripe_purchases_status_check
    check (status in ('pending', 'paid', 'failed', 'refunded'))
);

create index if not exists stripe_purchases_user_idx
  on public.stripe_purchases(user_account_id, created_at desc);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_account_id uuid references public.user_accounts(id) on delete cascade,
  user_id uuid references public.user_accounts(id) on delete set null,
  stripe_purchase_id uuid references public.stripe_purchases(id) on delete set null,
  founder_code_redemption_id uuid references public.founder_code_redemptions(id) on delete set null,
  access_grant_type text,
  created_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  credit_consumed_at timestamptz,
  credit_restored_at timestamptz,
  bootstrap_complete_at timestamptz,
  problem_raw text,
  problem_refined text,
  status text not null default 'intake',
  team jsonb,
  team_rationale text,
  action_plan jsonb,
  messages jsonb not null default '[]'::jsonb,
  last_error text,
  constraint sessions_status_check
    check (status in ('intake', 'team_proposed', 'team_approved', 'plan_proposed', 'completed', 'bootstrap_failed', 'cancelled')),
  constraint sessions_access_grant_type_check
    check (access_grant_type in ('founder', 'purchased') or access_grant_type is null)
);

alter table public.sessions
  add column if not exists user_account_id uuid references public.user_accounts(id) on delete cascade,
  add column if not exists stripe_purchase_id uuid references public.stripe_purchases(id) on delete set null,
  add column if not exists founder_code_redemption_id uuid references public.founder_code_redemptions(id) on delete set null,
  add column if not exists access_grant_type text,
  add column if not exists started_at timestamptz not null default now(),
  add column if not exists credit_consumed_at timestamptz,
  add column if not exists credit_restored_at timestamptz,
  add column if not exists bootstrap_complete_at timestamptz,
  add column if not exists last_error text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists team jsonb,
  add column if not exists team_rationale text,
  add column if not exists action_plan jsonb,
  add column if not exists messages jsonb not null default '[]'::jsonb;

update public.sessions
set user_account_id = user_id
where user_account_id is null
  and user_id is not null;

alter table public.sessions
  drop constraint if exists sessions_status_check;

alter table public.sessions
  add constraint sessions_status_check
  check (status in ('intake', 'team_proposed', 'team_approved', 'plan_proposed', 'completed', 'bootstrap_failed', 'cancelled'));

create index if not exists sessions_created_at_idx
  on public.sessions(created_at desc);
create index if not exists sessions_status_idx
  on public.sessions(status);
create index if not exists sessions_user_account_id_idx
  on public.sessions(user_account_id, created_at desc);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_account_id uuid not null references public.user_accounts(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  stripe_purchase_id uuid references public.stripe_purchases(id) on delete set null,
  founder_code_redemption_id uuid references public.founder_code_redemptions(id) on delete set null,
  source_type text not null,
  credit_delta integer not null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint credit_ledger_source_type_check
    check (source_type in ('founder_code', 'stripe_purchase', 'session_consume', 'session_restore', 'manual_adjustment')),
  constraint credit_ledger_credit_delta_check
    check (credit_delta <> 0)
);

create index if not exists credit_ledger_user_idx
  on public.credit_ledger(user_account_id, created_at desc);
create index if not exists credit_ledger_session_idx
  on public.credit_ledger(session_id);

drop trigger if exists user_accounts_set_updated_at on public.user_accounts;
create trigger user_accounts_set_updated_at
before update on public.user_accounts
for each row
execute function public.set_updated_at();

drop trigger if exists founder_codes_set_updated_at on public.founder_codes;
create trigger founder_codes_set_updated_at
before update on public.founder_codes
for each row
execute function public.set_updated_at();

drop trigger if exists stripe_purchases_set_updated_at on public.stripe_purchases;
create trigger stripe_purchases_set_updated_at
before update on public.stripe_purchases
for each row
execute function public.set_updated_at();

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
before update on public.sessions
for each row
execute function public.set_updated_at();

create or replace function public.upsert_user_account_from_auth(
  p_auth_user_id uuid,
  p_email text
)
returns public.user_accounts
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_account public.user_accounts;
begin
  insert into public.user_accounts (auth_user_id, email)
  values (p_auth_user_id, nullif(lower(trim(p_email)), ''))
  on conflict (auth_user_id) do update
    set email = coalesce(excluded.email, public.user_accounts.email),
        updated_at = now()
  returning * into v_account;

  return v_account;
end;
$$;

create or replace function public.redeem_founder_code(
  p_auth_user_id uuid,
  p_email text,
  p_code text
)
returns table (
  redemption_id uuid,
  code text,
  credits_granted integer,
  founder_credits_remaining integer,
  purchased_credits_remaining integer
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_account public.user_accounts;
  v_code public.founder_codes;
  v_redemption public.founder_code_redemptions;
begin
  select * into v_account
  from public.upsert_user_account_from_auth(p_auth_user_id, p_email);

  select *
  into v_code
  from public.founder_codes fc
  where lower(fc.code) = lower(trim(p_code))
  for update;

  if not found then
    raise exception 'Founder code not found';
  end if;

  if not v_code.is_active then
    raise exception 'Founder code is inactive';
  end if;

  if v_code.expires_at is not null and v_code.expires_at < now() then
    raise exception 'Founder code has expired';
  end if;

  if v_code.times_redeemed >= v_code.max_redemptions then
    raise exception 'Founder code has already been fully redeemed';
  end if;

  if exists (
    select 1
    from public.founder_code_redemptions
    where founder_code_id = v_code.id
      and user_account_id = v_account.id
  ) then
    raise exception 'Founder code already redeemed for this account';
  end if;

  insert into public.founder_code_redemptions (
    founder_code_id,
    user_account_id,
    credits_granted
  )
  values (
    v_code.id,
    v_account.id,
    v_code.credits_granted
  )
  returning * into v_redemption;

  update public.founder_codes
  set times_redeemed = public.founder_codes.times_redeemed + 1
  where id = v_code.id;

  update public.user_accounts
  set founder_credits_remaining = public.user_accounts.founder_credits_remaining + v_code.credits_granted
  where id = v_account.id
  returning public.user_accounts.founder_credits_remaining, public.user_accounts.purchased_credits_remaining
  into redeem_founder_code.founder_credits_remaining, redeem_founder_code.purchased_credits_remaining;

  insert into public.credit_ledger (
    user_account_id,
    founder_code_redemption_id,
    source_type,
    credit_delta,
    notes,
    metadata
  )
  values (
    v_account.id,
    v_redemption.id,
    'founder_code',
    v_code.credits_granted,
    'Founder code redeemed',
    jsonb_build_object('code', v_code.code)
  );

  redeem_founder_code.redemption_id := v_redemption.id;
  redeem_founder_code.code := v_code.code;
  redeem_founder_code.credits_granted := v_code.credits_granted;
  return next;
end;
$$;

create or replace function public.grant_purchased_credits(
  p_auth_user_id uuid,
  p_email text,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_stripe_customer_id text,
  p_amount_total integer,
  p_currency text,
  p_credits integer,
  p_metadata jsonb default '{}'::jsonb
)
returns public.stripe_purchases
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_account public.user_accounts;
  v_existing public.stripe_purchases;
  v_purchase public.stripe_purchases;
begin
  select * into v_account
  from public.upsert_user_account_from_auth(p_auth_user_id, p_email);

  if p_stripe_customer_id is not null then
    update public.user_accounts
    set stripe_customer_id = p_stripe_customer_id
    where id = v_account.id
      and (stripe_customer_id is distinct from p_stripe_customer_id);
  end if;

  select *
  into v_existing
  from public.stripe_purchases
  where stripe_checkout_session_id = p_checkout_session_id
  for update;

  if found and v_existing.status = 'paid' then
    return v_existing;
  end if;

  if found then
    update public.stripe_purchases
    set stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
        stripe_customer_id = coalesce(p_stripe_customer_id, stripe_customer_id),
        amount_total = p_amount_total,
        currency = lower(coalesce(p_currency, currency)),
        credits_granted = p_credits,
        status = 'paid',
        metadata = coalesce(p_metadata, '{}'::jsonb),
        paid_at = coalesce(paid_at, now())
    where id = v_existing.id
    returning * into v_purchase;
  else
    insert into public.stripe_purchases (
      user_account_id,
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      stripe_customer_id,
      amount_total,
      currency,
      credits_granted,
      status,
      metadata,
      paid_at
    )
    values (
      v_account.id,
      p_checkout_session_id,
      p_payment_intent_id,
      p_stripe_customer_id,
      p_amount_total,
      lower(coalesce(p_currency, 'usd')),
      p_credits,
      'paid',
      coalesce(p_metadata, '{}'::jsonb),
      now()
    )
    returning * into v_purchase;
  end if;

  update public.user_accounts
  set purchased_credits_remaining = purchased_credits_remaining + p_credits
  where id = v_account.id;

  insert into public.credit_ledger (
    user_account_id,
    stripe_purchase_id,
    source_type,
    credit_delta,
    notes,
    metadata
  )
  values (
    v_account.id,
    v_purchase.id,
    'stripe_purchase',
    p_credits,
    'Stripe Checkout completed',
    jsonb_build_object('checkout_session_id', p_checkout_session_id)
  );

  return v_purchase;
end;
$$;

create or replace function public.start_user_session(
  p_auth_user_id uuid
)
returns public.sessions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_account public.user_accounts;
  v_existing public.sessions;
  v_session public.sessions;
  v_access_grant_type text;
begin
  select *
  into v_account
  from public.user_accounts
  where auth_user_id = p_auth_user_id
  for update;

  if not found then
    raise exception 'User account not initialized';
  end if;

  if v_account.rate_limit_status = 'blocked' then
    raise exception 'Account is blocked';
  end if;

  select *
  into v_existing
  from public.sessions
  where user_account_id = v_account.id
    and status in ('intake', 'team_proposed', 'team_approved', 'plan_proposed')
    and credit_restored_at is null
  order by created_at desc
  limit 1;

  if found then
    return v_existing;
  end if;

  if v_account.founder_credits_remaining > 0 then
    update public.user_accounts
    set founder_credits_remaining = founder_credits_remaining - 1,
        total_sessions_started = total_sessions_started + 1,
        monthly_usage = monthly_usage + 1
    where id = v_account.id;
    v_access_grant_type := 'founder';
  elsif v_account.purchased_credits_remaining > 0 then
    update public.user_accounts
    set purchased_credits_remaining = purchased_credits_remaining - 1,
        total_sessions_started = total_sessions_started + 1,
        monthly_usage = monthly_usage + 1
    where id = v_account.id;
    v_access_grant_type := 'purchased';
  else
    raise exception 'No session credits available';
  end if;

  insert into public.sessions (
    user_account_id,
    user_id,
    access_grant_type,
    credit_consumed_at,
    status
  )
  values (
    v_account.id,
    v_account.id,
    v_access_grant_type,
    now(),
    'intake'
  )
  returning * into v_session;

  insert into public.credit_ledger (
    user_account_id,
    session_id,
    source_type,
    credit_delta,
    notes,
    metadata
  )
  values (
    v_account.id,
    v_session.id,
    'session_consume',
    -1,
    'Session started',
    jsonb_build_object('access_grant_type', v_access_grant_type)
  );

  return v_session;
end;
$$;

create or replace function public.restore_session_credit(
  p_session_id uuid,
  p_reason text
)
returns public.sessions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_session public.sessions;
begin
  select *
  into v_session
  from public.sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;

  if v_session.credit_restored_at is not null then
    return v_session;
  end if;

  if v_session.bootstrap_complete_at is not null then
    return v_session;
  end if;

  if v_session.access_grant_type = 'founder' then
    update public.user_accounts
    set founder_credits_remaining = founder_credits_remaining + 1
    where id = v_session.user_account_id;
  elsif v_session.access_grant_type = 'purchased' then
    update public.user_accounts
    set purchased_credits_remaining = purchased_credits_remaining + 1
    where id = v_session.user_account_id;
  else
    raise exception 'Session access grant type is missing';
  end if;

  update public.sessions
  set credit_restored_at = now(),
      status = 'bootstrap_failed',
      last_error = left(coalesce(p_reason, 'Bootstrap failed before Atlas started'), 1000)
  where id = v_session.id
  returning * into v_session;

  insert into public.credit_ledger (
    user_account_id,
    session_id,
    source_type,
    credit_delta,
    notes,
    metadata
  )
  values (
    v_session.user_account_id,
    v_session.id,
    'session_restore',
    1,
    'Session credit restored',
    jsonb_build_object('reason', p_reason)
  );

  return v_session;
end;
$$;

alter table public.user_accounts enable row level security;
alter table public.sessions enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.stripe_purchases enable row level security;
alter table public.founder_code_redemptions enable row level security;

drop policy if exists "user_accounts_select_own" on public.user_accounts;
create policy "user_accounts_select_own"
on public.user_accounts
for select
to authenticated
using (auth.uid() = auth_user_id);

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own"
on public.sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.user_accounts ua
    where ua.id = sessions.user_account_id
      and ua.auth_user_id = auth.uid()
  )
);

drop policy if exists "credit_ledger_select_own" on public.credit_ledger;
create policy "credit_ledger_select_own"
on public.credit_ledger
for select
to authenticated
using (
  exists (
    select 1
    from public.user_accounts ua
    where ua.id = credit_ledger.user_account_id
      and ua.auth_user_id = auth.uid()
  )
);

drop policy if exists "stripe_purchases_select_own" on public.stripe_purchases;
create policy "stripe_purchases_select_own"
on public.stripe_purchases
for select
to authenticated
using (
  exists (
    select 1
    from public.user_accounts ua
    where ua.id = stripe_purchases.user_account_id
      and ua.auth_user_id = auth.uid()
  )
);

drop policy if exists "founder_code_redemptions_select_own" on public.founder_code_redemptions;
create policy "founder_code_redemptions_select_own"
on public.founder_code_redemptions
for select
to authenticated
using (
  exists (
    select 1
    from public.user_accounts ua
    where ua.id = founder_code_redemptions.user_account_id
      and ua.auth_user_id = auth.uid()
  )
);

grant execute on function public.upsert_user_account_from_auth(uuid, text) to authenticated, service_role;
grant execute on function public.redeem_founder_code(uuid, text, text) to service_role;
grant execute on function public.grant_purchased_credits(uuid, text, text, text, text, integer, text, integer, jsonb) to service_role;
grant execute on function public.start_user_session(uuid) to service_role;
grant execute on function public.restore_session_credit(uuid, text) to service_role;

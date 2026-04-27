-- Banyan Marketing Engine — Canonical Schema
-- Scope: Centralized data layer for product launches, ad campaign tracking, and ROI analytics.
-- Designed to capture maximum metadata for V2/V3 optimizations.

create extension if not exists pgcrypto;

-- Trigger to automatically update updated_at timestamp
create or replace function public.set_marketing_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Table: marketing_products
-- Stores core details of digital products being launched.
create table if not exists public.marketing_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  one_liner text,
  price numeric(10,2) not null,
  link text not null, -- Gumroad URL
  product_type text not null,
  base_image_url text, -- Static fallback image for V1 ads
  target_audience text,
  ikigai_aligned boolean not null default true,
  launched_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists marketing_products_set_updated_at on public.marketing_products;
create trigger marketing_products_set_updated_at
before update on public.marketing_products
for each row
execute function public.set_marketing_updated_at();

-- Table: marketing_campaigns
-- Stores individual ad deployments (e.g., $6 Meta run, $4 Pinterest run).
create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.marketing_products(id) on delete cascade,
  platform text not null, -- 'meta', 'pinterest', 'gumroad_discover', etc.
  budget numeric(10,2) not null,
  status text not null default 'draft', -- 'draft', 'active', 'paused', 'completed'
  start_date timestamptz,
  end_date timestamptz,
  launch_kit jsonb not null default '{}'::jsonb, -- Stores the Claude-generated copy variants & targeting
  platform_campaign_id text, -- ID from the actual ad platform for V2/V3 API syncing
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_campaigns_status_check
    check (status in ('draft', 'active', 'paused', 'completed'))
);

create index if not exists marketing_campaigns_product_idx on public.marketing_campaigns(product_id);
create index if not exists marketing_campaigns_status_idx on public.marketing_campaigns(status);

drop trigger if exists marketing_campaigns_set_updated_at on public.marketing_campaigns;
create trigger marketing_campaigns_set_updated_at
before update on public.marketing_campaigns
for each row
execute function public.set_marketing_updated_at();

-- Table: marketing_metrics
-- Daily snapshots of performance per campaign.
create table if not exists public.marketing_metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  metric_date date not null default current_date,
  impressions integer not null default 0,
  clicks integer not null default 0,
  conversions integer not null default 0,
  spend numeric(10,2) not null default 0.00,
  raw_data jsonb not null default '{}'::jsonb, -- Complete API response payload for future ML/analysis
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, metric_date) -- Only one metric snapshot per campaign per day
);

create index if not exists marketing_metrics_campaign_idx on public.marketing_metrics(campaign_id);
create index if not exists marketing_metrics_date_idx on public.marketing_metrics(metric_date);

drop trigger if exists marketing_metrics_set_updated_at on public.marketing_metrics;
create trigger marketing_metrics_set_updated_at
before update on public.marketing_metrics
for each row
execute function public.set_marketing_updated_at();

-- View: marketing_roi
-- Real-time aggregation of campaign performance and profitability.
create or replace view public.marketing_roi as
select 
  p.id as product_id,
  p.name as product_name,
  p.price,
  c.id as campaign_id,
  c.platform,
  c.budget,
  c.status,
  coalesce(sum(m.spend), 0) as total_spend,
  coalesce(sum(m.impressions), 0) as total_impressions,
  coalesce(sum(m.clicks), 0) as total_clicks,
  coalesce(sum(m.conversions), 0) as total_conversions,
  (coalesce(sum(m.conversions), 0) * p.price) as total_revenue,
  case 
    when coalesce(sum(m.spend), 0) > 0 
    then round(((coalesce(sum(m.conversions), 0) * p.price) / sum(m.spend))::numeric, 2)
    else 0.00 
  end as roas, -- Return on Ad Spend
  case
    when coalesce(sum(m.impressions), 0) > 0
    then round((sum(m.clicks)::numeric / sum(m.impressions)) * 100, 2)
    else 0.00
  end as ctr, -- Click-Through Rate
  case
    when coalesce(sum(m.clicks), 0) > 0
    then round((sum(m.spend) / sum(m.clicks))::numeric, 2)
    else 0.00
  end as cpc, -- Cost Per Click
  case
    when coalesce(sum(m.spend), 0) > 0 
      and round(((coalesce(sum(m.conversions), 0) * p.price) / sum(m.spend))::numeric, 2) >= 2.00 
    then 'SCALE'
    when coalesce(sum(m.spend), 0) > 0 
      and round(((coalesce(sum(m.conversions), 0) * p.price) / sum(m.spend))::numeric, 2) >= 1.00 
    then 'HOLD'
    when coalesce(sum(m.spend), 0) > 0
      and round(((coalesce(sum(m.conversions), 0) * p.price) / sum(m.spend))::numeric, 2) < 1.00 
    then 'KILL'
    else 'PENDING'
  end as recommended_action
from public.marketing_products p
join public.marketing_campaigns c on p.id = c.product_id
left join public.marketing_metrics m on c.id = m.campaign_id
group by p.id, p.name, p.price, c.id, c.platform, c.budget, c.status;

-- Enable Row Level Security (Service Role Only by default, or Authenticated if building a UI)
alter table public.marketing_products enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.marketing_metrics enable row level security;

-- For V1 Dashboard, we will allow authenticated users to view
drop policy if exists "marketing_products_select_auth" on public.marketing_products;
create policy "marketing_products_select_auth"
on public.marketing_products for select to authenticated using (true);

drop policy if exists "marketing_campaigns_select_auth" on public.marketing_campaigns;
create policy "marketing_campaigns_select_auth"
on public.marketing_campaigns for select to authenticated using (true);

drop policy if exists "marketing_metrics_select_auth" on public.marketing_metrics;
create policy "marketing_metrics_select_auth"
on public.marketing_metrics for select to authenticated using (true);

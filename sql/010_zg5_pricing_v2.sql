-- ZG-5 phase 1 — grid v2, currency per workspace, YouCan Pay (MAD) and AI summary quota.
-- Run once in Supabase → SQL Editor (project fnrafhbautactzhemmjb). Safe to run twice.
-- Only adds columns, constraints and tables: the current production code keeps working.

-- 1. Workspaces: billing currency (locked after the first payment) and paid extra properties.
alter table public.tenants
  add column if not exists billing_currency text not null default 'EUR',
  add column if not exists extra_properties integer not null default 0,
  add column if not exists renewal_reminders_sent jsonb not null default '[]'::jsonb;

alter table public.tenants drop constraint if exists tenants_billing_currency_check;
alter table public.tenants add constraint tenants_billing_currency_check check (billing_currency in ('EUR', 'USD', 'MAD'));
alter table public.tenants drop constraint if exists tenants_extra_properties_check;
alter table public.tenants add constraint tenants_extra_properties_check check (extra_properties between 0 and 500);
alter table public.tenants drop constraint if exists tenants_billing_mode_check;
alter table public.tenants add constraint tenants_billing_mode_check check (billing_mode in ('stripe', 'direct', 'youcan'));

-- 2. YouCan Pay payments (one row per order: a prepaid period or extra properties).
create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid,
  provider text not null default 'youcanpay',
  kind text not null check (kind in ('plan', 'extra')),
  tier text,
  billing_interval text,
  extra_properties integer not null default 0,
  currency text not null default 'MAD',
  amount_minor bigint not null check (amount_minor > 0),
  period_start timestamptz,
  period_end timestamptz,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  provider_token text,
  transaction_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists billing_payments_tenant on public.billing_payments (tenant_id, created_at desc);
alter table public.billing_payments enable row level security;
-- No policies: only the server (service role) reads and writes payments.

-- 3. AI executive summaries generated (monthly quota per workspace).
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid,
  campaign_id uuid,
  kind text not null default 'summary',
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_tenant_created on public.ai_usage (tenant_id, created_at);
alter table public.ai_usage enable row level security;
-- No policies: only the server (service role) reads and writes this table.

-- 4. Super admin view: add currency and extra properties (new columns at the end; grants are kept).
create or replace view public.superadmin_tenant_stats as
 select t.id, t.name, t.slug, t.subscription_tier, t.subscription_status, t.billing_interval, t.trial_ends_at,
    t.current_period_end, t.cancel_at_period_end, t.stripe_customer_id, t.stripe_subscription_id, t.created_at,
    (select count(*) from users u where u.tenant_id = t.id) as users_count,
    (select count(*) from properties p where p.tenant_id = t.id and p.is_archived = false) as properties_count,
    (select count(*) from campaigns c where c.tenant_id = t.id) as campaigns_count,
    (select count(*) from campaigns c where c.tenant_id = t.id and c.created_at >= date_trunc('month', now())) as campaigns_month,
    t.billing_mode, t.contract_mrr_eur,
    t.billing_currency, t.extra_properties
   from tenants t;

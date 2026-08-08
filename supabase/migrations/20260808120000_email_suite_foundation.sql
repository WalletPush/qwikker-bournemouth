-- Email Suite foundation
-- Purpose: store outbound/inbound email history, events, campaigns, automations, suppressions
-- Affected: new tables only (additive). Apply on prod before enabling Suite UI.
-- Special: html_body retained ~90 days via app retention job (metadata kept). RLS enabled; service role used by admin APIs.

-- ---------------------------------------------------------------------------
-- Batches (shared body for campaign/automation sends)
-- ---------------------------------------------------------------------------
create table if not exists public.email_send_batches (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  template_key text,
  category text not null default 'transactional',
  subject text not null,
  html_body text,
  text_body text,
  created_by text,
  campaign_id uuid,
  automation_key text,
  created_at timestamptz not null default now()
);

create index if not exists email_send_batches_city_created_idx
  on public.email_send_batches (city, created_at desc);

comment on table public.email_send_batches is
  'Shared email body for multi-recipient campaign/automation sends (avoid duplicating HTML per recipient).';

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  name text not null,
  template_key text not null,
  subject_override text,
  audience_filter jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by text,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_campaigns_city_created_idx
  on public.email_campaigns (city, created_at desc);

-- ---------------------------------------------------------------------------
-- Automations (per-city enable + config)
-- ---------------------------------------------------------------------------
create table if not exists public.email_automations (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  automation_key text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city, automation_key)
);

comment on table public.email_automations is
  'Per-city automation switches. Digests/lifecycle jobs must be OFF by default (enabled=false).';

-- ---------------------------------------------------------------------------
-- Outbound + inbound message log
-- ---------------------------------------------------------------------------
create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  business_id uuid references public.business_profiles(id) on delete set null,
  user_id uuid,
  direction text not null default 'outbound'
    check (direction in ('outbound', 'inbound')),
  to_email text not null,
  from_email text,
  reply_to text,
  subject text not null,
  html_body text,
  text_body text,
  template_key text,
  category text not null default 'transactional'
    check (category in ('transactional', 'marketing', 'outreach', 'lifecycle', 'digest', 'system')),
  resend_message_id text,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed', 'received')),
  sent_by text,
  campaign_id uuid references public.email_campaigns(id) on delete set null,
  batch_id uuid references public.email_send_batches(id) on delete set null,
  thread_id uuid,
  in_reply_to_send_id uuid references public.email_sends(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  html_purge_after timestamptz
);

create index if not exists email_sends_city_sent_idx
  on public.email_sends (city, sent_at desc nulls last, created_at desc);

create index if not exists email_sends_business_idx
  on public.email_sends (business_id, created_at desc)
  where business_id is not null;

create index if not exists email_sends_resend_id_idx
  on public.email_sends (resend_message_id)
  where resend_message_id is not null;

create index if not exists email_sends_thread_idx
  on public.email_sends (thread_id, created_at)
  where thread_id is not null;

create index if not exists email_sends_campaign_idx
  on public.email_sends (campaign_id)
  where campaign_id is not null;

comment on column public.email_sends.html_body is
  'Exact HTML at send time for visual history. Purge after html_purge_after (default ~90d); keep metadata.';

-- ---------------------------------------------------------------------------
-- Provider events (delivery/open/bounce/received)
-- ---------------------------------------------------------------------------
create table if not exists public.email_send_events (
  id uuid primary key default gen_random_uuid(),
  email_send_id uuid references public.email_sends(id) on delete cascade,
  city text not null,
  resend_message_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_send_events_send_idx
  on public.email_send_events (email_send_id, created_at desc);

create index if not exists email_send_events_resend_idx
  on public.email_send_events (resend_message_id, created_at desc);

-- Dedupe Resend webhook deliveries (same message + type + provider timestamp)
create unique index if not exists email_send_events_dedupe_idx
  on public.email_send_events (resend_message_id, event_type, ((payload->>'created_at')))
  where resend_message_id is not null;

-- ---------------------------------------------------------------------------
-- Suppressions (Qwikker-owned unsub — businesses have no marketing_emails_enabled column)
-- ---------------------------------------------------------------------------
create table if not exists public.email_suppressions (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  email text not null,
  business_id uuid references public.business_profiles(id) on delete set null,
  scope text not null default 'all_marketing'
    check (scope in ('all_marketing', 'digests', 'campaigns')),
  reason text,
  source_send_id uuid references public.email_sends(id) on delete set null,
  unsubscribed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (city, email, scope)
);

create index if not exists email_suppressions_city_email_idx
  on public.email_suppressions (city, email);

-- Link batches → campaigns FK (added after campaigns exist)
alter table public.email_send_batches
  drop constraint if exists email_send_batches_campaign_id_fkey;

alter table public.email_send_batches
  add constraint email_send_batches_campaign_id_fkey
  foreign key (campaign_id) references public.email_campaigns(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Per-city Resend webhook signing secret (Svix whsec_…) for /api/webhooks/resend
-- ---------------------------------------------------------------------------
alter table public.franchise_crm_configs
  add column if not exists resend_webhook_secret text;

comment on column public.franchise_crm_configs.resend_webhook_secret is
  'Resend webhook signing secret (whsec_…) for city endpoint https://{city}.qwikker.com/api/webhooks/resend';

-- ---------------------------------------------------------------------------
-- RLS: deny anon/authenticated direct access; admin APIs use service role
-- ---------------------------------------------------------------------------
alter table public.email_send_batches enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.email_automations enable row level security;
alter table public.email_sends enable row level security;
alter table public.email_send_events enable row level security;
alter table public.email_suppressions enable row level security;

-- No policies for anon/authenticated → default deny. Service role bypasses RLS.

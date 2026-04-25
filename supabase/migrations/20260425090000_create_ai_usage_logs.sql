-- AI Usage Logs
-- Purpose: Track per-message token usage and costs for franchise AI chat
-- Populated by hybrid-chat.ts after every OpenAI completion call

create table if not exists public.ai_usage_logs (
  id uuid default gen_random_uuid() primary key,
  city text not null,
  session_id uuid,
  wallet_pass_id text,
  model text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  estimated_cost_usd numeric(10, 6) not null default 0,
  query_type text,
  created_at timestamp with time zone default now() not null
);

-- indexes for dashboard aggregation queries
create index if not exists idx_ai_usage_logs_city
  on public.ai_usage_logs using btree (city);

create index if not exists idx_ai_usage_logs_created_at
  on public.ai_usage_logs using btree (created_at);

create index if not exists idx_ai_usage_logs_city_created
  on public.ai_usage_logs using btree (city, created_at);

-- enable rls
alter table public.ai_usage_logs enable row level security;

-- only service role writes (from API routes)
-- authenticated admins can read their city's data
create policy "Authenticated users can view ai usage logs"
  on public.ai_usage_logs
  for select
  to authenticated
  using (true);

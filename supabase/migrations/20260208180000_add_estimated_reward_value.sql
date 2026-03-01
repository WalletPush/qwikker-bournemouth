-- Migration: Add estimated_reward_value to loyalty_programs
-- Purpose: Allow businesses to specify the monetary value of their reward
--          so the dashboard shows accurate "estimated value given away" stats
--          instead of the hardcoded £3 default.

alter table public.loyalty_programs
  add column if not exists estimated_reward_value numeric(10,2) not null default 0;

comment on column public.loyalty_programs.estimated_reward_value is
  'Business-entered estimated monetary value of the reward (e.g. 8.50 for a cocktail). Used for dashboard ROI stats.';

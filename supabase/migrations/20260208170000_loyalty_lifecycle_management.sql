-- =====================================================
-- Migration: Loyalty lifecycle management
-- Purpose: Add 'ended' program status and 'request_type'
--          column to loyalty_pass_requests for edit/cancel
--          requests through the admin queue.
-- Affected tables: loyalty_programs, loyalty_pass_requests
-- =====================================================

-- 1. Expand loyalty_programs status to include 'ended'
-- A business can permanently end their loyalty program.
-- Memberships are preserved but earns/redemptions stop.
alter table public.loyalty_programs
  drop constraint if exists loyalty_programs_status_check;

alter table public.loyalty_programs
  add constraint loyalty_programs_status_check
  check (status in ('draft', 'submitted', 'active', 'paused', 'ended'));

-- 2. Add request_type to loyalty_pass_requests
-- Distinguishes between initial setup ('new'), edit requests ('edit'),
-- and cancellation requests ('cancel').
-- Existing rows default to 'new' since they were all initial setups.
alter table public.loyalty_pass_requests
  add column if not exists request_type text not null default 'new'
  check (request_type in ('new', 'edit', 'cancel'));

-- 3. Add ended_at timestamp to loyalty_programs
-- Records when a program was permanently ended.
alter table public.loyalty_programs
  add column if not exists ended_at timestamptz;

comment on column public.loyalty_programs.ended_at
  is 'Timestamp when the business permanently ended their loyalty program. NULL if still active/paused.';

comment on column public.loyalty_pass_requests.request_type
  is 'Type of request: new (initial setup), edit (change existing program), cancel (end program).';

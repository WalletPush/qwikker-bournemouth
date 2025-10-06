-- Migration: Create user activity tracking tables
-- Description: Creates tables for tracking user points, activities, and interactions
-- Date: 2025-09-20 19:10:00 UTC

-- Create points_transactions table
create table if not exists public.points_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_members(user_id) on delete cascade not null,
  
  -- Transaction details
  type text not null check (type in ('earned', 'spent')),
  amount integer not null check (amount > 0),
  reason text not null check (reason in (
    'business_visit', 'secret_unlock', 'offer_redeem', 'friend_referral',
    'review_write', 'photo_share', 'chat_engagement', 'daily_login',
    'badge_unlock', 'streak_bonus', 'first_visit', 'social_share'
  )),
  description text not null,
  
  -- Related item (business, offer, etc.)
  related_item_type text check (related_item_type in ('business', 'offer', 'secret_item', 'badge')),
  related_item_id text,
  related_item_name text,
  
  -- Metadata
  created_at timestamptz not null default now()
);

-- Add table comment
comment on table public.points_transactions is 'Track all points earned and spent by users';

-- Create indexes
create index if not exists idx_points_transactions_user_id on public.points_transactions(user_id);
create index if not exists idx_points_transactions_type on public.points_transactions(type);
create index if not exists idx_points_transactions_reason on public.points_transactions(reason);
create index if not exists idx_points_transactions_created_at on public.points_transactions(created_at desc);

-- Create user_business_visits table
create table if not exists public.user_business_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_members(user_id) on delete cascade not null,
  business_id uuid references public.profiles(id) on delete cascade not null,
  
  -- Visit details
  visit_date timestamptz not null default now(),
  points_earned integer default 0,
  is_first_visit boolean not null default false,
  
  -- Optional data
  review_rating integer check (review_rating between 1 and 5),
  review_text text,
  photos_shared text[] default array[]::text[], -- URLs to uploaded photos
  
  -- Metadata
  created_at timestamptz not null default now()
);

-- Add table comment
comment on table public.user_business_visits is 'Track user visits to businesses for points and analytics';

-- Create indexes
create index if not exists idx_user_business_visits_user_id on public.user_business_visits(user_id);
create index if not exists idx_user_business_visits_business_id on public.user_business_visits(business_id);
create index if not exists idx_user_business_visits_visit_date on public.user_business_visits(visit_date desc);

-- Create user_offer_claims table
create table if not exists public.user_offer_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_members(user_id) on delete cascade not null,
  business_id uuid references public.profiles(id) on delete cascade not null,
  
  -- Offer details
  offer_name text not null,
  offer_type text not null,
  offer_value text not null,
  
  -- Claim details
  claimed_at timestamptz not null default now(),
  redeemed_at timestamptz,
  points_earned integer default 0,
  
  -- Status
  status text not null default 'claimed' check (status in ('claimed', 'redeemed', 'expired')),
  
  -- Metadata
  created_at timestamptz not null default now()
);

-- Add table comment
comment on table public.user_offer_claims is 'Track user offer claims and redemptions';

-- Create indexes
create index if not exists idx_user_offer_claims_user_id on public.user_offer_claims(user_id);
create index if not exists idx_user_offer_claims_business_id on public.user_offer_claims(business_id);
create index if not exists idx_user_offer_claims_status on public.user_offer_claims(status);

-- Create user_secret_unlocks table
create table if not exists public.user_secret_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_members(user_id) on delete cascade not null,
  business_id uuid references public.profiles(id) on delete cascade not null,
  
  -- Secret item details
  secret_item_name text not null,
  secret_item_description text,
  secret_item_price text,
  
  -- Unlock details
  unlocked_at timestamptz not null default now(),
  unlock_method text not null check (unlock_method in ('points', 'visit', 'social', 'achievement')),
  points_spent integer default 0,
  points_earned integer default 0,
  
  -- Metadata
  created_at timestamptz not null default now(),
  
  -- Prevent duplicate unlocks
  unique(user_id, business_id, secret_item_name)
);

-- Add table comment
comment on table public.user_secret_unlocks is 'Track user secret menu item unlocks';

-- Create indexes
create index if not exists idx_user_secret_unlocks_user_id on public.user_secret_unlocks(user_id);
create index if not exists idx_user_secret_unlocks_business_id on public.user_secret_unlocks(business_id);
create index if not exists idx_user_secret_unlocks_unlocked_at on public.user_secret_unlocks(unlocked_at desc);

-- Create RLS policies for all tables

-- Points transactions
alter table public.points_transactions enable row level security;

create policy "Users can view their own points transactions"
  on public.points_transactions for select
  using (user_id = (select user_id from public.user_members where user_id = auth.uid()));

create policy "System can insert points transactions"
  on public.points_transactions for insert
  with check (true); -- Will be restricted by application logic

-- Business visits
alter table public.user_business_visits enable row level security;

create policy "Users can view their own business visits"
  on public.user_business_visits for select
  using (user_id = (select user_id from public.user_members where user_id = auth.uid()));

create policy "Users can insert their own business visits"
  on public.user_business_visits for insert
  with check (user_id = (select user_id from public.user_members where user_id = auth.uid()));

create policy "Users can update their own business visits"
  on public.user_business_visits for update
  using (user_id = (select user_id from public.user_members where user_id = auth.uid()));

-- Offer claims
alter table public.user_offer_claims enable row level security;

create policy "Users can view their own offer claims"
  on public.user_offer_claims for select
  using (user_id = (select user_id from public.user_members where user_id = auth.uid()));

create policy "Users can insert their own offer claims"
  on public.user_offer_claims for insert
  with check (user_id = (select user_id from public.user_members where user_id = auth.uid()));

create policy "Users can update their own offer claims"
  on public.user_offer_claims for update
  using (user_id = (select user_id from public.user_members where user_id = auth.uid()));

-- Secret unlocks
alter table public.user_secret_unlocks enable row level security;

create policy "Users can view their own secret unlocks"
  on public.user_secret_unlocks for select
  using (user_id = (select user_id from public.user_members where user_id = auth.uid()));

create policy "Users can insert their own secret unlocks"
  on public.user_secret_unlocks for insert
  with check (user_id = (select user_id from public.user_members where user_id = auth.uid()));

-- Create function to award points and update user stats
create or replace function award_points(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_description text,
  p_related_item_type text default null,
  p_related_item_id text default null,
  p_related_item_name text default null
)
returns void
language plpgsql
security definer
as $$
begin
  -- Insert points transaction
  insert into public.points_transactions (
    user_id, type, amount, reason, description,
    related_item_type, related_item_id, related_item_name
  ) values (
    p_user_id, 'earned', p_amount, p_reason, p_description,
    p_related_item_type, p_related_item_id, p_related_item_name
  );
  
  -- Update user's total points and experience
  update public.user_members 
  set 
    total_points = total_points + p_amount,
    experience_points = experience_points + p_amount,
    level = case 
      when total_points + p_amount >= 5000 then 5
      when total_points + p_amount >= 2000 then 4
      when total_points + p_amount >= 1000 then 3
      when total_points + p_amount >= 500 then 2
      else 1
    end
  where user_id = p_user_id;
end;
$$;

-- Create function to spend points
create or replace function spend_points(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_description text,
  p_related_item_type text default null,
  p_related_item_id text default null,
  p_related_item_name text default null
)
returns boolean
language plpgsql
security definer
as $$
declare
  current_points integer;
begin
  -- Check if user has enough points
  select total_points into current_points 
  from public.user_members 
  where user_id = p_user_id;
  
  if current_points < p_amount then
    return false; -- Not enough points
  end if;
  
  -- Insert points transaction
  insert into public.points_transactions (
    user_id, type, amount, reason, description,
    related_item_type, related_item_id, related_item_name
  ) values (
    p_user_id, 'spent', p_amount, p_reason, p_description,
    p_related_item_type, p_related_item_id, p_related_item_name
  );
  
  -- Update user's total points
  update public.user_members 
  set total_points = total_points - p_amount
  where user_id = p_user_id;
  
  return true; -- Success
end;
$$;

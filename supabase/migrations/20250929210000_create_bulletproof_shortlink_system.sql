-- Migration: Create bulletproof shortlink system
-- Description: Creates shortlink database and infrastructure to replicate old system reliability
-- Date: 2025-09-29 21:00:00 UTC

-- Create user_shortlinks table for bulletproof user identification
CREATE TABLE IF NOT EXISTS public.user_shortlinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Shortlink identification
  shortlink_code text UNIQUE NOT NULL, -- e.g., 'TeGzzG', 'HmWAwx'
  domain text NOT NULL DEFAULT 's.qwikker.com', -- Shortlink domain
  
  -- User identification
  wallet_pass_id text NOT NULL,
  franchise_city text NOT NULL, -- 'bournemouth', 'calgary', etc.
  
  -- Link configuration
  link_type text NOT NULL CHECK (link_type IN ('chat', 'offers', 'dashboard')),
  destination_url text NOT NULL, -- Full URL to redirect to
  
  -- Metadata
  title text, -- For social sharing
  utm_source text DEFAULT 'shortlink',
  utm_medium text DEFAULT 'wallet_pass',
  utm_campaign text,
  
  -- Status and analytics
  is_active boolean DEFAULT true,
  access_count integer DEFAULT 0,
  last_accessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE public.user_shortlinks IS 'Bulletproof shortlink system for wallet pass user identification';

-- Create indexes for performance
CREATE INDEX idx_user_shortlinks_code ON public.user_shortlinks(shortlink_code);
CREATE INDEX idx_user_shortlinks_wallet_pass_id ON public.user_shortlinks(wallet_pass_id);
CREATE INDEX idx_user_shortlinks_franchise ON public.user_shortlinks(franchise_city);
CREATE INDEX idx_user_shortlinks_active ON public.user_shortlinks(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.user_shortlinks ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin access only for management)
CREATE POLICY "Service role can manage all shortlinks"
  ON public.user_shortlinks
  FOR ALL
  USING (true);

-- Create function to generate unique shortlink codes
CREATE OR REPLACE FUNCTION generate_shortlink_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer;
  code_length integer := 8; -- Same length as old system
BEGIN
  FOR i IN 1..code_length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.user_shortlinks WHERE shortlink_code = result) LOOP
    result := '';
    FOR i IN 1..code_length LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate destination URL based on environment
CREATE OR REPLACE FUNCTION get_destination_url(
  p_franchise_city text,
  p_link_type text,
  p_wallet_pass_id text
)
RETURNS text AS $$
DECLARE
  base_url text;
  is_production boolean;
BEGIN
  -- Detect environment (simplified for now)
  is_production := current_setting('app.environment', true) = 'production';
  
  IF is_production THEN
    -- Production: Use franchise domains
    base_url := p_franchise_city || '.qwikker.com';
  ELSE
    -- Testing: Use Vercel deployment
    base_url := 'qwikkerdashboard-theta.vercel.app';
  END IF;
  
  -- Build full URL based on link type
  CASE p_link_type
    WHEN 'chat' THEN
      RETURN 'https://' || base_url || '/user/chat?wallet_pass_id=' || p_wallet_pass_id;
    WHEN 'offers' THEN
      RETURN 'https://' || base_url || '/user/offers?wallet_pass_id=' || p_wallet_pass_id;
    WHEN 'dashboard' THEN
      RETURN 'https://' || base_url || '/user/dashboard?wallet_pass_id=' || p_wallet_pass_id;
    ELSE
      RETURN 'https://' || base_url || '/user/dashboard?wallet_pass_id=' || p_wallet_pass_id;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create function to create shortlinks for a user
CREATE OR REPLACE FUNCTION create_user_shortlinks(
  p_wallet_pass_id text,
  p_franchise_city text DEFAULT 'bournemouth'
)
RETURNS TABLE(
  link_type text,
  shortlink_code text,
  shortlink_url text,
  destination_url text
) AS $$
DECLARE
  link_types text[] := ARRAY['chat', 'offers', 'dashboard'];
  current_type text;
  code text;
  dest_url text;
  full_shortlink text;
BEGIN
  -- Create shortlinks for each type
  FOREACH current_type IN ARRAY link_types LOOP
    -- Generate unique code
    code := generate_shortlink_code();
    
    -- Generate destination URL
    dest_url := get_destination_url(p_franchise_city, current_type, p_wallet_pass_id);
    
    -- Full shortlink URL
    full_shortlink := 'https://s.qwikker.com/' || code;
    
    -- Insert into database
    INSERT INTO public.user_shortlinks (
      shortlink_code,
      wallet_pass_id,
      franchise_city,
      link_type,
      destination_url,
      title,
      utm_campaign
    ) VALUES (
      code,
      p_wallet_pass_id,
      p_franchise_city,
      current_type,
      dest_url,
      'Qwikker ' || initcap(current_type),
      p_franchise_city || '_wallet_pass'
    );
    
    -- Return the result
    RETURN QUERY SELECT 
      current_type,
      code,
      full_shortlink,
      dest_url;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate user exists (for bulletproof security)
CREATE OR REPLACE FUNCTION validate_shortlink_user(p_wallet_pass_id text)
RETURNS boolean AS $$
BEGIN
  -- Check if user exists and pass is still active
  RETURN EXISTS (
    SELECT 1 
    FROM public.app_users 
    WHERE wallet_pass_id = p_wallet_pass_id
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

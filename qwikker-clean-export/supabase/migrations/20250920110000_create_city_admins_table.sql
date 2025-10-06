-- Migration: Create city_admins table for franchise admin authentication
-- Description: Stores admin credentials per city for scalable franchise management
-- Date: 2025-09-20 11:00:00 UTC

-- Create city_admins table
CREATE TABLE IF NOT EXISTS public.city_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL CHECK (city IN ('bournemouth', 'calgary', 'london', 'paris')),
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  full_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add unique constraint on city + username combination
ALTER TABLE public.city_admins 
ADD CONSTRAINT unique_city_username UNIQUE (city, username);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_city_admins_city ON public.city_admins(city);
CREATE INDEX IF NOT EXISTS idx_city_admins_username ON public.city_admins(username);
CREATE INDEX IF NOT EXISTS idx_city_admins_active ON public.city_admins(is_active) WHERE is_active = true;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_city_admins_updated_at 
    BEFORE UPDATE ON public.city_admins 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin users for each city
-- Password is 'Admin123' hashed with bcrypt (rounds=10)
-- Hash generated: $2b$10$dgYNNaY7bxxpampoMdEtMeED0r.P1nloMuk4WDk7pL3k/3UYZHF4i
INSERT INTO public.city_admins (city, username, password_hash, email, full_name) VALUES
  ('bournemouth', 'bournemouth', '$2b$10$dgYNNaY7bxxpampoMdEtMeED0r.P1nloMuk4WDk7pL3k/3UYZHF4i', 'admin@bournemouth.qwikker.com', 'Bournemouth Admin'),
  ('calgary', 'calgary', '$2b$10$dgYNNaY7bxxpampoMdEtMeED0r.P1nloMuk4WDk7pL3k/3UYZHF4i', 'admin@calgary.qwikker.com', 'Calgary Admin'),
  ('london', 'london', '$2b$10$dgYNNaY7bxxpampoMdEtMeED0r.P1nloMuk4WDk7pL3k/3UYZHF4i', 'admin@london.qwikker.com', 'London Admin'),
  ('paris', 'paris', '$2b$10$dgYNNaY7bxxpampoMdEtMeED0r.P1nloMuk4WDk7pL3k/3UYZHF4i', 'admin@paris.qwikker.com', 'Paris Admin')
ON CONFLICT (city, username) DO NOTHING;

-- Enable RLS
ALTER TABLE public.city_admins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Admins can only see their own city's admin records
CREATE POLICY "Admins can view own city records" ON public.city_admins
  FOR SELECT
  USING (city = (SELECT city FROM public.city_admins WHERE id = auth.uid()));

-- Only service role can insert/update/delete admin records
CREATE POLICY "Service role full access" ON public.city_admins
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add helpful comments
COMMENT ON TABLE public.city_admins IS 'Admin credentials for franchise cities';
COMMENT ON COLUMN public.city_admins.city IS 'Franchise city this admin manages';
COMMENT ON COLUMN public.city_admins.username IS 'Admin login username (typically same as city)';
COMMENT ON COLUMN public.city_admins.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN public.city_admins.is_active IS 'Whether this admin account is active';
COMMENT ON COLUMN public.city_admins.last_login IS 'Last successful login timestamp';
COMMENT ON COLUMN public.city_admins.password_changed_at IS 'When password was last changed';


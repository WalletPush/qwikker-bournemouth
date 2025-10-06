-- Create push_subscriptions table for PWA push notifications
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_created_at ON public.push_subscriptions(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop first if exists)
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage their own push subscriptions" ON public.push_subscriptions
    FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role can read all push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role can read all push subscriptions" ON public.push_subscriptions
    FOR SELECT USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE public.push_subscriptions IS 'Stores push notification subscriptions for PWA users';
COMMENT ON COLUMN public.push_subscriptions.user_id IS 'User identifier (can be auth.uid or custom user ID)';
COMMENT ON COLUMN public.push_subscriptions.endpoint IS 'Push service endpoint URL';
COMMENT ON COLUMN public.push_subscriptions.p256dh_key IS 'P256DH key for push encryption';
COMMENT ON COLUMN public.push_subscriptions.auth_key IS 'Auth key for push encryption';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at (drop first if exists)
DROP TRIGGER IF EXISTS trigger_update_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trigger_update_push_subscriptions_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_push_subscriptions_updated_at();

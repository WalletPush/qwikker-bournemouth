-- Create short_urls table for wallet pass back links
CREATE TABLE IF NOT EXISTS short_urls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    short_id VARCHAR(10) UNIQUE NOT NULL,
    target_url TEXT NOT NULL,
    user_id VARCHAR(255), -- wallet_pass_id from user_members
    url_type VARCHAR(50) NOT NULL, -- 'offers', 'chat', 'dashboard'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create url_clicks table for analytics
CREATE TABLE IF NOT EXISTS url_clicks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    short_id VARCHAR(10) NOT NULL,
    user_id VARCHAR(255),
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address VARCHAR(45),
    FOREIGN KEY (short_id) REFERENCES short_urls(short_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_short_urls_short_id ON short_urls(short_id);
CREATE INDEX IF NOT EXISTS idx_short_urls_user_id ON short_urls(user_id);
CREATE INDEX IF NOT EXISTS idx_url_clicks_short_id ON url_clicks(short_id);
CREATE INDEX IF NOT EXISTS idx_url_clicks_clicked_at ON url_clicks(clicked_at);

-- Enable RLS
ALTER TABLE short_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE url_clicks ENABLE ROW LEVEL SECURITY;

-- RLS policies for short_urls
CREATE POLICY "Allow public read access to active short URLs" ON short_urls
    FOR SELECT USING (is_active = true);

CREATE POLICY "Allow service role full access to short URLs" ON short_urls
    FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for url_clicks  
CREATE POLICY "Allow service role full access to url clicks" ON url_clicks
    FOR ALL USING (auth.role() = 'service_role');

-- Function to generate unique short IDs
CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS VARCHAR(10) AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(10) := '';
    i INTEGER;
    char_index INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        char_index := floor(random() * length(chars) + 1);
        result := result || substr(chars, char_index, 1);
    END LOOP;
    
    -- Check if this ID already exists
    IF EXISTS (SELECT 1 FROM short_urls WHERE short_id = result) THEN
        RETURN generate_short_id(); -- Recursive call if collision
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

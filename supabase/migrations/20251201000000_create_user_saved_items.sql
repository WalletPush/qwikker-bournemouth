-- Migration: Create user_saved_items table for favorites/saved items
-- This allows users to save businesses, events, offers, etc. across devices

CREATE TABLE IF NOT EXISTS user_saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(user_id) ON DELETE CASCADE,
  wallet_pass_id text NOT NULL, -- For quick lookups
  item_type text NOT NULL, -- 'business', 'event', 'offer', 'secret_menu'
  item_id text NOT NULL, -- ID of the saved item
  item_name text, -- Optional: Cache the name for display
  saved_at timestamptz DEFAULT now(),
  
  -- Ensure user can't save same item twice
  UNIQUE(wallet_pass_id, item_type, item_id)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_user_saved_items_wallet_pass_id 
  ON user_saved_items(wallet_pass_id);

-- Index for fast lookups by item type
CREATE INDEX IF NOT EXISTS idx_user_saved_items_item_type 
  ON user_saved_items(item_type);

-- Index for fast lookups by user and type
CREATE INDEX IF NOT EXISTS idx_user_saved_items_wallet_pass_type 
  ON user_saved_items(wallet_pass_id, item_type);

-- Add RLS policies
ALTER TABLE user_saved_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own saved items
CREATE POLICY "Users can view own saved items"
  ON user_saved_items
  FOR SELECT
  USING (wallet_pass_id = current_setting('app.wallet_pass_id', true)::text);

-- Policy: Users can insert their own saved items
CREATE POLICY "Users can insert own saved items"
  ON user_saved_items
  FOR INSERT
  WITH CHECK (wallet_pass_id = current_setting('app.wallet_pass_id', true)::text);

-- Policy: Users can delete their own saved items
CREATE POLICY "Users can delete own saved items"
  ON user_saved_items
  FOR DELETE
  USING (wallet_pass_id = current_setting('app.wallet_pass_id', true)::text);

-- Comment on table
COMMENT ON TABLE user_saved_items IS 'Stores user saved/favorited items (businesses, events, offers, etc.)';
COMMENT ON COLUMN user_saved_items.item_type IS 'Type of saved item: business, event, offer, secret_menu';
COMMENT ON COLUMN user_saved_items.item_id IS 'ID of the saved item (references various tables)';
COMMENT ON COLUMN user_saved_items.wallet_pass_id IS 'User wallet pass ID for quick lookups';


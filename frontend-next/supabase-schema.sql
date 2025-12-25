-- Email Preferences Table
CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  
  -- Notification preferences
  notify_auction_ended BOOLEAN DEFAULT true,
  notify_winner_announced BOOLEAN DEFAULT true,
  notify_auction_ending_soon BOOLEAN DEFAULT true,
  notify_outbid BOOLEAN DEFAULT false,
  
  -- Metadata
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast wallet lookups
CREATE INDEX IF NOT EXISTS idx_wallet_address ON email_preferences(wallet_address);

-- Enable Row Level Security
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow public access" ON email_preferences;

-- Policy: Allow anyone to insert/update/delete their own email preferences
-- Since we're using the anon key, we allow all operations
CREATE POLICY "Allow all operations" ON email_preferences
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_email_preferences_updated_at 
  BEFORE UPDATE ON email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

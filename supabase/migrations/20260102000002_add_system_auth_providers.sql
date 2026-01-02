-- Create system_auth_providers table for managing authentication provider visibility
CREATE TABLE IF NOT EXISTS system_auth_providers (
  provider TEXT PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial data (Google and Twitch enabled)
INSERT INTO system_auth_providers (provider, is_enabled, label)
VALUES 
  ('google', true, 'Google'),
  ('twitch', true, 'Twitch')
ON CONFLICT (provider) DO NOTHING;

-- Enable RLS
ALTER TABLE system_auth_providers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read enabled providers
CREATE POLICY "Anyone can read auth providers"
  ON system_auth_providers
  FOR SELECT
  USING (true);

-- Policy: Only admins can update auth providers
CREATE POLICY "Only admins can update auth providers"
  ON system_auth_providers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can insert auth providers
CREATE POLICY "Only admins can insert auth providers"
  ON system_auth_providers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_system_auth_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_system_auth_providers_updated_at ON system_auth_providers;
CREATE TRIGGER trigger_update_system_auth_providers_updated_at
  BEFORE UPDATE ON system_auth_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_system_auth_providers_updated_at();

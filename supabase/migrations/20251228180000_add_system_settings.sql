-- Create system_settings table (singleton pattern)
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  max_participants_per_space INTEGER NOT NULL DEFAULT 50 CHECK (max_participants_per_space > 0),
  max_spaces_per_user INTEGER NOT NULL DEFAULT 5 CHECK (max_spaces_per_user > 0),
  space_expiration_hours INTEGER NOT NULL DEFAULT 48 CHECK (space_expiration_hours >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings (singleton)
INSERT INTO system_settings (id, max_participants_per_space, max_spaces_per_user, space_expiration_hours)
VALUES (1, 50, 5, 48)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read system settings
CREATE POLICY "Anyone can read system settings"
  ON system_settings
  FOR SELECT
  USING (true);

-- Policy: Only admins can update system settings
CREATE POLICY "Only admins can update system settings"
  ON system_settings
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

-- Helper function to get system settings (always returns singleton row)
CREATE OR REPLACE FUNCTION get_system_settings()
RETURNS TABLE (
  max_participants_per_space INTEGER,
  max_spaces_per_user INTEGER,
  space_expiration_hours INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.max_participants_per_space,
    s.max_spaces_per_user,
    s.space_expiration_hours
  FROM system_settings s
  WHERE s.id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_system_settings_updated_at ON system_settings;
CREATE TRIGGER trigger_update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

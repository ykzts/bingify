-- Add screen_settings table for realtime display configuration
CREATE TABLE IF NOT EXISTS screen_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  display_mode TEXT NOT NULL DEFAULT 'full' CHECK (display_mode IN ('full', 'minimal')),
  background TEXT NOT NULL DEFAULT 'default' CHECK (background IN ('default', 'transparent', 'green', 'blue')),
  locale TEXT DEFAULT 'en' CHECK (locale IN ('en', 'ja')),
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_screen_settings_per_space UNIQUE (space_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_screen_settings_space_id ON screen_settings(space_id);

-- Enable RLS
ALTER TABLE screen_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Space owners and admins can manage settings
DROP POLICY IF EXISTS "Space owners can manage screen settings" ON screen_settings;
CREATE POLICY "Space owners can manage screen settings"
  ON screen_settings
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT owner_id FROM spaces WHERE id = screen_settings.space_id
    )
    OR
    EXISTS (
      SELECT 1 FROM space_roles
      WHERE space_id = screen_settings.space_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT owner_id FROM spaces WHERE id = screen_settings.space_id
    )
    OR
    EXISTS (
      SELECT 1 FROM space_roles
      WHERE space_id = screen_settings.space_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Policy: Public read access for screen display
DROP POLICY IF EXISTS "Public can read screen settings" ON screen_settings;
CREATE POLICY "Public can read screen settings"
  ON screen_settings
  FOR SELECT
  USING (true);

-- Enable Realtime for screen_settings
DO $$
BEGIN
  -- Add table to publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'screen_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE screen_settings;
  END IF;
END $$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_screen_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_screen_settings_updated_at ON screen_settings;
CREATE TRIGGER trigger_update_screen_settings_updated_at
  BEFORE UPDATE ON screen_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_screen_settings_updated_at();

-- Add comment to document the table
COMMENT ON TABLE screen_settings IS 'Real-time screen display settings for each space including locale and theme preferences.';

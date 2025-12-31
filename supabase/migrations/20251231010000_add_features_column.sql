-- Add features JSONB column to system_settings table
ALTER TABLE system_settings
ADD COLUMN features JSONB NOT NULL DEFAULT '{
  "gatekeeper": {
    "email": { "enabled": true },
    "twitch": { "enabled": true },
    "youtube": { "enabled": true }
  }
}'::jsonb;

-- Drop and recreate the get_system_settings function to include features
DROP FUNCTION IF EXISTS get_system_settings();

CREATE OR REPLACE FUNCTION get_system_settings()
RETURNS TABLE (
  max_participants_per_space INTEGER,
  max_spaces_per_user INTEGER,
  space_expiration_hours INTEGER,
  features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.max_participants_per_space,
    s.max_spaces_per_user,
    s.space_expiration_hours,
    s.features
  FROM system_settings s
  WHERE s.id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add max_total_spaces column to system_settings table
ALTER TABLE system_settings
ADD COLUMN max_total_spaces INTEGER NOT NULL DEFAULT 1000 CHECK (max_total_spaces >= 0);

COMMENT ON COLUMN system_settings.max_total_spaces IS 'Maximum total number of spaces allowed in the system. 0 means unlimited.';

-- Drop and recreate the get_system_settings function to include max_total_spaces
DROP FUNCTION IF EXISTS get_system_settings();

CREATE OR REPLACE FUNCTION get_system_settings()
RETURNS TABLE (
  default_user_role TEXT,
  features JSONB,
  max_participants_per_space INTEGER,
  max_spaces_per_user INTEGER,
  max_total_spaces INTEGER,
  space_expiration_hours INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.default_user_role,
    s.features,
    s.max_participants_per_space,
    s.max_spaces_per_user,
    s.max_total_spaces,
    s.space_expiration_hours
  FROM system_settings s
  WHERE s.id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

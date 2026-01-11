-- Add archive_retention_hours column to system_settings table
-- This allows configuring the retention period for closed spaces before they are deleted

-- Step 1: Add the archive_retention_hours column with a default value (7 days = 168 hours)
ALTER TABLE system_settings
ADD COLUMN archive_retention_hours INTEGER NOT NULL DEFAULT 168 CHECK (archive_retention_hours >= 0);

-- Step 2: Add the spaces_archive_retention_hours column with a default value (90 days = 2160 hours)
ALTER TABLE system_settings
ADD COLUMN spaces_archive_retention_hours INTEGER NOT NULL DEFAULT 2160 CHECK (spaces_archive_retention_hours >= 0);

-- Step 3: Update the existing row to have the default values
UPDATE system_settings SET archive_retention_hours = 168, spaces_archive_retention_hours = 2160 WHERE id = 1;

-- Step 4: Add comments to document the columns
COMMENT ON COLUMN system_settings.archive_retention_hours IS 'Number of hours to keep closed spaces before moving them to spaces_archive (0 means delete immediately). This is the period after a space is closed (either manually or after space_expiration_hours) before it is archived. UI displays this in days for user convenience.';
COMMENT ON COLUMN system_settings.spaces_archive_retention_hours IS 'Number of hours to keep records in spaces_archive table before permanently deleting them (0 means delete immediately). This is the period after a space is moved to the archive before it is permanently deleted. UI displays this in days for user convenience.';

-- Step 5: Drop and recreate the get_system_settings function to include the new columns
DROP FUNCTION IF EXISTS get_system_settings();

CREATE FUNCTION get_system_settings()
RETURNS TABLE (
  default_user_role TEXT,
  features JSONB,
  max_participants_per_space INTEGER,
  max_spaces_per_user INTEGER,
  max_total_spaces INTEGER,
  space_expiration_hours INTEGER,
  archive_retention_hours INTEGER,
  spaces_archive_retention_hours INTEGER
) AS $$
BEGIN
  -- Set safe search_path to prevent search_path hijacking
  SET search_path = pg_catalog, public;

  -- Ensure system_settings record exists
  IF NOT EXISTS (SELECT 1 FROM public.system_settings WHERE id = 1) THEN
    RAISE EXCEPTION 'System settings not initialized (id=1 not found)';
  END IF;

  RETURN QUERY
  SELECT
    s.default_user_role,
    s.features,
    s.max_participants_per_space,
    s.max_spaces_per_user,
    s.max_total_spaces,
    s.space_expiration_hours,
    s.archive_retention_hours,
    s.spaces_archive_retention_hours
  FROM public.system_settings s
  WHERE s.id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set search_path for security to prevent search_path hijacking
ALTER FUNCTION get_system_settings() SET search_path = pg_catalog, public;

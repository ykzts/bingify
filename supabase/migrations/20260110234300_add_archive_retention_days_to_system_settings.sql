-- Add archive_retention_days column to system_settings table
-- This allows configuring the retention period for closed spaces before they are deleted

-- Step 1: Add the column with a default value
ALTER TABLE system_settings
ADD COLUMN archive_retention_days INTEGER NOT NULL DEFAULT 7 CHECK (archive_retention_days >= 0);

-- Step 2: Update the existing row to have the default value
UPDATE system_settings SET archive_retention_days = 7 WHERE id = 1;

-- Step 3: Add comment to document the column
COMMENT ON COLUMN system_settings.archive_retention_days IS 'Number of days to keep closed spaces before moving them to spaces_archive (0 means delete immediately)';

-- Step 4: Update the get_system_settings function to include the new column
CREATE OR REPLACE FUNCTION get_system_settings()
RETURNS TABLE (
  max_participants_per_space INTEGER,
  max_spaces_per_user INTEGER,
  space_expiration_hours INTEGER,
  archive_retention_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.max_participants_per_space,
    s.max_spaces_per_user,
    s.space_expiration_hours,
    s.archive_retention_days
  FROM system_settings s
  WHERE s.id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

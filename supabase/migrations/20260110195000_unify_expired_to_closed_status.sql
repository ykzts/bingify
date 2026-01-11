-- Unify 'expired' status to 'closed' for consistency
-- This migration removes the distinction between manually closed and automatically expired spaces

-- Step 1: Update existing 'expired' spaces to 'closed' and set updated_at
UPDATE spaces SET status = 'closed', updated_at = NOW() WHERE status = 'expired';

-- Step 2: Update the cleanup function to set status to 'closed' instead of 'expired'
CREATE OR REPLACE FUNCTION cleanup_expired_spaces()
RETURNS TABLE (
  expired_count INTEGER,
  expired_space_ids UUID[]
) AS $$
DECLARE
  expiration_hours INTEGER;
  result_count INTEGER;
  result_ids UUID[];
BEGIN
  -- Get expiration hours from system settings
  SELECT space_expiration_hours INTO expiration_hours
  FROM system_settings
  WHERE id = 1;

  -- If expiration is 0, no cleanup needed
  IF expiration_hours = 0 THEN
    RETURN QUERY SELECT 0, ARRAY[]::UUID[];
    RETURN;
  END IF;

  -- Update expired spaces to 'closed' status and collect IDs
  WITH updated AS (
    UPDATE spaces
    SET status = 'closed', updated_at = NOW()
    WHERE status = 'active'
      AND created_at IS NOT NULL
      AND (created_at + (expiration_hours || ' hours')::INTERVAL) < NOW()
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER, ARRAY_AGG(id)
  INTO result_count, result_ids
  FROM updated;

  -- Return results
  RETURN QUERY SELECT COALESCE(result_count, 0), COALESCE(result_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set search_path for security to prevent search_path hijacking
ALTER FUNCTION cleanup_expired_spaces() SET search_path = pg_catalog, public;

-- Step 3: Update database comment to reflect unified status
COMMENT ON COLUMN spaces.status IS 'Space status: draft (preparation, not public), active (in progress, public), closed (ended, view only - includes both manually and automatically closed spaces)';

-- Step 4: Update spaces_archive table comment for clarity
COMMENT ON TABLE spaces_archive IS 'Archive table for deleted spaces. Spaces are moved here when deleted from the main spaces table, and are automatically purged after a retention period.';

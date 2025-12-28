-- Add helper function to check if a space is expired based on system settings
CREATE OR REPLACE FUNCTION is_space_expired(space_created_at TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN AS $$
DECLARE
  expiration_hours INTEGER;
BEGIN
  -- Get expiration hours from system settings
  SELECT space_expiration_hours INTO expiration_hours
  FROM system_settings
  WHERE id = 1;

  -- If expiration is 0, spaces never expire
  IF expiration_hours = 0 THEN
    RETURN FALSE;
  END IF;

  -- Check if space has expired
  RETURN (space_created_at + (expiration_hours || ' hours')::INTERVAL) < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for active (non-expired) spaces
CREATE OR REPLACE VIEW active_spaces AS
SELECT s.*
FROM spaces s
WHERE s.status = 'active'
  AND NOT is_space_expired(s.created_at);

-- Create function to mark expired spaces as inactive (for cleanup cron)
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

  -- Update expired spaces to 'expired' status and collect IDs
  WITH updated AS (
    UPDATE spaces
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active'
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

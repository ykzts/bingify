-- Fix search_path issue in get_system_settings() to prevent scope leakage
--
-- Similar to handle_new_user(), this function uses "SET search_path" inside
-- the function body which can persist beyond the function scope.
--
-- Solution: Use "SET LOCAL search_path" to ensure the change only applies
-- within the current transaction and is automatically reverted.

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
  -- Use SET LOCAL to limit search_path change to this function's scope
  SET LOCAL search_path = pg_catalog, public;

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
    s.space_expiration_hours
  FROM public.system_settings s
  WHERE s.id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

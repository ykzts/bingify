-- Drop unused active_spaces view to resolve SECURITY DEFINER warning
-- The view is not used anywhere in the application code
DROP VIEW IF EXISTS active_spaces;

-- Drop unused is_space_expired function
-- The function is not used anywhere in the application code
-- Note: PostgreSQL DROP FUNCTION only requires parameter types, not parameter names
DROP FUNCTION IF EXISTS is_space_expired(TIMESTAMP WITH TIME ZONE);

-- Note: cleanup_expired_spaces() function is kept as it is actively used in app/api/cron/cleanup/route.ts

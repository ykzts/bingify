-- Add composite index for optimized cleanup operations
-- This index improves performance when querying for expired spaces
CREATE INDEX IF NOT EXISTS idx_spaces_status_created_at 
ON spaces(status, created_at);

-- Rename status value 'archived' to 'closed' to avoid confusion with spaces_archive table
-- This migration updates the status value for spaces that were previously marked as 'archived'

-- Step 1: Update existing records from 'archived' to 'closed'
UPDATE spaces SET status = 'closed' WHERE status = 'archived';

-- Step 2: Update the comment to reflect the new status value
COMMENT ON COLUMN spaces.status IS 'Space status: draft (preparation, not public), active (in progress, public), closed (ended, view only), expired (automatically closed due to expiration)';

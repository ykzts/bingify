-- Add comment to document the hide_metadata_before_join setting in spaces.settings JSONB column
-- This migration adds documentation for the privacy setting that controls
-- whether space metadata (title, description, etc.) is visible to non-participants

-- The settings column is already JSONB with default '{}', so no schema change is needed.
-- This migration just documents the new setting key for reference:
-- 
-- hide_metadata_before_join (boolean):
--   - false (default): Show title, description, and participation requirements to non-participants
--   - true: Hide metadata from non-participants, show only "Private Space" message
--
-- Example usage in settings JSONB:
-- {
--   "hide_metadata_before_join": true
-- }

-- Add a comment to the settings column to document this
COMMENT ON COLUMN spaces.settings IS 'JSONB settings for space privacy and configuration. Keys: hide_metadata_before_join (boolean, default false)';

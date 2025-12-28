-- Add 'draft' status to spaces and add title/description columns
-- This migration adds the 'draft' status option and metadata fields for spaces

-- Add title and description columns to spaces table
ALTER TABLE spaces
ADD COLUMN title TEXT,
ADD COLUMN description TEXT;

-- Add title and description to spaces_archive table for consistency
ALTER TABLE spaces_archive
ADD COLUMN title TEXT,
ADD COLUMN description TEXT;

-- Update archive trigger function to include new columns
CREATE OR REPLACE FUNCTION archive_deleted_space()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO spaces_archive (
    id,
    share_key,
    settings,
    status,
    created_at,
    updated_at,
    deleted_at,
    archived_at,
    owner_id,
    view_token,
    max_participants,
    gatekeeper_rules,
    title,
    description
  ) VALUES (
    OLD.id,
    OLD.share_key,
    OLD.settings,
    OLD.status,
    OLD.created_at,
    OLD.updated_at,
    NOW(),
    NOW(),
    OLD.owner_id,
    OLD.view_token,
    OLD.max_participants,
    OLD.gatekeeper_rules,
    OLD.title,
    OLD.description
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Add comment to document status values
COMMENT ON COLUMN spaces.status IS 'Space status: draft (preparation, not public), active (in progress, public), archived (ended, view only)';

-- Add comments for new columns
COMMENT ON COLUMN spaces.title IS 'Optional display title for the space';
COMMENT ON COLUMN spaces.description IS 'Optional description for the space';

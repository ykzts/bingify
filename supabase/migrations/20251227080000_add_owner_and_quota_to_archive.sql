-- Add owner_id and max_participants columns to spaces_archive table
-- These columns were incorrectly added to 20251226000000_add_archive_tables.sql
-- in a previous commit, but that migration had already been applied to production.
-- This migration properly adds them as a new change.

-- Add columns to spaces_archive table
ALTER TABLE spaces_archive
ADD COLUMN IF NOT EXISTS owner_id UUID,
ADD COLUMN IF NOT EXISTS max_participants INTEGER;

-- Update archive trigger function to include new columns
CREATE OR REPLACE FUNCTION archive_deleted_space()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO spaces_archive (
    id,
    share_key,
    settings,
    status,
    owner_id,
    max_participants,
    view_token,
    created_at,
    updated_at,
    deleted_at,
    archived_at
  ) VALUES (
    OLD.id,
    OLD.share_key,
    OLD.settings,
    OLD.status,
    OLD.owner_id,
    OLD.max_participants,
    OLD.view_token,
    OLD.created_at,
    OLD.updated_at,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

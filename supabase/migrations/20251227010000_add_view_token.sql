-- Add view_token and owner_id columns to spaces table
-- Note: This migration assumes the spaces table is empty or will be reset.
-- For production migrations with existing data, add columns as nullable first,
-- backfill with generated tokens, then add NOT NULL constraint.

-- Add owner_id column (references auth.users)
-- Note: owner_id may already exist from previous migration (20251227000001_add_participants_and_quota.sql)
-- Using IF NOT EXISTS to ensure idempotency. Constraint matches 20251227000001 (ON DELETE SET NULL)
ALTER TABLE spaces
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add view_token column (NOT NULL, UNIQUE)
-- No DEFAULT is set - application must provide the token to ensure data integrity
ALTER TABLE spaces
ADD COLUMN view_token TEXT NOT NULL UNIQUE;

-- Add same columns to spaces_archive table
-- Note: owner_id may already exist from previous migration (20251226000000_add_archive_tables.sql)
ALTER TABLE spaces_archive
ADD COLUMN IF NOT EXISTS owner_id UUID,
ADD COLUMN IF NOT EXISTS view_token TEXT;

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
    view_token
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
    OLD.view_token
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on spaces table
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

-- Policy: Space owners can read, update, and delete their own spaces
CREATE POLICY "Owners can manage their spaces"
  ON spaces
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Public read access for streaming/display
-- Note: This allows SELECT without authentication, but the application
-- must filter by view_token. RLS policies don't have access to query parameters,
-- so security relies on: 1) view_token being unguessable (256-bit entropy),
-- 2) application always filtering by view_token in queries, and
-- 3) view_token not being exposed in public APIs
CREATE POLICY "Public can view with valid token"
  ON spaces
  FOR SELECT
  USING (true);

-- Create index on view_token for efficient lookups
CREATE INDEX IF NOT EXISTS idx_spaces_view_token ON spaces(view_token);

-- Create index on owner_id for efficient owner queries
CREATE INDEX IF NOT EXISTS idx_spaces_owner_id ON spaces(owner_id);

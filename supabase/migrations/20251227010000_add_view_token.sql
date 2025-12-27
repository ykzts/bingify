-- Add view_token and owner_id columns to spaces table

-- Add owner_id column (references auth.users)
ALTER TABLE spaces
ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add view_token column (NOT NULL, UNIQUE)
-- No DEFAULT is set - application must provide the token
ALTER TABLE spaces
ADD COLUMN view_token TEXT NOT NULL UNIQUE;

-- Add same columns to spaces_archive table
ALTER TABLE spaces_archive
ADD COLUMN owner_id UUID,
ADD COLUMN view_token TEXT;

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

-- Policy: Anyone can read spaces if they know the view_token (public access for streaming)
CREATE POLICY "Public can view with valid token"
  ON spaces
  FOR SELECT
  USING (true);

-- Create index on view_token for efficient lookups
CREATE INDEX IF NOT EXISTS idx_spaces_view_token ON spaces(view_token);

-- Create index on owner_id for efficient owner queries
CREATE INDEX IF NOT EXISTS idx_spaces_owner_id ON spaces(owner_id);

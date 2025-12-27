-- Create archive tables for deleted data

-- Spaces archive table
CREATE TABLE IF NOT EXISTS spaces_archive (
  id UUID PRIMARY KEY,
  share_key TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  owner_id UUID,
  max_participants INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_spaces_archive_archived_at ON spaces_archive(archived_at);

-- Trigger function to archive spaces on delete
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
    OLD.created_at,
    OLD.updated_at,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on spaces table
DROP TRIGGER IF EXISTS trigger_archive_space ON spaces;
CREATE TRIGGER trigger_archive_space
  BEFORE DELETE ON spaces
  FOR EACH ROW
  EXECUTE FUNCTION archive_deleted_space();

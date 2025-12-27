-- Add max_participants to spaces table
ALTER TABLE spaces
ADD COLUMN max_participants INTEGER DEFAULT 50 NOT NULL CHECK (max_participants > 0);

-- Add owner_id to spaces table
ALTER TABLE spaces
ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_participant_per_space UNIQUE (space_id, user_id)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_participants_space_id ON participants(space_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);

-- Enable RLS on participants table
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read participants of spaces they've joined or own
CREATE POLICY "Users can read participants of joined or owned spaces"
  ON participants
  FOR SELECT
  USING (
    -- User is a participant in the space
    EXISTS (
      SELECT 1 FROM participants p
      WHERE p.space_id = participants.space_id
        AND p.user_id = auth.uid()
    )
    OR
    -- User is the owner of the space
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = participants.space_id
        AND s.owner_id = auth.uid()
    )
  );

-- Policy: Users can insert themselves as participants
CREATE POLICY "Users can insert themselves as participants"
  ON participants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete themselves from participants
CREATE POLICY "Users can delete themselves as participants"
  ON participants
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to check participant quota before insertion
CREATE OR REPLACE FUNCTION check_participant_quota()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
BEGIN
  -- Get max_participants from spaces with row lock to prevent race conditions
  SELECT max_participants INTO max_count
  FROM spaces
  WHERE id = NEW.space_id
  FOR UPDATE;

  -- If space doesn't exist, PostgreSQL FK constraint will handle it
  IF max_count IS NULL THEN
    RAISE EXCEPTION 'Space does not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Get current participant count for the space
  SELECT COUNT(*)
  INTO current_count
  FROM participants
  WHERE space_id = NEW.space_id;

  -- Check if adding this participant would exceed the limit
  IF current_count >= max_count THEN
    RAISE EXCEPTION 'Space participant limit reached. Maximum % participants allowed.', max_count
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce quota
DROP TRIGGER IF EXISTS trigger_check_participant_quota ON participants;
CREATE TRIGGER trigger_check_participant_quota
  BEFORE INSERT ON participants
  FOR EACH ROW
  EXECUTE FUNCTION check_participant_quota();

-- Enable Realtime for participants table
ALTER PUBLICATION supabase_realtime ADD TABLE participants;

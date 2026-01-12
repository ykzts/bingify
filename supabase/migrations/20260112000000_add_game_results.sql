-- Create game_results table for recording bingo game outcomes
-- This table stores minimal information about bingo winners for prize verification purposes

CREATE TABLE IF NOT EXISTS game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('horizontal', 'vertical', 'diagonal', 'multiple')),
  pattern_details JSONB NOT NULL DEFAULT '[]',
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_game_results_space_id ON game_results(space_id);
CREATE INDEX IF NOT EXISTS idx_game_results_user_id ON game_results(user_id);
CREATE INDEX IF NOT EXISTS idx_game_results_achieved_at ON game_results(achieved_at);

-- Add unique constraint to prevent duplicate game results for the same user in the same space
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_results_space_user_unique ON game_results(space_id, user_id);

-- Add comment to explain pattern_details structure
COMMENT ON COLUMN game_results.pattern_details IS 'JSONB array of bingo lines: [{"type": "horizontal", "index": 0}, ...]';

-- Enable RLS on game_results table
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- Policy: Space owners can read game results for their spaces
CREATE POLICY "Space owners can read game results for their spaces"
  ON game_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = game_results.space_id
        AND s.owner_id = auth.uid()
    )
  );

-- Policy: Space admins can read game results for their spaces
CREATE POLICY "Space admins can read game results for their spaces"
  ON game_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM space_roles sr
      WHERE sr.space_id = game_results.space_id
        AND sr.user_id = auth.uid()
        AND sr.role = 'admin'
    )
  );

-- Policy: Only authenticated users with verified bingo status can insert game results
-- NOTE: This policy relies on bingo_status being set by server-side logic only.
-- The participants.bingo_status field should be protected by UPDATE policies to prevent
-- users from manipulating their own status. See migration 20260112000001_restrict_bingo_status_updates.sql for constraints.
CREATE POLICY "Users can insert their own game results"
  ON game_results
  FOR INSERT
  WITH CHECK (
    -- Users can only insert results for themselves
    auth.uid() = user_id
    -- Verify they are a participant with bingo status
    -- This check assumes bingo_status is controlled by server-side UPDATE policies
    AND EXISTS (
      SELECT 1 FROM participants p
      WHERE p.space_id = game_results.space_id
        AND p.user_id = auth.uid()
        AND p.bingo_status = 'bingo'
    )
  );

-- Policy: No updates or deletes allowed to maintain data integrity
-- Game results should be immutable once recorded

-- Enable Realtime for game_results table (optional, for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE game_results;

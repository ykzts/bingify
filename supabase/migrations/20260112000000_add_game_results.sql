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

-- Policy: Only server-side (authenticated service) can insert game results
-- This prevents users from manually inserting fake game results
CREATE POLICY "Service role can insert game results"
  ON game_results
  FOR INSERT
  WITH CHECK (
    -- Only service_role can insert
    current_setting('request.jwt.claims', true)::json->>'role' IS NOT DISTINCT FROM 'service_role'
  );

-- Policy: No updates or deletes allowed to maintain data integrity
-- Game results should be immutable once recorded

-- Enable Realtime for game_results table (optional, for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE game_results;

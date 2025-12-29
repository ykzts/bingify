-- Fix RLS recursion issue in participants table
-- The original policy had a recursive EXISTS that checked participants from within participants policy
-- This causes infinite recursion and query failures

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can read participants of joined or owned spaces" ON participants;

-- Create new simplified policies without recursion

-- SELECT policies
-- Policy 1: Space owners can read all participants in their spaces
CREATE POLICY "Space owners can read participants"
  ON participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = participants.space_id
        AND s.owner_id = auth.uid()
    )
  );

-- Policy 2: Users can read their own participant record
CREATE POLICY "Users can read own participant record"
  ON participants
  FOR SELECT
  USING (auth.uid() = user_id);

-- UPDATE policies
-- Policy 3: Space owners can update participants in their spaces
CREATE POLICY "Space owners can update participants"
  ON participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = participants.space_id
        AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = participants.space_id
        AND s.owner_id = auth.uid()
    )
  );

-- Policy 4: Users can update their own participant record
CREATE POLICY "Users can update own participant record"
  ON participants
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


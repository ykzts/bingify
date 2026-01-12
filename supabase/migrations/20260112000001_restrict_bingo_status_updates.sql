-- Restrict updates to participants.bingo_status to prevent security exploits
-- Users should not be able to arbitrarily set their bingo_status to 'bingo'
-- Only server-side actions can update bingo_status

-- Policy: Users cannot update bingo_status field
-- Server actions use service_role which bypasses RLS
CREATE POLICY "Users cannot update bingo_status"
  ON participants
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    -- Allow users to update their own participant record
    -- but prevent changing bingo_status except to 'none'
    auth.uid() = user_id
    AND (
      -- Only allow setting bingo_status to 'none' (allowing resets)
      bingo_status = 'none'
      -- For all other updates, bingo_status must not be changed
      -- This prevents users from setting status to 'reach' or 'bingo'
      OR NOT EXISTS (
        SELECT 1
        FROM participants p
        WHERE p.id = participants.id
          AND p.bingo_status IS DISTINCT FROM bingo_status
      )
    )
  );

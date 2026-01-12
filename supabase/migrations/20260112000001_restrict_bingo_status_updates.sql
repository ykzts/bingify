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
    -- but prevent changing bingo_status from its current value
    auth.uid() = user_id
    AND (
      -- Either bingo_status is not being changed
      bingo_status = (SELECT p.bingo_status FROM participants p WHERE p.id = participants.id)
      -- Or it's being set to 'none' (allowing resets)
      OR bingo_status = 'none'
    )
  );

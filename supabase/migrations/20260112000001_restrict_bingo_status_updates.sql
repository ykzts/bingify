-- Restrict updates to participants.bingo_status to prevent security exploits
-- Users should not be able to arbitrarily set their bingo_status to 'bingo' or 'reach'
-- Only server-side actions (service_role) can update bingo_status to non-'none' values

-- First, drop the existing permissive UPDATE policy that allows any field changes
DROP POLICY IF EXISTS "Users can update own participant record" ON participants;

-- Drop the ineffective policy if it exists from previous migration attempts
DROP POLICY IF EXISTS "Users cannot update bingo_status" ON participants;

-- Create a new, restrictive UPDATE policy
-- This policy prevents users from setting bingo_status to 'reach' or 'bingo'
-- They can only set it to 'none' (for voluntary resets)
-- Server-side logic using service_role bypasses RLS and can set any value
CREATE POLICY "Users can only reset their bingo_status to none"
  ON participants
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- Only allow bingo_status to be 'none'
    -- This means users cannot UPDATE to 'reach' or 'bingo'
    -- Server-side code (service_role) bypasses RLS entirely
    AND bingo_status = 'none'
  );

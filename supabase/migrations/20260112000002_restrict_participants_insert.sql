-- Fix security vulnerability in participants INSERT policy
-- Users should not be able to insert themselves with bingo_status = 'bingo' or 'reach'
-- Only 'none' should be allowed on INSERT to prevent forged game results

-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Users can insert themselves as participants" ON participants;

-- Create a new, restrictive INSERT policy
-- This policy allows users to join a space, but only with bingo_status = 'none'
-- Server-side logic (service_role) can insert with any status since it bypasses RLS
CREATE POLICY "Users can insert themselves as participants"
  ON participants
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    -- Force bingo_status to 'none' on INSERT
    -- This prevents users from creating participants rows with bingo_status = 'bingo'
    -- which would allow them to forge game_results entries
    AND bingo_status = 'none'
  );

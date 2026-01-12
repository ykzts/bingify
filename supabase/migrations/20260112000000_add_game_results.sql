-- Add game results recording feature for prize verification
-- This migration includes:
-- 1. game_results table creation
-- 2. RLS policies for game_results
-- 3. Security hardening for participants INSERT and UPDATE policies

-- ============================================================================
-- Part 1: Create game_results table
-- ============================================================================

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

-- ============================================================================
-- Part 2: RLS policies for game_results table
-- ============================================================================

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
-- The participants.bingo_status field is protected by UPDATE and INSERT policies below.
CREATE POLICY "Users can insert their own game results"
  ON game_results
  FOR INSERT
  WITH CHECK (
    -- Users can only insert results for themselves
    auth.uid() = user_id
    -- Verify they are a participant with bingo status
    -- This check assumes bingo_status is controlled by server-side policies
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

-- ============================================================================
-- Part 3: Security hardening for participants table
-- ============================================================================

-- Fix security vulnerability: Restrict participants INSERT policy
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

-- Fix security vulnerability: Restrict participants UPDATE policy
-- Users should not be able to arbitrarily set their bingo_status to 'bingo' or 'reach'
-- Only server-side actions (service_role) can update bingo_status to non-'none' values

-- Drop the existing permissive UPDATE policies
DROP POLICY IF EXISTS "Users can update own participant record" ON participants;
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

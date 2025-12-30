-- Add bingo_status column to participants table for tracking reach/bingo state

ALTER TABLE participants
ADD COLUMN bingo_status TEXT DEFAULT 'none' CHECK (bingo_status IN ('none', 'reach', 'bingo'));

-- Add index for efficient filtering by bingo status
CREATE INDEX IF NOT EXISTS idx_participants_bingo_status ON participants(bingo_status);

-- Enable realtime for participants table (already enabled, but ensuring it's set)
-- The table is already in supabase_realtime publication from 20251227000001_add_participants_and_quota.sql

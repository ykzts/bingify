-- Add Row Level Security (RLS) policies for bingo_cards, called_numbers, and spaces_archive tables

-- Enable RLS on bingo_cards table
ALTER TABLE bingo_cards ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own bingo cards
CREATE POLICY "Users can read their own bingo cards"
  ON bingo_cards
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()::TEXT
  );

-- Policy: Users can insert their own bingo cards (one per space)
CREATE POLICY "Users can insert their own bingo cards"
  ON bingo_cards
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()::TEXT
    -- User must be a participant in the space
    AND EXISTS (
      SELECT 1 FROM participants p
      WHERE p.space_id = bingo_cards.space_id
        AND p.user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own bingo cards
CREATE POLICY "Users can delete their own bingo cards"
  ON bingo_cards
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()::TEXT
  );

-- Enable RLS on called_numbers table
ALTER TABLE called_numbers ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read called numbers for display
-- Note: This allows unauthenticated users to view called numbers when streaming
-- Security relies on application-level filtering by space_id/view_token
CREATE POLICY "Public can read called numbers"
  ON called_numbers
  FOR SELECT
  USING (true);

-- Policy: Space owners can insert called numbers
CREATE POLICY "Owners can insert called numbers"
  ON called_numbers
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = called_numbers.space_id
        AND s.owner_id = auth.uid()
    )
  );

-- Policy: Space owners can delete called numbers (for game reset)
CREATE POLICY "Owners can delete called numbers"
  ON called_numbers
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = called_numbers.space_id
        AND s.owner_id = auth.uid()
    )
  );

-- Enable RLS on spaces_archive table
ALTER TABLE spaces_archive ENABLE ROW LEVEL SECURITY;

-- Policy: Block all regular user access to archived spaces
-- Note: This policy blocks all user access to archived data
-- Service role bypasses RLS entirely and can still access the table
-- Only the cron cleanup job (using service role) should access this table
CREATE POLICY "Block all user access to archived spaces"
  ON spaces_archive
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Allow space owners/admins to view participants and results in closed/expired spaces
-- This enables admins to continue managing their space data after closure

-- Add policy to allow space owners/admins to read all participants
CREATE POLICY "Owners and admins can read all participants"
  ON participants
  FOR SELECT
  USING (
    -- User is the space owner
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = participants.space_id
        AND s.owner_id = auth.uid()
    )
    OR
    -- User is a space admin
    EXISTS (
      SELECT 1 FROM space_roles sr
      WHERE sr.space_id = participants.space_id
        AND sr.user_id = auth.uid()
        AND sr.role = 'admin'
    )
  );

-- Add policy to allow space owners/admins to read all bingo cards
CREATE POLICY "Owners and admins can read all bingo cards"
  ON bingo_cards
  FOR SELECT
  USING (
    -- User is the space owner
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = bingo_cards.space_id
        AND s.owner_id = auth.uid()
    )
    OR
    -- User is a space admin
    EXISTS (
      SELECT 1 FROM space_roles sr
      WHERE sr.space_id = bingo_cards.space_id
        AND sr.user_id = auth.uid()
        AND sr.role = 'admin'
    )
  );

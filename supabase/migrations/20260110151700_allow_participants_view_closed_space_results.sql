-- Allow participants to view other participants' data and bingo cards in closed/expired spaces
-- This enables the "results view" feature for ended games

-- Add policy to allow participants to read other participants in closed/expired spaces
CREATE POLICY "Participants can read all participants in closed spaces"
  ON participants
  FOR SELECT
  USING (
    -- User is authenticated
    auth.uid() IS NOT NULL
    AND
    -- Space is closed or expired
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = participants.space_id
        AND s.status IN ('closed', 'expired')
    )
    AND
    -- User is a participant in the space
    EXISTS (
      SELECT 1 FROM participants p
      WHERE p.space_id = participants.space_id
        AND p.user_id = auth.uid()
    )
  );

-- Add policy to allow participants to read all bingo cards in closed/expired spaces
CREATE POLICY "Participants can read all bingo cards in closed spaces"
  ON bingo_cards
  FOR SELECT
  USING (
    -- User is authenticated
    auth.uid() IS NOT NULL
    AND
    -- Space is closed or expired
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = bingo_cards.space_id
        AND s.status IN ('closed', 'expired')
    )
    AND
    -- User is a participant in the space
    EXISTS (
      SELECT 1 FROM participants p
      WHERE p.space_id = bingo_cards.space_id
        AND p.user_id = auth.uid()
    )
  );

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

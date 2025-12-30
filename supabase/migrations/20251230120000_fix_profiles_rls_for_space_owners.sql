-- Fix profiles RLS to allow space owners to read participant profiles
-- This allows the participants list in the dashboard to display user names

-- Add policy to allow space owners to read profiles of participants in their spaces
CREATE POLICY "Space owners can read participant profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM participants p
      JOIN spaces s ON s.id = p.space_id
      WHERE p.user_id = profiles.id
        AND s.owner_id = auth.uid()
    )
  );

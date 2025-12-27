-- Create space_members table
CREATE TABLE IF NOT EXISTS space_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(space_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_space_members_space_id ON space_members(space_id);
CREATE INDEX IF NOT EXISTS idx_space_members_user_id ON space_members(user_id);

-- Enable RLS
ALTER TABLE space_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read members of spaces they belong to
CREATE POLICY "Users can read members of their spaces"
  ON space_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id
      AND sm.user_id = auth.uid()
    )
  );

-- Policy: Users can insert themselves as members
CREATE POLICY "Users can join spaces"
  ON space_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Space creators (first member) can delete other members
CREATE POLICY "Space creators can remove members"
  ON space_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'owner'
    )
  );

-- Update spaces RLS to allow public read of basic info (name, share_key) for join page
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read basic space info by share_key for join page
CREATE POLICY "Anyone can read space info by share key"
  ON spaces
  FOR SELECT
  USING (true);

-- Policy: Only authenticated users can create spaces
CREATE POLICY "Authenticated users can create spaces"
  ON spaces
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Space members can update their space
CREATE POLICY "Space members can update their space"
  ON spaces
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = spaces.id
      AND sm.user_id = auth.uid()
    )
  );

-- Enable Realtime for space_members
ALTER PUBLICATION supabase_realtime ADD TABLE space_members;

-- Function to automatically add creator as owner when space is created
CREATE OR REPLACE FUNCTION add_space_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add if authenticated user created the space
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO space_members (space_id, user_id, role)
    VALUES (NEW.id, auth.uid(), 'owner')
    ON CONFLICT (space_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add creator as owner
DROP TRIGGER IF EXISTS on_space_created ON spaces;
CREATE TRIGGER on_space_created
  AFTER INSERT ON spaces
  FOR EACH ROW
  EXECUTE FUNCTION add_space_creator_as_owner();

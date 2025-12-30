-- Create space_roles table for multi-admin functionality
CREATE TABLE IF NOT EXISTS space_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_space_user_role UNIQUE (space_id, user_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_space_roles_space_id ON space_roles(space_id);
CREATE INDEX IF NOT EXISTS idx_space_roles_user_id ON space_roles(user_id);

-- Enable RLS on space_roles table
ALTER TABLE space_roles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Owners can read all roles for their spaces
CREATE POLICY "Owners can read all roles for their spaces"
  ON space_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = space_roles.space_id
        AND s.owner_id = auth.uid()
    )
  );

-- Policy 2: Admins can read their own role assignments
CREATE POLICY "Admins can read their own role assignments"
  ON space_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 3: Owners can insert new admins for their spaces
CREATE POLICY "Owners can insert new admins for their spaces"
  ON space_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = space_roles.space_id
        AND s.owner_id = auth.uid()
    )
  );

-- Policy 4: Owners can delete admins from their spaces
CREATE POLICY "Owners can delete admins from their spaces"
  ON space_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = space_roles.space_id
        AND s.owner_id = auth.uid()
    )
  );

-- Update spaces table RLS to allow admins to update
-- Drop existing owner-only update policy
DROP POLICY IF EXISTS "Owners can update their spaces" ON spaces;

-- Create new policy that allows both owners and admins to update
CREATE POLICY "Owners and admins can update spaces"
  ON spaces
  FOR UPDATE
  USING (
    auth.uid() = owner_id
    OR
    EXISTS (
      SELECT 1 FROM space_roles sr
      WHERE sr.space_id = spaces.id
        AND sr.user_id = auth.uid()
        AND sr.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR
    EXISTS (
      SELECT 1 FROM space_roles sr
      WHERE sr.space_id = spaces.id
        AND sr.user_id = auth.uid()
        AND sr.role = 'admin'
    )
  );

-- Enable Realtime for space_roles table
ALTER PUBLICATION supabase_realtime ADD TABLE space_roles;

-- Add role column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Add CHECK constraint to ensure role is either 'user' or 'admin'
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

-- Create index on role column for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Drop existing update policy for profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Recreate update policy to allow users to update their own profile except the role column
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent users from changing their own role
    (role IS NULL OR role = (SELECT role FROM profiles WHERE id = auth.uid()))
  );

-- Create policy to allow service_role to update any profile (including role)
CREATE POLICY "Service role can update any profile"
  ON profiles
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

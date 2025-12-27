-- Add role column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Add CHECK constraint to ensure role is either 'user' or 'admin'
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

-- Create index on role column for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Drop existing update policy for profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Recreate update policy to allow users to update their own profile except the role column
-- Users cannot change the role column at all - it can only be changed via service_role
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add trigger to prevent users from changing their own role
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service_role to change anything
  IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  
  -- For regular users, prevent role changes
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Cannot change role';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prevent_role_change ON profiles;
CREATE TRIGGER trigger_prevent_role_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_change();

-- Create policy to allow service_role to update any profile (including role)
CREATE POLICY "Service role can update any profile"
  ON profiles
  FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

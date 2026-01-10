-- Add username column to profiles table
ALTER TABLE profiles
ADD COLUMN username TEXT UNIQUE;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Migrate existing full_name data to username
-- This copies existing full_name values to username for users who don't have it set yet
UPDATE profiles
SET username = full_name
WHERE username IS NULL AND full_name IS NOT NULL;

-- Add constraint to ensure username follows format rules
-- Username must be 3-30 characters long and contain only alphanumeric characters, underscores, and hyphens
ALTER TABLE profiles
ADD CONSTRAINT username_format CHECK (
  username IS NULL OR username ~ '^[a-zA-Z0-9_-]{3,30}$'
);

-- Add comments to clarify column purposes
COMMENT ON COLUMN profiles.username IS 'ユーザー名（一意の識別子）';
COMMENT ON COLUMN profiles.full_name IS '氏名（表示名）';

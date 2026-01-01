-- Update profiles table role constraint to support three roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'organizer', 'user'));

-- Add default_user_role to system_settings table
ALTER TABLE system_settings 
  ADD COLUMN IF NOT EXISTS default_user_role TEXT NOT NULL DEFAULT 'organizer'
  CHECK (default_user_role IN ('organizer', 'user'));

-- Update handle_new_user function to use default_user_role from system_settings
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role TEXT;
BEGIN
  -- Get default role from system_settings
  SELECT default_user_role INTO default_role
  FROM system_settings
  WHERE id = 1;
  
  -- If no setting found, use 'organizer' as fallback
  IF default_role IS NULL THEN
    default_role := 'organizer';
  END IF;
  
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    default_role
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

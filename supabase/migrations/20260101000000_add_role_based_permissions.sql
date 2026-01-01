-- Update profiles table role constraint to support three roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'organizer', 'user'));

-- Add default_user_role to system_settings table
ALTER TABLE system_settings 
  ADD COLUMN IF NOT EXISTS default_user_role TEXT NOT NULL DEFAULT 'organizer'
  CHECK (default_user_role IN ('organizer', 'user'));

-- Update handle_new_user function to use default_user_role from system_settings
-- This function is SECURITY DEFINER and runs with elevated privileges
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
  
  -- Set a flag to indicate we're in the handle_new_user context
  -- This allows the prevent_role_change trigger to know it should allow the operation
  PERFORM set_config('app.inserting_new_user', 'true', true);
  
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
  
  -- Clear the flag
  PERFORM set_config('app.inserting_new_user', '', true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update prevent_role_change to allow handle_new_user to set roles
CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service_role to change anything
  IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  
  -- Allow handle_new_user function to set roles during user creation
  BEGIN
    IF current_setting('app.inserting_new_user', true) = 'true' THEN
      RETURN NEW;
    END IF;
  EXCEPTION
    WHEN undefined_object THEN
      -- Setting doesn't exist, continue with normal checks
      NULL;
  END;
  
  -- For INSERT operations, prevent setting role to anything other than 'user'
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS DISTINCT FROM 'user' THEN
      RAISE EXCEPTION 'Cannot set elevated role on insert';
    END IF;
  END IF;
  
  -- For UPDATE operations, prevent role changes
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'Cannot change role';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

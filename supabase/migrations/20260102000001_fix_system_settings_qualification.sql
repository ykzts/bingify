-- Ensure system_settings references are schema-qualified to avoid search_path issues
-- especially for security definer functions invoked by Auth (GoTrue)

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role TEXT;
BEGIN
  SELECT default_user_role INTO default_role
  FROM public.system_settings
  WHERE id = 1;

  IF default_role IS NULL THEN
    default_role := 'organizer';
  END IF;

  -- Set flag to prevent infinite recursion if profiles table has triggers
  -- that might attempt to modify auth.users
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

  -- Clear the flag after profile insertion/update is complete
  PERFORM set_config('app.inserting_new_user', '', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_system_settings()
RETURNS TABLE (
  default_user_role TEXT,
  features JSONB,
  max_participants_per_space INTEGER,
  max_spaces_per_user INTEGER,
  max_total_spaces INTEGER,
  space_expiration_hours INTEGER
) AS $$
BEGIN
  -- Ensure system_settings record exists
  IF NOT EXISTS (SELECT 1 FROM public.system_settings WHERE id = 1) THEN
    RAISE EXCEPTION 'System settings not initialized (id=1 not found)';
  END IF;

  RETURN QUERY
  SELECT
    s.default_user_role,
    s.features,
    s.max_participants_per_space,
    s.max_spaces_per_user,
    s.max_total_spaces,
    s.space_expiration_hours
  FROM public.system_settings s
  WHERE s.id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

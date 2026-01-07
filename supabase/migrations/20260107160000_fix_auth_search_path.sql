-- Fix search_path for handle_new_user so GoTrue resolves auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, pg_catalog, public, auth
AS $$
#variable_conflict use_column
DECLARE default_role TEXT;
BEGIN
  -- search_path is enforced via function attribute above

  BEGIN
    SELECT default_user_role INTO default_role
    FROM public.system_settings
    WHERE id = 1;
  EXCEPTION
    WHEN OTHERS THEN
      default_role := 'organizer';
      RAISE WARNING 'Failed to read system_settings, using default role: %', SQLERRM;
  END;

  IF default_role IS NULL THEN
    default_role := 'organizer';
  END IF;

  -- Prevent recursion from profile triggers touching auth.users
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

  -- Clear recursion flag
  PERFORM set_config('app.inserting_new_user', '', true);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;

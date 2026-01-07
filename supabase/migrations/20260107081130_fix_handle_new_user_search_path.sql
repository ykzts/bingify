-- Fix search_path issue in handle_new_user() that causes Supabase Auth
-- to look for "users" table in wrong schema
--
-- Problem: The function sets "SET search_path = pg_catalog, public" which persists
-- beyond the function execution and affects Supabase Auth's subsequent queries.
-- When Auth tries to reference auth.users, the search_path causes it to look for
-- "public.users" instead, resulting in "relation users does not exist" error.
--
-- Solution: Use "SET LOCAL search_path" instead of "SET search_path" to ensure
-- the change only applies within the current transaction and is automatically
-- reverted after the function completes.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
#variable_conflict use_column
DECLARE
  default_role TEXT;
BEGIN
  -- Use SET LOCAL to limit search_path change to this function's scope
  -- This prevents the setting from affecting Supabase Auth's subsequent queries
  SET LOCAL search_path = pg_catalog, public;

  -- Try to read system_settings with error handling
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

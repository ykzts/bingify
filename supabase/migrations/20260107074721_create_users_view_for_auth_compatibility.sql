-- Create a "users" view that points to the profiles table
-- This is needed for Supabase Auth compatibility which expects a "users" table
-- in newer versions of GoTrue (the auth server).
--
-- Background: Supabase Auth may try to sync user metadata to a "users" table.
-- Since we use "profiles" table instead, we create a view to maintain compatibility.

-- Drop view if it already exists
DROP VIEW IF EXISTS public.users;

-- Create a view that maps profiles to users
-- This view allows Supabase Auth to "UPDATE users" which will actually update profiles
CREATE VIEW public.users AS
SELECT 
  id,
  email,
  role,
  created_at,
  updated_at
FROM public.profiles;

-- Create an INSTEAD OF trigger to handle UPDATEs on the view
-- This allows UPDATE statements on the view to modify the underlying profiles table
CREATE OR REPLACE FUNCTION public.update_users_view()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the underlying profiles table
  UPDATE public.profiles
  SET 
    email = NEW.email,
    role = NEW.role,
    updated_at = NEW.updated_at
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS update_users_trigger ON public.users;
CREATE TRIGGER update_users_trigger
  INSTEAD OF UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_users_view();

-- Grant necessary permissions
GRANT SELECT ON public.users TO authenticated, anon;
GRANT UPDATE ON public.users TO service_role;

-- Add comment for documentation
COMMENT ON VIEW public.users IS 'Compatibility view for Supabase Auth. Maps to profiles table. Allows Auth service to update user metadata without requiring schema changes.';

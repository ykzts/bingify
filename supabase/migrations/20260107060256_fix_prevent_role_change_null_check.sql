-- Fix prevent_role_change() function to properly handle NULL from current_setting
-- 
-- Issue: When current_setting('app.inserting_new_user', true) returns NULL (setting doesn't exist),
-- the comparison NULL = 'true' evaluates to NULL (not TRUE), causing the check to fail.
-- This prevents handle_new_user() from setting roles during user creation.
--
-- Solution: Use IS NOT DISTINCT FROM operator which treats NULL differently:
-- - NULL IS NOT DISTINCT FROM 'true' returns FALSE
-- - 'true' IS NOT DISTINCT FROM 'true' returns TRUE

CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service_role to change anything
  IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;
  
  -- Allow handle_new_user function to set roles during user creation
  -- Use IS NOT DISTINCT FROM to properly handle NULL values
  IF current_setting('app.inserting_new_user', true) IS NOT DISTINCT FROM 'true' THEN
    RETURN NEW;
  END IF;
  
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

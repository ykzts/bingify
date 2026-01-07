-- Restrict gatekeeper_rules updates to space owners only
-- This prevents admins from bypassing the application layer by directly updating via PostgREST

-- Create a function to check if the user is the owner of the space
CREATE OR REPLACE FUNCTION check_gatekeeper_rules_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow if gatekeeper_rules hasn't changed
  IF (OLD.gatekeeper_rules IS NOT DISTINCT FROM NEW.gatekeeper_rules) THEN
    RETURN NEW;
  END IF;

  -- Check if the current user is the owner
  IF (NEW.owner_id = auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- If not the owner and gatekeeper_rules changed, reject the update
  RAISE EXCEPTION 'Only the space owner can modify gatekeeper rules';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that runs before updates to the spaces table
DROP TRIGGER IF EXISTS enforce_gatekeeper_rules_owner ON spaces;
CREATE TRIGGER enforce_gatekeeper_rules_owner
  BEFORE UPDATE ON spaces
  FOR EACH ROW
  EXECUTE FUNCTION check_gatekeeper_rules_owner();

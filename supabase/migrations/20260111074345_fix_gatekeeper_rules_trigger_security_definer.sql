-- Fix check_gatekeeper_rules_owner trigger function
-- Remove SECURITY DEFINER to allow auth.uid() to work correctly in the caller's security context

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
$$ LANGUAGE plpgsql;

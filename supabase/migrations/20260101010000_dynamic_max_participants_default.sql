-- Remove fixed DEFAULT constraint from spaces.max_participants
ALTER TABLE spaces ALTER COLUMN max_participants DROP DEFAULT;

-- Create function to dynamically set max_participants from system_settings
CREATE OR REPLACE FUNCTION set_default_max_participants()
RETURNS TRIGGER AS $$
DECLARE
  system_limit INTEGER;
BEGIN
  -- Only set default if max_participants is NULL (not specified)
  IF NEW.max_participants IS NULL THEN
    -- Get max_participants_per_space from system_settings (singleton row with id=1)
    -- If the row doesn't exist or the value is NULL, system_limit will be NULL
    SELECT max_participants_per_space 
    INTO system_limit 
    FROM system_settings 
    WHERE id = 1;

    -- Use system limit if found, otherwise fallback to 50
    -- COALESCE handles the case where system_settings is empty or missing
    NEW.max_participants := COALESCE(system_limit, 50);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to execute before INSERT
-- This trigger dynamically sets max_participants from system_settings.max_participants_per_space
-- when a new space is created without an explicit max_participants value.
-- It ensures that the default participant limit reflects the current system-wide configuration.
CREATE TRIGGER trigger_set_default_max_participants
BEFORE INSERT ON spaces
FOR EACH ROW
EXECUTE FUNCTION set_default_max_participants();

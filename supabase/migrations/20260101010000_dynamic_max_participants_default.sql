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
    -- Get max_participants_per_space from system_settings
    SELECT max_participants_per_space 
    INTO system_limit 
    FROM system_settings 
    WHERE id = 1;

    -- Use system limit if found, otherwise fallback to 50
    NEW.max_participants := COALESCE(system_limit, 50);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to execute before INSERT
CREATE TRIGGER trigger_set_default_max_participants
BEFORE INSERT ON spaces
FOR EACH ROW
EXECUTE FUNCTION set_default_max_participants();

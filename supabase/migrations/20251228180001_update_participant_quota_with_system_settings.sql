-- Update participant quota check to respect system-wide max participants
CREATE OR REPLACE FUNCTION check_participant_quota()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
  system_max INTEGER;
BEGIN
  -- Get system-wide max participants setting
  SELECT max_participants_per_space INTO system_max
  FROM system_settings
  WHERE id = 1;

  -- Get max_participants from spaces with row lock to prevent race conditions
  SELECT max_participants INTO max_count
  FROM spaces
  WHERE id = NEW.space_id
  FOR UPDATE;

  -- If space doesn't exist, PostgreSQL FK constraint will handle it
  IF max_count IS NULL THEN
    RAISE EXCEPTION 'Space does not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Use the smaller of space limit and system limit
  IF system_max IS NOT NULL AND system_max < max_count THEN
    max_count := system_max;
  END IF;

  -- Get current participant count for the space
  SELECT COUNT(*)
  INTO current_count
  FROM participants
  WHERE space_id = NEW.space_id;

  -- Check if adding this participant would exceed the limit
  IF current_count >= max_count THEN
    RAISE EXCEPTION 'Space participant limit reached. Maximum % participants allowed.', max_count
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

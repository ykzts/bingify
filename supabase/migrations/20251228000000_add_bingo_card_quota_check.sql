-- Add trigger to enforce participant quota on bingo_cards table
-- This acts as a secondary check in addition to the participants table trigger

CREATE OR REPLACE FUNCTION check_bingo_card_quota()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
  max_from_settings INTEGER;
BEGIN
  -- Get max_participants and settings in a single query with row lock to prevent race conditions
  SELECT max_participants, (settings->>'maxParticipants')::INTEGER
  INTO max_count, max_from_settings
  FROM spaces
  WHERE id = NEW.space_id
  FOR UPDATE;

  -- If space doesn't exist, PostgreSQL FK constraint will handle it
  IF max_count IS NULL THEN
    RAISE EXCEPTION 'Space does not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Use settings value if it exists, otherwise use max_participants column
  IF max_from_settings IS NOT NULL THEN
    max_count := max_from_settings;
  END IF;

  -- Get current participant count for the space
  SELECT COUNT(*)
  INTO current_count
  FROM participants
  WHERE space_id = NEW.space_id;

  -- Check if adding this card would exceed the limit
  IF current_count >= max_count THEN
    RAISE EXCEPTION 'Space participant limit reached. Maximum % participants allowed.', max_count
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce quota on bingo_cards
DROP TRIGGER IF EXISTS trigger_check_bingo_card_quota ON bingo_cards;
CREATE TRIGGER trigger_check_bingo_card_quota
  BEFORE INSERT ON bingo_cards
  FOR EACH ROW
  EXECUTE FUNCTION check_bingo_card_quota();

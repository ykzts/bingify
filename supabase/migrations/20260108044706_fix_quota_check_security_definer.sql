-- Fix RLS issue: Add SECURITY DEFINER to quota check functions
-- This allows the trigger functions to bypass RLS and read space metadata
-- when non-owners try to join a space.

-- Update check_participant_quota() with SECURITY DEFINER
CREATE OR REPLACE FUNCTION check_participant_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
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
$$;

-- Update check_bingo_card_quota() with SECURITY DEFINER
CREATE OR REPLACE FUNCTION check_bingo_card_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
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
$$;

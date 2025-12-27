-- Add unique constraints for bingo game tables

-- Ensure a number can only be called once per space
ALTER TABLE called_numbers
  ADD CONSTRAINT called_numbers_space_value_unique UNIQUE (space_id, value);

-- Ensure each user can only have one bingo card per space
ALTER TABLE bingo_cards
  ADD CONSTRAINT bingo_cards_space_user_unique UNIQUE (space_id, user_id);

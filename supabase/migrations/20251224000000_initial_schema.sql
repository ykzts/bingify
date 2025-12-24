-- Create tables for Bingify

-- Spaces table
CREATE TABLE IF NOT EXISTS spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_key TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bingo cards table
CREATE TABLE IF NOT EXISTS bingo_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  numbers JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Called numbers table
CREATE TABLE IF NOT EXISTS called_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  called_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_spaces_share_key ON spaces(share_key);
CREATE INDEX IF NOT EXISTS idx_bingo_cards_space_id ON bingo_cards(space_id);
CREATE INDEX IF NOT EXISTS idx_called_numbers_space_id ON called_numbers(space_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE spaces;
ALTER PUBLICATION supabase_realtime ADD TABLE bingo_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE called_numbers;

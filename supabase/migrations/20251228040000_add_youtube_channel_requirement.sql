-- Add youtube_channel_id column to spaces table for participation requirements
-- This column stores the YouTube Channel ID that users must be subscribed to in order to join the space
ALTER TABLE spaces
ADD COLUMN youtube_channel_id TEXT;

-- Add comment to document the purpose
COMMENT ON COLUMN spaces.youtube_channel_id IS 'YouTube Channel ID that participants must be subscribed to in order to join this space. NULL means no YouTube verification required.';

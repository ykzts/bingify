-- Add hierarchical requirement type controls to gatekeeper features
-- This migration updates the features JSONB column to include requirement type flags

-- Update existing features to include requirement type controls (all enabled by default to maintain existing behavior)
UPDATE system_settings
SET features = jsonb_set(
  jsonb_set(
    jsonb_set(
      features,
      '{gatekeeper,youtube,subscriber}',
      '{"enabled": true}'::jsonb
    ),
    '{gatekeeper,twitch,follower}',
    '{"enabled": true}'::jsonb
  ),
  '{gatekeeper,twitch,subscriber}',
  '{"enabled": true}'::jsonb
)
WHERE id = 1;

-- Note: This migration maintains backward compatibility by enabling all requirement types by default
-- Admins can then selectively disable specific requirement types through the admin UI

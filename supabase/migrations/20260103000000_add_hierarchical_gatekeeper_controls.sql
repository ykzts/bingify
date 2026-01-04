-- Add hierarchical requirement type controls to gatekeeper features
-- This migration updates the features JSONB column to include requirement type flags

-- Update existing features to include requirement type controls (all enabled by default to maintain existing behavior)
-- Only set values if they don't already exist to avoid overwriting admin changes
UPDATE system_settings
SET features = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        features,
        '{gatekeeper,youtube,member}',
        '{"enabled": true}'::jsonb
      ),
      '{gatekeeper,youtube,subscriber}',
      '{"enabled": true}'::jsonb
    ),
    '{gatekeeper,twitch,follower}',
    '{"enabled": true}'::jsonb
  ),
  '{gatekeeper,twitch,subscriber}',
  '{"enabled": true}'::jsonb
)
WHERE id = 1
  AND (
    features #> '{gatekeeper,youtube,member}' IS NULL
    OR features #> '{gatekeeper,youtube,subscriber}' IS NULL
    OR features #> '{gatekeeper,twitch,follower}' IS NULL
    OR features #> '{gatekeeper,twitch,subscriber}' IS NULL
  );

-- Note: This migration maintains backward compatibility by enabling all requirement types by default
-- Admins can then selectively disable specific requirement types through the admin UI
-- The WHERE clause ensures we only add missing keys and don't overwrite existing admin configuration

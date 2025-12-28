-- Add gatekeeper_rules column to spaces table for participation requirements
-- This JSONB column stores various participation rules including YouTube channel subscription requirements
ALTER TABLE spaces
ADD COLUMN gatekeeper_rules JSONB DEFAULT '{}';

-- Add comment to document the purpose
COMMENT ON COLUMN spaces.gatekeeper_rules IS 'Participation requirements in JSONB format. Example: {"youtube": {"channelId": "UCxxxxx", "required": true}}';

-- Create private schema for OAuth tokens
-- This schema is NOT exposed by PostgREST API, preventing direct frontend access
CREATE SCHEMA IF NOT EXISTS private;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA private TO postgres, anon, authenticated, service_role;

-- Create encryption key in Supabase Vault
-- This key will be used for transparent column encryption (TCE)
-- The key is stored securely in the vault and never exposed directly
INSERT INTO vault.secrets (name, secret)
VALUES (
  'oauth_token_encryption_key',
  -- Generate a 256-bit key for encryption
  encode(pgsodium.crypto_secretbox_keygen(), 'base64')
)
ON CONFLICT (name) DO NOTHING;

-- Create OAuth tokens table in private schema
-- This table stores provider tokens for YouTube, Twitch, etc.
CREATE TABLE IF NOT EXISTS private.oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure one token per user per provider
  UNIQUE (user_id, provider)
);

-- Apply Transparent Column Encryption (TCE) to sensitive columns
-- SECURITY LABEL tells pgsodium to automatically encrypt/decrypt these columns
-- The encryption key is fetched from vault using the specified key_id
SECURITY LABEL FOR pgsodium ON COLUMN private.oauth_tokens.access_token
  IS 'ENCRYPT WITH KEY ID ' || (SELECT id FROM vault.secrets WHERE name = 'oauth_token_encryption_key')::text;

SECURITY LABEL FOR pgsodium ON COLUMN private.oauth_tokens.refresh_token
  IS 'ENCRYPT WITH KEY ID ' || (SELECT id FROM vault.secrets WHERE name = 'oauth_token_encryption_key')::text;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_provider 
  ON private.oauth_tokens(user_id, provider);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION private.update_oauth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER oauth_tokens_updated_at
  BEFORE UPDATE ON private.oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION private.update_oauth_tokens_updated_at();

-- Grant permissions
-- Only authenticated users can access through RPC functions
-- service_role has full access for admin operations
GRANT SELECT, INSERT, UPDATE, DELETE ON private.oauth_tokens TO authenticated;
GRANT ALL ON private.oauth_tokens TO service_role;

-- Add comment to document the table
COMMENT ON TABLE private.oauth_tokens IS 'Stores encrypted OAuth provider tokens (YouTube, Twitch, etc.) with transparent column encryption. Access only through RPC functions.';
COMMENT ON COLUMN private.oauth_tokens.access_token IS 'Encrypted OAuth access token. Automatically encrypted/decrypted via pgsodium TCE.';
COMMENT ON COLUMN private.oauth_tokens.refresh_token IS 'Encrypted OAuth refresh token. Automatically encrypted/decrypted via pgsodium TCE.';

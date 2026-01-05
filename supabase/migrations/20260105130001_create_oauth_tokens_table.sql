-- Create private schema for OAuth tokens
-- This schema is NOT exposed by PostgREST API, preventing direct frontend access
CREATE SCHEMA IF NOT EXISTS private;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA private TO postgres, anon, authenticated, service_role;

-- Create OAuth tokens table in private schema
-- This table stores provider tokens for YouTube, Twitch, etc.
CREATE TABLE IF NOT EXISTS private.oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  -- Store tokens as TEXT (not encrypted at database level)
  -- In production with Supabase hosted, enable TCE with Vault
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure one token per user per provider
  UNIQUE (user_id, provider)
);

-- Note: Encryption with Supabase Vault
-- For production Supabase hosted environment:
-- 1. Store encryption key in Vault via Supabase Dashboard:
--    INSERT INTO vault.secrets (name, secret)
--    VALUES ('oauth_token_encryption_key', 'your-generated-key-here');
-- 2. Use Vault secrets in application code via vault.decrypted_secrets view
--
-- For Transparent Column Encryption (if needed):
-- TCE/pgsodium is being deprecated by Supabase. Use Vault + application-level encryption instead.
-- Reference: https://supabase.com/docs/guides/database/vault
--
-- For local development:
-- Tokens are stored in private schema which is not exposed via API
-- This provides reasonable security for development purposes without encryption

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
COMMENT ON TABLE private.oauth_tokens IS 'Stores OAuth provider tokens (YouTube, Twitch, etc.) in private schema isolated from PostgREST API. For production encryption, use Supabase Vault. Access only through RPC functions.';
COMMENT ON COLUMN private.oauth_tokens.access_token IS 'OAuth access token. For production, consider application-level encryption with keys stored in Supabase Vault.';
COMMENT ON COLUMN private.oauth_tokens.refresh_token IS 'OAuth refresh token. For production, consider application-level encryption with keys stored in Supabase Vault.';

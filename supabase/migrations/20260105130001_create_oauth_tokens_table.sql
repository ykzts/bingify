-- Create private schema for OAuth tokens
-- This schema is NOT exposed by PostgREST API, preventing direct frontend access
CREATE SCHEMA IF NOT EXISTS private;

-- Grant necessary permissions
-- Only postgres, authenticated, and service_role should have access to private schema
GRANT USAGE ON SCHEMA private TO postgres, authenticated, service_role;

-- Create OAuth tokens table in private schema
-- This table stores provider tokens for YouTube, Twitch, etc.
CREATE TABLE IF NOT EXISTS private.oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  -- Store tokens as TEXT (not encrypted at database level)
  -- In production: use Vault for key management + application-level encryption
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
-- 2. Use Vault secrets in application code for encryption/decryption
-- 3. Perform encryption at application level before storing tokens
--
-- Note: pgsodium/TCE is not used as it's being deprecated by Supabase
-- Use Vault + application-level encryption instead
-- Reference: https://supabase.com/docs/guides/database/vault
--
-- For local development:
-- Tokens are stored in private schema which is not exposed via API
-- This provides reasonable security for development purposes without encryption

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION private.update_oauth_tokens_updated_at()
RETURNS TRIGGER
SET search_path = private, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER oauth_tokens_updated_at
  BEFORE UPDATE ON private.oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION private.update_oauth_tokens_updated_at();

-- Enable Row Level Security
ALTER TABLE private.oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users (can only access their own tokens)
CREATE POLICY oauth_tokens_user_policy ON private.oauth_tokens
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create RLS policy for service_role (full access for admin operations)
CREATE POLICY oauth_tokens_service_role_policy ON private.oauth_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant minimal permissions
-- authenticated role needs table access for RLS policies to work
-- Actual access is controlled by RLS policies above
GRANT SELECT, INSERT, UPDATE, DELETE ON private.oauth_tokens TO authenticated;
GRANT ALL ON private.oauth_tokens TO service_role;

-- Add comment to document the table
COMMENT ON TABLE private.oauth_tokens IS 'Stores OAuth provider tokens (YouTube, Twitch, etc.) in private schema isolated from PostgREST API. For production encryption, use Supabase Vault. Access only through RPC functions.';
COMMENT ON COLUMN private.oauth_tokens.access_token IS 'OAuth access token. For production, consider application-level encryption with keys stored in Supabase Vault.';
COMMENT ON COLUMN private.oauth_tokens.refresh_token IS 'OAuth refresh token. For production, consider application-level encryption with keys stored in Supabase Vault.';

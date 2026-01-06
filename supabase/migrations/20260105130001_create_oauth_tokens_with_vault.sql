-- Create private schema for OAuth tokens
-- This schema is NOT exposed by PostgREST API, preventing direct frontend access
CREATE SCHEMA IF NOT EXISTS private;

-- Grant necessary permissions
-- Only postgres, authenticated, and service_role should have access to private schema
GRANT USAGE ON SCHEMA private TO postgres, authenticated, service_role;

-- Create OAuth tokens table in private schema with Vault encryption
-- This table stores provider tokens for YouTube, Twitch, etc.
CREATE TABLE IF NOT EXISTS private.oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  -- Store Vault secret IDs instead of plaintext tokens
  -- Tokens are encrypted in Supabase Vault and only UUID references are stored here
  access_token_secret_id UUID NOT NULL,
  refresh_token_secret_id UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensure one token per user per provider
  UNIQUE (user_id, provider)
);

-- Create indexes for RLS and RPC performance optimization
-- Index on user_id for efficient auth.uid() comparisons in RLS policies
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON private.oauth_tokens(user_id);

-- Enable Row Level Security
ALTER TABLE private.oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own tokens
CREATE POLICY oauth_tokens_user_policy
ON private.oauth_tokens
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policy: service_role has full access for admin operations
CREATE POLICY oauth_tokens_service_role_policy
ON private.oauth_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION private.update_oauth_tokens_updated_at()
RETURNS TRIGGER
SET search_path = private, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_oauth_tokens_updated_at_trigger
BEFORE UPDATE ON private.oauth_tokens
FOR EACH ROW
EXECUTE FUNCTION private.update_oauth_tokens_updated_at();

-- Grant table permissions (RLS policies control actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON private.oauth_tokens TO authenticated, service_role;

-- ============================================================================
-- SECURITY NOTE: Disabling PostgreSQL Statement Logging
-- ============================================================================
-- The RPC functions below handle plaintext OAuth tokens before encrypting them
-- with Vault. To prevent these tokens from being logged in PostgreSQL logs,
-- you MUST disable statement logging at the database role level.
--
-- Steps to secure your Supabase project:
-- 1. Go to Supabase Dashboard → Project Settings → Database
-- 2. Add this configuration to your database settings:
--    ALTER ROLE postgres SET log_statement TO 'none';
--    ALTER ROLE authenticator SET log_statement TO 'none';
-- 3. Perform a "Fast database reboot" from the Dashboard to apply changes
-- 4. Verify with: SHOW log_statement; (should return 'none')
--
-- Without this setting, plaintext tokens may be recorded in database logs,
-- defeating the purpose of Vault encryption.
-- ============================================================================

-- Create RPC function to upsert OAuth token with Vault encryption
CREATE OR REPLACE FUNCTION public.upsert_oauth_token(
  p_provider TEXT,
  p_access_token TEXT,
  p_refresh_token TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, private, vault, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_access_secret_id UUID;
  v_refresh_secret_id UUID;
  v_existing_access_id UUID;
  v_existing_refresh_id UUID;
BEGIN
  -- Check authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get existing secret IDs if token already exists (for cleanup after success)
  SELECT access_token_secret_id, refresh_token_secret_id
  INTO v_existing_access_id, v_existing_refresh_id
  FROM private.oauth_tokens
  WHERE user_id = v_user_id AND provider = p_provider;

  -- Encrypt access token with Vault
  SELECT vault.create_secret(p_access_token) INTO v_access_secret_id;

  -- Encrypt refresh token if provided
  IF p_refresh_token IS NOT NULL THEN
    SELECT vault.create_secret(p_refresh_token) INTO v_refresh_secret_id;
  END IF;

  -- Upsert the token record (must succeed before cleanup)
  INSERT INTO private.oauth_tokens (user_id, provider, access_token_secret_id, refresh_token_secret_id, expires_at)
  VALUES (v_user_id, p_provider, v_access_secret_id, v_refresh_secret_id, p_expires_at)
  ON CONFLICT (user_id, provider)
  DO UPDATE SET
    access_token_secret_id = EXCLUDED.access_token_secret_id,
    refresh_token_secret_id = EXCLUDED.refresh_token_secret_id,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW();

  -- Clean up old Vault secrets AFTER successful insert/update
  -- Note: vault.delete_secret() doesn't exist, use DELETE FROM vault.secrets
  IF v_existing_access_id IS NOT NULL AND v_existing_access_id != v_access_secret_id THEN
    DELETE FROM vault.secrets WHERE id = v_existing_access_id;
  END IF;
  IF v_existing_refresh_id IS NOT NULL AND v_existing_refresh_id != v_refresh_secret_id THEN
    DELETE FROM vault.secrets WHERE id = v_existing_refresh_id;
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, try to clean up the newly created secrets
    BEGIN
      IF v_access_secret_id IS NOT NULL THEN
        DELETE FROM vault.secrets WHERE id = v_access_secret_id;
      END IF;
      IF v_refresh_secret_id IS NOT NULL THEN
        DELETE FROM vault.secrets WHERE id = v_refresh_secret_id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Ignore cleanup errors in exception handler
        NULL;
    END;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to get OAuth token with Vault decryption
CREATE OR REPLACE FUNCTION public.get_oauth_token(
  p_provider TEXT
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, private, vault, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_token_record RECORD;
  v_access_token TEXT;
  v_refresh_token TEXT;
BEGIN
  -- Check authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get token record
  SELECT * INTO v_token_record
  FROM private.oauth_tokens
  WHERE user_id = v_user_id AND provider = p_provider;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token not found');
  END IF;

  -- Decrypt tokens from Vault
  SELECT decrypted_secret INTO v_access_token
  FROM vault.decrypted_secrets
  WHERE id = v_token_record.access_token_secret_id;

  IF v_token_record.refresh_token_secret_id IS NOT NULL THEN
    SELECT decrypted_secret INTO v_refresh_token
    FROM vault.decrypted_secrets
    WHERE id = v_token_record.refresh_token_secret_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'provider', v_token_record.provider,
      'access_token', v_access_token,
      'refresh_token', v_refresh_token,
      'expires_at', v_token_record.expires_at
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to delete OAuth token and clean up Vault secrets
CREATE OR REPLACE FUNCTION public.delete_oauth_token(
  p_provider TEXT
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, private, vault, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_access_secret_id UUID;
  v_refresh_secret_id UUID;
BEGIN
  -- Check authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get secret IDs before deletion
  SELECT access_token_secret_id, refresh_token_secret_id
  INTO v_access_secret_id, v_refresh_secret_id
  FROM private.oauth_tokens
  WHERE user_id = v_user_id AND provider = p_provider;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token not found');
  END IF;

  -- Delete the token record
  DELETE FROM private.oauth_tokens
  WHERE user_id = v_user_id AND provider = p_provider;

  -- Clean up Vault secrets
  -- Note: vault.delete_secret() doesn't exist, use DELETE FROM vault.secrets
  IF v_access_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_access_secret_id;
  END IF;
  IF v_refresh_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_refresh_secret_id;
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION public.upsert_oauth_token(TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_oauth_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_oauth_token(TEXT) TO authenticated;

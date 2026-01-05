-- Implement Vault-based encryption for OAuth tokens at RPC layer
-- This migration adds encryption/decryption using Supabase Vault

-- Update table schema to store Vault secret IDs instead of plaintext tokens
ALTER TABLE private.oauth_tokens 
  RENAME COLUMN access_token TO access_token_old;
ALTER TABLE private.oauth_tokens 
  RENAME COLUMN refresh_token TO refresh_token_old;
ALTER TABLE private.oauth_tokens 
  ADD COLUMN access_token_secret_id UUID;
ALTER TABLE private.oauth_tokens 
  ADD COLUMN refresh_token_secret_id UUID;

-- Migrate existing data to Vault (if any exists)
DO $$
DECLARE
  r RECORD;
  v_access_id UUID;
  v_refresh_id UUID;
BEGIN
  FOR r IN SELECT id, access_token_old, refresh_token_old FROM private.oauth_tokens
  LOOP
    -- Encrypt access token if it exists
    IF r.access_token_old IS NOT NULL AND r.access_token_old != '' THEN
      SELECT vault.create_secret(r.access_token_old) INTO v_access_id;
      UPDATE private.oauth_tokens 
      SET access_token_secret_id = v_access_id 
      WHERE id = r.id;
    END IF;
    
    -- Encrypt refresh token if it exists
    IF r.refresh_token_old IS NOT NULL AND r.refresh_token_old != '' THEN
      SELECT vault.create_secret(r.refresh_token_old) INTO v_refresh_id;
      UPDATE private.oauth_tokens 
      SET refresh_token_secret_id = v_refresh_id 
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- Drop old plaintext columns
ALTER TABLE private.oauth_tokens DROP COLUMN IF EXISTS access_token_old;
ALTER TABLE private.oauth_tokens DROP COLUMN IF EXISTS refresh_token_old;

-- Make access_token_secret_id required (all tokens must have an access token)
ALTER TABLE private.oauth_tokens 
  ALTER COLUMN access_token_secret_id SET NOT NULL;

-- Update RPC function to encrypt tokens using Vault before storage
CREATE OR REPLACE FUNCTION public.upsert_oauth_token(
  p_provider TEXT,
  p_access_token TEXT,
  p_refresh_token TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_access_secret_id UUID;
  v_refresh_secret_id UUID;
  v_existing_access_id UUID;
  v_existing_refresh_id UUID;
  v_result JSONB;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  -- Require authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate provider parameter
  IF p_provider IS NULL OR p_provider = '' THEN
    RAISE EXCEPTION 'Provider is required';
  END IF;
  
  -- Validate access_token parameter
  IF p_access_token IS NULL OR p_access_token = '' THEN
    RAISE EXCEPTION 'Access token is required';
  END IF;
  
  -- Check if token already exists for this user/provider
  SELECT access_token_secret_id, refresh_token_secret_id
  INTO v_existing_access_id, v_existing_refresh_id
  FROM private.oauth_tokens
  WHERE user_id = v_user_id AND provider = p_provider;
  
  -- Encrypt access token using Vault
  IF FOUND AND v_existing_access_id IS NOT NULL THEN
    -- Update existing secret
    PERFORM vault.update_secret(v_existing_access_id, p_access_token);
    v_access_secret_id := v_existing_access_id;
  ELSE
    -- Create new secret
    SELECT vault.create_secret(p_access_token) INTO v_access_secret_id;
  END IF;
  
  -- Encrypt refresh token using Vault (if provided)
  IF p_refresh_token IS NOT NULL AND p_refresh_token != '' THEN
    IF FOUND AND v_existing_refresh_id IS NOT NULL THEN
      -- Update existing secret
      PERFORM vault.update_secret(v_existing_refresh_id, p_refresh_token);
      v_refresh_secret_id := v_existing_refresh_id;
    ELSE
      -- Create new secret
      SELECT vault.create_secret(p_refresh_token) INTO v_refresh_secret_id;
    END IF;
  ELSIF FOUND AND v_existing_refresh_id IS NOT NULL THEN
    -- Refresh token was removed, delete the secret
    PERFORM vault.delete_secret(v_existing_refresh_id);
    v_refresh_secret_id := NULL;
  ELSE
    v_refresh_secret_id := NULL;
  END IF;
  
  -- Upsert token metadata (secret IDs, not plaintext tokens)
  INSERT INTO private.oauth_tokens (
    user_id,
    provider,
    access_token_secret_id,
    refresh_token_secret_id,
    expires_at
  )
  VALUES (
    v_user_id,
    p_provider,
    v_access_secret_id,
    v_refresh_secret_id,
    p_expires_at
  )
  ON CONFLICT (user_id, provider)
  DO UPDATE SET
    access_token_secret_id = EXCLUDED.access_token_secret_id,
    refresh_token_secret_id = EXCLUDED.refresh_token_secret_id,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW();
  
  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'provider', p_provider
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return failure
    RAISE WARNING 'Error upserting OAuth token for user % provider %: %', v_user_id, p_provider, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Update RPC function to decrypt tokens from Vault when retrieved
CREATE OR REPLACE FUNCTION public.get_oauth_token(
  p_provider TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_token RECORD;
  v_access_token TEXT;
  v_refresh_token TEXT;
  v_result JSONB;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  -- Require authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate provider parameter
  IF p_provider IS NULL OR p_provider = '' THEN
    RAISE EXCEPTION 'Provider is required';
  END IF;
  
  -- Fetch token metadata for the user and provider
  SELECT 
    access_token_secret_id,
    refresh_token_secret_id,
    expires_at,
    created_at,
    updated_at
  INTO v_token
  FROM private.oauth_tokens
  WHERE user_id = v_user_id
    AND provider = p_provider;
  
  -- Check if token exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Token not found'
    );
  END IF;
  
  -- Decrypt access token from Vault
  SELECT decrypted_secret INTO v_access_token
  FROM vault.decrypted_secrets
  WHERE id = v_token.access_token_secret_id;
  
  -- Decrypt refresh token from Vault (if exists)
  IF v_token.refresh_token_secret_id IS NOT NULL THEN
    SELECT decrypted_secret INTO v_refresh_token
    FROM vault.decrypted_secrets
    WHERE id = v_token.refresh_token_secret_id;
  ELSE
    v_refresh_token := NULL;
  END IF;
  
  -- Return decrypted token data
  v_result := jsonb_build_object(
    'success', true,
    'provider', p_provider,
    'access_token', v_access_token,
    'refresh_token', v_refresh_token,
    'expires_at', v_token.expires_at,
    'created_at', v_token.created_at,
    'updated_at', v_token.updated_at
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return failure
    RAISE WARNING 'Error retrieving OAuth token for user % provider %: %', v_user_id, p_provider, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Update RPC function to delete tokens and clean up Vault secrets
CREATE OR REPLACE FUNCTION public.delete_oauth_token(
  p_provider TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_access_secret_id UUID;
  v_refresh_secret_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  -- Require authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate provider parameter
  IF p_provider IS NULL OR p_provider = '' THEN
    RAISE EXCEPTION 'Provider is required';
  END IF;
  
  -- Get secret IDs before deletion
  SELECT access_token_secret_id, refresh_token_secret_id
  INTO v_access_secret_id, v_refresh_secret_id
  FROM private.oauth_tokens
  WHERE user_id = v_user_id
    AND provider = p_provider;
  
  -- Delete token record
  DELETE FROM private.oauth_tokens
  WHERE user_id = v_user_id
    AND provider = p_provider;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Clean up Vault secrets if token was deleted
  IF v_deleted_count > 0 THEN
    IF v_access_secret_id IS NOT NULL THEN
      PERFORM vault.delete_secret(v_access_secret_id);
    END IF;
    IF v_refresh_secret_id IS NOT NULL THEN
      PERFORM vault.delete_secret(v_refresh_secret_id);
    END IF;
  END IF;
  
  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'deleted', v_deleted_count > 0,
    'provider', p_provider
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return failure
    RAISE WARNING 'Error deleting OAuth token for user % provider %: %', v_user_id, p_provider, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Update comments to reflect Vault encryption
COMMENT ON TABLE private.oauth_tokens IS 'Stores OAuth provider token metadata with Vault-encrypted secrets. Tokens are encrypted at rest using Supabase Vault. Access only through RPC functions which handle encryption/decryption.';
COMMENT ON COLUMN private.oauth_tokens.access_token_secret_id IS 'UUID reference to encrypted access token in Vault';
COMMENT ON COLUMN private.oauth_tokens.refresh_token_secret_id IS 'UUID reference to encrypted refresh token in Vault (nullable)';
COMMENT ON FUNCTION public.upsert_oauth_token IS 'Securely store or update OAuth provider tokens. Automatically encrypts tokens using Vault before storage. Only accessible by authenticated users for their own tokens.';
COMMENT ON FUNCTION public.get_oauth_token IS 'Retrieve OAuth tokens for a specific provider. Automatically decrypts tokens from Vault. Only accessible by authenticated users for their own tokens.';
COMMENT ON FUNCTION public.delete_oauth_token IS 'Delete OAuth tokens for a specific provider. Automatically cleans up Vault secrets. Only accessible by authenticated users for their own tokens.';

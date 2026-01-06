-- Grant service_role access to existing OAuth RPC functions
-- This allows the token refresh cron job to update tokens using service_role credentials

GRANT EXECUTE ON FUNCTION public.upsert_oauth_token(TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_oauth_token(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_oauth_token(TEXT) TO service_role;

-- Create a helper RPC function for cron jobs to refresh tokens in batch
-- This function can query expired tokens and return them for refresh
-- Uses advisory locks to prevent concurrent processing of the same token
CREATE OR REPLACE FUNCTION public.get_expired_oauth_tokens()
RETURNS TABLE (
  user_id UUID,
  provider TEXT,
  expires_at TIMESTAMPTZ,
  refresh_token_secret_id UUID,
  lock_key BIGINT
)
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT;
  v_record RECORD;
BEGIN
  -- Only allow service_role to call this function
  IF current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: only service_role can call this function';
  END IF;

  -- Return tokens that are expired or will expire in the next 5 minutes
  -- and have a refresh token available, with advisory lock protection
  FOR v_record IN
    SELECT
      t.user_id,
      t.provider,
      t.expires_at,
      t.refresh_token_secret_id
    FROM private.oauth_tokens t
    WHERE t.expires_at IS NOT NULL
      AND t.refresh_token_secret_id IS NOT NULL
      AND t.expires_at < (NOW() + INTERVAL '5 minutes')
  LOOP
    -- Compute a stable lock key from user_id and provider
    -- Using hashtext to create a stable bigint from the combination
    v_lock_key := ('x' || substr(md5(v_record.user_id::TEXT || '::' || v_record.provider), 1, 15))::bit(60)::BIGINT;
    
    -- Try to acquire advisory lock; only return rows where lock was acquired
    IF pg_try_advisory_lock(v_lock_key) THEN
      user_id := v_record.user_id;
      provider := v_record.provider;
      expires_at := v_record.expires_at;
      refresh_token_secret_id := v_record.refresh_token_secret_id;
      lock_key := v_lock_key;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service_role only
GRANT EXECUTE ON FUNCTION public.get_expired_oauth_tokens() TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_expired_oauth_tokens() IS 'Returns OAuth tokens that need refreshing (expired or expiring within 5 minutes) with advisory locks to prevent concurrent processing. Only callable by service_role for cron jobs. Locks must be released via release_oauth_token_lock() after processing.';

-- Create a helper function to release advisory locks after token refresh
CREATE OR REPLACE FUNCTION public.release_oauth_token_lock(p_lock_key BIGINT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = pg_temp
AS $$
BEGIN
  -- Only allow service_role to call this function
  IF current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: only service_role can call this function';
  END IF;

  RETURN pg_advisory_unlock(p_lock_key);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service_role only
GRANT EXECUTE ON FUNCTION public.release_oauth_token_lock(BIGINT) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.release_oauth_token_lock(BIGINT) IS 'Releases an advisory lock acquired by get_expired_oauth_tokens(). Only callable by service_role for cron jobs.';

-- Create service_role-specific RPC function to upsert OAuth token
-- This version accepts user_id as a parameter instead of using auth.uid()
CREATE OR REPLACE FUNCTION public.upsert_oauth_token_for_user(
  p_user_id UUID,
  p_provider TEXT,
  p_access_token TEXT,
  p_refresh_token TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, private, vault, pg_temp
AS $$
DECLARE
  v_access_secret_id UUID;
  v_refresh_secret_id UUID;
  v_existing_access_id UUID;
  v_existing_refresh_id UUID;
  v_created_access BOOLEAN := FALSE;
  v_created_refresh BOOLEAN := FALSE;
  v_existing_record RECORD;
  v_delete_result UUID;
BEGIN
  -- Only allow service_role to call this function
  IF current_setting('role', true) != 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied: only service_role can call this function');
  END IF;

  -- Validate user_id
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_id is required');
  END IF;

  -- Check for recent successful upsert to avoid duplicate processing (idempotency)
  SELECT * INTO v_existing_record
  FROM private.oauth_tokens
  WHERE user_id = p_user_id AND provider = p_provider
    AND updated_at > (NOW() - INTERVAL '60 seconds');
  
  IF FOUND THEN
    -- Recent update detected, skip to avoid re-processing
    RETURN jsonb_build_object('success', true, 'message', 'Recent update detected, skipping to avoid duplicate processing');
  END IF;

  -- Get existing secret IDs if token already exists
  SELECT access_token_secret_id, refresh_token_secret_id
  INTO v_existing_access_id, v_existing_refresh_id
  FROM private.oauth_tokens
  WHERE user_id = p_user_id AND provider = p_provider;

  -- Update or create access token secret
  IF v_existing_access_id IS NOT NULL THEN
    -- Validate existing secret exists before attempting update
    IF EXISTS (SELECT 1 FROM vault.secrets WHERE id = v_existing_access_id) THEN
      -- Update existing secret
      SELECT vault.update_secret(v_existing_access_id, p_access_token) INTO v_access_secret_id;
      
      -- Check if update succeeded
      IF v_access_secret_id IS NULL THEN
        -- Update failed, try creating new secret
        SELECT vault.create_secret(p_access_token) INTO v_access_secret_id;
        v_created_access := TRUE;
        
        IF v_access_secret_id IS NULL THEN
          RAISE EXCEPTION 'Failed to create access token secret after update failure for user_id=% provider=%', p_user_id, p_provider;
        END IF;
      ELSE
        v_created_access := FALSE;
      END IF;
    ELSE
      -- Existing secret missing, create new one
      SELECT vault.create_secret(p_access_token) INTO v_access_secret_id;
      v_created_access := TRUE;
      
      IF v_access_secret_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create access token secret for user_id=% provider=%', p_user_id, p_provider;
      END IF;
    END IF;
  ELSE
    -- Create new secret
    SELECT vault.create_secret(p_access_token) INTO v_access_secret_id;
    v_created_access := TRUE;
    
    IF v_access_secret_id IS NULL THEN
      RAISE EXCEPTION 'Failed to create access token secret for user_id=% provider=%', p_user_id, p_provider;
    END IF;
  END IF;

  -- Update or create refresh token secret if provided
  IF p_refresh_token IS NOT NULL THEN
    IF v_existing_refresh_id IS NOT NULL THEN
      -- Validate existing secret exists before attempting update
      IF EXISTS (SELECT 1 FROM vault.secrets WHERE id = v_existing_refresh_id) THEN
        -- Update existing secret
        SELECT vault.update_secret(v_existing_refresh_id, p_refresh_token) INTO v_refresh_secret_id;
        
        -- Check if update succeeded
        IF v_refresh_secret_id IS NULL THEN
          -- Update failed, try creating new secret
          SELECT vault.create_secret(p_refresh_token) INTO v_refresh_secret_id;
          v_created_refresh := TRUE;
          
          IF v_refresh_secret_id IS NULL THEN
            RAISE EXCEPTION 'Failed to create refresh token secret after update failure for user_id=% provider=%', p_user_id, p_provider;
          END IF;
        ELSE
          v_created_refresh := FALSE;
        END IF;
      ELSE
        -- Existing secret missing, create new one
        SELECT vault.create_secret(p_refresh_token) INTO v_refresh_secret_id;
        v_created_refresh := TRUE;
        
        IF v_refresh_secret_id IS NULL THEN
          RAISE EXCEPTION 'Failed to create refresh token secret for user_id=% provider=%', p_user_id, p_provider;
        END IF;
      END IF;
    ELSE
      -- Create new secret
      SELECT vault.create_secret(p_refresh_token) INTO v_refresh_secret_id;
      v_created_refresh := TRUE;
      
      IF v_refresh_secret_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create refresh token secret for user_id=% provider=%', p_user_id, p_provider;
      END IF;
    END IF;
  ELSIF v_existing_refresh_id IS NOT NULL THEN
    -- Refresh token was removed, delete the old secret with error handling
    DELETE FROM vault.secrets WHERE id = v_existing_refresh_id
    RETURNING id INTO v_delete_result;
    
    IF v_delete_result IS NULL THEN
      RAISE WARNING 'Failed to delete old refresh token secret id=% for user_id=% provider=%', v_existing_refresh_id, p_user_id, p_provider;
    END IF;
    
    v_refresh_secret_id := NULL;
  END IF;

  -- Upsert the token record
  INSERT INTO private.oauth_tokens (user_id, provider, access_token_secret_id, refresh_token_secret_id, expires_at)
  VALUES (p_user_id, p_provider, v_access_secret_id, v_refresh_secret_id, p_expires_at)
  ON CONFLICT (user_id, provider)
  DO UPDATE SET
    access_token_secret_id = EXCLUDED.access_token_secret_id,
    refresh_token_secret_id = EXCLUDED.refresh_token_secret_id,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, clean up only newly created secrets (not updated ones)
    BEGIN
      IF v_created_access AND v_access_secret_id IS NOT NULL THEN
        DELETE FROM vault.secrets WHERE id = v_access_secret_id
        RETURNING id INTO v_delete_result;
        
        IF v_delete_result IS NULL THEN
          RAISE WARNING 'Failed to cleanup access token secret id=% during exception handling: %', v_access_secret_id, SQLERRM;
        END IF;
      END IF;
      
      IF v_created_refresh AND v_refresh_secret_id IS NOT NULL THEN
        DELETE FROM vault.secrets WHERE id = v_refresh_secret_id
        RETURNING id INTO v_delete_result;
        
        IF v_delete_result IS NULL THEN
          RAISE WARNING 'Failed to cleanup refresh token secret id=% during exception handling: %', v_refresh_secret_id, SQLERRM;
        END IF;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log cleanup errors but don't fail the outer exception
        RAISE WARNING 'Cleanup failed for access_secret_id=% refresh_secret_id=%: %', v_access_secret_id, v_refresh_secret_id, SQLERRM;
    END;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service_role only
GRANT EXECUTE ON FUNCTION public.upsert_oauth_token_for_user(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.upsert_oauth_token_for_user(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) IS 'Upserts an OAuth token for a specific user. Only callable by service_role for cron jobs.';

-- Create service_role-specific RPC function to get OAuth token for any user
-- This version accepts user_id as a parameter instead of using auth.uid()
CREATE OR REPLACE FUNCTION public.get_oauth_token_for_user(
  p_user_id UUID,
  p_provider TEXT
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, private, vault, pg_temp
AS $$
DECLARE
  v_token_record RECORD;
  v_access_token TEXT;
  v_refresh_token TEXT;
BEGIN
  -- Only allow service_role to call this function
  IF current_setting('role', true) != 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied: only service_role can call this function');
  END IF;

  -- Validate user_id
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_id is required');
  END IF;

  -- Get token record
  SELECT * INTO v_token_record
  FROM private.oauth_tokens
  WHERE user_id = p_user_id AND provider = p_provider;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token not found');
  END IF;

  -- Decrypt access token from Vault with STRICT to fail fast on missing secrets
  BEGIN
    SELECT decrypted_secret INTO STRICT v_access_token
    FROM vault.decrypted_secrets
    WHERE id = v_token_record.access_token_secret_id;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE EXCEPTION 'Access token secret not found in vault: secret_id=% user_id=% provider=%', 
        v_token_record.access_token_secret_id, p_user_id, p_provider;
    WHEN TOO_MANY_ROWS THEN
      RAISE EXCEPTION 'Multiple access token secrets found in vault: secret_id=% user_id=% provider=%', 
        v_token_record.access_token_secret_id, p_user_id, p_provider;
  END;

  -- Additional NULL check for access token
  IF v_access_token IS NULL THEN
    RAISE EXCEPTION 'Access token is NULL after decryption: secret_id=% user_id=% provider=%', 
      v_token_record.access_token_secret_id, p_user_id, p_provider;
  END IF;

  -- Decrypt refresh token from Vault if present with STRICT to fail fast
  IF v_token_record.refresh_token_secret_id IS NOT NULL THEN
    BEGIN
      SELECT decrypted_secret INTO STRICT v_refresh_token
      FROM vault.decrypted_secrets
      WHERE id = v_token_record.refresh_token_secret_id;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        RAISE EXCEPTION 'Refresh token secret not found in vault: secret_id=% user_id=% provider=%', 
          v_token_record.refresh_token_secret_id, p_user_id, p_provider;
      WHEN TOO_MANY_ROWS THEN
        RAISE EXCEPTION 'Multiple refresh token secrets found in vault: secret_id=% user_id=% provider=%', 
          v_token_record.refresh_token_secret_id, p_user_id, p_provider;
    END;

    -- Additional NULL check for refresh token
    IF v_refresh_token IS NULL THEN
      RAISE EXCEPTION 'Refresh token is NULL after decryption: secret_id=% user_id=% provider=%', 
        v_token_record.refresh_token_secret_id, p_user_id, p_provider;
    END IF;
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

-- Grant execute permission to service_role only
GRANT EXECUTE ON FUNCTION public.get_oauth_token_for_user(UUID, TEXT) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_oauth_token_for_user(UUID, TEXT) IS 'Gets an OAuth token for a specific user with decrypted secrets. Only callable by service_role for cron jobs.';


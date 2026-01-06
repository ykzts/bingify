-- Grant service_role access to existing OAuth RPC functions
-- This allows the token refresh cron job to update tokens using service_role credentials

GRANT EXECUTE ON FUNCTION public.upsert_oauth_token(TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_oauth_token(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_oauth_token(TEXT) TO service_role;

-- Grant access to vault views for service_role
-- Required for the cron job to decrypt refresh tokens
GRANT SELECT ON vault.decrypted_secrets TO service_role;

-- Create a helper RPC function for cron jobs to refresh tokens in batch
-- This function can query expired tokens and return them for refresh
CREATE OR REPLACE FUNCTION public.get_expired_oauth_tokens()
RETURNS TABLE (
  user_id UUID,
  provider TEXT,
  expires_at TIMESTAMPTZ,
  refresh_token_secret_id UUID
)
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  -- Only allow service_role to call this function
  IF current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: only service_role can call this function';
  END IF;

  -- Return tokens that are expired or will expire in the next 5 minutes
  -- and have a refresh token available
  RETURN QUERY
  SELECT
    t.user_id,
    t.provider,
    t.expires_at,
    t.refresh_token_secret_id
  FROM private.oauth_tokens t
  WHERE t.expires_at IS NOT NULL
    AND t.refresh_token_secret_id IS NOT NULL
    AND t.expires_at < (NOW() + INTERVAL '5 minutes');
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service_role only
GRANT EXECUTE ON FUNCTION public.get_expired_oauth_tokens() TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_expired_oauth_tokens() IS 'Returns OAuth tokens that need refreshing (expired or expiring within 5 minutes). Only callable by service_role for cron jobs.';

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
BEGIN
  -- Only allow service_role to call this function
  IF current_setting('role', true) != 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied: only service_role can call this function');
  END IF;

  -- Validate user_id
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_id is required');
  END IF;

  -- Get existing secret IDs if token already exists
  SELECT access_token_secret_id, refresh_token_secret_id
  INTO v_existing_access_id, v_existing_refresh_id
  FROM private.oauth_tokens
  WHERE user_id = p_user_id AND provider = p_provider;

  -- Update or create access token secret
  IF v_existing_access_id IS NOT NULL THEN
    -- Update existing secret
    SELECT vault.update_secret(v_existing_access_id, p_access_token) INTO v_access_secret_id;
    v_created_access := FALSE;
  ELSE
    -- Create new secret
    SELECT vault.create_secret(p_access_token) INTO v_access_secret_id;
    v_created_access := TRUE;
  END IF;

  -- Update or create refresh token secret if provided
  IF p_refresh_token IS NOT NULL THEN
    IF v_existing_refresh_id IS NOT NULL THEN
      -- Update existing secret
      SELECT vault.update_secret(v_existing_refresh_id, p_refresh_token) INTO v_refresh_secret_id;
      v_created_refresh := FALSE;
    ELSE
      -- Create new secret
      SELECT vault.create_secret(p_refresh_token) INTO v_refresh_secret_id;
      v_created_refresh := TRUE;
    END IF;
  ELSIF v_existing_refresh_id IS NOT NULL THEN
    -- Refresh token was removed, delete the old secret
    DELETE FROM vault.secrets WHERE id = v_existing_refresh_id;
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
        DELETE FROM vault.secrets WHERE id = v_access_secret_id;
      END IF;
      IF v_created_refresh AND v_refresh_secret_id IS NOT NULL THEN
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

-- Grant execute permission to service_role only
GRANT EXECUTE ON FUNCTION public.upsert_oauth_token_for_user(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.upsert_oauth_token_for_user(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) IS 'Upserts an OAuth token for a specific user. Only callable by service_role for cron jobs.';


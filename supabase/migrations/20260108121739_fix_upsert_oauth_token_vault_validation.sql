-- Fix upsert_oauth_token() function to add Vault Secret validation
-- This migration addresses the issue where vault.update_secret() returns void (not uuid),
-- causing UUID parsing errors on subsequent token updates when trying to capture its return value

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
  v_created_access BOOLEAN := FALSE;
  v_created_refresh BOOLEAN := FALSE;
  v_delete_result UUID;
  v_existing_access_token TEXT;
  v_existing_refresh_token TEXT;
  v_updated_at TIMESTAMPTZ;
BEGIN
  -- Check authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get existing secret IDs and updated_at timestamp
  SELECT access_token_secret_id, refresh_token_secret_id, updated_at
  INTO v_existing_access_id, v_existing_refresh_id, v_updated_at
  FROM private.oauth_tokens
  WHERE user_id = v_user_id AND provider = p_provider;

  -- Idempotency check: if recently updated, compare tokens to avoid duplicate processing
  IF FOUND AND v_updated_at > (NOW() - INTERVAL '60 seconds') THEN
    -- Decrypt existing access token to compare
    BEGIN
      SELECT decrypted_secret INTO v_existing_access_token
      FROM vault.decrypted_secrets
      WHERE id = v_existing_access_id;
      
      -- If access tokens match, check refresh token before skipping
      IF v_existing_access_token = p_access_token THEN
        -- Check refresh token compatibility
        IF p_refresh_token IS NULL AND v_existing_refresh_id IS NULL THEN
          -- Both have no refresh token, tokens match completely
          RETURN jsonb_build_object('success', true, 'message', 'Token already up to date, skipping duplicate processing');
        ELSIF p_refresh_token IS NOT NULL AND v_existing_refresh_id IS NOT NULL THEN
          -- Both have refresh tokens, compare them
          SELECT decrypted_secret INTO v_existing_refresh_token
          FROM vault.decrypted_secrets
          WHERE id = v_existing_refresh_id;
          
          IF v_existing_refresh_token = p_refresh_token THEN
            RETURN jsonb_build_object('success', true, 'message', 'Token already up to date, skipping duplicate processing');
          END IF;
        END IF;
        -- Otherwise tokens differ (one has refresh, other doesn't), proceed with update
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- If decryption fails, proceed with update
        NULL;
    END;
  END IF;

  -- Update or create access token secret
  IF v_existing_access_id IS NOT NULL THEN
    -- Validate existing secret exists before attempting update
    IF EXISTS (SELECT 1 FROM vault.secrets WHERE id = v_existing_access_id) THEN
      -- Update existing secret (vault.update_secret returns void, not uuid)
      PERFORM vault.update_secret(v_existing_access_id, p_access_token);
      v_access_secret_id := v_existing_access_id;
      v_created_access := FALSE;
    ELSE
      -- Existing secret missing (orphaned reference), create new one
      SELECT vault.create_secret(p_access_token) INTO v_access_secret_id;
      v_created_access := TRUE;
      
      IF v_access_secret_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create access token secret for user_id=% provider=%', v_user_id, p_provider;
      END IF;
    END IF;
  ELSE
    -- Create new secret
    SELECT vault.create_secret(p_access_token) INTO v_access_secret_id;
    v_created_access := TRUE;
    
    IF v_access_secret_id IS NULL THEN
      RAISE EXCEPTION 'Failed to create access token secret for user_id=% provider=%', v_user_id, p_provider;
    END IF;
  END IF;

  -- Update or create refresh token secret if provided
  IF p_refresh_token IS NOT NULL THEN
    IF v_existing_refresh_id IS NOT NULL THEN
      -- Validate existing secret exists before attempting update
      IF EXISTS (SELECT 1 FROM vault.secrets WHERE id = v_existing_refresh_id) THEN
        -- Update existing secret (vault.update_secret returns void, not uuid)
        PERFORM vault.update_secret(v_existing_refresh_id, p_refresh_token);
        v_refresh_secret_id := v_existing_refresh_id;
        v_created_refresh := FALSE;
      ELSE
        -- Existing secret missing (orphaned reference), create new one
        SELECT vault.create_secret(p_refresh_token) INTO v_refresh_secret_id;
        v_created_refresh := TRUE;
        
        IF v_refresh_secret_id IS NULL THEN
          RAISE EXCEPTION 'Failed to create refresh token secret for user_id=% provider=%', v_user_id, p_provider;
        END IF;
      END IF;
    ELSE
      -- Create new secret
      SELECT vault.create_secret(p_refresh_token) INTO v_refresh_secret_id;
      v_created_refresh := TRUE;
      
      IF v_refresh_secret_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create refresh token secret for user_id=% provider=%', v_user_id, p_provider;
      END IF;
    END IF;
  ELSIF v_existing_refresh_id IS NOT NULL THEN
    -- Refresh token was removed, delete the old secret with error handling
    DELETE FROM vault.secrets WHERE id = v_existing_refresh_id
    RETURNING id INTO v_delete_result;
    
    IF v_delete_result IS NULL THEN
      RAISE WARNING 'Failed to delete old refresh token secret id=% for user_id=% provider=%', v_existing_refresh_id, v_user_id, p_provider;
    END IF;
    
    v_refresh_secret_id := NULL;
  END IF;

  -- Upsert the token record
  INSERT INTO private.oauth_tokens (user_id, provider, access_token_secret_id, refresh_token_secret_id, expires_at)
  VALUES (v_user_id, p_provider, v_access_secret_id, v_refresh_secret_id, p_expires_at)
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
          RAISE WARNING 'Failed to cleanup access token secret id=% during exception handling for user_id=% provider=%: %', v_access_secret_id, v_user_id, p_provider, SQLERRM;
        END IF;
      END IF;
      
      IF v_created_refresh AND v_refresh_secret_id IS NOT NULL THEN
        DELETE FROM vault.secrets WHERE id = v_refresh_secret_id
        RETURNING id INTO v_delete_result;
        
        IF v_delete_result IS NULL THEN
          RAISE WARNING 'Failed to cleanup refresh token secret id=% during exception handling for user_id=% provider=%: %', v_refresh_secret_id, v_user_id, p_provider, SQLERRM;
        END IF;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log cleanup errors but don't fail the outer exception
        RAISE WARNING 'Cleanup failed for user_id=% provider=% access_secret_id=% refresh_secret_id=%: %', v_user_id, p_provider, v_access_secret_id, v_refresh_secret_id, SQLERRM;
    END;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Update function comment to document the fix
COMMENT ON FUNCTION public.upsert_oauth_token(TEXT, TEXT, TEXT, TIMESTAMPTZ) IS 'Upserts an OAuth token for the authenticated user with Vault encryption. Fixed to correctly handle vault.update_secret() which returns void (not uuid), and to validate secret existence before updates.';

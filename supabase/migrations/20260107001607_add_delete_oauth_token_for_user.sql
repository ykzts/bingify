-- Create service_role-specific RPC function to delete OAuth token for any user
-- This version accepts user_id as a parameter instead of using auth.uid()
CREATE OR REPLACE FUNCTION public.delete_oauth_token_for_user(
  p_user_id UUID,
  p_provider TEXT
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, private, vault, pg_temp
AS $$
DECLARE
  v_access_secret_id UUID;
  v_refresh_secret_id UUID;
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

  -- Get secret IDs before deletion
  SELECT access_token_secret_id, refresh_token_secret_id
  INTO v_access_secret_id, v_refresh_secret_id
  FROM private.oauth_tokens
  WHERE user_id = p_user_id AND provider = p_provider;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token not found', 'deleted', false, 'provider', p_provider);
  END IF;

  -- Delete the token record
  DELETE FROM private.oauth_tokens
  WHERE user_id = p_user_id AND provider = p_provider;

  -- Clean up Vault secrets
  -- Note: vault.delete_secret() doesn't exist, use DELETE FROM vault.secrets
  IF v_access_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_access_secret_id
    RETURNING id INTO v_delete_result;
    
    IF v_delete_result IS NULL THEN
      RAISE WARNING 'Failed to delete access token secret id=% for user_id=% provider=%', v_access_secret_id, p_user_id, p_provider;
    END IF;
  END IF;
  
  IF v_refresh_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_refresh_secret_id
    RETURNING id INTO v_delete_result;
    
    IF v_delete_result IS NULL THEN
      RAISE WARNING 'Failed to delete refresh token secret id=% for user_id=% provider=%', v_refresh_secret_id, p_user_id, p_provider;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'deleted', true, 'provider', p_provider);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service_role only
GRANT EXECUTE ON FUNCTION public.delete_oauth_token_for_user(UUID, TEXT) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.delete_oauth_token_for_user(UUID, TEXT) IS 'Deletes an OAuth token for a specific user and cleans up associated Vault secrets. Only callable by service_role for cron jobs and admin operations.';

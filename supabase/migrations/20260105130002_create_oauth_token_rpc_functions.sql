-- RPC function to upsert (insert or update) OAuth tokens
-- This function provides a safe interface for storing tokens from the application layer
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
  
  -- Upsert token (insert or update if exists)
  INSERT INTO private.oauth_tokens (
    user_id,
    provider,
    access_token,
    refresh_token,
    expires_at
  )
  VALUES (
    v_user_id,
    p_provider,
    p_access_token,
    p_refresh_token,
    p_expires_at
  )
  ON CONFLICT (user_id, provider)
  DO UPDATE SET
    access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
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

-- RPC function to retrieve OAuth tokens for a specific provider
-- This function provides decrypted tokens only to the authenticated owner
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
  
  -- Fetch token for the user and provider
  SELECT 
    access_token,
    refresh_token,
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
  
  -- Return decrypted token data
  v_result := jsonb_build_object(
    'success', true,
    'provider', p_provider,
    'access_token', v_token.access_token,
    'refresh_token', v_token.refresh_token,
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

-- RPC function to delete OAuth tokens for a specific provider
-- Useful for disconnecting OAuth providers or revoking access
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
  
  -- Delete token
  DELETE FROM private.oauth_tokens
  WHERE user_id = v_user_id
    AND provider = p_provider;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
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

-- Add comments to document RPC functions
COMMENT ON FUNCTION public.upsert_oauth_token IS 'Securely store or update OAuth provider tokens. Only accessible by authenticated users for their own tokens.';
COMMENT ON FUNCTION public.get_oauth_token IS 'Retrieve decrypted OAuth tokens for a specific provider. Only accessible by authenticated users for their own tokens.';
COMMENT ON FUNCTION public.delete_oauth_token IS 'Delete OAuth tokens for a specific provider. Only accessible by authenticated users for their own tokens.';

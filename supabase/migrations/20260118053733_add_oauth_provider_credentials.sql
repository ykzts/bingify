-- Add OAuth provider credentials columns to system_auth_providers table
-- This allows dynamic configuration of OAuth client IDs and secrets from the admin dashboard

-- Add columns for OAuth credentials
ALTER TABLE system_auth_providers
ADD COLUMN IF NOT EXISTS client_id TEXT,
ADD COLUMN IF NOT EXISTS client_secret_id UUID;

-- Add foreign key constraint to vault.secrets for client_secret_id
-- Note: We cannot add a foreign key directly to vault.secrets as it's a system table
-- The constraint will be enforced at the application level via RPC functions

-- Add comment to document the column usage
COMMENT ON COLUMN system_auth_providers.client_id IS 'OAuth Client ID - stored in plaintext as it is not sensitive';
COMMENT ON COLUMN system_auth_providers.client_secret_id IS 'Reference to vault.secrets for encrypted OAuth Client Secret';

-- ============================================================================
-- SECURITY NOTE: Disabling PostgreSQL Statement Logging
-- ============================================================================
-- The RPC functions below handle plaintext OAuth secrets before encrypting them
-- with Vault. To prevent these secrets from being logged in PostgreSQL logs,
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
-- Without this setting, plaintext secrets may be recorded in database logs,
-- defeating the purpose of Vault encryption.
-- ============================================================================

-- Create RPC function to upsert OAuth provider configuration with Vault encryption
CREATE OR REPLACE FUNCTION public.upsert_oauth_provider_config(
  p_provider TEXT,
  p_client_id TEXT,
  p_client_secret TEXT DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_secret_id UUID;
  v_existing_secret_id UUID;
  v_created_secret BOOLEAN := FALSE;
BEGIN
  -- Check authentication and admin role
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin permission required');
  END IF;

  -- Validate client_id is provided
  IF p_client_id IS NULL OR p_client_id = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Client ID is required');
  END IF;

  -- Validate provider exists
  IF NOT EXISTS (
    SELECT 1 FROM public.system_auth_providers
    WHERE provider = p_provider
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider not found');
  END IF;

  -- Get existing secret ID if exists
  SELECT client_secret_id
  INTO v_existing_secret_id
  FROM public.system_auth_providers
  WHERE provider = p_provider;

  -- Handle client secret if provided
  IF p_client_secret IS NOT NULL AND p_client_secret != '' THEN
    -- Update or create secret in Vault
    IF v_existing_secret_id IS NOT NULL THEN
      -- Validate existing secret exists before attempting update
      IF EXISTS (SELECT 1 FROM vault.secrets WHERE id = v_existing_secret_id) THEN
        -- Update existing secret (vault.update_secret returns void, not uuid)
        PERFORM vault.update_secret(v_existing_secret_id, p_client_secret);
        v_secret_id := v_existing_secret_id;
        v_created_secret := FALSE;
      ELSE
        -- Existing secret missing (orphaned reference), create new one
        SELECT vault.create_secret(p_client_secret) INTO v_secret_id;
        v_created_secret := TRUE;
        
        IF v_secret_id IS NULL THEN
          RAISE EXCEPTION 'Failed to create OAuth client secret';
        END IF;
      END IF;
    ELSE
      -- Create new secret
      SELECT vault.create_secret(p_client_secret) INTO v_secret_id;
      v_created_secret := TRUE;
      
      IF v_secret_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create OAuth client secret';
      END IF;
    END IF;

    -- Update the provider record with both client_id and client_secret_id
    UPDATE public.system_auth_providers
    SET 
      client_id = p_client_id,
      client_secret_id = v_secret_id,
      updated_at = NOW()
    WHERE provider = p_provider;
  ELSE
    -- Only update client_id if secret is not provided
    UPDATE public.system_auth_providers
    SET 
      client_id = p_client_id,
      updated_at = NOW()
    WHERE provider = p_provider;
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, clean up only newly created secret (not updated ones)
    BEGIN
      IF v_created_secret AND v_secret_id IS NOT NULL THEN
        DELETE FROM vault.secrets WHERE id = v_secret_id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Ignore cleanup errors in exception handler
        NULL;
    END;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to get OAuth provider configuration with Vault decryption
CREATE OR REPLACE FUNCTION public.get_oauth_provider_config(
  p_provider TEXT
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_provider_record RECORD;
  v_client_secret TEXT;
BEGIN
  -- Check authentication and admin role
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin permission required');
  END IF;

  -- Get provider record
  SELECT * INTO v_provider_record
  FROM public.system_auth_providers
  WHERE provider = p_provider;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider not found');
  END IF;

  -- Decrypt client secret from Vault if exists
  IF v_provider_record.client_secret_id IS NOT NULL THEN
    SELECT decrypted_secret INTO v_client_secret
    FROM vault.decrypted_secrets
    WHERE id = v_provider_record.client_secret_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'provider', v_provider_record.provider,
      'client_id', v_provider_record.client_id,
      'client_secret', v_client_secret,
      'is_enabled', v_provider_record.is_enabled,
      'label', v_provider_record.label
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to delete OAuth provider configuration and clean up Vault
CREATE OR REPLACE FUNCTION public.delete_oauth_provider_config(
  p_provider TEXT
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_secret_id UUID;
BEGIN
  -- Check authentication and admin role
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin permission required');
  END IF;

  -- Get secret ID before deletion
  SELECT client_secret_id
  INTO v_secret_id
  FROM public.system_auth_providers
  WHERE provider = p_provider;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider not found');
  END IF;

  -- Clear the OAuth configuration
  UPDATE public.system_auth_providers
  SET 
    client_id = NULL,
    client_secret_id = NULL,
    updated_at = NOW()
  WHERE provider = p_provider;

  -- Clean up Vault secret if exists
  IF v_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_secret_id;
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION public.upsert_oauth_provider_config(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_oauth_provider_config(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_oauth_provider_config(TEXT) TO authenticated;

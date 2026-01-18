-- Create auth_hook_secrets table in private schema with Vault encryption
-- This table stores secrets for various Supabase Auth hooks

-- Create auth_hook_secrets table in private schema
CREATE TABLE IF NOT EXISTS private.auth_hook_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Hook name (e.g., 'send-email-hook', 'before-user-created-hook')
  hook_name TEXT NOT NULL UNIQUE,
  -- Store Vault secret ID instead of plaintext secret
  -- The actual secret is encrypted in Supabase Vault and only UUID reference is stored here
  secret_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE private.auth_hook_secrets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can access auth hook secrets
CREATE POLICY auth_hook_secrets_admin_policy
ON private.auth_hook_secrets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

-- RLS Policy: service_role has full access for admin operations
CREATE POLICY auth_hook_secrets_service_role_policy
ON private.auth_hook_secrets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION private.update_auth_hook_secrets_updated_at()
RETURNS TRIGGER
SET search_path = private, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_auth_hook_secrets_updated_at_trigger
BEFORE UPDATE ON private.auth_hook_secrets
FOR EACH ROW
EXECUTE FUNCTION private.update_auth_hook_secrets_updated_at();

-- Grant table permissions (RLS policies control actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON private.auth_hook_secrets TO authenticated, service_role;

-- ============================================================================
-- SECURITY NOTE: Disabling PostgreSQL Statement Logging
-- ============================================================================
-- The RPC functions below handle plaintext secrets before encrypting them
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

-- Create RPC function to upsert auth hook secret with Vault encryption
CREATE OR REPLACE FUNCTION public.upsert_auth_hook_secret(
  p_hook_name TEXT,
  p_secret TEXT
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, private, vault, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_secret_id UUID;
  v_existing_secret_id UUID;
  v_created_secret BOOLEAN := FALSE;
BEGIN
  -- Check authentication: allow service_role OR authenticated admin users
  v_user_id := auth.uid();
  
  -- Allow service_role without user authentication (for webhooks)
  IF v_user_id IS NULL AND auth.role() != 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- For authenticated users, verify admin role
  IF v_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = v_user_id AND role = 'admin'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Admin permission required');
    END IF;
  END IF;

  -- Validate hook name
  IF p_hook_name IS NULL OR p_hook_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hook name cannot be empty');
  END IF;

  -- Validate secret format (must start with v1,whsec_)
  IF p_secret IS NULL OR p_secret = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Secret cannot be empty');
  END IF;

  IF NOT (p_secret LIKE 'v1,whsec_%') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Secret must be in format: v1,whsec_...');
  END IF;

  -- Get existing secret ID if exists
  SELECT secret_id
  INTO v_existing_secret_id
  FROM private.auth_hook_secrets
  WHERE hook_name = p_hook_name;

  -- Update or create secret in Vault
  IF v_existing_secret_id IS NOT NULL THEN
    -- Validate existing secret exists before attempting update
    IF EXISTS (SELECT 1 FROM vault.secrets WHERE id = v_existing_secret_id) THEN
      -- Update existing secret (vault.update_secret returns void, not uuid)
      PERFORM vault.update_secret(v_existing_secret_id, p_secret);
      v_secret_id := v_existing_secret_id;
      v_created_secret := FALSE;
    ELSE
      -- Existing secret missing (orphaned reference), create new one
      SELECT vault.create_secret(p_secret) INTO v_secret_id;
      v_created_secret := TRUE;
      
      IF v_secret_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create auth hook secret';
      END IF;
    END IF;
  ELSE
    -- Create new secret
    SELECT vault.create_secret(p_secret) INTO v_secret_id;
    v_created_secret := TRUE;
    
    IF v_secret_id IS NULL THEN
      RAISE EXCEPTION 'Failed to create auth hook secret';
    END IF;
  END IF;

  -- Upsert the secret record
  INSERT INTO private.auth_hook_secrets (hook_name, secret_id)
  VALUES (p_hook_name, v_secret_id)
  ON CONFLICT (hook_name)
  DO UPDATE SET
    secret_id = EXCLUDED.secret_id,
    updated_at = NOW();

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

-- Create RPC function to get auth hook secret with Vault decryption
CREATE OR REPLACE FUNCTION public.get_auth_hook_secret(
  p_hook_name TEXT
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, private, vault, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_secret_record RECORD;
  v_secret TEXT;
BEGIN
  -- Check authentication: allow service_role OR authenticated admin users
  v_user_id := auth.uid();
  
  -- Allow service_role without user authentication (for webhooks)
  IF v_user_id IS NULL AND auth.role() != 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- For authenticated users, verify admin role
  IF v_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = v_user_id AND role = 'admin'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Admin permission required');
    END IF;
  END IF;

  -- Validate hook name
  IF p_hook_name IS NULL OR p_hook_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hook name cannot be empty');
  END IF;

  -- Get secret record
  SELECT * INTO v_secret_record
  FROM private.auth_hook_secrets
  WHERE hook_name = p_hook_name;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Secret not found');
  END IF;

  -- Decrypt secret from Vault
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = v_secret_record.secret_id;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'secret', v_secret,
      'created_at', v_secret_record.created_at,
      'updated_at', v_secret_record.updated_at
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to delete auth hook secret and clean up Vault
CREATE OR REPLACE FUNCTION public.delete_auth_hook_secret(
  p_hook_name TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, private, vault, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_secret_id UUID;
BEGIN
  -- Check authentication: allow service_role OR authenticated admin users
  v_user_id := auth.uid();
  
  -- Allow service_role without user authentication (for webhooks)
  IF v_user_id IS NULL AND auth.role() != 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- For authenticated users, verify admin role
  IF v_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = v_user_id AND role = 'admin'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Admin permission required');
    END IF;
  END IF;

  -- Validate hook name
  IF p_hook_name IS NULL OR p_hook_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hook name cannot be empty');
  END IF;

  -- Get secret ID before deletion
  SELECT secret_id
  INTO v_secret_id
  FROM private.auth_hook_secrets
  WHERE hook_name = p_hook_name;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Secret not found');
  END IF;

  -- Delete the secret record
  DELETE FROM private.auth_hook_secrets
  WHERE hook_name = p_hook_name;

  -- Clean up Vault secret
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
GRANT EXECUTE ON FUNCTION public.upsert_auth_hook_secret(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_hook_secret(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_auth_hook_secret(TEXT) TO authenticated;

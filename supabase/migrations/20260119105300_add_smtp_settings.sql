-- Create smtp_settings table in private schema with Vault encryption
-- This table stores SMTP configuration for email sending

-- Create smtp_settings table in private schema (singleton pattern)
CREATE TABLE IF NOT EXISTS private.smtp_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- SMTP host (e.g., smtp.gmail.com)
  smtp_host TEXT,
  -- SMTP port (e.g., 587, 465, 25)
  smtp_port INTEGER,
  -- SMTP username
  smtp_user TEXT,
  -- Store Vault secret ID instead of plaintext password
  -- The actual password is encrypted in Supabase Vault and only UUID reference is stored here
  smtp_password_id UUID,
  -- Whether to use TLS/SSL (true for port 465, false for STARTTLS on 587)
  smtp_secure BOOLEAN,
  -- From email address (e.g., noreply@your-domain.com)
  mail_from TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE private.smtp_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can access smtp settings
CREATE POLICY smtp_settings_admin_policy
ON private.smtp_settings
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

-- RLS Policy: service_role has full access for email operations
CREATE POLICY smtp_settings_service_role_policy
ON private.smtp_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION private.update_smtp_settings_updated_at()
RETURNS TRIGGER
SET search_path = private, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_smtp_settings_updated_at_trigger
BEFORE UPDATE ON private.smtp_settings
FOR EACH ROW
EXECUTE FUNCTION private.update_smtp_settings_updated_at();

-- Grant table permissions (RLS policies control actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON private.smtp_settings TO authenticated, service_role;

-- ============================================================================
-- SECURITY NOTE: Disabling PostgreSQL Statement Logging
-- ============================================================================
-- The RPC functions below handle plaintext passwords before encrypting them
-- with Vault. To prevent these passwords from being logged in PostgreSQL logs,
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
-- Without this setting, plaintext passwords may be recorded in database logs,
-- defeating the purpose of Vault encryption.
-- ============================================================================

-- Create RPC function to upsert SMTP settings with Vault encryption
CREATE OR REPLACE FUNCTION public.upsert_smtp_settings(
  p_smtp_host TEXT,
  p_smtp_port INTEGER,
  p_smtp_user TEXT,
  p_smtp_secure BOOLEAN,
  p_mail_from TEXT,
  p_smtp_password TEXT DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, private, vault, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_password_id UUID;
  v_existing_password_id UUID;
  v_created_password BOOLEAN := FALSE;
BEGIN
  -- Check authentication: only authenticated admin users
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

  -- Validate required fields
  IF p_smtp_host IS NULL OR p_smtp_host = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'SMTP host is required');
  END IF;

  IF p_smtp_port IS NULL OR p_smtp_port < 1 OR p_smtp_port > 65535 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid SMTP port');
  END IF;

  IF p_smtp_user IS NULL OR p_smtp_user = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'SMTP username is required');
  END IF;

  IF p_mail_from IS NULL OR p_mail_from = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mail from address is required');
  END IF;

  -- Get existing password ID if exists
  SELECT smtp_password_id
  INTO v_existing_password_id
  FROM private.smtp_settings
  WHERE id = 1;

  -- Handle password storage in Vault (only if password is provided and not empty)
  IF p_smtp_password IS NOT NULL AND p_smtp_password != '' THEN
    IF v_existing_password_id IS NOT NULL THEN
      -- Validate existing password exists before attempting update
      IF EXISTS (SELECT 1 FROM vault.secrets WHERE id = v_existing_password_id) THEN
        -- Update existing password (vault.update_secret returns void, not uuid)
        PERFORM vault.update_secret(v_existing_password_id, p_smtp_password);
        v_password_id := v_existing_password_id;
        v_created_password := FALSE;
      ELSE
        -- Existing password missing (orphaned reference), create new one
        v_password_id := vault.create_secret(p_smtp_password);
        v_created_password := TRUE;
      END IF;
    ELSE
      -- Create new password in Vault
      v_password_id := vault.create_secret(p_smtp_password);
      v_created_password := TRUE;
    END IF;
  ELSIF p_smtp_password IS NULL THEN
    -- NULL password means keep existing one (partial update)
    v_password_id := v_existing_password_id;
  ELSE
    -- Empty string password is invalid
    RETURN jsonb_build_object('success', false, 'error', 'SMTP password cannot be empty');
  END IF;

  -- Upsert SMTP settings (singleton pattern)
  INSERT INTO private.smtp_settings (
    id,
    smtp_host,
    smtp_port,
    smtp_user,
    smtp_password_id,
    smtp_secure,
    mail_from
  )
  VALUES (
    1,
    p_smtp_host,
    p_smtp_port,
    p_smtp_user,
    v_password_id,
    p_smtp_secure,
    p_mail_from
  )
  ON CONFLICT (id) DO UPDATE SET
    smtp_host = EXCLUDED.smtp_host,
    smtp_port = EXCLUDED.smtp_port,
    smtp_user = EXCLUDED.smtp_user,
    smtp_password_id = COALESCE(EXCLUDED.smtp_password_id, private.smtp_settings.smtp_password_id),
    smtp_secure = EXCLUDED.smtp_secure,
    mail_from = EXCLUDED.mail_from,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'created_password', v_created_password,
    'message', 'SMTP settings saved successfully'
  );

EXCEPTION WHEN OTHERS THEN
  -- Clean up newly created password on error
  IF v_created_password AND v_password_id IS NOT NULL THEN
    BEGIN
      PERFORM vault.delete_secret(v_password_id);
    EXCEPTION WHEN OTHERS THEN
      -- Ignore deletion errors during rollback
      NULL;
    END;
  END IF;
  
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Failed to save SMTP settings: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to get SMTP settings with decrypted password
CREATE OR REPLACE FUNCTION public.get_smtp_settings()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, private, vault, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_settings RECORD;
  v_decrypted_password TEXT;
BEGIN
  -- Check authentication: allow service_role OR authenticated admin users
  v_user_id := auth.uid();
  
  -- Allow service_role without user authentication (for email sending)
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

  -- Get SMTP settings
  SELECT *
  INTO v_settings
  FROM private.smtp_settings
  WHERE id = 1;

  -- Return NULL if no settings found
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'settings', NULL
    );
  END IF;

  -- Decrypt password if exists
  v_decrypted_password := NULL;
  IF v_settings.smtp_password_id IS NOT NULL THEN
    BEGIN
      SELECT decrypted_secret
      INTO v_decrypted_password
      FROM vault.decrypted_secrets
      WHERE id = v_settings.smtp_password_id;
    EXCEPTION WHEN OTHERS THEN
      -- Password decryption failed, continue with NULL password
      v_decrypted_password := NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'settings', jsonb_build_object(
      'smtp_host', v_settings.smtp_host,
      'smtp_port', v_settings.smtp_port,
      'smtp_user', v_settings.smtp_user,
      'smtp_password', v_decrypted_password,
      'smtp_secure', v_settings.smtp_secure,
      'mail_from', v_settings.mail_from,
      'created_at', v_settings.created_at,
      'updated_at', v_settings.updated_at
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Failed to get SMTP settings: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to delete SMTP settings
CREATE OR REPLACE FUNCTION public.delete_smtp_settings()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, private, vault, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_password_id UUID;
BEGIN
  -- Check authentication: only authenticated admin users
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

  -- Get password ID before deletion
  SELECT smtp_password_id
  INTO v_password_id
  FROM private.smtp_settings
  WHERE id = 1;

  -- Delete SMTP settings
  DELETE FROM private.smtp_settings WHERE id = 1;

  -- Delete password from Vault if exists
  IF v_password_id IS NOT NULL THEN
    BEGIN
      PERFORM vault.delete_secret(v_password_id);
    EXCEPTION WHEN OTHERS THEN
      -- Continue even if password deletion fails
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'SMTP settings deleted successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Failed to delete SMTP settings: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE private.smtp_settings IS 'Stores SMTP configuration for email sending (singleton table)';
COMMENT ON FUNCTION public.upsert_smtp_settings IS 'Upsert SMTP settings with encrypted password in Vault (admin only)';
COMMENT ON FUNCTION public.get_smtp_settings IS 'Get SMTP settings with decrypted password (admin or service_role)';
COMMENT ON FUNCTION public.delete_smtp_settings IS 'Delete SMTP settings and password from Vault (admin only)';

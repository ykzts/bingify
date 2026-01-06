-- Create RPC function to decrypt a secret from Vault
-- This is needed because vault.decrypted_secrets view is not accessible via PostgREST
CREATE OR REPLACE FUNCTION public.decrypt_secret(
  p_secret_id UUID
) RETURNS TEXT
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  v_decrypted_secret TEXT;
BEGIN
  -- Only allow service_role to call this function
  IF current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: only service_role can call this function';
  END IF;

  -- Validate secret_id
  IF p_secret_id IS NULL THEN
    RAISE EXCEPTION 'secret_id is required';
  END IF;

  -- Decrypt the secret from Vault
  SELECT decrypted_secret INTO v_decrypted_secret
  FROM vault.decrypted_secrets
  WHERE id = p_secret_id;

  IF v_decrypted_secret IS NULL THEN
    RAISE EXCEPTION 'Secret not found or decryption failed';
  END IF;

  RETURN v_decrypted_secret;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to decrypt secret: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service_role only
GRANT EXECUTE ON FUNCTION public.decrypt_secret(UUID) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.decrypt_secret(UUID) IS 'Decrypts a secret from Vault by its ID. Only callable by service_role for cron jobs.';

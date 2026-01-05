-- Manual verification script for OAuth token storage with Vault encryption
-- This is NOT a pgTAP test - run manually in Supabase Studio SQL editor
-- to verify OAuth token RPC functions work correctly with Vault encryption

-- Step 1: Create a test user (skip if already exists)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  instance_id,
  aud,
  role
) VALUES (
  'b3e3f3f3-3f3f-3f3f-3f3f-3f3f3f3f3f3f'::uuid,
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Store a token via RPC function (automatically encrypted with Vault)
-- Set auth context to simulate authenticated user
SET request.jwt.claim.sub = 'b3e3f3f3-3f3f-3f3f-3f3f-3f3f3f3f3f3f';
SET role authenticated;

SELECT public.upsert_oauth_token(
  'google'::text,
  'test_access_token_12345'::text,
  'test_refresh_token_67890'::text,
  (NOW() + INTERVAL '1 hour')::timestamptz
) as upsert_result;

-- Step 3: Retrieve token via RPC function (automatically decrypted from Vault)
SELECT public.get_oauth_token('google'::text) as get_result;

-- Step 4: Verify token in raw table (shows Vault secret IDs, NOT plaintext)
RESET ROLE;
SELECT 
  provider,
  access_token_secret_id,   -- UUID reference to Vault secret (encrypted)
  refresh_token_secret_id,  -- UUID reference to Vault secret (encrypted)
  expires_at,
  created_at
FROM private.oauth_tokens
WHERE user_id = 'b3e3f3f3-3f3f-3f3f-3f3f-3f3f3f3f3f3f'::uuid
  AND provider = 'google';

-- Step 5: Clean up test data (also cleans up Vault secrets)
SET request.jwt.claim.sub = 'b3e3f3f3-3f3f-3f3f-3f3f-3f3f3f3f3f3f';
SET role authenticated;
SELECT public.delete_oauth_token('google'::text) as delete_result;

RESET ROLE;
DELETE FROM auth.users 
WHERE id = 'b3e3f3f3-3f3f-3f3f-3f3f-3f3f3f3f3f3f'::uuid;

-- Expected Results:
-- ✅ upsert_result should show success: true
-- ✅ get_result should show decrypted plaintext tokens (RPC handles decryption)
-- ✅ Raw table shows UUID secret IDs, NOT plaintext - tokens encrypted in Vault
-- ✅ delete_result removes both database record and Vault secrets

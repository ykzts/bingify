-- Manual verification script for OAuth token storage
-- This is NOT a pgTAP test - run manually in Supabase Studio SQL editor
-- to verify OAuth token RPC functions work correctly

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

-- Step 2: Store a token via RPC function
-- Set auth context to simulate authenticated user
SET request.jwt.claim.sub = 'b3e3f3f3-3f3f-3f3f-3f3f-3f3f3f3f3f3f';
SET role authenticated;

SELECT public.upsert_oauth_token(
  'google'::text,
  'test_access_token_12345'::text,
  'test_refresh_token_67890'::text,
  (NOW() + INTERVAL '1 hour')::timestamptz
) as upsert_result;

-- Step 3: Retrieve token via RPC function
SELECT public.get_oauth_token('google'::text) as get_result;

-- Step 4: Verify token in raw table (should see encrypted data if Vault/TCE enabled)
RESET ROLE;
SELECT 
  provider,
  access_token,
  refresh_token,
  expires_at,
  created_at
FROM private.oauth_tokens
WHERE user_id = 'b3e3f3f3-3f3f-3f3f-3f3f-3f3f3f3f3f3f'::uuid
  AND provider = 'google';

-- Step 5: Clean up test data
DELETE FROM private.oauth_tokens 
WHERE user_id = 'b3e3f3f3-3f3f-3f3f-3f3f-3f3f3f3f3f3f'::uuid;

DELETE FROM auth.users 
WHERE id = 'b3e3f3f3-3f3f-3f3f-3f3f-3f3f3f3f3f3f'::uuid;

-- Expected Results:
-- ✅ upsert_result should show success: true
-- ✅ get_result should show the stored token in plaintext (RPC function handles decryption)
-- ✅ Raw table query in production with Vault + app-level encryption shows ciphertext
--    In local dev (private schema only), raw table shows plaintext

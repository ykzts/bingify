-- Manual verification test for OAuth token encryption
-- Run this in Supabase Studio SQL editor to verify encryption is working

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

-- Step 2: Store a token directly (simulating RPC call)
INSERT INTO private.oauth_tokens (
  user_id,
  provider,
  access_token,
  refresh_token,
  expires_at
) VALUES (
  'b3e3f3f3-3f3f-3f3f-3f3f-3f3f3f3f3f3f'::uuid,
  'google',
  'PLAINTEXT_ACCESS_TOKEN_12345',
  'PLAINTEXT_REFRESH_TOKEN_67890',
  NOW() + INTERVAL '1 hour'
) ON CONFLICT (user_id, provider) 
DO UPDATE SET
  access_token = EXCLUDED.access_token,
  refresh_token = EXCLUDED.refresh_token,
  expires_at = EXCLUDED.expires_at;

-- Step 3: Verify tokens are ENCRYPTED in the raw table
-- The values should NOT match the plaintext values above
SELECT 
  'Encryption Test Results' as test_category,
  provider,
  CASE 
    WHEN access_token = 'PLAINTEXT_ACCESS_TOKEN_12345' 
    THEN '❌ FAILED: Token is NOT encrypted!'
    ELSE '✅ PASSED: Token is encrypted'
  END as access_token_encryption_status,
  CASE 
    WHEN refresh_token = 'PLAINTEXT_REFRESH_TOKEN_67890' 
    THEN '❌ FAILED: Token is NOT encrypted!'
    ELSE '✅ PASSED: Token is encrypted'
  END as refresh_token_encryption_status,
  length(access_token) as encrypted_access_token_length,
  length(refresh_token) as encrypted_refresh_token_length
FROM private.oauth_tokens
WHERE user_id = 'b3e3f3f3-3f3f-3f3f-3f3f-3f3f3f3f3f3f'::uuid
  AND provider = 'google';

-- Step 4: Clean up test data
DELETE FROM private.oauth_tokens 
WHERE user_id = 'b3e3f3f3-3f3f-3f3f-3f3f-3f3f3f3f3f3f'::uuid;

DELETE FROM auth.users 
WHERE id = 'b3e3f3f3-3f3f-3f3f-3f3f-3f3f3f3f3f3f'::uuid;

-- Expected Results:
-- ✅ access_token_encryption_status: "✅ PASSED: Token is encrypted"
-- ✅ refresh_token_encryption_status: "✅ PASSED: Token is encrypted"
-- ✅ encrypted_access_token_length: Should be much longer than original
-- ✅ encrypted_refresh_token_length: Should be much longer than original

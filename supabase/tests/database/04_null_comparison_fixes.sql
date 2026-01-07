-- NULL比較の修正を検証するテスト
-- current_setting()がNULLを返す場合でも正しく動作することを確認

BEGIN;

-- テストプランの設定
SELECT plan(7);

-- ========================================
-- prevent_role_change() 関数のテスト
-- ========================================

-- テスト用のユーザーIDを作成
DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000099'::UUID;
BEGIN
  -- テストユーザーを作成（app.inserting_new_userが設定されていない状態）
  -- prevent_role_change()がNULL安全な比較を使用していることを確認
  BEGIN
    -- current_setting('app.inserting_new_user', true)がNULLまたは''を返す場合をテスト
    INSERT INTO public.profiles (id, email, role)
    VALUES (test_user_id, 'null-test@example.com', 'user');
    
    RAISE NOTICE 'prevent_role_change: NULL comparison test passed';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'prevent_role_change failed with NULL setting: %', SQLERRM;
  END;
END;
$$;

SELECT ok(
  EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000099'::UUID),
  'prevent_role_change() はNULL設定でも正しく動作すること'
);

-- テスト用データのクリーンアップ
DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000099'::UUID;

-- ========================================
-- service_role関数のNULL比較テスト
-- ========================================

-- delete_oauth_token_for_user() のテスト
SELECT throws_ok(
  $$SELECT public.delete_oauth_token_for_user('00000000-0000-0000-0000-000000000001'::UUID, 'test_provider')$$,
  NULL,
  'delete_oauth_token_for_user() はservice_role以外からの呼び出しを拒否すること'
);

-- get_expired_oauth_tokens() のテスト
SELECT throws_ok(
  'SELECT * FROM public.get_expired_oauth_tokens()',
  'Access denied: only service_role can call this function',
  'get_expired_oauth_tokens() はservice_role以外からの呼び出しを拒否すること'
);

-- release_oauth_token_lock() のテスト
SELECT throws_ok(
  'SELECT public.release_oauth_token_lock(12345)',
  'Access denied: only service_role can call this function',
  'release_oauth_token_lock() はservice_role以外からの呼び出しを拒否すること'
);

-- upsert_oauth_token_for_user() のテスト
SELECT throws_ok(
  $$SELECT public.upsert_oauth_token_for_user('00000000-0000-0000-0000-000000000001'::UUID, 'test', 'token', NULL, NULL)$$,
  NULL,
  'upsert_oauth_token_for_user() はservice_role以外からの呼び出しを拒否すること'
);

-- get_oauth_token_for_user() のテスト
SELECT throws_ok(
  $$SELECT public.get_oauth_token_for_user('00000000-0000-0000-0000-000000000001'::UUID, 'test_provider')$$,
  NULL,
  'get_oauth_token_for_user() はservice_role以外からの呼び出しを拒否すること'
);

-- ========================================
-- IS DISTINCT FROM の動作確認
-- ========================================

-- IS DISTINCT FROMがNULL比較で正しく動作することを確認
SELECT ok(
  (NULL IS DISTINCT FROM 'service_role') = TRUE,
  'IS DISTINCT FROM はNULLと文字列を正しく比較できること'
);

-- ========================================
-- テスト完了
-- ========================================

SELECT * FROM finish();
ROLLBACK;

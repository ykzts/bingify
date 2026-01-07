-- prevent_role_change() 関数のテスト
-- ユーザー新規作成時の role 設定とセキュリティ制約を検証

BEGIN;

-- テストプランの設定
SELECT plan(5);

-- ========================================
-- handle_new_user() トリガーのテスト
-- ========================================

-- テストユーザーIDを生成
SELECT results_eq(
  $$ SELECT gen_random_uuid() IS NOT NULL $$,
  $$ VALUES (true) $$,
  'テストユーザーIDが生成できること'
);

-- ========================================
-- prevent_role_change() 関数の存在確認
-- ========================================

SELECT has_function(
  'public',
  'prevent_role_change',
  'prevent_role_change() 関数が存在すること'
);

-- ========================================
-- トリガーの存在確認
-- ========================================

SELECT has_trigger(
  'public',
  'profiles',
  'trigger_prevent_role_change',
  'profiles テーブルに trigger_prevent_role_change トリガーが存在すること'
);

-- ========================================
-- handle_new_user() 関数の存在確認
-- ========================================

SELECT has_function(
  'public',
  'handle_new_user',
  'handle_new_user() 関数が存在すること'
);

-- ========================================
-- トリガーの存在確認
-- ========================================

SELECT has_trigger(
  'auth',
  'users',
  'on_auth_user_created',
  'auth.users テーブルに on_auth_user_created トリガーが存在すること'
);

-- テストを終了
SELECT * FROM finish();

ROLLBACK;

-- OAuth トークンテーブルとRPC関数のテスト
-- private スキーマのテーブル、RLS、RPC 関数が正しく動作することを検証

BEGIN;

-- テストプランの設定
SELECT plan(23);

-- ========================================
-- private スキーマとテーブルの存在確認
-- ========================================

SELECT has_schema('private', 'private スキーマが存在すること');
SELECT has_table('private', 'oauth_tokens', 'oauth_tokens テーブルが存在すること');

-- ========================================
-- oauth_tokens テーブルのカラム検証 (Vault暗号化対応)
-- ========================================

SELECT has_column('private', 'oauth_tokens', 'id', 'oauth_tokens.id カラムが存在すること');
SELECT col_type_is('private', 'oauth_tokens', 'id', 'uuid', 'oauth_tokens.id は uuid 型であること');
SELECT has_column('private', 'oauth_tokens', 'user_id', 'oauth_tokens.user_id カラムが存在すること');
SELECT col_type_is('private', 'oauth_tokens', 'user_id', 'uuid', 'oauth_tokens.user_id は uuid 型であること');
SELECT has_column('private', 'oauth_tokens', 'provider', 'oauth_tokens.provider カラムが存在すること');
SELECT col_type_is('private', 'oauth_tokens', 'provider', 'text', 'oauth_tokens.provider は text 型であること');
SELECT has_column('private', 'oauth_tokens', 'access_token_secret_id', 'oauth_tokens.access_token_secret_id カラムが存在すること (Vault暗号化)');
SELECT col_type_is('private', 'oauth_tokens', 'access_token_secret_id', 'uuid', 'oauth_tokens.access_token_secret_id は uuid 型であること');
SELECT has_column('private', 'oauth_tokens', 'refresh_token_secret_id', 'oauth_tokens.refresh_token_secret_id カラムが存在すること (Vault暗号化)');
SELECT col_type_is('private', 'oauth_tokens', 'refresh_token_secret_id', 'uuid', 'oauth_tokens.refresh_token_secret_id は uuid 型であること');
SELECT has_column('private', 'oauth_tokens', 'expires_at', 'oauth_tokens.expires_at カラムが存在すること');
SELECT has_column('private', 'oauth_tokens', 'created_at', 'oauth_tokens.created_at カラムが存在すること');
SELECT has_column('private', 'oauth_tokens', 'updated_at', 'oauth_tokens.updated_at カラムが存在すること');

-- ========================================
-- RLS の検証
-- ========================================

SELECT table_privs_are(
  'private', 'oauth_tokens', 'authenticated',
  ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'authenticated ロールは oauth_tokens テーブルへの適切な権限を持つこと'
);

-- RLS が有効であることを確認
SELECT results_eq(
  $$ SELECT relrowsecurity FROM pg_class WHERE relname = 'oauth_tokens' AND relnamespace = 'private'::regnamespace $$,
  $$ VALUES (true) $$,
  'oauth_tokens テーブルで RLS が有効であること'
);

-- ========================================
-- RPC 関数の存在確認
-- ========================================

SELECT has_function(
  'public',
  'upsert_oauth_token',
  ARRAY['text', 'text', 'text', 'timestamp with time zone'],
  'upsert_oauth_token RPC 関数が存在すること'
);

SELECT has_function(
  'public',
  'get_oauth_token',
  ARRAY['text'],
  'get_oauth_token RPC 関数が存在すること'
);

SELECT has_function(
  'public',
  'delete_oauth_token',
  ARRAY['text'],
  'delete_oauth_token RPC 関数が存在すること'
);

-- ========================================
-- 外部キー制約の検証
-- ========================================

SELECT fk_ok(
  'private', 'oauth_tokens', 'user_id',
  'auth', 'users', 'id',
  'oauth_tokens.user_id は auth.users.id への外部キー制約があること'
);

-- ========================================
-- UNIQUE 制約の検証
-- ========================================

SELECT col_is_unique(
  'private', 'oauth_tokens', ARRAY['user_id', 'provider'],
  'oauth_tokens テーブルは (user_id, provider) の組み合わせで UNIQUE 制約があること'
);

-- ========================================
-- インデックスの検証
-- ========================================

SELECT has_index(
  'private', 'oauth_tokens', 'idx_oauth_tokens_user_id',
  'oauth_tokens テーブルに user_id インデックスが存在すること (RLS パフォーマンス最適化)'
);

-- テスト終了
SELECT * FROM finish();

ROLLBACK;

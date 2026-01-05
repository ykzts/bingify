-- スキーマ定義のテスト
-- 主要なテーブル、カラム、外部キー制約が正しく定義されているかを検証

BEGIN;

-- テストプランの設定（実行するテスト数を宣言）
SELECT plan(45);

-- ========================================
-- テーブル存在確認
-- ========================================

SELECT has_table('public', 'profiles', 'profiles テーブルが存在すること');
SELECT has_table('public', 'spaces', 'spaces テーブルが存在すること');
SELECT has_table('public', 'bingo_cards', 'bingo_cards テーブルが存在すること');
SELECT has_table('public', 'called_numbers', 'called_numbers テーブルが存在すること');
SELECT has_table('public', 'participants', 'participants テーブルが存在すること');
SELECT has_table('public', 'space_roles', 'space_roles テーブルが存在すること');

-- ========================================
-- profiles テーブルのカラム検証
-- ========================================

SELECT has_column('public', 'profiles', 'id', 'profiles.id カラムが存在すること');
SELECT col_type_is('public', 'profiles', 'id', 'uuid', 'profiles.id は uuid 型であること');
SELECT has_column('public', 'profiles', 'email', 'profiles.email カラムが存在すること');
SELECT has_column('public', 'profiles', 'full_name', 'profiles.full_name カラムが存在すること');
SELECT has_column('public', 'profiles', 'avatar_url', 'profiles.avatar_url カラムが存在すること');
SELECT has_column('public', 'profiles', 'created_at', 'profiles.created_at カラムが存在すること');
SELECT has_column('public', 'profiles', 'updated_at', 'profiles.updated_at カラムが存在すること');
SELECT col_type_is('public', 'profiles', 'created_at', 'timestamp with time zone', 'profiles.created_at は timestamp with time zone 型であること');

-- ========================================
-- spaces テーブルのカラム検証
-- ========================================

SELECT has_column('public', 'spaces', 'id', 'spaces.id カラムが存在すること');
SELECT col_type_is('public', 'spaces', 'id', 'uuid', 'spaces.id は uuid 型であること');
SELECT has_column('public', 'spaces', 'share_key', 'spaces.share_key カラムが存在すること');
SELECT col_type_is('public', 'spaces', 'share_key', 'text', 'spaces.share_key は text 型であること');
SELECT col_is_unique('public', 'spaces', 'share_key', 'spaces.share_key は UNIQUE 制約があること');
SELECT has_column('public', 'spaces', 'owner_id', 'spaces.owner_id カラムが存在すること');
SELECT col_type_is('public', 'spaces', 'owner_id', 'uuid', 'spaces.owner_id は uuid 型であること');
SELECT has_column('public', 'spaces', 'status', 'spaces.status カラムが存在すること');
SELECT has_column('public', 'spaces', 'settings', 'spaces.settings カラムが存在すること');
SELECT has_column('public', 'spaces', 'created_at', 'spaces.created_at カラムが存在すること');
SELECT has_column('public', 'spaces', 'updated_at', 'spaces.updated_at カラムが存在すること');

-- ========================================
-- bingo_cards テーブルのカラム検証
-- ========================================

SELECT has_column('public', 'bingo_cards', 'id', 'bingo_cards.id カラムが存在すること');
SELECT has_column('public', 'bingo_cards', 'space_id', 'bingo_cards.space_id カラムが存在すること');
SELECT has_column('public', 'bingo_cards', 'user_id', 'bingo_cards.user_id カラムが存在すること');
SELECT has_column('public', 'bingo_cards', 'numbers', 'bingo_cards.numbers カラムが存在すること');
SELECT has_column('public', 'bingo_cards', 'created_at', 'bingo_cards.created_at カラムが存在すること');

-- ========================================
-- participants テーブルのカラム検証
-- ========================================

SELECT has_column('public', 'participants', 'id', 'participants.id カラムが存在すること');
SELECT has_column('public', 'participants', 'space_id', 'participants.space_id カラムが存在すること');
SELECT has_column('public', 'participants', 'user_id', 'participants.user_id カラムが存在すること');
SELECT has_column('public', 'participants', 'created_at', 'participants.created_at カラムが存在すること');

-- ========================================
-- space_roles テーブルのカラム検証
-- ========================================

SELECT has_column('public', 'space_roles', 'id', 'space_roles.id カラムが存在すること');
SELECT has_column('public', 'space_roles', 'space_id', 'space_roles.space_id カラムが存在すること');
SELECT has_column('public', 'space_roles', 'user_id', 'space_roles.user_id カラムが存在すること');
SELECT has_column('public', 'space_roles', 'role', 'space_roles.role カラムが存在すること');
SELECT has_column('public', 'space_roles', 'created_at', 'space_roles.created_at カラムが存在すること');

-- ========================================
-- 外部キー制約の検証
-- ========================================

-- bingo_cards.space_id -> spaces.id
SELECT has_fk('public', 'bingo_cards', 'bingo_cards.space_id は spaces.id への外部キー制約があること');

-- called_numbers.space_id -> spaces.id
SELECT has_fk('public', 'called_numbers', 'called_numbers.space_id は spaces.id への外部キー制約があること');

-- participants.space_id -> spaces.id
SELECT has_fk('public', 'participants', 'participants.space_id は spaces.id への外部キー制約があること');

-- space_roles.space_id -> spaces.id
SELECT has_fk('public', 'space_roles', 'space_roles.space_id は spaces.id への外部キー制約があること');

-- テスト終了
SELECT * FROM finish();

ROLLBACK;

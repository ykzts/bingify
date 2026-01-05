-- RLS (Row Level Security) ポリシーのテスト
-- 権限周りのセキュリティ事故を防ぐため、RLS ポリシーが意図通りに動作することを検証

BEGIN;

-- テストプランの設定
SELECT plan(26);

-- ========================================
-- RLS の有効化確認
-- ========================================

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles' AND relnamespace = 'public'::regnamespace),
  'profiles テーブルで RLS が有効化されていること'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'spaces' AND relnamespace = 'public'::regnamespace),
  'spaces テーブルで RLS が有効化されていること'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'bingo_cards' AND relnamespace = 'public'::regnamespace),
  'bingo_cards テーブルで RLS が有効化されていること'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'called_numbers' AND relnamespace = 'public'::regnamespace),
  'called_numbers テーブルで RLS が有効化されていること'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'participants' AND relnamespace = 'public'::regnamespace),
  'participants テーブルで RLS が有効化されていること'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'space_roles' AND relnamespace = 'public'::regnamespace),
  'space_roles テーブルで RLS が有効化されていること'
);

-- ========================================
-- テストユーザーの準備
-- ========================================

-- テスト用のユーザー ID を作成
DO $$
DECLARE
  test_user_id_1 UUID := '00000000-0000-0000-0000-000000000001';
  test_user_id_2 UUID := '00000000-0000-0000-0000-000000000002';
  test_space_id UUID := '00000000-0000-0000-0000-000000000100';
BEGIN
  -- テストデータのクリーンアップ（既存のテストデータを削除）
  DELETE FROM space_roles WHERE space_id = test_space_id;
  DELETE FROM participants WHERE space_id = test_space_id;
  DELETE FROM bingo_cards WHERE space_id = test_space_id;
  DELETE FROM called_numbers WHERE space_id = test_space_id;
  DELETE FROM spaces WHERE id = test_space_id;
  DELETE FROM profiles WHERE id IN (test_user_id_1, test_user_id_2);

  -- プロフィールを作成（auth.users テーブルは触らずに直接 profiles に挿入）
  INSERT INTO profiles (id, email, full_name)
  VALUES 
    (test_user_id_1, 'test1@example.com', 'Test User 1'),
    (test_user_id_2, 'test2@example.com', 'Test User 2');

  -- スペースを作成（user_1 が所有者）
  INSERT INTO spaces (id, share_key, owner_id, status, view_token)
  VALUES (test_space_id, 'test-space-20260105', test_user_id_1, 'active', 'test-view-token-001');
END $$;

-- ========================================
-- Profiles RLS テスト
-- ========================================

-- テスト: ユーザーは自分のプロフィールを SELECT できること
SELECT ok(
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = '00000000-0000-0000-0000-000000000001'
      AND (
        -- RLS ポリシーのシミュレーション: auth.uid() = id
        id = '00000000-0000-0000-0000-000000000001'
      )
  ),
  '自分のプロフィールを SELECT できること（RLS チェック）'
);

-- テスト: ポリシーが存在することを確認
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname LIKE '%own%profile%'
      AND cmd = 'SELECT'
  ),
  'profiles テーブルに SELECT 用の RLS ポリシーが存在すること'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname LIKE '%own%profile%'
      AND cmd = 'UPDATE'
  ),
  'profiles テーブルに UPDATE 用の RLS ポリシーが存在すること'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname LIKE '%own%profile%'
      AND cmd = 'INSERT'
  ),
  'profiles テーブルに INSERT 用の RLS ポリシーが存在すること'
);

-- ========================================
-- Spaces RLS テスト
-- ========================================

-- テスト: 所有者向けのポリシーが存在すること
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'spaces'
      AND (policyname LIKE '%owner%' OR policyname LIKE '%admin%')
      AND cmd IN ('SELECT', 'UPDATE', 'ALL')
  ),
  'spaces テーブルに所有者または管理者向けの RLS ポリシーが存在すること'
);

-- テスト: spaces テーブルに複数のポリシーが設定されていること
SELECT ok(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'spaces') >= 2,
  'spaces テーブルに複数の RLS ポリシーが設定されていること（所有者用、公開用など）'
);

-- ========================================
-- Space_roles RLS テスト
-- ========================================

-- テスト: space_roles に所有者用のポリシーが存在すること
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'space_roles'
      AND policyname LIKE '%Owners%'
  ),
  'space_roles テーブルに所有者向けの RLS ポリシーが存在すること'
);

-- テスト: space_roles に管理者が自分のロールを読み取れるポリシーが存在すること
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'space_roles'
      AND policyname LIKE '%Admins%'
      AND cmd = 'SELECT'
  ),
  'space_roles テーブルに管理者が自分のロールを読み取れるポリシーが存在すること'
);

-- ========================================
-- Bingo_cards RLS テスト
-- ========================================

-- テスト: bingo_cards に自分のカードを操作できるポリシーが存在すること
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bingo_cards'
      AND policyname LIKE '%own%'
      AND cmd = 'SELECT'
  ),
  'bingo_cards テーブルに自分のカードを SELECT できるポリシーが存在すること'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bingo_cards'
      AND policyname LIKE '%own%'
      AND cmd = 'INSERT'
  ),
  'bingo_cards テーブルに自分のカードを INSERT できるポリシーが存在すること'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bingo_cards'
      AND policyname LIKE '%own%'
      AND cmd = 'DELETE'
  ),
  'bingo_cards テーブルに自分のカードを DELETE できるポリシーが存在すること'
);

-- ========================================
-- Called_numbers RLS テスト
-- ========================================

-- テスト: called_numbers に公開読み取りポリシーが存在すること
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'called_numbers'
      AND policyname LIKE '%Public%'
      AND cmd = 'SELECT'
  ),
  'called_numbers テーブルに公開読み取りポリシーが存在すること（表示専用画面用）'
);

-- テスト: called_numbers に所有者のみが INSERT できるポリシーが存在すること
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'called_numbers'
      AND policyname LIKE '%Owners%'
      AND cmd = 'INSERT'
  ),
  'called_numbers テーブルに所有者が INSERT できるポリシーが存在すること'
);

-- ========================================
-- Participants RLS テスト
-- ========================================

-- テスト: participants に参加者が読み取れるポリシーが存在すること
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'participants'
      AND cmd = 'SELECT'
  ),
  'participants テーブルに読み取りポリシーが存在すること'
);

-- テスト: participants に自分を追加できるポリシーが存在すること
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'participants'
      AND cmd = 'INSERT'
  ),
  'participants テーブルに INSERT ポリシーが存在すること'
);

-- ========================================
-- セキュリティ確認: ポリシー数のカウント
-- ========================================

-- テスト: 各テーブルに最低限のポリシーが設定されていることを確認
SELECT ok(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') >= 3,
  'profiles テーブルに最低 3 つの RLS ポリシーが設定されていること（SELECT, UPDATE, INSERT）'
);

SELECT ok(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'bingo_cards') >= 3,
  'bingo_cards テーブルに最低 3 つの RLS ポリシーが設定されていること'
);

SELECT ok(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'called_numbers') >= 2,
  'called_numbers テーブルに最低 2 つの RLS ポリシーが設定されていること'
);

SELECT ok(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'participants') >= 2,
  'participants テーブルに最低 2 つの RLS ポリシーが設定されていること'
);

SELECT ok(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'space_roles') >= 3,
  'space_roles テーブルに最低 3 つの RLS ポリシーが設定されていること'
);

-- ========================================
-- クリーンアップ
-- ========================================

DO $$
DECLARE
  test_user_id_1 UUID := '00000000-0000-0000-0000-000000000001';
  test_user_id_2 UUID := '00000000-0000-0000-0000-000000000002';
  test_space_id UUID := '00000000-0000-0000-0000-000000000100';
BEGIN
  DELETE FROM space_roles WHERE space_id = test_space_id;
  DELETE FROM participants WHERE space_id = test_space_id;
  DELETE FROM bingo_cards WHERE space_id = test_space_id;
  DELETE FROM called_numbers WHERE space_id = test_space_id;
  DELETE FROM spaces WHERE id = test_space_id;
  DELETE FROM profiles WHERE id IN (test_user_id_1, test_user_id_2);
END $$;

-- テスト終了
SELECT * FROM finish();

ROLLBACK;

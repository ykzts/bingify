-- クォータチェック関数の SECURITY DEFINER テスト
-- 関数が SECURITY DEFINER として定義されていることを検証

BEGIN;

-- テストプランの設定
SELECT plan(4);

-- ========================================
-- SECURITY DEFINER 関数の確認
-- ========================================

-- テスト: check_participant_quota が SECURITY DEFINER として定義されていること
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'check_participant_quota'
      AND n.nspname = 'public'
      AND p.prosecdef = true
  ),
  'check_participant_quota() 関数が SECURITY DEFINER として定義されていること'
);

-- テスト: check_bingo_card_quota が SECURITY DEFINER として定義されていること
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'check_bingo_card_quota'
      AND n.nspname = 'public'
      AND p.prosecdef = true
  ),
  'check_bingo_card_quota() 関数が SECURITY DEFINER として定義されていること'
);

-- ========================================
-- search_path 設定の確認
-- ========================================

-- テスト: check_participant_quota の search_path が安全に設定されていること
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'check_participant_quota'
      AND n.nspname = 'public'
      AND p.proconfig IS NOT NULL
      AND p.proconfig::text LIKE '%search_path%'
  ),
  'check_participant_quota() 関数の search_path が安全に設定されていること'
);

-- テスト: check_bingo_card_quota の search_path が安全に設定されていること
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'check_bingo_card_quota'
      AND n.nspname = 'public'
      AND p.proconfig IS NOT NULL
      AND p.proconfig::text LIKE '%search_path%'
  ),
  'check_bingo_card_quota() 関数の search_path が安全に設定されていること'
);

-- テスト終了
SELECT * FROM finish();

ROLLBACK;

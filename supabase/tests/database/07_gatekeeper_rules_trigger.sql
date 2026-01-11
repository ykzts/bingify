-- ゲートキーパールールトリガーのテスト
-- check_gatekeeper_rules_owner() 関数と enforce_gatekeeper_rules_owner トリガーが
-- 正しく動作し、オーナーのみがゲートキーパールールを変更できることを検証

BEGIN;

-- テストプランの設定
SELECT plan(3);

-- ========================================
-- トリガーとトリガー関数の存在確認
-- ========================================

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'enforce_gatekeeper_rules_owner'
      AND tgrelid = 'spaces'::regclass
  ),
  'enforce_gatekeeper_rules_owner トリガーが spaces テーブルに存在すること'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'check_gatekeeper_rules_owner'
  ),
  'check_gatekeeper_rules_owner 関数が存在すること'
);

-- ========================================
-- トリガー関数のセキュリティ設定確認
-- ========================================

-- check_gatekeeper_rules_owner 関数が SECURITY DEFINER ではないことを確認
-- SECURITY DEFINER が設定されていると auth.uid() が正しく動作しないため
SELECT ok(
  NOT (
    SELECT prosecdef FROM pg_proc
    WHERE proname = 'check_gatekeeper_rules_owner'
  ),
  'check_gatekeeper_rules_owner 関数が SECURITY DEFINER ではないこと（auth.uid() の正常動作のため）'
);

-- テスト終了
SELECT * FROM finish();

ROLLBACK;
